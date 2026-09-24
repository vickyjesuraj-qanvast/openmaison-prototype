# Inventory B — OpenMaison 1.0 Leads module: the lead detail drawer and everything reachable from it

Source repo (read only): `/Users/vicky/Documents/GitHub/qanvast-id-tool`. All paths below are relative to that root unless absolute. Line numbers are from the 2026-09-24 working tree; the drawer file is 3,641 lines and every range was read in full.

Conventions: "the drawer" = `src/components/leads/lead-detail-drawer.tsx` (`LeadDetailDrawer`). "Classic" = studio feature `leadJourneyMode === false`; "Journey" = `leadJourneyMode === true` (the default, see B-97). Words in quotes are verbatim UI copy. DB columns are `snake_case`; app fields are `camelCase`.

Hand-offs to other readers are marked **→ hand-off** (journey/stage engine `src/components/leads/journey/*` + `src/lib/leads/journey.ts`, `funnel-transitions.ts`, `apply-journey-floor.ts`; listing/creation; quotes internals; tasks; projects).

---

## Drawer shell and navigation

### B-01 · Opening the drawer (entry points)
- Where: `src/app/(main)/leads/page.tsx:260-345, 2230-2236`; `src/lib/app-url.ts:119` (`leadDeepLinkPath`)
- Entry: click a card / list row / mobile card on the Leads board (`setSelectedLead`); URL `?openLead=<id>` or `?leadId=<id>` (alias used by every notification / email deep link); URL `?quoteId=<id>` alone → `GET /api/quotes/resolve-lead?quoteId=` resolves the lead and opens it; URL `?openQuote=true` (Tasks page "Review Quote") auto-opens the primary quote's digitizer; window event `open-lead` `{ detail: { leadId } }` (fired by the drawer's own "View Original →" on a duplicate); Journey mini-rail "jump to step" (`openLeadAtStep`) passes `initialJourneyStep`.
- Does: mounts `<LeadDetailDrawer lead onClose autoOpenQuote initialJourneyStep>`. On close the page strips `openLead`, `leadId`, `quoteId`, `openQuote` from the URL (only on a real open→closed transition).
- Rules: the drawer receives the lead row from the already-loaded list (`useApp().leads`); there is no per-lead fetch on open except extras (B-06). `GET /api/leads/records/[id]` exists (`src/app/api/leads/records/[id]/route.ts`) for `useLeadById` consumers and 404s (never 403) for a manager outside scope (B-93).
- Data: URL search params; `leads` React Query cache `["leads", studioId]`.
- States: lead id not in the loaded list → nothing opens.
- Words: —
- Reachable: yes

### B-02 · Drawer frame (shell, modes, tabs, close)
- Where: drawer `:1420-1435, 2470-2485, 2665-2690`; `src/components/leads/drawer-sections/drawer-shell.tsx`; `src/components/leads/drawer-sections/drawer-section.tsx`
- Entry: B-01
- Does: right-hand slide-in with header (title row + actions + optional tab strip), scrollable body, sticky footer. Two widths: **compact** (`width="default"`) and **full** (`width="full"`) toggled by a header icon (B-08). Compact shows two tabs: `"Status & Activity"` (value `status`, default) and `"Lead Info"` (value `info`); full mode drops the tabs and renders both columns side by side (`statusTabContent` left, `leadInfoContent` right). Scroll resets to top when the active tab changes (`scrollKey`). Backdrop click, Escape (only while focus is inside the drawer; nested dialogs handle their own Escape) and the close button all route through `handleRequestClose` (B-20). Body scroll past 64px collapses the identity zone; expands again under 16px (hysteresis). Opening any drawer dispatches window event `maison-fab-visibility {visible:false}` (hides the mAIson FAB) and restores it on unmount.
- Rules: every section is a `DrawerSection` with an uppercase title; sections can carry a `badge` (used for the issuing-entity tag, B-63) and a `tabIndex=-1` so CTAs can focus them.
- Data: local state only.
- States: on lead change (`lead.id`) every draft field is re-seeded and `activeTab` resets to `status`, `leadInfoEditMode` to false.
- Words: tab labels above; close button `aria-label="Close drawer"`, `title="Close"`.
- Reachable: yes

### B-03 · First-time drawer tip (coach mark)
- Where: drawer `:792-806, 2690-2705`; `src/hooks/use-coach-mark.ts`
- Entry: first open of any lead drawer per browser.
- Does: dismissible callout at the top of the body. Dismiss writes `localStorage["om-coach-features"].leadDrawer = true`.
- Rules: forced on for the dev phone `91234017` (`devForce`). Shown when `!isCoachMarkSeen("features","leadDrawer")`.
- Data: localStorage only.
- Words: title `"Your lead profile"`; body `"Edit details, set follow-ups, digitize quotes, and track activity — all from this drawer."`
- Reachable: yes

### B-04 · URL sync of the open quote
- Where: drawer `:700-790`
- Entry: automatic.
- Does: (a) on mount / lead change, reads `?quoteId=` → sets `activeQuoteId` and, if the tool page `tools/quote-digitizer` is enabled, opens the Quote Digitizer for it; `?openQuote=true` with no `quoteId` opens the primary quote (falls back to the first). (b) mirrors `activeQuoteId` + dialog-open state back into the URL via `router.replace` (`quoteId` set while the dialog is open, deleted only once the dialog has actually been open at least once; `openLead` always set to this lead's id).
- Rules: `autoOpenQuote` prop + `lead.quoteStatus` truthy also opens the dialog on the primary quote.
- Data: URL only.
- States: guards a documented race where the mirror effect stripped an inbound `quoteId` before adoption.
- Words: —
- Reachable: yes

### B-05 · Tool-page gate for every tool ingress
- Where: drawer `:300-312` (`guardedToolOpen`), `usePlatformConfig().isPageEnabled`
- Entry: any button that opens Quote Digitizer, Live Meeting co-pilot, AI Visualizer, 3D Space Planner.
- Does: if the page key is disabled for the studio, shows an info toast instead of doing nothing; the dialogs themselves are also mount-gated on the same key.
- Rules: keys used in this drawer: `tools/quote-digitizer`, `tools/copilot-analytics`, `tools/ai-visualizer`, `tools/floor-plan`, `tools/homeowner-portal` (questionnaire section, B-52).
- Data: platform config (admin-controlled page settings).
- Words: `"This tool is turned off for your studio"` / description `"A studio owner can enable it in the workspace's page settings."`
- Reachable: yes

### B-06 · Lazy "extras" load (activity log + refund)
- Where: drawer `:405-410`; `src/lib/queries/leads.ts:147-172` (`useLeadDetailExtras`); `src/app/api/leads/records/[id]/extras/route.ts`; `src/lib/leads/lead-detail-extras.ts`
- Entry: automatic on open.
- Does: `GET /api/leads/records/{id}/extras` returns `{ activityLog: [{action,date,by}], refundStatus?, refundReason?, refundSubReasons?, refundNotes? }`. Server reads `lead_activity_log` (ordered `performed_at` asc), the single `refund_requests` row for the lead (`maybeSingle`), and `studio_members` + `profiles` to resolve names. `staleTime: 0`.
- Rules: `refundStatus` prefers extras, falls back to `lead.refundStatus`. Activity log prefers extras, then `lead.activityLog`, then `[]`.
- Data: tables `lead_activity_log(lead_id, action, performed_by, performed_at, metadata)`, `refund_requests`, `studio_members`, `profiles`.
- States: `extrasLoading` suppresses the Return & Refund affordances until loaded.
- Words: —
- Reachable: yes

---

## Header / identity / status

### B-07 · Identity zone (title)
- Where: drawer `:1440-1490` (`identityZone`); `src/components/ui/badges.tsx` (`TempBadge`, `StatusBadge`)
- Entry: always.
- Does: avatar with initials (first letters of up to two name words) + lead name as the drawer title. Badges row beneath: **temperature badge** (`lead.temp`, uppercase text `HOT`/`WARM`/`COLD`; a tooltip with `lead.tempReason` and the footer `"AI Lead Prioritiser · based on lead events"` when a reason exists); **status badge** (label of the current draft status, `getStatusByCode(editStatusCode, funnelConfig)?.label` else the raw code); **country chip** (flag + region label) only when `lead.countryCode` is set and `user.supportedCountries.length > 1`; **refund badge** `"Refund: {refundStatus}"` when a refund request exists (yellow for `Submitted for Review`, green for `Approved`, red otherwise). In compact mode the zone shrinks and the badges row folds away on scroll.
- Rules: the temperature badge is shown in the drawer only (cards have it commented out).
- Data: `leads.temp`, `leads.temp_reason`, `leads.country_code`, extras refund status (B-06).
- Words: `"Refund: Submitted for Review"` / `"Refund: Approved"` / `"Refund: Rejected"` (from `formatRefundStatus`: `pending → "Submitted for Review"`, `approved → "Approved"`, `rejected → "Rejected"`).
- Reachable: yes

### B-08 · Header action icons
- Where: drawer `:2385-2470` (`headerActions`)
- Entry: always.
- Does, left to right: (1) **WhatsApp** — opens `https://wa.me/<digits>` in a new tab where digits = `lead.phone` with non-digits stripped; no phone → info toast. (2) **Start Live Meeting** (mic) — opens the co-pilot consent dialog (B-84); only when `tools/copilot-analytics` is enabled and the launcher is not already open. (3) **Full View / Compact View** toggle (hidden on phones). (4) **More options** (3-dot menu, B-09).
- Rules: —
- Data: —
- Words: WhatsApp `aria-label`/`title`: `"Message {name} on WhatsApp"` / `"No phone number — add one to start a WhatsApp chat"`; toast `"This lead has no phone number"` + `"Add one in the lead's contact info to start a WhatsApp chat."`; mic `"Start Live Meeting"`; toggle `"Compact View"` / `"Full View"`; menu `"More options"`.
- Reachable: yes

### B-09 · 3-dot menu
- Where: drawer `:2424-2468`
- Entry: header "More options".
- Does: items in order: **`Edit Lead Info`** — `setLeadInfoEditMode(true)` + switch to the Lead Info tab (the only way to make Contact / Project Details / Property Info / Other Info / Document Details editable, B-21). **`Archive`** — opens the archive confirm (B-72). **`Request Return & Refund`** — opens the return wizard (B-65); shown only when `lead.source === "Qanvast"` (exact string) AND draft bucket is `CLOSED` AND draft status ≠ `SIGNED` AND no refund status AND extras loaded. **`Activity Log`** — switches to Status tab and smooth-scrolls to the Activity Log section after 100 ms.
- Rules: no delete anywhere; the co-pilot and Invite-to-Portal items were deliberately removed from this menu (duplicates).
- Data: —
- Words: as above.
- Reachable: yes

### B-10 · Lead flags callouts (Needs Attention / Possibly Duplicate)
- Where: drawer `:1493-1532` (`leadFlagsSection`)
- Entry: Status & Activity tab, when `lead.needsAttention` or `lead.possiblyDuplicate`.
- Does: yellow callout for needs-attention; red callout for possible duplicate. When `lead.duplicateOfLeadId` is set the red callout is clickable: closes this drawer and after 300 ms dispatches `open-lead` for the original (B-01) and shows `"View Original →"`.
- Rules: flags are set by the email cron / webhook / hangout intake (**→ hand-off** to ingestion reader); the drawer only displays and navigates.
- Data: `leads.needs_attention`, `leads.possibly_duplicate`, `leads.duplicate_of_lead_id`.
- Words: `"Needs Attention"` + `"This lead was auto-imported with low parsing confidence. Please review and correct the details."`; `"Possibly Duplicate"` + `"A lead with the same phone number already exists."`; `"View Original →"`.
- Reachable: yes

### B-11 · Commission-pending callout (linked Draft project)
- Where: drawer `:1535-1557`
- Entry: Status tab when `projects.find(p => p.leadId === lead.id)` exists with `stage === "Draft"` and `!commissionLocked`.
- Does: yellow callout with a `"View Project"` button → `router.push(/projects/{id})`.
- Rules: projects come from `useApp().projects`.
- Data: `projects.lead_id`, `projects.stage`, `projects.commission_locked` (**→ hand-off** projects reader for the columns).
- Words: `"Project created in Draft"`; `"Commission structure awaiting owner approval. Financial actions on the project are restricted until approved."`; `"View Project"`.
- Reachable: yes

### B-12 · Notes card (read-only)
- Where: drawer `:1560-1566`
- Entry: Status tab when `lead.notes` is non-empty.
- Does: yellow card titled `"Notes"` showing `lead.notes` (the same field edited as "Remarks" in Other Info, B-29). Read-only here.
- Data: `leads.notes`.
- Reachable: yes

### B-13 · Response time card (TAT)
- Where: drawer `:2050-2062`; `src/components/leads/lead-response-time-card.tsx`; `src/lib/leads/tat-stamps.ts`; `src/lib/leads/tat-report.ts` (`formatTatDuration`, `tatGrade`)
- Entry: top of the Status & Activity tab in both modes.
- Does: three rows `"Created → Assigned"`, `"Assigned → First outreach"`, `"First outreach → Signed"`, each `done` / `running` (live clock, re-renders every 60 s) / `pending`; a pill `"SIGNED"` or `"IN PROGRESS"`; footer `"Created → Signed"` total or `"Lead age"`. Middle row is graded good/bad by `tatGrade`. Sub-lines: `"not assigned yet"`, `"no outreach logged yet"`, `"not signed yet"`, `"first outreach {date} · {member name}"`, `"signed {date}"`, `"—"`, and durations formatted `"{d} — running"`.
- Rules: stamps are write-once, best-effort, server-side: `first_assigned_at` (assignee route replace/upsert + lead-create surfaces), `first_outreach_at`/`first_outreach_by` (outreach POST; re-stamps EARLIER for backdated attempts), `signed_at` (e-sign submit, journey "signed" mark-done, manual move into `SIGNED` via PATCH). Reassignment / attempt deletion never clears them.
- Data: `leads.first_assigned_at`, `first_outreach_at`, `first_outreach_by (profiles.id)`, `signed_at`, `created_at` (migration 262).
- States: invalid `createdAt` → card not rendered.
- Reachable: yes

### B-14 · Meeting Intelligence + Meeting Briefs sections
- Where: drawer `:2090-2096, 2330-2372`; `src/components/copilot/prep-card.tsx`; `src/lib/queries/copilot.ts:286` (`useBriefsForLead` → `GET /api/copilot/records/briefs?leadId=`)
- Entry: Status tab, when the lead has ≥1 `meeting_briefs` row.
- Does: `"Meeting Intelligence"` section hosts `<PrepCard compact>` (deal score tiers `Hot ≥80`, `Warm ≥60`, `Cool ≥40`, else `Cold`; **→ hand-off** copilot reader). `"Meeting Briefs (N)"` section lists each brief: date, `"Score: {dealScore}"` chip (green ≥80 / yellow ≥60 / purple ≥40 / grey), 2-line summary, `"Next: {suggestedActions[0]}"`, `"View full brief →"` opens `/tools/copilot-analytics?sessionId={sessionId}` in a new tab.
- Data: `meeting_briefs(lead_id, deal_score, summary, suggested_actions, session_id, created_at)`.
- Reachable: yes (only with briefs)

---

## Autosave engine (applies to every editable field)

### B-15 · Whole-drawer autosave (no Save button)
- Where: drawer `:1030-1290`; `src/lib/leads/drawer-autosave.ts`; `src/context/app-context.tsx:719-1000` (`updateLead`); `src/lib/queries/leads.ts:411-520` (`useUpdateLeadBucket`); `PATCH /api/leads/mutations/[id]`
- Entry: any edit in any section.
- Does: a serialized `draftSnapshot` of every draft field re-arms a 700 ms debounce; on fire, `commitAutoSave` computes `changedFields` (only fields whose draft differs from the persisted lead, whitespace-normalised for name/phone) and calls `updateLead(lead.id, payload, { silent: true })`. Toast with a single stable id: `"All changes saved"` on success. Save-valid / hold-invalid: `computeDrawerValidationErrors` + `resolveAutoSaveHolds` → if the status move is invalid, `bucket`/`leadStatusCode`/`subStatusCode` are dropped from the payload and the held reason is shown as `"Not saved — {reason}"` plus inline field errors (only keys in `STATUS_GATE_KEYS = assignment, quote, projectType, contract, followUp`); an out-of-range budget drops only `budget` (error key `budget`). A "held" state is only flagged when the user is actually moving status (draft ≠ persisted), not for a lead that already sat invalid. `lastSavedSnapshot` prevents re-saving the same held draft. A pending sub-700 ms edit is flushed on close (`flushAutoSave`).
- Rules: `quote_status` is deliberately NEVER written by autosave (explicit submit/approve/revise flows own it). Render-phase re-seed guards: (a) `bucket|leadStatusCode|subStatusCode|nextFollowUpDate|nextFollowUpTime` re-seed whenever the PERSISTED values change (so a server-side hold/resume/close/e-sign move is not reverted by a stale draft); (b) `icNumber|customerId|quoteValidUntil` re-seed likewise (the digitizer's Layout tab edits them concurrently). Draft state is otherwise only reset on `lead.id` change.
- Data: payload keys (camelCase → column): bucket, leadStatusCode→lead_status_code, subStatusCode→sub_status_code, assignedTo→assigned_to, nextFollowUpDate/Time→next_follow_up_date/time, projectType→project_type, contractUploaded→contract_uploaded, contractFileName→contract_file_name, propertyStatus→property_status, stylePreference→style_preference, areaSqft→area_sqft, areaUnit→area_unit, keyCollectionDate→key_collection_date, propertyAddress→property_address, notes, additionalInfo→additional_info, icNumber→ic_number, customerId→customer_id, quoteValidUntil→quote_valid_until, name, email, phone, source, type→property_type (via `reversePropertyType`), area, budget. Server whitelist (`ALLOWED_COLUMNS`) also admits `quote_status`, `quote_data`, `company_id`, `quote_metadata`, `quote_hierarchy_metadata`, `engagement_state`, `hold_restart_date`, `email_lead_status`, `possibly_duplicate`, `duplicate_of_lead_id`; `archived_at`, `studio_id`, `id` are never accepted.
- States: server 404 when lead hidden; 409 `NO_QUOTE_ROW` when writing `approved`/`sent_for_signature`/`client_signed` to a lead with no `quotes` row (`"This lead has no quote yet — save the quote before approving or sending it."`); 403 `ASSIGNMENT_LOCKED` (B-93); 400 `"Unknown legal entity for this studio"` for a foreign `company_id`. Empty payload → `{ success:true, skipped:true }`.
- Words: `"All changes saved"`, `"Not saved — {reason}"`; validation messages: `"Assign at least one Interior Designer before moving to Ongoing"`, `"Assign at least one Interior Designer or move the lead back to Unassigned"`, `"Budget too low — please enter at least 1,000."`, `"Budget exceeds the maximum supported (5,000,000). If this is correct, break it into multiple projects."`, `"An approved quote is required"`, `"Either e-sign the quote in-app or upload a signed contract before marking Signed"`, `"Project type is required for Signed status"`, `"A signed contract must be uploaded"`, `"Follow-up date is required for this status"`, fallback `"fix required fields"` / `"fix budget"`.
- Reachable: yes

### B-16 · Validation gate rules (the exact conditions)
- Where: `src/lib/leads/drawer-autosave.ts:44-105`
- Entry: B-15
- Does (given draft + workflow toggles): **assignment** required when target bucket `requiresAssignment` (ONGOING by default) and `workflow.requireAssignment !== false`, OR target status is `SIGNED`; also `NEW/ASSIGNED` with no assignee. **budget** must be within 1,000–5,000,000 when > 0. **quote**: when target status `requiresApprovedQuote` and `workflow.quoteApprovalRequired !== false`: allowed statuses `approved|sent_for_signature|client_signed`, except SIGNED without an uploaded contract, where only `client_signed` passes. **projectType** when target `requiresProjectType` and `workflow.projectTypeRequired !== false`. **contract** when target `requiresContract` and `workflow.contractRequired !== false` and neither saved nor draft contract flag — relaxed when a signature request is `pending|viewed|signed` or quote is `client_signed`. **followUp** when target `followUpRequired` and no date.
- Rules: `contractUploaded` fed into validation is the REAL flag (`lead.contractUploaded` or a draft with a real file name ≠ `client-signed-quote.pdf`), not the display seed.
- Data: funnel config (`studio_lead_funnel.config` JSONB, default `DEFAULT_FUNNEL_CONFIG` in `src/data/lead-bucket-config.ts`), workflow toggles (`/api/studio-config/workflow`, per-member overrides merged via `resolveEffectiveWorkflow`).
- Reachable: yes

### B-17 · Side effects of a status commit (server + app-context)
- Where: `src/context/app-context.tsx:719-1000`; `PATCH /api/leads/mutations/[id]`; `src/lib/leads/notify-stage-change.ts`
- Entry: B-15
- Does (client, in `updateLead`): auto-shift first-bucket status `UNASSIGNED → ASSIGNED` when an assignee is set (and the reverse when cleared); if the move enters the last/CLOSED bucket, every open task (`NotStarted|InProgress`) on the lead is set `Cancelled`; on a real `assignedTo` change, open tasks are reassigned to the new assignee's profile id (skipped when the member → profile cannot be resolved); follow-up task create/update (B-38); 30-min-before reminder scheduling (B-38); optimistic cache update. Server: `stampSigned` when `lead_status_code === "SIGNED"`; `lead.assigned` notification when `assigned_to` changes to a member not already on `lead_assignees`; `lead.status_changed` notification (recipients owner+admin+assignees) whenever bucket/status/sub-status actually changed; `recomputeLeadQuoteTotals` when `quote_metadata` changes.
- Rules: `silent: true` suppresses the per-commit toast/activity entry in app-context (the route itself writes no activity log).
- Data: `tasks`, `scheduled notifications` (`/api/notifications/schedule`), `leads.signed_at`.
- Reachable: yes

### B-18 · "Lead moved to Closed" undo toast
- Where: drawer `:1206-1228`
- Entry: a valid commit whose draft bucket is `CLOSED` and persisted bucket was not.
- Does: toast with an `"Undo"` action that restores the previous bucket/status/sub-status locally and via `updateLead(... { silent:true })`. Fires once per transition (`closedUndoFired` ref).
- Words: `"Lead moved to Closed"` / `"It's out of your active pipeline."` / `"Undo"`.
- Reachable: yes (Classic status dropdown path)

### B-19 · Auto-open Create Project on SIGNED
- Where: drawer `:1180-1190`
- Entry: a valid commit into status `SIGNED`.
- Does: after 500 ms opens the Project Create drawer (B-82) once per drawer mount (`signedDialogFired`), skipped when `lead.subStatusCode === "PROJECT_STARTED"` or a project with `leadId === lead.id` already exists.
- Reachable: yes

### B-20 · Guarded close
- Where: drawer `:1300-1320` (`handleRequestClose`), confirm at `:3577-3588`
- Entry: X / Escape / backdrop.
- Does: flushes pending custom-field writes and the autosave debounce; if the status draft differs from persisted AND is held by validation, opens the confirm; otherwise closes silently.
- Words: title `"Status change not saved"`; body `"Your status change wasn't saved — {reason}. All other edits are already saved. Discard the status change and close?"`; buttons `"Discard status change"` / `"Keep editing"`.
- Reachable: yes

### B-21 · Edit mode + Cancel
- Where: drawer `:1427-1430` (`sectionMode`), footer `:2577-2632`
- Entry: 3-dot `Edit Lead Info` (B-09).
- Does: `leadInfoEditMode` switches Contact / Project Details / Property Info / Other Info / Document Details from view to edit renderers. While dirty or in edit mode the footer shows a `"Cancel"` button that re-seeds every draft field from the persisted lead (bucket/status, assignees, follow-up, project type, contract flag/name, client info, project reqs, property info, other info) and exits edit mode. Autosave does not exit edit mode.
- Rules: Cancel does NOT re-seed Document Details (`documentInfo`) — see Uncertain U-2.
- Words: `"Cancel"`.
- Reachable: yes

---

## Client info (Lead Info › "Contact")

### B-22 · Contact section — view mode
- Where: `src/components/leads/drawer-sections/client-info-section.tsx:158-190`; drawer `:1570-1600`
- Entry: Lead Info tab.
- Does: phone row as `tel:` link showing `"{countryCode} {digits grouped in 4s}"` or `"No phone"`, with a copy button (`"Phone copied"`); email row as `mailto:` or `"No email"`, copy button (`"Email copied"`); `"Source:"` + a `SourceChip` when a source exists.
- Words: copy failures `"Couldn't copy"`; `aria-label="Copy phone"` / `"Copy email"`.
- Reachable: yes

### B-23 · Contact section — edit mode fields
- Where: `client-info-section.tsx:192-340`
- Entry: B-21
- Does: `First Name *` (text, placeholder `"e.g. Aisha"`); `Last Name` (text, `"e.g. Rahman"`); `Email` (type email, `"aisha@email.com"`); `Phone *` = country-code select (flag + dial code; options = the studio's country only via `studioCountryCode`, or `supportedCountryCodes` when passed, else all supported) + digits input (non-digits stripped, capped at the country's `maxDigits`, region placeholder e.g. SG `"8123 4567"`); `Lead Source *` = select of the studio's `lead_source` taxonomy names (fallback `DEFAULT_LEAD_SOURCES`: Referral, Instagram, Facebook, Website, Walk-in) + `"Others…"` which swaps to a free-text input (`"Enter source name…"`) with `"Cancel"`. Changing the country code clears the phone.
- Rules: name is stored as `"{first} {last}"` in `leads.name`; phone stored as `"{dialCode} {digits}"` in `leads.phone`; source stored as the display name (legacy slugs normalised via `SOURCE_MAP`: referral/instagram/facebook/website/walk-in/qanvast/hangout/organic/email → capitalised). `validatePhone` (region): `"Must be {n} digits"` / `"Must be {min}–{max} digits"` / `"Must start with {label}"` — SG: 8 digits starting 6/7/8/9 (`startsWithLabel: "6, 7, 8, or 9"`). NOTE: the drawer passes `errors={validationErrors}` but never sets `firstName`/`phone`/`source` errors itself — the required marks are visual; autosave writes whatever is typed (name falls back to the persisted name when blank; see U-3).
- Data: `leads.name`, `leads.email`, `leads.phone`, `leads.source`; taxonomy `useTaxonomies(studioId, "lead_source")`.
- Words: labels above; `"Select source"`.
- Reachable: yes

### B-24 · Invite to Portal (lead-stage)
- Where: drawer `:1583-1598, 3315-3327`; `src/components/homeowner/invite-dialog.tsx`; `POST /api/homeowner/invite` (`src/app/api/homeowner/invite/route.ts`)
- Entry: `"Invite to Portal"` button under the Contact section (both modes).
- Does: dialog `"Invite to Portal"` / `"Invite a homeowner to track {project name | "their project"} in their portal."` Fields: `Homeowner Name` (prefilled `lead.name`, `"e.g. John Tan"`), `Phone Number` (dial-code select over all supported countries + digits, prefilled from `lead.phone` with country detection; fallback country = lead's `countryCode`, then studio, then SG), `"Show chat history"` switch (default on; `"Homeowner can see messages from before they joined"` / `"Homeowner only sees messages after invite"`), a read-only portal URL with `"Copy Link"`/`"Copied"` (branded `/my/{portal_slug}/login`, else `/my/login`; slug from `GET /api/studio-setup/portal-slug`). `"Send via WhatsApp"`: validates name (`"Name is required"`) and phone (`"Valid phone number is required"` or the region message), opens a blank tab synchronously, POSTs `{ leadId (or projectId when a project is linked), name, phone: "{dial}{digits}", chatHistoryVisible }`, then points the tab at `https://wa.me/{digits}?text=` with the server's `whatsappMessage`. Popup blocked → `"Open WhatsApp"` fallback anchor + toast.
- Rules: project flow wins when `linkedProject` exists (`projectId` passed, `leadId` omitted). Server (lead-stage): verifies the lead; reuses the lead's existing `homeowner_project_links` primary row (a DB trigger auto-creates it for any lead with a phone), merges to the canonical-phone `homeowner_profiles` row when a different profile owns the phone, syncs name (and phone when not merging), patches `is_active=true`, `chat_history_visible`, mints `portal_token` if missing; legacy leads with no link get profile find-or-create + link insert `role:"primary"`. Returns `{ homeownerId, portalUrl, whatsappMessage, alreadyInvited }`.
- Data: `homeowner_profiles(studio_id, phone UNIQUE per studio, name)`, `homeowner_project_links(homeowner_id, studio_id, lead_id, project_id NULL, role "primary", portal_token, chat_history_visible, is_active, linked_at)`; `studios.portal_slug`, `NEXT_PUBLIC_APP_URL`.
- Words: helper `"Sends a WhatsApp message with their portal login link."`; `"WhatsApp opens with a ready-to-send message containing their portal login link."`; toasts `"Portal link ready — opening WhatsApp for {name}"`, `"{name} is already invited — opening WhatsApp to resend the link"`, `"Pop-up blocked — tap “Open WhatsApp” below to send the invite."`, `"Portal link copied to clipboard"`, `"Failed to copy link"`, `"Something went wrong. Please try again."`; server message `"Hi {name}! {studio} has invited you to track your project on the mAIson portal. Log in here: {url}"` (lead-stage) / `…track your project "{project}"…` (project); `"Preparing…"`, `"Cancel"`.
- Reachable: yes

---

## Project requirements (Lead Info › "Project Details")

### B-25 · Project Details — view
- Where: `src/components/leads/drawer-sections/project-requirements-section.tsx:46-66`
- Does: three stat tiles: `"Budget"` = `{currency symbol}{budget.toLocaleString()}` (0 when empty), `"Property"` = region label for the property-type key (fallback `PROPERTY_MAP`, raw value, or `"—"`), `"Area"` = area or `"—"`.
- Data: `leads.budget`, `leads.property_type`, `leads.area`, `leads.country_code`.
- Reachable: yes

### B-26 · Project Details — edit fields
- Where: `project-requirements-section.tsx:68-125`
- Does: `Property Type *` select of the lead country's `propertyTypes` (SG keys/labels: hdb_2_room "HDB 2-Room", hdb_3_room "HDB 3-Room", hdb_4_room "HDB 4-Room", hdb_5_room "HDB 5-Room", hdb_executive "HDB Executive", bto_3_room "BTO 3-Room", bto_4_room "BTO 4-Room", bto_5_room "BTO 5-Room", ec "Executive Condo", condo "Condo", penthouse "Penthouse", landed_terrace "Landed — Terrace", landed_semi_d "Landed — Semi-D", landed_bungalow "Landed — Bungalow", commercial_office "Commercial — Office", commercial_retail "Commercial — Retail", others "Others"); `Budget` = currency-prefixed numeric text (digits only, placeholder `"e.g. 85000"`); `Area / District *` text (placeholder `"e.g. Downtown"`).
- Rules: budget held (not saved) outside 1,000–5,000,000 (B-16); when cleared, autosave writes `lead.budget || 0` (see U-3). Legacy stored labels ("HDB/Apartment", "Condo", "Landed Property", "Commercial") are mapped back to keys via `resolvePropertyTypeKey`.
- Data: `leads.property_type`, `leads.budget`, `leads.area`.
- Words: `"Select type"`; region-specific currency symbol.
- Reachable: yes

---

## Property info (Lead Info › "Property Info")

### B-27 · Property Info — view
- Where: `src/components/leads/drawer-sections/property-info-section.tsx:33-58`
- Does: two-column grid of the non-empty items `Property Status`, `Style`, `Area Size` (`"{n} sq ft"` / `"{n} sq m"`), `Key Collection`, `Property Address` (full width, preserves line breaks); empty state `"No property info added yet"`.
- Reachable: yes

### B-28 · Property Info — edit fields
- Where: `property-info-section.tsx:60-126`
- Does: `Property Status` select (SG: `New`, `Resale`, `Existing`; MY: `New`, `Sub-sale`, `Existing`; AE: `Off-plan`, `Ready`, `Existing`; IN: `Under Construction`, `Ready to Move`, `Existing`); `Style` searchable select (SG: `Eclectic, Industrial, Modern, Contemporary, Vintage, Scandinavian, Transitional, Minimalist, Japandi, No preference`); `Area Size` digits-only text (`"e.g. 1200"`) + unit select `sq ft` (`sqft`) / `sq m` (`sqm`); `Key Collection` searchable select (SG: `Collected, in 3 months, in 6 months, in 9 months, Later`; MY: `Received keys, …in 12 months, Later`; AE: `Handed over, …`; IN: `Possession received, …`); `Property Address` textarea (`"e.g. 123 Sample Street, City, Postal Code"`) with helper `"Used in quote PDF + signing page. Optional."`.
- Rules: option lists come from `getRegionConfig(lead.countryCode ?? studio country)`.
- Data: `leads.property_status`, `style_preference`, `area_sqft` (number), `area_unit` (default `sqft`), `key_collection_date`, `property_address` (trimmed).
- Words: `"Select status"`, `"Select style"`, `"Select timeline"`.
- Reachable: yes

---

## Other info / custom fields

### B-29 · Other Info (Remarks + Additional Info)
- Where: `src/components/leads/drawer-sections/other-info-section.tsx`
- Does: view: `Remarks` and `Additional Info` paragraphs or empty state `"No additional info added yet"`. Edit: `Remarks` textarea (`"Any initial requirements, preferences, or context..."`, 3 rows) → `leads.notes`; `Additional Info` textarea (`"Any other information..."`, 2 rows) → `leads.additional_info`.
- Rules: the Journey Outreach log can append a note block into Remarks (`onNoteAppended`, drawer `:2240-2245`), which then autosaves.
- Reachable: yes

### B-30 · Document Details (IC / Customer ID / Quote Valid Until)
- Where: `src/components/leads/drawer-sections/document-info-section.tsx`; drawer `:1633-1640, 990-1010`
- Does: view: `IC / NRIC`, `Customer ID`, `Quote Valid Until` or empty state `"No document details added yet"`. Edit: `IC / NRIC` text (`"e.g. S1234567A"`, helper `"Printed on the quote header when the studio uses a structured (key-value) layout."`), `Customer ID` text (`"Studio's own customer reference"`), `Quote Valid Until` date input.
- Rules: values trimmed; the quote digitizer's Layout tab edits the same three columns, so the drawer re-seeds them when the persisted values change (B-15).
- Data: `leads.ic_number` (migration 175), `leads.customer_id`, `leads.quote_valid_until` (migration 181). Consumed by the quote PDF tokens `{client_ic}`, `{customer_id}` (**→ hand-off** quotes).
- Reachable: yes

### B-31 · Custom Fields (per-studio)
- Where: drawer `:640-690` (drafts + debounce), `:1657-1755` (render); `src/lib/queries/studio.ts:87` (`useLeadCustomFields` → `GET /api/lead-config/custom-fields`); `src/lib/queries/studio-config.ts:479-505`; `src/app/api/studio-config/custom-field-values/route.ts`
- Entry: Lead Info tab, section `"Custom Fields"`, only when the studio has ≥1 active custom field.
- Does: renders each field by `fieldType`: `text` (input, placeholder `"Enter {label}"`), `number` (input type number), `date` (date input), `dropdown` (select with `"Select..."` + options), `multi_select` (toggle chips, stored `string[]`). Required fields show `*` (visual only; no enforcement). Separate autosave lane: drafts render instantly; writes are batched and flushed 500 ms after idle, on blur, on drawer close and on unmount; dropdown/multi-select flush immediately. Values are fetched via `GET /api/studio-config/custom-field-values?leadId=` and saved via `PUT` `{ leadId, values:[{fieldId,value}] }` (upsert on `lead_id,field_id`). Skeleton rows while loading.
- Rules: definitions are studio-scoped (`lead_custom_fields` where `is_active`, ordered `order_index`); managed in Accounts (**→ hand-off** settings reader).
- Data: `lead_custom_fields(id, studio_id, label, field_type, options, is_required, order_index, is_active)`, `lead_custom_field_values(id, lead_id, field_id, value JSONB)`.
- Words: `"Couldn't save custom fields — please retry"`.
- Reachable: yes

---

## Assignment

### B-32 · Assigned Designers section
- Where: drawer `:2270-2330`; `src/components/leads/drawer-sections/assignment-section.tsx`
- Entry: Status & Activity tab (both modes); section title `"Assigned Designers"` when ≥1 assignee else `"Assign Interior Designer"`. Focusable (tab-index -1) so the readiness card and the journey "Assign a designer" CTA can scroll+focus it.
- Does: lists assignee chips (avatar initials, name, member specialty, a `"{n}%"` commission chip when >1 assignee — `title="Commission split (auto-balanced; finalized at project creation)"`, and an `X` remove button). Header `"Assigned ({n})"`; when >1: `"Commission split is set at project creation"`. Below: `"Manual Assignment"` / `"Add Another Designer"` search picker (`"Choose a designer to assign…"` / `"Search to add another designer…"`, input `"Search by name or specialty…"`) listing assignable members not yet assigned with specialty, `"· {n} active"` and a green dot `title="Accepting leads"` when `acceptingLeads !== false`. Empty list copy: `"No assignable designers found"` / `"No match — try a different name"` / `"All designers already assigned"`.
- Rules: assignable pool = members with tag `id` OR any tag that is an assignable custom role (`studio_roles.is_assignable`). Read-only (`readOnly`) when `managerReassignLocked` (B-93) — chips render without remove, picker replaced by `"Your manager assigns leads to you."`
- Data: `lead_assignees(lead_id, member_id, commission_split_bps, added_at, added_by)`; `leads.assigned_to` mirror (= first-added junction member).
- Reachable: yes

### B-33 · Add an assignee
- Where: drawer `:2276-2305` (`onAdd`); `src/lib/queries/assignees.ts:35-100` (`useAssignMembers("lead")`); `POST /api/leads/mutations/[id]/assignee` mode `upsert`
- Entry: pick from the search picker or the AI card's `"Assign to {name}"`.
- Does: immediate DB write (not the 700 ms autosave): re-balances everyone to an even split (`evenSplitBps`, remainder to the first), sets local `assignedTo` to the first assignee, flips local `NEW/UNASSIGNED → ASSIGNED`, then upserts the full member list. Server: upserts rows (`added_by` = session user), `stampFirstAssigned`, manager-hierarchy owning-manager stamp (flag), mirrors `leads.assigned_to`, cascades genuinely-new members onto the lead's project (`project_assignees` at 0 bps, add-only, mirrors `projects.assigned_to/assigned_designer`), fires ONE `lead.assigned` notification for genuinely-new members only. Client then logs `member_added:{memberId}` rows via the activity-log route (best-effort).
- Rules: commission splits are not editable on the lead (moved to project creation).
- Data: as B-32; `project_assignees`; activity `lead_activity_log.action = "member_added:{memberId}"` (rendered `"Added {name}"`).
- Reachable: yes

### B-34 · Remove an assignee (+ last-designer guard)
- Where: drawer `:1325-1345` (`performRemoveAssignee`), `:2306-2320` (`onRemove`), confirm `:3590-3610`; `POST /api/leads/mutations/[id]/assignee` mode `unassign`
- Does: if the removal would leave zero assignees AND the draft status ≠ `UNASSIGNED`, a confirm opens first. Removal: filters locally, re-balances remaining splits (re-upsert), sets `assignedTo` to the new first; when none remain and draft is `ONGOING` or status `ASSIGNED` → local move to `NEW/UNASSIGNED`. Server `unassign`: deletes the junction row, mirrors the scalar, and when no assignees remain downgrades the row via `resolveAssigneeRemovalStatus` (ONGOING or ASSIGNED → `NEW/UNASSIGNED/null`; ON_HOLD/CLOSED untouched), fires `lead.status_changed`, and (flag) an owner/admin emptying the list clears `owning_manager_id`. Client logs `member_removed:{memberId}` (rendered `"Removed {name}"`).
- Words: title `"Remove the only designer?"`; body (SIGNED) `"This is the only designer on a Signed lead. Removing them leaves the signed deal with no assigned owner. Remove anyway?"`; otherwise `"This is the only designer assigned. Removing them will move "{name}" back to Unassigned. Remove anyway?"`; `"Remove designer"` / `"Keep designer"`.
- Reachable: yes

### B-35 · AI Recommendation card
- Where: drawer `:106-282` (scoring), `:2325` (passed only when no assignees); `assignment-section.tsx:88-120`
- Entry: Assignment section while the lead has zero assignees and not read-only.
- Does: recommends one assignable member with a reason and a one-click `"Assign to {name}"` (same path as B-33). Scoring per eligible member (only `acceptingLeads === true`): **Preference 0–40** (`leadPreferences` dimensions propertyType / budget bracket (`"40k-60k"`, `"100k+"` keys) / designStyle / area / scope; weights `must_match=3`, `nice_to_have=1`; 20 neutral when no prefs or all "Don't Care"), **Performance 0–35** (`closeRate/100×15 + min(projectsLast12Months/20,1)×10 + max(1−activeProjects/10,0)×10`), **Specialty 0–25** (keyword matches: hdb/bto +10, condo/villa vs condo/executive +10, penthouse/landed vs luxury/high +10; budget ≥150k & luxury/premium/high +8, <60k & hdb/compact/bto +8, 60–150k & mid/residential +8; residential/interior +5). Highest total wins.
- Rules: reason string = `"Prefers {a & b} (must match|preferred), {style} style, {area} area leads."` + `"{n} projects in the last 12 months with a {rate}% close rate."` + `"Currently has capacity ({n} active projects)."` when ≤3 active. The Accounts "AI Assignment Logic" prompt is never read.
- Data: `studio_members` (specialty, activeProjects, closeRate, projectsLast12Months, acceptingLeads, leadPreferences).
- States: no members → `"Loading..."` / `"Loading team data..."`; none accepting → `"No team members are currently open to new leads. All IDs have set their availability to closed."` (the first member is still shown).
- Words: header `"AI Recommendation"`.
- Reachable: yes

### B-36 · Legacy notify-only assign route
- Where: `src/app/api/leads/[id]/assign/route.ts`
- Does: `POST { memberId | memberIds, memberName?, notifyOnly? }` → only calls `notifyLeadAssigned`; returns `{ success:true, deprecated:true }`. No DB write.
- Rules: no first-party caller remains; kept for stale bundles during deploys. Content-keyed notification dedupe suppresses duplicates.
- Reachable: dead code (API only, no UI caller)

---

## Bucket / status section (Classic mode)

### B-37 · Lead Status controls
- Where: drawer `:1852-1895` (`leadStatusBlock`, rendered only `!journeyMode`); `src/components/leads/drawer-sections/bucket-status-section.tsx`; `src/data/lead-bucket-config.ts`
- Entry: Status & Activity tab › `"Lead Status"` (Classic only).
- Does: one **status select** grouped by bucket (group labels `New`, `Ongoing`, `On Hold`, `Closed` for the default ids, else the bucket label; colour dot per bucket); choosing a status auto-sets its bucket and clears the sub-status. **`Sub-Status`** select appears when the status has sub-statuses (`"Select sub-status…"` = none). Default funnel: NEW → Unassigned, Assigned; ONGOING → Follow-Up (First contact pending / Awaiting reply / Site visit scheduled), Contacted (Awaiting response / Callback scheduled), Quote Created (Quote sent / Quote revised), Met (Proposal discussed / Pending decision); ON_HOLD → Less than a Month, 1 - 3 Months, 3 - 6 Months, 6 - 9 Months, More than 9 Months (each: Client not ready / Budget review / Scope change); CLOSED → Signed (Contract signed / Deposit received / Project started / Handover in progress / Completed handover), Inactive (Budget constraints / Went with competitor / Unresponsive / Not a fit). `PROJECT_CREATED` is filtered out of the options (`DEPRECATED_STATUS_MAP` maps it to `SIGNED`).
- Rules (client): `isIdOnly` users cannot move to an EARLIER bucket than the saved one (`"You can only move leads forward in the pipeline."`) and cannot pick `UNASSIGNED` as status or sub-status (`"Interior Designers cannot unassign leads."`). Status changes are drafts (autosave, B-15); assignee changes are immediate.
- Data: `leads.bucket`, `lead_status_code`, `sub_status_code`; funnel `studio_lead_funnel.config`.
- Words: as listed; inline error line `"⚠ {validationError}"`; (legacy, never true now) `"Changes saved successfully"`.
- Reachable: yes (Classic)

### B-38 · Next Follow-Up (date + time) and the follow-up task
- Where: `bucket-status-section.tsx:236-275`; drawer Journey inline control `:2100-2150`; `src/context/app-context.tsx:790-975`
- Entry: Classic: shown inside Lead Status when the draft status has `followUpRequired` (Follow-Up, Contacted, all ON_HOLD). Journey: inline `"Next follow-up"` row in the Journey section when not won and not on hold.
- Does: `date` input (Classic: `min` today; red border when in the past) + `time` input; quick chips `Tomorrow` / `+3 days` (Journey: `+3d`) / `Next week`; Journey also `"Overdue"` marker and `"Clear"`. On commit with a date (and `workflowToggles.autoCreateFollowUps !== false`, and not moving to closed, and something the task depends on changed): finds the open `LeadFollowUp` task on the lead and UPDATES it (title, plannedDate, plannedTime default `09:00`, assignee) or CREATES one (in-flight guard per lead prevents duplicates); title `"Follow up with {name} — {status label}{ — sub-status}"`; assignee = lead's first assignee's profile, else the current user; every other lead assignee is fanned out into `task_assignees`. Then cancels any queued `lead.followup_reminder` for the lead and schedules a new one at T−30 min (`channels: in_app, email, whatsapp`, recipient = task assignee, label `"Follow up with {name}"`, `action_url = /leads?leadId=`) only when T−30 is still in the future.
- Rules: required when the status flag says so (B-16). Persisted as `leads.next_follow_up_date` / `next_follow_up_time`.
- Data: `tasks(type "LeadFollowUp", lead_id, planned_date, planned_time, assignee_user_id, status)`, `task_assignees`, scheduled notifications.
- Words: `"Next Follow-Up (Required)"`; `"A task will be auto-created when you save."`; `"This follow-up date is in the past."`.
- Reachable: yes

### B-39 · Project Type picker
- Where: `bucket-status-section.tsx:150-175`
- Entry: Classic Lead Status when the draft bucket is `ONGOING` or the status `requiresProjectType` (SIGNED).
- Does: searchable select; options = studio taxonomy `project_type` names, fallback `PROJECT_TYPES`: `Renovation-Full Home`, `New-Full Home`, `Renovation-Partial`, `New-Partial`, `Commercial`, `Others`. Label `"Project Type"` + `"(Required)"` when required.
- Data: `leads.project_type`.
- Words: `"Select project type…"`.
- Reachable: yes (Classic; Journey has no picker — the Project Create drawer collects it)

### B-40 · Contract block (three visual states)
- Where: `bucket-status-section.tsx:176-235`
- Entry: Classic Lead Status when draft status ∈ `QUOTE_CREATED | MET | SIGNED`.
- Does: label `"Signed Contract (Required)"` (when `requiresContract`) or `"Contract (Optional)"`. State 1 (`contractUploaded`): green row with the file name (or `"Contract uploaded"`) + `"Replace"`. State 2 (signature request `pending|viewed|signed`): `"Signed digitally — on file"` / `"Awaiting signature — client viewed the link"` / `"Sent for signature — awaiting client"`, `"Sent {d MMM}"`, button `"Upload signed copy"`. State 3: dashed `"Upload or create contract"` (red when the `contract` error is set). Every button opens the Contract Flow dialog (B-76).
- Rules: for a `client_signed` lead the drawer seeds `contractUploaded=true` with the phantom file name `client-signed-quote.pdf` for display only.
- Data: `leads.contract_uploaded`, `leads.contract_file_name`; latest `quote_signature_requests.status/created_at`.
- Reachable: yes (Classic)

### B-41 · Status API (legacy) — `POST /api/leads/mutations/[id]/status`
- Where: `src/app/api/leads/mutations/[id]/status/route.ts`
- Does: `{ status }` → writes the LEGACY `leads.status` column (`reverseStatus`) and logs `"Stage moved to {status}"`. Not called by the drawer (which writes bucket/status codes via PATCH); used by `useUpdateLeadStatus`.
- Reachable: API only — not from the drawer

### B-42 · Follow-up API (AI draft) — `POST /api/leads/mutations/[id]/follow-up`
- Where: `src/app/api/leads/mutations/[id]/follow-up/route.ts`
- Does: sets legacy `leads.status = "contacted"`, clears `ai_draft_message`, logs `"AI follow-up message sent to homeowner"` (by user) and `"Stage moved to Contacted"` (by System). Manager-scope guarded.
- Reachable: API only (caller `useSendFollowUp`, not in the drawer)

---

## Journey mode section (hand-off summary — the drawer's touchpoints only)

### B-43 · Journey section composition
- Where: drawer `:1795-1850` (derivation), `:2063-2265` (render), `:3280-3300` (dialogs)
- Entry: Status & Activity tab when `studioFeatures.leadJourneyMode` (default true).
- Does: `"Journey"` section = inline next follow-up (B-38) → `JourneyTracker` (steps derived by `deriveJourney` from assignees, bucket/status, `quoteStatus`, `contractUploaded`, `signatureRequestId`, `journeyOverrides`, outreach count) → on-hold strip → `ActiveStepCard` for the focused/active step (Outreach step embeds `OutreachAttempts`) → `"Deal"` zone with `QuoteSummaryCard` (B-58) → `"Move to Hold"` / `"Resume lead"` + `"Close lead"` buttons. Step ids: `assigned, outreach, site_visit, concept, floor_plan, quote, contract, signed`. Each step's recommended native tool (`nativeToolForStep`): site_visit → `"Start Live Meeting"` (consent dialog), concept → `"Open AI Visualizer"` (`/tools/ai-visualizer?leadId=`), floor_plan → `"Open 3D Space Planner"` (`/tools/floor-plan?leadId=`), quote → `"Open Quote Digitizer"`, contract & signed → `"Send for signature"` (Contract Flow). The footer's primary CTA in Journey mode is the active step's tool (except site_visit; suppressed when Create Project shows).
- Rules: `dealWon` = primary quote `client_signed` OR journey `signed` step done — hides follow-up, suppresses Revise / Send for Signature. **→ hand-off** for tracker, step card, evidence menu, outreach dialog, journey-step API (`POST /api/leads/mutations/[id]/journey-step` writes `journey_overrides[step] = {done, by, at, reason?}`, logs `journey_step:{step}:{done|reopened}`, applies the funnel floor, reverts on `signed` reopen, `stampSigned`).
- Words: `"Deal"`, `"Move to Hold"`, `"Resume lead"` / `"Resuming…"`, `"Close lead"`, `"On hold · revisit {date}"`, `"Change date"`.
- Reachable: yes (Journey)

### B-44 · Move to Hold / Change date
- Where: drawer `:2230-2245, 3280-3290`; `src/components/leads/journey/hold-dialog.tsx`; `src/lib/queries/lead-journey.ts:377-445` (`useSetHold`); `POST /api/leads/mutations/[id]/engagement` kind `hold`
- Entry: `"Move to Hold"` button; `"Change date"` on the hold strip.
- Does: dialog `"Move to Hold"` — `"We'll keep this lead's progress and remind you to revisit on the restart date."`; `Restart date *` (min today) + `"Reason / note (optional)"`; buttons `"Cancel"` / `"Move to Hold"`. Server: `computeHoldPatch` → `engagement_state='on_hold'`, `hold_restart_date`, parks the lead in the funnel's hold bucket (tier by restart-date distance), sets the restart date as the follow-up, stashes the prior position in `hold_prev_state` (migration 253; tolerated if missing), logs `hold_set:{date}[ — note]`, fires `lead.status_changed`. Client cancels any prior `lead.hold_restart` ping and schedules a new in-app one at 09:00 on the restart date to `recipientId` (first assignee's user id).
- Words: toasts `"Moved to Hold"` / `"Could not move to Hold"`; ping label `"Hold ended — revisit {name}"` (+ `"({note})"`).
- Reachable: yes (Journey)

### B-45 · Resume from hold
- Where: drawer `:610-622` (`handleResumeFromHold`); `POST /api/leads/mutations/[id]/engagement` kind `state`, `state:"active"`
- Does: `computeResumePatch` restores the stashed position while still in the hold bucket (stash-less → first assignment-required bucket if assigned, else first bucket), clears hold fields; client cancels the revisit ping.
- Words: `"Lead resumed"` / `"Back in its pre-hold stage."` / `"Could not resume lead"`.
- Reachable: yes (Journey)

### B-46 · Close lead (structured inactivation)
- Where: `src/components/leads/journey/inactivation-dialog.tsx`; `src/lib/queries/lead-journey.ts:445-503` (`useCloseLead`); `POST /api/leads/mutations/[id]/close`; `POST /api/tasks/records/cancel-by-lead`
- Entry: `"Close lead"` (Journey). On success the drawer closes.
- Does: 3-step dialog `"Close lead — {name} · Step {n} of 3"`. Step 1 `"Why are you closing this lead?"` — reasons (default: `Lost to competitor`, `Budget mismatch`, `Project postponed`, `Unresponsive` (gated: `"needs 3 attempts — {n} so far"`), `Not a fit`, `Cancelled by client`, `Other`; studio-configurable). Step 2 fields per reason: `Competitor name`, `"Why did we lose? (optional)"`, `Their budget` / `Our quote` (+ `"Gap: ±{n}"`), `Expected restart date` (+ nudge `"Under 6 months away — consider “Move to Hold” instead of closing."`), dimension chips `region / scope / style / timing`, free text (`"Please describe (required)"` for Other, else `"Notes (optional)"`), `Proof` file (`*` when `requiresProof` except Unresponsive: `"{n} logged attempts will be attached as proof."`). Step 3 summary + `"I confirm this information is accurate"` → `"Close lead"`. Proof file → `useUploadLeadFile` (B-49) + artifact `journeyStep:"closure", kind:"file"` (B-50). Server: `resolveClosedTarget` (CLOSED/INACTIVE default), clears sub-status, engagement, hold fields + stash, writes `closed_reason_code`, `closed_reason_detail` (+ `proofArtifactIds`), logs `lead_closed:{label}`, fires `lead.status_changed`; client then cancels open tasks + their reminders (`cascadeTaskCleanup`) and the hold ping.
- Data: `leads.closed_reason_code`, `closed_reason_detail JSONB`.
- Words: toasts `"Lead closed"` / `"Could not close lead"`.
- Reachable: yes (Journey)

---

## Files

### B-47 · Files section (list)
- Where: drawer `:1757-1790`; `src/components/leads/drawer-sections/files-section.tsx`; `src/lib/queries/leads.ts:1612-1642` (`useLeadFiles` → `GET /api/lead-files/records?leadId=`); `src/app/api/files/route.ts`
- Entry: Lead Info tab › `"Files"`.
- Does: upload dropzone button + list of files (newest first) via `FilePreview` (image → thumbnail with lightbox; PDF → row with `"View"` opening the proxy URL in a new tab; other → generic row with type label + size). Each row has a remove button. Sizes shown as `"{n} KB"` / `"{n.n} MB"`. Skeleton while loading; empty state `"No files uploaded yet"`.
- Rules: file URLs are always `/api/files?id=<lead_file_id>` (session + studio gated proxy; `Content-Disposition: inline`), never a storage path.
- Data: `lead_files(id, studio_id, lead_id, file_name, file_url (storage path), file_size, mime_type, uploaded_by, uploaded_at)`; storage bucket `lead-files` path `{studioId}/{leadId}/{uuid}.{ext}`.
- Words: `"Click to upload files"`, `"Max 10MB per file"`, `"Uploading..."`, `title="Remove file"`.
- Reachable: yes

### B-48 · Upload lead file
- Where: drawer `:1400-1415` (`handleFileUpload`); `files-section.tsx:32-46`; `src/lib/queries/leads.ts:1644-1716`; `src/lib/file-utils.ts`; `POST /api/lead-files/records`
- Does: multi-file input; each file validated (`validateFileSize`: 10 MB cap, 3D formats `.glb .gltf .obj .fbx .stl .3ds .dae .usdz` exempt); upload bytes to storage (`uploadFile("lead-files", path, file, {upsert:false})`), then POST `{ leadId, fileName, fileUrl (path), fileSize, mimeType }` (server stamps `studio_id`, `uploaded_by`). Logs activity `contract_uploaded:{name}` when the name matches /contract/i, else `file_uploaded:{name}` (best-effort).
- Words: size error `"File "{name}" is {n}MB. Maximum allowed size is 10MB."`; `"Failed to upload {name}"`.
- Reachable: yes

### B-49 · Delete lead file
- Where: drawer `:1776-1785`; `src/lib/queries/leads.ts:1718-1748`; `DELETE /api/lead-files/records/[id]`
- Does: deletes the DB row (studio-scoped, 404 for foreign/missing) and best-effort removes the storage object.
- Words: `"Failed to delete file"`.
- Rules: no confirmation before deleting.
- Reachable: yes

---

## Artifacts (journey evidence)

### B-50 · Lead artifacts API (list / add / delete)
- Where: `src/app/api/lead-artifacts/records/route.ts`, `src/app/api/lead-artifacts/records/[id]/route.ts`; `src/lib/queries/lead-journey.ts:220-300` (`useLeadArtifacts`, `useAddArtifact`, `useDeleteArtifact`)
- Entry: the journey step card's "Add evidence" menu (Upload file / Paste link / Add note / native tool) and the close-lead proof (B-46) — **→ hand-off** journey reader for the menu UI.
- Does: `GET ?leadId=` → `{ artifacts:[{id, leadId, journeyStep, kind, fileId, url, note, toolRef, label, createdBy, createdAt}] }` (newest first; `kind:"file"` resolves `url` to `/api/files?id={fileId}`). `POST { leadId, journeyStep, kind, fileId?, url?, note?, toolRef?, label? }` (studio/creator from session). `DELETE /[id]` removes only the artifact row (the `lead_files` row stays; `lead_outreach_attempts.artifact_id` is set null by FK).
- Data: `lead_artifacts(id, lead_id, studio_id, journey_step, kind, file_id, url, note, tool_ref JSONB, label, created_by, created_at)`; `journey_step` values = step ids + `closure`; `kind` = `file | link | note | tool` (inferred from usage; see U-4).
- Reachable: yes (Journey)

---

## Questionnaire / scope answers

### B-51 · Homeowner Questionnaire widget
- Where: drawer `:1642-1656`; `src/components/shared/homeowner-questionnaire.tsx`; `src/lib/queries/scope-answers.ts`; `GET/POST /api/leads/[id]/scope-answers`; `src/lib/scope-answers/server.ts`
- Entry: Lead Info tab, between Document Details and Custom Fields; only when page `tools/homeowner-portal` is enabled.
- Does: header `"Homeowner Questionnaire"` + `"{answered}/{total} answered"`, buttons `"Fill answers"` (edits the first unanswered) and `"Ask homeowner"` (B-52). Each question row: text (+ `*` when required), the current answer rendered read-only by type, a provenance pill `"Homeowner"` / `"Studio"`, an edit pencil and a history toggle. Editing one row at a time with `"Save"` / `"Cancel"`; save → `POST { answers:[{questionId,value}] }` with `source:"studio"`. History (`GET /scope-answers/history?questionId=`) lists prior values `"{value} by homeowner|by {name}|by studio · {relative}"`, `"No previous answers recorded."`, `"Loading history..."`, `"Could not load history."`.
- Rules: GET returns the studio's enabled `studio_scope_questions` (ordered `sort_order`) regardless of link; auto-mints the homeowner link for any lead with a phone (`lazyBindLeadToHomeowner`: find-or-create `homeowner_profiles` by (studio, phone) then find-or-create `homeowner_project_links role:"primary"` with a `portal_token`). Answers are keyed by `homeowner_id` (the same person across leads sees one set; newest per question wins). Upsert appends OLD then NEW rows to `homeowner_scope_response_history`. Question types: `text`, `yes_no`, `number`, `single_select`, `multi_select`, `date`.
- Data: `studio_scope_questions(id, studio_id, question, question_type, options, is_required, is_enabled, sort_order)`, `homeowner_scope_responses(homeowner_id, project_link_id, question_id, response JSONB, source homeowner|studio, answered_by_id, answered_at, updated_at)`, `homeowner_scope_response_history(project_link_id, question_id, response, source, answered_by_id, recorded_at)`, `homeowner_project_links.last_questionnaire_invite_at`.
- States: loading skeleton; error `"Could not load the questionnaire. Refresh to try again."`; no phone: `"Add a phone number to this lead to enable the questionnaire — the homeowner link is created automatically when the phone is saved."`; phone but bind failed: `"The lead has a phone number but we couldn't bind it to a homeowner profile."` + `"{code}: {detail}"` (codes `empty_phone`, `profile_select_failed`, `profile_insert_failed`, `link_select_failed`, `link_insert_failed`); no questions: `"No questions configured yet. Set them up in Accounts → HomeOwner Portal → Scope."`; POST without link → 409 `"No homeowner link for this lead — add a phone number first"`.
- Reachable: yes (page-enabled studios)

### B-52 · Ask the homeowner (send questionnaire invite)
- Where: drawer `:1644-1656` (`onSendInvite`); `src/components/shared/invite-to-answer-dialog.tsx`; `POST /api/leads/[id]/send-questionnaire`; `src/lib/scope-answers/invite.ts`
- Does: dialog `"Ask the homeowner"` — `"We'll notify {name} in their portal and they can answer your questions there."` (or `"There are no enabled questions yet. Configure them in Accounts → HomeOwner Portal → Scope before sending."`); read-only `Portal link` (`/my/{slug}/p/{portalToken}?action=answer-questions`) with `"Copy"`/`"Copied"`; `"Last sent: {relative}"` + `" — please wait a few minutes before sending again"` within 5 min; `"Send notification"` (disabled without questions / while sending / within throttle). Server: requires phone (409 `no_phone`: `"Lead has no phone — add one before sending."`), studio `portal_slug` (409 `"Studio has no portal slug configured yet"`), mints/looks up the link, 5-minute throttle on `last_questionnaire_invite_at` (returns `skipped:true`), stamps the throttle, dispatches `homeowner.questionnaire_requested` (variables `recipient_name, studio_name, question_count, action_url`), logs `questionnaire_invite_sent` with `metadata {entity, entity_id}`.
- Words: drawer toasts `"Sent — the homeowner will see it in their portal"` / `"Invite already sent recently — give it a few minutes before retrying"`; `"Could not send invite"`.
- Reachable: yes

---

## Activity log

### B-53 · Activity Log section
- Where: drawer `:2374-2378`; `src/components/leads/drawer-sections/activity-log-section.tsx`; `src/lib/transformers.ts:420-452`
- Entry: bottom of the Status & Activity tab; 3-dot `Activity Log` scrolls here.
- Does: newest first; shows 6 by default with `"View all ({n})"` / `"Show less"`; each row = action text, `" · {by}"` (performer name, `"Team Member"` when unresolved, `"System"` when `performed_by` null) and a relative date (`title` = full date). Empty: `"No activity yet"`.
- Rules: raw `action` strings are shown verbatim except `member_added:{id}` → `"Added {name}"`, `member_removed:{id}` → `"Removed {name}"`, `commission_split_changed:{id}:{bps}` → `"Updated {name} commission split to {pct}%"` (`"a team member"` when unresolved). Everything else — including machine-shaped keys — renders raw.
- Data: `lead_activity_log`.
- Reachable: yes

### B-54 · Activity-log write API and event vocabulary
- Where: `POST /api/leads/mutations/[id]/activity-log` (`{ action, by? } | { actions:[] }`; `by === "System"` → `performed_by = null`, else session user); plus server-side inserts in other routes.
- Does: complete list of action strings written by this slice: `"member_added:{memberId}"`, `"member_removed:{memberId}"`, `"commission_split_changed:{memberId}:{bps}"`, `"file_uploaded:{fileName}"`, `"contract_uploaded:{fileName}"`, `"Refund request submitted"`, `"Entity migrated to {companyId|studio default}"`, `"Lead archived"` / `"Lead archived (live signing link voided)"`, `"Lead revived from archive"`, `"hold_set:{date}"` / `"hold_set:{date} — {note}"`, `"lead_closed:{reasonLabel}"`, `"journey_step:{stepId}:{done|reopened}"`, `"questionnaire_invite_sent"` (with `metadata`), `"Stage moved to {status}"` (legacy status route), `"AI follow-up message sent to homeowner"` + `"Stage moved to Contacted"` (follow-up route), `"Lead created from Hangout meeting"` (hangout intake). Optimistic client-side entries (app-context, not persisted by the drawer's silent autosave): `"Bucket changed to {label}"`, `"Status changed to {label}"`. Outreach / evidence / e-sign entries **→ hand-off**.
- Rules: autosave is silent — status moves from the drawer do NOT create activity rows (the notification is the trail).
- Reachable: yes

---

## Return lead / refund

### B-55 · Eligibility and entry points
- Where: drawer `:1086` (`isQanvastLead`), menu `:2448-2456`, footer `:2650-2660`
- Does: both the 3-dot item and a full-width footer button `"Request Return & Refund"` appear only when `lead.source === "Qanvast"` (literal), draft bucket `CLOSED`, draft status ≠ `SIGNED`, no existing refund status, extras loaded.
- Rules: `getReturnEligibility` (7–30 days since `createdAt`: `"Return available after {n} days"` / `"{n} days left to return"` / `"Return period expired (30 days)"`) is exported by the dialog but NOT used by the drawer (dead helper).
- Reachable: yes

### B-56 · Return Lead wizard
- Where: `src/components/leads/return-lead-dialog.tsx`; reasons + tips `src/data/mock-credits.ts:261-312, 402-411`
- Does: dialog `"Return Lead — {name}"` with an info icon (`title="Return Lead Policy"`) opening `/Leads Return & Refund Guide (1).pdf`; two panels (form 60% / `"Tips to Improve Conversion"` 40%). **Step 1 `"Select a reason for return"`** (`"Choose the primary reason that best describes why you're returning this lead."`): radio list — `junk` `"Lead is junk/spam"` (`"The lead information appears to be fake, spam, or test data."`; fields attachments, comments), `duplicate` `"Duplicate lead"` (search, attachments), `existing-client` `"Lead already a client"` (project-reference, attachments), `refused-meet` `"Lead refused to meet up"` (sub-reasons: `Not responding after multiple attempts`, `Changed mind about renovation`, `Went with another studio/competitor`, `Budget constraints changed`, `Others`; date-time, attempts), `not-contactable` `"Lead not contactable"` (date-time, attempts), `wrong-info` `"Wrong contact info"` (wrong-field options `Phone number is invalid`, `Email is incorrect`, `Name does not match`, `Address is wrong`; attachments), `others` `"Others"` (comments required). **Step 2 `"Provide details"`** renders the reason's fields: `"Select specific reason(s):"` checkboxes; `"Last contact attempt:"` `Date` + `Time`; `Number of contact attempts` (number ≥1, `"e.g., 3"`); `Search for duplicate lead` (`"Search by name or phone..."` — free text, no lookup); `Existing project reference` (`"Enter project name or ID..."`); `"What's incorrect?"` select; `Attachments (optional)` (`"Upload files"`, names only — files are never uploaded); `Comments (required|optional)` (`"Provide additional details..."`). **Step 3 `"Confirm lead return"`** (`"This action cannot be undone. Our team will review your request within 30 days."`), summary (Lead / Reason / Details / Comments / Attachments count), checkbox `"By submitting, I agree to the Return Lead Policy and understand that this request will be reviewed by the Qanvast team."`, `"Confirm Return"` / `"Submitting…"`. Footer navigation `Cancel` / `Next` / `Back`.
- Rules: step 2 → 3 requires comments for `others` and ≥1 sub-reason for `refused-meet`; confirm requires the checkbox; double-submit guard. Tips list (8 lines, e.g. `"Respond to new leads within 30 minutes for the best conversion rates."`) and `"Need help?"` / `"Contact your BD representative for personalised lead conversion tips and training."` are static.
- Words: success `"Thanks! Your request has been received. We'll revert within 30 days."`; errors `"A return request for this lead already exists."` (duplicate/unique) / `"Couldn't submit the return request. Please try again."`.
- Reachable: yes

### B-57 · Refund request persistence
- Where: drawer `:3250-3278` (`onSubmit`); `src/lib/queries/leads.ts:847-915` (`useRequestRefund`); `POST /api/leads/mutations/[id]/refund-request`
- Does: drawer composes `notes` from comments + `"Last attempt: {date} {time}"`, `"Contact attempts: {n}"`, `"Incorrect field: {x}"`, `"Duplicate reference: {x}"`, `"Project reference: {x}"` (newline-joined), then `requestRefund(leadId, reasonLabel, subReasons, notes, reasonId)`. Server inserts `refund_requests { lead_id, studio_id, reason_id (only if a real uuid — slugs are dropped), reason_text (label), sub_reasons, notes, status:"pending", filed_by, filed_at }`; client then logs `"Refund request submitted"` and invalidates extras so the header badge shows `"Refund: Submitted for Review"`.
- Rules: attachments are not persisted. One request per lead (unique violation surfaces as "already exists").
- Data: `refund_requests`, `refund_reasons` (FK; unused by the catalog today). Review happens in Qanvast Ops (**→ hand-off**).
- Reachable: yes

---

## Quotes — touchpoints (internals belong to the Quotes audit)

### B-58 · Quote summary card (Journey "Deal" zone)
- Where: `src/components/leads/drawer-sections/quote-summary-card.tsx`; drawer `:2205-2225`
- Does: reads `useQuotesForLead` + latest signature request; shows the PRIMARY quote (`is_primary`, else first): `"Quote"` + status badge (`getQuoteStatusLabel`: draft `"Draft"`, submitted `"Awaiting Review"`, approved `"Approved"`, rejected `"Rejected"`, sent_for_signature `"Awaiting Signature"`, client_signed `"Client Signed"`), final total (`totalCents`, `"—"` when 0) with a tap breakdown (subtotal → discount → GST → final), `quoteNumber`, `"· {n} options"`. One contextual primary action: `"Go to Project"` (project exists) → `"Create project"` (won) → per status: draft `"Continue editing"`, submitted `"Review"` (approvers only, else chip `"Awaiting approval"`), approved `"Send for signature"`, rejected `"Revise quote"`, sent_for_signature `"Manage signing"`, client_signed `"View signed quote"`. Secondary `"Open"` (editable) / `"View"` (finalized → opens `/api/leads/{id}/quote/download?source=signed:{sigReqId}|draft:{quoteId}&view=1` in a new tab). Signing row (`"Signing"` `"Signed"`/`"Viewed"`/`"Awaiting signature"` `"· sent {date}"` `"Manage"`) when sent/signed; Contract row (`"On file"` / `"Signed quote"` / `"Not uploaded"`) when a contract exists or the quote is approved+; `"Manage quote{s (n)}"` expander reveals the full MultiQuoteSection (B-59).
- Data: `quotes(id, lead_id, label, is_primary, status, quote_number, total_cents, subtotal_cents, discount_cents, tax_cents, quote_type)`; `quote_signature_requests`.
- Reachable: yes (Journey)

### B-59 · Quotes section (Classic) / Manage quotes (Journey)
- Where: drawer `:1900-2045` (`quotesInner`); `multi-quote-section.tsx`; `quote-section.tsx`
- Does: top-right actions when line items exist or the quote is signed: `"Beat this quote"` → `/tools/quote-xray?leadId=` and `"Download quote"` (`DownloadPicker` over `GET /api/leads/{id}/quote/list` → 0 entries `"No downloadable files yet."`, 1 → direct download, 2+ → menu; entries `"Signed quote · {client} · {date}"`, `"Quote · {label|Primary|Alternate} · {n} line items"`, `"Draft quote · {n} line items"`; download via `GET /api/leads/{id}/quote/download?source=signed:|draft:|lead-draft:`). Zero quotes → legacy single-quote view with `"New Quote"` (creates `label:"Quote", isPrimary:true` then opens it) and `QuoteSection` state machine: none → `"Create Quote"`; `draft` → `"Draft"` `"Edit Quote"` `"Discard"`; `submitted` → `"Awaiting Approval"` `"View Quote"` `"Discard"` + `"Approve"`/`"Reject"` for approvers; `approved` → `"Quote Approved"` `"View Quote"` `"Revise"`; `sent_for_signature` → `"Awaiting Client Signature"` `"Resend Link"` `"Signing link sent — waiting for client to sign."` `"Manage →"`; `client_signed` → `"Client Signed"` `"View Quote"` + Signature Certificate (B-62); `rejected` → `"Quote Rejected"` `"Revise Quote"` + `"Rejection reason"`. ≥1 quote → `"Quotes ({n})"` list with `"Add Quote"` (next free `"Option A…Z"` label), per-row label (inline `Rename` with duplicate check `"A quote named "{x}" already exists"`), number, badge (`Draft`, `Awaiting Approval`, `Approved`, `Rejected`, `Sent for Signature` / `Pending` / `Viewed`, `Signed`; a quote stuck at sent_for_signature that is not in the latest live request shows `Approved`), total, type chip, inline signing link row with copy + `"Manage →"`, rejection reason, `"Edit"`/`"View"`, approved primary: `"Revise"` + `"Send for Signature"` (hidden when `dealWon`), kebab `Set as Primary` / `Rename` / `Clone` / `Delete` (only when >1; deleting the primary promotes another first). Variation-order quotes are filtered out.
- Rules: every open goes through the tool gate (B-05). Quote digitizer dialog props and save/submit/approve/reject/discard/revise orchestration live in the drawer `:2710-3245` and are **→ hand-off** to the Quotes audit; lead-level touchpoints: `leads.quote_status` is a mirror of the primary quote (triggers 158/304), promoted `none → draft` on the first save only; `leads.quote_data` holds legacy parsed-doc metadata / rejection comment; approve/reject route through `QuoteApproval` tasks (B-79) or direct quote writes for approvers; `"Discard"` hard-deletes the quote row (confirm `"Discard this quote?"` / `"This permanently deletes the quote and all its line items. This can't be undone."`; blocked when signed: `"This quote has already been signed by the client and can't be discarded."`); `"Revise"` confirm `"Reopen this quote for editing?"` … `"Reopen for editing"` → `POST /api/quotes/{id}/transition {action:"revise"}`; `"Resend Link"` confirm → `POST /api/quotes/resend-signature {leadId}` (404 → opens the Contract Flow).
- Words: toasts `"Quote created"`, `""{label}" created"`, `"Cloned "{a}" as "{b}""`, `""{label}" is now the primary quote"`, `""{label}" deleted"`, `"Renamed to "{x}""`, `"Quote approved"`, `"Quote rejected — submitter notified"`, `"Signing link resent to {name}"`, `"Quote reopened for editing"`, `"Quote discarded"`, `"This lead has no quote to reopen"`.
- Reachable: yes

### B-60 · Approve / Reject from the lead (approvers)
- Where: drawer `:1955-2000` (`onApprove`/`onReject`), `:3100-3200` (digitizer callbacks); `src/lib/access-control.ts:441-505` (`resolveQuoteSubmitDecision`); `POST /api/tasks/records/{id}/approve|reject`
- Does: finds the pending `QuoteApproval` task for the displayed quote (`relatedEntityId === quoteId`, legacy fallback: task without related id). Approve: `confirm("Approve {name}'s quote?\n\nThe quote becomes ready to send to the client for signature.")` → `approveTask` → task Completed/approved, `quotes.status = approved` + lead mirror (primary only), bakes the prepared-by signature. Reject: `prompt("Reason for rejection? (Sent to the submitter so they know what to fix)")` → task rejected, `quotes.status = rejected` + `rejection_comment`, lead mirror + `quote_data.rejectionComment`; app-context then creates a `General` task `"Revise rejected quote for {name}"` for the lead's assignee.
- Rules: `isApprover` = owner always, else in `workflow.approvers.quoteApproval`; when `quoteApprovalRequired === false` submissions land `approved` with no task.
- Reachable: yes

### B-61 · Quote line-item comments (touchpoint)
- Where: `src/app/api/leads/[id]/quote-line-items/[itemId]/comments/route.ts`
- Does: `POST { action: add|reply|edit|delete, text?, commentId?, replyId? }` on `quote_line_items.comments JSONB` via RPCs `append_quote_line_comment` / `append_quote_line_comment_reply`. Any studio member may add/reply; edit = author only (`"You can only edit your own comments."`); delete = author or owner (`"Only the author or a studio owner can delete this comment."`); 409 `"Cannot comment on an approved quote"` (per-quote status, legacy lead mirror fallback). Text capped at 4000 chars. UI lives in the digitizer (**→ hand-off**).
- Reachable: yes (from the digitizer)

### B-62 · Signature certificate (touchpoint)
- Where: `src/components/leads/drawer-sections/signature-certificate.tsx`; `GET /api/sign/certificate/{id}`
- Does: shown under a `client_signed` primary quote when `lead.signatureRequestId` exists: `"Signature Certificate"` / `"Digital signing evidence"`, signature image, `"Signed by"`, `"Date"` (in signer timezone), `"Verification"` `"Phone OTP verified"`, integrity line (`"Document integrity verified"` / `"Signed before integrity tracking was enabled"` / `"Document may have been modified after signing"`), `"Quote total"`, `"Signed under the {act}."` (SG: `Singapore Electronic Transactions Act (Cap 88)`, plus MY/AE/IN/EG/SA/KW/QA). Owner/admin only: `"Audit Trail"` (`"{n} events"`: `link_created` `"Signing link created"`, `link_opened` `"Link opened by client"`, `otp_requested` `"OTP verification requested"`, `otp_verified` `"Phone number verified via OTP"`, `signature_submitted` `"Signature submitted"`, with masked IP and parsed device, `"Signer IP:"`, `"Device:"`, `"Verified phone:"`).
- Data: `quote_signature_requests(signature_data, signed_at, document_hash, signing_hash, audit_trail, signer_ip, signer_user_agent, signer_phone, signer_timezone, quote_total)`; `leads.signature_request_id`.
- Reachable: yes

### B-63 · Issuing-entity tag on the Quotes section
- Where: drawer `:690-696, 2106-2110`
- Does: Classic `"Quotes"` section shows an `EntityTag` with the latest signature request's `company_id` name when the studio has ≥2 active `studio_companies`.
- Reachable: yes (multi-entity studios)

---

## Entity migration (issuing legal entity)

### B-64 · Validate + migrate the lead's issuing entity
- Where: `src/lib/queries/leads.ts:701-823` (`validateLeadEntityChange`, `useMigrateLeadEntity`); `GET /api/leads/mutations/[id]/validate-entity`; `POST /api/leads/mutations/[id]/migrate-entity`; `GET /api/projects/records/count-by-lead`
- Entry: the Quote Digitizer's entity picker (not a drawer control) — touchpoint.
- Does: validation reads the current `leads.company_id`, counts non-archived projects on the lead, quotes and signature requests. Same entity → ok. Any project → hard block `conflict:"projects"`. Any quote/signature request → soft block `conflict:"quotes"` (UI asks to migrate all). Migrate: `POST { nextCompanyId|null, performedBy }` → verifies the company belongs to the studio (400 `"Unknown legal entity for this studio"`), writes `leads.company_id`, logs `"Entity migrated to {id|studio default}"`; then `POST /api/quotes/signature-requests { op:"migrate-company" }`. `PATCH /mutations/[id]` also accepts `company_id` with the same ownership check.
- Data: `leads.company_id` (migration 154), `studio_companies`, `quote_signature_requests.company_id`.
- Reachable: yes (via the digitizer)

---

## Close / archive

### B-65 · Archive lead (with blocker confirm)
- Where: drawer `:3410-3470` (two confirms); `src/lib/queries/leads.ts:528-568`; `POST /api/leads/mutations/[id]/archive`; `src/lib/lifecycle/transitions.ts`
- Entry: 3-dot `Archive`.
- Does: confirm `"Archive Lead"` / `"Are you sure you want to archive this lead? It will be removed from the leads view. You can revive it anytime from the Archived Leads section (⋮ menu)."` / `"Archive"`. Server: permission gate `leads.delete` (`resolveCanPerformAction` on the member's highest role slug owner>admin>accounting>id; 403 `"You don't have permission to archive leads."`); blockers unless `force`: live signature requests (`pending|viewed`, not expired) → 409 `{ blockers:[{code:"LIVE_SIGNATURE_REQUEST", label, count}] }`; the drawer then shows a second confirm `"Archive anyway?"` / `"{labels} Archiving now leaves the client with a link that no longer works."` / `"Archive anyway"` and re-POSTs `force:true`. On success: `leads.archived_at = now`, cascade cancels open tasks (`NotStarted|InProgress` → `Cancelled`) and deletes their queued `task.due_reminder` rows plus the lead's own scheduled rows (follow-up reminder, hold ping), logs `"Lead archived"` or `"Lead archived (live signing link voided)"`; drawer closes with toast `"{name}" archived`.
- Rules: archive = soft delete; no purge job exists; blocker labels: `"A signing link is still live with the client. Cancel it first, or archive anyway to void it."` / `"{n} signing links are still live with clients. Cancel them first, or archive anyway to void them."`.
- Data: `leads.archived_at`, `tasks.status`, scheduled notifications.
- Words: `"Failed to archive lead"`.
- Reachable: yes

### B-66 · Revive (unarchive)
- Where: `POST /api/leads/mutations/[id]/unarchive`; `src/components/accounts/archived-leads-section.tsx`
- Entry: Accounts → Archived Leads `"Revive"` (outside the drawer; listed here because the route is in scope).
- Does: same `leads.delete` gate (403 `"You don't have permission to revive leads."`); sets `archived_at = null`; logs `"Lead revived from archive"`; cancelled tasks are NOT resurrected. Section copy: `"Leads that have been archived. They stay here until you revive them."`, `"Archived leads are hidden from the board and reports. Use the Revive button to restore a lead to its original status."`, `"archived {n} days ago"`, toast `"{name}" revived and restored to leads`.
- Reachable: yes

### B-67 · Close (Journey) — see B-46; Classic closing = status move to CLOSED (B-37) with the undo toast (B-18) and task cancellation (B-17).

---

## Homeowner links / engagement

### B-68 · Engagement state API — `POST /api/leads/mutations/[id]/engagement`
- Where: `src/app/api/leads/mutations/[id]/engagement/route.ts`; `src/lib/queries/lead-journey.ts:350-375`
- Does: `kind:"state", state` (values `active | awaiting_client | stalled | on_hold`) → `computeResumePatch` (leaving `on_hold` restores the stash); `kind:"hold", restartDate, note?` → `computeHoldPatch`. Both notify `lead.status_changed`, both manager-scope guarded, both tolerate a missing `hold_prev_state` column. The engagement pill + "Suggest" chip were removed from the drawer; only Resume (B-45) and Hold (B-44) call this.
- Data: `leads.engagement_state`, `hold_restart_date`, `hold_prev_state JSONB`, bucket/status/follow-up columns.
- Reachable: yes (Journey)

### B-69 · Promote lead link to project — `PATCH /api/homeowner-links/promote-lead-link`
- Where: `src/app/api/homeowner-links/promote-lead-link/route.ts`
- Does: `{ leadId, projectId }` → sets `project_id` on the lead's `homeowner_project_links` row where `role='primary' AND project_id IS NULL` (silent no-op when none). Called by the project-creation / VO flows so the homeowner portal shows the project without a second link. Touchpoint.
- Reachable: yes (from project creation)

---

## Projects — touchpoints

### B-70 · Conversion readiness panel (Classic footer)
- Where: drawer `:2500-2575`; `src/components/leads/conversion-readiness-card.tsx`
- Entry: Classic only, while `lead.subStatusCode !== "PROJECT_STARTED"` and not all prerequisites met.
- Does: collapsed bar with dot indicators and `"Ready to create project"` / `"{done} of {total} ready to create project"`; expands to a checklist: `"Designer assigned"` (`"Assign"` → scrolls to Assignment), `"Quote approved"` (`"Create quote"` → digitizer), `"Contract uploaded"` (`"Upload now"` → Contract Flow), `"Project type selected"` (`"Select type"` → scrolls to the picker); each with a detail when complete (assignee names, quote total, file name, type); `"Convert to Project"` button (disabled until all complete).
- Rules: items appear only for gates whose workflow toggle is not `false` (`requireAssignment`, `quoteApprovalRequired`, `contractRequired`, `projectTypeRequired`). Quote total = canonical final (`quotes.total_cents`, else recomputed incl. GST/discount, excluding optional works when configured out).
- Reachable: yes (Classic)

### B-71 · Create Project button + drawer
- Where: drawer `:2486-2500` (`allPrereqsMet`, `showCreateProjectButton`), `:2640-2648`, `:3355-3405`; `src/components/projects/project-create-drawer.tsx` (**→ hand-off** projects)
- Does: green `"Create Project"` in the footer when every enabled gate passes (assignees ≥1; quote status ∈ approved/sent_for_signature/client_signed; contract flag; project type — or Journey mode), the drawer is not dirty, no `PROJECT_STARTED` sub-status and no linked project. Opens `ProjectCreateDrawer` prefilled with lead data (id, name, phone, email, type, area, areaSqft, stylePreference, budget, assignees + splits, notes, projectType, contractFileName, quote line items, quoteStatus, docDiscount, gstEnabled, contract payment schedule = signed quote's → primary's → active's → legacy `quote_data.paymentSchedule`). On created: `updateLead(resolveProjectCreatedLeadPatch(funnel))` = funnel's SIGNED target + sub-status `PROJECT_STARTED` (skipped when the funnel has no SIGNED status), drawer closes, `router.push(/projects/{id})` with toast `"Project created"` / `"Opening your new project…"`.
- Reachable: yes

### B-72 · Project ↔ lead link routes (touchpoints)
- Where: `PATCH /api/projects/records/[id]/lead-link` (`{ leadId }` → `projects.lead_id`); `GET /api/projects/records/count-by-lead?leadId=` (non-archived count, used by B-64).
- Reachable: yes (from project/VO flows)

---

## Contracts & signing — touchpoints

### B-73 · Contract Flow dialog (from the lead)
- Where: drawer `:3330-3352`; `src/components/leads/contract-flow-dialog.tsx` (1,952 lines — states only)
- Entry: contract block buttons (B-40), `"Send for Signature"` / `"Manage →"` / `"Manage signing"` / readiness `"Upload now"` / journey contract & signed tools.
- Does: props from the lead: `leadId, leadName, leadPhone, quoteId = activeQuoteId, countryCode, quoteStatus`. States (`dialogState`): `loading`, `not-approved` (`"Create a quote before sending"`-type gate on real quote rows), `approved-choose-path` (digital form: recipient name + dial code + phone, entity picker for multi-entity studios, documents-to-include picker with the pinned `"Quotation"` row `accept_label "I have read and agree to this quotation"`; or paper paths), `digital-in-flight` (link, copy, WhatsApp, resend, regenerate, cancel), `digitally-signed`, `upload-paper` (PDF/Word only: `"Please upload a PDF or Word document"`), `compose-paper` (template editor, `"Contract PDF downloaded — share it with your client however you like."`, `"Contract sent to {recipient}"`), `paper-signed`. Lead-level callbacks: `onContractUploaded(fileName)` → drawer sets `contractUploaded=true` + file name (autosaves `leads.contract_uploaded/contract_file_name`), clears the `contract` error, toast `"Contract uploaded successfully"`; `onSignatureRequestCreated` → `quotes.status = sent_for_signature` for the active quote (+ lead mirror when primary), toast `"Signing link created — share it with your client"`, then `shareQuotePdfForSigning` (canva-off studios only: browser-renders the legacy PDF to the portal); `onSignatureLinkRegenerated` → same PDF re-share. Uploaded paper contracts go through `useUploadLeadFile` (so they appear in Files with a `contract_uploaded:` activity row).
- Rules: multi-quote bundle/variations signing is behind `MULTI_QUOTE_SIGNING_ENABLED = false`. Signing page, OTP, token, PDF SSOT **→ hand-off** to the contracts/signing audit.
- Data: `quote_signature_requests`, `leads.contract_uploaded`, `leads.contract_file_name`, `leads.signature_request_id`.
- Words: `"Please enter the client name"`, `"Add the client's phone number to send for signature"`, `"New signing link generated — old link is no longer valid."`, `"Signing cancelled — the quote is back to Approved."`.
- Reachable: yes

### B-74 · Signing document picker (touchpoint)
- Where: `src/components/leads/signing/signing-document-picker.tsx`, `signing-doc-row.tsx`
- Does: ordered, drag-to-reorder list of documents the client must scroll/accept; the quote row is pinned (`"· signed"`, badges `review` / `scroll` / `accept`); add from library, upload PDF (5 MB cap), or compose rich text (optional "save to library"). Server recomputes hashes at link generation.
- Reachable: yes (inside B-73)

---

## Tasks — touchpoints

### B-75 · QuoteApproval task lifecycle from the lead
- Where: drawer `:2980-3060` (submit), `:3100-3200` (approve/reject), `:3385-3400` (discard cancels); `src/context/app-context.tsx:304-560, 1140-1150`; `src/lib/queries/tasks.ts:50, 197-260`
- Does: submit for review (non-approver) creates task `type:"QuoteApproval"`, title `"Approve {quote label|number|"Quote"} for {lead} — submitted by {member}"`, `assigneeUserId` = first configured approver → any owner → submitter, `plannedDate` today, `approvalStatus:"pending"`, `relatedEntityId = quoteId`; before that, `POST /api/tasks/records/cancel-quote-approvals { leadId, quoteId }` cancels pending duplicates and any open `"Revise rejected quote…"` tasks are cancelled. Task insert failure rolls the quote status back (`"Couldn't create the approval task — submission was rolled back. Please try again."`). Discarding a submitted quote cancels its pending QuoteApproval tasks. `addTask` is gated: `QuoteApproval` skipped when `quoteApprovalRequired === false`.
- Reachable: yes

### B-76 · Cancel tasks by lead — `POST /api/tasks/records/cancel-by-lead`
- Does: `{ leadId }` → `cascadeTaskCleanup` (cancels `NotStarted|InProgress` tasks on the lead + deletes their queued reminders). Called by close (B-46). Also used by archive (server-side).
- Reachable: yes

### B-77 · Follow-up task (B-38) and open-task reassignment / cancellation on close (B-17) — see those rows.

---

## Copilot — touchpoints

### B-78 · Start Live Meeting (consent → launcher)
- Where: drawer `:3407-3420, 3612-3622`; `src/components/copilot/consent-dialog.tsx`; `CopilotSessionLauncher`
- Does: `"Recording Reminder"` dialog: `"Before starting the AI co-pilot with {name}, please ensure the customer has been informed about the AI assistant."`, disclosure box (`"I will be using an AI assistant during our meeting to help provide you with the best recommendations. The assistant will listen to our conversation to generate helpful suggestions for me. Your privacy is important — the recording is only used during the session and is not shared with third parties."`), checkbox `"I have informed the customer about the AI assistant"`, `"Start Meeting"` → launcher with `leadId`, `customerName`, `disclosureText`, `countryCode`. Gated on `tools/copilot-analytics`.
- Reachable: yes

### B-79 · Save brief to lead — `POST /api/copilot/brief/[briefId]/save-to-lead`
- Where: `src/app/api/copilot/brief/[briefId]/save-to-lead/route.ts`
- Does: body `{ fields:{budget,propertyType,area,propertyAddress,stylePreference,additionalNotes}, createFollowUpTask, advanceJourney }` (all default true). Writes to the lead from the brief's `customer_profile`: `property_type`, `area`, `additional_info` (← propertyAddress), `budget` (max of range / number / parsed string), `style_preference` (joined list). Creates a `LeadFollowUp` task `"Follow-up: {suggestedActions[0]}"` two days out at 10:00 for the session user unless an open one exists; `applyJourneyFloor(... "outreach")`; stamps `meeting_briefs.saved_to_lead = true`. 400 `"This meeting was not tied to a lead, so there's nothing to save back."`. Entry is the copilot brief hub (**→ hand-off**).
- Reachable: yes (from copilot)

---

## Hangouts — touchpoint

### B-80 · Create lead from a hangout meeting — `/api/hangouts/admin/lead`
- Where: `src/app/api/hangouts/admin/lead/route.ts` (platform admin only, service role)
- Does: `GET ?meetingId=` prefills name/phone/budget (from `preferences.budgetRange` midpoint ×1000)/property type/status/area/design style/key collection/notes (`"Scope: …"`, `"Meeting notes: …"`, `"Source: Hangout meeting (Match score: …)"`). `POST { meetingId, form, triggeredBy }` inserts the lead (`source:"hangout"`, property type mapped HDB/BTO/Condo/Penthouse/Landed/Commercial → keys, funnel intake target, duplicate detection flags), links the meeting, assigns the participating ID (`lead_assignees` 10000 bps + `stampFirstAssigned`), logs `"Lead created from Hangout meeting"`, tracks `lead_created`. The resulting lead opens in the normal drawer.
- Reachable: yes (admin)

---

## Permissions and roles

### B-81 · Role helpers used by the drawer
- Where: `src/lib/access-control.ts:1-60`
- Does: tags `owner`, `admin`, `id`, `accounting`, `manager`. `isIdOnly` = id without admin/owner; `isListedAsId` = has `id` (assignable); `isManager` = has `manager`. `resolveCanPerformAction(rolePermissions, tags, entity, action)`: explicit role JSON wins, missing key falls back to tags (owner all; admin all but team/settings edits; accounting finance only; id restricted).
- Reachable: —

### B-82 · Per-role behaviour inside the drawer (summary)
- ID-only: cannot move backward in buckets, cannot select Unassigned (B-37); can still remove all assignee chips (B-34); sees only assigned leads on the board (`filterLeadsForViewer`) but the drawer itself has no read guard beyond that; can add line-item comments (B-61); cannot approve quotes unless listed as approver (B-60); Signature Certificate audit trail hidden (B-62).
- Owner: always a quote approver; can delete anyone's line-item comment; sees audit trail.
- Admin: sees audit trail; approver only if listed.
- Archive/revive: `leads.delete` permission from Roles & Permissions (B-65, B-66).
- Assignment lock / manager scope: B-93.
- Reachable: —

---

## Feature flags / region gating

### B-83 · Studio feature flags read by the drawer
- Where: `src/lib/queries/studio-config.ts:640-700` (`useStudioFeatures`, defaults)
- Does: `leadJourneyMode` (default **true**) → Journey vs Classic; `leadManagerHierarchy` (default false, Dyel) → B-93; `canvaEditor` (default true) → skips the browser PDF share on signing (B-73); others (`lockQuoteActionsUntilApproved`, `casetrustSigningStep`, `duplicateDetectionEnabled`, `feeFirstMilestones`, `priceBookSubcategoryInQuote`) are not read by the drawer.
- Data: `studios.settings.features`.

### B-84 · Workflow toggles read by the drawer
- Where: `useWorkflowToggles` (`/api/studio-config/workflow`) + per-member `workflow_overrides` via `resolveEffectiveWorkflow`
- Does: `requireAssignment`, `quoteApprovalRequired`, `contractRequired`, `projectTypeRequired` (validation + readiness), `autoCreateFollowUps` (B-38), `approvers.quoteApproval` (B-60). Defaults to "required" when unloaded.
- Data: `studios.settings.workflow`, `studio_members.workflow_overrides`.

### B-85 · Platform page gates
- `tools/quote-digitizer`, `tools/copilot-analytics`, `tools/ai-visualizer`, `tools/floor-plan`, `tools/homeowner-portal` (B-05, B-51).

### B-86 · Region gating
- Where: `src/lib/region-config.ts`; drawer passes `lead.countryCode` to sections
- Does: property types, property statuses, design styles, key-collection timeline, phone dial code/digit rules/placeholder, currency symbol, legal act for the certificate, timezone for signed dates all resolve from the LEAD's `countryCode` (fallback studio country, then SG). Country chip in the header only for multi-country studios. Phone dropdown shows only the studio's country unless `supportedCountryCodes` is passed (the drawer passes `studioCountryCode`).
- Data: `leads.country_code` (migration 095a; DB trigger defaults to the studio's).

### B-87 · Manager hierarchy (Dyel-only, `leadManagerHierarchy`)
- Where: drawer `:530-535` (`managerReassignLocked`); `src/lib/leads/manager-hierarchy.ts`; `manager-scope-guard.ts`; assignee/PATCH/records routes
- Does: a plain designer (`id`, not manager/admin/owner) sees the Assignment section read-only (`"Your manager assigns leads to you."`); server refuses reassignment with 403 `{ error:"Your role can't reassign this lead.", code:"ASSIGNMENT_LOCKED" }` on both the assignee route and `assigned_to` via PATCH. A locked manager (has `manager`, not owner/admin) may only read/mutate leads they own (`owning_manager_id`), are the scalar assignee of, or are on the junction of — `GET /api/leads/records/[id]` answers 404 outside scope; engagement/close/follow-up/journey-step answer 403 `{ error:"This lead is outside your assigned scope.", code:"LEAD_OUT_OF_SCOPE" }`. `owning_manager_id` is stamped/cleared on assignment writes (owner/admin route to a manager candidate; manager self-assign stamps self; owner/admin emptying the list clears).
- Data: `leads.owning_manager_id`, `studios.settings.features.lead_manager_hierarchy`.
- Reachable: flag-gated

---

## Other

### B-88 · Feature-discovery / documentation mismatches worth knowing
- `docs/rules/leads.md` still describes a "Message" footer button to `/inbox`, a "Save Changes" button, an engagement pill and a Quick Convert dialog — all removed; the WhatsApp header icon, autosave, and `ProjectCreateDrawer` replaced them (drawer comments `:790, 2280, 2404`).
- The `leadCategory` taxonomy configured in Accounts is not consumed anywhere in the drawer.

### B-89 · Lead row fields consumed by the drawer (data map)
- `leads`: id, name, phone, email, source, budget, property_type, area, notes, additional_info, property_status, style_preference, area_sqft, area_unit, key_collection_date, property_address, ic_number, customer_id, quote_valid_until, bucket, lead_status_code, sub_status_code, next_follow_up_date, next_follow_up_time, project_type, contract_uploaded, contract_file_name, quote_status, quote_data, quote_metadata, signature_request_id, assigned_to, owning_manager_id, temp, temp_reason, needs_attention, possibly_duplicate, duplicate_of_lead_id, engagement_state, hold_restart_date, hold_prev_state, closed_reason_code, closed_reason_detail, journey_overrides, first_assigned_at, first_outreach_at, first_outreach_by, signed_at, archived_at, country_code, company_id, created_at, status (legacy).
- Child tables: `lead_assignees`, `lead_activity_log`, `lead_files`, `lead_artifacts`, `lead_custom_field_values`, `lead_outreach_attempts` (**→ hand-off**), `refund_requests`, `quotes`, `quote_line_items`, `quote_signature_requests`, `tasks`, `projects`, `meeting_briefs`, `homeowner_project_links`, `homeowner_profiles`, `homeowner_scope_responses` (+history), `studio_scope_questions`.

### B-90 · Notifications emitted from this slice
- `lead.assigned` (server, only for genuinely-new assignees, recipients = the assignees; variables lead_name, assignee_name, assignees_list, assigned_by, lead_phone, lead_email, source, budget, property_type, area, bucket, status_label, action_url), `lead.status_changed` (owner+admin+assignees, on any real bucket/status/sub-status change from PATCH / close / hold / resume / unassign downgrade), `lead.followup_reminder` (scheduled T−30 min, in_app+email+whatsapp), `lead.hold_restart` (scheduled 09:00 on restart date, in_app), `homeowner.questionnaire_requested` (to the homeowner), `quote.signature_requested` (resend route, **→ hand-off**).

---

## Uncertain / not verified

- U-1 · `ActivityLogSection` is called with entries in ascending order and reverses them; I did not run the app to confirm the visible ordering or the exact relative-date format (`formatRelativeTime` not read).
- U-2 · Footer `Cancel` (B-21) does not reset `documentInfo`; whether a typed-but-unsaved IC value survives a Cancel is inferred from the code, not observed.
- U-3 · Required marks on First Name / Phone / Lead Source / Property Type / Area in edit mode are visual only in the drawer: `validationErrors` never receives those keys, and `changedFields` falls back to the persisted value when a name/phone/area/budget is cleared (`p.name = draftFullName || lead.name`, `p.budget = parseInt(...) || lead.budget || 0`). Inferred from `:1080-1125`; not exercised.
- U-4 · `lead_artifacts.kind` values `file | link | note | tool` are inferred from the drawer's `nativeToolForStep` comment and the route shape; the enum/CHECK constraint was not read (journey reader's territory).
- U-5 · The `refund_reasons` table and the Qanvast Ops review of `refund_requests` were not read; only the insert shape is verified.
- U-6 · `/Leads Return & Refund Guide (1).pdf` is opened from `public/`; its existence was not checked.
- U-7 · Whether `useApp().tasks` (used to find pending QuoteApproval tasks) is filtered for ID-only users to their own tasks (`filteredTasks` at app-context `:1156`) means an ID who is an approver may not see a task assigned to someone else — behaviour inferred, not tested.
- U-8 · The Contract Flow dialog was read only for its state names, props and lead-level callbacks (lines 1-330 + grep); its internal copy beyond the quoted toasts was not inventoried (belongs to the contracts audit).
- U-9 · `useQuoteLineItems` route (`/api/quotes/line-items`) and its "orphan fallback" semantics are described from drawer comments, not from the route.
- U-10 · Region option lists were verified for SG in full and for MY/AE/IN from grep lines 277-279, 353-355, 438-440 (property statuses + possession timeline only); their design-style lists were not read.
