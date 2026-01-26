$ErrorActionPreference = "Stop"

function Print-Header($title) {
    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host " $title" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
}

Print-Header "VALIDAÇÃO MANUAL DE PRODUÇÃO (CLIENTE-SIDE)"

# 1. Configuração Interativa
$CRM_URL = Read-Host "Digite a URL do CRM Backend (ex: https://crm.seudominio.com)"
if ([string]::IsNullOrWhiteSpace($CRM_URL)) { Write-Error "URL do CRM é obrigatória"; exit 1 }

$EVO_URL = Read-Host "Digite a URL da Evolution API (ex: https://whatsapp.seudominio.com)"
if ([string]::IsNullOrWhiteSpace($EVO_URL)) { Write-Error "URL da Evolution é obrigatória"; exit 1 }

$ADMIN_EMAIL = Read-Host "Digite o Email de Admin do CRM"
if ([string]::IsNullOrWhiteSpace($ADMIN_EMAIL)) { $ADMIN_EMAIL = "admin@teste.com" }

$ADMIN_PASS = Read-Host "Digite a Senha de Admin do CRM" -AsSecureString
$ADMIN_PASS_PLAIN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($ADMIN_PASS))

# 2. Health Checks
Print-Header "1. HEALTH CHECKS"

try {
    Write-Host "Checking CRM ($CRM_URL/health)..." -NoNewline
    $res = Invoke-RestMethod -Uri "$CRM_URL/health" -TimeoutSec 10
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "Detalhe: $($_.Exception.Message)"
}

try {
    Write-Host "Checking Evolution ($EVO_URL/health)..." -NoNewline
    $res = Invoke-RestMethod -Uri "$EVO_URL/health" -TimeoutSec 10
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "Detalhe: $($_.Exception.Message)"
}

# 3. Login Check
Print-Header "2. LOGIN TEST"

$token = $null
try {
    $body = @{ email = $ADMIN_EMAIL; password = $ADMIN_PASS_PLAIN } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$CRM_URL/admin/login" -Method POST -Body $body -ContentType "application/json"
    $token = $res.accessToken
    Write-Host "Login Admin: SUCESSO" -ForegroundColor Green
    Write-Host "Token obtido (primeiros 10 chars): $($token.Substring(0,10))..." -ForegroundColor Gray
} catch {
    Write-Host "Login Admin: FALHA" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)"
    Write-Host "Não é possível continuar os testes autenticados."
    exit 1
}

# 4. Listar Instâncias
Print-Header "3. STATUS WHATSAPP"

try {
    # Obter primeiro unitId
    $units = Invoke-RestMethod -Uri "$CRM_URL/admin/units" -Headers @{ Authorization = "Bearer $token" }
    if ($units.Count -eq 0) {
        Write-Host "Nenhuma unidade encontrada para testar." -ForegroundColor Yellow
    } else {
        $unitId = $units[0].id
        Write-Host "Testando Unidade: $($units[0].name) ($unitId)"
        
        $status = Invoke-RestMethod -Uri "$CRM_URL/units/$unitId/whatsapp/status" -Headers @{ Authorization = "Bearer $token" }
        Write-Host "Status Atual: " -NoNewline
        if ($status.status -eq 'connected') {
            Write-Host "CONECTADO 🟢" -ForegroundColor Green
        } else {
            Write-Host "$($status.status) 🟡" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Erro ao buscar status: $($_.Exception.Message)" -ForegroundColor Red
}

Print-Header "RESULTADO FINAL"
Write-Host "Execute este script novamente quando terminar o deploy para validar." -ForegroundColor Cyan
