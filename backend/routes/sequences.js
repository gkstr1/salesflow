const express = require('express');
const router = express.Router();
const {
  getAllSequences,
  getSequenceById,
  getSequenceWithSteps,
  createSequence,
  updateSequence,
  deleteSequence,
  addStep,
  updateStep,
  deleteStep,
  reorderSteps,
  VALID_CHANNELS
} = require('../services/sequenceService');

router.get('/channels', (req, res) => {
  res.json({ success: true, data: VALID_CHANNELS });
});

router.get('/', async (req, res) => {
  try {
    const isActive = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;
    const sequences = await getAllSequences({ isActive });
    res.json({ success: true, data: sequences });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sequence = await getSequenceWithSteps(req.params.id);
    if (!sequence) {
      return res.status(404).json({ success: false, error: 'Sequence not found', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: sequence });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.post('/', async (req, res) => {
  try {
    const sequence = await createSequence(req.body);
    res.status(201).json({ success: true, data: sequence });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const sequence = await updateSequence(req.params.id, req.body);
    res.json({ success: true, data: sequence });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await deleteSequence(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.post('/:id/steps', async (req, res) => {
  try {
    const step = await addStep(req.params.id, req.body);
    res.status(201).json({ success: true, data: step });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.put('/:id/steps/:stepId', async (req, res) => {
  try {
    const step = await updateStep(req.params.id, req.params.stepId, req.body);
    res.json({ success: true, data: step });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.delete('/:id/steps/:stepId', async (req, res) => {
  try {
    const result = await deleteStep(req.params.id, req.params.stepId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

router.put('/:id/steps/reorder', async (req, res) => {
  try {
    if (!Array.isArray(req.body.step_ids)) {
      return res.status(400).json({ success: false, error: 'step_ids array is required', code: 'VALIDATION_ERROR' });
    }
    const sequence = await reorderSteps(req.params.id, req.body.step_ids);
    res.json({ success: true, data: sequence });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message, code: err.code || 'INTERNAL' });
  }
});

module.exports = router;
