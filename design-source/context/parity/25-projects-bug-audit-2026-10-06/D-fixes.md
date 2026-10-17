# D · Money in (studio side) — fixes (package fix-D, 2026-10-06)

Outcome per finding of `D-money.md`, plus the items routed here (E-02, A-03, A-18, G-01's money rule, G-12, B's and C's notes, F-11 / F-45's paper).
Status: **done.** Counts: **Fixed 44** (D-01…D-22, D-24…D-27, D-29…D-46) · **Not reproduced 2** (D-28; D-23's panel — its C key kept as the owner's call) · routed
items all fixed here (E-02 · A-03 · A-18 · G-12 · F-11 · F-45 · B's two notes · C's note; G-01's rule given to G as `money-visibility.ts`).
Probes on fresh copies of the repaired scratch DB, one build, :3123: **fix-D 35/35** (new) · r1 83/83 · r2 83/83 · r3 86/86 · r4a 72/72 · r4b 74/74 ·
r5 90/90 · r6 79/79 · r7 63/63 · r8 65/65 · r9 65/65 (r5 · r6 · r7 now assert the
fixed rules: the VO pill's words, Part paid → Overdue past due, the client's first name in the proof band, the Differs chip's hover, the completed bar).
Shots `shots/D-after/` and `design-source/verify/projects/fix-D/`. Repair R75b passes on a copy of `local.db` and on a fresh baseline rebuild (twice — idempotent).
Schema (additive): `project_invoices.contract_minor · base_minor · variations_minor`, `quotes.change_asked_at · change_asked_note`. Repair **R75b**.
New shared pieces: `lib/projects/money-visibility.ts` (`seesLeadMoney` · `moneyFileIdsOf` · `hiddenMoneyFiles` · `moneyFileHidden` · `isMoneyEventKind` ·
`leadsSeeingMoney` · `moneyNumberHits`) — **the one money check other packages call** (G applies it to Client access and the portal preview).

| ID | Outcome | What changed (file) |
|---|---|---|
| D-01 | Fixed | `reviseQuote` refuses an approved VO's Revise unless Owner/Admin and not completed (`variationStatusBlock`, MARK_RULE); for them it moves the contract back with `onVariationReverted` (now answers changes + undo), writes `project_vo_reopened` (+ Activity line), rings the team (`variation_reopened`, new bell kind + settings row + messages) and answers `contract` + `ReviseUndo`; `undoReviseQuote` brings version N back (Approved, Drafts, trail, bell). Editor: the Revise row / Sent banner say the rule for a Designer; the dialog says "the contract goes back to S$x until {client} approves version N+1"; the snackbar carries Undo (`app/quotes/actions.ts`, `lib/projects/invoices.ts`, `components/quotes/editor/quote-editor.tsx`) |
| D-02 | Fixed | `sendInvoice` stamps `contract_minor · base_minor · variations_minor`; `InvoiceView.basis` (stamped for sent/void, live for a Draft); the paper prints "Contract value S$x when issued / as it stands today" and "n% of the contract value" only when the amount is that share (else "the n% stage, its share of what the contract leaves"); Invoices sent's stage sub "10% of S$77,900.12"; R75b stamps the invoices sent before (`app/projects/money-actions.ts`, `lib/projects/money.ts`, `invoice-paper.tsx`, `project-money.tsx`, `scripts/repair-demo-data.ts`) |
| D-03 | Fixed | `InvoiceView.paidOn`; a paid invoice's paper: "Paid in full on {date} — thank you" stamp (green), "Total" not "Total due", no How to pay (a void one neither); the tables' subs say "paid {date}" (`invoice-paper.tsx`, `invoice-paper.module.css`, `project-money.tsx`, `payments-records.ts`) |
| D-04 | Fixed | `lib/projects/money-visibility.ts`; Activity drops payment / invoice / VO / rebalance lines, VO send lines and Files › Payments file lines for a viewer refused money (`lib/leads/activity.ts`); Files hides the Payments folder, its files and every proof / receipt (`lib/leads/files.ts` `loadRows`); `/files/img/[id]` and `/projects/[id]/media/[id]` answer 404 for them; `paymentFactsFor` gives no money fact (no "Payment overdue", no "awaits payment") to them (`lib/projects/payments.ts`) |
| D-05 | Fixed | `undoReversePayment` / `undoNotReceived` refuse once the invoice is not sent ("INV-… is void since — the payment stays reversed") (`app/projects/payment-actions.ts`) |
| D-06 | Fixed | `outOfStep` ignores a plan that only moves rounding cents between Drafts that add up (`centsOnly`, `lib/projects/money.ts`) |
| D-07 | Fixed | `trueCostMinor` sign-aware; `marginPct` on `|net|`; `categoryShares` share / margin on `|total|`; By category on a VO shows each category's signed change (`lib/quotes/math.ts`, `items-summary.tsx`) |
| D-08 | Fixed (+ G-12) | A VO's print: canvas headings read "Variation order VO-1 — to contract OM-…" (case kept), "CONTRACT FOR …" reads "VARIATION ORDER TO THE CONTRACT FOR …", totals "Change before GST" / "Change to the contract", the minus before S$ (`moneyText`); `DocData.quote.variationOf`; readiness quiet once Confirmed / Signed. The signature's fixed "Designer" is the Letter house style's typed word — the preset now prints `{prepared_by_role}` for new templates; a studio's stored template keeps its own words (`lib/templates/fields.ts`, `canvas.tsx`, `slices.tsx`, `styles.ts`, `data.ts`, `queries.ts`, `readiness.ts`, `presets.ts`, `lib/quotes/editor.ts`) |
| D-09 | Fixed | Send is checked before WhatsApp opens (amount, status, approval, lock) and a second press does nothing; a S$0 Draft offers no Send / Submit (its menu row says "It is S$0.00 — nothing to send"); `SendContractDialog busy` (`project-money.tsx`, `invoice-page.tsx`, `components/contracts/editor/dialogs.tsx`) |
| D-10 | Fixed | The draft names the number the send takes (`nextInvoiceNumber`, read at load; the snackbar says if another send took it); a client without the portal gets the bank / PayNow lines and the reference in the message, and the dialog's note says so and how to attach the PDF; 0-day terms read "due on receipt" (`invoices-model.ts` `invoiceMessage`, `money-queries.ts` `sendFacts`) |
| D-11 | Fixed (+ E-02) | Completed projects keep the overdue bell row (`derivedPaymentRows`), the "Payment overdue" reason (`attentionReasons`) and the invoice's Waiting on client line (listing + Overview); the bar / setting: "…agreed money are read-only … — payments can still be recorded" (`lib/projects/payments.ts`, `attention.ts`, `queries.ts`, `handover-model.ts`, `handover-setting.tsx`) |
| D-12 | Fixed (+ A-18) | A receipt's file opens the receipt page (`receiptOfFile`, both viewer routes redirect); ⌘K finds invoices and receipts by number on the project's Money row, for whoever sees that money (`moneyNumberHits`, `lib/global-search/queries.ts`) |
| D-13 | Fixed | Undo of Confirm / Not received raises the confirmers' "says they paid" row again (`askConfirmersAgain`) |
| D-14 | Fixed (helper line — owner's call open) | Over the owed amount: "…— record S$4,860.00 and put the extra S$140.00 in the note"; Record a payment gained its Note field (the record always had `note`). Credit-as-overpayment left for the owner |
| D-15 | Fixed | `?open=` read once on arrival (`useState`), the address cleaned in its own effect |
| D-16 | Fixed | `invoiceState` tests overdue before part paid; the sub says "S$x paid" |
| D-17 | Fixed | `markVariationApproved` refuses a S$0 order ("VO-1 changes nothing yet — add its lines first"); its menu row says so; "nothing changes on the unsent invoices" when Drafts exist (`rebalanceSentence drafts`) |
| D-18 | Fixed | `invoice_approved` bell kind (+ settings row, messages): the submitter hears "Dane approved and sent your invoice INV-…" |
| D-19 | Fixed | `setInvoiceRules` clears the waiting submissions (and the approvers' rows) when approval goes off |
| D-20 | Fixed | "You submitted …"; the disabled row's reason by role (send it back · take the submission back · waiting) |
| D-21 | Fixed | `.tagStack .sub { max-width: 100% }` (the Tooltip anchor is `display: contents`) |
| D-22 | Fixed | Change the amount at the m size (600) |
| D-23 | Panel: not reproduced · C: owner's call, kept | On a direct load and from the tabs, the Money tab's ? panel reads "On this page · {project}: Switch tabs 1–8 · New variation order C · Back to Projects Esc" (the shot was taken on the listing). C presses New variation order exactly as the button does (REG-711: a key does what its press does); whether a key may make a record without a form first is left for Vicky |
| D-24 | Fixed | A VO's General Info reads Title / Valid until; the sent band "to change the variation order…" and "approved version n"; the follow-up chip "the variation order's Due date"; the Revise dialog "The variation order becomes a Draft…"; readiness skips T&Cs / Notes for a VO; the status pill and its list read the Money tab's words (`variationLabel`) (`general-info.tsx`, `quote-bars.tsx`, `follow-up-chip.tsx`, `use-quote-send.tsx`, `quote-editor.tsx`, `readiness.ts`) |
| D-25 | Fixed | `reminderMessage late` — "is due on" until the due day has passed |
| D-26 | Fixed | Story: "You've invoiced S$x — S$y more than the S$z contract"; overdue with credit: "S$a is overdue — S$b once the S$y to credit is set against it"; the credit band and the overdue band name the net; a S$0 Draft is never "ready to send" |
| D-27 | Fixed | `MoneyPayment.unchecked` → `uncheckedMinor`; the Collected tile "S$x not yet checked" and the story "S$x of it is {client}'s proof, counted but not yet checked" |
| D-28 | Not reproduced | Measured at 390 (touch): the strip is `sticky` z 19 inside the page; the dialog's overlay is a body portal at z 110 (a sheet 115) — the scrim covers the strip, as in both the audit's shot and ours (`shots/D-after/d28-phone-sheet.png`) |
| D-29 | Fixed | A band's actions start at the left on a phone, clear of the Maison AI button at the bottom right (`money.module.css`) |
| D-30 | Fixed | From = the client always; the sub "Recorded by {member}" / "Sent from their portal" |
| D-31 | Fixed | Sends and receipts no longer write Next number back (the next is read from the highest under the prefix); a new prefix clears a carried-over Next number (both settings) |
| D-32 | Fixed | The house `DateField` / `DatePicker` take `min` / `max` (days outside are greyed and refuse the press); Record a payment caps at today; a day before the invoice was sent is allowed with the helper "Before the invoice was sent — it settles it all the same" (server too; the repair check now asks "paid after it was recorded") |
| D-33 | Fixed | `quotes.change_asked_at · change_asked_note` stamped by `askQuoteChange`, cleared by a resend or a revise; the VO's status cell "Change asked · 2h ago" (their words on hover); the story says the client asked for a change and to revise it |
| D-34 | Fixed | The amount cell keeps "GST S$x inside" and adds a "Differs" chip (MetaChip) whose hover says "Differs from the schedule by S$x — {reason}"; a Draft off the schedule without a reason is out of step, never "Differs" (`differsMinor` needs a reason) |
| D-35 | Fixed | Invoice / receipt addresses for a viewer refused money render the Money tab's EmptyState in the page frame (`MoneyHiddenPage`, `moneyHiddenFor`) |
| D-36 | Fixed | Every VO row keeps its ⋮ (Preview {VO}; Mark as approved when not approved) |
| D-37 | Fixed | The section head's titles take the row (`flex: 1 1 0`), so Column settings stays at the right at 768 (`components/company/plan/plan.module.css` — the CreditsTable head, house-wide) |
| D-38 | Fixed (+ F-45) | Totals grid `minmax(0,1fr) max-content` ends on the Amount column (measured equal at 1440); invoice numbers `nowrap` on the paper, the page title, the payment band and the Outstanding tile |
| D-39 | Fixed | The invoice ghost draws the third button only for a Draft (`GhostShape` from the page, `useRememberShape` for the loader); the Money ghost keeps a band row when the tab opens with one |
| D-40 | Fixed | Tiles two by two on a phone, one column below 360 |
| D-41 | Fixed | The receipt page's chip reads the Payments table's word and tone (Confirmed green · Reversed plain) |
| D-42 | Fixed | "recorded by you"; `viaLabel` keeps "WhatsApp"; the VO send line names no person ("The variation order VO-1 went to …"); the re-size line follows its edit by a second (cause before effect) |
| D-43 | Fixed | "INV-… is no longer void" |
| D-44 | Fixed | One form of the client's name per surface (the band says "Ryan says they paid", as the story); Overview "The 10/30/30/30 split, agreed when the project began"; 0-day terms "due on receipt" (dialog, message, snackbar); the VO preview's crumb is the editor's (Projects / project / Money / VO-n) |
| D-45 | Fixed | An overdue invoice is "Payment overdue" alone — no "awaits payment" line beside it |
| D-46 | Fixed | The method · reference sub is wrapped in `Tooltip whenCut` |
| E-02 | Fixed with D-11 | — |
| A-03 | Fixed | `setProjectValue` re-sizes the unsent Drafts through `applyRebalance` in the same press, answers the rebalance sentence and an Undo (`undoProjectValue`: the value, the Drafts and the lines back); the frame's snackbar carries it; the tile help says "The value agreed for the project" (`app/projects/actions.ts`, `project-frame.tsx`) |
| A-18 | Fixed with D-12 | — |
| G-01 (money rule) | Fixed for Activity · Files · picture routes · Overview · listing; G applies `money-visibility.ts` to Client access and the portal preview | — |
| G-12 | Fixed with D-08 | — |
| B's note "Mid-Project are ready to send" | Fixed | The story joins the ready stages with `listOf` and says is / are by their count; a S$0 Draft is never ready |
| B's note "Paid · due 3 Oct" (Shalini) | Fixed with D-03 | A paid invoice's sub reads "INV-… · paid {day}" / "Paid {day}" |
| C's note (two due dates in one bell row) | Fixed | The derived overdue row comes due at its due day's local midnight (REG-1072's rule), so "Due Fri 2 Oct · n days late" and the body's "due 2 Oct" name one day and count as the Money tab does |
| F-11 (the papers) | Fixed | "Prepared with OpenMaison" is gone from the invoice and the receipt papers — a client's document (the portal and the PDF alike) carries the studio's name alone (REG-963). The contract paper (not money's) keeps its footer |
