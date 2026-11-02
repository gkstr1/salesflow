const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { getLeadById } = require('../services/leadService');
const { generateEmail } = require('../services/aiService');
const {
  createConversation,
  getConversation,
  getConversations,
  getMessages,
  chat,
  deleteConversation
} = require('../services/aiChatService');

// Email generation endpoint
router.post('/generate-email', async (req, res) => {
  try {
    const { lead_id, email_type, context } = req.body;

    if (!lead_id) {
      return res.status(400).json({ success: false, error: 'lead_id is required', code: 'VALIDATION_ERROR' });
    }
    if (!email_type || !['cold', 'followup'].includes(email_type)) {
      return res.status(400).json({ success: false, error: 'email_type must be "cold" or "followup"', code: 'VALIDATION_ERROR' });
    }

    const lead = await getLeadById(lead_id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found', code: 'NOT_FOUND' });
    }

    const { subject, body } = await generateEmail({
      lead,
      emailType: email_type,
      userContext: context || null
    });

    const result = await query(`
      INSERT INTO outreach_emails (lead_id, email_type, subject, body, user_context)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [Number(lead_id), email_type, subject, body, context || null]);

    const newEmailId = result.rows[0].id;

    await query(
      `INSERT INTO activity_log (lead_id, action_type, details) VALUES ($1, 'email_generated', $2)`,
      [Number(lead_id), { email_id: newEmailId, email_type }]
    );

    const { rows } = await query('SELECT * FROM outreach_emails WHERE id = $1', [newEmailId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

// ============================================
// AI Chat Endpoints
// ============================================

// List all conversations
router.get('/chat/conversations', async (req, res) => {
  try {
    const conversations = await getConversations({ limit: Number(req.query.limit) || 20 });
    res.json({ success: true, data: conversations });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

// Create a new conversation
router.post('/chat/conversations', async (req, res) => {
  try {
    const { context_type = 'general', context_id = null } = req.body;
    const conversation = await createConversation(context_type, context_id);
    res.status(201).json({ success: true, data: conversation });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

// Get a specific conversation with messages
router.get('/chat/conversations/:id', async (req, res) => {
  try {
    const conversation = await getConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found', code: 'NOT_FOUND' });
    }
    const messages = await getMessages(req.params.id);
    res.json({ success: true, data: { ...conversation, messages } });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

// Send a message to a conversation (chat)
router.post('/chat/conversations/:id/messages', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message is required', code: 'VALIDATION_ERROR' });
    }
    const response = await chat(req.params.id, message.trim());
    res.status(201).json({ success: true, data: response });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

// Delete a conversation
router.delete('/chat/conversations/:id', async (req, res) => {
  try {
    const result = await deleteConversation(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

// ============================================
// Multi-Channel Content Generation
// ============================================

const { generateContent } = require('../services/aiService');

router.post('/generate-content', async (req, res) => {
  try {
    const { lead_id, channel, content_type, context } = req.body;

    if (!lead_id) {
      return res.status(400).json({ success: false, error: 'lead_id is required', code: 'VALIDATION_ERROR' });
    }
    if (!channel) {
      return res.status(400).json({ success: false, error: 'channel is required', code: 'VALIDATION_ERROR' });
    }

    const validChannels = ['email', 'voice_drop', 'cold_call', 'linkedin_connect', 'linkedin_message', 'linkedin_engage', 'social_post'];
    if (!validChannels.includes(channel)) {
      return res.status(400).json({
        success: false,
        error: `Invalid channel. Must be one of: ${validChannels.join(', ')}`,
        code: 'VALIDATION_ERROR'
      });
    }

    const lead = await getLeadById(lead_id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found', code: 'NOT_FOUND' });
    }

    const content = await generateContent({
      lead,
      channel,
      contentType: content_type,
      userContext: context || null
    });

    // Store in outreach_content table
    const insertResult = await query(`
      INSERT INTO outreach_content (lead_id, channel, content_type, subject, body, call_script, user_context)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      Number(lead_id),
      channel,
      content_type || channel,
      content.subject || null,
      content.body || content.message || content.script || content.post || JSON.stringify(content),
      content.opening ? JSON.stringify(content) : null,
      context || null
    ]);

    const contentId = insertResult.rows[0].id;

    await query(
      `INSERT INTO activity_log (lead_id, action_type, details) VALUES ($1, 'content_generated', $2)`,
      [Number(lead_id), { content_id: contentId, channel }]
    );

    const { rows } = await query('SELECT * FROM outreach_content WHERE id = $1', [contentId]);
    res.status(201).json({ success: true, data: { ...rows[0], generated: content } });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

module.exports = router;
