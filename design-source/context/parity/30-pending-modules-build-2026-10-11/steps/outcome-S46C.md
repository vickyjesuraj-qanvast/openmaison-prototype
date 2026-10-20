# S46C · what a 1.0 user can't find, fixed — M2 · M3 · H2 · H4 · R1 — outcome (2026-10-19, lane C)

His ask (19 Oct): "Please go ahead and fix everything and make sure every pixel, feature and functionality is fixed", after the findability
audit (`design-source/context/parity/31-findability-audit-2026-10-19/`). Package S46C (`s46/plan-2026-10-19.md`) = M2 (Settings → Your
profile) · M3 (approvals on Tasks) · H2 (the Leads rail count) · H4 (District search, the mail link, the phone, Upcoming) · R1 (Deleted Leads'
30 days, archived leads in the port). His two open calls in this package (R1, H2) are taken **as recommended**, as the plan says. Built in lane C
(port 3175). Register rows: `steps/reg-S46C.md` (REG-S46C.1…10). Probe: `design-source/verify/pending-modules/verify-pm2-s46c.cjs` + its pure
half `pm2-s46c-pure.mts`. **No migration. Repair R176** (the demo's deleted leads inside the 30 days — R174 · R175 left for the other lanes;
renumber at landing if one collides).

## Pending lines ledger — every finding of the package

| # | Finding (the audit's words) | Status | Where |
|---|---|---|---|
| M2 | "A 'Your own settings → Your profile' line at the head of Settings" (N-3 · L-6) | **built** | `app/settings/module-head.tsx` — every module's head, every role: "Your own details, signature and notifications:" + **Your profile** (`/profile?from=<the module>`; Back says *Back to Settings* and returns to that module). One component, so all seven modules (Roles & access · Lead management · Meetings · Projects · Quotes & pricing · Finance · Notifications) carry it; the ghost too (`settings-ghost.tsx`). The ⌘K words "my settings" are S46A's. |
| M3 | "On Tasks, a line '3 approvals wait for you → Dashboard'" (L-2) | **built** | `components/tasks/approvals-line.tsx` on `/tasks` above the toolbar; the number is the Dashboard's own Needs your OK (`countApprovalsWaiting` → `fetchDashboard`); *Open Dashboard* → `/dashboard?from=/tasks`; never at 0 (a Designer / Accounting / Marketing with nothing to approve: no line). Ghost: reveal from the count, loader from `om.shape.tasks.approvals.n`, first visit from the seed `tasks.approvals`. The ⌘K words "approve · approvals" are S46A's. |
| H2 | "Decide whether Leads counts the viewer's unseen new leads" (N-6) | **built** (his call as recommended) | `railBadges` `'/leads'` (`countUnseenLeads`: `seen_at` null — the band and the Unseen scope — on leads the viewer sees); rail + phone dock, "Leads (n new)", 99+, lands on `/leads?scope=unseen` while it counts (T5); Marketing counts, Accounting has no item. Opening the lead clears it from anywhere (`markLeadSeen` from the lead's page, `app/leads/[id]/overview.tsx`). |
| H4a | "District isn't searchable" | **built** | `app/leads/workspace.tsx` — the search matches `leads.area` (the District column already marked it). |
| H4b | "the email isn't a mail link" | **built** | `components/leads/detail/info-column.tsx` — a `mailto:` link at every width, *Copy email* kept; the project's info column alike (one piece). |
| H4c | "the phone calls only on touch" | **kept** — a recorded rule | REG-746: on a touch screen the number is a `tel:` link; a mouse keeps plain text + Copy (a desk can't place a call — REG-1566's grammar "on a touch device it dials; at a desk it copies"). Probed both ways. |
| H4d | "Tasks has no *Upcoming* filter" | **built** | `components/leads/tasks/lead-tasks.tsx` — the *Upcoming* to-do chip (1.0's `plannedDate > today`: open, due after today) on **My Tasks** and the Unassigned scope, where Unassigned isn't — All / Studio Tasks keep Overdue · Due today · Unassigned, so a row never holds four; `?due=upcoming` lands on My Tasks with it on. |
| R1a | "Make the trash's sentence true or remove it" | **built** (made true — his call as recommended) | `lib/leads/purge.ts` `purgeExpiredLeads` (+ `splitKept`, Delete Forever's rule shared, `LEAD_TRASH_DAYS = 30`); `lib/services/sweep.ts` job `deleted-leads` (`/api/cron/deleted-leads`, daily 03:00, and inside `/api/cron/run`); lazily in `fetchDeletedLeads` (every listing load). Records what Delete Forever records — nothing beyond the removal. Repair **R176**: the demo's eight deleted leads (46–57 days old) now 25 · 19 · 14 days back, moving with the demo day. |
| R1a′ | "Check the other trash sheets' promises" | **checked — nothing to fix** | Deleted Quotes · Contracts · Files · the template libraries promise no removal (their Delete forever confirms are true on the press); Deleted Projects says "stay here until they are deleted forever" (true — no purge). Only the leads' promised a time. *Found on the way:* the import Review sheet's "Merge can be undone for 30 days" (mock copy, REG-63) has no undo — a promise, not a removal; flagged in REG-63 since day one, left for him. |
| R1b | "Land 1.0's archived leads somewhere honest (Lost, 'Archived in 1.0')" | **built** (developers' port; nothing visible) | `lib/port/archived-leads.ts` (pure): Lost + one Lost stage log, reason "Archived in 1.0", at `archived_at`, by the archive's activity-log member; never `deleted_at`; a lead already Lost keeps its own log, a lead with a project stays put; a system reason, never in `lead_reasons`. Map 02 §2's `archived_at` row corrected. FROM-1.0-TO-2.0.md's lines are the orchestrator's (below). |

## Built on the way (bugs found while building — fixed, not noted)

- **The to-do chips ran under the search box** whenever the row was narrower than its words (an expanded rail at 1440 — even with three
  chips —, a 1280 screen): the last chip slid behind the search. Now the row measures itself and, when the words don't fit, every chip says its
  glyph and count (as it already does ≤1024), its words in its tooltip and its name; the words come back once there is room (REG-S46C.8;
  `ScopePill compact`).
- **The phone's dock and More sheet read the rail's badges their own way** — Accounting's and Marketing's dock *Tasks* said "need attention"
  and opened every task; More › Tasks opened every task. One rule now (`badgeHref` · `badgeLabel`), REG-S46C.4.

## Calls taken as recommended (his "fix everything", 2026-10-19)

- **M2 for every role**, not only those who can't change the rules: an Owner looks for their own signature too, and one line is cheaper than a
  rule about who sees it. The *Kept in Company:* grammar (words, then the door), right under those links.
- **M3's number is the Dashboard's Needs your OK** (the group label's count), read through `fetchDashboard` itself — the two pages can never
  say different numbers. Note for him: the Dashboard counts *places* (a row per project, per library, Finance's To do), so "5 approvals" can
  stand for more asks inside them; the line follows the Dashboard rather than counting differently. If he'd rather both count asks, it is
  the Dashboard's group label to change (S46B's file) and the line follows by itself.
- **M3's line is the house info strip** (the read-only line's tint — what Settings uses to tell a member something about the page), the door at
  its end; no chip in the to-do row (those narrow the list; this leaves it). Cost: `/tasks` now reads the Dashboard (≈0.3 s on the demo, inside
  the 650 ms ghost beat — no visible wait).
- **H2 counts what the band counts** (`seen_at` null, any stage) so the number always equals the Unseen scope it opens (T5's rule) — in
  practice they are the New leads (the demo's two are New); words "n new". **Opening a lead anywhere marks it opened** — before, only the
  listing's press did, so a lead opened from ⌘K or the bell stayed "unseen" and would have kept the count.
- **H4c kept** (REG-746 is a recorded rule); **H4d's Upcoming on My Tasks**, where 1.0's own default tab put it, taking Unassigned's place
  rather than squeezing four chips into the row at 1440 (measured: 75 px short beside the Leads · Projects switch and the search).
- **R1a made true, not removed** — the mock's words stand, and a purge is what 1.0 lacked. A lead a project keeps stays past the 30 days, as
  Delete Forever leaves it (its row already says why).
- **R1b** — a system reason (like "Lead returned to Qanvast"), so the Lost dialog never offers it and a Settings rename never touches it.

## Found in 1.0, not on a card

- 1.0's Tasks › Approvals let an Owner **Approve / Reject inline and in bulk** ("Approve N items") from Tasks. 2.0 approves on each record and
  the Dashboard's rows open the record to read first (S-20, "never approved unread") — the line points there; no bulk approve is built
  (recorded call S-20).
- 1.0's **archive cancelled the lead's open tasks** (`cascadeLeadArchive`) and refused while a signing link was live unless forced — 2.0's
  Delete counts live signing links (REG-607); a ported archived lead's tasks are the tasks' own port (Cancelled → done).

## What to check in the browser (View as: Dane Owner · Germaine Designer · Priya Accounting · Nurul Marketing; 1440 · 390)

- `/settings` (any module) — the last line of the head; Your profile → Back to Settings returns to the module. 390: it wraps under its label.
- `/tasks` as Dane — "5 approvals wait for you on the Dashboard" (the Dashboard says *Needs your OK · 5*); Open Dashboard. As Germaine / Priya /
  Nurul — no line. My Tasks — *Upcoming · n*; All Tasks — Unassigned instead. Pin the rail open at 1440 — the chips go glyph-and-count.
- The rail's Leads — "2" (Chloe Tan, Rahul Menon), opens Unseen; open one from ⌘K — the count drops on the next page. The phone's dock alike.
- `/leads` — search "North East" finds Lim Wei Ling. A lead's email is a link; at 390 the number dials.
- `/leads` ⋮ › Deleted Leads — the 30-day line, the demo's eight deleted leads dated 24 Sep · 30 Sep · 5 Oct (on the 19 Oct base).

## Probes

- **pm2-s46c — 103/103** on a fresh copy of the repaired base (its pure half `pm2-s46c-pure.mts` 21/21 inside it); shots banked in `design-source/verify/pending-modules/pm2-s46c/` (01–13: the Settings line 1440 · 390, the Tasks line 1440 · 390, the rail and dock counts, the mail link, the Upcoming chip, the lead's contact at 390 · 768 touch, My Tasks at 390, Deleted Leads, the Tasks ghost film).
- Touched probes, each on a fresh copy of the repaired base in this lane, all green: the harness's **st-r1 58 · st-r2 30 · st-r3 30 · ux-p2 73 ·
  ux-p3 91 · ux-p6 57 · ux-p7 89 · kb-r1 35 · kb-r2 29 · first-run-ghosts 15 · first-run-empty 89 · first-run-full 6 · view-as 23 · overlays 67 ·
  search 27** (ghosts-strips · ghosts-film are capture tools — the Tasks and Settings films read one ghost, then the page, the line in place);
  **pm2-s01 80 · s05 114 · s08 70 · s10 107 · s14 69 · s16 56 · s17 130 · s18 63 · s22 116 · s26 107 · s31 104 · s34 180 · s41b2 206 ·
  s41b3 175 · s42a 89 · s43a 43 · s43e 45 · s44z 106 · s45c 120 · pj-fix-E 50** — 0 failures anywhere.
- `ghosts-same` 1440 and 390 touch on tasks · settings-* · leads · lead-overview: 0.00 % each.
- `npx tsc --noEmit` clean · `npx eslint` clean · `npm run design:lint` holds the baseline (no rule raised) · production build green.
- **Deliberate probe change:** `ux-build-2026-09-30/P6/verify-p6.cjs` clicked the rail's Leads by its exact name "Leads" and waited for
  `/leads$` — the item now says "Leads (2 new)" and lands on `?scope=unseen` while it counts; it finds the item by `data-kb="go.leads"` and the
  listing by its path (commented).

## Shared pieces changed

- `components/om/scope-pill.tsx` + `.module.css` — an optional `compact` (say `short` at any width); additive, no other caller changes.
- `components/shell/app-rail.tsx` · `mobile-nav.tsx` — the Leads entries in `BADGE_LANDING` / `BADGE_WORDS`, `badgeHref` · `badgeLabel`
  exported and used by the dock and More.
- `components/shell/list-ghosts.tsx` (`TasksListGhost({ approvals })`), `lib/ghost-shapes.server.ts` (seed `tasks.approvals`),
  `components/leads/tasks/tasks-toolbar.tsx` (the fit), `components/leads/tasks/lead-tasks.tsx` (`notice`, Upcoming),
  `app/leads/[id]/overview.tsx` (one effect), `app/leads/actions.ts` (`purgeListed` reads `splitKept`), `lib/leads/queries.ts`
  (`fetchDeletedLeads` purges first), `app/settings/settings.module.css` (one sibling rule).

## For other packages

- **Orchestrator — FROM-1.0-TO-2.0.md** (archived leads): line ~226 `Archive · Revive | Delete (soft) · Restore | leads, …` → for leads:
  "Archive · Revive → Lost (reason 'Archived in 1.0') · Resume"; line ~321 "1.0's archive and delete become `deleted_at`" → "1.0's delete
  becomes `deleted_at`; an archived lead becomes Lost ('Archived in 1.0'), never trash — Deleted Leads removes for good after 30 days"; line ~351
  `archived_at` → `deleted_at` → "`archived_at` → Lost + a Lost stage log (`lib/port/archived-leads.ts`)"; line ~595 "Archive and revive. Leads
  use soft delete with a reason instead." → "…Leads: an archived lead lands in Lost with the reason 'Archived in 1.0' (Resume brings it back);
  delete is soft for 30 days, then for good"; line ~734 "no archive: Delete is soft (`deleted_at`, `delete_reason`), with a Deleted Leads sheet"
  → add "removed for good after 30 days (`purgeExpiredLeads`, the sweep's `deleted-leads`)". §9/services: the sweep's job list gains
  `deleted-leads` (daily, `/api/cron/deleted-leads`) — `design-source/context/parity/30-…/services.md` lists the cron routes.
- **Orchestrator — the landing:** run `npm run db:repair` (R176) on `local.db` **before anyone opens `/leads`**, then `npm run db:baseline`:
  his local.db still has the demo's deleted leads 46–57 days old, and the first read of Deleted Leads would remove them for good (a Reset to base
  brings them back too, once the baseline is re-taken after R176).
- **S46A (⌘K):** M2's words ("my settings", "personal settings") on Your profile, and M3's ("approve", "approvals") on the Dashboard, as the
  plan says. Nothing of mine in `lib/global-search/*`.
- **S46B (the Dashboard):** the Tasks line reads `fetchDashboard().needs` (ok rows) — a new Needs-your-OK row on the Dashboard (e.g. tickets)
  is counted on Tasks by itself. If S46B changes what the group label counts, the line follows. The shell seed `tasks.approvals` reads only
  the rail's approval counts (cheap); a project-only approval may draw the loader's first-visit ghost without the line (the browser's memory
  corrects it after one visit).
- **Developers:** `purgeExpiredLeads` is the one rule for the trash's 30 days — a real scheduler calls `/api/cron/deleted-leads` (or `run`)
  with the cron secret; the port of archived leads calls `portArchivedLeads` and writes `stage_logs` with `INSERT OR IGNORE` on
  `archivedLogId(leadId)`.

## Principles check (DESIGN-PRINCIPLES.md)

1. **The mock wins; every exception written down** — met: the delete dialog's and the sheet's 30-day words (the mock's) are kept and made true;
   every invented word is in REG-S46C.1 · .2 · .7 · .10; the recorded REG-746 is kept, not overridden.
2. **One system, no one-offs** — met: the *Kept in Company:* grammar, the read-only line's strip, the house ScopePill (one additive prop), the
   rail's badge rule now shared by the dock, Delete Forever's own removal and rule for the purge, the sweep's job pattern, the ghost seed pattern.
3. **Plain words for studio people** — met: "Your own details, signature and notifications", "5 approvals wait for you on the Dashboard",
   "Leads (2 new)", "Upcoming", "Archived in 1.0".
4. **Nothing is lost** — met: a lead a project keeps never goes; the purge removes only what the trash promised to; 1.0's archived leads land in
   Lost, never in a trash that would remove them; the demo's deleted leads are moved inside the window rather than lost.
5. **Say why** — met: Deleted Leads already names the project that keeps a lead; the compact chips keep their words in tooltip and name.
6. **Back returns where you came from** — met: Your profile's Back returns to the module (its `?section=` and its own `?from=`); the Dashboard
   door carries `?from=/tasks` (the Dashboard is a rail page; the browser's Back returns).
7. **Every screen is whole** — met: the ghosts draw the Settings line and the Tasks line where the pages do (ghosts-same 0.00 %, the probe's
   held-reveal measure); no new empty or error state is needed.
8. **Every width is designed** — met: 1440 · 1280 · 768 touch · 390 touch · 320 with no sideways scroll; the chips' fit; the door is 44 px on
   touch; the line wraps under its label on a phone.
9. **Tables follow the leads listing** — not applicable (no new table).
10. **Motion with purpose** — not applicable (no new motion; the house pieces' own).
11. **Honest data** — met: the count is the band's own rule on the viewer's own leads; the approvals number is the Dashboard's; R176 backs the
   demo's trash with records inside the window; the purge is real, not a stand-in.
12. **Reach for everyone** — met: "Leads (2 new)" / "Tasks (1 overdue)" as names on the rail, dock and More; compact chips keep their full
   names; the mail link and the door are focusable with the house focus ring; G then L follows the item's landing as every key does.

"How to add a missing thing": one home (a line in an existing head, a line on an existing page, a chip in the existing row, a job in the
existing sweep); shown only when it applies (no line at 0, no count at 0, Upcoming only while it holds something and only where it fits); one
filled button per row untouched (the door is a text button); defaults need no set-up (nothing to configure).
