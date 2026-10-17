# F2 — money out: the books · the short read (gaps build, Phase B, 2026-10-07)

Package F2 (port 3127, repair R84, probe `verify-pj-gap-f2.cjs`). The owner's instruction stands: "looks good to me. Please go ahead and build
everything" (the report *Projects — what 2.0 is still missing from 1.0*, M-01…M-09 as recommended; **M-08: money out first**). The books were set
aside by Q-20 ("cost, profit, commission: Owner and Admin when they come"), Q-21 (commission held for money out), Q-30 (no metered press in
Projects), Q-35 (money out and the books, reports, accounting links), F-01 · F-19 (no studio-wide money list until money out), F-09 (no credit notes
in this build — "S$x to credit" shows instead) and F-16 (no Accounting role) — that "later" is now. F1 (the costs) is merged: `costsOf` is the one
set of numbers for money out, `moneyOf` for money in; F2 builds on both and recomputes neither.

Read: inventory `projects-1.0-inventory/G-finance-tab.md` §3 cockpit (G-40…G-99), §4 mAIson Insights (G-100…G-109), §11 credit notes
(G-335…G-337) and the rebalance's draft credit note (G-194 · G-202), §16 profit and margin (G-434…G-486), §17 touchpoints (G-487…G-492), commission
(G-318 · G-458 · G-475 · G-483 · G-492); the reviewer's `26-…/4-finance.md` (rows "Credit notes", "An Accounting role", "Studio-wide money",
"Finance reports", "Commission accrual and splits", "mAIson Insights", "Profit and margin, everywhere", and "Things the inventory missed": Xero, the
working-capital widget, comparative analytics) and `7-coverage.md` (rows for `src/lib/accounting/**`, commission rules, studio-wide finance); 1.0 code
`src/lib/accounting/README.md`, `src/lib/commissions-fan-out.ts`, `src/lib/finance/commission-summary.ts`, `src/app/(main)/accounts/page.tsx`
(Commission & Payouts editor, 2084–2754), `src/app/(main)/finance/commissions/page.tsx`, `src/app/(main)/finance/reports/page.tsx`,
`src/components/finance/working-capital-widget.tsx`, `credit-note-dialog.tsx`.

## 1. What 1.0 does (what a studio uses)

**Profit and margin** (G-48 · G-82 · G-464 · G-476): *Projected profit* = contract value − (committed POs + approved expenses + bills), both sides
including GST; % of contract to one decimal; **Healthy ≥ 20% · Tight 10–20% · At risk < 10%**; *Early estimate* (grey, no tier) while costs are
above zero and under 10% of the contract; "Awaiting cost data" with no cost; "Needs a signed quote" with no contract. *Cash so far* = collected −
(paid to vendors + expenses), "Studio-funded" when negative (G-51). The drawer's three more readings (optimistic, accrual, cash, G-85) and the
Overview card's Expected / Actual profit (G-434…G-437) sit beside it — four or five "profits" for one project (G-484).

**mAIson Insights** (G-100…G-109): a press sends the invoices, POs, VOs and expenses to Gemini for 3–5 insights (optimisation · warning ·
opportunity · action) and a summary, per sub-tab. With no key it returns canned figures ("S$24,500 in overdue invoices…") as if they were the
project's (G-107). Its neighbour, *Margin alerts*, is rules: margin < 20% of billed, PO cost overrun > 5% of the quoted amount, overdue invoices,
VOs > 10% of the base, costs > revenue (G-86).

**Commission** (G-318 · G-492, accounts page 2084–2754, commissions page): a studio default rate (% on *revenue* or on *profit*), overrides per
designer, per project, per project and designer; a rule is % or a fixed amount, triggered *on each milestone payment* or *once per project*; the rule
picked in the order project + member → project → member → studio; each client payment adds an accrual, split between the project's assignees by
their shares (`commission_split_bps`, floored, never normalised); entries pending → payable → paid (or voided; negative adjustments for clawbacks);
the Owner records a payout with a reference number; a designer submits a *commission change request* (a project, a rate, a reason) the Owner
approves (editing the rate first if they like) or rejects with a reason; "My Commissions" for the designer; Reports › Commissions by member, by
project and a change log.

**Credit notes** (G-335 · G-336): *Issue Credit Note* against a sent / part-paid / paid / overdue invoice: a reason, an amount before GST, GST at the
invoice's own rate, numbered `CN-{year}-{000}`, issued at once, counted toward the invoice's "credited"; the client sees "Credits issued". The
rebalance also writes a *draft* credit note when an omission is bigger than the unsent invoices (G-194).

**Studio Finance** (G-487 · G-489, working-capital widget): Operations › Overview with *Working capital* — Owed to you · You owe · Net position —
and *Stuck in draft* (unsent invoices · draft POs), a verification queue of payments and expenses (bulk Verify); Pipeline — project cards and PO
cards by stage.

**Reports** (G-491, reports page): P&L (revenue · costs · net profit · margin, costs by category), Tax (output / input), AR aging, AP aging,
Profitability (per project: invoiced, costs, margin; avg margin), Cash Flow (inflows · outflows · net, a forecast), Vendor Spend (committed · paid),
Commissions (members · outstanding · paid; by member, by project, change log), Statement (one project's transactions, a running balance), Revenue
(by month, YoY), Expenses (total · GST paid · reimbursements), Comparative (completed projects by property type, designer, budget range); a period,
an entity filter, multi-currency.

**Xero** (`src/lib/accounting/**`, ~4,600 lines; the settings tab): OAuth connect, pick the organisation (one connection per legal entity), map
accounts and tax codes (auto-map: by percentage, then sales / purchase side, then name), backfill, push contacts, invoices, credit notes, payments,
bills and expenses (push only; *unapproved money is never pushed*), a durable queue with retry and backoff, an activity log with *Retry*, a
"connection expired" alert.

## 2. What 1.0 got wrong or never finished (not carried)

- **Four or five profits for one project** (G-484), mixing tax bases (G-485), alerts judging billed-so-far while the tile judges the contract
  (G-91), a "commission basis" sentence that is not the commission's basis (G-483). → one profit: contract − committed, `costsOf` and `moneyOf`.
- **No profit hidden by role** (G-482): a Designer saw contract, costs and margin. → Q-20 on the server.
- **AI insights with made-up numbers** (G-107) and an AI call per sub-tab visit (G-108). → rules over the real records, no press (Q-30).
- **Commission**: the UI said "on milestone completed" while the server accrued on payment (accounts page comment); the profit rule read a
  different revenue base, drafts as costs and only "approved" expenses (G-458 · G-475 · G-483); splits not adding to 100% "honoured as-is"; a
  stored accrual never moved back when a payment was reversed; approving a change request promoted the project to Design. → accruals worked out
  from the counted payments and the one profit; shares always add to 100%; a reversed payment takes its commission back.
- **Credit notes**: the dialog had no opener and no list (G-337), no role and no ceiling (G-336), the draft credit note no home (G-202). → issued
  from the invoice and the "to credit" band, never more than the invoice, Owners and Admins.
- **Pipeline** cards opened two different places (G-489); the verification queue a third approval track (F1 dropped it).
- Not carried: multi-currency and FX (Singapore studios, SGD), the Tax report's filing view (the GST lines live in P&L), Revenue YoY and
  Comparative by budget range (Profitability *by type and by designer* covers the comparison a studio uses), QuickBooks / Zoho (never live in 1.0),
  the durable queue, backoff and cron (the prototype simulates the connection the way Integrations' Gmail does).

## 3. The calls (each **as recommended — set on the owner's instruction of 2026-10-07**)

| # | Call | As built |
|---|---|---|
| F2-Q1 | Where the books live | Finance gains **Overview** and **Pipeline** first (Owners and Admins — the rail's Finance lands there for them, on Purchase orders for everyone else), then F1's lists, then **Commissions** (everyone: Owners / Admins see the studio's, a member their own), **Reports** and **Accounting** (Owners and Admins). On a project: the Money tab's Costs half gains **Profit · Margin · Cash so far** and *What the numbers say* (Owners and Admins); the Overview's Money card a Profit line; the projects listing a **Margin** column (Column settings, off at first; Owners and Admins). Credit notes live with their invoice on the Money tab. Settings › Finance gains **Commission** and **Credit notes** cards. |
| F2-Q2 | Profit and margin (Q-20) | **Profit = contract value − committed costs** (`moneyOf` · `costsOf`; both include GST, as the contract value does). **Margin** = profit ÷ contract, one decimal. **Healthy ≥ 20% · Tight 10–20% · At risk < 10%** (a loss is At risk). No contract → "--", *Needs a contract value*; no committed cost → *No costs yet* (never a 100% margin); costs under 10% of the contract → the amount without a tier, *Early estimate*. **Cash so far** = collected − paid out (*The studio is funding it* when below zero). One profit, not 1.0's five; worked out and sent **only to Owners and Admins**, on the server. |
| F2-Q3 | Insights (Q-30) | *What the numbers say*: **rules over the real records**, no press and no AI credits: costs above the contract · margin At risk / Tight · a PO costing more than the client pays for its lines · paid out more than collected · overdue invoices · variation orders adding over 10% · an invoice ready for over a week · a signed project with no cost logged · bills overdue. Worst first, five shown, each opening its record; nothing stands out → "Nothing stands out — the numbers look healthy." Owners and Admins; Finance › Overview lists each project's worst. |
| F2-Q4 | Commission rules | Settings › Finance › **Commission** (Owners and Admins): the studio's rule — **No commission** (the start) · **% of what the client pays** · **% of the profit** · **A fixed amount per project**; overrides **for a member**, **for a project**, **for a member on a project**; the first that fits in that order: member on the project → project → member → studio (1.0's). A changed rule applies **from the day it changes** — earlier payments keep the rate they earned (rules are kept as versions). Worked out **before GST**. Who earns: the project's team, **equal shares** to start; an Owner or an Admin changes a project's shares (they always add up to 100%). |
| F2-Q5 | Accrual — one set of numbers | Worked out, not stored (`commissionsOf`, pure): **% of payments** → each payment that counts on the contract's invoices (a one-off is outside the contract and earns none), before GST; **% of the profit** → the rate × the profit before GST × the share of the contract collected — an estimate that moves with the costs until the project is **Completed**, then fixed; **fixed** → once, with the project's first counted payment. A reversed or *Not received* payment takes its commission back. **Earned · Paid · Owed** (Owed = earned − paid, never below zero; *Paid ahead* when a profit estimate fell). |
| F2-Q6 | Payouts | Owners and Admins **Pay commission**: an amount (what is owed, to start; never more), paid on, how (F-10's four), reference, note; **Undo** right after, **Reverse** later with a reason. The member is told (bell). Table `commission_payouts` — not a cost of the project's (profit is contract − costs, the brief's rule). |
| F2-Q7 | Change requests | A member on a project's team **asks for a different rate** on it (a rate, a reason; one open ask per member and project); an Owner or an Admin **Approves** (may change the rate) → a rule for that member on that project from today — or **Declines** with a note; each side is told. No stage moves (1.0's "Project promoted to Design" not carried). |
| F2-Q8 | Who sees commission | Owners and Admins: everything. **A member sees their own** — their rate on each project, earned, paid, owed, their asks — never another member's and never the project's profit (a profit rule reads "% of the profit", the amount only). Q-20 holds for cost and profit figures. |
| F2-Q9 | Credit notes | Against a **sent invoice** (not void): a **reason** (required), an **amount including GST** (never more than what the invoice has left to credit), **GST split out at the invoice's own rate**; numbered **CN-{YYYY}-{seq}** when issued (Settings › Finance › Credit notes, the invoices' numbering model). **Owners and Admins** issue (F-18's rule, as Void). Issued at once with **Undo**; later **Void** with a reason (it stays on the record). It lowers what the invoice is owed (paid + credited ≥ amount reads Paid) and the "to credit" figure; paid beyond what is left → **to refund** ("Record the refund": paid on, how, reference). The **"S$x to credit" band offers it**, filled in (the newest sent contract invoice, the amount it can take, the reason "Contract adjustment — VO-n"). **The client sees it**: a paper of its own (printable, the invoice's letterhead), on the portal's Money page under its invoice, in Files › Payments (a `lead_files` row, as receipts), and on the client's bell. |
| F2-Q10 | Finance › Overview (G-487, the widget) | Owners and Admins: **Working capital** — Owed to you (clients' outstanding) · You owe (vendors and claims) · Net position · Cash so far; **Money to verify** — client payments to confirm, trusted proofs not checked, POs and expenses waiting for approval; **Stuck** — invoices ready to send for over a week, PO drafts over a week old, supplier bills overdue, commissions asked; **What the numbers say** — each project's worst insight. Every row opens its record. |
| F2-Q11 | Finance › Pipeline (G-489) | Owners and Admins: each project (not deleted) with its stage, contract value, invoiced, collected, committed, profit and margin tier, on the listing's table model, stage chips (All · Setting up · In progress · Completed · On hold); four tiles — Contract value · Left to invoice · Owed to you · Committed. A row opens the project's Money. |
| F2-Q12 | Reports (Q-35) | Finance › Reports (Owners and Admins), a report and a period (This month · Last month · This quarter · This year · Last year · All time): **Profit and loss** (revenue from invoices sent, costs committed, both before GST; by kind and by category; profit, margin) · **Owed to you (AR aging)** (current · 1–30 · 31–60 · 61–90 · over 90 days) · **You owe (AP aging)** · **Profitability** (by project · by project type · by designer) · **Cash flow** (by month: in, out, net; the next 90 days expected) · **Vendor spend** · **Commissions** (by member, by project) · **Client statement** (one project: invoices, payments, credit notes, a running balance). Each exports through the house **Export** (CSV · XLS · XLSX · PDF). One set of numbers: every report reads `moneyOf` · `costsOf` · `commissionsOf`. |
| F2-Q13 | Xero (Q-35, simulated) | Finance › **Accounting** (Owners and Admins; Company › Integrations' Xero row links there): **Connect Xero** (the sign-in is simulated, Gmail's way) → **pick the organisation** per issuing entity (1.0: one connection per legal entity) → **accounts and tax** with *Auto-map* (by rate, then sales / purchase side) and a change per row → **Sync now** pushes contacts (clients, vendors), invoices sent, credit notes, payments that count, bills, approved expenses and payments out — *unapproved money is never pushed* — each once, again when it changed; a row with no mapping fails with the reason and **Retry**; *Push automatically* (the switch) runs a sync after each money step in this demo; the **sync log** lists every push; **Disconnect** keeps the log. Bell: *Xero needs you* (a failed push). No real OAuth or HTTP — the developers plug Xero into the same records. |
| F2-Q14 | An Accounting role (F-16) | **Not added.** Owners and Admins run money (every F1 / F2 rule is theirs); a studio's bookkeeper works in Xero, where the books arrive, and from the reports' exports. A role would re-cut every money rule for no use the studio has once the sync exists. Held, as F-16 held it. |
| F2-Q15 | What tells whom | Bell: *A commission rate is asked* (Owners · Admins) · *Your commission ask is answered* (the member) · *Your commission is paid* (the member) · *A credit note is issued* (the project's team; the client's own bell on the portal) · *Xero needs you* (derived, Owners · Admins). Activity: credit note issued / voided / refunded, commission paid (money lines — hidden from whoever doesn't see the money). Search: credit notes by number (Finance scope) and the five new Finance pages. |
| F2-Q16 | Phone | Every table is the house table (a card a row); Finance's tabs scroll; tiles two-up; dialogs rise as sheets; reports read as cards with the export in the bar. |

## 4. Numbers and words

- Tiers 20% / 10%; Early estimate under 10% of the contract; insights' thresholds: PO over the client's price for its lines, VOs > 10% of the
  base, ready > 7 days, PO drafts > 7 days.
- CN-{YYYY}-{seq} (3 digits), Settings › Finance › Credit notes (prefix · next · digits · year).
- Commission: none by default; demo rule 3% of what the client pays (R84), before GST at the studio's rate (9%).
- Aging buckets: current · 1–30 · 31–60 · 61–90 · over 90 days past the due day.
- Every word not in a mock or a call is *(invented copy)* in `reg-f2.md`.
