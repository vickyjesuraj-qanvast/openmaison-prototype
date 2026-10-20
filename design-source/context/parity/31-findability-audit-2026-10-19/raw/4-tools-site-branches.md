# Navigation audit 4: Tools, quote and contract entry points, AI, Marketplace, the public site and 1.0's other branches

Read on 19 Oct 2026. 2.0 was read at `main` (a49dc18f). 1.0 was read through git only, on the local remote refs: `deployment/qanvast` @ 40f8635e2,
`deployment/plg` @ 64791f115 and `urbanhomedemo` @ fab7cc868. I couldn't fetch, so anything pushed after the last fetch isn't covered.
I checked every 2.0 claim in code. The ⌘K results come from running `pageHits` / `createHits` (`lib/global-search/model.ts`) offline
through tsx, as an Owner. "Old URL" means `lib/links/old-addresses.ts`. "Signed-out" means production, where `DEMO_STANDING_SESSION` is false.

## Inventory

| # | 1.0 entry (as a user sees it) | 1.0 route · file · branch | 2.0 home (as a user sees it) · URL | Status | Can a 1.0 user find it? (door · ⌘K by the 1.0 word · old URL redirect) | Record |
|---|---|---|---|---|---|---|
| 1 | **Tools › Quote Digitizer**. The page's header says "Quote Editor: Upload contractor quotes and digitize them with AI". You pick a lead, open the editor, and use Upload / digitize and Quote Templates | `/tools/quote-digitizer` · `src/app/(main)/tools/quote-digitizer/page.tsx:368-369` · qanvast + plg (sidebar `app-sidebar.tsx:20`) | Tools › **Quotes** `/quotes` › Create Quote › *More ways to start* › **Upload a quote** (`create-quote-modal.tsx:311-318`). Also reached from a lead's Quotes › Create Quote. Quote Templates are under ⋮ › Manage Templates | RENAMED + MOVED | Door: the tile says "Quotes" (`tools-popover.tsx:22`), and Upload is 3 presses in. ⌘K: "quote digitizer", "digitizer" and "digitize" find nothing; "upload a quote" finds **"Your signature"**. Old URL → `/quotes` ✓ | REG-422, REG-627, REG-2115 |
| 2 | **Tools › Quotes** (plg only), the studio-wide list | `/tools/quotes` · `src/app/(main)/tools/quotes/page.tsx` · plg | Tools › Quotes `/quotes` | SAME (new address) | Tile ✓ · ⌘K "quotes" ✓ · **old URL ✗ (not found)** | none found (REG-2115 lists qanvast's ten) |
| 3 | **Tools › Quote X-Ray** | `/tools/quote-xray` · qanvast + plg | Tools › Quote X-Ray `/quote-x-ray` | SAME. The four retired objectives were left out | Tile ✓ · ⌘K "x-ray" ✓, "xray" ✗ · old URL ✓ (`?xrayId=` lands on the home page) | REG-529, REG-2115; audit 09 DEF-01 · Q-01 |
| 4 | **Tools › AI Visualizer**. Its start strip offered Blank · From a lead · **From a project**, with Projects / Leads sections | `/tools/ai-visualizer` · `start-strip.tsx:110-125`, page `:362-382` · qanvast + plg | Tools › AI Visualizer `/visualizer`. New ▾ offers Blank · For a lead… · From a sample room…; the Kind filter offers Leads · Personal | PARTIAL: no project start and no Projects kind (T-6) | Tile ✓ · ⌘K "ai visualizer" ✓, "visualiser" ✗ · old URL ✓ for members (T-3 for visitors) | REG-673; audit 16 VL-03 ("projects Later") |
| 5 | **Tools › Floorplan to 3D Isometric (Beta)**: photo → dollhouse / top-down | `/tools/floorplan-3d-isometric` · qanvast + plg | Tools › Floorplan to 3D Isometric → `/planner?view=iso&photo=1` (Make a 3D picture) | SAME | Tile ✓ · ⌘K "isometric" → Make a 3D picture ✓ · old URL ✓ | REG-1928, REG-2115 |
| 6 | **Tools › Market Insights**: All · Trends · Reports · Case Studies · Industry News, plus the article page | `/tools/market-insights[/<id>]` | Tools › Market Insights `/market-insights` | SAME | ✓ · ✓ · ✓ (an article → `mi-<id>`) | REG-1918, REG-2115 |
| 7 | **Tools › Compliance Navigator** (Owner): Studio Compliance · Renovation Checklists | `/tools/compliance-navigator` · page `:1383-1385` | Tools › Compliance Navigator `/compliance`, with the studio view and `?tab=rules` | SAME | ✓ · ✓ · ✓ | gaps build I (I-Q12), REG-2115 |
| 8 | **Tools › 3-D Space Planner**: My Floor Plans, Create New Floor Plan, Upload image, *"Have a room photo? Generate with AI"*, templates | `/tools/floor-plan` · page `:953-1117` | Tools › 3D Space Planner `/planner`. New ▾ offers template / example / floor-plan photo / For a project / Blank | RENAMED. Room photo → layout is LEFT OUT (recorded) | Tile ✓ · ⌘K "3-d space planner" (1.0's own label) ✗, "space planner" ✓ · old URL ✓ (`?planId=`) | `projects-gaps-build/j-outcomes.md` "Not built" (J-Q20); REG-2115 |
| 9 | **Tools › Meeting Copilot**: *Start Meeting Copilot* · *Analyze a Recording* · *Meeting Insights* (History · Gallery · Analytics · Objections) | `/tools/copilot-analytics` · `meeting-copilot-landing.tsx:66-84`, page `:88-108` | Tools › Meeting Copilot `/meetings` (New Meeting ▾ holds Plan · Start now · Write up · Upload a recording). **Analytics and Objections → Company › Reports › Meetings.** Gallery → each brief plus the Visualizer | MOVED (the insights) | **No door from Meetings to its reports** (T-4) · ⌘K "meeting insights", "copilot analytics", "start meeting" and "new meeting" ✗; "objections" ✓ · old URL ✓ (`?view=insights` → Reports) | REG-1855, REG-1871; outcome-S23 |
| 10 | **Tools › Homeowner Portal** (Owner; Admins since UHD fab7cc868): the portal link, homeowners, family members, open as the homeowner | `/tools/homeowner-portal` · page `:100-722` | **Company › Client portal** `/company/portal` (Set-up · Clients; See it as; household) | MOVED + RENAMED | Tools has no signpost · Company panel "Client portal" · ⌘K "homeowner portal" → "Client portal address" ✓ · old URL ✓ | REG-967, REG-2115 |
| 11 | The seven AI sandboxes (they had no menu in 1.0) | `/tools/*-sandbox` | The developers' bench `/dev/ai-bench` (off in production) | LEFT OUT (recorded) | No 1.0 door to lose · old URL → the page doing the job | REG-2078, REG-2115 |
| 12 | **Maison bot** (FAB + ID Buddy panel) | `src/app/(main)/layout.tsx:214-217` | The Maison AI FAB + sheet on every page | SAME (answers by rule) | ✓ | REG-507, REG-1785…1793 |
| 13 | **Marketplace** + brand page | `/marketplace`, `/marketplace/[id]` | Rail › Marketplace, at the same addresses | SAME | ✓ · ⌘K ✓ · same URL | REG-1898 |
| 14 | **/upgrade**. On qanvast it redirects to Settings. On plg it's the pricing → checkout hand-off (`?plan=&period=&seats=`) and the target of the nudges' "Switch to Pro" | `src/app/(main)/upgrade/page.tsx` · `checkout-error-messages.ts:108` · plg | The Plans dialog; Company › Plan & AI credits › Plan & billing | MOVED. plg's `?plan=` choice is dropped | Rail › Upgrade ✓ · ⌘K "upgrade" → Plan & billing ✓ · old URL → `/company/plan/billing` ✓ (it doesn't read the query) | S41b `sweep-pages.md` §1; REG-704 |
| 15 | Website: Home, Platform + 8 modules, Story / about, Products · AI agents, Trust, Blog + articles, Changelog, Careers, Contact, Privacy, Terms, Cookies | `src/app/(marketing)/**` · both | `/site/**` | SAME (under /site) | Old URLs ✓ | REG-2043…2056 |
| 16 | Website forms: Book a demo, Contact, Newsletter | `beta-signup-modal.tsx`, contact, footer | The same forms on /site | SAME | ✓ | REG-2043…2056 (outcome-S35) |
| 17 | **Website › Pricing**. On plg it has been public since 22 Sep: nav "Pricing", "Try Now", and "See pricing" on every module page | `/pricing` · `(marketing)/pricing/page.tsx` · plg (qanvast: a redirect home) | None: `/pricing` → `/site` | **MISSING** (T-2) | ✗ | Only `outcome-S35.md:36` "kept hidden", which was read from qanvast's copy |
| 18 | `/try` and `/try-visualizer` (+ 6 tools) | `(marketing)/try`, `src/app/try-visualizer` | `/site/try`, `/site/try/<tool>` (+ leads · upload-a-quote · quote-x-ray) | SAME | Old URLs ✓ | REG-2066, REG-2125 |
| 19 | **plg's open tools for visitors with no account**: `/tools/ai-visualizer` (the paid-campaign landing), `/tools/quote-xray`, `/tools/quote-digitizer`, `/leads`, `/dashboard` | `src/lib/anon/surfaces.ts:27-44` · plg | The trial `/site/try/*` | MOVED. **The old addresses send a visitor to sign-in** (T-3) | ✗ for a signed-out visitor | REG-2125 (the trial); outcome-S41b2 decisions (signed-out → sign-in) |
| 20 | `/onboarding` (sign-up) · `/login` | `src/app/onboarding`, `src/app/login` · both | `/sign-up` · `/sign-in` | RENAMED | Old URLs ✓ | REG-2014, REG-1989 |
| 21 | `/studio-setup` (the forced wizard) | `src/app/studio-setup` · both | Settings › Roles & access › *Set up your studio* | MOVED (now a checklist) | Old URL ✓ · ⌘K "studio setup" ✓ | REG-1764 |
| 22 | `/uae-get-started` | `src/app/uae-get-started` · both | None (held) | LEFT OUT (his hold) | Old URL → not found, on purpose | REG-1854 |
| 23 | **plg's own studio addresses**: `/settings/usage` (in plg's credit-alert notifications), `/company/settings[/quotes]`, `/company/profile/brand-kit`, `/company/templates/tasks/<id>`, `/leads/settings`, `/visualizer/materials`, `/billing/return` | plg (see T-5) | Each job has a 2.0 home | Homes SAME, **old URLs ✗** (T-5) | ✗ not found | none found |
| 24 | Accounts › *Document Templates* · *Signing Documents* · *Packages* · *Quote Rules* (the quote and contract entry points) | `/accounts?tab=…` · `accounts/page.tsx:100-109` · qanvast | Company › Templates › Quotes / Contracts; Price book › My Sections | RENAMED + MOVED | Old URLs ✓ · ⌘K by the 1.0 word ✗ (T-7) | `OLD_ACCOUNTS_TABS` |
| 25 | `/sign/document/<token>` (sign any lead file) | qanvast | Contracts › Import from file | Old link ✗ | Not found | `FROM-1.0-TO-2.0.md` §9 #3 (open, Vicky) |
| 26 | `/admin`, excluded by the owner. Sections: accreditations · activity · agreements · analytics (features, funnels, studios) · beta-signups · billing · brand-dossiers · complaints · hangouts · leads (plg) · market-insights · notifications · plans · portfolio · promotions · refunds · settings · studios · templates · users · verification | `src/app/admin/**` | — | Excluded | — | the owner's word |

## Newer branches

Every remote branch except one last moved on or before 13 Oct, which the 10-15 sweep covered. Only `urbanhomedemo` moved after it: the sweep read
its tip at f9571cf60 (14 Oct 18:41), and 20 commits followed on 15–16 Oct. `FROM-1.0-TO-2.0.md` §1 names fab7cc868 as read, but no
record maps these 20. S45 is confirmed built for every studio: the Sales report (REG-2438…), Contractors (`components/projects/contractors/*`,
the ⌘K "Contractors" row) and the Projects columns (`project-columns.tsx:99-114`).

| Branch · last commit | User-visible since the 10-15 sweep | In 2.0? |
|---|---|---|
| `urbanhomedemo` · fab7cc868, 16 Oct | Send for signature from the lead's Quotes tab and the editor (43c120f0d) | Built: Send ▾ › Send for signature (`components/quotes/send/send-button.tsx:39`) |
| 〃 | A Meetings tab on the lead (43c120f0d) | Built (S23, REG-1855) |
| 〃 | Styled Excel exports of leads, tasks and a quote (36e513dbc) | Partial: XLSX export exists but is plain, with no styles (`lib/leads/export.ts:109,142`). Not a navigation gap |
| 〃 | Xero setup panel with numbered steps (36ea02b22 · a525c9bd4) | Built in another form: Company › Integrations › Xero (simulated) |
| 〃 | UHD's quotation house style + T&Cs, an opt-in Xero-look "Tax Invoice" layout, payment stages print their name (4dac80b9c) | These are UHD's own formats (Annex A, sweep §2.1). 2.0 prints "Tax invoice" when the studio is registered (`invoice-paper.tsx:71`). Nothing to find |
| 〃 | Qanvast Business login, Qanvast lead sync, marketplace proxy, new login look (d69b00afc · 4b431b901) | Developers' seams: registry `sign-in` · `qanvast` · `feeds` (`lib/services/registry.ts:72,136,182`). Invisible |
| 〃 | Admins can open the Homeowner Portal (fab7cc868) | Built: Company › Client portal refuses only Marketing and Accounting |
| 〃 | A converted signed lead carries its quote, split and status (518365226) | Built (Won creates the project) |
| 〃 | Logo card on public share pages, branded hangouts page, UHD logos | White-label: excluded (S02 cards cover link previews) |
| 〃 | Removed dead controls (Move-stage, the "New Interface" switch, the Floorplan-to-3D link), leads-table windowing | 1.0-only fixes or performance |
| All other 147 remote branches | Nothing after 13 Oct | — |

## Findings

### T-1 · The Quote Digitizer can't be found by its name, and its upload is three presses deep
- **Kind:** Hard to find
- **1.0:** The sidebar's first tool was "Quote Digitizer" (`app-sidebar.tsx:20` qanvast, `:31` plg). Its page said "Upload contractor quotes
  and digitize them with AI" (`tools/quote-digitizer/page.tsx:368-369`).
- **2.0:** The tile reads "Quotes" (`components/shell/tools-popover.tsx:22`). Upload sits under Create Quote › *More ways to start* ›
  *Upload a quote* (`components/quotes/create-quote-modal.tsx:311-318`). The empty list offers only From Scratch and From Template
  (`components/leads/quotes/quotes-empty.tsx:23-24`). ⌘K finds nothing for "quote digitizer", "digitizer" or "digitize". For "upload a quote"
  its only hit is **"Your signature"**: the Quotes and Create quote rows carry no upload words (`model.ts:250,344`), and `rankOf` keeps "a"
  as a term, so "Your signature" matches on "upload … a … quotes" (`model.ts:107,116-131,212`). The old URL works (`old-addresses.ts:105`).
- **Why it matters:** The digitizer was the tool studios reached for every day, and a 1.0 user searching for it by name gets nothing or the wrong page.
- **Recommendation:** Add "digitizer digitize upload import existing quote pdf excel" to the Quotes and Create quote rows. Add a ⌘K Create row
  "Upload a quote" that opens Create Quote on Upload. Consider naming upload on the empty list. Vicky's lane.
- **Size:** S

### T-2 · The public Pricing page plg ships has no 2.0 home
- **Kind:** Missing
- **1.0:** On `deployment/plg`, `/pricing` has been public since 22 Sep (a6a46941c; `(marketing)/pricing/page.tsx` "what is on screen is what
  checkout charges"; `pricing-data.ts`). Several things point to it: the nav's "Pricing" and its "Try Now" button (`marketing-nav.tsx:31,180,355`),
  "See pricing" on the home page, the hub and every module page (`page-client.tsx:1008`, `platform-hub.tsx:259`, `module-template.tsx:113`), and
  in-app Upgrade fallbacks (`open-plans-or-navigate.ts:9`). The chosen plan then rides through sign-up to `/upgrade?plan=` and on to checkout.
- **2.0:** `/pricing` and `/site/pricing` redirect to the home page (`lib/links/old-addresses.ts:54-55`). The site's header has only Sign in ·
  Book a demo (`components/site/site-shell.tsx`). `grep -rli pricing components/site` finds only Story's "lifetime fixed pricing" line.
  `/upgrade` lands on Plan & billing but ignores `?plan=`. S35 recorded "kept hidden" (`outcome-S35.md:36`), but that was read from
  `deployment/qanvast`, where the page still redirects home.
- **Why it matters:** A self-serve studio that reached OpenMaison through plg's site can't see what the plans cost before it signs up.
- **Recommendation:** Vicky decides whether the 2.0 site shows pricing. If yes, port plg's page on the site's pieces and carry the plan into
  `/sign-up`. If no, record it as decided against the plg branch. Vicky's lane.
- **Size:** M

### T-3 · plg's open tool addresses send visitors with no account to sign-in, not to the trial
- **Kind:** Hard to find
- **1.0:** On plg these addresses are OPEN to visitors with no account: `/tools/ai-visualizer` ("the paid-campaign landing page"),
  `/tools/quote-xray`, `/tools/quote-digitizer`, `/leads` and `/dashboard` (`src/lib/anon/surfaces.ts:27-44`). `/try-visualizer/*`
  redirects there as well (`next.config.ts:90`). The Visualizer page draws the trial for a signed-out visitor
  (`tools/ai-visualizer/page.tsx:69-77`).
- **2.0:** These addresses redirect to the members' pages (`old-addresses.ts:105-107`). Those pages aren't in `PUBLIC_PATHS`
  (`lib/auth/paths.ts:73-89`), so the proxy sends a signed-out visitor to sign-in (`proxy.ts:33`). The trial lives at `/site/try/*` (REG-2125).
  S41b2's decision ("a signed-out visit is sent to sign-in") treated these addresses as studio bookmarks only.
- **Why it matters:** Paid ads and posts already point at these addresses, and a prospect who clicks one meets a sign-in wall where 1.0 gave them the tool.
- **Recommendation:** For a signed-out visitor only, land `/tools/ai-visualizer` → `/site/try`, `/tools/quote-xray` → `/site/try/quote-x-ray`
  and `/tools/quote-digitizer` → `/site/try/upload-a-quote`, and keep members' landings as they are. Vicky approves where it goes; the developers
  build it in `proxy.ts`.
- **Size:** S

### T-4 · Meeting Copilot's insights moved to Company › Reports with no door from the tool
- **Kind:** Hard to find
- **1.0:** The Copilot's landing had three cards: Start · Analyze a Recording · **Meeting Insights** (`meeting-copilot-landing.tsx:66-84`).
  Insights held History · Gallery · Analytics · Objections (`copilot-analytics/page.tsx:88-108`).
- **2.0:** Analytics and Objections are Company › Reports › Meetings (`lib/company/sections.ts` `REPORTS_TABS`). The Meetings toolbar's ⋮ has
  only Meeting settings · Deleted Meetings (`components/meetings/meetings-toolbar.tsx:53-54`). `grep -rn reports/meetings components app lib`
  finds no door; only the report itself and the old-link rule. The Leads and Projects listings do have such a door (`app/leads/workspace.tsx:102`,
  `components/projects/projects-workspace.tsx:220`). In ⌘K, "meeting insights" and "copilot analytics" find nothing (`model.ts:254-255`), and
  "start meeting" / "new meeting" find nothing either: there's no Create row for a meeting.
- **Why it matters:** An Owner who reviewed coaching and objections from the Copilot won't think to open Company › Reports.
- **Recommendation:** Give Tools › Meeting Copilot the same Insights door the two listings have (→ Reports › Meetings with `?from=`). Add
  "insights analytics" to the Meetings row and a ⌘K Create row "Start a meeting". Vicky's lane.
- **Size:** S

### T-5 · plg's own studio addresses don't land anywhere in 2.0
- **Kind:** Missing (old URL redirects)
- **1.0 (plg):** `/tools/quotes` (sidebar `app-sidebar.tsx:32`; the editor's "Back to Quotes"). `/settings/usage` (the credits card's "See usage",
  `credits-card.tsx:168,208`, and **every credit-alert notification already sent**: `lib/om/credits/alerts.ts:70`). `/company/settings` and
  `/company/settings/quotes` (`lib/om/company/sections.ts:27,75`). `/company/profile/brand-kit` (`profile-view.tsx:538`). `/company/templates/tasks/<id>`.
  `/leads/settings` (`om-leads/workspace.tsx:501`). `/visualizer/materials`. `/billing/return` (Dodo's return URL).
- **2.0:** None of these is in `old-addresses.ts`. S41b's page sweep read qanvast's 128 pages; plg has 155. Each one falls to a not-found page.
  `/leads/settings` and `/visualizer/materials` hit their record pages' `notFound()`.
- **Why it matters:** plg's studios have these bookmarked, and their bell and emails already hold `/settings/usage` links that will break.
- **Recommendation:** Add the rows: `/tools/quotes`→`/quotes`, `/settings/usage`→`/company/plan`, `/company/settings`→`/settings?section=studio`,
  `/company/settings/quotes`→`/settings?section=quotes`, `/company/profile/brand-kit`→`/company/templates/brand`,
  `/company/templates/tasks/:id`→`/templates/tasks/:id`, `/leads/settings`→`/settings?section=leads`, `/visualizer/materials`→`/company/materials`.
  `/billing/return` goes with the payment seam. Vicky approves the landings; the developers add the rows.
- **Size:** S

### T-6 · AI Visualizer: no way to start from a project, and no Projects kind
- **Kind:** Partial
- **1.0:** The start strip offered Blank · From a lead · **From a project** (`components/visualizer/landing/start-strip.tsx:125`). The landing
  grouped designs as "Projects & Leads" · "Projects" · "Leads" (`tools/ai-visualizer/page.tsx:362-382`).
- **2.0:** New ▾ offers Blank design · For a lead… · From a sample room…, and the Kind filter offers Leads · Personal
  (`components/visualizer/home/visualizer-home.tsx:186-191`). A project's design appears under its client's name. The only project door is the
  project's own Design › Designs (`components/projects/designs/project-designs.tsx:56`). Audit 16 VL-03 deferred this ("projects Later") before
  Projects existed, and it was never closed.
- **Why it matters:** A designer working by project won't find the project in the Visualizer's own list or start menu.
- **Recommendation:** Add "For a project…" (it opens the project's lead's design) and a Projects kind, as the 3D Space Planner's New ▾ already
  has (`components/planner/home/planner-home.tsx:139`). Vicky's lane.
- **Size:** S

### T-7 · ⌘K doesn't know 1.0's words in this area
- **Kind:** Hard to find
- **1.0:** The labels a member learned: "3-D Space Planner", "Visualiser" (the site's spelling), "Quote X-Ray" typed as "xray", "Document
  Templates", "Packages", "Signing Documents", "Quote Rules" (`accounts/page.tsx:100-109`), "Meeting Insights", and "renders".
- **2.0:** Each of these finds nothing in ⌘K (offline run of `pageHits`). "3-d" doesn't match "3D Space Planner" (`model.ts:263`). The
  Templates, Price book and contract-template rows carry no 1.0 words (`model.ts:264-266`, built from `COMPANY_GROUPS` / `TEMPLATE_KINDS`). The old URLs for the same pages do work.
- **Why it matters:** Typing the old name is the first thing a 1.0 user tries in an unfamiliar app, and here it finds nothing.
- **Recommendation:** Add the 1.0 words to the existing rows' `words` (no new UI), and drop one-letter terms such as "a" in `rankOf`.
  Vicky approves; it's small.
- **Size:** S

### T-8 · The Homeowner Portal left Tools for Company, with nothing in Tools pointing to it
- **Kind:** Hard to find (low)
- **1.0:** It was a Tools item: "Homeowner Portal" (`app-sidebar.tsx:28` qanvast; the plg om rail too, `lib/om/tools-nav.ts:25`).
- **2.0:** Company › **Client portal** (`lib/company/sections.ts:20`). Tools has no tile for it (`tools-popover.tsx:21-31`). ⌘K "homeowner portal"
  does find "Client portal address", and the old URL lands (`old-addresses.ts:114`).
- **Why it matters:** This is the same pattern as Escalations: an Owner opens Tools, where it used to be, and finds nothing.
- **Recommendation:** Keep the one home (REG-1360's rule). Either have Tools signpost it, or add "Homeowner Portal" to the Company section
  row's own ⌘K words. Vicky's call.
- **Size:** S
