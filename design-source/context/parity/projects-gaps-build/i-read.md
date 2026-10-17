# Package I — workload, compliance and AI on projects: the short read (gaps build, Phase B, 2026-10-08)

Read: inventories `A-listing.md` (A-21, A-134, A-145…A-174), `F-tasks-materials-floorplan-compliance.md` (F-091, F-272…F-302),
`B-how-a-project-starts.md` §6 (B-244…B-290) and `E-milestones-gantt.md` §11 (E-266…E-281), `J-…` (J-159, J-228); the reviewers' notes
`26-…/1-listing-start.md`, `3-schedule-tasks-materials.md`, `5-files-data-roles.md`, `7-coverage.md`; 1.0's code where the rows were thin:
`src/components/projects/workload-view.tsx`, `src/data/sg-checklists.ts` (1,804 lines), `src/data/compliance-actions.ts`,
`src/app/(main)/tools/compliance-navigator/page.tsx`, `src/lib/canonical-phases.ts`, `src/app/api/projects/plan/route.ts` (the fallback,
tips and warnings). 2.0: the Projects listing (`components/projects/projects-workspace.tsx`, `lib/projects/queries.ts`), Leads › Insights
(`app/leads/insights`, `lib/leads/insights.ts`, `lib/leads/tat.ts`), the schedule (`lib/projects/schedule*.ts`, C's `rebuildSchedule`,
the Start card and `SourcePicker`), Maison AI (`components/shell/maison-ai.tsx`, `lib/maison-ai.ts`, `components/leads/ai-sheet.tsx`).

## 1. What 1.0 does

**Workload (A-145…A-174).** An owner-only second segment on the listing's view toggle (no label, no tooltip). One row per active member:
avatar, name, "{n} active projects", a 28px track of project blocks each 25% wide, "Capacity: {n}%" and a status — "Has availability"
(< 60%), "Moderate" (60–79), "Near capacity" (≥ 80). Capacity = projects ÷ **4**, a constant for everyone, uncapped. Blocks open the project.
Busiest first. **Got wrong:** ignores the chips and the search (always the full list); never shows unassigned projects (the rows don't add
up); lists every member incl. accounts staff; steps of 25 make "Moderate" at 3 of 4; colours encode position only; an "At risk" red that
can't happen; no loading state; resets to the table on every visit. Insights for projects never existed (the Dashboard had counts).

**Compliance (F-272…F-302, B-135, B-166).** A bundled Singapore checklist — 61 items (57 mandatory, 4 recommended, no "best practice"),
22 categories, three phases (design · execution · closed), three property kinds (HDB 38 · Condo 29 · Landed 30); each item: title,
description, steps, authority, regulation, source link, penalty, timing, an `autoCreateTask` flag. Statuses pending · done · skipped,
no who / when. **The project checklist component is mounted nowhere** — no studio has seen it. What is live: (a) up to ten
"[Compliance] {title}" tasks made with every new project from the property-type text (Singapore's list in every country, the **first ten
mandatory** — ignoring the item's own flag, no due date, no link to the item, never announced); (b) a Dashboard card whose counts can never
fall and whose link opens a blank tab; (c) the **Compliance Navigator** under Tools — five studio-level actions (HDB Directory of
Renovation Contractors, CaseTrust, bizSAFE, BCA licensed contractors, ACRA BizFile+), each with what you need, steps with the studio's
name and UEN filled in, official links, a status Not started / In progress / Done and notes, **kept in the browser's localStorage**; and
the checklist browsable by property type, phase and search. Owner only.

**AI-drafted timelines (B-244…B-290, E-266…E-281).** Five ways in an empty Gantt; two send the quote's lines to an AI model (Gemini through
OpenRouter) for work phases with durations and colours, plus tips and risk warnings. When the model fails the route silently builds one
milestone per quote category (length = max(min days, items × a factor) — e.g. carpentry ≥ 7) and adds "Cleaning & Handover" — and toasts
the same success. **Got wrong:** the tips and risk warnings are saved and never shown (E-281); regenerating replaces every milestone and its
id behind a native `confirm()` (detaches tasks, invoices, approvals — E-279); the fallback looks like the AI's (E-280); no review before
it lands. 2.0 already lays a schedule out by rule from the quote's trades (Q-12) and C added rebuild, ready-made schedules, any quote and
an uploaded quote.

**Maison AI on projects (J-159, J-228).** 1.0's mAIson bot had tools `list_projects`, `get_project_details`, `create_project`,
`update_project`, `generate_project_plan`, `get_project_finance`, `generate_milestone_invoices`, `create_task`, `update_task`, with result
cards linking to the project; a coarse role rule (owner · admin · id). 2.0's sheet offers scripted suggestions that answer "Coming soon".

## 2. The calls — each as recommended, set on the owner's instruction of 2026-10-07

### Workload
- **I-Q1 A view of the listing.** The Projects listing gets a **List · Workload** switch (the house `SegmentedButton`, the Tasks page's
  source switch's place); `?view=workload` keeps it in the address. Shown to Owners, Admins and Managers; a Manager's rows are themselves
  and the Designers who report to them (the leads' `teamIds`). A Designer never meets it (the address falls back to the list).
- **I-Q2 It honours the listing.** The view counts exactly the rows the list shows — scope, Filters and search — leaving out completed
  projects, which never count against anyone (a line under the toolbar says how many running projects it counts). Fixes A-170.
- **I-Q3 Capacity per member, set by the studio.** `members.project_capacity` (null = the studio's default); the default lives in
  Settings › Projects › *Workload* ("Projects one person can run at once", 4 as 1.0's number, 1–20). Owners and Admins set them in the
  view's *Set capacity* dialog (every listed member, one number each, "Studio default" when blank) — Undo after a save.
- **I-Q4 Who is listed.** Active Designers and Managers, plus anyone else on a running project's team; projects with no one on the team
  get their own **No one yet** row (A-171). Busiest first (by load against capacity), then by name.
- **I-Q5 Plain states, no percentages.** "Room for 2 more" (green) · "Full" (yellow) · "1 over" (red) — from count vs capacity; the bar
  has one slot per unit of capacity and grows past it in red. A block = a project (its name, the attention dot, the on-hold mark),
  pressing it opens the project with `?from=`. A member's row on a phone is a card.

### Insights
- **I-Q6 Projects › Insights** (`/projects/insights`): the Leads Insights page's pattern — the L2 header, range chips, `StatTile`s, a
  By team member table on the listing's model with Column settings. Owners and Admins: the studio; Managers: their team's projects;
  Designers: the gate. The listing's ⋮ and the Workload view's head open it.
- **I-Q7 Five numbers.** *Projects started* (started in range) · *Completed* (completed in range) · *Average duration* (median start →
  completed as the headline, the average under it — Leads' rule) · *Late milestones* (ended after their planned day in range, plus running
  late now) · *Collection days* (invoice sent → paid in full, median; Owners and Admins only — the money rule). By team member: Running ·
  Started · Completed · Median duration · Late milestones · Load (count of capacity).

### Compliance
- **I-Q8 Singapore's list, ported whole.** 1.0's 61 items as a pure data file (`lib/compliance/sg-checklist.ts`), Singapore only (Leads
  DEF-30: one Singapore studio); roles and the empty "best practice" level dropped. The property kind comes from 2.0's fixed property list:
  HDB / BTO → HDB · Executive Condo / Condo / Penthouse → Condo · Landed → Landed; Commercial and Others get no list (said, with why).
- **I-Q9 A Compliance tab on the project** (after Floor plan): phase chips **Design · Execution · Handover** with counts, opening on the
  project's own phase (Setting up → Design, In progress → Execution, Completed → Handover) — every phase reachable (fixes F-302). Within a
  phase, items grouped by category; each row: the title, Mandatory / Recommended, the authority; pressing it opens its detail in place
  (what to do, steps, reference, penalty, the official source). The tab's count = the mandatory items still to do in the current phase.
- **I-Q10 Done · Not needed, with who and when.** Each item is To do, Done or Not needed; the row says "Done by Sarah · 3 Oct". Who may
  tick = who may change the project (`mayChangeProject`); others read. Every change offers Undo. Table `project_compliance`
  (project, item, state, by, at). Activity lines (chip *Compliance*); no bell event — the change is the team's own, said in place.
- **I-Q11 The starter tasks, fixed.** Settings › Projects › *Compliance*: "Start each project with its compliance tasks" (on by default,
  as 1.0 always did). On: a new project gets up to **ten tasks from the items flagged for a task** (F-299: the flag, not "the first ten
  mandatory") for its property kind, in the list's order, given to the project's team (the existing *Task assigned* bell). Each task is
  tied to its item (`lead_tasks.compliance_item`): ticking the task ticks the item and back (F-300). Titles are the item's own words, no
  "[Compliance]" prefix — the tab and the task's link say where it came from.
- **I-Q12 Compliance Navigator in Tools** (`/compliance`, the tile goes live): **Your studio** — the five studio-level actions with what
  you need, steps with the studio's name and UEN from Company › Profile, the official link, and To do / Done with who and when, kept on the
  server (`settings.compliance_studio`), changed by Owners and Admins (1.0: owner only) with Undo; **Rules by home** — the checklist by
  HDB / Condo / Landed and phase with search, read-only. In ⌘K's pages.

### AI-drafted timelines
- **I-Q13 Curated, deterministic, free.** "Drafted by Maison AI" is a planner in code (`lib/projects/schedule-ai.ts`, pure): it reads the
  quote's lines (trade, name, section), the scope's rooms, the property kind and the project type, and drafts the milestones: a permits /
  approvals stage the property kind needs (HDB permit and neighbours' notice · MCST approval · URA/BCA for landed), each stage of work
  sized by its lines (1.0's minimum + per-line days, held inside the stage's usual range), the usual overlaps, cleaning and the handover.
  No model call, no AI credits (Q-30).
- **I-Q14 Reviewed before it lands.** It is a fifth way in the **SourcePicker** — the Start card's and the Rebuild dialog's one control —
  and its review is "What you will get": each milestone with its dates, **why** ("12 carpentry lines across Kitchen and Master Bedroom"),
  a tick to leave it out, and *Worth knowing* — 1.0's tips and risk warnings, shown at last (E-281), with the compliance items the
  permits stage covers. Create schedule / Rebuild land it through the existing actions (the server re-drafts from its own records and
  drops the unticked); a rebuild keeps same-named milestones (C's rule) and offers Undo. Every milestone starts as the schedule's rule says.
- **I-Q15 1.0's mistakes not ported:** no silent fallback (the draft says what it read), no replace-everything (C's rebuild), no native
  confirm (the house ConfirmDialog names what goes).

### Maison AI acting on projects
- **I-Q16 Suggestions that do things.** `useMaisonAi` takes a suggestion as words (still "Coming soon") or as an action: **open** (a
  record), **answer** (a short list in the sheet — each row opens its record), **confirm then run** (a proposal in the sheet with one
  button, e.g. "Add the task …" — runs the existing server action, its rule and its refusal; the snackbar offers Undo and Open). Q-30:
  nothing is metered; every answer comes from the studio's own records.
- **I-Q17 What it does on Projects.** Listing: *Find late milestones* (every running project's late milestones, each opening its panel
  on the Schedule) · *Open the project that needs me most* · *Which updates wait for review?* (opens the scope). Project: *What is late
  on …?* (answer) · *Add a task for the next step* (proposal → `createTask` on the lead, the team assigned) · *Draft an update about this
  week* (proposal → `saveProjectUpdate` as a draft, never published — the review rule stands — then opens it) · *Draft a schedule from the
  quote* (opens the Start card or the Rebuild dialog on the Maison AI way). Workload / Insights: *Who has room for a new project?*
  (answer). J-159's role rule = the existing actions' rules (a refusal is said in the sheet).
- **I-Q18 The sheet's answer view** keeps the sheet: a back arrow to the suggestions, the answer's sentence, rows on the house menu row's
  look, and at most one filled button. Phone: the same sheet.

## 3. Not built, and why
- Other countries' lists (MY · AE · IN · EG) and the CaseTrust signing step — one Singapore studio (DEF-30); CaseTrust belongs to
  quote signing, not Projects.
- A Dashboard "Compliance alerts" card — the Dashboard is a later module; the Compliance tab's count and Insights carry it.
- A real language model — Q-30 and the curated rule; the planner is the developers' seam if a model is ever plugged in.
