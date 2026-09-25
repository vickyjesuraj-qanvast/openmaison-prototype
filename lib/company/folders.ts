import 'server-only'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { libraryFolders } from '@/lib/db/schema'
import { byFolderName, type Folder, type FolderLibrary } from '@/lib/company/folder-libraries'

/** (REG-664) A library's live folders, in name order. */
export async function fetchFolders(library: FolderLibrary): Promise<Folder[]> {
  const rows = await db.select().from(libraryFolders).where(and(eq(libraryFolders.library, library), isNull(libraryFolders.deletedAt)))
  return rows.map((r) => ({ id: r.id, library, name: r.name, parentId: r.parentId ?? null, createdAt: r.createdAt.getTime(), updatedAt: r.updatedAt.getTime() })).sort(byFolderName)
}
