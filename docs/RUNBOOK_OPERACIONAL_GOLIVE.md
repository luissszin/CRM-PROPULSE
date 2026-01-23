# 🚀 EVOLUTION WHATSAPP - OPERATIONAL RUNBOOK

# GO-LIVE EXECUTION GUIDE - Copy/Paste Ready

**Date:** Execute TODAY  
**Duration:** ~90 minutes total  
**Platform:** PowerShell (Windows)

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## BLOCO 1: PRÉ-DEPLOY LOCAL (15 minutos)

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### STEP 1.1: Release Gate (23 checks)

```powershell
# Configurar ambiente de teste
$env:NODE_ENV='test'
$env:JWT_ACCESS_SECRET='test-secret-key-for-jwt'

# Opcional: Ignorar rate limit localmente nos testes
$env:ENABLE_TEST_BYPASS='true'

# Executar Release Gate
Write-Host "`n🚦 Running Release Gate..." -ForegroundColor Cyan
node backend/scripts/release_gate.js

# IMPORTANTE: Aguardar saída completa (~10 segundos)
```

**✅ RESULTADO ESPERADO (PASS):**

```
============================================================
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
✓ In-memory DB has upsert shim
✓ In-memory DB basic queries work
✓ whatsappWebhook.js imports successfully
✓ messages.js imports successfully
✓ messageHandler.service.js imports successfully
✓ webhookHelper.js imports successfully
✓ Evolution provider module loads correctly
✓ Campaign service loads correctly

✓ ALL CHECKS PASSED ✓
🎉 System is PRODUCTION READY!
```

**❌ RESULTADO FAIL:**

- Se qualquer "✗" aparecer → PARAR
- Investigar qual check falhou
- Corrigir antes de prosseguir

---

### STEP 1.2: E2E Tests (9 scenarios)

```powershell
# Executar E2E Tests
Write-Host "`n🧪 Running E2E Tests..." -ForegroundColor Cyan
node --test backend/tests/evolution_complete_e2e.test.js

# IMPORTANTE: Aguardar conclusão (~20 segundos)
# Campaign test tem delay de 7 segundos
```

**✅ RESULTADO ESPERADO (PASS):**

```
✓ 1. Should connect WhatsApp and generate QR code
✓ 2. Should update status to connected when QR is scanned
✓ 3. Should receive inbound message and create contact/conversation/message
✓ 4. Should deduplicate repeated inbound message
✓ 5. Should send outbound message with client_message_id and retry
✓ 6. Should dispatch campaign with sequential sending and rate limit
✓ 7. Should reject webhook with invalid provider
✓ 8. Should handle unknown instance gracefully (200 + log)
✓ BONUS: Should enforce multi-tenant isolation

✓ Evolution WhatsApp E2E - 100% Coverage (15-20s)

tests 9
pass 9
```

**❌ RESULTADO FAIL:**

- Se tests < 9 ou fail > 0 → PARAR
- Verificar qual cenário falhou
- Corrigir antes de prosseguir

---

### STEP 1.3: Confirmação Manual

```powershell
# ✅ CHECKPOINT PRÉ-DEPLOY
Write-Host "`n✅ CHECKPOINT PRÉ-DEPLOY:" -ForegroundColor Green
Write-Host "  Release Gate: PASS (23/23)" -ForegroundColor Green
Write-Host "  E2E Tests: PASS (9/9)" -ForegroundColor Green
Write-Host "`n  Pronto para produção!" -ForegroundColor Green
Write-Host "`nPressione Enter para continuar ou Ctrl+C para abortar..."
Read-Host
```

**DECISÃO:**

- ✅ Ambos PASS → Prosseguir para BLOCO 2
- ❌ Qualquer FAIL → Investigar e corrigir primeiro

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## BLOCO 2: SUPABASE MIGRATIONS (10 minutos)

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### STEP 2.1: Abrir Arquivo Migration

```powershell
# Abrir arquivo no editor (para copiar depois)
code backend/db/PRODUCTION_MIGRATION_GOLIVE.sql

# OU exibir no terminal
Get-Content backend/db/PRODUCTION_MIGRATION_GOLIVE.sql
```

---

### STEP 2.2: Aplicar Migrations no Supabase

**INSTRUÇÕES:**

1. **Acessar Supabase:**
   - Abrir: https://app.supabase.com
   - Selecionar projeto
   - Menu → SQL Editor → New Query

2. **Copiar SQL:**
   - Copiar **TODO** conteúdo de `PRODUCTION_MIGRATION_GOLIVE.sql`
   - (~300 linhas)

3. **Colar no SQL Editor:**
   - Colar todo o bloco
   - Verificar visualmente que colou completo

4. **Executar:**
   - Clicar botão **RUN** (ou Ctrl+Enter)
   - Aguardar conclusão (~10 segundos)

---

### STEP 2.3: Verificar Sucesso

**✅ OUTPUT ESPERADO (SUCESSO):**

```sql
-- Você deve ver na aba "Results":

NOTICE: Added column: unit_whatsapp_connections.status_reason
NOTICE: Already exists: unit_whatsapp_connections.connected_at
... (várias linhas de NOTICE)

-- E ao final:

            column_name              | data_type |  status
------------------------------------|-----------|----------
connected_at                         | timestamp | ✓ EXISTS
disconnected_at                      | timestamp | ✓ EXISTS
qr_updated_at                        | timestamp | ✓ EXISTS
status_reason                        | text      | ✓ EXISTS

-- E mensagem final:

NOTICE: ============================================================
NOTICE: MIGRATION STATUS SUMMARY
NOTICE: ============================================================
NOTICE: unit_whatsapp_connections columns: 4 / 4 ✓
NOTICE: messages columns: 4 / 4 ✓
NOTICE: Indexes created: 3 / 3+ ✓
NOTICE: Campaign tables: 2 / 2 ✓
NOTICE:
NOTICE: ✅ ALL MIGRATIONS APPLIED SUCCESSFULLY!
NOTICE: ✅ System is ready for Evolution WhatsApp integration
NOTICE: ============================================================

Success. No rows returned
```

**✅ CONFIRMAÇÃO VISUAL:**

- `4 / 4` em connection columns
- `4 / 4` em messages columns
- `3+` indexes
- `2 / 2` campaign tables
- Mensagem final: "ALL MIGRATIONS APPLIED SUCCESSFULLY"

---

### STEP 2.4: Troubleshooting (Se houver erro)

**❌ ERRO COMUM: "duplicate key value violates unique constraint"**

Significa que já existem dados duplicados em `messages.client_message_id`.

**SOLUÇÃO:**

```sql
-- 1. Detectar duplicados
SELECT
    conversation_id,
    client_message_id,
    COUNT(*) as count
FROM messages
WHERE client_message_id IS NOT NULL
GROUP BY conversation_id, client_message_id
HAVING COUNT(*) > 1;

-- Se retornar linhas, há duplicados

-- 2. Limpar duplicados (manter o mais recente)
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY conversation_id, client_message_id
               ORDER BY created_at DESC
           ) as rn
    FROM messages
    WHERE client_message_id IS NOT NULL
)
DELETE FROM messages
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- 3. Reexecutar o bloco migration completo
-- (Copiar/colar novamente e RUN)
```

**❌ OUTRO ERRO:**

- Copiar mensagem de erro exata
- Verificar se colou SQL completo
- Tentar reexecutar (é idempotente)

---

### STEP 2.5: Confirmação Manual

```powershell
Write-Host "`n✅ CHECKPOINT MIGRATIONS:" -ForegroundColor Green
Write-Host "  Supabase SQL executado: OK" -ForegroundColor Green
Write-Host "  Mensagem final vista: '✅ ALL MIGRATIONS APPLIED SUCCESSFULLY'" -ForegroundColor Green
Write-Host "`nPressione Enter para continuar ou Ctrl+C para abortar..."
Read-Host
```

**DECISÃO:**

- ✅ Migrations aplicados com sucesso → Prosseguir BLOCO 3
- ❌ Erro persistente → Investigar antes de deploy

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## BLOCO 3: DEPLOY CÓDIGO (15 minutos)

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### STEP 3.1: Verificar Status Git

```powershell
# Ver arquivos modificados
git status

# Ver diferenças (opcional)
git diff

# Lista esperada de arquivos novos/modificados:
# - backend/db/PRODUCTION_MIGRATION_GOLIVE.sql
# - backend/db/schema_connection_improvements.sql
# - backend/db/schema_outbound_improvements.sql
# - backend/routes/whatsappWebhook.js
# - backend/routes/messages.js
# - backend/services/whatsapp/messageHandler.service.js
# - backend/utils/webhookHelper.js
# - backend/scripts/release_gate.js
# - backend/tests/evolution_complete_e2e.test.js
# - docs/*.md (vários)
```

---

### STEP 3.2: Commit e Push

```powershell
# Adicionar arquivos
git add .

# Commit
git commit -m "feat: Evolution WhatsApp integration v1.0 - GOLIVE

- Webhook architecture hardening (instance routing, security logging)
- Status tracking (reason, timestamps, QR updates)
- Outbound retry with exponential backoff (max 3)
- Client message ID idempotency
- Message status delivery tracking
- Campaigns with rate limiting
- E2E tests (9 scenarios)
- Production migrations (idempotent)

Release Gate: 23/23 PASS
E2E Tests: 9/9 PASS
Migrations: Applied and verified
"

# Tag release
git tag -a v1.0.0-whatsapp -m "Evolution WhatsApp GO-LIVE"

# Push
git push origin main
git push origin v1.0.0-whatsapp

Write-Host "`n✅ Código enviado para produção" -ForegroundColor Green
Write-Host "Aguardando deploy automático..." -ForegroundColor Yellow
```

---

### STEP 3.3: Verificar Environment Variables (CRÍTICO)

**NA PLATAFORMA DE HOSPEDAGEM (Railway, Render, Vercel, etc.):**

Confirmar que estas variáveis estão setadas:

```
✅ NODE_ENV=production
✅ EVOLUTION_API_URL=https://your-evolution-api.com (ou http://localhost:8080 se local)
✅ EVOLUTION_API_KEY=your-actual-api-key
✅ JWT_ACCESS_SECRET=your-strong-random-secret-32chars+
✅ SUPABASE_URL=https://yourproject.supabase.co
✅ SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
✅ BASE_URL=https://your-production-domain.com (DEVE SER HTTPS!)

⚠️ CONFIRMAR NÃO ESTÁ SETADO:
❌ ENABLE_TEST_BYPASS (NUNCA usar em produção)
```

**COMO CONFERIR (exemplo Railway):**

```powershell
# Se usando Railway CLI
railway variables

# Ou acessar dashboard e verificar variáveis
```

---

### STEP 3.4: Aguardar Deploy Completo

```powershell
# Monitorar logs da plataforma
# Railway: railway logs --tail
# Render: render logs (no dashboard)
# Vercel: vercel logs

# Aguardar mensagens como:
# "🚀 Backend rodando na porta 3000" (ou similar)
# "Supabase client initialized"

Write-Host "`nAguardando deploy estabilizar (30-60 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60
```

---

### STEP 3.5: Health Check Inicial

```powershell
# Substituir por seu domínio real
$API_URL = "https://SEU-DOMINIO-AQUI.com"

# Health check
Write-Host "`n🏥 Testing Health Endpoint..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$API_URL/health" -TimeoutSec 10
    Write-Host "✅ Health OK: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health FAIL: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "PARAR - Backend não está respondendo" -ForegroundColor Red
    exit 1
}
```

**✅ ESPERADO:**

```json
{
  "status": "ok",
  "uptime": 123
}
```

**❌ FAIL:**

- Timeout ou 500 → Verificar logs
- 404 → URL errada
- ECONNREFUSED → Deploy ainda não terminou

---

### STEP 3.6: Verificar Logs (Rápido)

```powershell
# Procurar por erros críticos nos logs

# Railway exemplo:
# railway logs | Select-String "error" | Select-Object -Last 10

# Buscar por:
# ✅ "Backend rodando" ou "Server started" → OK
# ✅ "Supabase client initialized" → OK
# ❌ "ECONNREFUSED" ou "500" repetido → PROBLEMA
# ❌ Crash loop (reiniciando constantemente) → PROBLEMA CRÍTICO
```

**✅ LOGS SAUDÁVEIS:**

```
Supabase client initialized
[INFO] [requeueWorker] started
Serving frontend from /app/frontend/dist
🚀 Backend rodando na porta 3000
```

**❌ LOGS PROBLEMÁTICOS:**

```
Error connecting to database
FATAL ERROR: ...
[nodemon] app crashed
```

Se crash loop → ROLLBACK imediatamente (ver final do documento)

---

### STEP 3.7: Confirmação Manual

```powershell
Write-Host "`n✅ CHECKPOINT DEPLOY:" -ForegroundColor Green
Write-Host "  Código pushed: OK" -ForegroundColor Green
Write-Host "  Env vars conferidos: OK" -ForegroundColor Green
Write-Host "  Health endpoint: OK" -ForegroundColor Green
Write-Host "  Logs sem crash: OK" -ForegroundColor Green
Write-Host "`nProsseguir para Smoke Tests?" -ForegroundColor Yellow
Write-Host "Pressione Enter para continuar ou Ctrl+C para abortar..."
Read-Host
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## BLOCO 4: SMOKE TESTS + MONITORING (60 minutos)

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### VERSÃO 1: PowerShell Automatizado (RECOMENDADO)

```powershell
# ============================================================
# SMOKE TESTS AUTOMATIZADOS - PowerShell
# ============================================================

# CONFIGURAR (substituir valores reais)
$API_URL = "https://SEU-DOMINIO.com"
$ADMIN_EMAIL = "admin@seudominio.com"
$ADMIN_PASSWORD = "sua-senha-admin"

Write-Host "`n🧪 INICIANDO SMOKE TESTS..." -ForegroundColor Cyan
Write-Host "API: $API_URL`n" -ForegroundColor Yellow

# ────────────────────────────────────────────────────────
# TEST 1: Health Check
# ────────────────────────────────────────────────────────
Write-Host "1️⃣ Health Check..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$API_URL/health"
    if ($health.status -eq "ok") {
        Write-Host "   ✅ PASS - Health OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ FAIL - Health status: $($health.status)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ────────────────────────────────────────────────────────
# TEST 2: Admin Login
# ────────────────────────────────────────────────────────
Write-Host "`n2️⃣ Admin Login..." -ForegroundColor Cyan
try {
    $loginBody = @{
        email = $ADMIN_EMAIL
        password = $ADMIN_PASSWORD
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$API_URL/admin/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $TOKEN = $loginResponse.accessToken

    if ($TOKEN) {
        Write-Host "   ✅ PASS - Token: $($TOKEN.Substring(0,20))..." -ForegroundColor Green
    } else {
        Write-Host "   ❌ FAIL - No token received" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Verifique email/senha do admin" -ForegroundColor Yellow
    exit 1
}

# ────────────────────────────────────────────────────────
# TEST 3: Get Units
# ────────────────────────────────────────────────────────
Write-Host "`n3️⃣ Get Units..." -ForegroundColor Cyan
try {
    $units = Invoke-RestMethod -Uri "$API_URL/admin/units" `
        -Headers @{Authorization="Bearer $TOKEN"}

    if ($units.Count -gt 0) {
        $UNIT_ID = $units[0].id
        Write-Host "   ✅ PASS - Unit ID: $UNIT_ID" -ForegroundColor Green
    } else {
        Write-Host "   ❌ FAIL - No units found" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ────────────────────────────────────────────────────────
# TEST 4: Connect WhatsApp (Generate QR)
# ────────────────────────────────────────────────────────
Write-Host "`n4️⃣ Connect WhatsApp..." -ForegroundColor Cyan
try {
    $connectBody = @{
        provider = "evolution"
        credentials = @{}
    } | ConvertTo-Json

    $connectResponse = Invoke-RestMethod -Uri "$API_URL/units/$UNIT_ID/whatsapp/connect" `
        -Method POST `
        -Headers @{Authorization="Bearer $TOKEN"} `
        -ContentType "application/json" `
        -Body $connectBody

    if ($connectResponse.connection.qrCode) {
        Write-Host "   ✅ PASS - QR Code generated" -ForegroundColor Green
        Write-Host "   QR: $($connectResponse.connection.qrCode.Substring(0,50))..." -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ FAIL - No QR code in response" -ForegroundColor Red
        Write-Host "   Response: $($connectResponse | ConvertTo-Json)" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Verifique EVOLUTION_API_URL nas env vars" -ForegroundColor Yellow
    exit 1
}

# ────────────────────────────────────────────────────────
# TEST 5: Check Status (Before Scan)
# ────────────────────────────────────────────────────────
Write-Host "`n5️⃣ Check Status (Before Scan)..." -ForegroundColor Cyan
try {
    $statusBefore = Invoke-RestMethod -Uri "$API_URL/units/$UNIT_ID/whatsapp/status" `
        -Headers @{Authorization="Bearer $TOKEN"}

    Write-Host "   Status: $($statusBefore.status)" -ForegroundColor Yellow
    Write-Host "   Reason: $($statusBefore.reason)" -ForegroundColor Yellow

    if ($statusBefore.status -eq "qr" -or $statusBefore.status -eq "connecting") {
        Write-Host "   ✅ PASS - Waiting for scan" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  WARN - Status unexpected: $($statusBefore.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ────────────────────────────────────────────────────────
# PAUSE: Scan QR Code
# ────────────────────────────────────────────────────────
Write-Host "`n⏸️  PAUSE:" -ForegroundColor Magenta
Write-Host "   1. Abra WhatsApp no celular" -ForegroundColor White
Write-Host "   2. Vá em Dispositivos Conectados → Conectar Dispositivo" -ForegroundColor White
Write-Host "   3. Escaneie o QR code mostrado acima (ou use frontend)" -ForegroundColor White
Write-Host "   4. Aguarde mensagem 'Dispositivo conectado'" -ForegroundColor White
Write-Host "`n   Pressione Enter APÓS escanear o QR..." -ForegroundColor Yellow
Read-Host

# Aguardar webhook processar (2-5 segundos)
Write-Host "`n   Aguardando webhook processar (5s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# ────────────────────────────────────────────────────────
# TEST 6: Check Status (After Scan) - CRÍTICO
# ────────────────────────────────────────────────────────
Write-Host "`n6️⃣ Check Status (After Scan)..." -ForegroundColor Cyan
try {
    $statusAfter = Invoke-RestMethod -Uri "$API_URL/units/$UNIT_ID/whatsapp/status" `
        -Headers @{Authorization="Bearer $TOKEN"}

    Write-Host "   Status: $($statusAfter.status)" -ForegroundColor Yellow
    Write-Host "   Reason: $($statusAfter.reason)" -ForegroundColor Yellow
    Write-Host "   Connected At: $($statusAfter.connectedAt)" -ForegroundColor Yellow

    if ($statusAfter.status -eq "connected") {
        Write-Host "   ✅ PASS - WhatsApp connected!" -ForegroundColor Green
        Write-Host "   ✅ Reason: $($statusAfter.reason)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ FAIL - Status not 'connected': $($statusAfter.status)" -ForegroundColor Red
        Write-Host "   Possíveis causas:" -ForegroundColor Yellow
        Write-Host "   - Webhook não configurado (BASE_URL incorreta)" -ForegroundColor Yellow
        Write-Host "   - QR não foi escaneado corretamente" -ForegroundColor Yellow
        Write-Host "   - Evolution API não enviou webhook" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ────────────────────────────────────────────────────────
# TEST 7: Send Outbound Message
# ────────────────────────────────────────────────────────
Write-Host "`n7️⃣ Send Test Message..." -ForegroundColor Cyan
try {
    $messageBody = @{
        phone = "5511999999999"  # TROCAR POR NÚMERO REAL DE TESTE
        message = "🚀 GO-LIVE test from production $(Get-Date -Format 'HH:mm:ss')"
        clientMessageId = "golive-test-$(Get-Date -Format 'yyyyMMddHHmmss')"
    } | ConvertTo-Json

    $messageResponse = Invoke-RestMethod -Uri "$API_URL/messages" `
        -Method POST `
        -Headers @{Authorization="Bearer $TOKEN"} `
        -ContentType "application/json" `
        -Body $messageBody

    if ($messageResponse.success) {
        Write-Host "   ✅ PASS - Message sent!" -ForegroundColor Green
        Write-Host "   Message ID: $($messageResponse.messageId)" -ForegroundColor Yellow
        Write-Host "   Attempts: $($messageResponse.attempts)" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ FAIL - Message not sent" -ForegroundColor Red
        Write-Host "   Response: $($messageResponse | ConvertTo-Json)" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Verifique se WhatsApp está conectado" -ForegroundColor Yellow
    exit 1
}

# ────────────────────────────────────────────────────────
# SMOKE TESTS SUMMARY
# ────────────────────────────────────────────────────────
Write-Host "`n" + ("=" * 60) -ForegroundColor Green
Write-Host "  ✅✅✅ TODOS OS SMOKE TESTS PASSARAM! ✅✅✅  " -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Green
Write-Host "`nSistema pronto para monitoramento de 1 hora..." -ForegroundColor Cyan
```

**✅ SE TODOS PASSAREM:**

- Sistema está funcional
- Prosseguir para monitoramento

**❌ SE QUALQUER FALHAR:**

- Investigar erro específico
- Corrigir antes de continuar

---

### VERSÃO 2: Curl Manual (Backup/Troubleshooting)

```powershell
# Se PowerShell falhar, use curl manual:

# SET UP
$API_URL = "https://SEU-DOMINIO.com"

# 1. Health
curl $API_URL/health

# 2. Login
curl -X POST $API_URL/admin/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"password\":\"senha\"}'
# COPIAR accessToken da resposta

# 3. Set token
$TOKEN = "paste-token-aqui"

# 4. Get units
curl $API_URL/admin/units `
  -H "Authorization: Bearer $TOKEN"
# COPIAR um unit id

# 5. Set unit ID
$UNIT_ID = "paste-unit-id-aqui"

# 6. Connect WhatsApp
curl -X POST $API_URL/units/$UNIT_ID/whatsapp/connect `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"provider\":\"evolution\",\"credentials\":{}}'

# 7. Check status
curl $API_URL/units/$UNIT_ID/whatsapp/status `
  -H "Authorization: Bearer $TOKEN"

# 8. [SCAN QR CODE]

# 9. Check status again (should be 'connected')
curl $API_URL/units/$UNIT_ID/whatsapp/status `
  -H "Authorization: Bearer $TOKEN"

# 10. Send message
curl -X POST $API_URL/messages `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"phone\":\"5511999999999\",\"message\":\"Test\",\"clientMessageId\":\"test-123\"}'
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## MONITORING - 60 MINUTOS (4 CHECKPOINTS)

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### CHECKPOINT 1 (T+10min)

```powershell
Write-Host "`n⏰ CHECKPOINT 1 (T+10min)" -ForegroundColor Cyan
Write-Host "Verificar métricas críticas:`n"

# Ver logs (adaptar comando para sua plataforma)
# railway logs | Select-String "error|500|401|403" | Select-Object -Last 20
```

**5 MÉTRICAS CRÍTICAS:**

| Métrica                  | Como Checar                          | Threshold OK     | Threshold CRITICAL |
| ------------------------ | ------------------------------------ | ---------------- | ------------------ |
| **1. HTTP 5xx**          | `grep "500\|502\|503" logs`          | 0-5              | > 15               |
| **2. Auth 401/403**      | `grep "401\|403" logs`               | < 20             | > 50               |
| **3. Unknown instances** | `grep "unknown_instance" logs`       | 0-2              | > 5                |
| **4. Secrets masked**    | `grep "\[MASKED\]" logs \| head -5`  | Deve ter entries | Nenhum = FAIL      |
| **5. Database errors**   | `grep "ECONNREFUSED\|database" logs` | 0                | > 3                |

**DECISÃO T+10:**

- ✅ Todos OK → Continue
- ⚠️ 1-2 Warnings → Monitor próximo checkpoint
- 🚨 1+ Critical → Considerar rollback

---

### CHECKPOINT 2 (T+20min)

```powershell
Write-Host "`n⏰ CHECKPOINT 2 (T+20min)" -ForegroundColor Cyan
```

**5 MÉTRICAS CRÍTICAS:**

| Métrica                    | SQL Query (Supabase)                                                                                  | Threshold OK        | CRITICAL               |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- |
| **1. Message flow**        | `SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '10 min'`                          | Conforme tráfego    | 0 se houver atividade  |
| **2. Retry rate**          | `SELECT COUNT(*) FROM messages WHERE retry_count > 0 AND created_at > NOW() - INTERVAL '10 min'`      | 0-5                 | > 20                   |
| **3. Failed messages**     | `SELECT COUNT(*) FROM messages WHERE status='failed' AND created_at > NOW() - INTERVAL '10 min'`      | < 5                 | > 20                   |
| **4. Connection stable**   | `SELECT status, status_reason FROM unit_whatsapp_connections WHERE status='connected'`                | Maioria 'connected' | Maioria 'disconnected' |
| **5. Campaign processing** | `SELECT COUNT(*) FROM campaigns WHERE status='processing' AND started_at < NOW() - INTERVAL '10 min'` | 0                   | > 2 (stuck)            |

**DECISÃO T+20:**

- ✅ Todos OK → Continue
- ⚠️ Warnings → Investigar causa
- 🚨 Critical → Preparar rollback

---

### CHECKPOINT 3 (T+30min)

```powershell
Write-Host "`n⏰ CHECKPOINT 3 (T+30min)" -ForegroundColor Cyan
```

**5 MÉTRICAS CRÍTICAS:**

| Métrica                 | Como Verificar                                                                                                          | OK               | CRITICAL    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------- |
| **1. Inbound working**  | Enviar msg WhatsApp → checar DB/logs                                                                                    | Msg aparece < 5s | Não aparece |
| **2. Outbound success** | `SELECT COUNT(*), status FROM messages WHERE sender='agent' AND created_at > NOW() - INTERVAL '30 min' GROUP BY status` | sent > 90%       | sent < 50%  |
| **3. Status updates**   | Logs: `grep "Status updated" logs \| tail -10`                                                                          | Vários entries   | Nenhum      |
| **4. Rate limiting**    | `grep "429" logs \| wc -l`                                                                                              | 0-5              | > 20        |
| **5. Memory/CPU**       | Plataforma dashboard                                                                                                    | < 80%            | > 95%       |

**DECISÃO T+30:**

- ✅ Todos OK → Sistema estável
- ⚠️ 1-2 issues → Continue monitorando
- 🚨 Múltiplos critical → ROLLBACK

---

### CHECKPOINT 4 (T+60min) - DECISÃO FINAL

```powershell
Write-Host "`n⏰ CHECKPOINT 4 (T+60min) - DECISÃO GO/NO-GO" -ForegroundColor Magenta
```

**SUMMARY REPORT:**

```powershell
# Gerar relatório consolidado
Write-Host "`n📊 HOUR 1 SUMMARY:" -ForegroundColor Cyan
Write-Host "Total 5xx errors: $(grep '5[0-9][0-9]' logs | wc -l)"
Write-Host "Total 401/403: $(grep '401\|403' logs | wc -l)"
Write-Host "Unknown instances: $(grep 'unknown_instance' logs | wc -l)"
Write-Host "Message retries: $(grep 'Retry' logs | wc -l)"
Write-Host "429 rate limits: $(grep '429' logs | wc -l)"
```

**GO CRITERIA (✅ CONTINUE):**

- ✅ 5xx errors < 15
- ✅ 401/403 < 50
- ✅ Unknown instances < 5
- ✅ Retries < 30
- ✅ 429 < 20
- ✅ Pelo menos 1 inbound msg recebido
- ✅ Pelo menos 1 outbound msg enviado
- ✅ Status muda para 'connected' após QR scan
- ✅ Nenhum secret vazado em logs

**NO-GO CRITERIA (🚨 ROLLBACK):**

- 🚨 5xx errors > 50
- 🚨 Secrets aparecendo unmasked
- 🚨 Cross-tenant data leak detectado
- 🚨 > 50% messages failing
- 🚨 Service down > 5 min contínuos
- 🚨 Status não atualiza (webhook quebrado)

**DECISÃO:**

```powershell
if (TODOS_GO_CRITERIA_ATENDIDOS) {
    Write-Host "`n✅✅✅ GO-LIVE APROVADO! ✅✅✅" -ForegroundColor Green
    Write-Host "Sistema estável. Reduzir monitoramento para 1x/hora." -ForegroundColor Green
} else {
    Write-Host "`n🚨🚨🚨 NO-GO - EXECUTAR ROLLBACK 🚨🚨🚨" -ForegroundColor Red
    # Ver seção ROLLBACK abaixo
}
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ROLLBACK PROCEDURE (SE NECESSÁRIO)

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**⚠️ EXECUTAR SOMENTE SE NO-GO T+60:**

```powershell
Write-Host "`n🚨 INICIANDO ROLLBACK..." -ForegroundColor Red

# 1. Tag failure point
git tag -a v1.0.0-whatsapp-FAILED -m "Rollback point - issues detected"
git push origin v1.0.0-whatsapp-FAILED

# 2. Revert código (um ou mais commits conforme necessário)
# Se o problema for o commit de GO-LIVE (HEAD):
git revert HEAD --no-edit
git push origin main

# Exemplo: Reverter múltiplos commits se houver fixes no meio:
# git revert OLD_SHA..HEAD --no-edit

Write-Host "✅ Código revertido no repositório" -ForegroundColor Yellow

# 3. Aguardar redeploy
Write-Host "Aguardando redeploy (60s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# 4. Verificar health
$health = Invoke-RestMethod -Uri "$API_URL/health"
if ($health.status -eq "ok") {
    Write-Host "✅ Sistema voltou ao normal" -ForegroundColor Green
} else {
    Write-Host "❌ Sistema ainda com problemas - escalar" -ForegroundColor Red
}

# 5. Notificar
Write-Host "`n⚠️  ROLLBACK COMPLETO" -ForegroundColor Yellow
Write-Host "Sistema revertido para versão anterior" -ForegroundColor Yellow
Write-Host "WhatsApp integration desabilitada" -ForegroundColor Yellow
Write-Host "`nMigrations no Supabase: MANTER (são safe)" -ForegroundColor Green
```

**MIGRATIONS: NÃO REVERTER**

- Novas colunas são nullable → código antigo funciona
- Safe para deixar no banco

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## CHECKLIST FINAL DE EXECUÇÃO

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ☐ PRÉ-DEPLOY (Bloco 1)

- [ ] Release Gate: PASS (23/23)
- [ ] E2E Tests: PASS (9/9)
- [ ] Confirmação manual: OK

### ☐ MIGRATIONS (Bloco 2)

- [ ] SQL copiado para Supabase SQL Editor
- [ ] Executado com sucesso
- [ ] Mensagem final: "✅ ALL MIGRATIONS APPLIED SUCCESSFULLY"
- [ ] Confirmação manual: OK

### ☐ DEPLOY (Bloco 3)

- [ ] git add/commit/push executado
- [ ] Tag criado (v1.0.0-whatsapp)
- [ ] Env vars conferidos (7 variáveis)
- [ ] Health endpoint: 200 OK
- [ ] Logs sem crash
- [ ] Confirmação manual: OK

### ☐ SMOKE TESTS (Bloco 4A)

- [ ] Health: PASS
- [ ] Login: PASS
- [ ] Units: PASS
- [ ] Connect: PASS (QR gerado)
- [ ] Status before: PASS
- [ ] QR escaneado manualmente
- [ ] Status after: PASS (connected)
- [ ] Message sent: PASS

### ☐ MONITORING (Bloco 4B)

- [ ] T+10min: Métricas OK
- [ ] T+20min: Métricas OK
- [ ] T+30min: Métricas OK
- [ ] T+60min: GO/NO-GO decision

### ☐ RESULTADO FINAL

- [ ] ✅ GO-LIVE APROVADO → Reduzir monitoramento
- [ ] 🚨 ROLLBACK EXECUTADO → Investigar issues

---

## 📞 SUPORTE / TROUBLESHOOTING RÁPIDO

| Problema        | Causa Provável     | Solução Rápida                    |
| --------------- | ------------------ | --------------------------------- |
| Health 500      | Backend crashed    | Ver logs, verificar env vars      |
| Login 401       | Senha errada       | Resetar senha admin               |
| QR não aparece  | Evolution API down | Verificar EVOLUTION_API_URL       |
| Status stuck    | BASE_URL incorreta | Deve ser HTTPS, verificar webhook |
| Message fail    | Não conectado      | Aguardar status='connected'       |
| Rollback needed | Critical issues    | Executar seção ROLLBACK acima     |

---

**FIM DO RUNBOOK - READY TO EXECUTE**

**Tempo estimado total:** 90 minutos  
**Última atualização:** 2026-01-22

---

**COMEÇAR AGORA:**

```powershell
# Copiar/colar BLOCO 1 primeiro
$env:NODE_ENV='test'
# ... (seguir sequência)
```
