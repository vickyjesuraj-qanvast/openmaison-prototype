# B5-R — Company › Reports + Plan & AI credits (part of lane B5's outcome)

Sub-lane of B5. Files edited (all B5's, none another sub-lane's):
`components/company/reports/{report-pill.tsx (new), report-pill.module.css (new), reports-ghost.tsx, meetings-report.tsx, meetings-report.module.css,
sales-report.tsx, sales-report.module.css, studio-health-report.tsx, studio-health-report.module.css}` · `components/leads/insights/{insights-view.tsx,
insights-view.module.css, insights-ghost.tsx}` · `components/finance/books/reports-view.tsx` · `lib/finance/reports.ts` (display words + an optional
`ReportTile.how`) · `components/company/plan/{usage-view.tsx, billing-view.tsx, plan.module.css, usage-shape.ts (new)}` · `components/credits/{credits-card.tsx,
credit-dialogs.tsx}` · `components/company/company-ghosts.tsx` — **only** `UsageGhost`, `BillingGhost` and one import line (`useUsageShape`).
No server action, schema, rule, figure or stored value touched; every report key, `?report=` / `?range=` / `?period=` value, Export's contents and
the credits ledger are as they were. tsc clean (project), eslint clean (my folders), `design:lint` nothing new. Checked on the lane's dev server at
1440 · 1024 touch · 768 touch · 390 touch · 320, menus open on a desk and as sheets on a phone, the loaders' ghosts with scripts off; a functional
pass of every moved control (23/23: `scratchpad/b5r/func.cjs`).

## 1 · Built

- **5-19 (period, one control)** — Built. One house piece, `PickPill` (`components/company/reports/report-pill.tsx`: the house `ScopePill` + `PortalMenu`
  of `menuitemradio` rows, a sheet on a phone), "Period: Last 90 days ▾" at the start of every Reports tab's bar I own — Leads (both reports),
  Meetings, Studio health, Finance — and Plan › Usage already wore the same pill (kept). One bar (`insights-view.module.css .pickBar · .picks ·
  .pickEnd`): pills at the start, Export at the end; on a phone the pills wrap under each other and Export keeps the first row's end; at 320 Export
  takes its own row so a pill's words are never cut. The "Filtering on … · n in range" captions are gone from the page; their words ("Counts the
  leads added in this period · 30 leads", "Counts meetings by the day they were held · 12 meetings held", "Counts what was done in this period, by
  the day it was done") are the Period pill's tooltip and its `data-tip`. The applied dot shows when the period is off the report's default.
  **Not done as proposed:** the one shared option list (This month … Last 12 months … All time) — the rolling ranges (Leads, Meetings, Studio
  health: 30 · 90 · 12 months · All) and Finance's calendar periods are each report's own maths, so each keeps its own options inside the one pill
  (▲ 1). Reports › Projects is B3's file (request R-B3-1).
- **5-20 (which report)** — Built. "Report: Profit and loss ▾" on Finance at every width (the phone's select is gone — the same pill everywhere),
  each report's help line as its menu row's second line; Leads' "Report: Response time ▾" (Response time · Sales, each with its line). Words:
  Owed to you → **To collect**, You owe → **To pay**, Commissions → **Commission** (labels and tiles). Keys unchanged.
- **5-21 (Sales)** — Built. By source shows the sources that won a lead; the rest fold under "Show n more sources with no wins yet" (all of them
  when none has won). Going quiet is one section with a **By days quiet · By member** switch (the house Chips, as Over time's By week · By month)
  — the second table is the switch's other view, nothing dropped. Over time leads with its chart; its table (conversion, won value — more than the
  chart's own Show the numbers holds) folds under "Show the table". The foot note is behind "How these are counted". Page 4,816 → 3,354 px.
- **5-38 (Usage › By member)** — Built. Members who used AI in the period, have a limit, asked for more, or are the `?member=` target show; the rest
  fold under "7 members haven’t used AI this month" (a text button; "Hide the 7 who haven’t used AI" back). "Monthly amount" → **Monthly limit**;
  each limit is text with the row's ⋮ (tooltip "Set a limit") opening the same quick picks + "Another amount…"; the Status column stands only while
  someone has a status ("At their amount" → "At their limit"). Help → "Set a monthly limit so one person can’t use up the studio’s credits."
  "New members: No limit" → "New members’ limit: None". The ghost follows (rows, fold, Status) through `usage-shape.ts`.
- **5-07 (two profits)** — Built as display only: Profitability's tiles are **Expected profit** ("On signed contracts, with GST · n projects") and
  **Expected margin** ("Healthy · on signed contracts"); the "--" rule and "weighted by contract value · early estimates left out" moved into each
  value's tooltip (`ReportTile.how`, the house tile-value tooltip). **Not done:** one GST basis for every profit — Profitability's figure is the
  project Payments tab's (with GST) and changing it is money maths (▲ 2). Profit and loss keeps "Profit" and "Margin on what was invoiced".
- **5-09 (touch, statistician words)** — Built in my files: tiles' help "median · avg 52m · 29 leads" → "Usually · 29 leads" with the average as the
  figure's tooltip; table cells "median · avg 2h" → "2h on average"; column heads "Time to first contact" · "First contact to Won" · "Not contacted
  yet"; chips "1 lead waiting for a member" · "4 not contacted yet"; help "Counted for whoever logged the first contact"; Maison AI's answers
  ("usually …", "waiting for a member"); Meetings' heads "Won after" · "Tips used", "Is the deal score right?" with "Not yet — Try giving Timeline
  more weight in Settings › Meetings" / "Yes — scores match what happened"; every foot note behind "How these are counted". Tile labels, MEDIANS_NOTE,
  "30m → 30 min", the coaching evidence and the meetings tiles live in other lanes' libs (requests R-B2-1…3, R-B1-2).
- **5-22 (touch, Studio health)** — Built: four headline tiles (Active members · Leads added · Quotes sent · Portal sign-ins — each still a door);
  every other tile under "Show all figures" in its group, each tile drawn once; the member table; "AI runs" column → "AI uses"; Maison AI "did
  nothing" → "not active". Group / tile labels live in `lib/studio-health/model.ts` (request R-B1-1). Page 2,178 → 1,650 px.
- **5-16 (touch, billing)** — Built: "Visa ending 4242 · expires 08/28" without "(demo)"; the Dodo sentence moved into Update card's tooltip (it said
  what Update card does in the live app — kept for whoever presses it).
- **5-23 (card heads)** — Built on Reports › Meetings: Coaching and the deal-score card wear the page's bold sentence-case section head over the
  Overview card's frame (composed), not the caps caption.
- **5-41 · W-036 ("By team member")** — Built on Leads, Meetings, Studio health (titles, aria labels, ghosts); Sales' and the export sheets' come from
  the libs (requests).
- **5-06 (touch, Reports' money words)** — Built: To collect / To pay / Collected everywhere in Reports › Finance (tiles, columns, helps); Cash flow
  "Money in" → **Collected** (§2 over W-554's "Received"), "Money out" → "Paid out"; Vendor spend "Still owed" → To pay; Commission "Owed" → To pay;
  P&L's "Payment stages" → "Scheduled payments" (§2: a payment part is a payment).

## 2 · The ledger (every moved action / fact: what · was · now)

| What | Was | Now |
|---|---|---|
| Pick a Leads report (Response time · Sales) | Chips row above the range (`leads-report-chips`, radios) | "Report: … ▾" pill; menu rows `menuitemradio` (testid on the pill's wrapper) |
| Pick a range — Leads | Chips `insights-range-chips` (radios) | "Period: … ▾" pill, same testid on its wrapper; rows `menuitemradio` |
| "Filtering on lead created date · n leads in range" | Caption `insights-range` beside Export | The Period pill's tooltip; `insights-range` is the pill's inner span, words in `data-tip` |
| Pick a range — Meetings | Chips `meeting-report-range` | Period pill (same testid) |
| "Filtering on meeting date · n meetings held in range" | Caption `meeting-report-caption` | Pill tooltip; `meeting-report-caption` + `data-tip` |
| Pick a range — Studio health | Chips `health-range` | Period pill (same testid) |
| "Filtering on the day each thing was done" | Caption `health-caption` | Pill tooltip; `health-caption` + `data-tip` |
| Pick a Finance report | Ten chips (desk) / a select (phone), `report-chips` | "Report: … ▾" pill at every width (same testid), each report's help in its row |
| Pick a Finance period | Labelled select `report-period` | "Period: … ▾" pill (same testid) |
| Leads › Response time foot note (MEDIANS_NOTE …) | Paragraph under the table | "How these are counted" text button (`insights-foot`) |
| Sales foot note | Paragraph `sales-foot` | "How these are counted" (`sales-foot`) |
| Meetings foot note | Paragraph | "How these are counted" (`meeting-report-foot`) |
| Studio health foot note | Paragraph `health-foot` | "How these are counted" (`health-foot`) |
| Sales › By source rows with no win | In the table | Under "Show n more sources with no wins yet" (`sales-sources-more`) |
| Sales › Over time table | Under the chart | Under "Show the table" (`sales-flow-more`); the chart's own Show the numbers unchanged |
| Sales › Going quiet, by team member (table) | Its own section `sales-quiet-members` | The Going quiet section's "By member" view (`sales-quiet-view` chips) — same section testid while shown |
| Studio health's 11 other tiles (Sign-ins, AI runs, Projects started, Invoices sent, Tasks done, Tickets resolved, Site updates, Hangout chats, Tickets raised, Messages, Choices made) and their group titles / helps | Four groups on the page | Under "Show all figures" (`health-all`), in their groups, each tile once (testids unchanged) |
| A member's monthly limit — set it | Select in the cell (`member-amount`) | The cell's ⋮ (`member-amount`), same menu; the value is text (`member-limit`) |
| Members who used no AI and have no limit | Rows of By member | Under "n members haven’t used AI this month" (`usage-members-more`) |
| By member's Status column ("—" on most rows) | Always | Only while a member is asked / at / near their limit |
| How Update card works in the live app (Dodo Payments) | A line under the card | Update card's tooltip |
| Profitability's "--" rule and the margin's weighting | The tiles' help lines | The tiles' value tooltips (`ReportTile.how`) |
| Leads tiles' average ("avg 52m") | The tile's help line | The figure's tooltip |
| Reports › Finance ghost | The books ghost's Reports branch (`BooksGhost tab="reports"`) | Its own `FinanceReportsGhost` in reports-ghost.tsx (the old branch is no longer drawn — R-B5F-1) |

Nothing removed: every report, period, row, tile, note, limit and menu row is on its page, at most one press away.

## 3 · Words

Applied (my files): W-036, W-052, W-070, W-076, W-087, W-096, W-146, W-166, W-252, W-265, W-273, W-299, W-306, W-322 (caption names its real
basis — "with GST", ▲ 2), W-323, W-386, W-409 (column; the tile label is B2's), W-424, W-519, W-546 (tiles + cells), W-554 (as **Collected**, §2),
W-576, W-586 (one pill; each report's own option list, ▲ 1), W-032 (column only), W-075 (Maison AI answer only), plus "Payment stages" →
"Scheduled payments" (§2 stages rule) and "monthly amount" → "monthly limit" across Usage, the credits card and the out-of-limit dialog (W-265's
noun kept one word in my files).
Not applied here (another lane's file — requested): W-032 (tiles, chart), W-075 (tile help) → B1 `lib/studio-health/model.ts`; W-617 → B3; W-649 → B2;
W-409's tile label → B2; W-144 (co-pilot in Meetings' tiles / foot) → B2.

## 4 · Probe restatements (none edited — for the main agent; every functional check stays, a moved control is opened first)

- `insights-head` — still valid (the table's heads now "Time to first contact" · "First contact to Won" · "Not contacted yet"; each floor holds its
  label: measured 1440 + 1024).
- `pm2-s45a` · L98 `pickRange`: `getByTestId('insights-range-chips').getByRole('button').click()` then `page.getByRole('menuitemradio', { name: label })`.
  L115–L118 report chips: same with `leads-report-chips` (rows "Response time …", "Sales …" — names start with the label). L122–L123 heads now
  `By team member · Where leads stop · By source · Open pipeline · Over time · Going quiet` (one Going quiet; "By team member" → "By member" once
  R-B2-2 lands). L124: the caption is `getByTestId('insights-range').getAttribute('data-tip')` matching `/Counts the leads added in this period · \d+ leads?/`.
  L136 the chart still draws "above its table" — the table needs `sales-flow-more` first. L174–L183 sources / flow sums: press `sales-sources-more`
  (when present) and `sales-flow-more` before `rowsOf`. L366 `leads-report-chips` bounding box: the pill wrapper — still on screen.
- `pm2-s39` · L103 `pickRange` → the pill + `menuitemradio`. L120–L122 groups / labels: press `health-all` first; labels then include "ai runs" until
  R-B1-1 lands (then "ai uses", "members"…). L125 caption: `health-caption`'s `data-tip` === "Counts what was done in this period, by the day it was
  done" (restated words). L126–L127 foot: press `getByTestId('health-foot').getByRole('button')` first — same words. L182–L184: `insights-range`'s
  `data-tip` split on "·" → the count; the checked range = the pill's text `Period: Last 30 days`. L186+ `health-tile-projects` / `-ai` / `-signIns`
  / `-tickets` / `-issues` / `-messages` / `-choices`: press `health-all` after each `go()`. `health-tile-leads` · `-active` · `-quotes` ·
  `-portalSignIns` are the headline tiles (no press).
- `pm2-s41b1` · L317–L318: the pill reads `Report: To collect` (was the chips' list incl. "Owed to you"); open it and read the `menuitemradio`
  rows for "no Profit and loss / Profitability". L345 same. L393–L402's ghost-vs-page check: the ghost is now reports-ghost's `FinanceReportsGhost`
  (opens on To collect for a role kept from profit — 3 tiles).
- `pm2-s42c` · L193 `meeting-report-range` → pill + `menuitemradio` ('All time').
- `pm2-s17` · L115 the Leads report's ghost block `insights-view.bar` is now `insights-view.pickBar` (Projects keeps `.bar` until R-B3-1).
- `cr-r4` · L45 "lists every active member": press `usage-members-more` first. L47 `member-amount` is the ⋮ now — read `getByTestId('member-limit')`
  for "600 a month". L54 / L61 click `member-amount` — unchanged (it opens the same menu). L63 dialog name "Sarah’s monthly limit". The snackbars
  ("Sarah can use 1,000 AI credits a month", "New members start with 300 …") are unchanged; "… has no monthly amount" → "… has no monthly limit".
  L71 `default-amount` unchanged (its label now "New members’ limit: None"). L82 `?member=sarah` row: Sarah has a limit, so she shows unfolded.
  L156 tile "Your monthly limit" (testid `tile-amount` unchanged).
- `cr-r1` · `cr-r3` · `cr-r5` · `fixes720` · `pm2-s31` · `rwd-w4` — none of their selectors or words in my files changed (the "(demo)" they wait for is
  View as's snackbar, not billing's).
- Other lanes' probes my files reach: `parity-map-build/verify-pm-c.cjs` L127 (`report-chips` radio 'GST' → pill + `menuitemradio` /^GST/);
  `reports-in-company-2026-10-08/verify-reports.cjs` L62 (`checked('insights-range-chips')` / `ranges(...)` → the pill's text and its menu rows);
  `responsive-all/verify-rwd-w6.cjs` L436 (Commission's tabular digits — unchanged); `dashboard-2026-10-26/verify-dash-d5.cjs` and Maison AI's dock /
  work answers (R-B1-3 — they look tiles up by label).

## 5 · Requests (exact changes in files I don't own)

- **R-B1-3 (MUST land with this lane's `lib/finance/reports.ts`)** — two lookups read report tiles by their label: `lib/maison-ai/answers/dock.ts:46`
  `flow.tiles.find((t) => t.label === 'Money in')` → `'Collected'`; `lib/maison-ai/answers/work.ts:403` `r.tiles.find((t) => t.label === 'Owed to you')`
  → `'To collect'`. Without them Maison AI's dock loses "collected this month" and the studio-today "owed" figure.
- **R-B1-1** `lib/studio-health/model.ts`: GROUPS `'Your team'` → `'Members'`; tiles `'AI runs'` → `'AI uses'`, `'Hangout chats'` → `'Qanvast Hangout
  chats'`, `'Tickets resolved'` → `'Issues resolved'`, `'Tickets raised'` → `'Issues raised'` (§2); L203 `` `${n} did nothing` `` → `` `${n} not active in this period` ``;
  the trend's series `'AI runs'` → `'AI uses'` and `trendSubtitle` "… active members and AI uses"; `healthSheet`'s `'By team member'` → `'By member'`,
  `'AI runs'` → `'AI uses'`. `CAPTION` is no longer read by the page or the ghost (its words are the pill's tooltip, `HEALTH_PERIOD_TIP`).
- **R-B1-2** `lib/format.ts` `durationWords`: "30m" → "30 min", "26.3h" → "26 hours" (5-09) — app-wide, B1's call.
- **R-B1-4** `lib/global-search/model.ts` (⌘K keeps the old words): `finance-reports` words += `owed to you you owe to collect to pay commission
  commissions`; `finance-profitability` words += `expected profit expected margin`; `usage` words += `monthly amount monthly limit cap`.
- **R-B1-5** "monthly amount" → "monthly limit" (one word for the cap): `lib/notifications/model.ts:85-87, 337`; `lib/dashboard/inbox-queries.ts:436,
  439`; `lib/maison-ai/answers/money.ts:205`; `app/credits/actions.ts:96, 313` (notification titles); `lib/dashboard/pulse.ts:79-80` 'Owed to you' →
  'To collect', 'You owe' → 'To pay' (3-03).
- **R-B2-1** `lib/leads/tat.ts`: LEGS labels → `'Time to assign'`, `'Time to first contact'`, `'First contact to Won'`; `MEDIANS_NOTE` → "Each time is
  the usual one — the middle lead’s, so one slow lead doesn’t skew it."; `insightsSheet`: 'Leads awaiting assignment' → 'Leads waiting for a member',
  'Assigned, no outreach logged yet' → 'Not contacted yet', 'By team member' → 'By member', heads 'Assign → First outreach' → 'Time to first contact',
  'First outreach → Won' → 'First contact to Won', 'Awaiting outreach' → 'Not contacted yet'.
- **R-B2-2** `lib/leads/sales.ts` SECTIONS: `members.title` → `'By member'`; `quietMembers.title` → `'Going quiet, by member'` (the export sheet).
- **R-B2-3** `lib/meetings/report-model.ts`: TILE_LABELS[1] `'Went ahead'` → `'Won after'`, [4] `'Tips acted on'` → `'Tips used'`; `CHECK_TITLE` → `'Is the
  deal score right?'` (the page and ghost use their own `CHECK_HEAD` with those words); L167 evidence → `` `${m.name} ${pctText(m.aheadShare)} · studio
  ${pctText(studioShare)}` `` (W-649; drop "best" or keep it in the row's tooltip); `meetingsSheet` heads ('By team member', 'Went ahead', 'Tips acted on');
  W-144: "with the co-pilot on" → "with Copilot on" in `tileFigures` / FOOT_NOTE.
- **R-B3-1** `components/projects/insights/project-insights-view.tsx` + `project-insights-ghost.tsx`: the same bar — `import { HowCounted, PickPill } from
  '@/components/company/reports/report-pill'` (+ `GhostPill`, `GhostHowCounted` in the ghost) and `ins.pickBar / ins.picks / ins.pickEnd` from
  `insights-view.module.css`; `<PickPill name="Period" testId="project-insights-range" tip="Counts the projects started in this period · …" … />`
  for the range chips (the scope line → its tooltip); 'Start → Completed' → 'Project length'; 'Collection days' → 'Days to get paid'; 'By team
  member' → 'By member'; the foot → `HowCounted`. (`pj-gap-i` L124, `verify-reports` L53 then restate the same way.)
- **R-B5S-1** `lib/settings/permissions.ts:212` 'Use AI tools, within their monthly amount' → '… within their monthly limit'.
- **R-B5F-1** `components/finance/books/books-ghost.tsx`: the `tab === 'reports'` branch is no longer drawn (Reports › Finance has its own ghost now) —
  remove it at landing, or leave it dead.

## 6 · ▲ For Vicky

1. **One period list** (5-19) — built as one control and one look, but each report keeps its own options: Leads / Meetings / Studio health count rolling
   ranges (30 · 90 · 12 months · All) and Finance counts calendar periods (This month … Last year). One shared list needs new maths in four
   reports — your call.
2. **One basis for profit** (5-07) — Profitability is now "Expected profit · On signed contracts, with GST" and "Expected margin", named apart from
   Profit and loss's before-GST "Profit"; moving it before GST changes the project Payments tab's own figure too (money maths) — not done.
3. **The Report menu has ten rows** on Finance (T-14 says under ten) — each is a report, so I kept them in one list with their lines; grouping them
   (Money · Costs · Statement) is possible if you want it.
4. **Studio health opens on four tiles** (Active members · Leads added · Quotes sent · Portal sign-ins — the audit's pick); "Show all figures" is not
   remembered between visits.
5. **Sales › Over time** folds its table under the chart ("Show the table") rather than dropping it: the table has conversion and won value the
   chart's Show the numbers doesn't.
6. Usage keeps its own "This month ▾" on a phone (the S17 short pill); the Reports pills keep "Period:" on a phone (5-10's "keep it named").

## 7 · Measures (first screen at 1440, the audit's measure: words · controls · purple · filled · caps · page height)

| Screen | Before (lane-5-pages.md) | After |
|---|---|---|
| /company/reports/leads | 200 · 13 · 1 · 0 · 16 · 1,157 | 169 · 10 · 3 · 0 · 16 · 1,109 |
| /company/reports/leads?report=sales | 209 · 14 · 1 · 0 · 17 · 4,816 | 198 · 10 · 1 · 0 · 17 · 3,354 |
| /company/reports/meetings | 269 · 18 · 1 · 0 · 24 · 1,445 | 246 · 15 · 1 · 0 · 22 · 1,449 |
| /company/reports/finance | 147 · 19 · 1 · 0 · 7 · 1,944 | 138 · 10 · 1 · 0 · 10 · 1,888 |
| /company/reports/health | 174 · 19 · 1 · 0 · 15 · 2,178 | 145 · 14 · 3 · 0 · 11 · 1,650 |
| /company/plan | 192 · 15 · 1 · 0 · 9 · 1,809 | 167 · 11 · 3 · 0 · 12 · 1,421 |
| /company/plan/billing | 221 · 12 · 2 · 1 · 12 · 1,045 | 201 · 12 · 2 · 1 · 12 · 1,045 |

(the extra "purple" are the fold buttons — "How these are counted", "Show all figures", "7 members haven’t used AI" — the house text buttons.)
Shots (before / after, 1440 · 1024 touch · 768 touch · 390 touch · 320; ghosts; open menus): `…/calm-build/B5/shots/R-*.png`.
