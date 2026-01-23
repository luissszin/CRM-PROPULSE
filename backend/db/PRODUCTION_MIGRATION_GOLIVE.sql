-- ============================================================
-- EVOLUTION WHATSAPP - PRODUCTION MIGRATIONS (IDEMPOTENT)
-- ============================================================
-- Execute este bloco completo no Supabase SQL Editor
-- Safe to run multiple times (IF NOT EXISTS + IF EXISTS checks)
-- ============================================================
-- ============================================================
-- MIGRATION 1: Connection Status Tracking
-- File: schema_connection_improvements.sql
-- ============================================================
DO $$ BEGIN -- Add status_reason column
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'unit_whatsapp_connections'
        AND column_name = 'status_reason'
) THEN
ALTER TABLE unit_whatsapp_connections
ADD COLUMN status_reason TEXT;
RAISE NOTICE 'Added column: unit_whatsapp_connections.status_reason';
ELSE RAISE NOTICE 'Column already exists: unit_whatsapp_connections.status_reason';
END IF;
-- Add connected_at column
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'unit_whatsapp_connections'
        AND column_name = 'connected_at'
) THEN
ALTER TABLE unit_whatsapp_connections
ADD COLUMN connected_at TIMESTAMPTZ;
RAISE NOTICE 'Added column: unit_whatsapp_connections.connected_at';
ELSE RAISE NOTICE 'Column already exists: unit_whatsapp_connections.connected_at';
END IF;
-- Add disconnected_at column
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'unit_whatsapp_connections'
        AND column_name = 'disconnected_at'
) THEN
ALTER TABLE unit_whatsapp_connections
ADD COLUMN disconnected_at TIMESTAMPTZ;
RAISE NOTICE 'Added column: unit_whatsapp_connections.disconnected_at';
ELSE RAISE NOTICE 'Column already exists: unit_whatsapp_connections.disconnected_at';
END IF;
-- Add qr_updated_at column
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'unit_whatsapp_connections'
        AND column_name = 'qr_updated_at'
) THEN
ALTER TABLE unit_whatsapp_connections
ADD COLUMN qr_updated_at TIMESTAMPTZ;
RAISE NOTICE 'Added column: unit_whatsapp_connections.qr_updated_at';
ELSE RAISE NOTICE 'Column already exists: unit_whatsapp_connections.qr_updated_at';
END IF;
END $$;
-- Create index for instance lookup (critical for webhook routing)
CREATE INDEX IF NOT EXISTS idx_unit_whatsapp_instance_lookup ON unit_whatsapp_connections(instance_id)
WHERE instance_id IS NOT NULL;
COMMENT ON COLUMN unit_whatsapp_connections.status_reason IS 'Human-readable status: waiting_scan, scan_completed, disconnected, connection_error';
COMMENT ON COLUMN unit_whatsapp_connections.connected_at IS 'Timestamp of last successful connection';
COMMENT ON COLUMN unit_whatsapp_connections.disconnected_at IS 'Timestamp of last disconnection';
COMMENT ON COLUMN unit_whatsapp_connections.qr_updated_at IS 'Timestamp of last QR code update';
-- ============================================================
-- MIGRATION 2: Outbound Message Retry & Idempotency
-- File: schema_outbound_improvements.sql
-- ============================================================
DO $$ BEGIN -- Add client_message_id column
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'messages'
        AND column_name = 'client_message_id'
) THEN
ALTER TABLE messages
ADD COLUMN client_message_id TEXT;
RAISE NOTICE 'Added column: messages.client_message_id';
ELSE RAISE NOTICE 'Column already exists: messages.client_message_id';
END IF;
-- Add retry_count column
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'messages'
        AND column_name = 'retry_count'
) THEN
ALTER TABLE messages
ADD COLUMN retry_count INTEGER DEFAULT 0;
RAISE NOTICE 'Added column: messages.retry_count';
ELSE RAISE NOTICE 'Column already exists: messages.retry_count';
END IF;
-- Add last_retry_at column
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'messages'
        AND column_name = 'last_retry_at'
) THEN
ALTER TABLE messages
ADD COLUMN last_retry_at TIMESTAMPTZ;
RAISE NOTICE 'Added column: messages.last_retry_at';
ELSE RAISE NOTICE 'Column already exists: messages.last_retry_at';
END IF;
-- Add error_details column
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'messages'
        AND column_name = 'error_details'
) THEN
ALTER TABLE messages
ADD COLUMN error_details TEXT;
RAISE NOTICE 'Added column: messages.error_details';
ELSE RAISE NOTICE 'Column already exists: messages.error_details';
END IF;
END $$;
-- Create unique constraint for outbound idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client_message_id_unit ON messages(conversation_id, client_message_id)
WHERE client_message_id IS NOT NULL;
-- Create index for retry processing
CREATE INDEX IF NOT EXISTS idx_messages_retry_failed ON messages(status, retry_count, last_retry_at)
WHERE status IN ('failed', 'queued');
COMMENT ON COLUMN messages.client_message_id IS 'Client-provided ID for outbound message idempotency (UUID from frontend)';
COMMENT ON COLUMN messages.retry_count IS 'Number of send attempts (max 3)';
COMMENT ON COLUMN messages.last_retry_at IS 'Timestamp of last retry attempt';
COMMENT ON COLUMN messages.error_details IS 'Sanitized error message from last failure';
-- ============================================================
-- MIGRATION 3: Campaigns (If not already applied)
-- File: schema_campaigns.sql
-- ============================================================
-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN (
            'draft',
            'scheduled',
            'processing',
            'completed',
            'failed'
        )
    ),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_unit ON campaigns(unit_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
-- Create campaign_recipients table
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'sent', 'delivered', 'read', 'failed')
    ),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    message_id UUID REFERENCES messages(id),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Verify connection columns (Expected: 4 rows)
SELECT column_name,
    data_type,
    '✓ EXISTS' as status
FROM information_schema.columns
WHERE table_name = 'unit_whatsapp_connections'
    AND column_name IN (
        'status_reason',
        'connected_at',
        'disconnected_at',
        'qr_updated_at'
    )
ORDER BY column_name;
-- Verify message columns (Expected: 4 rows)
SELECT column_name,
    data_type,
    '✓ EXISTS' as status
FROM information_schema.columns
WHERE table_name = 'messages'
    AND column_name IN (
        'client_message_id',
        'retry_count',
        'last_retry_at',
        'error_details'
    )
ORDER BY column_name;
-- Verify indexes (Expected: 3+ rows)
SELECT indexname,
    tablename,
    '✓ EXISTS' as status
FROM pg_indexes
WHERE tablename IN ('unit_whatsapp_connections', 'messages')
    AND (
        indexname LIKE '%client_message_id%'
        OR indexname LIKE '%instance_lookup%'
        OR indexname LIKE '%retry_failed%'
    )
ORDER BY tablename,
    indexname;
-- Verify campaigns tables (Expected: 2 rows)
SELECT table_name,
    '✓ EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('campaigns', 'campaign_recipients')
ORDER BY table_name;
-- Verify foreign keys on campaign_recipients (Expected: 2+ rows)
SELECT constraint_name,
    '✓ EXISTS' as status
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
    AND table_name = 'campaign_recipients'
ORDER BY constraint_name;
-- ============================================================
-- FINAL STATUS SUMMARY
-- ============================================================
DO $$
DECLARE conn_cols_count INT;
msg_cols_count INT;
idx_count INT;
campaign_tables_count INT;
BEGIN -- Count connection columns
SELECT COUNT(*) INTO conn_cols_count
FROM information_schema.columns
WHERE table_name = 'unit_whatsapp_connections'
    AND column_name IN (
        'status_reason',
        'connected_at',
        'disconnected_at',
        'qr_updated_at'
    );
-- Count message columns
SELECT COUNT(*) INTO msg_cols_count
FROM information_schema.columns
WHERE table_name = 'messages'
    AND column_name IN (
        'client_message_id',
        'retry_count',
        'last_retry_at',
        'error_details'
    );
-- Count indexes
SELECT COUNT(*) INTO idx_count
FROM pg_indexes
WHERE tablename IN ('unit_whatsapp_connections', 'messages')
    AND (
        indexname LIKE '%client_message_id%'
        OR indexname LIKE '%instance_lookup%'
        OR indexname LIKE '%retry_failed%'
    );
-- Count campaign tables
SELECT COUNT(*) INTO campaign_tables_count
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('campaigns', 'campaign_recipients');
RAISE NOTICE '';
RAISE NOTICE '============================================================';
RAISE NOTICE 'MIGRATION STATUS SUMMARY';
RAISE NOTICE '============================================================';
RAISE NOTICE 'unit_whatsapp_connections columns: % / 4 ✓',
conn_cols_count;
RAISE NOTICE 'messages columns: % / 4 ✓',
msg_cols_count;
RAISE NOTICE 'Indexes created: % / 3+ ✓',
idx_count;
RAISE NOTICE 'Campaign tables: % / 2 ✓',
campaign_tables_count;
RAISE NOTICE '';
IF conn_cols_count = 4
AND msg_cols_count = 4
AND idx_count >= 3
AND campaign_tables_count = 2 THEN RAISE NOTICE '✅ ALL MIGRATIONS APPLIED SUCCESSFULLY!';
RAISE NOTICE '✅ System is ready for Evolution WhatsApp integration';
ELSE RAISE WARNING '⚠️  Some migrations may be incomplete. Review verification queries above.';
END IF;
RAISE NOTICE '============================================================';
END $$;