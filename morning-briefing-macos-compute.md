# Morning Briefing — macOS Compute Resources (Intel Mac)

> Hardware, software, and operational requirements for running the morning
> briefing pipeline fully locally on a 2019 16" Intel MacBook Pro with an
> AMD Radeon Pro 5300M. Pairs with `morning-briefing-agent-design.md` and
> `morning-briefing-poc-frontend-design.md`.
>
> **Goal:** 100% free, all-local, all-offline. Slowness is acceptable.

---

## 1. Purpose

Run the briefing pipeline — Gmail/Calendar fetch, classification,
extraction, ranking — on the user's existing 2019 Intel MacBook Pro with
**zero ongoing cost** and **no data leaving the device**.

This document accepts the honest tradeoff: this hardware is the *least*
favorable for local LLMs of any current Mac, so the briefing will take
several minutes per run and extraction quality won't match Claude Sonnet.
For an unattended morning task that runs at 06:30, that's fine.

---

## 2. Target Hardware

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │  REFERENCE BUILD (this is the constrained one)                         │
   │                                                                        │
   │   CPU    Intel Core i7, 2.6 GHz, 6-core (12-thread)                    │
   │          9th-gen Coffee Lake mobile                                    │
   │                                                                        │
   │   GPU    AMD Radeon Pro 5300M discrete (4 GB GDDR6)                    │
   │          Intel UHD Graphics 630 integrated (unused for LLM)            │
   │                                                                        │
   │   RAM    32 GB DDR4-2667                                               │
   │                                                                        │
   │   OS     macOS (Intel build — note: macOS 15 Sequoia is the last       │
   │          major release with Intel support)                             │
   │                                                                        │
   │   Form   16" MacBook Pro (2019)                                        │
   └────────────────────────────────────────────────────────────────────────┘
```

### Why this hardware is constrained

| Component | Issue | Implication |
|---|---|---|
| **4 GB VRAM on Radeon Pro 5300M** | Even a 7B Q4 model (~4.5 GB) doesn't fully fit | Most inference happens partly on CPU |
| **AMD GPU on Intel Mac** | The weakest path in the LLM ecosystem; Metal works but isn't well-optimized for AMD discrete GPUs | ~30–50% of comparable Apple Silicon speed |
| **No Apple Silicon Neural Engine / MLX** | MLX (Apple's fast inference framework) is Apple Silicon only | Stuck with llama.cpp Metal backend |
| **DDR4-2667 system RAM** | Slower than DDR5 by ~40% | CPU spillover inference is slower than newer Macs |
| **Mobile CPU under thermal envelope** | Sustained inference will trigger fan curves | Lid open, on a hard surface, plugged in |

### What's good about it

- **32 GB RAM** is generous — models that don't fit in VRAM still fit in system RAM
- **Plenty of disk** for several models simultaneously
- **macOS Metal backend in llama.cpp / Ollama works** — just not at Apple Silicon speeds

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
   │   │  • Uses Metal backend (partial GPU offload on AMD)          │     │
   │   │  • OpenAI-compatible API                                    │     │
   │   └─────────────────────────────────────────────────────────────┘     │
   │       │                                                                │
   │       │  Metal compute (partial GPU, partial CPU)                      │
   │       ▼                                                                │
   │   ┌─────────────────────────────────────────────────────────────┐     │
   │   │  macOS Metal runtime                                        │     │
   │   │    ├─ Radeon Pro 5300M (4 GB) — partial offload             │     │
   │   │    └─ CPU (i7 6-core) — bulk of computation                 │     │
   │   └─────────────────────────────────────────────────────────────┘     │
   │                                                                        │
   └────────────────────────────────────────────────────────────────────────┘
```

### Required software (all free)

| Layer | Choice | Install | Notes |
|---|---|---|---|
| LLM runtime | **Ollama** | `brew install ollama` or download from ollama.com | OpenAI-compatible, simplest path |
| Scheduler | **launchd** | Built into macOS | Triggers daily briefing |
| Backend (future) | FastAPI or Express | `brew install python` / Node | Talks to Google APIs + Ollama |

### Optional alternatives

| Tool | When to use it |
|---|---|
| **LM Studio** | GUI; useful for trying models before committing. Same Metal backend as Ollama under the hood. |
| **llama.cpp** directly | If you want to hand-tune GPU layer offload (`-ngl N`). Ollama abstracts this but you lose fine control. |
| **Tailscale** (free tier) | Access the briefing from your phone without opening ports. |

> ⚠️ **MLX is not an option here.** It only runs on Apple Silicon Macs (M1+).

---

## 4. Model Selection

The 4 GB VRAM is the hard constraint. These are the realistic choices:

| Model | Quant | Disk | VRAM use | RAM spillover | Speed (est.) |
|---|---|---|---|---|---|
| `qwen2.5:3b` | Q4_K_M | 2.0 GB | ~2.5 GB (fits) | none | ~15–25 tok/s |
| `gemma3:4b` | Q4_K_M | 2.5 GB | ~3 GB (fits) | minimal | ~12–20 tok/s |
| `qwen2.5:7b` | Q4_K_M | 4.7 GB | 4 GB max | ~1 GB | ~5–10 tok/s |
| `llama3.1:8b` | Q4_K_M | 4.9 GB | 4 GB max | ~1.5 GB | ~4–8 tok/s |
| `qwen2.5:14b` | Q4_K_M | 9.0 GB | 4 GB max | ~5 GB | ~2–4 tok/s |
| `qwen2.5:32b` | — | — | — | — | **don't** |

### Recommended setup (free, all-local)

```
   ┌─────────────────────────────────────────────────────────────────────┐
   │  TWO-MODEL PIPELINE                                                 │
   │                                                                     │
   │   Classifier:   qwen2.5:3b   Q4_K_M    (2.0 GB on disk)             │
   │                 ───────────────────                                 │
   │                 Fits fully in 4 GB VRAM → GPU-accelerated           │
   │                 Fast enough to classify 80 emails in ~2 min         │
   │                                                                     │
   │   Extractor:    qwen2.5:7b   Q4_K_M    (4.7 GB on disk)             │
   │                 ───────────────────                                 │
   │                 Partial GPU offload + CPU                           │
   │                 Slower but better at structured extraction          │
   │                 ~15 extraction calls in ~5–8 min                    │
   │                                                                     │
   │   Total disk:   6.7 GB                                              │
   │   Total time:   ~8–12 min per briefing                              │
   └─────────────────────────────────────────────────────────────────────┘
```

### Simpler single-model alternative

```
   ┌─────────────────────────────────────────────────────────────────────┐
   │  qwen2.5:7b does EVERYTHING                                         │
   │                                                                     │
   │  • Disk:   4.7 GB                                                   │
   │  • Time:   ~15–25 min per briefing                                  │
   │  • Pros:   One model loaded, no swap, simpler pipeline              │
   │  • Cons:   Slower because 7B is overkill for the easy stuff         │
   │                                                                     │
   │  Use this if you want minimum complexity.                           │
   └─────────────────────────────────────────────────────────────────────┘
```

---

## 5. VRAM & RAM Allocation

```
   ┌────────────────────────────────────────────────────────────────────┐
   │                  Radeon Pro 5300M — 4 GB VRAM                      │
   ├────────────────────────────────────────────────────────────────────┤
   │                                                                    │
   │   With qwen2.5:3b (Q4):                                            │
   │     [model 2.0 GB][KV cache + buffers ~0.8 GB][headroom 1.2 GB]    │
   │     → Fully GPU-accelerated                                        │
   │                                                                    │
   │   With qwen2.5:7b (Q4):                                            │
   │     [model 4 GB (max VRAM holds)][overflow → system RAM ~1 GB]     │
   │     → ~70% GPU, ~30% CPU/RAM. Slower.                              │
   │                                                                    │
   ├────────────────────────────────────────────────────────────────────┤
   │                    System RAM — 32 GB DDR4                         │
   ├────────────────────────────────────────────────────────────────────┤
   │                                                                    │
   │   [macOS + apps ~6 GB][Ollama runtime ~1 GB][model spillover N GB] │
   │                                                                    │
   │   Plenty of headroom even with the 14B model fully on CPU.         │
   │                                                                    │
   └────────────────────────────────────────────────────────────────────┘
```

**Sequential model loading (single-model-at-a-time)** is mandatory:

```
OLLAMA_MAX_LOADED_MODELS=1
```

With only 4 GB VRAM, attempting to keep two models loaded forces both to
fight for GPU memory and one will end up entirely on CPU.

---

## 6. Performance Expectations

These are honest estimates for the 2019 Intel MacBook Pro with Radeon Pro 5300M.
Apple Silicon Macs are 3–5× faster; Windows + Intel Arc is 5–10× faster on
this same workload.

### Per-model throughput

| Model | GPU offload | Tokens/sec |
|---|---|---|
| `qwen2.5:3b` Q4_K_M | full | 15–25 |
| `gemma3:4b` Q4_K_M | full | 12–20 |
| `qwen2.5:7b` Q4_K_M | partial (~70%) | 5–10 |
| `llama3.1:8b` Q4_K_M | partial (~65%) | 4–8 |
| `qwen2.5:14b` Q4_K_M | minimal (CPU-bound) | 2–4 |

### Daily briefing wall-clock time

Assumes 80 incoming messages, 15 flagged for extraction.

| Pipeline | Time |
|---|---|
| 3B classifier + 7B extractor (recommended) | **~8–12 min** |
| 7B does everything (single model) | **~15–25 min** |
| 7B classifier + 14B extractor | ~25–45 min |
| 3B classifier only (skip extraction) | ~3 min |

The recommended pipeline takes **8–12 min**. The briefing runs while you're
asleep — completely fine.

### Thermal & power considerations

- The fans **will** ramp up. Mid-range fan speed for the duration of inference.
- Plug in. Battery drain during inference is significant (~40 W sustained).
- Keep the lid open or use `caffeinate` to prevent sleep mid-run.
- Don't run on a soft surface (bed, lap) — restricted airflow → throttling → slower inference.

---

## 7. Setup Steps

### 7.1 Install Ollama

```bash
# Option A: Homebrew (recommended)
brew install ollama

# Option B: Direct download
# Visit ollama.com/download/mac and run the installer
```

### 7.2 Start the Ollama daemon

```bash
# As a background service (auto-starts on login)
brew services start ollama

# OR run manually in one terminal
ollama serve
```

### 7.3 Pull models

```bash
ollama pull qwen2.5:3b
ollama pull qwen2.5:7b

# Verify
ollama list
# Expected: both rows, ~2 GB + ~4.7 GB on disk
```

### 7.4 Environment configuration

Add to `~/.zshrc` (or `~/.bashrc`):

```bash
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_HOST=127.0.0.1:11434
export OLLAMA_KEEP_ALIVE=30m
```

Reload:

```bash
source ~/.zshrc
brew services restart ollama
```

### 7.5 Sanity check

```bash
# Classification probe
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:3b",
    "messages": [
      {"role": "user", "content": "Classify this email. From: priya@bigco.com. Subject: Q3 deck needs your review by EOD. Return JSON: {category, is_noise, intent, urgency}"}
    ],
    "response_format": {"type": "json_object"}
  }'
```

Should return JSON within a few seconds. Watch `Activity Monitor` →
`GPU History` to confirm the Radeon is being engaged (GPU bar climbs
during inference).

### 7.6 Confirm GPU is being used

```bash
# In one terminal:
ollama serve

# In another:
ollama run qwen2.5:3b "hello"
```

In the `ollama serve` logs, look for `metal` and `ggml_metal_init`. If you
only see CPU-related lines, the AMD GPU isn't being engaged.

---

## 8. Background Scheduling (launchd)

macOS uses **launchd** instead of cron for reliable scheduled tasks
(launchd will run missed tasks; cron silently skips them).

### 8.1 Create the briefing script

```bash
# ~/bin/morning-briefing.sh
#!/bin/bash
cd "$HOME/Documents/Workspaces/kb-exploration/morning-briefing-poc"

# Wake the Mac if needed (you'll need to allow this in System Settings)
caffeinate -i -t 1800 python3 ~/bin/run-briefing.py >> ~/Library/Logs/morning-briefing.log 2>&1
```

```bash
chmod +x ~/bin/morning-briefing.sh
```

### 8.2 Create the launchd plist

`~/Library/LaunchAgents/com.user.morning-briefing.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.user.morning-briefing</string>

  <key>ProgramArguments</key>
  <array>
    <string>/Users/YOUR_USER/bin/morning-briefing.sh</string>
  </array>

  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>6</integer>
    <key>Minute</key><integer>30</integer>
  </dict>

  <key>RunAtLoad</key>
  <false/>

  <key>StandardOutPath</key>
  <string>/tmp/morning-briefing.out</string>
  <key>StandardErrorPath</key>
  <string>/tmp/morning-briefing.err</string>
</dict>
</plist>
```

### 8.3 Load it

```bash
launchctl load ~/Library/LaunchAgents/com.user.morning-briefing.plist

# Verify
launchctl list | grep morning-briefing
```

### 8.4 Wake-from-sleep

Schedule a wake event in System Settings → Battery → Schedule (or via
`pmset` on the command line):

```bash
sudo pmset repeat wakeorpoweron MTWRFSU 06:25:00
```

This ensures the Mac is awake when launchd fires the briefing.

---

## 9. Cost Summary

### One-time

| Item | Cost |
|---|---|
| Hardware (already owned) | **$0** |
| Ollama + models | **$0** (open source / open weights) |
| macOS scheduler / system tools | **$0** (built in) |
| Setup time | ~30 min |

### Recurring (per month)

| Item | Cost |
|---|---|
| LLM inference (local) | **$0** |
| Google APIs (Gmail + Calendar, read-only) | **$0** |
| Electricity (Mac wakes ~10 min/day at 40 W avg) | **~$0.10–0.30** |
| Cloud / VPS / hosting | **$0** |
| **Total** | **~$0 / month** |

This is the genuinely-free path. The only "cost" is the wall-clock minutes
the Mac spends inferring each morning, and the fan noise during that time.

---

## 10. Capacity & Scaling Thresholds

When the recommended setup stops working:

| Symptom | Likely cause | Fix |
|---|---|---|
| Briefing takes > 30 min | Model too large for hardware | Drop extractor from 7B → 3B; quality decreases but it'll finish in 5 min |
| Extraction misses obvious asks | 7B isn't strong enough on subtle/implicit asks | Accept the trade, or move *just extraction* to free-tier cloud LLM (Groq's free tier, or Together AI's $1 credit) |
| Ollama crashes mid-run | VRAM + KV cache spilled badly | Set Ollama context window smaller: `OLLAMA_NUM_CTX=2048` |
| Fan noise unacceptable | Inference is CPU-bound | Schedule for when you're not at the desk (overnight runs work great) |
| Briefing didn't run | Mac was off/lid closed | `pmset` wake schedule + plug in nightly |

### When to upgrade

The 2019 Intel MBP is **end-of-the-line for local LLMs**. macOS Sequoia (15)
is the last major macOS to support Intel Macs. Practical upgrade paths
(if/when this becomes a priority):

| Upgrade | Why |
|---|---|
| Any M-series Mac (M1 or newer) | 3–5× faster inference, unified memory means the 14B-32B class becomes viable, MLX support |
| M4 Pro / Max with 36+ GB | Runs a 32B extractor at usable speed (~15 tok/s) — matches the Windows Arc B580 setup |

Until then, the recommended free pipeline on the 2019 MBP is **functional**,
just slow.

---

## 11. Honest Tradeoffs

| Dimension | This Mac (local) | Cloud (Claude) | Windows + Arc B580 (local) |
|---|---|---|---|
| **Cost** | $0 | ~$3–6/mo | ~$3–5/mo (electricity) |
| **Privacy** | Total | Bodies sent to API | Total |
| **Speed** | 8–25 min/run | 20–40 sec/run | 3–5 min/run |
| **Extraction quality** | ~75–85% of Sonnet | Reference | ~85–92% of Sonnet |
| **Setup time** | ~30 min | ~5 min (API key) | ~30 min |
| **Runs when Mac is off** | No | Yes | No |
| **Mobile access** | Local-only by default | Native | Local-only by default |

### When this setup makes sense

✅ You want zero cloud dependency on principle
✅ You want zero monthly cost
✅ Briefing runs while you're asleep so latency doesn't matter
✅ The Mac is already plugged in overnight

### When to reconsider

❌ You want briefings on demand throughout the day (latency is high)
❌ You need extraction quality on subtle/implicit asks
❌ The Mac can't reliably stay awake at 06:30 (e.g., you travel often)
❌ You're sharing the briefing with multiple users (this is single-Mac)

---

## 12. Quick Start (TL;DR)

```bash
# 1. Install
brew install ollama

# 2. Start service
brew services start ollama

# 3. Pull free models (~7 GB total)
ollama pull qwen2.5:3b
ollama pull qwen2.5:7b

# 4. Configure env
echo 'export OLLAMA_MAX_LOADED_MODELS=1' >> ~/.zshrc
echo 'export OLLAMA_KEEP_ALIVE=30m' >> ~/.zshrc
source ~/.zshrc
brew services restart ollama

# 5. Test
ollama run qwen2.5:3b "Hello, classify this: 'Q3 deck needs review by EOD'"

# 6. Schedule daily run (do steps 8.1–8.4 above)
```

Total time: ~20 min for downloads + 10 min config = **~30 minutes** start to finish.

Then it runs every morning at 06:30, takes 8–12 minutes, costs nothing.

---

*v0.1 · 2026-05-23*
