# Inventory C — Journey / stage engine, and every lead touchpoint outside the leads pages

Repo A (OpenMaison 1.0): `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only). All paths below are relative to `src/` unless they start with `docs/` or `scripts/`. Line numbers come from the files as read on 2026-09-24.

Hand-off convention: rows that belong to the listing / creation / import / drawer readers are named as **[hand-off]** with only the engine-facing rule recorded here.

---

## A. Journey / stages — the Classic funnel

### C-01 · Default funnel (buckets → statuses → sub-statuses) with gates
- Where: `data/lead-bucket-config.ts:40-104` (`DEFAULT_FUNNEL_CONFIG`), types `types/app.ts:3779-3805`; per-studio override in table `studio_lead_funnel.config` (JSONB, `null`/empty = default); `docs/rules/leads.md:12-48`
- Entry: every stage write and every board/list grouping resolves through it; Accounts › Lead Management › Lead Funnel edits it (C-41)
- Does: a lead's position is the triple `leads.bucket` / `leads.lead_status_code` / `leads.sub_status_code` (all plain TEXT, unconstrained). Ordered default (id · label · flags):
  - **NEW** (`#5500FF`, order 0, `requiresAssignment:false`): `UNASSIGNED` "Unassigned"; `ASSIGNED` "Assigned". No sub-statuses.
  - **ONGOING** (`#469E59`, 1, `requiresAssignment:true`): `FOLLOW_UP` "Follow-Up" [followUpRequired] → subs `FIRST_CONTACT` "First contact pending", `AWAITING_REPLY` "Awaiting reply", `SITE_VISIT` "Site visit scheduled"; `CONTACTED` "Contacted" [followUpRequired] → `AWAITING_RESPONSE` "Awaiting response", `CALLBACK_SCHEDULED` "Callback scheduled"; `QUOTE_CREATED` "Quote Created" [requiresApprovedQuote] → `QUOTE_SENT` "Quote sent", `QUOTE_REVISED` "Quote revised"; `MET` "Met" → `PROPOSAL_DISCUSSED` "Proposal discussed", `PENDING_DECISION` "Pending decision".
  - **ON_HOLD** (`#F19E2B`, 2): `HOLD_1M` "Less than a Month", `HOLD_1_3M` "1 - 3 Months", `HOLD_3_6M` "3 - 6 Months", `HOLD_6_9M` "6 - 9 Months", `HOLD_9M_PLUS` "More than 9 Months" — all [followUpRequired], all share subs `CLIENT_NOT_READY` "Client not ready", `BUDGET_REVIEW` "Budget review", `SCOPE_CHANGE` "Scope change".
  - **CLOSED** (`#999999`, 3): `SIGNED` "Signed" [requiresApprovedQuote + requiresContract + requiresProjectType] → `CONTRACT_SIGNED` "Contract signed", `DEPOSIT_RECEIVED` "Deposit received", `PROJECT_STARTED` "Project started", `HANDOVER_IN_PROGRESS` "Handover in progress", `COMPLETED_HANDOVER` "Completed handover"; `INACTIVE` "Inactive" → `BUDGET_CONSTRAINTS` "Budget constraints", `WENT_COMPETITOR` "Went with competitor", `UNRESPONSIVE` "Unresponsive", `NOT_A_FIT` "Not a fit".
- Rules: per-status flags = `followUpRequired`, `requiresApprovedQuote`, `requiresContract`, `requiresProjectType`; per-bucket flag = `requiresAssignment`. Positional roles (`lib/leads/funnel-transitions.ts:253-269` `resolveFunnelRoles`): first bucket = intake, last = terminal, middle minus hold = "active"; hold bucket = id `ON_HOLD`, else any bucket whose id/label matches `/hold/i`, else none. Deprecated status alias `PROJECT_CREATED → SIGNED` (`lead-bucket-config.ts:171-173`). The drawer hides `PROJECT_CREATED` from selectable statuses.
- Data: `studio_lead_funnel(studio_id, config JSONB, updated_at)`; `leads.bucket`, `leads.lead_status_code`, `leads.sub_status_code`; legacy `leads.status` enum still written by dead routes (C-29).
- States: a lead can carry `bucket=NEW` + `ASSIGNED` with no assignee (legacy/SQL drift) — reads downgrade it to `UNASSIGNED` (C-02).
- Words: bucket labels "New" / "Ongoing" / "On Hold" / "Closed"; all status/sub-status labels as listed.
- Reachable: yes.

### C-02 · Bucket/status resolution and legacy derivation
- Where: `data/lead-bucket-config.ts:194-228` (`getLeadBucket`), `:264-280` (`deriveBucketAndStatus`), `:242-252` (`resolveAssigneeRemovalStatus`)
- Does: `getLeadBucket` uses `bucket` + `leadStatusCode` when both set; treats the `lead_assignees` junction as truth — `NEW/ASSIGNED` with no assignee reads as `UNASSIGNED`. Without bucket fields it derives from legacy `status`: `New`/`""` → NEW/UNASSIGNED (ASSIGNED if an assignee), `Assigned` → NEW/ASSIGNED, `Contacted` → ONGOING/CONTACTED, `Meeting` → ONGOING/MET, `Proposal` → ONGOING/QUOTE_CREATED, `Signed` → CLOSED/SIGNED, `Returned`/`Archived` → CLOSED/INACTIVE, anything else → NEW/UNASSIGNED.
- Rules: label falls back to the code when the config lacks it.
- Reachable: yes (every list/dashboard consumer).

### C-03 · Classic stage-move validation gate (server-mirrored, client-held)
- Where: `lib/leads/drawer-autosave.ts:45-125`; used by the drawer autosave (`components/leads/lead-detail-drawer.tsx`, [hand-off]); toggles from `app/api/studio-config/workflow/route.ts:16-29`
- Entry: any edit of bucket / status / sub-status / follow-up / budget in the Classic drawer (700 ms autosave)
- Does: computes errors keyed `assignment | quote | projectType | contract | followUp | budget`:
  1. `assignment` — when target bucket `requiresAssignment` **and** workflow `requireAssignment !== false`, **or** target status is `SIGNED`, and no assignee: "Assign at least one Interior Designer before moving to Ongoing". `NEW/ASSIGNED` with no assignee: "Assign at least one Interior Designer or move the lead back to Unassigned".
  2. `budget` — only when > 0: below min "Budget too low — please enter at least {min}."; above max "Budget exceeds the maximum supported ({max}). If this is correct, break it into multiple projects." Bounds passed by the drawer (CSV audit: 1,000–5,000,000).
  3. `quote` — when target status `requiresApprovedQuote` and workflow `quoteApprovalRequired !== false`: allowed quote statuses `approved | sent_for_signature | client_signed`; for `SIGNED` **without** an uploaded contract only `client_signed` counts. Messages: SIGNED → "Either e-sign the quote in-app or upload a signed contract before marking Signed"; else "An approved quote is required".
  4. `projectType` — status `requiresProjectType` and workflow `projectTypeRequired !== false` and empty: "Project type is required for Signed status".
  5. `contract` — status `requiresContract` and workflow `contractRequired !== false` and no saved/draft contract, unless a signature request is `pending | viewed | signed` or quote is `client_signed`: "A signed contract must be uploaded".
  6. `followUp` — status `followUpRequired` and no date: "Follow-up date is required for this status".
- Rules: `STATUS_GATE_KEYS = assignment, quote, projectType, contract, followUp` → `isStatusHeld`; `resolveAutoSaveHolds` → `holdStatus` (the three stage columns revert to last-saved in the payload, everything else saves — "save valid, hold invalid"), `holdBudget`. A lead that was already invalid before the drawer opened is not flagged; only an actual move is held. Header tag words: `Saving…` / `All changes saved` / `Not saved — {reason}` (`docs/rules/leads.md:311-318`).
- States: on a valid commit into SIGNED the drawer auto-opens Create Project once (C-74).
- Reachable: yes (Classic mode; in Journey mode the status block is hidden, C-34).

### C-04 · Interior-Designer-only stage restrictions (client-side)
- Where: `components/leads/lead-detail-drawer.tsx:1351-1366` (`handleBucketChange`), `:1368-1372`, `:1875-1877` (`onSubStatusChange`); `lib/access-control.ts:48-50` (`isIdOnly`)
- Does: for members with tag `id` and neither `admin` nor `owner`: (a) a bucket earlier than the **saved** bucket (index in the studio's bucket order) is refused with "You can only move leads forward in the pipeline."; (b) choosing status `UNASSIGNED` (or sub-status `UNASSIGNED`) is refused with "Interior Designers cannot unassign leads."
- Rules: compared against the persisted bucket, not the draft; removing every assignee chip still reaches Unassigned (CSV row 5 notes the inconsistency). Owners/admins can move backwards freely. **No server-side backward-move guard exists** (PATCH whitelists the three columns without ordering checks, C-07).
- Words: Team Members › Edit Permissions copy: "Can only move leads **forward** in the pipeline" (`components/settings/team-settings.tsx:711`).
- Reachable: yes (Classic mode).

### C-05 · Assignment writes and the unassign downgrade
- Where: `app/api/leads/mutations/[id]/assignee/route.ts` (modes `replace | upsert | unassign | update-split`), `data/lead-bucket-config.ts:242-252`, `lib/leads/tat-stamps.ts:13-24`
- Entry: assignee chips in the drawer / new-lead drawer / listing bulk assign ([hand-off] UI)
- Does: `replace` — deletes all `lead_assignees`, inserts one (`commission_split_bps 10000`), stamps `first_assigned_at` (write-once), notifies only if the member was not already assigned. `upsert` — adds members with even split (remainder to first), stamps, notifies for genuinely-new ids only, returns `newMemberIds`. `unassign` — removes one; when zero remain, `resolveAssigneeRemovalStatus`: bucket `ONGOING` **or** status `ASSIGNED` → `NEW / UNASSIGNED / null` (fires `lead.status_changed`); any other position (ON_HOLD, CLOSED, SIGNED…) untouched. `update-split` — edits `commission_split_bps`. Every mode re-mirrors `leads.assigned_to` = first-added junction member. New assignees are add-only cascaded onto the lead's project (`project_assignees`, split 0) and mirrored to `projects.assigned_to/assigned_designer`.
- Rules: manager-hierarchy lock (C-55) 403 `{"error":"Your role can't reassign this lead.","code":"ASSIGNMENT_LOCKED"}`. Drawer confirm before removing the last designer of a progressed lead: "This is the only designer assigned. Removing them will move "{name}" back to Unassigned. Remove anyway?" (`lead-detail-drawer.tsx:3619`).
- Data: `lead_assignees(lead_id, member_id, commission_split_bps, added_at, added_by)`, `leads.assigned_to` (deprecated mirror), `leads.owning_manager_id`, `leads.first_assigned_at`.
- Reachable: yes.

### C-06 · Intake position for every creation surface
- Where: `lib/leads/funnel-transitions.ts:237-247` (`resolveIntakeTarget`), `lib/leads/load-funnel-config.ts`
- Does: new leads land in the funnel's **first** bucket; **second** status when the bucket has one and an assignee is set (NEW/ASSIGNED on default), else first status (NEW/UNASSIGNED). Used by the create route (incl. `parkedForProject`), public webhook, email cron, hangout admin, agent `create_lead`; funnel read failures fall back to the default config silently.
- Reachable: yes. [hand-off: creation/import readers own the forms.]

### C-07 · Server stage write (Classic PATCH) and its guards
- Where: `app/api/leads/mutations/[id]/route.ts:45-80` (whitelist), `:109-127`, `:144-227` (manager lock), `:229-257` (entity), `:260-301` (quote mirror), `:313-316` (SIGNED stamp), `:318-353` (assigned notify), `:355-376` (stage notify)
- Does: `PATCH { updates }` accepts only whitelisted snake_case columns (stage triple, follow-up date/time, `assigned_to`, `project_type`, `quote_status`, `quote_data`, `contract_uploaded`, `contract_file_name`, property/contact fields, `ic_number`, `customer_id`, `quote_valid_until`, `company_id`, `quote_metadata`, `quote_hierarchy_metadata`, `engagement_state`, `hold_restart_date`, `email_lead_status`, `possibly_duplicate`, `duplicate_of_lead_id`). `archived_at` is **not** accepted (C-31).
- Rules: (1) `assigned_to` change under manager hierarchy → 403 `ASSIGNMENT_LOCKED` for locked designers; `owning_manager_id` written with replace semantics. (2) `company_id` must belong to the studio → 400 "Unknown legal entity for this studio". (3) `quote_status` moving to `approved | sent_for_signature | client_signed` on a lead with no `quotes` row → 409 `{"error":"This lead has no quote yet — save the quote before approving or sending it.","code":"NO_QUOTE_ROW"}`; `draft`/`rejected`/null free. (4) `lead_status_code = SIGNED` → `signed_at` stamped once. (5) `lead.assigned` fires only when the new scalar member is not already in the junction. (6) any stage-column change → `lead.status_changed` (C-65). No ordering / gate validation server-side — gates are client-only (C-03/C-04).
- Reachable: yes (drawer autosave, email-review hooks, engagement set-state).

### C-08 · Journey mode — the default 8-step spine
- Where: `lib/leads/journey.ts:13-75`, `:83-109`; config override `studios.settings.journey.steps`
- Does: ordered steps (`id` · label · order · evidence · backfillable): `assigned` "Assigned" 0 `none` **false**; `outreach` "Outreach" 1 `required` **false**; `site_visit` "Site Visit" 2 `optional`; `concept` "Concept / Render" 3 `optional`; `floor_plan` "Floor plan" 4 `optional`; `quote` "Quote" 5 `none` **false**; `contract` "Contract" 6 `none` **false**; `signed` "Signed" 7 `none`. Evidence rule vocabulary: `none | optional | required`.
- Rules: `assigned` displays as "Assign Designer" until done, then "Assigned". Compact-drawer short labels: `site_visit` "Site", `concept` "Concept", `floor_plan` "Floor" (full label in full-screen). Non-backfillable ids `assigned, outreach, quote, contract` hold even for custom configs unless the config sets `backfillable:true`.
- Reachable: yes when `features.leadJourneyMode` (default **true**, C-58).

### C-09 · Journey derivation (pure)
- Where: `lib/leads/journey.ts:281-440` (`deriveJourney`, `journeyIsWon`)
- Does: per step: own-done = positive override `done:true` > explicit `done:false` > raw signal. Raw signals: `assigned` = any junction assignee or scalar `assignedTo`; `outreach` = `outreachCount > 0` **or** bucket ∈ {`ONGOING`, `ON_HOLD`, `CLOSED`} **or** status ∈ {`CONTACTED`, `FOLLOW_UP`, `QUOTE_CREATED`, `MET`, `SIGNED`}; `quote` = quoteStatus ∈ {`submitted`, `approved`, `sent_for_signature`, `client_signed`}; `contract` = `contractUploaded` or `signatureRequestId`; `signed` = quoteStatus `client_signed`; design steps have no signal. Backfill: a backfillable step with order < highest own-done order is done, unless explicitly reopened (`done:false` pins it open). Status: `reopened` (override reason `reopened` and not done) > `done` > `active` (first not-done by order, unless won) > `blocked` (not done and behind the highest milestone) > `pending`. Won = the last-order step is done; when won no step is `active` and open hard prerequisites read `blocked`.
- Words: `STATUS_WORD` done "Done", active "Now", reopened "Reopened", blocked "Blocked", pending "Upcoming".
- Data read: `leads.journey_overrides` JSONB `{[stepId]: {done, by, at, reason}}`, `lead_outreach_attempts` (1-row probe on the list), quote/contract/signature fields.
- Reachable: yes.

### C-10 · Mark step done / skip / reopen
- Where: `app/api/leads/mutations/[id]/journey-step/route.ts`; hooks `lib/queries/lead-journey.ts:303-335`; RPC `merge_journey_override` (migration 203)
- Entry: ActiveStepCard buttons (C-13), mini-rail quick action (C-14)
- Does: `POST { stepId, done, reason? }` → merges `{done, by: session user, at: now, reason?}` into `journey_overrides[stepId]` (RPC, fallback read-modify-write); activity log `journey_step:{stepId}:{done|reopened}`; if `done` → journey floor (C-11) for milestones; if `done:false` and `stepId = signed` → revert signed position (C-11); if `signed` done → `signed_at` stamp.
- Rules: `reason` values used: `skipped` (optional design steps only), `reopened`. Manager-scope guard (C-55). Actor/timestamp never trusted from the body.
- States: reopening any step other than `signed` never regresses the funnel.
- Reachable: yes.

### C-11 · Journey → funnel floor and the signed-reopen exception
- Where: `lib/leads/funnel-transitions.ts:326-396` (`computeJourneyFloorPatch`), `:294-323` (`computeSignedReopenPatch`), `lib/leads/apply-journey-floor.ts` (`journeyStepMilestone`, `applyJourneyFloor`, `revertSignedFunnelPosition`)
- Does: step → milestone: `outreach | site_visit | concept | floor_plan` → `outreach`; `quote` → `quote`; `contract` → `contract`; `signed` → `signed`; `assigned`/custom → none. Floor targets: `signed` → the bucket owning status `SIGNED` (default CLOSED/SIGNED); others → first `requiresAssignment` bucket with status `CONTACTED` for outreach, `QUOTE_CREATED` (fallback `CONTACTED`) for quote/contract, else that bucket's first status. Applies only if it **advances** (bucket rank, then status order); never when `sub_status_code = PROJECT_STARTED`; a held lead is moved only by `signed`, which also clears `engagement_state`, `hold_restart_date`, `hold_prev_state`. Funnels without an assignment bucket / SIGNED status skip.
- Signed reopen: only when the lead sits exactly at the signed target and is not `PROJECT_STARTED` → lands in the last non-terminal non-hold bucket that requires assignment (ONGOING on default), first status, sub-status null. Quote status, projects and `signed_at` are deliberately untouched.
- Rules: all best-effort (logged, never fails the primary write); fires `lead.status_changed` when it moves.
- Reachable: yes (outreach POST + journey-step POST).

### C-12 · Journey tracker (drawer)
- Where: `components/leads/journey/journey-tracker.tsx`
- Does: focus bar shows the current step (reopened/blocked take precedence over the active step) with its status word and a "Next: {next step}" button (`aria-label` "Go to next step: {label}"); "Journey complete" when every step is done; a stepper of N equal bars with "{done} of {total}"; disclosure "All steps" / "Hide steps" listing each step with its status word; bar tooltips "{label} · Done by {by}" or "{label} · {STATUS_WORD}". Clicking any step focuses it in the ActiveStepCard.
- Reachable: yes (Journey mode).

### C-13 · Active step card (per-step actions and evidence gate)
- Where: `components/leads/journey/active-step-card.tsx`
- Does: step hints: assigned "Assign a designer below to start the journey."; outreach "Log your first contact below, or attach a WhatsApp screenshot / call note."; site_visit "Record the site visit, or skip if it doesn't apply to this lead."; concept "Attach a moodboard, render, or an inspiration link."; floor_plan "Attach a floor plan — a 3D scene, a PDF, or a photo of a sketch."; quote "Attach the quote you sent, or build one."; contract "Attach the contract document."; signed "Capture the client's signature or upload the signed contract."
  - `assigned`: no mark-done; done → "Designer assigned — manage in “Assigned Designers” below."; not done → button "Assign a designer" (scrolls to the assignees) or "Use “Assigned Designers” below to assign someone."
  - other steps: "Mark {label lowercased} done" (disabled while `evidence:required` and no artifact; tooltip "Add at least one piece of evidence before marking this step done"; inline "Add at least one piece of evidence to advance."); "Skip" only for `evidence:optional`; done → "Reopen" with confirm — title "Reopen the signed step?" / "Reopen this step?", body for signed "This puts the deal back in play — the lead returns to your active pipeline. The quote, any project already created, and the recorded signing date are NOT changed.", else "This moves the journey back to this step. Any attached evidence stays."; buttons "Reopen step" / "Cancel". Evidence list "Evidence ({n})" + "· optional for this step"; "Loading evidence…"; on fetch error "Couldn't load evidence — your attachments are safe; refresh to retry." and the gate **fails open**. The outreach step hides the generic list + Add evidence (the timeline owns it, C-15). "Current step" returns from a focused step. Optional `nativeTool` (e.g. quote digitizer) is the first menu entry.
- Words (toasts): "Step skipped", "{label} marked done", "{label} reopened", "Could not update step".
- Reachable: yes.

### C-14 · Board mini-rail
- Where: `components/leads/journey/lead-journey-mini-rail.tsx`
- Does: one dot per step + "{done}/{total}"; chip "Next: {label}" (click opens the drawer at that step), or "Journey complete" / "Deal won" (won never advertises a next step); popover "Journey · {n} of {total} steps" with per-step rows and legend Done / Now / Blocked / Reopened / Upcoming; quick action: "Mark {label} done" only for `evidence:optional` steps that aren't `assigned`; otherwise "Assign a designer" / "Go to {label}" (evidence `none`) / "Add evidence for {label}".
- Rules: derived purely from list data (`outreachCount` from the 1-row probe); commitment steps never advance from the board.
- Reachable: yes (Journey mode; [hand-off] card placement).

### C-15 · Outreach attempts — vocabulary, manual logging, timeline
- Where: `lib/leads/journey.ts:176-218`, `components/leads/journey/outreach-attempts.tsx`, `outreach-manual-tab.tsx`, `outreach-shared.tsx`, `lib/leads/outreach-form-helpers.ts`
- Does: channels `whatsapp` "WhatsApp", `call` "Call", `email` "Email", `sms` "SMS", `in_person` "In person", `other` "Other". Outcomes (optional) `no_answer` "No answer", `replied` "Replied", `callback_requested` "Callback requested", `not_interested` "Not interested", `connected` "Connected". Dialog "Log an outreach attempt" with tabs "Auto, from a screenshot" (default) and "Manual". Manual: Channel chips (default `call`), "Outcome (optional)", "When" datetime-local (default now, max now; helper "Defaults to now, backdate if you're logging a past call."; > 5 min ahead → "Outreach time can't be in the future."), "Notes (optional)", "Evidence (optional)" File | Link | Note ("Attach proof (e.g. WhatsApp screenshot)", `https://example.com` + "Label (optional)", "Evidence note"); "Log attempt". Timeline "Outreach & Evidence ({n})" merges attempts + standalone outreach artifacts newest first; earliest attempt gets the "First outreach" badge; rows show channel · when · outcome · notes · evidence chip · "by {name}"; per-row delete ("Delete this outreach log entry? This removes the whole attempt and its evidence.") and evidence delete; empty "No outreach or evidence logged yet."
- Words (toasts): "Attempt logged", "Could not log attempt".
- Reachable: yes (Journey mode; Classic never calls these hooks).

### C-16 · Outreach auto tab (AI chat-screenshot parse)
- Where: `components/leads/journey/outreach-auto-tab.tsx`, `lib/leads/ai-screenshot-parse.ts`, APIs `app/api/lead-outreach-attempts/parse-preview/route.ts`, `records/[id]/apply-parse-result/route.ts`, `records/[id]/parse-evidence/route.ts`
- Does: drop / paste (⌘V) / browse an image → `POST parse-preview {imageBase64, mimeType}` (stateless, Gemini `google/gemini-2.5-flash`; returns `isChatScreenshot, detectedChannel (whatsapp|email|sms|null), summary, extractedDateTime, suggestedTasks[]`). Resolved → channel chips WhatsApp/Email/SMS (defaults WhatsApp; "Not sure, please confirm" when unknown), "When" pre-filled (badge "Detected"), "Notes" pre-filled (badge "From the chat"), "Suggested tasks, added on save" checklist (all checked), collapsed "Outcome, exact time". Save: upload file → artifact (`journeyStep:outreach`, `kind:file`) → attempt (notes null) → `apply-parse-result` with the edited summary/date/checked tasks, which appends to `leads.notes` the block `\n\n{Channel} summary ({d MMM, h:mm}):\n{summary}` and writes `ai_parse` `{status:"done", summary, suggestedAttemptedAt, suggestedTasks, actionedTaskIndexes:[], dateDecision:null, dismissed:false, parsedAt}`. If apply fails, the timeline shows "Analyzing screenshot…" and calls `parse-evidence` (re-downloads, re-parses; qualifying channels `whatsapp|email|sms` with an image file artifact, else `not_applicable`; model failure → `failed`).
- Rules: copy "Drop in the conversation" / "We will work out the channel, pull a summary into your notes, catch a suggested date, and propose follow-up tasks."; errors "Couldn't find a conversation in that image." / "Couldn't read that screenshot right now." with "Try a different file" / "Switch to Manual" (carries the file over). Timeline card "AI found something": "Detected time: …" Apply / Dismiss (only when > 2 min from the logged time and no decision yet), per suggested task "Add task" (creates a `General` task assigned to the current user, linked to the lead) / "Dismiss"; card X sets `dismissed`. Manual tab never triggers AI.
- Data: `lead_outreach_attempts.ai_parse` JSONB (migration 263); `PATCH records/[id] { attemptedAt?, dateDecision?, addActionedTaskIndex?, dismissed? }`.
- Reachable: yes (Journey mode).

### C-17 · Outreach attempt APIs
- Where: `app/api/lead-outreach-attempts/records/route.ts` (GET/POST), `records/[id]/route.ts` (PATCH/DELETE)
- Does: `POST {leadId, channel, outcome?, notes?, attemptedAt?, artifactId?}` — 400 "leadId and channel are required", "attemptedAt is not a valid timestamp", "attemptedAt cannot be in the future" (5-min skew); `performed_by` = session user; then `first_outreach_at/by` stamp (fills when empty, re-stamps **earlier** when backdated), journey floor `outreach` (C-11), activity `outreach_logged:{channel}`. `PATCH attemptedAt` re-runs the stamp. `DELETE` removes the attempt **and** its linked artifact (notes/tasks produced by AI stay). GET orders by `attempted_at desc`.
- Data: `lead_outreach_attempts(id, lead_id, studio_id, channel, outcome, attempted_at, notes, artifact_id → lead_artifacts ON DELETE SET NULL, performed_by, created_at, ai_parse)`.
- Reachable: yes.

### C-18 · Evidence (artifacts)
- Where: `components/leads/journey/add-evidence-menu.tsx`, `app/api/lead-artifacts/records/route.ts`, `lib/leads/journey.ts:222-240`
- Does: menu "Add evidence" → optional native tool (sparkle, first), "Upload file", "Paste link" (dialog "Paste a link": `https://…`, "Label (optional)", "Add link"), "Add note" (dialog "Add a note": "What happened?", "Add note"). Kinds `file | link | note | tool`; `journey_step` = any step id or `closure` (inactivation proof). File artifacts resolve `url` to `/api/files?id={fileId}` (session-gated proxy). `POST` requires `leadId, journeyStep, kind`; `created_by` from session.
- Words (toasts): "Evidence added", "Link added", "Note added"; errors "Could not attach file" / "Could not save link" / "Could not save note".
- Data: `lead_artifacts(id, lead_id, studio_id, journey_step, kind, file_id, url, note, tool_ref JSONB, label, created_by, created_at)`; deleting an artifact nulls the attempt pointer.
- Reachable: yes.

### C-19 · Engagement state (vocabulary + suggestion engine)
- Where: `lib/leads/journey.ts:113-172`; `useSetEngagementState` `lib/queries/lead-journey.ts:350-373`
- Does: states `active` "Active", `awaiting_client` "Awaiting client", `stalled` "Stalled", `on_hold` "On Hold". Suggestion (`suggestEngagementStateWithReason`): null when bucket `CLOSED` or already `on_hold`; idle > 14 days (`STALL_AFTER_DAYS`) with no follow-up dated today or later → `stalled` "No activity for {n} days and no upcoming follow-up."; latest outcome `no_answer` → `awaiting_client` "Last outreach went unanswered."; `callback_requested` → `awaiting_client` "Client asked for a callback."; `replied` → `active` "Client replied to your last outreach."; `connected` → `active` "You connected on the last outreach."; `not_interested` → `stalled` "Last outreach outcome was “not interested”."; upcoming follow-up → `awaiting_client` "A follow-up is scheduled."; else `active` "Recent activity on this lead."
- Rules: the suggestion chip / state dropdown were **removed from the drawer** (2026-07-20); `suggestEngagementStateWithReason` has no callers and `engagement-state-pill.tsx` no longer exists. Only `on_hold` ↔ `active` are written today (C-20/C-21).
- Data: `leads.engagement_state`.
- Reachable: dead code except hold/resume.

### C-20 · Move to Hold
- Where: `components/leads/journey/hold-dialog.tsx`, `lib/queries/lead-journey.ts:377-441` (`useSetHold`), `app/api/leads/mutations/[id]/engagement/route.ts` (kind `hold`), `lib/leads/funnel-transitions.ts:45-101`
- Entry: drawer Journey block "Move to Hold" (or the "On hold · revisit {date}" pill to re-hold)
- Does: dialog "Move to Hold": "We'll keep this lead's progress and remind you to revisit on the restart date."; "Restart date *" (min today); "Reason / note (optional)"; buttons Cancel / "Move to Hold". Server patch: `engagement_state:'on_hold'`, `hold_restart_date`; when the funnel has a hold bucket: `bucket` = hold bucket, `lead_status_code` = tier by months to restart (<1 `HOLD_1M`, <3 `HOLD_1_3M`, <6 `HOLD_3_6M`, <9 `HOLD_6_9M`, else `HOLD_9M_PLUS`; custom hold buckets without those ids → first status), `sub_status_code:null`, `next_follow_up_date` = restart date, `next_follow_up_time:'09:00'`, and `hold_prev_state = {bucket, leadStatusCode, subStatusCode}` stashed unless already in the hold bucket (re-hold keeps the original stash). Activity log `hold_set:{restartDate}` or `hold_set:{restartDate} — {note}`. Client then cancels any pending `lead.hold_restart` rows and schedules an **in-app** ping at `{restartDate}T09:00` local (only if future) with title "Hold ended — revisit {name}" or "Hold ended — revisit {name} ({note})", `actionUrl /leads?leadId={id}`, recipient = assignee/owner id passed by the drawer.
- Rules: funnels without a hold bucket write engagement fields only (board badge carries visibility); `lead.status_changed` fires on the bucket move. Journey milestones are preserved.
- Words (toasts): "Moved to Hold" / "Could not move to Hold".
- Reachable: yes (Journey mode). Agent `update_lead` moving into the hold bucket must pass `next_follow_up_date` — error "Moving a lead to \"{Hold label}\" requires next_follow_up_date (the hold restart date) — please also specify next_follow_up_date." (`lib/agents/executors.ts:2218-2229`).

### C-21 · Resume from hold
- Where: `lead-detail-drawer.tsx:622-630`, engagement route kind `state`, `funnel-transitions.ts:126-159`
- Does: "Resume lead" → `state:'active'` → `hold_restart_date:null`, stash consumed; if the lead still sits in the hold bucket: restore the stashed bucket + status (+ sub-status only if the status matched), else fallback = first `requiresAssignment` bucket when `assigned_to` is set (ONGOING/FOLLOW_UP) else first bucket (NEW/UNASSIGNED), first status. A manual move out of the hold bucket beforehand wins. Cancels the revisit ping.
- Words: toast "Lead resumed" / "Back in its pre-hold stage."; error "Could not resume lead"; pill "On hold · revisit {date}".
- Reachable: yes.

### C-22 · Close lead (structured inactivation)
- Where: `components/leads/journey/inactivation-dialog.tsx`, `lib/leads/journey.ts:244-273`, `app/api/leads/mutations/[id]/close/route.ts`, `lib/queries/lead-journey.ts:445-503`, `funnel-transitions.ts:165-177`
- Entry: drawer Journey block "Close lead" (Journey mode); Classic mode closes by choosing CLOSED/INACTIVE in the dropdowns (no wizard)
- Does: 3-step dialog "Close lead — {name} · Step {n} of 3".
  - Step 1 "Why are you closing this lead?" — default reasons (code · label · requiresProof · fields · gate): `lost_competitor` "Lost to competitor" · false · competitor, competitor_why; `budget_mismatch` "Budget mismatch" · false · their_budget, our_quote; `postponed` "Project postponed" · false · restart_date; `unresponsive` "Unresponsive" · **true** · none · `gateAfterAttempts:3`; `not_a_fit` "Not a fit" · false · dimension; `client_cancelled` "Cancelled by client" · false · free_text; `other` "Other" · false · free_text. Gated reasons are disabled with "needs {n} attempts — {k} so far".
  - Step 2: "Competitor name", "Why did we lose? (optional)", "Their budget" / "Our quote" (number; shows "Gap: +{diff}"), "Expected restart date" (hint when < 182 days away: "Under 6 months away — consider “Move to Hold” instead of closing."), dimension chips `region | scope | style | timing`, free text ("Please describe (required)" for `other`, else "Notes (optional)"), "{n} logged attempt(s) will be attached as proof." for unresponsive, "Proof *" (required when `requiresProof` and not unresponsive) / "Proof (optional)" → "Attach file". Next enabled only when valid.
  - Step 3 summary "{name} → Closed · {reason}", "Competitor: …", "Budget gap: …", "Dimension: …", "Restart: …", "1 file attached" / "{n} attempts attached" / "No proof attached", checkbox "I confirm this information is accurate", button "Close lead".
  - Server: proof file uploaded as artifact `journeyStep:closure`; `POST close {reasonCode, reasonLabel, detail, proofArtifactIds}` → bucket/status = `resolveClosedTarget` (bucket `CLOSED` else last bucket; status `INACTIVE` else first status matching `/inactive|lost|drop|dead|not.?a.?fit/i` else first), `sub_status_code:null`, `engagement_state:null`, `hold_restart_date:null`, `hold_prev_state:null`, `closed_reason_code`, `closed_reason_detail` (detail + `proofArtifactIds`); activity `lead_closed:{reasonLabel}`; `lead.status_changed`. Client then `POST /api/tasks/records/cancel-by-lead` (cancels NotStarted/InProgress tasks and their `task.due_reminder` rows) and cancels the hold ping.
- Rules: manager-scope guard; no reopen path from the wizard (Classic dropdowns or Journey "Reopen" of signed only).
- Words (toasts): "Lead closed" / "Could not close lead".
- Data: `leads.closed_reason_code`, `leads.closed_reason_detail` JSONB.
- Reachable: yes (Journey mode).

### C-23 · Next follow-up (date/time) and the LeadFollowUp automation
- Where: Classic: drawer status block (follow-up required per status); Journey: `lead-detail-drawer.tsx:2077-2126` ("Next follow-up" date + time, chips "Tomorrow" / "+3d" / "Next week", "Overdue" when < today, "Clear"; hidden when won or on hold); `context/app-context.tsx:719-1000` (`updateLead`); `app/api/tasks/records/cancel-by-lead/route.ts`; `lib/lifecycle/transitions.ts` (`cascadeTaskCleanup`)
- Does (on each lead commit): (1) moving into the last/CLOSED bucket cancels every open (`NotStarted|InProgress`) task on the lead; (2) an actual `assignedTo` change re-assigns open tasks to the resolved profile (skipped when the member → profile can't be resolved — never falls back to the editor); (3) when workflow `autoCreateFollowUps !== false`, not moving to closed, a `nextFollowUpDate` is set and something the task depends on changed (date, time, status, sub-status): update the existing open `LeadFollowUp` task or create one — title "Follow up with {name} — {status label}[ — {sub-status label}]", `plannedTime` default `09:00`, assignee = lead assignee profile → current user → demo user, extra lead assignees fanned into `task_assignees`; an in-flight guard prevents duplicate creates. (4) schedules a reminder 30 min before the follow-up (C-24).
- Rules: `docs/rules/tasks.md:54-59`; Classic requires date **and** time when `followUpRequired` (C-03 checks date). Hold sets the follow-up to the restart date at 09:00 (C-20).
- Data: `leads.next_follow_up_date`, `leads.next_follow_up_time`; `tasks(type='LeadFollowUp', lead_id, planned_date, planned_time, assignee_user_id)`, `task_assignees(task_id, profile_id)`.
- Reachable: yes (both modes).

### C-24 · Follow-up reminder scheduling (30 minutes before)
- Where: `context/app-context.tsx:888-946`, `app/api/notifications/schedule/route.ts`, cron `app/api/cron/notification-scheduled/route.ts`
- Does: `fireAt = followUp − 30 min`; if still in the future: `DELETE /api/notifications/schedule {eventType:'lead.followup_reminder', entityId: leadId}` (drops pending future rows) **then** `POST` with `entityLabel "Follow up with {name}"`, `actionUrl` = lead deep link (relative), `recipientId` = task assignee, `channels ['in_app','email','whatsapp']`, `variables {lead_name, follow_up_time: "YYYY-MM-DD HH:mm", action_url}`. The route inserts one `notifications` row per channel (`status:'pending'`, `fire_at`), drops the WhatsApp row when the recipient has no phone, refuses past `fire_at` ("fire_at in the past"), skips demo studios, 403 on studio mismatch.
- Rules: cron every 5 min claims due rows atomically (pending → sent), delivers by channel, reverts + `retry_count+1` on failure (max 3), **releases** (no retry burn) rows of paused studios or channels this deployment can't deliver, skips demo studios. Pending scheduled rows are hidden from the bell until fired (`content.ts:isNotYetFired`).
- Reachable: yes.

### C-25 · Lead TAT stamps and the Performance report
- Where: `lib/leads/tat-stamps.ts`, `lib/leads/tat-report.ts`, `app/api/leads/tat-report/route.ts`; UI `components/leads/lead-performance-view.tsx` + `lead-response-time-card.tsx` [hand-off]
- Does: write-once stamps on `leads`: `first_assigned_at` (assignee route replace/upsert, create surfaces), `first_outreach_at` + `first_outreach_by` (outreach POST/PATCH; re-stamped earlier on backdated attempts), `signed_at` (e-sign submit, journey signed done, manual SIGNED via PATCH/agent). `GET /api/leads/tat-report?days=30|90|all` (400 otherwise) → 403 "Forbidden: owner/admin access required" unless tag `owner`/`admin`; excludes archived; prior window of equal length for comparison; report = `creationToAssignment`, `assignmentToOutreach`, `outreachToSigned` (median/avg/count; negatives clamp to 0), `awaitingAssignment` / `awaitingOutreach` (open = not in the funnel's terminal bucket), per-member rows (assignment TAT to all assignees; outreach/conversion to `first_outreach_by`; `roleLabel` "Studio Owner" / "Admin" / "Accounting" / "Interior Designer"). Display: minutes < 60 → "{m}m", hours < 48 → "{h}h", else "{d}d"; grade for assignment→outreach: ≤ 8 h good, ≤ 24 h warn, else bad.
- Rules: reassignment / attempt deletion never clears stamps.
- Reachable: yes (Performance view owner/admin; response-time card both modes).

### C-26 · E-sign completion advances the lead [hand-off pointer]
- Where: `app/api/sign/[token]/submit/route.ts:356-520`, RPC `finalize_signed_mirror` (migrations 244/254/303), `funnel-transitions.ts:182-189`
- Does: on client signature: `leads.quote_status → client_signed` (trigger-mirrored), lead moved to the bucket that owns status `SIGNED` (skipped when the funnel has none), `lead.status_changed` fired with no `triggeredBy` ("the system"), `signed_at` stamped. Journey `signed` step derives done from `client_signed`.
- Reachable: yes.

### C-27 · Project created from a lead → SIGNED / PROJECT_STARTED
- Where: `funnel-transitions.ts:205-232` (`resolveSubStatus`, `resolveProjectCreatedLeadPatch`), `lib/agents/executors.ts:2390-2425`, drawer/project drawer [hand-off]; `lib/project-lead.ts`
- Does: creating a project from a lead stamps the lead `bucket` = SIGNED-owning bucket, `lead_status_code = SIGNED`, `sub_status_code = PROJECT_STARTED` only if that sub-status exists in the funnel (never a phantom literal); activity "Project created — lead moved to {bucket}" (agent path); `lead.status_changed`. Leads with `PROJECT_STARTED` are never moved by the journey floor, the signed-reopen, or the drawer's Create Project (shows "Go to Project" instead). Projects created without a lead mint a **parked** lead at CLOSED/SIGNED/PROJECT_STARTED via `POST /api/leads/mutations/create {parkedForProject:true}` (log text "Lead created with project") so finance objects have an anchor.
- Reachable: yes.

### C-28 · mAIson agent tool stage writes
- Where: `lib/agents/executors.ts` (`create_lead` ~1757, `update_lead` 2185-2265, `create_project` 2390-2425)
- Does: `create_lead` uses `resolveIntakeTarget`; `update_lead` writes bucket/status/sub-status/assignee/follow-up/notes, routes a move into the hold bucket through `computeHoldPatch` (restart date mandatory, model's explicit status wins), stamps `signed_at` on SIGNED, fires `lead.status_changed`; `create_project` applies C-27. Agent writes carry `leads.agent_idempotency_key` (migration 294).
- Rules: no journey floor or gate validation on agent writes beyond the hold rule.
- Reachable: yes (mAIson chat tools).

### C-29 · Legacy / dead stage routes
- Where: `app/api/leads/mutations/[id]/status/route.ts`, `app/api/leads/mutations/[id]/follow-up/route.ts`; hooks `lib/queries/leads.ts:259` (`useUpdateLeadStatus`), `useSendFollowUp`; context fns `updateLeadStatus`, `sendFollowUpDraft` (`app-context.tsx:188-190, 206-208`)
- Does: `/status` writes the legacy `leads.status` enum via `reverseStatus(uiStatus)` and logs "Stage moved to {status}"; `/follow-up` sets `status:'contacted'`, clears `ai_draft_message`, logs "AI follow-up message sent to homeowner" and "Stage moved to Contacted" (performed_by null). Neither touches bucket/status codes.
- Reachable: **dead** — no component calls `updateLeadStatus` or `sendFollowUpDraft`.

### C-30 · Activity-log strings written by the engine (verbatim)
- Where: routes above; table `lead_activity_log(lead_id, action, performed_by, performed_at, metadata)`
- Does: `journey_step:{stepId}:done` / `journey_step:{stepId}:reopened`; `outreach_logged:{channel}`; `hold_set:{YYYY-MM-DD}` / `hold_set:{date} — {note}`; `lead_closed:{reason label}`; `Entity migrated to {companyId|studio default}`; `questionnaire_invite_sent` (metadata `{entity, entity_id}`); `Project created — lead moved to {bucket}`; `Lead created with project`; dead: `Stage moved to {status}`, `AI follow-up message sent to homeowner`, `Stage moved to Contacted`; archive/unarchive insert a row (text not read, `lib/lifecycle/transitions.ts:231, 271`). Drawer optimistic log lines "Bucket changed to {label}", "Status changed to {label}" [hand-off].
- Reachable: yes (drawer Activity Log via `GET /api/leads/records/[id]/extras`).

### C-31 · Archive / revive (Accounts › Archived Leads)
- Where: `components/accounts/archived-leads-section.tsx`, `app/api/leads/mutations/[id]/archive/route.ts`, `unarchive/route.ts`, `mutations/archived/route.ts`, `lib/lifecycle/transitions.ts` (`archiveLead`, `checkArchiveBlockers`, `cascadeLeadArchive`, `unarchiveLead`)
- Entry: drawer 3-dot "Archive" [hand-off]; Accounts › Archived Leads "Revive"
- Does: `POST archive {force?}` → permission `leads.delete` via `resolveCanPerformAction` (role row picked by tag priority owner > admin > accounting > id; 403 "You don't have permission to archive leads."); blockers (e.g. a live signing link) → 409 `{blockers}` unless `force`; sets `archived_at`, then cascade: cancels open tasks + their `task.due_reminder` rows, cancels every scheduled row keyed to the lead (follow-up reminder, hold ping — including past-due pending ones), activity log. `POST unarchive` → same permission (403 "You don't have permission to revive leads."), clears `archived_at`; cancelled tasks are **not** resurrected. Section copy: "Archived Leads" / "Leads that have been archived. They stay here until you revive them." / "Archived leads are hidden from the board and reports. Use the Revive button to restore a lead to its original status." / rows "archived today" or "archived {n} day(s) ago" / empty "No archived leads" "Leads you archive will appear here." / toast `"{name}" revived and restored to leads`.
- Rules: no purge job — archived leads persist indefinitely; `GET /api/leads/records` excludes archived unless `?includeArchived=1`; archived list honours the manager scope (C-55). Archived rows still count for duplicate detection (C-33).
- Reachable: yes.

### C-32 · Review queue and bulk email-lead status [hand-off pointer]
- Where: `lib/leads/review-queue.ts`, `app/api/leads/mutations/bulk-status/route.ts`
- Does: a lead is "held for review" (excluded from the pipeline) when `emailLeadStatus = 'pending_review'`, or when `possiblyDuplicate && duplicateOfLeadId` and `emailLeadStatus == null` and not archived. `bulk-status {leadIds, status}` accepts `approved | rejected | pending_review` (default `approved`), narrows by manager scope. Dashboard "Active Leads" excludes `pending_review`, `rejected` and archived (`app/(main)/dashboard/page.tsx:138-147`).
- Reachable: yes.

### C-33 · Duplicate detection rule and the studio knob
- Where: `lib/leads/duplicate-detection.ts`; knob in Lead Experience (C-36)
- Does: match = same studio, exact phone (raw **or** E.164-normalised with the studio region) **or** case-insensitive exact email, **archived rows included**, active match preferred. Knob `settings.features.duplicate_detection_enabled` (default on) gates manual create, email cron, hangout admin, agent create; the webhook always checks: active match → `drop` (logged `duplicate`), archived match → `create-noted` (creates the lead with the note "[Auto] Matches an archived lead for this studio — check the Archived Leads list before working this as new."), none → `create`.
- Reachable: yes. [hand-off: merge / keep-both UI.]

---

## B. Journey configuration (Accounts › Lead Management › Lead Experience)

### C-34 · Classic ↔ Journey mode switch
- Where: `app/(main)/accounts/lead-experience-tab.tsx:19-88`; `app/api/studio-config/features/route.ts` (`leadJourneyMode`, default **true**; stored `settings.features.lead_journey_mode`)
- Entry: Accounts sidebar group "Lead Management" → "Lead Experience" (id `lead-experience`; not role-gated)
- Does: two cards — "Classic" (badge "Default"): "Bucket + Status + Sub-Status dropdowns. Kanban grouped by bucket."; "Journey" (badge "New"): "Step-by-step tracker, one clear next action, evidence capture, and structured inactivation. Recommended for teams who want guidance." Intro: "Choose how your team works leads day-to-day. Switching is reversible — your lead data is identical in both modes, only the screen changes." When on: "Journey mode is on" + bullets "• An 8-step tracker (Assigned → Outreach → Site Visit → Concept → Floor plan → Quote → Contract → Signed) replaces the status dropdowns as the primary control." / "• Each step takes evidence — a file, link, note, or native tool. Native tools are recommended, never required." / "• Closing a lead requires a structured reason and (for some reasons) proof." / "• The board still groups by bucket for now; cards gain a progress rail."
- Rules: Journey mode hides the Classic bucket/status block and the readiness card in the drawer; `projectTypeRequired` gate is carved out in Journey mode (no inline picker). Toasts "Journey mode enabled" / "Switched back to Classic" / "Could not save setting".
- Reachable: yes.

### C-35 · Journey config editor (steps + inactivation reasons)
- Where: `app/(main)/accounts/journey-config-editor.tsx`; `app/api/studio-config/journey/route.ts` (GET/PUT `studios.settings.journey`)
- Entry: shown under the Lead Experience card only while Journey mode is on
- Does: "Journey steps" — per row: move up/down, rename label, evidence chips `none | optional | required`, remove; "Add step" dropdown re-adds removed **default** step ids only (no custom steps); "Reset to default". "Inactivation reasons" — per row: rename, "Proof" switch (`requiresProof`), "Gate after" number (`gateAfterAttempts`, empty = none), remove; "Add reason" creates `{code: "reason_{n}" slug, label: "New reason", requiresProof:false, fields:["free_text"]}`; "Reset to default". "Save journey settings" → `PUT {journey:{steps (order re-indexed), inactivationReasons}}` merged into `studios.settings` (read failure aborts to avoid wiping siblings).
- Rules: empty `steps`/`inactivationReasons` fall back to the defaults (`resolveJourneySteps`, `resolveInactivationReasons`). Custom step ids are impossible; detail `fields` of custom reasons are always `free_text`.
- Words: "Reorder, rename, set evidence requirement, or remove steps your studio doesn't use." / "Why leads get closed. “Gate after” only allows the reason once that many outreach attempts are logged." / toasts "Journey settings saved", "Could not save journey settings".
- Reachable: yes.

### C-36 · Detect duplicate leads switch
- Where: `lead-experience-tab.tsx:90-115`
- Does: switch `duplicateDetectionEnabled` (default on): "Detect duplicate leads" — "When a new lead matches an existing lead's phone or email, hold it in the review queue so you can merge or keep both. Applies to manually added, imported (email), hangout, and AI-created leads. Leads from your website form are always de-duplicated." Toasts "Duplicate detection enabled" / "Duplicate detection off".
- Reachable: yes.

---

## C. Lead experience settings (Settings page, per member)

### C-37 · Settings › Lead Preferences (IDs only)
- Where: `app/(main)/settings/page.tsx:35-47, 57-68, 387-436`; `components/settings/lead-preference-editor.tsx`; `PATCH /api/identity/members` (`acceptingLeads`, `leadPreferences`) [route not read]
- Entry: Settings sidebar "Lead Preferences" — only for members with tag `id`
- Does: "Open to New Leads" switch → `studio_members.accepting_leads` ("When off, you will not receive AI-recommended lead assignments"). "How it works": "Select the types of leads you prefer for each category, then set how important each one is. **Must Match** means you strongly prefer those leads. **Nice to Have** gives a soft boost. Leave any category as **Don't Care** to skip it. This is optional — if not set, the AI considers all factors equally." Editor: five dimensions — "Property Type" (region property types), "Budget" (region budget ranges), "Design Style" (region styles minus "No preference"), "Area / Location" (region regions), "Scope" (`PROJECT_TYPES`: "Renovation-Full Home", "New-Full Home", "Renovation-Partial", "New-Partial", "Commercial", "Others"); per dimension priority `must_match` "Must Match" / `nice_to_have` "Nice to Have" / "Don't Care" (clears values); "{n} of 5 categories configured"; "Save Preferences" (saves only dimensions with values, else `null`) / "Clear"; hint "This category won't affect lead matching. Select a priority to configure."
- Rules: consumed by the deterministic assignment recommendation (Preference 0–40 · Performance 0–35 · Specialty 0–25; CSV row 9) [hand-off to drawer reader]; members with `acceptingLeads=false` are excluded from the pool.
- Data: `studio_members.accepting_leads`, `studio_members.lead_preferences` JSONB `{property_type|budget|design_style|area|scope: {values[], priority}}`.
- Words (toasts): "Lead preferences saved" / "Lead preferences cleared" / errors.
- Reachable: yes.

### C-38 · Team Members › per-member lead assignment + data-visibility copy (owner)
- Where: `components/settings/team-settings.tsx:702-830`
- Does: for `id`-tagged members the owner sees "Lead Assignment": "Open to New Leads" ("When off, this ID will not receive AI-recommended leads"; toasts "Now open to new leads" / "Closed to new leads") and "Lead Preference Weights" (read-only bars + "Override", or "Not configured" + "Set", editing the same editor). "Data Visibility" notes: id-not-admin → "Sees only **assigned** leads, tasks, and escalations" / "Sees only **participating** chats" / "Can only move leads **forward** in the pipeline"; otherwise "Sees **all** leads, projects, tasks, and escalations", "Listed in lead **assignment dropdowns**" (id) or "**Not listed** in assignment dropdowns". Removing a member warns with counts including "{n} lead(s)" still assigned (`:204-205`).
- Rules: the "assigned only" promise is **not** enforced by `GET /api/leads/records` (studio-wide; only the manager hierarchy narrows) — see C-54.
- Reachable: yes (owner-only client gate).

### C-39 · Settings › Studio Region (read-only)
- Where: `settings/page.tsx:437-458`
- Does: badge with region code, label, currency symbol and phone country code; "Your studio region determines currency, phone format, tax rules, and compliance checklists. Contact support to change your region." Editing is admin-portal only (C-60/C-79).
- Reachable: yes.

### C-40 · Settings › Email Lead Sources (Gmail ingestion config)
- Where: `settings/page.tsx:643-646, 682-963`; hooks `lib/queries/email-connections.ts`, cron `app/api/cron/poll-emails/route.ts` [hand-off: creation reader]
- Does: "Connect Gmail" (OAuth redirect), per connection: status Active / Error (+ "Reconnect"), "Last sync: …" or "Not yet synced", "Platforms to monitor" chips = the region's `emailDomainDefaults` + "@qanvast.com" (SG defaults: `@homereno.sg`, `@homerenoguru.sg`, `@houzz.com.sg`, `@renopedia.sg`, `@qanvast.com`), "Custom domains" (`@example.com`, auto-prefixed with `@`), "Last sync" stats "Emails found" / "Leads created" / "Duplicates" / "Parse fails", "Sync Now", "Disconnect". Empty: "No email accounts connected" / "Connect your Gmail to automatically import leads from Homereno, Houzz, Renopedia and more."
- Rules: no role gate; ingested leads land `email_lead_status:'pending_review'` in the intake bucket; email-path duplicates are flagged, not blocked (CSV row 4).
- Reachable: yes.

---

## D. Pipeline / categories / custom fields / taxonomies configuration

### C-41 · Lead Funnel editor
- Where: `components/accounts/funnel-editor.tsx`; `app/(main)/accounts/page.tsx:1442-1448`; `app/api/studio-config/funnel/route.ts`; `lib/leads/funnel-validation.ts`
- Entry: Accounts › Lead Management › "Lead Funnel" (any role; `leadCountsByBucket` computed from the loaded leads)
- Does: horizontal bucket pills (drag to reorder, click to expand; shows status count). Expanded bucket: 8-colour picker (`#5500FF #469E59 #F19E2B #999999 #DB382A #4E5BB4 #4400CC #666666`), inline rename (Enter/Escape), "Requires assignment" switch, "{n} leads", delete. Statuses: drag reorder, inline rename, flag buttons F "Follow-up", Q "Quote req.", C "Contract req.", P "Project type req." (legend "Follow-up required" / "Approved quote required" / "Contract required" / "Project type required"), delete, "Add status..." (id = NAME_UPPER_SNAKE; new statuses have **no sub-statuses** and there is no sub-status editor). "Add bucket (e.g. Negotiation)" (id = NAME_UPPER_SNAKE, next palette colour, `requiresAssignment:false`, no statuses). "Save Funnel" (disabled until dirty; "Unsaved changes").
- Rules (client): "Bucket already exists", "Status already exists", "Cannot delete — {n} leads in this bucket. Move them first.", "Minimum 2 buckets required". Server `PUT {config}`: 400 "config is required" / "config must be an object" / "config.buckets must be an array" / "At least 2 buckets are required" / "Every bucket must be an object" / "Every bucket needs a non-empty id" / `Bucket "{id}" needs a label` / `Duplicate bucket id "{id}"` / `Bucket "{label}" needs at least one status` / `Bucket "{label}" has an invalid status` / `Bucket "{label}" has a status without an id` / `Duplicate status id "{id}" in bucket "{label}"`; 409 `Cannot remove bucket "{id}" ({n} lead(s)) — move those leads to another bucket first.` / `Cannot remove status "{id}" ({n} lead(s)) — move those leads to another status first.` (baseline = saved config or the default). Renames are id-stable (safe); ids of removed statuses are only diffed at bucket/status level, never sub-status.
- Data: `studio_lead_funnel` upsert on `studio_id`.
- Words (toasts): "Lead funnel saved" / server error text.
- Reachable: yes.

### C-42 · Lead Categories
- Where: `accounts/page.tsx:689-812` (tab `categories`), `app/api/lead-config/categories/route.ts` (RPC `save_lead_categories` = delete-all + insert)
- Does: list with drag reorder, colour dot cycling through `CATEGORY_COLORS` (6 swatches), inline rename, delete (confirm `Delete category "{name}"? This won't affect existing leads tagged with it.`), add with colour + "New category name…", "Save Categories" → toast "Lead categories saved". Copy "Group leads by property or project type. Minimum 3 categories required." — **not enforced** (zero allowed).
- Rules: no role gate; **no consumer** — no `categoryId` on leads, no picker anywhere (CSV row 11 / accounts-setup.md).
- Data: `lead_categories(studio_id, name, color, order_index, is_active)`.
- Reachable: yes (write-only config).

### C-43 · "Pipeline Stages" (legacy stages table)
- Where: `accounts/page.tsx:813-948` (tab `stages`, listed under the **Projects** group as "Pipeline Stages"), `app/api/lead-config/pipeline-stages/route.ts` (RPC `save_pipeline_stages`)
- Does: heading "Lead Stages" / "Define your sales pipeline stages. Drag to reorder."; rows with colour cycle (`STAGE_COLORS`), rename (slug = lower snake), delete (`Delete stage "{name}"?`), "Add Stage", "Save Pipeline". API stores `name, slug (default from name), color (default #94a3b8), order_index`; GET returns all (no active filter).
- Rules: **not consumed by the funnel engine** — the board uses `studio_lead_funnel`; this is a parallel legacy table.
- Data: `pipeline_stages(studio_id, name, slug, color, order_index)`.
- Reachable: yes (dead-end config).

### C-44 · Custom Lead Fields
- Where: `accounts/page.tsx:949-1136`, `app/api/lead-config/custom-fields/route.ts` (RPC `save_lead_custom_fields`), values via `app/api/studio-config/custom-field-values/route.ts` [not read]
- Does: field types `text` "Text", `number` "Number", `date` "Date", `dropdown` "Dropdown", `multi_select` "Multi-select", `file` "File Upload"; "Options (comma-separated)" for dropdown/multi-select (≥ 2 required: "Dropdown / multi-select fields need at least 2 options"); duplicate label blocked ("A field with that label already exists"); "Required field" switch; per row "make optional" / "make required", "edit options", rename, delete (`Delete field "{label}"? This will not erase data already captured on existing leads.`); drag reorder; "Save Fields" → "Custom fields saved". Fields render as inputs in the drawer's Custom Fields section [hand-off].
- Data: `lead_custom_fields(studio_id, label, field_type, options, is_required, order_index, is_active)`; values per lead (table not read).
- Reachable: yes.

### C-45 · Lead Sources taxonomy
- Where: `accounts/page.tsx:1783-1791`, `components/accounts/taxonomy-list-editor.tsx`, `app/api/studio-config/taxonomies/route.ts` (type `lead_source`)
- Does: "Lead Sources" / "Customize where your leads come from." — add ("New source (e.g. TikTok)"; case-insensitive duplicate → "Already exists"), inline rename, drag reorder, delete (`Delete "{name}"?`), "Save" (blocks empty names / `Duplicate name: "{name}"`); server deactivates all of the type then upserts on `(studio_id, type, name)`. Migration 274 seeds "Google Ads" and "Meta Ads". Consumed by the lead source picker (fallback `DEFAULT_LEAD_SOURCES`) [hand-off].
- Data: `studio_taxonomies(studio_id, type, name, is_active, order_index, metadata)`.
- Reachable: yes.

### C-46 · Workflow Rules toggles that gate leads (+ approvers, AI Assignment Logic)
- Where: `accounts/page.tsx:1620-1750` (tab `workflow-rules`), `app/api/studio-config/workflow/route.ts`
- Does: lead-relevant toggles (key · label · description · default **ON**): `quoteApprovalRequired` "Quote approval required"; `contractRequired` "Contract required for Signed" — "Require a signed contract before marking a lead as Signed"; `projectTypeRequired` "Project type required" — "Require project type selection before marking a lead as Signed"; `autoCreateFollowUps` "Auto-create follow-up tasks" — "Automatically create tasks when follow-up dates are set on leads"; `requireAssignment` "Require assignment for Ongoing" — "Require a lead to be assigned before moving to Ongoing bucket". Each ON approval toggle shows a `WorkflowApproverSelector` ("All owners (default)"; owners pre-selected and non-removable) writing `settings.workflow.approvers[key]` (`quoteApproval`, `progressUpdate`, …). Toast "{label} enabled/disabled".
- Rules: all four roles can flip them (no gate). "AI Assignment Logic" tab (`ai-logic`) saves `settings.ai_assignment_prompt` which **nothing reads** (CSV row 36).
- Data: `studios.settings.workflow`.
- Reachable: yes.

---

## E. Webhooks and email-ingestion configuration

### C-47 · Lead Webhooks tab (owner-intended)
- Where: `app/(main)/accounts/lead-webhooks-tab.tsx`; hooks `lib/queries/lead-webhooks.ts`
- Entry: Accounts › Lead Management › "Lead Webhooks" (no actual role gate; header comment says owner-only)
- Does: header "Lead Webhooks" — "Generate webhook URLs for external systems to push leads directly into your studio. Supports any platform that can POST JSON (Zapier, Make, Typeform, Facebook Lead Ads, etc.)". "How it works": "1. Generate a URL below and paste it into your form / integration tool." / "2. When someone submits the form, a POST request is sent to the URL." / "3. The lead appears in your Leads page with `pending_review` status." / "Accepted JSON fields: name, phone, email, budget, property_type, notes, source. Also accepts common aliases like full_name, mobile, message." Create form "New webhook endpoint": Source `generic` "Generic webhook" ("A generic URL any system can POST leads to."), `google_ads` "Google Ads (Lead Form)" ("We generate a URL + key to paste into your Google Ads Lead Form."), `meta` "Meta Ads (via Zapier / Make)" ("We generate a URL — connect Meta to it via a Zapier / Make bridge."; stored as `generic` with source label "Meta Ads"); "Source label (optional)" ("Incoming leads are tagged with this source name."; defaults "Google Ads" / "Meta Ads"); "Notes (optional)" ("Internal — not shown to clients."); "Generate webhook URL". Created panel: "Connect in Google Ads" / "Connect Meta via Zapier / Make" / "Webhook created", the URL `{origin}/api/webhooks/leads/{token}`, for Google a "Signing key" shown once ("Shown once — copy it now. You can regenerate later, but the old key stops working.") and 4 setup steps ("… Send test data — you should see a green success. (Test leads are acknowledged but not saved.)"); Meta steps (Zapier/Make "Facebook Lead Ads → New Lead" → "Webhooks → POST", map `full_name → name`, `phone_number → phone`, `email → email`, extras into `notes`). Endpoint rows: label, platform badge, notes, "{n} received", "{n} created", "{n} dupes", "Last: {date}", Copy URL, regenerate ("Regenerate the token? The old URL will stop working immediately."), revoke ("Revoke this webhook? Any external system using it will stop receiving leads."), "Recent activity" log (last 10 of 50) with outcome badges `lead_created` "Created", `duplicate` "Duplicate", `invalid` "Invalid", `unauthorized` "Unauthorized", `rate_limited` "Rate limited", lead id prefix, error message. Empty "No webhook endpoints yet." / "Generate one above to start receiving leads from external systems."
- Data: `lead_webhook_endpoints(id, studio_id, token, source_label, notes, is_active, platform, signing_secret, total_received, total_leads_created, total_duplicates, last_received_at, created_at, created_by)`; `lead_webhook_log(endpoint_id, received_at, outcome, lead_id, payload_excerpt, error_message)`.
- Reachable: yes.

### C-48 · Endpoint management APIs
- Where: `app/api/webhooks/leads/endpoints/route.ts` (GET/POST), `[endpointId]/route.ts` (DELETE = soft revoke), `[endpointId]/logs/route.ts` (last 50), `[endpointId]/regenerate/route.ts`
- Rules: session required; studio must equal the session's (403 "Forbidden"); platform limited to `generic | google_ads | meta`; Google endpoints get a 48-hex `signing_secret` returned once; token = 48 hex; regenerate only active endpoints. No owner check despite the doc comment.
- Reachable: yes.

### C-49 · Public webhook ingestion rules [hand-off pointer]
- Where: `app/api/webhooks/leads/[token]/route.ts`, `lib/webhook-lead-parser.ts` [not read]
- Does: body ≤ 64 KB (413); unknown/inactive token 404; rate limit 10/min per token (429, logged `rate_limited`); generic endpoints with a secret require `X-Signature` HMAC (401 `unauthorized`); JSON or form-urlencoded; Google: `google_key` in body must match the secret, `is_test` → `{status:"test"}` no insert, idempotent on `external_lead_id` (UNIQUE partial index; 23505 race → duplicate), `ad_metadata` stored; `name` required (400 "name is required"); dedup per C-33; insert at the intake target with `status:'new'`, `email_lead_status:'pending_review'`; counters via RPC `increment_lead_webhook_counters`; success fires **`lead.captured`** (C-62). Responses `{status:"created"|"duplicate"|"test", lead_id}`.
- Reachable: yes (public).

---

## F. Legal entities (lead-facing parts)

### C-50 · Lead issuing entity (`company_id`)
- Where: `app/api/leads/mutations/[id]/validate-entity/route.ts` (GET → `{currentCompanyId}`), `migrate-entity/route.ts` (POST `{nextCompanyId, performedBy}`), `lib/queries/leads.ts:714-790` (`validateLeadEntityChange`, `useMigrateLeadEntity`); `app/(main)/accounts/legal-entities-tab.tsx` contains **no** lead-specific UI
- Entry: the quote digitizer's issuing-entity picker in the totals bar [hand-off]
- Does: validation: same entity → ok; any project on the lead → hard block `conflict:"projects"` ("new entity means new project"); prior quotes or signature requests → soft block `conflict:"quotes"` (confirm "migrate all"); else ok. Migrate: entity must belong to the studio (400 "Unknown legal entity for this studio"; `null` = studio default), writes `leads.company_id`, log "Entity migrated to {id|studio default}"; the sibling `quote_signature_requests.company_id` update stays client-side.
- Data: `leads.company_id → studio_companies`.
- Reachable: yes.

---

## G. Roles and permissions

### C-51 · Tags and route access
- Where: `lib/access-control.ts:16-60` (tags), `:65-131` (`ROUTE_ACCESS`), `:135-169` (`canAccessPage`), `:191-195` (`getDefaultRoute`)
- Does: member tags `owner | admin | id | accounting | manager` (multi-select; `manager` layers on `id`). Route access by tag: `leads` → owner, admin, id; `qanvast-ops/leads` → owner; `accounts` → owner, admin, id, accounting; `settings` → owner, admin, id; `tasks` / `escalations` / `dashboard` / `projects` → owner, admin, id; `inbox` → owner, id. Role `pages` map is consulted only when passed — the real nav/route guards pass tags only (accounts-setup.md:93), so the page matrix is display-only. Default landing: owner/admin/id → `/dashboard`, accounting-only → `/finance/pipeline`.
- Reachable: yes.

### C-52 · Role permission model (leads slice)
- Where: `types/app.ts:3822-3843` (`RolePermissions`), `components/accounts/role-editor.tsx:21-176, 252-266`; `app/api/studio-config/roles/route.ts` (owner-only POST: 403 "Forbidden: owner-only"), `role-permissions/route.ts` (member's role = first of owner > admin > accounting > id)
- Does: `dataScope` `all` "All data" / `team` "Team data" / `assigned` "Assigned only"; `actions.leads` = `create | edit | delete | assign | view_all?`. Editor exposes Leads actions Create / Edit / Delete / Assign (`view_all` not editable). System role seeds (leads row): Owner all true; Admin create/edit/assign true, delete false; Interior Designer create/edit true, delete/assign false, `dataScope:'assigned'`, core pages only; Accounting all false, finance pages only. New custom role default: leads `{create:true, edit:true, delete:false, assign:false, view_all:false}`, scope `assigned`. System roles are locked in the editor and undeletable. Studio-setup seeds system roles with **empty** `actions` (accounts-setup.md:91).
- Data: `studio_roles(studio_id, name, slug, color, is_system, is_assignable, permissions JSONB)`.
- Reachable: yes (owner UI).

### C-53 · Effective permission resolution and legacy tag fallback
- Where: `lib/access-control.ts:250-313` (`resolveCanPerformAction`), `:318-352` (`tagDerivedPermissions`), `:366-390` (`resolveEffectivePermissions`)
- Does: role JSON value `true`/`false` wins; missing key falls through to tags: owner → everything; admin → everything except `team.manage/invite/editRoles/remove` and `settings.editStudio`; accounting (no `id`) → only `finance.*`, `expense.*`, `pricebook.view`, `vendors.*`; `id` → denied `team.*`, `project_override`, `payment_schedule.override`, `pricebook.edit`, `vendors.view/edit/merge`, `quotes.approve/submit_for_review/send`, `tasks.approve`, `expense.approve`, `finance.*`, `settings.*`; everything else (incl. all `leads.*`) allowed. Tag-derived defaults: `leads {create: id||admin, edit: id||admin, delete: admin, assign: admin, view_all: admin}`; `settings.editFunnel: admin`. Member overrides (`studio_members.permission_overrides`) deep-merge on top (owner/admin route, C-56).
- Reachable: yes.

### C-54 · Where lead permissions are actually enforced (reality)
- Where: archive/unarchive routes (`leads.delete`); `GET /api/leads/records` (studio-wide, manager scope only); drawer client rules (C-04); `tat-report` (owner/admin tags); accounts tabs (no gate except `ownerOnly` "Studio Health"); notifications settings page (owner tag); features PUT `leadManagerHierarchy` (owner/admin tags)
- Does: `leads.delete` is the **only** `leads.*` action checked server-side (archive/revive). `leads.assign`, `leads.create`, `leads.edit`, `view_all` and `dataScope` are never enforced by lead routes — every designer sees every lead in the studio (CSV row 5 confirmed gap); the only narrowing is the manager hierarchy (C-55). Client-only: ID forward-only + no-unassign (C-04), hidden assignee picker for locked designers, invite/remove/tag UI owner-only. Server bulk-assign: 403 `{"error":"Your role can't reassign leads.","code":"ASSIGNMENT_LOCKED"}` for locked designers, manager scope narrows the batch (`app/api/leads/mutations/bulk-assign/route.ts:91-117`).
- Reachable: n/a (rules).

### C-55 · Manager hierarchy (Dyel-only feature flag)
- Where: `lib/leads/manager-hierarchy.ts`, `lib/leads/manager-scope-guard.ts`, `app/api/leads/records/route.ts:38-93`, `mutations/archived/route.ts`, `assignee/route.ts:174-203`, `[id]/route.ts:144-227`, `bulk-assign`, `features/route.ts:100-119`; UI `role-editor.tsx:190-236` (ManagerTagCard), team-settings tag toggle
- Does: flag `settings.features.lead_manager_hierarchy` (default false; only owner/admin may change it: 403 "Only owners/admins can change the manager hierarchy setting."). When on: (1) a plain designer (`id` without `manager/admin/owner`) cannot reassign leads anywhere (`ASSIGNMENT_LOCKED`); (2) a **locked manager** (`manager` tag, not owner/admin) reads and mutates only leads where `owning_manager_id` = their member id **or** `assigned_to` = them **or** they are in `lead_assignees` (list routes use the PostgREST OR filter; write guard 403 `{"error":"This lead is outside your assigned scope.","code":"LEAD_OUT_OF_SCOPE"}` on journey-step, close, follow-up, engagement; bulk routes narrow silently; unresolved caller row → empty list / blocked); (3) `owning_manager_id` routing: owner/admin assigning to a manager-tagged member stamps it, owner/admin replace/unassign with no manager clears it, a manager self-assigning self-stamps, a manager handing to a designer never changes it; (4) `filterLeadsForViewer` mirrors this client-side and keeps the id-only "assigned to me" branch (fails closed to `[]` when the member id is unresolved). Feature-detection reads fail open (flag off); write-gating reads fail closed.
- Words: Roles & Permissions card "Manager" (badge "Tag", "Routed leads only"): "Manager isn't a separate role — it sits on top of **Interior Designer**. A manager keeps every designer permission and additionally sees only the leads routed to them, and can assign those on to designers." / "Turn it on per person in **Team Members**, next to their other tags. To change what one manager specifically can do, use that member's permission overrides there."
- Data: `leads.owning_manager_id` (migration 292).
- Reachable: yes when flagged (one studio).

### C-56 · Member overrides and role admin surfaces
- Where: `components/accounts/member-override-panel.tsx`, `app/api/studio-config/member-overrides/route.ts` (owner **or** admin: 403 "Forbidden: owner/admin only"), `roles/route.ts` (owner-only POST), `roles/[id]` [not read: DELETE ignores `is_system`]
- Does: per-member "Permissions" tab exposes a fixed toggle list (payment schedule override, project lock override, … — `PERMISSION_TOGGLES` at `:39-49`, **no leads toggles**) and workflow toggles; matching the default clears the override ("Reset"). Dirty-close confirm "You have unsaved override changes. Discard them?"; toast "Overrides saved for {name}".
- Reachable: yes (owner UI; admin API).

### C-57 · Role × lead capability matrix (as implemented today)

| Capability | Owner | Admin | Interior Designer (`id`) | Accounting | Manager (`id`+`manager`, flag on) |
|---|---|---|---|---|---|
| See `/leads` page | yes | yes | yes | no (tag route) | yes |
| See which leads | all | all | **all** (scope not enforced) | n/a | only routed/assigned |
| Create lead | yes | yes | yes | (no route gate) | yes |
| Edit fields / Classic stage move | yes | yes | yes, forward-only, no Unassigned (client) | (no route gate) | yes within scope |
| Assign / reassign | yes | yes | yes (flag off); **403** when hierarchy flag on | (no gate) | yes within scope; self-stamps |
| Journey mark-done / outreach / hold / close | yes | yes | yes | (no gate) | within scope (403 outside) |
| Archive / revive | `leads.delete` (owner default true) | default false (tags) | default false | false | as `id` |
| Performance (TAT) view | yes | yes | 403 | 403 | 403 |
| Configure funnel / categories / sources / fields / journey / webhooks / workflow | yes | yes (no gate) | yes (no gate) | yes (no gate) | yes (no gate) |
| Roles & Permissions editor | yes (API owner-only) | 403 | 403 | 403 | 403 |
| Member overrides API | yes | yes | 403 | 403 | 403 |
| Notification settings page | yes | redirected | redirected | redirected | redirected |
| Flip `leadManagerHierarchy` | yes | yes | 403 | 403 | 403 |
| Qanvast Ops › Leads / return | route owner-only; return dialog reachable from Kanban by any role | Kanban only | Kanban only | no | Kanban only |
| Lead preferences / accepting leads | owner edits any ID's; own tab only if `id` | (no tab) | own | (no tab) | own |

---

## H. Feature flags

### C-58 · Studio feature flags (`studios.settings.features`)
- Where: `app/api/studio-config/features/route.ts:15-54, 91-153`; UI `app/(main)/accounts/feature-flags-tab.tsx`
- Does: keys · default · storage key · UI: `lockQuoteActionsUntilApproved` false `lock_quote_actions_until_approved` (Feature Flags tab "Lock quote sharing until approved"); `lockProjectOnHandover` false (tab "Lock project on handover"); `casetrustSigningStep` false (tab "CaseTrust signing step (Singapore only)" + "Preview disclosure"); `priceBookSubcategoryInQuote` **true** (`!== false`; tab "Carry price-book subcategories onto quotes"); `leadJourneyMode` **true** (`lead_journey_mode !== false`; Lead Experience tab); `duplicateDetectionEnabled` **true** (Lead Experience tab); `leadManagerHierarchy` false (**no UI toggle** — API only, owner/admin); `canvaEditor` true (no UI); `feeFirstMilestones` false (no UI). PUT merges the partial into `settings.features` (read failure aborts).
- Words: tab intro "Studio-level feature toggles. Take effect immediately."; toast "Setting saved".
- Reachable: yes (Feature Flags tab has no role gate).

---

## I. Region gating (lead-facing)

### C-59 · Region configuration consumed by leads
- Where: `lib/region-config.ts`; `docs/rules/regions.md`
- Does: `studios.country_code` (+ `currency_code`, `timezone`, `locale`, `supported_countries`) → `getRegionConfig` (unknown → SG). Supported `SG | MY | AE | IN | EG` (docs list 4; code adds EG). Per region: phone rule (SG +65, 8 digits, starts 6/7/8/9 — "Must be 8 digits" / "Must start with 6, 7, 8, or 9"; MY +60 9–10 digits starts 1; AE +971 9 digits starts 5; IN +91 10 digits starts 6–9; EG +20 10 digits starts 10/11/12/15), currency symbol/locale, tax (GST 9% / SST 6% / VAT 5% / GST 18% slabs / VAT 14%), property types (SG: `hdb_2_room`…`hdb_executive`, `bto_3_room`…, `ec` "Executive Condo", `condo`, `penthouse`, `landed_terrace`, `landed_semi_d`, `landed_bungalow`, `commercial_office`, `commercial_retail`, `others`; MY/AE/IN/EG lists as coded), geographic regions (SG "North", "North East", "East", "West", "Central"), budget ranges (SG `20k-40k` "S$20K – S$40K" … `100k+` "S$100K+"), property statuses (SG "New", "Resale", "Existing"), possession timeline, design styles, `emailDomainDefaults`, `features.casetrust` (unset in code for every region → CaseTrust never gates, see Uncertain), `sampleClient`.
- Rules: `leads.property_type` is TEXT since migration 074 (region keys, label via `getPropertyTypeLabel`); duplicate-detection normalises phones with the studio region; notification budgets use `region.currency.symbol`.
- Reachable: yes.

### C-60 · Lead-level country and multi-country studios
- Where: `lib/country-resolver.ts`, `lib/country-lock-error.ts`, `types/database.ts` (`leads.country_code`, migration 095a/b), `components/leads/new-lead-drawer.tsx:506`, `lead-detail-drawer.tsx:1445`, `app/(main)/leads/new/page.tsx:68-69`, `app/api/admin/studios/[id]/retag-leads/route.ts`
- Does: precedence `lead.countryCode` > session studio country > "SG" for phone validation/currency; `leads.country_code` populated by DB trigger from the studio; a phone-country picker appears on new/edit lead only when the studio's `supported_countries` has > 1 entry [hand-off]. DB trigger (095b) refuses `country_code` changes on a lead with projects → toast "Country can't be changed — this lead has one or more projects. Create a new lead if you need a different country." (other lock messages for project/PO/VO/invoice). Admin bulk retag (`POST /api/admin/studios/[id]/retag-leads {targetCountry, filter:{phonePrefix?|emailDomain?}, action:'preview'|'apply'}`) — target must be in `supported_countries` ("Studio does not support {cc}. Add it to supported_countries first."), skips leads already on target, blocks leads with projects, returns `{matchedIds, eligibleIds, blockedByProject, updated}`; **no admin UI calls it**.
- Reachable: picker yes; retag API only.

### C-61 · CaseTrust (SG) in the lead signing flows
- Where: `feature-flags-tab.tsx:98-114`, `app/my/engagement/[linkId]/page.tsx:268-271, 451-473`
- Does: flag `casetrustSigningStep` + `region.features.casetrust === true` inserts the "CaseTrust Deposit Protection" disclosure with mandatory acknowledgement "I have read and understood the CaseTrust disclosure." into the homeowner signing wizard (and the public `/sign` page). Tab copy "Insert a CaseTrust deposit-protection disclosure step into the client signing flow. Has no effect outside Singapore."
- Reachable: flag yes; see Uncertain for the region flag.

---

## J. Notifications (lead events)

### C-62 · Lead-related notification events

| Event | Trigger (call site) | Recipients | Channels | Template / body |
|---|---|---|---|---|
| `lead.assigned` (category leads, non-critical, label "Lead Assigned") | server writes only: create route, `PATCH [id]` (scalar change to a member not yet in the junction), assignee route `replace`/`upsert` (genuinely new members) — `lib/leads/notify-assigned.ts` | default roles `owner, admin` + the new assignees as fixed recipients (+ existing junction assignees auto-fan-out) | in-app, email, WhatsApp (if enabled) | vars `lead_name, assignee_name, assignees_list, assigned_by, lead_phone, lead_email, source, budget (region-formatted), property_type, area, bucket, status_label, action_url`; in-app body "{lead} is now assigned to {names}" / "{lead} has been assigned"; email subtitle "Assigned to {names}." card Source/Budget/Property/Area/Status(hidden when NEW)/Assigned, CTA "View lead"; WhatsApp text "New lead assigned: {{lead_name}}. Open in OpenMaison: {{action_url}}", template `lead_assigned_internal` [recipient_name, lead_name, assigned_by] |
| `lead.followup_reminder` (leads, non-critical, "Follow-up Reminder") | scheduled by the client at T-30 min (C-24); delivered by the scheduled cron | `recipientId` = task assignee (default roles `id, owner` unused on the scheduled path) | in_app + email + whatsapp rows | in-app body "Follow up with {lead_name} at {follow_up_time}"; WhatsApp "Reminder: follow-up with {{lead_name}} in 30 minutes ({{follow_up_time}}). Open: {{action_url}}", template `lead_followup_reminder_internal` [recipient_name, lead_name, follow_up_time] |
| `lead.status_changed` (leads, non-critical, "Lead Status Changed") | every bucket/status/sub-status change: PATCH, close, hold/resume, unassign downgrade, journey floor, signed reopen, e-sign, agent, project-created — `lib/leads/notify-stage-change.ts` (no-op when nothing changed) | `owner, admin` + lead assignees (auto fan-out, never excluded) | in-app, email, WhatsApp | vars `old/new_bucket_label, old/new_status_label, changed_by ("the system" when absent)`; in-app "{lead}: {from} → {to} by {who}" / "{lead} moved to {to}"; email "Moved from {old} to {new}." or "Status changed to {status}." with New status / Previous status / Changed by; WhatsApp "{{lead_name}} moved from {{old_bucket_label}} to {{new_bucket_label}} ({{new_status_label}}). Open: {{action_url}}" |
| `lead.captured` (leads, **critical**, "New Lead Captured") | public webhook on a real insert (never test/duplicate) | `owner, admin` | in-app, email, WhatsApp (fallback text) | in-app "New {source} lead: {name} — {budget}"; email "New lead from {source}." card |
| `lead.hold_restart` (not in `EVENT_CATALOG`) | scheduled by `useSetHold` at restart date 09:00 local; cancelled on resume/close/re-hold/archive | `recipientId` passed by the drawer (assignee/owner) | in_app only | title "Hold ended — revisit {name}[ ({note})]"; action `/leads?leadId={id}` |
| `homeowner.questionnaire_requested` (projects, external informational) | `POST /api/leads/[id]/send-questionnaire` (5-min throttle) | roles `owner, admin, id` in-app; external email undefined | in-app | vars `recipient_name, studio_name, question_count, action_url` (portal link) |
| `homeowner.questionnaire_answered` (projects, internal) | homeowner submits scope answers (`app/api/homeowner/scope-answers/route.ts:153`) | `owner, admin, id` + lead assignees | in-app | vars `homeowner_name, lead_or_project_name, answered_count` |
| `task.assigned` (**critical**) for lead follow-up / General tasks | task create (`/api/tasks`) — incl. auto-created LeadFollowUp and AI-suggested tasks | `owner, admin, id` + task assignees | all | email card shows "Lead" = `lead_name` |
| `task.due_reminder` (critical) | scheduled at task create (30 min before planned time); cancelled by cancel-by-lead / archive cascade | task assignee | scheduled | WhatsApp "task_due_reminder_internal" |

- Where: `lib/notifications/events.ts`, `templates/base/leads.ts`, `templates/whatsapp.ts`, `dispatch.ts:396-468` (`buildTitle` = "{label}: {entityLabel}", `buildBody`).
- Reachable: yes.

### C-63 · Dispatch pipeline rules
- Where: `lib/notifications/dispatch.ts`, `preferences.ts`, `resolve-recipients.ts`, `dedupe.ts` [not read], `lib/studio-demo.ts` [not read]
- Does: fire-and-forget after the response (`after()`); demo studios (`settings.is_demo`) never send; per-studio per-category prefs `notification_preferences(category, channel in email|in_app|whatsapp, enabled, digest_mode, recipient_roles)` — defaults when no row: in-app/email enabled, WhatsApp **disabled**, roles `['owner']`; `settings.notifications_paused` forces the three internal channels off (external client mail unaffected); critical events are never digested; email is only held for the daily digest when in-app is also enabled; recipient roles = union of enabled channels' roles; junction assignees of the lead are always fixed recipients; members whose permission override denies page `/leads` are skipped; the triggering user is **not** excluded; content dedupe drops recipients already notified with the same `(studio, event, entity, title, body)` within 120 s; email sends are spaced 550 ms (Resend cap); `inAppOnly` events never email/WhatsApp.
- Data: `notifications(id, studio_id, recipient_id, recipient_email, recipient_phone, event_type, channel, title, body, action_url, entity_type, entity_id, status pending|sent|failed|read, is_read, sent_at, error_message, retry_count, digest_date, fire_at, metadata)`.
- Reachable: yes.

### C-64 · Scheduled + digest crons
- Where: `app/api/cron/notification-scheduled/route.ts` (every 5 min), `notification-digest/route.ts` (hourly)
- Does: scheduled: see C-24 (claim → deliver → revert/retry ≤ 3 → release for paused/undeliverable/allow-list-blocked → demo skipped). Digest: at 08:00 studio-local, for categories with `digest_mode` on the email channel, batches unread in-app rows of the last 24 h per recipient into "Daily Digest — {n} notification(s)" (subject "Your daily mAIson digest — {n} update(s)"), marks them sent; retries failed emails (`retry_count < 3`) re-rendering from persisted variables.
- Reachable: yes (Vercel cron; CSV row 41 notes a historic channel-name bug now fixed in code read here).

### C-65 · Notification settings UI
- Where: `app/(main)/settings/notifications/page.tsx` (owner tag only; others `router.replace('/settings')`), `components/settings/notification-settings.tsx`, `notification-template-editor.tsx`; APIs `/api/notifications/preferences`, `/api/notifications/templates` [not read]
- Does: "Notification Settings" — "Control when and how your studio receives notifications". "Studio Notifications" ("Control how your studio team receives notifications per category"): one row per category — Leads, Quotes, Invoices, Purchase Orders, Finance Operations, Projects, Tasks & Escalations, Team, Hangouts, Pricing — columns In-app (default on), Email (on), WhatsApp (off), Digest (checkbox, only when email on), Recipients popover "Who receives {category} notifications" with role checkboxes `owner / admin / id / accounting` (edits the **email** row's `recipient_roles`), "Edit template" (first internal event of the category → Leads opens `lead.assigned`). WhatsApp warning "WhatsApp not fully configured." when `D360_API_KEY` / `D360_DEFAULT_TEMPLATE` missing. "Customer Notifications" ("Optional emails sent to your clients and prospects") lists informational external events with labels "Send signing confirmation email to client", "Send payment confirmation email to client", "Notify homeowner when meeting is assigned" (+ catalog labels for the rest; none lead-specific). Template editor sheet "Email Template — {label}": "Subject line", TipTap "Email body" with variable chips, "Missing required variables: {{x}}" blocks save, palette "Available variables — click to insert at cursor" ("Purple = required · Gray = optional"), "Custom template active — overrides the default", "Reset to default" (confirm "This will delete your custom template and restore the default. This cannot be undone."), "Save template", dirty guard "You have unsaved changes. Close anyway?" (Keep editing / Discard); live preview with sample data.
- Data: `customer_notification_preferences(studio_id, event_type, enabled)`, `notification_templates(studio_id NULL = base, event_type, channel, subject, body_html, body_text, variables, is_active)`.
- Reachable: yes (owner).

---

## K. Dashboard (what it does with leads)

### C-66 · Classic dashboard KPIs
- Where: `app/(main)/dashboard/page.tsx:134-147, 301-311, 620-659`
- Does: owner/admin cards "Revenue (Jan)" (hardcoded), "Active Leads" = count of `useApp().leads` excluding `emailLeadStatus pending_review|rejected` and archived (matches the Leads page header), "Active Projects" (hardcoded), "Conversion Rate" (hardcoded); ID cards "My Leads" (same count over the role-filtered list), "Tasks Today", "Follow-ups Due", "Active Projects" (hardcoded). "Lead Pipeline" card (New Leads / Contacted / Proposal Sent / Meeting Booked counts, "24 total", "Conversion Rate 18.5%", "Avg Deal Size $72k") and "AI Priority Feed" are static mock content. Business Performance Analyzer chat quick query "Which leads are most likely to close this month?".
- Reachable: only when Home Screen Layout = "Classic" (localStorage `qanvast-home-mode`).

### C-67 · Chat-first home (default) lead intents
- Where: `components/dashboard/chat-first-home.tsx:38-78`
- Does: capability chips: "Draft a follow-up" → lead picker ("Select a lead to draft follow-up for") → prompt "Draft a WhatsApp follow-up message for {name} ({status label or bucket})"; "What leads need attention?" → "What leads need attention? Summarize and suggest priorities"; "Analyze a lead" → picker → "Analyze lead {name} and suggest the best conversion approach (budget {S$…}, source: {source|unknown})"; "Optimize a quote" → picker → "Analyze and optimize the quote for {name} (budget …, {property type|unknown property})". Picker searches by name + property type ("Search leads...").
- Reachable: yes (default mode).

### C-68 · Home widgets that read leads
- Where: `components/dashboard/home-widgets.tsx:74-130` (Leads), `:435-495` (Studio Pulse), `:738-760` (Team Workload), `:826-870` (Upcoming), `:1034-1092` (Priority)
- Does: **Leads** widget — total + bars New / Active / Closed using funnel roles (first bucket = New, last = Closed, middle incl. hold = Active; unknown bucket → New), click → `/leads`. **Studio Pulse** — leads per day for the last 7 days vs previous 7; funnel "All Leads" / "Contacted" (active buckets) / "Quoted" (quoteStatus ∈ submitted, approved, sent_for_signature, client_signed, forced ≥ signed) / "Signed" (status `SIGNED` or terminal bucket). **Team Workload** — leads per member (junction or scalar). **Upcoming** — follow-ups in the next 7 days (`nextFollowUpDate`, time) alongside tasks, top 5. **Priority** banner — up to 2 "Follow-up due" leads (active or hold bucket, `nextFollowUpDate ≤ today`) and "Unassigned" → "{n} new lead(s) need assignment" (intake bucket, no assignee), max 4 items, hidden when empty.
- Reachable: yes.

---

## L. Inbox

### C-69 · Inbox has no lead linkage
- Where: `components/inbox/context-panel.tsx`, `new-chat-panel.tsx`, `chat-list-item.tsx` (no `lead` references); `docs/rules/inbox.md` (project tag rows, escalations only)
- Does: chats link to projects/escalations; the drawer's header WhatsApp icon opens `wa.me/{digits}` directly (not the inbox) since 2026-07-20; "Message" footer button → `/inbox` (docs/rules/leads.md:342) [hand-off].
- Reachable: n/a.

---

## M. Tasks

### C-70 · Task ↔ lead linkage
- Where: `components/tasks/task-create-dialog.tsx:24-51, 224-232`, `task-detail-dialog.tsx:38, 94, 163`, `tasks-table.tsx:58, 261`, `app/api/tasks/records/cancel-by-lead/route.ts`, `lib/lifecycle/transitions.ts:114-190`; `docs/rules/tasks.md`
- Does: create dialog "Link to Lead" combobox (placeholder "Search leads...", empty "No leads found") stores `leadId` + `leadName`; task types include `LeadFollowUp` labelled "Lead Follow-Up"; table "Source" column shows `projectName || leadName || —`; detail dialog source label = lead or project name; page filters Source = Leads / Projects / All. `cancel-by-lead` → `cascadeTaskCleanup` sets the lead's `NotStarted|InProgress` tasks to `Cancelled` and deletes their pending `task.due_reminder` rows (ids read before cancelling); 500 "Failed to cancel the lead's tasks" on failure. Journey AI suggestions create `General` tasks on the lead (C-16). Notification recipients for lead tasks use `task_assignees` (junction) for `LeadFollowUp`/`General`.
- Data: `tasks.lead_id`, `tasks.lead_name`, `task_assignees(task_id, profile_id)`.
- Reachable: yes.

---

## N. Projects conversion

### C-71 · Creating a project from a lead (engine-side rules)
- Where: `docs/user-stories/detailed/leads.md:182-200` (evidence lines in `project-create-drawer.tsx`, `lead-detail-drawer.tsx:1238-1374, 956-997, 2452-2464`), `lib/project-lead.ts`, `assignee/route.ts:76-143`
- Does: full-form Create Project drawer requires customer name, project name, project type, ≥ 1 designer, commission split = 100 %, payment schedule = 100 %; blocked when the lead's quote isn't approved and `quoteApprovalRequired`; no AI plan. "Quick Convert" from the drawer creates with the lead's data and fires `/api/projects/plan` only when line items exist and quote is `approved`. Both paths check for an existing project first; on create the lead is stamped `CLOSED / SIGNED / PROJECT_STARTED` (C-27); the auto-open "Create Project" dialog fires once per drawer mount on a valid SIGNED commit; the footer "Create Project" appears only when every enabled prerequisite passes, the drawer is clean and no project exists; `PROJECT_STARTED` shows "Go to Project". Later lead assignees cascade onto the project team (add-only, 0 split). Homeowner binding: `bindEnsureHomeownerForLead` + `bindAttachProjectToLeadLink` when a phone exists (best-effort).
- Reachable: yes. [hand-off: form UI.]

---

## O. Escalations / refunds

### C-72 · Escalations have no lead linkage
- Where: `app/(main)/escalations/page.tsx:19, 28`, `escalations/new/page.tsx`, `docs/rules/escalations.md`
- Does: tickets attach to projects (`project_id`), categories, assignee; the "Proactive Alerts" array is empty (typed with a `leadId` field, unused); `useStudioMembers` imported from the leads queries only for the assignee filter.
- Reachable: n/a.

### C-73 · Qanvast lead return / refund request
- Where: `app/api/leads/mutations/[id]/refund-request/route.ts`, `types/database.ts` (`DbRefundRequest`), `data/mock-credits.ts` (`RETURN_LEAD_REASONS`), `components/leads/return-lead-dialog.tsx` [hand-off], `app/api/leads/records/[id]/extras/route.ts`, `docs/user-stories/detailed/qanvast-ops.md:12-19`
- Does: `POST refund-request {reason, subReasons?, notes?, reasonId?}` → 400 "reason is required"; inserts `refund_requests {lead_id, studio_id, reason_id (only if a UUID), reason_text, sub_reasons[], notes, status:'pending', filed_by, filed_at}`. The drawer's "Request Return & Refund" appears only for Qanvast-sourced leads in the CLOSED bucket without an existing refund; the drawer extras return `refundStatus` / `refundReason` (one row per lead, `maybeSingle`). Reason catalogue (id · label · fields): `junk` "Lead is junk/spam" (attachments, comments); `duplicate` "Duplicate lead" (search, attachments); `existing-client` "Lead already a client" (project-reference, attachments); `refused-meet` "Lead refused to meet up" (sub-reasons "Not responding after multiple attempts", "Changed mind about renovation", "Went with another studio/competitor", "Budget constraints changed", "Others"; date-time; attempts); `not-contactable` "Lead not contactable" (date-time, attempts); `wrong-info` "Wrong contact info" (wrong-field: "Phone number is invalid", "Email is incorrect", "Name does not match", "Address is wrong"; attachments); `others` "Others" (comments-required).
- Rules: refund statuses seen in code: `pending` (insert), `approved` / `rejected` (admin counts, admin studio list capitalises status); `is_urgent`, `reviewed_by`, `rejection_reason`, `reviewed_at`, `company_id` columns exist. The external Qanvast return API call from the Kanban passes the local UUID instead of the Qanvast id (documented bug); `/admin/refunds` is mock data with no persistence.
- Reachable: dialog yes; admin review no.

---

## P. Homeowner portal (lead-stage)

### C-74 · Lead engagement link and page
- Where: `lib/homeowner-binding.ts:49-190` (`ensureHomeownerForLead`, `attachProjectToLeadLink`, `notifyQuoteShared`, `notifySignatureRequested`, `syncPrimaryHomeownerPhone`), `app/api/homeowner/engagement/[linkId]/route.ts`, `app/my/engagement/[linkId]/page.tsx`
- Does: a lead with a phone gets one durable `homeowner_project_links` row (`lead_id` set, `project_id` null until a project is attached; `portal_token`; CHECK requires lead or project). Engagement page (`/my/engagement/{linkId}`, homeowner session; studio preview 403 "Preview not available for lead-stage"): title = lead name, "Your engagement with {studio}."; quotes shown **only** if listed in `leads.quote_metadata.portalSharedQuotes` ("Send to homeowner portal") and status ∈ `approved | sent_for_signature | client_signed`; badges "Approved" / "Awaiting signature" / "Signed"; multi-quote dropdown with suffix " — signed" / " — for signing" and explanatory copy; PDF preview or itemised fallback; empty "No quote shared yet" / "{studio} will share your quote here once it's ready." Signature banner: signed → "Contract signed" + "Signed on {date}" + Download; expired → "Signing link unavailable" / "This signing request has expired — please ask your studio to send a fresh one."; pending → "Ready for your signature: {quote}" / "Only **{quote}** is being sent for signing. Review it below, then sign at the bottom." In-portal SigningWizard: "Step {n} of {total}" (quote → each signing document with accept gate → sign), CaseTrust block (C-61), "Your full name", signature pad, agreement "I, **{name}**, agree to the quotation from **{studio}** totalling **{total}** as set out in the quote. I understand this constitutes my digital agreement to proceed.", "Sign & submit" → `POST /api/sign/{token}/submit` (no OTP); footer "Your signature is legally binding under the {act}" (SG "Singapore Electronic Transactions Act", MY "Malaysian Electronic Commerce Act 2006", AE "UAE Federal Decree-Law No. 46 of 2021 on Electronic Transactions", IN "Indian Information Technology Act, 2000", else "applicable electronic transactions law"). Scope questions ("A few questions") render only while **no** quote is shared.
- Data: `homeowner_profiles`, `homeowner_project_links(id, homeowner_id, lead_id, project_id, studio_id, is_active, portal_token, last_questionnaire_invite_at)`.
- Reachable: yes.

### C-75 · Scope questionnaire (studio side + homeowner side)
- Where: `components/settings/scope-form-builder.tsx`, `app/api/leads/[id]/send-questionnaire/route.ts`, `lib/scope-answers/invite.ts`, `app/api/leads/[id]/scope-answers/route.ts` (+ `history`), `app/api/homeowner/scope-answers/route.ts`
- Does: builder "Scope Questions" ("Customize the questions homeowners answer about their project"): question text, type `yes_no` "Yes / No" / `text` "Text" / `number` "Number" / `single_select` "Single Select" / `multi_select` "Multi Select" / `date` "Date", options (≥ 1 for selects: "Add at least one option"), "Required" switch, enable switch, delete; empty "No custom questions yet. The default lifestyle questions are always available." Studio "Ask homeowner": `POST send-questionnaire` → 409 "Lead has no phone — add one before sending." (`no_phone`), 409 "Studio has no portal slug configured yet", mints the link, throttles 5 min (`skipped:true`), portal URL `/my/{slug}/p/{token}?action=answer-questions`, fires `homeowner.questionnaire_requested`, logs `questionnaire_invite_sent`. `GET scope-answers` returns enabled questions + answers, lazily binds a homeowner when the lead has a phone (`linkExists`, `hasPhone`, `bindError`); `POST scope-answers {answers:[{questionId, value}]}` (400s; 409 "No homeowner link for this lead — add a phone number first") upserts with `source:'studio'`. Homeowner submissions fire `homeowner.questionnaire_answered`.
- Data: `studio_scope_questions(studio_id, question, question_type, options, is_required, is_enabled, sort_order)`, scope answers keyed by link/homeowner.
- Reachable: yes.

---

## Q. Admin (platform)

### C-76 · Admin studio detail — lead parts
- Where: `app/admin/studios/[id]/page.tsx:40-130, 487, 528, 676-720`, `app/api/admin/studios/[id]/route.ts`, `page-visibility/route.ts`, `app/api/admin/counts/route.ts`, `docs/rules/admin.md`
- Does: stat card "Leads" = `count(leads where studio_id)`; "Refunds" tab lists the studio's `refund_requests` (reason, status, date); Features tab: per-studio page visibility overrides (`settings.page_visibility`) for keys incl. `leads`, `qanvast-ops/leads` (null removes the override), and the "notifications paused" switch ("Queued reminders are held, not lost" / "Delivering normally"); Overview shows "Region" = `countryCode`. `PATCH /api/admin/studios/[id] {countryCode?, supportedCountries?, notificationsPaused?}` — 400 "Invalid countryCode", "supportedCountries must be an array", "supportedCountries must contain at least one supported country", "supportedCountries must include the default country_code", "notificationsPaused must be a boolean", "No changes"; changing the country re-derives `currency_code`, `timezone`, `locale`; settings merged, flags cache invalidated. Admin dashboard counts pending refunds. Retag endpoint: C-60 (no UI). Admin auth is a separate per-admin-user system (`requireAdminPage("studios")`).
- Reachable: yes (admin portal).

---

## R. Other

### C-77 · Qanvast Ops › Leads (owner-only) [hand-off pointer]
- Where: `ROUTE_ACCESS["qanvast-ops/leads"] = owner`; `docs/user-stories/detailed/qanvast-ops.md:12-19`
- Does: external Qanvast API list of assigned leads with return status filters, CSV export, lead detail with return eligibility (deadlines, appeal window, 2-return cap computed by Qanvast), return filing (same 7 reasons as C-73) that also writes the local `refund_requests` row. `leads.qanvast_lead_id` / `qanvast_company_id` columns exist but no app code reads them (CSV row 2).
- Reachable: yes (owner; module lives on branch `integ/security-qanvast` per the CSV).

### C-78 · Studio settings JSON keys touched by this slice
- Where: `studios.settings` JSONB
- Does: `journey {steps[], inactivationReasons[]}`; `features {lead_journey_mode, duplicate_detection_enabled, lead_manager_hierarchy, casetrust_signing_step, …}`; `workflow {…toggles, approvers{}}`; `notifications_paused`; `is_demo`; `page_visibility {}`; `ai_assignment_prompt` (dead); `branding`.
- Rules: every writer read-then-merges (a blind write once erased a studio's branding).

### C-79 · Lead columns owned by the engine (summary)
- Where: `types/database.ts` `DbLead`
- Does: stage `bucket, lead_status_code, sub_status_code, status (legacy)`; follow-up `next_follow_up_date, next_follow_up_time`; assignment `assigned_to (mirror), owning_manager_id`; journey `engagement_state, hold_restart_date, hold_prev_state {bucket, leadStatusCode, subStatusCode}, closed_reason_code, closed_reason_detail, journey_overrides`; TAT `first_assigned_at, first_outreach_at, first_outreach_by, signed_at`; gates `quote_status (trigger mirror of quotes), contract_uploaded, contract_file_name, signature_request_id, project_type`; review `email_lead_status, possibly_duplicate, duplicate_of_lead_id, needs_attention`; region/entity `country_code, company_id`; `archived_at`; ad intake `external_lead_id, ad_metadata`; agent `agent_idempotency_key`. Child tables: `lead_assignees`, `lead_outreach_attempts`, `lead_artifacts`, `lead_activity_log`, `refund_requests`, `homeowner_project_links`, `tasks(lead_id)`, `projects(lead_id)`, `notifications(entity_type='lead')`.

---

## Uncertain / not verified

1. `region.features.casetrust` — no region config sets `features` in `lib/region-config.ts` as read, so `casetrustRequired` would always be false in the engagement wizard; the public `/sign` page may resolve the SG flag elsewhere. Not verified.
2. Archive/unarchive activity-log wording, `checkArchiveBlockers` blocker list, and `lib/lifecycle/archival.ts` were only grepped, not read.
3. `lib/notifications/dedupe.ts` (120 s window) and `lib/studio-demo.ts` flags were taken from `dispatch.ts` comments and `docs/rules/notifications.md`, not read directly.
4. `/api/identity/members` (accepting leads / preferences save), `/api/notifications/preferences` and `/templates`, `custom-field-values`, `lib/queries/lead-webhooks.ts`, `lib/webhook-lead-parser.ts` were not read; behaviour is inferred from their callers.
5. The drawer's assignment recommendation scoring (Preference 0–40 · Performance 0–35 · Specialty 0–25) and the `acceptingLeads` exclusion come from the CSV audit row 9, not from code read here.
6. The e-sign submit route was grepped, not read whole; the `finalize_signed_mirror` RPC behaviour is from `docs/rules/leads.md`.
7. `roles/[id]` DELETE ignoring system roles and the Studio Setup empty-permission seed come from `docs/user-stories/detailed/accounts-setup.md`.
8. Whether `lead.followup_reminder`'s default recipient roles (`id, owner`) are ever used: the only scheduling path sets a single `recipientId`, so the role list appears unused (inferred).
9. `EngagementStatePill` file is absent from `components/leads/journey/`; the user-story doc still cites it — treated as removed.
10. CSV row 41's claim that the digest cron queried `channel="inapp"` is contradicted by the code read here (`channel:"in_app"`); recorded as fixed.
11. Task auto-cancel on close in Classic mode uses the funnel's **last** bucket or `CLOSED` (`app-context.tsx:760`), while the Journey close route uses `resolveClosedTarget`; both end in the terminal bucket on the default funnel — divergence on custom funnels not tested.
