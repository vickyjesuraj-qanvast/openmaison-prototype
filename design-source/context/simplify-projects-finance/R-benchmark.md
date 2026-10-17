# R — Benchmark: how the best tools organise a project and its money (simplify study, 2026-10-09)

**Question.** OpenMaison's Projects and Finance feel like "super high cognitive load". How do the tools that do the same jobs for
builders, designers and small firms organise them, and which of their patterns cut the load **without cutting features**?

**What OpenMaison has today** (for the mapping): a project page with **14 tabs** in one strip (`lib/projects/tabs.ts`: Overview · Tasks ·
Schedule · Updates · Money · Choices · Floor plan · Messages · Tickets · Compliance · Files · Notes & Logs · Questionnaire · Activity); an
Overview of about eleven cards (Getting started · Project stages · Schedule · Money · Key documents · Latest updates · Closing summary ·
Activity · My work · Files · Questionnaire); a Money tab with four tiles, four tables (Payment schedule · Variation orders · Other
invoices · Invoices sent) and a Costs half; and **Company › Finance with 8 tabs** by record type (`lib/finance/sections.ts`: Overview ·
Purchase orders · Bills · Expenses · Payments out · Vendors · Commissions · Accounting). The measured load is in the sibling studies
`P1-project-page.md`, `P3-project-money.md` and `F1-finance.md`. Building blocks this benchmark leans on already exist: one filled action
per project (`lib/projects/next-step.ts`), the listing's *Needs attention* / *Waiting on client* / *Needs my review* scopes
(`components/projects/scopes.ts`, `lib/projects/attention.ts`), payment stages tied to milestones (`project_milestones.payment_due`), and
the portal's shared schedule snapshot.

**How it was done.** Web research on 2026-10-09: the products' own help centres, release notes and product pages first, then review
aggregators (Capterra, G2, GetApp, Software Advice) and third-party write-ups. Nothing was used hands-on.

**How to read the evidence.** Each claim has a source link. Labels used:
- **(help)** — the vendor's help centre or release notes: describes what the product does.
- **(vendor)** — marketing copy: describes intent, not proof.
- **(review)** — user reviews. Samples are often small; the aggregate figures are the aggregator's.
- **(competitor)** — written by a rival product. DesignFiles' blog and Workyard's review are slanted.
- **(excerpt)** — `buildertrend.com` refuses direct reads, so its help articles were read through search-engine excerpts.

---

## 0 · The short answer

1. **The leaders do not have fewer modules than OpenMaison.** Houzz Pro's *client* dashboard alone can show 14 sections, and a
   Buildertrend job has about 20 tools. They keep the load down in four ways:
   - they **group** tools under a few headings;
   - they **hide** what a job doesn't use;
   - they **land on what needs you**, not on what exists;
   - they **push** a digest so people don't have to visit tabs.
2. **The home page that worked was a to-do page, not a dashboard.** Buildertrend rebuilt its landing page because "most users would begin
   there but quickly navigate to another page". The new page is ordered by deadlines and has an activity feed. Procore replaced its
   project home with an *Open Items* overview built on "ball in court".
3. **Money is easiest to follow on one spine.** The products that are praised for clarity hang money on one thing:
   - Monograph uses the phase timeline (MoneyGantt);
   - JobTread uses the job budget;
   - CoConstruct uses the single estimate;
   - Houzz Pro and Studio Designer use the item (or line).
   Every other document is converted from that spine, not typed again. The ones criticised for complexity keep money in separate,
   accountant-shaped silos, like Studio Designer's accounting.
4. **The studio-wide money view is a few numbers plus a to-do list, not one tab per record type.** Xero's dashboard has four panels and
   every figure drills down to its records. Its bills are split by status (Draft · Awaiting approval · Awaiting payment · Paid), and its
   dashboard links land on *Awaiting payment*. Costs come in through an inbox first: Buildertrend's Cost Inbox and QuickBooks' *For review*.
5. **The client side is the studio's view with things filtered out, plus a weekly digest.** CoConstruct says the client's view is "set up
   very similar to the builder's side". Houzz Pro drafts a weekly client update automatically from the week's activity, and the pro only
   edits and publishes it.

---

## 1 · Product by product

### 1.1 Houzz Pro (includes Ivy, now folded in)

| | |
|---|---|
| **Project IA** | In a navigation redesign (date not given), every project feature moved *inside* the project, in a left-hand menu. Before that, features sat in global top menus. The redesign's goal was to keep work "better organized" with "everything for a project in one place" ([Houzz Pro Learn, vendor](https://pro.houzz.com/pro-learn/blog/inside-the-newly-renovated-houzz-pro)). The project menu is grouped under headings: for example, the Selections Tracker sits "under the **Planning** section in the left menu" ([help](https://pro.houzz.com/pro-help/r/how-to-use-the-selections-tracker)). Houzz's own feature map groups the product as **Planning** · **Project Management** · **Financial Suite** · **Marketing**. |
| **Landing view** | A **Project Overview page made of tiles** that can be switched on or off. For example, the *Financial Overview* tile shows cash flow and money in and out, with a forecast, and has a *Full View* button. "If it's missing, open the customize settings and toggle it on" ([help](https://pro.houzz.com/pro-help/r/how-to-view-your-project-finances)). |
| **Client communication** | A **Client Dashboard** whose left menu shows only what the pro has shared: Messages · Project Updates · Claims · Contracts · Financials · Budget · Online Payment Records · Selection Boards · Mood Boards · 3D Floor Plans · Tasks & Punchlist · Schedule · Files & Photos · Daily Logs ([help](https://pro.houzz.com/pro-help/r/how-to-use-your-project-dashboard-for-clients)). Schedule, Daily Logs and Selections stay hidden until access is granted. Access is set inside each feature (Share › Client Access), and the pro can preview the client's view ([help](https://www.houzz.co.uk/pro-help/r/how-to-preview-and-share-the-client-dashboard)). A **weekly client update is drafted automatically** from the last 7 days of Schedule, Documents, Selections, Payments, Notes and Daily Logs. It has sections *Executive Summary · Looking Ahead · Action Items & Alerts*, and "drafts are never shared automatically" ([help](https://pro.houzz.com/pro-help/r/how-to-send-client-updates)). |
| **Selections / choices** | Selection Boards: the client approves or declines and comments. The **Selections Tracker / Project Tracker** is one table of every item in every room. Its status "updates automatically" as an item is approved, invoiced, paid and put on a PO. It has preset views (*Financials*, *Procurement*), custom columns, and a side panel to edit without leaving the table ([vendor](https://pro.houzz.com/pro-learn/blog/houzz-pro-introduces-new-project-tracking-experience), [help](https://pro.houzz.com/pro-help/r/how-to-use-the-selections-tracker)). |
| **Change orders · invoices · POs** | One recommended document flow: board → estimate/proposal → *Convert to purchase orders* / convert to invoice(s), in whole or by line. "Each conversion creates a linked document", and payments carry over ([help](https://pro.houzz.com/pro-help/r/recommended-document-flow)). Change orders sit with estimates and invoices under the client's *Financials*. |
| **Studio money** | A Financial menu (Estimates · Invoices · Job costing / Budget · Reports). An AI **Monthly Digest** summarises payments, time, expenses, logs and leads across projects ([vendor](https://pro.houzz.com/pro-learn/blog/4-new-houzz-pro-tools-to-enhance-project-management)). |
| **Mobile** | A project opens to a details page with four icons: **+ (create: estimate, floor plan, daily log, task, note)** · Message · Files · Schedule ([help](https://pro.houzz.co.uk/pro-help/r/how-to-manage-projects-and-leads-on-the-mobile-app)). Daily logs can be dictated ([vendor](https://pro.houzz.com/pro-learn/blog/4-new-houzz-pro-tools-to-enhance-project-management)). |
| **Praised** | Everything for a project in one place; the tracker: "anyone at any point can go and find what they need" ([vendor quote from a designer](https://pro.houzz.com/pro-learn/blog/houzz-pro-introduces-new-project-tracking-experience)). Ease of use once learned ([review](https://www.capterra.com/p/199689/Houzz-Pro/reviews/)). |
| **Criticised** | From a designer who came from Ivy: "A lot is going on and sometimes I wish I could hide some features I do not use … I liked the simplicity of the Ivy Designer interface." Another: "Steep learning curve for navigating the dashboard … transition from a proposal to an invoice is clunky." Capterra's theme summary counts "Unintuitive and slow user interface" as 75% negative across 55 reviews ([review, excerpts](https://www.capterra.com/p/199689/Houzz-Pro/reviews/)). |

**Ivy** (bought by Houzz in 2018, now closed to new members) was the designers' simple tool: a Project Tracker of products and services,
proposals, invoices and POs, a clipper, and room boards. Houzz says it "enhanced Ivy's fan-favorite features" in Houzz Pro
([vendor](https://pro.houzz.com/for-pros/difference-between-ivy-and-houzz-pro)). Reviewers who moved over miss Ivy's simplicity (above).

### 1.2 Buildertrend

| | |
|---|---|
| **Project IA** | A job's ~20 tools are grouped under **five menus**: **Sales** · **Project Management** (schedules, daily logs, to-dos, change orders, selections, warranty, time clock) · **Files** · **Messaging** · **Financial** (bids, estimates, POs, bills, budget, **cost inbox**, owner invoices, online payments), plus **Reports** ([competitor review](https://www.workyard.com/compare/buildertrend-review)). A job selector sits at the top. |
| **Landing view** | The **Summary** page, redesigned in 2022 because "the usage of the original landing screen was very low. Most users would begin there but quickly navigate to another page". The new page is personalised: "the most important information will appear based on set deadlines", it adds an **activity feed** (taken from the mobile app), sorts alerts by recency and importance, and gives "quicker navigation … to other areas" ([blog, excerpt](https://buildertrend.com/blog/summary-page-redesign/)). |
| **Client communication** | A Customer Portal. Its desktop redesign (date not given in the release notes) puts **homeowner Action Items** and Communications on the left, and a *Project Financials* section in the main area. In that section, Buildertrend "removed the remaining balance and invoice totals and replac[ed] them with a new **Next Invoice** callout". Daily logs became a horizontal *Project Updates* strip. Change orders gained **Approve & Pay** ("go directly to the invoice instead of approving … and then being prompted to make a payment"). Homeowner permissions moved to **one Company Settings section with per-job overrides** ([release notes, excerpts](https://buildertrend-publicroadmap.launchnotes.io/announcements/aug-12-16-buildertrend-updates), [2](https://buildertrend-publicroadmap.launchnotes.io/board/copy-of-small-software-renovations-october)). |
| **Schedule · selections** | A selection's deadline can be **linked to a schedule item** "by which the client must make a selection to stay on schedule" ([help, excerpt](https://buildertrend.com/help-article/selections-on-mobile/), [vendor](https://buildertrend.com/project-management/construction-selections-software/)). |
| **Studio money** | The **Cost Inbox**: email receipts to a personal address, bulk upload, or snap them in the app. AI drafts a bill, you set the job and vendor, then *Send for Approval* → *Ready for Payment* → pay or sync. "Drafts do not impact job financials and do not sync to accounting" ([help, excerpt](https://buildertrend.com/help-article/cost-inbox/)). The Job Costing Budget is the per-job money view. |
| **Interaction rules** | Around 2025 the actions were standardised: one **Save** with a dropdown; "less frequently used actions [moved] into an ellipsis menu to reduce screen clutter … with greater clarity and fewer clicks" ([help, excerpt](https://buildertrend.com/help-article/buildertrend-interaction-standards/)). |
| **Mobile** | A job picker at the top centre. The **Job Summary** shows job details, time-clock status, open to-dos, upcoming schedule tasks and recent daily logs. An **Activity Feed** follows, and a **+** creates (pick the job, fill in, *Close Draft* to finish later). Photos can be attached in bulk, and to-dos created from a log ([help, excerpt](https://buildertrend.com/help-article/daily-logs-on-mobile/)). |
| **Praised** | "Scheduling and client communication tools are my go-to … update homeowners in real time" ([review](https://capterra.com/p/70092/Buildertrend/reviews/?page=8)). It puts scattered information in one place. |
| **Criticised** | "Buildertrend offers a massive amount of features and it can be very complicated to learn." "It is difficult to maneuver from task to task. Too many steps. And if you make a mistake paying a PO/Bill it takes for ever to correct." From a former CoConstruct user: "lots of features but they 'live' in different silos and one function does not communicate well with the other." From a small firm doing 4–6 projects a year: "confusing and too expensive" ([reviews, excerpts](https://www.capterra.com/p/70092/Buildertrend/reviews/?page=14)). "Accessing what you need will require several clicks" ([competitor](https://www.workyard.com/compare/buildertrend-review)). |

### 1.3 CoConstruct (owned by Buildertrend since 2021)

| | |
|---|---|
| **Project IA** | Built around a **single-entry estimate**. "When you build your estimate, we automatically build your detailed specs & selection sheet." Cost lines and selection choices flow into the budget, and "client choices will immediately update the price, budget and projected cost" ([vendor](https://www.coconstruct.com/construction-selection-software), [vendor](https://www.coconstruct.com/features/construction-budgeting-software)). |
| **Landing view** | Not documented in the sources found. |
| **Client communication** | "The client's view of their project is set up **very similar to the builder's side**." Any item can be hidden from clients or trade partners, and partners' comments stay internal until shared ([help](https://www.coconstruct.com/learn-construction-software-features/clients-and-crew)). On questions to clients: "Most questions … actually are decisions", so they go on the selection sheet. "As a **LAST RESORT**, you can add a message on the messages page", because "you will keep information more organized if you can keep related thoughts together" ([help](https://www.coconstruct.com/learn-construction-software/how-do-i-ask-my-client-a-question-)). |
| **Change orders · invoices** | An allowance overage or upgrade becomes a change order with "no re-entry of data", and approval can "automatically generate invoices in QuickBooks or Xero" ([vendor](https://www.coconstruct.com/learn-construction-software/capture-changes-in-scope-and-cost)). CoConstruct's own example admits a gap: comments on change orders ended up on the Messages page, which was "a bit jumbled" and slower to resolve ([vendor](https://www.coconstruct.com/learn-construction-software/selections-management-change-orders-decisions-in-time)). |
| **Mobile** | Contractors report that clients review quotes and make selections "even on the go from their mobile app". Some users say the phone experience still "needs work" ([reviews, excerpts](https://www.g2.com/products/co-construct-coconstruct/reviews?page=2)). |
| **Praised** | Homeowners like "having schedules, selections and messages in one spot" ([review, excerpt](https://au.trustpilot.com/review/www.coconstruct.com?page=10)). |
| **Criticised** | Price rises and a migration path towards Buildertrend after the acquisition ([competitor](https://projul.com/blog/best-coconstruct-alternatives)). |

### 1.4 Procore (only what matters to a small contractor)

| | |
|---|---|
| **Project IA** | A *Project Tools* menu. An admin **turns tools on or off per project**; a tool that is off disappears from the menu, and its data stays ([help](https://v2.support.procore.com/en-au/product-manuals/admin-project/tutorials/add-and-remove-project-tools)). Each user can set **Favorites** for the tools menu across every project. |
| **Landing view** | The **Project Overview** (it replaced the legacy Project Home). Its core is **Open Items**: "a tool-by-tool overview of the open items for each active tool … with the total number of open items and a bar chart summarizing overdue items". It switches between *My Open Items* and *All Open Items*, and each item links into its tool ([help](https://support.procore.com/products/online/user-guide/project-level/home-project/tutorials/view-my-open-items-from-the-project-overview-in-the-projects-home-page)). At company level, *My Open Items* gathers every project's items assigned to you. |
| **Who acts next** | **Ball in Court**: each workflow record names "the person or team [that] currently holds responsibility for the next required action". It moves with each response and drives the notifications ([third-party guide](https://www.followupcrm.com/blog/how-to-change-ball-in-court-in-procore)). |
| **Mobile** | On iPhone, star tools on the Project Overview and turn on **"hide other tools"** ([help](https://support.procore.com/procore-mobile-ios/user-guide/project-overview-screen-ios/tutorials/configure-the-tool-order-for-a-project-ios)). |
| **Criticised** | Too heavy for small firms: "Procore is too clunky for our business procedures" ([review, excerpt](https://www.capterra.com/p/199689/Houzz-Pro/reviews/?page=14)). |

### 1.5 JobTread (added: remodelers' "simple" benchmark)

| | |
|---|---|
| **Project IA** | The **job budget is the backbone**. Customer orders, vendor orders (POs / work orders), invoices and bills are built from budget lines. Pending and approved orders show "in your budget as committed cost". Documents show "already invoiced / billed amounts and remaining balances", and deposits can be invoiced by percentage ([vendor](https://www.jobtread.com/blog/more-robust-job-budget-and-document-builder), [vendor](https://www.jobtread.com/purchasing)). |
| **Client side** | Customers and vendors can get a **read-only budget view** that the builder configures, with each figure expanding to the documents behind it ([release note](https://www-qxo-landing.tunnel.jobtread.com/product-updates/2024-08-13-external-budget-view)). |
| **Praised** | On G2, ease of use scores **9.4 vs Buildertrend 8.1** and ease of setup 8.9 vs 7.3 ([G2 compare](https://www.g2.com/compare/buildertrend-vs-jobtread)). Reviewers credit it with "keeping estimating, scheduling, documents and communication in one place". |
| **Criticised** | Missing features (timesheets, resource management); mobile is a friction point for trades ([G2](https://www.g2.com/compare/jobtread)). |

### 1.6 Studio Designer (designers' accounting-first suite; reported to own Mydoma)

| | |
|---|---|
| **Project IA** | An "**item-based integrated system**" ([vendor](https://www.studiodesigner.com/features/for-firm-principals)). An item is created once and added to a project, then put on a proposal, a PO or an invoice from the items screen ("Add Items to Order", "Add Items to Invoice"). *Item History* logs every action on the item ([vendor blog](https://www.studiodesigner.com/blog/collaboration-with-studio-designer)). |
| **Studio money** | Full accrual accounting (AR, AP, general ledger), plus "at-a-glance firm financials" for principals ([vendor](https://www.studiodesigner.com/features/for-firm-principals)). |
| **Praised** | "Very user friendly … everything is streamlined" (one 2024 review). Strong accounting ([review aggregate, AU](https://capterra.com.au/software/217839/studio-designer)). |
| **Criticised** | "Very cumbersome. The accounting part was too difficult". The same reviewer says an accountant at a national firm could not work it out either. "Wasn't able to correct errors easily so I went to myDoma Studio." A steep learning curve. Support replies took 10+ days ([reviews, excerpts](https://capterra.com.au/software/217839/studio-designer); [competitor](https://blog.designfiles.co/studio-designer-vs-design-manager/)). The review base is tiny (about 3 on Capterra US). |

### 1.7 Programa (designers and architects; Australia; listed in Xero's Singapore app store)

| | |
|---|---|
| **Project IA** | The **live schedule (FF&E / finishes) is the spine**. Items are grouped by room or category, and budget, procurement status and design fees live *inside* the schedule. One table has "**summary, financial, and detailed views**". When the client swaps a fixture, "the budget recalculates. The procurement status resets" ([vendor](https://programa.design/blog/client-portal-software-for-interior-designers), [vendor](https://programa.design/blog/your-all-in-one-client-dashboard-managing-projects-with-ease)). A *Project Files* page controls which schedules, pinboards and invoices each client can see. |
| **Studio view** | A Studio WIP dashboard that "consolidates every task, deadline, and team member assignment" ([vendor](https://programa.design/project-management-solution)). |
| **Client side** | **One link**: "one link to review live specs, approve selections, and track project progress". Approvals are time-stamped and logged. Invoices sit beside the specs and approvals they relate to, and can be paid there ([vendor](https://programa.design/blog/client-portal-software-for-interior-designers)). |
| **Money** | Invoices are made from schedules or from time, and synced to Xero / QuickBooks ([Xero SG listing](https://apps.xero.com/sg/app/programa)). |
| **Praised** | "Intuitive, beautifully designed, and genuinely saves me hours of admin" (Capterra 4.8 from 73 reviews; some incentivised) ([reviews](https://capterra.com/p/248518/Programa/reviews/)). |
| **Criticised** | Invoicing is "still in Beta mode and a bit clunky". Reviewers want "more comprehensive visibility over invoices in relation to schedules". "The iPad and mobile formats need improvement." Schedule layouts are too rigid for different trades ([reviews, excerpts](https://capterra.com/p/248518/Programa/reviews/)). |

### 1.8 Mydoma Studio

| | |
|---|---|
| **Project IA** | Projects work "like design binders", split into **Views / Spaces**. Products & Services can be grouped by space, category or option ([help centre](https://help.mydomastudio.com/en/)). |
| **Client side** | Client tabs: Contracts · Products & Services · Questionnaires · Files & Media · Design Boards · Notes. The designer chooses which parts each client sees ([summary](https://www.toolsforhumans.ai/ai-tools/mydoma-studio)). |
| **Money** | Proposals, invoices, POs / work orders, billable time, and Stripe / QuickBooks. |
| **Praised** | Support (4.8/5). "I really like the simplicity & ease of use" ([reviews](https://softwareadvice.com/project-management/mydoma-studio-profile)). |
| **Criticised** | Ease of use **3.9/5** (Capterra, 80 reviews). "Hard to maneuver." "Viewing the site on a mobile device is clunky." Reviewers want more control over what clients see ([reviews](https://capterra.com/p/155585/Mydoma-Studio/)). |

### 1.9 DesignFiles

| | |
|---|---|
| **Project IA** | Design boards (2D / 3D), proposals / quotes, invoices, POs and a client portal. "Once a quote is approved, you can auto-generate a purchase order with one click." A per-item **order tracker** shows paid, shipped, delivered or delayed ([vendor](https://designfiles.co/features/interior-design-procurement-software/)). |
| **Praised** | Approving and rejecting products with clients; quotes and invoices for a small business ([reviews](https://capterra.com/p/179202/DesignFiles/), 534 reviews, 93% positive). |
| **Criticised** | One user: "We do not use the PO option … because it's time consuming and cumbersome … especially for little orders like lightbulbs", and "the client cannot see" the product tracker ([user feedback board](https://designfiles.featurebase.app/p/product-tracker-for-clients-to-see-2)). Others: "The platform feels unpolished and clunky", and clients must create logins. |

### 1.10 Monograph (architects' and engineers' practice money)

| | |
|---|---|
| **Project IA** | **Phases are the backbone**. Without a phase budget a project doesn't appear in Staffing or Reports ([help](https://support.monograph.com/en/articles/5625088-how-to-use-the-project-financials-report)). **MoneyGantt** "lays planned, logged, and invoiced fees on a single bar". "When hours start eating the margin, the bar turns red, often weeks before a spreadsheet would show trouble" ([vendor](https://monograph.com/features/project-tracking)). |
| **Studio view** | "All active projects **ranked by budget consumption risk** so you know exactly which projects need attention first". Proactive alerts and an automatic **Weekly Pulse** ([vendor](https://monograph.com/features/project-tracking)). |
| **Client side** | The client's project overview shows, for each fixed-fee phase, "a progress bar comparing the amount billed to date against the total planned amount", plus counts of **Paid · Past Due · Open** invoices and a retainer balance ([help](https://support.monograph.com/en/articles/13179532-client-view-projects-overview-page)). |
| **Mobile** | No desktop or mobile apps ([review](https://www.cloudwards.net/monograph-review/)). |
| **Praised** | "We never once felt lost, and were always within a click or two of where we wanted to be" ([review](https://www.cloudwards.net/monograph-review/)). Capterra shows 93% positive sentiment across 236 reviews. |
| **Criticised** | Clunky in places, few reminders, light on workflow tools ([Capterra summary](https://www.capterra.com/p/178124/Monograph/reviews/Capterra___6252169/)). |

### 1.11 Small-business money UIs: Xero · Harvest · QuickBooks

| | |
|---|---|
| **Xero: the home** | A one-screen dashboard of a few panels: bank accounts, **invoices owed to you**, **bills you need to pay**, cash in and out. Clicking "any dashboard figure" drills down to the transactions behind it ([vendor](https://www.xero.com/accounting-software/dashboard)). |
| **Xero: lists by status** | Bills and invoices are filed by **status, not by type**: *Draft · Awaiting approval · Awaiting payment · Paid · Repeating*, with a summary bar of totals per status. The dashboard's links land on *Awaiting payment*, but the main menu lands on *All*. Users asked to choose the default tab, and Xero's answer was to "bookmark the Awaiting Payment tab" ([Xero product ideas](https://productideas.xero.com/forums/967115-invoices-quotes/suggestions/50553492-invoice-overview-able-to-chose-default-tab-it-op)). |
| **Harvest** | Invoices filter by draft, sent and late, with automatic late reminders ([vendor](https://www.getharvest.com/blog/2009/02/invoice-updates-payment-received-report-improved-dashboard-and-draft-invoices)). Each project has a **budget progress bar** in money or hours, and you can share it with the team ([vendor](https://www.getharvest.com/blog/2015/10/share-a-projects-budget-progress-with-your-team)). |
| **QuickBooks: capture first** | **Receipts › For review**: snap or email a receipt and QuickBooks "extract[s] info … and create[s] a transaction for you to review". It offers Match / Create bill / Create expense, and matched items move to *Categorized* ([help](https://quickbooks.intuit.com/learn-support/en-us/help-article/import-transactions/upload-receipts-bills-quickbooks-online/L862MmZHn_US_en_US)). |

### 1.12 Singapore

| | |
|---|---|
| **ID Connect** (`idconnect.com.sg`) | The only Singapore ID-firm suite found. Eight modules on one grid, "Manage All Processes in Just One Place": Leads · E-Quotation / E-Contract · **Variation Controls** · Centralised Project Management · Sales performance · Commission · **Supplier / Sub-Con Billing Controls** · Full Accounting. Variations "link … to the project payment milestones". Suppliers and sub-cons "submit their invoices to your dedicated portal" ([vendor](https://www.idconnect.com.sg/?p=90), [vendor](https://www.idconnect.com.sg/)). No client portal or mobile app is mentioned. |
| **Qanvast** (consumer app) | Matches homeowners with firms. Adaptive checklists and timeline reminders for the homeowner; staff "follow up to check on your progress" ([App Store](https://apps.apple.com/app/id785269548)). No studio-side project tool was found. (OpenMaison 1.0 is Qanvast's ID tool; see `design-source/context/parity/`.) |
| **Renopedia** | A directory and inspiration portal, not a project tool ([interview](https://www.redbrick.sg/blog/conversations-james-soh-renopedia/)). |
| **HipVan trade** | No trade or designer software was found. HipVan offers B2B styling advice only ([HipVan](https://www.hipvan.com/pages/hipvan-showroom?ref=footer)). |
| **Local context that shapes the IA** | CaseTrust-accredited firms must use the **CaseTrust Standard Renovation Contract** and a deposit performance bond ([CASE](https://www.case.org.sg/casetrust/accreditation-schemes-gold-for-renovation)). A 2026 Magistrates' Court case turned on *which* variation document was the agreed one ([PS 23 Interior v Andrew Tan, 2026 SGMC 71](https://www.elitigation.sg/gd/s/2026_SGMC_71)). That argues for one versioned VO record tied to the payment milestones, not loose documents. |

### 1.13 Field capture (for the phone pattern)

**CompanyCam**: site photos are time-stamped, geotagged and "organized by project" without filing steps
([App Store](https://apps.apple.com/app/id960043499)). Tagging large photo sets is reported as awkward
([SoftwareFinder](https://softwarefinder.com/field-service/companycam)).

---

## 2 · The products side by side

| Product | How a project is navigated | Lands on | Project money hangs on | Studio money organised by | Client view |
|---|---|---|---|---|---|
| Houzz Pro | Left menu, grouped (Planning …) | Overview tiles you can switch off | Item tracker + linked documents | Financial menu + monthly digest | Its own dashboard; sections appear only when shared; preview |
| Buildertrend | 5 menus (PM · Files · Messaging · Financial · Sales) | Summary ordered by deadline + activity feed | Job costing budget | **Cost Inbox** → approve → pay | Portal: Action Items, Next Invoice, Approve & Pay |
| CoConstruct | Spec & selections sheet | n/a | **The single estimate** | Budget + accounting sync | Mirrors the builder's view; hide per item |
| Procore | Tools menu; tools on/off per project | **Open Items** by tool, overdue first | Budget tool | Company *My Open Items* | n/a |
| JobTread | Job tabs | Job overview | **The job budget** (committed costs) | QuickBooks sync | Read-only budget view |
| Studio Designer | Items screen | n/a | **The item** | Full accounting | Portal (pay) |
| Programa | Schedules | n/a | **The schedule** (with views) | Xero / QuickBooks | **One link** |
| Monograph | Phases | n/a | **Phases on a timeline** (MoneyGantt) | Projects ranked by risk + Weekly Pulse | Billed vs planned per phase |
| Xero | Menu by area | **4-panel dashboard** | n/a | **Status** (Draft · Awaiting approval · Awaiting payment · Paid) | n/a |
| OpenMaison today | **14 tabs in one strip** | ~11 cards | Payment schedule + VOs + invoices + costs (4 tables + half) | **8 record-type tabs** | Portal sections (6 switches) + a separate Client access panel |

---

## 3 · Patterns that reduce load (14)

Each pattern lists who uses it, why it works, how it would map onto OpenMaison, and a caveat. *Mapping* names today's tabs and code; it
is a proposal, not a build instruction. Nothing here is built until Vicky marks it.

### P1 · Land on "what needs me", not on "what exists"
- **Who:** Buildertrend Summary (deadline-ordered, personalised, activity feed; rebuilt because people left the old landing at once).
  Procore Project Overview (*Open Items* per tool with an overdue bar; *My / All*). Buildertrend's portal (*Action Items* first). Houzz
  Pro's client update (*Action Items & Alerts*).
- **Why it works:** The first screen answers the question people arrive with ("what do I have to do here?") instead of making them scan
  every card for it. A summary that only describes the project gets read once, after which people "quickly navigate to another page",
  as Buildertrend found.
- **OpenMaison:** Above the cards, the project Overview leads with one list in three parts:
  - **Next** — today's `next-step.ts` primary action;
  - **Waiting on us** — invoice ready to send, payment to confirm, update in review, ticket open, message unanswered, compliance item
    due, schedule changes unshared;
  - **Waiting on the client** — VO, choice, invoice, questionnaire, designs to open.

  The reasons already exist at the listing level (`attention.ts`, `waitingOn`, *Needs my review*), so this reuses those registries
  rather than inventing new ones. The eleven cards then shrink to the few that support a decision (Money, Schedule, Latest update),
  and the rest move to their own tabs.
- **Caveat:** It must stay one list with one order, not a twelfth card.

### P2 · Say whose move it is (ball in court)
- **Who:** Procore (*Ball in Court* on every workflow record, which also drives notifications). Buildertrend portal (*Action Items*).
  OpenMaison already has the *Waiting on client* scope.
- **Why it works:** A status like "Sent" makes the reader work out who acts next. "Waiting on Sophia" or "Waiting on you" answers it.
  It also makes the two to-do lists (studio, client) the same data seen from two sides.
- **OpenMaison:** Give every record that passes between studio and client a *with* field: VOs, choices, invoices, payments to confirm,
  updates, tickets, share requests, handover. Read that field in three places:
  - the project's P1 list;
  - the listing's two scopes;
  - the portal's "What we need from you" (P11).
- **Caveat:** Keep the status words as they are and add the "with" line beside them, so the register's vocabulary stays.

### P3 · Many tools, few headings
- **Who:** Buildertrend (about 20 job tools under 5 menus). Houzz Pro (project menu grouped: *Planning* …). Procore (one Tools menu with
  favourites). Design-system guidance for tabs: Red Hat caps them at about 3–4 ([Red Hat](https://ux.redhat.com/elements/tabs/guidelines/)),
  JetBrains moves to a sidebar from 7 ([Ring UI](https://www.jetbrains.com/help/ring-ui/tab-bar.html)), and Apple's iPhone tab bar shows
  five at most.
- **Why it works:** Chunking. People choose quickly among about five groups, and then among the two to four items inside one. A flat
  strip of 14 has to be scanned from left to right every time (Hick–Hyman), and on a phone most of it is off-screen.
- **OpenMaison:** 14 tabs → **about 6 areas**, by job:
  - **Overview**;
  - **Plan**: Schedule · Tasks · Compliance;
  - **Client**: Updates · Choices · Designs (Floor plan, 3D layouts) · Messages (with Tickets);
  - **Money**;
  - **Files**: Files · Notes & Logs · Questionnaire;
  - **Activity**.

  Every feature stays; only the first level shrinks. The second level inside an area uses the house `Chips` or `Tabs`.
- **Caveat:** Tasks moved to second place by the owner's pick (parity P-06). Whether it heads *Plan* or keeps its own tab is a question
  for Vicky. Avoid two full tab strips stacked on top of each other.

### P4 · A tool you don't use is not there
- **Who:**
  - Procore: admins turn project tools on or off, and the data stays.
  - Houzz Pro: the client dashboard shows only shared sections, and Overview tiles can be switched on or off.
  - Procore iOS: "hide other tools".
  - Houzz Pro reviewer: "I wish I could hide some features I do not use".
- **Why it works:** Every visible tab costs attention even when it is empty. A studio that never does floor-plan mark-up or tickets
  should not scan past them on every project.
- **OpenMaison:** Settings › Projects gets a "Modules this studio uses" list (Floor plan · Tickets · Compliance · Questionnaire · 3D),
  following the pattern of the portal's six section switches. On top of that, sub-sections appear by **stage**: Getting started only
  while setting up, Handover near the end, Closing summary once completed. A module with no records shows as a quiet "Start …" row
  inside its area, not as a tab.
- **Caveat:** The repo's rule is "never a coming-soon tab" (`tabs.ts`). This fits it: off means absent.

### P5 · One list, several views, opened on the view that needs action
- **Who:**
  - Houzz Pro's Project Tracker: one table of every item, with *Financials* and *Procurement* preset views and statuses that update
    themselves.
  - Programa's schedule: *summary · financial · detailed* views of one table.
  - JobTread's budget, with committed costs as a column.
  - Xero: bills by **status** (Draft · Awaiting approval · Awaiting payment · Paid), and its dashboard deep-links to *Awaiting payment*.
  - Monograph's client view: Paid · Past due · Open.
- **Why it works:** The reader learns one list's columns once. A new type of document becomes a filter, not a new place to learn.
  Status buckets put "what to do" ahead of "what kind of paper it is". Xero's own users ask to land on *Awaiting payment*, not *All*.
- **OpenMaison:** On the project, Money's four tables (Payment schedule · Variation orders · Other invoices · Invoices sent) and the
  Costs half become **one money list**. It has view chips (Schedule · Variations · Invoices · Costs) and status buckets (To send · To
  confirm · Overdue · Paid). In Company › Finance, **Purchase orders · Bills · Expenses · Payments out** become one **Money out** list with
  type chips and buckets **To approve · To pay · Paid**. It lands on *To approve* for approvers and *To pay* for Owners and Admins.
- **Caveat:** Each type keeps its own dialog and paper. Only the browsing merges.

### P6 · Enter once, convert forward, and let each line carry its status
- **Who:**
  - CoConstruct: the single-entry estimate becomes specs, selections, budget, change order and invoice.
  - Houzz Pro: *Convert to purchase orders / invoice* makes linked documents, and the tracker's status follows the item.
  - Studio Designer: items-based, "entered information only once".
  - JobTread: orders and bills from budget lines.
  - DesignFiles: quote → PO in one click.
- **Why it works:** No retyping, and no reconciling two numbers in your head. The question "where is this sofa?" has one answer, on the
  line itself. The clunky moments reviewers name are the hand-offs between documents ("transition from a proposal to an invoice is
  clunky", Houzz Pro).
- **OpenMaison:** The signed quote's lines already drive the payment schedule (`lib/projects/money.ts`, "one set of numbers"). Next:
  - raise POs and supplier bills **from the quote's lines** (Finance › Purchase orders);
  - let a declined choice or a changed line **propose the VO**;
  - give each line a small trail (chosen · ordered · billed · paid) visible on Choices and on the PO.
- **Caveat:** DesignFiles users skip POs for small items ("lightbulbs"). Keep a quick unlinked bill or expense for those.

### P7 · Money on the timeline
- **Who:**
  - Monograph's **MoneyGantt**: planned, logged and invoiced on one bar, which turns red early. Its client view has billed vs planned per
    phase.
  - ID Connect: variations linked to payment milestones.
  - Buildertrend: selection deadlines linked to schedule items.
  - Houzz Pro: job costing "against the schedule".
- **Why it works:** Studios think in milestones ("carpentry done → 30% due"). When money sits on the same line as the work that
  triggers it, nobody has to hold the mapping in memory or switch tabs to see it.
- **OpenMaison:** The data is there: `project_milestones.payment_due` ties a payment stage to a milestone's start or end, and
  `next-step.ts` already raises "Send the {stage} invoice". Draw it:
  - on **Schedule**, a payment chip on its milestone row ("Mid-project 30% · S$ 23,400 · ready to send"), and choice deadlines and
    compliance items on the rows they block;
  - on the **portal's Schedule**, the same chips (from the shared snapshot).

  Money then becomes the ledger behind the timeline.
- **Caveat:** Keep the chip read-only on the timeline. Acting on it opens the invoice, so Schedule doesn't become a second Money.

### P8 · The conversation lives on the record; chat is the last resort
- **Who:** CoConstruct ("Messages should be a LAST RESORT … keep related thoughts together"; its own example of change-order talk lost in
  Messages). Programa (time-stamped approvals on the item). Houzz Pro (comments on selection boards and files). Buildertrend (comments
  on daily logs; to-dos raised from a log).
- **Why it works:** A decision and its discussion are read together. Separate chat makes people search two places and rebuild the
  context.
- **OpenMaison:** Messages and Tickets are two tabs today. Make **a ticket a kind of thread** (a problem with a status) inside one
  Messages list, and let every thread show what it is about: a choice, a VO, an update, a file. Replies on a choice or a VO show
  on that record *and* in Messages, so Messages becomes the inbox of every thread.
- **Caveat:** The client must still be able to start a free conversation. Chat stays; it just stops being the only place.

### P9 · The client view is the studio's view with things filtered out, and you can see it as they do
- **Who:**
  - CoConstruct: "set up very similar to the builder's side", hide per item.
  - Houzz Pro: the client dashboard preview, and client access set inside each feature.
  - Buildertrend: one *Homeowners* settings section with per-job overrides.
  - Programa: toggle supplier, brand and pricing; one link.
  - Mydoma: choose what each client sees.
- **Why it works:** Designers learn one structure, not two. The question "what does the client see?" gets answered by looking (a
  preview), not by remembering which of several switches and panels applies.
- **OpenMaison:** Gather the client-facing modules under one **Client** area (P3). Give each shared item one consistent "Client sees"
  mark, and add **View as client** to the project's ⋮. That reuses Company › Client portal's *Open as a test client*. The studio
  defaults stay in Company › Client portal, and a project can override them (Buildertrend's model). The separate Client access panel
  becomes that override.
- **Caveat:** The portal reads the shared *snapshot*, not live rows. The preview must show the snapshot, or it will mislead.

### P10 · Push a digest instead of asking people to visit tabs
- **Who:** Houzz Pro's **weekly client update**, drafted from the week's schedule, documents, selections, payments, notes and logs:
  *Executive Summary · Looking Ahead · Action Items & Alerts*, edited and then published. Houzz's **Monthly Digest** across projects.
  Monograph's **Weekly Pulse**. Buildertrend's portal *Project Updates* strip.
- **Why it works:** A digest gathers what happened across six tabs into one thing to read. The designer reviews a draft instead of
  writing from a blank page. Recognising is easier than recalling.
- **OpenMaison:** "Post an update" is already the in-progress next step. Draft it **from the week's records** (schedule moves, photos in
  Site updates, choices made, invoices due, tickets closed) as plain text, like the AI-drafted schedules (no credits). The designer edits
  and publishes, and its *Action items* block is the client's P2 list. For the studio, a Monday digest in the bell ("this week: 3
  invoices to send, 2 projects at risk") links into P1 / P13.
- **Caveat:** Never send automatically. Houzz Pro's rule is "drafts are never shared automatically".

### P11 · The client sees the next thing to do, and approves and pays in one step
- **Who:** Buildertrend's portal redesign: *Action Items* first, and it "removed the remaining balance and invoice totals" for a **Next
  Invoice** callout; **Approve & Pay** on change orders; deposits in *Pay Now*. Monograph's client view: Paid · Past due · Open counts.
- **Why it works:** A homeowner doesn't reconcile a contract. They want to know what is due and what they have to decide. Totals
  invite questions; one next step gets it done.
- **OpenMaison:** The portal Home leads with **What we need from you** (choices, VO, invoice, questions) and **Next payment** (amount,
  due date, PayNow). Full totals move one level down in Money. Approving a VO goes straight to its invoice or the next payment.
- **Caveat:** CaseTrust and the Standard Renovation Contract still need the full schedule to be reachable. One level down is fine;
  gone is not.

### P12 · Costs come in through an inbox: capture first, file later
- **Who:**
  - Buildertrend's **Cost Inbox**: email, upload or snap → AI draft → set job and vendor → approve → ready for payment; drafts don't
    touch the job's numbers.
  - QuickBooks' **For review** (match / create).
  - ID Connect's supplier and sub-con invoice portal.
  - CompanyCam: photos auto-filed by project.
- **Why it works:** The person on site only has to *capture*. Coding (project, vendor, category) happens later, at a desk, by whoever
  does that work. It splits one hard form into two easy steps, done by the right people.
- **OpenMaison:** Finance gets an **Inbox** as its first view:
  - a designer snaps a receipt or forwards a vendor PDF from their phone;
  - it lands as a draft cost "for review";
  - the approver sets project, vendor and type (bill / expense) and approves;
  - it moves to *To pay* (P5).

  The vendor's no-login PO link (`/po/[token]`) could take the vendor's invoice back the same way (ID Connect's portal). The project's
  Costs half shows only filed costs.
- **Caveat:** "AI drafts" spend credits in 2.0's model. A plain photo + amount + project draft needs none; reading the document can be
  the metered press.

### P13 · Studio money = a few numbers that drill down, plus projects ranked by risk
- **Who:** Xero's dashboard (four panels; any figure drills down). Monograph (projects "ranked by budget consumption risk"; alerts).
  Houzz Pro's Financial Overview tile with *Full View*. Studio Designer's "at-a-glance firm financials".
- **Why it works:** An owner who "cares about cash and margins" needs about four answers: what's owed to us, what we owe, what's
  overdue, which jobs are losing margin. Each answer should be one tap from its records, not a tab per document type.
- **OpenMaison:** Finance's Overview becomes four tiles, using the house `StatTiles`:
  - Owed to us (overdue);
  - To pay this week;
  - To approve;
  - Projects at risk (margin, ranked).

  Each tile opens the filtered list (P5) or the project. *What the numbers say* stays in Company › Reports, per the one-home rule.
- **Caveat:** Profit and margin are Owners / Admins only (F-17 / F2-Q1). Other roles see the work tiles only.

### P14 · On the phone: snapshot + feed + one capture button
- **Who:** Buildertrend mobile (Job Summary: to-dos, upcoming schedule, recent logs, clock; Activity Feed; **+**). Houzz Pro mobile
  (project page with four icons: **+ create**, Message, Files, Schedule; dictated logs). Procore iOS (star tools, hide the rest).
  CompanyCam (photos filed by project). Counter-examples: Programa and Mydoma, criticised for mobile layouts that are cut off or clunky,
  and Monograph, with no app.
- **Why it works:** On site, a designer does three things: checks what's next, captures (photo, note, issue, receipt) and answers the
  client. A phone screen fits a summary and one button. It does not fit a 14-tab strip.
- **OpenMaison:** At ≤767 the project opens on **Today on site**: next milestones, my tasks, open tickets and the client's last message.
  One **Capture** button turns a photo into an Update draft, a Ticket, a Receipt (P12) or a Note. The areas (P3) sit in the More sheet.
  This follows the owner's mobile canvas rules (sheets, one-row toolbars).
- **Caveat:** The owner's Claude Design mobile canvas governs ≤767. This is a proposal to draw against it, not over it.

---

## 4 · Anti-patterns to avoid

1. **A landing page that only describes.** Buildertrend's old landing was abandoned within seconds. A wall of eleven status cards is the
   same thing ([Buildertrend](https://buildertrend.com/blog/summary-page-redesign/)).
2. **Modules as silos.** "Lots of features but they 'live' in different silos and one function does not communicate well with the other"
   ([Buildertrend review](https://www.capterra.com/p/70092/Buildertrend/reviews/?page=14)). Fourteen tabs that each restate part of the
   same project fall into this.
3. **One tab per document type for browsing money.** It makes people know the *kind* of paper before they can find it, which accounting
   tools avoid by filing by **status** (Xero).
4. **Lists that open on *All*.** Xero users ask to land on *Awaiting payment* and are told to bookmark it
   ([Xero ideas](https://productideas.xero.com/forums/967115-invoices-quotes/suggestions/50553492-invoice-overview-able-to-chose-default-tab-it-op)).
5. **Retyping between documents.** "The transition from a proposal to an invoice is clunky" (Houzz Pro review). Buildertrend's estimate
   tool is "way too complicated" ([review](https://www.capterra.com/p/70092/Buildertrend/reviews/?page=14)).
6. **Decisions discussed in a separate chat.** CoConstruct's own example of change-order talk "jumbled" in Messages
   ([CoConstruct](https://www.coconstruct.com/learn-construction-software/selections-management-change-orders-decisions-in-time)).
7. **Features you cannot hide.** "Sometimes I wish I could hide some features I do not use" (Houzz Pro review).
8. **Accounting depth in a designer's path.** Studio Designer's accounting was "too difficult" even for an accountant (review).
   Programa leaves the books to Xero and is praised for ease. OpenMaison already sends the books to Xero, so keep journals and ledgers
   out of the designers' screens.
9. **Too many steps to fix a money mistake.** "If you make a mistake paying a PO/Bill it takes for ever to correct" (Buildertrend
   review). Every money action needs one obvious undo, void or reverse.
10. **Totals the client cannot act on.** Buildertrend took *remaining balance* and *invoice totals* off its portal summary in favour of
    *Next Invoice*.
11. **Mobile as a shrunken desktop.** This is where Programa (cut-off pages), Mydoma ("clunky … frustrating") and Monograph (no app)
    are criticised.

---

## 5 · Top 5 recommendations for OpenMaison

1. **Make the project's first screen a to-do, not a dashboard (P1 + P2).** Lead with **Next · Waiting on us · Waiting on the client**,
   built from the registries that already exist (`next-step.ts`, `attention.ts`, `waitingOn`). Shrink the Overview's eleven cards to
   the three that inform a decision: Money, Schedule and Latest update. Everything else lives in its own area. *Evidence:* Buildertrend
   Summary, Procore Open Items, Buildertrend portal Action Items.
2. **Cut the 14 tabs to about 6 areas by job, and hide what a studio doesn't use (P3 + P4).** The areas: Overview · Plan (Schedule ·
   Tasks · Compliance) · Client (Updates · Choices · Designs · Messages incl. Tickets) · Money · Files (Files · Notes & Logs ·
   Questionnaire) · Activity. Add a "Modules this studio uses" switch-list in Settings › Projects, and let sub-sections appear by
   stage. No feature is lost. *Evidence:* Buildertrend's 5 menus, Houzz Pro's grouped project menu and tile toggles, Procore's active
   tools, tab guidance of 4–7.
3. **Hang money on one spine and browse it by status (P5 + P6 + P7).** On a project:
   - payment chips on the Schedule's milestone rows;
   - one Money list with view chips and *To send · To confirm · Overdue · Paid*;
   - POs and bills raised from the quote's lines.

   In Company › Finance, 8 tabs become **Inbox · Money out (To approve · To pay · Paid; type chips) · Vendors · Commissions**, with
   Accounting folded into Company › Integrations › Xero (where Xero already lives under the one-home rule) and an Overview of four
   drill-down tiles. *Evidence:* Monograph MoneyGantt, JobTread budget, CoConstruct single entry, Xero status tabs, Buildertrend Cost
   Inbox.
4. **One Client area that mirrors the portal, with View as client, and threads on the record (P8 + P9 + P11).**
   - Studio side: group what the client sees, give each shared item one "Client sees" mark, and offer a *View as client* preview (of
     the snapshot).
   - Tickets become a kind of thread, and Messages becomes the inbox of every thread, including those on a choice or a VO.
   - Portal side: lead with *What we need from you* + *Next payment*, and *Approve & pay* in one step.

   *Evidence:* CoConstruct, Houzz Pro preview and client access, Buildertrend portal redesign.
5. **Push instead of pull, and give the phone its own job (P10 + P12 + P14).**
   - Draft the weekly client update from the week's records. The designer edits and publishes; nothing is sent automatically.
   - Send a Monday studio digest in the bell.
   - On the phone, a project opens on **Today on site** with one **Capture** button: photo → update, ticket, receipt or note. The
     receipt lands in Finance's Inbox.

   *Evidence:* Houzz Pro weekly updates and Monthly Digest, Monograph Weekly Pulse, Buildertrend mobile Job Summary and Cost Inbox,
   Houzz Pro mobile's create menu.

**Questions these raise for Vicky** (not answered here):
- Does Tasks keep its own place (P-06) or head *Plan*?
- Is a second level inside an area chips or a slim tab row?
- Does the *Money out* merge keep separate New buttons (PO · Bill · Expense) or one New ▾?
- Is the weekly update draft deterministic (no credits) or a metered AI press?
- Should the portal's full totals stay one level down for CaseTrust?

---

## Sources

**Houzz Pro / Ivy:**
[client dashboard (help)](https://pro.houzz.com/pro-help/r/how-to-use-your-project-dashboard-for-clients) ·
[preview and share (help)](https://www.houzz.co.uk/pro-help/r/how-to-preview-and-share-the-client-dashboard) ·
[client updates (help)](https://pro.houzz.com/pro-help/r/how-to-send-client-updates) ·
[financial overview (help)](https://pro.houzz.com/pro-help/r/how-to-view-your-project-finances) ·
[document flow (help)](https://pro.houzz.com/pro-help/r/recommended-document-flow) ·
[selections tracker (help)](https://pro.houzz.com/pro-help/r/how-to-use-the-selections-tracker) ·
[project tracker (vendor)](https://pro.houzz.com/pro-learn/blog/houzz-pro-introduces-new-project-tracking-experience) ·
[navigation redesign (vendor)](https://pro.houzz.com/pro-learn/blog/inside-the-newly-renovated-houzz-pro) ·
[4 new tools (vendor)](https://pro.houzz.com/pro-learn/blog/4-new-houzz-pro-tools-to-enhance-project-management) ·
[software overload (vendor)](https://pro.houzz.co.uk/pro-learn/blog/software-overload-syndrome-financial-control) ·
[mobile (help)](https://pro.houzz.co.uk/pro-help/r/how-to-manage-projects-and-leads-on-the-mobile-app) ·
[Capterra reviews](https://www.capterra.com/p/199689/Houzz-Pro/reviews/) ·
[Ivy vs Houzz Pro](https://pro.houzz.com/for-pros/difference-between-ivy-and-houzz-pro)

**Buildertrend:**
[Summary redesign](https://buildertrend.com/blog/summary-page-redesign/) ·
[Cost Inbox](https://buildertrend.com/help-article/cost-inbox/) ·
[Interaction Standards](https://buildertrend.com/help-article/buildertrend-interaction-standards/) ·
[daily logs on mobile](https://buildertrend.com/help-article/daily-logs-on-mobile/) ·
[selections on mobile](https://buildertrend.com/help-article/selections-on-mobile/) ·
[portal release notes 1](https://buildertrend-publicroadmap.launchnotes.io/announcements/aug-12-16-buildertrend-updates) ·
[portal release notes 2](https://buildertrend-publicroadmap.launchnotes.io/board/copy-of-small-software-renovations-october) ·
[Workyard review (competitor)](https://www.workyard.com/compare/buildertrend-review) ·
[Capterra reviews](https://www.capterra.com/p/70092/Buildertrend/reviews/?page=14)

**CoConstruct:**
[ask the client](https://www.coconstruct.com/learn-construction-software/how-do-i-ask-my-client-a-question-) ·
[clients and crew](https://www.coconstruct.com/learn-construction-software-features/clients-and-crew) ·
[selections and change orders](https://www.coconstruct.com/learn-construction-software/selections-management-change-orders-decisions-in-time) ·
[changes in scope](https://www.coconstruct.com/learn-construction-software/capture-changes-in-scope-and-cost) ·
[selection software](https://www.coconstruct.com/construction-selection-software)

**Procore:**
[open items](https://support.procore.com/products/online/user-guide/project-level/home-project/tutorials/view-my-open-items-from-the-project-overview-in-the-projects-home-page) ·
[project tools on/off](https://v2.support.procore.com/en-au/product-manuals/admin-project/tutorials/add-and-remove-project-tools) ·
[iOS tool order](https://support.procore.com/procore-mobile-ios/user-guide/project-overview-screen-ios/tutorials/configure-the-tool-order-for-a-project-ios) ·
[ball in court (third party)](https://www.followupcrm.com/blog/how-to-change-ball-in-court-in-procore)

**JobTread:**
[budget and documents](https://www.jobtread.com/blog/more-robust-job-budget-and-document-builder) ·
[purchasing](https://www.jobtread.com/purchasing) ·
[G2 compare](https://www.g2.com/compare/buildertrend-vs-jobtread)

**Studio Designer:**
[for principals](https://www.studiodesigner.com/features/for-firm-principals) ·
[collaboration](https://www.studiodesigner.com/blog/collaboration-with-studio-designer) ·
[Capterra AU](https://capterra.com.au/software/217839/studio-designer) ·
[DesignFiles comparison (competitor)](https://blog.designfiles.co/studio-designer-vs-design-manager/)

**Programa:**
[client portal](https://programa.design/blog/client-portal-software-for-interior-designers) ·
[all-in-one dashboard](https://programa.design/blog/your-all-in-one-client-dashboard-managing-projects-with-ease) ·
[project management](https://programa.design/project-management-solution) ·
[Capterra](https://capterra.com/p/248518/Programa/reviews/) ·
[Xero SG](https://apps.xero.com/sg/app/programa)

**Mydoma:**
[help centre](https://help.mydomastudio.com/en/) ·
[Capterra](https://capterra.com/p/155585/Mydoma-Studio/) ·
[Software Advice](https://softwareadvice.com/project-management/mydoma-studio-profile)

**DesignFiles:**
[procurement](https://designfiles.co/features/interior-design-procurement-software/) ·
[feedback board](https://designfiles.featurebase.app/p/product-tracker-for-clients-to-see-2) ·
[Capterra](https://capterra.com/p/179202/DesignFiles/)

**Monograph:**
[project tracking](https://monograph.com/features/project-tracking) ·
[client view](https://support.monograph.com/en/articles/13179532-client-view-projects-overview-page) ·
[project financials](https://support.monograph.com/en/articles/5625088-how-to-use-the-project-financials-report) ·
[Cloudwards review](https://www.cloudwards.net/monograph-review/)

**Xero · Harvest · QuickBooks:**
[Xero dashboard](https://www.xero.com/accounting-software/dashboard) ·
[Xero default-tab idea](https://productideas.xero.com/forums/967115-invoices-quotes/suggestions/50553492-invoice-overview-able-to-chose-default-tab-it-op) ·
[Harvest invoices](https://www.getharvest.com/blog/2009/02/invoice-updates-payment-received-report-improved-dashboard-and-draft-invoices) ·
[Harvest budget bars](https://www.getharvest.com/blog/2015/10/share-a-projects-budget-progress-with-your-team) ·
[QuickBooks receipts](https://quickbooks.intuit.com/learn-support/en-us/help-article/import-transactions/upload-receipts-bills-quickbooks-online/L862MmZHn_US_en_US)

**Singapore:**
[ID Connect](https://www.idconnect.com.sg/) ·
[ID Connect, interior design firms](https://www.idconnect.com.sg/?p=90) ·
[Qanvast app](https://apps.apple.com/app/id785269548) ·
[Renopedia](https://www.redbrick.sg/blog/conversations-james-soh-renopedia/) ·
[CaseTrust renovation scheme](https://www.case.org.sg/casetrust/accreditation-schemes-gold-for-renovation) ·
[2026 SGMC 71](https://www.elitigation.sg/gd/s/2026_SGMC_71)

**Tabs and field capture:**
[Red Hat tabs](https://ux.redhat.com/elements/tabs/guidelines/) ·
[JetBrains tab bar](https://www.jetbrains.com/help/ring-ui/tab-bar.html) ·
[CompanyCam](https://apps.apple.com/app/id960043499)
