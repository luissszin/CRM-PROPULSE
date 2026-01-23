# CRM Propulse - Backend

Multi-tenant CRM with Evolution WhatsApp Integration

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Apply database schema
# Copy SQL files to Supabase SQL Editor:
# - backend/db/schema.sql
# - backend/db/schema_connection_improvements.sql
# - backend/db/schema_outbound_improvements.sql
# - backend/db/schema_campaigns.sql

# 4. Start development server
npm run dev:backend

# 5. Run tests
npm test
```

## 📋 Features

### WhatsApp Integration (Evolution API)

- ✅ QR Code connection
- ✅ Real-time status tracking (qr → connecting → connected)
- ✅ Bidirectional messaging (inbound/outbound)
- ✅ Message status (delivered, read, failed)
- ✅ Idempotency (inbound + outbound)
- ✅ Retry logic with exponential backoff
- ✅ Campaign batch sending with rate limiting

### Multi-Tenant

- ✅ Unit-based isolation
- ✅ Role-based access control (super_admin, unit_admin, agent)
- ✅ Webhook routing per unit

### Security

- ✅ JWT authentication
- ✅ Rate limiting (API, login, webhooks)
- ✅ Secret masking in logs
- ✅ Phone number masking
- ✅ Error sanitization

## 🗂️ Project Structure

```
backend/
├── config/           # Environment configuration
├── db/               # Database schemas (SQL)
├── middleware/       # Auth, rate limiting, logging
├── routes/           # API endpoints
├── services/         # Business logic
│   ├── whatsapp/     # WhatsApp integration
│   │   ├── providers/  # Evolution, Meta, Zapi
│   │   └── messageHandler.service.js
│   ├── campaignService.js
│   └── supabaseService.js
├── utils/            # Helpers (phone, logger, webhookHelper)
├── tests/            # E2E tests
└── serve.js          # Main entry point
```

## 🔌 API Endpoints

### Authentication

```
POST /admin/login
POST /admin/refresh
```

### WhatsApp Connection

```
POST   /units/:unitId/whatsapp/connect  # Generate QR
GET    /units/:unitId/whatsapp/status   # Check status
GET    /units/:unitId/whatsapp/qrcode   # Force QR refresh
DELETE /units/:unitId/whatsapp/disconnect
POST   /units/:unitId/whatsapp/send     # Send message (deprecated, use /messages)
```

### Messages

```
POST /messages  # Send outbound message
{
  "phone": "5511999999999",
  "message": "Hello!",
  "clientMessageId": "optional-uuid"  // For idempotency
}
```

### Campaigns

```
GET  /api/campaigns            # List campaigns
POST /api/campaigns            # Create campaign
GET  /api/campaigns/:id        # Get details
POST /api/campaigns/:id/dispatch  # Start sending
```

### Webhooks

```
POST /webhooks/whatsapp/:provider/:secret  # Evolution, Meta, Zapi
```

## 🗄️ Database Schema

### Core Tables

- `units` - Tenants
- `users` - Authentication
- `contacts` - WhatsApp contacts
- `conversations` - Chat threads
- `messages` - Message history

### WhatsApp

- `unit_whatsapp_connections` - Instance mapping
  - `status_reason` - waiting_scan, scan_completed, disconnected
  - `connected_at`, `disconnected_at`, `qr_updated_at`

### Campaigns

- `campaigns` - Campaign metadata
- `campaign_recipients` - Per-recipient tracking

### Message Fields

- `client_message_id` - Frontend UUID for idempotency
- `external_id` - Provider message ID
- `provider` - evolution, meta, zapi
- `retry_count` - Send attempts (max 3)
- `status` - queued, sent, delivered, read, failed

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
# Complete evolution flow (9 scenarios)
$env:NODE_ENV='test'
node --test backend/tests/evolution_complete_e2e.test.js
```

### Test Coverage

- Connection flow (QR → Connected)
- Inbound messages
- Outbound messages with retry
- Dedupe (inbound + outbound)
- Campaigns
- Unknown instance handling
- Multi-tenant isolation

## 🔐 Environment Variables

See `.env.example` for full list.

**Critical:**

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - Database
- `JWT_ACCESS_SECRET` - Authentication
- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` - WhatsApp provider
- `BASE_URL` - For webhook registration

**Optional:**

- `PORT` - Default: 3000
- `NODE_ENV` - production | development | test
- `ENABLE_TEST_BYPASS` - NEVER 'true' in production

## 📦 Dependencies

### Core

- `express` - Web framework
- `@supabase/supabase-js` - Database client
- `socket.io` - Real-time events
- `jsonwebtoken` - Authentication
- `bcrypt` - Password hashing

### WhatsApp

- `axios` - HTTP client for Evolution API
- Custom providers for Evolution, Meta, Zapi

### Security

- `express-rate-limit` - Rate limiting
- `cors` - CORS handling

## 🚀 Deployment

### Staging

```bash
git push staging main
# Migrations auto-applied
# Restart: Railway, Render, Heroku
```

### Production

```bash
# 1. Merge to main
git merge feature/whatsapp-evolution
git push origin main

# 2. Apply database migrations (Supabase SQL Editor)
# Execute SQL files in order

# 3. Deploy
# Via Railway, Render, Vercel, etc.

# 4. Smoke test
curl https://your-domain.com/health
```

## 📊 Monitoring

### Key Metrics

- Webhook success rate: > 99%
- Unknown instance rate: 0%
- Outbound retry rate: < 5%
- Message dedupe rate: 1-3% (normal)

### Logs

```bash
# Errors
grep -i "error" logs/app.log

# Unknown instances (should be zero)
grep "unknown_instance" logs/app.log

# Verify masking
grep "MASKED" logs/app.log
```

## 🐛 Troubleshooting

### QR Code Not Appearing

1. Check Evolution API is running: `docker ps | grep evolution`
2. Verify `EVOLUTION_API_URL` in `.env`
3. Check logs for connection errors

### Webhook Not Receiving Messages

1. Verify `BASE_URL` is correct (must be public HTTPS in production)
2. Check Evolution instance webhook is set
3. Look for "unknown_instance" in logs

### Messages Not Sending

1. Check connection status: `GET /units/:id/whatsapp/status`
2. Verify Evolution API is reachable
3. Check message retry logs

## 📚 Documentation

- `docs/PLAN.md` - Implementation plan
- `docs/RELEASE_CANDIDATE.md` - Release notes (FASE 1)
- `docs/FASE_3_5_COMPLETE.md` - FASE 3+5 details
- `docs/ROLLBACK.md` - Rollback procedures

## 🤝 Contributing

1. Create feature branch
2. Implement changes
3. Add tests
4. Update documentation
5. Submit PR

## 📄 License

MIT

## 🆘 Support

Issues: https://github.com/your-org/crm-backend/issues
Docs: https://docs.your-domain.com
