# Package I — workload, compliance and AI on projects: outcomes (gaps build, Phase B, 2026-10-08)

Running file (protocol §5). Calls: `i-read.md` (I-Q1…I-Q18). Register rows: `reg-i.md`. Repair: R87. Probe:
`design-source/verify/projects/verify-pj-gap-i.cjs`. Port 3130.

Status words: **Built (code)** = written, `tsc` clean · **Verified** = the probe passed on it at 1440 and 390.

| # | Item | Outcome | What / where |
|---|---|---|---|
| 1 | Workload view on the listing (I-Q1…Q5) | Verified | `members.project_capacity`; pure `lib/projects/workload.ts` (`workloadOf` · `stateWords` · `workloadPeople` · `seesWorkload` · `setsCapacity`), `lib/projects/workload-queries.ts` (`fetchDefaultCapacity` · `workloadFor` → `ProjectsListData.workload`), actions `app/projects/workload-actions.ts` (`setDefaultCapacity` · `setCapacities`, Undo = the answer's `before`); `components/projects/workload/*` (`WorkloadView` · `CapacityDialog` · `WorkloadGhost` · `WorkloadComplianceSettings`); the toolbar's List · Workload toggle (`SegmentedIconToggle`, `?view=workload`), the listing ghost reads it; Settings › Projects › Workload. |
| 2 | Projects › Insights (I-Q6, Q7) | Verified | `/projects/insights` (page · loading); pure `lib/projects/insights-model.ts` (`projectsReport` · `daysWords` · `INSIGHT_RANGES`), server `lib/projects/insights.ts` (`fetchProjectInsights`: Who sees leads, a Manager's team, money for Owners/Admins); `components/projects/insights/*` (view on Leads Insights' stylesheet, composed; ghost); the listing's ⋮ Insights and the Workload view's Insights. |
| 3 | Compliance tab on a project (I-Q8…Q10) | Verified | Data `lib/compliance/sg-checklist.ts` (61 items, generated from 1.0's file) · `studio-actions.ts`; rules `lib/compliance/model.ts`; reads `lib/compliance/queries.ts`; table `project_compliance`; actions `app/projects/compliance-actions.ts` (`setComplianceItem` · `undoComplianceItem`); tab `compliance` (lib/projects/tabs.ts, after Floor plan; count = mandatory to do this phase), `components/projects/compliance/*` (tab, ghost); Activity branch + chip; event kinds `project_compliance_*`. |
| 4 | Compliance starter tasks + Settings switch (I-Q11) | Verified | `lead_tasks.compliance_item`; `lib/compliance/starter.ts` `addComplianceTasks` from `afterProjectRow` (lib/projects/create.ts); `lib/compliance/sync.ts` `syncComplianceFromTasks` hooked into `updateTask` · `setTasksDone` · `undoTasksDone` (app/leads/tasks-actions.ts) and `completeTask` (app/leads/actions.ts); Settings › Projects › Compliance switch (`setStarterTasks`, settings `compliance_starter_tasks`). |
| 5 | Compliance Navigator in Tools (I-Q12) | Verified | `/compliance` (layout · page · loading · error) on `CompanyShell` (crumb Tools; Your studio · Rules by home); `components/compliance/*` (navigator, ghost); `lib/compliance/studio-actions.ts` (1.0's five, `fillStudio`); `setStudioAction` · `undoStudioAction` (settings `compliance_studio`, Owners/Admins); the Tools tile live; ⌘K pages. Shared row `components/projects/compliance/item-row.tsx`. |
| 6 | AI-drafted timelines (I-Q13…Q15) | Verified | Pure `lib/projects/schedule-ai.ts` (`draftTimeline`: permits by kind, stages sized by lines, why, Worth knowing); `ScheduleSource` `{ ai: { quote, skip } }` in `draftsFor` (app/projects/schedule-actions.ts) → `createSchedule` · `rebuildSchedule`; `QuoteSource.items` · `ScheduleData.scope` (lib/projects/schedule.ts); SourcePicker's *Drafted by Maison AI*; `components/projects/schedule/ai-draft.tsx` (the review: ticks, why, notes) on the Start card and in the Rebuild dialog; Schedule ⋮ *Draft with Maison AI…*; `?draft=ai`. |
| 7 | Maison AI acting on projects (I-Q16…Q18) | Verified | `lib/maison-ai.ts` (`MaisonSuggestion` = words or `{ run · answer · propose }`, `resolve` at press time); `components/shell/maison-answer.tsx` (answer / proposal panel) in `AiSheet`'s new `panel` slot, driven by `components/shell/maison-ai.tsx`; reads + one write `app/projects/maison-actions.ts` (`lateMilestones` · `nextStepTask` · `addNextStepTask` · `draftWeekUpdate` · `complianceToDo` · `teamNames`); the project page `components/projects/use-project-maison.ts`; the listing (Find late milestones · Open … · review scope · Who has room); Insights and the Navigator. |
| 8 | Demo data R87, Activity, search, settings rows | Verified | R87 in `scripts/repair-demo-data.ts` (capacities · four checklists answered with their lines · Marcus's starter tasks, two done) + six checks; passes twice (20 records, then 0). Activity branch + chip; ⌘K: Workload · Project insights · Compliance Navigator · two settings cards; no new bell events (I-Q10). |

## Progress log
- Sync done; base tree `pkg-i/base-tree.txt` = a8c0fa1ad900343ae914309978e1fe00d5c5e9de. node_modules cloned; scratch DB `pkg-i/test.db`.
- Short read written: `i-read.md` (calls I-Q1…I-Q18).
- Schema (all at once): `members.project_capacity`, `lead_tasks.compliance_item`, table `project_compliance` (both baseline lists). Migration generated locally as `drizzle/0079_clammy_greymalkin.sql` (renumber at the merge), applied to the scratch DB.
- Items 1, 3, 4 written; tsc clean.
- Items 2, 5, 6, 7, 8 written; tsc clean, eslint 0 errors, design:lint holds. R87 passes twice on the scratch DB (20 records, then 0); `pkg-i/repaired.db` kept.
- Production build green; `verify-pj-gap-i.cjs` **75 / 75** at 1440 and 390 (`isMobile`, `hasTouch`; no sideways scroll) on a fresh copy of the repaired DB, the DB put back as it was. Shots banked under `design-source/verify/projects/gap-i/` (15). After it: the late tile counts both kinds of late, a rebuild's kept rows show their own dates, the steps and the proposal's lines wear their bullets; four *Who may do what* rows appended (lib/settings/permissions.ts).
- R87: Aisha's public-liability insurance item left to do (its title carries "S$500,000", which fix-D's D-04 reads as a money line on Sarah's
  view of Aisha's Activity — the data changed, not the probe). On a fresh copy of the wave's newer base.db (H merged): 233 records, then 0.

## Regressions (each on a fresh copy of the repaired DB, against this package's production build on :3130, AUTH_SECRET set as E served)
r1 83/83 · r2 83/83 · r3 86/86 · r4a 73/73 · r4b 75/75 · r5 90/90 · r6 79/79 · r7 62/62 · r8 65/65 · r9 65/65 · fix-B 53/53 · fix-C 49/49 ·
fix-D 35/35 · fix-E 50/50 · fix-F 44/44 · gap-a 66/66 · gap-b 72/72 · gap-c 96/96 · gap-d 64/64 · gap-e 54/54 · gap-f1 81/81 · gap-f2 73/73 ·
gap-g 67/67 · **gap-i 75/75**. No existing probe changed. tsc clean · eslint 0 errors (9 old warnings) · design:lint holds every count.

## Notes for the merge and the other packages
- **Migration:** `drizzle/0079_clammy_greymalkin.sql` (+ `meta/0079_snapshot.json`, journal entry) — `members.project_capacity`, `lead_tasks.compliance_item`,
  table `project_compliance` (both baseline lists). Renumber at the merge: the wave's base.db refreshed at 13:06 (package H merged) carries a later
  migration, so drizzle skips this one on it — applied by hand there, R87 passes (233 records, then 0; its six checks pass). On that base the only
  failing check is *event with an unknown kind* for H's `project_ticket_*` kinds, which this worktree's list doesn't know — append both lists.
- **Shared files touched (append-only):** `lib/db/schema.ts` (two columns appended inside `members` and `lead_tasks`, one table at the end),
  `lib/db/baseline.ts` + `scripts/snapshot-baseline.ts`, `lib/leads/events.ts` + `lib/projects/events.ts` (kinds `project_compliance_*`, detail
  `item` · `n`), `lib/leads/activity.ts` (group `compliance`; the compliance branch inserted just before round 1's catch-all `project_` branch),
  `lib/projects/tabs.ts` (tab `compliance` after Floor plan; chip `compliance`), `scripts/repair-demo-data.ts` (R87 before the checks; six checks
  appended; four kinds appended to the unknown-kind list), `lib/global-search/model.ts` (five pages appended), `lib/settings/permissions.ts`
  (four rows appended), `app/settings/projects-settings.tsx` + `settings-view.tsx` + `page.tsx` (one prop `projectsI` / `gapsI`, the card last).
- **Lines changed in others' files (minimal):** `lib/projects/queries.ts` (the tab count `compliance`; `...workloadFor(viewer)` at the end of
  `fetchProjectRows`), `lib/projects/model.ts` (`ProjectsListData.workload?`), `lib/projects/create.ts` (`afterProjectRow` calls
  `addComplianceTasks`), `lib/projects/schedule.ts` (`QuoteSource.items`, `ScheduleData.scope`), `app/projects/schedule-actions.ts` (`ScheduleSource`
  `{ ai }` and its branch in `draftsFor`), `app/leads/tasks-actions.ts` (`syncComplianceFromTasks` after `updateTask` · `setTasksDone` ·
  `undoTasksDone`), `app/leads/actions.ts` (`completeTask`), `components/projects/schedule/{source-picker,start-schedule,rebuild-dialog,project-schedule}.tsx`
  (the Maison AI way; `?draft=ai`; ⋮ *Draft with Maison AI…*), `components/projects/{projects-workspace,projects-toolbar,projects-ghost,project-ghost,project-frame}.tsx`
  (the view toggle, the Workload view, its ghost, the Compliance ghost, the acting suggestions), `components/shell/tools-popover.tsx` (the tile's
  href), `lib/forms.ts` (`MSG.capacity`), `lib/maison-ai.ts` + `components/shell/maison-ai.tsx` + `components/leads/ai-sheet.tsx` (suggestions
  that act; the sheet's optional `panel`) — every existing `useMaisonAi(string[])` caller works unchanged.
- **For H and later packages:** `useMaisonAi` now takes `MaisonSuggestion` (words, or `{ label, run | answer | propose }`) — a page can make its
  suggestions act the same way. A new project's starter tasks come with a `task_assigned` bell row for the team ("{n} compliance tasks for
  {client}") — a probe counting the studio bell after New project or Won meets it.
