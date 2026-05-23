@echo off
setlocal

cd /d "%~dp0"

REM 1. Confirm Ollama is reachable
if "%OLLAMA_HOST%"=="" set OLLAMA_HOST=http://localhost:11434
curl -s -f "%OLLAMA_HOST%/api/tags" >nul 2>&1
if errorlevel 1 (
  echo  Ollama not reachable at %OLLAMA_HOST%
  echo    Start it from the Ollama tray app, or download:
  echo    https://ollama.com/download
  echo    Continuing - backend will fall back to non-LLM mode.
)

REM 2. Python venv
if not exist backend\.venv (
  echo Creating Python venv...
  python -m venv backend\.venv
  backend\.venv\Scripts\pip install --quiet --upgrade pip
  backend\.venv\Scripts\pip install --quiet -e "backend[dev]"
)

REM 3. Frontend deps
if not exist frontend\node_modules (
  echo Installing frontend deps...
  pushd frontend
  call npm install --no-audit --no-fund
  popd
)

REM 4. Start backend
echo Starting backend on http://localhost:8000
start "morning-briefing-backend" cmd /c "cd backend && .venv\Scripts\uvicorn app.main:app --port 8000 --reload"

REM 5. Start frontend
echo Starting frontend on http://localhost:5173
start "morning-briefing-frontend" cmd /c "cd frontend && npm run dev"

echo.
echo Backend:  http://localhost:8000  (docs: /docs)
echo Frontend: http://localhost:5173
echo.
echo Close the spawned command windows to stop.
