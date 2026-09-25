import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, leads, quotes } from '@/lib/db/schema'
import { sessionMemberSql } from '@/lib/db/session'
import { phoneDigits } from '@/lib/format'
import { signQuoteThrough } from '@/lib/quotes/sign'
import { signedSnapshot } from './queries'
import { actingMember, afterSigned } from './automation'

/**
 * (REG-632, contracts parity Q-14) The Won step's "Upload" — a contract the client signed on paper — becomes a Signed contract on the
 * lead, named by its file, like 1.0's paper contract (A-18): the Contracts tab lists it, the Won step's own list offers it, and the quote
 * the step names is signed through it (REG-626). Once per file: saving the step again, or editing it, adds nothing.
 */
export async function recordWonUpload(leadId: string, payload: unknown, at: Date): Promise<string | null> {
  const p = (payload && typeof payload === 'object' ? payload : {}) as { wonContractTab?: string; wonContractUploaded?: string | null; wonQuoteTab?: string; wonQuote?: string | null }
  if (p.wonContractTab !== 'upload' || !p.wonContractUploaded) return null
  const file = String(p.wonContractUploaded).replace(/[\x00-\x1f]/g, '').trim().slice(0, 160)
  if (!file) return null
  const [lead] = await db.select({ id: leads.id, name: leads.name, phone: leads.phone }).from(leads).where(eq(leads.id, leadId))
  if (!lead) return null
  const [existing] = await db.select({ id: contracts.id }).from(contracts).where(and(eq(contracts.leadId, leadId), eq(contracts.source, 'uploaded'), eq(contracts.fileName, file), isNull(contracts.deletedAt)))
  if (existing) return existing.id
  /* The quote the step names (by its title, a signed one first) — the contract reads it and signs it through. */
  const qs = p.wonQuoteTab === 'system' && p.wonQuote ? await db.select({ id: quotes.id, status: quotes.status, issuingEntity: quotes.issuingEntity }).from(quotes).where(and(eq(quotes.leadId, leadId), eq(quotes.title, p.wonQuote), isNull(quotes.deletedAt))).orderBy(asc(quotes.createdAt)) : []
  const quote = qs.find((q) => q.status === 'Signed') ?? qs[0] ?? null
  const id = randomUUID()
  await db.insert(contracts).values({
    id, leadId, title: file.replace(/\.pdf$/i, ''), status: 'Signed', createdAt: at, updatedAt: at, sentAt: at, signedAt: at, signedCopy: file, fileName: file, source: 'uploaded',
    recipientName: lead.name, recipientPhone: phoneDigits(lead.phone).slice(-8), contractDate: at, fromQuoteId: quote?.id ?? null, issuingEntity: quote?.issuingEntity ?? null, createdBy: sessionMemberSql,
    markedBy: await actingMember(),   // (REG-634) a paper signature the studio recorded
  })
  const [c] = await db.select().from(contracts).where(eq(contracts.id, id))
  if (c) { await db.update(contracts).set(await signedSnapshot(c, at)).where(eq(contracts.id, id)); await signQuoteThrough(c, at); await afterSigned(c, at) }
  return id
}
