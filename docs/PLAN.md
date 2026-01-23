# Evolution WhatsApp Integration Plan

## 1. Architecture Overview

- **Goal**: Fully operational WhatsApp integration using Evolution API.
- **Tenant Isolation**:
  - Each CRM `unit_id` maps to a unique Evolution `instance_name` (Format: `unit_<UUID>`).
  - All data (contacts, conversations, messages) must be scoped by `unit_id`.
- **Webhook Handling**:
  - Single endpoint: `/webhooks/whatsapp/evolution/:secret`.
  - Dispatches events based on `instance` -> `unit_id` lookups.
  - Handles `MESSAGES_UPSERT`, `CONNECTION_UPDATE`, `QRCODE_UPDATED`.

## 2. Database Schema Details

### 2.1. Updates to `messages`

- Ensure `provider` column exists (enum: 'evolution', 'meta', 'zapi').
- Ensure `external_id` is indexed for idempotency lookups.

### 2.2. New Tables for Campaigns

```sql
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft', -- draft, scheduled, processing, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id), -- Linked message after sending
  status TEXT DEFAULT 'pending', -- pending, sent, failed, delivered, read
  error_message TEXT,
  sent_at TIMESTAMPTZ
);
```

## 3. Implementation Phases

### Phase 1: Foundation (Database & Shared Services)

- **Agent**: `database-architect`
- **Tasks**:
  1. Apply schema changes for campaigns.
  2. Verify implementation of `unit_whatsapp_connections`.
  3. Create DB indexes.

### Phase 2: Connection Flow (QR & Status)

- **Agent**: `integration-engineer`
- **Tasks**:
  1. Implement `EvolutionService.createInstance(unitId)`.
  2. Implement `EvolutionService.connect(unitId)`.
  3. API Endpoint: `POST /units/:unitId/whatsapp/connect`.
  4. API Endpoint: `GET /units/:unitId/whatsapp/status`.
  5. Handle `qrcode.updated` webhook -> update DB `qr_code` field.
  6. Handle `connection.update` webhook -> update DB `status`.

### Phase 3: Inbound & Outbound Messaging

- **Agent**: `backend-specialist`
- **Tasks**:
  1. Refine `MessageHandlerService` for strict idempotency (Provider + External ID).
  2. Implement `EvolutionService.sendMessage(unitId, phone, content)`.
  3. API Endpoint: `POST /units/:unitId/whatsapp/messages` (Outbound).
  4. Webhook: Map incoming `remoteJid` to `contacts` and `conversations`.

### Phase 4: Campaigns MVP

- **Agent**: `backend-specialist`
- **Tasks**:
  1. Create `CampaignService.create(data)`.
  2. Create `CampaignService.dispatch(campaignId)` (Simple Batch Worker).
  3. Worker Logic:
     - Fetch pending recipients.
     - Loop with `Promise.all` + rate limit (e.g., 1 msg/2s).
     - Update `campaign_recipients` status.

### Phase 5: Testing & Verification

- **Agent**: `test-engineer`
- **Tasks**:
  1. **E2E Test Suite (`backend/tests/evolution_e2e.test.js`)**:
     - Mock Evolution API (nock or custom mock server).
     - Test Flow: Connect -> QR -> Inbound -> Outbound -> Campaign.
  2. **Security Audit**:
     - Verify Webhook Secret validation.
     - Verify Rate Limits.

## 4. Verification Checklist

- [ ] QR Code appears in frontend.
- [ ] Status changes to "Conectado" upon scan.
- [ ] Inbound message appears in CRM Chat.
- [ ] Outbound message is delivered to phone.
- [ ] Campaign sends to 3 recipients successfully.
- [ ] **Production**: `curl` commands pass.
