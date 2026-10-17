# Package F1 — money out: the costs · outcomes (gaps build, Phase B, 2026-10-07)

Brief: `scratchpad/build2/brief-f1.md` · the read and the calls: `f1-read.md` (F1-Q1…Q16, as recommended on the owner's instruction of 2026-10-07).
Port 3126 · repair R83 · probe `design-source/verify/projects/verify-pj-gap-f1.cjs` · register rows `reg-f1.md` (REG-f1.1…19).

Running file (protocol §5). Status words: **Built (code)** = written, tsc clean · **Verified** = the probe passed on it at 1440 and 390.

Status: **done** — 7 of 7 items Built · Verified, 0 not built, 0 moved. Probe `verify-pj-gap-f1.cjs` **81/81** (1440 + 390 + 320). Regression on fresh copies of the
repaired scratch DB, one build, :3126: r1 83/83 · r2 83/83 · r3 86/86 · r4a 73/73 · r4b 75/75 · r5 90/90 · r6 79/79 · r7 62/62 · r8 65/65 · r9 65/65 ·
fix-B 53/53 · fix-C 49/49 · fix-D 35/35 · fix-E 50/50 · fix-F 44/44 · gap-a 66/66 · gap-b 72/72 · gap-c 96/96 · gap-e 54/54 (with the server's
AUTH_SECRET set, as E ran it). No existing probe needed a change. Shots `design-source/verify/projects/gap-f1/` (12).

| # | Item (brief) | Outcome | What / where |
|---|---|---|---|
| 1 | Vendors (directory, bank / PayNow, merge) | Built · Verified | `vendors` table; `app/finance/vendor-actions.ts` (create — anyone, bank only from Owners/Admins; update · deactivate/reactivate with Undo · previewMerge · mergeVendors · undoMerge — Owners/Admins; a rename follows into the price book and the quotes' Vendor/Sub); `components/finance/vendor-dialog.tsx` · `vendor-field.tsx` (pick or add in place, "Add {name} as a vendor" from a bill) · `vendor-panel.tsx` (panel with POs, bills, payments, balances; the Merge dialog says what moves first); Finance › Vendors. |
| 2 | Purchase orders (lines from the quote, approval, vendor link, advances, payments, closed) | Built · Verified | `purchase_orders` + `purchase_order_lines`; `app/finance/po-actions.ts` (savePo · duplicatePo · removePo/undo · submitPo · withdrawPo · sendBackPo · sendPo — an Owner's send approves · markPoAccepted/undo · cancelPo/undo · closePo/undo · poHistory); `app/po/actions.ts` answerPo (the vendor's link); `components/finance/po-dialog.tsx` (+ Add from the quote) · `po-paper.tsx` · `po-page.tsx` · `vendor-link-page.tsx`; routes `(editor)/projects/[id]/purchase-orders/[poId]`, `/po/[token]`; a PO paid in full closes itself. 1.0's inline type-ahead from the quote not built — Add from the quote covers it (REG-f1.8). |
| 3 | Supplier bills (against a PO or the project, read the PDF, due, paid) | Built · Verified | `supplier_bills` + `cost_documents`; `app/finance/cost-actions.ts` recordBill (duplicate check → `{ duplicate }` → Record anyway) · updateBill · removeBill/undo; `lib/finance/bill-reader.ts` (the curated reader over pdf.js's text) + `components/finance/pick-doc.ts` + `bill-dialog.tsx`; `/finance/doc/[id]`; sample bills `scripts/finance-sample-bills.py` → `public/uat-files/*-bill-*.pdf`, read by `scripts/finance-read-test.mts` (every field). |
| 4 | Expenses (project / overhead, receipts, category, claims, approval) | Built · Verified | `expenses`; cost-actions saveExpense · answerExpense/undo · removeExpense/undo; `expense-dialog.tsx` (up to five receipts, Take a photo on a phone, a claim for a member by an Owner/Admin). No partial approval, verification track or recurring (F1-Q11). |
| 5 | Payments out (bills, POs, claims) | Built · Verified | `payments_out`; cost-actions recordPayout (never more than owed; a bill on a PO pays the PO; auto-close) · undoPayout · reversePayout/undo; `payout-dialog.tsx`; Finance › Payments out (Owners/Admins). |
| 6 | The Costs half on Money (committed · paid · you owe; F-17 / Q-20) | Built · Verified | `lib/finance/costs.ts` costsOf (one set of numbers; byCategory · byVendor · pipeline for F2); `lib/finance/queries.ts` fetchProjectCosts (figures masked for non-runners); `components/finance/project-costs.tsx` + `use-costs.tsx` + `cost-tables.tsx` + `cost-panel.tsx`; `ProjectMoney costs` slot; the Money ghost draws the half. |
| 7 | Finance rail item + studio-wide lists (F-01) | Built · Verified | rail + phone More sheet item, G F; `/finance/[tab]` (Purchase orders · Bills · Expenses · Payments out · Vendors — `lib/finance/sections.ts`, F2 appends) on CompanyShell, `finance-workspace.tsx`, `finance-ghost.tsx`; Settings › Finance made live with the Costs card (`finance-settings.tsx`, `cost-settings.tsx`). |

Also built around them: Activity branch (`lib/leads/activity.ts`), `isMoneyEventKind` (money lines), Needs attention `vendor_answer` (`lib/finance/attention.ts`,
routed to its PO on the Overview), the bell (7 stored events + derived `bill_due`, `lib/finance/bell.ts`; Settings › Notifications rows and messages),
the studio search (a Finance scope, pages, three typed-only Create rows — `lib/finance/search.ts`), *Who may do what* (11 rows), R83 demo data.

## For the merge and the other packages
- **F2 (the books)** builds on: `costsOf` (`lib/finance/costs.ts` — committed · paid · owed · overdue · pipeline · claimsOwed, `byCategory`,
  `byVendor`, every PO / bill / expense view), `loadCostRecords({ projectIds, overhead })` and `fetchFinance()` (`lib/finance/queries.ts`; figures
  masked for non-runners by `maskFigures`), `FINANCE_TABS` (`lib/finance/sections.ts` — push a tab; `/finance` lands on the first), Settings ›
  Finance (`components/finance/finance-settings.tsx` — add cards beside Costs), the rules (`lib/finance/rules.ts`: `seesCostFigures`,
  `paysOut`…). Profit = contract (`moneyOf`) − committed. Records: `vendors`, `purchase_orders` (+ `purchase_order_lines` with `category` and
  `quote_item_id`), `supplier_bills`, `expenses`, `payments_out`, `cost_documents`; event kinds `project_po_*` · `project_bill_*` ·
  `project_expense_*` · `project_payout_*`.
- **Shared files touched** (appended unless said): `lib/db/schema.ts` (7 tables at the end), `lib/db/baseline.ts` + `scripts/snapshot-baseline.ts`
  (7 tables at the end), `lib/notifications/model.ts` (8 events, rules, messages, 3 fields), `lib/notifications/queries.ts` (one derived block),
  `lib/leads/events.ts` + `lib/projects/events.ts` (20 kinds, detail fields), `lib/leads/activity.ts` (one branch before round 6's),
  `lib/projects/money-visibility.ts` (`isMoneyEventKind` one clause), `lib/projects/attention.ts` (one field, one reason), `lib/projects/queries.ts`
  (the fact at both call sites, the reason's link, one import), `scripts/repair-demo-data.ts` (R83 before the checks, 23 checks, the money-out kinds
  appended to REG-613's kind list — the same line package C appended to), `lib/global-search/model.ts` (a kind, a scope, five pages, three
  Create rows + `onlyTyped` in `createHits`), `lib/global-search/queries.ts` (one job), `lib/keys/registry.ts` (G F), `components/shell/app-rail.tsx`
  (one item, G F), `components/shell/mobile-nav.tsx` (one More row), `lib/settings/modules.ts` (Finance live, the type), `app/settings/page.tsx` ·
  `settings-view.tsx` · `settings-ghost.tsx` (the Finance module), `lib/settings/permissions.ts` (11 rows, two links, two optional rules),
  `components/projects/money/project-money.tsx` (a `costs` slot), `components/projects/money/money-ghost.tsx` (the Costs half),
  `components/projects/money/money-hidden-page.tsx` (`kind: 'po'`), `app/projects/[id]/[tab]/page.tsx` (loads the costs).

## Progress log
- Sync done; base tree `pkg-f1/base-tree.txt` = ba006d2e0a813421e89c56a4006150c61e5daf29. node_modules cloned; scratch DB `pkg-f1/test.db` from base.db.
- Step 1 read written (`f1-read.md`).
- Data layer: schema (7 tables), migration generated locally as `drizzle/0075_ordinary_kate_bishop.sql` (renumbered at the merge), both baseline lists.
- UI, routes, settings, search, bell, attention, Activity written; tsc clean, eslint 0 errors (9 warnings, none new), design:lint nothing new.
- R83 passes twice on a fresh base.db copy (39 rows, then 0); all checks pass (23 new). `reg-f1.md` written (19 rows).
- Probe run 3 on build 1: 69/71 — the vendor link's title row pushed a 390 phone sideways (now wraps); the listing shows only the worst reason (the
  probe reads the Overview's Status card, where the reason links to its PO). Polish from the shots: the panel's totals right-aligned, the vendor's
  mobile grouped, the PO dialog's margin band spaced, a PO's overdue in its Paid column. Settings › Finance (an inert tab until money out) made
  live with the Costs card instead of Settings › Projects. Build 2 compiled; next: probe again, the Projects regression probes.
- Build 3 (the bill from its PO starts with the PO and its vendor; Settings › Finance's links say "Kept in Finance"): probe **81/81** (it gained the
  other steps — mark accepted, cancel, remove a Draft, reverse a payment, each with Undo — and the 320 checks). The 19 Projects probes all pass
  (gap-e's signed /f link needs AUTH_SECRET on the server, as E's serve set it). :3126 stopped.
- base.db was refreshed at 22:38 with package D merged: D's migration is newer than my 0075, so drizzle skips mine there (E's note). With 0075 applied
  by hand (`pkg-f1/repair-d-base.sh`), R83 writes 39 rows then 0 and its 23 checks pass; the only two failures are D's own records my tree's checks
  don't know yet (a choice `declined`; events `project_vo_declined` · `project_choice_declined`) — the merge brings D's check lists together with mine.
- Not run: `npm run design:anatomy` (the full-site sweep — left for the merge's one build). Final tree `pkg-f1/final-tree.txt`.
