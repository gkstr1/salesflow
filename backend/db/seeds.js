const { pool, query } = require('./database');

async function seedDatabase() {
  const { rows } = await query('SELECT COUNT(*) as count FROM pipeline_stages');
  if (Number(rows[0].count) > 0) return;

  await query(`
    INSERT INTO pipeline_stages (name, display_order, color_hex) VALUES
      ($1, $2, $3), ($4, $5, $6), ($7, $8, $9), ($10, $11, $12), ($13, $14, $15)
  `, [
    'New', 1, '#6366f1',
    'Contacted', 2, '#f59e0b',
    'Replied', 3, '#10b981',
    'Closed Won', 4, '#22c55e',
    'Closed Lost', 5, '#ef4444'
  ]);

  // Sample companies with their leads
  const sampleCompanies = [
    {
      name: 'TechVault',
      domain: 'techvault.io',
      industry: 'SaaS',
      size: '50-200',
      website: 'https://techvault.io',
      linkedin_url: 'https://linkedin.com/company/techvault',
      description: 'Developer tools and infrastructure platform for modern engineering teams.',
      recent_news: 'TechVault announced a Series B funding round of $40M in January 2026.',
      leads: [
        {
          first_name: 'Sarah', last_name: 'Chen', email: 'sarah.chen@techvault.io',
          job_title: 'VP of Engineering', phone: '+1 (555) 012-3456',
          linkedin_url: 'https://linkedin.com/in/sarahchen',
          linkedin_summary: 'Building scalable infrastructure at TechVault. Previously at Stripe.'
        },
        {
          first_name: 'James', last_name: 'Wilson', email: 'james.wilson@techvault.io',
          job_title: 'Engineering Manager', phone: '+1 (555) 012-3457',
          linkedin_url: 'https://linkedin.com/in/jameswilson',
          linkedin_summary: 'Leading backend engineering at TechVault. 8 years building distributed systems.'
        }
      ]
    },
    {
      name: 'CloudNine',
      domain: 'cloudnine.com',
      industry: 'Cloud Infrastructure',
      size: '200-500',
      website: 'https://cloudnine.com',
      linkedin_url: 'https://linkedin.com/company/cloudnine',
      description: 'Enterprise cloud infrastructure and DevOps automation platform.',
      recent_news: 'CloudNine is expanding into the EU market this quarter.',
      leads: [
        {
          first_name: 'Marcus', last_name: 'Rivera', email: 'marcus.rivera@cloudnine.com',
          job_title: 'Head of Product', phone: '+1 (555) 234-5678',
          linkedin_url: 'https://linkedin.com/in/marcusrivera',
          linkedin_summary: 'Leading product strategy at CloudNine. 12 years in enterprise software.'
        }
      ]
    },
    {
      name: 'DataStream',
      domain: 'datastream.ai',
      industry: 'AI/ML',
      size: '10-50',
      website: 'https://datastream.ai',
      linkedin_url: 'https://linkedin.com/company/datastream-ai',
      description: 'Automated ML pipeline platform for data science teams.',
      recent_news: 'DataStream launched a new auto-scaling ML pipeline product last month.',
      leads: [
        {
          first_name: 'Priya', last_name: 'Patel', email: 'priya.patel@datastream.ai',
          job_title: 'CTO', phone: '+1 (555) 345-6789',
          linkedin_url: 'https://linkedin.com/in/priyapatel',
          linkedin_summary: 'Co-founded DataStream to democratize ML pipelines. PhD in Computer Science from Stanford.'
        },
        {
          first_name: 'Alex', last_name: 'Kim', email: 'alex.kim@datastream.ai',
          job_title: 'Head of Sales', phone: '+1 (555) 345-6790',
          linkedin_url: 'https://linkedin.com/in/alexkim',
          linkedin_summary: 'Building the GTM engine at DataStream. Previously led sales at Scale AI.'
        }
      ]
    }
  ];

  // Sample sequences
  const sampleSequences = [
    {
      name: 'Cold Outreach - SaaS',
      description: 'Multi-channel sequence for SaaS companies. Email → LinkedIn → Follow-up → Call.',
      steps: [
        { step_order: 1, channel: 'email', delay_days: 0, delay_hours: 0, content_template: 'Initial cold outreach introducing our solution', subject_template: 'Quick question about {{company}}' },
        { step_order: 2, channel: 'linkedin_connect', delay_days: 1, delay_hours: 0, content_template: 'Connect on LinkedIn with personalized note' },
        { step_order: 3, channel: 'email', delay_days: 3, delay_hours: 0, content_template: 'Follow-up email with case study', subject_template: 'Re: Quick question about {{company}}' },
        { step_order: 4, channel: 'voice_drop', delay_days: 5, delay_hours: 0, content_template: 'Leave voicemail referencing previous emails' },
        { step_order: 5, channel: 'linkedin_message', delay_days: 7, delay_hours: 0, content_template: 'LinkedIn message with value proposition' }
      ]
    },
    {
      name: 'Event Follow-up',
      description: 'Sequence for leads met at events or conferences.',
      steps: [
        { step_order: 1, channel: 'email', delay_days: 0, delay_hours: 0, content_template: 'Nice meeting you at {{event_name}}', subject_template: 'Great meeting you at {{event_name}}!' },
        { step_order: 2, channel: 'linkedin_connect', delay_days: 0, delay_hours: 4, content_template: 'LinkedIn connection request referencing event' },
        { step_order: 3, channel: 'email', delay_days: 3, delay_hours: 0, content_template: 'Share relevant resource discussed at event', subject_template: 'Resource I mentioned at {{event_name}}' }
      ]
    }
  ];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create companies and their leads
    for (const company of sampleCompanies) {
      const companyResult = await client.query(`
        INSERT INTO companies (name, domain, industry, size, website, linkedin_url, description, recent_news, stage_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
        RETURNING id
      `, [company.name, company.domain, company.industry, company.size, company.website, company.linkedin_url, company.description, company.recent_news]);

      const companyId = companyResult.rows[0].id;

      await client.query(
        `INSERT INTO activity_log (company_id, action_type, details) VALUES ($1, 'company_created', $2)`,
        [companyId, { source: 'seed' }]
      );

      // Create leads for this company
      for (const lead of company.leads) {
        const leadResult = await client.query(`
          INSERT INTO leads (first_name, last_name, email, company, job_title, phone,
            linkedin_url, company_size, industry, linkedin_summary, company_website, recent_news, stage_id, company_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, $13)
          RETURNING id
        `, [
          lead.first_name, lead.last_name, lead.email, company.name, lead.job_title, lead.phone,
          lead.linkedin_url, company.size, company.industry, lead.linkedin_summary,
          company.website, company.recent_news, companyId
        ]);

        await client.query(
          `INSERT INTO activity_log (lead_id, company_id, action_type, details) VALUES ($1, $2, 'lead_created', $3)`,
          [leadResult.rows[0].id, companyId, { source: 'seed' }]
        );
      }
    }

    // Create sequences
    for (const seq of sampleSequences) {
      const seqResult = await client.query(`
        INSERT INTO sequences (name, description, is_active)
        VALUES ($1, $2, true)
        RETURNING id
      `, [seq.name, seq.description]);

      const seqId = seqResult.rows[0].id;

      for (const step of seq.steps) {
        await client.query(`
          INSERT INTO sequence_steps (sequence_id, step_order, channel, delay_days, delay_hours, content_template, subject_template)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [seqId, step.step_order, step.channel, step.delay_days, step.delay_hours, step.content_template, step.subject_template || null]);
      }
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { seedDatabase };
