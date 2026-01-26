-- Migration: Automation Engine (Kommo-Style)
-- Date: 2026-01-26
-- Description: Normalizes automation structure for robust triggers, conditions, and actions.
BEGIN;
-- 1. Automation Flows (Enhanced)
CREATE TABLE IF NOT EXISTS automation_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    trigger_type TEXT NOT NULL,
    -- e.g., 'lead_created', 'stage_changed', 'tag_added', 'message_received'
    trigger_config JSONB DEFAULT '{}',
    -- e.g., { "stage_from": "A", "stage_to": "B" }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2. Automation Conditions (Guard Clauses)
CREATE TABLE IF NOT EXISTS automation_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID REFERENCES automation_flows(id) ON DELETE CASCADE,
    field TEXT NOT NULL,
    -- e.g., 'lead.custom_fields.budget', 'lead.tags'
    operator TEXT NOT NULL,
    -- 'equals', 'contains', 'greater_than', 'is_set'
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 3. Automation Actions (Ordered Steps)
CREATE TABLE IF NOT EXISTS automation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID REFERENCES automation_flows(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    -- 'send_whatsapp', 'add_tag', 'move_stage', 'create_task', 'wait'
    config JSONB NOT NULL DEFAULT '{}',
    -- { "message": "Template...", "delay": 3600 }
    execution_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 4. Automation Executions (Audit Log)
CREATE TABLE IF NOT EXISTS automation_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID REFERENCES automation_flows(id) ON DELETE
    SET NULL,
        unit_id UUID,
        -- Denormalized for easy querying
        lead_id UUID,
        -- Target entity (could be contact_id too, but lead is primary)
        status TEXT NOT NULL,
        -- 'pending', 'processing', 'completed', 'failed', 'halted'
        current_step INT DEFAULT 0,
        context JSONB DEFAULT '{}',
        -- Snapshot of data at time of execution
        error_details TEXT,
        executed_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
);
-- Indexes for basic performance
CREATE INDEX IF NOT EXISTS idx_automation_flows_unit ON automation_flows(unit_id);
CREATE INDEX IF NOT EXISTS idx_automation_flows_trigger ON automation_flows(unit_id, trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_actions_flow ON automation_actions(flow_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_unit ON automation_executions(unit_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_lead ON automation_executions(lead_id);
COMMIT;