'use server'

import { randomUUID } from 'node:crypto'
import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, members, quoteTemplates, quotes, quotePayments } from '@/lib/db/schema'
import { revalidateEveryLead, revalidateLead } from '@/lib/leads/queries'
import { presetRows, scheduleAnchors } from '@/lib/quotes/payments'
import { projectRef, validUntil } from '@/lib/quotes/refs'
import { DEFAULT_DENSITY } from '@/lib/quotes/items-model'
import { isQuoteStatus, type QuoteStatus } from '@/lib/leads/quote-filters'
import { fetchLeadQuotes } from '@/lib/leads/quotes'
import { fetchLeadContracts } from '@/lib/leads/contracts'

/* Lead Details › Quotes (910-36240). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

/** (REG-286) One shared eviction for every detail tab — the hand-listed paths here never named Activity, which prints every quote milestone. */
const touch = (leadId: string) => revalidateLead(leadId)

/** Next quote number: "OM-" + (highest existing + 1); the seed starts at OM-10001 (910:36324). */
async function nextNumber(): Promise<string> {
  const [row] = await db.select({ max: sql<number | null>`max(cast(substr(${quotes.number}, 4) as integer))` }).from(quotes)
  return `OM-${(row?.max ?? 10000) + 1}`
}

/**
 * Create Quote modal › a template tile or Blank Quote (REG-405 / REG-412): a Private Draft titled after the lead
 * (910:36324 shows the lead's name as the row title), total S$0, remembering the design template it started from —
 * and stamping that template's "used n ago". A template id that is not the studio's is refused.
 */
export async function createQuote(leadId: string, templateId: string | null = null): Promise<string> {
  const [lead] = await db.select({ name: leads.name, propertyType: leads.propertyType, propertyAddress: leads.propertyAddress, estimatedStartDate: leads.estimatedStartDate }).from(leads).where(eq(leads.id, leadId))
  if (!lead) throw new Error('lead not found')
  if (templateId) {
    const [t] = await db.select({ id: quoteTemplates.id }).from(quoteTemplates).where(eq(quoteTemplates.id, templateId))
    if (!t) throw new Error('template not found')
  }
  // (REG-403) The editor's General Info opens filled from the records that exist: the lead's property type and address,
  // and the signed-in member as "Prepared by". The section order / state stays null = the default (lib/quotes/sections.ts).
  const [me] = await db.select({ id: members.id }).from(members).where(eq(members.isYou, true))
  const id = randomUUID(); const now = new Date()
  // Project Ref # and Quote Valid Until are records from the start (REG-403 / lib/quotes/refs.ts): the property's family, the
  // day and its sequence; 30 days of validity. The description clamps to two lines by default (1260:31372).
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const [today] = await db.select({ n: sql<number>`count(*)` }).from(quotes).where(sql`${quotes.createdAt} >= ${Math.floor(dayStart.getTime() / 1000)}`)
  await db.insert(quotes).values({
    id, leadId, number: await nextNumber(), title: lead.name, amountMinor: 0, visibility: 'Private', status: 'Draft', createdAt: now, updatedAt: now,
    preparedBy: me?.id ?? null, propertyType: lead.propertyType, siteAddress: lead.propertyAddress ?? null, templateId,
    validUntil: validUntil(now), projectRef: projectRef(lead.propertyType, now, (today?.n ?? 0) + 1), itemsDensity: DEFAULT_DENSITY,
  })
  if (templateId) await db.update(quoteTemplates).set({ lastUsedAt: now }).where(eq(quoteTemplates.id, templateId))
  // (REG-418) Every quote starts on the studio's default split — the toolbar reads "Default: 10/30/30/30" from the first
  // open — with the deposit on approval and the rest estimated from the lead's start date and the property's renovation length.
  const rows = presetRows('default', scheduleAnchors({ estimatedStart: lead.estimatedStartDate, quoteCreated: now, propertyType: lead.propertyType }))
  await db.insert(quotePayments).values(rows.map((r, position) => ({ id: randomUUID(), quoteId: id, position, name: r.name, description: r.description, pct: r.pct, dueKind: r.dueKind, dueAt: r.dueAt, createdAt: now, updatedAt: now })))
  touch(leadId); return id
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
  const now = new Date()
  const patch: Partial<typeof quotes.$inferInsert> = { status, updatedAt: now }
  if ((status === 'Sent for Approval' || status === 'Sent to Client') && !q.sentAt) patch.sentAt = now
  if (status === 'Approved' && !q.approvedAt) patch.approvedAt = now
  await db.update(quotes).set(patch).where(eq(quotes.id, quoteId))
  touch(q.leadId)
}

/** Due cell (calendar_add_on 24 → the Material picker, REG-119). */
export async function setQuoteDue(quoteId: string, dueAt: Date | null): Promise<void> {
  const leadId = await leadOf(quoteId); if (!leadId) return
  await db.update(quotes).set({ dueAt, updatedAt: new Date() }).where(eq(quotes.id, quoteId))
  touch(leadId)
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
