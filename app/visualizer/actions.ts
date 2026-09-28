'use server'

import { randomBytes, randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, desc, eq, inArray, isNotNull, isNull, like, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadEvents, leadFileImages, libraryFolders, leadFileRenders, leadFiles, leads, members, priceBookItems, projectRooms, quoteItems, quotes, renderAnnotations, renderImages, renderJobs, renderShareLinks, studioMaterials, visualizerDesigns, type ProjectRoom } from '@/lib/db/schema'
import { actingMember } from '@/lib/contracts/automation'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { logLeadEvent, type LeadEventDetail, type LeadEventKind } from '@/lib/leads/events'
import { sampleByKey } from '@/lib/visualizer/samples'
import { displayDayShortMonth } from '@/lib/format'
import { descriptor, ORIGINAL, readPending, sampleDetection, versionKey, type Applied, type Detection, type Finishes, type Pending, type PassKind, type Variant } from '@/lib/visualizer/model'
import { DESIGN_PURGE_RULE, designChangeBlock, designPurgeRule, designRestoreRule, DESIGNS_DELETE_RULE, DESIGNS_RESTORE_RULE, LEAD_CLOSED_SHARE, leadDeletedNote, PIN_CHARS, PIN_LIMIT, roomChangeBlock, roomDeleteBlock, SHARE_DAYS, SHARE_MAX_VERSIONS } from '@/lib/visualizer/policy'
import { gateLead, leadClosed, parseComments, parseDetection, parseJson, parseOwnStored, parseVariants, roomImage, versionsOf, type ShareSnapshot, type StoredSwatch } from '@/lib/visualizer/queries'
import { assetAddress, assetIdOf, dataUrlBytes, isAddress, isDataImage, liftPictures, parseAssets, publicFileSize, renderAddress, renderPicture } from '@/lib/visualizer/images'
import { clientLines, clientRoomNames, clientVersionLabel, freeFileName, noQuoteReason, quoteGroupName, quoteLines, renderFileName, studioMaterialOf } from '@/lib/visualizer/outputs'
import { roomNameFromFile } from '@/lib/visualizer/room-name'
import { isRateUnit } from '@/lib/settings/types'
import type { OwnSwatch } from '@/lib/visualizer/materials'
import { createQuote } from '@/app/leads/quotes-actions'
import { createQuoteItem, createQuoteItems, type BulkLine } from '@/app/quotes/items-actions'

/*
 * AI Visualizer (REG-673 · 674 · 675) — the studio's writes. Every write names who made it (`actingMember`, REG-634's stamp); a lead's
 * design follows Who sees leads; a design is renamed or deleted by its maker, an Owner or an Admin (Q-24). Removes are soft and come
 * back through Undo (Q-11). Rules a person must read come back as `{ error }` (a production action's thrown message never reaches the
 * page — the accounts-setup lesson).
 *
 * (audit 2026-09-26) Every restore goes through the same door as its delete (F129 · F204); a room goes by its own rule (F076 · F202); a
 * lead's AI Visualizer removals and link stops leave their line in Activity (F106 · F207); pictures are stored beside their records, not
 * inside the JSON a page reads (F200 · F213); a render filed in Files is found again by what it is and keeps its own picture (F093 · F194).
 */

type Err = { error: string }
/** (verify round 1, F129 · F204) A many-at-once remove or restore the rule refused in part says how many stayed and why — never a bare
    success when nothing moved (a refusal of every one is an `Err`). */
type Kept = { kept: number; reason: string | null }
const now = () => new Date()
const makerName = async (id: string | null | undefined) => (id ? (await db.select({ name: members.name }).from(members).where(eq(members.id, id)))[0]?.name ?? null : null)
const touch = (designId: string, leadId?: string | null) => {
  revalidatePath('/visualizer')
  revalidatePath(`/visualizer/${designId}`)
  if (leadId) revalidatePath(`/leads/${leadId}`, 'layout')
}
const cleanName = (v: unknown, max = 80) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const spaced = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
/** A picture the studio or the engine made (a data URL), or one of the sample rooms' own. */
const cleanImage = (v: unknown): string | null => {
  const s = String(v ?? '')
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 11_000_000) return s
  if (/^\/visualizer\/(samples\/[a-z-]+|demo)\/[a-z0-9-]+\.jpg$/.test(s)) return s   // the sample rooms' pictures and the demo's pre-rendered ones (R61)
  return null
}
const isDetection = (d: unknown): d is Detection => !!d && typeof d === 'object' && Array.isArray((d as Detection).surfaces)

/** (two members, critic §9) One Generate of a room at a time, in this server: the next waits for the one before, so each is numbered after it
    (V4 then V5, never V4 twice). In-process on purpose — libsql answers a second write transaction with "database is locked" at once, and
    retrying one can leave a lock behind. */
const queues = new Map<string, Promise<unknown>>()
function oneAtATime<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const run = (queues.get(key) ?? Promise.resolve()).then(fn, fn)
  const tail = run.catch(() => undefined)
  queues.set(key, tail)
  void tail.then(() => { if (queues.get(key) === tail) queues.delete(key) })
  return run
}

async function designFor(designId: string, write = true) {
  const [d] = await db.select().from(visualizerDesigns).where(eq(visualizerDesigns.id, designId))
  if (!d) return null
  const viewer = await fetchViewer()
  const gate = gateLead(d)   // (F115) a personal copy answers to the lead it came from
  if (gate && !(await canOpenLead(viewer, gate))) return null
  if (write && d.deletedAt) return null
  return { d, viewer }
}
async function roomFor(roomId: string, opts: { deleted?: boolean } = {}) {
  const [r] = await db.select().from(projectRooms).where(eq(projectRooms.id, roomId))
  if (!r || (r.deletedAt && !opts.deleted)) return null
  const got = await designFor(r.designId)
  return got ? { r, ...got } : null
}

/* ── the lead's trail (F106 · F207) ── */
const UNDO_MS = 120_000   // a restore this soon after its delete is the snackbar's Undo
async function trail(leadId: string | null, kind: LeadEventKind, detail: LeadEventDetail) { if (leadId) await logLeadEvent(db, leadId, kind, detail) }
/** A restore: right after its delete (the Undo) it takes the delete's line away, as undoStageMove does; later it has its own line. */
async function untrail(leadId: string | null, deleted: LeadEventKind, restored: LeadEventKind, detail: LeadEventDetail & { id: string }) {
  if (!leadId) return
  const rows = await db.select({ id: leadEvents.id, at: leadEvents.at, detail: leadEvents.detail }).from(leadEvents).where(and(eq(leadEvents.leadId, leadId), eq(leadEvents.kind, deleted))).orderBy(desc(leadEvents.at))
  const hit = rows.find((e) => (e.detail as LeadEventDetail | null)?.id === detail.id)
  if (hit && Date.now() - hit.at.getTime() < UNDO_MS) await db.delete(leadEvents).where(eq(leadEvents.id, hit.id))
  else await logLeadEvent(db, leadId, restored, detail)
}

/* ── designs ── */
/** New design — a personal one (1.0's *Blank design*), named like 1.0's "Design · 25 Sep" (F128: the house's months, never the server's
    locale), in the folder open in the gallery when that is a live AI Visualizer folder (F128). (F214) A start from a sample room is the
    design and its first room in one step — both land, or neither does. */
export async function createDesign(input: { name?: string; folderId?: string | null; sample?: { key: string; asSketch: boolean } } = {}): Promise<{ id: string } | Err> {
  const me = await actingMember()
  const id = randomUUID(), at = now()
  const sample = input.sample ? sampleByKey(input.sample.key) : null
  if (input.sample && !sample) return { error: 'That sample room is gone.' }
  const name = cleanName(input.name) || await dayName(at)
  const folderId = input.folderId ? ((await db.select({ id: libraryFolders.id }).from(libraryFolders).where(and(eq(libraryFolders.id, input.folderId), eq(libraryFolders.library, 'visualizer'), isNull(libraryFolders.deletedAt))))[0]?.id ?? null) : null
  const room = sample ? roomRow(id, null, { imageUrl: '', sampleKey: sample.key, asSketch: !!input.sample?.asSketch }, [], me, at) : null
  if (room && 'error' in room) return room
  await db.transaction(async (tx) => {
    await tx.insert(visualizerDesigns).values({ id, kind: 'personal', leadId: null, name, folderId, customJson: null, createdBy: me, createdAt: at, updatedAt: at })
    if (room) await tx.insert(projectRooms).values(room)
  })
  revalidatePath('/visualizer')
  return { id }
}

/** (verify round 1) A blank design's name — "Design · 26 Sep", then "Design · 26 Sep (2)": two made the same day never read the same. */
async function dayName(at: Date): Promise<string> {
  const base = `Design · ${displayDayShortMonth(at)}`
  const taken = new Set((await db.select({ name: visualizerDesigns.name }).from(visualizerDesigns).where(and(eq(visualizerDesigns.kind, 'personal'), like(visualizerDesigns.name, `${base}%`)))).map((d) => d.name))
  if (!taken.has(base)) return base
  let k = 2
  while (taken.has(`${base} (${k})`)) k++
  return `${base} (${k})`
}

export async function openLeadDesign(leadId: string): Promise<{ id: string } | Err> {
  const viewer = await fetchViewer()
  const [lead] = await db.select({ id: leads.id, name: leads.name }).from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt)))
  if (!lead || !(await canOpenLead(viewer, leadId))) return { error: 'That lead is gone or not yours to open.' }
  const find = async () => (await db.select().from(visualizerDesigns).where(and(eq(visualizerDesigns.leadId, leadId), eq(visualizerDesigns.kind, 'lead'))))[0] ?? null
  const d = await find()
  if (d) {
    /* opening the lead's design brings it back — (F129) when this member may restore it; anyone else sees it as deleted */
    if (d.deletedAt && !designChangeBlock(viewer, d.createdBy)) {
      await db.update(visualizerDesigns).set({ deletedAt: null, deletedBy: null }).where(eq(visualizerDesigns.id, d.id))
      await untrail(leadId, 'design_deleted', 'design_restored', { id: d.id, name: lead.name })
      touch(d.id, leadId)
    }
    return { id: d.id }
  }
  const id = randomUUID(), at = now()
  await db.insert(visualizerDesigns).values({ id, kind: 'lead', leadId, name: lead.name, folderId: null, customJson: null, createdBy: viewer.id, createdAt: at, updatedAt: at }).onConflictDoNothing()
  const made = await find()
  if (!made) return { error: 'Couldn’t open the lead’s design — please try again.' }
  if (made.id === id) revalidatePath('/visualizer')
  return { id: made.id }
}

export async function renameDesign(designId: string, name: string): Promise<{ ok: true } | Err> {
  const got = await designFor(designId); if (!got) return { error: 'That design is gone.' }
  if (got.d.kind === 'lead') return { error: 'A lead’s design is named after the lead.' }
  const block = designChangeBlock(got.viewer, got.d.createdBy, await makerName(got.d.createdBy)); if (block) return { error: block }
  const n = spaced(name); if (!n) return { error: 'Give the design a name.' }
  if (n.length > 80) return { error: 'Keep the design’s name to 80 characters.' }   // (F083) never cut without saying so
  if (n === got.d.name) return { ok: true }
  await db.update(visualizerDesigns).set({ name: n, updatedAt: now() }).where(eq(visualizerDesigns.id, designId))
  touch(designId); return { ok: true }
}

/** Duplicate — (F116) the rooms with every version as it is (numbers, parents, deleted ones kept so V4 stays V4), the design's own swatches
    and the rooms' picks; never the links, the client's answers or the pins, which belong to what was sent. (F115) A copy of a lead's design
    keeps that lead as its source, so it follows Who sees leads as the original does. */
export async function duplicateDesign(designId: string): Promise<{ id: string; rooms: number; renders: number } | Err> {
  const got = await designFor(designId, false); if (!got) return { error: 'That design is gone.' }
  const me = await actingMember(), at = now(), id = randomUUID()
  const lead = got.d.leadId ? (await db.select({ name: leads.name }).from(leads).where(eq(leads.id, got.d.leadId)))[0] : null
  const rooms = await db.select().from(projectRooms).where(and(eq(projectRooms.designId, designId), isNull(projectRooms.deletedAt)))
  const jobs = rooms.length ? await db.select().from(renderJobs).where(inArray(renderJobs.roomId, rooms.map((r) => r.id))) : []
  const pics = jobs.length ? await db.select().from(renderImages).where(inArray(renderImages.jobId, jobs.map((j) => j.id))) : []
  const roomMap = new Map(rooms.map((r) => [r.id, randomUUID()]))
  const jobMap = new Map(jobs.map((j) => [j.id, randomUUID()]))
  const rekey = (k: string) => { const [j, v] = k.split(':'); const nj = j ? jobMap.get(j) : undefined; return nj && v ? `${nj}:${v}` : k }
  const own = parseOwnStored(got.d.customJson).filter((s) => !s.removedAt)
  let renders = 0
  await db.transaction(async (tx) => {
    await tx.insert(visualizerDesigns).values({ id, kind: 'personal', leadId: null, sourceLeadId: gateLead(got.d), name: `${(lead?.name ?? got.d.name).slice(0, 80 - ' (copy)'.length).trimEnd()} (copy)`, folderId: got.d.kind === 'personal' ? got.d.folderId : null, customJson: own.length ? JSON.stringify(own) : null, createdBy: me, createdAt: at, updatedAt: at })
    for (const r of rooms) {
      const nr = roomMap.get(r.id)!
      const state = r.stateJson ? r.stateJson.split(`/visualizer/img/a/${r.id}/`).join(`/visualizer/img/a/${nr}/`) : null   // its picks' photos live in the copy's own store
      await tx.insert(projectRooms).values({ ...r, id: nr, designId: id, leadId: null, stateJson: state, stateRev: 0, priorPhotoJson: null, createdBy: me, createdAt: at, updatedAt: at })
    }
    for (const j of jobs) {
      const nj = jobMap.get(j.id)!
      const vs = parseVariants(j.variantsJson).map((v) => ({ ...v, imageUrl: isAddress(v.imageUrl) ? renderAddress(nj, v.id) : v.imageUrl, parentKey: v.parentKey === ORIGINAL ? ORIGINAL : rekey(v.parentKey) }))
      renders += vs.filter((v) => !v.deletedAt).length
      await tx.insert(renderJobs).values({ ...j, id: nj, roomId: roomMap.get(j.roomId)!, leadId: null, variantsJson: JSON.stringify(vs) })
    }
    for (const p of pics) await tx.insert(renderImages).values({ jobId: jobMap.get(p.jobId)!, variantId: p.variantId, data: p.data })
  })
  revalidatePath('/visualizer')
  return { id, rooms: rooms.length, renders }
}

/** Delete — soft, with Undo and the Deleted sheet (REG-502's rule; 1.0 deleted for good, A B-21). (verify round 1) Several at once: the
    ones the rule keeps are counted, with why; when it keeps every one, that is the answer. */
export async function deleteDesigns(ids: string[]): Promise<{ deleted: number } & Kept | Err> {
  const me = await actingMember(), all = [...new Set(ids)]
  let n = 0, kept = 0, one: string | null = null
  for (const id of all) {
    const got = await designFor(id); if (!got) continue
    const block = designChangeBlock(got.viewer, got.d.createdBy, await makerName(got.d.createdBy), got.d.kind === 'lead'); if (block) { kept++; one = block; continue }
    await db.update(visualizerDesigns).set({ deletedAt: now(), deletedBy: me }).where(eq(visualizerDesigns.id, id)); n++
    await trail(got.d.leadId, 'design_deleted', { id, name: got.d.name })
    touch(id, got.d.leadId)
  }
  /* a refusal reads as the rule itself, so the page's "Couldn’t delete the designs — only whoever made a design…" says it once */
  if (!n && kept) return { error: all.length === 1 && one ? one : DESIGNS_DELETE_RULE }
  return { deleted: n, kept, reason: kept ? DESIGNS_DELETE_RULE : null }
}
/** Restore (the snackbar's Undo, the Deleted sheet) — (F129 · F204) the delete's own rule, in its own words (verify round 1), and (F125)
    the design back where it was: its `updatedAt` untouched, so it keeps its place and its "edited" line. */
export async function restoreDesigns(ids: string[]): Promise<{ restored: number } & Kept | Err> {
  const all = [...new Set(ids)]
  let n = 0, kept = 0, one: string | null = null
  for (const id of all) {
    const got = await designFor(id, false)
    if (!got) { if (all.length === 1) return { error: 'That design is gone.' }; continue }
    if (!got.d.deletedAt) continue
    if (designChangeBlock(got.viewer, got.d.createdBy)) { kept++; one = designRestoreRule(await makerName(got.d.createdBy)); continue }
    await db.update(visualizerDesigns).set({ deletedAt: null, deletedBy: null }).where(eq(visualizerDesigns.id, id)); n++
    await untrail(got.d.leadId, 'design_deleted', 'design_restored', { id, name: got.d.name })
    touch(id, got.d.leadId)
  }
  if (!n && kept) return { error: all.length === 1 && one ? one : DESIGNS_RESTORE_RULE }
  return { restored: n, kept, reason: kept ? DESIGNS_RESTORE_RULE : null }
}
/** (F093) The renders filed from these designs keep their pictures when the designs go for good: each file gets its own copy. */
async function adoptFiledRenders(designIds: string[]): Promise<void> {
  const rooms = designIds.length ? await db.select({ id: projectRooms.id }).from(projectRooms).where(inArray(projectRooms.designId, designIds)) : []
  const jobs = rooms.length ? await db.select({ id: renderJobs.id }).from(renderJobs).where(inArray(renderJobs.roomId, rooms.map((r) => r.id))) : []
  if (!jobs.length) return
  const mine = new Set(jobs.map((j) => j.id))
  const files = await db.select({ id: leadFiles.id, thumb: leadFiles.thumb }).from(leadFiles).where(like(leadFiles.thumb, '/visualizer/img/v/%'))
  for (const f of files) {
    const [, , , , jobId, vid] = (f.thumb ?? '').split('?')[0]!.split('/')
    if (!jobId || !mine.has(jobId)) continue
    const pic = await renderPicture(jobId, Number(vid))
    if (!pic) continue
    if (isDataImage(pic)) {
      await db.insert(leadFileImages).values({ fileId: f.id, data: pic }).onConflictDoNothing()
      await db.update(leadFiles).set({ thumb: `/files/img/${f.id}` }).where(eq(leadFiles.id, f.id))
    } else await db.update(leadFiles).set({ thumb: pic }).where(eq(leadFiles.id, f.id))
  }
}
/** Delete forever — (F204) the delete's rule and Who sees leads; (verify round 1, F129) what the rule keeps is counted, with why, and a
    refusal of every one is the answer rather than "deleted 0". The files filed from it keep their record (`renderOrigins` says the design
    is gone, so Files shows where the picture came from as plain text). */
export async function deleteDesignsForever(ids: string[]): Promise<{ deleted: number } & Kept | Err> {
  const viewer = await fetchViewer()
  const rows = ids.length ? await db.select().from(visualizerDesigns).where(inArray(visualizerDesigns.id, [...new Set(ids)])) : []
  const ok: typeof rows = []
  let kept = 0
  let gone = ids.length === 1 && !rows.length
  for (const d of rows) {
    const gate = gateLead(d)
    if (!d.deletedAt || (gate && !(await canOpenLead(viewer, gate)))) { gone = true; continue }   // (F204) Who sees leads here too
    if (designChangeBlock(viewer, d.createdBy)) { kept++; continue }
    ok.push(d)
  }
  if (!ok.length) return kept ? { error: kept === 1 && rows.length === 1 ? designPurgeRule(await makerName(rows[0]!.createdBy)) : DESIGN_PURGE_RULE } : gone ? { error: 'That design is gone.' } : { deleted: 0, kept: 0, reason: null }
  await adoptFiledRenders(ok.map((d) => d.id))
  for (const d of ok) await trail(d.leadId, 'design_purged', { id: d.id, name: d.name })   // (F093) the lead's history says so; the rows go
  await db.delete(visualizerDesigns).where(inArray(visualizerDesigns.id, ok.map((d) => d.id)))   // rooms, renders, links, pins cascade
  revalidatePath('/visualizer')
  for (const d of ok) if (d.leadId) revalidatePath(`/leads/${d.leadId}`, 'layout')
  return { deleted: ok.length, kept, reason: kept ? DESIGN_PURGE_RULE : null }
}
/** Empty Trash — every deleted design this member may see; (verify round 1, F129) the ones the rule keeps are counted, with why, and
    when it keeps all of them nothing is claimed. */
export async function emptyDesignTrash(): Promise<{ deleted: number } & Kept | Err> {
  const viewer = await fetchViewer()
  const rows = await db.select({ id: visualizerDesigns.id, leadId: visualizerDesigns.leadId, sourceLeadId: visualizerDesigns.sourceLeadId }).from(visualizerDesigns).where(isNotNull(visualizerDesigns.deletedAt))
  const seen: string[] = []
  for (const d of rows) { const gate = gateLead(d); if (!gate || await canOpenLead(viewer, gate)) seen.push(d.id) }
  if (!seen.length) return { deleted: 0, kept: 0, reason: null }
  const r = await deleteDesignsForever(seen)
  if ('error' in r) return { error: r.error === 'That design is gone.' ? r.error : DESIGN_PURGE_RULE }   // the one deleted design someone else made: the rule, not "that design"'s
  return r
}

/* ── rooms ── */
export type NewRoom = { name?: string; imageUrl: string; sampleKey?: string | null; sourceFileId?: string | null; detection?: Detection | null; asSketch?: boolean }
/** A photo becomes a room (1.0's *Upload new room*, B-26): an upload, a sample room, or one of the lead's files (Q-31). */
export async function addRoom(designId: string, input: NewRoom): Promise<{ roomId: string } | Err> {
  const got = await designFor(designId); if (!got) return { error: 'That design is gone.' }
  const rooms = await db.select({ name: projectRooms.name, position: projectRooms.position }).from(projectRooms).where(and(eq(projectRooms.designId, designId), isNull(projectRooms.deletedAt)))
  const at = now()
  /* (D4) a room made from one of the lead's files, sent without a name, is named from the file as the editor names an upload */
  let name = input.name
  if (!cleanName(name) && input.sourceFileId && got.d.leadId) {
    const [f] = await db.select({ name: leadFiles.name }).from(leadFiles).where(and(eq(leadFiles.id, input.sourceFileId), eq(leadFiles.leadId, got.d.leadId)))
    name = f ? roomNameFromFile(f.name) ?? undefined : undefined
  }
  const row = roomRow(designId, got.d.leadId, { ...input, name }, rooms, await actingMember(), at)
  if ('error' in row) return row
  await db.insert(projectRooms).values(row)
  await db.update(visualizerDesigns).set({ updatedAt: at }).where(eq(visualizerDesigns.id, designId))
  touch(designId, got.d.leadId)
  return { roomId: row.id }
}
/** A new room's row — its picture (a sample's, or a clean upload), its reading and a name no other live room of the design has. Shared by
    Add room and a sample start (F214). The name: the one given (the editor reads an upload's file name, `roomNameFromFile`), a sample's,
    else "Room n" — n the first number no room of the design has. */
function roomRow(designId: string, leadId: string | null, input: NewRoom, rooms: { name: string; position: number }[], me: string, at: Date): typeof projectRooms.$inferInsert & { id: string } | Err {
  const sample = sampleByKey(input.sampleKey ?? null)
  const image = sample ? (input.asSketch && sample.sketch ? sample.sketch : sample.original) : cleanImage(input.imageUrl)
  if (!image) return { error: 'We can read JPG, PNG and WebP photos up to 10 MB.' }
  const detection = sample ? sampleDetection(sample, !!input.asSketch) : isDetection(input.detection) ? input.detection : null
  let free = rooms.length + 1
  while (rooms.some((r) => r.name.toLowerCase() === `room ${free}`)) free++
  const base = cleanName(input.name, 60) || (sample ? (input.asSketch ? `${sample.name} sketch` : sample.name) : `Room ${free}`)
  let name = base, k = 2
  while (rooms.some((r) => r.name.toLowerCase() === name.toLowerCase())) name = `${base} ${k++}`
  return { id: randomUUID(), designId, leadId, projectId: null, name, originalImageUrl: image, sampleKey: sample?.key ?? null, sourceFileId: input.sourceFileId ?? null, detectionJson: detection ? JSON.stringify(detection) : null, stateJson: null, position: rooms.reduce((m, r) => Math.max(m, r.position + 1), 0), createdBy: me, createdAt: at, updatedAt: at }
}

/** Rename — (F083) a name another room of the design has is refused (Add room numbers its defaults, a typed name is the studio's own), and
    a name past 60 characters is refused rather than cut. */
export async function renameRoom(roomId: string, name: string): Promise<{ ok: true } | Err> {
  const got = await roomFor(roomId); if (!got) return { error: 'That room is gone.' }
  const block = roomChangeBlock(got.viewer, got.r.createdBy, got.d.createdBy); if (block) return { error: block }   // (wave E, E12) the Delete-room rule
  const n = spaced(name); if (!n) return { error: 'Give the room a name.' }
  if (n.length > 60) return { error: 'Keep the room’s name to 60 characters.' }
  if (n === got.r.name) return { ok: true }
  const others = await db.select({ id: projectRooms.id, name: projectRooms.name }).from(projectRooms).where(and(eq(projectRooms.designId, got.d.id), isNull(projectRooms.deletedAt)))
  const twin = others.find((r) => r.id !== roomId && r.name.toLowerCase() === n.toLowerCase())
  if (twin) return { error: `There’s already a room called ${twin.name}.` }   // (F083) the room as it is spelled, not as typed
  await db.update(projectRooms).set({ name: n, updatedAt: now() }).where(eq(projectRooms.id, roomId))
  touch(got.d.id, got.d.leadId); return { ok: true }
}
/** Delete a room — soft, the snackbar's Undo brings it back with its renders (1.0 used a native confirm and deleted for good, C-134);
    (F076 · F202) by its maker, the design's maker, an Owner or an Admin. */
export async function deleteRoom(roomId: string): Promise<{ ok: true } | Err> {
  const got = await roomFor(roomId); if (!got) return { error: 'That room is gone.' }
  const block = roomDeleteBlock(got.viewer, got.r.createdBy, got.d.createdBy); if (block) return { error: block }
  await db.update(projectRooms).set({ deletedAt: now() }).where(eq(projectRooms.id, roomId))
  await trail(got.d.leadId, 'room_deleted', { id: roomId, room: got.r.name, designId: got.d.id })
  touch(got.d.id, got.d.leadId); return { ok: true }
}
export async function restoreRoom(roomId: string): Promise<{ ok: true } | Err> {
  const got = await roomFor(roomId, { deleted: true }); if (!got) return { error: 'That room is gone.' }
  if (!got.r.deletedAt) return { ok: true }
  const block = roomDeleteBlock(got.viewer, got.r.createdBy, got.d.createdBy); if (block) return { error: block }
  await db.update(projectRooms).set({ deletedAt: null }).where(eq(projectRooms.id, roomId))
  await untrail(got.d.leadId, 'room_deleted', 'room_restored', { id: roomId, room: got.r.name, designId: got.d.id })
  touch(got.d.id, got.d.leadId); return { ok: true }
}
const liveRenders = async (roomId: string) => (await db.select({ variantsJson: renderJobs.variantsJson }).from(renderJobs).where(eq(renderJobs.roomId, roomId))).some((j) => parseVariants(j.variantsJson).some((v) => !v.deletedAt))
type PriorPhoto = Pick<ProjectRoom, 'originalImageUrl' | 'sampleKey' | 'sourceFileId' | 'detectionJson' | 'stateJson'>
/** Change photo — only while the room has no renders (they were made of the old photo, 1.0 B-38). (F090) The room as it was is kept, so
    the snackbar's Undo puts it all back: the photo, a sample's own reading and the picks. */
/* (audit 2026-09-26, F205) a long string travels inside an object: React's action decoder counts a bare string argument against a
   1,000,000 limit whenever the action takes more than one argument, so a ~730 KB photo failed with a 500 */
export async function setRoomPhoto(roomId: string, o: { imageUrl: string; detection: Detection }): Promise<{ ok: true; stateRev: number } | Err> {
  const { imageUrl, detection } = o
  const got = await roomFor(roomId); if (!got) return { error: 'That room is gone.' }
  const block = roomChangeBlock(got.viewer, got.r.createdBy, got.d.createdBy); if (block) return { error: block }   // (wave E, E12) the Delete-room rule
  if (await liveRenders(roomId)) return { error: 'This room has renders made of its photo — add a new room for another photo.' }
  const image = cleanImage(imageUrl); if (!image) return { error: 'We can read JPG, PNG and WebP photos up to 10 MB.' }
  if (!isDetection(detection)) return { error: 'Couldn’t read that photo — please try another.' }
  const prior: PriorPhoto = { originalImageUrl: got.r.originalImageUrl, sampleKey: got.r.sampleKey, sourceFileId: got.r.sourceFileId, detectionJson: got.r.detectionJson, stateJson: got.r.stateJson }
  await db.update(projectRooms).set({ originalImageUrl: image, sampleKey: null, sourceFileId: null, detectionJson: JSON.stringify(detection), stateJson: null, priorPhotoJson: JSON.stringify(prior), stateRev: sql`${projectRooms.stateRev} + 1`, updatedAt: now() }).where(eq(projectRooms.id, roomId))
  const [r] = await db.select({ stateRev: projectRooms.stateRev }).from(projectRooms).where(eq(projectRooms.id, roomId))
  touch(got.d.id, got.d.leadId); return { ok: true, stateRev: r?.stateRev ?? 0 }
}
/** (F090) Undo a Change photo: the room as it was — its photo, its reading and the picks it had. */
export async function undoRoomPhoto(roomId: string): Promise<{ ok: true; imageUrl: string | null; detection: Detection; pending: Pending; stateRev: number } | Err> {
  const got = await roomFor(roomId); if (!got) return { error: 'That room is gone.' }
  const block = roomChangeBlock(got.viewer, got.r.createdBy, got.d.createdBy); if (block) return { error: block }   // (wave E, E12) the Undo goes through the change's door
  const prior = parseJson<PriorPhoto | null>(got.r.priorPhotoJson, null)
  if (!prior || typeof prior !== 'object') return { error: 'There’s no earlier photo to put back.' }
  if (await liveRenders(roomId)) return { error: 'This room has renders of the new photo now — add a new room for the old one.' }
  await db.update(projectRooms).set({ originalImageUrl: prior.originalImageUrl ?? null, sampleKey: prior.sampleKey ?? null, sourceFileId: prior.sourceFileId ?? null, detectionJson: prior.detectionJson ?? null, stateJson: prior.stateJson ?? null, priorPhotoJson: null, stateRev: sql`${projectRooms.stateRev} + 1`, updatedAt: now() }).where(eq(projectRooms.id, roomId))
  const [r] = await db.select().from(projectRooms).where(eq(projectRooms.id, roomId))
  if (!r) return { error: 'That room is gone.' }
  touch(got.d.id, got.d.leadId)
  return { ok: true, imageUrl: roomImage(r), detection: parseDetection(r.detectionJson, r), pending: readPending(parseJson<unknown>(r.stateJson, null)), stateRev: r.stateRev }
}
/**
 * The room's reading and the picks waiting for Generate, autosaved (Q-07).
 * - (two tabs) `baseRev` = the revision the tab last saw (EditorRoom.stateRev, then each save's `stateRev`): a save on an older one writes
 *   nothing and answers `{ conflict: true }` — another tab or member changed the room — instead of overwriting their work.
 * - (F200) a reference or piece photo still sent as a picture is kept in the room's store; the state keeps its address, and `addresses`
 *   hands those back so the tab can stop sending the picture.
 * - (D9, verify round 1) a save on an older revision whose picks and reading are already what the room holds is not a conflict — a
 *   leaving page's flush that landed after the reloaded page read the room, then the same picks again: it answers as saved, on the
 *   room's current revision, and writes nothing.
 * - The same function answers POST /visualizer/state (the leaving page's keepalive flush): same viewer, same Who sees leads, same JSON.
 */
/** A JSON text with its keys in one order, so two saves of the same picks compare equal whatever order a tab built them in. */
function canon(json: string | null | undefined): string {
  const sort = (v: unknown): unknown => (Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as Record<string, unknown>).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])])) : v)
  try { return JSON.stringify(sort(JSON.parse(json ?? 'null'))) } catch { return String(json) }
}
export type RoomStateInput = { pending?: Pending; detection?: Detection; baseRev?: number }
export type RoomStateSaved = { savedAt: number; stateRev: number; addresses?: { refs: Record<string, string>; pieces: Record<string, string> } }
export async function saveRoomState(roomId: string, s: RoomStateInput): Promise<RoomStateSaved | { conflict: true; stateRev: number } | Err> {
  const got = await roomFor(roomId); if (!got) return { error: 'That room is gone.' }
  const at = now()
  const patch: Partial<typeof projectRooms.$inferInsert> = { updatedAt: at }
  let addresses: { refs: Record<string, string>; pieces: Record<string, string> } | undefined
  if (s.pending) {
    const p = readPending(s.pending); p.transfer.refs = p.transfer.refs.slice(0, 3)
    const out = liftPictures(roomId, p, parseAssets(got.r.assetsJson))
    patch.stateJson = JSON.stringify(out.pending)
    if (out.changed) patch.assetsJson = JSON.stringify(out.assets)
    const refs = Object.fromEntries(out.pending.transfer.refs.filter((r) => p.transfer.refs.find((x) => x.id === r.id)?.url !== r.url).map((r) => [r.id, r.url]))
    const pieces = Object.fromEntries(Object.entries(out.pending.furniture).filter(([id, f]) => !!f.refImage && p.furniture[id]?.refImage !== f.refImage).map(([id, f]) => [id, f.refImage!]))
    if (Object.keys(refs).length || Object.keys(pieces).length) addresses = { refs, pieces }
  }
  if (isDetection(s.detection)) patch.detectionJson = JSON.stringify({ ...s.detection, surfaces: s.detection.surfaces.slice(0, 80), furniture: Array.isArray(s.detection.furniture) ? s.detection.furniture.slice(0, 80) : [] })
  const where = typeof s.baseRev === 'number' ? and(eq(projectRooms.id, roomId), eq(projectRooms.stateRev, s.baseRev)) : eq(projectRooms.id, roomId)
  const res = await db.update(projectRooms).set({ ...patch, stateRev: sql`${projectRooms.stateRev} + 1` }).where(where)
  const [cur] = await db.select({ stateRev: projectRooms.stateRev, stateJson: projectRooms.stateJson, detectionJson: projectRooms.detectionJson }).from(projectRooms).where(eq(projectRooms.id, roomId))
  if (!res.rowsAffected) {
    const same = !!cur && (patch.stateJson === undefined || canon(patch.stateJson) === canon(cur.stateJson ?? JSON.stringify(readPending(null)))) && (patch.detectionJson === undefined || canon(patch.detectionJson) === canon(cur.detectionJson))
    if (!same) return { conflict: true, stateRev: cur?.stateRev ?? 0 }
  }
  return { savedAt: at.getTime(), stateRev: cur?.stateRev ?? 0, ...(addresses ? { addresses } : {}) }
}
/** (F200) A reference or piece photo, kept in the room's store: the picks carry the address this returns, never the picture. */
/* (F205) the picture inside an object — see setRoomPhoto */
export async function saveRoomAsset(roomId: string, o: { dataUrl: string }): Promise<{ id: string; url: string } | Err> {
  const { dataUrl } = o
  const got = await roomFor(roomId); if (!got) return { error: 'That room is gone.' }
  if (!isDataImage(dataUrl) || dataUrl.length > 3_000_000) return { error: 'We can read JPG, PNG and WebP photos up to 10 MB.' }
  const assets = parseAssets(got.r.assetsJson)
  const id = assetIdOf(dataUrl)
  if (!assets[id]) await db.update(projectRooms).set({ assetsJson: JSON.stringify({ ...assets, [id]: dataUrl }) }).where(eq(projectRooms.id, roomId))
  return { id, url: assetAddress(roomId, id) }
}

/* ── renders ── */
export type NewRender = { kind: PassKind; model: 'fast' | 'high'; parentKey: string; variants: { image: string; applied: Applied; finishes: Finishes; materials: { label: string; material: string }[] }[]
  /** (REG-704, AI credits B-12) The job's id, chosen by the editor before the work — its charge is keyed `render:<jobId>`, so Usage ties
      the credits to this job, its room and its lead. */
  jobId?: string }
/** Keep a Generate: one job, its variants V-numbered after every version the room ever had (1.0 wrote the row only after the image
    existed, C-34 — so does this). (F213) Each picture is stored beside the job; the job keeps its address. */
export async function saveRender(roomId: string, input: NewRender): Promise<{ jobId: string; keys: string[]; ns: number[] } | Err> {
  return oneAtATime(`render:${roomId}`, () => keepRender(roomId, input))
}
async function keepRender(roomId: string, input: NewRender): Promise<{ jobId: string; keys: string[]; ns: number[] } | Err> {
  const got = await roomFor(roomId); if (!got) return { error: 'That room is gone.' }
  const images = input.variants.slice(0, 3).map((v) => cleanImage(v.image))
  if (!images.length || images.some((i) => !i)) return { error: 'Couldn’t keep this render — the picture didn’t come through.' }
  const id = input.jobId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(input.jobId) ? input.jobId : randomUUID(), at = now(), me = await actingMember()
  const pics = images.flatMap((img, i) => (isDataImage(img) ? [{ jobId: id, variantId: i + 1, data: img }] : []))
  const jobs = await db.select({ variantsJson: renderJobs.variantsJson }).from(renderJobs).where(eq(renderJobs.roomId, roomId))
  let n = jobs.reduce((m, j) => Math.max(m, ...parseVariants(j.variantsJson).map((v) => v.n)), 0)
  const variants: Variant[] = input.variants.slice(0, 3).map((v, i) => ({ id: i + 1, n: ++n, imageUrl: isDataImage(images[i]) ? renderAddress(id, i + 1) : images[i]!, materials: v.materials.slice(0, 60), parentKey: String(input.parentKey || ORIGINAL), applied: v.applied, finishes: v.finishes, deletedAt: null }))
  await db.transaction(async (tx) => {   // the version and its pictures land together, or not at all
    await tx.insert(renderJobs).values({ id, roomId, leadId: got.d.leadId, projectId: null, model: input.model === 'high' ? 'high' : 'fast', status: 'completed', kind: input.kind, style: descriptor(variants[0]!.applied), variantsJson: JSON.stringify(variants), createdBy: me, createdAt: at, completedAt: at })
    if (pics.length) await tx.insert(renderImages).values(pics)
    await tx.update(projectRooms).set({ priorPhotoJson: null }).where(eq(projectRooms.id, roomId))   // renders of this photo now: Change photo's Undo is spent
    await tx.update(visualizerDesigns).set({ updatedAt: at }).where(eq(visualizerDesigns.id, got.d.id))
  })
  touch(got.d.id, got.d.leadId)
  return { jobId: id, keys: variants.map((v) => versionKey(id, v.id)), ns: variants.map((v) => v.n) }   // (F211) the numbers given, for the editor's snackbar
}
async function setVariantDeleted(jobId: string, variantId: number, deleted: boolean) {
  const [j] = await db.select().from(renderJobs).where(eq(renderJobs.id, jobId)); if (!j) return null
  const got = await roomFor(j.roomId); if (!got) return null
  const all = parseVariants(j.variantsJson)
  const v = all.find((x) => x.id === variantId); if (!v) return null
  if (!!v.deletedAt === deleted) return got
  const vs = all.map((x) => (x.id === variantId ? { ...x, deletedAt: deleted ? Date.now() : null } : x))
  await db.update(renderJobs).set({ variantsJson: JSON.stringify(vs) }).where(eq(renderJobs.id, jobId))
  const detail = { id: versionKey(jobId, variantId), room: got.r.name, n: v.n, designId: got.d.id, roomId: got.r.id }
  if (deleted) await trail(got.d.leadId, 'version_deleted', detail)
  else await untrail(got.d.leadId, 'version_deleted', 'version_restored', detail)
  touch(got.d.id, got.d.leadId)
  return got
}
/** Delete a version — with Undo (1.0 had no confirm and no undo, C-48). Its number stays taken, so V4 is still V4. */
export async function deleteVersion(jobId: string, variantId: number): Promise<{ ok: true } | Err> { return (await setVariantDeleted(jobId, variantId, true)) ? { ok: true } : { error: 'That version is gone.' } }
/** (F077) Bring a deleted version back — the snackbar's Undo, or Deleted versions later. */
export async function restoreVersion(jobId: string, variantId: number): Promise<{ ok: true } | Err> { return (await setVariantDeleted(jobId, variantId, false)) ? { ok: true } : { error: 'That version is gone.' } }

/* ── the design's own swatches (1.0's session customs) ── */
const SWATCH_UNDO_MS = 86_400_000
/** The 40 newest live swatches; a removed one stays a day, for its Undo. */
function trimOwn(own: StoredSwatch[]): StoredSwatch[] {
  const t = Date.now()
  const kept = own.filter((x) => !x.removedAt || t - x.removedAt < SWATCH_UNDO_MS)
  const live = kept.filter((x) => !x.removedAt)
  const drop = new Set(live.slice(0, Math.max(0, live.length - 40)).map((x) => x.id))
  return kept.filter((x) => !drop.has(x.id))
}
export async function saveOwnSwatch(designId: string, s: OwnSwatch): Promise<{ id: string } | Err> {
  const got = await designFor(designId); if (!got) return { error: 'That design is gone.' }
  const own = parseOwnStored(got.d.customJson)
  /* (F198) the Undo of a remove hands the swatch back as the page had it: it returns as it was — its own picture, its place */
  const had = s.id ? own.find((x) => x.id === s.id) : undefined
  if (had) {
    if (!had.removedAt) return { id: had.id }
    await db.update(visualizerDesigns).set({ customJson: JSON.stringify(trimOwn(own.map((x) => (x.id === had.id ? { ...x, removedAt: null } : x)))) }).where(eq(visualizerDesigns.id, designId))
    touch(designId); return { id: had.id }
  }
  const img = s.imageUrl ? cleanImage(s.imageUrl) : null
  if (s.imageUrl && !img) return { error: 'We can read JPG, PNG and WebP swatches up to 10 MB.' }
  const id = s.id || randomUUID().slice(0, 8)
  const live = own.filter((x) => !x.removedAt)
  own.push({ id, name: cleanName(s.name, 60) || `Custom ${live.length + 1}`, category: cleanName(s.category, 30) || 'Paints', hex: /^#[0-9A-Fa-f]{6}$/.test(s.hex) ? s.hex.toUpperCase() : '#BFBFBF', finish: s.finish || 'matte', imageUrl: img })
  await db.update(visualizerDesigns).set({ customJson: JSON.stringify(trimOwn(own)), updatedAt: now() }).where(eq(visualizerDesigns.id, designId))
  touch(designId); return { id }
}
/** (F198) Remove — soft: the swatch is kept, marked, for a day, so its Undo brings back the picture it had. */
export async function removeOwnSwatch(designId: string, swatchId: string): Promise<{ ok: true } | Err> {
  const got = await designFor(designId); if (!got) return { error: 'That design is gone.' }
  const own = parseOwnStored(got.d.customJson)
  if (!own.some((x) => x.id === swatchId && !x.removedAt)) return { error: 'That swatch is gone.' }
  await db.update(visualizerDesigns).set({ customJson: JSON.stringify(trimOwn(own.map((x) => (x.id === swatchId ? { ...x, removedAt: Date.now() } : x)))), updatedAt: now() }).where(eq(visualizerDesigns.id, designId))
  touch(designId); return { ok: true }
}
export async function restoreOwnSwatch(designId: string, swatchId: string): Promise<{ ok: true } | Err> {
  const got = await designFor(designId); if (!got) return { error: 'That design is gone.' }
  const own = parseOwnStored(got.d.customJson)
  const s = own.find((x) => x.id === swatchId); if (!s) return { error: 'That swatch is gone for good.' }
  if (!s.removedAt) return { ok: true }
  await db.update(visualizerDesigns).set({ customJson: JSON.stringify(trimOwn(own.map((x) => (x.id === swatchId ? { ...x, removedAt: null } : x)))) }).where(eq(visualizerDesigns.id, designId))
  touch(designId); return { ok: true }
}

/* ── out of the editor: Files, a quote, the client ── */
async function versionOf(jobId: string, variantId: number) {
  const [j] = await db.select().from(renderJobs).where(eq(renderJobs.id, jobId)); if (!j) return null
  const got = await roomFor(j.roomId); if (!got) return null
  const v = parseVariants(j.variantsJson).find((x) => x.id === variantId && !x.deletedAt); if (!v) return null
  return { j, v, ...got }
}

/** (wave E, files-9) Why nothing more may go onto this lead from its design — it is in the leads' trash (or gone for good) — else null. */
async function deletedLead(leadId: string): Promise<string | null> {
  const [l] = await db.select({ name: leads.name, deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, leadId))
  return !l ? leadDeletedNote('') : l.deletedAt ? leadDeletedNote(l.name) : null
}
/** The lead's Files › Renders folder, made on first use (1.0 promised "Renders save to the lead's file" and never did — Q-13). */
async function rendersFolder(leadId: string, me: string): Promise<string> {
  const [f] = await db.select({ id: leadFiles.id }).from(leadFiles).where(and(eq(leadFiles.leadId, leadId), eq(leadFiles.kind, 'folder'), eq(leadFiles.name, 'Renders'), isNull(leadFiles.parentId), isNull(leadFiles.deletedAt)))
  if (f) return f.id
  const id = randomUUID(), at = now()
  await db.insert(leadFiles).values({ id, leadId, kind: 'folder', name: 'Renders', thumb: null, createdAt: at, parentId: null, ownerId: me, sizeBytes: null, mime: null, updatedAt: at })
  return id
}
/**
 * File a version in the lead's Files › Renders — once. (F194) Found again by what it is (`lead_file_renders`), never by its name; a render
 * filed before that record existed is recognised by its picture and given one. (F093) The file keeps its own copy of the picture, so it
 * outlives the design's Delete forever. (F113) Its real size, and the one name a download uses too.
 */
async function fileVersion(leadId: string, designId: string, room: { id: string; name: string }, jobId: string, v: Variant, me: string): Promise<{ fileId: string; existed: boolean } | null> {
  const key = versionKey(jobId, v.id)
  const [had] = await db.select({ fileId: leadFileRenders.fileId }).from(leadFileRenders).innerJoin(leadFiles, eq(leadFiles.id, leadFileRenders.fileId)).where(and(eq(leadFileRenders.renderKey, key), eq(leadFiles.leadId, leadId), isNull(leadFiles.deletedAt)))
  if (had) return { fileId: had.fileId, existed: true }
  const pic = await renderPicture(jobId, v.id)
  if (!pic) return null
  const name = renderFileName(room.name, v.n)
  const own = isDataImage(pic)
  const same = own ? eq(leadFiles.thumb, renderAddress(jobId, v.id)) : or(eq(leadFiles.thumb, renderAddress(jobId, v.id)), and(eq(leadFiles.thumb, pic), eq(leadFiles.name, name)))
  const [legacy] = await db.select({ id: leadFiles.id, thumb: leadFiles.thumb }).from(leadFiles).leftJoin(leadFileRenders, eq(leadFileRenders.fileId, leadFiles.id))
    .where(and(eq(leadFiles.leadId, leadId), isNull(leadFiles.deletedAt), isNull(leadFileRenders.fileId), same))
  if (legacy) {
    await db.transaction(async (tx) => {
      if (own && legacy.thumb !== `/files/img/${legacy.id}`) { await tx.insert(leadFileImages).values({ fileId: legacy.id, data: pic }).onConflictDoNothing(); await tx.update(leadFiles).set({ thumb: `/files/img/${legacy.id}` }).where(eq(leadFiles.id, legacy.id)) }
      await tx.insert(leadFileRenders).values({ fileId: legacy.id, renderKey: key, designId, roomId: room.id, n: v.n }).onConflictDoNothing()
    })
    return { fileId: legacy.id, existed: true }
  }
  const folder = await rendersFolder(leadId, me)
  const id = randomUUID(), at = now()
  const size = own ? dataUrlBytes(pic) : await publicFileSize(pic)
  /* (wave E, files-10) never two files of one name in Renders — another design's V1 of the same room, or a render of a design deleted for
     good, gets "(2)" */
  const taken = (await db.select({ name: leadFiles.name }).from(leadFiles).where(and(eq(leadFiles.leadId, leadId), eq(leadFiles.parentId, folder), isNull(leadFiles.deletedAt)))).map((f) => f.name)
  const filed = freeFileName(name, taken)
  await db.transaction(async (tx) => {
    await tx.insert(leadFiles).values({ id, leadId, kind: 'image', name: filed, thumb: own ? `/files/img/${id}` : pic, createdAt: at, parentId: folder, ownerId: me, sizeBytes: size, mime: own ? pic.slice(5, pic.indexOf(';')) : 'image/jpeg', updatedAt: at })
    if (own) await tx.insert(leadFileImages).values({ fileId: id, data: pic })
    await tx.insert(leadFileRenders).values({ fileId: id, renderKey: key, designId, roomId: room.id, n: v.n })
  })
  return { fileId: id, existed: false }
}
export async function saveVersionToFiles(jobId: string, variantId: number): Promise<{ fileId: string; existed: boolean; leadId: string } | Err> {
  const got = await versionOf(jobId, variantId); if (!got) return { error: 'That version is gone.' }
  if (!got.d.leadId) return { error: 'A personal design has no lead to file it on.' }
  const gone = await deletedLead(got.d.leadId); if (gone) return { error: gone }   // (wave E, files-9)
  const res = await fileVersion(got.d.leadId, got.d.id, got.r, jobId, got.v, await actingMember())
  if (!res) return { error: 'Couldn’t save to Files — the picture didn’t come through.' }
  touch(got.d.id, got.d.leadId)
  revalidatePath(`/leads/${got.d.leadId}/files`)
  return { ...res, leadId: got.d.leadId }
}

/**
 * Add to quote (Q-17): the version's finishes become a section in a draft of the lead's quote (or a new quote).
 * - (F097) the finishes the version shows — a relight of V2 quotes V2's walls, floor and sofa;
 * - (F096) one line per surface group and finish, as the client's link lists them; priced from the Price book item the studio material
 *   names, else an item of the finish's name, else at zero for the studio to price (never a category's rate, which would be wrong money);
 * - (F101) lines in the dialog's words; no internal wording in what prints — the section names where they came from;
 * - (F100) the same version in the same draft twice only when asked (`again`);
 * - (verify round 1) a line priced by area or length (S$7.00 / sqft) goes in with no quantity — a photo can't measure the floor, and
 *   "1 sqft" put a made-up amount on the quote; the studio types the measured quantity. `quantityless` counts them for the snackbar.
 */
export async function addVersionToQuote(jobId: string, variantId: number, quoteId: string | 'new', again = false): Promise<{ quoteId: string; lines: number; priced: number; quantityless: number } | Err> {
  const got = await versionOf(jobId, variantId); if (!got) return { error: 'That version is gone.' }
  if (!got.d.leadId) return { error: 'A personal design has no lead to quote.' }
  const gone = await deletedLead(got.d.leadId); if (gone) return { error: gone }   // (wave E, files-9)
  const lines = quoteLines(got.v, parseDetection(got.r.detectionJson, got.r))
  const none = noQuoteReason(got.v, lines.length); if (none) return { error: `${none}.` }   // (wave E, tablet-15) never "yet": waiting won't add any
  const groupName = quoteGroupName(got.r.name, got.v.n)
  let qid = quoteId
  if (qid !== 'new') {
    const [q] = await db.select({ id: quotes.id, leadId: quotes.leadId, status: quotes.status }).from(quotes).where(and(eq(quotes.id, qid), isNull(quotes.deletedAt)))
    if (!q || q.leadId !== got.d.leadId) return { error: 'That quote is gone.' }
    if (q.status !== 'Draft') return { error: 'That quote has gone out — pick a draft or start a new quote.' }
    if (!again) {
      const [dup] = await db.select({ id: quoteItems.id }).from(quoteItems).where(and(eq(quoteItems.quoteId, qid), eq(quoteItems.kind, 'group'), eq(quoteItems.name, groupName)))
      if (dup) return { error: `V${got.v.n} is already in that quote.` }
    }
  }
  const smIds = [...new Set(lines.map((l) => studioMaterialOf(l.materialId)).filter((x): x is string => !!x))]
  const [book, mats] = await Promise.all([
    db.select({ id: priceBookItems.id, name: priceBookItems.name, description: priceBookItems.description, unit: priceBookItems.unit, costMinor: priceBookItems.costMinor, markupMinor: priceBookItems.markupMinor, category: priceBookItems.category }).from(priceBookItems).where(and(isNull(priceBookItems.deletedAt), eq(priceBookItems.status, 'live'))),
    smIds.length ? db.select({ id: studioMaterials.id, priceBookItemId: studioMaterials.priceBookItemId }).from(studioMaterials).where(and(inArray(studioMaterials.id, smIds), isNull(studioMaterials.deletedAt))) : Promise.resolve([]),
  ])
  if (qid === 'new') qid = await createQuote(got.d.leadId)
  const group = await createQuoteItem(qid, { kind: 'group', name: groupName })
  let priced = 0, quantityless = 0
  const bulk: BulkLine[] = lines.map((l) => {
    const sm = studioMaterialOf(l.materialId)
    const linked = sm ? mats.find((m) => m.id === sm)?.priceBookItemId ?? null : null
    const b = (linked ? book.find((x) => x.id === linked) : undefined) ?? book.find((x) => x.name.trim().toLowerCase() === l.to.trim().toLowerCase()) ?? null
    if (b) priced++
    const measured = !!b && isRateUnit(b.unit)
    if (measured) quantityless++
    return { name: `${l.what} — ${l.to}`, description: b?.description ?? null, qty: measured ? 0 : 1, unit: b?.unit ?? 'Lot', costMinor: b?.costMinor ?? 0, markupMinor: b?.markupMinor ?? 0, room: got.r.name, category: b?.category ?? null }
  })
  await createQuoteItems(qid, bulk, { parentId: group.id })
  touch(got.d.id, got.d.leadId)
  revalidatePath(`/quotes/${qid}`)
  return { quoteId: qid, lines: bulk.length, priced, quantityless }
}

/** Share with client (Q-14): the versions picked, frozen as they are now, on one link that lives 7 days; each one also lands in the lead's
    Files › Renders, so the lead keeps what the client saw (Q-13). (F102) In the design's order — room by room, V1 before V2 — whatever
    order they were ticked in; (F103) each with the client's own words beside the studio's. */
export async function createShareLink(designId: string, input: { keys: string[]; message?: string }): Promise<{ token: string; id: string } | Err> {
  const got = await designFor(designId); if (!got) return { error: 'That design is gone.' }
  const gone = got.d.leadId ? await deletedLead(got.d.leadId) : null; if (gone) return { error: gone }   // (wave E, files-9) the editor's own words
  if (got.d.leadId && await leadClosed(got.d.leadId)) return { error: `${LEAD_CLOSED_SHARE}.` }   // (critic §4) a link that would open as ended
  const keys = [...new Set(input.keys)].slice(0, SHARE_MAX_VERSIONS)
  if (!keys.length) return { error: 'Pick at least one version to share.' }
  const rooms = await db.select().from(projectRooms).where(and(eq(projectRooms.designId, designId), isNull(projectRooms.deletedAt))).orderBy(asc(projectRooms.position), asc(projectRooms.createdAt))
  const jobs = rooms.length ? await db.select().from(renderJobs).where(inArray(renderJobs.roomId, rooms.map((r) => r.id))) : []
  const me = await actingMember()
  const picked: { key: string; room: typeof rooms[number]; place: number; idx: number; entry: Omit<ShareSnapshot['versions'][number], 'clientLabel' | 'clientRoom'>; applied: Applied; jobId: string; raw: Variant }[] = []
  for (const key of keys) {
    const [jobId, vid] = key.split(':')
    const j = jobs.find((x) => x.id === jobId); if (!j) continue
    const place = rooms.findIndex((r) => r.id === j.roomId), room = rooms[place]; if (!room) continue
    const all = versionsOf(jobs.filter((x) => x.roomId === room.id))
    const idx = all.findIndex((x) => x.key === key && !x.deleted), v = all[idx]; if (!v) continue
    const raw = parseVariants(j.variantsJson).find((x) => x.id === Number(vid)); if (!raw) continue
    /* (verify round 1) the client compares every design with their own room — never the version it was built on, which may be another
       design on the same page — and reads everything the picture shows, not its last step nor the studio's note to the engine */
    picked.push({ key, room, place, idx, applied: v.applied, jobId: j.id, raw, entry: { key, roomId: room.id, roomName: room.name, label: v.label, imageUrl: v.imageUrl, beforeUrl: roomImage(room), materials: clientLines(raw, parseDetection(room.detectionJson, room)) } })
  }
  if (!picked.length) return { error: 'Those versions are gone.' }
  picked.sort((a, b) => a.place - b.place || a.idx - b.idx)
  /* (verify round 1) V2 is "Design 2" on every link, so a client's "Design 2" finds V2; a room's editor-added number goes when it is the
     only room of that name on the link */
  const names = clientRoomNames(picked.map((p) => p.room.name), rooms.map((r) => r.name))
  const versions: ShareSnapshot['versions'] = picked.map((p) => ({ ...p.entry, clientLabel: clientVersionLabel(p.raw.n, p.applied), clientRoom: names.get(p.room.name) ?? p.room.name }))
  if (got.d.leadId) for (const p of picked) await fileVersion(got.d.leadId, got.d.id, p.room, p.jobId, p.raw, me)
  const id = randomUUID(), at = now(), token = randomBytes(9).toString('base64url')
  await db.insert(renderShareLinks).values({ id, token, designId, leadId: got.d.leadId, snapshot: JSON.stringify({ versions }), message: String(input.message ?? '').slice(0, 1200) || null, expiresAt: new Date(at.getTime() + SHARE_DAYS * 86_400_000), viewCount: 0, lastViewedAt: null, sentVia: null, createdBy: me, createdAt: at, revokedAt: null })
  touch(designId, got.d.leadId)
  if (got.d.leadId) revalidatePath(`/leads/${got.d.leadId}/files`)
  return { token, id }
}
/** (F204) A link is changed only by someone who may change its design (Who sees leads; not while the design is deleted). */
async function linkFor(id: string) {
  const [s] = await db.select().from(renderShareLinks).where(eq(renderShareLinks.id, String(id))); if (!s) return null
  const got = await designFor(s.designId); if (!got) return null
  return { s, ...got }
}
const touchLink = (s: { token: string; designId: string; leadId: string | null }) => { touch(s.designId, s.leadId); revalidatePath(`/renders/${s.token}`) }
export async function recordShareSent(id: string, via: 'whatsapp' | 'copy'): Promise<{ ok: true } | Err> {
  const got = await linkFor(id); if (!got) return { error: 'That link is gone.' }
  if (via !== 'whatsapp' && got.s.sentVia === 'whatsapp') return { ok: true }   // (F107) a copy never hides that it went on WhatsApp
  await db.update(renderShareLinks).set({ sentVia: via === 'whatsapp' ? 'whatsapp' : 'copy' }).where(eq(renderShareLinks.id, got.s.id))
  touchLink(got.s); return { ok: true }
}
/** Renew — another 7 days from today (1.0 could never revoke, A E-01). */
export async function renewShareLink(id: string): Promise<{ ok: true; expiresAt: number } | Err> {
  const got = await linkFor(id); if (!got) return { error: 'That link’s design is gone.' }
  const expiresAt = new Date(Date.now() + SHARE_DAYS * 86_400_000)
  await db.update(renderShareLinks).set({ expiresAt, revokedAt: null }).where(eq(renderShareLinks.id, got.s.id))
  await trail(got.s.leadId, 'share_renewed', { id: got.s.id, n: SHARE_DAYS })
  touchLink(got.s); return { ok: true, expiresAt: expiresAt.getTime() }
}
/** Stop sharing — the link says so to whoever opens it. */
export async function stopShareLink(id: string): Promise<{ ok: true } | Err> {
  const got = await linkFor(id); if (!got) return { error: 'That link’s design is gone.' }
  if (got.s.revokedAt) return { ok: true }
  await db.update(renderShareLinks).set({ revokedAt: now() }).where(eq(renderShareLinks.id, got.s.id))
  await trail(got.s.leadId, 'share_stopped', { id: got.s.id })
  touchLink(got.s); return { ok: true }
}
/** (F108 · F208) Stop sharing's Undo: the link as it was — open again until the date the client was given, not a fresh 7 days (past that
    date it simply shows as expired, and Renew is there). */
export async function unstopShareLink(id: string): Promise<{ ok: true } | Err> {
  const got = await linkFor(id); if (!got) return { error: 'That link’s design is gone.' }
  if (!got.s.revokedAt) return { ok: true }
  await db.update(renderShareLinks).set({ revokedAt: null }).where(eq(renderShareLinks.id, got.s.id))
  await untrail(got.s.leadId, 'share_stopped', 'share_reopened', { id: got.s.id })
  touchLink(got.s); return { ok: true }
}

/* ── pins (Q-15) ── */
const memberName = async (id: string) => (await db.select({ name: members.name }).from(members).where(eq(members.id, id)))[0]?.name ?? 'Studio'
export async function addPin(jobId: string, variantId: number, x: number, y: number, body: string): Promise<{ id: string } | Err> {
  const got = await versionOf(jobId, variantId); if (!got) return { error: 'That version is gone.' }
  const text = String(body ?? '').trim()
  if (!text) return { error: 'Write a note for the pin.' }
  if (text.length > PIN_CHARS) return { error: `Keep a pin under ${PIN_CHARS.toLocaleString('en-SG')} characters.` }
  const count = (await db.select({ id: renderAnnotations.id }).from(renderAnnotations).where(and(eq(renderAnnotations.jobId, jobId), eq(renderAnnotations.variantId, variantId), isNull(renderAnnotations.deletedAt)))).length
  if (count >= PIN_LIMIT) return { error: 'This version has too many pins already.' }
  const me = await actingMember(), id = randomUUID(), at = now()
  const name = await memberName(me)
  await db.insert(renderAnnotations).values({ id, jobId, variantId, x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)), body: text, status: 'open', authorRole: 'studio', authorMemberId: me, authorName: name, commentsJson: '[]', createdAt: at, updatedAt: at })
  touch(got.d.id, got.d.leadId); return { id }
}
async function pinFor(pinId: string) {
  const [p] = await db.select().from(renderAnnotations).where(eq(renderAnnotations.id, pinId)); if (!p) return null
  const got = await versionOf(p.jobId, p.variantId); return got ? { p, ...got } : null
}
export async function replyPin(pinId: string, body: string): Promise<{ ok: true } | Err> {
  const got = await pinFor(pinId); if (!got || got.p.deletedAt) return { error: 'That pin is gone.' }
  const text = String(body ?? '').trim(); if (!text) return { error: 'Write a reply first.' }
  if (text.length > PIN_CHARS) return { error: 'That reply is too long.' }
  const me = await actingMember()
  const name = await memberName(me)
  const comments = [...parseComments(got.p.commentsJson), { id: randomUUID(), authorRole: 'studio' as const, authorName: name, authorMemberId: me, body: text, createdAt: Date.now() }]
  await db.update(renderAnnotations).set({ commentsJson: JSON.stringify(comments), updatedAt: now() }).where(eq(renderAnnotations.id, pinId))
  touch(got.d.id, got.d.leadId); return { ok: true }
}
export async function setPinStatus(pinId: string, status: 'open' | 'resolved'): Promise<{ ok: true } | Err> {
  const got = await pinFor(pinId); if (!got || got.p.deletedAt) return { error: 'That pin is gone.' }
  await db.update(renderAnnotations).set({ status: status === 'resolved' ? 'resolved' : 'open', updatedAt: now() }).where(eq(renderAnnotations.id, pinId))
  touch(got.d.id, got.d.leadId); return { ok: true }
}
/** Remove a pin — the studio's own only (1.0's rule, A D-11); with Undo. */
export async function deletePin(pinId: string): Promise<{ ok: true } | Err> {
  const got = await pinFor(pinId); if (!got) return { error: 'That pin is gone.' }
  if (got.p.authorRole !== 'studio') return { error: 'You can only remove the studio’s own pins.' }
  await db.update(renderAnnotations).set({ deletedAt: now() }).where(eq(renderAnnotations.id, pinId))
  touch(got.d.id, got.d.leadId); return { ok: true }
}
/** (F204) The Undo goes through the delete's door: a pin on a version still there, the studio's own. */
export async function restorePin(pinId: string): Promise<{ ok: true } | Err> {
  const got = await pinFor(pinId); if (!got) return { error: 'That pin is gone.' }
  if (got.p.authorRole !== 'studio') return { error: 'You can only bring back the studio’s own pins.' }
  if (!got.p.deletedAt) return { ok: true }
  await db.update(renderAnnotations).set({ deletedAt: null }).where(eq(renderAnnotations.id, pinId))
  touch(got.d.id, got.d.leadId); return { ok: true }
}
