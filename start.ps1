# ============================================================
# rusty-shop — One command to start everything (Windows)
# Usage: .\start.ps1 [-Build] [-Down] [-Logs]
# ============================================================

param(
    [switch]$Build,
    [switch]$Down,
    [switch]$Logs
)

$ProjectDir = $PSScriptRoot

function Write-Banner {
    Write-Host ""
    Write-Host "  ██████  ██    ██ ███████ ████████ ██    ██     ███████ ██   ██  ██████  ██████  " -ForegroundColor Cyan
    Write-Host "  ██   ██ ██    ██ ██         ██     ██  ██      ██      ██   ██ ██    ██ ██   ██ " -ForegroundColor Cyan
    Write-Host "  ██████  ██    ██ ███████    ██      ████       ███████ ███████ ██    ██ ██████  " -ForegroundColor Cyan
    Write-Host "  ██   ██ ██    ██      ██    ██       ██             ██ ██   ██ ██    ██ ██      " -ForegroundColor Cyan
    Write-Host "  ██   ██  ██████  ███████    ██       ██        ███████ ██   ██  ██████  ██      " -ForegroundColor Cyan
    Write-Host ""
}

function Setup-Env {
    $envFile = Join-Path $ProjectDir ".env"
    $envExample = Join-Path $ProjectDir ".env.example"
    if (-not (Test-Path $envFile)) {
        Write-Host "⚙  .env not found — copying from .env.example" -ForegroundColor Yellow
        Copy-Item $envExample $envFile
        Write-Host "✓  .env created. Edit it if needed, then re-run this script." -ForegroundColor Green
    }
}

$composeFile = Join-Path $ProjectDir "docker-compose.yml"

if ($Down) {
    Write-Host "Stopping all containers..." -ForegroundColor Yellow
    docker compose -f $composeFile down
    Write-Host "✓  All containers stopped." -ForegroundColor Green
    exit 0
}

if ($Logs) {
    docker compose -f $composeFile logs -f
    exit 0
}

Write-Banner
Setup-Env

Write-Host "Starting rusty-shop..." -ForegroundColor Cyan

if ($Build) {
    docker compose -f $composeFile up -d --build
} else {
    docker compose -f $composeFile up -d
}

Write-Host ""
Write-Host "✓  All services are up!" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 Frontend  → http://localhost" -ForegroundColor White
Write-Host "  🔌 Backend   → http://localhost:8080/api/v1" -ForegroundColor White
Write-Host "  🗄  Database  → localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "  Logs  : .\start.ps1 -Logs" -ForegroundColor Yellow
Write-Host "  Stop  : .\start.ps1 -Down" -ForegroundColor Yellow
Write-Host "  Rebuild: .\start.ps1 -Build" -ForegroundColor Yellow
Write-Host ""
