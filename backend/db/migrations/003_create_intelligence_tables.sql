-- Migration: Intelligence & Automation
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
    -- e.g. [{ "field": "status", "operator": "equals", "value": "new" }]
    action_config JSONB DEFAULT '{}',
    -- e.g. { "message": "Hello!" }
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
    -- Feature Flags
    auto_scoring BOOLEAN DEFAULT TRUE,
    auto_summarize BOOLEAN DEFAULT TRUE,
    smart_replies BOOLEAN DEFAULT FALSE,
    -- Custom Prompts
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
        -- lead_id or conversation_id
        action_type TEXT,
        status TEXT CHECK (status IN ('success', 'failed')),
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
);