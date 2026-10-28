# Package R2-A — Money and the VO: outcome (round 2, 2026-10-09)

Her "fix all the pending things": the leftovers of K-M (and the Money-side leftovers of P3 §6). No schema change, no write to local.db, no build,
no server. `npx tsc --noEmit -p .` is clean on every file below; the only errors left are R2-B's work in progress in
`components/projects/project-overview.tsx`. `npx eslint` is clean on every file below, and `npm run design:lint` finds nothing new.
Register rows: `reg-R2-A.md` (REG-R2-A.1…8).

## Per item — what changed

1. **A client's priced pick drafts its VO on a system path** (REG-R2-A.1)
   - NEW `lib/projects/draft-variation.ts` (`import 'server-only'`) has four parts:
     - `DraftActor = { memberId; eventActorId? }`
     - `projectOwnMember(projectId)`: the first active member by `lead_assignees.assigned_at`, else `projects.created_by` if still active, else the first active Owner, else an Admin.
     - `insertVariationOrder(projectId, actor)`: the old insert of `createVariationOrder`, with the same numbering, base-quote fields, GST, `project_vo_created` line and revalidations. It also checks that the project is live and not completed.
     - `draftVariationForPick(selectionId, actor)`: the old body of `draftVariationFromPick`, with the same idempotence (`variationOfChoice` returns `existing`), the same group and line, the same title, `selection_id`, the event's title / choice rewrite and the same revalidations.
   - `app/projects/money-actions.ts`: `createVariationOrder` keeps `forMoney` and `mayChangeProject`, then calls `insertVariationOrder(c.p.id, { memberId: viewer.id })`. The now-unused imports `projectRef`, `validUntil` and `DEFAULT_DENSITY` are gone.
   - `app/projects/payment-actions.ts`: `draftVariationFromPick` keeps the `moneyContext` and `mayChangeProject` gate, then calls `draftVariationForPick(sid, { memberId: viewer.id })`. The refusal words are unchanged (`NO_PRICE_CHANGE`). Its unused imports are gone.
   - `app/portal/choices-actions.ts` (only the one call): `projectOwnMember(p.id)`, then `draftVariationForPick(s.id, { memberId, eventActorId: null })`.
   - On the studio paths, the event is stamped as before: the signed-in member, through `sessionMemberSql`. On the portal path the event has no actor, so Activity reads "System started the variation order …". Every other caller of `createVariationOrder` is unchanged: the floor plan, client asks, the frame and use-invoices.
2. **"Send VO-n" in one press** (REG-R2-A.2)
   - `lib/projects/money-needs.ts`: the row's href is now `/quotes/<id>?send=confirm&from=/projects/<id>/money`.
   - `app/(editor)/quotes/[quoteId]/(edit)/page.tsx` passes `send`.
   - `components/quotes/editor/quote-editor.tsx`, the landing only:
     - `const [landSend] = useState(() => send === 'confirm')`.
     - One effect, keyed on `landSend` alone, sets a `GHOST_MIN_MS` timer that calls `quoteSend.send('confirmation')` through a ref to the latest hook. It does this only when `canSend && kind === 'client'`.
     - A separate effect drops `send` from the address. That re-render can't clear the timer.
3. **A tile's press** (REG-R2-A.3)
   - `components/om/stat-tile.tsx` gains `StatTilePress` and `press?`. With it, the tile is a `<button type="button">` (`onPress`) or a next `<Link>` (`href`), with `data-press` and `aria-label`.
   - `stat-tile.module.css` gains `.tile[data-press]` (a button / link reset, a pointer) and its `:focus-visible` ring.
   - `components/projects/money/project-money.tsx`: `goList('billing'|'costs')` sets the phone switch, then scrolls to `#billing` / `#costs`. To collect and To pay pass `press`, and their value Tooltips lose `tabIndex`.
   - Profit is untouched: `ProfitTile` lives in R2-E's `components/finance/books/project-profit.tsx`, and it keeps its hover.
4. **The invoice page's ghost** (REG-R2-A.4)
   - `components/projects/money/invoice-ghost.tsx` gains `InvoiceGhostShape { copy, next, record }` and `invoiceGhostKeys(id)`.
   - `InvoiceGhost({ shape? })`: the reveal passes the shape, and the loader and `money-hidden-page` read the three remembered flags.
   - `invoice-page.tsx` computes the shape from what it renders (`copy` = shareToken && not a Draft && not external, `next` = `!!next`, `record` = `records`), remembers it, and passes it to the reveal. `GhostShape` is no longer used there.
   - The old `invoice.<id>.draft` key is no longer written. It was stale localStorage only and is harmless.
5. **Money at 390** (REG-R2-A.5): `money.module.css` `.moneyTiles` (phone rules). Both `project-money.tsx` and `money-ghost.tsx` pass it to `StatTiles`.
6. **Drop a bill's PDF** (REG-R2-A.6)
   - `project-money.tsx` has the drop handlers on the tab root:
     - They work only while `costs.can.bill`.
     - They react only to a drag that carries `Files` and lands inside the tab's DOM, so a portal's drop stays the dialog's.
     - The overlay is `data-testid="money-drop"`.
     - The drop calls `costs.c.newBill()`, then hands the file to the dialog's own picker: `[data-testid="bill-pick"] input[type=file]`, `DataTransfer`, then a `change` event. The dialog's `pick` (`readDoc` + `readBillFile`) then runs unchanged.
   - `money.module.css` gains `.tab[data-dropping]`, plus `.drop` / `.dropLine`, which compose `lead-files.module.css` with the line kept sticky in view.
7. **Fee-first in the split dialog** (REG-R2-A.7)
   - `components/projects/money/invoice-dialogs.tsx` `SplitDialog`: the switch row always renders (`data-testid="split-fee-first"`, `data-off` while the rule is off).
   - The switch is disabled while the rule is off, unless the split already opens with a fixed fee.
   - The help names Settings › Finance › Invoices.
   - `invoice-dialogs.module.css` gains `.switchRow[data-off]`.
8. **`&do=sendback`** (REG-R2-A.8)
   - `project-money.tsx`: `sendback` is added to `STEPS`.
     - For an invoice that is `awaiting`, the landing calls `inv.openSendBack(i)` when the viewer `approves` and the project isn't locked.
     - For a PO or an expense, it calls the `Send back` entry of `c.poMenu(po)` / `c.expenseMenu(exp)` when the viewer may answer it.
     - Otherwise it falls through to the panel, as `?open=` does.
   - `lib/projects/money-needs.ts`: `moneyHref` takes `'sendback'`, and the three approval rows' `secondary` is now `Send back → &do=sendback`.
9. **`moneyStory`**: no file read it, so it is removed from `lib/projects/money.ts`. `listOf` stays, because `rebalanceSentence` uses it.

## What to check in the browser
- **1440, Dane, Benjamin `/projects/<ben>/money`:**
  - Tiles: hovering a tile shows a pointer; Tab shows the focus ring on the whole tile; the tiles look as before.
  - Pressing To pay scrolls to Costs, and pressing To collect scrolls to Billing.
  - Hovering the value still shows the how-tooltip.
  - Profit: hover only.
- **Drag a PDF from Finder over Money:** the dashed overlay appears with "Drop to record a supplier bill" in view. Drop it and *Record a supplier bill* opens on "Reading the bill…", then the form with "Read from the file — check it". Check the same as Germaine (a Designer on Ben's team, `recordsBill`) and as a member who may not record a bill (no overlay).
- **`/projects/<ben>/money?open=<PO-2026-008 id>&do=sendback`:** the Send back note opens.
  - With Germaine's S$38.50 expense id: the same.
  - With an invoice that waits for approval (submit one as Germaine, then open as Dane): the invoice's Send back dialog.
  - As Germaine with the PO link: the PO's panel only.
- **A client pick:** View as Michelle (not on Ben's team), then on the portal `/my/demo-studio/choices` pick Paint colours › a priced option.
  - The VO is drafted (`quotes.selection_id`, Draft), with *Prepared by* = Ben's first member.
  - Activity reads "System started the variation order …" beside "Benjamin chose …".
  - Money's Needs you shows "Benjamin chose … · Send VO-n" for the team.
- **Send VO-n:** the editor opens and, after the ghost, *Send for confirmation* opens over it. The address has no `send=`. Escape, then reload: the dialog doesn't open again. As a Designer with quote approval on: the editor opens with no dialog.
- **The invoice page** `/projects/<ben>/invoices/<INV-2026-006>` (sent, owed):
  - The reveal's ghost and the loader's ghost (a second visit) both draw Back · link · Download · a wide button.
  - On a Draft (Completion): Back · Download · a short button.
  - On a paid one (INV-2026-003): Back · link · Download.
- **Payment split:** Marcus `/projects/<marcus>/money` › Change the split, with Settings › Finance › Invoices *May open with a fixed fee* off. The switch shows, disabled, with grey words and the help naming Settings › Finance › Invoices. Switch the rule on and the switch is live.
- **768:** the tiles stay one row (unchanged). The tiles' press and the drop work the same.
- **390:**
  - Ben as Dane: To collect is the full row, with To pay · Profit side by side under it, the same in the ghost.
  - As Germaine (a Designer): To collect, then Contract value, each full width.
  - Pressing To pay switches to Costs and scrolls there.

## Probes changed (each marked `(simplify round 2, R2-A, a deliberate change of this rule)` or `(R2-A)`)
- `verify-pj-r5.cjs` and `verify-pj-gap-b.cjs`: the To collect hover targets `[class*="tileValue"]`, because the value is no longer `[tabindex="0"]`.
- `verify-pj-fix-D.cjs`: the phone's tiles are To collect alone, then To pay · Profit (`tops[1] > tops[0] && tops[1] === tops[2]`).
- `verify-pj-gap-b.cjs` §13: with the rule off, the fee-first switch shows, disabled, and its help names Settings › Finance › Invoices. With the rule on, it is enabled.
- `verify-pj-r8.cjs`: the portal pick's order is `prepared_by` the project's first member, and its `project_vo_created` line has no actor.
- `verify-pj-r6.cjs`: To pay brings `#costs` into view and To collect brings `#billing` into view. `?open=<PO-2026-008>&do=sendback` opens the Send back note.
- Not run (per the brief).

## Needs from others
1. **R2-E (optional, sturdier):** `components/finance/use-costs.tsx` `newBill(file?: File)` plus a `BillDialog` prop `file?: File` that runs `pick(file)` on open. This would replace the drop's DOM hand-off in `project-money.tsx` `dropBill` (it targets `[data-testid="bill-pick"] input[type=file]`). Until then the hand-off works, but it depends on that test id staying on the bill dialog's pick stage.
2. **R2-E (Vicky's call):** if Profit should press to Costs too, `ProfitTile` (`components/finance/books/project-profit.tsx`) could take a `press` and pass it to `StatTile`. Today Profit keeps its hover, as the brief allowed.
3. **R2-D (Vicky's call):** Activity reads a client-pick VO's line as "System started the variation order …", because the event has no actor. If she prefers "{client}'s pick started VO-n", that is a branch in `lib/leads/activity.ts`: the event's detail carries `choice`, and the pick's `project_choice_chosen` line carries `vo`.

## Repair text
None. No records move; the probe in r8 reads the live data.

## Not done / left as is
- The client-pick VO's Activity actor is "System" rather than a member (see Needs 3). The quote's *Prepared by* is the project's member, because a quote needs a member.
- Send VO-n opens nothing extra for a viewer whose Send ▾ doesn't offer *Send for confirmation* (approval first, or already confirmed). They land on the editor.
