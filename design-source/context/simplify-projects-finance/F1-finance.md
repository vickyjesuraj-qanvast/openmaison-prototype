# F1 — The studio's Finance: simplify study (2026-10-09)

**Area.** Company › Finance (`/company/finance/*`: Overview · Purchase orders · Bills · Expenses · Payments out · Vendors · Commissions ·
Accounting), Company › Reports › Finance (the eight money reports), Settings › Finance (Costs · Commission), Company › Integrations' Xero
card, the vendor's no-login PO link `/po/[token]`, and where all of this meets a project's **Money** tab.

**How it was looked at.** The production build on :3011 over the scratch copy (`scratchpad/simplify/a.db`), signed in as Dane (Owner), at
1440×1024 and 390×844 (touch). Every list, row menu, panel and dialog was opened and closed with Escape; nothing was saved (the PO, bill,
expense, payment and commission counts were the same after the run). Other roles were read from the code (`lib/finance/rules.ts`,
`lib/finance/sections.ts`, `lib/finance/queries.ts`, `lib/finance/books.ts`). Screenshots: `scratchpad/simplify/shots/F1/` (named below
in *italics*); the measured counts are in `scratchpad/simplify/shots/f1-measure.json`.

**Who may do what (today, from the code).**

| | Owner · Admin (`runsStudio`) | Manager | Designer |
|---|---|---|---|
| Finance tabs (`sections.ts:13-34`) | all 8; lands on **Overview** | 5: POs · Bills · Expenses · Vendors · Commissions; lands on **Purchase orders** | same as Manager |
| Records listed (`queries.ts:224-246`) | every project's + the studio's overhead | their projects + their team's (`worksOn`) + their own overhead expenses | their projects + their own overhead expenses |
| Figures (Committed · Owed · margins, `rules.ts` `seesCostFigures`) | yes | no | no |
| Prepare a PO · record a project bill · log an expense | yes | on projects they work on / oversee | on projects they work on |
| Approve a PO or an expense · pay anything · change a vendor · see bank details · cost rules | yes | no | no |
| Commission | everyone's; set rules, pay, answer asks | their own; ask for a rate | their own; ask for a rate |
| Reports › Finance · Accounting (Xero) | yes | gate | gate |

There is no Accounting role (F2-Q14 / F-16): the Owner or an Admin is the bookkeeper.

---

## 1. Jobs to be done

What people come to the studio's money for, in their words. Frequencies are a 5–20-person Singapore studio running ~10–30 projects; the
demo has 5.

| # | The job, in their words | Who | How often | Device |
|---|---|---|---|---|
| J1 | "Germaine's tiling PO is over the limit — check it and let it go to the tiler" (approve and send a PO) | Owner / Admin | 2–5× a week | phone or laptop |
| J2 | "Approve Germaine's Grab claim and pay her back" (approve, then reimburse a claim) | Owner / Admin | weekly | laptop |
| J3 | "Pay the plumber — his bill is due" (pay a supplier bill or a PO's advance / balance) | Admin (Owner) | weekly, batched | laptop + bank app |
| J4 | "Who still owes us money? Chase Ryan" (find overdue client invoices and remind) | Owner / Admin | weekly | laptop or phone |
| J5 | "Ryan says he paid — is it in the bank?" (confirm a client's payment) | Admin | daily–weekly | laptop + bank app |
| J6 | "Pay the designers their commission for this month" (run commission) | Owner | monthly | laptop |
| J7 | "Michelle wants 5% on Ryan's job — yes or no" (answer a commission ask) | Owner | occasional | any |
| J8 | "How did we do this quarter?" (profit and margin) | Owner | monthly / quarterly | laptop |
| J9 | "Push everything to Xero for the accountant" (sync Xero; fix a failed push) | Admin | weekly / month-end | laptop |
| J10 | "Log the floor-protection boards I bought on site and claim it back" (expense / claim with a receipt photo) | Designer | weekly | **phone, on site** |
| J11 | "Send the carpenter his PO" (raise a PO, from the quote's lines) | Designer | weekly per project | laptop |
| J12 | "The carpenter's invoice came in — put it in" (record a supplier bill from its PDF) | Admin / Designer | weekly | laptop |
| J13 | "The electrician asked for changes on the PO" (act on a vendor's answer) | Designer | occasional | phone |
| J14 | "What have I earned, what's still owed to me?" (own commission) | Designer | monthly | phone |
| J15 | "Add a new sub-con / merge the duplicate Woodcraft" (vendor directory) | anyone adds; Owner / Admin changes | occasional | laptop |

---

## 2. The cost of each job today

Presses are counted from any page with the rail (desktop) or the dock (phone), up to the press that does the job; typing is not counted.
"Choices" = buttons and menu rows on screen at the moment of decision.

| Job | Path today | Presses | Screens | Choices at the decision | What they must already know | Where it goes wrong |
|---|---|---|---|---|---|---|
| **J1** approve + send a PO | Rail **Company** › **Finance** (lands on Overview) › *Review it* (opens Finance › Purchase orders, then the panel) › panel **Approve and send** › dialog **Approve and send via WhatsApp** › WhatsApp Send. Or: bell › row (opens the **project's Money** tab, `po-actions.ts:39`) › banner *Approve and send* › dialog › WhatsApp | 6 (5 from the bell) | 4 | panel: 1 primary + ⋮ 4 (*View the PO · Take the submission back · Send back · Duplicate*) — *i-po008-panel-1440* | that Finance is under **Company › Operations**; that approving **is** sending (F1-Q6), on their own WhatsApp | From Finance the panel **has no "Against the quote"** line — the margin the approver needs (`queries.ts:242` builds the studio summary without quote lines; the project's does, `queries.ts:195`); the ⋮ offers both *Take the submission back* and *Send back* to an Owner (`use-costs.tsx:247-248`); the send dialog says **"Client name"** and **"Message to the client"** for a vendor (`components/contracts/editor/dialogs.tsx:103,116`) — *i-po008-approve-send-1440* |
| **J2** approve + reimburse a claim | Company › Finance › *Review it* (Finance › Expenses + panel) › **Approve** › panel's primary becomes **Pay back** › **Record the payment** | 6 | 3 | panel: Approve + ⋮ 4 (*Edit · Approve* again · *Send back · Remove*, `use-costs.tsx:311-320`) | where the member's bank / PayNow is — **nowhere in the app** | Approve appears twice; the pay dialog has no payee bank line |
| **J3** pay a bill | Company › Finance › **Bills** › (*To pay* chip) › row **Pay** › **Record the payment**; to see the account number: **Vendors** › vendor › read bank › back to **Bills** › Pay | 5 (10 with the bank lookup) | 2–4 | Bills: 4 chips + New + 3 *Pay* + 5 ⋮ — *fin-bills-1440* | that a bill on a PO also pays the PO; which tab has PO balances (POs) vs bills (Bills) | Pay dialog shows no bank / PayNow (`payout-dialog.tsx:48-62`); bills **due soon** are not on the Overview (only overdue, `overview-view.tsx:56`) — e.g. Woodcraft's WC-2391 (S$7,630, due 9 Oct) is told only by the bell and the Bills tab |
| **J4** who owes us + chase | Company › **Reports** (lands on **Leads**, `company/sections.ts:74`) › **Finance** (lands on P&L) › **Owed to you** › invoice row (opens the project's Money) › scroll to the overdue band › **Remind on WhatsApp** › WhatsApp Send — repeat per client | 7 per client | 3 | Reports: 8 report chips + 6 period chips + Export before any number | that "who owes us" is a **report**, not Finance; that chasing lives on each project | Finance has **no money-in list at all**; ⌘K "invoice" finds *Supplier bills* (`global-search/model.ts:195`) |
| **J5** confirm a client payment | Company › Finance › *Confirm it* (leaves Finance for the project's Money, `overview-view.tsx:41`) › banner **Confirm** | 4 | 2 | banner: Confirm · Not received | — | the row's **Since** shows the invoice's sent day (8 Aug), not the day Ryan said he paid (3 Oct) — *fin-overview-1440* |
| **J6** run commission | Company › Finance › **Commissions** › scroll past tiles, *Asks*, *By member* to *On each project* › **Pay** on a line › **Record the payment** — per project line | 3 + 2 per line = **11** for the demo's 4 owed lines (3 people) | 1 + 4 dialogs | 4 stacked tables, 35 money figures — *fin-commissions-1440* | that pay is per **project**, not per person | *By member* (the list people think in) has no Pay (`commissions-view.tsx:179`) |
| **J7** answer a commission ask | Company › Finance › *Answer it* (Overview's **Stuck**) › Commissions (focused row) › **Approve** › dialog **Approve** | 5 | 2 | Decline · Approve | — | an ask is filed under **Stuck**, not with the approvals |
| **J8** this quarter's profit | Company › Reports (Leads) › Finance › **This quarter** | 4 | 1 | 15 controls above the first figure | which of two margins is "the" margin | **P&L says 63.2 %, Profitability says 87.7 %** (different bases, both called *Margin*; Profitability counts projects with no costs as 100 %, `reports.ts:231-245`) — *rep-pl-1440*, *rep-profitability-1440* |
| **J9** sync Xero | connected: Company › Finance › **Accounting** › **Sync now**. First time: Accounting › *Connect in Integrations* › **Connect Xero** › snackbar *Open Accounting* › check organisations / mapping › **Sync now** | 4 (7 the first time) | 1 (3) | — | that the connection is in Integrations and the syncing in Finance | the same Xero card head and help text on both pages (`accounting-view.tsx:111-131`, `integrations-view.tsx:328-341`) |
| **J10** log a claim on site (phone) | Dock **More** › **Company** › **Finance** (lands on *Purchase orders*) › swipe the tab strip › **Expenses** › **Log an expense** › Project · Amount · Category · What for · *I paid — claim it back* › scroll to *Receipts* › Take photo › **Log expense**. Or the project › **Money** › scroll **4,937 px** (of 7,992) to *Costs* › **New cost ▾** › Expense | ≈12 + typing (5 to reach the form, ≈7 in it) | 3 | form: 9 fields, receipts last — *i-new-expense-390* | that expenses are under **Company** | the receipt — the thing in their hand — is the last field (`expense-dialog.tsx:150-154`); ⌘K's *Log an expense* row only shows once something is typed (`global-search/model.ts:240`) |
| **J11** raise a PO | project › Money › scroll to Costs › **New cost ▾** › Purchase order › vendor · *Add from the quote* · terms · **Save and send** / **Submit for approval**; or Company › Finance › **New purchase order** › pick the project first | 5–6 + the form | 2–3 | form: 14 controls — *i-new-po-1440* | the approval limit (said in the button) | fine — the dialog is good |
| **J12** record a supplier bill | Company › Finance › **Bills** › **Record a bill** › drop the PDF (read for you) › check › **Record** | 5 | 2 | — | — | good; a duplicate is caught (*Record anyway*) |
| **J13** vendor asked for changes | bell › project Money (banner *Change it*) or Finance › POs › *Change it* | 3 | 2 | — | — | not on Finance's Overview (only Projects' Needs attention and the Money banner) |
| **J14** my commission (Designer) | More › Company › Finance (lands on POs) › swipe › **Commissions** | 4 | 1 | — | that commission is under Company | — |
| **J15** vendors | Company › Finance › **Vendors** › row ⋮ (*Edit · Merge into another… · Deactivate*) | 4 | 1 | — | — | fine |

**The shape of it.** No job finishes on the page Finance opens on. The Owner's daily questions — *what needs me, what must I pay, who owes
us, how are we doing* — are answered in four different homes (Finance › Overview, Finance's record tabs, each project's Money tab,
Company › Reports), none of them complete.

---

## 3. Load inventory per screen (1440 unless said)

Counted in the running app (`f1-measure.json`): buttons = every visible button incl. row ⋮; S$ = money figures printed; statuses = distinct
status words.

| Screen | Tabs / chips above the content | Buttons visible | Tables · rows | Tiles | S$ figures | Statuses | Competing actions | Notes |
|---|---|---|---|---|---|---|---|---|
| **Finance › Overview** — *fin-overview-1440 / -390* | 8 tabs | 2 (+6 links) | 2 · 6 | 0 | 5 | — | 6 next-step links of 5 verbs (*Confirm it · Review it · Send it · Pay it · Answer it*) | Fits one screen; but **6 rows while 15 things wait on the Owner** (§5 P1). "Since" means four different dates. Phone: 6 cards × 6 lines, 1,542 px. |
| **Purchase orders** — *fin-pos-1440 / -390* | 8 tabs + search + 4 chips + **New purchase order** | 29 | 1 · 9 | 0 | 24 | **7** (Closed · Part paid · Accepted · Cancelled · Changes asked · Waiting for approval · Draft) | 4 different next-step verbs + 9 ⋮ (PO-003's ⋮ = 8 rows — *i-po003-menu-1440*) | Help line: "S$39,959.50 committed … S$17,743.75 still to pay … S$1,400.00 overdue" — three figures in jargon. Phone: 9 cards × 7 lines = **3,088 px**; chips wrap to 2 rows. |
| **Bills** — *fin-bills-1440* | 8 + search + 4 chips + **Record a bill** | 19 | 1 · 5 | 0 | 6 | 3 | Pay ×3 | Clean. |
| **Expenses** — *fin-expenses-1440* | 8 + search + 4 chips + **Log an expense** | 20 | 1 · 6 | 0 | 11 | 4 | Pay back · Approve | Clean. |
| **Payments out** — *fin-payments-1440* | 8 + search + 3 chips | 10 | 1 · 6 | 0 | 7 | — | ⋮ only | A history log presented as a peer of the work tabs. |
| **Vendors** — *fin-vendors-1440* | 8 + search + 3 chips + **New vendor** | 29 | 1 · 12 | 0 | 10 | 1 | ⋮ ×12 | Committed / Owed columns repeat Reports › Vendor spend. |
| **Commissions** — *fin-commissions-1440* | 8 tabs | 18 | **4 · 18** | 3 | **35** | 2 | Decline · Approve · Pay ×4 | 1,776 px; *By member* and *On each project* say the same money twice; repeats Reports › Commissions with **different totals** (all-time vs this year). |
| **Accounting** (not connected) — *fin-accounting-1440* | 8 tabs | 2 | 0 (log empty) | 0 | 0 | 1 | Connect in Integrations | A near-empty tab whose only act sends you to another page. |
| **Reports › Finance › P&L** — *rep-pl-1440 / rep-pl-390-view* | 3 report tabs + **8 report chips + 6 period chips** + Export | 17 | 2 · 20 | 4 | 22 | — | — | Phone: the 14 chips + Export fill the **whole first screen** before a number. |
| **Reports › Profitability** — *rep-profitability-1440* | 3 + 8 | 12 | 3 · 15 | 4 | **50** | — | — | Every money cell green on a healthy row (contract value, invoiced… all green). A type with no costs shows **100 %**. |
| **Reports › Cash flow** — *rep-cashflow-1440* | 3 + 8 + 6 | 17 | 2 · 17 | 3 | **58** | — | — | Six months of S$0.00 rows; red on Oct's S$0.00 in. |
| **Settings › Finance** — *settings-finance-1440* | 6 module tabs | 15 | 2 card tables | 0 | 0 | — | Save cost rules · Discard · Change ×2 · Remove · 3 *add* | Fine (house grammar). The money-in rules are on another module (Settings › Projects, 5,137 px). |
| **Integrations › Xero** — *i-integrations-xero-1440* | — | 1 | — | — | — | 1 | Connect Xero | Same head and help as Accounting's card. |
| **Vendor's PO link** — *po-link-1440 / -390* | — | 1 (Download) | — | — | 14 | 1 | — | Clean, phone-first. Tells Woodcraft "pays by 10 Sep '26" — a day Finance itself doesn't call overdue (§5 P3). |
| **A project's Money tab** (Ryan) — *money-ryan-1440*, *money-benjamin-1440* | 13 project tabs + New ▾ + New cost ▾ | **67** | **8 · 28** | **10** | **60** | **13** (Paid · Payment to confirm · Draft · Approved by the client · Declined by the client · Sent · To confirm · Confirmed · Part paid · Closed · Changes asked · Unpaid · To pay back · Approved) | 2 *New* menus, 7 bands (Benjamin) | 3,433 px at 1440, **7,992 px on a phone**. AquaFlow's S$1,400 is shown **five times** on Benjamin's (tile, *What the numbers say*, red band, PO row, bill row). |

**The vocabulary a studio person meets across Finance**: 10 PO words (`model.ts` `PO_STATE_LABEL`), 4 bill, 5 expense, 4 ask, 3 vendor,
4 Xero (Waiting to push · Failed · Created · Updated) = **30 status words**, and the jargon *Committed · Payments out · Studio overhead ·
Close it short · Money to verify · trusted proof not checked · Waiting to push · Auto-map · tax codes · basis · shares*.

---

## 4. Feature inventory (everything the redesign must keep)

"Proposed home" refers to §6.

| # | Capability | Today | Proposed home |
|---|---|---|---|
| **Landing and signals** | | | |
| F1 | Money to verify: client payments to confirm · proofs counted but not checked · POs waiting for approval · expenses waiting (`overview-view.tsx:39-48`) | Finance › Overview | **To do › To approve / To collect** |
| F2 | Stuck: invoices ready > 7 days · PO drafts > 7 days · bills overdue · commission asks (`:51-57`) | Overview | To do › To collect (ready invoices) · **Stuck** (old drafts) · To pay (overdue bills) · To approve (asks) |
| F3 | Bell: *po_review · po_sent_back · po_approved · po_answered · expense_review · expense_answered · claim_paid · bill_due · commission_asked · commission_answered · commission_paid · credit_issued · xero_failed* (+ email / WhatsApp wording) | bell | bell (links land on the To do row for an approver) |
| F4 | Studio search: vendors, POs, bills; Finance pages; *New purchase order · Record a supplier bill · Log an expense* Create rows; **G F** | ⌘K, keys | same; the three Create rows also in the empty search for members |
| F5 | Projects' *Needs attention* reason *vendor answered* (`attention.ts`) and *Needs my review* (payments to confirm) | Projects | same (a door to the same To do row) |
| **Purchase orders** | | | |
| F6 | List: search · *All · With the studio · With the vendor · Done* · columns PO · Project · Vendor · Amount · Paid · Status (+ why) · Next step + ⋮ · Column settings · help figures (Owners / Admins) | Finance › POs | **Money out › Purchase orders** (status → scope pill) |
| F7 | New PO dialog: project · vendor (+ add a vendor) · title · lines (what · trade · qty · unit · price) · **Add from the quote** · GST from the vendor · advance none / % / fixed · terms (5 + custom words) · expected delivery · deliver to · note · *Save as Draft · Save and send · Submit for approval* | Finance + project Money › New cost | same dialog, one **New ▾** (PO · Bill · Expense) everywhere |
| F8 | Steps: Submit · take back · send back with a note · **Approve and send** (WhatsApp, link, copy link) · send again · Mark as accepted (phone · WhatsApp · email · in person) · Change it (back to Draft) · Record a bill on it · Pay (advance first) · Close it short (note) · Cancel (reason) · Remove Draft · Duplicate · View the PO (print / PDF) · Copy the vendor's link · Undo on each | ⋮ · panel · banners | same, from the To do row, the list row and the panel |
| F9 | PO panel: status + why · facts (project, vendor + phone, terms, pay-by, delivery, address, sent / viewed, accepted via, bills on it, **against the quote**) · lines · totals (advance, paid, to pay) · payments · history | panel | same panel — **against the quote also in Finance** |
| F10 | Rules: approval over the limit or with an advance (Settings), PO numbering, who prepares / approves | Settings › Finance › Costs | Settings › Finance (Money) › Costs |
| F11 | The vendor's link `/po/[token]`: letterhead PO, Download PDF, Accept · Ask for changes · Decline, Viewed stamp, cancelled / closed notice | `/po/[token]` | **kept as is** |
| **Supplier bills** | | | |
| F12 | List: *All · To pay · Overdue · Paid* · Record a bill · columns Bill · Project · PO · Issued · Due · Amount · Status · Next | Finance › Bills | Money out › Bills |
| F13 | Bill dialog: drop the PDF → read (supplier · number · dates · amounts · lines) · enter by hand · PO of that vendor · project or Studio overhead · file · duplicate check → *Record anyway* · Edit / remove while unpaid (Undo) · Open its file | dialog | **kept as is** |
| **Expenses and claims** | | | |
| F14 | List: *All · Waiting · To pay back · Mine* · Log an expense · columns · Approve · Send back · Pay back · Edit · Remove (Undo) | Finance › Expenses | Money out › Expenses; approvals and pay-backs also on To do |
| F15 | Expense dialog: project / overhead · amount incl. GST · *Includes GST* · day · 11 categories · vendor · what for · who paid (studio / me / a member — Owners, Admins) · ≤ 5 receipts + camera · note | dialog | same fields, **receipt first** on a phone |
| **Payments out** | | | |
| F16 | One pay dialog for a PO / bill / claim: amount (owed to start) · paid on · method (4) · reference · note · the transfer's screenshot · Undo | dialog | same + **the payee's bank / PayNow shown** |
| F17 | Payments out list: *All · To vendors · Claims* · Open the transfer · **Reverse** (reason, Undo) · total paid | Finance › Payments out | Money out › **Paid** |
| **Vendors** | | | |
| F18 | Directory: search · *Active · Inactive · All* · New vendor · columns (Contact, GST, POs, Committed, Owed, Status) · panel (notes, contact, mobile, email, UEN, GST, bank, PayNow, Committed · Paid · Owed, POs, bills, paid) · Edit · **Merge into another…** (preview, Undo) · Deactivate / Reactivate (Undo) · the one vendor list the Price book and quote lines pick from (N-16) | Finance › Vendors | **kept as is** (tab) |
| **Commission** | | | |
| F19 | Tiles Earned · Paid · Owed (member: their own) | Commissions | Commission |
| F20 | Asks: a member asks (rate + why), takes it back; Owner approves (may change the rate) or declines with a note | Commissions + Overview › Stuck | Commission + **To do › To approve** |
| F21 | By member · On each project (share, rate + which rule, earned, paid, owed, paid ahead) · Pay (per project line) · their rate on this project · remove it · change the shares | Commissions | Commission: **one grouped table** (member → projects) |
| F22 | Payments (reverse with reason, Undo) · member's *Paid to you* | Commissions | same |
| F23 | Rules: studio rule (none / % of payments / % of profit / fixed) · member · project · member on a project; Change / Remove (Undo) | Settings › Finance › Commission | same |
| **Xero** | | | |
| F24 | Connect / Disconnect (simulated), state, last sync | Integrations › Xero | same |
| F25 | Organisation per issuing entity · accounts + tax codes mapping · Auto-map (Undo) · Push automatically · Sync now (count) · Waiting to push (Retry on a failure) · synced counts per kind · sync log | Finance › Accounting | Finance › **Xero** (same content); failures also on **To do › Stuck** |
| **Reports (Company › Reports › Finance)** | | | |
| F26 | P&L · Owed to you · You owe · Profitability · Cash flow · Vendor spend · Commissions · Client statement; periods (6); project pick; Export (CSV · XLS · XLSX · PDF); row links; Maison AI (who owes · thinnest margins · open cash flow) | Reports | **kept** (one home for numbers); pickers become two selects on a phone; numbers made to agree (P3) |
| **Settings** | | | |
| F27 | Costs: PO approval switch + limit · expense approval · usual terms · PO numbers (prefix, next, digits, year, example) · LeaveGuard · read-only for others | Settings › Finance | same |
| F28 | Money-in rules: Invoices · invoice numbers by entity · invoice paper · credit notes · client payments | Settings › **Projects** | his call (§6.8): beside Costs in one *Money* module |
| **On the project** | | | |
| F29 | Money tab Costs half: New cost ▾ · tiles Committed · Paid · You owe · Profit · Margin · Cash so far · *What the numbers say* · bands (vendor answered, PO awaiting, expenses awaiting, bill overdue) · the three tables | project › Money | the bands become **the same To do rows, filtered to the project** (one component) |

---

## 5. Problems, ranked by load on a studio person

**P1 — There is no single answer to "what needs me?"** (Owner / Admin, every day). Work that waits on the Owner is spread over Finance ›
Overview, the POs / Bills / Expenses / Commissions tabs, every project's Money bands, Projects › *Needs my review*, the bell and Reports.
Finance's Overview — the page Finance opens on — shows **6 rows** (*fin-overview-1440*) while the demo has **15** money items waiting on
Dane:

| Waiting on the Owner | On the Overview? | Where it actually is |
|---|---|---|
| PO-2026-008 to approve · Grab claim to approve · Ryan's S$13,370 to confirm | yes (3) | |
| Michelle's commission ask | as **"Stuck"** | Commissions |
| AquaFlow AF-7781 overdue S$1,400 | yes (Stuck) | |
| PO-2026-003 to Woodcraft — S$14,077.35 left, its bill WC-2391 due today · Kallang overhead bill KC-1009 S$2,180 due 15 Oct | **no** (only overdue bills, `:56`) | POs · Bills · bell |
| Michelle's claim to pay back S$86.40 (spent 21 Aug) | **no** | Expenses › *To pay back* |
| Commission owed S$1,258.45 on 4 lines | **no** | Commissions |
| INV-2026-006 S$20,784.94 overdue 7 days · INV-2026-002 S$13,370 overdue 55 days | **no** | Reports › Owed to you; each project's Money; bell |
| Bright Spark asked for changes on PO-007 | **no** | Projects attention; Money band; POs |
| Aisha's Commencement invoice ready since 18 Sep | yes (Stuck) | |

A client invoice **waiting for approval** would be missed too — the Overview reads only `toConfirmMinor` / `uncheckedMinor`
(`overview-view.tsx:40-42`); the demo has none today, so it is not in the 15.

The rail says nothing either: the Company badge counts templates, price-book proposals and AI-credit asks but **no money**
(`lib/leads/tasks.ts:142-153`), and the Company panel's *Finance* row carries no count while *Templates* says "1 awaiting"
(*i-company-popover-1440*, `app-rail.tsx:232`).

**P2 — "Who owes us?" is not in Finance, and chasing is per project.** Money in has no studio-wide list: the Owner goes Company › Reports
(which opens on *Leads*) › Finance (opens on *P&L*) › *Owed to you* (4 presses), then into each project's Money to press *Remind on
WhatsApp* (7 per client). Overdue client money (S$34,154.98 in the demo) never appears on the page called Finance; ⌘K "invoice" offers
*Supplier bills*.

**P3 — The numbers disagree with each other** (and with what the vendor was told).

| Question | Answer 1 | Answer 2 | Why |
|---|---|---|---|
| How much do we owe that's **overdue**? | Finance › POs help, Vendors, Overview: **S$1,400.00** | Reports › You owe and Cash flow *Overdue now*: **S$15,477.35** | the reports age a PO by its own pay-by day even when it has bills (`reports.ts:204, 294`); `costsOf` uses the bills' days (`costs.ts:86-89`). PO-003's vendor link meanwhile tells Woodcraft "pays by **10 Sep '26**" (*po-link-1440*) |
| What's our **margin**? | P&L: **63.2 %** (invoiced vs costs, before GST, this year) | Profitability: **87.7 %** (contract vs committed, with GST, incl. projects with no costs); *By project type*: **100 %**, *By designer*: 98 % | `reports.ts:231-245` weights in "no costs yet" projects that the project rule shows as "--" (F2-Q2: "never a 100 % margin") |
| What has the team **earned** in commission? | Finance › Commissions: **S$2,743.39** (all time) | Reports › Commissions: **S$2,403.21** (this year), Sarah *earned S$844.76 · paid S$1,184.94* | different periods, same word, no period said on Finance |
| How much have we **paid out / committed**? | POs help: committed **S$39,959.50**; Payments out: **S$21,780.95** | Vendor spend: committed **S$39,460.10**, paid **S$21,756.95**; P&L costs **S$39,184.66**; Cash flow out **S$24,245.69** | five definitions (with / without GST, claims, commission, expenses without a vendor), each called *committed / paid / costs* |
| When is Woodcraft's bill due? | bell title: "due **9 Oct '26**" | bell meta: "Due Tue, **6 Oct '26 · 3 days late**" | `lib/finance/bell.ts:36` stamps a coming bill at due − 3 days, and the bell's Due group reads `at` as the due day (*i-bell-1440*) |

**P4 — Eight tabs by record type, mixed kinds.** POs · Bills · Expenses are work; Payments out is history; Vendors is a directory;
Commissions is people; Accounting is plumbing; Overview is a to-do. One job crosses tabs: paying the carpenter means the PO (advance) on
*Purchase orders*, his bill on *Bills*, his account number on *Vendors*, the record on *Payments out*. A Designer opens Finance on
*Purchase orders* (`sections.ts:34`) even though their weekly job there is an expense. On a phone the strip shows 4½ of 8 tabs.

**P5 — The approver decides without the facts.** In Finance the PO panel has no *Against the quote* (the client pays S$x for these lines;
this PO leaves y %) because the studio-wide summary is built without quote lines (`queries.ts:242` vs `:195`); the same PO opened from the
bell (project Money) shows it — PO-2026-008: "The client pays S$6,655.50 for its quote lines — it leaves S$1,582.50 (23.8%)"
(*i-po008-panel-on-money-1440* vs *i-po008-panel-1440*). The Overview's *Since* is the invoice's send day for a payment claim, the creation day for a PO, the due
day for a bill (`overview-view.tsx:41-57`). An Owner's ⋮ on someone else's submission offers *Take the submission back* **and** *Send back*.

**P6 — Paying lacks the payee's details.** The pay dialog (*i-bill-pay-1440*) shows what and how much, never the vendor's bank or PayNow
(`payout-dialog.tsx:48-62`); those are only on Vendors › panel (*i-vendor-panel-1440*). A member's PayNow for a claim or commission is
nowhere. Paying a batch = flipping between Bills and Vendors.

**P7 — Commission is long and pays the wrong way round.** Four stacked tables (1,776 px, 35 figures); *By member* repeats the report and
has no Pay; Pay is per project line, so paying three people their month is 4 dialogs (`commissions-view.tsx:143, 179-184`). Asks sit on
Overview under *Stuck*.

**P8 — Finance is hard to reach for daily work.** It sits in **Company › Operations** with no badge; a Designer's on-site claim is More ›
Company › Finance › (swipe) Expenses › Log an expense → ~12 presses with the receipt as the last field (*i-new-expense-390*). The
project's own *New cost* is 4,937 px down the phone Money tab.

**P9 — Phone pain.** Reports' 14 chips + Export fill the first screen (*rep-pl-390-view*); the PO list is 3,088 px of 7-line cards; the
Overview's actions are text links at the end of 6-line cards; Finance's tab strip scrolls.

**P10 — Xero lives in two places.** Integrations connects, Finance › Accounting maps and syncs; both cards carry the same head and help
text; the first connect bounces between them; while not connected the Accounting tab is a page with one button that leaves. Studios say
"Xero", not "Accounting".

**P11 — Words.** The vendor's send dialog says *Client name* / *Message to the client* (`dialogs.tsx:103,116`, the contract dialog
reused). *Committed*, *Payments out*, *Studio overhead*, *Close it short*, *Money to verify*, *A proof … not checked yet — It counts
already — trusted*, *Waiting to push*, *Stuck* (holding asks and overdue bills). The bill_due email says "Pay it from Finance › Bills" and
links to the project's Money (`notifications/model.ts:395` vs `finance/bell.ts:35`).

**P12 — The same record opens in different places.** Overview: a PO opens Finance › POs, a client payment opens the project's Money; the
bell: the same PO opens the project's Money (`po-actions.ts:39`). The two panels show different facts (P5).

**P13 — Repetition inside a screen.** The panel's primary is repeated in its ⋮ (*Approve*, *Pay the vendor*); a PO and its bill are both
flagged overdue for one debt (*PO-2026-005* and *AF-7781*); Benjamin's Money shows AquaFlow's S$1,400 five times.

**P14 — Money rules in two Settings modules.** Costs and Commission in Settings › Finance; Invoices, invoice numbers by entity, invoice
paper, credit notes and client payments in Settings › Projects (a 5,137 px page also holding schedule, updates, tickets, workload). The
Owner setting up "money" must know which side of the business each rule belongs to.

---

## 6. Proposal

### 6.1 The idea in one line

**Finance opens on what the money needs from you — approve, pay, collect — with the action on the row; the records sit one tab away by
kind; the numbers stay in Reports.** It follows the owner's one-home rule (REG-1360/1361: Finance is the work, Reports is the numbers) and
the Leads standard (one list, one primary per row, scope pill, the house table).

### 6.2 IA — before → after

| Today (8 tabs, Owner) | Proposed (5 tabs, Owner / Admin) | Proposed (Manager / Designer: 4) |
|---|---|---|
| Overview | **To do** (lands here) | **To do** (their own: drafts, sent back, changes asked, claims waiting / to be paid) |
| Purchase orders · Bills · Expenses · Payments out | **Money out** — one tab, a kind switch: *Purchase orders · Bills · Expenses · Paid* | **Money out** (their projects; no *Paid*) |
| Vendors | **Vendors** (as is) | **Vendors** (as is, no bank) |
| Commissions | **Commission** (one grouped table) | **My commission** |
| Accounting | **Xero** (as is, renamed — his word) | — |

Reports › Finance keeps its eight reports. Settings › Finance keeps Costs and Commission (6.8 asks about money-in rules).

### 6.3 To do — the landing (new; built from house pieces)

**At 1440, region by region**

1. **Shell** — CompanyShell L1 "Finance", the 5-tab strip. Header end (the page head, not a figure): a text door *Reports ›* (`HelpLink`,
   `?from=`), so "how are we doing" is one press away without repeating numbers (N-01).
2. **Toolbar** (one row) — house `Chips` (single, with counts — the demo's): **All · 15 · To approve · 3 · To pay · 8 · To collect · 3 · Stuck · 1**;
   search (filters rows); at the end the page's one filled button **New ▾** (*Purchase order · Supplier bill · Expense*) — the same menu as
   the project's *New cost* (`project-costs.tsx:65-69`).
3. **To approve** — a house table (`CreditsTable`, the listing's model) titled with its sum: *3 waiting for you · S$5,568.07*. Columns:
   **What** (PO-2026-008 to Stone & Tile · "Tiling, screeding and waterproofing") · **Project** · **Asked by** (Germaine · 5 Oct — the
   *submitted* day) · **Amount** · **Why it waits / what to know** (*Over S$5,000* · *Leaves 23.8 % against the quote* — needs P5's data
   fix) · **action** (*Approve and send* / *Approve* / *Answer*) + ⋮ (*Send back · Open · View the PO*). Rows: POs waiting · expenses and
   claims waiting · client invoices waiting (*Review on Money* door, or inline later) · commission asks.
4. **To pay** — *S$19,002.20 to pay · S$1,400.00 overdue* (vendors and claims S$17,743.75 + commission S$1,258.45). Columns: **To** (AquaFlow Plumbing Works / Michelle) · **For** (Bill AF-7781 ·
   PO-2026-005 / "Floor protection boards" claim / commission on Ryan's) · **Project** · **Due** (red when past; *today* / *in 6 days*) ·
   **Amount** · **Pay** + ⋮. Sorted by due day. Rows: bills (all unpaid, not only overdue) · PO advances and balances due · claims to pay
   back · commission owed. A bill on a PO is **one row** (the debt once — P13). The pay dialog gains one read-only line: *Woodcraft
   Carpentry Pte Ltd · OCBC 601-234567-001 · PayNow 201534567K* with copy (Owners / Admins already see bank — `seesBank`).
5. **To collect** — *S$34,802.98 owed on 3 invoices · S$34,154.98 overdue*. Columns: **Client** · **Invoice** · **Project** ·
   **Due / said they paid** · **Amount** · action: *Confirm* (a payment claimed — with *Not received* in ⋮), *Check* (a trusted proof),
   *Remind on WhatsApp* (overdue — the Money tab's `remindInvoice` and its message, `payments-section.tsx:117-121`), *Send* (ready > 7
   days). Rows open the project's Money with `?from=` (its one home stays the project).
6. **Stuck** — things waiting on someone else, quietest: PO drafts older than 7 days · vendors who asked for changes / declined (*Change it*)
   · Xero pushes that failed (*Retry*).
7. **Empty** — a group with nothing collapses to its head line ("Nothing to approve"); all empty = the house `EmptyState` ("Nothing needs
   you — new POs, bills and claims land here").

Every action opens the **same** dialog or panel the record lists use (`useCosts` and the Money tab's payment steps), in place — no
navigation, Undo on every step, `?open=` from the bell and search lands on the row.

**At 390** — the dock and top bar; tab strip of 5 (4 for members, fits). Chips as the house chip rail (one row, scrolls). Each row is a
card: line 1 *what* + amount (right), line 2 *project · due / asked by*, the action as a full-width-right text button with ⋮ beside it
(≥ 44 px). *New ▾* becomes the bar's `+` icon button (the Money tab's phone pattern). A Designer's To do puts **Log an expense** first
(their weekly job) — the dialog opens with **Take a photo of the receipt** as its first control (the camera input exists,
`expense-dialog.tsx:154`), then amount, project, what for.

**For a Designer / Manager** the same page, their rows only: *Your drafts · Sent back to you · Vendors who answered · Your claims (waiting
· approved, to be paid back)*. No amounts beyond their own records (Q-20 holds).

### 6.4 Money out (merges Purchase orders · Bills · Expenses · Payments out)

**1440**: toolbar — search · house `Chips` (single) **Purchase orders · Bills · Expenses · Paid** · a scope pill *Status: All ▾*
(`components/om/scope-pill.tsx`, the galleries' pattern REG-666) holding each kind's existing chips (*With the studio · With the vendor ·
Done* / *To pay · Overdue · Paid* / *Waiting · To pay back · Mine* / *To vendors · Claims*) · Column settings · **New ▾**. Below, the
kind's existing table **unchanged** (`cost-tables.tsx` — they are good), its help line keeping the Owners' figures. Old addresses
(`/company/finance/purchase-orders` …) land on `?kind=`. **390**: one row: search + kind chips scrolling; the status pill on the next
line only when not *All*; cards as today.

What it saves: three tabs, three New buttons and a duplicate *Payments out* tab; a PO, its bill and its payment are one switch apart.

### 6.5 Commission

**1440**: tiles **Earned · Paid · Owed** with the period said ("since the start" — matching Reports' *All time*); *Asks for another rate*
only while one is open (answered asks fold into the row history); **one grouped table** — a member row (earned · paid · owed, **Pay
Michelle S$362.21**) that opens to their project rows (share · rate + which rule · earned · paid · owed · ⋮ *Their rate on this project ·
Remove it · Change the shares*); *Payments* (Reverse). Paying a member pays their owed lines oldest first, one `commission_payouts` row per
project — a new behaviour (his call, 6.9). **390**: tiles two-up; members as cards with *Pay*; projects inside the card. **Member**: *My
commission* — tiles, their projects, *Ask for another rate*, *Paid to you*.

### 6.6 Xero

Keep the content; name the tab **Xero** (his word). Before Xero is connected, the tab shows the Integrations card's **Connect Xero** in place
of a bare door, and after connecting stays here (the connection's home remains Integrations per N-09; this is the door acting, as *Approve
and send* does elsewhere — his call). Failed pushes also appear in To do › Stuck with *Retry*.

### 6.7 Reports › Finance (stays the one home for numbers)

- **Pickers**: at 1440 keep the 8 report chips; make **Period** a select (`TextField mode="select"`) beside Export — 15 controls → 10. At
  390 both are selects; the first number shows on the first screen.
- **One set of numbers** (bug fixes, but visible): age a PO with bills by its bills' days in *You owe* and *Cash flow* (match `costsOf`);
  leave "no costs yet" / "early" projects out of Profitability's weighted margin and the by-type / by-designer margins (show "--", as the
  project does); name the two margins apart — *Margin on what was invoiced* (P&L) vs *Margin on contracts* (Profitability); say the period
  on Finance › Commission's tiles; colour only the figure that carries the meaning (not every money cell on a healthy row, not S$0.00).
- Reports remembers the last tab per browser (Leads' remembered view pattern), so an Owner who reads Finance lands on it.

### 6.8 Settings

Keep Settings › Finance as is. His call: rename the module **Money** and give it three cards groups — *Money in* (Invoices · invoice numbers
by entity · invoice paper · credit notes · client payments, moved from Settings › Projects with Kept-in links back), *Money out* (Costs),
*Commission* — so every money rule has one home; Settings › Projects keeps schedule, updates, handover, tickets, workload, compliance.

### 6.9 Small fixes that remove load (each visible → needs Vicky)

1. The vendor send dialog's labels: *Vendor's name* · *Message to the vendor* (a `nameLabel` / `messageLabel` on `RecipientFields`).
2. An approver doesn't see *Take the submission back* on someone else's submission; the panel's ⋮ never repeats its primary.
3. The pay dialogs show the payee's bank / PayNow; members get a PayNow field on Members (data: `members` has `phone`; PayNow is new).
4. The Company badge and the Company panel's Finance row count **To approve** for Owners / Admins ("2 to approve"), like *Templates · 1
   awaiting*; `railBadges` gains `company:finance`.
5. The bell's bill row stamps its due day as due (`bell.ts:36`), and the bill_due email names the place it links to.
6. ⌘K's *Log an expense · New purchase order · Record a supplier bill* show in the empty search for members (drop `onlyTyped` for those).
7. *Since* on the Overview / To do becomes two honest columns: *Asked* (approvals) and *Due* (pay / collect).
8. One debt, one overdue flag: a PO whose bill carries the debt shows *Billed — see AF-7781* in its Paid cell, not a second "overdue".

### 6.10 What becomes automatic

- **Pay** rows appear by themselves when a bill is recorded, an advance falls due, a claim is approved or a client payment earns commission.
- **Collect** rows appear when an invoice passes its due day, with the reminder already drafted (the Money tab's message).
- **Stuck** catches what nobody moved for 7 days (the Overview's rule, kept) and failed Xero pushes.
- The project Money tab's Costs bands are the To do rows filtered to that project — one component, one wording, both places.

### 6.11 Step counts after

| Job | Today | Proposed | How |
|---|---|---|---|
| J1 approve + send a PO | 6 presses, 4 screens, no margin in view | **5**, 3 screens, margin on the row | Company › Finance (To do) › *Approve and send* › send › WhatsApp |
| J2 approve + reimburse a claim | 6 | **5** | To do › *Approve* (row moves to To pay) › *Pay back* › Record |
| J3 pay a bill | 5 (10 with bank lookup) | **4** | To do › *Pay* (bank shown) › Record |
| J4 who owes + chase | 7 per client, 3 screens, outside Finance | **4** per client | To do › To collect › *Remind on WhatsApp* › Send |
| J5 confirm a payment | 4 | **3** | To do › *Confirm* |
| J6 run commission (3 people) | 11, 4 dialogs | **9**, 3 dialogs | Commission › *Pay Michelle* … (or from To pay) |
| J7 answer an ask | 5 | **4** | To do › To approve › *Answer* › Approve |
| J8 quarter's profit | 4, two conflicting margins | **3–4**, one named margin | Reports remembers Finance; period select |
| J9 sync Xero | 4 (7 first time) | 4 (**5** first time) | Xero tab › Sync now; connect in place |
| J10 log a claim on site | ≈12, receipt last | **≈9**, receipt first | ⌘K glyph › *Log an expense* in the empty search (2 to reach the form instead of 5), photo first, then project · category · *I paid* · Log — or More › Company › Finance (To do) › *Log an expense* (4) |
| J14 my commission | 4 | 4 | My commission |

### 6.12 House pieces it is built from (nothing hand-rolled)

`CompanyShell` + `Tabs` · `CreditsTable` (the listing's table model, cards on a phone) · `Chips` / the chip rail · `ScopePill` ·
`PortalMenu` + `DropdownItem` (row ⋮) · `CostPanel` and every existing dialog in `useCosts` · the Money tab's payment steps
(`usePayments`: confirm, remind) · `StatTile` (Commission only) · `EmptyState` · `HelpLink` (the Reports door) · `TextField mode="select"`
(Reports on a phone) · the bell's `?open=` contract. New code is one orchestrator for To do that **reads** the summaries the server already
builds (`costsOf`, `moneyOf`, `commissionsOf`, `xeroItems`) — no new numbers.

### 6.13 Keep exactly as it is

- The record tables' grammar — one word of status + its reason underneath, the next step as the row's button, the rest in ⋮
  (`cost-tables.tsx`); the side panel with its history (*i-po008-panel-1440*).
- The PO dialog with **Add from the quote**, the advance and terms chips (*i-new-po-1440*); the bill reader and duplicate check
  (*i-new-bill-1440*); Undo after every step; the soft rules said in their own words.
- The vendor's PO link (*po-link-390*) — clean, phone-first, one action.
- The vendor directory with Merge (*i-vendor-panel-1440*); Settings › Finance › Costs (house event-table grammar).
- The role rules (F1-Q3, F2-Q8): only Owners and Admins approve and pay; members see their own records and never a total.
- Reports as the one home for numbers (REG-1361) and Integrations as the home of the Xero connection (N-09) — the proposal only adds doors.

### 6.14 His calls (to decide before anything is built)

1. **To do as Finance's landing for everyone**, replacing Overview (and for Designers replacing *Purchase orders*).
2. **Collect rows in Finance** — client invoices overdue / ready / payments to confirm listed (not owned) in Finance, opening the project's
   Money. Does that fit "Finance is the work only" (N-01)? (The Overview already lists payments to confirm and ready invoices.)
3. **Money out as one tab with a kind switch** vs keeping four tabs.
4. **Pay a member** across their projects in one dialog (a new behaviour; today pay is per project line).
5. **"Xero"** as the tab name; Connect acting in place.
6. **Settings › Money** (moving the money-in cards from Settings › Projects).
7. The **Company badge** counting money approvals.
8. The **number fixes** of 6.7 / 6.9 (they change figures studios have seen in demos: 87.7 % → a lower margin, S$15,477 → S$1,400 overdue).
9. Whether To do later becomes the money half of the held **Dashboard** (N-02).
