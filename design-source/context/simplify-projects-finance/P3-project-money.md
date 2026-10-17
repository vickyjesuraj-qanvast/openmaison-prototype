# P3 — Money on a project: simplify study (2026-10-09)

**Area:** the project's Money tab end to end — money in (payment schedule, stage / VO / one-off / recorded invoices, approval, send,
payments, the client's *I have paid* and confirming it, reminders, receipts, PayNow, credit notes, refunds, void, reverse, rebalance,
the split and fee-first), money out on the project (the Costs half: POs, supplier bills, expenses, paying out), the books (profit,
margin, cash, *What the numbers say* — Owners and Admins), the invoice / receipt / credit-note pages and their no-login twins, the
Overview's Money card, Settings › Projects' four money cards and Settings › Finance.

**How I looked:** read-only on the production build at :3011 (scratch DB), signed in as Dane (Owner); 1440×1024, 390×844 (touch) and
768 (touch) where the layout matters. Opened menus, dialogs and panels and closed them; pressed nothing that writes. Other roles read
from the code. Measurements come from scripted counts in the page (`scratchpad/simplify/p3/*.cjs`). Screenshots: `scratchpad/simplify/shots/P3/`
(65 files — the main ones are named where they are cited).

**Projects used:** Benjamin Han P-2026-002 (busiest: an overdue invoice, a credit note with a refund due, a PO and an expense waiting,
an overdue bill), Ryan D'Souza P-2026-001 (a client's payment to confirm, two VOs (one declined), an invoice recorded from elsewhere,
three POs), Marcus Teo P-2026-004 (just starting: nothing sent, the deposit ready), and also Aisha Rahman (on hold) and Shalini Menon
(completed, locked).

---

## 0 · The short answers

**What does a designer need from Money, and what does an owner need?**

| | Designer (on the project's team) | Owner / Admin |
|---|---|---|
| Comes to Money to… | send (or submit) the next stage's invoice once the milestone is done · see whether the client has paid · confirm the client's *I have paid* (by default the assigned designer confirms, Settings › Projects › Client payments) · chase on WhatsApp · put extra works in a VO and get it approved · raise POs from the quote, log bills and expenses | everything the designer does, plus: approve invoices, POs and expenses · record payments that came in · pay vendors and claims · credit notes, refunds, voids, reversals · **is this project making money, and is cash flowing the right way?** |
| Needs to see at once | **one figure** (what the client owes now, the late part in red), **the next invoice** (which stage, how much, when it is ready) and **what waits on them** | **three figures** — to collect · to pay · profit (with margin and cash) — and **what waits on them** |
| Sees today | the same long page as the owner minus 6 of the 10 tiles and *What the numbers say*: 4 tiles, 7–8 tables, the bands | 10 tiles, 8–9 tables, up to 7 bands, ~950 words |

The code already splits the data this way (`seesCostFigures` / `fetchProjectBooks` hand cost totals and profit to Owners and Admins only,
`lib/finance/rules.ts:69`, `lib/finance/books.ts:215-226`); the layout does not — both roles get one long list of sections.

**How many numbers are on screen, and which ones matter?** Benjamin's Money tab prints **57 money figures, only 17 of them different**;
**S$20,784.94 appears 11 times**, INV-2026-006 5 times, S$1,400.00 10 times; ~950 words; 8 tables; 10 tiles; 14 ⋮ buttons; 8
column-settings buttons. Ryan's: 60 figures (36 different), INV-2026-002 seven times, 20 ⋮, ~1,000 words. The first screen at 1440
already carries 19–23 figures and 21–23 controls; the story sentence at the top repeats the four tiles right under it. **The figures
that matter:** *owed now* (and the overdue part), *the next invoice*, and — for the owner — *you owe vendors*, *profit / margin*,
*cash so far*. Everything else (contract value, invoiced, left to invoice, GST inside, share %, committed, paid out) is supporting detail.

**Money in and money out: one story or two?** Two stories stacked on one page, with the seam in the wrong place. Money in (story
sentence, 4 tiles, bands, 5–6 tables) runs first; the **Costs** half starts ~1,900px down at 1440 and **5.3 phone screens** down, with
its own *New cost* button, its own 3 tiles, its own bands, then the **profit** tiles — the punchline that combines both halves — buried
inside Costs (`components/finance/project-costs.tsx:80`, the `books` slot). Records behave differently in each half (an invoice opens a
read-only page; a PO opens a side panel with its actions and history). Settings are split too (money in under Settings › Projects, money
out under Settings › Finance). Studio-wide, money out has lists in Company › Finance; money in has none (F-19 "not yet").

**Steps to each job today** (from the project's Overview; details in §2):

| Job | Presses today | Where it goes wrong |
|---|---|---|
| Send the next stage invoice | **3** (Money → Send → *Send via WhatsApp*) | at 768 the row's *Send* is off-screen in the table's sideways scroll; the band offering it appears only after 3 days |
| Confirm a client's payment | **2** (Money → Confirm); 3 from the bell | the same payment is told in 7 places on two pages |
| Record a VO and bill it | **≈6 + its lines** to send it; billing is automatic while unsent stages remain, else **+3** (*Bill it* → Send → *Send via WhatsApp*) | the VO table and the invoice it creates sit in different tables |
| Issue a credit note | **5 + typing** (Money → scroll → ⋮ → *Issue a credit note* → reason → *Issue*), the refund **+2** ~1,000px lower | the *S$1,090.00 to refund* band names the step but has no button |
| Raise a PO from the quote | **9 + one tick per line**, three stacked overlays, after scrolling ~1,900px (5.3 phone screens) | the vendor's own lines are grouped first, but nothing shows which quote lines are already on another PO |
| Log a bill from its PDF | **5** after the same scroll | (the reader itself is good) |
| See profit | **0** on the Overview card (but "Profit · Early estimate S$ 67,883" reads like a real profit); on Money **2 screens** (1440) / **5.7 screens** (390) down | Marcus, with no costs, shows *Profit S$48,600.00* — the whole contract |

**The proposal in one paragraph** (§6): keep every record, rule and dialog; change the page from *ten stacked sections* to **four
regions**: (1) one **New ▾** for both halves; (2) **Needs you** — one ranked list of every money step waiting on this viewer (today's
7 kinds of money-in band, 2 payment bands, 4 cost bands and the non-duplicate insights, each fact once, each with its button);
(3) a **Collect · Pay · Profit** summary — three tiles for the owner, one (Collect, with the next invoice) for the designer; (4) **two
lists in one grammar** — *Billing* (the payment schedule as the spine, with the other invoices beneath; payments, receipts and credit
notes fold into each invoice) and *Costs* (POs, bills, expenses in one table with a kind filter) — where a row opens **one record
panel** (the Costs' `CostPanel`, given to invoices too). On a phone the two lists become one at a time behind a two-chip switch.
Benjamin's tab would go from 8 tables / 10 tiles / 7 bands to 2 lists / 3 tiles / 1 list of to-dos.

---

## 1 · Jobs to be done

| # | The job, in their words | Who | How often | Device |
|---|---|---|---|---|
| J1 | "The hacking is done — send the commencement invoice" | Designer submits (approval on by default, `lib/projects/invoices-model.ts:16-17,60`); Owner / Admin sends | each stage, 4–5 per project | phone on site / laptop |
| J2 | "Approve Germaine's invoice and send it" | Owner, Admin | a few a week, studio-wide | phone / laptop |
| J3 | "Who still owes us on this job, and how late?" | Owner, Admin, Designer | weekly | laptop |
| J4 | "Chase Benjamin — it's a week late" | Designer, Admin | when overdue | phone |
| J5 | "Ryan says he paid — check the bank and confirm" | the confirmer (assigned designer by default) or Owner / Admin | each client payment | phone |
| J6 | "The cheque came in — record it and send the receipt" | Admin (anyone on the team may) | each payment | laptop |
| J7 | "He wants 6 more power points — add a VO, get it approved, bill it" | Designer | 1–3 per project | laptop (quote editor) |
| J8 | "Bill the permit and lift-padding fees" / "this invoice was raised in Xero, put it on record" | Admin, Designer | occasional | laptop |
| J9 | "We over-billed after the omission — credit it and refund him" | Owner, Admin | rare | laptop |
| J10 | "Order the carpentry from Woodcraft — the quote's lines at cost" | Designer (Owner / Admin approve over S$5,000 or with an advance) | several per project, early | laptop |
| J11 | "AquaFlow sent their bill — log it" | Designer, Admin | each bill | laptop (PDF) |
| J12 | "I bought tiles samples / took a Grab to site — claim it" | Designer | weekly | **phone on site** |
| J13 | "Pay AquaFlow" / "pay back Michelle's claim" | Owner, Admin | weekly | laptop |
| J14 | "Is this job making money? Are we funding it?" | Owner | weekly–monthly | laptop / phone |
| J15 | "Set how this direct job is billed — 10/30/30/30, design fee first" | Designer, Owner | once per project | laptop |

---

## 2 · The cost of each job today

Presses are counted from the project's Overview (the tab press included); "+ scroll" is the distance to the control. *Choices at the
decision point* = buttons and links visible in the page body when the person has to act.

| Job | Path today | Presses | Screens / overlays | Choices at the point | Must already know | Where it goes wrong |
|---|---|---|---|---|---|---|
| J1 send (Owner) | Money → *Send* (row's Next step, or the band once ready ≥ 3 days, `invoices-kinds.ts:123`) → Send dialog prefilled → *Send via WhatsApp* | 3 (2 when the header's filled button is "Send the X invoice", `lib/projects/next-step.ts:59-66`) | 1 page + 1 dialog | Marcus 1440: 21 controls in the body, 2 filled buttons ("Start the project", "Send") | that the stage's milestone is what makes it "ready" | 768: the Invoice and Next step columns are cut off (`shots/P3/money-benjamin-768-fold.png`); the header's filled button on Money is the project's next step (Share changes, Post an update…), not the money one |
| J1 + J2 (Designer → Owner) | Designer: Money → *Submit for approval* (Undo). Owner: bell → row → Money with the band → *Approve and send* → *Send via WhatsApp* | 2 + 4 | 2 people, 2 pages | the band has *Send back* + *Approve and send* | that approval is on (Settings › Projects › Invoices) | a designer who does not see the band later must open ⋮ for *Remind the approvers* |
| J3 owed | Money → read the story sentence, the Outstanding tile, the overdue band, the Payment schedule's Invoice column, *Invoices sent*'s Due / Status | 1 | 1 page, 5 places | — | the difference between Invoiced, Collected, Outstanding, "to confirm", "to credit", "unchecked" | the same S$ figure is repeated up to 11 times; the Money tab's badge counts *unpaid sent invoices* (`lib/projects/queries.ts:472`), not what needs doing — Marcus shows no badge with the deposit ready for 7 days; Ryan shows 2 when one is a payment to confirm and one is not yet due |
| J4 chase | overdue: Money → *Remind on WhatsApp* (band). Not yet overdue: Money → scroll → row ⋮ → *Remind on WhatsApp* | 2 / 3 | 1 page + WhatsApp | band: 2 buttons | — | no reminder is automatic (bell rows only, `lib/notifications/model.ts:116`) |
| J5 confirm | Money → *Confirm* in the "Ryan says they paid" band (or row) — proof: *See the bank's confirmation* opens the file viewer page, then Back | 2 (+2 to see the proof) | 1 page (+1 page) | band: proof link, *Not received*, *Confirm* | who confirms (Settings › Projects › Client payments) | the one payment is told 7 times: story sentence, Outstanding tile's help, band, the schedule row's tag *Payment to confirm*, *Invoices sent*'s tag, the *Payments* row *To confirm*, the Overview card's row — with two different labels for it |
| J6 record | overdue: Money → *Record a payment* (band) → dialog prefilled with what is owed, today, bank transfer → *Record payment*. Otherwise the row's Next step | 3 | 1 page + dialog | dialog: 6 fields, 1 required to touch | — | the receipt it makes lands in a third table (*Payments*), the invoice's status in two others |
| J7 VO | Money → New ▾ → *Variation order* (makes the Draft at once, opens the quote editor) → lines → Send ▾ → *Send for confirmation* → *Send via WhatsApp* → client approves on the link → the contract moves, unsent Drafts re-size by themselves; no unsent stage left → back on Money → *Bill it* → *Send* → *Send via WhatsApp* | ≈6 + lines (+3) | Money → editor → Money | New ▾ has 4 items, 2 of them VOs | that a VO is "a quote with minus lines for omissions"; that billing is automatic until the last stage is sent | "Bill VO-1 on its own" in the VO's ⋮ says it "takes it back from" the unsent invoices — a hard sentence; the billed VO then shows in *Other invoices* **and** *Invoices sent* |
| J8 one-off / recorded | Money → New ▾ → *One-off invoice* (reason chips, title, lines, GST switch, due chips, note) → *Save as Draft* → find it in *Other invoices* → *Send* → *Send via WhatsApp*. Recorded: New ▾ → *Record an invoice made elsewhere* → 7 fields → Save | 6 / 4 | 2 dialogs | one-off dialog: 4 chips + 3 fields + a line grid + 3 due chips | the "inside / outside the contract" idea | the one-off's own snackbar says "send it from Other invoices" — a table further down |
| J9 credit + refund | Money → scroll to *Invoices sent* → ⋮ → *Issue a credit note* → invoice preselected, amount, reason chip → *Issue the credit note*. Refund: scroll to *Credit notes* → *Record the refund* → *Record the refund* | 5 + typing; refund +2 | 1 page + 2 dialogs | ⋮ has 4–6 items | Owners / Admins only (`credit-notes.tsx:52`) | the "S$1,090.00 to refund" band says "Record the refund on its credit note" with no button (`project-money.tsx:655-660`); the credit-note page's *Issued* chip is green, the table's is blue (`credit-note-page.tsx:34` vs `credit-notes.tsx:89`) |
| J10 PO from quote | Money → scroll ~1,900px (1440) / ~4,400px (390) → *New cost* ▾ → *Purchase order* → Vendor (open + pick) → *Add from the quote* → tick each line → *Add n lines* → *Save and send* → *Send via WhatsApp* | 9 + n | 3 stacked overlays (1200 → 800 nested → send) | PO dialog: 11 controls besides the line grid (vendor, title, line ×5 fields, GST switch, 3 advance chips, 5 terms chips, delivery, address, note) | the vendor's name as entered in Finance › Vendors | the picker only marks lines already on *this* PO (`po-dialog.tsx:199-247`), not lines already ordered on another |
| J11 bill from PDF | Money → scroll → *New cost* ▾ → *Supplier bill* → drop / browse the PDF → reader fills vendor, number, days, amounts, lines, the PO when there is one → check → *Record the bill* | 5 + scroll | 1 dialog in 2 stages | each read field says "Read from the file — check it" | — | good today; only the distance to it |
| J12 expense on site | phone: swipe the tab strip to Money → scroll 5+ screens → "+" (*New cost*; the money "+" above looks the same) → *Expense* → amount, day, category, what it was for, who paid, receipts → Save | 4 + scroll | 1 sheet | 6 required / optional fields | — | two identical "+" buttons on the phone (`project-money.tsx:547`, `project-costs.tsx:63`); C opens only the money-in New (`data-kb="create"` only on the first) |
| J13 pay out | Money → scroll to Costs → *Pay* (band only when overdue; else the bill / PO row) → payout dialog → *Record the payment* | 3 + scroll | 1 dialog | — | Owners / Admins only | approvals and overdue bills sit ~2,400px down at 1440 |
| J14 profit | Overview Money card (*Profit · Early estimate S$ 67,883*), or Money → scroll to the second tile row of Costs | 0 / 1 + 2 screens (5.7 on a phone) | — | — | what "Early estimate", "Committed", "Cash so far" mean | Marcus (no costs): *Profit S$48,600.00*, the whole contract, with "No costs yet" under it (`project-profit.tsx:26`, `lib/finance/profit.ts:54`); the Overview row shows the early figure the same way (`project-overview.tsx:257`) |
| J15 split | Money → *Change the split* → template select, fee-first switch (only when Settings › Projects › Invoices allows it), rows of stage · share · milestone → *Save the split* | 3 | 1 dialog | — | that fee-first must be unlocked in Settings first | two switches for one idea (the studio permission, then the project's switch) |

---

## 3 · Load inventory per screen

### 3.1 The Money tab (Owner view)

| | Benjamin | Ryan | Aisha (on hold) | Marcus (starting) | Shalini (completed) |
|---|---|---|---|---|---|
| Page height 1440 / 390 | 3,273 / **7,222** | 3,433 / **7,992** | 2,901 / 6,078 | 2,285 / 3,994 | 3,101 / 6,674 |
| Phone screens to scroll | 8.6 | 9.5 | 7.2 | 4.7 | 7.9 |
| Stat tiles | 10 | 10 | 10 | 10 (8 read S$0.00 or "--") | 10 |
| Tables (each with its own help paragraph and column-settings button) | 8 | 8 | 8 | 7 (5 empty) | 9 |
| Bands (`role=status`) | 7 (2 of them duplicates) | 2 | 3 (1 duplicate) | 2 | 1 (the locked bar) |
| Filled buttons on the page | 5 (Share changes · Record a payment · Approve and send · Approve · Pay) | 3 | 2 | 2 | — |
| New buttons | 2 (*New*, *New cost*) | 2 | 2 | 2 | 0 |
| ⋮ buttons | 14 | 20 | — | — | — |
| S$ figures (all / different) | **57 / 17** | 60 / 36 | 38 / 15 | 24 / 8 | 49 / — |
| S$ figures in the first screen 1440 / 390 | 19 / 11 | 23 / 15 | — | 14 / 6 | — |
| Controls in the first screen's body 1440 / 390 | 23 / 2 | 23 / 3 | — | 21 / 4 | — |
| Words | ~950 | ~1,000 | — | — | — |
| Where Costs starts (1440 / 390) | 1,880 / 4,435 | 2,028 / 4,937 | 1,872 / 4,301 | 1,300 / 2,367 | — |
| Where Profit starts (1440 / 390) | 2,077 / 4,816 | 2,225 / 5,334 | 2,069 / 4,682 | 1,497 / 2,748 | — |

Shots: `money-<project>-{1440,390}-{fold,full}.png`, `money-benjamin-768-fold.png`, `money-benjamin-390-at-{stages,invoices,costs,profit}.png`.

**Order of the sections today** (`components/projects/money/project-money.tsx:564-694`, `components/finance/project-costs.tsx:55-121`):
title + New ▾ → story sentence → 4 tiles (Contract value · Invoiced · Collected · Outstanding) → money-in bands (up to 8 kinds:
unbilled VO, collection trailing, ready N days, awaiting approval, sent back, out of step, to credit, to refund) → payment bands (to
confirm, overdue) → **Payment schedule** → **Variation orders** (+ Deleted variation orders) → **Other invoices** → **Invoices sent** →
**Credit notes** → **Payments** → *Costs* title + New cost ▾ → 3 tiles (Committed · Paid · You owe) → 3 tiles (Profit · Margin · Cash so
far) → **What the numbers say** (up to 5 insight bands) → cost bands (vendor answered, PO awaiting, expense awaiting, bill overdue) →
**Purchase orders** → **Supplier bills** → **Expenses**.

**Repeated facts.** One invoice's life is spread over up to five tables: its stage row (Payment schedule), *Other invoices* (if
outside the stages), *Invoices sent* (every sent one — so a sent one-off or VO bill is in both: Ryan's XR-1042), *Payments* (its receipts)
and *Credit notes*. Plus the bands, the story sentence and the tiles. Insights repeat bands: *INV-2026-006 is overdue* (insight,
`lib/finance/profit.ts:139`) beside *INV-2026-006 is 7 days overdue* (payments band, `payments-section.tsx:161-174`); *A vendor is
waiting to be paid* (`profit.ts:144`) beside *AquaFlow's bill AF-7781 is overdue* (`project-costs.tsx:104-110`); *The Commencement
invoice has been ready for 21 days* (`profit.ts:158`, after 7 days) beside *Commencement invoice ready for 21 days* (`project-money.tsx:608-614`,
after 3 days) — two thresholds for one fact. The insights' *Open Money* links point at the page they are on (`profit.ts:132,140,150`).

**Status words on one tab — 42 labels across 7 kinds of record:** invoice 10 (Draft, Ready to send, Waiting for approval, Sent, Overdue,
Part paid, Paid, Void, Payment to confirm, Credited — `lib/projects/money.ts:168-172`), variation order 6 (`money.ts:498-504`), payment 4
(To confirm, Confirmed, Not received, Reversed — `payments-model.ts:29`), credit note 3, PO 10, bill 4, expense 5 (`lib/finance/model.ts:63-99`).
One fact has two names (*Payment to confirm* on the invoice, *To confirm* on the payment); *Approved* means three things (VO approved by
the client, VO approved internally but not sent, an expense approved).

**Jargon a studio person meets:** "Re-size them", "The unsent invoices don't add up to the contract — … out of step", "to credit",
"Bill VO-1 on its own — the unsent stage invoices carry it now", "Record an invoice made elsewhere", "Committed", "Cash so far",
"Early estimate — graded once costs pass a tenth of the contract", "Differs", "GST S$1,716.19 inside", "Outside the contract",
"Collection is trailing progress by n%". Each table opens with a help paragraph (8 of them) that is useful once and noise afterwards.

### 3.2 The Money tab for a Designer (from the code)

- Not on the team: one lock empty state (`project-money.tsx:181-189`) — clean.
- On the team: the same page minus the cost tiles, the profit tiles and *What the numbers say* (`project-costs.tsx:73-82`, books null for
  non-runners `lib/finance/books.ts:221-222`); *Submit for approval* instead of *Send*; the Costs half still shows its three tables and
  the PO-awaiting band ("Waiting for an Owner or an Admin"). So a designer still meets 4 tiles, 7–8 tables and the bands, while their
  everyday jobs are J1, J4, J5, J7, J10–J12.

### 3.3 Other screens

| Screen | What is on it | Load / gaps | Shot |
|---|---|---|---|
| Invoice page (studio) `/projects/[id]/invoices/[invoiceId]` | crumb, number + status chip + "stage · amount" chip, *Back to Money*, copy link, Download; a Draft adds *Send* / *Approve and send* / *Submit* (`invoice-page.tsx:50-52,87-90`); the paper with *How to pay* and the PayNow QR | **a sent, overdue invoice offers no action** — no *Record a payment*, *Remind*, *Issue a credit note*, *Void*; no payments or credit notes listed on it | `doc-invoice-studio-ben-inv006-1440.png`, `…-draft-completion-*.png` |
| Receipt page | *Back to Money*, copy link, Download, the paper | fine as paper; *Back to Money* lands on the tab, not on the invoice it belongs to | `doc-receipt-studio-ben-rct004-*.png` |
| Credit-note page | *Back to Money*, Download | green *Issued* chip vs the table's blue; *Refunded* not shown in the head | `doc-creditnote-studio-ben-cn002-*.png` |
| Public `/invoice/[token]`, `/receipt/[token]` | the paper, no sign-in | good — keep | `doc-*-public-*.png` |
| Overview › Money card | contract value; Variation orders · Invoiced · Collected · Outstanding · Profit · Payment to confirm rows; one row per stage with share · amount · status (`project-overview.tsx:237-272`) | **the best money summary in the product today** (9–11 figures, whole dollars, each row opens its place). Gaps: Profit "Early estimate S$ 67,883" reads as real; no row offers the next money action | `overview-ben-1440.png`, `overview-ryan-*.png` |
| Settings › Projects | 11 cards on one 5,137px page (7,088 on a phone); **4 are money**: Invoices (approval, fee-first permission, terms, INV numbering), Invoice paper, Credit notes (CN numbering), Client payments (who confirms, trust proofs, RCT numbering) — each with its own Discard / Save | money rules live in **five places**: these four cards, Settings › Finance (Costs: PO approval + limit, expense approval, vendor terms, PO numbering; Commission), Company › Profile (bank, PayNow, entities, the GST switch), Company › Templates › Payment schedules (splits), Settings › Quotes & pricing (the GST rate); **four numbering forms** (INV, RCT, CN, PO) | `settings-projects-*.png`, `settings-finance-1440.png` |
| Dialogs from Money | Send (WhatsApp, prefilled, "Before it goes" notes) · Change the amount · Description, note and due day · One-off invoice · Record an invoice made elsewhere · Payment split · VO from a contractor's quote · Mark as approved by the client · Void · Send back · Record a payment · Not received · Reverse · Issue a credit note · Void the credit note · Record the refund · Deleted variation orders; Costs: PO (+ nested *Add from the quote*) · send PO · mark accepted · Supplier bill · Expense · Pay · the record panel · 6 reason dialogs | ~30 overlays — each is well made and on the house pieces; the load is in how many places open them, not in the dialogs | `ben-*-dialog-1440.png`, `marcus-send-dialog-*.png`, `marcus-split-dialog-1440.png`, `ryan-po-panel-*.png` |
| Row menus | stage row ⋮ (sent, owed): Open the invoice · Record a payment · Remind on WhatsApp · Copy the invoice link · Issue a credit note · Void; VO ⋮: Preview · Bill on its own · Mark as approved; payment ⋮: Open the receipt · Copy link · See proof · Confirm · Not received · Reverse; PO ⋮: up to 13 items | every refusal is said in the row (help line) — good | `ben-stage-row-menu-mid-1440.png`, `ryan-*-menu-1440.png` |
| Client portal › Money (`components/portal/money/portal-money.tsx`) | **one list of stages** — paid ones as a line with *Receipt* and *Credit note* links, the due one as a tinted block with *I have paid*, planned ones with "When … is done"; *Paid so far* bar | the model the studio side lacks: one row per stage carrying its documents | (read in code, not opened) |

---

## 4 · Feature inventory (what the redesign must keep)

"Today" names where it lives; "Proposed" names where it goes in §6. **Nothing is removed**; rows marked *same* stay as they are.

| # | Capability | Who | Today | Proposed |
|---|---|---|---|---|
| F1 | The tab only for the project's team, their Managers, Owners, Admins; lock state otherwise | — | `project-money.tsx:181-189` | same |
| F2 | Contract value = base (signed quote / agreed) + approved VOs, its make-up | team | tile + help | Collect tile's help + Billing head |
| F3 | Invoiced / Collected / Outstanding / overdue / to confirm / unchecked (trusted proofs) / left to invoice / outside the contract | team | 4 tiles + help + story | Collect tile (owed now, overdue red, progress bar collected-of-contract, next invoice line); the rest in its help |
| F4 | The story sentence (`moneyStory`) | team | top of tab | its facts become Needs you rows + the Collect tile; the sentence can stay as the tile's one line if wanted |
| F5 | Payment schedule from the signed quote / the project's split, shares, fixed fee first, GST inside, milestone readiness | team | Payment schedule table | Billing list (the spine) |
| F6 | Stage invoice states, *Ready to send* when the milestone is done (or begun), ready-since | team | table tags + bands | row status + Needs you row (one threshold) |
| F7 | Send (WhatsApp, prefilled message, portal link or no-login link + bank / PayNow, number named before it goes, `?open=…&send=1`) | Owner/Admin; team when approval off | Send dialog | same dialog, opened from the row, the panel, Needs you, the Overview card |
| F8 | Submit for approval · approve and send · send back with a note · take the submission back · remind the approvers (once an hour) | as today | bands + ⋮ | Needs you row + the panel's actions / ⋮ |
| F9 | Change a Draft's amount with a reason ("Differs"), rebalance the other Drafts with Undo; *Re-size them* when out of step | team | ⋮ + band | panel ⋮ + Needs you row |
| F10 | A Draft's description, note to the client, due day (terms · a day · handover day) | team | ⋮ dialog | panel ⋮ (same dialog) |
| F11 | Void a sent invoice with a reason; a fresh Draft takes its share; voided ones stay on record ("Replaces INV-…") | Owner/Admin | ⋮ | panel ⋮; voided ones as faint sub-rows of their stage |
| F12 | Copy the invoice's no-login link | team | ⋮ | panel docs row |
| F13 | One-off invoices (reason, lines, GST switch, due), edit while Draft, remove Draft with Undo | team | New ▾ + *Other invoices* | New ▾ (Billing group) + Billing list's "Outside the stages" group |
| F14 | Record an invoice made elsewhere (for a stage or outside), its file | team | New ▾ + *Other invoices* | same entry; rows in Billing |
| F15 | Payment split for a project with no signed quote (template, fee-first switch when allowed, milestone per stage) | team | *Change the split* | Billing head link (same dialog) |
| F16 | Variation orders: blank (opens the quote editor), from a contractor's quote (XLSX/CSV/PDF/photo read), from a client's choice (Choices tab), omit picker in the editor | team | New ▾ + VO table | New ▾ + a *Changes to the contract* sub-list under Billing |
| F17 | VO states (draft, waiting for approval, approved not sent, with the client, change asked, declined, approved) with who/when/how | team | VO table | sub-list rows, same words |
| F18 | Mark as approved by the client (in person / WhatsApp / email / paper) with Undo | Owner/Admin | VO ⋮ | same |
| F19 | Approved VO re-sizes unsent Drafts; with none left, *Bill it* / *Bill on its own* | team | VO row + band | VO row + Needs you row |
| F20 | Deleted variation orders sheet (restore / delete forever / empty) | as today | link on VO table | the sub-list's ⋮ |
| F21 | Record a payment (amount prefilled, day, method, reference, note, proof) → confirmed + numbered receipt, Undo | team | band / row / ⋮ | row Next step, panel, Needs you |
| F22 | Client's *I have paid* from the portal → *To confirm*; Confirm / Not received (reason the client reads) / see proof; trusted proofs count at once | confirmers | band + Payments table | Needs you row + the invoice panel's payment lines |
| F23 | Reverse a confirmed payment (reason, receipt reads Reversed), Undo | Owner/Admin | Payments ⋮ | panel payment line ⋮ |
| F24 | Receipts: page, no-login link, Download | team | Payments table | panel payment lines + the receipt page |
| F25 | Remind on WhatsApp (message drafted, logged on Activity, "Reminded 2× · last 6 Oct") | team | band + ⋮ | Needs you row (overdue) + panel |
| F26 | Overdue age, sent age, due age lines | team | Invoices sent | row sub-line + panel facts |
| F27 | Collection trailing progress by ≥ 30 points | team | band | Needs you row |
| F28 | Credit notes: issue (against an invoice, amount ≤ left, reason chips), void (reason), refund (amount, day, method, reference), Undo; "S$x to credit" and "S$x to refund" bands | Owner/Admin issue; team reads | ⋮ + band + table | panel actions + Needs you rows (with their buttons) + credit lines inside the invoice panel / row sub-line |
| F29 | Credit-note page and its portal twin | — | page | same |
| F30 | `?open=<invoice|payment|credit|po|bill|expense>` from bell, Activity, search (`moneyNumberHits`, `money-visibility.ts:74-93`) | — | scroll + light the row | scroll + light the row **and open its panel** |
| F31 | The C key opens New | — | money New only | the one New ▾ |
| F32 | Completed project: agreed money read-only, payments open, the bar names Reopen | — | `locked` | same |
| F33 | Costs: PO (vendor, lines, *Add from the quote* with the vendor's lines first, GST, advance, terms, delivery, note), Save as Draft / Save and send / submit when over the limit or with an advance | team prepares; Owner/Admin approve | New cost ▾ + PO table + panel | New ▾ (Costs group) + Costs list + same panel |
| F34 | PO life: send on WhatsApp with an accept link, vendor answers (accept / changes / decline), mark accepted, resend, record a bill on it, pay, close short, cancel, duplicate, remove Draft, history, *against the quote* margin (Owner/Admin) | as today | PO table + panel | Costs list + same panel |
| F35 | Supplier bill: PDF read for you, vendor matched, PO picked, lines, file, edit / remove while unpaid, duplicate check | team (project); Owner/Admin (overhead) | New cost + Bills table + panel | same entries; bill rows (on a PO: inside the PO's row and panel) |
| F36 | Expense / claim: amount, day, category, vendor, who paid, receipts read, approval for designers, pay back | anyone logs; Owner/Admin approve / pay | New cost + Expenses table + panel | same |
| F37 | Pay out (PO, bill, claim), reverse a payout | Owner/Admin | panel / band | panel / Needs you |
| F38 | Cost tiles Committed · Paid · You owe (overdue, claims) | Owner/Admin | tiles | Pay tile |
| F39 | Profit · Margin (Healthy / Tight / At risk, early estimate, no costs) · Cash so far | Owner/Admin | 3 tiles | Profit tile (margin word as its chip, cash as its line) |
| F40 | *What the numbers say* insights (loss, at risk, tight, PO over quote, studio funding, VOs > 10%, overdue, bills overdue, ready long, no costs) | Owner/Admin | 5 bands + "n more" | the non-duplicates become Needs you rows; the full list stays in Company › Reports › Finance |
| F41 | Column settings, sideways scroll, frozen first column on every table | — | 8 tables | 2 tables (same model) |
| F42 | Settings: invoice approval, fee-first permission, terms, INV / RCT / CN / PO numbering, invoice paper (header note, terms, footer, bank details, paid and balance), who confirms + trust proofs, PO approval + limit, expense approval, vendor terms, commission | Owner/Admin | Settings › Projects (4 cards) + Settings › Finance | one money module (§6.7) — same controls |
| F43 | The Overview's Money card | team | Overview | same, + the next money action |
| F44 | Ghost loaders that match the page (`money-ghost.tsx`, `useRememberShape`) | — | Money | redrawn for the new regions |
| F45 | Every step answers with a sentence and Undo; every refusal says the rule in the row | — | everywhere | same |

---

## 5 · Problems, ranked by the load they put on a studio person

1. **Everything at once, nothing first.** One tab, two halves, 8–9 tables, 10 tiles, up to 7 bands, ~950–1,000 words, 7,222–7,992px on a
   phone (8.6–9.5 screens). The two figures an owner asks for first — *what the client owes* and *are we making money* — sit at the
   top (tiles) and **5.7 phone screens down** (profit). Nothing is behind progressive disclosure: every table renders with its
   paragraph even when empty (Marcus: 5 empty tables, 8 zero tiles).
2. **The same fact, told 5 to 11 times.** S$20,784.94 ×11 on Benjamin's tab; INV-2026-002 ×7 on Ryan's; a client's payment to confirm
   in 7 places with two names. The reader cannot tell whether two lines are two things or one.
3. **One invoice, five tables.** Payment schedule, Other invoices, Invoices sent, Payments, Credit notes are views of one record's life;
   *Invoices sent* duplicates the schedule's Invoice column (and *Other invoices* for sent one-offs). An admin reconciling must
   cross-read three tables to answer "is INV-2026-004 settled, and how?".
4. **Three stacks of alerts, in three places, with duplicates and self-links.** Money-in bands, payment bands and cost bands sit at
   three heights; *What the numbers say* repeats three of them and links "Open Money" to the page it is on. Two thresholds for one
   fact (ready 3 days vs 7 days).
5. **Too many filled buttons, two New buttons.** Benjamin: 5 filled buttons, one of them the project's unrelated next step in the
   header; *New* and *New cost* split 7 creations in two menus 1,900px apart; on a phone both are an identical "+"; C opens only one.
6. **Two record models.** An invoice opens a full page that, once sent, offers no step (no Record a payment, Remind, Credit note,
   Void); a PO / bill / expense opens a side panel with its facts, lines, payments, history and steps. Receipts and credit notes are
   pages whose Back leaves the invoice behind.
7. **The tab's badge counts the wrong thing.** It counts unpaid sent invoices (`queries.ts:472`), not what waits on this viewer — a
   deposit ready for 7 days shows nothing; approvals, payments to confirm, POs and expenses waiting never show.
8. **Profit that is not a profit.** With no or few costs the Profit tile and the Overview row show the contract (Marcus S$48,600.00) or
   nearly (Benjamin S$67,883) beside "No costs yet" / "Early estimate" — a big green-looking number an owner will repeat to a client.
9. **Status vocabulary.** 42 labels on one tab; one fact with two names; *Approved* with three meanings; the credit note's chip in two
   colours.
10. **Words.** Re-size, out of step, carry, to credit, on its own, made elsewhere, committed, cash so far, early estimate, differs,
    inside — each correct, together a ledger's language. Eight help paragraphs.
11. **Tablet.** At 768 the schedule's Invoice and Next step columns are off-screen in the sideways scroll — the main button is hidden.
12. **Phone.** Money is the 5th tab in a scrolled strip; stage cards are ~250px each as key · value lists; Costs start 5.3 screens down;
    the first action on Benjamin's tab sits just below the fold (2 controls in the first screen).
13. **Settings in five places, four numbering forms.** Setting up "how my studio bills and pays" means Settings › Projects (4 cards, 4
    Saves), Settings › Finance, Company › Profile, Company › Templates › Payment schedules and Settings › Quotes & pricing; fee-first
    needs a studio switch before the project's switch appears.
14. **The refund band has no button** — its step is ~1,000px lower in the Credit notes table.
15. **Ordering from the quote does not know what is already ordered.** The picker greys lines on *this* PO only; an owner cannot see
    which quote lines have no PO yet.

---

## 6 · Proposal — the simplest money experience on a project

### 6.1 Rules the redesign follows

- **One fact, once.** Each fact is told in one place on the page; other places link to it.
- **To-dos first, then the numbers, then the records.**
- **One list per direction, one panel per record.** *Billing* (money from the client) and *Costs* (money to vendors and the team) share
  one row grammar; every record opens the same side panel (`CostPanel` on the house `Drawer`, a bottom sheet on a phone).
- **One New.** Every creation from one New ▾, grouped.
- **The role shapes the page by its data, not by a switch.** A designer gets fewer tiles and fewer to-dos because the server already
  hands them less (`seesCostFigures`, `fetchProjectBooks`); no new toggle.
- **No rule changes for the core proposal.** `moneyOf` / `costsOf` / `profitOf` and every action stay; this is presentation. Options
  that would change a rule or add a capability are marked **(option)** and listed in §6.10.

### 6.2 The Money tab at 1440 — region by region

**Region 1 · Head (one row).** "Money" (h2) left. Right: one **New ▾** (outlined primary, as today; C opens it). The menu has two
groups with the house `DropdownLabel` + `DropdownDivider` (both exist in `components/leads/dropdown.tsx:162-168`):
*Bill {client}* — Variation order · Variation order from a contractor's quote · One-off invoice · Record an invoice made elsewhere;
*Costs* — Purchase order · Supplier bill · Expense. Each keeps today's help line and is filtered by who may (today's `viewer.prepares`,
`can.po / bill / expense`). *(Words of the group labels: Vicky's call.)*

**Region 2 · Needs you** (only when something waits; else nothing renders). One list of the house banner rows
(`money.module.css .banner`, the tones they use today), **worst first, 3 shown + "Show n more"** (the Overview AI brief's *Show more*).
Its rows come from today's sources, merged and de-duplicated by the record they are about:

| Row (today's source) | Its button(s) for whoever acts | Others read |
|---|---|---|
| A client's payment to confirm (`payments-section.tsx:145-160`) | See proof (opens in the panel) · Not received · **Confirm** | "Waiting for Michelle to confirm" |
| An invoice overdue (payments band; replaces the *overdue* insight) | Remind on WhatsApp · **Record a payment** | — |
| An invoice waiting for approval / sent back | Send back · **Approve and send** / Change the amount · **Send** | "Waiting for an Owner or an Admin" · Remind them |
| A stage invoice ready (**one threshold**: from the day it is ready, not 3 or 7 days later) | **Send** / **Submit for approval** | — |
| An approved VO with no unsent stage to carry it | **Bill VO-n** | — |
| Unsent invoices out of step with the contract | **Re-size them** | — |
| S$x to credit / **S$x to refund** | **Issue a credit note** / **Record the refund** (new on this row; the same `RefundDialog`) | — |
| Collection trailing progress | the next invoice's step | — |
| A vendor answered a PO (changes / declined) | **Change it** | — |
| A PO / an expense waiting for approval | **Approve and send** / **Approve** (Send back in the row's ⋮) | "Waiting for an Owner or an Admin" |
| A bill overdue (replaces *A vendor is waiting to be paid*) | **Pay** | — |
| Owner-only insights that are not duplicates: costs above the contract, margin at risk / tight, a PO above what the client pays for its lines, the studio funding the project, VOs > 10% of the contract | **Open** the record / the Costs list (never "Open Money") | — |

The row model is the one Company › Finance › Overview already uses for *Money to verify* and *Stuck*
(`components/finance/books/overview-view.tsx:38-72`) — the project's list is that list, scoped to the project and widened to money in.
**The Money tab's badge = the number of rows here for this viewer** (replaces `queries.ts:472`).

**Region 3 · Collect · Pay · Profit** (house `StatTiles`, 3 across; a designer sees Collect alone, or Collect + Contract).

| Tile | Value | Line under it | Help on hover (today's facts) |
|---|---|---|---|
| **To collect** | outstanding, red when part is overdue | a thin bar "S$27,713 collected of S$69,283" (the portal's `PaidSoFar` bar, `portal-money.tsx:118-128`) + "Next: Completion S$20,785 — when Handover & defect check is done" | contract = signed + VOs · invoiced · left to invoice · outside the contract · to confirm · unchecked |
| **To pay** (Owners/Admins) | you owe, red when overdue | "S$1,400 overdue · S$5,530 waiting approval" | committed · paid · claims |
| **Profit** (Owners/Admins) | profit, **"--" until costs pass the early-estimate line** (today's Margin rule extended to the figure) | margin word as the tile's chip (Healthy / Tight / At risk / Early estimate / No costs yet) · "Cash so far S$27,713" | how profit is worked out, cash in − out |

The story sentence goes: its parts are in Needs you and in the Collect tile's two lines. Pressing a tile scrolls to its list.

**Region 4 · Billing** (the house table on the listing's model — `CreditsTable`, sticky head, frozen first column, column settings,
`?open=` lighting — one table instead of five).
- Rows: the **payment stages in order** (the spine), then a group row *Outside the stages* (VO billed on its own, one-offs, recorded
  invoices). Voided invoices sit as faint sub-rows under the stage they belonged to ("INV-2026-00x · Void — {reason}").
- Columns (6): **Stage** (name; milestone + its state as the sub-line) · **Amount** (amount; "30% · GST S$1,716 inside" as sub; the
  *Differs* chip) · **Invoice** (status chip; "INV-2026-006 · sent 25 Sep · due 2 Oct · 7 days overdue · reminded 2×" as sub — the
  merged facts of *Invoices sent*) · **Paid** (paid amount; "RCT-2026-004 · S$1,090 credited" as sub — the merged facts of *Payments*
  and *Credit notes*) · **Next step** (one text button) · ⋮ (today's menu, unchanged).
- The head keeps *Change the split* (projects with a split) and the source line in one sentence ("From OM-10005's Payment Schedule").
- Pressing a row opens the **invoice panel** (§6.4); the invoice number still links to the printable page.
- Under it, **Changes to the contract** — the VOs as a compact sub-list (VO-n · title · ±amount · status chip with who / when · *Open* or
  *Bill it* · ⋮ with Preview, Bill on its own, Mark as approved, Deleted variation orders). Hidden when there are none and nothing was
  deleted; New ▾ makes the first.
- For the admin who reconciles: a house `Chips` row in the head — **All · Invoices · Payments · Credit notes** — switches the table to
  today's Payments or Credit notes columns, so those two lists remain as views of the same table, not as separate tables. *(option —
  keeps F22–F24, F28 as lists if Vicky wants them listed; otherwise they live only in the panel and the row's sub-line)*

**Region 5 · Costs** (one house table). Rows: POs, bills not on a PO, expenses — newest first; a **Kind** column (PO · Bill · Expense)
and a house `Chips` filter (All · Purchase orders · Bills · Expenses). A bill on a PO is the PO's money: it shows in the PO row's sub-line
("Bill WC-2391 · S$7,630") and in its panel, not as a second row. Columns: What (number / vendor / description) · Kind · Amount · Paid ·
Status · Next step · ⋮. Pressing a row opens today's `CostPanel` (`components/finance/cost-panel.tsx`) — unchanged. Empty: one line
"No costs yet — order from the quote, record a bill or log an expense" with the three as buttons (the first-run rule, REG-735).

**What leaves the tab:** the *What the numbers say* block (its non-duplicates are Needs you rows; the full rule list stays where every
report lives, Company › Reports › Finance); the eight table help paragraphs (each table's rule goes to its head's one-line sub, or the
`HelpLink` the setup pages use); the four-tile + three-tile + three-tile rows.

**Benjamin's tab after:** Needs you 6 rows (3 shown) · 3 tiles · Billing 4 stage rows + VO sub-list (empty → hidden) · Costs 3 rows.
Figures in the first screen ≈ 10 (from 19). *(estimate from the row counts, not measured)*

### 6.3 The Money tab at 390 (and 768)

- **Head:** "Money" + one "+" (New sheet, the same two groups). The second "+" is gone.
- **Needs you:** cards, 2 shown + "Show n more"; each with its one filled button — the first action sits in the first screen.
- **Summary:** *To collect* full width (value, bar, next line); *To pay* · *Profit* side by side under it (owners).
- **One list at a time:** a two-chip switch (house `Chips`, single) **Billing · Costs** above the list, remembered per browser like the
  listing's view (`om.*`). *(At 1440 both lists show; the switch is a phone affordance.)*
- **Rows as short cards** (the listing's phone cards, `components/leads/lead-cards.tsx` model): line 1 stage · amount; line 2 status
  chip + "due 2 Oct · 7 days overdue"; line 3 the Next step button + ⋮. ≈110px instead of ≈250px (today's key · value cards).
- Tap a row → the record panel as a bottom sheet (the house Drawer already is one on a phone).
- Benjamin at 390: ≈ 2 phone screens for Needs you + summary + Billing, instead of 8.6 for everything. *(estimate)*
- **768:** the Billing table keeps Stage · Amount · Invoice · Next step inside the width — Milestone and GST live in sub-lines, so the
  action is never in the sideways scroll.

### 6.4 One record panel for every money record

Give invoices the panel PO / bill / expense already have (`CostPanel`: status, note, facts, lines, totals, docs, payments, history,
actions, ⋮). For an invoice:

- **Title** "INV-2026-006 · Mid-Project"; **status** chip; **note** = the sent-back note, the void reason, the *Differs* reason.
- **Facts:** stage and share ("30% of S$69,283.13 when issued"), milestone, sent by / when (and viewed), due + age, reminded n× / last.
- **Totals:** amount, GST inside, credited, paid, **to pay**.
- **Docs:** the paper (Preview · Download PDF · Copy the no-login link).
- **Payments:** each payment with its receipt number, method · reference, status (To confirm / Confirmed / Not received / Reversed) and
  its ⋮ (See the bank's confirmation — opens in place, Confirm, Not received, Reverse, Open the receipt, Copy the receipt link).
- **Credit notes:** number, reason, amount, refund line, its ⋮ (Open, Record the refund, Void).
- **History:** the invoice's Activity lines (made, submitted, sent back, approved and sent, reminded, paid, credited).
- **Actions** (first filled): the one next step — Send / Submit / Approve and send / Record a payment — then Remind on WhatsApp · Issue
  a credit note; **⋮**: Change the amount · Description, note and due day · Edit (one-off) · Remove the Draft · Send back · Take the
  submission back · Remind the approvers · Void — each refusal in its help line, as today.

`?open=<invoice|payment|credit>` (bell, Activity, search) lights the row **and opens this panel** on the right line. The printable
pages (invoice, receipt, credit note) stay for print, Download and the client; their *Back to Money* returns to the panel they came
from (`?open=`), and the sent invoice's page head gains the same next step (*Record a payment*) so the page is never a dead end.

### 6.5 The jobs after

| Job | Today | Proposed | What changed |
|---|---|---|---|
| J1 send the next invoice | 3 | **3** (Money → Needs you *Send* → *Send via WhatsApp*); **2** from the Overview card's row | always first on the page; never in the sideways scroll |
| J2 approve a designer's invoice | 4 (bell → … ) | 4; the row is first on Money and in the badge | — |
| J3 who owes | 1 page, 5 places | 1 tile + its overdue row | one place |
| J4 chase | 2 / 3 | 2 (Needs you) / 3 (row ⋮ or panel) | — |
| J5 confirm | 2 (+2 for proof on another page) | 2 (proof opens in the panel) | proof without leaving |
| J6 record a payment | 3 | 3 | the receipt shows on the invoice's row and panel |
| J7 VO + bill | ≈6 + lines (+3) | same (the editor is right); *Bill VO-n* arrives as a Needs you row | no hunting for the row |
| J8 one-off | 6 | 6; the Draft appears in Billing's *Outside the stages* where the snackbar now points | — |
| J9 credit + refund | 5 + typing (+2, far below) | **4** (row → panel → *Issue a credit note* → *Issue*); refund **2** from its Needs you row | the refund band gets its button |
| J10 PO from the quote | 9 + n after 1,900px / 5.3 screens of scroll | **8 + n, no scroll** (New ▾ at the top) | (option) *Order from the quote*, §6.8 |
| J11 bill from PDF | 5 after scroll | **4, no scroll**; (option) drop the PDF on the tab | — |
| J12 expense on a phone | 4 + 5 screens | **3** (+ → Expense → Save) | one "+" |
| J13 pay out | 3 + scroll | 3 from Needs you or Costs | — |
| J14 see profit | 0 (misleading) / 2–5.7 screens | **0**, honest: the Profit tile is the summary's third | "--" until it means something |
| J15 split | 3 | 3 | — |

### 6.6 The Overview's Money card

Keep it — it is already the simplest money view in the product (`project-overview.tsx:237-272`). Two changes: the **Profit** row reads
"--" with *Early estimate* / *No costs yet* until graded (same rule as the tile); and the card offers **the next money action** as a row
button when there is one ("Send the Completion invoice", "Confirm Ryan's S$13,370 payment") — the first Needs you row for this viewer.

### 6.7 Settings: one home for money rules

- Move the four money cards — **Invoices · Invoice paper · Client payments · Credit notes** — from Settings › Projects to the module that
  already holds **Costs** and **Commission** (Settings › Finance). Settings › Projects drops from 11 cards (5,137px) to 7.
- One **Document numbers** card: a row per document — Invoices INV · Receipts RCT · Credit notes CN · Purchase orders PO — each with
  prefix, next, digits, year switch, the "Next: INV-2026-010" preview; **one Save**. Replaces four numbering blocks and four Saves.
- The module head's *Kept in Company:* links (the pattern every Settings module head already has — `app/settings/settings-ghost.tsx:24`, `studio-settings.tsx:19`) name Profile (bank, PayNow, entities, GST
  switch) and Templates › Payment schedules — so "where do I set how we bill?" has one starting point.
- Fee-first: show the project's *fixed fee first* switch in the split dialog with the studio switch's state as its help, rather than
  hiding it until the studio switch is on. **(rule question, §6.10)**

### 6.8 What becomes automatic (or one press)

- **One readiness rule**: a ready invoice is a Needs you row from the day it is ready (today a band after 3 days and an insight after 7).
- **The badge** tells what waits on this viewer, everywhere the project's tabs show.
- **(option) Order from the quote:** the signed quote's lines already carry *Vendor/Sub* (`quote_items.vendor`, REG-623); *New ▾ › Order
  from the quote* lists them by vendor with what is already on a PO, and makes one Draft PO per ticked vendor through today's `savePo`.
  The PO dialog's *Add from the quote* stays.
- **(option) Drop a bill's PDF anywhere on Money** → the Supplier bill dialog opens reading it (the Files tab's drop pattern).
- **(option) A planned margin from day one** from the signed quote's own line costs (the quote editor's Cost column), shown as the Profit
  tile's line until real costs pass the early-estimate line.
- **(option) A reminder on the due day** through the delivery layer (`lib/portal/client-tells.ts`) — a new client message; today only
  *Remind on WhatsApp* by hand.

### 6.9 Words *(all Vicky's call — candidates, not decisions)*

| Today | Candidate |
|---|---|
| *Payment to confirm* (invoice) / *To confirm* (payment) | one label: **To confirm** |
| Re-size them · out of step | "The unsent invoices don't add up to the contract — **Even them out**" |
| S$x to credit | "S$x billed above the contract — **give it back with a credit note**" |
| Bill VO-1 on its own | "**Bill VO-1 now**, not with the next stage" |
| Record an invoice made elsewhere | "**Add an invoice from Xero or paper**" |
| Committed · Cash so far | **Ordered** · **Cash in hand** |
| GST S$1,716.19 inside | "incl. S$1,716.19 GST" (the PO and expense tables' own words, `cost-tables.tsx:83,152`) |
| *Approved* (VO) / *Approved — not sent* / *Approved* (expense) | VO: **Client approved** · **Approved, not sent** |
| Credit note *Issued* green on the page, blue in the table | one colour |

### 6.10 Questions for Vicky (rule or scope changes in this proposal)

1. **Billing as one table** — fold *Invoices sent*, *Other invoices*, *Payments* and *Credit notes* into the stage rows + the panel (with
   the optional All · Invoices · Payments · Credit notes chips), or keep Payments / Credit notes as their own lists?
2. **Costs under Billing or beside it** — F1-Q1 placed the Costs half "under money in"; this keeps that order at 1440 and adds the
   Billing · Costs switch on a phone. Both lists always, or the switch at every width?
3. **Insights off the Money tab** (F2-Q3 put them there) — non-duplicates as Needs you rows; the full list in Reports.
4. **Profit "--" until graded** (and the Overview row the same), or a planned margin from the quote's costs (option §6.8)?
5. **Settings** — the four money cards to Settings › Finance, and one Document numbers card?
6. **Fee-first** — show the project switch always (help names the studio rule), or keep the two-step gate?
7. **Options in §6.8** — order from the quote by vendor; drop a bill PDF on the tab; due-day reminder; planned margin.
8. The words in §6.9.

### 6.11 Keep exactly as it is

- The **Send dialog** (WhatsApp prefilled, the number named before it goes, *Before it goes* notes, portal link or no-login link + bank
  and PayNow) — `components/contracts/editor/dialogs.tsx` as used at `project-money.tsx:697-705`.
- **Record a payment** prefilled with what is owed, today and bank transfer — 1 press to save.
- The **Supplier bill reader** ("Read from the file — check it" per field, the PO picked when there is one).
- **Add from the quote** with the vendor's own lines first.
- **`CostPanel`** — it becomes everyone's panel.
- The **refusal in the row** (help lines), **Undo** on every step, the *couldn't … — rule* snackbars.
- The **Overview Money card**, the **client portal's Money page** (one list per stage, documents inline — the model the studio side
  should copy), the invoice paper with **PayNow QR**, the public `/invoice` · `/receipt` pages.
- **One set of numbers** (`moneyOf`, `costsOf`, `profitOf`) — nothing here recomputes.

### 6.12 House pieces it is built from

`StatTile` / `StatTiles` (`components/om/stat-tile.tsx`) · `CreditsTable` on the listing's model (two tables) · `PortalMenu` +
`DropdownItem` + `DropdownLabel` + `DropdownDivider` (the grouped New ▾) · the banner rows of `money.module.css` (Needs you) · `Chips`
single (Billing · Costs on a phone; Kind filter; the Billing view chips) · `CostPanel` on `Drawer` (every record) · the portal's
`PaidSoFar` bar · `EmptyState` / `EmptyAction` · the listing's phone cards · `Tooltip` for the tiles' help.

### 6.13 What a build must carry along (so nothing breaks)

- `?open=` targets (`data-invoice`, `data-payment`, `data-credit`, `data-po`, `data-bill`, `data-expense`) and `&send=1`
  (`project-money.tsx:157-179`, `payments-section.tsx:87-95`, `project-costs.tsx:31-40`), the `#costs` anchor the insights use, the
  search hits (`money-visibility.ts:74-93`).
- `data-testid`s read by the probes `design-source/verify/projects/verify-pj-r5.cjs`, `verify-pj-r6.cjs`, `verify-pj-gap-b.cjs`,
  `verify-pj-gap-f1.cjs`, `verify-pj-gap-f2.cjs` (the regression set in `design-source/verify/regression/probes.cjs`).
- The Money ghost (`components/projects/money/money-ghost.tsx`) and its `useRememberShape` key (`project-money.tsx:153`).
- `data-kb="create"` on the one New ▾; the panel's keyboard (Escape, focus back to the row).
- REGs and calls this touches: F-01, F-19 and F1-Q1 (where money and Costs live), F2-Q3 (insights on Money), REG-1067 (the rebalance
  sentence), REG-1069 / REG-1022 (completed: read-only), REG-1000 (deleted VOs), REG-534 (WhatsApp opens on the press), REG-735 (empty
  states carry their buttons).

---

*Screens: `scratchpad/simplify/shots/P3/`. Measurement scripts: `scratchpad/simplify/p3/` (`shots1.cjs` page counts, `pos.cjs` section
positions, `dups.cjs` repeated figures, `fold.cjs` first-screen counts, `shots3.cjs` menus and dialogs).*
