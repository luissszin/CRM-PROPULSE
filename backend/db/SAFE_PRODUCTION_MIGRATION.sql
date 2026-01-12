-- SAFE PRODUCTION MIGRATION
-- This script checks for existing columns/tables before creating them
-- Execute this in Supabase SQL Editor
-- ============================================
-- STEP 1: Verify base tables exist
-- ============================================
DO $$ BEGIN -- Check if leads table exists
IF NOT EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'leads'
) THEN RAISE EXCEPTION 'Base table "leads" does not exist. Please run the base schema first.';
END IF;
-- Check if units table exists
IF NOT EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'units'
) THEN RAISE EXCEPTION 'Base table "units" does not exist. Please run the base schema first.';
END IF;
RAISE NOTICE 'Base tables verified ✓';
END $$;
-- ============================================
-- STEP 2: Create Observability Tables
-- ============================================
-- Table: system_errors
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
-- Table: unit_daily_metrics
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
-- Trigger Function for metrics
CREATE OR REPLACE FUNCTION update_metrics_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_metrics_timestamp ON unit_daily_metrics;
CREATE TRIGGER trigger_update_metrics_timestamp BEFORE
UPDATE ON unit_daily_metrics FOR EACH ROW EXECUTE FUNCTION update_metrics_timestamp();
-- ============================================
-- STEP 3: Add Performance Indexes (SAFE)
-- ============================================
-- Only create indexes if the columns exist
DO $$ BEGIN -- Index on leads(unit_id, created_at)
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'leads'
        AND column_name = 'unit_id'
) THEN CREATE INDEX IF NOT EXISTS idx_leads_unit_created ON leads(unit_id, created_at);
RAISE NOTICE 'Created index on leads(unit_id, created_at) ✓';
ELSE RAISE WARNING 'Column leads.unit_id does not exist, skipping index';
END IF;
-- Index on messages(conversation_id, created_at)
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'messages'
)
AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'messages'
        AND column_name = 'conversation_id'
) THEN CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
RAISE NOTICE 'Created index on messages(conversation_id, created_at) ✓';
END IF;
-- Index on conversations(unit_id, updated_at)
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'conversations'
)
AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'conversations'
        AND column_name = 'unit_id'
) THEN CREATE INDEX IF NOT EXISTS idx_conversations_unit_updated ON conversations(unit_id, updated_at);
RAISE NOTICE 'Created index on conversations(unit_id, updated_at) ✓';
END IF;
RAISE NOTICE 'Created index on conversations(unit_id, updated_at) ✓';
END IF;
END $$;
-- ============================================
-- STEP 3.5: Add Missing Core Columns (Critical Fixes)
-- ============================================
DO $$ BEGIN -- Add status column to messages if it doesn't exist
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'messages'
        AND column_name = 'status'
) THEN
ALTER TABLE messages
ADD COLUMN status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'sent', 'failed', 'delivered', 'read')
    );
RAISE NOTICE 'Added column messages.status ✓';
END IF;
-- Add external_id column to messages if it doesn't exist
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'messages'
        AND column_name = 'external_id'
) THEN
ALTER TABLE messages
ADD COLUMN external_id TEXT;
RAISE NOTICE 'Added column messages.external_id ✓';
END IF;
END $$;
-- ============================================
-- STEP 4: Add Lead Scoring Columns (SAFE)
-- ============================================
DO $$ BEGIN -- Add score column if it doesn't exist
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'leads'
        AND column_name = 'score'
) THEN
ALTER TABLE leads
ADD COLUMN score INT DEFAULT 0;
RAISE NOTICE 'Added column leads.score ✓';
END IF;
-- Add temperature column if it doesn't exist
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'leads'
        AND column_name = 'temperature'
) THEN
ALTER TABLE leads
ADD COLUMN temperature TEXT DEFAULT 'cold' CHECK (temperature IN ('cold', 'warm', 'hot'));
RAISE NOTICE 'Added column leads.temperature ✓';
END IF;
-- Add last_engagement_at column if it doesn't exist
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'leads'
        AND column_name = 'last_engagement_at'
) THEN
ALTER TABLE leads
ADD COLUMN last_engagement_at TIMESTAMPTZ DEFAULT NOW();
RAISE NOTICE 'Added column leads.last_engagement_at ✓';
END IF;
END $$;
-- ============================================
-- STEP 5: Create Automation Tables
-- ============================================
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
-- Table: AI Configuration
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
-- Table: Automation Logs
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
-- VERIFICATION
-- ============================================
-- List all new tables
SELECT 'Tables Created:' as info,
    string_agg(table_name, ', ') as tables
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN (
        'system_errors',
        'unit_daily_metrics',
        'automation_rules',
        'unit_ai_settings',
        'automation_logs'
    );
-- List new columns on leads
SELECT 'New Lead Columns:' as info,
    string_agg(column_name, ', ') as columns
FROM information_schema.columns
WHERE table_name = 'leads'
    AND column_name IN ('score', 'temperature', 'last_engagement_at');
-- Success message
SELECT '✅ Migration completed successfully!' as status;