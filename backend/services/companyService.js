const { pool, query } = require('../db/database');

async function getAllCompanies({ stageId, search } = {}) {
  let sql = `
    SELECT c.*,
           COUNT(l.id) as lead_count,
           ps.name as stage_name,
           ps.color_hex as stage_color
    FROM companies c
    LEFT JOIN leads l ON l.company_id = c.id
    LEFT JOIN pipeline_stages ps ON ps.id = c.stage_id
  `;
  const params = [];
  const conditions = [];
  let idx = 1;

  if (stageId) {
    conditions.push(`c.stage_id = $${idx++}`);
    params.push(Number(stageId));
  }

  if (search) {
    const term = `%${search}%`;
    conditions.push(`(c.name ILIKE $${idx} OR c.domain ILIKE $${idx + 1} OR c.industry ILIKE $${idx + 2})`);
    params.push(term, term, term);
    idx += 3;
  }

  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' GROUP BY c.id, ps.name, ps.color_hex ORDER BY c.created_at DESC';
  const { rows } = await query(sql, params);
  return rows;
}

async function getCompanyById(id) {
  const { rows } = await query(`
    SELECT c.*,
           ps.name as stage_name,
           ps.color_hex as stage_color
    FROM companies c
    LEFT JOIN pipeline_stages ps ON ps.id = c.stage_id
    WHERE c.id = $1
  `, [Number(id)]);
  return rows[0];
}

async function getCompanyWithLeads(id) {
  const company = await getCompanyById(id);
  if (!company) return null;

  const { rows: leads } = await query(`
    SELECT l.*, ps.name as stage_name
    FROM leads l
    LEFT JOIN pipeline_stages ps ON ps.id = l.stage_id
    WHERE l.company_id = $1
    ORDER BY l.created_at DESC
  `, [Number(id)]);

  return { ...company, leads };
}

async function createCompany(data) {
  const fields = ['name', 'domain', 'industry', 'size', 'website', 'linkedin_url', 'description', 'recent_news'];
  const company = { stage_id: 1 };

  for (const field of fields) {
    if (data[field] !== undefined) company[field] = data[field];
  }

  if (!company.name) {
    const err = new Error('Company name is required');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const columns = Object.keys(company);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const values = columns.map(c => company[c]);

  const result = await query(
    `INSERT INTO companies (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`,
    values
  );

  const newId = result.rows[0].id;

  await query(
    `INSERT INTO activity_log (company_id, action_type, details) VALUES ($1, 'company_created', $2)`,
    [newId, {}]
  );

  return getCompanyById(newId);
}

async function updateCompany(id, data) {
  const company = await getCompanyById(id);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const allowedFields = ['name', 'domain', 'industry', 'size', 'website', 'linkedin_url', 'description', 'recent_news'];
  const updates = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) updates[field] = data[field];
  }

  if (Object.keys(updates).length === 0) return company;

  updates.updated_at = new Date().toISOString();
  const keys = Object.keys(updates);
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map(k => updates[k]);
  values.push(Number(id));

  await query(`UPDATE companies SET ${setClauses} WHERE id = $${values.length}`, values);

  await query(
    `INSERT INTO activity_log (company_id, action_type, details) VALUES ($1, 'company_updated', $2)`,
    [Number(id), { updatedFields: keys.filter(k => k !== 'updated_at') }]
  );

  return getCompanyById(id);
}

async function updateCompanyStage(id, stageId) {
  const company = await getCompanyById(id);
  if (!company) {
    const err = new Error('Company not found');
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

  const { rows: oldStageRows } = await query('SELECT name FROM pipeline_stages WHERE id = $1', [company.stage_id]);

  await query(
    'UPDATE companies SET stage_id = $1, updated_at = $2 WHERE id = $3',
    [Number(stageId), new Date().toISOString(), Number(id)]
  );

  await query(
    `INSERT INTO activity_log (company_id, action_type, details) VALUES ($1, 'stage_change', $2)`,
    [Number(id), { from: oldStageRows[0].name, to: stageRows[0].name }]
  );

  return getCompanyById(id);
}

async function deleteCompany(id) {
  const company = await getCompanyById(id);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Note: Leads will have company_id set to NULL due to ON DELETE SET NULL
  // or we could cascade delete leads too
  await query('DELETE FROM companies WHERE id = $1', [Number(id)]);
  return { deleted: true };
}

async function addLeadToCompany(companyId, leadId) {
  const company = await getCompanyById(companyId);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  await query('UPDATE leads SET company_id = $1, updated_at = $2 WHERE id = $3',
    [Number(companyId), new Date().toISOString(), Number(leadId)]);

  await query(
    `INSERT INTO activity_log (lead_id, company_id, action_type, details) VALUES ($1, $2, 'lead_assigned_to_company', $3)`,
    [Number(leadId), Number(companyId), { company_name: company.name }]
  );

  return getCompanyWithLeads(companyId);
}

async function removeLeadFromCompany(leadId) {
  const { rows } = await query('SELECT company_id FROM leads WHERE id = $1', [Number(leadId)]);
  const lead = rows[0];

  if (lead && lead.company_id) {
    await query('UPDATE leads SET company_id = NULL, updated_at = $1 WHERE id = $2',
      [new Date().toISOString(), Number(leadId)]);

    await query(
      `INSERT INTO activity_log (lead_id, action_type, details) VALUES ($1, 'lead_removed_from_company', $2)`,
      [Number(leadId), { previous_company_id: lead.company_id }]
    );
  }

  return { success: true };
}

// Get companies grouped by stage for Kanban board
async function getCompaniesByStage() {
  const { rows: stages } = await query('SELECT * FROM pipeline_stages ORDER BY display_order');

  const { rows: companies } = await query(`
    SELECT c.*,
           COUNT(l.id) as lead_count,
           ps.name as stage_name,
           ps.color_hex as stage_color
    FROM companies c
    LEFT JOIN leads l ON l.company_id = c.id
    LEFT JOIN pipeline_stages ps ON ps.id = c.stage_id
    GROUP BY c.id, ps.name, ps.color_hex
    ORDER BY c.created_at DESC
  `);

  const grouped = {};
  for (const stage of stages) {
    grouped[stage.id] = {
      ...stage,
      companies: companies.filter(c => c.stage_id === stage.id)
    };
  }

  return { stages, grouped };
}

module.exports = {
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
};
