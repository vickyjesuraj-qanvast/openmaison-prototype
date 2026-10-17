# Package B — money in, complete · outcomes (gaps build, 2026-10-07)

Brief: `scratchpad/build2/brief-b.md` · report rows `26-projects-missing-from-1.0-2026-10-07/4-finance.md` (+ `7-coverage.md` for 14–15).
Port 3122 · repair R79 · probe `design-source/verify/projects/verify-pj-gap-b.cjs` · register rows `reg-b.md` (REG-b.1…20).

Status: **done** — 16 of 16 items Built, 0 not built, 0 moved.

Checks: `tsc` clean · `eslint app components lib` 0 errors (9 warnings, none new) · `design:lint` nothing new · R79 + every check pass twice on a
fresh base copy (idempotent). Probes on fresh copies of the repaired scratch DB, one build, :3122: **gap-b 72/72** (1440 + 390) · r1 83/83 · r2 83/83 ·
r3 86/86 · r4a 73/73 · r4b 75/75 · r5 90/90 · r6 79/79 · r7 62/62 · r8 65/65 · r9 65/65 · fix-B 53/53 · fix-C 49/49 · fix-D 35/35 · fix-E 50/50 ·
fix-F 44/44. Probes changed where the rule changed on purpose: r5 · r7 press / look for New ▾ (REG-b.18); r1's attention regex gains money's two
reasons (REG-b.9); fix-B holds Aisha's ready Commencement invoice for approval so B-17 still asserts "Share the schedule" (the ready invoice now leads
the header, REG-b.5). Shots `design-source/verify/projects/gap-b/` (16).

## The model every item hangs on

- `project_invoices.kind` = `stage` · `variation` (`stage_ref = vo:<quoteId>` — in the contract, always locked in the allocation) · `one_off`
  (`extra:<id>`) · `external` (a stage's ref when it stands for that stage, else `extra:<id>`). `extra:` invoices count in Invoiced / Collected /
  Outstanding, never in the contract value, the allocation, "left to invoice" or "to credit". `MoneySummary` gains `contractInvoicedMinor` ·
  `outsideMinor` · **`collectedContractMinor`** (collected on the contract's invoices only — what a refund / over-collection compares with
  `contractMinor`) · `extras` · `billable` · `stageDraftsLeft`; `InvoiceView` gains `outside` · `label` · `readySince` · `adjustedFrom`.
- Reminders and approver reminders are read from their `lead_events` (no counter column).

## Items

| # | Item | Outcome | What / files |
|---|---|---|---|
| 1 | Bill a VO approved after every stage is invoiced | Built | `billVariation` / `undoBillVariation`; `billable` · `stageDraftsLeft`; approval sentence `rebalanceSentence(…, { bill })`; Money band + "Bill it" + ⋮ Bill VO-n on its own; a revised VO drops its own Draft (`onVariationReverted`) |
| 2 | One-off invoices (M-04) | Built | `createOneOffInvoice` · `updateOneOffInvoice` · `removeDraftInvoice` (Undo); New ▾ › One-off invoice (`OneOffDialog`), Other invoices table; the stage path (submit · send · remind · pay · receipt · void); the portal lists it once sent |
| 3 | A description and a note on every invoice; lines on one-off | Built | description · client_note · lines_json; `InvoiceDetailsDialog`; printed by `invoice-paper.tsx` |
| 4 | An invoice's own due date | Built | due_mode · due_on; `dueOf` / `dueModeWords`; terms · a day picked · handover day (target end); read by `sendInvoice`, Send's subtitle, the WhatsApp draft, the paper |
| 5 | Offer the invoice when its milestone is done | Built | `readyInvoicesFor`; derived bell row `invoice_ready`; primary action "Send / Submit the {stage} invoice" (next-step.ts splice before Share) → `money?open=…&send=1` opens its Send |
| 6 | Invoice and receipt links without sign-in; invoices filed | Built | tokens; `app/invoice/[token]` · `app/receipt/[token]` (+ layout, loading, `public-doc-page.tsx` + ghost); dead / Draft links → LinkNotice; the WhatsApp draft carries the link for a client without the portal; Copy the invoice / receipt link; `fileMoneyDoc` on send, `invoiceOfFile` in both file viewers; money-visibility covers them; never checks the portal (Q-40) |
| 7 | Omit from the contract; bulk Omit / Restore; Reason for the change | Built | `contractLinesFor` · `omitFromContract` · `setVariationReason`; `quote_items.omits_id`; `omit-dialog.tsx` (+css) from Items › Create ▾ (VO only); bulk Omit / Restore; `VariationReasonField` in General Info; printed via `DocData.quote.changeReason` → slices.tsx |
| 8 | Money warnings | Built | attention `collection_trailing` (≥ 30 points, in progress) · `invoice_ready` (≥ 3 days); Status card rows open Money; Money bands |
| 9 | Record an invoice made outside OpenMaison | Built | `recordExternalInvoice` / undo; `RecordExternalDialog`; "Recorded" on rows and paper |
| 10 | Chasing | Built | `remindersOf`; Invoices sent: "{who} · n days ago", "due in n days" / "n days overdue", "Reminded 2× · last 3 Oct" |
| 11 | Remind the approver | Built | `remindApprovers` (once an hour per person); band + menu; `invoice_review` again; Activity |
| 12 | Number pattern per issuing entity | Built | `invoice_numbering_entities`, `numberingFor` / `nextNumberFor`, `setEntityNumbering`; Settings card (from a second live entity — the demo studio has one, so it is hidden there) |
| 13 | A project's own payment split (+ fee first) | Built | `setProjectSplit` / undo; `SplitDialog`; empty state "Pick the payment split", "Change the split"; `fixed_minor` · `SplitShare.fixedMinor` behind `InvoiceRules.feeFirst` (Settings switch, off by default) |
| 14 | The studio's invoice layout | Built | `invoice_paper` (studio + per entity); `InvoicePaperSetting`; printed on invoices (studio page, portal, link, PDF), receipts and VOs |
| 15 | "Original → adjusted" | Built | `InvoiceView.adjustedFrom` on the paper's line |
| 16 | A VO from a contractor's paper | Built | `vo-upload-dialog.tsx`, `createVariationFromUpload`; no AI credits (Q-30) |

## Demo data (R79)

Every invoice / receipt has its link token, every sent invoice its Files › Payments entry; Shalini Menon's VO-1 billed on its own (INV-2026-008, paid
before her handover, RCT-2026-008); Aisha Rahman's one-off reimbursement (INV-2026-009, paid by PayNow, RCT-2026-009 — on Aisha so Benjamin Han's
board-4 figures hold); Benjamin Han's Mid-Project reminded twice; Ryan D'Souza's XR-1042 recorded outside the schedule (due 19 Oct). R72's two
checks and its numbering step now leave out `extra:` / recorded invoices; REG-613's kind list gains the six new kinds.
