# Accounts Setup → Settings — the 1.0 → 2.0 migration map (for the devs)

Written 2026-09-25 at the end of the Accounts Setup parity rounds (REG-643…648). It says, for every 1.0 store, column, JSON shape and rule
a studio's settings touch, where the same thing lives in 2.0 and which round put it there — so a migration script and the code after it
have one place to look. The audit (`11-accounts-setup-1.0-to-2.0-audit-2026-09-25.md`) holds the reasoning and the 18 calls (§9);
inventory D (`accounts-setup-1.0-inventory/D-data-model.md`) holds the column-level diffs (D-60…D-162) and the full port plan
(D-170…D-236). This page is the short map.

Conventions: 2.0's data is Drizzle over libSQL (`lib/db/schema.ts`); a studio's rules live in the `settings` table — one JSON value per
key, parsed by `lib/settings/types.ts` — and its records in their own tables; every write is a server action with `revalidatePath` and,
for the studio's settings, an Owner-or-Admin check. Times are unix seconds in columns and milliseconds inside `settings.lead_capture`.
Rounds: **R1** Settings in 1.0's shape (REG-645) · **R2** who may change the studio (REG-646) · **R3** lists and records that hold
(REG-647) · **R4** this map (REG-648).

## 1. Where each 1.0 screen lives

| 1.0 (Accounts) | 2.0 | Round |
|---|---|---|
| The Accounts page — nine groups, `?tab=` | **Settings** (the studio's rules): Studio · Lead management · Quotes & pricing · Notifications, Projects and Finance to come, `?section=`, `?from=`; **Company** (its records): Profile · Members · Questionnaire · Templates · Price book · Integrations | R1 |
| Studio › Team Members | Company › Members (people, roles, reports-to, add · deactivate · reactivate); Settings › Studio's *Team* card | R2 |
| Studio › Legal Entities | Company › Profile › Issuing entities & bank details; Settings › Studio's *Issuing entities* card | R1 · R3 |
| Studio › Roles & Permissions | four fixed roles (`members.role`); Settings › Studio › *Who may do what*, read-only, computed from the rules (`lib/settings/permissions.ts`) | R1 · R2 |
| Studio › Studio Health | — (the platform's telemetry; Leads › Insights holds response times) | — |
| Lead Management › Lead Experience, Lead Funnel | Settings › Lead management › Stage movement; the stages are fixed (the editor held) | R1 |
| Lead Management › Lead Sources · Custom Fields | Settings › Lead management › Lead sources (rename · place · retire · Undo) · Custom fields | R3 |
| Lead Management › inactivation reasons | Settings › Lead management › Reasons (Lost · On Hold; rename · place · the contact gate · Undo) | R3 |
| Lead Management › Lead Webhooks · Settings › Email Lead Sources | Company › Integrations; Settings › Lead management › Lead capture lists every way in | R3 |
| Lead Management › Lead Categories | — (saved, read nowhere) | — |
| Quotes & Pricing › Quote Categories | Settings › Quotes & pricing › Trades (name · place · note · Undo) | R3 |
| Quotes & Pricing › Document Templates · Signing Documents · Packages | Company › Templates (Quotes · Contracts · Tasks · T&Cs & Notes · Payments) · Company › Price book › My Sections | — |
| Quotes & Pricing › Quote Rules · Quote Approval Rules · Quote Sharing | held · — · — (acted on nothing) | — |
| Quotes & Pricing › Price Book | Company › Price book (the next audit) | — |
| The lead's country → GST | Settings › Quotes & pricing › GST (registration + rate) | R1 |
| Settings (personal) › Notifications | Settings › Notifications (the studio's rules) | R1 · R3 |

## 2. Stores

| 1.0 | 2.0 | Notes | Round |
|---|---|---|---|
| `studio_members` + `profiles` | `members` + **`is_active` · `deactivated_at` · `phone`** (migration 0048) | tags → one role by priority owner > admin > manager > id (D-140); an accounting-only member lands inactive when a record names them; a removed member lands inactive with `deactivated_at` (their records keep their name) | R2 |
| `studio_roles` · `permission_overrides` · `workflow_overrides` | — | superseded by the four roles (held: custom roles, leads Q-40); the port log names who had an override | — |
| `studio_invitations` · `studio_member_requests` | — | the platform's; 2.0 adds a member directly (Company › Members › Add member) | R2 |
| `studio_companies` | `settings.brand.details.entities[]` + **`id` · `retired`** | the default entity first — it is the studio (`id: 'studio'`); the others by name, ≤ 6; an inactive row that a ported quote names lands `retired: true`; `tax_rate`, `numbering`, country / currency not ported (Singapore only) | R3 |
| `studios.name` · the default entity's GST | `settings.studio` `{ name, gstRegistered, phone, **gstPct** }` | `gstPct` 9 unless the studio's rate differs (D-178) | R1 |
| `studio_taxonomies` (`lead_source`) | `settings.lead_sources` | order = the array's; inactive → `retired: true`; every `leads.source` value not listed lands retired | R3 |
| `journey.inactivationReasons` · the funnel's hold sub-statuses | `settings.lead_reasons` `{ lost[], hold[] }` | `gateAfterAttempts` → `minContacts` | R3 |
| `lead_custom_fields` · `lead_custom_field_values` | the same names | ids and order kept; `file` fields not ported | — |
| `lead_webhook_endpoints` · `lead_webhook_log` | `settings.lead_capture.webhooks[]` · `webhookLog[]` (≤ 50) | `key: null` — never copy a secret into a settings row (D-183); the label becomes a lead source | R3 |
| `email_connections` | `settings.lead_capture.email` | tokens stay the platform's | — |
| — | `settings.lead_capture.emailSlug` | the intake address's slug, set once from the studio's name | R3 |
| `studio_scope_questions` (HomeOwner Portal group) | `studio_scope_questions`; a lead's copies in `questions` + **`required`** (migration 0049) | Required rides on every copy | R3 |
| `workflow.quoteApprovalRequired` · `approvers.quoteApproval` | `settings.quote_approval` · `settings.quote_rules.backupApproverId` | map by meaning, never by key: 1.0's `settings.quote_approval` is the dead thresholds object (D-160); the backup is an active member who is neither Owner nor Admin | R2 |
| `studio_quote_categories` | `settings.trades` + `settings.trade_notes` | map 04 | — |
| `notification_preferences` · `notification_templates` | `settings.notification_rules` · `settings.message_templates` | category → the events of its family (D-144); Email and WhatsApp ride on In app | R3 |
| `lead_categories` · Quote Sharing's keys · approval thresholds · `ads_enabled` · `id_buddy_enabled` · the AI assignment prompt · `pipeline_stages` | — | dead in 1.0 | — |

## 3. Rules and where they live

| Rule | 2.0 | Round |
|---|---|---|
| Owners and Admins change the studio — every `settings` setter, Notifications, Integrations, Profile and the brand kit, a template's default | `assertRunsStudio` (`app/settings/actions.ts`, `app/notifications/actions.ts`), `guard` (`app/leads/capture-actions.ts`), `saveBrand`, `assertMaySetDefault` (`lib/company/template-guard.ts`) | R2 |
| A template is renamed, deleted or restored by its author, an Owner or an Admin (a quote template: Owners and Admins) | `lib/company/template-rules.ts` + `template-guard.ts`; the menus read the same words | R2 |
| The Owner rules — only an Owner makes, unmakes, deactivates or reactivates an Owner; nobody changes their own role or deactivates themself; at least one active Owner | `lib/company/member-rules.ts` (pure), `app/company/members-actions.ts` | R2 |
| A deactivated member leaves every picker, the suggestion and the notices; their records keep their name | `pickable` · `assignableIds` (`lib/leads/assign-policy.ts`), `suggestMember`, `approverIds` · `studioRunnerIds` | R2 |
| Who may do what, stated from the enforced rules | `permissionRows` (`lib/settings/permissions.ts`) over `runsStudio` · `canSeeLead` · `assignableIds` · `approves` · `changesPayments` · `canDeleteQuote` · `canDeleteContract` · `unsignBlock` · `canDeleteComparison` · `addBlock` | R1 · R2 |
| A rename carries its records | `renameLeadSource` (leads, webhook labels), `editLeadReason` (`stage_logs.payload.reason`), `renameTrade` (quote lines, price-book items, the note), `reconcileEntities` (quotes' and contracts' `issuing_entity`) | R3 |
| An issuing entity in use is retired, never removed | `reconcileEntities` refuses the removal; `offeredEntities` / `issuerChoices(studio, current)` keep a retired one only where named | R3 |
| The studio's GST: a new line starts at its rate; a studio not registered starts quotes without GST; its letterhead prints its GST number only while registered | `setStudioGst`; `createQuoteItem` · `createQuoteItems`; `createQuote`; `docLetterhead` · `contractIssuer` (`StudioDetails.gstRegistered`) | R1 |
| The next quote number, one rule for creation and the Settings example | `defaultNextNumber` · `nextSequence` (`lib/settings/types.ts`) | R1 |

## 4. The order a studio's settings land (D-210…D-217)

Before the Leads, Quotes and Templates ports, which need them: **members** (ids kept; `is_active` from 1.0; the owner is the signed-in
member) → **the studio and its entities** (the default entity first, ids kept as `entity-<1.0 id>`) → **lead settings** (sources with
every value leads carry, reasons, stage movement and who sees leads — both the porting owner's choice, custom fields, capture with
`key: null`) → **quote settings** (approval from `workflow`, the backup approver, trades and notes, numbering per map 06) →
**notifications**. Then `npm run db:repair`'s checks: one active Owner, every role one of four, every manager a Manager, a backup approver
who may be one, entities with ids and unique names, every quote's entity found, every lead's source listed, a kept intake slug.

## 5. Still the platform's

Sign-in and sessions (1.0's removed member stays signed in — 2.0's stand-in has no sessions), invitations and member requests, Studio
Health's telemetry, receiving webhook POSTs and polling Gmail, sending email and WhatsApp, region and currency other than Singapore's.

## 6. Demo data

Migrations 0048 (`members.is_active` · `deactivated_at` · `phone`) and 0049 (`questions.required`) are additive; the baseline's rows
restore with the defaults. Repair **R55** gives the entities their ids, keeps the intake slug (`demo-studio`), marks the lead questions
copied from a Required bank question (none in the base) and moves the base state's "Test" quote template — a test run's, on no quote — to
Deleted Templates, restorable. `fixtures/baseline.json` was rebuilt from the committed baseline + the repair rules (REG-648).
