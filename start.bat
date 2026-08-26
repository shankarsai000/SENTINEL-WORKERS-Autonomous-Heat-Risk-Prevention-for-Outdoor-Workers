@echo off
echo ============================================================
echo   SENTINEL WORKERS -- AUTONOMOUS HEAT-RISK PREVENTION
echo   Starting API (3001), Dashboard (3000), ^& Risk Service (8000)
echo ============================================================

if not exist ".venv\Scripts\python.exe" (
    echo [1/3] Creating Python virtual environment (.venv)...
    python -m venv .venv
    echo [2/3] Installing Python requirements into .venv...
    .venv\Scripts\pip.exe install -r apps\risk-service\requirements.txt
) else (
    echo [1/2] Python virtual environment (.venv) detected.
)

echo [2/2] Launching all services...
npm run dev
