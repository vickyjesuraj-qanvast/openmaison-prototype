# G — 1.0 Projects: the Finance tab

Reader G of twelve. Source: OpenMaison 1.0, repo `qanvast-id-tool`, branch `integ/security-non-qanvast` @ `620190192`, read only (nothing run). Read in full: the Finance tab of the project page (`src/app/(main)/projects/[projectId]/page.tsx` lines 3271–4037, its state and handlers at 637–908 and 1309–1342, the tab strip at 1871–1884, the page-level dialogs at 4781–4848, `ContractFileCard` 4868–5017 and `MaisonInsightsPanel` 5058–5130); every component the tab mounts in `src/components/finance/` (the `overview/` cockpit pieces, `ProjectFinanceSummary`, `quotes-table`, `variation-orders-section`, `vo-editor/*`, `InvoiceList`, `InvoiceDetail`, `invoice-drawer`, `action-drawer`, `milestone-picker-dialog`, `invoice-composer-dialog`, `adhoc-invoice-composer-dialog`, `invoice-pdf-digitizer-dialog`, `invoice-editor`, `GenerateInvoicesDialog`, `PaymentScheduleEditor`, `RecordPaymentDialog`, `payment-drawer`, `payment-pickers`, `credit-note-dialog`, `project-receipts-section`, `receipts-table`, `POList`, `PODetail`, `CreatePODialog`, `CancelPODialog`, `POActivityLog`, `RecordPOPaymentDialog`, `record-delivery-dialog`, `quote-compare-panel`, `ExpenseList`, `ExpenseDialog`, `expense-drawer`, `project-verification-banner`, `verification-queue`, `project-bills-section`, `bills-table`, `bill-review-dialog`, `UploadExternalDocDialog`, `metric-helpers`, `three-margin-strip`, `category-breakdown`, `money-status-dots`, `entity-select-field`); `src/components/projects/` (`financial-summary-card`, `financial-attention-block`, `variance-resolution-dialog`, `milestone-payment-structure-dialog`, `quick-expense-sheet`); all of `src/lib/finance/*` that the tab reaches, `finance-utils.ts`, `financial-issues.ts`, `milestone-payments.ts`, `po-lifecycle.ts`, `lifecycle-aggregates.ts`, `commission-split.ts`, `paynow-qr.ts`, `queries/variation-orders.ts`, `queries/purchase-orders.ts`, `queries/project-aggregates.ts` (summary part); the API routes the tab calls (milestone / ad-hoc invoice, variance, send, approve, payment, verify, reject, rebalance, generate-invoices, auto-milestone, invoice PATCH, overdue-reminder, PO action, expenses create / decision, margin-analysis, financial-summary, quote transition, credit notes, contract upload); and the four docs. Skimmed (not read line by line): `MilestoneCompletionDialog`, `vendor-picker`, `RecordGRNDialog`, `BrandedDocumentView`, the 10,830-line quote builder (only its `isVariation` branches), the finance rail pages and the public `/pay` · `/po` pages.

Path shorthand used in citations: **PAGE** = `src/app/(main)/projects/[projectId]/page.tsx` · **F/** = `src/components/finance/` · **P/** = `src/components/projects/` · **L/** = `src/lib/` · **A/** = `src/app/api/`.

## Bottom line

- **Seven sub-tabs, not five.** Overview · Contract/VO · Invoices · POs · Expenses · Bills · Receipts. The tab label reads "Finance (n)" where n = this project's invoices that are neither paid nor void (drafts count). The tab shows to every role whenever the platform page is on; the `finance.*` role permissions exist but nothing in the tab checks them, so a designer sees contract value, costs and profit.
- **One money model worth porting.** Contract value = signed quote (else primary approved quote, else the budget field) + approved client VOs. Payment milestones each bill a % of that total, with GST split *out* of the slice. One "rebalance" re-sizes the unsent draft invoices whenever a VO is approved or an invoice is over-billed; the agreed percentages never move.
- **Three sets of numbers for one project.** The Finance › Overview cockpit, the Overview tab's Financial Summary card, and the strips above the Invoices / POs / Expenses lists each define billed, committed, collected and cost differently. Owner-recorded expenses count in one and not in the other.
- **Invoices: strong server, thin screen.** Paid / partially paid are derived in the database from counted payments; every payment gets a numbered receipt. But the studio cannot edit an invoice, resend it, void a sent one, reverse a wrong payment or raise a credit note from any reachable screen, and "Save & Send" skips the approval gate.
- **VOs are quotes in "variation" mode.** Owner or Admin approval is final — the client never signs a VO. Approval moves the contract value at once and re-sizes the drafts. Omissions are credits; what the drafts cannot absorb becomes a draft credit note that no screen lists or issues.
- **Mounted but unreachable:** credit note dialog, invoice editor, record delivery, GRN, project financial report, bulk Generate Invoices, the "Collected" drill-down, the Client Portal link card. The homeowner's payment-proof image is stored and never shown to the studio.
- **Typed work is lost in four places:** ad-hoc "Capture as a Variation Order", the over-bill "Create the VO now", the phone's Quick Expense receipt photo, and "Upload Quote" (the file is saved and never listed).
- **Two broken issue paths:** "Resolve" on a variance issue in the Overview tab opens nothing (the wizard is mounted inside the Finance tab); "Accept as out-of-schedule" answers "✓ Variance resolved" while the issue stays open.
- **POs:** draft → pending review → approved → Issue PO (vendor counts as accepted at once, payment clock starts) → closed when fully paid. No delivery or GRN step in the UI. Approve / cancel / delete are gated in the browser only, and leave Admin out in places.
- **Server role checks are missing** on PO actions, expense decisions, payment verification, invoice creation and credit notes — any signed-in studio member can call them.
- **AI Insights can show made-up numbers.** With no AI key, or an unparseable reply, the route returns canned sample insights with S$ figures as if they were this project's. After the first press, every sub-tab visit fires another AI call.
- **Docs disagree with code** on the sub-tab count, the PO statuses, GRN, the VO status flow, the default payment split and credit notes (section 18).

---

## 1. The tab, its label, entry points and gates

### What it is / entry points

- **G-01** The project detail page has five top tabs in this order: "Overview" · "Management (n)" · "Finance (n)" · "Files & Docs" · "Activity". Finance uses the `Receipt` icon. `PAGE:1876-1882`
- **G-02** The Finance tab is added only when the platform config has the page `finance/operations` enabled; a key missing from the config counts as enabled. No role is consulted. `PAGE:1879`, `src/context/platform-config-context.tsx:46-51`
- **G-03** The count in "Finance (n)" is the number of this project's invoices whose status is neither `paid` nor `void`. Drafts, sent, partially paid, overdue and `cancelled` invoices all count. When the number is 0 the label is plain "Finance". `PAGE:1879`
- **G-04** No sub-tab carries a count. `PAGE:3414-3422`
- **G-05** The open tab and sub-tab live in the address: `?tab=finance&sub=<overview|contracts|invoices|pos|expenses|bills|receipts>`. The default sub-tab (`overview`) is left out. Changes are written with `router.replace(..., { scroll: false })`. `PAGE:647-650`, `PAGE:674-678`, `PAGE:894-908`
- **G-06** `?tab=finance&sub=invoices&focus=<invoiceId>` opens the Invoices sub-tab with that invoice row expanded, scrolled to and flashed. `PAGE:706-712`, `F/InvoiceList.tsx:90-101`
- **G-07** Ways in from elsewhere: the Overview tab's Key Files rail ("quote") switches to Finance › Contract/VO (`PAGE:2444-2449`); every issue in the Overview tab's attention list links to `/projects/{id}?tab=finance` (`L/financial-issues.ts:154,171,184,206,227,248,267,316`); Studio Finance › Operations "View Project →" and the Quotes table's project link go to `/projects/{id}?tab=finance` (`src/app/(main)/finance/operations/page.tsx:424`, `F/quotes-table.tsx:169-170`); a PO card on the Finance pipeline does the same (`src/app/(main)/finance/pipeline/page.tsx:518`).
- **G-08** A project in stage "Draft" is treated as not yet billable: `isDraftProject = p.stage === "Draft"`. `PAGE:1625`

### Rules — who sees money

- **G-09** The role model defines `finance.viewInvoices`, `createInvoices`, `recordPayments`, `managePOs`, `manageExpenses`, `approveExpenses`, `viewReports` (Admin or Accounting by default; false for a designer). These keys are used only by the role editor; no code in the Finance tab reads them. `L/access-control.ts:333-341`; usage search found only `src/components/accounts/role-editor.tsx:117-120`
- **G-10** Result: a designer ("id" tag) with access to the project sees the whole Finance tab — contract value, costs, projected profit, vendor balances — and every create button. The feature spec intended this ("Project Finance Tab: Y for id, assigned projects"). `docs/features/finance-module/spec.md:507-513`
- **G-11** The "View in Studio Finance" links inside each sub-tab lead to `/finance/operations`, which is allowed for Owner, Admin and Accounting only; a designer who follows the link is refused there. `L/access-control.ts:111`, `PAGE:3680,3761,3804,3859`
- **G-12** Role tags the tab's controls check (browser side): Re-sync to contract — owner / admin / accountant / accounting (`F/ProjectFinanceSummary.tsx:56,275`); invoice Approve / Reject — owner / admin / accounting (`F/InvoiceDetail.tsx:62`); PO Approve / Reject / Cancel / Delete — owner / accounting, **not admin** (`F/POList.tsx:91`, `F/PODetail.tsx:75,107-111`); PO "Save & Approve" wording — owner / admin (`F/CreatePODialog.tsx:317`); expense approve — the effective `expense.approve` permission, default owner / admin / accounting (`F/ExpenseList.tsx:57-71`, `L/access-control.ts:343`); verification banner — owner / admin / tag "accounting" (`PAGE:3871`); VO approve — owner / admin (`F/vo-editor/vo-editor-host.tsx:86-89`); payment-schedule override — owner / admin (`PAGE:825`, `L/access-control.ts:347`).
- **G-13** The helper `isAccounting` matches the tag "accounting" only, while six server routes also accept "accountant". A member tagged "accountant" passes the server but does not see the Approve buttons or the verification banner. `L/access-control.ts:35-37`, `A/finance/invoices/[id]/approve/route.ts:48`, `F/ProjectFinanceSummary.tsx:269-273`

### Motion

- **G-14** Switching top tabs remounts the tab content (`key={activeTab}`) with `animate-tab-enter`: keyframes `tabFadeIn` (opacity 0 → 1, translateY 4px → 0), 0.25s ease-out. Everything open inside the Finance tab (expanded rows, drawers' state) is lost on a tab switch. `PAGE:1941`, `src/app/globals.css:1687-1693`
- **G-15** Switching Finance sub-tabs has no animation of the content; only the underline of the tab strip slides (`transition-[left,width] duration-300 ease-in-out`) and tab labels change colour over 200ms. `src/components/ui/sliding-tabs.tsx:95-117`

### Problems

- **G-16** No money gate at all on the tab, while the role editor shows finance permissions as if they applied. `L/access-control.ts:333-341`, `PAGE:1879`
- **G-17** The count mixes drafts, pending-approval and cancelled invoices into one unlabeled number; a project with four unsent drafts and nothing owed reads "Finance (4)". `PAGE:1879`
- **G-18** Admin is left out of PO approve / cancel / delete in the list and detail but is treated as an approver in the create dialog and on the server's approver bypass. `F/POList.tsx:91`, `F/CreatePODialog.tsx:317`, `A/finance/records/purchase-orders/[id]/action/route.ts:298-300`

---

## 2. The frame: action row, sub-tab strip, shared dialogs

### Layout

- **G-19** The tab body is one column (`mt-1`). First an action row (`flex items-center gap-2 sm:gap-3 mb-4`), then the sub-tab strip inside a bottom-bordered box (`border-b border-surface-variant mb-3`), then a one-line description of the sub-tab (`text-caption-s`, secondary colour, `mb-4`), then the sub-tab's content. `PAGE:3272`, `PAGE:3285`, `PAGE:3405`, `PAGE:3440`
- **G-20** The three action buttons are 40px high (`h-10 px-3 sm:px-4 text-sm`); on a phone each stretches (`flex-1`), from `sm` they hug their text. The AI button sits at the far right (`ml-auto`). `PAGE:3288`, `PAGE:3327`, `PAGE:3368`, `PAGE:3379`

### UI elements

- **G-21** "Income" — filled primary button with a 12px chevron. Opens a 256px menu (`w-64`, aligned to the button's start) headed "Money in" (10px, uppercase). Rows: "Raise an invoice" (`Receipt` icon) and "Raise a variation order" (`FileWarning` icon) with the right-hand hint "VO". `PAGE:3286-3314`
- **G-22** "Expense" — outline button with a chevron. Menu headed "Money out". Rows: "Raise a purchase order" (`ShoppingCart`, hint "PO") and "Record an expense" (`Wallet`). `PAGE:3325-3350`
- **G-23** "Record Payment" — outline button; on a phone the label shortens to "Payment". `PAGE:3366-3372`
- **G-24** "AI Insights" — small outline-secondary button, `Brain` icon (a spinning `Loader2` while loading), aria-label "Generate AI insights about this project's finances". Hover tooltip (200ms delay, below, end-aligned, `max-w-xs`): "Run an AI scan over this {project's | <sub-tab key>} finance data to surface margin risks, cost overruns, and follow-up suggestions." `PAGE:3373-3395`
- **G-25** Sub-tab strip: the shared `SlidingTabList`, underline variant, labels "Overview", "Contract/VO", "Invoices", "POs", "Expenses", "Bills", "Receipts". The strip scrolls sideways with an edge fade when it does not fit. `PAGE:3406-3423`, `src/components/ui/sliding-tabs.tsx:26-29,76-81`
- **G-26** Descriptions under the strip, verbatim — Contract/VO: "Quotes and variation orders — the customer-facing agreements your studio bills against." Invoices: "Bills issued to your client against contracts and variation orders." POs: "Purchase orders to vendors and the goods received against them." Expenses: "Direct project costs, reimbursements, and overhead." Bills: "Supplier invoices recorded against this project, read straight off the vendor's own document." Receipts: "Payments received from your client on this project, and the receipts issued for them." Overview has none. `PAGE:3430-3440`

### Interactions

- **G-27** "Raise an invoice" opens the invoice drawer at its milestone-pick step. "Raise a variation order" opens the VO editor (full screen). "Raise a purchase order" opens the Create PO dialog. "Record an expense" opens the expense drawer. "Record Payment" opens the payment drawer at its pick step. `PAGE:3298`, `PAGE:3306-3310`, `PAGE:3337`, `PAGE:3344`, `PAGE:3369`
- **G-28** The menu row that matches the open sub-tab is tinted (`bg-primary-variant/40`): invoice on Invoices, VO on Contract/VO, PO on POs, expense on Expenses. `PAGE:3297,3305,3336,3343`
- **G-29** Changing sub-tab by hand clears the "focus this invoice / this PO" targets so a stale row never re-expands. `PAGE:3409-3413`
- **G-30** After a VO is saved from the frame's VO editor the tab switches to Contract/VO. `PAGE:3953`

### States

- **G-31** Draft project: "Raise an invoice", "Raise a variation order" and "Raise a purchase order" are disabled and each shows "Draft project" on the right; the Income menu adds the note "Billing and VOs unlock once the project leaves Draft."; the Expense menu adds "POs unlock once the project leaves Draft. Receipts work anytime." "Record an expense" stays enabled. `PAGE:3296-3322`, `PAGE:3335-3358`
- **G-32** Elsewhere in the tab the same rule is a toast, not a disabled control: "Financial actions are restricted while the project is in Draft." (Create Variation Order button, the Invoices and POs empty-state buttons). `PAGE:3708-3711`, `PAGE:3782-3785`, `PAGE:3825-3828`
- **G-33** On the Overview sub-tab the billing buttons are disabled with the tooltip "Available once the project leaves Draft". `PAGE:3655`

### Rules

- **G-34** Server side, creating a milestone or ad-hoc invoice on a Draft project is refused: 400 "Cannot create invoices while project is in Draft". `A/projects/[id]/invoices/milestone/route.ts:142-144`, `A/projects/[id]/invoices/adhoc/route.ts:113-115`
- **G-35** Creating a PO or a VO has no Draft check on the server. `A/finance/records/purchase-orders/[id]/action/route.ts:170-219`, `F/vo-editor/vo-editor-host.tsx:186-215`

### Problems

- **G-36** Three ways to start a VO on one screen with three different Draft behaviours: the Income menu (disabled), the "Create Variation Order" button (toast), and "New Variation Order" in the VO list header (no check at all). `PAGE:3303-3305`, `PAGE:3707-3712`, `F/variation-orders-section.tsx:181-185`
- **G-37** The AI tooltip prints the raw sub-tab key: "Run an AI scan over this contracts finance data…", "…this pos finance data…". `PAGE:3390`
- **G-38** A hidden "Client Portal" link card (Generate Link, copy `/pay/{token}`, revoke) is still in the file behind `false &&`, and its queries still run on every project page. `PAGE:3443-3594`, `PAGE:1310-1315`
- **G-39** Five dialogs are mounted on the page with no control that opens them: Credit Note, Record Delivery, Invoice Editor, Financial Report (state setters are only ever called with false / null) and the bulk Generate Invoices dialog. `PAGE:681-684`, `PAGE:688`, `PAGE:4012-4017`, `PAGE:4801-4848`

---

## 3. Overview sub-tab — the "cockpit" (`ProjectFinanceSummary`)

### What it is

- **G-40** A read-first summary: a one-sentence story, four answer tiles, then two columns — billing timeline, money out and "Where costs go" on the left; "Needs attention" and the AI panel on the right. Every headline number opens a right-side drawer with the evidence. `F/ProjectFinanceSummary.tsx:3-25`, `F/ProjectFinanceSummary.tsx:425-570`
- **G-41** It renders only once the project's financial summary query has returned; until then the sub-tab is blank (no loader). `PAGE:3619`

### Layout

- **G-42** Vertical stack `space-y-4`. Tiles: `grid grid-cols-2 lg:grid-cols-4 gap-3`. Body: `grid grid-cols-1 lg:grid-cols-3 gap-4`; left block spans two columns on `lg`. On a phone the attention rail comes first (`order-1`) and the timeline second (`order-2`). `F/ProjectFinanceSummary.tsx:426`, `F/overview/finance-hero-tiles.tsx:110`, `F/ProjectFinanceSummary.tsx:468-469,534`
- **G-43** Every card is `rounded-2xl border border-surface-variant bg-surface-default shadow-sm` with `p-4 sm:p-5`. Section titles are 11px, semibold, uppercase, wide tracking. `F/overview/billing-timeline-card.tsx:132-136`, `F/overview/money-out-card.tsx:51-54`

### UI elements — the story sentence

- **G-44** A tinted card (gradient from `primary-variant/30`). With no contract: "No signed quote yet — the finance story starts once the contract lands." `F/overview/finance-narrative.tsx:31-37,57-65`
- **G-45** With a contract and nothing billed: "Nothing billed yet on the {contract} contract" + cash clause. With billing: "You've billed {billed} of the {contract} contract" + " and collected none of it" / " and collected all of it" / " and collected {amount}" + " — you're {amount} out of pocket so far" (net cash negative) or " — {amount} net cash in hand" (positive) + ", with {n} draft invoice(s) ({amount}) ready to send" + ".". `F/overview/finance-narrative.tsx:67-99`
- **G-46** The figures in the sentence are buttons with a dotted underline: billed and collected open "You're owed", the cash figure opens "Cash so far", the drafts figure opens "Invoices by stage". `F/overview/finance-narrative.tsx:14-26`, `F/ProjectFinanceSummary.tsx:448-450`

### UI elements — the four tiles

- **G-47** Each tile: a 10px uppercase label, an ⓘ popover (click, not hover; 256px wide; plain sentence plus a formula in mono), a large figure, a caption. The whole tile is a button (Enter / Space work) that lifts 1px and gains shadow on hover over 150ms. `F/overview/finance-hero-tiles.tsx:47-70`, `F/metric-helpers.tsx:65-95`
- **G-48** **"Projected profit"** — formula shown: "Contract value − (committed POs + approved expenses)". Four states: no contract → "—" and "Needs a signed quote"; no costs → "Awaiting cost data" and "Raise a PO or log an expense to see margin"; costs under 10% of contract → the amount in neutral colour, "only {costs} of costs logged · {n} PO(s)" and a grey pill "Early estimate"; otherwise the amount coloured by tier with "{x}% of contract" and a pill "Healthy" (≥ 20%, green), "Tight" (10–20%, yellow) or "At risk" (< 10%, red). `F/overview/finance-hero-tiles.tsx:22-35`, `F/overview/finance-hero-tiles.tsx:111-152`
- **G-49** **"You're owed"** — "Billed − Collected". Green when above zero, grey at zero. Caption "Nothing outstanding" or "{n} invoice(s) awaiting payment" + red " · {n} overdue ({d}d)". `F/overview/finance-hero-tiles.tsx:154-179`
- **G-50** **"You owe"** — "Committed − Paid". Red when above zero. Caption "No vendor balances" or "{n} vendor PO(s) with a balance". `F/overview/finance-hero-tiles.tsx:181-197`
- **G-51** **"Cash so far"** — "Collected − (paid to vendors + expenses)". Shows "+" or "−" before the amount; red when negative, green when positive. Caption "In {amount} · Out {amount}" and, when negative, a red pill "Studio-funded". `F/overview/finance-hero-tiles.tsx:199-218`

### UI elements — Billing timeline

- **G-52** Header: "Billing timeline" + ⓘ, and on the right "Contract {amount} incl. {GST} · {n}% billed · {m}% collected", then (for the four finance roles) a small button "Re-sync to contract" (`RefreshCw`; while running "Re-syncing…" with a spinner). `F/overview/billing-timeline-card.tsx:134-147`, `F/ProjectFinanceSummary.tsx:484-497`
- **G-53** An 8px bar on the contract scale: solid green = collected, lighter green = billed and awaiting payment, the rest empty. Legend: "Collected {amount}", "Awaiting payment {amount}", "Not yet billed {amount}". `F/overview/billing-timeline-card.tsx:150-159`
- **G-54** One chip per payment milestone in timeline order (`grid grid-cols-2 md:grid-cols-4 gap-2`): milestone name, "{pct}% · {nominal amount}", a status pill, and an action. Pills: "Paid ✓" (green), "Billed · awaiting payment" (blue), "Billed · overdue" (red), "Drafted — not sent" (yellow), "Not yet billed" (grey). `F/overview/billing-timeline-card.tsx:35-41`, `F/overview/billing-timeline-card.tsx:180-207`
- **G-55** Chip actions: a completed milestone with no invoice gets a filled button "Bill now ›"; an incomplete one gets "Complete & bill… ›"; a drafted one shows "Open to send ›". The first ready-to-bill chip (else the first drafted chip) is highlighted with a primary border and tint. `F/overview/billing-timeline-card.tsx:118-123`, `F/overview/billing-timeline-card.tsx:199`, `F/overview/billing-timeline-card.tsx:208-226`
- **G-56** Footer: link "All invoices by stage ›" (opens the drawer) and, when invoices exist outside the schedule, "Extras (ad-hoc / VO): {n} invoice(s) · {amount}". `F/overview/billing-timeline-card.tsx:234-246`

### UI elements — Money out, Where costs go

- **G-57** "Money out" header shows "Committed {amount} · across {n} PO(s)". A bar on the committed scale: red = paid, light red = still to pay; legend "Paid {amount}" and "Still to pay {amount}"; note "Everything not spent on costs becomes your profit — tracked in the Projected profit tile, not here." Footer: "POs {amount} · Expenses {amount} · Bills {amount}" and a "Details ›" link that opens "You owe". `F/overview/money-out-card.tsx:60-111`
- **G-58** "Where costs go" is a collapsed row showing "{amount} committed" or "No committed POs yet" with a chevron that rotates 180°; opened, it shows committed PO spend by line category as a stacked bar and a two-column legend ("{category} · {n} line(s)", amount, %). `F/ProjectFinanceSummary.tsx:513-531`, `F/category-breakdown.tsx:49-98`

### UI elements — Needs attention

- **G-59** A card titled "Needs attention" with a yellow count pill. Rows have a coloured dot (red danger, yellow warning, blue info), a title, a detail line and small pill buttons. Sorted danger → warning → info; five shown, then "Show {n} more". `F/overview/needs-attention-card.tsx:25-32`, `F/overview/needs-attention-card.tsx:46-96`
- **G-60** The six possible rows, in the order they are built: (1) "{n} invoice(s) overdue" — "{amount} · oldest {d}d" — one invoice: "Log reminder" + "Record payment"; several: "Review overdue". (2) "Studio is funding this project" — "{amount} more paid out than collected" — "See cash". (3) "Billed beyond the contract" — "{amount} over — usually ad-hoc invoices or an unrecorded VO" — "Review invoices". (4) "{amount} awaiting payment" — "{n} invoice(s) outstanding" — "See who owes you". (5) "{n} draft invoice(s) not yet sent" — the draft total — "Review drafts". (6) "No POs issued yet" — "Profit firms up once vendor costs are committed" — "Raise a PO". `F/ProjectFinanceSummary.tsx:311-371`
- **G-61** Below a rule, "Margin alerts" lists up to five alerts, each a tinted box with a warning triangle, a title and a message (see G-86). `F/overview/needs-attention-card.tsx:98-119`

### UI elements — drill-down drawer

- **G-62** A right-side sheet, full width on a phone and `sm:max-w-md` above, scrolling inside. Titles and subtitles: "You're owed" / "Invoices sent and awaiting payment, oldest first." · "You owe" / "Committed vendor POs with an unpaid balance." · "Invoices by stage" / "Every invoice on this project — drafts first." · "How profit is calculated" / "The walk-down, plus other ways to read the same project." · "Cash so far" / "What has actually moved through the bank." · "Collected" / "Client payments received, per invoice." `F/overview/finance-drilldown-drawer.tsx:151-158`, `F/overview/finance-drilldown-drawer.tsx:174-181`
- **G-63** "You're owed" rows: invoice number (a link with a small chevron), "{description} · {aging} · reminded {n}×" (red when overdue), the outstanding amount labelled "outstanding", and two pill buttons "Log reminder" and "Record payment". Aging reads "{d}d overdue", "due today", "due in {d}d", "sent {d}d ago" or "no due date". `F/overview/finance-drilldown-drawer.tsx:37-49`, `F/overview/finance-drilldown-drawer.tsx:185-216`
- **G-64** "You owe" rows: PO number, "{vendor} · {paid} paid of {total}", the balance labelled "balance"; a link "Open POs tab to record payments ›". Rows cannot be opened. `F/overview/finance-drilldown-drawer.tsx:219-243`
- **G-65** "Invoices by stage": a "Drafts — not sent" group (each with an "Open to send" pill) then a "Sent" group ("{description} · {paid} paid"). `F/overview/finance-drilldown-drawer.tsx:247-280`
- **G-66** "How profit is calculated": a walk-down — "Contract value", "− Purchase orders (committed)", "− Approved expenses", "− Supplier bills" (only when above zero), total "Projected profit · {x}%" — then "Both sides incl. {GST}. This is the commission basis." (+ " Right now it's an early estimate — most costs aren't logged yet, so the number will firm up as POs and expenses land."), then "Other ways to read this": three rows "Optimistic — if drafts land" (chip PROJECTED), "Accrual — the books" (chip ACTUAL), "Cash — the bank" (chip ACTUAL), and "Cash trails accrual by {amount} — collections in flight." `F/overview/finance-drilldown-drawer.tsx:299-321`, `F/three-margin-strip.tsx:65-112`
- **G-67** "Cash so far": two tinted boxes "Money in — Client payments collected" and "Money out — Vendors {x} · Expenses {y}", a "Net cash" row, and when negative: "The studio is fronting {amount} — consider collecting outstanding invoices before further vendor payments." `F/overview/finance-drilldown-drawer.tsx:324-349`

### Interactions

- **G-68** "Bill now" opens the invoice drawer straight at Compose with that milestone; "Complete & bill…" opens it at the Complete step; clicking a chip that already has an invoice jumps to the Invoices sub-tab with that invoice expanded. `PAGE:728-737`, `F/overview/billing-timeline-card.tsx:188-198`
- **G-69** "Record payment" (attention chip or drawer) opens the payment drawer already on that invoice, skipping the pick step. `PAGE:3654`
- **G-70** "Log reminder" does not send anything to the client. It adds one to the invoice's reminder count and stamps the time; the toast reads "Reminder logged ({n}×)" and, from the third, " — escalation raised" (an escalation ticket, priority high, is created). `F/ProjectFinanceSummary.tsx:298-308`, `A/finance/records/invoices/[id]/overdue-reminder/route.ts:52-78`
- **G-71** "Raise a PO" and "Details / Open POs tab" switch to the POs sub-tab; the drawer closes first. `F/ProjectFinanceSummary.tsx:368`, `F/ProjectFinanceSummary.tsx:546-548`, `PAGE:3641-3650`
- **G-72** "Re-sync to contract" (tooltip: "Re-size the unsent draft invoices so this project bills the contract exactly once. Milestone percentages are not changed.") runs the rebalance for this project and toasts the outcome (copy in G-195, G-196). `F/ProjectFinanceSummary.tsx:277-296`, `F/ProjectFinanceSummary.tsx:489`

### States

- **G-73** Any of the five list queries failing: a centred block with a red triangle, "Couldn't load this project's finances" and "Refresh the page to try again. Figures are hidden rather than shown as zero so nothing is mistaken for "no activity"." `F/ProjectFinanceSummary.tsx:405-415`
- **G-74** Loading: a spinner with "Loading project finances…". `F/ProjectFinanceSummary.tsx:416-423`
- **G-75** No invoices, no live POs, no expenses, no bills: the sentence and tiles are replaced by a band "Set up this project's finances" with either "Contract value {amount} incl. {GST} — bill your first milestone below, raise a PO, or log an expense to start the story." or "No signed quote yet — add one on the Contract/VO tab to anchor these numbers." `F/ProjectFinanceSummary.tsx:398-401`, `F/ProjectFinanceSummary.tsx:427-436`
- **G-76** No payment milestones: the timeline shows a `Receipt` icon, "No billable milestones yet", "Add payment milestones in the timeline (Gantt → Edit milestone → set % of contract), or bill outside the schedule." and a link "Create ad-hoc invoice". `F/overview/billing-timeline-card.tsx:162-178`
- **G-77** No costs: "No costs committed yet — profit firms up once you raise a PO or log an expense." with "Raise a PO ›". `F/overview/money-out-card.tsx:66-80`
- **G-78** Nothing to flag: "All clear — nothing needs you." `F/overview/needs-attention-card.tsx:56-57`
- **G-79** Drawer empties: "Nothing outstanding — every sent invoice is paid." · "No vendor balances — every committed PO is fully paid." · "No invoices yet." · "No payments received yet." `F/overview/finance-drilldown-drawer.tsx:187,221,249,285`

### Rules and formulas

- **G-80** **Contract** shown here = contract base (ex-VO, from the server loader) + Σ approved VOs whose direction is not "vendor" (signed amounts; omissions subtract). `F/ProjectFinanceSummary.tsx:116-124`, `PAGE:3623-3631`
- **G-81** **Committed costs** = committed POs + approved expenses + supplier bills, all including tax. A PO is committed when its lifecycle bucket is not "pipeline" (draft / pending review / approved with nothing paid) and not "killed" (cancelled / vendor rejected). Expenses count when approved or when their approval status is empty (owner / admin entries). Every bill counts. `F/ProjectFinanceSummary.tsx:131-153`, `L/po-lifecycle.ts:190-206`
- **G-82** **Projected profit** = contract − committed costs; **%** = profit ÷ contract, one decimal; both 0 when there is no contract. "Early estimate" when costs are above zero and under 10% of contract. `F/ProjectFinanceSummary.tsx:156-162`, `F/ProjectFinanceSummary.tsx:394`, `F/overview/finance-hero-tiles.tsx:23`
- **G-83** **Billed** = total of invoices that are not draft and not void; **collected** = their paid amounts; **owed** = billed − collected (never below zero). The server "cash view" supplies these when loaded; the local sums are the fallback. `F/ProjectFinanceSummary.tsx:172-185`, `L/lifecycle-aggregates.ts:54-63,82`
- **G-84** **You owe** = committed PO totals − payments to vendors. **Cash so far** = collected − (vendor payments + approved expenses); expenses are treated as paid the moment they are approved. `F/ProjectFinanceSummary.tsx:188-198`, `F/ProjectFinanceSummary.tsx:228-236`
- **G-85** The three "other ways to read this": Optimistic = (billed + draft invoices) − (committed + pipeline POs + approved expenses); Accrual = billed − (committed POs + approved expenses); Cash = collected − (paid to vendors + approved expenses); cash lag = accrual − cash. `L/lifecycle-aggregates.ts:123-160`
- **G-86** Margin alerts (target fixed at 20%): "Margin Below Threshold" when (billed − costs) ÷ billed < 20% — "Project margin is {x}% — below your 20% target."; "PO Cost Overrun" when PO totals exceed their quoted amounts by more than 5% — "PO costs exceed quoted amounts by {x}%. Review subcontractor invoices."; "Overdue Invoices" — "{n} invoice(s) overdue by more than 7 days. Follow up with the client."; "Variation Orders Excessive" when approved VOs exceed 10% of the base — "Approved VOs add {x}% to original quote value. Review scope management."; "Costs Exceed Revenue" — "Total costs exceed invoiced revenue. This project is running at a loss." `L/finance-utils.ts:113-214`, `F/ProjectFinanceSummary.tsx:239-257`
- **G-87** The timeline, the milestone picker and the server all ask the same allocation function what a milestone should bill, so a chip can never show a different amount from the invoice that is then created. `F/overview/billing-timeline-card.tsx:12-18`, `L/finance/milestone-allocation.ts:252-291`

### Data

- **G-88** Reads: invoices, POs, VO mirrors, expenses for the project; the studio-wide bills list filtered to the project in the browser; the project (timeline); the financial summary; the cash view and category spend reports. `F/ProjectFinanceSummary.tsx:80-104`
- **G-89** Writes: reminder count (`POST /api/finance/records/invoices/[id]/overdue-reminder`) and the re-sync (`POST /api/finance/records/rebalance`). `F/ProjectFinanceSummary.tsx:104`, `F/ProjectFinanceSummary.tsx:276`

### Responsive

- **G-90** Tiles two-up on phones, four-up from `lg`; milestone chips two-up, four-up from `md`; the attention card moves above the timeline on phones; drawers are full width on phones. `F/overview/finance-hero-tiles.tsx:110`, `F/overview/billing-timeline-card.tsx:180`, `F/ProjectFinanceSummary.tsx:469,534`, `F/overview/finance-drilldown-drawer.tsx:175`

### Problems

- **G-91** The hero says "Healthy" from contract − costs while a margin alert on the same screen can say "Margin Below Threshold" or "This project is running at a loss", because alerts divide by billed-so-far, not by contract. Early in a job (deposit billed, POs raised) both show together. `L/finance-utils.ts:124-143,198-211`, `F/ProjectFinanceSummary.tsx:156-162`
- **G-92** "Overdue Invoices" alert copy says "overdue by more than 7 days" but fires for any overdue invoice. `L/finance-utils.ts:165-177`
- **G-93** The "You owe" tile counts committed POs only; the drawer it opens lists every non-cancelled PO with a balance, drafts included. The count and the list can disagree. `F/ProjectFinanceSummary.tsx:228-236`, `F/overview/finance-drilldown-drawer.tsx:171`
- **G-94** "Billed beyond the contract → Review invoices" opens the drawer titled "Invoices by stage", which lists everything and does not point at the excess. `F/ProjectFinanceSummary.tsx:338-345`
- **G-95** A "Collected" drawer exists with its own copy but nothing opens it. `F/overview/finance-drilldown-drawer.tsx:155,283-296`; no `setDrilldown("collected")` in `F/ProjectFinanceSummary.tsx`
- **G-96** A partly-approved expense is left out of costs altogether (only "approved" or empty status counts; the approved amount is never used). `F/ProjectFinanceSummary.tsx:138-140`, `A/finance/records/expenses/[id]/decision/route.ts:89-99`
- **G-97** The bar does not show drafts, so a project with every milestone drafted reads the same as one with nothing prepared; billed % is not capped in the text when ad-hoc invoices push it above 100. `F/overview/billing-timeline-card.tsx:125-129,150-154`
- **G-98** Blank screen while the summary loads and forever if that one query fails (the error block in G-73 covers only the other five queries). `PAGE:3619`
- **G-99** The whole studio's bills are fetched to show one project's. `F/ProjectFinanceSummary.tsx:89-96`

---

## 4. "mAIson Insights" panel

### What it is / where it shows

- **G-100** Nothing AI is shown until "AI Insights" is pressed. After that the panel appears: on Overview inside the right rail under "Needs attention"; on the other sub-tabs as a card above the list (`mb-4`). `PAGE:3600-3610`, `PAGE:3656-3665`
- **G-101** Header (a full-width button): "m**AI**son Insights", a small chip naming the sub-tab, and a chevron (up when open). The chip reads "Overview", "Contract/VO", "Invoices", "POs" or "Expenses" — on the Bills and Receipts sub-tabs it also reads "Expenses". `PAGE:5069-5080`, `PAGE:3603`
- **G-102** Body: each insight is a row with a 24px tinted square icon, a bold title, a message and an optional primary-coloured impact line. Types and icons: optimization — `TrendingUp`, green; warning — `AlertTriangle`, yellow; opportunity — `Lightbulb`, primary; action — `CheckSquare`, green. A "Summary" block closes the list. `PAGE:5092-5127`

### States

- **G-103** Loading: a centred spinner and "Analyzing project financials...". Error: red text "Failed to load AI insights. Please try again." with no retry button. `PAGE:5081-5091`, `PAGE:1337`

### Rules

- **G-104** One request per project and sub-tab (`POST /api/finance/margin-analysis` with `projectId` and `subTab`); cached 10 minutes, kept 30 minutes, one retry. The panel re-opens itself whenever the sub-tab changes. `PAGE:1321-1336`, `PAGE:1420-1423`
- **G-105** The route sends the model the project name, type, stage and **budget** (not the contract value), the non-void invoices, non-draft POs, all VOs and all expenses, asks for 3–5 insights of the four types plus a summary, using Gemini 2.5 Flash. `A/finance/margin-analysis/route.ts:76-132`, `A/finance/margin-analysis/route.ts:225-259`
- **G-106** The per-sub-tab focus text exists for "invoices", "pos", "vos", "expenses" and "quote"; the tab sends "contracts", "bills", "receipts" and "overview", which fall back to the general prompt. `A/finance/margin-analysis/route.ts:216-223`, `PAGE:1327`

### Problems

- **G-107** When the AI key is missing or the model's reply is not valid JSON, the route returns a fixed sample: "Subcontractor Cost Optimization … Potential savings of S$4,200 across active projects", "You have S$24,500 in overdue invoices across 2 projects…", "Your studio's average margin is 22.3%…". The panel shows it as this project's analysis. `A/finance/margin-analysis/route.ts:12-45`, `A/finance/margin-analysis/route.ts:207-213`, `A/finance/margin-analysis/route.ts:262-266`
- **G-108** Once pressed, the query stays enabled, so each visit to another sub-tab fires a new AI call without a press **[inferred from the query's `enabled` flag and key]**. `PAGE:1321-1332`, `PAGE:1339-1342`
- **G-109** Expenses are sent regardless of approval, and the budget is called the project's value, so the AI's figures can contradict the cockpit beside it. `A/finance/margin-analysis/route.ts:117-132`

---

## 5. Contract/VO sub-tab

### What it is / layout

- **G-110** Four stacked blocks (`space-y-4`): a toolbar row, the "Contract document" card, the quotes table (non-variation quotes only), and the "Variation Orders" card. `PAGE:3674-3753`
- **G-111** The toolbar stacks on phones and becomes one row from `sm` (`flex-col sm:flex-row sm:items-center sm:justify-between gap-3`): left, the "View in Studio Finance" link (11px, primary colour, 10px external-link icon) and an entity tag; right, two compact buttons (36px high on phones). `PAGE:3677-3717`

### UI elements

- **G-112** "View in Studio Finance ↗" is a plain link to `/finance/operations?tab=contracts&project={id}` (full navigation, same tab). `PAGE:3679-3684`
- **G-113** The entity tag shows the issuing legal entity's name when the studio has two or more active entities and the lead's latest signature request names one. `PAGE:830-832`, `PAGE:3685`
- **G-114** "Upload Quote" (`Upload` icon) is the filled button while the project has no quotes and an outline button once it has one; "Create Variation Order" (`Plus`) is the reverse. With no quotes the VO button carries the tooltip "Add a quote first — a variation order changes an existing contract" but still works. `PAGE:3691-3716`
- **G-115** "Contract document" card (`border rounded-2xl p-4`). The line under the title reads: the file name once uploaded; for an e-signed contract "Preparing the signed contract PDF…", then "Signed by client via e-signature on {date} — in the leads workflow", or on failure "Signed via e-signature — couldn't save the PDF ({error})"; otherwise "No contract document uploaded yet (PDF, Word, JPG, PNG · max 10MB)". `PAGE:4949-4965`
- **G-116** Its buttons: uploaded → "Download" (opens the file in a new tab) and "Replace"; e-signed → "View signed quote" (opens `/sign/{token}`) and "Save signed PDF" ("Saving…" / "Retry save"); none → "Upload". `PAGE:4975-5012`
- **G-117** Quotes table: filter pills "All", "Signed", "Approved", "Pending", "Drafts", each with a count; the pill row is hidden when there are no quotes. Columns: "Quote #", "Title", "Status", "Total", "Created" (the Project column is off here). `F/quotes-table.tsx:89-95`, `F/quotes-table.tsx:174-226`, `PAGE:3732-3743`
- **G-118** Row content: quote number; title or "Quote"; a status badge that prints the raw status with underscores as spaces ("draft", "submitted", "approved", "sent for signature", "client signed", "rejected", "void") in grey / yellow / green / primary / green / red / grey; the total (a negative total is green with "−"); created date as "d MMM yyyy". `F/quotes-table.tsx:54-62`, `F/quotes-table.tsx:228-270`
- **G-119** Order: signed first, then approved and sent-for-signature, then submitted, then drafts, then rejected / void; newest first inside each group. `F/quotes-table.tsx:67-78`, `F/quotes-table.tsx:150-156`
- **G-120** "Variation Orders" card: header with a `FileWarning` icon, the title and an outline button "New Variation Order". Each row: VO number, a status chip, a green "Billed" chip once invoiced, a sub-line "{title} · {created date}", the signed amount at the right (green when positive, red when negative) and a ⋮ menu. `F/variation-orders-section.tsx:175-262`
- **G-121** VO status chips: "Draft" (grey), "In review" (yellow, status `submitted`), "Approved" (green), "Rejected" (red), "Signed" (green, status `client_signed`). `F/variation-orders-section.tsx:38-44`
- **G-122** VO row menu (224px): "Open", "Preview PDF", "Download", "Duplicate", "Bill this VO", "Delete" (red). `F/variation-orders-section.tsx:231-259`

### Interactions

- **G-123** "Upload Quote" opens a small dialog "Upload External Quote" — "Upload an external document (PDF, image, or spreadsheet)" — with: File (dashed box "Click to select or drag & drop", "PDF, JPG, PNG, CSV, XLSX"), "Reference Number" ("e.g. QT-2026-001"), "Amount", "Document Date", "Vendor / Contractor", "Notes" ("Optional notes..."); buttons "Cancel" and "Upload" ("Uploading..."). Toasts: "External quote uploaded", "Please select a file", "Failed to upload document". `F/UploadExternalDocDialog.tsx:27-31`, `F/UploadExternalDocDialog.tsx:58-82`, `F/UploadExternalDocDialog.tsx:84-196`
- **G-124** Contract upload accepts PDF, Word, JPEG, PNG up to 10 MB and posts the file to `/api/projects/{id}/contract`; toast "Contract uploaded", or the server's message ("File too large (max 10MB)", "Invalid file type. Allowed: PDF, Word, JPG, PNG"). `PAGE:4926-4946`, `A/projects/[id]/contract/route.ts:19,47-51`
- **G-125** For an e-signed contract with no stored file, the card asks the server once per visit to render and store the signed PDF, without a toast; pressing "Save signed PDF" does the same and toasts "Signed contract saved to project". `PAGE:4894-4924`
- **G-126** Clicking a quote row: a finalized quote (client signed, approved, sent for signature) opens a near-full-screen PDF viewer (98vw × 96vh) with the title, status badge, "Open in new tab", "Download" and a close button; any other status opens the quote builder with its lines loaded, after a small "Loading quote…" dialog. `F/quotes-table.tsx:83-87`, `F/quotes-table.tsx:317-321`, `F/quotes-table.tsx:353-408`, `F/quotes-table.tsx:451-463`
- **G-127** Hovering a table row tints it and draws a 3px primary bar inside its left edge (`transition-[background-color,box-shadow] duration-200`). `F/quotes-table.tsx:234`
- **G-128** VO "Open" (or a click on the row) opens the VO editor on that VO. "Preview PDF" opens a dialog (`max-w-4xl`, 94vw × 88vh) titled "Preview — {VO number}" with a freshly rendered PDF. "Download" opens `/api/quotes/{id}/download?disposition=attachment` in a new tab. `F/variation-orders-section.tsx:202-206`, `F/variation-orders-section.tsx:232-240`, `F/variation-orders-section.tsx:314-328`
- **G-129** "Duplicate" creates a new draft VO labelled "{title} (copy)" with the same lines (omission marks kept, comments dropped). Toasts: "Duplicated as {number}", "Failed to duplicate variation order", or "This VO isn't linked to a project lead — open it and save first." `F/variation-orders-section.tsx:126-157`
- **G-130** "Delete" asks "Delete {VO number}?" — "The VO and its items will be permanently removed." — [Delete]. Toasts: "{number} deleted", or on refusal "Approved variation orders can't be deleted — revise first." `F/variation-orders-section.tsx:159-170`, `F/variation-orders-section.tsx:301-309`
- **G-131** "Bill this VO" creates a draft invoice at once, with no form: description "Variation: {title}", one line for the VO's amount, note "Auto-created from VO {number}". Toast "Invoice {number} created". `F/variation-orders-section.tsx:93-124`

### States

- **G-132** No quotes: "No quotes yet" — "Primary quotes will appear here once created. Variation orders are listed separately." A filter with no match: "No quotes match this filter" — "Try a different status filter or clear it to see everything." `F/quotes-table.tsx:204-211`
- **G-133** VO list loading: "Loading variation orders…". Empty: "No variation orders yet — create one to add or omit scope on this contract." `F/variation-orders-section.tsx:188-193`
- **G-134** "Bill this VO" is disabled with one of these reasons in a native tooltip: "Approve this VO first" · "Net credits reduce the contract via milestone rebalance — they can't be billed" · "Already billed" · "Not yet in finance — re-approve to bridge" · "Generate the milestone schedule first — this VO is already included in the revised contract". Disabled Delete says "Revise this VO before deleting it". `L/queries/variation-orders.ts:192-205`, `F/variation-orders-section.tsx:244-256`

### Rules and data

- **G-135** A VO can be deleted only while draft, submitted or rejected. `L/queries/variation-orders.ts:196`
- **G-136** The amount on a VO row is the finance mirror's signed net once the VO is approved, else the quote's own signed total. `L/queries/variation-orders.ts:141`
- **G-137** The contract file is written to the public storage bucket `contract-files`, and its public URL and name are saved on the project (`contract_file_url`, `contract_file_name`); the homeowner downloads the same URL. `A/projects/[id]/contract/route.ts:9-11,83-87`, `PAGE:4862-4866`
- **G-138** Reads: quotes for the project (`quotes`), VO mirrors (`variation_orders`), all studio invoices (to know whether the project has any). Writes: `finance_documents` (external upload), `quotes` + `quote_line_items` (duplicate / delete), `project_invoices` (bill). `F/variation-orders-section.tsx:62-70`, `L/queries/finance-documents.ts:46-80`

### Responsive

- **G-139** The quotes table becomes a list of cards below `sm` (number + status on the first line, title, then total and date). `F/quotes-table.tsx:214-216`, `F/quotes-table.tsx:276-313`

### Problems

- **G-140** "Upload Quote" saves a file as an "external quote" whose counterparty field is labelled "Vendor / Contractor". No list in the project reads documents of type `quote` (only `invoice` and `po` are listed), so the upload disappears and the table goes on saying "No quotes yet" — and it is the filled, recommended button in exactly that state. `F/UploadExternalDocDialog.tsx:30`, `PAGE:3691-3701`, `F/InvoiceList.tsx:83`, `F/POList.tsx:72`
- **G-141** The upload box says "drag & drop" but has no drop handling **[inferred from the markup]**. `F/UploadExternalDocDialog.tsx:99-113`
- **G-142** "Bill this VO" writes an invoice with no confirmation or preview, and the reason a row is disabled lives in a native tooltip on a disabled menu row, which browsers often do not show. `F/variation-orders-section.tsx:244-250`
- **G-143** Delete tells the user to "Revise this VO" but the row menu has no Revise. `F/variation-orders-section.tsx:251-257`
- **G-144** The quotes table prints raw lowercase status keys while the VO list beside it uses proper labels. `F/quotes-table.tsx:260-262`, `F/variation-orders-section.tsx:38-44`
- **G-145** VO dates use the browser's locale and the quotes table's currency follows the signed-in user's country, not the project's. `F/variation-orders-section.tsx:215`, `F/quotes-table.tsx:97-109`
- **G-146** A signed contract sits at a public URL. `A/projects/[id]/contract/route.ts:9`

---

## 6. The VO editor and the VO life cycle

### What it is

- **G-147** A variation order is a quote of type "variation". It is edited in the full-screen quote builder, whose header reads "Variation Order" instead of "Quote Editor" and whose title is "{VO number} · {project name}". `src/components/leads/quote-digitizer-dialog.tsx:6596`, `F/vo-editor/vo-editor-host.tsx:252`
- **G-148** Opening "new VO" creates the quote row immediately (label "Variation Order"; the server numbers it VO-00N). If the project has no lead, a parked lead is created silently first. Closing with no lines deletes the empty shell. Failure toasts: "Failed to start variation order" and "Couldn't open the variation order. Please re-link the project's customer and retry." `F/vo-editor/vo-editor-host.tsx:131-248`

### UI elements

- **G-149** A tinted strip under the header: a `FileWarning` icon and "VARIATION ORDER"; at the right a live readout "Net change: {signed amount}" (red when negative, green when positive) and "Revised: {amount}"; then two inputs with placeholders "VO title (e.g. Kitchen extension)" and "Reason for variation (e.g. Client added 2 wardrobes on 5 May)". The inputs sit side by side from `md` (1fr / 2fr). `quote-digitizer-dialog.tsx:6897-6938`
- **G-150** Hidden in VO mode: Save as template, AI insights, version history, the share-with-client popover, the payment schedule card and the start chooser. `quote-digitizer-dialog.tsx:6700,6716,6739,6761,7610,7968`
- **G-151** "Omit from contract" (`Scissors`; shown when the signed contract has lines) opens a picker: "Omit from contract" — "Pick the contract items being removed. Each becomes an editable credit on this variation." — a search field "Search contract items…", lines grouped under sticky category headings with a checkbox, name and amount; a line already omitted in this VO is greyed and tagged "Omitted". Footer: "Cancel" and "Add {n} omission(s)". No match: "No matching contract items." `quote-digitizer-dialog.tsx:8511-8522`, `F/vo-editor/contract-omit-picker.tsx:71-155`
- **G-152** With lines selected, the bulk bar adds "Omit" (red) and "Restore" next to Delete, "Move to..." and "Clear". `quote-digitizer-dialog.tsx:8881-8897`
- **G-153** When a VO is in review the reviewer sees a yellow bar "Awaiting your approval — review the line items and decide." (others see "Awaiting owner approval"). Reject asks for a reason inline ("Rejection reason…"; Enter sends, Escape cancels). `quote-digitizer-dialog.tsx:6947-6990`

### Interactions

- **G-154** Title and reason save 600 ms after typing stops (to the quote's label and notes). `quote-digitizer-dialog.tsx:658-677`
- **G-155** Save draft → toast "Variation order saved" (or "Failed to save variation order"); autosave is silent. `F/vo-editor/vo-editor-host.tsx:288-317`
- **G-156** Submit by an Owner or Admin saves and approves in one step: toast "Variation order approved" (server warnings appear as warning toasts). Submit by anyone else sets the status to submitted, creates a task "Approve variation order {number} — submitted by {name}" for the first owner (else the first admin) and toasts "Variation order submitted for review". If no task can be created the submission is undone: "Couldn't create the approval task — submission was rolled back. Please try again." or "Couldn't find an owner/admin to approve this variation order." `F/vo-editor/vo-editor-host.tsx:319-399`
- **G-157** Approve / Reject by the reviewer: toasts "Variation order approved" / "Variation order rejected"; failures "Failed to approve" / "Failed to reject". The editor closes after each. `F/vo-editor/vo-editor-host.tsx:400-437`

### Rules and logic

- **G-158** An omitted line keeps its positive amount and carries an omission mark. Net = additions − omissions, including GST. Revised contract = contract before this VO + net. `L/finance/vo-doc-grouping.ts:22-44`, `L/finance/vo-render-context.ts:12-19`
- **G-159** Status machine on the server: draft or rejected → *submit* → submitted (or straight to approved when the studio needs no approval); submitted → approved or rejected (approver only; reject needs a comment); draft → approved (approver); approved, rejected or sent-for-signature → *revise* → draft. For a VO, Owner and Admin are approvers. `A/quotes/[id]/transition/route.ts:58-84`, `A/quotes/[id]/transition/route.ts:165-199`
- **G-160** Approval is final. On approval the VO is mirrored into `variation_orders` as approved (so it enters the contract value), the project's unsent invoices are rebalanced, and the VO's PDF is re-rendered and stored. There is no client-signature step for a VO. `A/quotes/[id]/transition/route.ts:356-417`, `L/finance/bridge-and-rebalance-variation.ts:11-28`
- **G-161** Revise un-approves: the mirror returns to draft, its money leaves the contract value and the drafts are rebalanced again. A billed VO cannot be revised: "This variation order has been billed. Cancel its invoice before revising." `A/quotes/[id]/transition/route.ts:215-234`, `A/quotes/[id]/transition/route.ts:328-354`, `L/variation-orders/sync-vo-from-quote.ts:52-85`
- **G-162** Billing a VO needs: approved, mirrored, net above zero, not yet billed, and at least one invoice already on the project. The server refuses an omission ("This variation is an omission (a credit). It reduces the contract value and cannot be billed as an invoice."), returns the existing invoice on a second attempt, and refuses a project with no invoices ("Generate the project's milestone schedule first — this VO is already included in the revised contract."). The invoice takes the VO's own total and GST split. `A/projects/[id]/invoices/adhoc/route.ts:117-170`, `A/projects/[id]/invoices/adhoc/route.ts:218-231`
- **G-163** After a VO invoice is created the VO is stamped as invoiced and the schedule is rebalanced, so the remaining milestone drafts give that money back. `A/projects/[id]/invoices/adhoc/route.ts:297-323`
- **G-164** Vendor-side VOs can no longer be created; old ones still count in totals. `PAGE:3792-3799`
- **G-165** Notifications: a designer's submission creates a QuoteApproval task only (no separate alert in this path); approval and rejection produce toasts for the actor only **[inferred — no dispatch call in the host or the VO branch of the transition route]**. `F/vo-editor/vo-editor-host.tsx:357-391`, `A/quotes/[id]/transition/route.ts:356-417`

### Problems

- **G-166** Every "new VO" takes a VO number even when it is closed empty and deleted, so numbers can skip **[inferred]**. `F/vo-editor/vo-editor-host.tsx:186-215`, `F/vo-editor/vo-editor-host.tsx:217-248`
- **G-167** A "Signed" chip and client-signature wording exist for VOs, but nothing sends a VO to the client to sign; the code comments say owner approval "supersedes the e-sign-only rule". `F/variation-orders-section.tsx:43`, `A/quotes/[id]/transition/route.ts:359-361`
- **G-168** If the mirror step fails on approval the transition still succeeds and only logs, so a VO can read "Approved" with no effect on contract value; the list then offers the cryptic "Not yet in finance — re-approve to bridge". `A/quotes/[id]/transition/route.ts:364-374`, `L/queries/variation-orders.ts:202`
- **G-169** A second, older submit path for VOs (in the quotes table's editor wrapper) sets "submitted" without creating the approval task. `F/quotes-table.tsx:543-577`

---

## 7. The money model: contract value, payment schedule, allocation, rebalance

### Contract value and GST

- **G-170** Contract base, in priority order: (1) the latest client-signed non-variation quote with a total above zero (latest by signing time, then by last update); (2) else the primary quote that is approved or sent for signature; (3) else the project's budget field (entered in dollars); (4) else zero. `L/finance/contract-value.ts:76-112`
- **G-171** Contract value = base + Σ approved client VOs (additions positive, omissions negative), never below zero. Client VO = direction empty, "client" or legacy "client_positive". `L/finance/contract-value.ts:69-84`, `L/finance/contract-loader.ts:35-37,52-56`
- **G-172** A quote's total is what the client pays: including GST, after discount. Nothing adds GST on top of a contract slice. `L/finance/contract-value.ts:17-23`
- **G-173** GST fraction of the contract = base quote's tax ÷ total. When the base stores no tax: the lead's GST toggle decides — on → region rate ÷ (1 + rate); off → 0. Quotes are read by lead **or** project. `L/finance/contract-loader.ts:46-50`, `L/finance/contract-loader.ts:74-85`
- **G-174** Splitting any slice: GST = round(total × fraction); subtotal = total − GST. The composers let the user type ex-GST rows and show GST at the inverse rate, fraction ÷ (1 − fraction). `L/finance/gst-split.ts:3-28`
- **G-175** The Overview tab's card labels the source: "From signed quote · {n} line items · includes +{amount} VOs" or "From project budget · no signed quote yet". "Signed quote" is also shown when the base is only an approved primary quote. `P/financial-summary-card.tsx:429-436`, `L/queries/project-aggregates.ts:186-187`

### The payment schedule

- **G-176** A project's schedule is the set of timeline milestones that carry a payment percentage above zero; milestones with no percentage are work-only. `F/milestone-picker-dialog.tsx:77-85`, `L/milestone-payments.ts:24-45`
- **G-177** Reusable templates live in Accounts Setup › "Payment Schedules": a name, a "Default" tick, and stages (name, %, trigger). Triggers: "Contract Signed", "Work Started", "Milestone Completed", "Project Completed", "Custom Date". A new template starts as Deposit 10% · Commencement 40% · Mid-Project 40% · Final Payment 10%. Stages can be dragged to reorder; a coloured bar previews the split. `F/PaymentScheduleEditor.tsx:29-35`, `F/PaymentScheduleEditor.tsx:70-81`, `F/PaymentScheduleEditor.tsx:333-411`
- **G-178** Template validation (toasts): "Template name is required", "Stages must sum to 100%, currently {n}%", "All stages need a name". The footer shows "Total: {n}% (must be 100%)" in red until it is right. Delete asks in a browser confirm: "Delete payment schedule template "{name}"? Existing invoices already generated from it are unaffected." The default template has no delete button. `F/PaymentScheduleEditor.tsx:105-147`, `F/PaymentScheduleEditor.tsx:241-251`, `F/PaymentScheduleEditor.tsx:388-390`
- **G-179** Only Owner / Admin may create or change templates; others see "Read-only — only owners/admins can override the payment schedule." `F/PaymentScheduleEditor.tsx:48-52`, `F/PaymentScheduleEditor.tsx:168-178`
- **G-180** On a project, one milestone's share is edited in the "Payment Structure" dialog (opened from the timeline): "Payment % of contract" with a "≈ {amount}" preview, a "Trigger commission" switch ("Commission accrues when this milestone is finalized."), and a live strip "Other milestones {x}%", "This milestone {y}%", "New total {z}%" (green at 100, yellow under, red over). `P/milestone-payment-structure-dialog.tsx:201-293`
- **G-181** Over 100% blocks Save: "Over by {x}%. Save is blocked — reduce this milestone or another one." Under 100% saves with "{x}% unallocated. You can save, but publish is blocked until the total hits 100%." Input outside 0–100: "Must be between 0 and 100." `P/milestone-payment-structure-dialog.tsx:104-115`, `P/milestone-payment-structure-dialog.tsx:227-229`, `P/milestone-payment-structure-dialog.tsx:281-292`
- **G-182** Publishing the timeline to the homeowner is blocked while the percentages do not total 100 (0.01 tolerance): "Payment milestones exceed contract value by {x}%. Reduce one milestone before publishing." / "Payment milestones add up to {t}% — {x}% unallocated. Allocate the rest before publishing." `L/milestone-payments.ts:22,36-74`
- **G-183** The schedule freezes for everyone as soon as any milestone has a percentage: "Payment schedule locked — This schedule was agreed at quote stage. Override only after confirming the change with the client — it re-bases future invoices." with an "Override payment schedule" button for Owner / Admin; others read "…can only be changed by a studio owner or admin." After override: "Override active — saving updates this project's billing schedule." The override writes "Payment schedule unlocked for editing by {name}" to the project's activity. `PAGE:816-826`, `PAGE:2774-2790`, `P/milestone-payment-structure-dialog.tsx:171-199`
- **G-184** A milestone that already has an issued invoice stays locked even under override: "Invoice already issued — The % here is read-only because invoicing has started. Use the Variance Resolution flow on the existing invoice instead." `P/milestone-payment-structure-dialog.tsx:155-169`

### What a milestone bills (allocation)

- **G-185** Nominal slice (shown as "{pct}% · {amount}") = round(contract × % ÷ 100). `L/finance/milestone-true-up.ts:85-97`
- **G-186** An invoice belongs to a milestone by, in order: its stored milestone key (the timeline id), its milestone id, or its description equalling the milestone's name (a trailing "(10%)" is ignored). `L/finance/milestone-true-up.ts:99-131`
- **G-187** One invoice per milestone: a second attempt (not void, not a top-up) returns the existing invoice and the screen says "Already invoiced — opening {number}." `L/finance/milestone-invoice-writer.ts:85-137`, `F/invoice-composer-dialog.tsx:369-370`
- **G-188** The amount offered for an unbilled milestone comes from the same function that rebalances after a VO: every contract invoice plus a virtual draft for each unbilled milestone (weighted by its %) forms a pool; locked money is subtracted from the contract; the rest is shared among the unlocked entries by weight, the last one absorbing rounding. `L/finance/milestone-allocation.ts:148-232`, `L/finance/rebalance-milestone-invoices.ts:89-134`
- **G-189** Locked = any invoice that is not a draft, has a payment, is linked to a VO, is a draft top-up, carries a resolved variance, or has a negative total. Ad-hoc, void and cancelled invoices are outside the pool altogether. `L/finance/rebalance-milestone-invoices.ts:80-87`, `L/finance/milestone-allocation.ts:61-62`, `L/finance/milestone-allocation.ts:200-204`
- **G-190** When the offered amount differs from the nominal slice by more than $1 the picker adds "(incl. catch-up)" with the tooltip "Nominal {amount} + reconciliation for prior changes/VOs". `F/milestone-picker-dialog.tsx:152-155`, `F/milestone-picker-dialog.tsx:204-218`

### Rebalance (after a VO, an over-bill, or on demand)

- **G-191** It runs after every milestone-invoice insert, after a VO-backed invoice, on VO approval, on VO revise, and on demand ("Re-sync to contract" and the variance wizard). It always targets the full current contract, so repeating it changes nothing. `A/projects/[id]/invoices/milestone/route.ts:563-581`, `A/projects/[id]/invoices/adhoc/route.ts:305-322`, `A/quotes/[id]/transition/route.ts:335-349`, `A/finance/records/rebalance/route.ts:84-96`
- **G-192** Unsent drafts are re-sized in proportion to their percentages; their variance fields are cleared; a draft already at the right amount is left untouched. Sent and paid invoices never change. `L/finance/apply-milestone-rebalance.ts:327-360`
- **G-193** If no unlocked draft remains and money is still to be billed, a new draft invoice "Supplement — contract adjustment (variation order)" is created. If the contract is now below what is already billed, a **draft credit note** is written first, and only then are the drafts set to zero. `L/finance/apply-milestone-rebalance.ts:215-309`, `L/finance/apply-milestone-rebalance.ts:366-410`
- **G-194** The draft credit note: reason "Contract adjustment — {VO number | variation order} (draft; issue to apply)", placeholder number `DRAFT-{first 8 characters of the project id}`, attached to the most recently billed invoice and capped at what that invoice can absorb; one open draft per project, updated in place and deleted when no longer needed. `L/finance/rebalance-credit-note.ts:41-50`, `L/finance/rebalance-credit-note.ts:52-166`, `L/finance/apply-milestone-rebalance.ts:238-281`
- **G-195** Outcome messages (toast after Re-sync, text in the wizard): "Later drafts re-balanced — {n} draft invoice(s) were re-sized. The agreed milestone percentages were not changed." · "Already in balance — nothing needed changing." · "A draft supplement invoice was prepared for the balance." · "Draft credit note prepared for the excess — review it under Credit Notes." · "The excess could not be credited — try the re-sync again." `L/finance/rebalance-outcome-copy.ts:14-28`
- **G-196** Decline messages: "There is no signed quote yet, so there is no contract value to balance against." · "This project has no billable milestones — add payment milestones to the timeline first." · "No invoices have been raised on this project yet, so there is nothing to re-balance." · "The excess needs to go back to the client as a credit note, but no invoice has been issued yet to credit against." · "The draft credit note could not be saved, so nothing was changed — try again." · "This project's invoices could not be loaded — try again." · "This project could not be loaded — refresh and try again." · "Something went wrong during the re-sync — try again." `L/finance/rebalance-outcome-copy.ts:32-53`
- **G-197** The on-demand route allows Owner, Admin, Accountant, Accounting; anyone else gets 403. `A/finance/records/rebalance/route.ts:71-80`

### Variance and top-up

- **G-198** Variance = invoice total − expected amount, treated as zero within ±$1. An over-billed invoice cannot be saved without a chosen treatment ("flagged", "rebalance" or "vo"); an under-billed one is saved as "flagged". `A/projects/[id]/invoices/milestone/route.ts:261-282`, `A/projects/[id]/invoices/milestone/route.ts:314-316`
- **G-199** Any non-zero variance creates a task for the project's assigned designer (else the owner), due in three days: "Reconcile over-billing for {milestone}" or "Reconcile under-billing for {milestone}". `A/projects/[id]/invoices/milestone/route.ts:372-442`
- **G-200** A top-up is a second invoice on an under-billed milestone. The server allows it only when the first invoice's variance is negative and the top-up equals the gap within $1 ("Top-up only applies when the existing milestone invoice is under-billed." / "Top-up must match the gap ({n}c). Got {m}c. Use a Variation Order for extra scope."). The original's variance is then set to zero with resolution "topup" and its task is closed. `A/projects/[id]/invoices/milestone/route.ts:163-197`, `A/projects/[id]/invoices/milestone/route.ts:346-370`
- **G-201** Fixed-amount ("fee first") milestones are implemented in the libraries behind one switch that is off for every studio. `L/finance/milestone-schedule.ts:95`

### Problems

- **G-202** The draft credit note has no home: no screen lists drafts and no route issues them, yet the toast says "review it under Credit Notes". The rules doc states this openly ("Draft credit notes are invisible until Plan 5"). `L/finance/rebalance-outcome-copy.ts:19`, `docs/rules/finance.md:159`, `L/finance/rebalance-credit-note.ts:142-144`
- **G-203** Voiding a draft invoice does not re-run the rebalance; the other drafts keep their sizes until the next insert or a manual re-sync **[inferred — the invoice PATCH route makes no rebalance call]**. `A/finance/records/invoices/[id]/route.ts:120-181`
- **G-204** Three different ways of numbering invoices are in use: a per-studio sequence function (milestone, ad-hoc, supplement), a "highest existing + 1" read (auto-created on milestone completion) and a count-based start (bulk generate). `A/projects/[id]/invoices/milestone/route.ts:252-258`, `A/finance/records/invoices/auto-milestone/route.ts:151-155`, `A/finance/generate-invoices/route.ts:165-172,219`
- **G-205** The invoice auto-created on milestone completion is a draft but is stamped with an issue date. `A/finance/records/invoices/auto-milestone/route.ts:168-174`
- **G-206** The frozen-schedule rule and the allocation both treat only percentage milestones as billable on the Overview timeline and picker, so a fixed-fee milestone would be invisible there if the flag were turned on. `F/ProjectFinanceSummary.tsx:203-208`, `F/milestone-picker-dialog.tsx:80-85`
- **G-207** Two concurrent inserts on one project can leave draft amounts one run stale (accepted and documented). `docs/rules/finance.md:169`

---

## 8. Invoices sub-tab (list and expanded invoice)

### What it is / layout

- **G-208** A top row with "View in Studio Finance ↗" (to `/finance/operations?tab=invoices&project={id}`) on the left and a compact outline button "Upload Invoice" on the right; then the invoice list. `PAGE:3757-3789`
- **G-209** The list has three parts (`space-y-4`): a summary strip, the table (cards on a phone), and — only when uploads exist — an "External Invoices" card. `F/InvoiceList.tsx:176-466`
- **G-210** Summary strip from `sm`: three cards "Total Invoiced" (with "+ {amount} in drafts" under it), "Total Received" (green) and "Outstanding". On a phone: one card with "Invoiced", "Received", "Outstanding" in whole dollars and a footnote "{amount} prepared in drafts — not yet sent". `F/InvoiceList.tsx:180-215`

### UI elements

- **G-211** Table columns: (chevron) · "Invoice #" · "Description" · "Amount" · "Paid" · "Balance" · "Status" · "Actions". Header text 11px semibold uppercase. `F/InvoiceList.tsx:220-227`
- **G-212** Row: chevron (down / up when open), number, description or "—", amount, paid in green, balance, then a status badge with a three-dot progress mark and a caption "{amount} in draft | billed · {paid} paid · {owed} owed" (or "Voided"). Dots: draft none, sent / overdue one, any payment two, paid three, void all grey. `F/InvoiceList.tsx:229-264`, `F/InvoiceList.tsx:25-31`, `F/money-status-dots.tsx:31-79`
- **G-213** Status badges: "Draft" (grey), "Sent" (primary tint), "Partially Paid" (yellow), "Paid" (green), "Overdue" (red), "Void" (grey, dimmed text). Two overlays replace the badge: "Pending Approval" (yellow) while approval is pending, "Approval Rejected" (red) on a rejected draft. `F/InvoiceList.tsx:33-71`
- **G-214** Row actions (28px high, 10px text): "Send" — or "Resubmit" after a rejection — on a draft that is not awaiting approval; "Record Payment" on a billable invoice with a balance. `F/InvoiceList.tsx:265-296`
- **G-215** The expanded invoice is a grey panel (`bg-surface-bg p-5 space-y-4`) holding, in order: approval banners; "Line Items" (description and amount per line); one line of totals "Subtotal: … · {GST} ({rate}%): … · Total: … · Due: …"; "Payment History" (green rows: date, method chip, "Ref: …", amount); "Edit History" (who, when, "{field}: ~~old~~ → new" or "Line Items updated"); the action buttons. `F/InvoiceDetail.tsx:152-427`
- **G-216** Buttons inside the expanded invoice: "Send Invoice" (draft, not pending), "Record Payment" (billable, not paid), "Mark as Paid" (green outline; billable with a balance), "Preview Invoice" (always), "Void" (red outline; drafts only). A "Copy Payment Link" button exists but is switched off by a constant. `F/InvoiceDetail.tsx:25-29`, `F/InvoiceDetail.tsx:360-427`
- **G-217** Pending banner (yellow): "Pending approval" — "This invoice is waiting for an owner or admin to approve before it's sent to the homeowner." Approvers get "Approve & Send" and "Reject"; everyone else gets a "Remind approver" button that shows a cooldown. `F/InvoiceDetail.tsx:159-207`
- **G-218** Rejected banner (red): "Approval rejected", the reason, and "Edit the invoice and click Send again to resubmit for approval." `F/InvoiceDetail.tsx:208-221`
- **G-219** "External Invoices" card: a header with an upload icon, the title and a count chip; each row shows the file name, an "External" chip, "Ref: …", the counterparty, the amount, the date, a download icon (a disabled icon titled "Link unavailable" when the file cannot be linked) and a delete icon. `F/InvoiceList.tsx:402-466`

### Interactions

- **G-220** Clicking a row opens or closes it; one row is open at a time. `F/InvoiceList.tsx:234`
- **G-221** Arriving from "view invoice" elsewhere: the row is already open, scrolls smoothly to the middle of the screen and flashes once. `F/InvoiceList.tsx:90-101`, `F/InvoiceList.tsx:232-233`
- **G-222** "Send" / "Send Invoice": toast "Invoice {number} sent", or "Invoice {number} submitted for approval" when the gate applies; on failure the server's message or "Failed to send invoice". `F/InvoiceList.tsx:103-117`, `F/InvoiceDetail.tsx:108-120`
- **G-223** "Void" acts at once with no confirmation: toast "Invoice {number} voided" (or "Failed to void invoice"). `F/InvoiceList.tsx:119-131`, `F/InvoiceDetail.tsx:417-426`
- **G-224** "Mark as Paid" opens a small dialog "Mark {number} as paid" — "Records a payment of {balance} dated today and marks this invoice as fully paid." — with one field "Payment method" ("Bank Transfer", "PayNow", "Cheque", "Cash", "Credit Card", "GIRO") and buttons "Cancel" / "Mark as paid". It records a real payment with the note "Marked as paid"; toast "Invoice {number} marked as paid". `F/InvoiceDetail.tsx:126-142`, `F/InvoiceDetail.tsx:440-473`, `F/RecordPaymentDialog.tsx:41-48`
- **G-225** "Approve & Send": toast "Invoice approved — homeowner notified". "Reject" opens "Reject invoice {number}" — "The invoice will go back to draft. The original submitter can edit and resubmit for approval." — with a required text box ("What needs to be fixed before this can be sent? (required)") and "Keep pending" / "Reject invoice" ("Rejecting..."); toast "Invoice rejected — sent back to draft". `F/InvoiceDetail.tsx:65-88`, `F/InvoiceDetail.tsx:481-514`
- **G-226** "Remind approver": toast "Reminder sent to the approver". The server allows one reminder per user per hour and three per invoice per day. `F/InvoiceDetail.tsx:92-102`, `A/finance/invoices/[id]/remind-approver/route.ts:9,27`
- **G-227** The due date on a draft is edited in place (label "Due", placeholder "Set due date"); toast "Due date updated". `F/InvoiceDetail.tsx:278-289`
- **G-228** "Preview Invoice" leaves the project for a full-screen page `/finance/invoices/{id}/preview` with "Back", "Copy payment link" and "Print / PDF" (the browser's print); Escape goes back. `F/InvoiceDetail.tsx:399-406`, `src/app/(main)/finance/invoices/[id]/preview/page.tsx:60-121`
- **G-229** "Upload Invoice" opens the same external-document dialog titled "Upload External Invoice" with the counterparty labelled "Client Name". `PAGE:3766-3776`, `F/UploadExternalDocDialog.tsx:28`

### States

- **G-230** Loading: a card with three pulsing 64px blocks. `F/InvoiceList.tsx:133-143`
- **G-231** Empty: icon, "No invoices yet", "Generate invoices from a payment schedule to get started" and a filled button "Generate Invoices". The button opens the milestone picker drawer; on a Draft project it toasts the Draft message instead. `F/InvoiceList.tsx:145-165`, `PAGE:3781-3787`

### Motion

- **G-232** Row hover: tint plus a 3px inset bar at the left over 200ms. `F/InvoiceList.tsx:233`
- **G-233** The focused row flashes with `animate-highlight-flash`: keyframes `highlight-flash` hold the primary tint to 50% and fade to transparent, 1.5s ease-out, once. `src/app/globals.css:1240-1248`
- **G-234** A status badge fades in when its label changes (`animate-in fade-in duration-300`). `F/InvoiceList.tsx:249-253`

### Rules

- **G-235** "Total Invoiced" counts invoices that are not draft and not void; "Received" is their paid amounts; "Outstanding" is the difference; drafts are reported separately. `F/InvoiceList.tsx:167-174`
- **G-236** Payment controls appear only on a billable invoice — status not draft, void or cancelled. `L/finance/invoice-ledger.ts:19-23`, `F/InvoiceList.tsx:285`, `F/InvoiceDetail.tsx:378-389`

### Responsive

- **G-237** Below `sm` each invoice is a card: number, dots and badge; description; a three-column "Amount / Paid / Balance" in whole dollars; "Send" and a chevron. "Record Payment" is not on the card — only inside the opened invoice. `F/InvoiceList.tsx:316-400`

### Problems

- **G-238** There is no way to edit an invoice's lines, description or amount. The rejected banner tells the user to "Edit the invoice", and an invoice editor component is mounted on the page, but nothing opens it. `F/InvoiceDetail.tsx:217-219`, `PAGE:683`, `PAGE:4817-4823`
- **G-239** "Void" is offered on drafts only, although the server also allows voiding a sent or overdue invoice; it has no confirmation and no undo. `F/InvoiceDetail.tsx:417`, `L/finance/invoice-ledger.ts:91-99`
- **G-240** The server can re-email an issued invoice (`resend`), but no screen offers it. `A/finance/invoices/[id]/send/route.ts:54-72`
- **G-241** Sending a draft from the list sets its status but not its issue date; only "Save & Send" in the composer stamps one **[inferred from the two routes; a database trigger may fill it]**. `A/finance/invoices/[id]/send/route.ts:217-221`, `A/projects/[id]/invoices/milestone/route.ts:305`
- **G-242** "Copy Payment Link" is hidden in the list ("Online payment links aren't built yet") and shown on the preview page. `F/InvoiceDetail.tsx:25-29`, `src/app/(main)/finance/invoices/[id]/preview/page.tsx:103-112`
- **G-243** The empty state still describes bulk generation; the bulk dialog is mounted but unreachable. `F/InvoiceList.tsx:150-160`, `PAGE:4012-4017`
- **G-244** An uploaded external invoice is invisible until the project has at least one system invoice, because the empty state returns before the External card. `F/InvoiceList.tsx:145-165`, `F/InvoiceList.tsx:402`
- **G-245** Deleting an external document has no confirmation. `F/InvoiceList.tsx:452-460`
- **G-246** A cancelled invoice shows its raw status word in the default grey; dates in payment history and the due line are raw ISO strings. `F/InvoiceList.tsx:33-55`, `F/InvoiceDetail.tsx:293,307`
- **G-247** Four routes to the same act on one screen: the row's "Record Payment", the opened invoice's "Record Payment", "Mark as Paid", and the frame's "Record Payment" drawer — two different surfaces (dialog and drawer). `F/InvoiceList.tsx:285-294`, `F/InvoiceDetail.tsx:378-398`, `PAGE:3366-3372`

---

## 9. Creating an invoice — the invoice drawer

### What it is / layout

- **G-248** One right-side sheet (full width on a phone, `sm:max-w-2xl`) that walks Milestone → (Complete) → Compose → Done, or Milestone → Ad-hoc → Done. Header: `Receipt` icon, title, one-line description, and a step rail of small pills joined by 1px lines; a finished step shows a check. `F/invoice-drawer.tsx:181-221`, `F/action-drawer.tsx:66-103`
- **G-249** Titles: "Create Invoice", "New Invoice — {milestone}", "Ad-hoc Invoice", "Invoice created". Descriptions: "Pick a milestone to bill on {project}.", "Not tied to a contract milestone.", "{milestone} isn't marked complete yet.", "{pct}% of contract · Expected {amount}". `F/invoice-drawer.tsx:194-209`
- **G-250** Entry points: Income › "Raise an invoice" and the Invoices empty state (start at the picker); a timeline chip's "Bill now" (start at Compose) or "Complete & bill…" (start at Complete); "Create ad-hoc invoice" (start at Ad-hoc); the payment drawer's "Create an invoice". `PAGE:698-737`, `PAGE:3298`, `PAGE:4031`

### Step 1 — pick a milestone

- **G-251** One row per payment milestone: a 32px status square (completed — green check; in progress or pending approval — yellow clock; blocked — red alert; not started — grey receipt), the name, an outline badge with the status word, a green "Invoiced" badge when an invoice exists, and "{pct}% of contract · {nominal amount}". `F/milestone-picker-dialog.tsx:147-190`, `F/milestone-picker-dialog.tsx:313-334`
- **G-252** Third line and button depend on state: invoiced → "{invoice number} · {amount} · paid | draft" and "Open ↗"; completed and unbilled → "Bill now: {amount}" and a filled "Bill ›"; not completed → yellow "Mark complete first to bill {amount}" and "Complete & Invoice… ›" (tooltip "Walks you through completing the milestone and reviewing the invoice"). `F/milestone-picker-dialog.tsx:191-256`
- **G-253** The last row is always "Ad-hoc invoice (no milestone)" — "Bill outside the contract schedule. Capture as a Variation Order so the contract stays accurate, or skip the VO for one-offs." `F/milestone-picker-dialog.tsx:263-278`
- **G-254** Loading: three skeleton rows shaped like the real rows. Empty: "No billable milestones yet" — "Add payment milestones to the project timeline (Gantt → Edit milestone → set % of contract), or skip the schedule with an ad-hoc invoice below." — and a pill "Create ad-hoc invoice instead". `F/milestone-picker-dialog.tsx:124-145`, `F/payment-pickers.tsx:40-54`

### Step 2 — complete the milestone (only when it is not complete)

- **G-255** A green box: "Mark **{milestone}** as completed?" — "You'll review the invoice on the next step before anything is sent." Buttons "Confirm & continue ›" (green) and "Back" (or "Cancel" when the drawer was opened on this step). `F/invoice-drawer.tsx:232-268`
- **G-256** When the studio requires milestone approval and the user is not an owner: "As a non-owner, this will be submitted for approval instead of directly completed. You can still draft the invoice now." Confirming writes the milestone's status to "completed", or to "pending-approval" in that case. `F/invoice-drawer.tsx:127-162`, `PAGE:3971-3983`

### Step 3 — compose

- **G-257** Top of the form: a grey row "Have a PDF?" — "Auto-fill the line items + total from a vendor invoice." — [Upload PDF]; then, for studios with two or more legal entities, "Issuing legal entity" (a select, or a locked chip with "Locked to the project's issuing entity. To use a different entity, create a new project for this customer."). `F/invoice-composer-dialog.tsx:412-439`, `F/entity-select-field.tsx:59-108`
- **G-258** A banner compares the total with the expected amount: green "✓ Invoice total matches the milestone's expected amount."; yellow "Over by {amount} — pick how to treat the extra below."; blue "Under by {amount} — we'll record the difference as a variance and create a reconciliation task." `F/invoice-composer-dialog.tsx:709-737`
- **G-259** Over-billed: "How should we treat the extra {amount}?" with three radio cards — "Create a Variation Order for the extra work" ("Contract value rises by the over-bill. We'll save this invoice at the expected amount, then create the VO for the delta. (Recommended.)"); "Front-load this milestone, let the schedule re-balance" ("Save the full invoice now. The remaining unsent drafts shrink to keep the contract total intact — if they can't cover it, we raise a draft credit note. Milestone percentages don't change."); "Flag and proceed anyway" ("Save the over-billed invoice as-is. We'll surface the variance on the project and create a reconciliation task.") with an optional note "Why is this invoice over the expected amount?". `F/invoice-composer-dialog.tsx:757-812`
- **G-260** Under-billed: an optional field "Variance note (optional, e.g. "Client discount", "Absorbed margin")" with placeholder "Why is this invoice less than expected?". `F/invoice-composer-dialog.tsx:739-755`
- **G-261** "Line Items" grid with columns Description · Qty · Unit ({currency symbol}) · Total · remove (`grid-cols-[1fr_60px_100px_100px_28px]`), an "Add line" link, and one starting row "{milestone} ({pct}%)" at quantity 1 and the expected amount before GST. `F/invoice-composer-dialog.tsx:474-541`, `F/invoice-composer-dialog.tsx:867-876`
- **G-262** Keyboard: Enter in the last row's description adds a row and moves focus to it; Backspace in an empty description removes that row. The last remaining row cannot be removed. `F/invoice-composer-dialog.tsx:214-233`
- **G-263** Totals "Subtotal", "{GST} ({rate}%)", "Total"; "Due date" (defaults to 14 days from today); "Notes (optional)" with placeholder "Anything the client should know about this invoice…". `F/invoice-composer-dialog.tsx:543-571`, `F/invoice-composer-dialog.tsx:878-882`
- **G-264** Footer: a note "Auto-filed to project Documents", then "Save as Draft" and "Save & Send". With the VO option chosen the first reads "Save & Continue to VO →" and the second is disabled (tooltip "Send after creating the VO"). `F/invoice-composer-dialog.tsx:574-598`
- **G-265** Saving is disabled while saving, when the total is zero, when every description is blank, or when the invoice is over-billed and no treatment is chosen. `F/invoice-composer-dialog.tsx:235-252`
- **G-266** Toasts: "Invoice {number} saved as draft." · "Invoice {number} sent to client." · "Already invoiced — opening {number}." · "Invoice saved, but the schedule didn't re-balance — review the remaining drafts." · "Invoice {number} saved — now create the VO for the extra {amount}." `F/invoice-composer-dialog.tsx:304`, `F/invoice-composer-dialog.tsx:365-375`
- **G-267** The VO option saves the invoice at the expected amount by scaling every line price down in proportion, sends nothing, and moves to Done carrying the difference. `F/invoice-composer-dialog.tsx:261-316`

### Step 3 (alternative) — ad-hoc

- **G-268** A blue note "This bill is outside the contract milestones. Pick how to record it below." and two radio cards: "Capture as a Variation Order (recommended)" ("Contract value rises by this amount and the work is auditable. We'll open the VO editor next and land you on the Contract/VO tab, where you bill it once it's approved.") and "Just invoice (ad-hoc)" ("The bill is outside the contract — it won't change the contract value. Reports flag this as ad-hoc."). `F/adhoc-invoice-composer-dialog.tsx:281-299`
- **G-269** "Just invoice" adds "Reason (for reporting)" chips — "Material upgrade", "Out-of-scope work" (preselected), "Reimbursement", "Other" — then "Description *" ("e.g. Additional kitchen carpentry"), the same line grid and totals, "Due date", "Notes (optional)"; footer "Save as Draft" / "Save & Send". Toasts "Ad-hoc invoice {number} saved." / "Ad-hoc invoice {number} sent." `F/adhoc-invoice-composer-dialog.tsx:82-87`, `F/adhoc-invoice-composer-dialog.tsx:234-236`, `F/adhoc-invoice-composer-dialog.tsx:301-438`
- **G-270** With the VO card chosen the footer has one button, "Next: Create VO ›", enabled only once a description and a priced line are filled. `F/adhoc-invoice-composer-dialog.tsx:196-209`, `F/adhoc-invoice-composer-dialog.tsx:432-436`

### Step 4 — done

- **G-271** A card with a green check, "{invoice number} · {amount}" and a pill "Sent to client" or "Saved as draft". Next-step buttons: "View invoice · send from there" (draft) or "View invoice" and "Record payment when paid" (sent). `F/invoice-drawer.tsx:321-385`
- **G-272** After the VO option: a yellow box "The invoice was saved at the expected amount. The extra {amount} needs a Variation Order so the contract stays accurate." with "Create the VO now ›". `F/invoice-drawer.tsx:341-361`
- **G-273** After completing a milestone in this flow: "Share a progress update about completing {milestone}? (optional)", a text box ("e.g. {milestone} has been completed. All work inspected and approved."), and "Post update" ("Posting…"); then "✓ Progress update posted". The update is titled "Milestone completed: {milestone}". A "Done" button closes the drawer. `F/invoice-drawer.tsx:164-179`, `F/invoice-drawer.tsx:387-419`

### Closing the drawer

- **G-274** While on Compose or Ad-hoc (or mid-save), Escape, the overlay or the X do not close; a yellow bar appears under the header: "Discard this draft? Your edits haven't been saved." with "Keep editing" and "Discard". `F/action-drawer.tsx:54-60`, `F/action-drawer.tsx:105-130`, `F/invoice-drawer.tsx:220`

### "Upload PDF" — reading an invoice file

- **G-275** A near-full-screen dialog (96vw × 92vh) "Upload Invoice PDF" — "Drop a PDF, image, or spreadsheet — we'll extract the fields. Verify before pre-filling the composer." Stage 1: a dashed drop box "Drop a file or click to choose" / "PDF · PNG · JPG · CSV · XLSX · up to 10 MB". Stage 2: a spinner, "Reading {file}…", "Gemini is extracting line items, totals, and metadata." Stage 3: the file on the left (PDF, image, or "Preview not available for this file type.") and on the right "Invoice number", "Supplier", "Due date", a "Line items" grid with "+ Add line item", "Parsed total: …", "Notes". Low-confidence fields carry a yellow or red dot ("Medium confidence — double-check", "Low confidence — please verify"). Footer: "Cancel", "Re-scan", "Looks good" ("Attaching…"). `F/invoice-pdf-digitizer-dialog.tsx:177-353`, `F/invoice-pdf-digitizer-dialog.tsx:371-375`
- **G-276** "Looks good" uploads the file, then replaces the composer's lines, sets the due date and appends the notes; toast "Invoice fields pre-filled — review and save." Other toasts: "Couldn't read line items — review and edit manually.", "Add at least one line item before confirming.", "Couldn't attach the original PDF to the invoice. Continuing without it." `F/invoice-pdf-digitizer-dialog.tsx:98-100`, `F/invoice-pdf-digitizer-dialog.tsx:125-171`, `F/invoice-composer-dialog.tsx:392-405`

### Motion

- **G-277** The drawer slides in from the right over 500ms and out over 300ms (`ease-in-out`); the overlay fades. Step pills change colour with `transition-colors`. `src/components/ui/sheet.tsx:39,63-65`, `F/action-drawer.tsx:91`

### Rules (server, on save)

- **G-278** The server trusts only the total sent; it recomputes subtotal and GST from the contract's GST fraction. `A/projects/[id]/invoices/milestone/route.ts:233-248`
- **G-279** "Save & Send" writes the invoice directly as sent with an issue date, emails the client (`invoice.sent`, with the amount and due date) and queues the accounting sync unless the studio's approval gate applies to this user. `A/projects/[id]/invoices/milestone/route.ts:284-306`, `A/projects/[id]/invoices/milestone/route.ts:444-561`
- **G-280** An ad-hoc invoice is flagged `is_adhoc` with its reason and never moves the schedule; it has no variance. `A/projects/[id]/invoices/adhoc/route.ts:249-277`

### Problems

- **G-281** Ad-hoc → "Capture as a Variation Order": the form demands a description and priced lines before "Next: Create VO" lights up, then closes the drawer without the discard prompt and opens an empty VO. Nothing typed is carried over. `F/adhoc-invoice-composer-dialog.tsx:196-209`, `F/invoice-drawer.tsx:313-316`, `PAGE:3985`
- **G-282** "Create the VO now" also opens an empty VO; the extra amount and the invoice it belongs to are passed to the page and ignored. `F/invoice-drawer.tsx:349-359`, `PAGE:3986-3991`
- **G-283** "Save & Send" bypasses the invoice approval gate that "Send" on a draft respects (the route's own comment calls it a known, unfixed issue). `A/projects/[id]/invoices/milestone/route.ts:448-455`
- **G-284** "Have a PDF? Auto-fill … from a vendor invoice." is wrong wording inside a client invoice; the parsed "Supplier" and "Invoice number" are shown for checking and then dropped. `F/invoice-composer-dialog.tsx:414-415`, `F/invoice-composer-dialog.tsx:392-405`
- **G-285** "Re-scan" on the verify stage presses a file input that exists only on the first stage, so it does nothing **[inferred from the markup]**. `F/invoice-pdf-digitizer-dialog.tsx:190-216`, `F/invoice-pdf-digitizer-dialog.tsx:342-344`
- **G-286** With no AI key the file reader returns a canned sample invoice instead of an error. `A/finance/invoices/parse/route.ts:176-182`
- **G-287** The milestone status is written without waiting for the result; a failed save still moves on to Compose. `F/invoice-drawer.tsx:151-162`, `PAGE:3979-3982`
- **G-288** The same action has different names in two places: "Bill now" / "Complete & bill…" on the timeline, "Bill" / "Complete & Invoice…" in the picker. `F/overview/billing-timeline-card.tsx:221`, `F/milestone-picker-dialog.tsx:238,253`

---

## 10. Invoice life cycle, numbering, approval, and what the client sees

### Rules and logic

- **G-289** Statuses: draft, sent, partially_paid, paid, overdue, void, cancelled. Money cannot move on draft, void or cancelled. `L/finance/invoice-ledger.ts:19-23`
- **G-290** Paid and partially paid are never set by hand. The database recomputes "amount paid", "credited" and the status whenever a payment or credit note changes: paid when counted payments + credits ≥ total; partially paid when any payment counts; otherwise it stays sent or overdue. `L/finance/invoice-ledger.ts:25-37`, `docs/rules/finance.md:64-81`
- **G-291** Moves a person may make: draft → sent / void / cancelled; sent → void / cancelled / overdue; overdue → sent / void / cancelled; partially paid → overdue. A paid or partially paid invoice cannot be voided ("Invoice cannot move from {a} to {b} by hand"). `L/finance/invoice-ledger.ts:91-104`, `A/finance/records/invoices/[id]/route.ts:96-103`
- **G-292** Overdue is set by a daily job (06:00 Singapore time): every sent or partially paid invoice past its due date becomes overdue and an `invoice.overdue` notice is sent with the days overdue. `A/cron/invoice-overdue/route.ts:7-25`, `A/cron/invoice-overdue/route.ts:52-90`
- **G-293** Number format `{prefix}-{0000}`; the prefix comes from the studio's — or the issuing entity's — numbering settings (default "INV"); one sequence per studio shared by milestone, ad-hoc and supplement invoices. `A/projects/[id]/invoices/milestone/route.ts:250-258`, `A/projects/[id]/invoices/adhoc/route.ts:233-244`
- **G-294** Each invoice gets a 16-character share token for the public page `/pay/inv/{token}`, and a file entry "{number}.pdf" in the project's "Financial Documents/Invoices" folder. `A/projects/[id]/invoices/milestone/route.ts:259`, `A/projects/[id]/invoices/milestone/route.ts:327-344`
- **G-295** Edits through the invoice update route are logged per field ("Status", "Description", "Subtotal", "GST", "Total", "Due Date", "Notes", "Line Items") with the editor's name and time; subtotal + GST must equal the total. `A/finance/records/invoices/[id]/route.ts:107-169`
- **G-296** Approval gate: on when the studio's settings require invoice approval or milestone approval. A sender who is not Owner / Admin / Accountant / Accounting does not send: the invoice stays a draft marked "pending", the owner gets a task "Approve invoice {number} ({amount})" and an `invoice.pending_approval` notice. `A/finance/invoices/[id]/send/route.ts:74-211`
- **G-297** Approving (approver roles only; others get "Approver role required") marks the invoice approved and sent, emails the client and rings the homeowner's bell. `A/finance/invoices/[id]/approve/route.ts:41-50`, `A/finance/invoices/[id]/approve/route.ts:77-155`
- **G-298** A direct send sets the status to sent, queues the accounting sync, emails the client `invoice.sent` with the link `/pay/inv/{token}`, and rings the homeowner's bell. `A/finance/invoices/[id]/send/route.ts:213-313`
- **G-299** Only a draft can be issued: sending anything else answers "Invoice is already {status}. Use resend to email it again."; void and cancelled answer "Cannot send a {status} invoice". `A/finance/invoices/[id]/send/route.ts:57-72`
- **G-300** The GST line on every document appears only when the invoice carries GST, labelled with the invoice's own effective rate ("GST (9%)", "GST (8.5%)"). `L/finance/gst-display.ts:26-37`

### What the client sees

- **G-301** Public invoice page (`/pay/inv/{token}`, no login): the studio's logo or initial, name, address and registration number; "INVOICE", the number and a status badge; Issued and Due dates; a numbered line table; Subtotal, GST, Total, then "Amount Paid" and "Balance Due" once something is paid; "Payment History"; "Payment Details" (Bank, Account No, Account Holder, SWIFT); Notes; "Generated by {studio} via OpenMaison". `src/app/pay/inv/[token]/page.tsx:148-351`
- **G-302** The same page shows a disabled button "Pay Online · {balance} — COMING SOON" and "Online payments aren't enabled yet. For now, please use the bank transfer details below." `src/app/pay/inv/[token]/page.tsx:293-313`
- **G-303** In the homeowner portal's project page: "Total Invoiced", "Paid", "Outstanding"; "Credits issued −{amount}"; a "Payment Details" card with copy buttons for each bank field and a QR code — the studio's uploaded image ("Scan to pay", "Amount to enter: …") or a generated PayNow / DuitNow code ("Scan to pay with PayNow", "Amount: …") — and a button "I've Made Payment" ("Your studio will be notified to verify the payment."); then one card per invoice with "View invoice" and "I've paid this invoice". `src/app/my/projects/[projectId]/page.tsx:786-878`, `src/components/homeowner/bank-details-card.tsx:80-179`
- **G-304** The PayNow code is a standard merchant QR string: the studio's UEN or mobile number, the exact balance of the first unpaid invoice (not editable in the banking app), the invoice number as reference (25 characters), the account name as merchant (25 characters), currency SGD. A DuitNow version exists for MYR. `L/paynow-qr.ts:80-128`, `L/paynow-qr.ts:154-197`, `src/app/my/projects/[projectId]/page.tsx:827-829`

### Problems

- **G-305** The screens treat milestone approval as on by default, while the send route reads the raw setting, which is absent (off) for studios that never saved it **[inferred]**. `L/queries/studio-config.ts:74`, `A/finance/invoices/[id]/send/route.ts:93-100`
- **G-306** The QR code exists only inside the homeowner portal. The public invoice page — the one the "invoice sent" email links to — has bank details, no QR, and a dead "Pay Online" button. `src/app/pay/inv/[token]/page.tsx:293-334`
- **G-307** Creating an invoice needs only a signed-in studio session; no role is checked on the milestone, ad-hoc, update or credit-note routes. `A/projects/[id]/invoices/milestone/route.ts:108-135`, `A/finance/records/invoices/[id]/route.ts:68-80`

---

## 11. Recording payments, receipts and verification

### The payment drawer (frame button "Record Payment", and "Record payment" chips)

- **G-308** One drawer for money in and money out: Pick → Record → Done. Titles: "Record a payment", "Record Payment — {invoice number}", "Record Vendor Payment — {PO number}", "Invoice fully paid", "PO fully paid". Descriptions: "Pick what the payment is against — from your client, or out to a vendor.", "Outstanding {amount}", "{vendor} · Outstanding {amount}", "{number} is settled." `F/payment-drawer.tsx:102-123`
- **G-309** Pick step: a section "↓ From client — invoices" listing each billable invoice with a balance (green receipt square, number, status badge, description, "Total {x} · Outstanding {y}"); a section "↑ To vendor — purchase orders" listing each PO with a balance that is not cancelled or closed (cart square, number, status, vendor, totals); then a grey row "Paid for something with no invoice or PO? **Log it as an expense**". `F/payment-drawer.tsx:136-175`, `F/payment-pickers.tsx:83-87`, `F/payment-pickers.tsx:112-141`, `F/payment-pickers.tsx:158-217`
- **G-310** Empty sections: "No outstanding invoices" — "Every invoice on this project is fully paid, void, or hasn't been created yet." — [Create an invoice]; "No outstanding POs" — "Every PO on this project is fully paid, closed, or hasn't been created yet." — [Create a PO]. Loading: skeleton rows. `F/payment-pickers.tsx:89-110`, `F/payment-pickers.tsx:164-185`
- **G-311** Record a client payment: "Amount ({currency code}) *" prefilled with the balance, with two chips above it — "Full balance {amount}" and "Half"; "Payment Method" (six options, "Bank Transfer" first); "Reference Number" ("e.g. TXN-12345"); "Payment Date *" (today); "Notes" ("Optional notes..."); then "Recorded so far ({n})" listing earlier payments with amount · method, "Ref: …", date and a receipt link ("RCP-0001", or "Get receipt"). Buttons "Cancel" and "Record Payment" ("Recording..."). `F/RecordPaymentDialog.tsx:156-303`
- **G-312** Inline errors (10px red under the field): "Enter a valid payment amount", "Amount exceeds outstanding balance of {amount}", "Payment date is required". Server refusals are shown as a toast with the server's sentence. `F/RecordPaymentDialog.tsx:113-125`, `F/RecordPaymentDialog.tsx:147-153`
- **G-313** A payment that clears the balance ends on a Done step: a green card "Payment recorded" — "{total} collected in full — nothing outstanding." — with "View invoice" and "Done". A part payment toasts "Payment of {amount} recorded" and closes the drawer. `F/payment-drawer.tsx:185-193`, `F/payment-drawer.tsx:216-246`, `F/RecordPaymentDialog.tsx:138-146`
- **G-314** Record a vendor payment: "Amount ({code}) *", "Payment Method", "Reference Number", "Payment Date", "Notes"; button "Record Payment". Toasts "Enter a valid amount", "Amount exceeds outstanding balance", "Payment recorded", "Failed to record payment". Cleared in full → "Payment recorded" — "{amount} paid — no balance owed on this PO." — with "View PO". `F/RecordPOPaymentDialog.tsx:109-205`, `F/payment-drawer.tsx:195-239`
- **G-315** "Cancel" on the Record step returns to the pick list (or closes, when the drawer was opened on a specific invoice). Closing mid-record shows the discard bar. `F/payment-drawer.tsx:134`, `F/payment-drawer.tsx:192,209`

### Rules

- **G-316** A payment recorded by a studio member counts immediately: Owner / Admin / Accounting record it as "management verified", anyone else as "ID verified". A homeowner's uploaded proof is "unverified" and does not count until the studio verifies it — unless the studio's "trust homeowner submissions" setting is on and the amount does not exceed the balance. `L/finance/payment-tier.ts:8-34`, `A/homeowner/projects/[id]/payment-submit/route.ts:113-131`
- **G-317** The server refuses a payment on a draft, void or cancelled invoice ("Cannot record a payment against a {status} invoice") and one above the balance ("Payment exceeds the outstanding balance ({n} cents)"). `A/finance/invoices/[id]/payment/route.ts:90-107`
- **G-318** Side effects of each client payment: accounting sync queued; a commission accrual when the project has commission switched on (rule picked in the order project + member, project, member, studio default; a percentage applies to each payment — or to the payment × the project's margin ratio on a "profit" rule; a fixed amount accrues once per project; the amount is split between the project's assignees by their shares); a receipt is issued. `A/finance/invoices/[id]/payment/route.ts:141-399`
- **G-319** Receipt: a number `RCP-0000` and a secret link are minted once per payment; the client is emailed (`invoice.payment_received`) with `/pay/receipt/{token}`; the homeowner's bell rings; "delivered" is stamped only when the client has an email address. Every payment gets one, including an unverified proof. `L/finance/receipt-identity.ts:33-101`, `L/finance/issue-receipt.ts:104-170`, `docs/rules/finance.md:341`
- **G-320** A receipt shows: number, issue date, the studio's name, address, registration and logo, the payer, the invoice number, amount, method, reference, payment date, invoice total, paid to date and outstanding (never negative). `L/finance/receipt-view-model.ts:38-96`

### Receipts sub-tab

- **G-321** A read-only register of payments received on this project. Top row: "View in Studio Finance ↗" (to `/finance/operations?tab=receipts`) and the hint "Record a payment from the Invoices tab". Columns: "Receipt no." · "Invoice" · "Amount" · "Method" · "Date" · "Status" · (actions). Status chip "Issued" (green) or "Not issued" (grey), plus "Unverified" (yellow) beside it. Actions: "View" and "PDF" links, or "—". `F/project-receipts-section.tsx:74-147`, `F/receipts-table.tsx:37-51`
- **G-322** States — loading: three pulsing 48px bars; error: "Couldn't load payments for this project." [Try again]; empty: "No payments received for this project yet." — "Receipts appear here once a payment is recorded against one of this project's invoices."; cap: "Your studio has more than 500 recorded payments, so this list may be incomplete. Open Studio Finance for the full register." `F/project-receipts-section.tsx:49-72`, `F/project-receipts-section.tsx:88-93`, `F/project-receipts-section.tsx:188-193`
- **G-323** Below `sm` each payment is a card (receipt number and chips; "{invoice} · {method}"; amount and date; "View" / "PDF"). `F/project-receipts-section.tsx:150-184`

### Proof of payment and verification

- **G-324** The homeowner's "I've Made Payment" uploads a screenshot (JPEG, PNG, WebP, HEIC or PDF, up to 10 MB) with the amount, method, date, optional reference and note. The studio's assigned designer (else owner, else admin) gets an in-app notice "Payment uploaded by {name}" — "{name} uploaded a payment proof for {invoice} — ${amount}." — linking to Studio Finance. `A/homeowner/projects/[id]/payment-submit/route.ts:1-24,36-37`, `A/homeowner/projects/[id]/payment-submit/route.ts:262-276`
- **G-325** Verifying sets the payment to "management verified"; the invoice's paid amount and status then update, the accounting sync is queued and the homeowner is told the payment was confirmed. Verifying twice is harmless. `A/finance/payment-records/[id]/verify/route.ts:60-146`
- **G-326** The verification queue (Studio Finance › Operations › Overview; inside a project only for expenses) is a table: checkbox · "Date" · "Type" ("Income" green, "Expense" red) · "Description" · "Amount" · "Status" ("Unverified" yellow, "ID Verified" blue) · "Verify" and "Reject" (Reject opens an inline "Reason..." field). Ticking rows shows "{n} item(s) selected" and "Verify Selected". Empty: a green check, "All verified", "No pending items to review." Toasts "Verified", "Rejected", "{n} entries verified", "Verification failed", "Rejection failed". `F/verification-queue.tsx:57-217`

### Problems

- **G-327** The studio can never see the proof it is asked to verify: the file's path is stored on the payment and mapped into the app's types, but no component reads it. The queue row says only "Payment recorded" — no invoice number, no payer, no project. `A/homeowner/projects/[id]/payment-submit/route.ts:168`, `A/finance/records/expenses/route.ts:130-141`, `L/transformers.ts:2196`
- **G-328** "Reject" on an income row in the queue calls nothing and still toasts "Rejected". `F/verification-queue.tsx:83-92`
- **G-329** A payment recorded by mistake cannot be undone from any screen (the reject-payment hook has no caller), and a paid invoice cannot be voided. `A/finance/payment-records/[id]/reject/route.ts:1-17`, `L/finance/invoice-ledger.ts:96-98`
- **G-330** In the project's Receipts list a payment with no receipt shows "—" (the studio-wide list offers "Get receipt"); the "Unverified" chip has no action; the link to Studio Finance drops the project filter that every other sub-tab's link carries. `F/project-receipts-section.tsx:77-82`, `F/project-receipts-section.tsx:133-142`, `F/receipts-table.tsx:336-346`
- **G-331** The payment drawer offers draft POs for payment while the PO's own screen refuses to pay a draft, and it always records a "standard" payment even when the PO has an unpaid advance. `F/payment-pickers.tsx:155-162`, `F/PODetail.tsx:100,114`, `F/payment-drawer.tsx:195-201`
- **G-332** Verification has no role check on the server and no check for overpayment (the second is a documented gap). `A/finance/payment-records/[id]/verify/route.ts:37-48`, `docs/rules/finance.md:123-128`
- **G-333** The proof notice hard-codes "$" whatever the studio's currency. `A/homeowner/projects/[id]/payment-submit/route.ts:272`
- **G-334** The whole studio's payments (capped at 500) are fetched to show one project's. `F/project-receipts-section.tsx:28-47`

### Credit notes

- **G-335** A dialog "Issue Credit Note" — "Issue a credit note against an existing invoice to adjust amounts." — exists: "Against Invoice" (sent, partially paid, paid or overdue invoices, shown as "{number} — {total}"), "Reason" ("E.g., overcharged for electrical points"), "Credit Amount (excl. {GST})", a summary "Subtotal", "{GST} ({rate}%)", "Total Credit −{amount}", and "Cancel" / "Issue Credit Note". GST follows the chosen invoice's own rate. Toasts "Credit note issued" / "Failed to issue credit note". `F/credit-note-dialog.tsx:37-203`
- **G-336** The server numbers it `CN-{year}-{000}`, marks it issued at once, and queues it for accounting; the database then counts it toward the invoice's "credited" amount. It checks no role and no ceiling against the invoice. `A/finance-documents/credit-notes/route.ts:56-156`
- **G-337** Nothing opens this dialog, and no list of credit notes exists in the studio app. Credit notes are read only by the closure summary and by the homeowner's "Credits issued" line. `PAGE:681`, `PAGE:4801-4806`, `P/closure-dialog.tsx:254-257`, `src/app/my/projects/[projectId]/page.tsx:797-803`

---

## 12. POs sub-tab (list, PO detail, create / edit)

### What it is / layout

- **G-338** A top row with "View in Studio Finance ↗" (to `/finance/operations?tab=pos&project={id}`) and a compact "Upload PO" button (opens "Upload External PO", counterparty "Vendor Name"); then the PO list. `PAGE:3800-3833`, `F/UploadExternalDocDialog.tsx:29`
- **G-339** When POs exist, a strip of four centred cards (two per row on a phone, four from `sm`): "Total PO Value", "Paid to Vendors", "Outstanding", "Margin Variance" (a green up-trend or red down-trend icon and the absolute amount). `F/POList.tsx:153-181`
- **G-340** The list card starts with filter chips and a "New PO" button. Chips: "All ({n})", "Draft ({n})", "Pending Review ({n})", "Active ({n})", "Closed/Cancelled ({n})"; a chip with zero is hidden (All stays); the active chip is filled primary. `F/POList.tsx:55-61`, `F/POList.tsx:198-224`

### UI elements — the list

- **G-341** Table (from `lg`): (chevron) · "PO #" · "Vendor" · "Status" · "PO Amount" · "Quoted" · "Variance" · "Paid" · (⋯). `F/POList.tsx:227-241`
- **G-342** Row: the PO number (plus a yellow "Supp" tag on a supplementary PO); the vendor as a link with an external-link icon (to `/finance/vendors?vendorId={id}`) or "Unassigned"; the status badge with small tags "Review" (yellow), "Reviewed" (green) or "Rejected" (red); for Owner / Accounting on a pending-review row, inline "Approve" and "Reject" mini-buttons; the three-dot mark with "{total} committed · {paid} paid · {owed} owed" (or "Cancelled"); amounts; the variance with a sign, green or red; a ⋯ menu with "Cancel PO" and, on a draft, "Delete draft". `F/POList.tsx:243-372`
- **G-343** Status labels and colours: "Draft" (grey), "Pending Review" (yellow), "Approved" (green), "Sent to Vendor" (primary), "Vendor Accepted" (green), "Changes Requested" (yellow), "Vendor Rejected" (red), "Issued" (primary), "Acknowledged" (yellow), "Partially Delivered" (yellow), "Fulfilled" (green), "Closed" (grey), "Cancelled" (red). `F/POList.tsx:23-53`
- **G-344** "External POs" card, built like the external invoices card. `F/POList.tsx:454-518`

### UI elements — the opened PO

- **G-345** A grey panel under the row: a status pill (the status in Title Case), "Vendor: {response}", "Review: {state}"; coloured notices "Cancelled" + reason, "Vendor Requested Changes" + the vendor's note, "Vendor Rejected PO" + note; a facts grid (one to four columns) "Delivery Address", "Billing Address", "Expected Delivery", "Payment Terms", "Payment Due" (with a red chip "{d}d overdue" when late and unpaid). `F/PODetail.tsx:223-313`
- **G-346** "Line Items" table: Description · Category · Unit Price · Qty · Total. A totals box at the right (256px): "Subtotal", the GST line, "PO Total", then "Paid" and "Balance" — or, when an advance is set, "Advance ({pct}% | fixed)", "Advance Paid", "Advance Outstanding", "Net Payable (excl. advance)", "Standard Payments", "Net Balance". `F/PODetail.tsx:315-412`
- **G-347** "Quoted vs Actual" box (when a quoted amount exists): "Quoted: …", "PO Actual (excl. GST): …", "Variance: ±…". "Payment History": date · method · an "Advance" tag · reference, and the amount. `F/PODetail.tsx:414-464`
- **G-348** For Owner / Accounting on a pending-review PO: a yellow box "Accounts Review Required" with a text box ("Optional comment...") and "Approve" (green) / "Reject" (red). `F/PODetail.tsx:466-496`
- **G-349** Action bar (wraps): "Edit" (draft, changes requested, vendor rejected) · "Submit for Review" or "Approve & Issue" (draft) · "Issue PO" (approved) · "Copy Vendor Link" (not a draft) · "Download PDF" (not a draft) · "Record Advance" · "Record Payment" · "View PO" · "Activity" · "Close PO" (vendor accepted with nothing owing) · "Cancel" · "Delete" (draft) · "Duplicate". `F/PODetail.tsx:498-615`
- **G-350** "Activity" toggles a vertical timeline: icon, label, date and time, a quoted comment, "Reason: …", "Amount: {amount} (Advance)". Labels: "PO Created", "PO Edited", "Submitted for Review", "Auto-Approved", "Accounts Approved", "Accounts Rejected", "Sent to Vendor", "Vendor Viewed", "Vendor Accepted", "Vendor Requested Changes", "Vendor Rejected", "Vendor Uploaded Document", "Payment Recorded", "GRN Recorded", "PO Closed", "PO Cancelled", "PO Duplicated". Empty: "No activity recorded yet". `F/POActivityLog.tsx:12-63`

### UI elements — create / edit dialog

- **G-351** Dialog (`sm:max-w-2xl`, at most 85% of the viewport high, body scrolls): "Create Purchase Order" — "Create a PO for sub-contractor or supplier work. Line items can be pre-filled from the project quote." Edit mode: "Edit {PO number}" — "Update PO details, line items, and delivery/payment settings." `F/CreatePODialog.tsx:664-676`
- **G-352** Fields, top to bottom: entity picker ("Determines which legal entity issues this PO."); "Vendor *" with the helper "Required so the PO can be sent to the right party. Add new vendors in Marketplace." and, when quote lines are tagged to that vendor, a button "Add {n} item(s) from quote"; a collapsed panel of the quote's lines; "Line Items"; "Delivery Address" ("Where should goods be delivered?"); "Billing Address" ("Invoice billing address (optional)"); "Expected Delivery Date"; "Payment Terms"; "Advance Payment"; the switch "Requires accounts review"; "Quoted Amount (from client quote)" ("Original quote total for these items"); a totals box; "Compare with quote"; "Notes" ("e.g. Delivery by 15 March, contact site foreman..."). `F/CreatePODialog.tsx:678-1141`
- **G-353** The quote panel's header reads "{n} item(s) in this project's quote", "{n} item(s) from this vendor in the quote" or "No items linked to this vendor in the quote"; links "Show all", "Hide", "Browse all {n}", "Show all {n}", "Show vendor only ({n})". Each line shows the description, a green "this vendor" tag, "{category} · {qty} × {price}" and an "Add" button. `F/CreatePODialog.tsx:734-823`
- **G-354** Line table: Description (placeholder "Type 3+ letters to match from quote, or write your own") · Category ("e.g. Carpentry") · Milestone (a select, only when the timeline has milestones; "—" for none) · Unit Price · Qty · Total · remove; "Add Item" above. `F/CreatePODialog.tsx:826-926`
- **G-355** Typing three letters in a description opens a floating list (320px, at most eight matches) headed "From the project quote"; the matched letters are bold primary; each match shows "{category | Uncategorised} · unit {price} × qty {n}". Arrow keys move, Enter picks, Escape closes. A pick fills description, category, unit price and quantity. `F/CreatePODialog.tsx:92-281`, `F/CreatePODialog.tsx:459-473`
- **G-356** "Payment Terms" options, each with a second line: "COD" — "Pay the vendor as soon as the PO is issued"; "Net 15" — "Pay within 15 days of issuing this PO"; "Net 30" — "Pay within 30 days of issuing this PO — most common"; "Net 60" — "Pay within 60 days of issuing this PO"; "Custom" — "Write your own (e.g. "50% upfront, 50% on delivery")" (reveals a text field). `F/CreatePODialog.tsx:283-295`, `F/CreatePODialog.tsx:963-1000`
- **G-357** "Advance Payment": chips "None", "Percentage", "Fixed Amount"; a value field ("e.g. 50" / "e.g. 5000") and "% = Advance: {amount}". Setting an advance switches "Requires accounts review" on, with the note "Accounts review is auto-enabled when advance payment is configured". `F/CreatePODialog.tsx:573-578`, `F/CreatePODialog.tsx:1005-1056`
- **G-358** Totals box: "Subtotal", GST line, "PO Total", "Advance (…)", and "Margin Impact" (trend icon and signed amount) once a quoted amount is entered. `F/CreatePODialog.tsx:1071-1109`
- **G-359** Footer: "Cancel"; "Save as Draft" ("Save Changes" when editing; "Saving..."); and, when creating, a filled button that reads "Send for approval" for a non-approver, "Save & Submit for Review" when review is required, otherwise "Save & Approve" ("Submitting..."). `F/CreatePODialog.tsx:1144-1168`
- **G-360** "Compare with quote": a collapsed card with a sparkle icon — "See variance vs the project's signed quote — uses AI for partial matches" — and a "Compare" chip. After running: "{m} of {n} lines matched · ±{amount} vs quote"; opened, it shows "Matched {m} of {n} PO lines", "Quote total (matched): … · PO total (matched): …", the variance and "% vs quote"; per line a check or alert icon, tags "AI match" / "~ fuzzy", "You: {qty} × {price} · Quote: {qty} × {price}" or "Could not find a matching item in the quote", and "over quote" / "saving" / "on quote"; then an AI sentence. `F/quote-compare-panel.tsx:114-281`

### Interactions

- **G-361** Save checks: "Select a vendor before saving the PO"; "Add at least one line item with a description and amount". Success: "Purchase order created" / "{PO} updated", then "Sent for approval", "Submitted for accounts review" or "Approved & ready to send". Failures: "Saved as draft, but submit failed — try again from the PO detail.", "Failed to create purchase order", "Failed to update PO". `F/CreatePODialog.tsx:584-659`
- **G-362** "Submit for Review": when review is required the PO becomes "pending review", the toast reads "Submitted for accounts review" and each Owner and Accounting member gets a task "Review PO {number}"; otherwise it goes straight to approved with "{PO} approved". Review is also forced when the advance or the PO total exceeds the studio's thresholds. An approver's own PO skips the studio-wide default review unless the PO itself is flagged. `F/PODetail.tsx:121-147`, `A/finance/records/purchase-orders/[id]/action/route.ts:268-352`
- **G-363** Review decision: "{PO} approved" or "{PO} rejected — returned to draft"; the review tasks are closed. `F/POList.tsx:97-105`, `F/PODetail.tsx:174-188`, `A/finance/records/purchase-orders/[id]/action/route.ts:354-395`
- **G-364** "Issue PO" makes the PO "vendor accepted" at once (silence counts as acceptance), stamps the issue time, works out the payment due date, creates the vendor's link and copies it: "PO issued — vendor portal link copied to clipboard". The vendor is emailed (`po.sent_to_vendor`). `F/PODetail.tsx:149-159`, `A/finance/records/purchase-orders/[id]/action/route.ts:428-514`
- **G-365** "Copy Vendor Link" copies `/po/{token}` ("Vendor portal link copied to clipboard"). "Download PDF" opens `/api/finance/purchase-orders/{id}/pdf` in a new tab. "View PO" goes to `/finance/pos/{id}/preview`. `F/PODetail.tsx:161-172`, `F/PODetail.tsx:550-577`
- **G-366** "Record Advance" opens "Record Advance Payment" — "{PO} — Advance Due: {amount}"; "Record Payment" opens "Record Vendor Payment" — "{PO} — Outstanding: {amount}". Paying in full ends on "PO fully paid" — "{PO} is now fully paid to the vendor." `F/RecordPOPaymentDialog.tsx:249-305`
- **G-367** "Cancel" opens "Cancel {PO}" — "This action cannot be undone. The PO will be marked as cancelled." — with a required "Reason for Cancellation *" ("e.g. Vendor unable to deliver on time, scope changed...") and "Keep PO" / "Cancel PO" ("Cancelling..."); toast "{PO} cancelled". `F/CancelPODialog.tsx:31-85`
- **G-368** "Delete draft" asks in a browser confirm "Delete draft PO {n}? This cannot be undone." and toasts "PO {n} deleted"; on a non-draft: "Only draft POs can be deleted. Cancel non-draft POs instead." `F/POList.tsx:106-119`
- **G-369** "Duplicate" makes a new draft copy ("Duplicated as {n}"); "Close PO" toasts "{n} closed". `F/PODetail.tsx:190-221`

### States

- **G-370** Loading: two pulsing 56px blocks. Empty: a package icon, "No purchase orders yet", "Create POs to track sub-contractor costs against quoted amounts", [Create PO]. `F/POList.tsx:131-139`, `F/POList.tsx:185-195`

### Rules

- **G-371** Life cycle in use: draft → (pending review) → approved → *Issue* → vendor accepted → closed; side exits: vendor change requested, vendor rejected (both set from the vendor's page), cancelled. The PO closes by itself when payments reach the total. `F/PODetail.tsx:102-118`, `A/finance/records/purchase-orders/[id]/action/route.ts:658-664`
- **G-372** Payment due date: "COD" / "due on receipt" → the issue day; "Net N" → N days after issue; "Net N from delivery" → N days after the expected delivery date; any other text → 30 days. `L/po-lifecycle.ts:42-93`
- **G-373** Totals: subtotal = Σ lines; tax = subtotal × the region's rate (always added); total = both. Number `{prefix}-{0000}`, prefix per entity. `L/po-lifecycle.ts:117-134`, `A/finance/records/purchase-orders/[id]/action/route.ts:174-180`
- **G-374** Advance: a percentage of the PO total or a fixed amount, never more than the total. A standard payment is offered only after the advance is fully paid. The server refuses a payment above the balance ("Payment exceeds the outstanding balance (…). Record at most the balance.") and recomputes "paid" from all payments. `F/PODetail.tsx:79-114`, `L/po-lifecycle.ts:145-156`, `A/finance/records/purchase-orders/[id]/action/route.ts:587-679`
- **G-375** Variance = quoted amount − PO subtotal (positive means under the quote); the quoted amount defaults to the PO's own subtotal when left blank. `F/POList.tsx:144-148,245`, `F/CreatePODialog.tsx:624`
- **G-376** Money buckets used by the Overview: pipeline (draft, pending review or approved with nothing paid), committed (issued states), partial (any payment), realized (closed), killed (cancelled or vendor rejected). `L/po-lifecycle.ts:190-206`

### Responsive

- **G-377** Below `lg` the table becomes cards (number, tags, status, total; vendor link; variance). The cards have no ⋯ menu and no inline Approve / Reject. `F/POList.tsx:389-449`

### Problems

- **G-378** The strip above the list adds up every PO, drafts and cancelled ones included, so "Total PO Value" and "Outstanding" disagree with the Overview's committed figures. `F/POList.tsx:141-148`
- **G-379** No control records a delivery or goods received. A "Record Delivery" dialog is mounted on the page but never opened (and would save only its notes, not the received quantities); a GRN dialog exists in the code and is mounted nowhere. The sub-tab's description still promises "the goods received against them". `PAGE:3434`, `PAGE:4809-4814`, `F/record-delivery-dialog.tsx:52-61`, `F/RecordGRNDialog.tsx:40-48`
- **G-380** The draft button reads "Approve & Issue" but only approves; issuing is a second press. `F/PODetail.tsx:514`, `F/PODetail.tsx:142`
- **G-381** No PO action checks a role on the server: review decisions, cancel, delete and status updates accept any signed-in member; "update" accepts any status value; "issue" does not check that the PO is approved; creating a PO is not blocked on a Draft project. `A/finance/records/purchase-orders/[id]/action/route.ts:155-170`, `A/finance/records/purchase-orders/[id]/action/route.ts:354-465`
- **G-382** The activity log never names who acted (the name is stored empty), and the entry written on issue ("issued") has no label, so it shows the raw word with a clock icon. `A/finance/records/purchase-orders/[id]/action/route.ts:55-61,466`, `F/POActivityLog.tsx:12-30,68-72`
- **G-383** In the create dialog, picking a quote suggestion or "Add {n} items from quote" fills the description, but the Unit Price and Qty boxes are uncontrolled and keep their old contents while the Total changes **[inferred from `defaultValue` + row index keys]**. `F/CreatePODialog.tsx:849-909`
- **G-384** Editing a PO drops each line's milestone link, because the form does not load it **[inferred]**. `F/CreatePODialog.tsx:378-384`
- **G-385** "Add new vendors in Marketplace." is stale: the vendor picker adds a vendor in place. `F/CreatePODialog.tsx:715-717`, `F/vendor-picker.tsx:8-14`
- **G-386** "Save & Approve" in the dialog skips the amount thresholds that "Submit for Review" on the PO applies. `F/CreatePODialog.tsx:639-641`, `F/PODetail.tsx:121-133`
- **G-387** "Compare with quote" cannot be re-run after the lines change (a second click only folds the card). `F/quote-compare-panel.tsx:124-130`
- **G-388** Tax is always added at the region's rate, also for a vendor who charges none. `L/po-lifecycle.ts:117-134`
- **G-389** Delete uses a browser confirm while Cancel uses a house dialog. `F/POList.tsx:111`, `F/PODetail.tsx:203`

---

## 13. Expenses sub-tab

### What it is / layout

- **G-390** The whole sub-tab is a drop target. Top row: "View in Studio Finance ↗" (to `/finance/operations?tab=expenses&project={id}`) and the hint "Drop a receipt here to log it". Then, for approvers, the verification banner; then the expense list. `PAGE:3836-3877`
- **G-391** The list (`space-y-4`): a yellow "pending approval" card for approvers, a three-card strip ("Total Expenses", "Entries", "Pending Reimbursements" — yellow when above zero), and the list card with filter chips "All", "Project", "Overhead", "Reimbursements" and an "Add Expense" button. `F/ExpenseList.tsx:176-336`

### UI elements

- **G-392** Verification banner (Owner / Admin / Accounting, and only when the project has an unverified expense): a yellow bar with a shield icon, "{n} expense(s) awaiting verification" and a chevron; opened, it shows the verification table for this project's expenses and a link "Payments + other projects — verify in Studio Finance ↗". `F/project-verification-banner.tsx:28-63`
- **G-393** Pending-approval card: header "{n} expense(s) pending approval"; per expense the description (or italic "No description"), "{date} · {category | Uncategorized} · {vendor}", receipt links, the amount including tax, and "Approve" (green), "Reject" (red outline), "Partial" (yellow outline). "Reject" swaps in "Reason for rejection..." with "Reject" / "Cancel"; "Partial" swaps in "Approved amount" and "Comment (optional)" with "Partially Approve" / "Cancel". `F/ExpenseList.tsx:177-281`
- **G-394** Table (from `lg`): "Date" · "Description" · "Category" · "Vendor" · "Created By" · "Amount" · "Type" · "Actions". The amount includes tax, with "incl. {GST} {amount}" beneath when tax is present. Receipts appear under the description as paperclip links named after the file (truncated at 160px). `F/ExpenseList.tsx:339-369`, `F/ExpenseList.tsx:592-625`
- **G-395** "Type" cell: an approval badge — "Approved" (green; also for owner / admin entries with no approval record), "Pending Approval" (yellow), "Partial {amount}" (yellow), "Rejected" (red); a claim badge — "Claim Pending" (yellow), "Reimbursed" (green), "Claim Rejected" (red); and a recurring icon. `F/ExpenseList.tsx:370-414`
- **G-396** "Actions" cell: ✓ and ✗ for an approver on a pending expense; ✓ and ✗ for a pending reimbursement; a ⋯ menu "Edit" / "Delete" for whoever may change it. `F/ExpenseList.tsx:415-491`

### The expense form (drawer from the frame or a drop; dialog from the list's own buttons)

- **G-397** Title "Record Expense" — "Log an expense against this project." (editing: "Edit Expense" — "Update this expense's details."). `F/expense-drawer.tsx:37-45`, `F/ExpenseDialog.tsx:591-606`
- **G-398** Fields: entity picker ("Determines which legal entity records this expense."); "Description" ("Optional — e.g. Plywood sheets for built-in wardrobe"); "Amount ({code}) *"; "Date" (today); a tick "Include {GST} ({rate}%)" with "{GST}: {amount}" and "Total: {amount}" beside it; "Receipts ({n}/5)"; "Category" ("Select category"; overhead categories end in "(Overhead)"); "Vendor" ("Select vendor"); ticks "Reimbursement claim" and "Recurring expense"; "Notes" ("Optional notes..."). Buttons "Cancel" and "Record Expense" ("Uploading receipts...", "Recording...") or "Save Changes" ("Saving..."). `F/ExpenseDialog.tsx:331-578`
- **G-399** Receipts zone: a dashed box with "Browse", "or drop files here" and "Snap receipt" (opens the rear camera on a phone); staged files show as 56px thumbnails (a document icon for a PDF) with a ✕ on hover. Up to five files, 5 MB each, JPEG / PNG / WebP / GIF / PDF. Toasts: "Max 5 receipts per expense", "{file}: unsupported type (images or PDF only)", "{file}: too large (max 5MB)". `F/ExpenseDialog.tsx:52-54`, `F/ExpenseDialog.tsx:155-179`, `F/ExpenseDialog.tsx:397-488`
- **G-400** With no categories set up the select is disabled ("No categories set up") and a link "Set up expense categories" opens `/accounts#expense-categories` in a new tab. `F/ExpenseDialog.tsx:494-519`
- **G-401** The only required field is an amount above zero ("Enter a valid amount"). Toasts: "Expense recorded", "Expense recorded with receipt", "Expense updated", "Failed to record expense", "Failed to update expense". Receipts upload only on save; a failed upload stops the save ("{file}: upload failed"). `F/ExpenseDialog.tsx:245-326`
- **G-402** On a phone a floating button opens "Quick Expense" (the project name beneath): "Amount" (large, focused), "Category" ("Select category..."), "Note (optional)" ("E.g., nails and screws for kitchen"), "Snap Receipt", a tick "I paid out of pocket", and "Cancel" / "Save Expense" (or "Save & Request Reimbursement"). Toasts "Expense recorded" / "Expense recorded — reimbursement requested". `P/quick-expense-sheet.tsx:104-217`, `P/project-fabs.tsx:23`

### Interactions

- **G-403** Dragging a file over the sub-tab draws a 2px primary ring around it (`transition-shadow`); dropping opens the drawer with the files already staged. `PAGE:3840-3856`
- **G-404** Decisions and their toasts: "Expense approved"; "Expense rejected" (a reason is required: "Please provide a reason for rejection"); "Expense partially approved" ("Enter a valid approved amount"); "Reimbursement approved" / "Reimbursement rejected". `F/ExpenseList.tsx:121-173`
- **G-405** Delete asks "Delete expense?" — "This permanently deletes "{description | this expense}" ({amount}). This can't be undone." — [Delete] ("Deleting..."); toast "Expense deleted". `F/ExpenseList.tsx:89-98`, `F/ExpenseList.tsx:569-582`
- **G-406** The drawer protects unsaved input (the yellow "Discard this draft?" bar) once a field is touched or a file is staged. `F/expense-drawer.tsx:29-45`, `F/action-drawer.tsx:105-130`

### States

- **G-407** Loading: two pulsing 56px blocks. Empty: a receipt icon, "No expenses recorded yet", "Track project and overhead expenses, reimbursement claims, and receipts", [Record Expense]. A filter with no match: "No expenses in this category". `F/ExpenseList.tsx:100-108`, `F/ExpenseList.tsx:304-314`, `F/ExpenseList.tsx:554-556`

### Rules

- **G-408** Approval on create: required unless the studio switched expense approval off or the recorder is Owner / Admin. Not required → the approval field is left empty and the expense counts as approved. Required → "pending", a task "Approve expense: {label} ({amount incl. tax})" for the configured approver (else the first owner) and an `expense.submitted` notice. `A/finance/expenses/route.ts:86-98`, `A/finance/expenses/route.ts:156-245`
- **G-409** A reimbursement claim is its own track: status "pending" with the recorder as claimant, then approved or rejected. `A/finance/expenses/route.ts:111-113`, `A/finance/records/expenses/[id]/decision/route.ts:67-69`
- **G-410** Who may edit or delete: an approver, any expense; the recorder, only while it is unresolved (empty, pending or rejected) — otherwise "You can only edit or delete your own expenses while they are pending." `F/ExpenseList.tsx:29-32,85-87`, `A/finance/records/expenses/[id]/route.ts:26,71-77`
- **G-411** Verification is a third track, separate from approval: unverified → ID verified → management verified, or rejected with a comment. The banner counts expenses that are neither management-verified nor rejected. `A/finance/records/expenses/[id]/decision/route.ts:101-127`, `A/finance/records/expenses/route.ts:86-93`
- **G-412** An approved or partly approved expense is queued for the accounting sync; a pending one is not. `A/finance/records/expenses/[id]/decision/route.ts:158-184`

### Responsive

- **G-413** Below `lg` each expense is a card: description and amount, receipt links, "{date} · {category}", reimbursement ticks and the ⋯ menu. The approval badge and the expense Approve / Reject are not on the card. `F/ExpenseList.tsx:499-551`

### Problems

- **G-414** Two surfaces for one form on the same sub-tab: the frame and a drop open a drawer with a discard guard; the list's "Add Expense" / "Record Expense" open a dialog without one. `PAGE:3928-3936`, `F/ExpenseList.tsx:562-567`
- **G-415** The "Overhead" chip filters for expenses with no project, which a project's list can never contain. `F/ExpenseList.tsx:110-115`
- **G-416** "Total Expenses" adds pending and rejected expenses too, while the Overview counts approved ones only. `F/ExpenseList.tsx:117`
- **G-417** The reimbursement ✓ / ✗ show to every viewer, and the decision route checks no role for any decision — a member can approve their own expense or claim by calling it. `F/ExpenseList.tsx:443-462`, `A/finance/records/expenses/[id]/decision/route.ts:48-66`
- **G-418** Quick Expense's "Snap Receipt" keeps only the file's name on screen; the photo is never uploaded or attached. `P/quick-expense-sheet.tsx:43-75`
- **G-419** One expense can carry three independent states (approval, claim, verification), each with its own approve / reject pair in a different place. `F/ExpenseList.tsx:370-462`, `F/verification-queue.tsx:176-209`
- **G-420** The row's ✗ opens the reason field in the pending card at the top of the page, which may be off screen. `F/ExpenseList.tsx:433-440`, `F/ExpenseList.tsx:202-217`

---

## 14. Bills sub-tab (supplier invoices)

- **G-421** A read-only list of supplier invoices recorded against this project. Top row: "View in Studio Finance ↗" (to `/finance/operations?tab=pos`) and the hint "Upload a supplier invoice from the Purchases tab". Columns: "Supplier" · "Invoice no." · "Amount" · "Outstanding" · "Due" · "Status". Chips: "Unpaid" (grey), "Part-paid" (blue), "Paid" (green), "Overdue" (red). `F/project-bills-section.tsx:68-119`, `F/bills-table.tsx:31-36`
- **G-422** States — loading: three pulsing 48px bars; error: "Couldn't load bills for this project." [Try again]; empty: "No supplier bills recorded against this project." Below `sm`: cards with supplier, chip, invoice number, outstanding and "Due {date}". `F/project-bills-section.tsx:43-66`, `F/project-bills-section.tsx:82-86`, `F/project-bills-section.tsx:122-139`
- **G-423** Status is worked out, not stored: paid when payments reach the total; overdue when the due date has passed; part-paid when something is paid; else unpaid; a zero-total bill is never overdue. Outstanding never goes negative. `L/finance/bill-model.ts:67-76`, `L/finance/bill-model.ts:105-110`
- **G-424** A bill is stored as a purchase-order row with source "bill" and status "recorded", and counts as a committed cost of the project at once. `A/finance/bills/route.ts:186-190`, `F/ProjectFinanceSummary.tsx:141-150`
- **G-425** Bills are created only in Studio Finance › Purchases › Bills › "Upload supplier invoice": a dialog "Record Supplier Bill" — "Upload a supplier's invoice, review the parsed details, and confirm — there's no separate approval step." Stage 1: "Drop a supplier invoice here" / "PDF, PNG, JPG, CSV or XLSX — up to 10MB" / [Browse files]. Stage 2: "Reading {file}…". Stage 3: the file's name; "Supplier name", "Invoice no.", "Issue date", "Due date", "Subtotal", "{GST}", "Total"; "Line items" with "Add item" ("No line items — add one if the invoice breaks down costs."); "Supplier *" ("Search suppliers by name…", then the name with "Change"); "Project *" with a tick "Overhead — not project-specific"; buttons "Cancel" / "Confirm & Record Bill" ("Recording…"). `F/bill-review-dialog.tsx:400-727`
- **G-426** Reading the file: an AI reader with a 45-second limit; uncertain fields get a yellow border and "AI wasn't fully confident on this field — please verify."; a failed read still opens the form with "Couldn't read this document — enter the details below." `F/bill-review-dialog.tsx:84-99`, `F/bill-review-dialog.tsx:229-255`, `F/bill-review-dialog.tsx:471-476`, `A/finance/invoices/parse/route.ts:26-28`
- **G-427** Rules: a supplier and either a project or the overhead tick are required; tax is taken from the document, never recalculated; a duplicate check (same supplier and invoice number, or same supplier and amount within 30 days) asks "Possible duplicate bill" — "A bill from {supplier} with invoice #{n} already exists. Record this one anyway?" — [Record anyway]; closing with data asks "Discard this bill?" — "The reviewed details will be lost. This can't be undone." Toasts: "Bill recorded", or "Bill recorded, but the document didn't upload. You can re-attach it from the bill later." `F/bill-review-dialog.tsx:303-398`, `F/bill-review-dialog.tsx:731-751`, `L/finance/bill-model.ts:301-366`
- **G-428** In the studio list a bill has "View" (opens the document) and "Pay" (the vendor payment dialog). `F/bills-table.tsx:224-264`

### Problems

- **G-429** From the project a bill cannot be added, opened, viewed or paid, and the link to Studio Finance drops the project and lands on the Purchases tab. `F/project-bills-section.tsx:71-79`
- **G-430** The "Supplier name" read from the document is plain text beside a separate, required "Supplier *" picker; the two are not connected. `F/bill-review-dialog.tsx:478-488`, `F/bill-review-dialog.tsx:653-675`
- **G-431** "You can re-attach it from the bill later" — no such control was found **[inferred]**. `F/bill-review-dialog.tsx:364`, `F/bills-table.tsx:241-264`

---

## 15. Finance issues: the Overview tab's "Financial Summary" card, its issue list, and the variance wizard

### What it is

- **G-432** The project's Overview tab (not the Finance tab) carries a "Financial Summary" card: an issue block first, then "Contract Value" and "Collected", "Expected Profit" and "Actual Profit", "Remaining" and "Margin Δ vs expected". Each label has a hover tooltip (200ms) with its formula. `P/financial-summary-card.tsx:38-55`, `P/financial-summary-card.tsx:391-565`

### UI elements and formulas

- **G-433** "Contract Value" with its source line (G-175). "Collected" — green only when above zero; tooltip "Collected = total of every payment recorded against this project's invoices. Updates as you record payments in Finance → Invoices." `P/financial-summary-card.tsx:424-472`
- **G-434** "Expected Profit" = Σ quote line totals − Σ (line cost × quantity), with "{x}% margin". It shows only when **every** quote line has a cost. Otherwise a dashed box reads "Expected Profit — needs cost data" (hover: "Cost data missing on {m} of {n} line items") with a link "Open Price Book →"; with no quote: "— no quote yet" and "Upload quote →". `P/financial-summary-card.tsx:91-167`, `P/financial-summary-card.tsx:337-365`, `P/financial-summary-card.tsx:478-484`
- **G-435** What "needs cost data" means, in the tooltip's words: "Where does cost data come from? The Price Book stores your vendor and labour costs per item. When a quote line is linked to a Price Book item, its cost auto-fills. Manually-added lines with no Price Book reference have no cost on file and won't contribute to expected profit until you fill the cost in." `P/financial-summary-card.tsx:118-125`
- **G-436** "Actual Profit" reads "— appears after the first payment" until money is collected; then two lines: "Cash basis" = collected − (approved expenses + payments made to vendors), and "Incl. commitments" = collected − (approved expenses + committed PO subtotals), each with its % of collected. `P/financial-summary-card.tsx:171-303`, `P/financial-summary-card.tsx:367-377`
- **G-437** "Remaining" = contract value − collected (yellow when negative, meaning overpaid). "Margin Δ vs expected" = cash-basis margin − expected margin, with a trend icon and "+x.x%"; "—" until both exist, with a hint such as "Add cost data on every quote line item — the Price Book makes this fast." or "Waiting for the first payment to compute your actual margin." `P/financial-summary-card.tsx:384-387`, `P/financial-summary-card.tsx:495-561`
- **G-438** Issue block: a banner for the single most urgent open issue (icon, title, detail, and a text button "{label} →"), then a strip "{n} finance issue(s) open · {m} resolved · {k} audit" with "View all ›". The strip's counts open a right-side sheet "Financial attention" — "Everything affecting this project's financials, grouped by status." — with sections "Open · n", "Resolved · n", "Audit · n". With no issues: "No financial issues — all metrics are in balance." `P/financial-attention-block.tsx:84-147`, `P/financial-attention-block.tsx:152-254`
- **G-439** Severity colours and icons: critical — red, alert circle; pending — yellow, triangle; action pending — primary; suggested — blue; resolved — green, check; audit — grey. Order: critical, pending, action pending, suggested, resolved, audit; newest first inside each. `P/financial-attention-block.tsx:32-69`, `L/financial-issues.ts:51-85`

### Every issue kind (rule and copy)

- **G-440** *Variance* — one per invoice whose variance is unresolved (no treatment, or "flagged"). Critical above 5% of contract, else pending. "Variance on {invoice}: +{amount}" / "−{amount}" — "Billed above the milestone's expected amount." / "Billed below the milestone's expected amount." — "Resolve". `L/financial-issues.ts:112-142`
- **G-441** *Collection trailing* — when work progress % minus collection % is 15 or more (critical at 30). "Collection trailing progress by {x}%" — "Consider milestone billing to catch up." — "Bill milestone". `L/financial-issues.ts:144-157`
- **G-442** *Overdue invoice* — due date passed, not paid or void; critical after 7 days. "{invoice} overdue by {d} day(s)" — "Due {date} · {balance} outstanding" — "Chase". *Draft invoice* — "{invoice} sitting in draft" — "Review and send to the client." — "Review". `L/financial-issues.ts:159-190`
- **G-443** *Vendor rejected PO* — "Vendor rejected {PO}" — "{vendor} declined or asked for changes." — "Review" (critical on the first day). *Overdue PO* — expected delivery date passed and status not "fulfilled"; "{PO} delivery overdue by {d} day(s)" — "Vendor: {name}" — "Follow up". `L/financial-issues.ts:192-233`
- **G-444** *Cost overrun* — committed POs + expenses exceed the contract; critical. "Costs are exceeding contract value by {amount}" — "Committed POs + expenses are above the signed contract. Raise a VO or trim scope." — "Review costs". `L/financial-issues.ts:235-251`
- **G-445** *Margin slippage* — expected margin minus actual cash margin is 10 points or more (critical at 20). "Margin running {x}pp under expected" — "Expected {a}% · actual {b}%. Costs are creeping up." — "Open costs". `L/financial-issues.ts:253-271`
- **G-446** *Overdue milestone* — "{name} overdue by {d} day(s)" — "Expected completion: {date}" — "Open Gantt". *Setup* (Draft projects): "No designer assigned" — "Assign a designer to activate this project." — "Assign"; "Quote not added" — "Upload a quote to define project scope and budget." — "Upload quote". `L/financial-issues.ts:273-320`
- **G-447** *Resolved variance* — "Resolved: +{amount} absorbed via VO / rebalance / top-up" (one summary line, no action). `L/financial-issues.ts:322-332`

### How an issue is resolved

- **G-448** Only the variance issue has an in-app treatment (the wizard below). Every other issue clears when the fact behind it changes; its button only navigates — with a full page load — to `/projects/{id}?tab=finance` (or the Management / Overview tab). `P/financial-attention-block.tsx:156-165`, `L/financial-issues.ts:154,171,184`
- **G-449** The variance wizard "Resolve invoice variance" — "{invoice} · {milestone}". Step 1 explains: a red box "{milestone} was completed and invoiced — but the numbers don't match."; a three-line table "Milestone expected", "Actually invoiced ({invoice})", "Variance"; and "You billed {x} more than the milestone's share of the contract. Until you resolve this, the project's Expected vs Actuals will show a +{x} gap on this stage." (or the under-billed wording). Buttons "Close" and "Know how to fix it ›". `P/variance-resolution-dialog.tsx:172-199`, `P/variance-resolution-dialog.tsx:305-335`
- **G-450** Step 2 "Pick how to treat this variance:" — over-billed: "Create a Variation Order for the extra work" (tag "Recommended"; "Contract value rises by the over-bill. Opens the VO digitizer next."), "Keep this amount, re-balance later drafts" ("Re-sizes the later draft invoices so the contract stays in balance — the agreed milestone percentages are not changed."), "Accept as out-of-schedule" ("Doesn't change the numbers. Records that you've decided not to act. The variance will keep showing in reports until you fix it via a VO or rebalance."). Under-billed: "Issue a top-up invoice" ("Bill the remaining {x} so the milestone is fully collected. Opens the composer next.") and "Accept the shortfall" ("Doesn't change the numbers. Records the reason (client discount, absorbed margin, etc.). The gap will keep showing in reports until you issue a top-up."). `P/variance-resolution-dialog.tsx:201-240`
- **G-451** Re-balance step: an explanation, a "What happens" list of three points, and the button "Re-sync invoices to contract" ("Re-syncing…"; "Try again" after a decline, with a yellow box "Nothing was re-balanced. {reason}"). Accept step: a yellow "Heads-up: Accept doesn't change any numbers. …", a required "Reason *" ("e.g. Client agreed to absorb extra material cost" / "e.g. Client discount, absorbed margin") and "Record decision". Final step: a green box "✓ Variance resolved" with a note, "The milestone panel's banner will restyle to a muted "Resolved" state. The reconciliation task on the assigned designer has been auto-closed." and "Done". `P/variance-resolution-dialog.tsx:242-303`, `P/variance-resolution-dialog.tsx:344-370`
- **G-452** The top-up path opens the invoice composer in top-up mode: "Top-up Invoice — {milestone}", "Gap to close: {amount}", a blue note "Closing an under-billed milestone. Total is capped at the gap ({amount}).", one starting line "Top-up for {milestone}"; above the gap it turns red: "Top-up exceeds the gap. A top-up can't bill more than the under-billed amount ({amount}). For extra scope, raise a Variation Order from the original invoice's variance banner." `F/invoice-composer-dialog.tsx:633-640`, `F/invoice-composer-dialog.tsx:682-707`, `F/invoice-composer-dialog.tsx:870-872`
- **G-453** On the server a treatment is a mark on the invoice ("flagged", "rebalance", "vo", or "topup" set by the top-up) plus closing the reconciliation task; the re-balance mark is written only after a re-sync actually ran. `A/projects/[id]/invoices/[invoiceId]/variance/route.ts:59-139`, `P/variance-resolution-dialog.tsx:116-153`

### Problems

- **G-454** "Resolve" on a variance issue in the Overview tab stores the target and reports the click as handled, but the wizard is mounted inside the Finance tab's block, so nothing appears; it then pops up when the user next opens the Finance tab **[inferred from where the dialog sits in the page; not run]**. `PAGE:2015-2031`, `PAGE:3271`, `PAGE:3999-4007`
- **G-455** "Accept as out-of-schedule" ends on "✓ Variance resolved", yet a "flagged" variance is still listed as an open issue with the same "Resolve" button, and the flag locks that invoice out of later rebalances. `P/variance-resolution-dialog.tsx:99-110,294-296`, `L/financial-issues.ts:120-122`, `L/finance/milestone-allocation.ts:200-201`
- **G-456** The VO path marks the variance resolved as soon as the VO is first saved as a draft, not when it is approved; and on a project with no linked lead the wizard hides itself and no VO editor opens. `P/variance-resolution-dialog.tsx:155-168`, `P/variance-resolution-dialog.tsx:307`, `P/variance-resolution-dialog.tsx:377-387`
- **G-457** The card's numbers follow different definitions from the Finance tab's cockpit: "billed" adds every invoice, drafts and void included (so the collection % is diluted); "collected" adds every payment record, unverified and rejected proofs included; committed POs are subtotals before tax and include pending-review and approved POs; expenses count only when their status is exactly "approved", which leaves out every Owner / Admin expense (stored with an empty status). `L/queries/project-aggregates.ts:149-170`, `L/queries/project-aggregates.ts:205-208`, `A/project-aggregates/financial-summary/route.ts:63-79`, `A/finance/expenses/route.ts:95-97`
- **G-458** The same empty-status gap affects the "profit" commission basis, which also reads only "approved" expenses. `A/finance/invoices/[id]/payment/route.ts:275-279`
- **G-459** Expected profit is all-or-nothing: one quote line without a cost hides the figure, and the "Open Price Book" link cannot add a cost to an existing quote line. `P/financial-summary-card.tsx:356`, `P/financial-summary-card.tsx:483`
- **G-460** Two attention lists for one project — twelve issue kinds here, six rows plus five margin alerts in Finance › Overview — with different thresholds and verbs ("Chase" here, "Log reminder" there). `L/financial-issues.ts:37-49`, `F/ProjectFinanceSummary.tsx:311-371`
- **G-461** The "audit" bucket is never filled, and nothing limits "resolved" to a period although the component's notes say "Resolved this month". `P/financial-attention-block.tsx:10-15`, `L/financial-issues.ts:26-32`
- **G-462** "Overdue PO" waits for a "fulfilled" status the app never sets, so an issued PO past its expected delivery date stays flagged until it is closed or cancelled **[inferred]**. `L/financial-issues.ts:213-218`
- **G-463** The profit tiles format money in the signed-in user's currency, not the project's. `P/financial-summary-card.tsx:152`, `P/financial-summary-card.tsx:242-245`

---

## 16. Profit and margin rules, in one place

### Every profit or margin figure the project shows

| Row | Where | Label | Revenue side | Cost side | Tax | Shows when |
|---|---|---|---|---|---|---|
| **G-464** | Finance › Overview tile and drawer | "Projected profit" · "{x}% of contract" | Contract value (G-171) | Committed POs + expenses that are approved or have no approval record + every supplier bill (G-81) | Both sides including GST | A contract and at least one cost exist; under 10% of costs it is an "Early estimate" (G-48) |
| **G-465** | Same drawer, "Other ways to read this" | "Optimistic — if drafts land" | Billed + draft invoices | Committed + pipeline POs + approved expenses | As stored | Always in the drawer (G-85) |
| **G-466** | Same | "Accrual — the books" | Billed (not draft, not void) | Committed POs + approved expenses | As stored | Same |
| **G-467** | Same | "Cash — the bank" | Collected | Paid to vendors + approved expenses | As stored | Same |
| **G-468** | Finance › Overview, "Margin alerts" | "Margin Below Threshold", "Costs Exceed Revenue" | Billed so far | PO totals + expenses | As stored | Margin under 20% of billed, or costs above billed (G-86) |
| **G-469** | Overview tab card | "Expected Profit" · "{x}% margin" | Σ quote line totals | Σ line cost × quantity | Quote lines, before tax **[inferred]** | Every quote line has a cost; else "— needs cost data" (G-434) |
| **G-470** | Overview tab card | "Actual Profit — Cash basis" | Every payment record | Approved expenses + payments to vendors | Mixed | After the first payment (G-436) |
| **G-471** | Overview tab card | "Actual Profit — Incl. commitments" | Every payment record | Approved expenses + PO subtotals before tax | Mixed | After the first payment (G-436, G-457) |
| **G-472** | Overview tab card | "Margin Δ vs expected" | — | — | — | Cash-basis margin − expected margin, once both exist (G-437) |
| **G-473** | Overview tab issue list | "Costs are exceeding contract value by {amount}", "Margin running {x}pp under expected" | Contract; expected margin | Committed POs + expenses; cash margin | — | Costs above contract; slippage of 10 points (G-444, G-445) |
| **G-474** | POs sub-tab | "Margin Variance" (list), "Margin Impact" (dialog), "Quoted vs Actual" (detail) | Quoted amount typed on the PO | PO subtotal before tax | Before tax | A quoted amount exists (G-347, G-358, G-375) |
| **G-475** | Commission accrual on a "profit" rule | (not shown on screen) | Σ invoice subtotals | Σ PO subtotals (every PO not cancelled or rejected, drafts included) + expenses with status "approved" | Before tax | On each client payment (G-318) |

Citations for the table: `F/ProjectFinanceSummary.tsx:131-162`, `L/lifecycle-aggregates.ts:123-160`, `L/finance-utils.ts:113-214`, `P/financial-summary-card.tsx:91-303`, `L/queries/project-aggregates.ts:149-208`, `L/financial-issues.ts:235-271`, `F/POList.tsx:141-148`, `F/CreatePODialog.tsx:1071-1109`, `A/finance/invoices/[id]/payment/route.ts:256-294`.

### Rules

- **G-476** Tiers on the cockpit tile: 20% and above "Healthy" (green), 10–20% "Tight" (yellow), under 10% "At risk" (red); percentages to one decimal. The 20% target used by the margin alerts is fixed in code — a studio cannot set it. `F/overview/finance-hero-tiles.tsx:22-35`, `L/finance-utils.ts:113-143`
- **G-477** Two different "no data" states use similar words. The cockpit's "Awaiting cost data" means no PO, expense or bill exists yet. The card's "— needs cost data" means at least one quote line has no cost on file, whatever has been spent. `F/overview/finance-hero-tiles.tsx:111-130`, `P/financial-summary-card.tsx:337-365`
- **G-478** A quote line's cost comes from the Price Book item it is linked to; a hand-typed line has none until someone fills it in the quote. `P/financial-summary-card.tsx:118-125`
- **G-479** A PO affects profit from the moment it is issued (cockpit) or from the moment it is created (card, commission) — not when goods arrive or the vendor is paid. `L/po-lifecycle.ts:190-206`, `A/project-aggregates/financial-summary/route.ts:63-70`, `A/finance/invoices/[id]/payment/route.ts:269-273`
- **G-480** An expense affects profit when approved; in the cockpit an Owner / Admin expense (no approval record) counts at once. A partly approved expense counts nowhere. `F/ProjectFinanceSummary.tsx:138-140`
- **G-481** A client VO moves the revenue side (contract value) on approval; an omission lowers it. Vendor-side VOs no longer exist, so a vendor's extra cost reaches profit only through a PO or an expense. `L/finance/contract-value.ts:69-84`, `PAGE:3792-3799`
- **G-482** No profit figure is hidden by role: whoever can open the project sees all of them (G-10). `PAGE:1879`

### Problems

- **G-483** The drawer says of projected profit "This is the commission basis", but the commission code works out its own ratio from invoiced subtotals, every non-cancelled PO and "approved" expenses only — a different revenue base, a different PO set, and before tax. `F/overview/finance-drilldown-drawer.tsx:299-321`, `A/finance/invoices/[id]/payment/route.ts:256-294`
- **G-484** One project can show four different "profit" amounts on two tabs (projected, accrual, cash, expected), plus alerts that judge a fifth ratio, with no screen that explains how they relate beyond the drawer's three-row list. `F/three-margin-strip.tsx:65-112`, `P/financial-summary-card.tsx:391-565`
- **G-485** The card mixes tax bases inside one subtraction (payments collected including GST minus PO subtotals before GST) **[inferred from the fields summed]**. `L/queries/project-aggregates.ts:150-170`
- **G-486** "Where costs go" breaks down committed PO lines only; expenses and bills are not in it, and no view shows margin per trade or per quote section. `F/category-breakdown.tsx:49-98`, `F/ProjectFinanceSummary.tsx:513-531`

---

## 17. Touchpoints outside the tab (one or two rows each)

- **G-487** **Studio Finance › Operations** (`/finance/operations`; Owner, Admin, Accounting): tabs "Overview", "Contracts" (pills "Quotes" · "Variation Orders"), "Invoices", "Purchases" (pills "Bills" · "Purchase Orders"), "Expenses", "Receipts", each with a count. It reads `?tab=` (old names `vos` and `review` are mapped), `?project=` (filters every list) and `?invoiceId=` (opens that invoice's drawer). `src/app/(main)/finance/operations/page.tsx:198-218`, `:271-279`, `:305-312`, `:633-636`, `:690-693`
- **G-488** The project's "View in Studio Finance ↗" links carry the project on Contract/VO, Invoices, POs and Expenses, and drop it on Bills and Receipts. The verification queue for client payments, bill upload and bill payment exist only there. `PAGE:3680,3761,3804,3859`, `F/project-bills-section.tsx:71-79`, `F/project-receipts-section.tsx:77-82`
- **G-489** **Finance › Pipeline** (`/finance/pipeline`): a project card opens `/projects/{id}` (the Overview tab), while a PO card opens `/projects/{id}?tab=finance`. `src/app/(main)/finance/pipeline/page.tsx:292-296`, `:514-518`
- **G-490** **Finance › Vendors** (`/finance/vendors?vendorId=`): the PO list's vendor link lands here with that vendor's drawer open; the parameter is read once on load. `src/app/(main)/finance/vendors/page.tsx:128-134`, `F/POList.tsx:256-344`
- **G-491** **Finance › Reports** (`/finance/reports`): "Financial Reports" — "Comprehensive financial analysis and reporting." — with tabs "P&L", "Tax", "AR Aging", "AP Aging", "Profitability", "Cash Flow", "Vendor Spend", "Commissions", "Statement", "Revenue", "Expenses", "Comparative". The project page's own "Financial Report" dialog is unreachable (G-39). `src/app/(main)/finance/reports/page.tsx:48-60`, `:169`
- **G-492** **Finance › Commissions** (`/finance/commissions`): the Owner sees pending change requests, the rules and row actions; other roles a narrower view. Each client payment recorded in the project can add an accrual here (G-318). `src/app/(main)/finance/commissions/page.tsx:69`, `:439`, `:748-768`, `:920`
- **G-493** **Document previews** `/finance/invoices/{id}/preview`, `/finance/pos/{id}/preview`, `/finance/vos/{id}/preview`: a full-screen page with "Back", the title "Invoice {n}" / "Purchase Order {n}" / "Variation Order {n}" ("Loading…", "Invoice not found", "PO not found", "VO not found"), and "Print / PDF" (the browser's print). The invoice preview adds "Copy payment link" (toast "Payment link copied"); Escape goes back. `src/app/(main)/finance/invoices/[id]/preview/page.tsx:69-129`, `src/app/(main)/finance/pos/[id]/preview/page.tsx:65-100`, `src/app/(main)/finance/vos/[id]/preview/page.tsx:106-141`
- **G-494** **Public invoice page** `/pay/inv/{token}` (no login): described in G-301, G-302; bank details only, online payment "COMING SOON". `src/app/pay/inv/[token]/page.tsx:293-334`
- **G-495** **Public receipt page** `/pay/receipt/{token}`: the studio's logo, name, address and registration; "Payment Receipt", the number and "Issued {date}"; "Received from", "For invoice"; the amount; "Payment Date", "Payment Method", "Reference"; "Invoice Total", "Paid to Date", "Outstanding"; a "Download PDF" button. Loading "Loading receipt...", error "This receipt link isn't valid or has expired." `src/app/pay/receipt/[token]/page.tsx:58-193`
- **G-496** **Legacy client portal** `/pay/{token}`: phone-number verification ("Verify your phone number to access the portal"), then tabs "Overview", "Invoices", "Progress", "Updates", "Actions" with "Total Invoiced", "Outstanding", "Payment Progress", milestone "Approve", "Raise an Issue" and "Documents". The project page's card that creates this link is switched off (G-38), so no studio screen hands the link out today. `src/app/pay/[token]/page.tsx:299-431`, `:499-515`, `:879-959`, `PAGE:3443-3594`
- **G-497** **Vendor's PO page** `/po/{token}` (no login): the studio's logo and name, "Purchase Order Portal", the PO number, "Project: {name}" and a status pill; "This Purchase Order is active" — "No action needed if you accept the terms — please deliver per the schedule above. Use the buttons below only if something needs to change or you can't fulfil this PO."; "Request Changes" / "Reject" open a required note ("Describe the changes you need..." / "Reason for rejection...") with "Submit Change Request" / "Reject PO"; then "Response submitted successfully" — "The studio has been notified of your response."; "Export CSV". Error: "Unable to load PO" — "This link may be invalid or expired." `src/app/po/[token]/page.tsx:162-219`, `:389-469`
- **G-498** The email sent to the vendor on issue carries `{base}/api/po/{token}` — the data address — as its portal link, while "Copy Vendor Link" copies the page `/po/{token}` **[inferred: how the email template uses the value was not read]**. `A/finance/records/purchase-orders/[id]/action/route.ts:496-506`, `F/PODetail.tsx:161-172`
- **G-499** **Completing a milestone on the timeline** (Management tab's Gantt, and the Overview tab's progress updates) creates a draft invoice for that milestone and opens "Complete Milestone" → "Invoice & Link": "Invoice created as a **draft**." — "Click *Send to homeowner* to share it on their portal, or skip ahead to review it later in Finance." (or the request-approval wording). Toasts: "Invoice already exists for "{name}"", "Failed to auto-generate invoice", "Milestone "{name}" completed but no contract value set — skipping invoice.", "Submitted for approval — your studio's approver will review", "Invoice sent — homeowner notified", "Reminder sent to the approver". `PAGE:2516-2575`, `PAGE:2817-2832`, `F/MilestoneCompletionDialog.tsx:303-347`, `:678-687`
- **G-500** That path sizes the invoice as contract × the milestone's % — the nominal slice — not through the allocation model the Finance tab's "Bill now" uses, and it does not re-run the rebalance; after a VO or an over-bill the two paths can create different amounts for the same milestone **[inferred — no allocation or rebalance call in the route]**. The route has no Draft-project check and no role check. `A/finance/records/invoices/auto-milestone/route.ts:58`, `:122-137`, `L/finance/milestone-allocation.ts:252-291`
- **G-501** **Accounts Setup** holds what the tab consumes: payment schedule templates (G-177…G-179), expense categories (`/accounts#expense-categories`, G-400), numbering prefixes (G-293), bank details and the PayNow image (G-303), the workflow switches for invoice, PO and expense approval (G-305, G-362, G-408). `F/ExpenseDialog.tsx:494-519`, `L/queries/studio-config.ts:69-76`
- **G-502** **Homeowner portal** (`/my/projects/{id}`): the client's totals, "Credits issued", bank details with the PayNow / DuitNow code and "I've Made Payment" (G-303, G-304, G-324). `src/app/my/projects/[projectId]/page.tsx:797-803`
- **G-503** **Phone**: the project's floating button opens "Quick Expense" on any tab (G-402). `P/project-fabs.tsx:23,48`
- **G-504** **Tasks and bell**: review work arrives as tasks — "Review PO {number}", "Approve expense: …", "Approve variation order {number} — submitted by {name}", "Reconcile over-billing for {milestone}" — and the invoice-approval notice links to `/finance/operations?invoiceId=`. `A/finance/records/purchase-orders/[id]/action/route.ts:320-350`, `A/finance/expenses/route.ts:156-245`, `src/app/(main)/finance/operations/page.tsx:264-279`

---

## 18. Where the docs and the code disagree

- **G-505** **Sub-tab count.** The guide says "Five sub-tabs": Overview, Contracts, Invoices, POs, Expenses. The code has seven; "Contracts" is labelled "Contract/VO", and Bills and Receipts are not in the guide. `docs/PROJECTS_AND_FINANCE_GUIDE.md:173-184`, `PAGE:3406-3423`
- **G-506** **Invoice actions.** The guide lists "create, edit, delete, record payments, mark paid/void, download PDFs" and the buttons "Generate Invoices" and "Upload Quote". In the code an invoice cannot be edited or deleted, "paid" is never set by hand, only a draft can be voided from the screen, and the Generate Invoices dialog has no opener. `docs/PROJECTS_AND_FINANCE_GUIDE.md:182-189`, G-39, G-290, G-291
- **G-507** **Invoice statuses.** The rules doc gives "draft → sent → partially_paid → paid (also: overdue, cancelled)" and leaves out void; the guide gives "(plus overdue and void)" and leaves out cancelled. The code has both. `docs/rules/finance.md:59`, `docs/PROJECTS_AND_FINANCE_GUIDE.md:410`, `L/finance/invoice-ledger.ts:19-23`
- **G-508** **Default payment split.** The rules doc says "default 50/30/20 split"; the template editor starts a new template at Deposit 10 · Commencement 40 · Mid-Project 40 · Final Payment 10, which the demo guide also shows. "50/30/20" survives only in the AI assistant's prompts. `docs/rules/finance.md:60`, `docs/features/finance-module/demo-guide.md:237`, `src/lib/agents/system-prompt.ts:516`, G-177
- **G-509** **PO statuses.** The rules doc says `closed` and `cancelled` were removed and the end states are `fulfilled` or `vendor_rejected`, by way of `issued` / `sent_to_vendor` → `vendor_accepted` → `acknowledged` → `fulfilled`. The code issues straight to `vendor_accepted`, closes with `closed` when fully paid, cancels with `cancelled`, and never sets `acknowledged` or `fulfilled`. The guide ("… → vendor accepted → closed") is closer; the spec ("Draft -> Issued -> Acknowledged -> Partially Delivered -> Fulfilled -> Closed") and the PRD ("… → vendor_accepted → fulfilled") are not. `docs/rules/finance.md:219-223`, `docs/PROJECTS_AND_FINANCE_GUIDE.md:414-417`, `docs/features/finance-module/spec.md:77`, `docs/prd/10-finance-operations.md:49`, `A/finance/records/purchase-orders/[id]/action/route.ts:428-465,542-559,658-664`
- **G-510** **Goods received.** The rules doc says the GRN workflow and `RecordGRNDialog` were removed and "replaced by simpler delivery tracking". The GRN dialog file is still in the code, the labels "GRN Recorded", "Partially Delivered" and "Fulfilled" still exist, the sub-tab's description still promises "the goods received against them", and the delivery dialog is never opened. `docs/rules/finance.md:221`, `F/RecordGRNDialog.tsx:40-48`, `F/POActivityLog.tsx:12-30`, `PAGE:3434`, `PAGE:4809-4814`
- **G-511** **Vendor's page.** The rules doc places the vendor portal at `/api/po/[token]` with a POST "for vendor_rejected only"; the page is `/po/[token]` and offers both "Request Changes" and "Reject". `docs/rules/finance.md:226`, `src/app/po/[token]/page.tsx:389-449`
- **G-512** **VO flow.** The guide says "pending owner → pending client → approved (or rejected)" and "approved vendor VOs increase costs and auto-create a supplementary PO". The code: draft → submitted → approved or rejected, no client step, and vendor VOs can no longer be created (the rules doc's 2026-07-07 section agrees with the code). Studio Finance still counts `pending_owner` / `pending_client` VOs for a KPI. `docs/PROJECTS_AND_FINANCE_GUIDE.md:419-421`, `docs/rules/finance.md:229-268`, `A/quotes/[id]/transition/route.ts:58-84`, `src/app/(main)/finance/operations/page.tsx:294`
- **G-513** **Expense flow.** The guide says "draft → pending approval → approved (or rejected / reimbursed)". The code has no draft; an Owner / Admin expense has no approval record at all; "partially approved" exists; reimbursement and verification are separate tracks. The rules doc names the verification values `pending` / `mgmt_verified`; the code writes `unverified` / `management_verified`. `docs/PROJECTS_AND_FINANCE_GUIDE.md:423-425`, `docs/rules/finance.md:322`, `A/finance/expenses/route.ts:86-98`, `A/finance/records/expenses/[id]/decision/route.ts:101-127`
- **G-514** **Roles.** The spec gives Admin "Read-only access to all finance sections"; the guide says Owner / Admin "review and approve POs and expenses" and that "Permission checks respect per-member overrides". In the code Admin approves invoices, VOs and expenses but is left out of PO approve / cancel / delete; no read-only mode exists; and only expense approval reads a per-member permission. `docs/features/finance-module/spec.md:237-242`, `docs/PROJECTS_AND_FINANCE_GUIDE.md:431-440`, G-09, G-12, G-18
- **G-515** **Paying an invoice.** The spec promises a "payment link (PayNow QR + Stripe + bank transfer)". The public page has bank details and a disabled "Pay Online … COMING SOON"; the QR exists only in the homeowner portal. `docs/features/finance-module/spec.md:61`, `src/app/pay/inv/[token]/page.tsx:293-334`
- **G-516** **Approval gate.** The rules doc says milestone approval is on by default and accountants bypass it. The screens assume the default, the send route reads the raw setting (G-305), "Save & Send" in the composer skips the gate, and the bypass helper matches the tag "accounting" only (G-13). `docs/rules/finance.md:303-313`, `L/queries/studio-config.ts:69-76`, `A/finance/invoices/[id]/send/route.ts:93-100`
- **G-517** **Resend.** The rules doc describes `{ resend: true }` on the send route ("re-emails without a status write"); no screen in the finance components calls it. `docs/rules/finance.md:87`; search of `F/` and `L/queries/finance.ts` for "resend" found nothing
- **G-518** **Credit notes.** The rules doc is open that draft credit notes "are invisible until Plan 5"; the outcome copy still tells the user to "review it under Credit Notes", a place that does not exist. The spec mentions credit notes only as something synced to accounting. `docs/rules/finance.md:159`, `L/finance/rebalance-outcome-copy.ts:19`, `docs/features/finance-module/spec.md:455`
- **G-519** **Doc upkeep.** The rules doc says "22" finance components (the folder holds 57 `.tsx` files) and repeats one block of rules word for word (lines 86–131 again at 172–217). `docs/rules/finance.md:35`, `docs/rules/finance.md:87,173`, `docs/rules/finance.md:123,209`
- **G-520** **Where the docs and code agree and both are faults:** verification checks neither role nor overpayment (G-332); concurrent inserts can leave drafts one run stale (G-207); every payment gets a receipt with identical wording even when it is an unverified homeowner proof ("no watermark, no status caveat"). `docs/rules/finance.md:123-128`, `docs/rules/finance.md:169`, `docs/rules/finance.md:341`

---

## Uncertain / not verified

- Nothing was run. Every behaviour above is read from the code at `620190192`; rows marked **[inferred]** are worked out from structure (where a component is mounted, which handler a button calls, what a route does not check) and were not seen happening.
- Rows G-454 (the Overview tab's "Resolve" opening nothing) and G-383 (the PO dialog's price and quantity boxes keeping old contents) are the two inferred faults most worth a live check before anyone relies on them.
- Row G-498 depends on how the vendor email template uses `portal_link`; the template was not read.
- Row G-500: the auto-milestone route was read for its amount rule and its guards only; whether something after it (a database trigger, a later rebalance) corrects the draft was not traced.
- The database side — the triggers that derive paid / credited / status (migration 306), the freeze on signed totals (307), sequences and row-level security — is described from the library comments and `docs/rules/finance.md`, not from the SQL.
- The 10,830-line quote builder was read only in its `isVariation` branches; VO editor behaviour that comes from shared quote code (keyboard, price book, autosave edge cases) belongs to the quotes readers.
- `MilestoneCompletionDialog`, `vendor-picker`, `RecordGRNDialog` and `BrandedDocumentView` were skimmed. The printed look of the invoice, PO, VO and receipt PDFs was not inspected.
- The finance rail pages (`operations`, `pipeline`, `vendors`, `commissions`, `reports`) and the public pages were skimmed for the touchpoints only; their own rules, counts and role handling are not verified here. Which pill ("Bills" or "Purchase Orders") the Bills link lands on was not confirmed.
- Commission accrual was read only where the payment route computes its basis (G-475); payout modes, clawbacks and the split library's other callers are not covered.
- The accounting sync (queue, Xero push) is recorded only as "queued"; what is sent was not read.
- Notification and email copy was not read — only the event keys and the links passed to them.
- Region differences beyond the GST label, the tax rate and PayNow / DuitNow (Malaysia, UAE, India) were not traced.
- Who can switch the platform page `finance/operations` off (the tab's only gate), and from where, was not traced.
- Studio workflow defaults: whether a studio that never saved its settings is treated as "approval on" by every server route (G-305) was checked only for the send route.
- The "accountant" versus "accounting" tag split (G-13) was confirmed in the routes cited; other routes may differ.
- Line numbers are from the working tree at the stated commit and will drift.
