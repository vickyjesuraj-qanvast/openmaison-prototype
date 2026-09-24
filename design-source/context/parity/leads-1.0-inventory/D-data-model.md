# Inv-D — Data model: OpenMaison 1.0 leads schema → 2.0 (column-level diff)

Reader: data model. Repo A = `/Users/vicky/Documents/GitHub/qanvast-id-tool` (1.0, Supabase Postgres). Repo B = `/Users/vicky/Documents/GitHub/openmaison-prototype` (2.0, Drizzle + libSQL). Written 2026-09-24. Nothing in either repo was modified; no scripts were run; no `.env` was read.

## 0. Sources, method, conventions

### 0.1 Which 1.0 migrations are "effective"

1.0 has **two migration sets**, and the effective schema is their **union**:

| Set | Files | Role (per `docs/DEVELOPER_HANDBOOK.md` §"IMPORTANT: Copy to scripts/migrations/ for production deployment" and `docs/DATABASE_SCHEMA.md` §20) |
|---|---|---|
| `supabase/migrations/` | 102 files, `20240101000001_enums.sql` … `20260521000003_…` | the local (`supabase db reset`) set; applied in filename order |
| `scripts/migrations/` | 381 files, `001_enums.sql` … `313_merge_vendors_fn.sql` (+ `_down.sql` twins, seeds, tests) | the **production** set, applied by hand with `node scripts/runners/run-sql.js scripts/migrations/<file>.sql`, "sequentially" |

The first ~25 files are the same content under both numberings (001…025 ↔ `20240101000001…22`). After that they diverge:

- **Only in `scripts/migrations/`** (never copied back): everything the Leads code actually reads — `015_lead_bucket_columns` (also in supabase as `…16`), `050_email_connections`, `051_email_lead_status`, `074_leads_property_type_text`, `089_remove_enum_constraints`, `090_studio_customization_engine` (funnel, roles, taxonomies, custom-field values), `091_lead_source_to_text`, `092_lead_archived_at`, `095a/b` (country), `131_multi_assignment` (`lead_assignees`), `133_lead_webhooks`, `154`, `171`, `175`, `178_leads_journey_foundation` (`lead_artifacts`, `lead_outreach_attempts`), `181`, `183/184`, `188`, `203`, `206`, `207`, `253`, `262_lead_tat_stamps`, `263`, `274_ad_lead_integration`, `282`, `294`, `296_lead_manager_hierarchy`, and the quote↔lead mirror triggers `103`, `105`, `158`, `202`, `254`, `303`, `304`, `307`.
- **Only in `supabase/migrations/`** (dated files): the homeowner portal (`20260323000001`), scope questionnaire (`20260503000010/13`, `20260520000001/2`), quote v2 (`20260414…`, `20260415…`), `quote_xrays` (`20260519000001`), the new `notifications` (`20260314000001`), `area_unit` (`20260404195917`), `key_collection_date → text` (`20260407100000`), `signature_certificate` (`20260406000001`), `prepared_by_display` (`20260520000003`), and the homeowner auto-bind triggers (`20260521000001/2/3`). The production set *assumes* these exist (its `151`, `206`, `217`, `218`, `226`, `229` lock/alter those tables), so they were applied to production too.
- The brief said "102 files in `supabase/migrations/`" — that set alone does **not** produce the schema `src/types/database.ts` and the API routes use (`archived_at`, `bucket`, `lead_assignees`, `engagement_state`, …). This document therefore reads **both sets** and cross-checks every column against `src/types/database.ts` (`DbLead` etc.), which is the runtime contract.

Where the two sets disagree on the *same* table (only `notifications`), see §5 Uncertain.

### 0.2 Id and timestamp conventions

| | 1.0 (Postgres) | 2.0 (libSQL) |
|---|---|---|
| Primary keys | `uuid DEFAULT gen_random_uuid()` everywhere; `profiles.id` = `auth.users.id`; `plans.id` is text. Seeds use structured uuids (`d0000000-0000-0000-0000-000000000001` studio, `e0000000-…` members, `c0000000-…` profiles, `f0000000-000S-0000-0000-0000000000NN` leads). | `text` everywhere. `members.id` are slugs (`dane`, `james`, `sarah`, `michelle`, `germaine`, `alex`); every other row id is a `randomUUID()` string written by the server action (seeds may use readable ids). No DB-side default for ids. |
| Foreign keys | Declared, with `ON DELETE CASCADE` (child rows) / `SET NULL` (soft links). Some are deliberately soft (no FK): `hangout_meetings.lead_id`, `quotes.lead_id`, `quote_line_items.price_book_item_id`, `homeowner_scope_responses.answered_by_id`. | Declared via `.references()` with `onDelete` on lead-child tables; several cross-links are plain text ids (`quotes.template_id`, `contracts.template_id`, `notifications.lead_id`, `lead_tasks.creator_id`). |
| Timestamps | `timestamptz` (UTC, ISO strings over PostgREST); `created_at`/`updated_at NOT NULL DEFAULT now()`; **no `updated_at` trigger on `leads`** (app-managed). Follow-ups use `date` + `time` columns. | `integer` unix **seconds** (`{ mode: 'timestamp' }`); read/written as `Date`. Only `users/organizations/memberships` have `DEFAULT (unixepoch())` — every domain table sets `created_at` in code. `fixtures/baseline.json` carries `demoDay` and `restoreBaseline` shifts every timestamp so "today" stays today. |
| Money | `integer` dollars on `leads.budget`; `NUMERIC(12,2)` on quote lines; `BIGINT` cents (`*_cents`) on `quotes`. | `integer` cents (`*_minor`) everywhere. |
| Phone | free text (`+6591001001`, `+65 9123 4567`, `91234567` all occur); homeowner profiles get the E.164 canonical form via `normalize_phone_to_e164()`. | bare 8 digits (`91234567`), `+65` implied; validated by `isSgPhone` (6/8/9 first digit). |
| Tenancy | every table carries `studio_id`; RLS + `get_my_studio_ids()`; `country_code` per row. | single studio; no tenant column; the studio is `settings.studio`. |

---

## Part 1 — 1.0 effective schema for the leads domain

### 1.1 Enums, CHECK constraints and code-defined value sets (verbatim)

**Postgres enums** (`001_enums.sql`):

| Enum | Values | Still in use? |
|---|---|---|
| `lead_status` | `'new','assigned','contacted','meeting','proposal','signed','returned','archived'` | type of `leads.status` — **legacy**; the app writes only `'new'` / `'assigned'` / `'contacted'` (`create` and `follow-up` routes); the bucket triple below is the real state |
| `lead_temp` | `'hot','warm','cold'` | `leads.temp` |
| `lead_source` | `'qanvast','instagram','referral','walk_in','facebook','organic'` + `'hangout'` (046) + `'website'` (075) | the enum type still exists but `leads.source` was converted to `TEXT DEFAULT 'Organic'` (091) |
| `property_type` | `'HDB/Apartment','Condo','Landed Property','Commercial'` | `leads.property_type` converted to `TEXT` (074); values in data are codes: `hdb_3_room`, `hdb_4_room`, `hdb_5_room`, `bto_4_room`, `condo`, `penthouse`, `landed`, `landed_terrace`, `commercial`, `commercial_office` (seeds + `src/lib/leads/normalize-property-type.ts`) |
| `member_role` | `'owner','interior_designer','support_staff'` | `studio_members.role`, kept for back-compat; `tags` is the real role |
| `refund_status` | `'pending','approved','rejected'` | `refund_requests.status` |
| `notification_type` (old) | `'lead_assigned','lead_stage_changed','refund_submitted','refund_approved','refund_rejected','escalation_created','escalation_updated','message_received','project_milestone','ai_insight','billing_reminder','system'` | the 010 `notifications` table; superseded by the 20260314 table (text `event_type`) |
| `quote_status` | `'draft','sent','accepted','rejected','expired'` + (102) `'submitted','approved','sent_for_signature','client_signed'` | `quotes.status`; mirrored as text into `leads.quote_status` |

**CHECK constraints / column comments on lead tables:**

| Column | Allowed values | Source |
|---|---|---|
| `leads.ai_intent_score`, `leads.ai_fit_score` | `BETWEEN 0 AND 100` | 004 |
| `leads.quote_status` | `none \| draft \| submitted \| approved \| rejected` (017) → + `sent_for_signature \| client_signed` (043) → **CHECK dropped** (089); code still writes exactly these; the mirror trigger writes `quotes.status::text` | 017 · 043 · 089 |
| `leads.email_lead_status` | `pending_review \| approved \| rejected \| NULL` (non-email leads) | 051 comment |
| `leads.engagement_state` | `NULL \| 'active' \| 'awaiting_client' \| 'stalled' \| 'on_hold'` | 178 CHECK |
| `leads.closed_reason_code` | `lost_competitor, budget_mismatch, postponed, unresponsive, not_a_fit, client_cancelled, other` | 178 comment + `src/lib/leads/journey.ts` |
| `leads.journey_overrides` | `{ "<stepId>": { done, by, at, reason } }`; step ids `assigned, outreach, site_visit, concept, floor_plan, quote, contract, signed` | 178 comment + `journey.ts` |
| `leads.hold_prev_state` | `{ bucket, leadStatusCode, subStatusCode }` | 253 |
| `leads.ad_metadata` | `{ platform, campaign_id?, form_id?, adgroup_id?, gcl_id?, api_version? }` | 274 + `docs/rules/leads.md` |
| `leads.quote_metadata` | `{ gstEnabled?: bool\|null, docDiscount?: {type:'percent'\|'flat', value}\|null, layoutOverrides?, themeOverrides?, canvaBlocks?, canvaOverrides? }` | 171 + `DbLead` |
| `lead_artifacts.kind` | `'file' \| 'link' \| 'note' \| 'tool'` | 178 CHECK |
| `lead_outreach_attempts.channel` | `'whatsapp' \| 'call' \| 'email' \| 'sms' \| 'in_person' \| 'other'` | 178 CHECK |
| `lead_outreach_attempts.outcome` | `NULL \| 'no_answer' \| 'replied' \| 'callback_requested' \| 'not_interested' \| 'connected'` | 178 CHECK |
| `lead_outreach_attempts.ai_parse` | `{ status: 'pending'\|'done'\|'not_applicable'\|'failed', summary, suggestedAttemptedAt, suggestedTasks[], actionedTaskIndexes[], dateDecision: 'applied'\|'dismissed'\|null, dismissed, parsedAt }` | 263 |
| `lead_webhook_endpoints.platform` | `'generic' \| 'google_ads' \| 'meta'` (default `generic`) | 274 CHECK |
| `lead_webhook_log.outcome` | `'lead_created' \| 'duplicate' \| 'invalid' \| 'unauthorized' \| 'rate_limited'` | 133 comment |
| `lead_custom_fields.field_type` | `text \| number \| dropdown \| date` (seed) — free text column, default `'text'` | 013 |
| `studio_members.tags` | `tags <@ ARRAY['owner','admin','id','accounting','manager']` | 016 → 129 → 296 |
| `tasks.type` | `General \| LeadFollowUp \| QuoteApproval \| TimelineApproval \| ProgressReview \| MilestoneApproval` (free text, default `'General'`) | 030 + seeds |
| `tasks.status` | `NotStarted \| InProgress \| Completed` (free text, default `'NotStarted'`); `approval_status` `pending \| approved \| rejected` | 030 + seeds |
| `quote_signature_requests.status` | `pending \| viewed \| signed \| expired`; `signing_mode` `single \| bundle \| variations`; `verification_method` default `'phone_otp'` | 042 · 161 · 20260406 |
| `notifications.channel` | `'email','in_app','sms','whatsapp'`; `status` `'pending','sent','failed','read'` | 20260314 |
| `notifications.event_type` (leads) | `lead.captured`, `lead.assigned`, `lead.status_changed`, `lead.followup_reminder` | `src/lib/notifications/events.ts` |
| `notification_preferences.category` | `'leads'\|'quotes'\|'invoices'\|'purchase_orders'\|'finance_ops'\|'projects'\|'tasks_escalations'\|'team'\|'hangouts'` | 20260314 |
| `homeowner_scope_responses.source` | `'studio' \| 'homeowner'` | 20260520000001 |
| `studio_scope_questions.question_type` | `'text','yes_no','number','single_select','multi_select','date'` | 20260503000013 |
| `homeowner_project_links.role` | default `'primary'` (no CHECK; `'co_owner'` reserved per comment) | 20260323 |
| `lead_activity_log.action` | free text. Patterns written by code: `Lead created from <Source>`, `Assigned to <Name>`, `Status changed: A → B`, `Stage moved to <Status>`, `Stage moved to Contacted`, `lead_closed:<reasonLabel>`, `journey_step:<stepId>:<done\|undone>`, `Refund request submitted`, `AI follow-up message sent to homeowner`, `Entity migrated to <companyId>`, quote-comment `add\|reply\|edit\|delete` | 004 + grep of `src/app/api/leads` |

**The bucket / status / sub-status vocabulary** — `leads.bucket`, `leads.lead_status_code`, `leads.sub_status_code` are unconstrained `text`; the default funnel seeded into `studio_lead_funnel.config` (090) is:

| bucket (`color`, `requiresAssignment`) | status (`flags`) | sub-statuses |
|---|---|---|
| `NEW` "New" (`#5500FF`, false) | `UNASSIGNED` "Unassigned" · `ASSIGNED` "Assigned" | — |
| `ONGOING` "Ongoing" (`#469E59`, **true**) | `FOLLOW_UP` "Follow-Up" (followUpRequired) | `FIRST_CONTACT` "First contact pending" · `AWAITING_REPLY` "Awaiting reply" · `SITE_VISIT` "Site visit scheduled" |
| | `CONTACTED` "Contacted" (followUpRequired) | `AWAITING_RESPONSE` "Awaiting response" · `CALLBACK_SCHEDULED` "Callback scheduled" |
| | `QUOTE_CREATED` "Quote Created" (requiresApprovedQuote) | `QUOTE_SENT` "Quote sent" · `QUOTE_REVISED` "Quote revised" |
| | `MET` "Met" | `PROPOSAL_DISCUSSED` "Proposal discussed" · `PENDING_DECISION` "Pending decision" |
| `ON_HOLD` "On Hold" (`#F19E2B`, false) | `HOLD_1M` "For 1 Month" · `HOLD_1_3M` "1 - 3 Months" · `HOLD_3_6M` "3 - 6 Months" · `HOLD_6_9M` "6 - 9 Months" · `HOLD_9M_PLUS` "> 9 Months" (all followUpRequired) | each: `CLIENT_NOT_READY` "Client not ready" · `BUDGET_REVIEW` "Budget review" · `SCOPE_CHANGE` "Scope change" |
| `CLOSED` "Closed" (`#999999`, false) | `SIGNED` "Signed" (requiresApprovedQuote + requiresContract + requiresProjectType) | `CONTRACT_SIGNED` "Contract signed" · `DEPOSIT_RECEIVED` "Deposit received" |
| | `INACTIVE` "Inactive" | `BUDGET_CONSTRAINTS` "Budget constraints" · `WENT_COMPETITOR` "Went with competitor" · `UNRESPONSIVE` "Unresponsive" · `NOT_A_FIT` "Not a fit" |
| | `PROJECT_CREATED` "Project Created" | `PROJECT_STARTED` "Project started" · `HANDOVER_IN_PROGRESS` "Handover in progress" · `COMPLETED_HANDOVER` "Completed handover" |

Per-status flags: `followUpRequired`, `requiresApprovedQuote`, `requiresContract`, `requiresProjectType`; per-bucket `requiresAssignment`. Code refers to these ids literally in places (`PROJECT_STARTED`, `SIGNED`, `QUOTE_CREATED`, `CONTACTED`, `UNASSIGNED`, `FOLLOW_UP`, `FIRST_CONTACT`) and resolves the rest through `src/lib/leads/funnel-transitions.ts` (`resolveIntakeTarget`, `resolveHoldBucket`, `resolveClosedTarget`, `resolveSignedTarget`). Legacy `status` → bucket backfill (015): new+unassigned→NEW/UNASSIGNED, assigned→NEW/ASSIGNED, contacted→ONGOING/CONTACTED, meeting→ONGOING/MET, proposal→ONGOING/QUOTE_CREATED, signed→ONGOING/SIGNED, returned|archived→CLOSED/INACTIVE. (Note the 015 backfill runs *before* the lead seeds, so `023`'s 50 leads carry `bucket NULL`; the app's `deriveBucketAndStatus`/`getLeadBucket` resolve NULL to NEW.)

**Seeded taxonomies** (`studio_taxonomies`, per studio): `lead_source` = Qanvast, Instagram, Referral, Walk-in, Facebook, Organic, Hangout, Website, Email (090) + Google Ads (order 100), Meta Ads (101) (274); `project_type` = Renovation-Full Home, New-Full Home, Renovation-Partial, New-Partial, Commercial, Others; `escalation_category` = Timeline Delay, Material Issue, Client Complaint, Budget / Admin. `studios.lead_sources text[]` (003) still defaults to `['qanvast','instagram','referral','walk_in','facebook','organic']` but is superseded.

**Lead-related keys in `studios.settings` JSONB** (`DbStudioSettings`): `workflow.{ quoteApprovalRequired, contractRequired, projectTypeRequired, timelineApprovalRequired, progressReviewRequired, milestoneApprovalRequired, poAccountsReviewRequired, expenseApprovalRequired, commissionApprovalRequired, autoCreateFollowUps, requireAssignment }` (all `true` by default, 090); `features.{ lead_journey_mode, duplicate_detection_enabled (default ON), lead_manager_hierarchy, lock_quote_actions_until_approved, … }`; `ai_assignment_prompt` (text); `quote_approval.{ auto_approve_below, require_approval_above, approver_role, notify_on_rejection, rejection_reasons[] }`; `branding.quotePreparedByMode` `'team_list' | 'studio_only' | 'first_assignee'`; `proactive_alerts`. `studio_roles.permissions.actions.leads = { create, edit, delete, assign }` and `dataScope: 'all' | 'assigned'` (seeded roles `owner`, `admin`, `id`, `accounting`).

### 1.2 Tables — effective column lists

Notation: `column · type · null/default · meaning`. "FK" = declared foreign key with its ON DELETE rule. Migration numbers in brackets are `scripts/migrations/` unless prefixed `sb:` (supabase/migrations dated file).

#### `leads` (004 → 015 → 017 → 042 → 050 → 051 → sb:20260404 → sb:20260407 → 074 → 089 → 091 → 092 → 095a/b → 154 → 171 → 175 → 178 → 181 → 183/184 → 188 → 253 → 262 → 274 → 294 → 296)

| column | type | null / default | meaning |
|---|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` | |
| `studio_id` | uuid | NOT NULL, FK studios CASCADE | tenant |
| `assigned_to` | uuid | null, FK studio_members SET NULL | **deprecated mirror** of the first-added `lead_assignees.member_id` (131) |
| `owning_manager_id` | uuid | null, FK studio_members SET NULL (296) | the `manager`-tagged member the lead was routed through; keeps the manager's visibility after a manager→designer handoff; only with `features.lead_manager_hierarchy` |
| `name` | text | NOT NULL | |
| `email` | text | null | |
| `phone` | text | null | free format; trigger derives the E.164 homeowner profile |
| `budget` | integer | null | SGD whole dollars (`parseLeadBudgetString` writes a number; the schema doc's "TEXT" is stale) |
| `property_type` | text (was enum) | null | region codes (`hdb_4_room`, `condo`, …) |
| `area` | text | null | location / estate ("Tampines"); 20260508 copies it into `projects.property_address` |
| `property_status` | text | null | `BTO` / `Resale` / `New Launch` |
| `style_preference` | text | null | design style |
| `area_sqft` | integer | null | |
| `area_unit` | text | default `'sqft'` (sb:20260404) | `sqft` \| `sqm` |
| `key_collection_date` | date → **text** (sb:20260407) | null | region-specific labels ("Collected", "in 3 months") |
| `property_address` | text | null (188) | freeform property address (distinct from `area`) |
| `notes` | text | null | general notes; placeholder leads carry `Auto-created from project: …` |
| `additional_info` | text | null | extra textarea |
| `status` | `lead_status` enum | NOT NULL default `'new'` | legacy stage (see §1.1) |
| `source` | text (was enum) | NOT NULL default `'Organic'` (091) | a `studio_taxonomies.lead_source` name |
| `bucket` | text | null | funnel bucket id (`NEW` …) |
| `lead_status_code` | text | null | funnel status id |
| `sub_status_code` | text | null | funnel sub-status id |
| `next_follow_up_date` | date | null | required when the status has `followUpRequired` |
| `next_follow_up_time` | time | null | |
| `temp` | `lead_temp` enum | null | AI intent temperature `hot/warm/cold` |
| `temp_reason` | text | null | |
| `ai_intent_score` | integer | null, CHECK 0–100 | |
| `ai_fit_score` | integer | null, CHECK 0–100 | |
| `ai_reason` | text | null | |
| `ai_draft_message` | text | null | AI first-outreach draft |
| `ai_draft_generated_at` | timestamptz | null | |
| `qanvast_lead_id` | integer | null | Qanvast marketplace lead number |
| `project_type` | text | null (017) | a `studio_taxonomies.project_type` name; required for SIGNED |
| `quote_status` | text | default `'none'`; CHECK dropped (089) | mirror of the primary quote's status (triggers §1.3); `none/draft/submitted/approved/rejected/sent_for_signature/client_signed`; set NULL when the last primary quote is deleted (304) |
| `quote_data` | jsonb | null (017) | legacy single-quote line-item snapshot (`paymentSchedule` inside; retention rows stripped by sb:20260506) |
| `quote_metadata` | jsonb | NOT NULL default `'{}'` (171) | per-quote GST / discount / layout overrides (shape §1.1) |
| `quote_hierarchy_metadata` | jsonb | NOT NULL default `'{"sections":[]}'` (183) | quote section/subsection hierarchy |
| `quote_valid_until` | date | null (181) | "VALID" header field |
| `customer_id` | text | null (181) | studio-assigned customer ref ("CUST ID") |
| `ic_number` | text | null (175) | client NRIC/IC for the quote header (`SXXXX259Z`) |
| `contract_uploaded` | boolean | NOT NULL default false (017) | required for SIGNED; set true by `finalize_signed_mirror` |
| `contract_file_name` | text | null (017) | `'client-signed-quote.pdf'` after e-sign |
| `signature_request_id` | uuid | null, FK quote_signature_requests (042) | the active signing request |
| `company_id` | uuid | null, FK studio_companies SET NULL (154) | issuing legal entity (multi-entity) |
| `possibly_duplicate` | boolean | default false (050) | dedupe flag (phone/email match) |
| `duplicate_of_lead_id` | uuid | null, FK leads (050) | the lead it collided with |
| `needs_attention` | boolean | default false (050) | parse problems on email ingestion |
| `email_source_message_id` | text | null (050) | Gmail message id the lead was parsed from |
| `email_lead_status` | text | null (051) | `pending_review/approved/rejected` for email leads |
| `external_lead_id` | text | null (274); UNIQUE `(studio_id, external_lead_id)` partial | ad-platform lead id (Google `lead_id`) for idempotent retries |
| `ad_metadata` | jsonb | null (274) | attribution only (shape §1.1) |
| `archived_at` | timestamptz | null (092) | soft archive; hidden from the board; purgeable after 30 days; default read filters `archived_at IS NULL` (282) |
| `country_code` | text | NOT NULL (095b); BEFORE INSERT trigger fills from studio, default `'SG'` | locked once a project exists |
| `engagement_state` | text | null, CHECK (178) | Journey Mode engagement, orthogonal to `temp` |
| `hold_restart_date` | date | null (178) | required when `engagement_state='on_hold'` |
| `hold_prev_state` | jsonb | null (253) | pre-hold funnel position stash |
| `closed_reason_code` | text | null (178) | structured inactivation reason |
| `closed_reason_detail` | jsonb | null (178) | reason-specific fields (competitor name, budget delta, restart date, free text) |
| `journey_overrides` | jsonb | NOT NULL default `'{}'` (178) | per-step manual marks; merged atomically by `merge_journey_override()` |
| `first_assigned_at` | timestamptz | null (262) | TAT stamp, write-once |
| `first_outreach_at` | timestamptz | null (262) | TAT stamp = earliest `lead_outreach_attempts.attempted_at` |
| `first_outreach_by` | uuid | null, FK profiles (262) | who performed the first outreach |
| `signed_at` | timestamptz | null (262) | conversion moment (e-sign or first move into SIGNED) |
| `agent_idempotency_key` | text | null (294); UNIQUE `(studio_id, agent_idempotency_key)` | mAIson Bot retry dedupe |
| `created_at` | timestamptz | NOT NULL default `now()` | |
| `updated_at` | timestamptz | NOT NULL default `now()` | app-managed (no trigger) |

Indexes: `(studio_id)`, `(studio_id, status)`, `(assigned_to)`, `(source)`, `(created_at DESC)`, `(archived_at) WHERE NOT NULL`, `(studio_id) WHERE archived_at IS NULL`, `(country_code)`, `(company_id) WHERE NOT NULL`, `(studio_id) WHERE hierarchy non-empty`, unique `(studio_id, external_lead_id) WHERE NOT NULL`, unique `(studio_id, agent_idempotency_key)`, `(studio_id, owning_manager_id)`.

#### `lead_activity_log` (004)

| column | type | null / default | meaning |
|---|---|---|---|
| `id` | uuid | PK | |
| `lead_id` | uuid | NOT NULL, FK leads CASCADE | |
| `action` | text | NOT NULL | free-text event (patterns §1.1) |
| `performed_by` | uuid | null, FK profiles SET NULL | NULL = system / AI |
| `performed_at` | timestamptz | NOT NULL default `now()` | |

Index `(lead_id, performed_at DESC)`. No `studio_id`; RLS scopes through `leads`. Written app-side only (no trigger).

#### `lead_files` (004 → 207)

| column | type | null / default | meaning |
|---|---|---|---|
| `id` | uuid | PK | |
| `lead_id` | uuid | NOT NULL, FK leads CASCADE | |
| `studio_id` | uuid | NOT NULL, FK studios CASCADE | |
| `file_name` | text | NOT NULL | |
| `file_url` | text | NOT NULL | Supabase Storage URL in bucket `lead-files` |
| `file_size` | bigint | null | bytes |
| `mime_type` | text | null | |
| `uploaded_by` | uuid | null, FK profiles SET NULL | |
| `uploaded_at` | timestamptz | NOT NULL default `now()` | |
| `is_homeowner_visible` | boolean | NOT NULL default false (207) | opt-in to the homeowner portal's Documents |

Flat (no folders, no soft delete). Partial index `(lead_id) WHERE is_homeowner_visible`.

#### `lead_assignees` (131)

| column | type | null / default | meaning |
|---|---|---|---|
| `id` | uuid | PK | |
| `lead_id` | uuid | NOT NULL, FK leads CASCADE | |
| `member_id` | uuid | NOT NULL, FK studio_members CASCADE | studio_members.id (not profiles.id) |
| `commission_split_bps` | int | NOT NULL default 10000 | share of commission in basis points |
| `added_at` | timestamptz | NOT NULL default `now()` | ordering = "first-added" mirror |
| `added_by` | uuid | null, FK profiles SET NULL | |

UNIQUE `(lead_id, member_id)`; indexes `(lead_id, added_at)`, `(member_id)`. Source of truth for assignment; `leads.assigned_to` mirrors the first row.

#### `lead_outreach_attempts` (178 → 263)

| column | type | null / default | meaning |
|---|---|---|---|
| `id` | uuid | PK | |
| `lead_id` | uuid | NOT NULL, FK leads CASCADE | |
| `studio_id` | uuid | NOT NULL, FK studios CASCADE | |
| `channel` | text | NOT NULL, CHECK (§1.1) | |
| `outcome` | text | null, CHECK (§1.1) | |
| `attempted_at` | timestamptz | NOT NULL default `now()` | user-entered, backdatable (server rejects future) |
| `notes` | text | null | |
| `artifact_id` | uuid | null, FK lead_artifacts SET NULL | the evidence (screenshot) |
| `performed_by` | uuid | null, FK profiles | |
| `created_at` | timestamptz | NOT NULL default `now()` | |
| `ai_parse` | jsonb | null (263) | AI parse of a chat screenshot (shape §1.1) |

"Unresponsive" inactivation is gated behind N attempts (default 3). Feeds `first_outreach_*` stamps and the journey `outreach` step.

#### `lead_artifacts` (178)

| column | type | null / default | meaning |
|---|---|---|---|
| `id` | uuid | PK | |
| `lead_id` | uuid | NOT NULL, FK leads CASCADE | |
| `studio_id` | uuid | NOT NULL, FK studios CASCADE | |
| `journey_step` | text | NOT NULL | step id (§1.1) |
| `kind` | text | NOT NULL, CHECK `file/link/note/tool` | |
| `file_id` | uuid | null, FK lead_files SET NULL | kind=file |
| `url` | text | null | kind=link |
| `note` | text | null | kind=note |
| `tool_ref` | jsonb | null | kind=tool (native tool output ref) |
| `label` | text | null | |
| `created_by` | uuid | null, FK profiles | |
| `created_at` | timestamptz | NOT NULL default `now()` | |

Indexes `(lead_id)`, `(lead_id, journey_step)`.

#### `lead_custom_fields` (013) and `lead_custom_field_values` (090)

`lead_custom_fields`: `id` uuid PK · `studio_id` uuid NOT NULL FK CASCADE · `label` text NOT NULL · `field_type` text NOT NULL default `'text'` · `options` text[] null (dropdown choices) · `is_required` boolean default false · `order_index` int NOT NULL default 0 · `is_active` boolean default true · `created_at` timestamptz default now(). Replaced wholesale by RPC `save_lead_custom_fields(p_studio_id, p_fields jsonb)` (delete-then-insert).

`lead_custom_field_values`: `id` uuid PK · `lead_id` uuid NOT NULL FK leads CASCADE · `field_id` uuid NOT NULL FK lead_custom_fields CASCADE · `value` jsonb null · UNIQUE `(lead_id, field_id)`; index `(lead_id)`.

Seed (demo studio): `Unit Type` dropdown [1-Room…Maisonette] required · `Move-in Date` date · `Referral Source Details` text · `Priority Score` number.

#### `lead_categories` (013)

`id` uuid PK · `studio_id` uuid NOT NULL FK CASCADE · `name` text NOT NULL · `color` text NOT NULL default `'#0d9488'` · `order_index` int NOT NULL default 0 · `is_active` boolean default true · `created_at` timestamptz default now(). RPC `save_lead_categories`. Seed: Residential `#0d9488`, Commercial `#6366f1`, Landed `#d97706`. **No column on `leads` references a category** — it is Accounts-page configuration only.

#### `studio_lead_funnel` (090)

`id` uuid PK · `studio_id` uuid NOT NULL FK CASCADE, UNIQUE · `config` jsonb NOT NULL (`{ buckets: [{ id, label, color, order, requiresAssignment, statuses: [{ id, label, order, followUpRequired, requiresApprovedQuote, requiresContract, requiresProjectType, subStatuses: [{ id, label, order }] }] }] }`) · `version` int default 1 · `created_at` · `updated_at`. Seeded with the default funnel for every studio; `PUT /api/studio-config/funnel` validates and 409s when a delete would strand leads.

#### `pipeline_stages` (003) — legacy

`id` uuid PK · `studio_id` FK CASCADE · `name` text · `slug` text · `color` text default `'#94a3b8'` · `order_index` int NOT NULL · `is_active` boolean default true · UNIQUE `(studio_id, order_index)`. RPC `save_pipeline_stages`. Seeded 8 rows per studio: New/new `#94a3b8`, Assigned/assigned `#3b82f6`, Contacted `#f59e0b`, Meeting `#a855f7`, Proposal `#6366f1`, Signed `#22c55e`, Returned `#DB382A`, Archived `#6b7280`. Pre-bucket model; the board no longer reads it.

#### `studio_taxonomies` (090)

`id` uuid PK · `studio_id` FK CASCADE · `type` text NOT NULL (`lead_source` \| `project_type` \| `escalation_category` \| …) · `name` text NOT NULL · `is_active` boolean default true · `order_index` int default 0 · `metadata` jsonb null · UNIQUE `(studio_id, type, name)`; index `(studio_id, type)`.

#### `refund_requests` (005 → 128) + `refund_reasons` (002)

`refund_requests`: `id` uuid PK · `lead_id` uuid NOT NULL **UNIQUE** FK leads CASCADE (one refund per lead) · `studio_id` NOT NULL FK CASCADE · `reason_id` uuid FK refund_reasons SET NULL · `reason_text` text NOT NULL · `sub_reasons` text[] NOT NULL default `'{}'` · `notes` text · `status` `refund_status` NOT NULL default `'pending'` · `is_urgent` boolean NOT NULL default false · `filed_by` uuid FK profiles SET NULL · `reviewed_by` uuid FK admin_users SET NULL (the Qanvast admin) · `rejection_reason` text · `filed_at` timestamptz NOT NULL default now() · `reviewed_at` timestamptz · `company_id` uuid FK studio_companies SET NULL (128). Indexes `(studio_id)`, `(status)`. This is 1.0's "Return lead to Qanvast".

`refund_reasons`: `id` uuid PK · `reason` text NOT NULL · `sub_reasons` text[] NOT NULL default `'{}'` · `is_active` boolean · `order_index` int · `created_at`. Seed (platform-wide): **Unresponsive Lead** [No reply after 3 attempts · Phone disconnected · Email bounced · Wrong contact details]; **Not Qualified** [Budget too low for scope · Already hired another ID · Not a genuine enquiry · Outside service area]; **Duplicate Lead** [Same as existing lead · Already contacted by studio · Submitted multiple times]; **Other** [Incorrect property type listed · Commercial enquiry sent to residential studio · Spam or test submission · Other reason].

#### `lead_webhook_endpoints` (133 → 274) and `lead_webhook_log` (133)

`lead_webhook_endpoints`: `id` uuid PK · `studio_id` FK CASCADE · `token` text UNIQUE NOT NULL (the public URL `/api/webhooks/leads/[token]`) · `source_label` text (tags incoming leads, e.g. "Meta Ads") · `notes` text · `is_active` boolean NOT NULL default true · `signing_secret` text (HMAC `X-Signature`, or Google's body key) · `total_received` int NOT NULL default 0 · `total_leads_created` int NOT NULL default 0 · `total_duplicates` int NOT NULL default 0 · `last_received_at` timestamptz · `created_at` · `created_by` uuid FK profiles SET NULL · `platform` text NOT NULL default `'generic'` CHECK (274). Counters bumped by `increment_lead_webhook_counters(p_endpoint_id, p_lead_created, p_duplicate)`.

`lead_webhook_log`: `id` uuid PK · `endpoint_id` uuid NOT NULL FK CASCADE · `received_at` timestamptz NOT NULL default now() · `outcome` text NOT NULL (§1.1) · `lead_id` uuid FK leads SET NULL · `payload_excerpt` jsonb (first ~2 KB) · `error_message` text. Index `(endpoint_id, received_at DESC)`.

#### `email_connections` and `email_sync_log` (050 → 095a)

`email_connections`: `id` uuid PK · `studio_id` FK CASCADE · `provider` text NOT NULL default `'gmail'` · `email_address` text NOT NULL · `access_token_enc` text NOT NULL · `refresh_token_enc` text NOT NULL · `token_expiry` timestamptz · `sender_domains` text[] NOT NULL default `['@homereno.sg','@homerenoguru.sg','@houzz.com','@houzz.com.sg','@renopedia.sg','@qanvast.com']` · `custom_domains` text[] NOT NULL default `'{}'` · `last_sync_at` timestamptz · `last_sync_message_id` text · `status` text NOT NULL default `'active'` · `error_message` text · `country_code` text null (095a) · `created_at` · `updated_at` · UNIQUE `(studio_id, email_address)`.

`email_sync_log`: `id` uuid PK · `connection_id` FK CASCADE · `synced_at` · `emails_found` int · `leads_created` int · `duplicates_found` int · `parse_failures` int · `errors` jsonb · `processed_message_ids` text[]. The cron (`/api/cron/poll-emails`) creates leads with `email_source_message_id`, `email_lead_status='pending_review'`, dedupe flags.

#### Homeowner portal tables that reference a lead (sb:20260323 → 151 → sb:20260510000003 → sb:20260520000002 → 273 → sb:20260521000001/2/3)

`homeowner_profiles`: `id` uuid PK · `studio_id` uuid NOT NULL FK CASCADE (151; UNIQUE `(studio_id, phone)`) · `phone` text NOT NULL (E.164 canonical) · `name` text NOT NULL · `email` text · `avatar_url` text · `created_at` · `updated_at`.

`homeowner_project_links`: `id` uuid PK · `homeowner_id` uuid NOT NULL FK CASCADE · `project_id` uuid **nullable** (sb:20260510) FK projects CASCADE · `studio_id` NOT NULL FK CASCADE · `lead_id` uuid FK leads SET NULL · `role` text default `'primary'` · `portal_token` text · `chat_history_visible` boolean default false · `is_active` boolean default true · `linked_at` timestamptz NOT NULL default now() · `last_questionnaire_invite_at` timestamptz (sb:20260520000002; 5-minute invite throttle) · `last_seen_at` timestamptz (273, per `DbHomeownerProjectLink`) · CHECK `hpl_project_or_lead (project_id IS NOT NULL OR lead_id IS NOT NULL)` · unique partials `(homeowner_id, project_id) WHERE project_id NOT NULL`, `(homeowner_id, lead_id) WHERE project_id IS NULL AND lead_id NOT NULL`, `(studio_id, lead_id) WHERE lead_id NOT NULL AND role='primary'`. **Every lead with a phone gets a profile + primary link automatically** (trigger §1.3).

`homeowner_notifications` (150 → 206): `id` · `homeowner_id` NOT NULL FK CASCADE · `project_id` nullable FK CASCADE · `studio_id` NOT NULL · `lead_id` uuid FK leads CASCADE (206) · `type` text (`update | milestone_status | selection_shared | vo_pending | invoice_sent | …`) · `title` NOT NULL · `body` · `action_url` · `entity_type` · `entity_id` uuid · `is_read` boolean NOT NULL default false · `read_at` · `created_at` · CHECK `(project_id IS NOT NULL OR lead_id IS NOT NULL)`.

Questionnaire (scope answers) — keyed on the link, so lead-stage answers live under the lead-only link: `studio_scope_questions` (sb:20260503000013): `id` · `studio_id` FK · `question` text NOT NULL · `question_type` text CHECK (§1.1) · `options` jsonb · `is_required` boolean default false · `is_enabled` boolean default true · `sort_order` int NOT NULL default 0 · `created_at`. `homeowner_scope_responses` (sb:20260503000010 → sb:20260520000001): `id` · `homeowner_id` FK CASCADE · `project_link_id` FK CASCADE · `question_id` text NOT NULL · `response` jsonb NOT NULL · `created_at` · `updated_at` · `source` text NOT NULL default `'homeowner'` CHECK · `answered_by_id` uuid (profiles.id when studio, homeowner_profiles.id when homeowner) · `answered_at` timestamptz NOT NULL default now() · UNIQUE `(project_link_id, question_id)`. `homeowner_scope_response_history`: `id` · `project_link_id` FK CASCADE · `question_id` · `response` jsonb · `source` CHECK · `answered_by_id` · `recorded_at`; index `(project_link_id, question_id, recorded_at DESC)`.

#### `quote_signature_requests` (042 → sb:20260406 → sb:20260414000005 → sb:20260415000001 → 113 → 119 → 120 → 128 → 161 → 246 → sb:20260520000003) — the lead-keyed e-signature record (1.0's "contract")

| column | type | null / default | meaning |
|---|---|---|---|
| `id` | uuid | PK | |
| `lead_id` | uuid | NOT NULL, FK leads CASCADE | |
| `studio_id` | uuid | NOT NULL, FK CASCADE | |
| `token` | text | NOT NULL UNIQUE | the public URL `/sign/[token]` |
| `status` | text | NOT NULL default `'pending'` | `pending \| viewed \| signed \| expired` |
| `client_name` | text | NOT NULL | |
| `client_phone` | text | null | OTP target |
| `quote_snapshot` | jsonb | NOT NULL | line items frozen at send (bundle/variations: `QuoteSnapshotEntry[]`) |
| `quote_total` | numeric(12,2) | null | |
| `studio_name` | text | null | |
| `expires_at` | timestamptz | NOT NULL | 7 days from creation |
| `signed_at` | timestamptz | null | |
| `signature_data` | text | null | base64 PNG of the drawn signature |
| `signer_ip`, `signer_user_agent` | text | null | evidence |
| `document_hash`, `signing_hash` | text | null (sb:20260406) | DocuSign-style integrity |
| `audit_trail` | jsonb | default `'[]'` | appended atomically by `append_signature_audit_event(p_id, p_event)` |
| `signer_phone`, `signer_timezone` | text | null | |
| `verification_method` | text | default `'phone_otp'` | |
| `client_selections` | jsonb | null (sb:20260414000005) | `{ selectedPackageId, optionalItemsAccepted[] }` |
| `quote_id` | uuid | null (sb:20260415000001) | primary quote; mirrors `quote_ids[0]` |
| `quote_ids` | uuid[] | NOT NULL default `'{}'` (161) | every quote covered |
| `signing_mode` | text | NOT NULL default `'single'` (161) | `single \| bundle \| variations` |
| `selected_quote_id` | uuid | null (161) | chosen by the client in `variations` mode |
| `payment_schedule` | jsonb | null (113) | milestone snapshot |
| `signed_pdf_url` | text | null (119) | Storage URL in bucket `signed-quotes` |
| `documents` | jsonb | NOT NULL default `'[]'` (120) | `SigningDocument[]` (T&Cs, contract, CaseTrust…) |
| `signed_packet_path` | text | null (246) | combined signed PDF |
| `document_acknowledgements` | jsonb | NOT NULL default `'[]'` (246) | `{ id, hash, viewedAt?, acceptedAt? }[]` |
| `company_id` | uuid | null, FK studio_companies SET NULL (128) | issuing entity |
| `prepared_by_display` | text | null (sb:20260520000003) | frozen "Prepared by" string |
| `created_at` | timestamptz | NOT NULL default now() | |

Indexes `(lead_id)`, `(token)`, `(company_id) WHERE NOT NULL`.

#### `notifications` (sb:20260314 shape → 110 → sb:20260323 → 271) — lead-related columns

`id` uuid PK · `studio_id` NOT NULL FK CASCADE · `recipient_id` uuid FK profiles SET NULL · `recipient_email` text (never returned to the client) · `recipient_phone` text (110; WhatsApp/SMS E.164) · `event_type` text NOT NULL (`lead.captured`, `lead.assigned`, `lead.status_changed`, `lead.followup_reminder`, …) · `channel` text CHECK · `title` text (nullable since 271) · `body` text (nullable since 271) · `action_url` text · `entity_type` text · `entity_id` uuid (the lead) · `status` text default `'pending'` CHECK · `is_read` boolean NOT NULL default false · `read_at` · `sent_at` · `error_message` · `retry_count` int NOT NULL default 0 · `digest_date` date · `fire_at` timestamptz (110; scheduled) · `metadata` jsonb default `'{}'` · `homeowner_recipient_id` uuid FK homeowner_profiles SET NULL · `created_at`.

`notification_preferences`: `id` · `studio_id` · `category` text (`'leads'` …) · `channel` CHECK · `enabled` boolean default true · `digest_mode` boolean default false · `recipient_roles` text[] default `'{owner}'` (leads seed: `{owner,admin}`) · timestamps · UNIQUE `(studio_id, category, channel)`. `notification_templates`: `studio_id` nullable (NULL = platform base) · `event_type` · `channel` default `'email'` · `subject` · `body_html` · `body_text` · `variables` jsonb · `is_active` · UNIQUE `(studio_id, event_type, channel)`; base template `lead.assigned` (variables `assignee_name, lead_name, project_type, budget, action_url`).

#### Other tables — **linking columns only**

| table | lead-linking columns | notes |
|---|---|---|
| `tasks` (030 → 131 → 137/138/139 → sb:20260509 → 294) | `lead_id` uuid FK leads SET NULL · `lead_name` text (denormalised at creation) · `type` = `'LeadFollowUp'` for the follow-up task · `planned_date` date + `planned_time` time (the follow-up moment) · `related_entity_id` text · `assignee_user_id` (profiles.id) / `task_assignees(task_id, profile_id, added_at)` / `assignee_name` · `studio_id` | "Saving with follow-up creates/updates a `LeadFollowUp` task" (`docs/rules/leads.md`; `workflow.autoCreateFollowUps`) |
| `projects` (006 → 017 → sb:20260508) | `lead_id` uuid FK leads SET NULL; copies `customer_phone ← leads.phone`, `customer_email ← leads.email`, `property_type ← leads.property_type::text`, `property_address ← leads.area`, `project_type ← leads.project_type` at creation (backfilled by sb:20260508000001) | "Convert to project" parks the lead at CLOSED/SIGNED/PROJECT_STARTED |
| `quotes` (006 → sb:20260415000001 → 103/105/158) | `lead_id` uuid (nullable, added without FK) · `is_primary` boolean (partial UNIQUE one primary per lead) · `status` mirrored into `leads.quote_status` · `label`, `quote_type` (`standard \| variation`) | `quote_line_items.lead_id` uuid FK CASCADE + `studio_id` (031); `quote_versions.lead_id` NOT NULL FK CASCADE, UNIQUE `(lead_id, version_number)` (sb:20260414000002); `quote_packages.lead_id` NOT NULL FK CASCADE (sb:20260414000005) |
| `conversations` (008) | `lead_id` uuid FK leads SET NULL | WhatsApp-style chat per lead |
| `project_rooms` (sb:20240201000002) / `render_jobs` | `lead_id` uuid FK leads SET NULL | AI render visualizer at lead stage |
| `hangout_meetings` (040) | `lead_id` uuid, **no FK** | the lead created from a Hangout meeting |
| `copilot_sessions` (076 → sb:20260510000001) / `meeting_briefs` (077) / `copilot_objection_log` (sb:20260419) | `lead_id` uuid FK leads (nullable since sb:20260510000001; CASCADE / plain / plain) | mAIson Live meeting co-pilot |
| `quote_xrays` (sb:20260519) | `lead_id` uuid FK leads SET NULL | Quote X-Ray sessions |
| `lead_webhook_log`, `homeowner_project_links`, `homeowner_notifications`, `lead_custom_field_values`, `lead_assignees`, `lead_outreach_attempts`, `lead_artifacts`, `refund_requests`, `lead_activity_log`, `lead_files` | see their own sections | |
| `audit_log` (010) / `usage_events` (236) | `entity_type`/`entity_id` text pointers | not lead-specific |

#### Member / studio columns that are lead configuration

- `studio_members`: `tags text[]` (CHECK ⊂ owner/admin/id/accounting/manager) · `role_id` uuid FK `studio_roles` (090) · `accepting_leads boolean NOT NULL default true` (sb:20260402; index `(studio_id, accepting_leads) WHERE is_active`) · `lead_preferences jsonb` (`{ property_type: 25, budget: 25, design_style: 20, area: 15, scope: 15 }` weights for AI allocation; NULL = not configured) · `specialty`, `close_rate`, `projects_last_12_months`, `active_projects_count` · `title`, `invitation_status`, `invited_at`, `invited_by`.
- `studios`: `lead_sources text[]` (003, legacy) · `settings jsonb` (013; keys §1.1) · `country_code`/`currency_code`/`timezone`/`locale` (073, defaults SG/SGD/Asia/Singapore/en-SG) · `supported_countries text[]` (095a) · `setup_completed_at` (090) · `portal_slug` (sb:20260503000017).

### 1.3 Triggers, functions and views implementing lead logic

| Object | On | Does | Source |
|---|---|---|---|
| `auto_bind_homeowner_for_lead()` — triggers `trg_auto_bind_homeowner_after_lead_insert` (AFTER INSERT) and `trg_auto_bind_homeowner_after_lead_phone_update` (AFTER UPDATE OF phone WHEN changed) | `leads` | for any lead with a phone: find-or-create `homeowner_profiles (studio_id, phone=E.164)` and a `homeowner_project_links` row `role='primary', portal_token=gen_random_uuid()::text, chat_history_visible=true, is_active=true, lead_id=NEW.id`; on a phone edit, re-points the existing primary profile's phone (unique violation surfaces to the caller). SECURITY DEFINER. | sb:20260521000001, body replaced by sb:20260521000002 |
| `normalize_phone_to_e164(p_phone, p_country_code)` IMMUTABLE | — | strips non-digits; SG→`+65` (8 local digits), MY→`+60` (10), AE→`+971` (9), IN→`+91` (10); unknown → SG | sb:20260521000002 |
| `leads_fill_country_code()` — `trg_leads_fill_country_code` BEFORE INSERT | `leads` | `country_code := studio.country_code`, else `'SG'` | 095a |
| `leads_lock_country()` — `trg_leads_lock_country` BEFORE UPDATE | `leads` | raises when `country_code` changes and a project references the lead | 095b |
| `sync_lead_status_to_primary_quote()` — `trg_sync_lead_to_primary_quote` AFTER UPDATE OF quote_status | `leads` | copies `leads.quote_status` (`none`→`draft`) onto the primary quote's `status` | 103 |
| `sync_primary_quote_to_lead_status()` / `sync_on_primary_flag_change()` — AFTER UPDATE OF status / is_primary | `quotes` | the primary quote's status → `leads.quote_status` | 103 |
| `sync_lead_quote_status()` — `trg_sync_lead_quote_status_iud` AFTER INSERT OR UPDATE OF status, is_primary, lead_id OR DELETE | `quotes` | v1 (158): stamps the remaining primary's status; v2 (304): on DELETE of the last primary, sets `leads.quote_status = NULL` | 158 → 304 |
| `finalize_signed_mirror(p_lead_id, p_studio_id, p_quotes_to_mark uuid[])` SECURITY DEFINER | RPC from `/api/sign/[token]/submit` | atomically: `leads.quote_status='client_signed', contract_uploaded=true, contract_file_name='client-signed-quote.pdf'`; advances the lead to the bucket that owns `SIGNED` in `studio_lead_funnel.config` (CLOSED on the default funnel; skipped when the funnel has no SIGNED; never regresses `PROJECT_STARTED`); marks quotes `client_signed` and demotes stale signed base quotes to `approved`; v4 treats an empty/unresolvable set as a base signing; v5 also writes `signed_at` | 202 → 244 → 254 → 303 → 307 |
| `set_primary_quote_atomic(p_lead_id, p_quote_id)` | RPC | one UPDATE flips `is_primary` so the mirror fires once | 105 |
| `merge_journey_override(p_lead_id, p_step_id, p_override jsonb)` | RPC | atomic `journey_overrides || {step: override}` | 203 |
| `increment_lead_webhook_counters(p_endpoint_id, p_lead_created, p_duplicate)` | RPC | counters + `last_received_at` | 133 |
| `save_lead_categories`, `save_lead_custom_fields`, `save_pipeline_stages` `(p_studio_id, jsonb)` | RPC | delete-then-insert the studio's list | 022/033 |
| `append_signature_audit_event(p_id, p_event jsonb)` | RPC | atomic append to `quote_signature_requests.audit_trail` | sb:20260406 |
| `get_my_studio_ids()` | RLS helper | studios the JWT user belongs to | 012/013 |

Lead logic that is **app-side, not in the DB** (so it must be re-implemented, not migrated): TAT stamps (`src/lib/leads/tat-stamps.ts`, write-once, best-effort; backfilled once in 262); the follow-up task (`LeadFollowUp`) created when a `followUpRequired` status is saved with `next_follow_up_date/time`; duplicate detection (`src/lib/leads/duplicate-detection.ts`: exact E.164-or-raw phone **or** case-insensitive email, same studio, excluding archived; sets `possibly_duplicate` + `duplicate_of_lead_id`; the webhook always blocks; the other four surfaces obey `features.duplicate_detection_enabled`); activity logging (every route inserts `lead_activity_log` rows itself); journey derivation (`src/lib/leads/journey.ts`, `STALL_AFTER_DAYS = 14`); funnel-aware stage writes (`funnel-transitions.ts`); `updated_at` on leads. There are **no views** in the lead domain.

RLS: enabled on `leads`, `lead_activity_log`, `lead_files`, `refund_requests`, `studio_members`, `studios`, `profiles`, `projects`, `quotes`, `quote_line_items`, `conversations`, `notifications`, `ai_query_log` (012/013, `studio_id IN (SELECT get_my_studio_ids())`); 092 makes phase-0 permissive policies; the 209…235 "lock" series revokes anon/authenticated grants and makes tables server-only (215 `lead_outreach_attempts`, 219 `lead_files`, 221 `lead_artifacts`, 226 tenant tables incl. `leads`, 229 homeowner tables, 264/299/300 fleet remediation). Not ported; noted only.

### 1.4 Storage buckets used by the lead domain

| bucket | public | created | holds |
|---|---|---|---|
| `lead-files` | true | 088 (policies `lead_files_public_read/service_insert/service_delete`) | `lead_files.file_url`; also artifact files (`lead_artifacts.file_id → lead_files`) |
| `signed-quotes` | true, 10 MB, `application/pdf` | 119 | `quote_signature_requests.signed_pdf_url`, signed packets |
| `chat-files` | true, 25 MB | sb:20260324 / 123 | `conversation_files` (lead chats) |
| `copilot-audio` | false | 123 | meeting recordings tied to a lead's copilot session |
| `contract-files`, `task-attachments`, `escalation-attachments`, `expense-receipts` | — | 210, 208, 196, 255 (named from the file names; bodies not opened) | contract uploads, `tasks.supporting_images` |
| `portal-assets` (public), `payment-proofs` (private), `renders`, `studio-assets`, `models`, `project-files`, `studio-materials`, `quote-images`, `price-book-images`, `member-signatures`, `payment-receipts`, `supplier-invoices` | | sb:20260510000002, sb:20260518, 123, 111, 268, 275, 276 | not lead-specific |

233/235/293 privatize the sensitive buckets and close stale public reads.

### 1.5 What the seeds insert for leads

**`supabase/seeds/` (the local set — the one the brief names):**

| file | rows relevant to leads |
|---|---|
| `020_seed_reference.sql` | `plans` 3 (`starter` max_active_leads 20, `pro`, `enterprise`) · `refund_reasons` 4 (ids `a0000000-…01…04`, listed in §1.2) · `admin_users` 2 (`admin@qanvast.com` super_admin, `ops@qanvast.com` admin) · `platform_settings` 5 (`announcement_banner`, `default_ai_prompt`, `refund_auto_approval_threshold`, `feature_flags`, `marketplace_categories`) |
| `021_seed_profiles.sql` | `auth.users` 1 + `profiles` 1: `c0000000-0000-0000-0001-000000000001` "Admin" `admin@openmaison.com` `+6591234001` (header comment promises 25 users; only 1 is inserted) |
| `022_seed_studios.sql` | `studios` 1: **`d0000000-0000-0000-0000-000000000001`**, `name = ''` (blank), owner = the Admin profile, plan `pro`, `active`, `verified`, `chat_identity_name = ''` · `studio_members` 1: `e0000000-0000-0000-0001-000000000001`, role `owner`, tags `{owner,admin,id}`, specialty "Full Renovation" · `pipeline_stages` 8 for that studio (the WHERE lists studios `…01`–`…05` but only `…01` exists) |
| `041_seed_hangout_data.sql` | hangout events/shifts/participations/homeowners/vouchers/meetings — every `hangout_meetings.lead_id` is `NULL` |
| `045_seed_complaint_data.sql` | 5 complaint tickets for the demo studio (3 "Lead Quality"/"Billing" about leads) + messages — no lead rows |
| `050_seed_new_features.sql` | `project_templates`, `project_selections`, `project_files`, `homeowner_profiles`, `homeowner_project_links` (project-scoped) — no lead rows |

**No file in `supabase/seeds/` inserts a row into `leads`** (or `lead_activity_log`, `lead_files`, `refund_requests`, `tasks`). The demo studio starts empty; the `20260521000001` backfill then finds nothing to bind.

**`scripts/migrations/` seed files (production-style demo data, applied in numeric order):**

| file | for demo studio `d0…01` | total |
|---|---|---|
| `013_studio_settings.sql` | `lead_categories` 3 · `lead_custom_fields` 4 · `studios.settings` (ai_assignment_prompt, quote_approval, chat_identity, catalogue_files) | |
| `021/022` | 25 profiles / 5 studios (`d0…01`–`…05`), members, 8 pipeline stages each (per header comments; scripts versions are larger than the supabase ones — not fully read) | |
| `023_seed_leads.sql` | **10 leads** `f0000000-0001-0000-0000-000000000001…10` (Tan Wei Ming … ), spread across legacy `status` new/assigned/contacted/meeting/proposal/signed; columns written: `assigned_to, name, email, phone (+65…), budget (int), property_type (codes), area, status, source (enum), temp, temp_reason, ai_intent_score, ai_fit_score, ai_reason, notes, style_preference, area_sqft, property_status, created_at` — **no `bucket`/`lead_status_code`** | 50 (10 × 5 studios) |
| `025_seed_supporting.sql` | `lead_activity_log` 17 rows on three demo leads (`…03`, `…05`, `…07`) · `refund_requests` 1 (`50000000-…01` on lead `…09`, "Unresponsive Lead", approved) | 3 refunds |
| `034_seed_tasks.sql` | `tasks` 10 (6 `LeadFollowUp`/`General` + 4 approval types); `lead_id NULL`, `lead_name` text only | |
| `083_seed_demo_studios.sql` | nothing for `d0…01`; two more studios (`d0…06`, `d0…07`) **with** `bucket, lead_status_code, sub_status_code, next_follow_up_date/time` on their leads | |
| `090_studio_customization_engine.sql` | per studio: `studio_lead_funnel` 1 · `studio_roles` 4 · `studio_quote_categories` 15 · `studio_taxonomies` 9 lead sources + 6 project types + 4 escalation categories · `settings.workflow` defaults | |
| `100_seed_flo_design.sql` | Flo Design studio (own id) with leads, tasks, copilot sessions, notifications | |
| `274` | + `Google Ads`, `Meta Ads` taxonomies per studio | |
| `sb:20260314000001` | per studio `notification_preferences` 9 categories × 2 channels; 14 base `notification_templates` (`studio_id NULL`) | |

---

## Part 2 — 2.0's current lead schema (`lib/db/schema.ts` incl. uncommitted 0031/0032)

Storage: libSQL, Drizzle. Migrations `drizzle/0000…0032` (journal tags `0028_round1_quotes`, `0029_studio_requests`, `0030_price_book_soft_delete`, **`0031_members_manager`** (`ALTER TABLE members ADD manager_id text`), **`0032_notifications`** — the last two are uncommitted, as are `lib/company/members.ts`, `lib/leads/assign-policy.ts`, `lib/leads/visibility.ts`, `lib/leads/homematch.ts`, `app/leads/capture-actions.ts`, `lib/notifications/*`). Baseline `fixtures/baseline.json` (taken 2026-09-24, `demoDay 2026-09-24`); `lib/db/baseline.ts` `BASELINE_TABLES` lists the 42 live tables.

### 2.1 Tables

**`members`** — `id` text PK (slug) · `name` text NN · `role` text NN (`Owner | Admin | Manager | Designer`, REG-601) · `color` text NN (hex or `'photo'`) · `is_you` bool NN default false (the signed-in member) · **`manager_id` text** (uncommitted, REG-601: the Manager a Designer reports to) · `email` text · `signature_kind` text (`draw | type | null`) · `signature_name` text · `signature_data` text (SVG path). Baseline: dane Owner (you) · james Manager · sarah, michelle Designers → james · germaine, alex Designers.

**`leads`** — `id` text PK · `name` text NN · `phone` text NN (8 digits) · `email` text · `source` text NN (SOURCES) · `property_type` text NN (PROPERTY_TYPES) · `property_address` text · `lead_address` text · `budget_minor` int NN (cents) · `stage` text NN default `'New'` (ALL_STAGES) · `style` text · `key_collection` text · `condition` text · `area_sqft` int · `estimated_start_date` ts · `notes` text · `deleted_at` ts (Deleted Leads folder, purged after 30 days) · `seen_at` ts (null = nobody opened it; the primary band) · `delete_reason` text · `stage_before_delete` text · `created_at` ts NN · `updated_at` ts NN. Indexes `(stage)`, `(deleted_at)`. Baseline: 32 rows (New 9 · Contacted 7 · Met 3 · Quote Sent 3 · Won 3 · On Hold 2 · Lost 5; 8 soft-deleted).

**`lead_assignees`** — `id` text PK · `lead_id` text NN FK leads CASCADE · `member_id` text NN FK members CASCADE · `assigned_at` ts (null on legacy rows = the lead's creation; REG-335) · UNIQUE `(lead_id, member_id)`.

**`stage_logs`** — `id` text PK · `lead_id` text NN FK CASCADE · `from_stage` text NN · `to_stage` text NN · `payload` text/json · `created_at` ts NN. One row per transition (or per correction). Payload shapes by `to_stage`: **Contacted** `{ logs: ContactLog[] }` where `ContactLog = { channel, when, outcome, nextStepWhen, nextStepMode, files[], notes }`; **Met** `{ meetings: MeetingLog[] }` (`{ where, when, files[], notes }`); **Quote Sent** `{ quoteTab: 'system'|'upload', quoteSelected, quoteUploaded, quoteAmount }`; **Won** `{ wonQuoteTab, wonQuote, wonQuoteUploaded, wonQuoteAmount, wonContractTab, wonContract, wonContractUploaded, milestones: [{name, meta, pct}], projectType }`; **New** (assign inside the window) `{ assignees: string[] }`; **On Hold** `{ reason, duration ('1 month'|'3 months'|'6 months'|'Until 15 Dec ’26'), followUpAt }`; **Lost** `{ reason }` (`'Lead returned to Qanvast'` when written by the return wizard); flexible / backward moves `{ quick: true }` (Undo deletes the row). `resumeStage`, the stage timeline, `onHoldFollowUp`, `lastContact` and the Activity feed are all derived from these rows.

**`lead_tasks`** — `id` text PK · `lead_id` text FK CASCADE, **nullable** (null = studio task, REG-466) · `quote_id` text FK quotes SET NULL (the quote whose due date raised it, REG-470) · `title` text NN · `kind` text NN default `'General'` (`General | Call`) · `due_at` ts · `done` bool NN default false · `created_at` ts NN · `creator_id` text · `description` text · `seen_at` ts · `updated_at` ts · `template_id` text. Satellites: `tags(id, name, created_at)`, `task_tags(task_id, tag_id)`, `task_assignees(task_id, member_id)`, `task_comments(id, task_id, author_id FK members, body, created_at, updated_at)`, `task_attachments(task_id, file_id FK lead_files, created_at)`, `task_templates(id, name, keep_members, keep_description, created_at, created_by, updated_at, deleted_at)`, `template_tasks(id, template_id, title, description, kind, sort_order, member_ids JSON, tag_ids JSON, due_days)`.

**`imports`** — `id` · `file_name` NN · `total_rows` NN · `imported_rows` NN · `skipped_rows` NN default 0 · `error_note` · `created_at` NN. **`import_rows`** — `id` · `import_id` FK CASCADE · `data` json NN (record keyed by IMPORT_FIELDS, `__reason` for skips) · `status` text NN default `'pending'` (`pending | duplicate | approved | rejected | merged | skipped`) · `duplicate_of_lead_id` text · `matched_on` text (`'phone' | 'email'`). The website form / Meta arrivals (REG-602) are recorded as one-row imports (`file_name` "Website form · <studio>" / "Meta Lead Ads · <form>").

**`settings`** — `key` text PK · `value` text (JSON) · `updated_at` ts NN. Lead-related keys (`lib/settings/queries.ts`, `lib/notifications/queries.ts`, `lib/templates/brand.ts`): `stage_movement` (`'linear' | 'flexible'`), `quote_approval` (`'required' | 'not-required'`), `template_approval`, `studio` (`{ name, gstRegistered, phone }`), `quote_numbering`, `trades`, `quote_rules` (`{ roundStep, paymentLock, backupApproverId }`), **`lead_sources`** (`LeadSourceEntry[] = { name, retired }`, defaults = SOURCES + TikTok, REG-599), **`lead_visibility`** (`'everyone' | 'assigned'`, REG-601), **`lead_capture`** (`{ emailSlug, meta: { connected, page, forms: [{ id, name, on }] } }`, REG-602), **`notification_rules`** (`{ channels: {event → {in_app, email, whatsapp}}, untouchedMinutes, stopWhenClosed }`), **`message_templates`** (`{ event, channel, subject, body }[]`), `brand`. Baseline holds `stage_movement`, `studio`, `brand`.

**`quotes`** (lead link + lead-facing columns) — `id` · `lead_id` text NN FK leads CASCADE · `number` · `created_by` (members.id) · `title` · `amount_minor` · `visibility` (`Private | Shared`) · `status` (`Draft | Sent for Approval | Approved | Sent to Client | Confirmed | Signed`) · `created_at` · `due_at` · `sent_at` · `updated_at` · `approved_at` · `archived_at` · `deleted_at` · `prepared_by` · `valid_until` · `project_ref` · `nric` · `customer_id` · `property_type` / `site_address` (copied from the lead at creation) · `version` · template/columns/text/signature settings · `confirmed_at`, `confirmed_by` · `client2_name`, `client2_nric`. `quote_versions` is quote-keyed (`quote_id, version, snapshot_json, note, created_by, created_at`). `quote_files(quote_id, file_id FK lead_files)`. `quote_comparisons` (X-Ray) — `lead_id` FK SET NULL, `quote_id` FK SET NULL.

**`contracts`** — `id` · `lead_id` text NN FK CASCADE · `title` · `status` (`Draft | Sent to Client | Signed`) · `created_at` · `sent_at` · `signed_at` · `signed_copy` (file name) · `updated_at` · `archived_at` · `deleted_at` · `body` (HTML with token chips) · `recipient_name` · `recipient_phone` (8 digits, OTP target) · `contract_date` · `template_id` · `from_quote_id` · `source` (`composed | uploaded`) · `file_name` · `issuing_entity` · `reminders` bool · `thank_you` bool · `signed_by` (typed name) · `signed_nric` (masked) · `created_by` · `bundle_id`. **`contract_bundles`** — `id` · `lead_id` NN FK · `recipient_name` · `recipient_phone` · `created_at` · `sent_at` · `signed_at` · `signed_by` · `signed_nric` · `created_by`. The signing link is `/sign/[contractId]` and `/sign/bundle/[bundleId]` (no separate token).

**`lead_files`** — `id` · `lead_id` NN FK CASCADE · `kind` text NN (`folder | image | pdf`) · `name` NN · `thumb` (public asset path) · `created_at` NN · `parent_id` (folder nesting; null = root) · `owner_id` (members.id) · `size_bytes` · `mime` · `updated_at` · `deleted_at` (Trash / "Deleted Files"). No storage URL — the prototype serves `/figma-assets/*`. **`file_comments`** — `id` · `file_id` FK CASCADE · `author_id` NN · `body` · `created_at` · `updated_at`.

**`lead_notes`** — `id` · `lead_id` NN FK CASCADE · `kind` text NN (`note | contact`) · `title` NN default '' · `body` NN default '' (HTML or plain) · `channel` (`WhatsApp | Email | SMS | Call | Others`) · `contacted_at` ts · `outcome` (`Connected | Callback requested | Meeting scheduled | No response`) · `next_step_at` ts · `next_step_mode` (channels + `In person`) · `author_id` · `created_at` NN · `updated_at`. **`note_attachments`** — `note_id` FK CASCADE · `file_id` FK lead_files CASCADE · `created_at`.

**`questions`** — `id` · `lead_id` NN FK CASCADE · `text` NN · `type` NN (`text | number | single | multi | date`) · `options` (JSON string[]) · `answer` (multi: JSON string[]; date: `d/m/yyyy`) · `answered_by` (`studio | client`) · `answered_at` ts · `sort_order` int NN default 0 · `created_at` NN. **`lead_questionnaires`** (`lead_id` PK, `total`, `client_answered`, `studio_answered`, `updated_at`) is a **dead table** (REG-286) — kept only because migrations are additive; counts derive from `questions`.

**`lead_returns`** (the Qanvast return) — `id` · `lead_id` NN FK CASCADE · `status` NN (`processing | rejected | approved`) · `returned_by_id` FK members · `returned_at` ts NN · `reason` text NN · `replied_by` ("Qanvast - Business Team") · `replied_at` · `status_text` ("Return Rejected") · `refund_status` (`credited` …) · `credit_amount_minor` · `appeal_days` · `created_at` NN · `first_outreach_at` ts · `attempts` int (1–4, 5 = "+5") · `comments` · `reply_reason` · `reply_remarks` · `stage_before` (Undo restores) · `stage_log_id` (the Lost move written on return) · `task_id` ("Respond to Qanvast team"). **`return_attachments`** — `return_id` FK CASCADE · `file_id` FK lead_files CASCADE · `created_at`. Listing tags: Return Processing / Return Approved / Return Rejected / Refund Processing / Refund Credited.

**`notifications`** (uncommitted 0032, REG-604) — `id` text PK · `member_id` text NN FK members CASCADE · `kind` text NN (`new_lead | assigned | quote_approval | quote_confirmed | quote_signed | task_due`; `untouched` and `task_due` rows are *derived* at read time, never stored) · `title` NN · `body` · `href` · `lead_id` text · `quote_id` text · `channels` text NN default `'in_app'` (comma-joined subset of `in_app,email,whatsapp`) · `actor_id` text · `created_at` ts NN · `read_at` ts. Index `(member_id, created_at)`.

Not lead-domain but present: `users/organizations/memberships` (provisional auth plumbing, empty in the baseline), quote template / price book / payment template / text template / contract template tables.

### 2.2 Enum value sets (`lib/leads/enums.ts`, verbatim from the mocks)

- `STAGES = ['New', 'Contacted', 'Met', 'Quote Sent', 'Won']`; `INACTIVE_STAGES = ['On Hold', 'Lost']`.
- `SOURCES = ['Qanvast', 'Instagram', 'Referral', 'Walk-in', 'Facebook', 'Organic', 'Hangout', 'Website', 'Email', 'Google Ads', 'Meta Ads', 'Others']` (+ `'TikTok'` in `DEFAULT_LEAD_SOURCE_NAMES`).
- `PROPERTY_TYPE_GROUPS`: HDB 2/3/4/5-Room, HDB Executive · BTO 2/3/4/5-Room · Executive Condo, Condo Studio / 1-bedder, Condo 2/3/4/5-bedder, Penthouse · Landed — Terrace / Semi-D / Bungalow · Commercial — Office / Retail · Others.
- `TEAM` (members seed): dane Owner (you) · james Manager · sarah · michelle · germaine · alex Designers. `ROLES = ['Owner', 'Admin', 'Manager', 'Designer']`.
- `TASK_KINDS = ['General', 'Call']`; `CONTACT_CHANNELS = ['WhatsApp', 'Email', 'SMS', 'Call', 'Others']`; `CONTACT_MODES = [...CONTACT_CHANNELS, 'In person']`; `OUTCOMES = ['Connected', 'Callback requested', 'Meeting scheduled', 'No response']`.
- `HOLD_DURATIONS = ['1 month', '3 months', '6 months']` → 30/90/180 days; custom = `Until <date>`.
- `STYLES_SEEN = ['Contemporary']`, `CONDITIONS_SEEN = ['New']`, `KEY_COLLECTION_SEEN = ['Collected']`.
- Import targets `IMPORT_FIELDS`: Lead Name, Lead Phone Number, Lead Email, Lead Source, Lead Stage, Property Type, Property Address, Lead Address, Estimated Budget (S$), Estimated Start Date, Style, Key Collection, Condition, Area Size, Remarks (+ `Ignore`).
- Quote statuses `Draft | Sent for Approval | Approved | Sent to Client | Confirmed | Signed`; contract statuses `Draft | Sent to Client | Signed`; question types `text | number | single | multi | date`; return statuses `processing | rejected | approved`.

---

## Part 3 — The diff

### 3.1 Table map (1.0 → 2.0)

| 1.0 table | 2.0 equivalent | verdict |
|---|---|---|
| `leads` | `leads` | present, many columns differ (§3.2) |
| `lead_activity_log` | — (Activity is **derived** from every table by `lib/leads/activity.ts`; no event log) | missing |
| `lead_files` | `lead_files` | present, different (folders, soft delete, no URL) |
| `lead_assignees` | `lead_assignees` | present |
| `lead_outreach_attempts` | `lead_notes` where `kind='contact'` (+ the Contacted stage log's `logs[]`) | present as a different table, vocab differs |
| `lead_artifacts` | `note_attachments` / `task_attachments` / `return_attachments` / stage-log `files[]` | partial (file kind only; no journey step, no link/tool kinds) |
| `lead_custom_fields` + `lead_custom_field_values` | — | missing |
| `lead_categories` | — (2.0 `tags` are task tags) | missing |
| `studio_lead_funnel` | fixed `STAGES` + `settings.stage_movement` | missing (by design: the mocks fix the stages) |
| `pipeline_stages` (legacy) | — | missing (obsolete in 1.0 too) |
| `studio_taxonomies` (`lead_source`) | `settings.lead_sources` (JSON list) | present, different (settings row, `retired` flag instead of `is_active`) |
| `studio_taxonomies` (`project_type`) | Won payload `projectType` (free text) | different |
| `refund_requests` + `refund_reasons` | `lead_returns` + `return_attachments` | present, different (Qanvast-side reply fields; reasons are not a table) |
| `lead_webhook_endpoints` + `lead_webhook_log` | `settings.lead_capture` + one-row `imports` | different (no endpoint/token records) |
| `email_connections` + `email_sync_log` | `settings.lead_capture.emailSlug` + `imports` | different (no OAuth, no sync log) |
| `homeowner_profiles` + `homeowner_project_links` | — (Invite to Portal is a dialog, REG-193; no rows) | missing |
| `homeowner_notifications` | — | missing |
| `studio_scope_questions` + `homeowner_scope_responses` (+ history) | `questions` (per lead, question + answer in one row) | present, different |
| `quote_signature_requests` | `contracts` + `contract_bundles` (+ `quotes.confirmed_*`) | present, different (no token/expiry/evidence columns) |
| `notifications` (+ preferences, templates) | `notifications` + `settings.notification_rules` / `message_templates` | present, different |
| `tasks.lead_id` (+ `task_assignees`) | `lead_tasks.lead_id` (+ `task_assignees` by member) | present |
| `projects.lead_id` | — (no projects table; Won payload carries `milestones` + `projectType`) | missing |
| `quotes.lead_id`, `quote_line_items.lead_id`, `quote_versions.lead_id`, `quote_packages.lead_id` | `quotes.lead_id`; `quote_items.quote_id`; `quote_versions.quote_id` | present (2.0 keys line items and versions by quote, not lead) |
| `conversations.lead_id`, `project_rooms/render_jobs.lead_id`, `hangout_meetings.lead_id`, `copilot_*.lead_id` | — | missing (Meetings tab waits for mocks, REG-552) |
| `quote_xrays.lead_id` | `quote_comparisons.lead_id` | present |
| `studio_members.accepting_leads`, `lead_preferences`, `tags`, `role_id`; `leads.owning_manager_id` | `members.role`, `members.manager_id`, `settings.lead_visibility` | different (hierarchy on the member, not the lead) |
| `studios.lead_sources`, `studios.settings.workflow/features` | `settings` keys | different |

### 3.2 Column-level diff — every 1.0 column

Legend: **present as** `x` · **missing** · **different** (how).

#### `leads`

| 1.0 column | 2.0 |
|---|---|
| `id` uuid | present as `id` (text) |
| `studio_id` | missing — tenant plumbing (single studio) |
| `assigned_to` | different — `lead_assignees` rows only; no scalar mirror (1.0 itself deprecates it) |
| `owning_manager_id` | different — 2.0 puts the hierarchy on `members.manager_id`; a Manager sees the team's leads through `lead_assignees` + `lib/leads/assign-policy.ts`, so the lead never records which manager routed it |
| `name` | present as `name` |
| `email` | present as `email` |
| `phone` | different — 2.0 stores 8 bare digits (`isSgPhone`); 1.0 free format |
| `budget` int dollars | different — `budget_minor` int cents, NOT NULL |
| `property_type` text codes | different — `property_type` NOT NULL, mock labels (`HDB 4-Room`) not codes |
| `area` (location) | different — closest is `property_address`; 2.0 has no separate estate/location field |
| `property_status` | present as `condition` (values seen: `New`; 1.0 BTO/Resale/New Launch) |
| `style_preference` | present as `style` |
| `area_sqft` | present as `area_sqft` |
| `area_unit` | missing (sqft implied) |
| `key_collection_date` (text) | present as `key_collection` |
| `property_address` | present as `property_address` |
| `notes` | present as `notes` |
| `additional_info` | missing |
| `status` (legacy enum) | different — `stage` (`New/Contacted/Met/Quote Sent/Won/On Hold/Lost`); mapping in §3.4 |
| `bucket` / `lead_status_code` / `sub_status_code` | different — collapsed into `stage`; sub-statuses have no home (On Hold reason and Lost reason live in the stage log payload) |
| `next_follow_up_date` / `next_follow_up_time` | different — derived: On Hold `payload.followUpAt`; a contact log's `nextStepWhen` / `next_step_at`; the reminder is a `lead_tasks` row with `due_at` |
| `temp`, `temp_reason` | missing |
| `ai_intent_score`, `ai_fit_score`, `ai_reason` | missing (2.0 has the AI brief component, no stored scores) |
| `ai_draft_message`, `ai_draft_generated_at` | missing |
| `qanvast_lead_id` | missing (Qanvast-sourced = `source = 'Qanvast'`) |
| `project_type` | different — Won payload `projectType` (free text) |
| `quote_status` | different — derived from `quotes.status` of the lead's quotes; no mirror column |
| `quote_data`, `quote_metadata`, `quote_hierarchy_metadata` | different — normalised into `quotes` / `quote_items` / `quote_payments` (per quote, not per lead) |
| `quote_valid_until` | different — `quotes.valid_until` per quote |
| `customer_id` | different — `quotes.customer_id` per quote |
| `ic_number` | different — `quotes.nric` (+ `client2_nric`) per quote; `contracts.signed_nric` masked |
| `contract_uploaded`, `contract_file_name` | different — Won payload `wonContractTab/wonContract/wonContractUploaded` and `contracts.signed_copy` |
| `signature_request_id` | different — `contracts` rows keyed by lead (many) |
| `company_id` | different — `quotes.issuing_entity` / `contracts.issuing_entity` text; entities live in `settings.brand` |
| `possibly_duplicate`, `duplicate_of_lead_id` | different — dedupe happens on `import_rows` (`status='duplicate'`, `duplicate_of_lead_id`, `matched_on`); a lead row itself is never flagged |
| `needs_attention` | missing |
| `email_source_message_id` | different — `imports.file_name` "Website form · …" records the arrival, no message id |
| `email_lead_status` | different — `import_rows.status` (`pending/approved/rejected/merged/skipped`) |
| `external_lead_id`, `ad_metadata` | missing (Meta arrivals are imports; no platform id) |
| `archived_at` | present as `deleted_at` (+ 2.0 adds `delete_reason`, `stage_before_delete`) |
| `country_code` | missing — multi-region plumbing |
| `engagement_state` | missing (On Hold is a stage; `stalled/awaiting_client` have no home) |
| `hold_restart_date` | different — On Hold `payload.followUpAt` |
| `hold_prev_state` | different — `resumeStage` derived from the log before the On Hold/Lost move |
| `closed_reason_code`, `closed_reason_detail` | different — Lost `payload.reason` free text (`'Others: …'`) |
| `journey_overrides` | missing (no manual step marks; stages move through logs) |
| `first_assigned_at` | different — derivable: `min(lead_assignees.assigned_at)` |
| `first_outreach_at`, `first_outreach_by` | different — derivable: earliest `lead_notes(kind='contact').contacted_at` / Contacted log `logs[0].when` + `author_id` (`lastContact` already computed) |
| `signed_at` | different — `contracts.signed_at` / the Won log's `created_at` |
| `agent_idempotency_key` | missing — bot plumbing |
| `created_at`, `updated_at` | present as `created_at`, `updated_at` |

2.0-only on `leads`: `lead_address`, `estimated_start_date`, `seen_at`, `delete_reason`, `stage_before_delete`, `budget_minor` NOT NULL, `property_type` NOT NULL, `phone` NOT NULL.

#### `lead_activity_log`

| 1.0 | 2.0 |
|---|---|
| `id`, `lead_id` | missing (no table) |
| `action` free text | different — every row of the feed is derived with a typed `kind`/`icon` (`person_add`, `person`, `swap_horiz`, `docs`, `contract`, `comment`, `help`, `ballot`, `scan`, `undo`, `delete`) from `stage_logs`, `lead_assignees`, `lead_tasks`, `lead_files`, `lead_notes`, `questions`, `quotes`, `contracts`, `lead_returns`, `quote_comparisons` |
| `performed_by` (profiles) | different — each source row's own author column (`author_id`, `creator_id`, `owner_id`, `returned_by_id`, `created_by`), members.id |
| `performed_at` | different — each source row's `created_at` |

#### `lead_files`

| 1.0 | 2.0 |
|---|---|
| `id`, `lead_id` | present |
| `studio_id` | missing (tenant) |
| `file_name` | present as `name` |
| `file_url` | different — `thumb` (public asset path for images); no storage URL, no bucket |
| `file_size` bigint | present as `size_bytes` |
| `mime_type` | present as `mime` |
| `uploaded_by` (profiles) | present as `owner_id` (members) |
| `uploaded_at` | present as `created_at` |
| `is_homeowner_visible` | missing (Files section's `quotes.files_visible` is per quote, not per file) |
| — | 2.0-only: `kind` (`folder/image/pdf`), `parent_id` (folders), `updated_at`, `deleted_at` (trash), `file_comments` |

#### `lead_assignees`

| 1.0 | 2.0 |
|---|---|
| `id`, `lead_id`, `member_id` | present |
| `commission_split_bps` | missing (finance) |
| `added_at` | present as `assigned_at` (nullable in 2.0) |
| `added_by` | missing (Activity says "You assigned X") |

#### `lead_outreach_attempts` → `lead_notes (kind='contact')`

| 1.0 | 2.0 |
|---|---|
| `id`, `lead_id` | present |
| `studio_id` | missing |
| `channel` `whatsapp/call/email/sms/in_person/other` | different — `channel` `WhatsApp/Email/SMS/Call/Others` (`In person` only as a *next-step* mode) |
| `outcome` `no_answer/replied/callback_requested/not_interested/connected` | different — `outcome` `Connected/Callback requested/Meeting scheduled/No response` (no `not_interested`) |
| `attempted_at` | present as `contacted_at` |
| `notes` | present as `body` |
| `artifact_id` | different — `note_attachments(note_id, file_id)` (many files, file kind only) |
| `performed_by` | present as `author_id` |
| `created_at` | present as `created_at` |
| `ai_parse` | missing |
| — | 2.0-only: `title`, `next_step_at`, `next_step_mode`, `updated_at`; the Contacted stage log duplicates the first log(s) as `payload.logs[]` |

#### `lead_artifacts`

| 1.0 | 2.0 |
|---|---|
| `id`, `lead_id`, `studio_id` | missing as a table |
| `journey_step` | missing (no journey steps) |
| `kind` file | present as `note_attachments` / `task_attachments` / `return_attachments` / stage-log `files[]` (names only) |
| `kind` link / note / tool, `url`, `note`, `tool_ref`, `label` | missing |
| `file_id`, `created_by`, `created_at` | present on the attachment rows (`file_id`, `created_at`; author = the note/task's) |

#### `lead_custom_fields`, `lead_custom_field_values`, `lead_categories`, `studio_lead_funnel`, `pipeline_stages`

Every column **missing** (no tables). `studio_lead_funnel.config.buckets[].statuses[].followUpRequired/requiresApprovedQuote/requiresContract/requiresProjectType` map to 2.0's fixed validation in `lib/leads/stage-data.ts` (`validateStage`: every field mandatory except notes, the schedule pair, Met's documents) and the policy in `lib/leads/stage-policy.ts` (`Won` needs a quote/contract; "Assign a member first" before leaving New ≈ `requiresAssignment`).

#### `studio_taxonomies (type='lead_source')` → `settings.lead_sources`

| 1.0 | 2.0 |
|---|---|
| `name` | present as `LeadSourceEntry.name` |
| `is_active` | present as `!retired` |
| `order_index` | present as array order |
| `id`, `studio_id`, `type`, `metadata` | missing |

#### `refund_requests` → `lead_returns`

| 1.0 | 2.0 |
|---|---|
| `id`, `lead_id` | present (2.0 allows several returns per lead; 1.0 UNIQUE) |
| `studio_id`, `company_id` | missing |
| `reason_id` (FK refund_reasons) | missing (no reasons table) |
| `reason_text` | present as `reason` |
| `sub_reasons` text[] | missing |
| `notes` | present as `comments` |
| `status` `pending/approved/rejected` | present as `status` `processing/approved/rejected` |
| `is_urgent` | missing |
| `filed_by` (profiles) | present as `returned_by_id` (members) |
| `reviewed_by` (admin_users) | present as `replied_by` (text "Qanvast - Business Team") |
| `rejection_reason` | present as `reply_reason` (+ `reply_remarks`) |
| `filed_at` | present as `returned_at` |
| `reviewed_at` | present as `replied_at` |
| — | 2.0-only: `status_text`, `refund_status`, `credit_amount_minor`, `appeal_days`, `first_outreach_at`, `attempts`, `stage_before`, `stage_log_id`, `task_id`, `return_attachments` |
| `refund_reasons.*` | missing — the wizard's reasons are fixed in the component |

#### `lead_webhook_endpoints` / `lead_webhook_log` → `settings.lead_capture` + `imports`

| 1.0 | 2.0 |
|---|---|
| `token`, `signing_secret`, `platform` | different — `lead_capture.meta.forms[] { id, name, on }` (Meta) and `emailSlug` (website); no generic endpoints, no tokens |
| `source_label` | different — fixed `Website` / `Meta Ads` on the imported row |
| `is_active` | present as `forms[].on` / `meta.connected` |
| `total_received`, `total_leads_created`, `total_duplicates`, `last_received_at` | different — countable from `imports` rows named "Meta Lead Ads · …" / "Website form · …" |
| `notes`, `created_by`, `created_at` | missing |
| `lead_webhook_log.outcome / payload_excerpt / error_message / lead_id` | different — `import_rows.status` + `data` (the parsed record) + `duplicate_of_lead_id` |

#### `email_connections` / `email_sync_log`

`email_address` → different (`intakeAddress(studio, slug)` = `leads+<slug>@in.openmaison.sg`, derived); `sender_domains`, `custom_domains`, `provider`, `access_token_enc`, `refresh_token_enc`, `token_expiry`, `last_sync_*`, `status`, `error_message`, `country_code` → missing; `email_sync_log.*` → different (`imports` row counts `total_rows/imported_rows/skipped_rows`).

#### Homeowner tables

`homeowner_profiles.*`, `homeowner_project_links.*` (incl. `portal_token`, `chat_history_visible`, `last_questionnaire_invite_at`, `last_seen_at`), `homeowner_notifications.*` → **missing**. `studio_scope_questions` → different: `questions` rows are per lead (`text`, `type` `text/number/single/multi/date` ≈ `question_type` minus `yes_no` (= `single`), `options`, `sort_order` present; `is_required`, `is_enabled`, `studio_id` missing). `homeowner_scope_responses.response` → present as `questions.answer`; `source` → present as `answered_by` (`studio/client`); `answered_at` → present; `answered_by_id` → missing; `homeowner_id`, `project_link_id`, `question_id` (bank ref) → different (the question *is* the row); `homeowner_scope_response_history.*` → missing.

#### `quote_signature_requests` → `contracts` / `contract_bundles`

| 1.0 | 2.0 |
|---|---|
| `id`, `lead_id` | present |
| `studio_id`, `company_id` | missing / different (`issuing_entity` text) |
| `token` | different — the link is `/sign/[contracts.id]` or `/sign/bundle/[bundle_id]` |
| `status` `pending/viewed/signed/expired` | different — `Draft/Sent to Client/Signed` (no viewed, no expired) |
| `client_name` | present as `recipient_name` |
| `client_phone` | present as `recipient_phone` |
| `quote_snapshot`, `quote_total`, `payment_schedule` | different — `quote_versions.snapshot_json` (per quote, on Revise) and `quotes.confirmed_*` (the confirmation link, REG-587) |
| `studio_name` | different — `settings.studio.name` |
| `expires_at` | missing |
| `signed_at` | present as `signed_at` |
| `signature_data`, `signer_ip`, `signer_user_agent`, `signer_phone`, `signer_timezone`, `document_hash`, `signing_hash`, `audit_trail`, `verification_method` | missing (2.0 keeps `signed_by` + masked `signed_nric`) |
| `client_selections` | different — `quote_items.status` `Pending/Approved/Declined` |
| `quote_id` / `quote_ids` / `signing_mode` / `selected_quote_id` | different — `contracts.from_quote_id` (one) and `contract_bundles` (several documents, one signature) |
| `signed_pdf_url`, `signed_packet_path` | different — `contracts.signed_copy` (file name) |
| `documents`, `document_acknowledgements` | different — bundle members are `contracts` rows with `bundle_id` |
| `prepared_by_display` | missing (`quotes.prepared_by` member id) |
| `created_at` | present |

#### `notifications`

| 1.0 | 2.0 |
|---|---|
| `id` | present |
| `studio_id` | missing |
| `recipient_id` (profiles) | present as `member_id` (members) |
| `recipient_email`, `recipient_phone`, `homeowner_recipient_id` | missing (delivery plumbing) |
| `event_type` (`lead.captured/assigned/status_changed/followup_reminder`) | present as `kind` (`new_lead/assigned/…`); `status_changed` has no 2.0 event |
| `channel` (one row per channel) | different — `channels` comma list on one row |
| `title`, `body`, `action_url` | present as `title`, `body`, `href` |
| `entity_type`, `entity_id` | present as `lead_id` / `quote_id` |
| `is_read`, `read_at` | present as `read_at` |
| `status`, `sent_at`, `error_message`, `retry_count`, `digest_date`, `fire_at`, `metadata` | missing (sending is the platform's; 2.0 only records the raise) |
| `created_at` | present |
| `notification_preferences (category, channel, enabled, digest_mode, recipient_roles)` | different — `settings.notification_rules.channels[event][channel]`, `untouchedMinutes`, `stopWhenClosed` |
| `notification_templates (event_type, channel, subject, body_html, body_text, variables)` | different — `settings.message_templates[] { event, channel, subject, body }` with `{lead_name} {studio} {member} {actor} {source} {quote_number} {link}` |
| — | 2.0-only: `actor_id` |

#### `tasks` (linking columns)

| 1.0 | 2.0 |
|---|---|
| `lead_id` | present as `lead_tasks.lead_id` (nullable both) |
| `lead_name` | different — joined at read time |
| `type` `LeadFollowUp` | different — `kind` `General/Call`; the follow-up raised by a quote's due date carries `quote_id`; the schedule reminder is a `General` task titled `Follow up with the client via … on …` |
| `planned_date` + `planned_time` | present as `due_at` |
| `status` `NotStarted/InProgress/Completed` | different — `done` boolean |
| `assignee_user_id` / `task_assignees.profile_id` | present as `task_assignees.member_id` |
| `assignee_name` | different — joined |
| `approval_status`, `approval_comment`, approval `type`s | missing (quote approval is `quotes.status`; template approval on `quote_templates`) |
| `related_entity_id` | different — `quote_id` |

#### `projects.lead_id`, `quotes.lead_id` and the rest

`projects.lead_id` + the copied customer fields → missing (no projects). `quotes.lead_id` → present (NOT NULL in 2.0); `quotes.is_primary` → missing (2.0 shows every quote; the signed one is the Won log's `wonQuote`); `quote_line_items.lead_id` → different (`quote_items.quote_id`); `quote_versions.lead_id`+`version_number` → different (`quote_versions.quote_id`+`version`); `quote_packages` → missing. `conversations.lead_id`, `project_rooms.lead_id`, `render_jobs.lead_id`, `hangout_meetings.lead_id`, `copilot_sessions.lead_id`, `meeting_briefs.lead_id`, `copilot_objection_log.lead_id` → missing. `quote_xrays.lead_id` → present as `quote_comparisons.lead_id`.

#### Member / studio lead configuration

`studio_members.tags` → present as `members.role` (owner→Owner, admin→Admin, manager→Manager, id→Designer; `accounting` missing); `role_id`/`studio_roles.permissions.actions.leads` → different (fixed per role in `assign-policy.ts`: Owner/Admin assign anyone, Manager within the team, Designer nobody; `dataScope: 'assigned'` ≈ `settings.lead_visibility = 'assigned'`); `accepting_leads`, `lead_preferences` → missing; `studios.lead_sources` → present as `settings.lead_sources`; `settings.workflow.quoteApprovalRequired` → present as `settings.quote_approval`; `workflow.requireAssignment` → present (hard rule "Assign a member first"); `workflow.autoCreateFollowUps` → present (the schedule block always raises a task); `features.duplicate_detection_enabled` → different (always on for imports); `features.lead_journey_mode`, `features.lead_manager_hierarchy` → missing / hard-wired (`members.manager_id`); `ai_assignment_prompt` → missing.

### 3.3 Reverse — 2.0 columns / tables with no 1.0 counterpart

- `leads`: `lead_address` (the client's home address, distinct from the property), `estimated_start_date`, `seen_at` (the "new, unseen" band), `delete_reason`, `stage_before_delete`, `budget_minor` in cents; `phone`/`property_type`/`budget` NOT NULL.
- `stage_logs` — the whole table: 1.0 has no per-transition record with structured details (its nearest things are `lead_activity_log` text lines, `journey_overrides`, `hold_prev_state`, the Met/Quote/Won facts scattered on `leads` and `quote_signature_requests`). 2.0 needs it for `resumeStage`, the stage timeline, `onHoldFollowUp`, `lastContact`, Undo, and the Activity feed.
- `imports` / `import_rows` — 1.0 imports leads only through email/webhook ingestion (no CSV batch record, no review queue table; `email_lead_status` on the lead is its review state).
- `lead_notes` (`kind='note'`) with `title` — 1.0 keeps free notes in `leads.notes` / `additional_info` only; `next_step_at` / `next_step_mode` on a contact log.
- `file_comments`, `note_attachments`, `task_attachments`, `return_attachments`, `quote_files` — link tables re-using `lead_files`; 1.0 has flat file rows + `lead_artifacts`.
- `lead_files.kind='folder'`, `parent_id`, `deleted_at` (trash) — 1.0 files are flat and hard-deleted.
- `questions` per lead with `sort_order` and the studio answering (`answered_by='studio'`) — 1.0 splits bank/answers; `lead_questionnaires` (dead).
- `lead_returns`: `status_text`, `refund_status`, `credit_amount_minor`, `appeal_days`, `first_outreach_at`, `attempts`, `reply_remarks`, `stage_before`, `stage_log_id`, `task_id` — the Qanvast reply side; 1.0 stores only the admin decision.
- `lead_tasks`: `quote_id`, `kind='Call'`, `description`, `seen_at`, `template_id`, `done`; `tags`/`task_tags`/`task_comments`/`task_templates`/`template_tasks` — no 1.0 equivalent (1.0 tasks have `description`, `supporting_images`, external/homeowner assignees, but no tags/comments/templates).
- `members`: `is_you`, `color`, `manager_id` (on the member), `signature_kind/name/data`; 1.0 keeps signatures in `member_signatures` (267) and the hierarchy on the lead.
- `settings` key/value table (`stage_movement`, `lead_visibility`, `lead_capture`, `lead_sources`, `notification_rules`, `message_templates`, `quote_rules`…) — 1.0 keeps studio config in `studios.settings` JSONB plus dedicated tables.
- `notifications.actor_id`, `channels` (comma list), derived `untouched`/`task_due` rows.
- `contracts.body` (editable HTML with token chips), `source composed|uploaded`, `reminders`, `thank_you`, `contract_date`, `template_id`; `contract_bundles`; `quotes.confirmed_at/confirmed_by` (the confirmation link) — 1.0's signing request has no editable document body (it renders `documents[]` templates).
- `quote_comparisons.result_json` etc. (X-Ray) — 1.0 `quote_xrays` is the counterpart (`inputs/match_result/ai_synthesis`).

### 3.4 Proposed mapping for the port

**A. 1.0 tables that become new 2.0 tables (keep 1.0's names and columns; text ids; unix-second timestamps; every `*_by` becomes a `members.id`; drop `studio_id`/`company_id`/`country_code`):**

| new 2.0 table | columns to carry | when |
|---|---|---|
| `lead_activity_log` | `id, lead_id, action, performed_by, performed_at` | only if 1.0's free-text history lines must appear; the derived feed can union them (a `kind='legacy'` row). Otherwise **not needed** — keep deriving. |
| `lead_custom_fields` + `lead_custom_field_values` | fields: `id, label, field_type ('text'\|'number'\|'dropdown'\|'date'), options (JSON string[]), is_required, order_index, is_active, created_at`; values: `id, lead_id, field_id, value (JSON)`, UNIQUE `(lead_id, field_id)` | if the Accounts › custom fields feature is in scope |
| `lead_categories` | `id, name, color, order_index, is_active, created_at` | only with that Accounts page; note 1.0 never links a lead to a category |
| `lead_artifacts` | `id, lead_id, journey_step, kind, file_id → lead_files.id, url, note, tool_ref (JSON), label, created_by, created_at` | only if Journey Mode's evidence rail is ported; otherwise the existing attachment link tables suffice |
| `refund_reasons` | `id, reason, sub_reasons (JSON string[]), is_active, order_index, created_at` | if the Return Lead wizard's reasons should be data (today fixed copy) |
| `lead_webhook_endpoints` + `lead_webhook_log` | endpoints: `id, token, source_label, notes, is_active, platform, total_received, total_leads_created, total_duplicates, last_received_at, created_at, created_by`; log: `id, endpoint_id, received_at, outcome, lead_id, payload_excerpt (JSON), error_message` | if Company › Integrations must show endpoint URLs/tokens and a delivery log (`settings.lead_capture` covers the Meta/website toggles today). Do **not** carry `signing_secret` |
| `homeowner_profiles` + `homeowner_project_links` (as `homeowner_lead_links`, or keep the name with `project_id` dropped) | profiles: `id, phone, name, email, avatar_url, created_at, updated_at` (UNIQUE `phone`); links: `id, homeowner_id, lead_id, role, portal_token, chat_history_visible, is_active, linked_at, last_questionnaire_invite_at, last_seen_at` | if Invite to Portal (REG-193) becomes a record and the client questionnaire link needs a token |
| `studio_scope_questions` | `id, question, question_type, options (JSON), is_required, is_enabled, sort_order, created_at` | if a studio-level question bank is wanted behind "Ask the client"; 2.0 `questions` stays the per-lead answer row |
| `question_history` (1.0 `homeowner_scope_response_history`) | `id, question_id → questions.id, response, source ('studio'\|'client'), answered_by_id, recorded_at` | only with the per-question history popover |
| `email_connections` / `email_sync_log` | — | **hold**: OAuth tokens and sync state are platform plumbing; the intake address is `settings.lead_capture.emailSlug` |
| `studio_lead_funnel`, `pipeline_stages` | — | **hold**: the mocks fix the stages; if a configurable funnel is ever wanted it is one `settings.lead_funnel` JSON row, not a table |
| `homeowner_notifications`, `conversations`, `copilot_*`, `project_rooms`/`render_jobs`, `hangout_meetings`, `projects` | — | out of the Leads module's scope (Meetings waits for mocks; no projects/chat/renders in 2.0) |

**B. Columns to add to existing 2.0 tables (2.0 table name, 1.0 column name):**

| 2.0 table | add | type · default | why |
|---|---|---|---|
| `leads` | `qanvast_lead_id` | integer null | Qanvast marketplace id shown to the ops team |
| `leads` | `temp`, `temp_reason` | text null (`hot/warm/cold`) | AI temperature chip |
| `leads` | `ai_intent_score`, `ai_fit_score`, `ai_reason`, `ai_draft_message`, `ai_draft_generated_at` | integer/text/ts null | the AI brief becomes stored data |
| `leads` | `additional_info` | text null | second free-text field on the form |
| `leads` | `area_unit` | text default `'sqft'` | sqm leads |
| `leads` | `project_type` | text null | 1.0 records it on the lead (required for Signed); 2.0 only in the Won payload |
| `leads` | `possibly_duplicate`, `duplicate_of_lead_id`, `needs_attention` | bool default false / text null / bool default false | dedupe + parse flags on leads created by capture (today only on `import_rows`) |
| `leads` | `email_source_message_id`, `external_lead_id`, `ad_metadata` | text null / text null (unique when not null) / text JSON null | idempotent capture + attribution for the Integrations page |
| `leads` | `ic_number`, `customer_id` | text null | client identity on the lead (2.0 keeps them per quote) |
| `leads` | `engagement_state`, `hold_restart_date`, `closed_reason_code`, `closed_reason_detail`, `journey_overrides`, `hold_prev_state` | text / ts / text / JSON / JSON / JSON | **only with Journey Mode**; otherwise 2.0's stage log already holds the hold date, the Lost reason and the resume stage |
| `leads` | `first_assigned_at`, `first_outreach_at`, `first_outreach_by`, `signed_at` | ts / ts / text / ts | TAT stamps — either add as write-once columns (1.0 semantics: reassignment never clears) or derive (§3.2); adding them is cheaper for the Performance view |
| `leads` | `owning_manager_id` | text null → members.id | if the port must reproduce Dyel's "manager keeps visibility after handing off"; otherwise `members.manager_id` covers it |
| `lead_assignees` | `added_by` | text null → members.id | "X assigned Y" in Activity |
| `lead_notes` | `ai_parse` | text JSON null | screenshot parse result on a contact log (with the Auto Fill feature) |
| `lead_files` | `is_homeowner_visible` | bool default false | per-file portal visibility, if the portal is ported |
| `lead_returns` | `sub_reasons`, `is_urgent` | text JSON null / bool default false | the 1.0 refund form's extra fields |
| `questions` | `is_required`, `answered_by_id` | bool default false / text null | 1.0 provenance (`answered_by_id`) beside `answered_by` |
| `contracts` | `expires_at`, `viewed_at`, `signature_data`, `signer_ip`, `signer_user_agent`, `audit_trail` (JSON), `document_hash`, `signing_hash`, `verification_method` (default `'phone_otp'`), `prepared_by_display` | | the signing evidence bundle; `viewed_at` gives the 1.0 `viewed` status |
| `lead_tasks` | `status` (`NotStarted/InProgress/Completed`) | text | only if a three-state task is wanted; else keep `done` |
| `notifications` | — | | nothing: delivery columns are not ported (§C) |
| `settings` | `lead_funnel` (JSON), `ai_assignment_prompt`, `duplicate_detection_enabled` | rows | only if those 1.0 settings are surfaced |

**C. 1.0 columns that should NOT be ported in a single-studio prototype (listed so nothing is silently dropped):**

- Tenant plumbing: `studio_id` on every table; `studios.*` (`owner_id`, `plan_id`, `status`, `verification_status`, `supported_countries`, `setup_completed_at`, `portal_slug`, `lead_sources` legacy array); `studio_members.*` beyond role/manager (`user_id`, `specialty`, `close_rate`, `projects_last_12_months`, `active_projects_count`, `is_active`, `joined_at`, `invitation_status`, `invited_at/by`, `accepting_leads`, `lead_preferences`, `role_id`, `tags` as an array); `studio_roles` and the permission matrix (2.0 fixes the four roles); `plans.max_active_leads`.
- Auth / identity: `profiles` / `auth.users` ids on `performed_by`, `uploaded_by`, `filed_by`, `added_by`, `created_by`, `first_outreach_by`, `answered_by_id` (become `members.id`); `admin_users` / `reviewed_by` (the Qanvast admin becomes the text `replied_by`); RLS policies, `get_my_studio_ids()`, the 209…235/264/299/300 grant-lock series, `SECURITY DEFINER` wrappers.
- Multi-region / multi-entity: `leads.country_code` + `leads_fill_country_code` / `leads_lock_country` triggers; `studios.country_code/currency_code/timezone/locale`; `email_connections.country_code`; `company_id` on `leads`, `refund_requests`, `quote_signature_requests` (2.0 uses the `issuing_entity` text); `normalize_phone_to_e164` beyond SG.
- Platform / bot plumbing: `agent_idempotency_key` (all three tables); `lead_webhook_endpoints.signing_secret`; `email_connections.access_token_enc/refresh_token_enc/token_expiry/last_sync_*`; `notifications.status/sent_at/error_message/retry_count/digest_date/fire_at/recipient_email/recipient_phone/homeowner_recipient_id`, `notification_preferences.recipient_roles/digest_mode`, `notification_templates.body_html/variables`.
- Legacy / superseded in 1.0 itself: `leads.status` enum, `leads.assigned_to` scalar mirror, `pipeline_stages`, `studios.lead_sources`, the old 010 `notifications` shape, `leads.quote_status/quote_data/quote_metadata/quote_hierarchy_metadata/signature_request_id/contract_uploaded/contract_file_name` (1.0's single-quote-on-the-lead era; 2.0 normalises quotes and contracts), the lead↔quote mirror triggers (`sync_*`, `finalize_signed_mirror`, `set_primary_quote_atomic`) and `quotes.is_primary` (2.0 derives the lead's quote state from `quotes` rows; the signed quote is the Won log's `wonQuote`).
- Out of module: `projects.lead_id` and the copied customer columns, `conversations.lead_id`, `project_rooms.lead_id`, `render_jobs.lead_id`, `hangout_meetings.lead_id`, `copilot_sessions/meeting_briefs/copilot_objection_log.lead_id`, `homeowner_notifications`, `lead_assignees.commission_split_bps`.

**D. Data mapping for a 1.0 → 2.0 lead port (state):**

| 1.0 `bucket / lead_status_code (sub)` | 2.0 `stage` + records |
|---|---|
| `NEW / UNASSIGNED` | `New`, no `lead_assignees` |
| `NEW / ASSIGNED`; `ONGOING / FOLLOW_UP (FIRST_CONTACT)` | `New` with `lead_assignees` (+ `assigned_at = first_assigned_at`) |
| `ONGOING / FOLLOW_UP (AWAITING_REPLY, SITE_VISIT)`; `ONGOING / CONTACTED (*)` | `Contacted` + a `stage_logs` New→Contacted row whose `logs[]` come from `lead_outreach_attempts` (channel/outcome re-labelled per §3.2; `nextStepWhen` = `next_follow_up_date/time`) and `lead_notes(kind='contact')` copies |
| `ONGOING / MET (*)` | `Met` + a Contacted log + a Met log (`meetings[]` from the site-visit/concept artifacts, else an empty log per REG-343 repair rules) |
| `ONGOING / QUOTE_CREATED (*)` | `Quote Sent` + the quote(s) as `quotes` rows (`status` from `quotes.status`: draft→Draft, submitted→Sent for Approval, approved→Approved, sent_for_signature→Sent to Client, client_signed→Signed) |
| `ON_HOLD / HOLD_1M \| HOLD_1_3M \| HOLD_3_6M` | `On Hold`, `payload { duration: '1 month' \| '3 months' \| '6 months', followUpAt: next_follow_up_date, reason: sub-status label }`, `resumeStage` = the pre-hold position from `hold_prev_state` |
| `ON_HOLD / HOLD_6_9M \| HOLD_9M_PLUS` | `On Hold`, `duration: 'Until <followUpAt>'` |
| `CLOSED / SIGNED (*)`, `CLOSED / PROJECT_CREATED (*)` | `Won` + Won log (`wonQuote` = the `client_signed` quote, `wonContract` = `contract_file_name` / `signed_pdf_url` name, `projectType` = `leads.project_type`, milestones from `payment_schedule`) + a `contracts` row `Signed` (`signed_at`) |
| `CLOSED / INACTIVE (BUDGET_CONSTRAINTS \| WENT_COMPETITOR \| UNRESPONSIVE \| NOT_A_FIT)` | `Lost`, `payload { reason: <sub-status label or closed_reason_code> }` |
| `archived_at` set | `deleted_at = archived_at`, `stage_before_delete` = the mapped stage, `delete_reason` = `closed_reason_code` or `'Archived'` |
| `refund_requests` row | `lead_returns` (`pending→processing`, `approved→approved` + `refund_status`, `rejected→rejected`), `stage = 'Lost'` with `payload.reason 'Lead returned to Qanvast'`, the "Respond to Qanvast team" task |
| legacy `status` only (bucket NULL, e.g. the 023 seeds) | new→New, assigned→New(+assignee), contacted→Contacted, meeting→Met, proposal→Quote Sent, signed→Won, returned→Lost(+return), archived→deleted |

Field mapping: `budget` × 100 → `budget_minor`; `phone` → strip `+65`/spaces to 8 digits (reject others); `property_type` code → label (`hdb_4_room`→`HDB 4-Room`, `bto_4_room`→`BTO 4-Room`, `condo`→`Condo 3-bedder` or `Others`, `penthouse`→`Penthouse`, `landed`/`landed_terrace`→`Landed — Terrace`, `commercial*`→`Commercial — Office`); `area`+`property_address` → `property_address`; `property_status` → `condition`; `style_preference` → `style`; `key_collection_date` → `key_collection`; `source` → matched case-insensitively to `settings.lead_sources` (`walk_in`→`Walk-in`, unknown→`Others`); `created_at`/`updated_at` → seconds.

---

## 4. Counts

- 1.0 lead-domain tables documented in full: **leads, lead_activity_log, lead_files, lead_assignees, lead_outreach_attempts, lead_artifacts, lead_custom_fields, lead_custom_field_values, lead_categories, studio_lead_funnel, pipeline_stages, studio_taxonomies, refund_requests, refund_reasons, lead_webhook_endpoints, lead_webhook_log, email_connections, email_sync_log, homeowner_profiles, homeowner_project_links, homeowner_notifications, studio_scope_questions, homeowner_scope_responses, homeowner_scope_response_history, quote_signature_requests, notifications (+ notification_preferences, notification_templates)** = 26 (+2); linking-only: tasks, projects, quotes, quote_line_items, quote_versions, quote_packages, conversations, project_rooms, render_jobs, hangout_meetings, copilot_sessions, meeting_briefs, copilot_objection_log, quote_xrays = 14; plus the lead-config columns on `studio_members` and `studios`.
- 1.0 `leads` effective columns: **77**.
- 2.0 lead-domain tables: leads, lead_assignees, stage_logs, lead_tasks (+ tags, task_tags, task_assignees, task_comments, task_attachments, task_templates, template_tasks), imports, import_rows, settings, lead_files, file_comments, lead_notes, note_attachments, questions, lead_questionnaires (dead), lead_returns, return_attachments, notifications, members, plus the lead links on quotes, quote_files, contracts, contract_bundles, quote_comparisons = 28 listed.
- Triggers/functions in 1.0 implementing lead logic: 8 trigger functions on `leads`/`quotes`, 8 RPC functions (§1.3).

## 5. Uncertain / not verified

1. **Two migration sets.** The effective schema above is the union of `supabase/migrations/` (102) and `scripts/migrations/` (381). I did not find a manifest of which production environment has which files applied; `docs/DATABASE_SCHEMA.md` §20 lists only up to `056`. Columns were cross-checked against `src/types/database.ts`, so anything the app reads is covered, but a column present in a migration and absent from the types (e.g. `refund_requests.company_id`, `lead_files.is_homeowner_visible` is in the types) may or may not exist on a given fork.
2. **`notifications` table shape.** `010_admin_misc.sql` creates `notifications (user_id, type notification_type enum, message, …)`; `sb:20260314000001` runs a plain `CREATE TABLE notifications (…)` (no `IF NOT EXISTS`, no `DROP`) with the new shape; later production migrations (`110`, `271`) alter columns that exist only in the new shape. Production therefore has the 20260314 shape, but how the old table was replaced is not recorded in either set.
3. **`key_collection_date`** is `date` in the production-only set and `text` after `sb:20260407100000`; the TS type is `string | null` either way. Treated as text.
4. **`quotes.lead_id` FK.** `sb:20260415000001` adds it without a FK; `104_quote_fk_and_notnull.sql` (not opened) may add one. Linking-only, so not resolved.
5. **`homeowner_project_links.last_seen_at`** is taken from `DbHomeownerProjectLink` (comment: migration 273); `273_ho_unpublish_support.sql` was not opened.
6. **`studio_members.title`, `invitation_status`, `invited_at`, `invited_by`** and the `tags` widening to `accounting` (129) are from grep hits, not full reads.
7. **Seeds in `scripts/migrations/021/022/026/083/086/100`** were counted by `INSERT INTO` blocks and studio-id occurrences, not row by row; the "25 profiles / 5 studios" figure comes from the file headers. `023`'s 10 demo-studio leads are exact.
8. **Bucket names** `contract-files`, `task-attachments`, `escalation-attachments`, `expense-receipts` are inferred from the migration file names (208/210/196/255 were not opened); `lead-files` and `signed-quotes` are verified.
9. **1.0 code vocabularies** (`tasks.status`, activity `action` strings, journey step ids, closed reasons) come from `src/data/mock-tasks.ts`, `src/lib/leads/journey.ts` and greps of `src/app/api/leads`; there is no DB constraint on any of them.
10. **RLS / grants** were only inventoried (which tables, which lock migrations), not read policy by policy, per the brief.
11. **2.0 uncommitted work** (`0031`, `0032`, `members.manager_id`, `notifications`, `lead_visibility`, `lead_capture`, `lead_sources`) is documented from the working tree at 2026-09-24; it may change before commit.
12. **2.0 ids**: the schema gives no default; `randomUUID()` is used by the actions I read (`app/leads/actions.ts`, `return-actions.ts`); seeds may use readable ids. Not verified for every table.
