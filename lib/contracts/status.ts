import 'server-only'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractBundles, contracts, type Contract } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { signQuoteThrough } from '@/lib/quotes/sign'
import { unsignBlock } from './policy'
import { sendBlock } from './readiness'
import { signedSnapshot, UNSIGNED } from './queries'
import { logLeadEvent } from '@/lib/leads/events'
import { actingMember, afterSent, afterSigned, freshContract } from './automation'

/**
 * (REG-631, contracts parity Q-04 · Q-05) The one way a contract changes status by hand — the editor's pill and every list's status cell.
 * Draft and Sent to Client apply at once; leaving Signed is allowed only for a signature the studio marked, only for an Owner or an
 * Admin, and lets go of every signing stamp and the kept copy (the quote it signed stays Signed, REG-626). Signed from a list keeps the
 * copy as it stands, stamps today and signs the raised-from quote through. Throws the rule's words when refused.
 */
export async function applyContractStatus(c: Contract, status: 'Draft' | 'Sent to Client' | 'Signed'): Promise<void> {
  if (status === c.status) return
  const now = new Date()
  if (status === 'Signed') {
    const signedAt = c.signedAt ?? now
    await db.update(contracts).set({ status, sentAt: c.sentAt ?? now, signedAt, signedCopy: c.signedCopy ?? `${c.title}.pdf`, markedBy: await actingMember(), ...await signedSnapshot(c, signedAt), updatedAt: now }).where(eq(contracts.id, c.id))
    await signQuoteThrough(c, signedAt)   // (REG-626, parity Q-31)
    const fresh = await freshContract(c.id); if (fresh) await afterSigned(fresh, signedAt, { marked: true })   // (REG-634, Q-23 · Q-25)
    return
  }
  if (c.status === 'Signed') { const why = unsignBlock(c, await fetchViewer()); if (why) throw new Error(why) }
  if (status === 'Sent to Client' && c.status === 'Draft') { const why = sendBlock(c); if (why) throw new Error(why) }   // (sweep S2 #3) a list's status menu keeps Send's checks
  const set: Partial<typeof contracts.$inferInsert> = { status, updatedAt: now, ...(c.status === 'Signed' ? UNSIGNED : {}) }
  if (status === 'Sent to Client' && !c.sentAt) { set.sentAt = now; set.sentBy = await actingMember() }
  await db.update(contracts).set(set).where(eq(contracts.id, c.id))
  if (c.status === 'Signed') await logLeadEvent(db, c.leadId, 'contract_unsigned', { title: c.title, kind: status })   // (REG-634, E-128) the move back leaves a line
  if (status === 'Sent to Client' && !c.sentAt) { const fresh = await freshContract(c.id); if (fresh) await afterSent(fresh, now) }
}

/**
 * (REG-633, contracts parity Q-17) The client's first open of a link that is out for signature — 1.0's *viewed* (B-55), kept as a stamp:
 * the lists show "Viewed {date}", Activity says so, the signing record carries it. A bundle stamps itself and each document still to sign.
 */
export async function stampViewed(contractId: string): Promise<void> {
  await db.update(contracts).set({ viewedAt: new Date() }).where(and(eq(contracts.id, contractId), eq(contracts.status, 'Sent to Client'), isNull(contracts.viewedAt)))
}
export async function stampBundleViewed(bundleId: string): Promise<void> {
  const now = new Date()
  await db.update(contractBundles).set({ viewedAt: now }).where(and(eq(contractBundles.id, bundleId), isNull(contractBundles.viewedAt)))
  await db.update(contracts).set({ viewedAt: now }).where(and(eq(contracts.bundleId, bundleId), eq(contracts.status, 'Sent to Client'), isNull(contracts.viewedAt)))
}
