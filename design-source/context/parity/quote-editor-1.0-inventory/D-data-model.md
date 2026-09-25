# OpenMaison 1.0 ↔ 2.0 — Quote editor inventory · Slice D: the data model

Sources: 1.0 `/Users/vicky/Documents/GitHub/qanvast-id-tool` at `67f42e469` — both migration sets (`supabase/migrations/`, 102 files; `scripts/migrations/`, 381 files), `src/types/database.ts`, `src/types/app.ts`, `src/lib/transformers.ts`, `docs/DATABASE_SCHEMA.md`, and the routes and libraries that read or write each table (cited per claim). 2.0 `/Users/vicky/Documents/GitHub/openmaison-prototype` working tree on `main` (HEAD `8733d6d` plus the uncommitted quote-template rounds: `drizzle/0037_price_book_section_filters.sql`, `QuoteRules.preparedBy`, `settings.trade_notes`, the wider `IssuingEntity`) — `lib/db/schema.ts`, `drizzle/0000…0037`, `lib/quotes/**`, `lib/settings/{types,queries}.ts`, `lib/company/price-book.ts`, `lib/leads/quote-filters.ts`, the server actions in `app/quotes/*.ts` and `app/leads/quotes-actions.ts`, `scripts/repair-demo-data.ts`, `scripts/seed-overview.ts`, `lib/db/baseline.ts` and `fixtures/baseline.json` (table list and row counts only). Builds on `../quote-templates-1.0-inventory/D-data-model.md` (cited **templates D-nn**) and `../leads-1.0-inventory/D-data-model.md` (cited **leads D §n**). Read 2026-09-24. Nothing in either repo was modified; no script, server or query was run; no `.env` was read. Git was used read-only once (`git show` of one commit, D-09).

## 0. Conventions

- **Effective 1.0 schema = the union of both migration sets**, cross-checked against `DbQuote` / `DbQuoteLineItem` (`src/types/database.ts`) and the transformers (templates D §0; leads D §0.1). For the quote tables the split is sharp: the quote-v2 columns and the `quote_versions` / `quote_packages` tables exist **only** in `supabase/migrations/` (`20260414000001…20260416000002`); the lifecycle, the numbering constraint, the foreign keys, the mirror triggers and every later column exist **only** in `scripts/migrations/`. The production set assumes the supabase-only columns — `103_quote_lifecycle_hardening.sql:32` inserts `lead_id, label, quote_type, is_primary`, which only `20260415000001_multi_quote_support.sql:9-12` creates.
- **`quote_line_items` has two creation paths** (D-02); the columns below are the union and say which path each comes from.
- **Ids · time · money** as templates D §0: 1.0 `uuid` keys, `timestamptz`, money as `NUMERIC(12,2)` **dollars** on lines, price book and signature totals, `BIGINT` **cents** on `quotes.*_cents`; 2.0 `text` keys, `integer` unix **seconds**, money as `integer` **cents** (`*_minor`), one studio, no `studio_id`, no RLS.
- **1.0 RLS end state** for every studio table in this slice is `226_lock_tenant_tables.sql` (FORCE RLS; a `scoped` policy on the JWT's `studio_id` claim, or parent-exists for child tables; `anon` revoked; `service_role` bypasses) unless the row says otherwise. Listed once per table, not discussed further.
- **Ids in this file.** D-01…D-25 = 1.0 tables and stores (§1); D-30…D-44 = 1.0 JSON shapes (§2); D-50…D-64 = 2.0 (§3); D-70…D-99 = table map (§4.1); D-100…D-112 = column diffs (§4.2); D-140…D-155 = status mapping (§4.3); D-160…D-179 = enums and units (§4.4); D-180…D-255 = port plan (§5).
- **Verdicts** (§4.1): *same* · *rename* · *merge* · *split* · *missing in 2.0* · *2.0 only* · *derived* (2.0 computes it; no column) · *Later* (a module outside Leads / Quotes / Templates) · *Platform* (Qanvast-side data, never a studio's) · *dead* (nothing reads or writes it any more).
- **Other citations.** *Q-nn* = the owner's answers in `../03-quote-templates-1.0-to-2.0-audit-2026-09-24.md` §9; *the map* and its rounds *R1…R3* = `../04-quote-templates-migration-map-2026-09-24.md`; *R21…R45* (with a `repair-demo-data.ts` line) = 2.0's repair rules; *REG-nnn* = `design-source/REGISTER.md`.

---

## 1. 1.0 — tables

### D-01 `quotes` — the quote container

**Purpose.** One row per quote. A lead can carry several (multi-quote since `20260415000001`), exactly one of them primary; a project can carry variation-order quotes. Lines, versions, packages, signature requests and the status log hang off it. The lead keeps a mirror of the primary quote's status (D-08).

**DDL history.**

| Migration | Set | Change |
|---|---|---|
| `006_projects.sql:97-112` ≡ `20240101000006_projects.sql:97-112` | both | CREATE: `id`, `project_id NOT NULL → projects CASCADE`, `studio_id NOT NULL → studios CASCADE`, `quote_number text UNIQUE NOT NULL`, `status quote_status NOT NULL DEFAULT 'draft'`, `subtotal · discount · tax · total integer NOT NULL DEFAULT 0`, `notes`, `valid_until date`, `created_by → profiles SET NULL`, `created_at`, `updated_at` |
| `001_enums.sql:63-65` ≡ `20240101000001` | both | `CREATE TYPE quote_status AS ENUM ('draft','sent','accepted','rejected','expired')` |
| `012_rls.sql:15,82-84` ≡ `20240101000013` | both | RLS on; `quotes_select / _insert / _update` on `studio_id IN get_my_studio_ids()` (no delete policy) |
| `092_rls_permissive_phase0.sql:57-59,119` | scripts | the three dropped; `phase0_allow_all` |
| `20260415000001_multi_quote_support.sql:5-24` | supabase | `project_id`, `quote_number` DROP NOT NULL; + `lead_id UUID` (no FK), `label TEXT DEFAULT 'Quote'`, `quote_type TEXT DEFAULT 'standard'`, `is_primary BOOLEAN DEFAULT false`, `total_cents · subtotal_cents · discount_cents · tax_cents BIGINT DEFAULT 0`, `payment_schedule JSONB DEFAULT '[]'`, `doc_sections JSONB DEFAULT '[]'`, `parsed_doc_metadata JSONB`, `rejection_comment TEXT`; indexes `idx_quotes_lead`, `idx_quotes_project`, `idx_quotes_studio` |
| `20260415000002_backfill_quotes.sql:5-27` | supabase | data: one primary `'Quote'` row per lead that had lines, lines claimed |
| `102_quote_status_enum_extend.sql:21-24` | scripts | enum + `submitted`, `approved`, `sent_for_signature`, `client_signed` ("the existing sent/accepted/expired stay untouched — they're just unused", `:10-13`) |
| `103_quote_lifecycle_hardening.sql` | scripts | data: quotes for orphan leads (`:32-44`), claim NULL-`quote_id` lines (`:50-55`), recompute `*_cents` from lines of type `amount · lump_sum` (`:61-75`), copy `leads.quote_status` onto the primary (`:82-93`); drop the global unique (`:100`); backfill NULL numbers `QT-### / VO-###` per studio by `created_at` (`:105-129`); `UNIQUE (studio_id, quote_number)` (`:134-138`); triggers `trg_sync_lead_to_primary_quote` on **leads** (`:145-167`), `trg_sync_primary_quote_to_lead` (`:169-189`), `trg_sync_on_primary_flag_change` (`:193-212`) |
| `104_quote_fk_and_notnull.sql:24-58` | scripts | the children's FKs to `quotes` (D-02, D-06) |
| `105_quote_single_primary_per_lead.sql:23-51` | scripts | partial unique `quotes_one_primary_per_lead (lead_id) WHERE is_primary AND lead_id IS NOT NULL`; RPC `set_primary_quote_atomic(p_lead_id, p_quote_id)` `SECURITY DEFINER`, granted to `anon, authenticated, service_role` |
| `106_fix_set_primary_rpc.sql:18-54` | scripts | the RPC rewritten as unset-then-set |
| `109_quote_preview_tokens.sql:6-13` | scripts | `preview_token TEXT`, `preview_token_created_at TIMESTAMPTZ`; unique partial index `quotes_preview_token_unique` |
| `158_quote_status_sync_trigger.sql:10-69` | scripts | `sync_lead_quote_status()` + `trg_sync_lead_quote_status_iud AFTER INSERT OR UPDATE OF status, is_primary, lead_id OR DELETE`; backfill of `leads.quote_status` |
| `187_quote_preview_view_count.sql:9-10` | scripts | `preview_view_count INTEGER NOT NULL DEFAULT 0` |
| `202` → `254` → `303` → `307` | scripts | `finalize_signed_mirror(p_lead_id, p_studio_id, p_quotes_to_mark)` v1…v5 — the signing mirror (D-06) |
| `213_quotes_is_omission.sql:14-15` | scripts | `is_omission BOOLEAN NOT NULL DEFAULT FALSE` |
| `226_lock_tenant_tables.sql:41` | scripts | `scoped` policy (A1 list) |
| `269_quotes_signature_columns.sql:5-6` | scripts | `submitted_by UUID NULL`, `prepared_by_signature JSONB NULL` |
| `304_quote_status_mirror_clears_on_last_delete.sql:37-87` | scripts | `sync_lead_quote_status` v2: deleting a lead's last primary sets `leads.quote_status = NULL` |
| `307_finance_contract_freeze.sql:16-44, 146-172` | scripts | `signed_at TIMESTAMPTZ` + backfill from signed requests; trigger `trg_quote_totals_frozen BEFORE UPDATE OF total_cents, subtotal_cents, tax_cents, discount_cents` raising `QUOTE_TOTAL_FROZEN` on a `client_signed` / `sent_for_signature` quote or an `approved` variation (bypass: GUC `finance.allow_signed_total_write = on`) |

**Columns** (effective):

| Column | Type | Null | Default | FK / check | From | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK | 006 | |
| `project_id` | uuid | yes (since `20260415000001:5`) | | → `projects` **ON DELETE CASCADE** | 006 | project-scoped quotes (variation orders); deleting a project deletes its quotes |
| `studio_id` | uuid | no | | → `studios` CASCADE | 006 | tenant |
| `lead_id` | uuid | yes | NULL | **none** (soft) | `20260415000001:9` | the lead; `idx_quotes_lead` |
| `label` | text | yes | `'Quote'` | | `:10` | the quote's name in the lead's quote tabs; renamed through `PATCH …/records/[id]` (`src/components/leads/quote-digitizer-dialog.tsx:1092`) |
| `quote_number` | text | yes (since `:6`) | | `UNIQUE (studio_id, quote_number)` (`103:134-138`) | 006 | `QT-###` / `VO-###`, max + 1 per studio (D-17) |
| `quote_type` | text | yes | `'standard'` | none | `:11` | `standard · variation · ai_generated` (`src/types/app.ts:852`) |
| `status` | `quote_status` enum | no | `'draft'` | enum | 006, 102 | §4.3 |
| `is_primary` | boolean | yes | false | partial unique per lead (105) | `:12` | the lead's contract quote; drives the lead mirror |
| `is_omission` | boolean | no | false | | 213 | a variation that credits the contract; since 245 derived at save as `grandTotal < 0` (`src/app/api/quotes/line-items/route.ts:727`) |
| `subtotal` · `discount` · `tax` · `total` | integer | no | 0 | | 006 | **dead**: mapped by `transformQuote` (`transformers.ts:1082-1085`); no writer in `src/app/api/quotes/**` |
| `total_cents` | bigint | yes | 0 | | `:13` | the canonical total — incl. GST, after line and document discounts, GST on the post-discount base — written by the line save (`line-items/route.ts:720-729`); frozen by 307's trigger |
| `subtotal_cents` · `discount_cents` · `tax_cents` | bigint | yes | 0 | | `:14-16` | same roll-up: subtotal, line + document discount, GST charged |
| `payment_schedule` | jsonb | yes | `'[]'` | | `:17` | `QuotePaymentMilestone[]` (D-30) |
| `doc_sections` | jsonb | yes | `'[]'` | | `:18` | `QuoteDocSection[]` — the per-quote schemaVersion-1 layout (templates §2.1) |
| `parsed_doc_metadata` | jsonb | yes | NULL | | `:19` | the uploaded source quote's header + `__layout` + `refNumberOverride` (D-32) |
| `rejection_comment` | text | yes | NULL | | `:20` | written by `PATCH …/records/[id]` (`route.ts:120`); the transition route keeps its comment in `quote_status_history.comment` instead |
| `notes` | text | yes | | | 006 | writable by `PATCH …/records/[id]` (`route.ts:102`); no editor writer found |
| `valid_until` | date | yes | | | 006 | read only by the legacy `/api/quote-preview/[token]` (`route.ts:20,75`); the editor's validity is `leads.quote_valid_until` (D-08) |
| `preview_token` · `preview_token_created_at` | text · timestamptz | yes | | unique partial | 109 | the public live-PDF link (D-21) |
| `preview_view_count` | integer | no | 0 | | 187 | incremented per PDF fetch (D-21) |
| `created_by` | uuid | yes | | → `profiles` SET NULL | 006 | stamped by `POST /api/quotes/records` (`route.ts:183`) |
| `submitted_by` | uuid | yes | | none | 269 | stamped only when `submit` lands on `submitted` (`src/app/api/quotes/[id]/transition/route.ts:245-248`; `…/records/[id]/route.ts:110`) |
| `prepared_by_signature` | jsonb | yes | | | 269 | frozen designer signature (D-33); baked at `submitted` / `approved`, cleared on `draft` / `rejected` (`transition/route.ts:255, 272`) |
| `signed_at` | timestamptz | yes | | | 307 | stamped once by `finalize_signed_mirror` v5 (`307:123-127`); the tiebreak for "latest signed quote" |
| `created_at` · `updated_at` | timestamptz | no | `now()` | | 006 | |

**Indexes and constraints.** `quotes_pkey`; `quotes_studio_number_unique` (103); `quotes_one_primary_per_lead` (105, partial unique); `quotes_preview_token_unique` (109, partial unique); `idx_quotes_lead · _project · _studio` (`20260415000001:22-24`). **Triggers on `quotes`:** `trg_sync_primary_quote_to_lead`, `trg_sync_on_primary_flag_change` (103), `trg_sync_lead_quote_status_iud` (158 → 304), `trg_quote_totals_frozen` (307) — none is dropped by a later migration, so all four coexist (grep of both sets). **RLS:** 012 → 092 → 226 (`scoped`). **TypeScript:** `DbQuote` (`database.ts:653-700`), `Quote` (`app.ts:854-898`; it omits `preview_token*`, `preview_view_count`, `prepared_by_signature`); `transformQuote` (`transformers.ts:1069-1103`). **docs/DATABASE_SCHEMA.md:** no `quotes` section (templates D-08).

**Readers / writers.**
- Create: `POST /api/quotes/records` (`src/app/api/quotes/records/route.ts:134-240`) — status `draft`, label default `'Quote'`, number by `nextQuoteNumberForStudioScoped` with 5 attempts on a `23505` (`:168-223`), demotes itself to non-primary on a `quotes_one_primary_per_lead` clash (`:193-201`), copies the source quote's four `*_cents` when cloning (`:151-163`), and claims orphan lines for a new primary (`:237`). The line save also auto-creates a primary quote when a lead has none (`line-items/route.ts:1-24`).
- Update: `PATCH /api/quotes/records/[id]` (`route.ts:20-198`) writes `label · notes · status · is_primary · *_cents · rejection_comment · parsed_doc_metadata · doc_sections · payment_schedule` and the `refNumberOverride` merge (`:101-147`); it refuses totals on a frozen quote (`:90-97`) and the contract-moving statuses of a variation (`:77-88`). It writes `status` directly, outside the transition route's state machine and without a history row. Status writes also come from `POST /api/quotes/[id]/transition` (D-07), `POST /api/quotes/request-signature`, `/api/quotes/cancel-signature` and `finalize_signed_mirror` (D-06).
- Delete: `DELETE /api/quotes/records/[id]` (`route.ts:201-325`) is a **hard delete**; it refuses an `approved` / `client_signed` variation (`VO_APPROVED`, `:226-235`) and an `approved` / `sent_for_signature` standard quote (`QUOTE_APPROVED`, `:243-255`), and cancels every non-signed signature request that names the quote first (`:284-323`). Lines and status history cascade.

### D-02 `quote_line_items` — the lines

**Two creation paths.**
- **(a) `006` first** (both sets): `006_projects.sql:114-123` creates the table quote-first — `quote_id NOT NULL → quotes CASCADE`, `description NOT NULL`, `category`, `quantity numeric(10,2) NOT NULL DEFAULT 1`, `unit_price numeric(12,2)` (scripts) / `integer` (supabase copy, `20240101000006:120`) `NOT NULL DEFAULT 0`, `amount integer NOT NULL DEFAULT 0`, `order_index integer NOT NULL DEFAULT 0`. Then `20240101000020_quote_line_items.sql:12-24` adds the lead-first columns as **nullable** (`lead_id → leads CASCADE`, `studio_id → studios CASCADE`, `qty`, `unit`, `total`, `margin_percent`, `ai_suggestion`, `sort_order`, `created_at`) and re-types `unit_price` to `NUMERIC(12,2)` (the "self-heal (2026-07-09)" note, `:3-11`); `20240201000004_drop_quote_id_not_null.sql:4-5` drops `quote_id NOT NULL`.
- **(b) `031` first** (scripts): `031_quote_line_items.sql:2-16` is `CREATE TABLE IF NOT EXISTS` with the lead-first shape — `lead_id NOT NULL`, `studio_id NOT NULL`, no `quote_id`. A fresh install of either set runs 006 first, so 031 is then a no-op; `20240101000020:3-11` calls path (a) "the WAVES fresh-install path", which implies the older environments took path (b), with `quote_id` arriving from `20260415000001:27` (§Uncertain).
- Either way `104_quote_fk_and_notnull.sql:35-47` adds `quote_line_items_quote_id_fkey → quotes ON DELETE CASCADE` and `SET NOT NULL` on `quote_id` (after 103 claimed every NULL, `103:50-55`).

**Columns** (effective union):

| Column | Type | Null | Default | Check / FK | From | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK | 006 / 031 | the save upserts by id (`isDbUuid`, `src/lib/quote-calc.ts:591-593`) |
| `quote_id` | uuid | **no** (104) | | → `quotes` CASCADE (104) | 006 / `20260415000001:27` | |
| `lead_id` | uuid | path (b): no · path (a): yes | | → `leads` CASCADE | 031:4 / `20240101000020:13` | still written on every save (`line-items/route.ts:518`); `restore_quote_version` keys on it (D-03) |
| `studio_id` | uuid | (b): no · (a): yes | | → `studios` CASCADE | 031:5 / `…20:14` | the 226 `scoped` policy keys on it |
| `name` | text | yes | | | `113_item_name_and_item_id.sql:7-9` | the bold headline; `179_backfill_quote_line_item_name.sql:24-31` moved every legacy `description` here |
| `description` | text | **no** | | | 006 / 031 | the plain-text shadow of `description_html` (`line-items/route.ts:467-469`); `''` on backfilled rows |
| `description_html` | text | yes | | | `122:17-18` | sanitised HTML (allow-list at the app layer) |
| `item_id` | text | yes | | | 113 | the SKU; no unique on lines |
| `category` | text | yes | | | 006 / 031 | the section (trade) name; the hierarchy is these strings (D-36) |
| `subcategory` | text | yes | | | `172:15-16` | the sub-section name |
| `price_type` | text | yes | `'amount'` | none | `035` ≡ `20240201000003` | `amount · foc · kiv · inclusive · by_client · lump_sum · content_block` (`app.ts:730`) |
| `unit_price` | numeric(12,2) | (a): no, default 0 · (b): yes, default 0 | | | 006 / 031 | the **selling** price per unit, dollars |
| `qty` | numeric(12,2) | yes | 1 | | 031 / `…20:15` | |
| `unit` | text | yes | `'lot'` | | 031 / `…20:16` | free text; the transformer defaults a NULL to `'set'` (`transformers.ts:866`) |
| `total` | numeric(12,2) | yes | 0 | | 031 / `…20:17` | the line total **incl. the line's GST** at the entity rate for `amount` / `lump_sum` rows (`line-items/route.ts:476-512`, `computeLineTotals` `quote-calc.ts:66-216`); a stored figure, not the source of truth |
| `margin_percent` | numeric(5,2) | yes | | | 031 / `…20:18` | written from the computed margin (`enrichLineItem`, `quote-calc.ts:569-589`) |
| `ai_suggestion` | jsonb | yes | | | 031 / `…20:19` | D-35 |
| `sort_order` | int | yes | 0 | | 031 / `…20:20` | the row's index in the saved array (`line-items/route.ts:532`) |
| `created_at` | timestamptz | no | `now()` | | 031 / `…20:21` | |
| `updated_at` | timestamptz | no | `now()` | | `153:15-36` | + trigger `trg_quote_line_items_updated_at` |
| `comments` | jsonb | yes | `'[]'` | | `044:5-6` | `LineComment[]` (D-34); appended by RPCs `append_quote_line_comment[_reply]` (`134:7-54`) |
| `discount_type` | text | yes | `'none'` | none | `20260414000001:5-6` | `none · percent · flat` |
| `discount_value` | numeric(12,2) | yes | 0 | | `:7-8` | a percent, or dollars when `flat` |
| `discount_amount` | numeric(12,2) | yes | 0 | | `:9-10` | computed, dollars |
| `discount_label` | text | yes | | | `199:9-10` | the line discount's printed label |
| `tax_inclusive` | boolean | yes | false | | `:13-14` | the price already includes GST |
| `tax_rate` | numeric(5,4) | yes | NULL | | `:15-16` | a fraction (0.09); NULL = region default; the save stamps the entity's rate on taxable rows (`line-items/route.ts:473-475`) |
| `tax_amount` | numeric(12,2) | yes | 0 | | `:17-18` | computed |
| `cost_price` | numeric(12,2) | yes | NULL | | `:21-22` | per unit, dollars; auto-filled from the price book at save (`line-items/route.ts:392-…, 460`) |
| `is_optional` | boolean | yes | false | | `:25-26` | the client can toggle it on the signing page |
| `package_tier` | text | yes | NULL | none | `:27-28` | `essential · premium · luxury` (packages, D-04) |
| `price_book_item_id` | uuid | yes | NULL | **soft** (no FK, `:30-32`) | | the price-book link |
| `waste_percent` | numeric(5,2) | yes | 0 | | `20260416000001:54-55` | effective qty = qty × (1 + waste/100) |
| `cost_type` | text | yes | NULL | none | `:58-59` | `material · labor · subcontractor · combined` |
| `vendor_id` | uuid | yes | NULL | soft | `:62-63` | first vendor from the price book (PO pre-fill) |
| `price_snapshot_at` | timestamptz | yes | NULL | | `:66-67` | when the price was taken from the price book |
| `source` | text | yes | | CHECK `101:22-24` → `193:19-21` → `290:24-26` | 101 | nine values (§4.4); NULL = legacy |
| `image_url` | text | yes | | | `108:6-7` | public URL in bucket `quote-images` (D-20) |
| `notes` · `spec_url` | text | yes | | | `110:6-8` | |
| `created_by` | uuid | yes | | → `profiles` SET NULL | `110:9` | written on insert only (`line-items/route.ts:590-592`) |
| `competitor_benchmark_cents` · `competitor_source` | bigint · text | yes | | | `136:6-8` | studio-internal benchmark; **cents** |
| `amount_marker` | text | yes | | `180:22-24` CHECK `('inclusive','foc')` → `298:33-50` CHECK non-blank, ≤ 24 chars | 180 | a word printed in the amount cell; the line leaves every total but its cost still meets the margin (`quote-calc.ts:20-23, 79-114`) |
| `ref_override` | text | yes | | | `200:13-14` | a printed ref that wins over the computed one (`"1.1"`, `"-"`); a single space is the blank-ref sentinel (`line-items/route.ts:539-547`) |
| `is_omission` | boolean | **no** | false | | `245:7-8` | a credit line (positive amount, subtracts) |
| `highlight_color` | text | yes | | | `297:29` | palette name or `#rrggbb` (§4.4); sanitised (`line-items/route.ts:515`) and omitted from the write when NULL (`:575-588`) |
| `quantity` · `amount` · `order_index` | numeric(10,2) · integer · integer | no | 1 · 0 · 0 | | path (a) only | **dead** — not in `DbQuoteLineItem` (`database.ts:584-649`) |

**Indexes.** `idx_quote_items_lead (lead_id)` (`031:18` / `…20:24`), `idx_qli_quote (quote_id)` (`20260415000001:28`), `idx_quote_line_items_source (studio_id, source) WHERE source IS NOT NULL` (`101:26-28`), `idx_quote_line_items_quote_sort (quote_id, sort_order)` (`107:10-11`), `quote_line_items_created_by_idx` (`110:14-15`), `idx_quote_line_items_amount_marker` (`180:26-28`). **RLS:** 012's `quote_items_select / _insert / _update` through `quotes.studio_id` (`012:16, 87-89`; not dropped by 092) plus 226's `scoped` (`226:51`); permissive policies OR together. **TypeScript:** `DbQuoteLineItem` (`database.ts:584-649`), `QuoteLineItem` (`app.ts:774-846`, three fields never stored — D-44); `transformQuoteLineItem` (`transformers.ts:858-918`: `priceType` default `amount`, `unit` default `set`, `discountType` default `none`, `total` falls back to `unit_price × qty`). **docs:** `docs/DATABASE_SCHEMA.md:402-421` shows the pre-v2 15-column shape.

**Readers / writers.** The canonical save is `POST /api/quotes/line-items` (`route.ts`): resolve or create the quote; refuse `approved · client_signed · sent_for_signature` with `409 QUOTE_LOCKED` (`:339-365`); match lines to the price book for cost (`:392`); keep stored comments (`:438-443`); delete the ids that left, then upsert by id in chunks (`:596-668`); write the quote's four `*_cents` (`:682-742`). Also the package RPCs `apply_project_template` / `apply_category_template` (`185 → 191 → 192 → 204`; `quote_id` on their lines since 192; no `name`, `cost_price` or `source`, D-15), `restore_quote_version` (D-03), `/api/quotes/line-items/raw-insert`, and the agent executors (which write `source` — `101:4-9`). Read by `GET /api/quotes/line-items` (ordered by `sort_order`), every renderer and the signing snapshot.

### D-03 `quote_versions` (1.0) — per-lead snapshots

**Columns:** templates D-07 covers every column and its DDL (`20260414000002_quote_versions.sql:4-21` · `20260415000001:31` `quote_id` · `186:5-11` `hierarchy_snapshot` · `192:16-17` `quote_metadata_snapshot`; `UNIQUE (lead_id, version_number)`). What the quote editor adds:
- **Writer** `POST /api/quotes/versions` (`src/app/api/quotes/versions/route.ts:67-117`): `version_number` = the lead's max + 1 (`:92-98`); `quote_status` defaults to `'draft'`; `created_by` = the session user. It **never writes `quote_id`** (`:100-114`) — in practice every row is keyed by the lead alone, and a lead with several quotes has one version sequence for all of them. A non-explicit (autosave) snapshot within 30 s of the previous one for the same lead is skipped, the clock kept in a server-process `Map` (`:26-27, 86-90`).
- **Readers** `GET` the lead's versions newest first (`:52-58`) or two for the diff (`:40-50`); `transformQuoteVersion` (`transformers.ts:1041-1067`) — snapshots are stored as camelCase UI types.
- **Restore** `POST /api/quotes/versions/restore` → RPC `restore_quote_version(p_lead_id, p_version_id, p_caller_studio_id)` (`186` → `243_restore_quote_version_payment_schedule.sql:16-133`): deletes **every line of the lead**, across all its quotes (`:51`); re-inserts the snapshot's lines with only `id, lead_id, studio_id, name, description, category, subcategory, unit_price, qty, unit, total, margin_percent, is_optional, sort_order, ai_suggestion, comments` (`:56-79`) — no `quote_id` although it is `NOT NULL` since 104, and every other column (price type, discount, tax, marker, cost, source …) back to its default; restores `leads.quote_hierarchy_metadata` (`:83-87`); writes the milestones to `leads.quote_metadata.paymentMilestones` ("a key nothing reads", `:2-4, 92-96`) and to the lead's contract quote's `payment_schedule` (non-variation, not `client_signed` / `sent_for_signature`, primary first; `:98-119`); inserts a `quote_status_history` row with columns 157 does not define (`:121-128`). See §Uncertain.

### D-04 `quote_packages` — Good / Better / Best tiers

**Columns:** templates D-06 (`20260414000005_quote_packages.sql:4-18`; `quote_id` from `20260415000001:32`, no FK). What the quote editor adds: the only writer is `POST /api/quotes/generate-packages` (`route.ts:290-305`: `lead_id`, `studio_id`, `name`, `tier_order`, `items` (a line snapshot), `totals {subtotal, totalDiscount: 0, totalTax: 0, grandTotal}`, `is_recommended` = the middle tier, `ai_generated: true`, `upgrades[]`) — it never writes `quote_id`, and **no reader** exists anywhere in `src/` (grep for `quote_packages`). The companion column `quote_signature_requests.client_selections` (`20260414000005:21-22`) is also never written: the signing page posts `clientSelections.optionalItemsAccepted` (`src/app/sign/[token]/page.tsx:740-742`) but `POST /api/sign/[token]/submit` does not read or store it (grep). Both are write-only / dead in practice.

### D-05 `quote_status_history` — the transition log

**Columns:** templates D-22 (`157_quote_status_history.sql:17-47`: `id`, `quote_id NOT NULL → quotes CASCADE`, `studio_id NOT NULL → studios CASCADE`, `from_status`, `to_status NOT NULL`, `action NOT NULL`, `actor_user_id → profiles SET NULL`, `comment`, `created_at`; indexes `(quote_id, created_at DESC)`, `(actor_user_id, created_at DESC) WHERE actor_user_id IS NOT NULL`, `(studio_id, created_at DESC)`). RLS `226:51`. What the quote editor adds: the **only** writer is the transition route (`src/app/api/quotes/[id]/transition/route.ts:421-433`) with `action ∈ submit · approve · reject · revise` and a `comment` of at most 4,000 characters (`:109`; required for `reject`, `:110-112`). Status moves made by `PATCH …/records/[id]`, `request-signature`, `cancel-signature`, `finalize_signed_mirror` and the signing submit write **no** history row, and `restore_quote_version`'s insert names columns the table does not have (D-03). The log therefore holds the internal review trail only, not sending or signing.

### D-06 `quote_signature_requests` — the quote side

**Columns:** templates D-11 lists every column and its DDL. What the quote editor adds:
- **Statuses written:** `pending` on insert (`request-signature/route.ts:712-737`), `viewed`, `signed` (`src/app/api/sign/[token]/submit/route.ts:271`), `expired`, and **`cancelled`** — by `cancel-signature` (`route.ts:83`, audit event `cancelled`), by `request-signature` for every prior `pending` / `viewed` request of the lead (`route.ts:673-708`, events `cancelled_for_regenerate` · `cancelled_superseded`), and by the quote delete (D-01). The TypeScript unions lack `cancelled` (`database.ts:1820` comment; `app.ts:1751`) and `AuditTrailEvent.event` lacks the three cancel events (`app.ts:1992-1998`).
- **Quote-side columns:** `quote_id` (→ `quotes` **ON DELETE RESTRICT**, `104:54-58`; nullable; "mirrors `quote_ids[0]` / `selected_quote_id`"), `quote_ids uuid[]`, `signing_mode single · bundle · variations`, `selected_quote_id → quotes SET NULL` (`161:21-37`), `quote_snapshot` (D-40), `quote_total numeric(12,2)` **dollars**, `payment_schedule` (the frozen split, D-40), `company_id → studio_companies SET NULL` (`128:80-84`), `prepared_by_display text` (`20260520000003:11-15`; not in `DbQuoteSignatureRequest`, `database.ts:1815-1862`), `expires_at` = now + **7 days** fixed (`request-signature/route.ts:358`).
- **Gate:** every quote in the set must be `approved` or `sent_for_signature`, never `client_signed` (`request-signature/route.ts:192-232`); a lead with no quote rows falls back to `leads.quote_status` (`:199-214`). With `features.lock_quote_actions_until_approved` the same gate answers 403 (`:236-250`).
- **Effects on quotes and the lead:** the set → `sent_for_signature` (`:790-800`); any other `sent_for_signature` quote on the lead → `approved` (`:803-819`); `leads.quote_status = 'sent_for_signature'`, `leads.signature_request_id` = the new row (`:770-785`); the quotes join `leads.quote_metadata.portalSharedQuotes` (`:827-980`). `cancel-signature` resets the quotes and the lead mirror to `approved` and clears `signature_request_id` (`route.ts:93-116`). Signing calls `finalize_signed_mirror` (`sign/…/submit/route.ts:356`; v5 `307:54-143`): the marked quotes → `client_signed` with `signed_at = COALESCE(signed_at, now())`; other signed **base** quotes of the lead → `approved`; for a base signing the lead → `quote_status client_signed`, `contract_uploaded true`, `contract_file_name 'client-signed-quote.pdf'` and the funnel's SIGNED bucket.
- **Schedule snapshot** priority: the quote's own `payment_schedule` → the studio's default `payment_schedule_templates` row → the platform 10/30/30/30 (`request-signature/route.ts:395-452`); the template read selects `config, stages` (`:443`) and no migration creates a `config` column (`061:87-97`) — see §Uncertain.

### D-07 Quote approval rules — where they live

There is no approval table. The rule is spread over five stores:

| Store | Shape | Read / written by |
|---|---|---|
| `studios.settings.workflow` | `WorkflowToggles` (`app.ts:4091-4116`): `quoteApprovalRequired` (default **true**, `DEFAULT_WORKFLOW` `src/lib/queries/studio-config.ts:68-82`) and `approvers.quoteApproval: user ids[]` (empty = owners only) | `transition/route.ts:135-163` → `resolveQuoteSubmitDecision` (`src/lib/access-control.ts:441-505`) |
| `studio_members.workflow_overrides` | `Partial<WorkflowToggles>` per member (`114_studio_member_overrides.sql:20-27`) | merged over the studio's by `resolveEffectiveWorkflow` (`transition/route.ts:158-160`) |
| `studio_roles.permissions` · `studio_members.permission_overrides` | `actions.quotes {create, edit, approve, send}` (`database.ts:2338-2349`; `114:17-24`) | UI gates (`resolveCanPerformAction`) |
| `studios.settings.quote_approval` | `{auto_approve_below, require_approval_above, approver_role, notify_on_rejection, rejection_reasons[]}` (`database.ts:817-823`) | written by Accounts (`src/app/(main)/accounts/page.tsx:502-508`) and read back only into that form (`:402-409`, `transformers.ts:1485`) — **no enforcement found** (grep). The Flo seeds write another shape, `{enabled, required_roles[]}` (`100_seed_flo_design.sql:42`; `scripts/tenants/flo-design/seed.mjs:125`) |
| `tasks` rows `type 'QuoteApproval'` | `approval_status`, `approval_comment`, `related_entity_id` = the quote id (`030_tasks_table.sql:2-21`) | created when a non-approver submits (`createTask`, `access-control.ts:498-505`); cancelled by `/api/tasks/records/cancel-quote-approvals` |

**Decision** (`access-control.ts:441-505`): an Owner is always an approver; otherwise the member must be in `approvers.quoteApproval`. Approval off → `submit` lands on `approved`. Approval on and the actor an approver → `approved` directly. Otherwise → `submitted` + a QuoteApproval task. `approve` / `reject` need an approver (a variation also accepts an admin, `transition/route.ts:170-172`); `revise` returns `approved · rejected · sent_for_signature` to `draft` (`:58-84`). `features.lock_quote_actions_until_approved` (D-23) hides share / send until approval and gates the signing link (D-06).

### D-08 `leads` — the quote mirror and the quote's header fields

The Leads audit owns `leads` (leads D §1.2). The columns the quote editor reads or writes:

| Column | Type / default | Migration | Role |
|---|---|---|---|
| `quote_status` | text, default `'none'` | `017_projects_and_leads_extended.sql:38` CHECK `(none, draft, submitted, approved, rejected)` → `043:7-17` widened (+ `sent_for_signature`, `client_signed`) → `089:39` CHECK dropped | the primary quote's status, kept in step by triggers 103 / 158 / 304 and by explicit writes (D-06); NULL after the last primary is deleted (304) |
| `quote_data` | jsonb | `017:39` | legacy (D-38) |
| `quote_metadata` | jsonb NOT NULL `'{}'` | `171_lead_quote_metadata.sql:6` | the per-lead quote settings and design (D-36) |
| `quote_hierarchy_metadata` | jsonb NOT NULL `'{"sections":[]}'` | `183:18-22` (+ `184:11-12` defensive) | the section tree (D-37); legacy since `189` |
| `signature_request_id` | uuid → `quote_signature_requests` | `042:28` | the live signing link |
| `contract_uploaded` · `contract_file_name` | boolean NOT NULL false · text | `017:40-41` | set by the signing mirror (`307:86-90`) |
| `ic_number` | text | `175:14` | the header's NRIC row |
| `customer_id` · `quote_valid_until` | text · date | `181:20-21` | the header's customer ref and **validity (per lead)** |
| `property_address` | text | `188:14` | the header's address |
| `company_id` | uuid → `studio_companies` SET NULL | `154:20-22` | the **issuing entity**, picked in the editor's totals bar, per lead (D-18) |
| `signed_at` | timestamptz | `262:9` | TAT stamp |

Trigger on `leads`: `trg_sync_lead_to_primary_quote AFTER UPDATE OF quote_status` (`103:163-167`) copies the lead's status onto the primary quote.

### D-09 `studio_price_book` — the catalogue (every column)

| Column | Type | Null / default | FK / check | Migration | Notes |
|---|---|---|---|---|---|
| `id` | uuid | PK `gen_random_uuid()` | | `090_studio_customization_engine.sql:72` | |
| `studio_id` | uuid | NOT NULL | → `studios` CASCADE | `090:73` | |
| `description` | text | NOT NULL | | `090:74` | the long text (the only text before 113) |
| `category_id` | uuid | yes | → `studio_quote_categories` SET NULL | `090:75` | |
| `unit_price` | numeric (no scale) | yes | | `090:76` | selling price, dollars |
| `unit` | text | yes | | `090:77` | free text |
| `source` | text | `'manual'` | none | `090:78` | seeds write `'platform-default'` / `'flo-seed'` (D-25, §5.E) |
| `external_ref` | text | yes | | `090:79` | |
| `created_at` · `updated_at` | timestamptz | `now()` (nullable) | | `090:80-81` | |
| `cost_price` | numeric(12,2) | NULL | | `20260414000003_price_book_v2.sql:6-7` | per unit |
| `market_rate_min` · `market_rate_max` | numeric(12,2) | NULL | | `:8-11` | regional benchmark |
| `markup_percent` | numeric(5,2) | NULL | | `:12-13` | |
| `is_active` | boolean | true | | `:14-15` | soft delete |
| `tags` | text[] | `'{}'` | | `:16-17` | |
| `notes` | text | NULL | | `:18-19` | |
| `image_url` · `spec_url` | text | NULL | | `20260416000001_price_book_v3.sql:32-35` | bucket `price-book-images` (`111`) |
| `cost_type` | text | `'combined'` | none | `:38-39` | `material · labor · subcontractor · combined` |
| `waste_percent` | numeric(5,2) | 0 | | `:42-43` | |
| `vendor_id` | uuid | NULL | → `vendors` SET NULL (FK since `100_studio_price_book_vendor_fk.sql:14-19`) | `:46-47` | deprecated mirror of `vendor_ids[0]` |
| `vendor_ids` | uuid[] | NOT NULL `'{}'` | none (GIN index) | `135_pricebook_multi_vendor.sql:6-16` | several suppliers per item |
| `created_by` | uuid | NULL | → `profiles` SET NULL | `110:11-12` | |
| `order_index` | int | NULL | | `112:7-12` | drag order |
| `name` · `item_id` | text | NULL | unique `(studio_id, item_id) WHERE item_id IS NOT NULL` (`113:18-20`, again `159:62-64` after a dedupe) | `113:11-13` | headline · SKU |
| `approval_status` · `approved_by` · `approved_at` | text NOT NULL `'approved'` CHECK `pending · approved · rejected` · uuid → `profiles` SET NULL · timestamptz | | | `114_price_book_approval.sql:10-19` | a designer's new item waits for an owner / admin; usable meanwhile |
| `approver_user_id` | uuid | NULL | → `profiles` SET NULL | `160:20-25` | the pinned approver |
| `embedding` | vector(1536) | NULL | HNSW index | `288:5-13` | AI drafter search |
| `subcategory` | text | — | — | **no migration at `67f42e469`** | typed (`database.ts:2373-2375`) and mapped (`transformers.ts:1009`); the DDL `215_studio_price_book_subcategory.sql` exists only on commit `8c2e961a2`, which is not an ancestor of HEAD (`git merge-base --is-ancestor`); `234:14-16` names it as an applied release migration |

RLS `226:56`. TypeScript `DbStudioPriceBookItem` (`database.ts:2368-2412`), `StudioPriceBookItem`; transformer `transformStudioPriceBookItem` (`transformers.ts:978-1039`, derives `vendorIds` from `vendor_ids` else `vendor_id`). Writers `src/app/api/studio-config/price-book/{route,[id],reorder,vendor-markup}`, `src/app/api/price-book/{[id],[id]/approve,[id]/reject,import,parse,suggestions/*,upload-image}`, the seed scripts; the line save reads it for cost (`line-items/route.ts:392`), as do `quotes/auto-match`, `quotes/import`, `quotes/chat` and the `cron/price-drift` job.

### D-10 `price_book_pricing_tiers` — volume breaks

`20260416000002_pricing_tiers.sql:8-18`: `id`, `price_book_item_id NOT NULL → studio_price_book CASCADE`, `min_qty numeric(12,2) NOT NULL DEFAULT 0`, `max_qty numeric(12,2)` (NULL = no upper bound), `unit_price numeric(12,2) NOT NULL`, `cost_price numeric(12,2)`, `created_at`; index on the item. RLS: parent-exists through `studio_price_book` (`226:122`). Written by `PUT /api/studio-config/pricing-tiers` (delete-all then insert, `route.ts:15-50`). Resolved by `resolveTieredPrice` (`src/lib/quote-calc.ts:536-557`): the last tier whose `[min_qty, max_qty]` holds the quantity; above every tier → the last tier. `DbPriceBookPricingTier` (`database.ts:1310-1318`).

### D-11 `price_book_history` — price changes

`20260416000001:8-25`: `id`, `price_book_item_id NOT NULL → studio_price_book CASCADE`, `studio_id NOT NULL`, `changed_by → profiles SET NULL`, `change_type` (`create · update · archive · restore`), `field_changes jsonb {field: {old, new}}`, `unit_price_before/after`, `cost_price_before/after`, `markup_percent_before/after`, `created_at`; two indexes. Locked server-only (`223_lock_studio_config_tables.sql:41`). Transformer `transformPriceBookHistory` (`transformers.ts:945-961`).

### D-12 `price_book_suggestions` — "new to catalogue" candidates

`115_price_book_suggestions.sql:16-54`: `studio_id`, `quote_line_item_id → quote_line_items CASCADE` (unique partial: one suggestion per line), `copilot_shadow_item_id`, `source_event` CHECK `pdf_parse · ai_generation · copilot · submit_review · manual`, `description`, `name`, `category_name`, `unit_price`, `cost_price`, `unit`, `qty`, `match_tier` CHECK `high · suggested · none`, `match_confidence`, `status` CHECK `pending · added · dismissed`, `added_to_price_book_id → studio_price_book SET NULL`, `dismissed_by`, `created_by`, timestamps. RLS `226:48`.

### D-13 `vendors` — suppliers and brands

`059_finance_core_tables.sql:7-23`: `id`, `studio_id NOT NULL → studios`, `name NOT NULL`, `company_name`, `phone`, `email`, `trade`, `bank_name`, `bank_account_number`, `bank_account_holder`, `notes`, `is_active boolean NOT NULL DEFAULT true`, timestamps; `+ default_markup_percent numeric(5,2)` (`20260416000002:24-25`); `+ kind text NOT NULL DEFAULT 'supplier'` CHECK `supplier · brand · both` (`312_vendors_kind_and_catalog_link.sql:66-78`); merge function (`313_merge_vendors_fn.sql`). RLS `226:57`. `DbVendor` (`database.ts:1291-1308`). The quote side reads it through `studio_price_book.vendor_ids[]` and `quote_line_items.vendor_id` (no FK); the finance side (POs, bills, expenses) owns it.

### D-14 `studio_quote_categories` — the trades

**Columns:** templates D-18 (`090:57-64` · `172:9-10` `subcategories text[]` · `174:8-12` `description`). RLS `226:56`. What the quote editor adds: the default list is seeded twice — `090:329-338` (15 names `Demolition … Others` for every studio then existing) and the platform catalogue's 16 (`scripts/seed/catalogue-sg-default.mjs:17-34`, `Preliminaries … Cleaning`, written by `seed-default-pricebook.mjs`; Flo's own 16 by `scripts/tenants/flo-design/seed-pricebook.mjs:303-327`). `studio_price_book.category_id` points here (`SET NULL`), while `quote_line_items.category` is a free string matched by name. `features.price_book_subcategory_in_quote` (D-23) decides whether an item's sub-category rides onto the line.

### D-15 `studio_assemblies` — Packages (inserted into a quote)

**Columns and history:** templates D-05. What the quote editor adds: applying a package goes through `POST /api/quotes/templates/apply-category` / `apply-project` → RPCs `apply_category_template` / `apply_project_template` (latest bodies `204_template_rpcs_accept_quote_id.sql:33-…, 150-…`). Both RPCs insert lines with `quote_id, lead_id, studio_id, category, subcategory, description, unit_price, qty, unit, is_optional, amount_marker` only (`204:133-134, 275-276`; the same column list since `185:46-47`) — no `name`, `cost_price`, `source` or price-book link, so templates D-10's "`'template'` marks package-applied lines" holds for the agent's lines (`101:4-9`), not for these — and the category RPC merges `categoryOrder` / `sectionDescriptions` into `leads.quote_metadata` (`204:264, 294`). Saving a quote section as a package is `create_template_from_quote` (`POST /api/quotes/templates/create-from-quote`; latest `305:65-…`, which keeps cost, margin, the price-book link and vendors).

### D-16 `payment_schedule_templates` — reusable splits

**Columns:** templates D-17 (`061_finance_commission_journal_tables.sql:87-97`; `stages [{name, percent, trigger, type?, amountCents?}]`). What the quote editor adds: every studio that existed at `062` got `Standard 4-Stage` 10 / 40 / 40 / 10, `is_default true`, triggers `contract_signed · work_started · milestone_completed · project_completed` (`062_seed_chart_of_accounts.sql:87-95`); the editor's trigger list adds `custom_date` (`src/components/finance/PaymentScheduleEditor.tsx:29-35`). A **second** studio default lives in `studios.settings.defaultPaymentSchedule` (`QuotePaymentMilestone[]`, `src/app/api/identity/studio-settings/payment-schedule/route.ts:31-33`), and the digitizer's own fallback is `DEFAULT_PAYMENT_MILESTONES` 10 / 30 / 30 / 30 (`quote-digitizer-dialog.tsx:220-225`). The signing snapshot reads the template row last (D-06).

### D-17 Quote numbering — no table

- `quotes.quote_number` with `UNIQUE (studio_id, quote_number)` (`103:134-138`) is the whole state.
- The generator `nextQuoteNumberForStudioScoped` (`src/app/api/quotes/records/route.ts:32-51`) reads every number of the studio that starts `QT-` (or `VO-` for a variation), takes the highest numeric suffix, adds 1 and pads to 3 digits; the insert retries up to 5 times on a unique clash (`:168-223`). Numbers never come back once a quote is deleted, unless it held the highest.
- Pre-103 rows were numbered by `103:105-129` in `created_at` order, `QT-` / `VO-` by `quote_type`.
- `studio_sequences (studio_id, sequence_name, current_value)` (`20260503000001_project_sequential_id.sql:5-10`) holds the project, invoice, credit-note and receipt counters — never a quote (`next_*_seq_id` callers, grep).
- `studios.settings.numbering` and `studio_companies.numbering` carry only `invoicePrefix · poPrefix · ticketPrefix` (`src/lib/numbering.ts:18-36`); the quote prefix is hard-coded.
- The printed number can be replaced per quote by `parsed_doc_metadata.refNumberOverride` (D-32).

### D-18 `studio_companies` — the issuing entity, quote side

**Columns:** templates D-13 (`126`, `130` `tax_rate`). What the quote editor adds: the entity is chosen **per lead** (`leads.company_id`, `154:20-22`) in the editor's totals bar; its `gst_registered` is the default for `quote_metadata.gstEnabled` (null = inherit, `app.ts:43-44`) and its `tax_rate` (else the region's) is the `effectiveTaxRate` the client sends with every save and the save stamps on taxable lines (`line-items/route.ts:450-453, 473-512`; region fallback `getRegionConfig(country).tax.rate`, `:698`). A signing request records its own `company_id`: the lead's, else `selectDefaultEntity` over the studio's companies (`request-signature/route.ts:637-670`).

### D-19 `member_signatures` and the frozen signature on the quote

`267_member_signatures.sql:4-34`: `id`, `studio_id NOT NULL → studios CASCADE`, `member_user_id NOT NULL → profiles CASCADE`, `storage_path NOT NULL` (private bucket `member-signatures`, `268`), `style` CHECK `drawn · uploaded`, `auto_apply boolean NOT NULL DEFAULT false`, `consent_at`, `is_active boolean NOT NULL DEFAULT true`, timestamps; partial unique one active per `(studio_id, member_user_id)`; its own `scoped` RLS in the same file. `DbMemberSignature` (`database.ts:2971-2982`). At the first `submitted` / `approved`, `bakePreparedBySignature` (`src/lib/quote-signatures/apply-on-approval.ts:64-190`) copies the author's active opted-in signature into `quotes.prepared_by_signature` (D-33) and stamps the canonical PDF.

### D-20 Comments, notes and attachments — no tables

- **Line comments:** `quote_line_items.comments` JSONB (D-34), appended by `append_quote_line_comment` / `_reply` (`134:7-54`) to avoid lost writes.
- **Quote notes:** `quotes.notes` (006) — writable, no editor writer; `quotes.rejection_comment` and `leads.quote_data.rejectionComment` hold the reject note (D-38); `QuoteDocSection.comments` are internal notes on a layout section (templates §2.1).
- **Attachments:** none at quote level — neither migration set has a quote-file table (grep for `quote_files` / `quote_attachments`). Line photos go to bucket `quote-images` (public; `108:10-25`; object path `{studioId}/{leadId}/{uuid}.{ext}`, `src/app/api/quotes/upload-image/route.ts:8, 53`) and the URL into `quote_line_items.image_url`; price-book photos to `price-book-images` (`111`); signed PDFs to `signed-quotes` (`119`, private since `233`); the canonical shared PDF to `shared-quotes/{studioId}/{quoteId}.pdf` (`src/lib/quote-canva/shared-quote-pdf.ts:24-28`), deleted when a quote is revised or rejected (`transition/route.ts:285-322`).

### D-21 The share link and its view count — flow only

`quotes.preview_token` / `preview_token_created_at` / `preview_view_count` (D-01). `POST /api/quotes/[id]/share-link` mints the token or returns the existing one; `{regenerate: true}` rotates it and resets the count (`route.ts:26-58` header). The public side is `/api/quote/[token]` (+ `/pdf`, `/status`, `/request-otp`, `/verify-otp`): an OTP-verified viewer gets a cookie `quote_view_session_{first 16 hex of the token}` (`route.ts:6-9`), and each PDF fetch adds one view (`pdf/route.ts:91`). OTP attempts are limited per token by `otp_rate_limits (bucket_key PK, hits timestamptz[], updated_at)` + `check_otp_rate_limit()` (`201_otp_rate_limit.sql:15-19`; server-only). A legacy public route `/api/quote-preview/[token]` also exists (reads `valid_until`, `notes`, the four `*_cents`, `route.ts:20`). The **signing** link is a separate token on `quote_signature_requests` (D-06). `studios.settings.quoteLinkExpiryDays` (7 · 14 · 30 · 60 · 90) is written by Accounts (`accounts/page.tsx:1531-1541`), but `request-signature` fixes `expires_at` at 7 days (`route.ts:358`) and no other reader was found — templates D-14's "the signing link's `expires_at`" does not hold at this commit.

### D-22 Notifications for quotes

The table is the Leads audit's (`notifications`, `20260314000001_notification_tables.sql:6-33` → `110` → `271`; leads D §1.2). Quote rows: `quote.signed_by_client` and `quote.signature_requested` (category `quotes`, critical, internal + external), `contract.composed_sent`, `vo.client_approved · vo.client_rejected · vo.auto_drafted` (category `quotes`), and `price_book.drift_detected · item_pending_approval · item_approved · item_rejected` (category `pricing`) (`src/lib/notifications/events.ts:19-24, 103-106, 198-262, 619-660`). There is **no** event for submit / approve / reject — the QuoteApproval task (D-07) is the signal. Preferences per category and channel (`notification_preferences`, `20260314000001:37-50`; `pricing` rows backfilled by `112_seed_pricing_preferences.sql`); `customer_notification_preferences` lists `quote.signed_by_client` as informational (`:53-65`).

### D-23 Settings and flags the quote editor reads (`studios.settings`)

| Key | Shape | Where |
|---|---|---|
| `workflow` · `quote_approval` | D-07 | approval |
| `features.canva_editor` | boolean, default on (`!== false`) | the Quote Designer (`src/app/api/studio-config/features/route.ts:76`) |
| `features.lock_quote_actions_until_approved` | boolean, default off | share / send gate (`:72`; D-06) |
| `features.fee_first_milestones` | boolean, default off | fixed-amount milestones (`:79`; `studio-config.ts:663-666, 684`) |
| `features.price_book_subcategory_in_quote` | boolean, default on | carry an item's sub-category onto the line (`:82`; `studio-config.ts:667-668, 686-688`) |
| `defaultPaymentSchedule` | `QuotePaymentMilestone[]` | D-16 |
| `quoteSharingMethod` · `quoteLinkExpiryDays` | templates D-14 | D-21 |
| `branding.quotePreparedByMode` | `team_list · studio_only · first_assignee` (`database.ts:861`) | `{prepared_by}` and `prepared_by_display` |
| `numbering` | D-17 | not for quotes |
| (region) | `getRegionConfig(country).tax.rate` | the GST default (`line-items/route.ts:698`) |

### D-24 Tables that point at `quotes` from other modules (Later)

`variation_orders.quote_id → quotes SET NULL` (`214_variation_orders_quote_link.sql:27`; the bridge from an approved VO quote), `project_invoices.linked_vo_id → quotes SET NULL` (`20260514000001_invoice_v2_columns.sql:9`), `…linked_vo_quote_id → quotes SET NULL` on floor-plan marks (`286_floor_plan_mark_links.sql:34`), `tasks.related_entity_id` (text, the QuoteApproval task, D-07), `quote_xrays` (the X-Ray audit). Finance and Projects own them.

### D-25 Platform and AI price data — listed so the names are not mistaken for studio data

`platform_market_rates` (`20260414000003:40`, seeded by `20260414000004_seed_market_rates.sql`), `crowd_rate_signals` (`20260416000003:5`), `market_quote_observations` (`20260519000001:52`), `copilot_shadow_quote_items` (`077_copilot_phase2_tables.sql:7` ≡ `20240301000007:7`), `quote_xrays` (`20260519000001:11`, locked `217`), `render_share_links` (templates D-23). Platform or Later; none is a quote record.

---

## 2. 1.0 — JSON shapes

### D-30 `quotes.payment_schedule` — `QuotePaymentMilestone[]`

`app.ts:950-962`: `id` (client string, `pm-1`…), `name`, `type?: 'fixed' | 'percent'` (absent = percent), `percent` (meaningful for percent rows), `amountCents?` (fixed rows), `trigger?` (free text, e.g. "Upon signing"), `notes?`. The digitizer's default is four rows 10 / 30 / 30 / 30 — `Deposit · Upon signing`, `Commencement · Works commence`, `Mid-Project · 50% completion`, `Completion · Handover` (`quote-digitizer-dialog.tsx:220-225`). Fixed rows only where `features.fee_first_milestones` is on (D-23). Written by `PATCH …/records/[id]` `paymentSchedule` (`route.ts:123`) from the digitizer's layout autosave (`src/app/(main)/tools/quote-digitizer/page.tsx:206-234`) and by `restore_quote_version` (D-03); read by the renderers and the signing snapshot (D-40).

### D-31 `quotes.doc_sections` — `QuoteDocSection[]`

The per-quote schemaVersion-1 layout: templates §2.1. Its `terms_conditions` / `rich_text` sections are where a v1 quote's own T&C and remarks text lives (§5.D).

### D-32 `quotes.parsed_doc_metadata`

Three things share the column:
- **The uploaded source quote's header** — `ParsedQuoteDocument` minus `lineItems` (`src/app/api/quotes/parse/route.ts:87-110`): `vendor`, `date`, `issuedBy`, `clientName?`, `refNumber?`, `description?`, `subTotal`, `discount`, `grandTotal`, `paymentSchedule?: ParsedPaymentStage[]` (`{name, percent, trigger?, type?, amountCents?}`, `:69-85`), and possibly `_docInsights · _extractedSections · _extractedGlobalStyles` (declared "never stored", `:105-109`, yet `handleDocumentParsed` saves the whole object minus the lines, `quote-digitizer/page.tsx:134-144`). With no quote row yet, the same object goes to `leads.quote_data` (`:140-142`).
- **`__layout`** `{globalStyles, brandColor, logoUrl}` — the layout tab's autosave (`page.tsx:214-222`).
- **`refNumberOverride`** — a studio-typed printed reference that replaces the `QT-###` wherever the header prints one, merged server-side against a fresh read (`…/records/[id]/route.ts:127-147`); it feeds both `{quote_number}` and `{project_ref}` (`quote-digitizer-dialog.tsx:2972-2973`).

### D-33 `quotes.prepared_by_signature` — `DbPreparedBySignature`

`database.ts:705-713`: `memberUserId`, `storagePath`, `sha256`, `signerName`, `role`, `appliedAt`, `appliedByUserId` — written once by `bakePreparedBySignature` (`apply-on-approval.ts:175-190`); never surfaced on the UI `Quote` type.

### D-34 `quote_line_items.comments` — `LineComment[]`

`app.ts:732-749`: `LineComment {id, authorId, authorName, authorRole: 'owner' | 'admin' | 'id', text, createdAt, replies: LineCommentReply[]}`; `LineCommentReply {id, authorId, authorName, authorRole, text, createdAt}`. Internal review notes, never printed.

### D-35 `quote_line_items.ai_suggestion`

`{type: 'underquote' · 'upsell' · 'missing' · 'client_mismatch' · 'margin_warning', message}` (`app.ts:787`).

### D-36 `leads.quote_metadata` — every key

| Key | Shape | Source | Notes |
|---|---|---|---|
| `gstEnabled` | boolean \| null | `app.ts:43-44` | null = the entity's `gst_registered` |
| `docDiscount` | `{type: 'percent' \| 'flat', value}` | `:45-46` | after line discounts; `flat` in dollars; a variation never takes it (`line-items/route.ts:718`) |
| `layoutOverrides` · `themeOverrides` | sparse knob overrides | `:47-52, 100-107` | templates §2.2 / §2.3 |
| `categoryOrder` | `string[]` | `:53-64` | section order by category name |
| `sectionDescriptions` | `Record<category, text>` | `:65-72` | the section's note; wins over `studio_quote_categories.description` |
| `subsectionDescriptions` | `Record<"category\|sub", text>` | `:73-78` | |
| `subsectionTotalLabels` | `Record<"category\|sub", text>` | `:79-82` | a word replacing the sub-section's amount ("Approximate"); display only |
| `subsectionOrder` | `Record<category, string[]>` | `:83-98` | declared sub-sections, even empty ones |
| `canvaBlocks` · `canvaOverrides` | the per-lead design | `:108-127` | templates §2.4 |
| `portalSharedQuotes` | `Record<quoteId, {pdfUrl?, sharedAt?}>` | `request-signature/route.ts:900-980`; `homeowner/engagement/[linkId]/route.ts:88` | a quote's membership = visible on the homeowner portal; removed on revise / reject (`transition/route.ts:312-318`; `…/records/[id]/route.ts:179-185`) |
| `paymentMilestones` | `QuotePaymentMilestone[]` | written by `restore_quote_version` (`243:92-96`) | dead ("a key nothing reads", `243:2-4`) |

All of it is **per lead**: two quotes of one lead share one document discount, one GST switch, one section order and one set of section notes.

### D-37 `leads.quote_hierarchy_metadata` — `QuoteHierarchy`

`{sections: [{id, categoryName, description, orderIndex, subsections: [{id, subcategoryName, description, orderIndex}]}]}` (`database.ts:83-96`); maintained by `reparent_quote_hierarchy` (`183:75-…`), snapshotted by versions, legacy since `189` moved order and descriptions into `quote_metadata`.

### D-38 `leads.quote_data` — legacy

Typed `any[] | null` (`database.ts:52`) and used as an object: first the lead's `QuoteLineItem[]` (`017:39`; the twin column on `projects` is commented "quote stored as JSONB array of QuoteLineItem objects", `017:28-29`), now the parsed-document header when a lead has no quote row (D-32) plus `rejectionComment` (`src/context/app-context.tsx:543`; `quote-digitizer/page.tsx:198`); the lead drawer falls back to it for the reject note (`lead-detail-drawer.tsx:1928-1932`).

### D-39 `quote_versions` JSON

`snapshot` = camelCase `QuoteLineItem[]` (money in dollars); `payment_milestones` = `QuotePaymentMilestone[]`; `doc_sections`; `totals {subtotal, totalDiscount, totalTax, grandTotal}` (dollars); `hierarchy_snapshot` = D-37; `quote_metadata_snapshot` = D-36 (`transformers.ts:1041-1067`).

### D-40 `quote_signature_requests` JSON (quote side)

- `quote_snapshot`: `single` → `QuoteLineItem[]`; `bundle` / `variations` → `QuoteSnapshotEntry[] {quoteId, quoteNumber, quoteName, isPrimary, lineItems, total}` (`app.ts:1736-1743`).
- `payment_schedule`: `PaymentScheduleMilestone {label, percentage, triggerEvent ('deposit' · 'start' · 'midway' · 'handover' · 'custom' · free text), amountCents?}` (`app.ts:1719-1729`) + `type: 'fixed'` on a fixed row (`request-signature/route.ts:44-58`); cents frozen off the signed total, the last row absorbing the rounding when the split sums to 100 % (`:455-…`).
- `client_selections {selectedPackageId?, optionalItemsAccepted?: string[]}` — never written (D-04).
- `documents`, `audit_trail`, `document_acknowledgements` — templates D-11; `AuditTrailEvent.event` in code also takes `cancelled · cancelled_for_regenerate · cancelled_superseded` (D-06).

### D-41 `quote_packages` JSON · D-42 `payment_schedule_templates.stages`

templates D-06 (`items`, `totals`, `upgrades`) and templates D-17 (`stages`).

### D-43 Settings JSON

`workflow` (`WorkflowToggles`), `quote_approval`, `features.*`, `defaultPaymentSchedule`, `numbering` — D-07, D-16, D-17, D-23.

### D-44 `QuoteLineItem` fields that never reach the database

`vendorIds?` (copied from the price book item; no column — only `vendor_id` is stored, `app.ts:813`), `parseConfidence?` (AI parse confidence, `app.ts:827-833`), `createdByName?` (joined from profiles, `app.ts:819`). They exist in memory only and are lost on reload.

---

## 3. 2.0 — tables and JSON

All in `lib/db/schema.ts` (Drizzle, libSQL), history `drizzle/0000…0037` (journal `drizzle/meta/_journal.json`, idx 0…37; `0037` uncommitted). One studio, no `studio_id`, no RLS, timestamps in unix seconds, money in integer cents unless stated. `fixtures/baseline.json` snapshots the 48 tables named in `BASELINE_TABLES` (`lib/db/baseline.ts:17`); every quote table below is in that list.

### D-50 `quotes` (2.0) — every column (`schema.ts:242-307`)

| Column | Type | Null / default | Migration | Written by | Notes |
|---|---|---|---|---|---|
| `id` | text | PK | `0004_faulty_magma.sql:40-50` | `createQuote` (`randomUUID`, `app/leads/quotes-actions.ts:62-128`) | |
| `lead_id` | text | NOT NULL → `leads` CASCADE | 0004 | | index `quotes_lead_idx`; a quote always has a lead |
| `number` | text | NOT NULL | 0004 | `nextNumber` (`quotes-actions.ts:33-53`) | `"OM-10001"` or the studio's pattern (D-61); **no unique index** |
| `title` | text | NOT NULL | 0004 | `createQuote` = the lead's name; `saveQuoteGeneral` keeps the last non-empty title (`app/quotes/actions.ts:45-68`) | |
| `amount_minor` | integer | NOT NULL | 0004 | `sync` after every line / pricing write (`app/quotes/items-actions.ts:35-43`) | = `quoteTotals().totalMinor` — stored, always derived (REG-403) |
| `visibility` | text | NOT NULL `'Private'` | 0004 | insert only | `Private · Shared`, a Quotes-tab column; no writer changes it |
| `status` | text | NOT NULL `'Draft'` | 0004 | `sendQuote`, `reviseQuote`, `sendQuoteForConfirmation`, `confirmQuoteOnline` (`app/quotes/actions.ts:83-151`), `setQuoteStatus` (`quotes-actions.ts:224-240`) | D-160 |
| `created_at` | integer ts | NOT NULL | 0004 | | |
| `due_at` | ts | | `0006_wakeful_apocalypse.sql:1` | `setQuoteDue` (`quotes-actions.ts:248-273`) | raises the follow-up task (D-59) |
| `sent_at` | ts | | `0006:2` | the first move to Sent for Approval / Sent to Client / Confirmed | cleared by Revise |
| `updated_at` | ts | | `0006:3` | every write | a Signed quote's signed date is read from it (`fetchStageDocuments`, `quotes-actions.ts:293-303`) |
| `approved_at` | ts | | `0006:4` | `setQuoteStatus` → Approved | cleared by Revise |
| `archived_at` · `deleted_at` | ts | | `0006:5-6` | `archiveQuote` · `deleteQuotes` (soft) (`quotes-actions.ts:276-311`) | |
| `prepared_by` | text | | `0013_free_warbound.sql:1` | `createQuote` (the signed-in member), `saveQuoteGeneral` | `members.id`; `{prepared_by}` |
| `valid_until` | ts | | `0013:2` | `createQuote` (the template's `validityDays`, else 30 days, `lib/quotes/refs.ts:6, 25-27`) | |
| `project_ref` | text | | `0013:3` | `createQuote` (`projectRef()`, `refs.ts:19-23`: family / yyyymmdd / day sequence) | |
| `nric` · `customer_id` | text | | `0013:4-5` | copied from `leads.ic_number` / `customer_id` at creation (REG-607) | |
| `property_type` · `site_address` | text | | `0013:6-7` | copied from the lead at creation | |
| `version` | integer | NOT NULL 1 | `0013:8` | `reviseQuote` +1 (`actions.ts:105-120`) | |
| `sections` | text JSON | | `0013:9` | `saveQuoteSections` | D-63 |
| `template_id` | text | | `0014_old_the_hood.sql:10` | `createQuote` | no FK |
| `template_version` · `client_view_json` | integer · text | | `0022_friendly_wasp.sql:26-27` | `createQuote`; the update banner; Preview | templates D-38 |
| `additional_discount_mode` · `additional_discount_value` | text NOT NULL `'pct'` · real NOT NULL 0 | | `0015_flimsy_phantom_reporter.sql:45-46` | `updateQuotePricing` (`items-actions.ts:442-465`) | `pct · amount`; the amount is in **dollars** (`math.ts:120` multiplies by 100) |
| `gst_enabled` | boolean | NOT NULL true | `0015:47` | same | the GST switch |
| `issuing_entity` | text | | `0015:48` | same | an `IssuingEntity.name`; null = the studio |
| `items_view` · `items_density` · `items_columns` · `items_labels` | text | `'none'` · `'single'` · null · null | `0015:49-52` | `updateItemsPrefs` (`items-actions.ts:466-477`), `createQuote` (density `'double'`, columns from the template) | D-63 |
| `files_visible` | boolean | NOT NULL true | `0017_absurd_snowbird.sql:10` | `setQuoteFilesVisible` (`app/quotes/files-actions.ts:83`) | |
| `terms_html` · `notes_html` · `terms_visible` · `notes_visible` | text · text · bool · bool | · · true · true | `0018_lowly_dakota_north.sql:10-13` | `saveQuoteText` · `setQuoteTextVisible` (`app/quotes/text-actions.ts:29-42`); `createQuote` seeds the template's texts | the quote's own T&Cs and notes |
| `client_signature_required` | boolean | NOT NULL true | `0019_youthful_clea.sql:4` | `setClientSignatureRequired` (`app/quotes/signature-actions.ts:32-35`) | |
| `created_by` | text | | `0021_cooing_grey_gargoyle.sql:2` | `createQuote` | `members.id`; the Creator column |
| `discounts_json` | text JSON | | `0028_round1_quotes.sql:30` | `updateQuotePricing` | `NamedDiscount[]` (D-63) |
| `revised_at` | ts | | `0028:31` | `reviseQuote` | |
| `confirmed_at` · `confirmed_by` | ts · text | | `0029_studio_requests.sql:19-20` | `confirmQuoteOnline`; `setQuoteStatus` → Confirmed stamps `confirmed_at` | the name the client typed |
| `client2_name` · `client2_nric` | text | | `0029:21-22` | `saveQuoteGeneral` | a second client |

Other writes: `duplicateQuote` copies the row, its lines, payments and file links under a new number (`quotes-actions.ts:183-203`); `applyTemplateDefaults` rewrites validity, GST, signature, texts, columns, view and the schedule on a Draft (`:134-181`).

### D-51 `quote_items` — every column (`schema.ts:452-494`)

| Column | Type | Null / default | Migration | Notes |
|---|---|---|---|---|
| `id` | text | PK | `0015:15-44` | |
| `quote_id` | text | NOT NULL → `quotes` CASCADE | 0015 | index `quote_items_quote_idx` |
| `parent_id` | text | null | 0015 | no FK; a group holds items and one level of sub-groups (REG-558) |
| `kind` | text | NOT NULL `'item'` | 0015 | `item · group` — a section is a row |
| `position` | integer | NOT NULL 0 | 0015 | sibling order, renumbered 0…n (`items-actions.ts:45-55`) |
| `name` | text | NOT NULL | 0015 | |
| `description` · `description_html` | text · text | | 0015 · `0028:29` | the plain text is `htmlToPlain(description_html)` (`items-model.ts:165-170`) |
| `thumb` · `thumb_count` | text · integer NOT NULL 0 | | 0015 | a photo path; the "1/2" badge |
| `icon` | text | | 0015 | an `ITEM_KINDS` glyph when there is no photo |
| `status` | text | NOT NULL `'Pending'` | 0015 | `Pending · Approved · Declined` — the client's answer per line; a group's answer is its children's |
| `qty` | real | NOT NULL 1 | 0015 | |
| `unit` | text | null | 0015 | `UNITS` or any string |
| `cost_minor` · `markup_minor` | integer | NOT NULL 0 | 0015 | per unit, cents; unit price = cost + markup; a price-book insert rounds the markup to `quote_rules.roundStep` (`items-actions.ts:140, 168, 382`) |
| `discount_pct` | real | NOT NULL 0 | 0015 | 0–100 |
| `gst_pct` | real | NOT NULL 9 | 0015 | per line; applies only while `quotes.gst_enabled` |
| `room` · `category` · `section` | text | | 0015 | labels for View by |
| `visibility` | text | NOT NULL `'visible'` | 0015 | `visible · hidden · no-price` |
| `collapsed` | boolean | NOT NULL false | 0015 | a group folded |
| `price_book_item_id` | text | | 0015 | no FK; the price book's usage count reads it (`lib/company/price-book.ts:20-23`) |
| `optional` | boolean | NOT NULL false | `0022:13` | printed in its own section, out of every total (REG-492) |
| `print_as` · `print_as_text` | text | | `0028:25-26` | D-164 |
| `highlight` | text | | `0028:27` | D-167 |
| `no_number` | boolean | NOT NULL false | `0028:28` | the numbering skips the line |
| `print_one_line` | boolean | NOT NULL false | `0029:17` | a section printed as one line (REG-585) |
| `rebate_minor` | integer | NOT NULL 0 | `0029:18` | per unit, Owners only, never printed (`math.ts:116`) |
| `created_at` · `updated_at` | ts | NOT NULL · null | 0015 | |

Every write ends in `sync`, which recomputes `quotes.amount_minor` (`items-actions.ts:35-43`).

### D-52 `quote_payments` (`schema.ts:406-421`, `0016_short_silver_surfer.sql:1-15`)

`id`, `quote_id NOT NULL → quotes CASCADE`, `position integer NOT NULL 0`, `name NOT NULL`, `description`, `pct real NOT NULL 0`, `due_kind text NOT NULL 'estimate'` (`approval · estimate · fixed`), `due_at`, `created_at NOT NULL`, `updated_at`; index `quote_payments_quote_idx`. Amounts are never stored — `paymentAmounts` = total × pct, the last row absorbing the rounding when the shares sum to 100 % (`lib/quotes/payments.ts:61-66`). Estimated dates spread over the renovation from the lead's start date and the property's length (`withEstimates`, `:94-103`; `RENOVATION_WEEKS`, `:79-80`); the first row of a split is `approval` (`splitRows`, `:106-108`). Written by `createQuote` (the template's `paymentPreset`, else `'default'`, `quotes-actions.ts:112-115`) and `app/quotes/payments-actions.ts:56-110`; `quote_rules.paymentLock` keeps it to Owners and Admins (`components/quotes/editor/quote-editor.tsx:94`; `quotes-actions.ts:153`).

### D-53 `quote_versions` (2.0) (`schema.ts:314-326`, `0028:11-22`)

templates D-37: `id`, `quote_id NOT NULL → quotes CASCADE`, `version integer NOT NULL`, `snapshot_json text NOT NULL`, `note`, `created_by`, `created_at`; index `quote_versions_quote_idx`. Written only by `reviseQuote` (`actions.ts:105-120`): a Draft never sent is refused; the snapshot is `{quote, items, payments}` as Drizzle rows (camelCase keys); the quote then moves to `version + 1`, `Draft`, `sent_at = approved_at = null`, `revised_at = now`. Read back by `reviveSnapshot` (`lib/templates/queries.ts:154-161`), which turns string values of keys ending `At` and `validUntil` into dates; `lib/quotes/diff.ts:14-26` counts added / removed / changed lines against the last kept version.

### D-54 `quote_files` (`schema.ts:354-362`, `0017:1-9`)

`quote_id NOT NULL → quotes CASCADE`, `file_id NOT NULL → lead_files CASCADE`, `created_at NOT NULL`; no primary key; index `quote_files_quote_idx`. The quote never owns a file — it points at the lead's files (`app/quotes/files-actions.ts`). **2.0 only** (no 1.0 counterpart, D-20).

### D-55 `quote_text_templates` — the quote side (`schema.ts:368-379`)

templates D-32. What the quote editor adds: a template's `body` is **copied** into `quotes.terms_html` / `notes_html` with its tokens resolved at that moment (`resolveTokens`, `lib/quotes/text.ts:32-36`; tokens `[Client Full Name] · [Studio Name] · [Studio Phone Number] · [Team Member Full Name]`, `:19-28`); later edits to the template never reach the quote.

### D-56 `price_book_items` (`schema.ts:429-443`)

templates D-35: `id`, `name NOT NULL`, `description`, `kind NOT NULL 'purchase'` (`ITEM_KINDS`), `unit NOT NULL 'Pieces'`, `cost_minor`, `markup_minor` (cents), `category`, `thumb`, `vendor` (`0029:16`; "the same product from two vendors is two entries", `schema.ts:439`), `created_at`, `updated_at`, `deleted_at` (`0030:1`). No SKU, spec URL, notes, tags, approval or tier columns.

### D-57 `price_book_sections` (`schema.ts:333-345`)

templates D-36 (`SavedSection` JSON in `lines_json`), plus `property_type` and `tags` (`0037_price_book_section_filters.sql:1-2`; tags a JSON array of at most 8 words, `items-model.ts:138-143`). `saveSectionToPriceBook` copies a group with its lines and one level of sub-sections (`items-actions.ts:347-367`); `insertPriceBookSection` inserts it whole (`:368-402`).

### D-58 `contracts` · `contract_bundles` — the quote-side links

`contracts.from_quote_id` (text, no FK, `0026_lonely_enchantress.sql:17`) names the quote a contract was raised from; `contracts.bundle_id` (`0029:15`) groups contracts under one signing link; `contract_bundles` (`0029:1-13`) has no quote column. A contract prints the quote it names, else the lead's Signed quote, else the latest (`pickQuote`, `lib/contracts/queries.ts:62-63`). Signing a contract or a bundle (`app/contracts/actions.ts:134-…, 217-230`) never changes `quotes.status`; it raises `quote_signed` (D-60). The Contracts audit owns the rest.

### D-59 `lead_tasks` — the quote's follow-up (`schema.ts:159-180`)

`lead_tasks.quote_id → quotes SET NULL` (`0021:1`). `setQuoteDue` (`quotes-actions.ts:248-273`) keeps **one open task per quote**: title `Follow up on quote {number}`, kind `Follow-up` (`TASK_KINDS`, `lib/leads/enums.ts:46`), due on the date, assigned to `prepared_by` (else the session member) through `task_assignees`, description naming the quote; moving the date moves the task, clearing it deletes the task while it is open.

### D-60 `notifications` — quote kinds (`schema.ts:601-615`, `0032_notifications.sql:1-17`)

Columns: `id`, `member_id NOT NULL → members CASCADE`, `kind NOT NULL`, `title NOT NULL`, `body`, `href`, `lead_id`, `quote_id`, `channels NOT NULL 'in_app'` (comma list), `actor_id`, `created_at NOT NULL`, `read_at`; index `(member_id, created_at)`. Quote kinds: `quote_approval` (raised by `sendQuote` when the quote goes for approval, to `approverIds()` = Owners, Admins and the backup approver, `lib/notifications/approvers.ts:8-11`), `quote_confirmed` (`confirmQuoteOnline`, to the lead's members, the Owners / Admins and the creator), `quote_signed` (contracts and bundles), `task_assigned` (`setQuoteDue`). Which channels carry each is `settings.notification_rules` (leads D §2.1; `lib/notifications/model.ts:13-40`).

### D-61 Settings keys the quote editor reads (`settings (key, value JSON, updated_at)`, `schema.ts:231-235`)

| Key | Shape (`lib/settings/types.ts`) | Unset | Reader (`lib/settings/queries.ts`) |
|---|---|---|---|
| `quote_approval` | `'required' \| 'not-required'` (`:32-43`) | `required` | `fetchQuoteApproval` (`:17-24`); `quoteStatuses()` drops Sent for Approval and Approved when not required (`lib/leads/quote-filters.ts:19-24`) |
| `quote_rules` | `{roundStep: 0 · 1 · 5 · 10, paymentLock, backupApproverId, preparedBy: 'member' · 'team' · 'studio'}` (`:122-131`) | all off, `member` | `fetchQuoteRules` (`:75-82`); `isApprover` = Owner · Admin · the backup approver (`:85-90`); `roundToStep` rounds the selling price by moving the markup (`types.ts:133-138`) |
| `quote_numbering` | `Numbering {prefix, initials, yearMonth, next, digits, commercial {on, prefix, next}}` (`:76-102`) | `OM-` + highest + 1 | `fetchNumbering` (`:44-51`); `nextNumber` writes `next` back on every issue (`quotes-actions.ts:39-53`) |
| `trades` | `string[]` (≤ 60, `:105-107`) | the categories in use on quotes | `fetchTrades` (`:53-61`) |
| `trade_notes` | `Record<lower-case trade, note ≤ 600>` (`:110-115`) | `{}` | `fetchTradeNotes` (`:63-73`), only for trades still listed |
| `studio` | `{name, gstRegistered, phone}` (`:46-51`) | `Demo Studio Pte Ltd`, true, '' | `fetchStudio` (`:26-33`) |
| `brand` | `{kit, details}`; `details.entities: IssuingEntity[]` (`lib/templates/model.ts:47-52`: `name, bankName, accountName, accountNo, payNow, payNowQr, gstRegistered, swift, logo, address, uen, gstReg`) | the default brand | templates D-40; the quote's `issuing_entity` names one entity |
| `template_approval` | templates D-40 | | |

### D-62 `members` — signature and role (`schema.ts:89-107`)

`role` (`Owner · Admin · Manager · Designer`), `email` (`0028`, `{prepared_by_email}`), `signature_kind` (`draw · type · null`), `signature_name`, `signature_data` (an SVG path, M / L commands only, viewBox 752 × 140) (`0019_youthful_clea.sql:1-3`; written by `saveMemberSignature`, `app/quotes/signature-actions.ts:16-30`). One signature per member, live — no per-quote freeze.

### D-63 JSON columns on `quotes`

- `sections` — `QuoteSectionState[] {key: general · items · payment · files · terms · notes · signature · activity, collapsed}` (`lib/quotes/sections.ts:7-9`), parsed defensively with the fixed three pinned (`:43-65`).
- `items_columns` — `ColumnSettings {details {description, images, autonumber}, columns [{key, on}]}` over 23 `COLUMN_KEYS` (`items-model.ts:47-63`); only 13 render (`RENDERABLE_COLUMNS`, `:56`) — `sku`, `msrp`, `color`, `dimensions`, `materials`, `shipping`, `shippingMarkup`, `taxable`, `vendor`, `website` have no stored field on a line.
- `items_labels` — `{categories, rooms, sections}` string lists (≤ 50 each, `:78-85`).
- `discounts_json` — `NamedDiscount[] {id, label ≤ 60, mode: pct · amount, value}` (≤ 10, `lib/quotes/math.ts:27-38`); applied after the additional discount, each on what is left (`:119-126`).
- `client_view_json` — `ClientView` (templates D-43).

### D-64 What 2.0 derives instead of storing

- **Totals** (`quoteTotals`, `lib/quotes/math.ts:109-134`): the lines that count are items not Declined (nor under a Declined group), not optional and not printing a word (`counts`, `:54`); subtotal = Σ `qty × (cost + markup) × (1 − discount%)` rounded per line; discount = Σ line discounts; additional = the additional discount + the named discounts on what is left; GST per line on its share of the net, none on an `On behalf` line; total = net + GST; cost includes FOC / Inclusive / Packaged lines (`bearsCost`, `:52`) less rebates; margin = net − cost. `quotes.amount_minor` stores the total.
- **Payment amounts** (D-52), **line numbers** (`numberItems`, `math.ts:170-183`: `1`, `1.1`, `1.1.1`, `no_number` skipped), **Activity** (`deriveQuoteActivity`, `lib/quotes/activity.ts:11-22`: created, lines, schedule, files, sent, approved, versions), **a Signed quote's date** (`updated_at`, D-50), **the lead's quote state** (from its quotes; no mirror column).

---

## 4. The diff

### 4.1 Table map

| Id | 1.0 table / store | 2.0 table / store | Verdict | Note |
|---|---|---|---|---|
| D-70 | `quotes` (D-01) | `quotes` (D-50) | **same (reshaped)** | 1.0's per-lead quote settings (document discount, GST, entity, validity, header fields) land on each quote row (D-101); the lead's mirror of the primary quote goes (D-78) |
| D-71 | `quote_line_items` (D-02) | `quote_items` (D-51) | **rename + split** | sections become `kind 'group'` rows (D-104); dollars → cents; selling price → cost + markup |
| D-72 | `quote_versions` (D-03) | `quote_versions` (D-53) | **same name, different grain** | 1.0 = autosave snapshots per lead; 2.0 = one kept version per Revise per quote (templates D-61) |
| D-73 | `quotes.payment_schedule` (JSON, D-30) | `quote_payments` rows (D-52) | **split** (JSON → rows) | percent rows only; due dates are 2.0 only |
| D-74 | `quote_status_history` (D-05) | stamps `sent_at` · `approved_at` · `revised_at` · `confirmed_at` + derived Activity | **missing** (as a log) | 2.0 keeps no transition log; `lead_events` (`schema.ts:967-978`) has no quote kinds |
| D-75 | `quote_packages` + `client_selections` (D-04) | — | **Later** | write-only in 1.0 (templates D-60) |
| D-76 | `quote_signature_requests` (D-06) | `contracts` · `contract_bundles` (signing), `quotes.confirmed_*` (confirmation), `quote_versions` (a frozen copy) | **split** | the Contracts audit owns signing (templates D-66) |
| D-77 | approval stores (D-07) | `settings.quote_approval` · `quote_rules.backupApproverId` · `members.role` · notification `quote_approval` | **merge** | no per-member rule, no approver list, no thresholds, no approval task |
| D-78 | `leads.quote_status` · `signature_request_id` · `contract_uploaded` · `contract_file_name` + the sync triggers | — | **derived** | 2.0 reads a lead's quote state from its quotes |
| D-79 | `leads.quote_metadata` (D-36) | `quotes` columns + `quote_items` groups + the template pin | **split** (per lead → per quote) | D-101, D-104; templates D-166 |
| D-80 | `leads.quote_hierarchy_metadata` (D-37) | `quote_items` group rows | **superseded** | legacy in 1.0 since `189` |
| D-81 | `leads.quote_data` (D-38) | — | **dead** | |
| D-82 | `leads.ic_number · customer_id · quote_valid_until · property_address · property_type · company_id` | `quotes.nric · customer_id · valid_until · site_address · property_type · issuing_entity` | **split** (lead → each quote) | 2.0 copies them at creation; the lead keeps its own (leads D) |
| D-83 | `studio_price_book` (D-09) | `price_book_items` (D-56) | **rename** (narrower) | D-108 |
| D-84 | `price_book_pricing_tiers` (D-10) | — | **missing in 2.0** | |
| D-85 | `price_book_history` (D-11) | — | **Later** | an audit trail of price edits |
| D-86 | `price_book_suggestions` (D-12) | — | **Platform / AI** | the matcher's queue |
| D-87 | `vendors` (D-13) | `price_book_items.vendor` (text) | **merge** (name only) | the directory is Finance's (Later) |
| D-88 | `studio_quote_categories` (D-14) | `settings.trades` + `settings.trade_notes` | **merge** | templates D-70d; the map's R1 |
| D-89 | `studio_assemblies` (D-15) | `price_book_sections` (D-57) | **rename** | templates D-58, templates D-165 |
| D-90 | `payment_schedule_templates` + `settings.defaultPaymentSchedule` (D-16) | `payment_templates` (templates D-33) | **rename + merge** | two 1.0 defaults → one 2.0 library |
| D-91 | numbering (D-17) | `settings.quote_numbering` | **2.0 only** (a counter) | 1.0 counts max + 1 on every create |
| D-92 | `studio_companies` + `leads.company_id` (D-18) | `settings.brand.details.entities[]` + `quotes.issuing_entity` | **merge** | per lead → per quote, linked by name (templates D-68, templates D-126) |
| D-93 | `member_signatures` + `quotes.prepared_by_signature` (D-19) | `members.signature_*` (D-62) | **merge** (format change) | the frozen copy is missing (templates D-140) |
| D-94 | line comments · quote notes (D-20) | — · `quotes.notes_html` | **missing** (comments) | |
| D-95 | line photos (`image_url`, bucket `quote-images`) | `quote_items.thumb` · `thumb_count` | **same** (a path) | storage is the platform's |
| D-96 | share link · view count · OTP limiter (D-21) | `/confirm/[quoteId]` (by id, no token) | **missing (partial)** | templates D-65, templates D-139 |
| D-97 | quote notification events (D-22) | `notifications` kinds (D-60) | **same purpose, other events** | delivery rows are not studio data (leads D §3.4) |
| D-98 | — | `quote_files` (D-54) · `quotes.due_at` + `lead_tasks.quote_id` (D-59) · `quotes.confirmed_*` · `client2_*` · `quote_items.status · visibility · optional · rebate_minor · print_one_line` | **2.0 only** | |
| D-99 | VO links, X-Ray, market data, copilot (D-24, D-25) | — (`quote_comparisons` for X-Ray) | **Later / Platform** | other audits |

### 4.2 Column-level diffs

**D-100 · `quotes` (1.0) → `quotes` (2.0)**

| 1.0 column | 2.0 column | Note |
|---|---|---|
| `id` uuid | `id` text | the UUID string, so a re-run is `INSERT OR IGNORE` (templates §5) |
| `project_id` | — | **Later** (Projects). A row with `lead_id` NULL (a project-only variation) cannot land: `quotes.lead_id` is NOT NULL (D-50) |
| `studio_id` | — | one studio |
| `lead_id` (soft) | `lead_id` NOT NULL, FK CASCADE | the lead is ported first (leads D §3.4) |
| `label` (default `'Quote'`) | `title` NOT NULL | the label as typed; the untouched default `'Quote'` → the lead's name, as 2.0's `createQuote` titles a quote |
| `quote_number` (nullable) | `number` NOT NULL | verbatim (`QT-012`); a NULL takes 103's rule (the studio's next `QT-###` by `created_at`) |
| `quote_type` | — | `standard`, `ai_generated` → an ordinary quote; `variation` → **Later** (D-210) |
| `status` (enum) | `status` (text) | §4.3 |
| `is_primary` | — | **derived**: 2.0 has no primary; the contract's quote is `from_quote_id`, else the Signed one (D-58) |
| `is_omission` | — | **Later** (variation orders) |
| `subtotal · discount · tax · total` (integer) | — | **dead** |
| `total_cents` | `amount_minor` | cents → cents; 2.0 recomputes it from the lines on the first write; the 1.0 value is the port's check figure (D-242) |
| `subtotal_cents · discount_cents · tax_cents` | — | **derived** (`quoteTotals`, D-64) |
| `payment_schedule` | `quote_payments` rows | D-105 |
| `doc_sections` | the template pin (templates D-166) and `terms_html` / `notes_html` (D-239) | |
| `parsed_doc_metadata` | `project_ref` ← `refNumberOverride ?? refNumber` | the source quote's header (`vendor`, `date`, `issuedBy`, `subTotal`, `discount`, `grandTotal`) and `__layout` have no 2.0 home |
| `rejection_comment` | — | **missing**: 2.0 has no Rejected state (D-143) |
| `notes` | `notes_html` (as `<p>…</p>`) | only when non-empty and nothing else fills `notes_html`; no 1.0 editor writer (D-01) |
| `valid_until` (date) | `valid_until` (ts) | the fallback only: the 1.0 editor's value is `leads.quote_valid_until` (D-101) |
| `preview_token · preview_token_created_at · preview_view_count` | — | **missing** (templates D-139) |
| `created_by` (profiles) | `created_by` (members.id) | profile → member |
| `submitted_by` | `prepared_by` | the author; `created_by` when NULL (1.0's own fallback for the signer, `transition/route.ts:236-244`) |
| `prepared_by_signature` | — | **missing**: 2.0 draws the member's live signature (templates D-140) |
| `signed_at` | `updated_at` (for a Signed quote) | 2.0 reads the signed date from `updated_at` (D-50); a real column is D-188 |
| `created_at` · `updated_at` | `created_at` · `updated_at` | unix seconds |

**D-101 · 1.0 lead-level quote fields → the 2.0 quote row.** Every quote of the lead takes the same value — what 1.0 printed on each.

| 1.0 (on the lead) | 2.0 (on each quote) | Note |
|---|---|---|
| `quote_metadata.docDiscount {type, value}` | `additional_discount_mode` (`percent → pct`, `flat → amount`) · `additional_discount_value` | same units: a flat value in dollars both sides (`math.ts:120`). templates D-166 wrote it to `discounts_json` instead; both give the same total, because named discounts apply after the additional one on what is left (`math.ts:119-126`) — only the printed label differs. A variation never took it (`line-items/route.ts:718`) |
| `quote_metadata.gstEnabled` | `gst_enabled` | null → the entity's `gst_registered` (1.0's rule, `app.ts:43-44`) |
| `company_id` | `issuing_entity` | the entity's **name** (`IssuingEntity.name`); NULL = the studio |
| `quote_valid_until` | `valid_until` | else `quotes.valid_until`, else `created_at` + 30 days |
| `ic_number` | `nric` | |
| `customer_id` | `customer_id` | |
| `property_address` | `site_address` | |
| `property_type` | `property_type` | 2.0 accepts only `PROPERTY_TYPES` (`app/quotes/actions.ts:58`) — the Leads port's mapping applies |
| `quote_metadata.portalSharedQuotes[quote id]` | `visibility = 'Shared'` | else `'Private'` |
| `quote_metadata.categoryOrder · sectionDescriptions · subsectionDescriptions · subsectionTotalLabels · subsectionOrder` | `quote_items` group rows | D-104 |
| `quote_metadata.canvaBlocks · canvaOverrides · layoutOverrides · themeOverrides` | `template_id` · `template_version` · `client_view_json` | templates D-166 |
| `quote_status` · `signature_request_id` · `contract_uploaded` · `contract_file_name` | — | derived (D-78) |
| `quote_hierarchy_metadata` | group rows | only when `quote_metadata` holds no order (D-104) |

**D-102 · 2.0 quote columns with no 1.0 column — what the port writes**

| 2.0 column | Port value |
|---|---|
| `visibility` | D-101 |
| `due_at` | NULL — 1.0 quotes have no due date |
| `sent_at` | the first `quote_status_history` row to `submitted` or `approved`; else the earliest signature request's `created_at`; else, for any status past Draft, `updated_at` |
| `approved_at` | the last history row to `approved`; else, for `approved` and later, `updated_at` |
| `archived_at` · `deleted_at` | NULL (1.0 deletes outright) |
| `project_ref` | `refNumberOverride ?? refNumber ?? projectRef(property_type, created_at, day sequence)` (`lib/quotes/refs.ts:19-23`) |
| `version` | the kept version rows ported for the quote + 1 (D-106) |
| `sections` · `items_columns` · `items_labels` | NULL (the defaults) |
| `items_view` · `items_density` | `'none'` (the sections are rows) · `'double'` (R28's default) |
| `template_id` · `template_version` · `client_view_json` | templates D-166 |
| `files_visible` · `terms_visible` · `notes_visible` · `client_signature_required` | true |
| `terms_html` · `notes_html` | D-239 |
| `discounts_json` | NULL |
| `revised_at` | the last ported version's `created_at` |
| `confirmed_at` · `confirmed_by` | NULL (the legacy `accepted` status aside, D-147) |
| `client2_name` · `client2_nric` | NULL — 1.0 has no second client |

**D-103 · `quote_line_items` → `quote_items`** (every 1.0 column; extends templates D-76)

| 1.0 column | 2.0 column | Note |
|---|---|---|
| `id` | `id` | |
| `quote_id` | `quote_id` | |
| `lead_id` · `studio_id` | — | through the quote |
| — | `parent_id` · `kind` | the line's section group (D-104); `'item'` |
| `sort_order` | `position` | rank within its group, renumbered 0…n |
| `name` | `name` NOT NULL | `name`, else the first line of `description`, else `'Item'` |
| `description` · `description_html` | `description` · `description_html` | 2.0's editor writes bullets, bold, underline; 1.0 tags outside that set stay in the HTML |
| `item_id` | — | **missing** (D-190) |
| `category` | `category` | also the group's name |
| `subcategory` | a child group (D-104); or `room` | `room` where a studio used sub-categories as rooms (`features.price_book_subcategory_in_quote` off, D-23) |
| `price_type` · `amount_marker` | `print_as` · `print_as_text` | D-164 |
| `unit_price` (selling, $) · `cost_price` (per unit, $) | `cost_minor` · `markup_minor` (per unit, cents) | cost = `cost_price × 100`; markup = `(unit_price − cost_price) × 100`. No cost: cost 0 and markup = the price (margin reads 100 %), or cost = the price and markup 0 (margin 0 %) — either keeps the printed price |
| `qty` numeric(12,2) | `qty` real | |
| `unit` | `unit` | free text kept; 1.0's `lot` / `set` defaults vs 2.0's `Lot` / `set` spelling |
| `total` · `margin_percent` · `tax_amount` · `discount_amount` | — | **derived**; `total` is the port's per-line check |
| `ai_suggestion` · `source` · `price_snapshot_at` · `competitor_benchmark_cents` · `competitor_source` | — | not ported (AI / provenance / X-Ray, D-219) |
| `comments` | — | **missing** (D-194) |
| `discount_type` · `discount_value` | `discount_pct` | `percent` → the value; `flat` → `value / (qty × unit_price) × 100` (the cents can move by one) |
| `discount_label` | — | **missing** (D-191); 2.0 labels only quote-level named discounts |
| `tax_inclusive` | — | **missing**: the ported price is `unit_price / (1 + rate)` (D-192) |
| `tax_rate` (0.09) | `gst_pct` (9) | × 100; NULL → 9; the quote's `gst_enabled` carries the switch |
| `is_optional` | `optional` | 1.0 **counted** optional lines unless the default template's Optional Works section excluded them (`resolveOptionalWorksRule`, `src/lib/quote-total.ts:22-48`, used at `line-items/route.ts:700-703`); 2.0 never counts them (Q-11) — a total can move (D-242) |
| `package_tier` | — | **Later** (packages) |
| `price_book_item_id` | `price_book_item_id` | the ported price-book id (the same UUID string) |
| `waste_percent` | — | **missing**: folded into `qty` (the printed quantity changes) or into the price (the printed rate changes) (D-193) |
| `cost_type` | `icon` | `labor → labour`, `material → purchase`; else null |
| `vendor_id` | — | **missing** on a line (D-195) |
| `image_url` | `thumb` (`thumb_count` 1) | the URL kept |
| `notes` · `spec_url` | — | **missing** (D-196) |
| `created_by` | — | **missing** (D-197) |
| `ref_override` | `no_number` when `'-'` or `' '` | other refs lost (templates D-138) |
| `is_omission` | — | **Later** (a credit line) |
| `highlight_color` | `highlight` | D-167 |
| `quantity` · `amount` · `order_index` (path a) | — | dead |
| `created_at` · `updated_at` | same | |
| — | `status` | `Pending` for Draft / Sent for Approval quotes, `Approved` for the rest (repair R23's rule, `scripts/repair-demo-data.ts:549`) |
| — | `visibility` · `collapsed` · `print_one_line` · `rebate_minor` | `'visible'` · false · false · 0 |

**D-104 · Sections: 1.0 strings + lead JSON → 2.0 group rows**

1. **Order of sections:** `quote_metadata.categoryOrder` first, then every other category in the order its first line appears (`sort_order`) — 1.0's own rule (`app.ts:53-64`); when `quote_metadata` holds no order, `quote_hierarchy_metadata.sections[].orderIndex` (189's source).
2. **A section** = each distinct non-empty `category` → one top-level `quote_items` row `kind 'group'`, `name` = `category` = the category, `description` = `sectionDescriptions[category]` (1.0's studio default `studio_quote_categories.description` stays in `settings.trade_notes` and prints when the group writes none — the map's R1), `status` as D-103.
3. **A sub-section** = each distinct `(category, subcategory)` → a child group (`parent_id` = the section), ordered by `subsectionOrder[category]`, then first appearance; `description` = `subsectionDescriptions["category|sub"]`; `print_as_text` = `subsectionTotalLabels["category|sub"]` (the word beside its sub-total, REG-555's group use).
4. **Declared but empty** sub-sections (`subsectionOrder` names with no line) → empty child groups.
5. **Lines with no category** → top-level items.
6. Depth: 2.0 nests one group inside another (REG-558) — the same two levels 1.0 has.
7. `quotes.items_view = 'none'`, so the table shows the groups as rows.

**D-105 · `quotes.payment_schedule` → `quote_payments`**

| 1.0 (`QuotePaymentMilestone`) | 2.0 | Note |
|---|---|---|
| `id` (`pm-1` …) | `id` | a new UUID — 1.0 ids repeat across quotes |
| array index | `position` | |
| `name` | `name` | |
| `trigger` | `description` | 1.0's four default triggers equal 2.0's `DEFAULT_MILESTONES` descriptions word for word (`lib/leads/stage-data.ts:49-54`) |
| `notes` | — | appended to `description`, or dropped |
| `percent` | `pct` | |
| `type 'fixed'` · `amountCents` | — | **missing** (templates D-132; held for Finance, Q-16): lands as `pct = amountCents / total_cents × 100` (a share frozen at port time) or waits for the columns of templates D-132 (here D-185) |
| — | `due_kind` · `due_at` | first row `approval` (no date), the rest `estimate` with `withEstimates` dates (`payments.ts:94-108`) |

An empty 1.0 schedule printed the studio's default (D-06); 2.0 needs rows (repair check "live quote with no payment schedule", `scripts/repair-demo-data.ts:1117`), so the port writes the default `payment_templates` split.

**D-106 · `quote_versions` (1.0) → `quote_versions` (2.0)** — templates D-73, plus:
- 1.0 rows carry no `quote_id` in practice (D-03): each is attributed to the lead's primary quote (the one the digitizer saved), or to its only quote.
- Grain: 1.0 keeps autosave snapshots (one per 30 s at most); 2.0 keeps one row per Revise. The port can take every row, only the rows where `quote_status` changed, or none; `quotes.version` = the rows kept + 1.
- Each snapshot converts like live lines (D-103, D-104) with its own `quote_metadata_snapshot` (else `hierarchy_snapshot`) for order and notes and its `payment_milestones` through D-105, into `snapshot_json {quote, items, payments}` with camelCase keys and ISO strings for dates (D-53). `totals` is a check only; `change_summary` → `note`; `quote_status` → `quote.status` through §4.3.

**D-107 · `quote_signature_requests` (quote side) → 2.0**

| 1.0 | 2.0 | Note |
|---|---|---|
| `status 'signed'` · `signed_at` | quote `status 'Signed'`, `updated_at = signed_at` | and, for the Contracts audit, a `contracts` row `source 'uploaded'`, `file_name` = the signed PDF's name, `status 'Signed'`, `signed_at`, `signed_by = client_name`, `from_quote_id`, `recipient_name / recipient_phone` |
| `status 'pending' · 'viewed'` | quote `Sent to Client` (§4.3) | the link itself is not ported |
| `status 'expired' · 'cancelled'` | — | no effect on the quote |
| `quote_snapshot` | a `quote_versions` row with the signed lines | keeps what was signed if the quote is revised later |
| `payment_schedule` (frozen split, cents) | — | the live `quotes.payment_schedule` is what lands (D-105); the frozen copy survives only inside that version row |
| `quote_total` (dollars) | — | a check figure against `amount_minor` |
| `quote_ids[]` · `signing_mode 'bundle'` | — | `contract_bundles` groups contracts, never quotes |
| `selected_quote_id` (variations) | that quote Signed; the others stay Approved | |
| `company_id` | the quote's `issuing_entity`, when it differs from the lead's | |
| `prepared_by_display` | — | 2.0 resolves `{prepared_by}` at print (`quote_rules.preparedBy`) |
| `client_selections` | — | dead (D-04) |
| `signature_data` · `signer_*` · hashes · `audit_trail` · `documents` · `document_acknowledgements` · `verification_method` · `signed_pdf_url` · `signed_packet_path` · `token` · `expires_at` | — | the Contracts audit / Later (templates D-158) |

**D-108 · `studio_price_book` → `price_book_items`** (every column; extends templates D-79)

| 1.0 | 2.0 | Note |
|---|---|---|
| `id` | `id` | |
| `studio_id` | — | |
| `name` · `description` | `name` NOT NULL · `description` | `name ?? description`; `description` kept when both exist |
| `category_id` | `category` | the category's name |
| `subcategory` | — | **missing** (and not in 1.0's DDL at HEAD, D-09) |
| `unit_price` · `cost_price` · `markup_percent` | `cost_minor` · `markup_minor` | cost = `cost_price × 100`, else `unit_price / (1 + markup_percent / 100)` when a markup is set, else 0; markup = selling − cost |
| `unit` | `unit` NOT NULL | NULL → `'Pieces'` |
| `source` · `external_ref` | — | not ported |
| `market_rate_min` · `market_rate_max` · `embedding` | — | Platform |
| `is_active` false | `deleted_at` | |
| `tags` · `notes` · `spec_url` · `item_id` · `waste_percent` · `order_index` · `created_by` | — | **missing** (D-198) |
| `image_url` | `thumb` | |
| `cost_type` | `kind` | `labor → labour`, `subcontractor → labour`, `material → purchase`, `combined → purchase`; `design · fee · delivery` have no 1.0 source |
| `vendor_ids[]` (else `vendor_id`) | `vendor` | the vendor's `name`; n vendors → n rows, one per vendor (2.0's rule, `schema.ts:439`); lines keep the first row's id |
| `approval_status` · `approved_by` · `approved_at` · `approver_user_id` | — | **missing**: `approved` and `pending` land live (1.0 lets a pending item be used, `114:4-5`), `rejected` lands with `deleted_at` |
| `created_at` · `updated_at` | same | |
| tiers (D-10) | — | **missing** (D-181) |

**D-109 · `vendors` → `price_book_items.vendor`** — the name only; `company_name`, `phone`, `email`, `trade`, `bank_*`, `notes`, `is_active`, `kind`, `default_markup_percent` belong to Finance (Later).

**D-110 · Approval, numbering and the editor's settings → 2.0 settings**

| 1.0 | 2.0 | Note |
|---|---|---|
| `settings.workflow.quoteApprovalRequired` | `settings.quote_approval` | `false` → `'not-required'`, anything else → `'required'` |
| `settings.workflow.approvers.quoteApproval[]` | `quote_rules.backupApproverId` | one member who is not an Owner / Admin fits; more → the first, the rest lost (D-199) |
| `studio_members.workflow_overrides` · `permission_overrides.actions.quotes` | — | **missing**: 2.0 is role-based |
| `settings.quote_approval` (thresholds) | — | dead (D-07) |
| `features.lock_quote_actions_until_approved` | — | **superseded** in part: with approval required, `sendQuote` takes a Draft to Sent for Approval and only an Approved quote on to the client (`actions.ts:83-97`); the row menu's `setQuoteStatus` checks only that Approved is set by an approver (`quotes-actions.ts:224-240`) |
| `branding.quotePreparedByMode` | `quote_rules.preparedBy` | `team_list → team`, `studio_only → studio`, `first_assignee → member` (Q-25) |
| `features.fee_first_milestones` · `features.price_book_subcategory_in_quote` | — | missing (D-105, D-103) |
| `defaultPaymentSchedule` | a `payment_templates` row, named as the studio's default in `defaults_json.paymentPreset` | |
| (no numbering setting) | `quote_numbering` | `{prefix: 'QT', digits: 3, next: highest + 1, initials: false, yearMonth: false, commercial: {on: false, …}}` so new quotes continue the 1.0 series; left unset, 2.0's default reads `QT-012` as 12 and issues `OM-13` (`quotes-actions.ts:41-44`) |
| `studio_quote_categories` | `trades` · `trade_notes` | templates, the map's R1 |
| `studio_companies` | `brand.details.entities[]` | templates D-77 |
| — | `quote_rules.roundStep` · `paymentLock` | 2.0 only; off |

**D-111 · `member_signatures` / `quotes.prepared_by_signature` → `members.signature_*`** — a stored PNG (drawn or uploaded) cannot become 2.0's SVG path: the port writes `signature_kind 'type'`, `signature_name` = the member's name, or leaves it unset; `auto_apply` and `consent_at` are missing (2.0 always shows the preparer's signature); the per-quote frozen copy is missing (templates D-140).

**D-112 · `quote_status_history` → 2.0** — the first `submitted` row → `sent_at`; the last `approved` row → `approved_at`; `revise` rows → `revised_at` (with D-106); `reject` rows and every `comment` have no home (2.0 has no Rejected state and no quote kinds in `lead_events`) unless D-180 is built.

### 4.3 Status mapping (1.0 → 2.0)

2.0's lifecycle is `Draft → Sent for Approval → Approved → Sent to Client → Confirmed → Signed`, the two approval statuses only where `settings.quote_approval = 'required'` (`lib/leads/quote-filters.ts:10-24`). A quote holding a status the studio's list lacks lands on the last step it passed (`quoteStepIndex`, `:30-36`). The port sets `quote_approval` from the studio's workflow (D-110) before it writes statuses.

**`quotes.status` (enum `quote_status`, D-01)**

| Id | 1.0 status | Written by (1.0) | 2.0 status | What the port writes |
|---|---|---|---|---|
| D-140 | `draft` | create; `revise`; `PATCH …/records/[id]`; the `103` backfill | `Draft` | `sent_at` NULL, `approved_at` NULL; lines `Pending` |
| D-141 | `submitted` | `submit` by a non-approver (`transition/route.ts:163-203`) | `Sent for Approval` | `sent_at` = that history row's `created_at` (else `updated_at`); `prepared_by` = `submitted_by` |
| D-142 | `approved` | `approve`; `submit` by an approver or with approval off; cancel-signature; the demote of an older signed base quote (`307:132-140`) | `Approved` | `approved_at` = the last history row to `approved` (else `updated_at`); `sent_at` = the first submit / approve; lines `Approved`. With approval off 1.0 went Draft → approved on one press — 2.0 keeps `Approved` (its `sendQuote` sends an Approved quote on, `actions.ts:88`) |
| D-143 | `rejected` | `reject` (comment required) | `Draft` | 2.0 has no Rejected state; the reject note (history `comment`, `quotes.rejection_comment`, `leads.quote_data.rejectionComment`) lands nowhere unless D-180 / D-189 is built |
| D-144 | `sent_for_signature` | `request-signature` | `Sent to Client` | `sent_at` = the open request's `created_at`; the request itself → D-107 |
| D-145 | `client_signed` | `finalize_signed_mirror` | `Signed` | `updated_at` = `quotes.signed_at` (else the request's `signed_at`) — 2.0's signed date; `approved_at` as D-142; lines `Approved`; the Won stage log's `wonQuote` names it (leads D) |
| D-146 | `sent` (in the enum since `001`, unused since `102:10-13`) | none found | `Sent to Client` | `sent_at` = `updated_at` |
| D-147 | `accepted` (same) | none found | `Confirmed` | `confirmed_at` = `updated_at`, `confirmed_by` NULL |
| D-148 | `expired` (same) | none found | `Sent to Client` | 2.0 has no Expired; a past `valid_until` says it |

**Other status fields**

| Id | 1.0 field | Values | 2.0 | Port |
|---|---|---|---|---|
| D-149 | `leads.quote_status` | `none · draft · submitted · approved · rejected · sent_for_signature · client_signed` (+ NULL, `304`) | — | not ported: derived from the quotes (D-78); `none` / NULL = a lead with no quote |
| D-150 | `quote_signature_requests.status` | `pending · viewed · signed · expired · cancelled` | the quote's status | `pending · viewed` → the quote `Sent to Client`; `signed` → `Signed`; `expired · cancelled` → no change (D-107) |
| D-151 | `tasks.approval_status` (QuoteApproval) | `pending · approved · rejected` | — | a `pending` task = the quote at `Sent for Approval`; the task row is not ported (D-223) |
| D-152 | `quote_type` | `standard · ai_generated · variation` | — | `variation` → Later (D-210) whatever its status |
| D-153 | line status | — (1.0 has none per line) | `Pending · Approved · Declined` | from the quote: `Draft` / `Sent for Approval` → `Pending`; later statuses → `Approved` (D-103) |
| D-154 | `studio_price_book.approval_status` | `pending · approved · rejected` | — | D-108 |
| D-155 | `quote_packages` / `client_selections` | — | — | Later / dead (D-04) |

### 4.4 Enums and units

| Id | Concept | 1.0 | 2.0 | Mapping |
|---|---|---|---|---|
| D-160 | Quote status | enum `draft · sent · accepted · rejected · expired · submitted · approved · sent_for_signature · client_signed` (`001:63-65`, `102:21-24`) | `Draft · Sent for Approval · Approved · Sent to Client · Confirmed · Signed` (`quote-filters.ts:10`) | §4.3 |
| D-161 | Quote type | `standard · variation · ai_generated` (`app.ts:852`) | — | D-152 |
| D-162 | Line kinds | none — every row is a line; a section is the `category` string | `item · group` (`schema.ts:458`) | D-104 |
| D-163 | Price type | `amount · foc · kiv · inclusive · by_client · lump_sum · content_block` (`app.ts:730`) | `print_as` (`PRINT_AS`, `items-model.ts:101`) | D-164 |
| D-165 | Discount | line `none · percent · flat` + `discount_label`; document `percent · flat` (per lead) | line `discount_pct`; quote `pct · amount` + named `pct · amount` | D-103, D-101 |
| D-166 | Tax | `tax_rate` fraction (0.09) per line + `tax_inclusive`; entity `tax_rate`; region default; GST on / off per lead | `gst_pct` percent (9) per line; `gst_enabled` per quote; `IssuingEntity.gstRegistered` | × 100; inclusive prices converted (D-103) |
| D-167 | Highlight | a palette name (`yellow #FFEEC2 · pink #FBE4DC · green #D4EFD9 · blue #DBE0F2 · brandBlue #1E5AA8 · orange #FEE0BC · gray #E5E5E5`, all row **fills**, `src/lib/quote-canva/highlight-palette.ts:25-67`) or `#rrggbb` | `accent · red · grey` (ink) · `light · band` (fill) (`items-model.ts:126-130`) | the six pale fills → `light`; `brandBlue` → `band`; a hex → `light` when light, `band` when dark; the exact colour becomes the brand kit's |
| D-168 | Units | free text; DB default `'lot'` (`031:10`), transformer default `'set'` | free text; the picker's `Pieces · Lot · sqft · ft run · point · hour · set` (`items-model.ts:22`); line NULL = "Add Unit Type"; price book default `Pieces` | kept as typed |
| D-169 | Cost type / item kind | `material · labor · subcontractor · combined` (default `combined` on the price book) | `design · fee · labour · delivery · purchase` (`items-model.ts:15`) | D-108 (`kind`), D-103 (`icon`) |
| D-170 | Line source | `manual · template · ai_drafted · ai_estimated · parsed · price_book · market_rate · web_estimated · needs_pricing` (`290:24-26`) | — | not ported |
| D-171 | Package tier | `essential · premium · luxury` | — | Later |
| D-172 | Payment milestone | `type percent · fixed` (+ `amountCents`); `trigger` free text; templates' triggers `contract_signed · work_started · milestone_completed · project_completed · custom_date`; the signing snapshot's `triggerEvent deposit · start · midway · handover · custom` | `pct` only; `due_kind approval · estimate · fixed` — a kind of **date**, not of amount (`payments.ts:14`) | D-105 |
| D-173 | Signing | `signing_mode single · bundle · variations`; request status D-150 | contracts `Draft · Sent to Client · Signed`; bundles | D-107 |
| D-174 | Line visibility / answer | — | `visibility visible · hidden · no-price`; `status Pending · Approved · Declined` (`items-model.ts:4, 25`) | 2.0 only |
| D-175 | Numbering | `QT-###` / `VO-###`, 3-digit pad, max + 1 per studio | `OM-` + max + 1 by default, or `PREFIX[-initials][-yyyymm]-n` with a padding and a commercial series (`types.ts:76-102`) | D-110 |
| D-176 | Money | `quotes.*_cents` BIGINT cents; lines, price book, tiers, versions' JSON, `quote_signature_requests.quote_total`, `QuotePaymentMilestone` none (percent) — **dollars** `NUMERIC(12,2)` (price book `unit_price` unscaled `NUMERIC`); `competitor_benchmark_cents` and schedule `amountCents` cents | integer cents (`*_minor`); `additional_discount_value` and a named discount's `value` in dollars when `amount` | dollars × 100, rounded once per value; cents unchanged |
| D-177 | Quantities and percents | `qty numeric(12,2)`; `margin_percent`, `markup_percent`, `waste_percent`, `discount_value` numeric(5,2) / (12,2) | `qty`, `discount_pct`, `gst_pct`, `pct` as `real` | numeric → real |
| D-178 | Ids · time | UUID; `timestamptz`; `date` for `valid_until` / `quote_valid_until` | text; unix seconds (`valid_until` a timestamp at the day's start) | the UUID string; `Date.parse(ts) / 1000` |
| D-179 | Print-as words and their counting | see D-164 | | |

**D-164 · Price type and amount marker → Print as.** The words and whether a line counts differ in two places; the right-hand columns say what moves.

| 1.0 line | In 1.0's totals | Cost in 1.0's margin | 2.0 `print_as` (`print_as_text`) | In 2.0's totals | Cost in 2.0's margin |
|---|---|---|---|---|---|
| `amount_marker 'foc'` (prints "F.O.C.") or `price_type 'foc'` | no | yes | `foc` (prints "FOC") | no | yes |
| `'inclusive'` (either field) | no | yes | `inclusive` | no | yes |
| marker `KIV` or `price_type 'kiv'` | no | yes | `kiv` | no | **no** |
| marker `Packaged` | no | yes | `packaged` | no | yes |
| marker `ON BEHALF` | **no** | yes | `behalf` → **counts, no GST** (totals move) · or `custom` + `'ON BEHALF'` (totals kept) | yes · no | no |
| `price_type 'by_client'` | no | yes | `custom` + `'By client'` | no | **no** |
| any other marker word (≤ 24 chars) | no | yes | `custom` + the word | no | **no** |
| `price_type 'lump_sum'` | **yes** | yes | NULL (a priced line; unit `Lot`) | yes | yes |
| `price_type 'content_block'` | not a line (migrated to inline inserts on read, `transformers.ts:1105-…`) | — | not ported (templates D-76) | — | — |

1.0's rule: a marked row or a non-amount price type leaves every total but keeps its cost in the margin (`isDeliberateNoCharge`, `src/lib/quote-calc.ts:20-23`; `computeLineTotals` `:79-114`; `computeQuoteTotals` `:363-368`). 2.0's: only FOC, Inclusive and Packaged keep their cost in the margin (`bearsCost`, `math.ts:52`); `behalf` counts (`math.ts:49-54, 130`).

---

## 5. Port plan

A port is a one-shot import of one 1.0 studio's quote rows into the 2.0 tables, run after the Leads port (leads, members, lead files — leads D §3.4) and the Templates port (`settings.brand`, payment and text templates, price-book sections, quote templates — templates §5). Ids keep the 1.0 UUID strings, so a re-run is `INSERT OR IGNORE`; every `*_by` becomes a `members.id`; times are `Date.parse(ts) / 1000`; money is dollars × 100 → `*_minor`, cents unchanged (D-176). Nothing below is built until the owner marks it.

### 5.A New 2.0 tables (keep 1.0 names)

Everything the 1.0 quote editor stores and prints already has a home in 2.0 — a table, a JSON column, a settings key or a derived value (§4.1) — except the two below. Each is conditional, with an alternative that needs no table.

| Id | 1.0 table | Why 2.0 would need it | Columns to carry | Alternative |
|---|---|---|---|---|
| D-180 | `quote_status_history` (D-05) | The only record of who submitted, approved, rejected or revised a quote and the reviewer's note. 2.0 keeps the last `sent_at` / `approved_at` and has no Rejected state (D-112, D-143) | `id` text PK, `quote_id → quotes CASCADE`, `from_status`, `to_status` (2.0 words, §4.3), `action` (`submit · approve · reject · revise`), `actor_id` (members.id), `comment`, `created_at`; index `(quote_id, created_at)` | four new `lead_events` kinds — `quote_submitted · quote_approved · quote_rejected · quote_revised` with `detail {quoteId, number, comment}` — on the existing log (`lib/leads/events.ts:11`) |
| D-181 | `price_book_pricing_tiers` (D-10) | Volume breaks, a price per quantity band; 2.0 holds one price per item | `id`, `price_book_item_id → price_book_items CASCADE`, `min_qty real`, `max_qty real` (NULL = open), `cost_minor`, `markup_minor` (from `unit_price` / `cost_price`), `created_at` | one price-book entry per band, the range in its name |
| D-182 | — | Not new tables: `quote_signature_requests` (the Contracts audit, templates D-66), `quote_packages` (Later, D-212), `vendors` (Finance, D-221), `price_book_history` (Later, D-220); `quote_versions` exists (D-106) | | |

### 5.B Columns to add to existing 2.0 tables

| Id | 2.0 table | 1.0 source | 2.0 column | Type / unit | Note |
|---|---|---|---|---|---|
| D-185 | `quote_payments` | `QuotePaymentMilestone.type` · `amountCents` | `kind`, `amount_minor` | text · cents | templates D-132; fixed rows held for Finance (Q-16). Without it a fixed row lands as a frozen percent (D-105) |
| D-186 | `quotes` | `preview_token` · `preview_token_created_at` · `preview_view_count` | same names | text · ts · integer | templates D-139 |
| D-187 | `quotes` | `prepared_by_signature` | `prepared_by_signature` (JSON text; templates D-140 calls it `prepared_by_signature_json`) | JSON | templates D-140 |
| D-188 | `quotes` | `signed_at` | `signed_at` | ts | 2.0 reads a Signed quote's date from `updated_at` (D-50), which any later write moves; 1.0 stamps it once (`307:123-127`) |
| D-189 | `quotes` | `rejection_comment` (+ `leads.quote_data.rejectionComment`) | `rejection_comment` | text | the reviewer's last note on a quote sent back to Draft (D-143); or D-180 |
| D-190 | `quote_items` | `item_id` | `item_id` | text | the SKU; backs the `sku` column key that stores nothing today (D-63) |
| D-191 | `quote_items` | `discount_label` | `discount_label` | text ≤ 60 | the line discount's printed word |
| D-192 | `quote_items` | `tax_inclusive` | `tax_inclusive` | bool | only if prices entered with GST in them are to stay so; else the port converts (D-103) |
| D-193 | `quote_items` | `waste_percent` | `waste_percent` | real | only if 1.0's effective-quantity rule is kept; else folded (D-103) |
| D-194 | `quote_items` | `comments` (`LineComment[]`, D-34) | `comments` (JSON text) | JSON | internal notes per line, never printed |
| D-195 | `quote_items` | `vendor_id` (→ `vendors.name`) | `vendor` | text | 1.0's id points at a `vendors` row 2.0 does not have, so the name is what survives — the same word as `price_book_items.vendor`; backs the `vendor` column key |
| D-196 | `quote_items` | `notes` · `spec_url` | `notes` · `spec_url` | text | `spec_url` backs the `website` column key |
| D-197 | `quote_items` | `created_by` | `created_by` | members.id | who added the line |
| D-198 | `price_book_items` | `item_id` (unique per studio), `spec_url`, `notes`, `tags`, `waste_percent`, `order_index`, `created_by`, `approval_status · approved_by · approved_at` | same names (`tags` JSON) | | each only where the Price book port needs it; approval needs a reviewer flow 2.0 does not have |
| D-199 | `settings.quote_rules` | `workflow.approvers.quoteApproval[]` | `approverIds: string[]` (widening `backupApproverId`) | JSON | 1.0 names any number of approvers; 2.0 one backup |
| D-200 | `quotes` | `parsed_doc_metadata` (the digitised source quote) | `parsed_doc_metadata` (JSON text: the header without `__layout`, D-32) | JSON | the uploaded PDF's name and header; 2.0 keeps a source file's name as `source_file` on `quote_templates` (templates D-130) |
| D-201 | `quote_items` | `ref_override` | `ref_override` | text | templates D-138 |

`features.lock_quote_actions_until_approved` gets no column: with approval required, 2.0's Send already routes a Draft through approval (D-110).

### 5.C Not ported

| Id | 1.0 table / column | Reason |
|---|---|---|
| D-210 | quotes with `quote_type 'variation'`, `quotes.is_omission`, `quote_line_items.is_omission`, and the links into them (`variation_orders.quote_id`, `project_invoices.linked_vo_id`, the floor-plan `linked_vo_quote_id`, D-24) | **Later** (Finance, Projects): 2.0 has no variation orders |
| D-211 | quotes with `lead_id` NULL (`project_id` only) | **Later** (Projects): a 2.0 quote needs a lead |
| D-212 | `quote_packages`, `quote_signature_requests.client_selections`, `quote_line_items.package_tier` | **Later**; write-only or never written in 1.0 itself (D-04) |
| D-213 | the signing artefacts on `quote_signature_requests` — token, OTP, signature image, hashes, audit trail, documents, acknowledgements, packet, signed PDF | the Contracts audit / **Later** (templates D-158); the quote keeps its status (D-107) |
| D-214 | the share token, `preview_view_count`, `otp_rate_limits` | **Platform**, unless D-186 is built |
| D-215 | `leads.quote_status · signature_request_id · contract_uploaded · contract_file_name`, `quotes.is_primary`, the `trg_sync_*` triggers, `set_primary_quote_atomic`, `finalize_signed_mirror` | **superseded**: 2.0 derives a lead's quote state (leads D §3.4) |
| D-216 | `leads.quote_data`, `leads.quote_metadata.paymentMilestones`, `quotes.subtotal · discount · tax · total` (integer), path (a)'s `quantity · amount · order_index` | **dead** |
| D-217 | `studios.settings.quote_approval` — the thresholds and Flo's `{enabled, required_roles}` | **dead**: stored, never enforced (D-07) |
| D-218 | `studio_members.workflow_overrides`, `permission_overrides.actions.quotes`, `studio_roles.permissions.actions.quotes` | **superseded** by 2.0's roles (`Owner · Admin · Manager · Designer`) and `isApprover` |
| D-219 | `ai_suggestion`, `source`, `price_snapshot_at`, `competitor_benchmark_cents · competitor_source`, `price_book_suggestions`, `studio_price_book.embedding · market_rate_min · market_rate_max`, `platform_market_rates`, `crowd_rate_signals`, `market_quote_observations`, `copilot_shadow_quote_items` | **Platform / AI** |
| D-220 | `price_book_history` | **Later**: 2.0 keeps no edit log for the price book |
| D-221 | `vendors` beyond the name | **Later** (Finance) |
| D-222 | `notifications` rows for quote events | not a studio's data: delivery records (leads D §3.4) |
| D-223 | `tasks` rows `type 'QuoteApproval'` | **superseded** by the `Sent for Approval` status and the `quote_approval` notification (D-60) |
| D-224 | `quote_versions.doc_sections · hierarchy_snapshot · quote_metadata_snapshot · totals` | read during conversion (D-106), not kept (templates D-152) |
| D-225 | the stored designs — `quotes.doc_sections`, `leads.quote_metadata.canvaBlocks · canvaOverrides · layoutOverrides · themeOverrides`, `parsed_doc_metadata.__layout` | **superseded** by the template pin (templates D-154, templates D-166) |
| D-226 | `quote_signature_requests.prepared_by_display` | **superseded**: `{prepared_by}` resolves at print by `quote_rules.preparedBy` |
| D-227 | `member_signatures` images | format: a PNG does not become 2.0's SVG path (D-111) |
| D-228 | `studio_sequences` | not a quote store (D-17) |
| D-229 | the stored objects — `quote-images`, `signed-quotes`, `shared-quotes`, `member-signatures`, `price-book-images` | **Platform**; a URL is kept where a 2.0 column holds one (`quote_items.thumb`) |

### 5.D How a 1.0 quote lands in 2.0

In this order, because of the references:

| Id | Step | Rows written | Rules |
|---|---|---|---|
| D-230 | Settings | `quote_approval`, `quote_rules`, `quote_numbering`, `trades`, `trade_notes` | D-110; templates D-127 / the map's R1 |
| D-231 | Price book | `price_book_items` (one row per vendor), `price_book_sections` (packages) | D-108, D-109; templates D-165 |
| D-232 | Pick the quotes | — | `lead_id` set and `quote_type` ≠ `variation`; the rest logged and skipped (D-210, D-211) |
| D-233 | The quote row | `quotes` | D-100, D-101, D-102 — number verbatim, title from the label, the lead-level fields copied onto every quote of the lead, `visibility` from the portal share, `project_ref` |
| D-234 | Sections, then lines | `quote_items` | groups first (D-104), then lines in `sort_order` (D-103); `price_book_item_id` kept; `status` from the quote |
| D-235 | The schedule | `quote_payments` | D-105; an empty schedule → the studio's default split |
| D-236 | Status and stamps | `quotes.status · sent_at · approved_at · updated_at · confirmed_at` | §4.3, from `quotes.status`, `quote_status_history` and the signature requests |
| D-237 | Versions | `quote_versions`, `quotes.version · revised_at` | D-106 — every row, the status changes only, or none |
| D-238 | The signature request | the quote's status; optionally a `contracts` row and a `quote_versions` row | D-107 |
| D-239 | The quote's texts | `quotes.terms_html` · `notes_html` | `terms_html` ← the v1 layout's `terms_conditions` section, else the studio's default `tnc` body as 1.0 printed it (tokens rewritten, templates D-167); `notes_html` ← the layout's remarks or notes section, the `payment_terms` prose that is not the structured split, else `quotes.notes`; a canva body's text blocks stay in the pinned template (templates D-162) |
| D-240 | The design | `quotes.template_id · template_version · client_view_json` | templates D-166 |
| D-241 | Left empty | `quote_files`, `due_at` and its follow-up task, `confirmed_*` (but D-147), `client2_*` | 1.0 has no source for them |
| D-242 | Check each quote | — | 2.0's `quoteTotals()` against 1.0's `total_cents`, logging each difference and its cause: optional lines 1.0 counted (D-103); `ON BEHALF` ported as `behalf` (D-164); flat line discounts turned into percents; `tax_inclusive` prices; `waste_percent`; an entity rate other than 9 %; a `docDiscount` 1.0 did not apply to a variation; per-line `tax_rate` overrides; a stored `total` that disagrees with its inputs. The version rows' `totals` and a signed request's `quote_total` check the same way |
| D-243 | After | — | the lead's Won stage log names its Signed quote (leads D §3.4); repair R20's quote checks (`scripts/repair-demo-data.ts:1091-1120`: a creator, a project ref and validity, a line's answer equal to its group's, a schedule, terms and notes on a priced quote) pass on ported rows because D-102, D-103, D-235 and D-239 fill them |
| D-244 | What changes in the data | — | each quote of a lead holds its own copy of what 1.0 kept once per lead (discount, GST, entity, validity, section order and notes); the lead's quote mirror, the primary flag and the Rejected state are gone; numbering continues the `QT-` series |

### 5.E Demo data — 1.0 seeds vs 2.0 seeds and repairs

| Id | 1.0 seed (`path:lines`) | What it writes | 2.0 counterpart | Fit |
|---|---|---|---|---|
| D-245 | none: no seed inserts `quotes` or `quote_line_items` (grep of `scripts/` and both migration sets finds only RPC bodies and the data moves `20260415000002:5-27`, `103:32-75`) | — | `scripts/seed-overview.ts:28-32` (`OM-10001`, Draft, S$70,500, for Olivia Martinez) and repair R21–R30 (`scripts/repair-demo-data.ts:454-707`): prepared-by / property / address, the three templates, eight price-book items and every priced quote's lines scaled to its amount in Kitchen · Bathrooms · Bedrooms groups with one Declined line on OM-10008, schedules, a file, terms and notes, the signed-in member's signature, refs and validity, creators | 2.0's rule — every visible state backed by its records (REG-343) — has no 1.0 equivalent |
| D-246 | demo leads with a `quote_status` and no quote row: `083_seed_demo_studios.sql:133, 205`; Flo `scripts/tenants/flo-design/seed.mjs:290-325` (`none · draft · approved`) | the lead mirror only | — | the "advanced status, zero quote rows" shape `304:28-31` found on prod; 2.0's repair check "Quote Sent / Won lead with no quote" (`repair-demo-data.ts:1100`) refuses it |
| D-247 | QuoteApproval tasks: `083:362, 374`; Flo `100_seed_flo_design.sql:492` | pending approvals | — | not ported (D-223) |
| D-248 | `062_seed_chart_of_accounts.sql:87-95` | `Standard 4-Stage` 10 / 40 / 40 / 10 for every studio then existing | R35 (`:862-881`): the four presets `default` 10 / 30 / 30 / 30 · `20-40-40` · `30-70` · `50-50` | different splits |
| D-249 | `090:329-338` (15 categories); `scripts/seed/seed-default-pricebook.mjs:1-25` with `catalogue-sg-default.mjs` (16 categories, 195 items, `source 'platform-default'`, SG studios with an empty price book, dry run unless `--write`); Flo `seed-pricebook.mjs:1-18` (16 categories, ~170 items, cost ≈ 70 % of price, `source 'flo-seed'`) | trades and a price book | R23 (`:480-497`): 8 items with cost and markup in cents, a kind and a category; R38 (`:883-906`): vendor names on 3 rows (`Floor Xpert`, `Hafary`, `Soon Bee Huat` — two rows for one tile) and the saved section `pbs-bathrooms-full-works`; `settings.trades` unset (read from the lines) | 10 items against 195 / ~170 |
| D-250 | `063_seed_finance_demo_data.sql:85-…` | 5 Arthaus vendors | R38's three vendor names | name only |
| D-251 | Flo `100:42`, `seed.mjs:125` | `settings.quote_approval {enabled: true, required_roles: [owner, admin]}` | `quote_approval` unset → `required` | the 1.0 key is dead (D-217) |
| D-252 | Flo `100:789-790` | a `quote.signature_requested` notification | R40 (`:918-934`): `new_lead` rows and a `quote_confirmed` row for the latest confirmed quote | |
| D-253 | `20260414000004_seed_market_rates.sql` | platform market rates | — | Platform |
| D-254 | — | — | R24 schedules, R25 a file per priced quote, R26 the studio phone + the text library (`TEMPLATE_SEED`) + terms and notes, R27 the typed signature, R28 refs / validity / density, R30 creators, R36 member emails + the FOC rule on OM-10008, R42 the follow-up kind | 2.0 only |
| D-255 | — | — | `fixtures/baseline.json` (taken 2026-09-24T11:58Z): `quotes` 7 (Signed 3 · Approved 3 · Draft 1), `quote_items` 158 (135 items · 23 groups; no `print_as` line), `quote_payments` 28 (7 `approval` · 21 `estimate`), `quote_versions` 0, `quote_files` 1, `quote_text_templates` 6, `price_book_items` 10, `price_book_sections` 1, `payment_templates` 4, `contracts` 4 (none with `from_quote_id`), `contract_bundles` 0, `notifications` 2 (`new_lead`), `lead_tasks` 23 (none with `quote_id`), `settings` 5 (`stage_movement · studio · brand · lead_reasons · lead_capture` — no quote key) | a port would add rows to every one of these |

## Uncertain / not verified

- **Which creation path each 1.0 database took for `quote_line_items`** (006 first or 031 first, D-02): it decides whether the dead `quantity · amount · order_index` columns exist and whether `lead_id` / `studio_id` are NOT NULL. Read from the migration files; no live database was queried.
- **`restore_quote_version` looks broken at run time** (D-03): it inserts lines without `quote_id` (NOT NULL since `104`), inserts `quote_status_history` columns `157` does not define (`243:121-128`, also `186:95-101`), and compares the enum with `''` in `COALESCE(q.status, '')` (`243:109`). Each would raise on a database with 104 and 157. Not executed.
- **`payment_schedule_templates.config`** is selected by `request-signature` (`route.ts:443`) and created by no migration; if PostgREST rejects the select, the studio's template is skipped and the platform 10 / 30 / 30 / 30 applies. Not executed.
- **`studio_price_book.subcategory`** is typed and mapped, but its DDL lives only on commit `8c2e961a2`, not an ancestor of `67f42e469` (D-09); a live database may or may not have the column.
- **Grep-based "never" claims**: `quote_versions.quote_id` never written (D-03), `quote_packages` never read and `client_selections` never stored (D-04), `settings.quote_approval` thresholds never enforced (D-07), `quoteLinkExpiryDays` never used for a link (D-21; this contradicts templates D-14), no writer of the integer totals (D-01). An external job, SQL console or a branch not at HEAD could still touch them.
- **The four status triggers on `quotes`** coexist per the files (D-01); whether any environment dropped one by hand is unknown.
- **Optional lines in 1.0's `total_cents`** follow the default template's legacy `layout.totals.optionalWorksSection` merged with the lead's `layoutOverrides` (`src/lib/quote-total.ts:22-48`), not the canva pricing table's optional mode (templates MM-09), so a canva-designed quote can print a total that differs from `total_cents`. Not traced end to end.
- **Which optional lines a client accepted when signing** cannot be recovered: the selection was never stored (D-04); only the signed PDF and `quote_total` hold its effect.
- **Statuses `sent`, `accepted`, `expired`**: no writer found and `103:13` reports every row `draft` at the time; rows holding them are unlikely, not ruled out (D-146…D-148).
- **History-derived stamps** (D-102): status moves through `PATCH …/records/[id]`, the signing routes and `finalize_signed_mirror` leave no history row, so many ported quotes will take `updated_at` for `sent_at` / `approved_at`.
- **The `cost_type → kind / icon` mapping** (D-103, D-108) is a proposal; 1.0 ties no meaning between them.
- **`leads.quote_metadata` keys**: two keys outside the `QuoteMetadata` type were found (`portalSharedQuotes`, `paymentMilestones`); a full census of keys in the wild needs a live database.
- **`quote_line_items.total`** includes the line's GST only on rows saved with an effective tax rate (D-02); rows written by RPCs or older paths hold other figures. It is a check value, not a port input.
- **2.0's default numbering** reads `max(cast(substr(number, 4) as integer))` (`app/leads/quotes-actions.ts:42`); a ported `QT-012` would feed 12 into the `OM-` series (D-110). Read from the SQL, not run.
- **2.0 is a moving target**: the working tree carries the uncommitted quote-template rounds (REG-617…619: `0037`, `quote_rules.preparedBy`, `trade_notes`, the wider `IssuingEntity`); the baseline figures (D-255) are from `fixtures/baseline.json`, not `local.db`.

