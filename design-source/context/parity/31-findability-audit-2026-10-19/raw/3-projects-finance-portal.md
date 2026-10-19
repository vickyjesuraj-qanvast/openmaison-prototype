# Navigation audit 3: Projects, Finance, Messages, Escalations and the client pages

Read on 2026-10-19. 1.0 was read through git only: `origin/deployment/qanvast` (q), `origin/deployment/plg` (plg) and `origin/urbanhomedemo` (uhd).
In my area plg and uhd match q, with one exception: uhd's rail has **Contractors**. 1.0 paths are under `src/app/`; `(main)` is the studio app.
I checked every 2.0 claim in code. For ⌘K, I ran `pageHits` and `createHits` from `lib/global-search/model.ts` in a read-only `tsx` script, as
an Owner unless noted. ⌘K shows **4** page rows under All (`components/shell/global-search.tsx:189`).

1.0's doors into my area: the sidebar (`components/layout/app-sidebar.tsx:196-202` and the Finance flyout `:32-36`), the phone's More sheet
(`bottom-nav.tsx:28-47`), the G-then keys (`lib/keyboard-shortcuts.ts` `NAV_SEQUENCES`: D L I P T E F), the top bar's + menu
(`layout/quick-action-menu.tsx:18-24`), and bell links (`lib/notifications/resolve-recipients.ts:34-39`).

## Inventory

| # | 1.0 entry (as a user sees it) | 1.0 route · file · branch | 2.0 home · URL | Status | Can a 1.0 user find it? (door · ⌘K by the 1.0 word · old URL) | Record |
|---|---|---|---|---|---|---|
| 1 | Sidebar › **Chats** (unread badge); phone dock › Chats | `/inbox` · `(main)/inbox/page.tsx` · q plg uhd | Rail › **Messages** · `/chat`; phone top bar | RENAMED | Door: rail item with a badge. ⌘K "chats" and "inbox" → Messages ✓. `/inbox` → proxy ✓. **G then I does nothing** (it is now G then M) | REG-1319, REG-1373, REG-1830 |
| 2 | Chats › New conversation · Unread filter | `inbox/page.tsx:249,283` | Messages › New message ▾ · Show: Unread | SAME | ✓ | S26 (REG-1939…) |
| 3 | Chats › **Escalations** filter | `inbox/page.tsx:294` | none (Messages shows All · Unread · Clients · Team, `lib/projects/messages-model.ts:65`) | LEFT OUT | Part of Escalations. See row 5 | H-Q2 |
| 4 | Chat header › **Call** (tel: link) | `components/inbox/conversation-header.tsx:157,216` | Not in Messages. Open project › info column › phone | PARTIAL | Two steps away, and no hint in the conversation | UC-072 (map 28, "moved", no decision) |
| 5 | Sidebar › **Escalations** (badge); phone More › Escalations; **G then E**; + menu › **Log Ticket** | `/escalations` · `(main)/escalations/page.tsx` · q | Projects › ⋮ › **Tickets** · `/projects/tickets` (each project: Client › Tickets) | MOVED + RENAMED (already known) | Door: Projects ⋮ only, hidden on the first-run listing. ⌘K "escalations" / "tickets" → no page. `/escalations` → redirect ✓. **G then E → nothing.** No ⌘K Create row for a ticket | REG-1315, H-Q2 |
| 6 | Escalations › New ticket · a ticket | `/escalations/new`, `/escalations/[ticketId]` | Project › Client › Tickets › New ticket · the ticket drawer | MOVED | Old URLs: `/escalations/new` → `/projects/tickets`; `[ticket]` route → the ticket ✓ | REG-1313, REG-1314 |
| 7 | Sidebar › Finance › **Operations** | `/finance/operations` · `(main)/finance/operations/page.tsx` | Company › *Operations* › **Finance** · `/company/finance` (lands on To do) | MOVED | Door: the Company panel's "Operations" group. ⌘K "finance" ✓, **"operations" → nothing**. Route ✓ (`app/finance/operations`). G then F ✓ | REG-1360, REG-1484 |
| 8 | Operations › Overview (working capital, the money to verify, PO approvals, recent activity) | `operations/page.tsx:307` | Finance › **To do** (To approve · To pay · To collect · Stuck · Recently) | CHANGED | ⌘K "to do", "overview" ✓ | REG-1484, MO-084 (P-B) |
| 9 | Operations › Contracts › **Quotes** | `operations/page.tsx:635` | Tools › Quotes · `/quotes` | MOVED | ⌘K "quotes" ✓. Finance has no link to it | REG-422 (FB-011) |
| 10 | Operations › Contracts › **Variation Orders** | `operations/page.tsx:636` | Finance › Money in › Variation orders · `?kind=variations` | MOVED | ⌘K "variation orders" ✓; "vos", "contract/vo" → nothing | FB-012 (P-A) |
| 11 | Operations › **Invoices** | `operations/page.tsx:309` | Finance › **Money in** › Invoices | MOVED | ⌘K "invoices" / "invoice" **never shows Money in to an Owner** (finding P-2) | FB-013 (P-A) |
| 12 | Operations › **Receipts** | `operations/page.tsx:312` | Money in › Payments | RENAMED | ⌘K "receipts" → Money in ✓ | FB-016 (P-A) |
| 13 | Operations › Purchases (POs · Bills) · Expenses | `operations/page.tsx:310-311` | Finance › Money out › Purchase orders · Bills · Expenses · Paid | MOVED | ⌘K "purchase orders", "bills", "expenses" ✓; "pos" → nothing useful | REG-1486 |
| 14 | Operations › entity picker | `operations/page.tsx` (`listOpts`) | Money in / out › Issued by (only with 2+ entities) | SAME | ✓ | FB-105 (P-B) |
| 15 | Sidebar › Finance › **Pipeline** › Quote-to-Cash (projects by Quote Sent · Deposit · In Progress · Final Payment · Closed) | `/finance/pipeline` · `pipeline/page.tsx:24-29,172` | Company › Reports › Finance › **Profitability** | PARTIAL: no stage buckets | ⌘K "pipeline" ✓ (third row); "quote-to-cash" → nothing. Old URL → Profitability ✓ | REG-1362, REG-1376 (N-01) |
| 16 | Pipeline › PO Pipeline | `pipeline/page.tsx:383` | Money out › Purchase orders (Status pill) | LEFT OUT (recorded) | — | REG-1362, FB-025 |
| 17 | Sidebar › Finance › **Commissions** (+ Add rule · Pay Out) | `/finance/commissions` · `commissions/page.tsx` | Company › Finance › **Commission** ("My commission" for members); rules in Settings › Finance › Commission | MOVED | ⌘K "commission(s)" ✓; "my commission" → Your PayNow. Old URL ✓ | REG-1360, F2-Q1, FB-058 |
| 18 | Sidebar › Finance › **Reports**: P&L · GST · AR Aging · AP Aging · Profitability · Cash Flow · Vendor Spend · Commissions · Statement · Revenue · Expenses · Comparative | `/finance/reports` · `reports/page.tsx:50-61` | Company › Reports › **Finance** (10 reports, `lib/finance/reports.ts:25-36`) | MOVED | ⌘K "reports", "p&l", "aging", "cash flow", "statement" → Finance reports ✓. Old URL ✓ | REG-1361, F2-Q12 |
| 19 | Reports › AR Aging · AP Aging · Statement · P&L | same | Owed to you · You owe · Client statement · Profit and loss | RENAMED | Each report's help line names it | F2-Q12, REG-1489 |
| 20 | Reports › GST | same | Reports › Finance › GST | SAME | ⌘K "gst" → the Settings rate, not the report | FB-065 (P-C) |
| 21 | Reports › Revenue | same | Cash flow ("against the same month last year") | MERGED | ⌘K "revenue" → **Sales report** (leads), the wrong place | REG-1307, P-C |
| 22 | Reports › Comparative | same | Profitability (by type, designer, budget) | PARTIAL | ⌘K "comparative" → nothing | REG-1307, FB-077 |
| 23 | Sidebar › Finance › **Vendors** (All · Suppliers · Brands · Inactive) | `/finance/vendors` · `vendors/page.tsx:48-51` | Company › Finance › Vendors (no Suppliers / Brands kind) | MOVED | ⌘K "vendors" ✓. Old URL (+ `?vendorId=`) ✓ | REG-1360, F1-Q4 |
| 24 | Invoice / PO / VO preview pages | `/finance/{invoices,pos,vos}/[id]/preview` | the invoice's paper on its project; the PO paper; the VO's quote Preview | MOVED | Old URLs → routes ✓ | FB-021, FB-022 |
| 25 | Tools › **Homeowner Portal** (URL card, Project Links, Branding, Scope, Voice) | `/tools/homeowner-portal` · `(main)/tools/homeowner-portal/page.tsx` | Company › **Client portal** (Set-up · Clients); the brand kit; Company › Questionnaire | MOVED | ⌘K "homeowner portal" ✓; "scope" → nothing; the Client portal page doesn't link to Questionnaire. Old URL ✓ | Q-44, FR-112, CP-113 |
| 26 | **uhd only**: Sidebar › **Contractors** (By site · By contractor); home widget | `/contractors` · `(main)/contractors/page.tsx` · uhd | Projects › Workload › Contractors · `/projects?view=workload&of=contractors` | MOVED | ⌘K "contractors" ✓; Dashboard tile ✓. **`/contractors` → page not found** (finding P-4) | S45B outcome §3 |
| 27 | Projects › Table / Workload toggle (Owner) | `(main)/projects/page.tsx:127,295-305` | Projects toolbar view switch (Owners, Admins, Managers) | SAME | ⌘K "workload" ✓ | REG-1329 |
| 28 | Projects › **New Project**; `/projects/new`; + menu › New Project | `projects/page.tsx:307`; `(main)/projects/new` | Projects › New project · `/projects?new=1` | SAME | C key; ⌘K Create ✓; old URL ✓ | REG-927 |
| 29 | Projects › KPI strip (Active · Pipeline · Avg. Health · At Risk) | `projects/page.tsx:315-345` | Tiles (In progress · Needs attention · …) + Contract value | CHANGED (health dropped) | — | Q-07, REG-914 |
| 30 | Projects › stage chips All · Draft · Active · Closed | `projects/page.tsx:350-375` | the scope pill (Open · All · Mine · Setting up · In progress · Completed …) | CHANGED | — | Q-03, REG-924 |
| 31 | Projects › **Archived** chip + Unarchive | `projects/page.tsx:123,376-388,420-460` | none (Completed scope; ⋮ › Deleted Projects) | LEFT OUT | ⌘K "archived", "deleted projects" → nothing | Q-25, REG-1019 |
| 32 | Project header › **Invite to Portal** | `(main)/projects/[projectId]/page.tsx:1714` | Project ⋮ › Invite to Portal (panel) | MOVED | ✓ | REG-966, REG-1375 |
| 33 | Project header › **Photo Renders** | `[projectId]/page.tsx:1733` | Create strip › AI Visualizer | RENAMED + MOVED | ⌘K "renders", "photo renders" → nothing | P-03 |
| 34 | Project header › **Plan the Space (3D)** | `[projectId]/page.tsx:1749` | Create strip › 3D Space Planner | RENAMED | ⌘K "3d" ✓ | J-Q3 |
| 35 | Project header › **Preview as Homeowner** | `[projectId]/page.tsx:1774,1807` | ⋮ › Invite to Portal › "See it as {first name}" | MOVED, two levels down | ⌘K "preview" → nothing (finding P-6) | REG-966 (PR-075) |
| 36 | Project ⋯ › **Close project**; Milestones › Wrap up this project | `[projectId]/page.tsx:1815,2967` | Stage ▾ › Completed (Complete handover); Needs you near the end | MOVED + RENAMED | ⋮ now offers Delete but not Complete. ⌘K "close project" → nothing (finding P-5) | Q-24, REG-1019, P-08 |
| 37 | Project ⋯ › Delete project | `[projectId]/page.tsx:1818` | ⋮ › Delete; ⋮ › Deleted Projects on the listing | SAME | ✓ | REG-1019 |
| 38 | Tab **Overview** (Financial Summary · Project Info · Team · Customer · Property · Key Files · Notes · Progress Updates · Activity) | `[projectId]/page.tsx:1883,1950` | Overview + the info column; Updates → Client › Updates; Notes → Files & notes › Notes & Logs; Renders → Design › Designs | CHANGED | Overview's Recent activity › View all ✓ | REG-1450, PR-106…PR-114 |
| 39 | Overview › Meeting Summary | `[projectId]/page.tsx` | Client › Meetings | MOVED | ✓ | S23 (REG-1855…) |
| 40 | Tab **Management** › **Milestones** (Gantt, cog › templates) | `?tab=management&sub=milestones` · `:2620` | **Schedule** tab | MOVED | Old URL → Schedule ✓ | REG-934, REG-1460 |
| 41 | Management › **Tasks** | `:2621` | **Tasks** › All tasks | MOVED | ✓ | P-06 |
| 42 | Management › **Materials** (the selection board) | `:2622,2939` | **Design** › **Choices** | MOVED + RENAMED | Old URL → Choices ✓. ⌘K "materials" → Company › Materials (a different library); "selections", "choices" → nothing | Q-18, REG-972, REG-1460 |
| 43 | Management › **Floor Plan** | `:2623,2949` | Design › Floor plan | MOVED | Old URL ✓ | REG-1460 |
| 44 | Tab **Finance** › Overview · Contract/VO · Invoices · POs · Expenses · Bills | `?tab=finance&sub=` · `:1885,3416-3421` | **Money** (one page: Needs you · Billing · Costs with Kind chips) | RENAMED + CHANGED | Old URL → Money ✓ | F-01, REG-1470 |
| 45 | Finance › Income ▾ · Expense ▾ | `:3289-3360` | Money › New ▾ (one-off invoice, VO, PO, bill, expense …) | CHANGED | ✓ | REG-1470 |
| 46 | Finance › **Record Payment** (always on the toolbar) | `:3372` | "Record a payment" on an invoice's row, panel, page and its Needs you row; vendors under Costs | CHANGED | Not a standing button any more. ⌘K "record payment" → nothing | MI-072, F-10 |
| 47 | Finance › AI Insights (margin scan) | `:3383` | Needs you insight rows (Owners and Admins) | CHANGED | — | F2-Q3, REG-1297 |
| 48 | Finance › Contract/VO › the project's quotes; Upload Quote | `:3417` | the lead's Quotes tab; info column › Project info; Create Quote › Upload a quote | MOVED | ⋮ › Open the signed quote ✓ | Q-01 (MI-126, MI-127) |
| 49 | Tab **Files & Docs** (folders All · Contract/VO · Floor Plans · Renders · Quotes & BOQ · Site Photos · Variation Orders · From Qanvast) | `:386-395,1886` | **Files & notes** › Files (starter folders, `lib/leads/file-model.ts:107`) | RENAMED | "From Qanvast" has no folder; in 1.0 it was declared but nothing filled it (unsure) | REG-1235 |
| 50 | Tab **Activity** | `:1887` | Files & notes › Activity; Overview › Recent activity | MOVED | View all door ✓ | Q-02, REG-1445 |
| 51 | Phone › floating Post update · Log expense | `components/projects/project-fabs.tsx` | Site bar: Photos · Done · Note · Message (no expense) | CHANGED | Expense only via Money › New ▾ | REG-1468 (PR-115) |
| 52 | Client: `/my` · `/my/login` · `/my/[studioSlug]` · `…/login` | `app/my/**` | `/my/<address>` · `/my/<address>/login` | SAME | Old URLs → routes ✓ | Q-37, REG-1686 |
| 53 | Client portal › **Overview** (Your to-dos · Progress · Project Details · Contact Studio · Updates) | `my/projects/[projectId]/page.tsx:104,345-556` | **Home** (What needs you) · Schedule · Updates; to-dos dropped | RENAMED | `?tab=overview` → Home ✓ | M-03, REG-963 |
| 54 | Portal › **Design** › Renders · Selections · Floor Plan | `:82-84,105` | **Designs** · **Choices** · **Floor plan** (in More on a phone) | RENAMED | `?tab=` mapping ✓ (`OLD_PORTAL_TABS`) | REG-972, REG-1285 |
| 55 | Portal › **Finance** (payment details, invoices, VOs to approve, the quote) | `:106,650-1247` | **Money**; a VO to approve is a Home need ("Approve a change to your contract") | RENAMED + MOVED | ✓ | REG-1042, `lib/portal/needs.ts:102` |
| 56 | Portal › **Documents** | `:107,1248` | **Files** | RENAMED | ✓ | REG-1250 |
| 57 | Portal › **Support** › Chat · **Raise a Support Ticket** | `:91-92,108` | **Messages** · **Issues** | RENAMED | `?tab=support` → Issues ✓ | REG-1317, REG-1318 |
| 58 | Portal › About · Team | `my/[studioSlug]/about`, `/team` | `/my/<address>/about` (Our team inside) | MERGED | `/team` → About ✓ | REG-1686 |
| 59 | Personal portal link `/my/[slug]/p/[token]`; `/pay/[token]` | `app/my/[studioSlug]/p/…`, `app/pay/[token]` | sign-in, then Home | LEFT OUT | Routes land ✓ | Q-37 (CP-047, CP-123) |
| 60 | `/my/engagement/[linkId]` · `/my/projects/[id]` · `/my/[slug]/projects/[id]` | `app/my/**` | the portal, on the section `?tab=` names | MOVED | Routes ✓ | Q-40, REG-1686 |
| 61 | `/my/[slug]/preview/[view]` (portal layouts) | same | `/company/portal` | LEFT OUT | Redirect ✓ | Q-39 |
| 62 | `/pay/inv/[token]` (invoice + pay by card) · `/pay/receipt/[token]` | `app/pay/inv`, `app/pay/receipt` | `/invoice/<token>` · `/receipt/<token>` (bank / PayNow, no card) | MOVED | Routes ✓ | REG-1189, F-15 |
| 63 | `/po/[token]` (vendor's PO + Export CSV) | `app/po/[token]` | `/po/<token>` (Download CSV) | SAME | ✓ | MO-027 (P-B) |
| 64 | `/floor-plan/view/[token]` (3D planner share) | `app/floor-plan/view/[token]` | `/space/<token>` | MOVED | Route ✓ | REG-1355 |
| 65 | `/sign/[token]` | `app/sign/[token]` | `/sign/<token>` | SAME | ✓ | S03 (REG-1691…) |
| 66 | **`/sign/document/[token]`** (the client signs any lead file) | `app/sign/document/[token]/page.tsx` · **q only** | **none** | **MISSING** | **Page not found** (finding P-1) | FROM-1.0-TO-2.0.md §9 #3 (open) |
| 67 | `/sign/quote-xray/[token]` | `app/sign/quote-xray/[token]` | the studio's notice | LEFT OUT | Route ✓ | X-Ray audit |
| 68 | `/quote/[token]` · `/quote-preview/[token]` | `app/quote`, `app/quote-preview` | `/quote/<token>` (view only) | SAME / MOVED | ✓ | REG-1684, REG-1686 |
| 69 | `/renders/[token]` | `app/renders/[token]` | `/renders/<token>` | SAME | ✓ | REG-676 |
| 70 | `/copilot/share/[shareId]` · `/hangouts/[eventId]` | `app/copilot/share`, `app/hangouts` | `/meeting/<token>` · `/hangout/<token>` | MOVED | Routes ✓ | REG-1866, REG-1978 |

## Findings

### P-1 · 1.0's "sign this file" links land on page not found
- **Kind:** Missing
- **1.0:** On q, a studio member pressed *Request signature* on a lead file
  (`components/leads/drawer-sections/document-signing-controls.tsx:139`). The client got a WhatsApp link to
  `src/app/sign/document/[token]/page.tsx`: an OTP, then the signed copy with a certificate page.
- **2.0:** No route. `app/sign/[id]/` has only `(sign)`, `quote` and `file`, so `/sign/document/<token>` matches nothing. `grep -rn
  "sign/document" app lib proxy.ts next.config.ts` finds nothing, and `lib/links/old-addresses.ts` has no row for it.
  FROM-1.0-TO-2.0.md §9 #3 names it as an open question for Vicky. The studio's door is also gone: the s41b sweep says "no door from
  Files, images not signable".
- **Why it matters:** A client opening a link the studio already sent sees "page not found". It doesn't say the document moved or who
  to call.
- **Recommendation:** Settle §9 #3: land the old link on the studio's notice, as `/sign/quote-xray/<token>` does. Then decide whether
  Files needs *Send to sign*. Both are visible, so both are Vicky's lane.
- **Size:** S for the landing; M for the Files door.

### P-2 · ⌘K "invoices" never shows the studio's invoices list to an Owner
- **Kind:** Hard to find
- **1.0:** Finance › Operations › **Invoices** tab (`(main)/finance/operations/page.tsx:309`). Its bell links, such as an invoice
  notice, went to `/finance/operations` (`lib/notifications/resolve-recipients.ts:34`).
- **2.0:** The list is Company › Finance › **Money in** (`lib/global-search/model.ts:277` carries the word "invoices"). ⌘K shows 4
  page rows (`components/shell/global-search.tsx:189`). Money in ties at the lowest rank, and every page above it in `PAGES` order wins
  the tie. For an Owner, "invoices" → Invoices (Settings) · Plan & AI credits · Set up your studio · Plan & billing. "invoice" → no
  Money in for an Owner or a member either. Only Accounting sees it.
- **Why it matters:** An Owner looking for "the invoices" is sent to settings and the AI-credit billing. The studio's invoice list
  never appears.
- **Recommendation:** Let Money in win "invoice(s)". For example, name invoices in its title line or rank Company › Finance pages
  above Plan and Settings on a tie. The results are visible, so this is Vicky's lane.
- **Size:** S

### P-3 · ⌘K doesn't know 1.0's names for these places
- **Kind:** Hard to find
- **1.0:** These words are on the screen: Operations (`app-sidebar.tsx:32`), Close project (`[projectId]/page.tsx:1815`), Preview as
  Homeowner (`:1774`), Photo Renders (`:1733`), Materials (`:2622`), Archived (`projects/page.tsx:376`), Record Payment
  (`[projectId]/page.tsx:3372`), Contract/VO (`:3417`), Quote-to-Cash (`pipeline/page.tsx:172`), Revenue · Comparative
  (`reports/page.tsx:59,61`) and Raise a Support Ticket (portal, `my/projects/[projectId]/page.tsx:91`).
- **2.0:** These ⌘K searches return **no page**: operations, close project, closure, preview as homeowner, photo renders, renders,
  selections, choices, archived, deleted projects, record payment, vos, contract/vo, quote-to-cash, comparative, support ticket and
  issues. These return the **wrong page**: "materials" → Company › Materials (the AI Visualizer's finishes, not a project's choices),
  "revenue" → the Sales report (leads), "my commission" → Your PayNow and "gst" → the Settings rate. Escalations and tickets are already
  known.
- **Why it matters:** A 1.0 user types the word they know. Silence, or a different page, reads as "2.0 doesn't have it".
- **Recommendation:** Add 1.0's words to the `words` of the matching `PAGES` rows, and add rows for *Deleted Projects* and *Tickets*.
  A word for one project's tab, such as Close project or Choices, can say "open a project › Stage ▾". The results are visible, so this
  is Vicky's lane.
- **Size:** S

### P-4 · UHD's Contractors address lands on page not found
- **Kind:** Hard to find
- **1.0:** On uhd, the rail and the phone's More had **Contractors** (`components/layout/app-sidebar.tsx:178`, `bottom-nav.tsx:45`).
  The home's "Open contractor dashboard" widget also linked to it (`components/dashboard/home-widgets.tsx:419`). It served
  `src/app/(main)/contractors/page.tsx` (By site · By contractor).
- **2.0:** Built as Projects › Workload › Contractors (`/projects?view=workload&of=contractors`, S45B outcome §3: "not a new page / rail
  item"). ⌘K "contractors" and the Dashboard tile find it. But `lib/links/old-addresses.ts` has no `/contractors` row and there is no
  `app/contractors`, so the old address is a 404.
- **Why it matters:** UHD's team bookmarked a rail page. The bookmark now says "page not found", with no hint that it moved under
  Projects.
- **Recommendation:** Add `{ from: '/contractors', to: '/projects?view=workload&of=contractors' }`, keeping its refusal for roles
  that don't see contractors. Vicky approves the landing; a developer can wire it.
- **Size:** S

### P-5 · "Close project" is gone from the menu where 1.0 kept it, beside Delete
- **Kind:** Hard to find
- **1.0:** Project ⋯ › **Close project**, just above Delete project (`[projectId]/page.tsx:1815-1820`). There was also a *Wrap up
  this project* card under Milestones (`:2967`).
- **2.0:** `components/projects/project-menu.tsx:56-77` has Edit details · record links · Invite to Portal · Commission · Duplicate ·
  Copy Link · **Delete**. The stage rows moved to Stage ▾ (P-08). Closing is Stage ▾ › **Completed** (`stage-menu.tsx:78`, *Complete
  handover*). The header's filled button and the Needs you row appear only when `nearHandover` is true
  (`lib/projects/handover-model.ts:265`). ⌘K "close project" finds nothing.
- **Why it matters:** An Owner tidying up an old project opens ⋮ out of habit. The only ending there is Delete.
- **Recommendation:** Give ⋮ a *Complete handover* row that opens the same sheet, or a help line under Delete naming Stage ▾, plus the
  ⌘K words. This is Vicky's lane, and it reverses part of her P-08 pick, so it needs her call.
- **Size:** S

### P-6 · Preview as Homeowner now sits behind "Invite to Portal"
- **Kind:** Hard to find
- **1.0:** A header button, *Preview as Homeowner* (desktop), also in the phone's ⋯ (`[projectId]/page.tsx:1774,1807`).
- **2.0:** ⋮ › **Invite to Portal** opens the panel. *See it as {first name}* is a button inside it
  (`components/portal/client-access-panel.tsx:150,172`). Company › Client portal › Clients › row ⋮ has it too. ⌘K "preview" finds
  nothing.
- **Why it matters:** A studio member checking what the client sees won't guess that it's under "Invite". The row's name promises
  something else.
- **Recommendation:** Name it in the ⋮ row's help line ("Invite, or see it as {client}"), or give it its own row, and add ⌘K words.
  This is Vicky's lane.
- **Size:** S

### P-7 · You can't call the client from a conversation any more
- **Kind:** Partial
- **1.0:** The chat header had the client's phone as a tel: link (`components/inbox/conversation-header.tsx:157,216`).
- **2.0:** The conversation header (`components/projects/messages/conversation.tsx` ~255-280) has Search, People and files, and ⋮
  (Pin · Mute · Copy link). `grep -rn "tel:" components/projects/messages` finds nothing. Map 28 row UC-072 calls it "moved" to the
  project's info column, with no decision cited.
- **Why it matters:** A designer reading a client's urgent message has to open the project to find the number.
- **Recommendation:** Decide whether *People and files* shows the client's phone (the info column's Copy / Call), or record the move.
  This is Vicky's lane.
- **Size:** S

Not raised as findings, because each is recorded as her call: Pipeline's collection stages (REG-1362), Archived (Q-25), the phone's Log
expense (REG-1468), portal to-dos (M-03), pay by card (F-15), G then I → G then M (REG-1830). Escalations is in rows 3, 5 and 6 only.
