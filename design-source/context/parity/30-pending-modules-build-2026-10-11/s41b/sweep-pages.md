# S41b · Nothing left behind — every 1.0 page and menu entry → its 2.0 home

His words, 2026-10-12: "please make sure nothing left behind from 1.0 to 2.0". This sweep covers 1.0's pages and menus, beyond the 41
cards. It was read-only, done 2026-10-13. Each 2.0 home was confirmed by opening the 2.0 file named in its row, not by its name alone.

- **1.0** = `qanvast-id-tool`: all 128 `page.tsx` under `src/app/**`, the special route files, and every menu. The menus are the sidebar
  (`src/components/layout/app-sidebar.tsx`), the top bar (`topbar.tsx`), the phone bar (`bottom-nav.tsx`), the keyboard map
  (`src/lib/keyboard-shortcuts.ts`), the shell's floating parts (`src/app/(main)/layout.tsx`), Accounts' menu
  (`src/app/(main)/accounts/page.tsx` `MENU_GROUPS`) and Settings' sections (`src/app/(main)/settings/page.tsx` `ALL_SECTIONS`). They also
  include the portal's menus (`src/components/homeowner/*`) and the website's header and footer (`src/components/landing/v2/marketing-{nav,footer}.tsx`).
  1.0 has no command palette: ⌘K and "/" focus the top bar's search (`keyboard-shortcuts.ts`).
- **2.0**: the route tree under `app/**`, the shell (`components/shell/app-rail.tsx`, `mobile-nav.tsx`, `tools-popover.tsx`,
  `view-as-popover.tsx`), Company's sections (`lib/company/sections.ts`), Settings' modules (`lib/settings/modules.ts`), and the old-link
  maps (`lib/links/old-links.ts`, `lib/site/model.ts` `OLD_SITE_ADDRESSES`). The pending-modules steps and outcomes were read too.
- **Out of scope here:** 1.0's API routes and tables (the other S41b sweeps), and the cards' `pending` lines (`ledger.md`).

**What each status means:**
- **Same address**: 2.0 serves the same path.
- **Redirects**: a 2.0 route sends the old address to its new home.
- **Home exists · old address 404**: the job lives in 2.0, but 1.0's address opens a 404. These are listed under **M1**.
- **Card Sxx (queued)**: on a card whose step is not built yet.
- **Decided**: a recorded call not to port it, and where that call is.
- **Dead in 1.0**: nothing in 1.0 reaches it, or nothing reads it.
- **Parked by him**: his parks are dark mode, themes, guided tours, Languages, countries beyond Singapore and the UAE page.
- **Excluded (admin / dev)**: Platform admin and the AI model sandboxes.
- **MISSING**: no home in 2.0, no card and no recorded decision.

## Counts

**Pages (128 `page.tsx`):**

| Status | §1 studio app (51) | §2 client links (23) | §3 site (26) | §4 admin (28) | Total |
|---|---|---|---|---|---|
| Same address | 8 | 7 | — | — | **15** |
| Redirects | 7 | 15 | 24 | — | **46** |
| Moved, decided (1.0's `/` website home → `/site`) | — | — | 1 | — | **1** |
| Home exists · old address 404 (→ **M1**) | 27 | 1 | — | — | **28** |
| Card queued (S39 Studio Health 1 · S41 sandboxes 7) | 8 | — | — | — | **8** |
| Dead in 1.0 | 1 | — | — | — | **1** |
| Parked by him (UAE) | — | — | 1 | — | **1** |
| Excluded (Platform admin; the sandboxes are also dev pages) | — | — | — | 28 | **28** |
| **MISSING** | 0 | 0 | 0 | — | **0** |

**Menu entries (140 unique).** These leave out the 19 tiles of the top bar's grid and the 20 tiles of the phone's More, which repeat
the sidebar's targets. They also leave out the website's page links, which repeat §3's rows.

| Status | Sidebar 30 | Top bar 11 | Phone bar 5 | Keys 11 | Floating 10 | Accounts 44 | Settings 12 | Portal 11 | Website 6 | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Mapped to a live 2.0 place | 25 | 10 | 5 | 10 | 6 | 35 | 5 | 7 | 5 | **108** |
| Decided, not ported | 4 | 1 | — | 1 | 2 | 8 | 2 | — | — | **18** |
| Parked by him | 1 | — | — | — | 1 | — | 5 | — | 1 | **8** |
| Card queued (S39) | — | — | — | — | 1 | 1 | — | — | — | **2** |
| Dead in 1.0 | — | — | — | — | — | — | — | 4 | — | **4** |
| **MISSING** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |

**MISSING: 2 items, and neither is a page's job.** Every page and every menu job has a home, a card, a recorded call or a park. What
2.0 lacks:
- **M1**: a landing for 1.0's studio-app addresses, that is the 28 "old address 404" rows above plus the deep links in 1.0's
  notifications.
- **M2**: an app-wide "page not found". 1.0's `src/app/not-found.tsx` is a route file, not a `page.tsx`.

---

## 1 · Studio app pages — `src/app/(main)/**` (48) + `/studio-setup` · `/login` · `/onboarding` (3)

| 1.0 page (URL) | What it is | 2.0 home | Status · confirmed by |
|---|---|---|---|
| `/dashboard` | Home | `/dashboard` (S22) | Same address · `app/dashboard/page.tsx` |
| `/leads` | Listing (kanban · list · performance; `?leadId=` opens the drawer) | `/leads`; Performance → Company › Reports › Leads; a lead → `/leads/<id>` | Same address · `app/leads/(list)/page.tsx` (does not read `?leadId=` — see M1) |
| `/leads/new` | Full-page new-lead form | Create New Lead on the listing, `/leads?new=1` | Home exists · old address 404 · `app/leads/workspace.tsx:320` (`new`), `app/leads/[id]/(overview)/page.tsx:34` `notFound()` for id "new" |
| `/leads/[leadId]/quote-preview-popout` | Pop-out PDF preview window of the Quote Digitizer | The quote's Preview `/quotes/<id>/preview` | Home exists · old address 404 · `app/(editor)/quotes/[quoteId]/preview/page.tsx`; `app/leads/[id]/[tab]/page.tsx:67` `notFound()` |
| `/projects` | Listing | `/projects` | Same address · `app/projects/(list)/page.tsx` |
| `/projects/new` | New project | New project on the listing, `/projects?new=1` | Home exists · old address 404 · `components/projects/projects-workspace.tsx:166` |
| `/projects/[projectId]` | Project page (Overview · Management · Finance · Files & Docs · Activity, §6) | `/projects/[id]` | Same address · `app/projects/[id]/(overview)/page.tsx`, `lib/projects/tabs.ts` |
| `/projects/[projectId]/quotes/new` | A simulated "scanning" upload page | Create Quote › Upload a quote | Dead in 1.0 (nothing links to it; its progress bar is a timer) · 1.0 grep: no `quotes/new` link |
| `/tasks` | Tasks | `/tasks` | Same address · `app/tasks/page.tsx` |
| `/inbox` | Chats | Messages `/chat` (S26, P-G) | Home exists · old address 404 · `app/chat/page.tsx`; no `app/inbox` |
| `/escalations` | Tickets list | Projects › Tickets `/projects/tickets` | Home exists · old address 404 · `app/projects/tickets/page.tsx` |
| `/escalations/new` | New ticket | New ticket on a project's Tickets | Home exists · old address 404 · `components/projects/tickets/ticket-dialogs.tsx:84` |
| `/escalations/[ticketId]` | One ticket | `/projects/tickets?open=<id>` | Home exists · old address 404 · `components/projects/tickets/studio-tickets.tsx:46` (`open`) |
| `/marketplace` | Marketplace | `/marketplace` (S24) | Same address · `app/marketplace/(home)/page.tsx` |
| `/marketplace/[id]` | Brand page | `/marketplace/[brandId]` | Same address · `app/marketplace/[brandId]/page.tsx` |
| `/finance/operations` | Invoices · payments · POs · bills · expenses | Company › Finance › To do · Money in · Money out | Home exists · old address 404: `app/finance/[tab]` sends it to `/company/finance/operations`, where `app/company/finance/[tab]/page.tsx:29` answers `notFound()` (no `operations` in `lib/finance/sections.ts`) |
| `/finance/pipeline` | Pipeline | Reports › Finance › Profitability (REG-1360) | Redirects (2 hops) · `app/finance/[tab]/page.tsx` → `app/company/finance/pipeline/page.tsx` |
| `/finance/commissions` | Commissions | `/company/finance/commissions` | Redirects · `app/finance/[tab]/page.tsx`, `lib/finance/sections.ts:32` |
| `/finance/reports` | Reports | `/company/reports/finance` | Redirects · `app/company/finance/reports/page.tsx` |
| `/finance/vendors` | Vendors | `/company/finance/vendors` | Redirects · `lib/finance/sections.ts:30` |
| `/finance/invoices/[id]/preview` | Invoice print preview | `/projects/<p>/invoices/<id>` | Home exists · old address 404 · `app/(editor)/projects/[id]/invoices/[invoiceId]/page.tsx` |
| `/finance/pos/[id]/preview` | PO print preview | `/projects/<p>/purchase-orders/<id>` | Home exists · old address 404 · `app/(editor)/projects/[id]/purchase-orders/[poId]/page.tsx` |
| `/finance/vos/[id]/preview` | VO print preview | `/quotes/<id>/preview` (a VO is `quotes.kind = 'variation'`) | Home exists · old address 404 · `components/projects/money/use-invoices.tsx:308` |
| `/settings` | Personal settings (§8) | `/profile` (S01). 2.0's `/settings` holds the studio's rules | Same address, different job · `app/profile/page.tsx`, `app/settings/page.tsx` |
| `/settings/notifications` | Owner-only studio notification rules | Settings › Notifications | Home exists · old address 404 · `app/settings/notifications-settings.tsx` |
| `/accounts` (`?tab=`) | Accounts Setup, 44 tabs (§7) | Settings' modules + Company's sections | Home exists · old address 404 · `lib/settings/modules.ts`, `lib/company/sections.ts` |
| `/accounts/roles` | In 1.0, a redirect to `/accounts?tab=roles` | Settings › Roles & access › Who may do what (read-only); the editor is held by him (Q-40, S14) | Home exists · old address 404 · `app/settings/studio-settings.tsx` |
| `/accounts/usage` | Studio Health | — | Card S39 (queued; nothing in `app/`, `lib/`) · old address 404 |
| `/accounts/milestone-templates` | Milestone template library (rename · delete) | Company › Templates › Schedules | Home exists · old address 404 · `app/company/templates/(libraries)/schedules/page.tsx` |
| `/upgrade` | In 1.0, a redirect to `/settings` | Plans dialog + Company › Plan & AI credits › Plan & billing | Home exists · old address 404 · `components/credits/plans-dialog.tsx`, `app/company/plan/billing/page.tsx` |
| `/verify` | Qanvast listing application | Company › Profile › Listed on Qanvast (S37) | Redirects · `app/verify/page.tsx` → `/company/profile#qanvast` |
| `/tools/quote-digitizer` | Quote Digitizer | Tools › Quotes `/quotes` + Create Quote › Upload a quote | Home exists · old address 404 · `app/quotes/page.tsx`, `components/shell/tools-popover.tsx:22` |
| `/tools/quote-xray` | Quote X-Ray | `/quote-x-ray` | Home exists · old address 404 · `app/quote-x-ray/(home)/page.tsx` |
| `/tools/ai-visualizer` | AI Visualizer | `/visualizer` | Home exists · old address 404 · `app/visualizer/page.tsx` |
| `/tools/floorplan-3d-isometric` | Floorplan to 3D Isometric | `/planner?view=iso&photo=1` (S28) | Home exists · old address 404 · `tools-popover.tsx:26` |
| `/tools/market-insights` | Market Insights | `/market-insights` (S25) | Home exists · old address 404 · `app/market-insights/(home)/page.tsx` |
| `/tools/market-insights/[id]` | An article | `/market-insights/mi-<id>` | Home exists · old address 404 · `app/market-insights/[articleId]/page.tsx`; S25 passed this address to S41b |
| `/tools/compliance-navigator` | Compliance Navigator | `/compliance` | Home exists · old address 404 · `app/compliance/page.tsx` |
| `/tools/floor-plan` | 3-D Space Planner | `/planner` | Home exists · old address 404 · `app/planner/page.tsx` |
| `/tools/copilot-analytics` | Meeting Copilot + insights | `/meetings` + Company › Reports › Meetings (S23) | Home exists · old address 404 · `app/meetings/(list)/page.tsx`, `lib/company/sections.ts` `REPORTS_TABS` |
| `/tools/homeowner-portal` | Portal hub | Company › Client portal | Home exists · old address 404 · `app/company/portal/(setup)/page.tsx` |
| `/tools/auto-furnish-sandbox` | AI sandbox | — | Card S41 (queued) · excluded as a dev page |
| `/tools/detect-sandbox` | AI sandbox | — | Card S41 (queued) · dev page |
| `/tools/floorplan-3d-sandbox` | AI sandbox | — | Card S41 (queued) · dev page |
| `/tools/quote-template-sandbox` | Template sandbox | — | Card S41 (queued) · dev page |
| `/tools/relight-sandbox` | AI sandbox | — | Card S41 (queued) · dev page |
| `/tools/style-transfer-sandbox` | AI sandbox | — | Card S41 (queued) · dev page |
| `/tools/visualizer-sandbox` | AI sandbox | — | Card S41 (queued) · dev page |
| `/studio-setup` | The forced 7-step wizard | Settings › Roles & access › Set up your studio (S08: a checklist, never forced) | Home exists · old address 404 · `app/settings/studio-setup-card.tsx` |
| `/login` | Studio sign-in | `/sign-in` (S30) | Redirects · `app/login/page.tsx` |
| `/onboarding` | Studio sign-up | `/sign-up` (S31) | Redirects · `app/onboarding/page.tsx` |

## 2 · Client links and the portal (23)

| 1.0 page | 2.0 | Status · confirmed by |
|---|---|---|
| `/my` | the studio's portal | Redirects · `app/my/page.tsx` |
| `/my/login` | `/my/<address>/login` | Redirects · `app/my/login/page.tsx` |
| `/my/[studioSlug]` | `/my/[slug]` (old slugs resolve) | Same address · `app/my/[slug]/(home)/page.tsx` |
| `/my/[studioSlug]/about` | `/my/[slug]/about` | Same address · `app/my/[slug]/about/page.tsx` |
| `/my/[studioSlug]/login` | `/my/[slug]/login` | Same address · `app/my/[slug]/login/page.tsx` |
| `/my/[studioSlug]/p/[portalToken]` | the portal (sign-in first) | Redirects · `app/my/[slug]/p/[token]/page.tsx` |
| `/my/[studioSlug]/projects/[projectId]` | the portal | Redirects · `app/my/[slug]/projects/[projectId]/page.tsx` |
| `/my/[studioSlug]/team` | `/my/<address>/about` | Redirects · `app/my/[slug]/team/page.tsx` |
| `/my/[studioSlug]/preview/[view]` | The studio's mock preview of its portal → Company › Client portal › Open as a test client (`/my/<slug>/preview?client=`) | Home exists · old address 404 (used by studio staff only) · `app/my/[slug]/preview/route.ts` |
| `/my/engagement/[linkId]` | the portal (Before work starts) | Redirects · `app/my/engagement/[linkId]/page.tsx` |
| `/my/projects/[projectId]` | the portal | Redirects · `app/my/projects/[projectId]/page.tsx` |
| `/pay/[token]` (old project portal) | the portal | Redirects · `app/pay/[token]/page.tsx` |
| `/pay/inv/[token]` | `/invoice/<token>`, else the portal's Money | Redirects · `app/pay/inv/[token]/page.tsx` |
| `/pay/receipt/[token]` | `/receipt/<token>`, else Money | Redirects · `app/pay/receipt/[token]/page.tsx` |
| `/po/[token]` | `/po/[token]` | Same address · `app/po/[token]/page.tsx` |
| `/quote/[token]` | `/quote/[token]` (view-only link, S02) | Same address · `app/quote/[token]/page.tsx` |
| `/quote-preview/[token]` | `/quote/<token>` | Redirects · `app/quote-preview/[token]/page.tsx` |
| `/renders/[token]` | `/renders/[token]` | Same address · `app/renders/[token]/page.tsx` |
| `/sign/[token]` | `/sign/<token>` (`contracts.sign_token`, S03) | Same address · `app/sign/[id]/(sign)/page.tsx` |
| `/sign/quote-xray/[token]` | the studio's notice | Redirects · decided, X-Ray Q-24 · `app/sign/quote-xray/[token]/page.tsx` |
| `/floor-plan/view/[token]` | `/space/<token>` | Redirects · `app/floor-plan/view/[token]/page.tsx` |
| `/copilot/share/[shareId]` | `/meeting/<token>`, else a notice (S23) | Redirects · `app/copilot/share/[shareId]/page.tsx` |
| `/hangouts/[eventId]` | `/hangout/<token>`, else a notice (S27) | Redirects · `app/hangouts/[eventId]/page.tsx` |

## 3 · The public site (26)

| 1.0 page | 2.0 | Status · confirmed by |
|---|---|---|
| `/` (website home) | `/site` (S35 decision 1: the site lives at `/site`; the developers may publish it at the domain root). 2.0's `/` is the studio's front door | Moved, decided · `app/site/(home)/page.tsx`, `app/page.tsx` |
| `/platform`, `/platform/[module]` (8 modules) | `/site/platform`, `/site/platform/<2.0 name>` | Redirects · `lib/site/model.ts:92-100` (all eight 1.0 module slugs) |
| `/story`, `/about` (already a redirect in 1.0) | `/site/story` | Redirects · `lib/site/model.ts:101-102` |
| `/products`, `/ai-agents` (already redirects in 1.0) | `/site/platform` | Redirects · `lib/site/model.ts:103-104` |
| `/pricing` (hidden in 1.0) | `/site` (plans live inside the app) | Redirects · decided, S35 · `lib/site/model.ts:105` |
| `/trust` · `/blog` · `/blog/[slug]` · `/changelog` · `/careers` · `/contact` · `/privacy` · `/terms` · `/cookies` (9) | `/site/*` | Redirects · `lib/site/model.ts:107-115`; pages `app/site/{trust,blog,changelog,careers,contact,privacy,terms,cookies}` |
| `/try` (older demo) | `/site/try` | Redirects · `lib/site/model.ts:116` |
| `/try-visualizer` + 6 tools (`style`, `materials`, `lighting`, `furniture`, `defurnish`, `sketch`) | `/site/try`, `/site/try/<tool>` (S36) | Redirects · `lib/site/model.ts:117-118`, `app/site/try/[tool]/page.tsx` |
| `/uae-get-started` | — | Parked by him (S33 countries; S35 "UAE page held") |

Pages counted: `/` 1 · platform 2 · story/about 2 · products/ai-agents 2 · pricing 1 · 9 · try 1 · try-visualizer 7 · UAE 1 = 26.

## 4 · Platform admin (28) — excluded by him

`/admin` · `/admin/login` · `accreditations` · `activity` · `agreements` · `analytics` · `analytics/features` · `analytics/funnels` ·
`analytics/studios` · `analytics/studios/[studioId]` · `beta-signups` · `billing` · `brand-dossiers` · `complaints` · `hangouts` ·
`hangouts/[eventId]` · `market-insights` · `notifications` · `plans` · `portfolio` · `promotions` · `refunds` · `settings` · `studios` ·
`studios/[id]` · `templates` · `users` · `verification` — **Excluded (admin)**. (Their studio-side counterparts are mapped in the sections
above: accreditations → the brand kit, beta sign-ups → S35's table, Hangouts → S27, market insights → S25, verification → S37.)

## 5 · Special route files

| 1.0 file | 2.0 | Status · confirmed by |
|---|---|---|
| `src/app/not-found.tsx` (the app-wide 404: logo, "This page doesn't exist. The link may be old, or the page may have moved.", Back to home) | Only for `/site` and four record pages | **MISSING → M2** · `find app -name not-found.tsx` finds `app/site`, `app/leads/[id]`, `app/projects/[id]`, `app/market-insights/[articleId]`, `app/marketplace/[brandId]`; there is no `app/not-found.tsx` |
| `src/app/(marketing)/not-found.tsx` | `app/site/not-found.tsx` + `app/site/[...rest]` | Mapped (S35) |
| `src/app/sitemap.ts` · `robots.ts` | `app/sitemap.ts` · `app/robots.ts` + `public/llms.txt` | Mapped (S35) |
| `src/app/manifest.ts` (installable app: name, icon, standalone) + `favicon.ico` | none — no manifest, no favicon in `app/` or `public/` | Recorded, still open: S35 *Found in 1.0*: "for the developers / Vicky (2.0 has no app icon set yet)" |

---

## 6 · The project page's tab strip — 1.0 `src/app/(main)/projects/[projectId]/page.tsx:1877`

| 1.0 tab › sub-tab | 2.0 (`lib/projects/tabs.ts` `PROJECT_TAB_GROUPS`) |
|---|---|
| Overview | Overview |
| Management › Milestones · Tasks · Materials (the selection board, `:2938`) · Floor Plan | Schedule · Tasks · Design › Choices · Design › Floor plan |
| Finance › Overview · Contract/VO · Invoices · POs · Expenses · Bills · Receipts | Money (parity map 28, P-A…P-E) |
| Files & Docs (folders All · Contract/VO · Floor Plans · Renders · Quotes & BOQ · Site Photos · Variation Orders · From Qanvast) | Files & notes › Files; starter folders `lib/leads/file-model.ts:93` (nothing in 1.0 wrote "From Qanvast", H-98) |
| Activity | Files & notes › Activity |

## 7 · Accounts Setup's menu — 9 groups, 44 entries (`accounts/page.tsx:79-160`)

| Group › entry | 2.0 home | Status · confirmed by |
|---|---|---|
| Studio › Team Members | Company › Members (+ Invite, S09) | Mapped · `app/company/members/(list)/page.tsx` |
| Studio › Legal Entities | Company › Profile › issuing entities | Mapped · `components/company/profile-view.tsx` |
| Studio › Roles & Permissions | Settings › Roles & access › Who may do what (read-only) | Mapped; the editor is held by him (Q-40, S14 REG-1824) · `app/settings/studio-settings.tsx` |
| Studio › Studio Health | — | Card S39 (queued) |
| Lead Management › Lead Experience | — | Decided: Journey excluded (LM-01, DEF-04) |
| Lead Management › Lead Funnel | Settings › Lead management › Lead stages | Mapped (S05; editing the funnel stays held) · `app/settings/lead-stages-card.tsx` |
| Lead Management › Lead Categories | — | Decided: dead in 1.0 (LM-06, Q-17; S14) |
| Lead Management › Lead Sources | Settings › Lead management › Lead sources | Mapped · `app/settings/settings-view.tsx:80` |
| Lead Management › Custom Fields | Settings › Lead management › Custom fields | Mapped · `app/settings/custom-fields-card.tsx` |
| Lead Management › Lead Webhooks | Company › Integrations › Webhooks | Mapped · `components/company/integrations-view.tsx` |
| Quotes & Pricing › Quote Categories | Settings › Quotes & pricing › Trades (sub-categories: no, Q-18) | Mapped · `app/settings/settings-view.tsx:605` |
| Quotes & Pricing › Document Templates | Company › Templates + Settings › Finance › Invoice paper / PO paper | Mapped · `lib/company/sections.ts` `TEMPLATE_KINDS`, `components/projects/money/invoice-paper-settings.tsx`, `components/finance/po-paper-settings.tsx` |
| Quotes & Pricing › Signing Documents | Company › Templates › Contracts (+ PDF templates, S03) | Mapped · `components/company/templates/upload-pdf-dialog.tsx` |
| Quotes & Pricing › Packages | Company › Price book › My Sections | Mapped · `app/company/price-book/sections/page.tsx` |
| Quotes & Pricing › Quote Rules (Starter Quote) | My Sections with property-type tags | Decided: held, templates Q-07, kept in S04 |
| Quotes & Pricing › Price Book | Company › Price book | Mapped · `app/company/price-book/(items)/page.tsx` |
| Quotes & Pricing › Quote Approval Rules | Settings › Quotes & pricing › Quote approval + backup approver | Mapped (thresholds decided no, quote editor Q-24) · `settings-view.tsx` (`setQuoteApproval`) |
| Quotes & Pricing › Quote Sharing | — | Decided: nothing to port (templates Q-09; 1.0 saved it and never read it) |
| Workflow › Workflow Rules | Settings › Projects › What waits for an Owner or an Admin (lead gates: no, leads Q-26) | Mapped · `app/settings/owner-approvals.tsx`, `lib/projects/schedule-rules.ts` |
| Workflow › Feature Flags (lock quote sharing · lock project on handover · CaseTrust step · carry sub-categories) | A client sees only an approved quote (S02) · handover always locks · `lib/contracts/casetrust.ts` · sub-categories: no (Q-18) | Mapped / decided · `lib/contracts/casetrust.ts` |
| Workflow › Proactive Alerts | Settings › Projects › Schedule: the alerts' lead time 1–30 days | Mapped (gaps C) · `components/projects/schedule/schedule-settings.tsx:24`, `lib/projects/schedule-rules.ts` |
| Workflow › AI Assignment Logic | — | Decided: dead in 1.0 (LM-11, Q-17) |
| Projects › Project Types | 2.0's three fixed types | Decided: Leads Q-34, "stays the Won step's three". S31 flagged the editor as "his call" (see §10) |
| Projects › Timeline Templates | Company › Templates › Schedules | Mapped · `app/company/templates/(libraries)/schedules/page.tsx` |
| Projects › Pipeline Stages (legacy) | — | Decided: dead in 1.0 (LM-12) |
| Projects › Material Catalog | Company › Materials | Mapped · `app/company/materials/page.tsx` |
| Projects › Escalation Categories | Settings › Projects › Ticket categories | Mapped · `components/projects/tickets/ticket-categories-setting.tsx`, `lib/projects/tickets-model.ts:32` |
| Finance › Project & Payments (milestones per project type, payment %, payout) | Templates › Schedules + Payment schedules + commission per stage (P-C) | Mapped · `app/company/templates/(libraries)/{schedules,payments}` |
| Finance › Payment Schedules | Company › Templates › Payment schedules | Mapped · `app/company/templates/(libraries)/payments/page.tsx` |
| Finance › Expense Categories | Settings › Finance › Money out | Mapped (S06) · `components/finance/expense-categories-settings.tsx` |
| Finance › Commission & Payouts | Settings › Finance › Commission | Mapped · `components/finance/books/books-settings.tsx:69` |
| Finance › PO Settings | Settings › Finance › Money out (approvals, limit, PO paper) | Mapped · `components/finance/po-paper-settings.tsx` |
| Finance › Document Numbering | Settings › Finance › Document numbers | Mapped · `app/settings/document-numbers.tsx` |
| Finance › Payment Methods | Settings › Finance › How clients pay | Mapped · `components/projects/money/payments-settings.tsx:151` |
| Finance › Accounting Integration | Company › Finance › Xero + Integrations' Xero card | Mapped · `lib/finance/sections.ts:35`, `components/company/integrations-view.tsx:24` |
| Branding & Comms › Studio Branding | Company › Templates › Brand kit | Mapped · `app/company/templates/brand/page.tsx` |
| Branding & Comms › Accreditations | Brand kit › Badges (any picture) + Profile › Registrations & accreditations | Mapped · `components/company/templates/brand-kit-view.tsx:154-167`, `components/company/profile-view.tsx:187` — the check S37 asked for is in §10 |
| Branding & Comms › Chat Identity | — | Decided: nothing to build (S31: Messages use the studio's name) |
| Branding & Comms › Review Link | Company › Profile › Reviews (S14) | Mapped · `components/company/profile-view.tsx:176` |
| HomeOwner Portal › HomeOwner Portal (features · branding · layout · scope · team · about) | Company › Client portal; Questionnaire; members' portal fields; About. Portal themes were dropped by him | Mapped · `app/company/portal/(setup)/page.tsx` |
| AI & Copilot › Copilot Tuning · Objection Responses · Meeting Checklists · Competitor List (4) | Settings › Meetings (S23) | Mapped · `app/settings/meetings-settings.tsx`, `lib/settings/copy.ts:50-54` |

## 8 · Personal Settings' sections — 12 (`settings/page.tsx:34-47`)

| Section | 2.0 | Status · confirmed by |
|---|---|---|
| Your Profile | Your profile `/profile` | Mapped (S01) · `app/profile/page.tsx` |
| Lead Preferences (designers) | Company › Members › a member's preferences, linked from Your profile | Mapped · `components/profile/your-profile-view.tsx:213-217`, `components/company/members-view.tsx:452` |
| Studio Region | — | Parked by him (S33, DEF-30) |
| My Signature | Your profile (consent-gated, S03) | Mapped (S01) · `app/profile/page.tsx` |
| Ads & Promotions | — | Decided: dead (nothing reads it; ST-16; S14 "personal prefs") |
| ID Buddy AI | — | Decided: dead (same) |
| Home Screen (chat-first · classic) | — | Parked by him (card `studio:personal-settings`, S32 parked whole) |
| Appearance (light · dark) | — | Parked by him (S32) |
| Theme Skins | — | Parked by him (S32) |
| Notifications | Your profile › Your notifications (S18) + Settings › Notifications | Mapped · `components/profile/your-notifications.tsx`, `app/settings/notifications-settings.tsx` |
| Email Lead Sources | Company › Integrations › Email (Gmail) | Mapped · `components/company/integrations-view.tsx` |
| Guided Tours | — | Parked by him (S32) |

## 9 · The shell's menus

**Sidebar** (`app-sidebar.tsx`) — top items: Dashboard → rail Dashboard; Leads → Leads; Chats → Messages; Projects → Projects; Tasks →
Tasks; Escalations → Projects › Tickets (S16: no rail place, "tickets are Projects › Tickets"); Marketplace → Marketplace. **Finance ▸**
Operations (address 404, M1) · Pipeline · Commissions · Reports · Vendors → Company › Finance / Reports. **Tools ▸** (9) → Tools ›
Quotes · Quote X-Ray · AI Visualizer · Floorplan to 3D Isometric · Market Insights · Compliance Navigator · 3D Space Planner · Meeting
Copilot; Homeowner Portal → Company › Client portal. **Qanvast Ops ▸** Credits → Qanvast Ops › Lead credits (signpost); Qanvast Leads →
Qanvast Ops › Leads; Raise Complaint · Promote → *Decided* (S16: "nothing to port", 1.0's pages are gone, "not drawn"); Portfolio → S27's
public profiles (S40 checks); Reviews & Rankings → Qanvast Ops › Reviews (signpost) + Profile › Reviews; Hangouts → Qanvast Ops ›
Hangouts. The collapse toggle → the rail's Expand / Collapse; the skin mascot → parked (S32). Confirmed by: `components/shell/app-rail.tsx:35-47`,
`tools-popover.tsx:21-30`, `components/qanvast/qanvast-tabs.ts`, `outcome-S16.md:30`.

**Top bar** (`topbar.tsx`): hamburger → rail pin; logo → Dashboard — *decided*, 2.0's logo expands the rail (the mock 795:22541; S16, S22);
search, mobile search → ⌘K search (`components/shell/global-search.tsx`; scopes include Tickets and Messages, `lib/global-search/model.ts:37-72`);
bell → Notifications panel (`notifications-panel.tsx`); Open / Closed to new leads → the studio block's menu and the phone's You sheet
(S16, `view-as-popover.tsx:239-249`); Tools & Apps grid (7 tools + 5 Finance + 7 Qanvast Ops) → as for the sidebar. **Profile popover:**
Accounts Setup → Settings + Company; Settings → Your profile (`view-as-popover.tsx:231`); Sign out → Sign out (S30, `:141`); the Pro badge →
the rail's AI credits (`rail-credits.tsx`).

**Phone bar** (`bottom-nav.tsx`): Home → Dashboard; Leads; Chats → the top bar's Messages; Projects (`mobile-nav.tsx:33-36, 139`). **More:**
Tasks · Escalations (→ Tickets) · Marketplace · Tools ×6 (3D Space Planner was Coming soon in 1.0) · Finance ×4 · Qanvast Ops ×7 → More's
Tasks · Marketplace · Company · Qanvast Ops · Settings, with Tools in the bar (`mobile-nav.tsx:35-45`).

**Keys** (`keyboard-shortcuts.ts`): G D · G L · G P · G T → the same (`lib/keys/registry.ts:136-149`); G I → G M Messages (S16); G F → G F
Company › Finance; G E → *decided*, no rail place (S16 `outcome-S16.md:32`); C · / · ⌘K · ? → the same (`registry.ts`, the ? panel
`components/shell/shortcuts/shortcuts-panel.tsx`).

**Floating parts** (`(main)/layout.tsx`): Maison FAB + ID Buddy panel → Maison AI (S10, `components/shell/maison-fab.tsx`, `maison-ai.tsx`);
Notification drawer → bell; Welcome modal → the first-visit welcome (S08, `components/shell/first-visit-welcome.tsx`); Page coach marks →
parked (S32, guided tours); Shortcuts help → the ? panel. The Quick Action menu (dead: nothing sets `showQuick`) and the offline banner →
*decided*, "Not brought" (S16 `outcome-S16.md` "1.0's frame · the offline banner; the Quick Action menu"). Page-view tracker → Studio Health
(S39); focus mode → the `(editor)` group's rail-less frame.

**Portal menus** (`components/homeowner/*`): the bottom nav Home · Chat · Projects · Settings — *dead in 1.0* for Chat, Projects and Settings
(`/my/chat`, `/my/projects`, `/my/settings` have no page; only `/my/projects/[projectId]` exists). 2.0's bar is Home · Schedule · Updates · Money · More (`lib/portal/model.ts:121-141`). The
project tabs Overview · Design · Finance · Documents · Support → Home · Choices / Designs / Floor plan · Money · Files · Messages / Issues.
The preview's other five tabs (Moodboard · Scope · …) were mock-only (inventory I-404, I-411). Profile menu › Sign out → the portal's Sign
out (`app/portal/actions.ts:96`).

**Website header and footer** (`marketing-nav.tsx`, `marketing-footer.tsx`): Platform ▾ (8 modules + overview) · Story · Resources ·
Log in · Book a demo; the phone tabs Home · Platform · Book a demo · Resources · Story; the footer's company links (6), legal links (3),
newsletter and socials → `components/site/site-shell.tsx`, `site-footer.tsx`, `book-demo.tsx` (S35). The footer's "Available in" country
list → parked (S33).

**How the menu entries were counted (140 unique):**
- **Sidebar, 30:** 7 top items, Finance 5, Tools 9, Qanvast Ops 7, the collapse toggle and the mascot. Decided: Credits · Raise Complaint
  · Promote · Reviews & Rankings. Parked: the mascot.
- **Top bar, 11:** hamburger, logo (decided), search, phone search, bell, Open / Closed, the Tools & Apps button, Accounts Setup,
  Settings, Sign out and the Pro badge. The grid's 19 tiles repeat the sidebar.
- **Phone bar, 5:** Home, Leads, Chats, Projects, More. More's 20 tiles repeat the sidebar.
- **Keys, 11:** G D/L/I/P/T/E/F, C, /, ⌘K, ?. Decided: G E.
- **Floating parts, 10:** Maison FAB, ID Buddy panel, Notification drawer, Welcome modal, Shortcuts help, focus mode, coach marks
  (parked), Quick Action menu and offline banner (both decided in S16), page-view tracker (S39).
- **Accounts, 44** (§7). Decided: Lead Experience · Lead Categories · Quote Rules · Quote Sharing · AI Assignment · Project Types ·
  Pipeline Stages · Chat Identity. Card: Studio Health.
- **Settings, 12** (§8).
- **Portal, 11:** the bottom nav 4 (Chat · Projects · Settings dead), the real project tabs 5, the mock preview's tab set 1 (dead) and
  Sign out 1.
- **Website, 6:** Platform ▾, Log in, Book a demo, newsletter, socials, and the "Available in" country list (parked).

Every entry is mapped, decided, parked, dead or on a card: **0 MISSING menu entries.**

---

## Missing

### M1 · 1.0's studio-app addresses land on a 404 in 2.0 (28 page addresses + 1.0's notification deep links)

**What it is in 1.0.** Every studio page has an address. Members bookmark them, and 1.0's notifications carry them in bell rows, emails
and WhatsApp messages already sent. The `actionUrl` patterns in `src/lib/**` and `src/app/api/**`, with how often each appears:
`/leads?leadId=<id>` ×7, `/finance/operations?invoiceId=<id>` ×6, `/finance/operations` ×6, `/escalations/<id>` ×6,
`/projects/<id>?tab=management…` ×8, `/accounts` ×3, `/finance/operations?tab=invoices&project=<id>` ×2,
`/projects/<id>?tab=finance&financeSubTab=contract`, `/finance/commissions`. S02 redirected 1.0's *client* links (D-11). S35 redirected
the website's old addresses. Nothing redirects the studio app's own addresses: S25 recorded this ("no 1.0 studio page … redirects either.
For S41b's sweep of 1.0's routes, if he wants studio bookmarks carried"). No card covers it and nothing was decided. 2.0 has no
`app/not-found.tsx` (M2), so all of these land on Next's unstyled 404.

**Today in 2.0** (each confirmed in §1 and §2):

| 1.0 address | Should land on |
|---|---|
| `/inbox` | `/chat` |
| `/escalations` · `/escalations/new` | `/projects/tickets` |
| `/escalations/<id>` | `/projects/tickets?open=<id>` |
| `/finance/operations` (+ `?invoiceId=` · `?tab=invoices&project=`) | `/company/finance/todo`; with an invoice: `/company/finance/money-in` (invoices) or the invoice's paper |
| `/finance/invoices/<id>/preview` · `/finance/pos/<id>/preview` | `/projects/<project>/invoices/<id>` · `/projects/<project>/purchase-orders/<id>` (needs the project id) |
| `/finance/vos/<id>/preview` | `/quotes/<id>/preview` |
| `/accounts` · `/accounts?tab=<x>` | Each tab's home in §7. Examples: `team` → `/company/members`; `funnel` → `/settings?section=leads#lead-stages`; `numbering` → `/settings?section=finance`; `copilot-tuning` → `/settings?section=meetings`; `portal` → `/company/portal`; the default (no tab) → `/settings` |
| `/accounts/roles` | `/settings?section=studio` |
| `/accounts/milestone-templates` | `/company/templates/schedules` |
| `/accounts/usage` | Studio Health's home once S39 lands (until then `/company/reports`) |
| `/settings/notifications` | `/settings?section=notifications` |
| `/upgrade` | `/company/plan/billing` |
| `/studio-setup` | `/settings?section=studio` (Set up your studio) |
| `/leads/new` · `/projects/new` | `/leads?new=1` · `/projects?new=1` |
| `/leads?leadId=<id>` (opens the listing but not the lead) | `/leads/<id>` |
| `/leads/<id>/quote-preview-popout?quoteId=<q>` | `/quotes/<q>/preview` |
| `/tools/quote-digitizer` · `quote-xray` · `ai-visualizer` · `floorplan-3d-isometric` · `market-insights` (+ `/<id>` → `mi-<id>`) · `compliance-navigator` · `floor-plan` · `copilot-analytics` · `homeowner-portal` | `/quotes` · `/quote-x-ray` · `/visualizer` · `/planner?view=iso&photo=1` · `/market-insights` · `/compliance` · `/planner` · `/meetings` · `/company/portal` |
| `/my/<slug>/preview/<view>` (studio staff only) | `/company/portal` (Open as a test client) |
| `/projects/<id>?tab=management&sub=floor-plan` · `?tab=finance…` (the page opens, but on Overview) | Optional: `/projects/<id>/floor-plan` · `/projects/<id>/money` · `/projects/<id>/schedule` |

`/qanvast-ops/*` and the sandboxes are left out on purpose: 1.0 has no page there either (removed 2026-06-01), and S41 owns the sandboxes.

**Proposed 2.0 home.** One `OLD_APP_ADDRESSES` list beside `OLD_SITE_ADDRESSES`, served by `next.config.ts` `redirects()` (307 until the
developers make it permanent). It would use `has: [{ type: 'query', key: 'tab', value: … }]` for `/accounts?tab=` and `/leads?leadId=`.
Three addresses need a small server route each, because they look up a record: the invoice and PO previews (which project?) and
`/finance/operations?invoiceId=`. **Nothing visible changes**: these are redirects, but they are his call because they change where a link
lands. **Size: S.** About 40 entries, 3 lookup routes, and a probe that requests each 1.0 address and checks the 2.0 page it lands on.

### M2 · 2.0 has no app-wide "page not found"

**What it is in 1.0.** `src/app/not-found.tsx`: the global 404 for any address no route matches. It shows the logo, "404", "This page
doesn't exist.", "The link may be old, or the page may have moved." and **Back to home**, rendered outside the website's shell. The website
has its own 404 too (`(marketing)/not-found.tsx`).

**Today in 2.0.** Only `/site` (`app/site/not-found.tsx` + `[...rest]`), `/leads/[id]`, `/projects/[id]`, `/market-insights/[articleId]`
and `/marketplace/[brandId]` have one. Any other unmatched address shows Next's default unstyled "404 | This page could not be found."
That covers every M1 address, a mistyped address, and any `notFound()` thrown outside those four segments (for example
`app/company/finance/[tab]/page.tsx:29`). It has no rail, no Back and no house look. No card covers it, and no step decided it: S35 brought
only the website's 404.

**Proposed 2.0 home.** `app/not-found.tsx` on the house pieces, the same family as `components/shell/record-not-found.tsx` (REG-1166): the
shell when signed in, the plain auth frame when signed out, one filled button (Back, named by its origin, else Dashboard), and its own ghost.
**Visible, so it needs his approval and his words** (the sentences would be invented copy). **Size: XS–S.** One file, one probe at 1440 and
390.

---

## 10 · Recorded but still open — checks other steps handed to this sweep (none is MISSING)

- **Accreditation badges (S37's ask).** 1.0's Accounts › Accreditations turns each badge on or off from a platform-curated catalogue. The
  catalogue is 8 Singapore badges: HDB LRP, bizSAFE Star, bizSAFE L4, CaseTrust, CaseTrust + RCMA, SDIDA, Qanvast Trusted and Qanvast
  Supertrust (`scripts/migrations/178_platform_accreditation_badges.sql:21-30`). The quote's Accreditation strip prints the badges
  that are on. In 2.0, the brand kit's Badges take **any uploaded picture** (`brand-kit-view.tsx:154-167`), so every one of those 8 can be
  placed on a template's strip. Profile › Registrations & accreditations records CaseTrust, HDB, bizSAFE, BCA and ACRA once. The demo ships
  stand-ins (`lib/templates/assets.ts` `DEMO_BADGES`). **The strip is covered.** The one difference: 2.0 offers no ready-made badge
  pictures to switch on. The curation is Platform admin's (excluded), so nothing is built for it.
- **Project Types editor.** S31 left it for S41b as "his call whether studios edit them". It is decided by Leads Q-34: "Project type stays
  the Won step's three? Yes; the devs map 1.0's six". It is not MISSING, but an editor was never asked for by name. Each type drives its
  schedule rule (`lib/projects/model.ts` `PROJECT_TYPES`).
- **The web manifest and the app icon** (§5). S35 recorded them for the developers and Vicky. 2.0 has no installable-app manifest and no
  favicon.
- **Qanvast Ops › Raise Complaint · Promote.** S16 recorded "nothing to port" because 1.0's pages are gone. Note for the API sweep: 1.0
  still has the studio's side of complaints (`/api/complaints/records` GET · POST, `…/[id]/messages`; tables `complaint_tickets` ·
  `complaint_messages`), and only Admin › Complaints uses it today. Its studio portfolio API (`/api/studio-config/portfolio`) feeds
  the co-pilot's portfolio search. S40 checks portfolios after S27.
- **Studio Health (S39) and the AI sandboxes (S41)** are still queued. Their rows above turn green once those steps land. `/accounts/usage`'s
  redirect (M1) should point at S39's home.
- **1.0's `/settings` bookmarks with an anchor** (`#profile`, `#my-signature`, …) open 2.0's studio Settings, not Your profile. An anchor never
  reaches the server, so no redirect can catch it. Settings' module head could say "Looking for your profile?" if he wants it; this is a
  visible change.

## 11 · Seen while sweeping, outside pages and menus (for the other S41b sweeps)

- S29: the quote document editor's parts (sections as blocks, conditional visibility, bulk delete / duplicate, page breaks) are to be
  confirmed against S11's outcome.
- S30: `auth_sessions` usage events go with Studio Health (S39). The sign-in terms line is already **built** by S35
  (`components/auth/terms-line.tsx`).
- S34: crons `price-drift` and `aggregate-rates` (market rates).
- S35: the module FAQs (`lib/site/platform.ts` `MODULE_FAQS`) are in the code but not drawn on the page.
- S31: the interview doc's lead assignment (auto / round-robin) is not in 1.0's code, so there is nothing to port.
