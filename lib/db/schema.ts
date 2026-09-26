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
  isYou: integer('is_you', { mode: 'boolean' }).notNull().default(false),
  managerId: text('manager_id'),             // (REG-601) the Manager this Designer reports to — the manager's team
  email: text('email'),                      // (REG-560) the member's work email — `{prepared_by_email}` on quotes; seeded on the studio's domain by repair R36
  // Quote editor › Signature (1240:34176, REG-421; owner 2026-09-11: "signature saved per member"): how the member signs —
  // `draw` keeps an SVG path in `signatureData` (viewBox 752×140), `type` prints `signatureName` in the signature face.
  signatureKind: text('signature_kind'),     // draw | type | null = not set up
  signatureName: text('signature_name'),
  signatureData: text('signature_data'),
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
})

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

export type Member = typeof members.$inferSelect
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
  },
  (t) => [index('quotes_lead_idx').on(t.leadId)],
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
  },
  (t) => [index('quote_items_quote_idx').on(t.quoteId)],
)
export type QuoteItem = typeof quoteItems.$inferSelect

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
  },
  (t) => [index('contracts_lead_idx').on(t.leadId)],
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
})
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
})
export type ContractTemplate = typeof contractTemplates.$inferSelect

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
  },
  (t) => [index('lead_events_lead_idx').on(t.leadId)],
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
  },
  (t) => [uniqueIndex('render_share_links_token_idx').on(t.token), index('render_share_links_design_idx').on(t.designId)],
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
