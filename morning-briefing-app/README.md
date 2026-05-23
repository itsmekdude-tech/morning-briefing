# Morning Briefing — Full Local App

Free, all-local morning briefing app. React frontend + FastAPI backend + Ollama LLM + SQLite storage.

See [`../docs/morning-briefing-free-local-stack.md`](../docs/morning-briefing-free-local-stack.md) for the full design.

## Prereqs

- **macOS or Windows 11**
- **Python 3.10+** (3.11 recommended)
- **Node 18+**
- **Ollama** with at least one model pulled (default: `qwen2.5:3b`)

```bash
# Mac:
brew install ollama python@3.11 node
brew services start ollama
ollama pull qwen2.5:3b

# Windows:
winget install Ollama.Ollama Python.Python.3.11 OpenJS.NodeJS
ollama pull qwen2.5:3b
```

## Run

```bash
# macOS / Linux
./run.sh

# Windows
.\run.bat
```

The script creates the Python venv on first run (~30 sec), installs deps, then starts:

- **Backend** on `http://localhost:8000` (interactive docs at `/docs`)
- **Frontend** on `http://localhost:5173`

Open the frontend and click **Refresh briefing** to run the LLM pipeline.

## Configuration

Backend: edit `backend/.env` (start from `.env.example`).

| Var | Default | Notes |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | Where Ollama listens |
| `OLLAMA_CLASSIFIER_MODEL` | `qwen2.5:3b` | Use `qwen2.5:7b` or `qwen2.5:14b` on capable hardware |
| `OLLAMA_EXTRACTOR_MODEL` | `qwen2.5:3b` | Larger model usually helps here most |
| `LLM_PIPELINE_ENABLED` | `true` | Set to `false` to skip the LLM and run a pass-through assembler |
| `DEFAULT_PERSONA` | `hersh` | Which mock inbox to load |

Frontend: edit `frontend/.env`.

| Var | Default | Notes |
|---|---|---|
| `VITE_API_BASE` | `http://localhost:8000` | Backend URL |
| `VITE_USE_REAL_API` | `true` | Set to `false` to bypass the backend and use the in-browser mock |

## Tests

```bash
# Backend
cd backend && .venv/bin/pytest

# Frontend
cd frontend && npm test
```

## Project layout

```
morning-briefing-app/
├── run.sh, run.bat        ← one-command launch (Mac / Windows)
├── frontend/              ← React (copied from morning-briefing-poc/)
│   ├── src/services/
│   │   ├── api.ts         ← env-toggled real/mock
│   │   ├── realApi.ts     ← hits FastAPI
│   │   └── mockApi.ts     ← original POC mocks
│   └── (rest unchanged from POC)
└── backend/
    ├── app/
    │   ├── api/           ← FastAPI routers
    │   ├── pipeline/      ← Ollama + classifier + extractor + assembler
    │   ├── data/          ← SQLite + SQLModel
    │   ├── sources/       ← mock inbox loader
    │   └── types.py       ← Pydantic models (= frontend types)
    ├── mocks/             ← raw unclassified inbox JSON per persona
    ├── tests/             ← pytest
    └── pyproject.toml
```

## How a refresh works

1. Frontend `POST /api/briefing/refresh?personaId=hersh`
2. Backend loads `backend/mocks/raw_inbox_hersh.json` (flat list of ~25 messages)
3. Each message goes to Ollama for **classification** (category + is_noise + intent + urgency)
4. Messages flagged `intent=action_required` go to Ollama for **extraction** (ask + due + confidence)
5. Assembler scores and groups everything → `Briefing` JSON
6. Persisted to SQLite, returned to frontend
7. Frontend re-renders with real LLM output

**Wall-clock time on the 2019 Intel MacBook Pro with `qwen2.5:3b`: ~5–10 min** for the hersh persona (25 messages). On the Windows Arc B580 with `qwen2.5:7b`: ~1–2 min.

## Without Ollama

If Ollama is down or unreachable, the backend logs a warning and falls back to a pass-through assembler that uses each message's `gmailCategoryHint` (when present). You still get a working briefing — just without intelligent classification/extraction.

## Next step (Phase 3, not in this version)

- Replace `backend/app/sources/mock_inbox.py` with `gmail.py` (Google API client).
- Replace stub `backend/app/api/auth.py` with real Google OAuth 2.0 flow.
- Add `users` table for multi-account support.
- See `../docs/morning-briefing-agent-design.md` for the full plan.
