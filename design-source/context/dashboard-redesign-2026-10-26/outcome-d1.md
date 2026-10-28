# Lane D1 — the frame, Since and Pulse · outcome (2026-10-26)

The brief's § 5 D1, built on the WIP base `701e101e` in its own worktree, then — on the coordinator's word — with lanes D3's and D5's landed
patches applied on top (`git apply --3way`, conflicts in `verify-pm2-s22.cjs` · `verify-pm2-s42a.cjs` · `scripts/repair-demo-data.ts` resolved
by keeping both sides) and fitted to them. Verified by real presses on a production build (:3221, a fresh lane DB = the shared base + this
tree's whole repair, R177 and D3's R179) at 1440 · 1280 · 1024 sideways (touch) · 768 upright (touch) · 390 (touch) · 320 · 844 × 390, as
Dane (Owner) and as Hui Min (Admin), James (Manager), Germaine (Designer), Priya Tan (Accounting) and Nurul Huda (Marketing). Staged register
rows: `reg-d1.md` (REG-D1.1…D1.12). Probe: `design-source/verify/dashboard-2026-10-26/verify-dash-d1.cjs` (+ its one line `dash-d1` in
`design-source/verify/regression/probes.cjs`). Nothing committed.

## Each brief item

| Item | Built where | Kept / why · not done / why |
|---|---|---|
| **The frame and layout at every width** (§ 3) | `components/dashboard/dashboard-view.tsx` (slots `[data-slot]`, `DashFrameContext`), `components/dashboard/dashboard.module.css` | Desk two stacks 1.75 : 1 · a tablet held sideways 1.5 : 1 (landscape and taller than 500) · upright, a phone held sideways and a phone one column in reading order, a phone reading Needs you before Pulse. The content's foot clears the dock by `--dash-dock-clearance` (D4 sets it; 184 / 168 / 160 / the house FAB clearance by default). The drawn "cards scrolling under a soft fade" is the dock's own background — D4's. |
| **The greeting and its line** | `components/dashboard/frame/greeting.tsx`, `greetingLine` · `studioDate` · `CARD_LABEL` in `lib/dashboard/frame.ts`, the line built in `lib/dashboard/queries.ts` | Title by `greetingAt` (the studio's clock, P-14's fix in the contract — used). "n things need you, k of them since Friday" counts the fresh Since chips whose `rowKey` is in a Needs you row's key (see For other lanes, D2); without such a tie it says "· n new since Friday". Not the house sticky header: the drawn page greets you and scrolls on; `data-om-l1-header` keeps the phone's top bar. |
| **Studio / Mine** (Q-07) | `greeting.tsx` (the DS SegmentedButton), `toScope` in `dashboard-view.tsx`, `setDashboardPrefs` in `app/dashboard/frame-actions.ts`, `scopeFor` (contract) | Remembered on the record and in the address; optimistic with the switch put back on a refusal; the server refuses Mine for other roles. Since and Pulse read `ctx.scope`; D2 / D3 read it for their parts. |
| **Hide a card** (Q-06) | the page ⋮ *Cards on your page* in `greeting.tsx`; each card's ⋮ › *Hide this card* in D3's one card head `components/dashboard/cards/card-frame.tsx` (after its ✦ Ask; `useDashFrame` from `components/dashboard/frame/frame-context.tsx`); `cardsTo` / `frame.hide` in `dashboard-view.tsx`; `setDashboardPrefs` | Undo, record, reload, the loader's seed. **Pulse has no head**, so its Hide lives in the page ⋮ (▲ 2). A card shown again that this load never read asks for a refresh. Needs you never hides (UI and server). |
| **Every role's page** (P-11) | `cardsFor` (contract, kept), `pulseKeysFor` in `lib/dashboard/pulse.ts`, the role-scoped reads in `since-queries.ts` / `pulse-queries.ts` | Owner / Admin all cards and six figures; Manager the team's cards and the leads' three (Won a count); Designer their own; Accounting the books' page; Marketing the lead desk's. ▲ 1 (the Manager's On site). |
| **Accounting's front door = the Dashboard** (Q-08) | `homeOfRole` in `lib/settings/roles.ts` (every role → `/dashboard`); `ACCOUNTING_HOME` stays the books' home | `/`, sign-in, a join and View as land Accounting on the Dashboard; Company › Finance is in their rail. FR-040's landing reversed (probe S22's assertion moved, commented). |
| **Since you were last here** (P-02) | `lib/dashboard/since.ts` (pure: `markOf` · `visitOf` · `sinceFrom` · `sinceWordsOf` · `whenWords` · `orderChips`), `lib/dashboard/since-queries.ts`, `components/dashboard/frame/since-chips.tsx`, `markDashboardVisit` in `frame-actions.ts`, `visit` on `DashCtx` | Every kind the brief lists (new leads by source · a client's confirmation · opens · a contract signed online or by someone else · a client's "I paid" · a teammate's site update · client messages · a client's ticket · a new Market Insights article), each on what the member sees, never what they did themselves. A chip for several lists them (▲ 5); a pressed chip leaves for this browser; the mark moves after the page draws; a sitting = no gap past two hours; never more than a week back (▲ 4). |
| **R177** | `scripts/repair-demo-data.ts` (rule + three checks) | Dane's mark on the Friday before the demo day, 6 PM Singapore; idempotent ("already on Friday 6 PM — in step"). The two columns are timestamps the schema types, so `lib/db/time-columns.ts` (read off the schema) moves them on a restore — nothing to add there. **Not run on local.db or into the baseline** (the landing's `db:baseline`). |
| **Pulse** (P-03 · Q-04) | `lib/dashboard/pulse.ts`, `lib/dashboard/pulse-queries.ts`, `components/dashboard/frame/pulse-strip.tsx`, `StatTile` / `StatTiles` additive props (`components/om/stat-tile.*`) | Each value its report's own (the listing's Last 7 days, Sales' Won value, Response time's median, Reports › Finance AR · AP · Cash flow · P&L · GST), written short; comparisons where a "period before" exists in the records (▲ 3); 8 weekly bars from the records' own dates; graded First response; Early profit; Owed / You owe by age; breakdowns on hover, ↓ and a long press. `tile-<key>` ids kept (`stands-tiles` too). |
| **The ghost per role and width** | `components/dashboard/dashboard-ghost.tsx`, `app/dashboard/(home)/loading.tsx`, the Dashboard's part of `lib/ghost-shapes.server.ts` (`dashboard.manager` · `dashboard.hidden.<card>` · `dashboard.projects` · `dashboard.updates`, in `dashboardSeed`) | One ghost for the loader and the reveal (REG-708); what the page held (Needs you's rows, the Since chips, each card's rows — `CARD_COUNT_KEYS`) is left for the next loader as it leaves, never while its reveal shows. **D3's five cards are drawn on D3's own classes** (`cards.module.css`: the week and agenda rows with their time column and verbs, the five stage rows and their line, the two-line project rows, the team rows and the contractors' line, the 4 : 3 tiles), the greeting on its own classes: **every region but Needs you stands where the page's does and is as tall within 6 px** at 1440 · 1024 · 768 · 390 for Dane, and within a line's wrap on a phone for the other roles (their words differ). Needs you's body is the WIP placeholder's — D2's to fit (For other lanes). |
| **The page's speed** (P-14) | `app/dashboard/(home)/` (route group), `lib/dashboard/shell-gate.ts`, `app/dashboard/layout.tsx` (`shellComing` · `ShellDrawn`), the context's reads side by side (`context.ts`) | **Before:** the first byte at 0.30 s (study A: 0.29 s) — nothing reached the browser until every card was read: the reads are the database's synchronous work and ran beside the shell's. **After:** the first byte (the shell and the ghost) at **0.06 s** with the placeholders and **0.08 s** with D3's and D5's work landed (median of five warm loads), the page streaming in after its reads (the whole page ~0.36 s). The heaviest read remains `ctx.read.details()` (every project's full detail) — see For other lanes. |
| **The head slot every card uses for its ✦ Ask** | D3's `CardFrame` (`components/dashboard/cards/card-frame.tsx`) — the one head of the five cards, its ✦ Ask D3's | At the landing D3's frame became the one place (the coordinator's word): this lane's `DashCard` was retired and its ⋮ › Hide this card moved into `CardFrame`, after the Ask (`.cardMenu` · `.menuRow` added to `cards.module.css`). The ⋮ shows only inside the Dashboard's frame (`useDashFrame`) and for a card that may hide; Needs you has none. |

## ▲ Decisions for him

1. **A Manager's page keeps On site** (the contract's `cardsFor`): the Roles table's Cards column leaves it out, the *Every card has a reason*
   table says "a project's members" — a Manager on a project is one; it is left out when nothing was published this week.
2. **Pulse's Hide lives in the page's ⋮** (*Cards on your page*, beside the greeting): the strip has no head, and a page-level list also
   gives *Show hidden cards* its one home. Every card with a head has its own ⋮ › Hide this card as well.
3. **Comparisons only where the records hold the period before**: Leads this week (the 7 days before), Won (the 90 days before), First
   response (the 90 days before — only with three first contacts on each side; the demo's one lead 90–180 days back said "Same as before"),
   GST (last quarter). **Owed to you, You owe, Coming in and Profit this month carry none** — a balance's or a forecast's "a month ago" needs a
   snapshot the records don't keep (Q-04: no snapshot table); Owed / You owe show their age instead, Coming in its next four weeks, Profit its
   Early. The drawing's dock answer "S$ 9,100 more than this time last month" has the same limit (D4's).
4. **Since never reaches further back than a week**: a first visit and a long absence both read "this week" (the last seven days) — a row of
   three weeks' news is not a glance.
5. **A chip for several opens a list of them** (the house menu, the house sheet on a phone) — "exactly that" — with a door to their home
   ("Open the 3 in Leads"); the listing filters by day, so it alone could show a lead from before the mark.
6. **The Since lists' times are the studio's clock** (Asia/Singapore, as the greeting) — the rest of the app writes the server's; a server in
   Singapore makes them one.
7. **Words written short in Pulse**: the house compact money ("S$ 121.1K", the K the meta chips use, the drawing's "121k"); First response's
   grade as words **Fast · OK · Slow** (the report colours its value; the strip's value stays ink, the grade is the chip); payments say "Ryan
   says they paid …" (the project card's own words).
8. **The first answer's 30 ms**: the page waits for its shell, then gives the stream 30 ms before its reads — the whole page arrives ~50 ms
   later than before, the shell and the ghost ~0.25 s sooner. The lasting fix is the developers' (an asynchronous database driver, or the
   cards reading less).
9. **Studio / Mine on a phone** sits on its own row under the greeting's line, with the page ⋮ (the title and the line keep their width).
10. **A Designer's My leads** is the listing's Mine (every stage), as the S22 tile counted — one number with the listing.

## Shared pieces changed

- `components/om/stat-tile.tsx` · `.module.css` — **additive**: `badge` · `delta` · `trend` · `aging` · `note` on `StatTile`, `look="strip"` on
  `StatTiles`, the strip's lines at 14 at ≤1024. Without them a tile draws as before: **16 pages byte-identical at 1440 and at 390 touch**
  against the landed state before this lane (the WIP base + D3's and D5's patches, built in its own tree, both on copies of one clean DB;
  viewport, top and scrolled: Reports › Leads · Sales · Finance AR · Health · Projects, Projects, a project's Money and Overview, an X-Ray
  record, Qanvast Ops › Studios, Company › Plan, Finance › To do, Leads, Tasks, Settings, Tools › Quotes). At 390, 16 / 16 on the first pass;
  at 1440, 13 / 16, then Tasks and Finance › To do identical on a second pass, and Tools › Quotes' 38 px are its search box's "/" keycap,
  which differs between two loads of the base itself (timing, not a change).
- `lib/settings/roles.ts` `homeOfRole` (every role → the Dashboard).
- `lib/ghost-shapes.server.ts` — the Dashboard's seeds only (`dashboardSeed`: `dashboard.hidden.*`, `dashboard.projects` by D3's
  `fetchProjectsHealth` rule read light, `dashboard.updates` = D3's `siteThisWeek`, `dashboard.week` = Your day's week has a task or a
  planned meeting — a first load's quiet week; `dashboard.manager`).
- **Lane D3's files, on the coordinator's word**: `components/dashboard/cards/card-frame.tsx` (the ⋮ › Hide this card after the Ask) and
  `cards.module.css` (`.cardMenu` · `.menuRow`). Nothing else of D3's changed; D3's `dash-d3` probe re-run (Tallies).
- `lib/dashboard/pulse.ts` `pulseShapeOf` (a Designer's My leads has no weeks — the ghost reads it); `pulse-queries.ts` reads D5's
  `ReportTile.minor` (`figureOf`) and `addedInLast7Days`.
- `scripts/repair-demo-data.ts` — R177 and its checks.
- `app/dashboard/page.tsx` · `loading.tsx` moved into `app/dashboard/(home)/` (the address is unchanged).

## For other lanes

- **D2 (Needs you)** — `NeedsInbox` receives `next` (`AgendaItem | null`: D3's rule, the first `data.day.items` entry with
  `day >= today && !done && !ended` — the frame casts the contract's prop until your signature has it). **Your ghost body**: Needs you's
  part of `components/dashboard/dashboard-ghost.tsx` (`GhostCard title="Needs you"` + the filter chips + `GhostRow`) still draws the WIP
  placeholder's shape — fit it to your rows on your own classes, as the five cards are (the probe's § 8 says Needs you's Δ; at 1440 the
  placeholder is 529 px taller than the ghost). `NEEDS_COUNT_KEY` is the rows you drew (the frame writes `data.needs.rows.length`). Give each row `data-inbox-row={row.key}` with **the record's id inside the key** (the WIP's
  `project:<pid>:money:confirm:<paymentId>`, `project:<pid>:ticket:<ticketId>`, `project:<pid>:message`; a quote's and a contract's rows
  carrying the quote's / contract's id): a Since chip carries that id as `rowKey`, finds the row by `[data-inbox-row="…"]` or
  `[data-inbox-row*="…"]`, scrolls to it and pulses it (the pulse style is the frame's, `.content [data-inbox-row][data-fresh]`); the greeting's
  "k of them since Friday" counts the same match. Needs you has no ⋮ (it never hides); its ✦ Ask, if your head wants one, is the shape of
  `CardFrame`'s (D3's file).
- **D3 (the cards)** — done, applied here; your `CardFrame` now carries the ⋮ › Hide this card after the Ask (from `useDashFrame`; nothing
  shows outside the Dashboard). **The ghost draws your five cards on your own classes** (`cards.module.css` — `week` · `dayCell` · `agenda` ·
  `agendaRow` · `lead` · `time` · `timeSub` · `tick` · `words` · `title` · `caption` · `verbs` · `verb` · `quiet` · `quietLine` · `ringLine` ·
  `funnel` · `stageRow` · `stageName` · `stageTrack` · `stageCount` · `funnelFoot` · `lines` · `projectRow` · `projectTop` · `healthDot` ·
  `projectName` · `progress` · `projectLine` · `moreBody` · `teamList` · `teamRow` · `teamWho` · `teamName` · `teamCaption` · `load` ·
  `loadFigure` · `legend` · `crewLine` · `crewWords` · `photos` · `photo` · `headRight` · `askWrap` · `cardMenu`) and your row caps
  (`DAY_SHOWN` 6 / 4 is copied from `your-day-card.tsx` — export it if it moves); a renamed class there must follow in the ghost. Seeds:
  `dashboard.projects` mirrors `fetchProjectsHealth`'s rule (an open project; a Designer's own, an Owner's / Admin's remembered Mine),
  `dashboard.updates` is your `siteThisWeek`, `dashboard.week` reads your `fetchDay`'s tasks and meetings light (a first load of a quiet
  week draws the quiet line, S42A's A-16 restated). P-14: `ctx.read.details()` (every project's `fetchProjectDetail`) stays the page's heaviest read.
- **D4 (the dock)** — set `--dash-dock-clearance` (the dock's height with its suggestions and gap) where the content can read it
  (`document.documentElement` or `[data-testid="dashboard"]`); the ghost draws a placeholder field at `.ghostDock` / `.ghostField` (760 wide,
  84 tall at a desk; 48 tall above the phone's dock) — adjust it to the real dock. `askAbout` is called with `'pulse'` (Pulse's breakdown;
  D3's card heads call it with `day` · `pipeline` · `projects` · `team` · `site`). **`verify-pm2-s30` § 13** (Reset prototype to base from the
  Maison AI sheet, pressed on the Dashboard a Designer lands on) times out on a click — **the same on the landed state before this lane**
  (D3 + D5 on the WIP base), so it waits for the dock / the sheet on the Dashboard.
- **D5** — done, applied here. Pulse reads `ReportTile.minor` for Owed to you and the P&L's Revenue / Profit; Reports › Finance's **AP and GST
  tiles have no `minor` yet**, so Pulse's You owe / Overdue and GST read those tiles' words back (`figureOf` in `pulse-queries.ts` falls back
  to `minorOf`) — giving them `minor` retires the last parse. Leads this week is `addedInLast7Days` (the weeks before and the bars shift the
  same calendar window). No "n days overdue" words on D1's parts (`overdueWords` not needed).
- **The landing** — `probes.cjs` carries only this lane's line (`dash-d1`); `verify-pm2-s22` · `s45a` · `s41b1` are fit for the harness and
  may be listed there (`s42a` can't — its `REPO` is three levels up), D3's `dash-d3` and D5's `dash-d5` too. The probes this lane's moves
  touched are updated and commented "(Dashboard redesign 2026-10-26, a deliberate change)":
  `verify-pm2-s22` (§ 6 Pulse · § 7 the roles' figures and Accounting's front door · the Market Insights card off the page), `s45a` (§ 5),
  `s41b1` (the Dashboard ghost's figures), `s43b` · `s42a` (Profit's line; and A-16 restated for the new ghost — the loader's Your day draws
  a quiet week, and no Team slot when Workload has nothing). `s22`'s other sections (the brief and Ask box → D4; Needs you → D2;
  MY TASKS · Coming up · Workload · Site updates → D3) and `s45b`'s Contractors tile (D3) · `s46b`'s Tickets tile (D2) are their lanes'. No
  icon to add (`forum` isn't in the subset — `chat` used). The S22 helpers in `lib/dashboard/model.ts` (`tileLabelsFor`, `dashboardBrief`, `asksFor` …)
  are left for the landing to remove with D4's.

## Tallies

On the final production build (:3221), each probe on its own fresh copy of the clean lane DB (the shared base + this tree's repair):

| Probe | Result | Note |
|---|---|---|
| `dash-d1` (this lane) | **141 / 141** (harness and direct, twice) | every role, every width, the ghost's regions within 6 px but Needs you's, the first byte 78 ms (median of five) — and the DB as it was on every table after (`leads.seen_at` and `chat_reads` now put back too) |
| `ghosts-same` · `ghosts-same-390` | 76 / 76 · 76 / 76 | the loader and the reveal one ghost |
| `view-as` · `ke` · `pj-r1` · `pj-r5` | 23 / 23 · 31 / 31 · 98 / 98 · 91 / 91 | |
| `pm2-s43b` · `pm2-s17` · `rwd-c2` | 70 / 70 · 130 / 130 · 128 / 128 | |
| `pm2-s45a` · `pm2-s41b1` | 158 / 158 · 110 / 110 | direct (not in `probes.cjs` here) |
| `pm2-s42a` | **88 / 88** | direct, from its own folder; A-16 restated (above) |
| `pm2-s22` | stops at its § 2 | the old Maison AI brief and Ask box — D4's; this lane's sections (1 · 6 · 7 · 8) from a scratch copy: **61 / 61** |
| `dash-d3` · `dash-d5` | 139 / 139 · 53 / 53 | the landed lanes' own probes, on this tree (the ⋮ in D3's frame changes none of theirs) |
| `pm2-s46b` | 16 / 17 | the Dashboard's old Tickets tile — D2's (tickets are Needs you rows) |
| `pm2-s30` | 106 / 107 | § 13 — the same on the landed state before this lane (For other lanes, D4) |

`npx tsc --noEmit` clean · `npx eslint` clean on every file of this lane · `npm run design:lint` "nothing new breaks a house rule" (no
baseline raised) · `design:anatomy` on this build "all 1971 measures hold" (90 pages). Shots banked in
`design-source/verify/dashboard-2026-10-26/d1/` (the probe's 21, refreshed on the landed state, + a card's ⋮ at 1440 and 390).

## Principles check (DESIGN-PRINCIPLES.md)

1. **The mock wins** — no Figma mock; the review page's drawn frames and this brief are the spec; every invented word and control is a row in `reg-d1.md`.
2. **One system** — the DS SegmentedButton, Chip and text Button; the house StatTile (additive), Card classes, PortalMenu + DropdownItem, Sheet (through PortalMenu), ChipRail, MetaChip, snackbar, IconButton, ghost kit; `--om-*` tokens only (`design:lint` clean).
3. **Plain words** — "Good morning, Dane", "3 new leads · all from Hangout", "Ryan says they paid S$ 13,370 · to confirm", "Costs not in yet on 2 projects"; refusals say the rule.
4. **Nothing is lost** — hiding a card has Undo and a home to come back from (Cards on your page); a pressed chip comes back on new news and in another browser.
5. **Say why** — Early says why; a figure whose report isn't the role's presses to its breakdown; a refused switch says the rule.
6. **Back returns** — every door carries `?from=/dashboard`.
7. **Every screen is whole** — the shell, the ghost (loader = reveal), tooltips, the snackbar; the ghost now reaches the browser first.
8. **Every width** — the drawn layouts at every width; no sideways scroll at 320 or 844 × 390; 14px sentences and 44 targets on touch (the house overlays).
9. **Tables follow the listing** — no table on this lane's part of the page.
10. **Motion with purpose** — the house menu and sheet motion; the row pulse is the house fresh pulse; nothing moves on its own.
11. **Honest data** — every figure is its report's; R177 gives the demo its Friday mark with checks; no number pasted from the drawing.
12. **Reach for everyone** — breakdowns by ↓ on a focused figure (not hover alone), radio keys on Studio / Mine, menu keys, names on every icon control.
