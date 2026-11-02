const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

router.get('/stages', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM pipeline_stages ORDER BY display_order ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL' });
  }
});

module.exports = router;
