# Package R2-E — Finance, the bell, ⌘K: outcome (simplify round 2, 2026-10-09)

Her "fix all the pending things". Four leftovers closed, plus the coordinator's three late asks (R2-D's payment-due email, R2-A's Profit press and
the bill drop). `npx tsc --noEmit -p .` clean (the whole tree, at the end); `npx eslint` clean on every file below; `npm run design:lint` —
nothing new breaks a house rule (baseline untouched). No build, no server, no browser, no local.db writes (two read-only `sqlite3 -readonly`
looks at the demo's members and notifications). Register rows: `reg-R2-E.md` (REG-R2-E.1…6).

## 1 · A member's PayNow (F1 §6.9.3)
- **`lib/finance/model.ts`** — `PAYNOW_MAX` · `PAYNOW_MSG` · `cleanPayNow(v)` ('' none · the bare ID · null = neither) · `payNowShown(v)` ("9661 4208").
  One reading of a PayNow ID for the app: `payNowProxy` (`lib/projects/payments-paynow.ts`, pure — the PayNow QR's own). *Note:* Profile's studio
  PayNow field has no check of its own today (only its QR reads it), so "validate like Profile" = the QR's reading, with Profile's label.
- **`app/company/members-actions.ts`** — `setMemberPayNow(memberId, { paynow })` → `{ ok, before, paynow } | { error }`: Owners / Admins for anyone, a
  member for themself (`'Only Owners and Admins change another member’s PayNow'`), `PAYNOW_MSG` when unreadable; revalidates Members, Finance and
  `/projects` (layout). Answers `before` for Undo.
- **`lib/company/members.ts`** — `fetchMembersData` masks `paynow` on every row but the viewer's own unless they run the studio.
- **`components/company/members-view.tsx`** — the row's second line: *PayNow: 9661 4208 · Change* / *PayNow: not set · Add it* (`data-testid`
  `member-paynow`, `member-paynow-edit`), composed on `.sigState`; the house `Dialog size="form" width={400}` (`member-paynow-save`), Enter saves,
  closes once the save lands, one sentence + Undo. No CSS change.
- **`lib/finance/queries.ts`** — `CostPerson.paynow`; `fetchPeople(viewer)` hands everyone's PayNow to whoever pays (`paysOut`), only their own
  to anyone else. Callers pass the viewer: `fetchProjectCosts`, `fetchFinance`, `lib/finance/books.ts` `fetchBooks` · `fetchCommissions`.
- **`components/finance/payout-dialog.tsx`** — `PayTo` exported (the *Pay to* band), PayNow shown grouped. **`use-costs.tsx`** — a claim's target
  carries `memberPayTo(claimantId)` (was `null`). **`books/commission-dialogs.tsx`** — `PayTarget.payNow` · `PayMemberTarget.payNow`; both pay
  dialogs draw `MemberPayTo` ("Pay to yourself" for your own). Hosts: **`books/commissions-view.tsx`** (`payNowOf`), **`todo/todo-workspace.tsx`**.

## 2 · The bell's approval rows act in the row (P2 §6.7)
- **`lib/notifications/model.ts`** — `FeedActKind` · `FeedAct` · `FeedRow.act?` (approval rows' part only).
- **`lib/notifications/queries.ts`** — `approvalActs(rows, memberId, role)` run by `fetchFeed`: for stored `update_review` · `po_review` ·
  `expense_review` · `invoice_review` · `schedule_ask` · `handover_review` rows, it reads each record from the row's own `href` (one read per kind),
  and sets `act` only when the record still waits, its project is live, and this member answers it (Owners / Admins; an update also its named
  reviewers). A `schedule_ask` row is a Done (`… done — approve it?`, `doneAskedAt` set), more time (a pending `project_milestone_extensions` on
  that milestone) or a share (`?share=1`, the project's pending `project_share_requests`). PO and invoice carry `door` = Money's
  `?open=<id>&do=approve` (R2-A's / K-M's arrival opens their *Approve and send*). Designers exit at once (no reads).
- **`components/shell/notifications-panel.tsx`** (+ css `.acts`) — under a row with `act`: *Approve* (or *Approve and send* = the door) and
  *Send back* (*Decline* for more time); test ids `notification-acts` (`data-act` = kind), `notification-approve`, `notification-send-back`.
  Actions, sentences and Undos are the records' own: `approveProjectUpdate` / `sendBackProjectUpdate`, `answerExpense` (+ `undoExpenseAnswer`),
  `sendBackPo`, `sendBackInvoice`, `approveMilestoneDone` (+ `undoMarkDone`) / `sendBackMilestoneDone` (+ `undoMilestoneStatus`), `answerMoreTime`
  (+ `undoMoreTimeAnswer`), `shareSchedule` with the ask's `only` + note / `sendBackShareAsk` (+ `reopenShareAsk`), `approveHandover` (+
  `undoCompleteHandover`) / `sendBackHandover`. Send back dialogs: the house `NoteDialog` in each record's words; the Schedule's `AskDialog` for a
  Done and more time (`React.lazy`, mounted only while the feed holds such a row, so the shell doesn't carry the milestone panel). While a dialog
  is open the desk popover drops to z 105 (under the scrim) and ignores Esc; it stays open behind. After an answer the row is marked read and the
  feed re-read (the row loses its buttons); an Undo re-reads it too. A refusal: `couldnt(…)` + *Open it* (the record).
- **`app/notifications/actions.ts`** — unchanged for this item (the feed carries `act`).

## 3 · ⌘K finds the new settings
- **`lib/global-search/model.ts`** — two `settingCard`s in `PAGES` after Finance's rows: *Document numbers* (`finance`, `#document-numbers`) and
  *What waits for an Owner or an Admin* (`projects`, `#owner-approvals`), with K-S's words widened. `useArrival` lands on the card (both ids exist).

## 4 · Dead code
- **`app/finance/books-actions.ts`** — `setCreditRules` removed (grep: no caller in `app/`, `components/`, `lib/`, `scripts/`, probes). Imports
  still used by `fetchCreditRules`.
- **`setEntityNumbering` is not in this package's files** — it lives in `app/projects/money-actions.ts:761` (R2-A's area) and has no caller either
  (Needs 3).

## The coordinator's asks
- **R2-D's Needs 1** — `app/notifications/actions.ts` `fetchFeedAction`: `await tellPaymentsDue()` right after `deliverDerived(…)`, static import
  from `@/lib/portal/payment-due` (R2-D's comment). Done.
- **R2-A's Needs 2 — Profit presses to Costs** — `components/finance/books/project-profit.tsx` `ProfitTile({ profit, onPress? })`: with `onPress`
  the house `StatTile` gets `press` (label "Profit {figure}, {word}. {how}. Opens Costs"), and the value drops its own `tabIndex` (the tile is the
  one focus stop; its hover stays). **The call (R2-A's file, `components/projects/money/project-money.tsx:231`):**
  `{books?.profit ? <ProfitTile profit={books.profit} onPress={() => goList('costs')} /> : null}`
- **R2-A's Needs 1 — the bill drop** — `components/finance/bill-dialog.tsx` `BillDialog file?: File | null`: opens on *Reading the bill…* and reads
  that file through its own reader once (`readInto`, shared with the dropzone's `pick`; a ref keeps it to once per file); `use-costs.tsx`
  `newBill(file?: File | null)` (a press passes no File — anything that isn't a `File` is ignored) passes it. **The call (R2-A's file,
  `project-money.tsx` `dropBill`, ≈ line 260) becomes:** `const dropBill = (file: File) => { if (!costs) return; costs.c.newBill(file) }` — the
  `requestAnimationFrame` hand-off to `[data-testid="bill-pick"] input[type="file"]` goes.

## What to check in the browser (1440 / 768 / 390)
- **Company › Members as Dane** — every row: *PayNow: not set · Add it* (or Germaine's / Michelle's number after the repair). Change → the
  dialog; "12345" → the field error; "201912345k" → saved as 201912345K, one sentence + Undo; blank → taken off. At 1440 each second line stays
  one line (the summary ellipsizes); at 768 it wraps as it already does; 390 no sideways scroll. **As Germaine** — only her own row has the line.
- **Finance › To do as Dane** — To pay · Michelle's "Floor protection boards" → *Pay back* → *Pay to Michelle · PayNow 9772 6315* with its copy.
  *Pay {first}* (commission) → the band when they have a PayNow. Commission › a line's *Pay* → the same. Your own: "Pay to yourself".
- **The bell as Dane** (any page): Germaine's S$38.50 expense → *Approve · Send back*; Approve → "“Grab to site …” approved" + Undo, the row
  plain; Send back → money out's *Send back* / *What should change?* over the bell (it stays behind, dimmed). PO-2026-008 → *Approve and send* →
  Benjamin's Money with its send open. Michelle's "1 week more on Carpentry fabrication" → *Approve · Decline*; Decline → the Schedule's *Decline
  more time on Carpentry fabrication?*. An update in review → *Approve · Send back* (*Why does it go back?*). **Phone (390)** — the bell's sheet,
  the same buttons; Send back's dialog as a sheet above it. **As Germaine** — no buttons in her bell.
- **⌘K** — "document numbers" → *Document numbers* → Settings › Finance, the card ringed; "owner or an admin" → *What waits for an Owner or an
  Admin* → Settings › Projects.
- **Money (after the merge's two calls)** — the Profit tile presses to Costs (a phone switches to Costs first); drop a bill's PDF on Money → the
  dialog opens on *Reading the bill…* and fills.

## Probes
- **Changed:** `design-source/verify/projects/verify-pj-gap-c.cjs` — the bell's more-time row: clicking the whole row would now land on its
  buttons, so it presses the row's first button (its words) and asserts *Approve · Decline* are there `(simplify round 2, a deliberate change of
  this rule — P2 §6.7)`.
- **Checked, unchanged:** `verify-p6.cjs` (its "Skirting" bell row is a Price book proposal — no buttons, one `button`), `verify-pj-r3.cjs` (scrolls
  to a review row only), `verify-sw-r4.cjs` (member rows' children inside the card), `verify-p7.cjs` / `verify-search.cjs` (⌘K terms unaffected —
  "quote number" still filters to *Quote numbers* by its title).
- **New:** `design-source/verify/simplify-projects-finance/verify-r2e.cjs <scratch.db> [shotDir] [base]` — the PayNow field (error, save, Undo),
  what a Designer sees, Pay back's and Pay {member}'s band, the bell's buttons, Approve + Undo on the expense, Send back's dialog, Approve and send's
  landing, a Designer's plain bell, ⌘K's two rows, 390. Puts members' PayNow, Dane's read marks and the expense back in `finally`. Not run here.

## Needs from others
1. **Orchestrator / R2-A — `components/projects/money/project-money.tsx`** — the two calls above (ProfitTile `onPress`; `dropBill` →
   `costs.c.newBill(file)`).
2. **Orchestrator — `scripts/repair-demo-data.ts`** — the repair below (then the baseline).
3. **R2-A / orchestrator — `app/projects/money-actions.ts:761`** `setEntityNumbering` has no caller since K-S's Document numbers; drop it with
   its `EntityNumbering` import if nothing else needs it.
4. **Developers (not a screen change)** — about twenty server reads send whole `members` rows to client pages (`db.select().from(members)` in
   `lib/leads/*`, `lib/quotes/*`, `lib/projects/queries.ts`, `lib/contracts/queries.ts` …), so `paynow` now rides along with `phone` and `email`
   as they already do. Members and Finance mask it; with real sign-in those reads should name their columns.
5. **Ghost (no change made)** — `MembersGhost` (`company-ghosts.tsx`, not this package's) draws the second line's switch, capacity, summary and one
   text button; like the signature state, About page and Deactivate, the PayNow item isn't drawn — the row's height is unchanged at 1440.

## Repair text (idempotent — after R94)
```ts
  /* ── R-R2-E · a member's PayNow (simplify round 2 — F1 §6.9.3, her "fix all the pending things" 2026-10-09) ───────────────────────
     Germaine and Michelle are the demo's members who are paid back for claims and paid commission: their PayNow is their mobile, as a
     Singapore designer's usually is. Kept bare (eight digits), as Company › Members saves it. Only where none is set. */
  {
    console.log('\nR-R2-E a member’s PayNow — Germaine and Michelle')
    const r = await client.execute(`UPDATE members SET paynow = phone WHERE id IN ('germaine', 'michelle') AND (paynow IS NULL OR paynow = '') AND phone IS NOT NULL AND phone <> ''`)
    note(`${r.rowsAffected} member PayNow(s) set`)
  }
```
Verification query (the closing list): `['Germaine or Michelle without a PayNow (R-R2-E)', `SELECT id FROM members WHERE id IN ('germaine','michelle') AND (paynow IS NULL OR paynow = '')`]`.

## Not done, and why
- `quote_approval`, `price_book_proposed` and `commission_asked` rows stay links: not in this item's list (P2 §5's approvals are the project's), and
  a commission ask's answer needs its rate dialog.
- The Done approval in the bell doesn't offer the Schedule's *Tell {client}* WhatsApp afterwards (`offerTell`) — the bell has no client phone;
  the sentence and Undo are the record's.
- `npm run design:anatomy` needs a running server (the orchestrator's).
