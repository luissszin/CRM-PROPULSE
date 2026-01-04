-- Refactor WhatsApp Instances for Multi-Provider Support
ALTER TABLE whatsapp_instances 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'evolution',
ADD COLUMN IF NOT EXISTS provider_config JSONB DEFAULT '{}';

-- Migration to move existing apiUrl/apiKey to provider_config if needed
-- (Optional cleanup but useful for consistency)
UPDATE whatsapp_instances 
SET provider_config = jsonb_build_object('apiUrl', apiUrl, 'apiKey', apiKey)
WHERE provider = 'evolution' AND (apiUrl IS NOT NULL OR apiKey IS NOT NULL);

-- Comments
COMMENT ON COLUMN whatsapp_instances.provider IS 'WhatsApp integration provider: evolution or meta';
COMMENT ON COLUMN whatsapp_instances.provider_config IS 'JSON configuration for the provider (tokens, IDs, etc)';
