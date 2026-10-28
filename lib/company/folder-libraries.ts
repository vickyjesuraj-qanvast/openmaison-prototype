import type { FolderNode } from '@/lib/folders'

/*
 * (REG-664) The libraries that keep folders — each its own set (the owner's pick, 2026-09-25): the five template tabs and the Price
 * book's My Items and My Sections. Pure, client-safe: the galleries, the pickers and the actions read the same names and rule.
 */
export const FOLDER_LIBRARIES = ['quotes', 'contracts', 'tasks', 'texts', 'payments', 'book-items', 'book-sections', 'visualizer', 'materials', 'schedules'] as const   /* (REG-673) + the AI Visualizer's personal designs and Company › Materials */
export type FolderLibrary = (typeof FOLDER_LIBRARIES)[number]
export const isFolderLibrary = (v: unknown): v is FolderLibrary => typeof v === 'string' && (FOLDER_LIBRARIES as readonly string[]).includes(v)

/** The top of each library, as its crumb and the Move dialog say it — the tab's own name. */
export const LIBRARY_ROOT: Record<FolderLibrary, string> = {
  quotes: 'Quotes', contracts: 'Contracts', tasks: 'Tasks', texts: 'T&Cs & Notes', payments: 'Payment schedules', 'book-items': 'Items', 'book-sections': 'Sections', visualizer: 'Designs', materials: 'All materials', schedules: 'Project schedules',   // (the calm UI build 2026-10-27 — W-268 · W-109 · 4-06 · 6-20)   // (REG-673 · 677) a one-page section's bar reads its contents, not the page's title again
}
/** The Company page each library lives on. */
export const LIBRARY_PATH: Record<FolderLibrary, string> = {
  quotes: '/company/templates/quotes', contracts: '/company/templates/contracts', tasks: '/company/templates/tasks', texts: '/company/templates/terms',
  payments: '/company/templates/payments', 'book-items': '/company/price-book', 'book-sections': '/company/price-book/sections', visualizer: '/visualizer', materials: '/company/materials', schedules: '/company/templates/schedules',
}

export type Folder = FolderNode & { library: FolderLibrary; createdAt: number; updatedAt: number
  /** (audit 2026-09-26, F124) who made the folder, and why this viewer may not rename, move or delete it (null when they may). */
  createdBy?: string | null; mayChange?: string | null }

/** Folders are the studio's shelving: Owners and Admins make, rename, move and delete them. An entry moves with its own rule —
    whoever may rename it may file it (`mayChange` on each gallery). */
export const FOLDER_RULE = 'Only an Owner or an Admin makes, renames and deletes folders'
type Viewer = { id?: string | null; role: string | null | undefined }
export const folderBlock = (v: Viewer): string | null => (v.role === 'Owner' || v.role === 'Admin' ? null : FOLDER_RULE)
/** (REG-673) A library's own folder rule: the AI Visualizer's folders hold personal designs, and anyone files their own (1.0 A B-10). */
export const folderBlockFor = (library: FolderLibrary, v: Viewer): string | null => (library === 'visualizer' ? null : folderBlock(v))
/** (audit 2026-09-26, F124) An AI Visualizer folder, once made, is its maker's — as a design is: they, an Owner or an Admin rename, move or
    delete it (anyone still makes one). The other libraries keep their Owner-or-Admin rule. */
export const OWN_FOLDER_RULE = 'Only whoever made the folder, an Owner or an Admin can rename, move or delete it'
/** (wave E, gallery-2) The folder's rule naming its maker when the page knows them — "Only Dane, an Owner or an Admin can rename, move or
    delete this folder", as a design's and a material's rules do. */
export const ownFolderRule = (maker?: string | null) => (maker?.trim() ? `Only ${maker.trim()}, an Owner or an Admin can rename, move or delete this folder` : OWN_FOLDER_RULE)
export const folderChangeBlockFor = (library: FolderLibrary, v: Viewer, createdBy: string | null | undefined, maker?: string | null): string | null =>
  library === 'visualizer' ? (v.role === 'Owner' || v.role === 'Admin' || (!!v.id && v.id === createdBy) ? null : ownFolderRule(maker)) : folderBlock(v)

/** What a folder's delete moved up a level — handed back to Undo, which puts it all where it was. */
export type FolderUndo = { id: string; library: FolderLibrary; parentId: string | null; folders: string[]; entries: string[] }

/** Folders in name order, numbers counted as numbers ("Block 2" before "Block 10"). */
export const byFolderName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
