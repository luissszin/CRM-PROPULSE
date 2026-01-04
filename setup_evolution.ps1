# Setup Evolution API Script
# Verifica se Docker está rodando
$dockerStatus = docker ps 2>&1
if ($LastExitCode -ne 0) {
    Write-Host "❌ Erro: Docker não parece estar rodando." -ForegroundColor Red
    Write-Host "Por favor, inicie o Docker Desktop e tente novamente."
    exit 1
}

# Remove container anterior se existir
docker rm -f evolution_api 2>$null

# Roda o container
Write-Host "🚀 Iniciando Evolution API..." -ForegroundColor Cyan
docker run -d `
  --name evolution_api `
  -p 8080:8080 `
  -e AUTHENTICATION_API_KEY=MINHA_API_KEY `
  atendai/evolution-api:latest

if ($LastExitCode -eq 0) {
    Write-Host "✅ Container iniciado com sucesso!" -ForegroundColor Green
    Write-Host "⏳ Aguardando 10 segundos para inicialização..."
    Start-Sleep -Seconds 10
    
    # Teste básico
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -Method Get -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ API respondendo em http://localhost:8080" -ForegroundColor Green
    } else {
        Write-Host "⚠️ API iniciada, mas endpoint raiz não respondeu 200. Verifique os logs: docker logs evolution_api" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Falha ao iniciar container." -ForegroundColor Red
}
