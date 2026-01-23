# 🚦 RELEASE GATE CHECKLIST - Evolution WhatsApp

**Data:** 2026-01-22  
**Versão:** 1.0.0 - Release Candidate

---

## ✅ PRÉ-FLIGHT CHECKLIST

Execute antes de qualquer validação:

```bash
# 1. Certifique-se que está na branch correta
git branch

# 2. Verifique que não há mudanças não commitadas críticas
git status

# 3. Confirme variáveis de ambiente
cat .env | grep -E "SUPABASE|EVOLUTION|JWT"
```

---

## 📋 SECTION 1: Database Schema Validation

### ✅ Migration Files Existentes

- [ ] `backend/db/schema_connection_improvements.sql` existe
- [ ] `backend/db/schema_outbound_improvements.sql` existe
- [ ] `backend/db/schema_campaigns.sql` existe

**Comando:**

```bash
ls -la backend/db/schema*.sql
```

---

### ✅ Migrations Aplicadas no Supabase

#### 1.1 Table: `unit_whatsapp_connections`

Execute no Supabase SQL Editor:

```sql
-- Verificar colunas novas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'unit_whatsapp_connections'
  AND column_name IN ('status_reason', 'connected_at', 'disconnected_at', 'qr_updated_at');
```

**Expected Output:** 4 rows (1 por coluna)

**Checklist:**

- [ ] `status_reason` (TEXT)
- [ ] `connected_at` (TIMESTAMPTZ)
- [ ] `disconnected_at` (TIMESTAMPTZ)
- [ ] `qr_updated_at` (TIMESTAMPTZ)

---

#### 1.2 Table: `messages`

Execute no Supabase SQL Editor:

```sql
-- Verificar colunas novas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name IN ('client_message_id', 'retry_count', 'last_retry_at', 'error_details');
```

**Expected Output:** 4 rows

**Checklist:**

- [ ] `client_message_id` (TEXT)
- [ ] `retry_count` (INTEGER)
- [ ] `last_retry_at` (TIMESTAMPTZ)
- [ ] `error_details` (TEXT)

---

#### 1.3 Indexes

Execute no Supabase SQL Editor:

```sql
-- Verificar índices criados
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('unit_whatsapp_connections', 'messages')
  AND indexname LIKE '%client_message_id%'
   OR indexname LIKE '%instance_lookup%'
   OR indexname LIKE '%retry_failed%';
```

**Expected Output:** Pelo menos 3 indexes

**Checklist:**

- [ ] `idx_unit_whatsapp_instance_lookup` existe
- [ ] `idx_messages_client_message_id_unit` existe (UNIQUE)
- [ ] `idx_messages_retry_failed` existe

**Verificar constraint UNIQUE:**

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'messages'
  AND constraint_name LIKE '%client_message_id%';
```

---

#### 1.4 Table: `campaigns` & `campaign_recipients`

Execute no Supabase SQL Editor:

```sql
-- Verificar tabelas existem
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('campaigns', 'campaign_recipients');
```

**Expected Output:** 2 rows

**Checklist:**

- [ ] `campaigns` table exists
- [ ] `campaign_recipients` table exists

**Verificar foreign keys:**

```sql
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_name = 'campaign_recipients';
```

**Expected:** FK para `campaigns` e `contacts`

---

## 📋 SECTION 2: Backend Compatibility

### ✅ In-Memory DB (Test Environment)

Execute localmente:

```bash
$env:NODE_ENV='test'
node -e "import('./backend/services/supabaseService.js').then(m => {
  const sb = m.supabase;
  console.log('In-memory:', sb._inmemory ? 'YES' : 'NO');
  console.log('Has upsert:', typeof sb.from('messages').upsert === 'function' ? 'YES' : 'NO');
})"
```

**Expected Output:**

```
In-memory: YES
Has upsert: YES
```

**Checklist:**

- [ ] In-memory DB detected in test mode
- [ ] Upsert shim exists

---

### ✅ Supabase Connection (Production)

Execute com credenciais reais:

```bash
$env:NODE_ENV='production'
node -e "import('./backend/services/supabaseService.js').then(m => {
  const sb = m.supabase;
  sb.from('units').select('count').limit(1).then(r => {
    console.log('Supabase connection:', r.error ? 'FAIL' : 'OK');
  });
})"
```

**Expected Output:**

```
Supabase connection: OK
```

**Checklist:**

- [ ] Supabase connection works

---

## 📋 SECTION 3: Code Consistency

### ✅ Module Imports

Execute:

```bash
node --check backend/routes/whatsappWebhook.js
node --check backend/routes/messages.js
node --check backend/services/whatsapp/messageHandler.service.js
node --check backend/utils/webhookHelper.js
node --check backend/services/campaignService.js
```

**Expected:** No output (syntax OK)

**Checklist:**

- [ ] whatsappWebhook.js - syntax OK
- [ ] messages.js - syntax OK
- [ ] messageHandler.service.js - syntax OK
- [ ] webhookHelper.js - syntax OK
- [ ] campaignService.js - syntax OK

---

## 📋 SECTION 4: Evolution Flow Validation

### ✅ 4.1 Connect Endpoint (Instance Naming)

**Local Test (Mock Evolution):**

```bash
# Start mock Evolution API (port 9999)
# Then:
curl -X POST http://localhost:3000/units/YOUR_UNIT_ID/whatsapp/connect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"evolution","credentials":{}}'
```

**Expected Response:**

```json
{
  "success": true,
  "connection": {
    "id": "...",
    "status": "qr",
    "qrCode": "data:image/png;base64,..."
  }
}
```

**Verify in DB:**

```sql
SELECT instance_id, status, status_reason
FROM unit_whatsapp_connections
WHERE unit_id = 'YOUR_UNIT_ID';
```

**Expected:**

- `instance_id` starts with `unit_`
- `status` = 'qr' OR 'connecting'
- `status_reason` = 'waiting_scan' OR 'initializing'

**Checklist:**

- [ ] Instance name pattern: `unit_<UUID>`
- [ ] Status set correctly
- [ ] QR code returned

---

### ✅ 4.2 Status Endpoint (Real-Time Updates)

**Simulate webhook (no restart needed):**

```bash
# Get webhook secret from DB first
WEBHOOK_SECRET=$(psql -c "SELECT webhook_secret FROM unit_whatsapp_connections WHERE unit_id='YOUR_UNIT_ID'" -t)

# Send connection update
curl -X POST http://localhost:3000/webhooks/whatsapp/evolution/$WEBHOOK_SECRET \
  -H "Content-Type: application/json" \
  -d '{
    "event": "connection.update",
    "instance": "unit_YOUR_UNIT_ID",
    "data": {
      "connection": "open"
    }
  }'
```

**Check status changed WITHOUT restart:**

```bash
curl http://localhost:3000/units/YOUR_UNIT_ID/whatsapp/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**

```json
{
  "status": "connected",
  "reason": "scan_completed",
  "qrCode": null,
  "connectedAt": "2026-01-22T...",
  "disconnectedAt": null
}
```

**Checklist:**

- [ ] Status changed to 'connected'
- [ ] `reason` = 'scan_completed'
- [ ] `connectedAt` timestamp set
- [ ] `qrCode` cleared (null)
- [ ] **NO backend restart needed**

---

### ✅ 4.3 Outbound Message (Retry Logic)

**Send message:**

```bash
curl -X POST http://localhost:3000/messages \
  -H "Authorization: Bearer YOUR_AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "message": "Test message",
    "clientMessageId": "test-uuid-123"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "messageId": "msg_...",
  "internalId": "...",
  "attempts": 1
}
```

**Verify in DB:**

```sql
SELECT status, retry_count, client_message_id, external_id
FROM messages
WHERE client_message_id = 'test-uuid-123';
```

**Expected:**

- `status` = 'sent' (if successful) OR 'failed' (after 3 retries)
- `retry_count` = 0 (first try) OR up to 3 (if retries)
- `client_message_id` = 'test-uuid-123'
- `external_id` = provider's message ID

**Test idempotency (send again with same clientMessageId):**

```bash
# Same request as above
```

**Expected Response:**

```json
{
  "success": true,
  "messageId": "msg_...",
  "deduplicated": true
}
```

**Checklist:**

- [ ] Message created with status 'queued'
- [ ] Status updated to 'sent' on success
- [ ] `retry_count` tracked
- [ ] Idempotency works (duplicate returns same message)

---

### ✅ 4.4 Campaign Dispatch (Sequential + Delay)

**Create campaign:**

```sql
INSERT INTO campaigns (unit_id, name, content, status)
VALUES ('YOUR_UNIT_ID', 'Test Campaign', 'Test message', 'draft')
RETURNING id;
```

**Add recipients:**

```sql
INSERT INTO campaign_recipients (campaign_id, contact_id, status)
SELECT 'CAMPAIGN_ID', id, 'pending'
FROM contacts
LIMIT 3;
```

**Dispatch:**

```bash
curl -X POST http://localhost:3000/api/campaigns/CAMPAIGN_ID/dispatch \
  -H "Authorization: Bearer YOUR_AGENT_TOKEN"
```

**Monitor (wait 7-8 seconds for 3 messages):**

```sql
SELECT status, sent_at
FROM campaign_recipients
WHERE campaign_id = 'CAMPAIGN_ID'
ORDER BY sent_at;
```

**Expected:**

- All 3 messages sent
- Time difference between messages ~2 seconds each

**Checklist:**

- [ ] Campaign status changes to 'processing' → 'completed'
- [ ] Recipients sent sequentially
- [ ] ~2 second delay between sends (verify timestamps)
- [ ] No rate limit violations from Evolution API

---

## 🚀 AUTOMATED VALIDATION

Execute o script automatizado:

```bash
node backend/scripts/release_gate.js
```

**Expected Output:**

```
=================================================
🚀 RELEASE GATE: Evolution WhatsApp Validation
=================================================

📋 SECTION 1: Database Schema Validation
✓ unit_whatsapp_connections.status_reason exists
✓ unit_whatsapp_connections.connected_at exists
✓ unit_whatsapp_connections.disconnected_at exists
✓ unit_whatsapp_connections.qr_updated_at exists
✓ messages.client_message_id exists
✓ messages.retry_count exists
✓ messages.last_retry_at exists
✓ messages.error_details exists
✓ campaigns table exists
✓ campaign_recipients table exists

📋 SECTION 2: In-Memory DB Compatibility
✓ In-memory DB has upsert shim
✓ In-memory DB basic queries work

📋 SECTION 3: Code Consistency Checks
✓ whatsappWebhook.js imports successfully
✓ messages.js imports successfully
✓ messageHandler.service.js imports successfully
✓ webhookHelper.js imports successfully

📋 SECTION 4: Evolution Flow Validation (Logic Checks)
✓ Evolution provider module loads correctly
✓ Campaign service loads correctly

=================================================
📊 VALIDATION SUMMARY
=================================================

✓ ALL CHECKS PASSED ✓

🎉 System is PRODUCTION READY!
```

**Checklist:**

- [ ] Automated script passes all checks
- [ ] Exit code = 0 (success)

---

## ❌ TROUBLESHOOTING

### If migrations are missing:

**Problem:** `✗ unit_whatsapp_connections.status_reason MISSING`

**Fix:**

1. Open Supabase SQL Editor
2. Copy `backend/db/schema_connection_improvements.sql`
3. Execute
4. Re-run validation

---

### If in-memory DB fails:

**Problem:** `✗ In-memory DB missing upsert shim`

**Fix:**
Check `backend/services/inmemoryDb.js` has:

```javascript
upsert: function(data) {
    return this.insert(data);
}
```

---

### If imports fail:

**Problem:** `✗ messages.js import error`

**Fix:**

```bash
# Check for syntax errors
node --check backend/routes/messages.js

# Check missing dependencies
npm install
```

---

## ✅ FINAL SIGN-OFF

- [ ] All database migrations applied
- [ ] All columns exist in Supabase
- [ ] All indexes created
- [ ] In-memory DB compatibility confirmed
- [ ] All modules import without errors
- [ ] Connect endpoint works (instance naming correct)
- [ ] Status updates work WITHOUT restart
- [ ] Outbound messages work with retry
- [ ] Campaign dispatch respects sequential send + delay
- [ ] Automated script passes (exit code 0)

**Status:** ☐ PASS ☐ FAIL

**Approved by:** ********\_********  
**Date:** ********\_********

---

## 🚀 NEXT STEPS AFTER PASS:

1. ✅ Merge to main
2. ✅ Deploy to staging
3. ✅ Run smoke tests
4. ✅ Monitor for 24h
5. ✅ Deploy to production

**comando:**

```bash
git add .
git commit -m "feat: Evolution WhatsApp - production ready v1.0"
git push origin main
```
