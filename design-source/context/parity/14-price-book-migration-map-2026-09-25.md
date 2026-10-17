# Price book — the 1.0 → 2.0 migration map (for the devs)

Written 2026-09-25 at the end of the price book parity rounds (REG-651…655). It says, for every 1.0 store, column and rule a studio's price
book touches, where the same thing lives in 2.0 and which round put it there — so a port script and the code after it have one place to
look. The audit (`13-price-book-1.0-to-2.0-audit-2026-09-25.md`) holds the reasoning and the 18 calls (§6); inventory D
(`price-book-1.0-inventory/D-data-model.md`) holds the column-level diffs (D-60…D-165) and the full port plan (D-170…D-248), written before
the rounds — where this page and D disagree, this page is the one that follows the build. This page is the short map.

Conventions: 2.0's data is Drizzle over libSQL (`lib/db/schema.ts`); money is integer cents as **cost + markup** (the unit price derived);
times are unix seconds; people are `members.id`; every write is a server action in `app/company/price-book-actions.ts` (the book) or
`app/quotes/items-actions.ts` (a quote's side), gated by `lib/company/price-book-rules.ts`. Rounds: **R1** numbers you can trust (REG-651)
· **R2** who may change the book (REG-652) · **R3** items and sections that carry everything (REG-653) · **R4** imports, exports and the list
(REG-654) · **R5** this map (REG-655).

## 1. Where each 1.0 screen lives

| 1.0 (Accounts › Price Book, `?pb=`) | 2.0 | Round |
|---|---|---|
| Items — the table, search, category filter, Active / Archived, grouping by category, drag to reorder | **Company › Price book › My Items**: cards or the listing-model table; search over name · description · category · vendor · kind; kind segments; *Filters* (Category · Vendor, applied as picked); sortable heads; no drag (the book sorts, a category is set) | R4 |
| The item editor (side panel) | the item dialog: name, formatted description, kind, unit, cost + markup (the unit price shown), category (a trade), vendor, product link, photo; read-only for a member who doesn't run the book; its **History** | R1 · R2 · R3 |
| Pending tab · approve · reject | the **Proposed** segment and chip; *Approve* / *Send back…* in the kebab and the dialog's proposal bar; the bell | R2 |
| Drift tab (market rates) | — (the platform's) | — |
| Imports tab — CSV in the browser, PDF / image / Excel through a model | New ▾ › *Import from a spreadsheet…*: a CSV or XLSX file, or pasted rows; the column mapping (Kind included); each row matched by name and vendor | R4 |
| Export CSV | the page kebab › *Export My Items…* — every item or what the list shows (CSV, XLSX) | R4 |
| Bulk: archive · restore · move to category | the list's selection: *Set category* · *Set vendor* · *Set markup* (a % of cost, re-pricing) · *Delete* | R4 |
| Vendor default markup | *Set markup* on the vendor's items (Filters › Vendor, select all) | R4 |
| Packages (Accounts › Quotes & Pricing) | **Company › Price book › My Sections**; a quote section's *Save section to My Sections*; the Add Item box's My Sections | R3 |
| The quote line's *Item Name* typeahead · *Browse price book* | the Add Item box: every item, found by name · description · category · kind · vendor, sections on the same keyboard walk; *Add Item › From My Items…* lands a pick where the row asked | R3 |
| *Also save to price book* on a new line | a line's menu: *Save to My Items* (a Designer: *Propose to My Items*); on a line from an item, *Update the item from this line* or *Save as a new item* — each with Undo | R2 · R3 |

## 2. Stores

| 1.0 | 2.0 | Notes | Round |
|---|---|---|---|
| `studio_price_book` | `price_book_items` | one row per vendor (D-158); `name` · `description` (plain) · **`description_html`** (formatted, through the contracts' allowlist) · `kind` (design · fee · labour · delivery · purchase — D-140) · `unit` · `cost_minor` · `markup_minor` · `category` (a trade's name) · `vendor` (a name) · **`link`** (http / https, `cleanLink`) · `thumb` (a data URL or a served path) · `created_at` · `updated_at` · `deleted_at` · **`status`** (`live` · `proposed`) · **`created_by` · `updated_by` · `reviewed_by` · `reviewed_at` · `review_note`** (migrations 0050 · 0051) | R2 · R3 |
| `unit_price` + `cost_price` + `markup_percent` | `cost_minor` + `markup_minor` | D-152: `cost_minor = round(C × 100)`, `markup_minor = round(S × 100) − cost_minor`; a sell with no cost → the cost is the sell, no markup (2.0's paste rule), listed in the port log; `markup_percent` is never copied (its meaning varied by writer, D-31) | R1 |
| `is_active` false (archive; a rejection too) | `deleted_at` (Deleted Items, restorable) | `deleted_at` = the row's `updated_at`; a rejected item lands deleted with its note in `review_note` and a `sent_back` history row | R2 |
| the approval columns + `PriceBookItemApproval` tasks + `workflow.approvers.priceBookApproval` | `status = 'proposed'` + `created_by` (the proposer) + the bell (`notifications` kind `price_book_proposed` · `price_book_answered`) | a pending 1.0 item lands `proposed` with its proposer; the approver list is not ported — Owners and Admins approve | R2 |
| `price_book_history` | **`price_book_changes`** (`id` · `item_id` · `kind` created · imported · edited · approved · sent_back · deleted · restored · `changes` JSON `{ field: [before, after] }` real changes only · `note` · `by` · `at`) | 1.0 logged every field as changed "from —": port only the rows whose price figures really moved, as `edited` with `changes.costMinor` / `markupMinor`, and one `imported` row per item noted *Ported from 1.0* | R2 |
| `price_book_pricing_tiers` | — | not built (Q-06): each item's bands are listed in the port log; a studio prices a break on the line or as its own item | — |
| `vendors` (+ `default_markup_percent`) | `price_book_items.vendor` (the name); *Set markup* re-prices | the directory is Finance's | R4 |
| `price_book_vendor_prices` (1.0 migration 425, the newer branch `deployment/qanvast` 340cbc74f — after this map was first written) | `price_book_items` — **each vendor's own entry** | every (item, vendor) row's cost and sell become that vendor's entry's `cost_minor` + `markup_minor`; a blank side is the item's base price (1.0's `resolveVendorPricing`); the pure mapper `lib/port/price-book-vendor-prices.ts` (`vendorEntries` · `portVendorPrices` · `directoryLookup`, S45C — sample rows in `design-source/verify/pending-modules/pm2-s45c-pure.mts`) | S45C |
| `studio_quote_categories` (as the book's category) | `settings.trades` + `price_book_items.category` | a category outside the trades joins them (`addTrades`); a rename carries items whatever the case (`renameTrade`) | R1 |
| `studio_assemblies` (packages) | `price_book_sections` (`lines_json` = `SavedSection`) + `created_by` · `updated_by` | a line keeps `visibility` · `optional` · `noNumber` · `rebateMinor` · `thumb` · `priceBookItemId` (through the id map), a section `printOneLine` · `printAsText` · `highlight` · `visibility` | R2 · R3 |
| `price_book_suggestions` · `embedding` · `platform_market_rates` · `crowd_rate_signals` · the drift cron | — | the platform's (Q-16) | — |
| bucket `price-book-images` | `thumb` | a data URL (the browser downscales to 480 px) or a path the app serves; a port keeps 1.0's public URL only where 2.0 serves it — else NULL, logged | R3 |
| `sku` · `tags` · `notes` · `waste_percent` · `order_index` · `subcategory` · `source` | — | not ported (Q-08); counted in the port log | — |

## 3. Rules and where they live

| Rule | 2.0 | Round |
|---|---|---|
| Money has cents: "2.80" is S$2.80, "1,500" is S$1,500 | `TextField numeric="money" · "decimal"`, `decimalTyped` · `moneyTyped` (`lib/format.ts`) | R1 |
| The rounding step rounds a price only when it is at least the step, never below cost, and leaves a rate per area or length as typed | `roundToStep(cost, markup, step, unit)` · `isRateUnit` (`lib/settings/types.ts`), at every pick, paste, section insert and grid edit | R1 |
| Owners and Admins change the book; everyone reads it and uses it; a Designer proposes | `runsBook` · `itemChangeBlock` · `itemVisible` · `itemPickable` · `newItemStatus` (pure); `assertRunsBook` · `assertMayChange` on every action; `permissionRows` lists it | R2 |
| A proposal is on its proposer's quotes at once and offered to no one else until approved; approval is a press, never a save | `fetchPriceBookData` and `fetchQuoteEditor` filter; `approvePriceBookItem` · `sendBackPriceBookItem` (a note is required) | R2 |
| Every change is kept: who, when, before → after | `logBookChange` · `diffItem` · `fetchItemHistory`; the words in `lib/company/price-book-changes.ts` | R2 |
| A pick copies the item's name, formatted description, kind, photo, unit, cost, markup (rounded), category, vendor and link, and remembers it; it is refused when the item is deleted or someone else's proposal | `createQuoteItem` | R1 · R3 |
| A line's save names what it does: a new entry, or the item updated from the line (Owners and Admins) — with Undo | `saveItemToPriceBook(id, 'new' · 'update')` · `undoSaveToPriceBook` | R3 |
| A saved section lands with the studio's GST rate and every mark it was saved with | `saveSectionToPriceBook` · `insertPriceBookSection` (`savedLine` · `savedMarks`) | R3 |
| An entry a live quote came from waits in the trash — never deleted for good; usage counts live quotes only | `inUse` in `deletePriceBookItemsForever` · `deletePriceBookSectionsForever`; `usage()` in `lib/company/price-book.ts`; the Deleted sheet's `keepReason` | R3 |
| An import writes at most 500 rows; a row matching a live item (the same name from the same vendor) updates its price, is added as new or is skipped — one choice; a repeat inside the file is dropped | `importPriceBookItems(lines, vendor, onMatch)`; `bookKey` · `IMPORT_LIMIT` (`paste-items-dialog.tsx`) | R4 |
| *Set markup* sets each item's markup to a share of its own cost | `bulkUpdatePriceBookItems(ids, { markupPct })` | R4 |

## 4. The order a studio's price book lands

After the Accounts Setup port (members and the `profiles.id → members.id` map; the trades — map 12) and before the templates' packages and
the Quotes port (map 06), which need the id map:

1. **Classify** — Singapore studios only (D-157); count every store of §2 into the port log; show the owner the × 100 suspects (D-237).
2. **Items** — one `price_book_items` row per vendor (the first vendor's row keeps the 1.0 uuid, the k-th a deterministic id from `(item, vendor)`
   so a re-run is `INSERT OR IGNORE`); prices by §2 — **each vendor's own price where 1.0 kept one** (step 2a); `status` `live`, or `proposed` for a pending item; `deleted_at` for an archived or
   rejected one; `created_by` · `updated_by` through the member map (the studio's first Owner when 1.0 names nobody); `link` from `spec_url`
   (cleaned; else NULL, logged); `description_html` NULL (1.0's specs were plain).
2a. **Per-vendor prices** (S45C) — after Finance › Vendors is ported (its `vendors` rows, merges recorded in `merged_into`), run
   `portVendorPrices(items, vendorPrices, directoryLookup(vendors, idOf))` from `lib/port/price-book-vendor-prices.ts` over the studio's
   `studio_price_book` rows (the category joined to its name) and its `price_book_vendor_prices` rows. It answers the vendor split of step 2:
   one entry per linked vendor (`vendor_ids`, else `vendor_id`; a priced vendor no longer linked is kept too), each keeping the item's name,
   unit and category, its `vendor` the Finance › Vendors name, its cost and mark-up from that vendor's own cost and sell (a blank side = the
   item's base price; D-152 · D-153 · D-155), the ids of step 2. Copy the item's other columns (kind, description, link, picture, status, who,
   folder) onto each entry. Write its `notes` to the port log — `sell-no-cost` · `cost-no-sell` · `no-price` · `rounded` ·
   `vendor-not-in-directory` (the entry lands with no vendor, never a made-up name) · `price-for-unlinked-vendor` · `same-vendor-twice` (two
   1.0 vendors merged into one: one entry, the kept vendor's own price first, as 1.0's `repointVendorPrices`) · `orphan-price`. A quote line
   that named a vendor (map 06) points at that vendor's entry. Nothing visible changes: 2.0 already holds the same product from two vendors as
   two entries (REG-594).
3. **History** — one `imported` row per item (`note` *Ported from 1.0*, `by` = `created_by`, `at` = `created_at`), then 1.0's price edits as
   `edited` rows; a rejected item's note as a `sent_back` row.
4. **Sections** — the packages as `price_book_sections` (templates D-165); each line's `priceBookItemId` through the id map.
5. **Quote lines** — map 06: `quote_items.price_book_item_id` through the id map (the line's vendor picks the row); a link to a missing item lands NULL.
6. **Checks** (§5), then the port log.

## 5. Checks after a port

`npm run db:repair`'s checks that hold for any studio: every item and section names who made it; every item has a History; an item is
`live` or `proposed`, and a send-back note sits only on a proposal waiting in the trash; no History row names a missing item; no rate over
S$500 a square foot. Do **not** run the repair's writes on a ported studio: R23 · R38 · R56 · R57 write the demo's own items, lines and
proposal. Never run `npm run db:baseline` on a ported studio — it would become the demo's base.

## 6. Still the platform's

Market rates and drift, crowd signals, the AI's reading of vendor documents and images, the suggestion queue, embeddings and semantic
search (Q-16); the photo store (2.0 keeps the picture itself, downscaled); reading the old binary `.xls` (the house reader takes CSV and
XLSX — the dialog says so).

## 7. Demo data

Migrations **0050** (`price_book_items.status · created_by · updated_by · reviewed_by · reviewed_at · review_note`,
`price_book_sections.created_by · updated_by`, table `price_book_changes`) and **0051** (`price_book_items.link · description_html`) are
additive; the baseline's rows restore with the defaults and `price_book_changes` is in the baseline lists. Repair **R56** re-prices the
two tile items per square foot and removes a probe's leftovers from OM-10001 (REG-651); **R57** names every item and section to the
Owner who kept the book, starts every item's History and adds one of Sarah's proposals (*Skirting, PVC 80 mm*) with its bell notice
(REG-652). `fixtures/baseline.json` was rebuilt from the committed baseline + the repair rules (REG-655).
