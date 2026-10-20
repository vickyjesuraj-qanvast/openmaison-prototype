# S44R · Agreements and bills — the UAT comments rows 358 · 359 · 361, calls C7 · C8 · C9 — outcome (2026-10-15, lane A)

Vicky's ask (2026-10-15): "go through the sheet for the UAT comments from row number 246 and below to identify and fix all the UAT comments based
on our 2.0 experience without any overlaps nor any issues without losing what we have already built … If you have any questions please go ahead
based on your recommendations." Source: the triage `design-source/context/feedback/05-uat-comments-246-364-triage-2026-10-15.md` (§6 rows 358 ·
359 · 361, §9, §10 calls C7 · C8 · C9). Every call taken **as recommended — his ask 2026-10-15**. Register rows: `steps/reg-S44R.md`
(REG-S44R.1…13). Probe: `design-source/verify/pending-modules/verify-pm2-s44r.cjs`. Shots: `design-source/verify/pending-modules/pm2-s44r/`.
Migration **`s44r_agreements_bills`** (0113 on today's main — additive, schema-only: `contracts.ask_deposit · purpose · to_read · defects_months`,
`contract_templates.use_at_handover`, `supplier_bills.approval_why · approved_by · approved_at`). Repairs **R127 · R128 · R129** (+ six checks).

**Two calls REVERSE an earlier decision** — C8 reverses **F1-Q10** ("bills: no approval"); C7 **partly reverses REG-911's "signing the quote
starts the project"** (with *The agreement is signed*, the agreement's signature starts it; the default stays today's).

**Rebuilt 2026-10-15 after the reboot** (the first lane under `/private/tmp` was wiped at 16:53 before landing): re-applied step by step from this
package's own transcript onto main as of 17:10 (S44F · S44I · S44O · S44P · S44Q · S44T · S43D landed) — not pasted files. Two places met the new
code: the Settings page's Projects data (S44O's `desk` guard) and `app/leads/actions.ts`'s import (S44O's `leadDeskIds`); both re-done by hand.

## Ledger — every row and item this package owns

| Row / item | What | Status |
| --- | --- | --- |
| **361 · C8** — the collated vendor-payment view | "A collated view of vendor payments due" | **Already** — Finance › To do › To pay lists every unpaid supplier bill by due day, red when ours and late (REG-1484); Money out › Bills filters them. Answer below. |
| **361 · C8** — a bill over the PO approval limit waits | "a vendor-invoice approval process" | **Built** — a bill on no PO over the PO approval limit waits for an Owner's or an Admin's OK before it is paid (`lib/finance/rules.ts` `billWaitWhy` 'limit'; `app/finance/cost-actions.ts` `recordBill` · `updateBill`; `supplier_bills.approval_why`). REG-S44R.1 |
| **361 · C8** — a bill that differs from its PO by more than the tolerance waits | | **Built** — 'differs': the PO's bills (this one with them) over the PO total by more than `billTolerancePct` (only over: a part bill under the PO is normal billing). REG-S44R.1 |
| **361 · C8** — the tolerance, a new Settings › Finance › Money out field | | **Built** — "A bill may come over its PO by (%)" beside the approval limit, with its own rule row on the approvals table ("Supplier bills over the limit or off their PO need approval", on, 10%) — its own row, apart from lane C's Money in work. `components/finance/cost-settings.tsx`, `CostRules.billApproval · billTolerancePct`. REG-S44R.2 |
| **361 · C8** — waits in Finance › To do before it can be paid | | **Built** — To approve (Approve in the row), never To pay; a PO's "not billed yet" row leaves the waiting excess out; the server refuses a payment on it (`recordPayout`, `BILL_WAITS_RULE`) and on its PO pays only what the PO itself owes (`payable`). `lib/finance/todo.ts`, `lib/finance/costs.ts`. REG-S44R.1 |
| **361 · C8** — every other bill stays as today | | **Built** — an Owner's or an Admin's own bill never waits; a bill within its PO or under the limit never waits; a bill paid on before the rule is past the gate (`billWaiting` needs nothing paid); the five demo bills pay as they did (R128 checks). |
| **361 · C8** — bell + Activity lines | | **Built** — `bill_review` (the approvers, in app + email; urgent for a daily summary) and `bill_approved` (whoever recorded it), both in Settings › Notifications and Your notifications; Activity "… It waits for an Owner’s or an Admin’s OK — {why}." and "{who} approved {vendor}’s bill {ref} ({S$}) — it can be paid." REG-S44R.3 |
| **361 · C8** — Undo | | **Built** — Approve answers with Undo (only while nothing is paid on it): the bill waits again, its line goes, every approver's bell row comes back. |
| **361 · C8** — the refusal's words | | **Built** — "An Owner or an Admin approves this bill before it is paid" (Accounting's row, the panel, the server), "Only an Owner or an Admin approves a bill", "It is approved already", "It doesn’t wait for approval". |
| **361 · C8** — Accounting's view | | **Built** — To do › Waiting for approval with the rule where the button would be; no Approve, no Pay; the bill's panel says why it waits. Accounting's own bills over the limit wait (they approve nothing). |
| **361 · C8** — a waiting bill counts once approved | (found in verification: pj-gap-f2's Profit tile — the demo's waiting EL-2207 counted at once, unlike a waiting PO or claim) | **Built** — a bill on no PO that waits is out of the committed costs, profit, You owe, the cash flow, the vendor's balance, the GST input and Xero until its OK; on a PO it counts through the PO. `costsOf`, `lib/finance/reports.ts`, `xeroItems`. REG-S44R.1 |
| **361 · C8** — said before it is recorded | (found on the way: the bill dialog said "No approval: it counts as a cost once recorded") | **Fixed** — the dialog's first line drops "No approval"; its total line says it will wait and why (the server's own rule, read in the browser). REG-S44R.3 |
| **361 · C8** — the project's Money / Overview | (found on the way: a waiting bill on a project would only show in To do) | **Built** — a Needs your OK row "Approve {vendor}’s bill" with Approve in the row on the project's Money and Overview; the overdue "Pay" row skips a waiting bill. |
| **361 · C8** — a demo bill waiting | | **Built** — R128 (EL-2207, Priya, Benjamin Han's project, its bell rows and Activity line). REG-S44R.4 |
| **358 · C7** — build the letter as a contract template | "their format" | **Built** — R127 seeds a Letter of Appointment (the client appoints the studio on the quote's terms and pays the deposit; both signatures) on the house fields, with a new **Deposit** field. Spaces keep their own words by editing it. REG-S44R.9 |
| **358 · C7** — Send for digital signature gains "Ask for the deposit" | | **Built** — the editor's and Preview's Send (one piece, `deposit-ask.tsx`), said whole or why it can't be; saved as ticked (`setContractDeposit`). REG-S44R.7 |
| **358 · C7** — the signing page ends on "Pay the deposit", the quote's first milestone, the entity's PayNow, the money papers' pay box | | **Built** — `DepositPay` with the portal's `PayBox` (PayNow QR with the amount and reference, Copy on each value, the bank); a line before the signature; the set's page too; paid → "Deposit received — thank you". `lib/contracts/deposit.ts` · `deposit-model.ts`. REG-S44R.8 |
| **358 · C7** — Settings › Projects "A project starts when: The quote is signed · The agreement is signed" (default today's) | | **Built** — `StartRuleSetting` (choice cards, the Lead stages card's pattern), `setProjectStart`, settings `project_start`; ⌘K. REG-S44R.5 |
| **358 · C7** — a signed agreement moves the lead to Won through the Won step's rules, never around them | | **Built** — `lib/leads/won-on-signing.ts` from every sign path (online, set, marked): stage movement + member rule (`blockedReason`), parked leads wait for their resume, the step filled from the agreement and checked by `validateStage` with the studio's asks; the move written as the window writes it; refusals said in the bell. REG-S44R.6 |
| **358 · C7** — … and drafts the deposit invoice | | **Built** — Won makes the project (`ensureProjectForLead`, made by the agreement's sender) and the project drafts its stage invoices, the deposit first (REG-994) — the bell says "its deposit invoice drafted". |
| **358 · C7** — a demo letter of appointment template in a repair rule | | **Built** — R127. |
| **358 · C7** — mark that it partly reverses "signing the quote starts the project" | | **Marked** — REG-S44R.6, `lib/projects/start-rule.ts`, `lib/leads/won-on-signing.ts`, this file. |
| **359 · C9** — contract templates gain "Use at handover" | | **Built** — the gallery's ⋮ (one at a time; Owners and Admins; never a standard PDF), the chip on the card and in the editor. REG-S44R.10 |
| **359 · C9** — the Hand over sheet offers "Send the completion letter", filled from the project (completion date, defects period) | | **Built** — the sheet's tick, a defects period in months (12 to start), the Handover Smart Text fields (Project number · Completion date · Defects period · Defects period ends). REG-S44R.10 · .11 |
| **359 · C9** — to sign or just send | | **Built** — "{first} signs it" (the house signing link, its window, its follow-ups) · "{first} reads and keeps it" (a letter to read: its link shows the letter and a copy, nothing to sign, never runs out, never chased, never counted as awaiting a signature). REG-S44R.11 · .12 |
| **359 · C9** — a demo template in a repair rule | | **Built** — R129 (Completion & Warranty Letter, Use at handover). REG-S44R.13 |
| **359 · C9** — Undo | (the completion's Undo existed — it now takes the letter back too) | **Built** — the letter to Deleted Contracts, its link dead, its bell row gone. |

### Sheet answers (for the UAT comments tab)

- **358** — Build your letter of appointment in Company › Templates › Contracts (a Letter of Appointment is there to start from — edit it into
  your format), raise it from the client's quote and press **Send for digital signature** with **Ask for the deposit** ticked: the client signs
  online and the page ends on **Pay the deposit** — the quote's first payment, by PayNow to your entity, the QR carrying the amount. In
  Settings › Projects › **When a project starts**, pick **The agreement is signed**: the signature moves the lead to Won (the Won step's own rules
  still apply), makes the project and drafts its deposit invoice.
- **359** — In Company › Templates › Contracts, mark your completion & warranty letter **Use at handover** (a Completion & Warranty Letter is there
  to start from). Completing the handover then offers **Send {client} the completion letter**, filled from the project — the completion date and
  your defects period — for the client to sign, or just to read and keep.
- **361** — The collated list of what you owe vendors is Finance › To do › **To pay** (every unpaid supplier bill by its due day, red when late).
  New in 2.0: a bill over your PO approval limit with no PO, or one that comes to more than its PO by over your tolerance (Settings › Finance ›
  Money out — 10% to start), waits under **To approve** for an Owner's or an Admin's OK before anyone can pay it; Accounting sees it waiting and
  why. Every other bill is paid as before.

## Calls taken as recommended (his ask 2026-10-15)

- **C8 (REVERSES F1-Q10 "bills: no approval")** — approval only where it earns its place: over the PO approval limit on no PO, or over its PO by
  more than the tolerance. Read further: "an Owner's OK" is the house's approvers — **Owners and Admins**, as POs and expenses (one system); "differs
  from its PO" is **over** it (a part bill under the PO is normal billing, never a reason to wait); a bill on an approved PO within it needs no
  second OK; the switch is on by default at **10%**; on Free it reads off with the other approvals; a bill on no PO that waits **counts as a cost once approved**
  (one system with a waiting PO or claim, and Xero's own rule for a bill awaiting approval), a bill on a PO counts through its PO.
- **C7 (PARTLY REVERSES REG-911)** — the default stays *The quote is signed*; *The agreement is signed* moves the lead only through the Won step's
  rules (stage movement, a member, the step's fields and asks) and never a parked lead; the deposit is the named quote's **first payment stage**
  (its fixed fee, else its share — `moneyOf`'s figure); its reference is "{OM-…} deposit" until the invoice is numbered; the project's type is the
  Won step's default (Whole-home renovation — changed on the project, as any Won).
- **C9** — one handover template at a time; the defects period is the sheet's (12 months to start, Singapore's usual), kept on the letter; "just
  send" is **a letter to read and keep** on the same link (no new page); a handover letter names no quote (it signs nothing).

## Kept (with the reason)

- No bell row "act in place" for `bill_review` (the expense / PO rows answer in the bell): the row opens To do on the bill, whose Approve is one
  press — a second in-bell path is more surface for the same press.
- A to-read letter's paper still prints the template's Client signature box when the template has one (it reads "Received by …"); the studio
  picked *reads and keeps it* — the box is the letter's own words.
- `countLiveSigningLinks` (a lead's Delete) counts a letter's link among "signing links" — it stops opening like one.

## For other packages

- **S44O (landed)** — the Money out change is one row in the Costs card's approvals table and one field beside the approval limit
  (`components/finance/cost-settings.tsx`, `CostRules.billApproval · billTolerancePct`); S44O's "Variation orders are billed" sits in Money in,
  untouched. **Marketing** (S44O's sixth role) gets the right answer from the rules it already has: it never approves a bill (`approvesBill` =
  `runsStudio`; *Who may do what* reads "no" in its column), never sees Finance, Settings › Projects, the contracts or the Hand over sheet (S44O's
  page gates), and the approvers' bell row goes to Owners and Admins only (`studioRunnerIds`). A signed agreement's Won goes through
  `blockedReason` with no role (a client signed — nobody pressed), so S44O's `roleStageBlock` never applies to it.
- **Orchestrator** — migration `s44r_agreements_bills` (0113); run `npm run db:repair` (R127 · R128 · R129) then `npm run db:baseline`
  in main. CLAUDE.md's Map: `lib/leads/won-on-signing.ts` (a signed agreement → Won), `lib/contracts/deposit*.ts`, `lib/projects/completion-letter*.ts`,
  `lib/projects/start-rule*.ts`, `lib/leads/stage-notify.ts` (the one stage-changed writer, moved out of `app/leads/actions.ts`).
- **Probes updated:** `contracts-parity/verify-ct-r2.cjs` — the Quote group's empty count 3 → 4 (Deposit), commented as deliberate.

## Shared pieces changed (the other lanes should know)

- `components/portal/money/pay-box.tsx` — `stage` takes only `number · owedMinor` (type loosened; the portal passes the same).
- `lib/projects/payments-portal.ts` — `payOf` exported.
- `lib/projects/create.ts` — `ensureProjectForLead` / `NewProjectRow` take `by` (who made it when no member pressed) and the bell's `actorId`;
  `lib/compliance/starter.ts` `addComplianceTasks` takes `by`.
- `lib/leads/stage-notify.ts` (new) — `notifyStageChange` moved out of `app/leads/actions.ts` (same words).
- `lib/contracts/tokens.ts` — the Quote group's **Deposit** and a **Handover** group; `lib/contracts/snapshot.ts` — `ContractLead.project`,
  `ContractQuote.depositMinor`, `addMonths`, `handoverValues`; `lib/contracts/queries.ts` — every loader feeds them (`withDeposits` · `withProject`).
- `lib/contracts/readiness.ts` — `sendBlock` / `contractReadiness` take `toRead`.
- `lib/finance/model.ts` — `BillState` gains `awaiting`, `BillRecord` the approval fields, `billWaiting`; `lib/finance/costs.ts` — `BillView.waits`,
  `waiting.billApprovals`, `payable({ bills })`.
- `lib/projects/needs-you.ts` — `NeedInline` 'approve-bill'; `lib/projects/money-needs.ts` — `cost-bill-approve`.
- `lib/notifications/model.ts` · `personal.ts` — `bill_review` · `bill_approved`.
- `lib/portal/needs.ts` · `home.ts` · `notifications.ts` — `HomeContract.handover · toRead` (a letter waits on nobody, the agreement is never it).
- `lib/settings/permissions.ts` (one row), `lib/settings/copy.ts` (`COST_APPROVALS_WORDS`), `lib/global-search/model.ts` (two entries).
- No `components/om/*`, shell or `globals.css` change.

## Verification

- **Rebuilt lane (main as of 17:10):** `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors · `npm run design:lint` holds ·
  `next build` exit 0 (under the lock, `DATABASE_URL` = a scratch copy). Base = `pbuild/base.db` + `db:migrate` (0113) + `db:repair`: R127 · R128 ·
  R129 seeded, every check passes, a second repair adds nothing.
- **Own probe** `verify-pm2-s44r` **81 / 81** (C8 · C7 · C9 · the waiting-bill rule both ways · the letter's editor banner · 390 touch · 320).
  Shots banked: `design-source/verify/pending-modules/pm2-s44r/` (13).
- **Finance:** `verify-pj-gap-f2` **84 / 84** (its Profit tile — the waiting-bill rule, fixed in the code), `pj-gap-f1` 85 / 85, `pm-a` 47 / 47,
  `pm-b` 47 / 47, `pm-c` 36 / 36, `pm-i` 54 / 54; contracts `pm2-s03` 79 / 79; S44O's own `pm2-s44o` 56 / 56 (with `OPENMAISON_DEV_PREVIEWS=1`
  on the server — its three email-logo checks read `/api/dev/email-preview`; 53 / 56 without the flag, not this package's).
- **Projects:** `pj-r1` 98 / 98 · `pj-r5` 91 / 91 · `pj-r6` 82 / 82 · `pj-r7` 67 / 67 · `pj-gap-a` 72 / 72 · `pj-gap-b` 72 / 72 · `verify-ks` 29 / 29 ·
  `pj-r8` **65 / 67 — not this package's**: its two checks expect the demo's Paint colours "needed by Mon 19 Oct", but main's own
  `fixtures/baseline.json` stores `needed_by` = 1792434600 (Tue 20 Oct, 02:30 Singapore) — the same value in `pbuild/base.db`; this package
  touches no choice, no selection and no baseline. For the orchestrator: the probe's date (or the baseline's) wants a look on main.
- **Regression** (`RUN_DIR=s44r2/reg`, base · empty · noleads from the lane's base): ct-r1 36 / 36 · **ct-r2 24 / 24** (23 / 24 before — "Insert a
  field says the Quote records are empty" counted 3; the Quote group gained **Deposit** (C7), so 4 — the probe updated with a comment, "S44R — a
  deliberate change of this rule") · ct-r3 28 / 28 · ct-r4 29 / 29 · st-r1 58 / 58 · dane-p5b 56 / 56 · ux-p5 58 / 58 · sw-r2 27 / 27 ·
  search 27 / 27 · ghosts-same 73 / 73 · ghosts-same-390 73 / 73.
- **Probes updated:** `contracts-parity/verify-ct-r2.cjs` (one line, commented).
- Before the reboot (the first lane): the same picture — own probe 78 → 81, the finance set green bar pj-gap-f2's Profit tile, which led to the
  waiting-bill rule.

## What to check in the browser

1. **Dane (Owner)** · `/company/finance/todo`: To approve lists *Bright Spark Electrical’s bill EL-2207* — "Over S$5,000.00, on no PO" — press Approve
   → "… approved — it can be paid" with Undo; then it is under To pay. **Priya (Accounting)**: the same bill under *Waiting for approval*, no Pay;
   its panel says why. `/settings?section=finance` → Costs: the third rule and "A bill may come over its PO by (%)" = 10.
2. **Michelle (Designer)** on Ryan D’Souza's project Money → PO-2026-003 › Record a bill: total S$15,000 → the line says it will wait (13% over).
3. **Dane** · `/settings?section=projects` → *When a project starts* → *The agreement is signed*. Company › Templates › Contracts → *Letter of
   Appointment* ⋮ › New contract from this template → Serena Koh → Send: tick *Ask for the deposit* (S$8,870.48 — Deposit of OM-10007) → Send via
   WhatsApp. Open the signing link in another browser, sign: the page ends on *Pay the deposit*; Serena is Won, project made, deposit invoice
   drafted, the bell says so.
4. **Dane** · Ryan's project › Stage › Completed: *Send Ryan the completion letter*, 18 months, *Ryan reads and keeps it* → Complete anyway (with a
   reason) → the letter's link reads *Your letter*; Undo takes it back.
5. 390 touch: the same Settings card, the signing page's deposit, the Hand over sheet as a bottom sheet.

## Principles check (DESIGN-PRINCIPLES.md)

1. **The mock wins, every exception written down** — no mock covers these; every visible change is a REG-S44R row with its invented copy flagged; the
   two reversals (F1-Q10, part of REG-911) are named in the rows, the code comments and this file.
2. **One system, no one-offs** — the deposit's pay box is the portal's `PayBox` (no copy); the Send dialog's ask is one piece for the editor and
   Preview; the Settings card is the Lead stages card's choice cards; the bill's wait reuses the PO / expense approval system (the same approvers,
   To do's To approve, the Needs your OK row, the bell's money place) and the Costs card's rule table; the letter rides the house signing link and
   Smart Text; the Hand over sheet's fields are the house `TextField` + `Chips`. No `components/om` change.
3. **Plain words** — "Ask for the deposit", "A project starts when …", "Send Ryan the completion letter", "Ryan reads and keeps it", "Over
   S$5,000.00, on no PO", "Its bills come to S$1,800.00 more than PO-… (13% over)".
4. **Nothing is lost** — every new press has Undo (Approve · the start rule · the completion with its letter); a waiting bill keeps its record and
   its PO's room; an auto-Won keeps the window's trail (stage log, project, invoices) so Activity and the Won step read it like a pressed one; a
   letter withdrawn goes to Deleted Contracts.
5. **Say why** — every refusal answers `{ error: <rule> }`; the bill dialog says it will wait (and why) before it is saved; the Send dialog says why
   the deposit can't be asked; an agreement that can't move the lead says why in the bell (parked, no member, the step's missing fields).
6. **Back returns where you came from** — the bell rows open To do on the bill (`?open=`) or the project's Money, as the PO / expense rows do; no
   new page, no new path.
7. **Every screen is whole** — no new page; the signing page's letter mode and deposit are inside its existing ghost; the probe's page error log is
   empty.
8. **Every width is designed** — the signing page's deposit, the Settings card and the Hand over sheet checked at 1440 and 390 touch (sheet as a
   bottom sheet, no sideways scroll).
9. **Tables follow the leads listing** — no table added; To do's rows are the existing model.
10. **Motion with purpose** — no new motion.
11. **Honest data** — R127 · R128 · R129 write the demo's records with their trails (the waiting bill's bell rows and Activity line, the templates);
    the deposit's amount is the quote's own first stage, never typed; the auto-Won is written as the window writes it, with the signer named.
12. **Reach for everyone** — the start rule is a `radiogroup` of choice cards named by its label; the deposit ask is the house's labelled checkbox
    (the Hand over sheet's Tell row) with what it will ask for beside it, never a silent greyed tick; the pay box keeps its Copy buttons' names;
    the Hand over sheet's letter controls are keyboard stops in reading order (the months box is a named field, who signs a radio group).
