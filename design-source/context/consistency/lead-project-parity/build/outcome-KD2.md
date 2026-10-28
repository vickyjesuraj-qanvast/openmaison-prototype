# Package K-D2 — the Projects listing, exports and /tasks: outcome

Built: P-17 (listing side) · P-20 (projects side) · P-21 · P-22 · P-23 · P-24 · P-25 · P-26 (projects side) · P-27 · P-14 (listing side), and,
on the orchestrator's asks, Q-08 on the Projects toolbar, P-30's `StatTiles` row for the tiles and P-34's "overdue" in Maison AI's answer.
Register rows staged in `reg-KD2.md` (REG-KD2.1…14). `npx tsc` clean for every file here; `npx eslint` clean; `npm run design:lint` — nothing
new. No server, no build, no browser, no `local.db` write. No demo-data repair needed.

## Files changed

| file | what |
|---|---|
| `components/projects/scopes.ts` | the menu's groups (`top` · `todo` · `active` · `inactive`) in the lead's order; **Mine**; tests take `ScopeContext { now, me }` |
| `components/projects/projects-toolbar.tsx` + `.module.css` | the lead's menu order and labels (To do · Active · Inactive, dots), sheet "Project status", the pill counts `shown`; "Table view"; the search in the Leads listing's `.searchSlot` (composed) — 280 from 768, the pill steps aside only on a phone |
| `components/projects/project-columns.tsx` | `MembersCell` (the lead's Members cell; `card` = the lead card's foot), the Members column (label, 160, no sort), Project type without sort, Start date 136, `holdWords` "On hold till: {displayDateLong}", `projectStatement(registry)` |
| `components/projects/projects-table.tsx` + `.module.css` | selection track 40 + the first column's 12 pad (name at 52), the whole Project cell opens (REG-349 guard), identity gap 4, `onAssign`, touch: the name a 44 box; Edit details in the row ⋮ (`edit`), the menu's one width `PROJECT_MENU_WIDTH` |
| `components/om/table-core.module.css` | touch block (`hover: none` ≤1024): the core head's cells p6 + sort buttons 44, rows `height: auto; min-height: 64` |
| `components/projects/project-cards.tsx` | corner = `createdAt` age, the client's `tel` line (the lead card's classes), the members foot with assign, Edit details + `PROJECT_MENU_WIDTH` in the card ⋮ |
| `components/projects/projects-filters-modal.tsx` + `.module.css` | the Members tab = `MembersPane`; lists and sort rows compose the Leads Filters' |
| `components/leads/filters-modal.tsx` | `MembersPane` extracted (additive; the Leads modal renders it, markup and classes unchanged) |
| `components/projects/projects-workspace.tsx` + `.module.css` | Insights header button (gate = `data.workload`, the reports' people), Tickets → ⋮ with its count, per-row assign (`requireOne`, optimistic, "Members updated"), view remembered (`om.projects.workload`), the export statement + `selected`, `ScopeContext`, `shown` count, `StatTiles`, "overdue", an old `?col=` that doesn't sort is ignored, the row ⋮'s `edit` → `/projects/<id>?edit=1` |
| `components/projects/projects-ghost.tsx` | header New project · Insights · ⋮; phone: `cardsCanvas`, `StatTiles`, cards in `project-cards.module.css`; toolbar: 280 box from 768 / glyph on a phone, the toggle drawn before the first visit (flag default `true`); table: sel basis 36 (name at 52 with the kit's 16), Members 160, Start date 136; Workload ghost when the remembered view is Workload |
| `components/projects/workload/workload-view.tsx` | the Insights link's glyph `bar_chart_4_bars` |
| `components/leads/export-dialog.tsx` | generic `ExportDialog<R>`: `statement?: StatementSpec<R>` (leads' by default), `selected?: R[]` (a third set, opened on), the period on `spec.dateOf`, words from `spec`; `defaultScope` / `shownLabel` removed (only Projects used them) |
| `lib/leads/export.ts` | `ExportColumn<R>`, `StatementSpec<R>`, `LEAD_STATEMENT`, `statementColumns`, `listingKeys`, `downloadStatement`; `columnsFor` / `buildExport` / `downloadLeads` / `exportFileName` unchanged in behaviour |
| `components/leads/tasks/tasks-table.tsx` + `.module.css` (appended block only) | "For" head; a project's row = `project.name` over `project.number` (`data-testid="task-for-project"`); phone: one line |

## Per fix — what to check in the browser

**P-17 (listing) · Q-05** — `/projects` at 1440 as Dane: the head reads MEMBERS, cells = two avatars, a bordered "+n" when three or more, the
24 `person_add` (tooltip "Assign members"); a project with nobody → "Assign" link. Press `person_add`: the Assign popover under it with the
row's members ticked; untick all → refused (requireOne); change → avatars change at once, snackbar "Members updated"; the bulk bar's Assign
still adds to the selection ("n projects assigned to …"). Filters › Members (tab and title), 40 avatars, "Owner (you)". Column settings lists
Members. 390: the card's foot assigns. As Sarah (Designer): the popover shows the role's hint (the lead's).

**P-20 · Q-07** — the pill's menu: Open projects · All projects · Mine | TO DO: Needs attention · Waiting on client · Completing this month ·
Needs my review | ● ACTIVE: Setting up · In progress · Completed | ● INACTIVE: On hold (only while one is). Search "Ryan": the pill reads
"Open projects (1)"; a search with no match "(0)" over "No results found". 390: the sheet's title "Project status". Mine = projects you're a
member of (Dane: his ones).

**P-21 · Q-06** — 1440 Dane: New project · **Insights** (outlined, the 4-bar chart glyph) · ⋮; ⋮ = Export all as… · Deleted Projects · Tickets
(count at the end when tickets wait) · Projects Settings, no Insights row. Insights → Company › Reports › Projects, Back to Projects. As Sarah:
no Insights button. Workload view: its Insights link wears the same glyph. 390: Insights as a square.

**P-22** — 1440: the name's left edge 52 from the table's inner edge (was 68); its second line 4 below; press the client · property line or
the red reason → opens the project; the checkbox and ⋮ keep their own press. MEMBERS and PROJECT TYPE heads: no glyph. START DATE head whole.
768 touch: head 56 with 44-tall sort buttons, rows grow past 64 (the name a 44 box) — and check the other core tables at 768 touch for
regressions (Tools › Quotes, Qanvast Ops, Company › Plan, Insights tables, the lead's Quotes tab): rows whose content fits stay 64.

**P-23 · Q-09** — 390: the card's corner is the age ("2mo ago"-style relative of when the project was made); the line starts with the
client's phone in the link blue (tap dials), then client · property; the foot: avatars · "+n" · person_add (or "Assign").

**P-24** — the toggle reads "Table view" · "Workload view"; choose Workload, open the rail's Projects → Workload again; `/projects?view=list`
→ the table. Designers never get Workload.

**P-25** — ⋮ › Export all as…: Which projects (All · What the list shows) · Start date (All time …) · Columns · format · "N projects · every
column · CSV". "As the list shows" → "… · k columns, as the list shows" (Project = 3 columns: Project, Client, Property). Select two rows →
bulk Export → the third radio "Selected projects (2)" picked. File `openmaison-projects-YYYY-MM-DD.csv`. Leads' export: unchanged (K-D1 wires
"Selected leads").

**P-26 (projects)** — reload `/projects` at 390: the ghost on the grey canvas, white tiles, white raised cards (no borders), the toolbar pill ·
glyph · Filters · toggle; it lands card over card. 1440 / 768: header bones New project · Insights · ⋮; at 768 the 280 search bone.

**P-27 · Q-10** — `/tasks`: the column head FOR; a project's task reads "HDB 5-Room — Benjamin Han" over "P-2026-002" (number in the grey
second-line type); a lead's task its name; a studio task "Studio". 390: "name · number" on the card's line.

**P-14 (listing)** — Aisha's row and card: "On hold till: Mon, 16 Nov ’26".

**Q-08 (projects)** — 768 (mouse and touch): the 280 box in the toolbar row (no glyph), 44 tall on touch (Leads' REG-307 rule comes with the
composed slot — see "For Vicky"); 390: the glyph.

**P-30 / P-34 (orchestrator's asks)** — tiles: one row at 1440, 3 + 2 at 768, two per row at 390 with Contract value on its own row.
Maison AI › Find late milestones: "n milestones overdue" / "Nothing is overdue".

## Probe assertions changed (each marked "(parity P-xx, a deliberate change of this rule)")

- `design-source/verify/projects/verify-pj-gap-a.cjs` — the hold's words (row + phone card) "On hold till: {day}, 16 Nov"; the Team-sort check
  replaced by "the Members head is a label — no sort, even from ?col=team".
- `design-source/verify/projects/verify-pj-gap-h.cjs` — Tickets from ⋮ (`projects-kebab` → menuitem "Tickets…"), no `open-tickets` button.
- `design-source/verify/projects/verify-pj-gap-c.cjs` — /tasks › Projects: rows carry `task-for-project` ending in the number; the head reads
  "For"; the Leads view has none.
- `design-source/verify/projects/verify-pj-r1.cjs` — the bulk bar's buttons scoped to its toolbar (rows now have "Assign" links); the export is
  the statement (Selected projects (2) picked, Start date, Columns, the summary); new checks: Insights in the header / Tickets in ⋮, the Members
  column, the name at 52, the second line opens the project, the scope menu's order and groups.
- Left alone (still pass by reading): `reports-in-company-2026-10-08/verify-reports.cjs` (its `getByRole('button', { name: 'Insights' }).first()`
  on `/projects?view=workload` now finds the header's button — same destination, same Back); `verify-pj-gap-i.cjs` (K-C's edits; the
  Workload toggle's name is unchanged; a remembered Workload doesn't disturb its later C / Tools / Maison steps).

## Needs from others

1. **K-A2 / the orchestrator** — the listing's row and card ⋮ now pass `edit` to `ProjectMenuItems` and open `/projects/<id>?edit=1` (K-A2's
   landing in `project-frame.tsx`). Rename / hold / complete / reopen / resume / visualizer / planner branches stay in the workspace's `onMenu`
   (typed, unreachable from the row now); `RenameProjectDialog` and `HoldProjectDialog` remain mounted there — remove them if K-A2 retires those
   actions from the type. The card ⋮ doesn't pass `phone` (the listing has no Create strip; desktop rows don't carry AI Visualizer / Planner
   either) — K-A2's call if the phone card should.
2. **ToolbarSearch `fold`** (K-D1's proposal) — Projects composes Leads' `.searchSlot` (`components/leads/toolbar.module.css`) rather than a
   second override; if `fold="phone"` lands on `components/om/toolbar-search.tsx`, Projects passes it and `.searchSlot` goes from
   `projects-toolbar.module.css` too.

## For Vicky (decisions taken, say if you want them otherwise)

- The table core's touch block now reaches every core table at a touch tablet's width (the brief's "so every core table gets them"): heads
  p6 with 44 sort buttons, rows `height: auto` from 64. Tables with their own row height (Tasks 48, Contracts 68, Files / Templates / Deleted
  sheets 60) keep it.
- Composing Leads' search slot brings its REG-307 44-tall box on a touch pointer to Projects (K-D1 noted the tab toolbars' house box is 36).
- Mine counts every project you're a member of, Completed ones too (as the lead's Mine counts Won and Lost).
- The ghost draws Insights and the view toggle on a first visit (before the page has told it who is looking) — right for the Owners and
  Admins who demo it; a Designer's first ghost shows two bones the page then drops.
- Projects' export file is dated, as Leads' (`openmaison-projects-2026-10-08.csv`, was `projects.csv`).

## Repair text

None — no records move.
