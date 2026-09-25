import type { FolderNode } from '@/lib/folders'

/*
 * (REG-664) The libraries that keep folders — each its own set (the owner's pick, 2026-09-25): the five template tabs and the Price
 * book's My Items and My Sections. Pure, client-safe: the galleries, the pickers and the actions read the same names and rule.
 */
export const FOLDER_LIBRARIES = ['quotes', 'contracts', 'tasks', 'texts', 'payments', 'book-items', 'book-sections'] as const
export type FolderLibrary = (typeof FOLDER_LIBRARIES)[number]
export const isFolderLibrary = (v: unknown): v is FolderLibrary => typeof v === 'string' && (FOLDER_LIBRARIES as readonly string[]).includes(v)

/** The top of each library, as its crumb and the Move dialog say it — the tab's own name. */
export const LIBRARY_ROOT: Record<FolderLibrary, string> = {
  quotes: 'Quotes', contracts: 'Contracts', tasks: 'Tasks', texts: 'T&Cs & Notes', payments: 'Payments', 'book-items': 'My Items', 'book-sections': 'My Sections',
}
/** The Company page each library lives on. */
export const LIBRARY_PATH: Record<FolderLibrary, string> = {
  quotes: '/company/templates/quotes', contracts: '/company/templates/contracts', tasks: '/company/templates/tasks', texts: '/company/templates/terms',
  payments: '/company/templates/payments', 'book-items': '/company/price-book', 'book-sections': '/company/price-book/sections',
}

export type Folder = FolderNode & { library: FolderLibrary; createdAt: number; updatedAt: number }

/** Folders are the studio's shelving: Owners and Admins make, rename, move and delete them. An entry moves with its own rule —
    whoever may rename it may file it (`mayChange` on each gallery). */
export const FOLDER_RULE = 'Only an Owner or an Admin makes, renames and deletes folders'
type Viewer = { role: string | null | undefined }
export const folderBlock = (v: Viewer): string | null => (v.role === 'Owner' || v.role === 'Admin' ? null : FOLDER_RULE)

/** What a folder's delete moved up a level — handed back to Undo, which puts it all where it was. */
export type FolderUndo = { id: string; library: FolderLibrary; parentId: string | null; folders: string[]; entries: string[] }

/** Folders in name order, numbers counted as numbers ("Block 2" before "Block 10"). */
export const byFolderName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
