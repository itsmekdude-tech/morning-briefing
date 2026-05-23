# Morning Briefing Agent — Design Doc

> An interactive AI agent that connects to Gmail + Google Calendar,
> categorizes your inbox, and delivers a focused morning briefing.

---

## 1. Goals & Non-Goals

### Goals
- **Authenticate** with a user's Google account via OAuth 2.0 (Gmail + Calendar scopes).
- **Read & classify** Gmail messages across `Primary`, `Forums`, `Updates`, `Promotions`.
- **Extract** action items, to-dos, and time-sensitive asks from email bodies.
- **Pull** upcoming calendar events for the day (and next 24h).
- **Surface** a categorized **Morning Briefing** with signal-vs-noise filtering.
- Deliver via an **interactive web app** with a daily summary view.

### Non-Goals (v1)
- Replying to or sending email on the user's behalf.
- Modifying/creating calendar events.
- Mobile-native app (web-first; mobile responsive is enough).
- Multi-account aggregation.

---

## 2. High-Level Architecture

```
                                                         ┌────────────────────────┐
                                                         │   Google Identity      │
                                                         │   (OAuth 2.0 server)   │
                                                         └───────────▲────────────┘
                                                                     │ token exchange
                                                                     │
   ┌──────────────┐      HTTPS       ┌──────────────────┐  REST/gRPC  │   ┌──────────────────┐
   │              │ ───────────────► │                  │ ────────────┼──►│  Gmail API       │
   │   Browser    │                  │   Web Backend    │             │   │  (users.messages)│
   │  (React UI)  │ ◄─────────────── │   (FastAPI /     │ ────────────┼──►│  Calendar API    │
   │              │   JSON briefing  │    Node/Express) │             │   │  (events.list)   │
   └──────┬───────┘                  └────────┬─────────┘             │   └──────────────────┘
          │                                   │                       │
          │                                   │ enqueue                │
          │                                   ▼                        │
          │                          ┌──────────────────┐              │
          │                          │  Job Queue       │              │
          │                          │  (Redis/RQ or    │              │
          │                          │   Celery)        │              │
          │                          └────────┬─────────┘              │
          │                                   │                        │
          │                                   ▼                        │
          │                          ┌──────────────────┐    LLM call  │
          │                          │  Briefing Worker │ ─────────────┼──► Claude API
          │                          │  (classifier +   │              │    (Sonnet 4.6)
          │                          │   summarizer)    │              │
          │                          └────────┬─────────┘              │
          │                                   │ write                  │
          │                                   ▼                        │
          │                          ┌──────────────────┐              │
          └─────────────────────────►│  Postgres        │              │
                                     │  (users, tokens, │              │
                                     │   briefings,     │              │
                                     │   classified_msg)│              │
                                     └──────────────────┘              │
                                                                       │
                                                              (refresh tokens, scoped)
```

---

## 3. Authentication Flow (OAuth 2.0 + Offline Access)

```
   User                Browser              Backend             Google OAuth          Google APIs
    │                    │                    │                      │                     │
    │  click "Connect"   │                    │                      │                     │
    │ ─────────────────► │                    │                      │                     │
    │                    │   GET /auth/start  │                      │                     │
    │                    │ ─────────────────► │                      │                     │
    │                    │                    │  redirect_uri w/     │                     │
    │                    │                    │  scopes + state      │                     │
    │                    │ ◄─────────────────                        │                     │
    │                    │   302 → Google consent screen             │                     │
    │                    │ ──────────────────────────────────────►   │                     │
    │  approves scopes   │                                           │                     │
    │ ──────────────────────────────────────────────────────────►    │                     │
    │                    │   302 back with ?code=...&state=...       │                     │
    │                    │ ◄──────────────────────────────────────   │                     │
    │                    │   GET /auth/callback?code=...             │                     │
    │                    │ ─────────────────► │                      │                     │
    │                    │                    │  POST /token (code)  │                     │
    │                    │                    │ ───────────────────► │                     │
    │                    │                    │  {access, refresh,   │                     │
    │                    │                    │   id_token, exp}     │                     │
    │                    │                    │ ◄─────────────────── │                     │
    │                    │                    │                      │                     │
    │                    │                    │  encrypt + store     │                     │
    │                    │                    │  refresh_token in DB │                     │
    │                    │                    │                      │                     │
    │                    │   set session      │                      │                     │
    │                    │   cookie + redirect│                      │                     │
    │                    │ ◄───────────────── │                      │                     │
    │  briefing page     │                    │                      │                     │
    │ ◄───────────────── │                    │                      │                     │

   Scopes requested (minimum-needed):
     - https://www.googleapis.com/auth/gmail.readonly
     - https://www.googleapis.com/auth/calendar.readonly
     - openid email profile
```

**Token storage rules:**
- Refresh tokens encrypted at rest (AES-GCM, key from KMS / env-managed).
- Access tokens cached in Redis with TTL = `expires_in - 60s`.
- Re-prompt user if refresh token is revoked (`invalid_grant`).

---

## 4. Briefing Pipeline (Per Run)

```
   ┌──────────────────────────────────────────────────────────────────────────────────┐
   │                          DAILY BRIEFING PIPELINE                                  │
   └──────────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │  1. FETCH    │    │ 2. CLASSIFY  │    │ 3. EXTRACT   │    │ 4. RANK      │
   │              │    │              │    │              │    │              │
   │  Gmail msgs  │───►│  Per-message │───►│  Action      │───►│  Score each  │
   │  (last 24h)  │    │  category +  │    │  items, due  │    │  by urgency  │
   │  Cal events  │    │  is_noise    │    │  dates, asks │    │  + relevance │
   │  (next 24h)  │    │              │    │              │    │              │
   └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                       │
                                                                       ▼
                          ┌──────────────────────────────────────────────────┐
                          │  5. ASSEMBLE BRIEFING                            │
                          │                                                  │
                          │   ┌────────────────┐  ┌────────────────────┐    │
                          │   │ Calendar block │  │ Action items block │    │
                          │   └────────────────┘  └────────────────────┘    │
                          │   ┌────────────────┐  ┌────────────────────┐    │
                          │   │ Primary digest │  │ Useful Updates     │    │
                          │   └────────────────┘  └────────────────────┘    │
                          │   ┌────────────────┐  ┌────────────────────┐    │
                          │   │ Useful Forums  │  │ Useful Promotions  │    │
                          │   └────────────────┘  └────────────────────┘    │
                          └──────────────────────────────────────────────────┘
                                                  │
                                                  ▼
                                       ┌─────────────────────┐
                                       │ 6. RENDER + STORE   │
                                       │   - DB row          │
                                       │   - markdown export │
                                       │   - UI render       │
                                       └─────────────────────┘
```

### Stage Details

**1. Fetch**
- Gmail: `users.messages.list` with query `newer_than:1d -category:trash`.
- Calendar: `events.list` for `timeMin=now`, `timeMax=now+24h`, `singleEvents=true`.
- Hydrate Gmail messages with full payload only when classification needs the body.

**2. Classify** (per message)
- Inputs: subject, sender, snippet, list-id header, Gmail's own category label.
- Output schema:
  ```
  {
    category: "primary" | "updates" | "forums" | "promotions",
    is_noise: bool,
    intent:   "action_required" | "fyi" | "transactional" | "marketing" |
              "newsletter" | "social",
    urgency:  0..3
  }
  ```
- Strategy: a small fast model (Haiku) for first-pass, escalating to Sonnet only for ambiguous senders or long bodies.

**3. Extract** (action items)
- Run Sonnet on messages where `intent == action_required` OR sender ∈ user's important-contacts set.
- Extract: `{ask, due_date, who_asked, source_msg_id, confidence}`.

**4. Rank**
- Score = `0.5*urgency + 0.3*sender_importance + 0.2*recency_decay`.
- Top N per section (configurable; default 5 per category).

**5. Assemble**
- Combine sections into a single `briefing.json` object.
- Carry forward yesterday's incomplete action items if `include_carryover = true`.

**6. Render**
- Persist to `briefings` table.
- Render React view + optional markdown export.

---

## 5. Data Model

```
   ┌──────────────────────┐         ┌──────────────────────────┐
   │ users                │         │ google_tokens            │
   ├──────────────────────┤   1 ──◄ ├──────────────────────────┤
   │ id            uuid PK│         │ user_id        uuid FK   │
   │ email         text   │         │ refresh_token  bytea (enc)│
   │ display_name  text   │         │ access_token   bytea (enc)│
   │ created_at    tstz   │         │ expires_at     tstz      │
   │ tz            text   │         │ scopes         text[]    │
   └──────────┬───────────┘         └──────────────────────────┘
              │ 1
              ◄
              │ N
   ┌──────────────────────┐         ┌──────────────────────────┐
   │ briefings            │         │ classified_messages      │
   ├──────────────────────┤   1 ──◄ ├──────────────────────────┤
   │ id            uuid PK│         │ briefing_id    uuid FK   │
   │ user_id       uuid FK│         │ gmail_msg_id   text      │
   │ generated_at  tstz   │         │ category       text      │
   │ summary_json  jsonb  │         │ is_noise       bool      │
   │ markdown      text   │         │ intent         text      │
   │ status        text   │         │ urgency        int       │
   └──────────────────────┘         │ rank_score     numeric   │
                                    │ extracted_json jsonb     │
                                    └──────────────────────────┘
```

---

## 6. UI / UX Mockup

```
   ┌────────────────────────────────────────────────────────────────────────────────┐
   │  ☀  Good morning, Hersh                                            Fri, May 23 │
   │  Briefing for Friday, May 23 · generated 7:02 AM                  [↻ Refresh] │
   ├────────────────────────────────────────────────────────────────────────────────┤
   │                                                                                │
   │  ┌─────────────────────────────────┐  ┌─────────────────────────────────────┐ │
   │  │ 📅  TODAY'S CALENDAR            │  │ ✅  ACTION ITEMS                    │ │
   │  ├─────────────────────────────────┤  ├─────────────────────────────────────┤ │
   │  │  09:00  Standup            (15m)│  │  ▸ Reply to Priya re Q3 deck       │ │
   │  │  10:30  Design review      (1h) │  │    due today · from priya@…        │ │
   │  │  13:00  Lunch w/ Maya      (1h) │  │  ▸ Send invoice to BigCo           │ │
   │  │  15:00  1:1 with Manan     (30m)│  │    due Tue · from accounts@…       │ │
   │  │  17:00  Demo prep          (1h) │  │  ▸ Approve PR #482                 │ │
   │  │                                 │  │    no deadline · from github       │ │
   │  │  (4 events · 3h 45m booked)     │  │  ▸ RSVP to all-hands               │ │
   │  └─────────────────────────────────┘  │    due Thu · from people@…         │ │
   │                                       └─────────────────────────────────────┘ │
   │                                                                                │
   │  ┌─────────────────────────────────────────────────────────────────────────┐  │
   │  │ 📥  PRIMARY INBOX                                          (5 new)      │  │
   │  ├─────────────────────────────────────────────────────────────────────────┤  │
   │  │  • Priya Shah · Q3 deck — needs your review by EOD                       │  │
   │  │  • Manan B.  · re: integration timeline, can we push to next sprint?    │  │
   │  │  • Accounts  · BigCo invoice overdue                                    │  │
   │  │  • Aunt Rina · photos from the trip                                     │  │
   │  │  • Stripe    · payout of $4,210 scheduled for May 24                    │  │
   │  └─────────────────────────────────────────────────────────────────────────┘  │
   │                                                                                │
   │  ┌──────────────────────────────┐ ┌──────────────────────────────────────┐   │
   │  │ 📰  UPDATES (worth reading)  │ │ 💬  FORUMS (worth reading)           │   │
   │  ├──────────────────────────────┤ ├──────────────────────────────────────┤   │
   │  │  • GitHub: 3 PRs need review │ │  • langchain-dev: tool-use breaking  │   │
   │  │  • Linear: 2 issues assigned │ │    change in v0.3 — affects your    │   │
   │  │  • Vercel: deploy failed on  │ │    agent code                        │   │
   │  │    main 4h ago               │ │  • indie-hackers: thread on pricing │   │
   │  │                              │ │    SaaS for SMBs (replied to yours) │   │
   │  │  (12 filtered as noise)      │ │                                      │   │
   │  └──────────────────────────────┘ └──────────────────────────────────────┘   │
   │                                                                                │
   │  ┌─────────────────────────────────────────────────────────────────────────┐  │
   │  │ 🎟  PROMOTIONS (only the useful ones)                                   │  │
   │  ├─────────────────────────────────────────────────────────────────────────┤  │
   │  │  • Notion: your annual renewal in 5 days — auto-renews at $96          │  │
   │  │  • Delta: flight DL204 to SFO check-in opens in 18h                    │  │
   │  │                                                                         │  │
   │  │  (47 filtered as marketing noise)                                       │  │
   │  └─────────────────────────────────────────────────────────────────────────┘  │
   │                                                                                │
   │  [ Export Markdown ]   [ Snooze item ]   [ Mark as noise — improve filter ]   │
   └────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Signal-vs-Noise Filtering

The hard problem: most `Updates`/`Promotions` mail is noise, but a few items *do* matter (renewals, flight check-ins, security alerts, account changes). Rules:

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │ KEEP if any of:                                                        │
   │   • Mentions a deadline / date within 7 days                           │
   │   • Mentions money, charge, renewal, invoice, payout, refund          │
   │   • Sender domain ∈ user's "important" set (banks, govt, employer)    │
   │   • Security/login/account-change language                            │
   │   • Travel: flight, boarding, check-in, reservation, itinerary        │
   │   • User has previously clicked / starred / replied to this sender    │
   │                                                                        │
   │ DROP if all of:                                                        │
   │   • Generic marketing template (high promo-keyword density)           │
   │   • No personalization beyond first name                              │
   │   • User has ignored sender's last N emails                           │
   └────────────────────────────────────────────────────────────────────────┘
```

A small **per-user feedback loop**: every "Mark as noise" / "Mark as useful" click updates a sender-level weight stored in Postgres. Over ~2 weeks the filter becomes personal.

---

## 8. Scheduling & Delivery

```
   ┌──────────────────┐
   │  Cron (06:30 in  │
   │  user's TZ)      │
   └────────┬─────────┘
            │ fan out per user
            ▼
   ┌──────────────────┐    success    ┌──────────────────┐
   │  Briefing worker │ ────────────► │  Send web push   │
   │  builds briefing │               │  + (opt) email   │
   └──────────────────┘               └──────────────────┘
            │
            │ failure
            ▼
   ┌──────────────────┐
   │  Retry w/ backoff│
   │  + alert if 3x   │
   └──────────────────┘
```

- Default delivery: **06:30 local time** (user-configurable).
- Channels: in-app, web push, optional email digest sent to self.
- Pre-fetch starts 30 min before delivery so the page is warm when the user opens it.

---

## 9. Tech Stack (Recommended)

| Layer            | Choice                                       | Why                                  |
|------------------|----------------------------------------------|--------------------------------------|
| Frontend         | React + Vite + TailwindCSS                   | Fast dev, clean cards UI             |
| Backend          | FastAPI (Python)                             | Easy Google client SDKs + LLM SDKs   |
| Job queue        | Redis + RQ                                   | Lightweight; Celery overkill for v1  |
| Database         | Postgres                                     | JSONB for `summary_json` is perfect  |
| Secrets          | env + AES-GCM at rest (libsodium)            | No KMS dep for v1                    |
| LLM              | Claude Sonnet 4.6 (default), Haiku 4.5 (fast)| Sonnet for extraction, Haiku for classification |
| Auth             | Google OAuth 2.0 (Authlib)                   | Standard offline-access flow         |
| Hosting          | Fly.io or Railway                            | Easy cron + Postgres + Redis bundle  |

---

## 10. Privacy & Security

- **Scopes are read-only.** No `gmail.modify`, no `gmail.send`, no `calendar.events`.
- Email **bodies are never stored** raw. We store: msg_id, classification, extracted action items only.
- Refresh tokens encrypted at rest. Access tokens never persisted to disk.
- A `DELETE /me` endpoint that (a) revokes the Google grant and (b) hard-deletes all rows.
- All LLM prompts redact email addresses to hashed handles before sending; sender display name is kept.
- Audit log of every Google API call (endpoint + timestamp + status) for 30 days.

---

## 11. Build Order (Milestones)

```
   M1 ─► Auth + token storage              (week 1)
   M2 ─► Gmail + Calendar fetchers         (week 1)
   M3 ─► Classifier + noise filter         (week 2)
   M4 ─► Action-item extractor             (week 2)
   M5 ─► Briefing assembler + storage      (week 3)
   M6 ─► Web UI (briefing view)            (week 3)
   M7 ─► Scheduler + delivery              (week 4)
   M8 ─► Feedback loop (mark noise/useful) (week 4)
```

---

## 12. Open Questions

1. **Onboarding "important contacts"** — ask explicitly during setup, or infer from sent-mail history?
2. **Markdown export** — local download only, or sync to Notion/Obsidian?
3. **Action item completion** — track inside the app, or push to Linear/Todoist?
4. **Multi-day carryover** — auto-expire incomplete action items after N days?
5. **Cost ceiling** — per-user LLM budget cap; what's the fallback when hit?

---

*End of doc. v0.1 · 2026-05-23*
