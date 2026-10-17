# F1 — money out: the costs · the short read (gaps build, Phase B, 2026-10-07)

Package F1 (port 3126, repair R83, probe `verify-pj-gap-f1.cjs`). The owner's instruction stands: "looks good to me. Please go ahead and build
everything" (the report *Projects — what 2.0 is still missing from 1.0*, calls M-01…M-09 as recommended; **M-08: money out first among the later
modules**). Money out was set aside by Q-35 / F-01 / F-19 ("later") and Q-20 ("cost: Owner and Admin when it comes") — that later is now.

Read: inventory `projects-1.0-inventory/G-finance-tab.md` §3 (cockpit money-out rows G-50 · G-51 · G-57 · G-58 · G-81 · G-84), §12 POs
(G-338…G-389), §13 Expenses (G-390…G-420), §14 Bills (G-421…G-431), §17 Vendors (G-490); the reviewer's `26-…/4-finance.md` (rows "Purchase
orders and the vendor's side", "Expenses", "Supplier bills", "Vendors directory", "Money out on the cockpit", and "Things the inventory missed":
vendor merge, transaction history, the vendor drawer); 1.0 code `src/app/(main)/finance/vendors/page.tsx`, `src/components/finance/vendor-detail-drawer.tsx`,
`vendor-merge-dialog.tsx`, `src/app/api/vendors/records/[id]/merge/route.ts`, `src/app/po/[token]/page.tsx`, `CreatePODialog.tsx`, `PODetail.tsx`,
`ExpenseDialog.tsx`, `bill-review-dialog.tsx`, `L/po-lifecycle.ts`.

## 1. What 1.0 does (what a studio uses)

**Vendors** (Finance › Vendors, G-490 + the uninventoried drawer): name, company, trade, phone, email, kind (supplier · brand · both), a default
markup, bank (bank, account number masked, holder), notes, active / inactive; a vendor added in place from a PO or an expense picker ("an ID can
quick-add a vendor mid-PO but cannot reach the directory"); **merge** a duplicate into the one that stays — POs, expenses, price book and quote
lines repointed in one transaction, the duplicate deactivated, the exact name typed to confirm, a write-free preview of what moves, and a warning
that the duplicate's phone / bank are NOT carried; a transaction history per vendor; committed / outstanding per vendor from the vendor-spend report.

**Purchase orders** (§12): a PO on a project to a sub-contractor or supplier; lines (description · category · unit price · qty · milestone) with a
type-ahead "from the project quote" and "Add n items from quote" for the vendor's tagged lines; delivery and billing address, expected delivery,
payment terms (COD · Net 15 · Net 30 · Net 60 · Custom), an advance (% or fixed, which forces accounts review), a "quoted amount" and its margin
impact, "Compare with quote" (AI). Flow: Draft → (Pending review, when the studio's thresholds or an advance say so; Owner / Accounting approve or
reject) → Approved → *Issue PO* (counts as vendor-accepted at once, stamps the issue day, works out the payment due day from the terms, makes the
vendor's link `/po/{token}` and emails the vendor) → payments (advance, then standard; never more than the balance) → closes itself when paid in
full; side exits: the vendor asks for changes / rejects on the link, Cancel with a reason, Delete a draft, Duplicate, PDF, an activity timeline.
Totals: subtotal = Σ lines, GST always added at the region's rate, PO-{0000} per entity.

**Expenses** (§13): logged on a project or as studio overhead — amount, date, GST tick, up to five receipts (Browse · drop · *Snap receipt*),
category (from the studio's categories, overhead ones marked), vendor, *Reimbursement claim*, *Recurring*, notes; approval unless the studio
switched it off or the recorder is Owner / Admin (approve · reject with a reason · partial); a reimbursement track (pending → approved /
rejected); a third "verification" track (ID → management); the recorder edits / deletes only while unresolved; a phone's *Quick Expense* sheet.

**Supplier bills** (§14): recorded only in Studio Finance › Purchases — drop the supplier's invoice (PDF / image / CSV / XLSX, 10 MB), an AI reader
fills supplier · invoice no. · issue and due dates · subtotal · GST · total · lines with confidence marks, then a supplier (required) and a project
or the Overhead tick; a duplicate check (same supplier + number, or same supplier + amount within 30 days → "Record anyway"); no approval step;
status worked out (Unpaid · Part-paid · Paid · Overdue); a bill counts as a committed cost at once; paid from the studio list ("Pay").

**Money out on the project** (§3): *You owe* = committed POs − paid; *Cash so far* = collected − (vendor payments + expenses); a Money out card
(committed vs paid bar, POs · Expenses · Bills); *Where costs go* (committed PO spend by category); "No POs issued yet" and the cost-overrun issue.
Committed = issued POs + approved expenses + every bill (G-81).

## 2. What 1.0 got wrong or never finished (not carried)

- **No role checked on any PO action on the server** (G-381); a member could approve their own expense or claim (G-417). → every rule on the server.
- **Bills counted twice**: a bill against a PO and the PO both counted as committed (G-81 adds them). → a bill against a PO is the PO's money; only
  what it bills beyond the PO adds.
- "Approve & Issue" only approved (G-380); "Save & Approve" skipped the thresholds (G-386). → one send path, one rule.
- GST always added, also for a vendor who charges none (G-388). → GST follows the vendor's *Charges GST*.
- The bill's read supplier name not connected to the supplier picker (G-430); a bill can't be added, opened or paid from the project (G-429). → the
  read name finds the vendor (or offers to add it); bills live on the project too.
- A PO's activity names nobody (G-382); the GRN / delivery dialogs were never opened (G-379); Quick Expense's photo never uploaded (G-418); three
  tracks of approve / reject on one expense (G-419); totals that disagree with the Overview (G-378, G-416). → one set of numbers (`costsOf`).
- Merge dropped the duplicate's phone, email and bank (warned, not carried). → the one that stays takes what it lacks.
- Not ported: GRN / delivery records (never reachable), the verification track (F-16: no Accounting role — Owners and Admins run money), recurring
  expenses (no scheduler in the prototype), "Compare with quote" by AI (Q-30: no metered press; the quote match is exact, by the line it came from).

## 3. The calls (each **as recommended — set on the owner's instruction of 2026-10-07**)

| # | Call | As built |
|---|---|---|
| F1-Q1 | Where money out lives | The project's **Money** tab gets a **Costs** half under money in (the house sections: tiles, Purchase orders · Supplier bills · Expenses). The studio-wide lists live under a **Finance** rail item (F-01): **Purchase orders · Bills · Expenses · Payments out · Vendors** tabs on Company's frame. `/finance` lands on the first tab (`lib/finance/sections.ts` FINANCE_TABS — F2 appends its own). G F goes there. Settings › Finance (an inert tab until money out) goes live with the Costs card. |
| F1-Q2 | Who sees costs (F-17 · Q-20) | The Costs half is shown to whoever sees the project's money (the team, their Managers, Owners, Admins), so the team raises POs, records bills and logs expenses for their project. **The cost figures — the tiles Committed · Paid · You owe, the PO's "against the quote" margin, the vendors' balances — are Owners' and Admins'** (Q-20). A Designer sees each record they work with and its own amount, never a total. A viewer refused the money sees no cost line in Activity, search or Finance. |
| F1-Q3 | Who may do what | **Prepare a PO**: the project's team (`worksOn`). **Approve a PO** (over the limit or with an advance): Owners and Admins; theirs goes at once. **Record a supplier bill**: the project's team on their project, Owners / Admins anywhere (overhead too). **Log an expense**: anyone — on a project they work on, or as studio overhead. **Approve an expense**: Owners and Admins. **Pay** (a PO, a bill, a claim) and **reverse a payment out**: Owners and Admins (F-16: no Accounting role). **Vendors**: anyone adds one (from a picker or the directory) and sees names, trades and contacts; **changing, deactivating, merging and the bank details** are the Owners' and Admins'. Every rule on the server, `{ error: <rule> }`; *Who may do what* rows. |
| F1-Q4 | Vendors | A studio directory: name (unique among active vendors, case-blind), trade (the studio's trades), contact person, mobile (WhatsApp), email, UEN, *Charges GST*, bank (bank · account name · account no.) and PayNow, notes; active / inactive (Deactivate with Undo; Reactivate). No "brand" kind and no default markup (that is the Price book's). **Merge** a duplicate into the one that stays (Owners / Admins): its POs, bills, expenses and payments out move, the price book's and the quotes' vendor names follow, the one that stays takes the details it lacks (phone, email, UEN, bank, PayNow), the duplicate is kept as merged; one sentence with **Undo**. Each vendor shows its POs, bills and payments; Owners / Admins see Committed · Paid · Owed. |
| F1-Q5 | A PO's life | Stored: `draft · sent · closed · cancelled`, its stamps say the rest. Words: **Draft · Waiting for approval · Sent back · Sent · Accepted · Changes asked · Declined · Part paid · Closed · Cancelled**. Numbered **at creation** `PO-{YYYY}-{seq}` (Settings › Finance › Costs, the quotes' numbering model; an internal number, a deleted draft's number is not reused). **Send** = WhatsApp to the vendor's mobile with the no-login link, opened on the press (REG-534), the payment due day worked out from the terms at the send. **The vendor answers on the link** — Accept, Ask for changes (a note), Decline (a note) — or the studio marks the vendor's yes given on the phone (*Mark as accepted*). Changes asked or declined → Edit puts it back to a Draft to send again. **Closes by itself** when paid in full; an Owner / Admin may close it short with a note (what is left is not owed); Cancel (before anything is paid) with a reason and Undo; Delete a draft with Undo; Duplicate. |
| F1-Q6 | A PO's approval | Settings › Finance › Costs: *POs over a limit need approval* — on, **S$5,000** (incl. GST) by default; **an advance asks too** while the rule is on (1.0's rule). A Designer's or a Manager's PO over the limit is *Submitted*; an Owner / Admin **approves and sends** in one press (the invoices' way, F-05) or sends it back with a note. One path — no "approve then issue". |
| F1-Q7 | A PO's lines and the quote | Lines: description · trade · qty · unit · unit price (before GST) · amount (the record keeps a milestone per line for later; no picker yet). **Add from the quote**: the signed quote's lines by trade, the vendor's own lines first (the quote line's Vendor/Sub), ticked → a line each at the quote's **cost** (qty, unit, trade), editable. 1.0's three-letter type-ahead is not carried — the picker covers it. Against the quote (Owners / Admins): "The client pays S$x for these lines; this PO leaves S$y (z%)". GST is added only when the vendor **charges GST** (ticked from the vendor, changeable). |
| F1-Q8 | Terms, advance, due | Terms **COD · Net 15 · Net 30 · Net 60 · Custom** (default Net 30, Settings); due = the send day + N (COD = the send day; Custom = no day worked out, the words print). An advance: none · % · a fixed amount, never more than the total; the first payment on a PO with an advance is the advance. Expected delivery and the delivery address (the project's address to start) print on the PO. |
| F1-Q9 | The vendor's link | `/po/{token}` opens without signing in (Q-40's rule — no portal): the PO on the issuing entity's letterhead (the signed quote's entity, the invoices' `letterheadOf`), Download, and the three answers; a cancelled or deleted PO says so (the house LinkNotice). Viewing stamps *Viewed*. |
| F1-Q10 | Supplier bills | Recorded **on the project** (the Money tab) or **in Finance › Bills** (a project, or *Studio overhead*): vendor, their invoice no., issued, due, subtotal · GST · total (they must add up), optional lines, a PO of that vendor on that project, a note, the bill's file. **Reading the file** (no AI credits, Q-30): a PDF is read for real in the browser (pdf.js's text, `lib/pdf-text.ts`) and a curated reader takes the supplier, number, dates, amounts and lines from it; a photo or an unreadable PDF opens the form empty ("Couldn't read this one — enter it below"); every read field says so until it is changed. The read supplier finds its vendor (name or UEN) or offers *Add {name} as a vendor*. **Duplicate check** on the server (same vendor + number, or same vendor + total within 30 days) → *Record anyway*. No approval step (1.0's). Status worked out: **Unpaid · Part paid · Paid · Overdue**. Edit / remove while unpaid (Undo). |
| F1-Q11 | Expenses | Amount (incl. GST) with *Includes GST* · the day · category (a fixed list in this build: Materials · Site supplies · Transport · Labour · Equipment · Meals · Office · Software · Marketing · Utilities · Other) · what for · a project or *Studio overhead* · **Who paid**: *The studio* or *I paid — claim it back* (Owners / Admins may log a claim for another member) · vendor (optional) · up to **five receipts** (a picture or a PDF; *Take a photo* on a phone) · note. **Approval** (Settings, on by default): a Designer's or a Manager's waits for an Owner / Admin (Approve · Send back with a note); an Owner's or an Admin's counts at once. The maker edits / removes while it waits or was sent back; Owners / Admins until it is reimbursed (Undo). One approval track — no verification track, no partial amount (a different amount is a send-back with a note). No recurring expenses. |
| F1-Q12 | Payments out | One dialog for a PO, a bill and a claim: amount (what is owed, to start; never more), paid on, how (bank transfer · PayNow · cheque · cash — F-10's four), reference, note, the transfer's screenshot (optional). Owners / Admins; **Undo** right after, **Reverse** later with a reason. A bill against a PO pays the PO too. A claim paid in full reads **Reimbursed** and tells the member. Finance › Payments out lists them. |
| F1-Q13 | One set of numbers (`lib/finance/costs.ts` `costsOf`, pure) | **Committed** = live POs from Sent on (a closed one: what was paid) — a PO with bills beyond its total counts its bills — + bills with no PO + approved expenses. **Paid** = payments out not reversed + approved expenses the studio paid itself. **You owe** = committed − paid (a sent PO's unpaid balance, unpaid bills, approved claims not yet paid back), **overdue** = what is past its due day. Drafts and POs waiting for approval are the *pipeline*, never committed; changes asked / declined / cancelled count nothing. `byCategory` (trade / category) and the per-vendor sums are there for F2 (profit, Where costs go, vendor spend). |
| F1-Q14 | Documents | A bill's file and an expense's receipts stay **with their record** (table `cost_documents`, bytes as E's data URLs, served through E's `sendStored` at `/finance/doc/{id}`, only to whoever may see the record) — not in the project's Files, which the client shares in; costs never reach the client. |
| F1-Q15 | What tells whom | Bell: *A purchase order needs approval* (Owners · Admins) · *Your purchase order is sent back* (its maker) · *A vendor answers a purchase order* (its maker and the team) · *An expense needs approval* (Owners · Admins) · *Your expense is answered* (its maker) · *Your claim is paid back* (the member) · *A supplier bill is due* (derived: three days before and overdue — Owners · Admins). Activity lines on the project for every PO, bill, expense and payment-out step (money lines, hidden from whoever doesn't see the money). Attention: *A vendor asked for changes / declined PO-n*. Studio search: vendors, POs and bills (a *Finance* scope), the Finance pages and three *Create* rows. |
| F1-Q16 | Phone | The Costs half and every Finance list are the house tables (cards on a phone); dialogs rise as sheets; an expense's *Take a photo* opens the camera; the vendor's link reads on a phone first. |

**Left to F2** (by the brief): profit and margin, commission, reports, credit notes, Xero, the studio Finance overview. The records are shaped
for it: every cost row carries its project (or none = overhead), vendor, trade / category, its amounts before and with GST, its dates; `costsOf`
gives committed / paid / owed / pipeline / byCategory / byVendor.

## 4. Numbers and words

- PO-{YYYY}-{seq} (3 digits), Settings › Finance › Costs (prefix · next · digits · year). Approval limit S$5,000 incl. GST. Default terms Net 30.
- GST rate = the studio's (Settings › Studio GST, 9%); a vendor's *Charges GST* off → none.
- Every word not in a mock or a call is *(invented copy)* in `reg-f1.md`.
