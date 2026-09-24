'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, inArray, sql, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadTasks, leads, members, quoteFiles, quoteTemplates, quoteTextTemplates, quotes, quotePayments, taskAssignees, type QuoteItem, type QuotePayment } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { displayDate } from '@/lib/format'
import { revalidatePath } from 'next/cache'
import { revalidateEveryLead, revalidateLead } from '@/lib/leads/queries'
import { presetRows, scheduleAnchors } from '@/lib/quotes/payments'
import { projectRef, validUntil, propertyFamily } from '@/lib/quotes/refs'
import { parseDefaults, parseDesign, type TemplateDefaults } from '@/lib/templates/model'
import { cleanGroups, viewForTemplate } from '@/lib/templates/picker'
import { presetByKey } from '@/lib/templates/presets'
import { quoteItems } from '@/lib/db/schema'
import { resolveTokens } from '@/lib/quotes/text'
import { fetchStudio, fetchNumbering, NUMBERING_KEY, fetchQuoteApproval, fetchQuoteRules, isApprover } from '@/lib/settings/queries'
import { formatQuoteNumber, initialsOf, isDefaultNumbering } from '@/lib/settings/types'
import { settings } from '@/lib/db/schema'
import { COLUMN_KEYS, DEFAULT_COLUMNS, DEFAULT_DENSITY, type ColumnKey, type ColumnSettings } from '@/lib/quotes/items-model'
import { fetchPaymentSplits } from '@/lib/company/payment-templates'
import { notify } from '@/lib/notifications/emit'
import { isQuoteStatus, type QuoteStatus } from '@/lib/leads/quote-filters'
import { fetchLeadQuotes } from '@/lib/leads/quotes'
import { fetchLeadContracts } from '@/lib/leads/contracts'

/* Lead Details › Quotes (910-36240). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

/** (REG-286) One shared eviction for every detail tab — the hand-listed paths here never named Activity, which prints every quote milestone. */
const touch = (leadId: string) => revalidateLead(leadId)
const ME = SESSION_MEMBER_ID

/**
 * Next quote number: "OM-" + (highest existing + 1); the seed starts at OM-10001 (910:36324). (REG-561) A studio with its own
 * pattern (Settings › Quotes) gets prefix · initials · year-month · a running number instead — the sequence is the setting's
 * `next`, never below the highest number already given under that prefix; the numbers already on quotes stay as they are.
 */
async function nextNumber(creator?: { name: string } | null, at = new Date(), propertyType: string | null = null): Promise<string> {
  const n = await fetchNumbering()
  if (isDefaultNumbering(n)) {
    const [row] = await db.select({ max: sql<number | null>`max(cast(substr(${quotes.number}, 4) as integer))` }).from(quotes)
    return `OM-${(row?.max ?? 10000) + 1}`
  }
  // (REG-586) Commercial work — an office or a shop, by the lead's property type — runs on the second sequence when the studio keeps one.
  const commercial = n.commercial.on && propertyFamily(propertyType) === 'COMM'
  const prefix = commercial ? n.commercial.prefix : n.prefix
  const all = await db.select({ number: quotes.number }).from(quotes)
  const tail = (x: string) => { const m = /(\d+)$/.exec(x); return m ? Number(m[1]) : 0 }
  const highest = all.filter((q) => q.number.startsWith(`${prefix}-`)).reduce((m, q) => Math.max(m, tail(q.number)), 0)
  const seq = Math.max((commercial ? n.commercial.next : n.next) || 1, highest + 1)
  const value = JSON.stringify(commercial ? { ...n, commercial: { ...n.commercial, next: seq + 1 } } : { ...n, next: seq + 1 })
  await db.insert(settings).values({ key: NUMBERING_KEY, value, updatedAt: at }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: at } })
  return formatQuoteNumber(n, seq, { initials: creator ? initialsOf(creator.name) : undefined, date: at, commercial })
}

/**
 * Create Quote modal › a template tile or Blank Quote (REG-405 / REG-412): a Private Draft titled after the lead
 * (910:36324 shows the lead's name as the row title), total S$0, remembering the design template it started from —
 * and stamping that template's "used n ago". A template id that is not the studio's is refused.
 */
export async function createQuote(leadId: string, templateId: string | null = null): Promise<string> {
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
  const id = randomUUID(); const now = new Date()
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
    gstEnabled: defaults?.gstEnabled ?? true, clientSignatureRequired: defaults?.signatureRequired ?? true, termsHtml, notesHtml,
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
  const keepPayments = rules.paymentLock && !(meRole?.role === 'Owner' || meRole?.role === 'Admin')
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
  })
  const [items, payments, files] = await Promise.all([
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(quoteItems.position, quoteItems.createdAt),
    db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(quotePayments.position),
    db.select().from(quoteFiles).where(eq(quoteFiles.quoteId, quoteId)),
  ])
  const ids = new Map(items.map((i) => [i.id, randomUUID()]))
  if (items.length) await db.insert(quoteItems).values(items.map((i) => ({ ...i, id: ids.get(i.id)!, quoteId: id, parentId: i.parentId ? ids.get(i.parentId) ?? null : null, createdAt: now, updatedAt: now })))
  if (payments.length) await db.insert(quotePayments).values(payments.map((p) => ({ ...p, id: randomUUID(), quoteId: id, createdAt: now, updatedAt: now })))
  if (files.length) await db.insert(quoteFiles).values(files.map((f) => ({ ...f, quoteId: id, createdAt: now })))
  touch(q.leadId); revalidatePath('/quotes')
  return id
}

/** Template tile kebab › Set as default (REG-412): one default at a time, studio-wide. */
export async function setDefaultTemplate(templateId: string): Promise<void> {
  const [t] = await db.select({ id: quoteTemplates.id }).from(quoteTemplates).where(eq(quoteTemplates.id, templateId))
  if (!t) throw new Error('template not found')
  await db.update(quoteTemplates).set({ isDefault: false })
  await db.update(quoteTemplates).set({ isDefault: true }).where(eq(quoteTemplates.id, templateId))
  revalidateEveryLead()
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
  /* (REG-590) With approval required, Approved is an approver's word: an Owner, an Admin or the studio's backup approver. */
  if (status === 'Approved' && (await fetchQuoteApproval()) === 'required') { const [meRow] = await db.select({ id: members.id, role: members.role }).from(members).where(eq(members.isYou, true)); if (!(await isApprover(meRow?.id, meRow?.role))) throw new Error('only an approver marks a quote Approved') }
  const now = new Date()
  const patch: Partial<typeof quotes.$inferInsert> = { status, updatedAt: now }
  if ((status === 'Sent for Approval' || status === 'Sent to Client') && !q.sentAt) patch.sentAt = now
  if (status === 'Approved' && !q.approvedAt) patch.approvedAt = now
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
      await db.transaction(async (tx) => {
        await tx.insert(leadTasks).values({
          id, leadId: q.leadId, quoteId, title: `Follow up on quote ${q.number}`, kind: 'Follow-up',   /* (REG-608) a follow-up is a task of its own kind */
          description: `${q.title} is due on ${displayDate(dueAt)} — chase the client for a decision before then.`,
          dueAt, done: false, createdAt: now, creatorId: ME, seenAt: null, updatedAt: null,
        })
        await tx.insert(taskAssignees).values({ taskId: id, memberId: q.preparedBy ?? ME })
      })
      const [l] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, q.leadId))
      await notify('task_assigned', [q.preparedBy ?? ME], { title: `New task: Follow up on quote ${q.number}`, body: l ? `On ${l.name}` : null, href: `/leads/${q.leadId}/tasks?open=${id}`, leadId: q.leadId, quoteId })   /* (REG-608) */
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
  touch(leadId)
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
      signedAt: x.status === 'Signed' ? (x.updatedAt ?? x.approvedAt ?? x.createdAt).getTime() : null,
    })),
    contracts: c.contracts.map((x) => ({ id: x.id, title: x.title, status: x.status, signedAt: x.signedAt?.getTime() ?? null, signedCopy: x.signedCopy })),
  }
}

/** Row kebab › Delete / bulk Delete — soft, so "Deleted Quotes" (header kebab) can list them later. */
export async function deleteQuotes(quoteIds: string[]): Promise<void> {
  if (!quoteIds.length) return
  const leadId = await leadOf(quoteIds[0]!); if (!leadId) return
  await db.update(quotes).set({ deletedAt: new Date() }).where(inArray(quotes.id, quoteIds))
  touch(leadId)
}
