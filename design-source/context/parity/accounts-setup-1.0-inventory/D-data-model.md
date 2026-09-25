# OpenMaison 1.0 → 2.0 — Accounts Setup inventory · Slice D: the data model, the routes' checks and the port plan

Sources: 1.0 `/Users/vicky/Documents/GitHub/qanvast-id-tool` @ `67f42e469` (branch `integ/security-non-qanvast`, committed 2026-09-22 13:25 +0530, read only); 2.0 `/Users/vicky/Documents/GitHub/openmaison-prototype` (HEAD `8733d6d` plus the uncommitted parity rounds in the working tree — `lib/settings/*`, `app/settings/*`, `lib/db/schema.ts`, `scripts/repair-demo-data.ts` and `fixtures/baseline.json` are modified since HEAD, `drizzle/0037…0047` are new). Read on 2026-09-25.

What was read. **1.0:** the Accounts page `src/app/(main)/accounts/page.tsx` (3,810 lines: the menu, the Lead Categories · Custom Fields · Quote Approval Rules · Quote Sharing · Lead Sources · Quote Categories panes inline, the save handlers) and the tab files of the three groups (`legal-entities-tab.tsx`, `lead-experience-tab.tsx`, `journey-config-editor.tsx`, `lead-webhooks-tab.tsx`, `document-templates-tab.tsx`, `signing-documents-tab.tsx`, `quote-templates-tab.tsx`, `quote-rules-tab.tsx`, `usage/page.tsx`, `roles/page.tsx`); the components they mount (`src/components/settings/team-settings.tsx`, `src/components/accounts/{role-editor,taxonomy-list-editor}.tsx`, `price-book-manager.tsx` hooks only, `src/components/settings/{lead-preference-editor,notification-settings}.tsx` hooks and vocabularies); `src/app/(main)/settings/page.tsx` and `settings/notifications/page.tsx`; the hooks in `src/lib/queries/{studio,studio-config,studio-companies,invitations,lead-webhooks,signing-documents,document-templates,quote-generation-rules,studio-quote-templates,email-connections,member-signatures,notifications}.ts`; every route those hooks call (listed in §3, each read for its session, role and studio checks); `src/lib/{access-control,api-auth,api-role-guard,supabase-scoped,session}.ts`, `src/proxy.ts`, `src/app/(main)/layout.tsx`, `src/app/api/auth/verify/route.ts` (the session cookie), `src/app/studio-setup/page.tsx` (its role seed), `src/lib/transformers.ts` (`transformStudioSettings`), `src/types/{app,database}.ts` (the settings, member, role, funnel, webhook and entity types); the migrations that create, seed or lock these tables in both sets (cited where used: `003`, `013`, `016`, `033`, `078`, `080`, `090`, `093`, `109`, `114`, `116`, `125`, `126`, `127`, `129`, `130`, `133`, `205`, `210`, `223`, `226`, `228`, `230`, `234`, `236`–`238`, `240`, `242`, `256`, `264`, `267`, `274`, `296`, `sb:20260314000001`, `sb:20260402000001`, `sb:20260503000017`); `docs/rules/{architecture,database-auth}.md`. **2.0:** `lib/db/schema.ts` (`settings`, `members`, `users` · `organizations` · `memberships`, `lead_custom_fields` · `lead_custom_field_values`, `studio_scope_questions`, `notifications`), `drizzle/0001`, `0002`, `0019`, `0028`, `0031`, `0035`, `lib/settings/{types,queries}.ts`, `app/settings/{page.tsx,actions.ts,settings-view.tsx}` (the guards), `app/company/{members,templates,price-book,scope-questions,contract-templates,payment-templates,task-templates}-actions.ts` (their gates), `app/leads/capture-actions.ts`, `app/notifications/actions.ts`, `lib/company/{members,preferences,custom-fields,sections}.ts`, `lib/leads/{assign-policy,visibility,custom-fields-model}.ts`, `app/leads/actions.ts:288-300` (custom values), `lib/templates/{brand,model,data}.ts` (the brand setting and the issuing entities), `lib/notifications/{model,queries}.ts`, `lib/db/{session,baseline}.ts`, `components/company/{profile-view,integrations-view,members-view}.tsx` (their gates), `scripts/repair-demo-data.ts` (R23 · R27 · R31 · R34 · R35 · R36 · R39 · R44 · R45 and the checks), `fixtures/baseline.json` (the `settings` and `members` rows and the counts of the config tables; `takenAt` 2026-09-24T23:37:56Z) and `local.db` opened with `sqlite3 -readonly` (the `settings` keys and the `members` rows only). Nothing in either repo was modified except this file (and its folder); no script, server or query was run against 1.0; no `.env` was read; git was used read-only.

Builds on the earlier slices — cited, not repeated: **leads D §n** = `../leads-1.0-inventory/D-data-model.md` (the lead-configuration tables' columns, the lead-facing `studios.settings` keys, the lead port §3.4); **QE D-nn** = `../quote-editor-1.0-inventory/D-data-model.md` (approval D-07, price book D-09…D-13, numbering D-17, the entity on a quote D-18, the editor's settings D-23); **templates D-nn** = `../quote-templates-1.0-inventory/D-data-model.md` (document templates D-01, generation rules D-03, packages D-05, signing library D-12, `studio_companies` D-13 · D-77 · D-126 · D-133, the `studios` keys a template reads D-14); **contracts D-nn** = `../contracts-1.0-inventory/D-data-model.md` (`member_signatures` D-06). The migration maps are cited as **map 02** (`../02-leads-migration-map-2026-09-24.md`), **map 04** (`../04-quote-templates-migration-map-2026-09-24.md`), **map 06** (`../06-quote-editor-migration-map-2026-09-24.md`), **map 08** (`../08-contracts-migration-map-2026-09-25.md`); the owner's answers as **leads Q-nn** (`../01-leads-1.0-to-2.0-audit-2026-09-24.md:596-616`), **templates Q-nn** (`../03-quote-templates-1.0-to-2.0-audit-2026-09-24.md:324, 399`) and **QE Q-24** (`../05-quote-editor-1.0-to-2.0-audit-2026-09-24.md:365`).

## 0. Conventions

- **Effective 1.0 schema = the union of both migration sets** (leads D §0.1; `supabase/migrations/` 102 files, `scripts/migrations/` 380 `.sql` files). Two columns this slice touches exist only in the production set and only because a tenant-onboarding migration added them: `studio_members.title` and `studios.logo_url` (`093_onboard_patio_architects.sql:10-11`).
- **Citations.** `NNN` or `NNN:lines` = `scripts/migrations/NNN_*.sql`; `sb:YYYYMMDDNNNNNN` = `supabase/migrations/…`; a bare `:lines` cites the file named last before it in the same cell or paragraph. 1.0 paths start with `src/`; 2.0 paths with `lib/`, `app/`, `components/`, `scripts/`, `drizzle/` or `fixtures/`. Abbreviations for the 1.0 files cited most: `ACC` = `src/app/(main)/accounts/page.tsx`; `AC` = `src/lib/access-control.ts`; `SS` = `src/app/api/identity/studio-settings/route.ts`; `MEM` = `src/app/api/identity/members/route.ts`; `TR` = `src/lib/transformers.ts`; `SC` = `src/lib/queries/studio-config.ts`; `TS` = `src/components/settings/team-settings.tsx`; `RE` = `src/components/accounts/role-editor.tsx`; `SET` = `src/app/(main)/settings/page.tsx`.
- **Ids · time · money.** 1.0: `uuid DEFAULT gen_random_uuid()`, `timestamptz`; studio settings in one `studios.settings` JSONB bag whose top-level keys mix snake_case and camelCase (D-20); the approval thresholds are JS **dollars**; `studio_companies.tax_rate` is a NUMERIC(5,4) **fraction** (0.09). 2.0: `text` ids (the demo's members are slugs `dane` · `james` …), integer unix **seconds** (`{ mode: 'timestamp' }`) — except inside `settings.lead_capture`, whose webhook and email stamps are JavaScript **milliseconds** (D-151); settings as one JSON string per key in `settings (key, value, updated_at)`; one studio, no tenant column, no RLS; the signed-in member is the `members` row with `is_you` (`lib/leads/visibility.ts:10-14`), else the constant `SESSION_MEMBER_ID = 'dane'` (`lib/db/session.ts:12`).
- **1.0 RLS end state, and what it cannot do.** The scoped client sends a server-minted JWT whose only claims are `role: authenticated` and `studio_id` (`src/lib/supabase-scoped.ts:35-69, 79-92`); every policy keys on that claim. RLS therefore separates studios and **nothing inside a studio**: no policy knows who the caller is or what role they hold, so every per-role rule is the route's own (§3). The locks for this slice: `226:36-138` — direct scope for `studio_members`, `studio_roles`, `studio_companies`, `studio_invitations`, `studio_member_requests`, `lead_categories`, `lead_custom_fields`, `studio_lead_funnel`, `studio_quote_categories`, `studio_document_templates`, `studio_assemblies`, `quote_generation_rules`, `studio_price_book`, `price_book_suggestions`, `vendors`; own row for `studios` (`226:72-81`); parent-EXISTS for `lead_custom_field_values` (through `leads`) and `price_book_pricing_tiers`; `223:35-58` — `studio_taxonomies`, `price_book_history`; `210:18-41` — server-only (RLS on, no policy, `anon` and `authenticated` revoked) for `lead_webhook_endpoints`, `notification_preferences`, `notification_templates`, `customer_notification_preferences`, `email_connections`; `230` — `lead_webhook_log`, `email_sync_log` through their parents; `242:21-30` and `267` — `studio_signing_documents`, `member_signatures` with their own `scoped` policy; `228:39-58` — `profiles` (co-members may SELECT; no writes from the scoped role); `236:31-37`, `237`, `238:24-30` — the usage tables; `264:44-79` — `platform_config`, `platform_settings` service-role only. `234_rollback_209_233_tenant_locks.sql` is the emergency "panic button" that turns the wave off (`234:1-16`), not the end state.
- **Ids in this file.** D-01…D-19 = 1.0 tables and stores (§1); D-20…D-29 = 1.0 JSON shapes (§2); D-30…D-37 = the routes and their checks (§3); D-40…D-47 = 2.0 (§4); D-60…D-79 = store map (§5.1); D-80…D-139 = column diffs (§5.2); D-140…D-149 = enums (§5.3); D-150…D-162 = units and semantics (§5.4); D-170…D-236 = port plan (§6: 6.A D-170…D-174, 6.B D-175…D-187, 6.C D-190…D-209, 6.D D-210…D-228, 6.E D-230…D-236).
- **Verdicts** (§5): *same* · *rename* · *merge* · *split* · *missing in 2.0* · *2.0 only* · *derived* (computed; no column) · *superseded* (2.0 does the job another way) · *Later* · *Platform* (tenancy, provisioning, auth, telemetry, delivery — never a studio's data in the prototype) · *dead* (nothing reads or writes it) · *write-only* (saved; nothing acts on it).

---

## 1. 1.0 — tables and stores

### D-01 · Where each screen's data lives

The Accounts menu is `ACC:74-158`: **Studio** (`ACC:76-82`), **Lead Management** (`ACC:84-91`), **Quotes & Pricing** (`ACC:94-106`); the other six groups (`ACC:108-158`) are later modules (D-19). `/settings` lists its sections at `SET:34-47`.

| Group · screen | 1.0 store(s) | Written by | Read by (besides the screen) |
|---|---|---|---|
| Studio · **Team Members** (`ACC:77`; `<TeamSettings/>` `ACC:1436`) | `studio_members` (D-03) + `profiles` (D-04); `studio_member_requests` · `studio_invitations` (D-06); `member_signatures` roster (D-17); `studio_roles` for the role chips | `PATCH` / `DELETE /api/identity/members`; `PATCH /api/studio-config/member-overrides`; `POST /api/studio/members/request-add`; `PATCH` / `DELETE /api/invitations/[token]`; `PATCH /api/studio/member-requests` | every member picker (`useStudioMembers`, `src/lib/queries/leads.ts:122-140`), the AI recommendation card (`src/components/leads/lead-detail-drawer.tsx:153-253`), notification recipients (`src/lib/notifications/resolve-recipients.ts`), the quote transition's approvers (QE D-07) |
| Studio · **Legal Entities** (`ACC:78, 1394`) | `studio_companies` (D-07) | `POST /api/studio-companies/records`; `PATCH …/records/[id]` | quotes, signing, invoices, POs, contracts, the numbering route (templates D-13; QE D-18; D-07) |
| Studio · **Roles & Permissions** (`ACC:79, 1739-1747`) | `studio_roles` (D-05); `studios.settings.features.lead_manager_hierarchy` for the Manager card (`ACC:1743`) | `POST /api/studio-config/roles`; `PATCH` / `DELETE …/roles/[id]`; the studio-setup wizard | `GET /api/studio-config/role-permissions` → `resolveCanPerformAction` (D-21) |
| Studio · **Studio Health** (`ACC:80`; `src/app/(main)/accounts/usage/page.tsx`) | `usage_daily_rollup` · `usage_events` · `studio_members` / `profiles` (D-08) | the usage tracker and the rollup cron (Platform) | — |
| Leads · **Lead Experience** (`ACC:85, 1439`) | `studios.settings.features.lead_journey_mode` · `.duplicate_detection_enabled`; `studios.settings.journey` (D-24) | `PUT /api/studio-config/features`; `PUT /api/studio-config/journey` | the leads page (`src/app/(main)/leads/page.tsx:162`), the drawer, `src/lib/leads/duplicate-detection.ts:32-33` |
| Leads · **Lead Funnel** (`ACC:86, 1443-1449`) | `studio_lead_funnel` (D-10) | `PUT /api/studio-config/funnel`; the wizard | the board, the drawer, `src/lib/leads/load-funnel-config.ts:36`, the close / engagement / TAT routes, the signing submit |
| Leads · **Lead Categories** (`ACC:87, 690-812`) | `lead_categories` (D-09) | `PUT /api/lead-config/categories` → RPC `save_lead_categories` | **nothing** (grep: the route and the page only) |
| Leads · **Lead Sources** (`ACC:88, 1784-1792`) | `studio_taxonomies` `type = 'lead_source'` (D-11) | `PUT /api/studio-config/taxonomies` | the lead forms and filters (`useTaxonomies(…, "lead_source")` in `leads/page.tsx`, `leads/new/page.tsx`, `new-lead-drawer.tsx`, `lead-detail-drawer.tsx`) |
| Leads · **Custom Fields** (`ACC:89, 948-1140`) | `lead_custom_fields` · `lead_custom_field_values` (D-12) | `PUT /api/lead-config/custom-fields` → RPC `save_lead_custom_fields`; values `PUT /api/studio-config/custom-field-values` (the drawer) | the lead drawer only (`lead-detail-drawer.tsx:1656-1745`) |
| Leads · **Lead Webhooks** (`ACC:90, 1397`) | `lead_webhook_endpoints` · `lead_webhook_log` (D-13) | `/api/webhooks/leads/endpoints*`; the public `POST /api/webhooks/leads/[token]` | — |
| Q&P · **Quote Categories** (`ACC:95, 1750-1782`) | `studio_quote_categories` (templates D-18); `studio_price_book` through the CSV import (`ACC:1759-1780`) | `PUT /api/studio-config/quote-categories`; `POST …/quote-categories/subcategory`; `POST /api/studio-config/price-book` | the quote renderer and editor (QE D-14) |
| Q&P · **Document Templates** (`ACC:96, 1374-1376`) | `studio_document_templates` + the `studio_companies` picker (templates D-01) | `/api/document-templates/{records,records/[id],set-default,default,timeline}` | quote PDF, signing, invoices (templates D-01) |
| Q&P · **Signing Documents** (`ACC:97, 1379`) | `studio_signing_documents` + bucket `signing-documents` (templates D-12) | `/api/signing-documents` (GET · POST · PATCH · DELETE), `…/upload` | request-signature (contracts D-05) |
| Q&P · **Packages** (`ACC:98, 1382`) | `studio_assemblies` (templates D-05) | `/api/quotes/assemblies` (+ `/api/quotes/templates/*`) | the digitizer |
| Q&P · **Quote Rules** (`ACC:99, 1388`) | `quote_generation_rules` (templates D-03) | `/api/quote-generation-rules/records*` | the digitizer's `evaluateRules` (`src/components/leads/quote-digitizer-dialog.tsx:1402, 4072`) |
| Q&P · **Price Book** (`ACC:100, 1144-1146`) | `studio_price_book` + tiers · history · suggestions · `vendors` · `platform_market_rates` (QE D-09…D-13, D-25) | `/api/studio-config/price-book*`, `/api/studio-config/pricing-tiers`, `/api/price-book/*` | quotes (QE D-09) |
| Q&P · **Quote Approval Rules** (`ACC:104, 1154-1265`) | `studios.settings.quote_approval` (D-27) | `PATCH /api/identity/studio-settings` | **only the form itself** (QE D-07) |
| Q&P · **Quote Sharing** (`ACC:105, 1452-1606`) | `studios.settings.quoteSharingMethod` · `quoteLinkExpiryDays` · `quoteShare_*` (D-27) | the same PATCH | **nothing — not even the screen** (D-27) |
| Settings · Your Profile | `profiles` (+ the avatar in bucket `studio-assets`, `SET:228-238`) | `PATCH /api/identity/profile` | every name and phone shown for a member |
| Settings · Lead Preferences (shown to `id` members, `SET:36, 65-68`) | `studio_members.accepting_leads` · `lead_preferences` | `PATCH /api/identity/members` | the AI recommendation |
| Settings · Studio Region | `studios.country_code` (read-only on screen, `SET:438-455`) | — | the region config (currency, phone, tax) |
| Settings · My Signature | `member_signatures` (D-17) | `/api/member-signatures/records*` | the quote's frozen signature (QE D-19) |
| Settings · Ads & Promotions · ID Buddy AI | `studios.settings.ads_enabled` · `id_buddy_enabled` (D-20) | the settings PATCH (`SET:494, 516`) | **nothing** |
| Settings · Home Screen · Appearance · Theme Skins · Guided Tours | browser storage (D-19) | — | — |
| Settings · Notifications → `/settings/notifications` | `notification_preferences` · `customer_notification_preferences` · `notification_templates` (D-15) | `PUT /api/notifications/preferences`; `PUT` / `DELETE /api/notifications/templates/[eventType]` | the dispatcher (`src/lib/notifications/preferences.ts`, cache cleared at `preferences/route.ts:104, 156`) |
| Settings · Email Lead Sources | `email_connections` · `email_sync_log` (D-16) | `/api/email/{connect,callback,disconnect,status,sync}` | the `poll-emails` cron (leads D §1.2) |

### D-02 · `studios` — the studio row

`003:3-15`, then `013:40`, `073:5-8`, `090:120-123`, `093:10`, `095a:28-37`, `sb:20260503000017:4`. Own-row RLS (`226:72-81`).

| # | Column | Type | Null / default | Written by (this slice) | Read by | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | PK | — | every route (`session.studioId`) | |
| 2 | `name` | text | NOT NULL | `/api/studio-setup`; admin | everywhere | the default entity's name at the backfill (`127:40`) |
| 3 | `owner_id` | uuid | NOT NULL → `profiles` | admin / provisioning | admin screens | nothing in the three groups reads it; the owner **role** is a tag (D-03) |
| 4 | `plan_id` | text | → `plans` | Platform | billing | |
| 5 | `status` | `studio_status` | NOT NULL `'active'` (`active · suspended · inactive`, `001:24`) | Platform | | |
| 6 | `verification_status` | enum | NOT NULL `'not_submitted'` (`001:28`) | the Verify flow | | |
| 7 | `chat_identity_name` · `chat_identity_avatar_url` | text | null | `SS:72-74` (Chat Identity — Branding, later) | the chat widget | |
| 8 | `lead_sources` | text[] | `['qanvast','instagram','referral','walk_in','facebook','organic']` (`003:12`) | **no writer** (grep) | `SS:32` → `TR:1480` `leadSources`, which no screen reads | **dead** — superseded by D-11 (leads D §1.1) |
| 9 | `created_at` · `updated_at` | timestamptz | NOT NULL `now()` | | | no trigger in this slice |
| 10 | `settings` | jsonb | `'{}'` (`013:40`) | `SS:95-110` (merge) and the per-key routes (D-20) | everywhere | D-20 |
| 11 | `country_code` · `currency_code` · `timezone` · `locale` | text | NOT NULL `'SG'` · `'SGD'` · `'Asia/Singapore'` · `'en-SG'` (`073:5-8`) | `SS:111-114` — any member (D-35) | region config, prices, phones | the screen says "Contact support to change your region" (`SET:445`) |
| 12 | `supported_countries` | text[] | NOT NULL, filled with `[country_code]` (`095a:28-37`) | admin | multi-country (Platform) | |
| 13 | `setup_completed_at` | timestamptz | null; every studio existing at `090` stamped (`090:120-123`) | `/api/studio-setup` | the layout sends an owner without it to `/studio-setup` (`src/app/(main)/layout.tsx:138-141`) | |
| 14 | `logo_url` | text | null (`093:10`, production set only) | — | — | a tenant-onboarding column; branding lives in `settings.branding` |
| 15 | `portal_slug` | text | null (`sb:20260503000017:4`) | `SS:115-119` | the homeowner portal (later) | lower-case `[a-z0-9-]`, ≤ 32 |

### D-03 · `studio_members` — membership, role tags and lead-routing preferences

`003:17-28` → `016:5-24` → `078:26-28` → `090:52` → `093:11` → `114:17-21` → `129:23-27` → `sb:20260402000001:2-12` → `296:18-40`. Direct-scope RLS (`226:42`). Nine foreign keys point here with NO ACTION, so a row is never deleted — removal is `is_active = false` (`MEM:129-163`).

| # | Column | Type | Null / default | Written by | Read by | Notes |
|---|---|---|---|---|---|---|
| 1 | `id` | uuid | PK | provisioning (OpenMaison staff, D-06) | `lead_assignees.member_id`, `project_assignees`, commissions … point here, **not** at `profiles` | |
| 2 | `studio_id` | uuid | NOT NULL → `studios` CASCADE | | RLS | UNIQUE `(studio_id, user_id)` |
| 3 | `user_id` | uuid | NOT NULL → `profiles` CASCADE | | the role lookups (`src/lib/api-role-guard.ts:13-26`; `role-permissions/route.ts:25-30`) | a person in two studios has two rows |
| 4 | `role` | `member_role` | NOT NULL `'interior_designer'` (`owner · interior_designer · support_staff`) | seeds | the agent executor (`src/lib/agents/executors.ts:1332`) | legacy; `016` backfilled `tags` from it (`016:12-14`) |
| 5 | `specialty` | text | null | admin routes | the recommendation card, the drawers, the agents | |
| 6 | `close_rate` · `projects_last_12_months` · `active_projects_count` | numeric(5,2) · int NOT NULL 0 · int NOT NULL 0 | | **no writer in `src/`** (grep) | `TR` (`transformStudioMember`, `:676`), the agents (`executors.ts:1332-1355`), the recommendation | seed-only numbers |
| 7 | `is_active` | boolean | NOT NULL `true` | `DELETE` → false (`MEM:157-163`) | `GET /api/identity/members` (`MEM:48`); login (`src/app/api/auth/verify/route.ts:53`) | nothing reactivates a member (grep) |
| 8 | `joined_at` | timestamptz | NOT NULL `now()` | | Team | |
| 9 | `tags` | text[] | NOT NULL `'{}'`; GIN; CHECK `valid_tags` ⊂ `owner · admin · id · accounting · manager` (`296:35-40`) | `PATCH` (`MEM:84`) — **no role check** (D-35) | every access decision (`AC:15-58`) | the real role; several at once (the seeded owner is `{owner,admin,id}`, `016:12`) |
| 10 | `role_id` | uuid | → `studio_roles` SET NULL (`090:52`) | backfilled once (`090:306-321`) | **nothing** (grep) | **dead** — a role row is found by tag, not by this column (D-05) |
| 11 | `title` | text | null (`093:11`) | `PATCH` (`MEM:85`); the Team screen offers it to owners only (`TS:488-491`) | Team | production set only |
| 12 | `invitation_status` · `invited_at` · `invited_by` | text `'active'` · timestamptz · uuid | (`078:26-28`) | the invitation accept flow | Team (`invitationStatus`) | Platform |
| 13 | `accepting_leads` | boolean | NOT NULL `true`; index `(studio_id, accepting_leads) WHERE is_active` | `PATCH` (`MEM:86`) — from Team and from Settings › Lead Preferences | the recommendation (`lead-detail-drawer.tsx:253`), the new-lead drawer, the topbar | |
| 14 | `lead_preferences` | jsonb | null | `PATCH` (`MEM:87`) — shape not validated | the recommendation (`lead-detail-drawer.tsx:153, 220`) | D-25 |
| 15 | `permission_overrides` · `workflow_overrides` | jsonb | null (`114:17-21`) | `PATCH /api/studio-config/member-overrides` (owner or admin, `member-overrides/route.ts:27-30, 39-52`) | the quote transition, progress updates, `resolve-recipients.ts`, the drawer | D-22 |

### D-04 · `profiles` — the person

`002:4-12`: `id uuid PK → auth.users CASCADE` · `full_name text NOT NULL` · `email text UNIQUE NOT NULL` · `phone text` (E.164 — `normalizePhoneToE164`) · `avatar_url text` · `created_at` · `updated_at`. RLS `228:39-58`: the scoped role may only SELECT co-members; writes go through `PATCH /api/identity/profile` with the service role, and only ever to `session.userId` (`src/app/api/identity/profile/route.ts:12-20, 40, 79-…`), after cross-studio uniqueness checks on email and phone (`:46-70`). The phone is normalised with the region the request names, else **SG** — and the Settings page sends none (`:41`; `SET:240-245`), so a Malaysian member's number is parsed as Singaporean. One profile can belong to several studios (D-03 #3).

### D-05 · `studio_roles` — the permission matrix nobody is assigned to

`090:38-49`: `id uuid PK` · `studio_id NOT NULL → studios CASCADE` · `name text NOT NULL` · `slug text NOT NULL` · `color text` · `is_system boolean DEFAULT false` · `is_assignable boolean DEFAULT true` · `permissions jsonb NOT NULL` (D-21) · `created_at` · UNIQUE `(studio_id, slug)`. RLS `226:56`. `docs/rules/database-auth.md:88` describes it.

**Five sources, five shapes** — which one a studio carries depends on when and how it was created:

| Source | Rows | What is in `permissions` |
|---|---|---|
| `090:224-324` (every studio existing then) | Owner `#F19E2B` (not assignable) · Admin `#5500FF` (not assignable) · Interior Designer · Accounting (not assignable) | Admin's `pages` lack `accounts`; no `view_all`, `submit_for_review`, `pricebook`, `expense`, `payment_schedule`, `project_override` keys |
| `109:7-133` (studios still without rows; `ON CONFLICT DO NOTHING`, so a `090` studio keeps `090`'s) | Studio Owner · Admin · Interior Designer · Accounting — all assignable | the full key set; Admin `quotes.approve: true`, `settings.editFunnel: true`, `team.*: false` |
| `116`, `125` (backfills) | — | set a missing key only; `jsonb_set(…, create_missing = true)` cannot create `actions.payment_schedule.override` under a missing `payment_schedule` object, so the `090` rows keep lacking four entity objects — `125` only raises a WARNING (`125:21-26, 76-94`; §Uncertain) |
| the studio-setup wizard (new studios) | the four, `isSystem: true` | `pages: {}`, `actions: {}` — every switch reads off (`src/app/studio-setup/page.tsx:306-331`) |
| the Roles screen's auto-seed (first open with zero rows) | the four, full matrices | `is_system` **false** — the hook never sends it (`RE:246-283`; `SC:129-132`), so these "system" rows are deletable |

**How a role applies.** A member's tags are mapped to **one system slug** by `TAG_PRIORITY = owner > admin > accounting > id` (`role-permissions/route.ts:16, 35-45`), copied six times (`leads/mutations/[id]/archive/route.ts:28`, `…/unarchive/route.ts:20`, `role-permissions/route.ts:16`, `studio-config/price-book/route.ts:26`, `…/price-book/[id]/route.ts:20`, `src/lib/accounting/permission-gate.ts:10`). Consequences:

1. **A custom role applies to nobody.** Tags are limited to five values by CHECK and `role_id` is never read, so a role created on this screen is never selected — the screen's own Manager card says so for the one case it guards (`RE:189-216`); `manager` itself is not in the priority list.
2. **`permissions.pages` is display-only.** The route guard calls `canAccessPage(tags, pathname)` with no role permissions (`src/app/(main)/layout.tsx:143`; `AC:134-170`); the pages map is read only to print a member's access in Team (`TS:671-673`).
3. **`dataScope` is display-only** (`src/lib/settings/role-display-config.ts:67-78`; no other reader, grep).
4. **Server-side, the matrix is consulted by four families of routes:** `leads.delete` (archive / unarchive), `pricebook.edit` (price-book POST / PATCH), `vendors.*` (`src/app/api/vendors/records*`) and the accounting-integration routes (`src/app/api/finance/accounting/*`) — the last two through `memberCanPerform` (`src/lib/accounting/permission-gate.ts:73-81`). `team.*` and `settings.editStudio · editFunnel · editNotifications` are checked by no route. A missing key falls back to the tag rules (`AC:249-312`).

### D-06 · `studio_invitations` · `studio_member_requests` — adding people

**`studio_invitations`** (`080:4-24`): `id` · `studio_id NOT NULL → studios` (no ON DELETE) · `invited_by NOT NULL → profiles` · `phone NOT NULL` · `email` · `full_name NOT NULL` · `tags text[] '{id}'` · `token UNIQUE NOT NULL` · `status 'pending'` (`pending · accepted · expired · cancelled`, `src/types/app.ts:2650-2666`) · `hangout_event_id → hangout_events` · `profile_id → profiles` · `member_id → studio_members` · `accepted_at` · `expires_at now() + 30 days` · `created_at`; four indexes. RLS `226:54`. Team lists the pending ones (`GET /api/invitations/records`, session only, `records/route.ts:39-…`); owners and admins resend or cancel (`src/app/api/invitations/[token]/route.ts:89-101, 235-247`). The fork flow no longer creates any.

**`studio_member_requests`** (`205:8-24`): `id` · `studio_id NOT NULL CASCADE` · `full_name NOT NULL` · `phone NOT NULL` · `email` · `tags text[] NOT NULL '{id}'` · `requested_by uuid` (no FK) · `requested_by_name` · `status NOT NULL 'pending'` (`pending · handled · dismissed`) · `created_at` · `handled_at`; index `(studio_id, status)`; `GRANT ALL … TO anon, authenticated` (`205:27`), `anon` revoked again by `226:55`. **Invite Member does not add a member:** `POST /api/studio/members/request-add` (owner or admin, `request-add/route.ts:70-83`) inserts a request and e-mails four fixed OpenMaison addresses (`:22-27`), whose staff provision the member by hand (`:1-8`). `GET /api/studio/member-requests` marks a request `handled` once a member of the studio has that phone (`member-requests/route.ts:59-87`); `PATCH` dismisses one (`:96-118`). Provisioning is Platform.

### D-07 · `studio_companies` — the legal entities

Columns, indexes and JSON: templates D-13 (`126:27-67`; `+ tax_rate NUMERIC(5,4)`, `130:23-27`; the default-entity backfill `127:25-53` copies `settings.branding` and `settings.bank_details`). RLS `226:53`. Invariant: at most one `is_default` row per studio (partial unique `idx_studio_companies_one_default`, `126:47-50`) — "exactly one" in the comment (`126:19-20`), but nothing in the schema forbids zero. What this slice adds:

1. **Editing the default entity demotes it.** `POST /api/studio-companies/records` writes every column, filling each one the body omits with its default — `is_default: false`, `is_active: true`, `numbering: {}`, `bank_details: {}`, `branding: {}` (`src/app/api/studio-companies/records/route.ts:79-104`) — and the Legal Entities form sends neither `isDefault`, `isActive` nor `numbering` (`src/app/(main)/accounts/legal-entities-tab.tsx:200-213`). Saving an edit to the default entity therefore leaves the studio with **no** default row (readers then take the first active row, `selectDefaultEntity`, `src/lib/quote-canva/resolve-entity-paynow-qr.ts:107-114`), re-activates an inactive row — Edit is offered on inactive rows too (`legal-entities-tab.tsx:346-353`) and is the only way back — and wipes `numbering`. Read from the code, not executed (§Uncertain).
2. **`numbering` is write-dead.** This POST is its only writer (grep), and the form never sends it, so every UI save stores `{}`; its readers (`src/lib/numbering.ts:12`; `src/app/api/finance/generate-invoices/route.ts:123-133`; `src/app/api/studio-config/numbering/route.ts:37`) fall through to `studios.settings.numbering`.
3. **Set default is two statements, not one transaction** (clear every default, then set one: `…/records/[id]/route.ts:29-55`); **deactivate** refuses the default row (`:57-85`) — a soft delete, no restore route.
4. **Tax.** The form accepts 0–100 % and stores the fraction (`legal-entities-tab.tsx:190-198`); `null` inherits `settings.taxRate`, then the region (`130:10-16`).
5. **Branding and bank overrides are sparse** — empty strings are dropped so "inherit" and "blank" differ (`legal-entities-tab.tsx:135-160`; D-26).

### D-08 · Studio Health's stores (Platform telemetry)

`usage_events` (`236:4-13`: `studio_id`, `user_id`, `session_id`, `event_type`, `feature_key`, `properties jsonb`, `route`, `occurred_at`; own scoped policy `236:31-37`), `usage_daily_rollup` (`238:8-14`, PK `(studio_id, user_id, rollup_date)`, `metrics jsonb`; user `00000000-…` = the studio aggregate, `238:32`), `auth_sessions` (`237`), plus `studio_members` / `profiles` for names. Read by `GET /api/usage/studio-health` through the scoped client (`src/app/api/usage/studio-health/route.ts:7-…`); written by the usage tracker and the rollup cron, service role. The page is owner-only in the browser (`src/app/(main)/accounts/usage/page.tsx:14-20`; `ACC:80, 637`); the route checks the session only (D-35). No studio configuration here.

### D-09 · `lead_categories` — write-only

Columns: leads D §1.2 (`013:8-16`: `id`, `studio_id NOT NULL CASCADE`, `name NOT NULL`, `color NOT NULL '#0d9488'`, `order_index NOT NULL 0`, `is_active`, `created_at`; index on `studio_id`). RLS `226:47`. Saved whole by RPC `save_lead_categories` — delete every row of the studio, re-insert the list (`033:4-20`), so **ids change on every save**; the route passes only name, colour and position (`src/app/api/lead-config/categories/route.ts:51-81`). Read only by the same route's GET for this screen (grep: no other reader), and **no column anywhere references a category** (leads D §1.2). The screen's words promise more than the data does: "Minimum 3 categories required." (`ACC:694`) is not enforced by the save (`ACC:439-452`), and the delete confirm "This won't affect existing leads tagged with it." (`ACC:766`) describes a tag that cannot exist. The six-colour picker (`ACC:163`) differs from the DDL default. Seeded only for the Arthaus demo studio (`013:43-48`). Verdict: write-only.

### D-10 · `studio_lead_funnel` — the Classic funnel

`090:10-18`: `id` · `studio_id NOT NULL CASCADE`, UNIQUE · `config jsonb NOT NULL` (D-23) · `version int DEFAULT 1` · `created_at` · `updated_at`. RLS `226:54`. Seeded with the default funnel for every studio existing at `090` (`090:129-218`) and by the wizard for new ones (`src/app/studio-setup/page.tsx:371, 395, 408`). `PUT /api/studio-config/funnel` (`src/app/api/studio-config/funnel/route.ts:47-140`): shape validation (≥ 2 buckets, each with a label and ≥ 1 status, unique ids — `src/lib/leads/funnel-validation.ts:17-43`); a **409** when a removed bucket or status still holds leads (`funnel/route.ts:80-123`) — sub-statuses are not checked (`diffRemovedFunnelIds` returns buckets and statuses only, `funnel-validation.ts:49-59`); then an upsert of `config` and `updated_at` only (`funnel/route.ts:125-130`) — **`version` is never bumped** (dead). The per-status flags (`followUpRequired`, `requiresApprovedQuote`, `requiresContract`, `requiresProjectType`) and the bucket's `requiresAssignment` are the Classic mode's gates (leads D §1.1). Readers: the board, the drawer, `load-funnel-config.ts:36`, the close · engagement · TAT routes, the signing submit (grep).

### D-11 · `studio_taxonomies` (`type = 'lead_source'`) — Lead Sources

Columns: leads D §1.2 (`090:90-101`: `id`, `studio_id`, `type`, `name`, `is_active`, `order_index`, `metadata jsonb`; UNIQUE `(studio_id, type, name)`). RLS `223:35-58`. Seeds: nine names for every studio at `090` (`090:346-353`), the same for studios created later (`256:17-25` — studios created after `090` had none), and *Google Ads* · *Meta Ads* at order 100 · 101 (`274:40-44`). `PUT /api/studio-config/taxonomies` deactivates **every** row of the type, then upserts each listed name in a loop (`src/app/api/studio-config/taxonomies/route.ts:69-94`) — not one transaction, so a failure part-way leaves sources switched off. A rename is a new row plus the old one inactive; leads keep the old word, because `leads.source` is free text (leads D §1.1). `metadata` is rewritten to NULL (the page passes none, `ACC:1788`; route `:88`). The public webhook stamps a lead's `source` with the endpoint's free-text label (`src/app/api/webhooks/leads/[token]/route.ts:113, 124, 209, 292`), which need not be a listed source.

### D-12 · `lead_custom_fields` · `lead_custom_field_values` — Custom Fields

Columns: leads D §1.2 (`013:23-35`: `label NOT NULL`, `field_type NOT NULL 'text'`, `options text[]`, `is_required false`, `order_index`, `is_active`, `created_at`; `090:24-32`: values `lead_id → leads CASCADE`, `field_id → lead_custom_fields CASCADE`, `value jsonb`, UNIQUE `(lead_id, field_id)`). RLS fields `226:47`; values through `leads` (`226:118`).

1. **Every Save deletes every captured value.** `PUT /api/lead-config/custom-fields` (`src/app/api/lead-config/custom-fields/route.ts:50-89`) calls `save_lead_custom_fields`, which deletes all of the studio's field rows and re-inserts the list with new ids (`033:23-44`); `field_id … ON DELETE CASCADE` (`090:27`) then removes every value on every lead. A rename, a reorder or a new field wipes the studio's data — while the delete confirm says "This will not erase data already captured on existing leads." (`ACC:1054`). Read from the RPC and the DDL, not executed (§Uncertain); production values can only survive for fields added after the last save.
2. **Types.** The screen offers Text · Number · Date · Dropdown · Multi-select · File Upload (`ACC:1079-1089`; ≥ 2 options for the two lists, `ACC:1121-1124`); the drawer renders all but **File Upload**, which never shows (`lead-detail-drawer.tsx:1667-1745`). A number is stored as the typed string (`:1683`); a multi-select as `string[]` (`:1656`).
3. **Required is a star.** `is_required` prints an asterisk (`:1665`); nothing enforces it — the values `PUT` upserts whatever arrives (`src/app/api/studio-config/custom-field-values/route.ts:47-74`), and it checks neither the lead's assignment nor the field's type.

### D-13 · `lead_webhook_endpoints` · `lead_webhook_log` — Lead Webhooks

Columns: leads D §1.2 (`133:8-39`; `platform NOT NULL 'generic'` CHECK `generic · google_ads · meta`, `274:11-19`); `token` is both UNIQUE and in a partial unique index on active rows (`133:11, 27`); counters bumped by `increment_lead_webhook_counters` (`133:42-55`). Server-only lock (`210:27`; the log through its parent, `230:31`). Management routes use the **service role** and filter on `session.studioId` (`src/app/api/webhooks/leads/endpoints/route.ts:12-42` list active, `:44-88` create; `…/[endpointId]/route.ts:8-35` revoke = `is_active false`; `…/regenerate/route.ts:14-46` rotates the token only; `…/logs/route.ts:11-49` the last 50). A Google Ads endpoint gets a signing key that is returned **once**, by the create (`endpoints/route.ts:61-62, 83`), and never rotated. The public receiver looks the token up among active rows (`[token]/route.ts:51-56`), verifies the HMAC or the Google key (`:74-76, 107-113`), rate-limits, dedupes, creates the lead and logs every outcome with the first 2,000 characters of the body, secrets redacted (`:28, 309-339`). The file header says "owner-only" (`endpoints/route.ts:2-3`); the code checks the studio only (D-35).

### D-14 · The Quotes & Pricing tables — cited, with what this slice adds

| Screen | Table(s) · owner slice | What this slice adds |
|---|---|---|
| Quote Categories | `studio_quote_categories` (templates D-18, QE D-14) | `PUT` deactivates every row, then upserts each name in a loop (`src/app/api/studio-config/quote-categories/route.ts:55-93`): a rename is a new row, and `studio_price_book.category_id` stays on the inactive old one (nothing re-points it, grep). The tab's **CSV import multiplies prices by 100** (`ACC:1773`) into the **dollars** column `unit_price` (`src/app/api/studio-config/price-book/route.ts:196`) — S$12.50 lands as S$1,250 (the quote-editor audit's finding 10, `../05-…:406`). |
| Document Templates | `studio_document_templates` (templates D-01) | the routes check the session only (D-33). |
| Signing Documents | `studio_signing_documents` + bucket `signing-documents` (templates D-12, contracts D-05) | `DELETE` is a soft delete (`src/app/api/signing-documents/route.ts:90-113`); session only. |
| Packages | `studio_assemblies` (templates D-05) | `GET` unions the studio's rows with the platform's `is_system` rows (`src/app/api/quotes/assemblies/route.ts:78`); writes force `is_system false` (`:148, 174`). |
| Quote Rules | `quote_generation_rules` (templates D-03) | read by the digitizer (`evaluateRules`, `quote-digitizer-dialog.tsx:4072`); `DELETE` is a soft delete (`…/records/[id]/route.ts:54-79`). |
| Price Book | `studio_price_book`, `price_book_pricing_tiers`, `price_book_history`, `price_book_suggestions`, `vendors` (QE D-09…D-13); `platform_market_rates` (QE D-25) | the edit gate covers two routes of seven (D-33); a dedicated price-book audit follows this one (map 06:35). |

### D-15 · `notification_preferences` · `customer_notification_preferences` · `notification_templates`

`sb:20260314000001:36-48`: `notification_preferences` — `studio_id NOT NULL CASCADE` · `category text NOT NULL` (the comment lists nine; `pricing` added by `112_seed_pricing_preferences.sql`) · `channel` CHECK `email · in_app · sms · whatsapp` · `enabled true` · `digest_mode false` · `recipient_roles text[] '{owner}'` · timestamps · UNIQUE `(studio_id, category, channel)`. `:52-62`: `customer_notification_preferences` — `event_type` (informational events only: `quote.signed_by_client`, `invoice.payment_received`, `hangout.meeting_assigned`) · `enabled`. `:66-…`: `notification_templates` — `studio_id` (NULL = the platform's base) · `event_type` · `channel 'email'` · `subject` · `body_html` · `body_text` · `variables jsonb` · `is_active` (leads D §1.2). Server-only (`210:24-26`). `GET /api/notifications/preferences` answers any session (`preferences/route.ts:15-57`); `PUT` is **owner-only** (`:70-81`) and accepts channels `email · in_app · whatsapp` — `sms` passes the CHECK but not the route (`:12`) — and recipient roles `owner · admin · id · accounting` — no `manager` (`:13`); categories come from `ALL_CATEGORIES`, ten (`src/lib/notifications/events.ts:775-786`). Template overrides `PUT` / `DELETE` are owner-only (`templates/[eventType]/route.ts:36-43`); the page sends non-owners back to `/settings` in the browser (`src/app/(main)/settings/notifications/page.tsx:14-21`). The owner test reads `tags` without `is_active` (`preferences/route.ts:72-81`).

### D-16 · `email_connections` · `email_sync_log` — Settings › Email Lead Sources

Columns: leads D §1.2 (`050` → `095a`: encrypted OAuth tokens, `sender_domains` with six platform defaults, `custom_domains`, `last_sync_*`, `status`; the sync log's counts). Server-only (`210:22`; the log `230:30`). Routes check the session and the studio only — any member can connect, re-domain or disconnect the studio's inbox (`src/app/api/email/connect/route.ts:8-…`, `disconnect/route.ts:9-…`, `status/route.ts:7, 55`, `sync/route.ts:6`). Map 02:28 already ports it as `settings.lead_capture.email`.

### D-17 · `member_signatures` — Settings › My Signature

Columns and the frozen copy: contracts D-06 and QE D-19 (`267_member_signatures.sql:4-34`, own `scoped` policy). The routes are the caller's own: every read and write filters `member_user_id = session.userId`, and an upload path must start with `{studioId}/{userId}/` (`src/app/api/member-signatures/records/route.ts:30-40, 61-96`). Team shows a roster (`GET /api/member-signatures/roster`).

### D-18 · Platform stores the screens consult

- **Page visibility.** `platform_config.page_visibility` (global) merged with `studios.settings.page_visibility` (per studio) by `GET /api/config/pages` (`src/app/api/config/pages/route.ts:11-41`); `isPageEnabled` hides the HomeOwner Portal group (`ACC:221-222, 634`) and turns a page into "Coming Soon". Written by the admin (`src/app/api/admin/studios/[id]/page-visibility/route.ts:52-78`) — and by any member through the settings PATCH (D-35).
- **`platform_settings`** — the admin's global settings, including a platform key `lead_sources` (`src/app/admin/settings/page.tsx:83, 340`) that is not the studio's list. `platform_config` and `platform_settings` are service-role only (`264:44-79`).
- **`platform_market_rates`** — read by the Price Book (QE D-25).

### D-19 · Browser state, and the other Accounts groups (later modules)

**Browser.** `?tab=` (`ACC:246-249`); `localStorage` `qanvast-home-mode` (`SET:74-80`), the theme key (`src/context/theme-context.tsx:38, 55`), the coach marks (`resetAllCoachMarks`). A browser's convenience; not ported.

**Later modules — listed once so nothing is silently dropped:** Workflow (`settings.workflow`, the other `settings.features.*` flags, `settings.proactive_alerts`, `settings.ai_assignment_prompt`) · Projects (`studio_taxonomies` `project_type` · `escalation_category`, `studio_timeline_templates`, `pipeline_stages` (dead in 1.0, leads D §1.2), `studio_material_catalog`, `studio_materials`, `studio_document_templates` type `timeline`) · Finance (`studio_milestone_templates`, `milestone_templates`, `payment_schedule_templates`, `expense_categories`, `commission_rules` + entries + change requests, `studio_sequences`, `accounting_connections` · `accounting_mappings` · `accounting_sync_queue` · `accounting_remote_links` (`279`), `settings.po_settings · numbering · payment_details · payment_approval · invoice_approval · bank_details · defaultPaymentSchedule`) · Branding & Comms (`settings.branding`, `studio_assets`, `platform_accreditation_badges` + `settings.enabledAccreditationIds`, `settings.chat_identity` + `studios.chat_identity_*`, `settings.review_request_link`) · HomeOwner Portal (`settings.portal`, `studios.portal_slug`, `studio_portal_pages`, `studio_scope_questions`) · AI & Copilot (`settings.copilot`, `studio_objection_responses`, `studio_checklist_items`, `studio_competitor_list`).

---

## 2. 1.0 — JSON shapes

### D-20 · `studios.settings` — the keys this slice touches

Typed as `DbStudioSettings` (`src/types/database.ts:815-923`) and `StudioSettings` (`src/types/app.ts:600-747`), but the screens read it through `transformStudioSettings` (`TR:1473-1597`), a **whitelist** — a key it does not carry never reaches a screen through `useStudioSettings`. Top-level keys mix snake_case (`quote_approval`, `features`, `ads_enabled`) and camelCase (`quoteSharingMethod`, `quoteShare_*`); `workflow`, `portal` and `journey` are stored camelCase inside.

| Key | Shape | Written by | Read by | Verdict |
|---|---|---|---|---|
| `quote_approval` | `{auto_approve_below: number, require_approval_above: number, approver_role: string, notify_on_rejection: boolean, rejection_reasons: string[]}` — dollars; `approver_role` is a role **name** (`ACC:1185-1187`) | `ACC:489-515` (checks ≥ 0 and below ≤ above, `ACC:490-497`) | the form only (`TR:1484-1490` → `ACC:402-409`) | **write-only** (QE D-07) |
| `quoteSharingMethod` | the screen writes `both · standalone · portal`; the type says `"link" \| "pdf" \| "both"` (`src/types/app.ts:625`) | `ACC:1493` | **nothing** — not carried by `TR`, so the screen reads `undefined` and always shows *Both* (`ACC:1484`) | write-only |
| `quoteLinkExpiryDays` | `7 · 14 · 30 · 60 · 90` | `ACC:1539` | nothing (the screen always shows 30, `ACC:1531`); signing links stay at 7 days (QE D-21) | write-only |
| `quoteShare_showOptionalToggles` · `quoteShare_showPaymentSchedule` · `quoteShare_showVariations` · `quoteShare_showPoweredBy` | boolean, absent = on | `ACC:1587` | nothing — the switch reads the transformed settings, which never carry them, so every switch always shows **on** and every press writes `false` (`ACC:1575, 1587`) | write-only; cannot be switched back on from the screen |
| `features` | D-24 | `PUT /api/studio-config/features` (merge, `features/route.ts:121-143`); **also** any settings PATCH, which replaces the whole object (`SS:108-109`) | leads, quotes, projects (D-24) | live |
| `journey` | `StudioJourneyConfig` (D-24) | `PUT /api/studio-config/journey` (`journey/route.ts:36-66`) | `resolveJourneySteps` · `resolveInactivationReasons` (`src/lib/leads/journey.ts:442-455`) | live (Journey mode) |
| `workflow` | `WorkflowToggles` (D-22) | `PUT /api/studio-config/workflow` (Workflow group) | the quote transition and the other approval flows (QE D-07; `AC:441-605`) | live — the store the approval rule really uses |
| `ads_enabled` · `id_buddy_enabled` | boolean | `SET:494, 516` | nothing — the page reads `adsEnabled` · `idBuddyEnabled` from the transformed settings, which carry neither, so both switches always load **on** (`SET:137-143`) | write-only; the screen cannot show them |
| `page_visibility` | `Record<page key, boolean>` | the admin (D-18) | `GET /api/config/pages` | Platform |
| `is_demo` | boolean | the operator (`240:5-13`) | analytics | Platform |
| `catalogue_files` | `{name, items, uploaded_at}[]` | no writer (grep) | `TR:1496` → `ACC:607`, an unused variable | dead |
| `taxRate` | number | none in this slice | the entity tax chain (`130:10-16`), quote and invoice paths | Finance, later |

**How the bag is written.** Every writer reads the object, merges, and writes it back — `SS:95-110` (a shallow merge of the slice), `features/route.ts:121-143`, `journey/route.ts:45-56`, the workflow route — with no transaction and no version, so two saves racing lose one of them. The comments at `SS:75-94` record the earlier replace-mode that erased a studio's `branding`.

### D-21 · `RolePermissions` (`src/types/app.ts:3821-3845`)

`{pages: Record<route, boolean>, dataScope: 'all' | 'assigned' | 'team', actions: {leads {create, edit, delete, assign, view_all?}, quotes {create, edit, approve, send, submit_for_review?}, projects {create, edit, delete}, project_override? {override_lock}, tasks {create, edit, approve}, finance {viewInvoices, createInvoices, recordPayments, managePOs, manageExpenses, approveExpenses, viewReports}, expense? {create, approve}, pricebook? {view, edit}, vendors? {view, create, edit, merge}, payment_schedule? {override}, team {invite, editRoles, remove, manage?}, settings {editStudio, editFunnel, editNotifications}}}`. The editor's catalogue: `RE:20-146`; its default for a new role: `RE:148-179`. **Enforced on a server:** `leads.delete`, `pricebook.edit`, `vendors.*`, the accounting-integration actions (D-05 note 4). **Enforced only in a browser:** `leads.create`, `projects.edit`, `project_override`, `payment_schedule.override`, `quotes.submit_for_review` · `approve` in the digitizer, `expense.approve` (`resolveCanPerformAction(` callers). **Never enforced:** `pages`, `dataScope`, `team.*`, `settings.*`.

### D-22 · `WorkflowToggles` and the member overrides

`src/types/app.ts:4091-4116`: eleven booleans (`quoteApprovalRequired`, `contractRequired`, `projectTypeRequired`, `timelineApprovalRequired`, `progressReviewRequired`, `milestoneApprovalRequired`, `poAccountsReviewRequired`, `expenseApprovalRequired`, `commissionApprovalRequired`, `autoCreateFollowUps`, `requireAssignment`), all `true` by default (`SC:68-82`; seeded by `090:381-397`), plus `approvers?: Record<workflow, profile id[]>` — keys `quoteApproval`, `expenseApproval`, `poAccountsReview`, `progressUpdate`, `milestoneApproval`, `timelineApproval`, `commissionApproval`, `refundApproval`, `changeOrderApproval`; an empty list means every owner. A member's `workflow_overrides` (`Partial<WorkflowToggles>`) is merged over the studio's, `approvers` per key (`resolveEffectiveWorkflow`, `SC:776-794`) — so one designer can skip quote approval (`quoteApprovalRequired: false`). `permission_overrides` is a `Partial<RolePermissions>` merged over the role's (`AC:366-390`). **This is the approval rule in force** (QE D-07); the Quote Approval Rules screen (D-27) is not.

### D-23 · `FunnelConfig` (`src/types/app.ts:3779-3807`)

`{buckets: [{id, label, color, order, requiresAssignment, statuses: [{id, label, order, followUpRequired, requiresApprovedQuote, requiresContract, requiresProjectType, subStatuses: [{id, label, order}]}]}]}`. The default funnel (four buckets, twelve statuses, their sub-statuses) is tabulated in leads D §1.1 from `090:129-218`. Ids are code: `PROJECT_STARTED`, `SIGNED`, `QUOTE_CREATED`, `CONTACTED`, `UNASSIGNED`, `FOLLOW_UP`, `FIRST_CONTACT` are referenced literally (leads D §1.1), so a studio that deletes them breaks those paths — the 409 guard only protects ids that currently hold leads (D-10).

### D-24 · `features` and `journey` — Lead Experience

**`features`** (the route's type and defaults, `src/app/api/studio-config/features/route.ts:15-54`; stored snake_case): `lock_quote_actions_until_approved` (off) · `lock_project_on_handover` (off) · `casetrust_signing_step` (off) · `lead_journey_mode` (**absent = on**) · `canva_editor` (absent = on) · `duplicate_detection_enabled` (absent = on) · `lead_manager_hierarchy` (off) · `fee_first_milestones` (off) · `price_book_subcategory_in_quote` (absent = on). Lead Experience writes two of them (`src/app/(main)/accounts/lead-experience-tab.tsx:36, 104`).

**The default is shown wrong.** The *Classic* card carries the badge "Default" (`lead-experience-tab.tsx:59`), while an absent key means Journey everywhere that decides (`features/route.ts:48, 75`; `SC:676`; `TR:1575`) — and the leads page treats "not loaded yet" as Classic (`src/app/(main)/leads/page.tsx:162`).

**`journey`** — `{steps?: JourneyStep[], inactivationReasons?: InactivationReason[]}` (`src/lib/leads/journey.ts:50-54`). `JourneyStep = {id: assigned · outreach · site_visit · concept · floor_plan · quote · contract · signed, label, order, evidence: none · optional · required, backfillable?}` (`:13-38`), default spine `:62-74`. `InactivationReason = {code, label, requiresProof, fields: (competitor · competitor_why · their_budget · our_quote · restart_date · dimension · free_text)[], gateAfterAttempts?}` (`:240-262`), seven defaults (`:265-275`). The editor keeps the eight known step ids (reorder, rename, evidence, remove, re-add) and lets reasons be added (`src/app/(main)/accounts/journey-config-editor.tsx:17-19, 44-56`). Absent or empty → the defaults (`journey.ts:442-455`).

### D-25 · `studio_members.lead_preferences`

What the code writes: `{property_type?, budget?, design_style?, area?, scope?: {values: string[], priority: 'must_match' | 'nice_to_have'}}`, a dimension left out meaning "Don't Care" (`src/components/settings/lead-preference-editor.tsx:19-56, 137-141`; `src/lib/queries/studio.ts:339-362`). The migration's comment describes a different, never-written shape — weights `{property_type: 25, budget: 25, …}` (`sb:20260402000001:5-6`). Values come from the region config: SG property-type keys, budgets `20k-40k · 40k-60k · 60k-80k · 80k-100k · 100k+` (`src/lib/region-config.ts:177-183`), design styles, regions `North · North East · East · West · Central`, scope = the project types. The route stores whatever arrives (`MEM:87`).

### D-26 · `studio_companies` JSON

`branding` = `EntityBrandingOverride` (`logoUrl?, primaryColor?, tagline?, accreditations?, footerText?, contactPhone?, contactEmail?, website?, paynowQrUrl?`), `bank_details` = `EntityBankDetailsOverride` (`bankName?, accountHolder?, accountNumber?, swiftCode?, branch?, payeeNotes?`) — templates D-13. The form writes both sparse (`legal-entities-tab.tsx:135-160`) and cannot set `accreditations` or `payeeNotes`. `numbering` is untyped; its readers look for `invoicePrefix · poPrefix · ticketPrefix · invoiceStartNumber` (`src/lib/numbering.ts:12-36`; `generate-invoices/route.ts:123`) — always `{}` after a UI save (D-07).

### D-27 · Quote Approval Rules and Quote Sharing — the screens that act on nothing

- **Approval Rules** stores `quote_approval` (D-20). The form's fallback values are `50000 · 100000 · "Finance" · true · four reasons` (`ACC:322-328`), shown until a save; the approver dropdown lists the studio's assignable roles by **name** and falls back to four invented names (`ACC:1178-1197`). No approval path reads the key (grep of `auto_approve_below`, `require_approval_above`, `approver_role`, `rejection_reasons`: only the type, the transformer and the page). The approval that runs is `workflow` + overrides + tasks (D-22; QE D-07). The owner already declined thresholds (QE Q-24).
- **Quote Sharing** stores six keys (D-20); none is read anywhere, the screen included, so each shows its default forever. The owner already declined porting it (templates Q-09).

### D-28 · The webhook log's payload

`payload_excerpt = {raw: <the first 2,000 characters of the request body, the Google key redacted>}` (`[token]/route.ts:28, 318-328`); `outcome ∈ lead_created · duplicate · invalid · unauthorized · rate_limited` (`133:33`; `src/types/app.ts:4146-4154`); `lead_id` set for created leads; `error_message` for failures. It holds the arriving homeowner's name, phone and e-mail as sent — personal data kept per endpoint with no retention job in this slice (grep).

### D-29 · What 1.0 derives instead of storing

| Derived | How | Where |
|---|---|---|
| A member's page access in Team | the role row's `pages`, else the tag table | `TS:657-680` |
| Role labels and data-scope words | `resolveRoleDisplayConfig`, `dataScopeLabel` | `src/lib/settings/role-display-config.ts:67-78` |
| "{n} leads and {n} projects still assigned" after a removal | leads, `lead_assignees`, projects, `project_assignees` | `MEM:187-213` |
| Leads per bucket in the funnel editor | the loaded leads, counted in the browser | `ACC:1447` |
| The webhook URL | `${host}/api/webhooks/leads/${token}` | `src/app/(main)/accounts/lead-webhooks-tab.tsx:112` |
| Studio Health's KPIs, team table and top pages | the rollup and the raw events | `usage/studio-health/route.ts:24-…` |
| The effective permissions and workflow of a member | role row ⊕ overrides, else the tags | `AC:317-390`; `SC:776-794` |

---

## 3. The routes behind each screen, and their checks

### D-30 · What a route can rely on

- **Session.** `requireSession` verifies the HMAC of the `qanvast_session` cookie and returns `{userId, studioId}` (`src/lib/api-auth.ts:23-33`); the proxy does the same for every page and `/api/*` (`src/proxy.ts:460-477`). The payload carries **no expiry** and nothing re-checks membership (`src/lib/session.ts:196-226`): the login filters `is_active` (`src/app/api/auth/verify/route.ts:53`) and sets the cookie for 1 day, or 30 with *remember* (`:126-136`), after which a removed member's existing cookie still passes every route.
- **Role.** Not in the session. A route that wants one reads `studio_members.tags` itself (`getCallerTags`, `src/lib/api-role-guard.ts:13-26` — no `is_active` filter) or resolves a role row through one of the six `TAG_PRIORITY` copies (D-05).
- **Studio.** The scoped client's RLS (§0) plus, in most routes, an explicit `.eq("studio_id", session.studioId)`; service-role routes rely on that filter alone.
- **Page access.** `ROUTE_ACCESS.accounts = owner · admin · id · accounting` and `settings = owner · admin · id` (`AC:123-128`), enforced in the browser by the layout (`src/app/(main)/layout.tsx:143`). Inside Accounts the only per-role filter hides Studio Health (`ACC:80, 637`); the comment that "most other tabs remain owner-only via in-page menu filtering" (`AC:123-125`) does not hold at this commit. **An Interior Designer or an Accountant opens every tab of the three groups.**

### D-31 · Studio group

| Route | Methods | Client | Role check | UI vs API |
|---|---|---|---|---|
| `/api/identity/members` | GET (`MEM:35-62`, active only) · **PATCH** (`MEM:64-116`: `tags`, `title`, `accepting_leads`, `lead_preferences`) · **DELETE** (`MEM:118-220`: deactivate) | scoped | **none** | The screen lets only owners edit tags, titles and remove members, never an owner or oneself, and refuses to add or drop `owner` (`TS:72, 178-194, 372, 488-491`). The API lets **any member** set any member's tags — `owner` included, on their own row — or deactivate the owner (D-35 #1). |
| `/api/identity/profile` | PATCH | service role | self only (`session.userId`) | — |
| `/api/studio-config/member-overrides` | PATCH | scoped | owner or admin (`member-overrides/route.ts:27-30`) | an admin may override anyone, owners and themselves included |
| `/api/studio-config/roles` | GET (any) · POST (`roles/route.ts:54-101`) | scoped | POST owner (`:64-67`) | POST upserts on `(studio_id, slug)` (`:89-91`): a new role whose slug is `owner` · `admin` · `id` · `accounting` replaces that row (a role named "ID" does); the editor refuses only `manager` (`RE:390`) |
| `/api/studio-config/roles/[id]` | PATCH · DELETE | scoped | owner (`[id]/route.ts:28-31, 73-76`) | PATCH has no `is_system` guard and writes `slug` too (`:38-50`) — the editor disables system roles (`RE:496-530`); DELETE spares `is_system` rows only (`:85`), and the auto-seeded ones are not marked (D-05) |
| `/api/studio-config/role-permissions` | GET | scoped | the caller's own | — |
| `/api/studio/members/request-add` | POST | service role | owner or admin (`request-add/route.ts:69-83`) | the member lookup has no studio filter and uses `.single()`, so a person in two studios gets "Studio not found" (`:69-78`); 10 per minute per IP (`:48-54`); the screen offers it to owners only (`TS:247`) |
| `/api/studio/member-requests` | GET · PATCH | scoped (+ service role for the phone match) | **none** | the screen shows requests to owners only (`TS:833`) |
| `/api/invitations/records` · `/api/invitations/[token]` | GET · PATCH · DELETE | scoped · service role | GET none; PATCH / DELETE owner or admin (`[token]/route.ts:89-101, 235-247`) | — |
| `/api/studio-companies/records` · `…/[id]` | GET · POST · PATCH | scoped | **none** | every member reaches Legal Entities (D-30); the POST overwrites omitted columns (D-07) |
| `/api/usage/studio-health` | GET | scoped | **none** | the page is owner-only in the browser (`accounts/usage/page.tsx:14-20`) |

### D-32 · Lead Management group

| Route | Methods | Client | Role check | Notes |
|---|---|---|---|---|
| `/api/studio-config/features` | GET · PUT (`features/route.ts:56-153`) | scoped | PUT: owner or admin **for `leadManagerHierarchy` only** (`:100-119`) | the same key is writable with no check through the settings PATCH (D-35 #2) |
| `/api/studio-config/journey` | GET · PUT (`journey/route.ts:15-66`) | scoped | none | replaces the whole `journey` object |
| `/api/studio-config/funnel` | GET · PUT (`funnel/route.ts:18-140`) | scoped | none — `settings.editFunnel` is never read | shape check; 409 on buckets / statuses in use (D-10) |
| `/api/lead-config/categories` | GET · PUT | scoped; the RPC runs with the caller's rights (`categories/route.ts:11-17`) | none | delete-and-insert (D-09) |
| `/api/studio-config/taxonomies` | GET · PUT (`taxonomies/route.ts:27-100`) | scoped | none | deactivate-all then upsert (D-11) |
| `/api/lead-config/custom-fields` | GET · PUT | scoped | none | the save wipes every value (D-12) |
| `/api/studio-config/custom-field-values` | GET · PUT (`custom-field-values/route.ts:22-74`) | scoped | none | no lead-scope check: a designer reads or writes any lead's values by id |
| `/api/webhooks/leads/endpoints` · `…/[endpointId]` · `…/regenerate` · `…/logs` | GET · POST · DELETE · POST · GET | **service role** | none — studio match only; the header says "owner-only" (`endpoints/route.ts:2-3`) | D-13 |
| `/api/webhooks/leads/[token]` | POST (public) | service role | token + HMAC / Google key | D-13 |

### D-33 · Quotes & Pricing group

| Route | Methods | Role check | Notes |
|---|---|---|---|
| `/api/studio-config/quote-categories` (+ `/subcategory`) | GET · PUT · POST | none | D-14 |
| `/api/studio-config/price-book` · `…/price-book/[id]` | POST · PATCH | `pricebook.edit` (`price-book/route.ts:156-166`; `[id]/route.ts:69-78`) | a designer's new item waits for approval (QE D-09) |
| `/api/price-book/[id]` · `…/approve` · `…/reject` | DELETE · POST · POST | owners or admins, by tag (`[id]/route.ts:39-53`; `approve/route.ts:38`; `reject/route.ts:47`) | a hard delete; everyone else archives |
| `/api/studio-config/price-book/reorder` · `…/vendor-markup` · `/api/studio-config/pricing-tiers` · `/api/price-book/import` | POST · POST · PUT · POST | **none** | `vendor-markup` re-prices every active item of a vendor (`vendor-markup/route.ts:13-38`); `pricing-tiers` replaces an item's tiers (`pricing-tiers/route.ts:15-…`); `import` inserts with the service role, leaves `approval_status` to its default `approved`, and creates missing categories and vendors (`import/route.ts:6-144`) — past the approval a designer's single add would get. The screen hides editing from `id` and `accounting` (`price-book-manager.tsx:61, 466-498`) |
| `/api/document-templates/*` | GET · POST · PATCH · DELETE | none | templates D-01 |
| `/api/signing-documents` (+ `/upload`) | GET · POST · PATCH · DELETE | none | soft delete (D-14) |
| `/api/quotes/assemblies` | GET · POST · PATCH · DELETE (`assemblies/route.ts:30-236`) | none | D-14 |
| `/api/quote-generation-rules/records*` | GET · POST · PATCH · DELETE | none | D-14 |
| `/api/identity/studio-settings` (Approval Rules, Quote Sharing) | PATCH (`SS:49-143`) | none | D-20 |

### D-34 · `/settings`

| Section | Route | Role check |
|---|---|---|
| Your Profile | `PATCH /api/identity/profile` | self (service role) |
| Lead Preferences | `PATCH /api/identity/members` | none (D-31) |
| Studio Region | — (read-only on screen); `PATCH /api/identity/studio-settings` accepts `countryCode` · `currencyCode` · `timezone` · `locale` | none |
| My Signature | `/api/member-signatures/records*` | self |
| Ads & Promotions · ID Buddy AI | `PATCH /api/identity/studio-settings` | none |
| Notifications | `GET` / `PUT /api/notifications/preferences`; `GET /api/notifications/templates`; `PUT` / `DELETE …/templates/[eventType]` | writes owner-only (D-15) |
| Email Lead Sources | `/api/email/{connect,callback,disconnect,status,sync}` | none (D-16) |

### D-35 · Where the screen hides what the API allows

All read from the code and the policies, none executed (§Uncertain).

1. **Any member can make themselves owner, or lock the owner out.** `PATCH /api/identity/members` writes `tags` for any member of the studio with no role check (`MEM:64-116`), and the CHECK accepts `owner` (`296:35-40`); `DELETE` deactivates anyone, and a deactivated owner cannot log in (`auth/verify/route.ts:53`). The roles routes guard against exactly this self-escalation (`roles/route.ts:60-63`), but tags — not role rows — are what every check reads.
2. **Any member can rewrite any studio setting.** `PATCH /api/identity/studio-settings` merges any top-level key and the region columns (`SS:95-119`): `features` (bypassing the owner/admin gate on `lead_manager_hierarchy`), `workflow` (switch quote approval off, or add oneself to `approvers.quoteApproval`), `page_visibility` (re-open pages the platform closed), `is_demo`, `country_code` · `currency_code` (the screen says "Contact support").
3. **Every Accounts tab of the three groups is open to every member** who reaches `/accounts` (D-30): legal entities with their bank details and PayNow QR, the funnel, sources, custom fields (whose save wipes values, D-12), webhooks, quote categories, document templates, signing documents, packages, quote rules, approval rules, sharing — though `AC:123-125` and `docs/rules/architecture.md:224` call Accounts owner-only.
4. **Webhook endpoints** — create, revoke, rotate, and read logs holding homeowners' contact details (D-13, D-28) — for any member; the file says owner-only.
5. **Studio Health** — owner-only page, open route (D-31).
6. **Price book** — a member denied `pricebook.edit` can still bulk-import (items land approved), re-price by vendor markup, replace tiers and reorder (D-33).
7. **Roles** — an owner can rename a system role's slug or change its permissions through `PATCH` although the editor disables it, and can overwrite a system row by creating a role with its slug (D-31).
8. **Member overrides** — an admin can grant anyone any action, an owner or themselves included; since `team.*` and `settings.*` are read by no route, the grant changes little (D-21).
9. **Email ingestion** — any member can connect or disconnect the studio's inbox (D-16).
10. **Member requests** — any member can dismiss one; the screen shows them to owners only (D-31).
11. **A removed member keeps working** until the browser drops the cookie; the server never re-checks (D-30).

### D-36 · Writes that lose or bend data

| # | Write | What happens | Where |
|---|---|---|---|
| 1 | Custom Fields › Save | every field re-created with new ids; `ON DELETE CASCADE` removes every value on every lead | D-12 |
| 2 | Legal Entities › edit and save | the row loses `is_default`, is re-activated, and its `numbering` becomes `{}` | D-07 |
| 3 | Lead Categories › Save | every row re-created with new ids (harmless — nothing references them) | D-09 |
| 4 | Lead Sources · Quote Categories › Save | deactivate all, then upsert one by one — a failure part-way leaves entries switched off; a rename orphans the leads' or price-book items' old word / id | D-11, D-14 |
| 5 | Any settings save | read-modify-write of the whole JSON bag without a transaction — a concurrent save is lost | D-20 |
| 6 | Quote Sharing switches | can only ever be turned off, and the screen never shows it | D-20 |
| 7 | Quote Categories › Import Price Book from CSV | prices × 100 into a dollars column | D-14 |
| 8 | Lead Funnel › Save | a sub-status in use can be deleted; `version` never moves | D-10 |
| 9 | Legal Entities › Set default | two statements; a failure between them leaves no default | D-07 |

### D-37 · Documents and comments that disagree with the code

| Says | Where | The code |
|---|---|---|
| Accounts is owner-only | `docs/rules/architecture.md:224`; `AC:123-125` | owner · admin · id · accounting, one filtered item (D-30) |
| "Owner-only Roles & Permissions matrix editor" | `docs/rules/architecture.md:243` | `roles/page.tsx` only redirects (`src/app/(main)/accounts/roles/page.tsx:1-26`); the editor renders for every member, the saves are owner-only |
| "System rows (`is_system = true`) seeded by migration 109" | `docs/rules/database-auth.md:88` | `090` seeded first and `109` skipped those studios; the auto-seed rows are not marked system (D-05) |
| "owner-only" webhook management | `endpoints/route.ts:2-3` | studio match only (D-32) |
| "Exactly one default company per studio" | `126:19-20` | an edit leaves none (D-07) |
| lead preferences are weights | `sb:20260402000001:5-6` | values + priority (D-25) |
| "Classic · Default" | `lead-experience-tab.tsx:59` | absent key = Journey (D-24) |
| "This will not erase data already captured" | `ACC:1054` | every save erases it (D-12) |
| "Minimum 3 categories required" · "existing leads tagged with it" | `ACC:694, 766` | not enforced; no tag exists (D-09) |

---

## 4. 2.0 today

Drizzle over libSQL (`lib/db/schema.ts`), one studio, no tenant column and no RLS. Studio configuration is split between **Settings** (`/settings`: Leads · Quotes · Notifications live, Stages · Projects · Finance "Coming soon" — `app/settings/settings-view.tsx:31-38, 240`) and **Company** (a rail panel of pages: Profile · Members · Questionnaire · Templates · Price book · Integrations — `lib/company/sections.ts:9-22`). There is no Accounts page, no permissions screen and no usage screen.

### D-40 · `settings` — one JSON value per key

`lib/db/schema.ts:231-237` (`key text PK`, `value text NOT NULL` = JSON, `updated_at integer NOT NULL`), created by `drizzle/0002_boring_wolverine.sql:1-5`. Fifteen keys; a missing row means the default.

| Key | Type (definition) | Missing = | Written by (gate) | The 1.0 setting it answers |
|---|---|---|---|---|
| `stage_movement` | `'linear' \| 'flexible'` (`lib/settings/types.ts:10-21`) | linear | `setStageMovement` (Owner/Admin, `app/settings/actions.ts:19-27`) | the funnel's movement rules (map 02:23) |
| `quote_approval` | `'required' \| 'not-required'` (`types.ts:32-43`) | required | `setQuoteApproval` (Owner/Admin, `actions.ts:34-42`) | `workflow.quoteApprovalRequired` — **not** 1.0's `quote_approval` object (D-160) |
| `template_approval` | same (`types.ts:59-68`) | required | `setTemplateApproval` (`actions.ts:45-53`) | — (2.0 only) |
| `studio` | `{name, gstRegistered, phone}` (`types.ts:45-51`) | Demo Studio Pte Ltd · true · '' | `saveBrand` keeps `name` · `phone` in step (**no gate**, `app/company/templates-actions.ts:339-352`); `gstRegistered` has no writer but repair R23 | `studios.name`, the default entity's GST |
| `brand` | `BrandSetting {kit, details}` (`lib/templates/brand.ts:9-57`; `lib/templates/model.ts:47-76`) | the demo's kit and details | `saveBrand` (**no gate**) | Legal Entities (`details.entities`), Branding (later) |
| `quote_numbering` | `Numbering` (`types.ts:70-102`) | `OM-` + the highest + 1 | `setNumbering` (Owner/Admin) | Finance › Document Numbering (later; map 06:19) |
| `trades` | `string[]` ≤ 60 (`types.ts:104-107`) | the categories quotes already use (`lib/settings/queries.ts:56-61`) | `setTrades` (Owner/Admin) | Quote Categories' names (map 04:27) |
| `trade_notes` | `Record<lower-cased trade, ≤ 600 chars>` (`types.ts:109-116`) | {} | `setTradeNote` (Owner/Admin) | Quote Categories' descriptions (map 04:27) |
| `quote_rules` | `{roundStep, paymentLock, backupApproverId, preparedBy}` (`types.ts:118-138`) | all off; `preparedBy 'member'` | `setQuoteRules` (Owner/Admin) | `workflow.approvers.quoteApproval` (one backup); `branding.quotePreparedByMode` (map 04:29) |
| `lead_sources` | `{name ≤ 40, retired}[]` ≤ 40 (`types.ts:140-163`) | sixteen defaults | `setLeadSources` (Owner/Admin) | Lead Sources (map 02:24) |
| `lead_visibility` | `'everyone' \| 'assigned'` (`types.ts:165-172`) | everyone | `setLeadVisibility` (Owner/Admin) | the ID role's assigned-only scope (D-141) |
| `lead_capture` | `LeadCapture {emailSlug, meta, webhooks[], webhookLog[≤ 50], email}` (`types.ts:174-225`) | no webhooks, email off | `setLeadCapture` (**no gate**, `app/leads/capture-actions.ts:16-23`); the webhook and Gmail wrappers gated (`:59-83, 101-114`); `simulateWebhook`, `syncGmail`, `captureLead` not | Lead Webhooks · Email Lead Sources (map 02:27-28) |
| `lead_reasons` | `{lost[], hold[]}` ≤ 30 each (`types.ts:227-270`) | the defaults | `setLeadReasons` (Owner/Admin) | `journey.inactivationReasons`; the funnel's hold / inactive sub-statuses (map 02:25) |
| `notification_rules` | `NotificationRules {channels: event × {in_app, email, whatsapp}, untouchedMinutes, stopWhenClosed}` (`lib/notifications/model.ts:13, 37-50`) | `DEFAULT_RULES` | `setNotificationRules` (**no gate**, `app/notifications/actions.ts:32-38`) | `notification_preferences` (map 02:31) |
| `message_templates` | `MessageTemplate[]` per event × channel | the defaults | `setMessageTemplate` (**no gate**, `:39-45`) | `notification_templates` |

**Demo state.** `local.db` and `fixtures/baseline.json` hold five keys — `stage_movement` `"linear"`; `studio` `{"name":"Demo Studio Pte Ltd","gstRegistered":true,"phone":"6222 0188"}`; `brand` (5,707 characters: the kit, the demo's details, **one** entity with no bank or PayNow); `lead_reasons` (the defaults, saved); `lead_capture` (one Google Ads webhook `wh-google-ads` with one logged arrival) — every other key reads its default (read with `sqlite3 -readonly local.db` and from the baseline's `settings` rows).

### D-41 · `members` — people and roles (+ the provisional identity tables)

`lib/db/schema.ts:89-107`; `drizzle/0001_outstanding_maria_hill.sql:70` (create), `0019` (`signature_*`), `0028` (`email`), `0031` (`manager_id`), `0035` (`accepting_leads`, `lead_preferences`, `specialty`).

| Column | Type | Null / default | Written by | Notes |
|---|---|---|---|---|
| `id` | text PK | | seeds | the demo uses slugs (`lib/leads/enums.ts:34-41`) |
| `name` | text | NOT NULL | seeds | |
| `role` | text | NOT NULL | `setMemberRole` (Owner/Admin; the last Owner cannot be demoted, `app/company/members-actions.ts:15-28`) | `Owner · Admin · Manager · Designer` (`lib/leads/enums.ts:113-115`) |
| `color` | text | NOT NULL | seeds | an avatar tint hex, or `'photo'` |
| `is_you` | boolean | NOT NULL false | seeds | the signed-in stand-in (`lib/leads/visibility.ts:10-14`) |
| `manager_id` | text | null | `setMemberManager` (Owner/Admin, `:30-40`); cleared when a role changes (`:24-26`) | the Manager a Designer reports to (REG-601) |
| `email` | text | null | repair R36 | `{prepared_by_email}` (REG-560) |
| `signature_kind` · `signature_name` · `signature_data` | text | null | the quote editor's Signature | contracts D-43 |
| `accepting_leads` | boolean | NOT NULL true | `setMemberAccepting` (self or Owner/Admin, `:42-48`) | |
| `lead_preferences` | text (JSON) | null | `setMemberPreferences` (self or Owner/Admin, `:49-55`; parsed against the vocabulary, `lib/company/preferences.ts:33-48`) | four dimensions (D-143) |
| `specialty` | text | null | the same | ≤ 120 |

No `studio_id`, `is_active`, `title`, phone, avatar URL or `joined_at`; no action adds or removes a member, and Company › Members shows only people and roles (`components/company/members-view.tsx:31, 68-72`). Member statistics are derived (D-47). **Provisional identity:** `users` · `organizations` · `memberships` (`schema.ts:25-66`, flagged "PROVISIONAL" at `:4-13`) hold **0 rows** in the baseline and are read by nothing in this slice.

### D-42 · Lead configuration tables

- **`lead_custom_fields` · `lead_custom_field_values`** (`schema.ts:1037-1060`; `drizzle/0035_lead_parity_r6.sql:1-21`): 1.0's columns less `studio_id`; `options` and `value` are JSON text; types `text · number · date · dropdown · multi_select` (`lib/leads/custom-fields-model.ts:5-10`). `saveCustomFields` (Owner/Admin) keeps ids, updates the rows still listed, inserts new ones and deletes the rest with their values, in one transaction (`app/settings/actions.ts:160-190`) — 1.0's wipe is **not** reproduced. A lead's values are written whole — active fields only, `≤ 300` characters, `≤ 20` choices — deleting a value that sits on an inactive field (`app/leads/actions.ts:288-300`). Required is checked by the form (`custom-fields-model.ts:23-29`), not by the action. Baseline: 0 fields, 0 values.
- **`studio_scope_questions`** (`schema.ts:1023-1033`) — Company › Questionnaire, 1.0's HomeOwner Portal › scope questions (a later group for this audit); 11 rows in the baseline (repair R44).

### D-43 · JSON homes for the rest

- **Issuing entities** — `settings.brand.details.entities: IssuingEntity[]` (`lib/templates/model.ts:47-53`: `name, bankName, accountName, accountNo, payNow, payNowQr, gstRegistered, swift, logo, address, uen, gstReg`). At most six; entity 0 **is the studio** and its name is forced to `details.name` on every parse (`lib/templates/brand.ts:42-44`) and every save (`components/company/profile-view.tsx:54`); its GST switch is not shown (`profile-view.tsx:119`), the studio's GST living in `settings.studio.gstRegistered`. A quote names its entity **by name** (`quotes.issuing_entity`, `schema.ts:282`) and silently falls back to entity 0 when that name is gone (`lib/templates/data.ts:53`). No id, no default flag, no active flag, no tax rate, no country or currency.
- **Webhooks** — `Webhook {id, platform, label ≤ 80, notes ≤ 200, token, key, received, created, duplicates, lastAt, active, createdAt}` and `WebhookLogEntry {at, webhookId, outcome: created · duplicate, name}` (`lib/settings/types.ts:178-185`); the URL points at `in.openmaison.sg` (`:191`); a Google Ads key is shown once, at creation or rotation (`app/leads/capture-actions.ts:61-77`). Nothing receives a POST — *Simulate a POST* plays one arrival (`:85-99`).
- **Email lead sources** — `EmailSource {connected, address, platforms, custom, lastSyncAt, stats}` (`types.ts:186-190`).
- **Notifications** — fifteen events (`lib/notifications/model.ts:13`), channels `in_app · email · whatsapp`, `untouchedMinutes` 15 · 30 · 60 · 240 · 1440, `stopWhenClosed` (`:37-50`); recipients are fixed per event (leads Q-43 hold).

### D-44 · Checks in 2.0's server actions

The prototype has one signed-in member (`fetchViewer`: the `is_you` row, else `'dane'`, else role Owner — `lib/leads/visibility.ts:10-14`; `SESSION_MEMBER_ID`, used by 23 files); `runsStudio(role)` = Owner or Admin (`lib/leads/assign-policy.ts:11`).

| Gated (Owner/Admin unless noted) | Not gated |
|---|---|
| every setter in `app/settings/actions.ts` (`assertRunsStudio`, `:10-16`) and `saveCustomFields` (`:169-170`); `setMemberRole` · `setMemberManager`; `setMemberAccepting` · `setMemberPreferences` (self or Owner/Admin); the scope-question actions (`app/company/scope-questions-actions.ts:14`); `createWebhook` · `regenerateWebhook` · `revokeWebhook` · `connectGmail` · `disconnectGmail` · `setEmailPlatforms` (`app/leads/capture-actions.ts:59-114`); a quote template's publish when approval is required (`isApprover`, `app/company/templates-actions.ts:128, 167`) | `saveBrand` — the entities with their bank accounts and PayNow QR (`templates-actions.ts:339-352`); `setLeadCapture` (the exported action behind the gated wrappers, `capture-actions.ts:16-23`), `simulateWebhook`, `syncGmail`, `captureLead`; `setNotificationRules` · `setMessageTemplate` (`app/notifications/actions.ts:32-45`); every price-book action (0 of 17 in `app/company/price-book-actions.ts`); the contract, payment, task and text template libraries' actions |

On screen: Settings shows Leads and Quotes read-only to everyone else (`app/settings/page.tsx:39`; `settings-view.tsx:200-204`); Company › Integrations takes `canManage` (`components/company/integrations-view.tsx:40`); Members `canEdit` (`members-view.tsx:31`); Profile, Brand kit, Price book and Notifications have no read-only mode.

### D-45 · Each 1.0 screen, and where it lives in 2.0

| 1.0 screen | 2.0 home | Verdict | Reference |
|---|---|---|---|
| Team Members — roles | Company › Members: one role per member (`members.role`) + reports-to | merge | REG-601; D-140 |
| Team Members — invite / requests / pending invitations | — | Platform | D-06 |
| Team Members — title · phone · photo · remove | — | missing | D-93, D-96, D-105, D-106 |
| Team Members — accepting leads · lead preferences · specialty | Company › Members | same (format change) | REG-612; D-143 |
| Team Members — member overrides | — | missing (hold) | leads Q-40 |
| Legal Entities | Company › Profile › Issuing entities & bank details (`settings.brand.details.entities`) | merge into JSON | map 04:28; D-115…D-129 |
| Roles & Permissions | four fixed roles; `runsStudio` and `lib/leads/assign-policy.ts` | superseded | leads Q-40 (hold), Q-41 |
| Studio Health | — (Leads › Insights reads records, not telemetry) | Platform | D-08 |
| Lead Experience | — (Journey mode out); duplicate detection always on; the reasons → Settings › Leads › Reasons | superseded / rename | map 02:19, 25; §3 of map 02 |
| Lead Funnel | the fixed stages + Settings › Leads › Stage movement | superseded | map 02:23 |
| Lead Categories | — | write-only in 1.0; not ported | map 02:22 |
| Lead Sources | Settings › Leads › Lead sources | rename (row → JSON) | map 02:24 |
| Custom Fields | Settings › Leads › Custom fields | same | map 02:21 (R6); REG-612 |
| Lead Webhooks | Company › Integrations › Webhooks (a stand-in; no receiver) | merge into JSON | map 02:27; leads Q-36 |
| Quote Categories | Settings › Quotes › Trades + Trade notes | split | map 04:27 |
| Document Templates | Company › Templates › Quotes · T&Cs · Contracts | split | map 04:18-21; map 08:34 |
| Signing Documents | Company › Templates › Contracts (rich text, with the gates) | merge | map 08:35 |
| Packages | Company › Price book › My Sections | rename | templates audit TC-01 |
| Quote Rules | — | held | templates Q-07 |
| Price Book | Company › Price book › My Items | rename | map 06:35 (tiers, history, SKU, approval held for the price-book audit) |
| Quote Approval Rules | — | dead | QE Q-24 |
| Quote Sharing | — | dead | templates Q-09 |
| Settings › Your Profile | `members.name` · `email` | merge | D-103…D-106 |
| Settings › Lead Preferences | Company › Members | same | REG-612 |
| Settings › Studio Region | — (S$, Singapore) | missing | D-84 |
| Settings › My Signature | the quote editor's Signature (`members.signature_*`) | superseded | contracts D-43 |
| Settings › Ads · ID Buddy | — | write-only in 1.0; not ported | D-20 |
| Settings › Notifications | Settings › Notifications (`notification_rules` · `message_templates`) | merge | map 02:31; REG-604 |
| Settings › Email Lead Sources | Company › Integrations › Email lead sources | merge into JSON | map 02:28 |

### D-46 · Seeds, repair rules and the baseline

- **Repair rules that write this slice's data** (`scripts/repair-demo-data.ts`): R23 inserts `settings.studio` if absent (`:488`) and later its phone (`:636`); R27 gives the `is_you` member a typed signature (`:658-663`); R31 inserts `settings.brand` if absent (`:719-720`); R35 aligns `brand.details.name` · `phone` with `studio` (`:892-893`) and names every unauthored text and task template's author `'dane'` (`:887-888`), as R34 does contracts (`:871`); R36 gives every member without an e-mail `{first name}@demostudio.sg` (`:795-799`) and a brand record without entities the studio as its first (`:800-811`); R39 makes `james` a Manager with `sarah` and `michelle` under him (`:923-931`); R44 seeds the question bank from the demo's questionnaires and gives `sarah` · `michelle` · `germaine` · `alex` a specialty and preferences (`:997-1027`); R45 seeds the Google Ads webhook and its arrival waiting in Review (`:1075-1091`).
- **Checks** (`db:repair`): designer reporting to someone who is not a Manager (`:1277`); a member with an unknown role (`:1278`); the brand's details disagreeing with the studio record (`:1281`); no studio record (`:1315`); the signed-in member with no signature (`:1322`); no brand record (`:1327`); a member with no work e-mail (`:1330`); a brand record with no entity (`:1331`); a bank question of an unknown type (`:1339`); preferences that are not JSON (`:1340`); a custom value on a missing field (`:1341`).
- **Baseline** (`fixtures/baseline.json`, `takenAt` 2026-09-24T23:37:56Z; `BASELINE_TABLES`, `lib/db/baseline.ts:17`): `settings` 5 · `members` 6 (Dane Owner `is_you`, James Manager, Sarah and Michelle Designers under him, Germaine and Alex Designers) · `lead_custom_fields` 0 · `lead_custom_field_values` 0 · `studio_scope_questions` 11 · `users` · `organizations` · `memberships` 0.

### D-47 · What 2.0 derives instead of storing

A member's close rate, projects in twelve months and active leads (`fetchMemberStats`, `lib/company/members.ts:31-51`); leads held per member (`:16-19`); the website's intake address (`intakeAddress`, `lib/settings/types.ts:225`); leads per source and reasons carried (`app/settings/page.tsx:23, 31`); the webhook URL (`types.ts:191`); the viewer's reach (`assignableIds`, `canSeeLead`, `lib/leads/assign-policy.ts:14-27`).

---

## 5. The diff

### 5.1 Store map

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-60 | `studios` row (D-02) | `settings.studio` + `settings.brand.details` | **split** | 2.0 has no studio row; `organizations` is provisional and empty (D-41) |
| D-61 | `studios.settings` — one bag (D-20) | `settings` — one row per key (D-40) | **split** | key by key below; the names are not a mapping (D-160) |
| D-62 | `studio_members` (D-03) | `members` (D-41) | **merge** (with `profiles`) | leads D §3.4 C |
| D-63 | `profiles` (D-04) | `members.name` · `email` | **merge** | sign-in (`auth.users`, 2.0's `users`) is Platform |
| D-64 | `studio_roles` (D-05) | `members.role` + the rules in code (`runsStudio`, `lib/leads/assign-policy.ts`) | **superseded** | leads Q-40 (custom roles, a permissions editor: hold) |
| D-65 | `studio_members.permission_overrides` · `workflow_overrides` | — | **missing in 2.0** (hold) | leads Q-40 |
| D-66 | `studio_invitations` · `studio_member_requests` (D-06) | — | **Platform** | OpenMaison staff provision members |
| D-67 | `studio_companies` (D-07) | `settings.brand.details.entities[]` | **merge** into JSON | map 04:28 |
| D-68 | `usage_events` · `usage_daily_rollup` · `auth_sessions` (D-08) | — | **Platform** | |
| D-69 | `settings.features.lead_journey_mode` · `journey.steps`; `features.duplicate_detection_enabled`; `features.lead_manager_hierarchy`; `journey.inactivationReasons` | —; always on; `members.manager_id` + `settings.lead_visibility`; `settings.lead_reasons` | **superseded** · **superseded** · **merge** · **rename** | Journey mode is out (map 02:19); map 02 §3; map 02:25, 34 |
| D-70 | `studio_lead_funnel` (D-10) | the fixed stages + `settings.stage_movement` | **superseded** | map 02:23 |
| D-71 | `lead_categories` (D-09) | — | **write-only** | map 02:22 calls it dead: nothing but its own screen reads it |
| D-72 | `studio_taxonomies` `lead_source` (D-11) | `settings.lead_sources` | **rename** (rows → JSON) | map 02:24 |
| D-73 | `lead_custom_fields` · `lead_custom_field_values` (D-12) | the same names | **same** | map 02 (R6) |
| D-74 | `lead_webhook_endpoints` · `lead_webhook_log` (D-13) | `settings.lead_capture.webhooks` · `webhookLog` | **merge** into JSON | the receiver is Platform (map 02:27) |
| D-75 | `studio_quote_categories` · `studio_document_templates` · `studio_signing_documents` · `studio_assemblies` · `quote_generation_rules` · `studio_price_book` (+ children) | `settings.trades` + `trade_notes` · `quote_templates` / `quote_text_templates` / `contract_templates` · `contract_templates` · `price_book_sections` · — · `price_book_items` | per the maps | map 04:18-21, 27; map 08:34-35; templates TC-01; templates Q-07; map 06:35 |
| D-76 | approval: `settings.quote_approval` (thresholds); `workflow.quoteApprovalRequired` · `approvers.quoteApproval` | —; `settings.quote_approval` (string) · `settings.quote_rules.backupApproverId` | **dead**; **rename** · **merge** | QE Q-24; D-135…D-137 |
| D-77 | `quoteSharingMethod` · `quoteLinkExpiryDays` · `quoteShare_*` | — | **dead** | templates Q-09 |
| D-78 | `notification_preferences` · `notification_templates` · `customer_notification_preferences` (D-15) | `settings.notification_rules` · `message_templates`; — | **merge** · **Later** | map 02:31 |
| D-79 | `email_connections` (D-16) · `member_signatures` (D-17) · `ads_enabled` / `id_buddy_enabled` · the region columns · browser storage | `settings.lead_capture.email` · `members.signature_*` · — · — · browser | **merge** · **superseded** · **write-only** · **missing** · **Platform** | map 02:28; contracts D-43 |

### 5.2 Column-level diffs

**A · `studios` → `settings.studio` · `settings.brand.details`**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-80 | `id` | — | **dead** | one studio |
| D-81 | `name` | `settings.studio.name` = `brand.details.name` = `entities[0].name` | **same** (three copies) | kept equal by `saveBrand` (`app/company/templates-actions.ts:344-348`), R35 and the parse (`lib/templates/brand.ts:44`); D-213 picks the value |
| D-82 | `owner_id` | `members.is_you` on the owner's row | **rename** | the prototype's signed-in stand-in (D-44) |
| D-83 | `plan_id` · `status` · `verification_status` · `supported_countries` · `setup_completed_at`; `settings.is_demo` · `page_visibility` | — | **Platform** | |
| D-84 | `country_code` · `currency_code` · `timezone` · `locale` | — | **missing in 2.0** | S$ and Singapore throughout; D-171 |
| D-85 | `lead_sources` (column) | — | **dead** | D-02 #8 |
| D-86 | `chat_identity_*` · `logo_url` · `portal_slug` | — | **Later** | Branding, Portal |
| D-87 | `settings` | per key | **split** | D-20 · D-40 |

**B · `studio_members` + `profiles` → `members`**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-88 | `studio_members.id` | `members.id` | **same** | the UUID string kept; `lead_assignees.member_id` points at it in both products |
| D-89 | `studio_id` | — | **dead** | |
| D-90 | `user_id` | — | **derived** | resolves every `*_by` column from `profiles.id` to `members.id` (D-212) |
| D-91 | `role` (`member_role`) | — | **dead** | legacy (D-03 #4) |
| D-92 | `tags` | `role` | **merge** | D-140 |
| D-93 | `title` | — | **missing in 2.0** | D-176 |
| D-94 | `specialty` | `specialty` | **same** | 2.0 caps 120 |
| D-95 | `close_rate` · `projects_last_12_months` · `active_projects_count` | — | **derived** | `fetchMemberStats` (D-47) |
| D-96 | `is_active` | — | **missing in 2.0** | D-175 |
| D-97 | `joined_at` | — | **missing in 2.0** | D-187 |
| D-98 | `invitation_status` · `invited_at` · `invited_by` | — | **Platform** | |
| D-99 | `accepting_leads` | `accepting_leads` | **same** | |
| D-100 | `lead_preferences` | `lead_preferences` | **format change** | D-143 |
| D-101 | `permission_overrides` · `workflow_overrides` | — | **missing in 2.0** (hold) | D-191 |
| D-102 | `role_id` | — | **dead** | D-03 #10 |
| D-103 | `profiles.full_name` | `name` | **same** | |
| D-104 | `profiles.email` (UNIQUE NOT NULL) | `email` (nullable, not unique) | **same** | 2.0 is weaker |
| D-105 | `profiles.phone` (E.164) | — | **missing in 2.0** | D-176 |
| D-106 | `profiles.avatar_url` | — (`color`: a tint, or `'photo'`) | **missing in 2.0** | |
| D-107 | — | `color` (NOT NULL) | **2.0 only** | the port picks a tint (D-212) |
| D-108 | — | `is_you` | **2.0 only** | D-82 |
| D-109 | — | `manager_id` | **2.0 only** | 1.0 keeps the hierarchy on the lead (`leads.owning_manager_id`, `296`; map 02:34) |
| D-110 | `member_signatures` (an image in a private bucket) | `signature_kind` · `signature_name` · `signature_data` (an SVG path or a typed name) | **superseded** | contracts D-43; an image does not become a path (D-212) |

**C · `studio_roles` → —**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-111 | every column | — | **superseded** | the four system meanings are 2.0's fixed rules (leads audit P-05); a custom role applied to nobody (D-05) |
| D-112 | the ID role's `dataScope: 'assigned'` | `settings.lead_visibility` | **merge** | not enforced in 1.0 (D-05 #3); D-141 |

**D · `studio_companies` → `IssuingEntity`** (brings templates D-77 up to date after REG-618 added `swift`, `logo`, `address`, `uen`, `gstReg`)

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-115 | `id` | — | **missing in 2.0** | addressed by name (D-43); D-180 |
| D-116 | `name` (UNIQUE per studio) | `name` | **same** | no uniqueness in 2.0; entity 0's name is forced to the studio's |
| D-117 | `registration_number` | `uen` | **rename** | |
| D-118 | `gst_registered` | `gstRegistered` | **same** | entity 0's is `settings.studio.gstRegistered` |
| D-119 | `gst_registration_number` | `gstReg` | **rename** | |
| D-120 | `address` | `address` | **same** | blank = the studio's |
| D-121 | `country_code` · `currency_code` | — | **missing in 2.0** | D-178 |
| D-122 | `tax_rate` (fraction) | — | **missing in 2.0** | 2.0: `quotes.gst_pct` (9) and the entity's on / off; D-178 |
| D-123 | `bank_details.bankName · accountHolder · accountNumber · swiftCode` | `bankName · accountName · accountNo · swift` | **rename** | `branch` · `payeeNotes` missing (D-179) |
| D-124 | `branding.logoUrl` · `branding.paynowQrUrl`; `settings.payment_details.paynow_id` | `logo` · `payNowQr`; `payNow` | **same** · **same** · **rename** | 2.0 stores uploaded paths (templates D-126) |
| D-125 | `branding.primaryColor · tagline · footerText · contactPhone · contactEmail · website · accreditations` | — | **missing in 2.0** | studio-level in `brand.details` / `kit`; D-179 |
| D-126 | `numbering` | — | **dead** | D-07 #2 |
| D-127 | `is_default` | position 0 | **different** | 1.0: any row; 2.0: the studio itself |
| D-128 | `is_active` | — | **missing in 2.0** | D-177 |
| D-129 | `created_at` · `updated_at` | — | **dead** | |

**E · Lead configuration**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-130 | `studio_taxonomies` `name` · `is_active` · `order_index` · (`id`, `studio_id`, `type`, `metadata`) | `LeadSourceEntry.name` (≤ 40) · `!retired` · array order · — | **rename** | map 02 |
| D-131 | `lead_custom_fields` (`id`, `label`, `field_type`, `options text[]`, `is_required`, `order_index`, `is_active`, `created_at`); values `value jsonb` | same columns less `studio_id`; `options` JSON (≤ 20, deduped); `label` ≤ 60; `value` JSON (≤ 300 characters, ≤ 20 choices) | **same** | `file` → D-142 |
| D-132 | `lead_webhook_endpoints` `id · token · platform · source_label · notes · is_active · total_received · total_leads_created · total_duplicates · last_received_at · created_at` | `Webhook.id · token · platform · label (≤ 80) · notes (≤ 200) · active · received · created · duplicates · lastAt · createdAt` | **rename** | stamps in **milliseconds** (D-151); `signing_secret` → `key` not ported (D-183); `created_by` · `studio_id` dropped |
| D-133 | `lead_webhook_log` `received_at · endpoint_id · outcome · lead_id · payload_excerpt · error_message` | `WebhookLogEntry.at · webhookId · outcome · name` | **merge** (lossy) | the newest 50; outcomes D-145; the payload and the error stay behind (D-200) |
| D-134 | `journey.inactivationReasons[]` `code · label · requiresProof · fields · gateAfterAttempts` | `lead_reasons.lost[]` `name (≤ 40) · retired · minContacts` | **rename** | 2.0 asks a competitor or a restart date by the reason's name (`LOST_COMPETITOR` · `LOST_POSTPONED`, `lib/settings/types.ts:234-237`); the hold list has no 1.0 source but the funnel's hold sub-statuses (map 02:25) |

**F · Approval and notifications**

| Id | 1.0 | 2.0 | Verdict | Note |
|---|---|---|---|---|
| D-135 | `workflow.quoteApprovalRequired` (default true) | `settings.quote_approval` | **rename** | D-146 |
| D-136 | `workflow.approvers.quoteApproval` (profile ids; empty = every owner) | `settings.quote_rules.backupApproverId` (one `members.id`) | **merge** (lossy) | 2.0: Owners and Admins always approve (`lib/settings/queries.ts:85-90`); 1.0: owners always, admins only if listed (QE D-07); D-181 |
| D-137 | `workflow_overrides.quoteApprovalRequired` per member | — | **missing in 2.0** | nobody skips approval in 2.0; an approver's Send approves at once |
| D-138 | `notification_preferences` (category × channel: `enabled`, `digest_mode`, `recipient_roles`) | `notification_rules.channels` (event × channel) | **split** | D-144; `digest_mode` · `recipient_roles` · `sms` missing (leads Q-43 hold) |
| D-139 | `notification_templates` (the studio's overrides: `subject`, `body_html`, `body_text`, `variables`); `customer_notification_preferences` | `message_templates`; — | **format change**; **Later** | |

### 5.3 Enums

**D-140 · Tags → role** (priority owner > admin > manager > id).

| 1.0 `tags` | 2.0 `role` | Note |
|---|---|---|
| contains `owner` | Owner | the seeded owner holds `{owner, admin, id}` (`016:12`) |
| `admin`, no `owner` | Admin | |
| `manager` (with `id`) | Manager | 1.0's manager is a designer with routing, gated by `features.lead_manager_hierarchy` (`AC:38-46`) |
| `id` | Designer | |
| `accounting` only | — | no 2.0 role (leads Q-39: with Finance); D-212 |
| none | — | cannot log in (`AC:190-195`) |

**D-141 · Who sees which leads.** 1.0: a designer sees the leads assigned to them (in the browser, leads audit L-17); a manager the leads routed to them (on the server, only with the hierarchy on); `dataScope` enforces nothing (D-05). 2.0: `lead_visibility = 'assigned'` gives Designers their own and Managers theirs and their team's, `'everyone'` (2.0's default) shows every lead to everyone. `'assigned'` reproduces what a 1.0 designer saw — the owner's call (D-214).

**D-142 · Custom field types.** `text · number · date · dropdown · multi_select` → the same; `file` → none (never rendered in 1.0, D-12).

**D-143 · Lead preferences.**

| 1.0 | 2.0 |
|---|---|
| `priority` `must_match` · `nice_to_have` · (absent = Don't Care) | `must` · `nice` · absent (`lib/company/preferences.ts:9-12, 30-31`) |
| `property_type` — the SG keys (`hdb_4_room` …) | `propertyType` — the labels (`HDB 4-Room` …), through leads D §3.4's property-type map |
| `budget` `20k-40k · 40k-60k · 60k-80k · 80k-100k · 100k+` | `lt40 · 40-60 · 60-100 · 100-150 · 150+` (`preferences.ts:14-20`): 60–80 and 80–100 → `60-100`; `100k+` → both `100-150` and `150+` |
| `design_style` | `style` — matched by name; unknown values dropped and logged |
| `area` `North · North East · East · West · Central` | `area` — the same five (`lib/leads/enums.ts:67`) |
| `scope` | — (2.0 left it out, `preferences.ts:3-8`) |

**D-144 · Notification categories → events** (a naming choice: a category's switch is applied to the 2.0 events of the same family).

| 1.0 category | 2.0 events |
|---|---|
| `leads` | `new_lead` · `assigned` · `untouched` · `stage_changed` · `hold_due` · `question_answered` |
| `quotes` | `quote_approval` · `quote_approved` · `quote_changes` · `quote_confirmed` · `contract_sent` · `quote_signed` |
| `tasks_escalations` | `task_assigned` · `task_due` · `task_due_soon` |
| `invoices` · `purchase_orders` · `finance_ops` · `projects` · `team` · `hangouts` · `pricing` | — (later modules) |

Channels `email · in_app · whatsapp` → the same; `sms` → none. `enabled = false` turns that channel off for each mapped event; a category with no row keeps 2.0's default.

**D-145 · Webhook outcomes.** `lead_created` → `created`; `duplicate` → `duplicate`; `invalid` · `unauthorized` · `rate_limited` → none (D-182).

**D-146 · Approval.** `quoteApprovalRequired` true / absent → `'required'`; false → `'not-required'`.

**D-147 · Prepared by.** `team_list` → `team`; `studio_only` → `studio`; `first_assignee` → `member` (map 04:29).

**D-148 · Webhook platform.** `generic · google_ads · meta` → the same (`lib/settings/types.ts:178`).

**D-149 · Funnel position → stage.** leads D §3.4 D (not repeated).

### 5.4 Units and semantics

| Id | Concept | 1.0 | 2.0 | Mapping |
|---|---|---|---|---|
| D-150 | Ids | uuid; `*_by` = `profiles.id`; assignee links = `studio_members.id` | text; `members.id` | keep the `studio_members.id` string; map `profiles.id` through `(studio_id, user_id)` |
| D-151 | Time | timestamptz | unix **seconds** in columns — but **milliseconds** inside `settings.lead_capture` (`Date.now()`: `app/leads/capture-actions.ts:65, 94, 125`) | `Date.parse(ts) / 1000`, or `Date.parse(ts)` for the capture JSON |
| D-152 | Money | approval thresholds in dollars (dead); `tax_rate` a fraction | `quotes.gst_pct` 9 per quote | nothing to carry (D-122) |
| D-153 | Phones | `profiles.phone` E.164 | none for members; `settings.studio.phone` as printed ("6222 0188") | D-105 |
| D-154 | Colours | categories, roles, funnel buckets | `members.color` only | D-107 |
| D-155 | Lengths | no caps | sources 40 characters / 40 entries; reasons 40 / 30; custom-field label 60, options 20, value 300; specialty 120; webhook label 80, notes 200, log 50; trades 60; trade note 600; entities 6 (`lib/settings/types.ts:106, 113, 146-157, 245-258`; `app/settings/actions.ts:171-177`; `app/leads/actions.ts:296-298`; `app/company/members-actions.ts:53`; `lib/templates/brand.ts:43`) | truncate and log |
| D-156 | Absent keys | several `features` mean **on** when absent (D-24) | each parse has its own default (D-40) | write every key explicitly |
| D-157 | Region | per studio | Singapore | SG only (D-211) |
| D-158 | Storage | jsonb, text[] | JSON in text columns | `JSON.stringify` |
| D-159 | Granularity | one bag per studio | one row per key | write each key whole, never a partial object |
| D-160 | Name collisions | `settings.quote_approval` = the thresholds object; `studios.lead_sources` = a dead column | `settings.quote_approval` = `'required' \| 'not-required'`; `settings.lead_sources` = the live list | a key-by-key copy would store the object and `parseQuoteApproval` would read `'required'` (`lib/settings/types.ts:41-43`) — map by meaning (D-215) |
| D-161 | Roles | several tags | one role | D-140 |
| D-162 | Entities | rows with ids, one default, soft-deleted | ≤ 6 in a list, the first is the studio, hard-removed, linked by name | D-213 |

---

## 6. Port plan

A port is a one-shot import of one 1.0 studio's Accounts Setup and Settings data into 2.0, run **before** the Leads port (leads D §3.4), the Quotes port (map 06) and the Templates port (map 04), which all need members, entities and the lead vocabulary in place. Ids keep the 1.0 UUID strings, so a re-run is `INSERT OR IGNORE` / an upsert by key; times are `Date.parse(ts) / 1000` (milliseconds inside `lead_capture`); every `*_by` becomes a `members.id`. Nothing below is built until the owner marks it.

### 6.A New 2.0 tables or settings keys

None is required. Each row names what would need one and the alternative that needs none.

| Id | 1.0 store | Why 2.0 would need it | Shape | Alternative |
|---|---|---|---|---|
| D-170 | `studio_roles` + the member overrides | only with a permissions editor or custom roles | `roles (id, name, permissions JSON)`; `members.permission_overrides` | **not needed**: leads Q-40 holds it, custom roles applied to nobody in 1.0 (D-05), and the four roles are the owner's call |
| D-171 | the region columns | only to port a studio outside Singapore | `settings.studio_region {countryCode, currencyCode, timezone, locale}` | **not needed**: port SG studios only (D-211) |
| D-172 | `lead_categories` | — | — | **not needed**: write-only in 1.0 (D-09) |
| D-173 | `settings.quote_approval` (thresholds) · the Quote Sharing keys | — | — | **not needed**: dead (QE Q-24; templates Q-09) |
| D-174 | `studio_member_requests` · `studio_invitations` | only if 2.0 adds people itself | — | **not needed**: Platform (D-66) |

### 6.B Columns and JSON fields to add to existing 2.0 stores

| Id | 2.0 store | 1.0 source | Field | Type | Note |
|---|---|---|---|---|---|
| D-175 | `members` | `studio_members.is_active` | `is_active` (1.0's name) | boolean NOT NULL default true | lets a removed member who authored ported leads, notes, tasks or quotes keep their name without appearing in any picker (every `select … from members` then filters it). Alternative: land their authorship on the Owner and log it — attribution is lost |
| D-176 | `members` | `studio_members.title`; `profiles.phone` | `title` · `phone` | text | only if 2.0 prints a job title or a member's own number; 2.0 prints the role and the studio's phone |
| D-177 | `settings.brand.details.entities[]` | `studio_companies.is_active` | `retired` | boolean | keeps an inactive entity that ported quotes still name, out of the Issuing Entity picker. Alternative: drop it and let those quotes fall back to entity 0 (`lib/templates/data.ts:53`), logged |
| D-178 | `entities[]` | `tax_rate` · `country_code` · `currency_code` | `gstPct` · `country` · `currency` | number · text | only for an entity that is not 9 % GST in Singapore; else `quotes.gst_pct` per quote |
| D-179 | `entities[]` | `bank_details.branch · payeeNotes`; `branding.contactPhone · contactEmail · website · tagline · footerText` | the same names | text | only if an entity prints them; the studio-level fields exist |
| D-180 | `entities[]` | `studio_companies.id` | `id` | text | a rename then keeps quotes linked (templates D-126). Alternative: names as keys, and a rename rewrites `quotes.issuing_entity` |
| D-181 | `settings.quote_rules` | `workflow.approvers.quoteApproval[]` | `approverIds` | `string[]` | 1.0 lists several approvers. Alternative: the first listed member who is neither Owner nor Admin becomes `backupApproverId`, the rest logged |
| D-182 | `settings.lead_capture.webhookLog[]` | `lead_webhook_log.outcome` | `outcome` + `'invalid' \| 'unauthorized' \| 'rate_limited'` | TS union | only to keep failed deliveries; else drop them and count them in the port log |
| D-183 | `settings.lead_capture.webhooks[]` | `lead_webhook_endpoints.signing_secret` | `key` | — | **do not copy a secret into a plain settings row**: land `key: null` and flag the Google Ads endpoints "rotate to see a key" |
| D-184 | `lead_custom_fields.field_type` | `'file'` | — | — | **not needed**: never rendered (D-12) |
| D-185 | `settings.notification_rules` | `digest_mode` · `recipient_roles` | `digest` · `recipients` | per event | leads Q-43 hold; logged |
| D-186 | `settings.lead_reasons.lost[]` | `requiresProof` · `fields` | — | — | **not needed**: 2.0 asks its two details by name (D-134) |
| D-187 | `members` | `studio_members.joined_at` | `joined_at` | integer ts | only if 2.0 shows tenure |

### 6.C Not ported

| Id | 1.0 table / column / rows | Reason |
|---|---|---|
| D-190 | `studio_roles` (every era's rows), `studio_members.role_id` | **superseded** / **dead** (D-05, D-64) |
| D-191 | `permission_overrides` · `workflow_overrides` | **hold** (leads Q-40); the port log names every member who had one and what it granted |
| D-192 | `lead_categories` | **write-only** — nothing reads it (D-09) |
| D-193 | `settings.quote_approval` (thresholds, reasons, approver role) | **dead** (QE Q-24) |
| D-194 | `quoteSharingMethod` · `quoteLinkExpiryDays` · `quoteShare_*` | **dead** (templates Q-09) |
| D-195 | `ads_enabled` · `id_buddy_enabled` (write-only) · `catalogue_files` · `studios.lead_sources` (dead) | nothing acts on them (D-20, D-02) |
| D-196 | `features.lead_journey_mode` · `journey.steps` (and the lead artifacts); `features.duplicate_detection_enabled`; `features.lead_manager_hierarchy` | **superseded**: Journey mode is out (map 02:19); detection is always on; the hierarchy is `members.manager_id` + `lead_visibility` |
| D-197 | `studio_lead_funnel` | **superseded** by 2.0's stages (map 02:23) |
| D-198 | `usage_events` · `usage_daily_rollup` · `auth_sessions` | **Platform** (D-08) |
| D-199 | `studio_invitations` · `studio_member_requests` · the request e-mail | **Platform** (D-06) |
| D-200 | `lead_webhook_endpoints.signing_secret` · `created_by`; `lead_webhook_log.payload_excerpt` · `error_message` · `lead_id` | **Platform** / privacy — the excerpt holds homeowners' contact details (D-28) |
| D-201 | `email_connections` tokens and sync state; `email_sync_log` | **Platform** (map 02:28) |
| D-202 | `notification_preferences.digest_mode` · `recipient_roles` · the `sms` rows; `customer_notification_preferences` | **hold** / **Later** |
| D-203 | `studio_companies.numbering`; `country_code` · `currency_code` · `tax_rate` and the branding extras unless D-178 · D-179; inactive rows unless D-177 | **dead** / conditional |
| D-204 | `studios.plan_id · status · verification_status · supported_countries · setup_completed_at`, `settings.is_demo · page_visibility`; `chat_identity_*` · `logo_url` · `portal_slug` | **Platform** / **Later** |
| D-205 | `studio_members.close_rate · projects_last_12_months · active_projects_count` (2.0 derives them), `invitation_*`, `role`, `joined_at` (unless D-187) | **derived** / **Platform** / **dead** |
| D-206 | `profiles.phone` · `avatar_url` (unless D-176); `auth.users` | **missing** / **Platform** |
| D-207 | custom fields of type `file` and any values on them | never rendered (D-12) |
| D-208 | browser storage | a browser's convenience (D-19) |
| D-209 | custom-field values already deleted by 1.0's save | nothing to recover (D-12) — the port log counts fields with no values |

### 6.D The order a studio's settings land

| Id | Step | Rows written | Rules |
|---|---|---|---|
| D-210 | Before | — | nothing: these settings land first. The Leads port needs members, sources, reasons and custom-field definitions; the Quotes port members, entities and the approval rule |
| D-211 | Classify | — | one studio at a time; `country_code = 'SG'`, else stop (D-171); count every store of §1 into the port log |
| D-212 | Members | `members` | one row per active `studio_members` row, and per inactive one that any ported record names (D-175, else its records go to the Owner + log). `id` = `studio_members.id`; `name` = `profiles.full_name`; `email` = `profiles.email` (NOT NULL in 1.0); `role` by D-140 — an accounting-only member lands only when referenced, inactive, as Designer, logged; `accepting_leads`; `lead_preferences` by D-143; `specialty` (≤ 120); `color` = 2.0's palette in order (a naming choice); `is_you` = the member whose `user_id` = `studios.owner_id`; `manager_id` — 1.0 keeps no member-to-manager link: with `lead_manager_hierarchy` on, a Designer's manager is the Manager who owns (`leads.owning_manager_id`) most of the leads they are on — an inference for the owner to confirm, else NULL; the signature — typed with the name when an active `member_signatures` row exists, else unset (the owner's call; contracts D-43). Keep the `profiles.id → members.id` map for every `*_by` column in the later ports |
| D-213 | The studio and its entities | `settings.studio`, `settings.brand` | `brand.details.entities` = the default entity first (it becomes the studio — its name is forced to `details.name`), then the other active entities by name, ≤ 6 (more → log); fields by D-115…D-128; bank from `bank_details`, PayNow from `settings.payment_details.paynow_id`, the QR and logo images copied into 2.0's assets (map 04). `details.name` = the default entity's `name` (what 1.0 printed as the issuer), `studios.name` logged when it differs — a naming choice; `settings.studio = {name: details.name, gstRegistered: the default entity's gst_registered, phone: settings.branding.companyPhone}` (map 04 for the rest of `details`) |
| D-214 | Lead settings | `settings.lead_sources`, `lead_reasons`, `stage_movement`, `lead_visibility`, `lead_custom_fields`, `lead_capture` | `lead_sources`: the active taxonomy rows in `order_index`, then the inactive ones and every `leads.source` value not listed as `retired: true` (so a lead's own source stays pickable), ≤ 40 (map 02:24). `lead_reasons.lost` from `journey.inactivationReasons` (D-134), else the defaults; `hold` = the defaults (leads Q-05). `stage_movement`: the owner's call — Classic's dropdowns move a lead anywhere with no server ordering (leads audit S-07), which is closer to `'flexible'`; 2.0's default is `'linear'`. `lead_visibility`: `'assigned'` (D-141), the owner's call. Custom fields: active and inactive definitions, ids and order kept, `file` fields skipped (D-207); the values land with the leads. `lead_capture.webhooks` from every endpoint (revoked → `active: false`), counters kept, `key: null` (D-183), the token kept so a future receiver answers the ad platforms already set up; `webhookLog` the newest 50 created / duplicate rows with the lead's name; `email` per map 02:28 |
| D-215 | Quote settings | `settings.quote_approval`, `quote_rules`, `trades`, `trade_notes` | `quote_approval` from `workflow.quoteApprovalRequired` (absent → `'required'`), **never** from 1.0's `quote_approval` object (D-160); `quote_rules.backupApproverId` by D-181; `quote_rules.preparedBy` by D-147; `trades` + `trade_notes` from `studio_quote_categories` (map 04:27); `template_approval` left unset (1.0 had none); `quote_numbering` per map 06:19. Templates, packages, the price book: maps 04 · 06 · 08 |
| D-216 | Notifications | `settings.notification_rules`, `message_templates` | channels by D-144; `untouchedMinutes` · `stopWhenClosed` at 2.0's defaults (no 1.0 source); the studio's own `notification_templates` rows mapped to 2.0's event × channel, their `{{variables}}` rewritten to 2.0's fields, unknown ones logged |
| D-217 | What is not written | port log | every row of 6.C with its count and reason |
| D-220 | Check — the signed-in member | port log | exactly one member with `is_you`, and an Owner; the stand-in `SESSION_MEMBER_ID` (`lib/db/session.ts:12`, used by 23 files) pointed at it — otherwise every action stamps a `'dane'` that is not a member |
| D-221 | Check — roles | `npm run db:repair`'s checks | every role is one of the four (`scripts/repair-demo-data.ts:1278`); every `manager_id` names a Manager (`:1277`); preferences are JSON (`:1340`); at least one Owner |
| D-222 | Check — entities | port log + `:1281` · `:1331` | `settings.studio.name` = `brand.details.name` = `entities[0].name`; ≤ 6 entities with unique names; every ported quote's `issuing_entity` names one of them (else it silently prints entity 0) |
| D-223 | Check — sources | port log | every source on a ported lead is in `lead_sources` |
| D-224 | Check — custom fields | `:1341` | every value names an existing field; none on a `file` field |
| D-225 | Check — approval | port log | `settings.quote_approval` parses as `'required'` or `'not-required'` |
| D-226 | Check — e-mails | `:1330` | every member has an e-mail (from `profiles.email`), so repair R36 invents none (D-232) |
| D-227 | Check — lengths | port log | every truncation of D-155 listed |
| D-228 | What changes for the studio | — | roles collapse to four and nobody's custom role or override survives; approval becomes Owners, Admins and one backup; Approval Rules and Quote Sharing disappear — they never acted; values lost to 1.0's custom-field save stay lost; the region is Singapore; Journey mode and the configurable funnel give way to 2.0's stages |

### 6.E Demo data — 1.0 seeds vs 2.0 seeds and repairs

| Id | 1.0 seed (`path:lines`) | What it writes | 2.0 counterpart | Fit |
|---|---|---|---|---|
| D-230 | `013:43-77` | Arthaus: three lead categories, four custom fields (`Unit Type` dropdown required, `Move-in Date`, `Referral Source Details`, `Priority Score`), a settings bag holding an AI prompt, the approval thresholds the Approval Rules form also falls back to (`ACC:322-328`) and a chat identity | none: the baseline has 0 custom fields (D-46); categories are not ported (D-192) | 2.0 shows an empty Custom fields card; to demo it, create fields through `saveCustomFields` and values on leads through the form (REG-343) |
| D-231 | `090:129-397`; `109`; `256`; `274:40-44`; `127` | for every studio existing then: the default funnel, the four roles, fifteen quote categories, nine (+2) lead sources, project types, escalation categories, the workflow defaults; one default entity per studio | R23 (`studio`), R31 (`brand`), R36 (e-mails, the studio as its first entity), R39 (the Manager and his team), R44 (specialties, preferences, the question bank), R45 (the webhook and its arrival in Review) | 2.0's seeds are curated demo records that pass their own checks; 1.0's are per-studio defaults |
| D-232 | — | — | **Repair rules that would touch a ported studio:** R23 · R31 are `INSERT OR IGNORE` (ported rows survive); R35 names every unauthored text and task template's author `'dane'` (`:887-888`) and R34 every contract's (`:871`) — a dangling id unless the `is_you` member is `dane`; R36 gives members without an e-mail `{first name}@demostudio.sg` (`:795-799`) — harmless only when D-226 holds; R39 · R44 target the demo's ids (no-ops elsewhere); R27 gives the `is_you` member a typed signature from their own name | run `db:repair` after a port only with D-220 and D-226 true, and with R34 · R35's fallback author pointed at the `is_you` member |
| D-233 | — | — | **Which settings the demo needs:** `studio` and `brand` (checks `:1315`, `:1327`, `:1331`, `:1281`); the `is_you` member with a signature (`:1322`); every member with an e-mail (`:1330`); a Manager with a team (R39; `:1277`); the Google Ads webhook (R45) so Integrations and Review agree; `lead_reasons` saved. Left at their defaults: `lead_sources`, `lead_visibility`, `quote_approval`, `template_approval`, `quote_numbering`, `trades`, `trade_notes`, `quote_rules`, `notification_rules`, `message_templates` | — |
| D-234 | — | — | `fixtures/baseline.json` (`takenAt` 2026-09-24T23:37:56Z): `settings` 5 · `members` 6 · `lead_custom_fields` 0 · `studio_scope_questions` 11 · `users` · `organizations` · `memberships` 0; *Reset prototype to base* restores it | a ported studio is not the demo: `npm run db:baseline` after a port would make it the base — keep the two apart |
| D-235 | the four role shapes (D-05) | a studio's permissions depend on its creation era | the four fixed roles, the same for every studio | the port does not read them (D-190) |
| D-236 | `093` | Patio Architects' members with titles and specialties, `studios.logo_url` | — | a tenant onboarding, not demo data; titles would need D-176 |

## Uncertain / not verified

- **Row counts.** No 1.0 database was queried: how many studios carry custom roles, overrides, several approvers, inactive members or entities, non-SG regions, custom fields with surviving values, webhook endpoints, notification overrides or a manager hierarchy is unknown.
- **The findings read from code, not executed:** the self-escalation through `PATCH /api/identity/members` and the owner's deactivation (D-35 #1 — from the route and the `studio_members` policy, `226:36-69`); the custom-field save wiping every value (D-12 — from `033:23-44` and `090:27`); the default entity demoted by an edit (D-07 — from the route and the form; no trigger other than `updated_at` exists in `126`); the Quote Sharing switches that can only turn off (D-20). A test on a 1.0 staging studio would settle each.
- **`125`'s backfill** leaving the `090` role rows without four entity objects (D-05) follows Postgres's documented `jsonb_set` behaviour (every step before the last must exist); not run.
- **Which environments carry which seeds.** `093` (the `title` and `logo_url` columns) is a tenant-onboarding migration in the production set; whether every fork applied it, and which era's role rows each studio has, is not recorded in either set.
- **"Never read" / "no writer"** for `role_id`, `studios.lead_sources`, `catalogue_files`, `ads_enabled`, `id_buddy_enabled`, the Quote Sharing keys, the approval thresholds, `studio_lead_funnel.version` and `lead_categories` are greps of `src/` at this commit; an SQL console, a script, an agent tool or another branch could touch them.
- **The removed member's cookie** (D-30): read from `session.ts`, `api-auth.ts`, `proxy.ts` and the login route; no revocation store was found in the request path (`auth_sessions` is read by analytics only).
- **`lead_preferences` vocabularies**: the design-style lists of 1.0's region config and 2.0's `STYLE_OPTIONS` were not compared value by value; D-143's "matched by name" leaves the misses to the port log.
- **The manager inference** in D-212 is a proposal from 1.0's lead-level hierarchy (`leads.owning_manager_id`); how Dyel's data would split is unverified.
- **2.0 is moving.** The working tree carries uncommitted rounds (the X-Ray round landed repair R54 while this was read); line numbers are as read on 2026-09-25. The baseline's `takenAt` (2026-09-24T23:37:56Z) is later than the X-Ray slice's.
- **2.0's foreign keys.** As in the X-Ray slice: `lib/db/index.ts` sets no `PRAGMA foreign_keys`, so whether `ON DELETE CASCADE` on `lead_custom_field_values.field_id` fires outside a migration is not verified; `saveCustomFields` deletes the removed fields inside a transaction and relies on it.
- **Naming choices for the owner:** `details.name` from the default entity (D-213), the members' colours and signatures (D-212), `stage_movement` and `lead_visibility` (D-214), D-144's category-to-event mapping, the fate of accounting-only and removed members (D-212, D-175).
