# The Dashboard, redesigned — the build's contract (2026-10-26)

**His word (2026-10-26), after the review page https://claude.ai/artifact/5d1yTNS7mtU47teLjeP2WY:** every proposal P-01…P-15 marked
**Build**, every question Q-01…Q-12 **as recommended** (`picks-2026-10-26.json`), and: *"everything looks great but the CTAs are too much to
the eyes because of primary color and go ahead with your recommendation."*

**Read first, in this order:** this brief; the drawn page `proposal-page.html` in this folder (open it in a browser — every frame, legend
and table is the spec; where this brief and the page differ, this brief wins); the four studies `A-current-dashboard.md` ·
`B-module-inventory.md` · `C-benchmark.md` · `D-1.0-home-and-chat.md`; `DESIGN-PRINCIPLES.md`; `CLAUDE.md` › *How we work* and the Map
entries your files touch; `design-source/context/page-checklist.md`; `design-source/context/responsive.md`.

## 1 · What the page is

The studio's front door, opened every morning. It answers three questions in an owner's order:
1. **What needs me now?** — *Needs you*: one ranked inbox across every module, the verb on the row, acting in place with Undo, Review in a
   pane, Not today, a ring for what is cleared today. The day can be finished: *You're all caught up*.
2. **How is the studio doing?** — *Pulse*: six figures in one strip, each with a comparison, a direction and an 8-week trend; graded where its
   report grades; *Early* on a profit before its costs are in; a press opens its report; hover (long-press on touch) breaks it down.
3. **What changed, what's coming?** — the greeting and *Since you were last here* (chips), *Your day* (the week as seven days + today's
   agenda), *Pipeline*, *Projects* (health by rule), *Team* (load against capacity), *On site* (the week's photos).

**Maison AI is docked** at the foot of the page, the way a chat input sits under a conversation: three suggestions written by rule from today's
records, the field, short answers growing above it, long ones and proposals in a pane; every card's *Ask* puts that card in its context.
Answers are small interactive cards (figures · a record · a list with verbs · a small chart · a timeline · a comparison · a receipt with Undo
· doors). The floating Maison AI button steps aside on the Dashboard only.

**Every card has a reason** — the table *Every card has a reason* on the review page is the list: one question, one source, one press, the
roles that see it. **One fact, one number**: a figure here is its module's own (never a second count), and the same fact reads the same
everywhere.

## 2 · His note: the buttons are quiet (the rule for this page)

The drawing's filled purple buttons were too loud. On the Dashboard:
- **No filled button on the page itself.** A row's verb is the design system's `Button variant="secondary" appearance="outlined"` (neutral
  ink, neutral border); a second verb on the same row is `variant="secondary" appearance="text"`. Icons inside verbs only where the verb is a
  channel (Call · WhatsApp · Directions). At most two verbs on a row; anything else is in the row's ⋮.
- **Primary colour is a seasoning, not a surface:** the Maison AI spark, the cleared ring's arc, the selected filter chip, a fresh *Since*
  chip's faint tint, the current day in the week strip (a tint, not a solid block — the drawing's solid day was loud too), focus rings.
- **The composer's send** is a neutral circle that takes the primary colour only once there is text to send (Claude's own input does this).
- **A decision surface may hold one filled button:** the Review pane, a dock proposal, a dialog — the moment you decide, like every house
  dialog's primary. Never on the page behind it.
- **Red is earned:** ours and late only (S-05). Green / red on a Pulse comparison only when the direction is good / bad for the studio (a
  falling response time is good).
- Apply the same quiet to every new surface of this build. Measure it: at 1440 the page at rest has **no** element with a filled primary
  background except the spark, the ring and the dock's send once typed — write that check into your probe.

## 3 · Layout by width (the drawn frames are the spec)

| Width | Layout |
|---|---|
| ≥1025 desk | Greeting (title) + Studio / Mine at its right · *Since* chips · *Pulse* strip of six · two stacks weighted act : glance ≈ 1.75 : 1 — **act**: Needs you, Your day · **glance**: Pipeline, Projects, Team, On site · the dock fixed at the foot of the content area (max 760 wide, centred on the content), the cards scrolling under a soft fade. |
| 1024 sideways (touch) | The desk's two stacks (1.5 : 1); Pulse shows four, the rest a swipe away (the house chip rail's edge fade says it scrolls); the dock at the foot at 640; answers in a pane. |
| 768–1023 upright | One column in reading order: greeting · Since (one row, scrolls) · Pulse three across · Needs you · Your day · Projects · Pipeline · Team · On site; the dock at the foot at 16px type; answers in the house Sheet. |
| ≤767 phone | The same order; Pulse 2×2 after Needs you; the field is an accessory just above the dock (48 tall) that **shrinks into a 44 ✦ at the dock's end while you scroll down** and comes back on scroll up; a tap opens the house Sheet (answer · suggestions · the field at its foot, the keyboard lifting it). A phone held sideways stays shrunk. |

House scale on ≤1024: 16 body · 14 secondary (never under 14 for a value, a name or a sentence) · 44 targets · 16 gutters · inputs at 16
(responsive.md § On the move). ≥1440: the Dashboard changes on purpose; **every other page stays byte-identical** unless your lane changes it
on purpose (name it in your outcome).

## 4 · The contract (already in main's tree, uncommitted — your WIP base)

| File | What | Owner |
|---|---|---|
| `drizzle/0115_dashboard_front_door.sql` + `lib/db/schema.ts` | `members.dashboard_seen_at · dashboard_since_at · dashboard_prefs`, table `dashboard_snoozes` | done — **no lane writes a migration**; need another column? say so in your outcome, use a JSON field you own meanwhile |
| `lib/db/baseline.ts` | `dashboard_snoozes` in `BASELINE_TABLES` | done |
| `lib/dashboard/model.ts` | `DashboardData` (the page's parts) + the S22 helpers other files still read | D1 (types); **don't delete old helpers** — the landing removes the dead ones |
| `lib/dashboard/context.ts` | `DashCtx`: viewer · role · scope · prefs · seen · `from()` · `isMine()` · `read.*` (each module's records, read once) | D1; others read it, add a read only inside your own file |
| `lib/dashboard/frame.ts` | cards per role (`cardsFor`), prefs (`DashPrefs`, `HIDEABLE`), Studio / Mine (`scopeFor`), `greetingAt` by `STUDIO_TZ` | D1 |
| `lib/dashboard/queries.ts` | `fetchDashboard(scope)` — assembles the parts in parallel | D1 |
| `lib/dashboard/since.ts` · `since-queries.ts` | Since you were last here | D1 |
| `lib/dashboard/pulse.ts` · `pulse-queries.ts` | Pulse | D1 |
| `lib/dashboard/inbox.ts` · `inbox-queries.ts` | Needs you | D2 |
| `lib/dashboard/cards.ts` · `cards-queries.ts` | Your day · Pipeline · Projects · Team · On site | D3 |
| `lib/dashboard/dock.ts` · `dock-queries.ts` | the docked field's suggestions and each card's context | D4 |
| `lib/dashboard/tasks-queries.ts` | `myOpenTasks` (the ghost seed reads it) | shared, unchanged |
| `components/dashboard/dashboard-view.tsx` · `dashboard.module.css` · `dashboard-ghost.tsx` · `frame/*` | the frame, greeting, Since chips, Pulse strip, the ghost | D1 |
| `components/dashboard/inbox/*` | Needs you + the Review pane | D2 |
| `components/dashboard/cards/*` | the five cards | D3 |
| `components/maison-ai/dock/*` | `MaisonDock` · `askAbout(card)` | D4 |
| `lib/projects/need-icon.ts` | the Needs-you glyphs (moved out of the client card so the server reads them) | shared |
| `lib/leads/tasks.ts` `countApprovalsWaiting` | now reads `fetchInbox(dashboardContext())` | D2 keeps it right |

Each region's component already renders (a placeholder on the house Card / Row / StatTile) so the page works while you build; replace yours
whole. **Props are the contract:** `Greeting({ data })` · `SinceChips({ data })` · `PulseStrip({ data })` · `NeedsInbox({ data, next })` ·
`YourDayCard({ data })` · `PipelineCard({ data })` · `ProjectsCard({ data })` · `TeamCard({ data })` · `OnSiteCard({ data })` ·
`MaisonDock({ data })` — `next` (D1 passes it) = the first coming item of `data.day` for Needs you's *all caught up*. Add an optional prop if
you must and say so; never rename one.

**Shared marks between parts:**
- Every Needs you row carries `data-inbox-row={row.key}` (D2). A *Since* chip about something that also waits in Needs you carries `rowKey`
  (D1 adds the optional field to `SinceChip`) and, pressed, **scrolls to that row and pulses it** (the house `attention()` pattern) instead of
  leaving the page.
- Every card head carries the dock's Ask: `askAbout('<card key>')` from `components/maison-ai/dock/maison-dock.tsx` (D4 builds it; D1–D3 call
  it from your card heads — the ✦ Ask text button at the head's right; the house Card's head may need an `extra` slot: D1 adds it to the
  dashboard's own head wrapper, not to the house Card).
- **One place for each thing:** the member's own tasks live in *Your day* (late ones first, red) — never also in Needs you; a project's
  waiting work in *Needs you*; a project's health in *Projects*. Tickets and client messages that wait for a reply are Needs you rows (the
  projects' own `ticket` · `message` kinds); new ones since the mark are also *Since* chips (FYI, opening the row).
- Where S22's tiles go: Open projects → the Projects card's head ("Projects · 4 running"); Contractors → the Team card (a line under the
  members: free this week · over capacity · starting with no contractor, from `boardOf`); Tickets → Needs you rows (and a Since chip for new
  ones); Messages → a Since chip; Market Insights → off the page (P-15; a new article may be a Since chip). Existing probes that assert those
  tiles (`verify-pm2-s45a/b`, `s46b`, `s22`, …) are updated by the lane that moved the thing, the assertion commented
  `(Dashboard redesign 2026-10-26, a deliberate change)` — assert the new home instead.

## 5 · Lanes

**D1 — the frame, Since and Pulse** (port 3221; repair rule **R177**)
- The frame and layout at every width (§ 3), the greeting (title = "Good morning, Dane" by `greetingAt`, the line with what needs you and
  how many are new since the mark), Studio / Mine for Owners and Admins (Q-07: the house SegmentedButton or Chips; remembered in prefs;
  Mine = their own leads / projects / tasks across every part — the parts read `ctx.scope`), hide a card for yourself and Show hidden cards
  (Q-06: each card's ⋮ › Hide this card, with Undo; prefs on the record — `app/dashboard/frame-actions.ts` `setDashboardPrefs`), every role's
  page (P-11 · the Roles table; `cardsFor`), **Accounting's front door is the Dashboard** in its money layout (Q-08: `homeOfRole`, the Finance ›
  To do door stays in their rail).
- *Since you were last here* (P-02): the mark (`members.dashboard_since_at`, moved by `markDashboardVisit` from the page after it renders:
  a new sitting when the latest view is older than `SITTING_GAP`), the chips from the records' own dates on what this member sees — new leads
  (by source), quotes confirmed / opened by the client, contracts signed, payments a client says they made, site updates published, client
  messages, tickets raised, a new Market Insights article; each opens exactly that (or its Needs you row); fresh ones tinted; a pressed chip
  leaves the row for this browser. First visit: what is new this week. Demo: **R177** puts Dane's mark on the demo's last Friday 6 PM and the
  two columns in `lib/db/time-columns.ts` so they move with the demo day.
- *Pulse* (P-03 · Q-04): per role — Owner / Admin: Leads this week · Won (90 days) · First response (graded) · Owed to you (by age: ≤30 · 31–60
  · 60+) · Coming in (30 days) · Profit this month (*Early* while costs are thin — `profitGrade` / `profitShown` in `lib/finance/profit.ts`;
  hidden where `seesProfit` says no); Manager: Leads this week · Won · First response (their team); Designer: My leads · My projects ·
  Commission owed to you; Accounting: Owed to you · Coming in · You owe · GST this quarter; Marketing: Leads this week (by source) · First
  response. Each value is its report's own; the comparison is the same rule over the period before; the 8-week trend from the records' own
  dates (no snapshot table); the house StatTile extended additively (`delta` · `trend` · `grade` · `aging` · `early` · a breakdown on hover /
  long-press) or a strip on its classes — never a copy of its stylesheet. Keep `tile-<key>` test ids.
- The ghost (loader = reveal, per role and per width, `lib/ghost-shapes.server.ts` seed updated), the page's speed (P-14: first answer under
  0.15 s on the demo at 1440 — measure before / after), the greeting's clock (P-14, done in `frame.ts` — use it).

**D2 — Needs you, one inbox** (port 3222; repair rule **R178**)
- P-04: every module's waiting work, ranked (Your OK first, then Q-03's order), **every project's rows** (not only its first), plus the
  signals the page never had (B §18 bands ① ②): quotes opened by the client but not confirmed (opened ≥ 2 times or 3+ days), changes asked
  on a quote, quotes expiring within 3 days, contracts out for signature and not opened / not signed after 3 days, a new lead not called
  within the hour, tickets and client messages waiting on the studio, AI credits running low (the credits summary's own level), Xero failing to
  sync — each read through its module's own rule, scoped to what this member sees (Who sees leads, `Viewer.costs`), each with `?from=`.
- The verbs in place (his note: quiet buttons, § 2): Publish / Agree / Approve (the tab's own server actions — `useNeedActions`'s
  `ANSWERED_HERE` set is the reference, with the same sentence and Undo), Remind (the house WhatsApp draft — `lib/portal/model.ts` `waLink` —
  opening on the press, REG-534; record the reminder where the module records one), Confirm a client's payment (Money's own action), Call /
  WhatsApp a lead (`tel:` · `wa.me`; on return, the snackbar offers *Log the call* → the house log sheet), Write up · Assign · Open (doors).
  Optimistic: the row leaves at once, comes back if the server refuses, the snackbar names what failed (house rule).
- P-05 the **Review pane**: the house Drawer (480) at ≥768, the house Sheet on a phone — the record's facts and pictures and its two answers
  (approve · send back / decline) through the tab's own actions; the list keeps its place, the next row one press away (J). Kinds: a site
  update, a Done ask, an ask for more time, a quote waiting for approval, a Price book proposal, a supplier bill / expense / PO approval, an
  AI credits ask. A kind with no pane: Review is its door.
- Q-05 **Not today**: ⋮ › Not today (back tomorrow) with Undo — `dashboard_snoozes`, actions in `app/dashboard/inbox-actions.ts`; a row that
  changes (its key) comes back at once; "n set aside for today · Show" at the list's foot. Approvals past their day and ours can't be set aside.
- The filter chips (All · Your OK · Clients waiting · Late · Money · New leads — only those with rows), the cleared ring (**what the records
  say this member finished today** — tasks done, approvals given, payments confirmed, reminders sent, leads contacted; never a browser
  counter), Show n more (six at a desk, four on a phone), **You're all caught up** (Q-11: calm, the ring full, "Next: {next}" from `next`).
- Keys (the house DOM contract, `data-kb-list` / `data-kb-row` / `data-kb-open`): J / K move, Enter acts (the row's first verb), R reviews.
- Keep `countApprovalsWaiting` (Tasks' line) counting the same Your OK rows.

**D3 — the cards** (port 3223; repair rule **R179**)
- *Your day* (P-06): the week as seven days with dots (the current day tinted, § 2), a day pressed shows its agenda in place; today's
  meetings (time · length · *Prepare me* → the dock asks it), calls due (Call · WhatsApp), the member's tasks (late first, red; tick with
  Undo — the Tasks tab's own `setTasksDone` / `undoTasksDone`), milestones starting, Hangouts; Accounting's week = money in and out due. The
  ring = today's done of today's. Directions for a site visit (the project's address → maps). **Fix P-14's Coming up cut**: the projects'
  Coming up is cut to six inside `lib/projects/queries.ts` before the Dashboard merges it — keep the six on the project's card, give the
  Dashboard the whole list (you own that change; the project page must stay byte-identical).
- *Pipeline* (P-07): visible leads by stage (New → Won), bars to the largest, an amber mark where leads sit past the stuck rule (Reports ›
  Leads › Sales' *Where leads stop* / days in stage — its own rule), "3 stuck over 14 days · 2 going quiet" (Sales' *Going quiet*); a stage
  opens the listing filtered to it (`lib/leads/listing-url.ts`).
- *Projects* (P-08 · Q-10): one line per running project — health **by rule** (late = a milestone of ours past its end or money of ours late;
  at risk = a milestone ending within 3 days not started, an ask for more time open, a client payment overdue, costs over the contract's
  share; on hold / setting up say so), its why in words, progress (milestones done of all, by days), the next fact; the head "Projects · n
  running" (the old Open projects tile). Pure rule in `lib/dashboard/health.ts` (or `cards.ts`) with its own pure probe.
- *Team* (P-09): each member's projects against their capacity line, over in amber (never red — it is a load, not a lateness), open leads,
  Open to new leads; the contractors' line (§ 4); opens Workload.
- *On site* (P-09): the week's published site updates' photos (`/files/thumb/<fileId>`, the house thumb), a photo opens its update; "6 photos"
  in the head; nothing published this week → the card is left out.

**D4 — Maison AI, docked** (port 3224; no repair rule)
- `MaisonDock` (P-01 · Q-01 · Q-02 · Q-09): the field at the content's foot (§ 3), three suggestions by rule (Q-03, `dock-queries.ts`: a
  meeting next today → "Prepare me for 2 PM with Kelvin"; a quote waiting on its client → "Remind Aisha about OM-10009"; the books → "How is
  cash this month?"; else what the role reaches for — every chip must be answered well by `lib/maison-ai/answer.ts`, extend the intents where
  it isn't), the context chip from a card's Ask (`askAbout`, `DockContext`), short answers growing above the field (a thread of the last
  three, Stop / Retry while it reads, Esc folds it), long answers and every proposal in the house Drawer pane (desk) / Sheet (≤1023 upright and
  phone), ⌘J / Ctrl J focuses it (the keys registry + the ? panel; on other pages ⌘J opens the FAB sheet's Ask), `askMaisonAi` on the
  Dashboard goes to the dock. The FAB steps aside on `/dashboard` at every width (Q-02) — every other page keeps it; check the snackbar and
  `--fab-clearance` still clear the dock.
- The phone accessory and its shrink into a ✦ at the dock's end (`components/shell/mobile-nav.tsx` — the Dashboard only), the Sheet, the
  keyboard (`visualViewport`), a phone held sideways.
- P-10 **answer cards**: extend `MaisonAnswer` additively (`figures` · `record` · `chart` · `timeline` · `compare` · `receipt` · `doors`) and
  draw them in both the dock and the FAB sheet (`components/shell/maison-answer.tsx`) on house pieces (StatTile, the house timeline
  `components/om/timeline.tsx`, Row, the quiet buttons of § 2); give the answers the dock's chips reach their cards (cash → figures + a
  4-week bar chart + doors; prepare me → the lead's record card + Call now / Open lead; how is the studio doing → figures; remind → a proposal
  whose run returns a receipt with Undo). Doors that repeat fold into "Open … · n ▾" (1.0's grouped doors).
- Q-12: no voice button.

**D5 — one fact, one number, and the bugs** (port 3225; repair rule **R180**)
- P-13 across the modules the Dashboard reads (B's stitching list and A §5 are the list — fix those the Dashboard shows, list the rest):
  **one overdue clock** (the bell and the task lists — `lib/format.ts` `isOverdue` is the rule; the bell's derived rows follow it), **one
  Owed to you** (Reports › Finance AR's figure wherever "Owed to you" is written), **one tickets count** (`ticketTally` everywhere, one name),
  **one "not contacted"** rule (`lastContactOf`), **"Needs attention"** meaning one thing (or two names), money on record cards as `moneyCard`
  ("S$ 77,900"), dates one way, "5 days overdue" never "(5d)".
- P-14 bugs: a quote's due-date follow-up task closes when the quote is confirmed or signed (every path — `confirmQuoteOnline`,
  `signQuoteThrough`, Mark as confirmed / signed; Undo reopens it); the bell stops ringing for supplier bills still awaiting approval (they
  ring the approver, not the payer); anything else B / A list as a bug outside the Dashboard's files.
- You own no Dashboard file: where a fix needs the Dashboard to read a new function, export it and say so in "For other lanes".

## 6 · Rules for every lane

House pieces only (`components/om/*`, `@/components/ds`, `Dialog` / `ConfirmDialog` / `Drawer` / `Sheet` / `SurfaceHead` / `SurfaceFoot`,
`PortalMenu` + `DropdownItem`, the listing's table model, `Chips`, `StatTile`, `Timeline`, the house snackbar with Undo) — never a copied
stylesheet, never a hand-rolled head / close / foot / menu row. `--om-*` tokens. Every door carries `?from=/dashboard` where its home has a
Back (`ctx.from`). Who sees leads and `Viewer.costs` on every read. A refused action answers `{ error }` and the snackbar says it
(`Couldn’t …`). A long string to a server action rides in one object. An optimistic write puts the value back when refused. A dialog closes
only once its save lands. Every press answers; nothing inert. Words: the house vocabulary (DESIGN.md › copy), plain, sentence case, no
"(5d)", no jargon; every invented word is an `invented copy` row. Icons: only names in `public/fonts/ICONS.txt` — need another? use the
closest one there and list it in your outcome (the landing re-subsets once). CSS: an override of a house class is order-proof with a doubled
class (`.x.x`), never `!important` (the load-order lesson, REG-2883…). `npm run design:lint` never rises (never touch its baseline);
`design:anatomy` on your build. Demo data consistent (REG-343): your repair rule writes the trail a state needs, idempotent, with its
verification query; run `npm run db:repair` on **your lane DB only**. **Never `local.db`, never :3000 / :3001, never `db:baseline`.**
Nothing committed by you (the WIP base is the lane's only commit).

## 7 · How a lane works

1. **Set up** from your worktree: `bash /private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/dash-build/setup-lane.sh <D>`
   (the contract committed as your WIP base, `node_modules`, `.env.local`, `…/dash-build/<D>/lane.db` = a fresh restore with migration 0115).
   Builds take the lock: `until mkdir …/scratchpad/dash-build/build.lock 2>/dev/null; do sleep 15; done; npx next build; rmdir …/build.lock`
   (always release it; run builds in the background). Serve with the DB on the command itself:
   `DATABASE_URL=file:<lane.db> npx next start -p <port>`; stop it by port only (`lsof -ti tcp:<port> -sTCP:LISTEN | xargs kill`).
2. **Build** your part to the drawn page and this brief. Look at it yourself at 1440 · 1280 (mouse) · 1024 sideways (touch) · 768 upright
   (touch) · 390 (touch) · 320 · 844×390 (a phone held sideways), as Dane (Owner) and as each role your part reads differently (View as:
   Hui Min Admin, a Manager, a Designer, Priya Tan Accounting, Nurul Huda Marketing). Open everything a person opens: each ⋮, chip, pane,
   sheet, the empty state, the ghost (hold the reveal as `verify-pm2-s17.cjs` does).
3. **Verify** by real presses on the production build, shots in `…/dash-build/<D>/shots/`; the 1440 pixel diff of every *other* page you
   touched (byte-identical unless named); 320 and 844×390 for no sideways scroll; the § 2 quiet check.
4. **Deliver** — `outcome-d<n>.md` in this folder (each brief item: built where · kept why · not done why; ▲ decisions for him; shared pieces
   changed; For other lanes; tallies; a Principles check one line per principle of `DESIGN-PRINCIPLES.md`), staged register rows
   `reg-d<n>.md` (`| REG-D<n>.m | Area | **What** — why (his marks on the Dashboard review page, 2026-10-26) | user-directed · invented copy ·
   bug fix |`), and a probe `design-source/verify/dashboard-2026-10-26/verify-dash-d<n>.cjs` (args `<scratch.db> [shotDir] [base]`, env
   `BASE`, refuses `local.db`, puts back what it writes, REPO from `process.cwd()`, sqlite3 with `-cmd ".timeout 30000"`, asserts rules not
   counts, real presses) + its line in `design-source/verify/regression/probes.cjs`. Run your probe and every existing probe your files reach
   through the harness (`design-source/verify/regression/run.cjs`, RUN_DIR with a `base.db` copied from your lane's clean DB).
5. **His bar:** nothing missed, nothing buggy, every pixel checked, world-class and calm. If it is not right yet, fix it.

Final message: 10 lines + the outcome path + the files you changed or added.
