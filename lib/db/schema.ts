import { relations, sql } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text, unique, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * ⚠ PROVISIONAL — identity/tenancy plumbing only.
 *
 * These three tables exist to make sign-in work. The multi-tenant shape
 * (user → membership → organization) is an ASSUMPTION that has not been
 * confirmed against the OpenMaison 2.0 mocks. Confirm or correct it before
 * building on it.
 *
 * All domain tables (projects, rooms) were REMOVED — they were invented.
 * The real domain model must be derived from the Figma mocks.
 */

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    // scrypt hash (the prototype never signs in — the demo user is seeded)
    passwordHash: text('password_hash').notNull(),
    ...timestamps,
  },
  (table) => [unique('users_email_unique').on(table.email)],
)

export const organizations = sqliteTable(
  'organizations',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    ...timestamps,
  },
  (table) => [unique('organizations_slug_unique').on(table.slug)],
)

export const memberships = sqliteTable(
  'memberships',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    unique('memberships_user_org_unique').on(table.userId, table.organizationId),
    index('memberships_org_idx').on(table.organizationId),
    index('memberships_user_idx').on(table.userId),
  ],
)

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}))

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
}))

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
}))

// ---------------------------------------------------------------------------
// Leads domain — phase 1 (Lead Listing). Enum VALUES live in lib/leads/enums.ts
// (verbatim from the mocks); stored as text to keep sqlite simple.
// ---------------------------------------------------------------------------

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),               // 'dane', 'james', ...
  name: text('name').notNull(),
  role: text('role').notNull(),              // Owner | Admin | Manager | Designer (REG-601)
  color: text('color').notNull(),            // avatar tint hex, or 'photo'
  /* (REG-667 · pending modules S43A) The member the demo's STANDING session is — a browser that never signed in or out — moved by View as and
     put back on Dane by Reset. Never "you": a browser that signed in by a code is the member its own session names (`studio_sessions`), so
     who you are is asked of lib/db/session.ts (`sessionMemberId()`, `withYou`) — the one place that reads this flag for the app. The property
     is named apart from the `isYou` the app's member rows carry so that nothing can read the flag as "you" by mistake. */
  standingYou: integer('is_you', { mode: 'boolean' }).notNull().default(false),
  managerId: text('manager_id'),             // (REG-601) the Manager this Designer reports to — the manager's team
  email: text('email'),                      // (REG-560) the member's work email — `{prepared_by_email}` on quotes; seeded on the studio's domain by repair R36
  // Quote editor › Signature (1240:34176, REG-421; owner 2026-09-11: "signature saved per member"): how the member signs —
  // `draw` keeps an SVG path in `signatureData` (viewBox 752×140), `type` prints `signatureName` in the signature face.
  signatureKind: text('signature_kind'),     // draw | type | image | null = not set up — (Dane UAT 6.23) `image` keeps an uploaded PNG / JPEG ≤ 1 MB as a data URL in `signatureData`
  signatureName: text('signature_name'),
  signatureData: text('signature_data'),
  /* (pending modules S03 — 1.0's member_signatures.auto_apply · consent_at, "Revocable anytime") May the studio put this member's signature on
     the quotes and contracts they prepare? 'yes' · 'no' · null = never answered. Documents print it only on 'yes'; `_at` = when they said so. */
  signatureConsent: text('signature_consent'),
  signatureConsentAt: integer('signature_consent_at', { mode: 'timestamp' }),
  // (REG-612, parity Q-27) 1.0's studio_members.accepting_leads · lead_preferences · specialty — Open to new leads, the four
  // weighted preference dimensions (JSON, lib/company/preferences.ts) and the free-text specialty the suggestion scores.
  acceptingLeads: integer('accepting_leads', { mode: 'boolean' }).notNull().default(true),
  leadPreferences: text('lead_preferences'),
  specialty: text('specialty'),
  // (REG-646, settings parity Q-06) 1.0's studio_members.is_active: a member is deactivated, never deleted — their records stay theirs,
  // they leave every picker; `deactivated_at` says since when. `phone` is 1.0's profiles.phone, set when a member is added.
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  deactivatedAt: integer('deactivated_at', { mode: 'timestamp' }),
  phone: text('phone'),
  // (gaps build H, H-Q22) The portal's About page › Our team: the studio's own members, shown when the studio says so — a job title (the role
  // when blank), a photo (`studio_pictures.id`) and two lines about them. 1.0 typed these people by hand (M-195).
  portalShown: integer('portal_shown', { mode: 'boolean' }).notNull().default(false),
  portalTitle: text('portal_title'),
  portalBio: text('portal_bio'),
  portalPhotoId: text('portal_photo_id'),
  /* (pending modules S27 — 1.0's id_profiles.years_experience, api:designer-portfolio-profiles) the member's years in interior design, on their
     public card (the portal's Our team, a Hangout page); null = not said. What they are known for is their `specialty`; their work is
     `member_portfolio_projects`. */
  portalYears: integer('portal_years'),
  /* (gaps build I, I-Q3) How many running projects this member can carry at once — the Projects listing's Workload view measures against it;
     null = the studio's default (Settings › Projects › Workload). Owners and Admins set it. */
  projectCapacity: integer('project_capacity'),
  /** (simplify round 2 — F1 §6.9.3) the member's PayNow (a mobile number or a UEN), shown where a claim or their commission is paid */
  paynow: text('paynow'),
  /* (pending modules S08 — 1.0's welcome-modal.tsx, which kept "seen" per browser) A member's first visit: a member is owed the one short welcome
     (`welcome_due`) from the moment they are added — Company › Members › Add member, a new studio's owner — until they first open the app;
     `welcomed_at` = that first visit. A member from before the welcome existed is owed none (the default), so a restored demo never shows it. */
  welcomeDue: integer('welcome_due', { mode: 'boolean' }).notNull().default(false),
  welcomedAt: integer('welcomed_at', { mode: 'timestamp' }),
  /* (pending modules S18 — Leads Q-42 · Q-43 opened: 1.0's digest mode and "who hears each notice", as a member's own) What reaches this member
     and how, set on Your profile › Your notifications (lib/notifications/personal.ts): `notice_email` 'daily' = their emails come as one
     summary at 8 AM (urgent ones still at once), null = as they happen; `notice_muted` = the events (a JSON list of keys) that never reach
     them — no bell row, no email, no WhatsApp. The studio's own rules (Settings › Notifications) still decide what goes out at all.
     `notice_email_at` = when they chose the summary: the first one goes at the next 8 AM after it (1.0's cron sent at 8, never on the switch). */
  noticeEmail: text('notice_email'),
  noticeEmailAt: integer('notice_email_at', { mode: 'timestamp' }),
  noticeMuted: text('notice_muted'),
  /* (the Dashboard redesigned, 2026-10-26 — his marks P-02 · Q-06 · Q-07 on https://claude.ai/artifact/5d1yTNS7mtU47teLjeP2WY) The member's
     visits to the Dashboard: `dashboard_seen_at` = their latest view; `dashboard_since_at` = the mark "Since you were last here" counts from —
     the view before this sitting's (a new sitting starts when the latest view is more than `SITTING_GAP` old, lib/dashboard/since.ts). Both
     move with the demo day on a restore (lib/db/time-columns.ts). `dashboard_prefs` = their own page (a JSON object, lib/dashboard/frame.ts
     `DashPrefs`): the cards they hid for themselves and an Owner's or Admin's Studio / Mine. */
  dashboardSeenAt: integer('dashboard_seen_at', { mode: 'timestamp' }),
  dashboardSinceAt: integer('dashboard_since_at', { mode: 'timestamp' }),
  dashboardPrefs: text('dashboard_prefs'),
})

/* (pending modules S09 — 1.0's `studio_invitations`, migration 080, kept under 1.0's name for the port) An invitation to join the studio: Company ›
   Members › Add member makes the member at once (in every picker, as 2.0 and 1.0's self-serve flow did) and sends them this — a link with its
   own token, open for 30 days (1.0's), through the house outbox (WhatsApp to the mobile, email to the address). `pending` until their first
   visit (1.0: the first sign-in with that number accepts it), `accepted` then; `cancelled` takes the member out of the team with Undo. Expired
   is read from `expires_at`, never written. `full_name` · `phone` · `email` · `role` are what the last send carried (1.0's columns);
   `send_count` · `sent_at` · `channels` the sends (Send again re-opens the window, the token stays); 1.0's `hangout_event_id` came with
   Hangouts (S27). */
export const studioInvitations = sqliteTable(
  'studio_invitations',
  {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull().references(() => members.id),
    invitedBy: text('invited_by'),
    fullName: text('full_name').notNull(),
    phone: text('phone'),
    email: text('email'),
    role: text('role').notNull(),
    token: text('token').notNull(),
    status: text('status').notNull().default('pending'),   // pending · accepted · cancelled
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
    sendCount: integer('send_count').notNull().default(0),
    channels: text('channels'),   // the last send's channels with an address — 'whatsapp,email' · '' = nowhere to send it
    acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }),
    cancelledAt: integer('cancelled_at', { mode: 'timestamp_ms' }),
    cancelledBy: text('cancelled_by'),
    /* (pending modules S27) 1.0's `hangout_event_id`: someone invited from a Hangout's plan — on their first visit they join that Hangout's designers */
    hangoutEventId: text('hangout_event_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('studio_invitations_token_idx').on(t.token), index('studio_invitations_member_idx').on(t.memberId)],
)
export type StudioInvitation = typeof studioInvitations.$inferSelect

/* (pending modules S30 — his "build all of them" 2026-10-11; card onboarding:studio-sign-in; 1.0's signed `qanvast_session` cookie and its
   `auth_sessions` record) A member signed in on one browser: their mobile or email and a code (`via` 'code' on the sign-in page, 'join' on
   their invitation's page), 24 hours — or 30 days with Keep me signed in, renewed on each visit (`remember`, `last_seen_at`, `expires_at`).
   The cookie carries the id; Sign out ends it (`ended_at` · `ended_reason` 'signed-out', 'replaced' by a new sign-in on that browser,
   'deactivated' when Company › Members deactivates the member).
   `channel` = what the code went to ('phone' · 'email'); `user_agent` = 1.0's, cut to 200 characters (no address kept). (pending modules S43A)
   This row's `member_id` IS the browser's member — every read and write stamp of that browser follows it (lib/db/session.ts); signing in no
   longer moves `members.is_you`, so the other browsers stay who they are. View as on this browser moves this row's `member_id` (and the
   standing session's flag with it, REG-667). */
export const studioSessions = sqliteTable(
  'studio_sessions',
  {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull().references(() => members.id),
    remember: integer('remember', { mode: 'boolean' }).notNull().default(false),
    via: text('via').notNull().default('code'),     // code · join
    channel: text('channel'),                       // phone · email
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
    endedReason: text('ended_reason'),              // signed-out · replaced · deactivated
    userAgent: text('user_agent'),
  },
  (t) => [index('studio_sessions_member_idx').on(t.memberId)],
)
export type StudioSessionRow = typeof studioSessions.$inferSelect

export const leads = sqliteTable(
  'leads',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),           // "91234567" (+65 implied, per mock)
    email: text('email'),
    source: text('source').notNull(),         // SOURCES enum
    propertyType: text('property_type').notNull(),
    propertyAddress: text('property_address'),
    leadAddress: text('lead_address'),
    budgetMinor: integer('budget_minor').notNull(),   // SGD cents
    stage: text('stage').notNull().default('New'),    // ALL_STAGES enum
    style: text('style'),
    keyCollection: text('key_collection'),
    condition: text('condition'),
    areaSqft: integer('area_sqft'),
    estimatedStartDate: integer('estimated_start_date', { mode: 'timestamp' }),
    notes: text('notes'),
    /** (REG-607, parity Q-12) 1.0's "Area / District" — one of DISTRICTS (lib/leads/enums.ts); the column keeps 1.0's name. */
    area: text('area'),
    /** (REG-607, parity Q-35) 1.0's IC / NRIC and the studio's own customer reference, kept on the lead and copied onto every new quote. */
    icNumber: text('ic_number'),
    customerId: text('customer_id'),
    qanvastLeadId: text('qanvast_lead_id'),   // (REG-609, parity T-10) Qanvast's own reference for a Qanvast-sourced lead — 1.0's column, shown on Qanvast Ops
    /* (pending modules S05 — testers' L-3) A commercial client: the company the lead's name works for and its UEN; asked for when the property
       type is Commercial (the lead's name is the contact person), printed by the quote's {client_company} · {client_uen}. */
    companyName: text('company_name'),
    companyUen: text('company_uen'),
    /* (pending modules S05 — testers' L-4) A second client on the lead (a co-owner): name · NRIC / FIN · mobile — every new quote starts with
       them as its second client (REG-588), and Client access offers them as someone from the household. */
    client2Name: text('client2_name'),
    client2Nric: text('client2_nric'),
    client2Phone: text('client2_phone'),   // the bare 8 digits (REG-456)
    /** (REG-911, Projects Q-04) A client who came straight to a project (Projects › New project), not through the pipeline: the lead row
        holds their details so quotes, contracts, tasks and files work unchanged, and is kept out of the Leads listing, kanban, counts,
        insights, Leads search and the Tasks hub's Lead filter; `/leads/<id>` of a direct lead opens its project. */
    direct: integer('direct', { mode: 'boolean' }).notNull().default(false),
    // Deleted Leads folder: soft delete with reason, purged after 30 days.
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    /** Null until someone opens / clicks the lead — drives the 'new, unseen' band on every new lead (user 2026-08-29). */
    seenAt: integer('seen_at', { mode: 'timestamp' }),
    deleteReason: text('delete_reason'),
    stageBeforeDelete: text('stage_before_delete'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('leads_stage_idx').on(t.stage), index('leads_deleted_idx').on(t.deletedAt)],
)

export const leadAssignees = sqliteTable(
  'lead_assignees',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    /** (REG-335) When the member was assigned — the Activity feed's "You assigned X to this lead." Null on rows from before the column: read as the lead's creation. */
    assignedAt: integer('assigned_at', { mode: 'timestamp' }),
    /** (parity P-13) Who added the member — members.id, stamped by every assign (`writeAssignees` · `addLeadMembers` · New project). Null on rows
        from before the column, where the records never said: Activity then reads "{name} was added to the lead". */
    assignedBy: text('assigned_by'),
  },
  (t) => [unique('lead_assignees_unique').on(t.leadId, t.memberId),
          index('lead_assignees_lead_idx').on(t.leadId)],
)

export const leadTasks = sqliteTable(
  'lead_tasks',
  {
    id: text('id').primaryKey(),
    // (REG-466) Null = a STUDIO task, one that belongs to no lead — the rail's Tasks page lists them beside every lead's.
    leadId: text('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
    // (REG-470) The quote whose due date raised this task — one open follow-up per quote, kept in step with the date.
    quoteId: text('quote_id').references(() => quotes.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    kind: text('kind').notNull().default('General'),  // General | Call (mock vocab)
    dueAt: integer('due_at', { mode: 'timestamp' }),
    done: integer('done', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    // Lead Details › Tasks (902-36216): who raised it, the long text, the "new" band (REG-131 applied to tasks) and edits.
    creatorId: text('creator_id'),
    description: text('description'),
    seenAt: integer('seen_at', { mode: 'timestamp' }),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    templateId: text('template_id'),             // (REG-538) the task template it was added from — the gallery's "Added to n leads"
    contractId: text('contract_id'),             // (REG-634, contracts parity Q-25) the contract whose Automation raised it — a follow-up closes when it is signed
    milestoneId: text('milestone_id'),           // (Projects round 2, Q-09) the project milestone the task sits inside — the Schedule's "6 of 14 tasks done"
    /* (gaps build, package C — M-03) Someone outside the studio on the task: a subcontractor or a supplier by name and mobile, with no sign-in
       (1.0's external_assignee_name / _phone). Instead of, or beside, the members; Send on WhatsApp drafts the task to them and stamps the send. */
    externalName: text('external_name'),
    externalPhone: text('external_phone'),       // the bare 8 digits (REG-456)
    externalKind: text('external_kind'),         // subcontractor | supplier
    externalSentAt: integer('external_sent_at', { mode: 'timestamp_ms' }),
    /* (gaps build I, I-Q11) The compliance item a project's starter task was made for (lib/compliance/sg-checklist.ts) — ticking the task
       ticks the item on the project's Compliance tab, and back (1.0's F-300: the two never met). */
    complianceItem: text('compliance_item'),
    /* (pending modules S23) The meeting the task belongs to — a planned meeting's reminder ("Meet the client on …", held or cancelled with it)
       or a step from its brief's next steps (lib/meetings). */
    meetingId: text('meeting_id'),
  },
  (t) => [index('lead_tasks_lead_idx').on(t.leadId)],
)

/** Move Stage wizard payloads — one row per transition (or contact log). */
export const stageLogs = sqliteTable(
  'stage_logs',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    fromStage: text('from_stage').notNull(),
    toStage: text('to_stage').notNull(),
    payload: text('payload', { mode: 'json' }),  // channel/when/outcome/next-step/files/…
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    /** (parity P-13) Who moved the lead — members.id, stamped by `moveStage` · `quickMoveStage` · `updateStageDetails`. Null on rows from before
        the column (and a return's own Lost move): Activity then reads "The lead moved from … to …". */
    movedBy: text('moved_by'),
  },
  (t) => [index('stage_logs_lead_idx').on(t.leadId)],
)

export const imports = sqliteTable('imports', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  totalRows: integer('total_rows').notNull(),
  importedRows: integer('imported_rows').notNull(),
  skippedRows: integer('skipped_rows').notNull().default(0),
  errorNote: text('error_note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const importRows = sqliteTable(
  'import_rows',
  {
    id: text('id').primaryKey(),
    importId: text('import_id').notNull().references(() => imports.id, { onDelete: 'cascade' }),
    data: text('data', { mode: 'json' }).notNull(),          // parsed CSV row
    status: text('status').notNull().default('pending'),     // pending|duplicate|approved|rejected|merged
    duplicateOfLeadId: text('duplicate_of_lead_id'),
    matchedOn: text('matched_on'),                           // 'phone' | 'email' (C5)
  },
  (t) => [index('import_rows_import_idx').on(t.importId)],
)

/** A member row as the database keeps it (with `standingYou`, the demo's standing session's flag). */
export type MemberRecord = typeof members.$inferSelect
/** (pending modules S43A) A member as the app reads one: `isYou` = the member THIS request is signed in as (lib/db/session.ts `withYou`) — a
    code-signed browser is its own member, a browser on the demo's standing session the flagged one. */
export type Member = Omit<MemberRecord, 'standingYou'> & { isYou: boolean }
export type Lead = typeof leads.$inferSelect
export type LeadTask = typeof leadTasks.$inferSelect
export type StageLog = typeof stageLogs.$inferSelect
export type ImportBatch = typeof imports.$inferSelect
export type ImportRow = typeof importRows.$inferSelect

export type User = typeof users.$inferSelect
export type Organization = typeof organizations.$inferSelect
export type Membership = typeof memberships.$inferSelect

/** Studio-level configuration (Account setup). One row per key; values are JSON strings. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
export type Setting = typeof settings.$inferSelect

/* ── Lead Details › Overview (858-24770) ─────────────────────────────────────────────────────────
   Demo-side records the overview cards read. Additive tables; seeded by scripts/seed-overview.ts. */

/** A quote raised for the lead (QUOTES card 858:25057 · the Move stage window's "From System" list). */
export const quotes = sqliteTable(
  'quotes',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    number: text('number').notNull(),            // "OM-10001"
    createdBy: text('created_by'),               // (REG-471) the member who created the quote — the Quotes tables' Creator column
    title: text('title').notNull(),              // "Whole-home renovation"
    amountMinor: integer('amount_minor').notNull(),
    visibility: text('visibility').notNull().default('Private'),   // Private | Shared
    status: text('status').notNull().default('Draft'),             // Draft | Sent for Approval | Approved | Sent to Client | Signed (910:36673)
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    // Quotes tab columns (910:36323): Due · Sent · Updated · Approval Date. `updatedAt` null = never edited (falls back to createdAt).
    dueAt: integer('due_at', { mode: 'timestamp' }),
    sentAt: integer('sent_at', { mode: 'timestamp' }),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    approvedAt: integer('approved_at', { mode: 'timestamp' }),
    archivedAt: integer('archived_at', { mode: 'timestamp' }),   // row kebab › Archive (910:36723)
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),     // row kebab › Delete — soft, surfaces under "Deleted Quotes"
    // Quote editor › General Info (1271:39680, REG-403): what the studio types on the quote itself. `preparedBy` is a
    // members.id; property type and site address are COPIED from the lead when the quote is created and editable here.
    preparedBy: text('prepared_by'),
    validUntil: integer('valid_until', { mode: 'timestamp' }),
    projectRef: text('project_ref'),
    nric: text('nric'),
    customerId: text('customer_id'),
    propertyType: text('property_type'),
    siteAddress: text('site_address'),
    version: integer('version').notNull().default(1),   // header chip "VERSION 1" (1201:33807); bumps are deferred (build plan)
    // The studio's section order + collapsed state for THIS quote (owner 2026-09-11: "reorder should remain as is per quote
    // and the new quote is set to default"); JSON of lib/quotes/sections.ts `QuoteSectionState[]`, null = the default.
    sections: text('sections'),
    templateId: text('template_id'),   // the design template the quote started from (Create Quote modal); null = blank
    templateVersion: integer('template_version'),   // (REG-489) the template version this quote is pinned to; a newer publish shows the update banner
    clientViewJson: text('client_view_json'),       // (REG-490) Preview › "What your client sees" — this quote's overrides of the template's client view; null = the template's
    // Items section (1260:31209, REG-415): quote-level pricing controls and the studio's table preferences for this quote.
    additionalDiscountMode: text('additional_discount_mode').notNull().default('pct'),   // pct | amount (the % ▾ select, 1271:36776)
    additionalDiscountValue: real('additional_discount_value').notNull().default(0),     // percent, or S$ when mode = amount
    gstEnabled: integer('gst_enabled', { mode: 'boolean' }).notNull().default(true),     // the "GST 9%" switch (1271:36779)
    issuingEntity: text('issuing_entity'),                                               // "Issuing Entity" (1271:36854); null = the studio
    itemsView: text('items_view').notNull().default('none'),                             // View by: none | category | room | section
    itemsDensity: text('items_density').notNull().default('single'),                     // Single | Double | Triple (description lines)
    itemsColumns: text('items_columns'),                                                 // JSON column settings (1271:41169); null = default
    itemsLabels: text('items_labels'),                                                   // JSON { categories, rooms, sections } the studio added
    // Files section (1238:32938, REG-419): the section-top eye — whether the attached files show in the client's view.
    filesVisible: integer('files_visible', { mode: 'boolean' }).notNull().default(true),
    // Terms and Conditions · Additional Notes (1238:33502 · 1238:33503, REG-420): the in-house editor's HTML and each section's "Show in client view".
    termsHtml: text('terms_html'),
    notesHtml: text('notes_html'),
    termsVisible: integer('terms_visible', { mode: 'boolean' }).notNull().default(true),
    notesVisible: integer('notes_visible', { mode: 'boolean' }).notNull().default(true),
    // Signature (1240:34176, REG-421): the section-top "Client Signature Required" switch — off keeps the client block (owner: "default: don't hide").
    clientSignatureRequired: integer('client_signature_required', { mode: 'boolean' }).notNull().default(true),
    // (REG-559) Named discounts under the Additional Discount: JSON `NamedDiscount[]` (lib/quotes/math.ts); each prints as its own Totals line.
    discountsJson: text('discounts_json'),
    // (REG-565) Revisions: when this quote last became a new version (Revise); the earlier versions are `quote_versions` rows.
    revisedAt: integer('revised_at', { mode: 'timestamp' }),
    /* (REG-587) Sent for confirmation: when the client confirmed the quote on its link (status Confirmed), before the T&Cs and the signature. */
    confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
    confirmedBy: text('confirmed_by'),       // the name the client typed
    /* (REG-588) A second client on the quote (co-owners): printed by the Details block and the Signature block when filled. */
    client2Name: text('client2_name'),
    client2Nric: text('client2_nric'),
    /* (REG-624, quote editor parity Q-22 · Q-23) Approval on the record: who sent it for approval and when; who approved it; the note an
       approver sent back with Request changes (shown to the preparer until the next send); when it first went to the client. */
    submittedBy: text('submitted_by'),
    submittedAt: integer('submitted_at', { mode: 'timestamp' }),
    approvedBy: text('approved_by'),
    reviewNote: text('review_note'),
    reviewedBy: text('reviewed_by'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    clientSentAt: integer('client_sent_at', { mode: 'timestamp' }),
    /* (REG-626, parity Q-31) When the quote was signed — the contract raised from it signed, or Signed picked by hand. */
    signedAt: integer('signed_at', { mode: 'timestamp' }),
    /* (Projects round 5, F-06 · F-07) A variation order is a quote in variation mode on a project: `kind` 'variation', the project it
       changes, numbered VO-1, VO-2… per project. Its client's approval is the quote's Confirmed (on the confirmation link, or marked by the
       studio): `confirmed_via` says how (link · in_person · whatsapp · email · paper) and `confirmed_marked_by` who marked it. */
    kind: text('kind').notNull().default('quote'),               // quote | variation
    projectId: text('project_id'),
    confirmedVia: text('confirmed_via'),
    confirmedMarkedBy: text('confirmed_marked_by'),
    /* (Projects round 6) A variation order drafted from a client's pick on Choices: the choice (`project_selections.id`) it carries the price
       difference of — the choice card links to it, and a second press opens it instead of drafting another. */
    selectionId: text('selection_id'),
    /* (Projects fix-D, D-33) The client's *Ask for a change* on the confirmation link — when and their words — so the Money tab says the ball
       is with the studio. Cleared when the order is revised (the new version answers it). */
    changeAskedAt: integer('change_asked_at', { mode: 'timestamp' }),
    changeAskedNote: text('change_asked_note'),
    /* (gaps build B, item 7 — 1.0 G-149) A variation order's "Reason for the change", printed on the order under its title. */
    changeReason: text('change_reason'),
    /* (gaps build D, item 2 — M-07; 1.0 I-293 · `vo.client_rejected`) The client's Decline on a variation order's confirmation link: when,
       their reason and the name they typed. The order stays Sent to Client on the record but is no longer waiting on them — Money says
       "Declined". Cleared when the order is revised or sent again (the new version answers it), as the change ask is. */
    declinedAt: integer('declined_at', { mode: 'timestamp' }),
    declinedNote: text('declined_note'),
    declinedBy: text('declined_by'),
    /* (parity map 2026-10-10, SC-094) a variation order's extra days on the schedule — 1.0's `timeline_impact_days`; null = none */
    timelineDays: integer('timeline_days'),
    /* (pending modules S02 — 1.0's `preview_token` · `preview_token_created_at`) The quote's view-only link `/quote/<token>`: the client sees
       the quote as it stands, live, with nothing to confirm or sign. One per quote; Stop clears it (the address then says the link is no
       longer active), sharing again makes a new one. A port carries 1.0's token here, so 1.0's `/quote/<token>` and `/quote-preview/<token>`
       links keep opening. `view_token_by` = the member who made it. */
    viewToken: text('view_token'),
    viewTokenAt: integer('view_token_at', { mode: 'timestamp' }),
    viewTokenBy: text('view_token_by'),
    /* (pending modules S03 — 1.0 froze the contract value at signing, C-43…C-51) The total as the client signed it: stamped whenever the quote
       becomes Signed, kept through a revision (the project's contract stays what was signed until a new signature), read by the project's
       money as its base. Null = never signed. */
    signedAmountMinor: integer('signed_amount_minor'),
    /* (pending modules S04 — card held:quotes, "the client's link with a token") The confirmation link's own key: `/confirm/<token>`, never
       the quote's id. A new quote gets a random one; a quote made before S04 keeps its id as its token (repair R106), so every link already in
       a client's chat keeps opening. A port carries 1.0's quote-link token here. */
    confirmToken: text('confirm_token'),
    /* (S04 — 1.0's `preview_view_count`; card: "'Viewed' on the quote link … 'they opened it' is the follow-up cue") A person opened the
       quote on a client link (the confirmation link or the view-only link) — the first time, the last time and how many times. Stamped by
       the page's first ask from a browser that ran it, never by a chat app drawing the link's preview. */
    clientViewedAt: integer('client_viewed_at', { mode: 'timestamp' }),
    clientLastViewedAt: integer('client_last_viewed_at', { mode: 'timestamp' }),
    clientViewCount: integer('client_view_count').notNull().default(0),
    /* (S04 — S01's note: the preparer's name, email and signature were read live, so a rename or a removed signature reached quotes already
       sent) What the paper prints of its preparer, kept when the quote first goes to the client: JSON `PreparedSnapshot`
       (lib/quotes/prepared.ts). Cleared by Revise (the next send keeps the new one). Null = the quote reads its preparer live. */
    preparedJson: text('prepared_json'),
    /* (S04 — 1.0's Draft with AI, the quote drafter) The brief a quote was drafted from by Maison AI, as typed — the Activity line says it. */
    draftBrief: text('draft_brief'),
    /* (S44T — UAT row 321, his UAT ask 2026-10-15) General Info's Remarks: the studio's own words for this quote, printed wherever the template
       places `{remarks}` (a Details row "Project remarks", a text). Null = none. */
    remarks: text('remarks'),
    /* (S44O — call C3 · UAT rows 282 · 283, his UAT ask 2026-10-15) How the quote's GST is rounded, stamped when it first goes to its client so
       its figures never move: 'rate' (once per rate — today's rule) or 'line' (per line — every quote sent before the rule, R163). Null = not
       yet with its client: it follows today's rule (lib/quotes/math.ts `gstRuleOf`). */
    gstRule: text('gst_rule'),
  },
  (t) => [index('quotes_lead_idx').on(t.leadId), uniqueIndex('quotes_view_token_idx').on(t.viewToken), uniqueIndex('quotes_confirm_token_idx').on(t.confirmToken)],
)

/**
 * (REG-565) A quote's earlier versions: Revise keeps the sent version whole — its fields, lines and payment rows as one JSON
 * snapshot — and the quote row moves on as version n+1 under the same number. The snapshot is read-only (the preview at
 * `?version=n`) and is what Version History lists.
 */
export const quoteVersions = sqliteTable(
  'quote_versions',
  {
    id: text('id').primaryKey(),
    quoteId: text('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    snapshotJson: text('snapshot_json').notNull(),   // { quote: {...fields}, items: QuoteItem[], payments: QuotePayment[] }
    note: text('note'),
    createdBy: text('created_by'),                   // members.id — who pressed Revise
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('quote_versions_quote_idx').on(t.quoteId)],
)
export type QuoteVersion = typeof quoteVersions.$inferSelect

/**
 * (REG-566) A saved section in My Items: a group with its lines (and sub-sections) the studio inserts whole — "Save section to
 * My Items" on a group, "My Sections" in the Add Item popover. `linesJson` is `SavedSection` (lib/quotes/items-model.ts).
 */
export const priceBookSections = sqliteTable('price_book_sections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  linesJson: text('lines_json').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),   // (REG-594)
  /** (REG-619, parity Q-27) The property type the section suits (the leads' list; null = any) and the studio's tags, a JSON array. */
  propertyType: text('property_type'),
  tags: text('tags'),
  createdBy: text('created_by'),   // (REG-652) who saved it and who changed it last
  updatedBy: text('updated_by'),
  folderId: text('folder_id'),   // (REG-664) its folder in My Sections (library_folders, library 'book-sections'); null = the top
})
export type PriceBookSection = typeof priceBookSections.$inferSelect


/**
 * Files section (1238:32938, REG-419): the lead's files a quote carries. The quote never owns a file — every attachment is
 * one of the lead's `lead_files` (an upload from the section lands in the lead's Files tab as well, owner 2026-09-11) —
 * so "Delete" on a tile only removes the link.
 */
export const quoteFiles = sqliteTable(
  'quote_files',
  {
    quoteId: text('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
    fileId: text('file_id').notNull().references(() => leadFiles.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('quote_files_quote_idx').on(t.quoteId)],
)

/**
 * Terms and Conditions · Additional Notes templates (1238:33084 · 1238:33173, REG-420): the studio's library behind "My Templates",
 * one list per section (`kind`). Bodies are the editor's HTML and may carry tokens ("[Client Full Name]") that resolve when added.
 */
export const quoteTextTemplates = sqliteTable('quote_text_templates', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),   // terms | notes
  title: text('title').notNull(),
  body: text('body').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  /* (REG-538) The library page: who wrote it, soft delete with a Deleted sheet, when a quote last took it. */
  createdBy: text('created_by'),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  folderId: text('folder_id'),   // (REG-664) its folder in T&Cs & Notes; null = the top
})
export type QuoteTextTemplate = typeof quoteTextTemplates.$inferSelect

/**
 * (REG-538) Payment templates — the studio's milestone splits, a library instead of a hardcoded list. The four presets are
 * seeded with their old keys as ids ('default' · '20-40-40' · '30-70' · '50-50'), so every stored `paymentPreset` still resolves.
 * `rows_json` = [{ name, description, pct }]; the deposit is due on approval, the rest are estimated on the schedule.
 */
export const paymentTemplates = sqliteTable('payment_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  rowsJson: text('rows_json').notNull(),
  isPreset: integer('is_preset', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  folderId: text('folder_id'),   // (REG-664) its folder in Payments; null = the top
})
export type PaymentTemplate = typeof paymentTemplates.$inferSelect

/**
 * Payment Schedule (1238:29290, REG-418): the milestones a quote is paid in. `pct` is the row's share of the quote's total
 * (amounts are DERIVED — total × pct — never stored, REG-403); `position` orders the rows. A row's due is one of three
 * kinds: `approval` (the deposit's "On Approval"), `estimate` (a date derived from the lead's start date and the property's
 * renovation length, printed "~ 21 Oct ’26") or `fixed` (a date the studio picked in the date picker).
 */
export const quotePayments = sqliteTable(
  'quote_payments',
  {
    id: text('id').primaryKey(),
    quoteId: text('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    name: text('name').notNull(),
    description: text('description'),
    pct: real('pct').notNull().default(0),
    dueKind: text('due_kind').notNull().default('estimate'),   // approval | estimate | fixed
    dueAt: integer('due_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    /* (parity map, MI-021) a fixed amount for this row (a fee-first stage) instead of its %; null = the % row it always was */
    fixedMinor: integer('fixed_minor'),
    /* (S44T — UAT row 310) A fixed row's own word where the % prints ("Design Fee"); null = "Fixed fee". */
    fixedLabel: text('fixed_label'),
  },
  (t) => [index('quote_payments_quote_idx').on(t.quoteId)],
)
export type QuotePayment = typeof quotePayments.$inferSelect

/**
 * The studio's price book — "My Items" (Add item popover 1271:40932; Company › My Items later). Every line a quote can pick.
 * `kind` is the item's nature and the glyph it wears when it has no photo (Use Icon 1271:41123: design_services · attach_money ·
 * handyman · local_shipping · shopping_cart = design · fee · labour · delivery · purchase, owner 2026-09-11). Money in cents.
 */
export const priceBookItems = sqliteTable('price_book_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  kind: text('kind').notNull().default('purchase'),
  unit: text('unit').notNull().default('Pieces'),
  costMinor: integer('cost_minor').notNull().default(0),
  markupMinor: integer('markup_minor').notNull().default(0),
  category: text('category'),
  thumb: text('thumb'),
  vendor: text('vendor'),   // (REG-594) who supplies it — the same product from two vendors is two entries
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),   // (REG-594) Company › Price book deletes softly, as the templates do (REG-502)
  // (REG-652, price book parity Q-04) A Designer's new item is `proposed` — on its proposer's quotes at once, offered to no one else —
  // until an Owner or an Admin approves it (`live`) or sends it back with a note (it leaves the book). Who made and last changed it.
  status: text('status').notNull().default('live'),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  reviewNote: text('review_note'),
  // (REG-653, price book parity Q-08) What a line copies besides its figures: a product or spec page, and the formatted description
  // (bullets, bold — `description` keeps its plain text), as a quote line keeps them (REG-557, REG-623).
  link: text('link'),
  descriptionHtml: text('description_html'),
  folderId: text('folder_id'),   // (REG-664) its folder in My Items; null = the top
  /* (pending modules S12 — 1.0's waste_percent) The share ordered on top of a quoted quantity when a purchase order is made from the signed
     quote (lib/company/price-book-waste.ts): 0–50, one decimal; 0 = none. The quote itself never changes. */
  wastePct: real('waste_pct').notNull().default(0),
  /* (pending modules S24) The Marketplace product it was added from (marketplace_products) — the product's row says "In My Items" and opens
     it; null for everything the studio made itself. */
  marketplaceProductId: text('marketplace_product_id'),
})
export type PriceBookItem = typeof priceBookItems.$inferSelect

/** (REG-652, price book parity Q-05) An item's history: what changed, who, when — its creation, an import, an approval, a send-back,
 *  a delete and a restore included. `changes` holds real changes only, `{ field: [before, after] }` in the item's own units. */
export const priceBookChanges = sqliteTable(
  'price_book_changes',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id').notNull(),
    kind: text('kind').notNull(),   // created · imported · edited · approved · sent_back · deleted · restored
    changes: text('changes'),       // JSON
    note: text('note'),
    by: text('by'),                 // members.id
    at: integer('at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('price_book_changes_item_idx').on(t.itemId)],
)
export type PriceBookChange = typeof priceBookChanges.$inferSelect

/**
 * A quote's line items (Items table 1260:31225): items and groups, groups holding items through `parentId`, siblings ordered by
 * `position`. Unit price = cost + markup; a line's total = qty × unit price × (1 − discount%) before GST (lib/quotes/math.ts).
 * A group sums its children (owner 2026-09-11). `status` is the client's answer (Pending · Approved · Declined); a Declined line
 * stays listed but leaves the totals (REG-415). `visibility` is what the client view shows for the line (menu 1271:40931).
 */
export const quoteItems = sqliteTable(
  'quote_items',
  {
    id: text('id').primaryKey(),
    quoteId: text('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    kind: text('kind').notNull().default('item'),          // item | group
    position: integer('position').notNull().default(0),
    name: text('name').notNull(),
    description: text('description'),
    thumb: text('thumb'),                                    // photo path; null → the icon placeholder
    thumbCount: integer('thumb_count').notNull().default(0), // "1/2" badge when more than one photo
    icon: text('icon'),                                      // price-book kind glyph when there is no photo (design | fee | labour | delivery | purchase)
    status: text('status').notNull().default('Pending'),    // Pending | Approved | Declined
    qty: real('qty').notNull().default(1),
    unit: text('unit'),                                      // Pieces | Lot | sqft | ft run | point | hour | set; null → "Add Unit Type"
    costMinor: integer('cost_minor').notNull().default(0),
    markupMinor: integer('markup_minor').notNull().default(0),
    discountPct: real('discount_pct').notNull().default(0),
    gstPct: real('gst_pct').notNull().default(9),
    room: text('room'),
    category: text('category'),
    section: text('section'),
    visibility: text('visibility').notNull().default('visible'),   // visible | hidden | no-price
    collapsed: integer('collapsed', { mode: 'boolean' }).notNull().default(false),   // a group's children folded (1260:31467)
    priceBookItemId: text('price_book_item_id'),
    optional: integer('optional', { mode: 'boolean' }).notNull().default(false),   // (REG-492) an optional line: printed in its own section, out of every total (Flo's Optional Works, Cove's Free Gifts)
    /* (REG-555) Print as: the word that prints in place of the amount — foc | inclusive | kiv | behalf | packaged | custom — with its
       counting rule (lib/quotes/math.ts `counts`); null = the price. On a group, `printAsText` is the word beside its sub-total ("Approximate"). */
    printAs: text('print_as'),
    printAsText: text('print_as_text'),
    highlight: text('highlight'),                            // (REG-556) one of the kit's colour keys on the whole line (accent | red | grey = ink; light | band = fill); null = none
    noNumber: integer('no_number', { mode: 'boolean' }).notNull().default(false),   // (REG-558) the line prints without a number and the numbering skips it
    /* (REG-585) A section that prints as ONE line for the client — its name and its sum — while the studio keeps every line inside with its cost and margin. */
    printOneLine: integer('print_one_line', { mode: 'boolean' }).notNull().default(false),
    /* (REG-596) A vendor rebate on the line, Owners only: never printed, never shown to a designer; the owner's margin counts it. */
    rebateMinor: integer('rebate_minor').notNull().default(0),
    /* (parity Q-08, REG-623) Who supplies the line — from its My Items entry when picked from there, editable; never printed. */
    vendor: text('vendor'),
    /* (parity Q-09, REG-623) A product or spec page for the line (http/https); never printed. */
    link: text('link'),
    /* (REG-626, parity Q-32) On an optional line: what the client answered on the confirmation link — want | skip; null = not asked yet. */
    clientChoice: text('client_choice'),
    descriptionHtml: text('description_html'),               // (REG-557) the formatted description (bullets · bold · underline) the in-house editor writes; `description` keeps its plain text
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    /* (gaps build B, item 7 — 1.0 G-151) On a variation order: the signed quote's line this credit omits, so the picker greys what is omitted already. */
    omitsId: text('omits_id'),
    /* (S44T — call C1, UAT rows 277 · 278 · 280 · 281 · 317 · 318: Estimation Direct) On a section: its work is priced after the contract — it
       prints after the main items as its own part, with its own sub-total, and never counts in the quote's total or its payment split. */
    pricedAfter: integer('priced_after', { mode: 'boolean' }).notNull().default(false),
    /* (S44T — call C2's print side, UAT row 327) The line's name with its emphasis: bold · italic · underline · line breaks and the brand kit's
       colours (`<span data-kit="accent">`), through the house allowlist; `name` keeps its plain words for search, X-Ray and exports. Null = plain. */
    nameHtml: text('name_html'),
  },
  (t) => [index('quote_items_quote_idx').on(t.quoteId)],
)
export type QuoteItem = typeof quoteItems.$inferSelect

/**
 * (pending modules S41b-1 — 1.0's Cost & Margin Visibility, "their edits keep the costs you have already entered") A deleted quote line's cost,
 * mark-up and rebate, kept for 30 days. A member who doesn't see costs is sent each line with its cost folded into its price, so when they
 * bring a deleted line back (Undo, ⌘Z) their browser has no cost to send — the server puts it back from here (app/quotes/items-actions.ts).
 */
export const keptLineCosts = sqliteTable(
  'kept_line_costs',
  {
    lineId: text('line_id').primaryKey(),
    quoteId: text('quote_id').notNull(),
    costMinor: integer('cost_minor').notNull().default(0),
    markupMinor: integer('markup_minor').notNull().default(0),
    rebateMinor: integer('rebate_minor').notNull().default(0),
    keptAt: integer('kept_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('kept_line_costs_quote_idx').on(t.quoteId)],
)

/**
 * Quote design templates — what the Create Quote modal lists under "FROM A DESIGN TEMPLATE" (1.0 screen + Figma
 * 1209:27023, REG-412). A design template carries the quote's look (Company › Templates, later); `lastUsedAt` prints
 * "used 2w ago" and `isDefault` the DEFAULT tag. Seeded by scripts/repair-demo-data.ts R22.
 */
export const quoteTemplates = sqliteTable('quote_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').notNull().default('design'),   // design (look only) — content templates come with Company › Templates
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  // (REG-485) The template editor's record (Company › Templates › Quote templates): the lifecycle, the PUBLISHED design and
  // defaults (lib/templates/model.ts, JSON), the working draft with its own stamp, the file it was rebuilt from, the last note.
  status: text('status').notNull().default('published'),   // draft | published | archived
  version: integer('version').notNull().default(1),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  updatedBy: text('updated_by'),                            // members.id
  paper: text('paper').notNull().default('A4'),             // A4 | Letter
  designJson: text('design_json'),                          // null = the Letter house style (lib/templates/presets.ts) until the studio saves one
  defaultsJson: text('defaults_json'),
  draftJson: text('draft_json'),                            // { design, defaults } — unpublished changes; null = none
  draftUpdatedAt: integer('draft_updated_at', { mode: 'timestamp' }),
  sourceFile: text('source_file'),                          // "Recreate from my current quote": the uploaded file's name
  note: text('note'),                                       // the last publish's "what changed"
  // (REG-501) Approval: a Designer submits (status 'pending'); an Owner / Admin approves (publishes) or requests changes (back to draft with the note).
  submittedBy: text('submitted_by'),                        // members.id
  submittedAt: integer('submitted_at', { mode: 'timestamp' }),
  submitNote: text('submit_note'),                          // what the designer says changed
  reviewNote: text('review_note'),                          // the owner's "changes requested" note, until the next submit
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),   // (REG-502) soft, like leads and quotes: out of every list and picker, restorable from Deleted templates; quotes on it keep printing their pinned version
  deletedBy: text('deleted_by'),               // (REG-538) the Deleted sheet's \"Deleted by\" — it used to show whoever last edited
  folderId: text('folder_id'),                 // (REG-664) its folder in Templates › Quotes (library_folders); null = the top
})
export type QuoteTemplate = typeof quoteTemplates.$inferSelect

/** (REG-529) Quote X-Ray: one comparison of a studio quote (or an uploaded one) against another studio's quote — the
 *  computed result kept whole, so the record page and Recent comparisons read exactly what the studio saw. */
export const quoteComparisons = sqliteTable('quote_comparisons', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  quoteId: text('quote_id').references(() => quotes.id, { onDelete: 'set null' }),
  yourLabel: text('your_label').notNull(),        // "OM-10008 · Whole-home renovation" or the uploaded file's name
  otherStudio: text('other_studio').notNull(),    // the studio the other quote came from, read from the file
  otherFile: text('other_file').notNull(),        // the uploaded file's name
  resultJson: text('result_json').notNull(),      // XrayResult
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  /** (REG-638, X-Ray parity round 1) Both sides' lines as the reading read them — `{ yours: YourLine[], theirs: RefLine[] }` —
      so a correction re-reads the same lines (Q-14), Run again keeps the other quote (Q-15) and the stale check has a baseline. */
  inputsJson: text('inputs_json'),
  /** The engine that made the reading (`ENGINE` in lib/xray/compare.ts); null = engine 1 (REG-529). */
  engine: integer('engine'),
  /** Upload two quotes: your file's name (the label drops its extension). */
  yourFile: text('your_file'),
  /** (REG-640, X-Ray parity round 3) The studio's corrections — `{ split: [yourLineId, theirIndex][], pair: [...] }` (Q-14) — and who made them last. */
  overridesJson: text('overrides_json'),
  correctedBy: text('corrected_by'),
  correctedAt: integer('corrected_at', { mode: 'timestamp' }),
  /** (Q-16) The last send: when, by whom, the text as it went, and how ('whatsapp' · 'copy'). */
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  sentBy: text('sent_by'),
  sentText: text('sent_text'),
  sentVia: text('sent_via'),
}, (t) => [index('quote_comparisons_lead_idx').on(t.leadId)])

/** (REG-485) Every published version of a template, for History and Roll back — the design as it was, whole. */
export const quoteTemplateVersions = sqliteTable('quote_template_versions', {
  id: text('id').primaryKey(),
  templateId: text('template_id').notNull().references(() => quoteTemplates.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  designJson: text('design_json').notNull(),
  defaultsJson: text('defaults_json'),
  note: text('note'),
  publishedAt: integer('published_at', { mode: 'timestamp' }).notNull(),
  publishedBy: text('published_by'),
})
export type QuoteTemplateVersion = typeof quoteTemplateVersions.$inferSelect

/** A contract raised for the lead (Contracts tab 931:38609). Status: Draft | Sent to Client | Signed (invented — the mock shows Draft only). */
export const contracts = sqliteTable(
  'contracts',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),              // "General Contract Agreement"
    status: text('status').notNull().default('Draft'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    sentAt: integer('sent_at', { mode: 'timestamp' }),
    signedAt: integer('signed_at', { mode: 'timestamp' }),
    signedCopy: text('signed_copy'),             // file name shown in "Signed Copy"; null → "-"
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    archivedAt: integer('archived_at', { mode: 'timestamp' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    /* (REG-534) The contract editor: the document itself and what the signing link needs. */
    body: text('body'),                          // the editor's HTML — token chips (data-token) and signature fields (data-sign) inside; null = never opened in the editor
    recipientName: text('recipient_name'),       // who signs — the lead's client by default
    recipientPhone: text('recipient_phone'),     // 8 digits, +65 implied — the OTP goes here
    contractDate: integer('contract_date', { mode: 'timestamp' }),
    templateId: text('template_id'),             // the contract template it started from (contract_templates.id)
    fromQuoteId: text('from_quote_id'),          // the quote it was raised from (the quote editor's "Create contract from this quote")
    source: text('source').notNull().default('composed'),   // composed (written here) | uploaded (a PDF the studio already had)
    fileName: text('file_name'),                 // the uploaded PDF's name (source = uploaded)
    issuingEntity: text('issuing_entity'),       // null = the studio's own name
    reminders: integer('reminders', { mode: 'boolean' }).notNull().default(false),   // Automation › remind the client to review
    thankYou: integer('thank_you', { mode: 'boolean' }).notNull().default(false),    // Automation › thank the client once signed
    signedBy: text('signed_by'),                 // the name the client typed when signing online; null = marked signed by the studio
    signedNric: text('signed_nric'),             // (REG-563) the NRIC / FIN the client typed when signing, kept MASKED ("•••••567A") — never the full number
    createdBy: text('created_by'),               // members.id
    bundleId: text('bundle_id'),                 // (REG-591) sent together with the bundle's other documents under one signing link
    /* (REG-631, contracts parity Q-05) The signed copy: at signing the document is kept as the client signed it — every chip's value in
       place, the studio signature it printed, the letterhead — with its fingerprint (1.0's `document_hash`). Preview, the signing page and
       every print of a Signed contract read these, never today's records. Cleared only when a studio-marked signature is moved back. */
    signedBody: text('signed_body'),                           // the resolved HTML (chips as values; signature fields still fields)
    signedStudioSignature: text('signed_studio_signature'),     // JSON { kind, name, data } — the studio signature as printed at signing
    signedLetterhead: text('signed_letterhead'),               // JSON { name, line } — the issuer's name and address line at signing
    documentHash: text('document_hash'),                       // SHA-256 of "html\n{title}\n{resolved body}" (1.0's per-document hash, B-26)
    /* (REG-633, contracts parity Q-15) 1.0's per-document gates (a library document's `requires_scroll · requires_accept · accept_label`, B-02):
       the client reads to the end and / or ticks the document's own words before going on. New contracts start with both on. */
    requiresScroll: integer('requires_scroll', { mode: 'boolean' }).notNull().default(false),
    requiresAccept: integer('requires_accept', { mode: 'boolean' }).notNull().default(false),
    acceptLabel: text('accept_label'),                         // the tick's words; null = "I have read and agree to this document."
    /* (REG-633, parity Q-16 · Q-17 · Q-18 · Q-19) the signing record — 1.0's evidence names (D-175…D-182) */
    viewedAt: integer('viewed_at', { mode: 'timestamp' }),     // the client's first open of the link while it was out for signature
    acceptedAt: integer('accepted_at', { mode: 'timestamp' }), // when the client ticked the document's words
    signatureKind: text('signature_kind'),                     // 'type' | 'draw' — how the client signed online
    signatureData: text('signature_data'),                     // a drawn signature as an SVG path (752×140), else null
    signerPhone: text('signer_phone'),                         // the number the one-time code went to, masked ("+65 •••• 4567")
    signerUserAgent: text('signer_user_agent'),                // the device, summarised ("Chrome on macOS")
    signerTimezone: text('signer_timezone'),                   // the signer's time zone ("Asia/Singapore")
    verificationMethod: text('verification_method'),           // 'phone_code' (1.0: 'phone_otp'); the code itself is the platform's
    bundlePosition: integer('bundle_position'),                // (REG-633, parity Q-16) the order the studio ticked it in a bundle
    /* (REG-634, contracts parity §8.2 · E-128) who did it — Activity names the member, not the contract's creator */
    sentBy: text('sent_by'),                                   // members.id — who sent it (WhatsApp, a shared link, a bundle)
    markedBy: text('marked_by'),                               // members.id — who marked it signed (paper, or signed elsewhere)
    deletedBy: text('deleted_by'),                             // members.id — Deleted Contracts' "Deleted by"
    /* (gaps build D, item 6 — 1.0 M-260 · I-356 · I-357, its `casetrust_acknowledged` event) A CaseTrust-accredited studio's signing page
       carries the deposit-protection disclosure with a tick the client must give: when they ticked it (the server's clock caps it). */
    caseTrustAt: integer('casetrust_at', { mode: 'timestamp' }),
    /* (pending modules S03 — 1.0's quote_signature_requests.token · expires_at, Q-28 revisited) The signing link's key: `/sign/<token>`. A new
       contract gets a random one; a contract made before S03 keeps its id (the links already in clients' chats keep opening) and a port puts
       1.0's request token here. Stopping the link makes a new one, so the old address stays dead. `sign_expires_at` = when the link stops
       opening (the studio's Signing links rule, 7 days by default, from each send or reminder); null = not out for signature. */
    signToken: text('sign_token'),
    signExpiresAt: integer('sign_expires_at', { mode: 'timestamp' }),
    /* (pending modules S03 — the PDF kept) The contract's PDF in the lead's Files › Contract & VOs (an imported contract, the Won step's
       upload, a standard document from the library) and the signed copy attached on Mark as signed — lead_files ids, the bytes kept there. */
    fileId: text('file_id'),
    signedFileId: text('signed_file_id'),
    /* (S44R — UAT row 358, call C7, as recommended — his UAT ask 2026-10-15) Send for digital signature's "Ask for the deposit": once the client
       signs, the signing page ends on "Pay the deposit" — the named quote's first payment stage, to its issuing entity's PayNow. */
    askDeposit: integer('ask_deposit', { mode: 'boolean' }).notNull().default(false),
    /* (S44R — UAT row 359, call C9) A letter the Hand over sheet issued: 'handover' = the completion & warranty letter (one live per project);
       `to_read` = sent for the client to read and keep — no signature asked; `defects_months` = the defects period it prints. */
    purpose: text('purpose'),
    toRead: integer('to_read', { mode: 'boolean' }).notNull().default(false),
    defectsMonths: integer('defects_months'),
  },
  (t) => [index('contracts_lead_idx').on(t.leadId), uniqueIndex('contracts_sign_token_idx').on(t.signToken)],
)

/** (REG-591) Several documents sent together for signature: one link, one signature that covers them all, each document keeping its own signed copy. */
/**
 * (REG-604) A notification: one row per member per event — "New lead", "assigned to you", "quote sent for approval", "confirmed",
 * "signed". `channels` records which channels the rules sent it on when it was raised (in-app · email · WhatsApp), so the feed
 * can say "also by WhatsApp"; the sending itself is the platform's. Follow-ups that are due are derived, never stored.
 */
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),                       // new_lead | assigned | quote_approval | quote_confirmed | quote_signed | task_due
  title: text('title').notNull(),
  body: text('body'),
  href: text('href'),
  leadId: text('lead_id'),
  quoteId: text('quote_id'),
  channels: text('channels').notNull().default('in_app'),   // comma-joined
  actorId: text('actor_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  readAt: integer('read_at', { mode: 'timestamp' }),
}, (t) => [index('notifications_member_idx').on(t.memberId, t.createdAt)])
export type Notification = typeof notifications.$inferSelect

export const contractBundles = sqliteTable('contract_bundles', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  recipientName: text('recipient_name'),
  recipientPhone: text('recipient_phone'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  signedAt: integer('signed_at', { mode: 'timestamp' }),
  signedBy: text('signed_by'),
  signedNric: text('signed_nric'),
  createdBy: text('created_by'),
  /* (REG-633, contracts parity Q-16 · Q-17 · Q-19) the bundle's own signing record — one signature, one record, the whole set's fingerprint */
  viewedAt: integer('viewed_at', { mode: 'timestamp' }),
  signingHash: text('signing_hash'),                           // 1.0's whole-set hash (B-29) of the documents it signed
  signatureKind: text('signature_kind'),
  signatureData: text('signature_data'),
  signerPhone: text('signer_phone'),
  signerUserAgent: text('signer_user_agent'),
  signerTimezone: text('signer_timezone'),
  /* (pending modules S03) the link's life: when it stops opening (each send or reminder renews it), when the studio stopped it, and 1.0's
     request token for a set of documents a port brings over (`/sign/<token>` lands on `/sign/bundle/<id>`). A bundle's own id is made fresh
     for each send and is its link's key. */
  signExpiresAt: integer('sign_expires_at', { mode: 'timestamp' }),
  cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
  signToken: text('sign_token'),
}, (t) => [uniqueIndex('contract_bundles_sign_token_idx').on(t.signToken)])
export type ContractBundle = typeof contractBundles.$inferSelect

/** (REG-534) A contract template: a saved document — title + the editor's HTML with its token chips — the studio starts a contract from. Simple library, no versions. */
export const contractTemplates = sqliteTable('contract_templates', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  /** (REG-632, contracts parity Q-13) The studio's default: a contract raised from a quote or the Won step starts from it; the picker lists it first. One at most. */
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  /** (REG-633, contracts parity Q-15) The gates a contract made from it starts with. */
  requiresScroll: integer('requires_scroll', { mode: 'boolean' }).notNull().default(false),
  requiresAccept: integer('requires_accept', { mode: 'boolean' }).notNull().default(false),
  acceptLabel: text('accept_label'),
  /** (REG-634, contracts parity E-126) who saved it last — the gallery's "Updated by". */
  updatedBy: text('updated_by'),
  folderId: text('folder_id'),   // (REG-664) its folder in Templates › Contracts; null = the top
  /* (pending modules S03 — 1.0's studio_signing_documents kind 'pdf_upload', Q-26 revisited) A standard document: 'pdf' = a PDF the studio
     adds to signings (its bytes in contract_template_files); 'document' = a written template (the body). */
  kind: text('kind').notNull().default('document'),
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  /* (S44R — UAT row 359, call C9) The Hand over sheet offers this one as the completion letter — one at most, as the default */
  useAtHandover: integer('use_at_handover', { mode: 'boolean' }).notNull().default(false),
})
export type ContractTemplate = typeof contractTemplates.$inferSelect
/** (pending modules S03) A PDF template's bytes and the picture of its first page — apart from the row, so a list of templates never carries them. */
export const contractTemplateFiles = sqliteTable('contract_template_files', {
  templateId: text('template_id').primaryKey().references(() => contractTemplates.id, { onDelete: 'cascade' }),
  data: text('data').notNull(),     // the PDF, a data URL
  thumb: text('thumb'),             // its first page as a JPEG / PNG data URL, drawn in the browser at upload
})

/** Files and folders attached to the lead (FILES card 858:24943). `thumb` is a public asset path for image tiles. */
export const leadFiles = sqliteTable(
  'lead_files',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),                // folder | image | pdf
    name: text('name').notNull(),
    thumb: text('thumb'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    // Files tab (931:39056): folders nest via parent_id; owner / size / type feed the list view and the Information panel.
    parentId: text('parent_id'),                 // null = the root ("All Files")
    ownerId: text('owner_id'),                   // members.id
    sizeBytes: integer('size_bytes'),            // null for folders
    mime: text('mime'),                          // image/jpeg | application/pdf | null (folder)
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),   // in the Trash Folder ("Deleted Files")
    /** (Projects r4a) Shown to client: the portal's Files lists only files marked so; null = the team's own. */
    shownToClientAt: integer('shown_to_client_at', { mode: 'timestamp' }),
  },
  (t) => [index('lead_files_lead_idx').on(t.leadId)],
)

/** (REG-684) The picture an upload carried — kept beside its file, so a query of the files never carries it; the file's `thumb` is its
    address, /files/img/<id>. */
export const leadFileImages = sqliteTable('lead_file_images', {
  fileId: text('file_id').primaryKey().references(() => leadFiles.id, { onDelete: 'cascade' }),
  data: text('data').notNull(),
})

/** Notes tab (931:44865): a free note or a contact log, in creation order. */
export const leadNotes = sqliteTable(
  'lead_notes',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),                // note | contact
    title: text('title').notNull().default(''),
    body: text('body').notNull().default(''),
    channel: text('channel'),                    // contact: WhatsApp | Email | SMS | Call | Others
    contactedAt: integer('contacted_at', { mode: 'timestamp' }),
    outcome: text('outcome'),
    nextStepAt: integer('next_step_at', { mode: 'timestamp' }),
    nextStepMode: text('next_step_mode'),
    authorId: text('author_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (t) => [index('lead_notes_lead_idx').on(t.leadId)],
)

/** Files attached to a note (Attachments column 931:45548) — rows of `lead_files`. */
export const noteAttachments = sqliteTable(
  'note_attachments',
  {
    noteId: text('note_id').notNull().references(() => leadNotes.id, { onDelete: 'cascade' }),
    fileId: text('file_id').notNull().references(() => leadFiles.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('note_attachments_note_idx').on(t.noteId)],
)

/** Comments on a file (viewer › Comments panel 931:39891). */
export const fileComments = sqliteTable(
  'file_comments',
  {
    id: text('id').primaryKey(),
    fileId: text('file_id').notNull().references(() => leadFiles.id, { onDelete: 'cascade' }),
    authorId: text('author_id').notNull(),
    body: text('body').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (t) => [index('file_comments_file_idx').on(t.fileId)],
)

/**
 * DEAD TABLE — nothing reads or writes it (REG-286). Kept only because migrations here are additive (CLAUDE.md), so
 * dropping it is a schema change we do not make; `scripts/seed-overview.ts` still fills it and `lib/db/baseline.ts`
 * still snapshots it, both harmlessly.
 *
 * It held the QUESTIONNAIRE card's counts (858:25077) before the Questionnaire tab existed. The tab's `questions`
 * table replaced it: the counts are now DERIVED per request (`lib/leads/question-model.ts` summarise → the
 * `QuestionnaireSummary` type in `lib/leads/detail.ts`). Nothing keeps these columns in step with `questions`, so a
 * reader who trusts them gets last month's numbers. Do not build against it — build against `questions`.
 */
export const leadQuestionnaires = sqliteTable('lead_questionnaires', {
  leadId: text('lead_id').primaryKey().references(() => leads.id, { onDelete: 'cascade' }),
  total: integer('total').notNull(),
  clientAnswered: integer('client_answered').notNull().default(0),
  studioAnswered: integer('studio_answered').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

/** Questionnaire tab (931:46769): one row per question; the Overview card's counts derive from these. */
export const questions = sqliteTable(
  'questions',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    type: text('type').notNull(),                // text | number | single | multi | date
    options: text('options'),                    // JSON string[] for single / multi
    answer: text('answer'),                      // multi: JSON string[]; date: d/m/yyyy input string
    answeredBy: text('answered_by'),             // studio | client
    answeredAt: integer('answered_at', { mode: 'timestamp' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    // (REG-647, settings parity Q-13) Copied from the question bank's Required: the tab marks it and counts the required ones still open.
    required: integer('required', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('questions_lead_idx').on(t.leadId)],
)

/* (gaps build D, item 9 — 1.0 M-170 · M-175, the clock icon's answer history) Every change to a question's answer, kept: what it read before
   and after, who changed it — the studio (a member) or the client on the portal (a homeowner) — and when. The question card's clock lists
   them, newest first. A first answer is a row too (before = null). */
export const questionAnswerHistory = sqliteTable(
  'question_answer_history',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
    before: text('before'),                                             // the answer as stored before (multi: JSON string[]), null = none
    after: text('after'),                                               // the answer as stored after, null = cleared
    byKind: text('by_kind').notNull(),                                  // studio | client
    byMemberId: text('by_member_id'),                                   // members.id — a studio change
    byHomeownerId: text('by_homeowner_id'),                             // homeowner_profiles.id — the client's (or their household's) change
    byName: text('by_name'),                                            // the name as it read then
    at: integer('at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('question_answer_history_q_idx').on(t.questionId, t.at)],
)
export type QuestionAnswerHistory = typeof questionAnswerHistory.$inferSelect

/** A Qanvast lead-return record (LEAD RETURNED card 858:25188 / 858:24095 / 858:24144; header chip "Return Processing"). */
export const leadReturns = sqliteTable(
  'lead_returns',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),            // processing | rejected | approved
    returnedById: text('returned_by_id').references(() => members.id),
    returnedAt: integer('returned_at', { mode: 'timestamp' }).notNull(),
    reason: text('reason').notNull(),
    repliedBy: text('replied_by'),               // "Qanvast - Business Team"
    repliedAt: integer('replied_at', { mode: 'timestamp' }),
    statusText: text('status_text'),             // "Return Rejected"
    refundStatus: text('refund_status'),         // "Credited"
    creditAmountMinor: integer('credit_amount_minor'),
    appealDays: integer('appeal_days'),          // rejected: appeal window shown in the card banner
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    // Return Lead wizard (931:48882) + Qanvast's reply (931:49048)
    firstOutreachAt: integer('first_outreach_at', { mode: 'timestamp' }),
    attempts: integer('attempts'),               // 1–4, 5 = "+5"
    comments: text('comments'),
    replyReason: text('reply_reason'),           // "Homeowner did not shortlist ID to proceed"
    replyRemarks: text('reply_remarks'),
    stageBefore: text('stage_before'),           // Undo restores it
    stageLogId: text('stage_log_id'),            // the Lost move written on return — removed on Undo
    taskId: text('task_id'),                     // "Respond to Qanvast team" — removed on Undo
    // (REG-609, parity D-39) The seven reasons' extra fields: the ticked sub-reasons (JSON string[]) and the reason's own detail
    // (the duplicate searched for · the existing project reference · what is incorrect) — 1.0 folded these into `notes`.
    subReasons: text('sub_reasons'),
    detail: text('detail'),
    /** (pending modules S05) An appeal of a rejected return: the return it appeals (the rejected one), with more documents or information. */
    appealOf: text('appeal_of'),
  },
  (t) => [index('lead_returns_lead_idx').on(t.leadId)],
)

/** Screenshots attached to a lead return (931:48882 "Attach images/screenshots of all your attempts") — rows of `lead_files`. */
export const returnAttachments = sqliteTable(
  'return_attachments',
  {
    returnId: text('return_id').notNull().references(() => leadReturns.id, { onDelete: 'cascade' }),
    fileId: text('file_id').notNull().references(() => leadFiles.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('return_attachments_return_idx').on(t.returnId)],
)


export type Quote = typeof quotes.$inferSelect
export type Contract = typeof contracts.$inferSelect
export type FileComment = typeof fileComments.$inferSelect
export type LeadNote = typeof leadNotes.$inferSelect
export type Question = typeof questions.$inferSelect
export type LeadFile = typeof leadFiles.$inferSelect
/** @deprecated (REG-286) the row type of the dead `lead_questionnaires` table — derived counts are `QuestionnaireSummary` in lib/leads/detail.ts. */
export type LeadQuestionnaire = typeof leadQuestionnaires.$inferSelect
export type LeadReturn = typeof leadReturns.$inferSelect

/* ── Lead Details › Tasks (902-36216) ─────────────────────────────────────────────────────────────
   Additive tables around `lead_tasks`; seeded by scripts/seed-tasks.ts. */

/** Studio-level tag catalogue (Manage Tags 902:27709). */
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const taskTags = sqliteTable(
  'task_tags',
  {
    taskId: text('task_id').notNull().references(() => leadTasks.id, { onDelete: 'cascade' }),
    tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [index('task_tags_task_idx').on(t.taskId)],
)

export const taskAssignees = sqliteTable(
  'task_assignees',
  {
    taskId: text('task_id').notNull().references(() => leadTasks.id, { onDelete: 'cascade' }),
    memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  },
  (t) => [index('task_assignees_task_idx').on(t.taskId)],
)

/** Team comments on a task (902:28517) — "Clients can’t see these comments". */
export const taskComments = sqliteTable(
  'task_comments',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull().references(() => leadTasks.id, { onDelete: 'cascade' }),
    authorId: text('author_id').notNull().references(() => members.id),
    body: text('body').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('task_comments_task_idx').on(t.taskId)],
)

/**
 * (REG-627, quote editor parity Q-30) The team's comments on a quote's line — 1.0's line threads, on the task comments' model. Kept by the
 * line's id with no cascade: undo and Bring back write a line back under its own id, so its thread comes back with it; a line removed for
 * good leaves its thread unread. Never printed, never shown to the client.
 */
export const quoteItemComments = sqliteTable(
  'quote_item_comments',
  {
    id: text('id').primaryKey(),
    quoteId: text('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
    itemId: text('item_id').notNull(),
    authorId: text('author_id').notNull().references(() => members.id),
    body: text('body').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('quote_item_comments_quote_idx').on(t.quoteId), index('quote_item_comments_item_idx').on(t.itemId)],
)
export type QuoteItemComment = typeof quoteItemComments.$inferSelect

/** Files attached to a task — rows of `lead_files` (the lead's library, 902:28220 "Your files"). */
export const taskAttachments = sqliteTable(
  'task_attachments',
  {
    taskId: text('task_id').notNull().references(() => leadTasks.id, { onDelete: 'cascade' }),
    fileId: text('file_id').notNull().references(() => leadFiles.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('task_attachments_task_idx').on(t.taskId)],
)

/** Task templates (Choose / Save as Template 902:29198 · 902:29220). */
export const taskTemplates = sqliteTable('task_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  keepMembers: integer('keep_members', { mode: 'boolean' }).notNull().default(true),
  keepDescription: integer('keep_description', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  /* (REG-538) The library page: who made it, when it changed, soft delete. */
  createdBy: text('created_by'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  folderId: text('folder_id'),   // (REG-664) its folder in Templates › Tasks; null = the top
})

export const templateTasks = sqliteTable(
  'template_tasks',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id').notNull().references(() => taskTemplates.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    kind: text('kind').notNull().default('General'),
    sortOrder: integer('sort_order').notNull().default(0),
    /* (REG-538) What "Team Members" keeps, and the two facts a checklist step carries: who, which tags, due how many days after it lands. */
    memberIds: text('member_ids'),               // JSON string[] of members.id
    tagIds: text('tag_ids'),                     // JSON string[] of tags.id
    dueDays: integer('due_days'),                // null = no due date
  },
  (t) => [index('template_tasks_template_idx').on(t.templateId)],
)

export type Tag = typeof tags.$inferSelect
export type TaskComment = typeof taskComments.$inferSelect
export type TaskTemplate = typeof taskTemplates.$inferSelect
export type TemplateTask = typeof templateTasks.$inferSelect
export type QuoteComparison = typeof quoteComparisons.$inferSelect

/* ── (REG-609, parity Q-22) The homeowner portal's lead-stage records — 1.0's `homeowner_profiles` + `homeowner_project_links`
   (here `homeowner_lead_links`: a link is to a lead until Projects exist). One profile per phone, one link per lead with its
   portal token; the invite and the questionnaire ask are stamped on the link ("Invited on" · "Asked on", the Activity lines). */
export const homeownerProfiles = sqliteTable(
  'homeowner_profiles',
  {
    id: text('id').primaryKey(),
    phone: text('phone').notNull(),              // the bare 8 digits, as leads.phone
    name: text('name').notNull(),
    email: text('email'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (t) => [uniqueIndex('homeowner_profiles_phone').on(t.phone)],
)
export type HomeownerProfile = typeof homeownerProfiles.$inferSelect

export const homeownerLeadLinks = sqliteTable(
  'homeowner_lead_links',
  {
    id: text('id').primaryKey(),
    homeownerId: text('homeowner_id').notNull().references(() => homeownerProfiles.id, { onDelete: 'cascade' }),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    portalToken: text('portal_token').notNull(),
    chatHistoryVisible: integer('chat_history_visible', { mode: 'boolean' }).notNull().default(true),
    invitedAt: integer('invited_at', { mode: 'timestamp' }),        // Invite to Portal › Send
    lastAskedAt: integer('last_asked_at', { mode: 'timestamp' }),   // Ask the client › Send
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    /* (Projects r4a, Q-46) Invite is a real state: who invited last, when the client first and last signed in, and a withdrawal that
       shuts the door (a withdrawn number is refused at sign-in and every session on it ends). A link belongs to the lead, so to its project. */
    invitedBy: text('invited_by'),
    openedAt: integer('opened_at', { mode: 'timestamp' }),
    lastOpenedAt: integer('last_opened_at', { mode: 'timestamp' }),
    withdrawnAt: integer('withdrawn_at', { mode: 'timestamp' }),
    withdrawnBy: text('withdrawn_by'),
    /* (Projects round 4b) When the client last opened their Schedule tab — the shares after it are "what changed since you last looked".
       Written by the portal's own page on arrival (never by a prefetch, never in a studio's preview). */
    scheduleSeenAt: integer('schedule_seen_at', { mode: 'timestamp' }),
  },
  (t) => [uniqueIndex('homeowner_lead_links_lead').on(t.leadId)],
)
export type HomeownerLeadLink = typeof homeownerLeadLinks.$inferSelect

/* ── (REG-612, parity Q-21) The studio's question bank — 1.0's `studio_scope_questions`: the questions every lead's questionnaire
   starts from (a new lead takes the enabled ones; an older lead adds them from its empty tab). Types are 1.0's six. */
export const studioScopeQuestions = sqliteTable('studio_scope_questions', {
  id: text('id').primaryKey(),
  question: text('question').notNull(),
  questionType: text('question_type').notNull(),   // text | yes_no | number | single_select | multi_select | date
  options: text('options'),                        // JSON string[] for the selects
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(false),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
export type StudioScopeQuestion = typeof studioScopeQuestions.$inferSelect

/* ── (REG-612, parity Q-25) Custom lead fields — 1.0's `lead_custom_fields` + `lead_custom_field_values`: the studio's own
   fields on every lead (Settings › Leads › Custom fields; the form's Additional info; the Overview's Custom fields section). */
export const leadCustomFields = sqliteTable('lead_custom_fields', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  fieldType: text('field_type').notNull().default('text'),   // text | number | date | dropdown | multi_select
  options: text('options'),                                   // JSON string[] for dropdown / multi_select
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(false),
  orderIndex: integer('order_index').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
export type LeadCustomField = typeof leadCustomFields.$inferSelect
export const leadCustomFieldValues = sqliteTable(
  'lead_custom_field_values',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    fieldId: text('field_id').notNull().references(() => leadCustomFields.id, { onDelete: 'cascade' }),
    value: text('value'),   // JSON: a string, or string[] for multi_select
  },
  (t) => [uniqueIndex('lead_custom_field_values_unique').on(t.leadId, t.fieldId), index('lead_custom_field_values_lead_idx').on(t.leadId)],
)
export type LeadCustomFieldValue = typeof leadCustomFieldValues.$inferSelect

/* ── (REG-613, parity Q-20) The lead event log — 1.0's `lead_activity_log`, kept only for what leaves no row of its own: a member
   removed, a field edited, a task / note / file deleted, a return undone, a portal invite, a questionnaire ask. The Activity feed
   unions these with everything it still derives from the records. */
export const leadEvents = sqliteTable(
  'lead_events',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),                  // member_removed | field_edited | task_deleted | note_deleted | file_trashed | file_deleted | return_undone | invite_sent | questionnaire_asked
    actorId: text('actor_id'),                     // members.id, null = the system
    at: integer('at', { mode: 'timestamp' }).notNull(),
    detail: text('detail', { mode: 'json' }),      // what the sentence needs: names, titles, the fields that changed
    projectId: text('project_id'),                 // (REG-912) a project's own event (kinds `project_…`) — the lead's Activity carries the project on
  },
  (t) => [index('lead_events_lead_idx').on(t.leadId), index('lead_events_project_idx').on(t.projectId)],
)
export type LeadEvent = typeof leadEvents.$inferSelect

/**
 * (REG-664, owner 2026-09-25: "folders for the templates … very similar to the Files tab, with all the move features", "wherever it is
 * applicable and best") A studio's folders in one library — each library keeps its own set (the owner's pick): the five template tabs
 * (`quotes` · `contracts` · `tasks` · `texts` · `payments`) and the Price book's two (`book-items` · `book-sections`). Folders nest
 * through `parent_id`, as the Files tab's do; an entry's `folder_id` places it (null = the top). Deleting a folder never deletes what it
 * holds: its entries and sub-folders move up a level (the owner's pick) — `deleted_at` keeps the row so Undo can put it all back.
 */
export const libraryFolders = sqliteTable(
  'library_folders',
  {
    id: text('id').primaryKey(),
    library: text('library').notNull(),
    name: text('name').notNull(),
    parentId: text('parent_id'),
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => [index('library_folders_library_idx').on(t.library)],
)
export type LibraryFolder = typeof libraryFolders.$inferSelect

/* ── AI Visualizer (REG-673, parity audit 16 §4) ─────────────────────────────────────────────────────────────────────────────────
   1.0's tables kept by name where they fit 2.0 (project_rooms · render_jobs · render_share_links · render_consultation_requests ·
   studio_materials); 1.0's derived designs + its JSON sessions became `visualizer_designs`, its portal pins `render_annotations`.
   Images are data URLs for what a studio uploads or the engine makes, public paths for the sample rooms (§4.2) — served through
   /visualizer/img so a page's payload carries addresses, not pictures. */

/** A design: one per lead (made on first open, named after the lead) or a personal one (Q-03). */
export const visualizerDesigns = sqliteTable(
  'visualizer_designs',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),                  // lead | personal
    leadId: text('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),                  // a lead's design shows the lead's name
    folderId: text('folder_id'),                   // library_folders (library `visualizer`) — personal designs only (Q-04)
    customJson: text('custom_json'),               // the design's own swatches (1.0's session customs): [{ id, name, hex, imageUrl, category, finish }]
    createdBy: text('created_by').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    deletedBy: text('deleted_by'),
    /* (audit 2026-09-26, F115) A personal copy of a lead's design keeps the lead it came from: the copy carries the client's photos, so it
       follows Who sees leads as the original does. No foreign key — a lead deleted for good leaves its copies to Owners and Admins. */
    sourceLeadId: text('source_lead_id'),
  },
  /* (audit 2026-09-26, F215) one lead design per lead — two first opens at once can't make a second */
  (t) => [index('visualizer_designs_lead_idx').on(t.leadId), uniqueIndex('visualizer_designs_lead_one_idx').on(t.leadId).where(sql`kind = 'lead'`)],
)
export type VisualizerDesign = typeof visualizerDesigns.$inferSelect

/** 1.0's `project_rooms`: a room — one photo in a design, with its reading and the work waiting on it. */
export const projectRooms = sqliteTable(
  'project_rooms',
  {
    id: text('id').primaryKey(),
    designId: text('design_id').notNull().references(() => visualizerDesigns.id, { onDelete: 'cascade' }),
    leadId: text('lead_id'),                       // 1.0's column: the design's lead
    projectId: text('project_id'),                 // 1.0's column: null until Projects
    name: text('name').notNull(),
    originalImageUrl: text('original_image_url'),  // the Original — a public path or a data URL
    sampleKey: text('sample_key'),                 // a sample room (lib/visualizer/samples.ts): its curated reading and finished renders
    sourceFileId: text('source_file_id'),          // the lead file it was opened from (Q-31)
    detectionJson: text('detection_json'),         // Detection — the reading and every manual add (Q-07)
    stateJson: text('state_json'),                 // Pending — the picks waiting for Generate, autosaved (Q-07)
    /* (audit 2026-09-26, F200) the reference and piece photos the studio added, { id: data URL } — read only by /visualizer/img/a/{room}/{id};
       the state carries their addresses, so a page and an autosave never carry the pictures */
    assetsJson: text('assets_json'),
    /* (audit 2026-09-26, two tabs) the state's revision: an autosave writes only on the revision its tab last saw */
    stateRev: integer('state_rev').notNull().default(0),
    /* (audit 2026-09-26, F090) the room as it was before Change photo — its Undo puts it back */
    priorPhotoJson: text('prior_photo_json'),
    position: integer('position').notNull().default(0),
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => [index('project_rooms_design_idx').on(t.designId)],
)
export type ProjectRoom = typeof projectRooms.$inferSelect

/** 1.0's `render_jobs`: one Generate. Its variants are the room's versions (V1, V2…), each with its parent and what it changed. */
export const renderJobs = sqliteTable(
  'render_jobs',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id').notNull().references(() => projectRooms.id, { onDelete: 'cascade' }),
    leadId: text('lead_id'),
    projectId: text('project_id'),
    model: text('model').notNull(),                // fast | high (1.0: the image model's id)
    status: text('status').notNull().default('completed'),
    kind: text('kind').notNull(),                  // edit | restyle | relight | transfer | empty | furnish | sketch | note
    style: text('style'),                          // the descriptor the strip prints ("Japandi", "Edit · Modern", "Relit · Golden Hour")
    variantsJson: text('variants_json').notNull(), // [{ id, n, imageUrl, materials[{label, material}], parentKey, applied, finishes, deletedAt? }]
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
  },
  (t) => [index('render_jobs_room_idx').on(t.roomId)],
)
export type RenderJob = typeof renderJobs.$inferSelect

/** (audit 2026-09-26, F213) A version's picture, beside its job — `variants_json` keeps the address (/visualizer/img/v/{job}/{variant}), so
    the gallery, the editor and Activity read a few hundred bytes a job, never the pictures. */
export const renderImages = sqliteTable(
  'render_images',
  {
    jobId: text('job_id').notNull().references(() => renderJobs.id, { onDelete: 'cascade' }),
    variantId: integer('variant_id').notNull(),
    data: text('data').notNull(),                  // a data URL
  },
  (t) => [uniqueIndex('render_images_key_idx').on(t.jobId, t.variantId)],
)

/** (audit 2026-09-26, F095 · F194) A render filed in the lead's Files › Renders: the version it is, by identity, not by name — Save to Files
    finds it again after a rename, and Files opens that very version. No foreign key to the design: the file (and its own copy of the
    picture, lead_file_images) outlives the design's Delete forever (F093). */
export const leadFileRenders = sqliteTable(
  'lead_file_renders',
  {
    fileId: text('file_id').primaryKey().references(() => leadFiles.id, { onDelete: 'cascade' }),
    renderKey: text('render_key').notNull(),       // `${jobId}:${variantId}`
    designId: text('design_id').notNull(),
    roomId: text('room_id').notNull(),
    n: integer('n').notNull(),                     // the version's number, V{n}, when it was filed
  },
  (t) => [index('lead_file_renders_key_idx').on(t.renderKey)],
)
export type LeadFileRender = typeof leadFileRenders.$inferSelect

/** 1.0's `render_share_links`: one link to the client — the versions picked, frozen as they were sent (Q-14). */
export const renderShareLinks = sqliteTable(
  'render_share_links',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull(),
    designId: text('design_id').notNull().references(() => visualizerDesigns.id, { onDelete: 'cascade' }),
    leadId: text('lead_id'),
    snapshot: text('snapshot').notNull(),          // { versions: [{ key, roomId, roomName, label, imageUrl, beforeUrl, materials[] }] }
    message: text('message'),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    viewCount: integer('view_count').notNull().default(0),
    lastViewedAt: integer('last_viewed_at', { mode: 'timestamp' }),
    sentVia: text('sent_via'),                     // whatsapp | copy
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    revokedAt: integer('revoked_at', { mode: 'timestamp' }),
    /* (pending modules S02 — 1.0 H-82…H-84, "Show to homeowner" on a render in Files) The Files entry whose *Show to client* put this one
       version on the client's Designs; its *Stop showing* stops the link (revoked_at), and showing it again reopens the same link, so the
       client's favourite and pins come back with it. null = a share made in the AI Visualizer. */
    fileId: text('file_id'),
  },
  (t) => [uniqueIndex('render_share_links_token_idx').on(t.token), index('render_share_links_design_idx').on(t.designId), index('render_share_links_file_idx').on(t.fileId)],
)
export type RenderShareLink = typeof renderShareLinks.$inferSelect

/** 1.0's `render_consultation_requests`: what the client says on the link — a favourite, a note, a call back (Q-16). */
export const renderConsultationRequests = sqliteTable(
  'render_consultation_requests',
  {
    id: text('id').primaryKey(),
    shareLinkId: text('share_link_id').notNull().references(() => renderShareLinks.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),                  // favourite | note | call_back
    versionKey: text('version_key'),               // `${jobId}:${variantId}`
    clientName: text('client_name'),
    clientPhone: text('client_phone'),
    message: text('message'),
    taskId: text('task_id'),                       // the call back's Follow-up
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('render_consultation_link_idx').on(t.shareLinkId)],
)
export type RenderConsultationRequest = typeof renderConsultationRequests.$inferSelect

/** Pins on a version — 1.0's `homeowner_shared_assets.metadata.annotations[]`, off the portal: the studio's in the editor, the client's on the link (Q-15). */
export const renderAnnotations = sqliteTable(
  'render_annotations',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id').notNull().references(() => renderJobs.id, { onDelete: 'cascade' }),
    variantId: integer('variant_id').notNull(),
    x: real('x').notNull(),
    y: real('y').notNull(),
    body: text('body').notNull(),
    status: text('status').notNull().default('open'),   // open | resolved
    authorRole: text('author_role').notNull(),          // studio | client
    authorMemberId: text('author_member_id'),
    authorName: text('author_name').notNull(),
    commentsJson: text('comments_json'),                // [{ id, authorRole, authorName, authorMemberId, body, createdAt }]
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (t) => [index('render_annotations_job_idx').on(t.jobId)],
)
export type RenderAnnotation = typeof renderAnnotations.$inferSelect

/** 1.0's `studio_materials`: the studio's own swatches — Company › Materials and the picker's *Your library* (Q-18). */
export const studioMaterials = sqliteTable('studio_materials', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  imageUrl: text('image_url'),                     // a swatch photo (data URL), or null for a colour
  hex: text('hex').notNull(),                      // the colour a render uses (a photo's dominant colour)
  finish: text('finish').notNull().default('matte'),
  description: text('description'),
  folderId: text('folder_id'),                     // library_folders (library `materials`)
  priceBookItemId: text('price_book_item_id'),     // what it is quoted as (Q-17)
  uploadedBy: text('uploaded_by'),
  updatedBy: text('updated_by'),                   // (wave E, E5) whoever changed it last — the card's "edited … by"
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})
export type StudioMaterial = typeof studioMaterials.$inferSelect

/* ── AI credits & plans (REG-699…; audit design-source/context/parity/19-…, integration map 20-…) ────────────────────────────────────
   1.0's own tables and column names (qanvast-id-tool feat/om-ui-port: 002 · 009 · 317 · 318 · 321 · 326 · 328), so the developers'
   port is a mapping, not a rename (integration A-19). 2.0 is one studio, so 1.0's `studio_id` is left out, as on every 2.0 table.
   Dates are unix seconds, as everywhere in 2.0. Dodo's ids, `actual_cost_usd` and the webhook log are Platform (never shown). */

/** 1.0's `plans` (002 + 317 + 326; `trial_period_days` from the live plans API): free · pro_freelance · pro_studio · max. Prices in SGD
    cents; `credit_allowance` is per seat per month; a studio's month is `credit_allowance × seats`. */
export const plans = sqliteTable('plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  monthlyPrice: integer('monthly_price').notNull().default(0),
  yearlyPrice: integer('yearly_price').notNull().default(0),
  maxMembers: integer('max_members'),                              // Freelance = 1 (a person, not a team)
  creditAllowance: integer('credit_allowance').notNull().default(0),
  signupCreditGrant: integer('signup_credit_grant').notNull().default(0),
  featureFlags: text('feature_flags').notNull().default('{}'),     // JSON — the plan locks (Q-40 · later)
  minSeats: integer('min_seats').notNull().default(1),
  extraSeatPriceCents: integer('extra_seat_price_cents'),
  isContactSales: integer('is_contact_sales', { mode: 'boolean' }).notNull().default(false),
  trialPeriodDays: integer('trial_period_days').notNull().default(0),
  isHighlighted: integer('is_highlighted', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
})
export type Plan = typeof plans.$inferSelect

/** 1.0's `subscriptions` (009 + 321): the studio's plan. `status` active · trialing · past_due · cancelled; `billing_cycle` monthly · yearly.
    2.0 adds `trial_ends_at` and `cancel_at_period_end` (1.0 keeps them on Dodo's side) so the prototype can show them. */
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull(),
  billingCycle: text('billing_cycle').notNull().default('monthly'),
  status: text('status').notNull().default('active'),
  seats: integer('seats').notNull().default(1),
  currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }).notNull(),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }).notNull(),
  trialEndsAt: integer('trial_ends_at', { mode: 'timestamp' }),
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).notNull().default(false),
  cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
  graceUntil: integer('grace_until', { mode: 'timestamp' }),
  /** (pending modules S19 — 1.0's POST /api/billing/seats: fewer seats take effect on the next billing date) the seats the plan moves to at
      its renewal; null = no change waiting. 1.0 keeps the scheduled change on Dodo's side; the prototype keeps it here. */
  scheduledSeats: integer('scheduled_seats'),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
export type Subscription = typeof subscriptions.$inferSelect

/** 1.0's `studio_credit_balances` (318): the two buckets — this month's `plan_credits` (spent first, refreshed each period, never carried)
    and `topup_credits` (bought, welcome and refunds — never expire). One row. `enforcement_enabled` is 1.0's shadow switch; 2.0 adds
    `enforcement_starts_at` for the notice before credits count (integration B-32, Q-46). */
export const studioCreditBalances = sqliteTable('studio_credit_balances', {
  id: text('id').primaryKey(),                                     // 'studio' — one row
  planCredits: integer('plan_credits').notNull().default(0),
  topupCredits: integer('topup_credits').notNull().default(0),
  periodStart: integer('period_start', { mode: 'timestamp' }).notNull(),
  periodEnd: integer('period_end', { mode: 'timestamp' }).notNull(),
  enforcementEnabled: integer('enforcement_enabled', { mode: 'boolean' }).notNull().default(true),
  enforcementStartsAt: integer('enforcement_starts_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
export type StudioCreditBalance = typeof studioCreditBalances.$inferSelect

/** 1.0's `credit_ledger` (318): append-only. `reason` spend · refund · topup · refresh · grant · adjust · shadow_spend; `credits` signed;
    `ref_id` ties a charge to its work — `render:<job id>` · `quote:<quote id>` (integration B-12 · B-27: stable, so By lead reads it). */
export const creditLedger = sqliteTable('credit_ledger', {
  id: text('id').primaryKey(),
  memberId: text('member_id'),
  actionKey: text('action_key').notNull(),
  credits: integer('credits').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  reason: text('reason').notNull(),
  refId: text('ref_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (t) => [index('credit_ledger_at_idx').on(t.createdAt), index('credit_ledger_ref_idx').on(t.actionKey, t.refId)])
export type CreditLedgerRow = typeof creditLedger.$inferSelect

/** 1.0's `studio_member_credit_caps` (318): a member's monthly amount — null or no row = no limit. Only the Owner sets it (1.0's rule). */
export const studioMemberCreditCaps = sqliteTable('studio_member_credit_caps', {
  memberId: text('member_id').primaryKey(),
  monthlyCap: integer('monthly_cap'),
  updatedBy: text('updated_by'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
export type StudioMemberCreditCap = typeof studioMemberCreditCaps.$inferSelect

/** 1.0's `billing_checkout_sessions` (321 + 328): each checkout — a plan or a top-up. The prototype's demo checkout writes it as Dodo's
    webhook would (status pending → completed). */
export const billingCheckoutSessions = sqliteTable('billing_checkout_sessions', {
  id: text('id').primaryKey(),
  memberId: text('member_id'),
  kind: text('kind').notNull(),                                    // topup | plan | auto_topup (pending modules S19 — the studio's auto top-up)
  planId: text('plan_id'),
  seats: integer('seats').notNull().default(1),
  period: text('period').notNull().default('monthly'),
  status: text('status').notNull().default('pending'),             // pending | completed | failed | expired
  /** (pending modules S19) 1.0's `credits_requested` (2026-09-28): a top-up of any amount, 100–5,000 in steps of 50. null = 1.0's fixed 1,000. */
  creditsRequested: integer('credits_requested'),
  creditsGranted: integer('credits_granted'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  /** (pending modules S34) the trial chosen on the review step — a real provider's webhook finishes the session with it (app/credits/checkout.ts) */
  trial: integer('trial', { mode: 'boolean' }).notNull().default(false),
})
export type BillingCheckoutSession = typeof billingCheckoutSessions.$inferSelect

/** 1.0's `invoices` (009): the studio's tax invoices from the platform — a plan period or a top-up. */
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  subscriptionId: text('subscription_id'),
  invoiceNumber: text('invoice_number').notNull(),
  planName: text('plan_name').notNull(),                           // what it was for: "Pro — Studio · 7 seats" · "1,000 AI credits"
  amount: integer('amount').notNull(),                             // SGD cents
  currency: text('currency').notNull().default('SGD'),
  billingPeriodStart: integer('billing_period_start', { mode: 'timestamp' }).notNull(),
  billingPeriodEnd: integer('billing_period_end', { mode: 'timestamp' }).notNull(),
  status: text('status').notNull().default('paid'),                // paid | unpaid | void | refunded
  issuedAt: integer('issued_at', { mode: 'timestamp' }).notNull(),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
}, (t) => [uniqueIndex('invoices_number_uq').on(t.invoiceNumber)])
export type Invoice = typeof invoices.$inferSelect

/** 2.0 only (integration B-19): a member asks the Owner for more AI credits — the studio is out (`pool`), or their monthly amount is
    reached (`monthly`). Answered by raising the amount (1.0's caps) or by buying (1.0's checkout). 1.0's "Request more" did nothing. */
export const creditRequests = sqliteTable('credit_requests', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull(),
  kind: text('kind').notNull(),                                    // pool | monthly
  needed: integer('needed').notNull().default(0),
  status: text('status').notNull().default('open'),                // open | granted | declined
  answeredBy: text('answered_by'),
  answeredAt: integer('answered_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (t) => [index('credit_requests_status_idx').on(t.status, t.createdAt)])
export type CreditRequest = typeof creditRequests.$inferSelect

/* (pending modules S41b-4 — the S41b data sweep's M-02; 1.0's `nudge_state`, plg migration 432, kept under 1.0's name for the port) The Free
   plan's upgrade offers, one row per member who may be offered one (the Owner — 1.0's purchaser): which once-ever moments were offered
   (`spent`, { "T3": <ms> }), when the last offer or blocking moment showed (`last_modal_at` — the 10-minute gap) and the last proactive one
   (`last_proactive_at` — one a day), when "Only n AI credits left" last showed (`t7_last_shown_at`, its re-arm), the watermark the next look
   reads events after (`last_evaluated_at`), 1.0's `active_seconds` (kept at 0 — T1's active minutes are telemetry his Q-16 declined) and the
   compare-and-set `version`. 2.0 adds what the bell needs: the live offer's notification row (`offer_id`), what that offer said (`offer_json`,
   kept after it is answered so Not now can be undone) and how each offer was answered (`answers_json`, { "T3": { answer, at } }) — the
   records 1.0's analytics events stood for (R10). Times in milliseconds. */
export const nudgeState = sqliteTable('nudge_state', {
  memberId: text('member_id').primaryKey().references(() => members.id, { onDelete: 'cascade' }),
  spent: text('spent').notNull().default('{}'),
  lastModalAt: integer('last_modal_at', { mode: 'timestamp_ms' }),
  lastProactiveAt: integer('last_proactive_at', { mode: 'timestamp_ms' }),
  t7LastShownAt: integer('t7_last_shown_at', { mode: 'timestamp_ms' }),
  lastEvaluatedAt: integer('last_evaluated_at', { mode: 'timestamp_ms' }),
  activeSeconds: integer('active_seconds').notNull().default(0),
  version: integer('version').notNull().default(0),
  offerId: text('offer_id'),
  offerJson: text('offer_json'),
  answersJson: text('answers_json').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})
export type NudgeStateRow = typeof nudgeState.$inferSelect

/* ── Projects (REG-911…, owner 2026-10-05: "build all of it with your recommendations"; the build record
   design-source/context/parity/23-projects-build-2026-10-05.md) ──────────────────────────────────────────────────────────────────
   One client record in two chapters: a project always points at a lead (`lead_id`, unique — a lead never has two). A Won lead's
   project is made in the same press as the Won move; Projects › New project makes a `leads.direct` row and its project together.
   The project's team is the lead's members (`lead_assignees`); its tasks, files and activity are the lead's own records. */
export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    number: text('number').notNull(),                       // Settings › Projects › Project numbers — "P-2026-001"
    name: text('name').notNull(),                           // "{property type} — {client}" by default (Q-05), renamed at any stage
    stage: text('stage').notNull().default('setting_up'),   // setting_up | in_progress | completed (Q-03)
    projectType: text('project_type'),                      // the Won step's project type, or New project's
    quoteId: text('quote_id').references(() => quotes.id, { onDelete: 'set null' }),            // the signed (else the Won) quote
    contractId: text('contract_id').references(() => contracts.id, { onDelete: 'set null' }),   // the signed contract
    /** A direct project's agreed value, or a Won lead's uploaded signed quote's typed amount — the contract value when no system quote holds it. */
    agreedValueMinor: integer('agreed_value_minor'),
    /** The payment split agreed outside a system quote — a direct project's Payments template, or the Won step's milestones on an
        uploaded quote: `{ template: id | null, rows: [{ name, pct }] }`. A system quote's own Payment Schedule wins over it. */
    paymentTemplate: text('payment_template', { mode: 'json' }),
    startDate: integer('start_date', { mode: 'timestamp' }),
    targetEndDate: integer('target_end_date', { mode: 'timestamp' }),
    startedAt: integer('started_at', { mode: 'timestamp' }),       // moved to In progress
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    deletedBy: text('deleted_by'),
    /* (Projects round 7 — Q-24 · Q-26) The ending, on the quotes' approval shape (REG-624): who completed the handover and why when the
       checklist was not met (Complete anyway); a Designer's request for an owner's review (Settings › Projects › Handover needs an owner's
       review), its answer when sent back, and the last Reopen. Every step also writes its `project_…` event, so Activity keeps the history. */
    completedBy: text('completed_by'),
    completeNote: text('complete_note'),                             // the handover's note for the record
    completeReason: text('complete_reason'),                         // Complete anyway: why it was completed with items open; null = all met
    handoverRequestedBy: text('handover_requested_by'),              // waiting for an Owner's or an Admin's review
    handoverRequestedAt: integer('handover_requested_at', { mode: 'timestamp' }),
    handoverNote: text('handover_note'),                             // the request's note to the reviewer
    handoverReviewNote: text('handover_review_note'),                // sent back with this note — kept until it is requested again
    handoverReviewedBy: text('handover_reviewed_by'),
    handoverReviewedAt: integer('handover_reviewed_at', { mode: 'timestamp' }),
    reopenedBy: text('reopened_by'),
    reopenedAt: integer('reopened_at', { mode: 'timestamp' }),
    reopenReason: text('reopen_reason'),
    /* (gaps build, package A — M-01) On hold: a mark on a project that has not ended, never a stage (Q-03 keeps three). Since when, why
       (the client reads it on their schedule — package D), the day it should resume (a day's ms, may be null) and who put it on hold.
       `lib/projects/hold.ts` `holdOf(p)` reads them; Resume clears all four. */
    onHoldAt: integer('on_hold_at', { mode: 'timestamp_ms' }),
    onHoldReason: text('on_hold_reason'),
    onHoldUntil: integer('on_hold_until'),
    onHoldBy: text('on_hold_by'),
    /* (gaps build, package A) The scope's rooms — 1.0's twelve chips (`ROOMS` in lib/projects/model.ts), a JSON array of their names. */
    scope: text('scope', { mode: 'json' }),
    /* (gaps build, package A) The handover's deferred items, each with its own reason — `[{ key, item, reason }]`: the asker's with a request,
       the record's once completed (the completed line names them); cleared by Reopen. */
    handoverDeferred: text('handover_deferred', { mode: 'json' }),
    /* (parity map, TD-049 · UC-094) the studio asked the client for their floor plan — who, when (the client's page shows the ask until a plan comes) */
    floorPlanAskedAt: integer('floor_plan_asked_at', { mode: 'timestamp_ms' }),
    floorPlanAskedBy: text('floor_plan_asked_by'),
  },
  (t) => [uniqueIndex('projects_lead_uq').on(t.leadId), index('projects_stage_idx').on(t.stage)],
)
export type Project = typeof projects.$inferSelect

/* ── Projects round 3 · Updates (REG-948…, the build record §3 round 3; the report's Updates row: "A tab of posts with a composer that
   really uploads. States: Draft, In review, Published, Sent back (with its reason and Resubmit). Edit and unpublish at any time") ──────
   A project's update to its client: a title, a few lines (the house rich editor's HTML, sanitised on save as a contract's is), the
   milestone it belongs to (round 2's `project_milestones` id, a plain text id with no foreign key), and its pictures, videos and
   documents — real uploads, filed in the lead's Files under "Site updates" (`project_update_files` links them, as `quote_files` does:
   an update never owns a file). Its review is Settings › Projects › *Updates need review before the client sees them* (Q-17): an
   Owner's or an Admin's post publishes at once, anyone else's waits In review for one of them. Every state keeps who and when. */
export const projectUpdates = sqliteTable(
  'project_updates',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body'),                                        // sanitised HTML (lib/contracts/sanitize.ts), null = no words
    milestoneId: text('milestone_id'),                         // round 2's project_milestones.id — no foreign key (the build record §3)
    status: text('status').notNull().default('draft'),         // draft | in_review | published | sent_back | withdrawn
    authorId: text('author_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    editedAt: integer('edited_at', { mode: 'timestamp' }),     // changed after it was first sent or posted — the feed's "Edited"
    editedBy: text('edited_by'),
    submittedBy: text('submitted_by'),
    submittedAt: integer('submitted_at', { mode: 'timestamp' }),
    reviewedBy: text('reviewed_by'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    reviewNote: text('review_note'),                           // a Send back's reason, kept until it is resubmitted
    publishedBy: text('published_by'),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    withdrawnBy: text('withdrawn_by'),
    withdrawnAt: integer('withdrawn_at', { mode: 'timestamp' }),
    clientOpenedAt: integer('client_opened_at', { mode: 'timestamp' }),   // the portal writes it (round 4b); Withdraw stops once it is set
    clientOpenedBy: text('client_opened_by'),                          // (fix-F, C-07) homeowner_profiles.id of who opened it — the client or someone from their household
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    deletedBy: text('deleted_by'),
    /** (fix-C, C-01) A change to a PUBLISHED update that waits for review — the client keeps reading the published words (and its date)
        until an Owner or an Admin approves it (the template rule, REG-501). JSON `UpdatePendingRecord` (lib/projects/updates-model.ts):
        the title, body, milestone and file ids as edited, who and when, and a Send back's reason. null = nothing waiting. */
    pending: text('pending', { mode: 'json' }),
  },
  (t) => [index('project_updates_project_idx').on(t.projectId, t.createdAt), index('project_updates_status_idx').on(t.status)],
)
export type ProjectUpdate = typeof projectUpdates.$inferSelect

/** An update's pictures, videos and documents, in the order they were attached — each one a file of the lead's (Files › Site updates). */
export const projectUpdateFiles = sqliteTable(
  'project_update_files',
  {
    updateId: text('update_id').notNull().references(() => projectUpdates.id, { onDelete: 'cascade' }),
    fileId: text('file_id').notNull().references(() => leadFiles.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [uniqueIndex('project_update_files_uq').on(t.updateId, t.fileId), index('project_update_files_file_idx').on(t.fileId)],
)
/* ── The client portal, part one (Projects round 4a — Q-14 · Q-37…Q-50; the Client Portal Proposal, boards 1 · 5…9) ───────────────────────
   The address a studio's clients sign in at (`/my/<slug>`): one current row, the old ones kept so a link already sent keeps working
   (it redirects). Live / Paused and the set-up stamps sit in `settings` under `portal` (lib/portal/model.ts). */
export const portalAddresses = sqliteTable('portal_addresses', {
  slug: text('slug').primaryKey(),                                  // unique across the history — an old address is never handed out again
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'),                                    // null = made from the studio's name
  retiredAt: integer('retired_at', { mode: 'timestamp' }),          // null = the current address
})
export type PortalAddress = typeof portalAddresses.$inferSelect

/** A signed-in client (phone + a one-time code), or a studio member's read-only look (`preview`: See it as the client · Open as a test
    client — nothing it does is recorded as the client's). The cookie carries the id; a withdrawn number or a sign-out ends it. */
export const portalSessions = sqliteTable(
  'portal_sessions',
  {
    id: text('id').primaryKey(),
    homeownerId: text('homeowner_id').notNull().references(() => homeownerProfiles.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull().default('client'),                 // client | preview
    memberId: text('member_id'),                                    // preview: the member looking
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }),
    endedAt: integer('ended_at', { mode: 'timestamp' }),
  },
  (t) => [index('portal_sessions_homeowner_idx').on(t.homeownerId)],
)
export type PortalSession = typeof portalSessions.$inferSelect
/* ── Projects round 2 — the Schedule (Q-09 · Q-10 · Q-11 · Q-12 · Q-13 · Q-15 · Q-16; the Project Schedule Proposal, accepted as drawn) ──
   A project's milestones are real records with rules on the server (1.0 kept one JSON array, saved whole). Each milestone may MOVE WITH
   the one it follows: it keeps its gap (calendar days, negative = overlap) when that one moves, so a move carries what follows. The client
   never sees live rows: Share changes stores what they will see in `project_schedule_shares`, and the portal reads the newest snapshot. */
export const projectMilestones = sqliteTable(
  'project_milestones',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    position: integer('position').notNull().default(0),
    startDate: integer('start_date', { mode: 'timestamp' }).notNull(),   // the first day, local midnight (calendar days, Q-11)
    endDate: integer('end_date', { mode: 'timestamp' }).notNull(),       // the last day, inclusive
    status: text('status').notNull().default('not_started'),            // not_started | in_progress | blocked | done
    /** What it moves with: the milestone it follows, and its start's distance in days from that one's last day (1.0's `dependsOn`). */
    followsId: text('follows_id'),
    gapDays: integer('gap_days').notNull().default(1),
    /** (Q-13) The payment stage it is tied to: a row of the signed quote's Payment Schedule (`quote_payments.id`), or `split:<n>` — the
        n-th share of a direct project's agreed split. Falls due when the milestone starts or when it is done. */
    paymentRef: text('payment_ref'),
    paymentDue: text('payment_due').notNull().default('end'),           // start | end
    /** "Shown to the client": the name, the dates and whether it is done reach the portal once shared. */
    clientVisible: integer('client_visible', { mode: 'boolean' }).notNull().default(true),
    /** (Q-16) The studio asks the client to confirm it once done; the portal (round 4b) writes the answer. */
    confirmAskedAt: integer('confirm_asked_at', { mode: 'timestamp' }),
    confirmAnswer: text('confirm_answer'),                              // confirmed | changes
    confirmNote: text('confirm_note'),
    confirmAnsweredAt: integer('confirm_answered_at', { mode: 'timestamp' }),
    /** (Projects round 4b) Who answered on the portal — a `homeowner_profiles.id` (round 9 brings someone else from the household). */
    confirmAnsweredBy: text('confirm_answered_by'),
    /** Waiting on someone — the client, a member or a supplier — for what, since when, until when. */
    waitingOn: text('waiting_on'),                                      // client | member | supplier
    waitingMemberId: text('waiting_member_id'),
    waitingName: text('waiting_name'),                                  // the supplier's name
    waitingNote: text('waiting_note'),
    waitingSince: integer('waiting_since', { mode: 'timestamp' }),
    waitingUntil: integer('waiting_until', { mode: 'timestamp' }),
    /** Plan against actual: the dates the client was first shown (set by the first share that carries the milestone). */
    planStartDate: integer('plan_start_date', { mode: 'timestamp' }),
    planEndDate: integer('plan_end_date', { mode: 'timestamp' }),
    doneAt: integer('done_at', { mode: 'timestamp' }),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),            // a delete is soft, so Undo can bring it back
    /* (gaps build, package C) A milestone's own words and colour (1.0's description and its eight swatches); the day it really started (the
       Started prompt logs it); the studio's answer to the client's "not right" — `resolved_note` / `resolved_at` are the contract package D reads
       for the client's schedule; a non-owner's Done waiting for an Owner or an Admin (Settings › Projects › Milestone completion needs approval);
       what the client reads about a pause (an optional line the studio writes on a Blocked stage — the portal's "Paused" reads it). */
    description: text('description'),
    color: text('color'),                                               // one of MILESTONE_COLORS' keys; null = by status
    startedAt: integer('started_at', { mode: 'timestamp_ms' }),
    resolvedNote: text('resolved_note'),
    resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
    resolvedBy: text('resolved_by'),
    doneAskedBy: text('done_asked_by'),
    doneAskedAt: integer('done_asked_at', { mode: 'timestamp_ms' }),
    clientNote: text('client_note'),
    /* (simplify S-18, 2026-10-09) The Mark done sheet's ticks that ride with a Done waiting for approval — JSON `{ day, bringForward, share,
       shareOnly, askConfirm, fileIds, invoiceId }` (lib/projects/schedule-moments.ts `parseDoneTicks`); the Owner's or the Admin's *Approve as
       done* runs them, a send-back or a take-back clears them. Null = nothing rides with it (an ask made before the sheet). */
    doneAskJson: text('done_ask_json'),
    /* (parity map, CP-064) a blocked stage's expected restart — the client reads "Resuming around …" */
    resumeOn: integer('resume_on', { mode: 'timestamp' }),
  },
  (t) => [index('project_milestones_project_idx').on(t.projectId, t.position)],
)
export type ProjectMilestone = typeof projectMilestones.$inferSelect

/** (Q-15) What the client last saw: every Share changes stores the schedule as the portal will draw it, the changes it carried and the note. */
export const projectScheduleShares = sqliteTable(
  'project_schedule_shares',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    snapshot: text('snapshot', { mode: 'json' }).notNull(),             // lib/projects/schedule-model.ts `ScheduleSnapshot`
    changes: text('changes', { mode: 'json' }).notNull(),               // `ScheduleChange[]` — what this share changed for the client
    note: text('note'),
    sharedBy: text('shared_by'),
    sharedAt: integer('shared_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('project_schedule_shares_project_idx').on(t.projectId, t.sharedAt)],
)
export type ProjectScheduleShare = typeof projectScheduleShares.$inferSelect

/** (Q-12) Company › Templates › Schedules: the milestones a schedule can start from — each a length in days and its gap after the one before. */
export const scheduleTemplates = sqliteTable('schedule_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  folderId: text('folder_id'),                                          // (REG-664) its folder in Templates › Schedules; null = the top
  presetKey: text('preset_key'),                                        // (gaps build, package C) a ready-made schedule every studio gets (lib/projects/schedule-presets.ts); null = the studio's own
})
export type ScheduleTemplate = typeof scheduleTemplates.$inferSelect
export const scheduleTemplateItems = sqliteTable(
  'schedule_template_items',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id').notNull().references(() => scheduleTemplates.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    title: text('title').notNull(),
    days: integer('days').notNull().default(5),                         // its length, calendar days
    gapDays: integer('gap_days').notNull().default(1),                  // its start after the one before ends (negative = overlap); the first counts from works start
    askConfirm: integer('ask_confirm', { mode: 'boolean' }).notNull().default(false),
    /* (parity map, SC-016) what a template keeps beyond the length and the gap: the words, the colour, the links by position (JSON number[]) */
    description: text('description'),
    color: text('color'),
    followsJson: text('follows_json'),
  },
  (t) => [index('schedule_template_items_template_idx').on(t.templateId, t.position)],
)
export type ScheduleTemplateItem = typeof scheduleTemplateItems.$inferSelect

/* ── Projects round 8 — Selections, "Choices" (Q-18, Q-45's Choices; the report's "Design tools … selections"; 1.0's Materials sub-tab) ─────
   A question put to the client — "Paint colours" for the living and bedrooms — with the options to choose from. The studio adds it as a
   Draft, shares it (it appears on the client's portal), and the client picks one with a note; or the studio picks on their behalf ("Chosen
   with the client on a call"), and may change a pick until the work it belongs to starts. The pick is stored BY ID, never by position (1.0's
   F-159 · F-174), and every option's picture is a file of the lead's (Files › Choices, its bytes in `lead_file_images` as an upload's are), so
   the portal serves it through its own file route. A price difference is against the quote — round 6 drafts a variation order from it
   (`pickPriceDifference` in lib/projects/choices.ts). */
export const projectSelections = sqliteTable(
  'project_selections',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),                                     // "Paint colours"
    room: text('room'),                                                 // "Living and bedrooms" — the tab groups by it
    milestoneId: text('milestone_id'),                                  // round 2's project_milestones.id (optional) — no foreign key, as updates
    neededBy: integer('needed_by', { mode: 'timestamp' }),              // local midnight of the day the studio needs the answer
    note: text('note'),                                                 // a line for the client under the title
    status: text('status').notNull().default('draft'),                  // draft | shared | chosen
    chosenOptionId: text('chosen_option_id'),                           // the pick, by id
    chosenBy: text('chosen_by'),                                        // client | studio
    chosenMemberId: text('chosen_member_id'),                           // the member who chose with the client (studio)
    chosenHomeownerId: text('chosen_homeowner_id'),                     // (fix-F, F-03) homeowner_profiles.id of who picked it on the portal (client)
    chosenAt: integer('chosen_at', { mode: 'timestamp' }),
    chosenNote: text('chosen_note'),                                    // the client's note, or the studio's "Chosen with the client on a call"
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    sharedBy: text('shared_by'),
    sharedAt: integer('shared_at', { mode: 'timestamp' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),            // soft, so Undo can bring it back
    deletedBy: text('deleted_by'),
    /* (gaps build D, item 2 — M-07; 1.0 I-284 · F-150 · F-158) The client can say no: *None of these work* → **Turn them down** or **Ask for
       other options**, with a reason. The choice goes back to the studio as status `declined` (it no longer waits on the client), the answer
       and its words kept here; sharing it again (with new options) clears them — the trail stays in Activity. */
    clientAnswer: text('client_answer'),                                // reject | other_options
    clientAnswerNote: text('client_answer_note'),
    clientAnswerAt: integer('client_answer_at', { mode: 'timestamp_ms' }),
    clientAnswerBy: text('client_answer_by'),                           // homeowner_profiles.id of who answered on the portal
    /* (gaps build D, item 11 — 1.0 F-162) a note for the team only — never on the portal, the receipt or the client's preview */
    studioNote: text('studio_note'),
    /* (gaps build D, item 7 — 1.0 F-129 · F-163 · I-287) The selection receipt of a confirmed pick: its entry in Files › Choices (a lead file
       that opens the receipt page, as a payment receipt's does) and the fingerprint printed on it (SHA-256 over what it says). */
    receiptFileId: text('receipt_file_id'),
    receiptHash: text('receipt_hash'),
  },
  (t) => [index('project_selections_project_idx').on(t.projectId, t.createdAt), index('project_selections_status_idx').on(t.status)],
)
export type ProjectSelection = typeof projectSelections.$inferSelect

/** One option of a choice, in the order the studio set: its name and words, its picture (a lead file) or a colour, its price against the quote. */
export const projectSelectionOptions = sqliteTable(
  'project_selection_options',
  {
    id: text('id').primaryKey(),
    selectionId: text('selection_id').notNull().references(() => projectSelections.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    fileId: text('file_id').references(() => leadFiles.id, { onDelete: 'set null' }),   // the picture, as the lead's Files keep it
    hex: text('hex'),                                                   // a colour with no picture (a paint from Materials)
    /** Against the quote, in cents: positive adds, negative saves, null = no change (0 is stored as null). */
    priceMinor: integer('price_minor'),
    source: text('source').notNull().default('upload'),                 // material | price_book | render | upload
    sourceRef: text('source_ref'),                                      // the material's or Price book item's id, a render's `jobId:variantId`
    position: integer('position').notNull().default(0),
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    /* (gaps build D, item 11 — 1.0 F-139 · F-146) who supplies it ("Nippon Paint", "Hafele") — a Price book item brings its own */
    vendor: text('vendor'),
  },
  (t) => [index('project_selection_options_selection_idx').on(t.selectionId, t.position), index('project_selection_options_file_idx').on(t.fileId)],
)
export type ProjectSelectionOption = typeof projectSelectionOptions.$inferSelect

/* ── Projects round 5 · Money in, part one (F-01…F-20, the build record §1; the 1.0 inventory G §7 · §8 — the model ported, its faults
   left behind) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   A project's invoices to its client — NOT `invoices`, which is the studio's own plan billing. One per payment stage (the signed quote's
   Payment Schedule row, `stage_ref` = its `quote_payments.id`, or `split:<n>` of a direct project's agreed split), made as a Draft with the
   project. Its number is given when it is sent (Settings › Projects › Invoice numbers); its due date is the send day + the payment terms.
   Draft · Sent · Void are stored; Part paid · Paid are worked out from round 6's payments; Overdue from the due date (lib/projects/money.ts).
   A Draft's amount follows the contract value (the rebalance) until someone edits it — then `variance_reason` says why it differs. A void
   keeps its row; the fresh Draft that takes its share points back at it (`replaces_id`). */
export const projectInvoices = sqliteTable(
  'project_invoices',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    stageRef: text('stage_ref').notNull(),                               // quote_payments.id | split:<n>
    stageName: text('stage_name').notNull(),                             // the stage as agreed ("Deposit")
    pct: real('pct').notNull().default(0),                               // its share of the contract value
    position: integer('position').notNull().default(0),
    number: text('number'),                                              // INV-2026-001 — given when sent
    status: text('status').notNull().default('draft'),                   // draft | sent | void
    amountMinor: integer('amount_minor').notNull().default(0),           // what the client pays, GST included (F-03: GST split out of the slice)
    gstMinor: integer('gst_minor').notNull().default(0),
    issuingEntity: text('issuing_entity'),                               // the entity it is raised under (the quote's); null = the studio
    varianceReason: text('variance_reason'),                             // F-09: why an edited amount differs from the schedule
    editedBy: text('edited_by'),
    editedAt: integer('edited_at', { mode: 'timestamp' }),
    submittedBy: text('submitted_by'),                                   // F-05: waiting for an Owner's or an Admin's approval
    submittedAt: integer('submitted_at', { mode: 'timestamp' }),
    reviewNote: text('review_note'),                                     // sent back with a note, kept until it is submitted again
    reviewedBy: text('reviewed_by'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    sentBy: text('sent_by'),
    sentAt: integer('sent_at', { mode: 'timestamp' }),
    dueAt: integer('due_at', { mode: 'timestamp' }),
    voidReason: text('void_reason'),                                     // F-18
    voidedBy: text('voided_by'),
    voidedAt: integer('voided_at', { mode: 'timestamp' }),
    replacesId: text('replaces_id'),                                     // the voided invoice whose share this Draft took
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    /* (Projects fix-D, D-02 · F-08) The contract the invoice was raised on, stamped when it is sent: a sent invoice never changes, so its
       paper keeps the contract value it was issued against (the signed quote or agreed value + the variation orders approved by then). */
    contractMinor: integer('contract_minor'),
    baseMinor: integer('base_minor'),
    variationsMinor: integer('variations_minor'),
    /* (gaps build B — M-04 · the report's 4-finance rows) Money in, complete. What an invoice bills: a payment stage (`stage`), a variation order
       billed on its own (`variation`, `stage_ref` = `vo:<quoteId>` — in the contract, always locked in the allocation), a one-off outside the
       stages (`one_off`, `stage_ref` = `extra:<id>` — never in the contract value) or one recorded from elsewhere (`external`: a stage's ref when it
       stands for that stage, else `extra:<id>`). */
    kind: text('kind').notNull().default('stage'),
    variationId: text('variation_id'),                                  // the variation order it bills (kind = variation)
    reason: text('reason'),                                             // a one-off's reason: reimbursement | upgrade | out_of_scope | other
    description: text('description'),                                  // what the client reads under the invoice's line (every kind)
    clientNote: text('client_note'),                                    // a note to the client, printed at the paper's foot
    linesJson: text('lines_json'),                                      // a one-off's lines: [{ id, description, qty, unitMinor }] before GST
    chargeGst: integer('charge_gst', { mode: 'boolean' }),              // a one-off's lines carry GST on top (null = a stage's rule: split out)
    dueMode: text('due_mode'),                                          // null = the payment terms · date · handover (the project's target end)
    dueOn: integer('due_on', { mode: 'timestamp' }),                    // the day picked on a Draft (due_mode = date)
    externalRef: text('external_ref'),                                  // a recorded invoice's own number, as the other system gave it
    externalFileId: text('external_file_id'),                           // its file in Files › Payments (lead_files.id)
    shareToken: text('share_token'),                                    // the no-login link `/invoice/<token>` (sent and void invoices only answer)
    fileId: text('file_id'),                                            // its entry in Files › Payments once sent — the entry opens this page
    fixedMinor: integer('fixed_minor'),                                 // a fixed-amount stage (Settings › Projects › fee first): it bills this, never a share
  },
  (t) => [index('project_invoices_project_idx').on(t.projectId, t.position), uniqueIndex('project_invoices_number_uq').on(t.number), uniqueIndex('project_invoices_token_uq').on(t.shareToken)],
)
export type ProjectInvoice = typeof projectInvoices.$inferSelect

/* ── The client portal, part two (Projects round 9 — Q-41 · Q-42 · Q-44 · Q-45; the Client Portal Proposal, boards 8 · 9) ──────────────────
   Someone else from the household (Q-42): their own number, their own sign-in on the same lead (and so its project) and their own invited /
   opened / last opened / withdrawn state. The lead's own link (`homeowner_lead_links`, one per lead) stays the primary client's; a household
   link names the lead directly, so it follows the lead into its project (1.0's M-236: a lead-stage family member was left behind). A remove is
   soft (`removed_at`, Undo clears it) — 1.0 hard-deleted with no Undo (M-239). */
export const homeownerHouseholdLinks = sqliteTable(
  'homeowner_household_links',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    homeownerId: text('homeowner_id').notNull().references(() => homeownerProfiles.id, { onDelete: 'cascade' }),
    relationship: text('relationship'),                               // "Wife", "Son", "Co-owner" — optional, as the studio typed it
    addedBy: text('added_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    invitedAt: integer('invited_at', { mode: 'timestamp' }),
    invitedBy: text('invited_by'),
    openedAt: integer('opened_at', { mode: 'timestamp' }),
    lastOpenedAt: integer('last_opened_at', { mode: 'timestamp' }),
    withdrawnAt: integer('withdrawn_at', { mode: 'timestamp' }),
    withdrawnBy: text('withdrawn_by'),
    /* their own last look at the Schedule tab (round 4b's mark of what changed since) */
    scheduleSeenAt: integer('schedule_seen_at', { mode: 'timestamp' }),
    removedAt: integer('removed_at', { mode: 'timestamp' }),
    removedBy: text('removed_by'),
  },
  (t) => [uniqueIndex('homeowner_household_links_uq').on(t.leadId, t.homeownerId), index('homeowner_household_links_homeowner_idx').on(t.homeownerId)],
)
export type HomeownerHouseholdLink = typeof homeownerHouseholdLinks.$inferSelect

/** (Projects round 9, Q-41) The portal's bell: its rows are derived from the records (lib/portal/notifications.ts — a share, a published
    update, a stage to confirm, a choice, an invoice), so only what each person has read is stored — per person, never per home. */
export const portalBellReads = sqliteTable(
  'portal_bell_reads',
  {
    homeownerId: text('homeowner_id').notNull().references(() => homeownerProfiles.id, { onDelete: 'cascade' }),
    rowKey: text('row_key').notNull(),
    readAt: integer('read_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [uniqueIndex('portal_bell_reads_uq').on(t.homeownerId, t.rowKey)],
)
export type PortalBellRead = typeof portalBellReads.$inferSelect

/* ── Projects round 6 · Money in, part two (F-10 · F-11 · F-12 · F-13 · F-18, Q-48; the 1.0 inventory G §11 — its faults left behind: the
   proof is shown to the studio, a wrong payment can be reversed, a client's proof never marks an invoice paid by itself) ─────────────────
   A payment against one of a project's invoices. The studio records one (bank transfer · PayNow · cheque · cash) and it is Confirmed on
   entry; a client says "I have paid" on their portal with the amount, the day, a reference and the bank's confirmation (`proof_file_id`, a
   file of the lead's in Files › Payments) and it waits as To confirm for the confirmer Settings › Projects names — unless *Trust the client's
   proof* was on when it came (`trusted`: it counts at once and still waits to be checked). Confirm gives it its receipt number
   (RCT-{YYYY}-{seq}, Settings › Projects); Not received refuses it with a reason the client reads; an Owner or an Admin reverses a confirmed
   one with a reason (its receipt then reads Reversed). An invoice's Part paid / Paid is worked out from the payments that count
   (lib/projects/money.ts); nothing here is ever deleted but a payment's own Undo right after it was recorded. */
export const projectPayments = sqliteTable(
  'project_payments',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    invoiceId: text('invoice_id').notNull().references(() => projectInvoices.id, { onDelete: 'cascade' }),
    amountMinor: integer('amount_minor').notNull(),
    paidOn: integer('paid_on', { mode: 'timestamp' }).notNull(),          // the day the money moved (local midnight)
    method: text('method').notNull(),                                    // bank_transfer | paynow | cheque | cash
    reference: text('reference'),                                        // the bank's or the cheque's reference
    note: text('note'),                                                  // the client's note to the studio, or the studio's own
    proofFileId: text('proof_file_id'),                                  // lead_files.id — the bank's confirmation (Files › Payments)
    source: text('source').notNull(),                                    // studio | client
    status: text('status').notNull(),                                    // to_confirm | confirmed | not_received | reversed
    trusted: integer('trusted', { mode: 'boolean' }).notNull().default(false),   // a client's proof that counted at once (the trust switch)
    recordedBy: text('recorded_by'),                                     // the member who recorded it (studio)
    submittedBy: text('submitted_by'),                                   // homeowner_profiles.id who said they paid (client)
    confirmedBy: text('confirmed_by'),
    confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
    receiptNumber: text('receipt_number'),                               // RCT-2026-001 — given when it is confirmed
    receiptFileId: text('receipt_file_id'),                              // its entry in Files › Payments
    rejectedBy: text('rejected_by'),                                     // Not received: who said so, when and why (the client reads why)
    rejectedAt: integer('rejected_at', { mode: 'timestamp' }),
    rejectReason: text('reject_reason'),
    reversedBy: text('reversed_by'),                                     // F-18: an Owner's or an Admin's, with a reason
    reversedAt: integer('reversed_at', { mode: 'timestamp' }),
    reverseReason: text('reverse_reason'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    shareToken: text('share_token'),   // (gaps build B, item 6) the receipt's no-login link `/receipt/<token>`, given with its number
    /* (pending modules S07 — D-14, as recommended) a payment made FROM a client's credit (an overpayment's credit note used on this invoice):
       its credit note; method `credit`. Not money that moved today — the money came with the overpayment. */
    creditNoteId: text('credit_note_id'),
  },
  (t) => [index('project_payments_project_idx').on(t.projectId, t.createdAt), index('project_payments_invoice_idx').on(t.invoiceId), uniqueIndex('project_payments_receipt_uq').on(t.receiptNumber), uniqueIndex('project_payments_token_uq').on(t.shareToken),
    index('project_payments_credit_idx').on(t.creditNoteId)],
)
export type ProjectPayment = typeof projectPayments.$inferSelect

/* (fix-G, G-03 · G-17 · G-33) A studio member's look at a client's portal ("See it as …", Company › Client portal's phone frame). Each preview
   rides in its own address — `/my/<slug>~<id>/…` — with its own cookie, so two previews in two tabs stay the two people they were opened for,
   and building one writes no client record (no homeowner profile, no lead link): the visitor is made from the lead (or the household row) as
   it stands. One live preview per member, client, person and kind is reused while it lasts, so the set-up page's frame writes no row per view. */
export const portalPreviews = sqliteTable(
  'portal_previews',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    personId: text('person_id'),                                      // homeowner_household_links.id — See it as someone from the household
    memberId: text('member_id').notNull(),                            // who is looking
    frame: integer('frame', { mode: 'boolean' }).notNull().default(false),   // the set-up page's phone frame: no studio strip, the paused notice while paused
    money: integer('money', { mode: 'boolean' }).notNull().default(true),    // whether the member sees the project's money (F-17) — off hides Money as a switched-off section
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp' }),
  },
  (t) => [index('portal_previews_lead_idx').on(t.leadId), index('portal_previews_member_idx').on(t.memberId)],
)
export type PortalPreview = typeof portalPreviews.$inferSelect

/* ── Gaps build, package C — the schedule and tasks (the owner's "build everything", 2026-10-07; the report 26-… §3) ──────────────────────────
   (6) A milestone may wait on more than one other: `follows_id` stays the one it moves with first (and every reader of it keeps working);
   each further one is a link here with its own gap (calendar days after that one's last day, negative = overlap). A move carries through all
   of them: a milestone starts once every one it waits on is done with (the latest of their ends plus each gap). */
export const projectMilestoneLinks = sqliteTable(
  'project_milestone_links',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    milestoneId: text('milestone_id').notNull().references(() => projectMilestones.id, { onDelete: 'cascade' }),
    afterId: text('after_id').notNull().references(() => projectMilestones.id, { onDelete: 'cascade' }),
    gapDays: integer('gap_days').notNull().default(1),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('project_milestone_links_project_idx').on(t.projectId), uniqueIndex('project_milestone_links_pair_uq').on(t.milestoneId, t.afterId)],
)
export type ProjectMilestoneLink = typeof projectMilestoneLinks.$inferSelect

/* (5) An extension request (1.0's "Request extension", E-333's live half): a Designer or a Manager asks for a new last day with a reason; an
   Owner or an Admin approves it (the dates move, carrying what follows) or declines it with a note. The days are stored as the milestones'
   are (local midnight). One open ask per milestone. */
export const projectMilestoneExtensions = sqliteTable(
  'project_milestone_extensions',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    milestoneId: text('milestone_id').notNull().references(() => projectMilestones.id, { onDelete: 'cascade' }),
    fromEnd: integer('from_end', { mode: 'timestamp' }).notNull(),     // its last day when asked
    toEnd: integer('to_end', { mode: 'timestamp' }).notNull(),         // the last day asked for
    reason: text('reason').notNull(),
    status: text('status').notNull().default('pending'),               // pending | approved | declined | withdrawn
    requestedBy: text('requested_by'),
    requestedAt: integer('requested_at', { mode: 'timestamp_ms' }).notNull(),
    answeredBy: text('answered_by'),
    answeredAt: integer('answered_at', { mode: 'timestamp_ms' }),
    answerNote: text('answer_note'),
    updateId: text('update_id'),                                       // the draft progress update an approval wrote, when asked to
  },
  (t) => [index('project_milestone_extensions_project_idx').on(t.projectId, t.status)],
)
export type ProjectMilestoneExtension = typeof projectMilestoneExtensions.$inferSelect

/* (8) Schedule changes that wait for an Owner or an Admin before the client sees them (Settings › Projects › Schedule changes need approval):
   a Designer's or a Manager's Share changes stores the ask — the changes it named and its note — and an Owner's or an Admin's Share writes the
   share itself (`project_schedule_shares`) or sends it back. One open ask per project. */
export const projectShareRequests = sqliteTable(
  'project_share_requests',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    milestoneIds: text('milestone_ids', { mode: 'json' }).notNull(),  // the changes it asked to share, by milestone id
    note: text('note'),
    status: text('status').notNull().default('pending'),              // pending | shared | sent_back | withdrawn
    requestedBy: text('requested_by'),
    requestedAt: integer('requested_at', { mode: 'timestamp_ms' }).notNull(),
    answeredBy: text('answered_by'),
    answeredAt: integer('answered_at', { mode: 'timestamp_ms' }),
    answerNote: text('answer_note'),
    shareId: text('share_id'),                                        // the share it became
  },
  (t) => [index('project_share_requests_project_idx').on(t.projectId, t.status)],
)
export type ProjectShareRequest = typeof projectShareRequests.$inferSelect

/* (gaps build E, item 1) A file's picture when the file is not one — a PDF's first page, a video's first frame — drawn in the browser at upload
   (or by the repair for the demo's PDFs) and kept apart from the file's own bytes (`lead_file_images`), so a query of the files never carries it;
   the file's `thumb` is its address, /files/thumb/<id>. A copy keeps its own; it goes with its file. */
export const leadFileThumbs = sqliteTable('lead_file_thumbs', {
  fileId: text('file_id').primaryKey().references(() => leadFiles.id, { onDelete: 'cascade' }),
  data: text('data').notNull(),
})

/* (gaps build E, item 5 — the delivery layer) The outbox: every email and WhatsApp message a notification sent, one row per recipient and
   channel — who it went to, the words as sent, the event, when, and how it went. `lib/notifications/delivery.ts` is the one way in; the
   prototype's adapter records the message here (`provider` 'outbox'), a real provider (the developers') sends it and writes the same row. `key`
   keeps a message from going twice: `n:<notification>:<channel>` for a raised event, `d:<derived row>:<member>:<channel>` for a reminder derived
   from a date. */
export const notificationOutbox = sqliteTable(
  'notification_outbox',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    notificationId: text('notification_id'),                 // the bell row it went out with (null for a derived reminder)
    event: text('event').notNull(),                          // an EventKey (lib/notifications/model.ts)
    channel: text('channel').notNull(),                      // email | whatsapp
    memberId: text('member_id'),                             // the studio member it is to (messages to the client come later)
    toName: text('to_name').notNull(),
    toAddress: text('to_address'),                           // the email address or the mobile number; null = none on file
    subject: text('subject'),
    body: text('body').notNull(),
    href: text('href'),
    leadId: text('lead_id'),
    status: text('status').notNull(),                        // sent | failed | no_address | held (simplify round 2: a client email an Undo can still take back)
    /** (simplify round 2) a held message goes once this passes (the Undo's window); null = it went when it was written */
    sendAfter: integer('send_after', { mode: 'timestamp' }),
    error: text('error'),
    provider: text('provider').notNull(),                    // 'outbox' = the prototype's adapter (nothing leaves the machine)
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),   // sent at
    /* (parity map, UC-083) a failed message is tried again: how many tries so far, and when the next one is due (null = no retry) */
    attempts: integer('attempts').notNull().default(0),
    nextTryAt: integer('next_try_at', { mode: 'timestamp' }),
    /* (pending modules S34 — card api:message-delivery-providers) the provider's own id for the message (a WhatsApp wamid, an email's id) — its
       receipts find the row by it (app/api/webhooks/whatsapp) — and what the receipts said: delivered to the phone or the inbox, read
       (WhatsApp's blue ticks). Null on the prototype: the outbox stand-in sends nothing, so nothing reports back. */
    providerRef: text('provider_ref'),
    deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
    readAt: integer('read_at', { mode: 'timestamp' }),
  },
  (t) => [uniqueIndex('notification_outbox_key_uq').on(t.key), index('notification_outbox_created_idx').on(t.createdAt), index('notification_outbox_provider_ref_idx').on(t.providerRef)],
)
export type OutboxMessage = typeof notificationOutbox.$inferSelect

/* ── (gaps build F1 — money out: the costs; the owner's "build everything", 2026-10-07, M-08; calls F1-Q1…Q16 in
   design-source/context/parity/projects-gaps-build/f1-read.md) ─────────────────────────────────────────────────────────────────────────
   Vendors, purchase orders and their lines, supplier bills, expenses, payments out, and the documents they keep. One set of numbers reads them
   (`costsOf`, lib/finance/costs.ts); F2 computes profit, vendor spend and the books from the same rows. Every amount is in cents, GST included
   where a column says total; days are local midnights; a row with no project is the studio's overhead. */

/** (F1-Q4) The studio's vendors — sub-contractors and suppliers. A duplicate merged into another keeps its row (`merged_into`, inactive), so its
    history still names it; the bank details are the Owners' and Admins' (lib/finance/rules.ts `seesBank`). */
export const vendors = sqliteTable(
  'vendors',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    trade: text('trade'),                                    // one of the studio's trades (Settings › Quotes), else free words
    contactName: text('contact_name'),
    phone: text('phone'),                                    // eight digits — the WhatsApp a PO goes to
    email: text('email'),
    uen: text('uen'),
    chargesGst: integer('charges_gst', { mode: 'boolean' }).notNull().default(false),   // a GST-registered vendor: its POs add GST (1.0 G-388 always did)
    bankName: text('bank_name'),
    accountName: text('account_name'),
    accountNo: text('account_no'),
    payNow: text('pay_now'),                                 // a UEN or a mobile number
    notes: text('notes'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    deactivatedAt: integer('deactivated_at', { mode: 'timestamp' }),
    mergedInto: text('merged_into'),                         // the vendor it was merged into (F1-Q4)
    mergedAt: integer('merged_at', { mode: 'timestamp' }),
    mergedBy: text('merged_by'),
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedBy: text('updated_by'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    /* (pending modules S24) The Marketplace brand this vendor is (marketplace_brands) — Add to my vendors writes it; the brand reads
       "In your vendors" and the vendor's panel opens the brand's page. */
    marketplaceBrandId: text('marketplace_brand_id'),
    /* (S45B · H-UHD-2, his "build everything and complete it" 2026-10-17 — 1.0's migration 497) A vendor who works on site: the studio
       schedules them onto its projects (project_contractors). `trades_json` = the studio's trades they do (Settings › Quotes & pricing ›
       Trades — one list, never a second vocabulary), several allowed; `crew_capacity` = how many sites they run at once; `code` = the
       studio's own short name for them. `trade` stays the first of them, for every picker that reads one. */
    isContractor: integer('is_contractor', { mode: 'boolean' }).notNull().default(false),
    tradesJson: text('trades_json'),
    crewCapacity: integer('crew_capacity').notNull().default(1),
    code: text('code'),
  },
  (t) => [index('vendors_name_idx').on(t.name)],
)
export type Vendor = typeof vendors.$inferSelect

/** (S45B · H-UHD-2 — 1.0's migration 498, `project_contractor_assignments`) A contractor on a project for a trade: on one of its milestones
    (the window is the milestone's dates, read when shown — a move of the schedule moves it) or on its own dates. Stored status `planned ·
    on_site · done`; a milestone marked done reads its crew done. "Leader checked" = `checked_by` · `checked_at`. A remove is soft (Undo). */
export const projectContractors = sqliteTable(
  'project_contractors',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    vendorId: text('vendor_id').notNull().references(() => vendors.id),
    trade: text('trade').notNull(),
    milestoneId: text('milestone_id'),
    startDate: integer('start_date', { mode: 'timestamp' }),   // its own first day (local midnight, as a milestone's) — only when no milestone
    endDate: integer('end_date', { mode: 'timestamp' }),       // its own last day, inclusive
    status: text('status').notNull().default('planned'),      // planned | on_site | done
    note: text('note'),
    checkedBy: text('checked_by'),
    checkedAt: integer('checked_at', { mode: 'timestamp_ms' }),
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedBy: text('updated_by'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    removedBy: text('removed_by'),
    removedAt: integer('removed_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('project_contractors_project_idx').on(t.projectId), index('project_contractors_vendor_idx').on(t.vendorId)],
)
export type ProjectContractor = typeof projectContractors.$inferSelect

/** (F1-Q5…Q9) A purchase order on a project to a vendor. Stored status `draft · sent · closed · cancelled`; its stamps say the rest — submitted
    (waiting for approval), sent back, the vendor's answer, paid in part (payments_out) — `poState` (lib/finance/model.ts) reads the one word. */
export const purchaseOrders = sqliteTable(
  'purchase_orders',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    vendorId: text('vendor_id').notNull().references(() => vendors.id),
    number: text('number').notNull(),                        // PO-2026-004 — given when it is made (F1-Q5)
    status: text('status').notNull().default('draft'),       // draft | sent | closed | cancelled
    title: text('title'),                                    // what it is for, in a few words ("Kitchen and wardrobe carpentry")
    subtotalMinor: integer('subtotal_minor').notNull().default(0),   // Σ lines, before GST
    gstMinor: integer('gst_minor').notNull().default(0),
    totalMinor: integer('total_minor').notNull().default(0),
    chargesGst: integer('charges_gst', { mode: 'boolean' }).notNull().default(false),
    gstRate: real('gst_rate').notNull().default(0),
    advanceKind: text('advance_kind').notNull().default('none'),     // none | pct | fixed
    advanceValue: real('advance_value').notNull().default(0),        // the % or the amount in cents
    advanceMinor: integer('advance_minor').notNull().default(0),     // what the advance comes to
    terms: text('terms').notNull().default('net30'),                 // cod | net15 | net30 | net60 | custom
    termsText: text('terms_text'),                                   // custom terms, in the studio's words
    expectedOn: integer('expected_on', { mode: 'timestamp' }),       // expected delivery (a day)
    deliveryAddress: text('delivery_address'),
    vendorNote: text('vendor_note'),                                 // printed on the PO for the vendor
    issuingEntity: text('issuing_entity'),                           // the entity it is raised under (the signed quote's)
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedBy: text('updated_by'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    submittedBy: text('submitted_by'),                               // waiting for approval
    submittedAt: integer('submitted_at', { mode: 'timestamp' }),
    reviewNote: text('review_note'),                                 // sent back: why
    reviewedBy: text('reviewed_by'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    approvedBy: text('approved_by'),                                 // an Owner's or an Admin's approval (theirs approves itself)
    approvedAt: integer('approved_at', { mode: 'timestamp' }),
    sentBy: text('sent_by'),
    sentAt: integer('sent_at', { mode: 'timestamp' }),
    dueOn: integer('due_on', { mode: 'timestamp' }),                 // the payment due day, worked out from the terms at the send
    vendorToken: text('vendor_token'),                               // the no-login link `/po/<token>` (F1-Q9)
    vendorViewedAt: integer('vendor_viewed_at', { mode: 'timestamp' }),
    vendorAnswer: text('vendor_answer'),                             // accepted | changes | declined
    vendorAnswerNote: text('vendor_answer_note'),
    vendorAnsweredAt: integer('vendor_answered_at', { mode: 'timestamp' }),
    answerVia: text('answer_via'),                                   // link | phone | whatsapp | email | in_person (marked by the studio)
    answerMarkedBy: text('answer_marked_by'),
    closedBy: text('closed_by'),
    closedAt: integer('closed_at', { mode: 'timestamp' }),
    closeNote: text('close_note'),                                   // closed short: why what is left is not owed (null = paid in full)
    cancelledBy: text('cancelled_by'),
    cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
    cancelReason: text('cancel_reason'),
    deletedBy: text('deleted_by'),                                   // a Draft removed (Undo brings it back)
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    /* (parity map 2026-10-10) MO-011 where the vendor sends its bill ("Invoice to"); MO-094 delivered (the late-delivery row ends);
       MO-038 a PO made elsewhere, recorded with its file and its own reference */
    billTo: text('bill_to'),
    deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
    deliveredBy: text('delivered_by'),
    external: integer('external', { mode: 'boolean' }).notNull().default(false),
    externalRef: text('external_ref'),
    externalFileId: text('external_file_id'),
  },
  (t) => [index('purchase_orders_project_idx').on(t.projectId), index('purchase_orders_vendor_idx').on(t.vendorId), uniqueIndex('purchase_orders_number_uq').on(t.number), uniqueIndex('purchase_orders_token_uq').on(t.vendorToken)],
)
export type PurchaseOrder = typeof purchaseOrders.$inferSelect

/** (F1-Q7) A PO's lines, priced before GST; `quote_item_id` = the signed quote's line it came from (its cost and its client price). */
export const purchaseOrderLines = sqliteTable(
  'purchase_order_lines',
  {
    id: text('id').primaryKey(),
    poId: text('po_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    description: text('description').notNull(),
    category: text('category'),                              // the trade
    qty: real('qty').notNull().default(1),
    unit: text('unit'),
    unitMinor: integer('unit_minor').notNull().default(0),
    amountMinor: integer('amount_minor').notNull().default(0),       // round(qty × unit)
    quoteItemId: text('quote_item_id'),
    milestoneId: text('milestone_id'),
  },
  (t) => [index('purchase_order_lines_po_idx').on(t.poId)],
)
export type PurchaseOrderLine = typeof purchaseOrderLines.$inferSelect

/** (F1-Q10) A supplier's bill, on a project (or the studio's overhead), against a PO of that vendor or on its own. Status is worked out from its
    payments and its due day (`billState`). */
export const supplierBills = sqliteTable(
  'supplier_bills',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),   // null = studio overhead
    vendorId: text('vendor_id').notNull().references(() => vendors.id),
    poId: text('po_id').references(() => purchaseOrders.id),
    reference: text('reference').notNull(),                  // the vendor's own invoice number
    issuedOn: integer('issued_on', { mode: 'timestamp' }).notNull(),
    dueOn: integer('due_on', { mode: 'timestamp' }),
    subtotalMinor: integer('subtotal_minor').notNull().default(0),
    gstMinor: integer('gst_minor').notNull().default(0),
    totalMinor: integer('total_minor').notNull().default(0),
    linesJson: text('lines_json'),                           // [{ id, description, qty, unitMinor }] — optional, as read or typed
    note: text('note'),
    readFrom: text('read_from'),                             // the file it was read from
    readFields: text('read_fields'),                         // JSON: the fields the reader filled and nobody changed
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedBy: text('updated_by'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    deletedBy: text('deleted_by'),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    /* (S44R — UAT row 361, call C8, as recommended; reverses F1-Q10 "bills: no approval") Why this bill waits for an Owner's or an Admin's OK
       before it is paid — 'limit' (on no PO, over the PO approval limit) · 'differs' (its PO's bills come to more than the PO by over the
       studio's tolerance); null = it never waited. Set when it is recorded or changed; `approved_*` = the OK. */
    approvalWhy: text('approval_why'),
    approvedBy: text('approved_by'),
    approvedAt: integer('approved_at', { mode: 'timestamp' }),
  },
  (t) => [index('supplier_bills_project_idx').on(t.projectId), index('supplier_bills_vendor_idx').on(t.vendorId), index('supplier_bills_po_idx').on(t.poId)],
)
export type SupplierBill = typeof supplierBills.$inferSelect

/** (F1-Q11) An expense — a project's cost or the studio's overhead — paid by the studio, or by a member who claims it back. */
export const expenses = sqliteTable(
  'expenses',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),   // null = studio overhead
    vendorId: text('vendor_id').references(() => vendors.id),
    category: text('category').notNull(),
    description: text('description').notNull(),
    amountMinor: integer('amount_minor').notNull(),          // what was paid, GST included
    gstMinor: integer('gst_minor').notNull().default(0),
    spentOn: integer('spent_on', { mode: 'timestamp' }).notNull(),
    paidBy: text('paid_by').notNull().default('studio'),     // studio | member (a claim)
    claimantId: text('claimant_id'),                          // the member who paid and claims it back
    status: text('status').notNull().default('pending'),     // pending | approved | sent_back
    reviewNote: text('review_note'),
    reviewedBy: text('reviewed_by'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    note: text('note'),
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedBy: text('updated_by'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
    deletedBy: text('deleted_by'),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    /* (parity map, MO-058) the issuing entity it is recorded under; null = the project's (or the studio's first) */
    issuingEntity: text('issuing_entity'),
    /* (pending modules S06 — 1.0's `is_recurring`, made to work) An expense that repeats — rent, software, a retainer. The series' rule lives on
       its first expense: `repeat_every` (week · month · quarter · year; null = once, or stopped), `repeat_next` the next day to log (local
       midnight), `repeat_stopped_*` when and by whom it was stopped (null by = the system — the project was handed over). Each one logged by the
       rule names its first expense in `repeat_of`; (repeat_of, spent_on) is unique, so a day is never logged twice. */
    repeatEvery: text('repeat_every'),
    repeatNext: integer('repeat_next', { mode: 'timestamp' }),
    repeatOf: text('repeat_of'),
    repeatStoppedAt: integer('repeat_stopped_at', { mode: 'timestamp' }),
    repeatStoppedBy: text('repeat_stopped_by'),
  },
  (t) => [index('expenses_project_idx').on(t.projectId), index('expenses_claimant_idx').on(t.claimantId), uniqueIndex('expenses_repeat_day_idx').on(t.repeatOf, t.spentOn), index('expenses_repeat_next_idx').on(t.repeatNext)],
)
export type Expense = typeof expenses.$inferSelect

/** (F1-Q12) Money the studio paid out: to a vendor against a PO and / or a bill, or to a member against their claim. A reversed one stays on
    the record and counts for nothing. */
export const paymentsOut = sqliteTable(
  'payments_out',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),                            // po | bill | claim
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),   // null = overhead
    vendorId: text('vendor_id').references(() => vendors.id),
    memberId: text('member_id'),                             // a claim's member
    poId: text('po_id').references(() => purchaseOrders.id),
    billId: text('bill_id').references(() => supplierBills.id),
    expenseId: text('expense_id').references(() => expenses.id),
    amountMinor: integer('amount_minor').notNull(),
    advance: integer('advance', { mode: 'boolean' }).notNull().default(false),   // the PO's advance
    paidOn: integer('paid_on', { mode: 'timestamp' }).notNull(),
    method: text('method').notNull(),                        // bank_transfer | paynow | cheque | cash
    reference: text('reference'),
    note: text('note'),
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    reversedBy: text('reversed_by'),
    reversedAt: integer('reversed_at', { mode: 'timestamp' }),
    reverseReason: text('reverse_reason'),
  },
  (t) => [index('payments_out_project_idx').on(t.projectId), index('payments_out_po_idx').on(t.poId), index('payments_out_bill_idx').on(t.billId), index('payments_out_expense_idx').on(t.expenseId)],
)
export type PaymentOut = typeof paymentsOut.$inferSelect

/** (F1-Q14) A cost record's own files — a bill's PDF, an expense's receipts, a payment out's transfer screenshot — kept with the record (E's
    data-URL seam, served through `sendStored` at /finance/doc/<id> to whoever may see the record), never in the project's Files. */
export const costDocuments = sqliteTable(
  'cost_documents',
  {
    id: text('id').primaryKey(),
    recordKind: text('record_kind').notNull(),               // bill | expense | payout
    recordId: text('record_id').notNull(),
    name: text('name').notNull(),
    mime: text('mime').notNull(),
    sizeBytes: integer('size_bytes').notNull().default(0),
    data: text('data').notNull(),                            // the bytes, a data URL
    thumb: text('thumb'),                                    // a PDF's first page, a data URL picture
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('cost_documents_record_idx').on(t.recordKind, t.recordId)],
)
export type CostDocument = typeof costDocuments.$inferSelect

/* ── (gaps build G — Q-19's "later", the owner's "build everything" of 2026-10-07; calls G-Q1…G-Q18 in
   design-source/context/parity/projects-gaps-build/g-read.md) Floor-plan mark-up with the client. A project keeps many plans, one of them the
   main plan (what the client opens on); each plan is a file of the project's lead in Files › Floor plans (its original, bytes kept by
   lib/leads/file-store.ts) and the picture marked up, kept beside it (`floor_plan_pictures`, never in a query of the plans). Marks are shapes
   with points 0–1 on that picture; each carries a thread. The client's confirmations are append-only. ── */
export const projectFloorPlans = sqliteTable(
  'project_floor_plans',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    leadId: text('lead_id').notNull(),                                  // the project's lead — Who sees leads, the file's lead
    name: text('name').notNull(),
    fileId: text('file_id'),                                            // the original (lead_files.id) in Files › Floor plans
    width: integer('width').notNull(),                                  // the marked picture's own pixels
    height: integer('height').notNull(),
    isMain: integer('is_main', { mode: 'boolean' }).notNull().default(false),   // the main plan — what the client opens on (1.0's Primary)
    scaleMmPerPx: real('scale_mm_per_px'),                              // millimetres per picture pixel; null = no scale yet
    scaleSetBy: text('scale_set_by'),
    scaleSetAt: integer('scale_set_at', { mode: 'timestamp_ms' }),
    addedByKind: text('added_by_kind').notNull().default('studio'),     // studio | client
    addedBy: text('added_by'),                                          // members.id, or homeowner_profiles.id for the client
    addedByName: text('added_by_name'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    putAwayAt: integer('put_away_at', { mode: 'timestamp_ms' }),        // put away (1.0's Archive): hidden from both sides, its marks kept
    putAwayBy: text('put_away_by'),
  },
  (t) => [index('project_floor_plans_project_idx').on(t.projectId, t.createdAt)],
)
export type ProjectFloorPlan = typeof projectFloorPlans.$inferSelect

/** The picture a plan is marked up on — a JPEG at a 2400px long edge (a PDF's first page, a big photo shrunk), drawn in the browser. */
export const floorPlanPictures = sqliteTable('floor_plan_pictures', {
  planId: text('plan_id').primaryKey().references(() => projectFloorPlans.id, { onDelete: 'cascade' }),
  data: text('data').notNull(),
})

export const floorPlanMarks = sqliteTable(
  'floor_plan_marks',
  {
    id: text('id').primaryKey(),
    planId: text('plan_id').notNull().references(() => projectFloorPlans.id, { onDelete: 'cascade' }),
    projectId: text('project_id').notNull(),
    tool: text('tool').notNull(),                                       // lib/projects/floor-plan-model.ts TOOLS (1.0's keys)
    shape: text('shape', { mode: 'json' }).notNull(),                   // MarkShape: points 0–1, colour, weight, dashed, text, symbol, pattern, photos, takenOn
    layer: text('layer').notNull().default('general'),                  // LAYERS; studio_only never reaches a client
    authorKind: text('author_kind').notNull(),                          // studio | client
    authorId: text('author_id'),                                        // members.id, or homeowner_profiles.id
    authorName: text('author_name').notNull(),
    status: text('status').notNull().default('open'),                   // open | resolved
    resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
    resolvedBy: text('resolved_by'),                                    // the name, as it was
    taskId: text('task_id'),                                            // lead_tasks.id made from it
    variationId: text('variation_id'),                                  // quotes.id (kind variation) raised from it
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),         // soft — Undo puts it back with its thread
    deletedBy: text('deleted_by'),
  },
  (t) => [index('floor_plan_marks_plan_idx').on(t.planId, t.createdAt), index('floor_plan_marks_project_idx').on(t.projectId)],
)
export type FloorPlanMark = typeof floorPlanMarks.$inferSelect

export const floorPlanComments = sqliteTable(
  'floor_plan_comments',
  {
    id: text('id').primaryKey(),
    markId: text('mark_id').notNull().references(() => floorPlanMarks.id, { onDelete: 'cascade' }),
    body: text('body').notNull().default(''),
    photos: text('photos', { mode: 'json' }),                          // lead_files ids (Files › Floor plans), up to 5
    authorKind: text('author_kind').notNull(),                          // studio | client
    authorId: text('author_id'),
    authorName: text('author_name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('floor_plan_comments_mark_idx').on(t.markId, t.createdAt)],
)
export type FloorPlanComment = typeof floorPlanComments.$inferSelect

/** The client's "Confirm this layout" — append-only (1.0 F-233): who, their phone as it was, when, their note; the newest row is the decision.
    `marksAt` = the plan's newest mark change at that moment, so a later change reads "Changed since {client} confirmed it". */
export const floorPlanConfirmations = sqliteTable(
  'floor_plan_confirmations',
  {
    id: text('id').primaryKey(),
    planId: text('plan_id').notNull().references(() => projectFloorPlans.id, { onDelete: 'cascade' }),
    projectId: text('project_id').notNull(),
    homeownerId: text('homeowner_id'),
    name: text('name').notNull(),
    phone: text('phone'),
    note: text('note'),
    method: text('method').notNull().default('portal'),                 // portal — confirmed in the client's portal (phone + one-time code)
    marksAt: integer('marks_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('floor_plan_confirmations_project_idx').on(t.projectId, t.createdAt)],
)
export type FloorPlanConfirmation = typeof floorPlanConfirmations.$inferSelect

/** When each person on the client's side last opened the floor plan (their portal link — the client's own or a household link): the bell's
    floor-plan rows before it read as read. Written by the portal's page on arrival, never in a studio's preview. */
export const floorPlanSeen = sqliteTable('floor_plan_seen', {
  linkId: text('link_id').primaryKey(),
  seenAt: integer('seen_at', { mode: 'timestamp_ms' }).notNull(),
})

/* ── (gaps build F2 — money out: the books, f2-read.md F2-Q4…Q13) ────────────────────────────────────────────────────────────────────
   Commission is WORKED OUT, never stored per payment (`commissionsOf`, lib/finance/commission.ts): the rules (kept as versions — a change ends
   the old one and starts a new one from its day, so earlier payments keep the rate they earned), a project's shares between its team, the
   members' asks and the payouts are the records. A credit note is a client document against one sent invoice. Xero is simulated: what was
   pushed, per record (`xero_links`), and every push (`xero_sync_log`); the connection and the mappings live in settings `xero`. */

/** (F2-Q4) A commission rule — the studio's (no member, no project), a member's, a project's, a member's on a project. A version: `ended_at` set
    = no longer in force (its payments keep it); the version in force on a payment's day is the one that counts. */
export const commissionRules = sqliteTable(
  'commission_rules',
  {
    id: text('id').primaryKey(),
    memberId: text('member_id'),                             // null = everyone
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),   // null = every project
    basis: text('basis').notNull(),                          // none | payments | profit | fixed
    rateBp: integer('rate_bp').notNull().default(0),         // a % in basis points (300 = 3%) for payments / profit
    fixedMinor: integer('fixed_minor').notNull().default(0), // a fixed amount per project
    fromDay: integer('from_day', { mode: 'timestamp' }).notNull(),   // in force from this day (local midnight)
    endedAt: integer('ended_at', { mode: 'timestamp' }),     // no longer in force from this moment (a newer version, or removed)
    endedBy: text('ended_by'),
    requestId: text('request_id'),                           // the member's ask it answered (F2-Q7)
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    /* (parity map, FB-043) which payment stages pay commission, with an optional rate each — JSON [{ ref, rateBp? }]; null = every payment */
    stagesJson: text('stages_json'),
  },
  (t) => [index('commission_rules_scope_idx').on(t.projectId, t.memberId)],
)
export type CommissionRule = typeof commissionRules.$inferSelect

/** (F2-Q4) A project's commission shares between its team, set by an Owner or an Admin (no row = equal shares). They always add to 10,000 bp. */
export const commissionShares = sqliteTable(
  'commission_shares',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    memberId: text('member_id').notNull(),
    shareBp: integer('share_bp').notNull(),
    updatedBy: text('updated_by'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [uniqueIndex('commission_shares_uq').on(t.projectId, t.memberId)],
)
export type CommissionShare = typeof commissionShares.$inferSelect

/** (F2-Q7) A member's ask for a different rate on a project they work on: open → approved (a rule from that day) · declined · withdrawn. */
export const commissionRequests = sqliteTable(
  'commission_requests',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    memberId: text('member_id').notNull(),
    basis: text('basis').notNull(),                          // payments | profit | fixed
    rateBp: integer('rate_bp').notNull().default(0),
    fixedMinor: integer('fixed_minor').notNull().default(0),
    reason: text('reason').notNull(),
    status: text('status').notNull().default('open'),       // open | approved | declined | withdrawn
    answeredBy: text('answered_by'),
    answeredAt: integer('answered_at', { mode: 'timestamp' }),
    answerNote: text('answer_note'),
    approvedRateBp: integer('approved_rate_bp'),             // what was approved, when the approver changed it
    approvedFixedMinor: integer('approved_fixed_minor'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('commission_requests_member_idx').on(t.memberId, t.status)],
)
export type CommissionRequest = typeof commissionRequests.$inferSelect

/** (F2-Q6) Commission paid to a member for a project. A reversed one stays on the record and counts for nothing. */
export const commissionPayouts = sqliteTable(
  'commission_payouts',
  {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    amountMinor: integer('amount_minor').notNull(),
    paidOn: integer('paid_on', { mode: 'timestamp' }).notNull(),
    method: text('method').notNull(),                        // bank_transfer | paynow | cheque | cash
    reference: text('reference'),
    note: text('note'),
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    reversedBy: text('reversed_by'),
    reversedAt: integer('reversed_at', { mode: 'timestamp' }),
    reverseReason: text('reverse_reason'),
  },
  (t) => [index('commission_payouts_member_idx').on(t.memberId), index('commission_payouts_project_idx').on(t.projectId)],
)
export type CommissionPayout = typeof commissionPayouts.$inferSelect

/** (F2-Q9) A credit note against one sent invoice: its reason, its amount (GST included, split out at the invoice's rate), numbered when
    issued; void with a reason later (it stays on the record). Paid beyond what the invoice is left owing → the refund, recorded on it. */
export const creditNotes = sqliteTable(
  'credit_notes',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    invoiceId: text('invoice_id').notNull().references(() => projectInvoices.id, { onDelete: 'cascade' }),
    number: text('number').notNull(),                        // CN-2026-001
    reason: text('reason').notNull(),
    amountMinor: integer('amount_minor').notNull(),          // GST included
    gstMinor: integer('gst_minor').notNull().default(0),
    status: text('status').notNull().default('issued'),     // issued | void
    issuedBy: text('issued_by'),
    issuedAt: integer('issued_at', { mode: 'timestamp' }).notNull(),
    voidReason: text('void_reason'),
    voidedBy: text('voided_by'),
    voidedAt: integer('voided_at', { mode: 'timestamp' }),
    refundMinor: integer('refund_minor'),                    // the refund recorded against it
    refundedOn: integer('refunded_on', { mode: 'timestamp' }),
    refundMethod: text('refund_method'),
    refundReference: text('refund_reference'),
    refundedBy: text('refunded_by'),
    fileId: text('file_id'),                                 // its entry in Files › Payments (lead_files.id)
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    /* (pending modules S07 — D-14, as recommended: "an overpayment can become a credit note now that credit notes exist") `credit` lowers its
       invoice; `overpayment` holds what a client paid beyond what `invoice_id` owed (`payment_id` — the payment it came with): no GST, it lowers
       nothing, and it is used on a later invoice (`project_payments.credit_note_id`) or refunded (the refund columns) */
    kind: text('kind').notNull().default('credit'),          // credit | overpayment
    paymentId: text('payment_id'),
  },
  (t) => [index('credit_notes_project_idx').on(t.projectId), index('credit_notes_invoice_idx').on(t.invoiceId), uniqueIndex('credit_notes_number_uq').on(t.number), index('credit_notes_payment_idx').on(t.paymentId)],
)
export type CreditNote = typeof creditNotes.$inferSelect
export type NewCreditNote = typeof creditNotes.$inferInsert   // (pending modules S07) the one writer's input (lib/finance/credit-hold.ts)

/** (F2-Q13) What Xero holds of a record (simulated): pushed once, again when it changed (`hash`); a failed push keeps its reason for Retry. */
export const xeroLinks = sqliteTable(
  'xero_links',
  {
    id: text('id').primaryKey(),
    recordKind: text('record_kind').notNull(),               // client | vendor | invoice | credit_note | payment | bill | expense | payout
    recordId: text('record_id').notNull(),
    organisation: text('organisation').notNull(),            // the Xero organisation (an issuing entity's)
    remoteId: text('remote_id'),                             // what Xero calls it ("INV-0042", a contact id)
    hash: text('hash'),                                      // what was pushed — a change pushes again
    status: text('status').notNull(),                        // synced | failed
    error: text('error'),
    attempts: integer('attempts').notNull().default(0),
    pushedAt: integer('pushed_at', { mode: 'timestamp' }),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [uniqueIndex('xero_links_record_uq').on(t.recordKind, t.recordId)],
)
export type XeroLink = typeof xeroLinks.$inferSelect

/** (F2-Q13) Every push (simulated): created · updated · failed, with its words — the Accounting page's sync log. */
export const xeroSyncLog = sqliteTable(
  'xero_sync_log',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    recordKind: text('record_kind').notNull(),
    recordId: text('record_id').notNull(),
    label: text('label').notNull(),
    amountMinor: integer('amount_minor'),
    outcome: text('outcome').notNull(),                      // created | updated | failed
    message: text('message'),
    by: text('by'),
    at: integer('at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('xero_sync_log_at_idx').on(t.at)],
)
export type XeroSyncLog = typeof xeroSyncLog.$inferSelect

/* ── gaps build H — tickets, chat and the About page (design-source/context/parity/projects-gaps-build/h-read.md, calls H-Q1…H-Q27) ─────
   A TICKET is a problem the client reports on their portal (an "issue" to them, H-Q1) or the studio raises for them: a number (T-{YYYY}-{nnn}),
   a category from Settings › Projects › Ticket categories (kept by name, as a lead keeps its source), a subject and words, up to five photos
   (files of the project in Files › Tickets, E's storage), a state (open · in_progress · resolved · closed, H-Q3), a priority (normal · urgent,
   H-Q4) and whoever looks after it. Its thread is `ticket_replies`: a reply to the client, an internal note the client never reads, or a
   state line. `last_client_at` / `last_studio_at` say whose turn it is. */
export const projectTickets = sqliteTable(
  'project_tickets',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    leadId: text('lead_id').notNull(),
    number: text('number').notNull(),                                  // T-2026-001
    category: text('category').notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull().default(''),
    photos: text('photos', { mode: 'json' }),                          // lead_files ids, up to 5
    status: text('status').notNull().default('open'),                  // open | in_progress | resolved | closed
    priority: text('priority').notNull().default('normal'),            // normal | urgent
    assigneeId: text('assignee_id'),                                    // members.id
    raisedKind: text('raised_kind').notNull(),                          // client | studio
    raisedById: text('raised_by_id'),                                   // homeowner_profiles.id or members.id
    raisedByName: text('raised_by_name').notNull(),
    escalatedAt: integer('escalated_at', { mode: 'timestamp_ms' }),
    escalatedBy: text('escalated_by'),
    escalateNote: text('escalate_note'),
    resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),      // cleared on reopen (1.0's rule)
    resolvedBy: text('resolved_by'),
    closedAt: integer('closed_at', { mode: 'timestamp_ms' }),
    closedBy: text('closed_by'),                                        // the client's name, as it was
    lastClientAt: integer('last_client_at', { mode: 'timestamp_ms' }),
    lastStudioAt: integer('last_studio_at', { mode: 'timestamp_ms' }),
    /** (simplify round 2 — S-22) the task and the variation order made from this ticket (Make a task · Raise a variation order) */
    taskId: text('task_id'),
    variationId: text('variation_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('project_tickets_number').on(t.number), index('project_tickets_project_idx').on(t.projectId, t.createdAt)],
)
export type ProjectTicket = typeof projectTickets.$inferSelect

export const ticketReplies = sqliteTable(
  'ticket_replies',
  {
    id: text('id').primaryKey(),
    ticketId: text('ticket_id').notNull().references(() => projectTickets.id, { onDelete: 'cascade' }),
    authorKind: text('author_kind').notNull(),                          // client | studio
    authorId: text('author_id'),
    authorName: text('author_name').notNull(),
    body: text('body').notNull().default(''),
    photos: text('photos', { mode: 'json' }),                          // lead_files ids, up to 5
    internal: integer('internal', { mode: 'boolean' }).notNull().default(false),   // an internal note — never on the portal (H-Q6)
    event: text('event'),                                               // null = words; resolved | reopened | closed | escalated | assigned | priority
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('ticket_replies_ticket_idx').on(t.ticketId, t.createdAt)],
)
export type TicketReply = typeof ticketReplies.$inferSelect

/** (H-Q11…H-Q14) A project's one conversation between the client's side (the client and their household) and the team. A removed message
    keeps its row (`deleted_at`) so Undo puts it back; the other side reads "Message removed". Photos are files in Files › Messages. */
export const projectMessages = sqliteTable(
  'project_messages',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    leadId: text('lead_id').notNull(),
    authorKind: text('author_kind').notNull(),                          // client | studio
    authorId: text('author_id'),
    authorName: text('author_name').notNull(),
    body: text('body').notNull().default(''),
    photos: text('photos', { mode: 'json' }),                          // lead_files ids, up to 3
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    /** (simplify round 2 — S-22) the task and the variation order made from this message */
    taskId: text('task_id'),
    variationId: text('variation_id'),
    /* (parity map 2026-10-10, UC-064 · UC-066 · UC-067) the conversation it belongs to — the client's (with the household) or the team's;
       files beyond photos (documents, a voice note) as [{ fileId, kind, name, size, durationMs? }]; a shared place or contact as { kind, … } */
    channel: text('channel').notNull().default('client'),
    attachments: text('attachments', { mode: 'json' }),
    meta: text('meta', { mode: 'json' }),
  },
  (t) => [index('project_messages_project_idx').on(t.projectId, t.createdAt)],
)
export type ProjectMessage = typeof projectMessages.$inferSelect

/** (H-Q13) How far each reader has read a project's conversation — a member, or someone on the client's side (their homeowner profile). */
export const chatReads = sqliteTable(
  'chat_reads',
  {
    readerKind: text('reader_kind').notNull(),                          // member | client
    readerId: text('reader_id').notNull(),
    projectId: text('project_id').notNull(),
    readAt: integer('read_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('chat_reads_uq').on(t.readerKind, t.readerId, t.projectId)],
)
export type ChatRead = typeof chatReads.$inferSelect

/** (H-Q21 · H-Q22) The studio's pictures for its About page — the story's photos (`kind` about, in order, the first is the cover) and each
    member's portrait (`kind` member). The picture rides as a data URL, as the brand kit's do; served by its own route. */
export const studioPictures = sqliteTable(
  'studio_pictures',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),                                       // about | member
    memberId: text('member_id'),
    data: text('data').notNull(),
    caption: text('caption'),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),         // soft — Undo puts it back
  },
  (t) => [index('studio_pictures_kind_idx').on(t.kind, t.position)],
)
export type StudioPicture = typeof studioPictures.$inferSelect

/**
 * (gaps build I, I-Q10) A project's Singapore compliance checklist — one row per item the team has answered: Done or Not needed, who and when.
 * An item with no row is still to do. The items themselves are code (lib/compliance/sg-checklist.ts, 1.0's list), picked by the property kind.
 */
export const projectCompliance = sqliteTable(
  'project_compliance',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    itemId: text('item_id').notNull(),                       // the checklist item's id ("HDB_RENO_PERMIT")
    state: text('state').notNull(),                          // done | not_needed
    by: text('by'),                                          // the member who answered it
    at: integer('at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('project_compliance_item_uq').on(t.projectId, t.itemId)],
)
export type ProjectCompliance = typeof projectCompliance.$inferSelect

/* ── (gaps build J — the 3D Space Planner, J-Q1…J-Q20; read `design-source/context/parity/projects-gaps-build/j-read.md`) ─────────────
   A layout is one row holding the plan as JSON (`lib/planner/model.ts` — rooms, walls, doors, windows, finishes, pieces, the camera, in whole
   centimetres). A project's layout carries its project AND its lead at creation (1.0's F-265: never saved with the project); a personal one
   carries neither. Timestamps in ms. */
export const spaceLayouts = sqliteTable(
  'space_layouts',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    templateKey: text('template_key'),                                  // the flat it started from (lib/planner/templates.ts), null = blank
    projectId: text('project_id'),                                      // null = a personal layout
    leadId: text('lead_id'),                                            // the project's lead — Who sees leads reads it
    plan: text('plan').notNull(),                                       // the plan JSON (PlanDoc)
    rev: integer('rev').notNull().default(0),                           // bumped on each save — a stale save is refused, never merged blind
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),         // soft — Deleted Layouts restores it
    deletedBy: text('deleted_by'),
    /* (parity map, TD-076) the studio's own starting point — listed under New ▾ › My templates, never on a project */
    isTemplate: integer('is_template', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('space_layouts_project_idx').on(t.projectId, t.updatedAt), index('space_layouts_lead_idx').on(t.leadId)],
)
export type SpaceLayout = typeof spaceLayouts.$inferSelect

/* ── (pending modules S28 — card studio:floorplan-isometric-ai, "Upload a floor-plan photo and get a furnished 3D picture") ──────────────
   A floor-plan photo, straightened and cleaned in the browser, that a 3D layout is traced on — where the project's Floor plan (G,
   `project_floor_plans`) can't hold it yet: a LEAD's (its original kept in the lead's Files › Floor plans, `file_id`) until the lead is won —
   then it becomes the project's floor plan with the same id (lib/projects/create.ts `carryLeadFloorPlans`) — or a personal layout's own (no
   client, no file: the picture is the record). A project's photo is a G plan from the start, never a row here. Its picture is served by
   `/planner/plan-picture/<id>` (either table), so a layout's underlay keeps its address across the two chapters. `scale_mm_per_px` is set only
   when the studio measured one length on it (a size from the floor area stays the layout's own). */
export const floorPlanPhotos = sqliteTable(
  'floor_plan_photos',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').references(() => leads.id, { onDelete: 'cascade' }),   // null = a personal layout's
    fileId: text('file_id'),                                            // the original in the lead's Files › Floor plans (no foreign key: a file deleted for good leaves the picture)
    name: text('name').notNull(),
    width: integer('width').notNull(),                                  // the straightened picture's own pixels
    height: integer('height').notNull(),
    scaleMmPerPx: real('scale_mm_per_px'),                              // measured on it (one length the studio knew); null = sized by the floor area
    picture: text('picture').notNull(),                                 // the straightened picture, a JPEG data URL (never in a list query)
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('floor_plan_photos_lead_idx').on(t.leadId)],
)
export type FloorPlanPhoto = typeof floorPlanPhotos.$inferSelect

/** (J-Q14…J-Q16) A layout shared with the client: a read-only link holding a SNAPSHOT of the plan as it was shared (the Schedule's rule —
    the client reads what was shared, never the studio's work in progress). One live share per layout; Stop sharing sets `revoked_at` (a
    share after that is a new row with a new token, so an old link stays dead). No expiry (1.0's 3D link never expired; M-06). */
export const spaceLayoutShares = sqliteTable(
  'space_layout_shares',
  {
    id: text('id').primaryKey(),
    layoutId: text('layout_id').notNull().references(() => spaceLayouts.id, { onDelete: 'cascade' }),
    leadId: text('lead_id'),                                            // the portal's homes find it by their lead
    token: text('token').notNull(),
    snapshot: text('snapshot').notNull(),                               // the PlanDoc as shared (no underlay — studio only)
    name: text('name').notNull(),                                       // the layout's name as shared
    message: text('message'),
    sharedRev: integer('shared_rev').notNull().default(0),              // the layout's rev the snapshot holds — "changes not shared" past it
    sharedBy: text('shared_by'),
    sharedAt: integer('shared_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),   // the snapshot's last Share changes
    sentVia: text('sent_via'),                                          // whatsapp | copy
    firstViewedAt: integer('first_viewed_at', { mode: 'timestamp_ms' }),
    lastViewedAt: integer('last_viewed_at', { mode: 'timestamp_ms' }),
    viewCount: integer('view_count').notNull().default(0),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
    revokedBy: text('revoked_by'),
  },
  (t) => [uniqueIndex('space_layout_shares_token_idx').on(t.token), index('space_layout_shares_layout_idx').on(t.layoutId), index('space_layout_shares_lead_idx').on(t.leadId)],
)
export type SpaceLayoutShare = typeof spaceLayoutShares.$inferSelect

/* ── (parity map 2026-10-10 — his "build everything that's in 1.0 to 2.0 without losing anything") ───────────────────────────────── */

/** (UC-064) A conversation with a lead before Won — the lead invited to the portal writes from its lead page; the studio answers from the
    lead. Once Won, the project's Messages shows these first (the conversation belongs to the home). */
export const leadMessages = sqliteTable(
  'lead_messages',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull(),
    authorKind: text('author_kind').notNull(),                          // client | studio
    authorId: text('author_id'),
    authorName: text('author_name').notNull(),
    body: text('body').notNull().default(''),
    attachments: text('attachments', { mode: 'json' }),                 // as project_messages.attachments
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('lead_messages_lead_idx').on(t.leadId, t.createdAt)],
)
export type LeadMessage = typeof leadMessages.$inferSelect

/** (UC-070) A member's own place for a conversation: pinned to the top, muted (no bell for it). `conversation` = `project:<id>` ·
    `team:<projectId>` · `lead:<leadId>`. */
export const conversationPrefs = sqliteTable(
  'conversation_prefs',
  {
    memberId: text('member_id').notNull(),
    conversation: text('conversation').notNull(),
    pinnedAt: integer('pinned_at', { mode: 'timestamp_ms' }),
    mutedAt: integer('muted_at', { mode: 'timestamp_ms' }),
  },
  (t) => [uniqueIndex('conversation_prefs_uq').on(t.memberId, t.conversation)],
)
export type ConversationPref = typeof conversationPrefs.$inferSelect

/* ── (the Dashboard redesigned, 2026-10-26 — his mark Q-05: "Not today" on a Needs you row) A row a member set aside for today: it leaves their
   Needs you and comes back on `until_day` (a day number, lib/projects/schedule-model.ts `dayOf`) — or as soon as the row itself changes
   (`row_key` names the row and what it is about, lib/dashboard/needs.ts). One member's, never the studio's: the work still waits on it. ── */
export const dashboardSnoozes = sqliteTable(
  'dashboard_snoozes',
  {
    memberId: text('member_id').notNull(),
    rowKey: text('row_key').notNull(),
    untilDay: integer('until_day').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('dashboard_snoozes_uq').on(t.memberId, t.rowKey)],
)
export type DashboardSnooze = typeof dashboardSnoozes.$inferSelect

/* ── (pending modules S26 — his "build all of them" 2026-10-11; cards studio:team-chats · api:messages-free-chats) 1.0's free chats
   (`conversations` · `conversation_participants` · `messages` · `conversation_files`, src/app/api/chats/records/**) in 2.0's shape: a
   conversation among the studio's members only — never a client's (a client writes on their page: `project_messages` · `lead_messages`, and
   no client page reads these tables). `kind`: `direct` (two members, one pair — `pair_key`), `group` (a name and hand-picked members),
   `studio` (the one room every member reads — id 'studio'), `lead` (a lead's own Team conversation before Won — one per lead; the project's
   Team conversation reads its lines first once Won, as the client's reads `lead_messages`). ── */
export const conversations = sqliteTable(
  'conversations',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),                                       // direct | group | studio | lead
    name: text('name'),                                                 // a group's own name
    leadId: text('lead_id'),                                            // kind 'lead'
    pairKey: text('pair_key'),                                          // kind 'direct': the two member ids, sorted, joined by '|'
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    lastMessageAt: integer('last_message_at', { mode: 'timestamp_ms' }),
  },
  (t) => [uniqueIndex('conversations_lead_uq').on(t.leadId), uniqueIndex('conversations_pair_uq').on(t.pairKey)],
)
export type ConversationRow = typeof conversations.$inferSelect

/** (S26) Who is in a direct or a group conversation — added by hand (`added_by`), taken out or left (`removed_at` · `removed_by`, kept so
    Undo can put them back and the line can say who). The studio's room and a lead's Team conversation keep no rows: the room is every member
    of the studio, a lead's is its team. */
export const conversationParticipants = sqliteTable(
  'conversation_participants',
  {
    conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    memberId: text('member_id').notNull(),
    addedBy: text('added_by'),
    addedAt: integer('added_at', { mode: 'timestamp_ms' }).notNull(),
    removedAt: integer('removed_at', { mode: 'timestamp_ms' }),
    removedBy: text('removed_by'),
  },
  (t) => [uniqueIndex('conversation_participants_uq').on(t.conversationId, t.memberId), index('conversation_participants_member_idx').on(t.memberId)],
)
export type ConversationParticipant = typeof conversationParticipants.$inferSelect

/** (S26) A line in one of those conversations — a member's words (with photos, files, a voice note, a place or a card in `attachments`, as
    `lead_messages` keeps them), or the group's own line (`event`: created · added · removed · left · renamed, its names in `meta`). */
export const conversationMessages = sqliteTable(
  'conversation_messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    authorId: text('author_id'),
    authorName: text('author_name').notNull(),
    body: text('body').notNull().default(''),
    attachments: text('attachments', { mode: 'json' }),
    event: text('event'),
    meta: text('meta', { mode: 'json' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('conversation_messages_conv_idx').on(t.conversationId, t.createdAt)],
)
export type ConversationMessage = typeof conversationMessages.$inferSelect

/** (S26) A photo or a file sent in a conversation that belongs to no lead (direct · group · the studio's room) — its bytes kept on the row (a
    data URL, as the studio's pictures and fonts keep theirs: the lead files' store answers to a lead), served to the conversation's people
    alone (`/chat/file/<id>`). A lead's Team conversation files its files in the lead's Files › Messages, as a project's does.
    PRODUCTION: object storage, behind lib/projects/thread-photos.ts `keepChatPhotos` · `takeChatFilePiece` and the route. */
export const conversationFiles = sqliteTable(
  'conversation_files',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    mime: text('mime'),
    sizeBytes: integer('size_bytes'),
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    data: text('data').notNull(),
  },
  (t) => [index('conversation_files_conv_idx').on(t.conversationId)],
)
export type ConversationFile = typeof conversationFiles.$inferSelect

/** (TD-087) A layout's saved versions — each share keeps one, and Save a version keeps one by hand; Bring back restores it as a new save. */
export const spaceLayoutVersions = sqliteTable(
  'space_layout_versions',
  {
    id: text('id').primaryKey(),
    layoutId: text('layout_id').notNull().references(() => spaceLayouts.id, { onDelete: 'cascade' }),
    rev: integer('rev').notNull(),
    name: text('name').notNull(),
    plan: text('plan').notNull(),
    note: text('note'),
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('space_layout_versions_layout_idx').on(t.layoutId, t.createdAt)],
)
export type SpaceLayoutVersion = typeof spaceLayoutVersions.$inferSelect

/** (pending modules S10 — card studio:maison-assistant, "a conversation that carries"; 1.0's mAIson kept its chat in one browser tab's
    sessionStorage) What a member asked Maison AI's Ask box — a record, so the sheet's Recent is there tomorrow and on another device. Only the
    question is kept: a press on it asks again and reads the records as they are then (an answer is never stored, so it can never go stale).
    `title` = what the answer was called when asked; `cleared_at` = the member's Clear (Undo puts the rows back); 20 per member are kept. */
export const maisonQuestions = sqliteTable(
  'maison_questions',
  {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    question: text('question').notNull(),
    title: text('title'),
    path: text('path'),
    projectId: text('project_id'),
    milestoneId: text('milestone_id'),
    askedAt: integer('asked_at', { mode: 'timestamp_ms' }).notNull(),
    clearedAt: integer('cleared_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('maison_questions_member_idx').on(t.memberId, t.askedAt)],
)
export type MaisonQuestion = typeof maisonQuestions.$inferSelect

/**
 * (pending modules S11 — card held:quote-templates; 1.0's `studio_assets` type `font`, 2 MB a file) The studio's own fonts: one row per
 * uploaded file — a face of a family (its weight, italic or not). Company › Templates › Brand kit › Fonts uploads and removes them (Owners and
 * Admins, with the licence ticked); every font list a template offers names their families, and the documents print them through
 * /files/font/<id>. Removed softly: Undo puts it back; a template still naming a removed family prints the stack's next face.
 */
export const studioFonts = sqliteTable(
  'studio_fonts',
  {
    id: text('id').primaryKey(),
    family: text('family').notNull(),
    weight: integer('weight').notNull().default(400),        // 400 · 600 · 700
    italic: integer('italic', { mode: 'boolean' }).notNull().default(false),
    format: text('format').notNull(),                        // woff2 · woff · truetype · opentype
    fileName: text('file_name').notNull(),
    size: integer('size').notNull(),
    data: text('data').notNull(),                            // the file, a data URL
    licensedBy: text('licensed_by'),                         // who ticked "the studio may use it in the documents it sends"
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    deletedBy: text('deleted_by'),
  },
  (t) => [index('studio_fonts_family_idx').on(t.family)],
)
export type StudioFont = typeof studioFonts.$inferSelect

/*
 * (pending modules S23 — Meetings and the Meeting Co-Pilot; his "build all of them" 2026-10-11, REG-552's hold lifted for this card) A meeting
 * with a lead's client — planned, live, held or cancelled — on the lead (or its project: `project_id`, a site meeting). 1.0 kept a live session
 * in `copilot_sessions` and its brief in `meeting_briefs` (one per session); its unmerged Google Calendar branch planned them in `meetings`.
 * Here one record holds the plan, the co-pilot's session and the brief. A meeting held on a lead IS its Met log: the Met step's log entry carries
 * `meetingId` (lib/leads/stage-data.ts), never a second record of where and when. Every time column is ms.
 */
export const meetings = sqliteTable(
  'meetings',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    projectId: text('project_id'),                                   // the lead's project, for a site meeting
    aim: text('aim').notNull().default('first_consultation'),        // 1.0's meeting_objective_type (lib/meetings/model.ts AIMS)
    aimNote: text('aim_note'),                                       // 1.0's meeting_objective — what the studio wants out of it
    whereKind: text('where_kind').notNull().default('In person'),    // the Met log's Where: In person · Video call · Showroom
    place: text('place'),                                            // the address, or the video call's link
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }).notNull(),
    endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
    status: text('status').notNull().default('planned'),             // planned · live · held · cancelled
    memberIds: text('member_ids').notNull().default('[]'),           // who from the studio is in it
    /* the client was told the co-pilot is listening (1.0's consent_acknowledged_*), or — for an uploaded recording — everyone agreed to it */
    consentKind: text('consent_kind'),                               // told · recording
    consentAt: integer('consent_at', { mode: 'timestamp_ms' }),
    consentBy: text('consent_by'),
    disclosureText: text('disclosure_text'),
    /* the co-pilot's session: AI credits are taken a 10-minute block at a time (1.0's copilot_block, the credits audit's Q-45) */
    startedAt: integer('started_at', { mode: 'timestamp_ms' }),
    startedBy: text('started_by'),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
    blocks: integer('blocks').notNull().default(0),                  // the blocks taken
    freeBlocks: integer('free_blocks').notNull().default(0),         // of them, the Free plan's one 30-minute meeting
    pausedAt: integer('paused_at', { mode: 'timestamp_ms' }),        // the co-pilot stopped reading (a block not taken); notes go on
    source: text('source'),                                          // live · notes · recording — where the brief's words came from
    notes: text('notes').notNull().default(''),                      // what was said: typed, pasted or a recording's transcript
    recordingFileId: text('recording_file_id'),                      // an uploaded recording, kept in the lead's Files
    fileIds: text('file_ids').notNull().default('[]'),               // the meeting's documents (photos, a floor plan) — the lead's files
    stateJson: text('state_json').notNull().default('{}'),           // the co-pilot's working state (lib/meetings/model.ts MeetingState)
    briefJson: text('brief_json'),                                   // the brief (MeetingBrief)
    briefAt: integer('brief_at', { mode: 'timestamp_ms' }),
    briefSavedAt: integer('brief_saved_at', { mode: 'timestamp_ms' }),   // its facts written to the lead (1.0's saved_to_lead)
    briefSavedBy: text('brief_saved_by'),
    quoteId: text('quote_id'),                                       // the draft quote made from its estimate
    /* the client's link (/meeting/<token>): the invitation before, the notes after — only once the studio shares them */
    clientToken: text('client_token'),
    clientTokenAt: integer('client_token_at', { mode: 'timestamp_ms' }),
    invitedAt: integer('invited_at', { mode: 'timestamp_ms' }),
    invitedVia: text('invited_via'),                                 // whatsapp · email · copy
    clientAnswer: text('client_answer'),                             // yes · no — the client's answer to the invitation
    clientAnswerAt: integer('client_answer_at', { mode: 'timestamp_ms' }),
    clientAnswerNote: text('client_answer_note'),
    clientViewedAt: integer('client_viewed_at', { mode: 'timestamp_ms' }),
    sharedAt: integer('shared_at', { mode: 'timestamp_ms' }),        // the notes shared on the link
    shareStoppedAt: integer('share_stopped_at', { mode: 'timestamp_ms' }),
    shareJson: text('share_json'),                                   // what the shared notes show
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    deletedBy: text('deleted_by'),
  },
  (t) => [index('meetings_lead_idx').on(t.leadId), index('meetings_starts_idx').on(t.startsAt), uniqueIndex('meetings_client_token_uq').on(t.clientToken)],
)
export type Meeting = typeof meetings.$inferSelect

/** (pending modules S23) Each objection a client raised in a meeting — 1.0's `copilot_objection_log`, which never kept the studio's answer;
    here `recommended_response` is the studio's saved answer at the time (Settings › Meetings). Rewritten whole whenever the brief is made. */
export const copilotObjectionLog = sqliteTable(
  'copilot_objection_log',
  {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
    leadId: text('lead_id').notNull(),
    memberId: text('member_id'),
    objectionType: text('objection_type').notNull(),                 // lib/meetings/objections.ts OBJECTION_KINDS
    objectionDescription: text('objection_description').notNull(),   // what was said
    competitorName: text('competitor_name'),
    recommendedResponse: text('recommended_response'),
    detectedAt: integer('detected_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('copilot_objection_log_meeting_idx').on(t.meetingId)],
)

/** (pending modules S23) The studio's answers to the ten kinds of objection — 1.0's `studio_objection_responses`, copy-on-write over the
    platform's defaults (lib/meetings/objections.ts): a row is the studio's own answer, or its edit of a default (`default_key`). 1.0 saved
    them and never showed them; a meeting now shows the answer when the objection comes up. */
export const studioObjectionResponses = sqliteTable('studio_objection_responses', {
  id: text('id').primaryKey(),
  defaultKey: text('default_key'),                                   // the platform default this row edits; null = the studio's own
  objectionType: text('objection_type').notNull(),
  objectionTitle: text('objection_title').notNull(),                 // what the homeowner says
  objectionDescription: text('objection_description'),               // when it comes up
  recommendedResponse: text('recommended_response').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  updatedBy: text('updated_by'),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
})
export type StudioObjectionResponse = typeof studioObjectionResponses.$inferSelect

/** (pending modules S23) The rival studios the studio knows — 1.0's `studio_competitor_list` (nothing read it): a meeting spots them by name, and
    the Lost dialog offers them for "Lost to". */
export const studioCompetitorList = sqliteTable('studio_competitor_list', {
  id: text('id').primaryKey(),
  competitorName: text('competitor_name').notNull(),
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
})
export type StudioCompetitor = typeof studioCompetitorList.$inferSelect

/** (pending modules S23) The studio's own meeting checklist items — 1.0's `studio_checklist_items` (they never reached a meeting): listed after
    the platform's items for the meeting's aim (`objective_types`, empty = every aim), ticked when their words are heard. */
export const studioChecklistItems = sqliteTable('studio_checklist_items', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  category: text('category').notNull().default('important'),         // critical · important · nice_to_have
  objectiveTypes: text('objective_types').notNull().default('[]'),
  detectionKeywords: text('detection_keywords').notNull().default('[]'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
})
export type StudioChecklistItem = typeof studioChecklistItems.$inferSelect

/* ── (pending modules S24) The Marketplace — Qanvast's partner brands and their deals (1.0's /marketplace, read from Qanvast's brand API
   through /api/qanvast/*, routes the 1.0 repo no longer has). The studio's copy of the feed: rows written by the feed's mapper
   (lib/marketplace/feed.ts — the seam a real Qanvast feed plugs into; the demo's catalogue goes through the same mapper), read by the pages.
   A brand or a deal the feed withdraws keeps its row with `removed_at`, so a vendor or a Price book item that came from it still points
   somewhere. The studio's own records are the asks (marketplace_deal_asks) and the two links: `vendors.marketplace_brand_id`,
   `price_book_items.marketplace_product_id` — one home for vendors (Finance › Vendors) and for products (the Price book). ── */

/** The feed's categories, in its order (1.0's eight: Furniture · Lighting · Flooring · Kitchen · Bathroom · Paint · Curtains & Blinds · Smart Home). */
export const marketplaceCategories = sqliteTable('marketplace_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  feedRef: text('feed_ref'),                                           // Qanvast's own id for it
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})
export type MarketplaceCategory = typeof marketplaceCategories.$inferSelect

/** A partner brand — 1.0's BrandModel. */
export const marketplaceBrands = sqliteTable('marketplace_brands', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  categories: text('categories').notNull().default('[]'),              // its categories' names, JSON
  tagline: text('tagline'),                                            // 1.0's `quote` — its own one line
  services: text('services'),                                          // 1.0's `editorNote` — what it does, the Services card
  logo: text('logo'),
  cover: text('cover'),
  gallery: text('gallery').notNull().default('[]'),                    // pictures after the cover, JSON
  whatsapp: text('whatsapp'),                                          // eight digits (1.0's `whatsappContact`)
  email: text('email'),
  websites: text('websites').notNull().default('[]'),                  // [{ title, url }], JSON
  instagram: text('instagram'),
  facebook: text('facebook'),
  youtube: text('youtube'),
  addresses: text('addresses').notNull().default('[]'),                // its business addresses (1.0's `locations`), JSON
  faqs: text('faqs').notNull().default('[]'),                          // [{ question, answer }], JSON
  featuredRank: integer('featured_rank'),                              // a featured brand's place (1.0's `featuredRank`); null = not featured
  popularity: integer('popularity').notNull().default(0),              // the feed's lead count — Most popular
  reviews: integer('reviews').notNull().default(0),                    // the feed's review count — Most reviews
  publishedAt: integer('published_at', { mode: 'timestamp_ms' }).notNull(),   // Most recent
  feedRef: text('feed_ref'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  removedAt: integer('removed_at', { mode: 'timestamp_ms' }),
})
export type MarketplaceBrand = typeof marketplaceBrands.$inferSelect

/** A brand's deal — 1.0's BrandPromoModel. */
export const marketplaceDeals = sqliteTable(
  'marketplace_deals',
  {
    id: text('id').primaryKey(),
    brandId: text('brand_id').notNull().references(() => marketplaceBrands.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    terms: text('terms'),
    redemption: text('redemption'),                                    // How to redeem
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
    endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
    ctaUrl: text('cta_url'),                                           // the brand's own page for it; Get deal opens it
    ctaText: text('cta_text'),
    picture: text('picture'),
    flash: integer('flash', { mode: 'boolean' }).notNull().default(false),   // 1.0's `isFlashDeal`
    position: integer('position').notNull().default(0),
    feedRef: text('feed_ref'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    removedAt: integer('removed_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('marketplace_deals_brand_idx').on(t.brandId)],
)
export type MarketplaceDeal = typeof marketplaceDeals.$inferSelect

/** A brand's product — 1.0's BrandProductModel (the API sent them; 1.0's page never showed them). Add to Price book copies one into My Items. */
export const marketplaceProducts = sqliteTable(
  'marketplace_products',
  {
    id: text('id').primaryKey(),
    brandId: text('brand_id').notNull().references(() => marketplaceBrands.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    priceMinor: integer('price_minor'),                                // the brand's listed price, read from the feed's words
    unit: text('unit'),                                                // one of the quote units (lib/quotes/items-model.ts UNITS)
    link: text('link'),                                                // 1.0's `externalUrl`
    picture: text('picture'),
    position: integer('position').notNull().default(0),
    feedRef: text('feed_ref'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    removedAt: integer('removed_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('marketplace_products_brand_idx').on(t.brandId)],
)
export type MarketplaceProduct = typeof marketplaceProducts.$inferSelect

/** The pictures at the top of the Marketplace (1.0's hero banners): each opens a brand, a deal or a page of its own. */
export const marketplaceBanners = sqliteTable('marketplace_banners', {
  id: text('id').primaryKey(),
  picture: text('picture').notNull(),
  title: text('title').notNull(),
  line: text('line'),
  href: text('href').notNull(),                                        // an address in the app (/marketplace/…), or the brand's own page
  position: integer('position').notNull().default(0),
  startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
  endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
  feedRef: text('feed_ref'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})
export type MarketplaceBanner = typeof marketplaceBanners.$inferSelect

/** The studio's own record of a Get deal press: who asked a brand for which deal, when, and how (its page, WhatsApp or email) — the deal
    says "Dane asked for it on …" so nobody asks twice. The brand's answer is the brand's (by WhatsApp or email). */
export const marketplaceDealAsks = sqliteTable(
  'marketplace_deal_asks',
  {
    id: text('id').primaryKey(),
    dealId: text('deal_id').notNull().references(() => marketplaceDeals.id, { onDelete: 'cascade' }),
    memberId: text('member_id').notNull(),
    how: text('how').notNull(),                                        // link · whatsapp · email
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('marketplace_deal_asks_deal_idx').on(t.dealId, t.createdAt)],
)
export type MarketplaceDealAsk = typeof marketplaceDealAsks.$inferSelect

/* ── (pending modules S25) Market Insights — the reading room of articles OpenMaison's editors publish (1.0's `market_insights`, written in
   Platform admin's CMS and read by Tools › Market Insights through /api/market-insights). The studio's copy of the editors' feed: rows written
   by the feed's one mapper (lib/market-insights/feed.ts — the seam a real feed plugs into; the demo's sample articles go through the same
   mapper, repair R142), read by the pages. Only what is published reaches the copy; an article the editors take down keeps its row with
   `removed_at`, and its address says so. Nothing in the studio writes here but the feed. ── */
export const marketInsights = sqliteTable(
  'market_insights',
  {
    id: text('id').primaryKey(),                                         // `mi-<the feed's id>`
    title: text('title').notNull(),
    excerpt: text('excerpt'),                                            // the card's and the article's first lines
    content: text('content').notNull().default(''),                      // the article as the editors wrote it (Markdown, with ```chart blocks), kept as sent
    category: text('category').notNull(),                                // 1.0's four: trends · reports · case-studies · industry-news
    cover: text('cover'),                                                // the cover picture's address
    tags: text('tags').notNull().default('[]'),                          // JSON
    author: text('author').notNull(),
    readMinutes: integer('read_minutes').notNull().default(5),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
    sample: integer('sample', { mode: 'boolean' }).notNull().default(false),   // written for the demo — the pages say so; a real feed never sets it
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }).notNull(),
    feedRef: text('feed_ref'),                                           // the editors' own id for it
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    removedAt: integer('removed_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('market_insights_published_idx').on(t.removedAt, t.publishedAt)],
)
export type MarketInsight = typeof marketInsights.$inferSelect

/* ── (pending modules S27 — Hangouts; his "build all of them" 2026-10-11; survey keys public:hangouts · api:designer-portfolio-profiles)
   Qanvast Hangouts are Qanvast's in-person events where homeowners meet interior designers at tables in one venue. 1.0 kept eight tables
   (supabase/migrations/20240301000001_hangout_tables.sql + scripts/migrations 047 · 076 · 077 · 078 · 082 · 295); 2.0 keeps the studio's side
   of them under 1.0's names where the job is the same:
     hangout_events · hangout_shifts   — Qanvast's events and their shifts, the studio's copy of Qanvast's feed (lib/hangouts/feed.ts is the one
                                          mapper; the demo's sample events go through it, repair R144). Nothing in the studio writes them.
     hangout_participations            — 1.0's hangout_studio_participations + hangout_studio_preferences (one per event): applied · confirmed ·
                                          declined · withdrawn, the tables Qanvast gives, the studio's preferred client and weights, the plan's
                                          save and send, and the studio's own page for the event (`page_token`).
     hangout_designers                 — 1.0's hangout_id_participations: who goes, on which shifts, their share of the meetings, a break.
     hangout_registrations             — 1.0's hangout_homeowners, the studio's own: a homeowner who booked a chat on the studio's page (or at
                                          the table) — always a lead (source Hangout), never a homeowner network of 2.0's own.
     hangout_meetings                  — 1.0's hangout_meetings: the table, the designer, the status, the outcome; once held it is written up
                                          as the lead's meeting (`meeting_id`, lib/meetings) — one home for its notes, brief and recording.
   1.0's hangout_vouchers (Qanvast's rewards for homeowners, paused in 1.0's code) are not kept — a studio's page can't promise them. ── */
export const hangoutEvents = sqliteTable(
  'hangout_events',
  {
    id: text('id').primaryKey(),
    feedRef: text('feed_ref'),                                           // Qanvast's id for the event (1.0's hangout_events.id) — 1.0's old links land by it
    name: text('name').notNull(),
    venue: text('venue').notNull(),
    address: text('address'),
    startsOn: integer('starts_on', { mode: 'timestamp_ms' }).notNull(),  // local midnight of the first day
    dayCount: integer('day_count').notNull().default(1),
    startTime: text('start_time').notNull().default('10:00'),            // HH:MM
    endTime: text('end_time').notNull().default('18:00'),
    pricePerTableMinor: integer('price_per_table_minor').notNull().default(750_000),
    tablesPerStudio: integer('tables_per_studio').notNull().default(2),
    totalTables: integer('total_tables').notNull().default(50),
    studiosTaking: integer('studios_taking').notNull().default(0),      // studios Qanvast has confirmed (its feed's count) — the places left
    promisedMeetings: integer('promised_meetings').notNull().default(45),
    customerProfile: text('customer_profile'),                           // 1.0's customer_profile_summary — who comes
    studioExpectations: text('studio_expectations'),
    description: text('description'),
    feedStatus: text('feed_status').notNull().default('upcoming'),       // upcoming · active · closed · cancelled — Qanvast's word
    sample: integer('sample', { mode: 'boolean' }).notNull().default(false),   // written for the demo — the page says so; a real feed never sets it
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('hangout_events_starts_idx').on(t.startsOn), uniqueIndex('hangout_events_feed_idx').on(t.feedRef)],
)
export type HangoutEvent = typeof hangoutEvents.$inferSelect

export const hangoutShifts = sqliteTable(
  'hangout_shifts',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull().references(() => hangoutEvents.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    dayAt: integer('day_at', { mode: 'timestamp_ms' }).notNull(),       // local midnight of its day
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => [index('hangout_shifts_event_idx').on(t.eventId, t.position)],
)
export type HangoutShift = typeof hangoutShifts.$inferSelect

export const hangoutParticipations = sqliteTable(
  'hangout_participations',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull().references(() => hangoutEvents.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('applied'),                // applied · confirmed · declined · withdrawn
    tables: text('tables').notNull().default('[]'),                     // the table numbers Qanvast gives the studio (JSON)
    appliedAt: integer('applied_at', { mode: 'timestamp_ms' }),
    appliedBy: text('applied_by'),
    confirmedAt: integer('confirmed_at', { mode: 'timestamp_ms' }),
    withdrawnAt: integer('withdrawn_at', { mode: 'timestamp_ms' }),
    preferencesJson: text('preferences_json'),                           // 1.0's hangout_studio_preferences.preferences (lib/hangouts/model.ts)
    planSavedAt: integer('plan_saved_at', { mode: 'timestamp_ms' }),
    planSentAt: integer('plan_sent_at', { mode: 'timestamp_ms' }),       // 1.0's is_draft = false — Qanvast reads the plan from here on
    planSentBy: text('plan_sent_by'),
    pageToken: text('page_token'),                                       // the studio's own page for the event: /hangout/<token>
    pageClosedAt: integer('page_closed_at', { mode: 'timestamp_ms' }),   // bookings stopped by the studio (the page says so)
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('hangout_participations_event_idx').on(t.eventId), uniqueIndex('hangout_participations_page_idx').on(t.pageToken)],
)
export type HangoutParticipation = typeof hangoutParticipations.$inferSelect

export const hangoutDesigners = sqliteTable(
  'hangout_designers',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull().references(() => hangoutEvents.id, { onDelete: 'cascade' }),
    memberId: text('member_id').notNull(),
    shiftIds: text('shift_ids').notNull().default('[]'),                 // JSON — the shifts they are at the tables
    sharePct: integer('share_pct'),                                      // 1.0's capacity_percent — null = an even share
    onBreakAt: integer('on_break_at', { mode: 'timestamp_ms' }),         // 1.0's status on-break — no new chat is given to them meanwhile
    inviteId: text('invite_id'),                                         // 1.0's invite_id — invited from this plan
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('hangout_designers_event_member_idx').on(t.eventId, t.memberId)],
)
export type HangoutDesigner = typeof hangoutDesigners.$inferSelect

export const hangoutRegistrations = sqliteTable(
  'hangout_registrations',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull().references(() => hangoutEvents.id, { onDelete: 'cascade' }),
    leadId: text('lead_id').notNull(),                                   // always a lead — a new one (source Hangout) or the lead the number already is
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    preferencesJson: text('preferences_json'),                           // 1.0's hangout_homeowners.preferences
    shiftId: text('shift_id'),                                           // when they said they'd come
    via: text('via').notNull().default('page'),                          // page (the studio's page) · desk (at the table)
    token: text('token').notNull(),                                      // their own page: /hangout/<page>/<token>
    createdBy: text('created_by'),                                       // the member, at the table
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    viewedAt: integer('viewed_at', { mode: 'timestamp_ms' }),            // their page's first open in a browser
    linkSentAt: integer('link_sent_at', { mode: 'timestamp_ms' }),       // their link went out (WhatsApp, the house outbox)
  },
  (t) => [uniqueIndex('hangout_registrations_token_idx').on(t.token), index('hangout_registrations_event_idx').on(t.eventId), index('hangout_registrations_lead_idx').on(t.leadId)],
)
export type HangoutRegistration = typeof hangoutRegistrations.$inferSelect

export const hangoutMeetings = sqliteTable(
  'hangout_meetings',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull().references(() => hangoutEvents.id, { onDelete: 'cascade' }),
    registrationId: text('registration_id').notNull(),
    leadId: text('lead_id').notNull(),
    memberId: text('member_id'),                                         // the designer — null until one takes it
    shiftId: text('shift_id'),
    tableNumber: integer('table_number'),
    status: text('status').notNull().default('scheduled'),              // scheduled · in-progress · completed · cancelled
    outcome: text('outcome'),                                            // converted · follow-up · dropped
    subStatus: text('sub_status'),
    scope: text('scope'),
    notes: text('notes'),
    matchScore: integer('match_score'),                                  // 1.0's 0–100 (lib/hangouts/model.ts computeMatchScore)
    startedAt: integer('started_at', { mode: 'timestamp_ms' }),
    startedBy: text('started_by'),                                       // a member's id, or 'client' (I'm at the table)
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
    endedBy: text('ended_by'),
    durationMin: integer('duration_min'),
    meetingId: text('meeting_id'),                                       // the lead's meeting it was written up as (lib/meetings)
    taskId: text('task_id'),                                             // the follow-up task its outcome made
    assignedBy: text('assigned_by'),
    assignedAt: integer('assigned_at', { mode: 'timestamp_ms' }),
    cancelledAt: integer('cancelled_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('hangout_meetings_event_idx').on(t.eventId, t.status), index('hangout_meetings_lead_idx').on(t.leadId), index('hangout_meetings_member_idx').on(t.memberId)],
)
export type HangoutMeeting = typeof hangoutMeetings.$inferSelect

/* ── (pending modules S27 — api:designer-portfolio-profiles: 1.0's id_profiles · id_portfolio_projects · id_portfolio_images, whose editor was
   never mounted, and the copilot's studio_portfolio_projects) A member's work, as clients see it: projects with their pictures, in the member's
   order — on the portal's Our team, a Hangout page and the meeting's Past projects. Pictures are kept as the studio picked them (a copy, shrunk
   in the browser, as `studio_pictures` keeps About photos) — a picture from a project's files stays even if the file goes. Soft removes, Undo. ── */
export const memberPortfolioProjects = sqliteTable(
  'member_portfolio_projects',
  {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    title: text('title').notNull(),
    place: text('place'),                                                // 1.0's property_name — "Punggol Northshore"
    propertyType: text('property_type'),                                // the house list (lib/leads/enums.ts)
    style: text('style'),
    description: text('description'),
    projectId: text('project_id'),                                       // the studio's project it shows, if any
    position: integer('position').notNull().default(0),
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('member_portfolio_projects_member_idx').on(t.memberId, t.position)],
)
export type MemberPortfolioProject = typeof memberPortfolioProjects.$inferSelect

export const memberPortfolioPictures = sqliteTable(
  'member_portfolio_pictures',
  {
    id: text('id').primaryKey(),
    portfolioId: text('portfolio_id').notNull(),
    data: text('data').notNull(),                                        // a data URL
    caption: text('caption'),
    position: integer('position').notNull().default(0),
    sourceFileId: text('source_file_id'),                                // the project's file it was copied from
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('member_portfolio_pictures_portfolio_idx').on(t.portfolioId, t.position)],
)
export type MemberPortfolioPicture = typeof memberPortfolioPictures.$inferSelect

/* ── (pending modules S34 — his "build all of them" 2026-10-11; card api:message-delivery-providers, "What happens to a client's WhatsApp
   reply (1.0 only logged it)") A client's WhatsApp reply, as the provider's webhook brought it (app/api/webhooks/whatsapp). 1.0 only wrote
   it to the server's log; 2.0 keeps every one here, once (`provider_ref`), and files the ones it can place in that client's conversation in
   Messages (`filed` → `message_id`): a reply to one of the studio's own messages (`reply_to`, the wamid it answers) or a number that is one
   live lead's client. The others stay here as they came (`unmatched`, a member's own number `from_member`, a picture or a voice note with no
   words `not_text` — fetching its media is the provider's call). The prototype's outbox sends nothing, so nothing is ever answered on it. */
export const inboundMessages = sqliteTable(
  'inbound_messages',
  {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),                                // whose reader read it ('whatsapp-cloud' = Meta's own envelope, 1.0's 360dialog)
    providerRef: text('provider_ref').notNull(),                         // the provider's id for it (a wamid) — the same message delivered twice is kept once
    channel: text('channel').notNull(),                                  // whatsapp
    fromAddress: text('from_address').notNull(),                         // +65 and the eight digits, as the outbox writes a number
    body: text('body'),                                                  // its words (a picture's caption); null when it has none
    kind: text('kind').notNull(),                                        // text | image | audio | video | document | …
    replyTo: text('reply_to'),                                           // the wamid of the studio's message it answers, when the client replied to one
    status: text('status').notNull(),                                    // filed | unmatched | from_member | not_text
    leadId: text('lead_id'),
    messageId: text('message_id'),                                       // the conversation line it became (project_messages · lead_messages)
    receivedAt: integer('received_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('inbound_messages_ref_uq').on(t.providerRef), index('inbound_messages_received_idx').on(t.receivedAt)],
)
export type InboundMessage = typeof inboundMessages.$inferSelect

/* ── (pending modules S35 — his "build all of them" 2026-10-11; cards public:marketing-website · onboarding:book-a-demo) OpenMaison's own
   records from its website — 1.0's three global tables, under 1.0's names and columns (scripts/migrations/085 · 094 · 248): a demo request
   (Book a demo), a message from the contact form, a newsletter address. The platform's, never a studio's: no studio reads them, and staff's
   list of them is Platform admin (excluded by him) — the records are kept for it. The team hears of a demo request and a contact message
   through the house outbox (lib/notifications/delivery.ts), recorded in Settings › Notifications › Sent messages. ─────────────────────── */
export const betaSignups = sqliteTable(
  'beta_signups',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    studioName: text('studio_name'),
    email: text('email').notNull(),                                     // as given, lower-cased
    phone: text('phone'),                                               // "+65 9123 4567" — 1.0 kept the code with the number
    sourcePage: text('source_page').notNull().default('landing'),       // the site's page the form was sent from
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('beta_signups_email_idx').on(t.email), index('beta_signups_created_idx').on(t.createdAt)],
)
export type BetaSignup = typeof betaSignups.$inferSelect

export const contactMessages = sqliteTable(
  'contact_messages',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    subject: text('subject'),
    message: text('message').notNull(),                                 // up to 5,000 characters (1.0's limit)
    sourcePage: text('source_page').notNull().default('contact'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('contact_messages_created_idx').on(t.createdAt)],
)
export type ContactMessage = typeof contactMessages.$inferSelect

export const newsletterSubscribers = sqliteTable(
  'newsletter_subscribers',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),                                     // one row per address (1.0's unique email) — signing up again is a no-op
    sourcePage: text('source_page').notNull().default('footer'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    unsubscribedAt: integer('unsubscribed_at', { mode: 'timestamp' }),
  },
  (t) => [uniqueIndex('newsletter_subscribers_email_uq').on(t.email)],
)
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect
/* ── (pending modules S37 — his "build all of them" 2026-10-11; cards onboarding:qanvast-listing-verification · studio:verify-listing) The
   studio's application to be listed on Qanvast, under 1.0's own table name (`studio_verifications` — 1.0 kept its status, its documents, the
   staff's note and when it was reviewed; its /verify form saved none of it). 2.0 keeps each application as it was sent: what the studio wrote
   (the description, what makes it different), what its records said that day (its name and UEN, the projects it had completed, which
   registrations were done, its About photos, its review link — `submitted_documents`, JSON) and its proof files (`studio_verification_files`,
   real bytes). Qanvast's answer arrives through its seam (lib/qanvast-listing/service.ts — POST /api/webhooks/qanvast-listing): `verified` =
   Listed, `rejected` with its note = Needs changes (1.0's own two answers). `kind` apply = the first application · update = changes to a listing
   · outside = a listing made before the studio used OpenMaison (no words on record — the demo's own, R145). `status` pending · verified ·
   rejected · withdrawn (the studio took it back) · closed (asked for changes, and the studio let it go). `answered_via` qanvast | demo (the
   prototype's labelled play of an answer while the stand-in answers) — never a pretend Qanvast. One studio per database. */
export const studioVerifications = sqliteTable(
  'studio_verifications',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),                                        // apply | update | outside
    status: text('status').notNull(),                                    // pending | verified | rejected | withdrawn | closed
    studioName: text('studio_name'),
    uen: text('uen'),
    description: text('description'),
    differentiator: text('differentiator'),
    projectsDelivered: integer('projects_delivered'),                    // the studio's completed projects that day — counted, never typed
    submittedDocuments: text('submitted_documents'),                     // JSON: registrations · photos · files · reviewLink · website · founded · awards
    providerRef: text('provider_ref'),                                   // Qanvast's own id for it, once a real service took it
    submittedBy: text('submitted_by'),
    submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }).notNull(),
    withdrawnAt: integer('withdrawn_at', { mode: 'timestamp_ms' }),
    withdrawnBy: text('withdrawn_by'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),         // when Qanvast answered (1.0's reviewed_at)
    adminNotes: text('admin_notes'),                                     // Qanvast's note with its answer (1.0's admin_notes)
    answeredVia: text('answered_via'),                                   // qanvast | demo
    closedAt: integer('closed_at', { mode: 'timestamp_ms' }),
    closedBy: text('closed_by'),
  },
  (t) => [index('studio_verifications_submitted_idx').on(t.submittedAt), index('studio_verifications_ref_idx').on(t.providerRef)],
)
export type StudioVerification = typeof studioVerifications.$inferSelect

/** (pending modules S37) The studio's proof for Qanvast — photos or PDFs of homes it finished (`project`) and what clients said (`testimonial`),
    kept the moment each is added (as the About photos are), removed softly with Undo; an application keeps the ids it sent, so a sent file stays
    readable after it is taken off the list. Its bytes ride as a data URL, as the studio's other pictures do (the storage seam's note). */
export const studioVerificationFiles = sqliteTable(
  'studio_verification_files',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),                                        // project | testimonial
    name: text('name').notNull(),
    mime: text('mime').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    data: text('data').notNull(),
    addedBy: text('added_by'),
    addedAt: integer('added_at', { mode: 'timestamp_ms' }).notNull(),
    removedAt: integer('removed_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('studio_verification_files_kind_idx').on(t.kind, t.addedAt)],
)
export type StudioVerificationFile = typeof studioVerificationFiles.$inferSelect
