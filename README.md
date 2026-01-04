# CRM Backend (Multi-Tenant)

Powerful, secure, and scalable CRM backend built with Node.js, Express, and Supabase.

## 🚀 Features

### Core

- **Multi-Tenant Architecture**: Strict data isolation per unit (Tenant).
- **Authentication**: JWT-based auth (Access + Refresh Tokens).
- **RBAC**: Role-based access control (Super Admin, Admin, Agent).
- **Scalable**: Built for high-throughput messaging.

### 💬 WhatsApp Integration (Multi-Provider)

- **Unified API**: Single interface for Evolution API, Z-API, and Meta Cloud API.
- **Real-time Status**: Polling and Webhook updates for connection state.
- **Security**: HMAC Signature validation for webhooks.

### 🤖 Intelligence & Automation

- **Automation Engine**: Rule-based triggers (`lead_created`, `message_received`) and actions (`send_message`, `change_stage`).
- **Lead Scoring**: Automatic scoring based on engagement and status.
- **AI Service**: Prepared for integration with OpenAI for smart replies and summarization.

### 📊 Observability

- **Metrics**: Tracks `messages_sent`, `leads_created`, `api_requests`, and errors per unit per day.
- **Performance**: Buffered metrics flushing (30s interval) to minimize DB load.
- **Logs**: Centralized logger facade.
- **Health Check**: `/health` endpoint for orchestration.

## 🛠️ Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` and fill in credentials.

3. **Database Setup**
   Ensure Supabase tables are created (Lead, Contact, Unit, etc.).
   Run SQL migrations from `backend/db/migrations/`.

4. **Run Server**

   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 🧪 Testing

- **Unit & Integration Tests**: `npm test`
- **Security Validation**: `node tests/validate_security.js`

## 🔒 Security

- **Strict Isolation**: Middleware `requireUnitContext` enforces tenant boundaries.
- **Rate Limiting**: API and Login endpoints are rate-limited.
- **Payload Validation**: Zod schemas used on critical inputs.

## 📂 Project Structure

- `backend/routes`: API Endpoints
- `backend/services`: Core Business Logic (WhatsApp, AI, Metrics)
- `backend/middleware`: Auth, Rate Limiters, Context
- `backend/db`: Migrations and Schema
