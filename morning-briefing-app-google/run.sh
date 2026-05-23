#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# 1. Confirm Ollama is reachable
OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"
if ! curl -s -f "$OLLAMA_HOST/api/tags" >/dev/null; then
  echo "⚠  Ollama not reachable at $OLLAMA_HOST"
  echo "   Start it with:  brew services start ollama"
  echo "   Or download:    https://ollama.com/download"
  echo "   Continuing — backend will fall back to non-LLM mode."
fi

# 2. Activate Python venv (create if missing)
if [ ! -d backend/.venv ]; then
  echo "→ creating Python venv"
  python3 -m venv backend/.venv
  ./backend/.venv/bin/pip install --quiet --upgrade pip
  ./backend/.venv/bin/pip install --quiet -e 'backend[dev]'
fi

# 3. Install frontend deps if needed
if [ ! -d frontend/node_modules ]; then
  echo "→ installing frontend deps"
  (cd frontend && npm install --no-audit --no-fund)
fi

# 4. Start backend (port 8000)
echo "→ starting backend on http://localhost:8000"
(cd backend && .venv/bin/uvicorn app.main:app --port 8000 --reload) &
BACKEND_PID=$!

# 5. Start frontend (port 5173)
echo "→ starting frontend on http://localhost:5173"
(cd frontend && npm run dev) &
FRONTEND_PID=$!

trap "echo '→ stopping…'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; wait" INT TERM

echo ""
echo "✓ Backend:  http://localhost:8000  (docs: /docs)"
echo "✓ Frontend: http://localhost:5173"
echo ""
echo "Ctrl+C to stop both."
wait
