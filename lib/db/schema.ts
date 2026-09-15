import { relations, sql } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

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
  role: text('role').notNull(),              // Owner | Designer
  color: text('color').notNull(),            // avatar tint hex, or 'photo'
  isYou: integer('is_you', { mode: 'boolean' }).notNull().default(false),
  // Quote editor › Signature (1240:34176, REG-421; owner 2026-09-11: "signature saved per member"): how the member signs —
  // `draw` keeps an SVG path in `signatureData` (viewBox 752×140), `type` prints `signatureName` in the signature face.
  signatureKind: text('signature_kind'),     // draw | type | null = not set up
  signatureName: text('signature_name'),
  signatureData: text('signature_data'),
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
    leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
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
  },
  (t) => [index('quotes_lead_idx').on(t.leadId)],
)

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
})
export type QuoteTextTemplate = typeof quoteTextTemplates.$inferSelect

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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})
export type PriceBookItem = typeof priceBookItems.$inferSelect

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
})
export type QuoteTemplate = typeof quoteTemplates.$inferSelect

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
  },
  (t) => [index('contracts_lead_idx').on(t.leadId)],
)

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
  },
  (t) => [index('template_tasks_template_idx').on(t.templateId)],
)

export type Tag = typeof tags.$inferSelect
export type TaskComment = typeof taskComments.$inferSelect
export type TaskTemplate = typeof taskTemplates.$inferSelect
export type TemplateTask = typeof templateTasks.$inferSelect
