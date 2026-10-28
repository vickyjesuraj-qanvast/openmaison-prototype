# The Dashboard, redesigned — ideation (2026-10-26)

**His ask:** "I'm not very happy with the dashboard screen … it looks very text heavy, but less interactive. Like for example … the card that we
have for Maison AI can be more sticky, like how your Claude chat input is. And also I want you to redesign the whole page, keeping in mind the
intuitive design, less cognitive load, and very engaging screen, because the studio opens this as the first screen and looks at the screen day
to day. As being an owner, this is very important screen for them, and make sure it has all the data across our prototype modules, and
everything is stitched together, and to make sure that every card has a reason … tell me what is missing and what has not been built and what is
good across modules, how our dashboard should behave, all interactions, layouts, our consistency, and then any responsive design interaction
from a mobile perspective, tablet perspective, and the desktop perspective. So make sure you give me the visual design before implementing
this. So let's ideate, and if there are any questions, please ask."

**Nothing is built until he marks the proposal.** His rules that hold: a record with tabs stays one page (REG-2734); house pieces; the mock wins
where one exists; the desk's other pages unchanged.

## How it runs
1. Four read-only studies in parallel: **A** the Dashboard as it is (per role, every width, every press) · **B** every module's daily
   signals (what exists, what the Dashboard shows, built / weak / not built, stitching problems) · **C** a benchmark of daily home screens and
   AI-composer patterns, with principles · **D** 1.0's chat-first home and the interactive components in the chat and under it (his note:
   "1.0 had some good interactive components in chat and under it"), across 1.0's live branches.
2. The proposal: what the page answers, its zones, every card with its reason, the Maison AI composer docked like a chat input, the
   interactions, the layouts at desk / tablet / phone, consistency — drawn as screens on a review page, with the questions and his picks.
3. Build only what he marks.

## Log
- 2026-10-26 — his ask; studies A · B · C launched (Opus, read-only).
- his note "1.0 had some good interactive components in chat and under it" → study D launched (1.0's repo read-only, every live branch).
- study **C** back: 17 home screens + 9 assistant inputs, 15 principles, anti-patterns, the composer's six states per width, six questions (`C-benchmark.md`).
- study **A** back: the Owner's page 410 words · 87 figures, 92% of the first screen's text 12–14px, 37 of 45 presses leave the page, the brief scrolls away, the page contradicts itself (overdue 3 vs 2, new leads 4 vs 5, totals 31 · 30 · 21), Accounting / Marketing get little; what to keep in §6; shots in the scratchpad's `dashboard/shots/` (`A-current-dashboard.md`).
- study **B** back: 16 module tables, 55 places where two parts tell the same fact differently, the signals in five bands, what is missing / held, 12 patterns to keep; three bugs on the way (a quote's follow-up never closes on confirm / sign; Coming up cut to six per project before the merge; the bell rings for bills still awaiting approval) (`B-module-inventory.md`).
- study **C** and **D** back (`C-benchmark.md`, `D-1.0-home-and-chat.md`: 1.0's chat-first home, its answer components A-1…A-19, what sat under the chat, what to bring and what not to copy).
- **The proposal, drawn:** the review page https://claude.ai/artifact/5d1yTNS7mtU47teLjeP2WY (*The front door, made to be used every morning*): the verdict in numbers; three questions in an owner's order; the desk at 1440 (greeting · since you were last here · Pulse of six · Needs you as one ranked inbox · Your day · Pipeline · Projects · Team · On site · Maison AI docked at the foot with three suggestions); the answer growing above the field and Review in a pane; 1024 sideways and 768 upright; the phone at rest, the Maison AI sheet, and scrolled with the field shrunk into a ✦ at the dock's end; every card's reason; the composer's states per width; the answer cards; interactions; roles; one fact one number; bugs on the way; good / missing / not built. **P-01…P-15** (Build · Later · Skip) and **Q-01…Q-12** (recommended marked), his marks in its db `picks` (empty at publish). Source `…/scratchpad/dashboard/front-door.html`. Build nothing until he marks it.
- **His marks (read 2026-10-26):** every proposal P-01…P-15 **Build**, every question Q-01…Q-12 **as recommended** (`picks-2026-10-26.json`),
  and his note: *"everything looks great but the CTAs are too much to the eyes because of primary color and go ahead with your
  recommendation."* → the build's button rule (`brief.md` § 2): no filled button on the page; a row's verb is the DS secondary outlined
  button, a second verb secondary text; primary colour only for the spark, the ring's arc, the selected chip, a fresh chip's tint, the
  current day's tint and focus; the dock's send fills only once typed; a decision surface (the Review pane, a proposal, a dialog) may hold one
  filled button.
- **The contract** (in main's tree, uncommitted): migration **0115** (`members.dashboard_seen_at · dashboard_since_at · dashboard_prefs`,
  table `dashboard_snoozes`, in `BASELINE_TABLES`); `lib/dashboard/context.ts` (every module's records read once per page); the part files
  `frame · since · pulse · inbox · cards · dock` (+ `*-queries.ts`), `DashboardData` v2 in `model.ts`; the frame view with one placeholder
  per region (`components/dashboard/{frame,inbox,cards}/*`, `components/maison-ai/dock/maison-dock.tsx`); the Needs-you glyphs moved to
  `lib/projects/need-icon.ts`; `countApprovalsWaiting` reads `fetchInbox` alone. The brief: `brief.md`; the drawn spec: `proposal-page.html`.
- **Five lanes launched** (worktrees, WIP base = the contract; `…/scratchpad/dash-build/`): **D1** frame · greeting · Studio / Mine · hide a
  card · roles · Since · Pulse · ghost · speed (3221, R177) · **D2** Needs you inbox · verbs in place · Review pane · Not today · ring ·
  caught up · keys (3222, R178) · **D3** Your day · Pipeline · Projects health · Team · On site · Coming-up cut (3223, R179) · **D4** Maison AI
  docked · answer cards · FAB aside · ⌘J · phone accessory (3224) · **D5** one fact one number · the bugs outside the Dashboard (3225, R180).
- **D3 landed** (the five cards + P-14's Coming-up cut; probe dash-d3 139/139, pure health probe 39; R179 Dane's day; outcome-d3.md). Plain
  apply, tsc + eslint clean, his :3000 renders. To look at in the closing pass: "stuck over 14 days" marks four of five stages on the demo
  (D3 ▲3), R179's 10:00 / 2 PM meetings turn into red Write-up rows in an afternoon demo (▲11), the Team row's figure under the FAB until D4
  lands. R179 reaches local.db at the end (one `db:repair` after a backup).
- **D5 landed** (P-13 one fact one number across the modules + P-14's bugs: one overdue clock, quote follow-ups close on confirm / sign with
  Undo, no bell for bills awaiting approval, the rail's Finance count with C8 bills, credited invoices off the bell, Maison AI's counts = their
  pages, "5 days overdue", REG-D5.1…17; probe dash-d5 53/0; outcome-d5.md ▲1–4 for him). Plain apply minus `probes.cjs` (D3 had changed it),
  its seven registry lines added by hand; tsc + eslint clean; his :3000 renders. D3's and D5's patches handed to D1 · D2 · D4
  (`…/dash-build/handoff/D3.patch` · `D5.patch`) with each one's hand-offs, so their landings don't clash (D5 touched D4's Maison AI answers and
  D2's `lib/leads/tasks.ts`).
- **D2 landed** (Needs you as one inbox: every project's rows, the new signals, quiet verbs in place with Undo, the Review pane, Not today, the
  chips, the ring from the records, all caught up, J / K / ↵ / R; R178; probe dash-d2 111/111; outcome-d2.md ▲). Its own patch (built on
  base + D3 + D5) applied plainly; its registry line and 11 shots added by hand; tsc + eslint clean; his :3000 renders (49 rows for Dane,
  six shown). To weigh in the closing pass: the inbox's length on the demo (49), the chips' look, R in the ? panel on every page.
- **D4 landed** (Maison AI docked: the field at the page's foot, three suggestions by rule, short answers above / long in the Drawer or Sheet,
  Stop · Retry, a card's Ask as a context chip, ⌘J, the FAB aside on /dashboard only, the phone's accessory shrinking into a ✦, the answer
  cards in the dock and the sheet, Remind with a receipt and Undo; REG-D4.1…22; probe dash-d4 93/93; outcome-d4.md ▲). D4 had merged D3 and
  D5 into its own tree, so its own files were merged one by one against a rebuilt start tree (base + D3 + D5): 60 taken whole, 3 merged
  (`shortcuts/dom.ts`, `keys/registry.ts` with D2's R key, `verify-pm2-s22.cjs`), `probes.cjs` both sides kept. tsc clean; eslint only the
  three known `quote-editor.tsx` errors; design:lint nothing new; his :3000 renders with the dock, the FAB still on other pages.
- **D1 landed** (the frame at every width, the greeting by the studio's clock, Studio / Mine, Hide this card with Undo, every role's page,
  Accounting's front door, Since you were last here with R177, Pulse with comparisons · trends · Early · aging, the ghost per role and width,
  the first byte 300 → 78 ms; REG-D1.1…12; probe dash-d1 141/141; outcome-d1.md ▲1–10). Merged like D4 (its tree held D3 + D5): 52 files
  whole, 5 merged (`card-frame.tsx` with D2's `needs` key, pm2-s22 · s30 · s41b1 · s42a), the page moved into `app/dashboard/(home)/`,
  `probes.cjs` and the repair script both sides kept (R178 · R177 · R179 in order). tsc clean after the build regenerated its route types;
  eslint the three known; design:lint nothing new.
- **The demo's records** (his rule: demo data consistent, REG-343): `fixtures/baseline.json` rebuilt from a clean scratch restore + migrations +
  `db:repair` (never from local.db, so none of his own clicks ride into Reset) — +10 rows (R179's meetings · tasks · contact log · assignees,
  R177's mark, R178's openings), demoDay 2026-10-26; `dashboard_snoozes` added to `scripts/snapshot-baseline.ts`'s list. His local.db: backed
  up (`…/scratchpad/local-before-dashboard-repair.db`), `npm run db:repair`, all checks pass (leads 42 · stage logs 56 unchanged; meetings 4 → 6,
  tasks 57 → 60).
- **Register:** the lanes' 84 staged rows numbered REG-2930…REG-3013 (`reg-map.json`).
- **Closing pass:** *one record for a reminder* — D2's Needs you Remind kept a private Dashboard note (`dashboard_snoozes` `reminded:` rows) while
  D4's Maison AI Remind kept the client's Activity line (`portal_reminded`, `quote:<id>`): one action, two records, and a reminder sent from
  one place didn't quiet the other. Now both write and read the Activity line (`recordQuoteReminder` · `undoQuoteReminder`), the row rests for
  the dock's REMIND_QUIET_DAYS, the ring counts it from the Activity; the private note is gone (`REMINDED`, `noteReminder`). dash-d2's check
  restated (a deliberate change).
- **Closing regression** (fresh baseline + repair as base.db, the merged production build, two lanes on 3241 · 3242 + the unregistered ones
  directly on 3243): 39 harness probes, then the failures one by one — dash-d3 (Esc didn't fold the dock's thread when focus was outside the
  dock → **REG-3015**, a real defect), dash-d4 (its "scrolled" step landed on the page's end, where the panel's 8px inset shows — measured
  mid-scroll now), dash-d5 (Maison AI's overview became figures — the probe reads them), pm2-s22 (§ 2 the old brief → the greeting; a `t0`
  declared twice; the ghost compared by `data-slot` — and a real ghost jump for Accounting → **REG-3016**), pm2-s46b (the Tickets tile → the
  rail's count + Needs you rows), pm2-s43a (the greeting read from the title). Registered the seven probes the round reached that had no line
  (s37 · s41b1 · s41b5 · s43a · pm-e · pm-h; s42a / s42d run directly — their REPO resolves outside the harness copy).
- **His "too busy" (2026-10-26)** — the built page measured at 1440's first screen: 506 words · 43 boxes · 77 controls · 13 type sizes · 14 tints
  · 13 uppercase labels · 8 regions. He shared a Claude Design option (`calm-mock-claude-design.png`); my take: adopt its layout with six
  corrections (no filled buttons — its Publish / Approve / the solid day / the send were filled; a client's debt amber not red; the house words;
  what he marked Build kept out of sight until wanted; Pipeline's stuck rule relative to the studio's own median; the house radii) — his "yes".
  **The calm pass** (`brief-calm.md`): four lanes from main's uncommitted state (`…/scratchpad/calm-build/`) — C1 page · greeting · Pulse
  (3251) · C2 Needs you (3252) · C3 the cards + the shared head + the stuck rule (3253) · C4 Maison AI's pill (3254).
- **C4 landed** (Maison AI at rest = one 640 × 52 pill; suggestions, the card chip and the + only while in use; the send neutral until typed;
  the dock at rest 22 → 8 words, 6 → 2 controls, 154 → 76 px; REG-C4.1…8; dash-d4 107/107, s10 · kb-r1 · kb-r2 · s22 · d3 · d1 green;
  outcome-c4.md ▲: the ⌘J key chips, Reset one step deeper, the typing hairline, Esc lets go of the field). Its page-foot / grey / ghost
  notes sent to C1.
- **C2 landed** (Needs you calm: text tabs All · Approve · Clients · Late, five rows of one title + one caption ≤ 60 + amount + one outlined
  verb, the row's ⋮ on hover at a desk, "Show all n" + "n set aside for today", no ring; the card at rest 185 → 86 words, 30 → 16 controls,
  18 → 11 boxes, 562 → 412 px; REG-C2.1…7; dash-d2 149/149 and s22 · s46b · s46c · s37 · kb · d1 · d4 · d5 · s45b green; outcome-c2.md ▲1–9).
  Its ghost note sent to C1, its head notes to C3; its 844×390 note (the phone's shrunk ✦ over the rows' ⋮ column) is for the closing pass.
- **C3 landed** (the shared head — title + count + one shrinking slot, ✦ and ⋮ after it on hover / focus, one ⋮ on touch; Your day with the week
  in the head and today tinted; Pipeline's new stuck rule `stuckRuleOf` · `isStuck` — twice the studio's median stay, ≥ 14 days, 30 with < 5
  finished stays; Projects two-line rows; Team load segmented; On site one row of large photos; REG-C3.*; dash-d3 186/186 + 60 pure, s45b ·
  s22 · pj-r1 · d2 · d1 green; outcome-c3.md ▲). Plain apply; C2's Needs you files intact. Its ghost patch, "Team load" label and the one-clock
  note sent to C1. Closing-pass items from it: dash-d4's Prepare me is now in Your day's row ⋮ and a long "tasks" answer opens the pane (the
  probe must follow); the demo's leads sit 33–60 days, so the honest rule still marks 14 of 19 (▲ for him).
- **C1 landed** (the grey page, white borderless cards at 2 : 1, On site in the left stack; the greeting's one line with Since as its only
  link; Studio / Mine as a track; Pulse's four white cards — `StatTile look="card"` · `spark` · band `tone`, additive, 62 of 64 tile pages
  pixel-identical; the ghost redrawn on C2's and C3's classes with C4's `MaisonDockGhost`, 0 px for Dane at five widths; `CARD_LABEL.team` "Team
  load"; the page's today on the studio's clock; one order-proof fix in `todo.module.css`; REG-C1.1…17; outcome-c1.md ▲1–9). Its patch lacked
  the two new files' headers — applied with `--exclude`, the files copied; main then equals C1's tested tree file for file.
- **The closing pass (2026-10-27).** The staged rows numbered **REG-3017…3064** (C1 · C2 · C3 · C4; `reg-map.json` holds both passes; REG-D3.7
  → REG-2968 in C3's row). `verify-dash-d4` restated: Prepare me is opened from the meeting row's ⋮ (its old "no Prepare me here" branch is now a
  failure), and a long tasks answer may open the pane. Build on a fresh restore (`…/scratchpad/calm-close/`): **42 probes green** — dash-d1
  182 · d2 149 · d3 186 · d4 110 · d5 53, pm2-s10 · s17 · s18 · s22 · s26 · s30 · s39 · s41b1 · s43a · s43b · s45a · s45b · s46b · s46c, pj-r1 · r2 ·
  r5 · r6 · gap-b · gap-c, pm-a · pm-g, ke, kb-r1 · kb-r2, ghosts-same · ghosts-same-390, view-as, overlays, rwd-w1 · w6 · a, ux-p3, pm2-s42d — and three
  restated, then green on a re-run (129 · 73 · 88): **rwd-c2** (Pulse's grid is the page's own and its figures are the cards' 28 — the house 20 checked on Reports ›
  Projects), **ux-p2** (Cheryl's "0" hit came from her row's date "10 Sep ’26", not her budget — the check now asks for a 0 outside the budget
  cell), **pm2-s42a** (its "earlier in the day" restore crossed midnight when run at 3 AM — it now steps back inside the snapshot's day). CSS
  load-order scan, C1's WIP-base scan vs the merged build: 0 flips, 8 held, 0 new pairs. tsc clean; eslint's three errors are the quote editor's,
  there before this work; design:lint nothing new. **The first screen at 1440:** words 506 → 324 · visible controls 77 → 47 (13 more wait for
  hover) · capitals 13 → 4 · text colours 3 + red for ours-and-late. Looked at 1440 · 1280 · 1024 touch · 768 touch · 390 · 320 · 844×390: no
  sideways scroll, no page errors, nothing covered at the page's end (the floating ✦ / pill crosses content mid-scroll by design — C2's 844×390
  note read and kept). Shots `design-source/verify/dashboard-2026-10-26/calm-close/`.
- **The consistency calls (2026-10-27).** His "looks great but not happy with these buttons, also decisions for you, please take a call from
  our 2.0 consistency pov and fix them". Each open ▲ decided by what the rest of 2.0 already does; rows **REG-3065…3069**.
  - **The row buttons → the house Row's text button** (REG-3065 · 3066): the project's Needs you, Finance › To do and Getting started all draw a
    row's verb as the DS text button; the outlined boxes were this page's alone. One verb a row stays (the rest in its ⋮), never filled; the
    verbs' slot keeps 96 so the amounts stand in one column. Your day's Call and Add a task the same (Directions was already a text link). The
    house Row lost its Dashboard-only `look` option; `data-row-actions` marks its buttons' slot (the probes read it).
  - **The ladder in his screenshot was `next dev`'s load order** (REG-3067, bug fix): `.row.row` only tied the house `.row[data-two]
    { min-height: 36px }`, so in `next dev` (house sheet last) the rows were 36 and the boxes touched; the build happened to load ours last
    (60). Now `.row.row[data-two]`. Rule added to `responsive.md` › Load order.
  - **Pipeline's stuck rule → Going quiet** (REG-3068): "stuck" was a rule no other page knew (the listing shows days in stage, never judges
    them), Finance › To do's *Stuck* means "waiting on someone else", and "n stuck" opened no list. Going quiet is Sales' rule and count with
    its door — 2.0's one word for a lead that needs a nudge. The amber dots and "14 stuck" go; the demo's leads are untouched (so the
    "fresher demo leads" question closes).
  - **"Approve" → "To approve"** (REG-3069): Finance › To do's chip for the same approvals.
  - **Kept as built, for their house reason:** titles in the modules' words (the same strings as the project's Needs you); four tabs and the
    one glyph tint; the Owner's four Pulse figures and First response's 8 h (the Leads report's Fast band); the 12-hour clock (`lib/format`);
    Your day's week as the next seven days (2.0's windows roll — the listing's Last 7 days, *Leads this week*); Reset prototype to base in
    Maison AI's + (Maison AI keeps it on every page — the page's ⋮ is *Cards on your page*); ⌘J as the house key chips (REG-711); the card
    heads' right slot in line with the rows' ⋮ column.
  - **Verified (2026-10-27, a fresh restore `…/scratchpad/calm-close/base.db`, the production build):** dash-d2 149 · d3 177 · d4 110 ·
    d5 53, pm2-s10 107 · s22 110 · s45a 158 · s46c 96, pj-r1 98 · r2 87 · r5 91 · r6 82, ke 31, kb-r1 35 · kb-r2 29, ghosts-same 76 ·
    ghosts-same-390 76, rwd-c2 129 · rwd-w6 68, overlays 67 — all green; dash-d1 181 / 182. Its one ✗ is older than this change and depends on
    the hour: after a meeting ends, Your day drops its Directions, so on a phone that row is 24 shorter than the ghost, which can't know
    (green before 10:45 AM on the demo day). Restated for the hour too: **dash-d4** — "a meeting later today leads the three" now reads the
    next planned meeting from the records (after noon the demo's 2 PM consultation leads the probe's own 2:30 PM seed, and the app was right).
    The Needs you ghost draws the verbs as words in the text button's place. CSS load-order scan vs the closing build: 0 flips, 0 new pairs.
    design:lint nothing new; tsc and eslint clean on the changed files. Shots `design-source/verify/dashboard-2026-10-26/consistency-2026-10-27/`.
