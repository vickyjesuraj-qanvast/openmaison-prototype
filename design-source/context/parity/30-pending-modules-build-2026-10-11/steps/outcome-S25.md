# S25 · Market Insights — outcome (2026-10-12, lane B)

Card: `studio:market-insights` — "Market Insights (articles)": *a reading room of articles that OpenMaison staff publish from Platform admin:
Trends, Reports, Case Studies, Industry News. A featured article, category chips and search; an article page with its text and charts. It is
empty until staff publish.* (recommendation *needs his mocks / decision*, effort S; its question "Who writes the articles — and should this
merge with the Dashboard's News?"). His "build all of them" 2026-10-11 decides it is built. **What 1.0's Market Insights is:** not market data
the studio reads from a service, and not insights derived from the studio's records — it is **articles**, kept in one platform table that
Platform admin's CMS writes and every studio reads. So the build is the reading room on house pieces, the studio's copy of the editors' feed
behind one mapper (as S24's Marketplace feed), and an honest demo of sample articles through that mapper; nothing derives market facts and
nothing calls a model.

Carried notes taken: **S16** (Tools › Market Insights' Soon signpost made live — it was the last Soon tile; pm2-s16 and P7 changed as deliberate
changes), **One home per thing** (articles are not the studio's own numbers, so Market Insights is a module page under Tools — not a Company ›
Reports tab; Reports stays Leads · Projects · Finance · Meetings), **S10** (Maison AI answers from the records here and acts), **S24** (the
feed's one mapper + an honest, labelled demo; REG-1910's lesson — no demo link opens a dead page: the samples link only inside the app),
**S19** (not a Pro feature — 1.0's seven `PRO_FEATURES` don't name it; nothing added). 1.0 read in full: `src/app/(main)/tools/market-insights/
page.tsx` and `[id]/page.tsx`, `src/components/market-insights/article-chart.tsx`, `src/lib/queries/market-insights.ts`,
`src/app/api/market-insights/route.ts` and `[id]/route.ts`, `src/app/api/admin/market-insights/route.ts`, `src/app/admin/market-insights/page.tsx`,
`scripts/migrations/046_market_insights.sql` and `152_seed_market_insights_articles.sql`, and every other mention (`proxy.ts`, `access-control.ts`,
`role-editor.tsx`, `admin/settings`, `admin/studios/[id]`, `admin/layout.tsx`, `admin-pages.ts`, `app-sidebar` · `topbar` · `bottom-nav`,
`breadcrumb.tsx`, `region-config.ts` newsSources, `compliance-navigator/page.tsx`, `051_platform_config.sql`, `docs/user-stories/{tools,detailed/tools}.md`).

Register rows: `steps/reg-S25.md` (REG-S25.1…10). Probe: `design-source/verify/pending-modules/verify-pm2-s25.cjs` — **98 / 98** (it puts back
every table it touches, whole, and checks the leads' stages and stage logs are as found). Shots: `design-source/verify/pending-modules/pm2-s25/`.

## Pending lines ledger

| Card line (word for word) | Result | Where |
| --- | --- | --- |
| Article list: a featured article, category chips, search | **Built.** 1.0's category chips (All · Trends · Reports · Case Studies · Industry News, each with its count from the records; a category with none left out) in a chip rail; 1.0's search ("Search articles" — title, first lines, tags; "/" reaches it); 1.0's featured article as one wide card on All with no search; every article newest first on the house gallery card (a reading list of rows on a phone); 24 at a time + Show more; the address keeps category · search · shown, so Back returns; the house "No results found" + Clear All; the empty card while the feed has nothing | `app/market-insights/(home)/*`, `components/market-insights/{insights-home,cards,insights-ghost}.tsx`, `market-insights.module.css`, `lib/market-insights/{model,queries}.ts` |
| Article page with its text and charts | **Built.** `/market-insights/<id>`: L2 header (Market Insights / title, Featured; Back named by origin), the reading column (category, headline, first lines, byline, the sample note, the cover — its fallback when it won't load), the body read from the editors' Markdown into blocks rendered as React (headings, paragraphs, bold · italic · code, lists, quotes, rules, tables, pictures, links in place or out), 1.0's five ```chart kinds on the house palette with a crosshair readout and **Show the numbers**, tags that open the list searched, More from Market Insights; an article taken down (or a draft, or an old link) answers its own notice | `app/market-insights/[articleId]/*`, `components/market-insights/{article-page,article-body,article-chart,article-ghost,article-not-found,peek}.tsx`, `article.module.css`, `chart.module.css`, `lib/market-insights/markdown.ts` |
| Writing and publishing the articles (Platform admin, not the studio) | **Parked by him** — "you can ignore admin" (the report left Platform admin out, `29-…/README.md`). What the studio needs from it is built: **the seam** `lib/market-insights/feed.ts` — 1.0's `market_insights` row typed, its published / featured flags honoured, an unpublished or deleted article marked removed in the studio's copy (never deleted, so its address can say so). **Stand-in, honest:** the demo's articles are six samples written for the demo (+ one draft that never arrives), through the same mapper (repair R142), each marked and saying so | `lib/market-insights/{feed,demo}.ts`, `scripts/repair-demo-data.ts` R142 |
| (question) Who writes the articles — and should this merge with the Dashboard's News? | **As recommended:** OpenMaison's editors (the platform's CMS, parked above). **One home for articles:** Industry News is one of Market Insights' own four categories; if the Dashboard (S22) shows news, it is a door into Market Insights (`fetchInsights()` / `liveArticles()`), never a second reader. 1.0's RSS headlines (`api:industry-news`, recommended *skip*) stay S22's call — if built, they come in through this mapper as Industry News | REG-S25.1; note for S22 below |

## Found in 1.0, not on a card
- **The article address opened a draft** (1.0's `/api/market-insights/[id]` had no published filter) — **not carried**: a draft is the editors';
  it never reaches the studio's copy, so its address is the notice.
- **1.0's seeded articles** (`152_seed_market_insights_articles.sql`: fifteen articles by "Qanvast Research", five per region, figures cited to
  cost guides, HDB, BCA, CASE and MAS) — **not carried**: their figures can't be checked and the prototype never presents a number as a market
  fact; the demo's own samples are written in their place, marked, with every chart's source reading "Illustrative figures for the demo".
- **Region-scoped articles** (the seed tagged Singapore / Malaysia / Dubai) — the demo is Singapore's; regions are S33 (**on hold**, his word).
- **Platform admin › Market Insights CMS** (create · edit · publish · feature · delete, sort by created / published, its counts),
  **Platform admin › Settings / Studios' `tools/market-insights` flag** — Platform admin (excluded by him). For S41b: nothing else.
- **The role editor's `tools/market-insights` permission** — the roles editor stays held (his hold); 2.0's rule is 1.0's tag list (every role
  but Accounting).
- **1.0's proxy note "Shown on the marketing pricing surface"** — no code in the 1.0 repo reads the articles outside Tools; for **S35** (the
  marketing site) to decide whether its pricing page shows the latest articles.
- **1.0's studio addresses `/tools/market-insights` and `/tools/market-insights/<id>`** — not redirected: S02 redirects the links 1.0 sent
  *clients*; no 1.0 studio page (`/tools/quote-xray`, `/tools/ai-visualizer` …) redirects either. For **S41b**'s sweep of 1.0's routes, if
  he wants studio bookmarks carried (an article's 1.0 id maps to `mi-<id>` — `articleId` in `lib/market-insights/feed.ts`).
- **The breadcrumb override with the article's title** — the L2 crumb · title. **The cover's fallback** when a picture won't load (1.0's
  category gradient) — the category's glyph on the well. **1.0's chart y-axis label** (`yAxisLabel`) and **per-series colours** — not carried
  (the title names the unit; the house palette gives the hues). **The Compliance Navigator sending non-owners to Market Insights** — 2.0's
  Navigator has its own rule; nothing to carry.

## Decisions taken (as recommended — his "build all of them" 2026-10-11)
- **One home:** Tools › Market Insights, a module page (articles are not the studio's records — Reports keeps those). Doors: the Tools tile,
  ⌘K (an article kind + Go to), Maison AI; a future Dashboard card is a door, never a second reader.
- **Who:** every studio role but Accounting (1.0: owner · admin · id); the house gate for Accounting, and ⌘K leaves articles out for them.
- **Honest data:** a `sample` flag on the copy (set only by the demo) drives the list's one tinted line, CATEGORY · SAMPLE on each card and
  the article's note — all disappear for an article the editors really publish. Internal links only in the samples (My Sections, My Items, the
  Marketplace's Lumen Lane and Deals) — no demo address opens a dead page.
- **Charts:** the house categorical palette (REG-1577's) and the dataviz rules; 1.0's donut is the house part-to-whole bar; a table view for
  every chart (Show the numbers).
- **Small additions on house pieces** (each logged as invented): tags open the list searched; *More from Market Insights* (three to read next,
  the same category first); the sample lines; the reading list on a phone.
- **Not added:** a bell row for a new article, sharing an article, a "new" badge on the tile (1.0 had none of them).

## What to check in the browser (production build, 1440 and 390; View as switches roles)
- **Dane (Owner)** — the rail's Tools: no tile wears *Soon* now → **Market Insights**. The chips (All · 6, Trends · 2, Reports · 2, Case Studies
  · 1, Industry News · 1), the sample line, the featured *Resale flats are reshaping the renovation brief*, five cards newest first. Reports →
  two reports; open one; Back → still Reports. Search "resale"; "/" from anywhere on the page; a search for "resale zzz" → No results found →
  Clear All. Open the featured article: the area chart (hover the line, or Tab to it and press ← →), Show the numbers, the quote, the
  picture, *My Sections* (opens Company › Price book › My Sections, whose Back says Market Insights), a tag → the list searched. *Renovation
  budgets by flat type* (grouped bars, the table, the adders' bars); *Where a renovation budget goes* (the part-to-whole bar, the stacked
  bars); *Lumen Lane opens a lighting room* → Lumen Lane's Marketplace page and back. Maison AI on the list ("What’s new in Market
  Insights?", "Show me the trends") and on an article ("What does this article cover?" — press a section). ⌘K "benchmark".
- **Germaine / Michelle (Designers)** — the same reading room. **Hui Min (Admin)** — the same. **Priya (Accounting)** — no Market Insights:
  the house gate at `/market-insights` and at an article; ⌘K finds no article.
- **390 / 320 / 768 touch** — one-row bar (chips in a rail, the search glyph), the featured card stacked, articles as a reading list, an
  article's table scrolls in its own box, no sideways scroll.

## Probes run (lane B, `next start -p 3170` on fresh repaired copies of base.db)
| Probe | Tally | Note |
| --- | --- | --- |
| `pending-modules/verify-pm2-s25.cjs` (new) | **98 / 98** | seven sections: the tile and the list (chips and counts from the records, the featured card, newest first, a category, Back to it), the search ("/", its words, nothing found, Clear All, a tag's search), an article (header, byline, the sample note, sections = the record's headings, every chart block drawn, illustrative sources, a quote and a picture, list markers, the readout by pointer and keys, Show / Hide the numbers, a link in the app and Back to the article, read next by category, a table's every row, bars, the part-to-whole bar, a stacked bar), honest data (a draft never arrives, a taken-down article's notice and Back, an empty category left out, real articles without sample marks, a long feed's Show more and the address, the walkable list, the no-cover glyph, a cover that won't load — on a card and on the article — the empty feed's card), Maison AI (answers and acts) and ⌘K (finds and opens, Go to), who (Designer, Accounting's gate and ⌘K), 390 · 320 · 768 touch, the ghosts measured against the pages at 1440 and 390 (cold loads, and opened from a card) |
| regression `search` · `insights-head` · `kb-r1` · `kb-r2` · `view-as` · `panel-order` | 27 · 16 · 35 · 29 · 23 · widths hold | ⌘K (a new kind, a new page — and the fix below), the keys, the rail's popovers |
| regression `ux-p7` | **89 / 89** | V6 changed as a deliberate change (every Tools tile live). **It caught a real regression first** (85 / 87): ⌘K matched articles on their hidden first lines, so "new lead" and "new design" opened an article before Create — fixed: ⌘K matches what an article's row shows (title, category), REG-274's rule |
| regression `ghosts-same` · `ghosts-same-390` | **57 / 57 · 57 / 57** (0.00% each) | the three Market Insights routes joined the list (the list, a category, an article) |
| regression `ghosts-measure` · `first-run-ghosts` · `first-run-empty` | Δ 0 · 15 / 15 · 89 / 89 | the shell's seed gained three keys |
| `pending-modules/verify-pm2-s16.cjs` | **56 / 56** | updated as a deliberate change (Market Insights live, no Soon tile) |
| `pending-modules/verify-pm2-s23.cjs` · `verify-pm2-s24.cjs` | **147 / 147 · 132 / 132** | Reports › Meetings; the Marketplace (its All chip fix included) |
| `reports-in-company-2026-10-08/verify-reports.cjs` | **41 / 41** | was 40 / 41 before this step: it still expected three Reports tabs — **stale since S23** added Meetings; updated as S23's deliberate change (commented) |
| `npm run design:anatomy` (Market Insights' two pages added) | 1699 measures hold | 81 pages, 269 table heads, 24 dialogs, 41 page menus |
| `npx tsc --noEmit -p .` · `npx eslint app components lib` · `npm run design:lint` | clean · 0 errors (the 16 old warnings) · nothing new | — |

## Migration and repair
- **Migration 0101 (lane)** `drizzle/0101_market_insights_s25.sql`, additive and schema-only: the table `market_insights` and its index
  `market_insights_published_idx`. The table is in `BASELINE_TABLES` and the snapshot's `TABLES`; `restoreBaseline` moves `published_at` with
  the demo day (the newest sample stays this week's). **If main holds a 0101 from lane A, the land script regenerates this one.**
- **Repair R142** (the demo's sample articles through the feed's mapper, dated back from the demo day — re-run, it is the feed's sync; the
  draft stays with the editors; every picture checked to be the app's own file, every chart block checked to read, every sample chart checked to
  be marked illustrative; four closing checks). **R143 is the next free in lane B's range.** The baseline fixture is the orchestrator's
  (`db:baseline`) — until it is rebuilt, a Reset to base empties Market Insights (the table is in the list, the old fixture has no rows).
- **Assets**: `public/market-insights/*.jpg` (8 files, 0.45 MB — six covers, two pictures inside articles), made by
  `scripts/market-insights/gen-assets.mjs` from `public/visualizer/samples`.

## For the next steps
- **S22 (Dashboard)**: a "From Market Insights" card reads `liveArticles()` (`lib/market-insights/queries.ts`) — the newest or the featured one —
  and opens the article with `?from=/` (the Dashboard). If RSS headlines come back (`api:industry-news`), map them into `rowsFromFeed`
  as Industry News (a link-out kind would be the one addition) — one reader, never two.
- **S34 (real services)**: the editors' feed plugs into `feedStatements(rowsFromFeed(rows), now)` (1.0's row shape typed in
  `lib/market-insights/feed.ts`); a real feed never sets `is_sample`.
- **S35 (the marketing site)**: 1.0's proxy said the pricing page showed articles; nothing in its code did — decide there.
- **UAT (the orchestrator's)**: a step fits the studio's first day — "Open Tools › Market Insights, read the featured article, show the
  numbers behind its chart, then find the reports" (any role but Accounting).
- **The land**: `lib/global-search/model.ts` gained the `article` kind (after `brand`) and a Go to row; `lib/ghost-shapes.server.ts` three keys
  (`market-insights` · `.featured` · `.samples`); `lib/nav.ts` `fromLabel` `/market-insights`; `components/shell/tools-popover.tsx` the tile's
  `href`; expect small merges there if lane A touched them.

- **For CLAUDE.md's Map (the orchestrator's)**: *Market Insights (pending modules S25)* — Tools › Market Insights `/market-insights` (+
  `[articleId]`), `components/market-insights/*` (`insights-home` · `cards` · `article-page` · `article-body` · `article-chart` · ghosts ·
  `peek.ts`), `lib/market-insights/{feed,demo,model,markdown,queries}.ts`, table `market_insights` (migration 0101), repair R142; the feed's
  one mapper is `feedStatements(rowsFromFeed(rows), now)`; a chart's hue is the house palette's `--cat`.

## Shared pieces changed
- `components/om/category-palette.module.css` — each slot also names its hue as `--cat` (and its background reads it), so an SVG line or dot
  takes the same hue from the one list; nothing renders differently.
- `components/shell/tools-popover.tsx` (the Market Insights tile's `href`), `lib/nav.ts` (`fromLabel`), `lib/global-search/{model,queries}.ts`
  (kind `article`, label Market Insights, a Go to page), `lib/ghost-shapes.server.ts` (three seed keys), `lib/db/{schema,baseline}.ts`,
  `scripts/snapshot-baseline.ts`, `scripts/repair-demo-data.ts` (R142), `scripts/design-anatomy.mjs` and
  `design-source/verify/ghosts/verify-ghosts-same.cjs` (the pages on their lists).
- `components/marketplace/marketplace-home.tsx` — **bug fix** (S24's, same lane): the categories' All chip never showed as picked (the house
  Chips read `''` as nothing picked); All has its own value now (REG-S25.9).
- Probes changed as deliberate changes: `pending-modules/verify-pm2-s16.cjs`, `ux-build-2026-09-30/P7/verify-p7.cjs`, and (S23's, found stale)
  `reports-in-company-2026-10-08/verify-reports.cjs`.
- No shell frame or `app/globals.css` change.

## Flags for Vicky
- The whole module has **no mock** — every screen is on house pieces and logged (REG-S25.1…8); please review `pm2-s25/`.
- **The demo's articles are samples written for this build** (not 1.0's seed, whose figures were cited to real organisations); every page says
  so. The list's tinted line and the article's note go away for real articles.
- **Every Tools tile is live now** — no *Soon* is left in Tools (the rail's and the dock's Dashboard still says coming soon until S22).
- **The house Chips read an empty value as "nothing picked"** — the Marketplace's All chip was built that way and never showed as picked
  (fixed here, REG-S25.9; nothing else in the app does it). Worth a line in the house piece's comment — not changed here, since another lane
  may be editing `components/om/chips.tsx`.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mock draws Market Insights; every screen is the smallest thing on the house pieces, logged with
   its invented words (REG-S25.1…8); the calls are flagged above.
2. **One system, no one-offs** — the L1/L2 headers, the tab toolbar's row, the house chips in a chip rail, the house search, the gallery's card
   (composed), the house tinted note (read-only-note), MetaChip, Avatar, the house chips as tag links, EmptyState, TabSearchEmpty, the record
   notice, RouteError, the ghost kit (Words, GhostChips rail), the house tooltip (its bubble for the readout), Where costs go's bar (composed),
   the house categorical palette (one list, now readable by SVG); tokens only — `design:lint` holds.
3. **Plain words for studio people** — "Search articles", "Read the article", "Show the numbers", "More from Market Insights", "Sample articles
   written for the demo — their figures are illustrative, not market data.", "This article isn’t in Market Insights any more".
4. **Nothing is lost** — nothing here removes; an article the editors take down keeps its row (`removed_at`) and its address says so; a long
   feed is all reachable (Show more); every chart's figures are reachable without hover (the table).
5. **Say why** — a taken-down article's notice says the editors may have taken it down or the link is old; a chart that can't be read says
   so in place; the sample notes say why the figures can't be relied on.
6. **Back returns where you came from** — every door carries `?from=` (cards, the featured card, links in the body, ⌘K, Maison AI rows); the
   list's category, search and Show more live in its address; read-next cards go back to where the reader started; Back names its origin.
7. **Every screen is whole** — the shell, `loading.tsx` and `PageReveal` drawing the same ghost (measured at 1440 and 390, cold and opened from a
   card), the empty card, the no-results card, the notice, the error page, Maison AI's suggestions; the probe's page-error log is empty.
8. **Every width is designed** — 1440, 1024 (the featured card's tighter type), 768 touch, 390 (a reading list, the featured card stacked,
   chips in a rail, the chart's labels above its bars, a table in its own scroller) and 320 — no sideways scroll against `screen.width`.
9. **Tables follow the leads listing** — no data table here (an article's table and a chart's numbers are document content, in the reading
   column's own scroller).
10. **Motion with purpose** — no new motion beyond the house hover and the ghost's reveal; charts don't animate in; the readout follows the
    pointer only.
11. **Honest data** — every state is a record (R142: the feed's copy through its mapper; the draft that never arrives; `sample` on each demo
    article); no number is presented as a market fact; no demo link opens a dead page.
12. **Reach for everyone** — real links and buttons with names (a card's link names its article, category and date), the cards a walkable
    list (`data-kb-list` / `-row` / `-open`), "/" reaches the search, a chart is a named group whose points read by ← → and whose numbers are a
    table, a link out says it opens a new tab, list markers kept, every icon-only control has its tooltip.
