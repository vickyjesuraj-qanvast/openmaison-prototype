# Package K-E — outcome (Activity, words, notifications, settings and the Deleted sheets) — 2026-10-08

Fixes P-12 · P-13 · P-14 (Activity side) · P-15 · P-36 (project side) + Q-11 · P-37 · P-38 + Q-23. Register rows staged in `reg-KE.md`
(REG-KE.1…8). `npx tsc --noEmit` clean on every file below (the errors left are other packages' work in progress: `app/leads/[id]/overview.tsx`,
`components/projects/project-frame.tsx`); `npx eslint` clean on them; `npm run design:lint` ✓ (nothing new, baseline untouched). Nothing run in a
browser, no server, local.db untouched.

## The schema change (P-13) — the orchestrator generates the migration

`lib/db/schema.ts`, additive only, two nullable text columns, no default, no reference (as `lead_events.actor_id`):

```ts
// leadAssignees (after assignedAt)
assignedBy: text('assigned_by'),
// stageLogs (after createdAt)
movedBy: text('moved_by'),
```

Expected migration (`npm run db:generate`):

```sql
ALTER TABLE `lead_assignees` ADD `assigned_by` text;
ALTER TABLE `stage_logs` ADD `moved_by` text;
```

**Until the migration is applied every read of `stage_logs` / `lead_assignees` with `select()` fails ("no such column")** — generate and apply it
before the build. `fixtures/baseline.json` needs nothing by hand: restore leaves the columns null, the repair below fills what is known, then
`npm run db:baseline`.

## Per fix

### P-12 — the record's word (D-05)
- `components/leads/questionnaire/questionnaire-empty.tsx` — `noun?: 'lead' | 'project'` (default lead): "… ready for this project."
- `components/leads/questionnaire/lead-questionnaire.tsx` — `noun` prop, handed to the empty state.
- `components/leads/notes/notes-list.tsx` — `noun` prop: "Write the first note for this project." / "Log the first call or message with this project."
- `components/leads/notes/lead-notes.tsx` — `noun` prop, handed to `NotesList`.
- `app/projects/[id]/[tab]/page.tsx` — the Notes and Questionnaire branches pass `noun="project"` (the lead's tab page passes nothing → "lead").
- `lib/leads/activity.ts` — `wonAt` = the earliest Won move (`to_stage='Won'`, not a correction) or the lead's first project's `created_at`; a direct
  project's lines are "project" from the start; `recordAt(at)` gives the word. Used by the assignment lines, `member_removed` ("removed X from the
  lead/project", "left the …" when the actor took themselves off, "removed you" for the reader) and `field_edited` ("changed the lead’s details — …"
  before Won, "changed the client’s details — …" after — the project's own line). "this lead" is gone from Activity.
- Check: a Won project's Activity (Ryan `/projects/e920e218…/activity`) — members added after Won read "… to the project", the lead-era ones "… to the
  lead"; a direct project (Marcus) reads "project" throughout; Notes on a project with no contact logs → Contact Log chip → "…with this project.";
  a lead's tabs unchanged.

### P-13 — who moved, who added (D-06)
- Stamps: `app/leads/actions.ts` — `writeAssignees` (`assignedBy: ME` — covers `assignMembers`, `createLead`, `updateLead`), `addLeadMembers`
  (`assignedBy: viewer.id`), `moveStage` · `quickMoveStage` · `updateStageDetails`'s insert (`movedBy: ME`); `app/projects/actions.ts` —
  `createDirectProject`'s members (`assignedBy: sessionMemberSql`). The project's own moves (start · hold · resume · complete · reopen) were already
  `lead_events` with their actor — nothing to stamp there.
- `lib/leads/activity.ts` names the actor: "Dane moved the lead from Met to Quote Sent.", "Dane added Germaine to the lead.", "Michelle joined the
  project." (self-added), "You were added to the lead."; unnamed (no stamp): "The lead moved from … to …", "Germaine was added to the lead.",
  "The contact log was updated." / "The Met details were updated."; Add Log entries past the first keep no author: "A contact log was added via
  WhatsApp." / "A meeting log was added." The row's `actor` field is the name or "System" (nothing on screen reads it).
- Not stamped (outside this package): `app/leads/return-actions.ts` `returnLead`'s own Lost log — Activity never shows it (the return's line names
  who); it may take `movedBy: sessionMemberSql` for completeness.
- Check: move Gerald Tan Met → Quote Sent as Dane → "You moved…"; View as Sarah → the same line reads "Dane moved…"; an older seeded line reads
  "The lead moved from New to Contacted." unless the repair found its actor.

### P-14 — one sentence shape (Activity side, D-12)
- `lib/leads/activity.ts`: `reasonWords` (the reason in curly quotes, a stored "Others: " dropped, trailing stop trimmed). On Hold: "Dane put the
  lead on hold — “Budget review”; follow up 7 Nov ’26." (the payload's `followUpAt`); Lost: "Dane marked the lead as lost — “Budget mismatch”;
  competitor: X; restart expected …"; out of On Hold / Lost: "Dane resumed the lead at Met."; returns: "Sarah returned the lead to Qanvast — “…”."
  The project's hold / resume lines (the model) are untouched — probe `verify-pj-gap-a` line 118 still holds.
- Snackbars and the listings' hold line (the other half of P-14 / B-11) are not in this package.

### P-15 — Activity's chips on ChipRail (D-07, Q-22)
- `components/leads/activity/lead-activity.tsx` — `<div><ChipRail label="Show"><Chips … testId="activity-chips" /></ChipRail></div>` (the
  Updates / Choices tabs' pattern). `data-testid="activity-chips"` kept on the radio group.
- Check: 390 touch, `/projects/e920e218…/activity` — one row, pagers at the right edge; 768; 1440 unchanged; the lead's five chips unchanged.

### P-36 (project side) + Q-11 — delete and the Deleted sheets (D-10)
- `components/projects/ending/delete-project-dialog.tsx` — title "Delete this project?" (a refusal keeps "This project can’t be deleted"), subtitle
  = the lead's (`wizard.module.css` `.subtitle`): "{name} · Current stage: {stage}", `data-testid="delete-project-subtitle"`. The stage comes from
  `readProjectDelete` — **see Needs from others 1**; until it does, the subtitle shows the name alone.
- `components/projects/deleted-projects-sheet.tsx` + `.module.css` — composes the Deleted Leads sheet's `banner` · `bannerClose` · `link` · `note`
  (`components/leads/deleted-sheet.module.css`): the dismissible yellow banner (`data-testid="deleted-projects-banner"`), Restore / Delete Forever
  as text links at the row's start, 24 apart (`data-testid="deleted-project-restore"` kept, `deleted-project-forever` added; refusals keep their
  tooltips), the note under the table. The table, the bulk bar, Empty Trash and the confirms are unchanged.
- `components/leads/deleted-sheet.tsx` — the date column's head "Deleted" (key `archived` → `deleted`; only the per-browser width key moves).
- Check: `/projects/904a7c71…` (P-2026-005) → the listing's snackbar → Open: banner, links, note at 1440 / 768 / 390 (the phone's labelled rows,
  E-26); the project ⋮ › Delete on a project with no money; Leads ⋮ › Deleted Leads: "DELETED" head.

### P-37 — notifications (D-16)
- `lib/notifications/model.ts` — `assigned` "A lead or project is assigned to you"; `stage_changed` "A lead’s or project’s stage changes" · help "A
  lead’s move, hold, loss or resume; a project’s start, hold or resume — by anyone but you." · who "Owners, Admins and the lead’s or project’s
  members"; Who column: "The lead’s or project’s members" (question_answered, render_feedback, task_comment's fallback, file_comment, portal_opened —
  was "The client’s team"), every "The project’s team" → "The project’s members" (26), variation_declined → "The project’s members, Owners and
  Admins"; file_comment help "one of a lead’s or project’s files"; the stage message's email "… Open it: {link}" (was "Open the lead"). Sales-only
  events (quote confirmed / change asked, contract sent / signed, a lead's hold date) keep "the lead’s members".
- `app/projects/actions.ts` — `notifyProjectStage` (Owners + Admins + the lead's members, the actor left out by `notify`; title "{project}: {from} →
  {to}", body "On hold · {reason}" for a hold, `fields['{stage}']` the project's word) from `startProject`, `putProjectOnHold` (not when changing an
  existing hold) and `resumeProject`; `undoHoldChange` deletes the `stage_changed` rows for this project from its line's moment on, then the line.
- Check: as Dane put a direct project of Germaine's on hold → Germaine and Hui Min get "…: In progress → On hold" in the bell, Dane doesn't; Undo →
  gone; Settings › Notifications rows at 1440 and 390.

### P-38 + Q-23 — Settings (D-17 · D-18)
- `app/settings/projects-settings.tsx` — `ModuleHead links`: Templates (`/company/templates/schedules`, icon `style`) · Client portal
  (`/company/portal`, `home`) · Members (`/company/members`, `group`), each `withFrom` this module (its own `?from=` kept, read with
  `useSearchParams`); under the head, inside one `.sectionHead`, "Who sees a project follows who sees its lead — set under Lead management › Who sees
  leads." (`HelpLink` to `/settings?section=leads#lead-visibility`, `data-testid="projects-visibility-pointer"` / `projects-visibility-link`).
- `lib/settings/permissions.ts` — `PERMISSION_AREAS` (11, Settings' order), `AREA_OF` (every row key), `PermissionRow.area`, `permissionGroups()`;
  renamed rows: `see` "See a lead", `assign` "Change a lead’s members", `insights` "See Company › Reports › Leads", `project-workload` "See the
  Workload view and Company › Reports › Projects", `files-change` "Upload, rename, move and delete a lead’s or project’s files"; new row
  `project-members` "Change a project’s members" (the `assign` computation; `RULE_PLACES` → Who sees leads). Keys unchanged, so every probe's
  `may-<key>` still finds its row.
- `app/settings/studio-settings.tsx` + new `app/settings/studio-settings.module.css` — one `role="rowgroup"` per area (`aria-label`,
  `data-testid="may-group-<area>"`), its caption a band composing the card table's `head` across the row (kept on a phone, where the column head
  hides). The column head stays the table's first row (verify-st-r1 / r2 read it).
- Check: `/settings?section=studio` at 1440 / 768 / 390 (the bands, the role labels stacked on a phone); `/settings?section=projects` head.

## Probes
- Existing assertions: none needed changing — grep over `design-source/verify/**/*.cjs` for every sentence, label, test id and head I changed found
  no assertion on the old words (`verify-pj-r7` / `fix-E` / `st-r1…r3` / `p2b` / `pb-r2` read Who may do what by key and reach, which hold; the
  Deleted Projects probes use `deleted-project-restore` and the role "button" named "Delete Forever", both kept; the hold line probe in
  `verify-pj-gap-a` reads the project's sentence, unchanged).
- New: `design-source/verify/lead-project-parity/KE/verify-ke.cjs <scratch.db> [shots]` (BASE env, default :3011) — the lead's Activity actor / unnamed
  / hold / added lines, the project's "project" line, ChipRail one row at 390, the hold's bell rows + Undo (tries the Stage ▾ button, else the ⋮),
  the delete dialog's title + subtitle, Deleted Projects' banner / link / note, Deleted Leads' "Deleted" head, Notifications' words, Settings ›
  Projects' links, Who may do what's groups / grammar / the new row's reach. Needs the migration; puts back what it writes. Not run.
- `design-source/uat/story/ch5.json:387` still expects "You assigned Sarah to this lead." and "You edited the lead — …" — now "{actor} added Sarah
  to the lead." and "{actor} changed the lead’s details — …" (Vicky's sheet; not edited).

## Needs from others
1. **`app/projects/ending-actions.ts` `readProjectDelete`** — add `stage` to `DeleteRead`: `stage: holdOf(c.p) ? 'On hold' : STAGE_LABEL[c.p.stage]`
   (the words the header's Stage ▾ wears, P-08). The dialog already reads `d.stage` when present; without it the subtitle is the name alone.
2. **`app/settings/settings-ghost.tsx`** (REG-708, the ghost stays in step): Studio — a caption band (`studio-settings.module.css` `.group` with a
   ~60px bone) before the first rows and between groups (e.g. after rows 4 and 9); Projects — `links: [84, 108, 82]` (Templates · Client portal ·
   Members) and one `settingHelp` line under the head for the Who-sees pointer (wrap the head in a `.sectionHead` as the page does).
3. **`components/leads/detail/tab-ghosts.tsx` `ActivityTabGhost`** — the chip row as a one-row rail (it uses `chipRow.chips`, which wraps); with five
   bones it already sits on one row, so only a project ghost drawing its fourteen would differ.
4. `app/leads/return-actions.ts` — optional `movedBy: sessionMemberSql` on the return's Lost log (never shown).
5. K-A2 (the Stage ▾ on the project, P-08): the notices come from the actions, so every door gets them; a hold changed from the Stage menu should
   keep calling `putProjectOnHold` (its `again` path rings nothing).

## Repair text (insert as the next free R-number, after R91; idempotent — fills only NULLs, from what the records already know)

```ts
  /* ── R9x · who moved a stage and who added a member (parity P-13, the owner's pick 2026-10-08) ─────────────────────────────────────────
     `stage_logs.moved_by` and `lead_assignees.assigned_by` arrived empty. Filled only where the records already say who: a Won move from its
     project's `project_created` event at the same moment (not a remade or direct project's); any move from the bell's `stage_changed` row at the
     same moment with the same "from → to" (its actor); a member from the bell's `assigned` row to them at the same moment; a direct project's
     first members from whoever created the project. The rest stay unnamed — Activity reads "The lead moved from …" / "{name} was added to the
     lead". Idempotent: only NULLs are filled. */
  {
    console.log('\nR9x Activity names who moved a stage and who added a member')
    const won = await client.execute(`UPDATE stage_logs SET moved_by = (
        SELECT e.actor_id FROM lead_events e
        WHERE e.lead_id = stage_logs.lead_id AND e.kind = 'project_created' AND e.actor_id IS NOT NULL AND abs(e.at - stage_logs.created_at) <= 2
          AND coalesce(json_extract(e.detail, '$.direct'), 0) = 0 AND coalesce(json_extract(e.detail, '$.remade'), 0) = 0
        ORDER BY abs(e.at - stage_logs.created_at) LIMIT 1)
      WHERE moved_by IS NULL AND to_stage = 'Won' AND from_stage <> 'Won'`)
    const rung = await client.execute(`UPDATE stage_logs SET moved_by = (
        SELECT n.actor_id FROM notifications n
        WHERE n.lead_id = stage_logs.lead_id AND n.kind = 'stage_changed' AND n.actor_id IS NOT NULL AND abs(n.created_at - stage_logs.created_at) <= 2
          AND n.title LIKE '%: ' || stage_logs.from_stage || ' → ' || stage_logs.to_stage
        ORDER BY abs(n.created_at - stage_logs.created_at) LIMIT 1)
      WHERE moved_by IS NULL AND from_stage <> to_stage`)
    const told = await client.execute(`UPDATE lead_assignees SET assigned_by = (
        SELECT n.actor_id FROM notifications n
        WHERE n.lead_id = lead_assignees.lead_id AND n.member_id = lead_assignees.member_id AND n.kind = 'assigned' AND n.actor_id IS NOT NULL
          AND abs(n.created_at - lead_assignees.assigned_at) <= 2
        ORDER BY abs(n.created_at - lead_assignees.assigned_at) LIMIT 1)
      WHERE assigned_by IS NULL AND assigned_at IS NOT NULL`)
    const direct = await client.execute(`UPDATE lead_assignees SET assigned_by = (
        SELECT e.actor_id FROM lead_events e JOIN leads l ON l.id = e.lead_id
        WHERE e.lead_id = lead_assignees.lead_id AND l.direct = 1 AND e.kind = 'project_created' AND e.actor_id IS NOT NULL
          AND abs(e.at - coalesce(lead_assignees.assigned_at, l.created_at)) <= 2
        LIMIT 1)
      WHERE assigned_by IS NULL`)
    note(`moved_by: ${won.rowsAffected} Won move(s) from their project's line, ${rung.rowsAffected} move(s) checked against the bell — assigned_by: ${told.rowsAffected} member(s) checked against the bell, ${direct.rowsAffected} checked against a direct project's creation (rows still unnamed stay so)`)
  }
```

(`rowsAffected` counts every row the UPDATE visited, the ones it left NULL included — the note says "checked".) The verification queries to add to
the closing list:

```ts
    ['stage log moved by someone who is not a member (parity P-13)', `SELECT id FROM stage_logs WHERE moved_by IS NOT NULL AND moved_by NOT IN (SELECT id FROM members)`],
    ['member added by someone who is not a member (parity P-13)', `SELECT id FROM lead_assignees WHERE assigned_by IS NOT NULL AND assigned_by NOT IN (SELECT id FROM members)`],
    ['Won move whose mover is not who won it on the project’s line (parity P-13)', `SELECT s.id FROM stage_logs s JOIN lead_events e ON e.lead_id = s.lead_id AND e.kind = 'project_created' AND abs(e.at - s.created_at) <= 2 AND coalesce(json_extract(e.detail, '$.remade'), 0) = 0 WHERE s.to_stage = 'Won' AND s.from_stage <> 'Won' AND s.moved_by IS NOT NULL AND e.actor_id IS NOT NULL AND s.moved_by <> e.actor_id`],
```
