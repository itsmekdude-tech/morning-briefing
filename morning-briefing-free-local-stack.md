# Morning Briefing — Free Local Stack (Full Implementation)

> End-to-end implementation of the briefing app using only free, open-source
> tools running on the user's own hardware. Frontend (React) + backend
> (FastAPI) + LLM (Ollama) + storage (SQLite). Cross-platform: macOS + Windows.
>
> Pairs with `morning-briefing-agent-design.md` (architecture), and replaces
> the mock-only `morning-briefing-poc/` with a working LLM pipeline.

---

## 1. Purpose

Take the mock-data POC at `morning-briefing-poc/` and turn it into a **real
working system** by:

1. **Copying the frontend** wholesale (preserves the design + tests).
2. **Adding a Python FastAPI backend** that exposes the same API contract.
3. **Wiring Ollama** as the local LLM for classification + extraction.
4. **Keeping the mock inbox data** for now — Google API integration is a
   later step (the MD describes how it'll plug in).

The result: a real LLM pipeline that processes mock email data through
`qwen2.5:3b` (or larger models on capable hardware) and produces real
briefings — same UI, same components, same tests.

### Why this is "phase 2" rather than "v1"

| Layer | Phase 1 (POC, done) | Phase 2 (this doc) | Phase 3 (later) |
|---|---|---|---|
| Frontend | Mock data only | **Real backend calls** | unchanged |
| Backend | n/a | **FastAPI + Ollama + SQLite** | + Google OAuth + Gmail/Calendar fetch |
| LLM | none | **Local Ollama (qwen2.5:3b)** | configurable cloud fallback |
| Data | hardcoded JSON | **mock inbox JSON → LLM pipeline** | live Gmail fetch |

---

## 2. Architecture

```
   ┌─────────────────────────────────────────────────────────────────────────┐
   │  BROWSER                                                                │
   │   ┌───────────────────────────────────────────────────────────────┐    │
   │   │  React frontend (copied from morning-briefing-poc/)           │    │
   │   │   ─ same components, same tests, same B&W design              │    │
   │   │   ─ realApi.ts replaces mockApi.ts (or toggles via env)       │    │
   │   └───────────────────────────────┬───────────────────────────────┘    │
   │                                   │ HTTP (JSON)                        │
   └───────────────────────────────────┼────────────────────────────────────┘
                                       ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │  LOCAL MACHINE                                                          │
   │                                                                         │
   │   ┌───────────────────────────────────────────────────────────────┐    │
   │   │  FastAPI backend  (http://localhost:8000)                     │    │
   │   │   ─ /api/briefing, /api/briefing/refresh                      │    │
   │   │   ─ /api/items/{id}/{noise|useful|snooze}                     │    │
   │   │   ─ /api/actions/{id}/complete                                │    │
   │   │   ─ /api/auth/status (stub until Phase 3)                     │    │
   │   └──────────┬──────────────────────────────┬───────────────────┘     │
   │              │                              │                          │
   │              │ briefing pipeline            │ load raw inbox           │
   │              ▼                              ▼                          │
   │   ┌────────────────────────┐   ┌──────────────────────────┐           │
   │   │  Ollama HTTP client    │   │  Mock inbox loader       │           │
   │   │  (OpenAI-compatible)   │   │  backend/mocks/*.json    │           │
   │   └──────────┬─────────────┘   └──────────────────────────┘           │
   │              │                                                         │
   │              │ POST /v1/chat/completions                               │
   │              ▼                                                         │
   │   ┌────────────────────────────────────────────────────────────┐      │
   │   │  Ollama daemon  (http://localhost:11434)                   │      │
   │   │   ─ classifier model:  qwen2.5:3b   (configurable)         │      │
   │   │   ─ extractor model:   qwen2.5:3b   (configurable)         │      │
   │   └──────────┬─────────────────────────────────────────────────┘      │
   │              │                                                         │
   │              ▼                                                         │
   │   ┌────────────────────────────────────────────────────────────┐      │
   │   │  Local LLM weights  (~2 GB for qwen2.5:3b Q4_K_M)          │      │
   │   │  Inference on Apple Silicon / AMD GPU / Intel GPU / CPU    │      │
   │   └────────────────────────────────────────────────────────────┘      │
   │                                                                         │
   │   ┌────────────────────────────────────────────────────────────┐      │
   │   │  SQLite  (data/briefing.db)                                │      │
   │   │   ─ briefings (jsonb-style TEXT column)                    │      │
   │   │   ─ user_feedback (sender_id → useful|noise weight)        │      │
   │   └────────────────────────────────────────────────────────────┘      │
   │                                                                         │
   └─────────────────────────────────────────────────────────────────────────┘

   No cloud. No paid APIs. No data leaves the device.
```

---

## 3. Repository Layout

```
   kb-exploration/
   ├── morning-briefing-poc/             ← Phase 1 (unchanged, kept as reference)
   ├── morning-briefing-app/             ← Phase 2 (this implementation)
   │   ├── README.md                     ← quick start (mac + windows)
   │   ├── run.sh                        ← Mac/Linux: starts ollama + backend + frontend
   │   ├── run.bat                       ← Windows: same
   │   │
   │   ├── frontend/                     ← copied from morning-briefing-poc/
   │   │   ├── package.json
   │   │   ├── src/
   │   │   │   ├── services/
   │   │   │   │   ├── api.ts            ← thin client; picks real vs mock by env
   │   │   │   │   ├── realApi.ts        ← hits FastAPI at VITE_API_BASE
   │   │   │   │   └── mockApi.ts        ← unchanged from POC
   │   │   │   └── ... (rest unchanged)
   │   │   └── tests/                    ← unchanged
   │   │
   │   └── backend/
   │       ├── pyproject.toml            ← deps: fastapi, httpx, uvicorn, sqlmodel, apscheduler, pytest
   │       ├── .env.example              ← OLLAMA_HOST, model names, db path
   │       ├── app/
   │       │   ├── main.py               ← FastAPI app + lifespan
   │       │   ├── config.py             ← pydantic Settings (env-driven)
   │       │   ├── api/
   │       │   │   ├── briefing.py       ← endpoints
   │       │   │   ├── items.py
   │       │   │   ├── actions.py
   │       │   │   └── auth.py           ← stub (real OAuth in Phase 3)
   │       │   ├── pipeline/
   │       │   │   ├── ollama_client.py  ← httpx wrapper for /v1/chat/completions
   │       │   │   ├── classifier.py     ← per-message classification (category, is_noise, urgency)
   │       │   │   ├── extractor.py      ← per-message action item extraction
   │       │   │   ├── ranker.py         ← score = urgency*0.5 + sender_weight*0.3 + recency*0.2
   │       │   │   └── assembler.py      ← raw inbox → Briefing
   │       │   ├── data/
   │       │   │   ├── models.py         ← SQLModel: Briefing, FeedbackWeight
   │       │   │   ├── db.py             ← engine + session
   │       │   │   └── repo.py           ← persist + load briefings
   │       │   ├── sources/
   │       │   │   ├── mock_inbox.py     ← loads backend/mocks/raw_inbox_*.json
   │       │   │   └── gmail.py          ← (placeholder for Phase 3)
   │       │   └── types.py              ← Pydantic models matching the frontend's types
   │       ├── mocks/
   │       │   ├── raw_inbox_hersh.json  ← flat unclassified message list (~30 msgs)
   │       │   ├── raw_inbox_founder.json
   │       │   └── raw_inbox_student.json
   │       └── tests/
   │           ├── test_classifier.py
   │           ├── test_extractor.py
   │           ├── test_assembler.py
   │           ├── test_api.py
   │           └── conftest.py
   │
   └── (existing design docs)
```

**Why a new sibling dir** (`morning-briefing-app/`) instead of extending
`morning-briefing-poc/`: the POC stays clean as a reference; the full app
gets a fresh top-level with its own tooling. Copying is one command.

---

## 4. Tech Stack — All Free

### Backend

| Component | Choice | Why |
|---|---|---|
| Web framework | **FastAPI** | Async, auto-docs, pydantic types match TS types cleanly |
| ASGI server | **uvicorn** | Standard for FastAPI |
| HTTP client | **httpx** | Async, used to call Ollama |
| ORM | **SQLModel** | Pydantic + SQLAlchemy in one |
| DB | **SQLite** | File-based, no install, perfect for single-user |
| Scheduler | **APScheduler** | Cross-platform in-process cron (no system task scheduler needed) |
| Config | **pydantic-settings** | `.env` files, env vars, type-safe |
| Tests | **pytest** + **httpx.AsyncClient** | Standard FastAPI testing |

### LLM

| Component | Choice | Why |
|---|---|---|
| Runtime | **Ollama** | Single install on Mac + Windows + Linux, OpenAI-compatible API |
| Model (default) | **`qwen2.5:3b`** Q4_K_M | 2 GB on disk, fits 4 GB VRAM, runs on the user's Intel Mac |
| Model (Windows / Apple Silicon) | **`qwen2.5:7b`** or **`qwen2.5:14b`** | Better quality where hardware allows |
| Wire format | OpenAI Chat Completions JSON | Drop-in compatible if user ever swaps to a hosted API |

### Frontend (unchanged from POC)

| Component | Choice |
|---|---|
| Framework | React + Vite + TypeScript |
| Router | react-router-dom |
| Data | @tanstack/react-query |
| UI state | zustand |
| Styling | Tailwind CSS (B&W + one accent) |
| Tests | Vitest + React Testing Library |

**Total third-party cost: $0.** All open source. Runs on the laptop you
already own.

---

## 5. LLM Pipeline

### 5.1 The two-stage pipeline

```
   raw inbox (mock or future Gmail)
            │
            ▼
   ┌─────────────────────────────────┐
   │  STAGE 1 — CLASSIFIER           │
   │  per-message, ~80 messages      │
   │                                 │
   │  In:  subject, from, snippet,   │
   │       list-id, gmail label hint │
   │  Out: { category, is_noise,     │
   │         intent, urgency 0-3 }   │
   │                                 │
   │  Model: qwen2.5:3b (default)    │
   │  Output: JSON via response_format│
   └──────────────┬──────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────┐
   │  STAGE 2 — EXTRACTOR            │
   │  only on intent=action_required │
   │  or sender ∈ important set      │
   │  (~15 of the 80)                │
   │                                 │
   │  In:  subject, sender, body     │
   │  Out: { ask, due, who, confidence }│
   │                                 │
   │  Model: qwen2.5:3b (or larger)  │
   └──────────────┬──────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────┐
   │  ASSEMBLER                      │
   │   ─ group by section            │
   │   ─ apply sender feedback weights│
   │   ─ rank within section         │
   │   ─ split kept vs filtered      │
   │   ─ output: Briefing            │
   └─────────────────────────────────┘
```

### 5.2 Classifier prompt (sketch)

```
SYSTEM: You classify emails into one of: primary, updates, forums, promotions.
Output ONLY a JSON object with: category, is_noise (bool), intent
(one of: action_required, fyi, transactional, marketing, newsletter, social),
urgency (0=ignore, 1=low, 2=medium, 3=high).

USER: From: <sender_name> <<email>>
Subject: <subject>
Snippet: <first 200 chars>
Gmail category hint: <if any>
List-Id: <if any>

ASSISTANT: { "category": "...", "is_noise": ..., "intent": "...", "urgency": ... }
```

Sent with `response_format: { type: "json_object" }` so Ollama enforces
valid JSON.

### 5.3 Extractor prompt (sketch)

```
SYSTEM: Extract any action item from this email. If none, return null.
Otherwise return JSON: { ask, due (ISO date or null), who_asked, confidence (0-1) }.

USER: From: <sender>
Subject: <subject>
Body: <truncated to 2000 chars>

ASSISTANT: { "ask": "...", "due": "2026-05-23", "who_asked": "Priya Shah", "confidence": 0.92 }
```

### 5.4 Configurable models

All model names live in `.env`:

```bash
OLLAMA_HOST=http://localhost:11434
OLLAMA_CLASSIFIER_MODEL=qwen2.5:3b
OLLAMA_EXTRACTOR_MODEL=qwen2.5:3b
OLLAMA_TIMEOUT_SECONDS=120
```

On the Mac, you keep both at `qwen2.5:3b`. On the Windows box with the
Arc B580, you can flip to:

```bash
OLLAMA_CLASSIFIER_MODEL=qwen2.5:7b
OLLAMA_EXTRACTOR_MODEL=qwen2.5:14b
```

Same code, better quality.

---

## 6. API Contract (Backend ↔ Frontend)

The backend exposes exactly the methods the frontend's `mockApi.ts`
already calls — so the frontend swap is trivial.

| Method | Route | Returns |
|---|---|---|
| Get current briefing | `GET /api/briefing?personaId=hersh` | `Briefing` |
| Force regenerate (runs LLM pipeline) | `POST /api/briefing/refresh?personaId=hersh` | `Briefing` |
| Mark item as noise | `POST /api/items/{item_id}/noise?personaId=hersh` | `Briefing` |
| Mark item as useful | `POST /api/items/{item_id}/useful?personaId=hersh` | `Briefing` |
| Complete action item | `POST /api/actions/{action_id}/complete?personaId=hersh` | `Briefing` |
| Snooze item | `POST /api/items/{item_id}/snooze?personaId=hersh` (body: `{until}`) | `Briefing` |
| Auth status (stub) | `GET /api/auth/status` | `{ connected: bool, email?: str }` |
| Connect (stub) | `POST /api/auth/connect` | `{ status, email }` |

The `Briefing` shape is the same Pydantic model as the TS `Briefing` type
in the POC frontend.

---

## 7. Cross-Platform Setup

### 7.1 macOS (the user's Intel MBP)

```bash
# One-time
brew install ollama python@3.11 node
brew services start ollama
ollama pull qwen2.5:3b   # ~2 GB, the user already has this installed

# Per project
cd morning-briefing-app
./run.sh                  # starts backend (port 8000) + frontend (port 5173)
```

### 7.2 Windows 11 (the Arrow Lake + Arc B580 build)

```powershell
# One-time
winget install Ollama.Ollama Python.Python.3.11 OpenJS.NodeJS
ollama pull qwen2.5:3b
# (optional, for better quality on this hardware)
ollama pull qwen2.5:7b
ollama pull qwen2.5:14b

# Per project
cd morning-briefing-app
.\run.bat                 # same — backend + frontend
```

### 7.3 What `run.sh` / `run.bat` actually does

```
   1. Confirm Ollama is reachable on $OLLAMA_HOST (curl /api/tags)
   2. Activate Python venv (create if missing), pip install -e backend/
   3. Start backend:   uvicorn app.main:app --port 8000 --reload &
   4. Start frontend:  cd frontend && npm install && npm run dev &
   5. Print URLs, wait for Ctrl+C, gracefully shut both down
```

Both scripts are 15-line shell wrappers — no Docker, no Make, no monorepo
tools.

---

## 8. Storage (SQLite)

Single file: `morning-briefing-app/backend/data/briefing.db`. Created on
first run. No migrations until the schema actually changes.

```sql
CREATE TABLE briefings (
  id TEXT PRIMARY KEY,             -- uuid
  persona_id TEXT NOT NULL,
  generated_at TEXT NOT NULL,      -- ISO 8601
  payload TEXT NOT NULL            -- full Briefing JSON
);

CREATE INDEX idx_briefings_persona_generated
  ON briefings (persona_id, generated_at DESC);

CREATE TABLE feedback_weights (
  sender_email TEXT PRIMARY KEY,
  weight REAL NOT NULL DEFAULT 0,  -- + useful, - noise; clamped [-2, +2]
  updated_at TEXT NOT NULL
);
```

Mark-noise / mark-useful clicks bump the sender's `weight`. The ranker
adds `weight * 0.3` to each message's score on the next pipeline run.
Over ~2 weeks the filter becomes personal.

---

## 9. Scheduling (Optional)

For the user-triggered "Refresh" button, no scheduler is needed —
the FastAPI endpoint runs the pipeline synchronously.

For an unattended **daily briefing**, two paths:

### 9.1 In-process (default, cross-platform)

Backend starts an APScheduler job at boot:

```python
scheduler.add_job(
    generate_for_all_personas,
    'cron', hour=6, minute=30,
    timezone='America/New_York',
)
```

Pros: zero system config, works the same on Mac + Windows.
Cons: backend must be running at 6:30 AM. Easy if you run `run.sh` and
leave it in a terminal overnight (or run as a launchd/Task Scheduler service).

### 9.2 System scheduler (optional, more robust)

| OS | Tool | Setup |
|---|---|---|
| macOS | launchd | `~/Library/LaunchAgents/com.user.morning-briefing.plist` (sample in repo) |
| Windows | Task Scheduler | Trigger: daily 06:30, action: `run.bat` |

Documented in `README.md` under "Run as a service".

---

## 10. Privacy & Data Boundaries

```
   ┌─────────────────────────────────────────────────────────────────────┐
   │  WHAT NEVER LEAVES YOUR MACHINE                                     │
   │   ✓ Email bodies (sent to Ollama on localhost, not the internet)    │
   │   ✓ Sender addresses                                                │
   │   ✓ Generated briefings                                             │
   │   ✓ Feedback weights                                                │
   │   ✓ Any OAuth tokens (Phase 3)                                      │
   │                                                                     │
   │  WHAT CALLS THE INTERNET                                            │
   │   ✗ Google APIs (Phase 3 only) — over TLS, scoped read-only         │
   │   ✗ Ollama model downloads (one-time, from ollama.com / HF)         │
   │                                                                     │
   │  NO TELEMETRY                                                       │
   │   FastAPI, Ollama, Vite — none of these phone home.                 │
   │   SQLite is a file. The "API" is localhost-only by default.         │
   └─────────────────────────────────────────────────────────────────────┘
```

CORS on the backend is locked to `http://localhost:5173` by default. If
you expose the backend via Tailscale to your phone, add the Tailscale
hostname to `ALLOWED_ORIGINS`.

---

## 11. Cost Summary

### One-time

| Item | Cost |
|---|---|
| Hardware (Mac or Windows box — already owned) | $0 |
| All software (Python, Node, Ollama, models) | $0 |
| Setup time | ~30 min (depends on download speeds for models) |

### Recurring

| Item | Cost |
|---|---|
| LLM inference (local Ollama) | **$0** |
| Backend hosting | $0 (runs on your laptop) |
| Frontend hosting | $0 (runs on your laptop) |
| Database | $0 (SQLite file) |
| Google APIs (Phase 3, when added) | $0 (read-only is free) |
| Electricity (intermittent) | <$1/month |
| **Total** | **~$0 / month** |

---

## 12. Quick Start

After cloning / copying the repo:

### macOS

```bash
# Confirm Ollama is up and the model is installed (the user already did this)
ollama list                        # should show qwen2.5:3b
curl http://localhost:11434/api/tags

# Bring up the app
cd morning-briefing-app
./run.sh

# Open http://localhost:5173 in the browser
# Click "Refresh briefing" — pipeline runs, briefing renders.
```

First refresh takes ~8 minutes on the Intel Mac (qwen2.5:3b for both
classifier + extractor across 30 mock messages). Subsequent refreshes
hit the same time because each run re-classifies fresh.

### Windows 11

Same as above, but `.\run.bat` instead of `./run.sh`. With `qwen2.5:7b`
or `14b` set in `.env`, first refresh is ~1–2 min on the Arc B580.

---

## 13. What Comes After (Phase 3 — out of scope here)

| Component | Phase 2 (now) | Phase 3 (future) |
|---|---|---|
| Inbox source | `backend/mocks/raw_inbox_*.json` | Live Gmail API `users.messages.list` |
| Calendar source | mock JSON | Live Calendar API `events.list` |
| Auth | stub returns `{connected: true, email: "demo@local"}` | Real Google OAuth 2.0 |
| Token storage | n/a | Encrypted (libsodium) in SQLite |
| Multi-user | single persona at a time | per-user briefings + tokens |

The interfaces (`sources/gmail.py` placeholder, `api/auth.py` stub) are
sized for the Phase 3 swap. Frontend doesn't change.

---

## 14. File-by-file Build Order

1. **Copy** `morning-briefing-poc/` → `morning-briefing-app/frontend/`.
2. **Scaffold** `morning-briefing-app/backend/` (pyproject, venv, app skeleton).
3. **Build** `backend/app/pipeline/ollama_client.py` (httpx → Ollama).
4. **Add** `backend/mocks/raw_inbox_hersh.json` (~30 unclassified messages).
5. **Build** `backend/app/pipeline/{classifier,extractor,assembler,ranker}.py`.
6. **Add** `backend/app/data/{db,models,repo}.py` (SQLite + SQLModel).
7. **Wire** `backend/app/api/*.py` endpoints (FastAPI routers).
8. **Test** with pytest (`test_classifier.py` etc.).
9. **Adapt** frontend `src/services/api.ts` to switch real/mock by
   `VITE_API_BASE`. Default to real if set.
10. **Run** `run.sh` (Mac) or `run.bat` (Windows) end-to-end.

---

## 15. Honest Tradeoffs

| Question | Answer |
|---|---|
| Why mock data still? | Lets us prove the LLM pipeline works without Google OAuth friction. Real Gmail = next phase, same pipeline. |
| Why qwen2.5:3b as default? | It's the only model that comfortably fits the Intel Mac's 4 GB VRAM. Quality is acceptable; better models are one env var away. |
| Why local LLM at all? | Free + private. Tradeoff is the 8 min/run on the slow Mac. |
| Why FastAPI not Node? | Best Google API + LLM SDK ecosystem in Python. Single language for the backend is cleaner than mixing JS server + Python ML libs later. |
| Why SQLite not Postgres? | Single user, no concurrent writes, file-based = zero ops. Postgres is fine if you outgrow it. |
| Why no Docker? | Single-user local app. Docker adds complexity (model volume mounts, GPU passthrough on Mac is a non-starter for AMD). |

---

*v0.1 · 2026-05-23*
