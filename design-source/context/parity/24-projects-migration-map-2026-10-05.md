# Projects, money in and the client portal — the 1.0 → 2.0 migration map (for the devs)

Written 2026-10-05 at the end of the Projects programme, once all nine rounds were built and merged (REG-911…1049). For every piece of
1.0's Projects module, its Finance money in and the homeowner portal, this map says where the same thing lives in 2.0, what the
prototype stands in for, and what to watch when porting data and wiring real services.

- **The reasoning** is in the audit `22-projects-1.0-to-2.0-audit-2026-10-05.md` and its report doc. **The calls as built** are in the
  build record `23-projects-build-2026-10-05.md` (§1: Q-01…Q-50, F-01…F-20; §5–§7: the registries and seams).
- **The 1.0 evidence** is in `projects-1.0-inventory/A…M`. Row ids such as J-14 or G-188 cite those files.
- Where this map and the audit disagree, this map follows the build.
- **Nothing in this map changes what a user sees.** Where a port would change something on screen, it is listed in §8 as Vicky's call.

**Conventions.**

- **Storage.** 2.0's data is Drizzle over libSQL (`lib/db/schema.ts`), with one studio and no `studio_id`. 1.0's RLS tenant checks
  become checks inside each server action (J-277).
- **Money.** Money is integer cents (`*_minor`) and includes GST, as a quote's total does. GST is split out of a slice, never added on
  top (`gstOf` = total × rate ÷ (100 + rate)). Shares are real percentages (`pct`). **1.0's `projects.budget_total` is whole dollars**
  (J-14), so multiply it by 100.
- **Times and days.** Times are unix seconds. A day is stored as local midnight in Singapore: a milestone's start and end, a choice's
  needed-by, an invoice's due, a payment's paid-on. Days are calendar days and both ends count (Q-11). Actions take ISO days
  (`YYYY-MM-DD`), and a schedule snapshot keeps ISO days.
- **Ids.** Ids are text, and 1.0's UUIDs are kept. **Keep 1.0's timeline milestone ids**, including the non-UUID shapes (`ms-new-…`,
  `pay-…`, E-318). Tasks, updates, choices and invoices point at them by plain id, with no foreign key.
- **People.** Every studio-side `*_by` is a `members.id`. An unknown 1.0 profile maps to the studio's Owner, and the port log records it.
  A client-side `*_by` is a `homeowner_profiles.id`: `project_milestones.confirm_answered_by`, and a client's payment's `project_payments.submitted_by`.
- **Refusals.** A refusal is `{ error: <the rule> }`, and the rule sentences live beside their functions (`CHANGE_RULE` ·
  `MONEY_RULE` · `VOID_RULE` · `PORTAL_SETUP_RULE` · `DELETE_RULE` …). 1.0's HTTP 403 / 409 answers map onto them.
  `{ reason: "has_financial_activity" }` on delete becomes `deleteBlock`.
- **Who sees a project.** Whoever may see its lead (Q-23): `canOpenLead` / `visibleLeadIds` (`lib/leads/visibility.ts`, Settings › Who
  sees leads). Every project read and action checks it on the server (`forChange` in `app/projects/actions.ts`); a project the viewer
  may not see answers *not found*. Money narrows this further to `seesMoney`: the team, their Manager, Owners and Admins (F-17).
- **One record, two chapters.** `projects.lead_id` is NOT NULL and unique. A project agreed outside the pipeline sits on a lead row
  with `leads.direct = 1`, kept out of every lead list. The project's team is the lead's members (`lead_assignees`); its tasks, files
  and activity are the lead's own records.
- **Events.** Every action writes a `lead_events` row with `project_id` and a `project_…` kind (`logProjectEvent`), and Activity is
  derived from those rows. An Undo deletes its own line. 1.0 had no project activity log (J-46).

---

## 1. Where each 1.0 surface lives

| 1.0 | 2.0 | REG |
|---|---|---|
| Listing `/projects` (A): chips All · Draft · Active · Closed · Archived, KPI tiles, the Status pill, the owner's workload view | `/projects` (`app/projects/(list)`, `components/projects/projects-workspace.tsx`): tiles In progress · Needs attention · Waiting on client · Completing this month, the scope pill, one column registry (`project-columns.tsx`), cards at ≤767. The view lives in the address. Workload is held (Q-08). | 924 · 926 · 942 · 956 · 1007 |
| Create Project drawer from a lead, + New Project (B-01, B-02), Clone (B-04, no button), the bot's `create_project` (B-05) | Won creates the project in the same press (`moveStage` → `ensureProjectForLead`, `lib/projects/create.ts`). **New project** (`new-project-dialog.tsx` → `createDirectProject`) makes a `direct` lead and its project. No Clone. | 911 · 927 |
| Draft setup card and its 5 gates, the setup wizard (B §5) | **Getting started** (`lib/projects/getting-started.ts`), each item with its own button, and **Start the project** (one press). There are no gates. | 915 · 917 |
| Project page: header with `#seq`, tabs Details · Management · Files · Finance (C) | `/projects/[id]` and `/projects/[id]/[tab]` on the lead page's frame. Tabs Overview · Schedule · Updates · Money · Choices · Tasks · Files · Activity (`lib/projects/tabs.ts` `PROJECT_TABS`). | 930 · 931 |
| Overview cards: Financial Summary, Project Info, Team, Customer + Property, Key Files, Notes, Meeting Summary, Progress Updates, Activity (C) | Overview cards: Getting started · Status · Schedule · Money · Client and property · Team · Key documents · Latest updates · Recent activity. Meeting Summary is held (Q-31); there are no project notes (§8 D-13). | 930 · 942 · 955 · 1007 |
| Management › Milestones: the Gantt, KPI strip, publish wizard and batch publish, templates, payment overlay (E) | **Schedule** tab (`components/projects/schedule/*`, `app/projects/schedule-actions.ts`): the list that is also the timeline, moves with Undo, **Share changes**, the client view pane. | 933 · 934 · 935 · 937 · 938 |
| Milestone drawer and its dialogs: start, complete, block, dependencies, payment structure, tasks (E §5–§6) | The milestone panel (Drawer 560): status, When / Moves with, Tasks, Shown to client, Waiting on someone, A payment falls due here, Ask the client to confirm. | 936 |
| Gantt timeline generators and templates (E §11), Accounts › Timeline Templates (J-39) | Set up the schedule from the signed quote, a template or nothing (`schedule-phases.ts`). **Company › Templates › Schedules** (`/company/templates/schedules`, editor `/templates/schedules/[id]`). No AI timeline (Q-12). | 939 · 940 |
| Management › Tasks (F §1) | The lead's Tasks tab on the project's address, plus a Milestone column and filter (`lead_tasks.milestone_id`) | 913 · 941 |
| Management › Materials, i.e. selections (F §3) | **Choices** tab (`components/projects/choices/*`, `app/projects/choices-actions.ts`) | 970…974 |
| Management › Floor Plan, Plan the Space (3D), Compliance (F §4–§6) | Not built (Q-19 · Q-31) | — |
| Progress Updates card, its two composers, review through a ProgressReview task (D §1) | **Updates** tab (`components/projects/updates/*`, `app/projects/updates-actions.ts`): composer with real uploads, review band, Settings › Projects › Updates | 948…957 |
| Activity card, derived from 12 sources (D §3, J-46) | Activity tab: the lead's feed with the project's lines (`lib/leads/activity.ts` over `lead_events`) | 912 · 944 · 953 · 1030 |
| Files tab, merging `project_files` with the lead's `lead_files` (J-31) | The lead's Files on the project's address; **Show to client** (`lead_files.shown_to_client_at`) | 913 · 965 |
| Finance › Overview cockpit, Contract/VO, Invoices, Receipts (G §3, §5, §8) | **Money** tab (`components/projects/money/*`, `app/projects/money-actions.ts`): story sentence, four tiles, Payment schedule · Variation orders · Invoices sent · **Payments** tables | 993…1007 · 1039 |
| Finance › POs, Expenses, Bills, mAIson Insights, commission (G §12–§16) | Not built: money out (Q-35, Q-21) | — |
| The VO editor in the quote builder (G §6) | The 2.0 quote editor in variation mode (`quotes.kind = 'variation'`, the `variation-bar.tsx` bar) | 1000 · 1001 · 1002 |
| Invoice drawer, the milestone completion invoice, Preview Invoice `/finance/invoices/[id]/preview` (G §9, E §8) | Drafts made per payment stage with the project; Send / Submit for approval; invoice page `/projects/[id]/invoices/[invoiceId]` (`(editor)` group, `invoice-paper.tsx`) | 994 · 995 · 996 · 997 |
| Record Payment drawer, Mark as Paid, the verification queue, Receipts sub-tab (G §11) | **Record a payment** dialog, the *payment to confirm* banner (Confirm · Not received), Reverse, the Payments table, receipt page `/projects/[id]/receipts/[paymentId]` (`(editor)` group); actions in `app/projects/payment-actions.ts` | 1034…1040 |
| Close / Wrap up, the closure review, Archive / Unarchive, Delete (D §4) | **Complete handover** (checklist), the owner's review as a setting, **Reopen**, soft **Delete** and the **Deleted projects** sheet. No Archive (Q-25). | 1019…1027 · 1032 |
| Invite to Portal (WhatsApp only) and Preview as Homeowner (I §1–§2) | **Client access** panel (`components/portal/client-access-panel.tsx`) and **See it as {client}** (a read-only preview session) | 966 |
| Tools › Homeowner Portal › Project Links: family members, contact update (I §4, M §13) | Client access's household rows (`household-rows.tsx`, `household-dialog.tsx`); Company › Client portal › **Clients** | 1010 · 1017 · 967 |
| Tools › Homeowner Portal › Configuration hub, also mounted at Accounts › HomeOwner Portal (M §2–§12) | **Company › Client portal** (`/company/portal`, `/company/portal/clients`): address, Live / Paused, *Getting it live*, Open as a test client, the six section switches, the welcome line. The look comes from the brand kit (Q-39). Scope questions live in Company › Questionnaire (REG-612). About / Team come later (Q-47). | 967 · 1014 · 1016 |
| Accounts › Workflow Rules, Document Numbering, Payment Methods, Payment Schedules, Project Types (J-229) | **Settings › Projects** (`app/settings/projects-settings.tsx`): Numbers · Stages and handover · Updates · Invoices · Payments · Schedule defaults. Company › Templates › Payments. The issuing entity's bank and PayNow (Company › Profile). | 921 · 949 · 1006 · 1028 · 1041 |
| `/my/{slug}/login` with six login layouts and Twilio OTP (I §5) | `/my/[slug]/login`: phone, then a 6-digit code; one layout on the brand kit | 961 |
| `/my/login` signpost (I-136) | `/my` redirects to the studio's address (one studio) | 961 |
| Portal home, five layouts (I §6) | `/my/[slug]`: What needs you, Before work starts, Where the work stands, Latest update, Your designs | 963 · 964 · 988 |
| `/my/projects/[id]` tabs Overview · Design · Finance · Documents · Support (I §7) | Portal tabs Home · Schedule · Updates · **Money** (`/my/[slug]/money`: what is paid, the stage due with how to pay, **I have paid**) · Choices · Designs · Files (`lib/portal/model.ts` `PORTAL_TABS`). Support becomes "Message your designer on WhatsApp" (Q-43). | 981 · 985 · 1042 · 1043 · 975 · 1015 · 965 |
| Milestones to Confirm card (E-221) | Confirm a stage on the portal's Schedule (Looks good · Something is not right) | 982 · 983 |
| Lead-stage engagement page `/my/engagement/[linkId]` (I §8) | Before work starts on the portal home, opening today's `/confirm` and `/sign` links | 964 |
| Homeowner bell: `homeowner_notifications` rows (I-104…I-114) | The portal's bell: rows derived from records, plus `portal_bell_reads` per person | 1012 |
| `/pay/[token]`, `/pay/inv/{token}`, `/pay/receipt/{token}`, `/my/{slug}/p/{token}` (I §9, G-294, G-319) | None. Invoices and receipts open inside the portal: `/my/[slug]/money/invoice/[invoiceId]` · `/my/[slug]/money/receipt/[paymentId]`. See §8 D-11. | 1042 |
| Rail Projects badge counting three status words (J-234, J-301) | The rail and dock badge counts projects needing attention (`countProjectsNeedingAttention` → `/projects?scope=attention`) | 919 |
| In-browser search over loaded projects (J-233) | The studio search's `project` kind, server-side, by Who sees leads (`lib/global-search/queries.ts`) | 922 |
| `/tasks` source filter, approval tasks (J-216) | Tasks hub: a project's tasks are lead tasks. Approvals are records plus bell rows, not tasks. | 920 |
| Dashboard project widgets (J-202…J-206) | Not built (Dashboard L7) | — |

## 2. Stores — 1.0 table → 2.0 table

| 1.0 | 2.0 | Notes | REG |
|---|---|---|---|
| `projects` (~60 columns + `timeline` JSONB, J-14) | `projects` (+ its `leads` row) | Field map in §3.1. The client's name, phone, email and property live on the lead. | 911 · 1019…1024 |
| `projects.timeline` JSONB (J-22, E-191) | **`project_milestones`** (one row each) + **`project_schedule_shares`** (what the client was shown) | §3.3. J-273's recommendation, built. | 933 · 937 |
| `project_milestones` (legacy, the homeowner's answer only, J-24 / J-25) | `project_milestones.confirm_*` | `homeowner_approval_status` approved → `confirm_answer = 'confirmed'`; `revision_requested` → `'changes'`. Comment → `confirm_note`, `_at` → `confirm_answered_at`. | 980 · 982 |
| `project_assignees` (J-34) | `lead_assignees` of the project's lead | Commission splits are dropped (money out). Add any project-only member to the lead. | 911 |
| `tasks` with `project_id` (J-27) + `task_assignees` | `lead_tasks` (`lead_id` = the project's lead, `milestone_id` ← `linked_milestone_id`) | Approval-type tasks (`ProgressReview` · `ProjectClosure` · `InvoiceReview` · `MilestoneApproval` · `VOApproval` · `CommissionApproval`…) are **not ported**: 2.0 keeps an approval as a state on its record plus a bell row. Homeowner and external assignees have no home. | 941 |
| `progress_updates` (J-29, D-90) + `projects.progress_updates` JSONB (D-96) | `project_updates` + `project_update_files` | §3.4 | 948 · 950 |
| `project_files` (J-30) | `lead_files` (+ `lead_file_images` in the prototype) | `is_homeowner_visible` → `shown_to_client_at`. `approval_status` has no home. Storage keys `<studio>/<project>/<folder>/<uuid>-<name>` (J-283) need a mapping to the lead file. | 965 |
| `project_selections`, options as JSON (J-32, F-166) | `project_selections` + `project_selection_options` | §3.7 | 970 · 971 |
| `variation_orders` bridged to `quotes` type `variation` (J-215) | `quotes` with `kind = 'variation'`, `project_id`, `confirmed_via`, `confirmed_marked_by` | §3.6 | 1000 · 1001 |
| `project_invoices` (J-57) | `project_invoices` (same name, a narrower record) | §3.5. **Not** 2.0's `invoices`, which is the studio's own plan billing. | 994 |
| `payment_records` (J-57) | `project_payments` | §3.5. Payments reach the money numbers only through `moneyPaymentsOf` (`lib/projects/payments-records.ts`) → `moneyInputOf`. | 1034 |
| `credit_notes` | — | Not built. Over-billing shows as "S$x to credit" on Money. | 993 · 1003 |
| `purchase_orders` · `po_*` · `expenses` · `commission_*` · `finance_documents` · `journal_lines` | — | Money out, not built | — |
| `studio_sequences` (`project` · `invoice` · `receipt` · `credit_note`, J-42) | Settings keys `project_numbering` · `invoice_numbering` · `receipt_numbering` | §4 Numbering | 921 · 994 · 1038 |
| `homeowner_profiles` (unique per studio + phone, J-48) | `homeowner_profiles` (unique on phone, bare 8 digits) | Normalise E.164 to 8 digits through `isSgPhone`; a non-SG number has no home (M-234). `avatar_url` is dropped. | 960 |
| `homeowner_project_links` (J-49): role primary / secondary, `portal_token`, `last_seen_at` | `homeowner_lead_links` (one per lead, the primary) + **`homeowner_household_links`** (everyone else) | §3.8 | 960 · 1009 |
| `homeowner_shared_assets` (J-51) | The Visualizer's `render_share_links` (the AI Visualizer map, `17-…`), and `shown_to_client_at` for files | The portal's Designs tab lists live share links | 1015 |
| `homeowner_notifications` (J-52) | — (derived) + `portal_bell_reads` | §8 D-12 | 1012 |
| `homeowner_notification_preferences` (J-53, dead) · `client_portal_tokens` (J-54, `/pay`) | — | Not ported | — |
| `studios.portal_slug` (M-35) | `portal_addresses` (current + retired rows) | §3.9 | 960 · 962 |
| `studios.settings.portal.*`, `.payment_details`, `.payment_approval`, `.workflow`, `.features.lockProjectOnHandover` | Settings keys `portal` · `portal_sections` · `portal_welcome` · `project_update_review` · `project_invoices` · `project_payments` · `project_handover`; the brand kit; the issuing entity | §3.9 | 949 · 967 · 1006 · 1014 · 1016 · 1028 · 1041 |
| `studio_milestone_templates` · `studio_document_templates` type `timeline` · `project_types` + `milestone_templates` · `studio_timeline_templates` (J-311) | `schedule_templates` + `schedule_template_items` | Four stores collapse into one (§8 D-15). An item is `days` (end − start + 1) and `gap_days` (start − the previous one's end). Payment % and colour are dropped. | 940 |
| `payment_schedule_templates` (J-41) | `payment_templates` (Company › Templates › Payments) | Already in the quote templates map (`04-…`) | — |
| `project_templates` (no screen, J-37) | — | Not ported | — |
| `project_rooms.project_id` · `render_jobs.project_id` (J-35) | Unchanged: 2.0's designs hang on the lead, so a project reaches them through it | A room with a project and no lead takes the project's lead id. See map 17. | — |
| `project_floor_plans` + annotations · `project_snag_items` · `escalations` · `conversations` · `copilot_sessions` · `meeting_briefs` | — | Not built | — |
| `notifications` rows of project events (J-175…J-189) | `notifications` (`lib/notifications/model.ts` event keys) | No need to port history: derived rows come back on their own and old rows would show as new. | 918 · 954 · 968 · 1031 |
| — (1.0 left no record) | `lead_events` rows with `project_id` | §4 Events | 912 |

## 3. The field mapping that matters

### 3.1 `projects`

| 1.0 column | 2.0 | Note |
|---|---|---|
| `lead_id` (nullable, SET NULL; one per lead only in the app, J-18) | `lead_id` NOT NULL, unique index `projects_lead_uq`, cascade | A project with no lead (clone, the bot, a deleted lead) gets a minted `direct` lead. 1.0 already minted a parked lead for New Project (J-208). Two projects on one lead: §8 D-2. |
| `project_seq_id` (`#31`, J-19) | `number` | `formatProjectNumber(numbering, seq, created_at)` with **1.0's seq** gives "P-2025-031", so the studio keeps its running number. `nextProjectSeq` continues past the highest under the prefix. |
| `name` | `name` | — |
| `client_name` · `customer_phone` · `customer_email` · `property_type` · `property_name` · `property_address` | The lead row | A Won lead already has them (leads map `02-…`); a direct lead takes the project's. `scope` (12 room names) has no home. |
| `project_type` (1.0's six) | `project_type` | Use the leads map's translation (MM-32 / Q-34): Renovation-Full Home and New-Full Home → Whole-home renovation; Renovation-Partial and New-Partial → Partial renovation; Commercial → Commercial fit-out. "Others" stays as text, and no filter offers it. |
| `budget_total` (whole dollars) | `agreed_value_minor` (× 100) | Only when no system quote holds the contract: a direct project, or a signed quote that was uploaded |
| `quote_data` · `quote_status` | `quote_id` | Point at the contract base in G-170's order: the latest client-signed non-variation quote with a total above zero, else the primary quote that is approved or sent for signature |
| (the timeline's payment %) for a project with no system quote | `payment_template` `{ template, rows: [{ name, pct }] }` | A direct project's split (F-20) |
| `contract_file_name` · `contract_file_url` (bucket `contract-files`) | `contract_id` → `contracts` | An uploaded contract becomes a contract row the way the Won step's upload does (`lib/contracts/won.ts` `recordWonUpload`), its bytes a lead file |
| `company_id` (+ `entity_locked_at`, J-16) | — on the project | The entity is the signed quote's; each invoice keeps its own `issuing_entity` (an `IssuingEntity.id`, `lib/company/entities.ts`) |
| `start_date` · `due_date` | `start_date` · `target_end_date` | Once a schedule exists, the target end follows the handover milestone (the one that ends last) |
| — | `started_at` | Backfill (§4) |
| `stage` + `closure_*` + `archived_at` | `stage` + the ending columns | §3.2 |
| `created_at` · `updated_at` | `created_at` · `updated_at` | `updated_at` never moved in 1.0 (J-300) |
| — (no creator, J-14) | `created_by` | The first assignee, else the Owner |
| `status` · `current_phase` · `progress` · `is_delayed` · `next_milestone` · `thumbnail_url` · `budget_used` · `timeline_status` · `progress_updates` · `project_type_id` · `payment_schedule_rebalance_log` · `handover_locked_at` · `ai_plan_metadata` · `assigned_to` · `assigned_designer` · `client_profile_id` · `agent_idempotency_key` | — | Legacy, dead or mirrored (J-272, J-308). Progress and lateness are derived in 2.0. |
| `satisfaction_*` · `commission_*` · `country_code` · `notes` · `closure_summary` | — | No home. §8 D-13. |

### 3.2 Stage

| 1.0 | 2.0 `stage` | Also write |
|---|---|---|
| `Draft` | `setting_up` | — |
| `Active` | `in_progress` | `started_at` (§4) |
| `Active` + `closure_status = pending_review` | `in_progress` | `handover_requested_by` / `_at` ← `closure_submitted_by` / `_at`; `handover_note` ← the summary's closure notes |
| `Active` + `closure_status = rejected` | `in_progress` | `handover_review_note` ← `closure_rejection_comment`; `handover_reviewed_by` / `_at` ← `closure_approved_by` / `_at` (1.0 stamps the rejecter there, D-333) |
| `Closed` (`closure_status = approved`) | `completed` | `completed_at` ← `closed_at` (no migration creates it, J-287), else `closure_approved_at`; `completed_by` ← `closure_approved_by`; `complete_reason` ← the deferred items joined ("{what} — {reason}"); a `project_completed` event |
| any + `archived_at` | §8 D-1 | — |
| `status` (`planning` · `hacking` · …) | ignored | J-08 |

### 3.3 The timeline JSONB → `project_milestones` and `project_schedule_shares`

| 1.0 milestone field (E-191) | 2.0 | Note |
|---|---|---|
| `id` | `id` | Keep it: tasks, updates, choices and invoices tie to it |
| `name` · `order` | `title` · `position` | — |
| `startDate` · `endDate` (ISO, **often empty**: J-23 seeds undated rows) | `start_date` · `end_date` (NOT NULL) | §8 D-3 |
| `status` `not-started` · `in-progress` · `blocked` · `completed` · `pending-approval` | `not_started` · `in_progress` · `blocked` · `done` · see §8 D-9 | `done_at` ← `finalizedAt`, else the end date. 1.0's one-active rule (E-196) is not 2.0's. |
| `dependsOn[]` (finish-to-start, several allowed) | `follows_id` + `gap_days` | One predecessor in 2.0: the one that ends last. `gap_days` = start − its end in days (1 = the next day). Log the rest. The server refuses a loop (`wouldCycle`). |
| `blockedBy` `{ reason, details, blockedAt, expectedResumeDate }` | status `blocked` + `waiting_on` · `waiting_note` · `waiting_since` · `waiting_until` | Vendor delay → `supplier`. Waiting on client / Client decision pending → `client`. Permit / approval and Other → no `waiting_on`, with the reason folded into the note (E-175, E-176). |
| `paymentPercent` · `type` · `amountCents` · `commissionTrigger` | `payment_ref` (+ `payment_due`, default `end`) | The share lives on the signed quote's Payment Schedule (`quote_payments`) or the project's split (`split:<n>`); a milestone only **ties** to it (Q-13). Match by the id 1.0 mirrored into the quote's schedule (E-261). One stage per milestone at most. §8 D-8. |
| `milestoneKind: 'payment'` markers (single-day amber bars, E-268, E-269) | none | A payment is a diamond on a work milestone in 2.0. Tie the stage to the work milestone that ends nearest the marker (as Create schedule does) and drop the marker. |
| `clientVisible` | `client_visible` | Visible unless explicitly `false` (E-244) |
| `publishedSnapshot` · `publishedAt` · `publishHistory` | **one `project_schedule_shares` row** per project | §4 Snapshots |
| `baselineStartDate` · `baselineEndDate` (deprecated) | `plan_start_date` · `plan_end_date` | Else the oldest dates in `publishHistory`, else the snapshot's |
| homeowner answer (legacy table) | `confirm_answer` · `confirm_note` · `confirm_answered_at` · `confirm_answered_by` (the lead's primary profile) + `confirm_asked_at` | 1.0 had no "ask" (E-221). §8 D-9. |
| `description` · `color` · `comments` · `sourceCategory` · deprecated `tasks` / `dependencies` | — | Comments were shown nowhere (E-220) |

### 3.4 `progress_updates` → `project_updates`

| 1.0 | 2.0 |
|---|---|
| `review_status = pending` | `status = in_review`; `submitted_by` ← `author_user_id`, `submitted_at` ← `created_at` |
| `approved` | `published`; `published_at` (`published_by` = the author; `reviewed_by` / `_at` were never stamped, D-85) |
| `rejected` | `sent_back`; `review_note` ← `review_comment` |
| `draft` (including an unpublished one, D-83) | `draft` |
| `title` · `description` | `title` · `body`: wrap plain text in `<p>` and pass it through `sanitizeContractHtml` |
| `author` · `author_user_id` | `author_id` |
| `attachments` JSON | Each photo becomes a lead file in **Files › Site updates** plus a `project_update_files` row in the original order. Videos and documents were never uploaded (D-101), so there is nothing to port; log them. |
| `milestone_id` (soft) | `milestone_id` (the same id, kept) |
| — | `client_opened_at` ← the primary link's `last_seen_at` when that is after `published_at` (1.0's unpublish rule, D-83) |
| `type` · `metadata` | Dropped. The auto posts "Schedule updated: …" (E-235) and "Milestone completed: …" (E-212) are real client posts: keep them as published. |

### 3.5 Invoices and payments

| 1.0 `project_invoices` | 2.0 `project_invoices` | Note |
|---|---|---|
| `status` `draft` | `draft`, **number null** | A 2.0 Draft has no number (R72 flags a numbered Draft). 1.0 numbered at creation, so log the dropped numbers. |
| `sent` · `partially_paid` · `paid` · `overdue` | `sent` | Part paid, Paid, *Payment to confirm* and Overdue are worked out (`invoiceState`): Overdue from `due_at`, the rest from `project_payments`. No cron (J-199). |
| `void` · `cancelled` | `void` | `void_reason` is required: "Voided in OpenMaison 1.0" / "Cancelled in OpenMaison 1.0" |
| `milestone_key` · `milestone_id` (G-186) | `stage_ref` (`quote_payments.id` \| `split:<n>`) · `stage_name` · `pct` · `position` | **One live invoice per stage** (R72 checks it). Ad-hoc, top-up, supplement and VO-backed invoices: §8 D-5. |
| `total_cents` · `gst_cents` | `amount_minor` · `gst_minor` | `amount_paid_cents` and `credited_cents` are derived, not stored |
| `invoice_number` | `number` (unique index) | Keep sent numbers verbatim: the client holds them. `nextInvoiceNumber` continues past the highest tail under the prefix; to keep 1.0's shape set `invoice_numbering` to `{ prefix: 'INV', year: false, digits: 4 }`. |
| `issued_at` · `due_date` | `sent_at` · `due_at` | Keep 1.0's due date; 2.0's rule (sent + terms) applies to new sends |
| `requires_approval` · `approval_status = pending` | `submitted_by` / `_at` | 1.0 kept no submitter: take the `InvoiceReview` task's creator, else the project's Designer, else the Owner |
| `approval_status = rejected` · `rejection_reason` · `approver_id` | `review_note` · `reviewed_by` / `_at` | — |
| `variance_cents` · `variance_reason` · `variance_resolution` | `variance_reason` (+ `edited_by` / `_at`) | The resolution and the reconcile task are not carried (G-198, G-199) |
| `company_id` | `issuing_entity` | — |
| `share_token` · `line_items` · `source_pdf_url` · `edit_history` · `reminder_count` · `country_code` | — | §8 D-11 for the token link. Reminders become `project_invoice_reminded` events. |

2.0's statuses are `to_confirm` · `confirmed` · `not_received` · `reversed`, with a `trusted` flag. `source` is `studio` · `client`.
What counts toward Paid is a `confirmed` payment, or a `to_confirm` one with `trusted` (`countsAsPaid`, `lib/projects/payments-model.ts`).

| 1.0 `payment_records` | 2.0 `project_payments` (migration 0066) |
|---|---|
| `invoice_id` · `amount_cents` · `payment_date` · `reference_number` · `notes` · `recorded_by` | `invoice_id` (+ `project_id`) · `amount_minor` · `paid_on` (local midnight) · `reference` · `note` · `recorded_by` |
| `payment_method` (six, G-224) | `method` `bank_transfer` · `paynow` · `cheque` · `cash`. Credit Card and GIRO: §8 D-6. |
| `verification_status` `id_verified` · `management_verified` | `status = confirmed`, `source = studio` (a homeowner's proof once verified: `client`); `confirmed_by` / `_at` ← `mgmt_verified_*`, else `verified_*` |
| `unverified` (a homeowner's proof) | `status = to_confirm`, `source = client`, `submitted_by` ← `submitted_by_homeowner_id`, `note` ← `homeowner_note` |
| `rejected` | `status = not_received`; `reject_reason` is required by R75's checks, and 1.0 kept none, so write "Not received (OpenMaison 1.0)" |
| — | `reversed` (`reversed_by` / `_at`, `reverse_reason`): new in 2.0 (F-18), nothing to port |
| `payment_proof_url` | `proof_file_id`, a lead file in **Files › Payments** |
| `receipt_number` (`RCP-0000`) | `receipt_number`, verbatim. To continue 1.0's series set `receipt_numbering` to `{ prefix: 'RCP', year: false, digits: 4 }`, else 2.0's `RCT-{YYYY}-{seq}` starts beside it. 1.0 issued receipts for unverified proofs too (G-319); 2.0 numbers only on confirm, so drop those numbers and log them. |
| trust mode (`trust_homeowner_submissions`, G-316) | `trusted = 1` on a client's proof that counted on arrival |
| `receipt_token` · `receipt_pdf_path` · `receipt_sent_at` · `ai_parse` | — (the receipt page and its Files entry are rebuilt from the row) |

### 3.6 Variation orders

| 1.0 `variation_orders` / variation quote | 2.0 `quotes` (`kind = 'variation'`) |
|---|---|
| `status` `draft` · `pending_owner` · `pending_client` · `approved` · `rejected` | `Draft` · `Sent for Approval` · `Sent to Client` · `Confirmed` · (no Rejected: §8 D-7) |
| `approved_by` / `_at`; the client's answer in the portal (J-182) | `confirmed_via` (`link` for a portal answer, else `in_person` · `whatsapp` · `email` · `paper` · `marked`), `confirmed_marked_by` |
| `vo_number` (`VO-0001` per studio, F-161) | `VO-1`, `VO-2`… per project (§8 D-7) |
| `project_id` · `quote_id` | `quotes.project_id`; lines on the variation quote, omissions as minus quantities |
| `triggered_by_selection_id` (J-32) | `quotes.selection_id` (migration 0066; set by `draftVariationFromPick`, REG-1047) |
| `cost_change_cents` · `timeline_impact_days` · `margin_impact_basis_points` · `audit_trail` · `linked_po_id` | — (the change is the quote's total; audit = events) |

### 3.7 Selections

| 1.0 `project_selections` | 2.0 |
|---|---|
| `category` (eight rooms, F-175) · `title` · `description` | `room` · `title` · `note` (a line for the client) |
| `designer_note` (never shown to the client, F-162) | No column (§8 D-13) |
| `options` JSON `[{ name, description, image_url, price_cents, vendor, specs, vo_cost_cents }]` | One `project_selection_options` row per element: `position` = its index; `image_url` → a lead file in **Files › Choices** (`file_id`); `price_minor` ← `vo_cost_cents` (the change against the quote; 0 → null, F-177); `source = 'upload'`. `price_cents`, `vendor` and `specs` go into `description` (§8 D-10). |
| `selected_option_index` (F-159) | `chosen_option_id` = the option row at that index. Check that the options were not edited after the pick (F-174). |
| `status` `draft` · `shared` · `approved` · `rejected` · `change_requested` | `draft` · `shared` · `chosen` (`chosen_by = 'client'`, `chosen_at` ← `responded_at`, `chosen_note` ← `homeowner_comment`) · §8 D-10 |
| `shared_at` · `created_by` | `shared_at` (+ `shared_by` = the creator) · `created_by` |

### 3.8 Homeowner links → the lead's link and the household

| 1.0 `homeowner_project_links` | 2.0 |
|---|---|
| role `primary` (on the project, or on the lead) | `homeowner_lead_links` (one per lead): `portal_token` · `chat_history_visible` · `created_at` ← `linked_at` · `last_asked_at` ← `last_questionnaire_invite_at` · `last_opened_at` ← `last_seen_at` · `opened_at` (1.0 has no first-open stamp, so use `last_seen_at`) · `invited_at` / `invited_by` (§8 D-4) |
| role `secondary` (family, I-124), including lead-only rows the project lost (M-236) | `homeowner_household_links` (`lead_id`, `homeowner_id`, unique): `created_at` ← `linked_at`, `opened_at` / `last_opened_at` ← `last_seen_at`, `relationship` null. 1.0 sent family nothing (I-130), so `invited_at` follows §8 D-4. |
| `is_active = false` (no writer, I-30) | `withdrawn_at` (rare) |
| hard-deleted family rows (I-125) | Nothing to port |

An opened link needs `invite_sent` and `portal_opened` events behind its stamps (R71's and R77's checks).

### 3.9 Portal set-up and project settings

| 1.0 | 2.0 |
|---|---|
| `studios.portal_slug` | `portal_addresses` current row. Clean it (`cleanSlug`) and refuse `RESERVED_SLUGS`; if it cannot stay, make one from the name (`slugFromName`) and keep 1.0's as a retired row only if it passes the rules. Retired rows redirect. |
| `portal.enabled = false` | Settings `portal` `{ paused: true }` |
| `portal.features.*` (15 switches, none enforced, M-40) | `portal_sections` (six): `progressUpdates` → `updates`; `invoicesAndPayments` → `money`; `documents` → `files`; `designSelections` → `choices` **and** `designs` (1.0's one switch hid both, M-113). Schedule stays on (1.0's `milestoneApprovals` was dead). The rest have no section. |
| `portal.branding.*` · layout · voice | The brand kit (logo, colour) only (Q-39). `loginTitle` (as plain text, ≤ 80) → `portal_welcome` `{ line }` when the studio set one. |
| `portal.studioProfile` · `aboutTeam` · `aboutUs` | — (Q-47, later) |
| `settings.payment_details` (bank, PayNow, QR) | The issuing entity's bank block and PayNow (Company › Profile), the one store (F-15). 1.0 had three stores (M-45); take `payment_details` first, since that is the one the portal read. |
| `settings.payment_approval` · `trust_homeowner_submissions` | Settings key `project_payments` `{ confirmer: 'designer' \| 'owner' \| 'member', memberId, trust }` (default: the assigned designer, trust off) |
| `workflow.progressReviewRequired` (+ `approvers.progressUpdate`) | `project_update_review` `{ on }`. 2.0 has no per-member approver list; Owners and Admins approve (§8 D-14). |
| Invoice approval (Finance › PO Settings, G-296) | `project_invoices` `{ approval, termsDays }` (default on, 7 days) |
| `numbering.invoicePrefix` | `invoice_numbering` |
| `features.lockProjectOnHandover` (default off, client-only) | Always on in 2.0: a completed project's schedule and money are read-only on the server |
| `workflow` Draft → Active gates (`contractRequired` · `projectTypeRequired` · `requireAssignment` …) | — (no gates; Getting started lists what is open) |

## 4. What a port must compute or backfill

| What | Why | How |
|---|---|---|
| **Events** (`lead_events` with `project_id`) | Activity is read from them, and every state needs its trail (REG-343). 1.0 kept none (J-46, J-47). | Per record: `project_created` (at `created_at`) · `project_started` · `project_completed` · `project_schedule_shared` (one per synthetic share) · `project_update_posted` / `_submitted` / `_approved` / `_sent_back` · `project_stage_confirmed` / `_changes` · `project_choice_shared` / `_chosen` · `project_vo_created` / `_approved` · `project_invoice_sent` / `_voided` / `_submitted` · `invite_sent` · `portal_opened` · `file_shown` · `project_payment_recorded` (a studio's payment) / `_submitted` (a client's) / `_confirmed` / `_not_received`. The kinds are listed in `lib/leads/events.ts`. |
| **The schedule snapshot** | The portal reads the newest `project_schedule_shares` row, never live milestones. Without one, the client's Schedule reads "Your schedule is on its way". | For every project with published milestones: one share whose `snapshot` is `{ v: 1, rows: ClientRow[], handover }` built from each visible milestone's `publishedSnapshot` (id, title, ISO start / end, state `done` / `in_progress` / `coming_up`, `confirm`); `shared_at` = the newest `publishedAt`; `changes` = `[]`; `note` null. Shape: `lib/projects/schedule-model.ts` (`ScheduleSnapshot`, `parseSnapshot`). Live edits made after the last publish stay unshared, which is what 1.0 showed the client too (E-224). |
| **Plan dates** | Plan against actual (layer 7) | `plan_start_date` / `plan_end_date`, as in §3.3 |
| **`started_at`** | 1.0 has no stamp | For an Active or Closed project: the earliest of the first started milestone's start, `start_date`, `created_at` |
| **`quote_id` and the contract** | `moneyOf` needs the base | §3.1 |
| **Payment stage ties** | Invoices hang on stages; *Ready to send* reads the tied milestone | `payment_ref` on milestones, `stage_ref` on invoices, through the same `quote_payments.id` |
| **Missing Drafts** | Every stage carries one live invoice | `draftInvoicesFor(projectId)` (`lib/projects/invoices.ts`) makes the missing Drafts. The Money tab also does this on first read. |
| **Numbering** | 2.0 numbers continue past the highest given | §3.1 · §3.5. `nextProjectSeq` reads the numbers already given under the prefix, so a port that keeps 1.0's numbers needs no counter row. |
| **Invited / opened stamps** | Sign-in admits only an invited, not-withdrawn number | §3.8 and §8 D-4 |
| **Files** | Updates, choices, payments and Shown to client point at lead files | Copy the bytes behind the same routes (§6). Folders: Site updates · Choices · Payments. |
| **Verification** | Catch a state with no trail | Lift the SQL of the `checks` list at the end of `scripts/repair-demo-data.ts` (R68…R77 sections). **Never run `npm run db:repair` on ported data**: its rules write the demo studio's projects and people. |

## 5. Rules now on the server (1.0 kept them in the browser, or had none)

| Rule | 2.0 | 1.0 |
|---|---|---|
| Who sees a project | `canOpenLead` / `visibleLeadIds` on every read and action | Filtered in the browser; the API returned everything (J-161, J-162) |
| Who changes a project | `mayChangeProject` = `worksOn` (team, their Manager, Owners, Admins), `CHANGE_RULE` | Any signed-in member (J-317) |
| Who sees money | `seesMoney` on every money read (`fetchProjectMoney`, the invoice page, the Overview card) and action (`forMoney`); the Money address answers without figures | Any member (J-124, J-163) |
| One project per lead | Unique index | App-only, bypassed by Clone and the bot (J-18) |
| Milestone dates, loops, a move carrying what follows, one stage per milestone | `schedule-actions.ts` + `moveWith` · `wouldCycle` (`schedule-model.ts`) | No server rule at all; whole-array writes (E-315, E-316) |
| What the client sees of the schedule | Only what Share changes stored | Block notes and payment % were read live (E-245) |
| Update review, with every state stamped | `publishesAtOnce` · `mayReviewUpdate` | Approve and reject open to any member, unstamped (D-85, J-98) |
| Withdraw an update only before the client saw it | `client_opened_at` (on screen, per publish) | Portal-wide `last_seen_at` (D-83) |
| One send path for invoices | `sendInvoice` / `submitInvoice`, `sendsAtOnce` | Save & Send skipped the approval gate (G-283) |
| Void: Owner / Admin, a sent invoice not paid; a fresh Draft takes its share | `voidInvoice` | Drafts only, no confirm, no Undo (G-223, G-239) |
| Variance beyond S$1 needs a reason | `setInvoiceAmount`, `VARIANCE_TOLERANCE_MINOR` | A treatment pick plus a task (G-198, G-199) |
| A client's VO approval recorded outside its link: Owner / Admin | `markVariationApproved` | — |
| Portal: only invited, not-withdrawn numbers; Paused refuses pages and actions; sections refused on the server; a preview writes nothing | `portalGate` · `portalActor(slug, { write, section })` · `PORTAL_FILE_RULES` `inSection` | Every lead with a phone had access (I-29); the pause and the switches only hid things (I-33, I-37, M-42) |
| A client's stage answer: asked, done, shared as done, once | `answerStage` `confirmBlock` (conditional update) | Any shown completed or pending milestone (E-221, E-312) |
| A client's pick: shared, not chosen, its own option, once; stored by id | `chooseOption` (conditional update) | Stored by position (F-158, F-159, F-174) |
| Completed is read-only (schedule, money, dates and value), except payments | `completedBlock` (`lib/projects/handover-model.ts`) | A client flag behind a feature switch (D-308, J-164) |
| Complete anyway, review a handover, Reopen, Delete: Owner / Admin | `completesAnyway` · `reviewsHandover` · `reopensProject` · `deletesProject` | Any member could approve a closure (D-304, D-321); no Reopen (D-309) |
| Delete refused while money is recorded | `deleteBlock`: payments, then sent un-voided invoices | Ten finance tables counted (J-60) |
| A lead with a live project cannot be deleted | `LEAD_HAS_PROJECT` on every lead delete path | — |
| Record a payment (team); confirm a client's (the confirmer, Owner, Admin); reverse (Owner / Admin); amount ≤ owed; paid on ≤ today and ≥ sent | `recordsPayments` · `confirmsPayments` · `reversesPayments` · `amountProblem` · `paidOnProblem` (`lib/projects/payments-model.ts`), checked in `app/projects/payment-actions.ts` | Verification unguarded (G-332); no reversal (G-329) |
| A client's proof never marks an invoice paid unless the studio switched *Trust the client's proof* on | `countsAsPaid` / `isPending`; `sayPaid` (`app/portal/payment-actions.ts`) writes `to_confirm`, behind `portalActor(slug, { write, section: 'money' })` | The proof counted as money received (I-313); trust mode marked it paid (G-316) |
| Void and Delete refuse once a payment counts | `voidInvoice`; `deleteBlock` reads `moneyRecordedOn` | A paid invoice could not be voided, and no screen could undo a payment (G-329) |
| Portal set-up: Owner / Admin. Client access: the client's team | `mayRunPortal` · `PORTAL_SETUP_RULE`; `PORTAL_ACCESS_RULE` | Two doors, two locks (M-36) |

*Who may do what* (`lib/settings/permissions.ts`) reads the same functions. Its project rows come from round 4a (2), round 5 (4), round 6
(3: `payment-record` · `payment-confirm` · `payment-reverse`) and round 7 (13).

## 6. What the prototype stands in for

| Stand-in | The live app |
|---|---|
| **Any six digits pass** at `verifyCode` (`app/portal/actions.ts`); `requestCode` sends nothing | An SMS one-time code (1.0: Twilio Verify, rate-limited per IP, I-165), sent at `requestCode`. Keep its rule: only an invited, not-withdrawn number gets a code. |
| **WhatsApp drafts**: invite, resend, remind, an invoice's send, a payment reminder, a household member's link (`waLink`, wa.me opens on the press) | The same press. Automatic SMS and email come later (Q-41). The record (`invite_sent`, `portal_reminded`, `project_invoice_sent`…) is already written. |
| Bell events' **email and WhatsApp channels are recorded, not sent** (`lib/notifications/emit.ts`) | The platform's sends (1.0's `dispatchNotification`, 360dialog templates, J-169…J-173) |
| **Derived bell rows**: the studio's `milestone_due` · `milestone_late` · task dues (`derivedDue`) and `payment_overdue` (`derivedPaymentRows`, `lib/projects/payments.ts`, hooked into `derivedDue`); every row of the client's bell (`BELL_PRODUCERS`, its payment rows read from `project_payments` through `paymentsFor` in `lib/portal/notifications.ts`). Stored studio events: `payment_to_confirm` · `payment_confirmed` · `payment_not_received` · `payment_reversed`. | Keep them derived: they leave once the work is done, and no overdue cron is needed (J-199). Email or WhatsApp for a derived row needs a sweep in production that sends once per row id (1.0's `notification-scheduled`, J-200). |
| **No card payment**: bank and PayNow only. A generated SGQR PayNow code with the amount and the invoice number as its reference (`lib/projects/payments-paynow.ts`: the payload and a QR encoder of its own, drawn by `components/projects/money/payments-qr.tsx`); the entity's uploaded QR when it has no PayNow ID. **"I have paid"** records a claim with the bank's confirmation; no money moves through the app. | The same (F-15). Check the generated codes against a banking app before going live: the prototype verified them by decoding only (REG-1046). |
| **One studio, address `demo-studio`**, made from "Demo Studio Pte Ltd"; `/my` redirects to it | Resolve the studio from the slug; one `portal_addresses` history per studio |
| Pictures and files as bytes in `lead_file_images`, served by `/files/img/[id]`, `/projects/[id]/media/[fileId]` (with ranges), `/my/[slug]/file/[fileId]` | Object storage behind the same routes and their checks (1.0's private `project-files` bucket and signed URLs, J-30) |
| *Download PDF* on an invoice or receipt is the browser's print; Files › Payments receipt entries keep no bytes | Server-rendered PDFs, if wanted |
| `portal_sessions` + an `om_portal` cookie on `/my`, 30 days; a preview session 60 minutes, by the member pressing *See it as* | The same, with a Secure cookie. A preview must come from a signed-in studio member. |
| No studio sign-in: the signed-in member is View as's `is_you` row (`sessionMemberId()`) | Real auth. A request with no session gets a 401 before the project, media and invoice routes run their checks (as map 17 says for pictures). |

## 7. What to protect

1. **The portal reads snapshots, never live rows.** Its Schedule, the home's *Where the work stands* and its handover date, and the portal
   Money tab's planned dates all read the newest share. A port that writes only milestones shows the client nothing. A change that reads
   live rows leaks moves the studio has not shared (REG-988 fixed exactly that).
2. **One set of money numbers.** `lib/projects/money.ts` `moneyOf`, fed by `moneyInputOf` / `moneySummaryOf`
   (`lib/projects/money-queries.ts`), is the only place a project's money is worked out. The Money tab, the Overview card, the listing,
   the invoice page, the quote editor's variation bar, the confirm page, the portal's Money and bell, and the handover checklist all
   read it. Payments enter only through `MoneyInput.payments` (`moneyPaymentsOf`). Never total money in a query (1.0 had three sets, G bottom line).
3. **`kind = 'quote'` filters.** A variation order is a quote. Every quote list, picker and count keeps it out (Quotes tab, Tools ›
   Quotes, the contract and X-Ray pickers, the lead's quote card, Won → project, the portal's *Look through your quote*). A new quote
   read must add the filter.
4. **`eq(leads.direct, false)`** on every surface that lists leads (the build record §5 lists them). A direct lead's `/leads/[id]`
   redirects to its project (`directProjectOf`).
5. **Portal actions revalidate no path.** A revalidation re-renders the client's page and wipes *Since you last looked*. The portal
   bar's links don't prefetch data.
6. **The section gates.** A section that is off is refused on the server: `portalGate`'s section rule, `portalActor(slug, { section })`,
   `PORTAL_FILE_RULES` entries tagged `inSection`, `withholdSections` + `NEED_SECTION`, the bell rows. A new portal surface declares its
   section.
7. **A preview records nothing** (`portalActor` refuses writes). **A pause stops the portal but not today's four links** (`/confirm`,
   `/sign` and the bundle, `/renders`, `/f`; Q-40, Q-50).
8. **Who sees a project = who sees its lead.** Don't add a project-only visibility.
9. **Every action writes its line, and every Undo removes it.** A new kind goes into both kind unions (`lib/projects/events.ts`,
   `lib/leads/events.ts`), the repair's unknown-kind check, and an Activity branch placed **before** the `project_` catch-all in
   `lib/leads/activity.ts`.
10. **Milestone ids stay stable.** Never regenerate a schedule over live ids: 1.0 detached tasks, invoices and approvals that way (E-249,
    E-279).
11. **Numbers.** An invoice is numbered when sent and a receipt when confirmed, never below the highest already given, under a unique
    index.
12. **A pick is stored by option id.**
13. **Long strings travel in one object argument** to a server action (uploads, rich text).
14. **The registries.** Extend these, don't fork: `PROJECT_TABS` · `PROJECT_COLUMNS` · `ATTENTION_REASONS` · `GETTING_STARTED` ·
    `PRIMARY_ACTIONS` · `ProjectMenuItems` · `PORTAL_TABS` · `NEED_PRODUCERS` · `BEFORE_STEPS` · `ACCESS_SECTIONS` · `PORTAL_FILE_RULES` ·
    `BELL_PRODUCERS`.
15. **Every new table goes into both baseline lists** (`lib/db/baseline.ts` `BASELINE_TABLES`, `scripts/snapshot-baseline.ts`).

## 8. Port decisions to agree before a port runs

"Vicky" in the last column means the answer changes what a user sees (AGENTS.md).

| # | Question | Recommended | Whose call |
|---|---|---|---|
| D-1 | 1.0's archived projects; 2.0 has no Archive (Q-25) | Closed + archived → `completed`. Active + archived → `completed` with `complete_reason` "Archived in OpenMaison 1.0 on {date}", listed in the port log so the studio can Reopen. | Vicky |
| D-2 | Two projects on one lead (Clone, the bot, J-79, J-302) | The newest live one keeps the lead. Each other one gets its own `direct` lead copying the client's details. | devs |
| D-3 | Undated milestones (J-23) and payment-only markers | No dates anywhere → no milestones (the project opens on *Set up the schedule*). Partly dated → lay each undated one after the one before, one day long, and log it. Markers per §3.3. | devs |
| D-4 | Which 1.0 links count as invited (1.0 auto-linked every lead with a phone, I-29) | `invited_at = linked_at` for a link that was ever opened, and for every link on a project In progress, so a client already told the address keeps access. Other links port uninvited. | Vicky |
| D-5 | Ad-hoc, top-up, supplement and VO-backed invoices (2.0 has one invoice per stage) | Sent ones: keep the rows as void with the reason "Billed outside the schedule in OpenMaison 1.0" and the amount in the port log, and record their payments against the stage's invoice. Drafts: drop. Needs agreement because Collected will move. | Vicky + devs |
| D-6 | Payment methods Credit Card and GIRO | Port as `bank_transfer` with the original method in `note` | devs |
| D-7 | VO numbers (per studio → per project); rejected VOs | Renumber VO-1… per project in created order, keeping 1.0's number in the title. Rejected → `Draft`, archived, with an Activity line. | Vicky |
| D-8 | The timeline's payment % differs from the signed quote's schedule (1.0 mirrored only into unsigned quotes, E-261) | Keep the signed quote's rows, since that is what the client signed, and log the difference | Vicky |
| D-9 | `pending-approval` and confirmations nobody was asked for | `pending-approval` → `done`. Set `confirm_asked_at` only where the client answered (= the publish time). Unanswered done milestones stay unasked; the studio can Ask. | devs |
| D-10 | Choices answered `rejected` / `change_requested`; `price_cents` vs `vo_cost_cents` | Keep them `shared` with the client's comment on a `project_choice_edited` line. The price is `vo_cost_cents`. | Vicky |
| D-11 | Old client links: `/pay/[token]`, `/pay/inv/{token}`, `/pay/receipt/{token}`, `/my/{slug}/p/{token}` | Redirect each to the studio's portal sign-in (`/my/[slug]/login`) | Vicky |
| D-12 | The client's bell on day one | Write `portal_bell_reads` for every derived row older than the port, so a client doesn't land on a full bell | Vicky |
| D-13 | Project notes, `designer_note`, satisfaction, the closure summary | Notes → one lead note per project ("From OpenMaison 1.0"). The rest go to the port log; there is no 2.0 home. | Vicky |
| D-14 | 1.0's per-member progress-update approvers | Not carried: Owners and Admins approve | Vicky |
| D-15 | Four timeline template stores (J-311) | Port `studio_milestone_templates` and the studio's own `studio_document_templates` of type `timeline`; skip the built-ins and `studio_timeline_templates` | devs |

## 9. Migrations, settings keys and demo repairs

**Migrations** (all additive):

| Migration | What it adds |
|---|---|
| `0058_projects` | `projects`; `lead_events.project_id`; `leads.direct` |
| `0059_updates_and_portal` | `portal_addresses`, `portal_sessions`, `project_updates`, `project_update_files`; five columns on `homeowner_lead_links`; `lead_files.shown_to_client_at` |
| `0060_schedule` | `project_milestones`, `project_schedule_shares`, `schedule_templates`, `schedule_template_items`; `lead_tasks.milestone_id` |
| `0061_choices` | `project_selections`, `project_selection_options` |
| `0062_portal_project` | `homeowner_lead_links.schedule_seen_at`; `project_milestones.confirm_answered_by` |
| `0063_money_in` | `project_invoices`; `quotes.kind`, `project_id`, `confirmed_via`, `confirmed_marked_by` |
| `0064_portal_household` | `homeowner_household_links`, `portal_bell_reads` |
| `0065_project_ending` | 12 columns on `projects` |
| `0066_payments` | `project_payments`; `quotes.selection_id` |

**Settings keys:**

- Projects: `project_numbering` · `project_update_review` · `project_invoices` · `invoice_numbering` · `project_payments` ·
  `receipt_numbering` · `project_handover` · `project_schedule_defaults`.
- Portal: `portal` · `portal_sections` · `portal_welcome`.

**Demo repairs.** The code runs R68 · R69 · R70 · R71 · R73 · R74 · R72, then R75 · R76, then R77. R75 and R76 together write Shalini
Menon's two payments, so take them as one step and don't rely on their order. They are demo data only; §4 says how to reuse their
checks.

| Repair | What it writes |
|---|---|
| R68 | Three Won projects and Marcus Teo's direct project |
| R69 | Schedules: Benjamin Han's is the canvas's |
| R70 | Updates |
| R71 | The portal address and invites |
| R73 | Stage answers and opens |
| R74 | Choices |
| R72 | Invoices and two VOs |
| R75 · R76 | R75: payments and receipts — Benjamin Han's overdue mid-project invoice, Ryan D'Souza's proof waiting for Michelle, Aisha Rahman's reversed cheque. R76: Shalini Menon's completed P-2025-001 and Tan Wei Ling's deleted P-2026-005. Between them they write Shalini's two payments. |
| R77 | The household, the client's bell, the sections and the welcome line |

## 10. Not built

- **Money out:** POs, goods received, expenses, bills, vendors, commission, the accounting sync and journal. Also the Finance rail item
  and a studio-wide money list (F-19), credit notes (only "S$x to credit"), and an Accounting role (F-16).
- **Client contact and tools:** tickets, escalations and chat (Q-43: WhatsApp the designer); floor-plan mark-up and the 3D planner
  (Q-19); compliance checklists; Meetings, Meeting Summary and Co-Pilot (Q-31).
- **Studio views:** AI-written timelines and task lists (Q-12, Q-30); the workload view (Q-08); Dashboard widgets; the snag list; Clone;
  project templates; the satisfaction rating.
- **Portal extras:** About and Team pages (Q-47); automatic SMS and email to clients (Q-41); a homeowner's own to-dos; a per-project
  portal switch (the six sections are studio-wide).
- **Regions:** countries beyond Singapore (J-238).

## Addendum — the gaps build (2026-10-07 → 08)

Built after this map, on the owner's "build everything" (record `27-projects-gaps-build-2026-10-07.md`). The 1.0 sources, what was not
ported and why, and each package's calls are in `projects-gaps-build/{id}-read.md`; what each built and the files it touched in
`{id}-outcomes.md`. Tables and columns added (migrations 0071…0081; demo data R78…R88):

| Package | New tables | New columns |
|---|---|---|
| A · project record | — | projects on_hold_at · on_hold_reason · on_hold_until · on_hold_by · scope · handover_deferred |
| B · money in | — | project_invoices kind · variation_id · reason · description · client_note · lines_json · charge_gst · due_mode · due_on · external_ref · external_file_id · share_token · file_id · fixed_minor; project_payments.share_token; quotes.change_reason; quote_items.omits_id |
| C · schedule and tasks | project_milestone_links · project_milestone_extensions · project_share_requests | lead_tasks external_name · external_phone · external_kind · external_sent_at; project_milestones description · color · started_at · resolved_note · resolved_at · resolved_by · done_asked_by · done_asked_at · client_note; schedule_templates.preset_key |
| D · updates, choices, portal | question_answer_history | quotes declined_at · declined_note · declined_by; contracts.casetrust_at; project_selections client_answer · client_answer_note · client_answer_at · client_answer_by · studio_note · receipt_file_id · receipt_hash; project_selection_options.vendor |
| E · files and delivery | lead_file_thumbs · notification_outbox | — |
| F1 · money out: costs | vendors · purchase_orders · purchase_order_lines · supplier_bills · expenses · payments_out · cost_documents | — |
| F2 · the books | commission_rules · commission_shares · commission_requests · commission_payouts · credit_notes · xero_links · xero_sync_log | — |
| G · floor plan | project_floor_plans · floor_plan_pictures · floor_plan_marks · floor_plan_comments · floor_plan_confirmations · floor_plan_seen | — |
| H · tickets, chat, About | project_tickets · ticket_replies · project_messages · chat_reads · studio_pictures | members portal_shown · portal_title · portal_bio · portal_photo_id |
| I · workload, compliance | project_compliance | members.project_capacity; lead_tasks.compliance_item |
| J · 3-D planner | space_layouts · space_layout_shares | — |

For the developers: a real email / WhatsApp provider plugs in at `lib/notifications/delivery.ts` (`setDeliveryAdapter`); Xero is
simulated (`lib/finance/xero-server.ts`) and needs real OAuth; the 3-D planner adds `three` (+ `@types/three`).

**Finance's address (REG-1360, 2026-10-08).** Finance is a Company section — Company › Operations › Finance at `/company/finance/<tab>`
(`app/company/finance/`, `FINANCE_BASE` in `lib/finance/sections.ts`); the rail has no Finance item. The server actions stay in
`app/finance/*-actions.ts` and a cost's file at `/finance/doc/<id>`; `/finance` and `/finance/<tab>` only redirect (query kept). A port that
writes links (the bell, emails, WhatsApp) writes `/company/finance/…` — `financeHref(tab, open)` in `lib/finance/server.ts`. Demo data: R89.

**Reports' address (REG-1361, 2026-10-08).** Every report lives in Company › Reports — `/company/reports/{leads,projects,finance}`
(`app/company/reports/`, `REPORTS_TABS` in `lib/company/sections.ts`); the loaders are unchanged (`fetchInsights`, `fetchProjectInsights`,
`fetchBooks` + `ReportsView`). `/leads/insights`, `/projects/insights` and `/company/finance/reports` only redirect.
