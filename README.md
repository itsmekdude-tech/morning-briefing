# Morning Briefing

Exploration repo for an AI-powered morning briefing app — connects to Gmail + Google Calendar, classifies your inbox, and surfaces a daily summary.

> **Live POC demo:** https://itsmekdude-tech.github.io/morning-briefing/
> (UI only — backend runs locally; see the variants below.)

## Repo layout

| Path | What it is |
| --- | --- |
| [`morning-briefing-poc/`](./morning-briefing-poc) | Pure React/Vite frontend POC. UI only, mock data. **Deployed to GitHub Pages.** |
| [`morning-briefing-app/`](./morning-briefing-app) | Full local stack — React + FastAPI + Ollama (local LLM) + SQLite. No cloud calls. |
| [`morning-briefing-app-google/`](./morning-briefing-app-google) | Same as above + real Gmail/Calendar via Google OAuth. |
| [`docs/`](./docs) | Design docs — architecture, OAuth setup, compute notes, UI mockups. |

## Quickstart

### POC (UI only)

```bash
cd morning-briefing-poc
npm install
npm run dev
# → http://localhost:5173
```

### Full local app (with Ollama)

```bash
cd morning-briefing-app          # or morning-briefing-app-google
./run.sh                         # macOS/Linux  (or .\run.bat on Windows)
```

Prereqs: Python 3.11, Node 18+, [Ollama](https://ollama.com/) with `qwen2.5:3b` pulled. See the variant's README for details.

### Google-OAuth variant

Additionally needs Google Cloud OAuth client credentials in `morning-briefing-app-google/backend/.env` — see [`docs/gcp-oauth-setup-checklist.md`](./docs/gcp-oauth-setup-checklist.md).

## Design docs

- [`morning-briefing-agent-design.md`](./docs/morning-briefing-agent-design.md) — overall architecture (OAuth, classification, briefing assembly)
- [`morning-briefing-free-local-stack.md`](./docs/morning-briefing-free-local-stack.md) — local-only stack design
- [`morning-briefing-poc-frontend-design.md`](./docs/morning-briefing-poc-frontend-design.md) — POC frontend architecture
- [`morning-briefing-ui-ux-mockup.md`](./docs/morning-briefing-ui-ux-mockup.md) — UI/UX mockups
- [`morning-briefing-macos-compute.md`](./docs/morning-briefing-macos-compute.md) / [`morning-briefing-windows-compute.md`](./docs/morning-briefing-windows-compute.md) — compute requirements per platform
- [`gcp-oauth-setup-checklist.md`](./docs/gcp-oauth-setup-checklist.md) — Google Cloud OAuth setup

## Deployment

The POC frontend deploys to GitHub Pages automatically on every push to `main` via [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml). The full-stack variants are local-only — they need Python, Node, and Ollama on the host and aren't suitable for static hosting.
