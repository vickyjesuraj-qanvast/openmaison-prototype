import 'server-only'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { libraryFolders } from '@/lib/db/schema'
import type { FolderLibrary } from './folder-libraries'

/**
 * (Dane UAT 3.03 · audit F118) Where a new entry lands: in the folder that was open when it was made — the folder's library, still there,
 * and the entry one its maker may file (each library's own rule, the one Move to Folder asks: whoever may rename it may file it,
 * lib/company/folder-libraries.ts). When the folder is gone or the rule refuses, it lands at the top and `refused` says why, for the
 * snackbar that names where it went.
 */
export type Landing = { folderId: string | null; refused: string | null }
export const FOLDER_GONE = 'That folder is gone'

export async function landingFolder(library: FolderLibrary, folderId: string | null | undefined, block: string | null): Promise<Landing> {
  if (!folderId) return { folderId: null, refused: null }
  const [f] = await db.select({ id: libraryFolders.id }).from(libraryFolders).where(and(eq(libraryFolders.id, folderId), eq(libraryFolders.library, library), isNull(libraryFolders.deletedAt)))
  if (!f) return { folderId: null, refused: FOLDER_GONE }
  if (block) return { folderId: null, refused: block }
  return { folderId: f.id, refused: null }
}
