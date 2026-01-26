#!/bin/bash

# 🧪 CRM Propulse - Smoke Tests (GO-LIVE)
# Usage: ./smoke-tests.sh [EVOLUTION_API_KEY]

CRM_URL="https://crm-propulse-prod-production.up.railway.app"
EVO_URL="https://evolution-propulse-prod-production.up.railway.app"
API_KEY="${1:-CHANGE_ME_TO_YOUR_KEY}"

echo "🚀 Starting Smoke Tests..."

# 1. CRM Health
echo -n "1. CRM Health: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$CRM_URL/health")
if [ "$HTTP_CODE" == "200" ]; then echo "✅ OK"; else echo "❌ FAIL ($HTTP_CODE)"; fi

# 2. Evolution Health
echo -n "2. Evolution Health: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$EVO_URL/")
if [ "$HTTP_CODE" == "200" ]; then echo "✅ OK"; else echo "❌ FAIL ($HTTP_CODE) - Check PORT=8080"; fi

# 3. CRM Login & Token
echo -n "3. Admin Login: "
LOGIN_RES=$(curl -s -X POST "$CRM_URL/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@propulse.com","password":"admin123"}')
TOKEN=$(echo $LOGIN_RES | jq -r '.accessToken')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ OK (Token acquired)"
else
  echo "❌ FAIL"
  echo "Response: $LOGIN_RES"
  exit 1
fi

# 4. Get Unit ID
echo -n "4. Get Unit ID: "
UNIT_RES=$(curl -s -H "Authorization: Bearer $TOKEN" "$CRM_URL/admin/units")
UNIT_ID=$(echo $UNIT_RES | jq -r '.[0].id')

if [ "$UNIT_ID" != "null" ]; then
  echo "✅ OK ($UNIT_ID)"
else
  echo "❌ FAIL (No units found)"
  exit 1
fi

# 5. Connect WhatsApp (Generate QR)
echo -n "5. Connect WhatsApp (Start Session): "
CONNECT_RES=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$CRM_URL/units/$UNIT_ID/whatsapp/connect" \
  -d '{"provider":"evolution"}')

CONNECT_STATUS=$(echo $CONNECT_RES | jq -r '.status // .error.code')
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$CRM_URL/units/$UNIT_ID/whatsapp/connect" \
  -d '{"provider":"evolution"}')

# Accept 201 (Created) or 424 (QR Not Ready Yet)
if [[ "$HTTP_CODE" == "201" || "$HTTP_CODE" == "424" ]]; then
  echo "✅ OK ($HTTP_CODE - $CONNECT_STATUS)"
else
  echo "❌ FAIL ($HTTP_CODE)"
  echo "Response: $CONNECT_RES"
fi

# 6. Status Check
echo -n "6. WhatsApp Status: "
STATUS_RES=$(curl -s -H "Authorization: Bearer $TOKEN" "$CRM_URL/units/$UNIT_ID/whatsapp/status")
STATUS=$(echo $STATUS_RES | jq -r '.status')

echo "✅ Result: $STATUS"
echo "---"
echo "🏁 Smoke Tests Completed. Please scan QR Code if status is 'connecting'."
