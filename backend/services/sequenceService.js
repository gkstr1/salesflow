const { pool, query } = require('../db/database');

const VALID_CHANNELS = ['email', 'voice_drop', 'cold_call', 'linkedin_connect', 'linkedin_message', 'linkedin_engage', 'social_post'];

async function getAllSequences({ isActive } = {}) {
  let sql = `
    SELECT s.*,
           COUNT(ss.id) as step_count
    FROM sequences s
    LEFT JOIN sequence_steps ss ON ss.sequence_id = s.id
  `;
  const params = [];

  if (isActive !== undefined) {
    sql += ' WHERE s.is_active = $1';
    params.push(isActive);
  }

  sql += ' GROUP BY s.id ORDER BY s.created_at DESC';
  const { rows } = await query(sql, params);
  return rows;
}

async function getSequenceById(id) {
  const { rows } = await query('SELECT * FROM sequences WHERE id = $1', [Number(id)]);
  return rows[0];
}

async function getSequenceWithSteps(id) {
  const sequence = await getSequenceById(id);
  if (!sequence) return null;

  const { rows: steps } = await query(
    'SELECT * FROM sequence_steps WHERE sequence_id = $1 ORDER BY step_order ASC',
    [Number(id)]
  );

  return { ...sequence, steps };
}

async function createSequence(data) {
  const { name, description, is_active = true } = data;

  if (!name || !name.trim()) {
    const err = new Error('Sequence name is required');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const { rows } = await query(
    'INSERT INTO sequences (name, description, is_active) VALUES ($1, $2, $3) RETURNING *',
    [name.trim(), description || null, is_active]
  );

  return rows[0];
}

async function updateSequence(id, data) {
  const sequence = await getSequenceById(id);
  if (!sequence) {
    const err = new Error('Sequence not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const allowedFields = ['name', 'description', 'is_active'];
  const updates = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) updates[field] = data[field];
  }

  if (Object.keys(updates).length === 0) return sequence;

  updates.updated_at = new Date().toISOString();
  const keys = Object.keys(updates);
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map(k => updates[k]);
  values.push(Number(id));

  await query(`UPDATE sequences SET ${setClauses} WHERE id = $${values.length}`, values);

  return getSequenceById(id);
}

async function deleteSequence(id) {
  const sequence = await getSequenceById(id);
  if (!sequence) {
    const err = new Error('Sequence not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  await query('DELETE FROM sequences WHERE id = $1', [Number(id)]);
  return { deleted: true };
}

async function addStep(sequenceId, stepData) {
  const sequence = await getSequenceById(sequenceId);
  if (!sequence) {
    const err = new Error('Sequence not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const { channel, delay_days = 0, delay_hours = 0, content_template, subject_template, settings } = stepData;

  if (!channel || !VALID_CHANNELS.includes(channel)) {
    const err = new Error(`Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}`);
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const { rows: maxRows } = await query(
    'SELECT COALESCE(MAX(step_order), 0) as max_order FROM sequence_steps WHERE sequence_id = $1',
    [Number(sequenceId)]
  );
  const nextOrder = maxRows[0].max_order + 1;

  const { rows } = await query(`
    INSERT INTO sequence_steps (sequence_id, step_order, channel, delay_days, delay_hours, content_template, subject_template, settings)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [Number(sequenceId), nextOrder, channel, delay_days, delay_hours, content_template || null, subject_template || null, settings || null]);

  return rows[0];
}

async function updateStep(sequenceId, stepId, stepData) {
  const { rows: stepRows } = await query(
    'SELECT * FROM sequence_steps WHERE id = $1 AND sequence_id = $2',
    [Number(stepId), Number(sequenceId)]
  );

  if (!stepRows[0]) {
    const err = new Error('Step not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const allowedFields = ['channel', 'delay_days', 'delay_hours', 'content_template', 'subject_template', 'settings'];
  const updates = {};

  for (const field of allowedFields) {
    if (stepData[field] !== undefined) updates[field] = stepData[field];
  }

  if (updates.channel && !VALID_CHANNELS.includes(updates.channel)) {
    const err = new Error(`Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}`);
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (Object.keys(updates).length === 0) return stepRows[0];

  const keys = Object.keys(updates);
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map(k => updates[k]);
  values.push(Number(stepId));

  await query(`UPDATE sequence_steps SET ${setClauses} WHERE id = $${values.length}`, values);

  const { rows } = await query('SELECT * FROM sequence_steps WHERE id = $1', [Number(stepId)]);
  return rows[0];
}

async function deleteStep(sequenceId, stepId) {
  const { rows: stepRows } = await query(
    'SELECT * FROM sequence_steps WHERE id = $1 AND sequence_id = $2',
    [Number(stepId), Number(sequenceId)]
  );

  if (!stepRows[0]) {
    const err = new Error('Step not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const deletedOrder = stepRows[0].step_order;

  await query('DELETE FROM sequence_steps WHERE id = $1', [Number(stepId)]);

  await query(
    'UPDATE sequence_steps SET step_order = step_order - 1 WHERE sequence_id = $1 AND step_order > $2',
    [Number(sequenceId), deletedOrder]
  );

  return { deleted: true };
}

async function reorderSteps(sequenceId, stepIds) {
  const sequence = await getSequenceById(sequenceId);
  if (!sequence) {
    const err = new Error('Sequence not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (let i = 0; i < stepIds.length; i++) {
      await client.query(
        'UPDATE sequence_steps SET step_order = $1 WHERE id = $2 AND sequence_id = $3',
        [i + 1, Number(stepIds[i]), Number(sequenceId)]
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return getSequenceWithSteps(sequenceId);
}

module.exports = {
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
};
