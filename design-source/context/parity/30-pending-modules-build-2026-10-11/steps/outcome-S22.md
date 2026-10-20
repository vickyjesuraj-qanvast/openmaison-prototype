# S22 · the Dashboard — outcome (2026-10-13, lane B)

Cards: `studio:dashboard` (the home page — 1.0's chat-first home and its Classic mode), `held:dashboard` (the held page), `api:industry-news`
(the Industry News card and its RSS reader) and `public:industry-news-feed` (the same reader, listed among the public APIs). His "build all of
them" 2026-10-11 lifts the Dashboard's hold (L7 "waits on frames", N-02, REG-1560). **What it is in 2.0:** one page, no mock, built from what the
studio already works out — **What needs me → What's next → Where it stands** (his rule for every page, REG-1445…) — on the house pieces the lead
and project Overviews are made of: the MAISON AI BRIEF with the assistant's box, Needs you, MY TASKS, Coming up, the number tiles, Workload,
Site updates and one Market Insights article. Every row and tile is a door into its thing's one home (`?from=/dashboard` where that home has a
Back); nothing is a second copy of a list or a number worked out another way. The Dashboard is the studio's front door (`/`), Accounting's is
still Finance › To do.

1.0 read in full: `src/app/(main)/dashboard/page.tsx` (Classic mode), `src/components/dashboard/{chat-first-home,home-widgets,inline-response,
recent-updates-feed,sparkline,donut-chart}.tsx`, `src/app/api/news/route.ts`, `src/app/api/buddy/route.ts` (+ `chat/`), `src/lib/region-config.ts`
(`newsSources`), `src/lib/access-control.ts` (`getDefaultRoute`), `src/app/(main)/settings/page.tsx` (Home Screen), `src/lib/keyboard-shortcuts.ts`,
`src/components/layout/{app-sidebar,topbar,bottom-nav}.tsx`, `src/components/ui/page-coach-marks.tsx`. Carried notes taken: **S08** (the set-up
row is a door to Settings › Studio's list), **S10** (the box is Maison AI's Ask; the rows land in Recent), **S12** · **S14** (considered —
below), **S16** (the rail's / dock's Dashboard made live, G then D, the logo decided), **S18** ("What did I miss?" is the bell in one list),
**S23** (meetings coming up and to write up), **S24** (considered — below), **S25** (the news card is a door into Market Insights — one reader;
RSS headlines come through its mapper), **S26** (Messages is a door, opening on the unread), **S27** (Hangouts coming up).

Register rows: `steps/reg-S22.md` (REG-S22.1…12). Probe: `design-source/verify/pending-modules/verify-pm2-s22.cjs` — **116 / 116** (it puts
back the signed-in member, the task it ticks, the questions it asks and the headlines it writes). Shots: `design-source/verify/pending-modules/pm2-s22/`
(30: each role at 1440 · 1024 · 768 touch · 390 touch · 320 touch, the Ask answered, the Start landing, and the loader's ghost at 1440 and
390 touch).

## Pending lines ledger

| Card · line (word for word) | Status | Where |
| --- | --- | --- |
| studio:dashboard · A front door with a greeting and the assistant's chat box (rides on the mAIson assistant card) | **Built** — `/dashboard`, the studio's landing; the MAISON AI BRIEF greets the viewer by name by the studio's clock and says what the page holds in one sentence; its Ask box is Maison AI's own (S10): a question opens the sheet answered from the records and lands in Recent; two questions by role on the card, the page's others in the FAB sheet (REG-S22.1 · S22.2) | `app/dashboard/*`, `components/dashboard/dashboard-view.tsx` (`AskBox`), `lib/dashboard/model.ts` (`dashboardBrief` · `asksFor` · `moreAsksFor`), `components/leads/detail/ai-brief.tsx` (`ask`) |
| studio:dashboard · Priority widget: overdue tasks, follow-ups due, unassigned new leads | **Built** — Needs you (REG-S22.3): one row per place that waits on you, Needs your OK first; unassigned leads and overdue follow-ups are the Leads listing's own to-do scopes with the same numbers; overdue tasks (follow-ups are tasks in 2.0, REG-608) stay red in MY TASKS (the project card's rule — never a Needs you row) | `lib/dashboard/queries.ts`, `components/dashboard/dashboard-view.tsx` (`NeedsCard`) |
| studio:dashboard · Leads, Tasks, Projects and Chats count widgets that open their lists | **Built** — Where it stands: Leads (the listing's count) · Open projects (the listing's default view, "n need attention") · Messages (the rail's unread, opening on Unread); Tasks is MY TASKS itself, with its own counts and ↗ (REG-S22.4 · S22.6) | same; `components/projects/messages/chat-inbox.tsx` (`?show=unread`) |
| studio:dashboard · Studio Pulse: leads per day against last week, the funnel, open escalations (Owners and Admins) | **Built** in 2.0's shape — the Leads tile says this week's leads against the week before for Owners and Admins (the listing's own date rule); the funnel is one press away on the listing (its scope menu counts every stage); escalations are the projects' ticket rows in Needs you (red when escalated or left waiting — ours). 1.0's seven-day sparkline is not drawn (the two counts say it; nothing decorative) | `lib/dashboard/queries.ts` (tiles) |
| studio:dashboard · Team Workload: leads and tasks per member (Owners and Admins) | **Built** — Workload: Projects › Workload's own lines (projects against capacity) and each member's open leads, for Owners, Admins and a Manager over their team (Workload's own rule); **tasks per member: kept out** — 2.0's Tasks has no list by member, so a count there would be a number with no home (REG-S22.7) | `lib/dashboard/queries.ts` (`workloadOf`), `TeamCard` |
| studio:dashboard · Upcoming: a month calendar of tasks and follow-ups | **Built** as Coming up — this week and next, else the next three: the projects' own Coming up, the viewer's meetings, the Hangouts the studio takes part in, Accounting's money due; tasks and follow-ups stay in MY TASKS' Upcoming (one list each). **The month grid: kept out** — 1.0's dots only ever covered the next seven days; each row's day says it in words (REG-S22.5) | `components/projects/overview/coming-up-card.tsx` (`two` · `desk` · `empty`) |
| studio:dashboard · Industry News from Singapore property and design RSS feeds | **Built + stand-in** — the card is a door into Market Insights (S25's one reader); 1.0's reader is Market Insights' Industry News (`lib/market-insights/rss.ts`: 1.0's five sources, its reading, its topics; each headline an Industry News article linking out to its source). **Stand-in:** nothing fetches in the prototype — the developers' fetcher runs `readHeadlines` hourly; the demo has no headline (a made-up story credited to a real newsroom would be a fabricated record) (REG-S22.9) | `lib/market-insights/{rss,feed}.ts`, `scripts/rss-check.mts` |
| studio:dashboard · Recent site updates across every project (Owners) | **Built** — Site updates: the last fortnight's published updates, the three newest, each opening on its project's Updates; Owners and Admins (REG-S22.8) | `lib/dashboard/updates.ts` |
| studio:dashboard · Classic mode's margin alerts, One-Click Profit and compliance alerts (held: N-02, TD-106) | **Built** — One-Click Profit is the money tiles (Owed to you — Reports' own; Profit this month with its margin and revenue — the P&L's own); margin alerts are the Profit tile's margin and the projects' own money rows (a margin that slipped, a cost past the quote — "What the numbers say"); compliance alerts are Needs you rows (a project's mandatory items still to do in its phase). Classic's sample figures (revenue trend, top clients, the donut, a fixed conversion rate) are not carried — the card's own advice (REG-S22.3 · S22.6) | `lib/dashboard/queries.ts` |
| studio:dashboard · Settings › Home Screen: chat-first or classic | **Kept out — decided:** the one page carries both (the box on top of the cards), so there is nothing to choose; 1.0 kept the choice per browser (REG-S22.2) | — |
| studio:dashboard · (question) A chat-first home (the assistant on top) or a widgets dashboard? | **Both, on one page** — as above | — |
| studio:dashboard · (question) Once it exists, should 2.0 open on the Dashboard instead of Leads? | **Yes, as 1.0** (`getDefaultRoute`); Accounting keeps Finance › To do (FR-040) (REG-S22.1) | `app/page.tsx` |
| studio:dashboard · (question) Keep the industry News feed? | **Yes, as Market Insights' Industry News** — one reader (above) | — |
| held:dashboard · The whole page (lead KPIs, Studio Pulse, team workload, upcoming, priority feed) — held · his call (L7 'waits on frames'; REG-1560 kept it held) · revisit: it is the rail's first item and the first thing a demo client presses | **Built** — the hold lifted by his "build all of them"; no mock, every screen on house pieces and logged (REG-S22.1…12) | `app/dashboard/*`, `components/dashboard/*`, `lib/dashboard/*` |
| held:dashboard · Project widgets, compliance alerts, recent updates, the 'Site Update' chip (PR-030 · FR-108 · TD-106 · UC-026 · UC-027) — held (Dashboard) | **Built** — Open projects tile; each project's own Needs you; compliance rows; Site updates; the 'Site Update' chip is the page's *Draft a site update* (Maison AI lists the running projects, each opening its Updates composer) | same |
| held:dashboard · Margin alerts, the One-Click Profit card, a revenue KPI — held (N-02) · 1.0's revenue tile showed fixed sample figures | **Built** — Profit this month (its revenue in the help line) and Owed to you from Reports › Finance's own reports; no sample figure | same |
| held:dashboard · (question) Draw a 'today' page first, or take a first cut from Reports and Needs you? | **A first cut from Needs you and Reports** (the brief's instruction), on house pieces | — |
| api:industry-news · The Industry News card and its RSS feed reader | **Built + stand-in** — as above | `lib/market-insights/rss.ts` |
| public:industry-news-feed · The news card with stories by category and their links out | **Built + stand-in** — Market Insights' Industry News category (its chip, its count) holds the stories, each tagged with 1.0's topic and its source and linking out ("Read it on {source}"); the Dashboard's card opens the featured or newest article | same |

## Found in 1.0, not on a card
- **The Business Performance Analyzer** (Classic's chat, `/api/buddy`, a model) and **its four quick queries** — answered by rule where 2.0 has
  the facts (Maison AI's Ask: projects late → `late`, revenue → `pnl`, the team → `team`); "which leads are most likely to close" has no rule
  in 2.0 (no lead score) — the model seam stays the developers' (`readQuestion`). Not carried as chips.
- **The chat-first home's inline conversation** (`inline-response.tsx`, "Continue in mAIson panel") — answered in Maison AI's sheet instead (one
  place for answers; the conversation is the sheet's Recent).
- **The home's page tip** ("Meet mAIson, your AI assistant", `page-coach-marks.tsx`) and the **skin's greeting flair** — guided tours and
  skins are S32's, parked whole by him.
- **The rotating chip marquee** (twelve capabilities scrolling for ever) — not carried: motion without purpose; the box answers each by rule.
- **1.0's DRY_RUN headlines** (eight invented stories credited to PropertyGuru, BCA, URA, CNA, the Straits Times) — not carried: invented stories
  under real newsrooms' names.
Nothing for S41b.

## Decisions taken (as recommended — his "build all of them" 2026-10-11)
- **The Dashboard is the front door** for the studio's roles (1.0's); **Accounting lands on Finance › To do** (FR-040 kept) and has its
  Dashboard first on the rail and the dock.
- **The logo tile keeps expanding the rail** — the mock (795:22541) wins over 1.0's logo → Dashboard (S16's question).
- **One row per place in Needs you, never a second copy:** a project's row is its own Needs you's top row and how many more; its money row about
  a record Finance › To do lists is To do's (its one row, its own count).
- **Approvals read from unread are opened, never approved, from the Dashboard** (S-20's rule: the header never approves unread) — the button is
  *Review* and opens the record.
- **No tile is coloured** — red only for what is late and ours (S-05); Reports keeps its own grades.
- **Chat-first and widgets on one page**, so no Home Screen setting.
- **No month grid; no sparkline; no donut** — the lists and the counts say it.
- **Industry News is Market Insights'** (one reader); the reader is built, the fetch is the developers'.
- **Not added:** a Marketplace "deals ending soon" tile (S24's "can" — not a pending line and not the studio's work: calm), a "lines not from My
  Items" row (S12's — the quote's own Match n lines), an "ask for a review" row (S14's — the ask leaves no record, so it could never clear).

## What to check in the browser (production build; View as switches roles; 1440 and 390)
- **Dane (Owner), 1440:** open `/` → the Dashboard. The brief: "Good morning, Dane. 15 things need you — first, “Feature wall panels have
  arrived” — HDB 5-Room — Benjamin Han. 1 task is overdue." Type a question in *Ask Maison AI* → the sheet opens answered; *What did I miss?* → the bell's notices. Needs
  you: *Needs your OK · 5* first; *Start the project · Condo 3-bedder — Marcus Teo* → Start lands on the project with its Start sheet open (Esc
  writes nothing); *16 things in Finance’s To do* → To do (16, the same groups); Show 9 more. MY TASKS: tick *Order the kitchen cabinets* →
  "Task completed · Undo". Where it stands: Leads 31 ("5 added in the last 7 days · n the week before") · Open projects 4 · Messages 1 · Owed to you · Profit this month — each opens its list or
  report with the same figure. Workload (Michelle first, Full) → Projects › Workload. Site updates → the update on its project. From Market
  Insights → the article; Back says Dashboard. G then D from anywhere.
- **Hui Min (Admin):** the Owner's page. **James (Manager):** Workload over his team, Leads · Open projects · Messages, no money tiles, "On hold
  since … · Resume" on Aisha's home. **Germaine (Designer):** My leads · My projects · Messages, no Workload, no template approval, her
  meeting's brief to save. **Priya (Accounting):** "One thing needs you: 13 things in Finance’s To do", her money due this fortnight in Coming
  up, Owed to you · You owe · Profit this month; `/` still lands her on Finance › To do; the Dashboard leads her rail and dock.
- **390 / 320 touch:** the cards in reading order (needs you · my tasks · coming up · where it stands · workload · updates · article), four
  Needs you rows before Show more, two tiles a row (one at 320), no sideways scroll. **A cold load:** one ghost, the page's own for that role.

## Probes run
On fresh copies of the repaired base (`pbuild/base.db` + migrate + repair; no migration, no repair of this step) with `next start -p 3170`;
:3170 stopped after. `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 16 warnings are older files') ·
`npm run design:lint` nothing new · `npx next build` green · `npm run design:anatomy` (scratch `next start`, :3170, the Dashboard on its list): 87 pages, **all 1717 measures hold**.

| Probe | Tally |
| --- | --- |
| `pending-modules/verify-pm2-s22.cjs` (new — the front door, the brief and its Ask, Needs you and its doors, `?run=`, Finance's row, the Leads scopes, MY TASKS with Undo, Coming up's window, the tiles against their homes, Workload, Site updates, the article, five roles × five widths with the loader's cards = the page's, the Industry News reader end to end) | **116 / 116** on a fresh base (twice), page error log empty |
| `scripts/rss-check.mts` (new — 1.0's reader on a sample feed) | all 10 checks ok |
| through `regression/run.cjs` on :3170: `ux-p7` · `view-as` · `kb-r1` · `kb-r2` · `search` · `dane-p6` · `ux-p4` · `ux-p1` · `st-r1` | 89 / 89 · 23 / 23 · 35 / 35 · 29 / 29 · 27 / 27 · 41 / 41 · 56 / 56 · 81 / 81 · 57 / 57 |
| `first-run-empty` · `first-run-noleads` · `first-run-full` · `first-run-ghosts` | 89 / 89 · 5 / 5 · 6 / 6 · 15 / 15 |
| `ghosts-same` 1440 · `ghosts-same-390` touch (the Dashboard now on their list) | 66 / 66 · 66 / 66 |
| `panel-order` | View as 304 · Company 304 · Tools 318, both orders (no tally lines, as before) |
| `pending-modules/verify-pm2-s08` · `s10` · `s16` · `s18` · `s23` · `s25` · `s26` · `s27` | 70 / 70 · 107 / 107 · 56 / 56 · 63 / 63 · 147 / 147 · 98 / 98 · 107 / 107 · 155 / 155 |
| `parity-map-build/verify-pm-i` · `reports-in-company-2026-10-08/verify-reports` · `simplify-projects-finance/verify-ks` · `projects/verify-pj-r1` | 54 / 54 · 41 / 41 · 29 / 29 · 98 / 98 |

Changed as deliberate changes (above): pm2-s16, P7, dane-P6, pm-i. A studio with no leads (`noleads.db`) and one with its libraries
cleared (`empty.db`) open the Dashboard with no error (zeros read "None added in the last 7 days", "Nothing needs attention", "You’re up to
date", "Nothing waits on you").

## Migration and repair
- **No migration** — the Dashboard has no record of its own; every part reads its home's.
- **No repair** — every state shown is the records' own. **R145 is still free** (lane B).

## Shared pieces changed
- `components/leads/detail/ai-brief.tsx` (+ `.module.css` `.ask`): an optional `ask` slot on the first card, `lead` optional when `briefs` are
  given; `AiBriefGhost` `ask`. The lead and project pages pass neither — unchanged.
- `components/leads/detail/my-work-card.tsx` (+ `.module.css` `.where`): optional `whereOf` (the Dashboard's tasks name where they are).
- `components/projects/overview/coming-up-card.tsx`: optional `onOpen` · `two` · `desk` · `empty`; `needs-card.tsx` exports `needIcon`;
  `overview-ghost.tsx` `CardGhost` takes `phone`; `project-overview.module.css`: **a two-line row with no buttons keeps its chevron on its line**
  (`.row[data-two]:not([data-split])` — the bug fix REG-S22.11, which the project Overview's With {client} rows gain too).
- `components/projects/project-frame.tsx`: the `?run=` landing. `components/projects/messages/chat-inbox.tsx`: `?show=unread`.
  `components/quotes/list/quotes-workspace.tsx` + `app/quotes/page.tsx`: `?todo=`.
- `components/shell/app-rail.tsx` · `mobile-nav.tsx` (the Dashboard's href; Accounting's dock), `lib/keys/registry.ts` (go.dashboard),
  `lib/settings/roles.ts` (`/dashboard` for Accounting), `lib/nav.ts` (`fromLabel`), `lib/global-search/model.ts` (the page),
  `lib/ghost-shapes.server.ts` (`dashboard.team` · `dashboard.updates`), `lib/leads/tasks.ts` (`railBadges` read once per request),
  `lib/projects/queries.ts` (`fetchProjectRows` read once per request), `lib/market-insights/feed.ts` (`feedStatements` scope),
  `scripts/design-anatomy.mjs` and `design-source/verify/ghosts/verify-ghosts-same.cjs` (the page on their lists).
- Probes changed as deliberate changes (each commented "(pending modules S22, a deliberate change of this rule)"): `pending-modules/verify-pm2-s16.cjs`
  (the rail's and the dock's Dashboard live, no Soon left on the rail), `ux-build-2026-09-30/P7/verify-p7.cjs` (the same),
  `uat-dane-2026-10-01/P6/verify-p6.cjs` (the plain "Coming soon" snackbar now from Qanvast Ops' Lead credits tab),
  `parity-map-build/verify-pm-i.cjs` (Accounting's rail and dock carry the Dashboard).
- No `components/om/*`, shell frame or `app/globals.css` change. **Lanes:** `lib/maison-ai/*` untouched (the Dashboard only asks).

## For the next steps
- **S30 (sign-in):** a real sign-in lands on `/` — the Dashboard for the studio's roles, Finance › To do for Accounting.
- **S34 (real services):** the Industry News fetch is `readHeadlines(fetchText)` → `feedStatements(rowsFromFeed(headlineArticles(list, now)), now,
  { scope: 'headlines' })`, hourly (1.0's cache); a model behind the Ask box is Maison AI's `readQuestion` (S10).
- **S35 (marketing site), S41b, S42:** the Dashboard is a module page in its own right — if a "Today" summary email ever comes, it reads
  `fetchDashboard()` rather than its own counts.
- **UAT (the orchestrator's):** a step fits the first chapter — "Open OpenMaison: the Dashboard greets you; press the first Needs you row, come
  back with Back; ask Maison AI 'What did I miss?'" (Dane), and one for a Designer and for Priya.
- **For CLAUDE.md's Map (the orchestrator's):** *The Dashboard (pending modules S22)* — `/dashboard` (`app/dashboard/*`), `components/dashboard/
  {dashboard-view,dashboard-ghost}.tsx`, `lib/dashboard/{model,queries,updates}.ts`; the front door (`app/page.tsx`); doors' landings `?run=`
  (project frame) · `?todo=` (Tools › Quotes) · `?show=unread` (Messages); the Industry News reader `lib/market-insights/rss.ts` +
  `scripts/rss-check.mts`.

## Flags for Vicky
- **No mock draws the Dashboard** — every card is a house piece and logged (REG-S22.1…12); please review `pm2-s22/`.
- **The front door moved from Leads to the Dashboard** for every studio role (1.0's rule); Accounting's stays Finance › To do.
- **Workload shows projects against capacity and open leads, not tasks per member** (1.0 counted tasks; 2.0's Tasks has no list by member).
- **No tile is red** (Reports' tiles colour an overdue debt and a loss; the Dashboard keeps red for late-and-ours).
- **The demo's Profit this month is negative** (−S$3,005.50: credit notes issued this month exceed what was invoiced) — Reports › Finance says
  the same; the tile's help names the month's revenue so the figure reads.
- **No headlines in the demo** — the RSS reader is built and checked on a sample feed; the fetch is the developers'.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for the page; the rail, the dock and the logo tile are the mocks' (the logo still
   expands the rail); every card is a mocked or house piece (MAISON AI BRIEF 858:24867, MY TASKS 858:24989, LEAD STAGES rows, the number
   tiles); every invented word is in REG-S22.*'s invented-copy lists.
2. **One system, no one-offs** — AiBrief, Card, Row, MyWorkCard, ComingUpCard, StatTile(s), TextField, IconButton, CardGhost and the ghost kit;
   the only new stylesheet is the page's frame (`dashboard.module.css`: the content box, the tiles' two-up, a phone's order), on tokens —
   `npm run design:lint` holds.
3. **Plain words** — "Needs you", "Needs your OK", "{n} things in Finance’s To do", "1 lead has no member yet", "Write up the meeting with
   Kevin", "Where it stands", "Profit this month", "Nothing coming up this week or next".
4. **Nothing is lost** — ticking a task done answers with Undo; closing a landed Start sheet writes nothing; the page writes nothing else.
5. **Say why** — a row says what waits and where ("HDB 5-Room — Benjamin Han · 9 more"); a tile's help says what its number is ("3 invoices not
   paid in full · S$34,154.98 overdue"); a part that can't be read leaves its card out rather than failing the page.
6. **Back returns where you came from** — every door carries `?from=/dashboard`; the homes with a Back name the Dashboard (`fromLabel`);
   L1 homes (the listings, Finance › To do, Messages) are reached by the rail.
7. **Every screen is whole** — shell, L1 header, Maison AI (its questions registered), `loading.tsx` + `PageReveal` drawing the one ghost by
   role, `error.tsx` (RouteError), every empty line ("Nothing waits on you", the MY TASKS empty card, "Nothing coming up this week or next").
8. **Every width is designed** — two stacks at a desk, one column to 1024, the cards in reading order on a phone, four Needs you rows there,
   tiles two-up (one at 320), no sideways scroll at 390 / 320 against `screen.width` for every role (probed).
9. **Tables follow the leads listing** — not applicable (no table; lists are LEAD STAGES rows).
10. **Motion with purpose** — no new motion (the house cards' own; 1.0's marquee not carried).
11. **Honest data** — every figure is its home's own (probed against the listing, the rail, Finance › To do, Reports › Finance, Projects ›
    Workload, a project's Needs you); no sample figures; no invented headlines; the demo needs no new record.
12. **Reach for everyone** — G then D; every row is a link plus one named button; tiles are links named with their figure and where they go;
    the Ask box is the house field with its label and a named send; focus and keys are the house pieces'.
- **How to add a missing thing** — one home (the Dashboard is a module page — 1.0's — and everything on it is a door into its thing's home);
  shown only when it applies (Workload, Site updates, the article, each row only when something waits; by role); one button per row (the next
  step); no set-up (the page reads what the studio already has; no Home Screen setting).
