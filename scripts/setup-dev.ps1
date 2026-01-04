<#
PowerShell dev setup script for PROPULSE
Run from repo root:
  powershell -ExecutionPolicy Bypass -File .\scripts\setup-dev.ps1
This script will:
 - check for Docker
 - run `docker compose up -d` to start Postgres
 - wait for Postgres to accept connections
 - set DATABASE_URL in the session
 - run `npm run db:apply` and `npm run seed`
 - start backend and frontend dev servers in new PowerShell windows
#>

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "[setup] starting dev setup in $root"

function Fail($msg) {
  Write-Error "[setup] $msg"
  exit 1
}

# Check docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail "Docker CLI not found. Install Docker Desktop and ensure 'docker' is in PATH."
}

Write-Host "[setup] bringing up services with docker compose..."
docker compose up -d

# Wait for Postgres to accept connections
$maxAttempts = 60
$ok = $false
for ($i=1; $i -le $maxAttempts; $i++) {
  $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -WarningAction SilentlyContinue
  if ($tcp -and $tcp.TcpTestSucceeded) { $ok = $true; break }
  Write-Host "[setup] waiting for Postgres to be ready ($i/$maxAttempts)..."
  Start-Sleep -Seconds 2
}
if (-not $ok) { Fail "Postgres did not start within timeout." }

# Set DATABASE_URL for this session
$env:DATABASE_URL = "postgresql://propulse:propulse@127.0.0.1:5432/propulse"
Write-Host "[setup] DATABASE_URL set for this session"

# Apply schema
Write-Host "[setup] applying DB schema (npm run db:apply)"
$rc = & npm run db:apply
if ($LASTEXITCODE -ne 0) { Fail "db:apply failed with exit code $LASTEXITCODE" }

# Seed data
Write-Host "[setup] running seed script (npm run seed)"
$rc = & npm run seed
if ($LASTEXITCODE -ne 0) { Fail "seed script failed with exit code $LASTEXITCODE" }

# Start backend dev server in new window
Write-Host "[setup] starting backend dev server in a new PowerShell window"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev"

# Start frontend dev server in new window
$frontendDir = Join-Path $root 'frontend'
Write-Host "[setup] starting frontend dev server in a new PowerShell window"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; npm run dev"

Write-Host "[setup] done. Frontend should be at http://localhost:8081 and backend at http://localhost:3000"
