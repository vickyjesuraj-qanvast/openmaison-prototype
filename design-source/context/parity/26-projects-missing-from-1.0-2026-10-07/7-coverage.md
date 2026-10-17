# 7 — Coverage: did the 13 inventories read all of 1.0's Projects module?

Reviewer 7 of 7, 2026-10-07. Read only. 1.0 = `qanvast-id-tool` (`integ/security-non-qanvast` @ `620190192`); 2.0 = the
`openmaison-prototype` working tree. Method: every path or file name cited in `projects-1.0-inventory/A…M` was pulled out
(backticks, bare paths, brace lists, the readers' short names such as `cmp/…`, `api/ho/p/…`, `F/`, `P/`, `L/`, `A/`) and
matched against every 1.0 file that belongs to Projects or feeds it. A file counts as **cited** when an inventory names it by
path or by a distinctive file name. It counts as **glob-only** when the only cover is a reader's "I read all of X/\*\*" claim.
I opened every file that was not cited, and every glob-only file that might carry a feature.

## Bottom line

- **Most of what 2.0 rebuilt was read.** 829 source files (258k lines) belong to Projects or feed it. 511 are cited by
  path or name, 80 are covered only by a reader's glob claim, and 238 are cited nowhere. The project pages, the project
  components and Gantt, Tasks, the portal (pages, components and set-up) and every route under `api/projects`,
  `api/homeowner` and `api/tasks` are cited **file by file**.
- **Most of the 238 uncited files fall under calls that put their features off until later.** 97 are the 3D space planner,
  which F skimmed as instructed (Q-19: later). 74 are "money out and the books": Xero sync, vendors, purchase orders,
  commissions, reports and expenses (Q-35, Q-21, F-19). 12 are the studio's side of tickets and chat (Q-43), and 11 are
  floor-plan mark-up and Co-Pilot helpers (Q-19, Q-31). The remaining 44 are mostly routes and query hooks behind screens
  the readers did record, plus dead code. The features in section A below are the exceptions.
- **Five features are recorded in no inventory row:**
  1. **The studio's own invoice / PO / VO document templates** (Accounts › Document Templates: header and footer notes,
     a terms block, show or hide bank details, amount paid and balance due, and a per-company override). 2.0's invoice
     layout is fixed. Partly; Medium.
  2. **Fee-first payment stages.** A per-studio switch allows a fixed-amount stage such as "Design fees — S$3,000" beside
     the percentage stages. 2.0's payment stages are percentages only. Missing; Medium.
  3. **One default timeline per project type.** The Timeline Templates screen was never read. 2.0 has one default schedule
     template for the whole studio. Partly; Low.
  4. **The invoice's own "original → adjusted" line** after a variation order. Partly; Low.
  5. **Answer history on questionnaire answers.** Missing; Low. It belongs to the lead's Questionnaire, not Projects.
- **One file was cited but read only in part.** The Accounts Setup page (`accounts/page.tsx`, 3,825 lines) was read only
  where it touches the portal (M) and listed by tab name (J-229). Its Commission & Payouts, Expense Categories, PO Settings
  thresholds, Document Numbering, Project Types and Escalation Categories editors were never read line by line. All but
  Document Numbering sit under "later" or "kept" calls.
- **Docs.** 74 of 105 project docs are uncited. Almost all are implementation plans for code the readers did read. One
  feature appears **only in the docs, not in the code**: receipt scanning (`docs/superpowers/plans/2026-07-30-receipt-scanning.md`).
- **Migrations and gates.** Every project table is named somewhere, except the four `accounting_*` tables, chat
  participants and files, ticket comments, and two tables no code uses. Every feature flag and role gate around projects
  is recorded, except the fee-first switch.

## 1.0 Projects files

The files that belong to Projects or feed it, by area. "Cited" = named by path or file name in at least one of A…M.

| Area | Files | Lines | Cited by path or name | Only under a reader's glob claim | Not cited |
|---|---:|---:|---:|---:|---:|
| Studio project pages (`app/(main)/projects/**`) | 4 | 6,131 | 4 | 0 | 0 |
| Project components incl. Gantt (`components/projects/**`) | 76 | 29,383 | 73 | 2 | 1 |
| Tasks (`components/tasks/*`, `/tasks`) | 6 | 2,559 | 6 | 0 | 0 |
| Finance tab components (`components/finance/**`) | 65 | 20,655 | 57 | 0 | 8 |
| Floor-plan collaboration (`floor-plan-collab/*` + its libs + viewer) | 18 | 6,477 | 12 | 0 | 6 |
| Homeowner portal pages + components (`app/my/**`, `components/homeowner/**`, `/pay`, `/po`, `/renders`) | 68 | 13,343 | 63 | 5 | 0 |
| Portal set-up (`tools/homeowner-portal`, `settings/portal-*` …) | 16 | 3,348 | 16 | 0 | 0 |
| Accounts Setup parts that shape projects | 22 | 10,582 | 7 | 0 | 15 |
| Finance rail pages (`app/(main)/finance/**`) | 8 | 6,176 | 8 | 0 | 0 |
| Dashboard widgets | 7 | 3,971 | 4 | 0 | 3 |
| Escalations (tickets) pages | 3 | 921 | 1 | 0 | 2 |
| Co-Pilot meeting-summary components | 2 | 1,192 | 0 | 0 | 2 |
| PDF documents (receipt) | 1 | 78 | 0 | 0 | 1 |
| API: projects · aggregates · files · selections · templates | 64 | 9,431 | 63 | 1 | 0 |
| API: tasks | 9 | 1,157 | 7 | 2 | 0 |
| API: homeowner · homeowner-links · bind · portal · scope | 64 | 8,936 | 52 | 12 | 0 |
| API: finance · finance-documents · pay · po · vendors · numbering · flags | 79 | 14,218 | 29 | 3 | 47 |
| API: floor plans (project-linked) | 4 | 342 | 3 | 0 | 1 |
| API: crons (+ `vercel.json`) | 13 | 2,340 | 3 | 10 | 0 |
| API: escalations · chats | 11 | 1,311 | 1 | 0 | 10 |
| API: Co-Pilot meeting summary | 5 | 904 | 3 | 0 | 2 |
| lib: projects · lifecycle · finance · accounting · VO · money helpers | 83 | 13,385 | 48 | 9 | 26 |
| lib: homeowner · portal · branding | 12 | 2,959 | 11 | 0 | 1 |
| lib: notifications (+ channels) | 31 | 5,423 | 9 | 20 | 2 |
| lib: queries (project-related) | 26 | 8,123 | 15 | 0 | 11 |
| data: compliance · timeline and milestone templates | 15 | 10,001 | 9 | 4 | 2 |
| AI agent project tools | 3 | 8,384 | 2 | 0 | 1 |
| 3D space planner (opened from a project's "Plan the Space") | 114 | 66,720 | 5 | 12 | 97 |
| **Total** | **829** | **258,450** | **511** | **80** | **238** |

Outside the source tree:

- **Migrations.** 198 migration files touch project tables. 121 are cited by file name or number. J's header claims both
  sets "in full for every project-related table". I checked that claim table by table: of the 178 tables the two sets
  create, every project-related one is named in an inventory except `accounting_connections` · `accounting_mappings` ·
  `accounting_remote_links` · `accounting_sync_queue` (279, Xero sync), `conversation_participants` · `conversation_files`
  (chat), `escalation_comments` (141, ticket comments), and `homeowner_moodboard_items` · `studio_portal_pages`. Nothing in
  `src/` uses those last two. The 77 uncited migration files are mostly seeds, row-level-security locks, indexes and
  backfills. Of the uncited ones, only 168 · 169 · 170 matter: they seed the default invoice, PO and VO document templates
  (row 1 below).
- **Docs.** 105 project-related docs, not counting PDFs and screenshots: 31 cited, 74 not. The uncited ones are 55
  `docs/superpowers/` plans and specs, 9 under `docs/features/` (the portal-merge proposals and UAT sheets), 4 user-story
  files, the multi-entity finance PRD, the 30-minute finance demo script, the projects backend UAT, a deployment note, a
  bug note and the June finance audit. See *Uncertain* for what I skimmed.
- **Glob-only files (80).** These sit under a claim but no row names them. Every one that could carry a feature was opened:
  - 20 notification internals. J-169…200 record their events.
  - 12 homeowner routes. I records ticket reply and close, the invoice PDF, the bell and plan uploads.
  - 10 crons. The project ones are recorded in J-199 and J-200.
  - 9 money helpers. Omission VOs (G-151, G-158) and receipts (G-495) are recorded. The invoice-lineage helper is not
    (row 4 below).
  - 3 legacy `/pay/[token]` routes, recorded in G-496.
  - 12 3D-planner files.
  - The rest are type files and shims.

## Not read by any inventory

Every uncited project file or folder, grouped by the feature it carries. "1.0 rows" says where an inventory already holds
the feature even though it never cites the file. Impact and Size follow the brief (Impact on a studio; Size = 2.0 work).

### A. Features no inventory row records

| 1.0 path | What it does (studio's words) | In 2.0? | Status | Impact | Size |
|---|---|---|---|---|---|
| `src/components/settings/invoice-po-template-editor.tsx` (549 lines), `src/app/(main)/accounts/document-templates-tab.tsx:146-151` (tabs Invoice · Purchase Order · Variation Order), `src/app/api/document-templates/{records,records/[id],default,set-default}/route.ts`, `src/app/api/studio-config/doc-templates/**`, `src/lib/queries/document-templates.ts`, `src/lib/studio-branding.ts`, migrations `scripts/migrations/168_seed_invoice_po_default_templates.sql` · `169_doc_templates_add_vo_type.sql` · `170_seed_vo_default_templates.sql`; rendered by `src/components/finance/BrandedDocumentView.tsx` (G only skimmed it; G's closing note says "the printed look of the invoice, PO, VO and receipt PDFs was not inspected") | **Your own invoice, PO and VO paper.** A studio-wide default template per document type plus an override per issuing company. A header note (greeting, scope line), a footer note, a labelled terms block (payment terms, exclusions, warranty), an acceptance-terms block, switches to show or hide bank details, amount paid and balance due ("hidden automatically when paid in full"), and an accent colour. A live preview runs on sample data. M-264 read the tab for portal mentions only. | Invoice paper is fixed: the issuing entity's letterhead, the stage line, the contract line, GST, bank and PayNow (`components/projects/money/invoice-paper.tsx`). No studio wording, no terms block, no switches. A VO prints through the quote's own templates (it is a quote in variation mode, F-06), so the VO is covered. POs are money out. | **Partly** | Medium | M |
| `src/app/api/studio-config/features/route.ts:26-35, 52, 79` (`feeFirstMilestones`, default off); `src/lib/finance/milestone-schedule.ts:95` (`FEE_FIRST_MILESTONES_ENABLED = false`, the fleet-wide switch); read in the quote digitizer, quote PDF, signing preview and `api/finance/generate-invoices/route.ts:156-191`; design `docs/superpowers/specs/2026-08-25-fee-first-payment-milestones-design.md` + plans a…d; `FIXES-REPORT-ROUND2-fee-first-milestones.md` | **Fee-first payment stages.** A studio switched in can put a **fixed-amount** stage such as "Design Fees — S$3,000" before the percentage stages. It flows through the quote, its PDF, invoice generation, the VO rebalance and the timeline. The inventories mention "fixed amount" in passing (B-136, B-277, E-191, E-261) but never the switch, its default (off) or what it gates. | Payment rows are percentages only: `quote_payments.pct`, `PaymentRow { pct }` (`lib/quotes/payments.ts:18`). F-03 bills every stage as a share of the contract value. | **Missing** | Medium (studios that charge a design fee up front) | M |
| `src/app/(main)/accounts/timeline-templates-tab.tsx` (365 lines) | **One default timeline per project type.** For each type, a list of milestones (name, days, colour), reorder, "Reset to default", and a "(default — not yet customised)" hint. The Gantt's "Reset to template" reads it. The data is recorded (J-39, J-229, J-311); the screen and the per-type rule are not. | Company › Templates › Schedules (`components/company/templates/schedules/*`) plus **one** default in Settings › Projects › Schedule defaults (`components/projects/schedule/start-schedule.tsx:32-34`). There is no template per project type. 2.0 keeps three project types (`lib/projects/model.ts:18`). | **Partly** | Low | S |
| `src/lib/finance/invoice-lineage.ts` (glob-only under G's "`src/lib/finance/*` that the tab reaches"), used by `BrandedDocumentView.tsx:12, 81-93, 221` | **The invoice explains a change.** After a VO moves the contract, the invoice carries a "contract before → after (VO-003)" header. When this invoice itself was rebalanced, it also shows its original amount next to the adjusted one. | The invoice paper prints "Contract value X (the signed quote Y + variation orders Z)" (`invoice-paper.tsx:86`). There is no original → adjusted line for the invoice itself. | **Partly** | Low | S |
| `src/components/shared/scope-answer-history-popover.tsx`, `src/components/shared/scope-answer-input.tsx`, `src/app/api/projects/[id]/scope-answers/history/route.ts` (glob-only) | **Answer history.** "History (N)" under a questionnaire answer lists every overwrite, newest first, with who changed it. Only the history table is recorded (M-180). | No history on the lead's Questionnaire (`components/leads/questionnaire/*`). | **Missing** (the Leads module, not Projects) | Low | S |
| `src/lib/floor-plan-notify-window.ts` (66 lines) | **A quiet window for floor-plan alerts.** The first mark on a plan notifies at once. Later marks by the same side on the same plan stay silent for 15 minutes, so six marks in two minutes send one alert. | Floor-plan mark-up is not built. | **Left out on purpose** (Q-19 "later; own modules, own audits"). Carry this rule into that audit. | Low | S |
| `docs/superpowers/plans/2026-07-30-receipt-scanning.md` (1,494 lines), spec `…/specs/2026-07-30-payment-receipts-and-receipt-scanning-design.md` Part B | **Scan a payment screenshot** (PayNow or bank transfer) to pre-fill a payment, and check a client's proof against it. **Described, not in the code**: no route or component exists. Parts A (receipts) and C (Gantt full-screen label) were built and are recorded. | 2.0 records payments by hand; the client sends proof from the portal (F-10). | **Not a product feature** (never shipped in 1.0) | — | — |

### B. Files no inventory cites, whose feature *is* recorded elsewhere

| 1.0 path | What it does | 1.0 rows | In 2.0? | Status | Impact | Size |
|---|---|---|---|---|---|---|
| `src/app/(main)/accounts/page.tsx:2084-2754` (Commission & Payouts editor), `api/finance/records/commission-rules` + `commission-entries`, `src/lib/commissions-fan-out.ts`, `src/lib/finance/commission-summary.ts`, `src/lib/queries/commissions.ts` | **Commission rules.** A studio default rate (on revenue or profit), overrides per designer, per project, or per project and designer. Commission accrues on each milestone payment or once per project, and the rules have a priority order. | J-229 (tab name), G-318 (rule order on payment), G-492, J-189 | None | **Left out on purpose** (Q-21 "Hold for Finance"; Q-35 later) | — | — |
| `src/lib/accounting/**` (21 files, about 4,600 lines), `src/components/settings/accounting/*` (9), `src/app/api/finance/accounting/**` (11), `src/lib/queries/accounting.ts`, cron `accounting-sync`, migration 279, plans 2026-08-03 · 08-11 · 08-14 | **Accounting integration (Xero).** Connect, pick the organisation, map accounts and tax codes (auto-map), backfill history, push invoices, payments, bills and credit notes, a sync activity log with Retry, and a "connection expired" alert. | G-318 says only "accounting sync queued"; the tables are named nowhere | Company › Integrations lists "Xero · Zoho Books — invoices and payments two ways" with **Notify me** (`components/company/integrations-view.tsx:314`) | **Left out on purpose** (Q-35 "money out and the books … accounting links" later) | — | L |
| `src/app/(main)/escalations/page.tsx`, `…/[ticketId]/page.tsx`, `src/app/api/escalations/{route.ts,[id]/comments,[id]/status,records/by-ticket/[ticketId]}`, Accounts › Escalation Categories (`accounts/page.tsx:1821-1847`), migration 141 | **The studio's side of tickets.** A ticket list with Open, In Progress and Resolved counts, average resolution time, filters by status, priority and member, a project column, and "Raised by". The ticket page has a reply visible to the homeowner or an internal note, re-assign, priority, status, AI analysis and Re-open. Ticket categories are editable. | The homeowner's side is recorded in I-326…335; events in J-188 and J-198; the project link in J-219 | None. The portal says "Message your designer on WhatsApp". | **Left out on purpose** (Q-43 "tickets and chat later") | — | L |
| `src/app/(main)/inbox/page.tsx`, `src/components/inbox/*` (7 files), `src/app/api/chats/**` (5), `src/app/api/chat/upload`, `src/lib/queries/chats.ts` | **The studio's chat inbox** with clients: participants, attachments and a project link. | J-218; the portal's Chat tab in I | None | **Left out on purpose** (Q-43) | — | L |
| `src/components/finance/{vendor-detail-drawer,VendorTransactionHistory,vendor-merge-dialog}.tsx`, `src/app/api/vendors/**` (4), `src/lib/queries/vendors.ts`, `src/lib/vendors/kind-column.ts` | **Vendor directory.** A vendor drawer, transaction history, and merging duplicate vendors. | G-490, and the vendor-management README | None | **Left out on purpose** (Q-35) | — | — |
| `src/app/api/finance/purchase-orders/[id]/pdf`, `src/lib/po-pdf.ts`, `src/app/api/finance/records/purchase-orders(/[id])`, `src/app/api/po/quote-compare` (AI check of PO lines against the signed quote), Accounts › PO Settings thresholds (`accounts/page.tsx:2879-3032`) | **Purchase orders.** The PDF, the list, an AI comparison against the quote, a PO review threshold and an advance-payment review threshold. | G-357…374, G-497; the quote-compare panel in G | None | **Left out on purpose** (Q-35) | — | — |
| `src/app/api/finance/expenses/upload-receipt`, `src/app/api/finance/records/expense-categories`, Accounts › Expense Categories (`accounts/page.tsx:1971-2083`, with an "overhead" flag), `src/app/api/finance/bills/[id]/document`, `src/app/api/finance-documents/documents(/[id])`, `src/lib/queries/bills.ts` | **Expenses, bills and external finance documents.** | G (expenses, bills, upload of an external document) | None | **Left out on purpose** (Q-35) | — | — |
| `src/app/api/finance/records/pipeline-financials`, `src/app/api/finance/payments` (the studio-wide receipts list), `src/components/finance/{entity-chip,entity-picker}.tsx`, `src/lib/fx.ts`, `src/lib/period-boundaries.ts`, `src/lib/reports/multi-currency.ts`, `src/lib/queries/reports.ts`, `src/app/api/reference/fx-rates`, `docs/prd/04-multi-entity-finance.md` | **Studio-wide finance.** The Pipeline board, the Operations receipts list, a filter by issuing company, and the reports, including a **Statement of Account per project**, GST/Tax, P&L, AR and AP ageing, and multi-currency. | G-487…491 (tab names only; no report was read) | None | **Left out on purpose** (F-19 "a studio-wide money list: not yet"; Q-35 "reports" later) | — | — |
| `src/components/finance/RemindApproverButton.tsx` | **"Remind approver"** on an invoice waiting for approval (one per member per hour, three per invoice per day). | G-217, G-226 | Designer submits, owner sends or sends back (`app/projects/money-actions.ts:165-261`). The designer has no nudge for the owner. | **Missing** | Low | S |
| `src/app/api/finance/invoices/upload-pdf/route.ts` | **Upload an invoice made elsewhere** (PDF, image or spreadsheet), check the read fields, then pre-fill the composer. | G-275…285 | None | **Missing** | Low | M |
| `src/app/api/finance/invoices/[id]/reject-approval/route.ts` | The approver sends an invoice back with a reason. | G-218, G-224, G-225 | `sendBackInvoice` (`app/projects/money-actions.ts:233`) | **Built** | — | — |
| `src/app/api/finance/invoices/[id]/pdf`, `src/lib/invoice-pdf.ts`, `src/components/pdf/PaymentReceiptPDF.tsx`, `src/app/api/pay/receipt/[token]/pdf`, `src/app/api/finance/payment-records/[id]/receipt-link`, `src/app/api/pay/{inv,receipt}/[token]` | **Invoice and receipt PDFs and public links.** 1.0 renders and stores a PDF file. | G-493…495, I-298 | Invoice and receipt pages with **Download PDF** through the browser's print (`components/projects/money/invoice-page.tsx:28-42`, `payments-receipt-page.tsx:20-45`); the client sees both in the portal | **Built** | — | — |
| `src/app/api/finance/records/payments/[id]/id-verify/route.ts` | Tier-1 "ID verified" step of a three-tier payment verification. | G-316, G-411 | One confirmation | **Left out on purpose** (F-11 "a payment the studio records is confirmed on entry") | — | — |
| `src/app/api/finance/records/portal-tokens/route.ts` (+ glob-only `api/pay/[token]/{approve-milestone,raise-issue,verify}`) | The legacy single client link `/pay/{token}`. | G-496 | Replaced by the portal | **Left out on purpose** (Q-14 · Q-37) | — | — |
| `src/app/api/identity/studio-settings/payment-schedule/route.ts` | The studio's default payment schedule. | G-177 | Company › Templates › Payments + the default split | **Built** | — | — |
| `src/app/api/studio/milestone-templates/[id]/route.ts` | Rename or delete a saved Gantt template. | E-276, J-311 | The Schedules library (rename, delete, folders) | **Built** | — | — |
| `src/app/api/quotes/records/[id]/vo-editor-context/route.ts` | The VO editor's "contract before → net change → revised contract" panel. | G-149, G-158 | `components/quotes/editor/variation-bar.tsx` ("the contract today and with this change") | **Built** | — | — |
| `src/app/api/finance/records/invoices/[id]/payments/route.ts` | The payments made against one invoice. | G (invoice detail) | The Money tab's payments under each invoice | **Built** | — | — |
| `src/app/api/studio-config/numbering`, `…/next-document-suffix`, `src/lib/queries/document-numbering.ts`, Accounts › Document Numbering (`accounts/page.tsx:1849-1858`, `:3623+`: invoice, PO and ticket prefixes, plus numbering per issuing company) | **Document numbers.** | J-229 (tab name), B and G (numbering) | Settings › Projects invoice and receipt patterns (F-13); no numbering per issuing company | **Partly** | Low | S |
| `src/components/accounts/material-catalog-manager.tsx` (Accounts › Material Catalog) | **The studio's reusable material catalog**: browse, add, edit, archive, vendor, image. | F-139…147 (pick from and save to it) | Choices options come "From Materials" (Company › Materials) or "From the Price book" (`components/projects/choices/option-dialog.tsx:29`) | **Built** | — | — |
| `src/components/settings/notification-template-editor.tsx`, `tiptap-variable-node.ts`, `src/app/api/notifications/{templates,preferences,schedule,…}` | **Studio-edited notification wording**, with variables, a preview and Reset. | J-56, J-169…200, M-265 | Settings › Notifications message templates (`app/settings/notifications-settings.tsx:9-29`), project events included | **Built** | — | — |
| `src/lib/floor-plan-{export-pdf,annotation-filter,comment-attachments,site-diary}.ts`, `src/lib/upload-floor-plan-comment-image.ts`, `src/app/api/floor-plans/records/[id]` | Floor-plan mark-up helpers: export a marked plan to PDF, a filter by author, photos on marks, the site diary. | F-185, F-186, F-202, F-220 | Not built | **Left out on purpose** (Q-19) | — | — |
| `src/components/copilot/{meeting-brief,lead-or-project-picker-dialog}.tsx`, `src/app/api/copilot/brief/[briefId](/save-to-lead)` | The Meeting Co-Pilot brief, attached to a lead or a project. | D (Meeting Summary card), J | Not built | **Left out on purpose** (Q-31 "Hold both") | — | — |
| `src/components/projects/project-financial-report.tsx` | The "Financial Report" dialog: expected vs actual revenue, costs and margin. | C-338, G-39 (nothing opens it) | — | **Not a product feature** (unreachable in 1.0) | — | — |
| `src/lib/agents/page-tool-map.ts`, `src/components/dashboard/{inline-response,sparkline,donut-chart}.tsx` | The mAIson bot's tools per page, and its result cards on the Dashboard ("Open Project Finance", "View Project"). | J-228, B-304…309 | Maison AI gives scripted suggestions only; Dashboard not built | **Left out on purpose** (Dashboard later, per the build record; Q-12 "AI-written timelines held") | — | — |
| `src/lib/queries/{assignees,portal-settings,credit-notes,scope-answers,contracts}.ts` | Query hooks behind screens that are recorded: Team card, portal settings, credit notes, the questionnaire, the lead's contract flow. | C, M, G, I | — | **Not a product feature** (plumbing) | — | — |

### C. Not Projects, or dead

| 1.0 path | What it is | Status |
|---|---|---|
| `src/components/finance/material-status-dots.tsx`, `src/data/mock-tasks.ts` | No importer anywhere. | Not a product feature (dead) |
| `src/app/api/finance/export/route.ts` | CSV export of invoices, SOA, GST and P&L. No caller in `src/`. | Not a product feature (dead) |
| `src/app/api/finance/purchase-orders/[id]/send/route.ts` | Superseded by `records/purchase-orders/[id]/action` "send-to-vendor". | Not a product feature (dead) |
| `src/components/finance/project-vo-quote-digitizer.tsx` | An 11-line re-export of `vo-editor/vo-editor-host`, which G read. | Not a product feature |
| `src/app/(main)/escalations/page.tsx:28` `PROACTIVE_ALERTS = []` | The "Proactive Alerts" tab ("ID Buddy continuously monitors all active projects…"). The list is a constant and always empty. | Not a product feature (dead UI) |
| `src/components/settings/checklist-settings.tsx` (Co-Pilot meeting checklists), `member-signature-card.tsx` (quote and contract signatures), `src/lib/twilio.ts` (studio login OTP), `src/lib/wa-me.ts` (contract flow), `src/app/api/reference/invoices` (subscription invoices), `src/data/compliance-actions.ts` + `compliance/*/actions.ts` (the Compliance Navigator tool: HDB DRC and similar), `src/app/(main)/settings/notifications/page.tsx` (wrapper) | Belong to other modules. | Not Projects |
| 3D space planner: `src/components/floor-plan/**` (about 22,700 lines), `src/app/api/floor-plans/**` minus share and records (about 9,850: generate · v2 · v3, auto-arrange · v2, photo- / text-to-model, refine, reshape, scene graph, detect issues, export GLB …), `src/lib/floor-plan-{model,mutations,validation,grid-validation,generate-utils,svg-renderer,scale,straighten}.ts`, `src/data/floor-plan-*`, `tools/floorplan-3d-sandbox` — 97 files, about 48,000 lines | F-252…267 recorded the planner's entry, its four ways in and its AI features; the 6,875-line editor was skimmed by instruction. | **Left out on purpose** (Q-19, own audit) |

## Feature flags and gates

These change what a studio sees around projects. Everything except the first row is recorded.

| Gate | Where | What it changes | Recorded? | 2.0 |
|---|---|---|---|---|
| `feeFirstMilestones` (per studio, default **off**) + `FEE_FIRST_MILESTONES_ENABLED = false` (fleet-wide) | `api/studio-config/features/route.ts:26-35,52`; `lib/finance/milestone-schedule.ts:95`; read by the quote digitizer `:1194`, `sign/[token]/preview-pdf:628`, `generate-invoices:156-191` | Whether a studio may have fixed-amount payment stages. With the switch off, a fixed stage is refused or treated as a non-payment bar (the Gantt, the 100 % check in the publish wizard, the portal). | **No** (fixed amounts are mentioned in B-136, E-191 and E-261; the switch is not) | Missing (stages are percentages only) |
| `lockProjectOnHandover` (default off) + `project_override.override_lock` | `features/route.ts`; `[projectId]/page.tsx:809-813` | Locks a Closed project for everyone but Owners and Admins. | Yes (C-20, D-87, E-13, J-17) | — |
| `casetrustSigningStep` (Singapore only) | Feature Flags tab | A deposit-protection disclosure step when signing. | Yes (F-295, M-260) | — |
| Workflow rules (eleven switches, all on by default) | Accounts › Workflow Rules | Progress review, milestone approval, commission approval, contract required, project type required … | Yes (J-43, D-77, M-258) | — |
| "Require approval before sending invoices" | Accounts › PO Settings | A designer's invoice waits for an Owner or Admin. | Yes (M-259, G-296) | F-05 |
| Proactive Alerts (+ extension requests) | Accounts › Proactive Alerts | Review tasks before milestones fall due; an extension request makes an approval task and an update. | Yes (E-283, E-333, M-262) | — |
| Portal feature switches (15) and Portal paused | Portal hub | Which sections the client sees. | Yes (I, M) | Q-45 |
| Platform page switches `finance/operations`, `tools/homeowner-portal` | `/admin/studios/{id}`; `[projectId]/page.tsx:1758,1799,1879,2282` | Hide the project's Finance tab, Invite to Portal and the hub. | Yes (C-36, C-63, M-250, M-289) | — |
| Role permissions (`projects.*`, `payment_schedule.override`, the finance toggles) | `lib/access-control.ts:212-345`; `components/accounts/role-editor.tsx` | The Team card, the payment-schedule freeze, the lock override. The finance toggles are shown but not applied. | Yes (J-151…154, C-343, G-09, G-16). Not recorded: the slugs `finance.create_invoice` and `finance.record_payment` are defined (`access-control.ts:224-225`) but nothing checks them. That adds nothing new for a studio. | Four fixed roles (L-251) |
| Owner-only listing extras; Designers filtered only in the browser | `projects/page.tsx` | KPI tiles, Workload view. | Yes (A-99, A-100, J-155, J-161) | Q-06, Q-08, Q-23 |
| Manager hierarchy (Dyel only) | `features.leadManagerHierarchy` | Lead visibility; no project effect. | Yes (J-166) | — |
| Country gates | `data/compliance/{sg,my,ae,in,eg}`, `region-config.ts` | Compliance lists; PayNow (SG) or DuitNow (MY) QR; CaseTrust. | Yes (F-288, F-298, J-231, J-239, G, I, M) | Q-31 holds compliance |
| Demo studios and paused studios | `lib/notifications/dispatch.ts` | No notifications. | Yes (J-169, J-200) | — |
| Subscription plan or AI-credit gates on Projects | searched `src/` | **None exist in 1.0.** `po/quote-compare` only skips its AI step when no AI credentials are configured. | n/a | Q-30 (nothing metered) |
| `MULTI_QUOTE_SIGNING_ENABLED = false` | `components/leads/contract-flow-dialog.tsx:99` | Signing several quotes at once. This is contracts, not Projects. | No (out of scope) | Send together exists (REG-584…597) |

## Uncertain

- **The matching is by name.** A file counts as cited when a row names its path or a distinctive file name. Route folders are
  matched by their last two path segments, for example `[id]/send`, so a few generic matches may be false positives. I
  checked those by hand and moved them back to "not cited": `records/[id]`, `[id]/document`, and file names that are
  ordinary words (`assignees`, `reports`, `vendors`).
- **Glob claims were taken at their word**, apart from spot checks. Those claims are J's `src/app/api/projects/**`,
  `src/lib/notifications/**` and `src/app/api/cron/**`; I's `src/app/my/**`, `src/app/api/homeowner/**` and
  `src/components/homeowner/*`; and G's `src/lib/finance/*` "that the tab reaches". For each glob-only file I opened it and
  looked for its feature in the rows. I did not re-check that the reader actually read it.
- **Files read in part.** Line by line, `accounts/page.tsx` (3,825 lines) was read only in its portal regions. The project
  page (5,130 lines) is fully covered by the union of the readers' ranges: C 1–2620 and 4440–5130, E's milestones block at
  2621–2879, F 2880–3268, G 3271–4037, H 4039–4693. `lib/queries/projects.ts` 1060–1223 (render annotations) is covered
  by H. I did not check every other file that a reader says it read "in the parts that touch X".
- **Docs.** I read the headings of eight uncited docs: the projects-module overhaul design, the portal-merge proposals 6–10,
  7 and 11, the multi-entity PRD, the portal-features deployment note, the backend UAT and the demo script. I read the
  receipts / receipt-scanning spec in part and the portal user stories in full. The 55 superpowers plans were not read
  line by line. I only checked whether their headline features exist in code: they do, except receipt scanning.
- **The money-out reports were not read by anyone.** That covers the Statement of Account per project, GST, ageing and
  the other Finance › Reports tabs. Their exact contents are unknown beyond G-491's tab list. They only matter once Q-35's
  module is audited.
- **Out of reach.** Not checked: `e2e/` (19 tests), `messages/` (i18n strings), `supabase/seeds`, and the non-migration
  `scripts/`. None of these carries a product feature, but a string in `messages/` could hold copy the screens use.
- **Sizes and impacts** for the Partly / Missing rows are my estimates from reading 2.0's code. Other reviewers own those
  areas (G for money, E for the schedule) and may rate them differently.

## Appendix — every uncited project file (outside the 3D planner)

141 files, about 25,900 lines; line counts in brackets. The 97 planner files are summarised in section C.


**AI agent project tools**

- `src/lib/agents/page-tool-map.ts` (67)

**API: copilot (meeting summary on a project)**

- `src/app/api/copilot/brief/[briefId]/route.ts` (92)
- `src/app/api/copilot/brief/[briefId]/save-to-lead/route.ts` (242)

**API: escalations / chats (tickets, chat)**

- `src/app/api/chat/upload/route.ts` (114)
- `src/app/api/chats/records/[id]/messages/route.ts` (129)
- `src/app/api/chats/records/[id]/participants/[participantId]/route.ts` (58)
- `src/app/api/chats/records/[id]/participants/route.ts` (98)
- `src/app/api/chats/records/[id]/route.ts` (62)
- `src/app/api/chats/records/route.ts` (216)
- `src/app/api/escalations/[id]/comments/route.ts` (205)
- `src/app/api/escalations/[id]/status/route.ts` (134)
- `src/app/api/escalations/records/by-ticket/[ticketId]/route.ts` (93)
- `src/app/api/escalations/route.ts` (137)

**API: finance + money docs**

- `src/app/api/finance-documents/documents/[id]/route.ts` (100)
- `src/app/api/finance-documents/documents/route.ts` (142)
- `src/app/api/finance/accounting/[provider]/callback/route.ts` (228)
- `src/app/api/finance/accounting/[provider]/connect/route.ts` (110)
- `src/app/api/finance/accounting/connections/[id]/activity/route.ts` (223)
- `src/app/api/finance/accounting/connections/[id]/backfill/route.ts` (252)
- `src/app/api/finance/accounting/connections/[id]/disconnect/route.ts` (120)
- `src/app/api/finance/accounting/connections/[id]/mappings/route.ts` (297)
- `src/app/api/finance/accounting/connections/[id]/route.ts` (75)
- `src/app/api/finance/accounting/connections/[id]/select-tenant/route.ts` (336)
- `src/app/api/finance/accounting/connections/[id]/sync/route.ts` (98)
- `src/app/api/finance/accounting/connections/route.ts` (62)
- `src/app/api/finance/accounting/queue/[id]/retry/route.ts` (80)
- `src/app/api/finance/bills/[id]/document/route.ts` (61)
- `src/app/api/finance/expenses/upload-receipt/route.ts` (73)
- `src/app/api/finance/export/route.ts` (267)
- `src/app/api/finance/invoices/[id]/pdf/route.ts` (148)
- `src/app/api/finance/invoices/[id]/reject-approval/route.ts` (78)
- `src/app/api/finance/invoices/upload-pdf/route.ts` (76)
- `src/app/api/finance/payment-records/[id]/receipt-link/route.ts` (58)
- `src/app/api/finance/payments/route.ts` (109)
- `src/app/api/finance/purchase-orders/[id]/pdf/route.ts` (144)
- `src/app/api/finance/purchase-orders/[id]/send/route.ts` (165)
- `src/app/api/finance/records/commission-entries/route.ts` (111)
- `src/app/api/finance/records/commission-rules/route.ts` (143)
- `src/app/api/finance/records/expense-categories/route.ts` (85)
- `src/app/api/finance/records/invoices/[id]/payments/route.ts` (43)
- `src/app/api/finance/records/payments/[id]/id-verify/route.ts` (48)
- `src/app/api/finance/records/pipeline-financials/route.ts` (60)
- `src/app/api/finance/records/portal-tokens/route.ts` (110)
- `src/app/api/finance/records/purchase-orders/[id]/route.ts` (86)
- `src/app/api/finance/records/purchase-orders/route.ts` (131)
- `src/app/api/identity/studio-settings/payment-schedule/route.ts` (42)
- `src/app/api/pay/inv/[token]/route.ts` (189)
- `src/app/api/pay/receipt/[token]/pdf/route.ts` (48)
- `src/app/api/pay/receipt/[token]/route.ts` (55)
- `src/app/api/po/quote-compare/route.ts` (245)
- `src/app/api/quotes/records/[id]/vo-editor-context/route.ts` (86)
- `src/app/api/reference/invoices/route.ts` (48)
- `src/app/api/studio-config/features/route.ts` (154)
- `src/app/api/studio-config/next-document-suffix/route.ts` (44)
- `src/app/api/studio-config/numbering/route.ts` (46)
- `src/app/api/studio/milestone-templates/[id]/route.ts` (95)
- `src/app/api/vendors/records/[id]/merge/route.ts` (283)
- `src/app/api/vendors/records/[id]/route.ts` (169)
- `src/app/api/vendors/records/[id]/transactions/route.ts` (133)
- `src/app/api/vendors/records/route.ts` (250)

**API: floor plans (project-linked)**

- `src/app/api/floor-plans/records/[id]/route.ts` (126)

**Accounts Setup parts that shape projects**

- `src/app/(main)/accounts/timeline-templates-tab.tsx` (365)
- `src/app/(main)/settings/notifications/page.tsx` (33)
- `src/components/settings/accounting/accounting-integration-tab.tsx` (232)
- `src/components/settings/accounting/backfill-dialog.tsx` (290)
- `src/components/settings/accounting/connect-provider-row.tsx` (52)
- `src/components/settings/accounting/connection-drawer.tsx` (262)
- `src/components/settings/accounting/connection-settings-panel.tsx` (198)
- `src/components/settings/accounting/connections-table.tsx` (147)
- `src/components/settings/accounting/mapping-table.tsx` (135)
- `src/components/settings/accounting/sync-activity-table.tsx` (327)
- `src/components/settings/accounting/tenant-picker-dialog.tsx` (125)
- `src/components/settings/checklist-settings.tsx` (504)
- `src/components/settings/invoice-po-template-editor.tsx` (549)
- `src/components/settings/member-signature-card.tsx` (150)
- `src/components/settings/notification-template-editor.tsx` (471)

**Copilot meeting summary components**

- `src/components/copilot/lead-or-project-picker-dialog.tsx` (206)
- `src/components/copilot/meeting-brief.tsx` (986)

**Dashboard project widgets**

- `src/components/dashboard/donut-chart.tsx` (70)
- `src/components/dashboard/inline-response.tsx` (961)
- `src/components/dashboard/sparkline.tsx` (55)

**Escalations (tickets) pages**

- `src/app/(main)/escalations/[ticketId]/page.tsx` (386)
- `src/app/(main)/escalations/page.tsx` (365)

**Finance tab components**

- `src/components/finance/RemindApproverButton.tsx` (66)
- `src/components/finance/VendorTransactionHistory.tsx` (160)
- `src/components/finance/entity-chip.tsx` (72)
- `src/components/finance/entity-picker.tsx` (63)
- `src/components/finance/material-status-dots.tsx` (47)
- `src/components/finance/project-vo-quote-digitizer.tsx` (11)
- `src/components/finance/vendor-detail-drawer.tsx` (578)
- `src/components/finance/vendor-merge-dialog.tsx` (330)

**Floor-plan collaboration**

- `src/lib/floor-plan-annotation-filter.ts` (71)
- `src/lib/floor-plan-comment-attachments.ts` (88)
- `src/lib/floor-plan-export-pdf.ts` (286)
- `src/lib/floor-plan-notify-window.ts` (66)
- `src/lib/floor-plan-site-diary.ts` (88)
- `src/lib/upload-floor-plan-comment-image.ts` (60)

**PDF documents (invoice/receipt/PO)**

- `src/components/pdf/PaymentReceiptPDF.tsx` (78)

**Project components (incl. Gantt)**

- `src/components/projects/project-financial-report.tsx` (147)

**data: compliance, templates**

- `src/data/compliance-actions.ts` (228)
- `src/data/mock-tasks.ts` (149)

**lib: homeowner + portal**

- `src/lib/studio-branding.ts` (443)

**lib: notifications**

- `src/lib/twilio.ts` (178)
- `src/lib/wa-me.ts` (45)

**lib: projects, lifecycle, money**

- `src/lib/accounting/README.md` (205)
- `src/lib/accounting/adapters/index.ts` (13)
- `src/lib/accounting/adapters/xero.ts` (692)
- `src/lib/accounting/apply-auto-mapping.ts` (78)
- `src/lib/accounting/auto-map.ts` (223)
- `src/lib/accounting/build-canonical.ts` (479)
- `src/lib/accounting/canonical-lines.ts` (165)
- `src/lib/accounting/connection-status.ts` (127)
- `src/lib/accounting/enqueue.ts` (156)
- `src/lib/accounting/errors.ts` (119)
- `src/lib/accounting/mapping-candidates.ts` (143)
- `src/lib/accounting/mapping-view.ts` (235)
- `src/lib/accounting/money.ts` (79)
- `src/lib/accounting/oauth-state.ts` (66)
- `src/lib/accounting/permission-gate.ts` (83)
- `src/lib/accounting/reconcile.ts` (85)
- `src/lib/accounting/resolve-connection.ts` (96)
- `src/lib/accounting/runner.ts` (319)
- `src/lib/accounting/supabase-deps.ts` (812)
- `src/lib/accounting/token-store.ts` (113)
- `src/lib/accounting/types.ts` (304)
- `src/lib/commissions-fan-out.ts` (94)
- `src/lib/fx.ts` (154)
- `src/lib/invoice-pdf.ts` (264)
- `src/lib/period-boundaries.ts` (53)
- `src/lib/po-pdf.ts` (330)

**lib: queries (project-related)**

- `src/lib/queries/accounting.ts` (438)
- `src/lib/queries/assignees.ts` (259)
- `src/lib/queries/bills.ts` (106)
- `src/lib/queries/commissions.ts` (312)
- `src/lib/queries/contracts.ts` (99)
- `src/lib/queries/credit-notes.ts` (89)
- `src/lib/queries/document-numbering.ts` (138)
- `src/lib/queries/portal-settings.ts` (114)
- `src/lib/queries/reports.ts` (537)
- `src/lib/queries/scope-answers.ts` (148)
- `src/lib/queries/vendors.ts` (277)
