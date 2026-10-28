# Outcome — P-B · Money out (parity map build, 2026-10-10)

Every item in the brief's P-B section is built. `npx tsc --noEmit` is clean for every file below (the errors left are other packages' work in
progress); `npx eslint` is clean on them; `npm run design:lint` passes for them (the two remaining breaks are `components/projects/threads/thread.module.css`,
P-G's). No server, no browser, no `local.db` was touched. Register rows staged in `reg-P-B.md` (REG-P-B.1…11). The probe is
`design-source/verify/parity-map-build/verify-pm-b.cjs` (written, not run).

**The shared helper first:** `lib/finance/entity-scope.ts` (written at the start for P-A and P-C) — `entityOptions(entities)` (EMPTY with fewer
than two → render no pill, no chips), `entityOf(options, key)` (the address's `?entity=<id>`, or a name for an old link; null = all),
`matchesEntity(row, scope, options?)` (a row = its stored entity name, or `{ entity }` / `{ issuingEntity }`; null/blank = the studio's own; a name
no entity carries any more counts as the studio's own when `options` is passed), `entityOfRow`, `entityChip`, `entityPillLabel` ("Issued by: All"),
`entityMenu` (All entities + each, *Retired* as meta), `withEntity(href, key)`, `ENTITY_PARAM`. The cost records' entities: `costEntities(summary,
projectEntity)` in `lib/finance/costs.ts` (a PO's own, a bill's PO's, an expense's own, a payment's record's — else the project's). The
Issued by column: `ENTITY_COL` + `entityCell` in `components/finance/cost-tables.tsx`.

## Per map row

### MO-011 · Invoice to on a PO
- **What changed:** the PO dialog's new *More details ▾* (New project's disclosure) holds **Invoice to**, prefilled with the issuing entity's
  letterhead (name, then address — `PoContext.billTo`, from `letterheadOf`). Only a value that differs from the letterhead is saved
  (`purchase_orders.bill_to`); then the paper prints *Invoice to* under the vendor (and so the vendor's link), the panel lists it, Duplicate copies it.
- **Files:** `components/finance/po-dialog.tsx`, `components/finance/po-paper.tsx` (+ NEW `po-paper.module.css`), `components/finance/use-costs.tsx`
  (panel fact), `lib/finance/model.ts` (`PoRecord.billTo`), `lib/finance/queries.ts` (`poRecord`, `PoContext.billTo`, `billToOf`), `app/finance/po-actions.ts`
  (`PoInput.billTo`, `savePo`, `duplicatePo`).
- **Check:** Dane on Ryan D'Souza's Money › New › Purchase order → *More details* → Invoice to reads "Demo Studio Pte Ltd / {address}"; change it,
  save, open the PO page (`⋮ › View the PO`) and the vendor's link — "Invoice to" under the vendor. Unchanged → nothing printed. 1440 / 390.

### MO-027 · Download CSV on the vendor's page
- **What changed:** `/po/[token]` gets an outlined **Download CSV** (icon `csv`, in the subset) beside Download PDF — the lines + Subtotal · GST ·
  Total · Advance rows through the house `buildTable` · `downloadBlob`, named `{PO}.csv` (`poSheet` in `lib/finance/model.ts`).
- **Files:** `components/finance/vendor-link-page.tsx`, `lib/finance/model.ts`.
- **Check:** open PO-2026-003's link (`select vendor_token from purchase_orders where number='PO-2026-003'`), press Download CSV; at 390 both
  buttons wrap on the bar's own line.

### MO-038 · A PO made elsewhere
- **What changed:** Money out's and To do's New ▾ → **Record a PO made elsewhere** (for whoever prepares POs) → NEW `components/finance/external-po-dialog.tsx`
  (Project in Finance · Vendor pick-or-add · *Its PO number* · *What it comes to (S$)* + *Includes GST* · *Made on* · *What it's for* · its file,
  required). Server `recordExternalPo` (`app/finance/po-actions.ts`): a PO `external = 1`, its own number (unique; `fetchPoNumbers` now leaves
  external POs out so the studio's sequence never moves), status sent + accepted *elsewhere* (binds, counts in costs, takes bills and payments,
  closes when paid), terms "As agreed" with no due day of its own, `vendor_token` null (and `fetchPoByToken` refuses an external PO), its file a
  `cost_documents` row with `record_kind = 'po'` (served by `app/finance/doc/[id]/route.ts`, new `po` branch, to whoever sees the project's money),
  `external_ref` · `external_file_id` set. No approval (made already). Rows and the panel read *Recorded — made elsewhere*; the paper is stamped.
  ⋮: Open its file · Mark delivered · Record a bill on it · Pay the vendor · Close it short… · **Remove the record** (nothing paid or billed; Undo —
  `removePo` handles external). Refused with their rule: edit, duplicate, send, cancel, mark accepted. Activity `parity_b_po_recorded` ·
  `parity_b_po_unrecorded`; the PO's History reads them.
- **Files:** `components/finance/external-po-dialog.tsx`, `use-costs.tsx` (`newExternalPo`, the menu, panel facts/amounts/docs), `finance-workspace.tsx`,
  `todo/todo-workspace.tsx`, `cost-tables.tsx` (`poStatusWords`), `po-paper.tsx`, `app/finance/po-actions.ts`, `app/finance/doc/[id]/route.ts`,
  `lib/finance/model.ts` (`EXTERNAL_PO_WORDS`), `lib/finance/queries.ts`, `lib/leads/activity.ts` region P-B.
- **Check:** Company › Finance › Money out › New › Record a PO made elsewhere — record one on Ryan's project; it lists as *Recorded — made
  elsewhere*, has no *Copy the vendor's link*, its ⋮ › Open its file opens the picture; ⋮ › Remove the record → Undo. As Michelle (Ryan's member)
  too. **Not on the project's own Money New ▾ yet — Needs from others 2.**

### MO-058 · Issued by on an expense
- **What changed:** only with 2+ issuing entities, the expense dialog shows **Issued by** (the project's entity to start, the studio's own for the
  overhead; retired only when already named). `ExpenseInput.issuingEntity` → `saveExpense` validates the name against Company › Profile and keeps
  a choice that differs from the project's (null follows it). The panel says *Issued by* with 2+.
- **Files:** `components/finance/expense-dialog.tsx`, `use-costs.tsx`, `app/finance/cost-actions.ts`, `lib/finance/model.ts` (`ExpenseRecord.issuingEntity`),
  `lib/finance/queries.ts`.
- **Check:** with one entity (the demo) nothing shows. Add a second entity on Company › Profile → Money out › New › Expense shows Issued by.

### MO-074 · A vendor's expenses
- **What changed:** the vendor's panel lists **Expenses** naming the vendor (description · its word · day · project · amount) between Bills and Paid.
- **Files:** `components/finance/vendor-panel.tsx` (`data-testid="vendor-panel-expenses"`).
- **Check:** Company › Finance › Vendors › any vendor an expense names (Owner) — the panel's Expenses section.

### MO-079 · FB-105 (lists) · The Issued by scope
- **What changed:** with 2+ entities: the **Issued by: All ▾** pill on Money out (after Status; on a phone beside it) and To do (after the chips;
  on a phone under the rail), `?entity=` in the address, rows filtered by their record's entity, an **Issued by** column (the entity's MetaChip) on
  every Money out and To do table, the PO help line summing the scope. One entity: nothing changes (byte-identical toolbars — the phone's Status
  span is kept as it was).
- **Files:** `lib/finance/entity-scope.ts` (NEW), `lib/finance/costs.ts` (`costEntities`), `lib/finance/queries.ts` (`fetchEntityOptions`,
  `FinanceData.entities`, `ProjectCostsData.entities`), `lib/finance/todo.ts` (`TodoRow.entity`, `TodoInvoice.entity`, `TodoMoney.entity`,
  `TodoInput.projects[].entity`), `lib/finance/todo-server.ts`, `components/finance/finance-workspace.tsx`, `cost-tables.tsx`, `todo/todo-workspace.tsx`.
- **Check:** add a second entity on Company › Profile → Money out shows the pill and the column; pick the new entity → empty lists (nothing is
  issued under it yet); To do shows the pill. Remove it → both gone.

### MO-084 · FB-009 · Recently on To do
- **What changed:** To do ends with **Recently** — the ten newest money records (Owners and Admins: invoices sent, client payments, VOs, credit
  notes from the books To do already loads, + POs, bills, expenses, payments out; a member: their projects' money out), chipped by kind, each
  opening its record (money out's panel in place, money in's project Money with `?from=` To do), five shown + *Show n more*. Hidden while searching
  or narrowed to a group; follows the Issued by scope. The To do ghost draws it.
- **Files:** `lib/finance/todo.ts` (`RecentRow` · `RECENT_KIND` · `recentRows`), `lib/finance/todo-server.ts` (`recentMoneyIn`, `TodoData.recentIn`),
  `components/finance/todo/todo-workspace.tsx` (+ `todo.module.css`), `components/finance/finance-ghost.tsx`.
- **Check:** Company › Finance (lands on To do) as Dane — Recently at the end; Show more; a PO row opens its panel, an invoice row the project's
  Money. As Germaine — her projects' money out only. 1440 / 390.

### MO-087 · FB-031 · Where costs go on the project
- **What changed:** Project › Money › Costs opens with the NEW `WhereCostsGo` card — one stacked bar + legend from `byCategory`; Owners and Admins
  only; nothing with no committed costs. Five named + *Other (n)*; two validated tones alternate (the DS has no categorical palette — **a call for
  Vicky**, see REG-P-B.8); legend + hover + aria-label carry identity.
- **Files:** NEW `components/finance/where-costs-go.tsx` + `.module.css`, `components/finance/project-costs.tsx`.
- **Check:** Ryan D'Souza's Money as Dane (the card) and as Michelle (none). 1440 / 768 / 390 (the legend becomes one column).

### MO-094 · PR-089 · A late delivery
- **What changed:** `deliveryLateDays` (model) → `PoView.deliveryLateDays` (`costsOf`); the status line "Delivery is n days late" (neutral) on Money
  out and the project's Costs; the panel's note; **Mark delivered** in every bound PO's ⋮ and in the panel footer while late (+ *Message {vendor}*
  in its ⋮) — `markPoDelivered` / `undoPoDelivered` (Undo), Activity `parity_b_po_delivered`, the panel's *Delivered* fact. **Needs you**:
  `cost-po-late` in `lib/projects/money-needs.ts` region P-B (for whoever prepares the project's POs; group `late` so it ranks with the work, after
  approvals and the client's money, and rests while on hold; `ref` prefixed `po-late:` so it never dedupes a payment row on the same PO); the
  Money tab draws **Mark delivered** · **Message {vendor}** (WhatsApp opened on the press via `waLink`; *Open* when the vendor has no mobile) in
  `components/projects/money/needs-list.tsx` region P-B; the header's words in `lib/projects/needs-you.ts` region parity-map header words ("Mark
  {PO} delivered"). The bell: `derivedPoLateRows(memberId, role, rules, now)` in `lib/finance/bell.ts` — **wiring is Needs from others 1.**
- **Demo:** PO-2026-003 (Woodcraft, Ryan D'Souza, expected 20 Sep, not delivered) is late out of the box — Ryan's Money and Overview show the row,
  Michelle (its maker and the project's member) hears it on the bell once wired. No repair needed; if Vicky would rather it read delivered, the
  optional repair is below.
- **Check:** Ryan's Money as Dane: Needs you (Show more) › "PO-2026-003 delivery is 20 days late" → Mark delivered → Undo; Message Woodcraft
  opens WhatsApp. The Overview's Needs you lists it after the payment to confirm. As Michelle the same.

### MO-009 · A PO line's milestone
- **What changed:** on a project with milestones each PO line gets a ⋮ (beside its delete) — *Link to a milestone*: No milestone · each milestone
  (radio list, PortalMenu — a sheet on a phone); linked lines say "For {milestone}". `DraftLine.milestoneId` now survives an edit (it was dropped).
  `savePo` already validated `milestoneId`. The milestone panel's costs reading it is a later round's (no new screen, as the brief says).
- **Files:** `components/finance/po-dialog.tsx`, `components/finance/finance.module.css` (`.poLine[data-ms]`, `.lineTools`).

### FB-097 · The purchase order paper
- **What changed:** Settings › Finance › Money out gains NEW `components/finance/po-paper-settings.tsx` — Header note · Terms · *An acceptance block
  for the vendor* · *Your bank details* (both off to start — 1.0 had acceptance on; off keeps every studio's PO as it prints today — **a call for
  Vicky**). Saved with the cost rules (`CostRules.paper`, `parsePoPaper`, `DEFAULT_PO_PAPER` in `lib/finance/rules.ts`; `setCostRules` unchanged).
  `PoDoc.paper` · `PoDoc.bank` (the issuing entity's bank, branch, SWIFT, PayNow while on) → the PO paper prints the header note, the bank block,
  the terms and the acceptance block (Name · Signature · Date; once accepted: "Accepted on its link on {day}"); the vendor's link reads the same
  paper. **Per the coordinator:** the PO paper's head and foot now come through P-D's `PaperHead` / `PaperFoot` / `accentProps`
  (`@/components/projects/money/paper-chrome`), with `PoDoc.studio.extras = extrasIn(letterhead)` — it lights up once `letterheadOf` hands the extras
  (P-A's Needs-from-others 1 in P-D's outcome); until then `extrasIn` is null and the head reads exactly as before.
- **Files:** `components/finance/po-paper-settings.tsx` (NEW), `finance-settings.tsx`, `po-paper.tsx` (+ `po-paper.module.css`), `lib/finance/rules.ts`,
  `lib/finance/queries.ts`.
- **Check:** Settings › Finance (Dane) › The purchase order paper — write a note, switch on the acceptance block, Save; open PO-2026-003's page and
  link. As Germaine the card is read-only.

## Wired for others (the coordinator's asks)
- **P-D:** the PO paper's head and foot through `PaperHead` / `PaperFoot` / `accentProps`, `PoDoc.studio.extras` (above, FB-097).
- **P-A:** `components/finance/finance-ghost.tsx` draws Money in's reveal ghost — `if (tab === 'money-in') return frame(<MoneyInGhostBody kind={moneyInKindOf(params.get('kind'))} />)`
  before the Money out branch (`MoneyInGhostBody` from `./money-in/money-in-ghost`, which imports `FinanceGhost` back — a render-time cycle only).

## Probes
- NEW `design-source/verify/parity-map-build/verify-pm-b.cjs` (args `<scratch.db> [shotDir]`, env `BASE`, sqlite3 `-cmd ".timeout 30000"`,
  refuses `local.db`, puts back cost_rules, brand, PO-2026-003's expected day and every row it wrote; shots at 1440 and 390). It moves PO-2026-003's
  expected day to three days ago for the run so "3 days late" holds on any day. Its bell assertion needs Needs from others 1.
- Existing probes grepped (`verify-pj-gap-f1/f2`, `simplify-projects-finance/verify-ks · verify-r2e · verify-r3`, `ux-build P3`, `verify-pj-gap-b ·
  r5 · r6`): nothing they assert changes — PO tags keep their words, only PO-2026-003's status sub-line now reads "Delivery is n days late"
  (no probe asserts that line), the Money out toolbar and Settings' `cost-settings` count are unchanged with one entity, New ▾ items are matched by
  `^Purchase order` / test ids, the Needs you rows are expanded before reading. No assertion edited.

## Needs from others (exact file, what, why)
1. **`lib/notifications/queries.ts` `derivedDue`** (nobody's) — after the bills' block:
   ```ts
   /* (parity map, MO-094 · PR-089) A PO's delivery late — for whoever made it and the project's members; gone once it is marked delivered. */
   if (rules.channels.po_delivery_late?.in_app) {
     const { derivedPoLateRows } = await import('@/lib/finance/bell')
     out.push(...await derivedPoLateRows(memberId, role, rules, now))
   }
   ```
2. **P-A · `components/projects/money/project-money.tsx`** — the New ▾'s Costs group, after Purchase order / Order from the quote, for `can.po`:
   `<DropdownItem key="external" onSelect={() => { setNewOpen(false); costs.c.newExternalPo() }} help="One raised in your accounting system or on paper — it counts in the costs">Record a PO made elsewhere</DropdownItem>`
   (the dialog is already in `costs.c.dialogs`, project fixed).
3. **`lib/projects/money-visibility.ts` `isMoneyEventKind`** — add `|| kind.startsWith('parity_b_po_')` so the Activity's money filter counts the new
   lines (region P-B already hides them from a viewer refused the money).
4. **P-D · `lib/company/entities.ts`** — `fetchEntityUsage` should also count `purchase_orders.issuing_entity` and `expenses.issuing_entity` (an
   entity a PO or an expense names is retired, not removed), and `reconcileEntities` should carry a rename to those two columns (and P-A's
   `project_invoices.issuing_entity`), so the Issued by scope keeps finding them (an unknown name falls to the studio's own meanwhile).
5. **`app/settings/settings-ghost.tsx`** (nobody's) — Settings › Finance's ghost: one more card under Money out (*The purchase order paper*: title +
   help, two text fields, two switch rows, the two buttons) — REG-708.
6. **P-A · `lib/projects/money-queries.ts` `letterheadOf`** — the extras (P-D's item 1); the PO paper reads them through `extrasIn` already.
7. *(optional)* the project's Money arrival (`project-money.tsx`) could treat `&do=delivered` as "open the PO" — it already does, by its fallback.

## Repair text (optional — only if Vicky wants PO-2026-003 delivered in the base state)
```ts
/* R-PB1 (parity map, MO-094 — optional) Woodcraft's carpentry on PO-2026-003 delivered when it billed (WC-2391): the base state shows no late
   delivery. Idempotent: only while it is not marked delivered. */
await db.run(sql`update purchase_orders set delivered_at = (select issued_on from supplier_bills where reference = 'WC-2391' limit 1),
  delivered_by = created_by where number = 'PO-2026-003' and delivered_at is null`)
```
(Without it the demo shows the feature on Ryan's project, backed by its records: expected 20 Sep, not marked delivered.)

## Stand-ins
- None call a model or a service. *Message {vendor}* only opens WhatsApp with a drafted line (nothing recorded — as 1.0's Follow up).

## Not finished / calls for Vicky
- A categorical chart palette (Where costs go uses two alternating validated tones) — a DS call.
- The acceptance block and the bank start off (1.0: acceptance on) — her call; the PO acceptance words are fixed, while P-D's invoice block makes
  its heading and words editable — aligning them is a small follow-up if she wants one grammar.
- A recorded PO can't be edited (remove and record again) and needs no approval — said in REG-P-B.3.
