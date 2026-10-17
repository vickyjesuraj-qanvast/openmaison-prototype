# F — 1.0 Projects: tasks, materials, floor plan and compliance

Reader F of twelve. Source: OpenMaison 1.0, `/Users/vicky/Documents/GitHub/qanvast-id-tool`, working tree on branch `integ/security-non-qanvast` @ `620190192`, read only (nothing run, nothing edited). Read in full: the project page's Management frame, Tasks sub-tab, Materials and Floor Plan mounts, header tool buttons and bulk bar (`src/app/(main)/projects/[projectId]/page.tsx` lines 640–930, 1000–1017, 1262–1307, 1345–1387, 1706–1885, 2590–2621, 2880–3268, 4684–4759); `src/components/tasks/*` (5 files); `src/components/projects/milestone-tasks-editor.tsx`, `selection-board.tsx`, `selection-create-dialog.tsx`, `material-catalog-picker.tsx`, `custom-material-upload-dialog.tsx`, `compliance-checklist.tsx`, `project-team-card.tsx`, `workload-view.tsx`, `tool-entry-dialog.tsx`; `src/components/floor-plan-collab/*` (section, plan switcher, filter bar, point schedule, approval banner, site diary, thread in full; `canvas.tsx` skimmed for tools, copy, keys); `src/components/homeowner/selection-board.tsx`; the API routes `api/tasks/**`, `api/projects/plan/tasks`, `api/project-selections/**`, `api/projects/[id]/selections/**`, `api/projects/[id]/materials`, `api/projects/[id]/floor-plan/**` (GET/POST, request, work), `api/projects/rooms/**`, `api/homeowner/projects/[id]/selections/**`, `api/floor-plans/share/[token]`; `src/lib/queries/{tasks,selections,materials,floor-plans}.ts`, `src/lib/upload-task-image.ts`, `src/lib/casetrust-disclosure.ts`, `src/context/app-context.tsx` (task methods), `src/data/sg-checklists.ts` (all 61 items extracted), `src/data/compliance/index.ts`; the planner entry page `src/app/(main)/tools/floor-plan/page.tsx` and the public viewer `src/app/floor-plan/view/[token]/page.tsx` (the 6,875-line `FloorPlanEditor.tsx` only skimmed, as instructed); docs `docs/rules/tasks.md`, `docs/rules/floor-plan.md`, `docs/features/material-catalog/spec.md`, `docs/features/floor-plan-collab/spec.md`, `docs/features/floorplan-3d/spec.md`, `docs/features/sg-compliance-checklists/uat-plan.md`; migrations 138, 139, 143 and table names from 147, 283–287.

**Path shorthands used in citations** (all relative to the 1.0 repo root): **P** = `src/app/(main)/projects/[projectId]/page.tsx` · **TT** = `src/components/tasks/tasks-table.tsx` · **G** = `src/components/projects/gantt-chart.tsx` · **MTE** = `src/components/projects/milestone-tasks-editor.tsx` · **SB** = `src/components/projects/selection-board.tsx` · **SCD** = `src/components/projects/selection-create-dialog.tsx` · **HSB** = `src/components/homeowner/selection-board.tsx` · **FPS** = `src/components/floor-plan-collab/floor-plan-section.tsx` · **CV** = `src/components/floor-plan-collab/canvas.tsx` · **CC** = `src/components/projects/compliance-checklist.tsx` · **AC** = `src/context/app-context.tsx` · **TP** = `src/app/(main)/tools/floor-plan/page.tsx`.

## Bottom line

- **"Management (10)" counts open tasks, not milestones.** The number is every task on the project whose status is not Completed or Cancelled, after the viewer's role filter, so a designer sees only their own count (P:1878, P:1345–1348, AC:1169–1174).
- **The Tasks sub-tab is a plain status-grouped table.** Three cards (Not Started · In Progress · Completed), eight grid columns, sort by head, a Compact / Cozy toggle, a single-status bulk "Move to" bar, and a five-field dialog (title, milestone, assignee, due date, status). No priority, tags, comments, search, description or images here.
- **A task has two different milestone links and the two surfaces disagree.** The Tasks tab writes `related_entity_id`; the milestone's own editor and its count read `linked_milestone_id`. A task given a milestone in the Tasks tab shows the pill but is missing from the milestone's count and list, and changing the milestone on edit is never saved (P:1296, P:1286, G:3296, G:3609).
- **Several task controls do not do what they say.** Status chosen at creation is ignored (always Not Started); "Unassigned" can never be saved; "Delete task" silently cancels with no confirm or undo; success toasts fire before the server answers; "Task approved" shows even when the approver gate refuses.
- **The richer task model lives only in the milestone's "View / Edit Tasks" dialog.** Description, due date, up to five images, three kinds of assignee (studio member, homeowner, a person outside the studio) and AI "Suggest from quote" exist there, not in the Tasks tab. Saving that dialog also resets In Progress tasks to Not Started and revives cancelled ones (read from code, not run).
- **"Vendors / contractors" on a task are free text.** An external assignee is a typed name and optional phone; no vendor record, no notification, shown as "(Ext)". "Request invite" raises a Member Invite task for the owner.
- **Materials = selection cards for the homeowner to approve.** A selection has a room-like category, a title, up to four options (name, vendor, price, image, description, "VO impact") and a status: Draft → Shared → Approved / Change Requested / Rejected. There are no links to quote lines or purchase orders; an approved option with a VO impact auto-drafts a variation order. A built material-lifecycle API (`/api/projects/[id]/materials`) has no screen.
- **Selections have broken paths.** Sharing from the studio never notifies the homeowner; a change-requested or rejected selection cannot be shared again; the "Auto-VO drafted · Review →" link points at parameters the page does not read; a failed save says nothing.
- **Floor Plan is a full mark-up tool, not an image.** Multiple plans with one Primary, eleven mark types, trade layers, comment threads with photos, mark → task, mark → variation order, homeowner sign-off, PDF export, 8-second polling.
- **"Plan the Space (3D)" leaves the project.** It opens a small dialog, then the separate 3-D Space Planner at `/tools/floor-plan`. A layout saved there is never given the project's id, so the dialog's "existing layouts on this project" list stays empty and nothing comes back to the project. No credits are charged anywhere in this tool on this branch.
- **Compliance has no project screen any more.** The 598-line checklist component is mounted nowhere. What remains: up to ten "[Compliance] …" tasks auto-created with a project (always from the Singapore list, whatever the studio's region), a dashboard alert card whose counts can never go down and whose link opens a blank project tab, and a compliance chat tool. There are no evidence uploads anywhere.
- **None of the three sub-tabs checks the project lock or the edit permission, and the task table has no narrow-screen layout.**

---

## 0. The Management frame these sub-tabs sit in

- **F-001** The Management tab holds four sub-tabs in this order: "Milestones", "Tasks", "Materials", "Floor Plan". They render as an underline tab strip inside a `mb-4` block with a bottom border (P:2607–2621).
- **F-002** Tab and sub-tab live in the URL as `?tab=management&sub=tasks|materials|floor-plan`; the default sub-tab (`milestones`) and the default tab (`details`) are omitted so the address stays clean. The page writes the address with `router.replace(…, { scroll: false })`, keeping other query parameters (P:881–885, P:894–908).
- **F-003** Old links are mapped: `tab=timeline` and `tab=tasks` both become `management` (P:649). The sub-tab still defaults to Milestones, so an old `?tab=tasks` link opens Milestones, not Tasks (P:881–885).
- **F-004** **[inferred]** Any other `tab` value is accepted as the active tab without a check (P:850). Tab bodies exist only for `details`, `management`, `finance`, `files-docs`, `activity` (and `render`), so `?tab=planning` or `?tab=compliance` shows the header with no tab lit and nothing under it. Live callers still send `tab=planning`: the rail Tasks page (`src/app/(main)/tasks/page.tsx:317`, `:456`) and the dashboard's Compliance Alerts (`src/app/(main)/dashboard/page.tsx:112`).
- **F-005** The Management tab's label is `Management (N)` where N = the project's tasks with status other than Completed and Cancelled; the bracket is dropped at zero (P:1878). The project's tasks are "all tasks in the app context with this `projectId`, minus Cancelled" (P:1345–1348), and the app context already narrows tasks to "assigned to me" for a member tagged `id` without `admin` or `owner` (AC:1169–1182). The count therefore includes approval tasks and auto-created compliance tasks, and differs by viewer.
- **F-006** A "homeowner response" banner is mounted above the strip on every Management sub-tab, in a `mb-3` wrapper; it renders nothing when there is nothing to show (P:2596–2600). (Owned by the milestones reader.)
- **F-007** The strip (`SlidingTabList variant="underline"`): buttons `px-4 py-2.5 text-[14px] font-medium`, active text in the primary colour, a 2px primary underline that slides with `transition-[left,width] duration-300 ease-in-out`, labels `transition-colors duration-200`. When the strip overflows it scrolls sideways with hidden scrollbars, a 28px fade mask on the edge that has more, and smooth auto-scroll to the active tab (`src/components/ui/sliding-tabs.tsx:76–130`).
- **F-008** The Tasks, Materials and Floor Plan panes never read the project's handover lock (`projectIsLocked`) or the edit permission (`canEditProject`) that the Overview and Milestones use (P:811–815 define them; P:2938–3268 never reference them). Any signed-in studio member who can open the project can add, edit and remove tasks, selections and plans on a locked project.

---

## 1. Tasks sub-tab

### 1.1 What it is, entry points

- **F-009** A list of the project's tasks grouped into three status cards, rendered with the "shared" table pieces `TasksTableHeader` and `TaskTableRow` with the Project column off (P:2985–3170, P:3119–3151).
- **F-010** Reached by Management → Tasks, or `?tab=management&sub=tasks` (P:881–885). Task notifications do not deep-link here: the `task.assigned` notification and the due reminder both point at `/tasks` (`src/app/api/tasks/route.ts:185`, `:224`, `:236`).
- **F-011** What appears here is every task with this `project_id`, whatever made it: (a) this tab's Add Task dialog; (b) a milestone's "View / Edit Tasks" dialog (G:3603–3615); (c) the milestone's AI "generate tasks" action (G:1819–1831); (d) up to ten "[Compliance] …" tasks made when the project is created (`src/components/projects/project-create-drawer.tsx:570–601`); (e) "Make a task" on a floor-plan mark (`src/app/api/projects/[id]/floor-plan/annotations/[annotationId]/work/route.ts:71–88`); (f) approval tasks that carry the project, e.g. "Approve tasks for: {milestone} ({project})" (P:2899–2908) and "Invite {name} to the studio" (G:3625–3632); (g) a task created on the rail Tasks page with "Link to Project" (`src/components/tasks/task-create-dialog.tsx:236–246`).
- **F-012** Relation to the rail's Tasks page: one table (`tasks`), one fetch (`GET /api/tasks/records` returns every task of the studio, newest first) and one cache key (`["tasks", studioId]`); the project tab filters that list in the browser (`src/lib/queries/tasks.ts:25–34`, P:1345–1348). The rail page groups by project and links each group to `/projects/{id}` (`src/app/(main)/tasks/page.tsx:180`, `:682–696`).
- **F-013** The file header of the table says it is shared by `/tasks` and the project page (TT:3–12), and the project page says its sort and density "mirror" `/tasks` (P:912–913). Neither is true today: `/tasks` renders its own `TaskRow` and has no density control (`src/app/(main)/tasks/page.tsx:207`); only the project page imports the table.

### 1.2 Layout

- **F-014** Pane wrapper `mt-1`. Toolbar row: `flex items-center gap-2 mb-5` — filter chips on the left in a `flex-1` sideways scroller with hidden scrollbar, then the density toggle (`hidden md:flex`, `h-9`, radius 4), then the "Add Task" button (`h-9`) (P:2986–3049).
- **F-015** Below, a `space-y-3` stack of three cards, one per status, each `rounded-2xl`, `shadow-sm`, `border-surface-variant`, `overflow-hidden` (P:3055, P:3094).
- **F-016** Each card: a full-width header button (`px-4 py-3`, bottom border), then — when open and not empty — a column-head row and the task rows, then a footer strip (`border-t`, `px-4 py-2.5`) holding the inline "Add task" link (P:3096–3164).
- **F-017** The table is a CSS grid, not a `<table>`: columns `32px 32px minmax(220px,1fr) 110px 140px 120px 100px 160px` with `gap-3` and `px-5` side padding (TT:113–117, TT:166–168, TT:205). Left to right: select box · status circle · Title · Type · Milestone · Owner · Due · Actions (TT:170–178). A Project column (140px) exists for other pages and is switched off here.
- **F-018** Row height comes from padding only: `py-2` in Compact, `py-3` in Cozy (TT:199). Rows are separated by a `border-b` in the page-background colour, none after the last (TT:205).
- **F-019** The bulk bar floats over the page: `fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50`, a `rounded-2xl` white pill with border and `shadow-xl`, `px-2 py-2`, items `gap-1` (P:4729).
- **F-020** The add/edit dialog is a centred modal `max-w-md` (448px), body `space-y-4`, fields `h-9`, footer right-aligned (P:3173–3266).

### 1.3 UI elements

- **F-021** Filter chips, verbatim: "All", "Not Started", "In Progress", "Completed". Pill `px-3.5 py-1.5 rounded-full`; active = solid primary with white text and `shadow-sm`; inactive = white, faint border, hover tints primary. Each non-All chip has a 6px dot (Not Started: primary ring; In Progress: yellow ring; Completed: solid green; white ring when active). A small count follows the label and is hidden at zero (P:2990–3021).
- **F-022** Density toggle: two text buttons "Compact" and "Cozy" (10px uppercase), tooltips "Compact rows" and "Comfortable rows", divided by a hairline; the active one is tinted primary (P:3025–3041).
- **F-023** Primary button "Add Task" with a 12px plus icon (P:3042–3048).
- **F-024** Group header: chevron (13px), an 8px dot, the label "Not Started" / "In Progress" / "Completed" (`text-xs font-semibold`), and a count pill tinted primary / yellow / green (P:3056–3059, P:3105–3108). The dot here is a primary ring, a **solid** yellow, a solid green (P:3106).
- **F-025** Column heads (10px uppercase): "Title", "Type", "Milestone", "Owner", "Due" are buttons with a sort glyph (up/down chevron when active, a dimmed two-way arrow otherwise); "Actions" is a right-aligned label. The head row repeats inside every non-empty group (TT:121–181, P:3119–3124).
- **F-026** Select box: 14px square, `aria-label` "Select" / "Deselect"; checked = solid primary with a white tick (TT:215–223).
- **F-027** Status circle (display only, not a button): Not Started = primary ring; In Progress = yellow ring; Completed = solid green with a white tick; Cancelled = grey ring (TT:226–231).
- **F-028** Title: one line, truncated, `text-sm`; struck through and greyed when the task is Completed or Cancelled. A small document icon (`aria-label` "Has description") follows when the task has a description, and an image icon with a count when it has images (TT:234–245). Neither can be opened from this tab.
- **F-029** Type pill (10px, rounded, bordered). Labels: "Lead Follow-Up", "Quote Approval", "Timeline Approval", "Progress Review", "Milestone Approval", "Stage Approval", "VO Approval", "Expense Approval", "PO Review", "Commission Approval", "Invoice Review", "Project Closure", "Member Invite", and "General" for everything else (TT:56–73). Tones: primary tint (Lead Follow-Up, Timeline, Stage), yellow (Quote, Milestone, VO, PO, Commission), green (Progress Review, Project Closure), red (Expense), blue (Invoice Review), grey (General, Member Invite) (TT:75–91).
- **F-030** Milestone: a primary-tinted pill with the milestone's name, or a grey "—" (TT:253–257). The name is looked up from the project's timeline by `linkedMilestoneId`, falling back to `relatedEntityId` (P:3063–3064, P:3129).
- **F-031** Owner: a 16px circle with the first letter (one of four tints chosen by a hash of the name) and the name; for a person outside the studio a grey circle, the name and "(Ext)"; otherwise the word "Unassigned" (TT:93–102, TT:266–283). A homeowner-assigned task has no branch here and reads "Unassigned".
- **F-032** Due: the stored date string as is (`YYYY-MM-DD`), red and medium weight when it is before today and the task is open; "—" when empty. No time is shown (TT:104–107, TT:195, TT:286–288).
- **F-033** Actions, ordinary task: a 28px tick button (tooltip "Mark complete", green) or, on a completed task, an ✕ (tooltip "Revert"); then a ⋯ button that is invisible until the row is hovered (TT:335–354).
- **F-034** The ⋯ menu (176px): "Edit task" · "Move to" ▸ a sub-menu listing the two statuses the task is not in ("Not Started", "In Progress", "Completed", each with its dot) · a rule · "Delete task" in red (TT:355–396).
- **F-035** Actions, task awaiting approval (type in the approval list, `approvalStatus = pending`, still open): "Approve" (solid green) and "Reject" (red outline). Reject swaps in a 120px input with placeholder "Reason", a red tick (tooltip "Confirm reject") and an ✕ (tooltip "Cancel") (TT:50–54, TT:196, TT:293–333).
- **F-036** Card footer link: "Add task" with a plus, grey, turning primary on hover (P:3156–3164).
- **F-037** Add / Edit dialog, verbatim. Title "Add Task" or "Edit Task". Fields: "Task title *" (textarea, placeholder "e.g. Lay 3in1 screed with 30×60cm floor tiles", autofocus); "Milestone (optional)" (select, placeholder "Not linked to a milestone", first option "No milestone", then the project's milestones); "Assign to" (select, placeholder "Select team member", first option "Unassigned", then every studio member that has a user id); "Due date" (native date input); "Status" (select: "Not Started", "In Progress", "Completed"). Footer: "Cancel" and "Create Task" or "Save Changes", with a spinner while saving (P:3173–3266).
- **F-038** Bulk bar, verbatim: "{n} selected" · "Move to" (10px, shown in capitals) · one button per status not present in the selection ("Not Started", "In Progress", "Completed", each with its dot) · a hairline · an ✕ with tooltip "Deselect all" (P:4698–4757).

### 1.4 Interactions

- **F-039** Clicking a chip shows only that status card (or all three for "All"); counts on chips do not change (P:3060–3062, P:2996–2998).
- **F-040** Clicking a group header collapses or opens that card; the collapsed set is in component state and is lost on reload (P:873, P:3098–3103).
- **F-041** Clicking a column head sorts every group by that column; clicking the active head flips the direction. Default is Due ascending, undated tasks last. Text columns use a case-insensitive, number-aware comparison; Owner sorts by member name, else external name (P:914–915, P:923–930, P:3068–3090).
- **F-042** Density is remembered per browser in `localStorage` key `tasks:density`, default Compact (P:916–922).
- **F-043** Clicking anywhere on a row (outside its buttons) opens the Edit Task dialog pre-filled (TT:203, P:3132–3135, P:1268–1272).
- **F-044** The tick sets the task to Completed and toasts "Marked complete"; the ✕ on a completed task sets Not Started and toasts "Moved to Not Started" (TT:338, P:3137–3140).
- **F-045** "Move to" sets the chosen status and toasts "Moved to Not Started" / "Moved to In Progress" / "Marked complete" (P:3137–3140).
- **F-046** "Delete task" sets the status to Cancelled with no confirmation and toasts "Task deleted"; the row disappears because cancelled tasks are filtered out (P:3149, AC:714–716, P:1346).
- **F-047** "Approve" calls the app-level approve and toasts "Task approved"; confirming a reject (reason required, trimmed) calls reject and toasts "Task rejected" (P:3143–3144, TT:304).
- **F-048** Ticking a select box starts a selection. While one is active, rows in the other status cards drop to 40% opacity and stop taking clicks, so a selection is always within one status (TT:198, TT:210, P:1381–1387). There is no select-all.
- **F-049** A bulk button fires one status update per selected task, clears the selection and toasts `Moved {n} task(s) to {status}` (P:1011–1017).
- **F-050** Saving a new task calls the create endpoint with type "General", the chosen assignee (falling back to the signed-in user), the due date if any, the project, and the chosen milestone as `relatedEntityId`; toast "Task created" (P:1288–1298). The dialog's default assignee is the first member in the studio list (P:1264).
- **F-051** Saving an edit sends title, assignee (only when one is chosen), due date (or null) and status; toast "Task updated" (P:1278–1287).
- **F-052** There is no drag, no inline cell editing, no keyboard shortcut, no undo. Rows are plain `div`s with a click handler, so they are not reachable by Tab; only the inner buttons are (TT:201–213).
- **F-053** Nothing is optimistic: the list changes when the tasks query is refetched after a successful write (`src/lib/queries/tasks.ts:185–187`), while the toasts for status changes, delete, approve and bulk move are shown immediately, before any answer (P:3137–3149, P:1011–1016).

### 1.5 States

- **F-054** Empty group: "No not started tasks", "No in progress tasks", "No completed tasks" (the label lower-cased), centred, `py-5`, still followed by the "Add task" footer (P:3113–3116). With no tasks at all the three empty cards are the whole screen; there is no first-run message.
- **F-055** Loading: none. The tab reads `tasks` from the app context and does not look at `tasksLoading`, so while tasks load it shows the three "No … tasks" cards **[inferred]** (P:651, P:1345).
- **F-056** Errors: a failed dialog save toasts "Failed to save task" and keeps the dialog open (P:1301–1303). Failed status changes, deletes and bulk moves surface nothing (plain `mutate` with no error handler).
- **F-057** Disabled: the dialog's primary button is disabled while the title is blank or a save is running (P:3258). Bulk buttons are never disabled.
- **F-058** Permission: no control in this tab is hidden or disabled by role. The only gate is inside approve/reject (F-078).

### 1.6 Motion

- **F-059** Chips: `transition-[color,background-color,border-color,box-shadow,transform] duration-200`, and inactive chips shrink to 95% while pressed (`active:scale-95`) (P:3004–3007). Density buttons: `transition-colors` (P:3029).
- **F-060** Group header: background `transition-colors duration-150` on hover; the chevron rotates −90° when collapsed with `transition-transform duration-200`. The rows themselves appear and disappear with no height animation (P:3097, P:3105, P:3111).
- **F-061** Rows: `transition-colors` between rest, hover (10% primary tint) and selected (20% primary tint plus a 3px inset primary bar on the left) (TT:205–209). The ⋯ button fades in on row hover with `transition-[opacity,color,background-color] duration-150` (TT:351).
- **F-062** Bulk bar: enters with `animate-in fade-in slide-in-from-bottom-2 duration-200` (the `tw-animate-css` utilities imported at `src/app/globals.css:2`); it has no exit animation, it unmounts. Hovering the "Completed" option cross-fades its green dot into a tick, `transition-opacity duration-150` (P:4722–4729).
- **F-063** Dialog: overlay fades, content fades and zooms from 95%, `duration-200` (`src/components/ui/dialog.tsx:42`, `:64`). Menus: fade + zoom 95% + a 2-step slide from the side they open on (`src/components/ui/dropdown-menu.tsx:45`). Spinners use `animate-spin`. Everything is cut to 0.01ms under `prefers-reduced-motion` (`src/app/globals.css:1331–1338`).

### 1.7 Rules and logic

- **F-064** Statuses: `NotStarted`, `InProgress`, `Completed`, `Cancelled` (`src/types/app.ts:1648`). Any status can move to any other from the menu; Cancelled is reachable only through "Delete task" and is hidden here.
- **F-065** Types: fifteen values — LeadFollowUp, General, QuoteApproval, TimelineApproval, ProgressReview, MilestoneApproval, StageApproval, VOApproval, ExpenseApproval, POAccountsReview, CommissionApproval, PriceBookItemApproval, InvoiceReview, ProjectClosure, MemberInvite (`src/types/app.ts:1649`). Tasks made in this tab are always General (P:1291).
- **F-066** There is no priority field anywhere in the task model, UI or API (`src/types/app.ts:1640–1675`).
- **F-067** A task has exactly three possible kinds of assignee: a studio user (`assignee_user_id`), a named person outside the studio (`external_assignee_name` + optional phone), or the project's homeowner (`assignee_homeowner_id`). The database only requires that at least one is set (`scripts/migrations/139_tasks_homeowner_assignee.sql`, constraint `tasks_has_assignee`). General and Lead Follow-Up tasks also keep a `task_assignees` row, and the first of those wins as the shown assignee (`src/lib/transformers.ts:803–829`).
- **F-068** Create, on the server: title and type required; one of the three assignees required; a studio assignee must be a member of the caller's studio, else 400 "Assignee is not a member of this studio"; status is always written as `NotStarted` (`src/app/api/tasks/route.ts:76–124`).
- **F-069** Notifications on create (studio assignee only, not for demo studios, not when `notify:false`): `task.assigned` to the assignee and the assigner, link `/tasks`; and, when a due date is set, a "Task due in 30 minutes" reminder queued for 30 minutes before the due moment, taking 09:00 when no time is set, on the channels the studio allows under "tasks_escalations" (`src/app/api/tasks/route.ts:163–277`).
- **F-070** Update, on the server: only status, assignee user, due date, due time, title, description, images and homeowner assignee can change; milestone link, external assignee and type cannot (`src/app/api/tasks/records/[id]/route.ts:22–63`). Moving to Completed or Cancelled deletes the queued reminders (`:86–91`).
- **F-071** Overdue = due date string earlier than today's UTC date, and the task is not Completed or Cancelled (TT:104–107, TT:194–195). Overdue only changes the date's colour; there is no overdue count or filter in this tab.
- **F-072** A member tagged `id` only (no `admin`, no `owner`) sees just the tasks whose shown assignee is themselves, everywhere, including here (AC:1169–1174, `src/lib/access-control.ts:47–50`). Tasks given to an outside person or the homeowner have an empty assignee id, so that member never sees them, even ones they created.
- **F-073** Approvals: approve marks the task Completed with `approval_status = approved`; reject marks it Completed with `rejected` and stores the reason (`src/app/api/tasks/records/[id]/approve/route.ts:79–87`, `…/reject/route.ts:38–46`). Follow-on effects depend on type (timeline, stage, progress update, quote…) and belong to other readers (AC:321–522).
- **F-074** Who may approve is decided in the browser only: owners always; other members only if listed as approver for that workflow; admins for the types with no approver list (AC:286–302). A refusal only writes to the console (AC:306–308). The approve and reject routes check nothing beyond a valid session (`…/approve/route.ts:71–91`).

### 1.8 Data

- **F-075** Table `tasks`: `id`, `studio_id`, `project_id`, `lead_id`, `title`, `status`, `type`, `assignee_user_id`, `assignee_name` (legacy cache), `planned_date`, `planned_time`, `approval_status`, `approval_comment`, `related_entity_id`, `linked_milestone_id`, `description`, `supporting_images` (JSON list of `{url,name,uploadedAt}`), `external_assignee_name`, `external_assignee_phone`, `assignee_homeowner_id`, `created_at` (`src/app/api/tasks/route.ts:103–122`, `docs/rules/tasks.md:67–72`). Junction `task_assignees(task_id, profile_id, added_at)`.
- **F-076** Routes used by this tab: `GET /api/tasks/records` (list, names resolved, image URLs signed); `POST /api/tasks` (create + notify); `PATCH /api/tasks/records/[id]` (update); `POST /api/tasks/records/[id]/approve` and `/reject` (`src/lib/queries/tasks.ts`). Also existing: `POST /api/tasks/records` (bulk insert, no notifications), `POST /api/tasks/records/[id]/assignees`, `POST /api/tasks/upload-image`.

### 1.9 Responsive

- **F-077** The density toggle is hidden below `md`; everything else is the same at every width (P:3025). The grid needs about 998px for its columns and gaps plus 40px padding, the card clips overflow and there is no sideways scroller, so **[inferred]** on a phone, a tablet or a 1280px laptop with the 220px sidebar open (1280 − 220 − 64px page padding = 996px, P:270) the Due and Actions columns are cut off. The bulk bar sits at `bottom-20` below `lg` to clear the mobile nav (P:4729).

### 1.10 Problems

- **F-078** "Task approved" is toasted even when the approver gate refuses and nothing happens (P:3143 vs AC:304–309); and the server would let any member approve (F-074).
- **F-079** Two milestone links. This tab stores the milestone in `related_entity_id` (P:1296); the milestone's editor, its "n tasks" count and its list use `linked_milestone_id` (G:3296, G:3552, G:3609). A task linked here shows the pill (through the fallback at P:3129) but is not counted or listed on the milestone. The reverse also fails: editing a milestone-made task here shows "No milestone" because the dialog reads `relatedEntityId` only (P:1270).
- **F-080** Changing the milestone on edit is dropped; the code says so: "Update milestone link requires a separate relatedEntityId field — handled via addTask pattern for now" (P:1286), and the update route cannot change it (F-070).
- **F-081** The Status field in the Add dialog, and the per-card "Add task" link that pre-sets it, have no effect: the create call sends no status and the server writes Not Started (P:1264, P:1289–1297, `src/app/api/tasks/route.ts:107`). A task added under "Completed" lands in "Not Started".
- **F-082** "Unassigned" cannot be saved: on create it becomes the signed-in user (P:1292); on edit it is not sent (P:1282). The default assignee is whoever is first in the studio's member list (P:1264), who then gets the assignment notification.
- **F-083** The assignee list is every studio member with a user id, not the project's team (P:3218); a task can go to someone who cannot see the project.
- **F-084** Editing a task assigned to an outside person or the homeowner shows "Unassigned". Picking a member sets the user but leaves the external name in place (the update route never clears it), and the Owner cell shows the external name first, so the row still reads as external **[inferred]** (P:1270, `src/app/api/tasks/records/[id]/route.ts:47`, TT:267).
- **F-085** "Delete task" is immediate, irreversible from this tab, and is really a cancel; the word "Cancelled" never appears here and there is no way to see or restore cancelled tasks (P:3149, P:1346).
- **F-086** The bulk bar is tied to the Management tab, not the Tasks sub-tab: with a selection made, switching to Milestones, Materials or Floor Plan leaves "{n} selected · Move to" floating over them (P:4698).
- **F-087** The In Progress dot is drawn three ways: a yellow ring on the chip and on the row (P:2993, TT:228), solid yellow on the group header and in the row menu (P:3106, TT:374).
- **F-088** The column heads repeat in each card but one click sorts all cards; a card with no tasks has no heads. The sort key `project` has no branch here and falls through to Due (P:3072–3087).
- **F-089** The ⋯ menu only appears on hover, so on a touch screen Move to and Delete cannot be reached; row tap still opens Edit (TT:351).
- **F-090** Description and images show as icons but cannot be read or edited from this tab's dialog; they are only editable in the milestone dialog (TT:238–244, P:3180–3250).
- **F-091** Up to ten undated "[Compliance] …" tasks arrive with every new project and all count in "Management (N)" (`src/components/projects/project-create-drawer.tsx:584–598`).
- **F-092** Wording drift: column "Owner" vs field "Assign to"; button "Cozy" vs tooltip "Comfortable rows"; "Add Task" (button, dialog) vs "Add task" (footer link); the code calls the modal a "drawer". Dates are raw ISO strings.
- **F-093** `docs/rules/tasks.md` is out of date: it lists six types and no milestone, description, image or external-assignee fields (`docs/rules/tasks.md:26–37`).
- **F-094** The other two dialogs in `src/components/tasks/` are used only by the rail Tasks page, with their own faults: the edit dialog's "Notes" box (placeholder "Optional task notes...") is never saved or loaded (`src/components/tasks/task-detail-dialog.tsx:131`, `:148`, `:165–182`); it labels InvoiceReview "Invoice Approval" while the table says "Invoice Review" (`:99` vs TT:68); the create dialog requires a due date ("Due date is required") while this tab does not, and offers approval types such as "Quote Approval" as manual choices (`src/components/tasks/task-create-dialog.tsx:49–57`, `:107`).

---

## 2. The milestone's task dialog — description, images, outside people, AI suggestions

(The Gantt belongs to another reader. This section records only how tasks relate to milestones, and the components named in my brief.)

### 2.1 What it is, entry points

- **F-095** A modal titled "View / Edit Tasks for {milestone name}" with a checklist icon, opened from the milestone's action menu ("tasks" action) on the Milestones sub-tab (MTE:266–273, G:3543–3547). The menu shows the milestone's task count as total and done, counted from `tasks` rows whose `linked_milestone_id` is that milestone, cancelled excluded (G:3295–3303).
- **F-096** It is a batch editor: nothing is written until "Save tasks"; then removed rows are cancelled, changed rows updated and new rows created (G:3556–3637).

### 2.2 Layout

- **F-097** `max-w-xl` modal, at most `100dvh − 2rem` tall, body scrolls. Top: a summary line. Then the task list (`max-h-[420px]`, own scroll, rows `space-y-1.5`). Then, under a rule, the add block: an "Assign to" row, an input row, an "Advanced" expander. Then the AI button. Footer: Cancel / Save tasks (MTE:267–573).

### 2.3 UI elements

- **F-098** Summary line: "**{n}** task(s)" · "**{n}** done" · and, only when any exist, a red "**{n}** overdue" with a warning triangle (MTE:277–294).
- **F-099** Each row: a checkbox (done), the title as a borderless inline input, then — when collapsed, from `sm` up — the assignee's name (max 100px) and the due date (red when overdue), a chevron (tooltips "Show advanced" / "Hide advanced") and a bin that appears on hover (always visible on touch) (MTE:307–348).
- **F-100** Expanded row panel: "Assign to" (select, placeholder "Pick an assignee"), "Due date" (date input), "Description" (textarea, placeholder "Notes, context, links…"), "Supporting images" (MTE:353–441).
- **F-101** Assignee options, in order: each studio member (the owner suffixed " (Owner)"); "Homeowner: {name}" in primary colour when the project has a linked homeowner; "{name} (External)" when one was entered; and "+ Add person not in your studio" (MTE:392–411, MTE:471–492).
- **F-102** Add block: label "Assign to" + the same select; an input with placeholder "Add a task and press Enter" and, once text is typed, an "Add" button with a tick; a text link "Advanced" opening Due date / Description / Supporting images for the next task (MTE:450–548).
- **F-103** AI button "Suggest from quote" (sparkle icon), reading "Reading quote…" with a spinner while running. Without quote lines the button is replaced by the italic note "Attach a quote to the project to enable AI task suggestions." (MTE:551–566).
- **F-104** Footer: "Cancel" (ghost) and "Save tasks", reading "Saving…" while saving (MTE:568–573). Empty list copy: "No tasks yet. Add one below." (MTE:297–301).
- **F-105** Images field: 64px square thumbnails with a hover ✕ (tooltip "Remove image"); a button "Add images (5 left)" / "Add image (n left)" / "Uploading…" / "Image limit reached" (`src/components/tasks/task-images-field.tsx:62–116`).
- **F-106** Outside-person dialog, verbatim. Title "Add a person not in your studio"; sub-line "Track work for a vendor, freelancer, or contact who isn't a studio member yet."; "Name *" (placeholder "e.g. Mr. Tan (Carpenter)"); "Phone (optional)" (the app's phone control with dial code); a yellow note "This person isn't in your studio. They won't receive notifications. To invite them, choose **Request invite** below — the studio owner will get a task to bring them in, with this name and phone pre-filled."; buttons "Cancel", "Just add", "Request invite" (`src/components/tasks/external-assignee-dialog.tsx:62–132`).

### 2.4 Interactions

- **F-107** Enter in the add input (or "Add") appends a draft row with the current assignee and any Advanced values, then clears title and Advanced values; the assignee and the open Advanced panel stay for the next row (MTE:196–239, MTE:500).
- **F-108** Choosing "+ Add person not in your studio" opens the outside-person dialog over this one; "Just add" attaches the name and phone to the row; "Request invite" does the same and flags the row (MTE:365–368, MTE:577–592).
- **F-109** "Suggest from quote" posts the milestone (name, trigger, description, position, neighbours), project type, property type, the titles already in the list and the quote lines to `POST /api/projects/plan/tasks`, then appends the returned titles that are not already present (case-insensitive) as unticked rows for the current assignee (MTE:125–194).
- **F-110** Toasts from AI: "{n} suggestion(s) added — review and edit before saving."; "AI didn't return any suggestions for this milestone."; "All AI suggestions are already in your list."; on failure "Couldn't fetch AI suggestions. Try again or add tasks manually." (MTE:175–190).
- **F-111** Picking images uploads them at once (not on save): each is shrunk to at most 1920px wide in the browser and posted to `/api/tasks/upload-image`; errors toast "Max 5 images per task", "Only image files are allowed", "Image too large even after compression (max 5MB)" or "Image upload failed" (`src/lib/upload-task-image.ts:35–59`, `src/components/tasks/task-images-field.tsx:28–55`).
- **F-112** Save, per row: an existing row is patched only for what changed (title, done ↔ not done, assignee, due date, description, images); a new row is created as a General task on this project with `linkedMilestoneId` set and a due date of the row's date, else the milestone's end date, else today (G:3569–3615).
- **F-113** A new row flagged "Request invite" also creates a Member Invite task for the studio owner: title "Invite {name} to the studio", due today, description "Requested by a teammate while assigning a milestone task.\n\nName: {name}\nPhone: {phone or "(not provided)"}" (G:3622–3634).
- **F-114** A second AI path exists on the milestone (bulk "generate tasks"): if the milestone already has tasks it asks through the browser's own confirm box "This milestone already has {n} tasks. Regenerating will replace them. Continue?", cancels them, then inserts the AI titles suffixed " — {milestone name}", assigned to the current user, due on the milestone's end date; toast "Generated {n} tasks for {milestone}" (G:1764–1840). For non-owners with milestone approval on, it also raises "Approve tasks for: {milestone} ({project})" for the owner and toasts "Tasks for "{milestone}" submitted for approval" (P:2881–2911).

### 2.5 States, motion

- **F-115** States: empty list copy (F-104); AI button disabled while running; save button disabled while saving; a failed save leaves the dialog open with no message (MTE:250–258). Motion: the standard dialog fade/zoom; the row bin fades in on hover; no list animation.

### 2.6 Rules and logic

- **F-116** AI suggestions: model `google/gemini-2.5-flash` through OpenRouter, 5–8 tasks, each name under 80 characters, at most 8 returned, 45-second timeout. The prompt carries the region's compliance reminders and the first 20 relevant quote lines (`src/app/api/projects/plan/tasks/route.ts:18`, `:239–289`, `:340–378`). No credit or quota is charged by this route.
- **F-117** If the AI call fails, times out, or there is no API key, the route answers 200 with canned tasks: a fixed list for four milestone names, otherwise "Review scope for {m}", "Procure materials for {m}", "Execute main works — {m}", "Quality check — {m}", "Clean up after {m}". The user is not told these are not AI (`…/plan/tasks/route.ts:67–105`, `:316–322`, `:363–374`).
- **F-118** Images: JPEG, PNG, WebP or GIF, 5 MB each, 5 per task, stored in the private bucket `task-attachments` under `{studioId}/{uuid}.{ext}`; the list endpoint re-signs each URL on every read (`src/app/api/tasks/upload-image/route.ts:13–67`, `src/app/api/tasks/records/route.ts:99–120`).
- **F-119** Outside people: stored as name and phone on the task only. No vendor record is created or linked, no notification is sent, and the person cannot see the task (`src/app/api/tasks/route.ts:118–119`, `:163–180`).
- **F-120** Homeowner assignee: stored as `assignee_homeowner_id`; intended to surface in the homeowner portal's "Your to-dos" card (MTE:37–39, `src/types/app.ts:1659–1662`). No studio notification is sent for it.

### 2.7 Problems

- **F-121** Saving this dialog demotes In Progress tasks. A row is either done or not; on save every not-done row whose stored status is not `NotStarted` is rewritten to `NotStarted`, so a task moved to In Progress in the Tasks tab goes back to Not Started the next time anyone saves the milestone's dialog (MTE:90, G:3570, G:3579). (Read from code, not run.)
- **F-122** Saving it also revives deleted tasks. The dialog is fed every task linked to the milestone including Cancelled ones (G:3552, where the count at G:3296 excludes them), shows them as open rows, and on save rewrites them from Cancelled to Not Started (G:3579). (Read from code, not run.)
- **F-123** Removing a row and saving cancels the task with no confirmation (G:3561–3564).
- **F-124** New rows are written one request each with no await and no error handling; a failure leaves a partly saved list and the dialog closed (G:3596, G:3603).
- **F-125** For a member who only sees their own tasks, the dialog lists only their rows, so the milestone's "n tasks" and this list differ by viewer (AC:1169–1174, G:361).

---

## 3. Materials sub-tab (selections)

### 3.1 What it is, entry points

- **F-126** Management → Materials mounts one component, the studio's selection board, with the project id (P:2938–2942). A selection is a question put to the homeowner — e.g. "Backsplash Tile" for the Kitchen — with up to four options to choose from.
- **F-127** Reached by the strip or `?tab=management&sub=materials`. The studio's notification for a homeowner's answer links to `/projects/{id}?tab=management`, which opens Milestones, not Materials (`src/app/api/homeowner/projects/[id]/selections/[selectionId]/respond/route.ts:146`).
- **F-128** The homeowner sees shared selections in the portal at `/my/projects/{id}`, Design → Selections (`src/app/my/projects/[projectId]/page.tsx:293`).
- **F-129** A "Selection Receipts" strip in Files & Docs lists up to twelve answered selections as cards that download a PDF receipt; caption "PDF generated on download" (P:285–354).

### 3.2 Layout

- **F-130** Head row (`mb-4`): a layers icon, the heading "Selections", the count in brackets, and on the right the "New Selection" button — the button is hidden while there are no selections (SB:93–116).
- **F-131** Body: a card grid, one column, two from `sm`, three from `lg`, `gap-4` (SB:149). Cards `rounded-2xl`, `p-4`, a `gap-3` column (SB:218). Order: newest first; there is no sort, filter, search or grouping (`src/app/api/project-selections/records/route.ts:64`).
- **F-132** Create/edit dialog: `max-w-2xl`, `max-h-[85vh]`, scrolls as one; fields `space-y-5`; each option is a bordered `rounded-xl p-3` block with a two-column grid from `sm`; the footer sits under a top rule (SCD:259–536).

### 3.3 UI elements

- **F-133** Card, top to bottom: the category in 11px uppercase; the title (one line, truncated); a ⋮ menu; the description (two lines max); up to four 56px option thumbnails (image, or the option's name in tiny text) and a "+n" tile for the rest; a price line; a status pill; "Selected: {option name}" once the homeowner has picked; the homeowner's comment in a yellow box with a speech icon and curly quotes; and, when one exists, the auto-VO chip (SB:217–345).
- **F-134** Price line: the lowest and highest option price as "{min} - {max}", or one figure when equal; options without a price are ignored (SB:285–298).
- **F-135** Status pills (11px, rounded, bordered): "Draft" grey · "Shared" blue · "Approved" green · "Change Requested" yellow · "Rejected" red (SB:31–45).
- **F-136** ⋮ menu (144px): "Edit"; "Share with Client" (only while Draft); "Delete" in red (SB:235–247).
- **F-137** Auto-VO chip (blue, links away): "Auto-VO drafted · {VO number}", second line "{amount} · {VO status}", and "Review →" (SB:324–344).
- **F-138** Dialog title "New Selection" or "Edit Selection". Fields, verbatim: "Category *" (select, placeholder "Select category"; options "Kitchen", "Master Bedroom", "Living Room", "Bathroom", "Dining", "Study", "Balcony", "Others"); "Title *" (placeholder "e.g. Backsplash Tile, Flooring Material"); "Description" (placeholder "Brief description of this selection..."); "Designer Note (internal only)" (placeholder "Internal notes visible only to your team..."); "Options *" with a counter "{n}/4" (SCD:32–41, SCD:266–322).
- **F-139** Each option block: label "Option {n}"; a "Choose from catalog" button (library icon); a "Save" button (tooltip "Save this option to your reusable material catalog", turning to a green tick and "Saved"); a bin when there is more than one option. Fields: "Name *" (placeholder "Option name"); "Vendor / Brand" (the vendor picker, placeholder "e.g. Hafary, SMEG", with an ✕ "Clear vendor"); "Price ({currency})" (number, placeholder "0.00"); "Image" (placeholder "Paste URL or upload →" plus an upload button, tooltip "Upload an image", and a 48px preview); "Description" (placeholder "Material specs, dimensions, notes..."); "VO impact ({currency}) — added to project cost if picked" (number, placeholder "0.00 (no VO)") with a yellow tag "Triggers VO" when above zero (SCD:330–498).
- **F-140** An older option whose vendor is only text shows "Currently: **{name}** — not linked" under the picker (SCD:410–414).
- **F-141** A dashed full-width button "Add Option" appears until there are four (SCD:503–511). Footer: "Save as Draft" (outline) and "Save & Share with Client" (primary), each with a spinner while saving (SCD:516–536).
- **F-142** Catalog picker (popover, 340px): search "Search materials" with a clear ✕; category chips "All" + the catalog's categories; a two-column grid of cards (4:3 image or an image icon, name, and "vendor · price" or the category). States: a morphing-shape loader; "Couldn't load the catalog." + "Try again"; "Your material catalog is empty" + "Add materials in Accounts → Material Catalog, or save options here as you build them."; "No materials match "{q}"." (`src/components/projects/material-catalog-picker.tsx:62–172`).
- **F-143** Delete confirmation: title "Delete Selection", body "Are you sure you want to delete this selection? This action cannot be undone.", buttons "Cancel" and a red "Delete" (SB:174–192).

### 3.4 Interactions

- **F-144** "New Selection" / "Create First Selection" open the empty dialog; "Edit" opens it filled, for a selection in any status (SB:72–75, SB:107–110).
- **F-145** Picking a catalog item copies its name, vendor (text and link together), price, image and specs into the option; nothing stays linked to the catalog (SCD:64–82, `docs/features/material-catalog/spec.md` "Copy-not-link").
- **F-146** "Save" on an option adds it to the studio's material catalog under the selection's category; toasts "Saved to your material catalog", or "Add an option name first", "Pick a category first", "Couldn't save to catalog" (SCD:129–158).
- **F-147** Uploading an image (PNG, JPEG, WebP, 5 MB) puts it in the public `studio-materials` bucket under `{studioId}/catalog/` and fills the URL; toasts "Image uploaded" or the error ("Image must be 5MB or smaller") (SCD:160–173, `src/lib/queries/material-catalog.ts:169–184`).
- **F-148** "Save as Draft" creates or updates the selection; "Save & Share with Client" then also shares it — on an edit, only if it is still Draft. Options with an empty name are dropped. The dialog cannot be dismissed while saving (SCD:212–258).
- **F-149** "Share with Client" on a card sets status Shared and stamps `shared_at`; there is no confirmation and no toast (SB:77–79, `src/app/api/project-selections/records/[id]/route.ts:69–72`).
- **F-150** Homeowner side: selections split into "Awaiting Your Response" and "Responded". On a pending one the homeowner taps an option card to pick it (primary border and a tick), then "Approve"; or "Request Changes" / "Reject", both of which open a comment box (placeholder "Describe what changes you'd like...") with "Submit Request", "Reject" and "Cancel". Hint under the buttons: "Select an option above before approving" (HSB:46–278).
- **F-151** An option with a VO impact shows "+{amount} price impact" to the homeowner, and picking it shows a yellow notice: "Approving **{option}** will add **{amount}** to your project cost. Your designer will issue a Variation Order to confirm." (HSB:165–188).

### 3.5 States

- **F-152** Loading: three pulsing skeleton cards (`animate-pulse`) in the same grid (SB:118–127).
- **F-153** Empty: a centred card with a 32px layers icon, "No selections yet", "Create selection boards to curate product, material, and finish options for client approval." and the primary button "Create First Selection" (SB:128–147).
- **F-154** Error: the board has no error state; a failed load shows the empty card **[inferred]** (SB:48 uses only `data` and `isLoading`). A failed save is caught and logged with no message; the dialog stays open (SCD:248–250).
- **F-155** Disabled: both save buttons until category, title and at least one named option exist (SCD:255, SCD:522, SCD:531); "Save" to catalog until the option has a name.
- **F-156** Homeowner states: loader; "Couldn't load your selections." / "Check your connection and try again." / "Try again"; "No selections yet" / "Material and finish selections from your designer will appear here."; responded cards show "Your Comment" and "Responded {date}"; the pending pill reads "Pending" (HSB:9–44, HSB:191–200).

### 3.6 Motion

- **F-157** Skeleton pulse while loading; menus and dialogs use the standard fade/zoom; the auto-VO chip and dashed "Add Option" button `transition-colors`; catalog images scale to 105% on hover (`group-hover:scale-105 transition-transform`); the catalog loader is the morphing shape (`morph-shape` 3.2s linear infinite with `morph-pulse` 2s ease-in-out, `src/app/globals.css:1273–1314`). Cards do not animate in or out.

### 3.7 Rules and logic

- **F-158** Status machine: created as `draft`; `shared` by the studio; then the homeowner sets `approved`, `rejected` or `change_requested`, which also stamps `responded_at` and stores the comment. The homeowner can answer only while the status is `shared`; any other state returns 400 "Cannot respond to a selection with status "{status}"" (`…/respond/route.ts:75–107`).
- **F-159** The picked option is stored as its position in the list (`selected_option_index`), written only on approve (`…/respond/route.ts:94–97`).
- **F-160** On any answer the studio gets a `selection.responded` notification with the project, the selection title, the option picked and the comment (`…/respond/route.ts:141–155`).
- **F-161** Auto variation order: on approve, when the picked option's VO impact is above zero, a draft variation order is inserted — number `VO-{studio's VO count + 1, four digits}`, title "Selection upgrade: {selection title}", one line "{title} — {option}", direction client, linked back by `triggered_by_selection_id` — and a `vo.auto_drafted` notification is sent. Nothing is issued automatically (`…/respond/route.ts:157–219`).
- **F-162** The designer note is never sent to the homeowner; the portal query leaves the column out (`src/app/api/homeowner/projects/[id]/selections/route.ts:36–44`). Drafts are also withheld.
- **F-163** Receipt PDF: available to the studio and to the homeowner once answered (409 "No decision recorded yet" before); A4, studio name, "Selection Decision", project, selection, category, "Decided on", every option with its price and "✓ PICKED" on the chosen one, "Status: Approved / Rejected / Change requested", the comment, and a 16-character document hash; file name `selection-receipt-{title}.pdf` (`src/app/api/projects/[id]/selections/[selectionId]/receipt/route.ts:88–244`).
- **F-164** Roles: any studio member with a session can create, edit, share and delete selections; the routes check only the session and scope by studio (`src/app/api/project-selections/records/route.ts:79–118`). The material catalog is likewise open to every member (`docs/features/material-catalog/spec.md` "Access").
- **F-165** There is no link from a selection to quote line items or purchase orders. The only finance link is the auto-drafted variation order (F-161); the only supplier link is the option's optional vendor id.

### 3.8 Data

- **F-166** Table `project_selections`: `project_id`, `studio_id`, `category`, `title`, `description`, `options` (JSON list of `{name, description?, image_url?, price_cents?, vendor?, vendor_id?, specs?, vo_cost_cents?}`), `selected_option_index`, `status`, `homeowner_comment`, `designer_note`, `shared_at`, `responded_at`, `created_by`, timestamps (`scripts/migrations/143_project_selections.sql`). `variation_orders.triggered_by_selection_id` (migration 144). Catalog table `studio_material_catalog` (migration 194).
- **F-167** Routes the board uses: `GET/POST /api/project-selections/records`, `PATCH/DELETE /api/project-selections/records/[id]` (`src/lib/queries/selections.ts`). Homeowner: `GET /api/homeowner/projects/[id]/selections`, `POST …/[selectionId]/respond`. Receipt: `GET /api/projects/[id]/selections/[selectionId]/receipt`.
- **F-168** A second, older set of routes does the same job and is called by no screen: `GET/POST /api/projects/[id]/selections`, `PUT/DELETE …/[selectionId]`, `POST …/[selectionId]/share`. These are the only ones that send the homeowner a `selection.shared` notification (`src/app/api/projects/[id]/selections/[selectionId]/share/route.ts:60–74`).
- **F-169** `GET /api/projects/[id]/materials` builds a material tracking list from quote lines (cost type material or combined, or unset), the project's purchase orders and their receipts, matching by description text, with stages `specify → order → ship → receive → complete`, received and rejected quantities and an overdue flag (`src/app/api/projects/[id]/materials/route.ts:32–58`, `:97–312`). Its hook `useProjectMaterials` is imported by no component (`src/lib/queries/materials.ts`); the feature has no screen.

### 3.9 Responsive

- **F-170** The grid steps 1 → 2 → 3 columns at `sm` and `lg`; the dialog's option fields go to one column below `sm`; the homeowner's option cards are one column below `sm` (SB:149, SCD:360, HSB:125).

### 3.10 Problems

- **F-171** Sharing from the board does not tell the homeowner. The board shares through the generic update route, which only sets the status; the route that sends `selection.shared` is never called (F-149, F-168). The page's own comment claims the opposite (P:2931–2937).
- **F-172** No way back to Shared. "Share with Client" shows only for Draft, and saving an edit shares only if Draft (SB:239, SCD:230). After "Change Requested" or "Rejected" the studio can edit the options but the homeowner can never answer again; the selection must be deleted and rebuilt.
- **F-173** The auto-VO chip links to `/projects/{id}?tab=finance&financeSubTab=contract&voId={id}`. The page reads `sub`, not `financeSubTab`; the sub-tab is called `contracts`; and nothing reads `voId`. The link opens Finance → Overview (SB:326, P:674–678). The notification for the same event has the same fault (`…/respond/route.ts:207`).
- **F-174** An approved selection can still be edited, including removing or reordering options; because the pick is stored as a position, "Selected: …" can then name the wrong option or fall back to "Option {n}" (SB:305–308, F-159).
- **F-175** "Category" is a list of eight rooms, not material categories, while the catalog's categories are free text (SCD:32–41). Saving an option to the catalog files it under the room name (SCD:137).
- **F-176** The card menu says "Share with Client", the dialog button "Save & Share with Client", the page comment "Share with homeowner", the sub-tab "Materials", the heading "Selections", the empty state "selection boards".
- **F-177** Entering a price or VO impact of 0 is stored as "no value" (`price_cents: opt.priceCents || undefined`), and each keystroke re-formats the number field to two decimals, which fights typing **[inferred]** (SCD:420–423, `src/app/api/project-selections/records/route.ts:41–45`).
- **F-178** The auto-VO number is "count of the studio's VOs + 1", which can collide after a deletion or when two homeowners approve at once **[inferred]** (`…/respond/route.ts:161–165`).
- **F-179** On the homeowner side the first "Reject" button does not reject; it opens the same comment box as "Request Changes", where a second "Reject" does (HSB:254–262, HSB:221–227).
- **F-180** `custom-material-upload-dialog.tsx` is not part of this tab; it belongs to the AI Visualizer ("Add custom material", "Save to studio library", "Save & use" / "Use for this render") and is imported only by `src/components/projects/visualizer.tsx`.

---

## 4. Floor Plan sub-tab

### 4.1 What it is, entry points

- **F-181** Management → Floor Plan mounts `FloorPlanSection` with `viewerRole="studio"` (P:2948–2952). It is a shared, annotated plan: the studio and the homeowner mark up the same image and talk about each mark. The same component, with `viewerRole="homeowner"`, is the homeowner portal's floor-plan tab (FPS:3–20).
- **F-182** Entry: the strip, or `?tab=management&sub=floor-plan`. Emails to the homeowner link to `/my/projects/{id}?tab=floor-plan` (`src/app/api/projects/[id]/floor-plan/route.ts:185`).
- **F-183** Design boundaries stated in the spec: not a CAD tool; marks, not geometry; statuses are only open and resolved; many plans per project with exactly one "Primary"; only the studio chooses the Primary; the homeowner's portal always opens on it (`docs/features/floor-plan-collab/spec.md:43–53`).

### 4.2 Layout

- **F-184** With a plan: a `space-y-3` column — plan switcher strip (only when there is more than one plan), sign-off banner, then a two-column grid `lg:grid-cols-[1fr_320px] gap-4`: the canvas column on the left, a 320px rail on the right; one column below `lg` (FPS:361–454).
- **F-185** Canvas column: a two-row toolbar, the plan frame (full width, the image's own aspect ratio, `rounded-xl`, bordered, clipped), a caption line, an "Export marked plan (PDF)" link (plus "Open the original PDF" when the plan came from a PDF), then an "Upload another plan" button with a note (FPS:455–607, CV:739–874).
- **F-186** Rail, top to bottom: the author filter bar, the Point schedule card, the Site diary card, then the list of marks (`max-h-[600px]`, own scroll) (FPS:609–653).
- **F-187** Zoom controls float inside the plan frame at bottom-right (`absolute bottom-3 right-3`), on a blurred white pill, outside the zoomed layer so they keep their size (CV:1015–1054).

### 4.3 UI elements

- **F-188** No plan yet (studio): a centred card with a map-pin in a 48px tinted circle, heading "Share a floor plan with your homeowner", text "Upload an image of the plan. You and the homeowner can both draw notes, drop pins, and comment on each mark.", button "Upload plan", hint "PDF, PNG, JPG or WebP. A PDF renders its first page for marking up, and the original file is kept.", and a text link "Don't have it? Ask your homeowner to send it" (FPS:214–275).
- **F-189** Under it, when the project or its lead already has image files: a card headed "Or import from a file already attached" (shown in capitals) listing each file as a row with "Use as plan →" (FPS:277–308).
- **F-190** Toolbar row 1, "what you draw" (each a labelled button whose tooltip is "{label} — {hint}"): "Pen" (draw freehand on the plan, like a marker pen) · "Box" (drag a rectangle to outline built-in work — a wardrobe, kitchen run, feature wall) · "Arrow" (drag an arrow to point at something specific) · "Text" (tap to type a short label directly on the plan) · "Comment" (tap a spot to drop a numbered marker and start a conversation about it) · "Photo" (tap a spot on the plan, then pick site photos — builds a dated site diary) · "More" · "Stamp" (CV:750–797).
- **F-191** "More" menu: section "Shade a zone" (shown in capitals) — "Diagonal — e.g. flooring", "Cross-hatch — e.g. hacking / demolition", "Dotted — e.g. tiling"; section "Mark up" — "Revision cloud — ring something that changed", "Numbered callout — a leader line to a numbered tag"; footnote "Drag on the plan to place any of these." The button's label becomes "Zone", "Cloud" or "Callout" while one is active (CV:1664–1726, `src/lib/floor-plan-symbols.ts:27–29`).
- **F-192** "Stamp" menu: ten symbols in three groups (power, lighting, wet) — "13A socket (single)", "13A socket (double)", "Light switch", "Data / TV point", "Aircon point", "Downlight", "Cove light", "Pendant drop", "Water point", "Floor trap" (`src/lib/floor-plan-symbols.ts:57–66`).
- **F-193** Toolbar row 2, "how you work": "Measure" (drag along anything to read its real length in mm; on an unscaled plan the hint adds "needs the plan scale set first, which this will walk you through") · a crosshair button with a dot until the scale is set (tooltip "Plan scale — teach the plan its real size once, so Measure can show millimetres", later "Plan scale — already set. Redo it if measurements look wrong") · "Layers" · a style button (tooltip "Mark style — colour, thickness, dashed") · "Select — tap a mark to read its comments, or drag your own marks to move them" · "Erase — tap your own marks to delete them" · "Undo last mark (⌘Z / Ctrl+Z)" · a spinner while saving (CV:800–849).
- **F-194** Layers menu: one row per trade layer with an eye (44px wide, tooltips "Hide {layer}" / "Show {layer}"), the name, a count and a "drawing" badge on the layer new marks go to. Layers: "General", "Carpentry", "Electrical", "Plumbing / wet works", "Lighting", "Tiling & flooring", "Client requests", "Studio only (hidden from homeowner)" (`src/lib/floor-plan-layers.ts:37–46`, CV:1795–1925).
- **F-195** Style popover: "Colour" swatches including "My role colour (default)", "Thickness" choices, a dashed toggle (CV:1947–2025). Default colours: studio marks #5500FF, homeowner marks #DB382A; resolved marks at 35% opacity (CV:68–70).
- **F-196** Zoom pill: "Pan" (hand; tooltip "Pan the plan" / "Pan mode on — tap to go back to drawing") · "Zoom out" · the percentage · "Zoom in" · "Fit to width" (tooltip "Fit to width (or double-click the plan)") (CV:1027–1053).
- **F-197** Scale panel (floats top-left of the plan, 304px): "Set the plan scale — step 1 of 2"; "The plan is just an image, so it has no idea how big the real home is. Show it one length you already know and it can measure everything else."; "On the plan, click the two ends of something whose real size you know." with examples "A bedroom door — usually 900 mm wide", "A dimension already printed on the plan", "Any wall you have measured on site"; "{n} of 2 ends marked — now click the other end"; step 2 "Both ends marked. How long is that in real life?" with an input (placeholder "e.g. 900 or 0.9m"), a "Set" button, and an echo line "Millimetres by default — or add m / cm." / "Reading that as {length}."; links "Start over" and "Cancel" (CV:1055–1145).
- **F-198** Caption under the plan: a colour dot and "Your marks ·" then "Tap or drag to annotate. Switch to Select to move marks or open a thread. Pinch or scroll to zoom." (in Select mode: "Click a mark to open its thread. Drag your own marks to reposition them.") (CV:1215–1236).
- **F-199** Plan switcher: a sideways strip of 168px cards, each with an 84px thumbnail (or "Preview unavailable"), the title (or "Plan {n}"), a hard-hat or person icon with the uploader's name (or "Studio" / "Homeowner"), "{n} mark(s)", a "★ Primary" badge on one, and a ⋮ menu: "Set as Primary" (or "Already Primary"), "Rename", "Archive" (or "Can't archive the only plan") (`src/components/floor-plan-collab/plan-switcher.tsx:79–227`).
- **F-200** Archive confirmation: "Archive this plan?" — "It will be hidden from both of you. Its marks and comments are kept — archiving never deletes the conversation." (for the Primary: "…and the next-newest plan becomes Primary. …"); button "Archive" (`plan-switcher.tsx:229–244`).
- **F-201** Sign-off banner, studio view: green "Layout confirmed by {name} · {date}" with the homeowner's note and a tag "confirmed in the portal" (tooltip "Confirmed from the homeowner's portal account, which is created with phone + one-time code. Not a contract-grade signature."); or yellow "You're viewing a plan that isn't the confirmed one. {Name} confirmed a different layout on {date}."; or, with more than one plan and nothing confirmed, grey "Waiting on your homeowner to confirm which layout to build." (`src/components/floor-plan-collab/approval-banner.tsx:42–122`). The homeowner sees "Happy with this layout?" and "Confirm this layout".
- **F-202** Filter bar: pills "Both", "Studio", "Homeowner"; a toggle "Resolved" with an eye (tooltips "Hide resolved marks" / "Show resolved marks"); and a count, "{n}" or "{shown} of {total}" (`src/components/floor-plan-collab/mark-filter-bar.tsx:20–72`).
- **F-203** Point schedule card (only when stamps exist): "Point schedule" with "{n} point(s)", stamps counted per symbol under their group headings; when filtered, "Counting {studio|homeowner} marks only — clear the filter for the full count."; and a warning "{n} stamp(s) not recognised and excluded from the total." (`src/components/floor-plan-collab/point-schedule.tsx:49–94`).
- **F-204** Site diary card (only when photo marks exist): "Site diary" with "{n} photo(s) · {n} day(s)", entries grouped by the date the photos were taken, each showing up to three 48px thumbnails, "+n" and the mark's text or "{author} · {n} photo(s)" (`src/components/floor-plan-collab/site-diary.tsx:34–89`).
- **F-205** Mark card in the rail: a pill with the tool's icon and name ("pen", "arrow", "text", "comment", "box", "measurement", the stamp's name, "zone", "revision", "callout", "site photo") tinted primary for studio or red for homeowner; the author; a green "Resolved" pill; the mark's text in italic quotes; photos with "On site · {date}"; the created time and "{n} comment(s)" (`src/components/floor-plan-collab/annotation-thread.tsx:51–79`, `:195–249`).
- **F-206** Opened mark card: the comment thread (each line with a "Studio" or "Homeowner" pill, the text, a short date, 56px photo thumbnails); a comment input (placeholder "Add a comment…", or "Add a note (optional)…" once photos are queued), an image button (tooltip "Attach a photo — show what you mean, not just where", limit tooltip "Up to 5 photos") and a send button; "Mark resolved" / "Reopen"; "Delete" in red on your own marks; and for the studio "Make a task" and "Raise a variation order", replaced after use by pills "Task raised" and "Variation order raised" (`annotation-thread.tsx:251–418`).

### 4.4 Interactions

- **F-207** Upload accepts PNG, JPEG, WebP or PDF. A PDF's first page is rendered in the browser at a 2400px long edge and that picture becomes the plan; the original PDF is kept alongside. Oversized photos are shrunk to the same edge (`src/lib/floor-plan-upload-source.ts:32–36`, FPS:147–156).
- **F-208** Upload toasts: first plan "Floor plan shared — homeowner notified"; import "Floor plan imported"; another plan "New plan uploaded — it's now Primary". "Ask your homeowner" toasts "Asked your homeowner for the plan — sent to {email}" (FPS:132, FPS:246, FPS:268, FPS:593).
- **F-209** Drawing: choose a tool, then tap or drag on the plan; each mark is saved the moment the pointer lifts, shown at once (optimistic) and confirmed by the server; there is no Save button (CV:8–11, `src/lib/queries/floor-plan-collab.ts:164–192`).
- **F-210** Text marks: tapping opens a small box at that point with an input (placeholder "Label..."), "Add" and "Cancel"; Enter adds, Escape cancels (CV:1184–1212).
- **F-211** Photo marks: tap a point, then the file picker opens (several PNG, JPEG or WebP); photos upload one after another; the mark is created only if all succeed, dated today in the viewer's time zone (CV:1147–1181, `docs/features/floor-plan-collab/spec.md:568–576`).
- **F-212** Measure on a plan with no scale first opens the scale panel, then returns to Measure (CV:728–737). Setting the scale toasts "Plan scale set — measurements now show millimetres" (FPS:491–500).
- **F-213** Zoom: mouse wheel or trackpad pinch zooms about the cursor, two-finger pinch on touch, the ± buttons step by ×1.4, range 100%–800%; double-click or "Fit to width" resets; Pan mode drags the plan (CV:75–76, CV:356–358, CV:862, CV:1034–1051).
- **F-214** Select mode: click a mark to select it and open its card in the rail; drag your own marks to move them (a move under 6px counts as a click). Erase mode: tap your own marks to delete them. Clicking a card in the rail selects the mark on the plan, and clicking it again closes it (CV:80, CV:638–651, FPS:501–508, `annotation-thread.tsx:131`).
- **F-215** Keyboard: ⌘Z / Ctrl+Z removes your last mark of this session unless you are typing in a field; Enter submits a comment, a rename, a text label and the scale; Escape cancels a rename or a text label (CV:705–718, `plan-switcher.tsx:207–210`, `annotation-thread.tsx:314`).
- **F-216** Comment photos are queued as file chips and uploaded only when the comment is sent; a comment may be photos only (`annotation-thread.tsx:164–191`).
- **F-217** "Make a task" creates a General task on this project titled with the mark's text (first 120 characters) or "Floor plan: follow up on {tool}", assigned to the person who pressed it, with no due date; toast "Task created — "{title}""; a second press is refused with "This mark already has a task" (FPS:637–648, FPS:661–666, `…/annotations/[annotationId]/work/route.ts:58–92`).
- **F-218** "Raise a variation order" opens the project's real variation-order editor; when it saves, the VO is linked to the mark; toasts "Variation order linked to the mark" or "The variation order saved, but couldn't be linked to the mark" (FPS:408–433).
- **F-219** Plan switcher: clicking a card switches the plan and clears the selected mark and the undo history; "Set as Primary" toasts "Primary plan updated — this is what your homeowner opens on"; rename is an inline box over the card ("Plan name", "Save", "Cancel") and toasts "Plan renamed"; archive toasts "Plan archived — its marks are kept" (FPS:158–165, FPS:372–404).
- **F-220** "Export marked plan (PDF)" builds, in the browser, a two-page A4 landscape PDF — the plan with marks, then a numbered legend with each conversation — and downloads it; toast "Exported — send this to your contractor" (FPS:510–551, `docs/features/floor-plan-collab/spec.md:450–465`).
- **F-221** The pane refetches every 8 seconds; there is no live push (`src/lib/queries/floor-plan-collab.ts:55`).

### 4.5 States

- **F-222** Loading: a centred 24px spinner, `py-16` (FPS:167–173). Error with nothing cached: a red triangle, "Couldn't load the floor plan.", "Check your connection and try again.", "Try again" (FPS:178–187).
- **F-223** Rail empty states: "No annotations yet." / "Draw on the plan or drop a pin to start."; when a filter hides everything, "Nothing matches this filter." / "Change the Both / Studio / Homeowner filter above the plan."; a note "{n} mark(s) hidden by the filter" with "Show all" (`annotation-thread.tsx:86–121`).
- **F-224** Read-only (the studio previewing as the homeowner): the toolbar, comment box and actions are hidden and the caption reads "Preview mode — drawing disabled. Pinch or scroll to zoom, double-click to fit." (CV:747, CV:1230).
- **F-225** Error toasts: "Failed to upload", "Failed to import", "Couldn't send the request", "No email on file for this homeowner. Add one, or invite them to the portal first.", "Couldn't set Primary", "Couldn't rename plan", "Couldn't archive plan", "Couldn't save the scale", "Couldn't move that mark", "Couldn't upload those photos", "Couldn't create the task", "The plan is still loading — try again in a moment", "Couldn't export the plan" (FPS:135–542, `…/floor-plan/request/route.ts:53–55`).

### 4.6 Motion

- **F-226** Almost none by design: buttons and cards use `transition-colors`; spinners `animate-spin`; the plan's zoom and pan are a single CSS transform applied without a transition (CV:876–879); menus and the confirm dialog use the standard fade/zoom. Marks appear instantly.

### 4.7 Rules and logic

- **F-227** Plans: image at most 5 MB (JPEG, PNG, WebP), original PDF at most 20 MB; stored privately; every studio upload becomes the new Primary and demotes the previous one; a homeowner's upload never becomes Primary by itself (`src/app/api/projects/[id]/floor-plan/route.ts:20–25`, `:133–161`, `docs/features/floor-plan-collab/spec.md:379–383`).
- **F-228** Archive is a soft flag; plans are never deleted; archiving the Primary promotes the newest remaining plan; marks stay with the plan they were drawn on (`docs/features/floor-plan-collab/spec.md:105–118`).
- **F-229** Marks are stored as a JSON shape with points normalised 0–1, so they stay put at any size. Allowed tools: pen, arrow, rect, dimension, hatch, cloud, callout, text, pin, symbol, photo, with a minimum point count each; a text mark needs text; a photo mark needs at least one photo (`src/lib/floor-plan-collab.ts:45–85`).
- **F-230** Status of a mark: open or resolved; either side can resolve or reopen; only the author can delete or move a mark (`annotation-thread.tsx:355–374`, CV:638–651).
- **F-231** Marks on the "Studio only" layer are removed from the homeowner's data on the server, not just hidden (`docs/features/floor-plan-collab/spec.md:504–511`).
- **F-232** Studio-only powers, enforced by the routes existing only for the studio: set Primary, rename, archive, set the scale, make a task, link a variation order. Homeowner-only: confirming a layout — a studio session gets 401, a studio preview 403 (`docs/features/floor-plan-collab/spec.md:635–655`).
- **F-233** Layout confirmation is append-only: each confirmation is a new row with the homeowner's name and phone copied in; the newest row is the current decision; the method recorded is "portal session", and the copy says "confirmed in the portal", never "signed" (`docs/features/floor-plan-collab/spec.md:518–548`).
- **F-234** Notifications: `floor_plan.shared` to the homeowner on every studio upload; `floor_plan.requested_from_homeowner` when the studio asks; `floor_plan.uploaded_by_homeowner` to the studio; and mark/comment events from each side, at most one per plan per 15 minutes (`src/app/api/projects/[id]/floor-plan/route.ts:169–198`, `…/request/route.ts:58–72`, `docs/features/floor-plan-collab/spec.md:404–448`).
- **F-235** Scale is stored per plan as millimetres per image pixel; empty means "not set", and a bare small decimal such as "3.6" is read as metres (`docs/features/floor-plan-collab/spec.md:316–325`).

### 4.8 Data

- **F-236** Tables: `project_floor_plans` (image path and size, title, `is_current` = Primary, `archived`, `uploaded_by_role`, `scale_mm_per_unit`, `source_pdf_path`), `floor_plan_annotations` (shape JSON, author role and ids, status, `linked_task_id`, `linked_vo_quote_id`), `floor_plan_annotation_comments` (body, `attachments`), `floor_plan_approvals` (`scripts/migrations/147_floor_plan_collab.sql`, `283`–`287`). Files in bucket `task-attachments` under `floor-plans/{projectId}/`.
- **F-237** Studio routes under `/api/projects/[id]/floor-plan`: `GET` (optional `?planId=`), `POST` (upload), `request` (ask the homeowner), `plans/[planId]` (`PATCH`), `annotations` (`POST`), `annotations/[annotationId]` (`PATCH`, `DELETE`), `…/comments` (`POST`), `…/work` (`POST` task, `PATCH` link VO), `upload-image`. The import list reads `/api/projects/[id]/files` (FPS:99–114).

### 4.9 Responsive

- **F-238** Below `lg` the rail drops under the plan. The toolbar rows wrap. The plan frame keeps the image's proportions and blocks page scrolling while touched (`touch-none`), with pinch-zoom built in; the layer eye targets are 44px wide for tablets on site (FPS:454, CV:865, `docs/features/floor-plan-collab/spec.md:603–610`).

### 4.10 Problems

- **F-239** The spec says the homeowner gets only the comment pin while the full toolkit is studio-only, but the canvas shows the whole toolbar to anyone not in read-only mode — it never tests the viewer's role for tools — and the server's shape check does not look at role either (`docs/features/floor-plan-collab/spec.md:49`, `:341`, `:643`; CV:747–851; `src/lib/floor-plan-collab.ts:45–66`). (Homeowner portal not opened.)
- **F-240** The empty-state hint says to change the filter "above the plan", but the filter sits above the list of marks in the right rail (`annotation-thread.tsx:115`, FPS:610–615).
- **F-241** The PDF export and the variation-order editor are both given the plan's title as the "project name", so the export header reads the plan's name or "Floor plan", never the project (FPS:416, FPS:527).
- **F-242** A task made from a mark has no due date, no milestone, sends no notification and is written straight to the table; it appears in the Tasks tab with "—" under Milestone (`…/work/route.ts:71–88`).
- **F-243** Deleting a mark (and its whole conversation) from its card is immediate, with no confirmation, and nothing restores it — ⌘Z only removes your own last mark (`annotation-thread.tsx:365–373`, CV:691–703).
- **F-244** Every "Upload another plan" by the studio silently changes what the homeowner opens on and emails them again; the only warning is a 10px note under the button (FPS:575–579, F-227).
- **F-245** The spec numbers the migrations 277–281; the code and the migration files use 283–287 (`docs/features/floor-plan-collab/spec.md:3`, `:692`; `scripts/migrations/283_floor_plan_multi.sql`). The route's header comment still says "Only studios upload" (`src/app/api/projects/[id]/floor-plan/route.ts:4–5`).
- **F-246** Dates in the rail and banner are formatted with a fixed US locale ("en-US") regardless of the studio's region (`annotation-thread.tsx:247`, `approval-banner.tsx:39`).

---

## 5. "Plan the Space (3D)" and the 3-D Space Planner

### 5.1 What it is, entry points

- **F-247** A header button on every project tab, from `lg` up: outline button with a layers icon, "Plan the Space (3D)", tooltip "Build a 3D model of the space, place furniture, and walk the client through the design.", `aria-label` "Open Plan the Space (3D) for this project". Below `lg` it is an item in the header's ⋯ menu (P:1734–1749, P:1796–1798).
- **F-248** It does not navigate at once. It opens a small dialog (`max-w-lg`) titled "Plan the Space (3D)" with either "Build a 3D model of the space, place furniture, and walk the client through the design." or "Pick up where you left off — {n} existing layout(s) on this project — or start fresh." (`src/components/projects/tool-entry-dialog.tsx:44–50`, `:94–108`).
- **F-249** Dialog body: while checking, "Checking for existing layouts…" with a spinner; then up to five saved layouts as rows (name, "Updated {date}", arrow); then a dashed row with a plus tile, "Start a new 3D layout" and "Project context is pre-filled — no need to pick it again."; footer "Cancel" (`tool-entry-dialog.tsx:111–192`).
- **F-250** A row opens `/tools/floor-plan?projectId={id}&planId={planId}`; "Start a new 3D layout" opens `/tools/floor-plan?projectId={id}` (`tool-entry-dialog.tsx:65–82`). The same tool is in the main navigation as "3-D Space Planner" (`src/components/layout/app-sidebar.tsx:26`, `src/components/layout/topbar.tsx:29`).
- **F-251** This is a different thing from the Floor Plan sub-tab (section 4) and from "Floorplan to 3D Isometric" (`/tools/floorplan-3d-isometric`, an image generator described in `docs/features/floorplan-3d/spec.md`). The header button leads only to the 3-D Space Planner.

### 5.2 What the tool does (summary, from its entry page, toolbar and docs)

- **F-252** Entry screen, titled "3-D Space Planner" — "Design your furniture layout in 3D with real Singapore flat templates.": a "My Floor Plans" strip of saved plans; a hero "Design your space in 3D" with "Create New Floor Plan", "Have a room photo? Generate with AI" and "Have an existing floor plan? Upload image"; "Quick Start Templates" with filters "All", "HDB", "Condo", "Landed", "Multi-Floor", "Pre-Furnished"; "Custom Templates"; and a gallery "Made with Space Planner" (TP:949–1124).
- **F-253** Four ways in: pick a template; draw rooms from scratch in a creator dialog (room presets, multi-floor, walls, doors, windows); upload a floor-plan image that AI turns into rooms; or upload a room photo that AI turns into a furnished room (TP:643–718, TP:1127–1144).
- **F-254** The editor is a full-screen overlay (`fixed inset-0 z-50`) with a top toolbar: Back, the plan's name, Undo / Redo, four views — "Dollhouse" (3D isometric view), "Cutaway" (Section view), "Top View" (Overhead 2D view), "Walk" (First-person walkthrough) — toggles "Walls", "Dims", "Ruler", "2D", "Furniture", and "Edit Rooms", "Auto-Arrange", "Render" (TP:917–945, `src/components/floor-plan/FloorPlanToolbar.tsx:59–62`, `:170–199`).
- **F-255** Core editing: a furniture catalogue (47 items in 9 categories per the doc), click-to-place with a ghost preview, drag, rotate, resize, duplicate, delete, 25cm grid snap, 15cm wall snap, collision checks against walls and other furniture, room colours and textures, room-wall and door editing (`docs/rules/floor-plan.md:34`, `:52–57`, `:78–82`).
- **F-256** AI features inside it: Auto-Arrange Furniture; "AI Room Render" (a photoreal picture of the scene); "Render Tour" (a set of renders); furniture made from text ("Create Furniture from Text"), from a photo ("Create Furniture from Photo") or from a catalogue page; a guided fix wizard for AI-read plans (steps for entry point, room placement, room size, doors and windows, dimensions, missing rooms, empty space, reachability, furniture) (`src/components/floor-plan/*Dialog.tsx`, `src/components/floor-plan/wizard-steps/`).
- **F-257** Output: "Elevation views" (Room Elevations, Kitchen, Wardrobe); Export ▾ "Render Tour", "Export as PNG", "Export as PDF", "Share as 3D Link" / "Manage Share Link"; Display ▾ "Presentation Mode", "HD Mode", "Faded Walls" / "Solid Walls", and sun angle and time-of-day sliders in presentation mode; a version-history button with a count; "Save" with "Save as Template" (`FloorPlanToolbar.tsx:212–338`).
- **F-258** Keyboard in the editor: Delete / Backspace removes the selection; ⌘/Ctrl C, V, D copy, paste, duplicate; ⌘/Ctrl Z and Shift-Z / Y undo and redo; arrows nudge; ⌘/Ctrl A selects all; ⌘/Ctrl S saves; Escape cancels placing; "?" opens a shortcut list (`src/components/floor-plan/FloorPlanEditor.tsx:3091–3196`).
- **F-259** Saving: manual ("Save" → toast "Floor plan saved" / "Failed to save floor plan"); the first save creates the record, later saves update it; every save also stores a version with an automatic summary such as "Added 2 items, Moved 1 item"; the address gains `planId` so a reload reopens the plan. A copy is kept in `localStorage` every 60 seconds for crash recovery, and leaving with unsaved changes triggers the browser's warning and "You have unsaved changes. Leave without saving?" (TP:807–878, `FloorPlanEditor.tsx:946–971`, `:1440–1443`, `:3250`).
- **F-260** Sharing: "Share as 3D Link" mints a random token, sets the plan's status to shared and gives `{origin}/floor-plan/view/{token}`; "Anyone with this link can view the floor plan in read-only mode."; "Revoke Link" asks "Revoke this share link? Anyone with the link will no longer be able to view the plan." (TP:881–901, `FloorPlanEditor.tsx:6817–6858`).
- **F-261** Public viewer `/floor-plan/view/[token]` (no login): a header with an "OM" tile, the plan's name and "Shared floor plan · Read only"; room pills that fly the camera to a room; an "Orbit" / "Walk" toggle; a fullscreen button; the 3D scene; footer "Powered by OpenMaison". Loading: a spinner and "Loading floor plan..."; error: "This floor plan is no longer available." / "This link may have been revoked or the plan was deleted." (`src/app/floor-plan/view/[token]/page.tsx:49`, `:130–283`).
- **F-262** The viewer blocks small or portrait screens with a full-screen notice: "Rotate your device" — "Please rotate your device to landscape for the best 3D viewing experience." or "Best on larger screens" — "This 3D floor plan is best viewed on a tablet or desktop. Rotate to landscape if you're on a tablet." (`…/view/[token]/page.tsx:157–172`). The entry page shows "Desktop recommended — The 3D editor works best on screens 1024px and above." below `lg` (TP:958–965).
- **F-263** Data: table `floor_plans` (name, `template_id`, `project_id`, `furniture`, `rooms`, `camera_state`, `status`, `share_token`) and `floor_plan_versions`; routes `/api/floor-plans/records` (+ `[id]`, `[id]/versions`), `/api/floor-plans/share/[token]` (public), and a family of AI routes (`generate`, `generate-v2/v3`, `auto-arrange`, `auto-arrange-v2`, `from-room`, `photo-to-model`, `text-to-model`, `catalogue-to-model`, `detect-issues`, `refine`, `reshape`, `realign`, `reposition`, `meshy/*`, `export-glb`) (`src/lib/queries/floor-plans.ts`, `src/app/api/floor-plans/`).
- **F-264** Credits: none. No floor-plan route or component on this branch charges, checks or shows credits; the only mentions of "credits" are developer comments about AI vendor spend, and the photoreal render route has only a rate limit of 30 requests per client IP (`src/app/api/render/photorealistic/route.ts:22`; search of `src/app/api/floor-plans` and `src/components/floor-plan`).

### 5.3 Problems

- **F-265** Nothing is saved back to the project. The planner reads `projectId` from the address only to filter its list of saved plans; when it creates a plan it sends the name and template only, and the update route never sets a project (TP:626–634, TP:845–848, `src/app/api/floor-plans/records/route.ts:71`). So a layout made from a project is stored with no project, the dialog's "existing layouts on this project" list never fills, and "Project context is pre-filled" is not true.
- **F-266** The project context is invisible in the tool: the page fetches the project "to drive the chip displayed at the top" and then never renders it (TP:633–634, the only use of `scopedProject`). Back in the editor returns to the planner's entry screen, not to the project (TP:720–734).
- **F-267** Launched from a project, "My Floor Plans" is filtered to that project and so is empty, hiding the studio's other plans, with no message (TP:631, TP:968).
- **F-268** Three names for one tool: "Plan the Space (3D)" (project header and dialog), "3-D Space Planner" (navigation and page title), "Space Planner" (gallery heading); the dialog calls its records "layouts", the tool calls them "floor plans".
- **F-269** `docs/rules/floor-plan.md` still says there is "no Supabase persistence yet" (line 18), which the code contradicts; custom templates are kept only in the browser (`localStorage` key `qanvast_custom_templates`) and are lost on another device (TP:596–610).
- **F-270** The planner uses the browser's own `confirm()` for deletes and leaving ("Delete this floor plan?", "Delete this custom template?"), and the "View all" link above saved plans has no action (TP:613, TP:803, TP:975–980).
- **F-271** `/api/projects/rooms` (and `/rooms/[roomId]`) is not part of either floor-plan feature: it stores the AI Visualizer's rooms (`project_rooms`: name, project or lead, original image) and is called only from `src/components/projects/visualizer.tsx` (`src/app/api/projects/rooms/route.ts:1–17`).

---

## 6. Compliance

### 6.1 Where it is mounted

- **F-272** Nowhere. `ComplianceChecklist` is imported by no page or component; the only other mention is a string in a test (`src/__tests__/merge-integration.test.ts:397`). The project page carries two comments where it used to sit: "Compliance card removed — mAIson Bot answers compliance questions on demand. Full checklist still lives at /tools/compliance-navigator." and "Compliance tab body removed…" (P:2583–2585, P:4046–4052).
- **F-273** What still touches a project: (a) auto-created "[Compliance] …" tasks at project creation (F-290); (b) the dashboard's "Compliance Alerts" card (F-292); (c) a hidden calculation in the Gantt (F-293); (d) the assistant's `check_compliance` tool (`src/lib/agents/tools.ts:593`); (e) the studio-level tool "Compliance Navigator" at `/tools/compliance-navigator`, which is not tied to a project and keeps its ticks in the browser's `localStorage` (`src/app/(main)/tools/compliance-navigator/page.tsx:1245–1291`).
- **F-274** The UAT plan still describes a project "Compliance" tab with a shield icon, a compact card on the Details tab, a "Mandatory Compliance" panel in the Gantt and a dashboard link to `?tab=compliance` — none of which exist in the code now (`docs/features/sg-compliance-checklists/uat-plan.md:83–178`).

### 6.2 The component as built (for reference; unreachable)

- **F-275** Inputs: the project's property type text, its stage, the country, the lists of completed and skipped item ids, and callbacks to toggle or skip; a `compact` flag switches to a summary card (CC:84–109).
- **F-276** Full view layout: one `rounded-2xl` card. Header band (`px-5 py-4`, tinted): shield icon, "Compliance Checklist", a pill with the property type in capitals ("HDB", "CONDO", "LANDED"), a pill with the stage ("Design Phase", "Execution Phase", "Handover & Close"), and "{done}/{total} done" on the right; a 6px progress bar; then filter chips (CC:270–333).
- **F-277** Filter chips with counts: "All", "Mandatory", "Recommended", "Best Practice", "Completed", "Skipped" (CC:303–310).
- **F-278** Below, an accordion of categories. Each header: chevron, the category's label and description, a red or green pill "{n} mandatory" (red while any is pending) and "{done}/{count}" (CC:336–378). On mount the first category with a pending item is open (CC:115–144).
- **F-279** Item row: an 18px round check (green tick when done, grey tick when skipped), the title (struck through when done or skipped), a severity pill — "Mandatory" red, "Recommended" yellow, "Best Practice" primary tint — and the authority after a dot. On hover (always visible below `sm`): "Mark done" or "Revert", and a ⋯ menu: "View details" / "Hide details", "Mark as done" / "Mark as pending", "Skip (not applicable)", "View source" (CC:383–506).
- **F-280** Expanded item: the description; bullet steps; three tiles "Authority", "Timing", "Reference"; a red warning box with the penalty; a link "Source: {authority}"; and a text button "Skip (not applicable)" (CC:509–577).
- **F-281** Compact card: "Compliance", an optional "View All" button, "Mandatory items {done}/{count}" with a bar that is yellow while any are pending and green after, a large "{done} of {total}", and "{n} mandatory item(s) pending" with a warning icon (CC:226–266).
- **F-282** States: with no recognised property type — "Compliance Checklist" and "Set a property type (HDB, Condo, or Landed) to see applicable compliance items."; with no items after filtering — "No checklist items match the current filters" (CC:211–222, CC:589–595). No loading or error state (data is bundled).
- **F-283** Motion: progress bars `transition-[width]` (300ms on the full view); the category chevron rotates −90° in 200ms; item rows gain a tint and a 3px inset left bar on hover (green when done, grey when skipped, primary otherwise) over 150ms; the hover actions fade in over 150ms (CC:249, CC:296, CC:355, CC:393–396, CC:463).
- **F-284** Item statuses are three: pending, done, skipped ("not applicable"). Done and skipped both count toward progress. There is no evidence upload, no note, no date, no assignee and no approval on an item (CC:159–190).

### 6.3 Rules by property type and stage

- **F-285** Property type is guessed from the project's free-text property type. Singapore (default): contains "hdb" → HDB; "condo", "penthouse" or "apartment" → Condo; "landed", "terrace", "semi", "bungalow" or "gcb" → Landed; anything else → no checklist (CC:53–57).
- **F-286** Other regions reuse the same three buckets: UAE — "villa"/"townhouse" → landed, "commercial" → condo, everything else → hdb (meaning apartment); India — "villa", "independent", "row house", "bungalow" → landed, "bhk", "penthouse", "duplex" → hdb; Malaysia — "terrace", "semi", "bungalow", "townhouse", "landed" → landed, "apartment"/"soho" → hdb, "condo", "condominium", "serviced", "commercial" → condo (CC:33–51).
- **F-287** Stage is mapped from the project's stage text: "design", "planning", "in progress" → Design Phase; "execution", "construction", "installation", "renovation" → Execution Phase; "closed", "completed", "cancelled", "handover" → Handover & Close; anything else (including the real stages "Draft" and "Active") → no stage filter, all items shown (CC:60–66).
- **F-288** Data sets exist for Singapore (`src/data/sg-checklists.ts`, "Last verified: March 2026"), Malaysia, UAE, India and Egypt (`src/data/compliance/{my,ae,in,eg}/checklists.ts`); an unknown country returns "coming soon" with no items (`src/data/compliance/index.ts:21–87`).
- **F-289** Each item carries: id, category, stage, roles, property types, title, description, step list, regulation reference, authority, source link, severity, penalty, an `autoCreateTask` flag and a timing word (`before_permit`, `before_start`, `during_works`, `on_completion`) (`src/data/sg-checklists.ts:43–59`). The Singapore set has 61 items: 57 mandatory, 4 recommended, none "best practice"; 38 apply to HDB, 29 to Condo, 30 to Landed; 32 design, 23 execution, 6 handover; 43 flagged for auto-task.

### 6.4 What actually reaches a project today

- **F-290** On project creation, if the property type text contains hdb / condo / penthouse / apartment / landed / terrace / semi / bungalow, the first ten mandatory items for that type (in file order) each become a General task titled "[Compliance] {item title}", on the new project, assigned to the first project assignee or else the creator, with no due date and no notification (`src/components/projects/project-create-drawer.tsx:570–601`).
- **F-291** For an HDB project those ten are: Apply for HDB renovation permit · Engage HDB DRC-listed renovation contractor · Engage Licensed Electrical Worker (LEW) · Engage PUB Licensed Plumber · Engage BCA-trained aircon installer · Engage Qualified Person (QP) for wall demolition · Engage Licensed Gas Service Worker (LGSW) for gas works · Serve written notice to neighbours · Comply with HDB renovation hours · Complete renovation within time limit **[inferred from the file order and the rule in F-290]**.
- **F-292** Dashboard card "Compliance Alerts" (owner/admin): for each open project with a recognised property type it counts mandatory items not in `aiPlanMetadata.checklists.completedItems` or `skippedItems`, lists up to four projects as "{n} of {total} mandatory items pending", and opens `/projects/{id}?tab=planning` (`src/app/(main)/dashboard/page.tsx:70–128`).
- **F-293** The Gantt computes the five mandatory items for the selected milestone's phase (guessed from the milestone's name) into state that nothing renders (G:1846–1874; `complianceItems` is never read).

### 6.5 CaseTrust disclosure

- **F-294** `src/lib/casetrust-disclosure.ts` holds the copy, verbatim: title "CaseTrust Deposit Protection"; intro "This studio is a CaseTrust-Renovation accredited business. Your deposit is protected under the CaseTrust deposit-protection scheme up to the accredited amount. Please review the disclosure below before signing."; points "The deposit will be held in a CaseTrust-protected account." and "You may request reimbursement under specified conditions."; link `https://www.case.org.sg/casetrust-renovation` labelled "case.org.sg/casetrust-renovation" (lines 8–21).
- **F-295** It is not a project surface. It is shown to the client as a step in quote signing (`/sign/[token]`, when the region supports it and the studio has it on) and previewed for owners in Settings → Feature Flags; the client's acknowledgement is appended to the signature's audit trail (`src/app/sign/[token]/page.tsx:696–701`, `:1765–1772`; `src/app/(main)/accounts/feature-flags-tab.tsx:132–137`; `src/app/api/sign/[token]/submit/route.ts:318–323`).

### 6.6 Problems

- **F-296** The project checklist is dead code, yet three live things still depend on its state: nothing writes `aiPlanMetadata.checklists` any more, so the dashboard's pending counts can never fall and every open project with a property type stays on the alert card (F-292; no writer found in `src`).
- **F-297** The alert card's link (`?tab=planning`) opens a project page with no content (F-004).
- **F-298** The auto-tasks always come from the Singapore list, whatever the studio's country: the create drawer imports `getChecklistByPropertyType` from `@/data/sg-checklists` directly, so a UAE or India studio with an "Apartment" project gets Singapore condo tasks such as "[Compliance] Obtain MCST renovation approval" (`src/components/projects/project-create-drawer.tsx:42`, `:584`).
- **F-299** The auto-task rule ignores the data's own `autoCreateTask` flag and takes the first ten mandatory items instead, so "Comply with HDB renovation hours" (flag off) becomes a task while flagged items further down (waterproofing, water test, insurance) do not (F-290, appendix).
- **F-300** The auto-tasks have no link to the checklist item beyond the title text, no due date and no milestone; ticking the task does not tick the item and the reverse.
- **F-301** No "Best Practice" items exist in the Singapore data, so that chip would always show 0 (F-289, CC:307).
- **F-302** The component's stage mapping does not know the project's real stages ("Draft", "Active"), so on a live project it would show every phase at once (F-287).
- **F-303** The CaseTrust copy is duplicated: the signing page hard-codes the same sentences instead of importing the shared file, despite the file's comment that it is shared (`src/app/sign/[token]/page.tsx:1769–1772` vs `src/lib/casetrust-disclosure.ts:1–7`).

### 6.7 Appendix — the 61 Singapore checklist items (titles verbatim)

Columns: id · category · stage · applies to · severity · auto-task flag · title · authority · timing · line in `src/data/sg-checklists.ts`. Descriptions, step lists, references and penalties are in the file at the line given.

| # | Id | Category | Stage | Applies to | Severity | Auto | Title | Authority | Timing | Line |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | HDB_RENO_PERMIT | permits_approvals | design | hdb | mandatory | yes | Apply for HDB renovation permit | HDB | before_start | 190 |
| 2 | MCST_RENO_APPROVAL | permits_approvals | design | condo | mandatory | yes | Obtain MCST renovation approval | MCST | before_start | 216 |
| 3 | MCST_SECURITY_DEPOSIT | permits_approvals | design | condo | mandatory | yes | Pay MCST renovation security deposit | MCST | before_start | 241 |
| 4 | URA_PLANNING_PERMISSION | planning_permission | design | landed | mandatory | yes | Check if URA planning permission is required | URA | before_permit | 263 |
| 5 | BCA_BUILDING_PLAN | planning_permission | design | landed | mandatory | yes | Submit building plans to BCA | BCA | before_permit | 287 |
| 6 | SCDF_FIRE_SAFETY_PLANS | fire_safety | design | landed | mandatory | yes | Submit fire safety plans to SCDF | SCDF | before_permit | 311 |
| 7 | HDB_DRC_CONTRACTOR | professional_engagement | design | hdb | mandatory | yes | Engage HDB DRC-listed renovation contractor | HDB | before_permit | 338 |
| 8 | ENGAGE_LEW | professional_engagement | design | hdb/condo/landed | mandatory | yes | Engage Licensed Electrical Worker (LEW) | EMA | before_start | 364 |
| 9 | ENGAGE_LICENSED_PLUMBER | professional_engagement | design | hdb/condo/landed | mandatory | yes | Engage PUB Licensed Plumber | PUB | before_start | 388 |
| 10 | ENGAGE_BCA_AIRCON_INSTALLER | professional_engagement | design | hdb | mandatory | yes | Engage BCA-trained aircon installer | BCA | before_start | 411 |
| 11 | ENGAGE_QP_WALL_DEMOLITION | professional_engagement | design | hdb | mandatory | yes | Engage Qualified Person (QP) for wall demolition | HDB | before_start | 433 |
| 12 | ENGAGE_QP_LANDED | professional_engagement | design | landed | mandatory | yes | Appoint Qualified Person (QP) for landed works | BCA | before_permit | 455 |
| 13 | ENGAGE_LICENSED_BUILDER | professional_engagement | design | landed | mandatory | yes | Engage BCA-licensed builder for structural works | BCA | before_permit | 478 |
| 14 | ENGAGE_LGSW | professional_engagement | design | hdb/condo/landed | mandatory | yes | Engage Licensed Gas Service Worker (LGSW) for gas works | EMA | before_start | 500 |
| 15 | VERIFY_CONDO_CONTRACTOR | professional_engagement | design | condo | mandatory | yes | Verify contractor meets MCST requirements | MCST | before_permit | 523 |
| 16 | ENGAGE_PE_CONDO_STRUCTURAL | professional_engagement | design | condo | mandatory | yes | Engage PE/architect for structural modifications | BCA | before_permit | 545 |
| 17 | HDB_NEIGHBOUR_NOTICE | neighbour_notification | design | hdb | mandatory | yes | Serve written notice to neighbours | HDB | before_start | 572 |
| 18 | CONDO_NEIGHBOUR_NOTICE | neighbour_notification | design | condo | mandatory | yes | Serve neighbour notification per MCST rules | MCST | before_start | 595 |
| 19 | HDB_RENO_HOURS | noise_hours | execution | hdb | mandatory | no | Comply with HDB renovation hours | HDB / NEA | during_works | 621 |
| 20 | CONDO_RENO_HOURS | noise_hours | execution | condo | mandatory | no | Comply with condo renovation hours | MCST / NEA | during_works | 648 |
| 21 | LANDED_RENO_HOURS | noise_hours | execution | landed | mandatory | no | Comply with NEA construction noise regulations | NEA | during_works | 673 |
| 22 | HDB_COMPLETION_TIMELINE | noise_hours | execution | hdb | mandatory | yes | Complete renovation within time limit | HDB | during_works | 698 |
| 23 | HDB_WALL_HACKING_APPROVAL | structural_works | design | hdb | mandatory | yes | Obtain HDB approval before wall hacking | HDB | before_permit | 725 |
| 24 | CONDO_STRUCTURAL_RESTRICTION | structural_works | design | condo | mandatory | yes | No structural modifications without MCST + PE approval | MCST / BCA | before_permit | 751 |
| 25 | LANDED_FOLLOW_APPROVED_PLANS | structural_works | execution | landed | mandatory | no | Follow BCA/URA approved plans strictly | BCA / URA | during_works | 775 |
| 26 | HDB_WATERPROOFING | wet_works_waterproofing | execution | hdb | mandatory | yes | Apply waterproofing membrane in wet areas | HDB | during_works | 801 |
| 27 | HDB_WATER_TEST | wet_works_waterproofing | execution | hdb | mandatory | yes | Conduct water test after floor finish replacement | HDB | during_works | 824 |
| 28 | HDB_BTO_WET_AREA_RESTRICTION | wet_works_waterproofing | design | hdb | mandatory | yes | Check 3-year BTO wet area tile restriction | HDB | before_permit | 847 |
| 29 | CONDO_GAS_PIPE_CHECK | wet_works_waterproofing | design | condo | mandatory | yes | Check concealed gas pipe locations before hacking | EMA / City Energy | before_start | 870 |
| 30 | HDB_ELECTRICAL_PERMIT | electrical | design | hdb | mandatory | yes | Obtain electrical/aircon installation permit from HDB | HDB | before_start | 896 |
| 31 | LEW_ALL_ELECTRICAL_WORKS | electrical | execution | hdb/condo/landed | mandatory | no | Ensure all electrical work done by LEW | EMA | during_works | 918 |
| 32 | PUB_PLUMBER_ALL_WORKS | plumbing_sanitary_gas | execution | hdb/condo/landed | mandatory | no | Ensure all plumbing works done by Licensed Plumber | PUB | during_works | 945 |
| 33 | HDB_FLOOR_TRAP | plumbing_sanitary_gas | execution | hdb | mandatory | no | Use UPVC floor trap grating with long collar | HDB | during_works | 967 |
| 34 | GAS_SUPPLY_TERMINATION | plumbing_sanitary_gas | execution | hdb/condo/landed | mandatory | yes | Terminate gas supply before renovation works | EMA / City Energy | before_start | 988 |
| 35 | HDB_AIRCON_APPROVED_LOCATION | aircon | execution | hdb | mandatory | no | Install aircon at approved locations only | HDB | during_works | 1014 |
| 36 | HDB_AIRCON_REPORT | aircon | execution | hdb | mandatory | yes | Submit aircon installation report to HDB | HDB | during_works | 1037 |
| 37 | CONDO_AIRCON_PLACEMENT | aircon | execution | condo | mandatory | no | Install aircon condensers at MCST-approved locations | MCST | during_works | 1059 |
| 38 | HDB_WINDOW_AWC | windows_doors | design | hdb | mandatory | yes | Engage BCA Approved Window Contractor (AWC) | HDB / BCA | before_start | 1086 |
| 39 | HDB_FLOOR_THICKNESS | flooring | execution | hdb | mandatory | no | Comply with HDB floor thickness limits | HDB | during_works | 1114 |
| 40 | HDB_SOUND_INSULATION | flooring | execution | hdb | mandatory | no | Meet 8dB sound insulation requirement for flooring | HDB | during_works | 1136 |
| 41 | HDB_FALSE_CEILING | ceiling | execution | hdb | mandatory | no | Comply with false ceiling requirements | HDB | during_works | 1162 |
| 42 | HDB_COMMON_AREA | common_areas | execution | hdb | mandatory | no | Protect HDB common areas during renovation | HDB | during_works | 1191 |
| 43 | CONDO_COMMON_AREA | common_areas | execution | condo | mandatory | no | Protect condo common areas and follow MCST rules | MCST | during_works | 1213 |
| 44 | WASTE_NEA_LICENSED_COLLECTOR | waste_disposal | execution | hdb/condo/landed | mandatory | yes | Use NEA-licensed waste collector for debris disposal | NEA | during_works | 1242 |
| 45 | WICA_INSURANCE | insurance_compliance | design | hdb/condo/landed | mandatory | yes | Maintain WICA work injury compensation insurance | MOM | before_start | 1272 |
| 46 | PUBLIC_LIABILITY_INSURANCE | insurance_compliance | design | hdb/condo/landed | mandatory | yes | Maintain public liability insurance (min S$500,000) | HDB | before_start | 1297 |
| 47 | BIZSAFE_CERTIFICATION | insurance_compliance | design | hdb/condo/landed | mandatory | yes | Maintain bizSAFE certification | WSH Council | before_permit | 1320 |
| 48 | CONTRACT_PROGRESSIVE_PAYMENT | contract_commercial | design | hdb/condo/landed | recommended | yes | Structure progressive payment schedule (max 20% deposit) | CCCS / CASE | before_start | 1347 |
| 49 | CONTRACT_DEFECTS_LIABILITY | contract_commercial | design | hdb/condo/landed | recommended | yes | Include 12-month defects liability clause in contract | CASE / CaseTrust | before_start | 1372 |
| 50 | CASETRUST_ACCREDITATION | contract_commercial | design | hdb/condo/landed | recommended | no | Consider CaseTrust accreditation (or engage CaseTrust contractor) | CASE | before_permit | 1395 |
| 51 | WSH_WORKING_AT_HEIGHTS | worker_safety | execution | hdb/condo/landed | mandatory | no | Implement permit-to-work for working at heights | MOM | during_works | 1423 |
| 52 | WSH_GENERAL_SAFETY | worker_safety | execution | hdb/condo/landed | mandatory | no | Comply with Workplace Safety and Health Act requirements | MOM | during_works | 1448 |
| 53 | FIRE_SAFETY_DURING_WORKS | fire_safety | execution | hdb/condo/landed | mandatory | no | Maintain fire safety during renovation works | SCDF | during_works | 1477 |
| 54 | NPARKS_TREE_CONSERVATION | tree_conservation | design | landed | mandatory | yes | Check NParks tree conservation requirements | NParks | before_permit | 1504 |
| 55 | URA_CONSERVATION_AREA | planning_permission | design | landed | mandatory | yes | Check URA conservation area guidelines (if applicable) | URA | before_permit | 1533 |
| 56 | DEFECTS_LIABILITY_12M | handover_defects | closed | hdb/condo/landed | mandatory | yes | Monitor 12-month defects liability period | CASE / CaseTrust | on_completion | 1561 |
| 57 | DOCUMENT_DEFECTS_BEFORE_PAYMENT | handover_defects | closed | hdb/condo/landed | recommended | yes | Document and rectify all defects before final payment | CASE | on_completion | 1585 |
| 58 | MCST_FINAL_INSPECTION | final_inspection | closed | condo | mandatory | yes | Arrange MCST post-renovation inspection | MCST | on_completion | 1612 |
| 59 | LANDED_APPLY_TOP | final_inspection | closed | landed | mandatory | yes | Apply for Temporary Occupation Permit (TOP) | BCA | on_completion | 1634 |
| 60 | LANDED_APPLY_CSC | final_inspection | closed | landed | mandatory | yes | Apply for Certificate of Statutory Completion (CSC) | BCA | on_completion | 1658 |
| 61 | LANDED_FIRE_SAFETY_CERTIFICATE | final_inspection | closed | landed | mandatory | yes | Obtain Fire Safety Certificate (FSC) from SCDF | SCDF | on_completion | 1682 |

Category labels shown in the accordion (verbatim, `src/data/sg-checklists.ts:65–180`): "Permits & Approvals", "Professional Engagement", "Structural Works", "Wet Works & Waterproofing", "Electrical Works", "Plumbing, Sanitary & Gas", "Fire Safety", "Noise & Working Hours", "Air-Conditioning", "Windows & Doors", "Flooring", "Ceiling Works", "Common Area Protection", "Neighbour Notification", "Insurance & Compliance", "Contract & Commercial", "Worker Safety", "Handover & Defects", "Final Inspection", "Tree Conservation", "Planning Permission", "Waste & Debris Disposal".

---

## 7. Project team and workload (only as they bear on tasks and members)

- **F-304** "Project Team" is a card on the project's Overview tab, between the project info card and the Customer / Property pair, shown only to members allowed to edit projects; for everyone else it renders nothing (P:2177–2188, `src/components/projects/project-team-card.tsx:118–120`).
- **F-305** Card copy: heading "Project Team" with a people icon; "Designers added here can view this project. Commission splits auto-balance evenly across the team."; "Saving…" while a change is in flight; on a locked project a lock row "This project is locked. Unlock it to change the team." (`project-team-card.tsx:126–146`).
- **F-306** It reuses the leads' assignment control: a list of current designers each with a remove button (`aria-label` "Remove {name}") and a commission-split figure (tooltip "Commission split (auto-balanced; finalized at project creation)"), and a search box "Search by name or specialty…" over members tagged `id` (`src/components/leads/drawer-sections/assignment-section.tsx:165–217`, `project-team-card.tsx:69–72`).
- **F-307** Adding or removing a designer updates the list at once, re-splits commission evenly in basis points (the first member takes the rounding remainder) and saves; on failure the list reverts. Toasts: "{name} added to the project team", "{name} removed from the project team", "Couldn't add designer. Please try again.", "Couldn't remove designer. Please try again." (`project-team-card.tsx:27–32`, `:81–116`).
- **F-308** Being on the project team is what lets an `id`-only member see the project at all; being assigned to the lead does not carry over (P:2177–2181). There are no per-project roles: a team member is just a designer with a commission share.
- **F-309** Tasks and the team are unconnected: the task assignee lists offer every studio member, not the team (F-083); removing someone from the team does not touch their tasks on the project; and a task on the project does not make its assignee able to open the project.
- **F-310** "Workload" is a view on the projects list page, not on a project. It lists every member with "{n} active project(s)", a bar of their open projects (each a clickable segment, red with "⚠" when the health score is under 50), "Capacity: {n}%" against a fixed ceiling of four projects, and a label "✓ Has availability" (under 60%), "Moderate" (60–79%) or "⚠ Near capacity" (80% and above); members with none show "No projects assigned"; with no members, "No team members found" (`src/components/projects/workload-view.tsx:26`, `:40–58`, `:60–131`; mounted at `src/app/(main)/projects/page.tsx:405`).
- **F-311** Workload counts projects only. It does not count tasks, hours or dates, and the ceiling of four is a constant in the file (`workload-view.tsx:26`, `:47`).

---

## Uncertain / not verified

- Nothing was run. Everything marked **[inferred]** was worked out from code or class names: the blank page for an unknown `tab` (F-004), the tasks pane showing empty cards while loading (F-055), the table being clipped at narrower widths (F-077), the external name surviving a reassignment (F-084), the selections board showing "empty" on a failed load (F-154), number-field behaviour in the selection dialog (F-177), VO number collisions (F-178), and the exact ten HDB compliance tasks (F-291).
- F-121 and F-122 (the milestone dialog demoting In Progress tasks and reviving cancelled ones) follow directly from the code at G:3552–3579 but were not reproduced in a browser.
- F-239 (homeowner seeing the full drawing toolbar) rests on `canvas.tsx` having no role test and the server check being role-blind; the homeowner portal page itself was not read for an outer gate.
- Credits: this working tree has no credit ledger or credit checks at all (no match for `credit_ledger` or `studio_credit_balances` anywhere outside `node_modules`), so "no credits charged" in F-116 and F-264 is true for this branch only. If the credits system lives on another branch, the floor-plan and task-suggestion routes would need re-checking there.
- `FloorPlanEditor.tsx` (6,875 lines), the planner's dialogs and its AI routes were skimmed for a summary only, as instructed; individual behaviours in section 5.2 beyond the cited lines are not verified.
- `canvas.tsx` (2,175 lines) was read for tools, copy, keys and controls; stroke rendering, hit-testing and the stamp glyphs were not inspected.
- The homeowner portal's "Your to-dos" card for homeowner-assigned tasks (F-120) was not opened; whether it is behind a feature flag is taken from a type comment.
- Whether the homeowner response banner (F-006) surfaces selection answers was not checked; it belongs to the milestones reader.
- The side effects of approving each approval type (F-073) were not traced past the task row.
- The Malaysia, UAE, India and Egypt checklist files were not opened; only the Singapore list was extracted.
- How the three sub-tabs behave on a project in the Closed stage (read-only or not) was not traced; no stage test appears in the panes themselves.
- `floor-plan-collab/spec.md` reports "staging only" for its migrations; whether production has them is unknown.
