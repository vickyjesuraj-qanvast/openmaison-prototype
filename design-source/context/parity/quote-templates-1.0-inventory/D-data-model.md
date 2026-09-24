# OpenMaison 1.0 ↔ 2.0 — Quote template module inventory · Slice D: the data model

Sources: 1.0 `/Users/vicky/Documents/GitHub/qanvast-id-tool` `67f42e469` (two migration sets + types + docs/DATABASE_SCHEMA.md); 2.0 `/Users/vicky/Documents/GitHub/openmaison-prototype` (schema.ts, drizzle, lib/templates). Read 2026-09-24. Nothing in either repo was modified; no script was run; no `.env` was read.

## 0. Conventions

**Effective 1.0 schema = the union of both migration sets**, cross-checked against `src/types/database.ts` (the runtime row contract), `src/types/app.ts` (the UI shapes) and `src/lib/transformers.ts` (row ↔ app). `supabase/migrations/` (102 dated files) carries the quote v2 work (`20260414…`, `20260415…`, `20260419…`, `20260513…`) that the production set never copied back; `scripts/migrations/` (381 numbered files) carries everything the template editor reads (`117`, `132`, `166`…`170`, `176`, `178`, `183`…`186`, `191`, `192`, `197`, `198`, `204`, `242`, `246`, `270`, `280`, `302`, `305`) plus the RLS locks (`213`, `222`, `223`, `226`, `230`, `264`). The first ~25 files are the same content under both numberings (`006_projects.sql` ≡ `20240101000006_projects.sql`, `012_rls.sql` ≡ `20240101000013_rls.sql`). Where a later migration changes a column, the DDL history row of the table says which one. `docs/DATABASE_SCHEMA.md` is the pre-v2 picture — its discrepancies are listed per table and in §Uncertain.

**Id · time · money.** 1.0: `uuid DEFAULT gen_random_uuid()` keys, `timestamptz`, money as `NUMERIC(12,2)` dollars on quote lines / price book and `BIGINT` `*_cents` on `quotes`; every studio table carries `studio_id` and, since `226_lock_tenant_tables.sql`, a `scoped` RLS policy keyed on the JWT's `studio_id` claim (`FORCE ROW LEVEL SECURITY`, `anon` revoked, `service_role` bypasses). 2.0: `text` keys written by the server action, `integer` unix **seconds** (`{ mode: 'timestamp' }`), money as `integer` cents (`*_minor`), one studio and no tenant column (`settings` key/value rows stand in for `studios.settings`), no RLS. Points (pt) are 1.0's document unit; millimetres (mm) are 2.0's (`lib/templates/model.ts:14-16`, `MM_PX = 96 / 25.4`).

**Verdicts** (§4.1): *same* · *rename* · *merge* (several 1.0 things → one 2.0 thing) · *split* (one → several) · *missing in 2.0* · *2.0 only* · *Later* (a 1.0 feature outside the Leads / Quotes / Templates scope the owner has marked) · *Platform* (Qanvast-side rows, never a studio's data) · *dead* (a 1.0 column or key nothing reads any more) · *code* (a 1.0 table whose 2.0 counterpart is a constant in code, not a row).

**Ids.** `D-01`…`D-23` = 1.0 tables (§1); `D-30`…`D-43` = 2.0 tables and JSON (§3); `D-50`… = table-map rows (§4.1); `D-70`… = column diffs (§4.2); `D-90`… = JSON-concept rows (§4.3). Column names are quoted verbatim.

---

## 1. 1.0 — tables

### D-01 `studio_document_templates` — the document templates (Quote PDF · T&C · Contract · Signing flow · Timeline · Portal · Invoice · PO · VO)

**Purpose.** One row per (studio, entity, type, name); the Accounts › Document Templates tab (`src/app/(main)/accounts/page.tsx:1369-1375`) edits every kind; the Quote Designer's gallery lists the `quote_pdf` rows; the `is_default` `quote_pdf` row is the studio's quote design (resolution chain in `166_doc_templates_per_entity.sql:14-17`: entity row → studio-wide row → built-in fallback).

**DDL history** (`scripts/migrations/` only — the supabase set never had it):

| Migration | Change |
|---|---|
| `117_studio_document_templates.sql:21-55` | CREATE TABLE; `type` CHECK `('quote_pdf','tnc','contract','signing_flow','timeline','portal')`; `UNIQUE (studio_id, type, name)`; index `idx_doc_templates_studio_type (studio_id, type, is_active)`; partial unique `idx_doc_templates_one_default (studio_id, type) WHERE is_default`; `updated_at` trigger |
| `118_seed_default_document_templates.sql` | one default row per studio for the five always-on types (see §5E) |
| `166_doc_templates_per_entity.sql:33-82` | `+ company_id UUID NULL → studio_companies(id) ON DELETE CASCADE`, `+ body_json JSONB NULL`; CHECK widened with `'invoice','po','vo'`; the UNIQUE constraint replaced by `idx_doc_templates_studio_company_type_name (studio_id, COALESCE(company_id, '0000…'), type, name)`; the one-default partial unique now keyed on `(studio_id, COALESCE(company_id,…), type)`; `+ idx_doc_templates_studio_company_type (studio_id, company_id, type, is_active)` |
| `167_unify_quote_templates.sql:32-52` | moves every `studios.settings.quoteDocumentTemplates[]` entry into a `type='quote_pdf'` row (`body_json` = the whole JSON object), promotes one default per scope |
| `168` / `170` | seed `Default Invoice` · `Default PO` · `Default VO` per studio (body_json = `InvoicePOTemplateBody`) |
| `169_doc_templates_add_vo_type.sql:15-20` | re-applies the CHECK with `'vo'` (idempotent twin of 166's) |
| `178_seed_el_arte_quote_template.sql` | fork-only seed (`El Arte Standard Quote`, `mode: "structure"`, `is_default = true`, Phase 18 knobs) — `NO-OP` where the studio does not exist (`:36-45`) |
| `197_template_last_used_at.sql:7-11` | `+ last_used_at TIMESTAMPTZ NULL`; index `idx_doc_templates_studio_type_lastused (studio_id, type, last_used_at DESC NULLS LAST)` |
| `elarte-template-align.sql`, `elarte-template-knobs-200.sql` | fork-only `jsonb_set` patches on the El Arte row (`globalStyles.layout.blocks.closing/paymentTerms`, `header.sectionTitle`, `totals.roundOff`) |

**Columns** (effective):

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | no | `gen_random_uuid()` | PK |
| `studio_id` | UUID | no | | FK `studios(id) ON DELETE CASCADE` |
| `company_id` | UUID | yes | NULL | FK `studio_companies(id) ON DELETE CASCADE`; NULL = studio-wide default, non-null = the entity's override (166) |
| `type` | TEXT | no | | CHECK `quote_pdf · tnc · contract · signing_flow · timeline · portal · invoice · po · vo` |
| `name` | TEXT | no | | unique per (studio, entity, type) |
| `is_default` | BOOLEAN | no | false | at most one per (studio, entity, type) |
| `is_active` | BOOLEAN | no | true | soft "delete" (the doc-templates route flips it, `src/app/api/studio-config/doc-templates/route.ts:162`) |
| `variables` | JSONB | no | `'{}'` | informational map of allowed `{{tokens}}` (`117:59-60`) |
| `body_html` | TEXT | yes | | the `tnc` / `contract` body |
| `body_react_component` | TEXT | yes | | the seeded `quote_pdf` default names `'BrandedQuotePDF'` (118:16) — a component name, not a design |
| `body_json` | JSONB | yes | NULL | the structured body: `quote_pdf` → §2.1 (schemaVersion 1) or §2.4 (schemaVersion 2); `invoice` / `po` / `vo` → `InvoicePOTemplateBody` (`src/types/app.ts:1813`) |
| `config` | JSONB | no | `'{}'` | type-specific: `signing_flow` `{docOrder:[…]}`, `portal` `{showBankDetails, showInvoiceHistory, accentColorOverride}`, the seeded `quote_pdf` `{accentColor, showCoverPage}` (118) |
| `last_used_at` | TIMESTAMPTZ | yes | NULL | bumped by `POST /api/studio-config/doc-templates/bump` (197) |
| `created_at` · `updated_at` | TIMESTAMPTZ | no | `now()` | trigger `trg_doc_template_updated_at` |

**RLS.** `226_lock_tenant_tables.sql:53` lists it in the direct-scope loop: `scoped FOR ALL USING (studio_id = claim) WITH CHECK (…)`, `FORCE`, `anon` revoked, `authenticated` granted. `223_lock_studio_config_tables.sql:17-22` had deferred it ("also touched by other readers").

**TypeScript.** `DbStudioDocumentTemplate` (`src/types/database.ts:2251`) — its `type` union **lacks `'vo'`** (drift vs the CHECK); `StudioDocumentTemplate` + `DocumentTemplateType` (`src/types/app.ts:1788-1811`, has `'vo'`); `InvoicePOTemplateBody` (`app.ts:1813`); `QuoteDocumentTemplate` (`app.ts:1245-1345`) is the `quote_pdf` body's shape; `QuoteEntryTemplateCard` (`app.ts:1229`) is the gallery card. **Transformer** `transformStudioDocumentTemplate` (`src/lib/transformers.ts:2981-3000`) — a 1:1 snake→camel map; it does **not** carry `last_used_at` (the doc-templates route reads that column itself, `route.ts:55-62`).

**Readers / writers.** `src/app/api/document-templates/{records,records/[id],default,set-default,timeline}/route.ts` (the Accounts CRUD), `src/app/api/studio-config/doc-templates/route.ts` (the digitizer's gallery: `select("*")`, entity overlay `company_id.eq.X or company_id.is.null`, legacy `settings.quoteDocumentTemplates` fallback at `:69-80`, upsert at `:126-150`), `…/doc-templates/bump`, `src/app/api/quotes/request-signature/route.ts` and `src/app/api/sign/[token]/preview-pdf/route.ts` (the signing-time render reads the default `quote_pdf` body), `src/app/api/homeowner/projects/[id]/invoices/[invoiceId]/route.ts` (invoice body), `src/app/(main)/accounts/timeline-templates-tab.tsx`.

**docs/DATABASE_SCHEMA.md**: no section for this table (its TOC stops at the pre-v2 tables).

### D-02 `studio_quote_theme_presets` — theme presets

**Purpose.** One-click starting points for the Phase 18 layout + theme knobs; `applyPreset` deep-merges `theme` into `body_json.globalStyles.theme` and `layout` into `globalStyles.layout` of a `quote_pdf` template (`176_quote_theme_presets.sql:1-19`). Four system rows (`studio_id IS NULL`, `is_system`) + at most one custom row per studio.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | TEXT | no | | PK — slugs `preset-minimal` · `preset-arthaus` · `preset-flo-style` · `preset-studio-loft` for the system rows |
| `studio_id` | UUID | yes | | FK `studios(id) ON DELETE CASCADE`; NULL = system |
| `name` · `description` | TEXT | no / yes | | |
| `theme` | JSONB | no | | `QuotePdfThemeOverride` (§2.3); `'{}'` = `DEFAULT_THEME` |
| `layout` | JSONB | no | | `QuotePdfLayoutOverride` (§2.2); `'{}'` = `DEFAULT_LAYOUT` |
| `preview_url` | TEXT | yes | | |
| `is_system` | BOOLEAN | | false | |
| `created_at` · `updated_at` | TIMESTAMPTZ | | `NOW()` | |

Indexes: `idx_one_custom_preset_per_studio (studio_id) WHERE studio_id IS NOT NULL` (unique), `idx_studio_presets (studio_id)` (`176:35-39`). **RLS** `226:83-100` (B2 "NULL-or-scoped": `USING (studio_id IS NULL OR studio_id = claim)`, `WITH CHECK (studio_id = claim)`). **Type** `QuoteThemePreset` (`src/lib/queries/quote-theme-presets.ts:27-36`); readers `src/app/api/quote-theme-presets/records/route.ts`, `src/components/settings/theme-preset-picker.tsx`. No `docs/` entry.

### D-03 `quote_generation_rules` — auto-populate rules (NF17)

`132_quote_generation_rules.sql:3-20`: `id UUID PK`, `studio_id UUID NOT NULL → studios CASCADE`, `name TEXT NOT NULL`, `description TEXT`, `project_types TEXT[] NOT NULL DEFAULT '{}'` (empty = any), `required_scope_items TEXT[] NOT NULL DEFAULT '{}'` (rule fires when ALL present), `line_items JSONB NOT NULL DEFAULT '[]'` (each `{ price_book_id?, description, category?, default_qty, default_unit_price_cents?, default_margin_bps?, notes? }` — `DbQuoteGenerationRuleLineItem` `database.ts:2432`), `is_active BOOLEAN NOT NULL DEFAULT true`, `created_at` / `updated_at`, `created_by UUID → profiles SET NULL`; index `idx_qgr_studio (studio_id) WHERE is_active`. Money in **cents**, margin in **basis points**. RLS `226:50`. Type `QuoteGenerationRule` (`app.ts:1953`), transformer `transformQuoteGenerationRule` (`transformers.ts:3103-3126`); readers `src/app/api/quote-generation-rules/records/*`, `src/lib/queries/quote-generation-rules.ts`. A `_down.sql` twin exists.

### D-04 `quote_templates` (1.0) — the first "quote skeleton" table

`supabase/migrations/20240201000005_add_quote_templates.sql:2-11` only: `id UUID PK`, `studio_id UUID NOT NULL → studios CASCADE`, `name TEXT NOT NULL`, `line_items JSONB NOT NULL DEFAULT '[]'`, `created_by UUID → profiles SET NULL`, `created_at`; index `idx_quote_templates_studio`. `docs/DATABASE_SCHEMA.md:423-432` documents it and its migration history (`:1080`) calls it `025 quote_templates` — but `scripts/migrations/025_seed_supporting.sql` is a seed file; **no `scripts/` migration creates this table** (grep: only `167` mentions the name, in a comment, and `226:52` locks it). `line_items[]` = `{ description, category, qty, unit, price_type }` (`DbQuoteTemplate` `database.ts:741-753`); the transformer also reads `unit_price` / `cost_price` when present and maps to `QuoteTemplateItem` (`app.ts:926-936`: `description, category, qty, unit, priceType?, unitPrice?, costPrice?, isOptional?, discountType?, discountValue?`). Readers: `src/app/api/quotes/templates/route.ts` (GET / POST / DELETE), `src/app/api/quotes/chat/route.ts:53`, `src/lib/quote-agent/executors.ts:399`. RLS `226:52`. Superseded in the UI by D-05 (Packages) — the Accounts page has no tab for it.

### D-05 `studio_assemblies` — content templates ("Packages"; the retired "Work Packages" wrote the same rows)

**DDL history.**

| Migration | Change |
|---|---|
| `supabase/migrations/20260414000003_price_book_v2.sql:23-36` | CREATE TABLE: `id`, `studio_id NOT NULL → studios CASCADE`, `name`, `description`, `category` (primary category), `items JSONB NOT NULL DEFAULT '[]'`, `tags TEXT[] DEFAULT '{}'`, `created_by → profiles SET NULL`, `created_at`, `updated_at`; index `idx_studio_assemblies_studio` |
| `scripts/migrations/184_studio_quote_templates_extension.sql:14-36` | `studio_id DROP NOT NULL`; `+ scope TEXT NOT NULL DEFAULT 'category' CHECK ('category','project')`, `+ hierarchy JSONB NULL`, `+ is_system BOOLEAN NOT NULL DEFAULT FALSE`, `+ region_code TEXT NULL`, `+ property_type TEXT NULL`; CHECK `studio_assemblies_system_studio_consistency ((studio_id IS NULL AND is_system) OR (studio_id IS NOT NULL AND NOT is_system))`; indexes `idx_studio_assemblies_studio_scope`, `idx_studio_assemblies_system_region_scope`, `idx_studio_assemblies_name_trgm` (pg_trgm GIN); backfills the Arthaus row `a1100000-…301` to `scope='project'` with a derived `hierarchy` (`:40-61`) |
| `185_quote_template_rpcs.sql` → `191` → `192_template_rpcs_set_quote_id` → `204_template_rpcs_accept_quote_id` → `302` → `305` | the RPCs `apply_project_template(p_lead_id, p_template_id, p_caller_studio_id)`, `apply_category_template(+ p_category…)`, `create_template_from_quote(…) RETURNS UUID` — `SECURITY DEFINER`, `GRANT EXECUTE … TO service_role` (`185:227-229`); they write `leads.quote_hierarchy_metadata` (+ `quote_metadata` since 191), insert `quote_line_items` (with `quote_id` since 192, creating the `quotes` row when the lead has none, `192:69`), and snapshot a lead's items + hierarchy into a new row |
| `198_assemblies_last_used_at.sql:16-20` | `+ last_used_at TIMESTAMPTZ NULL`; index `idx_assemblies_studio_lastused` |
| `270_split_project_packages_into_category.sql` | **data**: every `scope='project'` row split into one `scope='category'` row per item category, then deleted — "Packages become category-wise bundles only" |
| `280_assembly_item_name_backfill.sql` | **data**: fills each item's `name` (the printed headline) |
| `302_package_carry_forward_cost_margin.sql` | `create_template_from_quote` now keeps `costPrice` + `marginPercent` per item (were dropped at save) |
| `305_package_items_pricebook_vendor.sql` | items carry `priceBookItemId` (the link) + `vendorId` / `vendorIds` (the snapshot) |

**Columns** (effective, per `270:7-10` "verified against information_schema"): `id, studio_id (NULL = platform), name, description, category, items, tags, created_by, scope, is_system, region_code, property_type, hierarchy, created_at, updated_at, last_used_at`.

**JSON.** `items[]` = `AssemblyItem` (`app.ts:3951-3973`): `priceBookItemId?, name?, description, category, subcategory?, unitPrice, costPrice?, marginPercent?, qty, unit, isOptional?, amount_marker? (snake_case, mig 302), vendorId?, vendorIds?` — dollars. `hierarchy` = `QuoteHierarchy` (`src/lib/quote-canva/hierarchy/types.ts:11-28`): `{ sections: [{ id, categoryName, description, orderIndex, subsections: [{ id, subcategoryName, description, orderIndex }] }] }`; NULL for category rows.

**RLS.** `226:52` puts it in the **direct-scope** loop (`studio_id = claim`) — the platform rows (`studio_id IS NULL`, `is_system`) are not readable on the `authenticated` path under that policy (see §Uncertain); `223:16` had deferred it. **Types** `DbStudioAssembly` (`database.ts:2514`, pre-184 shape) and `DbStudioQuoteTemplate` (`database.ts:2532-2548`, post-184); app `StudioAssembly` (`app.ts:3975`), `StudioQuoteTemplate` / `StudioQuoteTemplateCard` (`app.ts:3994-4034`). **Transformers** `transformStudioAssembly` (`transformers.ts:1352`), `transformStudioQuoteTemplate` (`:3288`), `transformStudioQuoteTemplateCard` (`:3308`, computes `itemCount` + `total = Σ unitPrice × qty`). Readers: the Accounts `QuoteTemplatesTab` (`page.tsx:1380`), `src/components/leads/quote-digitizer-dialog.tsx`, `src/lib/queries/studio-quote-templates.ts` (named in `223:16`).

### D-06 `quote_packages` — Good / Better / Best tiers

`supabase/migrations/20260414000005_quote_packages.sql:4-18`: `id`, `lead_id NOT NULL → leads CASCADE`, `studio_id NOT NULL → studios CASCADE`, `name TEXT NOT NULL` ('Essential' | 'Premium' | 'Luxury' | custom), `tier_order INT NOT NULL DEFAULT 0`, `items JSONB NOT NULL DEFAULT '[]'` (`QuoteLineItem[]` snapshot), `totals JSONB` (`{ subtotal, totalDiscount, totalTax, grandTotal }`), `is_recommended BOOLEAN DEFAULT false`, `ai_generated BOOLEAN DEFAULT false`, `upgrades JSONB DEFAULT '[]'` (`[{ itemId, originalDesc, upgradedDesc, priceDelta, reason }]`), `created_at`; `+ quote_id UUID DEFAULT NULL` (`20260415000001_multi_quote_support.sql:32`, no FK). Index `idx_quote_packages_lead`. RLS `226:51`. Type `QuotePackage` / `PackageUpgrade` (`app.ts:4043-4062`), `DbQuotePackage` (`database.ts:2497`); transformer `:1330`. Sole reader `src/app/api/quotes/generate-packages/route.ts`. The same migration adds `quote_signature_requests.client_selections JSONB` (`{ selectedPackageId, optionalItemsAccepted: string[] }`).

### D-07 `quote_versions` (1.0) — per-lead revision snapshots

| Migration | Change |
|---|---|
| `supabase/migrations/20260414000002_quote_versions.sql:4-21` | CREATE: `id`, `lead_id NOT NULL → leads CASCADE`, `studio_id NOT NULL → studios CASCADE`, `version_number INT NOT NULL DEFAULT 1`, `snapshot JSONB NOT NULL` (`QuoteLineItem[]`), `payment_milestones JSONB DEFAULT '[]'` (`QuotePaymentMilestone[]`), `doc_sections JSONB DEFAULT '[]'` (`QuoteDocSection[]`), `totals JSONB DEFAULT '{}'`, `quote_status TEXT`, `change_summary TEXT`, `created_by → profiles SET NULL`, `created_at`; `UNIQUE(lead_id, version_number)`; indexes on `lead_id`, `studio_id` |
| `20260415000001:31` | `+ quote_id UUID DEFAULT NULL` (no FK) |
| `scripts/migrations/186_quote_versions_hierarchy_and_restore.sql:5-11` | `+ hierarchy_snapshot JSONB NULL` (copy of `leads.quote_hierarchy_metadata`); RPC `restore_quote_version(p_lead_id, p_version_id, p_caller_studio_id)` — items + hierarchy + milestones in one transaction |
| `192_quote_versions_metadata_snapshot.sql:16-17` | `+ quote_metadata_snapshot JSONB NULL` (copy of `leads.quote_metadata`) |
| `243_restore_quote_version_payment_schedule.sql` | `restore_quote_version` v2 also writes the milestones to the contract quote's `quotes.payment_schedule` |

RLS `226:52`. Type `QuoteVersion` (`app.ts:900-924`), `DbQuoteVersion` (`database.ts:717-739`); transformer `transformQuoteVersion` (`:1041-1067`, snapshots are stored **camelCase** UI types). Writer `src/app/api/quotes/versions/route.ts`. Not in `docs/`.

### D-08 `quotes` (1.0) — the template-related columns

Created by `006_projects.sql:97-112` ≡ `20240101000006` (`project_id NOT NULL`, `quote_number text UNIQUE NOT NULL`, `status quote_status`, `subtotal/discount/tax/total integer`, `notes`, `valid_until date`, `created_by`, timestamps). Template-relevant history:

| Column | Migration | Notes |
|---|---|---|
| `lead_id UUID` (no FK), `label TEXT DEFAULT 'Quote'`, `quote_type TEXT DEFAULT 'standard'` (`standard · variation · ai_generated`), `is_primary BOOLEAN`, `total_cents · subtotal_cents · discount_cents · tax_cents BIGINT`, `payment_schedule JSONB DEFAULT '[]'` (`QuotePaymentMilestone[]`, §2.11), `doc_sections JSONB DEFAULT '[]'` (`QuoteDocSection[]` — the **per-quote schemaVersion-1 layout**), `parsed_doc_metadata JSONB`, `rejection_comment TEXT`; `project_id` and `quote_number` DROP NOT NULL | `supabase/migrations/20260415000001_multi_quote_support.sql:5-24` | |
| `preview_token TEXT NULL`, `preview_token_created_at TIMESTAMPTZ NULL`; unique partial index `quotes_preview_token_unique` | `scripts/migrations/109_quote_preview_tokens.sql:6-13` | the public live-preview link (`/api/quote/[token]/pdf`) |
| `preview_view_count INTEGER NOT NULL DEFAULT 0` | `187_quote_preview_view_count.sql:9-10` | |
| `quotes_quote_number_key` dropped; `quotes_studio_number_unique UNIQUE (studio_id, quote_number)`; NULL numbers backfilled `QT-###` / `VO-###` per studio | `103_quote_lifecycle_hardening.sql:100-138` | numbering is per studio |
| `is_omission BOOLEAN NOT NULL DEFAULT FALSE` | `213_quotes_is_omission.sql:14-15` | variation quotes |
| `submitted_by UUID NULL`, `prepared_by_signature JSONB NULL` (`DbPreparedBySignature` `database.ts:705`: `memberUserId, storagePath, sha256, signerName, role, appliedAt, appliedByUserId`) | `269_quotes_signature_columns.sql:5-6` | the designer's signature stamped at approval |
| `signed_at TIMESTAMPTZ` | `307_finance_contract_freeze.sql:16` | + trigger `trg_quote_totals_frozen` |

**There is no `document_template_id` / `theme` / `layout` column on `quotes`.** The design a quote prints through is resolved at render time by the 4-way ladder in `src/lib/quote-canva/compose-quote-body.ts:212-243`: (1) `leads.quote_metadata.canvaBlocks` (a `QuoteCanvaTemplateBody`, §2.4), else (2) `migrateSectionsToCanvaBody(quotes.doc_sections)`, else (3) the studio's default `quote_pdf` `body_json`, else (4) the code constant `TEMPLATE_DYEL`; the server passes `strict: true` and renders legacy when (1) is absent. The render cache key `QuoteRenderHashInputs` (`src/lib/quote-canva/quote-render-hash.ts:19-…`) lists every field that affects output: items, hierarchy, `layoutOverrides`, `themeOverrides`, `gstEnabled`, `docDiscount`, client info, template layout/theme, bank details, accreditations, totals. RLS: `012_rls.sql:15,82-84` (`get_my_studio_ids()`), replaced by `226:41`. Types `DbQuote` (`database.ts:653-703`), `Quote` (`app.ts:854-899`); transformer `transformQuote` (`:1069-1103`). **docs/DATABASE_SCHEMA.md has no `quotes` section** (TOC `:37-60` names it; no `### quotes` heading exists).

### D-09 `leads` — the template-related JSON columns

| Column | Migration | Shape |
|---|---|---|
| `quote_metadata JSONB NOT NULL DEFAULT '{}'` | `171_lead_quote_metadata.sql:5-8` | `QuoteMetadata` (`app.ts:42-120`): `gstEnabled?: boolean\|null`, `docDiscount?: { type: 'percent'\|'flat'; value }`, `layoutOverrides?: QuotePdfLayoutOverride`, `themeOverrides?: QuotePdfThemeOverride`, `categoryOrder?: string[]`, `sectionDescriptions?: Record<cat, text>`, `subsectionDescriptions?: Record<"cat\|sub", text>`, `subsectionTotalLabels?: Record<"cat\|sub", text>`, `subsectionOrder?: Record<cat, string[]>`, `canvaBlocks?: QuoteCanvaTemplateBody` — the **per-quote design** lives here, on the lead, not on `quotes` |
| `quote_hierarchy_metadata JSONB NOT NULL DEFAULT '{"sections":[]}'` | `183_quote_hierarchy_metadata.sql:18-25` (+ RPC `reparent_quote_hierarchy`, `:79`) | `QuoteHierarchy` (§D-05); legacy since `189_quote_metadata_hierarchy_backfill.sql` moved ordering + descriptions into `quote_metadata` |
| `customer_id TEXT NULL`, `quote_valid_until DATE NULL` | `181_leads_customer_id_valid_until.sql:20-21` | header KV rows (`RenderContext.customerId / quoteValidUntil`, `block-schema.ts:59-64`) |
| `quote_status text CHECK (none · draft · submitted · approved · rejected) DEFAULT 'none'` | `017_projects_and_leads_extended.sql:30` | mirrored to the primary quote by triggers (`103:145`) |
| `signature_request_id UUID → quote_signature_requests(id)` | `042:28` ≡ `20240302000001:28` | |
| `ic_number`, `property_type`, `property_address` | (Leads audit) | read by `RenderContext.clientIc / propertyType / clientAddress` |

### D-10 `quote_line_items` — the template-consumed line columns

Two creation paths: `006_projects.sql:114-123` (`quote_id NOT NULL → quotes CASCADE`, `description`, `category`, `quantity NUMERIC(10,2)`, `unit_price NUMERIC(12,2)`, `amount integer`, `order_index`) then `supabase/migrations/20240101000020_quote_line_items.sql:12-24` ALTERs in `lead_id`, `studio_id`, `qty`, `unit`, `total`, `margin_percent`, `ai_suggestion`, `sort_order`, `created_at`; `scripts/migrations/031_quote_line_items.sql:2-16` is a `CREATE TABLE IF NOT EXISTS` with the lead-first shape (a no-op where 006 ran). Effective = the union; `quote_id` became NOT NULL again with an FK in `104_quote_fk_and_notnull.sql:38-47` (after `20240201000004` had dropped it). Template-relevant columns:

| Column | Type / default | Migration | Consumed by |
|---|---|---|---|
| `price_type TEXT DEFAULT 'amount'` | `amount · foc · kiv · inclusive · by_client · lump_sum · content_block` (`app.ts:753`) | `035` ≡ `20240201000003` | pricing table (legacy `content_block` → inline inserts, `transformers.ts:1118`) |
| `comments JSONB DEFAULT '[]'` | `LineComment[]` | `044` | never printed |
| `source TEXT` CHECK | `manual · template · ai_drafted · ai_estimated · parsed · price_book · market_rate · web_estimated · needs_pricing` (`290:26`) | `101` → `193` → `290` | `'template'` marks package-applied lines |
| `image_url TEXT` | | `108` | `style.showItemImages` |
| `notes`, `spec_url`, `created_by → profiles` | | `110` | |
| `name TEXT`, `item_id TEXT` | headline + SKU | `113_item_name_and_item_id` | `style.boldItemName` |
| `description_html TEXT` | sanitised HTML | `122` | rich descriptions |
| `competitor_benchmark_cents BIGINT`, `competitor_source` | | `136` | never printed |
| `updated_at` | | `153` | |
| `subcategory TEXT` | | `172` | subsections |
| `amount_marker TEXT` | `180`: CHECK `('inclusive','foc')` → `298`: any non-blank ≤ 24 chars | `180` → `298` | prints in place of the amount, line out of totals |
| `discount_type TEXT DEFAULT 'none'` (`none·percent·flat`), `discount_value NUMERIC(12,2)`, `discount_amount`, `tax_inclusive`, `tax_rate NUMERIC(5,4)`, `tax_amount`, `cost_price`, `is_optional BOOLEAN`, `package_tier TEXT` (`essential·premium·luxury`), `price_book_item_id UUID` (soft ref) | | `supabase 20260414000001` | optional column / tint |
| `waste_percent`, `cost_type`, `vendor_id`, `price_snapshot_at` | | `supabase 20260416000001:54-67` | |
| `quote_id UUID` (v2 re-add) | | `20260415000001:27` | |
| `discount_label TEXT` | | `199` | the discount's printed label |
| `ref_override TEXT` | "1.1" / "-" | `200` | wins over computed numbering |
| `is_omission BOOLEAN NOT NULL DEFAULT FALSE` | | `245` | VO lanes |
| `highlight_color TEXT` | palette name or `#rrggbb` | `297` | row background |

Type `DbQuoteLineItem` (`database.ts:584-651`), `QuoteLineItem` (`app.ts:774-851`), transformer `:858-919`. `docs/DATABASE_SCHEMA.md:402-421` shows the pre-v2 15-column shape.

### D-11 `quote_signature_requests` — the signed-quote artefact

Created `042_quote_signature_requests.sql:5-25` ≡ `20240302000001` (`id`, `lead_id NOT NULL → leads CASCADE`, `studio_id NOT NULL`, `token TEXT NOT NULL UNIQUE`, `status TEXT NOT NULL DEFAULT 'pending'` (pending · viewed · signed · expired), `client_name NOT NULL`, `client_phone`, `quote_snapshot JSONB NOT NULL`, `quote_total NUMERIC(12,2)`, `studio_name`, `expires_at NOT NULL`, `signed_at`, `signature_data TEXT` (base64 PNG), `signer_ip`, `signer_user_agent`, `created_at`; indexes on `lead_id`, `token`). Later columns: `payment_schedule JSONB NULL` (`113`, `[{label, percentage, triggerEvent, amountCents?}]` = `PaymentScheduleMilestone` `app.ts:1719`), `signed_pdf_url TEXT` (`119`, + storage bucket `signed-quotes`), `documents JSONB NOT NULL DEFAULT '[]'` (`120`, `SigningDocument[]` `app.ts:1970-1990`: `id, type (quote·tnc·contract·document), render (pdf·html·quote), title, content_html?, content_data?, file_path?, hash, source_library_id?, requires_scroll, requires_accept, accept_label, requires_signature`), `company_id UUID → studio_companies SET NULL` (`128:80-84`), `quote_ids UUID[] NOT NULL DEFAULT '{}'`, `signing_mode TEXT NOT NULL DEFAULT 'single' CHECK (single·bundle·variations)`, `selected_quote_id UUID → quotes SET NULL` (`161:21-37`, GIN index on `quote_ids`), `document_hash`, `signing_hash`, `audit_trail JSONB DEFAULT '[]'` (`AuditTrailEvent[]` `app.ts:1992`), `signer_phone`, `signer_timezone`, `verification_method TEXT DEFAULT 'phone_otp'` (`supabase 20260406000001:4-10`, + RPC `append_signature_audit_event`), `client_selections JSONB` (`20260414000005:21-22`), `quote_id UUID` (`20260415000001:30`; FK `→ quotes ON DELETE RESTRICT` in `104`), `signed_packet_path TEXT`, `document_acknowledgements JSONB NOT NULL DEFAULT '[]'` (`246:6-8`), `prepared_by_display TEXT` (`20260520000003:11-15`, frozen per `settings.branding.quotePreparedByMode`). `quote_snapshot` is `QuoteLineItem[]` for `single`, `QuoteSnapshotEntry[]` (`app.ts:1736`: `quoteId, quoteNumber, quoteName, isPrimary, lineItems, total`) for `bundle` / `variations`. RLS `226:51`. Types `DbQuoteSignatureRequest` (`database.ts:1815-1862`), `QuoteSignatureRequest` (`app.ts:1747-1786`); transformer `:1937-1976`.

### D-12 `studio_signing_documents` — the multi-document signing library (touchpoint)

`242_signing_documents_library.sql:2-30`: `id`, `studio_id NOT NULL → studios CASCADE`, `company_id NULL → studio_companies SET NULL`, `kind TEXT CHECK (pdf_upload · rich_text)`, `title NOT NULL`, `file_path`, `body_html`, `requires_scroll BOOLEAN DEFAULT true`, `requires_accept BOOLEAN DEFAULT true`, `accept_label TEXT DEFAULT 'I have read and agree to this document'`, `is_active`, timestamps; own `scoped` RLS in the same file. Type `DbStudioSigningDocument` (`database.ts:3068`), transformer `:3337`. The Accounts `SigningDocumentsTab` (`page.tsx:1377`). Verdict Later (§4.1).

### D-13 `studio_companies` — the legal entities (P7 multi-entity branding)

`126_studio_companies.sql:27-67`: `id`, `studio_id NOT NULL → studios CASCADE`, `name NOT NULL`, `registration_number`, `gst_registered BOOLEAN NOT NULL DEFAULT false`, `gst_registration_number`, `country_code`, `currency_code`, `address`, `bank_details JSONB DEFAULT '{}'`, `branding JSONB DEFAULT '{}'`, `numbering JSONB DEFAULT '{}'`, `is_default BOOLEAN NOT NULL DEFAULT false`, `is_active BOOLEAN NOT NULL DEFAULT true`, timestamps (+ trigger); `UNIQUE (studio_id, name)`; partial unique `idx_studio_companies_one_default (studio_id) WHERE is_default` ("exactly one default per studio"); index `(studio_id, is_active)`. `130_studio_companies_tax_rate.sql:23-27`: `+ tax_rate NUMERIC(5,4)` (0.09 = 9 %; NULL = inherit). `128_finance_company_fk.sql` adds `company_id` FKs to the finance tables and `quote_signature_requests`. JSON: `bank_details` = `EntityBankDetailsOverride` (`app.ts:1908`: `bankName?, accountHolder?, accountNumber?, swiftCode?, branch?, payeeNotes?`); `branding` = `EntityBrandingOverride` (`app.ts:1890`: `logoUrl?, primaryColor?, tagline?, accreditations?: string[], footerText?, contactPhone?, contactEmail?, website?, paynowQrUrl?`); `numbering` untyped `Record<string, unknown>`. RLS `226:53`. Types `DbStudioCompany` (`database.ts:2315`), `StudioCompany` (`app.ts:1920`); transformer `:3045-3065`. The Accounts `LegalEntitiesTab` (`page.tsx:1389`). Templates consume it through `RenderContext.studioBranding.paynowQrUrl` (entity first, studio-wide second — `block-schema.ts:104-112`) and `quote_pdf` rows scoped by `company_id` (D-01).

### D-14 `studios` — the settings keys a template consumes

`003_studios.sql:3-15` (`name`, `owner_id`, `plan_id`, `status`, `lead_sources`, …), `013_studio_settings.sql:40` `+ settings JSONB DEFAULT '{}'`, `073_studio_region_columns.sql:5-8` `+ country_code 'SG' · currency_code 'SGD' · timezone · locale`, `20260503000017` `+ portal_slug`. The `settings` JSONB (`DbStudioSettings` `database.ts:815-…`, `StudioSettings` `app.ts:600-747`, `transformStudioSettings` `:1473-1587`) keys a quote template reads:

| Key | Shape | Read by |
|---|---|---|
| `branding` | `StudioBranding` (`app.ts:4156-4230`): `logoUrl, primaryColor, companyName, companyAddress, companyRegistration, companyPhone?, companyEmail?, companyWebsite?, tagline, missionStatement, socialLinks {website, instagram, facebook, linkedin, whatsapp, tiktok}, accreditations [{name, imageUrl}], bankDetails {bankName, accountNumber, accountHolder, swiftCode}, footerText, emailSignature, paynowQrUrl?, currencySymbolOverride?, quotePreparedByMode? ('team_list' default · 'studio_only' · 'first_assignee')` | every block via `RenderContext.studioBranding` / `brandColor`; `prepared_by_display` |
| `payment_details` | `{ bank_name, account_name, account_number, branch_code, swift_code, paynow_id, paynow_id_type, duitnow_id }` (snake_case) | signing flow / invoices |
| `bank_details` | `{ bank_name, bank_account_number, bank_account_holder, bank_swift_code }` | legacy twin of `branding.bankDetails` |
| `client_portal` | `{ logo_url, primary_color, company_name, company_address, company_registration }` | **dead** — backfilled into `branding` by migration 115 (transformer warns, `:1520`) |
| `quoteDocumentTemplates` | `QuoteDocumentTemplate[]` | **dead** — moved to D-01 rows by `167`; still a read-fallback in `doc-templates/route.ts:69-80` |
| `quote_templates` | `Array<Record<string, unknown>>` | **dead** — `transformers.ts:1501` passes it through; no writer found |
| `quoteSharingMethod` | `'link' \| 'pdf' \| 'both'` (default `'both'`) | the Quote Sharing tab (`page.tsx:1484-1494`) — camelCase, written straight onto `settings` |
| `quoteLinkExpiryDays` | `7 · 14 · 30 · 60 · 90` (default 30) | `page.tsx:1531-1541`; the signing link's `expires_at` |
| `enabledAccreditationIds` | `string[]` of `platform_accreditation_badges.id` | `accreditation-strip` block (`RenderContext.enabledAccreditations`), `src/app/api/accreditations/studio-state/route.ts:26` |
| `features.canva_editor` | boolean (`!== false`) | the compose ladder's on/off (`compose-quote-body.ts:57`) |
| `features.lock_quote_actions_until_approved`, `quote_approval {…}`, `workflow` | | the Quotes audit |
| `taxRate` | number | named in `130:27` as an inherit source |

### D-15 `studio_assets` — uploaded fonts · badges · signatures · logos

`177_studio_assets.sql:21-36`: `id`, `studio_id NOT NULL → studios CASCADE`, `type TEXT CHECK (font · badge · signature · logo)`, `name NOT NULL`, `url NOT NULL` (Supabase Storage `studio-assets/{studio_id}/{type}/{uuid}.{ext}`), `metadata JSONB DEFAULT '{}'` (fonts `{fontWeight, fontStyle}`, badges `{orderIndex}`, signatures `{designerName}`), `is_active BOOLEAN DEFAULT TRUE` (soft delete), timestamps; indexes `(studio_id, type)`, `(studio_id, is_active)`. Read into `RenderContext.studioBadges` / `studioFonts` (`block-schema.ts:113-140`); the primary logo still lives in `settings.branding.logoUrl` (`177:15-18`). RLS `226:53`. Type `DbStudioAsset` (`database.ts:2954`).

### D-16 `platform_accreditation_badges` — the curated badge catalogue (Platform)

`178_platform_accreditation_badges.sql:3-31`: `id`, `slug TEXT UNIQUE NOT NULL`, `name`, `short_name`, `description`, `image_url NOT NULL`, `country_codes TEXT[] NOT NULL`, `sort_order INTEGER DEFAULT 100`, `is_active`, timestamps; eight SG rows seeded (`hdb-lrp`, `bca-bizsafe-star`, `bca-bizsafe-l4`, `casetrust`, `casetrust-rcma`, `sdida`, `qanvast-trusted`, `qanvast-supertrust`). No `studio_id`; `264_platform_table_lockdown.sql:47-78` revokes it from `anon` and `authenticated` (server-only). A studio's choice is `studios.settings.enabledAccreditationIds` (D-14). Type `DbPlatformAccreditationBadge` (`database.ts:2990`). The Accounts `AccreditationsTab` (`page.tsx:1383`).

### D-17 `payment_schedule_templates` — the reusable payment splits

`061_finance_commission_journal_tables.sql:87-97`: `id`, `studio_id NOT NULL → studios`, `name NOT NULL`, `stages JSONB NOT NULL DEFAULT '[]'` (`[{ name, percent, trigger, type?: 'fixed'|'percent', amountCents? }]` — `PaymentScheduleTemplate` `app.ts:2436-2448`; missing `type` = percent), `is_default BOOLEAN NOT NULL DEFAULT false`, `created_by → profiles`, timestamps; index on `studio_id`. RLS `226:48`. Transformer `:2531` (drops `type` / `amountCents` — reads only `name · percent · trigger`). Readers: `src/app/api/finance/records/payment-schedule-templates/route.ts`, `src/components/leads/quote-digitizer-dialog.tsx`, `src/app/api/quotes/request-signature/route.ts` (the snapshot, `113`).

### D-18 `studio_quote_categories` — the trades and their sub-headings

`090_studio_customization_engine.sql:58-65`: `id`, `studio_id NOT NULL → studios CASCADE`, `name NOT NULL`, `order_index INT DEFAULT 0`, `is_active BOOLEAN DEFAULT true`, `UNIQUE(studio_id, name)`; `172_quote_subcategories.sql:9-12` `+ subcategories TEXT[] NOT NULL DEFAULT '{}'`; `174_quote_category_descriptions.sql:8-12` `+ description TEXT NULL` (printed under the section band when `sections.showCategoryDescriptions`). Consumed as `RenderContext.categoryDescriptions` and as the default section order (`compose-quote-body.ts:70-75`). RLS `226:56`.

### D-19 `studio_price_book` (+ tiers · history · suggestions) — touchpoint

`090:71-84` (`description NOT NULL`, `category_id → studio_quote_categories SET NULL`, `unit_price NUMERIC`, `unit`, `source DEFAULT 'manual'`, `external_ref`), then `+ cost_price, market_rate_min/max, markup_percent NUMERIC(5,2), is_active, tags TEXT[], notes` (`supabase 20260414000003:6-19`), `+ image_url, spec_url, cost_type DEFAULT 'combined', waste_percent, vendor_id` (`20260416000001:32-47`), `+ created_by` (`110`), `+ order_index` (`112`), `+ name` (`113`), `+ approval_status DEFAULT 'approved'` (`114`), `+ vendor_ids UUID[]` (`135`), `+ approver_user_id` (`160`), `+ embedding vector(1536)` (`288`). Children: `price_book_pricing_tiers` (`20260416000002:8-18`: `min_qty, max_qty, unit_price, cost_price`), `price_book_history` (`20260416000001:8-21`), `price_book_suggestions` (`115`). Money in **dollars** (`NUMERIC(12,2)`), `markup_percent` a percentage. Transformer `transformStudioPriceBookItem` (`:978`). Owned by the Quotes / Price-book audit; listed here because 2.0's `price_book_items` is the port target and packages link to it.

### D-20 `project_templates` — touchpoint, Later

`supabase/migrations/20260419000003_project_templates.sql:2-16`: `id`, `studio_id NOT NULL → studios CASCADE`, `name NOT NULL`, `description`, `project_type`, `property_type`, `template_data JSONB NOT NULL` (`ProjectTemplateData`), `is_default BOOLEAN DEFAULT false`, `created_by → profiles`, timestamps; `UNIQUE(studio_id, name)`. RLS `226:50`. Type `ProjectTemplate` (`app.ts:4841`), transformer `:2900`. Not template-of-a-quote; Later (Projects).

### D-21 `studio_milestone_templates` · `studio_timeline_templates` · `milestone_templates` — touchpoints, Later

`supabase/migrations/20260513000001_milestone_templates.sql:21-39`: `studio_milestone_templates` (`studio_id`, `name`, `description`, `payload JSONB NOT NULL` "versioned; v1 stores milestones with day-offset dates + payment/commission fields", `last_used_at`, timestamps); locked server-only by `222_lock_server_only_config_tables.sql:29`. `090:107-114`: `studio_timeline_templates` (`project_type NOT NULL`, `phases JSONB NOT NULL` = `DbTimelinePhase[] {name, durationDays, color, order}`, `is_active`, `UNIQUE(studio_id, project_type)`); locked by `223:40`. `milestone_templates` (platform, `006`) locked by `264:54`. D-01's `type='timeline'` rows are a third home (`118:4-5` says they are "keyed by project_type" and seeded "in migration 120" — no such seed exists in either set; see §Uncertain).

### D-22 `quote_status_history` — touchpoint

`157_quote_status_history.sql:17-29`: `quote_id NOT NULL → quotes CASCADE`, `studio_id`, `from_status`, `to_status NOT NULL`, `action NOT NULL`, `actor_user_id → profiles SET NULL`, `comment`, `created_at`; index `(quote_id, created_at DESC)`. RLS `226:51`. 2.0 derives its Activity feed and has no event table for quotes (`lib/leads/activity.ts`); the Quotes audit owns it.

### D-23 `render_share_links` · `render_consultation_requests` — not a quote artefact

`supabase/migrations/20260410000001_render_share_links.sql:2-26` (`token TEXT UNIQUE`, `snapshot JSONB`, `expires_at`, `view_count`, `created_by`) is the **AI Visualizer's** render-sharing table (`213_lock_render_jobs.sql:23-27`), not a quote share link; the quote's public link is `quotes.preview_token` (D-08) and the signing link is `quote_signature_requests.token` (D-11). Out of this slice's scope; recorded so the name is not mistaken for a quote table.

---

## 2. 1.0 — JSON shapes

### 2.1 `body_json` schemaVersion 1 — `QuoteDocumentTemplate` (`src/types/app.ts:1245-1345`)

The legacy "sections" document, written by the digitizer's Save-as-template and by migration `167` (whole `quoteDocumentTemplates[]` entries). Top level:

| Field | Type | Notes |
|---|---|---|
| `id`, `name`, `isDefault` | string · string · boolean | mirrors of the row (167 kept them inside the JSON) |
| `lastUsedAt?` | ISO | plumbed from the column by the doc-templates route |
| `sections` | `QuoteDocSection[]` | the ordered layout |
| `globalStyles?` | object | see below |
| `source?` | `'manual' \| 'ai_extracted' \| 'platform_default'` | |
| `sourceFileName?` | string | the uploaded PDF the template was digitised from |
| `items?` | `QuoteLineItem[]` | present when `mode === 'full'` (a quote **skeleton** — the Arthaus seed's 40 lines, `scripts/seed-arthaus-hdb-3room-quote-template.sql:40-45`); `'structure'` scrubs prices → 0, descriptions → "Item" |
| `brandColor?`, `logoUrl?` | string \| null | per-quote overrides frozen at save |
| `mode?` | `'full' \| 'structure'` | the gallery badge |
| `savedAt?` | ISO | |

`QuoteDocSection` (`app.ts:1025-1153`): `id`, `type` (`QuoteDocSectionType`, `app.ts:966-980`: `cover · header · footer · rich_text · two_column · pricing_table · payment_terms · bullet_list · image · signature_block · terms_conditions · spacer · callout · divider`), `title`, `content` (HTML, or JSON config for structured types), `showPageBreakBefore?`, `orderIndex`; styling `backgroundColor?, paddingTop/Bottom/Left/Right?, borderColor?, borderWidth?, borderRadius?, textColor?, fontFamily?`; `leftContent? / rightContent? / columnRatio?` (two_column); `visibilityRule? { field, operator: gt·lt·eq·neq·always, value? }`; `backgroundImage?`, `backgroundOpacity?`; `extractedFrom?: 'ai'|'manual'|'template'`; `hidden?`; `pageTitle?`; `calloutVariant?: info·warning·success·note`; `imageCaption?`, `imageLayout?: full·contain·inline`; `dividerStyle?: solid·dashed·dotted·double·ornament`; `spacerHeight?` (pt); legacy cover `coverHeight?, coverTextVerticalAlign?, coverLogoPosition?, coverLogoSize?`; slot cover `coverTemplate?` (`CoverTemplateId` `app.ts:1155`: `editorial · magazine_split · minimal · bold_statement · studio_letterhead`), `coverSlots?: CoverSlot[]` (`app.ts:1179-1215`: `id, kind` (`CoverSlotKind` `:1162`: `studio_logo · project_title · client_name · date · quote_ref · studio_name · studio_address · hero_image · accent_rule · rich_text`), `x, y, width, height` **percent of the page**, `rotation?, zIndex?, locked?, text?, imageUrl?, imageFit?, imageFocalPoint?, imageOverlay?, imageFilter?, imageZoom?, bgColor?, textStyle? {fontFamily, fontSize pt, fontWeight, color, align, letterSpacing, lineHeight, textTransform, italic}, ruleColor?, ruleThickness?`), `coverBackground? { color, imageUrl, imageFit, imageFocalPoint, opacity, overlay: CoverOverlay }`; `comments?: SectionComment[]` (`:1217`, internal, never printed); `inlineInserts?: InlineInsert[]` (`:1000-1023`, only on `pricing_table`: `id, type` (`rich_text · image · callout · divider · spacer · two_column`), `anchor { position: before·after, categoryName }`, `orderIndex`, payload fields, `orphaned?`); free positioning `freePositioned?, fpX?, fpY?, fpWidth?, fpHeight?` (percent), `fpRotation?, fpZIndex?, fpLocked?, fpPageIndex?` (ignored by `pricing_table · payment_terms · header · footer`).

`globalStyles` (`app.ts:1256-1330`; alias `QuoteDocGlobalStyles` `:1347`): legacy `accentColor?`, `fontStyle?: serif·sans-serif·modern·classic`, `headerLayout? {hasLogo, logoPosition, companyInfoPosition}`, `documentTitle?` ("QUOTATION"; `''`/null hides); Phase 2 `paperSize?: A4·Letter`, `margins?` (`{preset: narrow·normal·wide}` or `{preset:'custom', top,right,bottom,left}` pt), `pageBackground? {color, imageUrl, opacity}`, `watermark? {enabled, kind: text·logo, text, opacity, rotation}`, `font? {family: Helvetica·Times-Roman·Courier·Georgia·Inter·Outfit, sizeScale: compact·normal·comfortable, lineSpacing: tight·normal·loose}`, `header? {enabled, left, center, right (token strings), heightPt}`, `footer? {…same}`, `toc? {enabled, position: top·after_cover, depth: h1·h1_h2}`, `pageNumber? {enabled, position (6 corners), format: number·page_n·page_n_of_total}`, `logoStyle?: square·masthead`, `includeCoverPage?`; **Phase 18** `layout?: QuotePdfLayoutOverride` (§2.2) and **18b** `theme?: QuotePdfThemeOverride` (§2.3).

### 2.2 The Phase 18 "15-knob" layout — `QuotePdfLayout` (`src/lib/quote-pdf-layout.ts`)

Stored sparse at `body_json.globalStyles.layout` (studio default) and `leads.quote_metadata.layoutOverrides` (per quote); resolved `mergeLayout(DEFAULT_LAYOUT, template, quote)` with group-level shallow merge (`:1-36`). Five groups + `pageMargin` (`:345-362`):

| Group | Knobs (`:195-343`) | Enum values (`:39-98`) |
|---|---|---|
| `header` | `layout`, `contactBlockSlot`, `fieldLabels {clientName, clientIc, clientAddress, clientEmail, clientPhone, quoteNumber, quoteDate, customerId, validUntil, preparedBy}`, `regNumberPosition`, `dividerStyle {color, weight}`, `logoSize`, `subtitle {text, bandColor, textColor}`, `repetition`, `sectionTitle` | `HeaderLayout` `single-band · two-column · structured-keyvalue · centered-logo-stacked`; `ContactBlockSlot` `none · header-right · below-header`; `RegNumberPosition` `above-divider · below-logo · hidden`; `QuotePdfRepetition` `never · first-page-only · every-page` |
| `sections` | `headingStyle`, `subsectionStyle`, `subtotalPosition`, `numberingMode` | `band-uppercase · underlined-bold · italic-plain · plain`; `uppercase-band · italic-sentence-case · underlined-bold · hidden`; `hidden · in-band-header · row-after-items · both`; `continuous-letter-number · per-section-1n · per-subsection-1n · none` |
| `totals` | `breakdownStyle`, `optionalWorksSection {enabled, title, includeInTotal}`, `gstLabel`, `roundOff {enabled, label}` | `single-grand-total · stacked-discount · full-breakdown` |
| `blocks` | `intro {enabled, body, title, titleAlign, titleStyle {bold, underline, uppercase}}`, `remarks {enabled, body, position, style}`, `signatureBlock {enabled, designerImageUrl, name, phone, role, position, secondary {enabled, imageUrl, name, phone, role}}`, `closing {enabled, body}`, `paymentTerms {enabled, style, body, position, labelStyle}` | `BlockPosition` `before-totals · after-totals`; `SignaturePosition` / `PaymentTermsPosition` `+ footer`; `RemarksStyle` `boxed · italic-paragraph`; `PaymentTermsStyle` `numbered-list · bullet-list · paragraph · table` |
| `footer` | `logoRow {enabled, imageUrls[], height}`, `bankDetailsBlock {enabled}`, `paynowQr {enabled, imageUrl, label}`, `repetition` | |
| — | `pageMargin` (pt) | |

Worked example: the El Arte row (`178_seed_el_arte_quote_template.sql:93-160`) — `header.layout = "structured-keyvalue"`, `fieldLabels.clientName = "Attention"`, `sections.numberingMode = "per-section-1n"`, `totals.breakdownStyle = "stacked-discount"`, `blocks.remarks.body = "It's our pleasure to work with you!"`; later patched to `subsectionStyle "underlined-bold"`, `numberingMode "per-subsection-1n"`, `header.sectionTitle "CUSTOMER INFO"`, `totals.roundOff {enabled, label "Round Off"}` (`elarte-*.sql`).

### 2.3 The theme — `QuotePdfTheme` (`src/lib/quote-pdf-theme.ts:58-215`)

`colors {sectionHeading, sectionDescription, subsection, subtotalRow, cellText, cellSecondary, unitLabel, currencySymbol, rowAlt, grandTotal|null, link|null, divider}` (hex), `typography {fontFamily, sizeScale, lineSpacing, sectionHeadingSize|null, subsectionSize|null, bodySize|null, totalsSize|null, grandTotalSize|null, footerSize|null, bodyWeight 400·500·600·700, letterSpacing, lineHeightOverride|null}`, `spacing {sectionGap, rowPaddingY, subsectionIndent, bandHeightPt, tableHeaderRuleWeight}` (pt), `elementStyle {sectionHeading {italic, underline, uppercase, bold}, subsection {italic, bold, uppercase}, subtotal {italic, bold, labelTemplate}}`, `features {sectionDescriptionEnabled, currencySplitRendering, columns {showQty, showUnit, showRate}, smartUnitHiding, continuationMarker, rowStriping}`. `DEFAULT_THEME` at `:247` (Helvetica, `#1F1F23` headings, `rowAlt #FAFAFB`). Stored sparse as `QuotePdfThemeOverride = DeepPartial<QuotePdfTheme>` on `globalStyles.theme`, `quote_metadata.themeOverrides` and `studio_quote_theme_presets.theme`. The `Flo-style` preset (`176:58-94`) is the reference: brand red `#C8232C` on `sectionHeading · sectionDescription · unitLabel · subtotalRow`, `Times-Roman`, italic-underlined headings, `labelTemplate "Sub-total for {section_letter}:"`.

### 2.4 `body_json` schemaVersion 2 — `QuoteCanvaTemplateBody` (`src/lib/quote-canva/block-schema.ts:565-571`)

`{ schemaVersion: 2, blocks: QuoteCanvaBlock[], globalStyles: QuoteDocGlobalStyles, pageRules: PageRules, overridability: Record<KnobPath, boolean> }`. Written to `studio_document_templates.body_json` (the studio's design) and to `leads.quote_metadata.canvaBlocks` (the quote's own copy); the three code constants `TEMPLATE_DYEL · TEMPLATE_IDL · TEMPLATE_FLO` (`reference-templates.ts:49, 264, 502`, picker names Minimal · Centered Premium · Branded, `:679-697`) are the same shape.

- `QuoteCanvaBlock` (`:509-524`): `id, type, props, hidden?`, free positioning `freePositioned?, fpX?, fpY?, fpWidth?, fpHeight?, fpRotation?, fpZIndex?, fpLocked?, fpPageIndex?` (ignored when the schema says `isFlowOnly`).
- `PageRules` (`:533-563`): `paperSize: A4·Letter`, `margin {top,right,bottom,left}` (pt), `background? {color, imageUrl, opacity}`, `watermark? {text, opacity, rotation}`, `pageIndicator? {placement: top-right·bottom-center·hidden, format}`, `headerTopInsetMm?`, `runningHeader? {blockId, fromPage}`, `runningFooter? {blockId, fromPage}`.
- `overridability`: knob path → may a quote override it (`KnobDef.overridableByDefault`, `:344`); per-quote values ride `BlockOverridesByQuote` (`:527-531`).
- A block schema (`:389-455`): `type, displayName, category: header·body·footer·decoration, defaultProps, propPanelSchema (tabs → KnobDef {path, schema: text·textarea·richText·number·boolean·color·select·image·hidden·array, overridableByDefault, group?, visibleWhen?})`, `render`, `isFlowOnly`, `isPaged`, `actions {duplicate, delete, confirmDelete}`, `allowedZones`, `singleton`, `allowedInPricingTableGap`.

**The block registry** — 24 types (`src/components/leads/quote-canva/blocks/*.tsx`; `item-description.tsx` registers nothing). `defaultProps` keys, units in pt:

| `type` | zones · singleton | `defaultProps` keys |
|---|---|---|
| `logo` | header, footer | `imageUrl, widthPt, alignment, tagline, useBrandingTagline, taglineSize, taglineColor, repeatOnEveryPage, variant (standalone · centered-stacked · with-wordmark-right), stack {companyName, registration, address, nameSizePt, nameColor, secondarySizePt, secondaryColor}, wordmark {text, sizePt, bold, color, tagline, taglineSizePt, taglineColor, regNumberRight, regNumberPrefix, regNumberSizePt, regNumberColor}` |
| `doc-title` | header, body | `text, alignment, bold, underline, italic, case, sizePt, color, fontFamily, marginTopPt, marginBottomPt, repeatOnEveryPage` |
| `subject-line` | body, header | `text, bold, underline, italic, uppercase, sizePt, color, alignment, marginTopPt, marginBottomPt, fontFamily` |
| `subtitle-band` | header, body | `text, backgroundColor, textColor, fontSizePt, fontWeight, italic, uppercase, paddingYPt, alignment, widthMode, marginTopPt, marginBottomPt` |
| `meta-kv` | header, body | `layout (stacked-tab · two-col-right · two-col-balanced), emptyRow, labelWidthPt, labelColor, valueColor, fontSizePt, rowGapPt, labelGapPt, balancedGapPt, repeatOnEveryPage, rows [{id, label, valueSource (quote.date · client.name · client.phone · quote.refNumber · …), visible}], dateFormat ('inherit' or a format)` |
| `header-divider` | header | `style, color, weightPt, marginTopPt, marginBottomPt, useBrandAccent, repeatOnEveryPage` |
| `intro-text` | body | `body (HTML), alignment, sizePt, color, fontFamily, lineHeight, marginTopPt, marginBottomPt, repeatOnEveryPage, keepOnOnePage, keepWithNext` |
| `pricing-table` | body · flow-only | `spaceAbovePt; columns {ref, description, qty, unit, unitPrice, optionalPrice, total}; columnWidths {ref, qty, unit, unitPrice, optionalPrice, total}; headers {enabled, ref, description, qty, unit, unitPrice, optionalPrice, total, case, bandEnabled, bandColor, bandTextColor, repeatOnEveryPage}; numbering {mode, refColumnAlignment, sectionOverrides}; sections {headingStyle, bandColor, textColor, markersTemplate, fontSizePt, subLine {enabled, text, color, italic, fontSizePt}, showCategoryDescriptions}; sectionLetterPlacement; subsections {style, bandColor, textColor, fontSizePt, indentMode, indentPx}; optional; nonNumeric; subtotal {position, labelTemplate, color, rowStyle}; subsectionSubtotal {position, showDottedLeader, color}; style {currencySplit, smartQtyHide, zebraStriping, zebraColor, rowPaddingY, rowGap, lineHeight, descriptionFontSizePt, bodyFontSizePt, headerFontSizePt, borderColor, showRowBorders, boldItemName, descriptionMuted, showItemImages, itemImageSizePt}; gst {label, position, format}; zeroPrice {display, label}; totals {enabled, beforeDiscountLabel, discount {enabled, label, percent}, afterDiscountLabel, grandTotalLabel}; interSectionBlocks; parts` (`pricing-table.tsx:467-577`) |
| `payment-milestones` | body, footer · singleton · flow-only | `layout (list · table), title, estCostsLabel, percentLabel, fixedLabel, borderColor, totalLabel, showAmounts, showOrdinal, titleSizePt, titleColor, rowSizePt, rowColor, totalSizePt, totalColor, showRules, ruleColor, rowGapPt, marginTopPt, marginBottomPt, footnote, footnoteSizePt, footnoteColor, footnoteGapPt, showTotal, rowTemplate` |
| `signature-footer` | footer · singleton | `layout (two-col · three-col), lineWidthPt, lineWeightPt, lineColor, headingGapPt, bodyGapPt, marginTopPt, marginBottomPt, keepOnOnePage, keepWithNext, headingSizePt, bodySizePt, headingColor, bodyColor, repeatOnEveryPage, leftColumn {id, heading, body[], alignment}, rightColumn {…}` |
| `bank-details` | footer · singleton | `title, titleSizePt, titleColor, titleUppercase, bodySizePt, bodyColor, alignment, showTopRule, topRuleColor, autoTitleSG, showBankName, showAccountHolder, showAccountNumber, showSwiftCode, bankLabel, holderLabel, accountLabel, swiftLabel, marginTopPt, marginBottomPt, paddingTopPt, extraRows[]` |
| `paynow-qr` | footer · singleton | `imageUrl, label, sizePt, labelSizePt, labelColor, alignment, marginTopPt, marginBottomPt` |
| `gst-line` | footer, body · singleton | `template ("GST Reg. No: {value}"), autoTemplate, fontSizePt, color, italic, alignment, marginTopPt, marginBottomPt, repeatOnEveryPage` |
| `accreditation-strip` | footer, body, header | `source (studio-curated · …), badges[], rows, heightPt, gapPt, alignment, caption, captionSizePt, captionColor, captionItalic, marginTopPt, marginBottomPt` |
| `social-row` | footer, header | `layout, iconStyle, iconSizePt, iconColor, textColor, fontSizePt, gapPt, showLabel, alignment, entries[], useBrandingLinks, useBrandingContacts, valueDisplay` |
| `footer-band` | footer · singleton · flow-only | `mode (plain-text · accreditation · multicol · tagline), fontFamily, widthMode, backgroundColor, paddingYPt, paddingXPt, marginTopPt, marginBottomPt, repeatOnEveryPage, plainText {body, fontSizePt, color, alignment, links[], linkColor, linkUnderline, lineRule, lineRuleColor, lineRuleWeightPt, lineHeight, lineRuleGapPx, lineRuleHug, lineRuleWidth}, accreditation {badges[], heightPt, gapPt, alignment, caption, captionSizePt, captionColor}, multicol {columns[], gapPt}, tagline {enabled, text, fontSizePt, color, alignment, italic, marginTopPt}` |
| `page-indicator` | header, footer · singleton | `placement, format ("Page {n} of {m}"), fontSizePt, color, italic, skipFirstPage` |
| `running-header` | header · singleton | `content ("{studio_name} — Page {n}"), position, fontSizePt, color, italic, bold, fromPage, underline, bottomRule, bottomRuleColor` |
| `cover-page` | header, body · singleton | `kicker, title, subtitle, alignment, titleSizePt, subtitleSizePt, kickerSizePt, titleColor, subtitleColor, kickerColor, backgroundImageUrl, backgroundColor, backgroundDim, accentStrip, accentColor, accentWidthPt, showClientRow, showProjectRow, showDateRow, showPreparedByRow, clientLabel, projectLabel, dateLabel, preparedByLabel, kvSizePt, kvLabelColor, kvValueColor, footerCaption, footerCaptionColor, footerCaptionSizePt, pageBreakAfter` |
| `image` | body, header, footer | `imageUrl, alt, alignment, sizing (fixed-width · fixed-height · full-width), widthPt, heightPt, marginTopPt, marginBottomPt, rounded, repeatOnEveryPage` |
| `divider` | body, header, footer | `style, color, weightPt, spacingPt` |
| `spacer` | body, header, footer | `heightPt, pageBreakBefore` |
| `page-break` | body | `{}` |

`migrate.ts` (`src/lib/quote-canva/migrate.ts:126, 246-357`) is the one-way v1 → v2 mapper (`migrateSectionsToCanvaBody`), lossy by design (`cover · callout · image · payment_terms · signature_block · two_column` skipped in the MVP, `:11-14`); `collapseDuplicateBlocks` (`:63`) keeps one of each `COLLAPSE_TO_FIRST` type (`pricing-table · logo · doc-title · meta-kv · header-divider`, `:51-57`) plus every schema singleton; `isCanvaBody` (`:359`) is the ladder's guard.

### 2.5 Theme-preset rows · 2.6 generation-rule `line_items` · 2.7 assemblies `items` / `hierarchy`

See D-02 (`theme` = §2.3 override, `layout` = §2.2 override), D-03 (`{ price_book_id?, description, category?, default_qty, default_unit_price_cents?, default_margin_bps?, notes? }`), D-05 (`AssemblyItem[]` in dollars; `QuoteHierarchy`).

### 2.8 `leads.quote_metadata` — see D-09. ### 2.9 Signature snapshots — see D-11.

### 2.10 Branding JSON — `studios.settings.branding` (`StudioBranding`, D-14) and `studio_companies.branding` / `bank_details` (`EntityBrandingOverride` / `EntityBankDetailsOverride`, D-13). Resolution: `resolveStudioBranding` reads the raw blob first (`transformers.ts:1509-1520`); `resolvePaynowQrUrl(studioBranding, entity)` prefers the entity (`app.ts:4197-4201`).

### 2.11 Payment schedules — three shapes

`quotes.payment_schedule[]` = `QuotePaymentMilestone` (`app.ts:950-963`): `id, name, type? ('fixed' | 'percent'; missing = percent), percent, amountCents?, trigger?, notes?`. `payment_schedule_templates.stages[]` = `{ name, percent, trigger, type?, amountCents? }` (D-17). `quote_signature_requests.payment_schedule[]` = `PaymentScheduleMilestone` `{ label, percentage, triggerEvent (deposit · start · midway · handover · custom · free text), amountCents? }` (D-11) — the frozen legal copy. Restore-version writes the version's `payment_milestones` back to `quotes.payment_schedule` (`243`).

---

## 3. 2.0 — tables and the design JSON

All tables are `lib/db/schema.ts` (Drizzle, libSQL); history is `drizzle/0000…0036`. Every table is single-studio (no `studio_id`), soft-deletes with `deleted_at`, and stores JSON as `text`. `fixtures/baseline.json` snapshots the 48 tables named in `lib/db/baseline.ts:17` (`BASELINE_TABLES`, parents first); the template tables among them: `settings · quotes · quote_templates · quote_template_versions · quote_text_templates · payment_templates · price_book_items · price_book_sections · quote_items · quote_payments · quote_versions · contract_templates · task_templates · template_tasks`.

### D-30 `quote_templates` — the design template (`schema.ts:499-530`)

| Column | Type | Null | Default | Migration | Notes |
|---|---|---|---|---|---|
| `id` | text | no | | `0014_old_the_hood.sql` | PK |
| `name` | text | no | | 0014 | |
| `kind` | text | no | `'design'` | 0014 | only `'design'` ever written |
| `is_default` | integer(bool) | no | false | 0014 | the DEFAULT tag; `setDefaultTemplate` |
| `last_used_at` | integer(ts) | yes | | 0014 | "used 2w ago" |
| `created_at` | integer(ts) | no | | 0014 | |
| `status` | text | no | `'published'` | `0022_friendly_wasp.sql` | `draft · published · archived` (`TEMPLATE_STATUSES`, `model.ts:207`; `archived` tolerated, no longer written) |
| `version` | integer | no | 1 | 0022 | the published version number |
| `published_at`, `updated_at` | integer(ts) | yes | | 0022 | |
| `updated_by` | text | yes | | 0022 | `members.id` |
| `paper` | text | no | `'A4'` | 0022 | `A4 · Letter` |
| `design_json` | text | yes | | 0022 | `TemplateDesign` (§3.10); null = the Letter house style |
| `defaults_json` | text | yes | | 0022 | `TemplateDefaults` |
| `draft_json` | text | yes | | 0022 | `{ design, defaults }` — unpublished work |
| `draft_updated_at` | integer(ts) | yes | | 0022 | |
| `source_file` | text | yes | | 0022 | "Recreate from my current quote" upload name |
| `note` | text | yes | | 0022 | the last publish's "what changed" |
| `submitted_by`, `submitted_at`, `submit_note`, `review_note` | text · ts · text · text | yes | | `0023_nosy_hellfire_club.sql` | approval (REG-501): awaiting = a submission on the record, not a status |
| `deleted_at` | integer(ts) | yes | | `0024_goofy_fixer.sql` | soft delete (REG-502) |
| `deleted_by` | text | yes | | `0027_thick_clint_barton.sql` | |

No index. Read by `lib/templates/queries.ts` (`parseDesign` / `parseDefaults` at `:46-51, 89-95`; the quote's pinned version at `:237-241`), written by `app/company/templates-actions.ts`.

### D-31 `quote_template_versions` (`schema.ts:545-556`, `0022`)

`id text PK`, `template_id text NOT NULL → quote_templates(id) ON DELETE CASCADE`, `version integer NOT NULL`, `design_json text NOT NULL`, `defaults_json text`, `note text`, `published_at integer NOT NULL`, `published_by text` (`members.id`). One row per publish; a quote pins `(template_id, template_version)` and prints through the row (`queries.ts:237-241`).

### D-32 `quote_text_templates` (`schema.ts:365-376`, `0018` → `0027`)

`id`, `kind text NOT NULL` (`terms · notes`), `title NOT NULL`, `body NOT NULL` (the in-house editor's HTML; tokens like `[Client Full Name]`), `created_at NOT NULL`, `updated_at`, `+ created_by`, `+ deleted_at`, `+ last_used_at` (0027). Usage counted from `quote_templates.defaults_json / draft_json` `termsTemplateId · notesTemplateId` (`lib/company/text-templates.ts:12-23`).

### D-33 `payment_templates` (`schema.ts:384-395`, `0027`)

`id text PK` (the four presets keep their old keys `default · 20-40-40 · 30-70 · 50-50`), `name NOT NULL`, `rows_json text NOT NULL` (`SplitRow[] = [{ name, description, pct }]`, `lib/quotes/payments.ts:20`), `is_preset integer(bool) NOT NULL DEFAULT false`, `created_by`, `created_at NOT NULL`, `updated_at NOT NULL`, `last_used_at`, `deleted_at`. Seeded by repair R35 from `PRESET_SPLITS` (`payments.ts:27-33`; the default = the Won wizard's 10/30/30/30). Amounts are derived (`total × pct`), never stored.

### D-34 `task_templates` · `template_tasks` (`schema.ts:854-878`, `0005` → `0027`)

`task_templates`: `id`, `name NOT NULL`, `keep_members bool DEFAULT true`, `keep_description bool DEFAULT true`, `created_at NOT NULL`, `+ created_by`, `+ updated_at`, `+ deleted_at`. `template_tasks`: `id`, `template_id NOT NULL → task_templates CASCADE`, `title NOT NULL`, `description`, `kind text DEFAULT 'General'`, `sort_order integer DEFAULT 0`, `+ member_ids text` (JSON `string[]`), `+ tag_ids text` (JSON), `+ due_days integer`; index `template_tasks_template_idx`. `lead_tasks.template_id` (0027) counts "Added to n leads". **No 1.0 counterpart in this slice** (1.0's `tasks` table is the Leads audit's).

### D-35 `price_book_items` (`schema.ts:426-441`, `0015` → `0029` → `0030`)

`id`, `name NOT NULL`, `description`, `kind text DEFAULT 'purchase'` (`ITEM_KINDS` `design · fee · labour · delivery · purchase`, `lib/quotes/items-model.ts:15`), `unit text DEFAULT 'Pieces'` (`UNITS` `Pieces · Lot · sqft · ft run · point · hour · set`, `:22`), `cost_minor integer DEFAULT 0`, `markup_minor integer DEFAULT 0` (**cents**; selling price = cost + markup), `category`, `thumb`, `+ vendor text` (`0029_studio_requests.sql`), `created_at NOT NULL`, `updated_at`, `+ deleted_at` (`0030_price_book_soft_delete.sql`). Usage = distinct `quote_items.quote_id` per `price_book_item_id` (`lib/company/price-book.ts:20-23`).

### D-36 `price_book_sections` (`schema.ts:333-342`, `0028_round1_quotes.sql` → `0030`)

`id`, `name NOT NULL`, `description`, `lines_json text NOT NULL` (`SavedSection`, `items-model.ts:136-137`: `{ name, description, descriptionHtml, lines: SavedLine[], subs: [{ name, description, descriptionHtml, lines }] }`; `SavedLine = { name, description, descriptionHtml, qty, unit, costMinor, markupMinor, discountPct, gstPct, room, category, section, printAs, printAsText, highlight, icon }`), `created_at NOT NULL`, `updated_at`, `last_used_at`, `+ deleted_at` (0030). "Save section to My Items" / "My Sections" (REG-566); Company › Price book (REG-594).

### D-37 `quote_versions` (2.0) (`schema.ts:314-326`, `0028`)

`id`, `quote_id NOT NULL → quotes CASCADE`, `version integer NOT NULL`, `snapshot_json text NOT NULL` (`{ quote: Quote row, items: QuoteItem[], payments: QuotePayment[] }`, written by `reviseQuote` `app/quotes/actions.ts:115`, revived by `reviveSnapshot` `lib/templates/queries.ts:153-160`), `note`, `created_by` (`members.id`), `created_at NOT NULL`; index `quote_versions_quote_idx`. Revise keeps the sent version whole; the quote row moves to `version + 1` under the same number; `?version=n` previews the snapshot; `lib/quotes/diff.ts` marks a revision's changes (REG-595).

### D-38 `quotes` — template-related columns (`schema.ts:242-312`)

| Column | Type / default | Migration | Notes |
|---|---|---|---|
| `number` | text NOT NULL | `0004` | `"OM-10001"`; the pattern is `settings.quote_numbering` (`formatQuoteNumber`, `lib/settings/types.ts:95-101`) |
| `status` | text DEFAULT `'Draft'` | 0004 | `Draft · Sent for Approval · Approved · Sent to Client · Confirmed · Signed` (+ the two approval statuses only when `settings.quote_approval = required`) |
| `version` | integer DEFAULT 1 | `0013` | header chip; bumped by Revise |
| `sections` | text | 0013 | `QuoteSectionState[]` (`lib/quotes/sections.ts:9`) — the editor's section order/collapse, not the print |
| `template_id` | text | `0014` | the design template (no FK); null = blank |
| `template_version` | integer | `0022` | pinned version (REG-489); a newer publish shows the update banner |
| `client_view_json` | text | 0022 | `ClientView` overrides (§3.11, REG-490) |
| `prepared_by`, `valid_until`, `project_ref`, `nric`, `customer_id`, `property_type`, `site_address` | | 0013 | General Info — the field values `{prepared_by} {valid_until} {project_ref} {nric} {customer_id} {property_type} {site_address}` |
| `additional_discount_mode` (`pct · amount`), `additional_discount_value real`, `gst_enabled bool DEFAULT true`, `issuing_entity text` (null = the studio; names an `IssuingEntity` of `settings.brand`), `items_view` (`none · category · room · section`), `items_density` (`single · double · triple`), `items_columns` (JSON `ColumnSettings`, `items-model.ts:57`), `items_labels` (JSON `ItemLabels {categories, rooms, sections}`) | | `0015` | |
| `files_visible bool` | | `0017` | |
| `terms_html`, `notes_html`, `terms_visible bool`, `notes_visible bool` | | `0018` | the quote's own T&Cs / notes text (copied from a text template) |
| `client_signature_required bool DEFAULT true` | | `0019` | |
| `created_by` | | `0021` | |
| `discounts_json` | text | `0028` | `NamedDiscount[] { id, label, mode: pct·amount, value }` (`lib/quotes/math.ts:27`) |
| `revised_at` | ts | 0028 | |
| `confirmed_at`, `confirmed_by`, `client2_name`, `client2_nric` | | `0029` | the `/confirm/[quoteId]` link (REG-587); the second client (REG-588) |
| `due_at · sent_at · updated_at · approved_at · archived_at · deleted_at` | ts | `0006` | |
| `amount_minor` | integer NOT NULL | 0004 | cents; totals otherwise derived (`lib/quotes/math.ts`) |

**No per-quote design JSON**: a quote prints its pinned template's `design_json` with the studio brand merged (`mergeBrand`, `model.ts:70`) and its `client_view_json` switches. Members' signatures: `members.signature_kind (draw · type) · signature_name · signature_data` (`schema.ts:100-102`, `0019`).

### D-39 `quote_items` — template-consumed columns (`schema.ts:449-497`)

`kind (item · group)`, `parent_id` (nesting; sub-sections REG-558), `position`, `name`, `description`, `description_html` (0028, REG-557), `thumb`, `thumb_count`, `icon`, `status (Pending · Approved · Declined)`, `qty real`, `unit`, `cost_minor`, `markup_minor`, `discount_pct real`, `gst_pct real DEFAULT 9`, `room`, `category`, `section`, `visibility (visible · hidden · no-price)`, `collapsed`, `price_book_item_id`, `optional bool` (0022, REG-492), `print_as` (`PRINT_AS` `foc · inclusive · kiv · behalf · packaged · custom`, `items-model.ts:101`) + `print_as_text` (0028, REG-555), `highlight` (`HIGHLIGHTS` `accent · red · grey · light · band`, `:126`; 0028, REG-556), `no_number bool` (0028, REG-558), `print_one_line bool` (0029, REG-585), `rebate_minor integer` (0029, REG-596; Owners only, never printed).

### D-40 `settings` rows the templates read (`schema.ts:231-237`: `key text PK`, `value text` JSON, `updated_at`)

| Key | Shape | Where |
|---|---|---|
| `brand` | `BrandSetting = { kit: BrandKit, details: StudioDetails }` (`lib/templates/brand.ts:9-11`); `BrandKit = { logo, logoDark, stamp, badges: string[], colors: Record<ink·grey·accent·light·band·red, hex>, fonts: Record<heading·body·table·small, { family, size, weight 400·600·700, italic? }> }` (`model.ts:55-67`); `StudioDetails = { name, address, phone, fax, email, website, uen, gstReg, licence, tagline, social, entities: IssuingEntity[] }` (`:48-54`); `IssuingEntity = { name, bankName, accountName, accountNo, payNow, payNowQr, gstRegistered }` (`:46`, max 6, the studio always first — `parseBrandSetting` `brand.ts:36-40`) | Company › Profile (details) + Company › Templates › Brand kit (kit); seeded by repair R31, entities by R36 |
| `studio` | `{ name, gstRegistered, phone }` (`lib/settings/types.ts:45`) | Issuing Entity + GST line; R35 keeps `brand.details.name/phone` in step with it |
| `quote_rules` | `{ roundStep: 0·1·5·10, paymentLock, backupApproverId }` (`types.ts:114`) | Settings › Quotes (REG-584/589/590) |
| `quote_numbering` | `Numbering = { prefix, initials, yearMonth, next, digits, commercial: { on, prefix, next } }` (`types.ts:76`; key `NUMBERING_KEY` `lib/settings/queries.ts:44`) | REG-561/586 |
| `trades` | `string[]` (`parseTrades`, `types.ts:104`; unset → the categories in use) | the Category column's base list |
| `template_approval` | `required · not-required` (`types.ts:58`) | REG-501 |
| `quote_approval` | `required · not-required` (`types.ts:31`) | the quote lifecycle |
| `stage_movement · lead_sources · lead_visibility · lead_capture · lead_reasons` | | the Leads audit |

### D-41 `contract_templates` (`schema.ts:629-640`, `0026`) — touchpoint

`id`, `title NOT NULL`, `body NOT NULL` (HTML with `data-token` chips and `data-sign` fields), `created_by`, `created_at`, `updated_at NOT NULL`, `last_used_at`, `deleted_at`. The 2.0 home of 1.0's `type='contract'` document template (D-01) and, functionally, of the T&C the signing page shows. `contracts` (`:558-596`) carries `template_id`, `from_quote_id`, `recipient_*`, `signed_by`, `signed_nric` (masked), `bundle_id`; `contract_bundles` (`:614-627`) is the 1.0 `signing_mode='bundle'` counterpart.

### D-42 `quote_comparisons` (`:532-543`) — Quote X-Ray, not a template; listed only because it sits in the same baseline group.

### D-43 The design JSON — `TemplateDesign` (`lib/templates/model.ts`)

`TemplateDesign = { page: PageSettings, brand: BrandOverrides, blocks: Block[] }` (`:191`).

- `PageSettings` (`:23-24`): `paper: A4 · Letter`, `margins {top, right, bottom, left}` **mm**, `watermark: string`, `dateFormat: short · long · weekday` (REG-592). `DEFAULT_PAGE` = A4, 18 mm.
- `BrandOverrides` (`:69`): any part of the kit — `logo?, logoDark?, stamp?, badges?, colors?: Partial<…>, fonts?: Partial<…>` — deep-merged over the studio's kit (`mergeBrand`). A colour anywhere is a brand key (`ink · grey · accent · light · band · red`) or a hex (`resolveColor`, `:81`).
- `TextStyle` (`:85-97`): `role? (heading·body·table·small), font?, size? (pt), weight? 400·600·700, italic?, underline?, uppercase?, color?, align?, letterSpacing?, lineHeight?`.
- `BlockBase` (`:118`): `id, hidden?, startNewPage?, keepWithNext?, spaceBefore?, spaceAfter?`. **18 block kinds** (`BLOCK_KINDS` `:177`; `SINGLETON_KINDS` `:188` = `cover · header · footer · items · totals · payments · bank · terms · notes`):

| kind | Props (`model.ts`) |
|---|---|
| `header` · `footer` · `cover` (`CanvasBlock`, `:120`) | `height` (mm), `repeat: every · first · not-first`, `elements: CanvasElement[]`, `background?`, `rule? {weight, color}` — the canvases; elements are placed in mm |
| `details` (`:121`) | `layout: columns · stacked · form`, `left: KVRow[]`, `right: KVRow[]` (`KVRow = { id, label, value }`, values carry `{fields}`), `labelWidth`, `style`, `labelStyle` |
| `title` (`:122`) | `title, titleStyle, subject, subjectStyle, intro, introStyle` |
| `items` (`:127-161`) | `groupBy: none·category·room·section`, `subGroupBy: none·room·category`, `sectionLabel: letters·numbers·none`, `numbering: group·area·continuous·none·nested`, `bandStyle: grey·accent·black·underlined·inline`, `groupNotes`, `groupNoteStyle`, `areaStyle`, `columns: ItemsColumn[]` (`{ key: no·item·qty·unit·qtyUnit·unitPrice·discount·total, label, on, width (mm), align, color? }`), `headerRow: plain·ruled·band·black·none`, `headerStyle`, `descriptions: none·first·full·bullets`, `descriptionStyle`, `photos`, `subtotals`, `subtotalLabel` ("Sub-total for {section}"), `lumpSum`, `zeroAmount: FOC·Inclusive·0.00·blank`, `currency: 'S$'·'$ '·none`, `grid`, `fillPage`, `ruled`, `zebra`, `density: compact·normal·relaxed`, `pageTotals`, `pageTotalLabel`, `keepGroups`, `groupNewPage`, `hiddenItems: omit·no-price`, `optionalSection`, `optionalTitle`, `style` |
| `totals` (`:163`) | `lines: [{ key: pages·subtotal·discount·additional·gst·total, label, on }]`, `layout: right·full`, `width`, `style`, `totalStyle`, `rules: none·top·double·grid` |
| `payments` (`:164`) | `title, layout: table·list·cards, showAmounts, showDue, letters, style, titleStyle, band, showTotal?` |
| `bank` (`:166`) | `title, titleStyle, style, layout: row·stacked, qr, qrWidth, box: none·tint·outline` — prints the quote's issuing entity |
| `terms` · `notes` (`TextSourceBlock`, `:167`) | `title, titleStyle, style, numbered, grid` — the body comes from the quote's `terms_html` / `notes_html` |
| `signature` (`:168`) | `columns: SignatureColumn[]` (`{ id, heading, lines: string[], image: none·member·client·stamp, caption? }`), `lineWeight, lineColor, style, headingStyle, preamble?` |
| `text` (`:169`) | `html, style, box: none·tint·outline` |
| `image` (`:170`) | `src ('logo' · 'logo-dark' · 'stamp' · a path), width (mm), align, caption?` |
| `divider` · `spacer` · `pagebreak` · `badges` (`:171-174`) | `weight, color` · `height` · — · `items: string[], height, align` |

- `CanvasElement` (`:102-112`) = `{ id, x, y, w, h?, locked? }` (mm) & one of `text {text, style, hideIfEmpty?}` · `image {src, fit: contain·cover, box?}` · `kv {rows, labelWidth, style, labelStyle, lines: none·under, gap}` · `rule {weight, color}` · `box {fill?, stroke?, weight?}` · `signature {columns, style, headingStyle, lineWeight, lineColor, preamble?}` · `badges {items, gap, align}` · `pageno {format ("Page {page} of {pages}"), style}`.
- `TemplateDefaults` (`:192-205`): `columns: ColumnKey[] | null` (the editor's working columns), `paymentPreset: string | null` (a `payment_templates.id`), `termsTemplateId`, `notesTemplateId` (`quote_text_templates.id`), `introText`, `validityDays` (30), `gstEnabled`, `signatureRequired`, `starterGroups: string[]` (REG-497). Reach new quotes only after Publish (REG-578).
- **Fields** (`lib/templates/fields.ts:10-28`, `FIELD_GROUPS`): Client `client_name · client_salutation · client_phone · client_email · site_address · property_type · nric · customer_id · client_2_name · client_2_nric`; Quote `quote_number · quote_title · version · date · valid_until · validity_days · project_ref · item_count · subtotal · gst_amount · gst_rate · total`; Studio `studio_name · studio_address · studio_phone · studio_fax · studio_email · studio_website · studio_uen · studio_gst · studio_licence · studio_tagline · studio_social`; Bank `bank_name · bank_account_name · bank_account · paynow`; People `prepared_by · prepared_by_phone · prepared_by_role · prepared_by_email`; Page `page · pages`. Syntax `{key}` (`TOKEN` `:55`); an unknown key stays as typed.
- **House styles** (`lib/templates/presets.ts:183-187`): `letter` (Dyel's Sales Contract, A4), `scope` (Flo Design, A4), `form` (Cove Interior, Letter), `presentation` (A4) — `Preset = { key, name, blurb, paper, design(), defaults }`; code, not rows. `fallbackDesignClient()` = `letter`.
- **Client view** (`lib/templates/client-view.ts:7-24`): `ClientView = { columns: Record<ItemsColumnKey, boolean>, descriptions, photos, hiddenItems, optionalWorks, subtotalBreakdown, paymentSchedule, terms, notes, signature, approvePerLine, branding, amounts: lines·sections·total, changes }`; derived from the design (`clientViewFromDesign`), overridden per quote by `quotes.client_view_json`.

### 3.12 Repair rules and the baseline (`scripts/repair-demo-data.ts`, `fixtures/baseline.json` taken 2026-09-24)

R22 seeds the three mock-named templates; **R31** (`:709-737`) writes `settings.brand` (kit + `DEMO_BADGES`) and gives `Default Quote PDF → letter`, `4-Room BTO → scope`, `5-Room BTO → form` their `design_json / defaults_json`, `status published`, `version 1`, one `quote_template_versions` row each, and pins `OM-10008` to `4-Room BTO v1`; R32 seeds Sarah's awaiting-approval submission (`Showflat Presentation`); **R35** (`:862-881`) inserts the four `payment_templates` presets, names the text / task templates' authors, aligns `brand.details.name/phone` with `settings.studio`; **R36** (`:773-800`) adds member emails, the studio as the first `IssuingEntity`, and a `print_as = 'foc'` line on OM-10008; R37 the Letter footer geometry; **R38** (`:883-906`) vendors on `price_book_items` (`Floor Xpert`, `Hafary`, `Soon Bee Huat` — two rows for the same tile) and the saved section `pbs-bathrooms-full-works` from OM-10008's Bathrooms group. Baseline counts: `quote_templates` 6, `quote_template_versions` 7, `quote_text_templates` 6, `payment_templates` 4, `task_templates` 2 / `template_tasks` 4, `price_book_items` 10, `price_book_sections` 1, `quote_versions` 0, `contract_templates` 2, `settings` 5 (`stage_movement · studio · brand · lead_reasons · lead_capture`), `quotes` 7 (only OM-10008 pinned).

---

## 4. The diff

### 4.1 Table map

| Id | 1.0 table (kind) | 2.0 table | Verdict | Note |
|---|---|---|---|---|
| D-50 | `studio_document_templates` `type='quote_pdf'` (D-01) | `quote_templates` + `quote_template_versions` (D-30, D-31) | **rename + split** | 1.0 = one row, one body, no history, entity-scoped by `company_id`; 2.0 = published design + working draft on the row, every publish a version row, approval columns, no entity scope |
| D-51 | `studio_document_templates` `type='tnc'` (`body_html`) | `quote_text_templates` `kind='terms'` (D-32) | **merge + rename** | 1.0 = one default HTML per studio/entity; 2.0 = a library of titled bodies a quote copies into `quotes.terms_html` |
| D-52 | `studio_document_templates` `type='contract'` (`body_html`) | `contract_templates` (D-41) | **rename** | both HTML bodies with `{{tokens}}` / `data-token` chips |
| D-53 | `studio_document_templates` `type='invoice' · 'po' · 'vo'` (`InvoicePOTemplateBody`) | — | **Later** (Finance) | 2.0 has no invoices / POs / VOs |
| D-54 | `studio_document_templates` `type='signing_flow' · 'portal' · 'timeline'` (`config`) | — (`contract_bundles` covers the doc order; portal is REG-609's records; timeline = Projects) | **Later / Platform** | |
| D-55 | `studio_quote_theme_presets` (D-02) | `lib/templates/presets.ts` `PRESETS` (4 house styles) + `settings.brand.kit` | **code** | 1.0 presets are sparse knob overrides applied onto a template; 2.0 house styles are whole designs; a studio's one custom preset ≈ a template's `brand` overrides |
| D-56 | `quote_generation_rules` (D-03) | — | **Later** | no rule engine in 2.0; `TemplateDefaults.starterGroups` is the nearest (empty groups, no lines) |
| D-57 | `quote_templates` 1.0 (D-04, `line_items[]` skeleton) | `price_book_sections` (D-36) | **merge** | superseded in 1.0 itself by Packages; port through D-58 |
| D-58 | `studio_assemblies` `scope='category'` (Packages, D-05) | `price_book_sections` (D-36) | **rename** | same idea: one section with its lines (and sub-sections), inserted whole; 1.0 `scope='project'` rows were split away by `270` |
| D-59 | `studio_assemblies` `is_system` rows (platform packages) | — | **Platform** | 2.0 has no platform-authored content |
| D-60 | `quote_packages` (D-06) | — | **Later** | Good / Better / Best tiers + `client_selections`; 2.0's `optional` lines are the only client choice |
| D-61 | `quote_versions` 1.0 (D-07) | `quote_versions` 2.0 (D-37) | **same name, different shape** | 1.0 = per-lead snapshots of items + milestones + doc_sections + hierarchy + metadata, `UNIQUE(lead_id, version_number)`; 2.0 = per-quote `{quote, items, payments}` on Revise |
| D-62 | `quotes.doc_sections` + `leads.quote_metadata.canvaBlocks` (the per-quote design) | `quotes.template_id · template_version · client_view_json` | **concept change** | 2.0 never stores a design per quote — a quote pins a template version and keeps client-view switches |
| D-63 | `leads.quote_metadata.layoutOverrides · themeOverrides` | `quotes.client_view_json` (partial), `quotes.items_columns` (editor-only) | **missing** | per-quote knob overrides have no 2.0 home beyond `ClientView` |
| D-64 | `leads.quote_metadata.categoryOrder · sectionDescriptions · subsectionDescriptions · subsectionTotalLabels · subsectionOrder`, `leads.quote_hierarchy_metadata` | `quote_items` `kind='group'` rows (`position`, `description`, `parent_id`, `print_as_text`) | **merge** | 2.0 makes the hierarchy rows, not JSON: a group row is the section, its `description` the scope note, `print_as_text` the sub-total wording |
| D-65 | `quotes.preview_token · preview_token_created_at · preview_view_count` | `/confirm/[quoteId]` (REG-587, `confirmed_at · confirmed_by`) | **missing (partial)** | 2.0's link is by quote id, no token, no expiry, no view count |
| D-66 | `quote_signature_requests` (D-11) | `contracts` + `contract_bundles` + `quotes.confirmed_*` + `members.signature_*` | **split** | Quotes / Contracts audits own the columns; here: `documents[]` ↔ bundle members, `payment_schedule` snapshot ↔ `quote_versions` snapshot, `prepared_by_display` ↔ `{prepared_by}` resolved at print, hashes / OTP audit **Later** |
| D-67 | `studio_signing_documents` (D-12) | — (`contract_templates` is the nearest) | **Later** | the scroll-and-accept carousel library |
| D-68 | `studio_companies` (D-13) | `settings.brand.details.entities: IssuingEntity[]` (D-40) | **merge into JSON** | 2.0 keeps up to 6 entities inside one settings row |
| D-69 | `studios.settings.branding` + `payment_details` + `bank_details` (D-14) | `settings.brand` (`kit` + `details`) + `settings.studio` | **same purpose** | |
| D-70a | `studio_assets` (D-15) | `settings.brand.kit.{logo, logoDark, stamp, badges[]}` + `members.signature_*` | **merge** | 2.0 stores paths / data URLs in the kit; fonts are the curated `FONT_FAMILIES` list (`model.ts:35`) — uploads **Later** |
| D-70b | `platform_accreditation_badges` + `settings.enabledAccreditationIds` (D-16) | `settings.brand.kit.badges` (uploaded images) | **Platform** | 2.0 has no curated catalogue; badges are the studio's uploads |
| D-70c | `payment_schedule_templates` (D-17) | `payment_templates` (D-33) | **rename** | |
| D-70d | `studio_quote_categories` (D-18) | `settings.trades` + `quote_items.category` | **merge** | `subcategories[]` → `quote_items.room` / sub-groups; `description` → the group row's `description` (per quote, not per studio) |
| D-70e | `studio_price_book` (D-19) | `price_book_items` (D-35) | **rename** | the Quotes / Price-book audit; units differ (§4.4) |
| D-70f | `quote_line_items` template columns (D-10) | `quote_items` (D-39) | **rename** | §4.2 D-76 |
| D-70g | `project_templates` · `studio_milestone_templates` · `studio_timeline_templates` · `milestone_templates` (D-20, D-21) | — | **Later** (Projects) | |
| D-70h | `quote_status_history` (D-22) | derived Activity (`lib/leads/activity.ts`) | **Later** | the Quotes audit |
| D-70i | `render_share_links` (D-23) | — | **out of scope** | not a quote artefact |
| D-70j | — | `task_templates` · `template_tasks` (D-34) | **2.0 only** | |
| D-70k | — | `quote_templates.status · version · draft_json · submitted_* · review_note · deleted_*`, `quote_template_versions`, `settings.template_approval` | **2.0 only** | 1.0 has no draft / publish / approval lifecycle for templates |
| D-70l | — | `settings.quote_rules` (`roundStep · paymentLock · backupApproverId`), `settings.quote_numbering`, `settings.trades` | **2.0 only** (as JSON) | 1.0's numbering is `quotes_studio_number_unique` + the count-and-retry in `useCreateQuote` (`103:130-133`) and `studio_companies.numbering {}` (untyped); 1.0's `totals.roundOff` rounds the **printed total**, 2.0's `roundStep` rounds each **line's selling price** (`roundToStep`, `types.ts:121`) |
| D-70m | — | `quotes.client_view_json` (`ClientView`) | **2.0 only** | the nearest 1.0 idea is `overridability` + `BlockOverridesByQuote` |

### 4.2 Column-level diffs

**D-71 · `studio_document_templates` (quote_pdf) → `quote_templates` / `quote_template_versions`**

| 1.0 column | 2.0 column | Note |
|---|---|---|
| `id` UUID | `id` text | keep the UUID string |
| `studio_id` | — | single studio |
| `company_id` (entity override) | — | **missing**; port an override row as a second template named after the entity, or drop with a note (§5D) |
| `type` | `kind` (`'design'`) | only `quote_pdf` maps here |
| `name` | `name` | unique per (studio, entity, type) in 1.0; not unique in 2.0 |
| `is_default` | `is_default` | 1.0 one per (studio, entity, type); 2.0 one overall |
| `is_active` | `deleted_at` (non-null = inactive) | boolean → soft-delete stamp |
| `variables` | — | dead (informational) |
| `body_html` | — | n/a for quote_pdf |
| `body_react_component` | — | dead (`'BrandedQuotePDF'`) |
| `body_json` (schemaVersion 1 or 2) | `design_json` (`TemplateDesign`) + `defaults_json` (`TemplateDefaults`) + `paper` | the JSON mapping is §4.3 / §5D; `body_json.mode/items` → `price_book_sections` |
| `config` (`accentColor`, `showCoverPage`) | `design_json.brand.colors.accent`; a `cover` block present or not | |
| `last_used_at` | `last_used_at` | same |
| `created_at` · `updated_at` | `created_at` · `updated_at` | seconds, not timestamptz |
| — | `status`, `version`, `published_at`, `updated_by`, `draft_json`, `draft_updated_at`, `source_file`, `note`, `submitted_by/at`, `submit_note`, `review_note`, `deleted_by` | 2.0 only; a ported row lands `published`, `version 1`, `published_at = updated_at`, one version row `note 'Imported from OpenMaison 1.0'` |

**D-72 · `studio_quote_theme_presets` → `presets.ts` / `brand` overrides.** `theme.colors.sectionHeading · subtotalRow · cellText` → `brand.colors.ink`; `sectionDescription · cellSecondary · unitLabel` → `grey`; `divider · rowAlt` → `light` / `band`; `typography.fontFamily` → `brand.fonts.*.family` (Helvetica → Helvetica, Times-Roman → Times New Roman, Courier → Courier New); `sizeScale` → `fonts.body.size` (compact 8 · normal 9 · comfortable 10, to be confirmed against the renderer); `elementStyle.sectionHeading {bold, italic, underline, uppercase}` → `ItemsBlock.areaStyle` (a `TextStyle`); `layout.*` → the D-74 block knobs. `id · name · description · preview_url · is_system` have no row.

**D-73 · `quote_versions` (1.0) → `quote_versions` (2.0)**

| 1.0 | 2.0 | Note |
|---|---|---|
| `lead_id`, `studio_id` | — (`quote_id → quotes.lead_id`) | |
| `quote_id` (nullable) | `quote_id NOT NULL` | 1.0 rows with NULL `quote_id` → the lead's primary quote (the `104` backfill rule) |
| `version_number` | `version` | |
| `snapshot` (`QuoteLineItem[]`) | `snapshot_json.items` (`QuoteItem[]`) | line mapping D-76; dollars → cents |
| `payment_milestones` (`QuotePaymentMilestone[]`) | `snapshot_json.payments` (`QuotePayment[]`) | `percent → pct`, `trigger → description`, `name → name`; `type: 'fixed'` / `amountCents` **missing** in 2.0 (pct only) |
| `doc_sections`, `hierarchy_snapshot`, `quote_metadata_snapshot` | — | dropped: the design is the template's; the hierarchy is the items' `parent_id` |
| `totals` | derived from the snapshot (`lib/quotes/math.ts`) | |
| `quote_status` | `snapshot_json.quote.status` | enum map: `draft → Draft`, `submitted → Sent for Approval`, `approved → Approved`, `sent_for_signature → Sent to Client`, `client_signed → Signed`, `rejected → Draft` (+ the rejection in `note`) |
| `change_summary` | `note` | |
| `created_by`, `created_at` | `created_by` (`members.id`), `created_at` | |

**D-74 · `studio_assemblies` (category package) → `price_book_sections`**

| 1.0 | 2.0 | Note |
|---|---|---|
| `name`, `description` | `name`, `description` | |
| `category` | `lines_json.lines[].category` (every line) | |
| `items[]` (`AssemblyItem`, dollars) | `lines_json.lines[]` (`SavedLine`, cents) | `name → name`, `description → description`, `subcategory → section` (or a `subs[]` group when several lines share it), `unitPrice − costPrice → markupMinor` (×100), `costPrice → costMinor` (×100; missing cost → `costMinor 0`, `markupMinor = unitPrice×100`), `qty → qty`, `unit → unit` (free text; 2.0's picker offers `UNITS` but stores any string), `isOptional` → **missing** on a saved line (2.0's `optional` is a quote-item flag), `amount_marker` → `printAs` (`foc → foc`, `inclusive → inclusive`, other text → `custom` + `printAsText`), `marginPercent` → derived, `priceBookItemId` → **missing** on a saved line, `vendorId(s)` → the `price_book_items.vendor` text when the line is re-linked |
| `tags[]`, `scope`, `is_system`, `region_code`, `property_type`, `hierarchy` | — | dropped (`scope` is always `category` after `270`; `hierarchy` is NULL for them) |
| `created_by` | — | `price_book_sections` has no author column (2.0 shows `author: null`, `lib/company/price-book.ts:32`) |
| `last_used_at`, `created_at`, `updated_at` | same | |

**D-75 · `payment_schedule_templates` → `payment_templates`**

| 1.0 | 2.0 | Note |
|---|---|---|
| `name` | `name` | |
| `stages[] {name, percent, trigger, type?, amountCents?}` | `rows_json[] {name, description, pct}` | `percent → pct`, `trigger → description`; `type: 'fixed'` + `amountCents` **missing** |
| `is_default` | (`quote_templates.defaults_json.paymentPreset` names the default per template; `DEFAULT_SPLIT_ID = 'default'`) | no column — set the default template's `paymentPreset` to the ported id |
| `created_by`, `created_at`, `updated_at` | same | |
| — | `is_preset`, `last_used_at`, `deleted_at` | 2.0 only (`is_preset = false` for ported rows) |

**D-76 · `quote_line_items` template columns → `quote_items`** (the Quotes audit owns the rest)

| 1.0 | 2.0 | Note |
|---|---|---|
| `name` / `description` / `description_html` | `name` / `description` / `description_html` | 2.0 `name NOT NULL` — a 1.0 row with NULL `name` takes its `description` |
| `category`, `subcategory` | `category`; a `kind='group'` parent (+ `room` or a nested group) | 2.0 sections are rows |
| `unit_price`, `cost_price` (dollars) | `cost_minor`, `markup_minor` (cents) | `markup = unit_price − cost_price` |
| `qty`, `unit` | `qty`, `unit` | |
| `discount_type · discount_value · discount_amount · discount_label` | `discount_pct` (line) / `quotes.discounts_json` (named) | a `flat` line discount → `pct = amount / line total`; the label → a `NamedDiscount` only when quote-level |
| `tax_rate`, `tax_inclusive`, `tax_amount` | `gst_pct` (default 9), `quotes.gst_enabled` | `tax_inclusive` **missing** |
| `is_optional` | `optional` | same |
| `amount_marker` (`foc · inclusive · free text`) | `print_as` (`PRINT_AS`) + `print_as_text` | `foc → foc`, `inclusive → inclusive`, "KIV" → `kiv`, "ON BEHALF" → `behalf`, "Packaged" → `packaged`, else `custom` + the text |
| `price_type` (`foc · kiv · inclusive · by_client · lump_sum`) | `print_as` (`foc · kiv · inclusive · behalf`) / group `print_one_line` (`lump_sum`) | `content_block` → a `text` block is not a line — dropped |
| `highlight_color` (palette name or hex) | `highlight` (`accent · red · grey · light · band`) | nearest brand key; a hex maps to `band` or `accent` by luminance |
| `ref_override` | `no_number` (when `'-'`) | "1.1"-style refs have no home — 2.0 numbers by `numbering: nested` |
| `is_omission`, `package_tier`, `competitor_*`, `waste_percent`, `cost_type`, `vendor_id`, `price_snapshot_at`, `spec_url`, `item_id`, `comments`, `ai_suggestion`, `source` | — | Quotes audit / Later |
| `image_url` | `thumb` (+ `thumb_count`) | |
| `sort_order` | `position` | |
| — | `status`, `visibility`, `collapsed`, `no_number`, `print_one_line`, `rebate_minor`, `icon`, `section`, `room` | 2.0 only |

**D-77 · `studio_companies` → `IssuingEntity` (`settings.brand.details.entities[]`)**

| 1.0 | 2.0 | Note |
|---|---|---|
| `name` | `name` | the first entity's name is forced to `details.name` (`brand.ts:40`) |
| `gst_registered` | `gstRegistered` | same |
| `bank_details.bankName · accountHolder · accountNumber` | `bankName · accountName · accountNo` | rename |
| `bank_details.swiftCode · branch · payeeNotes` | — | **missing** |
| `branding.paynowQrUrl` (+ `settings.payment_details.paynow_id`) | `payNowQr` (image path) + `payNow` (the id text) | |
| `registration_number`, `gst_registration_number`, `address`, `tax_rate`, `country_code`, `currency_code`, `numbering`, `branding.{logoUrl, primaryColor, tagline, accreditations, footerText, contactPhone, contactEmail, website}`, `is_default`, `is_active`, timestamps | — | **missing** — 2.0 prints one UEN / GST no. / address (`details.uen · gstReg · address`) for every entity; `is_default` ≈ "first in the list" |
| — | `gstRegistered` per entity (REG-593) | exists both sides |

**D-78 · `studios.settings.branding` → `settings.brand`**

| 1.0 key | 2.0 field | Note |
|---|---|---|
| `logoUrl` | `kit.logo` | + 2.0 `kit.logoDark`, `kit.stamp` |
| `primaryColor` | `kit.colors.accent` | 2.0 adds `ink · grey · light · band · red` |
| `companyName · companyAddress · companyRegistration · companyPhone · companyEmail · companyWebsite` | `details.name · address · uen · phone · email · website` | + 2.0 `details.fax`, `gstReg`, `licence` (HDB) |
| `tagline` | `details.tagline` | |
| `socialLinks {website, instagram, facebook, linkedin, whatsapp, tiktok}` | `details.social` (one string) | structure lost |
| `accreditations [{name, imageUrl}]` + `enabledAccreditationIds` | `kit.badges: string[]` | names lost |
| `bankDetails {bankName, accountNumber, accountHolder, swiftCode}` / `payment_details {…, paynow_id, paynow_id_type, duitnow_id}` | `details.entities[0]` | swift / branch / duitnow **missing** |
| `missionStatement`, `footerText`, `emailSignature`, `quotePreparedByMode`, `currencySymbolOverride` | — / `ItemsBlock.currency` (template-level) | **missing**; 2.0 prints `{prepared_by}` = the quote's `prepared_by` member, never a team list |
| `quoteSharingMethod`, `quoteLinkExpiryDays` | — / `defaults_json.validityDays` (the quote's validity, not the link's) | **missing** |
| — | `kit.fonts` (4 roles) | 2.0 only (1.0's font is a theme knob) |

**D-79 · `studio_price_book` → `price_book_items`**: `description → name` (+ `description` when `name` exists), `category_id → category` (the category's `name`), `unit_price` (dollars) → `cost_minor + markup_minor` (cents; `cost_price → cost_minor`, `markup_percent` → derived), `unit → unit`, `image_url → thumb`, `vendor_id(s) → vendor` (the vendor's name), `is_active=false → deleted_at`; `source · external_ref · market_rate_* · tags · notes · spec_url · cost_type · waste_percent · order_index · approval_status · approver_user_id · embedding · pricing tiers · history` **missing** (Quotes / Price-book audit).

**D-80 · `quotes` template columns**: `payment_schedule[]` → `quote_payments` rows (`percent → pct`, `trigger → description`, `dueKind 'estimate'`; `type 'fixed'` **missing**); `doc_sections` → dropped (D-62); `preview_token*` → **missing**; `prepared_by_signature {storagePath, signerName, appliedAt}` → `members.signature_*` (per member, not per quote — the stamped-at-approval snapshot is **missing**); `label`, `quote_type`, `is_primary`, `is_omission` → the Quotes audit; `valid_until` → `valid_until`; `notes` → `notes_html`.

### 4.3 JSON-shape diff — 1.0 blocks / slots / knobs ↔ 2.0 pages / canvases / elements / settings

| Id | 1.0 concept | 2.0 home | Fit |
|---|---|---|---|
| D-90 | `pageRules.paperSize` / `globalStyles.paperSize` | `page.paper` (+ the row's `paper`) | same values `A4 · Letter` |
| D-91 | `pageRules.margin` (pt) / `globalStyles.margins` (preset or custom pt) | `page.margins` (mm) | × 0.3528; presets narrow/normal/wide → 12 / 18 / 25 mm (to confirm) |
| D-92 | `pageRules.watermark {text, opacity, rotation}` / `globalStyles.watermark {kind: text·logo, …}` | `page.watermark: string` | text only; opacity / rotation / logo watermark **missing** |
| D-93 | `pageRules.background`, `globalStyles.pageBackground` | — | **missing** (a `cover` `box` element can fill one page) |
| D-94 | `pageRules.pageIndicator` / `page-indicator` block / `globalStyles.pageNumber` | `pageno` element (`format 'Page {page} of {pages}'`) inside a `header` / `footer` canvas | format tokens `{n} {m}` → `{page} {pages}`; `skipFirstPage` → canvas `repeat: 'not-first'` |
| D-95 | `pageRules.runningHeader/runningFooter {blockId, fromPage}`, `running-header` block, any block's `repeatOnEveryPage`, `globalStyles.header/footer {left, center, right, heightPt}` | `header` / `footer` `CanvasBlock` (`height` mm, `repeat: every · first · not-first`, elements placed in mm) | 1.0 repeats flow blocks by flag; 2.0 repeats a canvas by rule. `fromPage 2` → `repeat 'not-first'`; `heightPt` → `height` mm; `left/center/right` token strings → three `text` elements |
| D-96 | `cover-page` block / v1 `cover` section (+ `coverTemplate`, `coverSlots[]` in % of page) | `cover` `CanvasBlock` (`repeat: 'first'`) with `box · image · text` elements in mm | slots → elements (`x% × 210 mm`); `kicker/title/subtitle` → `text` elements with `{quote_title}` / `Prepared for {client_name}`; `backgroundImageUrl · backgroundDim · accentStrip` → a `box` + `image` element; `showClientRow/… + labels` → a `kv` element; `imageFilter · imageZoom · overlay` **missing** |
| D-97 | `logo` block (`variant standalone · centered-stacked · with-wordmark-right`, `widthPt`, `tagline`, `stack {…}`, `wordmark {…}`) | `image` element `src: 'logo'` (+ a `text` element for the stack / wordmark / `{studio_tagline}`) | one block → two or three elements |
| D-98 | `doc-title` · `subject-line` · `intro-text` blocks / v1 `rich_text` | `title` block (`title · subject · intro` + styles) or a `text` block (`html`) | `case`, `underline`, `bold`, `sizePt`, `color` → `TextStyle`; `keepOnOnePage` → `keepWithNext` (partial); `repeatOnEveryPage` → move into the header canvas as a `text` element |
| D-99 | `subtitle-band` block | `text` block `box: 'tint'` (or a header `box` + `text`) | band colour = a brand key or hex |
| D-100 | `meta-kv` block (`rows [{label, valueSource, visible}]`, `layout stacked-tab · two-col-right · two-col-balanced`, `labelWidthPt`, `dateFormat`) / layout `header.fieldLabels` | `details` block (`left/right: KVRow[]`, `layout columns · stacked · form`, `labelWidth` mm) or a `kv` element in the header canvas | `valueSource` → `{field}` (`quote.date → {date}`, `client.name → {client_name}`, `client.phone → {client_phone}`, `quote.refNumber → {quote_number}`, `client.ic → {nric}`, `customerId → {customer_id}`, `validUntil → {valid_until}`, `propertyType → {property_type}`); `dateFormat` → `page.dateFormat`; `emptyRow` → `hideIfEmpty` |
| D-101 | `header-divider` / `divider` blocks | `rule` element (canvas) / `divider` block (flow) | `weightPt` → `weight` (pt kept), `useBrandAccent` → `color: 'accent'`; `dashed · dotted · double` **missing** |
| D-102 | `pricing-table` block (§2.4) + layout `sections.*` + theme `features.columns` | `items` block (§D-43) + `ClientView.columns` | `columns {ref, description, qty, unit, unitPrice, optionalPrice, total}` → `columns[].on` (`no, item, qty, unit, unitPrice, total`; `optionalPrice` → `optionalSection`); `columnWidths` (pt) → `width` (mm); `headers.*` labels → `columns[].label`, `headers.bandEnabled/case` → `headerRow: band/…` + `headerStyle.uppercase`; `numbering.mode` → `numbering` (`continuous-letter-number → continuous` + `sectionLabel letters`, `per-section-1n → group`, `per-subsection-1n → area`, `none → none`; 1.0's `1.2a` hierarchical ≈ `nested`); `sections.headingStyle` → `bandStyle` (`band-uppercase → grey/accent + areaStyle.uppercase`, `underlined-bold → underlined`, `plain / italic-plain → inline`), `sections.bandColor` → `bandStyle accent/black` (nearest brand key), `markersTemplate` **missing**, `subLine` → `groupNotes` + `groupNoteStyle`, `showCategoryDescriptions` → `groupNotes`; `subsections.style` → `areaStyle`; `subtotal.position` (`in-band-header · row-after-items · both · hidden`) → `subtotals` (row only; in-band **missing**), `labelTemplate` → `subtotalLabel` (`{section_letter}` → `{section}`); `style.zebraStriping → zebra`, `showRowBorders → ruled`, `rowPaddingY/lineHeight → density`, `showItemImages → photos`, `descriptionMuted → descriptionStyle.color grey`, `currencySplit → currency`; `zeroPrice.display/label` → `zeroAmount` (`FOC · Inclusive · 0.00 · blank`); `optional` → `optionalSection · optionalTitle`; `gst {label, position, format}` → `totals.lines.gst.label`; `totals {…}` → the `totals` block; `interSectionBlocks` / `parts` / `inlineInserts` → **missing** (no blocks between sections in 2.0) |
| D-103 | layout `totals.breakdownStyle` (`single-grand-total · stacked-discount · full-breakdown`), `gstLabel`, `roundOff`, `optionalWorksSection` | `totals` block `lines[] {key, on, label}` (`pages · subtotal · discount · additional · gst · total`), `layout right · full`, `rules` | `single-grand-total` → only `total` on; `stacked-discount` → `subtotal · discount · total`; `full-breakdown` → all on; `roundOff` → **missing** (2.0 rounds prices, `settings.quote_rules.roundStep`); `optionalWorksSection.includeInTotal` **missing** (2.0 optional lines never count) |
| D-104 | `payment-milestones` block (`layout list · table`, labels, `showAmounts`, `showOrdinal`, `footnote`, `showTotal`, `rowTemplate`) / layout `blocks.paymentTerms {style, body, position}` / v1 `payment_terms` | `payments` block (`layout table · list · cards`, `showAmounts`, `showDue`, `letters`, `band`, `showTotal`) | `showOrdinal` ≈ `letters`; `estCostsLabel/percentLabel/totalLabel/footnote/rowTemplate` **missing** (fixed words); `paymentTerms.body` (free text terms) → a `text` block; `position footer` → the footer canvas |
| D-105 | `bank-details` block + `paynow-qr` block / layout `footer.bankDetailsBlock · paynowQr` | `bank` block (`layout row · stacked`, `qr`, `qrWidth`, `box`) — prints the quote's issuing entity | labels (`holderLabel · accountLabel · swiftLabel`), `extraRows[]`, `autoTitleSG` **missing**; the QR image comes from the entity (`payNowQr`), never a template knob |
| D-106 | `gst-line` block (`template "GST Reg. No: {value}"`, `autoTemplate` per region) | a `text` element `GST Reg. No. {studio_gst}` (the default footer, `model.ts:236`) | region auto-template **missing** (SG only) |
| D-107 | `signature-footer` block (`two-col · three-col`, `leftColumn/rightColumn {heading, body[]}`) / layout `blocks.signatureBlock {name, phone, role, designerImageUrl, secondary}` / v1 `signature_block` | `signature` block or `signature` element (`columns[] {heading, lines[], image: none · member · client · stamp, caption}`) | `body[]` → `lines[]` (same tokens); `three-col` page column → a `pageno` element; `designerImageUrl` → `image: 'member'` (the member's saved signature); `secondary` → a third column |
| D-108 | `accreditation-strip` block (`source studio-curated`, `badges[]`, `rows`, `caption`) / `footer-band.mode accreditation` / `logoRow` | `badges` block or `badges` element (`items: string[]`, `height`, `gap`, `align`) | items = the kit's uploaded badge paths; `caption` **missing** |
| D-109 | `social-row` block (`entries[]`, `useBrandingLinks`, icons) | a `text` element with `{studio_social}` | icons and per-network entries **missing** |
| D-110 | `footer-band` block (`plain-text {body, links[], lineRule…}`, `multicol {columns[]}`, `tagline`) | the `footer` canvas: `text` elements (+ `rule`), `{studio_tagline}` | `links[]` (underlined URLs) and `multicol` → several `text` elements; `lineRule` → a `rule` element |
| D-111 | `image` block (`sizing fixed-width · fixed-height · full-width`, `rounded`) / v1 `image` (`imageLayout`, `imageCaption`) | `image` block (`src`, `width` mm, `align`, `caption?`) or `image` element (`fit contain · cover`) | `rounded` **missing** |
| D-112 | `spacer` (`heightPt`, `pageBreakBefore`) · `page-break` | `spacer` (`height` mm) · `pagebreak` (or any block's `startNewPage`) | |
| D-113 | v1 `callout` (`calloutVariant info · warning · success · note`), `two_column` (`leftContent · rightContent · columnRatio`), `bullet_list`, `terms_conditions` | `text` block with `box: tint · outline` · two `text` blocks · `text` (HTML list) · `terms` block | variant colours, ratios **missing** |
| D-114 | `QuoteCanvaBlock.hidden` · v1 `hidden` · `visibilityRule` | `BlockBase.hidden` | conditional rules **missing** |
| D-115 | free positioning (`freePositioned, fpX…` in pt / % on any body block) | only canvases place elements (mm); flow blocks stack | body-level free placement **missing** |
| D-116 | `overridability: Record<KnobPath, boolean>` + `BlockOverridesByQuote` (per-quote knob values) | `ClientView` (14 client-facing switches) + `quotes.client_view_json` | knob-level per-quote overrides **missing**; only what the client sees is per quote |
| D-117 | theme `colors.*` (12 hex) | `brand.colors` (6 keys) + `TextStyle.color` on each block | see D-72 |
| D-118 | theme `typography {fontFamily, sizeScale, lineSpacing, *Size, bodyWeight, letterSpacing}` | `brand.fonts {heading, body, table, small}` (`family, size, weight, italic`) + `TextStyle.lineHeight / letterSpacing` | roles replace the scale |
| D-119 | theme `spacing {sectionGap, rowPaddingY, subsectionIndent, bandHeightPt, tableHeaderRuleWeight}` | `ItemsBlock.density`, `BlockBase.spaceBefore/After` | coarse |
| D-120 | theme `features {sectionDescriptionEnabled, currencySplitRendering, columns, smartUnitHiding, continuationMarker, rowStriping}` | `groupNotes · currency · columns[].on · zebra` | `smartUnitHiding`, `continuationMarker` **missing** |
| D-121 | `globalStyles.toc`, `includeCoverPage`, `logoStyle masthead`, `font.family Outfit` | — / a `cover` block present / a full-width header `image` / not in `FONT_FAMILIES` | **missing** |
| D-122 | tokens `{studio_name} {client_name} {prepared_by} {prepared_by_phone} {prepared_by_email} {studio_phone} {studio_email} {studio_website} {client_ic} {n} {m} {value} {section_letter} {title}` (`src/lib/quote-pdf-tokens.ts`, `tokens.ts`) | `fields.ts` (`{studio_name} … {nric} {page} {pages} {studio_gst} {section}`) | same syntax `{key}`; renames `client_ic → nric`, `n → page`, `m → pages`, `section_letter → section` |
| D-123 | `body_json.items[]` (`mode: full`) — the skeleton's lines | `price_book_sections` (one per category) + `defaults_json.starterGroups` (the category names) | a design template never carries lines in 2.0 |
| D-124 | `RenderContext.voContext`, `isOmission` (Variation Orders) | — | **Later** (Finance) |
| D-125 | `RenderContext.signedSignature`, `preparedBySignature` (stamped signatures on the executed PDF) | `signature` column `image: member · client` (drawn live from `members.signature_data` / the signing page) | the frozen image at signing → the Contracts audit |

### 4.4 Enums and units

| Concept | 1.0 | 2.0 | Mapping |
|---|---|---|---|
| Money | `NUMERIC(12,2)` dollars (lines, price book, assemblies items, `quote_total`); `BIGINT` cents (`quotes.*_cents`, `competitor_benchmark_cents`, `default_unit_price_cents`) | `integer` cents everywhere (`*_minor`) | dollars × 100 → cents; cents unchanged |
| Margin | `margin_percent NUMERIC(5,2)`, `markup_percent`, `default_margin_bps` (basis points) | `markup_minor` (cents), `rebate_minor` | percent → `cost × pct / 100` cents; bps ÷ 100 first |
| Discount | `discount_type none · percent · flat`, `discount_value`, `discount_label` | `discount_pct real` (line); `NamedDiscount { mode: pct · amount, value }` (quote) | `flat → amount` only at quote level |
| Tax | `tax_rate NUMERIC(5,4)` (0.09), `tax_inclusive`, per-entity `tax_rate` | `gst_pct real` (9), `gst_enabled`, `IssuingEntity.gstRegistered` | fraction × 100 |
| Document units | **pt** (all block knobs, margins, `heightPt`), **%** of page (cover slots, fp*) | **mm** (margins, canvas element `x y w h`, block `width`, `columns[].width`); font sizes stay **pt** | 1 pt = 0.3528 mm; % → × 210 / 297 (A4) |
| Paper | `A4 · Letter` | `A4 · Letter` | same |
| Date format | `meta-kv.dateFormat` (block knob, `'inherit'` or a pattern), `quoteDate` pre-formatted | `page.dateFormat: short · long · weekday` | pattern → the nearest of three |
| Template kind | `type` CHECK `quote_pdf · tnc · contract · signing_flow · timeline · portal · invoice · po · vo` | four tables: `quote_templates` (`kind 'design'`), `quote_text_templates` (`kind terms · notes`), `contract_templates`, `payment_templates` | D-50…D-54 |
| Template lifecycle | `is_active`, `is_default` | `status draft · published · archived`, `version`, `deleted_at`, `is_default`, submission columns | §4.2 D-71 |
| Amount marker / print word | `amount_marker` free text ≤ 24 (`inclusive · foc` canonical); `price_type amount · foc · kiv · inclusive · by_client · lump_sum · content_block`; `zeroPrice.display zero · label` | `print_as foc · inclusive · kiv · behalf · packaged · custom` + `print_as_text`; `ItemsBlock.zeroAmount FOC · Inclusive · 0.00 · blank` | D-76 |
| Highlight | palette name (`yellow`, `brandBlue`, …, `highlight-palette.ts`) or `#rrggbb` | `accent · red · grey · light · band` (text vs fill by `HIGHLIGHT_KIND`) | nearest key |
| Numbering | `continuous-letter-number · per-section-1n · per-subsection-1n · none`; `ref_override` | `group · area · continuous · none · nested`; `no_number` | D-102 |
| Section heading | `band-uppercase · underlined-bold · italic-plain · plain` (+ `markersTemplate`) | `bandStyle grey · accent · black · underlined · inline` + `areaStyle` | D-102 |
| Sub-total position | `hidden · in-band-header · row-after-items · both` | `subtotals: boolean` (row) | in-band **missing** |
| Totals breakdown | `single-grand-total · stacked-discount · full-breakdown` | `totals.lines[].on` | D-103 |
| Header layout | `single-band · two-column · structured-keyvalue · centered-logo-stacked`; `meta-kv.layout stacked-tab · two-col-right · two-col-balanced` | `details.layout columns · stacked · form`; free `kv` elements | D-100 |
| Payment milestone | `{ name, type? fixed · percent, percent, amountCents?, trigger }` | `{ name, description, pct }` + `dueKind approval · estimate · fixed` (a **date** kind, not an amount kind) | `fixed` amounts **missing** |
| Signature | `signature_data` base64 PNG (client); `prepared_by_signature {storagePath, sha256}`; `studio_assets type=signature` | `members.signature_kind draw (SVG path, viewBox 752×140) · type (a name)`; `contracts.signed_by / signed_nric` (masked) | image formats differ |
| Quote status | `draft · submitted · approved · rejected · sent_for_signature · client_signed` (`DbQuote.status` comment) | `Draft · Sent for Approval · Approved · Sent to Client · Confirmed · Signed` | D-73 |
| Fonts | `Helvetica · Times-Roman · Courier · Georgia · Inter · Outfit` (+ uploaded `studio_assets type=font`) | `FONT_FAMILIES` 14 names (`model.ts:35`) | `Times-Roman → Times New Roman`, `Courier → Courier New`, `Outfit` **missing** |
| Colours | hex per knob (`#5500FF` accent default in both) | brand key or hex | |
| Ids · time | UUID · timestamptz ISO | text · unix seconds | keep the UUID text; `Date.parse / 1000` |

---

## 5. Port plan

A port is a one-shot import of one 1.0 studio's rows into the 2.0 tables. It runs in this order because of the references: `settings.brand` (D-78, D-77) → `payment_templates` (D-75) · `quote_text_templates` (D-51) · `contract_templates` (D-52) → `price_book_items` (D-79) → `price_book_sections` (D-74) → `quote_templates` + `quote_template_versions` (5.D) → `quotes.template_id / template_version / client_view_json` (5.D). Ids: the 1.0 UUID string becomes the 2.0 `text` id (D-71), so a re-run is `INSERT OR IGNORE` and needs no `legacy_id`. Times: `Date.parse(ts) / 1000`. Money: dollars × 100 → `*_minor`, cents unchanged (§4.4). The parity rules still apply: nothing below gets built until the owner marks it.

### 5.A New 2.0 tables (keep 1.0 names)

All the data a 1.0 quote template **prints** already has a home in 2.0: an existing table, a JSON key or a code constant (§4.1). Only the three tables below hold 1.0 data that 2.0 can't keep today without losing some of it. Each one is conditional, and each has a JSON alternative that needs no new table.

| Id | 1.0 table | Why 2.0 would need it | Columns to carry |
|---|---|---|---|
| D-126 | `studio_companies` (D-13) | Two 1.0 behaviours need an addressable entity: templates scoped to an entity (`studio_document_templates.company_id`, `166_doc_templates_per_entity.sql:14-17`: entity row → studio-wide row → fallback), and the UEN / GST no. / address / tax rate / logo each entity prints. 2.0's `IssuingEntity` is JSON inside `settings.brand` (max 6, `lib/templates/brand.ts:36-40`) with only `name · bankName · accountName · accountNo · payNow · payNowQr · gstRegistered` (`lib/templates/model.ts:46`). `quotes.issuing_entity` holds the entity's **name**, so a rename breaks the link | `id`, `name`, `registration_number` → `uen`, `gst_registered`, `gst_registration_number` → `gst_reg`, `address`, `tax_rate` (fraction → `gst_pct real`), `bank_details` → `bank_name · account_name · account_no · swift_code · branch`, `branding.paynowQrUrl` → `paynow_qr` (+ `settings.payment_details.paynow_id` → `paynow`), `branding.{logoUrl, primaryColor, footerText, contactPhone, contactEmail, website}`, `is_default` → `position 0`, `is_active` → `deleted_at`. Alternative: widen `IssuingEntity` instead (D-133) |
| D-127 | `studio_quote_categories` (D-18) | Three things are per studio in 1.0: the default section order (`compose-quote-body.ts:70-75`), a category `description` printed under the band when `showCategoryDescriptions` is on (`174_quote_category_descriptions.sql:8-12`), and the `subcategories[]` sub-heading list (`172_quote_subcategories.sql:9-12`). 2.0 has only `settings.trades: string[]` (`lib/settings/types.ts:104`). Its section note lives on each quote's group row | `id`, `name`, `order_index` → `position`, `description`, `subcategories` (JSON `string[]`), `is_active` → `deleted_at`. Alternative: make `settings.trades` a list of `{ name, description, subs[] }` |
| D-128 | `studio_quote_theme_presets`, custom row only (D-02; `idx_one_custom_preset_per_studio`, `176_quote_theme_presets.sql:35-39`) | Only needed if a studio's saved look has to be reusable across templates. 2.0 house styles are code (`lib/templates/presets.ts:183-187`), and a template's `brand` overrides cover one template at a time | Not needed: port the row as a draft template instead (D-164) |

### 5.B Columns to add to existing 2.0 tables

| Id | 2.0 table | 1.0 column | 2.0 column | Type / unit | Note |
|---|---|---|---|---|---|
| D-129 | `quote_templates` | `studio_document_templates.company_id` | `entity text NULL` (the `IssuingEntity` name, or `studio_companies.id` if D-126 is built) | text | Brings back 1.0's resolution: when a quote's `issuing_entity` is set, create it from that entity's default, else the studio's. `is_default` then means one default per `entity`, where today it is one overall (D-71) |
| D-130 | `quote_templates` | `body_json.source` (`manual · ai_extracted · platform_default`), `body_json.sourceFileName` | `source text NULL`; `sourceFileName` goes into the existing `source_file` | text enum (`manual · recreated · imported`) | Records where a ported row came from. 2.0 writes `source_file` only for "Recreate from my current quote" |
| D-131 | `payment_templates.rows_json` (JSON) | `payment_schedule_templates.stages[].type` / `amountCents` (`app.ts:2436-2448`) | `SplitRow.kind: 'pct' \| 'amount'`, `SplitRow.amountMinor` | integer cents | 1.0's `fixed` milestone (D-75). The totals rule for mixing fixed and percent rows belongs to the Quotes audit |
| D-132 | `quote_payments` | `quotes.payment_schedule[].type` / `amountCents` (`app.ts:950-963`) | `amount_minor integer NULL` (+ `kind`) | cents | The same gap at the quote level (D-80). Also needed for 1.0 `quote_versions.payment_milestones` inside `snapshot_json.payments` |
| D-133 | `settings.brand.details.entities[]` (JSON) | `studio_companies.registration_number · gst_registration_number · address · tax_rate`, `bank_details.swiftCode · branch · payeeNotes` | `IssuingEntity.uen · gstReg · address · gstPct · swift · branch · payeeNotes` | strings; `gstPct` real (9) | Only if D-126 is not built. Fields such as `{studio_uen}` and `{studio_gst}` would resolve against the quote's entity first, the way 1.0 resolves `resolvePaynowQrUrl` (`app.ts:4197-4201`) |
| D-134 | `settings.brand.kit.badges` (JSON) | `branding.accreditations[{name, imageUrl}]`; `platform_accreditation_badges.name · short_name` | `badges: { src, name }[]` (today `string[]`, `model.ts:55-67`) | | Keeps the badge names, which the 1.0 `accreditation-strip` caption uses (D-108) |
| D-135 | `settings.brand.details.social` (JSON) | `branding.socialLinks {website, instagram, facebook, linkedin, whatsapp, tiktok}` | `social: Partial<Record<…6 keys, string>>` (today one string) | | D-78 "structure lost" |
| D-136 | `price_book_sections` | `studio_assemblies.created_by`, `category`, `tags[]` | `created_by text`, `category text` | text | 2.0 shows `author: null` (`lib/company/price-book.ts:32`); `tags` are not ported (D-150) |
| D-137 | `price_book_sections.lines_json` (`SavedLine`) | `AssemblyItem.isOptional`, `priceBookItemId` (`305_package_items_pricebook_vendor.sql`) | `SavedLine.optional: boolean`, `SavedLine.priceBookItemId: string \| null` | | D-74 lists both as missing. A package line then re-links to its price-book item when it is inserted |
| D-138 | `quote_items` | `quote_line_items.ref_override` (`200`) | `ref_override text NULL` | text | 2.0 only covers `'-'` (→ `no_number`). The Quotes audit decides |
| D-139 | `quotes` | `preview_token`, `preview_token_created_at` (`109_quote_preview_tokens.sql:6-13`), `preview_view_count` (`187:9-10`) | same names | text · ts · integer | D-65. The Quotes audit decides |
| D-140 | `quotes` | `prepared_by_signature` JSONB (`269_quotes_signature_columns.sql:5-6`, `DbPreparedBySignature` `database.ts:705`) | `prepared_by_signature_json text` (`{ memberId, kind, data, name, appliedAt }`) | JSON | Freezes the member's signature at approval. Today the print draws the member's live `members.signature_*` (D-80, D-125) |
| D-141 | `settings` (new key) | `studios.settings.quoteSharingMethod`, `quoteLinkExpiryDays`, `branding.quotePreparedByMode`, `branding.currencySymbolOverride` | key `quote_sharing = { method, linkExpiryDays }`; `quote_rules.preparedByMode` | JSON | D-78. The Quotes audit decides. `currencySymbolOverride` maps onto the existing `ItemsBlock.currency` for each template |
| D-142 | `quote_templates.design_json` (`TemplateDesign`) | layout `totals.roundOff {enabled, label}`, `optionalWorksSection.includeInTotal`, `pageRules.watermark.opacity/rotation`, `pageRules.background`, `pricing-table.sections.markersTemplate` | a `roundOff` key on `TotalsBlock.lines`; `page.watermarkOpacity`, `page.background`; `ItemsBlock.markers` | | Only the §4.3 gaps whose values a studio actually set (the El Arte row sets `roundOff`, `elarte-template-knobs-200.sql`). Without these columns the port drops them and says so in the version row's `note` |

### 5.C Not ported

| Id | 1.0 table / column | Reason |
|---|---|---|
| D-143 | `studio_document_templates` `type = invoice · po · vo` rows + `InvoicePOTemplateBody` (`168`, `170`) | **Later**: Finance. 2.0 has no invoices, POs or VOs |
| D-144 | `studio_document_templates` `type = signing_flow · portal · timeline` (`config`) | **Later / superseded**: the signing order is `contract_bundles`' member order; the portal is the Leads audit's portal records (REG-609); timeline belongs to Projects |
| D-145 | `studio_document_templates.variables`, `.body_react_component` (`'BrandedQuotePDF'`), `.config.showCoverPage` for rows with no body | **Dead**: informational, or a component name. `config.accentColor` is the exception and is carried (D-161) |
| D-146 | `studio_quote_theme_presets` system rows (`preset-minimal · preset-arthaus · preset-flo-style · preset-studio-loft`, `176:43-97`) | **Superseded** by the code house styles `letter · scope · form · presentation` (`presets.ts:183-187`). The custom row → D-164 |
| D-147 | `quote_generation_rules` (D-03) | **Later**: 2.0 has no rule engine. `defaults_json.starterGroups` is the nearest thing |
| D-148 | `quote_templates` (1.0, D-04) | **Superseded**, in 1.0 itself, by Packages. No `scripts/` migration creates it. If a studio has rows, each `line_items[]` goes through D-74 as one `price_book_sections` row |
| D-149 | `studio_assemblies` rows with `is_system` / `studio_id IS NULL` | **Platform**: 2.0 has no platform-authored content (D-59) |
| D-150 | `studio_assemblies.scope · hierarchy · region_code · property_type · tags` | **Dead** after `270` (every row is `category`, `hierarchy` NULL). `region_code` / `property_type` are **Platform** picker filters. `tags` have no 2.0 filter |
| D-151 | `quote_packages` (D-06) + `quote_signature_requests.client_selections` | **Later**: Good / Better / Best tiers |
| D-152 | `quote_versions` (1.0) `.doc_sections · .hierarchy_snapshot · .quote_metadata_snapshot · .totals` | **Superseded**: the design is the pinned template version, the hierarchy is `quote_items.parent_id`, and totals are derived (D-73) |
| D-153 | `leads.quote_hierarchy_metadata` | **Superseded / dead**: legacy since `189_quote_metadata_hierarchy_backfill.sql`. The port reads `quote_metadata` instead (D-166) |
| D-154 | `leads.quote_metadata.canvaBlocks · layoutOverrides · themeOverrides`, `quotes.doc_sections` as stored JSON | **Superseded** by the template pin. They are not kept as columns; D-166 decides which template each one pins to |
| D-155 | `body_json.overridability`, `BlockOverridesByQuote`, `globalStyles.toc`, `font.sizeScale`, `lineSpacing`, `freePositioned / fp*` on body blocks, `inlineInserts`, `interSectionBlocks`, `visibilityRule` | **Superseded** by `ClientView`, or **missing** in the 2.0 model (§4.3 D-102, D-113…D-116). The port flattens them (5.D) and does not keep the values |
| D-156 | `platform_accreditation_badges` + `settings.enabledAccreditationIds` | **Platform**. The enabled badges' images are copied into `kit.badges` (D-165) and the catalogue stays in 1.0 |
| D-157 | `studio_assets` `type = font` | **Later**: 2.0 fonts are the curated `FONT_FAMILIES` (`model.ts:35`). A template that uses an uploaded font falls back to `Helvetica`. `type = logo` → `kit.logo`; `badge` → `kit.badges`; `signature` → `members.signature_*` only when `metadata.designerName` matches a member |
| D-158 | `studio_signing_documents` (D-12); `quote_signature_requests.document_hash · signing_hash · audit_trail · verification_method · signed_packet_path · document_acknowledgements` | **Later**, or the Contracts audit |
| D-159 | `studios.settings.client_portal`, `.quoteDocumentTemplates`, `.quote_templates` | **Dead**: backfilled by `115`, moved by `167`, and nothing writes the last one (D-14) |
| D-160 | `quote_line_items.comments · competitor_* · ai_suggestion · source · package_tier · waste_percent · cost_type · price_snapshot_at`; `quote_status_history`; `render_share_links`; `project_templates` · milestone / timeline templates | **Quotes audit / Later / out of scope** (D-76, D-22, D-23, D-20, D-21) |

### 5.D State mapping for a 1.0 template / quote layout

**D-161 · A `quote_pdf` row → a `quote_templates` row (row level, any body).**

| 1.0 | 2.0 |
|---|---|
| `id` | `id` (the UUID string) |
| `name` | `name`. A `company_id` row adds " — {entity name}" unless D-129 is built |
| `is_default` (studio-wide scope, `company_id IS NULL`) | `is_default`. An entity's default ports non-default unless D-129 is built |
| `is_active = false` | `deleted_at = updated_at`, `deleted_by NULL` |
| `last_used_at · created_at · updated_at` | same, in unix seconds |
| — | `kind 'design'`, `status 'published'`, `version 1`, `published_at = updated_at`, `updated_by NULL`, `note 'Imported from OpenMaison 1.0'` (+ any dropped knob, D-142), `paper` = `pageRules.paperSize` / `globalStyles.paperSize`, else `'A4'` |
| — | one `quote_template_versions` row: `version 1`, the same `design_json` / `defaults_json` / `note`, `published_at`, `published_by NULL` (`schema.ts:545-556`) |
| `body_json NULL` (the `118` seed: `body_react_component 'BrandedQuotePDF'`, `config {accentColor, showCoverPage}`, `118:14-20`) | `design_json` = the `letter` house style (`presets.ts:184`, the same one `fallbackDesign()` picks at `lib/templates/queries.ts:32`) with `brand.colors.accent = config.accentColor` when that is not `#5500FF`; `showCoverPage: true` adds a `cover` block |

**`defaults_json`** for every ported template: start from `DEFAULT_DEFAULTS` (`model.ts:205`), then:
- `paymentPreset` = the id of the studio's `payment_schedule_templates` row with `is_default` (D-75), else `'default'`.
- `termsTemplateId` = the ported id of the studio's (or entity's) default `tnc` row (D-51).
- `gstEnabled` = the entity's `gst_registered`, else the studio's.
- `starterGroups` = the names of the active `studio_quote_categories`, ordered by `order_index` (D-18).
- `validityDays` stays 30: 1.0's `quoteLinkExpiryDays` is the link's expiry, not the quote's validity (D-78).

**D-162 · A `schemaVersion 2` (canva) body → `design_json`.** `pageRules` → `page` (D-90…D-94, pt × 0.3528 → mm). `globalStyles.theme` → `brand` overrides plus the `items` block styles (D-72, D-117…D-120). `overridability` is dropped (D-155). `blocks[]` go to a place by zone, in order:
- **Header canvas:** blocks whose zone is `header`, and any block with `repeatOnEveryPage` or named by `pageRules.runningHeader`, become elements of one `header` `CanvasBlock`. They sit at `y` = the running sum of their rendered heights in mm, because 1.0 flowed them. `runningHeader.fromPage 2` → `repeat 'not-first'` (D-95…D-101).
- **Footer canvas:** footer-zone blocks (`footer-band`, `gst-line`, `page-indicator`, `social-row`, …) do the same in a `footer` `CanvasBlock` (D-106, D-108).
- **Cover:** `cover-page` → a `cover` `CanvasBlock`, `repeat 'first'` (D-96).
- **Flow blocks, in their 1.0 order:**
  - `pricing-table` → one `items` block, plus a `totals` block built from its `totals {}` part, because 1.0's table owns the totals (D-102, D-103).
  - `payment-milestones` → `payments` (D-104).
  - `bank-details` + `paynow-qr` → one `bank` block (D-105).
  - `signature-footer` → `signature` (D-107).
  - `intro-text` / `doc-title` / `subject-line` → `title` or `text` (D-98).
  - `subtitle-band` → `text` with `box 'tint'` (D-99).
  - `meta-kv` → `details` (D-100).
  - `image` / `divider` / `spacer` / `page-break` → the same kinds.
- `hidden` → `hidden`. A `freePositioned` body block is placed in the flow by its `fpY` (D-115).
- A second copy of a `COLLAPSE_TO_FIRST` type is dropped, as 1.0's own `collapseDuplicateBlocks` does (`migrate.ts:51-63`).

**D-163 · A `schemaVersion 1` (legacy `sections`) body → `design_json`.** There are two routes.

- **(a) 1.0's own `migrateSectionsToCanvaBody` (`migrate.ts:126`), then D-162.** This is lossy by design: it skips `cover · callout · image · payment_terms · signature_block · two_column` (`migrate.ts:11-14`).
- **(b) Direct mapping, the higher-fidelity route:**
  - `cover` (+ `coverSlots` in % of the page) → a `cover` canvas (D-96).
  - `header` / `footer` sections and `globalStyles.header/footer {left, center, right}` → canvases with three `text` elements (D-95).
  - `rich_text` · `bullet_list` · `callout` · `two_column` → `text` blocks (`callout` → `box 'tint'`; `two_column` → two `text` blocks, the ratio lost, D-113).
  - `pricing_table` → `items` + `totals`, with `inlineInserts` dropped (D-155).
  - `payment_terms` → a `payments` block when the content is structured, otherwise a `text` block with the prose. The El Arte row's split sits inside free text (`178_seed_el_arte_quote_template.sql`), so it becomes a `text` block, and a matching `payment_templates` row 20/40/35/5 is only created by hand.
  - `terms_conditions` → a `terms` block, plus a `quote_text_templates` row `kind 'terms'` (title = the section title, else "Terms and Conditions"; body = the section's content with `\n` → `<p>`), and `defaults_json.termsTemplateId` points at it.
  - `signature_block` → `signature`; `image` · `spacer` · `divider` → the same kinds.

  Then `globalStyles.layout` (the Phase 18 knobs) → the block knobs (D-100…D-107), and `globalStyles.theme` → D-72.

Wherever a 1.0 body carries these, apply them too:
- `brandColor` / `logoUrl` inside the body → `design_json.brand.colors.accent` / `brand.logo`.
- `mode 'full'` with `items[]` (the Arthaus seed, 40 lines): the design as above, plus **one `price_book_sections` row per category** (the same split `270_split_project_packages_into_category.sql` made), each named "{template name} — {category}" and carrying `lines` in cents (D-74).
- `mode 'structure'`: no lines, because the prices are scrubbed. The categories go into `defaults_json.starterGroups` only.

**D-164 · A `studio_quote_theme_presets` row.** A system row is not ported (D-146). A custom row (`studio_id` not null) becomes a `quote_templates` row with:
- `status 'draft'`, `version 0`, `is_default 0`: the shape R32 writes for a never-published template (`scripts/repair-demo-data.ts:745-747`);
- `name` = the preset's name;
- `draft_json = { design: letter with theme → brand overrides (D-72) and layout → block knobs, defaults: DEFAULT_DEFAULTS }`;
- `design_json NULL`, and no version row.

**D-165 · A `studio_assemblies` package → `price_book_sections`.**
- Only `scope 'category'` rows with a `studio_id`. On a database from before `270`, split `scope 'project'` rows by category first, as `270` does.
- `id · name · description · last_used_at · created_at · updated_at` → same.
- `lines_json = { name, description, descriptionHtml: null, lines: items with no subcategory, subs: one per distinct subcategory }`, with each `AssemblyItem` → `SavedLine` per D-74 (dollars → cents, `amount_marker` → `printAs`).
- `category` → every line's `category`, or D-136.
- `priceBookItemId` / `isOptional` are lost unless D-137 is built.
- The enabled platform badges and the package's vendor names are not part of this row.

**D-166 · A quote's layout → `quotes.template_id / template_version / client_view_json`.** 1.0 resolves a quote's design through a four-rung ladder (`compose-quote-body.ts:212-243`), and in `strict` server mode it renders the legacy PDF whenever rung 1 is missing. The port follows the same ladder, one lead at a time:
1. **`leads.quote_metadata.canvaBlocks` is a valid canva body** (`isCanvaBody`, `migrate.ts:359`). Normalise it, then deep-compare it with the studio's default `quote_pdf` `body_json`.
   - If they are equal, pin the quote to that template's ported id at `template_version 1`.
   - If they differ, there are two options. **(i)** Create a template "{lead name} — imported layout" (published v1 + its version row, not default) from the body by D-162 and pin the quote to it: exact, but one template per customised lead. **(ii)** Pin the studio default: the per-quote design is lost. `canvaBlocks` sits on the **lead**, so every `quotes` row of that lead gets the same pin (D-09).
2. **Otherwise `quotes.doc_sections` is non-empty.** Same as step 1, with the body built by D-163.
3. **Otherwise** pin the studio's default template (the ported id), version 1.

Then, for every quote:
- `layoutOverrides` / `themeOverrides` → only the parts `ClientView` can hold: `features.columns.showQty · showUnit · showRate` → `client_view_json.columns.qty · unit · unitPrice`; `optionalWorksSection.enabled` → `optionalWorks`; `blocks.paymentTerms.enabled` → `paymentSchedule`; `blocks.signatureBlock.enabled` → `signature`. `client_view_json` stays NULL when none of these differ from the pinned design (`clientViewFromDesign`, `lib/templates/client-view.ts`). Every other knob is lost under 3, or folded into the template under 1(i) (D-63).
- `categoryOrder` → the group rows' `position`; `sectionDescriptions[cat]` → the group row's `description`; `subsectionOrder` / `subsectionDescriptions` → the child group rows (`parent_id`) and their `description`; `subsectionTotalLabels` → the child group's `print_as_text` (D-64).
- `gstEnabled` → `quotes.gst_enabled` (null → the template default).
- `docDiscount { type, value }` → `quotes.discounts_json = [{ id, label: 'Discount', mode: percent → 'pct' · flat → 'amount', value }]`. The `amount` value stays in dollars: `lib/quotes/math.ts:120` multiplies by 100.
- A signed 1.0 quote (`client_signed`) keeps its pin even when the template is later republished, because 2.0 prints a pinned version (REG-489). 1.0's frozen signing artefact (`quote_signature_requests.quote_snapshot`, `signed_pdf_url`) belongs to the Contracts audit.

**D-167 · The `tnc` / `contract` rows next to it.**
- A `tnc` row → `quote_text_templates` with `kind 'terms'`, `title = name`, `body = body_html`. Tokens are rewritten: `{{client_name}}` → `[Client Full Name]`, `{{studio_name}}` → `[Studio Name]` (`lib/quotes/text.ts:19-24`). `{{quote_total}}` · `{{current_date}}` have no 2.0 token and stay as typed. 2.0 resolves tokens when the text is added to a quote, not at signing.
- A `contract` row → `contract_templates` (D-52; its chip mapping belongs to the Contracts audit).

### 5.E Demo data — 1.0 seeds vs 2.0 seeds

| Id | 1.0 seed (`path:lines`) | What it writes | 2.0 counterpart | Fit |
|---|---|---|---|---|
| D-168 | `scripts/migrations/118_seed_default_document_templates.sql:14-50` | For every studio: `Default Quote PDF` (`quote_pdf`, no body, `config {accentColor #5500FF, showCoverPage false}`), `Default Terms & Conditions` (`tnc`), `Default Contract`, `Default Signing Flow` (`docOrder quote · tnc · contract`), `Default Payment Portal` | R22 (`repair-demo-data.ts:465-477`) seeds `Default Quote PDF` (default), `4-Room BTO`, `5-Room BTO`; R31 (`:709-737`) gives them the `letter` / `scope` / `form` designs, v1 and their version rows; R26 (`:629-…`, `TEMPLATE_SEED` in `lib/quotes/text.ts`) seeds the terms / notes library; R34 (`:838-858`) seeds the two contract templates | Same name for the default. 2.0 carries real designs where 1.0's seed has none |
| D-169 | `168_seed_invoice_po_default_templates.sql:31,67`, `170_seed_vo_default_templates.sql:33` | `Default Invoice` · `Default PO` · `Default VO` | — | Later (D-143) |
| D-170 | `167_unify_quote_templates.sql:32-52` | A data move, not a seed: `settings.quoteDocumentTemplates[]` → `quote_pdf` rows, then one default promoted per scope (`:54-…`) | — | Nothing to match |
| D-171 | `176_quote_theme_presets.sql:43-97` | Four system presets: `Minimal` · `Arthaus` · `Flo-style` · `Studio Loft` | `presets.ts:183-187` `letter · scope · form · presentation` (code) | Different sets. 1.0 presets are knob overrides; 2.0 styles are whole designs built from the owner's three reference quotes |
| D-172 | `178_seed_el_arte_quote_template.sql` (fork-only, no-op elsewhere `:36-45`) | `El Arte Standard Quote`: v1 `sections` (design services list · pricing table · payment terms prose · notes to the client) + Phase 18 layout; `mode 'structure'`; `is_default true`, demoting the others (`:230-269`) | — | No 2.0 seed. The nearest is R31's `letter` |
| D-173 | `scripts/seed-arthaus-hdb-3room-quote-template.sql:19-45` | `HDB 3-Room Renovation` (`b2200000-…302`, `quote_pdf`, not default): `sections []`, `mode 'full'`, 40 lines in dollars | — (2.0 never keeps lines on a design template) | Would port to category sections (D-163) |
| D-174 | `scripts/seed-arthaus-hdb-3room-assembly.sql:18-35` | Package `HDB 3-Room Renovation (Comprehensive)` (`a1100000-…301`): 36 items, category `Renovation`. Made `scope 'project'` by `184:40-61`, then split by `270` | R38 (`:883-906`): one saved section, `pbs-bathrooms-full-works`, built from OM-10008's Bathrooms group, plus price-book vendors | 1 vs 11 category rows after `270` |
| D-175 | `scripts/seed-elarte-quote-templates.sql:25-49` (El Arte), `scripts/seed-staging-quote-templates.sql:21-43` (Arthaus staging) | Packages made by the `create_template_from_quote` RPC from a real lead: El Arte `Full Home Renovation (Starter)` · `Carpentry Package` · `Demolition & Hacking Package`; staging `Carpentry Package` · `Demolition & Hacking Package` · `Plumbing Package` | R38's single section | 2.0 has one; 1.0 has three per environment |
| D-176 | `src/lib/quote-canva/reference-templates.ts:49, 264, 502, 679-697` | Code constants `TEMPLATE_DYEL` · `TEMPLATE_IDL` · `TEMPLATE_FLO` (picker labels `Minimal` · `Centered Premium` · `Branded`); `TEMPLATE_DYEL` is the ladder's fourth rung | `presets.ts` `letter` (Dyel), `scope` (Flo); `form` comes from Cove, not IDL | Two of three share a source quote. IDL has no 2.0 style |
| D-177 | — | — | R32 (`:738-750`): the `Showflat Presentation` draft awaiting approval; R35 (`:862-881`): four `payment_templates` presets (`default · 20-40-40 · 30-70 · 50-50`); R36 (`:773-800`): the studio as the first `IssuingEntity`, a `print_as 'foc'` line | 2.0 only. 1.0 seeds no payment-schedule templates and has no approval state |

## Uncertain / not verified

- **D-162 zone assignment.** Whether a canva block's zone can be read from the body. 1.0 derives it from the block schema's `allowedZones` and the block's order, not from a stored field, so a block allowed in both `header` and `body` (`doc-title`, `meta-kv`, `subtitle-band`) needs a rule (for example "before the first `pricing-table` = header"). Not checked against 1.0's paginator.
- **D-166 lead vs quote.** `canvaBlocks` sits on `leads.quote_metadata`, so every quote of a multi-quote lead shares one design. That follows from the column's location (D-09) and the ladder's inputs; I did not trace whether the multi-quote editor writes it per quote anywhere else.
- **The 1.0 `strict` server path** renders the legacy `BrandedQuotePDF` when `canvaBlocks` is missing (`compose-quote-body.ts:226-230`). A 1.0 quote with no `canvaBlocks` therefore printed through the legacy renderer, not its `doc_sections` or the studio default. D-166 step 3 pins the default template, the closest 2.0 equivalent; the printed result will differ.
- **`defaults_json.introText`** is declared and defaulted (`model.ts:198, 205`), but nothing in `lib/`, `app/` or `components/` reads it. A ported intro therefore goes into a `title` / `text` block, not `introText`.
- **The font-size mapping** for `sizeScale` (compact 8 · normal 9 · comfortable 10, D-72) and the margin presets narrow / normal / wide → 12 / 18 / 25 mm (D-91). Neither is checked against either renderer.
- **Whether production databases hold D-04 `quote_templates` rows.** No `scripts/` migration creates the table (D-04).
- **Whether platform `studio_assemblies` rows are readable** under `226`'s direct-scope policy (D-05). This matters only if the owner wants platform packages copied into a studio (D-149 says no).
- **D-126 vs D-133, and D-127 vs a richer `settings.trades`**, are the owner's call. Either route carries the data; the tables add referential ids.
- **Seed counts per environment** (D-175) are read from the seed files only. The live El Arte, staging and prod databases were not queried.
