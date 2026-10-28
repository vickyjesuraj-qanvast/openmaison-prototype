# Package R2-D — the client loop's records: outcome (round 2, 2026-10-09)

Round 2 of her "fix all the pending things". Three leftovers closed; register rows staged in `reg-R2-D.md` (REG-R2-D.1 · 2 · 3). Checks:
`npx tsc --noEmit -p .` — clean for the whole tree at the time of writing (the two errors R2-F saw in `app/{portal,projects}/messages-actions.ts`
were the new 0084 columns missing from a row literal — fixed, see §1); `npx eslint` on every file below — clean; `npm run design:lint` —
✓ nothing new breaks a house rule; `node --check` on the probe changed. No build, no server, no browser, local.db untouched (the repair SQL
was tried on a scratch copy only, then the copy deleted).

## 1 · The ask's links live on the record (REG-R2-D.1)

**What changed**
- `lib/projects/client-asks.ts`
  - `asksOf(projectId, source, refs?)` now reads `project_messages.task_id · variation_id` / `project_tickets.task_id · variation_id` (new
    private `linksOf`), then keeps only what is still there (a task row that exists, an order not deleted). Same signature and `AskLinks`
    shape, so `lib/projects/messages.ts` (`ProjectChatData.asks`), `lib/projects/tickets.ts` (`TicketRow.asks`) and the ask menu
    (`components/projects/threads/ask-menu.tsx`) needed no change.
  - `makeAskTask` / `raiseAskVariation` write the column (`keepLink`) right after the task / the order is made, then write the `lead_events`
    line as before (kinds `project_ask_task` · `project_ask_vo`, `detail.source · ref · id · title · number`) — it stays as who and when, and
    Activity reads it (§2). One per ask still holds: a second press answers the one the column names; a deleted task / order frees it and the
    next press overwrites the column.
  - The module's header comment says where the link lives now.
- `app/projects/messages-actions.ts` `sendMessage` and `app/portal/messages-actions.ts` (the client's send) — the inserted row literal gains
  `taskId: null, variationId: null` (`lineOf` takes the full `ProjectMessage` type, which 0084 widened; this was the tree's only tsc error).
  `app/portal/messages-actions.ts` is in no package's list — a one-field typing fix, no behaviour change.
- Floor-plan marks: untouched (they keep their own columns).

**Check in the browser** (Dane, Owner) — Benjamin (P-2026-002) › Client › Messages: a client's line ⋮ → Make a task → the snackbar as
before; ⋮ again → *Open the task*. Raise a variation order → the editor on VO-n; ⋮ → *Open VO-n*. Tickets › T-2026-004 ⋮ → the same. In the
DB: the message's / ticket's `task_id` · `variation_id` hold the ids. Delete the task (Tasks) → the message's ⋮ says *Make a task* again.
Nothing looks different at 1440 / 768 / 390.

## 2 · Activity says it (REG-R2-D.2)

**What changed** — `lib/leads/activity.ts` (the asks' lines only)
- Before the event loop: when the lead has `project_ask_*` lines, one read each of the messages and tickets they came from (the writer's
  name; the ticket's number, its raiser) — `projectTickets` imported beside `projectMessages`.
- A branch before round 1's generic `project_…` branch (which used to drop these kinds):
  - "{who} made a task from {client}’s message — “{title}”." · "{who} made a task from {client}’s ticket T-2026-004 — “{title}”."
  - "{who} raised VO-n from {client}’s message — “{title}”." · "… from {client}’s ticket T-… — “{title}”."
  - {client} = the message's writer (the client or a household member by name); a ticket's raiser when the client raised it, else the lead's
    name. Group `messages` or `tickets` (the project Activity's Messages / Tickets chips). Icons `task` · `request_quote` (both already used).
  - Link: the task while it exists → *See Task* (`/tasks?open=`, mapped onto the project's Tasks on the project page); the order while it is not
    deleted → *Open VO-n* (`/quotes/<id>`, which the project page's `back()` gives `?from=` its Activity); else the source — *See Messages*
    (`/projects/<id>/messages`) or *See Ticket* (`/projects/<id>/tickets?open=<ticket>`).
  - An order's line is skipped for a viewer refused the project's money (`seesMoney`), as every money line is. The task's own "created the
    task" line (Tasks chip) and the order's "started the variation order" line (Money chip) are kept — the floor plan's mark does the same.

**Check in the browser** — after §1's presses: Benjamin › Files & notes › Activity › chip **Messages**: "You made a task from Benjamin Han’s
message — “…”" with *See Task* (opens the task on the project's Tasks); a VO raised from a ticket under **Tickets**: "You raised VO-n from Mei
Ling Han’s ticket T-2026-004 — “…”" with *Open VO-n* → the editor, Back returns to Activity. **All** shows both the ask line and the task's own
line. View as Michelle (Designer) on a project whose money she may not see → no VO line. 1440 / 768 / 390 (the line wraps as the others do).

## 3 · The payment-due reminder (REG-R2-D.3)

**What changed**
- `lib/portal/client-messages.ts` — the event `client_payment_due` ("A payment is due today", icon `today` — in the icon subset, section
  `money`), placed after "An invoice is sent"; `DEFAULT_CLIENT_CHANNELS.client_payment_due = { email: false, whatsapp: false }` (off by
  default, switchable on); its email and WhatsApp house drafts; the header comment. `parseClientMessages` gives a saved setting without the key
  the default (off) — no backfill needed.
- `app/settings/client-messages-settings.tsx` — **no edit needed**: the table, the messages list, the edit dialog, Sent messages' labels and
  the actions' `isClientEvent` all read `CLIENT_EVENTS`, so the twelfth row appears with its two switches off and its two messages "· off".
- `lib/portal/payment-due.ts` (NEW, server-only) — `tellPaymentsDue(now = Date.now())`:
  - returns at once (one settings read) while both channels are off;
  - invoices `status = 'sent'` whose `due_at` falls on today's local day (local midnights, the Money tab's "Due today"), project and lead not
    deleted, **not sent that same day** (its own invoice-sent email just went);
  - owed = amount − issued credit notes − payments that count (`countsAsPaid`) − a client's proof waiting (`isPending`) — the overdue bell row's
    rule plus credits; skipped when ≤ 0;
  - each through `tellClient` (the invoice-sent email's own path, so the same people and rules: the client and the invited household, nothing
    while the portal is paused or Money is off, nothing to a client never invited); `ref` = the invoice id, so the outbox key
    `c:client_payment_due:<invoice>:<person>:<channel>` sends it once per invoice and person; `{invoice}` = the stage (as the invoice-sent
    email), `{amount}` = what is still owed. Never throws; answers how many went.
- About "or by email when no portal": read `tellInvoiceSent` → `tellClient` → `peopleOf` — the invoice-sent email reaches only people the portal
  was opened to; a client never invited gets no email (REG-1056: the studio's WhatsApp covers them). The reminder follows that rule exactly.
  An email to a never-invited client (the lead's email, with the invoice's no-login `/invoice/[token]` link) would be a new rule — Vicky's call.

**Check in the browser** (after R2-E's call, below) — Settings › Notifications › Messages to clients: twelve rows, "A payment is due today"
second, both switches off; its two messages listed "· off". Switch Email on. On a scratch DB set Benjamin's INV-2026-006 `due_at` to today and
`sent_at` a week back, open the bell → Settings › Notifications › Sent messages: "To the client · A payment is due today" to Benjamin; open the
bell again → no second row. An invoice not due today, or paid, sends nothing. 390: the row stacks like the others.

## Probe assertions changed — `design-source/verify/projects/verify-pj-gap-h.cjs`
- SNAP + `project_invoices` of Benjamin's project (the reminder moves one due day; put back in `finally`).
- §3 after Make a task: + the client's message carries its task (`project_messages.task_id`) — "(simplify round 2, a deliberate change of this
  rule — round 1 kept the link as a line only)".
- §6: eleven → **twelve** events "(simplify round 2, a deliberate change of this rule)"; + the due-day row present with both switches off;
  + Email switched on is saved; + INV-2026-006 due today → open the bell → one `c:client_payment_due:<inv>:<Benjamin>:email` row, status sent;
  no other invoice told; a second look sends nothing more. **These three need R2-E's call** — without it the probe fails there, by design.
- §11: + Activity has "made a task from …’s message — “".

## Needs from others
1. **R2-E · `app/notifications/actions.ts` `fetchFeedAction`** — after `await deliverDerived(m.id, feed.rows)`:
   ```ts
   /* (simplify round 2 — P3 §6.8, R2-D) the client's "A payment is due today" — once per invoice on its due day, off until switched on */
   await tellPaymentsDue()
   ```
   with `import { tellPaymentsDue } from '@/lib/portal/payment-due'`. It is cheap while off (one settings read) and never throws. If R2-E
   would rather put it in `lib/notifications/queries.ts` `derivedDue`, use a dynamic import there
   (`const { tellPaymentsDue } = await import('@/lib/portal/payment-due'); await tellPaymentsDue(now)`) — a static one would make a cycle
   (payment-due → client-messages-send → delivery → queries). PRODUCTION: the same sweep that runs `deliverDerived` should call it once per run.
2. **R2-C** (holding client emails) — `tellPaymentsDue` calls `tellClient` with no hold; the reminder has no Undo, so it should go at once. If
   `tellClient`'s default changes to hold, keep this event immediate (the probe asserts `status = 'sent'`).

## Repair text (insert as the next free R-number — R95 if nobody took it; idempotent, tried on a scratch copy: first run filled the rows, second run 0)
```ts
  /* ── R95 · the client asks keep their task and order on their own rows (simplify round 2, S-22 — her "fix all the pending things" 2026-10-09) ──
     Round 1 kept "this message / ticket made task T and VO V" only as `lead_events` lines (`project_ask_task` · `project_ask_vo`, detail.source ·
     ref · id) — no column existed. Migration 0084 gave `project_messages` and `project_tickets` their `task_id` · `variation_id`, which the ask menu
     now reads. The lines stay (who did it and when; Activity's sentence). Filled from the newest line per ask whose task / order is still there,
     only where the column is empty. Idempotent. */
  {
    console.log('\nR95 The client asks — each message’s and ticket’s task and order on its own row')
    let n = 0
    const LIVE = {
      project_ask_task: `EXISTS (SELECT 1 FROM lead_tasks t WHERE t.id = json_extract(e.detail, '$.id'))`,
      project_ask_vo: `EXISTS (SELECT 1 FROM quotes q WHERE q.id = json_extract(e.detail, '$.id') AND q.kind = 'variation' AND q.deleted_at IS NULL)`,
    } as const
    for (const [table, source] of [['project_messages', 'message'], ['project_tickets', 'ticket']] as const) {
      for (const [col, kind] of [['task_id', 'project_ask_task'], ['variation_id', 'project_ask_vo']] as const) {
        const match = `e.project_id = ${table}.project_id AND e.kind = '${kind}' AND json_extract(e.detail, '$.source') = '${source}' AND json_extract(e.detail, '$.ref') = ${table}.id AND ${LIVE[kind]}`
        const r = await client.execute(`UPDATE ${table} SET ${col} = (SELECT json_extract(e.detail, '$.id') FROM lead_events e WHERE ${match} ORDER BY e.at DESC LIMIT 1)
          WHERE ${col} IS NULL AND EXISTS (SELECT 1 FROM lead_events e WHERE ${match})`)
        n += r.rowsAffected
      }
    }
    note(`${n} ask link(s) moved onto their message or ticket`)
  }
```
And one line in `checks`:
```ts
    ['client ask whose task or order is still there but not on its message or ticket (simplify round 2, R95)', `SELECT e.id FROM lead_events e WHERE e.kind IN ('project_ask_task','project_ask_vo') AND ((e.kind = 'project_ask_task' AND EXISTS (SELECT 1 FROM lead_tasks t WHERE t.id = json_extract(e.detail, '$.id'))) OR (e.kind = 'project_ask_vo' AND EXISTS (SELECT 1 FROM quotes q WHERE q.id = json_extract(e.detail, '$.id') AND q.kind = 'variation' AND q.deleted_at IS NULL))) AND NOT EXISTS (SELECT 1 FROM project_messages m WHERE json_extract(e.detail, '$.source') = 'message' AND m.id = json_extract(e.detail, '$.ref') AND (CASE e.kind WHEN 'project_ask_task' THEN m.task_id ELSE m.variation_id END) = json_extract(e.detail, '$.id')) AND NOT EXISTS (SELECT 1 FROM project_tickets k WHERE json_extract(e.detail, '$.source') = 'ticket' AND k.id = json_extract(e.detail, '$.ref') AND (CASE e.kind WHEN 'project_ask_task' THEN k.task_id ELSE k.variation_id END) = json_extract(e.detail, '$.id'))`],
```
Today's local.db and the baseline hold no `project_ask_*` line, so the block changes nothing there; it is for any DB that pressed Make a task /
Raise a variation order under round 1.

## Notes / for Vicky
- Under **All**, an ask's line and the task's own "created the task" line (or the order's "started the variation order") sit side by side, as a
  floor-plan mark's do. Folding the twin into the ask line (REG-676's way for a render call-back) would take the line out of the Tasks / Money
  chips — left as is; her call.
- The reminder runs when someone in the studio opens the bell on the due day (the prototype's rule for every derived reminder); a day nobody
  opens it, no reminder goes — PRODUCTION's sweep closes that.
- An invoice due today that was sent today gets no reminder (its own email went that day) — a guard I chose; easy to drop.
