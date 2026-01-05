-- COMBINED MIGRATION SCRIPT FOR PRODUCTION
-- Execute this in Supabase SQL Editor
-- This includes all migrations: 002 (Observability) + 003 (Intelligence)
-- ============================================
-- MIGRATION 002: Observability & Metrics
-- ============================================
-- 1. Table: system_errors
CREATE TABLE IF NOT EXISTS system_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID,
    user_id UUID,
    error_code TEXT,
    message TEXT,
    stack_trace TEXT,
    context JSONB DEFAULT '{}',
    severity TEXT CHECK (
        severity IN ('low', 'medium', 'high', 'critical')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_errors_unit ON system_errors(unit_id);
CREATE INDEX IF NOT EXISTS idx_errors_severity ON system_errors(severity);
CREATE INDEX IF NOT EXISTS idx_errors_created_at ON system_errors(created_at);
-- 2. Table: unit_daily_metrics
CREATE TABLE IF NOT EXISTS unit_daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    messages_sent INT DEFAULT 0,
    messages_failed INT DEFAULT 0,
    messages_received INT DEFAULT 0,
    leads_created INT DEFAULT 0,
    active_conversations INT DEFAULT 0,
    api_requests_count INT DEFAULT 0,
    avg_response_time_ms FLOAT DEFAULT 0,
    provider_errors INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, date)
);
CREATE INDEX IF NOT EXISTS idx_metrics_unit_date ON unit_daily_metrics(unit_id, date);
-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_leads_unit_created ON leads(unit_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_unit_updated ON conversations(unit_id, updated_at);
-- 4. Trigger Function
CREATE OR REPLACE FUNCTION update_metrics_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_metrics_timestamp BEFORE
UPDATE ON unit_daily_metrics FOR EACH ROW EXECUTE FUNCTION update_metrics_timestamp();
-- ============================================
-- MIGRATION 003: Intelligence & Automation
-- ============================================
-- 1. Lead Scoring Columns
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS score INT DEFAULT 0;
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'cold' CHECK (temperature IN ('cold', 'warm', 'hot'));
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS last_engagement_at TIMESTAMPTZ DEFAULT NOW();
-- 2. Automation Rules Table
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (
        trigger_type IN (
            'lead_created',
            'message_received',
            'stage_changed',
            'idle_conversation',
            'lead_scored'
        )
    ),
    action_type TEXT NOT NULL CHECK (
        action_type IN (
            'send_message',
            'notify_user',
            'change_stage',
            'assign_agent'
        )
    ),
    conditions JSONB DEFAULT '[]',
    action_config JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_unit_trigger ON automation_rules(unit_id, trigger_type);
-- 3. AI Configuration Table
CREATE TABLE IF NOT EXISTS unit_ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL UNIQUE REFERENCES units(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT FALSE,
    provider TEXT DEFAULT 'openai',
    model TEXT DEFAULT 'gpt-4o-mini',
    auto_scoring BOOLEAN DEFAULT TRUE,
    auto_summarize BOOLEAN DEFAULT TRUE,
    smart_replies BOOLEAN DEFAULT FALSE,
    system_prompt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 4. Automation Logs (Audit)
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID,
    rule_id UUID REFERENCES automation_rules(id) ON DELETE
    SET NULL,
        entity_id UUID,
        action_type TEXT,
        status TEXT CHECK (status IN ('success', 'failed')),
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify:
-- Check new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN (
        'system_errors',
        'unit_daily_metrics',
        'automation_rules',
        'unit_ai_settings',
        'automation_logs'
    );
-- Check new columns on leads
SELECT column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'leads'
    AND column_name IN ('score', 'temperature', 'last_engagement_at');
-- Success message
SELECT 'Migration completed successfully! ✅' as status;