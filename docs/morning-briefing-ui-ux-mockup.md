# Morning Briefing — UI/UX Mockup

> Detailed visual + interaction spec for the frontend POC.
> Pairs with `morning-briefing-poc-frontend-design.md` (architecture)
> and `morning-briefing-agent-design.md` (full system).

---

## 1. Design Principles

```
   ┌───────────────────────────────────────────────────────────────────────┐
   │                                                                       │
   │   1.  CALM, NOT NOISY                                                 │
   │       The briefing is the first thing a user sees in the morning.     │
   │       It should feel like reading a curated newspaper, not opening    │
   │       Gmail.                                                          │
   │                                                                       │
   │   2.  FINITE, NOT INFINITE                                            │
   │       The briefing ends. No infinite scroll. The bottom of the page   │
   │       is the bottom of your morning.                                  │
   │                                                                       │
   │   3.  COUNTS REASSURE                                                 │
   │       "47 filtered as noise" tells the user the system is working.    │
   │       Always show what was excluded, not just what was kept.          │
   │                                                                       │
   │   4.  ONE ACCENT, ONE VOICE                                           │
   │       A single accent color marks "needs you." Everything else is     │
   │       neutral. No rainbow priority systems.                           │
   │                                                                       │
   │   5.  PEOPLE FIRST, THEN MACHINES                                     │
   │       Emails from humans rank above emails from services. Always.     │
   │                                                                       │
   └───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Design System

### 2.1 Color Palette

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │  NEUTRALS (the canvas)                                               │
   │                                                                      │
   │   ▓▓▓▓▓ ink-900     #0E1014    headings, key text                    │
   │   ▓▓▓▓▓ ink-700     #2A2E37    body text                             │
   │   ░░░░░ ink-500     #6B7280    secondary, timestamps                 │
   │   ░░░░░ ink-300     #C7CBD4    dividers, hairlines                   │
   │   ░░░░░ paper-50    #FAF8F3    page background (warm off-white)      │
   │   ░░░░░ paper-0     #FFFFFF    card surfaces                         │
   │                                                                      │
   │  ACCENT (single, used sparingly)                                     │
   │                                                                      │
   │   ▓▓▓▓▓ amber-600   #B8651B    "needs you" / action items / pinned   │
   │   ░░░░░ amber-100   #F5E3CC    accent backgrounds, badges            │
   │                                                                      │
   │  SEMANTIC                                                            │
   │                                                                      │
   │   ░░░░░ sage-600    #4A6B4A    completed / dismissed / soft success  │
   │   ░░░░░ rust-600    #A14C3D    overdue / errors (rare)               │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘

   Dark mode flips paper-50 → #1A1A1F, paper-0 → #22232A, inks invert.
   Accent (amber) stays the same hue, just slightly desaturated.
```

### 2.2 Typography

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   DISPLAY  ──  "Fraunces" (variable serif, optical size 144)         │
   │   ────────                                                           │
   │   Good morning, Hersh           ← 40px / 1.1 / weight 400            │
   │   Friday, May 23                ← 18px / 1.4 / weight 400 italic     │
   │                                                                      │
   │   HEADING  ──  "Inter" (variable sans)                               │
   │   ────────                                                           │
   │   TODAY'S CALENDAR              ← 12px / 1.0 / weight 600 / 0.08em   │
   │   tracked-uppercase                                                  │
   │                                                                      │
   │   BODY     ──  "Inter"                                               │
   │   ────────                                                           │
   │   Regular body                  ← 15px / 1.55 / weight 400           │
   │   Email subject lines           ← 15px / 1.4 / weight 500            │
   │   Sender names                  ← 14px / 1.3 / weight 600            │
   │   Timestamps                    ← 13px / 1.0 / weight 400 (ink-500)  │
   │                                                                      │
   │   MONO     ──  "JetBrains Mono"  (only for IDs, debug, export)       │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘

   Why a serif for the greeting? It signals "this was made for you, not
   generated by a system." The whole product hinges on that feeling.
```

### 2.3 Spacing & Geometry

```
   Spacing scale (px):   4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96

   Card radius:          12px
   Card padding:         24px (desktop) / 16px (mobile)
   Card gap (grid):      16px
   Page max-width:       1200px (centered, with 32px gutter)

   Hairline:             1px ink-300, used only between rows inside a card.
                         Cards themselves use shadow, not borders.

   Shadow (cards):       0 1px 2px rgba(14,16,20,0.04),
                         0 8px 24px rgba(14,16,20,0.04)
                         (soft, low-contrast — never harsh)
```

### 2.4 Iconography

```
   Icon set:    Phosphor (regular weight, 1.5px stroke)
   Size:        16px inline / 20px in buttons / 24px in section headers

   Section glyphs (used in the briefing):
     📅  ─►  <CalendarBlank>
     ✅  ─►  <CheckSquare>
     📥  ─►  <Tray>
     📰  ─►  <Newspaper>
     💬  ─►  <ChatsCircle>
     🎟  ─►  <Ticket>

   The emojis in the wireframes are placeholders; production uses the
   stroked icons for consistency.
```

---

## 3. Page-Level Layout

### 3.1 Desktop Grid (≥1024px)

```
   ◄──────────────── viewport ─────────────────────────────────────────►
   ┌────────────────────────────────────────────────────────────────────┐
   │ 32px gutter                                          32px gutter   │
   │  ┌──────────────────────────────────────────────────────────────┐  │
   │  │                  max-width 1200px, centered                  │  │
   │  │                                                              │  │
   │  │  ┌────────────────────────────────────────────────────────┐  │  │
   │  │  │                    HEADER (full width)                 │  │  │
   │  │  └────────────────────────────────────────────────────────┘  │  │
   │  │                                                              │  │
   │  │  ┌─────────────────────────┐ ┌──────────────────────────┐   │  │
   │  │  │  CALENDAR    (col 1/2)  │ │  ACTION ITEMS  (col 2/2) │   │  │
   │  │  └─────────────────────────┘ └──────────────────────────┘   │  │
   │  │                                                              │  │
   │  │  ┌────────────────────────────────────────────────────────┐  │  │
   │  │  │              PRIMARY INBOX  (full width)               │  │  │
   │  │  └────────────────────────────────────────────────────────┘  │  │
   │  │                                                              │  │
   │  │  ┌─────────────────────────┐ ┌──────────────────────────┐   │  │
   │  │  │  UPDATES                │ │  FORUMS                  │   │  │
   │  │  └─────────────────────────┘ └──────────────────────────┘   │  │
   │  │                                                              │  │
   │  │  ┌────────────────────────────────────────────────────────┐  │  │
   │  │  │              PROMOTIONS  (full width)                  │  │  │
   │  │  └────────────────────────────────────────────────────────┘  │  │
   │  │                                                              │  │
   │  │  ┌────────────────────────────────────────────────────────┐  │  │
   │  │  │            FOOTER ACTIONS + END MARK                   │  │  │
   │  │  └────────────────────────────────────────────────────────┘  │  │
   │  └──────────────────────────────────────────────────────────────┘  │
   └────────────────────────────────────────────────────────────────────┘

   Rationale: human stuff (calendar, action items, primary) gets the
   prime real estate. Machine stuff (updates, forums, promos) is below
   the fold and rendered smaller.
```

### 3.2 Tablet (768–1023px)

```
   • Two-column rows collapse to single column.
   • Card padding drops to 20px.
   • Header timestamps wrap to a second line.
```

### 3.3 Mobile (<768px)

```
   ┌───────────────────────┐
   │  ☀ Good morning, H   │ ← First name only if it doesn't fit
   │  Fri, May 23  · 7:02  │
   │  ↻                    │ ← refresh becomes an icon button
   ├───────────────────────┤
   │  CALENDAR             │
   │   …                   │
   ├───────────────────────┤
   │  ACTION ITEMS         │
   │   …                   │
   ├───────────────────────┤
   │  PRIMARY              │
   │   …                   │
   ├───────────────────────┤
   │  UPDATES              │
   │  FORUMS               │
   │  PROMOTIONS           │
   ├───────────────────────┤
   │  [ Export ]           │
   └───────────────────────┘

   Every card is full-width. Cards become 12px gap (down from 16px).
   Persona switcher moves into Settings (not on the main view).
```

---

## 4. Detailed Component Mockups

### 4.1 Briefing Header

```
   ┌────────────────────────────────────────────────────────────────────┐
   │                                                                    │
   │   ☀ Good morning, Hersh.                                           │
   │   ─────────────────────                                            │
   │      40px Fraunces, weight 400                                     │
   │                                                                    │
   │   Friday, May 23  ·  generated 7:02 AM           [↻] [⚙]          │
   │   ─────────────                ─────────────      ─── ───          │
   │   18px italic                  13px ink-500       icon buttons     │
   │                                                                    │
   └────────────────────────────────────────────────────────────────────┘

   Sun icon: ☀ uses a hand-drawn-looking SVG, not the emoji.
   Greeting changes by time of day:
     04:00–11:00  →  "Good morning"
     11:00–17:00  →  "Good afternoon"   (rare — the app is morning-first)
     17:00–04:00  →  "Evening briefing" (fallback wording)

   The 'generated 7:02 AM' has tooltip on hover:
     "Last refreshed 7:02 AM. Auto-refreshes daily at 6:30 AM local."
```

### 4.2 Calendar Card

```
   ┌────────────────────────────────────────────┐
   │                                            │
   │   📅  TODAY                                │
   │   ─────────                                │
   │   12px / uppercase / tracked / weight 600  │
   │                                            │
   │   ┌──┬──────────────────────────────┬────┐ │
   │   │● │ Standup                      │ 15m│ │
   │   │  │ 09:00 AM · Zoom              │    │ │
   │   ├──┼──────────────────────────────┼────┤ │
   │   │○ │ Design review                │ 1h │ │
   │   │  │ 10:30 AM · Room 4            │    │ │
   │   ├──┼──────────────────────────────┼────┤ │
   │   │○ │ Lunch with Maya              │ 1h │ │
   │   │  │ 13:00 · Cafe Reverie         │    │ │
   │   ├──┼──────────────────────────────┼────┤ │
   │   │○ │ 1:1 with Manan               │ 30m│ │
   │   │  │ 15:00 · Zoom                 │    │ │
   │   ├──┼──────────────────────────────┼────┤ │
   │   │○ │ Demo prep                    │ 1h │ │
   │   │  │ 17:00 · alone time           │    │ │
   │   └──┴──────────────────────────────┴────┘ │
   │                                            │
   │   4 events  ·  3h 45m booked  ·  Free 14h+ │
   │   ─────────────────────────────────────    │
   │   13px ink-500                             │
   │                                            │
   └────────────────────────────────────────────┘

   Bullet column:
     ●  = next upcoming event (amber-600, filled)
     ○  = future event (ink-300, outlined)
     ✓  = completed event (sage-600, dimmed row)

   Duration on the right is right-aligned and uses tabular numbers.
   Row hover: subtle paper-50 → paper-0 inverse tint (very faint).
   Row click: opens event details drawer (read-only).
```

### 4.3 Action Items Card

```
   ┌──────────────────────────────────────────────────┐
   │                                                  │
   │   ✅  ACTION ITEMS                       4 open  │
   │   ────────────────                       ──────  │
   │                                         pill,    │
   │                                         amber-100│
   │                                                  │
   │   ┌──────────────────────────────────────────┐  │
   │   │ ☐  Reply to Priya re Q3 deck             │  │
   │   │    ─────────────────────────             │  │
   │   │    DUE TODAY · from priya@bigco.com      │  │
   │   │    ─────────                              │  │
   │   │    amber-600, 11px, tracked              │  │
   │   ├──────────────────────────────────────────┤  │
   │   │ ☐  Send invoice to BigCo                 │  │
   │   │    Due Tue · from accounts@…             │  │
   │   ├──────────────────────────────────────────┤  │
   │   │ ☐  Approve PR #482                       │  │
   │   │    No deadline · from github             │  │
   │   ├──────────────────────────────────────────┤  │
   │   │ ☐  RSVP to all-hands                     │  │
   │   │    Due Thu · from people@…               │  │
   │   ├──────────────────────────────────────────┤  │
   │   │ ☑  Confirm flight for next week          │  │ ← completed
   │   │    ─────────────────────────────         │  │   strikethrough
   │   │    Completed 6:48 AM                     │  │   sage-600 tick
   │   └──────────────────────────────────────────┘  │
   │                                                  │
   │   ↳ Show 2 completed                             │
   │     ────────────────                             │
   │     14px sage-600 underline-on-hover             │
   │                                                  │
   └──────────────────────────────────────────────────┘

   Checking the checkbox:
     1. Tick animates from ☐ → ☑ (200ms ease-out)
     2. Row text strikes through (200ms)
     3. Row stays in place for 1.5s
     4. Row slides down into a collapsed "completed" tray
     5. Toast appears bottom-right: "Done. [Undo]"

   "DUE TODAY" label is the only amber text in the action items card.
   It earns the accent.
```

### 4.4 Inbox Digest Card (Primary)

```
   ┌────────────────────────────────────────────────────────────────┐
   │                                                                │
   │   📥  PRIMARY                          5 new  ·  0 noise       │
   │   ──────────                           ─────                   │
   │                                        pill                    │
   │                                                                │
   │   ┌──────────────────────────────────────────────────────────┐ │
   │   │ ●  Priya Shah                                  06:14 AM  │ │
   │   │    Q3 deck — needs your review by EOD                    │ │
   │   │    Hey Hersh, attaching v4 of the deck. I incorporated…  │ │
   │   │    ──────────────────────────────────────────            │ │
   │   │    13px ink-500, 1 line, truncated                       │ │
   │   ├──────────────────────────────────────────────────────────┤ │
   │   │ ●  Manan B.                                    05:48 AM  │ │
   │   │    re: integration timeline                              │ │
   │   │    Hey, was thinking about what you said yesterday…      │ │
   │   ├──────────────────────────────────────────────────────────┤ │
   │   │ ●  Accounts @ BigCo                            02:11 AM  │ │
   │   │    BigCo invoice overdue                                 │ │
   │   │    This is a reminder that invoice #4821 is now…         │ │
   │   ├──────────────────────────────────────────────────────────┤ │
   │   │ ○  Aunt Rina                              yesterday 11pm │ │
   │   │    Photos from the trip                                  │ │
   │   │    Hi sweetheart, finally got around to uploading…       │ │
   │   ├──────────────────────────────────────────────────────────┤ │
   │   │ ○  Stripe                                  yesterday 9pm │ │
   │   │    Payout of $4,210 scheduled May 24                     │ │
   │   │    Your payout is on the way…                            │ │
   │   └──────────────────────────────────────────────────────────┘ │
   │                                                                │
   └────────────────────────────────────────────────────────────────┘

   Sender column (fixed width 160px on desktop):
     ●  unread (amber-600 dot)
     ○  read   (ink-300 dot)

   Hover row:
     • Background lifts to paper-0
     • Right edge reveals three quick-action icons:
         [👁 Open] [⏰ Snooze] [🗑 Mark noise]
     • Each is icon-only with tooltip; appears with 80ms fade

   Click row:
     • Opens ItemDetailDrawer from the right
     • Briefing page dims to 60% opacity
```

### 4.5 Inbox Digest Card (Updates / Forums / Promotions)

```
   ┌────────────────────────────────────────────────────┐
   │                                                    │
   │   📰  UPDATES               3 kept  ·  12 filtered │
   │   ────────────              ───────    ────────── │
   │                             accent     ink-500    │
   │                                                    │
   │   ┌──────────────────────────────────────────────┐ │
   │   │ ◆  GitHub                                    │ │
   │   │    3 PRs need your review                    │ │
   │   │    notifications@github.com · 4:12 AM        │ │
   │   ├──────────────────────────────────────────────┤ │
   │   │ ◆  Linear                                    │ │
   │   │    2 issues assigned to you                  │ │
   │   │    notifications@linear.app · 3:45 AM        │ │
   │   ├──────────────────────────────────────────────┤ │
   │   │ ⚠  Vercel                                    │ │
   │   │    Deploy failed on main branch              │ │
   │   │    no-reply@vercel.com · yesterday 11:30 PM  │ │
   │   └──────────────────────────────────────────────┘ │
   │                                                    │
   │   ↳ Show 12 filtered as noise                      │
   │     ─────────────────────────                      │
   │     14px ink-500, on click expands a muted        │
   │     list of senders + subjects, no full bodies.   │
   │                                                    │
   └────────────────────────────────────────────────────┘

   Icon prefix changes per item:
     ◆  routine update (ink-700)
     ⚠  attention-worthy (amber-600)
     ✦  promo: deadline / money / travel (amber-600)

   These cards are visually lighter than Primary:
     - sender shown as small grey monospaced-feel text under subject
     - no body snippet by default (expand on click)
     - row height ~10px less
```

### 4.6 Filtered-as-Noise Expansion

```
   ↳ Show 12 filtered as noise            (collapsed)
                  ▼ click
   ┌──────────────────────────────────────────────────────┐
   │  Filtered out — tap any to mark useful and bring back│
   │                                                      │
   │   LinkedIn        "You appeared in 4 searches"       │
   │   Substack        "Weekly digest from 12 authors"    │
   │   Medium          "Top stories for you today"        │
   │   Indeed          "5 new jobs matching your search"  │
   │   Product Hunt    "Today's top products"             │
   │   Notion          "What's new in Notion"             │
   │   ...                                                │
   │   ─────────────────────────────────────────         │
   │   Each row: hover reveals [+ Mark useful]            │
   │                                                      │
   │   [ Collapse ]                                       │
   └──────────────────────────────────────────────────────┘

   This is the "show me my work" panel. The whole filtering
   value-prop lives in how comfortable this expansion feels.
```

### 4.7 Item Detail Drawer

```
   ┌──────────────────────────────────────────────────────────┐
   │ ◄── slides in from right, 480px wide, full height        │
   │                                                          │
   │   ╳ Close                                                │
   │                                                          │
   │   ┌────────────────────────────────────────────────────┐ │
   │   │   Priya Shah                                       │ │
   │   │   priya@bigco.com                  · today 6:14 AM │ │
   │   │   ─────────────                                    │ │
   │   │                                                    │ │
   │   │   Q3 deck — needs your review by EOD              │ │
   │   │   ────────────────────────────────                │ │
   │   │   24px Fraunces, weight 400                       │ │
   │   │                                                    │ │
   │   │   Hey Hersh,                                       │ │
   │   │                                                    │ │
   │   │   Attaching v4 of the deck. I incorporated the    │ │
   │   │   feedback from Tuesday — specifically the slide  │ │
   │   │   on retention cohorts and the new pricing page.  │ │
   │   │                                                    │ │
   │   │   Would love your sign-off before I send to the   │ │
   │   │   board tomorrow morning. If you have any final   │ │
   │   │   thoughts, just leave comments in the doc.       │ │
   │   │                                                    │ │
   │   │   Thanks,                                          │ │
   │   │   P.                                               │ │
   │   │                                                    │ │
   │   │   📎 Q3-deck-v4.pdf  ·  2.4 MB                    │ │
   │   │   ───────────────────                              │ │
   │   │   attachment chip, ink-700                         │ │
   │   │                                                    │ │
   │   └────────────────────────────────────────────────────┘ │
   │                                                          │
   │   ──── EXTRACTED ────                                    │
   │   12px tracked uppercase, ink-500                        │
   │                                                          │
   │   ▸  Ask:  Review and sign off on Q3 deck v4             │
   │   ▸  Due:  Today                                         │
   │   ▸  Reason: board meeting tomorrow                      │
   │                                                          │
   │   ──── ACTIONS ────                                      │
   │                                                          │
   │   [ ✓ Useful ]  [ ✗ Mark noise ]  [ ⏰ Snooze ▾ ]         │
   │                                                          │
   │   Snooze dropdown:                                       │
   │     • Tomorrow morning                                   │
   │     • This evening                                       │
   │     • In 3 days                                          │
   │     • Custom…                                            │
   │                                                          │
   └──────────────────────────────────────────────────────────┘

   Backdrop: paper-50 → rgba(14,16,20,0.45) on the briefing.
   Esc closes. Click-outside closes. → / ← navigate between items.
```

### 4.8 Empty / Edge States

```
   ── EMPTY: No action items ─────────────────────────
   ┌──────────────────────────────────────────┐
   │   ✅  ACTION ITEMS                       │
   │                                          │
   │              ✿                           │
   │                                          │
   │     Nothing on your plate.               │
   │     ───────────────────                  │
   │     16px ink-700                         │
   │                                          │
   │     We didn't find anything in your      │
   │     inbox that looked like a task.       │
   │                                          │
   └──────────────────────────────────────────┘


   ── EMPTY: All caught up (primary) ─────────────────
   ┌──────────────────────────────────────────┐
   │   📥  PRIMARY                            │
   │                                          │
   │              ✦                           │
   │                                          │
   │     Inbox zero.                          │
   │     ──────────                           │
   │                                          │
   │     No new mail from people overnight.   │
   │                                          │
   └──────────────────────────────────────────┘


   ── ERROR: Connection lost ─────────────────────────
   ┌──────────────────────────────────────────┐
   │   ⚠  We couldn't reach Google.           │
   │                                          │
   │     Last successful refresh: 6:30 AM     │
   │     Showing the last good briefing.      │
   │                                          │
   │     [ ↻ Try again ]                      │
   └──────────────────────────────────────────┘


   ── LOADING: Skeleton ─────────────────────────────
   ┌──────────────────────────────────────────┐
   │   ░░░░░░░░░ ░░░░░░░░░░░░░░░░             │
   │                                          │
   │   ▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓                  │
   │   ▓▓▓▓     ▓▓▓▓▓▓▓▓▓▓                    │
   │                                          │
   │   ▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓                       │
   │   ▓▓▓▓     ▓▓▓▓▓▓▓▓▓▓                    │
   └──────────────────────────────────────────┘
   shimmer animates at 1.2s cycle, paper-50 → paper-0 sweep
```

---

## 5. The Landing Page (First Impression)

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │                                                                      │
   │                                                                      │
   │                                ☀                                     │
   │                              ────                                    │
   │                              48px hand-drawn sun                     │
   │                                                                      │
   │                                                                      │
   │                       Mornings, made readable.                       │
   │                       ─────────────────────                          │
   │                       56px Fraunces, weight 400                      │
   │                                                                      │
   │                                                                      │
   │              A daily briefing built from your Gmail                  │
   │              and Google Calendar — categorized, filtered,            │
   │              and delivered before you open your inbox.               │
   │              ───────────────────────────────────────                 │
   │              18px ink-700, line-height 1.6                           │
   │                                                                      │
   │                                                                      │
   │                  ┌─────────────────────────────┐                     │
   │                  │  G  Connect Google          │                     │
   │                  └─────────────────────────────┘                     │
   │                  primary button, paper-0 bg                          │
   │                  amber-600 text, 1px ink-300 border                  │
   │                                                                      │
   │                                                                      │
   │              Read-only. We never send mail.                          │
   │              13px ink-500                                            │
   │                                                                      │
   │                                                                      │
   │                                                                      │
   │   ┌────────────────────────────────────────────────────────────┐    │
   │   │  ▒ preview thumbnail of a briefing                         │    │
   │   │  (faded, paper-50 overlay, subtle ken-burns drift)         │    │
   │   └────────────────────────────────────────────────────────────┘    │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘

   Page background: paper-50 with a faint warm gradient toward the
   top-left corner. No hero image of a screen — the *type* is the hero.
```

---

## 6. The Fake Consent Page

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │                                                                      │
   │   (the surrounding page is dimmed — Google-style modal pattern)      │
   │                                                                      │
   │   ┌────────────────────────────────────────────────────────────┐    │
   │   │                                                            │    │
   │   │   G                                                        │    │
   │   │   ──                                                       │    │
   │   │   Google brand mark (24px)                                 │    │
   │   │                                                            │    │
   │   │   Sign in to continue to                                   │    │
   │   │   Morning Briefing                                         │    │
   │   │   ────────────────                                         │    │
   │   │   20px weight 500                                          │    │
   │   │                                                            │    │
   │   │   ┌──────────────────────────────────────────────────┐    │    │
   │   │   │  hersh@appemble.com                          ▾   │    │    │
   │   │   └──────────────────────────────────────────────────┘    │    │
   │   │   account picker (read-only in POC)                        │    │
   │   │                                                            │    │
   │   │   This app would like to:                                  │    │
   │   │                                                            │    │
   │   │     ✓  View your Gmail messages and settings (read-only)   │    │
   │   │     ✓  View events on your Google Calendar (read-only)     │    │
   │   │                                                            │    │
   │   │   Make sure you trust Morning Briefing. You may be         │    │
   │   │   sharing sensitive info with this app.                    │    │
   │   │                                                            │    │
   │   │   ───────────────────────────────────────────────         │    │
   │   │                                                            │    │
   │   │             [ Cancel ]              [ Allow ]              │    │
   │   │                                     ────────               │    │
   │   │                                     amber-600 button       │    │
   │   │                                                            │    │
   │   └────────────────────────────────────────────────────────────┘    │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘

   On [Allow]:
     1. Button shows spinner (300ms)
     2. Modal fades out (200ms)
     3. Toast: "Connected as hersh@appemble.com"
     4. Route to /briefing with full skeleton, then content fades in
```

---

## 7. Settings Page

```
   ┌────────────────────────────────────────────────────────────────────┐
   │                                                                    │
   │   Settings                                                         │
   │   ────────                                                         │
   │                                                                    │
   │   ──── CONNECTED ACCOUNT ────                                      │
   │                                                                    │
   │   ┌────────────────────────────────────────────────────────────┐  │
   │   │   G  hersh@appemble.com                                    │  │
   │   │      Connected · Gmail + Calendar (read-only)              │  │
   │   │                                                            │  │
   │   │                                  [ Disconnect ]            │  │
   │   └────────────────────────────────────────────────────────────┘  │
   │                                                                    │
   │   ──── DELIVERY ────                                               │
   │                                                                    │
   │   When should we generate your briefing?                           │
   │   ┌────────────────────────────┐                                  │
   │   │   06:30 AM   ▾   in EST    │                                  │
   │   └────────────────────────────┘                                  │
   │                                                                    │
   │   ☑  Email me a copy too                                           │
   │   ☐  Send a push notification when ready                           │
   │                                                                    │
   │   ──── FILTERING ────                                              │
   │                                                                    │
   │   Aggressiveness            ●━━━━━○━━━━━○                          │
   │                            relaxed  ↑ normal  strict               │
   │                                                                    │
   │   Important senders (always show)                                  │
   │     priya@bigco.com           [×]                                  │
   │     manan@…                   [×]                                  │
   │     [ + Add sender ]                                               │
   │                                                                    │
   │   ──── DANGER ZONE ────                                            │
   │                                                                    │
   │   [ Delete all my data ]                                           │
   │   rust-600 text, ghost button                                      │
   │                                                                    │
   └────────────────────────────────────────────────────────────────────┘
```

---

## 8. Interactions & Microcopy

### 8.1 Toasts (bottom-right, 3.5s)

```
   ┌──────────────────────────────────────┐
   │  ✓  Marked as noise. [Undo]          │
   └──────────────────────────────────────┘

   ┌──────────────────────────────────────┐
   │  ⏰  Snoozed until tomorrow 7 AM      │
   └──────────────────────────────────────┘

   ┌──────────────────────────────────────┐
   │  ✓  Connected as hersh@appemble.com  │
   └──────────────────────────────────────┘

   Slide in from below, fade out. Stack max 3.
   Undo action available for 5s after destructive ops.
```

### 8.2 Voice & Tone

```
   ┌───────────────────────────────────────────────────────────┐
   │   YES                              NO                     │
   │   ───                              ───                    │
   │   "Nothing on your plate."         "0 action items found" │
   │   "Inbox zero."                    "No emails to display" │
   │   "We couldn't reach Google."      "Error 401: …"          │
   │   "Marked as noise."               "Item dismissed"       │
   │   "Mornings, made readable."       "Your AI-powered…"     │
   │                                                           │
   │   - Sentences, not labels.                                │
   │   - No "AI." No "powered by." No "smart."                 │
   │   - Talk like a thoughtful person, not a product.         │
   └───────────────────────────────────────────────────────────┘
```

### 8.3 Animations (timing & easing)

```
   Drawer slide-in:        220ms · cubic-bezier(0.32, 0.72, 0, 1)
   Toast slide-up:         180ms · ease-out
   Card hover lift:        120ms · ease-out (shadow only, no transform)
   Checkbox tick:          200ms · spring (stiffness 220, damping 22)
   Row slide-out:          240ms · ease-in (height + opacity)
   Skeleton shimmer:       1200ms · linear, infinite
   Section staggered fade: 60ms delay per card on initial load

   Reduce-motion respects: prefers-reduced-motion → all transitions
   become 0ms except shimmer which becomes a static dim background.
```

### 8.4 Keyboard Shortcuts

```
   ┌─────────────────────────────────────────────────┐
   │   r           Refresh briefing                  │
   │   j / k       Next / previous item              │
   │   Enter       Open selected item                │
   │   Esc         Close drawer                      │
   │   n           Mark current as noise             │
   │   u           Mark current as useful            │
   │   s           Snooze current                    │
   │   e           Export briefing as markdown       │
   │   ?           Show this cheatsheet              │
   └─────────────────────────────────────────────────┘

   Cheatsheet renders as a centered modal, accessible
   via the [?] button in the header.
```

---

## 9. End-of-Page Footer

```
   ┌────────────────────────────────────────────────────────────────────┐
   │                                                                    │
   │                              ───  ✦  ───                           │
   │                              hairline + glyph                      │
   │                                                                    │
   │                       That's everything for today.                 │
   │                       ─────────────────────────                    │
   │                       18px Fraunces italic                         │
   │                                                                    │
   │                                                                    │
   │              [ Export as Markdown ]    [ Yesterday's briefing → ]  │
   │                                                                    │
   │                                                                    │
   │              Next briefing: tomorrow at 6:30 AM                    │
   │              13px ink-500                                          │
   │                                                                    │
   └────────────────────────────────────────────────────────────────────┘

   The "✦" glyph and "That's everything for today." line is the
   product's signature beat. It's the equivalent of closing the paper.
```

---

## 10. Accessibility

```
   ┌────────────────────────────────────────────────────────────────────┐
   │                                                                    │
   │   COLOR CONTRAST                                                   │
   │     ink-700 on paper-50:   12.6:1   ✓ AAA                          │
   │     ink-500 on paper-50:    4.7:1   ✓ AA (large text only)         │
   │     amber-600 on paper-50:  4.9:1   ✓ AA                           │
   │                                                                    │
   │   KEYBOARD                                                         │
   │     • Every action is reachable via Tab.                           │
   │     • Focus rings: 2px amber-600, 2px offset, rounded.             │
   │     • Skip link: "Skip to briefing" at top of every page.          │
   │                                                                    │
   │   SCREEN READERS                                                   │
   │     • Section headers are <h2>, item subjects are <h3>.            │
   │     • Counts spoken as "5 new, 0 filtered as noise."               │
   │     • Action item checkbox state announces "complete" / "open."    │
   │     • Drawer has role="dialog", focus trap, returns focus on close.│
   │                                                                    │
   │   MOTION                                                           │
   │     • prefers-reduced-motion: respected globally.                  │
   │                                                                    │
   │   LANGUAGE                                                         │
   │     • All strings live in one i18n file from day one.              │
   │     • No baked-in en-US dates; all via Intl.DateTimeFormat.        │
   │                                                                    │
   └────────────────────────────────────────────────────────────────────┘
```

---

## 11. Visual Mood Board (described, since this is markdown)

```
   ┌────────────────────────────────────────────────────────────────────┐
   │                                                                    │
   │   References for the "feel":                                       │
   │                                                                    │
   │     • Readwise Reader's daily digest — calm, finite, typographic   │
   │     • NYT Morning Briefing — confident editorial voice             │
   │     • Linear's empty states — sparse, witty, never cute            │
   │     • Stripe Atlas dashboard — paper-feel, generous whitespace     │
   │     • Things 3 — checkmark satisfaction, no chrome                 │
   │                                                                    │
   │   What to AVOID:                                                   │
   │     • Notion's everything-is-a-block density                       │
   │     • Gmail's status quo (the thing we're replacing)               │
   │     • Slack-style colored sidebars and rainbow tags                │
   │     • "AI-y" gradients, glows, sparkles, robot mascots             │
   │                                                                    │
   └────────────────────────────────────────────────────────────────────┘
```

---

## 12. Open UX Questions

1. **One column vs two?** §3.1 shows two-column for human content, one for digests. Worth prototyping both and putting them side by side.
2. **Should the briefing scroll, or paginate?** Paginated feels more like a paper; scroll feels more like an app. Lean paper.
3. **Persona switcher in production:** keep it as a hidden dev feature, or expose as "view a sample" on the landing page?
4. **Dark mode by default for early-morning users?** A `prefers-color-scheme: dark` user opening this at 6:30 AM probably wants dark.
5. **Should "completed action items" persist across days,** or reset each morning? Both have arguments; default to "carryover until explicitly archived."

---

*End of UI/UX mockup. v0.1 · 2026-05-23*
