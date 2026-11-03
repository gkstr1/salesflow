-- Run this once in the Supabase SQL Editor (in order).
-- pipeline_stages must exist before leads (foreign key).

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id            SERIAL  PRIMARY KEY,
  name          TEXT    NOT NULL UNIQUE,
  display_order INTEGER NOT NULL,
  color_hex     TEXT    NOT NULL DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS leads (
  id               SERIAL      PRIMARY KEY,
  first_name       TEXT        NOT NULL,
  last_name        TEXT        NOT NULL,
  email            TEXT        NOT NULL UNIQUE,
  company          TEXT,
  job_title        TEXT,
  phone            TEXT,
  linkedin_url     TEXT,
  company_size     TEXT,
  industry         TEXT,
  linkedin_summary TEXT,
  company_website  TEXT,
  recent_news      TEXT,
  stage_id         INTEGER     NOT NULL REFERENCES pipeline_stages(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outreach_emails (
  id           SERIAL  PRIMARY KEY,
  lead_id      INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  email_type   TEXT    NOT NULL CHECK (email_type IN ('cold', 'followup')),
  subject      TEXT    NOT NULL,
  body         TEXT    NOT NULL,
  user_context TEXT,
  is_sent      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id          SERIAL  PRIMARY KEY,
  lead_id     INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  company_id  INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  action_type TEXT    NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Companies (top-level entity for Kanban board)
CREATE TABLE IF NOT EXISTS companies (
  id            SERIAL      PRIMARY KEY,
  name          TEXT        NOT NULL,
  domain        TEXT        UNIQUE,
  industry      TEXT,
  size          TEXT,
  website       TEXT,
  linkedin_url  TEXT,
  description   TEXT,
  recent_news   TEXT,
  stage_id      INTEGER     NOT NULL REFERENCES pipeline_stages(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add company_id to leads (run separately if leads table already exists)
-- ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Sequences (reusable multi-step outreach templates)
CREATE TABLE IF NOT EXISTS sequences (
  id          SERIAL      PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequence steps (individual actions in a sequence)
CREATE TABLE IF NOT EXISTS sequence_steps (
  id               SERIAL  PRIMARY KEY,
  sequence_id      INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_order       INTEGER NOT NULL,
  channel          TEXT    NOT NULL CHECK (channel IN ('email', 'voice_drop', 'cold_call', 'linkedin_connect', 'linkedin_message', 'linkedin_engage', 'social_post')),
  delay_days       INTEGER NOT NULL DEFAULT 0,
  delay_hours      INTEGER NOT NULL DEFAULT 0,
  content_template TEXT,
  subject_template TEXT,
  settings         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequence enrollments (leads/companies enrolled in sequences)
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id               SERIAL      PRIMARY KEY,
  sequence_id      INTEGER     NOT NULL REFERENCES sequences(id),
  lead_id          INTEGER     REFERENCES leads(id) ON DELETE CASCADE,
  company_id       INTEGER     REFERENCES companies(id) ON DELETE CASCADE,
  current_step     INTEGER     NOT NULL DEFAULT 1,
  status           TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'bounced', 'replied', 'unsubscribed')),
  enrolled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_executed_at TIMESTAMPTZ,
  next_execute_at  TIMESTAMPTZ,
  UNIQUE(sequence_id, lead_id)
);

-- Scheduled tasks (automation engine)
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id            SERIAL      PRIMARY KEY,
  enrollment_id INTEGER     NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
  step_id       INTEGER     NOT NULL REFERENCES sequence_steps(id),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  result        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at   TIMESTAMPTZ
);

-- Multi-channel outreach content (extends outreach_emails concept)
CREATE TABLE IF NOT EXISTS outreach_content (
  id              SERIAL      PRIMARY KEY,
  lead_id         INTEGER     REFERENCES leads(id) ON DELETE CASCADE,
  company_id      INTEGER     REFERENCES companies(id) ON DELETE CASCADE,
  enrollment_id   INTEGER     REFERENCES sequence_enrollments(id) ON DELETE SET NULL,
  step_id         INTEGER     REFERENCES sequence_steps(id) ON DELETE SET NULL,
  channel         TEXT        NOT NULL CHECK (channel IN ('email', 'voice_drop', 'cold_call', 'linkedin_connect', 'linkedin_message', 'linkedin_engage', 'social_post')),
  content_type    TEXT        NOT NULL,
  subject         TEXT,
  body            TEXT        NOT NULL,
  call_script     TEXT,
  user_context    TEXT,
  is_sent         BOOLEAN     NOT NULL DEFAULT false,
  sent_at         TIMESTAMPTZ,
  external_id     TEXT,
  delivery_status TEXT        DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  delivery_error  TEXT,
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI chat conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id           SERIAL      PRIMARY KEY,
  context_type TEXT        NOT NULL,
  context_id   INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI chat messages
CREATE TABLE IF NOT EXISTS ai_messages (
  id              SERIAL      PRIMARY KEY,
  conversation_id INTEGER     NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Integration settings (for external services)
CREATE TABLE IF NOT EXISTS integration_settings (
  id                SERIAL      PRIMARY KEY,
  provider          TEXT        NOT NULL UNIQUE,
  api_key_encrypted TEXT,
  settings          JSONB,
  is_active         BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_stage_id ON companies(stage_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_next_execute ON sequence_enrollments(next_execute_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_pending ON scheduled_tasks(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outreach_content_lead ON outreach_content(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_content_company ON outreach_content(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_company ON activity_log(company_id);
