import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { templateChangeBlock, templateDefaultBlock, templateTrashRefusal } from './template-rules'

/* (REG-646, settings parity Q-07) The template rules on the server — a public action never takes the page's word for them.
   (wave E, E7) Each answers the rule (or null) for the action to hand back as `{ error }`: a thrown rule reached the page redacted. */
export async function changeBlock(createdBy: string | null | undefined): Promise<string | null> {
  return templateChangeBlock(await fetchViewer(), createdBy)
}
export async function defaultBlock(): Promise<string | null> {
  return templateDefaultBlock(await fetchViewer())
}
/** The ids among `rows` the viewer may restore or delete forever; the rest are left and counted back. */
export async function changeableIds(rows: { id: string; createdBy: string | null }[]): Promise<string[]> {
  const viewer = await fetchViewer()
  return rows.filter((r) => templateChangeBlock(viewer, r.createdBy) === null).map((r) => r.id)
}
/** (wave E, E7) Why a bulk restore / delete-forever over `rows` does nothing at all — every one of them is someone else's — else null.
    (verify round 3) Said in the action's own words with the maker's name — "Only Dane, an Owner or an Admin can restore this template" —
    never Rename's "renames or deletes it"; the check is the same rule (templateChangeBlock). */
export async function nothingChangeable(rows: { id: string; createdBy: string | null }[], action: 'restore' | 'purge'): Promise<string | null> {
  if (!rows.length) return null
  const viewer = await fetchViewer()
  if (!rows.every((r) => templateChangeBlock(viewer, r.createdBy) !== null)) return null
  const makers = [...new Set(rows.map((r) => r.createdBy).filter((id): id is string => !!id))]
  const [maker] = makers.length === 1 ? await db.select({ name: members.name }).from(members).where(eq(members.id, makers[0]!)) : []
  return templateTrashRefusal(action, rows, maker?.name ?? null)
}
