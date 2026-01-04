-- WhatsApp Integration Schema
-- Add to existing Supabase schema

-- Table for WhatsApp instances (one per unit)
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  instanceName TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'disconnected', -- disconnected | connecting | connected
  qrcode TEXT,
  phone TEXT,
  profileName TEXT,
  apiUrl TEXT NOT NULL DEFAULT 'http://localhost:8080',
  apiKey TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update conversations table to link to WhatsApp instance
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES whatsapp_instances(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_id TEXT; -- WhatsApp conversation ID

-- Update messages table for WhatsApp compatibility
ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_id TEXT; -- WhatsApp message ID
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT; -- URL for media files
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT; -- image, audio, video, document

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_unit ON whatsapp_instances (unit_id);
CREATE INDEX IF NOT EXISTS idx_conversations_instance ON conversations (instance_id);
CREATE INDEX IF NOT EXISTS idx_conversations_external_id ON conversations (external_id);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages (external_id);

-- Comments for documentation
COMMENT ON TABLE whatsapp_instances IS 'WhatsApp instances connected via Evolution API';
COMMENT ON COLUMN whatsapp_instances.instanceName IS 'Unique instance name for Evolution API';
COMMENT ON COLUMN whatsapp_instances.status IS 'Connection status: disconnected, connecting, connected';
COMMENT ON COLUMN conversations.instance_id IS 'WhatsApp instance this conversation belongs to';
COMMENT ON COLUMN conversations.external_id IS 'WhatsApp conversation ID from Evolution API';
