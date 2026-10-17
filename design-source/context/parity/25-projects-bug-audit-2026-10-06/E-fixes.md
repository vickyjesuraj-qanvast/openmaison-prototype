# E — the ending, the rules and the settings: outcomes (fix package `fix-E`, 2026-10-06)

Findings file: `E-ending-rules-settings.md` (32) + routed from `A-listing-and-project.md`: A-01, A-09, A-12. Register rows:
`design-source/context/parity/projects-build/reg-fix-E.md`. Repair: R76b. Probe: `design-source/verify/projects/verify-pj-fix-E.cjs`.

**Counts:** 32 E findings — 27 fixed · 2 fixed with a part owned elsewhere (E-17 Choices → C-16, E-19 Schedule head → B-29) · 3 owned by
another package (E-02 → D, E-16 → B, E-18 → A). Routed: A-01 · A-09 fixed; A-12 not a bug (REG-1022) with its bar copy fixed.
**Probes** (one build, each on its own fresh copy of the repaired scratch DB, :3124): fix-E 50/50 · r1 83/83 · r2 83/83 · r3 86/86 · r4a 72/72 ·
r4b 74/74 · r5 90/90 · r6 79/79 · r7 62/62 (two checks now assert fix-E's rules: the completed line, Delete refused in the lead's row) ·
r8 65/65 · r9 65/65. **Repair** R76b: all checks pass on a scratch copy of `local.db`, on a fresh baseline rebuild, and its three mends tested
on seeded bad states. After shots: `shots/E-after/` (from `design-source/verify/projects/fix-E/`).

| ID | Outcome | What changed (where) |
|---|---|---|
| E-01 | Fixed | Deleted Leads purges only what it lists and never a lead whose project still exists: `deleteForever` / `emptyTrash` → `purgeListed` (`direct = false`, keeps leads with any project row, live or deleted, and names them); one removal `lib/leads/purge.ts` `purgeLeads`, also used by `deleteProjectsForever` for a direct client (the only way it leaves). `fetchDeletedLeads` carries `heldBy`; the Empty Trash / Delete Forever confirms count the set they remove and name what stays (`components/leads/deleted-sheet.tsx`). Checks R76b. |
| E-02 | Owned by D | D-11 (money owed on a completed project). The completed bar's line now says payments stay open (`completedLine`), which D-11 also asks for — D should keep it. |
| E-03 | Fixed | Each checklist item carries `open` (its open phrasing); `complete` / the request store `openItemsOf(items)`; Activity reads older records through `openPhrase`; R76b rewrites stored ones (`lib/projects/handover-model.ts`, `app/projects/ending-actions.ts`, `lib/leads/activity.ts`). |
| E-04 | Fixed | `clearReviewRows` in `complete()` (approve, complete over a request), `sendBackHandover`, `reopenProject`; `actorId` on every handover `notify`; R76b deletes stale rows. |
| E-05 | Fixed | Lead page: for anyone but an Owner / Admin, Make the project again is the locked outlined button whose tooltip and press say `remakeRefusal` — no confirm (`app/leads/[id]/overview.tsx`); server says the same. |
| E-06 | Fixed | Activity drops links into projects no longer on record (to the lead's Overview); `project_created.remade` → "You made the project again — …" (`lib/leads/activity.ts`, `lib/projects/create.ts`, `remakeLeadProject`). |
| E-07 | Fixed | `directProjectOf` finds a deleted project too, so the client's address goes to the project's address → the listing with E-28's line (`lib/projects/queries.ts`). |
| E-08 | Fixed | Several leads, one holder: "{Name} has a project. Delete the project first — nothing was deleted." (`leadHasProjectNamed`); the bulk dialog already names held leads and deletes only the others (A-09). |
| E-09 | Fixed | Delete Forever / Empty Trash purge the others and answer "{n} deleted forever — {Name} stays: its project is live" with Open project (or "…{P-…} is in Deleted Projects" with Deleted Projects; the confirm adds "delete it forever there first"); a held row's Delete Forever is disabled with the reason (`app/leads/workspace.tsx` `purged`, `deleted-sheet.tsx`). |
| E-10 | Fixed | The lead's ⋮ Delete is disabled with "Has project P-… — delete the project first" (REG-728); `DeleteLeadDialog` refuses a held lead up front with Q-27's sentence and Open project in place of Delete. |
| E-11 | Fixed | House foot: below 360 a foot with a FootStart wraps and the start keeps its width (`components/om/dialog.module.css`). |
| E-12 | Fixed | The bar's Review is outlined (`handover-bar.tsx`). |
| E-13 | Fixed | A Designer / Manager with items open presses "Ask an Owner or an Admin" — the request is filed whatever the setting (`completeHandover`), lands in the bell with the open count; Who may do what's "Complete a handover with items open" reads "Submits for approval — …". |
| E-14 | Fixed | Review switched off while a request waits: the asker's bar offers Complete handover beside Take it back; the dialog completes it ("The owner's review is off now — complete it yourself, or take the request back"). |
| E-15 | Fixed | Handover review, Updates review and Schedule defaults save with Undo, replaced in place by `key`. |
| E-16 | Owned by B | Same finding as B-27 (Save as a template on a completed project's ⋮, `project-schedule.tsx:233`). |
| E-17 | Fixed (Choices: owned by C) | Milestone panel says `completedBlock` once at the top (`ReadOnlyNote`, `readOnlyWhy`); Money's empty Variation orders line reports on a completed project. Choices' empty state = C-16 (C). |
| E-18 | Owned by A | Same finding as A-13 (listing row / card Rename without `canRename`). |
| E-19 | Fixed (Schedule head: owned by B) | Status card: "Took n days", Completed reads done on its date. The Schedule's head / To handover tile / Next payment = B-29 (B). |
| E-20 | Fixed | Bell events `project_completed` · `project_reopened` (model, defaults, both message templates); emitted to the team (not the actor; the asker hears "approved"). |
| E-21 | Fixed | Needs my review rows read `reviewLine` ("Handover to review — Sarah asked · 2 updates to review …"); the reviewer's menu help reads "Sarah asked on 6 Oct ’26" (`ends.requestedBy/At`). |
| E-22 | Fixed | Reach `submit-team` / `submit-own`; rows "Take back a handover request" and "Make a Won lead's project again…"; Updates link → `#update-settings` (card id added). |
| E-23 | Fixed | Bar: note quoted and closed; "Ask again when it's ready." only for whoever asked (`sentBack.mine` from the event); Activity: "Dane sent Sarah's handover back — …". |
| E-24 | Fixed | `completedLine`: "Completed on … by Dane — “note”. Four items were still open: “reason”. Its schedule, choices and money are read-only until you reopen it — payments, updates, tasks and its team stay open."; Activity adds the note. |
| E-25 | Fixed | Reopen help names choices. |
| E-26 | Fixed | Number under the name; Restore's refusal `RESTORE_RULE`; phone rows labelled, box beside the name; the Deleted sheets' empty phone strip removed at its cause (`deleted-contracts-sheet.module.css`). |
| E-27 | Fixed | Refused dialog titled "This project can't be deleted". |
| E-28 | Fixed | Deleted addresses (page, tab, file) → `/projects?deleted=<id>`; the listing says "P-… is in Deleted Projects" once with Open (the sheet) — only to a viewer who may see it. |
| E-29 | Fixed | "A Designer or a Manager asked to complete a project — …". |
| E-30 | Fixed | Schedule defaults by id (repeated names numbered); `setProjectNumbering` answers `{ error: SETTINGS_RULE }`, said in the snackbar. |
| E-31 | Fixed | `useRun` refreshes the page after a "This/The project is complete…" refusal. |
| E-32 | Fixed | Checklist's action head named for screen readers; the bar is a labelled region, only its sentence is a status. |
| A-01 | Fixed | `projectHold` in the stage policy: On Hold / Lost read disabled in the stage menu and LEAD STAGES with "Has project P-… — it stays Won", the kanban drop springs back with it, Return Lead is not offered; `moveStage` · `quickMoveStage` · `undoStageMove` answer `{ error }` (callers say it); R76b undoes a parking made before the rule (back at Won). |
| A-09 | Fixed | `LeadRow.project`; the lead ⋮ / listing row / kanban card Delete disabled with the reason, plus Open project; the bulk dialog names the held leads and deletes the others. |
| A-12 | Not a bug — REG-1022 (tasks, files and updates stay open after completion); the team stays open too (an Owner reassigns a completed project's money follow-ups). Fixed the part that was wrong: the completed bar now says what stays open. |
