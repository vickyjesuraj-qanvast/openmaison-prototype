# Package K-M — Money on a project: outcome (2026-10-09)

Built: **S-07 · S-08 · S-09 (the rule + the Money tile) · Q-05 · Q-06 · Q-08 · Q-10**, the money rows every other surface shows (contract B),
contract C's Money deep links, contract E. No rule changed: `moneyOf` / `costsOf` / `profitOf` and every action are as they were; this is
presentation, the readiness threshold (day one), the profit grade, Order from the quote and the `do=` landings. No schema change, no write to
local.db. `npx tsc` and `npx eslint` clean on every file below; `npm run design:lint` — nothing new. Register rows: `reg-K-M.md` (REG-K-M.1…14).

## Per item — what changed

### Contract B — `lib/projects/money-needs.ts` (new)
`fetchMoneyNeeds(projectId, viewer, now): Promise<NeedRow[]>` — every money row of P3 §6.2 Region 2, `tab: 'money'`, each with `ref` (the
record's id), `kind` (`MONEY_NEED_KINDS`), `group` (`ok` for approvals; everything else `money`, so a hold or a completed project keeps them —
`holdSplit` / `needsOf` keep `ok` + `money`), `tone` (S-05: `late` only for a vendor's bill / PO past its day; approvals `approve`; the client's
lateness `neutral`), `amountMinor`, and `action` / `secondary` with contract C hrefs (`moneyHref`). Scoped by what the server hands the viewer:
`fetchProjectMoney` (viewer.prepares · sendsAtOnce · approves · locked; payments.viewer.confirms · records), `fetchProjectCosts` (CostViewer
approvesPo · approvesExpense · pays · prepares), `fetchProjectBooks` (issues; insights for Owners/Admins). De-duplicated by record, worst first.
- One readiness rule (P3 §6.8): a ready stage invoice is a row from its first day ("ready today" / "ready n days").
- Collection trailing rides on the first ready invoice's row; with nothing ready it is its own row (Remind on the oldest unpaid), else no row.
- *Send VO-n* (S-21) reads K-C's `fetchPickVariations([projectId])` — Drafts picked by the client: "{person} chose {option}", action opens the
  VO in the quote editor (where Send ▾ › Send for confirmation is).
- The Owners' insights kept as rows: loss · at_risk · tight · funded · vos · po-over-* (overdue / bills-overdue / ready-* / no-costs are told
  elsewhere). A PO over the quote that is also waiting for approval is one row (its approval row says what it leaves).
- `fetchProjectMoney` is now React `cache`d (`lib/projects/money-queries.ts`), so the frame's Needs you and the tab's body read it once.

### S-07 — the Money tab (four regions)
- `components/projects/money/project-money.tsx` — rewritten as the orchestrator: lock state (unchanged); `WithCosts` (the Costs orchestrator
  above the tab so New ▾ / Needs you / `do=` reach the same steps); head + ONE New ▾ (two groups, `DropdownLabel` / `DropdownDivider`,
  `MENU_WIDTH.detail`, `data-kb="create"` unless the empty Billing's first button answers C; "+" on a phone); Needs you; the tiles; the phone
  switch; Billing; Costs; the panel; Order from the quote. `?open` / `do` / `send` read on arrival and whenever the address names a record.
- `components/projects/money/use-invoices.tsx` (new) — every money-in step ported unchanged from the old tab (send · submit · approve · send back
  · amount + rebalance · void · one-off · details · recorded · split · VO bill / mark approved / deleted VOs · remind approvers), menus as
  `RowAction[]` so the row ⋮ and the panel ⋮ are one list.
- `components/projects/money/needs-list.tsx` (new) — Needs you on the tab: `useProjectNeeds().filter(r => r.tab === 'money')`, the house banner
  rows, real controls by `kind`/`ref`, 3 shown (2 on a phone) + "Show n more" (the AI brief's toggle, composed). Each row keeps the old band's
  test id (`invoice-overdue` · `payment-to-confirm` · `invoice-approval-bar` · `invoice-sent-back` · `money-ready-days` · `money-unbilled-vo` ·
  `money-out-of-step` · `money-to-credit` · `money-to-refund` · `money-collection-trailing` · `costs-answered` · `costs-po-awaiting` ·
  `costs-expense-awaiting` · `costs-bill-overdue`) and its buttons' (`banner-record` · `invoice-remind` · `payment-confirm` ·
  `payment-not-received` · `payment-proof-link` · `banner-approve` · `banner-bill-vo` · `money-rebalance` · `money-issue-credit` ·
  `costs-approve-po`); new: `money-needs`, `money-needs-more`, `money-record-refund`, `money-send-vo`, `costs-approve-expense`, `costs-pay-bill`.
- `components/projects/money/billing-section.tsx` (new) — Billing (`money-stages`), Q-05 views, Changes to the contract (`money-variations`).
- `components/finance/project-costs.tsx` — `useProjectCosts` + `CostsSection` (one list `costs-list`, Kind column + chips `costs-kind`, a bill on a
  PO as its PO's sub-line opening the bill's panel, empty line with three ways in); section keeps `id="costs"` + `data-testid="project-costs"`.
- `components/projects/money/payments-section.tsx` — banners removed (now Needs you); exposes `confirm` · `openRefuse` · `menuItems` · `statusLine`
  · `list`; the Payments table is `table(actions)` (the admin's view). `components/finance/books/credit-notes.tsx` — `menuItems` · `openRefund` ·
  `openOffer` · `refundDueOf` · `pageHref` (Back returns to the panel); `table(actions)` always (empty line), the admin's view.
- `components/projects/money/money.module.css` — the regions' classes (composed: ai-brief's toggle, the portal's Paid so far bar); the story / four
  tiles classes removed.
- `app/projects/[id]/[tab]/page.tsx` — the money body expression only (`<ProjectMoney data books costs />`) and the two imports it used.
- `app/projects/money-actions.ts` — billVariation's sentence names "Billing, under Outside the stages"; the fee-first refusal names Settings ›
  Finance › Invoices (the orchestrator's note); + `invoiceHistory(invoiceId)` (read-only).

### S-08 — one record panel
- `components/finance/cost-panel.tsx` — + `amounts` · `links` · `lists` (rows with status, `lit`, their own ⋮, `attrs`) and `menuLabel`; Finance
  passes none (unchanged for POs / bills / expenses). + `components/finance/cost-panel.module.css` (new, tokens only).
- `components/projects/money/invoice-panel.tsx` (new) — the invoice's panel (`data-testid="invoice-panel"`; lists `invoice-panel-payments` /
  `invoice-panel-credits`, lines `invoice-panel-payment` (with `data-payment` + `data-status`) / `invoice-panel-credit` (`data-credit`); links
  `invoice-panel-preview` · `-download` · `-link`; actions `panel-invoice-send|submit|approve|record`, `panel-invoice-remind`,
  `panel-invoice-credit`, `panel-payment-confirm`, `panel-payment-not-received`); history from `invoiceHistory` (Activity's own lines whose link
  lands on the invoice, its payments or its credit notes).
- Rows: the stage name (`invoice-row-open`) and a press anywhere on the row open it; a sent / paid / void invoice's *Open* step opens the panel
  (testid `invoice-open` kept). The ⋮'s *Open the invoice* / *Preview the invoice* still goes to the printable page.
- `components/projects/money/invoice-page.tsx` — Back to Money → `?open=<invoice>`; a sent invoice with something owed gains **Record a payment**
  (`invoice-page-record`). `payments-receipt-page.tsx` — Back → `?open=<payment>`.

### S-09 · Q-08 — profit (contract E)
`lib/finance/profit.ts` — `profitGrade(p)` → `'none' | 'early' | 'graded'`, `profitShown(p)` → `{ value ('--' until graded), word, tone, grade,
graded }`, `PROFIT_NO_COSTS` · `PROFIT_EARLY`; `profitHelp`'s early line says the figure waits. `components/finance/books/project-profit.tsx` —
`ProfitTile` (the old `ProjectProfit` with its three tiles and *What the numbers say* is gone; nothing else imported it).

### Q-05 · Q-06
Billing's head chips All · Invoices · Payments · Credit notes for Owners/Admins (`money-billing-view`; the views keep `money-invoices`,
`money-payments`, `money-credits`). Phone: `money-list-switch` (≤767 only, `om.money.costs`); `?open=` of a record brings its list forward.

### Q-10 — Order from the quote
`app/finance/order-from-quote-actions.ts` (new): `orderFromQuoteLines(projectId)`, `orderFromQuote(projectId, { orders })` (one `savePo` per vendor,
all or nothing), `undoOrderFromQuote({ poIds })` (`removePo` + drops the made / removed Activity lines). `po-actions.ts` untouched.
`components/projects/money/order-from-quote-dialog.tsx` (new; testids `order-from-quote`, `order-group`, `order-line`, `order-make`).

### The ghost
`components/projects/money/money-ghost.tsx` — redrawn for the four regions; same `MoneyGhost({ band })` signature and shape key `lead.{id}.money`
(now: "the tab opens with Needs you rows").

### Settings › Finance words (the orchestrator's note)
Grepped every K-M file for "Settings › Projects" / `section=projects` naming a money rule: the only visible one was money-actions' fee-first refusal
(now "Settings › Finance › Invoices"); the Payments table's old "(Settings › Projects)" help went with its rewrite. The rest are code comments
(two updated; the others are history notes).

## What to check in the browser (1440 / 768 / 390)
- **Benjamin P-2026-002 as Dane** (`/projects/<ben>/money`): Needs you — PO-2026-008 to Stone & Tile (Approve and send · Send back), Germaine's
  S$38.50 claim (Approve · Send back), AquaFlow's bill AF-7781 S$1,400 (red, Pay), INV-2026-006 · Mid-Project 7 days overdue (neutral, Remind ·
  Record a payment), S$1,090 to refund on CN-2026-002 (Record the refund) — 3 shown + Show 2 more. Tiles: To collect S$20,784.94 red with the bar
  and "Next: Completion …", To pay, Profit "--" with *Early estimate*. Billing: 4 stage rows (+ VO sub-list hidden if none); INV-2026-004's Paid
  cell "RCT-… · S$1,090.00 credited". Costs: the PO / bill / expense rows, Kind chips. Press a row → the invoice panel (payments with ⋮, credit
  notes with ⋮, history). New ▾: two groups.
- **Ryan P-2026-001 as Dane**: the payment to confirm row (Confirm · Not received · See the bank's confirmation), the Billing views, the
  *Outside the stages* group (XR-1042 Recorded), the VO sub-list (VO-1, VO-2 declined).
- **Marcus P-2026-004** (setting up): New ▾, Order from the quote (Floor Xpert's one line until the optional repair below), the Deposit ready row
  from day one; empty Costs line with its buttons.
- **Shalini (completed)**: no Bill group in New ▾, rows' refusals said in the ⋮.
- **As Germaine / Michelle (Designers, View as)**: no To pay / Profit tiles (To collect + Contract value), no Billing view chips, rows only for what
  waits on them, the panel's Reverse disabled with its reason.
- Deep links: `/projects/<ben>/money?open=<INV-2026-006 id>&do=record` (Record a payment opens), `&do=remind` (panel, Remind first),
  `?open=<a to_confirm payment>&do=confirm`, `?open=<PO-2026-008>&do=approve`, `?open=<AF-7781 bill>&do=pay`, `#costs`; the header's filled
  button pressed while on Money.
- 768: Billing's Next step inside the width (tracks min 170+124+190+124+160); 390: Needs you 2 + more, tiles 2 + 1, the switch, cards.
- The invoice page of a sent, owed invoice: Record a payment; Back to Money opens its panel.

## Probe assertions changed (each marked `(simplify S-xx, a deliberate change of this rule)`)
- `verify-pj-r5.cjs` — tile-contract / money-story → To collect's line + hover; the submitter has no Needs you row; void through the stage row's ⋮;
  `allNeeds` before `banner-approve` / `money-rebalance`.
- `verify-pj-r6.cjs` — tiles → `money-collected` / `tile-collect`; the overdue row's words; Payments through the Billing view chip; a Designer's
  payment ⋮ in the invoice panel; phone cards = Billing rows; `allNeeds` helpers.
- `verify-pj-gap-b.cjs` — Other invoices → Billing's `[data-kind="extra"]` rows + `money-extras` group label; age line inside the stage row;
  story → the rows' words; readiness from day one; trailing on the Needs you list; Remind the approvers from the row's ⋮.
- `verify-pj-gap-f1.cjs` — `costs-list` rows, `tile-pay`, `money-new` for costs, the phone's Costs chip.
- `verify-pj-gap-f2.cjs` — Profit "--" + Early estimate, no insights block, the refund row's button, Credit notes view, a Designer's credit notes
  in the invoice panel.
- `verify-pj-fix-D.cjs` — the Invoices view chip; three tiles on a phone (2 + 1).
- `verify-pj-r7.cjs` — completed: New ▾ may carry the Costs group, never the Bill group.
- `verify-pj-gap-d.cjs` — no story sentence.
Not run (per the brief). `design-source/verify/projects/consistency/walk.cjs` presses `record-payment`, which no longer existed before this round.

## Needs from others
1. **K-N** — `lib/projects/attention.ts` still raises "invoice ready" after `READY_GRACE_DAYS` (3) for the listing's Needs attention; with the one
   readiness rule they may want day one there too (their surface). The Overview's Money card's Profit row should print `profitShown(p).value` /
   `.word` (contract E). `fetchMoneyNeeds` runs `fetchProjectCosts` + `fetchProjectBooks` on every project tab load (via `fetchProjectDetail`) —
   fine on SQLite; if it shows, compute it only for the Overview and Money.
2. **K-R** — Reports' figures read `profitGrade` / `profitShown` (contract E). `insightsOf` keeps its 7-day *ready* insight for Reports' full list
   and Finance's *Stuck* keeps `READY_LONG_DAYS` — their call whether "stuck" stays a week.
3. **K-C** — the sturdier *system path* for a client's pick: not done. A server action can't safely take a "system" flag (any client can call it),
   so it needs a non-action drafting function (`createVariationOrder`'s insert moved to a server-only lib taking an explicit actor, e.g. the
   project's first team member) that `app/portal/choices-actions.ts` (K-C's) calls instead. Small, but it crosses two packages' files — a follow-up.
4. **Quote editor (Vicky's call, no package)** — a deep link that opens the VO's *Send for confirmation* at once (e.g. `/quotes/<id>?send=confirm`)
   so *Send VO-n* is one press shorter; today it opens the VO in the editor, Send ▾ one press away.
5. **Orchestrator — optional demo repair** so Order from the quote has vendors to group (today only one line per signed quote names a vendor):
   ```sql
   -- (simplify Q-10) the signed quotes' lines name who does them, by their trade — only where no vendor is set (idempotent)
   update quote_items set vendor = (select v.name from vendors v where v.trade = quote_items.category and v.merged_into is null and v.is_active = 1 order by v.name limit 1)
    where kind = 'item' and (vendor is null or vendor = '')
      and quote_id in (select quote_id from projects where quote_id is not null and deleted_at is null)
      and exists (select 1 from vendors v where v.trade = quote_items.category and v.merged_into is null and v.is_active = 1);
   ```
   (then `npm run db:baseline`). Without it the dialog lists Floor Xpert's line and "18 lines name nobody".

## Not finished / left as is
- "Pressing a tile scrolls to its list" (P3 §6.2) — not built (a StatTile isn't a control; it would need a house change).
- The invoice page's ghost draws its third button for Drafts only; a sent, owed invoice now shows Record a payment there — a small loader/reveal
  difference until `GhostShape` carries two flags.
- `moneyStory` (lib/projects/money.ts) stays exported, now unused.
- The "drop a bill's PDF anywhere on Money" and "planned margin" options of P3 §6.8 were not in this round.
