const express = require('express');
const router = express.Router();
const {
  getAllCompanies,
  getCompanyById,
  getCompanyWithLeads,
  createCompany,
  updateCompany,
  updateCompanyStage,
  deleteCompany,
  addLeadToCompany,
  removeLeadFromCompany,
  getCompaniesByStage
} = require('../services/companyService');

router.get('/', async (req, res) => {
  try {
    const companies = await getAllCompanies({ stageId: req.query.stage_id, search: req.query.search });
    res.json({ success: true, data: companies });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.get('/kanban', async (req, res) => {
  try {
    const data = await getCompaniesByStage();
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const company = await getCompanyById(req.params.id);
    if (!company) return res.status(404).json({ success: false, error: 'Company not found', code: 'NOT_FOUND' });
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.get('/:id/leads', async (req, res) => {
  try {
    const company = await getCompanyWithLeads(req.params.id);
    if (!company) return res.status(404).json({ success: false, error: 'Company not found', code: 'NOT_FOUND' });
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.post('/', async (req, res) => {
  try {
    const company = await createCompany(req.body);
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const company = await updateCompany(req.params.id, req.body);
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.put('/:id/stage', async (req, res) => {
  try {
    if (!req.body.stage_id) {
      return res.status(400).json({ success: false, error: 'stage_id is required', code: 'VALIDATION_ERROR' });
    }
    const company = await updateCompanyStage(req.params.id, req.body.stage_id);
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await deleteCompany(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.post('/:id/leads/:leadId', async (req, res) => {
  try {
    const company = await addLeadToCompany(req.params.id, req.params.leadId);
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.delete('/:id/leads/:leadId', async (req, res) => {
  try {
    const result = await removeLeadFromCompany(req.params.leadId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

module.exports = router;
