# Morning Briefing — Frontend POC Design Doc

> Frontend-only proof-of-concept. **No real Google APIs, no real backend, no LLM calls.**
> Everything is mocked so we can iterate on the UI, the briefing layout, the interactions,
> and the "feel" of the morning experience before writing any integration code.

---

## 1. Purpose

We want to **validate the product experience** before investing in:
- OAuth + Google API plumbing
- LLM classification pipelines
- Scheduling infra
- Persistent storage

The POC's only job: **make the morning briefing look and feel right** to a user opening it at 7 AM.

### POC success criteria
- A user can open the app and immediately read their "morning briefing."
- The briefing is **categorized**, **scannable**, and **interactive** (mark useful / dismiss / expand).
- Toggling between **mock personas** (busy exec, founder, student) shows the UI adapting.
- The whole thing runs with `npm run dev` — no env vars, no secrets, no network.

### Out of scope for the POC
- Real auth (we'll *show* a fake OAuth screen, but it just clicks through).
- Real Gmail / Calendar data.
- Persistence across page reloads (in-memory state only, or `localStorage` at most).
- Mobile responsiveness polish (desktop-first; just don't break on narrow widths).

---

## 2. Architecture

```
   ┌─────────────────────────────────────────────────────────────────────────┐
   │                          BROWSER (everything lives here)                │
   │                                                                         │
   │   ┌──────────────────────────────────────────────────────────────┐     │
   │   │                       React App (Vite)                       │     │
   │   │                                                              │     │
   │   │   ┌────────────────┐    ┌────────────────────────────────┐  │     │
   │   │   │  Pages         │    │  Components                    │  │     │
   │   │   │                │    │                                │  │     │
   │   │   │  /             │    │  • BriefingHeader              │  │     │
   │   │   │  /connect      │    │  • CalendarCard                │  │     │
   │   │   │  /briefing     │    │  • ActionItemsCard             │  │     │
   │   │   │  /settings     │    │  • InboxDigestCard             │  │     │
   │   │   └────────┬───────┘    │  • UpdatesCard / ForumsCard    │  │     │
   │   │            │            │  • PromotionsCard              │  │     │
   │   │            │            │  • PersonaSwitcher (dev only)  │  │     │
   │   │            │            └────────────────────────────────┘  │     │
   │   │            ▼                                                │     │
   │   │   ┌────────────────────────────────────────────────────┐    │     │
   │   │   │            Mock Service Layer                       │    │     │
   │   │   │  (looks like a real API client to the components)   │    │     │
   │   │   │                                                     │    │     │
   │   │   │   mockApi.getBriefing(personaId) ──┐                │    │     │
   │   │   │   mockApi.markNoise(itemId)        │                │    │     │
   │   │   │   mockApi.completeAction(itemId)   │                │    │     │
   │   │   │   mockApi.connectGoogle()  ◄──── all return         │    │     │
   │   │   │                                    Promise<…>       │    │     │
   │   │   └────────────────┬───────────────────────────────────┘    │     │
   │   │                    │ reads                                  │     │
   │   │                    ▼                                        │     │
   │   │   ┌────────────────────────────────────────────────────┐    │     │
   │   │   │            Static Mock Data (JSON)                  │    │     │
   │   │   │                                                     │    │     │
   │   │   │   /src/mocks/personas/hersh.json                    │    │     │
   │   │   │   /src/mocks/personas/founder.json                  │    │     │
   │   │   │   /src/mocks/personas/student.json                  │    │     │
   │   │   │                                                     │    │     │
   │   │   │   Each file = full pre-built briefing payload.      │    │     │
   │   │   └────────────────────────────────────────────────────┘    │     │
   │   └──────────────────────────────────────────────────────────────┘     │
   └─────────────────────────────────────────────────────────────────────────┘

           (no network, no backend, no API keys, no tokens)
```

**Key idea:** the **Mock Service Layer** has the exact shape we'd expect from the real backend. When we later build the real thing, we swap `mockApi.*` for `realApi.*` and the components don't change.

---

## 3. Mock Service Contract

This is the only "API" the UI ever sees. Designed to mirror what the real backend will eventually expose.

```ts
// src/services/mockApi.ts

interface MockApi {
  // Auth (fake)
  connectGoogle(): Promise<{ status: "connected"; email: string }>;
  disconnect():    Promise<void>;
  getAuthStatus(): Promise<{ connected: boolean; email?: string }>;

  // Briefing
  getBriefing(opts?: { personaId?: string }): Promise<Briefing>;
  refreshBriefing(): Promise<Briefing>;

  // Interactions (mutate in-memory copy + return updated briefing)
  markItemNoise(itemId: string):     Promise<void>;
  markItemUseful(itemId: string):    Promise<void>;
  completeActionItem(itemId: string):Promise<void>;
  snoozeItem(itemId: string, until: string): Promise<void>;
}
```

### Fake latency
Wrap each method in `await new Promise(r => setTimeout(r, 300 + Math.random() * 400))` so loading states feel realistic. Add a `?fast=1` URL param to disable the delay during dev.

---

## 4. Mock Data Shape

A single `Briefing` object drives the entire UI. One JSON file per persona.

```jsonc
{
  "user": {
    "displayName": "Hersh",
    "email": "hersh@appemble.com",
    "timezone": "America/New_York"
  },
  "generatedAt": "2026-05-23T07:02:00-04:00",
  "calendar": [
    {
      "id": "evt_1",
      "title": "Standup",
      "start": "2026-05-23T09:00:00-04:00",
      "end":   "2026-05-23T09:15:00-04:00",
      "location": "Zoom",
      "attendees": 6
    }
  ],
  "actionItems": [
    {
      "id": "act_1",
      "ask": "Reply to Priya re Q3 deck",
      "due": "2026-05-23",
      "from": "priya@bigco.com",
      "sourceMsgId": "msg_42",
      "confidence": 0.92,
      "completed": false
    }
  ],
  "sections": {
    "primary": {
      "newCount": 5,
      "items": [
        {
          "id": "msg_42",
          "from": { "name": "Priya Shah", "email": "priya@bigco.com" },
          "subject": "Q3 deck — needs your review by EOD",
          "snippet": "Hey Hersh, attaching v4 of the deck…",
          "receivedAt": "2026-05-23T06:14:00-04:00",
          "isUseful": true,
          "isNoise": false
        }
      ]
    },
    "updates":    { "newCount": 15, "filteredAsNoise": 12, "items": [ /* … */ ] },
    "forums":     { "newCount": 8,  "filteredAsNoise": 6,  "items": [ /* … */ ] },
    "promotions": { "newCount": 49, "filteredAsNoise": 47, "items": [ /* … */ ] }
  }
}
```

**Why one file per persona:** swapping personas via a dev-only switcher lets us demo the same UI handling very different inbox shapes (light vs. firehose).

---

## 5. User Flow (Fake OAuth → Briefing)

```
   ┌──────────────────────┐
   │   Landing page  /    │
   │                      │
   │  "Connect your       │
   │   Google account     │
   │   to see your        │
   │   morning briefing"  │
   │                      │
   │   [ Connect Google ] │
   └───────────┬──────────┘
               │ click
               ▼
   ┌──────────────────────────────────────┐
   │   /connect  (fake Google screen)     │
   │                                      │
   │   ┌────────────────────────────┐     │
   │   │  G  Sign in with Google    │     │ ← styled to *look* like
   │   │                            │     │   the Google consent page
   │   │  This app would like to:   │     │   but it's just our JSX
   │   │   ✓ Read your Gmail        │     │
   │   │   ✓ Read your Calendar     │     │
   │   │                            │     │
   │   │   [ Allow ]   [ Cancel ]   │     │
   │   └────────────────────────────┘     │
   └────────────────┬─────────────────────┘
                    │ click Allow
                    │ (mockApi.connectGoogle resolves after 800ms)
                    ▼
   ┌─────────────────────────────────────────────┐
   │   /briefing  (the main view)                │
   │                                             │
   │   loads mockApi.getBriefing() with a        │
   │   shimmer/skeleton for ~600ms, then         │
   │   renders the full briefing                 │
   └─────────────────────────────────────────────┘
```

The fake OAuth page is important — it lets us validate the **trust moment** (what the user sees before granting access) without wiring up real OAuth.

---

## 6. Screen Wireframes

### 6.1 Landing

```
   ┌────────────────────────────────────────────────────────────────┐
   │                                                                │
   │                  ☀  Morning Briefing                           │
   │                                                                │
   │           Your inbox, ranked. Your day, summarized.            │
   │                                                                │
   │                  ┌────────────────────────┐                    │
   │                  │  G  Connect Google     │                    │
   │                  └────────────────────────┘                    │
   │                                                                │
   │           Read-only. We never send mail on your behalf.        │
   │                                                                │
   └────────────────────────────────────────────────────────────────┘
```

### 6.2 Briefing (main view)

```
   ┌────────────────────────────────────────────────────────────────────────────┐
   │  ☀  Good morning, Hersh                                Fri, May 23 · 7:02 │
   │  [Persona: Hersh ▾]   [↻ Refresh]   [⚙ Settings]                          │
   ├────────────────────────────────────────────────────────────────────────────┤
   │                                                                            │
   │  ┌────────────────────────────────┐  ┌──────────────────────────────────┐ │
   │  │ 📅 TODAY                       │  │ ✅ ACTION ITEMS                  │ │
   │  ├────────────────────────────────┤  ├──────────────────────────────────┤ │
   │  │  09:00  Standup           15m  │  │  ☐ Reply to Priya re Q3 deck    │ │
   │  │  10:30  Design review     1h   │  │     due today                   │ │
   │  │  13:00  Lunch w/ Maya     1h   │  │  ☐ Send invoice to BigCo        │ │
   │  │  15:00  1:1 with Manan    30m  │  │     due Tue                     │ │
   │  │  17:00  Demo prep         1h   │  │  ☐ Approve PR #482              │ │
   │  │                                │  │  ☐ RSVP to all-hands            │ │
   │  └────────────────────────────────┘  └──────────────────────────────────┘ │
   │                                                                            │
   │  ┌──────────────────────────────────────────────────────────────────────┐ │
   │  │ 📥 PRIMARY                                                  5 new    │ │
   │  ├──────────────────────────────────────────────────────────────────────┤ │
   │  │  Priya Shah   Q3 deck — needs your review by EOD          06:14 AM  │ │
   │  │  Manan B.     re: integration timeline                    05:48 AM  │ │
   │  │  Accounts     BigCo invoice overdue                       02:11 AM  │ │
   │  │  Aunt Rina    Photos from the trip                  yesterday 11pm  │ │
   │  │  Stripe       Payout of $4,210 scheduled May 24      yesterday 9pm  │ │
   │  └──────────────────────────────────────────────────────────────────────┘ │
   │                                                                            │
   │  ┌─────────────────────────────────┐  ┌──────────────────────────────────┐│
   │  │ 📰 UPDATES               3 kept │  │ 💬 FORUMS                 2 kept ││
   │  ├─────────────────────────────────┤  ├──────────────────────────────────┤│
   │  │  GitHub: 3 PRs need review      │  │  langchain-dev: breaking change  ││
   │  │  Linear: 2 issues assigned      │  │    affects your agent code       ││
   │  │  Vercel: deploy failed on main  │  │  indie-hackers: pricing thread   ││
   │  │  (12 filtered as noise)         │  │  (6 filtered as noise)           ││
   │  └─────────────────────────────────┘  └──────────────────────────────────┘│
   │                                                                            │
   │  ┌──────────────────────────────────────────────────────────────────────┐ │
   │  │ 🎟 PROMOTIONS                                                2 kept   │ │
   │  ├──────────────────────────────────────────────────────────────────────┤ │
   │  │  Notion: renewal in 5 days — auto-renews at $96                      │ │
   │  │  Delta: flight DL204 check-in opens in 18h                           │ │
   │  │  (47 filtered as marketing noise)                                    │ │
   │  └──────────────────────────────────────────────────────────────────────┘ │
   │                                                                            │
   │  [ Export Markdown ]                                                      │
   └────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Item expanded (modal/drawer)

```
   ┌──────────────────────────────────────────────────────────────┐
   │  From: Priya Shah <priya@bigco.com>                    [ × ] │
   │  Subject: Q3 deck — needs your review by EOD                 │
   │  Received: today, 6:14 AM                                    │
   ├──────────────────────────────────────────────────────────────┤
   │                                                              │
   │  "Hey Hersh, attaching v4 of the deck. I incorporated        │
   │   the feedback from Tuesday. Would love your sign-off        │
   │   before I send to the board tomorrow morning…"              │
   │                                                              │
   │  ──── extracted ────                                         │
   │  • Ask: Review and sign off on Q3 deck v4                    │
   │  • Due: today                                                │
   │                                                              │
   │  [ Mark useful ✓ ]   [ Mark as noise ✗ ]   [ Snooze ⏰ ]      │
   └──────────────────────────────────────────────────────────────┘
```

### 6.4 Empty / loading states

```
   loading:                          empty (after dismiss-all):

   ┌──────────────────────────┐      ┌──────────────────────────┐
   │ 📥 PRIMARY               │      │ 📥 PRIMARY               │
   ├──────────────────────────┤      ├──────────────────────────┤
   │  ▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓   │      │                          │
   │  ▓▓▓▓▓▓   ▓▓▓▓▓▓▓▓▓▓     │      │   🎉 Inbox zero          │
   │  ▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓        │      │   Nothing urgent here.   │
   │  ▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓     │      │                          │
   └──────────────────────────┘      └──────────────────────────┘
```

---

## 7. Component Tree

```
   <App>
   ├── <Router>
   │   ├── <LandingPage>
   │   │     └── <ConnectGoogleButton>      ──► navigates to /connect
   │   │
   │   ├── <ConnectPage>                    (fake OAuth consent)
   │   │     └── <FakeConsentCard>
   │   │
   │   ├── <BriefingPage>                   (the main screen)
   │   │     ├── <BriefingHeader>
   │   │     │     ├── <PersonaSwitcher>    (dev-only)
   │   │     │     └── <RefreshButton>
   │   │     ├── <CalendarCard>
   │   │     ├── <ActionItemsCard>
   │   │     ├── <InboxDigestCard kind="primary">
   │   │     ├── <InboxDigestCard kind="updates">
   │   │     ├── <InboxDigestCard kind="forums">
   │   │     ├── <InboxDigestCard kind="promotions">
   │   │     └── <ItemDetailDrawer>         (renders when an item is selected)
   │   │
   │   └── <SettingsPage>
   │         ├── <ConnectedAccountRow>      (shows fake "connected as …")
   │         └── <DeliveryTimePicker>       (no-op in POC, just UI)
   │
   └── <Toaster>                            (success/undo on mark-noise etc.)
```

---

## 8. State Management

Keep it dead simple:

```
   ┌────────────────────────────────────────────────────────────┐
   │  React Query (TanStack Query)                              │
   │                                                            │
   │   useQuery(['briefing', personaId], mockApi.getBriefing)   │
   │   useMutation(mockApi.markItemNoise, …)                    │
   │                                                            │
   │   • Cache lives in memory.                                 │
   │   • Mutations call queryClient.setQueryData(…) to update   │
   │     the cached briefing optimistically.                    │
   │   • One Zustand store for transient UI state               │
   │     (selected item id, drawer open, current persona).      │
   └────────────────────────────────────────────────────────────┘
```

No Redux. No backend sync. Mutations are purely local — they call `mockApi`, which mutates an in-memory copy of the persona JSON.

---

## 9. Interactions (what actually works in the POC)

| Interaction              | Behavior in POC                                               |
|--------------------------|---------------------------------------------------------------|
| Connect Google           | Fake consent page → 800ms spinner → routes to /briefing       |
| Refresh briefing         | Re-runs `getBriefing` with a slight delay; same data          |
| Mark item as noise       | Item slides out; counter "filtered as noise" increments       |
| Mark item as useful      | Adds a small ✓ badge; item pinned to top of its section       |
| Complete action item     | Strikes through; moves to bottom of action items list         |
| Snooze item              | Removed from view; toast: "Snoozed until tomorrow 7am"        |
| Persona switcher (dev)   | Swaps JSON file → entire briefing re-renders                  |
| Export markdown          | Renders the briefing as MD and triggers a `.md` file download |
| Settings → delivery time | Just stores in `localStorage`; no real scheduling             |

---

## 10. File Layout

```
   morning-briefing-poc/
   ├── index.html
   ├── package.json
   ├── vite.config.ts
   ├── tailwind.config.ts
   └── src/
       ├── main.tsx
       ├── App.tsx
       ├── routes.tsx
       │
       ├── pages/
       │   ├── LandingPage.tsx
       │   ├── ConnectPage.tsx
       │   ├── BriefingPage.tsx
       │   └── SettingsPage.tsx
       │
       ├── components/
       │   ├── BriefingHeader.tsx
       │   ├── CalendarCard.tsx
       │   ├── ActionItemsCard.tsx
       │   ├── InboxDigestCard.tsx
       │   ├── ItemDetailDrawer.tsx
       │   ├── PersonaSwitcher.tsx
       │   └── ui/                ← buttons, cards, drawer primitives
       │
       ├── services/
       │   └── mockApi.ts         ← the only "API" the UI knows about
       │
       ├── mocks/
       │   ├── personas/
       │   │   ├── hersh.json
       │   │   ├── founder.json
       │   │   └── student.json
       │   └── exportTemplate.md.ts
       │
       ├── store/
       │   └── uiStore.ts         ← Zustand: selectedItem, drawerOpen, persona
       │
       └── types/
           └── briefing.ts        ← Briefing, ActionItem, MailItem, etc.
```

---

## 11. Mock Personas (the 3 we ship)

```
   ┌───────────────────────────────────────────────────────────────┐
   │  Hersh (default)                                              │
   │  • Founder mode: 5 primary, 3 useful updates, 2 forums,       │
   │    2 useful promos. Looks "manageable."                       │
   │                                                               │
   │  Founder firehose                                             │
   │  • 23 primary, 89 promo, 41 updates. Stress-test the          │
   │    filtering UI — make sure "47 filtered as noise" badges     │
   │    feel reassuring, not anxiety-inducing.                     │
   │                                                               │
   │  Student / light user                                         │
   │  • 2 primary, 0 action items, mostly classroom + promo.       │
   │    Tests the empty-ish states without being literally empty.  │
   └───────────────────────────────────────────────────────────────┘
```

---

## 12. Visual Design Direction

- **Calm, not noisy.** Lots of whitespace. Cards with soft shadows, not heavy borders.
- **One accent color** for "useful / action required" — everything else neutral grays.
- **Typography:** a serif for the briefing header ("Good morning, Hersh"), sans for body. The serif gives it a "newspaper / dossier" feel.
- **Numbers up front.** Every section header carries a count ("3 kept · 12 filtered").
- **No infinite scroll.** Briefing is *finite* by definition — it ends.

---

## 13. What This POC Proves / Doesn't Prove

| Proves                                          | Does NOT prove                              |
|-------------------------------------------------|---------------------------------------------|
| The layout works                                | Real classifier accuracy                    |
| Categorization is the right mental model        | OAuth UX in practice                        |
| Filtering with counts feels reassuring          | LLM cost / latency                          |
| Action items are scannable                      | Whether briefings are actually useful daily |
| The component API maps cleanly to a real API    | Mobile experience                           |

---

## 14. Path to Production (after the POC lands)

```
   POC (this doc)            v1 (full system)
   ─────────────             ─────────────────

   mockApi.ts          ──►   realApi.ts (calls FastAPI backend)
   mocks/personas/*    ──►   live Gmail + Calendar fetchers
   in-memory state     ──►   Postgres-backed briefings
   fake OAuth screen   ──►   real Google OAuth flow
   instant briefing    ──►   pre-built at 06:30 local via cron worker
   no LLM              ──►   Haiku classifier + Sonnet extractor

   The component tree, types, and visual design carry over unchanged.
```

This is the whole point of the mock-service-layer pattern: the UI is the deliverable, and the UI doesn't need to change when we plug in reality.

---

## 15. Build Order (POC, ~1 week)

```
   Day 1  ─►  Vite + Tailwind + routes + types + mockApi skeleton
   Day 2  ─►  Hersh persona JSON + BriefingPage layout + cards (static)
   Day 3  ─►  Interactions: mark noise, mark useful, complete action item
   Day 4  ─►  Fake OAuth flow + Landing + Settings + persona switcher
   Day 5  ─►  Item detail drawer + export markdown + loading states
   Day 6  ─►  Two more personas + polish pass + visual design pass
   Day 7  ─►  Record a demo video; collect feedback; decide on v1
```

---

## 16. Open Questions

1. **One column or two-column layout** on wide screens? Two reads more like a dashboard, one reads more like a morning paper. Worth A/B'ing in the POC.
2. **Should "filtered as noise" be one-click-expandable** to show what got filtered out, or kept hidden for cleanliness?
3. **Action items as checkboxes vs. cards** — checkboxes feel like a to-do list, cards feel like "things from people."
4. **Do we add a fake "yesterday's briefing"** archive view to test the time-travel UX? Cheap to mock.

---

*End of doc. POC design v0.1 · 2026-05-23*
