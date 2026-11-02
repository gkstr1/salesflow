-- ============================================
-- MIGRATION V2: Multi-Channel Outreach Automation
-- Run this in Supabase SQL Editor after migration.sql
-- ============================================

-- Add company_id to existing leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Update activity_log to support company-level activities
ALTER TABLE activity_log ALTER COLUMN lead_id DROP NOT NULL;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_company ON activity_log(company_id);
