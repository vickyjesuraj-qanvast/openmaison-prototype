# S45B · H-UHD-2 Contractors — outcome (2026-10-17, lane B, port 3170)

His ask (2026-10-17 00:15): "can you go ahead and build everything and complete it" — the leftovers of the 15 Oct report and **Urban Home
Design's three dashboards, built as features every studio gets** (his call settles UHD's exclusivity ask, `s45/plan-2026-10-17.md`). This
package is row **H-UHD-2** of `s42/sweep-newer-branches-2026-10-15.md` §2.1. 1.0 read through git only (`/Users/vicky/Documents/GitHub/qanvast-id-tool`,
`urbanhomedemo` @ 4da810229 — `docs/features/contractor-dashboard/spec.md`, `.claude/rules/contractors.md`, `src/lib/contractors/{allocation,trades}.ts`,
migrations 497 · 498, `src/app/api/projects/[id]/contractors/**`, `src/components/projects/project-contractors-card.tsx`, `src/app/(main)/contractors/page.tsx`);
its working tree never checked out, :3001 never opened. Register rows: `steps/reg-S45B.md` (REG-S45B.1…20). Probe:
`design-source/verify/pending-modules/verify-pm2-s45b.cjs`. Migration `drizzle/0114_s45b_contractors.sql` (renumber at the landing). Repair **R148**.

## Ledger — the row's "2.0's shape" and 1.0's every piece

| # | Item | Status | Where |
|---|---|---|---|
| 1 | **A contractor is a Finance › Vendors record** with its trades, a contractor switch, crew capacity and a code — never a second roster | **Built** | `vendors.is_contractor · trades_json · crew_capacity · code` (`lib/db/schema.ts`); `app/finance/vendor-actions.ts` (`VendorInput.contractor`, `contractorColumns`, the checks; anyone adds one, changing it is `changesVendor`); `components/finance/vendor-dialog.tsx` (Works on site · Trades they do on site · Sites at once · Code); `lib/finance/{model,queries}.ts` (`VendorRecord.contractor`) |
| 1a | 1.0's Contractors filter + trade chips in the row | **Built** | `components/finance/finance-workspace.tsx` (Contractors · n chip, `?show=contractors`), `cost-tables.tsx` (the row's line) |
| 1b | The contractor's sites from its record; merge keeps everything | **Built** | `components/finance/vendor-panel.tsx` (On site · This week facts, Sites list; merge preview), `vendor-actions.ts` (`mergeVendors` / `undoMerge` move `project_contractors`, fill the contractor details) |
| 1c | 1.0's studio trade list + Manage trades (round 2: rename keeps rows valid, archive when in use) | **Built in another form** | The trades ARE Settings › Quotes & pricing › Trades (one list — quotes, Price book, vendors, contractors); `renameTrade` (`app/settings/actions.ts`) now follows into `vendors.trade`, `vendors.trades_json` and `project_contractors.trade`; a trade removed from the list stays on the contractors that name it (`staffedTrades` keeps it) — 1.0's "archived trades keep their label" |
| 1d | `code` shown as a chip | **Built** | the row line, the panel's On site, the Workload row's trades line |
| 2 | **Project × trade × contractor assignments, optionally on a milestone; the window follows the schedule** | **Built** | `project_contractors` (`lib/db/schema.ts`, migration 0114); `lib/projects/contractors-model.ts` (`windowOf` reads the milestone's dates at read time — nothing copied); `app/projects/contractor-actions.ts` (`assignContractor` · `updateCrew` · `setCrewChecked` · `removeCrew` · `undoCrew`) |
| 2a | States planned · on site · done (+ 1.0's cancelled) | **Built** (cancelled → **Take off the project** with Undo, a soft remove) | `CREW_STATUSES`; a done milestone reads its crew done (`statusOf`) |
| 2b | "Leader checked" (stamps who and when) | **Built** | `setCrewChecked`; the row says "Leader checked by {who} · {day}"; Owners, Admins, Managers (REG-S45B.10) |
| 2c | Remarks | **Built** | the row's note (the dialog's Note, the row quotes it) |
| 2d | Milestone suggested by name; the trade suggested by the milestone | **Built** | `tradesOfTitle` (word stems of the studio's own trade names); the dialog's Works on / Trade preset; gaps |
| 2e | 1.0's override dates on a bound row | **Decided not to carry** — one window per row (the milestone's, or its own); a row needing other dates goes on Its own dates | REG-S45B.5 |
| 2f | Gantt panel's contractor chips | **Built** | the milestone panel's Contractors section (`useProjectCrew().section`, `milestone-panel.tsx` `crew` slot) and every milestone row's line (`rowLine` `crew`, `schedule-timeline.tsx` · `schedule-phone.tsx` `crewLine`) |
| 2g | Per-project Contractors card | **Built** | the Schedule toolbar's **Contractors · n** → the house Drawer (`components/projects/contractors/use-crew.tsx`), grouped by trade, gaps first, Add a contractor; `?crew=1`, `?assign=<milestone>&trade=`; a project with no schedule: its band |
| 2h | VendorPicker filtered by trade; new vendors created as contractors of that trade | **Built** | `components/projects/contractors/assign-dialog.tsx` (ChoiceCards of the trade's contractors with their availability; "Add a {trade} contractor" → the nested vendor dialog with Works on site on) |
| 3 | **The contractors' page**: idle now, free within 7 days, over capacity, unstaffed work starting soon | **Built** — home decided: **Projects › Workload** (`?view=workload&of=contractors`), not a Vendors view and not a new page/rail item | `components/projects/contractors/contractors-view.tsx` (+ `.module.css`, `contractors-ghost.tsx`, `keys.ts`); `components/projects/projects-workspace.tsx` (Members · Contractors); `lib/projects/workload-queries.ts` + `contractors.ts` (`contractorsFor`) |
| 3a | KPI strip | **Built** | four pressable StatTiles that narrow the rows |
| 3b | By site (UHD's sheet) · By contractor (idle pinned, Free from, Assign →) | **Built** | By site = `CreditsTable` (the listing's model, Column settings, phone cards); By contractor = the Members view's row grammar; Put on a site |
| 3c | Filters: trade · team/ID · date window · include completed | **Window built** (ScopePill This week · Next 2 weeks · Next 30 days); **trade / team built in another form** — the listing's search (a trade, a contractor, a code, a project) and the listing's scope + Filters (By site shows the rows the list shows; a team via Filters › Members); **"include finished"** — By site shows done crews (green), By contractor counts what keeps them busy |
| 3d | Reallocate from an idle row or a site cell | **Built** | Put on a site (the dialog picks the project, its gaps of the contractor's trades first); a gap's / a cell's Add one |
| 3e | Loading, empty, error states | **Built** | the ghost (`ContractorsGhost`, drawn by `projects-ghost.tsx` from `?of=` or the remembered choice); "No contractors yet" + Open Vendors; the listing's `error.tsx` |
| 3f | Dashboard widget "Idle contractors" (spec step 17; UHD's third widget — the coordinator's hand-over from S45A) | **Built** — Where it stands' **Contractors** tile after Open projects for Owners, Admins and Managers: the Workload board's Free this week, its line "free this week · n over capacity · n starting with no contractor", the door the Contractors view (Finance › Vendors while the studio keeps none); the gap also reaches the Dashboard as a **Needs you** door through `fetchProjectDetail` | `lib/dashboard/queries.ts` (after Open projects, from `list.contractors` — the listing's own read), `lib/dashboard/model.ts` `tileLabelsFor`, `components/dashboard/dashboard-ghost.tsx` `TILE_GHOST.Contractors`; pm2-s22 · pm2-s45a tile lists (REG-S45B.20) |
| 4 | **Who may assign** — the roles' rules + *Who may do what* rows | **Built** | `lib/projects/contractors-model.ts` (`seesContractors` · `checksCrew` · `ASSIGN_RULE` · `CHECK_RULE` · `ROLE_RULE`), every action's first line refuses Marketing (S45C's `workspaceRefusal`), its next Accounting (`ROLE_RULE`); `lib/settings/permissions.ts` (crew-mark · crew-assign · crew-check · crew-see) |
| 5 | **Activity lines** | **Built** | six kinds `project_contractor_*` (`lib/projects/events.ts`), region S45B in `lib/leads/activity.ts` |
| 5a | **Repair-backed demo data (REG-343)** | **Built** | R148 (`scripts/repair-demo-data.ts`) + six closing checks + the kinds in the unknown-kind check |
| 5b | **The phone** | **Built** | the Workload rows as cards, By site as cards, the dialog / drawer / menus as sheets, the Schedule's ⋮ › Contractors; 390 · 768 touch · 320 without sideways scroll |
| 6 | 1.0's "unstaffed workscopes starting ≤ 7 days" as the number to watch | **Built** | the Overview's **Needs you** row `crew-gap` (`lib/projects/needs-you.ts`, facts `crewGapsOf` in `lib/projects/contractors.ts`, `lib/projects/queries.ts`) |
| 7 | 1.0's `get_contractor_availability` mAIson tool (Phase 4, deferred in 1.0) | **Built by rule** | the listing's Maison AI "Which contractors are free this week?" |
| 8 | 1.0's nav alias "Contractors" (om rail + classic sidebar) | **Built in another form** — no rail item (REG-1360's rule): ⌘K's **Contractors** page, the Vendors view's Contractors, the doors `?from=` |
| 9 | CSV/XLSX import of the contractor list; Excel export of By site; `contractor.assigned` WhatsApp | **Not built — 1.0 deferred them too** (its spec §4.4 / Phase 4: "after demo", never built); a contractor is added in Finance › Vendors or in place from the dialog; Message on WhatsApp is on every crew row |
| 10 | BETA chip on every contractor surface (1.0 round 2) | **Not carried** — 2.0 ships it as a feature of every studio (his call), no beta marking exists in 2.0 |
| 11 | `vendors.is_demo`, demo clean-up route, hard delete (1.0 migration 499) | **Excluded** (the sweep's own call — demo scaffolding; 2.0 deactivates and merges vendors) |
| 12 | Rendering a gap for a site the viewer doesn't see; 1.0 scoped ID members to their sites | **Built** | Who sees leads: a site not seen keeps its contractor busy, reads "Another project", its milestones' names never leave the server (`fetchCrewBoard`) |

### Found in 1.0, not on the row
- 1.0's allocation counted **rows**, not sites, against capacity and counted the week, not the day — 2.0 counts sites day by day (REG-S45B.13).
- 1.0 never freed a contractor whose milestone was deleted or whose project paused — 2.0 does (on hold, handed over, a deleted milestone).
- 1.0's `Sample data` mode (`mock-contractors.ts` when the tables are missing) — not needed (the demo's records are real, R148).

## Calls taken (as recommended — his ask 2026-10-17)
1. **The page's home is Projects › Workload** (`?view=workload&of=contractors`): staffing is project work (the Workload view already answers "who has room"); Finance › Vendors keeps the record (one home each); no rail item. Designers see Contractors (1.0: owner · admin · id), the Members half stays the Owners', Admins' and Managers' — a Designer meets the toggle only once the studio keeps a contractor.
2. **Trades are the studio's one list** (Settings › Quotes & pricing › Trades), not 1.0's separate `contractor_trades` — a milestone reads as a trade by the trade's own words.
3. **One window per row** — the milestone's dates (followed at read time) or its own; no override.
4. **Leader checked** = Owners, Admins and Managers (a sign-off), said in the row for a Designer.
5. **Capacity counts sites, day by day**; late work keeps its contractor; on hold / handed over / deleted milestone frees them.
6. **A gap is Needs you's** (neutral, after late work, never on hold) — and only for trades some contractor does.
7. **Cancelled → Take off the project with Undo.** 8. **Window choice** as a ScopePill (house), not three chips.

## S45A merged into this lane (the coordinator's instruction, 2026-10-17)
S45A landed on main while this step ran; its files were brought into lane B by three-way merge (`git merge-file <lane> <B.base> <main>`, all
clean, no conflict): `app/company/reports/[tab]/page.tsx`, `components/company/reports/reports-workspace.tsx`, `components/dashboard/dashboard-ghost.tsx`,
`components/leads/insights/{insights-ghost,insights-view}.tsx` + `.module.css`, `components/projects/project-columns.tsx`, `lib/dashboard/{model,queries}.ts`,
`lib/global-search/model.ts`, `lib/leads/tat.ts`, `lib/prefs.ts`, `lib/projects/{model,money-queries,queries}.ts`, `scripts/design-anatomy.mjs`, the
probes `verify-ghosts-same.cjs` · `verify-pm2-s22.cjs` · `verify-pm2-s41b1.cjs`, `fixtures/baseline.json`, `design-source/REGISTER.md`, the S45 plan;
copied new: `components/company/reports/sales-report.{tsx,module.css}`, `lib/leads/{sales,sales-queries}.ts`, `verify-pm2-s45a.cjs` + `pm2-s45a/`,
S45A's outcome and register rows. B.base and main untouched. At the landing those files carry the same change on both sides.

## S45C merged into this lane (the coordinator's instruction, 2026-10-17)
S45C landed next; every file main changed since the lane's base was brought in the same way (`git merge-file`; new files copied). Eight files
that already carried S45A's merge met it again as conflicts of identical hunks — resolved by keeping this lane's version where it differed from
main only by this step's own lines (`lib/dashboard/{model,queries}.ts`, `components/dashboard/dashboard-ghost.tsx`, `verify-pm2-s22.cjs`,
`verify-pm2-s41b1.cjs`) and taking main's where this step changed nothing (`design-source/REGISTER.md`, the S45 plan, `fixtures/baseline.json`).
`app/finance/vendor-actions.ts` merged clean: S45C's `workspaceRefusal` first lines and this step's contractor fields side by side.
**Every contractor action takes S45C's first line** — `assignContractor` · `updateCrew` · `setCrewChecked` · `removeCrew` · `undoCrew` answer
Marketing with `workspaceRefusal()` (the house gate's sentence) before anything is read, then refuse Accounting with `ROLE_RULE`; S45C's own probe
now sweeps `app/projects/contractor-actions.ts` with the rest of the Projects family (a commented line in its TARGETS). The step's scratch DB was
remade from the base re-anchored after S45A (02:54): R148 writes 7 · 21 again and every check passes.

## Shared pieces changed (the other lanes must know)
- `lib/motion.ts` `bottomSheet.animate` gains `x: 0` — a **bug fix** for every Drawer open on its first paint on a phone (the milestone panel's `?open=` sat off-screen before this step too). No visual change otherwise.
- `lib/projects/schedule-model.ts` `rowLine` — an optional `crew` (appended after the line, a name kept as written); `schedule-timeline.tsx` / `schedule-phone.tsx` — optional `crewLine`; `milestone-panel.tsx` — optional `crew` slot after Tasks. Callers that pass nothing render as before.
- `lib/projects/needs-you.ts` — `NeedFacts.crewGaps?` + one producer appended (kind `crew-gap`, group `late`, neutral; not counted in any tab count).
- `lib/projects/queries.ts` `fetchProjectDetail` — one line in the facts (`crewGaps`). **Lane A edits `fetchProjectRows` in the same file** (different function).
- `lib/projects/workload-queries.ts` `workloadFor` (+ `contractors`), `lib/projects/model.ts` `ProjectsListData.contractors?`, `components/projects/projects-workspace.tsx` (Members · Contractors, the view toggle for whoever has either half, the URL's `of`, one Maison suggestion), `components/projects/projects-ghost.tsx` (flags `om.shape.projects.insights` apart from `…views`). **Lane A edits the listing (columns) — expect a merge in projects-workspace.tsx.**
- `app/finance/vendor-actions.ts` (contractor fields, merge), `app/settings/actions.ts` `renameTrade` (follows into contractors) — **lane C adds Marketing's first-line checks in Finance / Settings actions**; my hunks are inside the bodies.
- `lib/settings/permissions.ts` (four rows + `AREA_OF`), `lib/global-search/model.ts` (one page), `lib/leads/activity.ts` (region S45B), `lib/projects/events.ts` (six kinds, `trade` · `status` detail), `lib/db/baseline.ts` + `scripts/snapshot-baseline.ts` (`project_contractors` at the end).

## For other packages / the landing
- **Migration** `drizzle/0114_s45b_contractors.sql` (+ meta 0114 snapshot, journal): `project_contractors` + four `vendors` columns — renumber at the landing; additive only.
- **R148** runs after every repair that writes vendors and milestones (placed just before the closing checks); re-run `npm run db:baseline` after the landing's repair.
- **Lane A (H-UHD-3 · Dashboard):** landed; its hand-over (the Contractors tile) is built here (REG-S45B.20). The Dashboard's Needs you also carries Ryan's "No Painting contractor on Painting" through `fetchProjectDetail` (for Dane, Hui Min, Michelle) — a probe counting the Dashboard's rows meets it.
- **Lane C (Marketing checks):** landed; the contractor actions answer Marketing with its `workspaceRefusal()` on their first line and Accounting with `ROLE_RULE` on the next; `verify-pm2-s45c.cjs`' Projects family includes `contractor-actions`.
- **CLAUDE.md Map (the orchestrator's):** contractors = `vendors.is_contractor · trades_json · crew_capacity · code` + `project_contractors`; pure `lib/projects/contractors-model.ts` (`boardOf` · `lineOf` · `unstaffedOf` · `tradesOfTitle` · `availabilityOver` · `crewWords` · rules), server `lib/projects/contractors.ts` (`fetchCrewBoard` · `contractorsFor` · `crewGapsOf`), actions `app/projects/contractor-actions.ts`, UI `components/projects/contractors/*` (Workload's Contractors view · the project's crew drawer + milestone section · the Assign dialog · crew rows), doors `?view=workload&of=contractors` · `/projects/<id>/schedule?crew=1` · `?assign=<milestone>&trade=` · `/company/finance/vendors?show=contractors`.

## Probes run
Every server on :3170 against a scratch copy of `pbuild/base.db` (anchored to 17 Oct) migrated with 0114 and repaired (R148: 7 vendors · 21
places, then "already in step"; every closing check passes), `DATABASE_URL` on the same command; `local.db`, :3000 and :3001 never touched.
`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the old `<img>` warnings) · `npm run design:lint` nothing new · production
build green under the lock (each rebuild).

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s45b.cjs`** (this step: vendors, the Workload view, a gap's add + Undo, the Schedule, the crew menu, roles, ⌘K, the Dashboard tile, widths 1440 · 1025 · 768 touch · 390 touch · 320) | **72 / 72** (last run on the build with S45A + S45C merged) — page error log empty; the scratch DB dumped before and after a run: identical |
| `projects/verify-pj-gap-i` · `pj-gap-c` · `pj-fix-B` · `pj-gap-f1` · `pj-r2` · `pj-gap-a` | 81 / 81 · 105 / 105 · 53 / 53 · 85 / 85 · 87 / 87 · 72 / 72 (pj-r2 · pj-gap-a with S45C's date fixes) |
| `parity-map-build/verify-pm-a · b · e · f` | 47 / 47 · 47 / 47 · 58 / 58 · 60 / 60 |
| `pending-modules/verify-pm2-s02 · s06 · s09 · s22 · s24 · s41b1 · s42b · s42c · s43e · s44f · s44t · s45a · s45c` | 106 · 83 · 79 · 116 · 132 · 110 · 66 · 79 · 45 · 101 · 69 · 157 · 120 (S45C's sweep: 553 of 554 served actions as Nurul — the five contractor actions among them — refused in the gate's words, nothing written) |
| `simplify-projects-finance/verify-ks` · `reports-in-company-2026-10-08/verify-reports` · `lead-project-parity/KE/verify-ke` | 29 / 29 · 41 / 41 · 31 / 31 |
| regression harness on 3170 (RUN_DIR made by hand from the step's DB: base · empty with `empty.sql` · noleads with `DELETE FROM leads`) | ghosts-same 74 · ghosts-same-390 74 (rerun after both merges) · search 27 · st-r1 58 · st-r2 30 · st-r3 30 · overlays 67 · view-as 23 · first-run-full 6 · first-run-empty 89 · first-run-noleads 5 · ux-p5 58 — 0 fail |
| the listing's loader against its reveal (verify-ghosts-same's method on `/projects?view=workload` · `…&of=contractors` · `?view=list`, 1440 and 390 touch) | 0.00% differ on each |
| `npm run design:anatomy` (on the scratch `next start`) | 89 pages, 315 table heads, 26 dialogs, 41 page menus — all 1941 measures hold |

**Assertions changed as deliberate changes of their rule** (each commented): `projects/verify-pj-gap-i` — a Designer meets no Members workload; with
the studio's contractors the toggle offers Contractors alone (before: no view at all). `pending-modules/verify-pm2-s22` · `verify-pm2-s45a` — the
Owner's / Admin's / Manager's tiles carry Contractors after Open projects. `pending-modules/verify-pm2-s41b1` — an Admin without cost sight has seven
tiles (the ghost still draws the page's own count).

## What to check in the browser (production build; View as switches roles)
- **Dane (Owner), 1440:** Company › Finance › Vendors › **Contractors · 7** → Woodcraft's panel (On site · This week "1 over" · Sites); Edit Lim Brothers → Works on site → Sites at once 0 (refused) → 3 → Save. Projects › Workload view → **Contractors**: tiles (Free this week · Free within 7 days · Over capacity · No contractor yet); the Painting gap → **Add a contractor** (ColourPro first, "Free on these days") → Add → Undo; Window: Next 30 days; By site (Column settings). Ryan D'Souza › Schedule → **Contractors · 3** (AquaFlow running late, ⋮ Done → Undo, Leader checked → Undo, Message on WhatsApp); Carpentry fabrication's row line "Woodcraft Carpentry on site", its panel's Contractors; the Overview's Needs you "No Painting contractor on Painting".
- **Michelle (Designer, Ryan's team):** ⋮ › Leader checked reads its rule; the status changes. **Germaine (Designer):** Projects › Workload shows Contractors only. **James (Manager):** Members · Contractors; may Leader-check on his team's projects. **Priya (Accounting) / Nurul (Marketing):** no Workload view (the listing's gate); Priya edits a vendor's contractor fields (vendor rule).
- **390 / 768 touch / 320:** the Contractors view as cards, the crew drawer / Assign dialog / menus as sheets, no sideways scroll.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock; every surface composed from the module's own patterns (the Members workload row, the vendor dialog's switch rows, the milestone panel's sections, the listing's tiles and table model), every sentence flagged in REG-S45B.1…19.
2. **One system, no one-offs** — house pieces only: `Dialog` (form, a sheet on a phone), `Drawer`, `ChoiceCard`, `Chips`, `StatTiles`, `ScopePill`, `PortalMenu` + `DropdownItem`, `MetaChip`, `TextField` / `DateField`, `CreditsTable`, `EmptyState`, the ghost kit; CSS composes `workload.module.css`, `card.module.css`, `text-link.module.css`, `projects-workspace.module.css`; tokens only — `design:lint` holds every count.
3. **Plain words** — "Works on site", "Sites at once", "Free this week", "No Painting contractor yet", "Woodcraft Carpentry on site", "Leader checked by Hui Min · 22 Sep"; refusals say the rule.
4. **Nothing is lost** — every change has Undo (read from its own Activity line); a remove is soft; a merge moves the crew; a trade rename follows; a deleted milestone's crew stays on record.
5. **Say why** — Leader checked's rule in the row for a Designer; a done milestone's crew says why its status stays; refusals `{ error }` in the snackbar; a narrowed board says it (the pressed tile, the Window pill's dot).
6. **Back returns where you came from** — every door carries `?from=` (the vendor's Sites, the Workload's blocks and Vendors, Activity's See the schedule).
7. **Every screen is whole** — the shell, the Contractors ghost (the listing's ghost reads `?of=` / the remembered choice), the empty state, the listing's error page; the crew drawer and dialog on the house surfaces.
8. **Every width is designed** — 1440 · 1024 · 768 · 390 · 320 checked; rows become cards, dialogs and menus sheets; no sideways scroll (`screen.width`).
9. **Tables follow the leads listing** — By site is `CreditsTable` (frozen Project, Column settings, resizable heads, phone cards).
10. **Motion with purpose** — the house motion only; the phone sheet's first-paint fix (REG-S45B.19).
11. **Honest data** — R148 writes each place with its trail (put on · on site · checked) by the project's member, following each schedule's records; six closing checks.
12. **Reach for everyone** — radio groups (ChoiceCards, Chips) with keyboard, named icon buttons, menus with roles, tooltips on cut names, focus returns through the house surfaces.
