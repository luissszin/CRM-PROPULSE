# 🚀 WhatsApp Integration - Installation Guide

## Step 1: Apply Database Migration

Since you're using Supabase, you need to run the migration manually in the SQL Editor.

### Option A: Via Supabase Dashboard (RECOMMENDED)

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `APPLY_MIGRATION.sql` (in the root directory)
5. Paste into the SQL Editor
6. Click **Run**
7. You should see: "unit_whatsapp_connections table created successfully!"

### Option B: Via Supabase CLI

```bash
supabase db push
```

---

## Step 2: Verify Migration

Run this query in Supabase SQL Editor:

```sql
SELECT * FROM unit_whatsapp_connections;
```

You should see an empty table with all columns.

---

## Step 3: Configure Environment Variables

Add these to your `.env` file:

```env
# Choose ONE provider to start with

# Option 1: Evolution API (Self-hosted, Free)
EVOLUTION_API_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=your_api_key

# Option 2: Z-API (Paid service)
ZAPI_BASE_URL=https://api.z-api.io
ZAPI_INSTANCE_ID=your_instance_id
ZAPI_TOKEN=your_token
ZAPI_CLIENT_TOKEN=your_client_token

# Option 3: Meta Cloud API (Free tier available)
META_CLOUD_API_VERSION=v21.0
META_ACCESS_TOKEN=your_access_token

# Required for webhook URLs
API_BASE_URL=https://your-domain.com
```

---

## Step 4: Restart Backend Server

The backend is already running, but you need to restart it to load the new routes:

1. Go to the terminal running `npm run dev`
2. Press `Ctrl+C` to stop
3. Run `npm run dev` again

You should see:
```
🚀 Backend rodando na porta 3000
```

---

## Step 5: Test the Integration

### Get Your JWT Token

First, login to get a JWT token:

```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your_email@example.com",
    "password": "your_password"
  }'
```

Save the `accessToken` from the response.

### Test Connection Endpoint

```bash
# Replace with your actual values
TOKEN="your_jwt_token"
UNIT_ID="your_unit_id"

# Test with Evolution API
curl -X POST http://localhost:3000/units/$UNIT_ID/whatsapp/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "evolution",
    "credentials": {
      "apiKey": "YOUR_EVOLUTION_API_KEY",
      "apiUrl": "http://localhost:8080"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "connection": {
    "id": "uuid",
    "unitId": "uuid",
    "provider": "evolution",
    "instanceId": "unit_xxx",
    "status": "connecting",
    "qrCode": "data:image/png;base64,...",
    "webhookUrl": "https://your-domain.com/webhooks/whatsapp/evolution/secret"
  },
  "message": "QR Code generated. Please scan to complete connection."
}
```

---

## Step 6: Configure Webhooks

### For Evolution API

1. Access your Evolution API dashboard
2. Go to Webhook settings
3. Set webhook URL to: `https://your-domain.com/webhooks/whatsapp/evolution/YOUR_SECRET`
   - Get `YOUR_SECRET` from the database or from the connection response
4. Enable these events:
   - `messages.upsert`
   - `connection.update`
   - `qrcode.updated`

### For Z-API

1. Go to Z-API Dashboard
2. Navigate to Webhooks section
3. Add webhook URL: `https://your-domain.com/webhooks/whatsapp/zapi/YOUR_SECRET`
4. Enable events: `message`, `status`

### For Meta Cloud API

1. Go to Meta Developer Console
2. Select your app
3. Go to WhatsApp → Configuration
4. Set webhook URL: `https://your-domain.com/webhooks/whatsapp/meta/YOUR_SECRET`
5. Verify token: Use your `webhookSecret` from database
6. Subscribe to: `messages`, `message_status`

---

## Step 7: Verify Everything Works

### Check Database

```sql
-- Check connection was created
SELECT * FROM unit_whatsapp_connections;

-- You should see one row with status 'connecting' or 'connected'
```

### Send a Test Message

```bash
curl -X POST http://localhost:3000/units/$UNIT_ID/whatsapp/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "message": "Hello from CRM! 🚀"
  }'
```

### Receive a Message

1. Send a WhatsApp message TO your connected number
2. Check the database:

```sql
SELECT m.*, c.phone, conv.unit_id 
FROM messages m
JOIN conversations conv ON m.conversation_id = conv.id
JOIN contacts c ON conv.contact_id = c.id
ORDER BY m.created_at DESC
LIMIT 5;
```

You should see the received message!

---

## 🎉 Success Checklist

- [ ] Migration applied successfully
- [ ] Environment variables configured
- [ ] Backend server restarted
- [ ] Connection endpoint tested
- [ ] QR Code generated (for Evolution/Z-API)
- [ ] Status shows "connected"
- [ ] Test message sent successfully
- [ ] Webhook configured in provider
- [ ] Incoming message received
- [ ] Message persisted to database

---

## 🐛 Troubleshooting

### "Table already exists"
✅ This is fine! It means the migration was already applied.

### "Cannot find module" errors
Run: `npm install`

### "Authorization required"
Make sure you're sending the JWT token in the `Authorization: Bearer TOKEN` header.

### "Access denied to this unit"
Your JWT token's `unitId` doesn't match the `:unitId` in the URL. Make sure you're using the correct unit ID.

### Webhook not receiving messages
1. Make sure your webhook URL is publicly accessible (use ngrok for local testing)
2. Verify the webhook secret matches the database
3. Check provider webhook configuration
4. Review server logs for errors

---

## 📚 Next Steps

1. **Update Frontend** to use the new endpoints
2. **Configure Production Webhooks** with your production domain
3. **Test with Real Users** in a staging environment
4. **Monitor Logs** for any errors
5. **Set up Alerts** for webhook failures

---

## 📖 Documentation

- [WHATSAPP_INTEGRATION.md](file:///c:/Users/jogod/crm-backend/WHATSAPP_INTEGRATION.md) - Complete API documentation
- [WHATSAPP_QUICKSTART.md](file:///c:/Users/jogod/crm-backend/WHATSAPP_QUICKSTART.md) - Quick reference guide
- [APPLY_MIGRATION.sql](file:///c:/Users/jogod/crm-backend/APPLY_MIGRATION.sql) - SQL migration file

---

## 🆘 Need Help?

Check the documentation files above or review the server logs for detailed error messages.
