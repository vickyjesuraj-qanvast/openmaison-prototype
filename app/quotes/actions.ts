'use server'

import { randomUUID } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members, quoteItems, quotePayments, quoteVersions, quotes } from '@/lib/db/schema'
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
  /** (REG-588) The second client; '' clears. */
  client2Name?: string
  client2Nric?: string
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
  if (patch.client2Name !== undefined) set.client2Name = clean(patch.client2Name, 120)?.trim() || null   // (REG-588)
  if (patch.client2Nric !== undefined) set.client2Nric = clean(patch.client2Nric, 20)?.trim() || null
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

/**
 * (REG-565) ⋯ › Revise: the quote as it stands — its fields, lines and payment rows — is kept whole as version n in
 * `quote_versions`, and the quote row moves on as version n + 1: a Draft again under the same number, its sent / approved
 * stamps cleared, its lines untouched. The kept version opens read-only from Version History (the preview at `?version=n`).
 * A Draft that was never sent has nothing to keep, so Revise refuses it.
 */
export async function reviseQuote(quoteId: string, note?: string): Promise<{ version: number; updatedAt: number }> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  if (q.status === 'Draft' && !q.sentAt) throw new Error('a draft is not revised — it is edited')
  const [items, payments, me] = await Promise.all([
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(asc(quoteItems.position), asc(quoteItems.createdAt)),
    db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(asc(quotePayments.position), asc(quotePayments.createdAt)),
    db.select({ id: members.id }).from(members).where(eq(members.isYou, true)),
  ])
  const now = new Date()
  await db.insert(quoteVersions).values({ id: randomUUID(), quoteId, version: q.version, snapshotJson: JSON.stringify({ quote: q, items, payments }), note: clean(note, 200) ?? null, createdBy: me[0]?.id ?? null, createdAt: now })
  await db.update(quotes).set({ version: q.version + 1, status: 'Draft', sentAt: null, approvedAt: null, revisedAt: now, updatedAt: now }).where(eq(quotes.id, quoteId))
  touch(q.leadId, quoteId); revalidatePath(`/quotes/${quoteId}/preview`)
  return { version: q.version + 1, updatedAt: now.getTime() }
}

/**
 * (REG-587) Send for confirmation: the quote goes to the client with its confirmation link — no signature yet. From a Draft the
 * studio need not approve, or from Approved; with approval required a Draft goes for approval first (`sendQuote`). Sending again
 * from Sent to Client is allowed (a second nudge with the same link).
 */
export async function sendQuoteForConfirmation(quoteId: string): Promise<{ status: QuoteStatus; sentAt: number; updatedAt: number }> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  const approval = await fetchQuoteApproval()
  const current = q.status as QuoteStatus
  if (!(current === 'Approved' || current === 'Sent to Client' || (current === 'Draft' && approval !== 'required'))) throw new Error('not ready for the client')
  const now = new Date()
  const sentAt = q.sentAt ?? now
  await db.update(quotes).set({ status: 'Sent to Client', sentAt, updatedAt: now }).where(eq(quotes.id, quoteId))
  touch(q.leadId, quoteId); revalidatePath(`/confirm/${quoteId}`)
  return { status: 'Sent to Client', sentAt: sentAt.getTime(), updatedAt: now.getTime() }
}

/** (REG-587) The client's Confirm on the link: the quote becomes Confirmed with the name typed; one already confirmed or signed is left as it is. */
export async function confirmQuoteOnline(quoteId: string, name: string): Promise<{ confirmedAt: number; by: string }> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  if (q.status === 'Confirmed' || q.status === 'Signed') return { confirmedAt: (q.confirmedAt ?? new Date()).getTime(), by: q.confirmedBy ?? name }
  const who = (clean(name, 80) ?? '').trim()
  if (!who) throw new Error('name')
  const now = new Date()
  await db.update(quotes).set({ status: 'Confirmed', confirmedAt: now, confirmedBy: who, sentAt: q.sentAt ?? now, updatedAt: now }).where(eq(quotes.id, quoteId))
  touch(q.leadId, quoteId); revalidatePath(`/confirm/${quoteId}`)
  return { confirmedAt: now.getTime(), by: who }
}
