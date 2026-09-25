'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractTemplates, libraryFolders, paymentTemplates, priceBookItems, priceBookSections, quoteTemplates, quoteTextTemplates, taskTemplates } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { folderNameProblem, foldersIn, foldersUnder } from '@/lib/folders'
import { folderBlock, isFolderLibrary, LIBRARY_PATH, type FolderLibrary, type FolderUndo } from '@/lib/company/folder-libraries'
import { templateChangeBlock } from '@/lib/company/template-rules'
import { itemChangeBlock, runsBook, SECTION_RULE } from '@/lib/company/price-book-rules'

/*
 * (REG-664) Folders in the studio's libraries — the five template tabs and the Price book's two. Owners and Admins make, rename, move
 * and delete folders; an entry is filed by whoever may rename it (each library's own rule). Deleting a folder deletes nothing it holds:
 * its entries and sub-folders move up a level, and the returned record lets Undo put them back.
 */

type Entry = { id: string; folderId: string | null; createdBy: string | null; status: string }

async function entriesOf(library: FolderLibrary, ids?: string[]): Promise<Entry[]> {
  const pick = <T extends { id: string }>(rows: T[]) => (ids ? rows.filter((r) => ids.includes(r.id)) : rows)
  switch (library) {
    case 'quotes': return pick(await db.select({ id: quoteTemplates.id, folderId: quoteTemplates.folderId }).from(quoteTemplates)).map((r) => ({ ...r, createdBy: null, status: 'live' }))
    case 'contracts': return pick(await db.select({ id: contractTemplates.id, folderId: contractTemplates.folderId, createdBy: contractTemplates.createdBy }).from(contractTemplates)).map((r) => ({ ...r, status: 'live' }))
    case 'tasks': return pick(await db.select({ id: taskTemplates.id, folderId: taskTemplates.folderId, createdBy: taskTemplates.createdBy }).from(taskTemplates)).map((r) => ({ ...r, status: 'live' }))
    case 'texts': return pick(await db.select({ id: quoteTextTemplates.id, folderId: quoteTextTemplates.folderId, createdBy: quoteTextTemplates.createdBy }).from(quoteTextTemplates)).map((r) => ({ ...r, status: 'live' }))
    case 'payments': return pick(await db.select({ id: paymentTemplates.id, folderId: paymentTemplates.folderId, createdBy: paymentTemplates.createdBy }).from(paymentTemplates)).map((r) => ({ ...r, status: 'live' }))
    case 'book-items': return pick(await db.select({ id: priceBookItems.id, folderId: priceBookItems.folderId, createdBy: priceBookItems.createdBy, status: priceBookItems.status }).from(priceBookItems))
    case 'book-sections': return pick(await db.select({ id: priceBookSections.id, folderId: priceBookSections.folderId, createdBy: priceBookSections.createdBy }).from(priceBookSections)).map((r) => ({ ...r, status: 'live' }))
  }
}

async function setEntryFolder(library: FolderLibrary, ids: string[], folderId: string | null) {
  if (!ids.length) return
  switch (library) {
    case 'quotes': await db.update(quoteTemplates).set({ folderId }).where(inArray(quoteTemplates.id, ids)); return
    case 'contracts': await db.update(contractTemplates).set({ folderId }).where(inArray(contractTemplates.id, ids)); return
    case 'tasks': await db.update(taskTemplates).set({ folderId }).where(inArray(taskTemplates.id, ids)); return
    case 'texts': await db.update(quoteTextTemplates).set({ folderId }).where(inArray(quoteTextTemplates.id, ids)); return
    case 'payments': await db.update(paymentTemplates).set({ folderId }).where(inArray(paymentTemplates.id, ids)); return
    case 'book-items': await db.update(priceBookItems).set({ folderId }).where(inArray(priceBookItems.id, ids)); return
    case 'book-sections': await db.update(priceBookSections).set({ folderId }).where(inArray(priceBookSections.id, ids)); return
  }
}

/** Why `viewer` may not file this entry, else null — the library's rename rule. */
function entryBlock(library: FolderLibrary, viewer: { id: string | null; role: string | null | undefined }, e: Entry): string | null {
  if (library === 'quotes') return templateChangeBlock(viewer, undefined)
  if (library === 'book-items') return itemChangeBlock(viewer, e)
  if (library === 'book-sections') return runsBook(viewer) ? null : SECTION_RULE
  return templateChangeBlock(viewer, e.createdBy)
}

const liveFolders = async (library: FolderLibrary) =>
  (await db.select().from(libraryFolders).where(and(eq(libraryFolders.library, library), isNull(libraryFolders.deletedAt)))).map((r) => ({ ...r, parentId: r.parentId ?? null }))

async function organiser() {
  const viewer = await fetchViewer()
  const block = folderBlock(viewer)
  if (block) throw new Error(block)
  return viewer
}
const touch = (library: FolderLibrary) => {
  revalidatePath(LIBRARY_PATH[library])
  if (library === 'book-items' || library === 'book-sections') revalidatePath('/company/price-book', 'layout')
}

/** New Folder — at the top or inside `parentId`. Returns its id. */
export async function createLibraryFolder(library: FolderLibrary, name: string, parentId: string | null): Promise<string> {
  if (!isFolderLibrary(library)) throw new Error('unknown library')
  const viewer = await organiser()
  const all = await liveFolders(library)
  if (parentId && !all.some((f) => f.id === parentId)) throw new Error('folder not found')
  const problem = folderNameProblem(name, foldersIn(all, parentId)); if (problem) throw new Error(problem)
  const id = randomUUID(); const now = new Date()
  await db.insert(libraryFolders).values({ id, library, name: name.trim(), parentId, createdBy: viewer.id, createdAt: now, updatedAt: now })
  touch(library); return id
}

/** Rename Folder. */
export async function renameLibraryFolder(id: string, name: string): Promise<void> {
  await organiser()
  const [f] = await db.select().from(libraryFolders).where(and(eq(libraryFolders.id, id), isNull(libraryFolders.deletedAt)))
  if (!f || !isFolderLibrary(f.library)) throw new Error('folder not found')
  const all = await liveFolders(f.library)
  const problem = folderNameProblem(name, foldersIn(all, f.parentId ?? null), id); if (problem) throw new Error(problem)
  await db.update(libraryFolders).set({ name: name.trim(), updatedAt: new Date() }).where(eq(libraryFolders.id, id))
  touch(f.library)
}

/**
 * Move to Folder — entries and folders into `target` (null = the top). A folder never goes into itself or anything under it; an entry
 * the viewer may not rename stays where it is. Returns how many moved and how many stayed, so the snackbar can say so.
 */
export async function moveToLibraryFolder(library: FolderLibrary, pick: { entries: string[]; folders: string[] }, target: string | null): Promise<{ moved: number; kept: number }> {
  if (!isFolderLibrary(library)) throw new Error('unknown library')
  const viewer = await fetchViewer()
  const all = await liveFolders(library)
  if (target && !all.some((f) => f.id === target)) throw new Error('folder not found')
  let kept = 0
  const folders = pick.folders.filter((id) => all.some((f) => f.id === id))
  if (folders.length) {
    if (folderBlock(viewer)) { kept += folders.length; folders.length = 0 }
    else if (target && folders.some((id) => id === target || foldersUnder(all, id).includes(target))) throw new Error('a folder can’t go inside itself')
  }
  const rows = await entriesOf(library, pick.entries)
  const allowed = rows.filter((e) => !entryBlock(library, viewer, e)).map((e) => e.id)
  kept += rows.length - allowed.length
  const now = new Date()
  if (folders.length) await db.update(libraryFolders).set({ parentId: target, updatedAt: now }).where(inArray(libraryFolders.id, folders))
  await setEntryFolder(library, allowed, target)
  touch(library)
  return { moved: folders.length + allowed.length, kept }
}

/** Delete a folder: it goes; its entries (deleted ones too, so a restore lands somewhere real) and its sub-folders move up a level. */
export async function deleteLibraryFolder(id: string): Promise<FolderUndo> {
  await organiser()
  const [f] = await db.select().from(libraryFolders).where(and(eq(libraryFolders.id, id), isNull(libraryFolders.deletedAt)))
  if (!f || !isFolderLibrary(f.library)) throw new Error('folder not found')
  const library = f.library
  const up = f.parentId ?? null
  const all = await liveFolders(library)
  const kids = all.filter((x) => x.parentId === id).map((x) => x.id)
  const entries = (await entriesOf(library)).filter((e) => e.folderId === id).map((e) => e.id)
  const now = new Date()
  await db.transaction(async (tx) => {
    if (kids.length) await tx.update(libraryFolders).set({ parentId: up, updatedAt: now }).where(inArray(libraryFolders.id, kids))
    await tx.update(libraryFolders).set({ deletedAt: now }).where(eq(libraryFolders.id, id))
  })
  await setEntryFolder(library, entries, up)
  touch(library)
  return { id, library, parentId: up, folders: kids, entries }
}

/** Undo a folder's delete: the folder is back, and whatever it held that still sits where the delete left it goes back inside. */
export async function undoDeleteLibraryFolder(undo: FolderUndo): Promise<void> {
  await organiser()
  if (!isFolderLibrary(undo.library)) throw new Error('unknown library')
  const [f] = await db.select().from(libraryFolders).where(eq(libraryFolders.id, undo.id))
  if (!f || f.library !== undo.library) throw new Error('folder not found')
  const now = new Date()
  await db.update(libraryFolders).set({ deletedAt: null, updatedAt: now }).where(eq(libraryFolders.id, undo.id))
  const all = await liveFolders(undo.library)
  const kids = all.filter((x) => undo.folders.includes(x.id) && x.parentId === undo.parentId).map((x) => x.id)
  if (kids.length) await db.update(libraryFolders).set({ parentId: undo.id, updatedAt: now }).where(inArray(libraryFolders.id, kids))
  const entries = (await entriesOf(undo.library, undo.entries)).filter((e) => (e.folderId ?? null) === undo.parentId).map((e) => e.id)
  await setEntryFolder(undo.library, entries, undo.id)
  touch(undo.library)
}
