const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildLeadContext(lead) {
  return `Prospect details:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'Unknown'}
- Company: ${lead.company || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- Company size: ${lead.company_size || 'Unknown'}
- LinkedIn summary: ${lead.linkedin_summary || 'Not available'}
- Recent company news: ${lead.recent_news || 'None provided'}
- Company website: ${lead.company_website || 'Not available'}`;
}

// Model output sometimes arrives inside a markdown fence.
function parseJsonResponse(rawText, requiredFields = []) {
  let parsed;
  try {
    const cleaned = rawText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const err = new Error(`Failed to parse AI response as JSON. Raw response: ${rawText}`);
    err.statusCode = 500;
    err.code = 'AI_ERROR';
    throw err;
  }

  for (const field of requiredFields) {
    if (!parsed[field]) {
      const err = new Error(`AI response missing required field: ${field}`);
      err.statusCode = 500;
      err.code = 'AI_ERROR';
      throw err;
    }
  }

  return parsed;
}

function buildColdPrompt(lead, userContext) {
  return `You are a professional sales copywriter. Write a cold outreach email to a prospect.

${buildLeadContext(lead)}

Additional context from the sender: ${userContext || 'None'}

Requirements:
- The email must be under 150 words.
- The subject line must be specific to the prospect (not generic).
- Do NOT use phrases like "I hope this email finds you well" or "Just wanted to reach out."
- The tone should be confident and direct, not pushy.
- End with a single, low-commitment call to action (e.g., "Would a 10-minute call this week work?").

Return your response as a JSON object with exactly two keys: "subject" (the subject line) and "body" (the full email body, plain text, no HTML). Return ONLY the JSON object, no other text.`;
}

function buildFollowupPrompt(lead, userContext) {
  return `You are a professional sales copywriter. Write a follow-up email to a prospect who has not responded to a previous outreach.

Prospect details:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'Unknown'}
- Company: ${lead.company || 'Unknown'}

Previous outreach context: ${userContext || 'A cold email was previously sent.'}

Requirements:
- The email must be under 100 words.
- Acknowledge that this is a follow-up without being apologetic about it.
- Add a new piece of value or a different angle -- do NOT simply say "just following up."
- Create a fresh subject line.
- End with a soft call to action.

Return your response as a JSON object with exactly two keys: "subject" and "body". Return ONLY the JSON object, no other text.`;
}

async function generateEmail({ lead, emailType, userContext }) {
  const prompt = emailType === 'cold'
    ? buildColdPrompt(lead, userContext)
    : buildFollowupPrompt(lead, userContext);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  return parseJsonResponse(message.content[0].text.trim(), ['subject', 'body']);
}

async function generateVoiceDrop(lead, userContext) {
  const prompt = `You are a professional sales voice coach. Write a voicemail script for a sales rep to leave.

${buildLeadContext(lead)}

Context: ${userContext || 'Cold outreach voicemail'}

Requirements:
- Script must be under 30 seconds when spoken (approximately 75 words)
- Start with your name and company name (use placeholders: [YOUR NAME], [YOUR COMPANY])
- Include ONE compelling hook specific to the prospect
- Reference something relevant to their role or company
- End with a callback request and phone number placeholder: [YOUR PHONE]
- Tone: confident, conversational, NOT salesy or desperate

Return JSON: { "script": "the voicemail script", "estimated_duration_seconds": number }`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  return parseJsonResponse(message.content[0].text.trim(), ['script']);
}

async function generateCallScript(lead, userContext) {
  const prompt = `You are a sales call preparation expert. Create a cold call script with talking points.

${buildLeadContext(lead)}

Context: ${userContext || 'Initial cold call'}

Create a structured call script with:
1. Opening (get past gatekeeper if needed) - 1-2 sentences
2. Introduction hook (10 seconds max) - grab their attention
3. Discovery questions (3-4 questions to understand their needs)
4. Value proposition (tailored to their role/industry) - 2-3 sentences
5. Common objections and responses (2-3 most likely objections)
6. Next step close - how to end the call with commitment

Return JSON:
{
  "opening": "opening script",
  "hook": "attention-grabbing hook",
  "discovery_questions": ["question1", "question2", "question3"],
  "value_prop": "tailored value proposition",
  "objection_handlers": [
    { "objection": "common objection", "response": "how to handle it" }
  ],
  "close": "closing script for next steps"
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  });

  return parseJsonResponse(message.content[0].text.trim(), ['opening', 'hook', 'discovery_questions', 'value_prop', 'close']);
}

async function generateLinkedInConnection(lead, userContext) {
  const prompt = `Write a LinkedIn connection request message.

Target: ${lead.first_name} ${lead.last_name}, ${lead.job_title || 'Professional'} at ${lead.company || 'their company'}
LinkedIn summary: ${lead.linkedin_summary || 'Not available'}
Context: ${userContext || 'Professional networking'}

Requirements:
- MUST be under 300 characters (LinkedIn limit for connection requests)
- Personalize based on their background if available
- NO sales pitch - focus on genuine connection value
- No cliches like "I hope this finds you well" or "I'd love to connect"
- Be specific about why you want to connect

Return JSON: { "message": "the connection request message" }`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }]
  });

  const result = parseJsonResponse(message.content[0].text.trim(), ['message']);

  // Connection notes are limited to 300 characters.
  if (result.message.length > 300) {
    result.message = result.message.substring(0, 297) + '...';
  }

  return result;
}

async function generateLinkedInMessage(lead, userContext) {
  const prompt = `Write a LinkedIn direct message (InMail) to a prospect.

${buildLeadContext(lead)}

Context: ${userContext || 'Sales outreach via LinkedIn'}

Requirements:
- Keep it under 200 words
- Personalize based on their profile/background
- Reference something specific about them or their company
- Include a clear but soft call to action
- Professional but conversational tone
- NO hard sales pitch in the first message

Return JSON: { "message": "the LinkedIn message" }`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  return parseJsonResponse(message.content[0].text.trim(), ['message']);
}

async function generateLinkedInEngagement(lead, userContext) {
  const prompt = `Suggest LinkedIn engagement actions for this prospect.

${buildLeadContext(lead)}

Context: ${userContext || 'Building relationship before direct outreach'}

Provide:
1. A thoughtful comment to leave on their recent post (assume they post about industry topics)
2. A question to ask that shows genuine interest
3. Content ideas they might find valuable to share

Return JSON:
{
  "comment_template": "a thoughtful comment template",
  "engagement_question": "a question to spark conversation",
  "content_ideas": ["idea1", "idea2"]
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  return parseJsonResponse(message.content[0].text.trim(), ['comment_template', 'engagement_question']);
}

async function generateSocialPost(lead, userContext) {
  const prompt = `Create a social media post that would appeal to this prospect's interests.

${buildLeadContext(lead)}

Context: ${userContext || 'Content to attract and engage prospects like this'}

Create a post that:
1. Addresses a pain point or interest relevant to their role/industry
2. Provides genuine value (insight, tip, or thought-provoking question)
3. Would make them want to engage (like, comment, share)
4. Is NOT a sales pitch

Return JSON:
{
  "post": "the social media post content",
  "platform": "recommended platform (twitter, linkedin)",
  "hashtags": ["relevant", "hashtags"],
  "best_time": "suggested posting time"
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  return parseJsonResponse(message.content[0].text.trim(), ['post', 'platform']);
}

async function generateContent({ lead, channel, contentType, userContext }) {
  switch (channel) {
    case 'email':
      return generateEmail({ lead, emailType: contentType || 'cold', userContext });
    case 'voice_drop':
      return generateVoiceDrop(lead, userContext);
    case 'cold_call':
      return generateCallScript(lead, userContext);
    case 'linkedin_connect':
      return generateLinkedInConnection(lead, userContext);
    case 'linkedin_message':
      return generateLinkedInMessage(lead, userContext);
    case 'linkedin_engage':
      return generateLinkedInEngagement(lead, userContext);
    case 'social_post':
      return generateSocialPost(lead, userContext);
    default:
      const err = new Error(`Unknown channel: ${channel}`);
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
  }
}

module.exports = {
  generateEmail,
  generateVoiceDrop,
  generateCallScript,
  generateLinkedInConnection,
  generateLinkedInMessage,
  generateLinkedInEngagement,
  generateSocialPost,
  generateContent
};
