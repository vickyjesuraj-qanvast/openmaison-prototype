# Leads — the 1.0 → 2.0 migration map (for the devs)

Written 2026-09-24 at the end of the Leads parity programme (REG-605…613). It says, for every 1.0 table, column and rule the Leads
module touches, where the same thing lives in 2.0 and which round put it there — so a migration script and the code that follows it
have one place to look. The audit (`01-leads-1.0-to-2.0-audit-2026-09-24.md`) holds the reasoning; this holds the map.

Conventions: 2.0's data is Drizzle over libSQL (`lib/db/schema.ts`), rules live in `lib/`, every write is a server action with
`revalidatePath`. New tables keep 1.0's names where a 1.0 table exists; columns added to 2.0 tables keep 1.0's column names.
"Derived" means 2.0 computes the value from records instead of stamping it — exact while the source rows exist.

## 1. Tables

| 1.0 | 2.0 | Notes | Round |
|---|---|---|---|
| `leads` | `leads` | see §2 for the columns | — |
| `lead_assignees` | `lead_assignees` (`id, lead_id, member_id, assigned_at`) | `added_by` not ported; the commission split waits for Finance | — |
| `lead_activity_log` | **derived feed** + `lead_events` | `lib/leads/activity.ts` derives from every table; `lead_events` keeps only what leaves no row: `member_removed · field_edited · task_deleted · note_deleted · file_trashed · file_deleted · return_undone · invite_sent · questionnaire_asked` (`lib/leads/events.ts`) | R7 |
| `lead_outreach_attempts` | `lead_notes` (kind `contact`) + the Contacted stage log's entries | vocabulary: channels `WhatsApp · Email · SMS · Call · In person · Others`, outcomes `Connected · Callback requested · Meeting scheduled · No response · Not interested` (`lib/leads/enums.ts`) | R1 |
| `lead_artifacts` | — | Journey mode is out (owner) | — |
| `lead_files` | `lead_files` (+ folders, trash, comments) | richer in 2.0 | — |
| `lead_custom_fields` · `lead_custom_field_values` | `lead_custom_fields` · `lead_custom_field_values` | same shape (`options` JSON, `value` JSON); saved whole by `saveCustomFields` | R6 |
| `lead_categories`, `pipeline_stages` | — | dead in 1.0, not ported | — |
| `studio_lead_funnel` | the fixed five stages + `settings.stage_movement` | Linear / Flexible; On Hold · Lost are parked states with logs | — |
| `studio_taxonomies` (lead_source) | `settings.lead_sources` | + Homereno · Houzz · Renopedia defaults | R1 |
| `studios.settings.journey.inactivationReasons` | `settings.lead_reasons` (`LeadReasons`) | Lost / On Hold reasons with a contact gate; retire · restore · remove | R1 |
| `refund_requests` · `refund_reasons` | `lead_returns` (+ `sub_reasons` JSON, `detail`) · `return_attachments` | the seven reasons are code (`lib/leads/return-model.ts`), Qanvast's reply side is 2.0's | R3 |
| `lead_webhook_endpoints` · `lead_webhook_log` | `settings.lead_capture.webhooks` · `.webhookLog` (JSON) | a stand-in: the URL / key / counters / log; the receiver itself is the platform's | R6 |
| `email_connections` · `email_sync_log` | `settings.lead_capture.email` (JSON) | a stand-in: the inbox, the platforms, the last sync's counts | R6 |
| `homeowner_profiles` · `homeowner_project_links` | `homeowner_profiles` · `homeowner_lead_links` (`portal_token`, `chat_history_visible`, `invited_at`, `last_asked_at`) | lead-only links until Projects; one profile per phone | R3 |
| `studio_scope_questions` · `homeowner_scope_responses` (+ history) | `studio_scope_questions` (the bank) · `questions` per lead (`answered_by studio|client`) | a new lead copies the enabled bank; answer history not ported | R6 |
| `notifications` + preferences + templates | `notifications` · `settings.notification_rules` · `settings.message_templates` | events: new_lead · assigned · untouched · quote_approval · quote_confirmed · quote_signed · task_due · stage_changed · task_assigned · task_due_soon · hold_due · question_answered | R2 |
| `tasks` (lead follow-up) | `lead_tasks` (`kind` General · Call · **Follow-up**, `quote_id`) | a follow-up is a task; no `next_follow_up_*` on the lead | R2 |
| `studio_members.accepting_leads` · `lead_preferences` · `specialty` | `members.accepting_leads` · `lead_preferences` (JSON, four dimensions) · `specialty` | the suggestion is `lib/leads/suggest.ts` | R6 |
| `leads.owning_manager_id` | `members.manager_id` | the reporting line lives on the member | REG-601 |
| `imports`, `import_rows`, `stage_logs`, `lead_notes` (notes), `quote_comparisons` | 2.0 only | no 1.0 counterpart | — |

## 2. `leads` columns

| 1.0 | 2.0 | Round |
|---|---|---|
| `name, phone, email, budget, property_type, property_status, style_preference, area_sqft, notes, source, created_at` | `name, phone (8 digits), email, budget_minor, property_type, condition (Existing → Renovated), style, area_sqft, notes, source, created_at` | — |
| `area` (district, free text) | `area` (one of North · North East · East · West · Central) | R1 |
| `ic_number`, `customer_id` | `ic_number`, `customer_id` | R1 |
| `qanvast_lead_id` | `qanvast_lead_id` | R3 |
| `bucket, lead_status_code, sub_status_code` | `stage` (New · Contacted · Met · Quote Sent · Won · On Hold · Lost) + `stage_logs` | see the audit's §4.6 for the state mapping |
| `next_follow_up_date/time` | — (the earliest dated open `lead_tasks` row of kind Follow-up) | R2 |
| `first_assigned_at, first_outreach_at/by, signed_at` | derived: `min(lead_assignees.assigned_at)`, the earliest contact log, the Won stage log (`lib/leads/insights.ts` `factsFrom`) | R5 |
| `hold_restart_date`, `closed_reason_code/detail` | the On Hold log's `followUpAt` · the Lost log's `reason` + `competitor` / `restartAt` | R1 |
| `possibly_duplicate, duplicate_of_lead_id` | — (Create anyway creates; imports flag `import_rows`) | R3 |
| `archived_at` | **never `deleted_at`** (Deleted Leads removes for good after 30 days). The lead lands in **Lost** with one Lost `stage_logs` row: from its mapped stage, at `archived_at`, reason "Archived in 1.0" (a system reason, never added to `settings.lead_reasons`), `moved_by` = the member of its "Lead archived" `lead_activity_log` line; a lead already Lost keeps its own log, a lead with a project stays where the project holds it — `lib/port/archived-leads.ts` (`portArchivedLead`) | S46C (2026-10-19, corrects the earlier `deleted_at` row) |
| `temperature` | — (owner: no temperature) | — |

## 3. Rules and where they live

| Rule | 2.0 |
|---|---|
| Duplicate detection (create) | `findDuplicateLead` in `app/leads/actions.ts`: live lead by phone (8 digits) else email; the form's dialog |
| Duplicate detection (imports, captures) | `importLeads` → `import_rows.status = 'duplicate'`, the Review sheet's merge |
| Merge | `mergeImportRow`: picks win, every empty field fills, Remarks append |
| Assignment reach | `lib/leads/assign-policy.ts` (`assignableIds`, `assignHint`); the server twins in every action |
| Bulk assign | `addLeadMembers` — adds, never replaces; 2,000 cap |
| Designer self-assign | `createLead` forces the actor when their role is Designer |
| Stage order | `lib/leads/stage-policy.ts` (Linear / Flexible), validation `lib/leads/stage-data.ts` |
| Follow-up task | `MoveTask` in `moveStage`, `setFollowUp`, the Notes tab's Add tasks, `setQuoteDue` |
| Notifications | `lib/notifications/model.ts` (events, templates), `queries.ts` (`derivedDue`: untouched · overdue · due in 30 min · hold ended), `emit.ts` (`notify`) |
| Turnaround (TAT) | `lib/leads/tat.ts` (pure) + `lib/leads/insights.ts` (facts) |
| Suggested member | `lib/leads/suggest.ts` (Preference 0–40 · Performance 0–35 · Specialty 0–25) + `lib/company/preferences.ts` |
| Return rules | `lib/leads/return-model.ts` (`returnWindow`: 7 · 30 · 2, display only — numbers pending Qanvast) |
| Export columns | `lib/leads/export.ts` (`EXPORT_COLUMNS`, 25) |
| Portal auto-bind | `lib/leads/portal.ts` (`ensureHomeownerLink`) |
| Question bank → lead | `createLead` copies the enabled bank; `addStudioQuestions` for older leads (`lib/company/question-bank.ts` maps the types) |
| Custom fields | `lib/leads/custom-fields-model.ts` (types, display, validation) |

## 4. Still the platform's (not in the prototype)

The webhook receiver (HMAC, rate limit, aliases — audit §5 ¶14), Gmail OAuth and the poll, the AI document read and the AI
outreach parse, the homeowner portal's answer flow (`question_answered` fires when it lands), WhatsApp / email sends, the
5-minute ask throttle, Qanvast's return API (the numbers 7 · 30 · 2 need Qanvast's confirmation), commission splits (Finance),
the dashboard widgets (waiting for the L7 mocks), Projects.

## 5. Demo data

`fixtures/baseline.json` is the curated set (`npm run db:baseline` after any seeding); `scripts/repair-demo-data.ts` (R41…R45)
writes the records every visible state needs and ends with its checks — run it after any seeding. The states 1.0's demo studio
shows and 2.0 lacked were added in round 7: a Hangout lead, Lost leads for Budget mismatch and Project postponed with their
trails, a webhook arrival waiting in Review with its endpoint.
