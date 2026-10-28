# Outcome — P-A · Money in (2026-10-10)

Built every item of P-A's section of the brief, inside P-A's files, plus P-D's four wirings into P-A's files (their *Needs from others* 1–4).
`npx tsc --noEmit -p .` — nothing in P-A's files (the errors left are other packages' work in progress: planner, portal messages, chat inbox).
`npx eslint` on every file touched — clean. `npm run design:lint` — nothing of P-A's (the reds left are `components/projects/threads/thread.module.css`
and `components/finance/where-costs-go.module.css`, P-G's and P-B's). No server, no build, no browser, `local.db` untouched (the scratch `src.db` read only).
Register rows: `reg-P-A.md` (REG-P-A.1…8). Probe: `design-source/verify/parity-map-build/verify-pm-a.cjs` (written, not run).

## MI-104 — an approved variation order can't be deleted
- `app/leads/quotes-actions.ts` `deleteQuotes` — a `kind = 'variation'` whose status the client approved (Confirmed / Signed, `isApprovedVariation`) is
  kept and the answer carries the rule: `{ deleted, refused, error: 'An approved variation order stays on the contract — revise it to change it' }`
  (the shape every caller already reads, the rule added — a VO alone answers `{ deleted: 0, refused: 1, error }`). A deleted VO's project Money path is
  revalidated. Drafts, one waiting for approval, one with the client and a declined one still delete.
- `lib/projects/money.ts` — `VO_DELETE_RULE`, `variationDeleteBlock(status)`; `MoneyVariation.createdBy · issuingEntity` (filled by `variationRecord` in
  `lib/projects/money-queries.ts`).
- `components/projects/money/use-invoices.tsx` `voMenu` — **Delete VO-n** on every VO row's ⋮: an approved one rests with the rule as its row's help;
  otherwise Owners, Admins and its maker (`canDeleteQuote`); the press deletes softly → "VO-n deleted — it's under Deleted variation orders" + Undo
  (`restoreQuotes`, refreshed).
- Check: Ryan D'Souza (P-2026-001) › Money as Dane — VO-1 (approved) ⋮ › *Delete VO-1* rests with the rule; VO-2 (with the client) deletes, Undo
  brings it back, *Deleted variation orders* lists it meanwhile. As Michelle (VO-2's maker) the same; as Germaine (not on the team) Money is hidden.
- The quote editor's kebab: **Needs from others 1** (not P-A's file).

## MI-021 — a fixed fee first on a quote's Payment Schedule
- `lib/quotes/payments.ts` — `PaymentRow.fixedMinor`; `isFixedRow` · `fixedFeeOf`; `paymentAmounts` (the fee bills its amount, the shares split what
  it leaves, the last absorbing the rounding) · `sumPct` (a fee is not a share) · `scheduleBalance` (a fee above the total is over); `asFixedFirst`
  (the first row's amount now becomes its fee, the other shares rescaled to 100% of what it leaves) · `asSharesFirst` (back: its share of the total,
  the others rescaled to the rest); `splitWord` prints "S$3,000/…"; `presetOf` is Custom with a fee; `toRows` carries the fee (Undo); the rules'
  words `FEE_FIRST_RULE · FEE_FIRST_ONLY · FEE_FIRST_ALONE · FEE_FIRST_STAYS`.
- `app/quotes/payments-actions.ts` — `readPaymentFeeFirst()` (Settings › Finance › Invoices › *May open with a fixed fee*); `PaymentInput.fixedMinor`;
  `replaceQuotePayments` and `updateQuotePayment` check the fee (first row only, never the only row, the studio's rule unless the row keeps the fee it
  has) and answer `{ error }`; `reorderQuotePayments` refuses moving the fee off the top. Return types gained `| { error }` (the one caller,
  payments-section.tsx, reads it).
- `components/quotes/editor/payments/payments-section.tsx` (+ css) — the first row's name carries the house **Chips % · S$** (only while the rule is on,
  or the row is a fee); S$ / % rewrite the schedule through `replace` with one sentence + Undo; the fee's share cell reads *Fixed fee*
  (`payment-fixed-fee`), its Amount cell edits the fee; another row's typed amount is a share of what the fee leaves; a drag that moves the fee is put
  back with the rule; *Save this split as a template* rests while it has a fee.
- `lib/projects/money-queries.ts` `baseOf` — a quote's first row's `fixed_minor` becomes `MoneyStage.fixedMinor`, so the stage Drafts
  (`draftInvoicesFor`), the allocation, *out of step* and the papers ("Deposit — a fixed fee") read it — one set of numbers.
- `components/projects/money/invoice-settings.tsx` — the switch's group is "Payment schedules and splits" and its line says it reaches a quote's
  Payment Schedule too.
- Check: Settings › Finance › Invoices — switch *May open with a fixed fee* on (Dane); open a Draft quote (OM-10001 · Olivia Martinez) › Payment
  Schedule: the first payment shows **% · S$**; S$ → "Deposit is a fixed fee of S$x — the other payments share what it leaves", Undo; type a new fee in
  its Amount; drag it down (put back, said). Switch the rule off → no switch on a %-first quote. 1440 and 768 (the name wraps the chips under it), 390
  (the row card).
- The quote's **print** shows the fee's amount right already (`paymentAmounts`), but its share as "0%" until **Needs from others 4**.

## MI-031 — lines on a stage invoice
- `components/projects/money/invoice-dialogs.tsx` — the one-off's line grid is now one piece, `LinesGrid` (Description · Qty · Unit price · Amount ·
  remove; **Enter in the last price adds a row** and puts the caret in it — the one-off gets it too), used by the one-off and by
  `InvoiceDetailsDialog`'s new **Itemise this invoice** (house Switch sm; a stage's dialog is 800 wide). It starts as one line "{stage} (n%)" for the
  whole (1.0's start), priced before GST; "S$x left to itemise" / "S$x more than the invoice" / "The lines add up to the invoice"; Save waits for it
  (`itemise-error`); turning it off clears the lines.
- `lib/projects/invoices-kinds.ts` — `itemiseGap` · `itemiseWords` · `itemiseBlock` (the target is the amount before GST, the paper's line).
- `app/projects/money-actions.ts` — `setInvoiceDetails(…, { lines })` (a stage's Draft only; `cleanLines`, `linesProblem`, must add up; `what` says
  "lines"); `sendInvoice` refuses an itemised stage whose lines no longer add up ("Its lines leave S$x to itemise, so change them first").
- `components/projects/money/use-invoices.tsx` — the same check before WhatsApp opens; a ready Draft whose lines no longer add up offers **Change the
  lines** as its next step; `billing-section.tsx` — the stage's sub-line "· n lines", the Invoice cell's "S$x left to itemise" (`invoice-itemise-gap`).
- `components/projects/money/invoice-paper.tsx` — **region P-A**: an itemised stage prints its line (words, description, basis, *Original →
  adjusted*) with no amount, then its lines (`invoice-line` + `data-stage-line`). The panel already lists lines (`i.lines`).
- Check: Benjamin Han (P-2026-002) › Money › Completion ⋮ › *Description, note and due day* › Itemise; split it into two lines; Save; *Preview the
  invoice*. Then *Change the amount* on it → the row says what is left to itemise and offers *Change the lines*.

## MI-035 — fill a one-off from a PDF
- `components/projects/money/invoice-dialogs.tsx` `OneOffDialog` — **Fill from a PDF** (the house text link) beside "Lines — priced before GST"; a
  PDF's text is read in the browser (`pdfLines`, lazy) by the bill dialog's reader (`readBill` from `lib/finance/bill-reader.ts` — lines, due day)
  and `noteFromText` (new in `lib/projects/invoices-kinds.ts`: "Notes:" / "Remarks:" / "Comments:" / "Message:" and the lines under it); the lines,
  the due day (only a day not already past) and the note are filled; the bill dialog's read band (`fin.readBand`, composed) says what was filled; the
  due day and the note say "Read from the file — check it" until changed, a line edit drops the lines' mark. A picture or a scan: "This file has no
  text to read — type the lines in".
- **Stand-in**: a rule, not a model — 1.0 read the file with AI; no credits charged.
- Check: Aisha Rahman (P-2026-003) › Money › New ▾ › One-off invoice › *Fill from a PDF* with `public/uat-files/printhub-bill-PH-2210.pdf` (2 lines,
  due 17 Oct) and `public/uat-files/fluted-panel.jpg` (no text). 390: the link wraps under the label.

## MI-068 — after the third reminder
- `lib/projects/money-needs.ts` **region P-A** — an overdue invoice reminded `CALL_AFTER_REMINDERS` (3) times or more takes the overdue row's key,
  kind and record (so it stands in for it, each fact once): "8 days overdue · due 2 Oct · reminded 3× · last 10 Oct — call Benjamin on +65 9773 1968",
  primary *Record a payment*, secondary **Call Benjamin** (`tel:+65…`; without a number, Remind as before).
- `components/projects/money/needs-list.tsx` — Money's overdue row draws a `tel:` secondary as **Call {client}** (`invoice-call`, `data-call` on the
  row): a touch device dials (`location.assign`), a desk copies the number and says so. Remind on WhatsApp stays in the invoice's ⋮ and panel.
- `app/projects/payment-actions.ts` `remindInvoice` — at the third reminder of an invoice past its due day, Owners and Admins hear
  `invoice_reminded`, once per invoice (never the one who pressed); `payments-section.tsx` — the third's snackbar: "Third reminder drafted on WhatsApp
  for Benjamin — next, a call; Owners and Admins are told". No ticket (2.0's tickets are the client's).
- `lib/projects/invoices-kinds.ts` — `CALL_AFTER_REMINDERS`, `telHref`.
- Check: as Germaine, Benjamin › Money — INV-2026-006 (reminded 2×) › Remind on WhatsApp → the row now offers Call Benjamin; Dane's and Hui Min's bell
  "INV-2026-006 is still unpaid after three reminders". The Overview's Needs you row reads the same words; its Call button needs **Needs from others 2**.

## UC-098 — an invoice sent: the studio hears
- `app/projects/money-actions.ts` `sendInvoice` — after `tellInvoiceSent`, `notify('invoice_sent', studioRunnerIds(), …)` ("Germaine sent INV-2026-010
  to Marcus Teo", "{stage} · S$x — {project}, due {day}", fields `{invoice}`); `notify` leaves the sender out. Every send path calls `sendInvoice`
  (Money, the invoice page, Approve and send, the Start sheet, the Mark done sheet, the handover dialog).
- The Start sheet's Undo (`revertInvoice`) takes back `invoice_review` / `invoice_approved` but not this one yet — **Needs from others 3**.

## FB-013 · FB-016 · FB-012 — Company › Finance › Money in
- `lib/finance/sections.ts` — the **Money in** tab after To do (`/company/finance/money-in`; everyone, members scoped); `MoneyInKind` ·
  `MONEY_IN_KINDS` · `isMoneyInKind` · `moneyInKindOf` · `moneyInHref`.
- NEW `lib/finance/money-in.ts` (server) — `fetchMoneyIn()`: the projects the viewer sees (Who sees leads) and whose money they see (`seesMoney`:
  the team, their Manager, Owners, Admins), each read through `moneyInputOf` → `moneyOf` (nothing added up twice) + `paymentViewsOf` + credit notes;
  rows for invoices (every sent / void one, and Drafts ready · waiting for approval · sent back — a stage's plain Draft is left out, said in the
  help), payments, variation orders, credit notes, each with its entity; `entities` = P-B's `entityOptions` (empty with one entity).
- NEW `components/finance/money-in/money-in-workspace.tsx` — on `FinanceFrame`: search · the kind Chips (`?kind=`) · the Status `ScopePill`
  (+ `PortalMenu`, only the statuses present, with counts) · *Issued by* `ScopePill` only with 2+ entities (`?entity=`; an *Issued by* chip column
  then) · Export (`ExportDialog` all / shown → `buildTable`); each kind's table on `CreditsTable` (the listing's model, Column settings); a row's name
  and *Open* open its project's Money `?open=<id>&from=<this list>`; a payment's *View receipt* opens the receipt page with `?from=`. Phone: Money
  out's phone toolbar (search + Export icon, the kinds' rail, the pills). NEW `money-in-model.ts` (statuses, search words, the export sheet).
- NEW `components/finance/money-in/money-in-ghost.tsx` — `MoneyInGhostBody` · `MoneyInGhost` · `MoneyInLoading`; `app/company/finance/[tab]/loading.tsx`
  renders `MoneyInLoading` (Money in's ghost on its address, `FinanceGhost` everywhere else). `app/company/finance/[tab]/page.tsx` — the Money in branch.
- The page's own reveal (FinanceFrame's skeleton) draws Money out's shape until **Needs from others 5**.
- Check: Company › Finance as Dane — the strip To do · Money in · Money out · Vendors · Commission · Xero; Invoices (INV-2026-006 Overdue on P-2026-002;
  the Status pill's rows), Payments (View receipt → Back to Payments), Variation orders, Credit notes; Open → the project's Money lit on the record,
  Back to Money in; Export. As Germaine — only Benjamin's and Marcus's; as Hui Min — everything. With a second entity (Company › Profile) the
  *Issued by* pill and the chip column appear. 1440 · 768 · 390 (no sideways scroll; the kinds' rail scrolls).

## P-D's Needs from others 1–4 (wired here)
1. `lib/projects/money-queries.ts` `letterheadOf` — returns `PaperLetterhead` with `extras: paperExtrasOf(entity, studio, list[0], brand.kit.colors.accent)`;
   `InvoiceDocData.letterhead` is `PaperLetterhead`.
2. `methods` (`fetchLiveMethodValues`) on `fetchInvoiceDoc` (money-queries), `paperBase` / `fetchPortalInvoice` (payments-portal.ts) and
   `fetchPublicInvoice` (payments-public.ts); `invoice-page.tsx` hands `methods` to `InvoicePaper` and to its Record a payment.
3. `payments-portal.ts` `payOf` — `branch` and `methods`; with only cheques / cash live it returns the box even with no account.
4. Record a payment (`payments-dialogs.tsx`) offers the live ways (`methods`, from `PaymentsData.methods` in `lib/projects/payments.ts`), the first to
   start; `recordPayment` refuses `methodRefusal(await fetchCollectionRules(), method)`.

## Probes changed
- `design-source/verify/projects/verify-pj-r5.cjs` — its notification clean-up also takes `invoice_sent` and `invoice_approved` (UC-098) *(parity map,
  a deliberate change of this rule)*.
- `design-source/verify/projects/verify-pj-r6.cjs` — the remind snackbar matches `[Rr]eminder drafted` (its press is INV-2026-006's third → "Third
  reminder drafted…"); its clean-up also takes `invoice_reminded` / `invoice_sent` *(parity map, a deliberate change of this rule)*.
- Grepped and still holding: `invoice-remind` (r6 presses it on the second reminder; the row keeps it until three), `reminded 2×` (gap-b),
  `Mark as approved by the client` / `More actions for VO-1` (r5 — the menu gained a row, found by name), `Description, note and due day` (gap-b),
  `oneoff-*` test ids (kept by `LinesGrid`'s prefix), Finance's tab addresses (no probe counts the strip), `money-overdue` / `invoice-overdue`.
- NEW `design-source/verify/parity-map-build/verify-pm-a.cjs` (≈45 checks, shots `pm-a/a01…a08`), puts back everything (the deposit and the payment
  schedule from INSERT snapshots).

## Needs from others (the orchestrator wires these)
1. **`components/quotes/editor/quote-editor.tsx` (nobody's)** — the VO's kebab Delete reads the rule (MI-104):
   ```ts
   import { variationDeleteBlock } from '@/lib/projects/money'   // beside the isApprovedVariation import (line ~75)
   const deleteWhy = (data.variation ? variationDeleteBlock(status) : null) ?? (canDeleteQuote({ id: me?.id ?? null, role: me?.role }, quote) ? null : DELETE_RULE)
   // L365: if (action === 'delete') { if (deleteWhy) { snackbar({ message: deleteWhy }); return } setDeleteOpen(true); return }
   // L611: deleteBlock={deleteWhy}
   // L722: if (!r.deleted) { snackbar({ message: r.error ?? DELETE_RULE }); return }
   ```
2. **`components/projects/overview/use-need-actions.ts` (the Overview's)** — `go` opens a `tel:` link as it is (the overdue row's *Call {client}*, MI-068):
   `const go = (to: string) => (to.startsWith('tel:') ? window.location.assign(to) : router.push(to.includes('from=') ? to : withFrom(to, here)))`
   (until then that button would push a `tel:` address with `?from=`).
3. **P-E · `lib/projects/schedule-moments.ts` `revertInvoice`** (L102) — the kinds list `['invoice_review', 'invoice_approved']` + `'invoice_sent'`, so a
   Start / Mark done sheet's Undo takes back UC-098's bell rows too.
4. **`lib/templates/data.ts` + `components/templates/render/slices.tsx` (nobody's)** — a quote's fixed fee prints as one: `DocPayment` gains
   `fixed?: boolean` (`docDataFromRecords`: `fixed: i === 0 && p.fixedMinor != null`), and the three payment layouts (slices.tsx ~L399 · L408 · L421)
   print `Fixed fee` where they print `{p.pct}%` (its amount is right already through `paymentAmounts`).
5. **P-B · `components/finance/finance-ghost.tsx`** — Money in's reveal ghost: `import { MoneyInGhostBody } from './money-in/money-in-ghost'` and,
   before the Money out branch, `if (tab === 'money-in') return frame(<MoneyInGhostBody kind={moneyInKindOf(params.get('kind'))} />)`
   (`moneyInKindOf` from `@/lib/finance/sections`). The route's loader already draws it (P-A's `MoneyInLoading`).
6. **P-G · `lib/global-search/model.ts` PAGES** — a ⌘K page for it:
   `{ id: 'finance-money-in', title: 'Money in', sub: 'Company › Finance · every invoice, client payment, variation order and credit note', icon: 'payments', href: '/company/finance/money-in', words: 'money in invoices invoice receipts receipt payments client payments variation orders vo credit notes register' }`.

## Demo data / repair
None needed: everything shows on the demo as it is (INV-2026-006's third reminder is one press away; the fixed fee, the lines and the PDF read are
made in front of the client).

## Stand-ins
- MI-035's reading is a rule (the PDF's own text + the bill reader + a note rule), not 1.0's AI — scans can't be read; no credits.
- MI-068's Call at a desk copies the number (a browser can't dial from a desk); `invoice_reminded` / `invoice_sent` go through the house bell (email
  / WhatsApp through the delivery layer's outbox, silent in the prototype).

## Not finished, and why
- The quote's print of a fixed fee's share, the quote editor's VO Delete, the Overview's Call, the Start sheet's Undo of `invoice_sent`, Money in's
  reveal ghost and its ⌘K entry sit in other packages' or nobody's files — Needs from others 1–6.
- The probe is written to the brief's shape and not run (no servers in this build).
