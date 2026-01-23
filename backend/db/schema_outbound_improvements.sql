-- Outbound message improvements
-- Add client_message_id for outbound idempotency and retry tracking
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS client_message_id TEXT,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS error_details TEXT;
-- Unique constraint for outbound idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client_message_id_unit ON messages(conversation_id, client_message_id)
WHERE client_message_id IS NOT NULL;
-- Index for retry processing
CREATE INDEX IF NOT EXISTS idx_messages_retry_failed ON messages(status, retry_count, last_retry_at)
WHERE status IN ('failed', 'queued');
COMMENT ON COLUMN messages.client_message_id IS 'Client-provided ID for outbound message idempotency (e.g., UUID from frontend)';
COMMENT ON COLUMN messages.retry_count IS 'Number of send attempts (max 3)';
COMMENT ON COLUMN messages.last_retry_at IS 'Timestamp of last retry attempt';
COMMENT ON COLUMN messages.error_details IS 'Sanitized error message from last failure';