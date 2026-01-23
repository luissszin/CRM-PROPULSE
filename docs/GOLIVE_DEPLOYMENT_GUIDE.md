# 🚀 GO-LIVE DEPLOYMENT GUIDE

# Evolution WhatsApp Integration - Production Deploy

## ============================================================

## SECTION 1: LOCAL VALIDATION (Before Deploy)

## ============================================================

### Windows PowerShell Commands

```powershell
# 1. Set environment for testing
$env:NODE_ENV='test'
$env:JWT_ACCESS_SECRET='test-secret-key-for-jwt'
$env:ENABLE_TEST_BYPASS='true'

# 2. Run Release Gate Validation (23 checks)
Write-Host "`n🚦 Running Release Gate..." -ForegroundColor Cyan
node backend/scripts/release_gate.js

# Expected Output:
# ✓ ALL CHECKS PASSED ✓
# 🎉 System is PRODUCTION READY!
# Exit Code: 0

# 3. Run E2E Tests (9 scenarios)
Write-Host "`n🧪 Running E2E Tests..." -ForegroundColor Cyan
node --test backend/tests/evolution_complete_e2e.test.js

# Expected Output:
# ✓ 1. Should connect WhatsApp and generate QR code
# ✓ 2. Should update status to connected when QR is scanned
# ✓ 3. Should receive inbound message and create contact/conversation/message
# ✓ 4. Should deduplicate repeated inbound message
# ✓ 5. Should send outbound message with client_message_id and retry
# ✓ 6. Should dispatch campaign with sequential sending and rate limit
# ✓ 7. Should reject webhook with invalid provider
# ✓ 8. Should handle unknown instance gracefully (200 + log)
# ✓ BONUS: Should enforce multi-tenant isolation
# ✓ Evolution WhatsApp E2E - 100% Coverage (15-20s)
# 9 tests passed

# 4. Verify no test mode leaks in code
Write-Host "`n🔍 Checking for production safety..." -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.js | Select-String "ENABLE_TEST_BYPASS.*true" | Where-Object { $_.Line -notmatch "process.env" }

# Expected: No results (all bypasses are env-based)

# 5. Check for hardcoded secrets
Get-ChildItem backend -Recurse -Include *.js | Select-String -Pattern "(password|secret|key)\s*=\s*['\"]" | Where-Object { $_.Line -notmatch "process.env" -and $_.Line -notmatch "// " }

# Expected: No hardcoded secrets found
```

### Linux/Mac Bash Commands

```bash
#!/bin/bash

# 1. Set environment for testing
export NODE_ENV='test'
export JWT_ACCESS_SECRET='test-secret-key-for-jwt'
export ENABLE_TEST_BYPASS='true'

# 2. Run Release Gate Validation
echo -e "\n🚦 Running Release Gate..."
node backend/scripts/release_gate.js

# Expected Exit Code: 0

# 3. Run E2E Tests
echo -e "\n🧪 Running E2E Tests..."
node --test backend/tests/evolution_complete_e2e.test.js

# Expected: 9 tests passed

# 4. Verify production safety
echo -e "\n🔍 Checking for production safety..."
grep -r "ENABLE_TEST_BYPASS.*true" backend --include="*.js" | grep -v "process.env" || echo "✓ No test bypasses in code"

# 5. Check for hardcoded secrets
grep -rE "(password|secret|key)\s*=\s*['\"]" backend --include="*.js" | grep -v "process.env" | grep -v "//" || echo "✓ No hardcoded secrets"
```

## ============================================================

## SECTION 2: SUPABASE MIGRATIONS (Production Database)

## ============================================================

### Step 1: Copy SQL Migration Block

```powershell
# Open migration file
code backend/db/PRODUCTION_MIGRATION_GOLIVE.sql
```

### Step 2: Execute in Supabase

**Instructions:**

1. Open Supabase Dashboard → SQL Editor
2. Create new query
3. Copy ENTIRE contents of `PRODUCTION_MIGRATION_GOLIVE.sql`
4. Paste into SQL Editor
5. Click **RUN** button
6. Review output - should see:
   ```
   ✅ ALL MIGRATIONS APPLIED SUCCESSFULLY!
   ✅ System is ready for Evolution WhatsApp integration
   ```

### Step 3: Manual Verification (If Automated Summary Fails)

```sql
-- Run these queries individually in Supabase SQL Editor

-- 1. Check connection columns (Expected: 4 rows)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'unit_whatsapp_connections'
  AND column_name IN ('status_reason', 'connected_at', 'disconnected_at', 'qr_updated_at');

-- 2. Check message columns (Expected: 4 rows)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name IN ('client_message_id', 'retry_count', 'last_retry_at', 'error_details');

-- 3. Check indexes (Expected: 3+ rows)
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('unit_whatsapp_connections', 'messages')
  AND (indexname LIKE '%client_message_id%'
   OR indexname LIKE '%instance_lookup%'
   OR indexname LIKE '%retry_failed%');

-- 4. Check campaign tables (Expected: 2 rows)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('campaigns', 'campaign_recipients');
```

**Expected Results:**

- ✅ 4 columns in unit_whatsapp_connections
- ✅ 4 columns in messages
- ✅ 3+ indexes created
- ✅ 2 campaign tables exist

## ============================================================

## SECTION 3: DEPLOY CODE

## ============================================================

### Pre-Deploy Checklist

- [ ] Local tests passed (release_gate.js + E2E)
- [ ] Supabase migrations applied and verified
- [ ] `.env` configured for production:
  - [ ] `NODE_ENV=production`
  - [ ] `ENABLE_TEST_BYPASS=false` (or not set)
  - [ ] `EVOLUTION_API_URL` set
  - [ ] `EVOLUTION_API_KEY` set
  - [ ] `JWT_ACCESS_SECRET` set (strong random string)
  - [ ] `BASE_URL` set (HTTPS URL)
  - [ ] `SUPABASE_URL` set
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` set

### Deploy Commands

```powershell
# PowerShell

# 1. Commit all changes
git add .
git commit -m "feat: Evolution WhatsApp integration v1.0 - GOLIVE"

# 2. Tag release
git tag -a v1.0.0-whatsapp -m "Evolution WhatsApp integration production release"

# 3. Push to production
git push origin main
git push origin v1.0.0-whatsapp

# 4. Deploy (Railway example - adjust for your platform)
# Railway: Push triggers auto-deploy
# OR manual deploy:
# railway up
```

```bash
# Bash

# 1. Commit all changes
git add .
git commit -m "feat: Evolution WhatsApp integration v1.0 - GOLIVE"

# 2. Tag release
git tag -a v1.0.0-whatsapp -m "Evolution WhatsApp integration production release"

# 3. Push to production
git push origin main
git push origin v1.0.0-whatsapp

# 4. Deploy (adjust for your platform)
# Example: railway up
```

## ============================================================

## SECTION 4: SMOKE TEST (Production)

## ============================================================

### Prerequisites

Set these variables (replace with your actual values):

```powershell
# PowerShell
$API_URL = "https://your-production-domain.com"
$ADMIN_EMAIL = "admin@example.com"
$ADMIN_PASSWORD = "your-secure-password"
```

```bash
# Bash
export API_URL="https://your-production-domain.com"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="your-secure-password"
```

### Smoke Test Commands

#### Option A: With jq (JSON parsing)

```bash
#!/bin/bash
# Requires: jq installed (brew install jq / apt install jq)

API_URL="https://your-production-domain.com"

# 1. Health Check
echo "1️⃣ Testing Health Endpoint..."
curl -s "$API_URL/health" | jq .
# Expected: {"status":"ok","uptime":...}

# 2. Admin Login
echo -e "\n2️⃣ Logging in as admin..."
TOKEN=$(curl -s -X POST "$API_URL/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | jq -r '.accessToken')

echo "Token obtained: ${TOKEN:0:20}..."

# 3. Get Units (List)
echo -e "\n3️⃣ Fetching units..."
UNIT_ID=$(curl -s "$API_URL/admin/units" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.[0].id')

echo "Unit ID: $UNIT_ID"

# 4. Connect WhatsApp (Generate QR)
echo -e "\n4️⃣ Connecting WhatsApp..."
QR_RESPONSE=$(curl -s -X POST "$API_URL/units/$UNIT_ID/whatsapp/connect" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"evolution","credentials":{}}')

echo "$QR_RESPONSE" | jq .
# Expected: {"success":true,"connection":{"status":"qr","qrCode":"data:image/png..."}}

# 5. Check Status (Before QR Scan)
echo -e "\n5️⃣ Checking WhatsApp status..."
curl -s "$API_URL/units/$UNIT_ID/whatsapp/status" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
# Expected: {"status":"qr","reason":"waiting_scan",...}

echo -e "\n⏸️  PAUSE: Scan the QR code with WhatsApp now, then press Enter to continue..."
read

# 6. Check Status (After QR Scan)
echo -e "\n6️⃣ Checking status after scan..."
STATUS_RESPONSE=$(curl -s "$API_URL/units/$UNIT_ID/whatsapp/status" \
  -H "Authorization: Bearer $TOKEN")

echo "$STATUS_RESPONSE" | jq .
# Expected: {"status":"connected","reason":"scan_completed",...}

CONNECTION_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
if [ "$CONNECTION_STATUS" = "connected" ]; then
    echo "✅ WhatsApp connected successfully!"
else
    echo "❌ WhatsApp not connected. Status: $CONNECTION_STATUS"
    exit 1
fi

# 7. Send Test Message
echo -e "\n7️⃣ Sending test message..."
MESSAGE_RESPONSE=$(curl -s -X POST "$API_URL/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"5511999999999","message":"🚀 GO-LIVE test from production!","clientMessageId":"golive-test-'$(date +%s)'"}')

echo "$MESSAGE_RESPONSE" | jq .
# Expected: {"success":true,"messageId":"msg_..."}

MESSAGE_SUCCESS=$(echo "$MESSAGE_RESPONSE" | jq -r '.success')
if [ "$MESSAGE_SUCCESS" = "true" ]; then
    echo "✅ Message sent successfully!"
else
    echo "❌ Message send failed"
    exit 1
fi

echo -e "\n✅✅✅ ALL SMOKE TESTS PASSED! ✅✅✅"
```

#### Option B: Without jq (Plain curl)

```powershell
# PowerShell (no external tools needed)

$API_URL = "https://your-production-domain.com"

# 1. Health Check
Write-Host "`n1️⃣ Testing Health Endpoint..." -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "$API_URL/health"
Write-Host "Status: $($health.status)" -ForegroundColor Green

# 2. Admin Login
Write-Host "`n2️⃣ Logging in as admin..." -ForegroundColor Cyan
$loginBody = @{
    email = $env:ADMIN_EMAIL
    password = $env:ADMIN_PASSWORD
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$API_URL/admin/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody

$TOKEN = $loginResponse.accessToken
Write-Host "Token obtained: $($TOKEN.Substring(0,20))..." -ForegroundColor Green

# 3. Get Units
Write-Host "`n3️⃣ Fetching units..." -ForegroundColor Cyan
$units = Invoke-RestMethod -Uri "$API_URL/admin/units" `
    -Headers @{Authorization="Bearer $TOKEN"}

$UNIT_ID = $units[0].id
Write-Host "Unit ID: $UNIT_ID" -ForegroundColor Green

# 4. Connect WhatsApp
Write-Host "`n4️⃣ Connecting WhatsApp..." -ForegroundColor Cyan
$connectBody = @{
    provider = "evolution"
    credentials = @{}
} | ConvertTo-Json

$connectResponse = Invoke-RestMethod -Uri "$API_URL/units/$UNIT_ID/whatsapp/connect" `
    -Method POST `
    -Headers @{Authorization="Bearer $TOKEN"} `
    -ContentType "application/json" `
    -Body $connectBody

Write-Host "QR Code: $($connectResponse.connection.qrCode.Substring(0,50))..." -ForegroundColor Yellow

# 5. Check Status (Before Scan)
Write-Host "`n5️⃣ Checking WhatsApp status..." -ForegroundColor Cyan
$status1 = Invoke-RestMethod -Uri "$API_URL/units/$UNIT_ID/whatsapp/status" `
    -Headers @{Authorization="Bearer $TOKEN"}

Write-Host "Status: $($status1.status), Reason: $($status1.reason)" -ForegroundColor Yellow

# Manual pause
Write-Host "`n⏸️  PAUSE: Scan the QR code with WhatsApp, then press Enter..." -ForegroundColor Magenta
Read-Host

# 6. Check Status (After Scan)
Write-Host "`n6️⃣ Checking status after scan..." -ForegroundColor Cyan
$status2 = Invoke-RestMethod -Uri "$API_URL/units/$UNIT_ID/whatsapp/status" `
    -Headers @{Authorization="Bearer $TOKEN"}

if ($status2.status -eq "connected") {
    Write-Host "✅ WhatsApp connected successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ WhatsApp not connected. Status: $($status2.status)" -ForegroundColor Red
    exit 1
}

# 7. Send Test Message
Write-Host "`n7️⃣ Sending test message..." -ForegroundColor Cyan
$messageBody = @{
    phone = "5511999999999"
    message = "🚀 GO-LIVE test from production!"
    clientMessageId = "golive-test-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

$messageResponse = Invoke-RestMethod -Uri "$API_URL/messages" `
    -Method POST `
    -Headers @{Authorization="Bearer $TOKEN"} `
    -ContentType "application/json" `
    -Body $messageBody

if ($messageResponse.success) {
    Write-Host "✅ Message sent successfully! ID: $($messageResponse.messageId)" -ForegroundColor Green
} else {
    Write-Host "❌ Message send failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅✅✅ ALL SMOKE TESTS PASSED! ✅✅✅" -ForegroundColor Green
```

#### Option C: Manual curl commands (Step-by-step)

```bash
# Set your API URL
API_URL="https://your-production-domain.com"

# 1. Health
curl "$API_URL/health"

# 2. Login (save token manually)
curl -X POST "$API_URL/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'
# Copy the accessToken from response

# Set token
TOKEN="paste-token-here"

# 3. Get units (save unit ID manually)
curl "$API_URL/admin/units" \
  -H "Authorization: Bearer $TOKEN"
# Copy a unit id from response

# Set unit ID
UNIT_ID="paste-unit-id-here"

# 4. Connect WhatsApp
curl -X POST "$API_URL/units/$UNIT_ID/whatsapp/connect" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"evolution","credentials":{}}'
# QR code will be in response

# 5. Check status
curl "$API_URL/units/$UNIT_ID/whatsapp/status" \
  -H "Authorization: Bearer $TOKEN"

# 6. Send message (after scanning QR)
curl -X POST "$API_URL/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"5511999999999","message":"Test","clientMessageId":"test-123"}'
```

## ============================================================

## EXPECTED RESULTS SUMMARY

## ============================================================

### ✅ Success Criteria

| Test            | Expected Result                                    |
| --------------- | -------------------------------------------------- |
| Health          | `{"status":"ok"}`                                  |
| Login           | Returns `accessToken`                              |
| Units           | Returns array with at least 1 unit                 |
| Connect         | Returns QR code (base64 string)                    |
| Status (Before) | `{"status":"qr","reason":"waiting_scan"}`          |
| Status (After)  | `{"status":"connected","reason":"scan_completed"}` |
| Send Message    | `{"success":true,"messageId":"msg_..."}`           |

### ❌ Troubleshooting

| Problem             | Likely Cause              | Solution                           |
| ------------------- | ------------------------- | ---------------------------------- |
| Health 500          | Server not running        | Check deployment logs              |
| Login 401           | Wrong credentials         | Verify admin email/password        |
| Connect 500         | Evolution API unreachable | Check EVOLUTION_API_URL env var    |
| No QR code          | Instance creation failed  | Check Evolution API logs           |
| Status not changing | Webhook not configured    | Verify BASE_URL is correct (HTTPS) |
| Message fails       | Not connected             | Wait for status="connected" first  |

## ============================================================

## SECTION 5: POST-DEPLOY MONITORING

## ============================================================

See `GOLIVE_MONITORING_RUNBOOK.md` for detailed 1-hour monitoring guide.

**Quick Checks (First 5 minutes):**

```bash
# Check server logs (adjust for your platform)
# Railway: railway logs
# Render: render logs
# Heroku: heroku logs --tail

# Look for:
✓ No 500 errors
✓ Secrets masked in logs ([MASKED])
✓ Phones masked (****9999)
✓ No "ENABLE_TEST_BYPASS" warnings
```

## ============================================================

## ROLLBACK PROCEDURE

## ============================================================

**If critical issues arise within first hour:**

```powershell
# PowerShell
# 1. Revert to previous deployment
git revert HEAD --no-edit
git push origin main --force

# 2. OR use platform rollback
# Railway: railway rollback
# Render: Use dashboard rollback
# Vercel: vercel rollback

# 3. Notify team
Write-Host "⚠️ ROLLBACK EXECUTED - Evolution WhatsApp disabled" -ForegroundColor Red
```

**Migrations are SAFE** - New columns are nullable, won't break

old code.

---

**End of GO-LIVE Deployment Guide**
