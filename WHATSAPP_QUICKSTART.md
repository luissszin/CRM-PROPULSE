# WhatsApp Integration - Quick Reference

## 🚀 Quick Start Commands

```bash
# 1. Apply database migration
npm run db:migrate:whatsapp

# 2. Restart server (if needed)
npm run dev

# 3. Test connection (replace variables)
curl -X POST http://localhost:3000/units/UNIT_ID/whatsapp/connect \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"evolution","credentials":{"apiKey":"YOUR_KEY"}}'
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/units/:unitId/whatsapp/connect` | Connect WhatsApp |
| GET | `/units/:unitId/whatsapp/status` | Get connection status |
| GET | `/units/:unitId/whatsapp/qrcode` | Get QR Code |
| DELETE | `/units/:unitId/whatsapp/disconnect` | Disconnect |
| POST | `/units/:unitId/whatsapp/send` | Send message |
| POST | `/webhooks/whatsapp/:provider/:secret` | Webhook endpoint |

## 🔑 Environment Variables

```env
# Z-API
ZAPI_BASE_URL=https://api.z-api.io
ZAPI_INSTANCE_ID=your_instance
ZAPI_TOKEN=your_token
ZAPI_CLIENT_TOKEN=your_client_token

# Evolution API
EVOLUTION_API_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=your_key

# Meta Cloud API
META_CLOUD_API_VERSION=v21.0
META_ACCESS_TOKEN=your_token

# General
API_BASE_URL=https://your-domain.com
```

## 📦 Provider Comparison

| Feature | Z-API | Evolution | Meta |
|---------|-------|-----------|------|
| QR Code | ✅ Yes | ✅ Yes | ❌ No |
| Credentials | Token + Client Token | API Key | Access Token + Phone ID |
| Self-Hosted | ❌ No | ✅ Yes | ❌ No |
| Free Tier | ❌ No | ✅ Yes | ✅ Yes (limited) |
| Business Features | ✅ Yes | ⚠️ Limited | ✅ Yes |

## 🔄 Connection Flow

### Evolution/Z-API
1. POST `/units/:id/whatsapp/connect` → Get QR Code
2. Scan QR Code with WhatsApp
3. Webhook updates status to `connected`
4. Ready to send/receive messages

### Meta Cloud API
1. POST `/units/:id/whatsapp/connect` with credentials
2. Immediate `connected` status
3. Configure webhook in Meta Dashboard
4. Ready to send/receive messages

## 🧪 Testing Checklist

- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Server restarted
- [ ] Connection successful
- [ ] QR Code generated (Evolution/Z-API)
- [ ] Status shows `connected`
- [ ] Message sent successfully
- [ ] Webhook configured
- [ ] Message received via webhook
- [ ] Message persisted to database

## 🐛 Common Issues

### "Connection not found"
→ Check webhook secret matches database

### "Access denied to this unit"
→ JWT token's unitId doesn't match route unitId

### "Unit already has a WhatsApp connection"
→ Disconnect existing connection first

### TypeScript errors
→ Run `npx tsc` or ignore (ts-node handles it)

### Webhook not receiving
→ Check URL is publicly accessible
→ Verify webhook secret
→ Check provider webhook config

## 📁 Key Files

```
backend/
├── providers/
│   ├── ZapiProvider.ts
│   ├── EvolutionProvider.ts
│   ├── MetaCloudProvider.ts
│   └── WhatsappProviderFactory.ts
├── controllers/
│   ├── whatsappConnectionController.ts
│   └── whatsappWebhookController.ts
├── routes/
│   ├── whatsappConnection.js
│   └── whatsappWebhook.js
└── db/migrations/
    └── 001_create_unit_whatsapp_connections.sql
```

## 🔐 Security

✅ JWT authentication required  
✅ Unit access validation  
✅ Webhook secret validation  
✅ UNIQUE constraint on unit_id  
✅ No cross-tenant access  

## 📊 Database

```sql
-- Check connections
SELECT * FROM unit_whatsapp_connections;

-- Check messages
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;

-- Get webhook secret
SELECT webhook_secret FROM unit_whatsapp_connections 
WHERE unit_id = 'your_unit_id';
```

## 🎯 Next Steps

1. Apply migration: `npm run db:migrate:whatsapp`
2. Configure environment variables
3. Test connection with one provider
4. Configure webhook in provider dashboard
5. Test message sending/receiving
6. Update frontend to use new endpoints
7. Deploy to production

## 📚 Documentation

- [WHATSAPP_INTEGRATION.md](file:///c:/Users/jogod/crm-backend/WHATSAPP_INTEGRATION.md) - Complete API reference
- [walkthrough.md](file:///C:/Users/jogod/.gemini/antigravity/brain/15a1da49-38cf-4d0a-9e10-81834f64e2ed/walkthrough.md) - Implementation details
- [task.md](file:///C:/Users/jogod/.gemini/antigravity/brain/15a1da49-38cf-4d0a-9e10-81834f64e2ed/task.md) - Task breakdown
