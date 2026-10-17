'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, desc, eq, gt, isNull, like } from 'drizzle-orm'
import { db } from '@/lib/db'
import { floorPlanComments, floorPlanConfirmations, floorPlanMarks, floorPlanPictures, leadAssignees, leadFiles, notifications, projectFloorPlans, projects, type FloorPlanMark, type ProjectFloorPlan } from '@/lib/db/schema'
import { DATA_URL, PICTURE_URL, dataUrlSize, imageAddress, keepBytes } from '@/lib/leads/file-store'
import { fileKindOf, mimeFor } from '@/lib/leads/file-model'
import { notify } from '@/lib/notifications/emit'
import { studioRunnerIds } from '@/lib/notifications/queries'
import { portalActor, type PortalVisitor } from '@/lib/portal/session'
import { logProjectEvent } from '@/lib/projects/events'
import { floorPlansFolderOf, marksChangedAt } from '@/lib/projects/floor-plan'
import {
  CLIENT_LAYER, CLIENT_TOOLS, COMMENT_MAX, NAME_MAX, NOTE_MAX, PHOTOS_MAX, PICTURE_MAX, QUIET_MINUTES, cleanShape, isStudioOnly, planNameOf, type MarkShape,
} from '@/lib/projects/floor-plan-model'

/*
 * (gaps build G — calls G-Q6 · G-Q8 · G-Q11 · G-Q14) The client's floor-plan requests. Checked here, on the server, as every portal request is
 * (`portalActor`): the address, Live / Paused, the session, the Floor plan switch — and a write is refused in a studio's preview. Then the plan:
 * one of this visitor's homes, not put away, its project not completed. The client draws a short set (G-Q6: pin, pen, box, arrow, text, photo),
 * always on Client requests, never on Studio only; they move or delete only their own marks; they see — and so answer — no Studio only mark.
 * The project's team hears them on the bell at most once per plan in 15 minutes (1.0's quiet window), and at once for a confirmed layout.
 * Portal actions revalidate no path (round 4b): the page refreshes itself.
 */
type Refusal = { error: string }
const isRefusal = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'error' in x
const PLAN_GONE = 'This plan isn’t there any more'
const MARK_GONE = 'This mark isn’t there any more'
const DONE = 'The project is complete — the floor plan stays as it was'
const OWN_RULE = 'You can move or delete only your own marks'
/** A photo from the client's phone, as their browser shrank it — the cap per photo, in characters of its data URL. */
const PHOTO_MAX = 2_400_000
/** A plan the client sends — its original, in characters of its data URL (~6 MB). */
const PLAN_FILE_MAX = 8_200_000

type Who = { visitor: PortalVisitor }
async function actor(slug: string): Promise<Who | Refusal> {
  const who = await portalActor(slug, { write: true, section: 'floor-plan' })
  return 'error' in who ? who : { visitor: who.visitor }
}
async function forPlan(slug: string, planId: string): Promise<(Who & { plan: ProjectFloorPlan; p: typeof projects.$inferSelect }) | Refusal> {
  const who = await actor(slug); if (isRefusal(who)) return who
  const [row] = await db.select({ plan: projectFloorPlans, p: projects }).from(projectFloorPlans).innerJoin(projects, eq(projects.id, projectFloorPlans.projectId))
    .where(and(eq(projectFloorPlans.id, String(planId ?? '')), isNull(projectFloorPlans.putAwayAt), isNull(projects.deletedAt))).limit(1)
  if (!row || !who.visitor.links.some((l) => l.leadId === row.p.leadId)) return { error: PLAN_GONE }
  if (row.p.stage === 'completed') return { error: DONE }
  return { ...who, ...row }
}
async function forMark(slug: string, markId: string): Promise<(Who & { plan: ProjectFloorPlan; p: typeof projects.$inferSelect; mark: FloorPlanMark }) | Refusal> {
  const [mark] = await db.select().from(floorPlanMarks).where(eq(floorPlanMarks.id, String(markId ?? ''))).limit(1)
  /* a Studio only mark answers as if it were not there — the client never learns it exists */
  if (!mark || isStudioOnly(mark.layer)) return { error: MARK_GONE }
  const c = await forPlan(slug, mark.planId); if (isRefusal(c)) return c
  return { ...c, mark }
}
const own = (c: Who & { mark: FloorPlanMark }) => c.mark.authorKind === 'client' && c.mark.authorId === c.visitor.homeownerId

/** The project's team — and, for a confirmed layout, Owners and Admins too. */
async function teamOf(leadId: string): Promise<string[]> { return (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))).map((r) => r.id) }
const hrefOf = (projectId: string, planId: string, markId?: string) => `/projects/${projectId}/floor-plan?plan=${encodeURIComponent(planId)}${markId ? `&mark=${encodeURIComponent(markId)}` : ''}`
/** (1.0's floor-plan-notify-window) The first mark notifies at once; the client's later ones on the same plan stay quiet for 15 minutes. */
async function tellTeam(c: { p: typeof projects.$inferSelect; plan: ProjectFloorPlan; visitor: PortalVisitor }, what: string, markId?: string) {
  const since = new Date(Date.now() - QUIET_MINUTES * 60_000)
  const href = hrefOf(c.p.id, c.plan.id)
  const [recent] = await db.select({ id: notifications.id }).from(notifications)
    .where(and(eq(notifications.kind, 'floor_plan_client'), like(notifications.href, `${href}%`), gt(notifications.createdAt, since))).limit(1)
  if (recent) return
  await notify('floor_plan_client', await teamOf(c.p.leadId), {
    title: `${c.visitor.name} ${what} on the floor plan`, body: `${c.plan.name} · ${c.p.name}`, href: hrefOf(c.p.id, c.plan.id, markId), leadId: c.p.leadId, actorId: null,
    fields: { '{plan}': c.plan.name, '{comment}': what },
  })
}

/** Files › Floor plans on the client's project — found, or made — where the photos and plans they send are kept with their bytes. */
async function folderFor(leadId: string): Promise<string> {
  const have = await floorPlansFolderOf(leadId)
  if (have) return have
  const id = randomUUID(); const now = new Date()
  await db.insert(leadFiles).values({ id, leadId, kind: 'folder', name: 'Floor plans', thumb: null, createdAt: now, parentId: null, ownerId: null, sizeBytes: null, mime: null, updatedAt: now })
  return id
}
/** The client's photos, kept as files of the project (Files › Floor plans), named by who sent them and when. */
async function keepPhotos(leadId: string, who: string, photos: unknown): Promise<string[] | Refusal> {
  const list = Array.isArray(photos) ? photos.filter((x): x is string => typeof x === 'string') : []
  if (list.length > PHOTOS_MAX) return { error: `Add up to ${PHOTOS_MAX} photos at a time` }
  if (list.some((d) => !PICTURE_URL.test(d) || d.length > PHOTO_MAX)) return { error: 'A photo didn’t read — pick it again' }
  if (!list.length) return []
  const folder = await folderFor(leadId)
  const now = new Date()
  const ids: string[] = []
  await db.transaction(async (tx) => {
    for (const [i, data] of list.entries()) {
      const id = randomUUID()
      const ext = /^data:image\/png/.test(data) ? 'png' : /^data:image\/webp/.test(data) ? 'webp' : 'jpg'
      const name = `Photo from ${who} ${now.toISOString().slice(0, 10)}${list.length > 1 ? ` (${i + 1})` : ''}.${ext}`
      await tx.insert(leadFiles).values({ id, leadId, kind: 'image', name, thumb: imageAddress(id), createdAt: now, parentId: folder, ownerId: null, sizeBytes: dataUrlSize(data), mime: `image/${ext === 'jpg' ? 'jpeg' : ext}`, updatedAt: now })
      await keepBytes(tx, id, data)
      ids.push(id)
    }
  })
  return ids
}

/** (G-Q6) A mark the client draws — pin, pen, box, arrow, text, or a photo pin with the photos they send in the same press. */
export async function clientAddFloorPlanMark(slug: string, planId: string, o: { tool: string; shape: unknown; photos?: string[] }): Promise<{ id: string; at: number } | Refusal> {
  const c = await forPlan(slug, planId); if (isRefusal(c)) return c
  if (!(CLIENT_TOOLS as readonly string[]).includes(String(o?.tool))) return { error: 'That mark is one your designer draws' }
  let shape = (o?.shape ?? {}) as MarkShape
  if (o.tool === 'photo') {
    const kept = await keepPhotos(c.p.leadId, c.visitor.name, o.photos); if (isRefusal(kept)) return kept
    shape = { ...shape, photos: kept }
  }
  const r = cleanShape(o.tool, shape); if ('error' in r) return r
  const id = randomUUID(); const now = new Date()
  await db.insert(floorPlanMarks).values({ id, planId: c.plan.id, projectId: c.p.id, tool: String(o.tool), shape: r.shape, layer: CLIENT_LAYER, authorKind: 'client', authorId: c.visitor.homeownerId, authorName: c.visitor.name, status: 'open', createdAt: now, updatedAt: now })
  await tellTeam(c, o.tool === 'pin' ? 'dropped a pin' : o.tool === 'photo' ? 'added site photos' : 'drew', id)
  return { id, at: now.getTime() }
}

export async function clientMoveFloorPlanMark(slug: string, markId: string, o: { shape: unknown }): Promise<{ before: MarkShape } | Refusal> {
  const c = await forMark(slug, markId); if (isRefusal(c)) return c
  if (c.mark.deletedAt) return { error: MARK_GONE }
  if (!own(c)) return { error: OWN_RULE }
  const before = c.mark.shape as MarkShape
  const r = cleanShape(c.mark.tool, { ...before, points: (o?.shape as MarkShape | undefined)?.points }); if ('error' in r) return r
  if (r.shape.points.length !== before.points.length) return { error: 'Couldn’t move that mark — draw it again' }
  const dx = r.shape.points[0]!.x - before.points[0]!.x, dy = r.shape.points[0]!.y - before.points[0]!.y
  if (r.shape.points.some((p, i) => Math.abs(p.x - before.points[i]!.x - dx) > 0.002 || Math.abs(p.y - before.points[i]!.y - dy) > 0.002)) return { error: 'Couldn’t move that mark — draw it again' }
  await db.update(floorPlanMarks).set({ shape: { ...before, points: r.shape.points }, updatedAt: new Date() }).where(eq(floorPlanMarks.id, markId))
  return { before }
}
export async function clientDeleteFloorPlanMark(slug: string, markId: string): Promise<{ ok: true } | Refusal> {
  const c = await forMark(slug, markId); if (isRefusal(c)) return c
  if (c.mark.deletedAt) return { ok: true }
  if (!own(c)) return { error: OWN_RULE }
  await db.update(floorPlanMarks).set({ deletedAt: new Date(), deletedBy: c.visitor.homeownerId, updatedAt: new Date() }).where(eq(floorPlanMarks.id, markId))
  return { ok: true }
}
export async function clientRestoreFloorPlanMark(slug: string, markId: string): Promise<{ ok: true } | Refusal> {
  const c = await forMark(slug, markId); if (isRefusal(c)) return c
  if (!own(c)) return { error: OWN_RULE }
  await db.update(floorPlanMarks).set({ deletedAt: null, deletedBy: null, updatedAt: new Date() }).where(eq(floorPlanMarks.id, markId))
  return { ok: true }
}
/** Either side resolves or reopens any mark it can see. */
export async function clientSetFloorPlanMarkStatus(slug: string, markId: string, status: 'open' | 'resolved'): Promise<{ before: 'open' | 'resolved' } | Refusal> {
  const c = await forMark(slug, markId); if (isRefusal(c)) return c
  if (c.mark.deletedAt) return { error: MARK_GONE }
  const next = status === 'resolved' ? 'resolved' : 'open'
  const before = c.mark.status === 'resolved' ? 'resolved' : 'open'
  if (before === next) return { before }
  const now = new Date()
  await db.update(floorPlanMarks).set({ status: next, resolvedAt: next === 'resolved' ? now : null, resolvedBy: next === 'resolved' ? c.visitor.name : null, updatedAt: now }).where(eq(floorPlanMarks.id, markId))
  await logProjectEvent(db, c.p.leadId, c.p.id, next === 'resolved' ? 'project_floor_plan_resolved' : 'project_floor_plan_reopened', { name: c.p.name, number: c.p.number, id: c.plan.id, title: c.plan.name, by: 'client', person: c.visitor.name }, { actorId: null })
  return { before }
}
/** (G-Q8) The client's comment on a mark's thread — words, photos (up to 5, sent with it), or both. */
export async function clientCommentOnFloorPlanMark(slug: string, markId: string, o: { body?: string; photos?: string[] }): Promise<{ id: string } | Refusal> {
  const c = await forMark(slug, markId); if (isRefusal(c)) return c
  if (c.mark.deletedAt) return { error: MARK_GONE }
  const body = typeof o?.body === 'string' ? o.body.trim().slice(0, COMMENT_MAX) : ''
  if (!body && !(Array.isArray(o?.photos) && o.photos.length)) return { error: 'Write a comment or add a photo' }
  const photos = await keepPhotos(c.p.leadId, c.visitor.name, o.photos); if (isRefusal(photos)) return photos
  const id = randomUUID(); const now = new Date()
  await db.transaction(async (tx) => {
    await tx.insert(floorPlanComments).values({ id, markId, body, photos: photos.length ? photos : null, authorKind: 'client', authorId: c.visitor.homeownerId, authorName: c.visitor.name, createdAt: now })
    await tx.update(floorPlanMarks).set({ updatedAt: now }).where(eq(floorPlanMarks.id, markId))
  })
  await tellTeam(c, body ? `commented “${body.length > 80 ? `${body.slice(0, 79)}…` : body}”` : 'added photos', markId)
  return { id }
}

/**
 * (G-Q11) Confirm this layout — an append-only record (1.0 F-233): who (their name and phone as they are now), when, their note, the plan, and
 * the plan's newest mark change at that moment. Confirmed in the portal, signed in with their phone — never called a signature. The team
 * and the studio's Owners and Admins hear it at once.
 */
export async function confirmFloorPlanLayout(slug: string, planId: string, o: { note?: string }): Promise<{ id: string; at: number } | Refusal> {
  const c = await forPlan(slug, planId); if (isRefusal(c)) return c
  const note = typeof o?.note === 'string' ? o.note.replace(/\s+/g, ' ').trim() : ''
  if (note.length > NOTE_MAX) return { error: `Keep your note to ${NOTE_MAX} characters` }
  const [last] = await db.select().from(floorPlanConfirmations).where(eq(floorPlanConfirmations.projectId, c.p.id)).orderBy(desc(floorPlanConfirmations.createdAt)).limit(1)
  const changed = await marksChangedAt(c.plan.id)
  if (last && last.planId === c.plan.id && (last.marksAt?.getTime() ?? 0) >= changed && !note) return { error: 'You confirmed this layout already — nothing has changed since' }
  const id = randomUUID(); const now = new Date()
  await db.transaction(async (tx) => {
    await tx.insert(floorPlanConfirmations).values({ id, planId: c.plan.id, projectId: c.p.id, homeownerId: c.visitor.homeownerId, name: c.visitor.name, phone: c.visitor.phone || null, note: note || null, method: 'portal', marksAt: changed ? new Date(changed) : null, createdAt: now })
    await logProjectEvent(tx, c.p.leadId, c.p.id, 'project_floor_plan_confirmed', { name: c.p.name, number: c.p.number, id: c.plan.id, title: c.plan.name, note: note || null, by: 'client', person: c.visitor.name }, { actorId: null })
  })
  await notify('floor_plan_confirmed', [...await teamOf(c.p.leadId), ...await studioRunnerIds()], {
    title: `${c.visitor.name} confirmed the layout`, body: `${c.plan.name}${note ? ` · “${note.length > 100 ? `${note.slice(0, 99)}…` : note}”` : ''}`, href: hrefOf(c.p.id, c.plan.id), leadId: c.p.leadId, actorId: null,
    fields: { '{plan}': c.plan.name, '{note}': note ? `They wrote: “${note}”` : '' },
  })
  revalidatePath(`/projects/${c.p.id}/floor-plan`)
  return { id, at: now.getTime() }
}

/**
 * The client sends a plan (1.0: a homeowner's upload never becomes Primary): the original kept with its bytes in Files › Floor plans, the picture
 * to mark up beside it. Never the main plan — the studio decides that. The team hears it.
 */
export async function clientAddFloorPlan(slug: string, o: { homeId: string; name: string; data: string; picture: string; width: number; height: number }): Promise<{ id: string } | Refusal> {
  const who = await actor(slug); if (isRefusal(who)) return who
  const link = who.visitor.links.find((l) => l.linkId === o?.homeId) ?? who.visitor.links[0]
  if (!link) return { error: 'This home isn’t one of yours' }
  const [p] = await db.select().from(projects).where(and(eq(projects.leadId, link.leadId), isNull(projects.deletedAt))).limit(1)
  if (!p) return { error: 'Your project isn’t open yet — your designer will add the plan' }
  if (p.stage === 'completed') return { error: DONE }
  const m = DATA_URL.exec(typeof o.data === 'string' ? o.data : '')
  if (!m || o.data.length > PLAN_FILE_MAX) return { error: 'The plan didn’t read — a picture or a PDF up to 6 MB fits' }
  if (typeof o.picture !== 'string' || !PICTURE_URL.test(o.picture) || o.picture.length > PICTURE_MAX) return { error: 'The plan didn’t read — pick it again' }
  const w = Math.round(Number(o.width)), h = Math.round(Number(o.height))
  if (!(w >= 50 && w <= 10000 && h >= 50 && h <= 10000)) return { error: 'The plan didn’t read — pick it again' }
  const fileName = (typeof o.name === 'string' ? o.name : '').replace(/[\\/]/g, '-').trim().slice(0, 200) || 'Floor plan'
  const mime = mimeFor(fileName, m[1]!)
  const kind = fileKindOf(fileName, mime)
  if (kind !== 'image' && kind !== 'pdf') return { error: 'A plan is a picture or a PDF' }
  const folder = await folderFor(p.leadId)
  const fileId = randomUUID(), id = randomUUID(), now = new Date()
  const name = planNameOf(fileName).slice(0, NAME_MAX)
  const [first] = await db.select({ id: projectFloorPlans.id }).from(projectFloorPlans).where(and(eq(projectFloorPlans.projectId, p.id), isNull(projectFloorPlans.putAwayAt))).limit(1)
  await db.transaction(async (tx) => {
    await tx.insert(leadFiles).values({ id: fileId, leadId: p.leadId, kind, name: fileName, thumb: kind === 'image' ? imageAddress(fileId) : null, createdAt: now, parentId: folder, ownerId: null, sizeBytes: dataUrlSize(o.data), mime, updatedAt: now })
    await keepBytes(tx, fileId, o.data)
    /* the first plan on the project is its main one whoever sends it — there is nothing else to open on */
    await tx.insert(projectFloorPlans).values({ id, projectId: p.id, leadId: p.leadId, name, fileId, width: w, height: h, isMain: !first, addedByKind: 'client', addedBy: who.visitor.homeownerId, addedByName: who.visitor.name, createdAt: now, updatedAt: now })
    await tx.insert(floorPlanPictures).values({ planId: id, data: o.picture })
    await logProjectEvent(tx, p.leadId, p.id, 'project_floor_plan_added', { name: p.name, number: p.number, id, title: name, by: 'client', person: who.visitor.name }, { actorId: null })
  })
  const [plan] = await db.select().from(projectFloorPlans).where(eq(projectFloorPlans.id, id)).limit(1)
  if (plan) await tellTeam({ p, plan, visitor: who.visitor }, 'sent a floor plan')
  revalidatePath(`/projects/${p.id}/floor-plan`)
  return { id }
}

