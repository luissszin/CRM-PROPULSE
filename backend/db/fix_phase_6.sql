-- RUN THIS IN SUPABASE SQL EDITOR
-- Fix for missing status and other columns in messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status text not null default 'pending';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type text;

-- Fix for missing columns in conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel text default 'whatsapp';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS instance_id uuid;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_id text;

-- Fix for automation_flows
ALTER TABLE automation_flows ADD COLUMN IF NOT EXISTS trigger_config jsonb default '{}'::jsonb;

-- Ensure indexes
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
