# S41b-2 · Old addresses and an app-wide not found — outcome (2026-10-13, lane A)

Package of S41b · Nothing left behind (his "please make sure nothing left behind from 1.0 to 2.0", 2026-10-12), found by the S41b pages
sweep (`s41b/sweep-pages.md` M1 · M2 · §10 · §11) and the ledger's "still open" table (`s41b/ledger.md`). **Every address 1.0 printed now
lands in 2.0** — its studio app's (bookmarks, and the links its notifications already sent in bell rows, emails and WhatsApp), on **one list**
beside the website's and the client links' (`lib/links/old-addresses.ts`), each landing carrying its record and asking the visitor's permission
first; **an address no page answers is the house's "page not found"** (404, the shell when signed in, the client's calm notice on a client's
address); and **OpenMaison has its icon and its web manifest** (1.0's), never on a client's page.

1.0 read (`qanvast-id-tool`, 5d177c233): every `page.tsx` under `src/app/(main)/**` and `src/app/studio-setup` (with what each reads from its
query — `inbox` `chat` / `newChat` / `leadId`; `leads` `leadId` / `openLead` / `quoteId` / `openQuote`; `projects/[projectId]` `tab` / `sub` /
`focus` and 1.0's `timeline` · `tasks` aliases; `finance/operations` `tab` (+ its legacy map) / `project` / `invoiceId`; `finance/vendors`
`vendorId`; `tools/floor-plan` `planId` / `projectId`; `tools/copilot-analytics` `view` / `sessionId` / `tab`; `tools/ai-visualizer`
`projectId` / `leadId`), `accounts/page.tsx` (`MENU_GROUPS`, `RETIRED_TAB_ALIASES`, `LEGACY_PORTAL_TAB_TO_SECTION`, a group's label as a tab),
`accounts/roles` · `upgrade` (1.0's own redirects), `settings/page.tsx` (`ALL_SECTIONS` — its scroll-spy anchors), `my/projects/[projectId]`
(`TOP_TABS`, `LEGACY_TAB_MAP`), `escalations/**` (`ticket_id` = the ticket's number), every `actionUrl` / `action_url` in `src/lib/**` and
`src/app/api/**` (the notification deep links), `src/components/inbox/*` (the copied `/inbox/<chat>` link), `src/app/not-found.tsx`,
`src/app/manifest.ts`, `public/openmaison-logo/**`, `public/favicon.ico`, `next.config.ts` (no redirects).

Register rows: `steps/reg-S41b2.md` (REG-S41b2.1…16). Probe: `design-source/verify/pending-modules/verify-pm2-s41b2.cjs` — **206 / 206**, page
error log empty; shots in `design-source/verify/pending-modules/pm2-s41b2/` (the not-found at 1440 · 768 touch · 390 touch · 320 touch, a
Finance tab that isn't one, a client's and a portal's not-found).

## Ledger — every 1.0 address and where it lands

How each is answered: **R** = `next.config.ts` `redirects()` (fixed) · **P** = `proxy.ts` `oldQueryTarget` (placed by its query, pure) ·
**L** = a lookup route under the old address (`lib/links/old-links.ts`; asks the member's permission first). Every landing was requested by
the probe (each hop's status, the final page 200) unless marked. "else" = what a member who may not see the record, or a record 2.0 doesn't
hold, lands on — the same answer either way.

| 1.0 address (who sent it) | 2.0 landing | By |
| --- | --- | --- |
| `/inbox` · `/inbox?chat=<1.0 chat id>` · `/inbox/<chat>` (1.0's "copy chat link") | Messages `/chat` (1.0's chat ids name no 2.0 record) | P |
| `/inbox?newChat=<phone>&name=&leadId=<id>` (the lead drawer's chat) | the lead's conversation `/chat?open=lead:<id>` | P |
| `/escalations` · `/escalations/new` | Projects › Tickets `/projects/tickets` | R |
| `/escalations/<T-2026-…>` (every ticket notification, any case) · `/escalations/<2.0 id>` | `/projects/tickets?open=<id>`, else Projects › Tickets | L |
| `/finance/operations` (+ `?tab=overview · review`) — invoice approved / sent, PO sent, expense, overdue, receipt | Finance › To do `/company/finance/todo` (was a 404: the old redirect fell into a tab 2.0 doesn't have) | L |
| `/finance/operations?tab=invoices · receipts · contracts · vos · pos · bills · expenses` | Money in · › Payments · › Variation orders (×2) · Money out › Purchase orders · › Bills · › Expenses | L |
| `/finance/operations?invoiceId=<id>` (invoice sent, paid, awaiting approval, reminder) | the invoice on its project's Money `/projects/<p>/money?open=<id>`, else Money in | L |
| `/finance/operations?tab=invoices&project=<id>` · `?tab=pos&project=` | that project's Money, else the tab's register | L |
| `/finance/invoices/<id>/preview` | the invoice's paper `/projects/<p>/invoices/<id>`, else Money in | L |
| `/finance/pos/<id>/preview` | the PO's paper `/projects/<p>/purchase-orders/<id>`, else Money out › Purchase orders | L |
| `/finance/vos/<id>/preview` | the VO's Preview `/quotes/<id>/preview`, else Money in › Variation orders | L |
| `/finance/vendors?vendorId=<id>` | `/company/finance/vendors?open=<id>` (the vendor's panel) | `app/finance/[tab]` |
| `/finance/commissions` (payout) · `/finance/vendors` · `/finance/reports` · `/finance/pipeline` | unchanged since REG-1360 / 1361 (re-checked) | `app/finance/[tab]` |
| `/accounts` (member added; price-book answers) | Company › Members (1.0 opened on Team Members) | P |
| `/accounts?tab=<each of 44>` (+ `accounting` from Xero failures, `catalogue&pb=drift` from the price-drift cron) | its card — Members · Profile #entities · Roles & access #studio-roles · Reports › Studio health · Lead management #lead-stages #lead-sources #custom-fields · Integrations #webhooks · Quotes & pricing #trades #quote-approval · Templates (Quotes · Contracts · Schedules · Payment schedules · Brand kit #marks) · Price book (· My Sections) · Projects #owner-approvals #schedule-settings #ticket-categories · Materials · Finance #expense-categories #commission-settings #cost-settings #document-numbers #payment-settings · Xero · Profile #reviews #registrations · Client portal · Meetings #meetings-features #meetings-answers #meetings-checklists #meetings-competitors (`OLD_ACCOUNTS_TABS`; 1.0's aliases and a group's name too); an unknown tab → Settings | P |
| `/accounts/roles` · `/accounts/usage` · `/accounts/milestone-templates` | Who may do what · Reports › Studio health (S39) · Templates › Schedules | P |
| `/accounts/<anything else>` | the not-found (404) | — |
| `/settings/notifications` · `/upgrade` · `/studio-setup` | Settings › Notifications · Plan & billing · Roles & access (opens on Set up your studio) | R |
| `/settings#profile · #my-signature · #notifications · #email · #lead-preferences · #region · #ads · #ai-buddy · #home-layout · #appearance · #skins · #guided-tours` (1.0's personal settings bookmarks) | Your profile #details · #signature · #notifications · Integrations #gmail · Your profile (the rest) — read by the Settings page, an anchor never reaches the server | the page |
| `/leads/new` · `/projects/new` | the listing's form `?new=1` | R |
| `/leads?leadId=<id>` (assignment, signature requests, contracts sent, a hold's follow-up) · `?openLead=` · `&openQuote=true` · `?quoteId=` | the lead `/leads/<id>` · its Quotes · the quote `/quotes/<id>` | P |
| `/leads/<id>/quote-preview-popout?quoteId=<q>` | the quote's Preview, else the lead's Quotes | P |
| `/projects/<id>?tab=details` · `management` (+ `&milestone=`, `sub=tasks · materials · floor-plan`) · `timeline` · `tasks` · `finance` (+ `focus=`, `financeSubTab=contract`) · `design&designSubTab=floor-plan` · `files-docs` · `activity` · `render` (selections, VOs, milestone approvals, floor-plan marks, progress updates) | Overview · Schedule (`?open=<milestone>`) · Tasks · Choices · Floor plan · Schedule · Tasks · Money (`?open=<invoice>`) · Floor plan · Files · Activity · Designs | P |
| `/projects/<id>/quotes/new` (dead in 1.0) | the project | R |
| `/tools/quote-digitizer · quote-xray · ai-visualizer · floorplan-3d-isometric · market-insights · compliance-navigator · homeowner-portal` | Tools › Quotes · Quote X-Ray · AI Visualizer · Make a 3D picture · Market Insights · Compliance · Company › Client portal | R |
| `/tools/market-insights/<id>` | the article `/market-insights/mi-<id>` (S25's id) | R |
| `/tools/floor-plan` (+ `?planId=`) | the 3D Space Planner (the layout, when the member may open it) | L |
| `/tools/copilot-analytics` (+ `?view=insights`, `?sessionId=`) | Meetings · Reports › Meetings · the meeting (when the member may open it) | L |
| `/tools/{auto-furnish,detect,relight,style-transfer,visualizer}-sandbox` · `floorplan-3d-sandbox` · `quote-template-sandbox` | AI Visualizer ×5 · Make a 3D picture · Templates › Quotes (S41's map) | R |
| `/tools/<anything else>` | the not-found (404) | — |
| `/my/<slug>/preview/<view>` (studio staff's mock preview) | Company › Client portal | R |
| `/my/projects/<id>?tab=…` · `/my/<slug>/projects/<id>?tab=…` (the client's floor-plan notices) | that section of the portal (`OLD_PORTAL_TABS`: floor-plan · money · issues · choices · designs · files · messages …), sign-in first | S02's routes |
| S02 · S23 · S27 · S30 · S31 · S35 · S36 · S37's (`/pay/…`, `/my/login`, `/quote-preview/…`, `/floor-plan/view/…`, `/sign/quote-xray/…`, `/copilot/share/…`, `/hangouts/…`, `/login`, `/onboarding`, `/verify`, the website's 27, `/try`, `/try-visualizer/…`) | unchanged — now rows on the same list (the website's moved there from `lib/site/model.ts`) | R · their routes |
| any other address no route answers | the app-wide not-found (below) | — |

Same address in 1.0 and 2.0, nothing to do (sweep §1): `/dashboard` · `/leads` · `/projects` · `/projects/<id>` · `/tasks` · `/marketplace` ·
`/marketplace/<id>` · `/settings` (1.0's personal settings; its anchors land, above). Left out on purpose (as the sweep): `/qanvast-ops/*`
(1.0 has no page there either) and `/admin/*` (Platform admin, his exclusion).

## The package's lines

| Line (the step's words) | Status | Where |
| --- | --- | --- |
| M1 · "every one the sweep lists … each lands on its 2.0 home, carrying its record" | **built** — the ledger above; 1.0's notification query keys honoured | `lib/links/old-addresses.ts`, `proxy.ts`, `next.config.ts`, `app/escalations/[ticket]`, `app/finance/{operations,invoices/[id]/preview,pos/[id]/preview,vos/[id]/preview}`, `app/tools/{floor-plan,copilot-analytics}`, `app/finance/[tab]`, `app/my/{projects,[slug]/projects}/[projectId]` |
| M1 · "`/finance/operations` (today a redirect into `/company/finance/operations`, a tab that doesn't exist → `notFound()` — fix that trap)" | **built** — its own route (a static segment beats `[tab]`), and a Finance / Reports tab that doesn't exist now answers 404 from its layout (no streamed 200) | `app/finance/operations/page.tsx`, `app/company/{finance,reports}/[tab]/layout.tsx` |
| M1 · "a small route that looks the record up, keeping the visitor's permission — never a redirect that reveals a record they may not see" | **built** — Who sees leads (a project = its lead), money's rule left to the page; the same "else" for refused and unknown; probed as Germaine (on the team) and Michelle (not) with Who sees leads on *assigned*, and as Accounting | `lib/links/old-links.ts` (`openProject` · `oldTicketTarget` · `oldOperationsTarget` · `oldInvoicePaperTarget` · `oldPoPaperTarget` · `oldVoPaperTarget` · `oldPlannerTarget` · `oldCopilotTarget` · `oldPortalSectionTarget`) |
| M1 · "on ONE old-address list beside the website's … one list, not a third" | **built** — `OLD_ADDRESSES` holds the website's, the studio app's and the client links' rows; next.config serves its fixed part (`OLD_REDIRECTS`), proxy its query rules, the routes its lookups; `OLD_SITE_ADDRESSES` remains as the list's website part | `lib/links/old-addresses.ts`, `lib/site/model.ts` (pointer) |
| M1 · "links 1.0's notifications already sent (email, WhatsApp, bell rows) — prove a sample of each kind lands" | **built + proved** — seven bell rows with 1.0's `actionUrl`s pressed (the app's own navigation, through next.config, proxy and the routes); four email / WhatsApp links opened in a fresh tab; a client's portal link with its tab; signed out, sign-in carries the address and lands on the record | probe §3 · §4 |
| M2 · "one `app/not-found.tsx` on the house pieces (the shell when signed in, the plain frame when not …), plain words and one way on, its ghost if it has one, never a 200 status" | **built** — the shell + `PageNotFound` (the record-not-found look, REG-1166's width; one filled button: the page that linked here / `?from=`, else Go to the Dashboard; every role alike); a client's address → the client's calm notice (`PortalNotice` kind `not-found`), a portal address → its own notice in its studio's look; signed out, sign-in (the shell's own rule). **No ghost**: the root has no loader and the page reads nothing to wait for. 404 on every address no route matches; the tab layouts' 404 too | `app/not-found.tsx`, `components/shell/page-not-found.{tsx,module.css}`, `components/portal/portal-notice.tsx`, `components/shell/{app-shell,access-gate}.tsx` |
| M2 · "Invented copy, flagged for Vicky" | **flagged** — REG-S41b2.11 · .12 · .14 | — |
| Ledger · "the web manifest + favicon (S35 recorded them — 1.0's manifest, the house icon)" | **built** — 1.0's marks in `public/brand/` (favicon SVG + 32 px, home-screen 180 px, 192 · 512 · maskable 512, the app-icon SVG), `public/manifest.json` (1.0's, without its claim), linked from the root layout; a client's page carries neither | `public/brand/*`, `public/manifest.json`, `app/layout.tsx`, `lib/links/client-page.ts`, the eleven client layouts (+ `app/space/layout.tsx`, new) |
| Ledger · "any other item in the 'still open' table that is a missing address or a missing page-frame piece" | **built**: 1.0's studio bookmarks (S25's row — every one, above) and 1.0's `/settings#…` anchors (sweep §10's last note — the landing, no words added). **Not this package's (features, other packages or his calls)**: the quote document editor's parts (S29 → S11), the Project Types editor, auto / round-robin assignment (never in 1.0's code), the site's module FAQs, the accreditation catalogue (Platform admin), the platform crons, a studio-wide digest switch, flat issuance / seat refusal / a count on Leads, the planner's AI plan reading (the developers') — each stays where the ledger put it | — |

## Found in 1.0, not on a card
- **`/inbox/<chatId>`** — 1.0's "copy chat link" (`components/inbox/{context-panel,conversation-header}.tsx`) built this address though no 1.0
  page served it (its robots file even hid `/inbox/`): **built** — it lands on Messages.
- **1.0's portal `?tab=` and `?issue=`** on `/my/projects/<id>` — **built**: the tab lands on its section (above), `?issue=<id>` on Issues (no
  2.0 address opens one issue — a client sees their few on the page).
- **`/tools/ai-visualizer?projectId=` · `?leadId=`** and **`/tools/floor-plan?projectId=`** — 1.0 opened the tool for that project or lead; 2.0's
  galleries list every design and layout with its lead, and a project's own doors open them — **landed on the tool's home** (the id names no
  2.0 filter; nothing hidden).
- **`/tools/copilot-analytics?tab=`** (history · objections …) — Meetings lands on its list; the objections report is Reports › Meetings
  (`?view=insights` goes there).
Nothing else in `src/app/(main)/**`, its menus or its notification links goes without a landing.

## Decisions taken (as recommended — his "build all of them" 2026-10-11 and "nothing left behind" 2026-10-12)
- **The sweep's proposed home**, one list beside the website's — but served three ways, because next.config can't read a query cleanly (it
  passes the query through) nor a record: fixed → next.config; query-placed → proxy (pure, before the sign-in check, so a signed-out visit
  is sent to sign-in carrying the 2.0 address); record-placed → small routes (no loader above them, so each answers a plain 307).
- **A record the member may not see lands where that kind lives, exactly as one 2.0 doesn't hold** (S02's rule for client tokens), never
  the not-found and never a redirect naming its project. The landing pages keep their own rules (money withheld, Accounting's gate).
- **307, not 308** — as S35's: the developers make them permanent once the addresses settle.
- **1.0's chat ids land on Messages**, not on a "this conversation isn't there any more" snackbar: no 2.0 record will ever hold them.
- **`/accounts` with no tab → Company › Members** (1.0's default tab); an unknown tab → Settings.
- **The not-found's way on**: one filled button; `?from=` first (REG-465), then the referring page of this app (named by `backLabel`), else
  the Dashboard (every role opens it). Its line adds "— or it may be one you can’t open": the page is also what a record a member may not open
  answers (a contract, a quote, a reading) — said for every address, so it tells nothing.
- **The website keeps its own 404** (S35's, in its frame) — the app-wide page never draws under `/site`.
- **A client's page wears no OpenMaison mark and no manifest** (S02's "never OpenMaison's name" on client links); the root not-found is
  neutral for everyone for the same reason (it may be a client's).
- **Unknown Finance / Reports tabs answer 404 from their layout** — Next then draws the page in the browser over its error shell (as S41's
  `/dev/ai-bench`), rather than a streamed 200 under the tab's ghost.

## What to check in the browser (production build; View as switches roles; 1440 and 390)
- **Dane:** paste `/finance/operations?invoiceId=<an invoice id>` → Benjamin Han's Money with that invoice's panel open; `/escalations/T-2026-001`
  → Tickets with the ticket open; `/projects/<Benjamin's id>?tab=management&milestone=<id>` → Schedule on the milestone; `/accounts?tab=funnel`
  → Lead management, Lead stages in view; `/settings#my-signature` → Your profile › Your signature; `/tools/market-insights` → Market Insights.
- **Michelle, with Who sees leads on "Only the leads assigned to them":** the same invoice and ticket links → Money in / Tickets, nothing of
  Benjamin's named. **Germaine:** they open. **Priya (Accounting):** an invoice's paper opens; a ticket link → Tickets' gate.
- **A bad address** (`/not-a-page`): the shell, "Page not found", "This page isn’t here", Go to the Dashboard; from Tasks (a link) → "Back to
  Tasks". `/company/finance/operations` → the same page under Finance. `/quote/x/y` → the calm notice, no rail, no OpenMaison. `/my/demo-studio/x`
  → "This isn’t on your page any more · Back to your page". 390 · 320: one column, the button full width, no sideways scroll.
- **The browser tab** on the Dashboard shows OpenMaison's mark; on `/my/demo-studio` none. A phone's Add to Home Screen uses the house icon and
  the name OpenMaison (a manifest with its icons; no offline mode — 1.0 had none either).

## Probes run
On fresh copies of the repaired base (`pbuild/base.db` + migrate + repair) with `next start -p 3160`; :3160 stopped after.
`npx tsc --noEmit -p .` clean · `npx eslint app components lib proxy.ts` 0 errors (16 warnings, all older files') · `npm run design:lint`
nothing new breaks a house rule · `npx next build` (`DATABASE_URL=file:<scratch>`, under the lock) green.

| Probe | Tally |
| --- | --- |
| `pending-modules/verify-pm2-s41b2.cjs` (new — §1 every listed 1.0 address, each hop's status and the final page, signed in: 104 addresses + all 44 Accounts tabs + six that are no page (404) + five 2.0 addresses left alone · §2 the permission pair with Who sees leads on *assigned* — Germaine (on the team) lands on the record, Michelle (not) where its kind lives, no hop naming the project; a VO and a co-pilot session the other way round; Accounting · §3 signed out → sign-in carrying the address, then signing in lands on the ticket; the manifest and icon read signed out · §4 seven bell rows with 1.0's `actionUrl`s pressed, four email / WhatsApp links opened fresh · §5 1.0's `/settings#…` anchors on Your profile's cards, 2.0's anchors untouched, ten Accounts tabs with their card on screen · §6 the not-found: 404, the shell, the words, one way on (Dashboard · Back to Tasks · `?from=`), every role, not the page's C, an ended session → sign-in, a client's and a portal's notices, the website's own 404 kept (five addresses), 1440 · 768 · 390 · 320 with no sideways scroll · §7 the manifest, the icons on the studio app, the site and sign-in, none on four client pages) | **206 / 206**, page error log empty |
| `pending-modules/verify-pm2-s02` (client old links — its routes changed) · `s30` (proxy) · `s35` (the website's list moved; its 404) · `s36` (the trial's 404 and old addresses) · `s22` (the front door) · `s13` (the portal's notices) · `s41` BENCH=off (`/dev/ai-bench` a real 404) · BENCH=on | 105 / 105 · 109 / 109 · 138 / 138 · 110 / 110 · 116 / 116 · 65 / 65 · 11 / 11 · 120 / 120 |
| through `regression/run.cjs` on :3160 (RUN_DIR from the same base): `qe-r3` · `ct-r4` · `xr-r4` (each reads the house's not-found words — a deliberate change) · `ghosts-same` · `ghosts-same-390` | 21 / 21 · 29 / 29 · 16 / 16 · 67 / 67 · 67 / 67 |
| `npm run design:anatomy` (scratch `next start`, :3160) | 88 pages, 277 table heads, 26 dialogs, 41 page menus — **all 1752 measures hold** |

Found and fixed on the way: the website's `/site/platform/<x>` and `/site/blog/<x>` answered their 404 with a 200 once the app-wide not-found
existed (REG-S41b2.16); the S35 probe caught it.

## Migration and repair
- **No migration, no repair** (R124 still free in lane A) — nothing here is a record; every landing reads its home's.

## Shared pieces changed
- `components/shell/app-shell.tsx` (`ungated`) and `components/shell/access-gate.tsx` (`AccessGuard open`) — one optional prop each, off by
  default: only the not-found passes it.
- `components/portal/portal-notice.tsx` — a fourth kind, `not-found` (its words only).
- `proxy.ts` — the old-address check before the sign-in check (GET / HEAD only; null for every 2.0 address — probed on five).
- `next.config.ts` — reads the one list; `lib/site/model.ts` — `OLD_SITE_ADDRESSES` moved out (a pointer left).
- `app/layout.tsx` — `icons` + `manifest`; the eleven client layouts — `metadata` (`CLIENT_PAGE_METADATA`); `app/space/layout.tsx` new (a
  pass-through).
- `app/settings/{settings-view,custom-fields-card,studio-settings}.tsx` — four `id`s on existing cards; `useMovedCards` reads 1.0's personal
  anchors.
- `app/company/{finance,reports}/[tab]/` — a layout each; the pages' titles for an unknown tab.
- `app/site/{platform/[module],blog/[slug]}/layout.tsx` — new, each checking its address above its loader (REG-S41b2.16).
- Probes `quote-editor-parity/verify-qe-r3.cjs` · `contracts-parity/verify-ct-r4.cjs` · `x-ray-parity/verify-xr-r4.cjs` read the house's
  not-found words (each commented "(pending modules, a deliberate change of this rule — S41b-2)").
- No `components/om/*` or `app/globals.css` change.

## For the next steps
- **S42:** a `notFound()` thrown by a record page under its loader (a lead, a quote, a contract, a reading, a template) still answers 200 —
  Next streams it and the browser draws the house's not-found (the page's own words now). Making those 404 means checking each record in a
  layout above its loader, as the tab layouts here do — a per-page change, worth it only where an address is likely to be shared or indexed.
- **S42 (UX):** the not-found header names the address's part of OpenMaison by `fromLabel` (e.g. "Quote X-Ray", "Finance"); an address
  `fromLabel` doesn't know reads "Page not found".
- **The developers:** make the 307s permanent (308) once the addresses settle; a real deployment that publishes the site at the domain root
  keeps the list as is (it never takes an app route). The manifest's `start_url` is `/` (the front door).
- **For CLAUDE.md's Map (the orchestrator's):** *Old addresses and the not-found (pending modules S41b-2)* — `lib/links/old-addresses.ts`
  (the one list: `OLD_ADDRESSES` · `OLD_REDIRECTS` · `oldQueryTarget` · `OLD_ACCOUNTS_TABS` · `OLD_OPERATIONS_TABS` · `OLD_PORTAL_TABS`),
  `lib/links/old-links.ts` (the lookups), `proxy.ts`, `next.config.ts`; `app/not-found.tsx` + `components/shell/page-not-found.tsx`;
  `public/brand/` + `public/manifest.json` + `lib/links/client-page.ts`. **A new 1.0 address = one row on the list** (a lookup = one function in
  old-links.ts + one route); **a new client page's layout spreads `CLIENT_PAGE_METADATA`**.

## Flags for Vicky
- **Where each old link lands is yours to confirm** — the ledger above (no mock; the sweep's table, 1.0's own code for each query).
- **The not-found page is new** — no mock; the house's record-not-found look and words in the register (REG-S41b2.11 · .12), 1.0's line kept.
- **OpenMaison's mark is the app's icon now** (1.0's own files) — and deliberately absent from every client page and from the not-found.
- **The manifest's words** — "OpenMaison"; "Run your interior design studio from one place — leads, quotes, projects, invoices and client
  messages." (1.0's without "with AI built in").

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for the not-found or the icon; built on house pieces (EmptyState plain, PageHeader,
   the shell, PortalNotice) and 1.0's own marks and line; every invented word in REG-S41b2.11 · .12 · .14; the landings are logged row by row.
2. **One system, no one-offs** — the not-found composes `record-not-found.module.css` (as RouteError does); the client's is PortalNotice's
   fourth kind; one list for every old address; `design:lint` holds; no copied stylesheet.
3. **Plain words** — "This page isn’t here", "The link may be old, or the page may have moved", "Go to the Dashboard", "Back to Tasks",
   "Ask whoever sent it to you for a new one".
4. **Nothing is lost** — no page writes; a landing that can't name its record still lands on the record's home; the old addresses' queries
   (`?from=`, an invoice, a milestone) ride on.
5. **Say why** — the not-found says the link may be old, the page moved, or not one you can open; a client is told whom to ask; a
   portal address says it isn't on their page.
6. **Back returns where you came from** — the not-found's one button is `?from=`, else the page that linked here (named), else the Dashboard;
   the landings keep `?from=`.
7. **Every screen is whole** — the shell, the header, the notice, its way on; no ghost needed (nothing to wait for — the root has no loader);
   the error page is unchanged; a client's frame is whole on its own.
8. **Every width is designed** — 1440 · 768 touch · 390 touch · 320 probed, no sideways scroll against `screen.width`; the phone's bar and dock
   stay.
9. **Tables follow the leads listing** — not applicable (no table).
10. **Motion with purpose** — not applicable (no new motion; the shell's own).
11. **Honest data** — every landing reads the record it names; a record the member may not see is never named; 1.0's chat ids land on Messages
    rather than claiming a conversation is gone; the manifest makes no claim 2.0 doesn't keep.
12. **Reach for everyone** — the not-found's one button is a real button (keyboard, focus ring), the notice a labelled section, the title
    "Page not found"; it is not the page's C (it creates nothing); the shell's skip link and landmarks stay.
- **How to add a missing thing:** one home (the list; the not-found is the app's one page) · shown only when it applies (proxy's rules fire
  only on 1.0's keys; the client frame only on a client's address) · one filled button · defaults that need no set-up (nothing to configure).
