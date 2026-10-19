# Area 2 · Leads, Tasks, Settings, Accounts Setup, Qanvast Ops — what a 1.0 user can't find in 2.0

Read 2026-10-19. 1.0 was read through git only: Q = `origin/deployment/qanvast`, P = `origin/deployment/plg`, U = `origin/urbanhomedemo`.
1.0 paths are under `src/`, with `(main)` left out (`leads/page.tsx` = `src/app/(main)/leads/page.tsx`). D = `components/leads/lead-detail-drawer.tsx`.
Every 2.0 claim was checked in the 2.0 code. "⌘K" means 2.0's search, run on 1.0's own words through `pageHits` in
`lib/global-search/model.ts` (Owner view). "Redirect" means `lib/links/old-addresses.ts` and the proxy.
Records: A01 = `design-source/context/parity/01-leads-…-audit-2026-09-24.md`, A11 = `…/11-accounts-setup-…-audit-2026-09-25.md`,
M02 = `…/02-leads-migration-map-2026-09-24.md`, SW = `…/30-pending-modules-build-2026-10-11/s41b/sweep-pages.md`,
SWD = `…/s41b/sweep-data.md`, FROM = `FROM-1.0-TO-2.0.md`.

## Inventory

### A · The ways in (chrome)
| # | 1.0 entry | 1.0 route · file · branch | 2.0 home · URL | Status | Can a 1.0 user find it? | Record |
|---|---|---|---|---|---|---|
| A1 | Top bar › profile › Accounts Setup (Owner only) | `/accounts` · `components/layout/topbar.tsx:502` · Q, P | Rail › Settings (rules) and rail › Company (records) | MOVED (split) | Door: rail Settings + Company. ⌘K "accounts setup": nothing. `/accounts` → Company › Members | FROM §3; A11 SP-01, Q-01; REG-645 |
| A2 | Top bar › profile › Settings (personal) | `/settings` · `topbar.tsx:511` · Q | Rail foot › studio block › Your profile · `/profile` | RENAMED + MOVED | Door: studio block menu. The rail's "Settings" now opens studio rules. ⌘K "my settings" / "personal settings": nothing. `/settings` (no anchor) lands on Roles & access; `/settings#<section>` → Your profile | FROM §3; REG-1672…1681 (S01) |
| A3 | Top bar › Open / Closed to new leads (designers) | `topbar.tsx:284-335` · Q | Studio block › Open to new leads; Company › Members | MOVED | Door ✓; ⌘K "closed to new leads" ✓ | REG-1833 |
| A4 | Sidebar › Qanvast Ops ▸ Credits · Qanvast Leads · Reviews & Rankings (Owner, listed studios) | `components/layout/app-sidebar.tsx:39-46` · Q | Rail › Qanvast Ops: Leads · Studios · Lead credits · Reviews · Hangouts | SAME (re-tabbed) | Rail ✓; ⌘K "credits", "rankings" ✓, "reviews & rankings" nothing | REG-2143…2153; FROM L9 |

### B · Leads listing (`leads/page.tsx`, Q unless named)
| # | 1.0 entry | 1.0 route · file · branch | 2.0 home · URL | Status | Can a 1.0 user find it? | Record |
|---|---|---|---|---|---|---|
| B1 | Kanban view (default) · List view | `leads/page.tsx:1036-1048` | Leads › Kanban view · Table view | SAME / RENAMED | Toolbar toggle ✓ | FROM L1 |
| B2 | Performance view (Owner/Admin) | `:1050`; `components/leads/lead-performance-view.tsx` | Company › Reports › Leads (Response time) | MOVED | Door: listing header "Insights" (`app/leads/workspace.tsx:475-502`). ⌘K "performance" ✓, "response time" nothing. `/leads/insights` redirects | REG-611, REG-1361; FROM L18 |
| B3 | Insights: 7 reports (U only) | `components/leads/reports/lead-reports-container.tsx:196` · U | Reports › Leads › chip "Sales" · `?report=sales` | MOVED | Listing Insights → chips Response time · Sales (`insights-view.tsx:67`); Dashboard Sales tile; ⌘K "funnel", "sales report" ✓ | REG-2438… (S45A) |
| B4 | Search "name, area, phone, email" | `:1022`; `lib/leads/listing-display.ts:53` | Toolbar search | PARTIAL: District (`leads.area`) is not searched (`workspace.tsx:299-307`) | Same place | none found |
| B5 | Quick filters: Overdue follow-ups · Unassigned · Needs attention · Hot · On hold | `:467-475` | Filters › Quick filters (Overdue follow-ups · Unassigned · Unseen); scope pill's Needs attention group; On Hold = a stage in the pill | PARTIAL (Hot and Needs attention dropped) | Same place ✓ | A01 Q-10 (ignore); REG-608; `lib/leads/filters.ts:6` |
| B6 | Sort · Bucket · Member · Source · Date presets / From–To | `:1104-1249` | Filters (Sort · Property type · Source · Members · Date) + scope pill (stages) + head sort | SAME | ✓ | REG-608, REG-610 |
| B7 | Default "Last 30 days" window | `lib/leads/date-filter.ts:21` | — (every lead) | LEFT OUT | — | A01 Q-30 |
| B8 | Column header › Filter by status (sub-status) | `:1421-1464` | — | LEFT OUT | — | A01 Q-01 |
| B9 | Column collapse / Expand all | `:1389-1478` | Kanban collapses its Active / Inactive bands (`kanban/board.tsx:369`) | PARTIAL | ✓ | none found |
| B10 | ⋮ › Export as CSV | `:1279` | ⋮ › Export all as… ; bulk bar › Export | RENAMED | ✓ | REG-610 |
| B11 | ⋮ › Archived Leads → Revive | `:1282`; `components/accounts/archived-leads-section.tsx` | ⋮ › Deleted Leads → Restore | PARTIAL — see L-1 | ⋮ ✓ (new name). ⌘K "archived", "deleted leads": nothing | A01 DEF-03; M02 `archived_at` row; FROM §8 |
| B12 | ⋮ › Lead experience: Journey / Classic (Owner) | `:1285` | — | LEFT OUT | Old link → Settings › Lead management | A11 LM-01 |
| B13 | Header "Assign {N}" (filter-driven) + bulk dialog's Unassign | `:1300`; `components/leads/bulk-assign-dialog.tsx` | Select rows → bulk bar Assign · Export · Delete | PARTIAL (no filter-driven assign, no Unassign) | ✓ | REG-610 (round 4 "not built, by design") |
| B14 | Add Lead (+ "C") | `:1312` | Add Lead ▾ › Create New Lead (C) · `?new=1` | SAME | ✓; ⌘K "new lead" ✓ | REG-713 |
| B15 | `/leads/new` full page (Temperature, quote upload) | `leads/new/page.tsx` | Create New Lead form; a quote file = Create Quote › Upload a quote | MOVED | `/leads/new` → `/leads?new=1` | REG-2109… (S41b-2) |
| B16 | New Lead › Fill from a document · duplicate confirm | `components/leads/new-lead-drawer.tsx:388,488` | Create New Lead › Fill from a document · duplicate dialog | SAME | ✓ | A01 Q-18, Q-28; REG-609 |
| B17 | Leads Pending Review (Sync · Approve All · Merge · Keep both · Reject) | `:1510-1977` | Banner "Review imported leads (n)" → review sheet; Sync is on Company › Integrations › Email lead sources | MOVED | Banner shows only while something waits ✓ | A01 I-02; REG-609 |
| B18 | Row / card → drawer; `?leadId=` `?openLead=` `?quoteId=` | `:284-317` | `/leads/<id>`; old queries redirect | MOVED | Proxy `oldLeadsTarget` ✓ | REG-2109… |
| B19 | Journey rail on cards · "n hot" in the head | `components/leads/journey/lead-journey-mini-rail.tsx`; `:996` | — | LEFT OUT | — | A11 LM-01; A01 Q-10 |
| B20 | P / U new interface: ⋮ › Leads Settings (`/leads/settings`); Add Lead ▾ › Link to Email (`/settings?section=email`) | `components/om-leads/workspace.tsx:479,490` · P, U | ⋮ › Leads Settings; Add Lead ▾ › Link to Email | SAME door; old addresses MISSING — see L-3 | `/leads/settings` → the lead's "not found"; `?section=email` → Roles & access | none found |

### C · The lead drawer (Q)
| # | 1.0 entry | 1.0 route · file · branch | 2.0 home · URL | Status | Can a 1.0 user find it? | Record |
|---|---|---|---|---|---|---|
| C1 | Header WhatsApp icon | `D:2428-2448` | Info column › WhatsApp | MOVED | ✓ | REG-287 |
| C2 | Header mic › Start Live Meeting | `D:2452-2460` | Create strip › Meeting; Meetings tab | MOVED | ✓ | REG-1855… (S23) |
| C3 | ⋮ › Edit Lead Info | `D:2481` | ⋮ › Edit; info column pencil | SAME | ✓ | — |
| C4 | ⋮ › Archive (+ "Archive anyway?") | `D:2486-2491` | ⋮ › Delete (soft, reason, Undo) | LEFT OUT (Delete instead) | ✓ | A01 DEF-03; FROM §8 |
| C5 | ⋮ › Request Return & Refund (also the footer) | `D:2499-2510, 2727`; `components/leads/return-lead-dialog.tsx` | ⋮ › Return Lead / Appeal the return; listing row ⋮ | RENAMED | ✓; ⌘K "return lead" → Qanvast Ops | A01 Q-08, Q-44; REG-609 |
| C6 | ⋮ › Activity Log | `D:2511` | Activity tab | MOVED | ✓ | FROM L5 |
| C7 | Response time card | `D:2124`; `lead-response-time-card.tsx` | LEAD STAGES card › Response time line | MOVED | ✓ | REG-611 |
| C8 | Journey tracker, evidence, outreach attempts | `components/leads/journey/*` | Contact logs (Notes & Logs) + Move stage window | LEFT OUT (Journey); attempts → contact logs | ✓ | A11 LM-01; FROM L5 |
| C9 | Next follow-up (Tomorrow · +3d · Next week · Clear) | `D:2143-2185` | LEAD STAGES › Next follow-up + Set follow-up (a Follow-up task) | MOVED | ✓ | A01 Q-03; REG-608 |
| C10 | Move to Hold · Resume · Close lead (reasons) | `D:2256-2274`; `journey/hold-dialog.tsx`, `inactivation-dialog.tsx` | Stage ▾ › On Hold / Lost; Resume | MOVED | ✓ | A01 Q-05, Q-07; REG-607 |
| C11 | Lead Status (Classic): status, sub-status, project type, contract upload, required follow-up | `drawer-sections/bucket-status-section.tsx` | Stage ▾ → Move stage window (Won takes the type and the signed quote) | MOVED | ✓ | A01 Q-01, Q-26, Q-34 |
| C12 | Deal card + Quotes section (Create · Approve / Reject · Reopen · Resend link · Set as Primary · Rename · Clone · Create revision · Delete · Download · Beat this quote) | `quote-summary-card.tsx`, `quote-section.tsx`, `multi-quote-section.tsx` | Overview QUOTES card; Quotes tab row ⋮ (Preview and Share · Copy Link · PDF · Print · Compare · Create contract · Archive · Delete); Rename / Duplicate / Revise / approve inside the quote editor | MOVED (quotes area; no "primary" quote) | ✓ | FROM Q1–Q4; REG-624 |
| C13 | Callouts: Needs Attention · Possibly Duplicate › View Original · Project created | `D:1525-1577` | Review sheet (duplicates wait there); the brief's THE PROJECT | MOVED | ✓ | A01 I-02 |
| C14 | Meeting Intelligence · Meeting Briefs | `D:2284, 2379-2412` | Meetings tab; AI brief | MOVED | ✓ | REG-1855… |
| C15 | Assigned Designers · AI Recommendation · split % | `drawer-sections/assignment-section.tsx` | Info column Members + Assign popover "Suggested"; split on the project's commission | MOVED | ✓ | A01 Q-27; REG-612; FROM P9 |
| C16 | Contact: phone `tel:` · email `mailto:` · copy | `drawer-sections/client-info-section.tsx:204-216` | Info column: copy, WhatsApp, `tel:` on touch only; email is copy only | PARTIAL (no mailto, no desktop call) | — | none found |
| C17 | Invite to Portal (+ Show chat history) | `D:1607`; `homeowner/invite-dialog.tsx` | ⋮ › Invite to Portal → Client access panel | MOVED | ✓ | A01 Q-22; FROM §8 (chat history) |
| C18 | Project Details · Property Info · Other Info · Document Details · Custom Fields | `drawer-sections/*`, `D:1688` | Info column + Edit form | SAME | ✓ | REG-607, REG-612 |
| C19 | Homeowner Questionnaire (Fill · Ask homeowner · history) | `shared/homeowner-questionnaire.tsx` | Questionnaire tab | MOVED | ✓ | A01 Q-21, Q-22 |
| C20 | Files (upload · remove) | `drawer-sections/files-section.tsx` | Files tab | MOVED | ✓ | FROM L5 |
| C21 | Files › Request signature on any file, its ⋯ (copy link · extend · cancel · signed copy) | `drawer-sections/document-signing-controls.tsx` · Q only | Contracts › Import a PDF → Send for digital signature | PARTIAL — see L-4 | No door on the file; `/sign/document/<token>` → not found | SWD note 4; FROM §9 #3 |
| C22 | Footer readiness bar + Create Project | `D:2562-2724` | Header "Convert to Project" (the lock says why) | MOVED | ✓ | REG-469 |
| C23 | Contract & Signing dialog | `components/leads/contract-flow-dialog.tsx` | Contracts tab, contract editor | MOVED | ✓ | FROM Q10 |
| C24 | Temperature badge · country chip | `D:1494-1505` | — | LEFT OUT | — | A01 Q-10; FROM §8 |

### D · Tasks (`tasks/page.tsx`, Q)
| # | 1.0 entry | 1.0 route · file · branch | 2.0 home · URL | Status | Can a 1.0 user find it? | Record |
|---|---|---|---|---|---|---|
| D1 | + Add Task · search · My Tasks / Team Tasks | `:917, 930, 948` | `/tasks`: Create New Task ▾ · search · scope (All · My · Unassigned · Studio Tasks) | SAME | ✓ | REG-466 |
| D2 | Status chips Not Started · In Progress · Completed (+ Cancelled); row "Move to"; "Cancel task" | `:937-940, 344-394` | Filters › Status Open · Completed; row ⋮ Mark as Completed | PARTIAL | — | M-05 in `…/27-projects-gaps-build-2026-10-07.md` |
| D3 | **Approvals** chip, the yellow Approve / Reject strip, bulk "Approve N items" (Owner) | `:441-551, 941, 1128` | Each record's own bar (quote, template, price book, project); collected on Dashboard › Needs you | MOVED — see L-2 | Nothing on `/tasks` points there. ⌘K "approvals" → Settings › Projects only | FROM §8; FROM L4 |
| D4 | Filters: Due (Overdue · Today · Upcoming) · Source · Member · sort | `:979-1047` | To-do chips Overdue · Due today · Unassigned; Filters; Source Leads / Projects | SAME (no "Upcoming") | ✓ | REG-466; `lib/leads/task-filters.ts` |
| D5 | Grouped view (by project) | `:1066` | ⋮ › Group by project | MOVED | ⋮ ✓ | `…/27-…` package C |
| D6 | "Revise Quote" · "Revise Timeline" on rejected-approval tasks | `:306-314` | The quote's changes bar; the project's Needs you | MOVED | — | FROM Q2 |

### E · Personal Settings, Notifications, plg's Usage and Upgrade
| # | 1.0 entry | 1.0 route · file · branch | 2.0 home · URL | Status | Can a 1.0 user find it? | Record |
|---|---|---|---|---|---|---|
| E1 | Your Profile · My Signature | `settings/page.tsx:287, 462` | Your profile · `/profile` | MOVED | Studio block ✓; ⌘K ✓; `/settings#profile` ✓ | REG-1672… |
| E2 | Lead Preferences (designers) | `:388` | Studio block › Open to new leads; Company › Members › preferences (Your profile links there) | MOVED | ⌘K "lead preferences": nothing | REG-612, REG-1833 |
| E3 | Studio Region · Home Screen · Appearance · Theme Skins · Guided Tours | `:438, 522-670` | — | LEFT OUT (parked) | — | FROM §8; SW §8 |
| E4 | Ads & Promotions · ID Buddy AI | `:474, 501` | — | LEFT OUT (never read) | — | FROM §8; A11 ST-16 |
| E5 | Notifications › Manage | `:618` | Settings › Notifications + Your profile › Your notifications | MOVED | ✓ | REG-604; REG-1845… (S18) |
| E6 | Email Lead Sources (Connect Gmail · Sync · domains) | `:643-950` | Company › Integrations › Email lead sources (Owners, Admins) | MOVED | ⌘K ✓; `/settings#email` ✓ | A11 LM-15; REG-602, REG-646 |
| E7 | `/settings/notifications` (Owner): channels, digest, recipients, templates, customer switches | `settings/notifications/page.tsx`; `components/settings/notification-settings.tsx` | Settings › Notifications (Events and channels · Message wording · Messages to clients · Sent messages) | MOVED (per-event recipients held) | Redirect ✓; ⌘K "messages to clients", "sent messages": nothing | A01 Q-42, Q-43; REG-604 |
| E8 | P: Settings › New Interface switch | `settings/page.tsx:631` · P | — (2.0 is that interface) | LEFT OUT | — | FROM §8 |
| E9 | P: Settings › Usage & Credits card; `/settings/usage` page (credit pill, credit alerts) | `settings/usage/page.tsx`; `components/credits/credit-pill.tsx:181` · P | Company › Plan & AI credits › Usage · `/company/plan` | MOVED; old address MISSING — see L-3 | Rail credits slot ✓. ⌘K "usage" → Studio health (the other "usage"). `/settings/usage` → not found | REG-704; none found for the address |
| E10 | `/upgrade` (Q: → /settings; P: checkout hand-off) | `upgrade/page.tsx` · Q, P | Plans dialog; Plan & AI credits › Plan & billing | MOVED | Redirect ✓; ⌘K "upgrade" ✓ | FROM A3 |

### F · Accounts Setup — every tab (`/accounts?tab=<id>`, `accounts/page.tsx:79-160`, Q; P and U lack `cost-visibility` and `funnel`)
| # | 1.0 tab (group › label · id) | 2.0 home | Status | Can a 1.0 user find it? (redirect ✓ unless said) | Record |
|---|---|---|---|---|---|
| F1 | Studio › Team Members · team | Company › Members | MOVED | Company panel; ⌘K "team members" ✓ | A11 ST-01; REG-1775… (S09) |
| F2 | Studio › Legal Entities · legal-entities | Company › Profile › Issuing entities | RENAMED | ⌘K "legal entities": nothing ("entities" ✓) | A11 ST-11, Q-10; FROM Q15 |
| F3 | Studio › Roles & Permissions · roles (+ `/accounts/roles`) | Settings › Roles & access › Who may do what (read-only) | PARTIAL (editor held) | ⌘K ✓ | A11 ST-14; A01 Q-40 |
| F4 | Studio › Cost & Margin Visibility · cost-visibility (Q) | Roles & access › Who sees costs and margins | MOVED | ⌘K ✓. Redirect lands on the module, not the card (id missing from `OLD_ACCOUNTS_TABS`) | REG-2100… |
| F5 | Studio › Studio Health · usage (+ `/accounts/usage`) | Company › Reports › Studio health | MOVED | ⌘K ✓ | REG-2088… |
| F6 | Lead Mgmt › Lead Experience | — | LEFT OUT | → Lead management | A11 LM-01 |
| F7 | Lead Mgmt › Lead Funnel · funnel (Q) | Lead management › Lead stages (editing stages held) | PARTIAL | ⌘K "lead funnel" ✓ | A11 LM-05; A01 Q-02 |
| F8 | Lead Mgmt › Lead Categories | — | LEFT OUT (never read) | — | A11 LM-06, Q-17 |
| F9 | Lead Mgmt › Lead Sources · Custom Fields | Lead management › Lead sources · Custom fields | SAME | ⌘K ✓ | A11 LM-07, LM-08 |
| F10 | Lead Mgmt › Lead Webhooks | Company › Integrations › Webhooks | MOVED | ⌘K ✓ | A11 LM-09; REG-602 |
| F11 | Quotes › Quote Categories | Quotes & pricing › Trades | RENAMED | ⌘K ✓ | A11 QP-01 |
| F12 | Quotes › Document Templates | Company › Templates (+ Finance › Invoice paper, PO paper) | MOVED | ⌘K "document templates": nothing | A11 QP-03 |
| F13 | Quotes › Signing Documents | Templates › Contracts (+ PDF templates) | MOVED | ⌘K "signing documents": nothing | A11 QP-05; REG-1691… (S03) |
| F14 | Quotes › Packages · quote-templates | Company › Price book › My Sections | RENAMED | ⌘K "packages": nothing | A11 QP-06; REG-594 |
| F15 | Quotes › Quote Rules (Starter Quote) | — | LEFT OUT (held) | → My Sections | A11 QP-07 |
| F16 | Quotes › Price Book · catalogue | Company › Price book | MOVED | ⌘K ✓ | A11 QP-08 |
| F17 | Quotes › Quote Approval Rules | Quotes & pricing › Quote approval + Backup approver | PARTIAL (no thresholds) | ⌘K "quote approval rules": nothing ("quote approval" ✓) | A11 QP-09 |
| F18 | Quotes › Quote Sharing | — | LEFT OUT (never read) | — | A11 QP-10 |
| F19 | Workflow › Workflow Rules | Settings › Projects › What waits for an Owner or an Admin | PARTIAL (lead gates: no) | ⌘K "workflow": nothing | A01 Q-26 |
| F20 | Workflow › Feature Flags | CaseTrust on Profile › Registrations; rest decided | MOVED / LEFT OUT | ⌘K: nothing | SW §7; REG-2112 |
| F21 | Workflow › Proactive Alerts | Settings › Projects › Schedule › Alerts lead time. No on/off switch; I'm not sure the two extension switches have a home (extensions are now an approval) | PARTIAL | ⌘K "proactive alerts", "alerts lead time": nothing | REG-1222 (lead time). FROM §8 lists "Proactive Alerts" as left out, so the records disagree |
| F22 | Workflow › AI Assignment Logic | — | LEFT OUT (never read) | — | A11 LM-11 |
| F23 | Projects › Project Types | The Won step's three, fixed | LEFT OUT (editor) | → Settings › Projects (no card there) | A01 Q-34 |
| F24 | Projects › Timeline Templates (+ `/accounts/milestone-templates`) | Company › Templates › Schedules | RENAMED | ⌘K "timeline": nothing | SW §7 |
| F25 | Projects › Pipeline Stages | — | LEFT OUT (never read) | → Lead stages | A11 LM-12 |
| F26 | Projects › Material Catalog | Company › Materials | RENAMED | ⌘K "material catalog": nothing ("materials" ✓) | REG-677 |
| F27 | Projects › Escalation Categories | Settings › Projects › Ticket categories | RENAMED | ⌘K "escalation", "ticket categories": nothing | REG-1316 |
| F28 | Finance › Project & Payments · milestones | Templates › Schedules + Payment schedules | PARTIAL (payment % on milestones left out) | ⌘K: nothing | FROM §8; SW §7 |
| F29 | Finance › Payment Schedules · Expense Categories | Templates › Payment schedules · Settings › Finance › Expense categories | MOVED | ⌘K ✓ | REG-538; REG-1738 |
| F30 | Finance › Commission & Payouts | Settings › Finance › Commission | RENAMED | ⌘K "commission" ✓, "payouts" nothing | FROM P9 |
| F31 | Finance › PO Settings | Settings › Finance › Costs + The purchase order paper | RENAMED | ⌘K "po settings" → Meetings cards first | FROM P8 |
| F32 | Finance › Document Numbering · Payment Methods | Settings › Finance › Document numbers · Client payments | RENAMED | ⌘K ✓ | SW §7; REG-2112 |
| F33 | Finance › Accounting Integration | Company › Integrations › Xero (+ Finance › Xero) | MOVED | ⌘K "accounting integration" ✓ | one-home N-09 |
| F34 | Branding › Studio Branding · client-portal | Templates › Brand kit | RENAMED | ⌘K "branding": nothing ("brand" ✓) | REG-554 |
| F35 | Branding › Accreditations · Review Link | Brand kit marks + Profile › Registrations; Profile › Review link | MOVED | ⌘K ✓ | REG-1819; one-home N-07 |
| F36 | Branding › Chat Identity | — | LEFT OUT | — | REG-2112 (S31) |
| F37 | HomeOwner Portal › HomeOwner Portal (+ portal-* tabs) | Company › Client portal | RENAMED | ⌘K "homeowner portal" ✓ | FROM P12 |
| F38 | AI & Copilot › Copilot Tuning · Objection Responses · Meeting Checklists · Competitor List | Settings › Meetings (four cards) | MOVED | ⌘K ✓ all four | REG-1855… (S23) |

### G · Qanvast Ops and Verify (Q)
| # | 1.0 entry | 1.0 route · file · branch | 2.0 home · URL | Status | Can a 1.0 user find it? | Record |
|---|---|---|---|---|---|---|
| G1 | Qanvast Leads: status filter, dates, search, Export as CSV | `qanvast-ops/leads/page.tsx` | Qanvast Ops › Leads (Filters, search, ⋮ Export all as…) | SAME | Rail ✓; `/qanvast-ops/leads` → `/qanvast-ops` | A01 T-10; REG-609 |
| G2 | Lead info modal › Return Lead · Return Lead Policy (PDF) | `components/qanvast-ops/lead-info-modal.tsx` | Row ⋮ › Return Lead; the wizard's rules line | PARTIAL (no policy PDF) | ✓ | A01 Q-44, round 3 notes |
| G3 | Credits (+ Transactions · Contracts) | `qanvast-ops/credits/**` | Qanvast Ops › Lead credits (Owner) | RENAMED | Same addresses ✓; ⌘K "credits" ✓ | REG-2143… |
| G4 | Credits › Lead Transaction Log (an empty stub) | `qanvast-ops/credits/leads/page.tsx` | Qanvast Ops › Leads | MOVED | Redirect ✓ | `old-addresses.ts` |
| G5 | Reviews & Rankings › Reviews · Rankings · Request Reviews · Feedback | `qanvast-ops/reviews/**` | Qanvast Ops › Reviews (Ranking, Feedback views; Request reviews) | RENAMED | Same addresses ✓; ⌘K "reviews", "rankings" ✓ | REG-2143…; S42E E·2 |
| G6 | `/verify` (orphan page, nothing linked to it) | `verify/page.tsx` | Company › Profile › Listed on Qanvast | MOVED | Redirect ✓; ⌘K "verify" ✓ | REG-2057… (S37) |

## Findings

### L-1 · Archived leads turn into trash that says it deletes them in 30 days
- **Kind:** Partial
- **1.0:** ⋮ › Archived Leads lists every archived lead, each with Revive. The note says "Leads that have been archived. They stay
  here until you revive them." 1.0 removed an older "permanently deleted after 30 days" promise because no purge ran
  (`components/accounts/archived-leads-section.tsx:26-41`, Q).
- **2.0:** No Archive. ⋮ › Deleted Leads, whose note says "Deleted leads are permanently removed after 30 days"
  (`components/leads/deleted-sheet.tsx:154`). The port maps `archived_at` → `deleted_at` "(a 30-day trash)" (M02, §2). No job purges
  leads today: `lib/services/sweep.ts:42-58` has none.
- **Why it matters:** a studio's years of parked leads would arrive labelled as deleted rubbish due to vanish. If developers make the note
  true, that history is lost 30 days after the move.
- **Recommendation:** decide where 1.0's archived leads land (for example Lost with the reason "Archived in 1.0") and either stop the trash
  promising a purge or build one. The wording is Vicky's call and the port rule is the developers' job.
- **Size:** S

### L-2 · Owners' Approvals queue left Tasks, and Tasks doesn't say where it went
- **Kind:** Hard to find
- **1.0:** `/tasks` showed Owners an "Approvals" chip with a count. Each waiting approval had a yellow strip with Approve and Reject (and a
  reason box) in the row. The bulk bar had "Approve N items" for price book items (`tasks/page.tsx:441-551, 941, 1128`, Q).
- **2.0:** Approvals live on each record (the quote's bar, a template's review, a price book proposal, a project's Needs you). They are
  collected on Dashboard › Needs you (`lib/dashboard/queries.ts:146-166`). `/tasks` mentions none of this: a grep for "approv" in
  `components/tasks/`, `components/leads/tasks/` and `app/tasks/` finds nothing. ⌘K "approvals" only finds Settings › Projects.
- **Why it matters:** an Owner whose morning routine was Tasks › Approvals sees nothing waiting there and may assume nothing waits.
- **Recommendation:** on `/tasks`, show a line or chip when approvals wait ("3 approvals wait for you → Dashboard"), and add "approve" and
  "approvals" to the Dashboard's ⌘K words. This is visible, so it's Vicky's lane.
- **Size:** S

### L-3 · Addresses that plg, UHD and Qanvast users have saved, which 2.0 lands on "not found" or the wrong page
- **Kind:** Missing
- **1.0:** plg's credit pill, "See usage" and its credit-alert notifications link to `/settings/usage` (`components/credits/credit-pill.tsx:181`,
  `components/om-credits/credits-card.tsx:168`, P). P and U's new-interface pages are `/leads/settings`, `/company/settings` and
  `/company/settings/quotes` (`lib/om/company/sections.ts:27,75`, P). plg's personal Settings opens by `?section=` (`email`, `interface`,
  `profile`…), linked from Add Lead › Link to Email (`components/om-leads/workspace.tsx:479`, P).
- **2.0:** none of these is in `lib/links/old-addresses.ts`. There is no `app/settings/usage` and no `app/company/settings`. `/leads/settings`
  hits `notFound()` (`app/leads/[id]/(overview)/page.tsx:34`). `/settings?section=email` falls back to Roles & access
  (`parseSettingsModule`, `lib/settings/modules.ts`). Two more gaps: `/accounts?tab=cost-visibility` lands on the module, not its card (the id
  is missing from `OLD_ACCOUNTS_TABS`, so one of Q's 45 tabs misses REG-2112's "every tab to its card"), and `/sign/document/<token>` is still
  open (FROM §9 #3).
  Outside this area I also saw no rows for P's `/tools/quotes`, `/visualizer/materials` and `/billing/return`.
- **Why it matters:** plg studios open links from emails and bookmarks they already have, and land on a dead end.
- **Recommendation:** add the rows. Suggested landings: `/settings/usage` → `/company/plan`; `/leads/settings` → `/settings?section=leads`;
  `/company/settings[/quotes]` → `/settings?section=studio|quotes`; plg's personal `?section=` ids → Your profile's cards (Link to Email →
  `/company/integrations#gmail`); `cost-visibility` → `#cost-visibility`. The rows are the developers' work. Vicky confirms the landings.
- **Size:** S

### L-4 · "Request signature" on a lead's file became Contracts › Import a PDF
- **Kind:** Hard to find · Partial
- **1.0 (Q only):** any PDF, PNG or JPEG in the lead's Files had "Request signature". Its ⋯ menu offered Copy signing link, Extend 7 days,
  View signed copy and Cancel link (`components/leads/drawer-sections/document-signing-controls.tsx:139-238`).
- **2.0:** the same job is Contracts › Import a PDF → Send for digital signature. A file's row has no door to it (grep for "signature" in
  `components/leads/files/` finds none). Pictures can't be signed, and old `/sign/document/<token>` links 404. SWD note 4 lists these
  as "differences for Vicky". No decision is recorded.
- **Why it matters:** a Qanvast-line studio that signed loose documents from Files won't think to look under Contracts.
- **Recommendation:** add "Send for signature" on a PDF's ⋮ in Files that opens Import a PDF already filled in, and decide on pictures and
  the old links. Vicky's lane.
- **Size:** S–M

### L-5 · ⌘K doesn't know 1.0's names, and several Settings cards aren't in it at all
- **Kind:** Hard to find
- **1.0:** Accounts Setup's menu names (Legal Entities, Document Templates, Signing Documents, Packages, Quote Approval Rules, Workflow
  Rules, Proactive Alerts, Timeline Templates, Material Catalog, Escalation Categories, Studio Branding, Commission & Payouts, PO Settings)
  and personal Settings names (Lead Preferences, Usage & Credits).
- **2.0:** each of those finds nothing (or the wrong card) in `pageHits`. So do "accounts setup", "archived", "deleted leads", "response time"
  and "kanban". REG-812 promises that every Settings card is findable by its own title. These titles find nothing, or the wrong page: Ticket
  categories, Stages and handover, Schedule / Alerts lead time, Project numbers (→ Project reports), New quotes start with, Messages to
  clients, Sent messages and Untouched leads (titles from `settingTitle` in `app/settings`, `components/projects` and `components/finance`). "usage" finds only Studio health, never
  Plan & AI credits › Usage.
- **Why it matters:** "type the old name" is a lost 1.0 user's first move, and today it dead-ends for about half of Accounts Setup.
- **Recommendation:** add 1.0's names to `words` and give the missing cards their rows. No screen changes beyond search results, but those
  results are visible, so Vicky reviews.
- **Size:** S

### L-6 · "Settings" now means the studio's rules; 1.0's Settings is "Your profile"
- **Kind:** Hard to find
- **1.0:** profile menu › Settings opened a member's own page: profile, signature, Open to new leads, preferences, notifications, Email Lead
  Sources (`settings/page.tsx:34-47`). Accounts Setup was a separate Owner-only entry.
- **2.0:** the rail's Settings opens Roles & access, and Designers see it read-only. The personal page is Your profile, the first row of the
  studio block's menu. Settings has no "Looking for your own settings?" pointer: the only `/profile` link in `app/settings` is a help link
  in Notifications (`app/settings/notifications-settings.tsx:95`). `/settings` with no anchor lands on Roles & access.
- **Why it matters:** a designer who goes to change their signature or notifications ends up in rules they can't edit.
- **Recommendation:** add one line in Settings' head for members who can't change the rules, pointing to Your profile, and add
  "settings" / "my settings" to Your profile's ⌘K words. Vicky's lane.
- **Size:** S

### L-7 · Small losses a 1.0 user will notice on the lead
- **Kind:** Partial
- **1.0:** listing search matched the area (`lib/leads/listing-display.ts:53-65`, hint "Search name, area, phone, email…"). The drawer's email
  was a `mailto:` link and the phone a `tel:` link on every screen (`client-info-section.tsx:204-216`). Tasks filtered "Upcoming"
  (`tasks/page.tsx:999`).
- **2.0:** District isn't a search field (`app/leads/workspace.tsx:299-307`). The email can only be copied, and the phone calls only on
  touch (`components/leads/detail/info-column.tsx:248-270`). Tasks has Overdue and Due today but no Upcoming.
- **Why it matters:** each is a one-press habit that now takes a detour. None blocks work.
- **Recommendation:** decide each. All three are visible, so Vicky's lane.
- **Size:** S
