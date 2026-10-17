import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles } from '@/lib/db/schema'
import { missingStarters } from './file-model'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * (gaps build E, item 4 — 1.0's set, H-14 · H-15) Every new project's Files opens with the starter folders — Contract & VOs · Floor plans ·
 * Renders · Quotes & BOQ · Site photos — at the root, beside the folders it files into by itself (Payments · Site updates · Choices), owned by
 * whoever made the project and stamped with the project's own moment (Activity names the set once: lib/leads/activity.ts). They are the
 * studio's own to rename, move or delete. Never one the studio already made: a live root folder of that name — or one it stands for, as an
 * older "Contract" — keeps its place and no second is made. Called once by the one writer of a project row (lib/projects/create.ts
 * `writeProjectRow`), inside New project's transaction; idempotent. (pending modules S43A) `ownerId` = whoever makes the project, read
 * before the transaction opened — never resolved in here.
 */
export async function addStarterFolders(w: typeof db | Tx, leadId: string, o: { at: Date; ownerId: string }): Promise<string[]> {
  const roots = await w.select({ name: leadFiles.name }).from(leadFiles)
    .where(and(eq(leadFiles.leadId, leadId), eq(leadFiles.kind, 'folder'), isNull(leadFiles.parentId), isNull(leadFiles.deletedAt)))
  const names = missingStarters(roots)
  if (!names.length) return []
  await w.insert(leadFiles).values(names.map((name) => ({
    id: randomUUID(), leadId, kind: 'folder', name, thumb: null, createdAt: o.at, parentId: null, ownerId: o.ownerId, updatedAt: o.at,
  })))
  return names
}
