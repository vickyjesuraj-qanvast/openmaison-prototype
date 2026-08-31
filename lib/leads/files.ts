import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/lib/db'
import { fileComments, leadFiles, leads, members, noteAttachments, returnAttachments, taskAttachments, type FileComment, type Member } from '@/lib/db/schema'
import type { FileRow } from './file-model'

/* Lead Details › Files (931-39056) — loaders for the tab and the viewer. */

export type LeadFilesData = {
  /** Every untrashed file and folder of the lead (all levels — the client groups by parentId). */
  files: FileRow[]
  /** Trashed items (Deleted Files, 931:40208) with the folder they came from resolved by the client via `parentId`. */
  trashed: FileRow[]
  team: Member[]
  now: number
}

async function loadRows(leadId: string): Promise<{ rows: FileRow[]; team: Member[] }> {
  const [all, team] = await Promise.all([
    db.select().from(leadFiles).where(eq(leadFiles.leadId, leadId)).orderBy(asc(leadFiles.createdAt)),
    db.select().from(members),
  ])
  const ids = all.map((f) => f.id)
  // All three relations that point at lead_files, not tasks alone: a file held only by a note or by a lead return read
  // "--" here while the Notes tab / return details modal listed it as their attachment (Files shipped before both).
  const [comments, taskLinks, noteLinks, returnLinks] = ids.length
    ? await Promise.all([
        db.select({ fileId: fileComments.fileId }).from(fileComments).where(inArray(fileComments.fileId, ids)),
        db.select({ fileId: taskAttachments.fileId }).from(taskAttachments).where(inArray(taskAttachments.fileId, ids)),
        db.select({ fileId: noteAttachments.fileId }).from(noteAttachments).where(inArray(noteAttachments.fileId, ids)),
        db.select({ fileId: returnAttachments.fileId }).from(returnAttachments).where(inArray(returnAttachments.fileId, ids)),
      ])
    : [[], [], [], []]
  const byMember = new Map(team.map((m) => [m.id, m]))
  const commentCount = new Map<string, number>()
  for (const c of comments) commentCount.set(c.fileId, (commentCount.get(c.fileId) ?? 0) + 1)
  const onTask = new Set(taskLinks.map((a) => a.fileId))
  const onNote = new Set(noteLinks.map((a) => a.fileId))
  const onReturn = new Set(returnLinks.map((a) => a.fileId))
  // One Tag per row (931:40181), Task first — a file on both a task and a note still reads "Task".
  const attachedTo = (id: string): FileRow['attachedTo'] =>
    onTask.has(id) ? 'Task' : onNote.has(id) ? 'Note' : onReturn.has(id) ? 'Return' : null
  const rows: FileRow[] = all.map((f) => ({
    ...f,
    owner: f.ownerId ? byMember.get(f.ownerId) ?? null : null,
    commentCount: commentCount.get(f.id) ?? 0,
    attachedTo: attachedTo(f.id),
    itemCount: f.kind === 'folder' ? all.filter((c) => c.parentId === f.id && !c.deletedAt).length : 0,
  }))
  return { rows, team }
}

export async function fetchLeadFiles(leadId: string): Promise<LeadFilesData> {
  const { rows, team } = await loadRows(leadId)
  return { files: rows.filter((f) => !f.deletedAt), trashed: rows.filter((f) => !!f.deletedAt), team, now: Date.now() }
}

export type FileViewData = {
  lead: { id: string; name: string }
  file: FileRow
  /** The folder the file sits in (null at the root) — Information › Location and the back link. */
  folder: FileRow | null
  /** Untrashed non-folder siblings in display order (creation order) — prev / next arrows. */
  siblings: { id: string; name: string }[]
  /** Every untrashed file and folder of the lead — the viewer's Move dialog browses them (same set as `LeadFilesData.files`). */
  files: FileRow[]
  comments: (FileComment & { author: Member | null })[]
  team: Member[]
  me: Member
  now: number
}

async function fetchFileViewUncached(leadId: string, fileId: string): Promise<FileViewData | null> {
  const [lead] = await db.select({ id: leads.id, name: leads.name }).from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt)))
  if (!lead) return null
  const { rows, team } = await loadRows(leadId)
  const file = rows.find((f) => f.id === fileId && !f.deletedAt && f.kind !== 'folder')
  if (!file) return null
  const folder = file.parentId ? rows.find((f) => f.id === file.parentId) ?? null : null
  const siblings = rows.filter((f) => !f.deletedAt && f.kind !== 'folder' && (f.parentId ?? null) === (file.parentId ?? null)).map((f) => ({ id: f.id, name: f.name }))
  const cs = await db.select().from(fileComments).where(eq(fileComments.fileId, fileId)).orderBy(asc(fileComments.createdAt))
  const byMember = new Map(team.map((m) => [m.id, m]))
  const me = team.find((m) => m.isYou) ?? team[0]!
  return { lead, file, folder, siblings, files: rows.filter((f) => !f.deletedAt), comments: cs.map((c) => ({ ...c, author: byMember.get(c.authorId) ?? null })), team, me, now: Date.now() }
}

/** Per-request memo (audit 2026-08-30): `generateMetadata` and the page both call this, which ran every query twice. */
export const fetchFileView = cache(fetchFileViewUncached)
