-- Schema improvements for unit_whatsapp_connections
-- Add status tracking fields
ALTER TABLE unit_whatsapp_connections
ADD COLUMN IF NOT EXISTS status_reason TEXT,
    ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS qr_updated_at TIMESTAMPTZ;
-- Add index for instance_id lookup (critical for webhook routing)
CREATE INDEX IF NOT EXISTS idx_unit_whatsapp_instance_lookup ON unit_whatsapp_connections(instance_id)
WHERE instance_id IS NOT NULL;
COMMENT ON COLUMN unit_whatsapp_connections.status_reason IS 'Human-readable status: waiting_scan, scan_completed, disconnected, connection_error, etc';
COMMENT ON COLUMN unit_whatsapp_connections.connected_at IS 'Timestamp of last successful connection';
COMMENT ON COLUMN unit_whatsapp_connections.disconnected_at IS 'Timestamp of last disconnection';
COMMENT ON COLUMN unit_whatsapp_connections.qr_updated_at IS 'Timestamp of last QR code update';