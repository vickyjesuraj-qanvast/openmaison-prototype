# 3 — Schedule, tasks, materials, floor plan, 3D and compliance: what 2.0 still lacks from 1.0

Reviewer 3 of 7, 2026-10-07. Read only. Inventories **E** (`E-milestones-gantt.md`, E-01…E-342) and **F**
(`F-tasks-materials-floorplan-compliance.md`, F-001…F-311), checked against 2.0's working tree (Schedule
`components/projects/schedule/*` + `app/projects/schedule-actions.ts` + `lib/projects/schedule*.ts`; Tasks = the lead's
`components/leads/tasks/*` on the project's address; Choices `components/projects/choices/*` + `app/projects/choices-actions.ts` +
`lib/projects/choices*.ts`; the portal `components/portal/project/*`, `components/portal/choices/*`; Company › Templates › Schedules
`app/company/schedule-templates-actions.ts`) and against the calls in `23-projects-build-2026-10-05.md` §1 and the map `24-…`.
Spot-checked in 1.0 (`qanvast-id-tool` @ `620190192`) where a row was vague.

## Bottom line

2.0's **Schedule** covers nearly everything 1.0's Management › Milestones did day to day, and is ahead in many places: rules on
the server instead of a whole-array autosave, a drag that moves either end and carries what follows with one sentence and Undo,
Weeks / Months and Today, weekends shaded, keyboard and touch, "plan against actual", "what decides the handover", *Waiting on
someone*, a phone view that is the same product, and **Share changes** with a real list of what the client will see. What it
dropped on purpose is the money-on-milestones machinery — a payment % typed per milestone, the 4-step "100%" publish wizard, the
frozen-schedule override, the two-phase *Finalize* with its gates — because the quote's Payment Schedule and the Money tab own the
money now (Q-13, F-03…F-08), plus AI-written timelines and tasks (Q-12, Q-30) and commission (Q-21). The real holes in the schedule
are smaller: a schedule cannot be rebuilt or a template re-applied once it exists, a milestone can follow only **one** other and no
links are drawn, there is no milestone description or colour, sharing is all-or-nothing, and the client's schedule never says a
stage is paused or which payment falls due on it. **Tasks** on a project are the lead's Tasks tab, richer than 1.0's (comments, tags,
files, templates, due time, a Milestone column), but tasks have no *In progress* state and cannot go to an **outside person**
(subcontractor, supplier) or to the client. **Materials → Choices** is built and sounder (pick kept by id, needed-by, tied to a
milestone, price difference drafts a VO), but the client can only pick — never *Request changes* or *Reject* — and there is no
decision receipt or studio-only note. **Floor-plan mark-up, the 3-D Space Planner and compliance** are whole sub-modules 2.0 has
not built (held by Q-19 and Q-31): the floor-plan mark-up is the biggest single loss for a studio that used it; 1.0's compliance
checklist is not even mounted on a project any more — only its auto-created "[Compliance] …" tasks and a dashboard card are live.

## Features

Status counts: **Missing 10 · Partly 16 · Left out on purpose 29 · Built 33 · Not a product feature 4** (92 lines; all 653 row
ids — E-01…E-342 and F-001…F-311 — each in exactly one line).

| Feature (plain words) | 1.0 rows | Status | What 2.0 lacks (or the call) | Impact | Size | 2.0 evidence |
|---|---|---|---|---|---|---|
| **Put an outside person on a task** (a subcontractor, supplier or freelancer by name and phone; "Request invite" raises a task for the Owner to bring them in) | E-186, F-067, F-101, F-106, F-108, F-113, F-119 | Missing | A task can only go to studio members (the lead's members). No named outside person, no "(Ext)" owner on the row, no invite request. The map says "Homeowner and external assignees have no home." | Medium | M | `lib/db/schema.ts` `leadTasks` (no external columns); `24-…` §3 row `tasks` |
| **The client asks for other options, or turns a choice down** | F-150, F-158, F-179 | Partly | The client picks one option (with a note) and can change the pick until the work starts. There is no *Request changes* and no *Reject*, so "none of these work for us" has no button and no state the studio sees (map D-10 ports 1.0's change-requested / rejected answers as Shared). | Medium | S | `lib/projects/choices-model.ts` (draft · shared · chosen); `app/portal/choices-actions.ts` `chooseOption` only |
| **Rebuild a schedule, or apply a template to one that exists** (1.0's cog › Generate timeline · Reset to a template) | E-40, E-249, E-272, E-273, E-279 | Missing | *Set up the schedule* shows only while a project has no milestones; `createSchedule` refuses "This project already has a schedule". A studio that started wrong deletes milestones one by one. (1.0's version was destructive — new ids, lost publish state — so 2.0 should keep ids or ask.) | Medium | S | `app/projects/schedule-actions.ts` `createSchedule`; `components/projects/schedule/project-schedule.tsx` (Start only when `!list.length`) |
| **"In progress" on a task** (status cards Not Started · In Progress · Completed, chips with counts, *Move to* a status) | F-014, F-015, F-016, F-021, F-024, F-027, F-033, F-034, F-039, F-040, F-044, F-045, F-054, F-064, F-081, F-087 | Partly | 2.0 tasks are open or done: no In progress state, no grouping by status, no *Move to* back to Not started in bulk. Any change here is to the lead's Tasks tab too (Vicky's lane). | Medium | S | `lead_tasks.done`; `lib/leads/task-filters.ts` (status = open / completed) |
| **A milestone that waits on several others** ("starts after all 3 selected milestones finish") | E-161, E-165, E-178, E-179, E-180 | Partly | *Moves with* names **one** milestone (plus a gap in days, which 1.0 lacked — its lag days were dead code). A finish that depends on two parallel trades cannot be said. | Low | M | `components/projects/schedule/milestone-panel.tsx` *Moves with*; `project_milestones.follows_id` |
| **See the links between milestones on the timeline** (arrows; red when broken; remove a link from the chart) | E-65, E-88, E-118 | Partly | No arrows are drawn. A link shows in the panel and as followers light up during a drag; it is changed in the panel. | Low | M | `schedule-timeline.tsx` (`data-following`) |
| **A milestone's description** | E-131 | Missing | No description or notes field on a milestone (the map drops it, §3.3). | Low | S | `lib/db/schema.ts` `projectMilestones` |
| **Pick a colour for a milestone's bar** | E-68, E-112, E-130 | Missing | Bars are coloured by status only; 1.0's eight swatches per milestone are gone (deliberate in the canvas, but no call names it). | Low | S | `schedule-timeline.tsx` (`data-s`) |
| **Drag a row to reorder milestones** | E-86, E-120 | Partly | Move up / Move down in the row menu (and Alt ↑ ↓), with Undo; no dragging rows. | Low | S | `schedule-timeline.tsx` `RowMenu`; `reorderMilestone` |
| **Widen the milestone-name column** | E-55, E-58, E-87 | Missing | Fixed 360px column (1.0: drag 180–400px). | Low | S | `schedule-timeline.tsx` `NAME_W` |
| **Full-screen timeline** | E-39, E-42 | Missing | No full-screen mode for a long schedule. | Low | S | `project-schedule.tsx` toolbar |
| **Ready-made schedules per property type** (HDB BTO · HDB resale · condo · landed · commercial fit-out; 1.0 also shipped one per project type) | E-25, E-26, E-274, E-278 | Partly | One library (better than 1.0's three that never met); a new template can start from "Whole-home renovation"; the demo has two. Nothing shipped per property type. | Low | S | `app/company/schedule-templates-actions.ts` (`RENOVATION`); repair R69 |
| **Share some changes now and hold others** (tick which milestones to publish; publish one milestone from its panel) | E-135, E-144, E-157, E-232, E-233, E-246 | Partly | *Share changes* sends every pending change at once (with the list and a note). No per-milestone pick, no publish from one milestone. | Low | M | `components/projects/schedule/share-dialog.tsx`; `shareSchedule` |
| **A milestone's publish history** ("Renamed · Dates shifted by +3d · Status …", last three) | E-139 | Partly | The panel says when it was last shared (and as done); each share stores its changes and Activity has the share lines, but no per-milestone history. | Low | S | `milestone-panel.tsx` (`panel-shared`); `project_schedule_shares.changes` |
| **The client's schedule shows payments and pauses** (payment pill per stage, "Paused — reason · resuming around …", filter chips, invoices on the rail) | E-238, E-239 | Partly | The portal shows name, dates, Done · Under way · Coming up and the confirm asks. A Blocked stage reads "Under way" with no reason or resume day; payments live only on the Money tab; no filters. (1.0 leaked internal block notes live — 2.0 must share them on purpose.) | Low | S | `components/portal/project/portal-schedule.tsx`; `clientStateOf` in `lib/projects/schedule-model.ts` |
| **Prompts when a milestone starts or ends** ("Started — what next?": post an update, make tasks; "Post Update" after completing; one milestone active at a time; actual start logged) | E-166, E-167, E-168, E-169, E-212 | Partly | Status changes answer in one sentence with Undo (Done early asks first). No offer to post an update or make tasks; several milestones may run at once (by design — phases overlap); no actual start day. Updates can still be tied to a milestone from the Updates tab. | Low | S | `project-schedule.tsx` `status`; `components/projects/updates/*` (milestone picker) |
| **Owner approves a milestone's completion** (Workflow › "Milestone approval required": a non-owner's Done waits as Pending approval) | E-194, E-198, E-200 | Missing | Four statuses; anyone on the team marks Done. Money is gated at the invoice instead (F-05). | Low | S | `MILESTONE_STATUSES` in `lib/projects/schedule-model.ts` |
| **Answer the client's "not right" with what you changed** ("Mark resolved" with a note) | E-219, E-220 | Partly | *Ask {client} again* clears the answer and asks again; no note of what was changed reaches the client or the record. | Low | S | `askStageAgain` in `app/projects/schedule-actions.ts` |
| **A milestone's invoice on the milestone** (number, state, quick view) | E-138 | Partly | The panel shows the payment stage it is tied to, not its invoice; the invoice is on Money ("Ready to send"). | Low | S | `milestone-panel.tsx` (payment switch) |
| **Ask Maison AI about one milestone** | E-143 | Partly | The Schedule offers three scripted prompts for the whole schedule; nothing from a milestone. | Low | S | `components/projects/project-frame.tsx` `useMaisonAi` |
| **Build the schedule from an uploaded quote file** (or fall back to the lead's quote) | E-23, E-24, E-28, E-271 | Partly | *The signed quote* reads only the project's signed system quote's trades; no upload-and-parse here and no fallback (Create Quote › Upload a quote makes a quote elsewhere). | Low | M | `components/projects/schedule/start-schedule.tsx`; `draftsFor` |
| **Edit a milestone's tasks in place** (assignee, due date, description, pictures per task; overdue count; batch save) | E-184, E-185, E-187, E-189, F-095, F-096, F-097, F-098, F-099, F-100, F-102, F-104, F-107, F-112, F-115, F-121, F-122, F-123, F-124, F-125 | Partly | The panel lists, ticks and adds by name (due on the milestone's last day, the team on it). Assignee, due, description and pictures are set in the Tasks tab (Milestone column), not inside the milestone. (1.0's batch save also reset In-progress and revived cancelled tasks — not carried.) | Low | S | `milestone-panel.tsx` Tasks; `addMilestoneTask` |
| **Give the client a to-do** ("Your to-dos" on the portal) | F-120 | Missing | No task can be assigned to the client. Choices and stages to confirm are the client's only asks. (1.0 had it behind a studio switch, off by default.) | Low | M | `24-…` §10 "a homeowner's own to-dos" |
| **A receipt of the client's choice** (PDF: options, prices, ✓ picked, decided on, hash; *Selection Receipts* in Files) | F-129, F-163 | Missing | The pick, who and when are on the record and in Activity; nothing printable to hand over or keep for a dispute. | Low | M | `components/projects/choices/*` (no receipt) |
| **A studio-only note on a choice** | F-162 | Missing | A choice has one note, and it is for the client. | Low | S | `project_selections.note` |
| **Vendor on an option; save a new option to the studio's catalogue** | F-139, F-140, F-146, F-147 | Partly | An option is a picture (or colour), name, a line, a price against the quote, from Materials / the Price book / a render / an upload. No vendor field; a new option cannot be saved back to Materials or the Price book. | Low | S | `components/projects/choices/option-dialog.tsx` |
| Floor plan › **Shared plans on a project** (upload image or PDF — first page rendered, original kept; several plans, one **Primary** the client opens on; import from the project's files; "Ask your homeowner to send it"; rename, archive, switcher) | F-181, F-182, F-183, F-184, F-185, F-186, F-188, F-189, F-199, F-200, F-207, F-208, F-219, F-227, F-228, F-244 | Left out on purpose | **Q-19** "Floor-plan mark-up and the 3D planner later, own modules". Later. | | | `24-…` §1 "Not built (Q-19 · Q-31)" |
| Floor plan › **Drawing on the plan** (pen, box, arrow, text, numbered comment pins, photo pins, hatched zones, revision clouds, numbered callouts, ten stamps — sockets, switches, data/TV, aircon, downlight, cove, pendant, water point, floor trap; colour / thickness / dash; select, move, erase; ⌘Z; pinch / wheel zoom 100–800%, pan, fit) | F-187, F-190, F-191, F-192, F-195, F-196, F-198, F-209, F-210, F-213, F-214, F-215, F-229, F-238 | Left out on purpose | Q-19 (later). | | | — |
| Floor plan › **Plan scale and measuring in mm** (teach the plan one known length, then Measure reads millimetres) | F-193, F-197, F-212, F-235 | Left out on purpose | Q-19 (later). | | | — |
| Floor plan › **Trade layers** (General, Carpentry, Electrical, Plumbing / wet works, Lighting, Tiling & flooring, Client requests, *Studio only* — stripped from the client's data on the server) | F-194, F-231 | Left out on purpose | Q-19 (later). | | | — |
| Floor plan › **A conversation on each mark** (thread with photos, Studio / Homeowner pills, resolve / reopen, Both · Studio · Homeowner filter, hide resolved) | F-202, F-205, F-206, F-216, F-223, F-230, F-240, F-243 | Left out on purpose | Q-19 (later). | | | — |
| Floor plan › **Mark → task, mark → variation order** | F-217, F-218, F-242 | Left out on purpose | Q-19 (later). | | | — |
| Floor plan › **The client confirms the layout** ("Happy with this layout?" → "Layout confirmed by … · date", append-only, "not a contract-grade signature"; warns when viewing a non-confirmed plan) | F-201, F-232, F-233, F-239 | Left out on purpose | Q-19 (later). | | | — |
| Floor plan › **Point schedule and site diary** (stamps counted per symbol; photo pins grouped by the day taken) | F-203, F-204, F-211 | Left out on purpose | Q-19 (later). | | | — |
| Floor plan › **Export the marked plan as a PDF** for the contractor (plan + numbered legend of conversations) | F-220, F-241 | Left out on purpose | Q-19 (later). | | | — |
| Floor plan › **Notices, live refresh and preview** (client emailed on each upload, studio told of the client's marks at most once per 15 min, 8-second refresh, read-only preview, error states) | F-221, F-222, F-224, F-225, F-234, F-246 | Left out on purpose | Q-19 (later). | | | — |
| 3D › **"Plan the Space (3D)" from a project** (header button → small dialog listing the project's layouts or "Start a new 3D layout") | F-247, F-248, F-249, F-250, F-251, F-265, F-266, F-267, F-268 | Left out on purpose | Q-19 (later). In 1.0 a layout made from a project is never saved with the project's id, so the list stays empty and nothing comes back (F-265). 2.0's Tools tile "3-D Space Planner" answers *Coming soon*. | | | `components/shell/tools-popover.tsx` |
| 3D › **Starting a layout** (Singapore flat templates HDB · Condo · Landed · Multi-floor · Pre-furnished; draw rooms with walls, doors, windows; AI from a floor-plan image or a room photo) | F-252, F-253 | Left out on purpose | Q-19 (later). | | | — |
| 3D › **The editor** (Dollhouse · Cutaway · Top view · Walk; 47-piece furniture catalogue, place / drag / rotate / resize / duplicate, grid and wall snap, collisions, room colours; undo / redo, copy / paste, shortcut list) | F-254, F-255, F-258 | Left out on purpose | Q-19 (later). | | | — |
| 3D › **AI inside the planner** (auto-arrange, photoreal room render, render tour, furniture from text / photo / catalogue page, a fix-the-plan wizard) | F-256 | Left out on purpose | Q-19 (later); no credits charged on this 1.0 branch (F-264). | | | — |
| 3D › **Output and sharing** (elevations, PNG / PDF, a read-only 3D share link with a public viewer — orbit / walk, room pills; presentation mode with sun angle; versions with auto summaries; save as template) | F-257, F-259, F-260, F-261, F-262 | Left out on purpose | Q-19 (later). | | | — |
| Compliance › **The project checklist** (Singapore's 61 items — 57 mandatory, 4 recommended — filtered by HDB / Condo / Landed and by Design · Execution · Handover; category accordion, authority, timing, regulation, penalty, steps; Mark done · Skip; compact card; sets for MY · AE · IN · EG) | F-272, F-274, F-275, F-276, F-277, F-278, F-279, F-280, F-281, F-282, F-284, F-285, F-286, F-287, F-288, F-289, F-301, F-302 | Left out on purpose | **Q-31** "Meeting Summary and compliance held". Later. Note: in 1.0 this component is **mounted nowhere** — no studio sees it today. | | | `24-…` §10 |
| Compliance › **"[Compliance] …" tasks made with a new project** (first ten mandatory items for the property type, e.g. Apply for HDB renovation permit, Engage LEW, Serve notice to neighbours) | F-091, F-290, F-291, F-298, F-299, F-300 | Left out on purpose | Q-31 (later). Live in 1.0 (Singapore list whatever the region; no due date). | | | — |
| Compliance › **Dashboard "Compliance Alerts"** | F-292, F-296, F-297 | Left out on purpose | Q-31 and the Dashboard (later). In 1.0 its counts can never fall and its link opens a blank tab. | | | — |
| Compliance › **Compliance Navigator tool and the bot's compliance answers** | F-273 | Left out on purpose | Q-31 (later); the Tools tile answers *Coming soon*. | | | `components/shell/tools-popover.tsx` |
| **CaseTrust deposit disclosure** at signing | F-294, F-295, F-303 | Left out on purpose | Contracts audit **CP-17** "CaseTrust step — Later". (A signing step, not a project surface.) | | | `07-contracts-…` CP-17 |
| **Payment % typed on milestones** (payment trigger, ≈S$, totals strip, 100% gate on publish, Payment Structure dialog, frozen schedule + Override, invoice lock, fixed amounts, mirroring into the quote) | E-35, E-154, E-162, E-163, E-181, E-182, E-183, E-193, E-241, E-243, E-247, E-248, E-259, E-260, E-261, E-262 | Left out on purpose | **Q-13** "The quote's Payment Schedule is the source of the shares; a payment stage is tied to a milestone"; **F-03**, **F-08** "agreed shares never move". A milestone only ties to a stage. | | | `milestone-panel.tsx` *A payment falls due here* |
| **The first-publish wizard** (Tag payments · Match quote · Check totals · Review & publish; Rebalance from a VO) | E-50, E-226, E-227, E-228, E-229, E-230, E-231 | Left out on purpose | Q-13 (payments from the quote) and **Q-15** "Share changes with the list of what changes". | | | `share-dialog.tsx` |
| **A timeline of payment milestones only** (Deposit / Progress / Final bars; studio default 10/30/30/30) | E-269, E-270 | Left out on purpose | Q-13 — a payment is a diamond on a work milestone. | | | `createSchedule` ties stages |
| **Commission on milestones** ("Comm: S$…", commission setup strip, accrued) | E-252, E-264 | Left out on purpose | **Q-21** "Commission held for money out". Later. | | | — |
| **Finalize completion** (completion checklist: client approved · invoice shared · internal approval; then lock) | E-156, E-216, E-217, E-218 | Left out on purpose | **Q-16** (the client confirms only when the studio asks — never a gate), **F-04** (a Done milestone makes its invoice *Ready to send*), **F-05** (invoice approval). | | | `lib/projects/invoices.ts` |
| **Approval requests as tasks** (Quote / Timeline / Milestone / VO / Expense / Invoice approval… with Approve / Reject in the task list) | F-029, F-035, F-047, F-058, F-065, F-073, F-074, F-078 | Left out on purpose | **F-05** "the quotes' approval pattern", **Q-17** update review: an approval is a state on its record plus a bell row (map §3, `tasks`). | | | `components/quotes/editor/quote-bars.tsx`; Updates review band |
| **AI-written timeline and AI task suggestions** ("Generate from quote" via Gemini, tips and risk warnings; "Suggest from quote" in a milestone; "Generate tasks") | E-188, E-190, E-267, E-280, E-281, F-103, F-109, F-110, F-114, F-116, F-117 | Left out on purpose | **Q-12** "AI-written timelines held", **Q-30** no metered press (map §10). Later. 1.0 silently returned canned tasks when the AI failed. | | | `lib/projects/schedule-phases.ts` (rules, not AI) |
| **Dependency-conflict banner and "Why?"** (red: "B starts before A ends", ask mAIson) | E-37, E-284 | Left out on purpose | **Q-09 · Q-10** as drawn: a move carries what follows, so a link cannot be broken by a drag. | | | `moveWith` |
| **Workload view** (each member's active projects against a ceiling of four) | F-310, F-311 | Left out on purpose | **Q-08** "Workload view later, with Insights". | | | — |
| Schedule tab and its ways in (address, Overview card with the next milestones, a notice opening the milestone) | E-01, E-02, E-03, E-04, E-17, E-19, F-001, F-002, F-003, F-004 | Built | — | | | `lib/projects/tabs.ts`; `project-overview.tsx`; `?open=` in `project-schedule.tsx` |
| Set up the schedule (works start; from the signed quote's stages, a template or nothing; "What you will get" preview; past stages start Done; a default template in Settings) | E-18, E-20, E-21, E-22, E-27, E-199, E-265, E-266, E-268 | Built | — | | | `start-schedule.tsx`; `createSchedule`; `app/settings/projects-settings.tsx` |
| Where the job stands (headline, Done n of m, days to handover, next payment; late counts) | E-29, E-30, E-31, E-32, E-48, E-49, E-201, E-202, E-203, E-204 | Built | — | | | `summaryOf`; `project-schedule.tsx` |
| The timeline grid (Weeks / Months, Today, weekends shaded, today's line, sideways scroll with frozen name column, calendar days — Q-11) | E-53, E-54, E-56, E-59, E-60, E-61, E-62, E-66, E-81, E-97, E-99, E-100, E-108, E-109, E-123 | Built | — | | | `schedule-timeline.tsx` |
| State drawn on rows and bars (status glyph, Late, Blocked, task-progress fill, payment chip, moved chip) | E-41, E-57, E-63, E-67, E-69, E-70, E-71, E-74, E-101, E-110, E-111, E-113 | Built | 1.0's "at risk" also flagged a milestone with <20% of its time left; 2.0 flags Late and reminds 3 days before (below). | | | `schedule-timeline.tsx`; `isLate` |
| Drag to move a bar or either end; what follows is carried; dates shown while dragging; Escape; Undo; keyboard arrows; long-press on touch | E-82, E-83, E-84, E-85, E-89, E-90, E-102, E-103, E-115, E-116, E-117, E-326 | Built | — | | | `schedule-timeline.tsx`; `moveMilestone` · `undoMove` |
| What decides the handover (1.0's critical path) and plan against actual (1.0's dropped baseline) | E-73, E-104, E-114 | Built | — | | | `deciderOf`; `milestone-panel.tsx` ("later than first shared") |
| Add, rename, delete a milestone (add after one; delete asks, Undo; followers relinked) | E-77, E-79, E-105, E-106, E-119, E-121, E-159, E-160, E-164 | Built | — | | | `addMilestone` · `renameMilestone` · `deleteMilestone` · `restoreMilestone` |
| The milestone panel (status, When, Push later by, Moves with, Tasks, switches; Save / Cancel that mean it; asks before dropping edits) | E-75, E-93, E-124, E-125, E-126, E-127, E-128, E-129, E-132, E-136, E-137, E-142, E-145, E-149, E-150, E-158 | Built | — | | | `milestone-panel.tsx`; `saveMilestone` · `undoMilestoneSave` |
| Status changes (any of four, one sentence + Undo, Done early) | E-141, E-155, E-195, E-196, E-197 | Built | — | | | `setMilestoneStatus` · `undoMilestoneStatus` |
| Blocked and *Waiting on someone* (the client, a member, a supplier; what for; until) | E-72, E-76, E-133, E-153, E-175, E-176, E-177 | Built | No "Permit / approval" category (say it in *What for*); the client side is the *payments and pauses* line above. | | | `milestone-panel.tsx`; attention `waiting` |
| Reschedule (dates, *Push it later by* 1 day · 3 days · 1 week) | E-170, E-171, E-172, E-173, E-174 | Built | No reason field — 1.0's reason went into comments nobody could see. | | | `milestone-panel.tsx` |
| *Shown to {client}* (one switch, on by default, one meaning) | E-78, E-244 | Built | — | | | `milestone-panel.tsx` |
| Share changes (snapshot the portal reads; list of what changes; note; first share; WhatsApp + the client's bell; a stage taken off) | E-34, E-38, E-224, E-225, E-234, E-235, E-236, E-237, E-242, E-245 | Built | — | | | `shareSchedule`; `share-dialog.tsx`; `components/portal/project/portal-schedule.tsx` |
| What the client sees (pane beside the list; See it as the client) | E-33, E-43, E-44, E-223, E-240 | Built | — | | | `project-schedule.tsx` client pane; `client-access-panel.tsx` |
| The client confirms a finished milestone (Looks good · Something is not right), the studio is told | E-11, E-12, E-15, E-134, E-221, E-222, F-006 | Built | — | | | `answerStage`; bell `stage_confirmed` · `stage_changes`; attention `client_concern` |
| Payments tied to milestones and their money (diamond, next payment, invoice per stage, contract value + VOs, rebalance, variance) | E-36, E-64, E-80, E-122, E-140, E-250, E-251, E-253, E-254, E-255, E-256, E-257, E-258, E-263 | Built | On the Money tab (F-01…F-09), not under the chart. | | | `lib/projects/money.ts`; `components/projects/money/*` |
| Completing a payment milestone makes its invoice ready (1.0's "Mark as Complete" dialog) | E-208, E-209, E-210, E-211, E-213, E-214, E-215 | Built | Built differently (F-04): invoices are drafted with the project and become *Ready to send*; sent from Money. | | | `lib/projects/invoices.ts` |
| Schedule templates (Company › Templates › Schedules: new, edit, rename, duplicate, delete / restore, folders; Save as a template) | E-275, E-276, E-277 | Built | Templates keep length, gap and the confirm ask — not payment % or colour (by design). | | | `app/company/schedule-templates-actions.ts`; `saveScheduleAsTemplate` |
| Reminders for due and late milestones; Needs attention | E-282, E-283, E-285 | Built | Server-side, for every project (1.0 only when an owner opened the page). Lead time fixed at 3 days (1.0: a studio setting, default 7). | | | `lib/notifications/model.ts` `milestone_due` · `milestone_late`; `lib/projects/attention.ts` |
| The schedule on a phone (rows with mini bars; the panel as a sheet; everything the desktop does except drag) | E-286, E-287, E-288, E-289, E-290, E-291, E-292, E-293, E-294, E-295, E-296, E-297, E-298, E-299, E-300, E-301, E-302, E-303, E-304 | Built | — | | | `schedule-phone.tsx` |
| A completed project reads only; handover replaces "Close Project" and the handover lock | E-09, E-10, E-13, E-14, E-16, E-45, E-52, E-91, E-92, E-146, E-147, E-151 | Built | Q-24 (Complete handover, Reopen). | | | `completedBlock` in `lib/projects/handover-model.ts` |
| Progress % | E-205, E-206, E-207 | Built | Counted by milestones done, not weighted by payment share. | | | `progressOf` |
| Rules on the server; one milestone per write; nothing lost to a race | E-51, E-313, E-314, E-315, E-316 | Built | — | | | `app/projects/schedule-actions.ts` (`forProject` · `forMilestone`) |
| A project's task list (the lead's Tasks tab on the project's address: columns, sort, overdue, open a task, Milestone column + filter, reminders, Who sees leads, the rail's Tasks hub) | F-005, F-008, F-009, F-010, F-011, F-012, F-013, F-017, F-018, F-025, F-026, F-028, F-030, F-031, F-032, F-041, F-043, F-052, F-053, F-055, F-056, F-057, F-068, F-069, F-070, F-071, F-072, F-077, F-088, F-089, F-092, F-094 | Built | — | | | `components/leads/tasks/lead-tasks.tsx`; `setTaskMilestone` |
| Add or edit a task (title, due date + time, description, members, tags, files / pictures, milestone; changing the milestone saves) | F-020, F-023, F-036, F-037, F-050, F-051, F-079, F-080, F-082, F-083, F-084, F-090, F-105, F-111, F-118 | Built | — | | | `components/leads/tasks/task-panel.tsx` |
| Select tasks and act on them (Assign · Mark as completed · Save as template · Duplicate · Delete) | F-019, F-038, F-048, F-049, F-086 | Built | — | | | `lead-tasks.tsx` `bulkActions` |
| Delete a task (asks; Undo) | F-046, F-085 | Built | — | | | `components/leads/tasks/delete-dialog.tsx` |
| The Choices board (cards, statuses Draft · Shared · Chosen, price line, empty and loading states, group by room or milestone, pick kept by id) | F-126, F-127, F-128, F-130, F-131, F-133, F-134, F-135, F-143, F-144, F-152, F-153, F-154, F-156, F-159, F-164, F-165, F-170, F-174, F-176 | Built | — | | | `components/projects/choices/project-choices.tsx` |
| Make or edit a choice and its options (room, milestone, needed by; up to 8 options from Materials, the Price book, a render or an upload) | F-132, F-138, F-141, F-142, F-145, F-148, F-155, F-175, F-177 | Built | — | | | `choice-dialog.tsx` · `option-dialog.tsx` |
| Share a choice, take it back; the client and the studio are told | F-136, F-149, F-160, F-171, F-172 | Built | — | | | `shareChoice` · `unshareChoice`; bell `choice_made` |
| A pick's price difference drafts a variation order | F-137, F-151, F-161, F-173, F-178 | Built | — | | | `pickPriceDifference`; `quotes.selection_id` |
| The project's team (Overview card, Assign; the team sees the project) | F-304, F-305, F-306, F-307, F-308, F-309 | Built | Commission splits held (Q-21). | | | `components/projects/project-overview.tsx` Team |
| Not a product feature — 1.0's own motion and styling (pulses, fades, density toggle, chip / tab transitions) | E-05, E-06, E-07, E-46, E-47, E-94, E-95, E-96, E-98, E-148, F-007, F-022, F-042, F-059, F-060, F-061, F-062, F-063, F-157, F-226, F-283 | Not a product feature | 2.0 uses its own design system and motion. | | | — |
| Not a product feature — data, APIs, ids, performance, credits | E-08, E-107, E-191, E-192, E-305, E-306, E-307, E-308, E-309, E-310, E-311, E-312, E-317, E-318, E-319, E-320, E-321, E-322, E-323, E-324, E-328, F-066, F-075, F-076, F-166, F-167, F-168, F-236, F-237, F-263, F-264, F-271 | Not a product feature | — | | | `24-…` §3 (data mapping) |
| Not a product feature — dead code and docs that disagree (comments, extension request, zoom, link-by-drag, lag-day arrows, material-tracking API with no screen, hidden compliance fetch) | E-152, E-329, E-330, E-331, E-332, E-333, E-334, E-335, E-336, E-337, E-338, E-339, E-340, E-341, E-342, F-093, F-169, F-180, F-245, F-269, F-270, F-293 | Not a product feature | — | | | — |
| Not a product feature — things 1.0 never had (print / export of the timeline, filter or group milestones, bulk edit, duplicate) | E-325, E-327 | Not a product feature | Nothing to port; 2.0 lacks the same (2.0 now has zoom, Today, keyboard, Undo, plan vs actual). | | | — |

### What 1.0's three unbuilt sub-modules are (for the report)

- **Floor Plan (Management › Floor Plan, also the client's portal tab).** A shared, marked-up plan — not CAD. The studio uploads
  a plan (image or PDF); several plans, one *Primary* the client always opens on. Both sides draw on it: pen, boxes, arrows, text,
  numbered comment pins, dated site-photo pins, hatched zones (flooring / demolition / tiling), revision clouds, numbered callouts
  and ten electrical / plumbing stamps, on eight trade layers (one *Studio only*, stripped from the client's copy). Set the scale
  once from a known length and *Measure* reads millimetres. Every mark has a thread with photos and resolve / reopen; the studio
  turns a mark into a task or a variation order. Stamps roll up into a **point schedule**, photo pins into a **site diary**. The
  client confirms a layout ("Layout confirmed by … — not a contract-grade signature"). One press exports a two-page PDF for the
  contractor. Refreshes every 8 seconds; email notices both ways. Held by **Q-19**.
- **Plan the Space (3D).** A project header button that opens 1.0's separate **3-D Space Planner**: start from Singapore flat
  templates or draw rooms, or let AI read a floor-plan image or a room photo; place furniture in Dollhouse / Cutaway / Top / Walk
  views; AI auto-arrange, photoreal renders and render tours; elevations, PNG / PDF, and a public 3D share link. In 1.0 a layout
  made from a project is never saved against it, so nothing comes back to the project. Held by **Q-19**.
- **Compliance.** A bundled checklist of 61 Singapore renovation rules (HDB permit, DRC contractor, LEW, PUB plumber, QP for
  hacking, neighbour notice, renovation hours, waterproofing and water test, MCST approvals, BCA / URA / SCDF for landed, WICA and
  liability insurance, defects liability, TOP / CSC …) by property type and stage, with authority, timing, penalty and steps, plus
  sets for four other countries. In 1.0 the checklist is **not mounted** anywhere; what is live is ten "[Compliance] …" tasks made
  with every new project, a dashboard alert card, a chat tool and a Compliance Navigator page that keeps its ticks in the browser.
  Held by **Q-31**. The 61-item data is reusable as task templates when it is picked up.

## Top gaps

1. **Floor-plan mark-up with the client** (Left out, later — Q-19): the biggest loss for a studio that used it — shared plans,
   mark-up, measuring, threads, mark → task / VO, the client's layout sign-off, the contractor PDF. High impact, L.
2. **No outside person on a task** (Missing): subcontractors and suppliers do much of a renovation's work; 2.0 tasks can only go to
   studio members. Medium, M.
3. **The client can only pick a choice, not push back** (Partly): no *Request changes* / *Reject*, so "none of these" has nowhere
   to go but WhatsApp. Medium, S.
4. **A schedule can't be rebuilt or a template applied once it exists** (Missing): a wrong start means deleting milestones one by
   one. Medium, S.
5. **Compliance starter tasks at project creation** (Left out, later — Q-31): 1.0 drops up to ten "[Compliance] …" permit and
   licence tasks on every Singapore project; 2.0 has none, and the data is ready to reuse. Medium, S.
6. **No "In progress" on tasks** (Partly): 1.0's Tasks tab was organised by Not Started · In Progress · Completed. Medium, S
   (a change to the lead Tasks tab too — Vicky's lane).
7. **One predecessor per milestone, no links drawn** (Partly): a stage that waits on two trades can't be said, and the chain is
   invisible on the chart. Low, M.
8. **No receipt of a client's choice** (Missing): nothing printable to keep when a client later disputes a finish. Low, M.
9. **The client's schedule hides pauses and payments** (Partly): a Blocked stage reads "Under way"; no payment due per stage. Low, S.
10. **No milestone description or colour** (Missing): small, but every 1.0 template and generator carried them. Low, S.

## Things the inventory missed

- **The client's to-dos are real code, behind a switch.** `src/app/api/homeowner/projects/[id]/tasks/route.ts` serves tasks
  assigned to the homeowner (read-only — the client cannot tick them), and the portal page renders "Your to-dos" and counts them in
  its action queue only when `features.homeownerTasks` is on, which defaults to **false** (`src/app/my/projects/[projectId]/page.tsx:71`,
  `:355`, `:403-404`, `:449-455`). F-120 calls it "intended"; it is built but off by default.
- **"Milestone approval required" says less than it does.** The Workflow Rules switch reads "Require owner approval before milestone
  tasks are created" (`src/app/(main)/accounts/page.tsx:1644`), yet the same flag also turns a non-owner's *Mark as Complete* into
  *Pending approval* (E-198) — a studio switching it on for tasks also gates completions.
- **The Proactive Alerts settings page** (`src/app/(main)/accounts/page.tsx:2755-2860`: "Enable Proactive Alerts", "Alert Lead
  Time" in days, default 7; "Notify owner on extension request", "Auto-create progress update") drives E-283 and the dead extension
  request (E-333); E records only the effects (the page is in J-229 / M-262). 2.0's `milestone_due` is fixed at three days and can
  only be switched on or off in Settings › Notifications.
- Error toasts in the Gantt's dead paths ("Failed to add comment", "Failed to add reply", "Failed to clear the revision flag", "No
  studio owner found to assign the extension request", "No quote data available to generate tasks") are not in E — dead with their
  features, nothing to port.
- Branch note (from the audit's §1, not this tree): `origin/deployment/qanvast` adds a **Gantt minimap** and a health strip that
  this branch does not have.

## Uncertain

- **Tasks on a completed project.** The Schedule, Money and Choices refuse writes once a project is Completed (`completedBlock`); I
  did not confirm whether the lead's task actions do (F-008).
- **A project won from an uploaded quote file** has no system quote with trades, so *The signed quote* source is greyed; whether
  Create Quote › *Upload a quote* can then feed it was not traced (the *Build from an uploaded quote* line).
- **Floor Plan, 3D and compliance** are summarised from inventory F, whose reader skimmed `canvas.tsx` and `FloorPlanEditor.tsx`; I
  did not open them. Whether the client's portal really shows the full drawing toolbar (F-239) is unverified.
- **1.0's milestone ids vs UUID columns (E-318).** If production matches the migrations, 1.0's homeowner approvals, milestone-task
  links and invoice links failed for milestones made inside the Gantt — some lines above compare 2.0 with 1.0 features that may not
  have worked live.
- **Impact ratings** are judgement from the code, not usage data: how many studios used property-type templates, external
  assignees, In progress tasks, or the floor plan is unknown (Q-32's live walk of 1.0 was never run).
- **One active milestone at a time** (E-168) and **status words** are counted as a deliberate 2.0 change (phases overlap on the
  canvas), not a gap; no call names it explicitly.
