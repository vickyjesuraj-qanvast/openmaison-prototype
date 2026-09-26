import 'server-only'
import { createHash } from 'node:crypto'
import { cache } from 'react'
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFileRenders, leadFiles, leadReturns, leads, libraryFolders, members, priceBookItems, projectRooms, quoteItems, quotes, renderAnnotations, renderConsultationRequests, renderJobs, renderShareLinks, studioMaterials, visualizerDesigns, type ProjectRoom, type RenderJob, type RenderShareLink, type VisualizerDesign } from '@/lib/db/schema'
import { canOpenLead, fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { fetchBrand } from '@/lib/templates/queries'
import { folderChangeBlockFor, type Folder } from '@/lib/company/folder-libraries'
import { designChangeBlock, materialChangeBlock, roomChangeBlock, roomDeleteBlock } from './policy'
import { currentSampleReading, descriptor, sampleDetection, NO_FINISHES, readPending, versionKey, type Applied, type Detection, type Pending, type Variant, type VersionView } from './model'
import type { LibraryMaterial, OwnSwatch } from './materials'
import { sampleByKey } from './samples'
import { renderAddress, withToken } from './images'
import { clientLines, clientRoomNames, clientVersionLabel, roomsInSentence, type Quotable } from './outputs'
import { isRateUnit } from '@/lib/settings/types'

/* AI Visualizer (REG-673) — what the pages read. Pictures stored as data URLs leave as /visualizer/img addresses (the page payload
   carries addresses, not pictures); the sample rooms' public paths leave as they are. (audit 2026-09-26) Every stored JSON is read
   through a guard, so one bad row can't take a page down (F206); a client's link carries its own token on every picture (critic §1). */

const isData = (u: string | null | undefined): u is string => !!u && u.startsWith('data:')
/** (verify round 1) A stored picture's address changes with the picture, never with its row: the browser keeps an address for a year, so
    a Change photo and its Undo in the same second must not share one (they did, by `updatedAt`), and an autosave must not make a new one. */
const pictureTag = (data: string) => createHash('sha1').update(`${data.length}:${data.slice(0, 256)}:${data.slice(-1024)}`).digest('hex').slice(0, 12)
export const roomImage = (r: Pick<ProjectRoom, 'id' | 'originalImageUrl'>) => (isData(r.originalImageUrl) ? `/visualizer/img/room/${r.id}?v=${pictureTag(r.originalImageUrl)}` : r.originalImageUrl ?? null)
const variantImage = (jobId: string, v: { id: number; imageUrl: string }) => (isData(v.imageUrl) ? renderAddress(jobId, v.id) : v.imageUrl)
export const materialImage = (m: { id: string; imageUrl: string | null }) => (isData(m.imageUrl) ? `/visualizer/img/m/${m.id}?v=${pictureTag(m.imageUrl)}` : m.imageUrl)
const ownImage = (designId: string, s: OwnSwatch) => (isData(s.imageUrl) ? `/visualizer/img/d/${designId}/${s.id}` : s.imageUrl)

/* ── guarded readers (F206) ── */
export function parseJson<T>(raw: string | null | undefined, fallback: T): T { try { return raw ? (JSON.parse(raw) as T) : fallback } catch { return fallback } }
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const BLANK_APPLIED: Applied = { kind: 'edit', surfaces: [], furniture: [], style: null, lighting: null, note: null, palette: null, scope: null }
/** A job's versions — only well-formed ones, each filled out to today's shape. */
export const parseVariants = (raw: string): Variant[] => {
  const v = parseJson<unknown>(raw, [])
  if (!Array.isArray(v)) return []
  return v.filter((x): x is Variant => isObj(x) && typeof x.id === 'number' && typeof x.n === 'number' && typeof x.imageUrl === 'string' && isObj(x.applied)).map((x) => ({
    ...x,
    parentKey: typeof x.parentKey === 'string' ? x.parentKey : '__original__',
    materials: Array.isArray(x.materials) ? x.materials : [],
    applied: { ...BLANK_APPLIED, ...x.applied, surfaces: Array.isArray(x.applied.surfaces) ? x.applied.surfaces : [], furniture: Array.isArray(x.applied.furniture) ? x.applied.furniture : [] },
    finishes: isObj(x.finishes) ? { ...NO_FINISHES, ...x.finishes } : NO_FINISHES,
  }))
}
/** A design's own swatches as stored — (F198) a removed one stays, marked, so Undo brings it back whole. */
export type StoredSwatch = OwnSwatch & { removedAt?: number | null }
export const parseOwnStored = (raw: string | null): StoredSwatch[] => {
  const v = parseJson<unknown>(raw, [])
  return Array.isArray(v) ? v.filter((s): s is StoredSwatch => isObj(s) && typeof s.id === 'string' && typeof s.name === 'string' && typeof s.hex === 'string') : []
}
/** The swatches the picker offers — the removed ones left out. */
export const parseOwn = (raw: string | null): OwnSwatch[] => parseOwnStored(raw).filter((s) => !s.removedAt).map(({ removedAt: _gone, ...s }) => s)
/** The room's reading, whole: a stored one filled out (surfaces and furniture always lists), a sample's as it reads today. */
export function parseDetection(raw: string | null, room: Pick<ProjectRoom, 'sampleKey'> & Partial<Pick<ProjectRoom, 'originalImageUrl'>>): Detection {
  const sample = sampleByKey(room.sampleKey)
  const d = parseJson<unknown>(raw, null)
  if (isObj(d) && Array.isArray(d.surfaces)) {
    const full: Detection = { kind: d.kind === 'sketch' ? 'sketch' : 'photo', source: d.source === 'sample' ? 'sample' : 'fallback', context: typeof d.context === 'string' ? d.context : null,
      surfaces: d.surfaces as Detection['surfaces'], furniture: Array.isArray(d.furniture) ? d.furniture as Detection['furniture'] : [], ...(Array.isArray(d.hidden) ? { hidden: d.hidden as string[] } : {}) }
    /* (F058) a sample's sketch once kept "as it is" (the old 'Use it as it is' stored a fallback photo reading): it reads as the sketch
       again, so Render from sketch is offered, with the surfaces the studio drew and what they took off the list kept */
    if (sample?.sketch && room.originalImageUrl === sample.sketch && full.source === 'fallback') {
      return { ...sampleDetection(sample, true), surfaces: full.surfaces.filter((x) => x.manual), furniture: full.furniture.filter((x) => x.manual), ...(full.hidden ? { hidden: full.hidden } : {}) }
    }
    return sample ? currentSampleReading(full, sample) : full
  }
  return { kind: 'photo', source: 'fallback', context: sample?.context ?? null, surfaces: [], furniture: [] }
}
/** A pin's replies. */
export const parseComments = (raw: string | null): Pin['comments'] => {
  const v = parseJson<unknown>(raw, [])
  return Array.isArray(v) ? v.filter((c): c is Pin['comments'][number] => isObj(c) && typeof c.body === 'string' && typeof c.id === 'string') : []
}
/** A link's frozen versions. */
export const parseSnapshot = (raw: string): ShareSnapshot => {
  const v = parseJson<unknown>(raw, null)
  return { versions: isObj(v) && Array.isArray(v.versions) ? v.versions.filter((x): x is ShareSnapshot['versions'][number] => isObj(x) && typeof x.key === 'string' && typeof x.imageUrl === 'string') : [] }
}
const pinOf = (p: typeof renderAnnotations.$inferSelect): Pin => ({ id: p.id, key: versionKey(p.jobId, p.variantId), x: p.x, y: p.y, body: p.body, status: p.status === 'resolved' ? 'resolved' : 'open', authorRole: p.authorRole === 'client' ? 'client' : 'studio', authorName: p.authorName, authorMemberId: p.authorMemberId, comments: parseComments(p.commentsJson), createdAt: p.createdAt.getTime() })

/** Every version of a room, V-numbered in the order they were made (stable: a deleted one keeps its number). */
export function versionsOf(jobs: Pick<RenderJob, 'id' | 'kind' | 'createdAt' | 'createdBy' | 'variantsJson'>[]): VersionView[] {
  const out: VersionView[] = []
  for (const j of [...jobs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    for (const v of parseVariants(j.variantsJson)) {
      const d = descriptor(v.applied)
      out.push({ key: versionKey(j.id, v.id), n: v.n, jobId: j.id, variantId: v.id, label: `V${v.n} · ${d}`, descriptor: d, imageUrl: variantImage(j.id, v), parentKey: v.parentKey, applied: v.applied, finishes: v.finishes, createdAt: j.createdAt.getTime(), createdBy: j.createdBy, kind: v.applied.kind, deleted: !!v.deletedAt })
    }
  }
  return out
}

/** The lead a design answers to under Who sees leads — its own, or (F115) the one a personal copy was made from. */
export const gateLead = (d: Pick<VisualizerDesign, 'leadId' | 'sourceLeadId'>) => d.leadId ?? d.sourceLeadId ?? null

/* ── the gallery (Tools › AI Visualizer) ── */
export type DesignCard = {
  id: string; kind: 'lead' | 'personal'; name: string; leadId: string | null; leadName: string | null; leadStage: string | null; folderId: string | null
  rooms: number; renders: number; covers: string[]; roomNames: string[]
  createdAt: Date; updatedAt: Date; deletedAt: Date | null; createdBy: string; author: string | null; authorColor: string | null; mayChange: string | null
  /** (verify round 1, F131) who made the design — Deleted Designs' *Made by*; `author` is whoever made its newest version. */
  maker: string | null; makerColor: string | null
}
export type VisualizerHome = { designs: DesignCard[]; deleted: DesignCard[]; folders: Folder[]; leads: { id: string; name: string; stage: string; propertyType: string | null; style: string | null; hasDesign: string | null }[]; viewer: { id: string; role: string }; now: number }

export async function fetchVisualizerHome(): Promise<VisualizerHome> {
  const viewer = await fetchViewer()
  const visible = await visibleLeadIds(viewer)
  const [designs, rooms, jobs, team, leadRows, folderRows] = await Promise.all([
    db.select().from(visualizerDesigns).orderBy(desc(visualizerDesigns.updatedAt)),
    db.select().from(projectRooms).where(isNull(projectRooms.deletedAt)).orderBy(asc(projectRooms.position), asc(projectRooms.createdAt)),
    db.select({ id: renderJobs.id, roomId: renderJobs.roomId, kind: renderJobs.kind, createdAt: renderJobs.createdAt, createdBy: renderJobs.createdBy, variantsJson: renderJobs.variantsJson }).from(renderJobs),
    db.select({ id: members.id, name: members.name, color: members.color }).from(members),
    db.select({ id: leads.id, name: leads.name, stage: leads.stage, propertyType: leads.propertyType, style: leads.style }).from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.name)),
    db.select().from(libraryFolders).where(and(eq(libraryFolders.library, 'visualizer'), isNull(libraryFolders.deletedAt))),
  ])
  const leadById = new Map(leadRows.map((l) => [l.id, l]))
  const byMember = new Map(team.map((m) => [m.id, m]))
  const card = (d: VisualizerDesign): DesignCard => {
    const rs = rooms.filter((r) => r.designId === d.id)
    const covers: string[] = []
    let renders = 0
    /* (F131, verify round 1) "edited … by" names whoever made the newest version — read from the versions alone (a Generate stamps the
       design with the version's own time, so comparing against the design's time never let a version win); the maker only without one */
    let newest: { at: number; by: string | null } | null = null
    for (const r of rs) {
      const vs = versionsOf(jobs.filter((j) => j.roomId === r.id)).filter((v) => !v.deleted)
      renders += vs.length
      const last = vs[vs.length - 1]
      if (last && (!newest || last.createdAt >= newest.at)) newest = { at: last.createdAt, by: last.createdBy }
      const cover = last?.imageUrl ?? roomImage(r)
      if (cover && covers.length < 4) covers.push(cover)
    }
    const latest = Math.max(d.updatedAt.getTime(), newest?.at ?? 0)
    const lead = d.leadId ? leadById.get(d.leadId) ?? null : null
    const author = byMember.get(newest?.by ?? d.createdBy)
    const maker = byMember.get(d.createdBy)
    return { id: d.id, kind: d.kind === 'lead' ? 'lead' : 'personal', name: lead?.name ?? d.name, leadId: d.leadId, leadName: lead?.name ?? null, leadStage: lead?.stage ?? null, folderId: d.kind === 'personal' ? d.folderId : null,
      rooms: rs.length, renders, covers, roomNames: rs.map((r) => r.name), createdAt: d.createdAt, updatedAt: new Date(latest), deletedAt: d.deletedAt, createdBy: d.createdBy, author: author?.name ?? null, authorColor: author?.color ?? null,
      mayChange: designChangeBlock(viewer, d.createdBy, maker?.name, d.kind === 'lead'), maker: maker?.name ?? null, makerColor: maker?.color ?? null }
  }
  /* a lead's design shows once it has a room (1.0 A B-01), and only to whoever may see the lead; (F115) a personal copy of a lead's design
     only to whoever may see the lead it came from */
  const mine = designs.filter((d) => (d.kind === 'lead' ? !!d.leadId && leadById.has(d.leadId) && (!visible || visible.has(d.leadId)) : !d.sourceLeadId || !visible || visible.has(d.sourceLeadId)))
  const cards = mine.map(card).filter((c) => c.kind === 'personal' || c.rooms > 0)
  const byLead = new Map(designs.filter((d) => d.kind === 'lead' && !d.deletedAt).map((d) => [d.leadId!, d.id]))
  return {
    designs: cards.filter((c) => !c.deletedAt).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    deleted: cards.filter((c) => c.deletedAt),
    folders: folderRows.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId ?? null, library: 'visualizer' as const, createdAt: f.createdAt.getTime(), updatedAt: f.updatedAt.getTime(), createdBy: f.createdBy ?? null, mayChange: folderChangeBlockFor('visualizer', viewer, f.createdBy, f.createdBy ? byMember.get(f.createdBy)?.name : null) })),
    leads: leadRows.filter((l) => !visible || visible.has(l.id)).map((l) => ({ ...l, hasDesign: byLead.get(l.id) ?? null })),
    viewer: { id: viewer.id, role: viewer.role }, now: Date.now(),
  }
}

/* ── the editor ── */
export type EditorRoom = {
  id: string; name: string; imageUrl: string | null; sampleKey: string | null; sourceFileId: string | null; detection: Detection; pending: Pending; position: number; updatedAt: number; hasRenders: boolean
  /** (F076 · F202) why this viewer may not delete the room — null when they may (the room's maker, the design's, an Owner or an Admin). */
  mayDelete: string | null
  /** (wave E, E12) why this viewer may not rename the room or change its photo — the same rule as Delete room, in the same words (null when
      they may). The room menu greys Rename and Change photo with it. */
  mayChange: string | null
  createdBy: string | null
  /** (two tabs) the state's revision as loaded — the autosave hands it back, and a save on an older one is refused as a conflict. */
  stateRev: number
}
export type EditorJob = { id: string; roomId: string; kind: string; model: string; createdAt: number; createdBy: string | null }
export type Pin = { id: string; key: string; x: number; y: number; body: string; status: 'open' | 'resolved'; authorRole: 'studio' | 'client'; authorName: string; authorMemberId: string | null; comments: { id: string; authorRole: 'studio' | 'client'; authorName: string; body: string; createdAt: number }[]; createdAt: number }
/** Why a link that was sent no longer opens: stopped by the studio, its design deleted, its lead returned or deleted, every version gone. */
export type LinkEnd = 'stopped' | 'design' | 'lead' | 'versions'
export type ShareRow = { id: string; token: string; createdAt: number; expiresAt: number; revokedAt: number | null; viewCount: number; lastViewedAt: number | null; sentVia: string | null; keys: string[]; responses: { id: string; kind: string; versionKey: string | null; clientName: string | null; message: string | null; createdAt: number }[]
  /** (audit 2026-09-26) the link no longer opens although nobody pressed Stop — its lead was returned or deleted, or every version on it was deleted. */
  ended: LinkEnd | null }
export type VisualizerEditorData = {
  design: { id: string; kind: 'lead' | 'personal'; name: string; leadId: string | null; folderId: string | null; own: OwnSwatch[]; createdBy: string; mayChange: string | null; deletedAt: number | null
    /** (audit 2026-09-26) who made the design, by name — a deleted design's note names them. */
    maker: string | null
    /** (verify round 1, F019) the design's own times — what "Saved …" reads before it has a room or a render. */
    createdAt: number; updatedAt: number
    /** (verify round 1, critic §4) the lead was returned to Qanvast or deleted: its links stay off, so Share with client says why instead
        (`LEAD_CLOSED_SHARE`), and createShareLink refuses. */
    leadClosed: boolean
    /** (wave E, files-9) the lead is in the leads' trash — the editor says so (`leadDeletedNote`) and greys Save to Files, Add to a quote…
        and Share with client (`LEAD_DELETED_ROW`); the actions refuse with the same words. */
    leadDeleted: boolean }
  lead: { id: string; name: string; style: string | null; phone: string | null; stage: string; propertyType: string | null } | null
  /** (verify round 1, critic §4) = `design.leadClosed`, where the editor reads it. */
  leadClosed: boolean
  /** (wave E, files-9) = `design.leadDeleted`. */
  leadDeleted: boolean
  rooms: EditorRoom[]
  versions: Record<string, VersionView[]>
  jobs: EditorJob[]
  library: LibraryMaterial[]
  pins: Pin[]
  shares: ShareRow[]
  /** The lead's photos a room can be made from — (F095) never a render filed from the visualizer itself. */
  leadImages: { id: string; name: string; url: string }[]
  /** The lead's drafts and other live quotes; (F100) `versions` = the visualizer sections each already holds ("Living room · V2 finishes"). */
  quotes: { id: string; number: string; title: string; status: string; versions: string[] }[]
  /** (F096) What Add to a quote can price — `isPriced` in lib/visualizer/outputs.ts reads it. */
  quotable: Quotable
  viewer: { id: string; role: string; name: string }
  studio: { name: string }
  now: number
}

/** Whether a lead has left the studio's hands for its client links: deleted, or returned to Qanvast (while the return waits or once it
    is approved — a rejected return leaves the lead with the studio). Lost and On Hold keep their links. */
export async function leadClosed(leadId: string): Promise<boolean> {
  const [l] = await db.select({ deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, leadId))
  if (!l || l.deletedAt) return true
  const [r] = await db.select({ status: leadReturns.status }).from(leadReturns).where(eq(leadReturns.leadId, leadId)).orderBy(desc(leadReturns.returnedAt)).limit(1)
  return !!r && r.status !== 'rejected'
}

async function fetchVisualizerEditorUncached(designId: string): Promise<VisualizerEditorData | null> {
  const [d] = await db.select().from(visualizerDesigns).where(eq(visualizerDesigns.id, designId))
  if (!d) return null
  const viewer = await fetchViewer()
  const gate = gateLead(d)
  if (gate && !(await canOpenLead(viewer, gate))) return null
  const [rooms, team, lead, library, brand, book] = await Promise.all([
    db.select().from(projectRooms).where(and(eq(projectRooms.designId, d.id), isNull(projectRooms.deletedAt))).orderBy(asc(projectRooms.position), asc(projectRooms.createdAt)),
    db.select({ id: members.id, name: members.name, role: members.role }).from(members),
    d.leadId ? db.select({ id: leads.id, name: leads.name, style: leads.style, phone: leads.phone, stage: leads.stage, propertyType: leads.propertyType, deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, d.leadId)).then((r) => r[0] ?? null) : Promise.resolve(null),
    db.select().from(studioMaterials).where(and(isNull(studioMaterials.deletedAt), eq(studioMaterials.isActive, true))).orderBy(asc(studioMaterials.name)),
    fetchBrand(),
    d.leadId ? db.select({ id: priceBookItems.id, name: priceBookItems.name, unit: priceBookItems.unit }).from(priceBookItems).where(and(isNull(priceBookItems.deletedAt), eq(priceBookItems.status, 'live'))) : Promise.resolve([]),
  ])
  const roomIds = rooms.map((r) => r.id)
  const jobs = roomIds.length ? await db.select().from(renderJobs).where(inArray(renderJobs.roomId, roomIds)) : []
  const jobIds = jobs.map((j) => j.id)
  const [pins, shares, files, filed, quoteRows, closed] = await Promise.all([
    jobIds.length ? db.select().from(renderAnnotations).where(and(inArray(renderAnnotations.jobId, jobIds), isNull(renderAnnotations.deletedAt))).orderBy(asc(renderAnnotations.createdAt)) : Promise.resolve([]),
    db.select().from(renderShareLinks).where(eq(renderShareLinks.designId, d.id)).orderBy(desc(renderShareLinks.createdAt)),
    d.leadId ? db.select({ id: leadFiles.id, name: leadFiles.name, thumb: leadFiles.thumb, kind: leadFiles.kind }).from(leadFiles).where(and(eq(leadFiles.leadId, d.leadId), isNull(leadFiles.deletedAt))) : Promise.resolve([]),
    /* (verify round 1) a render whose design was deleted for good is a plain picture of the lead's again — it may become a room */
    d.leadId ? db.select({ fileId: leadFileRenders.fileId }).from(leadFileRenders).innerJoin(leadFiles, eq(leadFiles.id, leadFileRenders.fileId)).innerJoin(visualizerDesigns, eq(visualizerDesigns.id, leadFileRenders.designId)).where(eq(leadFiles.leadId, d.leadId)) : Promise.resolve([]),
    d.leadId ? db.select({ id: quotes.id, number: quotes.number, title: quotes.title, status: quotes.status }).from(quotes).where(and(eq(quotes.leadId, d.leadId), isNull(quotes.deletedAt), isNull(quotes.archivedAt))).orderBy(desc(quotes.createdAt)) : Promise.resolve([]),
    d.leadId ? leadClosed(d.leadId) : Promise.resolve(false),
  ])
  const [responses, sections] = await Promise.all([
    shares.length ? db.select().from(renderConsultationRequests).where(inArray(renderConsultationRequests.shareLinkId, shares.map((s) => s.id))).orderBy(asc(renderConsultationRequests.createdAt)) : Promise.resolve([]),
    quoteRows.length ? db.select({ quoteId: quoteItems.quoteId, name: quoteItems.name }).from(quoteItems).where(and(inArray(quoteItems.quoteId, quoteRows.map((q) => q.id)), eq(quoteItems.kind, 'group'))) : Promise.resolve([]),
  ])
  const me = team.find((m) => m.id === viewer.id)
  const versions: Record<string, VersionView[]> = {}
  for (const r of rooms) versions[r.id] = versionsOf(jobs.filter((j) => j.roomId === r.id))
  const liveKeys = new Set(Object.values(versions).flat().filter((v) => !v.deleted).map((v) => v.key))
  const own = parseOwn(d.customJson)
  const renderFiles = new Set(filed.map((f) => f.fileId))
  const linked = library.filter((m) => m.priceBookItemId && book.some((b) => b.id === m.priceBookItemId)).map((m) => m.id)
  const byRate = book.filter((b) => isRateUnit(b.unit))
  /* (wave E, files-9) a lead in the leads' trash — or gone for good (its design then has no lead row at all) */
  const leadDeleted = !!d.leadId && (!lead || !!lead.deletedAt)
  return {
    design: { id: d.id, kind: d.kind === 'lead' ? 'lead' : 'personal', name: lead?.name ?? d.name, leadId: d.leadId, folderId: d.folderId, own: own.map((s) => ({ ...s, imageUrl: ownImage(d.id, s) })), createdBy: d.createdBy,
      mayChange: designChangeBlock(viewer, d.createdBy, team.find((m) => m.id === d.createdBy)?.name, d.kind === 'lead'), deletedAt: d.deletedAt?.getTime() ?? null, createdAt: d.createdAt.getTime(), updatedAt: d.updatedAt.getTime(), leadClosed: closed, leadDeleted, maker: team.find((m) => m.id === d.createdBy)?.name ?? null },
    lead: lead ? { id: lead.id, name: lead.name, style: lead.style, phone: lead.phone, stage: lead.stage, propertyType: lead.propertyType } : null,
    leadClosed: closed,
    leadDeleted,
    rooms: rooms.map((r) => ({ id: r.id, name: r.name, imageUrl: roomImage(r), sampleKey: r.sampleKey, sourceFileId: r.sourceFileId, detection: parseDetection(r.detectionJson, r), pending: readPending(parseJson<unknown>(r.stateJson, null)), position: r.position, updatedAt: r.updatedAt.getTime(), hasRenders: (versions[r.id] ?? []).some((v) => !v.deleted),
      mayDelete: roomDeleteBlock(viewer, r.createdBy, d.createdBy), mayChange: roomChangeBlock(viewer, r.createdBy, d.createdBy), createdBy: r.createdBy, stateRev: r.stateRev })),
    versions,
    jobs: jobs.map((j) => ({ id: j.id, roomId: j.roomId, kind: j.kind, model: j.model, createdAt: j.createdAt.getTime(), createdBy: j.createdBy })),
    library: library.map((m) => ({ id: m.id, name: m.name, category: m.category, hex: m.hex, finish: m.finish, imageUrl: materialImage(m) })),
    pins: pins.map(pinOf),
    shares: shares.map((s) => {
      const keys = parseSnapshot(s.snapshot).versions.map((v) => v.key)
      const ended: LinkEnd | null = s.revokedAt ? 'stopped' : d.deletedAt ? 'design' : closed ? 'lead' : keys.length && !keys.some((k) => liveKeys.has(k)) ? 'versions' : null
      return { id: s.id, token: s.token, createdAt: s.createdAt.getTime(), expiresAt: s.expiresAt.getTime(), revokedAt: s.revokedAt?.getTime() ?? null, viewCount: s.viewCount, lastViewedAt: s.lastViewedAt?.getTime() ?? null, sentVia: s.sentVia, keys, responses: responses.filter((r) => r.shareLinkId === s.id).map((r) => ({ id: r.id, kind: r.kind, versionKey: r.versionKey, clientName: r.clientName, message: r.message, createdAt: r.createdAt.getTime() })), ended }
    }),
    leadImages: files.filter((f) => f.kind === 'image' && f.thumb && !renderFiles.has(f.id) && !f.thumb.startsWith('/visualizer/img/')).map((f) => ({ id: f.id, name: f.name, url: f.thumb! })),
    quotes: quoteRows.map((q) => ({ ...q, versions: sections.filter((x) => x.quoteId === q.id && x.name.endsWith(' finishes')).map((x) => x.name) })),
    quotable: { bookNames: [...new Set(book.map((b) => b.name.trim().toLowerCase()))], linkedMaterials: linked,
      /* (verify round 1) what goes in with no quantity — the lookup addVersionToQuote makes: a linked item first, else the name's first item */
      measuredMaterials: linked.filter((id) => byRate.some((b) => b.id === library.find((m) => m.id === id)?.priceBookItemId)),
      measuredNames: [...new Set(book.map((b) => b.name.trim().toLowerCase()))].filter((n) => { const first = book.find((b) => b.name.trim().toLowerCase() === n); return !!first && isRateUnit(first.unit) }) },
    viewer: { id: viewer.id, role: viewer.role, name: me?.name ?? 'You' },
    studio: { name: brand.details.name },
    now: Date.now(),
  }
}
/** (F213) One load a request: the page and its metadata share it. */
export const fetchVisualizerEditor = cache(fetchVisualizerEditorUncached)

/** (F213) A design's title for the tab — its name or its lead's, read on its own; null when the viewer may not open it. */
export async function visualizerTitle(designId: string): Promise<string | null> {
  const [d] = await db.select({ name: visualizerDesigns.name, leadId: visualizerDesigns.leadId, sourceLeadId: visualizerDesigns.sourceLeadId }).from(visualizerDesigns).where(eq(visualizerDesigns.id, designId))
  if (!d) return null
  const gate = gateLead(d)
  if (gate && !(await canOpenLead(await fetchViewer(), gate))) return null
  if (!d.leadId) return d.name
  const [l] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, d.leadId))
  return l?.name ?? d.name
}

/** A lead's design, if it has one (the quick link opens it; the gallery's *From a lead* too). */
export async function leadDesignId(leadId: string): Promise<string | null> {
  const [d] = await db.select({ id: visualizerDesigns.id }).from(visualizerDesigns).where(and(eq(visualizerDesigns.leadId, leadId), eq(visualizerDesigns.kind, 'lead'), isNull(visualizerDesigns.deletedAt)))
  return d?.id ?? null
}

/** (F095) Where a render filed in Files leads back to: its design, room and version — `live` false once the version or its room is deleted
    (the editor then lands on the room, or the design). Null for a file that is not a filed render. */
export type RenderOrigin = { fileId: string; designId: string; roomId: string; roomName: string | null; versionKey: string; n: number; live: boolean; roomLive: boolean
  /** (verify round 1) false once the design was deleted for good — the file is then a plain picture: its *From* line is text, not a link. */
  designLive: boolean }
export async function renderOrigins(fileIds: string[]): Promise<RenderOrigin[]> {
  if (!fileIds.length) return []
  const rows = await db.select().from(leadFileRenders).where(inArray(leadFileRenders.fileId, fileIds))
  if (!rows.length) return []
  const jobIds = [...new Set(rows.map((r) => r.renderKey.split(':')[0]!))]
  const jobs = await db.select({ id: renderJobs.id, roomId: renderJobs.roomId, variantsJson: renderJobs.variantsJson }).from(renderJobs).where(inArray(renderJobs.id, jobIds))
  const roomIds = [...new Set([...jobs.map((j) => j.roomId), ...rows.map((r) => r.roomId)])]
  const designIds = [...new Set(rows.map((r) => r.designId))]
  const [rooms, designs] = await Promise.all([
    roomIds.length ? db.select({ id: projectRooms.id, name: projectRooms.name, deletedAt: projectRooms.deletedAt }).from(projectRooms).where(inArray(projectRooms.id, roomIds)) : Promise.resolve([]),
    db.select({ id: visualizerDesigns.id }).from(visualizerDesigns).where(inArray(visualizerDesigns.id, designIds)),
  ])
  const designLive = new Set(designs.map((d) => d.id))
  return rows.map((r) => {
    const [jobId, vid] = r.renderKey.split(':')
    const j = jobs.find((x) => x.id === jobId)
    const room = rooms.find((x) => x.id === (j?.roomId ?? r.roomId))
    const v = j ? parseVariants(j.variantsJson).find((x) => x.id === Number(vid)) : null
    const live = designLive.has(r.designId)
    const roomLive = live && !!room && !room.deletedAt
    return { fileId: r.fileId, designId: r.designId, roomId: j?.roomId ?? r.roomId, roomName: room?.name ?? null, versionKey: r.renderKey, n: r.n, live: roomLive && !!v && !v.deletedAt, roomLive, designLive: live }
  })
}
/** Where the editor lands a `?file=` — (verify round 1) null for a render whose design was deleted for good: it opens as the lead's plain
    picture (a room of the lead's design), as Files treats it, never a dead end. Files' *From* line reads `renderOrigins`, which keeps it. */
export async function renderOrigin(fileId: string): Promise<RenderOrigin | null> {
  const o = (await renderOrigins([fileId]))[0] ?? null
  return o && o.designLive ? o : null
}

/* ── the client's link (/renders/[token]) ── */
export type ShareSnapshot = { versions: { key: string; roomId: string; roomName: string; label: string; imageUrl: string; beforeUrl: string | null; materials: { label: string; material: string }[]
  /** (F103) the client's words, frozen with the link: "Design 2 · Golden Hour", and the room without "sketch". Older links derive them. */
  clientLabel?: string; clientRoom?: string }[] }
type SnapshotVersion = ShareSnapshot['versions'][number]
export type PublicShare = {
  state: 'open' | 'expired' | 'stopped'
  /** Why a stopped link stopped — the studio's Stop, its design deleted, its lead returned or deleted, every version on it deleted. */
  ended: LinkEnd | null
  token: string; message: string | null; createdAt: number; expiresAt: number
  /** (F104 · F209) the server's clock at render — what the pins' "2 h ago" counts from. */
  now: number
  studio: { name: string; logo: string | null; accent: string; phone: string; email: string }
  lead: { name: string } | null
  /** (F099) a link made from a lead's design: the studio has the client's number on the lead, so a call back may leave the box empty. */
  hasLead: boolean
  sender: string | null
  /** The versions still in the design, in the design's order (F102), each picture on the link's own token (critic §1). */
  versions: (SnapshotVersion & { clientLabel: string; clientRoom: string })[]
  /** (F077) how many of the link's versions the studio has deleted since — they are no longer on the page. */
  gone: number
  favourite: string | null
  notes: { id: string; versionKey: string | null; message: string; clientName: string | null; createdAt: number }[]
  calledBack: boolean
  pins: Pin[]
}

/**
 * A link and where it stands, read once for the page, the client's writes and the pictures: its versions still in the design (not deleted,
 * nor their room), in the design's order, and its state. Stopped wins over expired: the studio's Stop, the design in the trash (Restore
 * reopens it — F092), the lead returned or deleted (critic §4), or nothing left on it.
 */
export async function readShareLink(token: string) {
  const [s] = await db.select().from(renderShareLinks).where(eq(renderShareLinks.token, String(token)))
  if (!s) return null
  const snap = parseSnapshot(s.snapshot)
  const jobIds = [...new Set(snap.versions.map((v) => v.key.split(':')[0]!))]
  const [design, jobs, closed, designRooms] = await Promise.all([
    db.select({ deletedAt: visualizerDesigns.deletedAt }).from(visualizerDesigns).where(eq(visualizerDesigns.id, s.designId)).then((r) => r[0] ?? null),
    jobIds.length ? db.select({ id: renderJobs.id, roomId: renderJobs.roomId, variantsJson: renderJobs.variantsJson }).from(renderJobs).where(inArray(renderJobs.id, jobIds)) : Promise.resolve([]),
    s.leadId ? leadClosed(s.leadId) : Promise.resolve(false),
    snap.versions.some((v) => !v.clientRoom) ? db.select({ name: projectRooms.name }).from(projectRooms).where(and(eq(projectRooms.designId, s.designId), isNull(projectRooms.deletedAt))) : Promise.resolve([]),
  ])
  const roomIds = [...new Set(jobs.map((j) => j.roomId))]
  const rooms = roomIds.length ? await db.select({ id: projectRooms.id, position: projectRooms.position, createdAt: projectRooms.createdAt, deletedAt: projectRooms.deletedAt }).from(projectRooms).where(inArray(projectRooms.id, roomIds)) : []
  const facts = new Map<string, { applied: Applied; finishes: Variant['finishes']; n: number; live: boolean; place: number }>()
  const order = [...rooms].sort((a, b) => a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime()).map((r) => r.id)
  for (const j of jobs) {
    const room = rooms.find((r) => r.id === j.roomId)
    for (const v of parseVariants(j.variantsJson)) facts.set(versionKey(j.id, v.id), { applied: v.applied, finishes: v.finishes, n: v.n, live: !!room && !room.deletedAt && !v.deletedAt, place: order.indexOf(j.roomId) })
  }
  const vn = (v: SnapshotVersion) => facts.get(v.key)?.n ?? Number(/^V(\d+)/.exec(v.label)?.[1] ?? 0)
  const firstSeen = snap.versions.map((v) => v.roomId)
  const place = (v: SnapshotVersion) => { const p = facts.get(v.key)?.place ?? -1; return p >= 0 ? p : 1000 + firstSeen.indexOf(v.roomId) }
  const sorted = [...snap.versions].sort((a, b) => place(a) - place(b) || vn(a) - vn(b))
  /* the client's words: frozen on newer links; (verify round 1) an older link numbers each design as the studio does (V2 is Design 2) */
  const rooms4client = clientRoomNames(sorted.map((v) => v.roomName), [...designRooms.map((r) => r.name), ...sorted.map((v) => v.roomName)])
  const worded = sorted.map((v) => ({ ...v, clientLabel: v.clientLabel ?? clientVersionLabel(vn(v), facts.get(v.key)?.applied ?? null), clientRoom: v.clientRoom ?? rooms4client.get(v.roomName) ?? v.roomName }))
  const live = worded.filter((v) => facts.get(v.key)?.live)
  const now = Date.now()
  const ended: LinkEnd | null = s.revokedAt ? 'stopped' : !design || design.deletedAt ? 'design' : closed ? 'lead' : !live.length ? 'versions' : null
  const state: PublicShare['state'] = ended ? 'stopped' : s.expiresAt.getTime() < now ? 'expired' : 'open'
  return { s, live, gone: worded.length - live.length, state, ended, now, facts }
}
export type ShareLinkRead = NonNullable<Awaited<ReturnType<typeof readShareLink>>>
/** The words a closed link's client action answers with — (verify round 1) naming whoever shared it, as the page does. */
export const closedLinkError = (r: Pick<ShareLinkRead, 'state'> | null, sender?: string | null) => {
  const who = sender?.trim() || 'your designer'
  return r?.state === 'expired' ? `This link has expired — ask ${who} for a new one.` : `This link has ended — ask ${who} for an updated one.`
}
/** (verify round 1) closedLinkError with the sender read off the link. */
export async function closedLinkMessage(r: Pick<ShareLinkRead, 'state' | 's'> | null): Promise<string> {
  const by = r?.s.createdBy ?? null
  const sender = by ? (await db.select({ name: members.name }).from(members).where(eq(members.id, by)))[0]?.name ?? null : null
  return closedLinkError(r, sender)
}

export async function fetchShare(token: string): Promise<PublicShare | null> {
  const got = await readShareLink(token)
  if (!got) return null
  const { s, live, state, ended, now, facts } = got
  const [brand, lead, sender, reqs] = await Promise.all([
    fetchBrand(),
    s.leadId ? db.select({ name: leads.name }).from(leads).where(eq(leads.id, s.leadId)).then((r) => r[0] ?? null) : Promise.resolve(null),
    s.createdBy ? db.select({ name: members.name }).from(members).where(eq(members.id, s.createdBy)).then((r) => r[0]?.name ?? null) : Promise.resolve(null),
    db.select().from(renderConsultationRequests).where(eq(renderConsultationRequests.shareLinkId, s.id)).orderBy(asc(renderConsultationRequests.createdAt)),
  ])
  const base = { state, ended, token: s.token, message: s.message, createdAt: s.createdAt.getTime(), expiresAt: s.expiresAt.getTime(), now,
    studio: { name: brand.details.name, logo: brand.kit.logo, accent: brand.kit.colors.accent, phone: brand.details.phone, email: brand.details.email },
    lead, hasLead: !!s.leadId, sender }
  /* a link that no longer opens carries nothing of the design — its page says it ended, and its pictures are not served */
  if (state !== 'open') return { ...base, versions: [], gone: 0, favourite: null, notes: [], calledBack: false, pins: [] }
  const keys = live.map((v) => v.key)
  const jobIds = [...new Set(keys.map((k) => k.split(':')[0]!))]
  const roomIds = [...new Set(live.map((v) => v.roomId))]
  /* (D1, verify round 1) the client sees the threads they started, with the studio's replies in them — the team's own pins stay private */
  const [pins, rooms] = await Promise.all([
    jobIds.length ? db.select().from(renderAnnotations).where(and(inArray(renderAnnotations.jobId, jobIds), isNull(renderAnnotations.deletedAt), eq(renderAnnotations.authorRole, 'client'))).orderBy(asc(renderAnnotations.createdAt)) : Promise.resolve([]),
    roomIds.length ? db.select({ id: projectRooms.id, originalImageUrl: projectRooms.originalImageUrl, detectionJson: projectRooms.detectionJson, sampleKey: projectRooms.sampleKey }).from(projectRooms).where(inArray(projectRooms.id, roomIds)) : Promise.resolve([]),
  ])
  const fav = [...reqs].reverse().find((r) => r.kind === 'favourite')
  /* (verify round 1) each design next to the client's own room — never the version it was built on, which may be another design on the
     same page — and everything the picture shows, not only its last step (a version never changes, so reading it now is reading it as sent) */
  const told = (v: SnapshotVersion) => {
    const f = facts.get(v.key), room = rooms.find((r) => r.id === v.roomId)
    if (!f || !room) return { beforeUrl: v.beforeUrl, materials: v.materials }
    return { beforeUrl: roomImage(room) ?? v.beforeUrl, materials: clientLines(f, parseDetection(room.detectionJson, room)) }
  }
  return {
    ...base,
    versions: live.map((v) => { const t = told(v); return { ...v, ...t, imageUrl: withToken(v.imageUrl, s.token) ?? v.imageUrl, beforeUrl: withToken(t.beforeUrl, s.token) } }),
    gone: got.gone,
    favourite: fav?.versionKey && keys.includes(fav.versionKey) ? fav.versionKey : null,
    notes: reqs.filter((r) => r.kind === 'note' && r.message && (!r.versionKey || keys.includes(r.versionKey))).map((r) => ({ id: r.id, versionKey: r.versionKey, message: r.message!, clientName: r.clientName, createdAt: r.createdAt.getTime() })),
    calledBack: reqs.some((r) => r.kind === 'call_back'),
    pins: pins.filter((p) => keys.includes(versionKey(p.jobId, p.variantId))).map(pinOf),
  }
}

/** (critic §2) What WhatsApp shows when the link is pasted: the studio, a line on what is inside, and the first design's picture — only
    while the link opens (a stopped link's preview shows no render). */
export type ShareMeta = { title: string; description: string | null; image: string | null; open: boolean }
export async function shareMeta(token: string): Promise<ShareMeta | null> {
  const got = await readShareLink(token)
  if (!got) return null
  const brand = await fetchBrand()
  const title = `Design ideas · ${brand.details.name}`
  if (got.state !== 'open') return { title, description: null, image: null, open: false }
  const sender = got.s.createdBy ? (await db.select({ name: members.name }).from(members).where(eq(members.id, got.s.createdBy)))[0]?.name ?? null : null
  const rooms = [...new Set(got.live.map((v) => v.clientRoom))]
  const n = got.live.length
  const what = `${n === 1 ? 'A design idea' : `${n} design ideas`} for your ${roomsInSentence(rooms)}`
  return { title, description: `${what} — from ${sender ? `${sender}, ` : ''}${brand.details.name}`, image: withToken(got.live[0]?.imageUrl ?? null, got.s.token), open: true }
}
export type { RenderShareLink }

/** (wave E, E8) How many of a lead's client render links open today — what deleting the lead stops ("Its n client render links stop
    working."). A link counts while the client can open it: not stopped, not expired, its design not in the trash, something still on it,
    and its lead still with the studio. Takes one lead or several (a bulk delete), and counts each link once. */
export async function countLiveRenderLinks(leadId: string | readonly string[]): Promise<number> {
  const ids = [...new Set(typeof leadId === 'string' ? [leadId] : leadId)].filter(Boolean)
  if (!ids.length) return 0
  const rows = await db.select({ token: renderShareLinks.token, expiresAt: renderShareLinks.expiresAt }).from(renderShareLinks)
    .innerJoin(visualizerDesigns, eq(visualizerDesigns.id, renderShareLinks.designId))
    .where(and(inArray(renderShareLinks.leadId, ids), isNull(renderShareLinks.revokedAt), isNull(visualizerDesigns.deletedAt)))
  const now = Date.now()
  const maybe = rows.filter((r) => r.expiresAt.getTime() >= now)
  if (!maybe.length) return 0
  const read = await Promise.all(maybe.map((r) => readShareLink(r.token)))
  return read.filter((r) => r?.state === 'open').length
}

/** Company › Materials. */
export type MaterialRow = LibraryMaterial & { description: string | null; folderId: string | null; priceBookItemId: string | null; uploadedBy: string | null; author: string | null; authorColor: string | null; createdAt: Date; updatedAt: Date; deletedAt: Date | null; mayChange: string | null
  /** (D6, verify round 1) how many live designs carry it — in a version, or in the picks waiting for Generate. The delete confirm and the
      Deleted sheet's Delete forever say "Used in n designs". */
  usedIn: number
  /** (wave E, files-14) `usedIn`, split: the designs with a version made with it (their renders keep it), and the designs where it is only
      picked, waiting for Generate (the pick is set aside while the material is deleted and comes back with a restore). `usedIn` = both. */
  renderedIn: number
  waitingIn: number
  /** (wave E, E5) whoever changed it last — a member's name, or null when nobody has changed it since it was added (the card then names
      `author`): "edited … by {editedBy ?? author}". */
  editedBy: string | null }
export type MaterialsData = { items: MaterialRow[]; deleted: MaterialRow[]; folders: Folder[]; bookItems: { id: string; name: string; category: string | null; vendor: string | null }[]; viewer: { id: string; role: string }; now: number }
export async function fetchStudioMaterials(): Promise<MaterialsData> {
  const viewer = await fetchViewer()
  const [rows, team, folderRows, book, rooms, jobs] = await Promise.all([
    db.select().from(studioMaterials).orderBy(asc(studioMaterials.name)),
    db.select({ id: members.id, name: members.name, color: members.color }).from(members),
    db.select().from(libraryFolders).where(and(eq(libraryFolders.library, 'materials'), isNull(libraryFolders.deletedAt))),
    db.select({ id: priceBookItems.id, name: priceBookItems.name, category: priceBookItems.category, vendor: priceBookItems.vendor }).from(priceBookItems).where(and(isNull(priceBookItems.deletedAt), eq(priceBookItems.status, 'live'))).orderBy(asc(priceBookItems.name)),
    db.select({ id: projectRooms.id, designId: projectRooms.designId, stateJson: projectRooms.stateJson }).from(projectRooms).innerJoin(visualizerDesigns, eq(visualizerDesigns.id, projectRooms.designId)).where(and(isNull(projectRooms.deletedAt), isNull(visualizerDesigns.deletedAt))),
    db.select({ roomId: renderJobs.roomId, variantsJson: renderJobs.variantsJson }).from(renderJobs),
  ])
  const byMember = new Map(team.map((m) => [m.id, m]))
  /* a material is on a design when a version or the waiting picks name it (`lib:{id}`, or a shaded variant `lib:{id}~2`); (wave E, files-14)
     the versions and the waiting picks are read apart — a design with a render of it counts as rendered, one with only a pick as waiting */
  const picks = new Map<string, string[]>(), made = new Map<string, string[]>()
  const designOfRoom = new Map(rooms.map((r) => [r.id, r.designId]))
  for (const r of rooms) if (r.stateJson?.includes('"lib:')) picks.set(r.designId, [...(picks.get(r.designId) ?? []), r.stateJson])
  for (const j of jobs) { const d = designOfRoom.get(j.roomId); if (d && j.variantsJson.includes('"lib:')) made.set(d, [...(made.get(d) ?? []), j.variantsJson]) }
  const names = (id: string) => (t: string) => t.includes(`"lib:${id}"`) || t.includes(`"lib:${id}~`)
  const usage = (id: string) => {
    const has = names(id)
    const rendered = new Set([...made].filter(([, all]) => all.some(has)).map(([d]) => d))
    const waiting = [...picks].filter(([d, all]) => !rendered.has(d) && all.some(has)).length
    return { renderedIn: rendered.size, waitingIn: waiting, usedIn: rendered.size + waiting }
  }
  const row = (m: typeof rows[number]): MaterialRow => ({ id: m.id, name: m.name, category: m.category, hex: m.hex, finish: m.finish, imageUrl: materialImage(m), description: m.description, folderId: m.folderId, priceBookItemId: m.priceBookItemId, uploadedBy: m.uploadedBy, author: m.uploadedBy ? byMember.get(m.uploadedBy)?.name ?? null : null, authorColor: m.uploadedBy ? byMember.get(m.uploadedBy)?.color ?? null : null, createdAt: m.createdAt, updatedAt: m.updatedAt, deletedAt: m.deletedAt, mayChange: materialChangeBlock(viewer, m.uploadedBy, m.uploadedBy ? byMember.get(m.uploadedBy)?.name : null), ...usage(m.id), editedBy: m.updatedBy ? byMember.get(m.updatedBy)?.name ?? null : null })
  return { items: rows.filter((m) => !m.deletedAt).map(row), deleted: rows.filter((m) => m.deletedAt).map(row), folders: folderRows.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId ?? null, library: 'materials' as const, createdAt: f.createdAt.getTime(), updatedAt: f.updatedAt.getTime(), createdBy: f.createdBy ?? null, mayChange: folderChangeBlockFor('materials', viewer, f.createdBy) })), bookItems: book, viewer: { id: viewer.id, role: viewer.role }, now: Date.now() }
}
