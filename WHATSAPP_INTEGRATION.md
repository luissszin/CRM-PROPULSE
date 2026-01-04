# WhatsApp Integration System - Complete Documentation

## 🎯 Overview

This is a **production-ready**, **unified WhatsApp integration system** for a multi-tenant CRM SaaS built with **Strategy Pattern** + **Factory Pattern**.

### Supported Providers
- ✅ **Z-API** - QR Code connection
- ✅ **Evolution API** - QR Code connection  
- ✅ **Meta Cloud API** - Credential-based (no QR Code)

### Key Features
- 🔒 **One WhatsApp per unit** (enforced at database level)
- 🏗️ **Strategy + Factory Pattern** for extensibility
- 🔐 **Multi-tenant isolation** with JWT validation
- 📨 **Real webhook handling** with message persistence
- 🔄 **Real-time events** via Socket.IO
- 📊 **TypeScript** for type safety

---

## 📁 Architecture

```
backend/
├── providers/
│   ├── interfaces/
│   │   └── IWhatsappProvider.ts       # Base interface
│   ├── ZapiProvider.ts                # Z-API implementation
│   ├── EvolutionProvider.ts           # Evolution API implementation
│   ├── MetaCloudProvider.ts           # Meta Cloud API implementation
│   └── WhatsappProviderFactory.ts     # Factory pattern
├── controllers/
│   ├── whatsappConnectionController.ts # Connection management
│   └── whatsappWebhookController.ts    # Webhook handling
├── routes/
│   ├── whatsappConnection.js          # Connection routes
│   └── whatsappWebhook.js             # Webhook routes
└── db/
    ├── schema.prisma                  # Prisma schema
    └── migrations/
        └── 001_create_unit_whatsapp_connections.sql
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

TypeScript dependencies are already included:
- `typescript`
- `@types/node`
- `@types/express`
- `ts-node`

### 2. Apply Database Migration

Run the migration to create the `unit_whatsapp_connections` table:

```bash
npm run db:migrate:whatsapp
```

**OR** manually run the SQL in Supabase SQL Editor:
```sql
-- Copy contents from: backend/db/migrations/001_create_unit_whatsapp_connections.sql
```

### 3. Configure Environment Variables

Add to your `.env`:

```env
# Z-API Configuration
ZAPI_BASE_URL=https://api.z-api.io
ZAPI_INSTANCE_ID=your_instance_id
ZAPI_TOKEN=your_token
ZAPI_CLIENT_TOKEN=your_client_token

# Evolution API Configuration
EVOLUTION_API_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=your_api_key

# Meta Cloud API Configuration
META_CLOUD_API_VERSION=v21.0
META_ACCESS_TOKEN=your_access_token

# API Base URL (for webhook URLs)
API_BASE_URL=https://your-domain.com
```

### 4. Start the Server

```bash
npm run dev
```

---

## 📡 API Endpoints

### Connection Management

#### 1. Connect WhatsApp

```http
POST /units/:unitId/whatsapp/connect
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "provider": "zapi" | "evolution" | "meta",
  "credentials": {
    // For Z-API:
    "instanceId": "your_instance_id",
    "apiKey": "your_token",
    "accessToken": "your_client_token",
    "apiUrl": "https://api.z-api.io"

    // For Evolution:
    "instanceId": "custom_instance_name",  // optional
    "apiKey": "your_api_key",
    "apiUrl": "http://localhost:8080"

    // For Meta:
    "accessToken": "your_access_token",
    "phoneNumberId": "your_phone_number_id",
    "businessAccountId": "your_business_account_id"
  }
}
```

**Response (Z-API/Evolution):**
```json
{
  "success": true,
  "connection": {
    "id": "uuid",
    "unitId": "uuid",
    "provider": "zapi",
    "instanceId": "instance_name",
    "status": "connecting",
    "qrCode": "data:image/png;base64,...",
    "webhookUrl": "https://your-domain.com/webhooks/whatsapp/zapi/secret"
  },
  "message": "QR Code generated. Please scan to complete connection."
}
```

**Response (Meta):**
```json
{
  "success": true,
  "connection": {
    "id": "uuid",
    "unitId": "uuid",
    "provider": "meta",
    "instanceId": "phone_number_id",
    "status": "connected",
    "qrCode": null,
    "webhookUrl": "https://your-domain.com/webhooks/whatsapp/meta/secret"
  },
  "message": "WhatsApp connected successfully"
}
```

#### 2. Get Connection Status

```http
GET /units/:unitId/whatsapp/status
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "id": "uuid",
  "unitId": "uuid",
  "provider": "evolution",
  "instanceId": "instance_name",
  "status": "connected",
  "phoneNumber": "5511999999999",
  "profileName": "My Business",
  "createdAt": "2025-12-30T12:00:00Z",
  "updatedAt": "2025-12-30T12:05:00Z"
}
```

#### 3. Get QR Code (Evolution/Z-API only)

```http
GET /units/:unitId/whatsapp/qrcode
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "qrCode": "data:image/png;base64,...",
  "status": "connecting",
  "expiresAt": "2025-12-30T12:10:00Z"
}
```

#### 4. Disconnect WhatsApp

```http
DELETE /units/:unitId/whatsapp/disconnect
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp disconnected successfully"
}
```

#### 5. Send Message

```http
POST /units/:unitId/whatsapp/send
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "phone": "5511999999999",
  "message": "Hello from CRM!",
  "mediaUrl": "https://example.com/image.jpg",  // optional
  "mediaType": "image"  // optional: image, video, document
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_123456",
  "timestamp": 1704034800000
}
```

---

## 🪝 Webhook Configuration

### Webhook URL Format

```
https://your-domain.com/webhooks/whatsapp/:provider/:secret
```

Example:
```
https://your-domain.com/webhooks/whatsapp/evolution/abc123def456
```

### Configure Webhooks in Providers

#### Z-API
1. Go to Z-API Dashboard
2. Navigate to Webhooks
3. Add webhook URL: `https://your-domain.com/webhooks/whatsapp/zapi/YOUR_SECRET`
4. Enable events: `message`, `status`

#### Evolution API
1. Configure webhook in Evolution API settings
2. Set URL: `https://your-domain.com/webhooks/whatsapp/evolution/YOUR_SECRET`
3. Enable events: `messages.upsert`, `connection.update`, `qrcode.updated`

#### Meta Cloud API
1. Go to Meta Developer Console
2. Configure WhatsApp webhook
3. Verification URL: `https://your-domain.com/webhooks/whatsapp/meta/YOUR_SECRET`
4. Verify token: Use your `webhookSecret` from database
5. Subscribe to: `messages`, `message_status`

---

## 🔐 Security

### Multi-Tenant Isolation

✅ **Database Level**: `UNIQUE` constraint on `unit_id` in `unit_whatsapp_connections`  
✅ **API Level**: `requireUnitAccess` middleware validates JWT `unitId` matches route `unitId`  
✅ **Webhook Level**: Each connection has unique `webhook_secret` for validation

### JWT Validation

All endpoints require:
1. Valid JWT token in `Authorization: Bearer <token>` header
2. User's `unitId` must match route `:unitId` parameter (except super_admin)

### Webhook Security

- **Z-API**: Validated by webhook secret in URL
- **Evolution**: Validated by webhook secret in URL
- **Meta**: Validated by `X-Hub-Signature-256` header using HMAC SHA256

---

## 🧪 Testing

### Manual Testing Flow

#### 1. Create a Unit
```bash
curl -X POST http://localhost:3000/admin/units \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Unit", "slug": "test-unit"}'
```

#### 2. Connect WhatsApp (Evolution)
```bash
curl -X POST http://localhost:3000/units/UNIT_ID/whatsapp/connect \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "evolution",
    "credentials": {
      "apiKey": "YOUR_API_KEY",
      "apiUrl": "http://localhost:8080"
    }
  }'
```

#### 3. Get QR Code
```bash
curl -X GET http://localhost:3000/units/UNIT_ID/whatsapp/qrcode \
  -H "Authorization: Bearer YOUR_JWT"
```

#### 4. Check Status
```bash
curl -X GET http://localhost:3000/units/UNIT_ID/whatsapp/status \
  -H "Authorization: Bearer YOUR_JWT"
```

#### 5. Send Message
```bash
curl -X POST http://localhost:3000/units/UNIT_ID/whatsapp/send \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "message": "Test message from CRM"
  }'
```

---

## 🐛 Troubleshooting

### TypeScript Errors

If you see TypeScript errors when starting the server:

```bash
# The controllers are in TypeScript but loaded via require()
# Node.js will handle this automatically with ts-node
# If issues persist, you can compile TypeScript first:
npx tsc
```

### Migration Fails

If automatic migration fails:

1. Open Supabase SQL Editor
2. Copy contents of `backend/db/migrations/001_create_unit_whatsapp_connections.sql`
3. Paste and execute in SQL Editor

### Webhook Not Receiving Messages

1. Check webhook URL is publicly accessible
2. Verify webhook secret matches database
3. Check provider webhook configuration
4. Review server logs for errors

### Connection Stuck in "Connecting"

1. Check QR Code is valid and not expired
2. Verify provider API is accessible
3. Check provider API credentials
4. Review provider API logs

---

## 📊 Database Schema

```sql
CREATE TABLE unit_whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL UNIQUE REFERENCES units(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('zapi', 'evolution', 'meta')),
  instance_id TEXT,
  phone_number TEXT,
  access_token TEXT,
  business_id TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  provider_config JSONB DEFAULT '{}',
  webhook_secret TEXT DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎓 Design Patterns

### Strategy Pattern

Each provider implements `IWhatsappProvider` interface:

```typescript
interface IWhatsappProvider {
  createInstance(unitId: string, credentials: any): Promise<CreateInstanceResponse>;
  getQrCode(instanceId: string): Promise<QrCodeResponse>;
  getStatus(instanceId: string): Promise<ConnectionStatus>;
  disconnect(instanceId: string): Promise<void>;
  sendTextMessage(...): Promise<SendMessageResponse>;
  sendMediaMessage(...): Promise<SendMessageResponse>;
  handleWebhook(payload: any): Promise<WebhookResult>;
  validateWebhook(...): boolean;
}
```

### Factory Pattern

```typescript
WhatsappProviderFactory.createProvider('zapi')     // Returns ZapiProvider
WhatsappProviderFactory.createProvider('evolution') // Returns EvolutionProvider
WhatsappProviderFactory.createProvider('meta')      // Returns MetaCloudProvider
```

---

## 🚀 Next Steps

1. ✅ Apply database migration
2. ✅ Configure environment variables
3. ✅ Test connection flow with one provider
4. ✅ Configure webhooks in provider dashboard
5. ✅ Test message sending and receiving
6. ✅ Deploy to production
7. ✅ Update frontend to use new endpoints

---

## 📝 Notes

- **One WhatsApp per unit**: Enforced by `UNIQUE` constraint on `unit_id`
- **Provider extensibility**: Add new providers by implementing `IWhatsappProvider`
- **Type safety**: TypeScript interfaces ensure consistency across providers
- **Real-time updates**: Socket.IO emits events to `unit:${unitId}` room
- **Message persistence**: All incoming messages saved to `messages` table
- **Conversation tracking**: Auto-creates conversations and links to contacts

---

## 🤝 Support

For issues or questions:
1. Check this documentation
2. Review server logs
3. Check provider API documentation
4. Verify database schema is applied correctly
