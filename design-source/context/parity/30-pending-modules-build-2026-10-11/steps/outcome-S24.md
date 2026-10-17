# S24 · Marketplace — outcome (2026-10-12, lane B)

Card: `studio:marketplace` (recommendation *needs her mocks / decision*, effort M; its questions "Keep the Marketplace for every studio, only
for Qanvast-listed ones, or drop the rail item?" and "Should a brand link to Finance › Vendors or the Price book?"; the report's "Is the
Marketplace part of 2.0, and who supplies its brands and deals?"). Her "build all of them" 2026-10-11 decides the first: **it is built, for
every studio** (as the rail already offered it). The second, as recommended: **each to its own home** — a brand to Finance › Vendors, its
products to the Price book's My Items. Who supplies the brands and deals: **Qanvast's feed** — built as the studio's copy of it behind one
mapper, filled for the demo by an invented catalogue through that same mapper (an honest stand-in; a real feed is the developers').
Carried notes taken: **S16** (the rail's and More's Marketplace signposts made live — pm2-s16 and P7 trimmed as deliberate changes), **S12**
(Finance › Vendors is the one vendor list — a brand joins it, a vendor of the same name is linked by the house name key; products reach quotes
through the Price book), **S10** (the pages register Maison AI suggestions that answer or act), **S20** (no render door added — the
Visualizer's own brand catalogue is lane A's). 1.0 read in full: `src/app/(main)/marketplace/*` (page, `[id]/brand-detail-page.tsx`,
`_components/*` — hero banner, category filters, filter-sort panel, brand card, deal card, deal modal, load-more trigger — `_api.ts`,
`_hooks.ts`), `src/components/marketplace/vendor-card.tsx`, `src/lib/qanvast-fetch.ts`, and every other mention (`app-sidebar`,
`bottom-nav`, `access-control`, `role-editor`, `team-settings`, `admin/settings`, `admin/studios/[id]`, `CreatePODialog`, the vendors page and
its test, `supabase/seeds/020_seed_reference.sql`).

Register rows: `steps/reg-S24.md` (REG-S24.1…12). Probe: `design-source/verify/pending-modules/verify-pm2-s24.cjs` — **132 / 132** (it puts back
every table it touches, whole, and checks the leads' stages and stage logs are as found). Shots: `design-source/verify/pending-modules/pm2-s24/`.

## Pending lines ledger

| Card line (word for word) | Result | Where |
| --- | --- | --- |
| Brands directory: categories, search, filters, sort, load more | **Built.** Brands · Deals chips with counts; the categories as a chip rail with counts (empty ones left out, as 1.0); "Search brands" over a brand's words; 1.0's Filter & Sort panel (it held only the sort) as the scope pill **Sort: Most popular ▾** — 1.0's three sorts, a featured brand first; twelve at a time + "Showing 12 of n brands" + **Show more** (1.0's infinite scroll as a press); the house gallery cards; the address keeps view · category · sort · shown | `app/marketplace/(home)/*`, `components/marketplace/{marketplace-home,cards,marketplace-ghost}.tsx`, `lib/marketplace/{model,queries}.ts` |
| Deals view and the deal dialog (terms, how to redeem, Get Deal) | **Built.** The Deals chip lists every live deal (flash first, then the soonest to end); the dialog (picture, when it runs, Terms and conditions, How to redeem, who asked before) with one filled **Get deal** — the deal's own page (1.0's ctaUrl/ctaText), else WhatsApp, else email, opened on the press — **stand-in, honest:** nothing is bought; the press is recorded (`marketplace_deal_asks`) and the brand answers the studio | `components/marketplace/{deal-dialog,use-market}.tsx`, `app/marketplace/actions.ts` `askForDeal` |
| Brand page: gallery, services, links, socials, FAQs, its deals, WhatsApp the brand | **Built.** `/marketplace/<brand>`: the L2 header (Add to my vendors · **WhatsApp** — Email when no WhatsApp), the pictures (main + four, Previous · Next, "n / m"; a strip on a phone), About · Contact (WhatsApp, email, business addresses) · Web links (sites, Instagram, Facebook, YouTube) · Services · Deals · **Products** · Questions | `app/marketplace/[brandId]/*`, `components/marketplace/{brand-page,brand-ghost,add-product-dialog,brand-not-found}.tsx` |
| Banners at the top (fixed pictures) | **Built.** The feed's banners in their window, words over the picture, the house edge pagers + "1 / 3" at a desk, a peek on a phone; each opens a deal, a brand or the brand's site. **Decision:** they don't turn on their own (1.0: every 4 s) — flagged for Vicky | `components/marketplace/banners.tsx` |
| (question) Keep the Marketplace for every studio, only for Qanvast-listed ones, or drop the rail item? | **Every studio** — her "build all of them"; 2.0 has no "listed on Qanvast" record (S31's note) | `components/shell/{app-rail,mobile-nav}.tsx` |
| (question) Should a brand link to Finance › Vendors or the Price book? | **Both, each its own kind:** Add to my vendors (Finance › Vendors, linked both ways, never doubled) · Add to Price book (My Items, the book's rule) — and from My Items a client's Choices (From the Price book) | `app/marketplace/actions.ts`, `components/finance/vendor-panel.tsx` |
| (report) Is the Marketplace part of 2.0, and who supplies its brands and deals? | **Yes; Qanvast's feed** — the copy and the seam are built (`lib/marketplace/feed.ts`); the demo's catalogue is invented, through the same mapper — **stand-in** until the developers fetch Qanvast's payload | `lib/marketplace/{feed,demo}.ts`, repair R141 |

## Found in 1.0, not on a card
- **The brand's products** (the API populated them; the page never showed them) — **built** as the Products card + Add to Price book (the
  one home the orchestrator named). 1.0's `price` was words — read into cents and a quote unit by the mapper.
- **Business addresses, email, YouTube, the brand's own line (`quote`)** — **built** into Contact, Web links and About.
- **Flash deal** (shown on 1.0's brand page only) — on every deal card and in the dialog. **The deal's dates** — "Ends in 3 days" / the run.
- **Featured brands** (computed in 1.0's hook, its strip commented out) — the live part kept (Featured tag, featured-first order); the strip
  was dead code — not built.
- **`isUpsizePromo` / `upsizeId`, `dealsRedeemedCount`** — no meaning in 1.0's screens; not carried (the feed's lead count is popularity).
- **Category pictures** (from the API) — not drawn; the house chips carry words.
- **`components/marketplace/vendor-card.tsx`** (a rating and a Get Deal that did nothing) — unused mock, not brought.
- **Platform admin › Settings › Marketplace Categories and the `marketplace` feature flag** — Platform admin (excluded by her); the categories
  come with the feed. For S41b: nothing else.
- **1.0's PO dialog "Add new vendors in Marketplace." and its dead `/marketplace?view=vendors` links** — the intent built: Add to my vendors.
- **The breadcrumb override with the brand's name** — the L2 crumb · title.

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **One home per kind**: vendors in Finance › Vendors, products in the Price book; the Marketplace never keeps a list of either. A product
  reaches a client's Choices through the Price book (a choice's price is a difference against the quote, which the Choices dialog asks — a
  direct door would have to ask it too).
- **A new module, its own page** (brief rule 1): `/marketplace` and `/marketplace/<brand>` in the shell, on house pieces only.
- **Honest**: Get deal opens the brand's own way and records the ask — no checkout, no pretend redemption; the catalogue is a demo feed with
  `.example` web addresses; nothing calls a service.
- **Who**: every studio role (1.0: owner · admin · id); Accounting has none (rail, More, the gate). Anyone adds a vendor (F1-Q4); the Price
  book's rule for products (a Designer proposes).
- **Banners don't turn by themselves** (motion with purpose; 1.0 turned them every 4 s).

## What to check in the browser (production build, 1440 and 390; View as switches roles)
- **Dane (Owner)** — the rail's Marketplace (no Soon) → banners; Brands · 14 / Deals · 10; Sort ▸ Most recent (Rattan Row first);
  Kitchen; search "teak"; Show more. Oak & Linen's "12% off every sofa…" ribbon → the deal: "You asked for this deal on WhatsApp on …" (R141),
  Get deal on WhatsApp → WhatsApp opens. Oak & Linen's card → the page: pictures (Next), About, Contact, Web links, Products → **Add to my
  vendors** → snackbar Open → Finance › Vendors with Oak & Linen open → *See it on the Marketplace* → back. **Add to Price book** on the Oslo
  sofa → Add to My Items → Open in My Items. Floor Xpert: "In your vendors as Floor Xpert Pte Ltd", its vinyl flooring "In your Price book".
  Nook Smart Home: Email / Get deal by email. Maison AI on the Marketplace: "Which deals end soonest?"; on Tessera: "Add Tessera Tile House to
  my vendors". ⌘K "oak", "fourth free".
- **Germaine / Michelle (Designers)** — Kaya Paints › Add to Price book → *Propose it* (Kaya joins the vendors); Michelle sees "Proposed for My
  Items by Germaine". **Hui Min (Admin)** — the proposal opens. **Priya (Accounting)** — no Marketplace in the rail; `/marketplace` is the gate.
- **390 / 320 / 768 touch** — one-row bar (glyph search, "Popular ▾"), two cards a row, the deal as a bottom sheet, the brand's pictures as a
  strip, no sideways scroll.

## Probes run (lane B, `next start -p 3170` on fresh repaired copies of base.db)
| Probe | Tally | Note |
| --- | --- | --- |
| `pending-modules/verify-pm2-s24.cjs` (new) | **132 / 132** | nine sections: the rail and the directory (counts, categories, the three sorts, Show more, search, "/", the ⋮, WhatsApp), Deals (flash first, the dialog, Get deal by WhatsApp · email · the brand's page, the asks on record, `?deal=`, an ended deal), banners (window, deal, brand), the brand page (every card from the record), Add to my vendors (made, linked not doubled, Finance's panel and back), Add to Price book (Owner live · Designer proposed · Admin sees · Choices offers it), Maison AI (answers, a proposal that runs the press), ⌘K, Accounting, the withdrawn brand, 390 · 320 · 768 touch, the ghosts measured against the pages at 1440 and 390 |
| regression `pb-modal` · `pb-r1` · `pb-r2` · `pb-r3` · `pb-r4` | 18 · 18 · 41 · 30 · 32 (all green) | the Price book (a new column, items made through its create) |
| regression `search` · `ux-p7` · `kb-r1` · `kb-r2` · `view-as` · `cr-r1` | 27 · 89 · 35 · 29 · 23 · 59 | ⌘K (a new kind, a new page), the dock / More (updated as a deliberate change), keys, the rail |
| regression `ghosts-same` · `ghosts-same-390` · `ghosts-measure` · `first-run-ghosts` · `first-run-empty` · `panel-order` | 54 · 54 · Δ 0 · 15 · 89 · widths hold | the three Marketplace pages joined ghosts-same (0.00% differ); the shell's seed gained two keys |
| `pending-modules/verify-pm2-s12.cjs` · `verify-pm2-s16.cjs` | 72 / 72 · 56 / 56 | S12's vendors / book; S16 updated as a deliberate change (Marketplace live, Dashboard still Soon) |
| `projects/verify-pj-r8.cjs` · `projects/verify-pj-gap-f1.cjs` · `parity-map-build/verify-pm-i.cjs` | 67 / 67 · 85 / 85 · 54 / 54 | Choices · POs and vendors · Accounting's rail |
| `npm run design:anatomy` (the Marketplace's three pages added) | 1699 measures hold | 79 pages, 269 table heads, 24 dialogs, 41 page menus |
| `npx tsc --noEmit -p .` · `npx eslint app components lib` · `npm run design:lint` | clean · 0 errors (the 16 old warnings) · nothing new | — |

## Migration and repair
- **Migration 0099 (lane)** `drizzle/0099_marketplace_s24.sql`, additive and schema-only: `marketplace_categories` · `marketplace_brands` ·
  `marketplace_deals` · `marketplace_products` · `marketplace_banners` · `marketplace_deal_asks`, `price_book_items.marketplace_product_id`,
  `vendors.marketplace_brand_id`. All six tables are in `BASELINE_TABLES` and the snapshot's `TABLES`; `restoreBaseline` moves deals' and
  banners' windows with the demo day (an ask keeps its day). **If main holds a 0099 from lane A, the land script regenerates this one.**
- **Repair R141** (the demo feed through the feed's mapper, dated from the demo day — re-run, it is the feed's sync; Floor Xpert Pte Ltd linked
  to its brand; My Items' vinyl flooring linked to Floor Xpert's product; Dane's WhatsApp ask for Oak & Linen's sofa deal five days ago;
  dangling links and asks let go; every picture checked to be the app's own file; six closing checks). **R142 is the next free in lane B's
  range.** The baseline fixture is the orchestrator's (`db:baseline`) — until it is rebuilt, a Reset to base empties the Marketplace (the new
  tables are in the list, the old fixture has no rows for them).
- **Assets**: `public/marketplace/**` (65 files, 2.0 MB — 14 rooms, 25 product squares, 9 deal pictures, 3 banners, 14 SVG monograms), made by
  `scripts/marketplace/gen-assets.mjs` from `public/visualizer/samples`.

## For the next steps
- **S25 (Market Insights)**: Tools › Market Insights is the last Soon tile (pm2-s16 asserts it by name); the Marketplace's banner strip
  (`components/marketplace/banners.tsx`) is a ready shape if insights want a featured row.
- **S22 (Dashboard)**: a "deals ending soon" or "new on the Marketplace" tile can read `fetchMarketplace()` (`lib/marketplace/queries.ts`).
- **S31 (a new studio)**: a "listed on Qanvast" record would let the rail hide the Marketplace for a studio that isn't, if she wants 1.0's
  feature-flag behaviour back.
- **S34 (real services)**: Qanvast's brand feed plugs into `feedStatements(rowsFromFeed(payload), now)` (the 1.0 API shapes are typed in
  `lib/marketplace/feed.ts`); the asks (`marketplace_deal_asks`) are what the feed would report back as 1.0's lead count; a CDN picture's size
  suffix is `feedPicture`.
- **UAT (the orchestrator's)**: a Marketplace step fits the studio's first day — "Find a kitchen brand, ask for its deal on WhatsApp, add it to
  your vendors and its worktop to the Price book" (Dane), and "propose a paint for My Items" (a Designer).
- **The land**: `lib/global-search/model.ts` gained the `brand` kind (after `meeting`) and a Go to row; `lib/ghost-shapes.server.ts` two keys;
  `lib/nav.ts` `fromLabel` `/marketplace`; expect small merges there if lane A touched them.

## Shared pieces changed
- `components/shell/app-rail.tsx`, `components/shell/mobile-nav.tsx` (the Marketplace's `href`).
- `components/finance/vendor-panel.tsx` (one fact: *Marketplace — See it on the Marketplace*), `lib/finance/model.ts` · `queries.ts`
  (`VendorRecord.marketplaceBrandId`).
- `lib/global-search/{model,queries}.ts` (kind `brand`, label Marketplace, a Go to page), `lib/nav.ts` (`fromLabel`), `lib/ghost-shapes.server.ts`
  (`marketplace` · `marketplace.banners`), `lib/db/{schema,baseline}.ts`, `scripts/snapshot-baseline.ts`, `scripts/repair-demo-data.ts` (R141),
  `scripts/design-anatomy.mjs` and `design-source/verify/ghosts/verify-ghosts-same.cjs` (the three pages on their lists).
- Probes changed as deliberate changes: `pending-modules/verify-pm2-s16.cjs`, `ux-build-2026-09-30/P7/verify-p7.cjs`.
- No `components/om/*`, shell frame or `app/globals.css` change. (An empty `local.db` my first build left in the lane was removed — builds now
  name their scratch DB.)

## Flags for Vicky
- The whole module has **no mock** — every screen is on house pieces and logged (REG-S24.1…11); please review the pages in
  `design-source/verify/pending-modules/pm2-s24/`.
- **Banners don't turn on their own** (1.0 did, every 4 s).
- **Every studio sees the Marketplace** (1.0's platform default had the flag off).
- The demo brands are invented, their web addresses are `.example` (a press opens a page that doesn't exist); **Most reviews** sorts by a count
  shown only on a brand's page ("128 reviews on Qanvast").
- A product reaches Choices only through the Price book (no "Offer to a client" on the product).

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mock draws the Marketplace; every screen is the smallest thing on the house pieces, logged
   with its invented words (REG-S24.1…11); the decisions are flagged above.
2. **One system, no one-offs** — the L1/L2 headers, the tab toolbar's row, the house chips and chip rail, the scope pill and PortalMenu, the
   house search, the gallery's card (composed, never copied), the lead Overview's Card, the house square, Dialog, EmptyState, RouteError, the
   ghost kit, the edge pagers, MetaChip, the house snackbar; tokens only — `design:lint` holds.
3. **Plain words for studio people** — "Add to my vendors", "Add to Price book", "Get deal on WhatsApp", "Ends in 3 days", "In your vendors",
   "Not in your vendors yet", "Showing 12 of 14 brands".
4. **Nothing is lost** — nothing here removes; a brand the feed withdraws keeps its row so a vendor or an item from it still points at it; the
   Price book's own History and Deleted sheet hold the items; asks are kept.
5. **Say why** — a refusal answers `{ error }` and the snackbar names it; a deal that ended or hasn't started says so; another Designer's
   proposal is named in the row; the dialog says the brand joins the vendors before the press.
6. **Back returns where you came from** — every door carries `?from=` (cards, banners, ⌘K, Finance, the Price book); the page's view lives in
   its address, so Back lands on the same category, sort and Show more.
7. **Every screen is whole** — the shell, a `loading.tsx` and `PageReveal` drawing the same ghost (measured), the error page, the feed's empty
   card, the brand notice, Maison AI's suggestions; the probe's page-error log is empty.
8. **Every width is designed** — 1440, 1024 (one column of cards), 768 touch, 390 and 320 checked against `screen.width`; one-row bar, two
   cards a row, bottom sheets, the pictures' strip.
9. **Tables follow the leads listing** — no table here; the gallery cards are the house gallery's.
10. **Motion with purpose** — no new motion beyond the house hover and the dialog; the banners never move on their own.
11. **Honest data** — every state is a record (R141: the feed's copy, the vendor link, the item link, the ask); the catalogue is labelled a
    demo stand-in; nothing pretends to buy or redeem.
12. **Reach for everyone** — real links and buttons with names (a cut deal ribbon says itself on hover), the cards a walkable list
    (`data-kb-list` / `-row` / `-open`), "/" reaches the search, the sort a radio menu, every icon-only control has its tooltip.
