# Outcome — P-E · The record, the schedule & the handover (2026-10-10)

Her ask: **"let's build everything that's in 1.0 to 2.0 without losing anything … best user experience, cognitive load, and intuitiveness."**
Map rows built: PR-058 · PR-121 · PR-122 · PR-123 · SC-016 · SC-056 · SC-084 · SC-094 · UC-084 · TD-022 · TD-023 · MO-101 · CP-064 (studio side) ·
FB-055 (the call) · the door to FB-042 · FB-043 — plus the three wirings other packages asked of P-E (P-A's `invoice_sent` in a sheet's Undo, P-H's
*Ask Maison AI about this*, P-F's paused line in the studio's client pane). Register rows staged in `reg-P-E.md` (REG-P-E.1…14). Probe:
`design-source/verify/parity-map-build/verify-pm-e.cjs` (written, not run). `npx tsc` clean for every P-E file; `npx eslint` clean on them;
`npm run design:lint` ✓ nothing new (baseline untouched).

## Per map row

### PR-058 — Duplicate project
- **What:** the project's ⋮ › *Duplicate project* → the house Dialog: *Who is it for?* (Chips: *{client}, again* · *Another client* (house select,
  searchable, over the leads the viewer sees; a name two leads share reads with its phone) · *A new client* (name + the house `PhoneField`,
  `isSgPhone`)), ☑ *Copy the schedule* + *Works start* (today first), ☑ *Copy the signed quote as a new draft* — each only when there is one to copy.
  **2.0's shape over 1.0's:** every project has ONE lead (`projects.lead_id` unique), so the copy is always born on its own client record (a `direct`
  lead) copied from the chosen client — one rule for all three choices, nothing about a pipeline lead changes. Setting up; type, rooms, members
  (within the viewer's reach — a Designer's is theirs), value and split from the source (only for whoever sees the source's money, F-17 — else none,
  added on the copy); the schedule re-dated (`copyScheduleTo` — every milestone Not started and unanswered, words, colour, links, client flags and
  payment stages kept via `split:<n>`); the draft is the house copy (`duplicateQuote`) moved onto the new record (another client's: their name as
  title, no NRIC / second client). Lands on the copy with `?from=` the source; "Project P-… created" + **Undo** (removes the copy, its record, draft
  and Drafts; whoever made it, within 10 minutes, never once money is recorded — else "It's past its Undo — delete the project instead").
  Not copied (said in the dialog): tasks, files, updates, money recorded.
- **Files:** `app/projects/actions.ts` (`readDuplicateProject` · `duplicateProject` · `undoDuplicateProject`), `lib/projects/create.ts`
  (`copyScheduleTo` · `stageRefMap` · `logParityEvent`), `components/projects/project-dialogs.tsx` (`DuplicateProjectDialog`),
  `components/projects/ending/use-project-ending.tsx` (`openDuplicateProject` + its host), `components/projects/project-menu.tsx` (the row),
  `lib/leads/activity.ts` region P-E (`parity_e_duplicated` · `parity_e_duplicated_to`).
- **Check:** Dane on P-2026-002 › ⋮ › Duplicate project — all three choices; the copy's Overview (Setting up, its schedule's dates from the day
  picked), Project info's draft quote, Activity on both; Undo. Germaine (Designer, on the team): the copy is hers alone. 390: the sheet.

### FB-042 · FB-043 — the door to the project's commission
- ⋮ › *Commission* (the project's team / Managers / Owners / Admins — `canRename`, the frame's `d.mayChange`) calls P-C's `openProjectCommission`;
  `<ProjectCommissionDialog projectId={…} />` is mounted ONCE in `useProjectEnding`'s node (the frame renders it; the listing's host too, without
  an id). It reads `?commission=1` itself — **do not mount it again in the frame**. The listing's row ⋮ does not offer the two new rows (it passes no
  `project.id`; passing it there would offer them).
- **Naming:** the brief wrote "Duplicate project…" / "Commission…"; the menu's house rule (parity P-11 · Q-12) is *no "…" on any row* — kept.

### PR-121 · MO-101 — Vendors are paid
- A checklist row after the money rows, shown once the project has a PO or a bill; open while a bound PO or a bill on no PO has a balance (the one set
  of costs, `costsOf`); the sum only for Owners and Admins (`seesCostFigures`'s rule — F1-Q2), the count for anyone else; *Open Costs* → Money `#costs`
  (`ChecklistAction.hash`); deferrable like every row. Shalini's (closed POs, paid) reads met; Benjamin's (PO-2026-008 waiting, AquaFlow overdue) open.
- **Files:** `lib/projects/handover-model.ts`, `lib/projects/handover.ts` (`handoverFactsOf(…, { figures })`), `app/projects/ending-actions.ts`,
  `components/projects/ending/handover-dialog.tsx`.

### PR-122 · PR-123 — Costs and Margin at the close
- `closingSummaryOf` asks P-C's `closingNumbers` (Owners and Admins only; null for everyone else) and puts `closing` on the summary; `closingLines`
  adds *Costs* and *Margin* (value "--" + the grade's word until graded; caption "Expected n%"; P-C's `warning` as the caption and the alert tone when
  set). The Hand over sheet shows P-C's sentence as is in a quiet yellow strip above the summary (`.strip`, ending.module.css). The completed
  project's Overview card and Maison AI read the same lines. Client satisfaction: 1.0 never collected it — nothing to show.
- **Optional for K-N's card (not P-E's file):** the Overview's Closing summary card could draw `d.closing.closing?.warning` as the same strip; today the
  margin row carries it as its caption in the alert tone.

### FB-055 — Set commission at the close
- `complete()` (every completion path) calls `afterProjectCompleted(c.p.id, c.viewer.id)`; the task id rides on `HandoverUndo.commissionTaskId`, and
  `undoCompleteHandover` deletes that task (on the project, made since, not done) and its bell row. Demo: the studio's rule pays 3%, so no task appears
  until a studio sets No commission (the probe does, and puts it back).

### SC-084 · UC-084 — a share rings the studio
- `shareSchedule` (every share — Share changes, Share this change, the Mark done sheet's tick) notifies `schedule_shared` to Owners, Admins and the
  project's members, minus the sharer (`notify`) and minus whoever's ask it answered (they get today's "shared your schedule changes"); the Mark done
  sheet's Undo deletes the rows with its share.

### SC-094 — a variation order's days
- **General info** (VO only): *Adds days to the schedule* — `VariationDaysField` inside `GeneralInfo`, reading the order's id from the address and its
  value via `readVariationDays` (no new prop on the quote editor); locked once approved / completed / off the team, with why; saves on leave, puts the
  value back on a refusal. **Paper:** "Adds n days to the schedule" after the reason (`lib/templates/data.ts` `timelineDays`, `slices.tsx`) — so the
  client's confirmation link (`/confirm/[id]`, the same renderer) prints it too.
- **Schedule:** toolbar "+n days from changes" (`fetchScheduleData.voDays` ← `voDaysOf`); `VoDaysDialog` (`?vo=<id>` lands on it): Move the schedule
  (`moveForVariation` — the picked milestone n days longer, `moveWith` carries what follows; a Designer's press on a running stage files the ask for
  more time instead, "Ask for the days") · Not now (`notNowVariationDays`) · Undo (`undoVariationDays`). Answers are `parity_e_vo_days` lines
  (moved · asked · not_now) — the record, Activity's line, and what takes the order out of Needs you.
- **Needs you:** producer `vo-days` (appended to `NEED_PRODUCERS`, group *late*, neutral), header words "Move the schedule for VO-1", the Schedule
  tab's count. **Needs the loader's facts — see Needs from others 1.**
- **Files:** `components/quotes/editor/general-info.tsx`, `app/projects/schedule-actions.ts`, `lib/projects/schedule.ts`, `lib/projects/needs-you.ts`,
  `components/projects/schedule/{project-schedule,vo-days-dialog}.tsx`, `lib/templates/data.ts`, `components/templates/render/slices.tsx`.

### CP-064 — a paused milestone's restart (studio side)
- The panel, while Blocked: optional *Expected to resume* (`DateField`) → `saveMilestone` `resumeOn` (one sentence, Undo; checked to a real day);
  any status but Blocked clears it (`saveMilestone`, `setMilestoneStatus` — and their Undos put it back). `Milestone.resumeOn` (day number);
  `ClientRow.resume` ('yyyy-mm-dd') rides in a share made while Blocked (never a "change to share"; P-F reads `resume_on` live, so it is spare).
  The studio's *What {client} sees* pane prints P-F's `pausedLine` under a paused row.

### SC-016 — templates keep description · colour · links
- `TemplateItem` gains `description` · `color` · `follows` (positions; the first = the one its gap counts from; absent = the one before, today's
  rule). `itemsFromMilestones` / `draftsFromTemplate` / `templateItemOf` / `cleanItems` / `writeItems` / the copy action / `saveScheduleAsTemplate` /
  `createSchedule` (writes the words, colour and the further links) / rebuild (words, colour) / `spanOf` (from the layout). Editor: row ⋮ › *Details*
  (`ItemDetailsDialog`), the number wears the colour, the layout line says "waits on 1 and 3"; a move or remove re-points the links (`relink`) and
  the remove's Undo puts every row back.
- **Files:** `lib/projects/schedule-phases.ts`, `lib/projects/schedule.ts`, `app/projects/schedule-actions.ts`, `app/company/schedule-templates-actions.ts`,
  `lib/company/schedule-templates.ts` (the editor's loader — taken as part of "the schedule-template editor"),
  `components/company/templates/schedules/schedule-template-editor.tsx` (+ css).

### SC-056 · TD-023 · TD-022 — suggested tasks (a rule-based stand-in)
- NEW `lib/projects/task-suggestions.ts` (pure): phase by words (`phaseOfWords`), quote lines by trade (`phaseOfTrade`), each line as a task
  (`lineTask`), the practice table per phase grounded in 1.0's prompt (few-shot examples, SG compliance reminders) and trade practice;
  `suggestForMilestone` (≤ 8, quote first ≤ 4) and `suggestFromQuote` (sections → tasks, each into its trade's milestone, 6 a section).
- Panel › *Suggest tasks* → `SuggestTasksDialog` (computed in the browser from the schedule's own data) → `addMilestoneTasks`. Tasks › Add Task ▾ ›
  *Suggest tasks from the quote* (only once a signed quote with lines has something to suggest — read quietly on mount) → `QuoteTasksDialog` →
  `addQuoteTasks`. Undo `undoSuggestedTasks`. Activity `parity_e_tasks_suggested`. TD-023's "replace a milestone's tasks" + its approval step: not
  built — suggestions only ever add (nothing a studio wrote is replaced); 1.0's approval existed for AI-written sets.
- **STAND-IN:** no model is called; no credits. 1.0's silent canned fallback is gone — the list says plainly when it has nothing.

## Wirings asked by other packages (done)
- **P-A:** `lib/projects/schedule-moments.ts` `revertInvoice` deletes `invoice_sent` rows too.
- **P-H:** the panel's *Ask Maison AI about this* → `askMaisonAi({ text: 'What should I watch on {m}?', milestoneId, projectId })`.
- **P-F:** the Schedule's client pane shows `pausedLine` for a paused row (`ClientSchedule pausedLines`).

## Needs from others
1. **Orchestrator — `lib/projects/queries.ts` `fetchProjectDetail`, the `nf: NeedFacts` object:** add
   `voDays: mayChange && stage === 'in_progress' ? (await voDaysOf([p.id])).get(p.id)?.open ?? [] : [],` with
   `import { voDaysOf } from './schedule'`. Without it the Needs you row never shows (the Schedule's chip and dialog work regardless). The probe
   asserts the row and names this wiring.
2. **P-F (optional):** the portal's own VO row (lib/portal/documents.ts / the Money list) could say "Adds n days" from `quotes.timeline_days`; the
   confirmation link already prints it (the paper).
3. **K-N's card (optional):** the strip on the Overview's Closing summary card (above).
4. **Listing (optional):** `projects-table.tsx` / `project-cards.tsx` may pass `project.id` to `ProjectMenuItems` to offer Duplicate / Commission
   from the row ⋮ (both hosts already mount the dialogs through `useProjectEnding`).

## Repair text (for `scripts/repair-demo-data.ts`, then the baseline)
```ts
/* R-PE1 (parity map, SC-094 — P-E) a variation order's days: Ryan's approved VO-1 adds 3 days — the Schedule's "+3 days from changes" and its
   Needs you row "VO-1 adds 3 days — move what follows?"; Shalini's (completed) VO-1 prints "Adds 2 days to the schedule" on its paper. Idempotent:
   only an order with no days yet. */
{
  const vo = async (project: string, number: string) => (await db.select({ id: quotes.id }).from(quotes).innerJoin(projects, eq(projects.id, quotes.projectId))
    .where(and(eq(projects.number, project), eq(quotes.number, number), eq(quotes.kind, 'variation'), isNull(quotes.deletedAt))).limit(1))[0]?.id ?? null
  for (const [project, number, days] of [['P-2026-001', 'VO-1', 3], ['P-2025-001', 'VO-1', 2]] as const) {
    const id = await vo(project, number)
    if (id) await db.update(quotes).set({ timelineDays: days }).where(and(eq(quotes.id, id), isNull(quotes.timelineDays)))
  }
}
```
Check: `select q.number, q.timeline_days from quotes q join projects p on p.id = q.project_id where p.number in ('P-2026-001','P-2025-001') and q.kind = 'variation';`

## Probes
- **New:** `verify-pm-e.cjs` (BASE env, `<scratch.db> [shotDir]`, sqlite3 `-cmd ".timeout 30000"`, refuses local.db, snapshots and puts back every
  table it touches + deletes what it made; shots `pm-e-*` at 1440 and 390). Sets the studio rule to No commission for FB-055 and puts it back.
- **Existing, checked, unchanged:** `verify-pj-r7` (Benjamin's checklist asserts only its own rows; Shalini's every-item-met holds — her POs are
  closed and paid; the test project has no costs), `verify-pj-r1` (the phone sheet's Create group and Edit details at index 7 — the new rows come after
  Invite to Portal), `verify-pj-fix-E` (test projects with no costs), `verify-pj-r2` / `fix-B` (template rows' count and first input), `verify-pj-gap-a`
  (closing card rows by key). No assertion needed a deliberate change.

## Not finished / left
- TD-023's "Generate (replace) a milestone's tasks" and its approval for a non-owner: not built (suggestions only add; see above).
- Rebuild the schedule from a template keeps 2.0's placement (each new milestone after the row before) — a template's further links apply when a
  schedule is SET UP from it, not on a rebuild over an existing one.
- Nothing was run in a browser (the brief: no build, no servers); the pure rules were exercised with `tsx` (suggestions, the template layout with
  links, the vendors row, the closing lines).

## The probe's first runs (merged build, 2026-10-10)
`verify-pm-e.cjs` against the merged production build on :3133, a fresh copy of `base.db` each run — **58 passed, 0 failed**; the scratch DB
put back (every touched table's count as before). The failures on the way, and what changed:
1. *waitForURL timeout after Duplicate* — **probe**: the copy's address carries `?from=/projects/<source>`, so "the URL no longer names the source"
   never came true. Now it waits on the PATH (and asserts the `?from=` — Back returns to the source). The probe's snackbar locator is now the house
   host `[data-om-snackbar]` (another polite live region came last on the page).
2. *FB-055's bell row* — **probe**: Dane, the only Owner, completed it, and `notify` never rings whoever acts. An Admin (Hui Min) completes it now;
   Dane's row is asserted. The task itself was made, and the Undo took it back.
3. *Not now* — **probe**: the chip's words are uppercased by MetaChip's CSS; the match is case-blind now.
4. *CP-064's field* — **probe**: a date field is a trigger button (no `<input name>`); found by its label's name now, opened, Today picked.
5. **App (needs the rebuild):** the VO days dialog's default milestone is now the one under way first, then a paused one, then the next to start
   (`vo-days-dialog.tsx`) — the build in `.next` still picks a Blocked stage before the running one (Ryan: Electrical before Carpentry). The probe
   reads the dialog's own pick, so it passes on either build.
