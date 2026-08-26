# Sentinel Workers — All-in-One Autonomous System Launcher
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SENTINEL WORKERS — AUTONOMOUS HEAT-RISK PREVENTION" -ForegroundColor Yellow
Write-Host "  Starting API (3001), Dashboard (3000), & Risk Service (8000)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Ensure Python Virtual Environment exists
if (-not (Test-Path ".venv/Scripts/python.exe")) {
    Write-Host "[1/3] Creating Python virtual environment (.venv)..." -ForegroundColor Green
    python -m venv .venv
    Write-Host "[2/3] Installing Python requirements into .venv..." -ForegroundColor Green
    .venv/Scripts/pip.exe install -r apps/risk-service/requirements.txt
} else {
    Write-Host "[1/2] Python virtual environment (.venv) detected." -ForegroundColor Green
}

# 2. Start all services concurrently
Write-Host "[2/2] Launching Sentinel Services via concurrently..." -ForegroundColor Green
npm run dev
