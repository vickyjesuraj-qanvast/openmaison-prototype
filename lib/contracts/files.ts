import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, eq, inArray, isNull, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, leadFiles } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { CONTRACT_FOLDERS, QUOTE_FOLDERS } from '@/lib/leads/file-model'
import { DATA_URL, PICTURE_URL, dataUrlSize, keepBytes, keepThumb, thumbAddress } from '@/lib/leads/file-store'
import { checkPickedPdf, pdfNameOf, type PickedPdf } from './pdf'

/*
 * (pending modules S03 — the card's "Import from File, Mark as signed and the Won upload keep only a name, not the PDF"; 1.0 filed the
 * studio's paper contract in the lead's files, contract-flow-dialog's `uploadLeadFile`) A contract's PDF is a file of its lead's, in Files ›
 * Contract & VOs (the project's own starter folder, made when it is missing — an older "Contract" folder stands for it), its bytes kept the
 * way every upload's are (lib/leads/file-store.ts). The contract points at it: `contracts.file_id` (an imported or uploaded contract's PDF,
 * a standard document from the library) and `contracts.signed_file_id` (the signed copy attached on Mark as signed). One file, one home:
 * Files shows it, the contract opens it, the client reads it through the signing link's own address.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type W = typeof db | Tx

/* (pending modules S43A) Who keeps a file or makes a folder: through `db` the signed-in member is read here; through a transaction the caller
   passes `by`, read before it opened — the second signature of each can't leave it out. */

/** The lead's contract folder — Files › Contract & VOs — made at the root when the lead has none. */
export async function contractFolderOf(w: typeof db, leadId: string, at: Date, by?: string): Promise<string>
export async function contractFolderOf(w: W, leadId: string, at: Date, by: string): Promise<string>
export async function contractFolderOf(w: W, leadId: string, at: Date, by?: string): Promise<string> {
  const found = await w.select({ id: leadFiles.id, name: leadFiles.name }).from(leadFiles)
    .where(and(eq(leadFiles.leadId, leadId), eq(leadFiles.kind, 'folder'), inArray(leadFiles.name, [...CONTRACT_FOLDERS]), isNull(leadFiles.parentId), isNull(leadFiles.deletedAt)))
  const pick = CONTRACT_FOLDERS.map((n) => found.find((f) => f.name === n)).find(Boolean)
  if (pick) return pick.id
  const id = randomUUID()
  await w.insert(leadFiles).values({ id, leadId, kind: 'folder', name: CONTRACT_FOLDERS[0], thumb: null, createdAt: at, parentId: null, ownerId: by ?? await sessionMemberId(), updatedAt: at })
  return id
}

/** Keep a picked PDF as a file of the lead's in its contract folder; answers the file's id, or the rule that refused it. */
export async function keepContractPdf(w: typeof db, leadId: string, f: PickedPdf, at: Date, by?: string): Promise<string | { error: string }>
export async function keepContractPdf(w: W, leadId: string, f: PickedPdf, at: Date, by: string): Promise<string | { error: string }>
export async function keepContractPdf(w: W, leadId: string, f: PickedPdf, at: Date, by?: string): Promise<string | { error: string }> {
  const problem = checkPickedPdf(f, dataUrlSize); if (problem) return { error: problem }
  const owner = by ?? await sessionMemberId()
  return keepPdfIn(w, leadId, f, at, await contractFolderOf(w, leadId, at, owner), undefined, owner)
}

/** (pending modules S05) A checked PDF kept as a file of the lead's in `parentId` (null = the top of Files), under `name` (else its own):
    its bytes and the picture of its first page, the way every upload keeps them. Answers the file's id, or the rule that refused it. */
export async function keepPdfIn(w: typeof db, leadId: string, f: PickedPdf, at: Date, parentId: string | null, name?: string, by?: string): Promise<string | { error: string }>
export async function keepPdfIn(w: W, leadId: string, f: PickedPdf, at: Date, parentId: string | null, name: string | undefined, by: string): Promise<string | { error: string }>
export async function keepPdfIn(w: W, leadId: string, f: PickedPdf, at: Date, parentId: string | null, name?: string, by?: string): Promise<string | { error: string }> {
  const problem = checkPickedPdf(f, dataUrlSize); if (problem) return { error: problem }
  const m = DATA_URL.exec(f.data)!
  const id = randomUUID()
  const thumb = typeof f.thumb === 'string' && PICTURE_URL.test(f.thumb) && f.thumb.length < 800_000 ? f.thumb : null
  await w.insert(leadFiles).values({ id, leadId, kind: 'pdf', name: name ?? pdfNameOf(f.name), thumb: thumb ? thumbAddress(id) : null, createdAt: at, parentId, ownerId: by ?? await sessionMemberId(), sizeBytes: dataUrlSize(f.data), mime: 'application/pdf', updatedAt: at })
  await keepBytes(w, id, `data:application/pdf;base64,${m[2]}`)
  if (thumb) await keepThumb(w, id, thumb)
  return id
}

/** (pending modules S05) The lead's quotes folder — Files › Quotes & BOQ (a starter folder; an older "Quotes" or "BOQ" stands for it) — made at
    the top of Files when the lead has none. */
export async function quoteFolderOf(w: typeof db, leadId: string, at: Date, by?: string): Promise<string>
export async function quoteFolderOf(w: W, leadId: string, at: Date, by: string): Promise<string>
export async function quoteFolderOf(w: W, leadId: string, at: Date, by?: string): Promise<string> {
  const found = await w.select({ id: leadFiles.id, name: leadFiles.name }).from(leadFiles)
    .where(and(eq(leadFiles.leadId, leadId), eq(leadFiles.kind, 'folder'), inArray(leadFiles.name, [...QUOTE_FOLDERS]), isNull(leadFiles.parentId), isNull(leadFiles.deletedAt)))
  const pick = QUOTE_FOLDERS.map((n) => found.find((f) => f.name === n)).find(Boolean)
  if (pick) return pick.id
  const id = randomUUID()
  await w.insert(leadFiles).values({ id, leadId, kind: 'folder', name: QUOTE_FOLDERS[0], thumb: null, createdAt: at, parentId: null, ownerId: by ?? await sessionMemberId(), updatedAt: at })
  return id
}

export { signedFileOf } from './pdf'

/** The live contracts that keep any of these files — Files' trash says so instead of taking a contract's PDF away. */
export async function contractsKeeping(fileIds: string[]): Promise<{ fileId: string; title: string; signed: boolean }[]> {
  if (!fileIds.length) return []
  const rows = await db.select({ title: contracts.title, fileId: contracts.fileId, signedFileId: contracts.signedFileId, status: contracts.status }).from(contracts)
    .where(and(isNull(contracts.deletedAt), or(inArray(contracts.fileId, fileIds), inArray(contracts.signedFileId, fileIds))))
  const out: { fileId: string; title: string; signed: boolean }[] = []
  for (const r of rows) {
    if (r.signedFileId && fileIds.includes(r.signedFileId)) out.push({ fileId: r.signedFileId, title: r.title, signed: true })
    if (r.fileId && fileIds.includes(r.fileId)) out.push({ fileId: r.fileId, title: r.title, signed: r.status === 'Signed' })
  }
  return out
}
