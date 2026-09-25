# OpenMaison 1.0 — Quote editor inventory · Slice B: money on a quote and the price book

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-24.

Conventions: *Words* are quoted verbatim from code. "Hand-off" = owned by another reader (A editor surface and lines / C lifecycle, approval, payments, signing / D data model) or the templates audit, and only named here. `QDD` = `src/components/leads/quote-digitizer-dialog.tsx` (the editor, 10,830 lines). Citations of the templates inventories read "templates A-nn / B-nn / C-nn / D-nn" (`../quote-templates-1.0-inventory/`). Money units are stated on every rule: **$** = major currency units stored as `NUMERIC(12,2)` (lines, price book), **¢** = integer cents (`quotes.*_cents BIGINT`), **fraction** = tax rate as `0.09`, **%** = percent as `9`.

## Vocabulary (where each word is defined)

- **Unit price / selling price / sell price** — `QuoteLineItem.unitPrice` / `quote_line_items.unit_price` ($, per unit, client-facing). The price book calls it `unit_price` too, labelled *"Sell Price"* (`src/types/app.ts:780`, `src/components/accounts/price-book-item-editor.tsx:886`).
- **Unit cost / cost price** — `costPrice` / `cost_price` ($, **per unit**, internal). `null` = "no cost on file", `0` = a real zero cost (gifted line) (`src/lib/quote-cost-margin.ts:111-114`, `docs/rules/leads.md:924-926`). Grid label *"Unit Cost"*.
- **Markup** — markup-of-cost: `(sellingPrice − costPrice) / costPrice × 100` (%). The pricing dial. Stored in the legacy-named `marginPercent` / `quote_line_items.margin_percent` and in `studio_price_book.markup_percent` (`src/lib/quote-cost-margin.ts:1-62`).
- **Margin** — margin-of-revenue: `(revenue − cost) / revenue × 100` (%), a report computed by `computeLineTotals` / `computeQuoteTotals`, never stored as the dial (`src/lib/quote-calc.ts:38-45`, `docs/rules/leads.md:870-883`).
- **Pricing triangle** — cost anchors, markup dials, selling price follows: `sellingPrice = costPrice × (1 + markup / 100)` (`src/lib/quote-cost-margin.ts:6-22`).
- **Price type** — `QuotePriceType` ∈ `amount · foc · kiv · inclusive · by_client · lump_sum · content_block` (`src/types/app.ts:730`). Only `amount` and `lump_sum` carry money.
- **Lump sum** — `priceType = "lump_sum"`: a real amount (unit × qty) that stands for a whole section; default name *"Lum Sum"* (`QDD:6195-6199`).
- **Amount marker** — `amountMarker`: a short free label (≤ 24 chars) printed instead of money; the line leaves every total but its cost still counts toward margin (`src/lib/quote-amount-marker.ts`, migrations 180 → 298).
- **Deliberate no-charge row** — a marked row or a row with a non-money price type (`isDeliberateNoCharge`, `src/lib/quote-calc.ts:20-23`); distinct from an *unpriced* row (no price, no marker).
- **Waste factor** — `wastePercent` (%): `effectiveQty = qty × (1 + wastePercent / 100)`, applied to both revenue and cost (`src/lib/quote-calc.ts:115-120`).
- **Optional line** — `isOptional`; counted or excluded from totals by the Optional Works rule (B-16).
- **Omission** — `isOmission` on a variation-order line: its money subtracts (B-17).
- **Line discount** — `discountType` ∈ `none · percent · flat` + `discountValue` on one line (B-28).
- **Document discount** — `leads.quote_metadata.docDiscount = { type: "percent" | "flat", value }`, applied after line discounts; **one per lead**, shared by all its quotes (B-31).
- **Effective tax rate** — the fraction every total in the editor uses: `gstEffectivelyOn ? region.tax.rate : 0` (B-35).
- **Canonical total / `total_cents`** — `quotes.total_cents`: the FINAL the client pays, incl-GST and incl-discount, GST charged after the discount (`src/lib/quotes/recompute-lead-quote-totals.ts:1-11`).
- **Price book** — `studio_price_book`, the studio's item catalogue (Accounts › *"Price Book"*, tab id `catalogue`).
- **Price snapshot** — `quote_line_items.price_snapshot_at`: the time a line took its figures from the price book (written, never read — B-87).
- **Pricing tier** — `price_book_pricing_tiers` row: a quantity bracket with its own sell and cost (B-93).
- **Market rate** — `platform_market_rates` row: a per-region `rate_min / rate_typical / rate_max` benchmark ($) (B-69).
- **Drift** — a price-book sell price more than ±15 % outside its matched market range (B-69).
- **Trusted actor** — a member whose `studio_members.tags` literally include `owner` or `admin`; everyone else's price-book writes land *pending* (B-61).

---

## Line money

### B-01 · The money fields on a quote line
- Where: `src/types/app.ts:750-851` (`QuoteDiscountType`, `QuoteLineAmountMarker`, `QuoteLineItem`); `src/types/database.ts:584-651`; `scripts/migrations/031_quote_line_items.sql:2-16`; `supabase/migrations/20260414000001_quote_v2_line_items.sql:6-32`; `supabase/migrations/20260416000001_price_book_v3.sql:55-67`; migrations 180, 199, 245, 298. Column history is templates D-10 / hand-off D.
- Entry: every line in the editor grid, the item editor, packages, the price book pickers, the parser, the AI drafter.
- Does: holds the per-line money inputs and the stored outputs.
- Rules:
  - Inputs: `unit_price NUMERIC(12,2) DEFAULT 0` ($), `qty NUMERIC(12,2) DEFAULT 1` (so a quantity persists to 2 dp), `price_type TEXT DEFAULT 'amount'`, `discount_type TEXT DEFAULT 'none'`, `discount_value NUMERIC(12,2) DEFAULT 0` (a % for `percent`, $ for `flat`), `tax_rate NUMERIC(5,4) DEFAULT NULL` (fraction; null = use the region rate), `tax_inclusive BOOLEAN DEFAULT false`, `cost_price NUMERIC(12,2) DEFAULT NULL` ($ per unit), `waste_percent NUMERIC(5,2) DEFAULT 0` (%), `margin_percent NUMERIC(5,2)` (holds **markup** %, B-07), `is_optional`, `is_omission`, `amount_marker TEXT` (≤ 24, non-blank CHECK, migration 298).
  - Stored outputs: `total NUMERIC(12,2)` ($, the line total **incl. tax** for tax-exclusive lines), `discount_amount NUMERIC(12,2)` ($), `tax_amount NUMERIC(12,2)` ($). They are recomputable caches; every total on screen is recomputed from the inputs (B-15).
  - Provenance / catalogue links on the line: `price_book_item_id` (soft ref, no FK), `cost_type`, `vendor_id`, `price_snapshot_at`, `package_tier`, `competitor_benchmark_cents BIGINT` (¢), `competitor_source`.
  - `vendorIds` exists on the TypeScript type only (`app.ts:813`); there is no `quote_line_items.vendor_ids` column and the save route does not send it.
- Data: `quote_line_items`; client type `QuoteLineItem`; save payload `SaveItem` (`src/app/api/quotes/line-items/route.ts:154-206`).
- States: —
- Words: —
- Reachable: yes.

### B-02 · Price types and their effect on money
- Where: `src/types/app.ts:730`; `src/lib/quote-calc.ts:20-23, 73-113`; `src/components/leads/quote-digitizer-cell.tsx:20-24` (`PRICE_TYPE_LABELS`); `src/components/accounts/price-book-item-editor.tsx:97-102` (`PRICE_TYPE_OPTIONS`); `src/lib/quote-canva/pricing/non-numeric.ts:31-36`; `src/app/api/quotes/parse/route.ts:121-127`.
- Entry: item editor *"Price type"* select; the document parser; the AI drafter's `price_type` arg; the lump-sum action on a section.
- Does: decides whether a line carries money.
- Rules:
  - `amount` and `lump_sum` carry money: `unitPrice × effectiveQty` (B-04). `lump_sum` is structural (a section-level amount, printed as a section footer — hand-off templates B-18) but sums exactly like `amount`.
  - `foc`, `kiv`, `inclusive`, `by_client`, `content_block` carry **zero**: `computeLineTotals` returns 0 for subtotal, discount, pre-tax, tax and line total whatever `unitPrice` holds (`quote-calc.ts:73-113`). Their cost still counts toward margin (B-48).
  - Missing `priceType` is treated as `amount` everywhere (`quote-total.ts:96`, save route `item.priceType || "amount"`).
  - The item editor offers only *"Amount"*, *"Lump sum"*, *"KIV (keep in view)"*, *"By client"* — `foc` and `inclusive` are reached through the Amount-display marker (B-03) or the parser. `by_client` / `kiv` rows render at 60 % opacity in the grid (`quote-row.tsx:345`).
  - The grid's Unit Price cell is editable on every row; a unit-price or markup edit sets `priceType = "amount"`, so typing a price on a lump-sum, FOC, KIV or By-client row turns it into an ordinary charged row (a marker, being a separate field, survives). The round-off keeps `lump_sum` (B-07, B-44).
  - `PRICE_TYPE_LABELS`: `amount` `""`, `foc` *"FOC"*, `kiv` *"KIV"*, `inclusive` *"Incl."*, `by_client` *"By Client"*, `lump_sum` *"L/S"*, `content_block` `""`. The grid's Total cell prints the label for the zero-money types; a lump sum prints its amount and shows *"L/S"* only as the cell tooltip.
- Data: `quote_line_items.price_type`.
- States: —
- Words: *"Price type"*, *"Amount"*, *"Lump sum"*, *"KIV (keep in view)"*, *"By client"*; tooltip on the footer's item count *"{n} of {m} rows have no monetary value"* · *"These rows are visible in the list but don't contribute to the subtotal."* (`QDD:6255-6290`).
- Reachable: yes. Line kinds and content blocks are hand-off A.

### B-03 · Amount markers (free-form no-charge labels)
- Where: `src/lib/quote-amount-marker.ts:1-92`; `src/lib/quote-calc.ts:78-113`; `price-book-item-editor.tsx:282-286, 1185-1207`; `src/lib/quote-canva/pricing/non-numeric.ts:47-78`; migrations `180_quote_line_item_amount_marker.sql`, `298_quote_line_items_amount_marker_freeform.sql`; test `quote-amount-marker.test.ts`.
- Entry: item editor *"Amount display"*; template-seeded packages; parser.
- Does: prints a label in the AMOUNT cell and takes the line out of every money total.
- Rules:
  - `normalizeAmountMarker(v)`: non-string → null; trim; blank → null; else `slice(0, 24)` (`AMOUNT_MARKER_MAX_LEN = 24`, mirrors the DB CHECK). Presence, not membership, is the test (`hasAmountMarker`).
  - Label: `inclusive` → *"Inclusive"*, `foc` → *"F.O.C."* (case-insensitive lookup); anything else prints exactly as typed.
  - Money: zero in subtotal, discounts, GST and totals (like a non-money price type); `costPrice × qty` still counts toward cost / margin; no waste applied on this branch (`quote-calc.ts:91-113`).
  - Picker options = the studio's template vocabulary (`pricing-table` `nonNumeric.allowedValues`, read from all its `quote_pdf` document templates via `studioMarkerVocabulary`) + always `inclusive` and `foc`; de-duplicated case-insensitively, studio list first. An existing value not in the list stays selectable.
  - Save persists the normalised label verbatim (`route.ts:561`); before migration 298 every non-`inclusive`/`foc` marker was coerced to NULL and printed $0.00 (history, `quote-amount-marker.ts:12-16`).
  - Print resolution (the studio's spelling from `allowedValues` wins, an unknown marker still prints) is templates B-65.
- Data: `quote_line_items.amount_marker TEXT`, CHECK `amount_marker IS NULL OR (btrim(amount_marker) <> '' AND char_length(amount_marker) <= 24)`.
- States: marked row's Total cell shows the label, never *"Enter total"*.
- Words: *"Amount display"*, *"Normal amount"*, *"Prints “{label}” instead of an amount. Excluded from the quote total; its cost still counts toward margin."*; Total-cell tooltip *"Marked as no-charge — excluded from totals (its cost still counts toward margin). Edit the item to change."* (`quote-row.tsx:929`).
- Reachable: yes.

### B-04 · Line total formula (`computeLineTotals`)
- Where: `src/lib/quote-calc.ts:27-214`; tests `quote-calc.test.ts`, `quote-calc-margin*.test.ts`, `quote-row-margin-cell.test.ts`.
- Entry: every line render, every edit helper, every total.
- Does: derives one line's money from its inputs.
- Rules (all in $, `round2(n) = Math.round(n × 100) / 100` applied to each output at the end, never mid-way):
  1. Non-money price type or marker → all money 0 (B-02, B-03).
  2. `effectiveQty = qty × (1 + (wastePercent ?? 0) / 100)`; `wasteQty = effectiveQty − qty`.
  3. `subtotal = unitPrice × effectiveQty`.
  4. `discountAmount` = `subtotal × discountValue / 100` (percent, value > 0) or `discountValue` (flat, value > 0), then `min(discountAmount, subtotal)`.
  5. `preTaxTotal = subtotal − discountAmount`.
  6. `effectiveTaxRate = item.taxRate ?? regionTaxRate` (the caller's rate only when the line has none — see B-37). If rate > 0: tax-inclusive → `taxAmount = preTaxTotal − preTaxTotal / (1 + rate)`; else `taxAmount = preTaxTotal × rate`.
  7. `lineTotal = taxInclusive ? preTaxTotal : preTaxTotal + taxAmount`.
  8. Margin fields — B-48.
- Data: returns `{ subtotal, discountAmount, preTaxTotal, taxAmount, lineTotal, marginPercent, marginAmount, marginWarning, effectiveQty, wasteQty }`.
- States: —
- Words: —
- Reachable: yes.

### B-05 · Waste factor
- Where: `src/lib/quote-calc.ts:115-120`; `price-book-item-editor.tsx:958-983`; save route `route.ts:462, 564`; price book `waste_percent` (`20260416000001_price_book_v3.sql:43`).
- Entry: item editor *"Waste Factor (%)"* (price-book and quote-line modes); carried from a price-book pick, the browse modal, auto-match and the save route's cost match.
- Does: inflates the quantity used for money.
- Rules: `effectiveQty = qty × (1 + waste/100)` is used for **both** the client-facing subtotal (`unitPrice × effectiveQty`) and cost (`costPrice × effectiveQty`). The printed quantity is `qty`, so Rate × Qty ≠ Amount on a line with waste (print is hand-off templates B-18). No waste on no-charge rows. The input has HTML `min 0`, `max 50`, `step 0.5`, not enforced on save; column `NUMERIC(5,2)`.
- Data: `quote_line_items.waste_percent`, `studio_price_book.waste_percent`.
- States: helper text switches between the two strings below.
- Words: *"Waste Factor (%)"*; tooltip *"Adds a buffer to ordered quantities to account for cuts, breakages, and overage. e.g., 10% waste on 100 sqft = 110 sqft ordered."*; *"Effective qty = qty x {1+w/100 to 2 dp} in quotes"* / *"No waste factor applied"*.
- Reachable: yes.

### B-06 · Unit cost (per unit, nullable)
- Where: `quote-row.tsx:755-776`; `src/components/leads/focused-grid/line-items-grid.tsx:455-470`; `grid-rows.tsx:22-30`; `grid-columns.ts:29-40`; `src/components/leads/quote-digitizer-cell.tsx:59-68`; tests `unit-cost-label.test.ts`, `dyel-cost-column-default.test.ts`.
- Entry: grid column *"Unit Cost"* (panel and focused grid), item editor *"Unit Cost ({cs})"*.
- Does: records the studio's cost for ONE unit.
- Rules:
  - Per unit everywhere: line cost = `costPrice × effectiveQty` (B-48).
  - Nullable: an emptied cell or pasted blank commits `null` (the `nullable` prop / `coerceCellValue`), never 0. `0` is a gifted line.
  - Editing cost never moves the selling price or any total (B-07).
  - The column is internal (never on the client PDF, B-52) and **visible by default** (`defaultVisible: true`) alongside *"Markup %"*; per-browser visibility overrides live in `localStorage["quote-digitizer:columns"]` as a sparse map (`src/lib/quote-column-prefs.ts:29-54`).
  - The item editor keeps cost as a number defaulting to 0 and saves `costPrice: costPrice || null`, so a 0 cost typed in the editor becomes "no cost" (`price-book-item-editor.tsx:203, 630`).
- Data: `quote_line_items.cost_price`.
- States: —
- Words: header *"Unit Cost"*; tooltip *"Vendor/contractor cost for ONE unit — not the line total. The line's cost is this × quantity."*
- Reachable: yes.

### B-07 · The pricing triangle — markup is the dial
- Where: `src/lib/quote-cost-margin.ts:67-188`; `QDD:3429-3488` (`updateItem`); `src/components/leads/focused-grid/grid-write.ts:37-111`; `src/components/quote-templates/use-package-grid-context.ts:384-401` (packages, tax 0); `docs/rules/leads.md:848-913`; test `quote-cost-margin.test.ts`.
- Entry: typing in *"Unit Price"*, *"Unit Cost"* or *"Markup %"* (panel grid, focused grid, package grid); paste / fill.
- Does: keeps cost, markup and selling price consistent whichever one is edited.
- Rules:
  - Edit markup → hold cost, `unitPrice = round(costPrice × (1 + m/100) × 100) / 100` (2 dp); store the typed markup verbatim (after clamp) in `marginPercent`; `priceType = "amount"`; recompute line total/discount/tax. No-op when `costPrice == null` or not ≥ 0. Cost 0 → price 0. **This is the one edit that moves the quote total.**
  - Edit cost → hold `unitPrice`; `marginPercent = impliedMarkupPercent ?? undefined`; totals untouched.
  - Edit selling price → hold cost; `unitPrice = finite ? value : 0`; `priceType = "amount"`; `marginPercent = impliedMarkupPercent`; recompute totals.
  - `impliedMarkupPercent = round(((unitPrice − costPrice) / costPrice) × 100 × 100) / 100` (2 dp); null when cost is null or ≤ 0.
  - `clampMarkupPercent(m)`: non-finite → 0; else `min(max(m, −100), 10000)`.
  - The round trip is the invariant: typing 30 on cost 100 gives 130, and 130 over 100 reads back 30.
  - Qty edit on a price-book row with tiers first re-prices from the tier (B-94), then re-derives markup.
  - Package grid: the same helpers with tax rate 0 and no tier lookup (package editor is templates C-16/C-17).
- Data: `unit_price`, `cost_price`, `margin_percent` (legacy name, holds markup).
- States: —
- Words: see B-08, B-09.
- Reachable: yes.

### B-08 · Markup % cell (display, colour, editability, sort)
- Where: `quote-row.tsx:778-893`; header `line-items-grid.tsx:472-488`; sort `QDD:5802-5815`.
- Entry: grid column *"Markup %"* (internal, visible by default).
- Does: shows and edits markup-of-cost per line.
- Rules:
  - Non-money price type → *"—"*; `costPrice == null` → *"no cost"* (italic); else the value shown is **derived live** from price and cost (`impliedMarkupPercent`), not the stored field, so rows saved under the old model (stored margin-of-revenue) display correctly and do not write the stale number back on blur.
  - Colour thresholds on the shown markup: ≥ 20 green, ≥ 10 amber, else red (the same numbers the margin panel uses for margin, B-51).
  - Editable when not read-only (typing sets the price via B-07); read-only shows `x.x%`.
  - When `detectLineTotalCost` flags the row, the cell becomes an amber fix button (B-14).
  - Sorting by the column uses the **stored** `marginPercent` (`Number(it.marginPercent ?? 0)`), not the displayed derived markup.
- Data: `margin_percent`.
- States: *"—"*, *"no cost"*, fix button.
- Words: header *"Markup %"*, header tooltip *"Markup % on unit cost. Type 30 for a 30% markup — unit price becomes cost × 1.30. Editing it sets the unit price."*; cell tooltips *"No markup for this price type"*, *"Set a unit price to see markup"*, *"Add a cost price to see markup"*, *"Markup = (unit price − {cost}) / {cost} × 100. Editing it sets the unit price. Cost is per {unit}."*; *"Sort by markup"*.
- Reachable: yes.

### B-09 · Paste, fill and the reprice notice
- Where: `src/components/leads/focused-grid/grid-columns.ts:3-50`; `grid-write.ts:37-126`; `focused-grid-overlay.tsx:484-495`; test `focused-grid-write.test.ts`.
- Entry: paste / fill-down / fill-handle in the focused grid.
- Does: writes several money cells at once without diverging from typing.
- Rules:
  - Range columns in order: `unitPrice` *"Unit Price"*, `discountValue` *"Discount"*, `qty` *"Qty"*, `unit` *"Unit"*, `marginPercent` *"Markup %"*, `costPrice` *"Unit Cost"* (appended last so older paste offsets hold).
  - Coercion: strip commas, trim; blank → `null` for cost, else 0; `parseFloat` or 0. No clamping here (the markup clamp applies inside B-07).
  - Order is load-bearing: tier re-price on qty → **cost → price → markup** → totals for qty/discount; a block with cost + price yields the markup they imply; cost + markup prices off the pasted cost.
  - A paste that covers the Markup column raises an info toast after the fact (one undo step reverts the whole paste).
  - `discountType` has no range column; a pasted discount value keeps the row's existing type.
- Data: —
- States: —
- Words: toast *"Markup pasted — unit prices were recalculated"* · *"Quote totals changed. Undo (Cmd+Z) reverts the whole paste."*; *"Pasted into {n} row(s); {m} didn't fit"*.
- Reachable: yes (focused grid; paste in the panel grid is hand-off A).

### B-10 · Item editor (quote-line mode) — the pricing block
- Where: `src/components/accounts/price-book-item-editor.tsx:346-392` (triangle), `874-933` (UI), `549-665` (build + save); mounted from QDD's per-row pencil and *"+ Item"* (hand-off A).
- Entry: the pencil on a line, or adding an item.
- Does: edits Sell price, Unit cost and Markup in a side panel.
- Rules:
  - Sell edit → markup = `round1((sell − cost) / cost × 100)` when cost > 0 (1 dp, the grid uses 2 dp — B-47). Cost edit → same, sell held. Markup edit → `clampMarkupPercent`, and **sell = round2(cost × (1 + m/100))** when cost ≥ 0 (the markup edit moves the price, like the grid).
  - A live margin chip: `margin = (unitPrice − costPrice) / unitPrice × 100` (per unit, ignores qty/discount/waste), shown when `unitPrice > 0 && costPrice ≥ 0`; colours ≥ 20 / ≥ 10 / else.
  - Warning when `unitPrice ≤ 0` and (cost > 0 or markup ≠ 0).
  - The built line: `total = unitPrice × (qty || 1)` (no tax/discount), `taxAmount: 0`, `discountAmount: 0` — "recomputed downstream" by the save route (B-19, B-33); `qty || 1`, `unit || "lot"`, `marginPercent: markup || undefined`, `costPrice: costPrice || null`.
  - Picking a price-book row fills only what the pick provides (B-76).
- Data: produces a `QuoteLineItem` for `onSaveQuoteItem(item, alsoSaveToPriceBook)`.
- States: *"Item name is required"* blocks save.
- Words: *"Pricing"*, *"Cost and markup follow each other"*, *"Sell Price ({cs})"* (tooltip *"The client-facing price. Editing cost or markup never changes it."*), *"Unit Cost ({cs})"* (tooltip *"Editing cost re-derives Markup. Sell price holds."*), *"Markup %"* (tooltip *"Editing markup re-derives Unit Cost. Sell price holds."*), *"Margin: {x.x}% ({cs}{y.yy} per unit)"*, *"Enter a sell price — cost and markup are derived from it."* — the tooltips contradict the code (B-96).
- Reachable: yes.

### B-11 · Item editor — the other quote-only money fields
- Where: `price-book-item-editor.tsx:271-288, 1082-1237`.
- Entry: the item editor in quote mode.
- Does: sets quantity, price type, tax, line discount, optional, amount display, omission and package tier.
- Rules:
  - *"Quantity"*: `parseFloat || 0`, saved as `qty || 1`.
  - Tax: when the region has slabs (India) a select *"Default ({n}%)"* (`taxRate = null`), *"Exempt"* (`0`), and each slab (`0.05 · 0.12 · 0.18 · 0.28`); otherwise a checkbox *"Apply {tax} ({n}%)"* setting `taxRate` to the region rate or 0. These per-line rates are overwritten on display and on save (B-37).
  - *"Tax inclusive?"* → `taxInclusive` (B-38).
  - Line discount: *"Discount type"* None / *"Percent (%)"* / *"Flat ({cs})"*; choosing None zeroes the value; value input disabled while None (B-28).
  - *"Optional"* → `isOptional` (B-16). *"Amount display"* → marker (B-03).
  - Variation quotes show *"Omission (credit)"* → `isOmission` (B-17); other quotes show *"Package tier"* None / Essential / Premium / Luxury → `packageTier` (stored, no effect on any total; the AI tier concept is templates C-29).
- Data: `quote_line_items.qty, price_type, tax_rate, tax_inclusive, discount_type, discount_value, is_optional, amount_marker, is_omission, package_tier`.
- States: —
- Words: *"Quantity"*, *"{tax} rate"*, *"Exempt"*, *"Tax inclusive?"*, *"Price includes tax"*, *"Discount type"*, *"Discount value"*, *"Optional"*, *"Client can toggle on signing page"*, *"Omission (credit)"*, *"Scope cut — credits contract"*, *"Package tier"*.
- Reachable: yes.

### B-12 · Line Total cell
- Where: `quote-row.tsx:317-318, 925-966`.
- Entry: the grid's last money column.
- Does: shows one line's total.
- Rules: shows `computeLineTotals(item, regionTaxRate).lineTotal` — for a tax-exclusive line this is **gross incl. GST**; the tooltip spells out the recipe. Omission lines print with a leading *"−"*. Marker → label; non-money price type → its label; `lineTotal === 0` on a money line → the *"Enter total"* badge (B-13).
- Data: derived.
- States: label / badge / number.
- Words: tooltip lines *"= Unit Price ({p}) × Qty ({q})"*, *"− Discount ({v}%)"* or *"− Discount ({cs}{v})"*, *"+ {tax} ({n}%)"*; badge *"Enter total"* with title *"This row has no price — enter a total before saving."*
- Reachable: yes.

### B-13 · Rows that need pricing
- Where: `QDD:2159-2194` (`zeroPriceItemIds`, `jumpToZeroPriceRow`), `QDD:6290-6320` (footer chip).
- Entry: the totals footer.
- Does: counts and walks the money rows that total 0.
- Rules: a row counts when it is not `content_block`, has a money price type, has no marker, and `computeLineTotals(i, effectiveTaxRate).lineTotal === 0`. Up/down buttons cycle a cursor through them (wrapping) and scroll/flash the row.
- Data: derived.
- States: chip hidden at 0.
- Words: *"{n} need pricing"* (*"unpriced"* on narrow), *"Jump to previous unpriced row"*, *"Jump to next unpriced row"*.
- Reachable: yes.

### B-14 · Costs that look like line totals
- Where: `src/lib/quote-line-total-cost.ts:1-110`; `quote-row.tsx:826-848`; `src/components/leads/quote-margin-panel.tsx:42-46, 131-176`; `QDD:7747-7766`; test `quote-line-total-cost.test.ts`.
- Entry: the Markup % cell and the margin panel.
- Does: spots a line total typed into the per-unit cost column and offers the division.
- Rules: `detectLineTotalCost` is only true when ALL hold — money price type; `cost > 0`; `unitPrice > 0 && qty > 0`; `cost ≤ unitPrice × qty` (else **impossible**); `cost > unitPrice`; `qty > 1`; `cost / qty` exact to 2 dp (`|perUnit × 100 − round(perUnit × 100)| ≤ 1e-9`); resulting margin `(unitPrice − perUnit) / unitPrice × 100` within 0–70 (`MAX_PLAUSIBLE_MARGIN = 70`). Suggested cost = perUnit to 2 dp; margin reported to 1 dp. The fix writes the cost through `applyCostPriceEdit` (price held, markup re-read); the panel's *"Divide all by quantity"* is one undo step.
- Data: `cost_price`.
- States: banner hidden when nothing fixable; read-only shows the count without the action.
- Words: cell tooltip *"This looks like the cost of all {qty} {unit}, not one. Click to set {x} per {unit} — margin becomes {m}%."*; banner *"{n} costs look like line totals, not unit costs."* / *"{n} cost looks like a line total, not unit costs."*, *"Cost is per unit — the line's cost is cost × quantity. These divide evenly by their quantity into a sensible margin, which is what a line total looks like."*, action *"Divide it by quantity"* / *"Divide all by quantity"*; impossible banner *"{n} rows cost more than they sell for, in total."* · *"Neither reading of the cost works for these, so there's nothing safe to convert — worth checking them by hand."*; toast *"Converted {n} costs to unit costs"*.
- Reachable: yes.

---

## Sums and totals

### B-15 · Quote totals formula (`computeQuoteTotals`)
- Where: `src/lib/quote-calc.ts:218-435`; tests `quote-calc.test.ts`, `quote-calc-omission.test.ts`, `quote-calc-margin*.test.ts`, `package-bundle-total.test.ts`.
- Entry: the editor's Summary / footer / payment schedule, the save roll-up, the re-roll, the server PDF, the VO context, the drawer fallback.
- Does: sums every line and applies the document discount and GST.
- Rules ($; `round2` only on the returned fields):
  - Per line `t = computeLineTotals(item, regionTaxRate)`; `omit = !!item.isOmission`.
  - `subtotal += t.subtotal` and `lineDiscount += t.discountAmount` for **every** line (omissions add their magnitude here, not their sign).
  - `totalTax += omit ? −t.taxAmount : t.taxAmount`; `allLineTotal += omit ? −t.lineTotal : t.lineTotal` (signed, incl-GST).
  - `requiredLineTotal` = the same signed sum over non-optional lines only; `additionsSub` / `omissionsSub` = subtotal magnitudes split by `omit`.
  - `afterLineDiscounts = subtotal − lineDiscount`.
  - Document discount (only when `value > 0`): percent → `afterLineDiscounts × value / 100`; flat → `value`; then `min(docDiscountAmount, afterLineDiscounts)`.
  - GST after discount: `docRatio = afterLineDiscounts > 0 ? docDiscountAmount / afterLineDiscounts : 0`; `signedGrand = allLineTotal × (1 − docRatio)`; `gstUnrounded = totalTax × (1 − docRatio)`; `netPreTax = signedGrand − gstUnrounded`. A negative `signedGrand` (omissions win) is **not** floored.
  - Returns `subtotal`, `lineDiscount`, `docDiscount`, `totalDiscount = lineDiscount + docDiscount`, `preTaxTotal = netPreTax` (net of tax), `totalTax` (per-line tax before the doc discount), `gstAmount = gstUnrounded` (tax on the discounted base), `grandTotal = round2(signedGrand)`, `requiredTotal`, `withOptionsTotal = allLineTotal`, `totalRevenue`, `totalCost`, `overallMarginPercent` (B-49), `additionsSubtotal`, `omissionsSubtotal`, `netGrandTotal = signedGrand`. Invariant `grandTotal − gstAmount = preTaxTotal` (tests).
  - Worked checks from the tests: 9,000 subtotal − 1,500 line − 10 % doc (750) → pre-tax 6,750; 100,000 − 10 % at 9 % → pre-tax 90,000, GST 8,100, total 98,100; tax-inclusive 109 at 9 % → total 109, tax 9, pre-tax 100; mixed 100 exclusive + 109 inclusive with flat 10 → total 207.57 (not 208).
  - `optional` lines are **all included** here; exclusion is the caller's job (B-16). `lump_sum` counts; a package bundle price is carried by one `lump_sum` row while its component rows are marked *"Packaged"* / *"Included"* (`package-bundle-total.test.ts`).
- Data: derived; persisted by B-19.
- States: —
- Words: —
- Reachable: yes.

### B-16 · Optional lines in the totals — the Optional Works rule
- Where: `src/lib/quote-total.ts:13-48, 129-153`; `QDD:2869-2892`; save route `route.ts:700-703`; `src/lib/quotes/recompute-lead-quote-totals.ts:53-59`; `src/components/leads/lead-detail-drawer.tsx:414-431`; test `quote-total.test.ts`.
- Entry: every place that computes a total.
- Does: decides whether optional lines count.
- Rules:
  - Rule source: `mergeLayout(defaultTemplate.body_json.globalStyles.layout, lead.quote_metadata.layoutOverrides).totals.optionalWorksSection` — the studio's default active `quote_pdf` template (not the quote's own design) merged with the per-lead overrides (the knob is templates A-39; print behaviour templates B-99).
  - `excludeOptional = optionalWorksSection.enabled && !optionalWorksSection.includeInTotal`; when true, optional lines are filtered out **before** `computeQuoteTotals` (editor display, save roll-up, re-roll, drawer fallback, signing fallback).
  - Default (`enabled false`) → optional lines count in every total, including GST. Any read failure → `{ enabled: false, include: false }` → count everything.
  - The canva print and the signing page have their own optional handling (templates B-99, hand-off C).
- Data: `studio_document_templates.body_json`, `leads.quote_metadata.layoutOverrides`, `quote_line_items.is_optional`.
- States: —
- Words: —
- Reachable: yes.

### B-17 · Omission lines and variation-order sums
- Where: `src/lib/quote-calc.ts:325-343, 392-433`; `src/lib/finance/vo-render-context.ts:1-80` (`computeVoContext`); save route `route.ts:717-727`; re-roll `recompute-lead-quote-totals.ts:73-88`; `quote-row.tsx:958-963`; test `quote-calc-omission.test.ts`, `recompute-lead-quote-totals-locks.test.ts`.
- Entry: a variation order (`quote_type = 'variation'`) edited in QDD with the per-line *"Omission (credit)"* box.
- Does: lets a VO subtract scope.
- Rules:
  - Omission lines subtract their incl-GST line total and their tax; their subtotal magnitude goes to `omissionsSubtotal` (B-15).
  - A VO **never** carries the lead's document discount (D6): the save roll-up and re-roll pass `null`, `computeVoContext` passes `null`.
  - `quotes.total_cents` is stored **signed** for a VO; `quotes.is_omission` is written as a derived hint `grandTotal < 0`; money reads the sign of `total_cents` only.
  - `computeVoContext`: `netCents = round(grandTotal × 100)`, `additionsCents` / `omissionsCents` = gross pre-tax magnitudes, `netGstCents`, `revisedCents = contractBeforeCents + netCents` (¢) — the VO math SSOT (hand-off C / finance).
  - Grid: an omission row's Total prints *"−{amount}"*; the editor money strip negates figures for an omission quote (`omMoney`).
- Data: `quote_line_items.is_omission`, `quotes.total_cents` (signed), `quotes.is_omission`.
- States: *"Omission · credit"* badge on the Summary.
- Words: *"Omission (credit)"*, *"Scope cut — credits contract"*, *"Omission · credit"*.
- Reachable: yes (VO editing).

### B-18 · Section and subsection subtotals in the editor
- Where: `src/lib/quote-canva/pricing/group-subtotal.ts:1-63`; `QDD:2980-2997` (`sectionSubtotals`); `src/lib/quote-canva/pricing/non-numeric.ts:22-80`.
- Entry: section header rows in the grid (subtotal cell).
- Does: sums a section the same way the PDF does.
- Rules: `computeGroupSubtotal(items, { nonNumeric: DEFAULT_NON_NUMERIC, taxRate })` = Σ `computeLineTotals(i, taxRate).preTaxTotal` over rows with no non-numeric marker (marker or non-money price type), optionally excluding optional rows. **Pre-tax** (never `item.total`, which is gross on a GST quote). Optional rows are included in the editor call (no `excludeOptional`). Default non-numeric vocabulary `["FOC", "Inclusive", "TBD"]`. Print use is templates B-65.
- Data: derived.
- States: —
- Words: —
- Reachable: yes.

### B-19 · Persisted roll-up on every line save (`quotes.*_cents`)
- Where: `src/app/api/quotes/line-items/route.ts:450-513` (per-line tax/total), `682-741` (roll-up); `src/lib/queries/leads.ts:941-1016` (`useSaveQuoteLineItems`); migration `supabase/migrations/20260415000001_multi_quote_support.sql:13-16`; legacy `quotes.subtotal/discount/tax/total INTEGER` (`006_projects.sql`), `leads.quote_data`.
- Entry: every autosave / explicit save of lines (save mechanics are hand-off A).
- Does: recomputes each line's stored money and writes the quote's canonical totals.
- Rules:
  - Client sends `effectiveTaxRate` (the editor always sends a number). For each money line (`amount` / `lump_sum`) the server stores `tax_rate = effectiveTaxRate` and recomputes `tax_amount` and `total` with `computeLineTotals` (qty `|| 1`, unit price, discount, waste, inclusive flag). Non-money lines keep the sent `tax_rate`, `tax_amount`, `total`.
  - Roll-up: `rate = effectiveTaxRate ?? (lead.quote_metadata.gstEnabled !== false ? region(lead.country_code || studio.country_code || "SG").tax.rate : 0)`; optional lines filtered per B-16; `docDiscount = quote_metadata.docDiscount` when `value > 0`, `null` for a VO; `computeQuoteTotals(calcItems, rate, docDiscount)`.
  - `toCents(n) = Math.round(n × 100)`: `total_cents ← grandTotal` (FINAL, incl-GST, incl-discount), `subtotal_cents ← subtotal` (before all discounts; gross for tax-inclusive lines), `tax_cents ← gstAmount` (GST on the discounted base), `discount_cents ← totalDiscount` (line + document), `is_omission ← grandTotal < 0` for VOs, `updated_at`.
  - Non-fatal: a totals-write error is logged, the line save still succeeds.
  - `quotes.subtotal / discount / tax / total` (INTEGER, pre-multi-quote) are read by the transformer but never written by the quote routes. `leads.quote_data` (legacy JSON) holds the parsed source document incl. `subTotal`, `discount`, `grandTotal`, `paymentSchedule` (hand-off A / D).
- Data: `quotes.total_cents · subtotal_cents · discount_cents · tax_cents BIGINT DEFAULT 0`, `quotes.is_omission`; `quote_line_items.tax_rate · tax_amount · total`.
- States: 409 `QUOTE_LOCKED` before any write on locked quotes (B-21).
- Words: —
- Reachable: yes.

### B-20 · Re-roll when the GST switch or the document discount changes
- Where: `src/lib/quotes/recompute-lead-quote-totals.ts:99-158`; caller `src/app/api/leads/mutations/[id]/route.ts:376-385`; client `src/lib/queries/leads.ts:617-682` (`useUpdateLeadQuoteMetadata`); test `recompute-lead-quote-totals-locks.test.ts`.
- Entry: toggling GST or committing the document discount in the editor (both write `leads.quote_metadata`).
- Does: rewrites `quotes.*_cents` for every open quote on the lead without a line save.
- Rules:
  - Runs when a lead PATCH touches `quote_metadata`; best-effort, never throws.
  - Only quotes in `draft · submitted · rejected` are re-rolled.
  - Rate per quote: when the quote row has a `company_id`, `entityTaxRate = company.gst_registered ? regionRate : 0` and it **wins over the per-quote GST switch**; otherwise `gstEnabled !== false ? regionRate : 0`. (The editor itself lets the per-quote switch win over the entity — B-35.)
  - Same filter / discount / VO rules and cents mapping as B-19; line rows are read fresh and their stored `tax_rate` replaced by the resolved rate for the computation.
  - Changing the issuing entity (`leads.company_id`) does not trigger a re-roll; totals follow on the next line save.
- Data: `leads.quote_metadata`, `quotes.company_id` (see Uncertain), `studio_companies.gst_registered`.
- States: —
- Words: —
- Reachable: yes.

### B-21 · Frozen totals
- Where: `scripts/migrations/307_finance_contract_freeze.sql:1-12, 145-172` (`trg_quote_totals_frozen`); save route lock `route.ts:337-366`; `docs/rules/finance.md:237`.
- Entry: any write to a quote's money.
- Does: stops a signed or out-for-signature quote's totals from changing.
- Rules: the trigger raises `QUOTE_TOTAL_FROZEN` when `total_cents`, `subtotal_cents`, `tax_cents` or `discount_cents` changes on a row whose status is `client_signed` or `sent_for_signature`, or a variation in `approved`; bypass `set_config('finance.allow_signed_total_write','on',true)`. The line save refuses `approved`, `client_signed`, `sent_for_signature` with 409 `QUOTE_LOCKED`. Flow and statuses are hand-off C.
- Data: trigger on `quotes`.
- States: 409.
- Words: *"Cannot edit a quote that is {status} — revise it first"* / *"… — it is signed — raise a variation order for changes"*.
- Reachable: yes.

### B-22 · Editor totals display — Summary card and Grand Total footer
- Where: `QDD:2831-2867` (`itemsForDisplay`), `2881-2927` (`quoteTotals`, `canonicalTotals`), `2929-2942` (`omMoney`, `scheduleTotal`), `6245-6420` (footer), `7300-7475` and `7475-7600` (Summary card, parsed and manual variants).
- Entry: the editor's left sidebar Summary and the grid footer (frames are hand-off A).
- Does: shows one set of numbers everywhere in the editor.
- Rules:
  - All three surfaces read `canonicalTotals` from `computeQuoteTotals(itemsForDisplay minus optional-when-excluded, effectiveTaxRate, docDiscountFromMeta)`; `itemsForDisplay = normalizeLineItemTaxRates(items, effectiveTaxRate)` re-ordered by category (B-90). The displayed GST row is `gstAmount` (after discount).
  - The payment schedule splits the same `grandTotal` (`scheduleTotal`) — schedule mechanics are hand-off C.
  - Footer shows the breakdown block only when there is a discount or tax; *"Grand Total"* always. Summary shows Subtotal, the discount input (B-32), *"Total Discount"* with a *"{cs}{x} line items + {cs}{y} document ({v}%)"* split when both exist, the GST row with its switch (B-35), then *"Total"*.
  - Numbers use `toLocaleString(region locale, 2 dp)` with the region symbol (`cs`, B-42).
- Data: derived.
- States: read-only hides the discount input and the switch; the GST row shows *"—"* when GST is off.
- Words: *"Summary"*, *"Subtotal"*, *"Total Discount"*, *"line items"*, *"document"*, *"{tax} ({n}%)"*, *"Total"*, *"Grand Total"*, *"items"*.
- Reachable: yes.

### B-23 · Items vs the parsed document's totals
- Where: `QDD:5750-5776` (`docSubTotal`, `computedSubTotal`, `totalsMatch`), `7425-7446`.
- Entry: the Summary card of a quote created by uploading a document.
- Does: warns when the lines don't add up to what the source document stated.
- Rules: `docSubTotal = parsedDoc.subTotal ?? (parsedDoc.grandTotal + (parsedDoc.discount ?? 0))`; `computedSubTotal = quoteTotals.subtotal` (pre-discount, pre-tax, incl. lump sums); match when `|computed − doc| ≤ 1` ($1). *"Accept items"* overwrites `parsedDoc.subTotal` and `grandTotal` with the editor's figures and marks dirty. Hidden when read-only.
- Data: parsed doc metadata (`leads.quote_data` / `quotes.parsed_doc_metadata`, hand-off A).
- States: warning only when `totalsMatch === false`.
- Words: *"Items sum to {cs}{x}, but the document claimed {cs}{y}"*, *"Accept items"*.
- Reachable: yes.

### B-24 · Lead drawer totals — deal card, Price breakdown, fallback
- Where: `src/components/leads/drawer-sections/quote-summary-card.tsx:82-172`; `src/components/leads/quote-total-breakdown.tsx:1-125`; `src/components/leads/lead-detail-drawer.tsx:388-432` (`canonicalQuoteTotalNum`).
- Entry: the lead drawer's Quote card.
- Does: shows the primary quote's final and how it was built.
- Rules:
  - Card total = `formatCurrencyFromCents(primary.totalCents, getCountryCode())` (the session's region, not the lead's) when `> 0`, else *"—"*; the info popover takes `subtotalCents`, `discountCents`, `taxCents`, `totalCents`; `net = max(0, subtotal − discount)`; *"Net"* shows only with both a discount and tax; the tax label is always the default *"GST"* here (the card passes no `taxLabel`).
  - Drawer figure for readiness / quick invoicing: the scoped quote's `total_cents / 100` when > 0; otherwise a recompute: `rate = quote_metadata.gstEnabled === false ? 0 : region(session country).tax.rate` (no entity), doc discount, Optional Works rule, `computeQuoteTotals(...).grandTotal`. A legitimately negative (VO) or zero `total_cents` also falls into the recompute.
- Data: `quotes.*_cents`.
- States: loading skeleton; 0 → *"—"*.
- Words: *"Show price breakdown"*, *"Price breakdown"*, *"Subtotal"*, *"Discount"*, *"Net"*, *"GST"*, *"Total"*, *"{taxLabel} is calculated on the amount after discount."*
- Reachable: yes.

### B-25 · Totals frozen onto a signing request, and the signing page's own sum
- Where: `src/app/api/quotes/request-signature/route.ts:308-352`; `src/app/api/sign/[token]/route.ts:101-117, 227-246`; `src/app/sign/[token]/page.tsx:992-1032`; `scripts/backfill-signature-discount-totals.js`.
- Entry: sending for signature; the client's signing page (flows are hand-off C).
- Does: freezes the money the client signs.
- Rules:
  - `quote_signature_requests.quote_total ($) = Σ total_cents / 100` over the covered quotes when **every** one has `total_cents > 0`; otherwise `sumQuoteGrandTotal` over the raw lines (money lines, Optional Works rule, **no document discount**, stored gross totals).
  - The snapshot is `select("*")` of the lines (cost included — B-53).
  - Signing page with optional add-ons: `displayTotal = max(0, Σ required money-line totals + Σ accepted optional totals − docDiscountAmount)`, where the doc discount base is `gross − Σ tax_amount` (percent) or `min(value, base)` (flat) — the discount is taken off a gross incl-GST figure **without** re-deriving GST, unlike B-15. The discount and GST switch come from the **live** `leads.quote_metadata`, not a frozen copy.
  - A one-off script re-derived historical totals as `Σ total − docDiscount` for leads with a doc discount (`--apply`, `--include-signed`).
- Data: `quote_signature_requests.quote_total NUMERIC(12,2)`, `.quote_snapshot`.
- States: —
- Words: —
- Reachable: yes.

### B-26 · AI and bot total helpers
- Where: `src/lib/quote-total.ts:73-127` (`sumQuoteGrandTotalWithDiscount`); `src/lib/agents/executors.ts:626-646`; `src/lib/quote-agent/executors.ts:784-797` (`summarizeQuote`).
- Entry: mAIson Bot lead lookup; the AI quote drafter's `summarize_quote` tool (hand-off A).
- Does: estimates a total from stored line rows.
- Rules:
  - `sumQuoteGrandTotalWithDiscount`: money lines, optional filter; `gross = Σ total`; discount base per line `taxInclusive ? total : total − taxAmount`; percent → `base × v / 100`, flat → `min(v, base)`; `min(discount, gross)`; `grandTotal = round2(max(0, gross − discount))` with `round2(n) = Math.round((n + EPSILON) × 100) / 100`; `preTaxGrandTotal = max(0, Σ(total − taxAmount) − discount)`. Used only by the bot (optional always included).
  - `summarize_quote`: `subtotal = Σ item.total` (gross), `avgMargin` = plain average of stored `marginPercent` (which holds markup).
- Data: —
- States: —
- Words: summary *"Subtotal {x} · Avg margin {y}% · {n} items"*.
- Reachable: yes.

### B-27 · Contract value and finance (touchpoint)
- Where: `src/lib/finance/contract-value.ts:1-80`; `src/lib/finance/gst-split.ts:1-42`; `docs/rules/finance.md:133-156`; `src/lib/quote-compare.ts:1-70`.
- Does: finance reads the quote's persisted money, never recomputes it.
- Rules: contract value = latest `client_signed` quote's `total_cents`, else the primary `sent_for_signature`/`approved` quote, else `projects.budget_total`, plus approved client VOs (¢). Invoice GST fraction = base quote `tax_cents / total_cents` (else lead switch × region, else 0); `splitInclusiveGst(total, f)`: `gst = round(total × f)`. *"Compare PO with Quote"* compares PO lines against quote **selling** price (`quote.qty × unitPrice`), while the finance spec (`docs/features/finance-module/spec.md:73-90`) describes tracking "quoted cost vs actual PO cost"; a line's `vendor_id` pre-fills the PO. Hand-off C / finance.
- Reachable: yes.

---

## Discounts

### B-28 · Line discount (percent or flat)
- Where: `src/lib/quote-calc.ts:122-133`; grid cell `quote-row.tsx:645-680`; `grid-rows.tsx:20` (*"Discount"* column, visible by default, client-facing); item editor `price-book-item-editor.tsx:1148-1170`; paste `grid-columns.ts:15`.
- Entry: the grid's Discount cell (opens B-29), the item editor, paste into the Discount column.
- Does: takes money off one line before tax.
- Rules ($ / %):
  - `percent`: `discountAmount = subtotal × value / 100`, where `subtotal = unitPrice × effectiveQty` (waste included); `flat`: `discountAmount = value` **once per line** (not per unit); either only when `value > 0`; then capped at the line subtotal. `none` or `value ≤ 0` → 0.
  - Applied before tax (GST is charged on `subtotal − discountAmount`); zero on no-charge rows.
  - Line discounts are summed into `lineDiscount` and reduce the base the document discount works on (B-15).
  - Changing type in the item editor to None zeroes the value; in the drawer switching type clears the typed value.
- Data: `quote_line_items.discount_type TEXT DEFAULT 'none'`, `discount_value NUMERIC(12,2)`; `discount_amount` (B-33).
- States: cell shows *"—"* (read-only, no discount) or italic *"+ Add"* (editable, no discount); otherwise `"{v}%"` or `"{cs}{v, 2 dp}"`.
- Words: *"Discount"*, *"+ Add"*, cell title *"Edit discount"* or *"{label} — click to edit"*.
- Reachable: yes.

### B-29 · Edit discount drawer
- Where: `src/components/leads/discount-edit-drawer.tsx:1-295`; mount `line-items-grid.tsx:775-793`.
- Entry: click a line's Discount cell (not read-only).
- Does: edits one line's discount type, value and label.
- Rules:
  - Seeds type from the line (`flat` stays flat, anything else → percent) and value only when a discount is active; re-seeds when the target line changes.
  - Save requires `Number(value)` finite and `> 0` (inline error otherwise); a flat amount above the **unit price** or a percent above 100 shows a soft warning but saves.
  - Preview is **per unit**: `unitPrice − (percent ? unitPrice × v / 100 : v)`, floored at 0 — while the flat maths in B-28 subtracts `v` once from the whole line, so for `qty > 1` a flat preview differs from what the line total uses.
  - Save writes `discountType`, `discountValue`, `discountLabel` through one `trackEdit` (one undo step) without recomputing stored totals (display recomputes; see B-33). *"Remove discount"* (only when a discount is active) saves `none / 0 / null`.
  - Label trimmed, max 40 chars (`maxLength`), empty → null.
- Data: B-28 columns + `discount_label`.
- States: invalid value → red border + message; Save disabled until valid.
- Words: *"Edit discount"*, *"Line"*, *"Unit price: {cs}{x}"*, *"Type"*, *"Percent"*, *"Flat amount"*, *"Percent off"* / *"Amount off"*, *"Enter a discount amount, or click Remove discount to clear it."*, *"This discount is larger than the unit price."*, *"Percent discount is greater than 100%."*, *"Label"* *"(optional, shows on PDF)"*, placeholder *"e.g. Loyalty discount"*, *"{n}/40"*, *"Preview"*, *"Label: {label}"*, *"Remove discount"*, *"Cancel"*, *"Save"*.
- Reachable: yes.

### B-30 · Line discount label
- Where: migration `199_quote_line_items_discount_label.sql`; save route `route.ts:538`; drawer; renderers (templates B-98).
- Does: an optional name for a line's discount.
- Rules: trimmed; empty → NULL; ≤ 40 chars by the input only. Shown in the editor as the Discount cell's tooltip. The UI says it prints; no renderer reads it (templates B-98) — see B-100.
- Data: `quote_line_items.discount_label TEXT NULL`.
- Reachable: yes (editor); dead on print.

### B-31 · Document discount (lead-level)
- Where: `QDD:1947-1970` (`docDiscountFromMeta`), `1997-2020` (`updateDocDiscount`); `src/lib/quote-calc.ts:270-271, 372-382`; save roll-up and re-roll (B-19, B-20); `src/types/database.ts:60-62`.
- Entry: *"Apply additional discount"* in the Summary card (B-32).
- Does: a discount on the whole quote, after line discounts, before GST.
- Rules:
  - Stored on the **lead**: `leads.quote_metadata.docDiscount = { type: "percent" | "flat", value }` — every quote on the lead (all options) shares it; the re-roll applies it to each open quote; variations never take it (B-17).
  - Maths in B-15: percent of `subtotal − lineDiscount`; flat subtracted once; capped at that base; GST recomputed on the discounted base via `docRatio`.
  - Clearing stores the sentinel `{ type: "flat", value: 0 }`, not null, so the legacy fallback can't come back.
  - Legacy fallback while the lead has never had a `docDiscount`: the parsed source document's `discount` becomes a **flat** discount (`parsedDoc.discount > 0`).
  - Metadata-only write (optimistic lead cache patch, no line autosave); the PATCH triggers the re-roll (B-20).
- Data: `leads.quote_metadata.docDiscount` (JSONB).
- States: —
- Words: see B-32.
- Reachable: yes.

### B-32 · Document discount input (*"Apply additional discount"*)
- Where: `QDD:2037-2083` (draft state, commit), `7314-7370` (parsed-quote Summary), `7477-7533` (manual-quote Summary).
- Entry: editor Summary card (both variants), hidden when read-only.
- Does: edits the document discount.
- Rules: a `%` / `{currency symbol}` select plus a number input (`min 0`, `step 0.01`); keystrokes stay local; commit on blur, Enter or type change; a value that parses to ≤ 0 or NaN clears it; an unchanged value is not re-sent; *"×"* clears. The draft pre-fills from the stored discount or, when never touched, from the parsed document's discount.
- Data: B-31.
- States: *"×"* only while a positive value is typed.
- Words: *"Apply additional discount"*, options *"%"* and the region symbol, aria *"Discount type"*, *"Discount value"*, *"Clear discount"*; breakdown *"Total Discount"*, *"{cs}{x} line items + {cs}{y} document ({v}%)"*.
- Reachable: yes.

### B-33 · `discount_amount` and `tax_amount` are caches, `discount_amount` is not maintained
- Where: save route `route.ts:476-513, 535-537`; `QDD:3476-3485`; `price-book-item-editor.tsx:641-644`; drawer save `line-items-grid.tsx:782-791`; signing page `page.tsx:1011`.
- Does: stores per-line derived money.
- Rules: the save recomputes `tax_amount` and `total` for money lines (B-19) but persists `discount_amount` exactly as sent. It is only recomputed client-side on qty / discount-value / discount-type edits in the grid, on price and markup edits, and by the round-off; the item editor sends `0`, and the discount drawer does not recompute it. Readers that sum the stored column (the signing page's *"Discount"* line) can therefore under-state line discounts.
- Data: `quote_line_items.discount_amount NUMERIC(12,2)`.
- Reachable: yes.

---

## GST / tax

### B-34 · Region tax and currency table
- Where: `src/lib/region-config.ts:33-51, 131-557`; `docs/rules/regions.md`.
- Does: gives each market its currency and default tax.
- Rules (tax rate as a fraction, symbol as printed):

  | Region | Currency | Symbol | Locale | Tax name | Rate | Slabs |
  |---|---|---|---|---|---|---|
  | SG | SGD | `S$` | en-SG | *"GST"* | 0.09 | — |
  | MY | MYR | `RM` | en-MY | *"SST"* | 0.06 | — |
  | AE | AED | `AED` | en-AE | *"VAT"* | 0.05 | — |
  | IN | INR | `₹` | en-IN | *"GST"* | 0.18 | `5% 0.05 · 12% 0.12 · 18% 0.18 · 28% 0.28` |
  | EG | EGP | `E£` | en-EG | *"VAT"* | 0.14 | — |

  All symbols are prefix. `getRegionConfig(code)` falls back to SG for unknown codes. The quote's region is the lead's `country_code` (editor prop, else the session's `getCountryCode()`, default `"SG"`); the server roll-up uses `lead.country_code`, else `studios.country_code`, else SG.
- Data: code constant; `studios.country_code`, `leads.country_code`.
- Reachable: yes.

### B-35 · Effective tax rate in the editor and the per-quote GST switch
- Where: `QDD:1916-1929` (`effectiveTaxRate`), `2022-2035` (`updateGstEnabled`), `7384-7415`, `7549-7580` (switch UI); `src/types/database.ts:60-61`.
- Entry: the Summary card's tax row switch.
- Does: decides the one tax rate every editor total uses.
- Rules:
  - `entityGstRegistered = selectedEntity?.gstRegistered ?? true` (no entity → treated as registered); `quoteGstOverride = lead.quote_metadata.gstEnabled ?? null`; `gstEffectivelyOn = override === null ? entityGstRegistered : override` — **the per-quote switch wins over the entity**; `effectiveTaxRate = gstEffectivelyOn ? region.tax.rate : 0`.
  - The switch writes `quote_metadata.gstEnabled = true | false` (lead-level, shared by the lead's quotes) as a metadata-only optimistic write; the PATCH re-rolls totals (B-20). There is no way back to "inherit" (`null`) from the UI.
  - The row shows `{tax} ({region rate × 100, 0 dp}%)` next to the switch and *"—"* for the amount when off; the footer's tax row shows `{tax} ({effective rate × 100, 0 dp}%)` only when tax > 0.
- Data: `leads.quote_metadata.gstEnabled`.
- States: switch hidden when read-only.
- Words: aria *"Toggle {tax}"*, title *"Toggle {tax} for this quote"*.
- Reachable: yes.

### B-36 · Issuing entity in the totals bar (touchpoint)
- Where: `QDD:1855-1876, 2085-2150, 6333-6380`; `src/lib/queries/leads.ts:590-607, 684-820`; migration `154_leads_company_id.sql`.
- Entry: *"Issuing entity"* select in the grid footer, shown when the studio has ≥ 2 active entities and a lead exists.
- Does: picks the legal entity; its `gst_registered` feeds B-35 live.
- Rules: options list each entity with *"{tax}-registered"* / *"Not {tax}-registered"* and *"(Default)"*; the change is validated (projects under another entity hard-block; existing quotes/signatures ask to migrate) before `leads.company_id` is written. Changing it does not re-roll `total_cents` (B-20). Entities, validation and migration are hand-off D / C; the entity's bank, QR and letterhead are print (templates B-62).
- Data: `leads.company_id`, `studio_companies.gst_registered`.
- Words: *"Issuing entity"*, *"Select entity"*, *"(Default)"*.
- Reachable: yes (multi-entity studios).

### B-37 · Per-line tax rate, slabs and "Exempt" are overwritten
- Where: `src/lib/quote-calc.ts:273-301` (`normalizeLineItemTaxRates`); `QDD:2822-2834`; save route `route.ts:471-513`; `price-book-item-editor.tsx:1103-1133`; `src/lib/quote-canva/compose-quote-body.ts:272`; `render-quote-pdf-server.ts:553`.
- Entry: the item editor's per-line tax control (slab select for India, checkbox elsewhere).
- Does: nothing lasting — every money line is forced to the quote's effective rate.
- Rules: for `amount` / `lump_sum` lines `normalizeLineItemTaxRates` replaces any `taxRate` ≠ `effectiveTaxRate` (same reference kept when equal) before every editor total and every render; the save route then persists `tax_rate = effectiveTaxRate` for those lines whenever the client sends a rate (the editor always does). A line set to *"Exempt"*, a 5 % / 12 % / 28 % slab, or an unticked *"Apply {tax}"* therefore counts in every quote total, and saves, at the quote rate. Until that save comes back, the grid's own Total and tax cells read the raw line (`sortedFilteredItems`, not `itemsForDisplay`) and still show the per-line rate, so a line can briefly disagree with the Summary. Non-money lines keep their own rate (it has no effect).
- Data: `quote_line_items.tax_rate`.
- Reachable: the control is reachable; its effect is not.

### B-38 · Tax-inclusive lines
- Where: `src/lib/quote-calc.ts:135-149`; `price-book-item-editor.tsx:1134-1145`; tests `quote-calc.test.ts:109-172`.
- Entry: item editor *"Tax inclusive?"*.
- Does: treats the typed price as already containing tax.
- Rules: `taxAmount = preTaxTotal − preTaxTotal / (1 + rate)`; `lineTotal = preTaxTotal` (the gross price); the line's `subtotal`/`preTaxTotal` stay **gross**, so the quote's `subtotal` (and `subtotal_cents`) include that tax, while the quote-level `preTaxTotal` is net (`grandTotal − gstAmount`). A flat document discount on an all-inclusive quote comes off the gross (109 − 9 → 100). The flag survives tax normalisation and save.
- Data: `quote_line_items.tax_inclusive BOOLEAN DEFAULT false`.
- Words: *"Tax inclusive?"*, *"Price includes tax"*.
- Reachable: yes.

### B-39 · Server fallback render ignores the issuing entity's GST status
- Where: `src/lib/quote-canva/render-quote-pdf-server.ts:395-417, 553, 940`.
- Entry: the server PDF render (used when no stored canonical PDF exists; which surface prints what is templates B-79 / B-81).
- Does: computes the printed totals server-side.
- Rules: `effectiveTaxRate = lead.quote_metadata.gstEnabled === false ? 0 : region(countryCode).tax.rate` — the entity's `gst_registered` is not read, so a quote issued by a non-registered entity (switch untouched) is priced at 0 % in the editor and at the region rate by this path. The code comment says it "Mirrors the digitizer" (B-102).
- Reachable: yes (fallback path).

### B-40 · Entity tax-rate override — stored, not used on quotes
- Where: `src/app/(main)/accounts/legal-entities-tab.tsx:189-212, 691`; migration `130_studio_companies_tax_rate.sql`; `src/lib/studio-branding.ts:307-327` (`resolveEntityTaxRate`, no callers); `src/lib/entity-branding.ts:247-254`.
- Entry: Accounts › Legal Entities › *"Tax rate (%) — overrides region default"*.
- Does: stores a per-entity rate (blank = inherit; validated 0–100 %, stored as a fraction).
- Rules: no quote total reads it — the editor, the save roll-up, the re-roll and the server render all use `region.tax.rate` × on/off. It reaches only the signing page's branding payload.
- Data: `studio_companies.tax_rate NUMERIC(5,4)`.
- Words: *"Tax rate must be between 0 and 100 (percent)"*.
- Reachable: the field yes; its effect on quotes no (dead).

### B-41 · Tax labels and rate display
- Where: `QDD:1729-1731, 6409`; `line-items-grid.tsx:448-454`; `quote-row.tsx:747-754`; `quote-total-breakdown.tsx:28-40`.
- Does: names and shows the tax.
- Rules: the label is `region.tax.name`; rates print as `(rate × 100).toFixed(0)` (a fractional rate would round, e.g. 8.25 % → "8%"); the grid's *"{tax}"* column (key `gst`, label *"GST/Tax"* in the column picker, client-facing, visible by default, header tooltip `{tax} {effective × 100}%`) shows each raw line's `(item.taxRate ?? effective) × 100` or *"—"* (B-37); the lead drawer's breakdown always says *"GST"*. The printed tax label (`gstLabel` override) is templates A-38.
- Reachable: yes.

### B-42 · Currency symbol, the studio override, and money formatting
- Where: `src/lib/region-config.ts:559-696`; `QDD:1725-1728, 1911-1915`; `src/components/accounts/branding-editor.tsx:336-352`; `src/components/leads/quote-canva/blocks/pricing-table.tsx:611-626`.
- Entry: Accounts › Branding *"Currency Symbol on Quotes"*.
- Does: chooses the symbol money prints with.
- Rules:
  - Editor symbol `cs = symbol.length > 2 ? symbol + NBSP : symbol` (region symbol, not the override); numbers `toLocaleString(region locale, 2–2 dp)`.
  - `resolveCurrencySymbol(country, { currencySymbolOverride })`: a trimmed non-blank `studios.settings.branding.currencySymbolOverride` (input `maxLength 8`) wins, else the region symbol; used by the quote PDF paths only — invoices and finance keep the region symbol. `resolveCurrencyConfig` swaps only the symbol (code, locale, position unchanged). A pricing-table knob can hide the symbol entirely (templates B-18).
  - Helpers: `formatCurrency(amount $, cfg)` → 2 dp, a space after multi-char symbols, prefix/suffix per config; `formatCurrencyFromCents(¢)` = `/100` then `formatCurrency`; `formatSignedCurrencyFromCents` → one U+2212 minus for negatives; `formatCompactCurrency(¢)` → `Intl` compact, 1 dp max.
  - The price book has no currency column: its numbers are shown with the viewer's session region symbol.
- Data: `studios.settings.branding.currencySymbolOverride`.
- Words: *"Currency Symbol on Quotes"*, *"Optional. Leave blank to use your region default ({symbol}). Applies to quote PDFs only — invoices and finance reports are unchanged."*
- Reachable: yes.

---

## Rounding

### B-43 · Rounding points and cents conversion
- Where: `src/lib/quote-calc.ts:561-563`; `src/lib/quote-total.ts:69-71`; `src/lib/quote-cost-margin.ts:98, 126`; save route `route.ts:719`; `src/lib/finance/gst-split.ts`; `src/lib/finance/vo-render-context.ts:52-70`.
- Does: fixes where money is rounded.
- Rules:
  - `round2(n) = Math.round(n × 100) / 100` on every output of `computeLineTotals` and `computeQuoteTotals`; intermediate sums stay unrounded (the grand total is `round2(Σ unrounded line totals × (1 − docRatio))`, not a sum of rounded lines). `quote-total.ts` uses `Math.round((n + Number.EPSILON) × 100) / 100`.
  - Dollars → cents at persistence: `Math.round(n × 100)` for each of the four `quotes.*_cents` (B-19); VO context the same.
  - A derived price from a markup edit rounds to 2 dp; the implied markup rounds to 2 dp (grid) or 1 dp (item editor, B-47).
  - Line money columns are `NUMERIC(12,2)`, so anything stored with more decimals is rounded by Postgres; `qty NUMERIC(12,2)`.
  - No banker's rounding anywhere; `Math.round` rounds .5 up (towards +∞).
- Reachable: yes.

### B-44 · Round selling prices — the rule
- Where: `src/lib/quote-round-off.ts:1-129`; `QDD:1931-1943` (`handleApplyRoundOff`); test `quote-round-off.test.ts`; spec `docs/superpowers/specs/2026-08-06-quote-digitizer-inline-editing-round-off-design.md` §2.
- Entry: toolbar *"Round prices"* (panel and focused grid), hidden when read-only or empty.
- Does: rounds every eligible line's **unit price** to a step, as one undoable edit.
- Rules:
  - Steps `ROUND_OFF_STEPS = [1, 5, 10, 50, 100]` (currency units); directions `nearest` (default, `Math.round`), `up` (`Math.ceil`), `down` (`Math.floor`) applied to `value / step`, then `round(n × step × 100) / 100`; a step ≤ 0 is a no-op.
  - Eligible (`isRoundable`): price type absent / `amount` / `lump_sum`; no amount marker (any label); `unitPrice > 0`. Everything else is counted as *skipped*; eligible lines already on the step as *unchanged*.
  - Apply: `unitPrice = to`; `priceType` stays `lump_sum` for lump sums, else becomes `amount`; recompute `total`, `discountAmount`, `taxAmount`; cost untouched; `marginPercent = computeLineTotals(...).marginPercent` — **margin-of-revenue written into the field that holds markup** (B-97).
  - Whole quote only (collapse state and filters don't narrow it); one `trackEdit` (`"Round {n} selling price(s)"`) = one undo step and one autosave. Independent of the grand-total knob (B-46).
- Data: `quote_line_items.unit_price`, `total`, `discount_amount`, `tax_amount`, `margin_percent`.
- Words: toast *"Rounded {n} line(s)"*.
- Reachable: yes.

### B-45 · Round selling prices — the dialog
- Where: `src/components/leads/round-off-dialog.tsx:1-173`; mount `QDD:10685-10692`; button `QDD:6225-6240`.
- Entry: *"Round prices"*.
- Does: previews the plan and applies it.
- Rules: defaults step 1, nearest; the plan is recomputed on every change; the preview groups changed lines by category (label = trimmed name, else description, else *"(untitled item)"*) showing `from` and `to` money in the region locale (region symbol, not the override); Apply disabled when nothing changes.
- States: empty plan → *"Nothing to round."*.
- Words: *"Round selling prices"*, *"Nearest"*, `1 5 10 50 100`, *"Round up"*, *"Round down"*, *"No line prices would change at this step."*, *"{n} line(s) will change."*, *" {n} already on the step."*, *" {n} skipped (no chargeable price)."*, *"Cancel"*, *"Apply"* / *"Apply to {n} line(s)"*; button *"Round prices"*, title *"Round every line's selling price to a clean number"*.
- Reachable: yes.

### B-46 · Grand-total "Round Off" knob (touchpoint)
- Where: `src/lib/quote-pdf-layout.ts:244-248, 456, 626-634`; `src/components/leads/quote-pdf.tsx:1859-1880, 3728, 4518-4525`; templates A-40, D-103.
- Does: on the legacy @react-pdf renderer only, prints `Math.round(grandTotal)` (nearest whole unit) with a *"Round Off"* delta row; the legacy payment schedule and `{quote_total}` token use the rounded figure.
- Rules: default `{ enabled: false, label: "Round Off" }`; no editor control (templates A-40); the canva renderer ignores it; `quotes.total_cents`, the editor Summary and the editor's payment schedule stay unrounded, so an enabled knob makes the printed total differ from the stored one.
- Reachable: only via a template body that sets it (fork patches); legacy renderer only.

### B-47 · Markup precision and the column caps
- Where: `src/lib/quote-cost-margin.ts:81-99`; `price-book-item-editor.tsx:358-363`; `scripts/migrations/031_quote_line_items.sql:12`; `supabase/migrations/20260414000003_price_book_v2.sql:13`; `20260416000002_pricing_tiers.sql:25`.
- Does: bounds markup.
- Rules: the clamp allows −100 … 10000 %, but `quote_line_items.margin_percent`, `studio_price_book.markup_percent` and `vendors.default_markup_percent` are `NUMERIC(5,2)` (−999.99 … 999.99), so a markup ≥ 1000 % passes the UI and fails the database write (a numeric-overflow error fails the whole line save / price-book save). Grid implied markup rounds to 2 dp; the item editor's to 1 dp — the same row can read 33.33 in the grid and 33.3 in the panel.
- Reachable: yes.

---

## Margin and internal figures

### B-48 · Line margin and the cost-exceeds-price warning
- Where: `src/lib/quote-calc.ts:38-53, 79-113, 151-213`; tests `quote-calc-margin.test.ts`, `quote-calc-margin-todz.test.ts`, `quote-row-margin-cell.test.ts`.
- Does: reports how profitable one line is (margin-of-revenue, not the markup dial).
- Rules ($ / %):
  - Priced row (`costPrice != null`, `costPrice ≥ 0`, `unitPrice > 0`): `lineCost = costPrice × effectiveQty`; `marginAmount = preTaxTotal − lineCost` (whole line, after line discount, before tax); if `preTaxTotal > 0`: `lineCost > preTaxTotal` → `marginPercent = −100` and `marginWarning = "cost_exceeds_price"`, else `marginAmount / preTaxTotal × 100`; if `preTaxTotal ≤ 0` (e.g. a 100 % discount): `lineCost > 0 ? −100 : 0`, no warning.
  - Deliberate no-charge row: `noChargeCost = costPrice × qty` (no waste) when `costPrice ≥ 0`; `marginPercent = cost > 0 ? −100 : 0`; `marginAmount = −cost` (negative zero normalised to 0); never warned.
  - Unfinished row (cost, no price, no marker) or no cost: margin null.
  - `cost = 0` → 100 % margin; `cost = null` → underivable.
- Data: derived; `enrichLineItem` (would store it) has no callers.
- Reachable: yes.

### B-49 · Quote margin roll-up
- Where: `src/lib/quote-calc.ts:345-369, 407-408`.
- Does: totals revenue and cost for the whole quote.
- Rules: a line contributes when `costPrice != null && costPrice ≥ 0 && (unitPrice > 0 || deliberate no-charge)`: `totalRevenue += preTaxTotal` (after line discounts, before the document discount), `totalCost += costPrice × effectiveQty`. Omission lines add positively like any other line. `overallMarginPercent = totalRevenue > 0 ? round2((revenue − cost) / revenue × 100) : null`. The document discount never reduces revenue here.
- Reachable: yes.

### B-50 · Category margins
- Where: `src/lib/quote-calc.ts:437-524`.
- Does: margin per section for the panel.
- Rules: a line is considered when `unitPrice > 0` or `costPrice > 0`; category = `item.category || "Others"`. No-charge rows with a cost add `costPrice × qty` to cost and count as an item. Priced + costed rows add `preTaxTotal` and `costPrice × effectiveQty`. Priced-no-cost rows count as *uncosted*, costed-no-price rows as *unpriced*. `hasCost` here is `costPrice > 0`, so a priced zero-cost line counts as *uncosted* here while B-49 counts it at 100 % margin. `marginPercent = count > 0 && revenue > 0 ? round2(...) : null`. Sort: categories with a margin first, by margin descending; then data-gap categories alphabetically.
- Reachable: yes.

### B-51 · Margin analysis panel
- Where: `src/components/leads/quote-margin-panel.tsx:1-279`; mounts `QDD:7747-7766` (left sidebar, with the fix action) and `src/components/leads/quote-document-editor.tsx:7930-7933, 8248` (legacy layout editor, shown only when the studio's canva editor flag is off, no fix action).
- Entry: editor left sidebar under the payment schedule (frame is hand-off A).
- Does: shows revenue, cost, margin and markup for the quote and per category.
- Rules:
  - Input is the raw `items` with the effective tax rate and **no document discount**, and it includes optional lines even when the Optional Works rule excludes them.
  - Money-row buckets (price type absent / `amount` / `lump_sum`): both sides (`unitPrice > 0 && cost > 0`), priced-uncosted, costed-unpriced.
  - Empty state when no row has cost data; data-gap state when there is cost but no revenue.
  - Summary: *Revenue* = `totalRevenue`, *Cost* = `totalCost`, *Gross Margin* = `revenue − cost` (`overallMarginPercent` 1 dp), *Markup on cost* = `(revenue − cost) / cost × 100` (1 dp; *"—"* when cost 0). Background / text: margin ≥ 20 green, ≥ 10 amber, else red.
  - Low-margin warning when `overallMarginPercent < 15`. It is advisory: no margin or markup floor blocks a save, a submit, an approval or a send anywhere in 1.0 (the approval thresholds that exist are never read — B-55).
  - Category bars: width `min(100, max(5, margin))`, data-gap rows at 30 % grey with *"{n} · no price"* / *"{n} · no cost"*.
  - Line-total-cost banners (B-14) sit above the summary.
- States: empty, data-gap, full.
- Words: *"Margin analysis"*, *"Add cost prices to your line items to see your margin."*, *"How to set this up"*, *"Show the Unit Cost column via the column visibility button (⇕) in the toolbar"*, *"Type cost prices into your line items, or"*, *"Set up your Price Book at Accounts → Quotes & Pricing"*, *"{n} items are costed but not priced. Margin can't be computed until unit prices are filled."*, *"Cost on file: {cs}{x}. Fill in the unit_price column to see margin."*, *"Revenue"*, *"Cost"*, *"Gross Margin"*, *"Markup on cost"* (title *"Markup = (revenue − cost) / cost. This is the dial the Markup column sets. Margin above = (revenue − cost) / revenue."*), *"Overall margin is below 15%. Industry average for mid-range studios is 15-25%."*, *"By Category"*, tooltips *"Selling price not set on these items"* / *"Cost not found in your price book"*, footers *"{n} items — cost not found in your price book; margin excludes them"*, *"{n} items missing unit price — revenue excludes them"*.
- Reachable: yes.

### B-52 · Internal vs client-facing columns
- Where: `src/components/leads/focused-grid/column-visibility-icon.tsx:26-78`; `grid-rows.tsx:16-34`; `src/lib/quote-column-prefs.ts:1-91`; print side templates B-98.
- Does: marks which grid columns reach the client document.
- Rules: client-facing = `description`, `category`, `unitPrice`, `discount`, `qty`, `unit`, `gst`, `total`; internal = `costPrice`, `marginPercent`, `notes`, `sku`, `comments`, `aiSuggestion`; unknown keys → internal. Optional columns and defaults: *"Category"* off, *"Discount"* on, *"GST/Tax"* on, *"Unit Cost"* on, *"Markup %"* on, *"Notes"* off, *"SKU / Ref"* off; per-browser sparse overrides (`visible = override ?? defaultVisible`) in `localStorage["quote-digitizer:columns"]`, hydrated after mount; a corrupt payload is cleared.
- Words: *"Shown on client PDF"*, *"Internal only — not shown on client PDF"*.
- Reachable: yes.

### B-53 · Internal money on client payloads
- Where: `src/app/api/quotes/request-signature/route.ts:256-266, 368-370`; `src/app/api/sign/[token]/verify-otp/route.ts:61, 166`; `src/app/api/sign/[token]/route.ts:227-246`; `src/app/quote-preview/[token]/page.tsx:132-154`; `src/lib/homeowner-line-items.ts:1-40`; templates B-98.
- Does: records where internal line money leaves the studio.
- Rules:
  - Signing snapshot = `select("*")` of the lines, so `cost_price`, `margin_percent` (markup), `vendor_id`, `waste_percent`, `notes`, `comments`, `competitor_benchmark_cents` are inside `quote_snapshot`; the GET withholds it until OTP, then `verify-otp` and signed links return it whole (the page renders only client fields). Hand-off C.
  - The public `/api/quote-preview/<token>` JSON returns cost, margin and benchmark without sign-in (templates B-98).
  - The homeowner portal's invoice / VO `line_items` pass an allow-list of safe keys only.
  - Competitor benchmark (NF13): `competitor_benchmark_cents` (¢/unit) + `competitor_source`; the live preview prints *"This quotation is {p}% below the {source} benchmark — saving you approximately {x}."* when Σ benchmark × qty > Σ unitPrice × 100 × qty and the rounded saving ≥ 1 %. No surface in the app sets the benchmark (only the save passthrough), so the callout needs seeded data.
- Reachable: yes (benchmark: no writer).

### B-54 · AI money helpers — margin warnings and "set global margin" (touchpoint)
- Where: `src/app/api/quotes/insights/route.ts:17, 238-277, 292, 344-382`; `src/lib/quote-agent/tools.ts:128-141`; `src/lib/quote-agent/executors.ts:767-782`; `src/lib/quote-agent/patches.ts:13-20`.
- Does: lets AI flag or change margins (surfaces are hand-off A).
- Rules:
  - Insights send each line's stored `marginPercent` (which holds markup) as "margin"; the prompt defines `margin_warning` as *"dangerously low (<10%) or negative"*, priority `underquote > margin_warning > missing > upsell`, max 8, and forbids flagging over-pricing.
  - `set_global_margin { percent: −50…100, category? }` patches `marginPercent` on the matched lines and nothing else: no price is re-derived (unlike B-07) and the grid shows the derived markup, so the call changes no money.
- Words: tool summary *"Global margin → {p}% ({category or "all categories"}) · {n} items affected"*.
- Reachable: yes.

### B-55 · Quote Approval Rules thresholds — stored, never read
- Where: `src/app/(main)/accounts/page.tsx:322-328, 400-410, 489-518, 1151-1215`; `src/types/app.ts:610-616`; `src/lib/transformers.ts:1485-1489`.
- Entry: Accounts › Quotes & Pricing › *"Quote Approval Rules"*.
- Does: saves money thresholds for quote approval.
- Rules: defaults `autoApproveBelow 50000`, `requireApprovalAbove 100000` (currency-less numbers under a hard-coded *"($)"*), `approverRole "Finance"`, `notifyOnRejection true`, `rejectionReasons ["Margin too low", "Client credit risk", "Resource unavailable", "Scope unclear"]`; validation: both ≥ 0 and auto ≤ require. Stored in `studios.settings.quote_approval`; **no approval path reads the thresholds** (the flow is `quoteApprovalRequired` + approver lists — hand-off C).
- Words: *"Quote Approval Rules"*, *"Set thresholds for auto-approval and required sign-offs."*, *"Auto-approve quotes below ($)"*, *"Quotes under this amount are auto-approved."*, *"Require approval above ($)"*, *"Quotes above this need explicit sign-off."*, *"Default Approver Role"*, *"Rejection Reasons"*, toasts *"Thresholds must be zero or positive"*, *"Auto-approve threshold must be lower than the review-required threshold"*, *"Approval rules saved"*.
- Reachable: the form yes; its thresholds dead.

### B-56 · Rebates, commissions and markup-on-cost reports
- Where: grep over `src/` for rebate / commission on quote lines; `src/lib/commission-split.ts`, `src/lib/agents/executors.ts:590` (`commission_split_bps`).
- Does: records their absence on a quote.
- Rules: 1.0 has no rebate or commission field on a quote or a line; commissions are finance (payment-driven, `commission_split_bps` on lead assignees, 10000 = 100 %) — hand-off C / finance.
- Reachable: n/a.

---

## The price book

### B-57 · Where the price book lives, and who sees and edits it
- Where: `src/app/(main)/accounts/page.tsx:93-107, 1143-1146`; `src/components/accounts/price-book-manager.tsx:54-96, 462-477`; `src/components/price-book/tabs.tsx:1-116`; `src/lib/access-control.ts:123-126, 205-296, 344-345`; `QDD:1128, 6686-6695`.
- Entry: Accounts › *"Quotes & Pricing"* › *"Price Book"* (`/accounts?tab=catalogue`, sub-tab `?pb=items|pending|drift|imports`); the editor header's book icon (*"Open price book"*, B-78).
- Does: hosts the studio catalogue in four tabs.
- Rules:
  - `/accounts` admits `owner · admin · id · accounting` ("ID + accounting can land on /accounts to view the price book read-only").
  - `pricebook.view` default `id || admin || accounting` (owner counts as admin); `pricebook.edit` default `owner || admin`; role grants (`studio_roles.permissions`) and member overrides win (`resolveCanPerformAction`). Without edit: a read-only banner, no Import / Vendor markup / Add Item / Seed buttons, no Archive / Delete in the row kebab, and the editor's book icon is hidden.
  - Tabs *"Items"*, *"Pending"* (badge = pending count), *"Drift"* (badge = drift count, B-69), *"Imports"*; badges hidden at 0; the active tab is mirrored into `?pb=` so notifications deep-link.
  - The Accounts › *"Material Catalog"* tab is a separate catalogue for client selections (projects), not a quote price source.
- Data: —
- States: read-only banner.
- Words: *"Read-only — only owners/admins can edit the price book."*, *"Items"*, *"Pending"*, *"Drift"*, *"Imports"*, aria *"Price Book sections"*.
- Reachable: yes.

### B-58 · The price-book item
- Where: `scripts/migrations/090_studio_customization_engine.sql:69-81`; `supabase/migrations/20260414000003_price_book_v2.sql:7-19`; `20260416000001_price_book_v3.sql:33-47`; migrations 100, 112, 113, 114, 135, 159, 160, 288; `src/types/app.ts:3862-3906`; `src/lib/transformers.ts:978-1040`; templates D-19.
- Does: one catalogue row.
- Rules / fields: `name` (headline, *"Item Name"*, required in the editor), `description TEXT NOT NULL` (specs; legacy rows carry the title here), `item_id` (SKU, unique per studio when set, B-66), `category_id → studio_quote_categories ON DELETE SET NULL`, `subcategory` (migration "215", see Uncertain), `unit_price NUMERIC` ($, unconstrained precision), `unit`, `cost_price NUMERIC(12,2)` ($ per unit), `markup_percent NUMERIC(5,2)` (%), `cost_type` ∈ `material · labor · subcontractor · combined` (default `combined`), `waste_percent NUMERIC(5,2) DEFAULT 0`, `vendor_ids UUID[] NOT NULL DEFAULT '{}'` + `vendor_id` (first, deprecated mirror, FK SET NULL), `market_rate_min / market_rate_max NUMERIC(12,2)` (read by the typeahead, written by nothing in the app), `tags TEXT[]`, `notes`, `image_url`, `spec_url`, `is_active DEFAULT true` (archive), `approval_status` ∈ `pending · approved · rejected` (default `approved`) + `approved_by`, `approved_at`, `approver_user_id` (never written), `order_index INT NULL`, `source` (`manual · csv_import · ai_parse · market_seed`), `external_ref`, `created_by`, `embedding vector(1536)`, timestamps. Child tables: `price_book_pricing_tiers`, `price_book_history`; `price_book_suggestions.added_to_price_book_id`.
  - No currency column (B-42). A quote line never reads the book live: it copies figures and keeps a soft `price_book_item_id`.
- Data: `studio_price_book` (RLS lock deferred per route comments).
- Reachable: yes.

### B-59 · Items list — grouping, filters, sort, stats
- Where: `price-book-manager.tsx:142-310, 394-400, 486-1027`; server order `src/app/api/studio-config/price-book/route.ts:54-136`.
- Entry: the Items tab.
- Does: lists the catalogue by category.
- Rules:
  - Server returns every row (1000-row pages) ordered `order_index ASC NULLS LAST, created_at DESC`, with category name, creator, vendor names and tiers joined.
  - Filters: text search (lowercase substring over name, description, category name), category select (the active `studio_quote_categories` list only), *"Active"* / *"Archived"* toggle (mutually exclusive views), drift-only pill.
  - Sort: clicking *Description / Cost / Markup / Sell Price* cycles asc → desc → none, applied **within** each run of same-category rows (nulls as 0).
  - Grouping: by category name, alphabetical; the unfiltered view pre-seeds every active category so empty ones show; no category → *"Uncategorised"*. Categories with > 200 items auto-collapse once on first load; any filter overrides collapse.
  - Row number = position in the visible list; header shows count and *"avg {cs}{x}"* = mean `unit_price` of the group's items (null as 0).
  - Row shows name · SKU · *Pending* / *Rejected* chip, description + *"Spec ↗"*, cost-type chip (if not combined), *"+{w}% waste"*, creator; *Unit*; *Vendor* (first name, *"+{n}"*); *Cost*; *Markup* (`{m}%` as stored); *Notes*; *Sell Price* with drift chip.
  - Stats: *"{n} active"*, *"{n} archived"*, *"{n} categories"*, *"Manage →"* (opens Quote Categories in a new tab), *"{n} {cc} benchmarks"*.
- States: loading spinner; empties *"No archived items"*, *"No items priced outside market range with the current filter"*, *"No items match the current filter"*, *"No items in your price book yet"* (+ *"Clear filters"*).
- Words: *"Search items..."*, *"All Categories"*, *"Active"*, *"Archived"*, *"Import CSV"*, *"Export CSV"*, *"Vendor markup config"*, *"Add Item"*, headers *"#"*, *"Description"*, *"Unit"*, *"Vendor"*, *"Cost"*, *"Markup"*, *"Notes"*, *"Sell Price"*, *"Select all visible"*, *"Pending approval by an admin or owner"*, *"Rejected — restore via the Archived view"*.
- Reachable: yes.

### B-60 · Add or edit an item (price-book mode)
- Where: `src/components/accounts/price-book-item-editor.tsx:46-53, 120-547, 667-1453`; `src/app/api/quotes/categories/resolve/route.ts`; `src/app/api/price-book/upload-image/route.ts:6-70`.
- Entry: *"Add Item"*, clicking a row, kebab *"Edit item"*, Drift *"Suggest"*, Pending *"Open in editor"*.
- Does: edits one catalogue row in a side panel.
- Rules:
  - Fields: *Item Name* (required), *Item ID / SKU* (read-only, B-66), *Description* (plain text), *Category* (the studio's categories plus the 19 `DEFAULT_CATEGORY_NAMES` not yet present, marked *"Will be created on save"*, resolved through `POST /api/quotes/categories/resolve`), *Subcategory*, the pricing block (same triangle as B-10), *Unit*, *Cost Type*, *Waste Factor (%)*, vendors (B-67), *Volume Pricing Tiers* (B-93), *Spec Sheet / Product Link* (must be `http:` / `https:`, checked on blur), *Tags* (comma-separated), *Notes*, *Item Image*.
  - Add → `POST /api/studio-config/price-book` with `unitPrice: sell || undefined`, `costPrice: cost || undefined`, `markupPercent: markup || undefined` (a 0 becomes NULL), `source: "manual"`; approval, SKU and embedding per B-61, B-66, B-85.
  - Edit → `PATCH /api/studio-config/price-book/{id}` with every field (`unit_price: sell || null`, `cost_price: cost || null`, `markup_percent: markup || null`, `vendor_id = vendors[0]`, `vendor_ids`) and `previousValues {unit_price, cost_price, markup_percent, is_active}`; then `PUT /api/studio-config/pricing-tiers` (failure only logged).
  - Image: upload only after the item exists; ≤ 5 MB; JPEG / PNG / WebP / GIF; public bucket `price-book-images` (public URL stored).
  - `DEFAULT_CATEGORY_NAMES` = Preliminaries, Demolition, Masonry, Plumbing, Electrical, Partition & Ceiling, Plastering, Painting, Flooring, Carpentry, Countertop, Glass & Mirror, Doors, Aluminium, Decking, Design, Materials, Cleaning, Others.
- States: Save disabled while pending, with an invalid spec URL, or without a name.
- Words: *"Add Price Book Item"* / *"Edit Price Book Item"*, *"New item"*, *"Added by {name}"*, placeholder *"e.g., Supply & install kitchen carpentry"*, *"Auto-generated on save"* (title *"Auto-generated sequentially per studio (PB-001, PB-002, …)"*), *"Select category..."*, *"URL must start with http:// or https://"*, *"Enter a valid URL (e.g. https://example.com/spec.pdf)"*, *"Comma-separated"*, *"Internal notes about this item..."*, *"Save the item first to upload an image."*, *"JPEG, PNG, WebP. Max 5MB."*, *"Add Item"* / *"Save Changes"*, toasts *"Item added to price book"*, *"Failed to add item"*, *"Item saved"*, *"Failed to save item"*, *"Image uploaded"*, *"Failed to upload image"*.
- Reachable: yes.

### B-61 · Item approval workflow (pending / approved / rejected)
- Where: `src/app/api/studio-config/price-book/route.ts:26-46, 156-256`; `src/app/api/studio-config/price-book/[id]/route.ts:20-39, 68-158`; `src/app/api/price-book/notify-pending/route.ts:48-99`; migrations 114, 160.
- Entry: any add or edit.
- Does: makes non-owner/admin changes wait for approval.
- Rules:
  - Gate for add / edit: `pricebook.edit` resolved from the `studio_roles` row whose slug is the member's first tag in `owner → admin → accounting → id` order (else tag fallback); 403 *"You don't have permission to edit the price book."*
  - Trust is the **literal tag** `owner` or `admin`, not the permission. Trusted add → `approved` (approved_by / at = actor). Untrusted add (a role granted `pricebook.edit`) → `pending`, plus one `tasks` row per item (`type "PriceBookItemApproval"`, title *"Approve price book item: {label}"*, assignee = first owner else first admin, planned today) and a `price_book.item_pending_approval` notification (`action: "created"`).
  - Edit: an archive-only change (`is_active` alone) skips the machine. Trusted edit of a pending row approves it and completes its pending tasks. Untrusted edit of a non-pending row flips it back to `pending` with a *"Re-approve price book item: {label}"* task and a notification (`action: "edited"`).
  - Notification recipient = `studios.settings.workflow.approvers.priceBookApproval[0]` ?? first owner ?? first admin, while the task goes to first owner ?? first admin (the configured approver is ignored for the task). `approver_user_id` is never written.
  - Pending rows stay usable in quotes (typeahead, browse, auto-match and semantic search all include them); rejected rows are deactivated (B-62).
- Data: `studio_price_book.approval_status · approved_by · approved_at`; `tasks`.
- Reachable: yes (only for members granted `pricebook.edit` without the tag).

### B-62 · Pending tab, approve and reject
- Where: `src/components/price-book/pending-tab.tsx:1-284`; `src/app/api/price-book/[id]/approve/route.ts:1-119`; `src/app/api/price-book/[id]/reject/route.ts:1-124`; `src/app/(main)/tasks/page.tsx:750-830`.
- Entry: Price Book › Pending; the Tasks inbox approval task.
- Does: clears the approval queue.
- Rules:
  - Lists `approval_status = 'pending'` items with category, submitter and date, sell and cost; *"Similar to: {x}"* when an active non-pending item's normalised name (lowercase, non-alphanumerics → space) equals the pending one or either is a prefix of the other (target ≥ 3 chars).
  - Approve (admin / owner tag only): `approved`, `approved_by / at`, **`is_active = true`**, closes pending tasks, notifies the creator (`price_book.item_approved`); an already-approved item returns `{ alreadyApproved: true }`.
  - Reject (admin / owner tag only; a non-empty trimmed comment is required, 400 *"comment is required"*): `rejected`, `approved_by / at` = rejecter, **`is_active = false`**, closes tasks with the comment, notifies the creator (`price_book.item_rejected`). Any status can be rejected.
- States: *"Nothing to review"*; busy row disables its buttons.
- Words: *"Pending approval"*, *"Items submitted by team members that need your review before they show up in the Items library."*, *"New items submitted by team members will show up here."*, *"{n} pending item(s)"*, *"Approve or reject to clear the queue."*, *"Unknown submitter"*, *"Similar to: {x}"*, *"Cost {cs}{x}"*, *"Reject"*, *"Why are you rejecting this?"*, *"The submitter will see this comment in their notification so they know what to fix."*, placeholder *"e.g., Price is below our floor for this category"*, *"Confirm reject"*, *"Approve"*, *"Open in editor"*, toasts *"Approved "{x}""*, *"Rejected "{x}""*, *"Reject comment is required so the submitter knows what to change"*; 403 *"Only admins or owners can approve price book items"* / *"… reject …"*.
- Reachable: yes.

### B-63 · Archive, restore and delete permanently
- Where: `price-book-manager.tsx:323-352, 434-456, 952-1062, 1268-1291`; `src/app/api/price-book/[id]/route.ts:1-90`.
- Entry: row kebab; bulk bar (select rows).
- Does: hides, un-hides or removes items.
- Rules:
  - Archive / restore = PATCH `{ is_active }` (history `archive` / `restore`); archived items leave every quote picker and match (they filter on `is_active`), and the Items view.
  - Bulk archive / restore runs per item with `Promise.allSettled`; the bulk bar and checkboxes show for everyone, so a user without edit gets per-item 403s (*"{n} of {m} archive operations failed"*).
  - Delete permanently: `DELETE /api/price-book/{id}` — admin / owner **tag** only (403 *"Only admins or owners can delete price book items. Use Archive instead."*), 404 when not in the studio; cascades history and tiers; quote lines keep their copied figures (the soft link dangles); suggestions keep a dangling `added_to_price_book_id`.
- Words: confirm *"Archive "{x}"? It will be hidden from new quotes but kept in history."*, bulk confirm *"Archive {n} item(s)? Archived items are hidden from quotes but kept in history."*, kebab *"Edit item"*, *"View history"*, *"Archive"*, *"Restore"*, *"Delete permanently"*, bar *"{n} selected"*, *"Clear"*, *"Move to category…"*, dialog *"Delete this price book item?"* · *"“{x}” will be permanently removed, along with its history and pricing tiers. Existing quotes that referenced it keep their cached price (the link just disappears). This can't be undone — use Archive if you might want it back."*, toasts *"Item archived"*, *"Item restored"*, *"Archived {n} item(s)"*, *"Restored {n} item(s)"*, *"Deleted “{x}”"*.
- Reachable: yes.

### B-64 · Drag reorder and move to category
- Where: `price-book-manager.tsx:97-141, 353-383`; `src/app/api/studio-config/price-book/reorder/route.ts:1-43`.
- Entry: drag a row (handle always visible); bulk *"Move to category…"*.
- Does: orders the catalogue and re-files items.
- Rules: a drop splices the dragged item before/after the target in the **whole** price-book array and rewrites `order_index = 0…n` for every row (archived included); dropping on another category's row adopts that `category_id`. The reorder route has **no permission check** (session only). Bulk move PATCHes `category_id` per item (gated, history row per item). Order drives the Items list and nothing on quotes.
- Words: toasts *"Could not save new order"*, *"Moved {n} item(s) to {category}"*, *"Category "{x}" not found"*, *"Failed to move items"*.
- Reachable: yes.

### B-65 · Price history
- Where: `src/components/accounts/price-book-history-drawer.tsx:1-182`; `src/app/api/studio-config/price-book/[id]/route.ts:160-183`; `src/app/api/studio-config/price-book-history/route.ts`; table `supabase/migrations/20260416000001_price_book_v3.sql:8-26`.
- Entry: kebab *"View history"*.
- Does: shows an item's change log.
- Rules: rows are written **only** by the PATCH route (field edits, archive, restore, bulk move); not by add, import, reorder, vendor markup, tiers, approve / reject or delete. `change_type` = `archive` / `restore` / `update` (`create` exists in the type but is never written). `field_changes` compares each sent change with `previousValues`, which carries only unit price, cost, markup and active — every other field the editor sends is logged as changed from null on every save. Before / after columns for sell, cost and markup; the GET returns the latest 50 rows, newest first; the drawer shows *Sell*, *Cost*, *Markup* lines only when both sides are non-null and differ, then *"{field}: {old} → {new}"* for the rest.
- States: empty *"No changes recorded yet"* · *"History begins when an item is first edited"*.
- Words: *"Price History"*, *"Created"*, *"Updated"*, *"Archived"*, *"Restored"*, *"by {name}"*, *"Sell:"*, *"Cost:"*, *"Markup:"*.
- Reachable: yes.

### B-66 · Item ID / SKU (`PB-NNN`)
- Where: `src/app/api/studio-config/price-book/route.ts:176-192`; `src/app/api/price-book/suggestions/bulk/route.ts:96-114, 186-191`; migrations `113_item_name_and_item_id.sql`, `159_price_book_item_id_unique.sql`.
- Does: gives every new item a studio-unique code.
- Rules: when any row in the request lacks an id, read all `item_id ILIKE 'PB-%'`, take the max of `^PB-(\d+)$`, and hand out `PB-{max+1}` padded to 3 digits in request order; supplied ids are kept. Unique index `(studio_id, item_id) WHERE item_id IS NOT NULL` (159 blanked older duplicates); two concurrent adds can pick the same number and the second insert fails. The editor shows the id read-only; a quote line copies it as `itemId`.
- Reachable: yes.

### B-67 · Vendors on price-book items
- Where: `price-book-item-editor.tsx:223-236, 310-334, 985-1080`; `src/lib/transformers.ts:989-1001`; migrations `100_studio_price_book_vendor_fk.sql`, `135_pricebook_multi_vendor.sql`, `313_merge_vendors_fn.sql:176-243`; `src/lib/vendors/dedupe.ts`; tests `h2-multi-vendor.test.ts`, `h2-per-line-vendor-pick.test.ts`.
- Entry: the item editor's vendor block; imports; the browse modal; the line editor.
- Does: links items to suppliers.
- Rules:
  - `vendor_ids` is the ordered list (first = primary, the PO pre-fill vendor); `vendor_id` mirrors the first. Price-book mode edits a primary picker plus *"+ Add another vendor"* chips.
  - On a quote line: one `vendor_id`, labelled *"Vendor for this purchase"*; when the line is linked to a book item with vendors, the picker is limited to that pool, creating a vendor there is disabled, and a stale line vendor outside the pool is cleared.
  - Vendor merge rewrites `vendor_ids` (order kept, de-duplicated) and `vendor_id` on the book and `vendor_id` on quote lines, studio-scoped.
  - `vendorNames` drops missing names, so it can fall out of step with `vendorIds` by index.
  - The vendor directory, kinds (`supplier · brand · both`) and POs are finance (hand-off).
- Words: *"Vendor / Supplier"*, *"Vendor for this purchase"*, *"No vendor linked"*, *"Clear vendor"*, *"+ Add another vendor"*, *"— pick to add —"*, *"{n} vendors available in the price book — pick the one this line buys from."*
- Reachable: yes.

### B-68 · Apply Vendor Default Markup
- Where: `src/components/accounts/vendor-markup-dialog.tsx:1-127`; `src/app/api/studio-config/price-book/vendor-markup/route.ts:1-38`; `vendors.default_markup_percent NUMERIC(5,2)` (`20260416000002_pricing_tiers.sql:25`).
- Entry: Items toolbar *"Vendor markup config"* (edit permission in the UI only).
- Does: writes one markup % onto every active item of a vendor.
- Rules: count and update match the **primary** `vendor_id` only (not other vendors in `vendor_ids`), active items only; sets `markup_percent` and `updated_at` and **nothing else** — sell and cost stay, so the stored markup no longer matches the triangle (the lines that later copy it store a markup their price doesn't imply); no history row; the route has no permission check. Apply disabled with no vendor or 0 linked items; a markup ≤ 0 does nothing. Default 20; *"Use vendor default ({n}%)"* fills the vendor's `default_markup_percent` (set in the finance vendor drawer).
- Words: *"Apply Vendor Default Markup"*, *"Bulk-apply a default markup percentage to all price book items linked to a specific vendor"*, *"Vendor"*, *"Select a vendor..."*, *"Markup Percentage"*, *"This will update {n} active price book items linked to {vendor} to {m}% markup."*, *"Apply to {n} Items"*, toasts *"Applied {m}% markup to {n} items from {vendor}"*, *"Failed to apply markup"*.
- Reachable: yes.

### B-69 · Market rates and drift
- Where: `supabase/migrations/20260414000003_price_book_v2.sql:40-53`; `20260414000004_seed_market_rates.sql`; `src/app/api/studio-config/platform-market-rates/route.ts`; `price-book-manager.tsx:40-44, 204-227, 519-539, 646-653`; `src/components/accounts/price-drift-summary.tsx:1-134`; `src/components/price-book/drift-tab.tsx:1-235`; `drift-chip.tsx:1-64`; `src/lib/queries/price-book.ts:37-69`; `src/app/api/cron/price-drift/route.ts:1-134`; `vercel.json:40-43`.
- Entry: Items (chip, pill, summary card), the Drift tab, the monthly notification.
- Does: compares each sell price with a regional benchmark.
- Rules:
  - `platform_market_rates` is global (no studio): `country_code`, `category`, `item_description`, `unit DEFAULT 'sqft'`, `rate_min`, `rate_max`, `rate_typical` ($), `year`, `source` (`platform · industry_report · crowd`), unique `(country_code, category, item_description)`; seeded with 2025 figures for SG, MY, AE, IN.
  - Match: `matchDescriptionToMarketRate(text, rates)` — best Jaccard over synonym-expanded tokens (B-81), accepted at ≥ 0.3. Items list and Drift tab match on `name || description`; the tab badge, the summary card and the cron match on `description` only, so counts can disagree with the list.
  - Drift (active items with `unit_price > 0`): below when `price < rate_min × 0.85` (percent `round((min − price) / min × 100)`); above when `price > rate_max × 1.15` (percent `round((price − max) / max × 100)`).
  - Chip: red *"−{p}%"* below, blue *"+{p}%"* above, title *"Below / Above market range {cs}{min}–{cs}{max}"* (default symbol *"$"* when none passed).
  - Summary card: top 5 by percent. Drift tab: all, sort by drift (desc) or A–Z; *"Suggest"* opens the editor with sell = `round((min + max) / 2, 2 dp)` (the midpoint, not `rate_typical`).
  - Cron `0 10 1 * *` (1st of the month 10:00 UTC): per studio, dispatch one `price_book.drift_detected` (`drift_count`, link `/accounts?tab=catalogue&pb=drift`).
- States: no rates → *"No market rates available"*; none drifted → *"All prices in range"*.
- Words: *"{n} priced outside market range"*, *"Show only items priced outside market range"*, *"{n} items priced outside market range"*, *"These items are >15% above or below {cc} market rate benchmarks"*, *"Your price: {cs}{x} · Market: {cs}{min}–{cs}{max}"*, *"+{n} more items"*, *"Drift watch"*, *"Items priced more than ±15 % outside the {cc} market range. Use Suggest to bring pricing back in sync."*, *"{n} items drifted from {cc} market range"*, *"By drift"*, *"A-Z"*, *"Item"*, *"Current"*, *"Market median"*, *"Drift"*, *"Action"*, *"Suggest"*, title *"Open the editor with {cs}{x} pre-filled as the new sell price"*, toast *"Pre-filled {cs}{x} — review and save in the editor."*, *"Drift detection needs platform market rates for your region ({cc}). Check back later or contact support."*, *"Every active item is priced within ±15% of its {cc} market range."*
- Reachable: yes.

### B-70 · Crowd rate signals and the aggregate cron
- Where: `src/lib/crowd-rate-collector.ts:1-106`; `src/app/api/studio-config/price-book/[id]/route.ts:185-194`; `src/app/api/cron/aggregate-rates/route.ts:1-138`; `supabase/migrations/20260416000003_crowd_rate_signals.sql`; `vercel.json:44-47`.
- Does: turns studios' price edits into platform benchmarks.
- Rules: a PATCH carrying `unit_price > 0` and `description` records a signal (`category "General"`, `unit = changes.unit ?? "lot"`, `source_type "price_book"`), at most one per studio + description per calendar month (server time). `collectQuoteSignals` (quote saves) has no caller. Cron `0 12 15 * *`: signals from the last 90 days grouped by (country, category, description); groups with ≥ 5 distinct studios upsert `rate_min = P10`, `rate_typical = P50`, `rate_max = P90` (linear-interpolated percentiles, 2 dp), `source "crowd"`, current year. Since every price-book signal is filed under *"General"*, crowd rates land in that category.
- Data: `crowd_rate_signals` (studio id kept for dedupe only).
- Reachable: yes (background).

### B-71 · Seed from market rates
- Where: `price-book-manager.tsx:402-425, 637-641, 676-680`.
- Entry: *"Seed from {cc}"* (toolbar) or *"Seed {n} items from {cc} market rates"* (empty state), shown only when the book is empty and rates exist, with edit permission.
- Does: fills an empty book from the region's rates.
- Rules: per rate — `description = item_description`, category matched by exact name, `unitPrice = rate_typical ?? (min + max) / 2`, `unit ?? "sqft"`, `costPrice = rate_min`, `markupPercent = rate_typical ? round((typical − min) / typical × 100) : 20` (a margin-of-revenue figure stored as markup), `source "market_seed"`; one POST (approval, SKU, embeddings apply).
- Words: toasts *"Seeded {n} items from {cc} market rates"*, *"No market rates available for your region"*, *"Failed to seed market rates"*.
- Reachable: yes.

### B-72 · Import items (CSV fast path and AI parse)
- Where: `src/components/accounts/price-book-csv-dialog.tsx:1-601`; `price-book-manager.tsx:1126-1224`.
- Entry: *"Import CSV"* (toolbar) or Imports › *"Import items"*; edit permission.
- Does: bulk-adds items from a file or pasted text.
- Rules:
  - `.csv` → parsed locally (Papa); needs a header + ≥ 1 row; auto-maps headers by substring (description ← *desc/item/name*; category ← *categ/section/type/trade*; sell ← *sell+price / unit price / rate*; cost ← *cost*; unit ← *unit / uom / measure*; markup ← *markup / margin*; cost type ← *cost type / labour / labor*; waste ← *waste*; notes ← *note / remark*); Description is required; numbers strip everything but digits, `.` and `-` (`parseFloat || 0`); category default *"General"*, unit *"lot"*.
  - `.pdf .png .jpg .jpeg .webp .xlsx .xls .txt` or pasted text → `/api/price-book/parse` (B-73); rows can be unticked; duplicates and low-confidence rows are flagged.
  - Import calls the manager: vendor from the AI result is matched by normalised name or created as kind `supplier`; each row is POSTed with `categoryId` = an **existing** category matched case-insensitively (unknown categories are dropped, not created), `unitPrice`, `costPrice`, `unit`, `markupPercent`, `costType`, `wastePercent`, `source "ai_parse" | "csv_import"`, `vendorIds`. **Notes are not passed** although mapped. Approval, SKU and embeddings per B-61, B-66, B-85.
  - Preview shows the first 100 rows.
- States: steps source → paste / parsing → map → preview → importing → done.
- Words: *"Import Price Book"*, *"Drop a file or click to browse"*, *"CSV, PDF, image (PNG/JPG), Excel (.xlsx)"*, *"CSV — fast path"*, *"Parsed locally. No AI cost. Pick column mapping next."*, *"PDF / Image / Excel — AI parse"*, *"Extracts rows, maps categories, flags duplicates."*, *"Or paste rows from an email / Slack"*, *"Paste rows from an email, Slack, or supplier doc. AI will structure them."*, *"Parse with AI"*, *"Reading the document with AI…"*, *"Extracting rows · mapping categories · detecting GST · checking for duplicates"*, *"This usually takes 15–30 seconds."*, *"Map your CSV columns to price book fields:"*, *"— Skip —"*, *"AI extracted {raw} rows → {final} valid items"*, *"{n} rows look like duplicates of items already in your price book. Untick them below to skip."*, *"Prices appear to be {inclusive|exclusive} of GST based on the document text. Confirm before importing."*, *"New categories will be created: {list}"*, *"Vendor {x} will be linked to every imported row. Created automatically if it doesn't already exist."*, *"{n} items ready to import"*, *"· dupe"*, *"· verify"*, *"Import {n} Items"*, *"Import Complete"*, *"{n} items added to your price book"*, toasts *"Unsupported file type. Use CSV, PDF, image, Excel, or text."*, *"Imported {n} items to price book"*, *"Import failed"*, *"Imported items without vendor attribution"*.
- Reachable: yes.

### B-73 · AI parse of a supplier document (`/api/price-book/parse`)
- Where: `src/app/api/price-book/parse/route.ts:1-332`; `src/lib/price-book-parser.ts:1-259`; test `price-book-parser.test.ts`.
- Entry: B-72 with a non-CSV file or pasted text.
- Does: extracts rows, normalises units, maps categories, detects GST wording and flags duplicates.
- Rules:
  - Session required; one file ≤ 10 MB (413) or text; accepted types PDF / PNG / JPEG / WebP as images, CSV / TXT / XLSX / XLS as text (Excel → CSV of the first non-empty sheet; text capped at 100,000 chars, paste at 50,000); model `google/gemini-2.5-flash` via `callOpenRouterJson` (32,768 tokens, retry 65,536), 60 s timeout; `DRY_RUN` or no API key → a canned 7-row result.
  - Prompt rules: `unitPrice` = sell, `costPrice` = what the studio pays; a single price column is cost for a vendor rate card and sell for a studio catalogue; markup / waste only when stated; `costType` ∈ material / labor / subcontractor / combined; confidence 0–1; ≤ 500 rows; `documentText` ≤ 2,000 chars for GST detection.
  - Post-process: drop rows with no description or with both prices ≤ 0 / missing; `unitPrice` missing → 0; `canonicalUnit` (e.g. `m2 · m² · sq m → sqm`, `sq ft · ft² → sqft`, `pc · piece · nos · unit → pcs`, `lm · running metre → rm`; unknown kept lower-cased; blank → `lot`); `mapCategory` (exact, then most shared words > 2 chars, then substring either way, else the raw label; blank → *"General"*); duplicates = best `descriptionSimilarity ≥ 0.7` against active items' descriptions (Jaccard on words > 2 chars minus stop-words; exact string match = 1); `detectGstInclusivity` checks inclusive patterns first (*"inclusive of GST"*, *"GST inclusive/included"*, *"incl. GST"*, *"inclusive of VAT/SST/tax"*, *"prices include GST"*) then exclusive (*"exclusive of GST"*, *"excl. GST"*, *"ex GST"*, *"before GST"*, *"+ GST"*, *"plus GST"*) → `inclusive | exclusive | null`. The GST verdict is shown only; prices are imported as extracted.
  - The studio categories are read from `studio_price_book_categories`, a table no migration in the repo creates; with no names loaded, labels pass through unmapped and `newCategories` stays empty.
- Data: response `{ items[], vendor, detectedGst, rawCount, finalCount, duplicateCount, newCategories }`.
- States: 400 / 415 / 422 / 500 errors.
- Words: *"Provide a file or paste text"*, *"File too large. Maximum is 10 MB."*, *"Unsupported file type "{mime}". Upload PDF, image, CSV or Excel."*, *"Could not read the document. Try again, upload a clearer copy, or use CSV."*, *"No items detected. Try a clearer file or fall back to CSV."*, *"Could not parse document. Try again or upload as CSV."*
- Reachable: yes.

### B-74 · Second CSV import on the Quote Categories tab
- Where: `src/app/(main)/accounts/page.tsx:1749-1784`; `src/components/leads/csv-import-dialog.tsx:1-270`.
- Entry: Accounts › Quote Categories › *"Import Price Book from CSV"*.
- Does: a second, older price-book CSV importer.
- Rules: maps *Description* (required), *Category*, *Unit Price*, *Unit*, *Quantity*; price parsed in currency units; the page then sends `unitPrice: Math.round(unitPrice × 100)` — **cents into the dollars column**, so 12.50 lands as 1,250.00 — with `unit` and `source "csv_import"` only (category, cost and quantity dropped). The preview prints a hard-coded *"$"*.
- Words: *"Import Price Book from CSV"*, *"Drop a CSV file here or click to browse"*, *"Supports .csv files exported from Excel or Google Sheets"*, *"Map your CSV columns to the target fields:"*, *"Preview (first 3 rows)"*, *"Import Failed"*, *"Adjust Mapping"*, *"Retry Import"*, *"Import Complete"*.
- Reachable: yes.

### B-75 · Export CSV
- Where: `src/app/api/price-book/export/route.ts:1-73`; `price-book-manager.tsx:598-604, 1150-1162`.
- Entry: *"Export CSV"* / Imports › *"Export items"* (no permission beyond a session).
- Does: downloads the book as `price-book-export.csv`.
- Rules: **every** row (archived included, *Active* = Yes / No), newest first; columns `Description, Category, Sell Price, Unit Cost, Unit, Markup %, Cost Type, Waste %, Vendor, Tags, Notes, Active`; vendor = the `vendor_id` join only; name, SKU, subcategory, tiers, extra vendors, spec and image are not exported; text cells starting `= + - @ tab CR` get a leading `'`; commas / quotes / newlines are quoted.
- Words: *"Export items"*, *"Download every active item as a CSV. Useful for back-office reconciliation."* (B-101).
- Reachable: yes.

### B-76 · Typeahead from the price book (line editor *"Item Name"*)
- Where: `src/components/leads/price-book-combobox.tsx:1-371`; `price-book-item-editor.tsx:706-775, 1398-1426`.
- Entry: typing ≥ 2 characters in the quote-line editor's *"Item Name"*.
- Does: picks a catalogue row onto the line.
- Rules:
  - Candidates: `is_active !== false` (pending and approved) whose name, description, category name or SKU contains the text (lowercase substring); first 8; rows with the same name (else description) are grouped under a header, variants sorted cheapest sell first and labelled by vendor.
  - On pick the line takes: name (`name || description`), SKU, description (specs only when the row has a real name), unit, `unitPrice`, `costPrice`, `markupPercent` (copied, not derived), cost type, waste, primary vendor, image, spec link, notes, category name, `priceBookItemId`, `priceSnapshotAt = now`; each only when the book value is non-null (`pb.x ?? current`). No tier lookup at pick time; subcategory untouched.
  - The *"Also save to price book"* box is locked off while name and SKU still equal the picked row.
- Words: *"Type 2+ chars to search the price book ({n} items)"*, *"{n} variants"*, *"No vendor"*, *"Uncategorised"*, *"(mkt: {cs}{min}–{cs}{max})"*, *"cost: {cs}{x}"*, *"{n} matches · Arrow keys to navigate, Enter to select"*.
- Reachable: yes.

### B-77 · Browse price book (multi-select add)
- Where: `src/components/leads/browse-price-book-modal.tsx:1-453`; `src/lib/leads/pricebook-search.ts:1-86`; mount `QDD:10255-10264`; button `QDD:8523-8535`; tests `browse-price-book-vendor.test.tsx`, `pricebook-search.test.tsx`.
- Entry: *"Browse"* in the Items toolbar (title *"Add items from your price book"*); also in the package editor (templates C-16).
- Does: adds many catalogue items as new lines in one undo step.
- Rules:
  - Active items only (pending included). Search: every whitespace term must match name / description / category / subcategory — substring, word prefix, or a bounded Levenshtein against the same-length word prefix (0 edits for ≤ 2 chars, 1 for 3–4, 2 for ≥ 5), after lower-casing, stripping diacritics and punctuation. Vendor filter (vendors present in this book) ANDed.
  - Each added line: `name = pb.name || pb.description`, `description = pb.name ? pb.description : ""`, `category = pb.categoryName || "Others"`, `subcategory` per B-88, `unitPrice = pb.unitPrice ?? 0`, **`qty 1`**, `unit || "lot"`, `marginPercent = pb.markupPercent` (copied), `costPrice`, `wastePercent`, `costType`, `vendorId` = the row's pick, else the filter vendor if it supplies the item, else the first vendor, `priceBookItemId`, `priceSnapshotAt = now`, `source "price_book"`, image, spec; totals computed at the editor's effective rate. No tier lookup (qty 1).
- States: *"No price-book items yet."*, *"No items match “{q}”."*
- Words: *"Browse price book"*, *"Select items to add to this quote. Each becomes a new line item."*, *"Search by name or category..."*, *"Clear search"*, *"All vendors"*, *"Select all"*, *"Vendor"*, *"Unnamed vendor"*, *"per {unit}"*, *"No items selected"*, *"{n} item(s) selected"*, *"Add {n} item(s)"*; undo label *"Add from price book"*.
- Reachable: yes.

### B-78 · Price Book modal inside the quote
- Where: `src/components/leads/price-book-modal.tsx:1-47`; `QDD:6686-6695, 10247-10253`.
- Entry: the editor header's book icon (*"Open price book"*), only with `pricebook.edit`.
- Does: opens the full manager (B-57…B-72) over the quote.
- Rules: edits apply to the book, not to the quote's existing lines (they keep their copied figures); new picks see the change through the shared cache.
- Words: *"Price Book"*, *"Edit prices, categories, and vendor mappings. Changes apply to this quote immediately."* (only true for future picks).
- Reachable: yes.

### B-79 · "Also save to price book"
- Where: `price-book-item-editor.tsx:289-300, 565-600, 1398-1426`.
- Entry: the quote-line editor footer when adding a line.
- Does: creates a catalogue row from the new line.
- Rules: unchecked by default; disabled while the line is an untouched pick; when on, the row is POSTed first (category id, sell, unit, cost, markup, cost type, waste, vendors, image, spec, notes, name, SKU — approval / SKU / embedding per B-61, B-66, B-85), and the line adopts the new `item_id` and `price_book_item_id`. A 403 (no edit permission) or any failure still saves the line.
- Words: *"Also save to price book"*, title *"This item is already in the price book — change the item name or ID to save it as a new variant."*, toasts *"Saved to price book"*, *"Saved to quote, but price-book sync failed"*.
- Reachable: yes.

### B-80 · Library state on quote lines
- Where: `quote-row.tsx:249-258, 504-515`.
- Entry: the grid, for lines linked to a book row.
- Does: shows the linked row's approval state on the line.
- Rules: `approvalStatus` of the linked item (from the cached book): `pending` → informational chip; `rejected` → red chip (the row is deactivated, re-pick advised). Saving is never blocked.
- Words: *"Pending approval"*, *"Library item rejected"*.
- Reachable: yes.

### B-81 · The matching engine (`matchItemsToPriceBook`)
- Where: `src/lib/price-book-matcher.ts:1-260`.
- Does: scores a line against every book row.
- Rules: tokens = lowercase, non-alphanumerics → space, words of length > 1; expanded with a renovation synonym table (e.g. *hacking ↔ demolition*, *wc ↔ toilet*, *mixer ↔ tap*, *db ↔ distribution board*, *vinyl ↔ spc / lvt*, *false ceiling ↔ plaster ceiling*, *sqft ↔ square feet*); book side uses **description only** (not `name`). `score = 0.70 × Jaccard + 0.15 × category (line category contains the book's → 1, the reverse → 0.8, else 0) + 0.15 × unit (equal → 1, containment → 0.7)`. Tier `high ≥ 0.75`, `suggested ≥ 0.50`, else `none` (no match returned). Price discrepancy when both prices > 0 and `|line − book| / book × 100 > 15`, reported to 1 dp.
- Reachable: yes.

### B-82 · Cost auto-match on save
- Where: `src/app/api/quotes/line-items/route.ts:368-417, 459-467`.
- Entry: every line save.
- Does: fills missing costs from the book.
- Rules: candidates = `amount` lines with `unitPrice > 0`, cost null or ≤ 0, and no `priceBookItemId`; against active book rows (pending included); only `high` matches apply: `cost_price`, `price_book_item_id`, `waste_percent`, `cost_type`, `vendor_id` fill where the line had none, `price_snapshot_at = now`. The selling price and `margin_percent` are untouched. Errors are logged, never block the save.
- Reachable: yes.

### B-83 · Auto-match after a parse, and the dead review panel
- Where: `QDD:3274-3350` (background), `3526-3591` (`handleAutoMatch`, `handleAcceptMatches`), `8608-8610`, `10674`; `src/app/api/quotes/auto-match/route.ts:1-138`; `src/components/leads/auto-match-review-panel.tsx:1-256`.
- Entry: uploading a quote document (hand-off A).
- Does: links parsed lines to the book.
- Rules: after a parse the editor posts the lines to `/api/quotes/auto-match` and, for `high` matches only, sets `priceBookItemId`, `costPrice = pbCostPrice ?? existing`, `wastePercent`, `costType`, `vendorId`, `priceSnapshotAt`, then autosaves; the parsed selling price is kept. The manual review panel (*"Auto-Match to Price Book"*, accept-all of `high` + `suggested`, which would also copy the book's `markupPercent` into the line and set `source "price_book"`) is still mounted but its only opener was removed — unreachable.
- Words: failure toast *"Couldn't auto-match price book in background. Use the Auto-Match button when you're ready."* (the button no longer exists), *"Couldn't save price-book matches — your edits stayed local. Try Save Draft manually."*; panel words *"Auto-Match to Price Book"*, *"{h} high confidence · {s} suggested · {n} no match"*, *"· {n} price discrepancies"*, *"Parsed Item"*, *"Price Book Match"*, *"Confidence"*, *"PB Price"*, *"Diff"*, *"No match found"*, toast *"Linked {n} item(s) to price book"*.
- Reachable: background yes; panel no (dead).

### B-84 · New-item suggestions (scan, modal, bulk add)
- Where: `src/app/api/price-book/suggestions/scan/route.ts:1-173`; `src/lib/price-book-suggester.ts:1-109`; `src/app/api/price-book/suggestions/bulk/route.ts:1-323`; `src/app/api/price-book/suggestions/pending/route.ts`; `src/components/leads/new-items-suggestion-modal.tsx:1-327`; `QDD:882-913, 954, 3376, 10267-10288`; migration `115_price_book_suggestions.sql`.
- Entry: after a parse (`pdf_parse`) or an AI drafting turn (`ai_generation`) persists lines; the Items toolbar *"Review {n} new items"*; the meeting brief (co-pilot).
- Does: links known items and proposes unknown ones for the book.
- Rules:
  - Scan (session only): unlinked lines vs active book rows (category names not loaded, so the category term scores 0); `high` **and** `suggested` matches are linked silently (`quote_line_items.price_book_item_id`); `none` → a `pending` suggestion row per line (unique per line; re-scans reuse it).
  - Modal rows start ticked with name, category (blank = uncategorised), unit cost and sell editable; *Add* posts to bulk; closing leaves them pending.
  - Bulk add (session only — **no `pricebook.edit` check**): inserts the book row (`source "manual"`, PB-NNN, approval by tag, task + notification to the configured approver ?? owner ?? admin), marks the suggestion `added`, links the source line; no embedding is generated. Dismiss → `dismissed` + `dismissed_by`.
- Data: `price_book_suggestions (source_event ∈ pdf_parse · ai_generation · copilot · submit_review · manual, match_tier, match_confidence, status ∈ pending · added · dismissed, …)`.
- Words: *"New items found — add to your price book?"*, *"We found {n} item(s) on this quote that aren't in your catalogue yet. Review, edit, and add the ones you want to keep."*, *"{n} of {m} selected"*, *"From quote: {desc}"*, *"Item Name"*, *"SKU / Item ID"*, placeholder *"Auto"*, *"Category"*, *"Uncategorised"*, *"Unit Cost / {unit}"*, *"Sell Price / {unit}"*, *"Optional"*, toasts *"Added {n} item(s) to your price book"*, *"Couldn't add to price book: {reason}"*, *"Dismissed {n} item(s)"*, *"1 suggestion left for your price book — view in Accounts → Price Book"*, Items button *"Review {n} new item(s)"* (title *"Review items detected from quotes that aren't in your price book yet"*).
- Reachable: yes.

### B-85 · Semantic search over the book (embeddings)
- Where: `src/lib/quote-agent/price-book-embeddings.ts:1-26`; `src/lib/ai.ts:463-493`; `src/app/api/studio-config/price-book/route.ts:258-279`; `src/app/api/studio-config/price-book/[id]/route.ts:120-125`; migrations `288_price_book_embeddings.sql`, `289_price_book_semantic_search_rpc.sql`; `src/lib/quote-agent/executors.ts:63-94`; tests `quote-agent-price-book-embeddings.test.ts`, `price-book-embedding-fanout.test.ts`.
- Does: lets the AI drafter find book rows by meaning.
- Rules: model `openai/text-embedding-3-small` (1536 dims) via OpenRouter; the text embedded is the row's **description only**; written after an add (via `after()`, 5 at a time) and on any PATCH whose `changes.description` is truthy (the editor always sends it); never throws. Suggestion adds, the dead import route and direct SQL leave rows without an embedding; there is no backfill. RPC `match_price_book_items(studio, embedding, count 5, max distance 0.35)` = cosine distance `<=>`, `is_active` and `approval_status != 'rejected'`, nearest first, returns `id, description, unit, unit_price, cost_price, category_id, distance`. HNSW index.
- Reachable: yes (AI drafter only).

### B-86 · AI drafter pricing cascade (touchpoint)
- Where: `src/lib/quote-agent/executors.ts:50-392, 393-425`.
- Does: grounds AI-drafted line prices (the drafter is hand-off A).
- Rules: per query — book (B-85) → market rates (token-AND `ILIKE` on `item_description`, then token-OR with ≥ half the tokens; price = `rate_typical` if > 0 else `Math.round((min + max) / 2)` — whole units) → web search (≤ 5 per call) → unresolved (`needs_pricing`). The region comes from the session, never the model. Applying a legacy `quote_templates` row defaults a missing `margin_percent` to 30 (templates C-28).
- Reachable: yes.

### B-87 · Price snapshot and stale prices
- Where: writers `route.ts:465`, `QDD:3331, 3583`, `browse-price-book-modal.tsx:242`, `price-book-item-editor.tsx:754`; column `supabase/migrations/20260416000001_price_book_v3.sql:67`.
- Does: stamps when a line took its figures from the book.
- Rules: set on typeahead pick, browse add, background auto-match, accepted match and server cost match; **read by nothing** — no stale-price warning, no refresh, no comparison with the book's current price. A tier re-price on qty change does not update it.
- Data: `quote_line_items.price_snapshot_at TIMESTAMPTZ`.
- Reachable: written yes; used no.

### B-88 · Carry price-book subcategories onto quotes (`priceBookSubcategoryInQuote`)
- Where: `src/app/api/studio-config/features/route.ts:41, 53, 82, 141`; `src/app/(main)/accounts/feature-flags-tab.tsx:114-120`; `QDD:1191, 230-240`; `browse-price-book-modal.tsx:27-37, 220-224`; `src/lib/leads/map-package-items.ts:21-60`; test `price-book-subcategory.test.tsx`.
- Entry: Accounts › Workflow › *"Feature Flags"*.
- Does: decides whether a book row's subcategory becomes the line's subcategory.
- Rules: default **on** (`price_book_subcategory_in_quote !== false`). Off → browse-added lines get `subcategory: null`; the same flag also drops saved subcategories when a **package** is applied. The picker still shows and searches the subcategory. The typeahead never carries it.
- Data: `studios.settings.features.price_book_subcategory_in_quote`.
- Words: *"Carry price-book subcategories onto quotes"*, *"On by default. When an item is added from the price book, its subcategory becomes a subsection heading on the quote and in the PDF. Turn this off if you use subcategories as room tags — the rooms stay searchable in the price book but stop appearing on the client's quote."*
- Reachable: yes.

---

## Quote categories

### B-89 · The category catalogue and how a save rewrites it
- Where: `src/components/accounts/quote-categories-editor.tsx:27-263`; `src/app/api/studio-config/quote-categories/route.ts:25-93`; `src/app/api/quotes/categories/route.ts`, `…/categories/resolve/route.ts:1-51`; `src/app/(main)/accounts/page.tsx:1749-1760`; templates C-30, D-18.
- Entry: Accounts › Quotes & Pricing › *"Quote Categories"*; the editor's *"Add category"*; the price-book editor's *"Will be created on save"* names.
- Does: keeps the studio's trades, their order, sub-headings and printed descriptions (field-level detail is templates C-30).
- Rules:
  - The editor saves the whole list: the PUT sets **every** row `is_active = false`, then upserts each entry by `(studio_id, name)` with `order_index` = list position, `subcategories`, `description` (sent explicitly so a save can't blank it).
  - A rename is a new name, so it creates (or reactivates) a row with a new id and leaves the old row inactive. Price-book items point at the old row by `category_id` and keep showing the old name (the book's join has no active filter) and group under it; quote lines store the category **name** and keep the old text. A delete leaves the row inactive — same effect for existing items.
  - `POST /api/quotes/categories/resolve` upserts a single name as active with `order_index` default 0.
  - Validation: names non-empty and unique case-insensitively; subcategory duplicates skipped case-insensitively in the editor.
- Data: `studio_quote_categories (id, studio_id, name, order_index, is_active, subcategories TEXT[], description)`.
- Words: templates C-30.
- Reachable: yes.

### B-90 · Category order drives the section order
- Where: `src/lib/quote-editor/category-order.ts:1-43`; `src/app/api/studio-config/quote-categories/route.ts:31-43`; `QDD:1359-1367, 2831-2867, 5883-5890`; templates B-64.
- Does: orders a quote's sections.
- Rules: `resolveCategoryOrder(items, explicit, studioOrder)`: the per-quote `quote_metadata.categoryOrder` wins (hand-off A); else the studio list (`order_index`, ties broken by name); categories absent from the base are appended in first-appearance order; listed categories with no lines are dropped. The editor physically re-orders `itemsForDisplay` so the grid, the preview, the canva context and the server render agree.
- Reachable: yes.

### B-91 · Category names on lines, canonicalisation and fallbacks
- Where: `QDD:1369-1382` (`categoryCanonicalize`); `price-book-item-editor.tsx:46-53, 555-563`; `browse-price-book-modal.tsx:219`; `src/lib/quote-calc.ts:482, 490`; `src/lib/quote-round-off.ts:86`; `price-book-manager.tsx:292`; `src/app/api/price-book/parse/route.ts` (`mapCategory`).
- Does: keeps free-text names consistent.
- Rules: a line's `category` is free text; the editor groups case/space variants under the studio's spelling (display only, never written back). Fallback names differ by surface: *"Others"* (margin roll-ups, round-off preview, browse add), *"General"* (both importers, crowd signals, parse), *"Uncategorised"* (price-book lists, typeahead). The price book links by id, quotes by name.
- Reachable: yes.

### B-92 · Subcategories and section descriptions (touchpoints)
- Where: `src/app/api/studio-config/quote-categories/subcategory/route.ts:1-81`; `src/lib/queries/studio-config.ts:184-222`; templates B-64, C-30.
- Does: grows a category's subcategory list from the editor and prints its description.
- Rules: `POST …/subcategory` appends a trimmed label to one category, found by id (rename-safe) or by active name; skips empties and **exact** (case-sensitive) duplicates; a missing category is skipped silently. The description prints under the section band (templates B-64); per-quote section notes live in `quote_metadata` (hand-off A).
- Reachable: yes.

---

## Pricing tiers

### B-93 · Volume pricing tiers — record, editor, save
- Where: `supabase/migrations/20260416000002_pricing_tiers.sql:8-18`; `price-book-item-editor.tsx:241-243, 535-540, 1239-1306`; `src/app/api/studio-config/pricing-tiers/route.ts:1-52`; `src/app/api/studio-config/price-book/route.ts:84-104`; `src/types/app.ts:2044-2051`.
- Entry: price-book item editor › *"Volume Pricing Tiers"* (price-book mode only).
- Does: gives a book item different sell / cost by quantity.
- Rules:
  - Tier = `min_qty NUMERIC(12,2) NOT NULL DEFAULT 0`, `max_qty NUMERIC(12,2) NULL` (null = no upper bound), `unit_price NUMERIC(12,2) NOT NULL` ($), `cost_price NUMERIC(12,2) NULL`; returned with the book sorted by `minQty`.
  - *"Add Tier"* seeds `minQty = last.maxQty ?? last.minQty + 10` (0 for the first), `maxQty null`, `unitPrice` = the current sell, `costPrice = cost || null`. Inputs: min `parseFloat || 0`, max blank → null, sell `parseFloat || 0`, cost blank → null. No check for order, gaps or overlaps.
  - Saved only when **editing** an existing item: `PUT /api/studio-config/pricing-tiers` deletes all the item's tiers then inserts the set (not atomic; no permission check; failures only logged by the editor). Tiers typed while **adding** an item are shown but never saved.
  - Deleting the book item cascades its tiers.
- States: *"No tiers — base price applies to all quantities"*.
- Words: *"Volume Pricing Tiers"*, *"Add Tier"*, *"Min Qty"*, *"Max Qty"*, placeholder *"No limit"*, *"Sell ({cs})"*, *"Cost ({cs})"*.
- Reachable: yes (edit mode).

### B-94 · Tier resolution on a quote line
- Where: `src/lib/quote-calc.ts:526-557` (`resolveTieredPrice`); `QDD:3433-3446`; `grid-write.ts:53-68, 103-107`.
- Entry: changing the quantity of a line linked to a book item that has tiers (typing, paste, fill).
- Does: re-prices the line from the matching tier.
- Rules: walk tiers from the highest `minQty` down; the first with `qty ≥ minQty` and (`maxQty` null or `qty ≤ maxQty`) wins (so with overlaps the higher bracket wins); else, if `qty ≥` the last tier's `minQty`, the last tier; else no change. Sets `unitPrice` and, when the tier has one, `costPrice`; then totals and the implied markup are recomputed (the quote total moves). Not applied on typeahead pick, browse add (qty 1), auto-match, the server save, the package grid, or when the book's tiers later change; `price_snapshot_at` is not touched.
- Reachable: yes.

---

## Docs vs code discrepancies

### B-95 · Spec and plan 2026-08-06 vs the shipped pricing model
- Where: `docs/superpowers/specs/2026-08-06-quote-digitizer-inline-editing-round-off-design.md` (D1, D5, §2.3, §2.4); `docs/superpowers/plans/2026-08-06-quote-digitizer-inline-editing-round-off.md:1954-1985`; `docs/rules/leads.md:848-869`.
- Does: records where the approved design no longer matches the code (code wins).
- Rules: D1 "editing cost holds unit price and lets margin move", plan "Margin stays a read-only derived readout; do not make it an input" → code: cost anchor, an editable *"Markup %"* dial that re-prices (leads.md records the 2026-09-16 replacement). D5 "Cost Price column stays hidden by default" → `defaultVisible: true` (Dyel). §2.3 "`amountMarker` excludes the line (`inclusive`, `foc`)" → any marker. §2.4 "reset `priceType = "amount"`" → `lump_sum` is kept (leads.md agrees with code).
- Reachable: n/a.

### B-96 · Item editor copy vs the triangle it runs
- Where: `price-book-item-editor.tsx:246-253, 346-392, 602-611, 718-721, 874-933`.
- Rules: the Sell tooltip *"The client-facing price. Editing cost or markup never changes it."*, the Markup tooltip *"Editing markup re-derives Unit Cost. Sell price holds."* and the comment "Sell price is the anchor; Cost and Markup rewrite each other" all contradict `applyMarkupEdit`, which re-prices sell from cost. *"Enter a sell price — cost and markup are derived from it."* contradicts cost being a typed input. Comments still describe a removed "calc direction" / "Compute price" toggle. The pick handler's comment says it overwrites "only empty/zero fields"; the code overwrites whenever the book value is non-null. Markup rounds to 1 dp here vs 2 dp in the grid.
- Reachable: yes.

### B-97 · Writers that put the wrong number, or an unpriced number, in the markup field
- Where: `src/lib/quote-round-off.ts:124-126` + `quote-round-off.test.ts:157-176`; `price-book-manager.tsx:416`; `src/lib/quote-calc.ts:569-585`; `QDD:3584`; `browse-price-book-modal.tsx:229`; `price-book-combobox` pick; `src/lib/quote-agent/executors.ts:767-782`; `src/app/api/studio-config/price-book/vendor-markup/route.ts`; `docs/rules/leads.md:882-893`.
- Rules: leads.md says `margin_percent` holds markup and "Never populate the grid's markup cell from `computeLineTotals().marginPercent`". Round-off writes exactly that (margin-of-revenue; the test asserts `(1150 − 800) / 1150 × 100`); Seed-from-market-rates stores `(typical − min) / typical × 100`; `enrichLineItem` (no callers) would too. Browse add, the typeahead and the dead accept-matches copy the book's stored markup without re-deriving it from the line's price and cost; `set_global_margin` and the vendor bulk markup write a markup without re-pricing. The grid hides all of these by deriving markup on display; sort, AI insights, `summarize_quote` and the book's own *Markup* column read the stored value.
- Reachable: yes.

### B-98 · `docs/rules/leads.md` statements the code has outgrown
- Where: `docs/rules/leads.md:347-356, 915-923`; `src/lib/leads/map-package-items.ts:21-37`; `QDD:239`.
- Rules: `priceBookSubcategoryInQuote` — "packages and category templates carry subcategory separately and are unaffected" → the same flag drops subcategories when a package is applied. The Quote Digitizer section lists "Editable table (Description, Category, Unit Price, Qty, Unit, Total, Margin %, AI badge)" → the grid carries Discount, GST/Tax, Unit Cost and Markup % (no margin column).
- Reachable: n/a.

### B-99 · `docs/rules/regions.md` vs `region-config.ts`
- Rules: IN currency "INR (Rs.)" → symbol `₹`; `CountryCode` "SG | MY | AE | IN" → also `EG` (EGP `E£`, VAT 14 %); `formatCurrencyFromCents` "→ `S$1,234`" → always 2 dp (`S$1,234.00`); "IN=18% GST (with slabs)" → the slabs exist in config but a line's slab never survives (B-37).
- Reachable: n/a.

### B-100 · "The discount label shows on the PDF"
- Where: `discount-edit-drawer.tsx:24, 229-231`; `src/types/app.ts:791-792`; `src/types/database.ts:605-607`; templates B-98.
- Rules: the drawer (*"(optional, shows on PDF)"*) and both type comments say the label prints; no renderer reads `discount_label`.
- Reachable: n/a.

### B-101 · Price-book import and export copy vs behaviour
- Where: `price-book-manager.tsx:1126-1165`; `price-book-csv-dialog.tsx:472-476`; `src/lib/price-book-parser.ts:256-257`; `src/app/api/price-book/import/route.ts:1-157`.
- Rules: *"Download every active item as a CSV."* → archived rows are exported too. *"New categories will be created: …"* and the parser's "will be created on import" → the manager never creates categories and the parse route reads a table no migration creates (so the line cannot appear). *"The parser auto-detects vendors and de-duplicates."* → duplicates are flagged for the user to untick. Mapped Notes are dropped. `/api/price-book/import` (creates categories and vendors, writes `vendor_ids`) has no caller — dead. The Quote Categories importer stores cents in a dollars column (B-74).
- Reachable: n/a.

### B-102 · Comments that claim a parity the code doesn't have (GST and totals)
- Where: `src/lib/quote-canva/render-quote-pdf-server.ts:413-416`; `src/app/sign/[token]/page.tsx:1018-1021`; `src/lib/quote-total.ts:90-93`; `src/lib/quotes/recompute-lead-quote-totals.ts:103-106`; templates B-66.
- Rules: server render "Mirrors the digitizer" → ignores the entity (B-39); templates B-66's "unless the quote or entity turns GST off" holds in the editor, not on this path. Signing page "matching the studio's computeQuoteTotals so this figure equals the frozen quoteTotal + the PDF" → no GST-after-discount (B-25). `preTaxGrandTotal` "Feeds quotes.total_cents/subtotal_cents" → only the bot calls it. The re-roll "exactly the way the digitizer does" → entity beats the per-quote switch there, the switch beats the entity in the editor (B-20, B-35).
- Reachable: n/a.

### B-103 · Feature-requirements CSV rows on the price book vs code
- Where: `docs/openmaison-v1-feature-requirements.csv` rows 16 (*"Integration with Price Book"*) and 33 (*"Update price book"*).
- Rules: trust keyed on the literal owner/admin tag — matches code. "drag-reorder, bulk archive/restore, and vendor-markup application are NOT gated by the edit permission" → reorder and vendor-markup routes are ungated (true), but bulk archive / restore go through the gated PATCH (only the UI is open; the server 403s). "full change history with field-level diffs" → every sent field is logged as changed from null (B-65). "3-tier auto-match confidence scoring with a 15%-drift visual flag" → the review panel that shows it is unreachable (B-83). Not mentioned by the CSV: the ungated tiers route and the never-read approval thresholds (B-55).
- Reachable: n/a.

### B-104 · Stale tests and comments around margin and pricing
- Where: `src/__tests__/quote-row-margin-cell.test.ts:36-41`; `src/__tests__/quote-calc-margin.test.ts:45-60`; `src/components/price-book/pending-tab.tsx:19-23`; `discount-edit-drawer.tsx:17-30`; `QDD:2951-2975`.
- Rules: the margin-cell test says `computeLineTotals().marginPercent` is "What the grid renders now" → the grid renders `impliedMarkupPercent` (B-08). `enrichLineItem` is tested but has no production caller. The pending tab says the rejected-item warning on quote rows "lives in Phase 6" → built (B-80). The drawer header comment's preview example is per unit, while a flat discount comes off the line once (B-29). The `{quote_total}` token in the editor formats with the region symbol and the `"en"` locale, not the studio override (B-42).
- Reachable: n/a.

---

## Uncertain / not verified

- **`quotes.company_id`.** `recomputeLeadQuoteTotals` selects `id, company_id, quote_type` from `quotes`, but no migration in `scripts/migrations/` or `supabase/migrations/` adds `company_id` to `quotes` and `DbQuote` has no such field (only `leads.company_id`, migration 154). If the column is absent, PostgREST errors, `data` is null and the re-roll returns without writing — the GST switch / document discount would then only reach `total_cents` on the next line save. The unit test mocks the column. Live schemas not checked.
- **`studio_price_book.subcategory`.** Written and read by the app with a fallback; the only reference to its migration is "215_studio_price_book_subcategory" in `234_rollback_209_233_tenant_locks.sql:16`; no such file is in the repo.
- **`studio_price_book_categories`.** Read by the AI parse route and asserted by its test; no migration creates it. May exist on some fork databases.
- **Markup ≥ 1000 %.** The `NUMERIC(5,2)` limits come from the migrations; live column types were not inspected, so the overflow on save is inferred.
- **Accounts tab filtering for ID / accounting.** `access-control.ts` says the page "filters tabs to viewable subset"; the filtering code in `accounts/page.tsx` was not traced, so which tabs an ID sees besides the Price Book is unverified.
- **Variation orders and the document discount on screen.** The editor's `canonicalTotals` and the canva context pass the lead's `docDiscount` for a VO too, while the persisted total and `computeVoContext` never apply it. Whether a VO's Summary / footer is visible with that discount was not checked in the UI.
- **`quote_line_items.vendor_id`.** Declared in `supabase/migrations/20260416000001_price_book_v3.sql:63`, while `313_merge_vendors_fn.sql:10-11` says no migration declares it; which migration set a given database ran is not known.
- **Seeded data.** Whether any environment fills `competitor_benchmark_cents`, `studio_price_book.market_rate_min/max`, or EG rows in `platform_market_rates` (the seed covers SG, MY, AE, IN).
- **`vendorNames` / `vendorIds` misalignment.** Inferred from the transformer's filter; not reproduced.
- **`useStudioPricebookUnits`** (unit suggestions union of book and quote units, `src/lib/queries/pricebook-units.ts`) — its call sites were not traced.
- **Race on `PB-NNN`.** Two concurrent adds computing the same next number is inferred from the read-then-insert code, not observed.
