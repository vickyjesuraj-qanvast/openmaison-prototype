# OpenMaison 1.0 — Price book inventory · Slice B: rules and engine

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-25. Nothing was run — no server, no script, no test, no login. Every behaviour below is read from code, SQL and tests; where an effect is inferred rather than read directly it says so.

Conventions: *Words* are quoted verbatim from code; `{x}` marks an interpolated value. Money: **$** = major currency units — the book, its tiers and quote lines store `NUMERIC` dollars, never cents; **%** = a percent figure (`15` = 15 %). "Hand-off" = owned by another reader and only named here: **A** = the screens and flows (the manager and its tabs, the item editor, the import dialogs, the history drawer, the pickers in a quote) and their copy; **C** = everything around the price book (routes and their checks, roles, notifications, touchpoints); **D** = the data model (columns, JSON, migrations, the diff); **E** = 2.0 today. Behaviour an earlier audit already records is cited, not repeated: "quote-editor B-nn" = `../quote-editor-1.0-inventory/`, "templates C-nn" = `../quote-templates-1.0-inventory/`, "accounts C-nn" = `../accounts-setup-1.0-inventory/`, "X-Ray B-nn" = `../quote-x-ray-1.0-inventory/`. Where this reading of the code differs from an earlier row, the row says **corrects**.

Abbreviations:
- `PB` = `src/app/api/studio-config/price-book/route.ts` (GET list · POST add); `PBID` = `src/app/api/studio-config/price-book/[id]/route.ts` (PATCH edit)
- `PBM` = `src/components/accounts/price-book-manager.tsx`; `PBE` = `src/components/accounts/price-book-item-editor.tsx`; `CSVD` = `src/components/accounts/price-book-csv-dialog.tsx`
- `PARSE` = `src/app/api/price-book/parse/route.ts`; `PARSER` = `src/lib/price-book-parser.ts`; `MATCH` = `src/lib/price-book-matcher.ts`
- `SCAN` / `BULK` = `src/app/api/price-book/suggestions/scan/route.ts` / `…/bulk/route.ts`
- `APPROVE` / `REJECT` = `src/app/api/price-book/[id]/approve/route.ts` / `…/reject/route.ts`; `NOTIFY` = `src/app/api/price-book/notify-pending/route.ts`; `DEL` = `src/app/api/price-book/[id]/route.ts`
- `LI` = `src/app/api/quotes/line-items/route.ts`; `AM` = `src/app/api/quotes/auto-match/route.ts`; `QDD` = `src/components/leads/quote-digitizer-dialog.tsx` (the 1.0 quote editor)
- `QCM` = `src/lib/quote-cost-margin.ts`; `QC` = `src/lib/quote-calc.ts`; `EXE` = `src/lib/quote-agent/executors.ts`; `SC` = `src/lib/queries/studio-config.ts`
- `Mnnn` = `scripts/migrations/nnn_*.sql`; `V2` = `supabase/migrations/20260414000003_price_book_v2.sql`; `V3` = `supabase/migrations/20260416000001_price_book_v3.sql`; `TIERS` = `supabase/migrations/20260416000002_pricing_tiers.sql`; `CROWD` = `supabase/migrations/20260416000003_crowd_rate_signals.sql`; `RATES` = `supabase/migrations/20260414000004_seed_market_rates.sql`

## Vocabulary

- **Price book / item** — `studio_price_book`, one row per catalogue item (`M090:71-82` plus later columns; field list in quote-editor B-58). Accounts tab id `catalogue`.
- **Name / description** — `name` is the headline (*"Item Name"*, required by the editor, `PBE:426-431`); `description` is `TEXT NOT NULL`, labelled *"(optional, specs)"* (`PBE:797`). Legacy, imported and seeded rows carry the title in `description` with `name` null; editor-made rows may carry a name and an empty description.
- **Sell / unit price** — `unit_price` ($ per unit, client-facing, *"Sell Price"*). **Cost** — `cost_price` ($ per unit, internal). **Markup** — `markup_percent`: markup-of-cost `(sell − cost) / cost × 100`. **Margin** — margin-of-revenue `(sell − cost) / sell × 100`; shown, never stored in the book.
- **Stored vs implied markup** — the stored `markup_percent` against the markup the row's own sell and cost imply; several writers break the equality (B-03).
- **Tier** — a `price_book_pricing_tiers` row: a quantity bracket `[min_qty, max_qty]` with its own sell and optional cost (`TIERS:8-16`).
- **Trusted actor** — a member whose `studio_members.tags` literally contain `owner` or `admin` (`PB:28-30`). **Edit right** — `pricebook.edit` as resolved on the server (B-22). The two are different tests.
- **Approval status** — `approval_status ∈ pending · approved · rejected`, default `approved` (`M114:11-15`). **Approval task** — a `tasks` row `type "PriceBookItemApproval"` whose `related_entity_id` is the item id.
- **Price book approver** — `studios.settings.workflow.approvers.priceBookApproval[]`, set in Accounts › Workflow (B-30).
- **History row** — a `price_book_history` row (`V3:8-25`).
- **Market rate** — a global `platform_market_rates` row (`V2:40-53`): country, category, description, unit, `rate_min / rate_typical / rate_max` ($).
- **Drift** — a book sell price below `rate_min × 0.85` or above `rate_max × 1.15` of its matched market rate (B-40). Not the same as a quote line going stale against the book, which 1.0 never checks (B-45).
- **Crowd signal** — a `crowd_rate_signals` row (`CROWD:5-16`) written from a book edit and rolled into market rates by a monthly cron (B-43).
- **Match tier** — the matcher's verdict: `high` (score ≥ 0.75), `suggested` (≥ 0.50), `none` (`MATCH:209-212`).
- **Suggestion** — a `price_book_suggestions` row: a quote line the matcher found nothing for, offered for adding to the book (`M115:16-42`).
- **Link / snapshot** — `quote_line_items.price_book_item_id` (a soft UUID, no FK: `supabase/migrations/20260414000001_quote_v2_line_items.sql:32`) and `price_snapshot_at` (`V3:66-67`).
- **Source** — `studio_price_book.source`: `manual · csv_import · ai_parse · market_seed` from the app, `platform-default · flo-seed` from operator scripts (B-58).

---

## The item and its money

### B-01 · The pricing fields on a book row, and their precision
- **Where:** `M090:71-82`; `V2:6-19`; `V3:31-47`; `M113:11-20`; `M114:11-15`; `M135:6-16`; `TIERS:8-16`; `src/types/app.ts:3862-3906, 2044-2051`; `src/lib/transformers.ts:978-1039`.
- **Does:** a row holds `unit_price NUMERIC` (no scale — whatever is typed is kept), `cost_price NUMERIC(12,2)`, `markup_percent NUMERIC(5,2)` (at most 999.99), `waste_percent NUMERIC(5,2) DEFAULT 0`, `unit TEXT`, `cost_type TEXT DEFAULT 'combined'` (no CHECK), `market_rate_min / market_rate_max NUMERIC(12,2)` (read only by the typeahead's *"(mkt: …)"* hint, `src/components/leads/price-book-combobox.tsx:344-346`; written by nothing in `src/` or `scripts/`). There is no currency, tax flag, validity date, price-list version, or per-client / per-project price. The transformer turns NUMERIC strings into numbers and defaults `costType "combined"`, `wastePercent 0`, `isActive true`, `approvalStatus "approved"` (`transformers.ts:1010-1035`).
- **Data:** `studio_price_book`; tiers in `price_book_pricing_tiers` (B-09). Full column list and diffs: hand-off D.
- **Words:** —

### B-02 · Sell, cost and markup in the item editor (the triangle)
- **Where:** `PBE:202-204, 346-392, 874-933`; `QCM:81-84, 96-99`.
- **Does:**
  - The form starts `unitPrice = item.unitPrice ?? 0`, `costPrice = item.costPrice ?? 0`, `markupPercent = item.markupPercent ?? 0` — a missing cost becomes 0 in the form (`PBE:202-204`).
  - Edit **sell** → `markup = round1((sell − cost) / cost × 100)` when `cost > 0`, else markup untouched (`PBE:362-369`). Edit **cost** → the same formula against the held sell (`:370-374`). Edit **markup** → `markup = clampMarkupPercent(m)` (−100 … 10 000, non-finite → 0, `QCM:81-84`), then `sell = round2(cost × (1 + markup / 100))` whenever `cost ≥ 0` (`PBE:375-382`).
  - Because a missing cost reads as 0, **typing a markup on an item with no cost sets its sell to 0**, and the save turns that 0 into `unit_price: null` (`PBE:511`) — the price is wiped.
  - Markup rounds to **1 dp** here and to 2 dp in the quote grid (`QCM:98`), so one pair can read 33.3 % in the book and 33.33 % on a line.
  - The margin chip is margin-of-revenue `(sell − cost) / sell × 100` when `sell > 0` (`PBE:386-388`): green ≥ 20, yellow ≥ 10, else red (`:918-922`). With `sell ≤ 0` and a cost or markup typed, a hint shows (`:928-933`).
  - The quote grid runs the same model (quote-editor B-07); the differences are the null-cost rule (the grid refuses a markup edit with no cost, `QCM:122`) and the rounding.
- **Data:** saved as `unit_price`, `cost_price`, `markup_percent` (B-16).
- **Words:** *"Pricing"*, *"Cost and markup follow each other"*, *"Sell Price ({cs})"*, *"Unit Cost ({cs})"*, *"Markup %"*; chip *"Margin: {m}% ({cs}{sell − cost} per unit)"*; hint *"Enter a sell price — cost and markup are derived from it."*; tooltips *"The client-facing price. Editing cost or markup never changes it."*, *"Editing cost re-derives Markup. Sell price holds."*, *"Editing markup re-derives Unit Cost. Sell price holds."* — the first and third contradict the code (quote-editor B-96).

### B-03 · Writers that store a markup the row's own sell and cost don't imply
- **Where:** `src/app/api/studio-config/price-book/vendor-markup/route.ts:23-28`; `PBM:409-417`; `CSVD:223-242`; `PARSE:310`; `BULK:207-221`; `PBM:1108-1115` with `PBE:202-204, 511-513`; `PBM:255, 927-928`.
- **Does:** the book keeps whatever `markup_percent` it is sent; no writer re-derives it.
  - *Apply Vendor Default Markup* writes one % onto every active item of a vendor and nothing else (B-07).
  - *Seed from market rates* stores `round((typical − min) / typical × 100)` — a margin-of-revenue figure — beside `cost = min`, `sell = typical`; the implied markup is `(typical − min) / min × 100` (SG *"Tile hacking (floor/wall)"* 1.50 / 2.25: stored 33, implied 50) (B-44).
  - CSV and AI imports store the file's markup (or none) whatever the file's sell and cost imply (B-49, B-51).
  - Suggestion adds store no markup (`BULK:207-221`).
  - Drift *Suggest* opens the editor with a new sell and the old stored markup; unless a pricing field is touched the save writes both (B-41).
  - The Items list shows and sorts the **stored** figure (`PBM:255, 927-928`; green ≥ 20, yellow ≥ 10); lines added from the book copy it (B-69), where the grid hides it behind the implied markup (quote-editor B-08, B-97).
- **Data:** `studio_price_book.markup_percent`.
- **Words:** —

### B-04 · Precision limits the forms don't know about
- **Where:** `V2:13`; `V3:43`; `QCM:81-84`; `PBE:375-382, 970-978`; `scripts/migrations/031_quote_line_items.sql:8`; `supabase/migrations/20240101000020_quote_line_items.sql:22`; `TIERS:13-14`.
- **Does:**
  - `markup_percent NUMERIC(5,2)` holds at most 999.99, but the editor clamps markup at 10 000 and derives markups freely (cost 0.50 / sell 12 → 2 300 %). Such a save should fail with a numeric overflow and surface as *"Failed to save item"*; an import carrying such a markup fails the whole batch (B-53) (inferred from the schema; not run).
  - `waste_percent NUMERIC(5,2)`; the editor's input carries `min 0 · max 50 · step 0.5` as HTML attributes only.
  - Book `unit_price` has no scale (12.345 is kept); tiers and quote lines are `NUMERIC(12,2)`, so a book price with more than two decimals is rounded when a line or tier is saved.
  - No rule forbids sell < cost, a negative price or a zero sell: neither the POST nor the PATCH validates numbers (B-13, B-15). The approval-rules screen's thresholds and "margin floors" are never read (accounts C-36).
- **Data:** —
- **Words:** *"Failed to save item"*.

### B-05 · Units and the waste factor
- **Where:** `PBE:205, 936-983`; `CSVD:236`; `PARSER:19-93`; `PBM:413`; `LI:528`; `src/lib/queries/pricebook-units.ts:31-58`; `src/components/leads/focused-grid/line-items-grid.tsx:118`; `QC:115-120`.
- **Does:** `unit` is free text. Defaults differ by writer: the editor and the CSV import `"lot"`, the market seed `r.unit ?? "sqft"`, the AI parse a canonical token (B-51), a quote line saved with a blank unit `"set"` (`LI:528`). Only the AI parse normalises (`m2 · m² · sq.m → sqm` …); a hand-typed `sq ft` and `sqft` stay two units. Units matter in two engines: the matcher gives 15 % of its score to a unit match (B-61), while drift ignores units entirely (B-39). The grid's unit suggestions are the case-insensitive union of book and quote units, first casing kept, sorted A–Z (`pricebook-units.ts:31-43`). Waste: a line's effective qty = `qty × (1 + waste / 100)`, applied to revenue and cost (`QC:115-120`; quote-editor B-05).
- **Data:** `unit`, `waste_percent`.
- **Words:** placeholder *"sqft, ft, lot, pc..."*; *"Waste Factor (%)"*; tooltip *"Adds a buffer to ordered quantities to account for cuts, breakages, and overage. e.g., 10% waste on 100 sqft = 110 sqft ordered."*; *"Effective qty = qty x {1+w/100} in quotes"*; *"No waste factor applied"*.

### B-06 · Currency and GST
- **Where:** `PBM:62-75`; `src/lib/supabase.ts:20-26, 47-49`; `PARSER:95-130`; `CSVD:464-471`; `src/app/api/cron/price-drift/route.ts:41`.
- **Does:** there is no currency or tax column. Screens print the symbol of the **session's** country (`getCountryCode()`, default `"SG"`), and the market rates they compare against are that country's; the monthly drift cron uses `studios.country_code ?? "SG"` instead. Book prices are treated as tax-exclusive only implicitly — the quote charges GST at quote level (quote-editor B-35). The AI parse detects *inclusive / exclusive* wording (B-51) and shows a banner, but nothing converts or flags the imported prices: a GST-inclusive vendor list imports as-is and the quote charges GST again.
- **Data:** —
- **Words:** *"Prices appear to be {inclusive|exclusive} of GST based on the document text. Confirm before importing."*

### B-07 · Per-vendor, per-category, per-client pricing — what exists and what does not
- **Where:** `src/app/api/studio-config/price-book/vendor-markup/route.ts:13-38`; `src/components/accounts/vendor-markup-dialog.tsx:28-51, 83-121`; `TIERS:24-25`; `src/app/api/vendors/records/[id]/route.ts:121-122`; `src/components/finance/vendor-detail-drawer.tsx:211`.
- **Does:**
  - **Per vendor:** `vendors.default_markup_percent` is only a pre-fill in the *Apply Vendor Default Markup* dialog (`vendor-markup-dialog.tsx:93-98`); nothing applies it to new items or lines. Apply writes `markup_percent` + `updated_at` on active rows whose **scalar** `vendor_id` is the vendor (the dialog counts `vendorIds[0]`, the same thing unless a row's scalar and array disagree), leaves sell and cost as they were, writes no history, and the route checks only the session. A markup ≤ 0 does nothing; the input's `max 100` is an HTML attribute only (quote-editor B-68).
  - **Per category:** none — a trade carries no markup, GST or unit (accounts C-06).
  - **Per client, project or region:** none. The only price variation is the quantity tier (B-09…B-12). Lines' `package_tier` (*Essential · Premium · Luxury*) is unrelated and read by nothing (quote-editor A-65).
- **Data:** `vendors.default_markup_percent NUMERIC(5,2)`.
- **Words:** quote-editor B-68; 400 *"vendorId and markupPercent are required"*.

### B-08 · Cost type
- **Where:** `PBE:57-62, 935-956`; `V3:38-39`; `CSVD:238`; `PARSE:312`; `src/app/api/projects/[id]/materials/route.ts:97-117`.
- **Does:** the editor offers `combined · material · labor · subcontractor`; the column has no CHECK, so imports store whatever text the file or the model gives (*Labour*, *Supply*). The value is copied onto lines (B-69) and read in one place downstream: a project's materials list takes quote lines whose `cost_type` is `material`, `combined` or null — a line from an item typed `labor`, `subcontractor` or any other spelling never appears there.
- **Data:** `studio_price_book.cost_type` → `quote_line_items.cost_type`.
- **Words:** *"Cost Type"*, *"Combined"*, *"Material"*, *"Labor"*, *"Subcontractor"*.

---

## Volume tiers

### B-09 · The tier record and the editor's rules
- **Where:** `TIERS:8-18`; `PBE:241-243, 1239-1306`; `PB:84-104`; `src/types/app.ts:2044-2051`.
- **Does:** a tier is `min_qty NUMERIC(12,2) NOT NULL DEFAULT 0`, `max_qty NUMERIC(12,2)` (null = no upper bound), `unit_price NUMERIC(12,2) NOT NULL`, `cost_price NUMERIC(12,2)`; quantities are in the item's own unit. The list route fetches tiers in 200-id chunks and sorts them by `minQty` ascending (`PB:84-104`). *"Add Tier"* seeds `minQty = last.maxQty ?? last.minQty + 10` (0 for the first), `maxQty null`, `unitPrice` = the form's current sell, `costPrice = cost || null` (`PBE:1246-1249`) — so a new tier starts exactly at the previous tier's max, and both brackets contain that quantity. Inputs: min `parseFloat || 0`, max blank → null, sell `parseFloat || 0`, cost blank → null. Nothing checks order, gaps, overlaps, `min ≤ max` or a sell of 0. There is no client, project or date tier.
- **Data:** `price_book_pricing_tiers` (FK `ON DELETE CASCADE` to the item).
- **Words:** *"Volume Pricing Tiers"*, *"Add Tier"*, *"Min Qty"*, *"Max Qty"*, placeholder *"No limit"*, *"Sell ({cs})"*, *"Cost ({cs})"*, *"No tiers — base price applies to all quantities"*.

### B-10 · Saving tiers
- **Where:** `PBE:535-540`; `src/app/api/studio-config/pricing-tiers/route.ts:15-52`; `SC:349-363`.
- **Does:** only an **edit** saves tiers: after the item PATCH succeeds the editor calls `PUT /api/studio-config/pricing-tiers` with the whole list; the route deletes every tier of the item, then inserts the list — two statements, not atomic, so a failed insert leaves the item with no tiers. A failure is only logged (*"Pricing tiers save skipped (table may not exist)"*) and the editor still says *"Item saved"*. The route checks only the session — neither the edit right nor the approval state — so tiers are live the moment they are saved and are never part of what an approver reviews (an untrusted save puts the item itself in pending only because the PATCH before it sends every field, B-16). Tiers typed while **adding** an item are shown and dropped (`PBE:467-502` never saves them). No history row is written for tier changes.
- **Data:** `price_book_pricing_tiers`; tenant scope rests on RLS (`M226:122`) — hand-off C / D.
- **Words:** 400 *"itemId is required"*.

### B-11 · How a tier is picked
- **Where:** `QC:526-557`.
- **Does:** `resolveTieredPrice(tiers, qty)`, tiers assumed sorted by `minQty` ascending:
  1. Walk from the **last** tier down; the first tier with `qty ≥ minQty` and (`maxQty` null or `qty ≤ maxQty`) wins — with overlapping brackets the higher bracket wins, and at a shared boundary (10 = max of one, min of the next) the upper tier wins.
  2. Else, when `qty ≥` the last tier's `minQty` (the last tier has a max and the qty is above it), the last tier.
  3. Else `null` — a qty in a gap between brackets, or below the first `minQty`, leaves the line's price as it was.
  Returns `{ unitPrice, costPrice, tierIndex }`; a tier with no cost returns `costPrice null`.
- **Data:** —
- **Words:** —

### B-12 · When a tier reaches a quote line
- **Where:** `QDD:3423-3446, 3477-3485`; `src/components/leads/focused-grid/grid-write.ts:53-68, 100-108`; `src/components/leads/browse-price-book-modal.tsx:225-226`; `PBE:717-759`; `LI:368-417`; `EXE:549-568`; tests `src/__tests__/focused-grid-write.test.ts:113-170`.
- **Does:** only a **quantity edit** on a line linked to a book item with tiers re-prices it — typed in a cell (`updateItem`) or written by paste / fill (`applyCellWrites`). The line takes the tier's sell and, when the tier has one, its cost; totals are recomputed and the stored markup re-derived from the new pair (`impliedMarkupPercent`). The tiers used are the cached book's **current** tiers, so a tier change reaches an existing line the next time its qty is edited, and never otherwise. Not applied: typeahead pick, browse add (qty 1), background auto-match, the server's cost match, the AI drafter, the fallback draft, packages, the qty field of the line side panel, and the server save. `price_snapshot_at` is not touched. Also quote-editor B-94.
- **Data:** `quote_line_items.unit_price`, `cost_price`, `margin_percent`.
- **Words:** —

---

## Writing to the book

### B-13 · Adding items: what the POST does
- **Where:** `PB:138-285`; `SC:236-250`.
- **Does:**
  - One request carries any number of items (`{ items: AddItemInput[] }`) and becomes **one** multi-row `INSERT` (`PB:213`) — every row lands or none does.
  - Gate: the edit right (B-22) → 403.
  - Approval fields by trust (`PB:168-174`): trusted → `approved`, `approved_by` / `approved_at` = actor, now; else `pending` with both null. `created_by` = the session user; `source` = whatever the client sends (default `manual`).
  - SKU (B-14).
  - Row (`PB:194-211`): `description` as sent (no trim, no empty check — the column is `NOT NULL`, so `""` passes and a missing value fails the batch), `category_id`, `unit_price ?? null`, `unit ?? null`, `cost_price ?? null`, `markup_percent ?? null`, `tags ?? []`, `notes`, `name`, `item_id`, `cost_type ?? "combined"`, `waste_percent ?? 0`, `vendor_ids` = `vendorIds` when non-empty, else `[vendorId]`, else `[]`, `vendor_id = vendor_ids[0]`, `image_url`, `spec_url`, `subcategory`. No number is validated (negative, zero, sell < cost all pass).
  - Fallback (`PB:214-220`): when the insert error mentions `cost_type`, `waste_percent`, `vendor_id`, `image_url`, `spec_url`, `subcategory`, `approval_status`, `approved_by`, `approved_at`, or has code `42703`, it retries with the base columns **minus the approval fields** — the rows then take the column default `approved`. A foreign-key failure on a stale vendor id names the constraint `studio_price_book_vendor_id_fkey`, which contains `vendor_id`, so it takes this path too: the item lands approved and without vendor, cost type, waste, image, spec or subcategory, while the pending side effects still run (B-32; inferred from the message match, not run).
  - Side effects for an untrusted actor: one approval task per row and one self-call to `/api/price-book/notify-pending` per row, all in parallel and best-effort (B-29, B-31). Embeddings after the response (B-20).
  - Response `{ rows: [{ id, item_id }] }`.
- **Data:** `studio_price_book`, `tasks`.
- **Words:** 403 *"You don't have permission to edit the price book."*; 500 the database message or *"Internal server error"*.

### B-14 · The SKU (`PB-NNN`)
- **Where:** `PB:176-192`; `BULK:98-114, 193-198`; `M113:18-20`; `M159:40-64`; `PBE:777-788`.
- **Does:** when any row of a request lacks `itemId`, the route reads every `item_id ILIKE 'PB-%'` of the studio, takes the highest `^PB-(\d+)$`, and hands out `PB-{n+1}` padded to three digits in request order (after PB-999 comes PB-1000); supplied ids are kept as sent. The suggestion route repeats the rule. Two partial unique indexes on `(studio_id, item_id) WHERE item_id IS NOT NULL` exist (`M113`, `M159` — the same rule twice). A supplied id that already exists, or two concurrent adds computing the same next number, fail the insert with 23505 — for the POST, the whole batch. The editor shows the SKU read-only; imports never map one (B-47), so every import mints new ones. The typeahead and *Also save* copy it onto the line as `itemId`; browse does not (B-69).
- **Data:** `studio_price_book.item_id`.
- **Words:** *"Auto-generated on save"*, title *"Auto-generated sequentially per studio (PB-001, PB-002, …)"*.

### B-15 · Editing an item: what the PATCH does
- **Where:** `PBID:41-201`.
- **Does:**
  - Body `{ changes, previousValues }`; gate: the edit right (B-22).
  - `changes` goes to `.update()` as sent (`PBID:105-107`) — the `Changes` type is not enforced at runtime, so any column in the body is written (B-32).
  - The approval machine runs unless the change is archive-only (`is_active` alone) (B-23).
  - Update `{ ...changes, ...approvalChanges, updated_at }` scoped to `id + studio_id`. Fallback on the same error test as the POST: it retries with `changes` minus `cost_type, waste_percent, vendor_id, image_url, spec_url, subcategory` **and without `approvalChanges`** (`PBID:108-114`) — an edit that should have flipped the item to pending is then saved still approved, while the task and notification still go out (B-32; inferred).
  - An id that matches nothing is not an error: the update touches no row and the route answers `{ ok: true }`.
  - Then: re-embed when `changes.description` is truthy (B-20); approval side effects (B-29); history row (B-34); crowd signal (B-21).
- **Data:** `studio_price_book`, `tasks`, `price_book_history`, `crowd_rate_signals`.
- **Words:** 403 *"You don't have permission to edit the price book."*; 500 the database message.

### B-16 · What the item editor sends
- **Where:** `PBE:426-547`; `PBE:442-461, 829-853`; `src/app/api/quotes/categories/resolve/route.ts:19-51`.
- **Does:**
  - Save needs an Item Name (`PBE:426-431`). Every imported, seeded or legacy row with `name` null must be given one before any edit of it can be saved — a drift *Suggest* included (B-41).
  - **Add** posts one item: `description || ""`, `categoryId` (resolved, below), `subcategory || null`, `unitPrice: sell || undefined`, `unit || undefined`, `costPrice: cost || undefined`, `markupPercent: markup || undefined`, tags split on commas, `costType`, `wastePercent`, `vendorId`, `vendorIds` (primary first, de-duplicated), `notes`, `specUrl`, `name.trim()`, `itemId || null`, `source "manual"` (`PBE:463-502`). Every 0 becomes absent (null in the row), so a real zero cost or a 0 % markup cannot be stored from the editor. Image and tiers are not sent.
  - **Edit** PATCHes **every** field — `unit_price: sell || null`, `cost_price: cost || null`, `markup_percent: markup || null`, `unit`, `category_id`, `subcategory`, `cost_type`, `waste_percent`, `vendor_id` = first vendor, `vendor_ids`, `image_url`, `spec_url`, `notes`, `tags`, `name`, `item_id`, `description` — with `previousValues { unit_price, cost_price, markup_percent, is_active }` from the item as opened (`PBE:503-534`), then the tiers (B-10). Because every field is sent, any save by an untrusted editor — a tag change included — flips the item to pending, and every save is logged as changing every field (B-34).
  - Category: the picker lists the studio's active trades plus the 19 built-in names not yet present, as `virtual:{name}`. On save a virtual pick is resolved through `POST /api/quotes/categories/resolve`, which upserts the name active on `(studio_id, name)` (`order_index` left at its default 0) and checks only the session — a trade is created even when the item save that follows is refused, and a failed resolve saves the item uncategorised with no message (`PBE:442-461`; accounts C-08).
- **Data:** —
- **Words:** *"Item name is required"*, *"Item added to price book"*, *"Failed to add item"*, *"Item saved"*, *"Failed to save item"*, *"Will be created on save"*; resolve route 400 *"name is required"*.

### B-17 · Archive, restore and the bulk actions
- **Where:** `PBM:323-383, 434-456`; `PBID:81-82, 161-163`.
- **Does:** archive / restore is a PATCH of `{ is_active }` alone with `previousValues` — archive-only, so it skips the approval machine (B-23) and is logged `archive` / `restore`. An archived row leaves the typeahead, browse, auto-match, cost match, scan, semantic search, drift and the Items view; it stays in the export and in the drafter's price-book index (B-75). Bulk archive / restore send one PATCH per item (`Promise.allSettled`) and report partial failure. Bulk *Move to category…* PATCHes `category_id` per item — a real edit, so an untrusted mover flips every moved item to pending, with a task and a notification each (`PBM:353-383`). `previousValues` come from the manager's cached copy and can be stale if another tab edited the item.
- **Data:** `studio_price_book.is_active`, `category_id`.
- **Words:** confirm *"Archive "{x}"? It will be hidden from new quotes but kept in history."*, bulk *"Archive {n} item(s)? Archived items are hidden from quotes but kept in history."*; toasts *"Item archived"*, *"Item restored"*, *"Failed to update item"*, *"{f} of {n} archive operations failed"* (or *restore*), *"Archived {n} item(s)"* / *"Restored {n} item(s)"*, *"Moved {n} item(s) to {category}"*, *"Category "{x}" not found"*, *"Failed to move items"*.

### B-18 · Delete permanently
- **Where:** `DEL:1-90`; `V3:10`; `TIERS:10`; `M115:37`; `PBM:1270-1291`.
- **Does:** owner / admin **tag** only — not the edit right; 404 when the item is not in the studio; a hard delete. Cascades: the item's history (so its audit trail goes with it) and tiers. Quote lines keep their copied figures and a dangling `price_book_item_id` (no FK), so their approval chip, vendor pool and tier re-price silently stop (B-72). **Corrects** quote-editor B-63 and the route's own comment (`DEL:17-18`): `price_book_suggestions.added_to_price_book_id` is a real FK `ON DELETE SET NULL` (`M115:37`) — nulled, not left dangling. The item's open approval task is not closed. No history, no event, no undo.
- **Data:** `studio_price_book` and its cascades.
- **Words:** 403 *"Only admins or owners can delete price book items. Use Archive instead."*; 404 *"Item not found"*; the dialog's words in quote-editor B-63.

### B-19 · Drag reorder and re-filing by drop
- **Where:** `PBM:112-141`; `src/app/api/studio-config/price-book/reorder/route.ts:13-43`; `PB:70-71`.
- **Does:** a drop splices the dragged item before the target in the **whole** book array (archived included) and posts `order_index = 0…n` for every row, plus the target's `category_id` when the two differ. The route fires one UPDATE per row in parallel (a 6 000-item book → 6 000 updates per drop), checks only the session, writes no history, leaves `updated_at` and the approval state alone — any signed-in member can re-file an item into another trade without review (accounts C-30). `order_index` sets the list order (`order_index ASC NULLS LAST, created_at DESC`) and, through it, which eight items the typeahead offers (B-59); nothing on quotes.
- **Data:** `studio_price_book.order_index`, `category_id`.
- **Words:** *"Could not save new order"*; 500 *"Reorder failed"*.

### B-20 · Embeddings written on add and edit
- **Where:** `PB:258-279`; `PBID:120-125`; `src/lib/quote-agent/price-book-embeddings.ts:7-26`; `src/lib/ai.ts:461-493`; `M288:1-13`; `scripts/quote-agent/backfill-price-book-embeddings.mjs:1-20`; test `src/__tests__/price-book-embedding-fanout.test.ts`.
- **Does:** the embedded text is the row's **description** only, through `openai/text-embedding-3-small` (1 536 dims) on OpenRouter. On add: inside `after()` (after the response), 5 at a time, for rows with a non-empty description. On edit: a bare fire-and-forget whenever `changes.description` is truthy — the editor always sends it, so every save of a described item re-embeds; the POST's own comment explains why a bare call may never finish on a frozen lambda, and the PATCH still uses one. Never throws; a failure keeps the old vector or none. Never embedded: name-only items, suggestion adds (the bulk route has no embedding step), the dead import routes, operator seeds, SQL inserts. An operator script re-embeds every `embedding IS NULL` row (**corrects** quote-editor B-85, "there is no backfill"). A name change never re-embeds.
- **Data:** `studio_price_book.embedding vector(1536)`, HNSW cosine index (`M288`).
- **Words:** —

### B-21 · The crowd signal written on edit
- **Where:** `PBID:185-194`; `src/lib/crowd-rate-collector.ts:31-39, 75-106`.
- **Does:** a PATCH carrying `unit_price > 0` and a truthy `description` records `{ country_code: studios.country_code ?? "SG", category: "General", item_description: changes.description, unit: changes.unit ?? "lot", unit_price, cost_price, source_type "price_book" }` — at most one per studio and exact description per calendar month (server clock), fire-and-forget through the service-role client. Every editor save of a priced, described item qualifies, whether or not the price changed and whether the item is approved or pending; a drift *Suggest* save does too (it is an ordinary PATCH). Adds, imports, vendor markup and suggestion adds never record one. The category is always *"General"*, which decides how the aggregate groups them (B-43).
- **Data:** `crowd_rate_signals` (`CROWD:5-21`).
- **Words:** —

---

## Approval

### B-22 · Who may write, and who is trusted
- **Where:** `PB:26, 156-170`; `PBID:20, 68-84`; `src/lib/access-control.ts:215-216, 249-300, 344-345`; `src/app/api/studio-config/role-permissions/route.ts:16-51`; `PBM:57-61, 466-470`.
- **Does:**
  - **Edit right (server):** the route reads the member's `tags`, takes the first of `owner → admin → accounting → id` present (`"id"` when none), loads that slug's `studio_roles.permissions`, and calls `resolveCanPerformAction(role, tags, "pricebook", "edit")`: an explicit `true` / `false` in `permissions.actions.pricebook.edit` wins; a missing key falls back to the tags — owner yes, admin yes, accounting without id no, id no (`access-control.ts:263-293`). Per-member `permission_overrides` are read neither here nor by the client gates (the quote editor computes them and discards them, `QDD:1119-1128`); a custom role counts only through the four slugs.
  - **Trust:** separately, `approval_status` follows the literal tag `owner` or `admin` (`PB:28-30`). "May write" and "writes land live" are two tests: a studio that grants `pricebook.edit` to the *Interior Designer* role gets pending items; an admin whose role row denies edit gets 403.
  - **Owner / admin tag only** (not the edit right): approve, reject, delete (B-25, B-26, B-18).
  - **Session only** (no edit right, no tag): reorder, vendor markup, tiers, image upload, export, the AI parse, the suggestion scan and add / dismiss, history read, category resolve (B-19, B-07, B-10, B-57, B-65, B-66, B-16).
  - The client derives the same edit right from `/api/studio-config/role-permissions` for its own gates (`PBM:57-61`); what each screen hides is hand-off A, each route's check in depth hand-off C.
- **Data:** `studio_members.tags`; `studio_roles.permissions.actions.pricebook`.
- **Words:** *"Read-only — only owners/admins can edit the price book."*

### B-23 · The approval state machine
- **Where:** `PB:168-174`; `PBID:80-101, 127-158`; `APPROVE:54-90`; `REJECT:62-93`; `BULK:200-203`; `M160:1-14`.
- **Does:** transitions, where T = trusted actor and U = a member with the edit right but not the tag:

| Event | From | To | Also |
|---|---|---|---|
| Add (POST or suggestion add) | — | T: `approved` (by / at = actor) · U: `pending` | U: a task and a notification per row |
| Edit (PATCH, not archive-only) | `approved` or `rejected` | U: `pending` (by / at cleared) | *"Re-approve …"* task and notification |
| Edit | `pending` | T: `approved` | closes the open tasks as approved; no notice to the submitter; `is_active` untouched |
| Edit | `pending` | U: stays `pending` | nothing new |
| Edit | `approved` or `rejected` | T: unchanged | an owner's edit never clears *Rejected* |
| Archive / restore (`is_active` alone) | any | unchanged | logged `archive` / `restore` |
| Approve route | `pending` or `rejected` | `approved`, **`is_active = true`** | closes tasks, notifies the creator |
| Approve route | `approved` | unchanged | answers `{ ok, alreadyApproved }` |
| Reject route | **any** | `rejected`, **`is_active = false`**, by / at = rejecter | closes tasks with the comment, notifies the creator |

- `approved_by` / `approved_at` are overwritten by every transition — a rejection writes the rejecter there. `approver_user_id` is never written (its migration says the suggestion route writes it and the notify route reads it; neither does, `M160:3-15`). There is no draft, expired or superseded state and no copy of the previous approved values beyond the history row (B-27).
- **Data:** `studio_price_book.approval_status · approved_by · approved_at`; `tasks`.
- **Words:** —

### B-24 · What a pending item does
- **Where:** `M114:1-8`; `src/components/leads/price-book-combobox.tsx:66-73`; `src/components/leads/browse-price-book-modal.tsx:72-75`; `AM:56-61`; `LI:381-385`; `SCAN:66-70`; `M289:28-31`; `src/components/leads/quote-row.tsx:249-258, 506-515`; `src/lib/notifications/templates/base/pricing.ts:21`.
- **Does:** nothing blocks it. A pending item is offered by the typeahead and browse (both filter on `is_active` only), matched by the background auto-match, the save-time cost match and the suggestion scan, returned by the drafter's semantic search (which excludes only `rejected`), and priced onto lines like an approved one. The pickers show no status. Once on a line, the line shows *"Pending approval"* while the item stays pending and *"Library item rejected"* if it is later rejected (read live from the cached book, never blocking a save). A quote can be sent, approved and signed on pending prices; no quote check counts them. The notification tells the approver as much.
- **Data:** —
- **Words:** chips *"Pending approval"*, *"Library item rejected"*; email *"The item is already usable in quotes. This is a confirmation so you can review when convenient."*

### B-25 · Approve
- **Where:** `APPROVE:15-119`; `src/components/price-book/pending-tab.tsx:88-107`; `src/app/(main)/tasks/page.tsx:743-766, 825-848, 1127-1140`.
- **Does:** owner / admin tag (403 otherwise); item by `id + studio_id` (404); already approved → `{ ok: true, alreadyApproved: true }`; else sets `approved`, `approved_by` / `approved_at`, `is_active = true`, `updated_at`; closes the item's open approval tasks (`status Completed`, `approval_status approved`); notifies `created_by` unless the approver created it (B-31). Reached from the Pending tab, a task row's *Approve*, and the Tasks page's bulk *"Approve {n} items"* (parallel calls, `Promise.allSettled`). No comment, no history row. Because it re-activates, approving an item that was archived while pending brings it back into quoting.
- **Data:** `studio_price_book`, `tasks`, notifications.
- **Words:** 403 *"Only admins or owners can approve price book items"*; 404 *"Item not found"*; toasts *"Approved "{x}""* (Pending tab), *"Item approved"*, *"Approve failed"*, *"Approved {n} item(s)"*, *"Failed to approve {n} item(s)"*, *"Approved {s}, {f} failed"* (Tasks); button *"Approve {n} item(s)"*.

### B-26 · Reject
- **Where:** `REJECT:19-124`; `src/components/price-book/pending-tab.tsx:109-136, 202-246`; `src/app/(main)/tasks/page.tsx:768-802`.
- **Does:** a non-blank comment is required (checked before the role); owner / admin tag; any status can be rejected — an approved, live item included. Sets `rejected`, `is_active = false`, `approved_by` / `approved_at` = rejecter; closes open tasks with `approval_status rejected` and the comment; notifies the creator with the comment. The rejected values stay on the row (B-27). There is no reason list: Quote Approval Rules' *"Rejection Reasons"* are never offered (accounts C-36).
- **Data:** as above; `tasks.approval_comment`.
- **Words:** 400 *"comment is required"*; 403 *"Only admins or owners can reject price book items"*; placeholder *"e.g., Price is below our floor for this category"*, *"Confirm reject"*; toasts *"Rejected "{x}""*, *"Reject comment is required so the submitter knows what to change"*, *"Item rejected and archived"*, *"Reject failed"*; other words quote-editor B-62.

### B-27 · An edit goes live before approval, and a rejection doesn't roll it back
- **Where:** `PBID:97-107`; `REJECT:64-72`; `V3:15-20`; `src/components/price-book/pending-tab.tsx:158-200`.
- **Does:** an untrusted edit of an approved item writes the new values **and** flips the status in one update, so the new price is what every picker, matcher and AI search uses from that moment. The approver sees current values only — no before / after, no link to history (B-33). Rejecting then archives the item carrying the rejected values; the last approved price survives only as `unit_price_before` in a history row, with nothing to restore it. A rejected price change therefore removes the item from quoting instead of reverting it, and lines already priced from it keep the unapproved price.
- **Data:** —
- **Words:** —

### B-28 · Re-submitting and restoring a rejected item
- **Where:** `PBID:81-101`; `PBM:434-456, 832-845`; `src/lib/notifications/templates/base/pricing.ts:39-42`; `M289:31`.
- **Does:**
  - **Re-submit** (an untrusted edit of a rejected, archived item): the status flips to `pending` but `is_active` stays false — it waits in the Pending tab while hidden from quotes; approving re-activates it.
  - **Restore** (Archived view › *Restore*): archive-only, so the machine is skipped — the item is back in quoting still `rejected`. The typeahead, browse, auto-match, cost match and scan offer it again; the drafter's search does not. Any member with the edit right can do it, untrusted ones included (B-32).
  - A later owner edit leaves it `rejected` (B-23). Only the approve route clears it, and outside the Tasks page only the Pending tab calls that route — which lists pending items, and the item's task was closed at rejection. So a restored rejected item keeps its *Rejected* chips until an untrusted member edits it.
- **Data:** —
- **Words:** row chip title *"Rejected — restore via the Archived view"*; email *"You can edit and re-submit the item from the archived view."*

### B-29 · The approval task
- **Where:** `PB:39-46, 227-245`; `PBID:32-39, 128-140`; `BULK:116-148, 230-245`; `APPROVE:78-90`; `REJECT:80-93`; `src/app/(main)/tasks/page.tsx:38, 49, 510-515, 713-727, 815-848`.
- **Does:** one `tasks` row per pending item: no lead or project, `status NotStarted`, `planned_date` = today (UTC), `approval_status pending`, `related_entity_id` = the item. The assignee depends on the writer: add and edit → first owner, else first admin (the configured approver is ignored); suggestion add → the configured approver `priceBookApproval[0]`, else first owner, else first admin. No assignee found → no task. A 500-row import by an untrusted member creates 500 tasks and fires 500 notify calls; the Tasks page's bulk approve exists "so admins can clear a CSV-import queue in one click" (`:713-714`). The task closes when the approve / reject route runs or a trusted member edits the item. The Tasks page's generic *Completed* move (`:815-823`) closes a price-book task without approving the item — it stays pending with no open task. Deleting the item leaves its task open (its *Approve* then 404s).
- **Data:** `tasks (type "PriceBookItemApproval")`.
- **Words:** *"Approve price book item: {name or description}"*, *"Re-approve price book item: {label}"*, type chip *"Price Book Item"*, *"Open in Price Book"* (→ `/accounts?tab=catalogue&pb=pending`).

### B-30 · The price book approver setting
- **Where:** `src/app/(main)/accounts/page.tsx:1700-1732`; `src/components/accounts/workflow-approver-selector.tsx:27-43`; `NOTIFY:52-75`; `BULK:116-148`; `APPROVE:30-39`.
- **Does:** Accounts › Workflow stores `priceBookApproval: [ids]` — any member except owners, who show pre-selected, cannot be toggled and so are never stored. Only the **first** id is read, by the pending notification and by the suggestion route's task; add / edit tasks ignore it (B-29). A configured approver without the owner or admin tag receives the notification but gets 403 on approve and no task on the main path. The copy promises owners are "always in the loop" and that extra members "share the load"; the code tasks one owner and notifies one approver (plus the category's recipients, B-31).
- **Data:** `studios.settings.workflow.approvers.priceBookApproval[]`.
- **Words:** *"Price book approvers"*, *"Who reviews new price book items submitted by team members? Owners are always in the loop; add extra members to share the load."*, *"Approvers (owners are always included; add extra members to route this approval to)"*, *"All owners (default)"*, toast *"Price book approvers saved"*.

### B-31 · Approval notifications and who receives them
- **Where:** `NOTIFY:17-101`; `APPROVE:92-112`; `REJECT:95-117`; `BULK:246-276`; `src/lib/notifications/events.ts:630-661`; `src/lib/notifications/templates/base/pricing.ts:10-43`; `src/lib/notifications/dispatch.ts:137-143, 229-246`; `src/lib/notifications/preferences.ts:87-105`; `src/lib/notifications/resolve-recipients.ts:401-404, 481-493`; `M112:12-25`.
- **Does:**
  - **Pending** (`price_book.item_pending_approval`, `action created | edited`): the add / edit routes call `/api/price-book/notify-pending` over HTTP with the caller's cookie — it re-reads the item and does nothing unless it is still pending; the suggestion route dispatches directly. Fixed recipient `priceBookApproval[0]` ?? first owner ?? first admin; link `/tasks`; *member_name* is the **caller**, *category* the trade name.
  - **Approved / rejected** (`price_book.item_approved` / `item_rejected`): fixed recipient = the item's `created_by` — the original adder, not the member whose edit was reviewed; skipped when the approver is that person; link `/accounts` (not the Pending tab).
  - The dispatcher unions every fixed recipient with the members whose tags match the studio's `pricing` category preference — `{owner,admin}` for in-app and email as seeded by `M112`, `['owner']` when the row is missing — and no longer excludes the actor (`resolve-recipients.ts:481-493`). So by default every owner and admin also receives each pending notice and each *"Your Price Book Item Was Approved / Rejected"* (inferred from the dispatch code; not run). WhatsApp for `pricing` is off by default. The routes don't await the dispatch.
- **Data:** notification rows (hand-off C / D).
- **Words:** *"Price Book Item Pending Approval"*, *"{member} has {added|edited} {item} in the price book and needs your review."*, *"Category: {category}"*, *"The item is already usable in quotes. This is a confirmation so you can review when convenient."*; *"Your Price Book Item Was Approved"*, *"{approver} approved {item}."*; *"Your Price Book Item Was Rejected"*, *"{approver} rejected {item} and archived it."*, *"You can edit and re-submit the item from the archived view."*; entity label *"Price Book: {label}"*.

### B-32 · Paths that skip or defeat the approval
- **Where:** as cited in each item.
- **Does:** a change by a member without the owner / admin tag reaches quotes without review through:
  1. **Restoring a rejected item** — an archive-only PATCH (B-28).
  2. **A crafted PATCH** (by a member with the edit right) — `changes` is written verbatim (`PBID:105-107`), and on an item already pending no approval change is added, so a body with `approval_status: "approved"` is saved: edit once (→ pending), then send that (inferred; not run). The same body can set `created_by`, `approved_by`, `source` or `embedding`.
  3. **The fallback retries** — the POST inserts without approval fields (→ default `approved`) and the PATCH updates without `approvalChanges` whenever the first error mentions a listed column, a stale vendor FK included (B-13, B-15; inferred).
  4. **Session-only writers** — tiers, reorder / re-file, vendor markup, image upload change prices, trades or markup with no approval and no history (B-10, B-19, B-07).
  5. **Suggestion adds** — need no edit right at all; they still land pending for untrusted members (B-66).
  6. **Server-side writers** — the two dead import routes and the operator seeds insert through the service role and take the default `approved` (B-56, B-58).
  7. **Pending is usable** — by design (B-24).
- **Data:** —
- **Words:** —

### B-33 · The Pending tab's duplicate hint, and what an approver can see
- **Where:** `src/components/price-book/pending-tab.tsx:44-81, 149-276`; `src/lib/queries/price-book.ts:29-35`.
- **Does:** lists every `pending` row, archived ones included, with name (or description), trade, the **creator's** name and creation date, sell, and cost when > 0. *"Similar to: {x}"* = the first non-pending, active row whose normalised name-or-description (lowercase, runs of non-alphanumerics → one space) equals the pending one's or is a prefix of it either way; the pending text must be ≥ 3 characters, the other side has no minimum — a short active row (*Tile*) is "similar" to every pending item starting with its text, and a row whose text normalises to `""` to every pending item. No before / after for an edit (and the person shown is the original creator, not the editor), no markup, no link to history, no bulk approve (that is on the Tasks page). *Approve* and *Reject* show to every viewer; the server refuses anyone without the tag. The tab badge counts all pending rows.
- **Data:** —
- **Words:** quote-editor B-62.

---

## History and audit

### B-34 · What a change writes to history
- **Where:** `PBID:160-183`; `V3:8-25`; `PBE:528-533`; `PBM:335-341, 369-374, 444-449`; `M223:41`.
- **Does:** only the PATCH writes a row: `price_book_item_id`, `studio_id`, `changed_by` = session user, `change_type`, `field_changes`, the three prices before and after, `created_at`.
  - `change_type`: `archive` when `changes.is_active === false` and the previous value was not false; `restore` when `true` and previously false; else `update`. `create` exists in the type and the drawer but is never written.
  - `field_changes`: for **every** key sent, `{ old: previousValues[key] ?? null, new }` when `old !== new`. `previousValues` carries only the three prices and `is_active`, so every other field the editor sends (all of them, B-16) is logged as changed from null on every save; arrays always differ by reference. The approval flip is not recorded.
  - Prices: `x_before = previousValues.x ?? null`; `x_after = changes.x` when sent, else the before value. `previousValues` comes from the client's cached item, not the database.
  - A failed history insert is only logged; the edit still answers ok.
- **Data:** `price_book_history` (RLS-locked to the studio, `M223:41`).
- **Words:** —

### B-35 · What history never records
- **Where:** `PB:145-285`; `BULK:200-227`; `src/app/api/studio-config/price-book/reorder/route.ts:26-31`; `src/app/api/studio-config/price-book/vendor-markup/route.ts:23-28`; `src/app/api/studio-config/pricing-tiers/route.ts:30-46`; `APPROVE:61-75`; `REJECT:64-78`; `DEL:9-11`; `src/app/api/price-book/upload-image/route.ts:72-81`.
- **Does:** no history row for: creation (add, import, seed, suggestion add); drag reorder and re-filing by drop; vendor bulk markup; tier changes; approve, reject and every approval flip; image upload; embedding writes; the dead import routes; operator scripts. Delete removes the item's history with it. "Who set this price, and when" is answerable only for PATCH edits made after creation, and only while the item exists.
- **Data:** —
- **Words:** drawer empty state *"No changes recorded yet"* · *"History begins when an item is first edited"*.

### B-36 · Reading history
- **Where:** `src/app/api/studio-config/price-book-history/route.ts:35-65`; `src/components/accounts/price-book-history-drawer.tsx:22-27, 100-178`; `PBM:1108-1115`; `PBE:528-533`.
- **Does:** `GET ?itemId=` returns the latest **50** rows, newest first, with the changer's name; RLS scopes the studio. The drawer prints *Sell*, *Cost* and *Markup* lines only when before and after are both non-null and differ — a first price (null → value) or a cleared one never shows — and every other `field_changes` key as *"{field}: {old} → {new}"* with raw values (UUIDs for vendor and trade, comma-joined arrays, *"—"* for null). Drift *Suggest* opens the editor on a clone whose `unitPrice` is already the suggestion, so the saved row records before = after = the suggested price and the drawer shows no price change for it (`PBM:1113` with `PBE:529`).
- **Data:** —
- **Words:** *"Price History"*, *"Created"*, *"Updated"*, *"Archived"*, *"Restored"*, *"by {name}"*, *"Sell:"*, *"Cost:"*, *"Markup:"*; 400 *"itemId query param is required"*.

### B-37 · The other audit stamps
- **Where:** `PB:196-198`; `APPROVE:61-69`; `REJECT:64-72`; `PBID:104-107`; `src/app/api/studio-config/price-book/vendor-markup/route.ts:25`; `src/app/api/price-book/upload-image/route.ts:73-76`; `PBE:343-344`.
- **Does:** `created_by` (set on add, never changed; shown as *"Added by {name}"*) and `created_at`; `approved_by` / `approved_at` (overwritten by each approval transition, the rejecter included); `updated_at` (set by PATCH, approve, reject, vendor markup and image upload — not by reorder, tiers or embeddings); `source` (client-supplied, B-13); the approval task's `approval_status` and `approval_comment` — the only record of a rejection reason. There is no per-item activity feed, no studio-wide price-book audit log and no import batch id (B-53).
- **Data:** —
- **Words:** *"Added by {name}"*.

---

## Market rates and drift

### B-38 · Platform market rates
- **Where:** `V2:38-56`; `RATES:1-154`; `src/app/api/studio-config/platform-market-rates/route.ts:16-51`; `SC:404-417`; `M264:1-79`; `src/app/api/quotes/insights/route.ts:346-373`; X-Ray B-54…B-59.
- **Does:** a global table (no studio): `country_code`, `category`, `item_description`, `unit DEFAULT 'sqft'`, `rate_min`, `rate_max`, `rate_typical` ($), `year`, `source` (`platform · industry_report · crowd`), unique `(country_code, category, item_description)`. The seed carries 2025 figures — 32 SG, 30 MY, 24 AE, 25 IN rows, none for EG; SG spans nine categories (Carpentry 6, Plumbing 5, Electrical 4, Ceiling / Demolition / Flooring / Glass & Doors / Masonry 3 each, Painting 2) in units `sqft · ft · pc · lot · pt`. Studios read it through a session-gated GET for their session country (cached 5 minutes). Readers: drift (B-40), *Seed* (B-44), the drafter's second tier (B-76), the quote AI-insights prompt, Quote X-Ray (X-Ray B-54…B-59). The typeahead's *mkt* hint reads the item's own never-written `market_rate_*` columns, not this table. Writers: the seed migration and the crowd cron (B-43); no admin screen. `M264` revokes every grant from `anon` and `authenticated` and enables RLS with no policy, while this GET reads through the `authenticated` scoped client — see B-79 and Uncertain.
- **Data:** `platform_market_rates`.
- **Words:** 400 *"countryCode query param is required"*.

### B-39 · Matching an item to a market rate
- **Where:** `MATCH:15-134, 237-260`.
- **Does:** `matchDescriptionToMarketRate(text, rates)`: tokens = lowercase, non-alphanumerics → space, words longer than one character; both sides expanded with the renovation synonym table (multi-word terms found by substring in the original text, single words by token); score = Jaccard of the expanded sets; the best rate scoring ≥ 0.3 wins (strictly greater, so the first of equal scores). The rate's **category and unit are never compared** — a per-piece item can be judged against a per-sqft rate, a kitchen-cabinet run per foot against a wardrobe rate. The caller then re-finds the rate by `(category, item_description)`.
- **Data:** —
- **Words:** —

### B-40 · The drift rule, and its five copies
- **Where:** `PBM:40-44, 209-227, 525-539`; `src/lib/queries/price-book.ts:20-23, 44-69`; `src/components/price-book/drift-tab.tsx:25, 57-104`; `src/components/accounts/price-drift-summary.tsx:28, 40-68, 101`; `src/app/api/cron/price-drift/route.ts:11, 61-95`.
- **Does:** for an active item with `unit_price > 0` matched at ≥ 0.3: **below** when `price < rate_min × 0.85` (percent `round((min − price) / min × 100)`), **above** when `price > rate_max × 1.15` (percent `round((price − max) / max × 100)`); `rate_typical` is not used, and only the sell price is compared — never cost or markup. The rule is written five times with the same 0.15 constant but not on the same text: the Items chip / pill (`PBM:215`) and the Drift tab (`drift-tab.tsx:64`) match `name || description`; the tab badge (`price-book.ts:56`), the summary card (`price-drift-summary.tsx:49`) and the monthly cron (`route.ts:71-74`) match `description` only. For any named item the counts can disagree, and a name-only item is never counted by the badge, the card or the cron. The card shows the top 5 by percent; the tab sorts by percent descending or A–Z.
- **Data:** —
- **Words:** quote-editor B-69.

### B-41 · *Suggest* (bring a drifted price back)
- **Where:** `src/components/price-book/drift-tab.tsx:72, 173, 200-225`; `PBM:1103-1116`; `PBE:202-204, 426-431, 503-534`.
- **Does:** *Suggest* rounds `(rate_min + rate_max) / 2` to 2 dp — the midpoint, labelled *"Market median"*, not `rate_typical` — and opens the editor on a clone of the item carrying that sell. From the code: the item needs a name before the save is allowed (B-16); cost and markup are not re-derived, so the old stored markup is saved beside the new sell (B-03); `previousValues.unit_price` is the suggested price, so history shows no price change (B-36); an untrusted editor's save flips the item to pending (B-23); a crowd signal is recorded (B-21). Quotes already priced from the item are untouched (B-45).
- **Data:** —
- **Words:** *"Suggest"*, title *"Open the editor with {cs}{x} pre-filled as the new sell price"*, toast *"Pre-filled {cs}{x} — review and save in the editor."*

### B-42 · The monthly drift cron
- **Where:** `src/app/api/cron/price-drift/route.ts:19-134`; `vercel.json:40-43`; `src/lib/notifications/events.ts:619-628`; `src/lib/notifications/templates/base/pricing.ts:44-53`; `src/lib/notifications/templates/whatsapp.ts:57`.
- **Does:** `0 10 1 * *` (1st of the month, 10:00 UTC), cron-secret auth, service role. For every studio: its active items with a price (one unpaged read, B-68), its country's rates (`country_code ?? "SG"`), the B-40 rule on `description`; with any drift, one `price_book.drift_detected` carrying `drift_count` and link `/accounts?tab=catalogue&pb=drift`, entity id `drift-{studio}-{timestamp}` (never de-duplicated). Recipients: the `pricing` preference's roles (B-31). No per-item detail, no digest, nothing stored; a studio without rates for its country is skipped silently. When the link is opened the list is recomputed in the browser on a different text rule and from the session country (B-40, B-06).
- **Data:** —
- **Words:** entity label *"{n} Price Book Items Need Review"*; email *"Price Book Drift Detected"* · *"{n} price book item(s) drifted from market rates."*; WhatsApp *"Price book drift detected ({{drift_count}} items). Review: {{action_url}}"*.

### B-43 · Crowd signals and the monthly aggregate
- **Where:** `src/lib/crowd-rate-collector.ts:31-106`; `src/app/api/cron/aggregate-rates/route.ts:26-138`; `vercel.json:44-47`; `CROWD:5-21`.
- **Does:**
  - Signals come only from book edits (B-21); `collectQuoteSignals` (quote saves, `crowd-rate-collector.ts:45-73`) has no caller.
  - Cron `0 12 15 * *`: reads the last 90 days of signals in one unpaged read ordered by country, category, description (past the read cap the later groups silently drop out, B-68); groups by the **exact** `(country_code, category, item_description)` strings; skips groups with fewer than **5 distinct studios**; upserts `rate_min = P10`, `rate_typical = P50`, `rate_max = P90` — linear interpolation `sorted[lo] + (sorted[hi] − sorted[lo]) × (idx − lo)` with `idx = p / 100 × (n − 1)`, rounded to 2 dp — `unit` = the first signal's unit (units are never reconciled), `year` = now, `source "crowd"`, on `(country_code, category, item_description)`.
  - With every signal filed under *"General"* and keyed on free-text descriptions, a crowd rate appears only when five studios type the same description, and then as a new *"General"* rate beside the seeded one, not an update of it.
- **Data:** `crowd_rate_signals` → `platform_market_rates`.
- **Words:** —

### B-44 · Seed from market rates
- **Where:** `PBM:404-425, 637-641`.
- **Does:** offered only when the book is empty, rates exist and the viewer has the edit right. One POST (B-13) with one item per rate of the session country: `description = item_description`, `categoryId` = the trade whose name equals the rate's category **exactly** (case-sensitive; else none), `unitPrice = rate_typical ?? (min + max) / 2`, `unit = unit ?? "sqft"`, `costPrice = rate_min`, `markupPercent = rate_typical ? round((typical − min) / typical × 100) : 20`, `source "market_seed"`, no name (each seeded item needs a name before its first edit, B-16). Approval, SKU and embeddings as for any add — an untrusted SG seeder gets 32 pending items and 32 tasks.
- **Data:** —
- **Words:** *"Seed from {cc}"*; toasts *"Seeded {n} items from {cc} market rates"*, *"No market rates available for your region"*, *"Failed to seed market rates"*.

### B-45 · Quote lines are never checked against the book
- **Where:** writers of `price_snapshot_at` — `LI:465`, `QDD:3331, 3583`, `src/components/leads/browse-price-book-modal.tsx:242`, `PBE:754` — and no reader; `MATCH:214-220`; `AM:118-131`; `src/components/leads/auto-match-review-panel.tsx:90, 217-224`; `QDD:3528-3564`.
- **Does:** there is no "the book's price changed since this line was priced" rule anywhere. `price_snapshot_at` is stamped by five writers and read by none; there is no stale badge, no refresh, no bulk "update from price book", no notice to the owners of open quotes when an item's price, cost or tiers change, and no comparison of a signed quote with today's book. The only line-against-book price check is the matcher's `priceDiscrepancy` (`|line − book| / book × 100 > 15`, 1 dp), returned by the auto-match route and shown only in the review panel nothing opens (`handleAutoMatch` has no caller; quote-editor B-83). The background auto-apply ignores it.
- **Data:** `quote_line_items.price_snapshot_at` (write-only).
- **Words:** —

---

## Imports and exports

### B-46 · Import routing: CSV in the browser, everything else through the model
- **Where:** `CSVD:84-88, 141-162, 166-210`; `PBM:586-597, 1135-1148`.
- **Does:** the file's **extension** decides: `.csv` → Papa Parse in the browser (header + at least one non-blank row); `.pdf .png .jpg .jpeg .webp .xlsx .xls .txt` → `POST /api/price-book/parse` (B-50); anything else is refused. Pasted text also goes to the model. So an Excel file never gets the column-mapping step — the model decides every column — while a CSV never gets duplicate detection, unit normalisation, category mapping or GST detection. The import entry points show only with the edit right; the parse route itself checks only the session.
- **Data:** —
- **Words:** *"Import Price Book"*, *"CSV — fast path"*, *"Parsed locally. No AI cost. Pick column mapping next."*, *"PDF / Image / Excel — AI parse"*, *"Extracts rows, maps categories, flags duplicates."*; toasts *"CSV must have at least a header row and one data row"*, *"Failed to parse CSV file"*, *"Unsupported file type. Use CSV, PDF, image, Excel, or text."*

### B-47 · CSV header auto-mapping
- **Where:** `CSVD:17-27, 120-139, 403-437`.
- **Does:** for each target field in order — Description, Category, Sell Price, Unit Cost, Unit, Markup %, Cost Type, Waste %, Notes — the **first header, left to right,** whose lowercased text passes the field's test is mapped; one header may be claimed by several fields.
  - Description ← contains `desc` · `item` · `name` (an *Item Code* column left of *Description* wins).
  - Category ← `categ` · `section` · `type` · `trade` (a *Cost Type* column left of *Category* wins).
  - Sell ← `sell` and `price`, or `unit price`, or `rate` (a vendor's *Rate* column becomes the sell price; a bare *Price* header maps to nothing).
  - Cost ← `cost` (a *Cost Type* column left of *Unit Cost* wins).
  - Unit ← exactly `unit` or `uom`, or contains `measure`.
  - Markup ← `markup` · `margin` (a margin-of-revenue column is stored as markup).
  - Cost type ← `cost type` · `labour` · `labor`; Waste ← `waste`; Notes ← `note` · `remark`.
  - No target exists for SKU, a name separate from the description, vendor, tags, subcategory, image or spec. Description is required to continue; any field can be re-pointed or skipped by hand. The export's own header order maps back cleanly (B-57).
- **Data:** —
- **Words:** *"Map your CSV columns to price book fields:"*, *"— Skip —"*, *"{file} — {n} rows detected"*, *"Change file"*, *"Preview"*.

### B-48 · CSV number parsing
- **Where:** `CSVD:230, 234-239`.
- **Does:** `parseNum(v) = parseFloat(v.replace(/[^0-9.-]/g, "")) || 0` — every character except digits, `.` and `-` is deleted, then what is left is parsed:
  - `S$1,234.50` → 1234.5; `15%` → 15.
  - `$4.50/m2` → `4.502` → 4.502 (the unit's digit is glued on); `$85 per 100 sqft` → 85100.
  - `12 - 15` → 12; `(1,200)` (an accounting negative) → 1200; `1.234,56` (comma decimals) → 1.23456.
  - `N/A`, `-`, `—`, `TBC` → 0.
  - Sell: a blank also gives 0, never null. Cost, markup, waste: a blank cell stays absent, but any non-blank text gives its number or **0** — a `N/A` cost imports as a real zero cost, which a quote treats as a free line at 100 % margin (quote-editor B-06).
  - A markup written as a fraction (`0.15`) imports as 0.15 %.
- **Data:** —
- **Words:** —

### B-49 · CSV rows → items
- **Where:** `CSVD:223-242, 262-280`; `PBM:1208-1222`.
- **Does:** rows without a description are dropped silently; `category` defaults to *"General"*, `unit` to *"lot"*; `costType` keeps the raw text (B-08); `notes` is mapped and then **dropped** by the manager (`PBM:1210-1221` never sends it). Rows then go to the write in B-53 with `source "csv_import"`. No length limit, no check that sell ≥ cost, no check that the sell column held a number.
- **Data:** —
- **Words:** *"No valid items to import"*.

### B-50 · The AI parse: the model contract
- **Where:** `PARSE:33-135, 137-274`; `src/lib/ai.ts` (`callOpenRouterJson`, `buildImageMessage`, `buildTextMessage`); tests `src/__tests__/price-book-parser.test.ts:175-243`.
- **Does:** session only; one file ≤ 10 MB (413) or pasted text; MIME from the file type, else the extension. Excel → CSV of the **first non-empty sheet only**; text capped at 100 000 characters (file) or 50 000 (paste); PDF and images go as images. Model `google/gemini-2.5-flash` through OpenRouter, JSON mode, 32 768 max tokens with one retry at 65 536 on truncation or broken JSON, 60 s abort. The prompt asks for every line with a description and a price; `unitPrice` = what the studio charges, `costPrice` = what it pays; with one price column, a vendor rate card → cost, a studio catalogue → sell; markup and waste only when stated; one of four cost types; a 0–1 confidence; no invention; at most 500 rows; `documentText` ≤ 2 000 characters for GST detection. The studio's trade names would be appended to the prompt, but they are read from `studio_price_book_categories`, a table no migration creates, so the list is always empty (B-51). With no key (or `DRY_RUN`) the route returns a canned 7-row result from *"Acme Renovation Supplies"* (*"Prices exclusive of GST."*) as if parsed.
- **Data:** response `{ items[], vendor, detectedGst, rawCount, finalCount, duplicateCount, newCategories }`.
- **Words:** prompt lines *"\"unitPrice\" is the sell price the studio would charge clients. \"costPrice\" is the wholesale rate the studio pays the vendor."*, *"If only one price column exists, decide based on the document tone: a vendor's own rate card → costPrice. A studio's own retail catalogue → unitPrice."*, *"\"confidence\" is your certainty for this row's prices (0.0–1.0). Drop below 0.5 if you guessed."*, *"DO NOT invent items not present in the source. DO NOT extrapolate."*; errors *"Provide a file or paste text"*, *"File too large. Maximum is 10 MB."*, *"Unsupported file type \"{mime}\". Upload PDF, image, CSV or Excel."*, *"Could not read the document. Try again, upload a clearer copy, or use CSV."*, *"No items detected. Try a clearer file or fall back to CSV."*, *"Could not parse document. Try again or upload as CSV."*

### B-51 · The AI parse: post-processing
- **Where:** `PARSE:179-196, 280-332`; `PARSER:19-93, 95-130, 143-173, 184-225`.
- **Does:**
  - **Row drops:** no description; or `unitPrice ≤ 0` (a missing sell counts as 0) with cost missing or ≤ 0. A cost-only row — the vendor rate card the prompt describes — is kept with **sell 0** and imports priced at nothing (B-53).
  - **Units** (`canonicalUnit`): lowercase and trim, look up; else look up again with dots and spaces removed; an unknown unit is kept lower-cased; blank → `lot`. `m2 · m² · sqm · sq.m · sq m · square metre / meter → sqm`; `sqft · sq.ft · sq ft · ft2 · ft² · square foot / feet → sqft`; `rft · running foot / feet → rft`; `rm · running metre / meter · lm · linear metre / meter → rm`; `pc · pcs · piece(s) · unit(s) · nos · no. · no → pcs`; `ft · feet · foot → ft`; `m · metre · meter → m`; `lot`; `set(s) → set`; `hr · hour(s) → hr`; `day(s) → day`; `kg · kilogram → kg`; `l · litre · liter → l`.
  - **Category** (`mapCategory`): blank → *"General"*; no studio names → the label as-is; else exact (case-insensitive); else the name sharing the most words longer than 2 characters (split on space `/ & + -`); else a substring match either way; else the label. With the studio list always empty (B-50), labels pass through unmapped and `newCategories` is always `[]`.
  - **Duplicates:** against the studio's **active** items' descriptions (one read, `.limit(5000)`, capped by B-68): `descriptionSimilarity` = 1 for case-insensitive equality, else the Jaccard of words longer than 2 characters minus *the, and, for, with, from, into, size, type, incl, include, included*; the best score ≥ 0.7 is flagged with its id and text. Name-only items never match.
  - **GST** (`detectGstInclusivity`, on `documentText`): inclusive patterns first — *inclusive of GST*, *GST inclusive / included*, *incl. GST*, *incl. of GST*, *inclusive of VAT / SST / tax*, *price(s) include(s) GST* — then exclusive — *exclusive of GST*, *GST exclusive*, *excl. GST*, *excl. of GST*, *ex GST*, *before GST*, *+ GST*, *plus GST*; else null. Display only (B-06).
  - Kept as given, unvalidated: `markupPercent`, `wastePercent`, `costType`, `notes`, `confidence`.
- **Data:** —
- **Words:** —

### B-52 · Preview and selection
- **Where:** `CSVD:244-260, 441-554`.
- **Does:** AI rows start **ticked, duplicates included** — a flagged duplicate imports unless unticked. Only the first 100 rows are rendered, so rows 101 onward can be neither inspected nor unticked. A row reads *"· verify"* when its confidence is below **0.7** (the prompt told the model to go below 0.5 when guessing) and *"· dupe"* when flagged; neither blocks. CSV rows have no checkboxes and no duplicate check. The preview is read-only: nothing can be corrected before import.
- **Data:** —
- **Words:** *"AI extracted {raw} rows → {final} valid items"*, *"{n} rows look like duplicates of items already in your price book. Untick them below to skip."*, *"New categories will be created: {list}"* (never shown, B-51), *"Vendor {x} will be linked to every imported row. Created automatically if it doesn't already exist."*, *"{n} items ready to import"*, *"· dupe"* (title *"Similar to: {x}"*), *"· verify"*, *"Showing first 100 of {n} items"*, *"Import {n} Items"*.

### B-53 · The import write
- **Where:** `PBM:1171-1223`; `SC:236-250`; `PB:145-285`; `src/lib/vendors/dedupe.ts:15-40`.
- **Does:**
  - **Vendor** (AI path only): the parsed vendor name is matched against active vendors by `normalizeVendorName` (zero-width characters stripped, NFC, trimmed, spaces collapsed, lowercased); if none matches, a vendor of kind `supplier` is created; a failure imports without a vendor after a warning. The id goes on every row as `vendorIds: [id]`.
  - **Category:** the studio trade whose name equals the row's category case-insensitively (active trades only), else **none** — unknown categories are dropped, never created (**corrects** the preview's *"New categories will be created"*).
  - **One request:** all rows go in a single `POST /api/studio-config/price-book` → one multi-row INSERT, all or nothing. One bad row (a markup or waste of 1 000 or more; a concurrent SKU collision) fails the whole file with *"Import failed"* (**corrects** accounts C-33, "then one POST per row").
  - Per row: `description`, `categoryId`, `unitPrice`, `costPrice`, `unit`, `markupPercent`, `costType`, `wastePercent`, `source "ai_parse" | "csv_import"`, `vendorIds`. **No name** (every imported item needs one before its first edit, B-16), no SKU (fresh `PB-NNN` each time), no notes, no tags.
  - Approval follows the importer's tag (B-23): an untrusted import lands wholly pending, with a task and a notification per row (B-29).
  - Nothing records the import itself — no batch id, no file name, no count, no undo; only `source` and `created_at` tell the rows apart.
- **Data:** `studio_price_book`, `vendors`.
- **Words:** *"Importing {n} items…"*, *"Import Complete"*, *"{n} items added to your price book"*; toasts *"Imported {n} items to price book"*, *"Import failed"*, *"Imported items without vendor attribution"*.

### B-54 · No dedupe, merge or update-in-place
- **Where:** `PB:194-213`; `CSVD:246-260`; `PARSER:212-225`.
- **Does:** every import inserts new rows. At write time nothing matches a SKU, name or description against the book; there is no "update the prices of items I already have", no merge of duplicates, no replace-the-catalogue mode and no price-list versioning. Re-importing a supplier's updated list doubles the book: the AI path flags ≥ 0.7 look-alikes for manual unticking, the CSV path doesn't look. The SKU unique index can't help, because imports never carry a SKU.
- **Data:** —
- **Words:** —

### B-55 · The Quote Categories CSV importer and the 100× price bug
- **Where:** `src/app/(main)/accounts/page.tsx:1759-1779`; `src/components/leads/csv-import-dialog.tsx:11-17, 57-105`; accounts C-10; quote-editor B-74.
- **Does:** a second, older importer below the trade editor. Mapping (first header left to right): description ← `desc · item · name`; category ← `categ · section · type`; **unit price ← `price · rate · cost`** (a cost column can become the sell); **unit ← any header containing `unit`** (a *Unit Price* column left of *Unit* fills the unit with a number); qty ← `qty · quant · amount`. The price is parsed in currency units (same deletion rule as B-48), then the page sends `unitPrice: Math.round(unitPrice × 100)` — cents into the dollars column: **12.50 lands as 1 250.00** (`Math.round` keeps whole cents, so what is stored is the price in cents). Category and qty are mapped and then dropped; no cost, markup, name or vendor; `source "csv_import"`. It posts through the add route, so the edit right, the approval and the per-row tasks apply (B-13), while the button shows to every role.
- **Data:** `studio_price_book.unit_price`.
- **Words:** *"Import Price Book from CSV"*; dialog words in quote-editor B-74.

### B-56 · Two import routes nothing calls
- **Where:** `src/app/api/price-book/import/route.ts:6-157`; `src/app/api/quotes/import/route.ts:11-98`; `src/__tests__/price-book-parser.test.ts:289-348`.
- **Does:** both use the service role and check only the session — no edit right, no approval fields (rows take the default `approved`), no SKU, no embedding, no history. `/api/price-book/import` creates missing trades (`order_index` = the studio's trade count + i, inactive trades counted), finds a vendor by `ilike` on the name or creates one without a kind, writes `vendor_ids` but not `vendor_id`, defaults unit *"lot"* and description *"(no description)"*. `/api/quotes/import` upserts missing trades on `(studio_id, name)` (reviving inactive ones) and inserts description, trade, price and unit. The parser test pins the first route's vendor behaviour although nothing in the app posts to it.
- **Data:** —
- **Words:** *"Invalid request body"*, *"No items to import"*, *"Failed to insert items"*, *"Import failed"*; *"No items provided"*, *"Failed to import items"*.

### B-57 · Export
- **Where:** `src/app/api/price-book/export/route.ts:6-73`; `PBM:598-604, 1150-1162`.
- **Does:** session only; one unpaged read of every row of the studio — archived, pending and rejected included — newest first (a large book is cut at the read cap, B-68). Columns `Description, Category, Sell Price, Unit Cost, Unit, Markup %, Cost Type, Waste %, Vendor, Tags, Notes, Active`; vendor = the scalar `vendor_id` join only; numbers raw; a text cell starting `= + - @ tab CR` gets a leading `'`; cells with a comma, quote or newline are quoted. Not exported: name, SKU, subcategory, tiers, extra vendors, spec, image, approval status, creator. Round trip: the headers map straight back onto the CSV importer (B-47), but a name-only item exports with an empty *Description* and is dropped on re-import, every re-imported row gets a new SKU, and archived rows come back active.
- **Data:** —
- **Words:** file *"price-book-export.csv"*; *"Export items"*, *"Download every active item as a CSV. Useful for back-office reconciliation."* (archived rows too, quote-editor B-101); 401 *"Unauthorized"*; 500 *"Failed to fetch price book"*, *"Export failed"*.

### B-58 · Operator seed scripts
- **Where:** `scripts/seed/seed-default-pricebook.mjs:1-26, 61, 134-183`; `scripts/seed/catalogue-sg-default.mjs:1-16, 36-37`; `scripts/tenants/flo-design/seed-pricebook.mjs:1-18, 54, 330-360`.
- **Does:** service-role scripts, dry run unless `--write`. *platform-default*: SG studios only; `--all-empty-sg` targets only studios with **zero** items; upserts 16 trades (with `order_index`), deletes the studio's `source='platform-default'` rows and inserts 195 rows in chunks of 50 with `cost = round2(sell × (1 − margin))` and `markup = round1((sell − cost) / cost × 100)` (a consistent triangle), `cost_type combined`, `waste 0`, no name, no SKU. *flo-seed*: the same for one fixed studio (~170 rows, `source 'flo-seed'`). Both take the default `approved`, write no embedding, and on a re-run delete and re-insert — lines linked to the old rows keep dangling links and the rows' history is cascaded away.
- **Data:** `studio_price_book`, `studio_quote_categories`.
- **Words:** —

---

## Finding book items from a quote

### B-59 · Typeahead in the line panel
- **Where:** `src/components/leads/price-book-combobox.tsx:62-117, 170-200`; `PBE:711-775`; `PB:70-71`; `QDD:1396`.
- **Does:** from 2 typed characters: keep active items (pending and restored-rejected included) whose name, description, trade name or SKU contains the text as a lowercase substring; take the **first 8 in book order** (`order_index ASC NULLS LAST, created_at DESC` — drag order, then newest first); group rows sharing a name (else description), case-insensitively; inside a group sort by sell ascending, nulls last; each group keeps the position of its first member. No relevance ranking, no typo tolerance, no multi-word logic, no approval status shown. Arrow keys skip group headers; Enter picks. The typeahead lives only in the line side panel's *Item Name* (not in the grid).
- **Data:** —
- **Words:** *"Type 2+ chars to search the price book ({n} items)"*, *"{n} variants"*, *"No vendor"*, *"Uncategorised"*, *"(mkt: {cs}{min}–{cs}{max})"*, *"cost: {cs}{x}"*, *"{n} matches · Arrow keys to navigate, Enter to select"*.

### B-60 · Browse search
- **Where:** `src/lib/leads/pricebook-search.ts:17-86`; `src/components/leads/browse-price-book-modal.tsx:72-159`; tests `src/__tests__/pricebook-search.test.tsx`.
- **Does:** over active items, optionally narrowed to one vendor (any of the item's vendors), **every** whitespace term of the query must match the joined `name + description + trade + subcategory` text (lowercased, diacritics stripped, non-alphanumerics → space): as a substring, as a word prefix, or within a bounded Levenshtein of the same-length prefix of a word — 0 edits for terms of ≤ 2 characters, 1 for 3–4, 2 for 5 or more (`maxDistForLen`). Results are filtered, not ranked: grouped by trade A–Z with *"Uncategorised"* last, book order inside a group.
- **Data:** —
- **Words:** quote-editor B-77.

### B-61 · The matcher (`matchItemsToPriceBook`)
- **Where:** `MATCH:15-72, 81-134, 155-231`.
- **Does:** each incoming line is scored against every book row it is given.
  - Tokens: lowercase, non-alphanumerics → space, words longer than one character; expanded with the synonym table (e.g. *hacking ↔ demolition / removal / teardown*, *wc ↔ toilet / water closet*, *mixer ↔ tap / faucet*, *db ↔ distribution board*, *vinyl ↔ spc / lvt*, *homogeneous ↔ porcelain / ceramic*, *false ceiling ↔ plaster / gypsum / suspended ceiling*, *sqft ↔ sq ft / square feet*). The book side uses **description only**.
  - `score = 0.70 × Jaccard + 0.15 × category + 0.15 × unit`. Category: the line's trade contains the book's → 1; the book's contains the line's → 0.8; else 0 (empty on either side → 0). Unit: equal strings → 1 — **two empty units count as equal**; one contains the other → 0.7; else 0.
  - The best score wins; the first row wins ties. Tier `high` ≥ 0.75, `suggested` ≥ 0.50, else `none` (no item returned). With both bonuses a `high` needs Jaccard ≥ 0.643; with no trade (the scan, B-65) and a unit match, ≥ 0.857, and `suggested` ≥ 0.5.
  - `priceDiscrepancy` = both prices > 0 and `|line − book| / book × 100 > 15`, rounded to 1 dp (B-45). Also quote-editor B-81.
- **Data:** —
- **Words:** —

### B-62 · Name-only items are invisible to every automatic matcher
- **Where:** `PBE:426-431, 473, 797`; `MATCH:173`; `LI:394`; `src/lib/queries/price-book.ts:56`; `src/components/accounts/price-drift-summary.tsx:49`; `src/app/api/cron/price-drift/route.ts:71-74`; `PB:265-267`; `PBID:122, 186`; `PARSE:188-196`; `src/app/api/price-book/export/route.ts:34`; `src/app/api/quotes/chat/route.ts:75`.
- **Does:** the editor requires a name and labels the description optional, so a new item can be saved with `description = ""`. Every engine that reads the book reads `description` alone: the quote matcher (save-time cost match, background auto-match, suggestion scan), the drift badge, card and cron, the embedding (skipped for an empty description, so the drafter's search never finds the item), the crowd signal, the AI parse's duplicate check, the export and the drafter's price-book index samples. Such an item is still found by the typeahead, browse, the Items search and the Items / Drift-tab drift, which use `name || description`. The same holds on the quote side: the save-time cost match reads the line's description, so a line typed with only an *Item Name* is never matched to the book.
- **Data:** —
- **Words:** *"(optional, specs)"*.

### B-63 · Cost auto-match on every quote save
- **Where:** `LI:368-417, 455-467`.
- **Does:** candidates = lines priced as `amount` (not lump sums), `unitPrice > 0`, cost null or ≤ 0, and no link. One unpaged read of the studio's active items (pending included) with trade and vendor names; the matcher (B-61) with the line's trade and unit; only `high` matches apply. What is applied is narrower than it looks: the book's cost fills `cost_price` only when the line's cost is **null** — a line saved with cost 0 keeps 0 yet still gets the link; waste fills only when the line sends none; cost type and vendor fill when absent; `price_book_item_id` and `price_snapshot_at = now` are set. Sell and markup are never touched, so the line's stored markup is not re-derived from the new cost. Failures are logged and never block the save. It runs on every save, autosaves included, for every unlinked line (**refines** quote-editor B-82).
- **Data:** `quote_line_items.cost_price · price_book_item_id · waste_percent · cost_type · vendor_id · price_snapshot_at`.
- **Words:** —

### B-64 · Auto-match after a parse
- **Where:** `QDD:3275-3355`; `AM:47-137`.
- **Does:** after an upload is parsed, the editor posts the parsed lines (description, trade, unit, price) to `/api/quotes/auto-match` in the background; the route reads the studio's active items ordered by description (unpaged, B-68) and returns per line the matcher's result with the book's sell, cost, waste, cost type and primary vendor. For `high` matches only, the editor sets the link, `costPrice = book cost ?? line cost`, and **overwrites** `wastePercent = book ?? 0`, `costType = book ?? null`, `vendorId = book primary ?? null`, `priceSnapshotAt = now`, then autosaves (chained behind the first save so ids are real; dropped if the user re-uploads meanwhile). The parsed selling price is kept and the stored markup not re-derived. The review panel that would also apply `suggested` matches and copy the book's stored markup is unreachable (quote-editor B-83).
- **Data:** —
- **Words:** *"Couldn't auto-match price book in background. Use the Auto-Match button when you're ready."* (no such button exists), *"Couldn't save price-book matches — your edits stayed local. Try Save Draft manually."*

### B-65 · The suggestion scan
- **Where:** `SCAN:23-173`; `src/lib/price-book-suggester.ts:61-109`; `QDD:891-913, 954, 3376`; `src/components/copilot/meeting-brief.tsx:401-420`; `M115:49-53`; `src/components/leads/new-items-suggestion-modal.tsx:45-50`.
- **Does:** fired with the new line ids after a parse autosave (`pdf_parse`), an AI drafting turn (`ai_generation`) and a meeting-brief quote (`copilot`); `submit_review` and `manual` are accepted but nothing sends them, and the modal's bypass action for a submit-time check has no caller. Session only. Reads the lines (studio-scoped), keeps the unlinked ones, reads the studio's active items **without trade names** (the category term scores 0) in one unpaged read (B-68), and partitions: `high` **and** `suggested` (≥ 0.50) are linked silently — `price_book_item_id` only, no cost, no snapshot; `none` becomes a `pending` suggestion row. The unique index allows one suggestion per line **for its lifetime**, and the rows go in one multi-row insert whose unique-violation (23505) is swallowed — so if any line in the batch already had a suggestion, the insert fails as a whole and the batch's new lines get none (inferred from single-statement semantics; not run). The response lists the pending rows for those lines; the editor opens the modal when there are any.
- **Data:** `price_book_suggestions (source_event, description, name, category_name, unit_price, cost_price, unit, qty, match_tier 'none', match_confidence, status, created_by)`; `quote_line_items.price_book_item_id`.
- **Words:** 400 *"source is required and must be one of: pdf_parse, ai_generation, copilot, submit_review, manual"*.

### B-66 · Adding suggestions to the book
- **Where:** `BULK:43-323`; `src/components/leads/new-items-suggestion-modal.tsx:64-172`; `PBM:619-630, 1261-1266`; `src/lib/queries/price-book-suggestions.ts:117-135`.
- **Does:** the modal pre-fills name (the line's name, else description), sell and cost from the line, SKU blank, **trade blank** — the suggestion's `category_name` is ignored — and every row ticked. *Add* posts to the bulk route, which checks **only the session** (no edit right). Per row it inserts `description`, `category_id`, `unit_price`, `unit`, `cost_price`, `name`, SKU (B-14), `source "manual"`, approval by tag — no markup, cost type, waste, vendor, tags or embedding; for an untrusted adder, a task to the configured approver ?? owner ?? admin and a pending notification. Then it marks the suggestion `added` with `added_to_price_book_id` and links the source line. A missing suggestion row still inserts the item; an `added` or `dismissed` one fails with *"Already {status}"*. *Dismiss* sets `dismissed` + `dismissed_by`; a dismissed line is never suggested again. The Items tab's *"Review {n} new items"* lists every pending suggestion of the studio to every viewer.
- **Data:** `price_book_suggestions`, `studio_price_book`, `tasks`.
- **Words:** quote-editor B-84.

### B-67 · Semantic search over the book (the drafter)
- **Where:** `M289:1-35`; `EXE:65-98`; `M288:8-13`; `src/lib/quote-agent/tools.ts:170-178`.
- **Does:** `match_price_book_items(studio, embedding, count, max_distance)`: the studio's rows with an embedding, `is_active = true` and `approval_status != 'rejected'`, cosine distance `<=>` ≤ 0.35 (about 0.65 similarity), nearest first, `LIMIT count` (`limit_per_query` 1–10, default 5). Returns `id, description, unit, unit_price, cost_price, category_id, distance` — no name, tiers, markup or vendor. The query text is the model's search phrase. This is the only book read that excludes restored-rejected items (B-28).
- **Data:** `studio_price_book.embedding`.
- **Words:** —

### B-68 · Reads that stop at the response cap
- **Where:** `PB:62-80` (the list route pages, commenting *"PostgREST caps a single response at 1000"*); unpaged: `SCAN:66-70`, `AM:56-61`, `LI:381-385`, `PARSE:188-193` (`.limit(5000)`), `src/app/api/price-book/export/route.ts:16-20`, `src/app/api/cron/price-drift/route.ts:44-57`, `src/app/api/cron/aggregate-rates/route.ts:39-45`, `src/app/api/quotes/chat/route.ts:54`; `src/lib/quote-agent/fallback.ts:74-79` (`.limit(200)`, deliberate); `PBM:176-179`.
- **Does:** only the Items list pages through the book (1 000-row pages). Every other server read of the book or of the signals is a single request, so for a book beyond the cap (the manager cites El Arte at 6.3k+ items) the save-time cost match, the background auto-match, the scan and the AI parse's duplicate check see only part of it — for the scan, that means *"New items found"* for items the book already holds — the export and the drift cron cover only part, and the aggregate cron drops the later signal groups. Which rows survive follows each read's order (description, `created_at`, or none). Effect inferred from the list route's own comment; the cap is a project setting not in the repo.
- **Data:** —
- **Words:** —

---

## What a quote line takes from the book

### B-69 · Copy or link, path by path
- **Where:** `PBE:717-759, 565-599, 612-657`; `src/components/leads/browse-price-book-modal.tsx:203-257`; `QDD:3321-3332, 3566-3590, 4092`; `LI:455-465, 563-567`; `SCAN:101-118`; `BULK:293-300`; `EXE:524-646`; `src/lib/quote-agent/fallback.ts:94-121`; `src/lib/leads/map-package-items.ts:40-65`; templates C-46.
- **Does:** every path **copies** figures and most keep a **soft link**; none reads the book again later (B-72).

| Path | Sell | Cost | Markup | Other fields copied | Link | Snapshot | `source` |
|---|---|---|---|---|---|---|---|
| Typeahead pick (line panel) | book ?? line | book ?? line | **stored** book markup ?? line | name (else description), SKU, specs, unit, cost type, waste, primary vendor, image, spec, notes, trade name | yes | now | unchanged (`manual` when new) |
| Browse add | book ?? 0 | book | **stored** book markup | name / description, trade (*Others* when none), subcategory (flag, quote-editor B-88), unit (*lot*), waste, cost type, chosen vendor, image, spec — not SKU or notes; qty 1 | yes | now | `price_book` |
| Background auto-match (`high`) | parsed | book ?? parsed | unchanged | waste, cost type, vendor (overwritten) | yes | now | unchanged |
| Review-panel accept (unreachable) | line | book | **stored** book markup | waste, cost type, vendor | yes | now | `price_book` |
| Cost match on save (`high`) | line | book, only if null | unchanged | waste / cost type / vendor when absent | yes | now | unchanged |
| Suggestion scan (`high` or `suggested`) | — | — | — | nothing | yes | — | unchanged |
| Suggestion added to the book | — | — | — | nothing | yes (the new item) | — | unchanged |
| AI drafter with `price_book_item_id` | **book** (the model's number replaced) | book | the model's, else **30** | description as name | yes | — | `ai_drafted` / `ai_estimated` / `needs_pricing` |
| Fallback draft | book | — | 30 | name, description, trade, unit; qty 1 | **no** | — | `ai_estimated` |
| Package apply | the package's copy | the package's copy | the package's copy | vendor snapshot | the package's `priceBookItemId` | — | — |
| Quote rule (*Starter Quote*) | the rule's cents ÷ 100 | — | the rule's bps ÷ 100 | description, trade | the rule's `price_book_id` | — | `template` |
| *Also save to price book* | line | line | line | (line → book, B-73) | yes (the new item) | — | unchanged |

- No path applies a quantity tier (B-12); no path copies the item's tags or tiers; only the typeahead and *Also save* carry the SKU; lines keep the trade **name** (B-70). The line column `unit_price` is `NUMERIC(12,2)` (B-04).
- **Data:** `quote_line_items`.
- **Words:** —

### B-70 · Trade (category) mapping between the book and quotes
- **Where:** `PB:68`; `src/lib/transformers.ts:1008`; `PBE:173-178, 752, 829-853`; `src/components/leads/browse-price-book-modal.tsx:219`; `PBM:411, 1212`; `MATCH:191-194`; `SCAN:73-85`; accounts C-07…C-09; quote-editor B-89…B-91.
- **Does:** the book files an item under a trade **by id** (`category_id → studio_quote_categories ON DELETE SET NULL`); a quote line keeps the trade **name** as free text. Book → line: the name comes through the item's join, which has no active filter, so an item filed under a renamed or deleted trade still puts the old name on new lines (and so a section after the listed trades, accounts C-07). Browse falls back to *"Others"*; the typeahead keeps the line's trade when the item has none; the fallback draft uses *"Others"*. Line → book (*Also save*): the id the panel opened with (B-73). Imports and the seed: an exact name match against active trades (case-insensitive for imports, case-sensitive for the seed), else none. Suggestion adds: whatever the modal's picker says (blank by default). The matcher gives up to 15 % for name containment; the scan loads no trade names. There is no mapping table between a book trade and a quote section, and no per-trade default (markup, GST, unit).
- **Data:** `studio_price_book.category_id`; `quote_line_items.category`.
- **Words:** —

### B-71 · The vendor a line gets from the book
- **Where:** `PBE:223-236, 310-334`; `src/components/leads/browse-price-book-modal.tsx:86-109`; `QDD:3330`; `LI:464`; `M135:1-16`; `src/lib/transformers.ts:989-1001`; quote-editor B-67.
- **Does:** an item holds an ordered `vendor_ids[]` (first = primary, mirrored in `vendor_id`); a line holds one `vendor_id`. The typeahead takes the primary; browse takes the row's pick, else the vendor filter when it supplies the item, else the primary; auto-match and the cost match take the primary. In the line panel, a line linked to an item with vendors may only pick from that item's **current** list, and a stale line vendor outside it is cleared (`PBE:328-334`) — one of the few ways a later book change reaches an existing line (B-72). The line's vendor pre-fills purchase orders (finance; hand-off C).
- **Data:** `studio_price_book.vendor_ids · vendor_id`; `quote_line_items.vendor_id`.
- **Words:** quote-editor B-67.

### B-72 · After a line exists: what later book changes reach it
- **Where:** `src/components/leads/quote-row.tsx:249-258`; `QDD:3437-3446`; `PBE:314-334`; `src/app/api/projects/[id]/materials/route.ts:219-222`; `DEL:12-16`.
- **Does:** a line's sell, cost, markup, unit, name and description never change when the item changes — not after a drift *Suggest*, a vendor markup or a rejection. What does reach it, read live from the cached book: the *"Pending approval"* / *"Library item rejected"* chip (B-24); a tier price, only when the line's qty is next edited (B-12); the item's current vendor list as the line panel's pick-list (B-71). After a hard delete all three stop silently (the link dangles). Project materials read the link and do nothing with it (*"Not directly stored on PO items — skip this for now"*). There is no "update from price book" action (B-45).
- **Data:** —
- **Words:** —

### B-73 · *Also save to price book* (line → book)
- **Where:** `PBE:173-178, 289-300, 565-599, 1398-1426`; `QDD:9965-9967`; quote-editor B-79.
- **Does:** only when **adding** a line in the panel; unticked by default; disabled while the line is an untouched typeahead pick (same SKU and name). When ticked, before the line is built, one add (B-13) posts the line's description, trade id, sell, unit, cost, markup, cost type, waste, vendors, image, spec, notes, name and SKU (with the `|| undefined` coercions of B-16), so approval, `PB-NNN` and the embedding apply; the line adopts the new SKU and link. The trade id is the one resolved when the panel **opened** (`initialCategoryId`): picking another trade in the panel changes the line but not the item (in line mode `categoryId` is never updated) — the item is filed under the original trade, or none when that name is not an active trade. A 403 or any failure still saves the line. Editing an existing line never writes back to the book; the parent ignores the flag it is handed (`QDD:9965-9967`).
- **Data:** —
- **Words:** *"Also save to price book"*, title *"This item is already in the price book — change the item name or ID to save it as a new variant."*, toasts *"Saved to price book"*, *"Saved to quote, but price-book sync failed"*.

### B-74 · Packages and quote rules that carry book items
- **Where:** `src/lib/leads/map-package-items.ts:21-101`; `M305:1-11`; `src/lib/quote-rule-engine.ts:12, 55`; `QDD:4092`; templates C-02, C-13, C-16, C-17, C-31, C-43…C-46.
- **Does:** a package item stores its own copy of sell, cost and markup plus `priceBookItemId` and a vendor snapshot (`M305`: the link "as the source of truth", the snapshot "so a package still names its supplier after the price-book row is deleted"). Applying a package copies the **package's** figures — the book is not re-read, so a package keeps the prices it was saved with. The package editor reaches the book only through the line panel's typeahead (templates C-16). A quote-rule line keeps `price_book_id` with its own `default_unit_price_cents` / `default_margin_bps`, captured when the rule was saved; *Starter Quote* de-duplicates by `priceBookId`, then by description, and copies the rule's numbers (templates C-44, C-46).
- **Data:** `studio_assemblies.items[]`; `quote_generation_rules.line_items[]`.
- **Words:** templates C-16, C-45.

---

## AI around the book

### B-75 · Every model call that touches the book
- **Where:** `PARSE:38, 211-244`; `src/lib/ai.ts:461-493`; `EXE:71-98, 349-391`; `src/lib/quote-agent/loop.ts:13`; `src/app/api/quotes/chat/route.ts:51-95`; `src/lib/quote-agent/system-prompt.ts:171-181`; `src/app/api/quotes/insights/route.ts:12, 346-373`; X-Ray B-112.
- **Does:** the book meets a model in these places only:

| Call | Model | What it reads from the book | What it writes |
|---|---|---|---|
| Supplier document parse | `google/gemini-2.5-flash` | nothing (the trade list it would get is always empty, B-50) | rows for the import preview (B-51) |
| Item embedding | `openai/text-embedding-3-small` | the item's description | `studio_price_book.embedding` (B-20) |
| Drafter search | the same embedding model, on the query | nearest items (B-67) | — |
| Drafter chat (`search_pricebook`, `add_line_items`) | `google/gemini-2.5-flash` | a prompt index — per trade, the item count and up to 3 sample descriptions, from **every** row (archived and rejected included, one unpaged read) | lines on the quote, never the book (B-76) |
| Quote AI insights | `google/gemini-2.5-flash` | nothing — the region's market rates instead | — |
| Quote X-Ray | several | nothing — market rates only (X-Ray B-54…B-59) | — |

- No model suggests or checks a price for a book item, reprices the book, compares a supplier's new list with existing items, or reads tiers, markup or vendors. The suggestion scan and every matcher are plain code (B-61, B-65).
- **Data:** —
- **Words:** system prompt *"## Price book index"* · *"Studio has {n} items across {m} categories:"* · *"Use search_pricebook (bulk — pass an array of queries) to fetch real unit prices. Always prefer one bulk call over many single-query calls."*; with no items *"Studio has NOT configured a price book. search_pricebook still works — it falls through to regional market rates and a live web search for every query."* (first sentences).

### B-76 · The drafter's price-book tier and its checks
- **Where:** `EXE:65-111, 342-391, 473-687`; `src/lib/quote-agent/tools.ts:170-178, 386-395`; `src/lib/quote-agent/system-prompt.ts:83-96, 119`; `M290:1-30`; quote-editor B-86.
- **Does:** `search_pricebook` takes at most 30 queries (more are clamped) and resolves each through: the book (semantic, B-67; any hit ends the cascade) → the **session region's** market rates (`rate_typical` if > 0, else `round((min + max) / 2)` in whole units; a row with no usable rate is dropped) → a web search (at most 5 per call) → `none`. `add_line_items` then **verifies every line naming a `price_book_item_id`**: the item is looked up by id within the studio (no active or approval filter); the book's `unit_price` and `cost_price` replace the model's numbers, a disagreement is reported as a corrected mismatch; an id that can't be found, or an item without a sell, lands the line at 0 as `needs_pricing`; a found item without a cost lands as `ai_estimated`. The line's markup is the model's `margin_percent` or **30** — never the book's; no tier, snapshot, vendor or waste is carried.
- **Data:** `quote_line_items.source ∈ ai_drafted · ai_estimated · market_rate · web_estimated · needs_pricing` (`M290`).
- **Words:** tool summaries *"Searched price book · {n} queries · {r} resolved, {u} unresolved"*, *"Added {n} line items"*, *"{n} without cost"*, *"{n} need pricing (price book row has no price)"*, *"corrected {n} price mismatch(es)"*; retry hint *"Re-add skipped items: for 'no unit_price' rows use whatever search_pricebook resolved, or unit_price: 0 with source: \"needs_pricing\" when it resolved nothing. Never invent a price."*

### B-77 · The fallback draft
- **Where:** `src/lib/quote-agent/fallback.ts:62-128`.
- **Does:** when the drafter fails and the studio has at least 10 active items among the first 200 read, the draft is the **first three items of each trade** in read order — no ranking, no relation to the brief — each at qty 1 with the book's sell, no cost, markup 30, no link, `source "ai_estimated"`; fewer than 15 lines in total → a zero-priced baseline skeleton instead.
- **Data:** —
- **Words:** *"Fallback draft — price book match. Review qty and price before sending."*

---

## Tests and docs

### B-78 · Tests that cover the engine
- **Where:** `src/__tests__/price-book-parser.test.ts`; `pricebook-search.test.tsx`; `price-book-combobox.test.tsx`; `price-book-embedding-fanout.test.ts`; `price-book-subcategory.test.tsx`; `browse-price-book-vendor.test.tsx`; `price-book-suggestions-scoped-api.test.ts`; `h2-multi-vendor.test.ts`; `h2-per-line-vendor-pick.test.ts`; `focused-grid-write.test.ts:113-170`; `customization-p2.test.ts:188-214`; `studio-config-scoped-api.test.ts:128-131, 251-265`; `quote-cost-margin.test.ts`; `quote-agent-price-verification.test.ts`; `quote-agent-search-cascade.test.ts`; `quote-agent-price-book-embeddings.test.ts`; `quote-cluster-b.test.ts` (all under `src/__tests__/`).
- **Does:** covered — the parser helpers (units, GST patterns, category map, similarity, duplicates); the parse route and the import dialog by **source-text** assertions; browse search and vendor picking; subcategory carry; a tier re-price through a qty paste; the quote triangle; the embedding fan-out's `after()`; the presence of the edit-right gate (a source regex); the history GET's auth; the suggestions GET's scoping; the drafter's verification and cascade; the units union. **Not covered:** the approval state machine and the approve / reject / notify routes; the PATCH's history and field diffs; SKU generation; reorder; vendor markup; the tiers route and `resolveTieredPrice` on its own; both matchers (`matchItemsToPriceBook`, `matchDescriptionToMarketRate`); the scan and bulk routes; drift in any of its five copies; both crons; the crowd collector; the export; the Quote Categories importer's ×100.
- **Data:** —
- **Words:** —

### B-79 · Docs and comments against the code
- **Where:** `docs/prd/05-price-book.md:46-72`; `M114:2-5`; `M115:8-14`; `M160:3-15`; `DEL:9-19`; `NOTIFY:52-59`; `src/app/(main)/accounts/page.tsx:1700-1713`; `PBM:1146, 1160`; `CSVD:474`; `PARSER:257`; `src/components/price-book/drift-tab.tsx:7-8, 167`; `src/lib/queries/price-book.ts:20-22`; `src/app/api/studio-config/platform-market-rates/route.ts:5-8, 26` against `M264:1-79`, `M278:4` and `src/app/api/quote-xrays/create/route.ts:332-335`; feature-requirements CSV rows 15 and 32 (quote-editor B-103).
- **Does:** where they disagree, the code wins:
  - PRD: *"paginated fetches … avoid the 1000-row cap"* — only the Items list pages (B-68); *"explicit pricing calculation"* — the calculation-direction toggle was removed (`PBE:874-877`); *"Concurrent edits → time-of-check/time-of-use race handled in the backend"* — only approve, reject and delete re-check by `id + studio_id`; the SKU and suggestion races remain (B-14, B-65).
  - `M114`: items from members with "tags = {id} only" start pending — it is any member without the owner / admin tag, and only if the edit right was granted (B-22).
  - `M160`: the suggestion route writes `approver_user_id` and the notify route reads it — neither does (B-23).
  - `M115`: a line "never re-prompts" — true, and one earlier suggestion also blocks the rest of a batch (B-65).
  - `DEL` comment: suggestions keep a dangling `added_to_price_book_id` — the FK nulls it (B-18).
  - `NOTIFY` comment: a fixed recipient stops the fan-out to every owner and admin — the dispatcher still adds the `pricing` roles (B-31).
  - Approver picker: *"Owners are always in the loop; add extra members to share the load."* — one approver notified, one owner tasked (B-30).
  - *"New categories will be created: …"* and the parser's "will be created on import" — never (B-51, B-53); *"The parser auto-detects vendors and de-duplicates."* — it flags, the user unticks (B-52); *"Download every active item as a CSV."* — archived rows too (B-57).
  - Drift tab: *"Market median"* / "Use market median" — the midpoint of min and max (B-41). The count hook "mirrors" the manager "so the tab badge and the inline summary card never disagree" — they match different text (B-40).
  - The market-rates route says the table "is NOT locked" and reads it through the scoped `authenticated` client, while `M264` revokes every grant on it from `anon` **and** `authenticated` and enables RLS with no policy (`M278:4` calls this the "service-role" pattern, and Quote X-Ray reads the same table through the service role because "the scoped/anon role has no SELECT grant on it", `src/app/api/quote-xrays/create/route.ts:332-335, 664-665`). On a database with 264 applied, the studio-facing read should fail, leaving the drift chips, pill, tab, badge, summary card and *Seed* dark, while the service-role cron still sends *"{n} Price Book Items Need Review"* to a tab that shows *"No market rates available"* (inferred; not run — see Uncertain).
- **Data:** —
- **Words:** —

### B-80 · Earlier inventories corrected or refined here
- **Where:** the rows cited in each item.
- **Does:**
  - accounts C-33, "then one POST per row" → one POST and one all-or-nothing insert (B-53); quote-editor B-72's "each row is POSTed" reads the same way.
  - quote-editor B-63, suggestions keep "a dangling `added_to_price_book_id`" → `ON DELETE SET NULL` (B-18).
  - quote-editor B-85, "there is no backfill" → an operator backfill script exists (B-20).
  - quote-editor B-82, costs filled "where the line had none" → only a **null** cost is filled; a 0 cost is kept while the link is still set (B-63).
  - quote-editor B-61, a trusted edit of a pending row approves it → yes, but without re-activating it or telling the submitter, and a trusted edit never clears *Rejected* (B-23, B-28).
  - quote-editor B-57 and accounts C-30, "role grants and member overrides win" → role grants do; member overrides are never applied to `pricebook.edit` (B-22).
  - accounts C-30 / quote-editor B-57, the market-rate read behind drift and *Seed* → may be refused on databases with `M264` (B-79).
- **Data:** —
- **Words:** —

---

## Uncertain / not verified

- **The 1 000-row read cap.** Taken from the list route's own comment (`PB:62`). The project's PostgREST `max-rows` setting is not in the repo; if it is higher (or unset) the partial reads of B-68 are complete.
- **`M264` against the studio market-rate read.** Whether 264 was applied on each environment, and whether any grant on `platform_market_rates` to `authenticated` was restored outside the repo, was not checked (the X-Ray route's comment implies the grant is absent where it runs). If 264 is absent (or rolled back by its `_down`), the reads work and drift behaves as B-40 describes.
- **Fallback paths on a vendor FK error (B-13, B-15).** Inferred from the substring test on the error message; the exact PostgREST message for `studio_price_book_vendor_id_fkey` was not observed, and whether a stale vendor id can reach the editor after vendor merges (313) was not traced.
- **Self-approval by a crafted PATCH (B-32).** Read from the passthrough; RLS (`M226`) scopes rows to the studio but no column-level rule was found. Not attempted.
- **Single-statement atomicity** (the import's all-or-nothing, the scan's lost batch) follows standard PostgreSQL behaviour for one multi-row INSERT; not observed.
- **Notification recipients (B-31).** Inferred from `dispatch.ts` and `resolve-recipients.ts` plus the `M112` seed; a studio's own `pricing` preference rows may name other roles, and the per-member page overrides can drop recipients.
- **Numeric overflow at 1 000 %** (B-04, B-53) relies on the migrations' `NUMERIC(5,2)`; live column types were not inspected.
- **`studio_price_book.subcategory`** is written and read, but its migration (`215_…`) is only named in `M234:16`; no file is in the repo (as quote-editor noted).
- **`studio_price_book_categories`** — read by the AI parse, created by no migration. If some fork has it, the parse would map categories and show *"New categories will be created"* — and still create none.
- **El Arte's 6.3k-item book.** The onboarding spec (`docs/superpowers/specs/2026-05-27-elarte-pricebook-onboarding-design.md`) names scripts under `scripts/tenants/elarte/` that are not in the repo; how those rows were loaded (source, approval, names, embeddings) is unknown.
- **`getCountryCode()`** is set from the session payload (`src/lib/supabase.ts:20-26`); that it always equals `studios.country_code` (which the cron uses) was not traced.
- **The Tasks page's generic *Completed* move** on a price-book task (B-29) is read from `bulkMoveTasksTo`; the single-row status dropdown was not traced.
- **`vendorNames` / `vendorIds` misalignment and scalar-vs-array vendor drift** (B-07, B-71) are inferred from the transformer and the vendor-markup route; not reproduced.
- **Tier edge cases** (gaps, overlaps, `min > max`) in B-11 are reasoned from `resolveTieredPrice`, not run.
- **Drift percentages near the threshold** use JavaScript floating point (`rate × 0.85`, `× 1.15`); borderline prices were not checked.
