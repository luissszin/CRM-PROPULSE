-- Migration: Create unit_whatsapp_connections table
-- This table enforces one WhatsApp connection per unit
CREATE TABLE IF NOT EXISTS unit_whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL UNIQUE REFERENCES units(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('zapi', 'evolution', 'meta')),
    instance_id TEXT,
    phone_number TEXT,
    access_token TEXT,
    business_id TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (
        status IN (
            'disconnected',
            'connecting',
            'connected',
            'error'
        )
    ),
    qr_code TEXT,
    provider_config JSONB DEFAULT '{}',
    webhook_secret TEXT DEFAULT gen_random_uuid()::text,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_unit_whatsapp_unit ON unit_whatsapp_connections(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_whatsapp_provider ON unit_whatsapp_connections(provider);
CREATE INDEX IF NOT EXISTS idx_unit_whatsapp_instance ON unit_whatsapp_connections(instance_id);
CREATE INDEX IF NOT EXISTS idx_unit_whatsapp_status ON unit_whatsapp_connections(status);
-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_unit_whatsapp_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_unit_whatsapp_updated_at BEFORE
UPDATE ON unit_whatsapp_connections FOR EACH ROW EXECUTE FUNCTION update_unit_whatsapp_updated_at();
-- Comment for documentation
COMMENT ON TABLE unit_whatsapp_connections IS 'Stores WhatsApp connection information for each unit. Each unit can have exactly one WhatsApp connection (enforced by UNIQUE constraint on unit_id).';
COMMENT ON COLUMN unit_whatsapp_connections.provider IS 'WhatsApp provider type: zapi, evolution, or meta';
COMMENT ON COLUMN unit_whatsapp_connections.status IS 'Connection status: disconnected, connecting, connected, or error';
COMMENT ON COLUMN unit_whatsapp_connections.webhook_secret IS 'Secret token for validating incoming webhooks from providers';