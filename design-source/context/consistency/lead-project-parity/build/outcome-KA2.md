# Package K-A2 — the project page's header, tabs and flows: outcome (2026-10-08)

Checks: `npx tsc --noEmit -p .` clean · `npx eslint` clean on every file below · `npm run design:lint` ✓ (nothing new, baseline untouched).
No server action, schema or repair change (`app/projects/actions.ts` untouched). Probes edited, not run.

## Files
- **New** `components/projects/stage-menu.tsx` (+ `stage-menu.module.css`, composes the lead header's `.anchor` / `.stageAction` / `.chev`):
  `stageRow(row, facts)` (pure — every row's move, refusal, current, check), `stageWord`, `ProjectStageButton`, `ProjectStageMenu`,
  `TEAM_RULE` / `RUNS_RULE`, `PROJECT_STAGE_ROWS`.
- `components/projects/project-frame.tsx` (the header, the row's right, the dialogs, the keys — K-A1's left side and its `runItem` / `openStep`
  / `editRecord` / Assign suggestion kept as merged): Stage button + menu (`stageFacts`, `runStage`), ⋮ (`onMenu`, `PROJECT_MENU_WIDTH`, `edit`,
  `phone`), `QuickLinks set="project"` (`onCreate`, `onNewTask`, `onNewNote`, `newVariation`), `LeadFormModal` with `project` (`editDetails`,
  `saveDetails`), `useShortcut('edit')` · `useShortcut('assign')` (`assignAt`, `assignByKey`), the `?edit=1` landing; RenameProjectDialog and the
  old ProjectDetailsDialog unmounted; the stage / On hold chips and the `compactStage` span gone. `project-frame.module.css`: `.compactStage` gone,
  header comment current.
- `components/projects/project-menu.tsx` — rewritten (see P-11). `ProjectMenuAction` keeps `'rename' | 'complete' | 'reopen' | 'hold' | 'resume'`
  only so the workspace's switch still compiles (nothing emits them now).
- `components/projects/project-record-dialogs.tsx` (+ CSS) — `ProjectDetailsDialog` / `ProjectDetailsSeed` removed (Edit details is the lead
  form); its CSS classes `.form .row .group .helpLine` removed. `HoldProjectDialog` unchanged (already 400 / `form` / "Put on hold").
- `components/leads/detail/quick-links.tsx` — additive `set?: 'lead' | 'project'` (`PROJECT_LINKS`), `data-set` on the aside; lead unchanged.
- `components/leads/lead-form.tsx` — additive `project?: { name; projectType; scope }`: title "Edit details", the Project section
  (`data-testid="project-details-section"`, `data-field` projectName · projectType · scope, `scope-chips`), `extras.project`, the name required,
  `details-save` on the Save button in that mode; `LeadFormOpen.focus` widened to `LeadFormField | ProjectFormField`; exported
  `ProjectFormValues` / `ProjectFormField`. Lead behaviour unchanged.
- `components/leads/move-stage/dialogs.tsx` — `OnHoldDialog` only: `size="form"`, title "Put on hold".
- `lib/projects/tabs.ts` — Tasks second. `components/om/tabs.tsx` — every tab's tooltip (keys on 1–9).
- `lib/keys/registry.ts` — `edit` "Edit the lead / project"; area `lead` "A lead or project".

## Per fix

**P-03 · Q-21 (Create strip).** Every project tab, right of the centre. Check at 1440: Ryan `/projects/e920e218-7c5b-4ff9-a27b-e62d73c99367`
and its Tasks / Schedule / Money tabs — the 72 strip, its expand to 140 (labels; "Variation order" may wrap in the 92 tile), Task / Note /
Contact Log on and off their tab, Update → the composer, Variation order → a new VO in the quote editor (Back returns; delete the probe VO
after), AI Visualizer (spinner then the editor), 3-D Space Planner (the layouts dialog). 768: collapsed-only strip. 390: no strip; the ⋮
sheet lists AI Visualizer and 3-D Space Planner. As a Designer off the team: Variation order answers the project's rule in a snackbar.

**P-06 · Q-01 (tabs).** Tasks second (the project ghost reads the same list). Every tab has its tooltip; numbers on 1–9 only. Counts: the
project strip already follows Q-01 (Tasks = open tasks; Money / Updates / Compliance / Floor plan / Messages / Tickets as before) — no change.
Check: hover Compliance … Activity at 1440 (tooltips now), press 2 → Tasks.

**P-08 · Q-24 (Stage ▾).** Check at 1440 / 768 / 390 (touch): Benjamin (In progress) — "Stage: In progress ▾" beside the primary, M opens it,
Setting up ✓ refused "Started {date}", Completed → Complete handover's dialog, On hold → Put on hold; Aisha (on hold) — "Stage: On hold", In
progress ✓ resumes (Undo), the current On hold row opens Change the hold, Completed → handover; Marcus (Setting up, direct) — In progress →
Start the project, Completed refused "Start the project first"; Shalini (Completed) — In progress ✓ → Reopen (Owner) / refused "Owners or
Admins" (sign in as Sarah, View as); On hold refused with HOLD_ENDED. 390: the menu is the "Move stage" sheet; the header row = Stage button
(hugging) + the filled primary (filling), ⋮ on the title line. No stage chip among the chips at any width.

**P-09 · Q-04 (Edit details).** Check: Ryan (Won) ⋮ › Edit details (and E on any tab, and the info column's pencil) — the lead's form titled
"Edit details", the lead's fields incl. NRIC / FIN, Customer ID, custom fields, then Project (name · type · rooms); change the scope → "Details
saved", the column's Project info reads it; type another project's name → the refusal snackbar, the form stays; change the client's name on
Marcus (direct, default name "Condo 3-bedder — Marcus Teo") → the project's name follows. From the listing: row ⋮ › Edit details → the
project opens and the form rises after the ghost; Back still returns to the listing (`from` kept). As a Designer off the team: the ⋮ row is
refused in the row; E answers "Couldn’t edit the details — only the project’s team, their Managers, Owners and Admins change a project".

**P-10 (On hold).** Lead Gerald `/leads/bed4ded0-1ac7-48fd-a7c4-639a7a00f02f` › Stage ▾ › On Hold — titled "Put on hold" ("Moving to On
Hold" under it), 400; at 390 both it and the project's Put on hold rise as bottom sheets.

**P-11 · Q-12 (⋮).** Check the project ⋮ at 1440 (200 wide): Edit details (E hint) · Open the lead’s record "Its quotes and contracts" (Won
only) · Open the signed quote · Open the contract · Invite to Portal · Copy Link · Delete (red; refused "Owners or Admins" for a Designer).
No "…", no divider, no other help lines. The listing's row ⋮ / phone card ⋮ is the same component (K-D2 passes `edit`).

**P-14 (snackbars).** "Details saved" · "{name} is on hold" + Undo · "{name} deleted" + Undo · "Members updated" (K-A1's line).

**Keys.** E / A / M on every project tab; ? panel: the group "A lead or project", E reads "Edit the project" on a project.

## Probe assertions changed (each marked "(parity P-xx, a deliberate change of this rule)")
- `design-source/verify/projects/verify-pj-r1.cjs` — the kebab's Edit details renames (no Rename… row); "Stage: In progress" on the Stage
  button (was the chip); the 390 ⋮ sheet carries AI Visualizer and 3-D Space Planner, the strip hidden.
- `verify-pj-gap-a.cjs` — Put on hold through Stage ▾ › On hold; the taken-name refusal through Edit details; the Edit details labels (Lead
  name, Lead phone number, NRIC / FIN, Customer ID, Project name) and its Activity line (`field_edited`, a count delta); E on the Tasks tab;
  `finally` deletes the probe's `field_edited` rows. (K-A1 rewrote the same block's card lines — their part kept.)
- `verify-pj-gap-j.cjs` — the planner from the Create strip's 3-D Space Planner (no ⋮ row).
- `verify-pj-r7.cjs` — `stageTo('Completed')` replaces the ⋮'s Complete handover (5 places); Delete is `/^Delete\b/` (5); the phone card's
  menu has Delete and no stage rows; the phone project page reaches the handover through the "Move stage" sheet.
- `verify-pj-r8.cjs` — Tasks second, Choices after Updates.

## Answers to others
- **K-D2:** the project ⋮ no longer has Rename / Put on hold / Change the hold / Resume / Complete handover / Reopen / AI Visualizer / Plan the
  space rows (the page's ⋮ shows AI Visualizer and 3-D Space Planner on a phone only, through `phone`). The workspace's `rename` · `hold` ·
  `resume` · `complete` · `reopen` · `visualizer` · `planner` branches, its `RenameProjectDialog` and `HoldProjectDialog` mounts (and the planner
  dialog if only the row used it) can go; then drop `'rename' | 'complete' | 'reopen' | 'hold' | 'resume'` from `ProjectMenuAction`
  (`components/projects/project-menu.tsx`). The phone card should NOT pass `phone` — the listing has no Create strip, the row menu is the
  record's. `?edit=1` is honoured: consumed once after the ghost (`GHOST_MIN_MS`), every other parameter (`from`) kept.
- **K-A1:** gap-a's Marcus phone lines now use the lead form's labels; `editDetails`' comment no longer claims the column's rows open it; the
  frame CSS header comment is current.
- **K-E:** every Stage ▾ row calls the existing actions (`startProject`, `putProjectOnHold` — a changed hold too —, `resumeProject`, the ending
  hook's `completeHandover` / `approveHandover` / `reopenProject`), so your notices and actors apply to every door.

## Needs from others
1. **The keyboard layer** (`components/shell/shortcuts/shortcuts-layer.tsx` · `dom.ts`, not mine) — P-06's "number keys reach every tab" stops at
   nine: the layer answers `/^[1-9]$/` and the tips / panel slice to nine. With Tasks second, Compliance · Files · Notes & Logs · Questionnaire
   · Activity still have no number. Proposal: on a tab row longer than nine, a digit typed within ~600 ms of another composes a number ("1"
   then "2" → the 12th; "1" alone fires after the pause), and `0` is the tenth's second digit. Once the layer answers it, `components/om/tabs.tsx`
   shows the hint with the existing sequence spec: `keys={i < 9 ? `#${i + 1}` : `#${String(i + 1)[0]} #${String(i + 1)[1]}`}`, the panel row
   "#1–{n}". Today every tab has its tooltip and only 1–9 name a key (honest — no hint for a key the layer does not answer).
2. **The project ghost** (`components/projects/project-ghost.tsx` and the project tab ghosts — P-07's owner): the header ghost draws no stage
   chip; the action row draws the Stage button's bone (the lead ghost's stage pill) beside the primary, at every width; the Create strip's bone
   on every project tab (the lead's tab ghosts draw it). REG-708.
3. **K-A1 / the Overview** — the create doors that remain on cards (Key documents' "Open in AI Visualizer" foot, any create foot left) leave per
   P-03 (the strip has them); the Project stages rows may read `stageRow()` (stage-menu.tsx) for their refusal captions so the card and the menu
   say the same.
4. **K-E / Activity** — Edit details writes the client part through `updateLead`, so a project's client edit is now the lead's `field_edited`
   line ("edited the lead/project — Phone: …"), not `project_client_edited`; the project part stays `project_edited`, a name `project_renamed`.
   Word `field_edited` on a project per P-12 / P-14. (`editProjectDetails`' `client` path is unused by the UI now; left on the server.)
5. **`components/om/portal-menu.tsx`** (optional) — a `sheetSubtitle` would let the project's "Move stage" sheet name the project and its stage
   as the lead's StageDropdown sheet does ("{name} · Current stage: X").

## Repair text
None — no records move.
