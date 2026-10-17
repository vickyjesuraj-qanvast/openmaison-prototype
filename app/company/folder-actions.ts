'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractTemplates, libraryFolders, members, paymentTemplates, priceBookItems, priceBookSections, quoteTemplates, quoteTextTemplates, studioMaterials, taskTemplates, visualizerDesigns, scheduleTemplates } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { folderNameProblem, foldersIn, foldersUnder } from '@/lib/folders'
import { folderBlockFor, folderChangeBlockFor, isFolderLibrary, LIBRARY_PATH, type FolderLibrary, type FolderUndo } from '@/lib/company/folder-libraries'
import { designChangeBlock } from '@/lib/visualizer/policy'
import { refuse, templateChangeBlock, type Refusal } from '@/lib/company/template-rules'
import { itemChangeBlock, runsBook, SECTION_RULE } from '@/lib/company/price-book-rules'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

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
    case 'visualizer': return pick(await db.select({ id: visualizerDesigns.id, folderId: visualizerDesigns.folderId, createdBy: visualizerDesigns.createdBy }).from(visualizerDesigns).where(eq(visualizerDesigns.kind, 'personal'))).map((r) => ({ ...r, status: 'live' }))
    case 'materials': return pick(await db.select({ id: studioMaterials.id, folderId: studioMaterials.folderId, createdBy: studioMaterials.uploadedBy }).from(studioMaterials)).map((r) => ({ ...r, status: 'live' }))
    case 'schedules': return pick(await db.select({ id: scheduleTemplates.id, folderId: scheduleTemplates.folderId, createdBy: scheduleTemplates.createdBy }).from(scheduleTemplates)).map((r) => ({ ...r, status: 'live' }))   // (Projects round 2)
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
    case 'visualizer': await db.update(visualizerDesigns).set({ folderId }).where(inArray(visualizerDesigns.id, ids)); return
    case 'materials': await db.update(studioMaterials).set({ folderId }).where(inArray(studioMaterials.id, ids)); return
    case 'schedules': await db.update(scheduleTemplates).set({ folderId }).where(inArray(scheduleTemplates.id, ids)); return
  }
}

/** Why `viewer` may not file this entry, else null — the library's rename rule. */
function entryBlock(library: FolderLibrary, viewer: { id: string | null; role: string | null | undefined }, e: Entry): string | null {
  if (library === 'quotes') return templateChangeBlock(viewer, undefined)
  if (library === 'book-items') return itemChangeBlock(viewer, e)
  if (library === 'book-sections') return runsBook(viewer) ? null : SECTION_RULE
  if (library === 'visualizer' || library === 'materials') return designChangeBlock(viewer, e.createdBy)
  return templateChangeBlock(viewer, e.createdBy)
}

const liveFolders = async (library: FolderLibrary) =>
  (await db.select().from(libraryFolders).where(and(eq(libraryFolders.library, library), isNull(libraryFolders.deletedAt)))).map((r) => ({ ...r, parentId: r.parentId ?? null }))

/* (wave E, E7) Every folder action answers a refusal as `{ error: <the rule> }` — a thrown rule reached the page redacted, and the
   snackbar said "please try again" instead of who may. */
const GONE = 'That folder is gone'
const UNKNOWN = 'That library keeps no folders'
/** (audit 2026-09-26, F124) Renaming, moving or deleting a folder that exists: its library's rule for that folder — an AI Visualizer
    folder answers to whoever made it, an Owner or an Admin; (wave E, gallery-2) the rule names its maker. */
async function changeRefusal(f: { library: FolderLibrary; createdBy: string | null }): Promise<string | null> {
  const viewer = await fetchViewer()
  const maker = f.createdBy ? (await db.select({ name: members.name }).from(members).where(eq(members.id, f.createdBy)))[0]?.name ?? null : null
  return folderChangeBlockFor(f.library, viewer, f.createdBy, maker)
}
const touch = (library: FolderLibrary) => {
  revalidatePath(LIBRARY_PATH[library])
  if (library === 'book-items' || library === 'book-sections') revalidatePath('/company/price-book', 'layout')
}

/** New Folder — at the top or inside `parentId`. Returns its id. */
export async function createLibraryFolder(library: FolderLibrary, name: string, parentId: string | null): Promise<string | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  if (!isFolderLibrary(library)) return refuse(UNKNOWN)
  const viewer = await fetchViewer()
  const block = folderBlockFor(library, viewer); if (block) return refuse(block)
  const all = await liveFolders(library)
  if (parentId && !all.some((f) => f.id === parentId)) return refuse(GONE)
  const problem = folderNameProblem(name, foldersIn(all, parentId)); if (problem) return refuse(problem)
  const id = randomUUID(); const now = new Date()
  await db.insert(libraryFolders).values({ id, library, name: name.trim(), parentId, createdBy: viewer.id, createdAt: now, updatedAt: now })
  touch(library); return id
}

/** Rename Folder. */
export async function renameLibraryFolder(id: string, name: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [f] = await db.select().from(libraryFolders).where(and(eq(libraryFolders.id, id), isNull(libraryFolders.deletedAt)))
  if (!f || !isFolderLibrary(f.library)) return refuse(GONE)
  const block = await changeRefusal({ library: f.library, createdBy: f.createdBy }); if (block) return refuse(block)
  const all = await liveFolders(f.library)
  const problem = folderNameProblem(name, foldersIn(all, f.parentId ?? null), id); if (problem) return refuse(problem)
  await db.update(libraryFolders).set({ name: name.trim(), updatedAt: new Date() }).where(eq(libraryFolders.id, id))
  touch(f.library)
}

/**
 * Move to Folder — entries and folders into `target` (null = the top). A folder never goes into itself or anything under it; an entry
 * the viewer may not rename stays where it is. Returns how many moved and how many stayed, so the snackbar can say so.
 */
export async function moveToLibraryFolder(library: FolderLibrary, pick: { entries: string[]; folders: string[] }, target: string | null): Promise<{ moved: number; kept: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  if (!isFolderLibrary(library)) return refuse(UNKNOWN)
  const viewer = await fetchViewer()
  const all = await liveFolders(library)
  if (target && !all.some((f) => f.id === target)) return refuse(GONE)
  let kept = 0
  /* (F124) each folder moves on its own rule; one this viewer may not change stays where it is */
  const picked = pick.folders.filter((id) => all.some((f) => f.id === id))
  const folders = picked.filter((id) => !folderChangeBlockFor(library, viewer, all.find((f) => f.id === id)?.createdBy ?? null))
  kept += picked.length - folders.length
  if (folders.length && target && folders.some((id) => id === target || foldersUnder(all, id).includes(target))) return refuse('A folder can’t go inside itself')
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
export async function deleteLibraryFolder(id: string): Promise<FolderUndo | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [f] = await db.select().from(libraryFolders).where(and(eq(libraryFolders.id, id), isNull(libraryFolders.deletedAt)))
  if (!f || !isFolderLibrary(f.library)) return refuse(GONE)
  const block = await changeRefusal({ library: f.library, createdBy: f.createdBy }); if (block) return refuse(block)
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
export async function undoDeleteLibraryFolder(undo: FolderUndo): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  if (!isFolderLibrary(undo.library)) return refuse(UNKNOWN)
  const [f] = await db.select().from(libraryFolders).where(eq(libraryFolders.id, undo.id))
  if (!f || f.library !== undo.library) return refuse(GONE)
  const block = await changeRefusal({ library: undo.library, createdBy: f.createdBy }); if (block) return refuse(block)
  const now = new Date()
  await db.update(libraryFolders).set({ deletedAt: null, updatedAt: now }).where(eq(libraryFolders.id, undo.id))
  const all = await liveFolders(undo.library)
  const kids = all.filter((x) => undo.folders.includes(x.id) && x.parentId === undo.parentId).map((x) => x.id)
  if (kids.length) await db.update(libraryFolders).set({ parentId: undo.id, updatedAt: now }).where(inArray(libraryFolders.id, kids))
  const entries = (await entriesOf(undo.library, undo.entries)).filter((e) => (e.folderId ?? null) === undo.parentId).map((e) => e.id)
  await setEntryFolder(undo.library, entries, undo.id)
  touch(undo.library)
}
