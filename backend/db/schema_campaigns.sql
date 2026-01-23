-- backend/db/schema.sql
-- Upsert to add Campaigns tables
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ,
    status TEXT DEFAULT 'draft',
    -- draft, scheduled, processing, completed, failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_campaigns_unit ON campaigns(unit_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id),
    -- Linked message after sending
    status TEXT DEFAULT 'pending',
    -- pending, sent, failed, delivered, read
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);