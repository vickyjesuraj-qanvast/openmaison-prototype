'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { quotes } from '@/lib/db/schema'
import { PROPERTY_TYPES } from '@/lib/leads/enums'
import { revalidateLead } from '@/lib/leads/queries'
import { quoteStatuses, type QuoteStatus } from '@/lib/leads/quote-filters'
import { parseSections, serializeSections, type QuoteSectionState } from '@/lib/quotes/sections'
import { fetchQuoteApproval } from '@/lib/settings/queries'

/* Quote editor (1271:40301). Autosave writes land here; the editor keeps its own state, so nothing here refreshes the
   route — the lead's pages are revalidated because the Quotes tab, the Overview card and Activity print these fields. */

const touch = (leadId: string, quoteId: string) => { revalidateLead(leadId); revalidatePath(`/quotes/${quoteId}`) }

async function load(quoteId: string) {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId))
  return q ?? null
}

const clean = (v: string | undefined, max = 200) => (v === undefined ? undefined : v.slice(0, max))

export type GeneralPatch = {
  title?: string
  preparedBy?: string | null
  /** Epoch ms, or null to clear. */
  validUntil?: number | null
  projectRef?: string
  nric?: string
  customerId?: string
  propertyType?: string
  siteAddress?: string
}

/** General Info (1271:39680) autosave. A public endpoint: every string is bounded and the property type must be one of ours. */
export async function saveQuoteGeneral(quoteId: string, patch: GeneralPatch): Promise<{ updatedAt: number }> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  const now = new Date()
  const set: Partial<typeof quotes.$inferInsert> = { updatedAt: now }
  const title = clean(patch.title)
  if (title !== undefined) set.title = title.trim() || q.title   // a quote always has a title: an emptied field keeps the last one
  if (patch.preparedBy !== undefined) set.preparedBy = patch.preparedBy
  if (patch.validUntil !== undefined) set.validUntil = patch.validUntil === null ? null : new Date(patch.validUntil)
  if (patch.projectRef !== undefined) set.projectRef = clean(patch.projectRef)
  if (patch.nric !== undefined) set.nric = clean(patch.nric, 20)
  if (patch.customerId !== undefined) set.customerId = clean(patch.customerId, 60)
  if (patch.propertyType !== undefined) {
    if (patch.propertyType !== '' && !(PROPERTY_TYPES as readonly string[]).includes(patch.propertyType)) throw new Error(`Unknown property type: ${patch.propertyType}`)
    set.propertyType = patch.propertyType || null
  }
  if (patch.siteAddress !== undefined) set.siteAddress = clean(patch.siteAddress, 300)
  await db.update(quotes).set(set).where(eq(quotes.id, quoteId))
  touch(q.leadId, quoteId)
  return { updatedAt: now.getTime() }
}

/** Section order + collapsed state (owner 2026-09-11) — stored per quote, validated through `parseSections`. */
export async function saveQuoteSections(quoteId: string, sections: QuoteSectionState[]): Promise<void> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  const safe = parseSections(JSON.stringify(sections))
  await db.update(quotes).set({ sections: serializeSections(safe) }).where(eq(quotes.id, quoteId))
  revalidatePath(`/quotes/${quoteId}`)
}

/**
 * Header › Send (1201:33817): the quote takes the next step of the studio's lifecycle (Settings › Leads › Quote approval —
 * Draft → Sent for Approval → Approved → Sent to Client → Signed, or Draft → Sent to Client → Signed). Only a Draft or an
 * Approved quote has somewhere to be sent; anything else is returned unchanged. The first send stamps Sent.
 */
export async function sendQuote(quoteId: string): Promise<{ status: QuoteStatus; sentAt: number | null; updatedAt: number }> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  const steps = quoteStatuses(await fetchQuoteApproval())
  const current = q.status as QuoteStatus
  const next: QuoteStatus | null = current === 'Draft' ? (steps[1] ?? null) : current === 'Approved' ? 'Sent to Client' : null
  if (!next) return { status: current, sentAt: q.sentAt?.getTime() ?? null, updatedAt: (q.updatedAt ?? q.createdAt).getTime() }
  const now = new Date()
  const set: Partial<typeof quotes.$inferInsert> = { status: next, updatedAt: now }
  if (!q.sentAt) set.sentAt = now
  await db.update(quotes).set(set).where(eq(quotes.id, quoteId))
  touch(q.leadId, quoteId)
  return { status: next, sentAt: (set.sentAt ?? q.sentAt ?? null)?.getTime() ?? null, updatedAt: now.getTime() }
}
