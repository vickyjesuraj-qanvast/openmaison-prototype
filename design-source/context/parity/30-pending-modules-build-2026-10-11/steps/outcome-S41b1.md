# S41b-1 · Cost and margin visibility per role — outcome (2026-10-13, lane B)

Found by the S41b data sweep (`s41b/sweep-data.md` § M-03, rows 788 · 956): 1.0's Qanvast line lets the Owner switch cost price, mark-up and
margin off per role; 2.0 tied cost figures to the role and always showed a Designer a quote line's cost and mark-up. 1.0 read in full on
`origin/deployment/qanvast`: `docs/features/cost-visibility/spec.md`, `src/lib/cost-visibility.ts` (config · `canViewCostForTags` · the omit
helpers · `COST_RESULT_KEYS`), `src/lib/quote-cost-restore.ts` (`mergeStoredCost` · `mergeStoredPackageCost`),
`src/app/api/studio-config/cost-visibility/route.ts` (GET · owner-only PUT), `src/app/(main)/accounts/cost-visibility-tab.tsx` (the screen), and
the 59 files that call `callerCanViewCost` / `useCanViewCost` (listed by `git grep`; the PO dialog read for its one gated line, Margin Impact).

Register rows: `steps/reg-S41b1.md` (REG-S41b1.1…9). Probe: `design-source/verify/pending-modules/verify-pm2-s41b1.cjs` (**110 / 110**, twice in
a row); shots in `design-source/verify/pending-modules/pm2-s41b1/` (11: the card as Owner 1440 · 390 and as Admin, a Designer's 768 touch;
the editor, an item and a PO for a hidden Designer; Reports for a hidden Admin; the three pages at 390).

## Ledger — every place a cost, mark-up or margin can show, and its status

"Hidden" = a member whose role is switched off is sent none of it (the server) and the screen leaves its place out. **D** = Designer · Manager
switch; **A** = Admin; **Ac** = Accounting. The read is `fetchViewer()` (`Viewer.costs`) → `seesCost` · `seesProfit` (`lib/settings/cost-visibility.ts`).

| Place | Status | How (files) |
| --- | --- | --- |
| **Quote editor** — the loader's lines, Add Item's book, My Sections, the last kept version (`prevLines`), Version History's snapshots | hidden (D · A) | `lib/quotes/editor.ts` → `lib/quotes/cost-sight.ts` (`linesFor` · `bookItemsFor` · `sectionFor` · `snapshotFor`); `costs` on `QuoteEditorData` |
| — the Owner's rebate on every line | Owner only, on the server now (REG-596) | `pricedFor` (`rebate` sight = `seesRebate`) |
| — Cost · Markup · Margin columns, their Column settings rows, the sum row's figures, Fill on them | hidden | `items-section.tsx` (`COST_COLUMNS`), `column-settings-drawer` `hidden` |
| — *Below cost* tag (row and phone card), the phone sheet's Cost / Markup boxes | hidden | follow the Cost column (`item-row.tsx`, `item-cards.tsx`) |
| — *Set a value*'s Cost (S$) and Markup (%) | hidden (opens on Unit Price) | `set-value-dialog.tsx` `costs` |
| — totals card's *Margin · owners only*, By category's *Share · Margin* | Owner only (as before — an Owner always sees costs) | `items-summary.tsx` (unchanged) |
| — Maison AI sheet: below cost · thin margin · one markup across the lines · "Check the margins" | hidden ("no price yet" and *Match lines — link them* stay) | `use-quote-maison.tsx` `costs` |
| — *Match lines* review (S12): each item's cost, the margin it leaves, *Below cost* | hidden (says the item's price; the server still writes the item's cost) | `match-book-dialog.tsx` `costs`; `lib/quotes/book-fill.ts` unchanged |
| — Export Items (CSV · XLS · XLSX · PDF) and Copy (⌘C) | no Cost · Markup columns | `lib/quotes/clipboard.ts` `exportCells` |
| — Paste from a sheet | no Cost · Markup fields; a guessed cost column is the price | `paste-items-dialog.tsx` `costs`; `createQuoteItems` |
| — every items action that answers lines or book items | hidden | `app/quotes/items-actions.ts` (`seen` · `bookItemFor` · `sectionFor`), `applyTemplateDefaults` (`app/leads/quotes-actions.ts`) |
| — writes: a cell, Fill, Set a value, Round Prices, Undo / ⌘Z, a removed line brought back | keep the stored cost and rebate | `updateQuoteItem` (`keptCostPatch`), `replaceQuoteItems` (`withKeptCost` + `kept_line_costs`), `lib/quotes/kept-costs.ts` |
| — Draft with Maison AI, a My Items pick, a saved section inserted, Duplicate, Match, a version restored | server-side (true costs; answers projected) | unchanged writers, projected answers |
| **Preview** (and a kept version `?version=n`) — the lines' record, *Internal copy* (Cost · Selling · Margin) | hidden | `app/(editor)/quotes/[quoteId]/preview/page.tsx` → `docDataFor`; `quote-preview.tsx` `costs`; its ghost (`preview-skeleton.tsx`) |
| **Template editor › Preview with** — the page's and `loadQuoteDocData`'s document data | hidden (and Who sees leads, REG-S41b1.8) | `fetchQuoteDocDataForViewer` (`lib/templates/queries.ts`) |
| Client pages (`/confirm`, `/sign/<t>/quote`, `/quote/<t>`, the portal) | never carry cost, whatever the setting (S04's `clientQuoteOf`) | unchanged |
| **Company › Price book** — My Items' and My Sections' loaders (items, deleted items, sections' lines) | hidden (D · A) | `lib/company/price-book.ts` (`bookItemFor` · `sectionBodyFor`; `costs`) |
| — Cost · Markup columns, the ghost, the export, bulk *Set markup* (refused on the server too) | hidden | `price-book-items.tsx`, `price-book-ghost.tsx`, `bulkUpdatePriceBookItems` |
| — the item dialog: Cost · Markup → one **Unit price (S$)** | hidden | `item-dialog.tsx` `costs` |
| — History: Cost / Markup lines → one **Unit price** line | hidden | `fetchItemHistory(id, sight)` (worked back from the item), `changeLine` `price` |
| — writes: edit, approve with edits, import (update · new), Bring back, Undo of Save to My Items, a section's lines | keep the stored cost; new entries take the price as a price-only row | `writeItem` (`sent` · `stored`), `createPriceBookItem`, `updatePriceBookSection` (`sectionWithKeptCosts`) |
| — Waste % (S12) | **kept visible** — an ordering share, no money; it says nothing of the cost |  |
| Marketplace *Add to Price book* · Choices *Save to the Price book* | one Unit price box; price-only on the server | `add-product-dialog.tsx`, `save-option-dialog.tsx`, `createPriceBookItem` |
| **A project's Money** — the quote's lines a PO takes (`context.quoteLines`) | no cost for D (they enter the vendor's price) | `fetchProjectCosts` (`lib/finance/queries.ts`); `po-dialog.tsx` `viewer.costs` |
| — *Order from the quote* (Draft POs at the quote's costs) | not offered to D; refused by the server | `project-costs.tsx` `fromQuote`; `app/finance/order-from-quote-actions.ts` `ORDER_COST_HIDDEN` |
| — POs · bills · expenses · payments out, their amounts, To pay, cost totals, vendors' balances | **kept** — procurement records (1.0: "POs themselves still show vendor amounts") | unchanged (`seesCostFigures` = the books) |
| — a PO's margin against the quote ("the client pays …", the PO panel, To do and Needs you's "leaves n% against the quote") | hidden (A · Ac) | `seesPoMargin` → no `quoteLines` facts → `againstQuote` null; `po-dialog.tsx` `viewer.margins` |
| — the Profit tile, *What the numbers say*, closing margins at handover | hidden (A · Ac; D never) | `fetchProjectBooks`, `closingNumbers` → `seesProfit`; money ghost's tile count |
| **Overview's Money card** profit · **Projects listing** Margin column | hidden (A · Ac) | `lib/projects/queries.ts` → `seesProfit`; `projectColumns(…, margins)` |
| **Company › Finance** (To do, Money in / out, Vendors, Commission, Xero) | records kept; margins hidden as above; the books' payload carries no profit | `fetchBooks` (`withoutProfit`) |
| **Reports › Finance** — Profit and loss · Profitability (and their exports), the thinnest-margin answer | closed (A · Ac); the other eight reports stay | `reports-view.tsx` (`PROFIT_REPORTS`), `books-ghost.tsx` |
| — Commissions (a *% of the profit* rule's earned figure) | **kept** — payroll that whoever pays it needs; 1.0 never hid commission |  |
| **Dashboard** — Profit this month (and its "Margin n% on …") | hidden (A · Ac) | `lib/dashboard/queries.ts`, `tileLabelsFor(role, costs)`, the ghost |
| **Maison AI's Ask box** — margin and P&L intents; a client's quote ("below cost", "under a 10% margin") | "Profit and margin are hidden for your role"; the quote answer names no cost lines | `lib/maison-ai/answer.ts` (`PROFIT_HIDDEN`), `answers/work.ts` `quotesAnswer`, `askChips` `profit` |
| **Quote X-Ray** "your rate" | **no cost there** — your side is the quote's selling lines (`lib/xray/lines.ts`) | unchanged (checked) |
| **AI Visualizer** — *Add to a quote* | **no cost there** — the book's cost is copied on the server, the answer is counts | unchanged (checked) |
| **⌘K** — Price book hits, Finance hits | **no cost there** (name, category, vendor; PO / bill totals are records) | unchanged; + a door to the card |
| Notifications, emails, WhatsApp | **no cost there** (item names, PO totals) | unchanged (checked) |
| Variation orders — upload, a pick on Choices and its Undo | price-only for D; the pick's Undo keeps the line's cost on the server | `createVariationFromUpload`; `chooseForClient` · `undoChoosePick` (`kept_line_costs`) |

## Pending lines ledger (the sweep's M-03 and rows 788 · 956, word for word)

| Line | Status | Where |
| --- | --- | --- |
| "`studio-config/cost-visibility` GET·PUT (qanvast) — **Cost & Margin Visibility** (qanvast line): the Owner switches cost price, markup and margin off per role (Admin · Designer · Accounting)" | **built** | Settings › Roles & access › Who sees costs and margins (REG-S41b1.1); the read is `fetchViewer` / `fetchCostVisibility`, the write `setCostVisibility` (Owner only) |
| "every route strips cost for hidden members" | **built** | the ledger above — every loader and action that answers a line, an item, a section, a version, a document or the books |
| "and keeps the stored cost on their saves" | **built** | REG-S41b1.4 — the write rule and `kept_line_costs` |
| "`studios.settings.cost_visibility` (qanvast)" | **built** | settings key `cost_visibility`; 1.0's `{ admin, id, accounting }` reads as is (`id` → Designer and Manager) |
| M-03 "Owners always see them" · "a member with no known tag sees no costs" | **built** | `seesCostsAs`: Owner always; an unknown role never |
| M-03 "Every read strips cost — quote lines, versions, packages, templates, the price book and its history, tiers, vendors' default markup, the CSV export, the finance P&L / profitability / margin reports, the AI tools" | **built** for every one 2.0 has (packages = My Sections; templates carry no lines in 2.0; **tiers and vendors' default markup don't exist in 2.0** — nothing to strip) | ledger |
| M-03 "every save keeps the stored cost a hidden member never saw" | **built** | REG-S41b1.4 |
| 1.0's spec "Default: all on. Studios see no change until an owner switches a role off" | **built** — no setting row = every role on; the demo has none (probe: a Designer's quote at the defaults still carries its cost and its Cost column) | |
| 1.0's spec "Homeowner / public (always, whatever the setting)" | **built before** (S04's `clientQuoteOf`) — confirmed unchanged | |
| 1.0's spec "`useCanViewCost()` is false while loading, so costs never flash" | **built** — 2.0 renders on the server; nothing reaches the page to flash. The ghosts draw no cost column for whoever doesn't see costs (`role.costs` seed) | |
| 1.0's spec "the setting takes effect … on the next data fetch (cached 60 s in the browser)" | **built, better** — read on every request; the switch revalidates every page | |
| 1.0's spec "A failed settings read falls back to everyone sees cost. A failed or missing member read denies" | **built** — a bad or missing row reads as the defaults; an unknown role sees none | |
| 1.0's known limitation "a package line with no price-book link, applied by a hidden member, arrives without cost" | **better** — a saved section is inserted on the server with its stored costs, whoever inserts it | |
| 1.0's known limitation "POs themselves still show vendor amounts … only the margin variance is hidden" | **kept** (1.0's rule) — and **Order from the quote** is not offered to a member who doesn't see costs: 2.0 prices its Drafts at the quote's costs, which 1.0's never did | REG-S41b1.7 |

## Found in 1.0, not on a card
- **Pricing tiers** (`pricing-tiers` PUT keeping each tier's cost), **per-vendor prices** (`price-book/vendor-prices`, migration 425) and the
  **vendor markup tool** (`vendor-markup` → 403) — 2.0 has none of the three (the same product from two vendors is two My Items entries,
  REG-594; a vendor carries no default markup). Nothing to port; listed for S41b's ledger.
- **Saved "Thin Margin" AI suggestions on a line** (`aiSuggestion.type === "margin_warning"`) — 2.0 keeps no suggestion on a line; its
  margin hints are worked out live and are hidden (above).
- **`finance/margin-analysis`** and **`finance/export (pl)`** — 2.0's are Reports › Profitability and its Export, closed with the reports.
- Nothing else in the cost-visibility files is outside this card.

## Decisions (as recommended — her "please make sure nothing left behind from 1.0 to 2.0" 2026-10-12, and the step's brief)
1. **One home: Settings › Roles & access**, between Who sees leads and Who may do what (the brief's place; it governs every role's screens).
   Not Quotes & pricing (it reaches the books too).
2. **Four switches** (Admins · Managers · Designers · Accounting), not 1.0's three — 2.0's Manager is its own role and its own column in the
   table beside it; 1.0's manager followed the designer's tag, so a 1.0 `id: false` switches both off.
3. **Defaults: every role on** (1.0's) — a studio that never opens the card loses nothing and sees no change.
4. **Owner only** to change (1.0's), refused on the server with its rule; Admins read it like every other member.
5. **The projection folds the cost into the price** (cost 0 · mark-up = the unit price) rather than dropping the fields — 2.0's line IS cost +
   mark-up, so every total, sort, Fill and Round Prices keeps working unchanged in the browser, and nothing about the cost is sent.
6. **A hidden member moves only prices; their new lines' price sits in the cost** (the paste's convention), so Match lines and the Owner's
   eye still find them as "cost not known".
7. **Admins' and Accounting's switches also close the books' profit and margin** (1.0 hid P&L, profitability, margin alerts, the overview's
   average margin); the books' records, totals and balances stay (1.0's).
8. **Order from the quote** is not offered to a member who doesn't see costs (its Drafts would carry every line's cost); *Add from the quote*
   stays, with the vendor's price to enter.
9. **Waste %** and **Commission** stay visible (an ordering share; payroll) — neither gives the quote's cost away.
10. **Kept costs for Undo**: a small table, not a signed token in the page — a server key may be absent and a token would ride in the page.

## What to check in the browser (production build; View as switches roles; 1440 and 390)
- **Dane (Owner)** › Settings › Roles & access: *Who sees costs and margins* after Who sees leads — Owners always (fixed), four switches on.
  Switch **Designers** off → "Designers don’t see costs and margins now · Undo"; Who may do what's *See a quote line’s cost…* row says No for
  Designer. Switch Managers, Admins, Accounting off too to see their sides.
- **Germaine (Designer)** › a quote (Olivia Martinez's): no Cost · Markup columns, Column settings without them, Set value without Cost /
  Markup (%), Export As without them, Maison AI without margin hints; change a unit price — the Owner sees the cost unchanged; Remove a line and
  Undo — its cost comes back. Preview: no Internal copy. Company › Price book: no Cost · Markup; an item opens with one Unit price; its History
  says "Unit price". Benjamin Han's project › Money › New: no Order from the quote; Purchase order › Add from the quote: lines and quantities,
  no prices.
- **Hui Min (Admin)** with Admins off: the card read-only with "Only the Owner changes…"; Reports › Finance opens on Owed to you without Profit
  and loss / Profitability; the Dashboard has no Profit this month; a project's Money has To collect and To pay only; Maison AI › "Which projects
  have the thinnest margins?" → "Profit and margin are hidden for your role"; the Projects listing's Column settings has no Margin.
- **Priya (Accounting)** with Accounting off: Reports without Profit and loss / Profitability, the Dashboard without Profit.
- Switch everything back on — everyone's screens are as before.

## Probes run
All on the lane's production build (`DATABASE_URL=file:<scratch>` on the build, under the lock), each against a fresh copy of `pbuild/base.db`
migrated (0109) and repaired, port 3170; every probe puts back what it changes (checked: no setting row, no kept costs, Dane is you).

| Check | Result |
| --- | --- |
| `tsc --noEmit` · `eslint app components lib` · `design:lint` | clean · 0 errors (16 warnings, all older) · nothing new breaks a house rule |
| `next build` · `design:anatomy` (87 pages, 271 table heads, 26 dialogs, 41 page menus) | exit 0 · **all 1721 measures hold** |
| **`verify-pm2-s41b1`** (this step) | **110 / 110**, twice in a row |
| pure rules (`cost-sight.ts` · `cost-visibility.ts`, a scratch tsx run: projection, the write rules, the section merge, 1.0's `id` key, Owner always, unknown never) | 14 / 14 |
| `quote-editor-parity` qe-r1 · r2 · r3 · r4 · r5 (regression runner) | 34 · 33 · 21 · 14 · 21 — all green |
| `price-book-parity` pb-r1 · r2 · r3 · r4 · `pb-modal` | 18 · 41 · 30 · 32 · 18 — all green |
| `verify-pm2-s04` · `s07` · `s12` · `s14` · `s22` | 82 · 89 · 72 · 69 · 116 — all green (s14: one assertion changed, below) |
| `projects/verify-pj-gap-f1` · `f2` · `parity-map-build/verify-pm-i` · `verify-pm-c` · `simplify…/verify-ks` | 86 · 84 · 54 · 36 · 29 — all green |
| `settings-parity` st-r1 · r2 · r3 · `tpl-parity` · `sw-r5` · `view-as` · `search` · `folders-galleries` | 57 · 30 · 30 · 20 · 33 · 23 · 27 · 44 — all green |
| `ghosts-same` (1440) · `ghosts-same-390` | 66 · 66 — all green |

**One assertion changed** (commented `(pending modules, a deliberate change of this rule)`): `verify-pm2-s14` — a Designer's Roles & access
now carries two read-only lines (the module's, and Who sees costs and margins' own — the Owner's alone); it asserts both and the module's words.

## Migration · repair
- **Migration 0109** `drizzle/0109_s41b1_cost_visibility.sql` (generated, schema-only): `kept_line_costs` (+ its index). Added to
  `BASELINE_TABLES` (`lib/db/baseline.ts`) and `TABLES` (`scripts/snapshot-baseline.ts`); the fixture needs no rows.
- **No repair** (R146 stays free): the setting's absence is 1.0's default.

## Shared pieces changed
- `lib/leads/visibility.ts` `fetchViewer()` reads one more settings row and sets `Viewer.costs` (`lib/leads/assign-policy.ts` type).
- `lib/finance/rules.ts`: `seesCostFigures` is unchanged in meaning (the books); new `seesPoMargin`. `lib/finance/profit.ts` + `withoutProfit`.
- `lib/ghost-shapes.server.ts` seeds `role.owner` and `role.costs`; `app/(editor)/layout.tsx` seeds `role.costs` for the editors' ghosts.
- `lib/quotes/clipboard.ts` `exportCells`; `lib/quotes/items-model.ts` `COST_COLUMNS`; `lib/company/price-book-changes.ts` `PRICE_FIELD`.
- `lib/settings/permissions.ts` (one row added, two rows' words), `lib/settings/copy.ts` (`WHO_MAY_HELP`), `lib/global-search/model.ts` (one row).
- No `components/om/*`, shell or `app/globals.css` change.

## For the next steps
- **Any new screen or action that shows or answers a cost** reads `seesCost(viewer)` / `seesProfit(viewer)` and sends lines through
  `lib/quotes/cost-sight.ts`; a write from such a member goes through `keptCostPatch` / `withKeptCost`.
- **S42**: the ghost of a project's Money places its Needs you band by the remembered shape (REG-817) — a fresh browser's ghost draws no band
  while the page has one (older than this step; the tile count now follows the role).
- **For Vicky**: four switches (Manager its own) rather than 1.0's three; Waste % and Commission kept visible; Order from the quote not
  offered to a member who doesn't see costs; the help lines' words.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock (1.0's tab is the job, not the look); built on Roles & access' own cards, the
   house card table (REG-727) with the DS `sm` Switch, `ReadOnlyNote`, the snackbar with Undo; every invented line is in `reg-S41b1.md`.
2. **One system, no one-offs** — one setting, one read (`fetchViewer` → `seesCost` · `seesProfit`), one projection (`lib/quotes/cost-sight.ts`)
   and one write rule for every quote line, book item, section and document; the screens hide by the same flag; the card's stylesheet holds only
   its two tracks; Who may do what's rows read the same functions; `design:lint` holds (no baseline raised).
3. **Plain words for studio people** — "Who sees costs and margins", "Sees costs", "Owners always see them", "Designers don’t see costs and
   margins now", "Unit price (S$) — what a quote line starts at", "you enter each vendor’s price on the PO", "Profit and margin are hidden for
   your role".
4. **Nothing is lost** — a switch answers one sentence + Undo; a hidden member's every write keeps the stored cost and rebate, a removed line
   brought back keeps them (`kept_line_costs`), their own column choices are kept for when the switch comes back; the setting's absence loses
   nothing (1.0's default).
5. **Say why** — the card's rule line for anyone but the Owner; the server's refusal named in the snackbar and the switch put back; Order from
   the quote's and Set markup's refusals name the rule; Maison AI says where the switch is. A column that is gone, a missing Margin line or a
   closed report needs nothing (the brief).
6. **Back returns where you came from** — no new page; ⌘K's door lands on the card (`#cost-visibility`); the Who may do what rows link to it in
   the page.
7. **Every screen is whole** — every ghost the change touches draws the page as it now looks: Roles & access with the card (Owner, and a
   Designer's with its rule line — measured at 1440 and 390), My Items without Cost · Markup, Preview without Internal copy, Reports opening on
   Owed to you, a project's Money with the role's tile count, the Dashboard's tiles; the page error log is empty.
8. **Every width is designed** — 1440 · 1024 · 768 touch · 390 · 320 probed on Roles & access, the quote editor and the price book; at 390 the
   card stacks each role with its labelled switch inside the card; no sideways scroll against `screen.width`.
9. **Tables follow the leads listing** — the lists that lose columns are the listing's model (the Items grid, My Items, Projects); the card is
   the house card table (a three-row list in a card).
10. **Motion with purpose** — none added.
11. **Honest data** — nothing is faked: a hidden member's payload folds the cost into the price (every figure they see is real), the books
    leave profit out rather than show a wrong one; no demo state is invented (no repair — the defaults are 1.0's).
12. **Reach for everyone** — every switch has its own label ("Designers see costs and margins"; the Owners' "Owners always see costs and
    margins", disabled), the card table carries its roles (`role="table"`, column heads, cells), the read-only state is the house fieldset;
    keyboard reaches each switch in order.
