'use server'

import { randomUUID } from 'node:crypto'
import { logLeadEvent } from '@/lib/leads/events'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { fileComments, leadFileRenders, leadFiles, type LeadFile, leadFileImages } from '@/lib/db/schema'
import { sessionMemberSql } from '@/lib/db/session'
import { descendantIds } from '@/lib/leads/file-model'
import { folderNameProblem } from '@/lib/folders'
import { revalidateLead } from '@/lib/leads/queries'

/* Lead Details › Files (931-39056). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

const ME = sessionMemberSql   // (REG-286 · REG-667) the signed-in member, resolved inside each write (lib/db/session.ts)
/**
 * (REG-286) One shared eviction for every detail tab — this helper named Files and Tasks by hand but never Notes,
 * the return details modal or Activity, all of which show the lead's files. `fileIds` additionally clears the
 * viewer route `/leads/{lead}/files/{file}`, which is a page of its own and was refreshed for comments only.
 */
const touch = (leadId: string, ...fileIds: string[]) => {
  revalidateLead(leadId)
  for (const f of fileIds) revalidatePath(`/leads/${leadId}/files/${f}`)
}
const leadOf = async (fileId: string) => (await db.select({ leadId: leadFiles.leadId }).from(leadFiles).where(eq(leadFiles.id, fileId)))[0]?.leadId ?? null
const allOf = (leadId: string) => db.select().from(leadFiles).where(eq(leadFiles.leadId, leadId))
/**
 * ids + the descendants of any folder among them that pass `follow(descendant, folder)` — folders carry their contents
 * through trash / restore / delete, but an item the user trashed on its own (its own row in Deleted Files) is neither
 * re-stamped by trashing its folder nor pulled back by restoring it.
 */
const withDescendants = async (ids: string[], follow: (f: LeadFile, folder: LeadFile) => boolean) => {
  if (!ids.length) return { leadId: null as string | null, ids }
  const leadId = await leadOf(ids[0]!); if (!leadId) return { leadId: null, ids }
  const all = await allOf(leadId)
  const set = new Set(ids)
  for (const id of ids) {
    const f = all.find((x) => x.id === id); if (f?.kind !== 'folder') continue
    for (const d of descendantIds(all, id)) { const c = all.find((x) => x.id === d); if (c && follow(c, f)) set.add(d) }
  }
  return { leadId, ids: [...set] }
}
/** Trashed in the same `trashFiles` call as the folder (one timestamp for the whole cascade). */
const trashedTogether = (f: LeadFile, folder: LeadFile) => !!f.deletedAt && !!folder.deletedAt && f.deletedAt.getTime() === folder.deletedAt.getTime()

/** (REG-664) The lead's live folders beside `parentId` — a new or renamed folder's name must differ from theirs (lib/folders.ts). */
const siblingFolders = async (leadId: string, parentId: string | null) =>
  (await allOf(leadId)).filter((f) => f.kind === 'folder' && !f.deletedAt && (f.parentId ?? null) === parentId).map((f) => ({ id: f.id, name: f.name, parentId: f.parentId ?? null }))

/** Create Folder (931:39191) — at the root or inside `parentId`. Returns the new id. (REG-664) The name is checked as the dialog checks it. */
export async function createFolder(leadId: string, name: string, parentId: string | null = null): Promise<string> {
  const problem = folderNameProblem(name, await siblingFolders(leadId, parentId)); if (problem) throw new Error(problem)
  const id = randomUUID(); const now = new Date()
  await db.insert(leadFiles).values({ id, leadId, kind: 'folder', name: name.trim(), thumb: null, createdAt: now, parentId, ownerId: ME, updatedAt: now })
  touch(leadId); return id
}

/**
 * New File › From Local Files / Upload Files (REG-149 flow): the mock's 711 KB and thumbnail stand in for bytes we
 * never store, owned by the signed-in member, in the open folder. The kind follows the picked NAME — the same
 * derivation attach-files-modal.tsx and return-lead-wizard.tsx make on the way in, so the pick keeps its identity
 * once persisted; storing every pick as a JPEG turned an attached .pdf into a photograph on Confirm.
 */
/* (audit 2026-09-26, F205) a long string travels inside an object: React's action decoder counts a bare string argument against a
   1,000,000 limit whenever the action takes more than one argument, so a ~730 KB photo failed with a 500 */
export async function uploadFile(leadId: string, o: { parentId?: string | null; name?: string; image?: string | null } = {}): Promise<string> {
  const { parentId = null, name = 'Living Room', image = null } = o
  const id = randomUUID(); const now = new Date()
  const pdf = /\.pdf$/i.test(name)
  /* (REG-684; the studios' sheet row 5: "renders / floor plans don't display when uploaded via Files") an image keeps its picture — the grid, the
     viewer and Open in AI Visualizer show what was uploaded, not a stand-in */
  /* (audit 2026-09-26, F205) the cap sits under the request's own 12 MB limit (next.config.ts), so this rule — not a failed request — decides */
  const picture = !pdf && image && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) && image.length < 12_000_000 ? image : null
  await db.insert(leadFiles).values({ id, leadId, kind: pdf ? 'pdf' : 'image', name, thumb: pdf ? null : picture ? `/files/img/${id}` : '/figma-assets/file-thumb-1.png', createdAt: now, parentId, ownerId: ME, sizeBytes: picture ? Math.round((picture.length - picture.indexOf(',')) * 0.75) : 728064, mime: pdf ? 'application/pdf' : picture ? picture.slice(5, picture.indexOf(';')) : 'image/jpeg', updatedAt: now })
  if (picture) await db.insert(leadFileImages).values({ fileId: id, data: picture })
  touch(leadId); return id
}

/** Rename File / Rename Folder (931:39434 / 931:39178). */
export async function renameFile(fileId: string, name: string): Promise<void> {
  const leadId = await leadOf(fileId); if (!leadId) return
  const [f] = await db.select().from(leadFiles).where(eq(leadFiles.id, fileId))
  if (f?.kind === 'folder') { const problem = folderNameProblem(name, await siblingFolders(leadId, f.parentId ?? null), fileId); if (problem) throw new Error(problem) }   // (REG-664)
  else if (!name.trim()) throw new Error('a name is required')
  await db.update(leadFiles).set({ name: name.trim(), updatedAt: new Date() }).where(eq(leadFiles.id, fileId))
  touch(leadId, fileId)
}

/** Move dialog (931:39216): into a folder or to the root (null). A folder never moves into itself or its own descendants. */
export async function moveFiles(fileIds: string[], parentId: string | null): Promise<void> {
  if (!fileIds.length) return
  const leadId = await leadOf(fileIds[0]!); if (!leadId) return
  const all = await allOf(leadId)
  const blocked = new Set<string>()
  for (const id of fileIds) { const f = all.find((x) => x.id === id); if (f?.kind === 'folder') { blocked.add(id); for (const d of descendantIds(all, id)) blocked.add(d) } }
  /* (REG-664) A refused move says so: it returned quietly and the tab still announced "Moved to …". The destination must be one of the
     lead's live folders, and never one being moved or inside one. */
  if (parentId) {
    const dest = all.find((x) => x.id === parentId)
    if (!dest || dest.kind !== 'folder' || dest.deletedAt) throw new Error('folder not found')
    if (blocked.has(parentId)) throw new Error('a folder can’t go inside itself')
  }
  await db.update(leadFiles).set({ parentId, updatedAt: new Date() }).where(inArray(leadFiles.id, fileIds))
  touch(leadId, ...fileIds)
}

/** Duplicate (tile / viewer kebab, bulk bar): a copy beside the original, same name (the mock is silent — the tasks rule). Folders copy their contents. */
export async function duplicateFiles(fileIds: string[]): Promise<string[]> {
  if (!fileIds.length) return []
  const leadId = await leadOf(fileIds[0]!); if (!leadId) return []
  const all = await allOf(leadId)
  const now = new Date()
  const made: string[] = []
  // (REG-286) One transaction: a folder copy is a tree. Unwrapped, a failure mid-recursion left a duplicated folder
  // holding only the children that happened to land — a copy the user has to inspect file by file to trust.
  await db.transaction(async (tx) => {
    const copy = async (id: string, parentId: string | null) => {
      const f = all.find((x) => x.id === id); if (!f) return
      const nid = randomUUID()
      const [pic] = await tx.select().from(leadFileImages).where(eq(leadFileImages.fileId, f.id))
      await tx.insert(leadFiles).values({ ...f, id: nid, parentId, createdAt: now, updatedAt: now, deletedAt: null, thumb: pic ? `/files/img/${nid}` : f.thumb })
      if (pic) await tx.insert(leadFileImages).values({ fileId: nid, data: pic.data })   // (REG-684) a copy keeps its own picture
      const [from] = await tx.select().from(leadFileRenders).where(eq(leadFileRenders.fileId, f.id))
      if (from) await tx.insert(leadFileRenders).values({ ...from, fileId: nid })   // (audit 2026-09-26, F095) and, a filed render, the version it is
      made.push(nid)
      if (f.kind === 'folder') for (const c of all.filter((x) => x.parentId === id && !x.deletedAt)) await copy(c.id, nid)
    }
    for (const id of fileIds) { const f = all.find((x) => x.id === id); if (f) await copy(id, f.parentId ?? null) }
  })
  touch(leadId); return made
}

/** Move to Trash Folder (931:39204) — soft; folders take their (untrashed) contents along under one timestamp. */
export async function trashFiles(fileIds: string[]): Promise<void> {
  const { leadId, ids } = await withDescendants(fileIds, (f) => !f.deletedAt); if (!leadId) return
  const picked = await db.select({ name: leadFiles.name, kind: leadFiles.kind }).from(leadFiles).where(inArray(leadFiles.id, fileIds))
  await db.update(leadFiles).set({ deletedAt: new Date() }).where(inArray(leadFiles.id, ids))
  for (const f of picked) await logLeadEvent(db, leadId, 'file_trashed', { name: f.name, kind: f.kind })   /* (REG-613) */
  touch(leadId, ...ids)
}

/**
 * Deleted Files › Restore — back where it was: a folder brings back what was trashed together with it (same timestamp),
 * not what was trashed separately before; a parent that is itself still trashed is restored too, so the item is reachable.
 */
export async function restoreFiles(fileIds: string[]): Promise<void> {
  const { leadId, ids } = await withDescendants(fileIds, trashedTogether); if (!leadId) return
  const all = await allOf(leadId)
  const set = new Set(ids)
  for (const id of ids) { let p = all.find((x) => x.id === id)?.parentId ?? null; while (p) { const f = all.find((x) => x.id === p); if (f?.deletedAt) set.add(f.id); p = f?.parentId ?? null } }
  await db.update(leadFiles).set({ deletedAt: null }).where(inArray(leadFiles.id, [...set]))
  touch(leadId, ...set)
}

/** Deleted Files › Delete Forever — hard delete of the folder and everything inside it (comments and task attachments cascade). */
export async function deleteFilesForever(fileIds: string[]): Promise<void> {
  const { leadId, ids } = await withDescendants(fileIds, () => true); if (!leadId) return
  const picked = await db.select({ name: leadFiles.name, kind: leadFiles.kind }).from(leadFiles).where(inArray(leadFiles.id, fileIds))
  await db.delete(leadFiles).where(inArray(leadFiles.id, ids))
  for (const f of picked) await logLeadEvent(db, leadId, 'file_deleted', { name: f.name, kind: f.kind })   /* (REG-613) */
  touch(leadId, ...ids)
}

/** Deleted Files › Empty Trash. */
export async function emptyFileTrash(leadId: string): Promise<void> {
  await db.delete(leadFiles).where(and(eq(leadFiles.leadId, leadId), isNotNull(leadFiles.deletedAt)))
  touch(leadId)
}

/* ── comments (viewer › Comments panel 931:39891) ── */
export async function addFileComment(fileId: string, body: string): Promise<string> {
  const leadId = await leadOf(fileId); if (!leadId) throw new Error('file not found')
  const id = randomUUID()
  await db.insert(fileComments).values({ id, fileId, authorId: ME, body, createdAt: new Date() })
  touch(leadId, fileId); return id
}
export async function editFileComment(commentId: string, body: string): Promise<void> {
  const [c] = await db.select({ fileId: fileComments.fileId }).from(fileComments).where(eq(fileComments.id, commentId)); if (!c) return
  await db.update(fileComments).set({ body, updatedAt: new Date() }).where(eq(fileComments.id, commentId))
  const leadId = await leadOf(c.fileId); if (leadId) touch(leadId, c.fileId)
}
export async function deleteFileComment(commentId: string): Promise<void> {
  const [c] = await db.select({ fileId: fileComments.fileId }).from(fileComments).where(eq(fileComments.id, commentId)); if (!c) return
  await db.delete(fileComments).where(eq(fileComments.id, commentId))
  const leadId = await leadOf(c.fileId); if (leadId) touch(leadId, c.fileId)
}
