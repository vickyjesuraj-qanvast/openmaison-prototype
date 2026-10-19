import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/lib/db'
import { creditNotes, fileComments, leadFileImages, leadFiles, leads, members, noteAttachments, projectInvoices, projectPayments, projectSelections, projectUpdateFiles, projectUpdates, projects, returnAttachments, taskAttachments, type FileComment, type Member } from '@/lib/db/schema'
import { withYou } from '@/lib/db/session'   // (pending modules S43A) "you" = this request's member
import { systemFolderReason, type FileRow } from './file-model'
import { renderOrigins, type RenderOrigin } from '@/lib/visualizer/queries'
import { fileSharePath } from './file-share'
import { hiddenMoneyFiles } from '@/lib/projects/money-visibility'
import { rawAddress } from './file-store'
import { canOpenLead, fetchViewer } from './visibility'
import { isAccounting, opensWorkspace } from '@/lib/settings/roles'
import { contractsKeeping } from '@/lib/contracts/files'   // (S46D — D2)

/* Lead Details › Files (931-39056) — loaders for the tab and the viewer. */

export type LeadFilesData = {
  /** Every untrashed file and folder of the lead (all levels — the client groups by parentId). */
  files: FileRow[]
  /** Trashed items (Deleted Files, 931:40208) with the folder they came from resolved by the client via `parentId`. */
  trashed: FileRow[]
  team: Member[]
  now: number
  /** (audit 2026-09-26, F095 · F113) Renders filed from the AI Visualizer, by file id: the design, room and version each one is — Files offers
      "Open this version" (`live`) and Information says where it came from. A file not listed here is an upload. */
  renders: Record<string, RenderOrigin>
  /** (UX audit 2026-09-30, T9) Who a shared file goes to — Send on WhatsApp drafts to the lead's number. */
  lead: { name: string; phone: string | null }
  /** (fix-C, C-25) Files a PUBLISHED update carries, by id → the update's title: the client sees them there, so Delete says so first. */
  onUpdates: Record<string, string>
  /** (pending modules S06) the viewer reads these files only — Accounting: open and download, nothing to change (app/leads/files-actions.ts) */
  readOnly: boolean
  /** (S45C) the viewer opens the studio's tools — a picture's Open in AI Visualizer and a floor plan's Make a 3D picture are offered only then
      (Marketing and Accounting open neither; their actions refuse them) */
  tools: boolean
  /** (S46D — D2) the viewer may send one of these PDFs for signature (Files › ⋮ › Send for signature → Import a contract): the contract editors'
      rule — never Marketing (lib/quotes/desk.ts), never Accounting (Files read-only) */
  signs: boolean
  /** (S46D — D2) the live contract that keeps a file (its PDF or its signed copy), by file id → the contract's title: its row says so instead */
  contracts: Record<string, string>
}
/** (fix-C, C-25) The lead's files on a published update (the client reads them on the portal) → that update's title. */
async function publishedUpdateUses(leadId: string): Promise<Record<string, string>> {
  const rows = await db.select({ fileId: projectUpdateFiles.fileId, title: projectUpdates.title }).from(projectUpdateFiles)
    .innerJoin(projectUpdates, eq(projectUpdates.id, projectUpdateFiles.updateId)).innerJoin(projects, eq(projects.id, projectUpdates.projectId))
    .where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt), eq(projectUpdates.status, 'published'), isNull(projectUpdates.deletedAt)))
  return Object.fromEntries(rows.map((r) => [r.fileId, r.title]))
}
const byFile = (list: RenderOrigin[]) => Object.fromEntries(list.map((r) => [r.fileId, r])) as Record<string, RenderOrigin>

async function loadRows(leadId: string): Promise<{ rows: FileRow[]; team: Member[] }> {
  const [every, team, hidden] = await Promise.all([
    db.select().from(leadFiles).where(eq(leadFiles.leadId, leadId)).orderBy(asc(leadFiles.createdAt)),
    db.select().from(members).then(withYou),
    hiddenMoneyFiles(leadId),   // (fix-D, D-04 · F-17) Files › Payments — the client's bank proof and the receipts — is for whoever sees the project's money
  ])
  const all = hidden.size ? every.filter((f) => !hidden.has(f.id)) : every
  const ids = all.map((f) => f.id)
  // All three relations that point at lead_files, not tasks alone: a file held only by a note or by a lead return read
  // "--" here while the Notes tab / return details modal listed it as their attachment (Files shipped before both).
  const [comments, taskLinks, noteLinks, returnLinks, kept, papers] = ids.length
    ? await Promise.all([
        db.select({ fileId: fileComments.fileId }).from(fileComments).where(inArray(fileComments.fileId, ids)),
        db.select({ fileId: taskAttachments.fileId }).from(taskAttachments).where(inArray(taskAttachments.fileId, ids)),
        db.select({ fileId: noteAttachments.fileId }).from(noteAttachments).where(inArray(noteAttachments.fileId, ids)),
        db.select({ fileId: returnAttachments.fileId }).from(returnAttachments).where(inArray(returnAttachments.fileId, ids)),
        db.select({ fileId: leadFileImages.fileId }).from(leadFileImages).where(inArray(leadFileImages.fileId, ids)),   // (gaps build E, item 1) ids only, never the bytes
        moneyPapersOf(ids),   // (pending modules S07) the money papers' entries — their pages
      ])
    : [[], [], [], [], [], new Map<string, string>()]
  const withBytes = new Set(kept.map((k) => k.fileId))
  const byMember = new Map(team.map((m) => [m.id, m]))
  const commentCount = new Map<string, number>()
  for (const c of comments) commentCount.set(c.fileId, (commentCount.get(c.fileId) ?? 0) + 1)
  const onTask = new Set(taskLinks.map((a) => a.fileId))
  const onNote = new Set(noteLinks.map((a) => a.fileId))
  const onReturn = new Set(returnLinks.map((a) => a.fileId))
  // One Tag per row (931:40181), Task first — a file on both a task and a note still reads "Task".
  const attachedTo = (id: string): FileRow['attachedTo'] =>
    onTask.has(id) ? 'Task' : onNote.has(id) ? 'Note' : onReturn.has(id) ? 'Return' : null
  /* (fix-A, A-19) a project's own folders keep their name and place */
  const hasProject = !!(await db.select({ id: projects.id }).from(projects).where(eq(projects.leadId, leadId)).limit(1))[0]
  const rows: FileRow[] = all.map((f) => ({
    ...f,
    owner: f.ownerId ? byMember.get(f.ownerId) ?? null : null,
    commentCount: commentCount.get(f.id) ?? 0,
    attachedTo: attachedTo(f.id),
    itemCount: f.kind === 'folder' ? all.filter((c) => c.parentId === f.id && !c.deletedAt).length : 0,
    share: f.kind === 'folder' || f.deletedAt ? null : fileSharePath(f.id),   // (T9) the client's read-only link
    system: systemFolderReason(f, hasProject),
    bytes: withBytes.has(f.id),   // (gaps build E, item 1)
    paper: papers.get(f.id) ?? null,   // (pending modules S07)
  }))
  return { rows, team }
}

/**
 * (pending modules S07 — the steps' note after S05: "Files' Download on invoice / receipt entries that have no stored copy") The money papers a
 * project files in Files — a sent invoice, a receipt, a credit note, a selection receipt — by their entry: the page that IS the document (its
 * PDF is that page, printed — `?print=1`). One read per kind, ids only.
 */
export async function moneyPapersOf(fileIds: string[]): Promise<Map<string, string>> {   // (S42 C-03) the file actions refuse these too
  const [invs, pays, cns, picks] = await Promise.all([
    db.select({ fileId: projectInvoices.fileId, projectId: projectInvoices.projectId, id: projectInvoices.id }).from(projectInvoices).where(inArray(projectInvoices.fileId, fileIds)),
    db.select({ fileId: projectPayments.receiptFileId, projectId: projectPayments.projectId, id: projectPayments.id }).from(projectPayments).where(inArray(projectPayments.receiptFileId, fileIds)),
    db.select({ fileId: creditNotes.fileId, projectId: creditNotes.projectId, id: creditNotes.id }).from(creditNotes).where(inArray(creditNotes.fileId, fileIds)),
    db.select({ fileId: projectSelections.receiptFileId, projectId: projectSelections.projectId, id: projectSelections.id }).from(projectSelections).where(inArray(projectSelections.receiptFileId, fileIds)),
  ])
  const out = new Map<string, string>()
  for (const [rows, kind] of [[invs, 'invoices'], [pays, 'receipts'], [cns, 'credit-notes'], [picks, 'selection-receipts']] as const) {
    for (const r of rows) if (r.fileId && !out.has(r.fileId)) out.set(r.fileId, `/projects/${r.projectId}/${kind}/${r.id}`)
  }
  return out
}

export async function fetchLeadFiles(leadId: string): Promise<LeadFilesData> {
  const [{ rows, team }, [lead]] = await Promise.all([loadRows(leadId), db.select({ name: leads.name, phone: leads.phone }).from(leads).where(eq(leads.id, leadId))])
  const renders = byFile(await renderOrigins(rows.filter((f) => f.kind === 'image').map((f) => f.id)))
  const role = (await fetchViewer()).role
  return { files: rows.filter((f) => !f.deletedAt), trashed: rows.filter((f) => !!f.deletedAt), team, now: Date.now(), renders, lead: { name: lead?.name ?? '', phone: lead?.phone ?? null }, onUpdates: await publishedUpdateUses(leadId),
    readOnly: isAccounting(role), tools: opensWorkspace(role), signs: opensWorkspace(role), contracts: await contractTitles(rows.filter((f) => !f.deletedAt && f.kind !== 'folder').map((f) => f.id)) }
}

/** (S46D — D2) The live contracts keeping these files, by file id → the contract's title (the first that keeps it). */
async function contractTitles(fileIds: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const k of await contractsKeeping(fileIds)) out[k.fileId] ??= k.title
  return out
}

export type FileViewData = {
  /** (T9) the lead's number — Send on WhatsApp drafts to it */
  lead: { id: string; name: string; phone: string | null }
  file: FileRow
  /** The folder the file sits in (null at the root) — Information › Location and the back link. */
  folder: FileRow | null
  /** Untrashed non-folder siblings in display order (creation order) — prev / next arrows, ← / →, and (gaps build E, item 3) the strip of
      thumbnails under the file: each one's picture (or its glyph's kind). */
  siblings: { id: string; name: string; thumb: string | null; kind: string; mime: string | null }[]
  /** Every untrashed file and folder of the lead — the viewer's Move dialog browses them (same set as `LeadFilesData.files`). */
  files: FileRow[]
  comments: (FileComment & { author: Member | null })[]
  team: Member[]
  me: Member
  now: number
  /** (F095 · F113) The file's AI Visualizer origin when it is a filed render — its menu opens that version, Information names it. */
  render: RenderOrigin | null
  /** The same for its siblings in the folder — the Files grid's menus. */
  renders: Record<string, RenderOrigin>
  /** (fix-C, C-05) A video's, a PDF's or an Office file's own bytes, kept when it was uploaded: the address it plays or opens from — (gaps build
      E, item 1) /files/raw/<id> for every lead's file (Who sees leads checked there); null when nothing was kept (a stand-in picture). */
  bytes: string | null
  /** (fix-C, C-25) The published update that carries this file, if any — Delete says the client sees it there. */
  onUpdate: string | null
  /** (pending modules S06) the viewer reads it only (Accounting) — the viewer offers Download and the comments to read */
  readOnly: boolean
  /** (S45C) as `LeadFilesData.tools` */
  tools: boolean
  /** (S46D — D2) as `LeadFilesData.signs` */
  signs: boolean
  /** (S46D — D2) the live contract that keeps this file, by its title — else null */
  contract: string | null
}

async function fetchFileViewUncached(leadId: string, fileId: string): Promise<FileViewData | null> {
  const [lead] = await db.select({ id: leads.id, name: leads.name, phone: leads.phone }).from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt)))
  if (!lead) return null
  if (!(await canOpenLead(await fetchViewer(), leadId))) return null   // (gaps build E, item 2) Who sees leads: not this member's lead, not their file
  const { rows, team } = await loadRows(leadId)
  const file = rows.find((f) => f.id === fileId && !f.deletedAt && f.kind !== 'folder')
  if (!file) return null
  const folder = file.parentId ? rows.find((f) => f.id === file.parentId) ?? null : null
  const siblings = rows.filter((f) => !f.deletedAt && f.kind !== 'folder' && (f.parentId ?? null) === (file.parentId ?? null)).map((f) => ({ id: f.id, name: f.name, thumb: f.thumb, kind: f.kind, mime: f.mime }))
  const cs = await db.select().from(fileComments).where(eq(fileComments.fileId, fileId)).orderBy(asc(fileComments.createdAt))
  const byMember = new Map(team.map((m) => [m.id, m]))
  const me = team.find((m) => m.isYou) ?? team[0]!
  const renders = byFile(await renderOrigins(rows.filter((f) => f.kind === 'image' && !f.deletedAt).map((f) => f.id)))
  /* (fix-C, C-05 → gaps build E, item 1) the kept bytes of any file — /files/raw/<id> plays (ranges), opens and downloads them, for every lead */
  const bytes = file.bytes ? rawAddress(file.id) : null
  return { lead, file, folder, siblings, files: rows.filter((f) => !f.deletedAt), comments: cs.map((c) => ({ ...c, author: byMember.get(c.authorId) ?? null })), team, me, now: Date.now(), render: renders[file.id] ?? null, renders, bytes, onUpdate: (await publishedUpdateUses(leadId))[file.id] ?? null,
    readOnly: isAccounting((await fetchViewer()).role), tools: opensWorkspace((await fetchViewer()).role), signs: opensWorkspace((await fetchViewer()).role), contract: (await contractTitles([file.id]))[file.id] ?? null }
}

/** Per-request memo (audit 2026-08-30): `generateMetadata` and the page both call this, which ran every query twice. */
export const fetchFileView = cache(fetchFileViewUncached)
