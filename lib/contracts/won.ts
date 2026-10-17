import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, leadFiles, leads, quotes } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { phoneDigits } from '@/lib/format'
import { signQuoteThrough } from '@/lib/quotes/sign'
import { signedSnapshot } from './queries'
import { actingMember, afterSigned } from './automation'
import { newSignToken } from './link-server'
import { keepContractPdf } from './files'
import type { PickedPdf } from './pdf'

/**
 * (REG-632, contracts parity Q-14) The Won step's "Upload" — a contract the client signed on paper — becomes a Signed contract on the
 * lead, named by its file, like 1.0's paper contract (A-18): the Contracts tab lists it, the Won step's own list offers it, and the quote
 * the step names is signed through it (REG-626). Once per file: saving the step again, or editing it, adds nothing.
 */
export async function recordWonUpload(leadId: string, payload: unknown, at: Date, picked: PickedPdf | null = null): Promise<string | null> {
  const p = (payload && typeof payload === 'object' ? payload : {}) as { wonContractTab?: string; wonContractUploaded?: string | null; wonQuoteTab?: string; wonQuote?: string | null }
  if (p.wonContractTab !== 'upload' || !p.wonContractUploaded) return null
  const file = String(p.wonContractUploaded).replace(/[\x00-\x1f]/g, '').trim().slice(0, 160)
  if (!file) return null
  const [lead] = await db.select({ id: leads.id, name: leads.name, phone: leads.phone }).from(leads).where(eq(leads.id, leadId))
  if (!lead) return null
  const [existing] = await db.select({ id: contracts.id, fileId: contracts.fileId }).from(contracts).where(and(eq(contracts.leadId, leadId), eq(contracts.source, 'uploaded'), eq(contracts.fileName, file), isNull(contracts.deletedAt)))
  /* (pending modules S03) the picked PDF itself, kept in Files › Contract & VOs — once; an older row made with the name alone takes it now */
  const keep = async () => { if (!picked) return null; const k = await keepContractPdf(db, leadId, { ...picked, name: file }, at); return typeof k === 'string' ? k : null }
  if (existing) { if (!existing.fileId) { const fileId = await keep(); if (fileId) await db.update(contracts).set({ fileId }).where(eq(contracts.id, existing.id)) } return existing.id }
  const fileId = await keep()
  /* The quote the step names (by its title, a signed one first) — the contract reads it and signs it through. */
  const qs = p.wonQuoteTab === 'system' && p.wonQuote ? await db.select({ id: quotes.id, status: quotes.status, issuingEntity: quotes.issuingEntity }).from(quotes).where(and(eq(quotes.leadId, leadId), eq(quotes.title, p.wonQuote), isNull(quotes.deletedAt))).orderBy(asc(quotes.createdAt)) : []
  const quote = qs.find((q) => q.status === 'Signed') ?? qs[0] ?? null
  const id = randomUUID()
  await db.insert(contracts).values({
    id, leadId, title: file.replace(/\.pdf$/i, ''), status: 'Signed', createdAt: at, updatedAt: at, sentAt: at, signedAt: at, signedCopy: file, fileName: file, source: 'uploaded',
    recipientName: lead.name, recipientPhone: phoneDigits(lead.phone).slice(-8), contractDate: at, fromQuoteId: quote?.id ?? null, issuingEntity: quote?.issuingEntity ?? null, createdBy: await sessionMemberId(),
    markedBy: await actingMember(),   // (REG-634) a paper signature the studio recorded
    signToken: newSignToken(), fileId,   // (pending modules S03) its link's key; the PDF kept
  })
  const [c] = await db.select().from(contracts).where(eq(contracts.id, id))
  if (c) { await db.update(contracts).set(await signedSnapshot(c, at)).where(eq(contracts.id, id)); await signQuoteThrough(c, at); await afterSigned(c, at) }
  return id
}

/**
 * (pending modules S03) The Won step's picked PDF rides inside the move's payload (`wonContractFile`, one object — F205) and is lifted out here
 * before the payload is kept: the stage log keeps the file's name, never its bytes.
 * (pending modules S05 — the card's "Move stage Quote Sent / Won upload keeps only the file's name") so do the quotes the two steps upload:
 * the Quote Sent step's (`quoteFile`) and the Won step's signed quote (`wonQuoteFile`).
 */
const pickedOf = (v: unknown): PickedPdf | null => {
  const f = v && typeof v === 'object' ? v as Partial<PickedPdf> : null
  return f && typeof f.data === 'string' && typeof f.name === 'string' ? { name: f.name, data: f.data, thumb: typeof f.thumb === 'string' ? f.thumb : null } : null
}
export function splitStageFiles(payload: unknown): { payload: unknown; file: PickedPdf | null; quoteFile: PickedPdf | null; wonQuoteFile: PickedPdf | null } {
  if (!payload || typeof payload !== 'object') return { payload, file: null, quoteFile: null, wonQuoteFile: null }
  const { wonContractFile, quoteFile, wonQuoteFile, ...rest } = payload as Record<string, unknown> & { wonContractFile?: unknown; quoteFile?: unknown; wonQuoteFile?: unknown }
  return { payload: rest, file: pickedOf(wonContractFile), quoteFile: pickedOf(quoteFile), wonQuoteFile: pickedOf(wonQuoteFile) }
}
export const splitWonFile = (payload: unknown): { payload: unknown; file: PickedPdf | null } => { const s = splitStageFiles(payload); return { payload: s.payload, file: s.file } }

/**
 * (pending modules S05) The Quote Sent step's uploaded quote, kept with its bytes in Files › Quotes & BOQ — once per name there: saving the step
 * again, or editing it, adds nothing. The stage log keeps its name, as before.
 */
export async function keepQuoteSentUpload(leadId: string, payload: unknown, picked: PickedPdf | null, at: Date): Promise<string | null> {
  const p = (payload && typeof payload === 'object' ? payload : {}) as { quoteTab?: string; quoteUploaded?: string | null }
  if (p.quoteTab !== 'upload' || !p.quoteUploaded || !picked) return null
  const { keepPdfIn, quoteFolderOf } = await import('./files')
  const { pdfNameOf } = await import('./pdf')
  const name = pdfNameOf(String(p.quoteUploaded))
  const folder = await quoteFolderOf(db, leadId, at)
  const [have] = await db.select({ id: leadFiles.id }).from(leadFiles).where(and(eq(leadFiles.leadId, leadId), eq(leadFiles.parentId, folder), eq(leadFiles.name, name), isNull(leadFiles.deletedAt))).limit(1)
  if (have) return have.id
  const k = await keepPdfIn(db, leadId, picked, at, folder, name)
  return typeof k === 'string' ? k : null
}
