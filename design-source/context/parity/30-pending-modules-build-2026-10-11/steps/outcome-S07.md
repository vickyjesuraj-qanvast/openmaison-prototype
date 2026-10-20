# S07 · Projects leftovers — outcome (2026-10-11)

Card: `held:projects` (Projects — schedule, updates, tickets, floor plan, compliance) + the steps' notes after S05 (Files' Download on invoice /
receipt entries with no stored copy) and S06 (Accounting's "Projects /" crumb and Back to the house gate). 1.0 read:
`src/app/api/finance/invoices/[id]/payment/route.ts` (the studio's route refused an overpayment — `OVERPAYMENT`, "Payment exceeds the
outstanding balance"), `src/app/api/homeowner/projects/[id]/payment-submit/route.ts` (a client's overpayment was taken but never auto-trusted —
"overpayments need a human look"), `src/types/app.ts` `overCollectionCents` ("the client overpaid and a refund / credit note is owed before
closing"), `src/app/api/finance-documents/credit-notes/route.ts` (credit notes numbered `CN-{year}-{000}`), the project's 3-D planner door
(F-248…F-265: 1.0 never saved a layout with its lead or project). Register rows: `steps/reg-S07.md` (REG-S07.1…14). Probe:
`design-source/verify/pending-modules/verify-pm2-s07.cjs` (**89 / 89**); shots banked in `design-source/verify/pending-modules/pm2-s07/`.

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| **A payment above what is owed goes to the note, not a credit** (REG-1117, D-14) — revisit: credit notes exist now | **Built as recommended** — Record a payment takes what arrived; the payment settles what the invoice owed and the extra is a credit note of its own kind (`overpayment`: no GST, on the invoice it came with, naming its payment, numbered, filed, its Activity line); Needs you holds it with one filled step (Use on the oldest invoice that owes, else Record the refund); **Use on {invoice}** = a payment FROM the credit note (method `credit`) with its receipt and Undo; refund through the credit notes' own Record the refund; never voided; the paid payment is not reversed / undone / unconfirmed while its credit is used or refunded, and reversing it voids an untouched credit; a client's proof above what is owed now splits on Confirm (Undo puts it back as sent); the receipt, the credit note's paper, the portal, Money in, Reports (money in, never revenue or GST), Xero (simulated: bank, no sales, no tax; the use an allocation), To do's Recently and the handover's checklist all say it | `drizzle/0091_projects_s07.sql` (+ meta), `lib/db/schema.ts`, `lib/finance/credit-hold.ts` (new: the numbered writer, `holdOverpayment`, `dropHeldCredit`), `lib/finance/credit-model.ts` (`overpaymentReason`, `OVERPAY_VOID_RULE`, `usableOn`, `heldNow`), `lib/finance/credit-records.ts` (`kind`, `heldCreditOfPayment`, `receiptExtraOf`), `lib/projects/money.ts` (`MoneyCredit.kind`, `MoneyPayment.creditNoteId`, `held` · `heldMinor`, `HeldCredit`, `heldOf`, `isOverpayment`; an overpayment lowers no invoice), `lib/projects/payments-records.ts`, `lib/projects/payments-model.ts` (`overpaidBy`, `overpaidLine`, `CREDIT_METHOD`, `amountProblem` for the studio), `app/projects/payment-actions.ts` (record · confirm · undo · reverse; `applyCredit` · `undoApplyCredit`; `owedOn` less credit notes), `app/finance/books-actions.ts`, `lib/projects/money-needs.ts` (`money-credit-held`), `components/projects/money/{payments-dialogs,payments-section,invoice-page,invoice-panel,needs-list,project-money,billing-section,payments-receipt}.tsx`, `components/finance/books/{credit-notes,credit-note-paper,credit-note-page}.tsx`, `lib/finance/credit-paper.ts`, `lib/projects/{payments,payments-public,payments-portal}.ts`, `components/portal/money/portal-money.tsx`, `lib/portal/payment-due.ts`, `lib/finance/{reports,money-in,xero-server,todo-server,books}.ts`, `components/finance/money-in/money-in-workspace.tsx`, `lib/projects/{handover,handover-model,events}.ts`, `lib/leads/activity.ts` |
| **Files: Download on an invoice or receipt entry answers Coming soon** (REG-1229) — revisit | **Built** — Download on a money paper's entry (invoice · receipt · credit note · selection receipt) opens its paper printing (`?print=1`, the house's Download PDF) and Back returns to the folder; a real PDF file needs a server renderer — the developers' (honest print-to-PDF, as every paper's Download PDF). R109 takes away the stand-in pages R82 had given credit notes' entries | `lib/leads/file-model.ts` (`FileRow.paper`), `lib/leads/files.ts` (`moneyPapersOf`), `components/leads/files/lead-files.tsx`, `scripts/repair-demo-data.ts` (R82 step 3 · R109) |
| **A 3-D layout started on a lead before Won is not carried to its project** (one-home N-10) — revisit | **Built** — the lead's link opens *Plan the space in 3D* with the lead's layouts; a new one is saved with the lead (Who sees leads; the lead's members change it; its Activity on the lead; the editor's "{lead} · Lead", Back to the lead, Open the lead; the gallery's Kind: Leads; ⌘K); Won (and a project restored from the trash) carries them to the project with a line; Design › Designs lists them; their share keeps its lead | `lib/planner/{queries,policy}.ts`, `app/planner/actions.ts`, `lib/projects/create.ts` (`carryLeadLayouts` in `writeProjectRow`), `app/projects/ending-actions.ts` (restore), `components/planner/{project-layouts-dialog,new-layout-dialog}.tsx`, `components/planner/home/planner-home.tsx`, `components/planner/editor/planner-editor.tsx`, `app/leads/[id]/overview.tsx`, `lib/global-search/queries.ts`, `lib/leads/activity.ts` |
| (steps' note after S06) **Accounting opening a project directly gets "Projects /" and Back to the house gate** | **Built** — the frame's crumb starts at Finance (or the Finance page in `?from=`), Back "Back to Finance" (a `from` they can't open falls back to it); every money paper's first crumb is Finance; a selection receipt in Files opens for them | `lib/settings/roles.ts` (`projectsHome`; selection receipts in `ACCOUNTING_PATHS`), `components/shell/access-gate.tsx` (the role under the guard, `useProjectsCrumb`), `components/projects/project-frame.tsx`, the five paper pages |
| (found) a paper opened from Files said "Back to Money" and its Money crumb went to Files | **Fixed** — Back names the place (`paperBackLabel`), the tab crumb opens its tab | `lib/nav.ts`, `components/projects/money/{invoice-page,payments-receipt-page}.tsx`, `components/finance/{po-page,books/credit-note-page}.tsx`, `components/projects/choices/selection-receipt-page.tsx` |
| (found) Record a payment's "still owed" ignored credit notes (the Money tab's dialog and the server) | **Fixed** — both read the balance less credit notes | `components/projects/money/payments-section.tsx`, `app/projects/payment-actions.ts` |
| (found) a phone's Needs you row with three steps cut Confirm off | **Fixed** — the actions wrap | `components/projects/money/money.module.css` |
| (found) ⌘K listed a lead's layout to anyone (as a personal one would be) | **Fixed with the lead's rule** | `lib/global-search/queries.ts` |
| 1.0's old client links (`/pay/…`, `/my/{studio}/p/{token}`) do not redirect (D-11) | **Done in S02** — `lib/links/old-links.ts` redirects each | — |
| AI-written schedule / a timeline from a document / AI task suggestions | **Kept** — rule-built stand-ins (I-Q13), no credits | — |
| Generate (replace) a milestone's tasks with approval | **Kept** — suggestions only add (P-E) | — |
| Hide modules a studio doesn't use | **Kept** — later (simplify Q-11) | — |
| Tickets' AI analysis, Proactive Alerts; Messages' Show chat history, chat with any contact, groups | **Kept** dropped (H-Q16 · H-Q27 · P-G) — team and group chats are S26's | — |
| Floor plan live refresh | **Kept** dropped (G-Q17) | — |
| Reconcile tasks, over-bill treatments, top-up invoices, a client rating at the close | **Kept** not carried, as recommended | — |
| Other countries' compliance lists and timelines | **Held** (DEF-30) — S33's | — |
| Object storage, the five-minute reminder sweep | **The developers'** | — |
| Meeting Summary, the Co-Pilot from a project | **Held** with Meetings (REG-552) — S23's | — |

## Decisions taken (as recommended — his "build all of them" 2026-10-11)
- **D-14: an overpayment becomes a credit note** (the card's words). Its own kind, not a credit note on the next invoice: a credit note lowers an
  invoice's price and its GST; an overpayment is the client's money, so it carries no GST, lowers nothing, counts as money in on its day, and is
  either taken off a later invoice (a payment from it — the record every reader of payments already understands) or refunded. The payment keeps
  what settled the invoice; the receipt prints both and thanks for what came.
- **Use on: an explicit press**, the oldest invoice that owes first (a studio says "we'll take it off the next payment"); the filled step only
  for whoever records payments; the refund stays the money runners' (Owners, Admins, Accounting) as every credit note's. Not automatic at
  send — a sent invoice never changes and the press is one tap from Needs you.
- **Never Void an overpayment's credit** — it is the client's money: it goes with its payment's Undo, or with the payment's reversal while
  untouched.
- **A client's proof above what is owed splits on Confirm** (the same rule as the studio's record); the portal still refuses a client saying they
  paid more than is due (1.0's rule).
- **No "your payment is confirmed" message for a credit's use** — it is no payment the client made; the receipt on their page says the credit
  paid it.
- **Files' Download = the paper, printed** — the house's Download PDF; a real file needs a server renderer (developers').
- **A lead's layout is the lead's** (Who sees leads, the lead's members) and **Won carries it** in the project row's one writer — also on a
  restore. A duplicate stays personal (J-Q12's rule).
- **Accounting's home is Finance** for every crumb and Back that would have reached a page they don't open.

## What to check in the browser (production build; View as switches roles)
- **Dane (Owner), 1440:** Benjamin Han › Money › INV-2026-006's Record a payment → type 20,900 → "S$115.06 more than is owed — it becomes
  Benjamin’s credit, for a later invoice or a refund" → Record → the snackbar names CN-2026-003; Needs you "Benjamin’s credit, CN-2026-003 ·
  S$115.06" with Record the refund; the Paid cell "S$115.06 kept as credit"; the Credit notes view "Credit held"; the receipt RCT-… prints the
  extra; CN-2026-003's paper "Overpayment — paid S$20,900.00 when INV-2026-006 owed S$20,784.94 … Left S$115.06". Send the Completion invoice →
  Needs you "Use on INV-…" → press → Undo → press again (the credit note reads Used; the use's receipt "Taken from your credit"); Payments ›
  the S$20,784.94 payment ⋮ › Reverse is refused while the credit is used; the use's ⋮ › Reverse gives it back; Record the refund. Stage ▾ ›
  Completed shows "Nothing of Benjamin’s credit is left". Files › Payments: ⋮ › Download on INV-2026-003 opens the invoice and the print dialog,
  Back to Files; the same on a receipt, CN-2026-002, and Choices › a selection receipt.
- **Dane, a lead before Won (Vivien Lee):** the right rail's 3-D Space Planner → Plan the space in 3D (the lead's) → Start a new layout → the
  editor "Vivien Lee · Lead", Back to the lead; Tools › 3-D Space Planner › Kind: Leads; Convert to Project → the project's Design › Designs
  lists the layout, its Activity "…started on the lead, is now the project’s."
- **The client (Benjamin, portal):** Money's Mid-project row "Your credit CN-… (S$115.06 left)" → its paper.
- **Priya (Accounting):** a project opened from a bell row or typed address — "Finance /", Back to Finance; from Money in, Back to Money in;
  any money paper's first crumb Finance; Files › Download on a money paper opens it printing; a selection receipt opens.
- **390 / 320:** a held credit's Needs you row (its buttons wrap), the overpayment's paper, a lead page, the planner gallery — no sideways
  scroll against `screen.width`.

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate 0091 + repair R109) with `next start -p 3160`; :3160 stopped after.
`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 17 warnings are older files') · `npm run design:lint` nothing
new · `npx next build` green.

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s07.cjs`** (this step, 6 sections) | **89 / 89** — the page error log empty; the scratch DB left as found (a full `.dump` before and after a second run: no difference) |
| `pending-modules/verify-pm2-s01…s06.cjs` | 79 / 79 · 105 / 105 · 79 / 79 · 82 / 82 · 113 / 113 · 83 / 83 |
| `projects/verify-pj-r1 · r5 · r6 · r7 · r9` | 98 / 98 · 91 / 91 · 82 / 82 (after the deliberate change below) · 67 / 67 · 66 / 66 |
| `projects/verify-pj-gap-a · b · e · f1 · f2 · j` | 72 / 72 · 72 / 72 · 55 / 55 · 85 / 85 · 84 / 84 · 55 / 55 |
| `projects/verify-pj-fix-D` (money) | 35 / 35 |
| `parity-map-build/verify-pm-a · e · i · j` | 47 / 47 · 58 / 58 · 54 / 54 · 53 / 53 |
| `simplify-projects-finance/verify-ks` · `reports-in-company-2026-10-08/verify-reports` · `global-search/verify-search` | 29 / 29 · 41 / 41 · 27 / 27 |
| `npm run design:anatomy` (on the scratch `next start`, :3160) | all 1558 measures hold |

**Assertions changed as deliberate changes of their rule** (commented `(pending modules, a deliberate change of this rule)`):
`projects/verify-pj-r6.cjs` — more than is owed is no longer refused in Record a payment; it reads the overpayment line.

## Migration and repair
- **Migration 0091 `projects_s07`** (additive): `credit_notes.kind` (text, default `credit`) · `credit_notes.payment_id` (+ index
  `credit_notes_payment_idx`), `project_payments.credit_note_id` (+ index `project_payments_credit_idx`). No new table — the baseline lists are
  unchanged.
- **Repair R109** — credit notes' Files entries back to their paper (on the demo: 2 — CN-2026-001, CN-2026-002 lose their stand-in page, picture
  and size); a lead's layout whose lead has a live project goes to it with its line (0 on the demo). Again: "already in step". R82's third step
  no longer gives a credit note's entry a stand-in. Six checks added; R84's two credit checks leave the overpayment kind out; R88's
  personal-with-a-lead check is now "a template with a lead". Full repair: all checks pass.

## For the next steps
- **The orchestrator (CLAUDE.md's Map):** an overpayment = `credit_notes.kind = 'overpayment'` + `payment_id` (`lib/finance/credit-hold.ts`
  `holdOverpayment`, the credit notes' one numbered writer `insertNumberedCredit`); a payment from a credit = `project_payments.credit_note_id`,
  method `credit` (`applyCredit` · `undoApplyCredit` in `app/projects/payment-actions.ts`); `MoneySummary.held` · `heldMinor`; Needs you kind
  `money-credit-held` (`&do=use`); `FileRow.paper` (a money paper's entry → its page); a lead's layout = `space_layouts.lead_id` with no project
  (`isLeadLayout`, `fetchLeadLayouts`, `readLeadLayouts`), carried by `carryLeadLayouts` (`lib/projects/create.ts`); `projectsHome(role)` +
  `useProjectsCrumb()` (the role under the shell's `AccessGuard`); `paperBackLabel` (`lib/nav.ts`).
- **Money writes:** `applyCredit` re-reads what the credit has given after its insert and takes its own payment back if two presses raced —
  single statements, never a transaction (S06's lesson); `holdOverpayment` numbers through the shared `insertNumberedCredit` (a taken number
  takes the next).
- **S16 / S17:** the project header's filled button on a phone cuts a long label at both ends ("eview the ask for more tim…", Ryan's) — the
  DS button's centred, unwrapped label in `components/projects/project-frame.module.css` `.primary button { width: 100% }`; not this step's.
- **S10 (mAIson):** "use Benjamin's credit on the next invoice" could act through `applyCredit`.
- **S34 (real services):** Files' Download of a money paper prints the page; a real PDF file needs a server renderer (the one place to plug it:
  `components/leads/files/lead-files.tsx` `download` for `f.paper`). Xero's overpayment and its allocation are simulated.
- **Developers (1.0's port):** 1.0 never recorded an overpayment (its route refused it); a ported project with `overCollectionCents > 0` can be
  brought in as an overpayment credit note on its last paid invoice (`kind = 'overpayment'`, `gst_minor = 0`).

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for these; built on the screens that exist (Record a payment, the Needs you rows,
   the credit notes' list, panel and paper, the receipt, the Files menus, the planner's dialog, gallery and editor); every invented line in
   REG-S07.1…12.
2. **One system, no one-offs** — house pieces only (the banner row, `CostPanel` lists, `RowMenu`, the house Dialog, the credit notes' own
   refund dialog, `MetaChip`, `Tooltip whenCut`, the papers' frame); one numbered writer for both kinds of credit note; the lead's layouts in
   the project's own dialog given a prop; `design:lint` holds.
3. **Plain words** — "S$115.06 more than is owed — it becomes Benjamin’s credit, for a later invoice or a refund", "Benjamin’s credit, CN-…",
   "Use on INV-…", "Kept as your credit", "Your money, held as credit", "It goes to the project once the lead is won".
4. **Nothing is lost** — what arrived is all on the record (the payment + its credit); every press has its Undo (record, confirm, use, refund,
   reverse); a held credit is never voided; a lead's layout follows it to the project (also from the trash).
5. **Say why** — the refusals in the rule's words ("An overpayment’s credit is the client’s money…", "Its extra is credit note CN-…, and some of
   it was used or refunded — take that back first", "A lead’s layout goes to its project when the lead is won…", the lead's change rule).
6. **Back returns where you came from** — a paper from Files says "Back to Files" and goes there; Accounting's Back leads to Finance or their
   `?from=`; the lead's layout Back to the lead.
7. **Every screen is whole** — no new page; the papers' ghosts and the Money ghost unchanged in shape (a Needs you row is a row); the lead's
   dialog has its loading line and its empty start.
8. **Every width is designed** — 1440 · 390 · 320 checked: the held credit's row (its buttons wrap), the overpayment's paper, the lead page, the
   gallery; no sideways scroll against `screen.width` (probe section 6).
9. **Tables follow the leads listing** — the Billing and Credit notes views keep the house model (the words ride the sub-lines, a cut line shows
   whole on hover).
10. **Motion with purpose** — none added.
11. **Honest data** — every state is a record (the payment, its credit note with its file and line, the payment from it, its receipt); no GST
    on money held; Reports count it as money in, never revenue; Xero stays simulated; the print-to-PDF path is said; R109 backs the Files
    entries.
12. **Reach for everyone** — named buttons ("Use on INV-…", "Record the refund"), the menus by keyboard, the dialog's labelled fields, the
    lead's dialog rows as buttons.
- **How to add a missing thing** — one home each (the credit lives with its credit notes and its invoice on Money; Download is the Files menu's
  own; the lead's layouts in the planner's own dialog); shown only when it applies (the credit row while some is held, Use only when an invoice
  owes, Kind: Leads once one exists); one filled button per row (Use on…, else Record the refund); defaults that need no set-up (nothing to
  switch on).
