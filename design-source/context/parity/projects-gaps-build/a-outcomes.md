# Package A — the project record: outcomes (gaps build, 2026-10-07)

Running file (protocol §5). One row per item in `brief-a.md` → Built (what, files) · Not built (why) · Moved. Register rows:
`reg-a.md` (this folder). Repair: R78. Probe: `design-source/verify/projects/verify-pj-gap-a.cjs`. Port 3121.

Status words: **Built (code)** = written, `tsc` clean, `eslint` 0 errors, `design:lint` holds, production build compiles; **Verified** = the
probe passed on it at 1440 and 390.

| # | Item | Outcome | What / where |
|---|---|---|---|
| 1 | Edit a direct project's client and property; project type on any project | Built · Verified | `editProjectDetails` (app/projects/actions.ts): a direct project's name · phone · email · property type · address · district · floor area · style with the lead form's checks; diff to `project_client_edited` (Activity line), `movePortalSignIn` when the phone moves (G-02); project type + scope on any project (`project_edited`); a default name follows the client / property type. A Won project's client stays on its lead (refused on the server, the card links there). UI: `ProjectDetailsDialog` (components/projects/project-record-dialogs.tsx), the Client and property card's Edit link + pressable rows (project-overview.tsx), wired in project-frame.tsx. |
| 2 | On hold (M-01) | Built · Verified | Columns `projects.on_hold_at` (timestamp_ms) · `on_hold_reason` · `on_hold_until` (day ms) · `on_hold_by` + `lib/projects/hold.ts` (`holdOf`, words). Actions `putProjectOnHold` (also changes a hold) · `resumeProject` · `undoHoldChange` (Undo on both); Start refused while on hold; Complete clears it. Listing: "On hold" tag beside the stage (`StageTag hold`, tooltip with since/reason/resume), scope "On hold" (scopes.ts; shown when used), row/card menu Put on hold… / Resume / Change the hold…. Overview: Status head "On hold", a hold row (since · reason · resumes) with Resume + Change the hold; header chip. Attention pauses (`HOLD_KEEPS`: tasks overdue, payment overdue, + `hold_resume` once the day comes); primary action Resume (`PRIMARY_ACTIONS.unshift`); milestone reminders stop; bell `project_hold_due` (derived, lib/notifications/queries.ts + model + templates); Activity lines `project_put_on_hold` · `project_resumed`; Who may do what row. |
| 3 | Notes & Logs + Questionnaire on a project (M-02); bank on New project; first note | Built · Verified | `PROJECT_TABS` + notes · questionnaire (`lead:` so lead links map onto the project); tab branches in app/projects/[id]/[tab]/page.tsx; `LeadNotes base` (components/leads/notes/lead-notes.tsx — 5 links). New project copies the enabled question bank and writes the optional first note in its transaction. Activity chip "Notes". The Status card's questionnaire wait opens the project's tab. |
| 4 | Closing summary | Built · Verified | Pure `closingSummary` · `closingLines` · `daysLine` · `refundDueOf` (lib/projects/handover-model.ts), server `closingSummaryOf` (lib/projects/handover.ts — money only through `moneyInputOf`/`moneyOf`, only for whoever sees money). Shown in the handover dialog (card table "Closing summary") and as a "Closing summary" card on a completed project's Overview (+ its ghost). |
| 5 | Handover checklist: defer with reason; refund-due check | Built · Verified | Defer per open item with its own reason (`deferralsOf` · `allDeferred` · `deferredReason`; `projects.handover_deferred`); every open item deferred = no general reason asked; who completes with items open is unchanged (Owner/Admin, else the request carries the deferrals to the reviewer). Stored on the record, named in the completed line (`completedLine`) and in Activity. Refund-due item `refund` when collected > contract. |
| 6 | Getting started: Contract step | Built · Verified | `GETTING_STARTED` + `contract` (after Contract value; done = linked / signed on the client / a file in Files › Contract; a completed project asks no more). `ProjectContractDialog`: link the client's signed contract (`linkProjectContract`) or upload the signed copy (`contractFolderFor` + the Files tab's `uploadPicked`). Key documents opens an uploaded contract. |
| 7 | Scope, floor area, style | Built · Verified | `projects.scope` (JSON, `ROOMS` = 1.0's twelve) on New project and the card; floor area + style asked by New project, shown and edited on the card (lead row). |
| 8 | Listing: Project type column, sort by team, export | Built · Verified | `projectType` column (Column settings, off by default), Team sorts by its first member, export adds Property type (Project type rides as a column); Stage sorts on-hold after running. |
| 9 | New project's team picker | Built · Verified | `AssigneeField rowMeta` (specialty · n projects running) + `suggestion` (the Assign popover's card, `suggestMember`); `ProjectsListData.memberLoad` / `memberStats`. |
| 10 | Duplicate project names | Built · Verified | `DUPLICATE_NAME` refused by `createDirectProject` and `renameProject` (live projects, case/space-insensitive); New project has a Project name field (follows the default until typed) and says the refusal on it. |
| 11 | Error pages | Built · Verified | `components/shell/route-error.tsx` (+ css); `error.tsx` in leads · projects · tasks · quotes · contracts · settings · company · quote-x-ray · qanvast-ops · visualizer (shell kept), `(editor)/error.tsx`, `app/error.tsx`, `app/global-error.tsx`. |
| 12 | Counts on the project's tabs | Built · Verified | `Tabs` item `count` (DS Badge count, components/om/tabs.tsx + css); `ProjectDetail.tabCounts`: Tasks open · Money unpaid (whoever sees money) · Updates in review (reviewers). |
| 13 | New project is atomic | Built · Verified | `createDirectProject`: lead + team + bank questions + first note + project row (number marked, `project_created`) in ONE transaction (`writeProjectRow(tx)`, `markNumberGiven(…, tx)`; reads first); Drafts + bell after commit (`afterProjectRow`). |

Demo data R78 (scripts/repair-demo-data.ts): Aisha Rahman's project on hold (reason, resumes 16 Nov ’26, its line); Marcus Teo's direct project: floor area, style, a note and a WhatsApp log; scope on Ryan's and Marcus's; seven checks. Passes twice on a copy of base.db (8 changes, then 0).

## Progress log
- Sync done; base tree `pkg-a/base-tree.txt` = 1656b18909a3c29bbd70f512dc7fba0b82e1bc0a. Migration generated locally as 0071 (renumbered at the merge).
- All 13 items written; tsc clean, eslint 0 errors, design:lint holds; production build compiled (15 min). Next: register rows (`reg-a.md`), serve on :3121, probe `verify-pj-gap-a.cjs`, re-run the Projects probes.
- Looked at the first build at 1440 (listing, Aisha, Shalini, Marcus, Notes): fixed the listing's second tag overflowing the 128 Stage column
  (now a `pending` glyph with its tooltip + "On hold till …" on the row's second line), the hold reason truncated in the Status card (now a
  quoted note under the row, REG-212), the floor area / style caption, Collected's glyph. `reg-a.md` written (16 rows). Probe written; rebuilt;
  helper scripts in `pkg-a/` (build.sh · serve.sh <db> · run-node.sh <script> …). Probe run on `pkg-a/probe.db` (a fresh copy of repaired.db).
- Probe run 1: 42 passed, 4 failed — all four the probe's own (a refusal's lowered first letter, the waiting line read as a reason, a `$` the
  shell ate, the team-sort check); fixed. The probe leaves the DB as found (`pkg-a/dbstate.sh` diff: none).
- `verify-pj-fix-B.cjs` changed where my rule changed what it asserts: R78 holds Aisha's project, so her one action is Resume (REG-a.2); its
  Aisha section now runs her un-held and puts the hold back in `finally`.
- Probe run 2: 62 passed, 3 failed — the team-sort check counted the probe's own throwaway rows; the error check broke a table the SHELL
  reads (the rail's count), so the root's notice (no shell, "Go back") answered — correct by Next's rule (a layout's failure goes to its
  parent's boundary). The probe now breaks a table only the page reads (the shell kept, Back to Projects) and checks the root's notice too.
  "Change the hold" now opens unfocused (an edit, REG-224). Rebuilding.
- Probe run 3: **66/66** (1440 + 390). Looked at the 390 shots: the hold row's name was cut beside its date and Resume — the row now says
  since when with Resume, and "Resumes 16 Nov ’26. “reason” — Aisha reads this…" wraps under it; the closing summary's Days row was cut — the
  figure is the value ("50 days"), the plan its caption ("2 more than the 48 planned"). The probe now also removes its new project's Drafts (the
  sqlite3 shell cascades nothing). Rebuilding for the final pass, then the Projects regression (`pkg-a/run-all.sh`).
- Final build: **gap-a 66/66** (shots banked in `design-source/verify/projects/gap-a/`, 15), r1 83/83; the regression runs on (results in
  `pkg-a/regress/summary.txt`).
- Regression so far (each on a fresh copy of repaired.db, :3121): r1 83/83 · r2 83/83 · r3 86/86 · r4a 73/73 · r4b 75/75 · r5 89/90 · r6 79/79 ·
  r7 62/62 · r8 64/65 · r9 65/65 · fix-B 53/53. r5 and r8 each read a tab's name exactly ("Money", the tab order) — the tabs now carry their
  counts (REG-a.15, deliberate): both probes changed to read the name without its count; re-run: **r5 90/90 · r8 65/65**. Then fix-C 49/49 ·
  fix-D 35/35 · fix-E 50/50 · fix-F 44/44. **All sixteen green** on the final build. Server on :3121 stopped.

## For the merge and the other packages
- **Package D (portal):** `holdOf(p)` in `lib/projects/hold.ts` → `{ since, reason, until, by } | null` (since/until in ms; `until` a local
  midnight). Demo: Aisha Rahman's project is on hold (R78) — she has no portal, so the client-side hold shows only once a held client is invited.
- **Package B (money):** the refund-due check and the closing summary read `refundDueOf({ collectedMinor, contractMinor })`
  (lib/projects/handover-model.ts) from `moneyOf`. If one-off invoices (B item 2) count in `collectedMinor`, the stage-only collected must be
  passed there instead, or a paid one-off reads as a refund due.
- **Shared files touched (appended unless said):** `lib/db/schema.ts` (six `projects` columns), `lib/leads/events.ts` · `lib/projects/events.ts`
  (three kinds), `lib/leads/activity.ts` (a new branch before round 1's; the ending branch's two sentences gain the deferred items),
  `lib/notifications/model.ts` (event `project_hold_due` + rules line + templates) · `queries.ts` (a derived block; the milestone reminders'
  `live` query skips held projects — one line), `lib/projects/attention.ts` (`AttentionFacts.onHold`; ONE line in `attentionReasons` filters by
  `HOLD_KEEPS`; appended reason), `lib/projects/next-step.ts` (`NextFacts.onHold`, `PrimaryRun 'resume'`, an `unshift`), `lib/projects/tabs.ts`
  (two tabs before Activity, a chip), `lib/projects/getting-started.ts` (a `splice` after Contract value), `lib/projects/model.ts`,
  `lib/settings/permissions.ts` (two rows), `scripts/repair-demo-data.ts` (R78 + 7 checks + three kinds in the unknown-kind check),
  `components/shell/notifications-panel.module.css` (one glyph tone), `components/leads/notes/lead-notes.tsx` (`base`),
  `components/leads/assignee-field.tsx` (+css: `rowMeta`, `suggestion`), `components/om/tabs.tsx` (+css: `count`).
- **Probes changed** because a rule of mine changed what they assert: `verify-pj-fix-B.cjs` (Aisha runs un-held in its section, the hold back
  in `finally`), `verify-pj-r5.cjs` and `verify-pj-r8.cjs` (a tab's name read without its count).
- Not run: `npm run design:anatomy` (a full-site browser sweep — left for the merge's one build).
