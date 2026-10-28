# P-H · Tasks, design, compliance & Maison AI — outcome (2026-10-10)

Built every item in the brief's P-H section. `npx tsc --noEmit -p .` is clean for every file here (the only errors left are other packages'
work in progress: `components/projects/messages/conversation.tsx`, and `.next` validator stubs); `npx eslint` on every touched file is clean;
`npm run design:lint` — nothing new breaks a house rule (baseline untouched). Nothing was run against a server or a browser (the brief's rule);
the probe is written, not run. Register rows: `reg-P-H.md` (REG-P-H.1 … .8). Probe: `design-source/verify/parity-map-build/verify-pm-h.cjs`.

## Per map row

### TD-019 — Ask an Owner to add an outside person
- **Changed:** `components/leads/tasks/outside-person.tsx` (+ `.module.css`: `.ask` · `.askHelp`) — the form's last line, an unticked DS Checkbox
  "Ask an Owner to add them to the studio", shown only while the person is new on the task; its help line says what happens. The value rides
  `onSave` as `askInvite` — both hosts (`lead-tasks.tsx`, `project-schedule.tsx`) already pass the value to `setTaskOutside` unchanged, so no host
  edit was needed. `app/leads/tasks-actions.ts` — `setTaskOutside(taskId, { …, askInvite })` → `askToAddToStudio` (private): a studio task
  (lead null) on the active Owners, "Add {name} to the studio" with the mobile, who asked and on which task (inserted as `createTask` does but
  without its `task_assigned` ring — the ask's own notice is the one bell row); `invite_requested` to Owners and Admins (the event's rule)
  opening `/company/members?add=<name>&phone=<8>&from=/tasks?open=<task>`; one open ask per person (by title); none for a mobile already a
  member's. `OutsideUndo.inviteTaskId` — the save's Undo deletes the task (while still open) and its `invite_requested` rows. Answers
  `invited: true`. NEW `lib/leads/task-links.ts` — `inviteTaskTitle` · `inviteHref` · `inviteTaskDescription` · `taskLinkOf` (the panel's door,
  see Needs) · `readInviteParams`. `components/company/members-view.tsx` — the `?add=` landing: Add member opens filled (name, phone) for
  whoever may add members, after the reveal (`GHOST_MIN_MS`); the address drops `add` / `phone` at once.
- **Check:** Germaine (View as) on Benjamin's Tasks › a task › *Add a subcontractor or supplier* → tick the ask → Save → Dane's /tasks shows
  "Add {name} to the studio"; Dane's and Hui Min's bells "Germaine asks to add {name} to the studio" → Company › Members with Add member filled;
  Undo on the save's snackbar takes all three back. Edit the same person → no checkbox. 1440 · 390 (the form is a sheet on a phone).

### TD-027 — Projects made with New project in the rail's Tasks picker
- **Changed:** `lib/leads/tasks.ts` (the picker only — `projectLeads` carry their `project` for the number); `components/tasks/tasks-workspace.tsx`
  — the direct projects ride `leads` after the leads (`projectLeads: []`, so the Filters' Lead pane — which already merged both — lists the
  same set once); `components/leads/tasks/tasks-table.tsx` `LeadPickerCell` only — groups **Leads** / **Projects** (`DropdownLabel`, titles
  only when there are projects), the project's number as the row's meta, the menu 240 then; `data-testid="task-add-lead"`.
- **Check:** Dane, /tasks › Add Task › Create New Task › the Lead cell → Projects › "Condo 3-bedder — Marcus Teo · P-2026-004" → the task lands on
  Marcus's project (its row names it). A Designer sees only the projects they see (unchanged filter in `fetchStudioTasks`). 1440 · 390.

### TD-044 — A receipt for the client's no
- **Changed:** `lib/projects/choice-receipt-model.ts` — `answer` on `SelectionReceiptData`, `pickedLine` for a no, `receiptStateLabel`,
  `receiptHashSource(…, answer)` (the answer joins the source only for a no — every filed pick's fingerprint still checks).
  `lib/projects/choice-receipt.ts` — `receiptFacts` takes a declined choice (who answered from `client_answer_by`, when, their reason, none
  ticked); `fileSelectionReceipt` files it like a pick's; `portalSelectionReceipts(leadIds, { answers })` adds the no's (opt-in).
  `components/projects/choices/selection-receipt.tsx` (paper: "Answered", *Their answer*, *Their reason*, `data-answer`),
  `selection-receipt-page.tsx` (the chip names the answer, neutral), `choice-card.tsx` (⋮ *Selection receipt* on a declined choice).
- **Check:** Dane, Ryan's Choices › Bathroom tiles ⋮ › Selection receipt → "Other options asked", Ryan's reason, no tick, the fingerprint.
  The studio page reads on the fly today; its Files entry and the portal's Documents line need the wiring below.

### TD-049 · UC-094 · UC-113 — Ask the client for their floor plan
- **Changed:** `app/projects/floor-plan-actions.ts` — `askClientForFloorPlan(projectId)` (the change rule; refused when the client is not on the
  portal, a plan is there, or the portal's Floor plan is off; stamps `floor_plan_asked_at` · `_by`; `client_floor_plan_ask` through
  `tellClient`, held for the Undo; Activity `parity_h_floor_plan_asked`) and `undoFloorPlanAsk`. `lib/projects/floor-plan.ts` —
  `FloorPlanData.client.asked`; NEW `attachHomeFloorPlanAsks(facts)` (asked, running or setting up, no live plan, the section on).
  `lib/portal/needs.ts` — `HomeFacts.floorPlanAsk` and the producer "Send your floor plan" (appended to `NEED_PRODUCERS`). The first run
  (`components/projects/floor-plan/project-floor-plan.tsx`): not on the portal → *Invite {client} to the portal* (as before); on it →
  *Ask {client} for their floor plan* → snackbar with Undo; once asked the help says when and by whom, the link reads *Ask again*
  (`data-testid="plan-empty-ask"`). `lib/leads/activity.ts` region P-H — the Activity line.
- **Check:** with a client on the portal and no plan (the probe puts Benjamin's plans away for a moment): the ask, its snackbar, Activity,
  Settings › Notifications › Sent messages (the email), Undo. Marcus (not on the portal) still offers the invite. 1440 · 390.

### TD-067 · UC-113 — A new plan tells the client
- **Changed:** `addFloorPlan` → `tellPlan` → `client_floor_plan` (`{plan}` filled; key = the plan, so once per plan; only while the portal's Floor
  plan section is on), inside `holdClientMail(UNDO_SNACKBAR_MS)`; `PlanUndo.held` and `undoAddFloorPlan` → `cancelHeldMessages`.
- **Check:** Ryan's Floor plan › Add a plan → Sent messages lists "Your floor plan from …"; Undo inside the snackbar's time takes it back
  (once `HELD_EVENTS` names it — see Needs; until then it goes at once and the Undo leaves it sent).

### TD-110 — Notes on a registration
- **Changed:** NEW `lib/compliance/notes.ts` (pure: `REGISTRATION_NOTES_KEY = 'compliance_studio_notes'`, `NOTE_MAX` 500, `cleanNote`,
  `parseRegistrationNotes`), NEW `lib/compliance/notes-actions.ts` (`'use server'`: `setRegistrationNote` · `restoreRegistrationNote`, Owners and
  Admins, `{ error }` otherwise), `lib/compliance/queries.ts` (`fetchRegistrationNotes`, `NavigatorData.notes`), `components/compliance/navigator.tsx`
  (`RegistrationNoteBlock`: read · *Add a note* · *Edit* · the house multiline field · *Save note*, Undo; testids `navigator-note*`),
  `navigator.module.css`, `navigator-ghost.tsx` (the note's line). Why its own key: `setStudioAction` (Company › Profile) rewrites
  `compliance_studio` whole from the parsed states, so a note kept inside it would be lost on the next Done.
- **Check:** Dane, /compliance → a card → Add a note → Save → the note with Dane · day; Undo. Germaine reads, no Add. 1440 · 390.

### TD-107 · SC-060 · FB-118 · PR-059 — Maison AI answers questions
- **Changed:** NEW `lib/maison-ai/intents.ts` (pure: the intents and their weighted words, `matchQuestion`, `kindOf` · `phaseOf` · `topicOf`
  · `startParams`, `askChips`); NEW `lib/maison-ai/answer.ts` (`'use server'` `answerQuestion({ question, path, projectId?, milestoneId? })`:
  Who sees leads on every read; money through `fetchBooks` + `buildReport` — Reports › Finance's numbers — for Owners and Admins; the
  milestone's waits / payment / tasks; a milestone named in the question on a project page). `lib/maison-ai.ts` — `MaisonAnswer.chips` ·
  `.link`; `askMaisonAi()` + `useMaisonAsk()` (a question asked from the page). `components/shell/maison-ai.tsx` — the Ask box (house
  TextField, helper "Answers from your records", bare send icon), the ask's lifecycle, page asks open the sheet with them asked.
  `components/shell/maison-answer.tsx` (+ css) — chips (house `Chips`, a press asks), the answer's one button, a tile row that opens nothing
  reads as a line. `components/leads/ai-sheet.tsx` — one optional `ask` slot under the head (see "Touched outside the list").
  PR-059: `components/projects/projects-workspace.tsx` (the Maison AI suggestions only — *Start a project*, and New project filled from
  `?new=1&client=&phone=&ptype=` on arrival or while open) and `components/projects/new-project-dialog.tsx` (an optional `initial`).
- **Check:** Dane on Benjamin's project › FAB → ask "What is overdue?", "Tell me about carpentry", "What compliance is still to do here?",
  "Do I need a permit for hacking a wall in a condo?", "GST this quarter" (→ *Open GST*), "hello" (→ chips). Germaine → "GST this quarter" →
  "Owners and Admins only"; "Who owes the studio money?" → her projects' invoices. /projects › FAB › Start a project; then ask "Start a new
  project for Mr Lim, 9123 4567, HDB 4-Room" → the row → New project filled. 1440 · 768 · 390 (the sheet's width is min(320, 100vw − 32)).

## Stand-ins (say so to the owner)
- **Maison AI's Ask box is rule-based**: a table of intents and words, answered from the records — no model, no credits. The user reads only
  the box's own "Answers from your records". A question outside the table gets the list of what it answers.
- **Start a project** never makes a project by itself: it opens the lead or New project (1.0's insert most likely never worked — the map's note).
- Emails (`client_floor_plan`, `client_floor_plan_ask`) go through the house delivery layer; the prototype's adapter records them as sent.

## Touched outside the brief's list (small, additive — the reason each)
- `components/leads/ai-sheet.tsx` — an optional `ask?: ReactNode` slot under the head (3 lines). It is Maison AI's own sheet and no package
  holds it; every other caller passes nothing and is unchanged.
- `components/shell/maison-answer.tsx` (+ css) — the shell's answer panel, part of `maison-ai.tsx`.
- `lib/projects/choice-receipt-model.ts`, `components/projects/choices/selection-receipt-page.tsx` — the receipt's pure model and page (the
  brief's `choice-receipt.ts` · `selection-receipt.tsx` family).
- `components/leads/tasks/tasks-table.tsx` — `LeadPickerCell` only (the brief's "the picker only"); `outside-person.module.css`.
- `components/projects/new-project-dialog.tsx` — the optional `initial` prop (for the listing's Maison AI suggestion).
- `components/tasks/tasks-workspace.tsx` was rewritten whole with Write (it is in this package's lane and no one else edits it).
- NEW files: `lib/leads/task-links.ts`, `lib/compliance/notes.ts`, `lib/compliance/notes-actions.ts`, `lib/maison-ai/intents.ts`, `lib/maison-ai/answer.ts`.

## Needs from others (exact file — what — why)
1. **P-E** `components/projects/schedule/**` (the milestone panel) — one quiet entry **Ask Maison AI about this**:
   `import { askMaisonAi } from '@/lib/maison-ai'` → `askMaisonAi({ text: \`What should I watch on ${m.title}?\`, milestoneId: m.id, projectId })`.
   The sheet opens with it asked and answers about that milestone (SC-060). Any words work — with a milestone id the question falls to it.
2. **Task panel owner** `components/leads/tasks/task-panel.tsx` — under Description, when `taskLinkOf(task)` (`@/lib/leads/task-links`) answers,
   one text link `{label}` → `href` (TD-019: "when the task is opened, Members' Add dialog filled"). Today the bell row is the door.
3. **Hosts of OutsideDialog** `components/leads/tasks/lead-tasks.tsx` `saveOutside` and `components/projects/schedule/project-schedule.tsx`
   `saveOutside` — when `r.invited`, the snackbar's words may add " — the Owners are asked to add them" (optional polish; the save works as is).
4. **P-F** `lib/portal/model.ts` — add `| 'floor_plan'` to `NeedKind` (then drop the `as string as NeedItem['kind']` cast in
   `lib/portal/needs.ts`); `lib/portal/sections.ts` `NEED_SECTION` — `floor_plan: 'floor-plan'`; `lib/portal/home.ts` `loadHomeFacts` —
   `await attachHomeFloorPlanAsks(out)` (from `@/lib/projects/floor-plan`) beside `attachHomeChoices`. Without the last line the "Send your
   floor plan" row never shows (the ask, the email and Activity work regardless).
5. **P-F** `app/portal/choices-actions.ts` `answerChoice` — after the update, `await fileSelectionReceipt(s.id)` (files the no's receipt in
   Files › Choices). **Choices owner** `app/projects/choices-actions.ts` — `shareChoice` (re-share from declined) and `restoreChoiceAnswer`
   (its Undo) → `await fileSelectionReceipt(id)` (trash / re-file it). `lib/projects/choices.ts` line ~141 `receipt:` — also for
   `status === 'declined'` with a hash (then the card's main *Selection receipt* entry and its "Open" line serve it; my declined-only ⋮ entry
   steps aside by itself), and line ~363 `receiptHref` for declined. `lib/portal/home.ts` — `portalSelectionReceipts(leadIds, { answers: true })`
   and, for a row with `answer`, the line `${answerOf(x.answer).chip} · ${clientDay(x.at, now)}` (from `@/lib/projects/decline`).
6. **P-G** `lib/notifications/held.ts` `HELD_EVENTS` — add `'client_floor_plan'` and `'client_floor_plan_ask'`, so the add's and the ask's Undo
   can take the email back while it waits.
7. **Union owners** `lib/projects/events.ts` `ProjectEventKind` and `lib/leads/events.ts` `LeadEventKind` — add
   `'parity_h_floor_plan_asked'`; then drop `ASKED_KIND`'s `as string as` in `app/projects/floor-plan-actions.ts` and the `String(e.kind)` in
   `lib/leads/activity.ts` region P-H.

## Repair text (for `scripts/repair-demo-data.ts`, after R81's "every chosen choice has its selection receipt" block)
```ts
    /* (parity map, TD-044 — P-H) the client's no has its selection receipt too — Ryan D’Souza's "Bathroom tiles" (other options asked): one entry
       in the lead's Files › Choices and the fingerprint the app prints (`receiptHashSource` with the answer; client_answer_at is in ms) */
    const nos = rows<{ id: string; lead_id: string; title: string; room: string | null; client_answer: string; client_answer_at: number; client_answer_note: string | null; created_by: string | null }>(await client.execute(
      `SELECT s.id, p.lead_id, s.title, s.room, s.client_answer, s.client_answer_at, s.client_answer_note, s.created_by FROM project_selections s JOIN projects p ON p.id = s.project_id WHERE s.status = 'declined' AND s.deleted_at IS NULL AND s.client_answer IN ('reject','other_options') AND s.client_answer_at IS NOT NULL AND (s.receipt_file_id IS NULL OR s.receipt_hash IS NULL)`))
    for (const s of nos) {
      const opts = rows<{ id: string; name: string; vendor: string | null; price_minor: number | null }>(await client.execute({ sql: `SELECT id, name, vendor, price_minor FROM project_selection_options WHERE selection_id = ? AND deleted_at IS NULL ORDER BY position, created_at`, args: [s.id] }))
      const at = Number(s.client_answer_at)
      const hash = createHash('sha256').update(receiptHashSource({ id: s.id, title: s.title, room: s.room }, opts.map((o) => ({ id: o.id, name: o.name, vendor: o.vendor, priceMinor: o.price_minor && Math.round(o.price_minor) !== 0 ? Math.round(o.price_minor) : null })), { optionId: '', by: 'client', at, note: s.client_answer_note }, s.client_answer as 'reject' | 'other_options')).digest('hex')
      const sec = Math.floor(at / 1000)
      let [folder] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE lead_id = ? AND kind = 'folder' AND name = 'Choices' AND parent_id IS NULL AND deleted_at IS NULL LIMIT 1`, args: [s.lead_id] }))
      if (!folder) { const fid = sid(s.lead_id, 'folder:choices'); made += (await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, updated_at) VALUES (?,?, 'folder', 'Choices', NULL, ?, NULL, ?, ?)`, args: [fid, s.lead_id, sec, s.created_by, sec] })).rowsAffected; folder = { id: fid } }
      const fileId = sid(s.id, 'file:selection-receipt')
      const name = `Selection receipt · ${s.title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)}.pdf`
      made += (await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'pdf',?,NULL,?,?,?,NULL,'application/pdf',?)`, args: [fileId, s.lead_id, name, sec, folder.id, s.created_by, sec] })).rowsAffected
      made += (await client.execute({ sql: `UPDATE project_selections SET receipt_file_id = ?, receipt_hash = ? WHERE id = ?`, args: [fileId, hash, s.id] })).rowsAffected
    }
```
No other demo record is needed: the probe makes its own first run (it puts Benjamin's plans away for a moment and puts them back).

## Probes
- **Run 2026-10-10 against the merged build** (port 3136, a fresh copy of `pbuild/base.db`): **50 passed, 0 failed** after two probe-side fixes —
  the picker's group titles and the receipt's eyebrow are uppercase captions, and `innerText` carries the CSS case (now matched case-blind); the
  add row's title is `input[aria-label="Task title"]` (it has no `type`). No app change was needed for green. One look fix after the run:
  `components/shell/maison-answer.module.css` `.ask` gets 8px on top so the field's floated label clears the sheet's head — needs the rebuild.
- NEW `design-source/verify/parity-map-build/verify-pm-h.cjs` (written, not run; args `<scratch.db> [shotDir]`, env `BASE`, refuses `local.db`,
  puts back every table it touches, shots at 1440 and 390). Sections 1–8 follow the rows above. Two checks depend on others' wiring and say so:
  section 5's held-email Undo is asserted only when the row was held (Needs 6); the portal's "Send your floor plan" row is not asserted (Needs 4).
  Section 7's *Open GST* needs P-C's `gst` report in `buildReport` (in progress in this tree).
- Existing probes grepped for every string, test id and address changed — none assert them (the outside form's test ids, the Floor plan's
  `plan-empty` / `plan-empty-add`, the Navigator's `navigator-*`, the sheet's suggestion buttons and `maison-row` / `maison-answer` are all kept).
  No assertion was changed.

## Not finished, and why
- The milestone panel's entry, the task panel's door, the portal's needs wiring, the receipt filing on the client's no, and `HELD_EVENTS` live
  in other packages' files — each is in Needs above with its exact line; everything on my side of each is in place.
- "Start a project for {Won lead without one}" is one *Start a project* suggestion whose answer names each such lead: the listing's data does
  not carry leads, and the demo has none (every Won lead has its project), so a per-lead label would read nothing.
