'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { fileComments, leadFiles, type LeadFile } from '@/lib/db/schema'
import { descendantIds } from '@/lib/leads/file-model'

/* Lead Details › Files (931-39056). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

const ME = 'dane'   // the signed-in member (members.is_you)
const touch = (leadId: string) => { revalidatePath(`/leads/${leadId}`); revalidatePath(`/leads/${leadId}/files`); revalidatePath(`/leads/${leadId}/tasks`); revalidatePath('/leads') }
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

/** Create Folder (931:39191) — at the root or inside `parentId`. Returns the new id. */
export async function createFolder(leadId: string, name: string, parentId: string | null = null): Promise<string> {
  const id = randomUUID(); const now = new Date()
  await db.insert(leadFiles).values({ id, leadId, kind: 'folder', name, thumb: null, createdAt: now, parentId, ownerId: ME, updatedAt: now })
  touch(leadId); return id
}

/**
 * New File › From Local Files / Upload Files (REG-149 flow): whatever was picked becomes the mock's file —
 * "Living Room", JPEG 711 KB with the mock thumbnail — owned by the signed-in member, in the open folder.
 */
export async function uploadFile(leadId: string, parentId: string | null = null, name = 'Living Room'): Promise<string> {
  const id = randomUUID(); const now = new Date()
  await db.insert(leadFiles).values({ id, leadId, kind: 'image', name, thumb: '/figma-assets/file-thumb-1.png', createdAt: now, parentId, ownerId: ME, sizeBytes: 728064, mime: 'image/jpeg', updatedAt: now })
  touch(leadId); return id
}

/** Rename File / Rename Folder (931:39434 / 931:39178). */
export async function renameFile(fileId: string, name: string): Promise<void> {
  const leadId = await leadOf(fileId); if (!leadId) return
  await db.update(leadFiles).set({ name, updatedAt: new Date() }).where(eq(leadFiles.id, fileId))
  touch(leadId)
}

/** Move dialog (931:39216): into a folder or to the root (null). A folder never moves into itself or its own descendants. */
export async function moveFiles(fileIds: string[], parentId: string | null): Promise<void> {
  if (!fileIds.length) return
  const leadId = await leadOf(fileIds[0]!); if (!leadId) return
  const all = await allOf(leadId)
  const blocked = new Set<string>()
  for (const id of fileIds) { const f = all.find((x) => x.id === id); if (f?.kind === 'folder') { blocked.add(id); for (const d of descendantIds(all, id)) blocked.add(d) } }
  if (parentId && blocked.has(parentId)) return
  await db.update(leadFiles).set({ parentId, updatedAt: new Date() }).where(inArray(leadFiles.id, fileIds))
  touch(leadId)
}

/** Duplicate (tile / viewer kebab, bulk bar): a copy beside the original, same name (the mock is silent — the tasks rule). Folders copy their contents. */
export async function duplicateFiles(fileIds: string[]): Promise<string[]> {
  if (!fileIds.length) return []
  const leadId = await leadOf(fileIds[0]!); if (!leadId) return []
  const all = await allOf(leadId)
  const now = new Date()
  const made: string[] = []
  const copy = async (id: string, parentId: string | null) => {
    const f = all.find((x) => x.id === id); if (!f) return
    const nid = randomUUID()
    await db.insert(leadFiles).values({ ...f, id: nid, parentId, createdAt: now, updatedAt: now, deletedAt: null })
    made.push(nid)
    if (f.kind === 'folder') for (const c of all.filter((x) => x.parentId === id && !x.deletedAt)) await copy(c.id, nid)
  }
  for (const id of fileIds) { const f = all.find((x) => x.id === id); if (f) await copy(id, f.parentId ?? null) }
  touch(leadId); return made
}

/** Move to Trash Folder (931:39204) — soft; folders take their (untrashed) contents along under one timestamp. */
export async function trashFiles(fileIds: string[]): Promise<void> {
  const { leadId, ids } = await withDescendants(fileIds, (f) => !f.deletedAt); if (!leadId) return
  await db.update(leadFiles).set({ deletedAt: new Date() }).where(inArray(leadFiles.id, ids))
  touch(leadId)
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
  touch(leadId)
}

/** Deleted Files › Delete Forever — hard delete of the folder and everything inside it (comments and task attachments cascade). */
export async function deleteFilesForever(fileIds: string[]): Promise<void> {
  const { leadId, ids } = await withDescendants(fileIds, () => true); if (!leadId) return
  await db.delete(leadFiles).where(inArray(leadFiles.id, ids))
  touch(leadId)
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
  touch(leadId); revalidatePath(`/leads/${leadId}/files/${fileId}`); return id
}
export async function editFileComment(commentId: string, body: string): Promise<void> {
  const [c] = await db.select({ fileId: fileComments.fileId }).from(fileComments).where(eq(fileComments.id, commentId)); if (!c) return
  await db.update(fileComments).set({ body, updatedAt: new Date() }).where(eq(fileComments.id, commentId))
  const leadId = await leadOf(c.fileId); if (leadId) { touch(leadId); revalidatePath(`/leads/${leadId}/files/${c.fileId}`) }
}
export async function deleteFileComment(commentId: string): Promise<void> {
  const [c] = await db.select({ fileId: fileComments.fileId }).from(fileComments).where(eq(fileComments.id, commentId)); if (!c) return
  await db.delete(fileComments).where(eq(fileComments.id, commentId))
  const leadId = await leadOf(c.fileId); if (leadId) { touch(leadId); revalidatePath(`/leads/${leadId}/files/${c.fileId}`) }
}
