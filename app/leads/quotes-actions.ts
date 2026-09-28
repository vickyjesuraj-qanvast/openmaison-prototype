'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, inArray, sql, isNull, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, leadTasks, leads, members, notifications, quoteComparisons, quoteFiles, quoteItemComments, quoteTemplates, quoteTextTemplates, quoteVersions, quotes, quotePayments, taskAssignees, type QuoteItem, type QuotePayment } from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { canDeleteQuote } from '@/lib/quotes/policy'
import { sessionMemberId, sessionMemberSql } from '@/lib/db/session'
import { displayDate } from '@/lib/format'
import { revalidatePath } from 'next/cache'
import { revalidateLead } from '@/lib/leads/queries'
import { presetRows, scheduleAnchors } from '@/lib/quotes/payments'
import { projectRef, validUntil, propertyFamily } from '@/lib/quotes/refs'
import { parseDefaults, parseDesign, type TemplateDefaults } from '@/lib/templates/model'
import { cleanGroups, viewForTemplate } from '@/lib/templates/picker'
import { presetByKey } from '@/lib/templates/presets'
import { quoteItems } from '@/lib/db/schema'
import { resolveTokens } from '@/lib/quotes/text'
import { fetchStudio, fetchNumbering, NUMBERING_KEY, fetchQuoteApproval, fetchQuoteRules, isApprover } from '@/lib/settings/queries'
import { changesPayments, defaultNextNumber, formatQuoteNumber, initialsOf, isDefaultNumbering, nextSequence } from '@/lib/settings/types'
import { settings } from '@/lib/db/schema'
import { COLUMN_KEYS, DEFAULT_COLUMNS, DEFAULT_DENSITY, type ColumnKey, type ColumnSettings } from '@/lib/quotes/items-model'
import { fetchPaymentSplits } from '@/lib/company/payment-templates'
import { notify } from '@/lib/notifications/emit'
import { isQuoteStatus, type QuoteStatus } from '@/lib/leads/quote-filters'
import { fetchLeadQuotes } from '@/lib/leads/quotes'
import { fetchLeadContracts } from '@/lib/leads/contracts'
import { createQuoteItem, createQuoteItems, type BulkLine } from '@/app/quotes/items-actions'

/* Lead Details › Quotes (910-36240). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

/** (REG-286) One shared eviction for every detail tab — the hand-listed paths here never named Activity, which prints every quote milestone. */
const touch = (leadId: string) => revalidateLead(leadId)
const ME = sessionMemberSql   // (REG-667) the signed-in member, resolved inside each write

/**
 * Next quote number: "OM-" + (highest existing + 1); the seed starts at OM-10001 (910:36324). (REG-561) A studio with its own
 * pattern (Settings › Quotes) gets prefix · initials · year-month · a running number instead — the sequence is the setting's
 * `next`, never below the highest number already given under that prefix; the numbers already on quotes stay as they are.
 */
async function nextNumber(creator?: { name: string } | null, at = new Date(), propertyType: string | null = null): Promise<string> {
  const n = await fetchNumbering()
  const all = (await db.select({ number: quotes.number }).from(quotes)).map((q) => q.number)   // (REG-645) Settings' example reads the same rule
  if (isDefaultNumbering(n)) return defaultNextNumber(all)
  // (REG-586) Commercial work — an office or a shop, by the lead's property type — runs on the second sequence when the studio keeps one.
  const commercial = n.commercial.on && propertyFamily(propertyType) === 'COMM'
  const prefix = commercial ? n.commercial.prefix : n.prefix
  const seq = nextSequence(all, prefix, commercial ? n.commercial.next : n.next)
  const value = JSON.stringify(commercial ? { ...n, commercial: { ...n.commercial, next: seq + 1 } } : { ...n, next: seq + 1 })
  await db.insert(settings).values({ key: NUMBERING_KEY, value, updatedAt: at }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: at } })
  return formatQuoteNumber(n, seq, { initials: creator ? initialsOf(creator.name) : undefined, date: at, commercial })
}

/**
 * Create Quote modal › a template tile or Blank Quote (REG-405 / REG-412): a Private Draft titled after the lead
 * (910:36324 shows the lead's name as the row title), total S$0, remembering the design template it started from —
 * and stamping that template's "used n ago". A template id that is not the studio's is refused.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export async function createQuote(leadId: string, templateId: string | null = null, opts: { id?: string } = {}): Promise<string> {
  const [lead] = await db.select({ name: leads.name, propertyType: leads.propertyType, propertyAddress: leads.propertyAddress, estimatedStartDate: leads.estimatedStartDate, icNumber: leads.icNumber, customerId: leads.customerId }).from(leads).where(eq(leads.id, leadId))
  if (!lead) throw new Error('lead not found')
  // (REG-489) The template's Defaults tab decides what the quote starts with; the quote pins the template's current version.
  let template: { id: string; version: number; defaults: TemplateDefaults; view: 'none' | 'category' | 'room' | 'section' } | null = null
  if (templateId) {
    const [t] = await db.select({ id: quoteTemplates.id, version: quoteTemplates.version, defaultsJson: quoteTemplates.defaultsJson, designJson: quoteTemplates.designJson, status: quoteTemplates.status, deletedAt: quoteTemplates.deletedAt }).from(quoteTemplates).where(eq(quoteTemplates.id, templateId))
    if (!t || t.deletedAt) throw new Error('template not found')
    if (t.status !== 'published') throw new Error('template not published')   // (REG-538) a draft reached by URL cannot start a quote
    template = { id: t.id, version: t.version, defaults: parseDefaults(t.defaultsJson), view: viewForTemplate(parseDesign(t.designJson, presetByKey('letter').design())) }
  }
  /* (REG-580) A Blank Quote prints through the studio's default template, so it starts with that template's settings too — the same
     split, validity, GST, signature, texts and working columns a quote from it would get, with an empty table (no starter sections). */
  let blank: TemplateDefaults | null = null
  if (!templateId) {
    const [def] = await db.select({ defaultsJson: quoteTemplates.defaultsJson }).from(quoteTemplates).where(and(eq(quoteTemplates.isDefault, true), eq(quoteTemplates.status, 'published'), isNull(quoteTemplates.deletedAt)))
    if (def) blank = { ...parseDefaults(def.defaultsJson), starterGroups: [] }
  }
  const defaults = template?.defaults ?? blank
  // (REG-403) The editor's General Info opens filled from the records that exist: the lead's property type and address,
  // and the signed-in member as "Prepared by". The section order / state stays null = the default (lib/quotes/sections.ts).
  const [me] = await db.select({ id: members.id, name: members.name }).from(members).where(eq(members.isYou, true))
  /* (REG-704, AI credits B-12) a quote read from a file is created under the id its read was charged to (`quote:<id>`), so Usage ties
     the 5 AI credits to this quote and its lead; an id already taken falls back to a fresh one */
  const asked = opts.id && UUID.test(opts.id) ? opts.id : null
  const taken = asked ? (await db.select({ id: quotes.id }).from(quotes).where(eq(quotes.id, asked))).length > 0 : true
  const id = asked && !taken ? asked : randomUUID(); const now = new Date()
  const studio = await fetchStudio()
  const tokens = { client: lead.name, studio: studio.name, studioPhone: studio.phone, member: me?.name ?? '' }
  const textOf = async (textId: string | null) => { if (!textId) return null; const [t] = await db.select().from(quoteTextTemplates).where(and(eq(quoteTextTemplates.id, textId), isNull(quoteTextTemplates.deletedAt))); return t ? resolveTokens(t.body, tokens) : null }   // (REG-581) a deleted text never seeds
  const [termsHtml, notesHtml] = await Promise.all([textOf(defaults?.termsTemplateId ?? null), textOf(defaults?.notesTemplateId ?? null)])
  // Project Ref # and Quote Valid Until are records from the start (REG-403 / lib/quotes/refs.ts): the property's family, the
  // day and its sequence; 30 days of validity. The description clamps to two lines by default (1260:31372).
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const [today] = await db.select({ n: sql<number>`count(*)` }).from(quotes).where(sql`${quotes.createdAt} >= ${Math.floor(dayStart.getTime() / 1000)}`)
  await db.insert(quotes).values({
    id, leadId, number: await nextNumber(me ?? null, now, lead.propertyType), title: lead.name, amountMinor: 0, visibility: 'Private', status: 'Draft', createdAt: now, updatedAt: now,
    preparedBy: me?.id ?? null, createdBy: me?.id ?? null, propertyType: lead.propertyType, siteAddress: lead.propertyAddress ?? null, nric: lead.icNumber ?? null, customerId: lead.customerId ?? null /* (REG-607) the lead's IC and reference start every quote */, templateId, templateVersion: template?.version ?? null,
    validUntil: defaults ? new Date(now.getTime() + defaults.validityDays * 86_400_000) : validUntil(now), projectRef: projectRef(lead.propertyType, now, (today?.n ?? 0) + 1), itemsDensity: DEFAULT_DENSITY,
    gstEnabled: studio.gstRegistered && (defaults?.gstEnabled ?? true), clientSignatureRequired: defaults?.signatureRequired ?? true, termsHtml, notesHtml,   // (REG-645) a studio not registered for GST starts quotes without it
    itemsColumns: columnsJson(defaults?.columns ?? null),   // (REG-538) the template's working columns
    // (REG-497) With starter sections the groups ARE the structure (View by would bucket each group under itself); without them the table groups the way the template prints.
    itemsView: cleanGroups(defaults?.starterGroups ?? []).length ? 'none' : template?.view ?? 'none',
  })
  // (REG-497) The template's starter sections open as empty groups, carrying the trade or room the template groups by — so the document files their lines under them.
  const groups = cleanGroups(defaults?.starterGroups ?? [])
  if (groups.length) {
    await db.insert(quoteItems).values(groups.map((name, position) => ({
      id: randomUUID(), quoteId: id, parentId: null, kind: 'group', position, name, status: 'Pending', qty: 1, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: 9,
      category: template?.view === 'category' ? name : null, room: template?.view === 'room' ? name : null, section: template?.view === 'section' ? name : null,
      visibility: 'visible', collapsed: false, createdAt: now, updatedAt: now,
    })))
  }
  if (templateId) await db.update(quoteTemplates).set({ lastUsedAt: now }).where(eq(quoteTemplates.id, templateId))
  // (REG-418) Every quote starts on the studio's default split — the toolbar reads "Default: 10/30/30/30" from the first
  // open — with the deposit on approval and the rest estimated from the lead's start date and the property's renovation length.
  const rows = presetRows(defaults?.paymentPreset ?? 'default', scheduleAnchors({ estimatedStart: lead.estimatedStartDate, quoteCreated: now, propertyType: lead.propertyType }), await fetchPaymentSplits())   // (REG-538) the Payments library
  await db.insert(quotePayments).values(rows.map((r, position) => ({ id: randomUUID(), quoteId: id, position, name: r.name, description: r.description, pct: r.pct, dueKind: r.dueKind, dueAt: r.dueAt, createdAt: now, updatedAt: now })))
  touch(leadId); return id
}

/** (REG-538) A template's working columns as the Items table stores them (null = the table's own default). */
const columnsJson = (cols: ColumnKey[] | null): string | null =>
  cols ? JSON.stringify({ details: DEFAULT_COLUMNS.details, columns: COLUMN_KEYS.map((key) => ({ key, on: cols.includes(key) })) } satisfies ColumnSettings) : null

export type AppliedDefaults = {
  updatedAt: number; validUntil: number | null; gstEnabled: boolean; signatureRequired: boolean
  termsHtml: string | null; notesHtml: string | null; itemsColumns: string | null; itemsView: string
  payments: QuotePayment[]; items: QuoteItem[]
}
/**
 * (REG-538) Change template on a Draft, then "Apply defaults": the template's Defaults tab lands on the quote the way a
 * new quote would start — the payment schedule, validity from today, GST, the signature switch, the Terms and Notes
 * templates (only where the template names one), the working columns, and the starter sections when the table is still
 * empty. The lines stay. Never silent: the editor asks first.
 */
export async function applyTemplateDefaults(quoteId: string, templateId: string): Promise<AppliedDefaults> {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error('quote not found')
  if (q.status !== 'Draft') throw new Error('only a draft takes a template’s defaults')
  const [t] = await db.select({ defaultsJson: quoteTemplates.defaultsJson, designJson: quoteTemplates.designJson, status: quoteTemplates.status, deletedAt: quoteTemplates.deletedAt }).from(quoteTemplates).where(eq(quoteTemplates.id, templateId))
  if (!t || t.deletedAt || t.status !== 'published') throw new Error('template not published')
  const defaults = parseDefaults(t.defaultsJson)
  const view = viewForTemplate(parseDesign(t.designJson, presetByKey('letter').design()))
  const [lead] = await db.select({ name: leads.name, propertyType: leads.propertyType, estimatedStartDate: leads.estimatedStartDate }).from(leads).where(eq(leads.id, q.leadId))
  if (!lead) throw new Error('lead not found')
  const [me] = await db.select({ id: members.id, name: members.name }).from(members).where(eq(members.isYou, true))
  const studio = await fetchStudio()
  const tokens = { client: lead.name, studio: studio.name, studioPhone: studio.phone, member: me?.name ?? '' }
  const textOf = async (textId: string | null) => { if (!textId) return null; const [x] = await db.select().from(quoteTextTemplates).where(and(eq(quoteTextTemplates.id, textId), isNull(quoteTextTemplates.deletedAt))); return x ? resolveTokens(x.body, tokens) : null }   // (REG-581)
  const [termsHtml, notesHtml] = await Promise.all([textOf(defaults.termsTemplateId), textOf(defaults.notesTemplateId)])
  const now = new Date()
  const rows = presetRows(defaults.paymentPreset ?? 'default', scheduleAnchors({ estimatedStart: lead.estimatedStartDate, quoteCreated: q.createdAt, propertyType: q.propertyType ?? lead.propertyType }), await fetchPaymentSplits())
  /* (REG-589) With the schedule locked to Owners and Admins, a designer's Apply defaults leaves the milestones as they are. */
  const [rules, [meRole]] = await Promise.all([fetchQuoteRules(), db.select({ role: members.role }).from(members).where(eq(members.isYou, true))])
  const keepPayments = !changesPayments(meRole?.role, rules.paymentLock)
  if (!keepPayments) {
    await db.delete(quotePayments).where(eq(quotePayments.quoteId, quoteId))
    await db.insert(quotePayments).values(rows.map((r, position) => ({ id: randomUUID(), quoteId, position, name: r.name, description: r.description, pct: r.pct, dueKind: r.dueKind, dueAt: r.dueAt, createdAt: now, updatedAt: now })))
  }
  const [had] = await db.select({ n: sql<number>`count(*)` }).from(quoteItems).where(eq(quoteItems.quoteId, quoteId))
  const groups = cleanGroups(defaults.starterGroups)
  const seedGroups = (had?.n ?? 0) === 0 && groups.length > 0
  if (seedGroups) {
    await db.insert(quoteItems).values(groups.map((name, position) => ({
      id: randomUUID(), quoteId, parentId: null, kind: 'group', position, name, status: 'Pending', qty: 1, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: 9,
      category: view === 'category' ? name : null, room: view === 'room' ? name : null, section: view === 'section' ? name : null,
      visibility: 'visible', collapsed: false, createdAt: now, updatedAt: now,
    })))
  }
  const patch = {
    validUntil: new Date(now.getTime() + defaults.validityDays * 86_400_000), gstEnabled: defaults.gstEnabled, clientSignatureRequired: defaults.signatureRequired,
    termsHtml: termsHtml ?? q.termsHtml, notesHtml: notesHtml ?? q.notesHtml, itemsColumns: columnsJson(defaults.columns) ?? q.itemsColumns,
    itemsView: seedGroups ? 'none' : q.itemsView, updatedAt: now,
  }
  await db.update(quotes).set(patch).where(eq(quotes.id, quoteId))
  const [payments, items] = await Promise.all([
    db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(quotePayments.position),
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(quoteItems.position, quoteItems.createdAt),
  ])
  touch(q.leadId); revalidatePath(`/quotes/${quoteId}`); revalidatePath(`/quotes/${quoteId}/preview`)
  return { updatedAt: now.getTime(), validUntil: patch.validUntil.getTime(), gstEnabled: patch.gstEnabled, signatureRequired: patch.clientSignatureRequired, termsHtml: patch.termsHtml, notesHtml: patch.notesHtml, itemsColumns: patch.itemsColumns, itemsView: patch.itemsView, payments, items }
}

/** (REG-538) ⋯ › Duplicate and Edit: a Draft copy of the quote — lines, schedule, files, settings, template — with its own number, titled "(copy)". */
export async function duplicateQuote(quoteId: string): Promise<string> {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error('quote not found')
  const [me] = await db.select({ id: members.id, name: members.name }).from(members).where(eq(members.isYou, true))
  const id = randomUUID(); const now = new Date()
  await db.insert(quotes).values({
    ...q, id, number: await nextNumber(me ?? null, now, q.propertyType), title: `${q.title} (copy)`, status: 'Draft', createdAt: now, updatedAt: now, createdBy: me?.id ?? q.createdBy, revisedAt: null, discountsJson: q.discountsJson,
    sentAt: null, approvedAt: null, dueAt: null, archivedAt: null, deletedAt: null, validUntil: q.validUntil && q.validUntil > now ? q.validUntil : validUntil(now),
    /* (parity §8.2 · E-10, REG-624) A copy is a new quote: version 1, no client confirmation, no approval on its record. */
    version: 1, confirmedAt: null, confirmedBy: null, signedAt: null, approvedBy: null, submittedAt: null, submittedBy: null, reviewNote: null, reviewedBy: null, reviewedAt: null, clientSentAt: null,
  })
  const [items, payments, files] = await Promise.all([
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(quoteItems.position, quoteItems.createdAt),
    db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(quotePayments.position),
    db.select().from(quoteFiles).where(eq(quoteFiles.quoteId, quoteId)),
  ])
  const ids = new Map(items.map((i) => [i.id, randomUUID()]))
  if (items.length) await db.insert(quoteItems).values(items.map((i) => ({ ...i, id: ids.get(i.id)!, quoteId: id, parentId: i.parentId ? ids.get(i.parentId) ?? null : null, clientChoice: null, createdAt: now, updatedAt: now })))
  if (payments.length) await db.insert(quotePayments).values(payments.map((p) => ({ ...p, id: randomUUID(), quoteId: id, createdAt: now, updatedAt: now })))
  if (files.length) await db.insert(quoteFiles).values(files.map((f) => ({ ...f, quoteId: id, createdAt: now })))
  touch(q.leadId); revalidatePath('/quotes')
  return id
}

/**
 * (REG-627, quote editor parity Q-16) Upload a quote: a new quote on the lead from the template the window chose (or blank), its lines as the
 * upload read them — each group into the template's starter section of that name when there is one, else a new section at the end; lines
 * with no group at the top level. Every line goes through the paste path's own bounds (`createQuoteItems`). Returns the new quote's id.
 */
export async function createQuoteFromUpload(leadId: string, templateId: string | null, groups: { name: string | null; lines: BulkLine[] }[], quoteId?: string): Promise<string> {
  const id = await createQuote(leadId, templateId, { id: quoteId })
  const tops = (await db.select().from(quoteItems).where(and(eq(quoteItems.quoteId, id), isNull(quoteItems.parentId)))).filter((i) => i.kind === 'group')
  for (const g of groups.slice(0, 60)) {
    const lines = g.lines.slice(0, 500)
    if (!lines.length) continue
    const name = (g.name ?? '').trim().slice(0, 200)
    if (!name) { await createQuoteItems(id, lines); continue }
    const host = tops.find((t) => t.name.trim().toLowerCase() === name.toLowerCase()) ?? await createQuoteItem(id, { kind: 'group', name })
    await createQuoteItems(id, lines, { parentId: host.id })
  }
  return id
}

/** Template tile kebab › Set as default (REG-412): one default at a time, studio-wide. (audit 2026-09-26, E7) The Create Quote modal's tile
    goes through Company › Templates' own action, so REG-646's rule holds here too: only an Owner or an Admin sets the studio's default. */
export async function setDefaultTemplate(templateId: string) {
  const { setDefaultTemplate: set } = await import('@/app/company/templates-actions')
  return set(templateId)
}

async function leadOf(quoteId: string): Promise<string | null> {
  const [q] = await db.select({ leadId: quotes.leadId }).from(quotes).where(eq(quotes.id, quoteId))
  return q?.leadId ?? null
}

/**
 * Status cell menu (910:36673). First move out of Draft stamps Sent; only Approved stamps the approval date.
 * Signed stamped it too, which dated an approval that never happened — Draft › Signed is one click, and a studio
 * with Quote approval off (quoteStatuses()) has no Approved step at all. Approval Date stays "-" until then (REG-176).
 */
export async function setQuoteStatus(quoteId: string, status: QuoteStatus): Promise<void> {
  // (REG-286) A server action is a public endpoint: `status` is written straight into the column the row menu, the
  // filters and the Overview widget's track all read back, so it must be one of the five (isQuoteStatus, 910:36673).
  if (!isQuoteStatus(status)) throw new Error(`Unknown quote status: ${String(status)}`)
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId))
  if (!q) return
  const [meRow] = await db.select({ id: members.id, role: members.role }).from(members).where(eq(members.isYou, true))
  /* (REG-590) With approval required, Approved is an approver's word: an Owner, an Admin or the studio's backup approver. */
  if (status === 'Approved' && (await fetchQuoteApproval()) === 'required') { if (!(await isApprover(meRow?.id, meRow?.role))) throw new Error('only an approver marks a quote Approved') }
  const now = new Date()
  const patch: Partial<typeof quotes.$inferInsert> = { status, updatedAt: now }
  if ((status === 'Sent for Approval' || status === 'Sent to Client') && !q.sentAt) patch.sentAt = now
  if (status === 'Approved' && !q.approvedAt) { patch.approvedAt = now; patch.approvedBy = meRow?.id ?? null }   // (REG-624) on the record as who approved
  if (status === 'Sent for Approval' && q.status !== 'Sent for Approval') { patch.submittedAt = now; patch.submittedBy = meRow?.id ?? null }
  if (status === 'Sent to Client' && !q.clientSentAt) patch.clientSentAt = now
  if (status === 'Sent to Client' || status === 'Confirmed' || status === 'Signed') patch.visibility = 'Shared'   // (REG-625) the client has it
  if (status === 'Signed' && !q.signedAt) patch.signedAt = now   // (REG-626) signed by hand — the date the lists and the Won step read
  if (status === 'Confirmed' && !q.confirmedAt) { patch.confirmedAt = now; if (!q.sentAt) patch.sentAt = now }   // (REG-587) marked by hand — the client said so on the phone
  await db.update(quotes).set(patch).where(eq(quotes.id, quoteId))
  touch(q.leadId)
}

/** Due cell (calendar_add_on 24 → the Material picker, REG-119). */
/**
 * (REG-470, user feedback 2026-09-16: "If I add a due date to a quote, shouldn't that create a task for me automatically?")
 * The due date IS a follow-up: setting it raises one open task on the lead — "Follow up on quote OM-10001", due that day,
 * assigned to whoever prepared the quote — moving it keeps the task's date in step, and clearing it removes the task while it
 * is still open (a completed one stays as history). The task remembers its quote (`quote_id`), so there is never a second.
 */
export async function setQuoteDue(quoteId: string, dueAt: Date | null): Promise<void> {
  const [q] = await db.select({ leadId: quotes.leadId, number: quotes.number, title: quotes.title, preparedBy: quotes.preparedBy }).from(quotes).where(eq(quotes.id, quoteId))
  if (!q) return
  await db.update(quotes).set({ dueAt, updatedAt: new Date() }).where(eq(quotes.id, quoteId))
  const [task] = await db.select({ id: leadTasks.id }).from(leadTasks).where(and(eq(leadTasks.quoteId, quoteId), eq(leadTasks.done, false)))
  if (dueAt) {
    if (task) {
      await db.update(leadTasks).set({ dueAt, updatedAt: new Date() }).where(eq(leadTasks.id, task.id))
    } else {
      const id = randomUUID(); const now = new Date()
      const owner = q.preparedBy ?? await sessionMemberId()
      await db.transaction(async (tx) => {
        await tx.insert(leadTasks).values({
          id, leadId: q.leadId, quoteId, title: `Follow up on quote ${q.number}`, kind: 'Follow-up',   /* (REG-608) a follow-up is a task of its own kind */
          description: `${q.title} is due on ${displayDate(dueAt)} — chase the client for a decision before then.`,
          dueAt, done: false, createdAt: now, creatorId: ME, seenAt: null, updatedAt: null,
        })
        await tx.insert(taskAssignees).values({ taskId: id, memberId: owner })
      })
      const [l] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, q.leadId))
      await notify('task_assigned', [owner], { title: `New task: Follow up on quote ${q.number}`, body: l ? `On ${l.name}` : null, href: `/leads/${q.leadId}/tasks?open=${id}`, leadId: q.leadId, quoteId })   /* (REG-608) */
    }
  } else if (task) {
    await db.delete(leadTasks).where(eq(leadTasks.id, task.id))
  }
  touch(q.leadId); revalidatePath('/tasks'); revalidatePath('/', 'layout')
}

/** Row kebab › Archive (910:36723) — soft; `restore` is the snackbar's Undo. */
export async function archiveQuote(quoteId: string, restore = false): Promise<void> {
  const leadId = await leadOf(quoteId); if (!leadId) return
  await db.update(quotes).set({ archivedAt: restore ? null : new Date() }).where(eq(quotes.id, quoteId))
  touch(leadId); revalidatePath('/quotes')   // (sweep S1) Tools › Quotes lists it too — the row stayed there after Archive
}

/**
 * (sweep S1 · U-07) Archived Quotes — archiving took a quote off every list with nothing to bring it back once the snackbar's Undo had
 * gone. The archived quotes on a lead (or, with null, on every lead the member sees), newest first; Unarchive puts them back. Archive
 * asks no role, so neither does Unarchive; Who sees leads decides which rows show.
 */
export type ArchivedQuoteRow = { id: string; number: string; title: string; leadId: string; leadName: string; status: string; amountMinor: number; archivedAt: number }
export async function listArchivedQuotes(leadId: string | null): Promise<ArchivedQuoteRow[]> {
  const seen = await visibleLeadIds(await fetchViewer())
  const rows = await db.select({ q: quotes, leadName: leads.name }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
    .where(and(isNotNull(quotes.archivedAt), isNull(quotes.deletedAt), isNull(leads.deletedAt), leadId ? eq(quotes.leadId, leadId) : undefined))
  return rows.filter((r) => !seen || seen.has(r.q.leadId)).map((r) => ({
    id: r.q.id, number: r.q.number, title: r.q.title, leadId: r.q.leadId, leadName: r.leadName, status: r.q.status, amountMinor: r.q.amountMinor,
    archivedAt: r.q.archivedAt!.getTime(),
  })).sort((a, b) => b.archivedAt - a.archivedAt)
}
export async function unarchiveQuotes(quoteIds: string[]): Promise<{ restored: number }> {
  const seen = await visibleLeadIds(await fetchViewer())
  const rows = quoteIds.length ? await db.select({ id: quotes.id, leadId: quotes.leadId }).from(quotes).where(and(inArray(quotes.id, quoteIds), isNotNull(quotes.archivedAt), isNull(quotes.deletedAt))) : []
  const back = rows.filter((q) => !seen || seen.has(q.leadId))
  if (back.length) await db.update(quotes).set({ archivedAt: null }).where(inArray(quotes.id, back.map((q) => q.id)))
  for (const leadId of new Set(back.map((q) => q.leadId))) touch(leadId)
  revalidatePath('/quotes')
  return { restored: back.length }
}

/** (REG-340) What the Move stage window's From System lists read: the lead's live quotes and contracts, dates as epoch ms. */
export type StageDocuments = {
  quotes: { id: string; number: string; title: string; amountMinor: number; status: string; approvedAt: number | null; signedAt: number | null }[]
  contracts: { id: string; title: string; status: string; signedAt: number | null; signedCopy: string | null }[]
}

/**
 * (REG-340) The Move stage window opens on the client from the listing and the Overview, neither of which loads the
 * lead's quotes; the window asks for them itself when it opens. Archived / deleted rows leave the lists, as on the tabs.
 * A quote has no signed stamp of its own: the Signed move stamps `updatedAt` (setQuoteStatus), so that is its signed date.
 */
export async function fetchStageDocuments(leadId: string): Promise<StageDocuments> {
  const [q, c] = await Promise.all([fetchLeadQuotes(leadId), fetchLeadContracts(leadId)])
  return {
    quotes: q.quotes.map((x) => ({
      id: x.id, number: x.number, title: x.title, amountMinor: x.amountMinor, status: x.status,
      approvedAt: x.approvedAt?.getTime() ?? null,
      signedAt: x.status === 'Signed' ? (x.signedAt ?? x.updatedAt ?? x.approvedAt ?? x.createdAt).getTime() : null,   // (REG-626) the day it was signed, when the record has it
    })),
    contracts: c.contracts.map((x) => ({ id: x.id, title: x.title, status: x.status, signedAt: x.signedAt?.getTime() ?? null, signedCopy: x.signedCopy })),
  }
}

/**
 * Row kebab › Delete / bulk Delete — soft, so Deleted Quotes (the toolbar's kebab) lists them. (REG-625, parity Q-28) Only an Owner, an
 * Admin or the member who created a quote deletes it: the others in the list are left and counted back.
 */
export async function deleteQuotes(quoteIds: string[]): Promise<{ deleted: number; refused: number }> {
  if (!quoteIds.length) return { deleted: 0, refused: 0 }
  const viewer = await fetchViewer()
  const rows = await db.select({ id: quotes.id, leadId: quotes.leadId, createdBy: quotes.createdBy }).from(quotes).where(and(inArray(quotes.id, quoteIds), isNull(quotes.deletedAt)))
  const mine = rows.filter((q) => canDeleteQuote(viewer, q))
  if (mine.length) await db.update(quotes).set({ deletedAt: new Date() }).where(inArray(quotes.id, mine.map((q) => q.id)))
  for (const leadId of new Set(mine.map((q) => q.leadId))) touch(leadId)
  revalidatePath('/quotes')
  return { deleted: mine.length, refused: rows.length - mine.length }
}

/* ── (REG-625, parity Q-27) Deleted Quotes: the list, Restore, Delete forever, Empty Trash ── */
export type DeletedQuoteRow = { id: string; number: string; title: string; leadId: string; leadName: string; status: string; amountMinor: number; deletedAt: number; mine: boolean; heldBy: string | null }
/** The deleted quotes on a lead (or, with null, on every lead the member sees), newest deletion first. */
export async function listDeletedQuotes(leadId: string | null): Promise<DeletedQuoteRow[]> {
  const viewer = await fetchViewer()
  const seen = await visibleLeadIds(viewer)
  const rows = await db.select({ q: quotes, leadName: leads.name }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
    .where(and(isNotNull(quotes.deletedAt), isNull(leads.deletedAt), leadId ? eq(quotes.leadId, leadId) : undefined))
  const held = await contractHolds(rows.map((r) => r.q.id))
  return rows.filter((r) => !seen || seen.has(r.q.leadId)).map((r) => ({
    id: r.q.id, number: r.q.number, title: r.q.title, leadId: r.q.leadId, leadName: r.leadName, status: r.q.status, amountMinor: r.q.amountMinor,
    deletedAt: r.q.deletedAt!.getTime(), mine: canDeleteQuote(viewer, r.q), heldBy: held.get(r.q.id) ?? null,
  })).sort((a, b) => b.deletedAt - a.deletedAt)
}
/** A contract raised from a quote reads it (its chips, its totals): while one is live, the quote cannot go for good. */
async function contractHolds(quoteIds: string[]): Promise<Map<string, string>> {
  if (!quoteIds.length) return new Map()
  const rows = await db.select({ quoteId: contracts.fromQuoteId, title: contracts.title }).from(contracts).where(and(inArray(contracts.fromQuoteId, quoteIds), isNull(contracts.deletedAt)))
  return new Map(rows.filter((r) => r.quoteId).map((r) => [r.quoteId!, r.title]))
}
export async function restoreQuotes(quoteIds: string[]): Promise<{ restored: number; refused: number }> {
  const viewer = await fetchViewer()
  const rows = quoteIds.length ? await db.select({ id: quotes.id, leadId: quotes.leadId, createdBy: quotes.createdBy }).from(quotes).where(and(inArray(quotes.id, quoteIds), isNotNull(quotes.deletedAt))) : []
  const mine = rows.filter((q) => canDeleteQuote(viewer, q))
  if (mine.length) await db.update(quotes).set({ deletedAt: null, updatedAt: new Date() }).where(inArray(quotes.id, mine.map((q) => q.id)))
  for (const leadId of new Set(mine.map((q) => q.leadId))) touch(leadId)
  revalidatePath('/quotes')
  return { restored: mine.length, refused: rows.length - mine.length }
}
/** Delete forever: the quote and everything that is only its own — lines, payments, file links, kept versions; a task it raised keeps
    its history without the link, a comparison keeps its reading, its notifications go. A quote a live contract reads stays. */
export async function deleteQuotesForever(quoteIds: string[]): Promise<{ deleted: number; refused: number }> {
  const viewer = await fetchViewer()
  const rows = quoteIds.length ? await db.select({ id: quotes.id, leadId: quotes.leadId, createdBy: quotes.createdBy }).from(quotes).where(and(inArray(quotes.id, quoteIds), isNotNull(quotes.deletedAt))) : []
  const held = await contractHolds(rows.map((q) => q.id))
  const gone = rows.filter((q) => canDeleteQuote(viewer, q) && !held.has(q.id))
  const ids = gone.map((q) => q.id)
  if (ids.length) {
    await db.transaction(async (tx) => {
      await tx.delete(quoteItems).where(inArray(quoteItems.quoteId, ids))
      await tx.delete(quotePayments).where(inArray(quotePayments.quoteId, ids))
      await tx.delete(quoteFiles).where(inArray(quoteFiles.quoteId, ids))
      await tx.delete(quoteVersions).where(inArray(quoteVersions.quoteId, ids))
      await tx.delete(quoteItemComments).where(inArray(quoteItemComments.quoteId, ids))   // (REG-627) the lines' threads go with them
      await tx.update(leadTasks).set({ quoteId: null }).where(inArray(leadTasks.quoteId, ids))
      await tx.update(quoteComparisons).set({ quoteId: null }).where(inArray(quoteComparisons.quoteId, ids))
      await tx.delete(notifications).where(inArray(notifications.quoteId, ids))
      await tx.delete(quotes).where(inArray(quotes.id, ids))
    })
  }
  for (const leadId of new Set(gone.map((q) => q.leadId))) touch(leadId)
  revalidatePath('/quotes')
  return { deleted: gone.length, refused: rows.length - gone.length }
}
/** Empty Trash: every deleted quote on the lead (or every one the member sees) that they may delete and no contract holds. */
export async function emptyQuoteTrash(leadId: string | null): Promise<{ deleted: number; refused: number }> {
  const rows = await listDeletedQuotes(leadId)
  return deleteQuotesForever(rows.map((r) => r.id))
}
