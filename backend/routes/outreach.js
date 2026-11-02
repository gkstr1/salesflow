const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

router.get('/lead/:lead_id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM outreach_emails WHERE lead_id = $1 ORDER BY created_at DESC', [Number(req.params.lead_id)]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL' });
  }
});

router.put('/:id/mark-sent', async (req, res) => {
  try {
    const { rows: emailRows } = await query('SELECT * FROM outreach_emails WHERE id = $1', [Number(req.params.id)]);
    const email = emailRows[0];
    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found', code: 'NOT_FOUND' });
    }

    const isSent = !!req.body.is_sent;
    await query('UPDATE outreach_emails SET is_sent = $1 WHERE id = $2', [isSent, Number(req.params.id)]);

    if (isSent) {
      await query(
        `INSERT INTO activity_log (lead_id, action_type, details) VALUES ($1, 'email_marked_sent', $2)`,
        [email.lead_id, { email_id: email.id, email_type: email.email_type }]
      );
    }

    const { rows: updatedRows } = await query('SELECT * FROM outreach_emails WHERE id = $1', [Number(req.params.id)]);
    res.json({ success: true, data: updatedRows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL' });
  }
});

module.exports = router;
