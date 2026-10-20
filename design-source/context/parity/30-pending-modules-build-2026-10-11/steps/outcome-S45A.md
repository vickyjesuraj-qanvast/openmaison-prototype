# S45A · Urban Home Design's Sales reports + the Projects listing's columns and the Dashboard's widgets — outcome (2026-10-17, lane A)

Rows **H-UHD-1** and **H-UHD-3** of `s42/sweep-newer-branches-2026-10-15.md` §2.1, held for him on UHD's exclusivity ask and released by his
"build everything and complete it" (2026-10-17) **as features every studio gets** (`s45/plan-2026-10-17.md`). Every call below is **as recommended —
his ask 2026-10-17**. 1.0 read through git only (`/Users/vicky/Documents/GitHub/qanvast-id-tool`, `origin/urbanhomedemo` · `origin/port/urbanhome-ui-2026-10-13`,
`git show 479480a5e` · `git show 4da810229` · `git show <branch>:<path>`; its working tree untouched, :3001 never opened): `src/lib/leads/sales-reports.ts`,
`src/app/api/leads/sales-report/route.ts`, `src/lib/queries/sales-reports.ts`, `src/components/leads/reports/{lead-reports-container,report-shell,sales-report-views}.tsx`,
`src/lib/leads/sales-report-mock.ts` (seen, not carried), the TAT route's and `lead-performance-view.tsx`'s 4da810229 changes, `src/components/dashboard/{home-widgets,chat-first-home}.tsx`,
`src/app/(main)/projects/page.tsx` (UHD's B3 layout), `src/lib/finance/pre-gst-sales.ts`, `src/app/api/project-aggregates/lead-info/route.ts`,
`src/lib/queries/project-aggregates.ts`, `docs/features/contractor-dashboard/spec.md` §6 (the exclusivity reading). 2.0 read first: S22's Dashboard,
S39's Reports frame (`report-table.tsx`, Studio health), Reports › Leads (REG-611 · REG-1361), Reports › Finance's report chips, the Projects
listing's registry (`project-columns.tsx`), `lib/projects/money-queries.ts` (`baseOf` · `ownGstRate`), `lib/finance/books.ts` (`contractNetOf`).

Register rows: `steps/reg-S45A.md` (REG-S45A.1…12). Probe: `design-source/verify/pending-modules/verify-pm2-s45a.cjs` — **157 / 157** on :3160.
Shots: `design-source/verify/pending-modules/pm2-s45a/` (Sales at 1440 full page, 390 and 320 touch, the pipeline's phone cards, the Projects
columns, the Dashboard and the report opened from it).

## Pending lines ledger

| Row · line (word for word, sweep §2.1) | Status | Where |
| --- | --- | --- |
| H-UHD-1 · "Six reports, Owners and Admins, 30 / 90 / all days" | **built** — Company › Reports › Leads gains **Sales** beside Response time (report chips, Reports › Finance's), on the house ranges 30 · 90 · 12 months · All (opening on 90, P-31); Owners and Admins (`fetchSales` → null for anyone else; Marketing keeps Response time alone) | `app/company/reports/[tab]/page.tsx`, `components/company/reports/reports-workspace.tsx`, `components/leads/insights/insights-view.tsx`, `components/company/reports/sales-report.tsx`, `lib/leads/sales{,-queries}.ts` |
| H-UHD-1 · "per member (leads · quoted · signed · conversion % · revenue — the signed quote's total, the client's budget as an honest fallback · per conversion · median days to sign)" | **built** — **By team member**: Leads · Quote sent · Won · Conversion · Won value · Average won · Days to Won; the budget fallback counted in the Won value tile; every member on a lead counts it (1.0) | `salesReport` `members`; `SalesReportBody` |
| H-UHD-1 · "the funnel (created → assigned → contacted → quoted → signed, the biggest leak named)" | **built** — **Where leads stop**: Added · Assigned · Contacted · **Met** · Quote sent · Won (2.0's journey), never widening, the biggest drop named in a note and marked in its row | `FUNNEL` · `funnelNote` |
| H-UHD-1 · "by source (normalised)" | **built** — **By source** on Settings › Lead sources' own names (2.0 keeps one list — nothing to normalise; REG-647 renames follow the records) | `salesReport` `sources` |
| H-UHD-1 · "lead flow by week / month" | **built** — **Over time**: the house chart (Leads added · Won from them) over its table (Period · Leads added · Won from them · Conversion · Won in the period · Won value), By week · By month chips (the range picks the default) | `salesReport` `flow` · `chart` |
| H-UHD-1 · "the open pipeline by stage with a weighted forecast" | **built** — **Open pipeline**: New · Contacted · Met · Quote sent · On hold + All open leads; value before GST (live quote, else budget); the forecast weighted by **the studio's own record** from five closed leads up (1.0's fixed 5/10/20/40% guesses replaced — its own comment called them "not a studio's real history") | `PIPELINE_STAGES` · `MIN_CLOSED` · `pipelineNote` |
| H-UHD-1 · "ageing / stalled (days since the last logged touch, in bands per member)" | **built** — **Going quiet** (bands since the last contact by `lastContactOf`, the listing's own rule; On hold left out) and **Going quiet, by team member** (open · quiet over 30 days · longest quiet with the lead's name) | `QUIET_BANDS` · `quietNote` |
| H-UHD-1 · 2.0's shape: "the By team member table gains Quoted · Won · Conversion · Won value" | **built** in the Sales report's own By team member (Response time's table keeps its turnaround columns — one table per report, so neither grows past a screen) | as above |
| H-UHD-1 · 2.0's shape: "Export as the page has" | **built** — the tab's Export names the report on screen and writes every section (`salesSheet`) | `insights-view.tsx` `download` |
| H-UHD-1 · 2.0's shape: "Pure `lib/leads/sales.ts` over `LeadFacts` (+ source, first quote sent, the won quote's amount, budget, last contact — `lastContactOf`)" | **built** — `SalesFacts = LeadFacts & { source, reached, everOnHold, won, open, lastContactAt }`; the server reads them in `lib/leads/sales-queries.ts` (Who sees leads via `visibleLeadIds`) | `lib/leads/sales.ts`, `lib/leads/sales-queries.ts` |
| H-UHD-1 · "Who sees leads honoured; costs only through `Viewer.costs`" (the brief) | **built** — the facts pass `visibleLeadIds`; no cost, mark-up or margin is shown anywhere in this package (Won value is the client's price before GST, a sale, never a cost — `Viewer.costs` is not read because nothing it guards is shown) | `fetchSales` |
| H-UHD-3 · "Person-in-charge A / B, Team, Lead type (source), Property type, Address, Total sales before GST, Sign date, Est. start" | **built** — three optional columns, off by default: **Source** · **Signed on** · **Value before GST** (Owners and Admins); **kept**: PIC A / B = the Members column's avatars, Team = a Manager's team (`members.manager_id`, REG-601 — sweep row 76), Property type and Address = the row's second line and the Everything export, Est. start = Start date | `components/projects/project-columns.tsx`, `lib/projects/{queries,model,money-queries}.ts` |
| H-UHD-3 · "the Dashboard's Sales · Response time · Contractors widgets" | **built**: **Sales** and **Response time** tiles in Where it stands — the report's own figures on its 90 days, each a door with `?from=/dashboard`; **Contractors: for S45B** — its figures are lane B's contractor model (below, "For other packages") | `lib/dashboard/{queries,model}.ts`, `components/dashboard/dashboard-ghost.tsx` |

## Found in 1.0, not on a row
- **The demo-data switch** (`sales-report-mock.ts`, `isSalesReportSufficient`, "Demo data — show mine instead", the TAT route's `dataMode`) — **not carried**:
  a generated population under a studio's name is a fabricated record; 2.0 shows the studio's own records and each empty section says so.
- **Response time's leg chart** (`TatLegChart`, 4da810229: the three legs' medians as bars) — **not carried**: the three tiles above it say the same
  three medians; nothing decorative (S22's call).
- **The dashboard rework's drops** (Industry News, Studio Pulse, the Upcoming calendar) — **kept as S22 decided**: Market Insights' card, the Leads
  tile's this-week-against-last, Coming up; UHD's build dropped them for space, 2.0's page has room.
- **The Leads listing's "Insights" button** (4da810229, discoverability) — **built before** (REG-1361: the listing's Insights door opens Reports ›
  Leads with `?from=`).
- **`/api/project-aggregates/lead-info`** and **`useProjectsPreGstSalesCents`** — the listing's loader reads both in one pass (`fetchProjectRows`).
Nothing for S41b.

## Calls taken (as recommended — his ask 2026-10-17)
- **Two reports, not seven chips**: Response time (the landing, unchanged) and Sales holding 1.0's six as sections — the sweep's shape ("a second report
  beside Response time"); 1.0's picker order kept for the sections.
- **Sales is the Owners' and Admins'** (1.0's rule); Marketing keeps Response time alone — its money is not theirs (S44O). *For Vicky*: Marketing could
  be given the count-only sections (funnel, sources, flow, going quiet) without money if he wants the lead desk to read them.
- **Every money figure before GST** — Reports › Finance's rule and UHD's "bf GST".
- **Won value = the sale as signed, variation orders out** (UHD's "Initial Amount"; 1.0 skipped VOs) — the same rule for the Projects listing's
  **Value before GST**, so the two never disagree; its tooltip says what it stands on, so it is not read as Contract value less GST.
- **Chance of winning from the studio's own closed leads, and only from five or more** — never 1.0's fixed guesses, never "100% from two".
- **Going quiet uses `lastContactOf`** and leaves On hold out (a hold waits on purpose for its follow-up day).
- **One population per page**: the leads added in the range, the pipeline and going quiet too (1.0's rule, the caption says it).
- **No memory cookie for the report**: the address keeps it (Studio health's rule); a cookie would make the loader's first frame guess.
- **Dashboard**: Sales for Owners and Admins, Response time for whoever reads Reports › Leads (Marketing too); both on the reports' opening range
  (90 days — 1.0's widgets read 30, but the door must land on the figure it showed, and Reports opens on 90); no colour; 1.0's "awaiting assignment"
  chip not repeated (Needs you already says "n leads have no member yet").
- **Signed on** = the first signature on the project's quote or contract, else the Won day (the Won step records the signed copy); a direct project
  with neither reads "--".

## What to check in the browser (production build; View as switches roles; 1440 and 390)
- **Dane (Owner)**: Company › Reports › Leads → chips **Response time · Sales**; press Sales → tiles Leads 30 · Quote sent 5 · Won 2 · Won value
  S$121,087.50 on Last 90 days; By team member (Dane first); Where leads stop ("The biggest drop is between Contacted and Met…", the yellow chip);
  By source; Open pipeline ("Too few to tell · 2 of 2 closed" on Quote sent); Over time (the chart, By week · By month); Going quiet (bands, then by
  member with each longest-quiet lead). Export → "Export Sales report". Maison AI → "Which leads are going quiet?" → a lead → Back returns to Sales.
  Reload: still Sales. ⌘K "sales report".
- **Dashboard**: Where it stands = Leads · **Sales** · **Response time** · Open projects · Messages · Owed to you · Profit this month; Sales → the Sales
  report on 90 days ("Dashboard / Company / Reports"), Response time → Response time on 90 days.
- **Projects**: Column settings → turn on Source, Signed on, Value before GST; hover a Value before GST ("Quote OM-10004 as signed: S$77,900.12 with
  GST · variation orders not included") and a Signed on. **Germaine (Designer)**: Source and Signed on offered, no Value before GST.
- **Nurul (Marketing)**: Reports › Leads shows Response time with no chips; her Dashboard: Leads · Response time. **Hui Min (Admin)**: as Dane.
  **James / Germaine**: the Leads tab's gate. **Priya**: no figure.
- **390 / 320 touch**: the chips whole, tiles two-up, each table as cards with their heads, no sideways scroll.

## Probes run
On fresh copies of the repaired base (`pbuild/base.db` + migrate + repair — no migration, no repair of this package) with the lane's own
`next start -p 3160` (DATABASE_URL on the command); :3160 stopped after. `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors ·
`npm run design:lint` nothing new · `npx next build` green (under the lock).

| Probe | Tally |
| --- | --- |
| `pending-modules/verify-pm2-s45a.cjs` (new — §1 the tab and the address · §2 every figure against SQL on all four ranges · §3 Export, Maison AI, nothing written · §4 roles and ⌘K · §5 the Dashboard's tiles = the report's · §6 the Projects columns against SQL, the tooltip, a Designer's Column settings · §7 390 · 320 · 768 touch · §8 the ghosts at 1440 and 390, the Dashboard's tiles for an Owner and Marketing) | **157 / 157**, page error log empty |
| a lane copy of `pbuild/run-env.sh` (the lane's own build, each probe on a fresh base): `pm2-s22` (an Owner's and an Admin's tiles — a deliberate change) · `pm2-s39` · `pm2-s41b1` (an Admin with costs off has six tiles — a deliberate change) · `pm2-s44z` · `pm2-s17` · `reports-in-company/verify-reports` · `projects/verify-pj-r1` · `verify-pj-gap-i` · `parity-map-build/verify-pm-i`; `pm2-s44o` through a lane copy of `run-dev.sh` (its email-logo checks read the dev preview) | 116 / 116 · 175 / 175 · 110 / 110 · 106 / 106 · 130 / 130 · 41 / 41 · 98 / 98 · 81 / 81 · 54 / 54 · 56 / 56 |
| `projects/verify-pj-gap-a` | **69 / 72 — not this package**: its three failures read Aisha's hold as resuming "1[5-8] Nov" literally; on the base anchored to 17 Oct the restore day moves it to 19 Nov (`on_hold_until`). The listing's hold line is untouched here (the new columns are off by default). For S45C / the landing, beside pj-r2 · pj-r4b's dates. |
| `regression/run.cjs` on :3160 with a RUN_DIR made by hand from the base (empty.db with `empty.sql`, noleads.db with `DELETE FROM leads`): `ghosts-same` · `ghosts-same-390` (the Sales report on their list — a deliberate change) · `insights-head` · `search` · `first-run-empty` · `first-run-noleads` · `first-run-full` · `first-run-ghosts` · `kb-r1` · `kb-r2` · `view-as` · `ux-p7` | 74 / 74 · 74 / 74 · 16 / 16 · 27 / 27 · 89 / 89 · 5 / 5 · 6 / 6 · 15 / 15 · 35 / 35 · 29 / 29 · 23 / 23 · 89 / 89 |
| `npm run design:anatomy` (scratch `next start`, :3160; the Sales report on its list) | 89 pages, 315 table heads, 26 dialogs, 41 page menus — **all 1941 measures hold** |

## Migration and repair
- **No migration** — every figure reads records that exist (leads, stage logs, quotes, quote items, projects, contracts, notes, meetings).
- **No repair** — every state shown is the demo's own (REG-343): the won leads' projects with their signed quotes and contracts, the open leads'
  quotes and budgets, the stage logs that make the funnel, the contact logs that make Going quiet. **R130…R139 stay free.**

## Shared pieces changed
- `lib/prefs.ts` — **added** `useCountPref` · `setCountPref` (a remembered count beside the house flags, same store and listeners; `clearFlagPrefs`
  clears both). Additive; no caller changed.
- `lib/projects/money-queries.ts` — **added** `quoteNetsOf` · `signedNetBy` (+ types `QuoteNet` · `SignedNet`); `ownGstRate` unchanged (now also read
  by them). `lib/projects/model.ts` `ProjectRow` gains optional `source` · `signedOn` · `signedValue`; `lib/projects/queries.ts` `fetchProjectRows`
  reads the quote's and contract's `signed_at` and each lead's Won day.
- `lib/leads/tat.ts` — **added** `INSIGHTS_SHAPE` (Response time's remembered shape). `components/leads/insights/insights-view.tsx` takes `sales` ·
  `initialReport`, writes `?report=` · `?range=` to the address, and remembers its shape; `insights-ghost.tsx` is now a client module (it reads the
  address and the seed) with the report chips, Response time's remembered chips and Sales' ghost; `insights-view.module.css` gains `.reports`.
- `components/company/reports/reports-workspace.tsx` · `app/company/reports/[tab]/page.tsx` — the Leads tab's `sales` · `report`.
- `lib/dashboard/{queries,model}.ts`, `components/dashboard/dashboard-ghost.tsx` — two tiles; the ghost's tile helps by caption (desk / phone lines).
- `lib/global-search/model.ts` — the Sales report page (runners).
- Probes changed as deliberate changes (each commented "(pending modules S45A, a deliberate change of this rule)"): `pending-modules/verify-pm2-s22.cjs`
  (the Owner's and the Admin's tiles), `pending-modules/verify-pm2-s41b1.cjs` (an Admin with costs off: six tiles), `ghosts/verify-ghosts-same.cjs` (the
  Sales report on its list); `scripts/design-anatomy.mjs` measures `/company/reports/leads?report=sales`.
- No `components/om/*`, shell frame or `app/globals.css` change.

## For other packages
- **S45B (Contractors) / the landing — the Dashboard's Contractors widget** (1.0's `ContractorDashboardWidget`: idle now · unstaffed soon · over capacity,
  a door to `/contractors`): in 2.0's shape it is one more Where it stands tile, **Contractors**, for whoever reads Projects › Workload, its figure
  the Workload Contractors view's own (idle now, with "n unstaffed starting this week · n over capacity" as its help) and its door
  `withFrom('/projects?view=workload&…contractors…', DASHBOARD)`. Add it in `lib/dashboard/queries.ts` after the Sales / Response time block, its
  label to `tileLabelsFor` (Owners, Admins, Managers) and a `TILE_GHOST` entry in `components/dashboard/dashboard-ghost.tsx` (desk / phone lines as
  the page wraps them) — and pm2-s22 / pm2-s45a's tile lists. Nothing of it is built here: its records are lane B's.
- **The landing**: the probe `verify-pm2-s45a.cjs` and the changed lines of pm2-s22 · pm2-s41b1 · ghosts-same · design-anatomy; REG-S45A.* to number;
  CLAUDE.md's Map line below. **S45C / the landing**: `projects/verify-pj-gap-a` reads Aisha's hold day literally ("1[5-8] Nov") and fails 3 on a base
  anchored to 17 Oct (19 Nov) — the same fix as pj-r2 · pj-r4b's (read the day from `projects.on_hold_until`).
- **CLAUDE.md Map (the orchestrator's)**: *Sales reports (S45A)* — Company › Reports › Leads `?report=sales` (`components/company/reports/sales-report.tsx`,
  `lib/leads/sales.ts` pure · `lib/leads/sales-queries.ts` server, the report chips in `components/leads/insights/insights-view.tsx`); the Projects
  listing's Source · Signed on · Value before GST (`project-columns.tsx`, `signedNetBy` in `lib/projects/money-queries.ts`); the Dashboard's Sales ·
  Response time tiles (`lib/dashboard/queries.ts`); `useCountPref` (`lib/prefs.ts`).

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock: Reports › Leads' own frame, chips, tiles and tables; every new word in REG-S45A.1…12's
   invented-copy lists.
2. **One system, no one-offs** — `Chips` (Finance's report chips), `StatTiles`, `ReportTable` on the table core with `ColumnSettingsDrawer`, the house
   `ArticleChart`, `MetaChip`, `ExportDialog`, `useMaisonAi`, the ghost kit; the new stylesheet composes Leads › Insights' (and Finance's `.strong`) —
   `npm run design:lint` holds. Money before GST through the books' own `netOf`; the Projects column and the report through one `signedNetBy`.
3. **Plain words** — "Where leads stop", "Quote sent", "Won value", "Chance of winning", "Too few to tell", "Going quiet", "Since the last contact",
   "Value before GST", "Signed on" — 2.0's Won for 1.0's Signed.
4. **Nothing is lost** — the page writes nothing (probed: no record changes); Column settings keeps its reset; the Projects columns are off until
   turned on, so no listing changes for a studio that never opens Column settings.
5. **Say why** — each section's help says what it counts and a note says what the figures mean (the biggest drop, what is likely, what is quiet);
   "Too few to tell · 2 of 2 closed" says why a chance is missing; tooltips say what Value before GST and Signed on stand on; the footnote states
   every definition.
6. **Back returns where you came from** — the report and range in the address; the Dashboard's doors carry `?from=/dashboard` (Back names it); Maison
   AI's leads open with the report as their way back.
7. **Every screen is whole** — the Reports frame, `loading.tsx` + `PageReveal` drawing the tab's own ghost (chips, Sales' sections at the page's lengths,
   Response time's chips as drawn — probed ±2 px at 1440 and 390), the tab's gate, an empty line for every section.
8. **Every width is designed** — chips whole at 320, tiles two-up, the flow's chips taking their own line on a phone, tables as cards labelled by their
   heads; no sideways scroll at 390 · 320 · 768 against `screen.width` (probed on the report, the Dashboard and Projects).
9. **Tables follow the leads listing** — every Sales table and the three Projects columns on the listing's model: frozen first column, resizable and
   draggable heads, Column settings, phone cards; Source is a category with no sort (REG-468), the dates and money sort.
10. **Motion with purpose** — none added (the house chart's crosshair only).
11. **Honest data** — every figure is the records' own, probed against SQL on all four ranges; no sample population (1.0's demo switch dropped); the
    forecast reads the studio's own history and refuses to guess from too few; the Dashboard's tiles are the report's own functions over its own facts.
12. **Reach for everyone** — chips are radio groups with roving keys; each section a region named by its heading; tiles that go somewhere are links
    named with their figure and destination; the chart reads as a table (Show the numbers); tooltips on hover and focus are the house Tooltip's.
- **How to add a missing thing** — one home (Reports › Leads, beside Response time; doors from the Dashboard and ⌘K; no rail item, no new tab); shown only
  when it applies (Sales for its readers, the notes only when they have something to say, the Projects columns off by default); no filled button
  (a report has none — Export is outlined); defaults need no set-up (the report reads what the studio already has).
