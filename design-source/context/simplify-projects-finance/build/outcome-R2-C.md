# Package R2-C — moments and held client emails: outcome (round 2, 2026-10-09)

This is round 2 of her "fix all the pending things". It closes three leftovers from round 1 (K-T's three caveats and the README's "an Undo can't
unsend the email"). The register rows are staged in `reg-R2-C.md` (REG-R2-C.1…4).

Checks:
- `npx tsc --noEmit -p .`: clean for every file below. The tree's only error at the time of writing is
  `components/shell/notifications-panel.tsx(126)` `noting` used before its declaration, which is R2-E's file.
- `npx eslint` on every file below: clean.
- `npm run design:lint`: ✓ nothing new breaks a house rule.
- `node --check` on the probe I changed: passes.

No build, no server, no browser. local.db is untouched, and the schema and migrations were not touched (0084's `send_after` and `held` were
already in place).

## 1 · An Undo also takes back the client's email (REG-R2-C.1)

**How it works**
- `lib/notifications/delivery.ts`
  - `holdClientMail(ms, work)` runs an action's sends in a hold scope (AsyncLocalStorage). The scope follows the action's own async calls, so
    money's `sendInvoice`, the schedule's `shareSchedule` and an update's go-out need no flag, and a browser cannot set one.
  - Inside the scope, `deliver` writes a client's message to the outbox with `status = 'held'` and `send_after = now + ms`, and answers
    `'held'`. The adapter is not called. The address is read at that moment.
  - Only `HELD_EVENTS` are held: `client_paused` · `client_resumed` · `client_handed_over` · `client_invoice_sent` · `client_schedule_shared`
    · `client_update`, and only for a recipient who is not a member.
  - **Per R2-D's note:** every other event goes at once even inside a scope. That covers `client_payment_due` ("A payment is due today",
    raised on the bell's read and in no scope anyway), receipts, replies, choices and messages. Messages to members never wait.
  - `releaseHeldMessages(now)` sends every held row whose `send_after` has passed, oldest first, through the same adapter. It claims each row
    first (`held` → `sending`, compare-and-set), so two releases send it once. The row then gets its result (`sent` / `failed` /
    `no_address`), the adapter's name, and `created_at` set to when it went.
  - The release is called at the top of every `deliver`, at the top of `deliverDerived` (the bell's read, `fetchFeedAction`), and in
    `fetchSentMessages` (`app/notifications/outbox-actions.ts`).
  - `cancelHeldMessages(ids, leadId)` deletes the rows still held, in one `DELETE … RETURNING`. It only touches rows for the Undo's own lead
    with status `held`. It answers what it took back (`HeldMail { ids, to }`). `cancelHeldEvent(leadId, event)` does the same for one event and
    is used by Reopen.
- `lib/notifications/held.ts` (new, pure)
  - `UNDO_SNACKBAR_MS` is 10 s: the house snackbar with an action stays 8 s and always runs on at least 2 s after its clock is paused
    (REG-898, `LONG_MS` · `AFTER_HOLD_MS`).
  - The release is lazy and an Undo deletes anything still held, so a longer hover rarely loses the Undo.
  - Also here: `HELD_EVENTS`, `HeldMail`, `heldIds` (the strings an Undo carries back), `unsentWords` (" — and the message to Aisha won’t go")
    and `heldWords` ("Held — goes at 3:42 PM unless undone").
- `lib/portal/client-messages-send.ts` — `tellClient` counts a held message as going. `lib/portal/client-tells.ts` — the doc comment only.

**The actions** (each Undo token carries `held?: string[]`, the outbox row ids; each Undo answers `unsent: HeldMail`)
- `app/projects/actions.ts`
  - `putProjectOnHold` and `resumeProject`: `tellClientEvent` inside `holdClientMail(UNDO_SNACKBAR_MS)`. `undoHoldChange` cancels them.
  - `startProjectSheet` is now a wrapper. `runStartSheet` (the old body, not exported) runs inside the scope, which holds the deposit invoice's
    email. `undoStartProjectSheet` cancels it after its refusal checks pass.
- `app/projects/schedule-actions.ts`
  - `markMilestoneDone` and `approveMilestoneDone` run `runDoneTicks` inside the scope: the share's, the photos' and the invoice's emails.
  - `DoneUndo.held` carries the rows. `undoMarkDone` cancels after its refusal checks pass, before it puts things back.
- `app/projects/ending-actions.ts`
  - `complete()` holds `handed_over` for Q-15's window (`UNDO_MINUTES` × 60 s = 10 min) and returns the ids.
  - `completeHandover` and `approveHandover` put the ids in `HandoverUndo.held`, and `undoCompleteHandover` cancels them.
  - **My call:** `reopenProject` also cancels a still-held `client_handed_over` for the lead. Reopening inside the ten minutes would otherwise
    tell the client "handed over" after the reopen. Its sentence says so too.

**The words** (the Undo composes them from the server's answer, so "won't go" is said only when something was really taken back)
- The Start sheet (`project-dialogs.tsx`): "{project} is back to Setting up — and the message to Marcus won’t go".
- The Mark done sheet (`mark-done-sheet.tsx`) and the approval (`project-schedule.tsx` `approveDone`): "{m} is back as it was — and the
  messages to Benjamin won’t go". The approval's Undo was silent before; it now says the sheet's own sentence.
  - Both replace the *Tell {client} on WhatsApp too?* offer, which is now keyed `tell-client`.
- Complete handover's Undo and Reopen (`use-project-ending.tsx`): "{project} is in progress again — and the message to …".
- The resume's Undo (`project-frame.tsx` `resume()`, plus one import line at the top): "{project} is on hold again — …". It replaces the
  *Tell {client}* snackbar (same key), so nothing is left to tell.

**Check in the browser** (Dane, Owner)
- **Hold and resume** — Ryan D'Souza (P-2026-001, invited):
  - Stage ▾ › On hold → Put on hold.
  - Settings › Notifications › Sent messages: "To the client · The work is paused" to Ryan, Status *Held — goes at {now + 10 s} unless undone*,
    Sent "—".
  - Back on Ryan, put him on hold again and press Undo within the snackbar: "… is running again — and the message to Ryan won’t go". Sent
    messages has no new row.
  - Let a hold sit past 10 s, then open Sent messages: the row reads *Sent* with its real time.
  - Resume, then Undo: "… is on hold again — and the message to Ryan won’t go", in place of the Tell Ryan snackbar.
- **Mark done** — Benjamin (P-2026-002) › Schedule › Carpentry fabrication › Mark done with Show it on his schedule ticked.
  - Undo: "Carpentry fabrication is back as it was — and the message to Benjamin won’t go". The share's email never appears in Sent messages.
  - Without Undo, Sent messages shows "Your schedule has changed" Held, then Sent.
- **The Start sheet** — Marcus Teo (P-2026-004) with ☑ invite + ☑ deposit → Undo: "… is back to Setting up — and the message to Marcus won’t go"
  (the deposit invoice's email).
- **Handover**
  - Complete Benjamin's handover (Complete anyway): Sent messages shows "{project} is handed over" Held, going 10 minutes later.
  - Undo: "… is in progress again — and the message to Benjamin won’t go".
  - Alternatively, as Dane, Reopen within the 10 minutes: "… is in progress again — and the message to Benjamin won’t go".
- **Not held** — anything without an Undo still goes at once: a reply to a ticket, a message, a choice shared, a receipt, R2-D's payment-due.
- **Phone** — at 390 the Sent messages card shows "Status · Held — goes at …" and "Sent · —". Nothing else is new to see at 768 / 390.

## 2 · The Mark done sheet's photos post as the one who asked (REG-R2-C.3)

- `lib/projects/acting-author.ts` (new, server-only): `asAskedBy(authorId, work)` and `askedAuthor()`, on AsyncLocalStorage, set on the
  server only.
- `app/projects/schedule-actions.ts`: `runDoneTicks(…, { author })`. `approveMilestoneDone` passes `done_asked_by`, and only the photos'
  `saveProjectUpdate` runs inside `asAskedBy`.
- `app/projects/updates-actions.ts` (in no package's list; a minimal edit)
  - A new update reads `author = askedAuthor() ?? me`. It writes `authorId` and, when it goes for review, `submittedBy` as the author. The
    first trail line's actor is the author (`log(…, actorId)`). `publishedBy` stays the presser.
  - `saveProjectUpdate`'s signature is unchanged, so a client cannot pass an author.
- **Check:**
  - As Germaine (View as), Settings › Projects › *Milestone completion needs approval* on. Benjamin › Schedule › Carpentry › Mark done with
    two photos → Ask to approve.
  - As Dane, *Approve as done* in the panel.
  - Updates: "Carpentry fabrication is done" by Germaine. Activity: "Germaine posted the update …". The client's update email: "{sender}" is
    Germaine.

## 3 · One reminder key (REG-R2-C.4)

- **What I found:** the key already matched. The portal need for a stage to confirm is `stage:${s.id}` (`lib/portal/needs.ts`), and
  `s.id` is the shared snapshot row's id, which is the milestone's id (`clientRows`). So `stage:<milestoneId>` from the Hand over sheet was
  the same string.
- **What differed:** the record's title ("Confirm {m}" vs the need's "Confirm that {stage} is done"), the WhatsApp's words and link, and the
  sheet never showed *reminded …*.
- **What changed** (`components/projects/ending/handover-dialog.tsx`)
  - The key is built by one `stageNeedKey` helper. The recorded title and the WhatsApp line are `confirmTitle(m)`, and the link is
    `…/schedule#stage-<id>`, as the panel's.
  - The row says "· reminded {agoText}" from `HandoverRead.reminded`. That map is `app/projects/ending-actions.ts` `readHandover` folding
    `portal_reminded` the way `lib/portal/access.ts` does.
- **Check:** Benjamin › Complete handover → "{client} has confirmed the handover stage" › Remind (a WhatsApp tab).
  - The row reads "… · reminded just now".
  - Close, open Invite to Portal: the same item reads "reminded just now". The Overview's With Benjamin row reads the same.
  - The one Activity line reads "Dane reminded Benjamin Han on WhatsApp: “Confirm that handover and defect check is done”."
- **Not changed:** the invoice's *Remind* in the sheet stays money's own record (`remindInvoice` → "Reminded n×" on Money). The panel's
  payment need keeps its own `payment:<id>` reminders, as before. That one is not in the brief's scope.

## 4 · The resume snackbar (item 4)

`components/projects/project-frame.tsx` `resume()` only, plus one import line (`unsentWords`). The rest of the file is untouched.

## Probe assertions changed
- `design-source/verify/projects/verify-pj-gap-a.cjs`, after Ryan's hold:
  - It asserts the *works are paused* email is in the outbox as `held` with a `send_after` (simplify round 2 — R2-C, a deliberate change of
    this rule).
  - Its clean-up deletes that held row, so the probe's reverted hold never emails.
- No other probe reads these statuses or Undo sentences. `gap-a`'s resume and Undo still match `/is running again/`.
- Probes that read `notification_outbox` (`gap-d` · `e` · `g` · `h` · `i`, `r8`) look at events that are never held.

## Needs from others
1. **Orchestrator: the hold's Undo words** (the server already takes the email back; only the sentence is missing). Two files outside my list
   share the helper `holdUndo`. Replace it with:
   ```ts
   const holdUndo = (u: HoldUndo, back: string) => () => { void run('put it back', async () => { const x = await undoHoldChange(u); if (!('error' in x)) snackbar({ message: `${back}${unsentWords(x.unsent)}` }); return x }, undefined, { refresh: true }) }
   ```
   and add `import { unsentWords } from '@/lib/notifications/held'` in:
   - `components/projects/project-frame.tsx` ~line 202 (the hold dialog's Undo, ~490; `resume()` no longer uses it)
   - `components/projects/projects-workspace.tsx` ~line 219 (the listing's hold and resume)
2. **Developers (production):**
   - Run `releaseHeldMessages()` from the same sweep that runs `deliverDerived` for every member.
   - A later additive migration could index `notification_outbox (status, send_after)`. The release reads that pair on every delivery; the
     demo's table is small.
   - A row stuck in `sending` (a crash mid-send) reads *Sending* in the log.
3. **Files touched outside the package's list** (no package owns them; each edit is minimal):
   - `lib/notifications/outbox.ts`: `SentStatus` + `held` · `sending`, `SentMessage.sendAfter`, `statusWords`.
   - `app/notifications/outbox-actions.ts`: release on read, `sendAfter` mapped.
   - `app/projects/updates-actions.ts`: the asker as author.
   - New files: `lib/notifications/held.ts`, `lib/projects/acting-author.ts`.

## Repair text
None. No records move, and the baseline holds no held row.

If `npm run db:baseline` is run within 10 s (or within 10 minutes of a handover) of a held moment, that row is stored as held. It is released
(sent) on the first delivery after a Reset. That is harmless, but run the baseline after the window passes.

## Not done / notes
- Sends outside these moments go at once, as the brief says: the standalone *Share N changes*, an update posted from the composer, an invoice
  sent from Money. Their Undo (where they have one) still can't unsend. Holding them would mean wrapping those actions in `holdClientMail` too:
  one line each, in R2-A's and others' files.
- The Start sheet's and the Hand over sheet's *Tell {client}* WhatsApp opens on the press (the user sends it). An Undo can't take back a
  WhatsApp the person already sent themselves.
