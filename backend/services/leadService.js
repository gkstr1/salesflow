const { pool, query } = require('../db/database');

async function getAllLeads({ stageId, search } = {}) {
  let sql = 'SELECT * FROM leads';
  const params = [];
  const conditions = [];
  let idx = 1;

  if (stageId) {
    conditions.push(`stage_id = $${idx++}`);
    params.push(Number(stageId));
  }

  if (search) {
    const term = `%${search}%`;
    conditions.push(`(first_name LIKE $${idx} OR last_name LIKE $${idx + 1} OR email LIKE $${idx + 2} OR company LIKE $${idx + 3})`);
    params.push(term, term, term, term);
    idx += 4;
  }

  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC';
  const { rows } = await query(sql, params);
  return rows;
}

async function getLeadById(id) {
  const { rows } = await query('SELECT * FROM leads WHERE id = $1', [Number(id)]);
  return rows[0];
}

async function createLead(data, { client: queryClient } = {}) {
  const db = queryClient || { query: (sql, params) => query(sql, params) };

  const fields = ['first_name', 'last_name', 'email', 'company', 'job_title', 'phone',
    'linkedin_url', 'company_size', 'industry', 'linkedin_summary', 'company_website', 'recent_news'];

  const lead = { stage_id: 1 };
  for (const field of fields) {
    if (data[field] !== undefined) lead[field] = data[field];
  }

  if (!lead.first_name || !lead.last_name || !lead.email) {
    const err = new Error('first_name, last_name, and email are required');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const columns = Object.keys(lead);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const values = columns.map(c => lead[c]);

  const result = await db.query(
    `INSERT INTO leads (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`,
    values
  );

  const newId = result.rows[0].id;

  await db.query(
    `INSERT INTO activity_log (lead_id, action_type, details) VALUES ($1, 'lead_created', $2)`,
    [newId, {}]
  );

  const final = await db.query('SELECT * FROM leads WHERE id = $1', [newId]);
  return final.rows[0];
}

async function bulkCreateLeads(leadsArray) {
  const client = await pool.connect();
  const created = [];
  try {
    await client.query('BEGIN');
    for (const data of leadsArray) {
      created.push(await createLead(data, { client }));
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return created;
}

async function updateLead(id, data) {
  const lead = await getLeadById(id);
  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const allowedFields = ['first_name', 'last_name', 'email', 'company', 'job_title', 'phone',
    'linkedin_url', 'company_size', 'industry', 'linkedin_summary', 'company_website', 'recent_news'];

  const updates = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) updates[field] = data[field];
  }

  if (Object.keys(updates).length === 0) return lead;

  updates.updated_at = new Date().toISOString();
  const keys = Object.keys(updates);
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map(k => updates[k]);
  values.push(Number(id));

  await query(`UPDATE leads SET ${setClauses} WHERE id = $${values.length}`, values);

  await query(
    `INSERT INTO activity_log (lead_id, action_type, details) VALUES ($1, 'lead_updated', $2)`,
    [Number(id), { updatedFields: keys.filter(k => k !== 'updated_at') }]
  );

  const { rows } = await query('SELECT * FROM leads WHERE id = $1', [Number(id)]);
  return rows[0];
}

async function updateLeadStage(id, stageId) {
  const lead = await getLeadById(id);
  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const { rows: stageRows } = await query('SELECT * FROM pipeline_stages WHERE id = $1', [Number(stageId)]);
  if (!stageRows[0]) {
    const err = new Error('Stage not found');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const { rows: oldStageRows } = await query('SELECT name FROM pipeline_stages WHERE id = $1', [lead.stage_id]);

  await query(
    'UPDATE leads SET stage_id = $1, updated_at = $2 WHERE id = $3',
    [Number(stageId), new Date().toISOString(), Number(id)]
  );

  await query(
    `INSERT INTO activity_log (lead_id, action_type, details) VALUES ($1, 'stage_change', $2)`,
    [Number(id), { from: oldStageRows[0].name, to: stageRows[0].name }]
  );

  const { rows } = await query('SELECT * FROM leads WHERE id = $1', [Number(id)]);
  return rows[0];
}

async function deleteLead(id) {
  const lead = await getLeadById(id);
  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  await query('DELETE FROM leads WHERE id = $1', [Number(id)]);
  return { deleted: true };
}

module.exports = {
  getAllLeads,
  getLeadById,
  createLead,
  bulkCreateLeads,
  updateLead,
  updateLeadStage,
  deleteLead
};
