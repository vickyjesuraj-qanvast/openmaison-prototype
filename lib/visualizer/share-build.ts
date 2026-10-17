import 'server-only'   // libSQL never reaches the browser
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projectRooms, renderJobs, type ProjectRoom } from '@/lib/db/schema'
import type { Applied, Variant } from './model'
import { clientLines, clientRoomNames, clientVersionLabel } from './outputs'
import { parseDetection, parseVariants, roomImage, versionsOf, type ShareSnapshot } from './queries'

/**
 * A share link's frozen versions — the AI Visualizer's Share with client (`createShareLink`) and, since pending modules S02, a render shown
 * to the client from Files (`setFilesShown`), read through this one builder so the two never drift. (F102) In the design's order — room by
 * room, V1 before V2 — whatever order they were picked in; (F103) each with the client's own words beside the studio's; (verify round 1)
 * the client compares every design with their own room, never the version it was built on, and reads everything the picture shows.
 */
export type ShareVersionPick = { key: string; room: ProjectRoom; jobId: string; raw: Variant }

export async function buildShareVersions(designId: string, keys: string[]): Promise<{ versions: ShareSnapshot['versions']; picked: ShareVersionPick[] }> {
  const rooms = await db.select().from(projectRooms).where(and(eq(projectRooms.designId, designId), isNull(projectRooms.deletedAt))).orderBy(asc(projectRooms.position), asc(projectRooms.createdAt))
  const jobs = rooms.length ? await db.select().from(renderJobs).where(inArray(renderJobs.roomId, rooms.map((r) => r.id))) : []
  const picked: (ShareVersionPick & { place: number; idx: number; entry: Omit<ShareSnapshot['versions'][number], 'clientLabel' | 'clientRoom'>; applied: Applied })[] = []
  for (const key of keys) {
    const [jobId, vid] = key.split(':')
    const j = jobs.find((x) => x.id === jobId); if (!j) continue
    const place = rooms.findIndex((r) => r.id === j.roomId), room = rooms[place]; if (!room) continue
    const all = versionsOf(jobs.filter((x) => x.roomId === room.id))
    const idx = all.findIndex((x) => x.key === key && !x.deleted), v = all[idx]; if (!v) continue
    const raw = parseVariants(j.variantsJson).find((x) => x.id === Number(vid)); if (!raw) continue
    picked.push({ key, room, place, idx, applied: v.applied, jobId: j.id, raw, entry: { key, roomId: room.id, roomName: room.name, label: v.label, imageUrl: v.imageUrl, beforeUrl: roomImage(room), materials: clientLines(raw, parseDetection(room.detectionJson, room)) } })
  }
  picked.sort((a, b) => a.place - b.place || a.idx - b.idx)
  /* (verify round 1) V2 is "Design 2" on every link, so a client's "Design 2" finds V2; a room's editor-added number goes when it is the
     only room of that name on the link */
  const names = clientRoomNames(picked.map((p) => p.room.name), rooms.map((r) => r.name))
  const versions: ShareSnapshot['versions'] = picked.map((p) => ({ ...p.entry, clientLabel: clientVersionLabel(p.raw.n, p.applied), clientRoom: names.get(p.room.name) ?? p.room.name }))
  return { versions, picked: picked.map(({ key, room, jobId, raw }) => ({ key, room, jobId, raw })) }
}
