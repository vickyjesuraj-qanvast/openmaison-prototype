# OpenMaison 1.0 → 2.0 — Price book inventory · Slice D: the data model, the diff and the port plan

Sources: 1.0 `/Users/vicky/Documents/GitHub/qanvast-id-tool` @ `67f42e469` (branch `integ/security-non-qanvast`, committed 2026-09-22 13:25 +0530, read only — the working tree differs from the commit in `package-lock.json` alone); 2.0 `/Users/vicky/Documents/GitHub/openmaison-prototype` (HEAD `8733d6d` plus the uncommitted parity rounds in the working tree — `lib/db/schema.ts`, `lib/company/price-book.ts`, `app/company/price-book-actions.ts`, `app/quotes/items-actions.ts`, `lib/quotes/{items-model,clipboard,math,editor,list}.ts`, `lib/settings/{types,queries}.ts`, `scripts/repair-demo-data.ts` and `fixtures/baseline.json` are modified since HEAD; `drizzle/0037…0049` are new). Read on 2026-09-25.

What was read. **1.0:** every migration of both sets that names the price book, its children, vendors, quote categories or packages (cited where used: `030`, `059`, `063`, `090`, `100`, `109`, `110`–`115`, `125`, `132`, `135`, `159`, `160`, `172`, `174`, `184`, `193`, `194`, `198`, `223`, `226`, `233`, `234`, `264`, `280`, `288`–`290`, `302`, `305`, `312`, `313`, `sb:20260414000001`, `sb:20260414000003`–`05`, `sb:20260416000001`–`03`), plus `git show 8c2e961a2:scripts/migrations/215_studio_price_book_subcategory.sql` (a commit that is not an ancestor of HEAD); the types and transformers (`src/types/{database,app}.ts`, `src/lib/transformers.ts`); every route that reads or writes `studio_price_book` or its children (D-04); the hooks in `src/lib/queries/{studio-config,price-book,price-book-suggestions,pricebook-units}.ts`; the screens' data paths (`src/components/accounts/{price-book-manager,price-book-item-editor,price-book-csv-dialog,vendor-markup-dialog}.tsx`, `src/components/price-book/{tabs,pending-tab,drift-tab}.tsx`, `src/components/leads/{browse-price-book-modal,csv-import-dialog}.tsx`, the Accounts page's tabs, the Tasks page's approvals); the pricing libraries (`src/lib/{quote-calc,quote-cost-margin,quote-round-off,price-book-parser,price-book-matcher,price-book-suggester,crowd-rate-collector,access-control}.ts`, `src/lib/leads/map-package-items.ts`, `src/lib/quote-agent/price-book-embeddings.ts`, `src/lib/vendors/kind-column.ts`); the seeds and fleet scripts (`scripts/seed/{catalogue-sg-default,seed-default-pricebook}.mjs`, `scripts/tenants/flo-design/seed-pricebook.mjs`, `scripts/quote-agent/backfill-price-book-embeddings.mjs`, `scripts/cleanup/{002_dyel_purge_test_demo_data.sql,003_fleet_purge_demo_data.js}`, `scripts/fleet/{registry.mjs,expected-divergence.json}`); the docs that describe the data (`docs/prd/05-price-book.md`, `docs/rules/leads.md:838-925`, `docs/superpowers/specs/2026-05-27-elarte-pricebook-onboarding-design.md`). **2.0:** `lib/db/schema.ts` (`price_book_items`, `price_book_sections`, `quote_items`), `drizzle/0015`, `0028`, `0029`, `0030`, `0037`, `0038`, `lib/company/price-book.ts`, `app/company/price-book-actions.ts`, `app/company/price-book/page.tsx`, `components/company/price-book/{item-dialog,section-dialog,price-book-items}.tsx`, `app/quotes/items-actions.ts`, `lib/quotes/{items-model,clipboard,math,editor,list}.ts`, `lib/leads/quotes.ts`, `lib/settings/{types,queries}.ts`, `app/settings/actions.ts`, the picker in `components/quotes/editor/items/{items-section,items-table}.tsx`, `scripts/repair-demo-data.ts` (R23 · R29 · R38 · R46 and the checks), `lib/db/baseline.ts`, `design-source/REGISTER.md` (REG-566 · 584 · 594 · 596 · 619 · 623 · 627 · 645), `fixtures/baseline.json` (`takenAt` 2026-09-25T01:35:54.821Z — the price-book rows, the `settings` keys, the linked quote lines) and `local.db` opened with `sqlite3 -readonly` (the same tables). Nothing in either repo was modified except this file (and its folder); no script, server or query was run against 1.0; no `.env` was read; git was used read-only (`rev-parse`, `log`, `status`, `branch`, `merge-base --is-ancestor`, `show` of one file).

Builds on the earlier slices — cited, not repeated: **leads D §n** = `../leads-1.0-inventory/D-data-model.md` (the two migration sets, §0.1); **QE D-nn** = `../quote-editor-1.0-inventory/D-data-model.md` (the price book D-09…D-13, the first column map D-108, the tier table D-181, the line columns D-02 · D-103, units D-176); **templates D-nn** = `../quote-templates-1.0-inventory/D-data-model.md` (packages D-05, generation rules D-03, the package → section port D-165, the `SavedLine` gaps D-137); **accounts D-nn** = `../accounts-setup-1.0-inventory/D-data-model.md` (the Quote Categories save D-14, the route gates D-33, 2.0's ungated actions D-44, the member map D-212, the trades D-215), and the same folder's **accounts C-nn / E-nn**. Maps: **map 04** (`../04-quote-templates-migration-map-2026-09-24.md`), **map 06** (`../06-quote-editor-migration-map-2026-09-24.md:35` — "tiers, history, SKU, approval held for the price book audit"), **map 12** (`../12-accounts-setup-migration-map-2026-09-25.md`). The owner's answers: **QE Q-18…Q-21** (`../05-quote-editor-1.0-to-2.0-audit-2026-09-24.md:359-362`: export *Yes*; tiers, item approval, price history *Hold*) and **accounts Q-07** (`../11-accounts-setup-1.0-to-2.0-audit-2026-09-25.md:217`: "The price book's gate waits for its own audit").

## 0. Conventions

- **Effective 1.0 schema = the union of both migration sets** (leads D §0.1). The price book's DDL is split across them: the table, the approval, the SKU, suggestions, multi-vendor, embeddings and the vendor merge are in `scripts/migrations/`; the enrichment columns, history, tiers, packages, market rates and crowd signals are in `supabase/migrations/`. Three environment caveats bear on every row below:
  1. `studio_price_book.subcategory` is written and read by the code, but its DDL (`215_studio_price_book_subcategory.sql`) is **not at HEAD** — it lives only on commit `8c2e961a2` (not an ancestor), while `234:14-16` names 215 as an applied release migration (D-11).
  2. `vendors.kind` (`312`) and `merge_vendors()` (`313`) are "applied on NO database yet" per the code that works around them (`src/lib/vendors/kind-column.ts:1-18`; `src/app/api/vendors/records/route.ts:94-100, 196-207`).
  3. Forks diverge. 1.0 is one database per studio (`scripts/fleet/registry.mjs:61-127`, 37 entries; one Malaysian, `anchor`, `:74`), and Ace Design carries a tenant-only `studio_price_book.cost_price` migration that exists "on one laptop and in no repository" (`scripts/fleet/expected-divergence.json:54-59`).
- **Citations.** `NNN` or `NNN:lines` = `scripts/migrations/NNN_*.sql`; `sb:YYYYMMDDNNNNNN` = `supabase/migrations/…`; a bare `:lines` cites the file named last before it in the same cell or paragraph. 1.0 abbreviations: `PB` = `src/app/api/studio-config/price-book/route.ts`; `PBI` = `src/app/api/studio-config/price-book/[id]/route.ts`; `PBM` = `src/components/accounts/price-book-manager.tsx`; `PBE` = `src/components/accounts/price-book-item-editor.tsx`; `CSVD` = `src/components/accounts/price-book-csv-dialog.tsx`; `SC` = `src/lib/queries/studio-config.ts`; `TR` = `src/lib/transformers.ts`; `DBT` = `src/types/database.ts`; `APT` = `src/types/app.ts`; `ACC` = `src/app/(main)/accounts/page.tsx`; `AC` = `src/lib/access-control.ts`; `QC` = `src/lib/quote-calc.ts`; `QCM` = `src/lib/quote-cost-margin.ts`; `LI` = `src/app/api/quotes/line-items/route.ts`. 2.0 abbreviations: `SCH` = `lib/db/schema.ts`; `PBA` = `app/company/price-book-actions.ts`; `IA` = `app/quotes/items-actions.ts`; `IM` = `lib/quotes/items-model.ts`; `ST` = `lib/settings/types.ts`; `REP` = `scripts/repair-demo-data.ts`.
- **Ids · time · money.** 1.0: `uuid DEFAULT gen_random_uuid()`, `timestamptz`; the price book, its tiers and its history in **dollars** — `unit_price` an **unscaled** `NUMERIC` (`090:76`), `cost_price` · `market_rate_*` · tiers · history `NUMERIC(12,2)`, `markup_percent` · `waste_percent` `NUMERIC(5,2)` percents — while `quote_generation_rules.line_items[]` holds **cents and basis points** (`132:12`) and the material catalogue **cents** (`194`). 2.0: `text` ids, unix **seconds** (`{ mode: 'timestamp' }`), money as integer **cents** (`*_minor`), the markup as an **amount** (not a percent), S$ only, one studio (no `studio_id`), no RLS.
- **1.0 RLS end state for this slice.** Direct `scoped` policy on the JWT's `studio_id` for `studio_price_book`, `studio_quote_categories`, `price_book_suggestions`, `studio_assemblies`, `vendors`, `quote_generation_rules`, `quote_line_items` and `tasks` (`226:36-70`, the names `:48-57`); parent-EXISTS through `studio_price_book` for `price_book_pricing_tiers` (`226:105-138`, the row `:122`); `price_book_history` scoped by `223:35-58`; `platform_market_rates` and `crowd_rate_signals` REVOKEd from `anon` **and** `authenticated`, RLS on, no policy (`264:44-79`). Service-role routes bypass all of it and filter on `session.studioId` themselves (D-04). The policies separate studios, nothing inside one — every per-role rule is a route's own (accounts D-30).
- **Ids in this file.** D-01…D-19 = 1.0 stores, writers and checks (§1); D-20…D-28 = 1.0 JSON shapes (§2); D-30…D-33 = 1.0 derived values (§3); D-40…D-48 = 2.0 today (§4); D-60…D-78 = store map (§5.1); D-80…D-135 = column diffs (§5.2); D-140…D-148 = enums (§5.3); D-150…D-165 = units and semantics (§5.4); D-170…D-248 = port plan (§6: 6.A D-170…D-175, 6.B D-180…D-192, 6.C D-200…D-213, 6.D D-215…D-224, 6.E D-230…D-239, 6.F D-240…D-248).
- **Verdicts** (§5): *same* · *rename* · *merge* · *split* · *missing in 2.0* · *2.0 only* · *derived* · *superseded* · *held* (the owner said Hold) · *Later* · *Platform* (cross-studio data, AI, files, delivery — never a studio's record in the prototype) · *dead* (nothing reads or nothing writes it) · *write-only*.

---

## 1. 1.0 — tables and stores

### D-01 · Where the price book's data lives

Entry: Accounts › Quotes & Pricing › **Price Book** (`ACC:100`, `?tab=catalogue`; `<PriceBookManager/>` `ACC:1144-1146`) with the sub-tabs Items · Pending · Drift · Imports (`src/components/price-book/tabs.tsx:41-44`); a second, older importer on Quote Categories (`ACC:1758-1778`); the quote editor's pickers; the Tasks page's approvals.

| Store | What it holds | Written by (D-04) | Read by |
|---|---|---|---|
| `studio_price_book` (D-02, D-03) | the catalogue | W1…W15 | the manager (`GET` `PB:54-136`), the quote pickers, the save route's cost auto-fill (`LI:368-416`), `/api/quotes/auto-match`, the suggestions scan, the AI drafter (`src/lib/quote-agent/executors.ts:493`, `fallback.ts:75`, the RPC of D-15), `/api/quotes/chat` (`route.ts:54`), the drift cron, the export |
| `price_book_pricing_tiers` (D-05) | volume bands per item | `PUT /api/studio-config/pricing-tiers` | the `GET` (per item), the digitizer and the grid on a qty edit (D-30) |
| `price_book_history` (D-06) | an item's edit log | W2 only | the history drawer (`GET /api/studio-config/price-book-history`) |
| approval — columns on `studio_price_book`, `tasks` rows of type `PriceBookItemApproval`, `settings.workflow.approvers.priceBookApproval`, three notification events (D-07) | who may publish an item | W1 · W2 · W5 · W6 · W9 · `notify-pending` | the Pending tab, the Tasks page, the bell |
| `price_book_suggestions` (D-08) | "new to catalogue" candidates found on quote lines | the suggestions scan and bulk | the suggestion modal |
| `vendors` (D-09) | Finance's supplier / brand directory | Finance, the AI import's auto-create, `merge_vendors()` | vendor names on items, the markup dialog |
| `studio_quote_categories` (D-10) | the trades an item is filed under | Quote Categories, the editor's resolver, the importers | the item's category, the filters |
| `studio_assemblies.items[]`, `quote_generation_rules.line_items[]`, `quote_packages.items[]` (D-12) | references from packages and rules | the package save and editors | package apply |
| the price-book columns of `quote_line_items` (D-13) | a line's link, cost and vendor from the book | the pickers and the save route | margin, POs, project materials |
| import history (D-14) | **none** — a `source` word on each row | — | — |
| `platform_market_rates`, `crowd_rate_signals`, `embedding` + `match_price_book_items()`, bucket `price-book-images` (D-15) | Platform / AI | admin, the collectors, the embedder | drift, the drafter |
| `studios.settings`, role permissions, notification preferences (D-16) | the flags, the approver list, the gate | Accounts screens | the routes |

### D-02 · `studio_price_book` — every column

Created by `090:71-84`; widened by `sb:20260414000003:6-19`, `sb:20260416000001:32-47`, `100`, `110`, `112`, `113`, `114`, `135`, `160`, `288` (and `215`, off-HEAD). Writer keys W1…W15 are D-04's.

| # | Column | Type | Null / default | Constraint / index | Migration | Written by | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `id` | uuid | PK `gen_random_uuid()` | | `090:72` | insert | referenced softly by lines, packages, rules and approval tasks (D-12, D-13, D-07) |
| 2 | `studio_id` | uuid | NOT NULL | → `studios` CASCADE; `idx_studio_price_book_studio` (`090:84`) | `090:73` | insert (the session's) | the RLS key |
| 3 | `description` | text | NOT NULL | | `090:74` | W1 W2 W9 W10 W11 W14 | the long text, the only text before `113`; the editor sends `''` when only a name is typed (`PBE:473`) |
| 4 | `name` | text | null | | `113:11-13` | W1 W2 W9 | the headline; readers print `name \|\| description` (`src/components/leads/browse-price-book-modal.tsx:217-218`) |
| 5 | `item_id` | text | null | UNIQUE `(studio_id, item_id) WHERE item_id IS NOT NULL` — **twice**: `studio_price_book_item_id_unique` (`113:18-20`) and `studio_price_book_studio_item_id_uniq` (`159:62-64`) | `113:11-13` | W1 W2 (auto `PB-NNN`, D-30) · W9 | the SKU; `159` cleared duplicates on the older rows before its index (`159:45-59`) |
| 6 | `category_id` | uuid | null | → `studio_quote_categories` SET NULL | `090:75` | W1 W2 W3 W9 W10 W11 | a rename leaves it on the inactive old row (accounts D-14; D-10) |
| 7 | `subcategory` | text | null | none | **not at HEAD** (`215`, commit `8c2e961a2`) | W1 W2 | typed `DBT:2373-2375`, mapped `TR:1009`; D-11 |
| 8 | `unit_price` | numeric (unscaled) | null | | `090:76` | W1 W2 W9 W10 W11 W14 | the **sell** price, dollars; a 0 from the editor is stored NULL (`PBE:479, 511`) |
| 9 | `cost_price` | numeric(12,2) | NULL | | `sb:20260414000003:6-7` | W1 W2 W9 W10 W14 | per unit. The docs make NULL "no cost" and 0 a real zero (`docs/rules/leads.md:924-925`), but the editor sends `costPrice \|\| undefined` on add and `\|\| null` on edit (`PBE:482, 512`), so a typed 0 is stored as NULL — NULL means *unknown or zero* |
| 10 | `markup_percent` | numeric(5,2) | NULL | | `sb:20260414000003:12-13` | W1 W2 W4 W10 W14 | **its meaning depends on the writer and the era** (D-31); a 0 from the editor is stored NULL (`PBE:483, 513`) |
| 11 | `market_rate_min` · `market_rate_max` | numeric(12,2) | NULL | | `sb:20260414000003:8-11` | **none** (grep of `src/` and `scripts/`) | shown by the combobox when set (`src/components/leads/price-book-combobox.tsx:344-346`) — **dead** |
| 12 | `unit` | text | null | | `090:77` | W1 W2 W9 W10 (default `'lot'`) W11 W14 | free text |
| 13 | `source` | text | `'manual'` | none | `090:78` | W1 (`manual` · `csv_import` · `ai_parse` · `market_seed`) · W9 (`manual`) · W10 · W11 (`csv_import`) · W14 (`platform-default`, `flo-seed`) | provenance (D-142) |
| 14 | `external_ref` | text | null | | `090:79` | **none** (grep) | **dead** |
| 15 | `is_active` | boolean | `true` | | `sb:20260414000003:14-15` | W2 (archive / restore) · W5 (true) · W6 (false) · W10 · W14 | archive = soft delete; a rejection archives too |
| 16 | `tags` | text[] | `'{}'` | | `sb:20260414000003:16-17` | W1 W2 · W9 W10 (`[]`) · W14 | free words (comma-split in the editor, `PBE:484, 524`) |
| 17 | `notes` | text | NULL | | `sb:20260414000003:18-19` | W1 W2 W10 · W9 (NULL) | |
| 18 | `image_url` | text | NULL | | `sb:20260416000001:32-33` | W1 W2 W8 | a **public** URL in bucket `price-book-images` (D-15) |
| 19 | `spec_url` | text | NULL | | `sb:20260416000001:34-35` | W1 W2 | a spec-sheet link |
| 20 | `cost_type` | text | `'combined'` | none (no CHECK) | `sb:20260416000001:38-39` | W1 W2 W10 W14 | `material · labor · subcontractor · combined` (`APT:3906`) |
| 21 | `waste_percent` | numeric(5,2) | `0` | | `sb:20260416000001:42-43` | W1 W2 W10 W14 | raises the **billed** quantity of a line that uses it (D-30) |
| 22 | `vendor_id` | uuid | NULL | → `vendors` SET NULL (`100:14-16`); partial index `100:18-19` | `sb:20260416000001:46-47` | W1 W2 W12 | the deprecated mirror of `vendor_ids[0]` (`DBT:2395-2396`); W10 leaves it NULL |
| 23 | `vendor_ids` | uuid[] | NOT NULL `'{}'` | **no FK**; GIN `idx_price_book_vendor_ids` | `135:6-16` (backfilled from `vendor_id`, `:10-13`) | W1 W2 W10 W12 | priority order — `[0]` is the primary vendor a PO is pre-filled from (`313:183-189`) |
| 24 | `created_by` | uuid | NULL | → `profiles` SET NULL; partial index | `110:11-18` | W1 W9 | "immutable after insert" (`DBT:2400`); W10 · W11 · W14 leave it NULL |
| 25 | `order_index` | int | NULL | partial index `(studio_id, order_index)` | `112:7-12` | W3 only | drag order; NULL rows sort after ordered ones, then newest first (`PB:70-71`) |
| 26 | `approval_status` | text | NOT NULL `'approved'` | CHECK `pending · approved · rejected`; partial index on `pending` (`114:17-19`) | `114:10-12` | W1 W2 W5 W6 W9 | D-07 |
| 27 | `approved_by` · `approved_at` | uuid → `profiles` SET NULL · timestamptz | NULL | | `114:13-14` | W1 W2 W5 W6 W9 | the **reviewer** — the rejecter too (W6) — or the trusted creator (W1) |
| 28 | `approver_user_id` | uuid | NULL | → `profiles` SET NULL; partial index | `160:20-25` | **none** in `src/` (grep) | the migration names two writers (`160:7-12, 27-28`); neither writes it — **dead** (D-19) |
| 29 | `embedding` | vector(1536) | NULL | HNSW cosine `idx_studio_price_book_embedding` | `288:3-13` | W13 | absent from `DbStudioPriceBookItem`; D-15 |
| 30 | `created_at` · `updated_at` | timestamptz | `now()` (nullable) | | `090:80-81` | insert · W2 W4 W5 W6 W8 W12 | **no trigger** on any price-book table (grep of both sets); W3 and the tier `PUT` leave `updated_at` alone |

Types: `DbStudioPriceBookItem` `DBT:2368-2412`; `StudioPriceBookItem` `APT:3862-3904` (adds the joined `categoryName`, `vendorName`, `vendorNames`, `pricingTiers`, `createdByName`). Transformer `TR:978-1039`: drops `external_ref`, `approver_user_id`, `updated_at` and `embedding`; reads `vendorIds = vendor_ids` when non-empty, else `[vendor_id]` (`TR:992-994`); defaults `approvalStatus` to `approved` (`TR:1035`).

### D-03 · Table-level facts: keys in, keys out, triggers, RLS

- **Foreign keys pointing at `studio_price_book`:** `price_book_pricing_tiers.price_book_item_id` CASCADE (`sb:20260416000002:10`), `price_book_history.price_book_item_id` CASCADE (`sb:20260416000001:10`), `price_book_suggestions.added_to_price_book_id` SET NULL (`115:37`).
- **Soft references (no FK):** `quote_line_items.price_book_item_id` (`sb:20260414000001:31-32`, "added as soft ref"), `studio_assemblies.items[].priceBookItemId` (JSON, D-12), `quote_generation_rules.line_items[].price_book_id` (JSON, `132:12`), `quote_packages.items[].priceBookItemId` (JSON), `tasks.related_entity_id` (text, D-07).
- **Keys out:** `studio_id` → `studios` CASCADE; `category_id` → categories SET NULL; `vendor_id` → `vendors` SET NULL (`100`); `created_by` · `approved_by` · `approver_user_id` → `profiles` SET NULL; `vendor_ids[]` checked by nothing.
- **Triggers:** none (grep of both sets for `CREATE TRIGGER` on these tables).
- **RLS:** direct scope (`226:56`); the route headers still say the lock is "deferred" (`PB:6-10`; `223:17-22`) — stale since `226`.

### D-04 · The writers and their checks

| Key | Writer | Client | Role check | What it writes | Notes |
|---|---|---|---|---|---|
| W1 | `POST /api/studio-config/price-book` (`PB:145-285`) | scoped | `pricebook.edit` on the role row picked by `TAG_PRIORITY` (`PB:156-166`) | one batch insert (`PB:194-213`). The literal `owner` / `admin` tag → `approved` by the creator; anyone else → `pending` (`PB:28-30, 168-174`). Missing SKUs → `PB-NNN` (`PB:176-192`). A pending row raises an approval task to the first owner, else the first admin, and calls `notify-pending` (`PB:227-256`). Embeddings after the response (`PB:265-279`) | on any unknown-column error it retries the **base row**, which drops cost type, waste, vendors, image, spec, sub-category **and the approval fields** — while the task side-effect still runs (`PB:213-256`; D-18 #1) |
| W2 | `PATCH /api/studio-config/price-book/[id]` (`PBI:52-201`) | scoped | `pricebook.edit` (`PBI:68-78`) | any of 18 columns (`PBI:41-47`) + `updated_at`. The approval machine (`PBI:80-101`): an untrusted edit of a non-pending row → `pending` + a "Re-approve" task (`PBI:128-148`); a trusted edit of a pending row → `approved` + the task closed (`PBI:149-158`); an archive-only edit skips both (`PBI:82`). History (D-06, `PBI:160-183`); a crowd signal (`PBI:185-194`); re-embedding on a new description (`PBI:120-125`) | the fallback retry strips six columns and the approval change (`PBI:108-114`) |
| W3 | `POST /api/studio-config/price-book/reorder` (`reorder/route.ts:25-31`) | scoped | **none** | `order_index`; `category_id` on a cross-category drop | no `updated_at`, no history, no approval flip (accounts C-30) |
| W4 | `POST /api/studio-config/price-book/vendor-markup` (`vendor-markup/route.ts:23-28`) | scoped | **none** | `markup_percent` + `updated_at` on every **active** row whose scalar `vendor_id` matches | prices untouched (D-31); no history |
| W5 | `POST /api/price-book/[id]/approve` (`approve/route.ts:15-119`) | service role | the `owner` / `admin` **tag** (`:29-39`) | `approved`, the reviewer, the time, `is_active true` (`:61-71`); closes the task (`:78-90`); notifies the creator (`:93-112`) | no history row |
| W6 | `POST /api/price-book/[id]/reject` (`reject/route.ts:19-124`) | service role | `owner` / `admin` tag (`:39-48`) | `rejected`, the reviewer, the time, `is_active false` (`:62-78`). The required comment (`:31-35`) goes to `tasks.approval_comment` (`:80-93`) and the notification (`:95-117`) — **not** onto the item | rejects any status, approved rows included; no history row |
| W7 | `DELETE /api/price-book/[id]` (`[id]/route.ts:28-90`) | service role | `owner` / `admin` tag (`:42-55`) | a hard delete; tiers and history cascade | lines, packages, rules and tasks keep dangling ids (D-18 #6) |
| W8 | `POST /api/price-book/upload-image` (`upload-image/route.ts:10-88`) | service role | **none** (studio match, `:38-48`) | uploads `{studioId}/{itemId}-{ms}.{ext}` (≤ 5 MB; jpeg · png · webp · gif; `:6-7, 50-61`) and sets `image_url` + `updated_at` (`:72-76`) | |
| W9 | `POST /api/price-book/suggestions/bulk` (`bulk/route.ts:43-323`) | service role | **none** | one insert per add (`:200-223`) with `source 'manual'`, a `PB-NNN`, the tag-based approval; a pending add raises a task to `workflow.approvers.priceBookApproval[0]`, else the owner, else an admin (`:116-148, 230-277`); marks the suggestion and links its quote line (`:283-301`) | the `pricebook.edit` gate of W1 does not apply; no embedding |
| W10 | `POST /api/price-book/import` (`src/app/api/price-book/import/route.ts:6-157`) | service role | **none** | creates missing categories, `General` for blanks (`:50-82`); finds or creates a vendor by `ilike` (`:84-120`); inserts rows approved by default, `vendor_ids` only (`:122-145`) | **no caller in `src/`** (grep) — dead, but reachable by any session |
| W11 | `POST /api/quotes/import` (`src/app/api/quotes/import/route.ts:11-…`) | service role | **none** | upserts categories (`:44-68`); inserts description · category · `unit_price` · unit · `source 'csv_import'` (`:70-83`) | **no caller** (grep) — dead, reachable |
| W12 | `merge_vendors()` (`313:86-285`) | SECURITY DEFINER | the studio claim and both vendors in it (`313:131-159`); the route asks `vendors.merge` (`src/app/api/vendors/records/[id]/merge/route.ts:80`) | `vendor_id` and `vendor_ids` rewritten in one statement, order kept (`313:209-233`) | applied nowhere yet (§0) |
| W13 | embeddings (`src/lib/quote-agent/price-book-embeddings.ts:7-24`; `scripts/quote-agent/backfill-price-book-embeddings.mjs`) | the caller's / service role | — | `embedding` from `openai/text-embedding-3-small` (`src/lib/ai.ts:463-480`) | |
| W14 | seeds (`scripts/seed/seed-default-pricebook.mjs:139, 153-187`; `scripts/tenants/flo-design/seed-pricebook.mjs:330-368`) | service role | the operator | delete their own `source` rows, then insert | D-240, D-241 |
| W15 | migrations | — | — | `135:10-13` (`vendor_ids` from `vendor_id`); `159:45-59` (duplicate SKUs cleared) | |

**Who can reach W1 and W2.** With the seeded roles, only owners and admins pass `pricebook.edit` — the Interior Designer and Accounting rows carry `edit: false` (`109:96, 126`; `125:47-48`) and the legacy fallback denies an ID too (`AC:293`). A **pending** item therefore appears only where a studio granted `pricebook.edit` to a non-owner role, or through the ungated W9 (D-07). The screen hides editing from members without the permission (`PBM:57-61`) but not the drag, the export or the history (accounts C-30).

### D-05 · `price_book_pricing_tiers` — volume bands

`sb:20260416000002:8-18`: `id uuid PK` · `price_book_item_id uuid NOT NULL → studio_price_book CASCADE` · `min_qty numeric(12,2) NOT NULL DEFAULT 0` · `max_qty numeric(12,2)` (NULL = open) · `unit_price numeric(12,2) NOT NULL` · `cost_price numeric(12,2)` · `created_at timestamptz NOT NULL now()`; index `idx_pricing_tiers_item`. No `studio_id`; RLS through the parent (`226:122`). **No constraint** on overlaps, gaps, `min_qty ≤ max_qty` or negative values; tiers carry no markup of their own.

- **Written by** `PUT /api/studio-config/pricing-tiers` (`pricing-tiers/route.ts:15-52`): delete every tier of the item, then insert the list — two statements, no transaction, **no role check**. The editor calls it after **every** item save, changed or not (`PBE:535-541`), so tier ids change on each save.
- **Read by** the price book `GET`, which fetches them in chunks of 200 ids and sorts each item's list by `min_qty` (`PB:84-104`, "graceful — table may not exist yet").
- **Applied** only in the browser, on a quantity edit of a linked line (D-30); never by a server route.
- Types `DbPriceBookPricingTier` `DBT:1310-1318`, `PricingTier` `APT:2044-2051`, `transformPricingTier` `TR:1382`.

### D-06 · `price_book_history` — the edit log

`sb:20260416000001:8-25`: `id` · `price_book_item_id NOT NULL → studio_price_book CASCADE` · `studio_id NOT NULL → studios CASCADE` · `changed_by → profiles SET NULL` · `change_type text NOT NULL DEFAULT 'update'` (comment: `create · update · archive · restore`) · `field_changes jsonb NOT NULL DEFAULT '{}'` · `unit_price_before/after`, `cost_price_before/after` numeric(12,2) · `markup_percent_before/after` numeric(5,2) · `created_at`; indexes `(price_book_item_id, created_at DESC)` and `(studio_id, created_at DESC)`. Scoped by `223:35-58`.

- **One writer:** W2 (`PBI:160-183`). It writes `update`, `archive` or `restore` (`PBI:161-163`); **`create` is never written** — W1, W9, W10, W11 and the seeds log nothing.
- **What a row says.** `field_changes` compares the request's `changes` with the browser's `previousValues`, which carry four keys only (`PBI:48-50`; sent by `PBE:528-533`), while the editor sends seventeen keys on every save — all eighteen but `is_active` (`PBE:508-527`). Every other key is therefore recorded as changed with `old: null`, and the two arrays (`tags`, `vendor_ids`) always differ (`PBI:165-170`). The before / after figures come from the browser too, not from the row.
- **What it misses:** approvals and rejections (W5, W6), W4's re-prices, drag re-filing (W3), tier changes, image uploads, bulk and suggestion adds, merges.
- **Read by** `GET /api/studio-config/price-book-history?itemId=` — the newest 50, with `profiles.full_name` (`price-book-history/route.ts:45-60`).
- Deleted with the item (CASCADE, W7). Types `DBT:2414-2427`, `APT:3908-3923`, `TR:945-961`.

### D-07 · Item approval — columns, tasks, the approver setting, notifications

- **Columns:** `approval_status` · `approved_by` · `approved_at` (`114:10-14`; every row existing at `114` became `approved`, `114:7-8`) and `approver_user_id` (`160`, no writer — D-19).
- **Transitions:**

| From | Event | To | Side effects |
|---|---|---|---|
| — | W1 · W9 by an `owner` / `admin` tag | `approved` (reviewer = creator) | — |
| — | W1 · W9 by anyone else | `pending` | a task + a notification |
| `approved` · `rejected` | W2 by an untrusted editor (not archive-only) | `pending` | a "Re-approve" task + a notification |
| `pending` | W2 by a trusted editor | `approved` | the task closed |
| `rejected` | W2 by a trusted editor | stays `rejected` | — (`PBI:92-96` approves only a pending row) |
| any but `approved` | W5 | `approved`, `is_active true` | the task closed, the creator notified |
| any | W6 (comment required) | `rejected`, `is_active false` | the task closed with the comment, the creator notified |
| `rejected` | W2 archive-only restore (`is_active true`) | stays `rejected`, **live again** in the pickers | — |

- **Usable while pending** (`114:2-5`): the pickers filter on `is_active` only (`browse-price-book-modal.tsx:72-74`); the drafter's RPC excludes `rejected` only (`289:4-12, 31`); the save route's cost auto-fill reads every active row (`LI:381-385`).
- **`tasks` rows** (`030:2-24`) of `type 'PriceBookItemApproval'` (`APT:1649`): `related_entity_id` = the item id as **text** (no FK), `assignee_user_id → profiles`, `approval_status pending → approved | rejected`, `approval_comment` = the rejection note, `status NotStarted → Completed`, `planned_date` = today. Created by W1 (`PB:227-245`), W2 (`PBI:128-140`) and W9 (`bulk/route.ts:230-245`); closed by W2 (`PBI:149-158`), W5 and W6 — the Tasks page's approve and reject call W5 / W6 (`src/app/(main)/tasks/page.tsx:745-790, 826-843`). A W7 delete leaves the task behind.
- **Who approves.** W1 and W2 assign the task to the first `owner`, else the first `admin` (`PB:39-46`; `PBI:32-39`). `studios.settings.workflow.approvers.priceBookApproval` (profile ids, written by Accounts › Workflow `ACC:1705-1731`, whose words say "Owners are always in the loop; add extra members to share the load", `ACC:1712`) is read only by W9 (`bulk/route.ts:116-148`) and `notify-pending` (`notify-pending/route.ts:52-75`), and both use **the first listed member alone**. So with an approver configured, W1's task goes to the owner while the bell goes to that approver.
- **Notifications** (category `pricing`, `src/lib/notifications/events.ts:103-106, 619-662`): `price_book.item_pending_approval` (`notify-pending/route.ts:79-94`; `bulk/route.ts:258-273`), `price_book.item_approved` and `price_book.item_rejected` to the creator (W5 `:93-112`; W6 `:95-117`), `price_book.drift_detected` (D-15). Preferences: `notification_preferences` rows `pricing` × `email` · `in_app`, recipients `{owner,admin}`, seeded for every studio by `112_seed_pricing_preferences.sql`. The dispatched rows are delivery records (QE D-222).

### D-08 · `price_book_suggestions` — "new to catalogue" candidates

`115:16-53`: `id` · `studio_id NOT NULL CASCADE` · `quote_line_item_id → quote_line_items CASCADE` (partial UNIQUE: one suggestion per line, `115:51-53`) · `copilot_shadow_item_id` (no FK) · `source_event` CHECK `pdf_parse · ai_generation · copilot · submit_review · manual` · `description NOT NULL` · `name` · `category_name` · `unit_price` · `cost_price` (unscaled numeric, dollars) · `unit` · `qty` · `match_tier` CHECK `high · suggested · none` · `match_confidence` · `status` CHECK `pending · added · dismissed` · `added_to_price_book_id → studio_price_book SET NULL` · `dismissed_by` · `created_by → profiles SET NULL` · timestamps; a pending index. RLS `226:48`.

- **Scan** (`src/app/api/price-book/suggestions/scan/route.ts:47-162`): matches unlinked lines against the active book; `high` and `suggested` matches link the line silently (`:102-118`); `none` matches become pending rows (`:121-148`). The insert is one batch that ignores a unique violation (`:143-152`) — so one line that already has a suggestion makes the batch's other new candidates vanish.
- **Bulk** (W9): `dismissed` + `dismissed_by`, or `added` + `added_to_price_book_id` and the line linked (`bulk/route.ts:78-91, 283-301`).
- Types `DBT:2618-2640`, `APT:3928-3949`, `TR:920`. The matcher's queue — Platform / AI (QE D-219).

### D-09 · `vendors` — as the price book uses it

Columns (`059:7-23`): `id` · `studio_id NOT NULL → studios` (no ON DELETE) · `name NOT NULL` · `company_name` · `phone` · `email` · `trade` · `bank_name` · `bank_account_number` · `bank_account_holder` · `notes` · `is_active NOT NULL true` · timestamps; `+ default_markup_percent numeric(5,2)` (`sb:20260416000002:24-25`); `+ kind text NOT NULL 'supplier'` CHECK `supplier · brand · both` (`312:66-78`, applied nowhere yet — §0). Index on `studio_id`; RLS `226:57`. **No uniqueness on `name`** — duplicate names exist "on all 28 DBs" (`312:34-35, 48-52`). Types `DBT:1291-1308`, `APT:2023-2042`.

- **Links from the book:** `vendor_id` (FK SET NULL) and `vendor_ids[]` (no FK) — D-02 #22-23. One item names several vendors at **one** price: tiers and prices are per item, not per vendor. A quote line linked to an item picks one of the item's vendors (the "PB pool", `PBE:313-322`; `browse-price-book-modal.tsx:102, 237-241`).
- **Names on screen:** the `GET` batch-fetches names (`PB:106-120`); the export joins `vendors(name)` through the scalar FK — the first vendor only (`src/app/api/price-book/export/route.ts:18, 42`).
- **Created from the book:** the AI import finds or creates a `supplier` through `POST /api/vendors/records` with the shared dedupe (`PBM:1171-1205`; `src/app/api/vendors/records/route.ts:170-195`); W10 creates by `ilike` (`import/route.ts:84-120`).
- **`default_markup_percent`:** written by Finance's vendor drawer (`src/components/finance/vendor-detail-drawer.tsx:211` → `src/app/api/vendors/records/[id]/route.ts:121-122`); read only as the markup dialog's suggestion (`src/components/accounts/vendor-markup-dialog.tsx:93-98`). A new item never takes it.
- **Merge:** `merge_vendors()` repoints items (W12) and deactivates the loser with a note (`313:260-278`).
- Everything else — bank, trade, kind, POs, bills, expenses — is Finance's (QE D-109).

### D-10 · `studio_quote_categories` — as the price book uses it

Columns: templates D-18, QE D-14 (`090:58-65`: `id`, `studio_id`, `name NOT NULL`, `order_index 0`, `is_active true`, UNIQUE `(studio_id, name)`; `+ subcategories text[] NOT NULL '{}'`, `172:9-10`; `+ description`, `174:8-9`). RLS `226:56`.

- **An item holds `category_id`**; the `GET` joins the name whatever the row's state (`PB:68`), so an item filed under a renamed — deactivated — category keeps showing the old name (accounts D-14, C-31).
- **Categories created from the book:** the editor's `virtual:` resolver upserts a name with `is_active true` (`PBE:442-461` → `src/app/api/quotes/categories/resolve/route.ts:29-35`), reviving a deactivated row or adding one at `order_index 0`; W10 creates missing names and files blanks under `General` (`import/route.ts:61-82`); W11 upserts them (`quotes/import/route.ts:44-68`).
- **The Price Book tab's import** maps names onto the studio's **active** categories (the list `GET /api/studio-config/quote-categories` returns), case-insensitively, and drops the rest to NULL (`PBM:1208-1213`).
- `subcategories` is the allowed list a line's or an item's free-text sub-category "SHOULD match" (`172:18-19`; D-11).

### D-11 · `studio_price_book.subcategory` — written by the code, not created at HEAD

Typed (`DBT:2373-2375`), mapped (`TR:1009`), written by W1 (`PB:208-209`) and by every editor save (`PBE:516`), read by the Browse modal, which carries it onto a line only while `features.price_book_subcategory_in_quote` is on (`browse-price-book-modal.tsx:224`). The DDL is `215` (off-HEAD, §0). On a database without the column, W1's insert fails and retries the base row — the item lands without cost type, waste, vendors, image and spec, and **approved** — and every editor save retries without the approval flip (`PBI:108-114`). Whether any fork lacks the column is unknown (§Uncertain).

### D-12 · Packages and rules that reference items

- **`studio_assemblies.items[]`** (templates D-05; `sb:20260414000003:23-36`, `184`, `198`, `270`, `280`, `302`, `305`): an item may carry `priceBookItemId` (soft) and, since `305`, a vendor snapshot `vendorId` / `vendorIds` (`APT:3951-3973`; `305:116-120`) — shape D-21. Written by `create_template_from_quote` (`305:45-150`) and the Packages editor (`mapLineItemsToPackageItems`, `src/lib/leads/map-package-items.ts:77-101`); applied by `mapPackageItemsToLineItems` (`:21-66`), which copies the link and the vendor onto the new lines. Before `305`, "0 of 97 real package items carried a link" (`305:5-7`). The apply RPCs drop the link (QE D-15).
- **`quote_generation_rules.line_items[].price_book_id`** (`132:12-13`; `DBT:2432-2440`) — with **cents** and **basis points** beside it; read by the digitizer's rules. Held (templates Q-07).
- **`quote_packages.items[]`** (`sb:20260414000005:4-18`) — `QuoteLineItem[]` snapshots, each with its `priceBookItemId`. Later (QE D-212).

Nothing enforces these ids; W7 leaves them dangling.

### D-13 · Quote lines that point at the price book

The `quote_line_items` columns fed from the book (`DBT:584-645`; the whole table is QE D-02 · QE D-103):

| Column | DDL | Fed by |
|---|---|---|
| `price_book_item_id` uuid, no FK | `sb:20260414000001:31-32` | every pick; the save route's auto-match (only a `high` match, only on a line with no cost and no link, `LI:368-416`); the suggestions scan and bulk (D-08) |
| `vendor_id` uuid, no FK | `sb:20260416000001:62-63` (although `313:23-28` says "declared by no migration") | the pick (one vendor of the item's pool); the auto-match (the item's first vendor) |
| `price_snapshot_at` | `sb:20260416000001:66-67` | the pick; the auto-match (`LI:465`) |
| `cost_price` · `unit_price` · `margin_percent` | `sb:20260414000001:21-22`; `sb:20240101000020:18` | the item's cost, sell and **markup** — `margin_percent` holds markup since 2026-09-16 (`QCM:52-57`) |
| `waste_percent` · `cost_type` | `sb:20260416000001:54-59` | the item's |
| `source` | CHECK `193` → `290` | `price_book` on a pick (`browse-price-book-modal.tsx:243-246`) |
| `name` · `item_id` · `spec_url` · `notes` · `image_url` | `113`, `110` | `name` / `description` split, spec, image; the SKU only through quote-mode *Also save to price book*, which inserts a W1 row and adopts its `PB-NNN` (`PBE:565-596`) |
| `category` (text) · `subcategory` | `172` | the category's **name**; the sub-category while the flag is on |

The Browse modal's mapping: `browse-price-book-modal.tsx:203-258`; the editor's combobox pick: `PBE:740-760`.

### D-14 · Import history — none

No import table in either set (grep). An import leaves a `source` word on each row (D-02 #13) and nothing else; the Imports sub-tab is a placeholder — "A history of recent imports lands later" (`PBM:1121-1125`). The document parse (`/api/price-book/parse`) is stateless (D-23); `crowd_rate_signals.source_type 'csv_import'` is a platform signal, not a log (D-15). El Arte's onboarding design planned a file register in `studios.settings.catalogue_files` (`docs/superpowers/specs/2026-05-27-elarte-pricebook-onboarding-design.md:76-100`) — no writer is in the repo (accounts D-20).

### D-15 · Platform and AI stores around the price book

- **`platform_market_rates`** (`sb:20260414000003:40-56`; seed `sb:20260414000004` — 32 SG, 30 MY, 24 AE, 25 IN rows, each in its country's currency, year 2025): read by the drift cron through the service role (`src/app/api/cron/price-drift/route.ts:54-57`) and by `GET /api/studio-config/platform-market-rates` through the **scoped** client (`route.ts:26-33`). `264` revokes every grant from `authenticated` on this table (`264:44-79`), so after `264` the Drift tab, its badge, the manager's drift map and *Seed from {country}* would read nothing — read from the code, not executed (§Uncertain).
- **`crowd_rate_signals`** (`sb:20260416000003:5-21`): anonymised prices written by `collectRateSignal` from W2 when a price and a description change together (`PBI:185-194`, category hard-coded `General`) and from quote saves; service role; Platform.
- **`embedding` + `match_price_book_items()`** (`288`, `289:13-35`): the drafter's semantic tier — active rows, not rejected, cosine distance ≤ 0.35.
- **The drift cron stores nothing**: it recomputes drift monthly and sends one `price_book.drift_detected` per studio (`cron/price-drift/route.ts:11-19, 40-126`).
- **Bucket `price-book-images`**: public (`111:6-8`) with public read and **unrestricted** insert / delete policies on `storage.objects` (`111:10-20`); left public by `233:19`. Objects at `{studioId}/{itemId}-{ms}.{ext}` (W8).

### D-16 · Settings, roles and flags that touch the price book

| Key | Shape | Written by | Read by | Verdict |
|---|---|---|---|---|
| `studios.settings.features.price_book_subcategory_in_quote` | boolean, absent = on | `PUT /api/studio-config/features` (`features/route.ts:141`) | the Browse modal and package apply — whether an item's sub-category rides onto a line (`features/route.ts:82`; `map-package-items.ts:27-35`) | live |
| `studios.settings.workflow.approvers.priceBookApproval` | profile ids | `ACC:1705-1731` | W9, `notify-pending` — the first entry only (D-07) | live, half-used |
| `studios.settings.catalogue_files` | `{name, items, uploaded_at}[]` (`DBT:829`) | none in the repo | an unused variable (accounts D-20) | dead |
| `studio_roles.permissions.actions.pricebook` | `{view, edit}` | the Roles screen; seeds `109:32, 65, 96, 126`; `125:41-48` | W1, W2 on the server; the manager's buttons (`PBM:57-61`) | live for W1 / W2 only |
| `…actions.vendors` | `{view, create, edit, merge}` | the same | the vendor routes | Finance |
| `notification_preferences` category `pricing` | per channel | `112_seed_pricing_preferences.sql`; the owner's `PUT` | the dispatcher | live |
| `studios.country_code` | text | admin | the market rates and drift by country; crowd signals | live |

With no role row, `resolveCanPerformAction` falls back to tags: owner and admin edit; accounting and ID view only (`AC:249-312`, the price-book lines `:284, 293`; the default matrix `:345`).

### D-17 · Where the screen hides what the API allows

All read from the code, none executed.

1. **Adding without `pricebook.edit`.** W9 inserts items (pending) for any member; W10 and W11 insert **approved** rows for any session and create categories and vendors on the way.
2. **Re-filing by drag** — W3 moves an item between categories for any member (accounts C-30).
3. **Re-pricing by vendor** — W4 for any member.
4. **Replacing tiers** — the tier `PUT` for any member.
5. **Uploading an image** — W8 for any member; the bucket's own policies let anyone insert or delete (D-15).
6. **Approval edges** — W6 rejects an approved item; W5 revives a rejected, archived item; an archive-only restore puts a rejected item back in the pickers (D-07).
7. **The export includes archived and rejected rows** although its card says "Download every active item as a CSV" (`export/route.ts:16-20`; `PBM:1160`).

### D-18 · Writes that lose or bend data

| # | Write | What happens | Where |
|---|---|---|---|
| 1 | W1 on a database missing a column (e.g. `subcategory`) | the base-row retry drops vendors, cost type, waste, image, spec **and the approval** — a would-be pending item lands approved, and its approval task is raised anyway | `PB:213-256`; D-11 |
| 2 | W2's history | every sent key logged with `old: null`; the before / after figures come from the browser | `PBI:160-183`; `PBE:508-533` |
| 3 | W4 vendor markup | sets `markup_percent` only — the sell and the cost stay, so the stored markup stops describing the prices; only the scalar `vendor_id` is matched; no history | `vendor-markup/route.ts:23-28` |
| 4 | The tier `PUT` | delete-all then insert, no transaction; re-run on every save | `pricing-tiers/route.ts:30-46`; `PBE:535-541` |
| 5 | W6 reject | the reason lives on the task only; `approved_by` names the rejecter | `reject/route.ts:62-93` |
| 6 | W7 hard delete | history and tiers go; lines, packages, rules and approval tasks keep ids that point nowhere; suggestions lose theirs (SET NULL) | `[id]/route.ts:9-18, 69-73` |
| 7 | Quote Categories › *Import Price Book from CSV* | prices × 100 into a dollars column; the category column is parsed and dropped | `ACC:1764-1778`; `src/components/leads/csv-import-dialog.tsx:90-104` (accounts D-14) |
| 8 | The Price Book tab's import | unknown categories → NULL; `notes` parsed but not passed; no `name`; the parse's GST reading shown but never applied | `PBM:1208-1221`; `CSVD:464-468` |
| 9 | *Seed from {country}* | cost = `rate_min`, sell = `rate_typical` (else the band's midpoint), `markup_percent` = (typical − min) / typical — a **margin** figure in the markup column (else a flat 20) | `PBM:404-425` |
| 10 | The editor's zeros | a typed 0 for sell, cost or markup is stored as NULL | `PBE:479-483, 511-513` |
| 11 | The suggestions scan | one duplicate in a batch drops the batch's other new candidates | `scan/route.ts:143-152` |
| 12 | A category rename | the items stay on the inactive row | accounts D-14 |
| 13 | `159` | duplicate SKUs cleared on the older rows | `159:45-59` |

### D-19 · Documents and comments that disagree with the code

| Says | Where | The code |
|---|---|---|
| the approver is pinned at submission by the bulk route and read by `notify-pending` | `160:7-12, 27-28` | nothing writes `approver_user_id`; both routes re-resolve (D-07) |
| "Owners are always in the loop; add extra members to share the load" | `ACC:1712` | the bell goes to the first listed approver alone; W1 / W2's task goes to the owner (D-07) |
| `added_to_price_book_id` "is also a soft reference" | `src/app/api/price-book/[id]/route.ts:17-18` | an FK with ON DELETE SET NULL (`115:37`) |
| unmatched categories "will be created on import" | `src/lib/price-book-parser.ts:257` | the tab's import drops them (`PBM:1208-1213`) |
| `quote_line_items.vendor_id` is "declared by no migration" | `313:23-28` | `sb:20260416000001:62-63` |
| "Download every active item as a CSV" | `PBM:1160` | every row (D-17 #7) |
| the `studio_price_book` lock is "deferred" | `PB:6-10`; `223:17-22` | locked by `226:56` |
| packages "are unaffected" by the sub-category flag | `docs/rules/leads.md:920-923` | the same flag governs package apply (`map-package-items.ts:27-35`) |
| the Drift review: "admin applies the suggested update" | `docs/prd/05-price-book.md:66` | the Drift tab pre-fills the editor with the band's midpoint; the save is W2 (`drift-tab.tsx:72`; `PBM:1103-1116`) |
| Flo's seed has "~170 items" | `scripts/tenants/flo-design/seed-pricebook.mjs:6` | 195 tuples in its `ITEMS` (`:57-300`) |
| "0 = a gifted line" for `costPrice` | `docs/rules/leads.md:924-925` | the price-book editor stores a 0 as NULL (D-18 #10) |

---

## 2. 1.0 — JSON shapes

### D-20 · `price_book_history.field_changes`

`{ [column]: { old: unknown, new: unknown } }` (`DBT:2420`; `sb:20260416000001:14`). Keys are the PATCH's snake_case `changes` keys — any of `description, unit_price, cost_price, markup_percent, unit, notes, is_active, tags, image_url, spec_url, cost_type, waste_percent, vendor_id, vendor_ids, category_id, subcategory, name, item_id` (`PBI:41-47`) — with the values as sent (numbers, strings, arrays, booleans, null). `old` is known only for `unit_price`, `cost_price`, `markup_percent` and `is_active` (D-06), so a row from the editor lists every field whether it changed or not. `category_id` and the vendor ids are uuids, not names. A port that wants a readable history must diff successive rows' `*_after` figures itself and treat the other keys as "saved", not "changed" (D-171).

### D-21 · `studio_assemblies.items[]` — `AssemblyItem` and its lineages

`APT:3951-3973`: `{ priceBookItemId?, name?, description, category, subcategory?, unitPrice, costPrice?, marginPercent?, qty, unit, isOptional?, amount_marker?, vendorId?, vendorIds? }` — money in **dollars**; `marginPercent` holds **markup** since 2026-09-16 (`QCM:52-57`) and whatever the grid held before. What a stored item really carries depends on when and where it was saved:

| Lineage | Keys | Source |
|---|---|---|
| the table's comment | `priceBookItemId?, description, category, unitPrice, costPrice, qty, unit, isOptional` | `sb:20260414000003:29` |
| the `185` save RPC (4 tenants, prod among them, until `305`) | `category, subcategory, description, unitPrice, qty, unit, isOptional, amount_marker` — no name, no cost | `302:6-8`; `305:21-27` |
| `302` | `+ name, costPrice, marginPercent` | `302:59-74` |
| `305` | `+ priceType, priceBookItemId, vendorId` (+ `components` on staging only) | `305:94-121` |
| the Packages editor | `category, subcategory, name, description, unitPrice, qty, unit, isOptional, amount_marker, priceBookItemId, vendorId` + `costPrice` · `marginPercent` · `vendorIds` when present | `src/lib/leads/map-package-items.ts:77-101` |

`280` copied `description` into a missing `name` (`280:39-59`). Packages saved before `302` never captured a cost ("Dyel has 45 such packages", `302:18-20`). The port of a package is templates D-165; the item link and the optional flag need templates D-137.

### D-22 · `quote_generation_rules.line_items[]`

`{ price_book_id?: uuid, description, category?, default_qty, default_unit_price_cents?, default_margin_bps?, notes? }` (`132:12`; `DBT:2432-2440`) — the only price-book reference in **cents** and **basis points**; whether `default_margin_bps` means margin or markup is not stated. Held (templates Q-07).

### D-23 · Import mappings

**(a) The Price Book tab, CSV** (`CSVD`). Target fields (`CSVD:17-27`): `description` (required) · `category` · `unit_price` ("Sell Price") · `cost_price` ("Unit Cost") · `unit` · `markup_percent` ("Markup %") · `cost_type` · `waste_percent` · `notes`. Header guesses (`CSVD:120-137`): description ← *desc · item · name*; category ← *categ · section · type · trade*; sell ← *sell + price · unit price · rate*; cost ← *cost*; unit ← exactly *unit · uom*, or *measure*; markup ← *markup · margin*; cost type ← *cost type · labour · labor*; waste ← *waste*; notes ← *note · remark*. Values (`CSVD:221-243`): numbers stripped of every character but digits, `.` and `-`; a **blank sell price becomes 0**, a blank cost `undefined`; category defaults to `General`, unit to `lot`. The rows travel as `PriceBookImportItem` (`CSVD:29-39`) to the manager's `onImport`, which sends **one** W1 request (`PBM:1171-1221`): category → the matching active category's id or nothing (D-10); `notes` **not passed**; no `name`; `source 'csv_import'`.

**(b) The Price Book tab, AI parse** — PDF, image, Excel or pasted text through `POST /api/price-book/parse` (Gemini 2.5 Flash, `parse/route.ts:38`). The prompt: "a vendor's own rate card → costPrice. A studio's own retail catalogue → unitPrice" (`:57-58`); markup and waste "only if the document explicitly states them" (`:60`). The route keeps rows with a sell or a cost (`:293-297`) — a missing sell becomes **0** — maps categories onto the studio's (`mapCategory`), canonicalises units (`src/lib/price-book-parser.ts:82-93`), flags likely duplicates at ≥ 0.7 similarity (`:182, 212-226`) and reads GST wording (`:97-133`). Result `PriceBookParseResult` (`:229-259`): `items[] {description, category, unitPrice, costPrice?, unit, markupPercent?, costType?, wastePercent?, notes?, duplicateOfId?, duplicateOfDescription?, duplicateSimilarity?, confidence?}`, `vendor`, `detectedGst: inclusive | exclusive | null`, `rawCount`, `finalCount`, `duplicateCount`, `newCategories`. The user may exclude rows (`CSVD:246-262`); the rest go through the same W1 request with `source 'ai_parse'` and the vendor found or created (D-09). A vendor rate card therefore lands as **cost-only rows selling at S$0**; the GST reading is shown ("Confirm before importing", `CSVD:464-468`) and never applied.

**(c) Quote Categories › *Import Price Book from CSV*** — `src/components/leads/csv-import-dialog.tsx:90-104` → `{description, category, unitPrice (dollars), unit, qty}` → `ACC:1764-1778` → W1 `{description, unitPrice: Math.round(unitPrice × 100), unit, source 'csv_import'}`; category and qty dropped; the price lands **× 100** in a dollars column (accounts D-14).

**(d) The dead routes' bodies** — W10 `{items: [{description, category?, unitPrice?, costPrice?, unit?, markupPercent?, costType?, wastePercent?, notes?}], vendorName?, source?}` (`import/route.ts:14-33`); W11 `{items: [{description, category?, unitPrice?, unit?}], createMissingCategories?}` (`quotes/import/route.ts:9, 18-23`).

### D-24 · The export (`GET /api/price-book/export`)

`export/route.ts:28-46`: `Description, Category, Sell Price, Unit Cost, Unit, Markup %, Cost Type, Waste %, Vendor, Tags, Notes, Active` — every row, archived and rejected included, newest first, formula-escaped (`:62-72`); service role, session only. Not exported: the name, the SKU, the sub-category, the spec link, the image, the tiers, the approval, any vendor after the first. Round trip through (a): Description · Category · Sell Price · Unit Cost · Unit · Markup % · Cost Type · Waste % map back; Vendor, Tags and Active are ignored and Notes is dropped by `onImport`.

### D-25 · The API shapes

- **Add** — `AddItemInput` (`PB:138-143`; `SC:236-255`): camelCase, dollars, `vendorIds` in priority order, `itemId` optional (→ `PB-NNN`).
- **Edit** — `Changes` (18 snake_case keys, `PBI:41-47`) + `PrevValues` (4 keys, `PBI:48-50`).
- **Tiers** — `[{ id?, minQty, maxQty | null, unitPrice, costPrice | null }]` (`pricing-tiers/route.ts:20-23`); the `id` is ignored (delete-all + insert).
- **Read** — `StudioPriceBookItem` (`APT:3862-3904`) with `pricingTiers` sorted by `minQty` and `vendorNames` in `vendor_ids` order.

### D-26 · Notification payloads (`src/lib/notifications/events.ts:619-662`)

| Event | Variables | Link | Recipients |
|---|---|---|---|
| `price_book.drift_detected` | `drift_count` | `/accounts?tab=catalogue&pb=drift` (`cron/price-drift/route.ts:117`) | owner · admin |
| `price_book.item_pending_approval` | `member_name, item_label, category, action (created · edited)` | `/tasks` | the resolved approver (D-07) |
| `price_book.item_approved` | `approver_name, item_label` | `/accounts` | the creator |
| `price_book.item_rejected` | `approver_name, item_label, comment` | `/accounts` | the creator |

### D-27 · `studios.settings` keys — shapes

`features.price_book_subcategory_in_quote: boolean` (absent = true, `features/route.ts:80-82`); `workflow.approvers.priceBookApproval: string[]` of profile ids (`approvers?: Record<string, string[]>`, `APT:4113-4115`); `catalogue_files` — typed `{name, items, uploaded_at}[]` (`DBT:829`) while El Arte's onboarding design writes `{category, categorySlug, vendor, fileName, sha256, …}` (`docs/superpowers/specs/2026-05-27-elarte-pricebook-onboarding-design.md:85-100`): two shapes for one key, and no writer in the repo.

### D-28 · Arrays and vectors in columns

`tags text[]` — free words, no vocabulary (El Arte's design writes `["ai-extracted", "<vendor-slug>"]`, spec `:214`); `vendor_ids uuid[]` — ordered, primary first, de-duplicated by the editor (`PBE:234-236`), merged in order by `313:209-233`; `embedding vector(1536)`.

---

## 3. 1.0 — derived values

### D-30 · What 1.0 computes, and where

| Value | Rule | Where | Stored? |
|---|---|---|---|
| **Sell price** | stored `unit_price`; recomputed only when the user edits the markup: `cost × (1 + markup / 100)`, 2 dp | the editor (`PBE:375-382`); the quote grid (`QCM:116-135`) | yes — whatever the browser sends |
| **Markup %** | `(sell − cost) / cost × 100` — 1 dp in the editor (`PBE:362-373`), 2 dp in the grid (`QCM:96-99`); none when cost ≤ 0 | the browser | yes (`markup_percent`) — see D-31 |
| **Margin %** | `(sell − cost) / sell × 100` per unit | the editor's chip, bands ≥ 20 green, ≥ 10 yellow (`PBE:386-392, 918-921`) | no |
| **Line margin** | over `qty × (1 + waste %)`, after discounts, before tax | `QC:114-120, 171-208` | no |
| **Category margins** | revenue − cost over priced lines | `QC:464-522` | no |
| **Tier price** | the last tier whose `[min, max]` holds the qty; above every tier → the last | `QC:536-557`, applied on a qty edit of a linked line in the digitizer (`src/components/leads/quote-digitizer-dialog.tsx:3437-3446`) and the grid's paste / fill (`src/components/leads/focused-grid/grid-write.ts:53-68`) | onto the line |
| **Billed quantity** | `qty × (1 + waste % / 100)` — the client pays for the waste | `QC:114-120` | no |
| **Drift** | a price more than 15 % below `rate_min` or above `rate_max` of the market row its description matches at ≥ 0.3 similarity | `src/lib/queries/price-book.ts:44-69`; `PBM:43, 209-230`; the cron (`cron/price-drift/route.ts:67-95`) | no |
| **Drift suggestion** | the band's midpoint | `src/components/price-book/drift-tab.tsx:72` | no |
| **SKU** | `PB-` + (the studio's highest `PB-n` + 1), 3-digit pad | `PB:176-192`; `bulk/route.ts:98-114, 193-198` | yes (`item_id`) — two concurrent adds can collide (`159:3-9`) |
| **Names shown** | the category's, the vendors', the creator's | `PB:66-120`; `TR:978-1039` | no |
| **Pending count** · **"similar" item** | `approval_status = 'pending'`; same normalised name or a prefix | `src/lib/queries/price-book.ts:29-35`; `src/components/price-book/pending-tab.tsx:45-66` | no |
| **Match tiers** | 0.70 description + 0.15 category + 0.15 unit; ≥ 0.75 `high`, ≥ 0.50 `suggested` | `src/lib/price-book-matcher.ts:166-215` | the link (D-08, D-13) |
| **Unit list** | the book's units ∪ the quote's, case-folded | `src/lib/queries/pricebook-units.ts:31-43` | no |
| **Seed values** | D-18 #9 | `PBM:404-425` | yes |

### D-31 · What `markup_percent` means, by writer

| Writer | What it stores |
|---|---|
| the item editor **before 2026-09-16** | labelled "Markup" but computed as margin-of-revenue, and capped at 100 by the margin clamp (`PBE:353-357`; `docs/rules/leads.md:907-909`) |
| the item editor **since 2026-09-16** (commit `de4d797e4`) | markup-of-cost, derived from sell and cost or typed (`PBE:362-382`) |
| the platform-default and Flo seeds | markup-of-cost, computed from a margin (`scripts/seed/seed-default-pricebook.mjs:158`; `scripts/tenants/flo-design/seed-pricebook.mjs:345`) |
| *Seed from {country}* | margin-of-revenue, or a flat 20 (`PBM:416`) |
| W4 vendor markup | a typed percent that moves neither price (`vendor-markup/route.ts:25`) |
| the CSV and AI imports | the file's own "markup" or "margin" column, whatever it meant (`CSVD:130`; `parse/route.ts:60`) |
| W9, W11 | nothing |

`unit_price` and `cost_price` are the figures of record; `markup_percent` is a note that may or may not agree with them. No server route re-derives any of the three (`PB:194-211`; `PBI:103-107`), and no constraint ties them together.

### D-32 · Zero, blank and missing prices

A typed 0 in the editor is stored as NULL (D-18 #10); a blank CSV sell price is stored as **0** (D-23a); an AI row with a cost and no sell is stored with sell **0** (D-23b); a suggestion added without a price is stored NULL (`bulk/route.ts:211, 214`). So NULL can mean unknown or zero, and 0 can mean "sells for nothing" or "never priced". The port cannot tell them apart from the row alone (D-153).

### D-33 · The same colour bands on two different figures

The editor's chip colours **margin** (≥ 20 % green, ≥ 10 % yellow, `PBE:918-921`); the manager's list colours the stored **markup** with the same thresholds (`PBM:927`). A 20 % markup is a 16.7 % margin.

---

## 4. 2.0 today

Drizzle over libSQL, one studio, no tenant column, no RLS, no foreign keys on the price book. The screens are Company › Price book › **My Items** and **My Sections** (`app/company/price-book/page.tsx`, `…/sections/`; REG-594, `design-source/REGISTER.md:596`) and the quote editor's Add Item row (`components/quotes/editor/items/items-table.tsx:525-540`).

### D-40 · `price_book_items` (`SCH:446-460`; `drizzle/0015_flimsy_phantom_reporter.sql:1-13` → `0029_studio_requests.sql:16` → `0030_price_book_soft_delete.sql:1`)

| Column | Type | Null / default | Written by | Notes |
|---|---|---|---|---|
| `id` | text PK | | `PBA:30` (`randomUUID`); `IA:338`; R23 · R38 | UUID strings; R38's tiles are slugs (`pb-tiles-hafary`, `pb-tiles-sbh`) |
| `name` | text | NOT NULL | `PBA:23-27` (`clean`, ≤ 200, else `Item`); `IA:339` | the headline |
| `description` | text | null | `PBA` (≤ 2000); `IA:339`; R29 (`REP:699-701`, by name and old text) | plain text — no formatted twin |
| `kind` | text | NOT NULL `'purchase'` | `PBA` (a known kind, else `purchase`; the import always `purchase`, `PBA:62`); `IA:339` (← the line's `icon`) | `design · fee · labour · delivery · purchase` (`IM:15`) |
| `unit` | text | NOT NULL `'Pieces'` | `PBA` (≤ 40); the import matches `UNITS` case-insensitively, else keeps the text (`PBA:62`) | `UNITS` = Pieces · Lot · sqft · ft run · point · hour · set (`IM:22`); a unit outside the list stays and shows as an extra option (`components/company/price-book/item-dialog.tsx:31`) |
| `cost_minor` | integer | NOT NULL `0` | `PBA` (≥ 0, `PBA:25`) | cents; **no NULL** — "no cost" and a zero cost are one state |
| `markup_minor` | integer | NOT NULL `0` | `PBA` (≥ −cost, `PBA:25`) | an **amount** in cents; the unit price = cost + markup, derived (D-46) |
| `category` | text | null | `PBA` (≤ 60, free text — `item-dialog.tsx:49`); `renameTrade` (`app/settings/actions.ts:268`, by exact name) | not checked against `settings.trades` (accounts E-102) |
| `thumb` | text | null | only *Save to Your Library* (`IA:339`, the line's photo) and *Duplicate* (`PBA:53`); create, edit and import write NULL (`PBA:25`) | a picture string — a line's is capped at 300 characters (`IA:92`); the prototype has no photo store and uses a lead file's thumbnail or a placeholder (`components/quotes/editor/items/items-section.tsx:773-774`) |
| `vendor` | text | null | `PBA` (≤ 80; the import per row or one for all, `PBA:63`); `IA:339`; R38 | "the same product from two vendors is two entries" (`SCH:456`) |
| `created_at` | integer ts | NOT NULL | inserts | seconds |
| `updated_at` | integer ts | null | every `PBA` write — **and every pick**: `IA:149` stamps it when a quote line takes the item | the list's *Updated* reads it (`components/company/price-book/price-book-items.tsx:22`) |
| `deleted_at` | integer ts | null | `PBA:70-73` (delete · restore · delete forever · empty trash) | soft (REG-502's rule) |

No index but the key; no SKU, notes, spec link, tags, waste, order, author, approval, tier, history or source column. `PriceBookItemRow.author` exists on the page's type and is always NULL (`lib/company/price-book.ts:9, 31`).

### D-41 · `price_book_sections` (`SCH:350-362`; `0028_round1_quotes.sql:1-9` → `0030:2` → `0037_price_book_section_filters.sql:1-2`)

`id` text PK · `name` NOT NULL · `description` · `lines_json` NOT NULL (`SavedSection`, D-45) · `created_at` NOT NULL · `updated_at` · `last_used_at` (stamped by each insert into a quote, `IA:404`) · `deleted_at` · `property_type` (one of the leads' `PROPERTY_TYPES`, else NULL — `PBA:87`) · `tags` (a JSON array, ≤ 8 words of ≤ 30 characters — `IM:167-172`). Writers: *Save section to My Items* (`IA:354-373` — the group, its lines and one level of sub-sections, and the quote's property type); the section editor (`PBA:78-93` — ≤ 200 lines, ≤ 50 sub-sections); create · rename · duplicate · delete · restore · delete forever · empty trash (`PBA:94-117`); R38 (`REP:918`). The lines inside carry **no** `priceBookItemId` and no `optional` (templates D-137): an inserted section's lines get `price_book_item_id NULL` (`IA:390`) while its **group** row gets the section's id (`IA:395`). Read by the editor (non-deleted, by name, `lib/quotes/editor.ts:89`) and `listPriceBookSections` — whose comment says "newest first" while it orders by name (`IA:410-413`).

### D-42 · The `quote_items` columns that point at the price book (`SCH:469-514`)

| Column | What the book puts there | Written by | Notes |
|---|---|---|---|
| `price_book_item_id` text, no FK (`0015:38`) | the item's id on an item row — **or the section's id** on the group an inserted section creates | the pick (`IA:147`); *Save to Your Library* (`IA:340`); the section insert (`IA:395`); undo (`IA:439`); *Duplicate* and a restored version copy it (`IA:243-250`; `app/quotes/actions.ts:241`); R23 (`REP:571`) | one column for two tables; *On n quotes* counts both through it (`lib/company/price-book.ts:20-23, 31-32`); *Delete forever* leaves it dangling |
| `name` · `description` · `icon` · `thumb` · `thumb_count` · `unit` | copied at the pick | `IA:139-143` | `icon` ← the item's kind |
| `cost_minor` · `markup_minor` | copied; the markup moved onto the studio's rounding step | `IA:144` (a paste `:173`, a section `:389`) | `roundToStep` (`ST:163-168`) |
| `gst_pct` | the studio's rate — the book has none | `IA:144, 174` (REG-645) | |
| `category` | the caller's, else the item's | `IA:145` | |
| `vendor` (`0038_quote_item_vendor_link.sql:1`) | the item's | `IA:146`; R46 (`REP:1094-1102`) | never printed |
| `rebate_minor` (`0029:18`) | — | the grid, Owners only (REG-596) | no 1.0 counterpart |
| `link` (`0038:2`) | — (the book has no link) | the grid, a paste | |

The rest of the line: QE D-51.

### D-43 · Settings keys that touch pricing

| Key | Shape | Missing = | Written by (gate) | Read by |
|---|---|---|---|---|
| `quote_rules.roundStep` | `0 · 1 · 5 · 10` S$ (`ST:147-168`) | 0 | `setQuoteRules` (Owner/Admin, `app/settings/actions.ts:114-133`) | a pick, a paste, a section insert and a grid edit land on the step (`IA:144, 173, 389`). **The book's own prices are never rounded.** |
| `trades` | `string[]` ≤ 60 (`ST:129-133`) | the categories on quote lines (`lib/settings/queries.ts:56-61`) — **not** the book's | `setTrades` (`actions.ts:69-84`) | the Category column |
| `trade_notes` | `Record<lower-cased trade, ≤ 600 chars>` | `{}` | `setTradeNote` (`actions.ts:97-112`) | a section's printed note |
| `studio.gstPct` · `studio.gstRegistered` | 0–30, one decimal · boolean (`ST:45-57`) | 9 · true | `setStudioGst` (`actions.ts:135-146`) | a new line's GST (`IA:144, 174`) |
| — (`renameTrade`) | | | `actions.ts:261-275` | renames `quote_items.category` **and** `price_book_items.category` by exact name (`:267-268`) |

`local.db` and the baseline hold none of the first three keys, and `studio` = `{"name":"Demo Studio Pte Ltd","gstRegistered":true,"phone":"6222 0188"}` (no `gstPct`).

### D-44 · Checks in 2.0's writers

None of the 17 actions in `PBA` checks a role (accounts D-44); neither do *Save to Your Library*, *Save section to My Items*, the section insert or the pick (`IA:112, 334, 354, 375`); the page has no read-only mode (`app/company/price-book/page.tsx:10-13`). accounts Q-07 left the gate to this audit. The server's bounds: the lengths above, cost ≥ 0, markup ≥ −cost, an import ≤ 500 rows (`PBA:61`), a section ≤ 200 lines and 50 sub-sections, a property type from the list, ≤ 8 tags.

### D-45 · 2.0 JSON shapes

- **`SavedSection` / `SavedLine`** (`IM:165-166`, parsed by `IM:174-190`): `{name, description, descriptionHtml, lines: SavedLine[], subs: [{name, description, descriptionHtml, lines}]}`; a line = `{name, description, descriptionHtml, qty, unit, costMinor, markupMinor, discountPct, gstPct, room, category, section, printAs, printAsText, highlight, icon, vendor?, link?}` — cents; no item link, no optional flag, no photo.
- **`tags`** — a JSON array of words (`IM:167-172`).
- **The spreadsheet import's mapping** (`lib/quotes/clipboard.ts:44-75, 125-167`, shared with the quote's paste; `PasteItemsDialog target="book"`): fields Item · Description · Qty · Unit · Cost · Markup · Unit Price · Discount · GST · Room · Category · Section · Vendor/Sub · Website Link. Header guesses: *rate* → **cost** (`:56`); *margin* → **markup** (`:57`); a markup written "20%" is that share of the cost (`:146, 161`), a plain number an amount (`:146`); a lone Unit Price becomes the **cost with no markup** (`:157-158`); markup never below −cost (`:162`). The book keeps name, description, unit, cost, markup, category and vendor (`PBA:59-68`).
- **Export My Items** (REG-627): Item · Kind · Description · Unit · Cost · Markup · Unit price · Category · Vendor · Used by, live rows only (`components/company/price-book/price-book-items.tsx:43-48`).

### D-46 · What 2.0 derives

| Value | Rule | Where |
|---|---|---|
| Unit price | cost + markup | `lib/quotes/math.ts:40` |
| Markup % | markup / cost × 100, 0 when cost is 0 | `lib/quotes/math.ts:41` |
| *On n quotes* | distinct quotes whose lines name the id — items and sections mixed | `lib/company/price-book.ts:20-23, 31-32` |
| Vendor chips | the names on live items | `lib/company/price-book.ts:33` |
| A section's lines and total | `savedSectionCount`; qty × (cost + markup) × (1 − discount) | `IM:192`; `components/company/price-book/section-dialog.tsx:18-19` |
| A typed unit price in the section editor | split into cost and markup at the markup's current share of the price; a new blank line is all cost, at a fixed 9 % GST | `section-dialog.tsx:16, 42` |
| *Below cost* on a line | total after discount < qty × cost | `lib/quotes/math.ts:61-65` |
| A category's margin | (total − true cost) / total | `lib/quotes/math.ts:161-176` |
| The Create Quote window's "n-item price book" | `count(*)` of `price_book_items` — **deleted rows included** | `lib/leads/quotes.ts:36`; `lib/quotes/list.ts:42` |

### D-47 · Seeds, repair rules and the baseline

- **R23** (`REP:483-509`): eight items with deterministic ids (`sid(name, 'price_book_item')`), `INSERT OR IGNORE`, dollars × 100, created 90 days and updated 30 days before the run; the demo quotes' lines link to them (`REP:571`).
- **R29** (`REP:686-705`): lengthens five descriptions in `price_book_items` **and** `quote_items`, matching by name and old text.
- **R38** (`REP:899-923`): `vendor = 'Floor Xpert'` on the vinyl (by name); two entries for the same tile — `pb-tiles-hafary` (cost 85000, markup 25000) and `pb-tiles-sbh` (82000, 28000); one section, `pbs-bathrooms-full-works`, built from OM-10008's *Bathrooms* group (4 lines, no sub-sections).
- **R46** (`REP:1094-1102`): lines picked from My Items take the item's vendor.
- **Checks:** a picked line without its item's vendor (`REP:1310`); a section whose `lines_json` does not parse (`:1315`); an item with an empty name (`:1316`).
- **Baseline** (`fixtures/baseline.json`, `takenAt` 2026-09-25T01:35:54.821Z; `BASELINE_TABLES` `lib/db/baseline.ts:17`): `price_book_items` 10 (none deleted, no photo, three with a vendor), `price_book_sections` 1, `quote_items` 158 of which 56 link to R23's eight items (no dangling link; none priced differently from its item), `settings` 5 keys, none of them pricing. `local.db` holds the same rows (read with `sqlite3 -readonly`).

### D-48 · Findings in 2.0's data

1. **One column, two targets.** `quote_items.price_book_item_id` names an item on an item row and a section on a group row (`IA:147, 395`); nothing tells them apart but the row's kind, and nothing keeps either valid (no FK; *Delete forever*, `PBA:72-73, 107-108`).
2. **No "cost unknown".** `cost_minor` defaults to 0; a price without a cost is stored as a cost with no markup by the import (D-45) — the margin then reads 0 %, not "unknown".
3. **The category is free text** (`item-dialog.tsx:49`). In the demo, the tiles' *Tiling* is on no quote line, so the derived trades (Carpentry · Ceiling · Design · Electrical · Fittings · Flooring · Hacking · Logistics · Masonry · Painting · Plumbing) do not include it (`local.db`).
4. **`updated_at` means "edited or picked"** (`IA:149`).
5. **The price-book count includes deleted items** (D-46).
6. **Nothing on the page sets a photo** (D-40 `thumb`).
7. **The demo tiles cost S$850 and sell for S$1,100 per sqft** (`REP:906` — 85000 and 25000 minor), where R23's bathroom tiles cost S$9 and sell for S$12 (`REP:519`); REG-594 records the popover reading "S$1,100.00 / sqft · by Hafary" (`design-source/REGISTER.md:596`). It reads as a units slip in the repair rule, not a choice.
8. **Saved sections forget their items** — no `priceBookItemId` or `optional` in `SavedLine` (templates D-137).
9. **No gate** (D-44).

---

## 5. The diff

### 5.1 Store map

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-60 | `studio_price_book` (D-02) | `price_book_items` (D-40) | **rename + split** | narrower (§5.2 A); one row per vendor (`SCH:456`; QE D-108) |
| D-61 | `price_book_pricing_tiers` (D-05) | — | **held** (QE Q-19) | D-170 |
| D-62 | `price_book_history` (D-06) | — | **held** (QE Q-21) | D-171 |
| D-63 | the approval columns, the `PriceBookItemApproval` tasks, `workflow.approvers.priceBookApproval`, the three approval events (D-07) | — | **held** (QE Q-20) | D-172; 2.0's own approval records: quotes (REG-624) and templates (REG-501) |
| D-64 | `price_book_suggestions` (D-08) | — (*Save to Your Library*, `IA:334-346`, is the manual way in) | **Platform / AI** | QE D-219 |
| D-65 | `vendors` (D-09) | `price_book_items.vendor` · `quote_items.vendor` (text) | **merge** (the name only) | the directory is Finance's (QE D-109, QE D-221) |
| D-66 | `vendors.default_markup_percent` | — | **write-only** as far as the book goes (a suggestion in one dialog) | D-203 |
| D-67 | `studio_quote_categories` (D-10) | `settings.trades` + `trade_notes`; `price_book_items.category` (text) | **merge** | map 04:27; accounts D-215; accounts E-102 |
| D-68 | `studio_quote_categories.subcategories` + `studio_price_book.subcategory` (D-11) | — (sub-sections and the `room` / `section` labels live on quote lines) | **missing in 2.0** | D-187 |
| D-69 | `studio_assemblies` (D-12) | `price_book_sections` (D-41) | **rename** | templates D-58 · templates D-165; the item links need templates D-137 |
| D-70 | `quote_generation_rules.line_items[].price_book_id` | — | **held** (templates Q-07) | |
| D-71 | `quote_packages.items[]` | — | **Later** | QE D-212 |
| D-72 | the line's price-book columns (D-13) | `quote_items.price_book_item_id` · `vendor` · `cost_minor` · `markup_minor` | **merge** (lossy) | D-122…D-128 |
| D-73 | `platform_market_rates` · `crowd_rate_signals` · `embedding` + `match_price_book_items()` · the drift cron (D-15) | — | **Platform** | QE D-25, QE D-219 |
| D-74 | bucket `price-book-images` | a picture string in `price_book_items.thumb` | **Platform** (the objects themselves; D-221) | |
| D-75 | `features.price_book_subcategory_in_quote` · `workflow.approvers.priceBookApproval` · `catalogue_files` (D-16) | — | **missing** · **held** (D-63) · **dead** | |
| D-76 | `pricebook.view · edit` (D-16) | no gate (D-44) | **missing** | the owner's call (accounts Q-07); D-172 |
| D-77 | notification preferences `pricing` + the four events (D-26) | — (2.0's `notification_rules` has no price-book event) | **missing** — held with D-63; the drift alert goes with D-73 | |
| D-78 | the imports (D-23) and the export (D-24) | *Import from a spreadsheet…* (D-45) · *Export My Items…* (REG-627) | **merge** | W10 · W11 are dead (D-04); the AI parse of a vendor document has no 2.0 counterpart on the book (2.0's *Upload a quote* reads a quote, REG-627) |

### 5.2 Column-level diffs

**A · `studio_price_book` → `price_book_items`** (extends QE D-108)

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-80 | `id` | `id` | **same** | the first vendor's row keeps the uuid; every other vendor's row gets a derived id (D-150) |
| D-81 | `studio_id` | — | **dead** | one studio |
| D-82 | `name` · `description` | `name` (NOT NULL, ≤ 200) · `description` (≤ 2000) | **same** (reshaped) | `name` = the name, else the description's first line; the description kept when it adds to the name (QE D-108) |
| D-83 | `item_id` (the SKU, unique per studio) | — | **missing in 2.0** | D-180 |
| D-84 | `category_id` | `category` (text ≤ 60) | **rename** (id → name) | the joined name, inactive categories included (D-10) |
| D-85 | `subcategory` (off-HEAD) | — | **missing in 2.0** | D-187 |
| D-86 | `unit_price` (the sell, dollars) | — (derived: `cost_minor + markup_minor`) | **split** | D-152 |
| D-87 | `cost_price` (dollars; NULL = unknown or zero) | `cost_minor` (cents, NOT NULL 0) | **same** (units) | D-152, D-153 |
| D-88 | `markup_percent` | `markup_minor` (an amount) | **superseded** | derived from the two prices, never copied (D-154) |
| D-89 | `market_rate_min` · `market_rate_max` | — | **dead** | no writer |
| D-90 | `unit` (free, nullable) | `unit` (NOT NULL `'Pieces'`, ≤ 40) | **same** | D-145 |
| D-91 | `source` | — | **missing in 2.0** | D-188 |
| D-92 | `external_ref` | — | **dead** | |
| D-93 | `is_active` | `deleted_at` | **rename** (flag → time) | D-141, D-156 |
| D-94 | `tags` | — (sections have tags) | **missing in 2.0** | D-183 |
| D-95 | `notes` | — | **missing in 2.0** | D-181 |
| D-96 | `image_url` (a public URL) | `thumb` (a path or URL string) | **rename** | D-221 |
| D-97 | `spec_url` | — (lines have `link`) | **missing in 2.0** | D-182 |
| D-98 | `cost_type` | `kind` | **rename** (lossy) | D-140 |
| D-99 | `waste_percent` | — | **missing in 2.0** | D-184 |
| D-100 | `vendor_id` · `vendor_ids[]` | `vendor` (a name ≤ 80) | **split** | one row per vendor (D-158) |
| D-101 | `created_by` | — (`author` is always NULL) | **missing in 2.0** | D-186 |
| D-102 | `order_index` | — (sorted by name) | **missing in 2.0** | D-185 |
| D-103 | `approval_status` · `approved_by` · `approved_at` | — | **held** | D-141, D-172 |
| D-104 | `approver_user_id` | — | **dead** | |
| D-105 | `embedding` | — | **Platform** | |
| D-106 | `created_at` · `updated_at` | the same, in seconds | **same** | 2.0's `updated_at` also moves on a pick (D-48 #4) |
| D-107 | — | `kind` | **2.0 only** | from `cost_type` (D-140) |
| D-108 | — | `deleted_at` | **2.0 only** | from `is_active` and `rejected` (D-141) |

**B · The children**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-110 | tiers: `min_qty · max_qty · unit_price · cost_price · created_at` | — | **held** | D-170 |
| D-111 | history: every column (D-06) | — | **held** | D-171 |
| D-112 | `tasks` of type `PriceBookItemApproval`: `assignee_user_id · approval_status · approval_comment · related_entity_id` | — | **held** / **superseded** | 2.0 has no approval tasks (D-172) |
| D-113 | suggestions: every column (D-08) | — | **Platform** | |

**C · Vendors**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-114 | `vendors.name` | `price_book_items.vendor` | **merge** | trimmed, ≤ 80; 1.0's duplicate names (case, spacing) stay distinct in 2.0 unless the port folds them (D-217) |
| D-115 | `company_name · phone · email · trade · bank_* · notes · is_active · kind · default_markup_percent` | — | **Later** (Finance) | QE D-109 |

**D · Categories**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-116 | the category's `name`, through `category_id` | `price_book_items.category` | **rename** | D-84 |
| D-117 | `order_index · description · subcategories · is_active` | `settings.trades` (order) · `trade_notes` · — · — | per map 04:27 | the book keeps the name only |

**E · Packages and rules**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-118 | `AssemblyItem.priceBookItemId` | — (`SavedLine`) | **missing in 2.0** | templates D-137 |
| D-119 | `AssemblyItem.vendorId · vendorIds` | `SavedLine.vendor` (a name) | **merge** | the first vendor's name |
| D-120 | `AssemblyItem.unitPrice · costPrice · marginPercent` (dollars, %) | `SavedLine.costMinor · markupMinor` | **rename** (units) | per line as D-152; `marginPercent` not trusted (D-154) |
| D-121 | `quote_generation_rules.line_items[].price_book_id · default_unit_price_cents · default_margin_bps` | — | **held** | |

**F · Quote lines** (complements QE D-103)

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-122 | `price_book_item_id` | `price_book_item_id` | **same** (re-pointed) | through the id map, vendor-aware (D-223) |
| D-123 | `vendor_id` | `vendor` (a name) | **merge** | QE D-103; it also decides which vendor row the line links to |
| D-124 | `price_snapshot_at` | — | **missing in 2.0** | not ported |
| D-125 | `unit_price` · `cost_price` · `margin_percent` | `cost_minor` · `markup_minor` | **rename** | QE D-103 |
| D-126 | `waste_percent` · `cost_type` | — · `icon` | **missing** · **lossy** | QE D-103, QE D-193 |
| D-127 | `item_id` · `spec_url` · `notes` | — · `link` · — | **missing** · **rename** · **missing** | QE D-103, QE D-198 |
| D-128 | `source` (`price_book`, `market_rate` …) | — | not ported | QE D-170 |

**G · Settings**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-129 | `features.price_book_subcategory_in_quote` | — | **missing in 2.0** | D-187 |
| D-130 | `workflow.approvers.priceBookApproval` | — | **held** | D-172 |
| D-131 | `studio_roles.permissions.actions.pricebook` | — | **missing in 2.0** | the owner's call; D-172 |
| D-132 | `notification_preferences` category `pricing` | — | **missing in 2.0** | |
| D-133 | — | `quote_rules.roundStep` | **2.0 only** | 1.0 rounds a quote on demand (`src/lib/quote-round-off.ts:1-24`: steps 1 · 5 · 10 · 50 · 100, the sell moves, the cost holds) — never a studio rule, never the book |
| D-134 | `studios.country_code` · `settings.taxRate` · an entity's `tax_rate` | `studio.gstPct` | — | neither product puts tax on a price-book item (D-157) |
| D-135 | — | `price_book_sections.property_type · tags`; `quote_items.rebate_minor` | **2.0 only** | the sections' from the packages' `property_type` and `tags` (templates D-165) |

### 5.3 Enums

**D-140 · `cost_type` → `kind`** (QE D-108)

| 1.0 `cost_type` | 2.0 `kind` | Note |
|---|---|---|
| `material` | `purchase` | |
| `labor` | `labour` | |
| `subcontractor` | `labour` | |
| `combined` (the default and every seed row) | `purchase` | a naming choice: an item filed under a design trade (the seeds' *Preliminaries* rows tagged `design`, a *Design* category) could take `design` — an inference for the owner, logged |
| — | `design` · `fee` · `delivery` | no 1.0 source |

**D-141 · `is_active` × `approval_status` → 2.0**

| 1.0 | 2.0 | Note |
|---|---|---|
| active · `approved` | live | |
| active · `pending` | live — or `pending` under D-172 | 1.0 let a pending item be used (D-07) |
| active · `rejected` (restored by an archive toggle) | live, logged | D-07 |
| archived · any | `deleted_at` = the row's `updated_at` | restorable in 2.0 |
| rejected | `deleted_at` | QE D-108; the rejection note (on the task) goes to the log |
| hard-deleted | — | gone in 1.0; lines that named it → D-223 |

**D-142 · `source`** — `manual` · `csv_import` · `ai_parse` · `market_seed` · `platform-default` · `flo-seed` (D-02 #13), and `ai-extract-elarte` in El Arte's off-repo onboarding design (`docs/superpowers/specs/2026-05-27-elarte-pricebook-onboarding-design.md:205`). No 2.0 column; the port log counts rows per source (D-188). The three seed sources are the platform's catalogue, not the studio's own prices — they port like any row, and the log names them.

**D-143 · `change_type`** — `create` (never written) · `update` · `archive` · `restore` → none (D-171).

**D-144 · `vendors.kind`** — `supplier` · `brand` · `both` (where `312` is applied) → none; every vendor on an item lands as a name.

**D-145 · Units** — 1.0 free text (the seeds use `LS 10 · lot 20 · nos 55 · run 1 · sqft 45 · ft 54 · set 4 · pt 3 · m 1 · wall 1 · roll 1` of 195, `scripts/seed/catalogue-sg-default.mjs`; the AI parse canonicalises to `sqm · sqft · rft · rm · pcs · ft · m · lot · set · hr · day · kg · l`, `src/lib/price-book-parser.ts:19-80`) → 2.0's `UNITS` where the meaning is the same, else as typed:

| 1.0 | 2.0 |
|---|---|
| `pcs` · `pc` · `piece(s)` · `nos` · `no` · `unit(s)` | `Pieces` |
| `lot` · `LS` | `Lot` |
| `sqft` · `sq ft` · `ft2` | `sqft` |
| `ft` · `rft` · `run` · `running foot` | `ft run` (the seeds price carpentry by `ft`; a naming choice) |
| `set` · `sets` | `set` |
| `hr` · `hour(s)` | `hour` |
| `pt` · `point` | `point` |
| `sqm` · `m` · `rm` · `day` · `kg` · `l` · `wall` · `roll` · anything else | as typed (≤ 40) — 2.0 shows it as an extra option |
| NULL | `Pieces` (2.0's default, `SCH:451`) — or `Lot`; a naming choice, logged |

**D-146 · Suggestions** — `source_event`, `match_tier`, `status` → none (Platform).

**D-147 · Approval tasks** — `approval_status pending · approved · rejected`, `status NotStarted · Completed` → none.

**D-148 · 2.0 enums with no 1.0 source** — `kind` `design · fee · delivery`; the sections' `property_type` (the leads' list) where a package had none.

### 5.4 Units and semantics

| Id | Concept | 1.0 | 2.0 | Mapping |
|---|---|---|---|---|
| D-150 | Ids | uuid; `*_by` = `profiles.id` | text; `members.id` | the first vendor's row keeps the uuid string; the k-th vendor's row gets a deterministic id derived from `(item id, vendor id)` so a re-run is `INSERT OR IGNORE`; people through accounts D-212's `profiles.id → members.id` map |
| D-151 | Time | timestamptz | unix seconds | `Date.parse(ts) / 1000` |
| D-152 | The price model | the **sell** (`unit_price`, dollars, unscaled) + a nullable cost + a stored percent | **cost + markup amount** (cents); the sell derived | with a sell S and a cost C: `cost_minor = round(C × 100)`, `markup_minor = round(S × 100) − cost_minor` (≥ −cost always holds). Missing figures: D-153 |
| D-153 | A missing or zero figure (D-32) | NULL = unknown or zero; 0 = unpriced or free | no NULL | **sell, no cost** — (a) 2.0's own rule: the cost is the sell, no markup (`lib/quotes/clipboard.ts:157-158`) — the price stays, the margin reads 0 %; (b) QE D-108's: cost = sell / (1 + markup / 100), else 0 — trusts a percent whose meaning varies (D-31), and a 0 cost shows a 100 % margin, which 1.0 refused to fabricate (`src/lib/leads/map-package-items.ts:3-8`); (c) build D-189. **Cost, no sell** (the AI's rate cards): keep 1.0's S$0 sell (`markup = −cost`) so no price is invented, or sell at cost. **Neither**: 0 / 0. Every such row is listed in the port log; the choice is the owner's |
| D-154 | `markup_percent` | stored, meaning varies by writer (D-31) | derived | never copied; the log lists rows whose stored percent matches neither markup nor margin of their prices by more than half a point |
| D-155 | Precision | `unit_price` unscaled (sub-cent values possible) | integer cents | round half away from zero, once per figure; the log counts rounded rows |
| D-156 | Archive and delete | `is_active` false (archive, reversible; a rejection too); hard delete (W7) | `deleted_at` (soft) + *Delete forever* | `deleted_at` = the row's `updated_at` (W2 stamps it on an archive) |
| D-157 | Tax, currency, region | no GST on the item (the parse reads GST wording and stores nothing, `CSVD:464-468`); a line adds GST unless `tax_inclusive` (QE D-166); `country_code` per studio | pre-GST cost + markup; the line's GST from `studio.gstPct`; S$ only | port SG studios only (accounts D-211); `anchor` (MY) stops. A studio whose book was typed GST-inclusive would be charged GST twice — the owner's call per studio, logged |
| D-158 | One item, several vendors | one price for all its vendors (`vendor_ids[]`, D-09) | one row per vendor, each with its own price (`SCH:456`) | n rows with the same price; edits diverge afterwards |
| D-159 | The category | an id that stays on a deactivated row after a rename | a name; `renameTrade` carries it (`app/settings/actions.ts:261-275`) | the joined name (D-84); names outside `settings.trades` listed (accounts E-102) |
| D-160 | Percent fields on the item | `markup_percent`, `waste_percent` | none | D-154, D-184 |
| D-161 | Lengths | none | name 200 · description 2000 · unit 40 · category 60 · vendor 80 (`PBA:18-26`) | truncate and log |
| D-162 | Order | `order_index`, then newest first (`PB:70-71`) | by name | not kept unless D-185 |
| D-163 | `updated_at` | the last write through W2 · W4 · W5 · W6 · W8 · W12 (not W3, not the tiers) | the last edit **or pick** | copied from 1.0 |
| D-164 | Volume | Dyel 1,609 rows and 37 packages (`scripts/cleanup/002_dyel_purge_test_demo_data.sql:14-16`); El Arte 6.3k+ (`PBM:178`); 195 platform-default rows in each seeded SG studio | the demo's 10 | a direct port has no row cap (the import's 500 is per call, `PBA:61`); the gallery and the editor load the whole table (`lib/company/price-book.ts:25-38`; `lib/quotes/editor.ts:80`) — unverified at thousands |
| D-165 | Soft references | lines, packages, rules and tasks name items with no FK; a hard delete strands them | lines name items or sections with no FK | a 1.0 link to a missing item lands NULL and is logged (D-223) |

---

## 6. Port plan

A port is a one-shot import of one 1.0 studio's price book into 2.0. It runs after the Accounts Setup port (members and trades) and before the Templates port's packages (templates D-165) and the Quotes port (map 06), both of which need its id map. Ids keep the 1.0 uuid strings where one row maps to one row, so a re-run is `INSERT OR IGNORE`; times are `Date.parse(ts) / 1000`; every `*_by` becomes a `members.id` (accounts D-212). Nothing below is built until the owner marks it — tiers, approval and history are on *Hold* (QE Q-19…Q-21).

### 6.A New 2.0 tables

None is required. Each row names what would need one and the alternative that needs none.

| Id | 1.0 store | Why 2.0 would need it | Shape | Alternative |
|---|---|---|---|---|
| D-170 | `price_book_pricing_tiers` (D-05) | only if the studio keeps volume prices (Q-19) | `price_book_tiers (id text PK, item_id → price_book_items CASCADE, min_qty real NOT NULL, max_qty real NULL, cost_minor, markup_minor, created_at)` + the tier rule applied **on the server** when a linked line's quantity changes (1.0 applied it in the browser only, D-30) | QE D-181's: one entry per band with the range in its name; or drop the bands and list them in the log |
| D-171 | `price_book_history` (D-06) | only with an item history (Q-21) | `price_book_history (id, item_id, changed_by members.id, kind edit · archive · restore · delete, changes_json {field: {old, new}} holding real changes only, cost_before · cost_after · markup_before · markup_after (cents), created_at)`; the port can carry only the price figures reliably (D-20) | port nothing; the log counts each item's rows |
| D-172 | the approval columns, tasks and approver list (D-07) | only with item approval (Q-20) | **columns, not a table**: `price_book_items.status 'live' · 'pending'`, `submitted_by`, `submitted_at`, `reviewed_by`, `reviewed_at`, `review_note` — the record 2.0 keeps on quotes (`SCH:313-318`, REG-624) and templates (`SCH:547-550`, REG-501) — plus a role check on `PBA`'s 17 actions | pending → live, rejected → deleted, the notes to the log; a gate without approval (Owners and Admins write, everyone reads) answers accounts Q-07 on its own |
| D-173 | `vendors` (D-09) | only with a vendor directory | `vendors (id, name, …)` + `price_book_items.vendor_id` | **not needed**: names; the directory belongs to Finance (QE D-221) |
| D-174 | `price_book_suggestions` (D-08) | — | — | **not needed**: the matcher's queue (Platform / AI) |
| D-175 | — (1.0 keeps no import log, D-14) | only if 2.0 shows import history | `price_book_imports (id, at, by, file, rows, vendor)` | **not needed** |

### 6.B Columns and JSON fields to add to existing 2.0 stores

| Id | 2.0 store | 1.0 source | Field | Type | Note — and the alternative |
|---|---|---|---|---|---|
| D-180 | `price_book_items` | `item_id` | `sku` | text, unique when set | keeps `PB-NNN` and the studio's own codes; a new item then needs the generator (D-30). Alternative: drop and count |
| D-181 | `price_book_items` | `notes` | `notes` | text | alternative: append to the description after a blank line, logged |
| D-182 | `price_book_items` | `spec_url` | `link` | text (http / https, `cleanLink`) | as `quote_items.link` (REG-623), so a pick copies it onto the line. Alternative: drop |
| D-183 | `price_book_items` | `tags` | `tags` | JSON array | as the sections' (`IM:167-172`). Alternative: drop |
| D-184 | `price_book_items` | `waste_percent` | `waste_pct` | real | only with QE D-193 on lines. Alternative: list the items with waste > 0 — a line priced from them in 1.0 billed the waste |
| D-185 | `price_book_items` | `order_index` | `position` | integer | only to keep 1.0's hand order. Alternative: by name |
| D-186 | `price_book_items` | `created_by` | `created_by` | text (`members.id`) | fills the page's `author`, always NULL today (D-40). Alternative: NULL |
| D-187 | `price_book_items` | `subcategory` (+ D-129's flag) | `room` | text | only where the studio used sub-categories as rooms (flag off); with the flag on the sub-category was a sub-section, which a book item cannot hold. Alternative: drop, logged |
| D-188 | `price_book_items` | `source` | `source` | text | alternative: the log only (D-142) |
| D-189 | `price_book_items` | `cost_price IS NULL` | `cost_known` boolean, or a nullable `cost_minor` | | keeps "no cost on file" apart from a real zero. Alternative: D-153's rule |
| D-190 | `price_book_sections.lines_json` | `AssemblyItem.priceBookItemId` · `isOptional` | `SavedLine.priceBookItemId` · `optional` | JSON | templates D-137: a package's lines keep their items through D-219's map |
| D-191 | `quote_items` | — | `price_book_section_id` | text | separates a group's section from an item's link (D-48 #1). Alternative: keep the one column — the ids never collide |
| D-192 | `price_book_items` | — (1.0 stamps no deleter) | `deleted_by` | text | only for the Deleted sheet's "Deleted by" (as templates, REG-538); the port writes NULL |

### 6.C Not ported

| Id | 1.0 table · column · rows | Reason |
|---|---|---|
| D-200 | `embedding`; `match_price_book_items()` | **Platform** (AI) |
| D-201 | `market_rate_min` · `market_rate_max` · `external_ref` · `approver_user_id` | **dead** — no writer (D-02) |
| D-202 | `price_book_suggestions` | the matcher's queue — **Platform / AI** |
| D-203 | `vendors` beyond the name; `default_markup_percent`; `kind`; the merge notes | **Later** (Finance, QE D-221) |
| D-204 | `platform_market_rates`; `crowd_rate_signals`; the drift alerts | **Platform** |
| D-205 | `tasks` of type `PriceBookItemApproval`; the notification rows; `notification_preferences` `pricing` | superseded / delivery records (QE D-222) |
| D-206 | `price_book_history` unless D-171 | **held** (Q-21); the log counts rows per item |
| D-207 | tiers unless D-170 | **held** (Q-19); the log lists each item's bands |
| D-208 | the approval trail unless D-172 | **held** (Q-20); the log lists pending and rejected items with their notes |
| D-209 | `markup_percent` | derived (D-154) |
| D-210 | `order_index` · `tags` · `notes` · `spec_url` · `waste_percent` · `source` · the SKU · `subcategory` · `created_by`, each unless its 6.B row is built | **missing**; counted in the log |
| D-211 | `quote_generation_rules` links; `quote_packages` | **held** / **Later** |
| D-212 | `settings.catalogue_files`; `features.price_book_subcategory_in_quote` unless D-187; `workflow.approvers.priceBookApproval` unless D-172 | **dead** / **missing** / **held** |
| D-213 | items hard-deleted in 1.0 | nothing to port; the lines, packages and rules that still name them are counted (D-223) |

### 6.D The order a studio's price book lands

| Id | Step | Rows written | Rules |
|---|---|---|---|
| D-215 | Before | — | the Accounts Setup port has landed: members and the `profiles.id → members.id` map (accounts D-212), the trades from `studio_quote_categories` (map 04:27; accounts D-215) |
| D-216 | Classify and probe | — | one fork at a time; `country_code = 'SG'`, else stop (D-157). Read the fork's `information_schema` for `studio_price_book.subcategory` (215), `vendors.kind` (312), Ace Design's cost column, the package RPC's lineage (`305:21-33`) and whether both migration sets are applied; count every store of §1 into the port log; list the × 100 suspects (D-237) |
| D-217 | Vendor names | — | `vendors.id → trim(name)` (≤ 80), inactive vendors included; names that differ only by case or spacing folded by the shared dedupe rule only if the owner wants it (`findDuplicateVendor`, `src/app/api/vendors/records/route.ts:183`), else kept and logged |
| D-218 | Category names | — | `category_id → name`, active or not (D-84); names outside `settings.trades` logged |
| D-219 | Items | `price_book_items` | one row per vendor in `vendor_ids` order (else `vendor_id`, else one row with no vendor); fields by §5.2 A, prices by D-152…D-155, units by D-145, kind by D-140, state by D-141; the id map `(1.0 id, vendor id or none) → 2.0 id` kept for D-222 and D-223 |
| D-220 | Optional stores | tiers · history · approval | only those of D-170…D-172 the owner builds, through the id map |
| D-221 | Photos | `thumb` | the prototype has no photo store (D-40): keep 1.0's public URL (the bucket is public, D-15) while 1.0's storage lives, or copy the objects once 2.0 has a store — the way map 04 copies 1.0's images into the kit (`../04-quote-templates-migration-map-2026-09-24.md:30-31`); a URL longer than 300 characters or a failed copy leaves `thumb` NULL, logged |
| D-222 | Sections | `price_book_sections` | the packages by templates D-165; with D-190 each line's `priceBookItemId` goes through the id map (the line's `vendorId` picks the row) |
| D-223 | Quote lines | `quote_items.price_book_item_id` | through map 06 / QE D-103: the 2.0 row whose vendor is the line's `vendor_id`, else the item's first row; a link to an item that no longer exists lands NULL and is logged; the line keeps its own copied prices — 1.0 lines are snapshots (`src/app/api/price-book/[id]/route.ts:12-16`) |
| D-224 | What is not written | port log | every row of 6.C with its count and reason |

### 6.E Checks after a port

| Id | Check | How |
|---|---|---|
| D-230 | Counts | 2.0 rows = Σ max(1, vendors) over the ported items; live = active and not rejected; deleted = archived or rejected |
| D-231 | Prices | every row with both figures: `cost_minor + markup_minor = round(unit_price × 100)`; every D-153 row listed |
| D-232 | Bounds | `cost_minor ≥ 0`, `markup_minor ≥ −cost_minor` (`PBA:25`) |
| D-233 | Links | every `quote_items.price_book_item_id` on an item row names a `price_book_items` row, on a group row a `price_book_sections` row; a picked line carries its item's vendor (`REP:1310`) |
| D-234 | Names and lengths | no empty name (`REP:1316`); every truncation of D-161 listed |
| D-235 | Categories | every `category` in `settings.trades`, else listed (accounts E-102) |
| D-236 | Units | every unit outside `UNITS` listed |
| D-237 | The × 100 rows | rows with `source 'csv_import'`, no name and no cost whose price sits two orders of magnitude above their category's median are shown to the owner before they land (D-18 #7) |
| D-238 | Repair rules | do not run `db:repair` on a ported studio as it stands: R23 inserts the demo's eight items by deterministic ids and writes lines into quotes that have none (`REP:483-509, 571`); R29 rewrites descriptions matched by name and text (`REP:686-705`); R38 writes `Floor Xpert` onto any item named "Vinyl flooring, supply and install" and adds the two tile rows (`REP:905-912`). The checks at `REP:1310, 1315, 1316` are safe |
| D-239 | The baseline | never run `npm run db:baseline` on a ported studio — it would become the demo's base (accounts D-234) |

### 6.F Demo data — 1.0 seeds vs 2.0 seeds and repairs

| Id | 1.0 seed (`path:lines`) | What it writes | 2.0 counterpart | Fit |
|---|---|---|---|---|
| D-240 | the platform-default catalogue (`scripts/seed/catalogue-sg-default.mjs:1-37`; `scripts/seed/seed-default-pricebook.mjs:1-26, 153-187`) | 16 categories and 195 items into each SG studio whose book is empty (`--all-empty-sg`), `source 'platform-default'`, cost from a margin, markup-of-cost | R23: eight items (`REP:490-506`) | 2.0's demo is a curated handful that backs the demo quotes (REG-343); a starter catalogue for new studios would be a product decision, not a port |
| D-241 | Flo's seed (`scripts/tenants/flo-design/seed-pricebook.mjs:1-30, 57-300, 330-368`) | the same 16 categories and 195 tuples, `source 'flo-seed'` | — | |
| D-242 | market rates (`sb:20260414000004`) | 111 rows over SG · MY · AE · IN | — | Platform |
| D-243 | vendors (`063:88-…`) | five Arthaus subcontractors with bank details | R38's names on three items | 2.0 keeps names only |
| D-244 | a package (`scripts/seed-arthaus-hdb-3room-assembly.sql:1-7`) | 36 items, no price-book links | R38's one section | |
| D-245 | real studios | Dyel's 1,609 rows and 37 packages, kept as real data by the purge (`scripts/cleanup/002_dyel_purge_test_demo_data.sql:14-16`); El Arte's 6.3k+ items (`PBM:178`) | — | the port's volume (D-164) |
| D-246 | — | — | what 2.0's demo does not exercise | no deleted item, no photo, no item without a cost, no section line linked to an item, no SKU · notes · spec link · tags · waste · tiers · history · approval. Whatever 6.A / 6.B builds needs its demo rows seeded by a repair rule with their trail (REG-343), then `db:baseline` |
| D-247 | — | — | R38's tiles (`REP:906`) | S$850 + S$250 per sqft against R23's bathroom tiles at S$9 + S$3 (`REP:519`) — 100 × too high (D-48 #7); the fix (850 / 250 and 820 / 280 minor) is the owner's call |
| D-248 | — | — | the book's categories *Hacking · Masonry · Flooring · Carpentry · Electrical · Plumbing · Painting · Design · Tiling* | *Tiling* is on no quote line, so the derived trades lack it (D-48 #3); a saved `settings.trades` in the demo would settle E-102 there |

## Uncertain / not verified

- **Row counts.** No 1.0 database was queried. How many items each studio holds, how many have no cost, a S$0 sell, tiers, history, a pending or rejected state, several vendors, a sub-category, a SKU, waste, or a × 100 price is unknown — beyond what the code's own comments record (Dyel 1,609 rows and 37 packages on 2026-09-04; El Arte 6.3k+; "0 of 97 real package items carried a link" on staging on 2026-09-11; 45 Dyel packages without a cost).
- **Each fork's schema.** Whether `215` (`subcategory`) is applied everywhere (`234` says it is a release migration; HEAD lacks the file); whether `312` / `313` are applied anywhere (the code said "nowhere yet"); whether every fork carries the `supabase/migrations/` price-book columns (Ace Design needed a tenant migration for `cost_price`, `scripts/fleet/expected-divergence.json:54-59`); which lineage each fork's package RPC is at (`305:21-33`). `159` also dedupes SKUs that `113`'s unique index should already have prevented (`113:18-20`; `159:1-19`) — so `113` was probably missing on some databases. D-216 probes these before a port.
- **Read from the code, not executed:** W1's and W2's fallback retries (D-18 #1, D-11) — they fire only on a database missing a column; the market-rates route failing after `264` (D-15) — `264` skips tables a fork lacks (`264:65-70`) and a later grant could undo it; the suggestion batch lost to one duplicate (D-08).
- **`markup_percent` eras.** Dated from the editor's comment (`PBE:353-357`) and commit `de4d797e4` (2026-09-16); the earlier conventions (the explicit calc toggle of `e7d0fe8a6`, 2026-05-20; the sell-anchored model of `1ba10edaa` and `5218c54a8`, 2026-08-11) were not reconstructed commit by commit, nor was the editor's zero-to-NULL behaviour (D-18 #10) checked in older versions.
- **El Arte's onboarding** (`docs/superpowers/specs/2026-05-27-elarte-pricebook-onboarding-design.md`): whether it ran — rows with `source 'ai-extract-elarte'`, `is_active false`, `approval_status 'pending'`, a `spec_url` into a `vendor-catalogue` bucket, `catalogue_files` entries — is unknown; its scripts are not in the repo.
- **"No writer" and "no caller"** for `market_rate_*`, `external_ref`, `approver_user_id`, `catalogue_files` and the two import routes are greps of `src/` and `scripts/` at this commit; an SQL console, an off-repo script or another branch could write or call them.
- **Photos.** Whether 2.0's screens render an external URL in `thumb` was not checked; the prototype only ever stores its own paths there (D-40, D-221).
- **The import's request count.** This reader found the Price Book tab's import sends one request with every row (`PBM:1208-1221` → `PB:213`); accounts C-33 describes "one POST per row" — for the A–C readers to settle.
- **2.0 at scale.** The gallery and the editor's popover with thousands of items were not measured (D-164).
- **2.0 is moving.** The working tree carries uncommitted rounds; line numbers are as read on 2026-09-25, and the baseline's `takenAt` is 2026-09-25T01:35:54Z.
- **The tiles** (D-247) are read as a slip from the values and REG-594's own words; the owner may have meant them.
- **Naming choices for the owner:** the `design` inference (D-140), `ft → ft run` and a NULL unit (D-145), the missing-figure rule (D-153), GST-inclusive books (D-157), folding vendor names (D-217), a sub-category as a room (D-187).
