# OpenMaison 1.0 → 2.0: the developers' map

For the developers bringing 1.0's data and services into 2.0. It answers four questions for every part of 1.0: **where it lives
in 2.0, what changed, what was left out on purpose, and what you plug in.**

Checked on 17 Oct 2026 against 2.0 at commit `b8b600d`; updated 19 Oct for the findability fixes (S46,
`design-source/context/parity/31-findability-audit-2026-10-19/`) and the 1.0 branches in §1. Sections 1–11 are the whole picture and
take about ten minutes to read. Section 12 is the reference: one card per 1.0 module. Read a module's card before you port it.

---

## Read this first

- **2.0 is the product. 1.0 is where the data and the real services come from.** Every feature on 1.0's production branches has
  a home in 2.0, or a written reason it was left out (§8).
- **2.0 runs on its own.** Run `npm run dev` and nothing else. It has its own database (libSQL / SQLite), its own schema
  (`lib/db/schema.ts`) and its own migrations (`drizzle/`, up to `0114`). You don't need 1.0 running to work on 2.0.
- **Your job has three parts:** port 1.0's data into 2.0's tables (§6), plug real services into 2.0's stand-ins (§7), and run
  it in production. Changing what a user sees is not part of it. The screens are Vicky's design (§11).
- **Most of 1.0 was reshaped, not copied.** The job stays the same but the shape changed. The lead drawer became a page with tabs,
  a project's JSON timeline became milestone rows, and variation orders became quotes.
- **The words changed too.** Escalations are now Tickets, Packages are My Sections and the Inbox is Messages. §5 lists every
  rename.
- **Some of 1.0 was left out on purpose.** Don't port it back (§8).
- **A few calls are still open.** §9 lists them. Settle each one before you port that part.
- **When two documents disagree,** trust them in this order:
  1. the code;
  2. `lib/services/registry.ts`;
  3. the newest build outcome (`design-source/context/parity/30-pending-modules-build-2026-10-11/steps/outcome-*.md`);
  4. the older migration maps.

  The places we know are out of date are in §13.

---

## 1. Which 1.0 this map was read from

1.0 is the repo `qanvast-id-tool` (Next.js and Supabase / Postgres). Where a card names no branch, the path is on
`deployment/qanvast`.

| 1.0 branch | What it is | Tip read |
| --- | --- | --- |
| `deployment/qanvast` | Qanvast's production, and the default source for this map | `40f8635e2`, 8 Oct |
| `deployment/plg` | The self-serve product. The only branch with AI credits, billing (Dodo), Pro locks, upgrade nudges, the no-account trial and Turnstile | `64791f115`, 9 Oct |
| `urbanhomedemo` | Urban Home Design's work: Sales reports, Contractors and the Projects columns. 2.0 built these for every studio | `fab7cc868`, 16 Oct |

**Port each thing once.** `deployment/plg` already carries copies of some 2.0 pieces under 2.0's own names:
`stage_logs`, `imports`, `import_rows`, `lead_notes`, `questions`, the `task_*` tables, `tags`, `library_folders`,
`file_comments`, `contracts`, `visualizer_designs` and `render_annotations` (migration `440_visualizer_2.sql`), plus 2.0's
search palette. Map those rows into 2.0 once, not once per branch.

**Only `deployment/qanvast` has** who-sees-costs, Qanvast Ops' lead credits and reviews, per-vendor prices (migration 425),
quote revisions as separate rows (427) and signing any lead file (426).

---

## 2. How 2.0 is laid out

| You want | Look in |
| --- | --- |
| A page | `app/<route>/page.tsx` (the full-screen editors are in `app/(editor)/`) |
| What it draws | `components/<module>/` |
| Its reads and rules | `lib/<module>/` (`queries.ts` for reads; the pure rules sit beside it) |
| Its writes | server actions in `app/**/actions.ts` and `app/**/*-actions.ts` |
| The schema | `lib/db/schema.ts`; migrations in `drizzle/` (additive only) |
| Every stand-in for a real service | `lib/services/registry.ts` (43 entries) |
| 1.0's old addresses | `lib/links/old-addresses.ts` |
| Who is signed in | `sessionMemberId()` in `lib/db/session.ts` |
| Where each module lives, file by file | `CLAUDE.md` › *Map* |
| Why something is the way it is | `design-source/REGISTER.md`. Search the `REG-nnn` named in the code comment |

URLs leave out route groups: `app/(editor)/quotes/[quoteId]` is `/quotes/<id>`.

---

## 3. Where did each 1.0 menu item go?

1.0's sidebar (`src/components/layout/app-sidebar.tsx`) against 2.0's rail.

| 1.0 menu | 2.0 | Address |
| --- | --- | --- |
| Dashboard | Dashboard | `/dashboard` |
| Leads | Leads | `/leads` |
| Chats (Inbox) | Messages | `/chat` |
| Projects | Projects | `/projects` |
| Tasks | Tasks | `/tasks` |
| Escalations | Tickets, on the rail after Tasks as in 1.0, with its count (the client sees "Issues"); also the Dashboard's Tickets tile, ⌘K ("escalations"), G then E | `/tickets` |
| Marketplace | Marketplace | `/marketplace` |
| Tools › Quote Digitizer | Create Quote › Upload a quote, from a lead's Quotes or Tools › Quotes; the empty Quotes list and ⌘K ("digitizer") open it directly | `/quotes?upload=1` |
| Tools › Quote X-Ray | Tools › Quote X-Ray | `/quote-x-ray` |
| Tools › AI Visualizer | Tools › AI Visualizer | `/visualizer` |
| Tools › Floorplan to 3D Isometric | Tools › Floorplan to 3D Isometric (part of the 3D Space Planner) | `/planner?view=iso&photo=1` |
| Tools › 3-D Space Planner | Tools › 3D Space Planner | `/planner` |
| Tools › Market Insights | Tools › Market Insights | `/market-insights` |
| Tools › Compliance Navigator | Tools › Compliance Navigator | `/compliance` |
| Tools › Meeting Copilot | Tools › Meeting Copilot | `/meetings` |
| Tools › Homeowner Portal | Company › Client portal | `/company/portal` |
| Tools › the AI sandboxes | No menu. Each job is in a real screen; the experiments are on the developers' bench | `/dev/ai-bench` (off in production) |
| Finance › Operations, Vendors, Commissions | Company › Finance: To do · Money in · Money out · Vendors · Commission · Xero | `/company/finance/<tab>` |
| Finance › Reports, Pipeline | Company › Reports › Finance (Pipeline is now Profitability) | `/company/reports/finance` |
| Qanvast Ops › Qanvast Leads, Credits, Reviews & Rankings | Qanvast Ops › Leads · Lead credits · Reviews (plus Studios and Hangouts) | `/qanvast-ops` |
| Accounts (Accounts Setup) | Settings for the rules, Company for the records | `/settings`, `/company/…` |
| Settings (personal) | Your profile | `/profile` |
| Upgrade | the Plans dialog, and Company › Plan & AI credits | `/company/plan/billing` |

New in 2.0's rail:
- **Company**, a panel with Profile, Members, Questionnaire, Templates, Price book, Materials, Plan & AI credits, Client portal,
  Finance, Reports and Integrations;
- **Tools › Quotes** and **Tools › Contracts**;
- **Search** (⌘K);
- **Notifications**.

Every old 1.0 address, on all three branches, lands on its 2.0 page (card A10). 1.0's own words find their 2.0 page in ⌘K.

---

## 4. Every module on one table

**What happened** means:
- **Same**: ported as it was.
- **Reshaped**: same job, new shape. Read the card.
- **Renamed**: same thing, new words.
- **Merged**: moved into another place.
- **Split**: one 1.0 thing became several.
- **New**: 2.0 only, nothing to port.

### Leads and people

| 1.0 | 2.0 home | What happened | Card |
| --- | --- | --- | --- |
| Leads (list · kanban) | Leads `/leads` | Reshaped: seven fixed stages, soft delete | L1 |
| The lead drawer | Lead Details `/leads/<id>`, with nine tabs | Split | L2 |
| Bucket / status / sub-status, Journey, Lead Funnel | Stage ▾ and the Move stage window | Reshaped | L3 |
| Tasks | Tasks `/tasks`, and every lead's and project's Tasks | Reshaped | L4 |
| Outreach attempts, lead files, activity log | Notes & Logs · Files · Activity tabs | Reshaped | L5 |
| Scope questions | Questionnaire tab and Company › Questionnaire | Reshaped | L6 |
| CSV import, document fill | Leads › Import → Review imported leads | Reshaped | L7 |
| Lead Webhooks, Email Lead Sources | Company › Integrations | Merged | L8 |
| Refund requests, Qanvast Ops | Return Lead, and Qanvast Ops | Reshaped | L9 |
| Hangouts, ID portfolio profiles | Qanvast Ops › Hangouts, public profiles | Reshaped | L10 |
| Notifications | The bell, Settings › Notifications, Your profile › Your notifications | Reshaped | L11 |
| Team Members, personal Settings | Company › Members, Your profile | Merged | L12 |
| Roles & Permissions, cost visibility | Settings › Roles & access | Reshaped | L13 |
| Accounts Setup | Settings (rules) and Company (records) | Split | L14 |
| Verify | Company › Profile › Listed on Qanvast | Reshaped | L15 |
| Login, onboarding, studio set-up | `/sign-in`, `/sign-up`, Set up your studio | Reshaped | L16 |
| Dashboard | Dashboard `/dashboard` | Reshaped | L17 |
| Performance view, Studio Health, UHD's Sales reports | Company › Reports › Leads · Studio health | Reshaped | L18 |
| Meeting Co-Pilot, copilot analytics | Tools › Meeting Copilot, the lead's Meetings tab | Reshaped | L19 |
| Top-bar search, key list | ⌘K search and the ? shortcuts panel | New in this form | L20 |

### Quotes, contracts and the price book

| 1.0 | 2.0 home | What happened | Card |
| --- | --- | --- | --- |
| Quote Editor (the Quote Digitizer dialog) | The quote editor `/quotes/<id>` | Reshaped | Q1 |
| Quote statuses, approval rules, versions | The editor's header, approval bar, Version History | Reshaped | Q2 |
| Quote Digitizer upload, AI Quote Drafter | Create Quote › Upload a quote · Draft with Maison AI | Reshaped | Q3 |
| The drawer's quotes, Finance › Operations | A lead's Quotes tab, Tools › Quotes | Reshaped | Q4 |
| `/quote-preview/<token>`, `/quote/<token>` | `/quote/<token>` (view only), `/confirm/<token>` (confirm) | Split | Q5 |
| Document Templates (Quote Designer) | Company › Templates › Quotes, the template editor | Reshaped | Q6 |
| T&C templates, Payment Schedules | Company › Templates › T&Cs & Notes · Payment schedules · Tasks | Merged | Q7 |
| Price Book | Company › Price book › My Items | Reshaped | Q8 |
| Packages | Company › Price book › My Sections | Renamed | Q9 |
| Contract & Signing dialog, Signing Documents | Contracts (a real record), contract templates | New record | Q10 |
| Signature requests, `/sign/<token>` | Signing links, bundles, the signing record | Reshaped | Q11 |
| Quote X-Ray | Tools › Quote X-Ray | Reshaped | Q12 |
| AI actions in the quote editor | Writing help, wherever words are written | Reshaped | Q13 |
| Quote Categories, Approval Rules, Quote Sharing | Settings › Quotes & pricing | Reshaped | Q14 |
| Legal Entities | Company › Profile › Issuing entities | Merged | Q15 |

### Projects, money and the client portal

| 1.0 | 2.0 home | What happened | Card |
| --- | --- | --- | --- |
| Projects | Projects `/projects`, the project page with seven tab groups | Reshaped | P1 |
| Milestones (Gantt), Milestone Templates | Project › Schedule, Company › Templates › Schedules | Reshaped | P2 |
| Progress Updates | Project › Client › Updates | Renamed and reshaped | P3 |
| Materials (selections), the portal's Design tab | Project › Design › Choices · Designs | Renamed and reshaped | P4 |
| Close Project, status pill, Archive | Hand over, On hold, soft delete | Reshaped | P5 |
| Workload view; Contractors (UHD) | Projects › Workload, contractors as vendors | Reshaped | P6 |
| The project's Finance tab, `/pay` links | Project › Money, `/invoice/<token>`, `/receipt/<token>` | Reshaped | P7 |
| Studio Finance › Operations, Vendors, POs, bills, expenses | Company › Finance | Moved and split | P8 |
| Commissions, credit notes, accounting | Company › Finance › Commission · Xero | Reshaped | P9 |
| Finance › Reports, Pipeline | Company › Reports › Finance · Projects | Merged | P10 |
| The homeowner portal `/my` | The client portal `/my/<address>` | Reshaped | P11 |
| Tools › Homeowner Portal, Invite to Portal | Company › Client portal, the Client access panel | Reshaped | P12 |
| Inbox (Chats), the portal's Project Chat | Messages `/chat`, Project › Client › Messages | Renamed and split | P13 |
| Escalations, support tickets | Tickets on the rail (studio), Issues (client) | Renamed | P14 |
| Floor Plan (mark-up) | Project › Design › Floor plan | Same in substance | P15 |
| 3-D Space Planner, Floorplan to 3D | Tools › 3D Space Planner | Reshaped | P16 |
| Compliance Navigator | Tools › Compliance Navigator, Project › Tasks › Compliance | Reshaped | P17 |

### AI, plans and the platform

| 1.0 | 2.0 home | What happened | Card |
| --- | --- | --- | --- |
| AI Visualiser | Tools › AI Visualizer, Company › Materials | Reshaped | A1 |
| The AI sandboxes | Real screens, plus the developers' bench `/dev/ai-bench` | Split | A2 |
| Credits, Upgrade, Usage, Dodo billing (plg) | Company › Plan & AI credits, the Plans dialog | Reshaped | A3 |
| Plan gating, nudges (plg) | Pro locks, one quiet bell row | Reshaped | A4 |
| mAIson (ID Buddy) | Maison AI | Renamed and reshaped | A5 |
| Marketplace | Marketplace | Reshaped | A6 |
| Market Insights | Tools › Market Insights | Same idea, stored copy | A7 |
| The marketing site | `/site` | Moved | A8 |
| `/try-visualizer`, `/try`, anon workspaces (plg) | `/site/try/…` | Reshaped | A9 |
| Every address 1.0 printed | Redirects to their 2.0 pages | New | A10 |
| Resend, 360dialog, Twilio, Storage, Chromium, crons | The services registry, `/api/cron`, `/api/webhooks` | Reshaped | A11 |
| Feature flags, `platform_config` | Fixed rules, settings, env switches | Split | A12 |
| `/admin`, languages, other countries | Not carried, on Vicky's word | Left out | A13 |

---

## 5. Words that changed

Search 2.0's code and screens for the 2.0 word. The 1.0 word won't be there.

| 1.0 says | 2.0 says | Where |
| --- | --- | --- |
| Homeowner | Client | everywhere |
| mAIson, mAIson Bot, ID Buddy | Maison AI | the assistant |
| ID (role tag `id`) | Designer | roles |
| Accounts Setup | Settings (the rules) and Company (the records) | rail |
| Settings (personal) | Your profile | `/profile` |
| Bucket / status / sub-status | Stage: New · Contacted · Met · Quote Sent · Won · On Hold · Lost | a lead |
| Signed · Inactive | Won · Lost | a lead |
| Archive · Revive (a lead) | Lost with the reason "Archived in 1.0" · Resume | a lead |
| Delete (a lead, a quote, a project) | Delete (soft) · Restore; Deleted Leads removes a lead for good after 30 days | leads, quotes, projects |
| Outreach attempt | Contact log | Notes & Logs |
| Next follow-up (a field on the lead) | Follow-up task | Tasks |
| Lead drawer | Lead Details (a page) | `/leads/<id>` |
| Lead Funnel | Lead stages | Settings › Lead management |
| Refund request | Return Lead | a Qanvast lead's ⋮ |
| Performance view | Reports › Leads › Response time | Company › Reports |
| Team Members | Members | Company |
| Roles & Permissions | Roles & access › Who may do what | Settings |
| Cost & Margin Visibility | Who sees costs and margins | Settings › Roles & access |
| Legal Entities | Issuing entities | Company › Profile |
| Feature Flags › CaseTrust signing step | Registrations (CaseTrust) | Company › Profile |
| Studio setup (wizard) | Set up your studio (a checklist) | Settings › Roles & access |
| Onboarding | Start your studio | `/sign-up` |
| Verify | Listed on Qanvast | Company › Profile |
| ID portfolio profile | Public profile | `/company/members/<id>/profile` |
| Copilot, Copilot Analytics, mAIson Live | Meeting Copilot, Meetings, Reports › Meetings | Tools, the lead's tab |
| Credits (Qanvast Ops) | Lead credits | Qanvast Ops |
| Reviews & Rankings | Reviews | Qanvast Ops |
| Quote Digitizer, Quote Editor, Quote Designer | Quote editor; *Upload a quote* for reading a file | `/quotes/<id>`, Create Quote |
| Category / sub-category rows; Group | Section / sub-section (stored as `quote_items.kind = 'group'`) | Items table |
| Price type | Print as | a line's ⋮ |
| `spec_url` | Website Link (`link`) | Items column |
| Packages | My Sections | Company › Price book |
| Price Book (tab `catalogue`) | My Items | Company › Price book |
| Waste Factor % | Waste (%) | a Price book item |
| Quote Categories | Trades | Settings › Quotes & pricing |
| Document Templates | Quote templates | Company › Templates |
| T&C templates | T&Cs & Notes | Company › Templates |
| Payment Schedules | Payment schedules | Company › Templates |
| Signing Documents | Contract templates (written or PDF) | Company › Templates › Contracts |
| Contract & Signing, signature request | Contract (one per document); several sent together = a bundle | Contracts |
| `submitted` · `rejected` · `sent_for_signature` · `client_signed` | Sent for Approval · Draft with a review note · Sent to Client · Signed | quote status |
| Quote preview link | View-only link | the quote's ⋮ |
| Starter Quote (Quote Rules) | Draft with Maison AI; My Sections by property type | Create Quote |
| My signature | Your signature | Your profile |
| Digitize quote | Quote read | Usage, Create Quote |
| Custom stage definitions | Lead stage rules | the Plans table |
| Draft · Active · Closed (project) | Setting up · In progress · Completed | a project's stage |
| Management (tab) | Schedule · Tasks · Design | the project page |
| Milestones | Schedule | Project › Schedule |
| Milestone Templates, Timeline Templates | Schedules | Company › Templates |
| Materials (selections) | Choices | Project › Design, the portal |
| Progress Updates | Updates | Project › Client, the portal |
| Finance (project tab) | Money | the project page |
| Files & Docs | Files (under Files & notes) | the project page |
| Close Project | Complete handover | a project |
| Homeowner Portal, client hub | Client portal | Company |
| Preview as Homeowner | See it as {client} | the Client access panel |
| Inbox, Chats | Messages | rail (`/chat`) |
| Escalations | Tickets (the client reads "Issues") | rail › Tickets |
| Escalation Categories | Ticket categories | Settings › Projects |
| Customer Notifications | Messages to clients | Settings › Notifications |
| Studio Finance › Operations | To do · Money in · Money out | Company › Finance |
| Receipts | Payments | Company › Finance › Money in |
| Purchases (bills) | Bills | Company › Finance › Money out |
| Accounting (tab) | Xero | Company › Finance |
| Commissions | Commission / My commission | Company › Finance |
| Pipeline | Profitability | Company › Reports › Finance |
| 3-D Space Planner, Plan the Space (3D) | 3D Space Planner | Tools |
| AI Visualiser | AI Visualizer | Tools |
| Material Catalog | Materials | Company › Materials |
| AI sandboxes | the developers' AI bench | `/dev/ai-bench` |
| Credits (AI) | AI credits | everywhere |
| Usage & credits | Plan & AI credits › Usage | Company |
| The Upgrade page | the Plans dialog, Plan & billing | anywhere, Company |
| Monthly cap | Monthly amount | a member's AI credits |
| Request more | Ask {Owner} | the out-of-credits sheet |
| Drift repair | Render repair | Usage |
| Defurnish room | Empty the room | Visualizer |

---

## 6. Data: 1.0's tables in 2.0

### Rules for every port

- **Money is whole cents** in `*_minor` integer columns. 1.0 stored dollars, so multiply by 100. Never total money in SQL; use the one
  set of money functions (`moneyOf` in `lib/projects/money.ts`, `costsOf` in `lib/finance/costs.ts`, `commissionsOf` in
  `lib/finance/commission.ts`).
- **A quote line is `cost_minor` + `markup_minor`.** The selling price is worked out. Never copy 1.0's `markup_percent`. If a line
  has a selling price but no cost, set cost = selling price and leave markup at zero.
- **GST is worked out once per rate.** 1.0 taxed each line. Stamp every ported quote that was already sent with
  `quotes.gst_rule = 'line'`, so its total matches what the client saw.
- **Phones are the 8 digits** (Singapore, starting 6, 8 or 9). Only the mobile numbers (8 or 9) can sign in.
- **Time columns are not all the same unit.** Some are `timestamp` (seconds) and some `timestamp_ms` (milliseconds), sometimes on
  one table: `projects.completed_at` is seconds, `projects.on_hold_at` is milliseconds. Check each column's `mode` in
  `lib/db/schema.ts` before you write it.
- **Keep 1.0's ids and numbers where other things point at them:** milestone ids, sent invoice, receipt and ticket numbers, the
  `QT-` quote series.
- **Keep 1.0's tokens in 2.0's columns** so the links clients already have keep working: `quotes.view_token`,
  `contracts.sign_token`, `project_invoices.share_token`, `project_payments.share_token`, `purchase_orders.vendor_token`,
  `homeowner_lead_links.portal_token` and the layout share's token.
- **Vendors and issuing entities are linked by name, not id** (`price_book_items.vendor`, `quote_items.vendor`,
  `quotes.issuing_entity`, `contracts.issuing_entity`). A rename is carried by `reconcileEntities` and `mergeTrade`.
- **Delete is soft first.** 1.0's delete becomes `deleted_at` (soft delete), with Restore and Delete forever. Deleted Leads removes a lead
  for good 30 days after its delete (`purgeExpiredLeads`, the sweep's `deleted-leads`). **1.0's archived leads are not deletes:** they land in
  Lost with the reason "Archived in 1.0" (`lib/port/archived-leads.ts`), never in the trash.
- **Every project has a lead.** `projects.lead_id` is required and unique. A project with no lead gets a `direct` lead
  (`leads.direct = 1`), which no lead list shows.
- **Variation orders are quotes** with `kind = 'variation'`. Every quote list filters `kind = 'quote'`.
- **Some things are worked out, not stored:** an invoice's paid state, commission accruals, profit, due-date notifications,
  response times and activity. Don't port 1.0's stored totals as the truth.
- **Activity has no event table.** It is built from every record (`lib/leads/activity.ts`). `lead_events` (`logLeadEvent`) is
  only for what leaves no row behind.
- **A studio's rules are JSON, one row per key** in `settings`, read by `lib/settings/types.ts`.
- **Rich text passes one allowlist** on save and on display: `cleanRichHtml` in `lib/rich-html.ts`. Ported HTML must go through
  it.
- **A lead's state needs its trail.** A lead in Contacted needs its New → Contacted stage log; a member needs `assigned_at`; a Quote
  Sent lead needs its approved quote. Map 1.0's positions with audit 01 §4.6.
- **Never run `npm run db:repair` on ported data.** Its rules write the demo studio. Reuse the SQL of its closing checks
  (`scripts/repair-demo-data.ts`) to check a port.
- **Today each studio is one database file.** Real multi-studio tenancy goes behind `setStudioProvisioner`
  (`lib/studios/create.ts`).

**Names that look the same but aren't**
- 1.0's `quote_templates` is an unused skeleton table. 2.0's `quote_templates` comes from 1.0's `studio_document_templates`
  (type `quote_pdf`).
- 2.0's `invoices` is OpenMaison's bill to the studio. A studio's invoices to its clients are `project_invoices`.
- 1.0's accounts tab `quote-templates` is Packages, which is 2.0's My Sections.
- `users`, `organizations` and `memberships` in 2.0's schema are unused starter tables.
- `lead_questionnaires` is unused; build against `questions`.

### Leads and people

| 1.0 table | 2.0 table | Note |
| --- | --- | --- |
| `leads` | `leads` (+ `stage_logs`, `lead_events`) | position → `stage` + its logs; `budget` × 100; a delete → `deleted_at`; `archived_at` → Lost + its stage log (`lib/port/archived-leads.ts`) |
| `lead_assignees` | `lead_assignees` (+ `assigned_by`) | commission split → Finance |
| `lead_activity_log` | worked out (+ `lead_events`) | `lib/leads/activity.ts` |
| `lead_outreach_attempts` | `lead_notes` (kind `contact`) + the Contacted log | |
| `tasks`, `task_assignees` | `lead_tasks`, `task_assignees` | follow-ups become tasks; quote approvals do not |
| `lead_files` | `lead_files` (+ `file_comments`, `lead_file_images`, `_thumbs`, `_renders`) | |
| `studio_scope_questions` | `studio_scope_questions` | the bank |
| `homeowner_scope_responses` (+ `_history`) | `questions`, `question_answer_history` | |
| `lead_custom_fields`, `lead_custom_field_values` | same names | `file` fields not ported |
| `studio_lead_funnel` | settings `stage_movement`, `lead_stage_rules` | the stages are fixed |
| `studio_taxonomies` (lead source) | settings `lead_sources` | |
| `studios.settings.journey` reasons | settings `lead_reasons` | |
| `refund_requests`, `refund_reasons` | `lead_returns`, `return_attachments` | the reasons are code |
| `lead_webhook_endpoints`, `lead_webhook_log` | settings `lead_capture.webhooks`, `.webhookLog` | port keys as `null` |
| `email_connections`, `email_sync_log` | settings `lead_capture.email` | tokens stay with the provider |
| `homeowner_profiles`, `homeowner_project_links` | `homeowner_profiles`, `homeowner_lead_links` (+ `homeowner_household_links`) | |
| `notifications` | `notifications` (+ `notification_outbox`, `inbound_messages`) | due rows are worked out |
| `notification_preferences`, `notification_templates` | settings `notification_rules`, `message_templates`; `members.notice_*` | |
| `studio_members`, `profiles`, `member_signatures` | `members` | one row per member |
| `studio_roles` (+ overrides) | `members.role` (six fixed roles) | the roles editor is on hold |
| `studio_invitations`, `studio_member_requests` | `studio_invitations` | |
| `auth_sessions`, `otp_rate_limits` | `studio_sessions`; tries counted in memory (`lib/auth/limit.ts`) | |
| `studios` (+ `settings` JSON) | `settings` rows, `portal_addresses`, `studio_verifications` | |
| `studio_companies` | settings `brand.details.entities[]` | ids `entity-<1.0 id>` |
| `studio_verifications` | `studio_verifications`, `studio_verification_files` | |
| `studios.settings.cost_visibility` | settings `cost_visibility` (+ `kept_line_costs`) | qanvast only |
| `usage_events`, `usage_daily_rollup`, `studio_last_active` | none | not tracked (§8) |
| `copilot_sessions`, `_session_state`, `_transcript_segments`, `meeting_briefs`, `copilot_share_links` | `meetings` | |
| `copilot_objection_log`, `studio_objection_responses`, `studio_competitor_list`, `studio_checklist_items` | same names | |
| `copilot_cards`, `copilot_analytics_snapshots`, `copilot_coaching_suggestions` | none | worked out on read |
| `hangout_*` (9 tables) | `hangout_events`, `_shifts`, `_participations`, `_designers`, `_registrations`, `_meetings` | vouchers not carried |
| `id_profiles`, `id_portfolio_projects`, `id_portfolio_images` | `members.portal_*`, `member_portfolio_projects`, `member_portfolio_pictures` | |

### Quotes, contracts and the price book

| 1.0 table | 2.0 table | Note |
| --- | --- | --- |
| `quotes` (+ `leads.quote_metadata`, `ic_number`, `company_id`) | `quotes` | the lead's quote settings are copied onto each of its quotes |
| `quote_line_items` | `quote_items` | sections → `kind = 'group'` rows; dollars → cents; selling price → cost + markup |
| `quote_line_items.notes`, `comments` | `quote_item_comments` | one row per comment |
| `quotes.payment_schedule` (JSON) | `quote_payments` | rows; a fixed fee row is `fixed_minor` + `fixed_label` |
| `quote_versions` (per lead) | `quote_versions` (per quote) | different grain |
| `quotes.revision_of` (qanvast) | not decided | see §9 |
| `quote_status_history` | stamps on `quotes` | the last action only |
| `quote_packages` | none | written, never read, in 1.0 |
| `quote_signature_requests` | `contracts` (+ `contract_bundles`) | classify signed / live first (map 08) |
| `lead_document_signature_requests` (qanvast) | `contracts` (an uploaded PDF) | the file in `lead_files` |
| `studio_signing_documents` | `contract_templates` (kind `pdf`) + `contract_template_files` | |
| `studio_document_templates` type `quote_pdf` | `quote_templates` + `quote_template_versions` | lands as published v1 |
| `studio_document_templates` type `tnc` | `quote_text_templates` (kind `terms`) | tokens rewritten |
| `studio_document_templates` type `contract` | `contract_templates` | tokens become chips |
| `studio_quote_theme_presets` | code (`lib/templates/presets.ts`) | a studio's own preset → a Draft template |
| `studio_assets` | settings `brand.kit`, `members.signature_*`, `studio_fonts` | |
| `payment_schedule_templates` | `payment_templates` | percent rows |
| `studio_price_book` | `price_book_items` | one row per vendor |
| `price_book_vendor_prices` (qanvast) | `price_book_items` (each vendor's own entry) | the mapper `lib/port/price-book-vendor-prices.ts` is written |
| `price_book_history` | `price_book_changes` | real price moves + one `imported` row |
| `price_book_pricing_tiers`, `price_book_suggestions` | none | |
| `vendors` | `vendors` (Company › Finance › Vendors) | lines and items still name the vendor in text |
| `studio_assemblies` | `price_book_sections` | |
| `quote_generation_rules` | none | on hold |
| `studio_quote_categories` | settings `trades` + `trade_notes` | |
| `member_signatures` | `members.signature_*` + `signature_consent` | |
| `quotes.preview_token`, `preview_view_count` | `quotes.view_token` (or `confirm_token`), `client_view_count` | see §9 |
| `quote_xrays` (verdict rows) | `quote_comparisons` | ported as `engine = 1`, not re-run |
| `brand_dossiers`, `market_quote_observations`, `platform_market_rates` | none | platform data |

### Projects, money and the client portal

| 1.0 table | 2.0 table | Note |
| --- | --- | --- |
| `projects` | `projects` + its `leads` row | `budget_total` × 100 → `agreed_value_minor` |
| `projects.timeline` (JSONB), `project_milestones` | `project_milestones`, `project_milestone_links`, `project_schedule_shares` | keep milestone ids; `dependsOn` → `follows_id` / `gap_days` + links |
| `project_assignees` | `lead_assignees` | a project's team is its lead's members |
| `tasks` (with `project_id`) | `lead_tasks` (+ `milestone_id`, `external_*`) | approval-type tasks not ported |
| `studio_milestone_templates`, `milestone_templates`, `project_types`, `studio_timeline_templates` | `schedule_templates`, `schedule_template_items` | four stores → one |
| `progress_updates` | `project_updates`, `project_update_files` | photos become `lead_files` |
| `project_files` | `lead_files` (+ `lead_file_images`, `lead_file_thumbs`) | `is_homeowner_visible` → `shown_to_client_at` |
| `project_selections` | `project_selections`, `project_selection_options` | JSON options → rows |
| `homeowner_shared_assets` | `render_share_links` (+ `render_annotations`) | see map 17 |
| `variation_orders` | `quotes` (`kind = 'variation'`) | numbered VO-n per project |
| `project_invoices` | `project_invoices` | the paid state is worked out |
| `payment_records` | `project_payments` | four statuses + `trusted` |
| `credit_notes` | `credit_notes` | + `kind` (`overpayment`) |
| `client_portal_tokens` | none | `/pay/…` redirects |
| `studio_sequences` | settings `project_numbering`, `invoice_numbering`, `receipt_numbering`, `ticket_numbering` | numbering continues past the highest used |
| `purchase_orders` (not bills), `po_payments`, `po_activity_log` | `purchase_orders`, `purchase_order_lines`, `payments_out`, `lead_events` | |
| `purchase_orders` with `source = 'bill'` | `supplier_bills` | their own table |
| `po_receipts` | `purchase_orders.delivered_at`, `delivered_by` | no photos |
| `expenses`, `expense_categories` | `expenses` (+ `repeat_*`), settings `expense_categories` | |
| `vendors` (+ UHD's contractor columns) | `vendors` (+ `is_contractor`, `trades_json`, `crew_capacity`, `code`) | |
| `project_contractor_assignments` (UHD) | `project_contractors` | |
| `finance_documents` | `project_invoices` (`kind = 'external'`), external `purchase_orders`, `cost_documents` / `lead_files` | |
| `commission_rules`, `commission_entries`, `commission_change_requests` | `commission_rules`, `commission_shares`, `commission_requests`, `commission_payouts` | entries are worked out |
| `accounting_connections`, `_mappings`, `_remote_links`, `_sync_queue` | `xero_links`, `xero_sync_log`, settings `xero` | tokens are yours to keep |
| `chart_of_accounts`, `journal_entries`, `journal_lines` | none | written, never read, in 1.0 |
| `homeowner_project_links` | `homeowner_lead_links` (primary), `homeowner_household_links` | map 24 §3.8 |
| `homeowner_notifications` | worked out + `portal_bell_reads` | don't port the history |
| `studios.portal_slug`, `studios.settings.portal` | `portal_addresses`, settings `portal`, `portal_sections`, `portal_welcome` | |
| `conversations`, `conversation_participants`, `messages`, `conversation_files` | `project_messages`, `lead_messages`, `conversations`, `conversation_participants`, `conversation_messages`, `conversation_files`, `chat_reads`, `conversation_prefs` | split by who may read it |
| `escalations`, `escalation_comments` | `project_tickets`, `ticket_replies` | |
| `project_floor_plans`, `floor_plan_annotations`, `_annotation_comments`, `_approvals` | `project_floor_plans`, `floor_plan_marks`, `floor_plan_comments`, `floor_plan_confirmations` (+ `floor_plan_pictures`, `floor_plan_seen`) | |
| `floor_plans`, `floor_plan_versions` | `space_layouts`, `space_layout_versions`, `space_layout_shares` | 3D layouts |
| none (the browser's storage) | `project_compliance`, settings `compliance_studio` | |
| `project_snag_items`, `project_templates`, `studio_portal_pages` | none | unused in 1.0 |

### AI, plans and the platform

| 1.0 table | 2.0 table | Note |
| --- | --- | --- |
| `studios.settings.visualizerWorkspace` (JSON) | `visualizer_designs` + `library_folders` | one design per lead, plus personal designs |
| `project_rooms` | `project_rooms` | + `design_id`, `detection_json`, `state_json`, `state_rev`, `assets_json`, `prior_photo_json` |
| `render_jobs` | `render_jobs` + `render_images` | pictures move out of `variants_json` |
| `render_share_links` | `render_share_links` | + `design_id`, `lead_id`, `revoked_at`, `message` |
| `render_consultation_requests` | `render_consultation_requests` | kind call back · note · favourite; `task_id` |
| `studio_materials` | `studio_materials` | + `folder_id`, `price_book_item_id`, `updated_by` |
| `studio_material_catalog` | a data file (`lib/visualizer/data/catalogue.gen.ts`) | |
| `plans`, `subscriptions`, `invoices` | same names | `invoices` = OpenMaison's bill to the studio |
| `studio_credit_balances`, `credit_ledger`, `studio_member_credit_caps` (plg) | same names | the balance always equals the ledger's sum |
| `billing_checkout_sessions` (plg) | `billing_checkout_sessions` | |
| `billing_webhook_events`, `billing_trial_redemptions` (plg) | none | the adapter removes duplicates; a trial = `subscriptions.trial_ends_at` |
| none | `credit_requests` | a member asks the Owner |
| `nudge_state` (plg) | `nudge_state` | same columns |
| none (the browser's session) | `maison_questions` | Maison AI's Recent |
| none (Qanvast's API, live) | `marketplace_categories`, `_brands`, `_banners`, `_deals`, `_products`, `_deal_asks` | the studio's copy of the feed |
| `market_insights` | `market_insights` | id `mi-<1.0 id>`; `removed_at` |
| `beta_signups`, `contact_messages`, `newsletter_subscribers` | same names | |
| `anon_workspaces` (plg) | `anon_workspaces`, in its own file `<db>.trial.db` | never in a studio's database |
| `platform_config` | settings `platform` + env `OPENMAISON_SIGN_UPS_PAUSED` | |
| `studios.settings.features` | none | each flag became a rule or a setting (card A12) |
| none | `notification_outbox`, `inbound_messages` | the delivery layer |

---

## 7. Stand-ins: the integration checklist

2.0 runs with no outside services. Each one is stood in for, and each stand-in says so where a studio meets it ("Simulated on
this prototype"). **`lib/services/registry.ts` is the source**, with 43 entries. A **provider** is plugged in with its
`set…` call in `lib/services/install.ts`. A **rule** (where 1.0 asked an AI model) is swapped by replacing the one function
named. Keep the charge before the work, the refund on failure, the proposal-first answer and the Undo where they exist.

| Service | What 2.0 does today | Plug in the real one with | Env names | 1.0 used |
| --- | --- | --- | --- | --- |
| delivery | Every message is written to the outbox; none is sent | `setDeliveryAdapter` · `lib/notifications/delivery.ts` | `RESEND_API_KEY`, `D360_API_KEY`, `D360_API_BASE`, `D360_DEFAULT_TEMPLATE`, `D360_DEFAULT_TEMPLATE_LANG`, `NOTIFY_ALLOWLIST` | Resend, 360dialog |
| email-html | The branded email is built only when an adapter asks | `emailHtml` · `lib/notifications/email-html.ts` | | `notifications/templates/render.ts` |
| whatsapp-webhook | A real, guarded route; nothing calls it yet | `applyReceipts`, `fileInbound` · `app/api/webhooks/whatsapp/route.ts` | `WHATSAPP_WEBHOOK_SECRET`, `WHATSAPP_CENTRAL_WEBHOOK_SECRET` | `api/webhooks/whatsapp` |
| sign-in | No code is sent; any six digits pass | `setSignInProvider` · `lib/auth/provider.ts` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `TWILIO_PHONE_NUMBER`, `QANVAST_API_URL` | Twilio Verify |
| studios | One database file per new studio | `setStudioProvisioner` · `lib/studios/create.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENMAISON_SIGN_UPS_PAUSED` | staff made studios in `/admin` |
| payments | A demo checkout; no card is taken | `setPaymentProvider` · `lib/credits/payments.ts` | `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY` (see §9) | Dodo (plg only) |
| accounting | Xero connect and pushes are simulated | `setAccountingProvider` · `lib/finance/xero-server.ts` | `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI` | `src/lib/accounting/` |
| storage | A file's bytes are stored as data URLs in rows | `setFileStore` · `lib/leads/file-store.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase Storage |
| pdf | Download PDF opens the browser's print | `setPdfRenderer` · `lib/services/pdf.ts`, and build with `NEXT_PUBLIC_PDF_DOWNLOADS=1` | `INTERNAL_RENDER_ORIGIN`, `CHROMIUM_BINARY_URL` | `api/quote-pdf/render` |
| calendar | Not synced; invites carry an .ics file | `setCalendarSync` · `lib/meetings/calendar-sync.ts` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | an unmerged branch only |
| transcription | Turns nothing into words | `setTranscriber` · `lib/meetings/transcribe.ts`, and build with `NEXT_PUBLIC_TRANSCRIPTION=1` | `COPILOT_STT_PROVIDER`, `DEEPGRAM_API_KEY`, `SPEECHMATICS_API_KEY` | Deepgram, Speechmatics |
| feeds | Nothing is fetched; sample rows, marked as samples | `setFeedSource` · `lib/services/feeds.ts` | `QANVAST_API_URL` | Qanvast's API, `api/news` |
| scheduler | No scheduler; each job runs where it is read | call `/api/cron/<job>`; `runJobs` · `lib/services/sweep.ts` | `CRON_SECRET` | `vercel.json` crons |
| lead-webhooks | A real route that makes the lead | `captureLead` · `lib/leads/capture.ts` | `NEXT_PUBLIC_INTAKE_URL` | `api/webhooks/leads/[token]` |
| lead-email | Receives nothing; *Simulate* plays one in | `captureLead('email', …)` · `lib/leads/capture.ts` | | |
| lead-meta | A stand-in page; *Simulate* plays one in | `captureLead('meta', …)` · `lib/leads/capture.ts` | | via webhooks |
| lead-gmail | A stand-in inbox; *Sync now* plays one in | `captureLead('gmail', …)` · `lib/leads/capture.ts` | `GOOGLE_CLIENT_*`, `GOOGLE_REDIRECT_URI`, `EMAIL_TOKEN_SECRET` | cron `poll-emails`, `gmail.ts` |
| qanvast | Sample Qanvast leads; returns go nowhere | `returnLead` · `app/leads/return-actions.ts` | `QANVAST_API_URL`, `NEXT_PUBLIC_QANVAST_COMPANY_ID` | Qanvast's APIs |
| qanvast-listing | The application is kept, sent nowhere | `setQanvastListingService` · `lib/qanvast-listing/service.ts` | `QANVAST_API_URL`, `QANVAST_WEBHOOK_SECRET` | `/verify` (saved nothing) |
| qanvast-listing-webhook | A real, guarded route; nothing calls it yet | `applyListingAnswer` · `app/api/webhooks/qanvast-listing/route.ts` | `QANVAST_WEBHOOK_SECRET` | |
| qanvast-account | Lead credits and reviews from demo records | `setQanvastAccountService` · `lib/qanvast-account/service.ts` | `QANVAST_API_URL`, `NEXT_PUBLIC_QANVAST_COMPANY_ID` | `api/qanvast/[...path]` |
| trial-bot-check | Every visitor is let through | `setBotCheck` · `lib/visualizer/trial/server.ts` | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Turnstile (plg) |
| trial-workspaces | A `<db>.trial.db` file beside the demo's | `setTrialStore` · `lib/trial/store.ts` | `TRIAL_TOOLS_ENABLED` | `anon_workspaces` (plg) |
| trial-limit-store | One server's memory | `setLimitStore` · `lib/visualizer/trial/server.ts` | `KV_REST_API_URL`, `KV_REST_API_TOKEN` | in memory |
| ai-ask | About 45 questions answered by rule | `readQuestion` · `lib/maison-ai/answer.ts` | `OPENROUTER_API_KEY` | `api/buddy/` |
| ai-drafts | Messages drafted by rule | `stageDraft` · `lib/maison-ai/drafts.ts` | `OPENROUTER_API_KEY` | the `draft_client_message` tool |
| meeting-reading | Notes and the brief by rule | `readMeeting`, `briefOf` · `lib/meetings/engine.ts` | `OPENROUTER_API_KEY` | `api/copilot/` |
| quote-draft | A first cut from the Price book | `draftPlan` · `lib/quotes/draft.ts` | `OPENROUTER_API_KEY`, `TAVILY_API_KEY` | AI Quote Drafter |
| writing | Five rewrites by rule, always proposed first | `proposeWriting` · `lib/writing/propose.ts` | `OPENROUTER_API_KEY` | the quote editor's AI actions |
| quote-pdf-reader | A text PDF by rule; scans are refused | `readQuoteText` · `lib/quotes/pdf-quote.ts` | `OPENROUTER_API_KEY` | `api/quote-xrays/` |
| template-reader | A layout by rule | `readLayout` · `lib/templates/recreate.ts` | `OPENROUTER_API_KEY` | the template recreator |
| quote-digitizer | Sheets and text PDFs by rule; credits refunded on failure | `readQuoteUpload` · `lib/quotes/read-upload.ts` | `OPENROUTER_API_KEY` | Quote Digitizer |
| book-match | Matches lines to the Price book by words | `matchLines` · `lib/company/price-book-match.ts` | | |
| bill-reader | A bill PDF's text by rule | `readBill` · `lib/finance/bill-reader.ts` | `OPENROUTER_API_KEY` | the bill reader |
| floor-plan-rooms | Rooms from the flat type; the paper by rule | `roomsForType` · `lib/planner/photo.ts`; `findPaper` · `lib/planner/straighten.ts` | `OPENROUTER_API_KEY`, `ROBOFLOW_API_KEY` | the floor-plan 3D tools |
| describe-piece | The closest catalogue piece | `describePiece` · `lib/planner/describe.ts` | `MESHY_API_KEY` | a 3D generator |
| image-model | A curated engine running in the browser | `runPass`, `setImageIO`, `guardRender` · `lib/visualizer/engine/run.ts` | `OPENROUTER_API_KEY`, `FAL_KEY` | `api/render/` |
| room-reading | Sample rooms are traced; any other photo reads as Walls · Floor · Ceiling | `fallbackDots` · `lib/visualizer/engine/fallback.ts` | `OPENROUTER_API_KEY` | `api/render/detect`, `segment` |
| depth (bench) | Worked out from the room's shape | `depthOf` · `lib/visualizer/spatial/depth.ts` | `OPENROUTER_API_KEY` | `api/render/depth` |
| reangle (bench) | Photo pixels moved by depth | `poseFor` · `lib/visualizer/spatial/moves.ts` | `OPENROUTER_API_KEY` | `api/render/reangle` |
| outpaint (bench) | Mirrored edges or a padded canvas | `extendRoom` · `lib/visualizer/spatial/extend.ts` | `OPENROUTER_API_KEY` | `api/render/outpaint` |
| orbit-video (bench) | A clip recorded in the browser | `recordCanvas` · `lib/visualizer/spatial/clip.ts` | `FAL_KEY`, `FAL_API_KEY` | `api/render/orbit-video` |
| suggestions | Replies, tasks, briefs, the suggested member, a draft schedule and *Refine*, all by rule | `suggestReplies`, `suggestForMilestone`, `projectBriefs`, `briefsFor`, `suggestMember`, `draftTimeline`, `refineNoteHtml` (each named in the registry) | | AI suggestions |

**Not in the registry, but also stand-ins:**
- the AI Visualizer's pictures (`lib/visualizer/images.ts`, `picture-store.ts`);
- the floor-plan pictures (`floor_plan_pictures`);
- Price book item photos (the `thumb` column).

All of these are stored in the database today and need object storage behind the same addresses. A 25 MB message file is held in
server memory until its last piece arrives; it needs multipart upload to storage.

### Switch these off for production

| What | Where | Set to |
| --- | --- | --- |
| The demo's standing session (a browser that never signed in acts as the studio owner) | `DEMO_STANDING_SESSION` in `lib/auth/paths.ts` | `false` |
| The trial running inside the demo | `TRIAL_IN_DEMO` in `lib/visualizer/trial/policy.ts` | `false` |
| View as › Studio plan (switches the plan for the demo) | `setDemoPlan`, and `lib/credits/demo-month.ts` | remove |
| The developers' bench and email preview | `OPENMAISON_DEV_PREVIEWS` | unset |
| The trials on the website | `TRIAL_VISUALIZER_ENABLED`, `TRIAL_TOOLS_ENABLED` | your call |
| Plan locks and upgrade nudges | `PLAN_GATING_DISABLED`, `UPGRADE_NUDGES_DISABLED` (1.0's names) | unset |

### The endpoints outside systems call

| Path | Who calls it | Guarded by |
| --- | --- | --- |
| `GET`/`POST /api/cron/run` (every job, every 5 minutes) | your scheduler | `Authorization: Bearer <CRON_SECRET>`; refuses everything in production while unset |
| `/api/cron/notification-scheduled`, `notification-digest`, `accounting-sync` | your scheduler, with 1.0's job names | the same |
| `/api/cron/repeats` (repeating expenses and the credits month), `/api/cron/feeds` | your scheduler, hourly | the same |
| `/api/cron/deleted-leads` | your scheduler, daily (Deleted Leads' 30 days; also inside `run`) | the same |
| `/api/cron/anon-sweep` (06:00), `/api/cron/anon-storage-gc` (08:00) | your scheduler, with plg's names | the same |
| `POST /api/webhooks/whatsapp?token=…` (+ `GET` for the challenge) | 360dialog / WhatsApp Cloud API | `WHATSAPP_WEBHOOK_SECRET` (unset = 503) |
| `POST /api/webhooks/payments` | the payment provider (plg used `/api/webhooks/dodo`) | the adapter; 404 while the demo checkout answers |
| `POST /api/webhooks/leads/<token>` | Zapier, Make, Typeform, Google Ads | the endpoint's token (+ an HMAC signature when keyed); 10 a minute |
| `POST /api/webhooks/qanvast-listing` | Qanvast | `Bearer <QANVAST_WEBHOOK_SECRET>` (unset = 503) |
| `GET /api/services` | your deploy checks: which services are still stand-ins, which env names are set | `Bearer <CRON_SECRET>` |
| `GET /api/health` | uptime checks | none (a database ping only) |

**Every public address must be in `PUBLIC_PATHS` (`lib/auth/paths.ts`).** That covers the client links, `/site`, `/hangout/…`,
`/meeting/…` and `/join/…`. Leave one out and visitors are sent to sign in.

**One studio per database, today.** A cron run serves only the open database, so run each job per studio. 1.0's `poll-emails`
has no 2.0 cron route; the Gmail adapter needs its own schedule. Daily summaries go at 8 AM server time, so set
`TZ=Asia/Singapore`.

---

## 8. Left out on purpose. Don't port these back

Each of these was Vicky's call, recorded in the audit named.

**Whole areas**
- **Platform admin** (`/admin`, `api/admin/*`): "you can ignore admin". A few operator jobs live in Qanvast Ops › Studios.
- **Languages** (`messages/`, `src/i18n`): on hold. 1.0 only ever translated 23 phrases.
- **Countries beyond Singapore** (`/uae-get-started`, `fx-rates`, multi-currency): on hold. Every amount is SGD.
- **Telemetry and analytics** (`usage_events`, rollups, GA4, Mixpanel, the Meta pixel, Clarity): no tracking.
- **Dark mode, themes, guided tours, the Home Screen choice:** parked.

**Leads and people**
- Journey mode, its evidence (`lead_artifacts`) and Lead Experience.
- Temperature (hot / warm / cold) and AI fit / intent scores.
- Archive and revive as a state of its own. An archived lead lands in Lost ("Archived in 1.0") and Resume brings it back; a delete is soft
  for 30 days, then for good.
- Renaming, adding or reordering stages; custom roles; per-member permission overrides (all on hold).
- Settings saved in 1.0 but never read: Lead Categories, `pipeline_stages`, AI Assignment Logic, Quote Sharing, `ads_enabled`,
  `id_buddy_enabled`.
- Raise Complaint and Promote; Hangout vouchers; SMS sign-in on the Hangout page.
- Maison AI writing records itself. It only proposes.

**Quotes and documents**
- A design stored on each quote. The quote points to a published template version instead.
- Per-entity quote templates, contract templates and T&Cs.
- The hard lock after Draft (Revise instead), approval thresholds and line status (Pending / Approved / Declined).
- Per-line waste %, per-line tax and a flat S$ line discount. The port folds these in.
- Good / Better / Best packages; sorting the Items table by a column head.
- Price tiers; SKU, tags, notes, order, sub-category and source on items; market rates, drift, suggestions and embeddings.
- Generation rules (Starter Quote); a round-off line; GST-inclusive printing (on hold).
- Emailing a composed contract PDF. The signing link goes on WhatsApp.
- X-Ray win / loss, an X-Ray PDF or public link, X-Ray settings.

**Projects and money**
- Archive / Unarchive a project, a second status, a Cancelled stage and health scores.
- The Draft set-up wizard and its gates.
- Payment % on milestones, payment-only markers, "one milestone in progress".
- Approval-type tasks (ProgressReview, InvoiceReview, VOApproval). An approval is a state on its record plus a bell row.
- Over-bill treatments, top-up invoices and the reconcile wizard. Use credit notes instead.
- Card, GIRO and paying online. Clients pay by bank transfer, PayNow, cheque or cash.
- The expense verification track; vendor kind and default markup; the AI PO-vs-quote compare.
- The double-entry journal. Xero keeps the ledger.
- Portal themes and layouts; automatic portal access for every lead with a phone; client to-dos; *Show chat history*.
- Ticket AI analysis and its Proactive Alerts (unbacked in 1.0). Accounts Setup's *Proactive Alerts* tab is a different thing: it is
  Settings › Projects › Alerts lead time (REG-1222).
- 3D: Render Tour, HD models and sun angle.
- The PO pipeline board.

**AI and platform**
- `NEXT_PUBLIC_OM_UI`, `NEXT_PUBLIC_QANVAST_OPS_UI`. 2.0 is that interface.
- 1.0's seeded Market Insights articles, because their figures can't be checked.
- The Sales report's generated demo data, because it would be a made-up record under a studio's name.
- Model bake-offs, prompt gyms and model pickers from the sandboxes.

---

## 9. Open questions: settle before you port these parts

| # | Question | Who decides |
| --- | --- | --- |
| 1 | **Quote revisions on `deployment/qanvast`** are separate quote rows (`quotes.revision_of`, migration 427). 2.0 keeps one quote and its earlier versions in `quote_versions`. No port rule is written yet. | Vicky |
| 2 | **1.0's `quotes.preview_token`.** Build step S02 maps it to `view_token` (view only); S04 maps it to `confirm_token` (the confirmation link). Decide which, or both. | Vicky |
| 3 | ~~1.0's `/sign/document/<token>` links~~ **Settled 19 Oct (S46D):** they go to `/sign/<token>` when a contract or set carries the token (the port keeps 1.0's request token in `contracts.sign_token`), else the studio's notice. A PDF in Files has *Send for signature*. | done |
| 4 | **A 1.0 member tagged only "accounting".** Map 12 lands them inactive, but it was written before 2.0 had an Accounting role. They should most likely become Accounting. | Vicky |
| 5 | **Dodo's env names.** 2.0 says `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY` and `/api/webhooks/payments`. plg reads `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`, `DODO_ENVIRONMENT`, `DODO_TOPUP_PRODUCT_ID`, `DODO_TOPUP_CURRENCY`, `DODO_CREDIT_ENTITLEMENT_ID`, `NEXT_PUBLIC_DODO_ENVIRONMENT` and serves `/api/webhooks/dodo`. Pick one set. | You (nothing visible) |
| 6 | **Price book item photos** have no storage seam in the registry (they are data URLs in `thumb`). Choose where they go with the other pictures. | You |
| 7 | **Accounting's refusal** is not the first line of every action family yet (build note S45C). Pages already refuse; some server actions rely on the page. | You, then Vicky reviews |
| 8 | **1.0's 394 furniture models** for the 3D planner wait for a content port. 2.0 has 42 drawn pieces. | Vicky |

---

## 10. New in 2.0: nothing to port

These have no 1.0 counterpart. Don't look for them in 1.0.

- **Shell:** Company as a panel, ⌘K search, the ? shortcuts panel, View as (demo only), first-run empty states, one loading
  ghost per page.
- **Leads:** Review imported leads, stage logs, studio tasks with no lead, task tags / comments / attachments / templates, Last
  contact and Next follow-up, the Marketing role, Meta Lead Ads and the website-form intake address.
- **Quotes:**
  - task templates, and folders in every library;
  - the confirmation link and the Confirmed status, and the client's picks of optional work;
  - line comments, the quote's Files, the owner-only Rebate column, *Below cost*, margin by category;
  - Priced after the contract, Units, the GST-rule stamp, the PayNow QR beside the schedule;
  - X-Ray corrections and Run again.
- **Contracts:** contracts as records, read-and-accept gates, Viewed, draw or type a signature, Automation as tasks, Ask for the
  deposit, the completion letter at handover.
- **Projects:**
  - *Needs you*, *Getting started*, and the Start, Mark done and Hand over sheets;
  - Reopen, payment Reverse, credit notes for overpayments;
  - a project activity log (`lead_events` with `project_id`; a port backfills it, map 24 §4);
  - per-project compliance, member capacity, contractors for every studio;
  - Company › Finance › To do, and supplier-bill approval;
  - portal address history, Paused, and *Getting it live*.
- **AI and platform:**
  - the services registry, `GET /api/services` and start-up warnings;
  - members asking the Owner for credits, credit alerts, auto top-up, Change seats;
  - Maison AI's Recent and its proposals;
  - the Marketplace's Add to my vendors and Add to Price book;
  - Market Insights' Industry News;
  - the trial carrying a visitor's photo into their new studio;
  - a client's WhatsApp reply filed in Messages (`inbound_messages`).

---

## 11. Rules that prevent most mistakes

1. **Integrate behind the data layer.** Each screen reads a typed shape from `lib/**/queries.ts` (for example `LeadDetail`,
   `LeadRow`, `CreditSummary`) and writes through server actions. Change what fills the shape and what the action does, and leave
   the component alone. If 1.0's data needs something the screen doesn't have, open the pull request with the data side and
   describe what the screen should show. Vicky designs it. (`CONTRIBUTING.md` §7)
2. **Who is signed in:** call `await sessionMemberId()` (`lib/db/session.ts`) before any transaction. Never read
   `members.is_you`.
3. **Who may see what is checked on the server, every time.** Leads go through `fetchViewer()` with `canSeeLead`,
   `visibleLeadIds` or `canOpenLead`. Pages refuse a role with `refusesPath`; workspace actions start with
   `workspaceRefusal()`, and quote and contract actions with `deskRefusal()`. Anything that shows cost reads `Viewer.costs`
   (`lib/quotes/cost-sight.ts`).
4. **A client page never gets cost, markup, rebate, vendor or internal ids.** Every client quote page reads `clientQuoteOf` /
   `clientSafe` (`lib/quotes/client-quote.ts`). Per-line prices reach the client only where the print shows them.
5. **The client portal reads the shared schedule snapshot** (`project_schedule_shares`), never live milestones. A port that writes
   only milestones shows the client nothing.
6. **A server action that is refused returns `{ error: <the rule> }`.** Never throw for a refusal: production hides thrown
   messages.
7. **Long strings travel inside one object.** Pictures and rich text go as `action(id, { … })`, never as a bare argument. React's
   decoder caps those at 1,000,000 characters.
8. **Migrations are additive only.** Run `npm run db:generate`, then `npm run db:migrate`. A new kind of record needs a line in
   Activity (`lib/leads/activity.ts`).
9. **Never write to anyone's `local.db` from a test.** Put the database on the same command:
   `DATABASE_URL=file:/tmp/test.db npx next start -p 3011`.
10. **Reuse the house pieces** (`components/om/*`) and `--om-*` tokens. Never copy a stylesheet. Run `npm run design:lint` and
    `npm run design:anatomy` before a pull request.
11. **Anything a user can see, read or feel is Vicky's lane:** screens, words, states, motion, flows and who may do what. Propose
    it; don't build it first. (`DESIGN-PRINCIPLES.md`, `AGENTS.md`)

---

## 12. Module by module

One card per 1.0 module. Short names used on the cards:
- **map NN** = `design-source/context/parity/NN-…` (the migration maps and audits; full list in §13);
- **outcome SNN** = `design-source/context/parity/30-pending-modules-build-2026-10-11/steps/outcome-SNN.md`;
- **services.md** = `design-source/context/parity/30-pending-modules-build-2026-10-11/services.md`.

1.0 API paths are under `src/app/api/`.

### Leads and people

#### L1 · Leads listing (1.0: Leads, list and kanban)
- **1.0:** `/leads`, `/leads/new`; `src/components/leads/{lead-list-table,lead-kanban-column,lead-kanban-card,new-lead-drawer}.tsx`; API
  `leads/records`, `leads/mutations/*`; tables `leads`, `lead_assignees`.
- **2.0:** Leads `/leads` (list, kanban, phone cards; `?new=1` opens Create New Lead). Code `app/leads/(list)/`,
  `app/leads/workspace.tsx`, `components/leads/`, `lib/leads/{queries,filters,view,listing-url,export}.ts`,
  `app/leads/actions.ts`. Tables `leads`, `lead_assignees`, `stage_logs`.
- **Changed:**
  - seven fixed stage columns replace bucket / status / sub-status;
  - no archive: Delete is soft (`deleted_at`, `delete_reason`), with a Deleted Leads sheet;
  - one Lead name field (the port joins First + Last);
  - budget in cents, phone as 8 digits;
  - a new lead nobody has opened shows a band (`seen_at`);
  - the Performance view moved to Reports (L18).
- **Left out:** temperature, the Hot filter, AI fit / intent scores.
- **Plug in:** the suggested member is by rule (`suggestMember`, `lib/leads/suggest.ts`).
- **Since 19 Oct (S46):** the Leads rail item counts the unseen new leads the viewer sees (→ `/leads?scope=unseen`); District is in the listing's search; Deleted Leads removes a lead for good after 30 days.
- **Read:** map 02 §1–§3; audit 01 §4.6 (how 1.0's states map).

#### L2 · Lead Details (1.0: the lead drawer)
- **1.0:** no page per lead. `src/components/leads/lead-detail-drawer.tsx` + `drawer-sections/*`, opened by `/leads?leadId=`; API
  `leads/records/[id]`, `leads/mutations/[id]/*`.
- **2.0:** `/leads/<id>`: Overview, then Tasks · Quotes · Contracts · Files · Notes & Logs · Meetings · Questionnaire · Activity
  (`/leads/<id>/<tab>`). `/leads?leadId=` redirects. Code `app/leads/[id]/`, `components/leads/detail/`, `lib/leads/detail.ts`
  (`fetchLeadDetail`), `lib/leads/stage-policy.ts` (`leadTabs`).
- **Changed:**
  - a drawer of sections became a page of tabs;
  - once Won with a live project, the lead's Tasks, Files, Notes & Logs, Questionnaire and Activity redirect to the project's
    (`carriesLeadTab`);
  - Maison AI never writes a lead itself; it opens the form or the Move stage window, filled in;
  - a commercial lead has `company_name` and `company_uen`; a second client lives in `client2_*`.
- **Left out:** the lead-level issuing entity (`company_id`). The entity is per quote and contract (Q15).
- **Plug in:** the AI brief (`lib/leads/briefs.ts`), Ask (`readQuestion`) and drafts (`stageDraft`), all by rule.
- **Read:** map 02; outcome S05; `design-source/context/consistency/02-one-home-audit-2026-10-08.md` N-10.

#### L3 · Stage movement (1.0: bucket / status / sub-status, Journey, Lead Funnel)
- **1.0:** API `leads/mutations/[id]/{status,close,engagement,follow-up,journey-step}`, `bulk-status`;
  `src/components/leads/journey/*`, `src/components/accounts/funnel-editor.tsx`; tables `leads` (`bucket`, `lead_status_code`,
  `sub_status_code`, `hold_restart_date`, `closed_reason_*`, `next_follow_up_*`), `studio_lead_funnel`, `lead_artifacts`.
- **2.0:** a lead's *Stage: X ▾* and the Move stage window; kanban drops; Settings › Lead management › Lead stages and Reasons. Code
  `components/leads/move-stage/*`, `lib/leads/{stage-policy,stage-data,stage-notify,won-on-signing}.ts`, `moveStage` in
  `app/leads/actions.ts`. Tables `leads.stage`, `stage_logs` (one payload per step), `lead_tasks` (follow-ups); settings
  `stage_movement`, `lead_stage_rules`, `lead_reasons`.
- **Changed:**
  - map each 1.0 position with audit 01 §4.6 and write the stage logs each stage needs;
  - Linear (the default) or Flexible; nothing moves backwards;
  - On Hold and Lost are parked stages, and their logs hold the follow-up, the reason and the competitor;
  - `next_follow_up_*` becomes a Follow-up task;
  - `first_assigned_at`, `first_outreach_*` and `signed_at` are worked out, not stored;
  - the server refuses a step with missing fields (`stageRefusal`).
- **Left out:** Journey mode, its evidence and Lead Experience; editing the stage list (on hold).
- **Read:** audit 01 §4.6 and DEF-01…06; map 02 §2–§3; outcome S05.

#### L4 · Tasks (1.0: Tasks)
- **1.0:** `/tasks`; `src/components/tasks/*`; API `tasks/records/*` (including quote approvals as tasks); tables `tasks`,
  `task_assignees`.
- **2.0:** Tasks `/tasks`; a lead's Tasks tab; a project's Tasks. Code `app/tasks/`, `components/tasks/tasks-workspace.tsx`,
  `components/leads/tasks/*`, `lib/leads/{tasks,task-filters,task-links}.ts`, `app/leads/tasks-actions.ts`. Tables `lead_tasks`
  (`lead_id` null = a studio task; kinds General · Call · Follow-up; `external_*`, `meeting_id`, `contract_id`), `task_assignees`,
  `task_comments`, `task_attachments`, `task_tags`, `tags`, `task_templates`, `template_tasks`.
- **Changed:**
  - quote approvals are not tasks; they live on the quote (Q2);
  - a follow-up is a dated task of kind Follow-up, for the lead's members.
- **Since 19 Oct (S46):** Tasks says "n approvals wait for you on the Dashboard" when they do; an *Upcoming* chip beside Overdue · Due today.
- **Read:** map 02 §1 (`tasks`) and §3.

#### L5 · Notes & Logs, Files, Activity (1.0: outreach attempts, lead files, the activity log)
- **1.0:** `drawer-sections/{files-section,activity-log-section}.tsx`, `journey/outreach-attempts.tsx`; API
  `lead-outreach-attempts/*`, `lead-files/*`, `leads/mutations/[id]/activity-log`; tables `lead_outreach_attempts`, `lead_files`,
  `lead_activity_log`, `leads.notes`.
- **2.0:** `/leads/<id>/notes`, `/leads/<id>/files` (+ the viewer `/leads/<id>/files/<fileId>`), `/leads/<id>/activity`. Code
  `components/leads/{notes,files,activity}/*`,
  `lib/leads/{notes,note-model,contact-fill,files,file-model,file-store,activity,events}.ts`,
  `app/leads/{notes,files}-actions.ts`. Tables `lead_notes` (kind `note` or `contact`), `note_attachments`, `lead_files` (+ folders,
  trash, `shown_to_client_at`), `file_comments`, `lead_file_images`, `lead_file_thumbs`, `lead_file_renders`, `lead_events`.
- **Changed:**
  - an outreach attempt becomes a contact log plus the Contacted stage log (vocabulary in `lib/leads/enums.ts`);
  - Activity is worked out from every table;
  - Files gain folders, a trash with Undo, comments and a viewer.
- **Plug in:**
  - file bytes are stored in the database → `setFileStore` (`lib/leads/file-store.ts`);
  - Auto Fill reads by rule → `readContactFile` (`lib/leads/contact-fill.ts`).
- **Since 19 Oct (S46):** the lead's email is a mail link.
- **Read:** map 02 §1; services.md › storage.

#### L6 · Questionnaire (1.0: scope questions and answers)
- **1.0:** `src/components/settings/scope-form-builder.tsx`; API `scope-questions/records`, `leads/[id]/scope-answers`,
  `leads/[id]/send-questionnaire`; tables `studio_scope_questions`, `homeowner_scope_responses`, `_history`.
- **2.0:** `/leads/<id>/questionnaire`; Company › Questionnaire `/company/questionnaire` (the bank). Code
  `components/leads/questionnaire/*`, `lib/leads/{questions,question-model,answer-history}.ts`,
  `app/leads/questions-actions.ts`, `components/company/questionnaire-view.tsx`, `lib/company/{question-bank,scope-questions}.ts`.
  Tables `studio_scope_questions`, `questions` (per lead; `answered_by`, `required`), `question_answer_history`.
- **Changed:**
  - a new lead copies the bank's enabled questions; an older lead takes them with `addStudioQuestions`;
  - `askClient` only records the ask, and the client answers in the portal.
- **Left out:** the 5-minute ask throttle.
- **Read:** map 02 §1; map 12 §2.

#### L7 · Imports (1.0: CSV import, document fill)
- **1.0:** `src/components/leads/{csv-import-dialog,lead-document-import}.tsx`; API `leads/parse-document`,
  `leads/mutations/{dup-check,merge-duplicate}`; duplicate flags on `leads`. plg adds `imports` / `import_rows` (a back-port of
  2.0).
- **2.0:** Leads › Import → Review imported leads; past imports at `/leads/imports`; the lead form's *Fill from a document*. Code
  `components/leads/{import-wizard,review-sheet}.tsx`, `app/leads/imports/*`,
  `lib/leads/{import-fields,import-values,homematch,document-fill}.ts`, `lib/xlsx.ts`, `lib/pdf-text.ts`; `importLeads`,
  `mergeImportRow`, `findDuplicateLead`. Tables `imports`, `import_rows`.
- **Changed:**
  - a duplicate waits in Review as an `import_rows` row, not as a flag on `leads`;
  - a merge fills every empty field;
  - XLSX, CSV and Homematch PDFs are read in the browser.
- **Plug in:** *Fill from a document* reads by rule → `readLeadText` (`lib/leads/document-fill.ts`).
- **Read:** map 02 §2–§3.

#### L8 · Lead capture and Company › Integrations (1.0: Lead Webhooks, Email Lead Sources)
- **1.0:** Accounts › Lead Webhooks; personal Settings › Email Lead Sources; API `webhooks/leads/[token]`,
  `webhooks/leads/endpoints/*`, `email/*`, `cron/poll-emails`; tables `lead_webhook_endpoints`, `lead_webhook_log`,
  `email_connections`, `email_sync_log`.
- **2.0:** Company › Integrations `/company/integrations`: Qanvast, the website form by email, Meta Lead Ads, Webhooks, Email lead
  sources, Calendar invites and Xero. Code `components/company/integrations-view.tsx`, `app/leads/capture-actions.ts`,
  `lib/leads/{capture,webhook-payload}.ts`, `app/api/webhooks/leads/[token]/route.ts`. Data: settings `lead_capture`; each arrival
  is a one-row import.
- **Changed:**
  - endpoints and the inbox are JSON on one settings row, not tables;
  - the webhook route is real, with 1.0's field aliases and HMAC, 10 a minute per endpoint;
  - a phone number already on file waits in Review.
- **Plug in:** Gmail, Meta and the email intake → `captureLead('gmail' | 'meta' | 'email', …)` (`lib/leads/capture.ts`).
- **Read:** map 12 §2; services.md › lead-webhooks, lead-gmail, lead-meta, lead-email.

#### L9 · Qanvast: Return Lead and Qanvast Ops (1.0: refund requests, Qanvast Ops)
- **1.0:** `src/components/leads/return-lead-dialog.tsx`, API `leads/mutations/[id]/refund-request`; `/qanvast-ops/leads`, `/credits`,
  `/reviews` (credits and reviews are on qanvast only); API `qanvast/[...path]`, `qanvast/sync-leads`; tables `refund_requests`,
  `refund_reasons`.
- **2.0:** a Qanvast lead's ⋮ › Return Lead; rail › Qanvast Ops: Leads `/qanvast-ops`, Studios, Lead credits, Reviews and Hangouts.
  Code `components/leads/return/*`, `app/leads/return-actions.ts`, `lib/leads/{returns,return-model,qanvast}.ts`,
  `app/qanvast-ops/*`, `components/qanvast/*`, `lib/qanvast-account/*`, `lib/platform.ts`. Tables `lead_returns` (+ `sub_reasons`,
  `detail`, `appeal_of`), `return_attachments`, `leads.qanvast_lead_id`; settings `platform`.
- **Changed:**
  - the seven reasons are code (`return-model.ts`);
  - the return window is shown, not enforced;
  - an appeal is a new return that names the rejected one;
  - Studios holds OpenMaison's per-studio switches (portal off, messages paused);
  - Qanvast Ops follows Who sees leads.
- **Left out:** Raise Complaint and Promote.
- **Plug in:**
  - returns go nowhere → `returnLead`;
  - credits, reviews and rank come from demo records → `setQanvastAccountService`.
- **Read:** map 02 §1; outcome S41b5; services.md › qanvast, qanvast-account.

#### L10 · Hangouts and public profiles (1.0: Hangouts, ID portfolio profiles)
- **1.0:** `/hangouts/[eventId]`, `src/app/admin/hangouts/**`, API `hangouts/**`, `id-profile`, `id-profiles/records/*`; tables
  `hangout_*` (9), `id_profiles`, `id_portfolio_projects`, `id_portfolio_images`.
- **2.0:**
  - screens: Qanvast Ops › Hangouts (Plan · Chats · How it went); the public booking page `/hangout/<token>`; the public profile
    `/company/members/<id>/profile`;
  - code: `app/qanvast-ops/hangouts/*`, `app/hangout/[token]`, `components/hangouts/*`, `lib/hangouts/*`, `lib/portfolio/*`;
  - tables: the `hangout_*` six, `member_portfolio_projects`, `member_portfolio_pictures`, `members.portal_*`.
- **Changed:**
  - only the studio's side is built;
  - a booking becomes a lead through `importLeads` (source Hangout);
  - a chat writes the lead's meeting and a follow-up task.
- **Left out:** the staff console (Platform admin), SMS sign-in on the homeowner page, vouchers.
- **Plug in:** events are sample feed rows → `setFeedSource({ hangouts })`.
- **Read:** outcome S27.

#### L11 · Notifications (1.0: Notifications)
- **1.0:** the bell; `/settings/notifications`; API `notifications/*`, `cron/{notification-digest,notification-scheduled}`;
  `src/lib/notifications/*`; tables `notifications`, `notification_preferences`, `notification_templates`.
- **2.0:**
  - screens: the bell panel; Settings › Notifications (+ Sent messages); Your profile › Your notifications;
  - code: `components/shell/notifications-panel.tsx`, `lib/notifications/*`, `app/notifications/*-actions.ts`;
  - tables: `notifications`, `notification_outbox`, `inbound_messages`; settings `notification_rules`, `message_templates`;
    `members.notice_*`.
- **Changed:**
  - due, untouched and hold-ended rows are worked out on read (`derivedDue`), not stored;
  - a 1.0 preference category maps to its family's events;
  - email and WhatsApp follow the In-app setting;
  - each member has a daily summary and a personal mute.
- **Plug in:**
  - no message leaves → `setDeliveryAdapter`;
  - timed jobs → `/api/cron/*`;
  - WhatsApp receipts → `app/api/webhooks/whatsapp/route.ts`.
- **Read:** map 02 §1; map 12 §2; outcome S18; services.md › delivery, scheduler.

#### L12 · Members, invitations and Your profile (1.0: Team Members, personal Settings)
- **1.0:** Accounts › Team Members (`src/components/settings/{team-settings,invite-member-form,member-signature-card}.tsx`);
  `/settings`; API `studio/members/*`, `identity/*`, `invitations/*`, `member-signatures`; tables `studio_members`, `profiles`,
  `studio_invitations`, `studio_member_requests`, `member_signatures`.
- **2.0:**
  - screens: Company › Members `/company/members`; `/join/<token>`; Your profile `/profile`;
  - code: `components/company/members-view.tsx`, `app/company/members-actions.ts`,
    `lib/company/{members,member-rules,invitations,your-profile,preferences}.ts`, `app/join/*`, `app/profile/*`;
  - tables: `members`, `studio_invitations`.
- **Changed:**
  - three 1.0 tables become one `members` row;
  - removing a member deactivates them (`is_active`), and their records keep the name;
  - `leads.owning_manager_id` becomes `members.manager_id`;
  - invitations stay open 30 days; seats are named but never refused.
- **Left out:** Studio Region, Ads & Promotions, Home Screen, Appearance, Theme Skins, Guided Tours.
- **Plug in:**
  - invitation messages → `setDeliveryAdapter`;
  - the join code → `setSignInProvider`.
- **Read:** map 12 §2 and §4 (port order); outcomes S01, S09.

#### L13 · Roles & access (1.0: Roles & Permissions, cost visibility, the manager flag)
- **1.0:** `src/components/accounts/role-editor.tsx`; API `studio-config/{roles,role-permissions,member-overrides}`;
  `src/lib/access-control.ts`; cost visibility on qanvast only (`src/lib/cost-visibility.ts`); tables `studio_roles`,
  `studio_members` (`tags`, `role_id`, overrides).
- **2.0:**
  - screens: Settings › Roles & access (Who sees leads, Who sees costs and margins, Who may do what); a member's role is set on
    Company › Members;
  - code: `lib/settings/{roles,permissions,cost-visibility,desk}.ts`,
    `lib/leads/{assign-policy,visibility}.ts`, `lib/quotes/cost-sight.ts`;
  - data: `members.role`, `members.manager_id`; settings `lead_visibility`, `cost_visibility`; `kept_line_costs`.
- **Changed:**
  - six fixed roles: Owner, Admin, Manager, Designer, Marketing and Accounting;
  - 1.0's tags map by priority: owner > admin > manager > id (Designer);
  - the rules are enforced on the server, and *Who may do what* is worked out from them;
  - cost sight is one switch each for Admin, Manager, Designer and Accounting;
  - Marketing is new in 2.0.
- **Left out:** the custom roles editor and per-member overrides (on hold).
- **Read:** map 12 §2–§3; outcomes S41b1, S44O; map 28's `build/outcome-P-I.md` (Accounting). Open: §9 #4.

#### L14 · Settings and Company › Profile (1.0: Accounts Setup)
- **1.0:** `/accounts?tab=…` (9 groups, 44 entries), `/accounts/roles`; API `studio-config/*`, `lead-config/*`,
  `studio-companies/records`; tables `studios` (+ `settings` JSON), `studio_taxonomies`, `studio_companies`, `lead_custom_fields`,
  `lead_custom_field_values`.
- **2.0:**
  - screens: Settings `/settings?section=…` (Roles & access, Lead management, Meetings, Projects, Quotes & pricing, Finance,
    Notifications); the Company panel: Profile (details, issuing entities, bank, registrations, review link, Listed on Qanvast),
    Members, Questionnaire, Templates, Price book, Integrations, Reports;
  - code: `app/settings/*`, `lib/settings/{modules,types,queries}.ts`, `components/company/{profile-view,company-shell}.tsx`,
    `lib/company/{sections,entities,custom-fields}.ts`;
  - data: `settings` (one JSON value per key), `lead_custom_fields`, `lead_custom_field_values`.
- **Changed:**
  - the rules live in Settings and the records in Company;
  - every setter checks Owner or Admin (`assertRunsStudio`);
  - each old `/accounts?tab=` lands on its 2.0 card (`OLD_ACCOUNTS_TABS` in `lib/links/old-addresses.ts`);
  - a rename carries its records (`renameLeadSource`, `editLeadReason`, `renameTrade`).
- **Left out:** Lead Experience, Lead Categories, Pipeline Stages, AI Assignment Logic, Quote Sharing, Chat Identity, the Project
  Types editor, region and currency.
- **Since 19 Oct (S46):** every Settings module head points to Your profile (1.0's personal Settings).
- **Read:** map 12 (all of it; §4 is the port order); audit 11 §9; outcome S14.

#### L15 · Listed on Qanvast (1.0: Verify)
- **1.0:** `/verify` (a form that saved nothing); `studios.verification_status`, `studio_verifications`.
- **2.0:**
  - screens: Company › Profile › Listed on Qanvast (`/verify` redirects there);
  - code: `components/company/qanvast-listing-{card,dialog}.tsx`, `lib/qanvast-listing/*`, `app/company/listing-actions.ts`,
    `app/api/webhooks/qanvast-listing/route.ts`;
  - tables: `studio_verifications`, `studio_verification_files`.
- **Changed:** a real application with four states: Not applied · Waiting for Qanvast · Needs changes · Listed.
- **Plug in:** nothing is sent yet → `setQanvastListingService`.
- **Read:** outcome S37.

#### L16 · Signing in, signing up and setting up (1.0: /login, /onboarding, /studio-setup)
- **1.0:** `/login`, `/onboarding`, `/studio-setup` (a forced 7-step wizard); API `auth/*`, `studio-setup`, `admin/studios` (staff made
  studios); tables `auth_sessions`, `otp_rate_limits`.
- **2.0:**
  - screens: `/sign-in` (mobile or email, then a 6-digit code); `/sign-up` (Start your studio, on Free); Settings › Roles & access
    › Set up your studio; a first-visit welcome. The old three addresses redirect;
  - code: `app/sign-in/*`, `app/sign-up/*`, `components/auth/*`, `lib/auth/*`, `proxy.ts`, `lib/db/session.ts`, `lib/studios/*`,
    `lib/studio-setup/*`;
  - data: `studio_sessions`; settings `studio_setup`.
- **Changed:**
  - sign-up is self-serve;
  - set-up is a checklist ticked by the studio's own records, never forced;
  - a no-account trial is claimed into the studio at sign-up (A9).
- **Plug in:**
  - codes → `setSignInProvider`;
  - tenancy → `setStudioProvisioner`;
  - sign-in tries are counted in memory → `takeTry` (`lib/auth/limit.ts`);
  - `DEMO_STANDING_SESSION = false`.
- **Read:** outcomes S08, S30, S31, S43A.

#### L17 · Dashboard (1.0: Dashboard, chat-first and Classic)
- **1.0:** `/dashboard`; `src/components/dashboard/{chat-first-home,home-widgets,recent-updates-feed}.tsx`; API `news`.
- **2.0:**
  - screens: Dashboard `/dashboard`; `/` opens it for every role but Accounting, who land on Company › Finance;
  - code: `app/dashboard/`, `components/dashboard/*`, `lib/dashboard/*`, `homeOfRole` in `lib/settings/roles.ts`.
- **Changed:**
  - one page, with Maison AI's Ask box on top;
  - every row and tile opens its own home;
  - tiles per role, including UHD's Sales, Response time and Contractors.
- **Left out:** the Home Screen choice and the chip marquee.
- **Plug in:**
  - RSS headlines → `setFeedSource({ fetchText })`;
  - Ask → `readQuestion`.
- **Since 19 Oct (S46):** a *Tickets* tile (the open tickets waiting on the studio) beside the others.
- **Read:** outcomes S22, S45A.

#### L18 · Reports › Leads and Studio health (1.0: Performance view, Response time, Studio Health; UHD's Sales reports)
- **1.0:** `src/components/leads/{lead-performance-view,lead-response-time-card}.tsx`, API `leads/tat-report`; Sales reports on
  `urbanhomedemo` only (`src/lib/leads/sales-reports.ts`); Studio Health `/accounts/usage` with `usage_events`,
  `usage_daily_rollup`, `studio_last_active`.
- **2.0:**
  - screens: Company › Reports › Leads (Response time; Sales at `?report=sales`), Company › Reports › Studio health.
    `/leads/insights` and `/accounts/usage` redirect;
  - code: `components/company/reports/*`, `components/leads/insights/insights-view.tsx`,
    `lib/leads/{tat,insights,sales,sales-queries}.ts`, `lib/studio-health/*`;
  - tables: none of their own.
- **Changed:**
  - turnaround is worked out, not stamped;
  - Sales covers 1.0's six views, for Owners and Admins only, with money before GST;
  - Studio health counts the studio's own records.
- **Left out:** page-view and event tracking, the nightly rollup, the Sales report's generated demo data.
- **Read:** map 02 §3; outcomes S39, S45A.

#### L19 · Meetings and the Meeting Copilot (1.0: Meeting Co-Pilot, copilot analytics)
- **1.0:** `/tools/copilot-analytics`, `/copilot/share/[shareId]`; `src/components/copilot/*`; API `copilot/**`; 14 `copilot_*` and
  studio tables.
- **2.0:**
  - screens: Tools › Meeting Copilot `/meetings`; a lead's Meetings tab; a project's Client › Meetings; the client's
    `/meeting/<token>`; Settings › Meetings; Company › Reports › Meetings;
  - code: `app/meetings/*`, `app/meeting/[token]`, `components/meetings/*`, `lib/meetings/*`;
  - tables: `meetings`, `lead_tasks.meeting_id`, and four kept studio tables.
- **Changed:**
  - a held meeting is the lead's Met log (`stage_logs` payload `meetingId`);
  - cards, the shadow estimate and analytics are worked out on read;
  - metered at 25 credits per 10 minutes (1.0 published this price but never charged it).
- **Plug in:**
  - transcription → `setTranscriber` (+ `NEXT_PUBLIC_TRANSCRIPTION=1`);
  - calendar → `setCalendarSync`;
  - reading and the brief → `readMeeting`, `briefOf`.
- **Since 19 Oct (S46):** Meeting Copilot has an *Insights* door to Company › Reports › Meetings.
- **Read:** outcome S23; `steps/read-S23-copilot-before-during.md`.

#### L20 · Search and keyboard shortcuts (1.0: the top bar's search, a fixed key list)
- **1.0:** qanvast has `src/components/layout/topbar.tsx`, `src/lib/search.ts` and `src/lib/keyboard-shortcuts.ts`. plg carries a
  back-port of 2.0's palette.
- **2.0:**
  - screens: rail Search, ⌘K or the phone glyph opens the search; ? opens the shortcuts panel;
  - code: `components/shell/global-search.tsx`, `lib/global-search/*`, `app/search/actions.ts`, `lib/keys/*`,
    `components/shell/shortcuts/*`.
- **Changed:**
  - results follow Who sees leads;
  - G then I became G then M (Messages); G then E is gone; G then B was added.
- **Since 19 Oct (S46):** 1.0's G then I (→ Messages) and G then E (→ Tickets) work as quiet aliases; ⌘K knows 1.0's names (word maps in `lib/global-search/model.ts`).
- **Read:** `CLAUDE.md` › Map › *The studio-wide search*, *Keyboard shortcuts*.

### Quotes, contracts and the price book

#### Q1 · The quote editor (1.0: Quote Editor in the Quote Digitizer dialog)
- **1.0:** `src/components/leads/quote-digitizer-dialog.tsx`, opened from the lead drawer and `/tools/quote-digitizer`; API
  `quotes/{line-items,records,hierarchy,upload-image}`; tables `quotes`, `quote_line_items`, `leads.quote_metadata`,
  `quotes.payment_schedule` (JSON).
- **2.0:**
  - screens: a lead's Quotes tab → the editor `/quotes/<id>` (General Info, Items, Payment Schedule, Terms, Notes, Files,
    Signature, Activity) → Preview `/quotes/<id>/preview`;
  - code: `app/(editor)/quotes/[quoteId]/`, `components/quotes/editor/`, `lib/quotes/{editor,math,items-model,payments,text}.ts`,
    `app/quotes/*-actions.ts`;
  - tables: `quotes`, `quote_items` (sections are `kind = 'group'` rows; `parent_id` nests), `quote_payments`, `quote_files`,
    `quote_item_comments`, `kept_line_costs`.
- **Changed:**
  - discount, GST, entity, validity and NRIC are set on each quote; 1.0 kept them on the lead, so the port copies them onto every
    quote of the lead;
  - a line is cost + markup in cents;
  - 1.0's price types become Print as: `by_client` → `client`, `lump_sum` → a priced line, and the rest keep their word;
  - from the 15 Oct UAT: nested sub-sections, *Priced after the contract* (`priced_after`), "Words on this line" (`name_html`), a
    fixed payment row's label, and Remarks.
- **Left out:** per-line waste %, per-line tax and a flat S$ line discount (folded in by the port); the lock after Draft; sorting by a
  column head; line status.
- **Plug in:**
  - Download PDF → `setPdfRenderer`;
  - line photos and quote files stored in the database → `setFileStore`.
- **Read:** map 06 §1, §3; `quote-editor-1.0-inventory/D-data-model.md` §5; outcomes S44I, S44T.

#### Q2 · Approval, sending, revisions and versions (1.0: quote statuses, Quote Approval Rules, the version drawer)
- **1.0:** `quotes.status` (`src/lib/quote-status.ts`); `/accounts?tab=approval`; `quote-version-drawer.tsx`; API
  `quotes/versions`; tables `quote_status_history`, `quote_versions` (per lead). Qanvast only: a revision is a new quote row
  (`revision_of`, migration 427).
- **2.0:**
  - screens: the editor's header (Send ▾, the status, ⋮ › Revise · Version History · Compare), the approval bar and the sent
    banner;
  - code: `app/quotes/actions.ts` (`approveQuote`, `requestQuoteChanges`, `reviseQuote`, `restoreQuoteVersion`,
    `sendQuoteForConfirmation`), `components/quotes/editor/{quote-bars,version-history,revise-dialog}.tsx`,
    `components/quotes/send/`, `lib/quotes/{diff,policy,prepared}.ts`;
  - tables: `quotes` (the approval and send stamps), `quote_versions` (per quote).
- **Changed:**
  - six statuses: Draft → Sent for Approval → Approved → Sent to Client → Confirmed → Signed (the mapping is in the Q2 row of
    §5);
  - there is no transition log; the quote keeps the last submit, approval and request for changes;
  - one kept version per Revise;
  - an approver's own Send approves the quote.
- **Left out:** approval thresholds and a margin floor (saved but never enforced in 1.0); approver lists (Owners, Admins and one
  backup approver instead).
- **Read:** map 06 §1, §3; `quote-editor-1.0-inventory/D-data-model.md` §4.3; outcome S44F. Open: §9 #1.

#### Q3 · Upload a quote and Draft with Maison AI (1.0: Quote Digitizer upload, AI Quote Drafter)
- **1.0:** the upload in `quote-digitizer-dialog.tsx`; API `quotes/{parse,import,extract-layout,auto-match,chat}`;
  `src/lib/quote-parse/`, `src/lib/quote-agent/`; `quotes.parsed_doc_metadata`.
- **2.0:**
  - screens: Create Quote › Upload a quote (5 AI credits) and Draft with Maison AI (free);
  - code: `components/quotes/create-quote-modal.tsx`, `lib/quotes/{read-upload,upload,pdf-quote,draft,book-fill}.ts`,
    `createQuoteFromUpload`, `app/quotes/draft-actions.ts`.
- **Changed:**
  - CSV and XLSX are read for real, and a PDF from its own text;
  - a photo or a scan is refused and the credits come back;
  - lines land as cost with no markup;
  - the drafter builds from My Sections, then My Items by trade, and anything unpriced is S$0.
- **Plug in:**
  - reading a file → `readQuoteUpload`;
  - PDF text → `readQuoteText`;
  - the drafter → `draftPlan`.
- **Since 19 Oct (S46):** *Upload a quote* is findable: the empty Quotes list, ⌘K ("digitizer", Create › Upload a quote), `CreateQuoteModal opensOn="upload"`.
- **Read:** outcomes S04, S21, S12; services.md › quote-digitizer, quote-draft.

#### Q4 · Quote lists (1.0: the drawer's quotes, Finance › Operations)
- **1.0:** the lead drawer, `/finance/operations`, `src/components/finance/quotes-table.tsx`; API `quotes/records`.
- **2.0:**
  - screens: a lead's Quotes tab; Tools › Quotes `/quotes` (Archived and Deleted Quotes in the ⋮);
  - code: `components/quotes/list/quotes-workspace.tsx`, `components/leads/quotes/`, `lib/leads/{quotes,quote-filters}.ts`,
    `lib/quotes/list.ts`.
- **Changed:**
  - delete is soft, and only the creator, an Owner or an Admin may delete (`canDeleteQuote`);
  - there is no primary quote and no copy on the lead;
  - variation orders are filtered out (`kind = 'quote'`).
- **Left out:** `quotes.is_primary`, `leads.quote_status` and the `trg_sync_*` triggers.
- **Read:** map 06 §1–§2.

#### Q5 · Client quote pages (1.0: `/quote-preview/<token>`, `/quote/<token>` with a code)
- **1.0:** `src/app/quote-preview/[token]`, `src/app/quote/[token]`; API `quote-preview/[token]`, `quote/[token]`,
  `quotes/share-link`; `quotes.preview_token`, `preview_view_count`.
- **2.0:**
  - screens: Preview `/quotes/<id>/preview`; the client's view-only `/quote/<token>`; the confirmation link `/confirm/<token>`;
    the quote behind a signing link `/sign/<token>/quote`; link previews `/card/<kind>/<key>`;
  - code: `app/quote/[token]`, `app/confirm/[token]`, `components/quotes/{view,confirm,preview,send}/`,
    `lib/quotes/{client-quote,view-link,confirm}.ts`, `lib/link-cards/`;
  - tables: `quotes` (`view_token*`, `confirm_token`, `client_view_*`, `confirmed_*`), `quote_items.client_choice`.
- **Changed:**
  - one 1.0 token became two links: view only, and confirm (with the client's picks of optional work);
  - every client page reads `clientQuoteOf` / `clientSafe`;
  - Viewed is stamped only for a person, never for a chat app's preview fetch or a studio visit (`isStudioVisit`);
  - a client sees only an approved quote.
- **Left out:** link expiry (*Valid until* marks the quote but never blocks it); Quote Sharing settings (no code read them). A code
  before a quote link opens is not built.
- **Read:** outcomes S02, S04, S44F. Open: §9 #2.

#### Q6 · Quote templates and the template editor (1.0: Accounts › Document Templates, Quote Template Sandbox)
- **1.0:** `/accounts?tab=document-templates`, `src/components/accounts/quote-document-template-editor/`, the quote's Layout tab,
  `src/lib/quote-canva/`, `/tools/quote-template-sandbox`; API `document-templates`, `quote-theme-presets`, `studio-assets`,
  `quote-pdf`; tables `studio_document_templates` (type `quote_pdf`), `studio_quote_theme_presets`, `studio_assets`.
- **2.0:**
  - screens: Company › Templates › Quotes → the editor `/templates/<templateId>`; Brand kit `/company/templates/brand`; the
    quote's Template card;
  - code: `app/(editor)/templates/[templateId]`, `components/templates/{editor,render}/`,
    `lib/templates/{model,presets,covers,fonts,recreate,data,queries}.ts`, `app/company/templates-actions.ts`;
  - tables: `quote_templates` (design, draft and defaults as JSON, status, version), `quote_template_versions`, `studio_fonts`,
    settings `brand`.
- **Changed:**
  - a template is a design plus the settings a new quote starts with, published in versions, and a quote pins a version;
  - a quote never stores its own design; a 1.0 lead with its own layout becomes a template of its own;
  - layout is in millimetres (1.0's points × 0.3528);
  - Designers submit and Owners or Admins publish; templates delete softly.
- **Left out:** per-entity template rows; the system presets (now code); the sandbox (its address redirects).
- **Plug in:**
  - *Recreate from my quote* → `readLayout`;
  - PDF → `setPdfRenderer`.
- **Read:** map 04 §1–§4; outcomes S11, S44G, S44T.

#### Q7 · Template libraries: T&Cs & Notes, Payment schedules, Tasks (1.0: T&C templates, Payment Schedules)
- **1.0:** `studio_document_templates` type `tnc`; `/accounts?tab=payment-schedules`, `payment_schedule_templates`; no task
  templates.
- **2.0:**
  - screens: Company › Templates › T&Cs & Notes · Payment schedules · Tasks, each with its editor; in a quote, My Templates, Apply
    defaults and Save as template;
  - code: `components/company/templates/*-gallery.tsx` + `editors/`,
    `lib/company/{text-templates,payment-templates,task-templates}.ts`;
  - tables: `quote_text_templates`, `payment_templates`, `task_templates` + `template_tasks`, `library_folders`.
- **Changed:**
  - T&C tokens become 2.0 fields (`[Studio Name]` → `{studio_name}`), which print the quote's issuing entity;
  - payment schedules become one library of percent rows, and a fixed fee row lives on the quote.
- **Left out:** per-entity T&Cs; fixed-amount rows in a payment template.
- **Read:** map 04 §1; `quote-templates-1.0-inventory/D-data-model.md` D-50…D-54.

#### Q8 · Price book › My Items (1.0: Accounts › Price Book)
- **1.0:** `/accounts?tab=catalogue`, `src/components/accounts/price-book-*.tsx`; API `price-book/*`;
  `src/lib/price-book-{matcher,parser,suggester}.ts`; tables `studio_price_book`, `price_book_history`,
  `price_book_pricing_tiers`, `price_book_suggestions`, `vendors`. Qanvast only: `price_book_vendor_prices` (migration 425).
- **2.0:**
  - screens: Company › Price book › My Items `/company/price-book`; in a quote: Add Item, the Price book dialog, Save to My Items,
    Match N lines;
  - code: `components/company/price-book/`, `components/quotes/editor/items/{price-book-dialog,match-book-dialog}.tsx`,
    `lib/company/price-book*.ts`, `app/company/price-book-actions.ts`, `lib/port/price-book-vendor-prices.ts`;
  - tables: `price_book_items`, `price_book_changes`, `vendors`.
- **Changed:**
  - prices are cost + markup in cents;
  - the same product from two vendors is two entries, and 1.0's per-vendor prices port through the mapper that is already
    written (`portVendorPrices`, map 14 step 2a);
  - a Designer's new item is *proposed* until an Owner or Admin approves it;
  - Waste % applies only to a purchase order made from the quote.
- **Left out:** pricing tiers; SKU, tags, internal notes, order, sub-category and source; market rates, drift, suggestions,
  embeddings; binary `.xls`.
- **Plug in:**
  - matching lines → `matchLines`;
  - item photos are data URLs (§9 #6).
- **Read:** map 14 §2, §4 (incl. 2a), §5; outcomes S12, S44P, S45C.

#### Q9 · Price book › My Sections (1.0: Packages)
- **1.0:** `/accounts?tab=quote-templates` (labelled "Packages"), `/accounts?tab=quote-rules`; API
  `quotes/{assemblies,templates,generate-packages}`, `quote-generation-rules`; tables `studio_assemblies`,
  `quote_generation_rules`.
- **2.0:**
  - screens: Company › Price book › My Sections; in a quote, a section's ⋮ › Save section to My Sections;
  - code: `components/company/price-book/{price-book-sections,section-dialog}.tsx`, `lib/company/price-book.ts`,
    `saveSectionToPriceBook`, `insertPriceBookSection`;
  - tables: `price_book_sections`.
- **Changed:**
  - dollars become cents;
  - a saved section keeps hidden and optional lines, printing, highlight, rebate, photos and links;
  - a section that a live quote came from can't be deleted for good.
- **Left out:** platform packages; generation rules / Starter Quote.
- **Read:** map 04 §1; map 14 §2, §4.

#### Q10 · Contracts and contract templates (1.0: the Contract & Signing dialog, Signing Documents)
- **1.0:** `contract-flow-dialog.tsx`, `contract-preview-pane.tsx`, `src/components/leads/signing/`;
  `/accounts?tab=signing-documents`; API `contracts/*`, `signing-documents`; tables `studio_document_templates` (type `contract`),
  `studio_signing_documents`. 1.0 has no contract record.
- **2.0:**
  - screens: a lead's Contracts tab; Tools › Contracts `/contracts`; the editor `/contracts/<id>`; Company › Templates › Contracts
    (written or PDF);
  - code: `app/(editor)/contracts/[id]`, `app/contracts/`, `components/contracts/`, `lib/contracts/`,
    `app/company/contract-templates-actions.ts`;
  - tables: `contracts`, `contract_templates`, `contract_template_files`, `lead_tasks.contract_id`.
- **Changed:**
  - one `contracts` row per document;
  - `from_quote_id` is set when the contract is created, and a signed contract signs its quote (`signQuoteThrough`);
  - merge tokens become chips, and the HTML passes one allowlist on save and print.
- **Left out:** emailing a composed contract PDF; per-entity contract templates.
- **Plug in:**
  - print → `setPdfRenderer`;
  - PDF bytes → `setFileStore` (contract template files keep their own store).
- **Read:** map 08 §1–§3; outcomes S03, S44R.

#### Q11 · Signing links, bundles and the signing record (1.0: signature requests, `/sign/<token>`)
- **1.0:** `src/app/sign/[token]`; API `sign/[token]/*`, `quotes/{request,resend,cancel}-signature`, `member-signatures`;
  `src/lib/signing/`; tables `quote_signature_requests`, `member_signatures`. Qanvast only: sign any lead file
  (`lead_document_signature_requests`, `/sign/document/<token>`).
- **2.0:**
  - screens: `/sign/<token>`, `/sign/bundle/<id>`, `/sign/<token>/quote`; Send for digital signature / Send together; Settings ›
    Quotes & pricing › Contracts (the link window); Your profile › Your signature;
  - code: `app/sign/[id]/` (the segment holds the token), `components/contracts/sign/`,
    `lib/contracts/{link,snapshot,policy,status,deposit,casetrust}.ts`, `lib/quotes/{sign,signature}.ts`, `app/contracts/actions.ts`;
  - tables: `contracts` (token, expiry, the kept signed copy, `document_hash`, the signature and signer), `contract_bundles`,
    `members.signature_*`, `signature_consent`, `quotes.signed_amount_minor`.
- **Changed:**
  - a request for one document becomes one contract; a request for several becomes a bundle plus its contracts in order;
  - the hashes keep 1.0's algorithm;
  - a signed contract reads its kept copy, and a text changed while the client reads it refuses the signature;
  - the request's `token` → `sign_token` and `expires_at` → `sign_expires_at`; every send reopens the window (7 days by default);
  - a member's signature prints only with their consent.
- **Left out:** a 1.0 PNG signature as the record (2.0 stores an SVG path; the PNG is kept aside); the server-built signing packet.
- **Plug in:**
  - the signing code → `setSignInProvider`;
  - the executed PDF → `setPdfRenderer`;
  - sending the link → `setDeliveryAdapter`.
- **Since 19 Oct (S46):** 1.0's `/sign/document/<token>` lands (`app/sign/document/[token]`); a PDF's ⋮ in Files has *Send for signature* (pictures are refused: "Save it as a PDF first").
- **Read:** map 08 §1–§3; outcomes S03, S44Q. Open: §9 #3.

#### Q12 · Quote X-Ray (1.0: Tools › Quote X-Ray)
- **1.0:** `/tools/quote-xray` (the newest code is on plg); `src/components/quote-xray/`, `src/lib/quote-xray/`; API
  `quote-xrays/*`; tables `quote_xrays`, `brand_dossiers`, `market_quote_observations`, `platform_market_rates`.
- **2.0:**
  - screens: Tools › Quote X-Ray `/quote-x-ray`, a reading at `/quote-x-ray/<id>`;
  - code: `app/quote-x-ray/`, `components/xray/`, `lib/xray/*`;
  - tables: `quote_comparisons`.
- **Changed:**
  - only verdict rows port, with 1.0's figures, as `engine = 1`; nothing is re-run;
  - the engine is pure rules;
  - a Pro feature on Free, never metered.
- **Left out:** the share token, the public link and the PDF; win / loss; market rates and web brand dossiers; other currencies.
- **Plug in:** reading another studio's PDF → `readQuoteText`, fed into `readSide` (`lib/xray/reading.ts`).
- **Read:** map 10 §1, §3; outcome S21.

#### Q13 · Writing help (1.0: AI actions in the quote document editor)
- **1.0:** `quote-document-editor.tsx` (`handleAiAction`) → `api/buddy/chat`.
- **2.0:**
  - screens: Write with AI on Terms and Notes, descriptions, contract text, messages and templates;
  - code: `components/writing/writing-help.tsx`, `lib/writing/*`;
  - tables: none.
- **Changed:**
  - Improve, Shorten, Expand, Rewrite and Plain English, by rule;
  - always a proposal first, then Use these words and Undo;
  - only client-safe words reach it.
- **Plug in:** `proposeWriting` (`lib/writing/propose.ts`). Give a model no tools.
- **Read:** outcome S29.

#### Q14 · Settings › Quotes & pricing (1.0: Quote Categories, Approval Rules, Quote Sharing, Cost & Margin Visibility)
- **1.0:** `/accounts?tab=quote-categories` (`studio_quote_categories`), `?tab=approval`, `?tab=quote-sharing`,
  `?tab=cost-visibility`; `src/lib/{quote-numbering,quote-round-off,quote-calc}.ts`.
- **2.0:**
  - screens: Settings › Quotes & pricing (quote numbers, rounding, payment lock, backup approver, Prepared by, Trades, Units,
    approval, the Contracts link window, optional works); the GST rate in Settings and the GST switch per entity on Company ›
    Profile;
  - code: `app/settings/*`, `lib/settings/{types,queries,units,trades,cost-visibility}.ts`, `lib/quotes/{math,cost-sight}.ts`;
  - data: settings `quote_numbering`, `quote_rules`, `quote_approval`, `trades`, `trade_notes`, `units`, `contract_rules`,
    `cost_visibility`; `quotes.gst_rule`.
- **Changed:**
  - categories become Trades;
  - numbering is a counter that continues the `QT-` series;
  - rounding rounds each price to a step, never below cost;
  - GST is worked out once per rate, stamped at first send.
- **Left out:** approval thresholds, Quote Sharing's settings, a round-off line.
- **Read:** `OLD_ACCOUNTS_TABS` in `lib/links/old-addresses.ts`; outcomes S44O, S44I, S44P.

#### Q15 · Issuing entities (1.0: Accounts › Legal Entities)
- **1.0:** `/accounts?tab=legal-entities`; API `studio-companies/records`; tables `studio_companies`, `leads.company_id`.
- **2.0:**
  - screens: Company › Profile › Issuing entities; the quote's Issuing Entity; a contract's Issued by;
  - code: `components/company/profile-view.tsx`, `lib/company/entities.ts`, `lib/templates/model.ts` (`IssuingEntity`),
    `lib/contracts/issuer.ts`;
  - data: settings `brand.details.entities[]`; `quotes.issuing_entity`, `contracts.issuing_entity` (by name).
- **Changed:**
  - the entity is chosen per quote, not per lead, and linked by name;
  - a rename is carried everywhere;
  - an entity in use is retired, never removed;
  - each entity carries its logo, address, UEN, GST, bank, PayNow and SWIFT;
  - up to six entities.
- **Read:** map 04 §1, §3; map 08 §1; outcome S11.

### Projects, money and the client portal

#### P1 · Projects (1.0: Projects, project page, Create Project, Clone)
- **1.0:** `/projects`, `/projects/[projectId]` (Overview · Management · Finance · Files & Docs · Activity), `/projects/new`; API
  `projects/records/**`, `projects/[id]/*`, `project-aggregates/*`; tables `projects` (~62 columns + `timeline` JSONB),
  `project_assignees`, `project_files`.
- **2.0:**
  - screens: Projects `/projects` (List · Workload) and `/projects/<id>` with seven tab groups: Overview · Tasks · Schedule ·
    Client · Design · Money · Files & notes;
  - code: `app/projects/`, `components/projects/` (`projects-workspace.tsx`, `project-frame.tsx`, `overview/*`),
    `lib/projects/{queries,create,tabs,needs-you}.ts`, `app/projects/actions.ts`;
  - tables: `projects` + its `leads` row, `lead_assignees`, `lead_tasks`, `lead_files`, `lead_events`.
- **Changed:**
  - one record, two chapters: Won creates the project in the same press (`ensureProjectForLead`), and New project makes a `direct`
    lead;
  - the stages are Setting up · In progress · Completed;
  - there is no health score; *Needs you* says what is late;
  - who sees a project = who sees its lead, checked on the server.
- **Left out:** the Draft set-up wizard; approval-type tasks; `project_templates` and `project_snag_items` (unused in 1.0).
- **Read:** map 24 §1, §3.1–§3.2, §4, §5, §8 (D-1, D-2, D-13).

#### P2 · Schedule and schedule templates (1.0: Management › Milestones, Milestone Templates)
- **1.0:** the project's Milestones (Gantt); `/accounts/milestone-templates`; API `projects/records/[id]/timeline`,
  `projects/[id]/{notify-publish,payment-schedule}`; tables `projects.timeline` JSONB, `project_milestones`,
  `studio_milestone_templates`, `milestone_templates`, `project_types`, `studio_timeline_templates`.
- **2.0:**
  - screens: Project › Schedule (milestone panel, Share changes, Mark done); Company › Templates › Schedules; the client's
    `/my/<address>/schedule`;
  - code: `components/projects/schedule/*`, `lib/projects/{schedule-model,schedule,schedule-moments,schedule-ai}.ts`,
    `app/projects/schedule-actions.ts`;
  - tables: `project_milestones`, `project_milestone_links`, `project_milestone_extensions`, `project_schedule_shares`,
    `project_share_requests`, `schedule_templates` + `schedule_template_items`.
- **Changed:**
  - the JSONB array becomes one row per milestone; keep 1.0's milestone ids;
  - the client sees only what *Share changes* stored;
  - payment splits live on the signed quote's Payment Schedule, not on milestones;
  - four template stores become one.
- **Left out:** payment-only markers, payment % on milestones, "one milestone in progress", the first-publish wizard.
- **Plug in:** `draftTimeline` and `suggestForMilestone` (by rule); reminders → the scheduler.
- **Read:** map 24 §3.3, §4, D-3, D-8, D-9, D-15; `parity/projects-gaps-build/c-outcomes.md`.

#### P3 · Updates (1.0: Progress Updates)
- **1.0:** the Overview's Progress Updates card; API `projects/[id]/progress-updates`; tables `progress_updates`,
  `projects.progress_updates`.
- **2.0:**
  - screens: Project › Client › Updates; the client's `/my/<address>/updates`;
  - code: `components/projects/updates/*`, `lib/portal/updates.ts`, `app/projects/updates-actions.ts`;
  - tables: `project_updates`, `project_update_files` (each photo is a file in Files › Site updates).
- **Changed:**
  - states draft · in review · published · sent back;
  - Owners and Admins publish at once;
  - an update can be withdrawn only before the client opens it.
- **Left out:** per-member approver lists; videos and documents (never uploaded in 1.0).
- **Plug in:** photos → `setFileStore`; the client's email → `setDeliveryAdapter`.
- **Read:** map 24 §3.4; `parity/projects-gaps-build/d-outcomes.md`.

#### P4 · Choices and Designs (1.0: Management › Materials, the portal's Design tab)
- **1.0:** API `project-selections/records`, `projects/[id]/selections`, `homeowner/projects/[id]/{selections,renders}`; tables
  `project_selections` (options as JSON), `homeowner_shared_assets`, `render_share_links`.
- **2.0:**
  - screens: Project › Design › Choices · Designs; receipts; the client's `/my/<address>/choices` and `/designs`;
  - code: `components/projects/{choices,designs}/*`, `lib/projects/{choices,choices-model,designs,choice-receipt}.ts`;
  - tables: `project_selections`, `project_selection_options`, `render_share_links` (+ `file_id`), `space_layout_shares`.
- **Changed:**
  - options become rows, and a pick is stored by option id;
  - a priced pick drafts its variation order;
  - the client can say no and gets a receipt.
- **Left out:** `designer_note`; the `rejected` and `change_requested` states.
- **Read:** map 24 §3.7, D-10.

#### P5 · Handover, hold and delete (1.0: Close Project, the status pill, Archive, Delete)
- **1.0:** API `projects/records/[id]/closure`, `projects/[id]/{archive,unarchive,delete}`; `projects.closure_*`, `archived_at`,
  `status`.
- **2.0:**
  - screens: the project's Stage ▾ (Put on hold, Resume), the Hand over sheet (Complete handover, the owner's review, Reopen), ⋮ ›
    Delete, Deleted projects;
  - code: `components/projects/ending/*`, `lib/projects/{handover,hold,completion-letter}.ts`,
    `app/projects/ending-actions.ts`;
  - tables: `projects` (`completed_*`, `handover_*`, `reopened_*`, `deleted_*`, `on_hold_*`).
- **Changed:**
  - Closed becomes Completed;
  - On hold is a mark with a reason and a date, not a stage;
  - Completed is read-only except for payments;
  - delete is soft, and refused while money is recorded.
- **Left out:** Archive (archived projects map to Completed); Cancelled; the satisfaction rating.
- **Since 19 Oct (S46):** the project's ⋮ has *Complete handover* just before Delete (the Stage menu's own Completed row, same sheet, same refusals).
- **Read:** map 24 §3.2, §5, D-1; outcome S44R.

#### P6 · Workload and contractors (1.0: the Workload view; Contractors on UHD's branch)
- **1.0:** an owner-only Workload segment (capacity a constant 4); Contractors only on `urbanhomedemo` (`/contractors`,
  `vendors.{trades,is_contractor,crew_capacity,code}`, `project_contractor_assignments`).
- **2.0:**
  - screens: Projects › Workload (Members · Contractors); capacity on Company › Members; Finance › Vendors' Contractors chip;
    Project › Schedule › Contractors;
  - code: `components/projects/{workload,contractors}/*`,
    `lib/projects/{workload,contractors,contractors-model}.ts`, `app/projects/contractor-actions.ts`;
  - tables: `members.project_capacity`, `vendors` (+ contractor columns), `project_contractors`.
- **Changed:**
  - capacity is set per member;
  - a contractor is a vendor record;
  - trades are the studio's one list;
  - a crew row's window follows its milestone.
- **Left out:** a row's override dates; contractor import / export (1.0 deferred them too).
- **Read:** outcome S45B; `parity/projects-gaps-build/i-read.md`.

#### P7 · A project's money in (1.0: the project's Finance tab, Record Payment, `/pay` links)
- **1.0:** the Finance tab; `/finance/invoices/[id]/preview`; `/pay/[token]`, `/pay/inv/[token]`, `/pay/receipt/[token]`; API
  `finance/{invoices,payment-records,generate-invoices}`, `pay/*`; tables `project_invoices`, `payment_records`,
  `variation_orders`, `client_portal_tokens`, `studio_sequences`.
- **2.0:**
  - screens: Project › Money; papers `/projects/<id>/invoices/<invoiceId>`, `/receipts/<id>`, `/credit-notes/<id>`; no-login
    `/invoice/<token>` and `/receipt/<token>`; Settings › Finance;
  - code: `components/projects/money/*`, `lib/projects/{money,money-queries,money-needs,invoices*,payments*}.ts`,
    `app/projects/{money,payment}-actions.ts`;
  - tables: `project_invoices`, `project_payments`, `quotes` (`kind = 'variation'`), `quote_payments`, `credit_notes`.
- **Changed:**
  - one invoice per payment stage, numbered only when sent;
  - Part paid · Paid · Overdue are worked out;
  - a payment counts only once confirmed (`countsAsPaid`);
  - variation orders are quotes numbered VO-1… per project;
  - an overpayment becomes a credit note;
  - money is visible to the team, their Manager, Owners, Admins and Accounting.
- **Left out:** card, GIRO and paying online; over-bill treatments; the `/pay/<token>` one-link page (it redirects).
- **Plug in:**
  - PDF → `setPdfRenderer`;
  - messages → `setDeliveryAdapter`;
  - *Fill from a PDF* → `readBill`;
  - the PayNow QR is encoded in-app (`lib/projects/payments-paynow.ts`), so check it against a banking app.
- **Read:** map 24 §3.5–§3.6, §5, §7; map 28's `build/outcome-P-A.md`, `outcome-P-D.md`; outcome S07.

#### P8 · Company › Finance, money out (1.0: Studio Finance › Operations, Vendors, POs, expenses, bills, `/po`)
- **1.0:** `/finance/operations`, `/finance/vendors`, `/finance/pos/[id]/preview`, `/po/[token]`; API
  `finance/{purchase-orders,bills,expenses}`, `vendors/records`, `po/[token]`; tables `purchase_orders` (bills are rows with
  `source = 'bill'`), `po_payments`, `po_receipts`, `po_activity_log`, `expenses`, `expense_categories`, `vendors`,
  `finance_documents`.
- **2.0:**
  - screens: Company › Finance `/company/finance/<tab>`: To do · Money in · Money out (`?kind=purchase-orders|bills|expenses|paid`)
    · Vendors · Commission · Xero; Project › Money › Costs; the vendor's link `/po/<token>`;
  - code: `app/company/finance/[tab]`, `components/finance/*`, `lib/finance/{costs,rules,todo,money-in,repeats-server}.ts`,
    `app/finance/{po,cost,vendor}-actions.ts`;
  - tables: `vendors`, `purchase_orders`, `purchase_order_lines`, `supplier_bills`, `expenses`, `payments_out`,
    `cost_documents`.
- **Changed:**
  - there is no Finance rail item; `/finance/…` redirects;
  - bills have their own table;
  - approvals go to Owners and Admins (POs over the limit, bills off their PO, expenses), and Accounting raises POs and pays;
  - a PO goes out as a WhatsApp draft with the no-login link.
- **Left out:** goods-received photos; the expense verification track; AI compare with the quote; the PO pipeline board.
- **Plug in:**
  - bills → `readBill`;
  - PO PDF → `setPdfRenderer`;
  - repeating expenses → the scheduler's `repeats` job.
- **Read:** `parity/projects-gaps-build/f1-read.md` §3, `f1-outcomes.md`; map 28's `build/outcome-P-B.md`, `outcome-P-I.md`;
  outcomes S06, S44R.

#### P9 · Commission, credit notes and Xero (1.0: Finance › Commissions, credit notes, Accounting)
- **1.0:** `/finance/commissions`; API `finance/commissions`, `finance/records/commission-*`, `finance-documents/credit-notes`,
  `finance/accounting/**`; tables `commission_*`, `credit_notes`, `accounting_*`, `chart_of_accounts`, `journal_*`.
- **2.0:**
  - screens: Company › Finance › Commission (a member sees *My commission*) · Xero; Settings › Finance › Commission; the project's
    ⋮ › Commission;
  - code: `components/finance/books/*`, `lib/finance/{commission,credit-*,profit,xero,xero-server}.ts`,
    `app/finance/{books,commission,xero}-actions.ts`;
  - tables: `commission_rules`, `commission_shares`, `commission_requests`, `commission_payouts`, `credit_notes`, `xero_links`,
    `xero_sync_log`.
- **Changed:**
  - commission is worked out from counted payments;
  - shares always add up to 100%;
  - a reversed payment takes its commission back;
  - profit is shown only to Owners, Admins and Accounting, and only where Settings › Roles & access lets that role see costs
    (`seesProfit` in `lib/settings/cost-visibility.ts`).
- **Left out:** the double-entry journal; multi-currency; QuickBooks and Zoho.
- **Plug in:** `setAccountingProvider` (Xero); the five-minute sync → the scheduler's `accounting` job.
- **Read:** `parity/projects-gaps-build/f2-read.md` §3, `f2-outcomes.md`; map 28's `build/outcome-P-C.md`.

#### P10 · Reports (1.0: Finance › Reports, Pipeline)
- **1.0:** `/finance/reports`, `/finance/pipeline`; API `finance/reports/[report]`, `finance/export`, `finance/margin-analysis`.
- **2.0:**
  - screens: Company › Reports › Finance · Projects (old addresses redirect);
  - code: `app/company/reports/[tab]`, `components/company/reports/*`, `components/finance/books/reports-view.tsx`,
    `lib/finance/{reports,books}.ts`, `lib/projects/insights.ts`.
- **Changed:**
  - Finance has P&L, Owed to you, You owe, Profitability, Cash flow, GST, Vendor spend, Expenses, Commissions and Client statement,
    each with Export;
  - Pipeline became Profitability;
  - the Projects report is new.
- **Left out:** multi-currency; the studio-wide margin alerts and the One-Click Profit card (on hold).
- **Read:** `design-source/context/consistency/02-one-home-audit-2026-10-08.md` (N-01).

#### P11 · The client portal (1.0: the homeowner portal `/my`)
- **1.0:** `/my/[studioSlug]` (+ login, projects, about, team, `/p/[portalToken]`), `/my/engagement/[linkId]`; API
  `homeowner/*`, `homeowner-links/*`; tables `homeowner_profiles`, `homeowner_project_links`, `homeowner_notifications`,
  `homeowner_shared_assets`, `client_portal_tokens`.
- **2.0:**
  - screens: `/my/<address>` with Schedule, Updates, Money, Choices, Designs, Floor plan, Messages, Issues, About and Files;
    `/my/<address>/login`;
  - code: `app/my/[slug]/**`, `components/portal/*`, `lib/portal/*` (`portalGate`, `portalActor`, `PORTAL_TABS`),
    `app/portal/*-actions.ts`;
  - tables: `homeowner_profiles`, `homeowner_lead_links`, `homeowner_household_links`, `portal_sessions`, `portal_bell_reads`,
    `portal_addresses`.
- **Changed:**
  - one portal per studio address;
  - only invited numbers sign in;
  - section switches and Paused are enforced on the server;
  - the client's bell is worked out from records;
  - a client's proof of payment never marks an invoice paid unless the studio trusts proofs.
- **Left out:** six sign-in layouts, five portal layouts and themes; the personal `/p/<token>` link and `/pay/<token>` (they
  redirect); client to-dos; card payments.
- **Plug in:**
  - codes → `setSignInProvider`;
  - messages → `setDeliveryAdapter`;
  - files → `setFileStore`;
  - tenancy → `setStudioProvisioner`.
- **Read:** map 24 §1, §3.8, §5–§7, D-4, D-11, D-12; `parity/26-projects-missing-from-1.0-2026-10-07/6-portal.md`; outcome S13.

#### P12 · Client portal set-up (1.0: Tools › Homeowner Portal, Invite to Portal)
- **1.0:** `/tools/homeowner-portal`; API `portal/{studio-settings,family-members,upload-asset}`, `homeowner/invite`;
  `studios.portal_slug`, `studios.settings.portal.*` (15 switches, none enforced).
- **2.0:**
  - screens: Company › Client portal `/company/portal` and `/company/portal/clients`; a lead's *Invite to Portal* and the project's
    ⋮ open the Client access panel; *See it as {client}*;
  - code: `app/company/portal/*`, `components/company/portal/*`, `components/portal/client-access-panel.tsx`,
    `lib/portal/{sections,household,about,links}.ts`;
  - data: `portal_addresses`, `homeowner_household_links`, `studio_pictures`, `members.portal_*`; settings `portal`,
    `portal_sections`, `portal_welcome`, `portal_links`, `studio_about`.
- **Changed:**
  - ten section switches, enforced on the server;
  - the look comes from the brand kit;
  - About and Team come from Company › Profile and Members;
  - *Getting it live* checks the Privacy, Terms and Contact links.
- **Left out:** hand-typed team cards; per-portal branding; YouTube embeds.
- **Since 19 Oct (S46):** the project's ⋮ has *See it as {client}* beside Invite to Portal.
- **Read:** map 24 §3.9; outcome S13.

#### P13 · Messages (1.0: Inbox / Chats, the portal's Project Chat)
- **1.0:** `/inbox`; API `chats/records/**`, `chat/upload`, `homeowner/projects/[id]/chat`; tables `conversations`,
  `conversation_participants`, `messages`, `conversation_files`.
- **2.0:**
  - screens: Messages `/chat` (Clients · Team, new message to a member or a group); Project › Client › Messages; the client's
    `/my/<address>/messages`;
  - code: `app/chat/*`, `components/projects/{messages,threads}/*`,
    `lib/projects/{messages,studio-chats,conversations,suggested-replies}.ts`;
  - tables: `project_messages`, `lead_messages`, `conversations`, `conversation_participants`, `conversation_messages`,
    `conversation_files`, `chat_reads`, `conversation_prefs`, `inbound_messages`.
- **Changed:**
  - the client's thread is per project (`lead_messages` before Won);
  - members-only chats live in tables no client page reads;
  - old `/inbox` links land on Messages.
- **Left out:** *Show chat history* on invite; presence; Archive; external participants.
- **Plug in:**
  - suggested replies → `suggestReplies`;
  - sending → `setDeliveryAdapter`;
  - WhatsApp replies → `/api/webhooks/whatsapp`;
  - large files → object storage (multipart).
- **Since 19 Oct (S46):** a client conversation's *People and files* shows the client's number with Call (dials on touch; copies at a desk) and Copy.
- **Read:** `parity/projects-gaps-build/h-read.md` §3, `h-outcomes.md`; map 28's `build/outcome-P-G.md`; outcome S26.

#### P14 · Tickets (1.0: Escalations, support tickets)
- **1.0:** `/escalations`, `/escalations/[ticketId]`, `/escalations/new`; the portal's Support tab; API `escalations/**`,
  `homeowner/projects/[id]/issues`; tables `escalations`, `escalation_comments`.
- **2.0:**
  - screens: Tickets on the rail `/tickets`; Project › Client › Tickets; the client's Issues; Settings › Projects › Ticket
    categories;
  - code: `app/tickets`, `components/projects/tickets/*`, `lib/projects/{tickets,tickets-model}.ts`;
  - tables: `project_tickets`, `ticket_replies`; settings `ticket_categories`.
- **Changed:**
  - the studio reads "ticket" and the client reads "issue";
  - one number, `T-{YYYY}-{nnn}` (a port keeps 1.0's);
  - states Open · In progress · Resolved · Closed;
  - categories are stored by their words;
  - a rail item since 19 Oct (REG-2524), as 1.0's Escalations had.
- **Left out:** AI analysis and Proactive Alerts.
- **Since 19 Oct (S46):** Tickets is a rail place after Tasks (`/tickets`, REG-2524; `/projects/tickets` redirects), with the open count; *New ticket* (pick the project, then its own compose; `?new=1`); the Dashboard's *Tickets* tile shows the same count.
- **Read:** `parity/projects-gaps-build/h-read.md`, `h-outcomes.md`.

#### P15 · Floor-plan mark-up (1.0: Management › Floor Plan)
- **1.0:** `src/components/floor-plan-collab`; API `projects/[id]/floor-plan/**`, `homeowner/projects/[id]/floor-plan/**`; tables
  `project_floor_plans`, `floor_plan_annotations`, `floor_plan_annotation_comments`, `floor_plan_approvals`.
- **2.0:**
  - screens: Project › Design › Floor plan; the contractor print; the client's `/my/<address>/floor-plan`;
  - code: `components/projects/floor-plan/*`, `lib/projects/{floor-plan,floor-plan-model}.ts`;
  - tables: `project_floor_plans`, `floor_plan_pictures`, `floor_plan_marks`, `floor_plan_comments`, `floor_plan_confirmations`,
    `floor_plan_seen`.
- **Changed:**
  - 1.0's ten stamps, three hatches and eight layers keep their keys, so every mark ports;
  - *Studio only* marks never reach a client.
- **Left out:** live refresh.
- **Plug in:** the marked picture's bytes → object storage.
- **Read:** `parity/projects-gaps-build/g-read.md`, `g-outcomes.md`.

#### P16 · 3D Space Planner and floor-plan photo → 3D (1.0: Tools › 3-D Space Planner, Floorplan to 3D Isometric)
- **1.0:** `/tools/floor-plan`, `/tools/floorplan-3d-isometric`, `/tools/floorplan-3d-sandbox`, `/floor-plan/view/[token]`; API
  `floor-plans/**`, `render/floorplan-3d-sandbox`; tables `floor_plans`, `floor_plan_versions`.
- **2.0:**
  - screens: Tools › 3D Space Planner `/planner` (editor `/planner/<layoutId>`); Floorplan to 3D Isometric; public `/space/<token>`;
    the client's `/my/<address>/layout/<shareId>`;
  - code: `app/planner/*`, `app/(editor)/planner/[layoutId]`, `components/planner/*`, `lib/planner/*`;
  - tables: `space_layouts`, `space_layout_versions`, `space_layout_shares`, `floor_plan_photos`.
- **Changed:**
  - 42 drawn pieces instead of about 390 models;
  - the photo-to-3D picture is drawn from the rooms the studio places, with no credits;
  - a lead's layouts move to its project on Won.
- **Left out:** Render Tour, HD mode and sun angle. 1.0's furniture models wait for a content port (§9 #8).
- **Plug in:** `describePiece`, `arrangeRoom`, `roomsForType`, `findPaper`.
- **Read:** `parity/projects-gaps-build/j-read.md`; map 28's `build/outcome-P-J.md`; outcomes S15, S28.

#### P17 · Compliance (1.0: Tools › Compliance Navigator, "[Compliance]" tasks)
- **1.0:** `/tools/compliance-navigator` (state in the browser's storage); `src/data/sg-checklists.ts` (61 items); up to ten
  "[Compliance] …" tasks per new project. No table.
- **2.0:**
  - screens: Tools › Compliance Navigator `/compliance`; Project › Tasks › Compliance; registrations on Company › Profile;
  - code: `app/compliance`, `components/compliance/*`, `components/projects/compliance/*`, `lib/compliance/*`;
  - tables: `project_compliance`, `lead_tasks.compliance_item`; settings `compliance_studio`, `compliance_studio_notes`.
- **Changed:**
  - state is stored on the server, with who and when;
  - starter tasks follow each item's flag and tick it.
- **Left out:** other countries' lists.
- **Read:** `parity/projects-gaps-build/i-read.md`, `i-outcomes.md`.

### AI, plans and the platform

#### A1 · AI Visualizer (1.0: AI Visualiser)
- **1.0:** `/tools/ai-visualizer`, `src/components/projects/visualizer.tsx`; the client link `src/app/renders/[token]`; API
  `render/*` (19 routes), `renders/*`, `visualizer/workspace`, `storage/*`; tables `project_rooms`, `render_jobs`,
  `render_share_links`, `render_consultation_requests`, `studio_materials`, `studio_material_catalog`; designs as JSON in
  `studios.settings.visualizerWorkspace`.
- **2.0:**
  - screens: Tools › AI Visualizer `/visualizer` → `/visualizer/<designId>`; the client's `/renders/<token>`; Company › Materials;
  - code: `app/visualizer/`, `app/(editor)/visualizer/[designId]/`, `app/renders/[token]/`,
    `components/visualizer/{home,editor}`, `lib/visualizer/` (the engine in `engine/`);
  - tables: `visualizer_designs`, `project_rooms`, `render_jobs`, `render_images`, `render_share_links`,
    `render_consultation_requests`, `render_annotations`, `studio_materials`, `lead_file_images`, `lead_file_renders`.
- **Changed:**
  - a design is a record: one per lead, plus personal designs;
  - pictures are rendered in the browser by a curated engine;
  - Generate charges credits before the work (`render:<jobId>`) and refunds on failure;
  - the client link keeps 1.0's path and lasts 7 days.
- **Left out:** the temp mode; `studio_material_catalog` (now a data file); the usage funnel.
- **Plug in:**
  - every image pass → `runPass`, `setImageIO`, `guardRender`;
  - any other photo → `fallbackDots`;
  - pictures → object storage behind the same addresses.
- **Since 19 Oct (S46):** New ▾ *For a project…* and a *Projects* kind in the filter.
- **Read:** map 17 §1–§3 and §6 (§6 wins); outcome S20.

#### A2 · The developers' AI bench (1.0: the AI sandboxes)
- **1.0:** `/tools/{auto-furnish,detect,floorplan-3d,quote-template,relight,style-transfer,visualizer}-sandbox`; API
  `render/{outpaint,reangle,orbit-video,depth,…}`.
- **2.0:**
  - screens: no studio menu; `/dev/ai-bench` (404 in production unless `OPENMAISON_DEV_PREVIEWS=1`); each old address redirects
    to the screen that does its job;
  - code: `app/dev/ai-bench/`, `components/dev/ai-bench/`, `lib/visualizer/spatial/*`, `scripts/viz/*`.
- **Changed:**
  - five sandboxes became live screens;
  - the four experiments (depth, reangle, outpaint, orbit video) are built by rule on the bench.
- **Left out:** model bake-offs, model pickers, prompt gyms.
- **Plug in:** `depthOf`, `poseFor`, `extendRoom`, `recordCanvas`.
- **Read:** outcome S41; services.md.

#### A3 · Plan & AI credits (1.0: credits, /upgrade, Usage, Dodo billing; plg only)
- **1.0:** qanvast has none of it (its `/upgrade` redirects to `/settings`). plg has `/upgrade`, `/billing/return`,
  `/settings/usage`; API `credits/*`, `billing/*`, `webhooks/dodo`; crons `credit-refresh`, `billing-lapse`;
  `src/lib/{credits,billing}/**`; the credit and billing tables.
- **2.0:**
  - screens: the rail's credits slot and card; the Plans dialog; Company › Plan & AI credits › Usage · Plan & billing; the price on
    every metered press;
  - code: `app/company/plan/`, `components/credits/*`, `components/company/plan/*`, `lib/credits/*`, `app/credits/actions.ts`;
  - tables: as 1.0, plus `credit_requests`.
- **Changed:**
  - billing lives inside the app;
  - there is one price list (`lib/credits/schedule.ts`);
  - credits are charged before the work, keyed by the work, and refunded on failure;
  - the month rolls over lazily;
  - members can ask the Owner for credits;
  - alerts at 75%, 90% and 0; auto top-up; Change seats.
- **Left out:** `billing_webhook_events`, `billing_trial_redemptions`, `actual_cost_usd`.
- **Plug in:** `setPaymentProvider` (`lib/credits/payments.ts`). Once plugged in, only `POST /api/webhooks/payments` grants
  credits. Open: §9 #5.
- **Read:** map 21 §2–§5 (its §6 is out of date); map 20; outcome S19.

#### A4 · Pro locks and upgrade nudges (1.0: plan gating and nudges; plg only)
- **1.0:** plg: `src/lib/plan/*`, `plans.feature_flags`, `src/lib/nudges/**`, API `nudges/*`, `nudge_state`.
- **2.0:**
  - screens: a Pro tag on every opener; the lock card; one quiet bell row for the Owner on Free;
  - code: `lib/credits/{features,plan-gate,nudges,nudge-model}.ts`, `components/credits/{pro-tag,plan-lock-dialog}.tsx`;
  - tables: `plans.feature_flags`, `nudge_state`.
- **Changed:**
  - 1.0's seven Pro features, refused on the server on Free;
  - a nudge is a bell row, never a modal;
  - both kill switches keep 1.0's names.
- **Read:** outcomes S19, S41b4.

#### A5 · Maison AI (1.0: mAIson, code name ID Buddy)
- **1.0:** `src/components/layout/id-buddy-panel.tsx`, `src/lib/agents/*` (66 tools that write at once), `api/buddy/*` (Gemini through
  OpenRouter).
- **2.0:**
  - screens: the Maison AI button and sheet on every page; each editor's own sheet; the Dashboard's box; Recent;
  - code: `components/shell/{maison-ai,maison-answer}.tsx`, `lib/maison-ai/`, `app/leads/maison-actions.ts`;
  - tables: `maison_questions`.
- **Changed:**
  - about 45 questions are answered from the records, by rule;
  - a change is only proposed, never written straight from chat;
  - Recent is a record.
- **Left out:** voice input, lead scoring, approving from the box, files attached to chat.
- **Plug in:** `readQuestion`, `stageDraft`.
- **Read:** outcome S10.

#### A6 · Marketplace (1.0: Marketplace)
- **1.0:** `/marketplace` (+ `[id]`), read live from Qanvast through `api/qanvast/[...path]`. No table.
- **2.0:**
  - screens: Marketplace `/marketplace`, a brand at `/marketplace/<brandId>`;
  - code: `app/marketplace/`, `components/marketplace/`, `lib/marketplace/*`;
  - tables: `marketplace_*` (6), `vendors.marketplace_brand_id`, `price_book_items.marketplace_product_id`.
- **Changed:**
  - the studio keeps a copy of Qanvast's feed;
  - a brand becomes a vendor, and a product becomes a Price book item;
  - Get deal records the ask.
- **Plug in:** `setFeedSource({ marketplace })`.
- **Read:** outcome S24.

#### A7 · Market Insights (1.0: Market Insights)
- **1.0:** `/tools/market-insights`, API `market-insights/*`, `news`; table `market_insights`.
- **2.0:**
  - screens: Tools › Market Insights `/market-insights`;
  - code: `app/market-insights/`, `components/market-insights/`, `lib/market-insights/*`;
  - tables: `market_insights`.
- **Changed:**
  - the studio keeps a copy of the editors' feed;
  - an article's id is `mi-<1.0 id>`;
  - RSS headlines arrive as Industry News.
- **Plug in:** `setFeedSource({ insights, fetchText })`.
- **Read:** outcome S25.

#### A8 · OpenMaison's website (1.0: `(marketing)`)
- **1.0:** `src/app/(marketing)/**` at the domain root; API `beta-signup`, `contact`, `newsletter`, `og`; tables `beta_signups`,
  `contact_messages`, `newsletter_subscribers`.
- **2.0:**
  - screens: `/site` and its pages; Book a demo opens a form, then Calendly;
  - code: `app/site/**`, `components/site/`, `lib/site/`, `app/{sitemap,robots}.ts`, `public/llms.txt`;
  - tables: the same three.
- **Changed:**
  - the site lives at `/site`, with canonical addresses from `NEXT_PUBLIC_SITE_URL`;
  - claims 2.0 doesn't make were cut;
  - forms email the team through the outbox.
- **Left out:** `/uae-get-started`.
- **Pricing (S46D, 19 Oct):** `/site/pricing` from the one price source (`lib/credits/plans.ts`, the schedule, `pricing-data.ts`), in the
  header, the footer and every *See pricing*; a plan's button carries `?plan=&period=` through sign-up into Plans (`lib/credits/plan-intent.ts`,
  read by CreditsHost); `/pricing` and 1.0's `/upgrade?plan=` land on it.
- **Read:** outcome S35.

#### A9 · Try without an account (1.0: `/try-visualizer`, `/try`, anon workspaces; plg)
- **1.0:** plg: `src/app/try-visualizer`, `src/lib/anon/**`, API `anon/*`, `demo/visualizer/*`; crons `anon-sweep`,
  `anon-storage-gc`; table `anon_workspaces`.
- **2.0:**
  - screens: `/site/try` (the AI Visualizer), `/site/try/leads`, `/site/try/upload-a-quote`, `/site/try/quote-x-ray`;
  - code: `app/site/try/**`, `lib/visualizer/trial/*`, `lib/trial/*`;
  - data: `anon_workspaces`, in its own file `<db>.trial.db`.
- **Changed:**
  - the trial runs the studio's own editor;
  - 3 renders per browser, with 1.0's mark;
  - the work is claimed into the studio at sign-up;
  - it is off unless `TRIAL_VISUALIZER_ENABLED` / `TRIAL_TOOLS_ENABLED` is set.
- **Plug in:** `setBotCheck`, `setLimitStore`, `setTrialStore`.
- **Read:** outcomes S36, S41b3.

#### A10 · Old addresses (1.0: every link 1.0 ever printed)
- **2.0:**
  - code: `lib/links/old-addresses.ts` (the one list), `next.config.ts` `redirects()`, `proxy.ts` (`oldQueryTarget`),
    `lib/links/old-links.ts` (record lookups), `app/not-found.tsx`.
- **Changed:**
  - three ways an old address is answered: a fixed redirect, a query rule, or a route that checks permission before naming a
    record;
  - the redirects are 307 for now; make them permanent once the site is live.
- **Plug in:** nothing. A port that carries 1.0's tokens into 2.0's columns makes each link land on its record. Open: §9 #3.
- **Since 19 Oct (S46):** plg's and UHD's own addresses land too (S46A), and plg's ad links (`/tools/ai-visualizer`, `/tools/quote-xray`, `/tools/quote-digitizer`) send a visitor with no account to the website's trial, a member to the tool (`proxy.ts`).
- **Read:** outcome S41b2; the header of `lib/links/old-addresses.ts`.

#### A11 · Real services, the scheduler and webhooks (1.0: Resend, 360dialog, Twilio, Supabase Storage, Chromium, `vercel.json` crons)
- **2.0:**
  - code: `lib/services/{registry,slots,install,sweep,feeds,pdf,cron-auth}.ts`, `instrumentation.ts`, `app/api/{cron,webhooks,services,health}`,
    `lib/notifications/delivery.ts`;
  - tables: `notification_outbox`, `inbound_messages`.
- **Changed:**
  - every stand-in is one registry entry (§7);
  - one `set…` call reaches every route, action and page;
  - jobs also run where they are read, so the app works without a scheduler;
  - the server warns at start-up when a key is set but its service is still a stand-in.
- **Left out:** the platform crons (`price-drift`, `aggregate-rates`, `brand-dossier-scan`, `usage-rollup`, `growth-digest`),
  `fx-rates`.
- **Read:** `lib/services/registry.ts` (it wins); services.md; outcome S34.

#### A12 · Feature flags (1.0: Accounts › Feature Flags, plan flags, `platform_config`, env flags)
- **2.0:**
  - screens: no Feature Flags page;
  - code: `lib/credits/{features,plan-gate}.ts`, `lib/visualizer/trial/policy.ts`, `lib/trial/policy.ts`,
    `lib/services/dev-previews.ts`, `lib/platform.ts`.
- **Changed:**
  - each studio flag became a fixed rule or a setting;
  - OpenMaison's own switches (portal off, messages paused) are settings `platform`, set on Qanvast Ops › Studios;
  - the env switches are in §7.
- **Left out:** `NEXT_PUBLIC_OM_UI`, `NEXT_PUBLIC_QANVAST_OPS_UI`; Journey mode; per-tool page flags.
- **Read:** `parity/30-pending-modules-build-2026-10-11/s41b/sweep-pages.md`; the header of `lib/credits/plan-gate.ts`.

#### A13 · Left out on Vicky's word (1.0: `/admin`, `messages/`, other countries)
- **1.0:** `src/app/admin/*` (accreditations, activity, agreements, analytics, beta sign-ups, billing, brand dossiers, complaints,
  hangouts, market insights, notifications, plans, portfolio, promotions, refunds, settings, studios, templates, users,
  verification); `messages/{en,ar}.json` + `src/i18n`; `/uae-get-started`.
- **2.0:** none. A few operator jobs are inside Qanvast Ops (Studios, Hangouts, Lead credits, Reviews). The records the admin read
  are kept.
- **Read:** `parity/29-pending-modules-2026-10-11/README.md`.

---

## 13. Where the detail lives

### The migration maps and audits (`design-source/context/parity/`)

| Module | Audit of 1.0 | Migration map: start a port here |
| --- | --- | --- |
| Leads | `01-leads-1.0-to-2.0-audit-2026-09-24.md` | `02-leads-migration-map-2026-09-24.md` |
| Quote templates | `03-quote-templates-1.0-to-2.0-audit-2026-09-24.md` | `04-quote-templates-migration-map-2026-09-24.md` |
| Quote editor | `05-quote-editor-1.0-to-2.0-audit-2026-09-24.md` | `06-quote-editor-migration-map-2026-09-24.md` |
| Contracts | `07-contracts-1.0-to-2.0-audit-2026-09-25.md` | `08-contracts-migration-map-2026-09-25.md` |
| Quote X-Ray | `09-quote-x-ray-1.0-to-2.0-audit-2026-09-25.md` | `10-quote-x-ray-migration-map-2026-09-25.md` |
| Accounts Setup → Settings | `11-accounts-setup-1.0-to-2.0-audit-2026-09-25.md` | `12-accounts-setup-migration-map-2026-09-25.md` |
| Price book | `13-price-book-1.0-to-2.0-audit-2026-09-25.md` | `14-price-book-migration-map-2026-09-25.md` |
| AI Visualizer | `16-ai-visualizer-1.0-to-2.0-audit-2026-09-25.md` | `17-ai-visualizer-migration-map-2026-09-25.md` |
| AI credits | `19-ai-credits-1.0-to-2.0-audit-2026-09-28.md`, `20-…-integration-differences-…md` | `21-ai-credits-migration-map-2026-09-28.md` |
| Projects | `22-projects-1.0-to-2.0-audit-2026-10-05.md` | `24-projects-migration-map-2026-10-05.md` |
| Projects (gaps) and Finance | `26-projects-missing-from-1.0-2026-10-07/` | `27-projects-gaps-build-2026-10-07.md`, `projects-gaps-build/*-read.md` and `*-outcomes.md` |
| Projects and Finance, line by line (1,094 rows) | | `28-projects-finance-parity-map-2026-10-10/` (`rows/`, `build/outcome-P-*.md`) |
| The 41 modules built 11–17 Oct | `29-pending-modules-2026-10-11/` | `30-pending-modules-build-2026-10-11/` (`steps.md`, `steps/outcome-S*.md`, `services.md`) |

Each `*-1.0-inventory/` folder beside them lists what 1.0 had, item by item.

### Known out-of-date spots

When these disagree with this document or the code, the code wins.

- **`services.md`** says 1.0 carries no Dodo code and that Turnstile was never wired. Both are wrong for `deployment/plg`. It names
  the quote-digitizer seam `readDocument` in `lib/quotes/upload.ts`; the registry has `readQuoteUpload` in
  `lib/quotes/read-upload.ts`.
- **Map 21 §6 ("Not built")** was built by step S19.
- **Maps 06 and 08** say several things are not built that were built later: signing tokens and expiry, PDF contract templates,
  Price book approval and history, Compare with any version, and Draft with Maison AI. Follow the step outcomes.
- **Map 14** predates 2.0's `vendors` table (Company › Finance › Vendors). Items and quote lines still name their vendor in text.
- **Map 12** lands an accounting-only member inactive. That was written before the Accounting role existed (§9 #4).
