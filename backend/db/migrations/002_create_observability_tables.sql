-- Migration: Create tables for Observability and Metrics
-- 1. Table: system_errors
-- Stores critical application errors for post-mortem analysis (Sentry-like)
CREATE TABLE IF NOT EXISTS system_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID,
    -- Nullable (global errors)
    user_id UUID,
    -- Nullable
    error_code TEXT,
    message TEXT,
    stack_trace TEXT,
    context JSONB DEFAULT '{}',
    -- HTTP Method, URL, Body, etc.
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
-- Aggregated daily stats for performance dashboards without heavy queries
CREATE TABLE IF NOT EXISTS unit_daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Business Metrics
    messages_sent INT DEFAULT 0,
    messages_failed INT DEFAULT 0,
    messages_received INT DEFAULT 0,
    leads_created INT DEFAULT 0,
    active_conversations INT DEFAULT 0,
    -- Performance/Health Metrics
    api_requests_count INT DEFAULT 0,
    avg_response_time_ms FLOAT DEFAULT 0,
    provider_errors INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, date)
);
CREATE INDEX IF NOT EXISTS idx_metrics_unit_date ON unit_daily_metrics(unit_id, date);
-- 3. Indexes for core tables (Performance Optimization)
CREATE INDEX IF NOT EXISTS idx_leads_unit_created ON leads(unit_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_unit_updated ON conversations(unit_id, updated_at);
-- 4. Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_metrics_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_metrics_timestamp BEFORE
UPDATE ON unit_daily_metrics FOR EACH ROW EXECUTE FUNCTION update_metrics_timestamp();