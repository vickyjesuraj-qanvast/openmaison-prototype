# OpenMaison 1.0 — Leads module inventory · Slice A: Listing, lead creation, imports & ingestion, bulk actions, reports

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only). All paths below are relative to that repo unless absolute. Line numbers are from the files as read on 2026-09-24.

Conventions: *Words* are quoted verbatim from code. "Hand-off" = the behaviour is owned by another reader (lead detail drawer / journey & stage engine / settings pages) and is only named here.

Vocabulary that recurs everywhere (from `src/data/lead-bucket-config.ts` `DEFAULT_FUNNEL_CONFIG`; studios may customise via Accounts → Lead Funnel, stored in `studio_lead_funnel.config`):

| Bucket id | Label | Statuses (id → label) | Flags |
|---|---|---|---|
| `NEW` | New | `UNASSIGNED` → Unassigned; `ASSIGNED` → Assigned | — |
| `ONGOING` | Ongoing | `FOLLOW_UP` → Follow-Up (subs: First contact pending / Awaiting reply / Site visit scheduled); `CONTACTED` → Contacted (Awaiting response / Callback scheduled); `QUOTE_CREATED` → Quote Created (Quote sent / Quote revised); `MET` → Met (Proposal discussed / Pending decision) | bucket `requiresAssignment`; FOLLOW_UP + CONTACTED `followUpRequired`; QUOTE_CREATED `requiresApprovedQuote` |
| `ON_HOLD` | On Hold | `HOLD_1M` → Less than a Month; `HOLD_1_3M` → 1 - 3 Months; `HOLD_3_6M` → 3 - 6 Months; `HOLD_6_9M` → 6 - 9 Months; `HOLD_9M_PLUS` → More than 9 Months (subs on each: Client not ready / Budget review / Scope change) | all `followUpRequired` |
| `CLOSED` | Closed | `SIGNED` → Signed (Contract signed / Deposit received / Project started / Handover in progress / Completed handover); `INACTIVE` → Inactive (Budget constraints / Went with competitor / Unresponsive / Not a fit) | SIGNED `requiresApprovedQuote` + `requiresContract` + `requiresProjectType` |

Deprecated status `PROJECT_CREATED` is mapped to `SIGNED` (`DEPRECATED_STATUS_MAP`) and filtered out of every bucket's status list on the board. `PROJECT_TYPES` = "Renovation-Full Home", "New-Full Home", "Renovation-Partial", "New-Partial", "Commercial", "Others".

---

## Listing

### A-01 · Leads page shell, data source, loading + cold-load error
- Where: `src/app/(main)/leads/page.tsx:127-877` (component `LeadsPage`), data via `useApp()` → `src/context/app-context.tsx:100` → `useLeads` (`src/lib/queries/leads.ts:43-84`) → `GET /api/leads/records` (`src/app/api/leads/records/route.ts`).
- Entry: nav item `leads` (route access tags owner/admin/id — `src/lib/access-control.ts:65`); URL `/leads`.
- Does: Renders title "Leads" with a subtitle of counts, the action bar (search, view toggle, Filter & Sort, ⋮ menu, Assign N, Add Lead), the pending-review section, the journey intro banner, and either the kanban, the list table, the Performance view (desktop) or the card list (mobile). While `isLoading` (leads OR projects OR escalations OR chats OR studio members still loading — `app-context.tsx:152`) a skeleton renders (4 kanban columns × 3 cards on desktop, 4 cards on mobile). If the leads query errored AND nothing is cached (`isError && leads.length === 0`) an error empty state with a Retry button re-runs the query; a background refetch error with leads already on screen is deliberately NOT surfaced.
- Rules: The list API pages through PostgREST in 1000-row pages (`LEADS_PAGE = 1000`) so studios > 1000 leads are not truncated; embeds `lead_assignees(... studio_members(profiles(full_name)))` and a 1-row `lead_outreach_attempts(id)` probe (`.limit(1, { referencedTable })`) so the board knows "any outreach logged?"; orders by `created_at desc`; excludes `archived_at IS NOT NULL` unless `?includeArchived=1`; activity log + refund are NOT fetched (lazy per lead via `/api/leads/records/[id]/extras`). `useLeads` sets `refetchOnWindowFocus: "always"` so returning to the tab always refetches (signing / webhook / cron changes happen outside the browser).
- Data: reads `leads` (all columns), `lead_assignees`, `lead_outreach_attempts`, `studio_members` + `profiles.full_name` (single-assignee name fallback), `studios.settings` (manager-hierarchy flag). Response `{ leads: Lead[] }` transformed by `transformLead` (`src/lib/transformers.ts:266-409`).
- States: loading skeleton; error "Couldn't load leads"; empty states per view (A-33); `isDesktop === null` until mounted → neither responsive tree mounts (`useIsLgViewport`, `src/lib/hooks/use-is-lg-viewport.ts`, lg = min-width 1024px).
- Words: "Leads"; subtitle `"{n} of {m}"` when any result-narrowing filter is on, else `"{n} total"`; `"{k} hot"` (count of ALL loaded leads with `temp === "hot"`, not the filtered set); `"{p} pending review"` (only when > 0). Error: "Couldn't load leads" / "Something went wrong fetching your pipeline. Check your connection and try again." / "Retry".
- Reachable: yes.

### A-02 · View toggle: Kanban / List / Performance
- Where: `page.tsx:203, 1017-1046, 2092-2179`.
- Entry: three icon buttons in the header (hidden below `md`, i.e. desktop/tablet only).
- Does: `view` state `"kanban" | "list" | "performance"`, default `"kanban"`, not persisted. Kanban renders bucket columns (A-03); List renders `LeadListTable` (A-07); Performance renders `LeadPerformanceView` (A-79). Below `lg` the card list always renders regardless of `view` (A-85).
- Rules: Performance button only when `canSeePerformance = isOwner(tags) || isAdmin(tags)` (tag-based, not role-permission-based); if the state is `performance` but the user is not owner/admin the kanban renders.
- Data: none.
- States: n/a.
- Words: button titles "Kanban view", "List view", "Performance view (owner/admin)".
- Reachable: yes.

### A-03 · Kanban board (bucket columns, counts, orphan bucket, per-column empty state)
- Where: `page.tsx:173-189` (`activeBuckets`, `getLeadBucket`), `668-700` (`leadsByBucket`, `bucketsWithOrphans`), `1355-1466` (sticky header row), `2096-2163` (columns); `src/components/leads/lead-kanban-column.tsx`; `src/components/leads/lead-kanban-card.tsx`.
- Entry: default view on desktop.
- Does: Columns = the studio funnel's buckets in `order` (`funnelConfigToLegacyBuckets`), each status list minus `PROJECT_CREATED`. Each lead is placed by `getLeadBucket(lead, funnelConfig)`; a lead whose `bucket` no longer exists in the funnel goes into a virtual bucket `_UNCATEGORIZED` labelled "Uncategorized", appended after the real buckets only when at least one orphan exists. Sticky header per column shows dot, label, count badge, collapse button and the per-bucket status filter (A-05). Column bodies are virtualised (`@tanstack/react-virtual`, estimate 168px/card, overscan 6, against the layout `<main>` scroll element). Horizontal scroll of the cards row is mirrored to the header row.
- Rules: Counts shown per column are AFTER search/filters/quick filters/date window AND after that bucket's own status filter (`getFilteredForBucket`). Entrance animation plays only on a column's first paint (`entranceDelayMs(index)`, 50 ms step, capped at index 8).
- Data: derived from the loaded `Lead[]` + `FunnelConfig` (`GET /api/studio-config/funnel`, `useFunnelConfig`).
- States: a column with 0 items shows "No leads yet" when no filter is active, else "No matches here" + a "Clear filters" link (runs `clearAllListFilters`, A-31).
- Words: "Uncategorized"; "No leads yet"; "No matches here"; "Clear filters".
- Reachable: yes.

### A-04 · Bucket collapse / expand (auto rule + persisted override + Expand all)
- Where: `page.tsx:467-497, 887-904, 1363-1384, 2108-2131`.
- Entry: collapse icon in a column header; the collapsed column's chip; "Expand all" chip.
- Does: A bucket is collapsed when the user has an explicit override (`bucketOverride[bucket.id] === false`) OR, with no override, when it has 0 visible leads AND no active status filter. Collapsed column renders a narrow tinted strip (header: an expand icon; body: dot, vertical label, count, expand icon) pinned with `sticky` under the page header. Clicking sets the override to expanded; the header's collapse button sets it to collapsed. When EVERY bucket is collapsed an "Expand all" button appears which sets every override to expanded.
- Rules: Overrides persist per studio in `localStorage["leads.bucketOverride.<studioId>"]` (JSON map), loaded client-side after mount. An explicit override wins over the auto rule in both directions (a populated bucket can stay collapsed; an empty one can stay expanded).
- Data: localStorage only.
- States: n/a.
- Words: aria/title `"Expand {label} bucket ({n} leads)"`, `"Expand {label} · {n} leads"`, `"Collapse {label} bucket"`, `"Collapse {label}"`, "Expand all", "Expand all buckets".
- Reachable: yes (desktop kanban only).

### A-05 · Per-bucket status filter (multi-select)
- Where: `page.tsx:447-448, 604-617, 879-885, 906-920, 1404-1449, 2031-2033`.
- Entry: "Filter by status" button under each expanded column header (kanban only); chips in the filter row; mobile applies the selected tab's status filter.
- Does: Popover listing that bucket's statuses with checkboxes; toggling adds/removes the status code in `statusFilters[bucketId]` (a `Set`). "Clear filter" empties that bucket's set. Applies to: the kanban column (`getFilteredForBucket`), the list view and header counts (`statusFiltered`), the CSV export, the filter-driven bulk assign set, and the mobile card list when a specific bucket tab is selected.
- Rules: Empty set = all statuses. Each bucket with ≥1 selected status counts as one active filter in the badge (A-32). The status codes compared are the lead's resolved `statusCode` (after the NEW/ASSIGNED drift guard, A-20).
- Data: none persisted.
- States: button reads "Filter by status" when none, `"{n} status"` / `"{n} statuses"` when some.
- Words: "Filter by status"; "1 status"; "N statuses"; "Clear filter".
- Reachable: yes.

### A-06 · Lead card (kanban) — what it shows
- Where: `src/components/leads/lead-kanban-card.tsx` (also mirrored by the mobile card, A-85).
- Entry: kanban column.
- Does: Row 1: avatar with first character of `lead.name` on a deterministic gradient (`getAvatarColor` hashes the name into 5 classes), name, `lead.date` (relative time from `formatRelativeTime`: "Just now", "{m}m ago", "{h}h ago", "{d}d ago", "{w}w ago", "{mo}mo ago"). Row 2: `StatusBadge` with the resolved status LABEL, `LeadHoldBadge` (A-10), "Attention" pill when `needsAttention`, "Duplicate" pill when `possiblyDuplicate`, budget as `{currencySymbol}{(budget/1000).toFixed(0)}k` (so a 0 budget renders "S$0k" on cards; the review queue uses `formatBudgetShort` which renders "—"). Row 3: `lead.area || "—"`, `SourceChip` (A-71). Row 4: assignee avatar stack (first 3 initials, then "+N"), first assignee's name + `" +{n-1}"` if several, or "Unassigned"; `subStatusLabel`; `FollowUpBadge` (A-09). Then, in journey mode, `LeadJourneyMiniRail` (A-14). Then a "Commission Pending" badge (A-12). Clicking the card opens the drawer.
- Rules: Assignees come from `lead.assignees` (junction) else fall back to the scalar `assignedTo/assignedToName`. Currency symbol from `getRegionConfig(lead.countryCode || session country)`. `TempBadge` (hot/warm/cold) and the AI fit pill are deliberately commented out ("Re-enable TempBadge after lead scoring backend review").
- Data: `Lead` fields only.
- States: n/a.
- Words: "Unassigned"; "Attention"; "Duplicate"; "Commission Pending"; `"+{n}"`.
- Reachable: yes.

### A-07 · List view table
- Where: `src/components/leads/lead-list-table.tsx`; sorting `page.tsx:515-531, 702-703` + `src/lib/use-table-sort.ts`.
- Entry: List view toggle (desktop).
- Does: One virtualised `<table>` (estimate 64px/row, overscan 10). Columns in order: [checkbox — only when bulk assign is allowed, A-73], Name (avatar + name + inline warning icon "Needs Attention" / copy icon "Possibly Duplicate" as `title`s), Budget (`{symbol}{(budget/1000).toFixed(0)}k`), Type, Area, Source (chip), Assigned (avatar stack max 3 + "+N", first name + " +N", or "—"), Bucket (dot + label, or the raw bucket id if unknown), Status (`StatusBadge` + `LeadHoldBadge`), Sub-Status (`subStatusLabel || "—"` + "Commission Pending" pill), Follow-up (`FollowUpBadge`). Row click opens the drawer. The former trailing ⋮ cell was removed (no per-row menu).
- Rules: Sortable headers for the first 8 columns via `useTableSort`: click cycles asc → desc → none; nulls always last; strings compared with `localeCompare(..., { sensitivity: "base" })`, dates by time, else numeric. Accessors: `name`, `budget`, `type`, `area`, `source`, `assigned` (assignedToName), `bucket` (bucket id), `status` (status label). Sub-Status and Follow-up headers are NOT sortable; a `followUp` accessor exists (soonest first, missing last) but no header uses it. The sort applies on top of the Newest/Oldest order and the status-filtered set. No column chooser, no column resize, no pinning, no persistence.
- Data: `Lead[]`.
- States: 0 rows → "No leads to show" / "Try clearing the active filters, or add a lead to get started."
- Words: headers "Name", "Budget", "Type", "Area", "Source", "Assigned", "Bucket", "Status", "Sub-Status", "Follow-up"; checkbox labels `"Select all {n} leads"` / "Clear selection" / `"Select {name}"`; "—".
- Reachable: yes.

### A-08 · Opening a lead (drawer) from the list + deep links
- Where: `page.tsx:205-213, 263-343, 2228-2237`; `GET /api/quotes/resolve-lead` (`src/app/api/quotes/resolve-lead/route.ts`).
- Entry: card/row click; `?openLead=<id>` or `?leadId=<id>` (alias used by every notification/email deep link, `leadDeepLinkPath`); a bare `?quoteId=<id>` (resolved to its lead via the scoped route, then the drawer's own effect opens the digitizer); `?openQuote=true` passed to the drawer as `autoOpenQuote`; a `window` `CustomEvent("open-lead", { detail: { leadId } })` (fired by the drawer's "View Original" on a duplicate); journey mini-rail step click (`openLeadAtStep` sets `journeyStepTarget` so the drawer opens focused on that step).
- Does: `selectedLead` state; the drawer always re-derives from the fresh `leads` array (`leads.find(...) || selectedLead`). On a real close (truthy → null) the params `openLead`, `leadId`, `quoteId`, `openQuote` are stripped from the URL with `router.replace` (never on initial mount, so a `quoteId` deep link is not raced).
- Rules: A deep-linked id that is not in the loaded (visibility-filtered) list simply does not open. Hand-off: the drawer itself (`lead-detail-drawer.tsx`).
- Data: `quotes.lead_id` for `quoteId` resolution (scoped, `maybeSingle` → `{ leadId: null }` for hidden/foreign).
- States: n/a.
- Words: n/a.
- Reachable: yes.

### A-09 · Follow-up badge (next follow-up status on cards/rows)
- Where: `src/components/leads/follow-up-badge.tsx`; `followUpStatus` in `src/lib/leads/listing-display.ts:23-49`.
- Entry: rendered on kanban card, mobile card, list row when `nextFollowUpDate` is set.
- Does: Combines `nextFollowUpDate` + `nextFollowUpTime` (missing time counts as `23:59`, i.e. the whole day). `diffDays` = calendar-day difference. `isToday` when 0; `isOverdue` when the due moment has passed AND it is not today. Label: "Today" / `"Overdue {n}d"` / `"in {n}d"`. Colour states overdue / today / upcoming. Renders nothing when no date or the date is unparsable.
- Rules: Same predicate drives the "Overdue follow-ups" quick filter (A-25) and the `followUp` sort accessor.
- Data: `leads.next_follow_up_date`, `next_follow_up_time`.
- States: none / overdue / today / upcoming.
- Words: "Today", "Overdue {n}d", "in {n}d", title `"Next follow-up: {label}"`.
- Reachable: yes.

### A-10 · On Hold badge
- Where: `src/components/leads/lead-hold-badge.tsx`.
- Entry: kanban/list/mobile cards.
- Does: Renders only when `lead.engagementState === "on_hold"` (the journey "Move to Hold" flow, hand-off), independent of the funnel bucket, so a hold is visible even on funnels with no hold bucket. Shows the restart date when set.
- Rules: —
- Data: `leads.engagement_state`, `hold_restart_date`.
- Words: "On Hold" / `"On Hold · {holdRestartDate}"`; title "On hold" / `"On hold — revisit {date}"`.
- Reachable: yes.

### A-11 · Needs Attention / Possibly Duplicate flags on the board
- Where: cards (A-06), list (A-07), review queue (A-52); `LeadFlags` component `page.tsx:58-83`.
- Entry: set by ingestion (email cron: low-confidence parse or unmatched property type; manual create + email cron: duplicate match) — see A-51, A-68.
- Does: On cards the pills read "Attention" / "Duplicate"; on list rows they are icons with titles "Needs Attention" / "Possibly Duplicate". The `LeadFlags` component (pills "Needs Attention", "Possibly Duplicate" + "View Original" link) is defined but no longer referenced anywhere in the page — dead code.
- Rules: A flagged NON-email duplicate is held out of the pipeline (A-52) so on the main board "Duplicate" only appears on approved email duplicates that still carry the flag, or when a flagged lead has no `duplicateOfLeadId`.
- Data: `leads.needs_attention`, `possibly_duplicate`, `duplicate_of_lead_id`.
- Words: "Attention", "Duplicate", "Needs Attention", "Possibly Duplicate", "View Original".
- Reachable: yes (LeadFlags: dead code).

### A-12 · Commission Pending badge
- Where: `page.tsx:755-764`; card/list.
- Entry: automatic.
- Does: A lead is "commission pending" when a loaded project has `leadId === lead.id`, `stage === "Draft"` and `commissionLocked` is falsy. Kanban card shows a bordered "Commission Pending" strip; the list shows it in the Sub-Status cell.
- Rules: Depends on `useApp().projects` (already visibility-filtered for id-only users).
- Data: `projects.lead_id`, `stage`, `commission_locked`.
- Words: "Commission Pending".
- Reachable: yes.

### A-13 · Journey intro banner
- Where: `page.tsx:473-502, 1963-1997`.
- Entry: shown once per browser when journey mode is on.
- Does: Explains the card rail and shows the colour legend; the X dismisses and writes `localStorage["leads.journeyIntroDismissed"] = "1"`. Default state is "dismissed" until the client effect reads storage (so it never flashes).
- Rules: Only when `studioFeatures.leadJourneyMode` (A-90).
- Words: "Journey mode is on." + "Each card has a progress rail — click the Next: chip or any dot to open that step and mark it done or add evidence."; legend "Done", "Now", "Blocked", "Reopened", "Upcoming"; dismiss title "Dismiss — the legend stays available on each card's progress rail"; aria "Dismiss journey intro".
- Reachable: yes (journey mode).

### A-14 · Journey mini-rail on cards (board-side journey affordance)
- Where: `src/components/leads/journey/lead-journey-mini-rail.tsx`; derivation `src/lib/leads/journey.ts` (hand-off: journey engine).
- Entry: bottom of each kanban/mobile card when journey mode is on; `onJumpToStep` provided by the page.
- Does: Derives step states from the lead row (`assignees/assignedTo`, `bucket`, `leadStatusCode`, `subStatusCode`, `quoteStatus`, `contractUploaded`, `signatureRequestId`, `journeyOverrides`, `outreachCount` from the 1-row probe). Shows a "Next: {step}" chip (click → opens the drawer at that step), or "Journey complete" (all done) / "Deal won" (final step done), a row of status dots + `"{done}/{total}"`, and a popover listing every step with its status word and a per-step jump. Quick action in the popover: for the active step, "Mark {label} done" ONLY when the step's evidence rule is `optional` and it is not `assigned` (site visit / concept / floor plan); otherwise a button "Assign a designer" (assigned step), `"Go to {label}"` (evidence `none`) or `"Add evidence for {label}"` (evidence `required`) that opens the drawer. Legend at the foot.
- Rules: Marking done calls `useMarkJourneyStep` (`POST` journey-step route, hand-off) and toasts. The "assigned" step's label reads "Assign Designer" while not done.
- Data: `leads.journey_overrides`, studio `settings.journey.steps`.
- Words: "Next: {label}", "Journey complete", "Deal won", aria `"Journey progress: {d} of {t} steps done — view details"`, "View journey progress", `"Journey · {d} of {t} steps"`, status words "Done"/"Now"/"Reopened"/"Blocked"/"Upcoming", `"Mark {label} done"`, toasts `"{Label} marked done"` / "Could not update step", "Assign a designer", `"Go to {label}"`, `"Add evidence for {label}"`.
- Reachable: yes (journey mode).

### A-15 · Back-to-top button
- Where: `page.tsx:359-373, 2252-2265`.
- Does: Appears once `<main>` is scrolled more than two viewport heights; hidden while the detail drawer or the New Lead drawer is open; smooth-scrolls to top.
- Words: "Scroll to top".
- Reachable: yes.

### A-16 · Page context for the mAIson assistant
- Where: `page.tsx:766-804`.
- Does: Registers `{ page: "leads", summaryStats: { NEW, ONGOING, "ON HOLD", CLOSED, total } }` (counts of the filtered set by legacy bucket keys) or, with a lead open, `{ page: "lead-detail", focusedEntity: { type: "lead", id, name, summary: { bucket, status, budget, propertyType, assignedTo } } }`.
- Reachable: yes (consumer is the AI bot — hand-off).

### A-17 · Keyboard shortcut "C" → New Lead
- Where: `page.tsx:218`; `src/lib/hooks/use-shortcut-create.ts`.
- Does: A global `shortcut-create` window event (the app's "C" key) opens the New Lead drawer, only when `canCreateLead` (A-36).
- Reachable: yes.

### A-18 · Visibility scoping of the loaded list (who sees which leads)
- Where: client `src/lib/leads/manager-hierarchy.ts:181-202` (`filterLeadsForViewer`, called in `app-context.tsx:122`); server `src/app/api/leads/records/route.ts:37-93` + `buildManagerScopeOrFilter` (`src/lib/leads/manager-scope-guard.ts:244-268`).
- Does: Client: if the manager-hierarchy flag is on and the viewer is `manager`-tagged (not owner/admin) → only leads where `owningManagerId === me` OR `assignedTo === me` OR `me ∈ assignees`; if the viewer is `id`-tagged (not owner/admin) → only leads where `me ∈ assignees` OR `assignedTo === me`; else all. If the viewer's `studio_members` row has not resolved (`myMemberId` null) the result is `[]` (fail closed). Server: only the manager branch is applied (PostgREST `.or("owning_manager_id.eq.X,assigned_to.eq.X,id.in.(junction ids)")`); id-only narrowing is NOT enforced server-side (the API returns every studio lead to an id-only caller; only the client hides them). The per-lead route `GET /api/leads/records/[id]` answers 404 for a manager outside scope.
- Rules: The role-permissions `dataScope` ("all" | "assigned" | "team") is NOT consulted by the list; only tags are.
- Data: `studio_members.tags`, `leads.owning_manager_id`, `assigned_to`, `lead_assignees`.
- States: —
- Words: —
- Reachable: yes (manager branch behind the `lead_manager_hierarchy` flag).

### A-19 · Bucket/status resolution for display (`getLeadBucket`)
- Where: `src/data/lead-bucket-config.ts:194-228` (+ `deriveBucketAndStatus` 264-280); wrapped config-aware in `page.tsx:186-189`.
- Does: If `bucket` and `leadStatusCode` are set: use them, but if `bucket === "NEW"` and status `ASSIGNED` while the lead has no assignee (junction empty, else scalar null) show `UNASSIGNED` instead; label from the studio funnel, else `leadStatusLabel`, else the raw code. If the modern fields are missing, derive from the legacy `status` text: ""/"New" → NEW/UNASSIGNED (or ASSIGNED when assigned); "Assigned" → NEW/ASSIGNED|UNASSIGNED; "Contacted" → ONGOING/CONTACTED; "Meeting" → ONGOING/MET; "Proposal" → ONGOING/QUOTE_CREATED; "Signed" → CLOSED/SIGNED; "Returned"/"Archived" → CLOSED/INACTIVE; anything else → NEW/UNASSIGNED.
- Rules: Used by the board, list, CSV export, mobile tabs and the page context so labels match the drawer.
- Reachable: yes.

### A-20 · Which leads count as "the pipeline"
- Where: `page.tsx:539-566, 558-593`.
- Does: The main board excludes: held-for-review leads (A-52 rule), leads with `emailLeadStatus === "rejected"`, and archived leads (`archivedAt` set — already excluded by the API by default). `pipelineCount` = every loaded lead not excluded by those three rules; it is the "M" in "N of M".
- Reachable: yes.

---

## Views / filters / search / sort / columns

### A-21 · Search box
- Where: `page.tsx:1005-1015` (header, ≥ `sm`), `2003-2014` (phone-only row, < 640px); predicate `leadMatchesSearch` `src/lib/leads/listing-display.ts:53-65`.
- Does: Case-insensitive substring match of the trimmed query against `name`, `area`, `phone`, `email`. Empty query matches all. Typing suspends the DEFAULT 30-day window (A-30) so older leads stay findable; a hand-picked date range still applies.
- Words: placeholder "Search name, area, phone, email…"; filter chip `“{query}”`.
- Reachable: yes.

### A-22 · Filter & Sort popover (container)
- Where: `page.tsx:1048-1253`.
- Entry: sliders icon button in the header; a numeric badge shows the active-filter count (A-32).
- Does: Sections in order: "Quick filters" (A-25), "Sort by" (A-26), "Bucket" (A-27), "Member" (A-28), "Source" (A-29), "Date created" (A-30), and a "Clear Filters" button (shown when sort ≠ newest OR any result filter is on) which resets sort to newest and runs the same full reset as the chip row's "Clear all" (search, members, source, bucket, date range → cleared, per-bucket status filters, quick filters).
- Words: "Filter & Sort" (title), section headings "Quick filters", "Sort by", "Bucket", "Member", "Source", "Date created", button "Clear Filters".
- Reachable: yes.

### A-23 · Quick filters (smart views)
- Where: `page.tsx:450-465, 580-591, 1066-1084`.
- Does: Toggle chips; ALL selected presets must match (AND). `overdue`: `followUpStatus(lead).isOverdue`. `unassigned`: no assignee (junction empty, else scalar null). `needs_attention`: `needsAttention`. `hot`: `temp === "hot"`. `on_hold`: `engagementState === "on_hold"` OR the resolved bucket id matches `/hold/i`.
- Words: "Overdue follow-ups", "Unassigned", "Needs attention", "Hot", "On hold".
- Reachable: yes.

### A-24 · Sort order (board-wide)
- Where: `page.tsx:404, 594-602, 1086-1103`.
- Does: `newest` (default) / `oldest` by `createdAt` (ISO), applied to the whole filtered set before bucketing; the list view's column sort (A-07) is applied on top. Non-default sort counts as one active filter.
- Words: "Newest at the top", "Oldest at the top".
- Reachable: yes.

### A-25 · Bucket filter
- Where: `page.tsx:408, 551-556, 572-579, 1105-1123`.
- Does: Single select: "All Buckets" or one funnel bucket by label; "Uncategorized" option appears only when some lead's bucket is not in the funnel (`hasOrphanedLeads`) and selects exactly those orphans.
- Words: "All Buckets", "Uncategorized".
- Reachable: yes.

### A-26 · Member filter (multi-select, any-of)
- Where: `page.tsx:406, 563-569, 1125-1165`.
- Does: Checkbox list of ALL studio members (`useStudioMembers` → `/api/identity/members`, active members only); a lead matches if ANY selected member id is among its assignees (junction ids, else the scalar). Count badge next to the heading; helper line lists the selected names. One chip per selected member in the filter row (removable individually).
- Words: "Member", `"Assigned to: {names}"`.
- Reachable: yes.

### A-27 · Source filter
- Where: `page.tsx:121, 168-172, 407, 570, 1167-1180`.
- Does: Single select over `["All", ...studio lead_source taxonomy names]`; if the studio has no `lead_source` taxonomy rows the fallback list is `DEFAULT_SOURCES = ["Qanvast", "Instagram", "Referral", "Walk-in", "Facebook", "Organic"]`. Exact match against `lead.source` (the display value after `formatSource`).
- Data: `GET /api/studio-config/taxonomies?type=lead_source` (`useTaxonomies`).
- Words: "All Sources"; option = source name.
- Reachable: yes.

### A-28 · Date created filter (presets, custom range, default 30-day window, search suspension)
- Where: `page.tsx:409-445, 571, 1182-1234`; pure helpers `src/lib/leads/date-filter.ts`.
- Does: Preset chips "Today" (from = to = today), "Last 7 days" (today−6 … today), "Last 30 days" (today−29 … today), "This month" (1st … today) — all inclusive, local-date based; tapping the active preset clears the range. "From"/"To" native date inputs (`max`/`min` constrain each other). Predicate: `matchesCreatedRange(createdAt, from, to)` — inclusive date-only compare; a lead with no `createdAt` is EXCLUDED whenever any bound is active. On mount the range is seeded ONCE to `DEFAULT_LEADS_DATE_PRESET = "30d"` via the raw setters (so `dateWindowIsDefault` stays true). Every user change goes through `setDateRange` which flips `dateWindowIsDefault = false`.
- Rules: `isCreatedRangeActive`: no bounds → inactive; default window + non-empty search → inactive (suspended); otherwise active. The chip, the badge count and the predicate all read the "active" value, never the raw range. Chip label = the preset label when the range equals a preset exactly, else "Created: {d Mon} – {d Mon}" / "Created: from {d Mon}" / "Created: until {d Mon}".
- States: while suspended the popover shows a note above the presets.
- Words: "Date created", "Today", "Last 7 days", "Last 30 days", "This month", "From", "To", "Paused while searching — your search covers all dates. Pick a range to apply it anyway.", chip "Created: 1 Jun – 30 Jun" (example).
- Reachable: yes.

### A-29 · Active-filter chip row + Clear all
- Where: `page.tsx:85-95 (FilterPill), 922-968, 1309-1313, 2015-2018`.
- Does: Shown when any result filter or per-bucket status filter is on. Order: search `“{q}”`, bucket label (or "Uncategorized"), source, date label, one chip per member (name or "Member"), one chip per selected status (its label or code), one chip per quick filter. Each chip's X removes just that filter. "Clear all" resets everything except the sort. Pinned in the sticky header on desktop (`lg+`), placed after the search box on mobile/tablet.
- Words: "Filters:", "Clear all", aria `"Remove filter: {label}"`.
- Reachable: yes.

### A-30 · Active filter count (badge on the Filter & Sort button)
- Where: `page.tsx:504-513`.
- Does: `(sort ≠ newest ? 1 : 0) + (members > 0 ? 1 : 0) + (source ≠ All ? 1 : 0) + (bucket ≠ all ? 1 : 0) + (date active ? 1 : 0) + quickFilters.size + (number of buckets with ≥1 status selected)`.
- Reachable: yes.

### A-31 · Empty states (mobile tree; list and kanban have their own — A-03, A-07)
- Where: `page.tsx:2035-2073`.
- Does: With 0 cards on the mobile list: if `pipelineCount === 0` → cold start with an Add Lead button (only when `canCreateLead`); else if any filter/status filter is on → filtered state with a "Clear filters" button; else a plain "No leads found".
- Words: "No leads yet" / "Add your first lead to start building your pipeline." / "Add Lead"; "No leads match your filters" / "Try adjusting or clearing your filters." / "Clear filters"; "No leads found".
- Reachable: yes.

### A-32 · Column settings / saved views
- Where: —
- Does: There is NO column chooser, column reorder, pinning, saved views, or persisted sort/filter state in 1.0 (only the bucket collapse overrides and the journey banner dismissal persist, both in localStorage). Filters reset on every page load (except the default 30-day window, which is re-seeded).
- Reachable: not present.

---

## Lead creation

### A-33 · Add Lead button + `leads.create` permission
- Where: `page.tsx:133-154, 1280-1304`; `resolveEffectivePermissions` / `resolveCanPerformAction` `src/lib/access-control.ts:249-390`.
- Does: `effectivePerms = resolveEffectivePermissions(rolePermissions (studio_roles row matched to the member's tags), tags, member.permissionOverrides)`; `canCreateLead = resolveCanPerformAction(effective, tags, "leads", "create")`. When false the button is HIDDEN (not disabled) and the "C" shortcut is inert. Opens `NewLeadDrawer`.
- Rules: Resolution chain: tag-derived defaults → P2 role grants → P3 member overrides. Tag defaults for `leads.create`: `id || admin || owner` (accounting: false). An explicit `false` in the role row is honoured; a missing key falls back to the tag rule.
- Data: `GET /api/studio-config/role-permissions`; `studio_members.permission_overrides`.
- Words: "Add Lead".
- Reachable: yes.

### A-34 · New Lead drawer (shell, modes, footer)
- Where: `src/components/leads/new-lead-drawer.tsx` (661 lines); shell `drawer-sections/drawer-shell.tsx` (hand-off: generic shell).
- Entry: Add Lead / "C"; also opened by the detail drawer in Edit mode (`editLead` prop, "Edit Lead") — hand-off.
- Does: Sections in order: [new mode only] "Fill from a document" zone (A-58); "Client Information" (A-35); "Project Requirements" (A-36); "Property Info" (A-37); "Other Info" (A-38); [new mode only] "Assign Interior Designer" (A-39); "Documents" (A-40). Header action toggles the drawer width between default and full ("Full View" / "Compact View", hidden below `sm`). Footer: secondary "Cancel" (new) / "Back" (edit → returns to the detail drawer) and the primary Save. On validation failure the primary turns red and shakes for 600 ms reading "Fix Errors to Save", errors render inline under fields and the first invalid field scrolls into view. While saving the primary reads "Saving..." and is disabled.
- Rules: In Edit mode the document-prefill zone and the assignee picker are hidden; Save calls `updateLead(editLead.id, leadData)` (drawer auto-save path — hand-off) and toasts "Lead updated successfully".
- Words: "New Lead" / "Edit Lead"; "Full View" / "Compact View"; "Cancel" / "Back"; "Save Lead" / "Update Lead" / "Fix Errors to Save" / "Saving..."; section titles above.
- Reachable: yes.

### A-35 · Client Information fields
- Where: `src/components/leads/drawer-sections/client-info-section.tsx:183-344`.
- Does: "First Name *" (text), "Last Name", "Email" (type=email), "Phone *" = dial-code `Select` + tel input, "Lead Source *" = `Select` of the studio's `lead_source` taxonomy names (fallback `DEFAULT_LEAD_SOURCES` = "Referral", "Instagram", "Facebook", "Website", "Walk-in") plus "Others…" which swaps the select for a free-text input with a "Cancel" link (a stored value not in the list also shows as free text).
- Rules: Phone input strips non-digits and caps at the selected country's `maxDigits`; changing the dial code clears the phone. Dial-code options: the studio's `supportedCountries` (when > 1), else only the studio's own country; each option shows flag + code. The lead's `countryCode` is derived from the chosen dial code (`leadCountryCode`, H15) and drives every region-scoped dropdown below and the saved `country_code`. Placeholder per region (`phone.placeholder`, e.g. "8123 4567").
- Words: labels "First Name", "Last Name", "Email", "Phone", "Lead Source"; placeholders "e.g. Aisha", "e.g. Rahman", "aisha@email.com", region phone placeholder, "Select source", "Enter source name…"; option "Others…"; "Cancel".
- Reachable: yes.

### A-36 · Project Requirements fields
- Where: `drawer-sections/project-requirements-section.tsx:68-125`.
- Does: "Property Type *" `Select` of `getRegionConfig(leadCountry).propertyTypes` (value = key, shows label); "Budget" numeric text (non-digits stripped as typed; currency symbol prefix from the lead's country); "Area / District *" free text.
- Words: "Property Type", "Select type", "Budget", "e.g. 85000", "Area / District", "e.g. Downtown".
- Reachable: yes.

### A-37 · Property Info fields
- Where: `drawer-sections/property-info-section.tsx:61-126`.
- Does: "Property Status" `Select` of region `propertyStatuses`; "Style" searchable select of region `designStyles`; "Area Size" digits-only input + unit select ("sq ft" = `sqft` default / "sq m" = `sqm`); "Key Collection" searchable select of region `possessionTimeline`; "Property Address" textarea with helper text.
- Words: "Property Status" / "Select status"; "Style" / "Select style"; "Area Size" / "e.g. 1200"; "Key Collection" / "Select timeline"; "Property Address" / "e.g. 123 Sample Street, City, Postal Code" / "Used in quote PDF + signing page. Optional."
- Reachable: yes.

### A-38 · Other Info fields
- Where: `drawer-sections/other-info-section.tsx:41-64`.
- Does: "Remarks" textarea (saved to `leads.notes`), "Additional Info" textarea (`leads.additional_info`).
- Words: "Remarks" / "Any initial requirements, preferences, or context..."; "Additional Info" / "Any other information...".
- Reachable: yes.

### A-39 · Assign Interior Designer (new mode)
- Where: `new-lead-drawer.tsx:44-78, 362-377, 542-649`.
- Does: Multi-pick: chips of selected members (X removes) + a dropdown trigger that becomes a search input; list shows members not yet selected, filtered by name or `specialty` (case-insensitive contains), each with initial avatar, name, specialty and a green dot when `acceptingLeads !== false`. Picking closes the dropdown. `assignableMembers` = members with the `id` tag OR any tag equal to the slug of a studio role flagged `isAssignable`.
- Rules: On save, if the current user is `id`-tagged and picked nobody, they are auto-assigned to themselves (`myMemberId`). Commission split = `Math.floor(10000 / n)` bps per member (client) — the server re-derives with the rounding remainder on the first member. Manager-hierarchy lock: when the studio flag `leadManagerHierarchy` is on and the user is `id`-tagged without the `manager` tag, the picker is replaced by an italic note (they still self-assign). The section is hidden when there are no assignable members.
- Data: `studio_members` (via `/api/identity/members`, active only), `studio_roles.is_assignable`.
- Words: "Assign Interior Designer"; "Search by name or specialty…"; "Add a designer (optional)…" / "Add another designer…"; "All designers assigned"; aria `"Remove {name}"`; lock note "This lead will be assigned to you. Your manager routes leads to teammates."
- Reachable: yes.

### A-40 · Documents (attach files at creation)
- Where: `new-lead-drawer.tsx:93, 264-298, 408-417, 651-657`; `drawer-sections/files-section.tsx`; `useUploadLeadFile` `src/lib/queries/leads.ts:1644-1716`.
- Does: Multi-file picker; each file validated by `validateFileSize` (10 MB cap, 3D formats exempt) with a toast on failure; pending files listed with preview + remove. On successful create, every pending file is uploaded to Storage bucket `lead-files` at `{studioId}/{leadId}/{uuid}.{ext}` and a `lead_files` row is written via `POST /api/lead-files/records`; an activity-log row `file_uploaded:{name}` (or `contract_uploaded:{name}` when the filename matches `/contract/i`) is written best-effort. The document-prefill file (A-58) joins this list tagged `fromImport` and a re-upload REPLACES it rather than adding.
- Rules: Upload failures are logged, never block creation.
- Data: `lead_files` (`file_name`, `file_url` = storage path, `file_size`, `mime_type`, `uploaded_by`), `lead_activity_log`.
- Words: "Documents"; "Click to upload files"; "Max 10MB per file"; "No files uploaded yet"; "Uploading..."; error `File "{name}" is {x}MB. Maximum allowed size is 10MB.`; "Remove file".
- Reachable: yes.

### A-41 · New Lead validation (drawer)
- Where: `new-lead-drawer.tsx:300-328`; `validatePhone` `client-info-section.tsx:132-145` → `src/lib/region-config.ts:711-724`.
- Does: Required: first name, phone, property type, area, source. Budget optional but if present must be a positive number. Phone: digits count must be within the region's `minDigits..maxDigits`, and must match `startsWithPattern`. Errors clear as the field changes.
- Words: "First name is required"; "Phone number is required"; "Property type is required"; "Area / District is required"; "Budget must be a valid positive number"; "Lead source is required"; phone: `"Must be {n} digits"` (fixed length) / `"Must be {min}–{max} digits"` / `"Must start with {label}"` (SG "6, 7, 8, or 9"; MY "1"; AE "5"; IN "6, 7, 8, or 9"; EG "10, 11, 12, or 15").
- Reachable: yes.

### A-42 · Save payload + create flow (drawer)
- Where: `new-lead-drawer.tsx:330-430`; `useAddLead` `src/lib/queries/leads.ts:172-257`; `app-context.tsx:184-186`.
- Does: Builds `{ name: "First Last".trim(), email|undefined, phone: "{dialCode} {digits}", type: PROPERTY_MAP[key] || key, countryCode, area, budget: parseInt||0, source, notes|undefined, propertyStatus|null, stylePreference|null, areaSqft|null, areaUnit ("sqft" default), keyCollectionDate|null, propertyAddress|null, additionalInfo|null, [assignedTo, assignedToName, assignees[{memberId, commissionSplitBps}]] }`. Runs the duplicate probe (A-50) and may abort. `POST /api/leads/mutations/create` (A-44). On success: optimistic prepend of the new row into the `["leads"]` cache (via `transformLead`), invalidate, upload files, toast, `onLeadCreated(id)`, close.
- Rules: `PROPERTY_MAP` (legacy) maps `hdb3/hdb4/hdb5/ec → "HDB/Apartment"`, `condo → "Condo"`, `landed → "Landed Property"`; region keys pass through unchanged. The phone is stored as the display string "+65 91234567" (not E.164) — the dedup detector matches both raw and normalised forms.
- Words: toasts "Lead created successfully", "Failed to save lead. Please try again."
- Reachable: yes.

### A-43 · `/leads/new` full-page form (second create path)
- Where: `src/app/(main)/leads/new/page.tsx`.
- Entry: global quick-action menu item "New Lead" (`src/components/layout/quick-action-menu.tsx:19`) and the studio-setup checklist link; NOT linked from the leads page.
- Does: Header "New Lead" / "Manually enter a new lead into your pipeline." with back to Leads. Fields: "First Name *", "Last Name", "Email", "Phone" (dial code + digits, same region rules), "Property Type" (defaults to the region's FIRST type), "Area / District", "Budget ({currency code}) *" (labelled required but NOT validated as required), "Lead Source" (taxonomy or fallback "Qanvast", "Referral", "Instagram", "Walk-in" + "Others…"), "Notes", "Property Status", "Style Preference", "Area Size" + unit, "Key Collection", "Additional Info", "Assignment" (`AssignmentSection`, A-47) , "Temperature" (Hot / Warm / Cool / Cold), "Documents" → "Quote (PDF/Image)" single file (.pdf/.jpg/.jpeg/.png, 10 MB). Save: validates, creates via the same `addLead`, uploads the quote file to `lead_files`, fires-and-forgets `POST /api/quotes/parse` → `useSaveQuoteLineItems` → `useUpdateLeadBucket({ quoteStatus: "draft" })`, then navigates to `/leads?openLead={id}&processingQuote=1` (`processingQuote` is never read by anything — dead param).
- Rules: Validation: first name, phone, source required; budget positive when given; phone per region or fallback "Phone number must be 7-15 digits". Area defaults to the region's first `regions` entry when blank; source falls back to "Organic" if none; `countryCode` = the lead country picker (follows the phone prefix). Same ID auto-self-assign rule; manager lock renders `AssignmentSection` read-only.
- Words: "New Lead"; "Manually enter a new lead into your pipeline."; "Client Information"; "Project Requirements"; "Property Info"; "Assignment"; "Documents"; "Temperature" / "Select temperature" / "Hot" / "Warm" / "Cool" / "Cold"; "Quote (PDF/Image)"; "Click to upload a quote"; "Cancel"; "Save Lead" / "Saving…"; errors as A-41 plus "Phone number must be 7-15 digits", "Failed to save lead. Please try again."; placeholders "Aisha", "Rahman", "aisha@email.com", "Select type", "85000", "Select source", "Any initial requirements, preferences, or context…", "Any other details…", "Select status", "Select style", "e.g. 1200", "Select timeline".
- Reachable: yes (via quick-action menu / studio setup).

### A-44 · Server create route (`POST /api/leads/mutations/create`)
- Where: `src/app/api/leads/mutations/create/route.ts` (334 lines); helpers `load-funnel-config.ts`, `funnel-transitions.ts:237-247` (`resolveIntakeTarget`), `duplicate-detection.ts`, `tat-stamps.ts`, `notify-assigned.ts`, `manager-hierarchy.ts`.
- Does: (1) Loads the studio funnel; intake target = first bucket; its 2nd status when an assignee is present and one exists, else the 1st (default NEW/ASSIGNED vs NEW/UNASSIGNED). (2) Duplicate detection when the studio knob is on (A-51): an ACTIVE match sets `possibly_duplicate = true` + `duplicate_of_lead_id` (the lead is created and then held for review); an ARCHIVED match instead appends the archived-duplicate note to `notes`. (3) Manager hierarchy (flag): a locked plain designer pre-assigning to someone other than themselves → 403 `ASSIGNMENT_LOCKED`; `owning_manager_id` resolved via `resolveOwningManagerCandidate` (owner/admin → first manager-tagged candidate in caller order; a manager assigning themselves → self). (4) Insert `leads` row: `studio_id` from session, `name`, `phone|null`, `email|null`, `budget|null`, `property_type = reversePropertyType(type)` (label → key map, else lowercased/underscored), `area|null`, `source` (display value as sent; "Organic" if empty), `notes`, `status: "new"`, `temp` ("warm" default), `bucket`, `lead_status_code`, `assigned_to` = `assignedTo || assignees[0]`, `property_status`, `style_preference`, `area_sqft`, `area_unit` ("sqft"), `key_collection_date`, `property_address`, `additional_info`, `possibly_duplicate`, `duplicate_of_lead_id`, `country_code` (when sent), `owning_manager_id` (scalar-only path). (5) `lead_assignees` upsert (`onConflict lead_id,member_id`): bps = each's `commissionSplitBps` else even split with the remainder on the first; `added_by` = session user. (6) `first_assigned_at` stamped (write-once) whenever an assignee exists. (7) ONE `lead.assigned` notification covering every new assignee (A-93). (8) `lead_activity_log` row `action: "Lead created"`. (9) usage `track("lead_created", …)`. Returns `{ lead: <raw row> }`.
- Rules: `parkedForProject: true` variant (used by `createLeadForProject`, `src/lib/project-lead.ts`) skips dedup and notifications and inserts `source: "Organic"`, `status: "assigned"`, `temp: "warm"`, bucket/status = the bucket owning `SIGNED` (else the terminal bucket, else CLOSED/SIGNED) with `sub_status_code: "PROJECT_STARTED"`, `notes: "Customer record created with project: {projectName}"`, log "Lead created with project". The candidate-membership read failing → 500 (fail closed, no orphan lead).
- Data: tables `leads`, `lead_assignees`, `lead_activity_log`, `studios.settings/country_code`, `studio_members`, `studio_lead_funnel`.
- States: 403 `{ error: "Your role can't assign this lead to someone else.", code: "ASSIGNMENT_LOCKED" }`; 500 `Failed to create lead` / db message.
- Words: as quoted.
- Reachable: yes.

### A-45 · Optimistic insert + cache
- Where: `useAddLead.onSuccess` `src/lib/queries/leads.ts:221-252`.
- Does: Prepends the created row (transformed, assignee name resolved from the cached member list) into every `["leads", …]` query, then invalidates. No client-side notification (the route dispatches).
- Reachable: yes.

### A-46 · Duplicate pre-check before save (drawer)
- Where: `new-lead-drawer.tsx:379-406`; `GET /api/leads/mutations/dup-check` (`src/app/api/leads/mutations/dup-check/route.ts`).
- Does: Sends `phone` (digits only) and/or lowercased `email`. Route: `phone.ilike.%{digits}%` only when ≥ 6 digits; `email.ilike.{email}`; studio-scoped; excludes archived; returns at most one `{ id, name, phone, email }`. If a match: a native `window.confirm` names the match; Cancel aborts the save; OK proceeds (the server will still flag it as a possible duplicate and hold it for review).
- Rules: Fail-open — any error is logged and creation continues.
- Words: `"A lead with this {phone number|email} already exists: {name}.\n\nCreate this lead anyway?"` ("phone number" when the match's digits contain the typed digits, else "email").
- Reachable: yes.

### A-47 · `AssignmentSection` (used by `/leads/new` and the drawer's detail view)
- Where: `src/components/leads/drawer-sections/assignment-section.tsx`.
- Does: Optional "AI Recommendation" card (shown only when nobody is assigned and a recommendation is passed — computed by the drawer, hand-off) with "Assign to {name}"; list of assigned chips "Assigned (N)" with `Math.round(bps/100)%` when > 1 assignee and X to remove; search dropdown "Manual Assignment" / "Add Another Designer" filtered by name/specialty, rows show `"{specialty} · {n} active"` and a green "Accepting leads" dot. `readOnly` replaces the picker with an italic note. `/leads/new` rebalances bps to `evenSplitBps(n)` on every add/remove.
- Words: "AI Recommendation"; `"Assign to {name}"`; `"Assigned ({n})"`; "Commission split is set at project creation"; "Your manager assigns leads to you."; "Manual Assignment"; "Add Another Designer"; "Choose a designer to assign…"; "Search to add another designer…"; "Search by name or specialty…"; "No assignable designers found"; "No match — try a different name"; "All designers already assigned"; "Accepting leads".
- Reachable: yes.

---

## Duplicate handling

### A-48 · Shared duplicate detector (`findDuplicateLead`) + per-surface policy
- Where: `src/lib/leads/duplicate-detection.ts`.
- Does: Match = same studio AND (phone ∈ {raw trimmed, E.164-normalised using the studio country (SG fallback)} exact match, OR email case-insensitive exact via escaped `ilike`). Phone checked first, then email. ARCHIVED rows are included; active rows sort first so an active match wins. Returns `{ duplicateOfLeadId, isArchived }`.
- Rules: Studio knob `studios.settings.features.duplicate_detection_enabled` (default ON, explicit `false` to opt out) gates the manual-create route, the email cron, the hangout admin surface and the agent tool; the public webhook ignores the knob and ALWAYS checks. Policy per surface: manual create → create + flag (`possibly_duplicate`, `duplicate_of_lead_id`) → held for review; email cron → same flag; webhook → `decideWebhookDuplicate`: active match = `drop` (respond `duplicate`, no insert), archived match = `create-noted`, none = `create`. An archived match on any surface never sets the flag pair (the banner would link to a hidden lead); it appends `archivedDuplicateNote()` to `notes` idempotently.
- Words: note "[Auto] Matches an archived lead for this studio — check the Archived Leads list before working this as new."
- Reachable: yes.

### A-49 · "Leads Pending Review" queue (held leads)
- Where: `page.tsx:192-201, 539-549, 1482-1911`; rule `src/lib/leads/review-queue.ts` (`isHeldForReview`).
- Entry: appears above the board whenever ≥ 1 lead is held.
- Does: Held = `emailLeadStatus === "pending_review"` (email/webhook intake) OR (`possiblyDuplicate` AND `duplicateOfLeadId` AND `emailLeadStatus == null` AND not archived) (a manually-created duplicate). Desktop: collapsible card headed "Leads Pending Review" + count, with "Sync" (runs the email poll, A-69) and "Approve All" (disabled while pending or when no email-pending leads). Optional source tabs when > 1 distinct source: "All (N)" / "{source} (N)" (tap the active one again → All). Table columns "Lead" (avatar+name), "Source" (chip), "Details" (phone, `formatBudgetShort` → "S$50k"/"S$500"/"—", type unless "—"), "Flags" ("Attention", "Duplicate" + "View" link opening the original), "Actions": [Merge into original — only when a duplicate with a pointer], [Keep both (duplicate) | Approve (otherwise)], [Reject — email leads only], [View details → opens the drawer]. Mobile: a compact resting card (count + sync icon) that opens a full-screen overlay with the same tabs, "Approve All", and per-lead cards with "Merge" / "Keep Both" or "Approve" / "Reject" buttons; tapping a card opens the drawer.
- Rules: Every action goes through a confirm dialog (below). Approve All only sends the ids with `emailLeadStatus === "pending_review"`.
- Data: writes via `PATCH /api/leads/mutations/[id]` (whitelisted columns `email_lead_status`, `possibly_duplicate`, `duplicate_of_lead_id`), `POST /api/leads/mutations/merge-duplicate`, `POST /api/leads/mutations/bulk-status`.
- States: mobile filter with no rows → "No leads for this filter"; header says `"{n} leads awaiting action"`.
- Words: "Leads Pending Review"; "Sync"; "Approve All"; "All ({n})"; "{source} ({n})"; headers "Lead", "Source", "Details", "Flags", "Actions"; "Attention"; "Duplicate"; "View"; tooltips "Merge into original", "Keep both", "Approve", "Reject", "View details"; mobile buttons "Merge", "Keep Both", "Approve", "Reject". Confirm dialog titles: "Approve all leads?", "Approve this lead?", "Keep both leads?", "Reject this lead?", "Merge into original?"; descriptions: `"This will approve all {n} pending leads and add them to your pipeline."`, `"\"{name}\" will be added to your lead pipeline."`, `"Both \"{name}\" and the original lead will be kept in your pipeline."`, `"\"{name}\" will be rejected and removed from the review queue."`, `"\"{name}\" will be merged into the original lead. The duplicate will be removed."`; buttons "Cancel", "Reject" (destructive) / "Confirm". Toasts: "Lead approved", "Lead rejected", "Leads merged" + "The duplicate was folded into the original.", "Kept both leads", `"{n} lead(s) approved"`, errors "Could not update the lead — try again", "Merge failed — try again", "Could not keep both — try again", "Bulk approve failed — try again".
- Reachable: yes.

### A-50 · Approve / Reject / Keep both semantics
- Where: `src/lib/queries/email-connections.ts:100-191`.
- Does: Approve → `email_lead_status = "approved"`. Reject → `email_lead_status = "rejected"` + `possibly_duplicate = false` + `duplicate_of_lead_id = null` (rejected leads are then excluded from the board but NOT archived or deleted). Keep both → `possibly_duplicate = false`, `duplicate_of_lead_id = null`, plus `email_lead_status = "approved"` when it is an email lead.
- Rules: PATCH route only accepts whitelisted columns; any studio member may call it (no role gate).
- Reachable: yes.

### A-51 · Merge duplicate into original
- Where: `src/app/api/leads/mutations/merge-duplicate/route.ts`.
- Does: Requires both ids (400 "duplicateLeadId + originalLeadId required"), both in the studio (404 "Lead not found"). Fills EMPTY fields on the original from the duplicate: `email, phone, area, property_status, style_preference, notes, additional_info, project_type, budget, area_sqft, property_type, key_collection_date`. If the duplicate has notes different from the original's, the original's notes become `"{original}\n[Merged from duplicate lead] {dup notes}"`. Then hides the duplicate: email lead (`email_lead_status` not null) → `email_lead_status = "rejected"`; otherwise → `archived_at = now()`; both clear the dup flags.
- Rules: No merge of assignees, files, quotes, tasks or activity.
- Words: "[Merged from duplicate lead] "; errors as quoted.
- Reachable: yes.

### A-52 · Bulk approve (`POST /api/leads/mutations/bulk-status`)
- Where: `src/app/api/leads/mutations/bulk-status/route.ts`.
- Does: `{ leadIds, status }` with `status ∈ {"approved", "rejected", "pending_review"}` (default "approved"); manager-scope narrowing drops out-of-scope ids silently; updates `email_lead_status`.
- Words: 400 "leadIds required", "invalid status".
- Reachable: yes (Approve All).

---

## CSV import

### A-53 · Lead CSV import — NOT PRESENT; `csv-import-dialog.tsx` imports PRICE-BOOK items
- Where: `src/components/leads/csv-import-dialog.tsx`; mounted only at `src/app/(main)/accounts/page.tsx:1764` under the Quote Categories tab ("Import Price Book from CSV").
- Does (for completeness): 5-step dialog upload → map → (preview) → importing → done. Papaparse the file; needs ≥ 2 rows; header row trimmed; blank rows dropped. Target fields: "Description" (required), "Category", "Unit Price", "Unit", "Quantity". Auto-map by header substring: description ← `desc|item|name`; category ← `categ|section|type`; unit_price ← `price|rate|cost`; unit ← `unit` or `=== "uom"`; qty ← `qty|quant|amount`. Each field can be set to "— Skip —". Mapped rows: category default "General", unit price = parseFloat after stripping non `[0-9.-]` else 0, unit default "lot", qty default 1; rows without a description dropped. Preview of first 3 rows. Import button disabled until Description is mapped and ≥ 1 item. On import the accounts page calls `addPriceBookItems` with `unitPrice` in cents and `source: "csv_import"`.
- Words: "Import Price Book from CSV"; "Drop a CSV file here or click to browse"; "Supports .csv files exported from Excel or Google Sheets"; `"{n} rows detected"`; "Map your CSV columns to the target fields:"; "— Skip —"; "Preview (first 3 rows)"; `Map "Description" to proceed`; "Cancel"; "Back"; `"Import {n} Items"`; `"Importing {n} items..."`; "Import Complete"; `"{n} items added to your price book"`; "Close"; "Import Failed"; "Something went wrong. You can try again or adjust your column mapping."; "Adjust Mapping"; "Retry Import"; toasts "CSV must have at least a header row and one data row", "Failed to parse CSV file", "Please upload a CSV file", "No valid items to import", `"Imported {n} items"`, "Import failed".
- Reachable: yes, but it is not a leads feature. There is no bulk lead import of any kind in 1.0 (the requirements CSV row "CSV Export" explicitly warns not to confuse the two).

### A-54 · CSV export of the filtered leads
- Where: `page.tsx:705-753`; ⋮ menu "Export as CSV".
- Does: Exports `statusFiltered` (every active filter incl. per-bucket status filters and the date window). 23 columns, in order: "Name", "Phone", "Email", "Budget", "Property Type", "Property Status", "Area", "Area (sqft)", "Style Preference", "Source", "Temperature", "Bucket", "Status", "Sub-Status", "Assigned To", "Next Follow-Up Date", "Next Follow-Up Time", "Key Collection Date", "Quote Status", "Project Type", "Notes", "Additional Info", "Created Date". Values: bucket id, status LABEL, `subStatusLabel ?? subStatusCode ?? ""`, first assignee name, `quoteStatus ?? "none"`, `Created Date` = the RELATIVE string (`lead.date`, e.g. "3d ago"), `Area (sqft)` = `areaSqft` regardless of unit. Cells containing `,`, `"` or newline are quoted with `""` escaping. File `leads-export-YYYY-MM-DD.csv`, UTF-8 BOM, client-side download.
- Rules: Not role-gated.
- Words: "Export as CSV"; toasts "No leads match current filters", `"Exported {n} lead(s) to CSV"`.
- Reachable: yes.

---

## Document / PDF import (prefill a new lead from a file)

### A-55 · "Fill from a document" zone in the New Lead drawer
- Where: `src/components/leads/lead-document-import.tsx`; wired in `new-lead-drawer.tsx:171-283, 487-494`.
- Entry: top of the New Lead drawer (new mode only).
- Does: Three inputs — paste an image from the clipboard (document-level `paste` listener; only `image/*` file items; named `Screenshot {HH:MM}.{ext}`), drag-drop onto the zone, or "browse a file" (accept `.pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx`). Client checks: empty file → toast; > 10 MB → toast with size. While parsing: spinner with the file name and "Reading it…" plus an elapsed-seconds counter after 5 s; inputs disabled. On success: calls `onParsed(lead)` (merge rules A-57) and `onDocumentChange(file)` so the file is attached to the lead's Documents on save; shows a receipt strip with thumbnail (images) and "Replace" / remove controls; toasts success or a low-confidence warning. On failure: error toast, receipt cleared, nothing attached. The file input is reset so re-picking the same file fires again.
- Rules: Prefill only — never creates anything. Hidden in Edit mode.
- Words: "Fill from a document"; "Drop an enquiry form, brief, business card or a screenshot of a chat. We will read it and fill in the fields below for you to check."; "⌘V paste" / "Ctrl V paste"; "or"; "browse a file"; "PDF, image, CSV or Excel · up to 10MB"; "Drop it here to read it"; "Reading it…" (+ `" {n}s"`); `"Filled from {file}"`; `"{size} · saved to this lead's documents"`; "Replace"; aria "Remove this document". Toasts: "That file is empty"; "File too large" / `"That file is {size}. The maximum is 10MB."`; "Couldn't read that file"; "Details filled in — please check them" / "The document was hard to read, so some fields may be wrong."; "Details filled in" / "Review the fields below before saving."; "Couldn't read that file" / "Check your connection and try again.".
- Reachable: yes.

### A-56 · `POST /api/leads/parse-document`
- Where: `src/app/api/leads/parse-document/route.ts`; parser `src/lib/lead-document-parser.ts`.
- Does: Session-cookie auth (401 "Not authenticated"). Region = `?countryCode=` when a supported code, else the studio's region. Multipart `file`: 400 "Invalid request body" / "No file provided"; 400 "That file is empty."; 413 "File too large. Maximum size is 10MB."; MIME inferred from extension when the browser sends `application/octet-stream`; text types `text/csv`, `.xlsx` (first sheet → CSV text via `xlsx`), image types `application/pdf`, `image/png`, `image/jpeg`, `image/jpg`, `image/webp`; else 415 "Unsupported file type. Upload a PDF, image, CSV or Excel file.". If `DRY_RUN` or no `OPENROUTER_API_KEY` → returns the mock `LEAD_DRY_RUN_RESULT` (Priya Menon …). Otherwise calls `parseLeadDocumentWithAI` with a 45 s abort; `isEmptyParsedLead` (no name, phone, email, address, remarks) → 422; abort → 504; other errors → 500. Usage events `feature_opened/succeeded/failed` with feature `lead_document_parse`.
- Words: "Couldn't find any lead details in that file. Try a clearer copy, or enter the details manually."; "That took too long to read. Try a smaller or clearer file."; "Couldn't read that file. Try again, or enter the details manually."
- Reachable: yes.

### A-57 · AI extraction contract + normalisation + prefill merge rules
- Where: prompt `lead-document-parser.ts:28-68`; `normaliseParsedLead` 97-166; merge `new-lead-drawer.tsx:176-258`; helpers `src/lib/leads/parse-imported-values.ts`; `resolveRegionPropertyTypeKey` `client-info-section.tsx:63-86`.
- Does: Model `google/gemini-2.5-flash` via OpenRouter, JSON mode, 2000 max tokens; prompt is region-aware (market label, currency code, property type labels). Output fields: `name, phone, email, budget, propertyType, propertyAddress, area, floorArea, leadSource, propertyStatus, designStyle, possessionTimeline, projectType, remarks, confidence ("high"|"medium"|"low")`. Prompt rules (verbatim gist): never invent; budget = plain number, lower bound of a range; phone E.164 with leading plus if a dialling code is shown else local digits, no spaces; `area` = locality (town/estate/district), required whenever derivable from the property address, never a size or full address; `floorArea` = size with unit; `propertyAddress` = full street address only; `leadSource` = how the enquiry reached the studio in the document's own words; status/style/timeline reported verbatim; confidence "high" only with an unambiguous name and ≥ 1 contact method. Normalisation: strings trimmed, literal "null"/"n/a"/"none"/"unknown"/"-" → undefined; numbers: first number in the string, ≥ 0 only (ranges → lower bound); a size-like `area` (`/^[\d.,]+\s*(sq ft|sqm|…)/`) is moved to `floorArea`; phone keeps digits and a leading `+`. Merge in the drawer (EMPTY fields only, typed values win): name split on whitespace → first/last; phone via `splitPhoneCountryCode` (longest dial code first; a `+` accepts the split; without `+` only when the number is longer than the country's max AND the remainder is exactly max length — protects SG landlines like 6222 8100); email; `source` resolved with `resolveOption` against the studio's source list (exact → synonym phrase → whole-word containment, earliest position wins) using `OPTION_SYNONYMS.leadSource` = {"showflat walk in","show flat","walk in","showroom" → "Walk-in"; "word of mouth","referred","recommendation" → "Referral"; "ig" → "Instagram"; "fb" → "Facebook"; "web","web form","enquiry form","contact form","online" → "Website"}; property type via `resolveRegionPropertyTypeKey` (exact key → normalised label → containment either way; NO match → blank); `area`; budget; `propertyAddress`; `propertyStatus` with synonyms {"new launch","bto","brand new","under construction" → "New"; "sub sale","subsale","second hand" → "Resale"; "owner occupied","currently living","lived in" → "Existing"}; `designStyle` against region styles; `possessionTimeline` with synonyms {"keys collected","collected","handover done","handed over","completed handover","tok" → "Collected"}; floor area via `parseFloorArea` (first number + the unit beside it: sqm/m2/m²/metre → `sqm`; sq ft/sqft/ft2/feet → `sqft`; no unit → keep current unit); remarks = `remarks` + `"Project type: {projectType}"` joined by blank lines.
- Rules: Same `ParsedEmailLead` shape as the email path (A-70).
- Reachable: yes.

---

## Qanvast / webhook ingestion

### A-58 · Webhook endpoint management (Accounts → Lead Webhooks tab)
- Where: `src/app/(main)/accounts/lead-webhooks-tab.tsx`; hooks `src/lib/queries/lead-webhooks.ts`; routes `src/app/api/webhooks/leads/endpoints/route.ts` (GET list / POST create), `[endpointId]/route.ts` (DELETE = revoke), `[endpointId]/regenerate/route.ts`, `[endpointId]/logs/route.ts`. Hand-off for the Accounts page shell.
- Does: "Generate webhook URL" → form: "Source" select (Generic webhook / Google Ads (Lead Form) / Meta Ads (via Zapier / Make)), "Source label (optional)" (max 80; defaults "Google Ads" / "Meta Ads" per platform), "Notes (optional)" (max 200). Create → server mints `token = 24 random bytes hex`; `platform` stored as `google_ads` or `generic` (Meta is stored as generic with source label "Meta Ads"); Google endpoints also get a `signing_secret` (24 bytes hex) returned ONCE. The success card shows the URL `${origin}/api/webhooks/leads/${token}`, the "Signing key" (Google), copy buttons and platform-specific setup steps. Each endpoint row: source label (or "Webhook endpoint"), notes, counters `"{n} received"`, `"{n} created"`, `"{n} dupes"`, `"Last: {date}"`, regenerate (confirm → new token; old URL dies immediately), revoke (confirm → `is_active = false`), "Recent activity" panel listing the last 10 of the last 50 logs with outcome badge, time, `"lead: {id8}…"` and error message.
- Rules: Routes require only a valid session for the same studio (`studioId` must equal the session's) — no owner check despite the "Owner-only" comment. List returns active endpoints only, newest first. `signing_secret` is never returned by the list.
- Data: `lead_webhook_endpoints` (`id, studio_id, token, platform, signing_secret, source_label, notes, is_active, total_received, total_leads_created, total_duplicates, last_received_at, created_at, created_by`), `lead_webhook_log` (`endpoint_id, received_at, outcome, lead_id, payload_excerpt, error_message`).
- Words: "Lead Webhooks"; "Generate webhook URLs for external systems to push leads directly into your studio. Supports any platform that can POST JSON (Zapier, Make, Typeform, Facebook Lead Ads, etc.)"; "How it works" 1-3 (… "The lead appears in your Leads page with pending_review status."); "Accepted JSON fields: name, phone, email, budget, property_type, notes, source. Also accepts common aliases like full_name, mobile, message."; "Generate webhook URL"; "New webhook endpoint"; helper "We generate a URL + key to paste into your Google Ads Lead Form." / "We generate a URL — connect Meta to it via a Zapier / Make bridge." / "A generic URL any system can POST leads to."; "Incoming leads are tagged with this source name."; "Internal — not shown to clients."; "Creating…"; "Connect in Google Ads" / "Connect Meta via Zapier / Make" / "Webhook created"; "Webhook URL"; "Signing key"; "Shown once — copy it now. You can regenerate later, but the old key stops working."; Google steps ("…Click Send test data — you should see a green success. (Test leads are acknowledged but not saved.)"); Meta steps ("Map fields: full_name → name, phone_number → phone, email → email, plus any extras into notes."); "Done"; confirms "Revoke this webhook? Any external system using it will stop receiving leads." / "Regenerate the token? The old URL will stop working immediately."; toasts "Webhook URL copied", "URL copied", "Key copied", "Webhook created", "Failed to create webhook", "Webhook revoked", "Failed to revoke webhook", "Token regenerated — copy the new URL", "Failed to regenerate token"; "Recent activity"; "Loading logs..."; "No requests received yet."; outcome labels "Created", "Duplicate", "Invalid", "Unauthorized", "Rate limited"; empty "No webhook endpoints yet." / "Generate one above to start receiving leads from external systems."
- Reachable: yes.

### A-59 · Webhook receiver `POST /api/webhooks/leads/[token]`
- Where: `src/app/api/webhooks/leads/[token]/route.ts` (340 lines); parser `src/lib/webhook-lead-parser.ts`.
- Does, in order: (1) read raw body; > 64 KB → 413 "Payload too large"; unreadable → 400 "Bad request". (2) endpoint by `token` AND `is_active` else 404 "Not found" (inactive and unknown are indistinguishable). (3) rate limit 10 requests / 60 s per token (in-memory `checkRateLimit`, key `wh:<token>`) → log `rate_limited` ("Rate limit exceeded"), 429 "Too many requests". (4) generic endpoints with a `signing_secret`: `X-Signature` must equal hex HMAC-SHA256(secret, rawBody) (constant-time) else log `unauthorized` ("Invalid X-Signature"), 401 "Unauthorized". (5) parse: `application/x-www-form-urlencoded` → params object; anything else → JSON object (arrays/primitives rejected) else log `invalid` ("Parse error: …"), 400 `{ error: "Invalid body", detail }`. (5b) Google Ads endpoints: body `google_key` must equal the secret else log `unauthorized` ("Invalid google_key"), 401; `is_test === true|"true"` → log `test`, 200 `{ status: "test" }` with NO insert; fields from `parseGoogleAdsPayload` (A-61). Generic: `mapWebhookPayload` (A-60). (6) `name` required else log `invalid` ("Missing required field: name"), 400 `{ error: "Validation failed", detail: "name is required" }`. (7a) Google idempotency: an existing lead with the same `external_lead_id` in the studio → counters (duplicate), log `duplicate`, 200 `{ status: "duplicate", lead_id }`. (7) dedup (A-48): active match → counters, log `duplicate`, 200 `{ status: "duplicate", lead_id }`; archived → create with the note. (8) insert `leads`: `studio_id, name, phone, email, budget, property_type (raw text as sent), notes, source (payload source ?? endpoint source_label ?? "Webhook" / "Google Ads"), external_lead_id, ad_metadata, status: "new", bucket/lead_status_code = intake target (unassigned), email_lead_status: "pending_review", needs_attention: false, possibly_duplicate: false, contract_uploaded: false`. A Postgres 23505 on the `(studio_id, external_lead_id)` unique index (concurrent Google retry) is answered as `duplicate`. Other insert failure → log `invalid` ("Lead creation failed: …"), 400 "Failed to create lead". (9) RPC `increment_lead_webhook_counters(endpoint, lead_created, duplicate)`, log `lead_created`, dispatch `lead.captured` (A-93) with region-formatted budget, 200 `{ status: "created", lead_id }`.
- Rules: Public (no session); service-role client. `payload_excerpt` in the log = first 2000 chars of the body with `google_key` redacted. The created lead lands in the review queue (A-49) because of `email_lead_status = "pending_review"`, even though it is not an email lead. No assignee, no `country_code` (DB trigger fills the studio default).
- Data: `lead_webhook_endpoints`, `lead_webhook_log`, `leads`, `studio_lead_funnel`, `studios.country_code`.
- Words: as quoted.
- Reachable: yes.

### A-60 · Generic payload field mapping
- Where: `webhook-lead-parser.ts:30-83`.
- Does: First non-empty string wins: `name` ← `name | full_name | customer_name`; `phone` ← `phone | mobile | contact_number` then stripped to `[0-9+]`; `email` ← `email`; `budget` ← `budget | budget_amount | budget_cents` (number ≥ 0; when ONLY `budget_cents` is present the value is divided by 100); `propertyType` ← `property_type | propertyType | property`; `notes` ← `notes | message | comments`; `source` ← payload `source` else the endpoint's `source_label` else "Webhook".
- Reachable: yes.

### A-61 · Google Ads Lead Form payload mapping
- Where: `webhook-lead-parser.ts:97-175`.
- Does: `user_column_data[{column_id,string_value}]` flattened; standard ids `FULL_NAME, FIRST_NAME, LAST_NAME, EMAIL, WORK_EMAIL, PHONE_NUMBER, WORK_PHONE, POSTAL_CODE, CITY, REGION, COUNTRY, COMPANY_NAME, JOB_TITLE, STREET_ADDRESS`. name = FULL_NAME or "FIRST LAST"; phone = PHONE_NUMBER ?? WORK_PHONE stripped; email = EMAIL ?? WORK_EMAIL; notes = lines `"{COLUMN} → {value}"` for COMPANY_NAME/JOB_TITLE/STREET_ADDRESS/CITY/REGION/POSTAL_CODE/COUNTRY plus every custom question `"{id} → {value}"`; budget and propertyType always null; `externalLeadId` = `lead_id`; `adMetadata = { platform: "google_ads", campaign_id?, form_id?, adgroup_id?, gcl_id?, api_version? }`; `isTest` from `is_test`.
- Reachable: yes.

### A-62 · Qanvast-specific ingestion — what actually exists
- Where: `SourceChip` map; `gmail.ts detectPlatform`; `email-parser.ts inferCountryFromEmail`; `SG_CONFIG.emailDomainDefaults`.
- Does: There is no Qanvast API/marketplace integration. "Qanvast" appears only as (a) a lead source value (taxonomy / `DEFAULT_SOURCES`) with its own chip, (b) `@qanvast.com` in the default Gmail sender-domain list mapping to platform "Qanvast" and country SG, (c) a generic webhook a studio can label "Qanvast". The requirements CSV mentions DB columns `qanvast_lead_id` / `qanvast_company_id`; they do not appear in `src/types/database.ts` `DbLead` and no app code reads them. "Return Lead"/refund for Qanvast-sourced leads lives in the drawer + Qanvast Ops (hand-off).
- Reachable: n/a.

---

## Email ingestion (Gmail)

### A-63 · Gmail connection lifecycle (settings-side; hand-off for the UI)
- Where: `src/app/api/email/connect/route.ts`, `callback/route.ts`, `disconnect/route.ts`, `status/route.ts`; hooks `src/lib/queries/email-connections.ts`; UI in `src/app/(main)/settings/page.tsx` (hand-off).
- Does: Connect: session → HMAC-signed OAuth `state {studioId,userId}` → Google consent URL (scopes `gmail.readonly` + `userinfo.email`, offline, prompt=consent). Callback (public): verifies `state`, exchanges the code, reads the account email, encrypts both tokens (AES-256-GCM), upserts `email_connections` on `(studio_id, email_address)` with `sender_domains = ["@homereno.sg","@homerenoguru.sg","@houzz.com","@houzz.com.sg","@renopedia.sg","@qanvast.com"]`, `custom_domains = []`, `status: "active"`; redirects to `/settings?email_connected=<email>` or `?email_error=<oauth error|missing_params|invalid_state|db_error|exchange_failed>`. Status GET: the studio's connections (no token fields) + last 20 `email_sync_log` rows. Status PATCH: update `sender_domains` / `custom_domains` for a connection. Disconnect: revoke the refresh token at Google (best effort) then delete the connection (sync logs cascade).
- Rules: Any session member of the studio may do all of this (no owner gate). Multiple connections per studio are allowed. The callback's default domain list is hard-coded (SG list incl. `@houzz.com`) regardless of the studio's region (`REGION_CONFIGS[cc].emailDomainDefaults` exists per region but the callback does not use it).
- Data: `email_connections` (`provider, email_address, access_token_enc, refresh_token_enc, token_expiry, sender_domains[], custom_domains[], last_sync_at, last_sync_message_id, status active|paused|error|revoked, error_message`), `email_sync_log`.
- Words: statuses as listed; hooks' toasts in A-69.
- Reachable: yes.

### A-64 · Cron poll `GET /api/cron/poll-emails` — the ingestion algorithm
- Where: `src/app/api/cron/poll-emails/route.ts` (343 lines); Gmail helpers `src/lib/gmail.ts`; schedule `vercel.json` (`"* * * * *"` = every minute); auth `src/lib/cron-auth.ts` (`Authorization: Bearer $CRON_SECRET`, fails closed in production, open in dev when unset).
- Does, per `status = "active"` connection (optionally `?studioId=` for manual sync): (1) refresh the access token when `token_expiry` is missing or < 60 s away; on refresh failure set the connection `status: "error"`, `error_message: "Token refresh failed — please reconnect Gmail"` and skip. (2) Query = `from:{domain} OR from:{domain} …` over `sender_domains + custom_domains` (`"No sender domains configured"` error when empty) + ` after:{epoch of last_sync_at, or now−24h on first sync}`; list up to 20 messages. (3) Skip any message whose id already exists in `leads.email_source_message_id` for the studio. (4) For each new message: fetch full message; body = first `text/plain` part (top-level, then nested), else first `text/html`, else the snippet; platform = `detectPlatform(From)` over {homereno.sg, homerenoguru.sg → "Homereno"; houzz.com, houzz.com.sg → "Houzz"; renopedia.sg → "Renopedia"; qanvast.com → "Qanvast"}, else null; AI parse (A-70). If the AI call THROWS: create a lead `name: "Unknown (parse failed)"`, `notes` = first 2000 chars of the body, `needs_attention: true`, source = platform || "Email", and count a parse failure. Otherwise: `needsAttention = confidence === "low" || propertyType unmatched`; property type via `normalizePropertyType(raw, studioCountry)` (exact label/key in the region → key; bare "hdb" → `hdb_4_room`, "landed" → `landed_terrace`, "commercial" → `commercial_office` when the region has that key; cross-region label whose key also exists in this region; else keep the raw text and flag attention); dedup when the studio knob is on (active match → `possibly_duplicate` + `duplicate_of_lead_id`; archived → note); phone normalised to E.164 with the studio country; insert `leads` with `name || "Unknown"`, `budget`, `area` (the parser's `area` = "floor area" text in this prompt), `project_type`, `notes`, `source = (platform || "Email").toLowerCase().replace(/\s+/g,"_")` (so "homereno", "houzz", "renopedia", "qanvast", "email"), `status: "new"`, intake bucket/status, `needs_attention`, `possibly_duplicate`, `duplicate_of_lead_id`, `email_source_message_id`, `email_lead_status: "pending_review"`, `contract_uploaded: false`, `country_code` only when the parser inferred one. (5) Update `last_sync_at`, `last_sync_message_id`, clear `error_message`. (6) Insert `email_sync_log { emails_found, leads_created, duplicates_found, parse_failures, errors[]|null, processed_message_ids[] }`. Response `{ message: "Poll complete", results: [{ connectionId, emailsFound, leadsCreated, duplicatesFound, parseFailures, errors[] }] }`.
- Rules: The lowercased `source` slug is what the board displays after `formatSource` (transformers `SOURCE_MAP` covers `qanvast, instagram, referral, walk_in, facebook, organic, hangout, website`); "homereno" / "houzz" / "renopedia" / "email" have no mapping, so those leads show the raw lowercase slug and miss the `SourceChip` styles keyed "Homereno"/"Houzz"/"Renopedia"/"Email" (observed from code; not runtime-verified). Duplicates on this path are flagged, never dropped (unlike the webhook). Every email lead lands in the review queue (A-49).
- Data: as listed.
- Words: as quoted; "No active connections"; "Cron failed"; "DB error".
- Reachable: yes (cron + manual sync).

### A-65 · Manual sync from the review queue
- Where: `page.tsx:1516-1525, 1728-1734, 1754-1760`; `useManualSync` → `POST /api/email/sync` (`src/app/api/email/sync/route.ts`) which invokes the cron handler in-process for the session studio.
- Does: Spinner on the button; on completion invalidates connections + leads and toasts the created count.
- Words: "Sync"; toasts `"Sync complete — {n} new lead(s)"` / "Sync complete — no new leads" / "Email sync failed — try again".
- Reachable: yes (only visible while the review queue has ≥ 1 lead).

### A-66 · Email AI parse contract + country inference
- Where: `src/lib/email-parser.ts`.
- Does: Model `google/gemini-2.5-flash`, JSON mode, 1000 tokens; system prompt asks for `name, phone (digits only), email, budget (number), propertyType ("Property type, e.g. HDB/Condo/Landed/Commercial, Apartment, Villa etc."), propertyAddress, area ("floor area if mentioned"), projectType ("e.g., Renovation-Full Home, New-Full Home"), remarks, confidence ("high/medium/low")`; user message `"Sender: {from}\n\nEmail body:\n---\n{body}\n---"`. `DRY_RUN` or no `OPENROUTER_API_KEY` → mock "John Tan" lead. Country inference (only when the model gave none): sender domain lists — EG: propertyfinder.eg, aqarmap.com.eg, olx.com.eg, nawy.com, connect.sakneen.com; AE: propertyfinder.ae, bayut.com, dubizzle.com; SG: qanvast.com, homereno.sg, renopedia.sg, houzz.com.sg — then phone prefix `+971` AE, `+20` EG, `+65` SG, `+60` MY, `+91` IN; else null (DB trigger → studio default).
- Rules: Note the email prompt's `area` means FLOOR AREA whereas the document prompt's `area` means LOCALITY; both write to the same `leads.area` column.
- Reachable: yes.

### A-67 · Source display vocabulary (`SourceChip`)
- Where: `src/components/ui/badges.tsx:137-161`; `formatSource` `src/lib/transformers.ts:184-189`.
- Does: Known chips: "Qanvast" (Q), "Instagram", "Facebook", "Referral", "Walk-in", "Website", "Organic", "Homereno" (H), "Houzz" (Hz), "Renopedia" (R), "Hangout" (displayed as "Qanvast Hangout"), "Email". Any other value renders as plain text in the neutral style; a missing source renders "Unknown". `formatSource` maps legacy lowercase slugs (`qanvast, instagram, referral, walk_in, facebook, organic, hangout, website`) to display names; everything else passes through unchanged.
- Reachable: yes.

---

## Bulk actions

### A-68 · Filter-driven bulk assign ("Assign N")
- Where: `page.tsx:220-237, 619-623, 1284-1295, 2239-2245`; dialog `src/components/leads/bulk-assign-dialog.tsx`; hook `useBulkAssignLeads` `src/lib/queries/leads.ts:332-350`.
- Entry: header button "Assign {n}" shown when `canBulkAssign` and the currently visible (status-filtered) set is non-empty.
- Does: Opens the dialog in `filter` mode with `leadIds = statusFiltered ids` (exactly what the board shows). Dialog: "Assign to" select of `assignableMembers` (members with the `id` tag — note: NOT the role `isAssignable` rule used by the New Lead drawer) plus "Unassign — clear the assignee"; a caution line when > 200; if > 2000 the select is replaced by a warning and the submit is disabled. Submit → `POST /api/leads/mutations/bulk-assign` → toast with assigned/skipped counts; the dialog closes and resets.
- Rules: `canBulkAssign = !isAssignmentLockedForActor(tags)` = false only for a member who has the `id` tag and none of `manager`/`admin`/`owner` — applied client-side regardless of the manager-hierarchy flag (the server only enforces the lock when the flag is on). No notifications are sent by design.
- Words: button "Assign {n}" (title `"Assign the {n} leads matching the current filters"`); dialog title `"Assign {n} lead(s)"`; description "Everything currently shown on the board." (or `"Everything currently matching {summary}."`) + " Change the filters behind this dialog to narrow it."; "Assign to"; "Pick a member…"; "Unassign — clear the assignee"; `"This rewrites the assignee on {n} leads and can't be undone in one click. It does not notify anyone."`; over-cap `"That's {n} leads — more than 2000 in one go. Narrow the filters and run it in batches."`; "Cancel"; "Assigning…"; submit `"Assign {n} lead(s)"`; toasts `"{a} lead(s) assigned to {name}."` / `"{a} lead(s) unassigned."` / `"{a} lead(s) {…}. {s} skipped — outside your access."`; error "Couldn't assign these leads." (or the server message).
- Reachable: yes.

### A-69 · List-view multi-select + selection bar
- Where: `page.tsx:625-659, 2166-2178, 2185-2226`; pure rules `src/lib/leads/lead-selection.ts`.
- Entry: checkbox column in the list view (only when `canBulkAssign`); not available on kanban or mobile.
- Does: Row checkbox toggles; shift-click extends a range over the CURRENT rendered order (filtered + sorted) from the last clicked row — a range only ADDS; without an anchor or with an off-screen anchor it degrades to a plain toggle. Header checkbox = select all rows currently in the table (the filtered set, not just mounted rows) / clear when all selected (indeterminate when some). Selection SURVIVES filter changes: the bottom bar shows visible count, hidden count, "Clear", and "Assign" (disabled when 0 visible) which opens the dialog in `selection` mode with the VISIBLE selected ids only; closing that dialog clears the selection.
- Words: bar `"{n} selected"`, `"{h} hidden by filters"`, "Clear", "Assign"; dialog description in selection mode `"The {n} lead(s) you selected. Close this to change the selection."`.
- Reachable: yes (desktop list view).

### A-70 · `POST /api/leads/mutations/bulk-assign` rules
- Where: `src/app/api/leads/mutations/bulk-assign/route.ts`; `src/lib/leads/bulk-assign.ts`.
- Does: `leadIds` deduplicated, blanks dropped, 1..2000 (400 "leadIds must be an array" / "leadIds required" / "Too many leads at once — 2000 maximum per request."); `memberId` string or null (= unassign). With the hierarchy flag on: a locked designer → 403 `{ error: "Your role can't reassign leads.", code: "ASSIGNMENT_LOCKED" }`. Target member must exist in the studio (404 "Assignee not found") and be active (400 "That member is deactivated."). Manager scope narrows the id list (`skipped` = dropped count; 0 allowed → `{ success, assigned: 0, skipped }`). `owning_manager_id` resolved by `resolveOwningManagerUpdate` (owner/admin → the target if manager-tagged else NULL; a manager assigning themselves → self; a manager assigning someone else → untouched). In chunks of 400: delete all `lead_assignees` for the chunk, insert one row per lead (`commission_split_bps: 10000`, `added_by`) when assigning, then `leads.assigned_to = memberId` (+ `owning_manager_id` when applicable). Returns `{ success: true, assigned, skipped }`. A failing chunk returns 500 with the partial `assigned` count.
- Rules: No `first_assigned_at` stamp, no notification, no activity log on this path.
- Reachable: yes.

---

## Archive

### A-71 · Archived Leads view (from the ⋮ menu)
- Where: `page.tsx:204, 1266-1268, 1473-1479`; `src/components/accounts/archived-leads-section.tsx`; `useArchivedLeads` / `useReviveLead` `src/lib/queries/leads.ts:825-845, 570-588`; `GET /api/leads/mutations/archived`.
- Does: Replaces the board with the archived list (max-width panel) and a "Back to Leads" button. Rows: name, phone, `"via {source}"`, `"archived today"` / `"archived {n} day(s) ago"`, "Revive" button → `POST /api/leads/mutations/[id]/unarchive`. The list route returns `id, name, phone, email, source, bucket, lead_status_code, archived_at, created_at` + embedded assignees, `archived_at IS NOT NULL`, newest archive first, manager-scoped like the main list.
- Rules: No purge ever runs; copy deliberately promises retention until revived.
- Words: "Archived Leads"; "Leads that have been archived. They stay here until you revive them."; "Archived leads are hidden from the board and reports. Use the Revive button to restore a lead to its original status."; "No archived leads" / "Leads you archive will appear here."; "Revive"; toasts `"\"{name}\" revived and restored to leads"`, "Failed to revive lead"; "Back to Leads"; menu item "Archived Leads".
- Reachable: yes.

### A-72 · Archive / unarchive routes (permission, blockers, cascade)
- Where: `src/app/api/leads/mutations/[id]/archive/route.ts`, `unarchive/route.ts`; `src/lib/lifecycle/transitions.ts`. The archive ENTRY POINT is the drawer's ⋮ → "Archive" (hand-off).
- Does: Both gated on `leads.delete` resolved from the studio role whose slug matches the member's highest tag (owner > admin > accounting > id) with tag fallback (owner/admin true, id false). Archive: unless `{ force: true }`, live signing links (`quote_signature_requests` status pending/viewed, not expired) block with 409 `{ blockers: [{ code: "LIVE_SIGNATURE_REQUEST", label, count }] }`; the client re-posts with `force`. Then `archived_at = now()`, cascade: cancel the lead's open tasks (NotStarted/InProgress → Cancelled) and delete scheduled notifications for those tasks and for the lead itself (follow-up reminder, hold revisit ping); activity log row. Unarchive: `archived_at = null`, log row; cancelled tasks are NOT restored.
- Words: 403 "You don't have permission to archive leads." / "You don't have permission to revive leads."; blocker label "A signing link is still live with the client. Cancel it first, or archive anyway to void it." / `"{n} signing links are still live with clients. Cancel them first, or archive anyway to void them."`; activity "Lead archived" / "Lead archived (live signing link voided)" / "Lead revived from archive".
- Reachable: yes.

### A-73 · Delete
- Does: No hard delete of a lead exists anywhere (only archive/revive). `RolePermissions.actions.leads.delete` is what gates ARCHIVE.
- Reachable: not present.

---

## Reports / cards (TAT, response time, performance, conversion readiness)

### A-74 · Performance view (Leads → third view)
- Where: `src/components/leads/lead-performance-view.tsx`; `useTatReport` `src/lib/queries/leads.ts:1842-1856`.
- Entry: view toggle (owner/admin, desktop).
- Does: Range chips "Last 30 days" (default) / "Last 90 days" / "All time" → `GET /api/leads/tat-report?days=30|90|all`. Three KPI cards — "Creation → Assignment", "Assignment → First outreach", "First outreach → Signed" — each: median as the headline, "median · avg {x} · {n} leads", and a delta pill vs the prior window of equal length (`round((cur−prior)/prior×100)`; hidden when either is null/0 or the change is 0; a DECREASE is "improving"). Awaiting pills when > 0. Table "By team member": columns "Member" (name + role label), "Leads", "Assign → First outreach" (median coloured by `tatGrade` + "med · avg x"), "First outreach → Signed" ("med"), "Signed", "Awaiting outreach" (badge). Footnote.
- Rules: `formatTatDuration`: < 60 min → `"{m}m"`; < 48 h → `"{h}h"` (1 decimal unless integer); else `"{d}d"`; null → "—". `tatGrade` (assignment→outreach only): ≤ 8 h good, ≤ 24 h warn, else bad.
- Words: as quoted plus "Filtering on lead created date · {n} leads in range"; "Couldn't load the TAT report. Refresh to try again."; `"{n}% vs prior"`; `"{n} leads awaiting assignment"`; `"{n} assigned, no outreach logged yet"`; "By team member"; "Outreach & conversion attributed to whoever logged the first outreach"; "No leads in this range."; "Medians shown as headline (robust to outliers). Leads with no outreach yet are excluded from elapsed-time math and counted in “Awaiting outreach”."; role labels "Studio Owner", "Admin", "Accounting", "Interior Designer".
- Reachable: yes (owner/admin).

### A-75 · TAT report computation (`GET /api/leads/tat-report`)
- Where: `src/app/api/leads/tat-report/route.ts`; pure `src/lib/leads/tat-report.ts`.
- Does: 403 "Forbidden: owner/admin access required" unless the member's tags include owner or admin; 400 "days must be 30, 90 or all". Window = leads with `created_at ≥ now − days` (all time when `all`), `archived_at IS NULL`; prior window = the preceding equal span (none for `all`). Per lead: `creation→assignment = first_assigned_at − created_at`, `assignment→outreach = first_outreach_at − first_assigned_at`, `outreach→signed = signed_at − first_outreach_at`; missing endpoints excluded; negatives clamped to 0. Stage = median (even count → mean of the two middles), mean, count. `awaitingAssignment` = open leads (bucket ≠ the funnel's terminal bucket via `resolveFunnelRoles`) with no `first_assigned_at`; `awaitingOutreach` = open, assigned, no outreach. Member rows: `leadsAssigned` counts every lead each CURRENT assignee is on (junction, chunked 200); outreach and conversion stages + `signedCount` attributed to `first_outreach_by` (a `profiles.id` mapped to the member); `awaitingOutreach` per current assignee; sorted by `leadsAssigned` desc.
- Data: `leads (id, created_at, bucket, first_assigned_at, first_outreach_at, first_outreach_by, signed_at)`, `lead_assignees`, `studio_members (id, user_id, tags)`, `profiles.full_name`, `studio_lead_funnel`.
- Reachable: yes.

### A-76 · TAT milestone stamps (write-once)
- Where: `src/lib/leads/tat-stamps.ts`; callers: create route + assignee route (`first_assigned_at`), outreach-attempt routes (`first_outreach_at/by`, re-stamped EARLIER for backdated attempts), e-sign submit / journey signed / manual SIGNED moves (`signed_at`) — the latter two are hand-offs.
- Does: Conditional UPDATEs (`IS NULL`) so a value is never overwritten; failures are logged and swallowed; reassignment or attempt deletion never clears a stamp.
- Reachable: yes.

### A-77 · Response time card (per-lead TAT widget)
- Where: `src/components/leads/lead-response-time-card.tsx`; mounted at the top of the drawer's Status & Activity tab (hand-off for the mount).
- Does: Three rows "Created → Assigned", "Assigned → First outreach", "First outreach → Signed" with state done / running (amber, live clock re-rendered every 60 s, `"{dur} — running"`) / pending ("pending"); sub-lines `"{created} → {assigned}"`, "not assigned yet", `"first outreach {when} · {name}"`, "no outreach logged yet", `"signed {when}"`, "not signed yet", "—"; header pill "SIGNED" / "IN PROGRESS"; footer "Created → Signed" (total) or "Lead age". The middle row's done value is colour-graded by `tatGrade`. Renders nothing if `createdAt` is unparsable.
- Words: "Response time"; as quoted.
- Reachable: yes (in the drawer).

### A-78 · Conversion readiness card
- Where: `src/components/leads/conversion-readiness-card.tsx`; used by the drawer (hand-off for wiring and the callbacks).
- Does: Checklist gated by workflow toggles (each shown unless its toggle is explicitly `false`): "Designer assigned" (`hasAssignment`; action "Assign"), "Quote approved" (`quoteStatus ∈ approved | sent_for_signature | client_signed`; action "Create quote"; detail = quote total), "Contract uploaded" (action "Upload now"; detail file name or "Uploaded"), "Project type selected" (action "Select type"). "Convert to Project" enabled only when every shown item is complete. Hidden entirely when the lead already has a project or no gates are active.
- Data: `WorkflowToggles.requireAssignment / quoteApprovalRequired / contractRequired / projectTypeRequired`.
- Words: as quoted; "Convert to Project".
- Reachable: yes (in the drawer).

---

## Mobile-specific behaviour

### A-79 · Mobile / tablet card list with bucket tabs and swipe
- Where: `page.tsx:239-261, 392-401, 1315-1353, 1999-2090`; `src/components/leads/lead-mobile-list.tsx`, `lead-mobile-card.tsx`.
- Does: Below `lg` (1024px) the view toggle is hidden and cards always render. A horizontal tab strip: "All" (count = filtered set) then one tab per bucket (incl. "Uncategorized" when present) with its count. Selecting a tab scrolls it into view and scrolls the page to top. Swipe over the card area switches tabs: horizontal delta ≥ 60px, horizontal dominant, under 400 ms; left → next tab, right → previous. Cards mirror the kanban card (A-06) with two differences: entrance delay step 40 ms, and when on "All" with no sub-status the card shows the bucket dot + bucket label instead. A bucket tab applies that bucket's status filter (A-05). Phones (< 640px) get a second search box above the cards; the filter chips sit under it. The list is virtualised (150px estimate).
- Rules: The Performance view is unreachable on mobile; the review queue uses the compact card + full-screen overlay (A-49); bulk assign is filter-driven only (no checkboxes).
- Words: "All"; bucket labels; empty states A-31.
- Reachable: yes.

---

## Permissions and roles

### A-80 · Permission matrix for this slice
- Where: `src/lib/access-control.ts`; the routes cited above.
- Does:
  - Reach `/leads`: tags owner, admin, id (accounting excluded) via `ROUTE_ACCESS`, or `rolePermissions.pages["leads"]` when role rows exist.
  - See leads: owner/admin all; id-only assigned (client-side only); manager (flag) own/assigned scope (client + server).
  - Add Lead / "C": `leads.create` (effective permissions).
  - Bulk assign (both shapes): client hides for id-only-without-manager; server 403 only under the hierarchy flag.
  - Performance view + TAT API: owner or admin tag.
  - Archive / revive: `leads.delete`.
  - Review queue actions (approve/reject/keep/merge/approve-all), CSV export, document prefill, webhook + Gmail management, manual sync: any studio member with a session (no role gate) — the requirements CSV flags this as a gap versus the "owner-only" intent.
  - Lead experience toggle menu item: shown to `isOwner` only (the target tab does not itself enforce owner).
  - Tag-derived defaults (when no `studio_roles` row): `leads: { create: id||admin, edit: id||admin, delete: admin, assign: admin, view_all: admin }` (owner implies admin).
- Reachable: yes.

### A-81 · Manager hierarchy (Dyel-only flag) touch points in this slice
- Where: `src/lib/leads/manager-hierarchy.ts`, `manager-scope-guard.ts`; flag `studios.settings.features.lead_manager_hierarchy` (default false).
- Does: Roles: owner → manager (`manager` tag layered on `id`) → designer (`id` only). Read scope (list, archived list, by-id) and write guards (bulk-status, bulk-assign, engagement/close/follow-up/journey-step — the last four are hand-offs) share one rule: own the `owning_manager_id` stamp OR be the scalar assignee OR be on the junction. `ASSIGNMENT_LOCKED` blocks a plain designer from assigning to anyone but themselves (create) or reassigning at all (single/bulk). Stamping rules in A-44/A-70. Read of the flag on the hot list route fails OPEN (flag off); mutation guards fail CLOSED (500).
- Reachable: behind the flag.

---

## Feature flags / region gating

### A-82 · Studio feature flags and workflow toggles that affect this slice
- Where: `src/lib/queries/studio-config.ts:648-700` (`StudioFeatures`, `DEFAULT_FEATURES`), `DEFAULT_WORKFLOW`; stored in `studios.settings.features` / `settings.workflow`.
- Does: `leadJourneyMode` (DB `lead_journey_mode`) — default TRUE in `DEFAULT_FEATURES` (the spec said default off; the page treats a missing value as false but the API merges defaults so it is effectively on unless a studio sets `false`); switches cards to show the mini-rail and the intro banner, drawer to Journey mode (hand-off). `duplicateDetectionEnabled` (`duplicate_detection_enabled`) — default true; gates flagging on manual create + email cron (webhook always checks). `leadManagerHierarchy` (`lead_manager_hierarchy`) — default false. Workflow: `autoCreateFollowUps` (follow-up task auto-creation, hand-off), `requireAssignment`, `quoteApprovalRequired`, `contractRequired`, `projectTypeRequired` (readiness card + drawer gates, hand-off). The "Lead experience" toggle UI (`src/app/(main)/accounts/lead-experience-tab.tsx`, hand-off) toasts "Journey mode enabled" / "Switched back to Classic".
- Reachable: yes.

### A-83 · Region configuration consumed by lead creation and listing
- Where: `src/lib/region-config.ts`; `SUPPORTED_COUNTRIES = ["SG","MY","AE","IN","EG"]`; `getRegionConfig` falls back to SG.
- Does: Per region — phone rule (dial code, digit count, leading pattern, placeholder), currency symbol, property types (key → label), property statuses, possession timeline, design styles, regions (used as the `/leads/new` area default), default email sender domains:
  - SG: +65, 8 digits, starts 6/7/8/9, "8123 4567"; S$; types HDB 2-Room…HDB Executive, BTO 3/4/5-Room, Executive Condo, Condo, Penthouse, Landed — Terrace / Semi-D / Bungalow, Commercial — Office / Retail, Others; statuses "New", "Resale", "Existing"; timeline "Collected", "in 3 months", "in 6 months", "in 9 months", "Later"; styles Eclectic, Industrial, Modern, Contemporary, Vintage, Scandinavian, Transitional, Minimalist, Japandi, No preference; regions North, North East, East, West, Central; email domains @homereno.sg, @homerenoguru.sg, @houzz.com.sg, @renopedia.sg, @qanvast.com.
  - MY: +60, 9–10 digits, starts 1; RM; types Apartment, Condominium, Serviced Residence, Terrace, Semi-D, Bungalow, Townhouse, SOHO, Commercial — Office / Retail, Others; statuses "New", "Sub-sale", "Existing"; timeline "Received keys", "in 3 months", "in 6 months", "in 12 months", "Later"; styles Modern, Contemporary, Minimalist, Industrial, Scandinavian, Tropical, Japandi, Transitional, No preference; regions KL, Selangor, Penang, Johor, Sabah, Sarawak, Others; domains @recommend.my, @atap.co, @iproperty.com.my.
  - AE: +971, 9 digits, starts 5; AED; types Studio, Apartment — 1/2/3 BR, Penthouse, Townhouse, Villa, Commercial — Office / Retail, Others; statuses "Off-plan", "Ready", "Existing"; timeline "Handed over", "in 3 months", "in 6 months", "in 12 months", "Later"; styles Modern, Contemporary, Minimalist, Luxury, Arabic, Mediterranean, Industrial, Transitional, No preference; regions Dubai, Abu Dhabi, Sharjah, Ajman, Others; domains @propertyfinder.ae, @bayut.com, @dubizzle.com.
  - IN: +91, 10 digits, starts 6–9; ₹; types 1–4 BHK, Penthouse, Villa, Independent House, Row House, Duplex, Commercial — Office / Retail, Others; statuses "Under Construction", "Ready to Move", "Existing"; timeline "Possession received", "in 3 months", "in 6 months", "in 12 months", "Later"; styles Modern, Contemporary, Minimalist, Traditional Indian, Transitional, Industrial, Scandinavian, Bohemian, No preference; regions Mumbai, Delhi NCR, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Others; domains @magicbricks.com, @99acres.com, @housing.com, @nobroker.in.
  - EG: +20, 10 digits, starts 10/11/12/15; E£; types Apartment, Villa, Duplex, Penthouse, Studio, Commercial — Office / Retail, Others; statuses "Under Construction", "Ready to Move", "Existing"; timeline "Received keys", "in 3 months", "in 6 months", "in 12 months", "Later"; styles Modern, Contemporary, Minimalist, Classic, Arabic, Mediterranean, Industrial, Neo-Pharaonic, No preference; regions Cairo, Giza, Alexandria, New Cairo, 6th of October, Others; domains @propertyfinder.eg, @aqarmap.com.eg, @olx.com.eg, @nawy.com, @connect.sakneen.com.
- Rules: A lead's own `country_code` (set from the phone prefix at creation; DB trigger fills the studio default otherwise) drives its currency symbol on cards and the dropdown options; multi-country studios (`user.supportedCountries.length > 1`) get all their dial codes in the phone picker.
- Reachable: yes.

### A-84 · Studio taxonomies feeding this slice
- Where: `useTaxonomies(studioId, "lead_source")`; Accounts → Lead Sources editor (hand-off).
- Does: `lead_source` names populate the Source filter (A-27) and both create forms' Lead Source dropdown; migration 274 seeds "Google Ads" and "Meta Ads". Lead Categories exist as a taxonomy but have no field on the lead and no effect on the list (per the requirements CSV).
- Reachable: yes.

---

## Other

### A-85 · Lead record — fields visible to this slice
- Where: `src/types/database.ts:12-151` (`DbLead`), `src/types/app.ts:129-243` (`Lead`), `transformLead`.
- Does: `leads` columns: `id, studio_id, assigned_to (scalar mirror of the first junction member), owning_manager_id, name, email, phone, budget, property_type, area, property_status, style_preference, area_sqft, area_unit, key_collection_date, property_address, notes, additional_info, external_lead_id, ad_metadata, status (legacy text: new/assigned/…), source, bucket, lead_status_code, sub_status_code, next_follow_up_date, next_follow_up_time, project_type, quote_status, quote_data, quote_metadata, quote_hierarchy_metadata, contract_uploaded, contract_file_name, signature_request_id, ic_number, customer_id, quote_valid_until, possibly_duplicate, duplicate_of_lead_id, needs_attention, email_source_message_id, email_lead_status, temp, temp_reason, ai_intent_score, ai_fit_score, ai_reason, ai_draft_message, ai_draft_generated_at, archived_at, country_code, company_id, engagement_state, hold_restart_date, hold_prev_state, closed_reason_code, closed_reason_detail, journey_overrides, first_assigned_at, first_outreach_at, first_outreach_by, signed_at, agent_idempotency_key, created_at, updated_at`. Junction `lead_assignees (lead_id, member_id, commission_split_bps, added_at, added_by)`. `Lead.temp` defaults to "warm" when null; `Lead.type` = region label of `property_type`; `Lead.date` = relative time.
- Reachable: n/a.

### A-86 · Notifications raised by this slice's writes
- Where: `src/lib/notifications/events.ts:152-196`; dispatchers `src/lib/leads/notify-assigned.ts`, webhook route.
- Does: `lead.assigned` — recipients: the newly assigned members (fixed) + default roles owner, admin; variables `lead_name, assignee_name, assignees_list, assigned_by, lead_phone, lead_email, source, budget (region formatted), property_type (label), area, bucket, status_label, action_url`; fired once per user action by the create route (and the assignee/PATCH routes — hand-off), never by bulk assign. `lead.captured` (critical) — owner, admin; fired only by the webhook on a real insert; variables `lead_name, source, lead_phone, lead_email, budget, property_type, action_url`. `lead.status_changed` and `lead.followup_reminder` (30 min before, channels in_app/email/whatsapp, scheduled by `app-context.updateLead`) belong to the drawer / stage engine (hand-off). The legacy `POST /api/leads/[id]/assign` is a notify-only shim kept for stale bundles (`{ success: true, deprecated: true }`).
- Reachable: yes.

### A-87 · Other lead intake surfaces (hand-offs, named for completeness)
- Where: `src/app/api/hangouts/admin/lead/route.ts` (Qanvast Hangout admin creates leads with source "Hangout"), `src/lib/agents/executors.ts` (mAIson agent `create_lead` tool, with `agent_idempotency_key`), `src/lib/project-lead.ts` (`createLeadForProject` → parked lead, A-44), the lead detail drawer's Edit mode (A-34).
- Does: All resolve the intake bucket via `resolveIntakeTarget` and (except parked) run the shared duplicate detector under the studio knob.
- Reachable: yes.

### A-88 · ⋮ menu on the Leads header
- Where: `page.tsx:1255-1278`.
- Does: "Export as CSV" (A-54); "Archived Leads" (A-71); owner-only separator + `"Lead experience: {Journey|Classic}"` → `router.push("/accounts?tab=lead-experience")`.
- Words: "More options"; "Export as CSV"; "Archived Leads"; "Lead experience: Journey" / "Lead experience: Classic".
- Reachable: yes.

### A-89 · Lead scoring / temperature on the board
- Where: `Lead.temp`, `TempBadge` (`badges.tsx:13-69`), `page.tsx:58, 97-98` comments.
- Does: `temp` ("hot"/"warm"/"cold"; `/leads/new` also offers "Cool") is stored and used for the header "N hot" count and the "Hot" quick filter; the visible temperature badge and AI fit pill are commented out on every card pending "backend lead scoring review". `TempBadge` shows `temp.toUpperCase()` with an AI-reason tooltip ("AI Lead Prioritiser · based on lead events") but is unmounted on this page.
- Reachable: data yes; badge hidden.

---

## Uncertain / not verified

1. **Display of cron-created sources** ("homereno", "houzz", "renopedia", "email" stored lowercase; only `qanvast/instagram/referral/walk_in/facebook/organic/hangout/website` are mapped back to display names in `transformers.ts SOURCE_MAP`). Inferred from code that such leads render the raw slug without a styled chip; not observed at runtime.
2. **`leadJourneyMode` effective default**: `DEFAULT_FEATURES.leadJourneyMode = true` while the spec says opt-in/off; whether `/api/studio-config/features` merges `DEFAULT_FEATURES` for a studio with no `settings.features` was not read (the route file was outside this slice). The page itself treats a missing value as `false`.
3. **`qanvast_lead_id` / `qanvast_company_id` columns** are asserted by `docs/openmaison-v1-feature-requirements.csv` but are absent from `DbLead` in `src/types/database.ts`; no code reads them. Not verified against migrations.
4. **`/api/identity/members`** was only grepped (`.eq("is_active", true)` at line 48) — inferred that the assignee pools and the Member filter exclude deactivated members.
5. **`/api/studio-config/taxonomies`, `/funnel`, `/roles`, `/role-permissions`, `/features`, `/journey`** routes were not read; their shapes are taken from the hooks that call them.
6. **`processingQuote=1`** query param written by `/leads/new` has no consumer in `src` (grep) — treated as dead.
7. **`LeadFlags`** in `page.tsx` is defined and never rendered (grep shows only the definition) — treated as dead code.
8. The **hangout admin** and **agent `create_lead`** intake surfaces were located but not read; only their use of `resolveIntakeTarget` is confirmed.
9. Whether the **New Lead drawer's `assignableMembers`** (id tag OR assignable role) versus the **bulk-assign** pool (id tag only) is intentional could not be determined — reported as observed.
10. The exact wording of the drawer's **Archive** entry and confirm (blockers rendering) lives in `lead-detail-drawer.tsx`, which was not read (other reader).
