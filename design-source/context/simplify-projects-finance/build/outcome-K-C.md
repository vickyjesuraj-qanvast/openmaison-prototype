# Package K-C — the client loop: outcome (2026-10-09)

Items: **S-21 · S-22 · S-23 · S-25 (1) · Q-13.** Spec: P2 §6.4 · §6.5 · §6.6 · §6.10 · §6.13; the report's section 05. Register rows: `reg-K-C.md`
(K-C.1…K-C.10). Checks: `npx tsc --noEmit -p .` — none of the remaining errors are in K-C's files (they are in `app/projects/[id]/[tab]/page.tsx`,
`components/projects/money/*`, `components/finance/finance-frame.tsx`, other packages' work in progress); `npx eslint` on every file below — clean;
`npm run design:lint` — ✓ nothing new breaks a house rule. No build, no server, no browser; local.db untouched.

## S-21 — Choices run themselves up to the send

**What changed**
- `lib/projects/choices-model.ts` — `SHARE_WAIT_NOTE_MAX`, `waitSetByShare` (the pure rule: the milestone waits on the client, its note is the
  choice's name, and it began with the share, ±2 s), `shareWaitLine` ("Set by sharing {choice}").
- `lib/projects/choices.ts` — `startWaitForShare` (a milestone that waits on nobody and is not done; note = the choice's name; since = the share's
  moment; until = the choice's needed-by; with `carryFrom` a wait kept through the client's no runs on from a re-share), `endWaitSetByShare`,
  `putBackShareWait`, `shareWaitsOf(projectId)` (milestone id → choice title, for the panel).
- `app/projects/choices-actions.ts` — `shareChoice` starts the wait and tells the client (`tellChoiceShared`), answers `waitStarted` · `told`;
  `unshareChoice` (Share's Undo and Take back) and `deleteChoice` end the share's wait; `reshareChoice` and `restoreChoice` start it again;
  `restoreChoiceAnswer` (a re-share's Undo) ends a wait it started or puts a carried one back; `saveChoice` keeps a shared choice's wait in step
  with a rename or a new milestone (`followShareWait`). `ChoiceAnswerUndo.wait` is new (optional).
- `components/projects/choices/project-choices.tsx` (not the title line) — the share's sentence adds "· {milestone} waits on {client} for it".
- `lib/portal/client-messages.ts` · `lib/portal/client-tells.ts` — the event `client_choice` "A choice to make" (email on), `tellChoiceShared`.
- `app/portal/choices-actions.ts` — a client's priced pick calls `draftVariationFromPick(s.id)` (K-M's, as it is); its refusal or failure never
  fails the pick; the bell body adds "{VO} drafted — send it from Money"; the event's `detail.vo` carries the number.
- `lib/projects/pick-variation.ts` — `fetchPickVariations(projectIds)` → every live VO drafted from a pick: `quoteId · number · status ·
  amountMinor · choice · option · by ('client' | 'studio') · person · at` — what Money's "Send VO-n" row reads.
- The client says no → the card's band already has **Share again · Choose with {client}** (unchanged).

**Check in the browser** (Dane, Owner)
- Benjamin › Choices: add a choice with the milestone *Cleaning & touch-up* (waits on nobody), an option, Share → the snackbar ends
  "· Cleaning & touch-up waits on Benjamin for it"; Schedule › that milestone: Waiting on someone is on, Benjamin, "What for" = the choice's name,
  until its needed-by. Undo → the wait goes. Take back → it goes; Undo → it is back.
- Sharing *Paint colours* again is not possible (it is shared); its Painting wait (set by hand in the seed) is never touched by a share.
- Settings › Notifications › Sent messages: after a share, a "To the client · A choice to make" email to Benjamin.
- Portal (sign in as Benjamin, 9773 1968): choose *Sage Whisper* on Paint colours → Benjamin › Money has a new Draft VO "Paint colours — Sage
  Whisper"; the bell row for Dane reads "… · VO-n drafted — send it from Money"; Benjamin's portal shows no new need for it.
- As Michelle (Designer, View as) on a project she is not on, a client pick drafts nothing (money's own rule refuses) — the card keeps *Draft a
  variation order*.

## S-22 — The client asks

**What changed**
- `lib/projects/client-asks-model.ts` (new, pure) — `AskLinks`, `NO_ASK`, `askTitle`, `askSourceLine` ("From Benjamin’s message, 7 Oct ’26"),
  `askDescription`, `askFallbackTitle`.
- `lib/projects/client-asks.ts` (new, server) — `asksOf(projectId, source, refs?)`, `makeAskTask` (the house `createTask`, assigned to whoever
  pressed, one per ask), `raiseAskVariation` (money's `createVariationOrder` as it is, its title the client's words, a "Client’s requests" section
  with the words as its first line at no price; the `project_vo_created` line retitled as the pick's order does). The link ask → task / VO is a
  `lead_events` line (`project_ask_task` · `project_ask_vo`, `detail.source · ref · id`) — Activity has no sentence for these kinds (the generic
  `project_` branch skips them), the task's and the order's own lines tell the story. Both actions load lazily (no import cycle under the
  project's reads).
- `app/projects/messages-actions.ts` — `messageToTask` · `messageToVariation` (a client's message only; the project's rule). `lib/projects/messages.ts`
  — `ProjectChatData.asks`.
- `app/projects/tickets-actions.ts` — `ticketToTask` · `ticketToVariation` (the subject as the title / first line, the body under it).
  `lib/projects/tickets.ts` — `TicketRow.asks` on the studio's reads (`fetchProjectTickets`, `fetchTicketThread`).
- `components/projects/threads/ask-menu.tsx` (new) — `AskMenu`, the one shared piece (PortalMenu + DropdownItem): Reply · Make a task / Open the task ·
  Raise a variation order / Open VO-n; test ids `ask-menu` · `ask-reply` · `ask-task` · `ask-vo` (overridable).
- `components/projects/threads/thread.tsx` — `ThreadLines ask` (the other side's line's menu), the own-line kebab is ⋮ (`more_vert`, was "…");
  `ThreadComposer focusKey` (Reply · `?compose=1`).
- `components/projects/messages/conversation.tsx` — the ask menu on each client line (Messages and /chat), `?compose=1` → the composer focused after
  the ghost, the flag dropped from the address.
- `components/projects/tickets/ticket-parts.tsx` — the ask menu on the ticket's report in the drawer (the project tab and Projects › Tickets);
  Reply → To the client + the caret.
- `components/projects/floor-plan/mark-card.tsx` — the two text buttons become the same ⋮ (`plan-mark-asks`), rows keep `plan-mark-task` ·
  `plan-mark-vo` (+ `plan-mark-reply`); Reply focuses the comment.

**Check in the browser** (Dane; then Germaine on Benjamin's team; Michelle off it)
- Benjamin › Messages: the client's line has ⋮ → Reply puts the caret in the composer; Make a task → "Task added — “…”" · Open → the task: its title
  his words, its description "From Benjamin’s message, {date} ’26: “…”", assigned to Dane; the ⋮ now says *Open the task*. Raise a variation order →
  the editor on VO-n titled with his words, its first line his words under "Client’s requests". /chat → the same ⋮.
- `/projects/<Benjamin>/messages?compose=1` → the caret lands in the composer; the address loses `compose`.
- Benjamin › Tickets › T-2026-004: ⋮ beside the chips → Reply / Make a task / Raise a variation order; Projects › Tickets → the same drawer.
- Benjamin › Floor plan › a client's mark: ⋮ at the end of its action row → Make a task / Raise a variation order (and Open … once made).
- 390: each ⋮ opens as a bottom sheet.

## S-23 — The phone's post

**What changed**
- `components/projects/updates/update-composer.tsx` — at ≤767 (`useSheetLayout`): the media block (`data-testid="composer-media"`) comes before the
  title (`data-order="photos-first"` on the fields); a new post preselects the running milestone (or the one it was opened from) and fills the title
  "{milestone} — {Fri 9 Oct}" (`dayLabel`), still required; the title takes no autofocus on a phone. `camera=1`: takes the photos stashed by the
  press (`takeSitePhotos`) or clicks a hidden `<input accept="image/*,video/*" multiple>` (`composer-camera-input`); `camera` is dropped from the
  address. A desk is unchanged (order, empty title, caret in the title).
- `components/projects/updates/site-photos.ts` (new) — `stashSitePhotos` / `takeSitePhotos` (in memory, the Visualizer welcome's way).
- `lib/projects/updates.ts` `fetchUpdateMilestones` + `lib/projects/updates-model.ts` `ProjectUpdatesData.milestones` — `running` (status
  `in_progress`). Additive; neither file is in a package's list — touched only for this field.

**Check in the browser** — 390 touch, Benjamin › Updates › + : the photo well first, the title "Carpentry fabrication — Fri 9 Oct", the milestone
Carpentry fabrication; no keyboard until the title is tapped. `/projects/<Benjamin>/updates?compose=1&camera=1` on a phone: the composer opens and
the OS picker opens with it (Chrome; iOS may need the well's press). 1440: unchanged.

## S-25 (1) — "See it as {client}" says Paused

**Why it said "Under way"**: a share's copy maps Blocked to "in progress" (`lib/projects/schedule-model.ts` `clientStateOf`); the portal's
Schedule page lays the live Blocked state over it (Paused), but the portal's Home card (*Where the work stands*, `summaryOf` from the copy alone)
and the studio's Schedule pane (`ClientSchedule`, `clientRowLabel`) did not — so See it as Ryan's Home said "Electrical & plumbing is under way"
while his Schedule said Paused.

**What changed**
- `lib/portal/schedule-model.ts` — `isPausedStage(row, live)`, the one rule (used by `portalStages` and `summaryOf`); `summaryOf(snap, sharedAt,
  live?)` marks `stages[].paused` and `now.paused`; `standsTitle` → "{stage} is paused".
- `lib/portal/schedule.ts` — the home's summary is read with the live stages.
- `components/portal/project/home-cards.tsx` + `project.module.css` — the paused dot / segment tone and "· Paused" (`portal-stands-paused`) beside its
  dates.

**Check** — Ryan (P-2026-001, Electrical & plumbing blocked): his Overview › See it as Ryan → Home: "Electrical & plumbing is paused" (if it is the
running stage of his last share), its row "· Paused"; his Schedule page: Paused (as before). 390 and 1440.

## Q-13 — New client messages

**What changed** (`lib/portal/client-messages.ts`, `lib/portal/client-tells.ts`)
- Events `client_choice` (S-21), `client_paused`, `client_resumed`, `client_handed_over` — email on by default, each its own row in Settings ›
  Notifications › Messages to clients (the table and the words list read `CLIENT_EVENTS`; `app/settings/client-messages-settings.tsx` needed no
  change), editable, logged in Sent messages. New fields `{choice}` · `{reason}` · `{resume}`.
- `client_message` email on by default (`MESSAGE_GAP_MINUTES` kept). No saved `client_messages` row in the baseline, so the default applies.
- `tellClientEvent(kind: 'choice' | 'paused' | 'resumed' | 'handed_over', { projectId?, selectionId? })` — checks the state now, once per moment
  (the hold's start · the resume's moment · the completion in the key). Never throws.

**Check** — Settings › Notifications: eleven events; the four new ones with their words. After K-T wires the calls: put Aisha on hold → Sent
messages has "The work is paused" to Aisha; Resume → "The work is running again"; complete a handover → "… is handed over". Send a message to
Benjamin → an email (a second within the hour → none).

## Probe assertions changed (each with a "(simplify …)" comment)
- `verify-pj-gap-h.cjs` — the team's message is now emailed (was "sends no email", H-Q18) and never on WhatsApp; + a client's message's ⋮ (three rows),
  Make a task (title = his words, then *Open the task*), `?compose=1` focuses the composer; Messages to clients: eleven events (was seven); the snapshot
  adds `task_assignees` · `lead_tasks` so the made task goes back.
- `verify-pj-gap-g.cjs` — the mark's Make a task / Raise a variation order are pressed through its ⋮ (`plan-mark-asks`), the rows keep their ids.
- `verify-pj-r8.cjs` — + the share sends "A choice to make" (outbox), + the client's priced pick drafts a Draft VO; `finally` removes that VO (lines,
  `project_vo_created`) and the `client_choice` outbox rows.
- `verify-pj-fix-F.cjs` — `finally` also removes the drafted VO's lines and its `project_vo_created` line (a household pick now drafts one).
- `verify-pj-gap-d.cjs` — the snapshot adds `notification_outbox` (Share again tells the client).
- `verify-pj-r3.cjs` — + on a phone the photos come before the title, and the title starts "{running milestone} — ".

## Needs from others
1. **K-T · `app/projects/actions.ts`** — after the write in `putProjectOnHold`: `await tellClientEvent('paused', { projectId })`; after the write in
   `resumeProject`: `await tellClientEvent('resumed', { projectId })` (import from `@/lib/portal/client-tells`). Safe to call on a changed hold
   (same start → same key → nothing re-sent). Caveat: an Undo after the email has gone does not unsend it (the same as every client email today).
2. **K-T · `app/projects/ending-actions.ts`** — in `complete()` (shared by `completeHandover` and `approveHandover`), after its write:
   `await tellClientEvent('handed_over', { projectId: c.p.id })`. Q-15's completion Undo cannot unsend it; if you want the email to wait for the
   Undo window, call it from the snackbar's close instead (it checks the project is still completed, so a call after an Undo sends nothing).
3. **K-T · `components/projects/schedule/milestone-panel.tsx`** — under *Waiting on someone*, when the milestone's wait was set by a share, say
   `shareWaitLine(choice)` ("Set by sharing Paint colours") — the map is `shareWaitsOf(projectId)` (`lib/projects/choices.ts`, server) passed with
   the schedule's data; `shareWaitLine` is in `lib/projects/choices-model.ts` (client-safe).
4. **K-T · `components/projects/schedule/client-schedule.tsx` (+ its callers: the Schedule tab's client pane, the Share dialog's preview)** — S-25 (1)
   on the studio's side: take the ids of milestones Blocked live (`isPausedStage(row, { status, deleted })` from `lib/portal/schedule-model.ts`), and
   for those rows print `PAUSED_LABEL` with tone `'paused'` (`pj.dot[data-tone='paused']` and `pj.state[data-tone='paused']` already exist in
   `components/portal/project/project.module.css`). Without it the pane still says "Under way" where the client's page says Paused.
5. **K-M · Money's Needs you / VO rows** — `fetchPickVariations(projectIds)` (`lib/projects/pick-variation.ts`) lists every live VO drafted from a pick;
   a Draft with `by: 'client'` is the "{person} chose {option} · +S$… · Send VO-n" row (`amountMinor` is the order's total). Optional, sturdier:
   `draftVariationFromPick` runs as the signed-in member (`fetchViewer`) — from the portal that is whoever "is you" in the prototype; a system path
   (preparedBy the project's first team member, no viewer check) would let every client pick draft its order regardless of View as.
6. **K-F · the phone site bar's Photos** — open an `<input type="file" accept="image/*,video/*" multiple>` on the press, `stashSitePhotos(files)`
   (`components/projects/updates/site-photos.ts`), then go to `/projects/<id>/updates?compose=1&camera=1` (a picker opened after navigation is
   refused by iOS). The site bar's Message → `/projects/<id>/messages?compose=1`. Keep `camera` in the address in `project-updates.tsx`'s clean-up
   (it is kept today) — the composer drops it once read.
7. **K-N · Needs you** — a client's unread message: *Reply* → `/projects/<id>/messages?compose=1`; "{client} said no to {choice}" → the choice
   (`/projects/<id>/choices?open=<id>`), whose band offers Share again · Choose with {client}.
8. **Schema (K-T)** — nothing needed. Cleaner later: `project_messages.task_id · variation_id` and `project_tickets.task_id · variation_id` (the
   floor plan's columns) instead of the `project_ask_*` lines.

## Repair text
None — no records move. (The new defaults need no backfill: the baseline holds no saved `client_messages` row.)

## Not done / notes
- The milestone panel's "Set by sharing …" line and the studio's client pane's Paused are K-T's files (Needs 3 · 4); the data and rules are in place.
- `project_ask_task` / `project_ask_vo` have no Activity sentence (the task's and the order's own lines show). A sentence ("Dane made a task from
  Benjamin's message") would be a branch in `lib/leads/activity.ts`.
- A client's pick drafts its VO only when the signed-in studio member may change the project (money's rule, Needs 5).
