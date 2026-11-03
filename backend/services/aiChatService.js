const Anthropic = require('@anthropic-ai/sdk');
const { pool, query } = require('../db/database');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an AI sales assistant integrated into SalesFlow, a multi-channel outreach automation platform. Help users with:

- Writing and improving outreach content (emails, LinkedIn messages, call scripts, voicemails)
- Analyzing prospects and companies to find personalization angles
- Suggesting outreach strategies and sequences
- Answering questions about sales best practices
- Generating content variations and A/B test ideas
- Reviewing and improving existing drafts

Guidelines:
- Be concise and actionable
- When generating content, always personalize based on the prospect's background
- Suggest specific improvements rather than generic advice
- If asked about a lead or company, use the context provided
- Format longer responses with clear sections and bullet points`;

async function createConversation(contextType, contextId = null) {
  const { rows } = await query(
    'INSERT INTO ai_conversations (context_type, context_id) VALUES ($1, $2) RETURNING *',
    [contextType, contextId]
  );
  return rows[0];
}

async function getConversation(id) {
  const { rows } = await query('SELECT * FROM ai_conversations WHERE id = $1', [Number(id)]);
  return rows[0];
}

async function getConversations({ limit = 20 } = {}) {
  const { rows } = await query(
    'SELECT * FROM ai_conversations ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return rows;
}

async function getMessages(conversationId) {
  const { rows } = await query(
    'SELECT * FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [Number(conversationId)]
  );
  return rows;
}

async function addMessage(conversationId, role, content) {
  const { rows } = await query(
    'INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING *',
    [Number(conversationId), role, content]
  );
  return rows[0];
}

async function buildContextString(conversation) {
  let contextStr = '';

  if (conversation.context_type === 'lead' && conversation.context_id) {
    const { rows } = await query('SELECT * FROM leads WHERE id = $1', [conversation.context_id]);
    const lead = rows[0];
    if (lead) {
      contextStr = `
Current Lead Context:
- Name: ${lead.first_name} ${lead.last_name}
- Email: ${lead.email}
- Title: ${lead.job_title || 'Unknown'}
- Company: ${lead.company || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- Company Size: ${lead.company_size || 'Unknown'}
- LinkedIn Summary: ${lead.linkedin_summary || 'Not available'}
- Recent News: ${lead.recent_news || 'None'}`;
    }
  } else if (conversation.context_type === 'company' && conversation.context_id) {
    const { rows } = await query(`
      SELECT c.*, COUNT(l.id) as lead_count
      FROM companies c
      LEFT JOIN leads l ON l.company_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `, [conversation.context_id]);
    const company = rows[0];
    if (company) {
      contextStr = `
Current Company Context:
- Company: ${company.name}
- Domain: ${company.domain || 'Unknown'}
- Industry: ${company.industry || 'Unknown'}
- Size: ${company.size || 'Unknown'}
- Website: ${company.website || 'Unknown'}
- Description: ${company.description || 'Not available'}
- Recent News: ${company.recent_news || 'None'}
- Number of leads: ${company.lead_count}`;
    }
  } else if (conversation.context_type === 'sequence' && conversation.context_id) {
    const { rows: seqRows } = await query('SELECT * FROM sequences WHERE id = $1', [conversation.context_id]);
    const { rows: stepRows } = await query('SELECT * FROM sequence_steps WHERE sequence_id = $1 ORDER BY step_order', [conversation.context_id]);
    const seq = seqRows[0];
    if (seq) {
      const stepsStr = stepRows.map(s => `  ${s.step_order}. ${s.channel} (delay: ${s.delay_days}d ${s.delay_hours}h)`).join('\n');
      contextStr = `
Current Sequence Context:
- Name: ${seq.name}
- Description: ${seq.description || 'None'}
- Steps:
${stepsStr}`;
    }
  }

  return contextStr;
}

async function chat(conversationId, userMessage) {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    const err = new Error('Conversation not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  await addMessage(conversationId, 'user', userMessage);

  const messages = await getMessages(conversationId);

  const contextStr = await buildContextString(conversation);
  const systemPrompt = SYSTEM_PROMPT + (contextStr ? '\n' + contextStr : '');

  const claudeMessages = messages.map(m => ({
    role: m.role,
    content: m.content
  }));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    system: systemPrompt,
    messages: claudeMessages
  });

  const assistantMessage = response.content[0].text;

  const savedMessage = await addMessage(conversationId, 'assistant', assistantMessage);

  return savedMessage;
}

async function deleteConversation(id) {
  const conversation = await getConversation(id);
  if (!conversation) {
    const err = new Error('Conversation not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  await query('DELETE FROM ai_conversations WHERE id = $1', [Number(id)]);
  return { deleted: true };
}

module.exports = {
  createConversation,
  getConversation,
  getConversations,
  getMessages,
  chat,
  deleteConversation
};
