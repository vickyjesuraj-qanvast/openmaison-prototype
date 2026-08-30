'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, quotes } from '@/lib/db/schema'
import { type QuoteStatus } from '@/lib/leads/quote-filters'

/* Lead Details › Quotes (910-36240). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

const touch = (leadId: string) => { revalidatePath(`/leads/${leadId}`); revalidatePath(`/leads/${leadId}/quotes`); revalidatePath('/leads') }

/** Next quote number: "OM-" + (highest existing + 1); the seed starts at OM-10001 (910:36324). */
async function nextNumber(): Promise<string> {
  const [row] = await db.select({ max: sql<number | null>`max(cast(substr(${quotes.number}, 4) as integer))` }).from(quotes)
  return `OM-${(row?.max ?? 10000) + 1}`
}

/**
 * New Quote › From Blank / empty state › From Scratch (REG: invented behaviour — the quote editor has no mock):
 * a Private Draft titled after the lead (910:36324 shows the lead's name as the row title), total S$0.
 */
export async function createQuote(leadId: string): Promise<string> {
  const [lead] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId))
  if (!lead) throw new Error('lead not found')
  const id = randomUUID(); const now = new Date()
  await db.insert(quotes).values({ id, leadId, number: await nextNumber(), title: lead.name, amountMinor: 0, visibility: 'Private', status: 'Draft', createdAt: now, updatedAt: now })
  touch(leadId); return id
}

async function leadOf(quoteId: string): Promise<string | null> {
  const [q] = await db.select({ leadId: quotes.leadId }).from(quotes).where(eq(quotes.id, quoteId))
  return q?.leadId ?? null
}

/** Status cell menu (910:36673). First move out of Draft stamps Sent; Approved / Signed stamp the approval date. */
export async function setQuoteStatus(quoteId: string, status: QuoteStatus): Promise<void> {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId))
  if (!q) return
  const now = new Date()
  const patch: Partial<typeof quotes.$inferInsert> = { status, updatedAt: now }
  if ((status === 'Sent for Approval' || status === 'Sent to Client') && !q.sentAt) patch.sentAt = now
  if ((status === 'Approved' || status === 'Signed') && !q.approvedAt) patch.approvedAt = now
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

/** Row kebab › Delete / bulk Delete — soft, so "Deleted Quotes" (header kebab) can list them later. */
export async function deleteQuotes(quoteIds: string[]): Promise<void> {
  if (!quoteIds.length) return
  const leadId = await leadOf(quoteIds[0]!); if (!leadId) return
  await db.update(quotes).set({ deletedAt: new Date() }).where(inArray(quotes.id, quoteIds))
  touch(leadId)
}
