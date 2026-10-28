# Package K-C — reports and the numbers: outcome (2026-10-08)

Fixes P-28 · P-29 · P-30 · P-31 · P-32 · P-33 (reports side) · P-34 · P-35 · Q-20 (and the answers Q-13 · Q-14 · Q-15 · Q-16 · Q-18 · Q-19).
Register rows staged in `reg-KC.md` (REG-KC.1 … KC.9). `npx tsc` is clean for every file here (the remaining errors are other packages'
work in progress: `app/leads/[id]/overview.tsx`, `components/projects/project-frame.tsx`, `components/shell/detail-skeleton.tsx`); `npx eslint`
clean on every file I touched; `npm run design:lint` — nothing new breaks a house rule (baseline untouched). The pure helpers were checked
with a throwaway `tsx` run (removed): "30m · 26.3h · 12 days · --", 47 h stays hours, 1 Oct 23:00 → 4 Oct 01:00 counts 3 days, "5 days in
Met", a 1 Jul 18:00 → 20 Aug 09:00 project counts 50 days, 400 days never turns into weeks.

## What changed, per fix

### P-28 · Q-13 — one duration formatter, "n days" in words
- `lib/leads/tat.ts` — `formatTat` (1.0's "12d") is gone; every figure goes through `durationWords` (lib/format.ts). `responseLine` now
  reads "Assigned in 30m · First contact in 23.5h · Won in 12 days" / "Won — 9 days running".
- `lib/projects/insights-model.ts` — `daysWords` = `dayWords(Math.round(d))`, null → "--"; no weeks.
- `lib/leads/row-text.ts` — `stageAge` = "5 days in Met" (`dayWords`); feeds the listing's In stage column, the kanban card and the phone card.
- `components/leads/detail/stages-card.tsx` — ONLY `daysLabel` (now `dayWords`) + its import + one doc comment ("Won in 12 days"). Same
  output as before for the stage rows; the Response time line changes through `responseLine`.
- `components/leads/insights/insights-view.tsx`, `components/projects/insights/project-insights-view.tsx` — tiles, cells, Maison AI, Export.

### P-29 · Q-14 — calendar days everywhere
- `lib/projects/insights-model.ts` — `durations` / `collections` / the member medians count `calendarDaysBetween(start, end)` (were ms ÷ 24 h,
  rounded: Shalini's 50 days read 51).
- `lib/leads/tat.ts` — `countedMs(from, to)`: under 48 h the exact span (minutes / hours stay), from 48 h whole calendar days. `legMs`,
  `responseTime` use it, so one lead's report figure = its Response time line.
- `lib/leads/row-text.ts` — `daysInStage` = calendar days (was floor of 24 h).
- `lib/projects/attention.ts` — `calendarDays` delegates to the house `calendarDaysBetween`; "Setting up for n days" counts calendar days.

### P-30 · Q-15 — the house `StatTiles`
- `components/om/stat-tile.tsx` + `.module.css` — `StatTiles` (`--tiles` = count, `--tiles-mid` = ≤3 → count, 4 → 2, 5–6 → 3): one row ≥1025;
  768–1024 ≥ ~176px a tile; ≤767 two per row, an odd last tile spans the row; <360 one per row. `StatTile` **wraps its caption by default**
  (CSS default now; `wrap={false}` → `data-nowrap`, one line cut). Ghosts drawn on `tile.tile` wrap too.
- Used by Reports › Leads, Reports › Projects and both their ghosts. **Not adopted** where I don't own the file — see Needs from others.

### P-31 · Q-16 — ranges and the caption
- `lib/leads/tat.ts` — `RANGES` = Last 30 days · Last 90 days · Last 12 months · All time, `DEFAULT_RANGE` = 90, `rangeLabel`;
  `INSIGHT_RANGES` (projects) is the same array. Both views open on 90.
- Projects caption: `{Your team’s projects · }Filtering on start and completion dates · n projects in range` (`ProjectsReport.inRange` =
  projects whose start or completion falls in the range). Leads' caption unchanged.
- The range bar: caption + Export at the right (`.barEnd`); ≤1024 the chips take their own row, caption + Export below.

### P-32 — waiting chips · finished late · "Start → Completed"
- Reports › Projects: a red `MetaChip` "n milestones overdue" (`data-testid="project-insights-waiting"`, icon `schedule`) when running
  projects have milestones open past their last day; the ghost draws its slot for whoever saw one last (`om.shape.project-insights.waiting`).
- *Late milestones* tile = milestones finished late in the range only (help "Finished late, of n finished in this range" / "No milestone
  finished in this range"); the member column follows the same rule (it added the overdue-now ones).
- Tile *Average duration* → **Start → Completed**; column *Median duration* → **Start → Completed** (track 176).
- Optional second chip ("projects waiting to start") **not built** — the recommendation called it optional.

### P-33 (reports side) — Maison AI acts
- Reports › Leads: three `answer` suggestions from the report on screen — slowest to first contact (member rows, no link), still unassigned
  (`Report.unassigned`, each row opens the lead `?from=/company/reports/leads`), *Summarise the turnaround* (renamed from "… this month’s …";
  follows the range; the three legs as rows).
- Reports › Finance (`components/finance/books/reports-view.tsx`, suggestions only): *Who owes the studio money?* (AR invoices → the
  project's Money tab), *Which projects have the thinnest margin?* (five lowest graded margins), *Open the cash flow* (`run`).
- Reports › Projects: *Which projects run late?* → *Which projects have overdue milestones?* (same `run`).

### P-34 — one word for late
- Reports › Projects: no "done late" / "running late now" / "run late"; footnote "…A milestone finished late when it was done after its
  planned last day; one still open past it is overdue." `lib/projects/attention.ts` already said "overdue" (comment added, no word change).
- The listing's attention words come from `attention.ts` (unchanged words). The two Maison AI titles that still say "running late" are not
  mine — see Needs from others.

### P-35 · Q-18 · Q-19
- No help line under an empty figure (Leads' "— / med" gone): empty = `--` alone; a figure's second line "median · avg n" on both
  (`MemberRow.wonMean`, `MemberInsight.durationMean` added). Awaiting / Late cells print `BLANK` for 0.
- "improving" on both delta chips. One footnote opening: `MEDIANS_NOTE` = "Medians shown as headline (robust to one long job)."
- `.sectionTitle` (By team member, both pages — Projects composes it) → heading-h4. Finance's tables were already h4 (CreditsTable), so
  `reports-view.tsx` needed no title change.
- Ghosts: `MEMBER_GHOST_CELL` exported from `components/leads/insights/insights-ghost.tsx`, used by both ghosts (the project's drew the
  avatar alone). Both ghosts draw the four ranges, the caption + Export slot, `StatTiles`, the new footnote; the projects ghost the new tile names.
- Q-18: no new grading (only Late milestones keeps its existing red when > 0).

### Q-20 — the house Export on both reports
- Outlined *Export* (`data-testid="insights-export"` / `"project-insights-export"`) → the house `ExportDialog` (format only, as Finance's) →
  `insightsSheet(report)` / `projectsSheet(report, range)` through `buildTable` + `downloadBlob`. Files `leads-report-last-90-days.csv`,
  `projects-report-last-90-days.xlsx`; snackbar "Exported Leads report as CSV · leads-report-last-90-days.csv".

## Check in the browser (prod build on a scratch DB)
- **Company › Reports › Leads** as Dane (Owner) — 1440 / 768 / 390: opens on *Last 90 days* (four chips); tiles read "30m" / "26.3h" /
  "n days", never "12d"; at 768 the second tile's caption wraps (was cut); on a phone tiles 2 + 1 (the third spans); the bar: chips row,
  then caption + Export (≤1024); the By team member title at 16/24; empty cells "--" with no line under; Export → each format downloads,
  snackbar; Maison AI: the three suggestions answer (no *Coming soon*), an unassigned lead's row opens it and Back returns to Reports.
- **Company › Reports › Projects** — Dane: five tiles in one row at 1440, 3 + 2 at 768, 2 + 2 + 1 at 390; *Start → Completed* tile and
  column; *Late milestones* = finished late only; the red "n milestones overdue" chip under the tiles (Ryan's project has one); caption
  "Filtering on start and completion dates · n projects in range" moves with the chips; Export. James (Manager): caption starts "Your team’s
  projects · ", four tiles (2 + 2 at 768 and 390). Sarah (Designer): the gate. The ghost (JS off) — member cells avatar + two lines.
- **Company › Reports › Finance** (Dane): Maison AI's three suggestions; *Open the cash flow* switches the report.
- **A lead's Overview** (e.g. Ryan's lead): LEAD STAGES' Response time line "Won in n days" (was "12d").
- **Leads listing**: In stage column (Column settings) "5 days in Met" — check it is not cut at its 180 width for "Quote Sent"; kanban
  cards and phone cards "n days in {stage}" — check the kanban card's meta line at 1440 and 1025.
- **Other StatTile pages** (caption now wraps by default): X-Ray result tiles, Money tab, Finance, Plan & AI credits, Integrations' email
  stats, the projects listing — at 768 and 390 nothing is cut, labels wrap to two lines where narrow; 1440 should be unchanged.

## Probe assertions changed
- `design-source/verify/ux-build-2026-09-30/P2/verify-p2.cjs` — the In stage cell, the kanban card and the phone card regexes: "N days in
  {stage}" (were "Nd in"). (parity P-28, a deliberate change of this rule)
- `design-source/verify/projects/verify-pj-gap-i.cjs` — the duration tile: named *Start → Completed*, reads days, never weeks (was
  `/days|weeks/`); *Find late milestones*' answer accepts "overdue" (P-34) beside "running late" until the listing's title changes.
- `design-source/verify/reports-in-company-2026-10-08/verify-reports.cjs` — a new block *The numbers (parity P-28…P-35)*: both open on Last
  90 days with the four ranges; the Projects caption; *Start → Completed* tile + column; Late milestones has no "running/done late"; the
  waiting chip's words; no "weeks" / "—"; both Exports; Leads' leg values in the house words; no help line under "--"; no "med"; the table
  title 16px; Maison AI's *Summarise the turnaround* answers with three rows.
- Unchanged but worth running: `insights-head` (the Leads table's head — columns unchanged), `ghosts/verify-ghosts-{same,strips,film}`
  (the `insights` route's ghost changed with its page), `thumb-inventory`.

## Needs from others
- **K-B1 (`lib/leads/detail.ts`)** — P-29: line 112 `daysBetween = (from, to) => Math.max(0, Math.floor((to - from) / DAY))` should be
  `Math.max(0, calendarDaysBetween(from, to))` (import from `@/lib/format`), so the LEAD STAGES rows, "n days in pipeline" and the parked
  row count calendar days like the project's Status card and the reports.
- **K-A1 (`components/projects/project-overview.tsx`)** — P-28: its local `days = (n) => …` should be `dayWords` from `lib/format.ts`
  (same output); `daysBetween` there can be `Math.max(0, calendarDaysBetween(a, b))`. (`calendarDays` from `lib/projects/attention.ts`
  still exists and now delegates to the house helper.)
- **K-A1 (`components/projects/use-project-maison.ts:34`)** and **the projects listing's owner (`components/projects/projects-workspace.tsx:222`)**
  — P-34: Maison AI's title "n milestones running late" → "n milestones overdue" (and "Nothing is late" → "Nothing is overdue" if present).
  `verify-pj-gap-i.cjs` already accepts both.
- **Whoever owns `lib/format.ts`'s `relativeTime` / the lead cards (`components/leads/lead-cards.tsx:63`, `kanban/board.tsx:268`)** —
  P-29: `relativeTime`'s "8d ago" still counts whole 24 h; the old floor in `daysInStage` existed so a New card never read "8d ago" beside
  "9d in New". With calendar days a New lead's card can now read "8d ago" beside "9 days in New" in the hours before midnight. Suggest
  `relativeTime`'s day branch count calendar days (`calendarDaysBetween`) — `lib/format.ts` is add-only for me, so I did not change it.
- **The leads listing's owner (`components/leads/table.tsx:43`)** — the In stage column is 180 wide; "12 days in Quote Sent" (~185 with
  padding) may cut. Consider 208, or confirm in the browser.
- **P-30 adoption** (files I don't own): Finance's tiles (`components/finance/books/books.module.css` `.tiles`/`.tiles3`,
  `reports-view.tsx` line ~`r.tiles.length === 3 ? b.tiles3 : b.tiles`), the Money tab (`components/projects/money/money.module.css .tiles`),
  `components/finance/project-costs.tsx`, `commissions-view.tsx`, the projects listing (`projects-workspace.module.css .tiles`, which is one
  row of 5 at 768 = 119px — the rule P-30 replaces). Each can swap its grid for `<StatTiles>` (keep a `className` for its margins).
- **C-04 note (seen on the way, not in P-30)**: `stat-tile.module.css .label` keeps `letter-spacing: .02em` though REG-729 says none on
  uppercase captions — left as is (not one of the 38 fixes).

## Repair text
None — no records move.
