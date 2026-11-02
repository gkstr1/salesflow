const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

router.get('/lead/:lead_id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM activity_log WHERE lead_id = $1 ORDER BY created_at DESC', [Number(req.params.lead_id)]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL' });
  }
});

router.get('/company/:company_id', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM activity_log WHERE company_id = $1 ORDER BY created_at DESC',
      [Number(req.params.company_id)]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL' });
  }
});

module.exports = router;
