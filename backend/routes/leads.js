const express = require('express');
const router = express.Router();
const { getAllLeads, getLeadById, createLead, bulkCreateLeads, updateLead, updateLeadStage, deleteLead } = require('../services/leadService');

router.get('/', async (req, res) => {
  try {
    const leads = await getAllLeads({ stageId: req.query.stage_id, search: req.query.search });
    res.json({ success: true, data: leads });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const lead = await getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found', code: 'NOT_FOUND' });
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.post('/', async (req, res) => {
  try {
    const lead = await createLead(req.body);
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    if (!Array.isArray(req.body.leads)) {
      return res.status(400).json({ success: false, error: 'Body must contain a "leads" array', code: 'VALIDATION_ERROR' });
    }
    const leads = await bulkCreateLeads(req.body.leads);
    res.status(201).json({ success: true, data: leads });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const lead = await updateLead(req.params.id, req.body);
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.put('/:id/stage', async (req, res) => {
  try {
    if (!req.body.stage_id) {
      return res.status(400).json({ success: false, error: 'stage_id is required', code: 'VALIDATION_ERROR' });
    }
    const lead = await updateLeadStage(req.params.id, req.body.stage_id);
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await deleteLead(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

module.exports = router;
