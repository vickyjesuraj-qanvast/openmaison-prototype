# 1 · The shell and navigation: what a 1.0 user can reach that a 2.0 user can't find

Read from 1.0 through git only: `origin/deployment/qanvast` (Q), `origin/deployment/plg` (P), `origin/urbanhomedemo` (U).
Files: `src/components/layout/{app-sidebar,topbar,bottom-nav,notification-drawer,quick-action-menu,search-results}.tsx`, `src/lib/keyboard-shortcuts.ts`, `src/lib/hooks/use-keyboard-shortcuts.ts`, `src/app/(main)/{layout,dashboard/page,settings/page,verify/page,upgrade/page}.tsx`, `src/components/dashboard/*`, `src/components/ui/{welcome-modal,page-coach-marks}.tsx`, `src/lib/access-control.ts`, P's `src/components/om-shell/*` and `src/lib/om/{flag,tools-nav,company/sections}.ts`.
2.0 claims were checked in code. The ⌘K results below come from running `pageHits()` / `createHits()` from `lib/global-search/model.ts` on 1.0's words, as a pure function. No server was started.

Note on P: production runs `NEXT_PUBLIC_OM_UI="1"` (`src/lib/om/flag.ts`). Its users already see a 2.0-style rail. That rail still has **Chats, Escalations, a Finance group and Qanvast Ops**, plus a **Company** panel that includes **Settings** (`/company/settings`).

## Inventory

| # | 1.0 entry (as a user sees it) | 1.0 route · file · branch | 2.0 home (as a user sees it) · URL | Status | Can a 1.0 user find it? | Record |
|---|---|---|---|---|---|---|
| 1 | Sidebar › Dashboard | `/dashboard` · app-sidebar.tsx:197 · Q P U | Rail › Dashboard · `/dashboard` | SAME | Yes: it is the rail's first item. G D works. | REG-2002…2013 (S22) |
| 2 | Sidebar › Leads, with a badge counting new leads | `/leads` · app-sidebar.tsx:113,198 · Q P U | Rail › Leads · `/leads` (no badge) | PARTIAL | The page is easy to find. The new-leads count is gone: `railBadges` has no `/leads` (lib/leads/tasks.ts:177-188). New leads now show as the listing's unseen band and as a `new_lead` bell row, which goes to Owners and Admins only. | none found for the badge |
| 3 | Sidebar › Chats, with an unread badge | `/inbox` · app-sidebar.tsx:199 | Rail › Messages, also the phone top bar · `/chat` | RENAMED | Yes. It is on the rail. ⌘K "chats" and "inbox" both find Messages. `/inbox` redirects. G I is dead; the key is now G M. | REG-1373, REG-2110, REG-1830 |
| 4 | Sidebar › Projects, with a badge | `/projects` · :200 | Rail › Projects, badge = projects that need attention | SAME | Yes | REG-919 |
| 5 | Sidebar › Tasks, with a badge | `/tasks` · :201 | Rail › Tasks, badge = overdue tasks | SAME | Yes | REG-466 |
| 6 | **Sidebar › Escalations, with a badge counting open tickets** | `/escalations` · app-sidebar.tsx:202 (also P's OM rail) | Projects › ⋮ More options › **Tickets** · `/projects/tickets`. Also each project's Client › Tickets. | MOVED | **Hard.** There is no rail item and no badge. The only door to the studio-wide list is a ⋮ row. ⌘K finds no page for "escalations", "tickets" or "issues". G E does nothing. `/escalations` redirects. | REG-1312, REG-1315, REG-1425, REG-2110 → **N-1** |
| 7 | Sidebar › Marketplace | `/marketplace` · :203 | Rail › Marketplace | SAME | Yes | REG-1898 |
| 8 | Sidebar › FINANCE › Operations | `/finance/operations` · app-sidebar.tsx:33 | Company › Operations › Finance (To do · Money in · Money out) · `/company/finance` | MOVED | Partly. It is not on the rail; it is a row in the Company panel. G F works. ⌘K "finance" works, but "operations" finds nothing. The old URL lands. | REG-1360, REG-2111 |
| 9 | Finance › Pipeline | `/finance/pipeline` · :34 | Company › Reports › Finance › Profitability | MOVED | ⌘K "pipeline" lists it third. The old URL lands. | REG-1360, REG-1361 |
| 10 | Finance › Commissions (the only Finance item a designer saw) | `/finance/commissions` · :35, :191 | Company › Finance › Commission | MOVED | ⌘K "commissions" finds it. The old URL lands. Designers can open it. | REG-1360 |
| 11 | Finance › Reports | `/finance/reports` · :36 | Company › Reports › Finance | MOVED | ⌘K "reports" finds it. The old URL lands. | REG-1361 |
| 12 | Finance › Vendors | `/finance/vendors` · :37 | Company › Finance › Vendors | MOVED | ⌘K "vendors" finds it. The old URL lands. | REG-1360 |
| 13 | Tools › Quote Digitizer (the first tile) | `/tools/quote-digitizer` · :21 | Tools › **Quotes** → Create Quote › Upload a quote · `/quotes` | RENAMED | Partly. No tile carries that name. ⌘K "quote digitizer" and "digitizer" find nothing. The old URL goes to `/quotes`. | REG-413, REG-2045 → **N-4** |
| 14 | Tools › Quote X-Ray | `/tools/quote-xray` · :22 | Tools › Quote X-Ray · `/quote-x-ray` | SAME | Yes. The old URL lands. | REG-529 |
| 15 | Tools › AI Visualizer | `/tools/ai-visualizer` · :23 | Tools › AI Visualizer · `/visualizer` | SAME | Yes | REG-673 |
| 16 | Tools › Floorplan to 3D Isometric (Beta) | :24 | Tools › Floorplan to 3D Isometric · `/planner?view=iso&photo=1` | SAME | Yes. On ⌘K it only finds the Create row "Make a 3D picture". | REG-1928 (S28) |
| 17 | Tools › Market Insights | :25 | Tools › Market Insights | SAME | Yes | REG-1918 |
| 18 | Tools › Compliance Navigator (Owner only) | :26 | Tools › Compliance Navigator · `/compliance` | SAME | Yes | REG-1336 |
| 19 | Tools › 3-D Space Planner | `/tools/floor-plan` · :27 | Tools › 3D Space Planner · `/planner` | SAME | Yes, from the tile. ⌘K "3-D Space Planner", typed with the hyphen, finds nothing; "space planner" works. | REG-1342 → N-4 |
| 20 | Tools › Meeting Copilot (Owner only on Q) | :28 | Tools › Meeting Copilot · `/meetings` | SAME | Yes | REG-1855 |
| 21 | Tools › Homeowner Portal (Owner only) | `/tools/homeowner-portal` · :29 | Company › Client portal · `/company/portal` | MOVED | Partly. There is no Tools tile. ⌘K "homeowner portal" finds it, and the old URL lands. | REG-967 |
| 22 | P/U Tools › **Quotes** | `/tools/quotes` · P app-sidebar.tsx:32, P lib/om/tools-nav.ts:17 | Tools › Quotes · `/quotes` | MOVED | The tile is there, but **`/tools/quotes` lands on "page not found"** | REG-422; no redirect → **N-2** |
| 23 | Qanvast Ops › Credits (Owner only, studios listed on Qanvast) | `/qanvast-ops/credits` · Q :44 | Rail › Qanvast Ops › **Lead credits** | RENAMED | Yes: the rail item, then its tab. ⌘K "credits" finds it for an Owner. | REG-2143 |
| 24 | Qanvast Ops › Qanvast Leads | `/qanvast-ops/leads` · Q :45, P :69 | Qanvast Ops › Leads · `/qanvast-ops` | RENAMED | Yes. The old URL lands. | REG-2109 |
| 25 | Qanvast Ops › Reviews & Rankings | `/qanvast-ops/reviews` · Q :46 | Qanvast Ops › Reviews | RENAMED | Yes. ⌘K "reviews" works; "reviews & rankings" finds nothing. | REG-2143 |
| 26 | U Sidebar › **Contractors** (Beta), also phone More › Contractors | `/contractors` · U app-sidebar.tsx:178, U bottom-nav.tsx:45 | Projects › Workload view › the Contractors chip · `/projects?view=workload&of=contractors`. Also Finance › Vendors "Contractors · n" and a Dashboard tile. | MOVED | Partly. ⌘K "contractors" finds it. There is no rail item. **`/contractors` lands on "page not found"** | REG-2467 → **N-2** |
| 27 | Topbar › hamburger (collapse) and logo (→ Dashboard) | topbar.tsx:166-188 | The rail's logo tile expands the rail | LEFT OUT (recorded) | Dashboard is the rail's first item | REG-1835 |
| 28 | Topbar › Search (`/` and ⌘K; finds leads, projects, tasks, escalations and chats) | topbar.tsx:193-226 · search.ts | Rail › Search (⌘K), or the phone's glyph. `/` now finds on the page. | SAME (wider) | Yes. Tickets and Messages are scopes for records. | REG-709 |
| 29 | Topbar › bell: All / Unread, Mark all read | notification-drawer.tsx:144-230 | Rail › Notifications: Notices · Due, Mark all as read, Notification settings | PARTIAL | Yes. There is no Unread-only filter. | REG-604 |
| 30 | Topbar › Open / Closed to leads (designers) | topbar.tsx:283-335 | Studio block › Open to new leads (also the phone's You sheet) | MOVED | Yes. ⌘K "open to leads" finds it. | REG-1833 |
| 31 | Topbar › Tools & Apps grid (Tools · Finance · Qanvast Ops) | topbar.tsx:337-448 | Rail › Tools holds the tools only. Finance is in Company; Qanvast Ops is its own rail item. | MOVED | Yes | REG-422, REG-1360 |
| 32 | Avatar menu › **Accounts Setup** (Owner) | `/accounts` · topbar.tsx:502-510 | Rail › Settings (the rules) + the Company panel (the records) | MOVED | Partly. ⌘K "accounts setup" finds nothing; "accounts" finds only Expense categories. `/accounts?tab=` lands on the right card. | REG-643…648, REG-2112, REG-1835 → N-4 |
| 33 | Avatar menu › **Settings** (personal, every role) | `/settings` · topbar.tsx:511-517 | **Your profile** · `/profile`, from the studio block or the phone avatar | MOVED | **Hard.** The rail's Settings now holds the studio's rules and has no door to Your profile. Old `/settings#…` anchors do land. | REG-1672, REG-2109, REG-1835 → **N-3** |
| 34 | Avatar menu › Sign out | topbar.tsx:522-528 | Studio block › Sign out | SAME | Yes. ⌘K "sign out" and "log out" find it. | REG-1989…2001 (S30) |
| 35 | Avatar menu › plan badge (P: the real plan name) | P topbar.tsx:85-93 | Rail slot: Upgrade on Free, AI credits on a paid plan | MOVED | Yes | REG-701 |
| 36 | P topbar › CreditPill (balance, Buy credits) | P credit-pill.tsx:181 → `/settings/usage` | Rail credits slot + credits card; Company › Plan & AI credits | MOVED | The slot is easy to find. **`/settings/usage` lands on "page not found"**. ⌘K "usage" lands on Studio health, not on credits. | REG-701, REG-704 → N-2, N-4 |
| 37 | P › Upgrade (sidebar slot and `/upgrade`) | P om-shell/app-rail.tsx:566 | Rail slot Upgrade → Plans dialog; `/upgrade` → Plan & billing | SAME | Yes. ⌘K "upgrade" works. | REG-701, REG-2113 |
| 38 | P › TrialBanner on every page (cannot be dismissed with ≤3 days left or when past due) | P (main)/layout.tsx:40 | A line in the credits card ("Pro trial · ends …"); a `payment_failed` bell row | PARTIAL (unsure) | Unsure: I found no 2.0 banner that shows on every page and no "trial ends soon" event. This belongs to the credits audit. | none found |
| 39 | P › anonymous visitor's rail (the tools on the allow-list, behind the signup wall) | P app-sidebar.tsx:144-193 | `/site/try/*` | MOVED | Yes, from the website | REG-2066, REG-2125 |
| 40 | Phone dock › Home · Leads · Chats · Projects · More | bottom-nav.tsx:87-90 | Dock › Dashboard · Leads · Tools · Projects · More; Messages moves to the top bar | MOVED | Yes | REG-298/300, H-Q11 |
| 41 | Phone More › Pages › Tasks · **Escalations** · Marketplace | bottom-nav.tsx:28-32 | More › Tasks · Marketplace · Company · Qanvast Ops · Settings · View as | PARTIAL | Escalations is gone from the phone. It is reachable only through Projects › ⋮ › Tickets. | → N-1 |
| 42 | Phone More › Tools / Finance / Qanvast Ops grids | bottom-nav.tsx:34-56 | Dock › Tools sheet; More › Company › Finance; More › Qanvast Ops | MOVED | Yes | REG-1360 |
| 43 | Keys: G D · G L · G P · G T · G F · C · ? | keyboard-shortcuts.ts:11-33 | The same keys (G F now goes to Company › Finance) | SAME | Yes | REG-711…717 |
| 44 | Key **G then I** (Inbox) | keyboard-shortcuts.ts:13,30 | G then M | RENAMED | No: G I does nothing (lib/keys/registry.ts:137-150) | REG-1830 → N-5 |
| 45 | Key **G then E** (Escalations) | keyboard-shortcuts.ts:16,33 | none | LEFT OUT (recorded) | No | REG-1830 → N-1, N-5 |
| 46 | `/` and ⌘K, both "Focus search" | use-keyboard-shortcuts.ts:31-80 | ⌘K = studio search; `/` = find on this page | RENAMED | Yes | REG-709 |
| 47 | Home (chat-first): the AI box, 12 chips, widgets (Leads · Tasks · Projects · Chats · News · Team workload · Upcoming · Priority) | chat-first-home.tsx:41-52, :830-848 | Dashboard: Ask Maison AI box, Needs you, tiles, Workload, From Market Insights, Coming up | SAME | Yes | S22 outcome (REG-2002…) |
| 48 | Home › **Studio Pulse** › Escalations H/M/L + "View all" (Owners/Admins) | home-widgets.tsx:566 | One Needs you row per ticket, project by project (lib/projects/needs-you.ts:174-178). There is no "all tickets" door. | PARTIAL | No count and no View all | S22 outcome line 33 → N-1 |
| 49 | Classic dashboard + Settings › Home Screen toggle | dashboard/page.tsx:191-298; settings/page.tsx:41 | One page; the sample figures were not carried | LEFT OUT (recorded) | n/a | FROM §8; S22 outcome lines 38-39 |
| 50 | Welcome modal (Start Setup → `/accounts` · See My Leads) | welcome-modal.tsx:13-44 | First-visit welcome + Set up your studio | SAME | Yes. ⌘K "set up" finds it. | REG-1764…1767 |
| 51 | Page coach marks, `?reset-tour`, Settings › Guided Tours | page-coach-marks.tsx:29-110 | none | LEFT OUT (recorded) | n/a | REG-1771, FROM §8 |
| 52 | Quick Action menu (Start Meeting, New Lead, … Log Ticket) | quick-action-menu.tsx:18-24 | ⌘K Create rows (no "New ticket") | LEFT OUT (recorded) | Nothing opened it in 1.0 on any branch (`setShowQuick(true)` is never called) | REG-1835 |
| 53 | Maison FAB → ID Buddy panel | (main)/layout.tsx:214-217 | Maison AI button + sheet | SAME | Yes | REG-507 |
| 54 | Settings › Your Profile · My Signature · Notifications | settings/page.tsx:35-44 | Your profile `/profile` (details · signature · Your notifications) | MOVED | ⌘K "my signature" and "notifications" work. The rail's Settings does not lead there. | REG-1672, S18 → N-3 |
| 55 | Settings › Lead Preferences (designers) | settings/page.tsx:36 | Your profile › "New leads and preferences" → Company › Members (preferences dialog) | MOVED | Partly. ⌘K "preferences" and "lead preferences" find nothing. | REG-612 → N-4 |
| 56 | Settings › Email Lead Sources | :45 | Company › Integrations › Gmail | MOVED | ⌘K finds it | REG-602 |
| 57 | Settings › Studio Region · Ads & Promotions · ID Buddy AI · Appearance · Theme Skins | :37-43 | none (old anchors land on Your profile) | LEFT OUT (recorded) | n/a | FROM §8 (held countries; settings never read; parked) |
| 58 | P Settings › **Usage & credits** | `/settings/usage` · P settings/page.tsx:53 | Company › Plan & AI credits › Usage · `/company/plan` | MOVED | Partly. ⌘K "usage & credits" finds nothing, and "usage" finds Studio health. The old URL is 404. | REG-704 → N-2, N-4 |
| 59 | `/verify`: Verify for Qanvast Listing (no menu door in 1.0) | Q verify/page.tsx | Company › Profile › Listed on Qanvast | SAME (better) | Yes. ⌘K "verify" works and `/verify` redirects. | REG-2057…2065 (S37) |
| 60 | P/U OM-port Company › **Settings** (Studio · Quotes & pricing) and Leads settings | `/company/settings`, `/company/settings/quotes`, `/leads/settings` · P lib/om/company/sections.ts:27,75 | Rail › Settings modules | MOVED | You can find the rail item, but the **old URLs are 404**. `/leads/settings` falls into the lead page with id "settings" (unsure what it shows). | none found → N-2 |
| 61 | P/U OM-port `/company/profile/brand-kit`, `/visualizer/materials`, `/company/templates/tasks/<id>`, P `/billing/return` | P app/(main)/… | Templates › Brand kit · Company › Materials · `/templates/tasks/<id>` · Plan & billing | MOVED | **The old URLs are 404** | none found → N-2 |

## Findings

### N-1 · Escalations has no door that a 1.0 user would try
- **Kind:** Hard to find
- **1.0:** Escalations was a top-level item with a count of open tickets on every branch: Q `app-sidebar.tsx:202` (badge at :117), P's OM rail and U. It was also in the phone's More › Pages (`bottom-nav.tsx:30`), on the key G then E (`keyboard-shortcuts.ts:16,33`), under the Home Studio Pulse "View all" (`home-widgets.tsx:566`) and in the search's "Escalations" group (`search.ts:93`). The page had a **New Ticket** button (`escalations/page.tsx:130`).
- **2.0:** The only door to the studio-wide list is the Projects ⋮ row "Tickets" (`components/projects/projects-workspace.tsx:324`). Elsewhere a user meets tickets only one project at a time: a project's Client › Tickets (`lib/projects/tabs.ts:53`), its Needs you rows (`lib/projects/needs-you.ts:174-178`) and its bell rows.
  - The rail and the phone have no Tickets item.
  - `PAGES` in `lib/global-search/model.ts:228-314` has no Tickets page, so typing "escalations", "tickets" or "issues" says "Nothing matches".
  - `GO` (`lib/keys/registry.ts:137-150`) has no `e`.
  - `/escalations/new` redirects to `/projects/tickets` (`lib/links/old-addresses.ts:81`), which has **no New ticket**: only Filters, at `components/projects/tickets/studio-tickets.tsx:76`.
  - Three records are out of date. REG-1315, REG-1830 and the comment at `studio-tickets.tsx:30` all say "Projects' Tickets button". REG-1425 moved it into ⋮.
- **Why it matters:** A studio that handled defects from a daily "Escalations (3)" item now has no count anywhere and must know to open Projects › ⋮.
- **Recommendation:**
  - Smallest step: add a ⌘K page "Tickets" with the words "escalations escalation issues defects complaints", and accept G then E.
  - Then decide whether the studio-wide count comes back somewhere you can see it: a Tickets button again, a Dashboard tile, or the rail.
  - Also decide whether New ticket belongs on the studio list.
  - All of this is Vicky's lane.
- **Size:** S for the ⌘K page and the key; M for a door you can see plus New ticket.

### N-2 · Old addresses from plg and UHD land on "page not found"
- **Kind:** Missing
- **1.0:**
  - P's `/settings/usage` was the credits page. The CreditPill links to it (P `credit-pill.tsx:181`), three bell `action_url`s point at it, and so do the payment provider's return and cancel URLs (P `api/billing/checkout/route.ts:595`, `api/billing/portal/route.ts:80`).
  - P's Tools › Quotes is `/tools/quotes` (P `app-sidebar.tsx:32`, `lib/om/tools-nav.ts:17`).
  - U's rail item Contractors is `/contractors` (U `app-sidebar.tsx:178`, `bottom-nav.tsx:45`).
  - P/U's OM-port pages: `/company/settings`, `/company/settings/quotes`, `/leads/settings`, `/company/profile/brand-kit`, `/visualizer/materials` (already a redirect in P), `/company/templates/tasks/<id>` and P's `/billing/return`.
- **2.0:** None of these is in `lib/links/old-addresses.ts`, and none has a route. `app/tools/` holds only `copilot-analytics` and `floor-plan`; there is no `app/contractors` and no `app/settings/usage`. `FROM-1.0-TO-2.0.md` §3 says "Every old 1.0 address lands", but the list was built from the Qanvast line.
- **Why it matters:** These users have bookmarks, bell links and billing emails that point at these addresses. Today they reach a dead end.
- **Recommendation:**
  - Add a row to `OLD_ADDRESSES` for each address:
    - `/settings/usage` → `/company/plan`
    - `/tools/quotes` → `/quotes`
    - `/contractors` → `/projects?view=workload&of=contractors`
    - `/company/settings` → `/settings?section=studio`
    - `/company/settings/quotes` → `/settings?section=quotes`
    - `/leads/settings` → `/settings?section=leads`
    - `/company/profile/brand-kit` → `/company/templates/brand`
    - `/visualizer/materials` → `/company/materials`
    - `/company/templates/tasks/:id` → `/templates/tasks/:id`
    - `/billing/return` → `/company/plan/billing`
  - Fix the claim in FROM §3.
  - Developers can add these redirects; tell Vicky the landings.
- **Size:** S

### N-3 · "Settings" in 1.0 meant your own settings; in 2.0 it opens the studio's rules, with no way to Your profile
- **Kind:** Hard to find
- **1.0:** Every role opened avatar › Settings (Q `topbar.tsx:511-517`) and found Your Profile, My Signature, Notifications and Lead Preferences there (`settings/page.tsx:35-46`).
- **2.0:** The rail's Settings opens Roles & access. A Designer sees mostly read-only studio rules there. Your profile sits behind the studio block (`components/shell/app-rail.tsx:227-240`), which is labelled with the studio's name, or behind the phone's avatar. `app/settings/settings-view.tsx` only redirects 1.0's old `#anchors` (:853-860). The only way from Settings to Your profile is the link inside the Notifications module. REG-1835 maps "1.0's profile menu's Settings" to the rail's Settings. Its job was Your profile.
- **Why it matters:** A designer looking for their signature or their notifications goes to Settings, as they did in 1.0, and does not find them.
- **Recommendation:** Put a "Your profile" door at the head of the Settings page, beside "Kept in Company:". Vicky's lane.
- **Size:** S

### N-4 · ⌘K does not know 1.0's own names
- **Kind:** Hard to find
- **1.0:** These are the labels users read every day: Escalations, Accounts Setup, Quote Digitizer, Finance › Operations, 3-D Space Planner, Usage & credits, Lead Preferences, Reviews & Rankings.
- **2.0:** I ran `pageHits()` on each word. These find nothing:
  - "escalations", "tickets", "issues"
  - "accounts setup"
  - "quote digitizer" and "digitizer"
  - "operations" and "finance operations"
  - "3-d space planner"
  - "usage & credits" and "usage and credits"
  - "lead preferences" and "preferences"
  - "reviews & rankings"
  - "new ticket" and "log ticket"

  Two more go to the wrong place. "usage" finds Studio health, not Plan & AI credits. "accounts" finds only Expense categories.
- **Why it matters:** ⌘K is the escape hatch for anything that moved, and it fails on exactly the words a 1.0 user types.
- **Recommendation:** Add 1.0's words to each page's `words`:
  - Settings modules: "accounts setup"
  - Quotes: "quote digitizer"
  - Company › Finance: "operations"
  - Planner: "3-d"
  - Plan & AI credits: "usage credits"
  - Your profile and Members: "lead preferences"
  - The Tickets page from N-1

  The words are never shown, but they change what search returns, so this is Vicky's lane (low risk).
- **Size:** S

### N-5 · 1.0's G then I and G then E do nothing
- **Kind:** Partial
- **1.0:** G then I went to Inbox and G then E to Escalations (`keyboard-shortcuts.ts:13,16,30,33`).
- **2.0:** `GO` has `m` for Messages but no `i` and no `e` (`lib/keys/registry.ts:137-150`). REG-1830 records both choices.
- **Why it matters:** Keyboard users lose two keys they had learned, and nothing tells them why.
- **Recommendation:** Accept `i` as a quiet alias for Messages, and `e` for Tickets once N-1 gives it a page. Leave both out of the ? panel. Vicky's lane.
- **Size:** S

### N-6 · The Leads item lost its count of new leads
- **Kind:** Partial
- **1.0:** The Leads item carried the number of leads in the first stage, on the rail and on the phone dock (Q `app-sidebar.tsx:113,198`, `bottom-nav.tsx:88`).
- **2.0:** `railBadges` (`lib/leads/tasks.ts:177-188`) has no `/leads` key. New leads show as the listing's unseen band and as the `new_lead` bell row (`lib/notifications/model.ts:53`), which reaches Owners and Admins only.
- **Why it matters:** A designer could see at a glance that new work had arrived. Now they must open the listing.
- **Recommendation:** Decide whether Leads should count unseen new leads for the viewer, or leave it as it is and record the call. Vicky's lane.
- **Size:** S

## Fine as they are (inventory only)
- Finance, Reports, Contractors and the Client portal each moved to "one home" by the owner's explicit decision (REG-1360, REG-1361, REG-2467, REG-967). Each keeps a door. Their only gaps are the ⌘K words in N-4 and the old URLs in N-2.
- Unsure: P's every-page trial banner (row 38). It needs the credits audit's eye.
