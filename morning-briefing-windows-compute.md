# Morning Briefing — Windows Compute Resources

> Hardware, software, and operational requirements for running the morning
> briefing pipeline fully locally on a Windows 11 box with an Intel Arc B580.
> Pairs with `morning-briefing-agent-design.md` (system architecture) and
> `morning-briefing-poc-frontend-design.md` (frontend POC).

---

## 1. Purpose

Run the entire briefing pipeline — Gmail/Calendar fetch, classification,
extraction, ranking — **on the user's own machine** with no cloud LLM
dependency. The motivation:

- **Privacy.** Email bodies never leave the device.
- **Cost.** $0/month in LLM API spend.
- **Latency.** No network round-trip per message; local GPU inference.

This document is scoped to **single-user / few-user productivity** use.
It does *not* cover multi-tenant SaaS hosting.

---

## 2. Target Hardware

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │  REFERENCE BUILD                                                       │
   │                                                                        │
   │   CPU    Intel Core Ultra 7 265KF (Arrow Lake)                         │
   │          20 cores (8P + 12E), no integrated graphics                   │
   │                                                                        │
   │   GPU    Intel Arc B580 (Battlemage)                                   │
   │          12 GB GDDR6, 456 GB/s memory bandwidth                        │
   │                                                                        │
   │   RAM    32 GB DDR5                                                    │
   │                                                                        │
   │   SSD    60 GB free (system drive)                                     │
   │                                                                        │
   │   OS     Windows 11 (24H2 or later)                                    │
   └────────────────────────────────────────────────────────────────────────┘
```

### Why these specs matter

| Component | Role in the pipeline | Sizing rule |
|---|---|---|
| GPU VRAM | Holds the active LLM weights + KV cache | Must be ≥ model size + ~25% for context |
| System RAM | Spillover when VRAM is exceeded; OS / Ollama runtime | 32 GB lets you run other apps while inferring |
| CPU | Tokenization, pre/post-processing, fallback inference | 8P cores ample; E-cores idle most of the run |
| SSD | Model files (kept on disk between runs) | ~15 GB for the recommended pair |

The **B580's 12 GB VRAM is the critical number** — it dictates which models
can be resident at full speed.

---

## 3. Software Stack

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │                                                                        │
   │   Briefing backend (Python / Node)                                     │
   │       │                                                                │
   │       │  OpenAI-compatible HTTP calls                                  │
   │       ▼                                                                │
   │   ┌─────────────────────────────────────────────────────────────┐     │
   │   │  Ollama  (http://localhost:11434)                           │     │
   │   │  ───────────────────────────────                            │     │
   │   │  • Manages model lifecycle (load / unload / swap)           │     │
   │   │  • Exposes /v1/chat/completions (OpenAI shape)              │     │
   │   │  • Uses Vulkan backend for Intel Arc GPU acceleration       │     │
   │   └─────────────────────────────────────────────────────────────┘     │
   │       │                                                                │
   │       │  GPU compute via Vulkan                                        │
   │       ▼                                                                │
   │   ┌─────────────────────────────────────────────────────────────┐     │
   │   │  Intel Arc B580 driver + Vulkan runtime                     │     │
   │   └─────────────────────────────────────────────────────────────┘     │
   │                                                                        │
   └────────────────────────────────────────────────────────────────────────┘
```

### Required software

| Layer | Choice | Why |
|---|---|---|
| LLM runtime | **Ollama** (Windows installer from ollama.com) | One-click install, Vulkan backend works on Arc B580 out of the box, OpenAI-compatible API |
| GPU driver | Latest Intel Arc graphics driver (≥32.0.101.6000) | Vulkan + compute drivers; check intel.com/arc |
| Scheduler | Windows Task Scheduler (built-in) | Triggers the daily briefing cron |
| Backend (future) | FastAPI (Python) or Express (Node) | Talks to Google APIs + Ollama |

### Optional / advanced

| Software | When to use it |
|---|---|
| **IPEX-LLM** | For 1.5–2× faster inference than Vulkan-backed Ollama. Requires Conda or Docker setup. |
| **LM Studio** | GUI for evaluating models before wiring them into the pipeline. |
| **Tailscale** | Expose the briefing UI to your phone without opening ports. |

---

## 4. Model Selection & Disk Footprint

The recommended pipeline uses **two models, swapped sequentially**:

| Role | Model | Quant | Disk size | VRAM when loaded |
|---|---|---|---|---|
| Classifier (runs on every msg) | `qwen2.5:7b` | Q4_K_M | 4.7 GB | ~5 GB |
| Extractor (runs on ~15 msgs) | `qwen2.5:14b` | Q4_K_M | 9.0 GB | ~9 GB |
| **Total on disk** | | | **13.7 GB** | |

### Alternative single-model setup

```
   ┌─────────────────────────────────────────────────────────────────────┐
   │  qwen2.5:14b Q4_K_M does BOTH jobs                                  │
   │                                                                     │
   │  • Disk:   9.0 GB                                                   │
   │  • VRAM:   ~9 GB resident, always loaded (no swap)                  │
   │  • Trade:  ~30% slower on classification vs 7B                      │
   │            but eliminates model-swap overhead                       │
   │                                                                     │
   │  Recommended if you value simpler ops over peak speed.              │
   └─────────────────────────────────────────────────────────────────────┘
```

### Disk budget on 60 GB free

```
   60 GB free total
   ─ 20 GB reserved (Windows / apps / swap headroom)
   ─ 14 GB models (7B + 14B)
   ─────────────
   = 26 GB working room
```

Comfortable. If you later want to add a 27B–32B model
(`mistral-small:24b` ~14 GB, `qwen2.5:32b` ~20 GB), you can fit one more
before hitting the recommended 15% Windows-system-drive floor.

To extend further, redirect Ollama's model store to a secondary drive:

```powershell
# System → Environment Variables → New User variable
OLLAMA_MODELS = D:\ollama-models
```

---

## 5. VRAM Allocation Strategy

```
   ┌────────────────────────────────────────────────────────────────────┐
   │                       Arc B580 — 12 GB VRAM                        │
   ├────────────────────────────────────────────────────────────────────┤
   │                                                                    │
   │   Sequential (recommended) — OLLAMA_MAX_LOADED_MODELS=1            │
   │                                                                    │
   │     Phase 1   [qwen2.5:7b ───── 5 GB ──────][ KV cache + free ]    │
   │                                                                    │
   │     ▼ unload, ▼ load                                               │
   │                                                                    │
   │     Phase 2   [qwen2.5:14b ─────── 9 GB ────────][ KV + free ]     │
   │                                                                    │
   │   Swap penalty: ~3–5 sec per swap. Once per briefing run.          │
   │                                                                    │
   ├────────────────────────────────────────────────────────────────────┤
   │                                                                    │
   │   Concurrent (NOT recommended) — OLLAMA_MAX_LOADED_MODELS=2        │
   │                                                                    │
   │     [qwen2.5:7b ── 5 GB ──][qwen2.5:14b ── 9 GB ──]  = 14 GB       │
   │                                              ▲                     │
   │                                              │ overflows 12 GB     │
   │                                                                    │
   │     Result: 14B spills to system RAM → 2–4× slower inference       │
   │                                                                    │
   └────────────────────────────────────────────────────────────────────┘
```

**Use sequential.** The briefing runs unattended at 06:30 — the 3–5 second
model swap is invisible.

---

## 6. Performance Expectations

Benchmarks calibrated against published Battlemage / RTX 4060-class numbers
for Vulkan-backed Ollama. Expect ±30% on your specific build.

### Per-model throughput

| Model | Tokens/sec | Notes |
|---|---|---|
| `qwen2.5:7b` Q4_K_M | 50–80 | Fully in VRAM |
| `qwen2.5:14b` Q4_K_M | 20–35 | Fully in VRAM |
| `mistral-small:24b` Q4_K_S | 10–18 | Tight VRAM fit |
| `qwen3:30b-a3b` (MoE) Q4 | 30–50 | 30B params total, 3B active — fast |
| `qwen2.5:32b` Q4 | 4–8 | Spills to RAM — avoid |

### Daily briefing wall-clock time

Assumes 80 incoming messages, 15 flagged for extraction, 1500 token bodies.

| Pipeline | Time |
|---|---|
| 7B classifier + 14B extractor (sequential) | **~3–5 min** |
| 14B does everything (single model) | **~3–4 min** |
| 7B classifier + 30B-A3B MoE extractor | **~2–3 min** (fastest) |

Runs at 06:30 while the user is asleep. Total elapsed time is irrelevant
within reason.

### IPEX-LLM speedup (optional)

Switching from Vulkan-backed Ollama to Intel's IPEX-LLM runtime:
- 7B inference: ~80 → ~140 tok/s
- 14B inference: ~25 → ~45 tok/s

Worth the setup cost only if you find Ollama performance limiting.

---

## 7. Setup Steps

### 7.1 Driver + runtime

```powershell
# 1. Install / update Intel Arc graphics driver
#    https://www.intel.com/content/www/us/en/download-center/home.html
#    Confirm via: dxdiag → Display tab → driver version ≥ 32.0.101.6000

# 2. Install Ollama
#    Download installer from https://ollama.com/download/windows
#    Default install location is fine.

# 3. Confirm Ollama sees the GPU
ollama serve   # in one terminal
# (in another terminal)
ollama run qwen2.5:7b "hello"
# Watch for "using Vulkan" or "using GPU" in `ollama serve` logs
```

### 7.2 Pull models

```powershell
ollama pull qwen2.5:7b
ollama pull qwen2.5:14b

# Verify
ollama list
# Expected: both rows, ~5 GB + ~9 GB on disk
```

### 7.3 Environment configuration

Add as User Environment Variables (Win + R → `sysdm.cpl` → Advanced → Environment Variables):

```
OLLAMA_MAX_LOADED_MODELS = 1
OLLAMA_HOST              = 127.0.0.1:11434
OLLAMA_KEEP_ALIVE        = 30m
```

Restart Ollama (right-click tray icon → Quit → relaunch) to pick them up.

### 7.4 Sanity-check the pipeline shape

```powershell
# Classification probe
curl http://localhost:11434/v1/chat/completions `
  -H "Content-Type: application/json" `
  -d '{
    \"model\": \"qwen2.5:7b\",
    \"messages\": [{\"role\":\"user\",\"content\":\"Classify: From: priya@bigco.com Subject: Q3 deck needs review by EOD. Output JSON: {category, is_noise, intent, urgency}\"}],
    \"response_format\": {\"type\": \"json_object\"}
  }'
```

Should return a JSON-shaped reply in under 2 seconds.

---

## 8. Background Scheduling

```
   ┌─────────────────────────────────────────────────────────────────────┐
   │   Windows Task Scheduler                                            │
   │   ──────────────────────                                            │
   │                                                                     │
   │   Trigger:    Daily at 06:30 local time                             │
   │   Action:     Run briefing script (PowerShell or Python)            │
   │   Conditions:                                                       │
   │     • Wake the computer to run this task   ✓                        │
   │     • Run only if network is available     ✓                        │
   │     • Stop if it runs longer than 30 min   ✓                        │
   │                                                                     │
   │   The script does:                                                  │
   │     1. Hit Gmail + Calendar APIs (Google client lib)                │
   │     2. POST classification batch to Ollama                          │
   │     3. POST extraction batch to Ollama                              │
   │     4. Write briefing JSON to SQLite / Postgres                     │
   │     5. (Optional) push notification to phone via ntfy / Pushover    │
   └─────────────────────────────────────────────────────────────────────┘
```

### Power settings

The PC must be **awake or wake-on-schedule capable** at 06:30. Two options:

- **Always-on**: leave the machine running. Idle power draw ~30–50 W → ~$3–5/month at typical US electricity rates.
- **Wake-on-schedule**: in Settings → System → Power, allow timers to wake the device. Task Scheduler can then wake from sleep.

Laptop in a clamshell with no power → briefing won't run. Plug it in.

---

## 9. Cost Summary

### One-time

| Item | Cost |
|---|---|
| Hardware (already owned) | $0 |
| Software (Ollama, drivers, models — all free) | $0 |
| Setup time | ~30 min |

### Recurring (per month)

| Item | Cost |
|---|---|
| LLM inference (local) | **$0** |
| Google APIs (Gmail + Calendar read-only) | **$0** |
| Electricity (machine always-on, ~40 W avg) | ~$3–5 |
| Optional VPS for remote access ($5/mo Fly.io or similar) | $0–5 |
| **Total** | **~$3–10 / month** |

Comparison vs cloud-LLM stack from `morning-briefing-cost-estimate`:
- Cloud (Claude Haiku + Sonnet, 1 user): ~$3–6/month in API spend
- **Local on this hardware: ~$3–5/month in electricity** — same ballpark, with full privacy + no rate limits.

---

## 10. Capacity & Scaling Thresholds

When to upgrade what:

| Symptom | Likely cause | Fix |
|---|---|---|
| Briefing takes > 15 min | Model swap thrashing, or chose 32B | Switch to single 14B, or upgrade VRAM |
| Extraction quality feels low | 14B not enough for nuanced asks | Try `qwen3:30b-a3b` MoE, or hybrid (local classifier + Claude Haiku extractor) |
| Ollama crashes / OOM | KV cache + model > 12 GB | Reduce context window in Ollama params, or drop to 7B-only |
| SSD < 15% free | Models + other apps | Move models to secondary drive via `OLLAMA_MODELS` |
| Need to run while machine is off | Local-only can't | Hybrid: classifier local, extractor on Claude (~$1–2/mo) |

### Hardware upgrade triggers

| Need | What to add |
|---|---|
| Faster inference | Swap from Vulkan-Ollama to IPEX-LLM (free, software-only) |
| Run 30B+ extractor at full speed | GPU with 16+ GB VRAM (RTX 4080/5070 Ti, or Arc B770 when released) |
| Run 70B-class model | 24+ GB VRAM (RTX 4090, 5080) or 64+ GB unified-memory Mac |

For the single/few-user scope this document targets, **no upgrades are needed**. The B580 + 14B model is sufficient.

---

## 11. Honest Tradeoffs vs Cloud LLM

| Dimension | Local (this doc) | Cloud (Claude API) |
|---|---|---|
| Privacy | Email bodies never leave the device | Bodies sent to Anthropic (30-day retention) |
| Cost | ~$0 ongoing | ~$3–6/user/month |
| Extraction quality | ~85–92% of Claude Sonnet | Reference (best) |
| Briefing latency | 3–5 min | 20–40 sec |
| Runs when machine off | No | Yes |
| Rate limits | None | API tier limits |
| Setup complexity | One installer + 2 model pulls | API key only |
| Model updates | Manual `ollama pull` | Automatic |

For a personal productivity tool on a desktop that's already powered on,
**local is the right answer**. For multi-user, mobile-first, or
"briefing must arrive at 6:30 sharp regardless of PC state",
the hybrid or cloud paths are better.

---

*v0.1 · 2026-05-23*
