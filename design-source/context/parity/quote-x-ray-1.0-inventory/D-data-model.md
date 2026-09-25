# OpenMaison 1.0 → 2.0 — Quote X-Ray inventory · Slice D: the data model and the port plan

Sources: 1.0 `/Users/vicky/Documents/GitHub/qanvast-id-tool` @ `67f42e469` (branch `integ/security-non-qanvast`, read only); 2.0 `/Users/vicky/Documents/GitHub/openmaison-prototype` (working tree: the X-Ray files — `lib/xray/*`, `app/quote-x-ray/*`, `components/xray/*`, `drizzle/0025_purple_young_avengers.sql` — as committed in `7f2ce14`; `lib/db/schema.ts`, `lib/leads/activity.ts`, `app/leads/quotes-actions.ts`, `scripts/repair-demo-data.ts`, `lib/db/baseline.ts` and `fixtures/baseline.json` carry later, uncommitted rounds). Read on 2026-09-25.

What was read. **1.0:** both migration sets (`supabase/migrations/`, 102 files; `scripts/migrations/`, 381 files) — grep for `xray` · `brand_dossier` · `market_quote_observations` · `platform_market_rates` found `sb:20260519000001`, `217`, `272`, `277` (+ down), `278` (+ down), and the lockdowns `226` · `264`; `sb:20260414000003/04` (market rates); `src/types/database.ts:2837-2913`, `src/types/app.ts:4406-4809`, `src/lib/transformers.ts:3212-3240`; every route under `src/app/api/quote-xrays/**`, `src/app/api/cron/brand-dossier-scan`, `src/app/api/admin/brand-dossiers`; all of `src/lib/quote-xray/*` (29 files), `src/lib/queries/quote-xrays.ts`, `src/lib/quote-parse/parse-file.ts`, `src/app/api/quotes/parse/route.ts` (the parsed shape), `src/lib/usage/{track,types,funnels}.ts`; the screens that read the row (`src/app/(main)/tools/quote-xray/page.tsx`, `src/app/sign/quote-xray/[token]/page.tsx`, `src/components/quote-xray/*`); `src/lib/access-control.ts`, `src/proxy.ts`, the lead drawer's entry; `scripts/cleanup/003_fleet_purge_demo_data.js`, `scripts/security/*-manifest.json`, `scripts/runners/migration-plan.js`, `scripts/xray-tune.ts`, `vercel.json` (the cron); `docs/rules/tools.md`, `docs/prd/12-quote-xray.md`. **2.0:** `lib/db/schema.ts` (`quote_comparisons`), `drizzle/0025*` and every later migration (none touches it), `lib/xray/{compare,reference,brands,queries}.ts`, `app/quote-x-ray/{actions.ts,page.tsx,[id]/page.tsx}`, `components/xray/*`, `lib/leads/activity.ts`, `app/leads/quotes-actions.ts`, `lib/quotes/math.ts`, `lib/db/{index,session,baseline}.ts`, `scripts/repair-demo-data.ts` (R33 and its check), `fixtures/baseline.json` (the X-Ray rows, their leads, quotes and lines only; `takenAt` 2026-09-24T21:43:07Z), `design-source/REGISTER.md` (REG-529), `design-source/context/quote-x-ray/00-build-notes.md`. Nothing in either repo was modified except this file (and its folder); no script, server or query was run; no `.env` was read; git was used read-only in 2.0 (`git log --oneline`, `git status --porcelain`, `git diff -U0` and `git show HEAD:` on the X-Ray lines) and in 1.0 only `.git/HEAD` and the branch ref were read for the commit id. The baseline was read with `node -e "require('./fixtures/baseline.json')"` — counts and field values only.

Builds on the earlier slices — cited, not repeated: **leads D §n** = `../leads-1.0-inventory/D-data-model.md`; **QE D-nn** = `../quote-editor-1.0-inventory/D-data-model.md` (D-25 and D-219 already file `platform_market_rates`, `market_quote_observations` and `quote_xrays` as Platform / other audits; D-232…D-242 are the Quotes port this one runs after); **templates D-42** = `../quote-templates-1.0-inventory/D-data-model.md`; **contracts D-nn** = `../contracts-1.0-inventory/D-data-model.md`, whose structure this file copies. The migration maps are cited as **map 04** (`../04-quote-templates-migration-map-2026-09-24.md`) and **map 06** (`../06-quote-editor-migration-map-2026-09-24.md`).

## 0. Conventions

- **Effective 1.0 schema = the union of both migration sets** (leads D §0.1, contracts D §0). For the X-Ray the split is clean. **Only in `supabase/migrations/`:** the create of `quote_xrays` and `market_quote_observations` (`sb:20260519000001`), `platform_market_rates` and its seed (`sb:20260414000003:40-56`, `sb:20260414000004`). **Only in `scripts/migrations/`:** the RLS lock (`217`), the outcome columns (`272`), the `verdict` objective (`277`, down `277_…_down`), `brand_dossiers` + `quote_xrays.brand_ammo` + the kill switch (`278`, down `278_…_down`), the platform lockdown (`264`) and the tenant-lock exclusions (`226:183-191`). The fork plan `scripts/runners/migration-plan.js` is self-declared dead code and stops at 240 (`:16-44, 484-489`), so which environments applied 272 · 277 · 278 is inferred from the code that writes their columns (§Uncertain).
- **Citations.** `NNN` or `NNN:lines` = `scripts/migrations/NNN_*.sql`; `sb:YYYYMMDDNNNNNN` = `supabase/migrations/…`; a bare `:lines` cites the file named last before it in the same cell or paragraph. In D-02's table a row that says *insert* cites `src/app/api/quote-xrays/create/route.ts` (the legacy insert `:397-411`, the verdict insert `:694-708`). 1.0 paths start with `src/`; 2.0 paths start with `lib/`, `app/`, `components/`, `scripts/`, `drizzle/` or `fixtures/`.
- **Ids · time · money.** 1.0: `uuid DEFAULT gen_random_uuid()`, `timestamptz`; money is **dollars** (JS numbers) inside `inputs`, **integer cents** inside `match_result`, `ai_synthesis` and `brand_ammo`, NUMERIC(12,2) **dollars** in `platform_market_rates`, BIGINT **cents** in `market_quote_observations`. 2.0: `text` ids written by the server action, `integer` unix **seconds** (`{ mode: 'timestamp' }`), money `integer` **minor units** (`*Minor`), S$ only, one studio (no `studio_id`), no RLS.
- **1.0 RLS end state.** `quote_xrays`: ENABLE + FORCE RLS, one `scoped` policy on the JWT's `studio_id`, DML revoked from `anon`, granted to `authenticated` (`217:32-45`); the public share route resolves by token with the service role (`217:18-22`). `brand_dossiers` is REVOKEd from `anon` and `authenticated` (`278:43-45`); `market_quote_observations`, `platform_market_rates` and `platform_config` get 264's lockdown (RLS on with no policy, every grant revoked — `264:44-79`). Stated once here.
- **Ids in this file.** D-01…D-12 = 1.0 tables and stores (§1); D-20…D-29 = 1.0 JSON shapes (§2); D-40…D-46 = 2.0 (§3); D-60…D-76 = table map (§4.1); D-80…D-139 = column diffs (§4.2); D-140…D-146 = statuses and enums (§4.3); D-150…D-164 = units and semantics (§4.4); D-170…D-236 = port plan (§5: 5.A D-170…D-172, 5.B D-175…D-184, 5.C D-190…D-203, 5.D D-210…D-225, 5.E D-230…D-236).
- **Verdicts** (§4): *same* · *rename* · *merge* · *split* · *missing in 2.0* · *2.0 only* · *derived* (computed; no column) · *superseded* (2.0 does the job another way) · *Later* · *Platform* (cross-studio caches, public links, delivery, telemetry — never a studio's data in the prototype) · *dead* (nothing reads or writes it).
- **Other citations.** *REG-529* = 2.0's X-Ray entry (`design-source/REGISTER.md:531`); *R33* = 2.0's repair rule (`scripts/repair-demo-data.ts:755-773`); *the owner's answers* = `design-source/context/quote-x-ray/00-build-notes.md` (2026-09-18).

---

## 1. 1.0 — tables

### D-01 · Where 1.0's X-Ray data lives

An X-Ray is **one `quote_xrays` row**. Every other store it touches is the platform's or read-only.

| Store | What it holds | Scope | Written by | Read by |
|---|---|---|---|---|
| `quote_xrays` (D-02) | one row per run: the parsed quotes, the match matrix, the synthesis (verdict or legacy), the brand ammo, the share token, the outcome | studio (RLS) | `POST /api/quote-xrays/create`, `PATCH /api/quote-xrays/[id]`, `POST …/[id]/share`, the post-response brand enrichment | `GET …/records`, `GET …/records/[id]`, the public `GET …/share/[token]` |
| `brand_dossiers` (D-03) | a brand's validated web findings, one row per brand for every studio | platform | the enrichment, the hourly cron, the admin toggle | the enrichment, the cron, `/admin/brand-dossiers` |
| `market_quote_observations` (D-04) | one row per priced cell of each run's matrix, with no studio, lead or vendor column | platform | `appendMarketObservations` | **nothing** |
| `platform_market_rates` (D-05) | per-country rate bands | platform | the seed | `fetchMarketBenchmarks` |
| `platform_config` · `quote_xray_brand_ammo_enabled` (D-06) | the brand-ammo kill switch | platform | 278's seed | `brandAmmoEnabled` |
| `quotes`, `quote_line_items`, `leads`, `studios` (D-07) | the own quote, the lead check, the studio's name and region | studio | — | `lead-quotes`, `loadOwnQuoteFromLead`, `attach-lead`, `getStudioRegion` |
| `usage_events` (D-08) | one `feature_succeeded` per verdict run | telemetry | `track()` | the usage funnels |
| — (D-09) | no bucket, no file row: every upload is parsed in memory and dropped | | | |

### D-02 · `quote_xrays` — the run

**DDL history:** `sb:20260519000001:11-46` (14 columns + 3 indexes; comment `:71-72`) → `217:32-45` (RLS) → `272:11-15` (+ `outcome`, `outcome_note`, `outcome_at`) → `277:12-22` (the objective CHECK gains `verdict`) → `278:47-48` (+ `brand_ammo`). The down migrations keep data safe: 277's fails loudly while a `verdict` row exists (`277_…_down:3-10`); 278's drops `brand_dossiers` but keeps `brand_ammo` ("per-run data on real rows, not cache", `278_…_down:7-12`).

**Columns** (18):

| # | Column | Type | Null / default | Written by (1.0) | Read by | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | PK, `gen_random_uuid()` | insert | every route; the page's `?xrayId=` deep link (`src/app/(main)/tools/quote-xray/page.tsx:36-42`) | `market_quote_observations.source_xray_id` points here with no FK (D-04) |
| 2 | `studio_id` | uuid | NOT NULL → `studios` CASCADE | insert: `session.studioId` (`:400`, `:697`) | RLS only | `idx_quote_xrays_studio` |
| 3 | `lead_id` | uuid | null → `leads` ON DELETE SET NULL | insert: the body's `leadId` (`:209, 401`; `:546, 698`) — not checked against the studio (note 4); `attach-lead` (checked, `[id]/route.ts:92-121`) — **no caller** | `records?leadId=` (no caller, `records/route.ts:71-77`); VerdictView hands it to the item table's digitizer link (`VerdictView.tsx:174-182`) | partial index `idx_quote_xrays_lead … WHERE lead_id IS NOT NULL`; *Upload 2 quotes* may carry one too (`VerdictUpload.tsx:86-97`) |
| 4 | `created_by` | uuid | NOT NULL → `profiles`, no ON DELETE clause | insert: `session.userId` | the transform only — no screen shows it (grep) | |
| 5 | `objective` | text | NOT NULL, CHECK `gap-finder · sales-justifier · market-intel · package-ladder · verdict` (`277:15-22`) | insert: `'verdict'` (`:700`); a legacy run's objective, or a combined run's `primary` (`:374-378, 403`) | the history keeps `objective = 'verdict'` (`QuoteXrayHistory.tsx:22-24`); the page's no-result fallback (`page.tsx:363-371`); the share gate (`shareability.ts:19`); the PDF's file name (`download-xray-pdf.ts:96`) | a combined run stores its primary, not "combined" — classify by `ai_synthesis.kind` (note 1; D-141) |
| 6 | `status` | text | NOT NULL, `'draft'`, CHECK `draft · ready · shared · archived` | insert `'ready'` (`:404`, `:701`); the share mint → `'shared'` (`share/route.ts:53`); `PATCH {status}` (`[id]/route.ts:187-205`) — **no caller** | no screen (grep) | D-140 |
| 7 | `currency_code` | text | NOT NULL | insert: the studio's region currency (`:258, 405`; `:569, 702`) | every view's money (`VerdictView.tsx:34` and the five legacy views) | also copied into every `inputs.quotes[].currencyCode` |
| 8 | `inputs` | jsonb | NOT NULL | insert | the views, the stats, the report, the brand NER at create, the public payload | D-20 |
| 9 | `match_result` | jsonb | null (never NULL on insert) | insert; `unmerge-row` (`[id]/route.ts:150-184`) | the item tables; VerdictView recomputes the per-item gap list from it (`VerdictView.tsx:41-49`) | D-21 |
| 10 | `ai_synthesis` | jsonb | null | insert | the page routes on `kind` (`page.tsx:335-401`); the history's label (`QuoteXrayHistory.tsx:50-51`); the share gate | D-22…D-24 |
| 11 | `share_token` | text | UNIQUE, null | the share mint (`share/route.ts:45, 51`) | the public `GET /api/quote-xrays/share/[token]` (`share/[token]/route.ts:15-20`) | also `idx_quote_xrays_share … WHERE share_token IS NOT NULL` — a second index on the UNIQUE column. D-27 |
| 12 | `share_expires_at` | timestamptz | null | the mint: now + 24 h (`share/route.ts:17, 46, 52`) | the public GET answers 410 after it (`share/[token]/route.ts:31-33`); the public page's "It expires …" (`src/app/sign/quote-xray/[token]/page.tsx:225`) | |
| 13 | `created_at` | timestamptz | NOT NULL, `now()` | default | the list's order (`records/route.ts:79`), the history's date, "Comparison N" (`combined-number.ts:6-12`), the PDF's name | no index |
| 14 | `updated_at` | timestamptz | NOT NULL, `now()` | every PATCH (`[id]/route.ts:111, 134, 174, 195`), the mint (`share/route.ts:54`), the enrichment (`brand-dossier-service.ts:288`) | **nothing** (grep) | no trigger |
| 15 | `outcome` | text | NOT NULL, `'pending'`, CHECK `pending · won · lost_price · lost_silence · lost_other` (`272:12-13`) | `PATCH {action: 'set-outcome'}` (`[id]/route.ts:124-145`) — **no caller** since the rebuild (`src/lib/queries/quote-xrays.ts:299-301`) | the transform only | D-28 |
| 16 | `outcome_note` | text | null | the same: any string, else NULL | — | |
| 17 | `outcome_at` | timestamptz | null | the same: now, NULL for `pending` | — | |
| 18 | `brand_ammo` | jsonb | null | the post-response enrichment, through the scoped client (`brand-dossier-service.ts:284-290`) | VerdictView's ammo panel (`VerdictView.tsx:151, 222-310`); stripped from the public payload (`share/[token]/route.ts:35-39`) | D-25 |

**Keys.** PK `id`; UNIQUE `share_token`; FKs `studio_id` CASCADE, `lead_id` SET NULL, `created_by → profiles` NO ACTION. **Indexes:** `idx_quote_xrays_studio (studio_id)`, `idx_quote_xrays_lead (lead_id) WHERE lead_id IS NOT NULL`, `idx_quote_xrays_share (share_token) WHERE share_token IS NOT NULL` (`sb:20260519000001:37-46`). **Triggers, functions, views:** none. **RLS:** `217:32-45`. The table comment points at `docs/features/quote-comparison/spec.md` (`sb:…:71-72`), which is not in the repo.

**Written by:** `create` (the legacy and combined path `create/route.ts:162-442`, the verdict path `:542-752`), `[id]` PATCH (`attach-lead` · `set-outcome` · `unmerge-row` · status) and DELETE (`[id]/route.ts:216-239`), the share mint, `enrichXrayWithBrandAmmo`. **Read by:** `records` (the studio's rows newest first, optional `?leadId=`), `records/[id]`, the public share GET; nothing else in `src/` reads the table (the fleet purge deletes a demo lead's rows, `scripts/cleanup/003_fleet_purge_demo_data.js:353`).

**Types.** `DbQuoteXray` (`database.ts:2848-2869`; `brand_ammo` optional) and `QuoteXray` (`app.ts:4789-4809`); `transformQuoteXray` (`transformers.ts:3219-3240`) defaults `inputs` to `{quotes: []}` and `outcome` to `pending`. The routes inline their own row type and mapper (`records/route.ts:22-64`, `[id]/route.ts:22-67`); `records/[id]/route.ts:21-39` leaves `brand_ammo` out of its interface but returns it through the shared mapper.

**Notes — the rules the data carries:**

1. **What kind of run a row is** is `ai_synthesis.kind` — `verdict`, `combined`, or one of the four legacy objectives. The `objective` column says `gap-finder` (or another primary) for a combined run (`create/route.ts:344-378`).
2. **Only verdict rows are made since the 2026-08 rebuild.** `useCreateQuoteXray` (the legacy and combined path) has no caller (grep; `queries/quote-xrays.ts:112-163`); the page creates through `useCreateVerdictXray` only (`page.tsx:63, 107-135`); the history lists verdict rows only, "regardless of whether the environment's purge has run" (`QuoteXrayHistory.tsx:3-6, 22-24`); a legacy row opens only through `?xrayId=` (`page.tsx:373-401`).
3. **Which quote was compared is not a column.** A lead-loaded own side stores `inputs.quotes[0].sourceFileName = "digitized:{quotes.id}"` (`create/route.ts:590`) and `parsed.refNumber = quotes.quote_number` (`own-quote-from-lead.ts:143`); `sourceFileName` is written and never read back (grep).
4. **The lead is not verified at create.** The scoped insert's WITH CHECK covers `studio_id` only, and a Postgres FK check does not apply RLS, so a lead id from another studio would be stored when the own side is an upload (read from the code, not executed); `attach-lead` does verify (`[id]/route.ts:96-108`) but has no caller.
5. **Status in practice** is `ready` (every insert) or `shared` (a legacy row that minted a link); nothing moves a row back when its link expires; `draft` is a default no insert keeps and `archived` has no writer in the UI.
6. **A run is a snapshot** ("X-Ray is read-only and only stores the parsed snapshot it analysed", `sb:20260519000001:5-9`). The only edit is `unmerge-row`, which rewrites `match_result` and leaves `ai_synthesis` as it was — a legacy gap-finder's counts can then disagree with its own table; VerdictView offers no un-merge (`VerdictView.tsx:174-182` passes no `onUnmergeRow`; the only caller is `GapFinderView.tsx:28-37`).
7. **Brand ammo arrives late.** It is written after the response (`create/route.ts:738-749`); the page polls every 8 s for up to 90 s for a run made in this session (`page.tsx:65-78`); it stays NULL with no AI key, with the kill switch off, or when nothing is citable.
8. **The kill switch does not hide stored ammo.** Only the enrichment and the cron read it (`brand-dossier-service.ts:248`; `cron/brand-dossier-scan/route.ts:33`); the read routes return `brand_ammo` as stored — although 278 says "Flip to false to hide all ammo instantly" (`278:13-14, 50`) and `docs/rules/tools.md:25` repeats it.
9. **Delete is hard** (`[id]/route.ts:216-239`, the history's bin after a browser confirm, `QuoteXrayHistory.tsx:30-39`); the run's observations stay (no FK, `[id]/route.ts:212-215`).
10. **Archived leads are not filtered** by the X-Ray routes (listed as grandfathered, `scripts/security/archival-manifest.json:119`).
11. **Test rows look like real ones.** With no `OPENROUTER_API_KEY` the parse returns a fixed document — "Home Create Pte Ltd", S$27,000, seven lines (`src/lib/quote-parse/parse-file.ts:134-150, 176-180`) — and the verdict is the deterministic fixture (`verdict.ts:297-315`; `create/route.ts:647-650`); such runs are stored like any other.
12. **Visibility is the studio.** RLS scopes by studio only; every member who can open the page (`owner · admin · id`, `src/lib/access-control.ts:95`) sees every run. The lead picker hides CLOSED leads (`page.tsx:89`); the API does not.

### D-03 · `brand_dossiers` — the brand cache (platform)

`278:18-41`. PLATFORM-level, "same access pattern as platform_market_rates": service role only, nothing tenant-owned (`278:3-8, 43-45`).

| # | Column | Type | Null / default | Written by | Read by | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | PK, `gen_random_uuid()` | the pending upsert | the admin toggle (by id) | |
| 2 | `brand_canonical` | text | NOT NULL, UNIQUE | `ensurePendingDossier` with `canonicaliseBrand` — diacritics folded, lowercase, parentheses and legal suffixes out, punctuation squashed (`brand-normalize.ts:23-33`) | the fetch by key (`brand-dossier-service.ts:145-156`), the scan, the cron | the cache key |
| 3 | `display_name` | text | NOT NULL | the first-seen spelling (`brand-dossier-service.ts:256`) | the ammo's brand name; the scan prompt | |
| 4 | `aliases` | text[] | NOT NULL, `'{}'`; GIN index | **never written** (grep) | the alias lookup for misses (`brand-dossier-service.ts:158-171`); `brandMatchesDossier` (`brand-normalize.ts:46-53`) | dead in practice |
| 5 | `category_hint` | text | null | the first-seen category label (`brand-dossier-service.ts:257`) | the scan prompt (`brand-scan.ts:147-148`) | |
| 6 | `status` | text | NOT NULL, `'pending'`, CHECK `pending · ready · empty · disabled` | `pending` on first sight; `ready` / `empty` by a scan (`brand-dossier-service.ts:208-219`); the admin toggle `disabled`, and back to `ready` / `empty` / `pending` (`src/app/api/admin/brand-dossiers/route.ts:70-79`) | `classifyDossier` (`brand-dossier-service.ts:33-42`), the cron, the admin list | D-146 |
| 7 | `findings` | jsonb | NOT NULL, `'[]'` | a scan (validated, D-26) | the ammo builder | `empty` + `[]` = the negative cache |
| 8 | `scan_count` | int | NOT NULL, 0 | + 1 per scan (`brand-dossier-service.ts:213`) | the admin list | |
| 9 | `last_scanned_at` | timestamptz | null | a scan (`brand-dossier-service.ts:214`) | fresh ≤ 90 days (`brand-dossier-service.ts:25, 40-41`); the cron's stale sweep | |
| 10 | `created_at` | timestamptz | NOT NULL, `now()` | default | the cron's pending order | |
| 11 | `updated_at` | timestamptz | NOT NULL, `now()` | a scan, the admin toggle | the admin list's order | |

**Indexes:** `idx_brand_dossiers_status (status)`, `idx_brand_dossiers_aliases GIN (aliases)`. **Written by** `ensurePendingDossier` (upsert, duplicates ignored, `brand-dossier-service.ts:176-191`), `scanAndStoreDossier` (never over a `disabled` row, `:194-226`), the admin PATCH. **Read by** the enrichment (fresh → attach, stale → attach and leave the refresh to the cron, miss → queue and scan up to 3 inline; `:228-294`), the hourly cron (10 pending oldest first, then 5 stalest past 90 days, one at a time; `cron/brand-dossier-scan/route.ts:1-88`), `/admin/brand-dossiers` (300 newest-updated, `admin/brand-dossiers/route.ts:18-38`). One scan = one `google/gemini-2.5-flash:online` call, about 1¢ (`brand-scan.ts:3-5, 25`). **Seeds:** none. Rebuildable by re-scanning (`278_…_down:3-5`).

### D-04 · `market_quote_observations` — the price feed (platform, write-only)

`sb:20260519000001:48-69`: "Anonymised market observations … v1 writes only; consumption is the v2 Market Insights read path."

| # | Column | Type | Null / default | Written by `appendMarketObservations` (`create/route.ts:500-532`) | Read by | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | PK | default | nothing | |
| 2 | `country_code` | text | NOT NULL | the studio's region country | — | |
| 3 | `currency_code` | text | NOT NULL | the studio's currency | — | |
| 4 | `canonical_category` | text | NOT NULL | the matrix row's category token | — | index `(country_code, canonical_category)` |
| 5 | `canonical_item` | text | NOT NULL | the matrix row's description **as written** — the own line's wording when the own quote has the item | — | nothing strips names here; `anonymiseMarketIntel` works on the market-intel synthesis only (`synthesise-prompt.ts:265`) |
| 6 | `unit` | text | null | **always NULL** (`create/route.ts:516`) | — | |
| 7 | `unit_price_cents` | bigint | null | the cell's `unitPriceCents` | — | |
| 8 | `qty` | numeric(12,2) | null | the cell's `qty` | — | |
| 9 | `line_total_cents` | bigint | null | the cell's `totalCents` | — | |
| 10 | `observed_at` | timestamptz | NOT NULL, `now()` | default | — | |
| 11 | `source_xray_id` | uuid | null, **no FK** | the run's id | — | "so we can rollback a specific upload" (`sb:…:63-65`); survives the run's delete |

One row per **present** cell of the matrix — the studio's own lines included — after every verdict run (`create/route.ts:718-719`) and every market-intel or combined run (`:423-427`); best effort, errors logged. **Read by: nothing** (grep: the insert and comments only). Service role only (264; `226:189`).

### D-05 · `platform_market_rates` — the rate bands (platform, read by the X-Ray)

`sb:20260414000003:38-56`: `id uuid PK` · `country_code text NOT NULL` · `category text NOT NULL` · `item_description text NOT NULL` · `unit text DEFAULT 'sqft'` · `rate_min NUMERIC(12,2) NOT NULL` · `rate_max NUMERIC(12,2) NOT NULL` · `rate_typical NUMERIC(12,2)` · `year INT DEFAULT 2026` · `source TEXT DEFAULT 'platform'` · `updated_at`; UNIQUE `(country_code, category, item_description)`; indexes `(country_code)`, `(country_code, category)`. **Seed** `sb:20260414000004`: 111 rows — SG 32 · MY 30 · AE 24 · IN 25 (upsert on the unique key). The X-Ray reads `category, item_description, unit, rate_min, rate_max, rate_typical, source` for the studio's country and the nine platform categories its canonical tokens bridge to (hacking → Demolition, masonry, plumbing, electrical, carpentry, painting, flooring, ceiling, glasswork → Glass & Doors; `market-benchmarks.ts:25-38, 411-448`), through the service role (`create/route.ts:332-335, 664-668`), dollars → cents (`market-benchmarks.ts:18-19, 105-110`). It grounds the verdict's `market-rate` facts (`verdict.ts:91-102`) and the legacy sales-justifier's `marketPositioning` and `belowMarketFlags` (`create/route.ts:126-138`). The quote editor reads it too (QE D-25). Platform.

### D-06 · `platform_config` — the kill switch (platform)

Key `quote_xray_brand_ammo_enabled`, value `true` (jsonb), inserted by `278:50-53` (`ON CONFLICT DO NOTHING`), deleted by its rollback (`278_…_down:16-17`). `brandAmmoEnabled` treats an absent key as on and a read error as off (`brand-dossier-service.ts:123-142`); read by the enrichment and the cron only (D-02 note 8). The same table holds contracts D-15's `bypass_otp`.

### D-07 · Studio tables the X-Ray reads (and never writes)

| Table | Columns read | Where | Rule |
|---|---|---|---|
| `quotes` | `id, label, quote_number, status, is_primary, total_cents, updated_at` | `lead-quotes/route.ts:24-45` | `quote_type = 'standard'`; primary first, then newest; BIGINT arrives as a string → `Number()` |
| `quotes` | + `quote_type, subtotal_cents, discount_cents` | `loadOwnQuoteFromLead` (`own-quote-from-lead.ts:63-87`) | the picked quote (the query itself checks it is the lead's), else the primary, else the newest; standard only (variation orders are never the own quote) |
| `quote_line_items` | `*` by `quote_id` in `sort_order`; else the lead's lines with `quote_id IS NULL` | `own-quote-from-lead.ts:89-113` | omission credits dropped (`:116-119`); `name — description` joined with HTML stripped (`:21-25, 36-54`); `amount_marker` foc / inclusive → `priceType` (`:27-34`); `category` → section (`'General'`); `unit` (`'lot'`); `unit_price` · `total` as stored (dollars) |
| `leads` | `id` | `attach-lead` (`[id]/route.ts:98-102`) | scoped |
| `studios` | `name`; `country_code` | the own side's label (`create/route.ts:596-613`); `getStudioRegion` (`src/lib/region-helpers-server.ts:11-25`) | the region gives the currency (SGD · MYR · AED · INR · EGP) and the market country |

The own grand total is `quotes.total_cents / 100` — incl. GST, after line and document discounts (QE D-01) — else the Σ of `amount` / `lump_sum` line totals (`own-quote-from-lead.ts:123-147`).

### D-08 · `usage_events` — the run's telemetry (Platform)

`track("feature_succeeded", {studioId, userId}, props, "quote_xray")` after each verdict run (`create/route.ts:721-736`) inserts `usage_events (studio_id, user_id, session_id, event_type, feature_key, properties, route)` (`src/lib/usage/track.ts:13-38`) with `props = {flow: 'verdict', lead_linked, own_from_lead, points_count, material_points, comp_brand_mentions, comp_named_any_brand, differing_brands, unknown_materials (≤ 10 terms)}`. Feature key `quote_xray` (`src/lib/usage/types.ts:70`); funnel *Opened → Parsed successfully* (`src/lib/usage/funnels.ts:57-64`). Platform (leads D §3.4 C).

### D-09 · Files — nothing is stored

- Each file is posted alone to `/api/quote-xrays/parse-file` (`parse-file/route.ts:1-12, 25-56`), checked (≤ 10 MB; PDF, PNG, JPEG, CSV, XLSX — `src/lib/quote-parse/parse-file.ts:18-19, 159-174`), read by `google/gemini-2.5-flash` (`:13`) and dropped. `create` takes the parsed JSON only — "no file bytes ever reach this route" (`create/route.ts:1-17`). The file's name survives as `sourceFileName` (D-20). **No bucket, no `lead_files` row.**
- The report PDF is drawn in the browser with jsPDF and saved as `quote-xray-{objective}-{date}.pdf` (`download-xray-pdf.ts:3-4, 14-18, 96`) — legacy rows only; a verdict row has no Download (`page.tsx:165`).
- The WhatsApp draft's edits live in the dialog's state and leave as `api.whatsapp.com/send?text=…`, with no number (`SendToClientDialog.tsx:37-66`).
- `docs/demo/quote-xray-samples/urban-nest-competitor-quote.{pdf,html}` is a sample file for demos, not data.

### D-10 · Browser state

`localStorage.qanvast_xray_banner_dismissed = "1"` — the explainer's dismissal (`page.tsx:241-290`). React Query keys `["quote-xrays", "list" · "byId" · "lead-quotes", …]` (`queries/quote-xrays.ts:6, 46, 65, 94`) — a cache.

### D-11 · Access, grants and jobs

- Page `tools/quote-xray`: `owner · admin · id` (`access-control.ts:95`); Tools menu item (`src/components/layout/app-sidebar.tsx:21`); the lead drawer's "Beat this quote" → `/tools/quote-xray?leadId=` when the lead has lines or a signed quote (`src/components/leads/lead-detail-drawer.tsx:1904-1911`).
- The public path: `/api/quote-xrays/share/` passes the proxy unauthenticated (`src/proxy.ts:393-396`); the page `/sign/quote-xray/[token]`.
- Jobs: `GET /api/cron/brand-dossier-scan`, hourly at :20 (`vercel.json:60-63`), `isAuthorizedCron` (`cron/brand-dossier-scan/route.ts:1-35`); the admin page key `brand-dossiers` (`admin/brand-dossiers/route.ts:16`).
- Grants and RLS: §0. `scripts/security/rls-manifest.json:68` lists `quote_xrays` among the locked tables. No trigger, function or view serves the X-Ray.

### D-12 · Code vocabularies the stored JSON depends on

| Vocabulary | Values | Where |
|---|---|---|
| Canonical categories | 16 tokens — hacking · masonry · plumbing · electrical · carpentry · painting · flooring · ceiling · glasswork · metalwork · appliances · lighting · curtains · airconditioning · preliminaries · misc; an unmatched section keeps its own normalised text; labels "Hacking & Protection" … "Other" | `canonical-categories.ts:14-50, 53-73` |
| Market bridge | 9 of the 16 → a `platform_market_rates.category` | `market-benchmarks.ts:28-38` |
| Material facts | 16 curated keys — mdf · particleboard · hollow-core · veneer · laminate-top · solid-surface · marble · granite · laminate-floor · engineered-wood · mild-steel · chrome-plastic · acrylic-sanitary · standard-emulsion · float-glass · pvc-foam — each with a weakness, a client question and better alternatives | `material-facts.ts:31-224` |
| Evidence types | 7 (D-22) and their labels | `app.ts:4694-4701`; `VerdictView.tsx:22-30` |
| Outcomes | 5 (D-28) | `outcomes.ts:6-25` |
| Currency hints | SGD · MYR · AED · INR (EGP has none) | `create/route.ts:446-467` |
| Limits | legacy runs 2–3 quotes, verdict 2; token overlap ≥ 0.6 inside a category; AI merge confidence ≥ 0.7, only with ≥ 2 orphan rows and ≤ 80 candidate rows; ≤ 12 facts, ≤ 3 points, draft ≤ 1,200 characters; dossier TTL 90 days, 3 inline scans, cron 10 + 5; share link 24 h | `create/route.ts:59-69`; `three-way-match.ts:26`; `ai-match.ts:25-30`; `verdict.ts:35-39`; `brand-dossier-service.ts:25-27`; `cron/…/route.ts:23-24`; `share/route.ts:17` |
| Models | `google/gemini-2.5-flash` (parse, AI match, brand NER, verdict, legacy synthesis); `:online` for brand scans | `parse-file.ts:13`; `ai-match.ts:25`; `brand-comparison.ts:18`; `verdict.ts:35`; `synthesise-prompt.ts:17`; `brand-scan.ts:25` |

---

## 2. 1.0 — JSON shapes

### D-20 · `inputs` — `QuoteXrayInputs` (`app.ts:4419-4456`)

Assembled at `create/route.ts:271-304` (legacy and combined) and `:638-644` (verdict); `toXrayParsedDoc` re-shapes a parse result (`:469-493`). In the table a bare `:lines` cites `create/route.ts`.

| Field | Type | Values and source |
|---|---|---|
| `quotes[]` | array | verdict: exactly two, `[own, competitor]`; legacy: 2–3, own first (`:239-245`) |
| `.label` | string | verdict own: the studio's `name`, else "Our quote" (`:555, 596-621`); verdict competitor: the parsed `vendor`, else the client's `compLabel` — the page sends "The other quote" (`page.tsx:113`) — else "Competitor quote" (`create/route.ts:554, 622`); legacy: as typed, else "Quote {n}" (`:233`) |
| `.role` | `own · competitor · own-version` | verdict: fixed (`:641-642`); legacy: per slot, default `competitor` (`:234`) |
| `.sourceFileName` | string | the uploaded file's name; `digitized:{quotes.id}` for a lead-loaded own side (`:590`); defaults `own-quote` · `competitor-quote` · `quote-{n}` (`:235, 552-553`). **Never read** (D-02 note 3) |
| `.currencyCode` | string | the studio's currency, as the row's column (`:300, 641-642`) |
| `.parsed.vendor · date · issuedBy · clientName · refNumber · description` | string · null | the letterhead as parsed — for a competitor file: the other studio, its date as printed, its signatory, **the homeowner's name as that studio printed it**, its reference, its summary; for a lead-loaded own side all NULL except `refNumber = quote_number` (`own-quote-from-lead.ts:138-149`) |
| `.parsed.subTotal · discount · grandTotal` | number · null, **dollars** | as parsed; a lead-loaded own side: `*_cents / 100`, `grandTotal` = `total_cents / 100`, else the line sum (`own-quote-from-lead.ts:123-147`) |
| `.parsed.lineItems[]` | array | `{section ('' if none), itemNumber (0), description (''), priceType ('amount'), unitPrice (number · null, dollars), qty (1), unit ('lot'), total (number · null, dollars)}`; the parser's `confidence`, `paymentSchedule`, `refNumberOverride` and `_doc*` fields are dropped (`create/route.ts:285-294`; `src/app/api/quotes/parse/route.ts:51-110`) |

`priceType` holds the parser's `amount · foc · inclusive · by_client · kiv · lump_sum` (`quotes/parse/route.ts:121-127`), or, for a lead-loaded own side, the stored `quote_line_items.price_type` (QE D-01's list, which includes `content_block`) with `amount_marker` foc / inclusive taking over. A row holds whole quotes — size grows with the quotes.

### D-21 · `match_result` — `QuoteXrayMatchResult` (`app.ts:4458-4485`)

Built by `buildMatchMatrix` (`three-way-match.ts:99-185`), then merged by `refineMatchWithAI` (`ai-match.ts:247-276`).

| Field | Type | Values |
|---|---|---|
| `matrix[]` | array | one row per logical item: the first quote's lines seed rows in their order; each later line joins a row of the same canonical category by exact normalised text, else by token overlap ≥ 0.6 (at most one line per quote per row), else opens a row at the end (`three-way-match.ts:107-154`) |
| `.canonicalDescription` | string | the seeding line's description — the own line's wording when the own quote has the item |
| `.canonicalCategory` | string | D-12's token |
| `.cells[]` | one per quote, in quote order | `{quoteIdx, present}`; when present also `{lineIdx, qty, matchKind, unitPriceCents?, totalCents?}` — a line with no price has no `totalCents` (`three-way-match.ts:156-171`). `matchKind`: `exact` (a seeded or new row) · `tokens` · `ai` (+ `matchConfidence` 0–1, the lowest along a chain of merges; `ai-match.ts:70-73, 132-146`) |
| `.aiMergedFrom?` | rows | the whole rows an AI merge joined, kept so the studio can un-merge (`ai-match.ts:148-156`) |
| `totals[]` | `{quoteIdx, grandTotalCents}` | `parsed.grandTotal × 100`; a missing grand total becomes **0** (`three-way-match.ts:179-182`) |

Money is cents. The AI pass can only merge rows of one category with no quote present twice, above 0.7 confidence; it never splits, re-prices or adds (`ai-match.ts:1-17, 50-105`). The only later edit is `splitMergedRow` (`:162-187`).

### D-22 · `ai_synthesis` — the verdict (`VerdictSynthesis`, `app.ts:4682-4742`)

Built by `buildVerdict` (`verdict.ts:317-387`); stored with `objective = 'verdict'`. The numbers are code (`real-gap.ts`); the model only picks facts by index and phrases (`verdict.ts:1-12`).

| Field | Type | Source |
|---|---|---|
| `kind` | `'verdict'` | |
| `headline.ownTotalCents` | int | `totals[own]` |
| `headline.competitorTotalCents` | int | `totals[competitor]` — the cheapest other quote with a total, else the first (`real-gap.ts:53-65`); always index 1 in a two-quote run |
| `headline.competitorLabel` | string | the competitor's input label (D-20) |
| `headline.rawGapCents` | int | own − competitor; positive = ours dearer on paper |
| `headline.missingScopeValueCents` | int | Σ own line totals of the rows the competitor lacks — priced (> 0) rows only (`real-gap.ts:96-109`) |
| `headline.ownMissingScopeValueCents` | int | Σ competitor line totals of the rows the own quote lacks (`real-gap.ts:110-124`) |
| `headline.realGapCents` | int | raw − missing + ownMissing (`real-gap.ts:129-139`) |
| `headline.unpricedMissingCount` | int | one-sided rows whose present side has no price or ≤ 0 (`real-gap.ts:99-101, 113-115`) |
| `headline.oneLiner` | string | the model's sentence over those numbers, else the deterministic one (`verdict.ts:176-184, 234-236`) |
| `points[]` | 0–3 | `{sayThis, evidence: {type, detail, cents?}, confidence: 'high' · 'medium'}` — each must cite an unused fact from ≤ 12 code-built facts (`verdict.ts:66-166, 209-229`); a lone `medium` point is dropped (`verdict.ts:230-232`) |
| `whatsappMessage` | string | the model's draft — one opener, every point numbered, the real gap, a closer; no links, no placeholders, no salutation; "the other quote", never the other studio's name in writing (`verdict.ts:282`) — else the deterministic draft (`verdict.ts:186-205`); a draft with no digit is rebuilt (`verdict.ts:358-366`); ≤ 1,200 characters (`verdict.ts:248`) |

**Evidence types written:** `missing-scope` (≤ 5 facts), `market-rate` (≤ 3; below the platform band, D-05), `matched-item` (≤ 3; ours cheaper on the same item), `arithmetic` (≤ 2; a competitor line whose total ≠ unit price × qty), `material` (≤ 2; D-12's fact base, question-framed), `brand` (≤ 2 own-brand advantages, ≤ 2 competitor brands). `unique-value` is declared (`app.ts:4696`) and never produced. Own-side weaknesses never become points (`verdict.ts:61-65`). **Not stored:** the per-item gap list behind the headline — VerdictView recomputes it from `match_result` (D-29).

### D-23 · `ai_synthesis` — the combined run

`{kind: 'combined', primary, results: Partial<Record<objective, synthesis>>, weak: objective[]}` (`app.ts:4671-4680`; `create/route.ts:350-378`): the four objectives run at once; one failing is dropped; `primary` = the first that fits the roles and produced a result; `weak` = the objectives the roles do not fit (`:75-89`). The row's `objective` = `primary`.

### D-24 · `ai_synthesis` — the four legacy objectives

| `kind` | Stored fields | Notes |
|---|---|---|
| `gap-finder` | `risk {missingScope · overPriced · underPriced × Count / ImpactCents}`, `coverage[] {category, cells[] {quoteIdx, state present · missing · partial}}`, `brief[3]`, `notes[] {canonicalDescription, note}` | `app.ts:4489-4505` |
| `sales-justifier` | `hero {ownTotalCents, cheapestCompTotalCents, extraScopeValueCents, headline}`, `valueStack[] {icon, title, description, citedLineDescription, retailEquivalentCents?}`, `applesToApples {rawDeltaCents, normalisedDeltaCents, explanation}`, `competitorRisks[]`; code-computed add-ons `brandComparison`, `arithmeticFlags`, `belowMarketFlags`, `matchedItemDefense` (+ an AI `justification` per premium item), `marketPositioning` | `app.ts:4507-4609`; `create/route.ts:91-160` |
| `market-intel` | `heatmap[]`, `percentiles[]` (p25 · p50 · p75 cents, benchmark min / max), `anomalies[]`, `scopePatterns[]` | vendor tokens stripped from the synthesis (`synthesise-prompt.ts:238-294`) |
| `package-ladder` | `tiers[] {quoteIdx, label, totalCents, costCents, marginCents, marginPercent, sellWhen, talkingPoints[3]}`, `deltas[]`, `recommendation {pushQuoteIdx, reason}` | `app.ts:4639-4663` |

The model's JSON is normalised before storing (`synthesise-prompt.ts:236`) and again at render (`normalise-synthesis.ts:1-73`); with no key, per-objective fixtures are stored instead (`dryrun-fixtures.ts:1-25`).

### D-25 · `brand_ammo` — `VerdictBrandAmmo` (`app.ts:4744-4782`)

Built by `buildAmmoFromDossiers` (`brand-dossier-service.ts:49-119`) from the dossiers of the brands the NER found (`brand-comparison.ts:44-129`).

| Field | Type | Values |
|---|---|---|
| `scannedAt` | ISO string | the build time |
| `cleanBrands[]` | string[] | competitor brands whose dossier is `empty` or holds no negative finding — printed "We also checked … — users report no real problems." (`VerdictView.tsx:303-305`) |
| `findings[]` | array | per negative or mixed finding of a competitor brand: `{brand (the dossier's display name), item (the competitor line), category, claim (≤ 400), sentiment negative · mixed, severity mild · notable, sources[] {url, domain} (≥ 2 domains), suggestedQuestion}`; `suggestedQuestion` = "Users on {domains} say: {claim} You can ask the other studio how they handle this with {brand}." (`brand-dossier-service.ts:44-47`); `notable` first (`brand-dossier-service.ts:116-117`); a rival brand's praise is dropped |
| `ownAdvantages[]?` | array | brands only the own quote names: `{brand, category, claim (the dossier's first positive) · null, sources[]}`; absent on rows written before this shape (`app.ts:4780-4781`) |

Written once per run, after the response; NULL = nothing to attach. **ID-only by construction:** never on the public payload, never in the WhatsApp draft (`app.ts:4744-4747`; `share/[token]/route.ts:35-39`). Severity prints as "Impact: high" / "Impact: mild" (`VerdictView.tsx:275-280`); sources are links (`:253, 289`).

### D-26 · `brand_dossiers.findings` — `DbBrandDossierFinding` (`database.ts:2878-2885`)

`{claim ≤ 400, sentiment positive · negative · mixed (an unknown word counts as mixed), severity mild · notable, sources[] {url, domain} (one per domain; ≥ 1 for positive, ≥ 2 for negative or mixed; only URLs the search itself returned), quotedEvidence ≤ 300 · null, retrievedAt}` — at most six (`brand-scan.ts:27-29, 85-143`). A scan with none is `status 'empty'` (`:234`).

### D-27 · The share link and its public payload

`POST /api/quote-xrays/[id]/share` mints `randomBytes(32).toString('base64url')` (43 characters), sets `share_expires_at` = now + 24 h and `status 'shared'` (`share/route.ts:17, 45-58`) — for a `sales-justifier` row or a combined row with a sales-justifier slice only; **verdict rows are never shareable** ("the rebuilt flow's client artifact is an editable WhatsApp message, not a portal page (product decision 2026-08)", `shareability.ts:12-22`; `verdict.ts:24-28` strips the old `{share_link}` token from drafts). A second mint replaces the token; the dialog reuses a live one (`ShareLinkDialog.tsx:20-23`), reachable only from the legacy sales view (`SalesJustifierView.tsx:178`). The public GET resolves by token with the service role, answers 400 for an unshareable row and 410 once expired, and returns **the whole transformed row minus `brandAmmo`** (`share/[token]/route.ts:11-39`) — so `inputs` (every quote's parsed lines, the competitor's `clientName` and `issuedBy`) and `match_result` go to anyone with the link, although the page renders only the sales-justifier view and hides the studio's own arithmetic slips (`src/app/sign/quote-xray/[token]/page.tsx:62-66, 189-190`). Nothing records a view.

### D-28 · The outcome

`pending · won · lost_price · lost_silence · lost_other`, labelled "Not recorded · Won · Lost — price · Lost — no response · Lost — other"; `SELECTABLE_OUTCOMES` leaves out `pending` (`outcomes.ts:6-25`). `set-outcome` writes `outcome`, `outcome_note` (a string, else NULL, no length cap) and `outcome_at` (now, NULL for `pending`) (`[id]/route.ts:123-145`). Its purpose — a win rate, benchmarks against prices that won (`272:1-5`) — has no reader, and no client calls it since the rebuild (`queries/quote-xrays.ts:299-301`; `docs/rules/tools.md:25`: "NO outcome capture").

### D-29 · What 1.0 derives instead of storing

| Derived | How | Where |
|---|---|---|
| At-a-glance stats | per quote: item count and total (the matrix total, else the parsed total); items compared; shared / unique rows; price spread | `xray-stats.ts:9-74` (legacy views and the report) |
| The report and its PDF | headings and lines from the stats, the scope gaps and the stored synthesis | `build-xray-report.ts:13-216`; `download-xray-pdf.ts` |
| The verdict's per-item gap list | `computeRealGap(match_result)` at render — the list "isn't persisted (only aggregates are)" | `VerdictView.tsx:41-49` |
| "On paper the difference is …" | the headline numbers | `VerdictView.tsx:88-99` |
| "{n} items compared" | `match_result.matrix.length` | `VerdictView.tsx:156` |
| Scope gaps | exposure · unique value · AI-matched and shared row counts | `scope-gaps.ts:17-97` |
| "Comparison N" | 1-based by creation among combined rows | `combined-number.ts:6-12` |
| The history row | "vs {headline.competitorLabel}" + date; the 5 newest verdict rows, then "+N older" | `QuoteXrayHistory.tsx:12-87` |
| Brand mentions, own-brand advantages, material findings | the NER and the fact base at create; kept only as the text of points and as `brand_ammo` | `brand-comparison.ts:131-156`; `material-facts.ts:268` |
| "Is it shareable?" | `isShareableXray(objective, ai_synthesis)` | `shareability.ts:15-22` |

---

## 3. 2.0 — tables and JSON

Drizzle over libSQL (`lib/db/schema.ts`); the X-Ray's table since `drizzle/0025_purple_young_avengers.sql` (journal 2026-09-18T11:19Z, REG-529); no later migration touches it. A comparison in 2.0 is **one reading of two quotes, kept whole** ("so the record page and Recent comparisons read exactly what the studio saw", `schema.ts:551-552`). The engine is curated and deterministic (the owner's answers, 2026-09-18): no model, no stored file, no brand cache, no market data.

### D-40 · `quote_comparisons` (`schema.ts:551-563`; `drizzle/0025_purple_young_avengers.sql:1-13`)

| # | Column | Type | Null / default | Written by | Read by | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | text | PK | `runComparison`: `randomUUID()` (`app/quote-x-ray/actions.ts:41`); R33: `sid(seed, 'quote_comparison')` | the record `/quote-x-ray/{id}` (`app/quote-x-ray/[id]/page.tsx:15-19`); Activity's link | |
| 2 | `lead_id` | text | null → `leads` ON DELETE SET NULL | *For a lead*: the chosen lead, else the quote's lead (`actions.ts:25-31`); *Upload two quotes*: **NULL** (`components/xray/xray-workspace.tsx:73`) | the recents (joined for the name), the record (name, phone), Activity (`lib/leads/activity.ts:50`), a lead's own recents (`xray-workspace.tsx:56-58`) | no index |
| 3 | `quote_id` | text | null → `quotes` ON DELETE SET NULL | *For a lead*: the chosen quote; *Upload*: NULL (`actions.ts:26-37`); *Delete forever* on a quote sets NULL (`app/leads/quotes-actions.ts:378-394`, working tree) | `XrayRecord.quoteId` (not displayed, `lib/xray/queries.ts:42`); repair's check (`scripts/repair-demo-data.ts:1263`) | a soft-deleted quote keeps its link (D-43) |
| 4 | `your_label` | text | NOT NULL | `"{number} · {title}"`, or the upload's name less its extension (`actions.ts:30, 36`) | the recents, the record's eyebrow and (no lead) title, Activity's sentence | repeated as `result_json.yourLabel` |
| 5 | `other_studio` | text | NOT NULL | the reference quote's studio (`actions.ts:42`) | the recents, the title, Activity | repeated as `result_json.otherStudio` |
| 6 | `other_file` | text | NOT NULL | the dropped file's name (`actions.ts:42`) | the record's foot "Read by Quote X-Ray on {date} · {file}" (`components/xray/xray-result.tsx:110`) | the only trace of the file |
| 7 | `result_json` | text | NOT NULL | `JSON.stringify(compareQuotes(…))` (`actions.ts:40-42`) | `fetchComparison` → the whole record page | D-41 |
| 8 | `created_by` | text | NOT NULL, no FK | `SESSION_MEMBER_ID` = `'dane'` (`lib/db/session.ts:12`); R33 `'dane'` | the record's author (`queries.ts:39-42`), Activity's actor | |
| 9 | `created_at` | integer ts | NOT NULL | now; R33 now − n days | the recents' order (20 newest, `queries.ts:32-36`), the record's date chip, Activity's time | |

No `updated_at`, status, `deleted_at`, currency, share, outcome or brand column; no index. **Written by** `runComparison` (insert), `deleteComparison` (hard delete, `actions.ts:48-54`), `deleteQuotesForever` (`quote_id → NULL`), R33. **Read by** `fetchRecents` · `fetchComparison` (`lib/xray/queries.ts:32-43`), the Activity feed (`lib/leads/activity.ts:50, 103-104`), the repair check. Type `QuoteComparison` (`schema.ts:970`); in `BASELINE_TABLES` (`lib/db/baseline.ts:17`).

### D-41 · `result_json` — `XrayResult` (`lib/xray/compare.ts:9-27`)

Built by `compareQuotes` (`:38-121`). In the table a bare `:lines` cites `lib/xray/compare.ts`.

| Field | Type | Meaning |
|---|---|---|
| `yourLabel` · `yourStudio` · `otherStudio` | string | the label (as the column); `settings.brand.details.name`; the reference studio |
| `yoursMinor` · `theirsMinor` | int, S$ minor | Σ your non-optional lines' `lineTotalMinor` — pre-GST, no document discount; Σ the other quote's lines (`:39, 58-59`) |
| `onPaperMinor` | int | theirs − yours; negative = theirs cheaper on paper (`:17-18, 63`) |
| `yoursOnlyMinor` · `theirsOnlyMinor` | int | Σ `yours-only` rows' yours; Σ `theirs-only` rows' theirs (`:60-61`) |
| `unpricedCount` | int | rows with status `unpriced` (`:62`) |
| `realDiffMinor` | int | (yours − yoursOnly) − (theirs − theirsOnly); positive = ours more like-for-like (`:20-21, 64`) |
| `headline` · `footnote` | string | templated sentences (`:67-74`) — invented copy (REG-529) |
| `points[]` | ≤ 3 | `{n, kind: 'missing' · 'below-market' · 'unpriced', say, evidenceLabel, evidence, asQuestion: string · null}` — the two biggest `yours-only` lines, one matched line priced below 60 % of ours, then the unpriced count (`:76-101`) |
| `brands[]` | array | `{brand, trade, side: 'yours' · 'theirs' · 'both', tone: 'advantage' · 'risk' · 'note', impact: 'high' · 'mild' · null, text, sources: string[] (domains)}` — `BRAND_NOTES` regexes over each side's text (`:103-115`) |
| `rows[]` | array | `{key ('y-{line id}' · 'm-{line id}' · 't-{index}'), name, theirName, trade, room, yoursMinor · null, theirsMinor · null, status: 'matched' · 'yours-only' · 'theirs-only' · 'unpriced'}` — `unpriced` = the other side's amount is 0 (`:50-56`) |
| `compared` | int | `rows.length` |
| `message` | string | "Hi {the lead's first name, else 'there'}, I've looked at both quotes and wanted to share a few differences I found:" + the numbered points + "Happy to walk you through it whenever suits — {studio}" (`:117-118`) |

The record page reads every field except `points[].kind` (grep: no `.kind` in `components/xray/`).

### D-42 · The engine's inputs are code, not rows

- **The other side:** `REFERENCE_QUOTES` — Flo Design 28 lines, Dyel 21, Cove Interior 20 (`lib/xray/reference.ts:9-92`), each `{trade, room, name, qty, unit, amountMinor (0 = FOC / Inclusive / no price), brand?}`. A file is "read" by its name — `/flo|scope/` · `/sharon|dyel|sales.?contract/` · `/stanley|cove|form/` — else `unreadable-other` (`:94-101`; `actions.ts:22-23`).
- **Your side:** `loadYourLines(quoteId)` (`lib/xray/queries.ts:45-53`): items that are not `Declined`; trade = the line's category → its group's category → its group's name; room likewise; `amountMinor = lineTotalMinor` (qty × unit price less the line's discount, `lib/quotes/math.ts:43-44`); `optional` carried and dropped by the engine (`compare.ts:39`). Print-as words and the children of a Declined group are **not** filtered, while the quote's own totals drop them (`lib/quotes/math.ts:52-54`). In *Upload two quotes* your file must be a reference quote too, and its `brand` field is not carried (`compare.ts:123-126`).
- **Brand notes:** `BRAND_NOTES`, nine curated entries — a regex, the trade, a neutral note, an impact and source domains (`lib/xray/brands.ts:1-18`), "1.0 read these off renovation forums; the prototype keeps a small table".
- **Matching:** words longer than two letters, stop words out; a pair needs ≥ 2 shared words and ≥ 0.5 of the shorter list; the strongest pairs first, one-to-one, across trades (`compare.ts:29-31, 41-48`).

### D-43 · Rules 2.0 enforces, and the drift the data shows

- A comparison needs a readable other file, and *For a lead* needs a quote: `unreadable-other · unreadable-yours · nothing-to-compare` (`actions.ts:14-38`). *Upload two quotes* never links a lead or a quote (`xray-workspace.tsx:73`).
- S$ only (`compare.ts:33-34`); no currency is stored.
- **A snapshot, never refreshed.** The baseline's two OM-10001 readings carry yours S$58,773.00; that quote's lines now sum to S$45,726.50 and its amount is S$49,841.89.
- **"Yours" is pre-GST and counts Print-as lines.** OM-10008's reading carries S$62,547.00 (the record's tile prints S$ 62.5K) while the quote's card on the setup page shows S$ 68,176.23 (`quotes.amount_minor`, incl. 9 % GST; `lib/xray/queries.ts:19`; `xray-workspace.tsx:159`).
- Delete is hard, after an alert, with no Undo ("a comparison is only ever a reading of two quotes", owner 2026-09-18; `actions.ts:48-54`).
- **No lead visibility.** `fetchXrayData` lists every live lead and quote, and the 20 newest comparisons, for any viewer (`lib/xray/queries.ts:16-36`; no `visibleLeadIds` — REG-603's rule does not reach the X-Ray).
- **A soft-deleted quote keeps `quote_id`** and trips repair's check "quote comparison whose quote is gone", which requires `deleted_at IS NULL` (`scripts/repair-demo-data.ts:1263`); only *Delete forever* clears it.
- **A brand only the other quote names, with no impact, is stored `side 'theirs'`, `tone 'note'`** (`compare.ts:112`), and the page prints every `note` as "We also checked {brand} — both quotes name it." (`xray-result.tsx:95`). All four baseline readings print it for Hafary or Dulux, which only the other quote names.
- The edited message is not stored; *Open WhatsApp* dials `65` + the lead's phone (`components/xray/send-dialog.tsx:14-19`).
- Activity: "{actor} compared {your_label} with {other_studio}'s quote in Quote X-Ray." → *See comparison* (`lib/leads/activity.ts:103-104`).

### D-44 · Browser state

`om.xray.introHidden` — the intro card (`xray-workspace.tsx:42`); `om.columns.xray-items` and the column widths — the item table's layout (`xray-result.tsx:38`; `xray-table.tsx:30`; REG-454).

### D-45 · Seeds, repair and the baseline

- **R33** (`scripts/repair-demo-data.ts:755-773`): OM-10008 vs "Flo Design Sample Quotation.pdf" (2 days old) and OM-10001 vs "Cove Interior Quotation.pdf" (5 days old), each run through `compareQuotes` over the quote's lines as `loadYourLines` reads them, `created_by 'dane'`, ids `sid('xray-1' · 'xray-2', 'quote_comparison')` (`:44-47`), `INSERT OR IGNORE` — so a reading is never refreshed.
- **Check** (`repair-demo-data.ts:1263`): a comparison's quote must exist and not be deleted.
- **`fixtures/baseline.json`** (`takenAt` 2026-09-24T21:43:07Z): `quote_comparisons` **4** — the two R33 readings (`7be8b2da…`, Vivien Lee · OM-10008 vs Flo Design, 41 rows; `53f4f1a2…`, Olivia Martinez · OM-10001 vs Cove Interior, 29 rows) and two made in the app on 2026-09-18 (`99b93ec9…`, OM-10001 vs Flo Design, 41 rows; `0cac97f4…`, the Flo sample uploaded against itself — lead and quote NULL, 20 matched and 8 unpriced rows, one point, and Blum and Blum Aventos flagged as risks because `refAsYours` drops the `brand` field). All by `dane`; 3 · 3 · 3 · 1 points; drafts of 286–705 characters.

### D-46 · What 2.0 derives instead of storing

The record's title "{lead ?? your_label} · vs {other_studio}" (`app/quote-x-ray/[id]/page.tsx:8-12`; `xray-result.tsx:39`); the table's *Difference* = theirs − yours on matched rows and its status words (`components/xray/xray-table.tsx:23, 37`); the lead's Activity row (REG-191's derived feed); a lead's own recents and "Nothing compared for {lead} yet." (`xray-workspace.tsx:56-58, 196`).

---

## 4. The diff

### 4.1 Table map

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-60 | `quote_xrays` — verdict rows (D-02, D-22) | `quote_comparisons` (D-40) | **rename** (+ **split**: the labels and the file become columns, the reading becomes `result_json`) | the only X-Ray data a studio owns. Leads D §3.3 names `quote_xrays` as the counterpart; the Leads map's "2.0 only · no 1.0 counterpart" for `quote_comparisons` (`../02-leads-migration-map-2026-09-24.md:35`) is corrected here |
| D-61 | `quote_xrays` — legacy rows: `gap-finder` · `sales-justifier` · `market-intel` · `package-ladder` · `combined` (D-23, D-24) | — | **superseded** | 1.0 has hidden them since the 2026-08 rebuild (D-02 note 2); 2.0 built the verdict flow only (REG-529) |
| D-62 | `quote_xrays.share_token · share_expires_at`, `status 'shared'`, the public route and page (D-27) | — | **Platform** | a 24-hour public link; verdict rows never had one |
| D-63 | `quote_xrays.outcome · outcome_note · outcome_at` (D-28) | — (the lead's Won / Lost stage and reason carry the result) | **dead** | no writer in 1.0's screens since 2026-08 |
| D-64 | `quote_xrays.brand_ammo` (D-25) | `result_json.brands` | **merge** (format change) | D-131…D-134 |
| D-65 | `brand_dossiers` (D-03) | `lib/xray/brands.ts` `BRAND_NOTES` (code, 9 notes) | **superseded** / **Platform** | a cross-studio web cache vs a curated table |
| D-66 | `market_quote_observations` (D-04) | — | **Platform** | write-only in 1.0; QE D-219 |
| D-67 | `platform_market_rates` (D-05) | — (2.0's "below market" = below 60 % of **our** price, `compare.ts:86`) | **Platform** | QE D-25, QE D-219 |
| D-68 | `platform_config.quote_xray_brand_ammo_enabled` (D-06), the cron, the admin page (D-11) | — | **Platform** | |
| D-69 | `usage_events` · `quote_xray` (D-08) | — | **Platform** | leads D §3.4 C |
| D-70 | the own quote from `quotes` + `quote_line_items` (D-07) | `quotes` + `quote_items` through `loadYourLines` (D-42) | **same** | the Quotes port keeps the ids, the number and the title (QE D-233) |
| D-71 | the compared quote as `inputs.quotes[0].sourceFileName = 'digitized:{id}'` (D-02 note 3) | `quote_comparisons.quote_id` | **2.0 only** (1.0 **derived** from JSON) | the port parses it (D-213) |
| D-72 | — (no line on the lead) | the lead's Activity row (D-43) | **2.0 only** (**derived**) | a ported row shows there with no extra write (D-218) |
| D-73 | no bucket, the file's name in `sourceFileName` (D-09) | no bytes, the file's name in `other_file` | **same** | |
| D-74 | the parse, synthesis and verdict fixtures used with no AI key (D-02 note 11) | the three reference quotes the engine reads (D-42) | **superseded** | 2.0's "reading" is curated by design (the owner's answers) |
| D-75 | `localStorage.qanvast_xray_banner_dismissed` (D-10) | `om.xray.introHidden`, `om.columns.xray-items` (D-44) | **Platform** (browser) | |
| D-76 | studio RLS; page roles `owner · admin · id` (D-11) | one studio; no lead scoping (D-43) | **superseded** | Who sees leads (REG-603) does not reach the X-Ray |

### 4.2 Column-level diffs

**A · `quote_xrays` → `quote_comparisons`** (a verdict row lands as one comparison — 5.D)

| Id | 1.0 column | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-80 | `id` | `id` | **rename** | uuid → the same string as text |
| D-81 | `studio_id` | — | **dead** | one studio |
| D-82 | `lead_id` | `lead_id` | **same** | SET NULL on both sides; only a lead that landed in the Leads port (D-213) |
| D-83 | `created_by` | `created_by` | **unit change** | `profiles.id` → `members.id` (leads D §3.4 C); NOT NULL in 2.0 |
| D-84 | `objective` | — | **superseded** | only `verdict` rows land (D-141) |
| D-85 | `status` | — | **Platform** / **dead** | `shared` is the public link; `ready` is every row; `draft` · `archived` unused (D-140) |
| D-86 | `currency_code` | — | **missing in 2.0** | 2.0 prints S$; 5.B D-182 |
| D-87 | `inputs` | `your_label` · `other_studio` · `other_file` · `quote_id` (derived) and, in part, `result_json` | **split** | the parsed quotes themselves are not kept — Table E; 5.B D-175 |
| D-88 | `match_result` | `result_json.rows` · `compared` | **unit change** | the provenance (match kind, confidence, merged originals, line indexes, unit prices, quantities) is dropped — Table C; 5.B D-176 |
| D-89 | `ai_synthesis` (verdict) | `result_json` (numbers, headline, points, message) | **rename** (format change) | Table B |
| D-90 | `share_token` · `share_expires_at` | — | **Platform** | D-62 |
| D-91 | `created_at` | `created_at` | **same** | timestamptz → seconds |
| D-92 | `updated_at` | — | **missing in 2.0** | nothing edits a 2.0 reading; 1.0's later writes were the un-merge (legacy only) and the brand ammo; 5.B D-184 |
| D-93 | `outcome` · `outcome_note` · `outcome_at` | — | **dead** | D-63; 5.B D-183 |
| D-94 | `brand_ammo` | `result_json.brands` | **merge** | Table D |
| D-95 | — | `quote_id` | **2.0 only** | from `digitized:{uuid}` (D-71) |
| D-96 | — | `your_label` | **2.0 only** (**derived**) | the quote's `"{number} · {title}"`, else the own file's name less its extension (D-213) |
| D-97 | — | `other_studio` | **2.0 only** (**derived**) | = `headline.competitorLabel` (the parsed vendor, else "The other quote") |
| D-98 | — | `other_file` | **2.0 only** (**derived**) | = `inputs.quotes[1].sourceFileName` |

**B · `VerdictSynthesis` → `XrayResult`**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-100 | — | `yourLabel` | **2.0 only** | = `your_label` (D-96) |
| D-101 | `inputs.quotes[0].label` (the studio's name, else "Our quote") | `yourStudio` | **rename** | 2.0 writes `settings.brand.details.name`; the port does the same (D-214) |
| D-102 | `headline.competitorLabel` | `otherStudio` | **rename** | |
| D-103 | `headline.ownTotalCents` | `yoursMinor` | **unit change** | 1.0 = the quote's total incl. GST (a lead-loaded quote) or the file's grand total; 2.0 = Σ lines pre-GST (D-151). The port keeps 1.0's figure — what the studio saw |
| D-104 | `headline.competitorTotalCents` | `theirsMinor` | **unit change** | the file's grand total vs Σ the reference lines (D-151) |
| D-105 | `headline.rawGapCents` | `onPaperMinor` | **rename**, **sign flipped** | `onPaperMinor = −rawGapCents` (D-152) |
| D-106 | `headline.missingScopeValueCents` | `yoursOnlyMinor` | **rename** | both = what the other quote leaves out, priced at ours |
| D-107 | `headline.ownMissingScopeValueCents` | `theirsOnlyMinor` | **rename** | |
| D-108 | `headline.realGapCents` | `realDiffMinor` | **same** | the same formula and sign: raw − yoursOnly + theirsOnly = (yours − yoursOnly) − (theirs − theirsOnly) (`real-gap.ts:138`; `compare.ts:64`) |
| D-109 | `headline.unpricedMissingCount` | `unpricedCount` | **different meaning** | 1.0 counts one-sided rows with no price on the side that has them; 2.0 counts rows where the other quote's amount is 0 (D-153). The port recounts from the rows (D-216) and logs 1.0's figure |
| D-110 | `headline.oneLiner` | `headline` | **rename** | an AI sentence vs a template; kept verbatim |
| D-111 | — (VerdictView builds "On paper the difference is …" at render, `VerdictView.tsx:88-99`) | `footnote` | **derived** in 1.0, stored in 2.0 | the port writes 2.0's template over the ported numbers (D-215) |
| D-112 | `points[i]` | `points[i]`, `n = i + 1` | **rename** | |
| D-113 | `points[i].sayThis` | `say` | **same** | |
| D-114 | `points[i].evidence.type` | `kind` | **enum narrower** | 2 of 7 map (D-143); 5.B D-178 |
| D-115 | `points[i].evidence.detail` | `evidence` | **same** | |
| D-116 | the label shown for the type (`VerdictView.tsx:22-30`) | `evidenceLabel` | **derived** → stored | the port writes 1.0's words |
| D-117 | `points[i].evidence.cents` | — | **missing in 2.0** | the amount sits in the evidence text |
| D-118 | `points[i].confidence` (`medium` shows "say this as a question") | `asQuestion` (a separate question sentence) | **different** | NULL on port; 5.B D-179 |
| D-119 | `whatsappMessage` | `message` | **same** | the drafting rules differ (D-158) |
| D-120 | `match_result.matrix.length` ("{n} items compared", `VerdictView.tsx:156`) | `compared` | **derived** → stored | = `rows.length` |

**C · `match_result` → `XrayResult.rows`** (own = `quoteIdx 0`, competitor = `quoteIdx 1`)

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-121 | `matrix[i]` | `rows[i]` | **rename** | one row per matrix row, in matrix order |
| D-122 | — | `key` | **2.0 only** | 2.0 keys by line id (`y-` · `m-` · `t-`); the port writes `x-{i}` |
| D-123 | `canonicalDescription` | `name` | **same** | the own line's wording when the own quote has the item |
| D-124 | the competitor cell's line (`inputs.quotes[1].parsed.lineItems[lineIdx].description`) | `theirName` | **derived** | NULL when the competitor lacks the row |
| D-125 | `canonicalCategory` | `trade` | **unit change** | a token → its display label (D-154) |
| D-126 | — | `room` | **2.0 only** | NULL — 1.0 has no room |
| D-127 | `cells[0].totalCents` | `yoursMinor` | **same** | cents; NULL when absent |
| D-128 | `cells[1].totalCents` | `theirsMinor` | **same** | cents; NULL when absent, 0 when present with no price (the table prints "FOC / Inclusive" for 0, `xray-table.tsx:64`) |
| D-129 | the cells' presence and prices | `status` | **derived** | D-144 |
| D-130 | `cells[].lineIdx · unitPriceCents · qty · matchKind · matchConfidence`, `aiMergedFrom`, `totals[]` | — | **missing in 2.0** | 1.0 shows "AI-matched · {n}%" and offers Un-merge on legacy rows (`VarianceTable.tsx:74-92`); 5.B D-176 |

**D · `brand_ammo` → `XrayResult.brands`**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-131 | `findings[j]` (a competitor brand's negative or mixed finding) | a brand, `side 'theirs'`, `tone 'risk'` | **merge** | `brand` · `trade` ← `category` · `impact` ← severity (D-145) · `text` ← `claim` + " " + the question part of `suggestedQuestion` · `sources` ← the domains |
| D-132 | `ownAdvantages[k]` | a brand, `side 'yours'`, `tone 'advantage'`, `impact` NULL | **merge** | `text` ← 1.0's sentence "Your quote names {brand} — and users rate it well: {claim}. The other quote doesn't say what brand the client would get." (no middle clause without a claim; `VerdictView.tsx:246-248`); `sources` ← the domains |
| D-133 | `cleanBrands[]` | — | **missing in 2.0** | 2.0's `note` means "both quotes name it" (`xray-result.tsx:95`), 1.0's clean brand means "checked, nothing citable" (`VerdictView.tsx:305`); 5.B D-180 |
| D-134 | `sources[].url`, `scannedAt` | — (`sources` are domains) | **missing in 2.0** | 1.0 links each source; 5.B D-181 |

**E · `inputs` → 2.0**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-135 | `quotes[].label` · `role` | `yourStudio` · `otherStudio` | **merge** | roles become the two sides (D-161) |
| D-136 | `quotes[].sourceFileName` | `your_label` (an uploaded own file), `other_file`, `quote_id` (from `digitized:`) | **split** | D-213 |
| D-137 | `parsed.vendor · date · issuedBy · clientName · refNumber · description` | — (`vendor` survives as `otherStudio` through the label) | **missing in 2.0** | the competitor's homeowner name and signatory are not carried; `refNumber` feeds `your_label`'s fallback (D-213) |
| D-138 | `parsed.subTotal · discount · grandTotal` | — | **superseded** | the grand totals are the headline's totals already |
| D-139 | `parsed.lineItems[]` — `section · itemNumber · priceType · unitPrice · qty · unit` | — (rows keep a name, a trade and two amounts) | **missing in 2.0** | 5.B D-175 |

### 4.3 Statuses and enums (1.0 → 2.0)

**D-140 · `quote_xrays.status`.** `draft · ready · shared · archived` (CHECK, `sb:20260519000001:22-23`). 2.0 has no status: a comparison exists or is deleted.

| 1.0 | How it arises | 2.0 |
|---|---|---|
| `ready` | every insert | lands |
| `shared` | a legacy row that minted a link | not ported with its row (D-61); the link is Platform |
| `archived` | `PATCH {status}` with no caller | lands as a plain row, logged (2.0 has no archive — the owner excluded Archive, `../01-leads-1.0-to-2.0-audit-2026-09-24.md:14`) |
| `draft` | the DDL default; no insert keeps it | none expected |

**D-141 · `objective` / `ai_synthesis.kind`.** `verdict` → lands; `gap-finder` · `sales-justifier` · `market-intel` · `package-ladder` and `combined` (whatever `objective` says) → not ported (D-190); `objective 'verdict'` without a verdict synthesis → not ported (1.0 shows "This comparison has no stored result.", `page.tsx:363-371`).

**D-142 · `outcome`.** `pending · won · lost_price · lost_silence · lost_other` → none. In 2.0 the lead's stage (Won, or Lost with its reason) is the result; a reading has none.

**D-143 · Evidence type → point kind.**

| 1.0 `evidence.type` | Built from | 2.0 `kind` | Note |
|---|---|---|---|
| `missing-scope` | a row the competitor lacks, priced at ours | `missing` | same idea, same label "Missing from their quote" (`compare.ts:82`) |
| `market-rate` | a competitor unit price below the platform band (D-05) | `below-market` | **different test**: 2.0 compares with **our** price (< 60 %), not the market (`compare.ts:86`); the label "Priced below market" is the same |
| `matched-item` | the same item, ours cheaper | — | no 2.0 word ("Same item, different price") |
| `arithmetic` | a competitor line whose total ≠ unit price × qty | — | "Their numbers don't add up" |
| `material` | the curated material fact base (D-12) | — | "Material difference" |
| `brand` | own-brand advantages, competitor brands | — | "Brand difference"; 2.0 puts brands in `brands[]`, never in points |
| `unique-value` | never produced | — | |
| — | — | `unpriced` | 2.0 only: "No price given" |

**D-144 · Cell presence → row status.**

| Own cell | Competitor cell | 2.0 `status` | Amounts |
|---|---|---|---|
| present | present, `totalCents` > 0 | `matched` | both |
| present | present, no price or 0 | `unpriced` | `theirsMinor` 0 |
| present | absent | `yours-only` | `theirsMinor` NULL; `yoursMinor` 0 when the own line has no price |
| absent | present, `totalCents` > 0 | `theirs-only` | `yoursMinor` NULL |
| absent | present, no price or 0 | `unpriced` | `yoursMinor` NULL, `theirsMinor` 0 |

Two-quote verdict matrices have no row absent on both sides.

**D-145 · Brand ammo → `tone` · `impact`.** A competitor finding → `risk`, `notable` → `high`, `mild` → `mild` (1.0 prints "Impact: high / mild", `VerdictView.tsx:275-280`); an own advantage → `advantage`, `impact` NULL; a clean brand → no 2.0 tone (D-133). 1.0 never stores a brand both quotes name (the guardrail drops it, `brand-comparison.ts:39-43, 97-102`); 2.0's `both` / `note` has no 1.0 source.

**D-146 · `brand_dossiers.status`** `pending · ready · empty · disabled` → none (Platform). A dossier disabled after a run leaves that run's `brand_ammo` untouched (D-02 note 8).

### 4.4 Units and semantics

| Id | Concept | 1.0 | 2.0 | Mapping |
|---|---|---|---|---|
| D-150 | Money | dollars (JS numbers) in `inputs`; integer cents in `match_result`, `ai_synthesis`, `brand_ammo`; NUMERIC(12,2) dollars in `platform_market_rates`; BIGINT cents in `market_quote_observations` | integer S$ minor units | cents unchanged; `inputs` dollars × 100, rounded once — only with D-175 |
| D-151 | Totals basis | own = the quote's `total_cents` (incl. GST, after discounts) or the file's grand total; competitor = the file's grand total; a missing grand total = 0; the gaps are line totals | Σ lines on both sides, pre-GST, no document discount, optional lines out, Print-as lines in | keep 1.0's totals; a ported row's `yoursMinor` ≠ Σ its rows (D-222) |
| D-152 | Sign of the paper gap | `rawGapCents` = own − competitor (positive = ours dearer) | `onPaperMinor` = theirs − yours (negative = theirs cheaper) | negate; `realDiffMinor` = `realGapCents` unchanged |
| D-153 | "Unpriced" | one-sided rows with no price on the present side (`real-gap.ts:99-101, 113-115`) | rows whose other-side amount is 0, shared or not (`compare.ts:54-56, 62`) | recount (D-216) |
| D-154 | Category | 16 canonical tokens + free text from the section (D-12) | the quote's trade words (`Carpentry`, `Hacking`, `Ceiling & Partition` …) | `categoryDisplayLabel(token)` (`canonical-categories.ts:53-73`) |
| D-155 | Time | `timestamptz` | integer unix seconds | `Date.parse(ts) / 1000` |
| D-156 | Ids | uuid; `created_by` = `profiles.id` | text; `created_by` = `members.id` | the UUID string; the member map (leads D §3.4) |
| D-157 | Currency | per row: SGD · MYR · AED · INR · EGP from the studio's region; files sniffed for SGD · MYR · AED · INR and a mismatch refused (`create/route.ts:252-269, 624-636`) | S$ only | port `SGD` rows only (D-193) |
| D-158 | The draft's rules | no salutation, "the other quote", never the other studio's name, ≤ 1,200 characters (`verdict.ts:282, 248`) | "Hi {client's first name}", the points name the other studio, signed with the studio's name, no cap (`compare.ts:81, 117-118`) | kept verbatim; a ported draft follows 1.0's rules |
| D-159 | Brand sources | `{url, domain}[]`, ≥ 2 domains for a negative, URLs the search returned | domain strings | domains only unless D-181 |
| D-160 | Matching | exact or ≥ 0.6 token overlap inside one category, then an AI merge ≥ 0.7 confidence (D-21) | ≥ 2 shared words and ≥ 0.5 of the shorter line, one-to-one, across trades (D-42) | nothing re-matched on port |
| D-161 | Sides | roles `own · competitor · own-version`, 2–3 quotes | yours · theirs | verdict rows are exactly own + competitor |
| D-162 | Unpriced words | `priceType` `amount · foc · inclusive · by_client · kiv · lump_sum` (+ stored `price_type`s for a lead-loaded quote) | an amount of 0 = "FOC / Inclusive / no price" (`reference.ts:4`) | not carried (D-139) |
| D-163 | Sizes | points ≤ 3; facts ≤ 12; draft ≤ 1,200; claims ≤ 400; evidence quotes ≤ 300; findings ≤ 6; history shows 5 | points ≤ 3; recents show 20 | — |
| D-164 | Files | any PDF, PNG, JPEG, CSV or XLSX ≤ 10 MB, read by a model | three reference files, read by name | no file to port (D-09) |

---

## 5. Port plan

A port is a one-shot import of one 1.0 studio's X-Ray data into 2.0, run after the Leads port (leads D §3.4), the Quotes port (QE D-232…D-242, map 06) and the Templates port (map 04). Ids keep the 1.0 UUID strings, so a re-run is `INSERT OR IGNORE`; every `*_by` becomes a `members.id`; times are `Date.parse(ts) / 1000`; cents stay cents. **Nothing is re-run:** a 1.0 reading lands as what the studio saw — 2.0's engine cannot read a 1.0 file anyway (it reads three names, D-42), and 1.0 kept no file. Nothing below is built until the owner marks it.

### 5.A New 2.0 tables

None is required. The two below are conditional, each with an alternative that needs no table.

| Id | 1.0 table | Why 2.0 would need it | Columns to carry | Alternative |
|---|---|---|---|---|
| D-170 | `quote_xrays` (verdict rows) | — | — | **no new table**: a verdict row lands as one `quote_comparisons` row (D-60), whole enough for the record page, Recent comparisons and the lead's Activity |
| D-171 | `brand_dossiers` | only if 2.0 read brands from live web findings shared by every studio | `brand_dossiers`: `id, brand_canonical, display_name, category_hint, status, findings (JSON), scan_count, last_scanned_at, created_at, updated_at` — not `aliases` (never written, D-03) | not needed: a ported reading keeps its ammo inside `result_json.brands` (D-131…D-134); new readings use `BRAND_NOTES` (D-42) |
| D-172 | a share-link store (1.0 kept it on the row, D-27) | only if a client-facing X-Ray page came back — 1.0 retired it for verdicts in 2026-08 | `comparison_shares`: `id, comparison_id, token, expires_at, created_at` | not needed: *Send to client* is the WhatsApp draft in both products |

### 5.B Columns and JSON fields to add to existing 2.0 tables

| Id | 2.0 table · JSON | 1.0 source | 2.0 column / field | Type / unit | Note |
|---|---|---|---|---|---|
| D-175 | `quote_comparisons` | `inputs` | `inputs_json` | text JSON — 1.0's `QuoteXrayInputs` verbatim (dollars) | keeps each line's qty, unit, unit price, section and price word, and each file's header — the competitor's homeowner name and signatory included (strip `clientName` · `issuedBy` on port, or hold them); only to show those, or to re-run a reading |
| D-176 | `quote_comparisons` | `match_result` | `match_json` | text JSON — 1.0's matrix with `matchKind`, `matchConfidence`, `aiMergedFrom` | only with the "AI-matched · {n}%" chip and Un-merge (`VarianceTable.tsx:74-92`); 2.0 has no AI match |
| D-177 | `quote_comparisons` | the engine that made the row | `engine` | text — `'1.0'` · `'2.0'` | tells an AI-phrased 1.0 reading on document totals (D-151) from a templated 2.0 one; lets the page caption it and lets D-222 skip the Σ-rows test |
| D-178 | `result_json.points[].kind` | `evidence.type` | + `same-item` · `arithmetic` · `material` · `brand` (or a new `evidenceType` that keeps 1.0's word) | TS union | type-only: the page does not read `kind` (D-41) |
| D-179 | `result_json.points[]` | `confidence` | `confidence` | `'high' · 'medium'` | 1.0's "say this as a question" chip |
| D-180 | `result_json.brands[].tone` | `cleanBrands[]` | + `'checked'` | TS union | "We also checked … — users report no real problems."; else the clean brands are dropped (D-199) |
| D-181 | `result_json.brands[]` | `sources[].url`, `scannedAt` | `sources: {url, domain}[]`, `scannedAt` | JSON | keeps the cite-or-drop evidence clickable; 2.0 prints domains |
| D-182 | `quote_comparisons` | `currency_code` | `currency` | text, ISO 4217 | only if a non-SGD studio is ported (D-193); `money()` prints S$ |
| D-183 | `quote_comparisons` | `outcome` · `outcome_note` · `outcome_at` | same names | text · text · ts | only if win / loss per comparison returns; 1.0 removed it (D-28) |
| D-184 | `quote_comparisons` | `updated_at` | `updated_at` | ts | only with D-176's Un-merge or a late brand enrichment |

Not added: `studio_id`, `objective`, `status` (D-81, D-84, D-85) and the share columns (D-172, Platform). Leads D §3.4 proposes no X-Ray column, so nothing on its list is dropped.

### 5.C Not ported

| Id | 1.0 table / column / rows | Reason |
|---|---|---|
| D-190 | legacy rows — `ai_synthesis.kind` `gap-finder` · `sales-justifier` · `market-intel` · `package-ladder` · `combined` | **superseded**: hidden from 1.0's history since the rebuild (D-02 note 2); 2.0 has one flow. The port log counts them per lead |
| D-191 | `objective 'verdict'` rows with no verdict synthesis | nothing to show (1.0 says so, `page.tsx:363-371`) |
| D-192 | test rows — a competitor side (or both) equal to the parse fixture: vendor "Home Create Pte Ltd", grand total 27,000, seven lines (`parse-file.ts:134-150`) | made with no AI key (D-02 note 11) |
| D-193 | rows whose `currency_code` ≠ `SGD` | 2.0 prints S$ (unless D-182) |
| D-194 | `share_token` · `share_expires_at` · `status 'shared'`; the public route and page | **Platform**; every link lives 24 h and no verdict row has one |
| D-195 | `outcome` · `outcome_note` · `outcome_at` | **dead** since 2026-08 (D-28), unless D-183 |
| D-196 | `brand_dossiers` | **Platform** cache, rebuildable (`278_…_down:3-5`), unless D-171 |
| D-197 | `market_quote_observations` | **Platform**, write-only |
| D-198 | `platform_market_rates`; the kill switch; the cron; the admin page | **Platform** (QE D-219) |
| D-199 | `brand_ammo.cleanBrands`, `sources[].url`, `scannedAt` | no 2.0 field (D-133, D-134), unless D-180 · D-181 |
| D-200 | the match provenance and the parsed lines' detail | not shown by 2.0, unless D-175 · D-176 |
| D-201 | `usage_events` rows | telemetry (leads D §3.4 C) |
| D-202 | `localStorage.qanvast_xray_banner_dismissed` | a browser's convenience; 2.0 has `om.xray.introHidden` |
| D-203 | brand mentions and material findings | 1.0 never stored them for a verdict row (D-29) — nothing to port |

### 5.D The order a comparison lands

One studio at a time, newest first:

| Id | Step | Rows written | Rules |
|---|---|---|---|
| D-210 | Before | — | the Leads port (leads D §3.4: leads, members — `profiles.id` → `members.id`, archived leads as deleted); the Quotes port (QE D-232…D-242: quote ids kept, the number verbatim, the title from the label, variation orders skipped); the Templates port for `settings.brand.details.name` |
| D-211 | Classify | — | land a row only when `ai_synthesis.kind = 'verdict'`, it is not a test row (D-192), its currency is SGD (D-193) and `inputs.quotes` holds exactly one `own` and one `competitor`; everything else goes to the port log with its reason (D-190…D-193) |
| D-212 | The sides | — | own = `inputs.quotes[0]`, competitor = `inputs.quotes[1]` — `real-gap.ts` puts the own quote at 0 and, in a pair, its cheapest-other rule picks 1 (D-22) |
| D-213 | The row | `quote_comparisons` ×1 | `id` = the 1.0 id; `lead_id` = `lead_id` when that lead landed, else NULL + log; `quote_id` = the uuid of `inputs.quotes[0].sourceFileName = 'digitized:{uuid}'` when that quote landed and is not deleted (repair's check, `repair-demo-data.ts:1263`), else NULL + log; `your_label` = the quote's `"{number} · {title}"`, else `parsed.refNumber` (the 1.0 number at the time, `own-quote-from-lead.ts:143`), else the own file's name less its extension (2.0's rule, `app/quote-x-ray/actions.ts:36`) — a naming choice; `other_studio` = `headline.competitorLabel`; `other_file` = `inputs.quotes[1].sourceFileName`; `created_by` = the member behind `created_by`, else the studio's Owner + log; `created_at` in seconds |
| D-214 | The numbers | `result_json` | from the headline, never recomputed: `yoursMinor` = `ownTotalCents`, `theirsMinor` = `competitorTotalCents`, `onPaperMinor` = −`rawGapCents`, `yoursOnlyMinor` = `missingScopeValueCents`, `theirsOnlyMinor` = `ownMissingScopeValueCents`, `realDiffMinor` = `realGapCents`; `yourLabel` = `your_label`, `yourStudio` = `settings.brand.details.name`, `otherStudio` = `other_studio` |
| D-215 | The words | `result_json` | `headline` = `oneLiner`; `footnote` = 2.0's template over the ported numbers (`compare.ts:74`) — invented copy, flagged; `points[i]` = `{n: i + 1, kind (D-143, D-178), say: sayThis, evidenceLabel: 1.0's label (`VerdictView.tsx:22-30`), evidence: detail, asQuestion: NULL}`; `message` = `whatsappMessage` |
| D-216 | The rows | `result_json` | one per matrix row (D-121…D-130, D-144); `key` `x-{i}`; `theirName` from the competitor's line; `trade` = the category's label; `room` NULL; `compared` = `rows.length`; `unpricedCount` = the rows with status `unpriced` (1.0's `unpricedMissingCount` logged) |
| D-217 | The brands | `result_json` | `brand_ammo.findings` → risks, `ownAdvantages` → advantages (D-131, D-132), in 2.0's order — advantages, then risks, `high` first (`compare.ts:115`); `cleanBrands` per D-180 or dropped; NULL ammo → `[]` |
| D-218 | The lead's Activity | none | derived: "{member} compared {your_label} with {other_studio}'s quote in Quote X-Ray." at `created_at` (`lib/leads/activity.ts:103-104`) |
| D-219 | Check — identities | port log | on the 1.0 numbers, `realGap = rawGap − missing + ownMissing` (`real-gap.ts:138`); after mapping, `realDiff = (yours − yoursOnly) − (theirs − theirsOnly)` and `onPaper = theirs − yours` (`compare.ts:63-64`) |
| D-220 | Check — rows against the headline | port log | Σ `yours-only` rows' yours = `yoursOnlyMinor` and Σ `theirs-only` rows' theirs = `theirsOnlyMinor` — true by construction (`real-gap.ts:96-124`); a difference means the matrix changed after the verdict |
| D-221 | Check — the rows' prices | port log | every `matched` row has both prices; every `unpriced` row has `theirsMinor` 0 |
| D-222 | Check — the totals basis | port log | do not expect Σ rows = `yoursMinor` on a ported row (D-151); with `quote_id` set, compare `yoursMinor` with the landed quote's `amount_minor` and log the difference and its cause (GST, the document discount, lines changed since the run — QE D-242's causes) |
| D-223 | Check — the repair rules | `npm run db:repair`'s checks | "quote comparison whose quote is gone" (`repair-demo-data.ts:1263`) stays empty |
| D-224 | Check — people and links | port log | `created_by` is a member; `lead_id` names a lead; when both are set, `quote_id`'s quote belongs to `lead_id` |
| D-225 | What changes in the data | — | a ported reading keeps 1.0's figures and sentences — AI-phrased, on document totals — beside 2.0's templated, line-summed readings; its brand sources lose their links (unless D-181); its points of 1.0-only kinds keep their words (D-178); the competitor's parsed quote, its homeowner name and the match provenance stay behind (unless D-175 · D-176); there never was a file to port |

### 5.E Demo data — 1.0 seeds vs 2.0 seeds and repairs

| Id | 1.0 seed (`path:lines`) | What it writes | 2.0 counterpart | Fit |
|---|---|---|---|---|
| D-230 | none — no migration, seed or tenant script inserts `quote_xrays`, `brand_dossiers` or `market_quote_observations` (grep of both migration sets and `scripts/`) | — | R33 (`scripts/repair-demo-data.ts:755-773`): two readings through the page's own engine — "nothing typed in 'as the mock shows'" | 2.0 only; REG-343's rule has no 1.0 counterpart |
| D-231 | `sb:20260414000004` | 111 `platform_market_rates` rows: SG 32 · MY 30 · AE 24 · IN 25 | — (no market data; "below market" = below 60 % of ours) | Platform |
| D-232 | `278:50-53` | the kill switch, `true` | — | Platform |
| D-233 | `parse-file.ts:134-150`; `dryrun-fixtures.ts:1-251`; `verdict.ts:293-315` | the stand-ins used with no AI key — they land in real rows (D-192) | the reference quotes (`lib/xray/reference.ts`, 28 · 21 · 20 lines) and the brand notes (`lib/xray/brands.ts`, 9) — the engine itself | different: 1.0's are test stand-ins, 2.0's curated data is the product |
| D-234 | `docs/demo/quote-xray-samples/urban-nest-competitor-quote.{pdf,html}` | a sample competitor quote for demos (a file, not a row) | the owner's three reference quotes, read by name | — |
| D-235 | `scripts/cleanup/003_fleet_purge_demo_data.js:353` | deletes a demo lead's runs | — (a lead's *Delete forever* leaves its comparisons to the FK's SET NULL, `app/leads/actions.ts:406-419`) | — |
| D-236 | — | — | `fixtures/baseline.json`: 4 rows — R33's two and two made in the app on 2026-09-18 (D-45); those two exist only in the baseline (`npm run db:repair` on an empty database gives 2, *Reset prototype to base* gives 4) | each row is real engine output (REG-343 holds), but D-43's drift shows in the demo: OM-10001's readings carry S$58,773.00 against today's S$45,726.50 of lines; every "yours" is pre-GST beside a quote card with GST; every reading prints a brand only the other quote names as "both quotes name it" |

## Uncertain / not verified

- **Row counts.** No 1.0 database was queried: how many runs are verdict or legacy, carry `brand_ammo`, a non-`pending` outcome, a share token, a fixture competitor or a non-SGD currency is unknown.
- **Which environments applied 272 · 277 · 278.** The fork plan is dead code and stops at 240 (`scripts/runners/migration-plan.js:16-44`); the code writes `outcome`, `objective 'verdict'` and `brand_ammo` unconditionally, so an environment without them would fail its runs — inferred, not checked.
- **The legacy-row purge** that `QuoteXrayHistory.tsx:4-5` mentions ("regardless of whether the environment's purge has run") is not in the repo; the only delete script is the fleet demo purge by lead (`003_fleet_purge_demo_data.js:353`).
- **The referenced spec** `docs/features/quote-comparison/spec.md` (`sb:20260519000001:3, 71-72`; `app.ts:4407`) is not in the repo; the migrations, types and routes were taken as the truth. `docs/prd/12-quote-xray.md` still describes the pre-rebuild tool (a shareable public result).
- **The unverified lead id at create** (D-02 note 4) is read from the code and Postgres's documented FK behaviour, not executed.
- **`content_block` lines** reaching `inputs` through the own-quote loader (D-20) — read from the code; whether such rows remain in `quote_line_items` is QE D's open point.
- **The kill switch and stored ammo** (D-02 note 8): the migration comment and the rules doc say "hide … instantly"; the read routes do not check the switch. Read, not run.
- **"Never read / never written"** for `sourceFileName`, `aliases`, `updated_at`, `status`, `outcome*`, `created_by` and `market_quote_observations` are greps of `src/` at this commit; an SQL console, a script or another branch could touch them.
- **The totals basis** (D-151): a lead-loaded quote's `total_cents` includes GST (QE D-01); whether a parsed competitor's `grandTotal` does depends on the document.
- **2.0's foreign keys.** `lib/db/index.ts` sets no `PRAGMA foreign_keys`, and the libSQL client toggles it only around `migrate()`; whether `ON DELETE SET NULL` fires for `lead_id` when a lead is deleted forever (`app/leads/actions.ts:406-419` deletes the lead, not its comparisons) is not verified. `deleteQuotesForever` nulls `quote_id` itself.
- **2.0 figures** come from `fixtures/baseline.json` (`takenAt` 2026-09-24T21:43:07Z), not `local.db`; the two app-made rows' origin is inferred from their random ids and their times (2026-09-18 11:35–11:36Z, the day REG-529 was built). The working tree carries uncommitted rounds; the X-Ray files are as committed in `7f2ce14`.
- **5.D's naming choices** — `your_label`'s fallbacks, the templated footnote, the `x-{i}` keys, the Owner for an unmapped creator — are the owner's to confirm; this file records where each would land, not whether to do it.
