'use server'

import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, quoteFiles, quotes, type LeadFile } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { revalidateLead } from '@/lib/leads/queries'
import { stampQuote } from '@/lib/quotes/stamp'
import { deskRefusal, keepOffDesk, offDesk } from '@/lib/quotes/desk'   // (S44Z) the editors' role rule on the server
import type { Refusal } from '@/lib/company/template-rules'

/* Files section (1238:32938, REG-419). A quote's files are the lead's files it points at — attaching never copies, and an
   upload from the section is a new lead file (it shows in the lead's Files tab too, owner 2026-09-11). */

async function quoteOf(quoteId: string) {
  await keepOffDesk()   // (S44Z) the role first — nothing is read for Marketing
  const [q] = await db.select({ id: quotes.id, leadId: quotes.leadId }).from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error('quote not found')
  return q
}
/** The attached files in the order they were attached — never a folder, never a trashed file. */
async function attached(quoteId: string): Promise<LeadFile[]> {
  const rows = await db.select({ file: leadFiles, at: quoteFiles.createdAt }).from(quoteFiles).innerJoin(leadFiles, eq(leadFiles.id, quoteFiles.fileId))
    .where(and(eq(quoteFiles.quoteId, quoteId), isNull(leadFiles.deletedAt))).orderBy(asc(quoteFiles.createdAt))
  return rows.map((r) => r.file)
}

export async function listQuoteFiles(quoteId: string): Promise<LeadFile[]> {
  if (await offDesk()) return []   // (S44Z) the editors' role rule: a read answers nothing
  return attached(quoteId)
}

/** The Attach files modal's answer: the whole set at once (new links added, unticked ones removed). Public endpoint: every id must be one of THIS lead's files. */
export async function setQuoteFiles(quoteId: string, fileIds: string[]): Promise<{ updatedAt: number; files: LeadFile[] } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the quote is read
  const q = await quoteOf(quoteId)
  const ids = [...new Set(fileIds.filter((id) => typeof id === 'string' && id.length <= 64))].slice(0, 200)
  const valid = ids.length
    ? (await db.select({ id: leadFiles.id }).from(leadFiles).where(and(eq(leadFiles.leadId, q.leadId), inArray(leadFiles.id, ids), isNull(leadFiles.deletedAt)))).map((r) => r.id).filter((id) => id)
    : []
  const now = new Date()
  const current = (await db.select({ fileId: quoteFiles.fileId, createdAt: quoteFiles.createdAt }).from(quoteFiles).where(eq(quoteFiles.quoteId, quoteId)))
  const keep = new Map(current.map((c) => [c.fileId, c.createdAt]))
  await db.transaction(async (tx) => {
    await tx.delete(quoteFiles).where(eq(quoteFiles.quoteId, quoteId))
    if (valid.length) await tx.insert(quoteFiles).values(valid.map((fileId) => ({ quoteId, fileId, createdAt: keep.get(fileId) ?? now })))
  })
  const { updatedAt } = await stampQuote(quoteId)
  return { updatedAt, files: await attached(quoteId) }
}

/** A tile's Delete (and the snackbar's Undo puts it back through `attachQuoteFiles`): the link goes, the lead keeps the file. */
export async function detachQuoteFile(quoteId: string, fileId: string): Promise<{ updatedAt: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the quote is read
  await quoteOf(quoteId)
  await db.delete(quoteFiles).where(and(eq(quoteFiles.quoteId, quoteId), eq(quoteFiles.fileId, fileId)))
  return stampQuote(quoteId)
}

export async function attachQuoteFiles(quoteId: string, fileIds: string[]): Promise<{ updatedAt: number; files: LeadFile[] } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the quote is read
  const q = await quoteOf(quoteId)
  const ids = [...new Set(fileIds.filter((id) => typeof id === 'string' && id.length <= 64))].slice(0, 200)
  const have = new Set((await db.select({ fileId: quoteFiles.fileId }).from(quoteFiles).where(eq(quoteFiles.quoteId, quoteId))).map((r) => r.fileId))
  const valid = ids.length
    ? (await db.select({ id: leadFiles.id }).from(leadFiles).where(and(eq(leadFiles.leadId, q.leadId), inArray(leadFiles.id, ids), isNull(leadFiles.deletedAt)))).map((r) => r.id).filter((id) => !have.has(id))
    : []
  const now = new Date()
  if (valid.length) await db.insert(quoteFiles).values(valid.map((fileId) => ({ quoteId, fileId, createdAt: now })))
  const { updatedAt } = await stampQuote(quoteId)
  return { updatedAt, files: await attached(quoteId) }
}

/** A file dropped on the section (or picked in the modal's own dropzone): a new lead file — the mock's upload (REG-149) — attached at once. */
export async function uploadQuoteFile(quoteId: string, name = 'Living Room'): Promise<{ updatedAt: number; file: LeadFile; files: LeadFile[] } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the quote is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const q = await quoteOf(quoteId)
  const id = randomUUID(); const now = new Date()
  const clean = (typeof name === 'string' ? name : '').trim().slice(0, 120) || 'Living Room'
  const pdf = /\.pdf$/i.test(clean)
  await db.insert(leadFiles).values({ id, leadId: q.leadId, kind: pdf ? 'pdf' : 'image', name: clean, thumb: pdf ? null : '/figma-assets/file-thumb-1.png', createdAt: now, parentId: null, ownerId: stampBy, sizeBytes: 728064, mime: pdf ? 'application/pdf' : 'image/jpeg', updatedAt: now })
  await db.insert(quoteFiles).values({ quoteId, fileId: id, createdAt: now })
  revalidateLead(q.leadId)
  const { updatedAt } = await stampQuote(quoteId)
  const [file] = await db.select().from(leadFiles).where(eq(leadFiles.id, id))
  return { updatedAt, file: file!, files: await attached(quoteId) }
}

/** The section-top eye (1238:33044): whether the client's view carries the files. */
export async function setQuoteFilesVisible(quoteId: string, visible: boolean): Promise<{ updatedAt: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the quote is read
  await quoteOf(quoteId)
  await db.update(quotes).set({ filesVisible: !!visible }).where(eq(quotes.id, quoteId))
  return stampQuote(quoteId)
}
