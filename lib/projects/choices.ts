import 'server-only'
import { seesCost } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1)
import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, inArray, isNotNull, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { keepBytes } from '@/lib/leads/file-store'   // (pending modules S34)
import {
  homeownerLeadLinks, homeownerProfiles, leadAssignees, leadFiles, leads, members, priceBookItems, projectMilestones, projectRooms, projectSelectionOptions,
  projectSelections, projects, quotes, renderJobs, studioMaterials, visualizerDesigns, type ProjectSelection, type ProjectSelectionOption,
} from '@/lib/db/schema'
import { canOpenLead, fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { itemPickable } from '@/lib/company/price-book-rules'
import { materialImage, versionsOf } from '@/lib/visualizer/queries'
import { isDataImage, renderPicture } from '@/lib/visualizer/images'
import { moneySGD, titleCaseName } from '@/lib/format'
import { fetchStudio, fetchTrades, fetchUnits } from '@/lib/settings/queries'
import { portalPath } from '@/lib/portal/model'
import { fetchPortalSections } from '@/lib/portal/sections-queries'
import type { HomeChoice, HomeFacts } from '@/lib/portal/needs'
import type { VisitorLink } from '@/lib/portal/session'
import { portalPeopleOf, portalWho } from '@/lib/portal/household'
import { mayChangeProject } from './policy'
import { isChoiceAnswer, type ChoiceAnswer } from './decline'
import { variationsOfChoices } from './payments'
import { dayOf } from './schedule-model'
import {
  SHARE_WAIT_NOTE_MAX, choiceWaitLine, isChoiceNear, isChoiceOverdue, isChoiceSource, isChoiceStatus, normPrice, waitNamesChoice, waitSetByShare,
  type ChoiceMilestone, type ChoicePick, type ChoiceSources, type ChoiceView, type ChoicesData, type OptionView, type PickUndo, type SourceItem,
} from './choices-model'

/*
 * (Projects round 8) Choices on the server: the tab's read, the listing's facts (Waiting on client · Choice overdue), the portal's read and
 * its file rule, the sources an option can come from, and the one read round 6 drafts a variation order from (`pickPriceDifference`). Who
 * sees: the project's lead's rule (`canOpenLead`) — a project the viewer may not open answers not found. The client never reads a Draft, a
 * deleted choice or option, who in the studio made it, or anything internal.
 */

export const CHOICES_FOLDER = 'Choices'
const ms = (d: Date | null | undefined) => (d ? d.getTime() : null)

/**
 * (REG-1068) The GST a pick's variation order adds, per project, as `createVariationOrder` raises it: the project's quote charges GST (a
 * direct project, the studio's registration) → the studio's rate (Settings › Studio), else 0. The card, the portal, the bell and Activity
 * state a pick's change to the contract with it, so they say what the variation order will carry.
 */
export async function pickGstPct(projectIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (!projectIds.length) return out
  const [ps, studio] = await Promise.all([
    db.select({ id: projects.id, gst: quotes.gstEnabled }).from(projects).leftJoin(quotes, eq(quotes.id, projects.quoteId)).where(inArray(projects.id, projectIds)),
    fetchStudio(),
  ])
  for (const p of ps) out.set(p.id, (p.gst ?? studio.gstRegistered) ? studio.gstPct : 0)
  return out
}

/** The lead's "Choices" folder at the top of its Files — made with the first picture an option keeps (Site updates' way, round 3). */
export async function choicesFolder(leadId: string, ownerId: string): Promise<string> {
  const [have] = await db.select({ id: leadFiles.id }).from(leadFiles)
    .where(and(eq(leadFiles.leadId, leadId), eq(leadFiles.kind, 'folder'), eq(leadFiles.name, CHOICES_FOLDER), isNull(leadFiles.parentId), isNull(leadFiles.deletedAt))).limit(1)
  if (have) return have.id
  const id = randomUUID(), now = new Date()
  await db.insert(leadFiles).values({ id, leadId, kind: 'folder', name: CHOICES_FOLDER, thumb: null, createdAt: now, parentId: null, ownerId, updatedAt: now })
  return id
}

/**
 * An option's picture, kept as the lead's Files keep pictures (REG-684): a file in Files › Choices — its bytes beside it when they came as a
 * data URL (an upload, a material's photo, a render the engine made), else its thumb is the public picture it names (a sample room, a demo
 * swatch). Returns the file's id.
 */
export async function keepOptionPicture(leadId: string, ownerId: string, o: { name: string; picture: string }): Promise<string> {
  const folder = await choicesFolder(leadId, ownerId)
  const id = randomUUID(), now = new Date()
  const data = isDataImage(o.picture) ? o.picture : null
  const mime = data ? /^data:([^;]+);/.exec(data)?.[1] ?? 'image/jpeg' : /\.png$/i.test(o.picture) ? 'image/png' : 'image/jpeg'
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
  const name = `${o.name.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'Option'}.${ext}`
  const size = data ? Math.round((data.length - data.indexOf(',') - 1) * 0.75) : null
  await db.insert(leadFiles).values({ id, leadId, kind: 'image', name, thumb: data ? `/files/img/${id}` : o.picture, createdAt: now, parentId: folder, ownerId, sizeBytes: size, mime, updatedAt: now })
  if (data) await keepBytes(db, id, data)   // (pending modules S34) through the one file store
  return id
}

/** The picture behind a source, as the server reads it — a data URL or a public path; null for a colour or nothing. */
export async function sourcePicture(source: string, ref: string | null): Promise<{ picture: string | null; hex: string | null } | null> {
  if (!ref) return null
  if (source === 'material') {
    const [m] = await db.select().from(studioMaterials).where(and(eq(studioMaterials.id, ref), isNull(studioMaterials.deletedAt))).limit(1)
    return m ? { picture: m.imageUrl ?? null, hex: m.imageUrl ? null : m.hex } : null
  }
  if (source === 'price_book') {
    const [i] = await db.select().from(priceBookItems).where(and(eq(priceBookItems.id, ref), isNull(priceBookItems.deletedAt))).limit(1)
    if (!i) return null
    if (i.thumb) return { picture: i.thumb, hex: null }
    /* an item with no photo shows the material it is quoted as (Company › Materials' Price book link), else nothing */
    const [m] = await db.select().from(studioMaterials).where(and(eq(studioMaterials.priceBookItemId, i.id), isNull(studioMaterials.deletedAt))).orderBy(asc(studioMaterials.name)).limit(1)
    return { picture: m?.imageUrl ?? null, hex: m && !m.imageUrl ? m.hex : null }
  }
  if (source === 'render') {
    const [jobId, v] = ref.split(':')
    const pic = jobId && v ? await renderPicture(jobId, Number(v)) : null
    return pic ? { picture: pic, hex: null } : null
  }
  return null
}

/* ── the tab ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const milestoneOf = (m: typeof projectMilestones.$inferSelect): ChoiceMilestone => ({ id: m.id, title: m.title, status: m.status, start: dayOf(m.startDate), position: m.position })

function pickOf(s: ProjectSelection, names: Map<string, string>): ChoicePick | null {
  if (s.status !== 'chosen' || !s.chosenOptionId || !s.chosenAt) return null
  return { optionId: s.chosenOptionId, by: s.chosenBy === 'studio' ? 'studio' : 'client', member: s.chosenMemberId ? names.get(s.chosenMemberId) ?? null : null, at: s.chosenAt.getTime(), note: s.chosenNote }
}

async function optionViews(selectionIds: string[]): Promise<Map<string, OptionView[]>> {
  const out = new Map<string, OptionView[]>()
  if (!selectionIds.length) return out
  const rows = await db.select({ o: projectSelectionOptions, thumb: leadFiles.thumb, gone: leadFiles.deletedAt }).from(projectSelectionOptions)
    .leftJoin(leadFiles, eq(leadFiles.id, projectSelectionOptions.fileId))
    .where(and(inArray(projectSelectionOptions.selectionId, selectionIds), isNull(projectSelectionOptions.deletedAt)))
    .orderBy(asc(projectSelectionOptions.position), asc(projectSelectionOptions.createdAt))
  for (const r of rows) {
    const o = r.o
    const list = out.get(o.selectionId) ?? []
    list.push({ id: o.id, name: o.name, description: o.description, src: r.gone ? null : r.thumb ?? null, fileId: r.gone ? null : o.fileId, hex: o.hex, priceMinor: normPrice(o.priceMinor), source: isChoiceSource(o.source) ? o.source : 'upload', sourceRef: o.sourceRef, vendor: o.vendor })
    out.set(o.selectionId, list)
  }
  return out
}

/** (gaps build D, item 2) The client's no while it stands — `person` names who said it (`people`: the homeowners' given names). */
function noOf(s: ProjectSelection, people?: Map<string, string>): ChoiceView['answer'] {
  if (s.status !== 'declined' || !isChoiceAnswer(s.clientAnswer) || !s.clientAnswerAt) return null
  return { kind: s.clientAnswer, note: s.clientAnswerNote, at: s.clientAnswerAt.getTime(), person: s.clientAnswerBy ? people?.get(s.clientAnswerBy) ?? null : null }
}
export function choiceView(s: ProjectSelection, options: OptionView[], milestones: ChoiceMilestone[], names: Map<string, string>, people?: Map<string, string>): ChoiceView {
  return {
    id: s.id, title: s.title, room: s.room, note: s.note, status: isChoiceStatus(s.status) ? s.status : 'draft',
    milestone: s.milestoneId ? milestones.find((m) => m.id === s.milestoneId) ?? null : null,
    neededBy: ms(s.neededBy), options, chosen: pickOf(s, names),
    answer: noOf(s, people), studioNote: s.studioNote, receipt: (s.status === 'chosen' || s.status === 'declined') && s.receiptFileId && s.receiptHash ? { fileId: s.receiptFileId, hash: s.receiptHash } : null,   /* (parity map, TD-044) a no's receipt too */   // (gaps build D, items 2 · 7 · 11)
    createdBy: s.createdBy ? names.get(s.createdBy) ?? null : null, createdAt: s.createdAt.getTime(),
    sharedBy: s.sharedBy ? names.get(s.sharedBy) ?? null : null, sharedAt: ms(s.sharedAt), updatedAt: s.updatedAt.getTime(),
  }
}

/** The Choices tab: every live choice of the project; null when the viewer may not see the project. */
export async function fetchProjectChoices(projectId: string): Promise<ChoicesData | null> {
  const viewer = await fetchViewer()
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt), isNull(leads.deletedAt))).limit(1)
  if (!row) return null
  const { p, l } = row
  if (!(await canOpenLead(viewer, l.id))) return null
  const [sels, team, studio, msRows, link, sections] = await Promise.all([
    db.select().from(projectSelections).where(and(eq(projectSelections.projectId, p.id), isNull(projectSelections.deletedAt))).orderBy(desc(projectSelections.createdAt)),
    db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, l.id)),
    db.select({ id: members.id, name: members.name }).from(members),
    db.select().from(projectMilestones).where(and(eq(projectMilestones.projectId, p.id), isNull(projectMilestones.deletedAt))).orderBy(asc(projectMilestones.position)),
    db.select({ id: homeownerLeadLinks.id }).from(homeownerLeadLinks).where(and(eq(homeownerLeadLinks.leadId, l.id), isNotNull(homeownerLeadLinks.invitedAt), isNull(homeownerLeadLinks.withdrawnAt))).limit(1),
    fetchPortalSections(),   // (fix-C, C-18) the portal's Choices switch
  ])
  const names = new Map(studio.map((m) => [m.id, m.name]))
  const milestones = msRows.map(milestoneOf)
  const opts = await optionViews(sels.map((s) => s.id))
  const client = titleCaseName(l.name)
  const people = sels.some((s) => s.clientAnswerBy) ? (await portalPeopleOf([l.id])).get(l.id)?.given : undefined   // (gaps build D, item 2) who said no
  const vos = await variationsOfChoices(sels.map((s) => s.id))   // (Projects round 6) a pick's variation order
  const gstPct = (await pickGstPct([p.id])).get(p.id) ?? 0   // (REG-1068)
  const trades = (await fetchTrades()).trades   // (gaps build D, item 11) Save to the Price book's categories
  const units = (await fetchUnits()).units   // (S44I — M9) and the studio's units
  return {
    project: { id: p.id, name: p.name, number: p.number, stage: p.stage, leadId: l.id },
    client: { name: client, firstName: client.split(/\s+/)[0] ?? client, invited: link.length > 0, section: sections.choices !== false },
    choices: sels.map((s) => ({ ...choiceView(s, opts.get(s.id) ?? [], milestones, names, people), variation: vos.get(s.id) ?? null })),
    milestones,
    gstPct, trades, units,
    viewer: { id: viewer.id, mayChange: mayChangeProject(viewer, team.map((t) => t.memberId)) && p.stage !== 'completed', costs: seesCost(viewer) },   // (pending modules S41b-1)   // (REG-1069) a completed project's choices read only
    now: Date.now(),
  }
}

/* ── the listing's facts ───────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Per project: the shared choices past their needed-by day (Choice overdue) and the Waiting on client lines (past or near) — (gaps build D,
    item 2) and the titles of the choices the client said no to (back with the studio). */
export type ChoiceFacts = { overdue: number; waits: string[]; declined?: { id: string; title: string; who: string | null }[] }
export async function choiceFactsFor(projectIds: string[], now = Date.now()): Promise<Map<string, ChoiceFacts>> {
  const out = new Map<string, ChoiceFacts>()
  if (!projectIds.length) return out
  const today = dayOf(new Date(now))
  const rows = await db.select({ id: projectSelections.id, projectId: projectSelections.projectId, title: projectSelections.title, status: projectSelections.status, neededBy: projectSelections.neededBy, by: projectSelections.clientAnswerBy })
    .from(projectSelections).where(and(inArray(projectSelections.projectId, projectIds), inArray(projectSelections.status, ['shared', 'declined']), isNull(projectSelections.deletedAt))).orderBy(asc(projectSelections.neededBy))
  /* (gaps build D, item 2) who said no, by their given name */
  const who = rows.some((r) => r.status === 'declined' && r.by) ? new Map((await db.select({ id: homeownerProfiles.id, name: homeownerProfiles.name }).from(homeownerProfiles).where(inArray(homeownerProfiles.id, rows.map((r) => r.by).filter((x): x is string => !!x)))).map((h) => [h.id, titleCaseName(h.name).split(/\s+/)[0] ?? h.name])) : new Map<string, string>()
  /* (fix-C, C-18) a choice waits on the client only when they can see it: invited to the portal, its Choices switched on — never blamed on a
     client who has no way to answer */
  const reach = await choiceReach(projectIds)
  for (const r of rows) {
    /* (gaps build D, item 2) a no is the studio's to answer — raised whatever the portal's reach */
    if (r.status === 'declined') { const f = out.get(r.projectId) ?? { overdue: 0, waits: [] }; f.declined = [...(f.declined ?? []), { id: r.id, title: r.title, who: r.by ? who.get(r.by) ?? null : null }]; out.set(r.projectId, f); continue }
    if (!reach.has(r.projectId)) continue
    const c = { title: r.title, status: r.status, neededBy: ms(r.neededBy) }
    const f = out.get(r.projectId) ?? { overdue: 0, waits: [] }
    if (isChoiceOverdue(c, today)) f.overdue++
    if (isChoiceNear(c, today)) f.waits.push(choiceWaitLine(c, today))
    out.set(r.projectId, f)
  }
  return out
}

/** (fix-C, C-18) The projects whose client can see a shared choice: invited to the portal (an invite not withdrawn) and Choices switched on. */
export async function choiceReach(projectIds: string[]): Promise<Set<string>> {
  if (!projectIds.length) return new Set()
  const [sections, rows] = await Promise.all([
    fetchPortalSections(),
    db.select({ projectId: projects.id }).from(projects).innerJoin(homeownerLeadLinks, eq(homeownerLeadLinks.leadId, projects.leadId))
      .where(and(inArray(projects.id, projectIds), isNotNull(homeownerLeadLinks.invitedAt), isNull(homeownerLeadLinks.withdrawnAt))),
  ])
  return sections.choices === false ? new Set() : new Set(rows.map((r) => r.projectId))
}

/* ── round 6's seam: a pick's price difference, for a variation order's draft ─────────────────────────────────────────────── */

export type PickDifference = {
  selectionId: string; projectId: string; leadId: string; title: string; room: string | null
  option: { id: string; name: string; description: string | null }
  /** Against the quote, in cents: positive adds, negative saves (never 0 — a pick that changes nothing answers null). */
  priceMinor: number
  chosenAt: Date; chosenBy: 'client' | 'studio'; chosenMemberId: string | null; note: string | null
}
/**
 * (Projects round 8 → round 6) The one read a variation order's draft starts from: a chosen choice's picked option and its price against the
 * quote. null when the choice is gone, not chosen, or its pick changes nothing. Round 6 calls it when a pick lands (the client's
 * `chooseOption` in app/portal/choices-actions.ts, the studio's `chooseForClient` in app/projects/choices-actions.ts) — no Who-sees check
 * here: the caller has made it.
 */
export async function pickPriceDifference(selectionId: string): Promise<PickDifference | null> {
  const [r] = await db.select({ s: projectSelections, p: projects }).from(projectSelections).innerJoin(projects, eq(projects.id, projectSelections.projectId))
    .where(and(eq(projectSelections.id, selectionId), isNull(projectSelections.deletedAt))).limit(1)
  if (!r || r.s.status !== 'chosen' || !r.s.chosenOptionId || !r.s.chosenAt) return null
  const [o] = await db.select().from(projectSelectionOptions).where(eq(projectSelectionOptions.id, r.s.chosenOptionId)).limit(1)
  const price = normPrice(o?.priceMinor)
  if (!o || price == null) return null
  return { selectionId, projectId: r.p.id, leadId: r.p.leadId, title: r.s.title, room: r.s.room, option: { id: o.id, name: o.name, description: o.description }, priceMinor: price,
    chosenAt: r.s.chosenAt, chosenBy: r.s.chosenBy === 'studio' ? 'studio' : 'client', chosenMemberId: r.s.chosenMemberId, note: r.s.chosenNote }
}

/* ── the sources an option comes from (the Add an option dialog) ───────────────────────────────────────────────────────────── */

/** Company › Materials (live), the Price book (what this viewer may pick), and the renders: the client's own design first, then the
    studio's designs this viewer may see (Who sees leads for a copy of a lead's). Addresses only — a page never carries a picture. */
export async function fetchChoiceSources(projectId: string): Promise<ChoiceSources | null> {
  const viewer = await fetchViewer()
  const [p] = await db.select().from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!p || !(await canOpenLead(viewer, p.leadId))) return null
  const [mats, book, designs, visible] = await Promise.all([
    db.select().from(studioMaterials).where(and(isNull(studioMaterials.deletedAt), eq(studioMaterials.isActive, true))).orderBy(asc(studioMaterials.category), asc(studioMaterials.name)),
    db.select().from(priceBookItems).where(isNull(priceBookItems.deletedAt)).orderBy(asc(priceBookItems.category), asc(priceBookItems.name)),
    db.select().from(visualizerDesigns).where(isNull(visualizerDesigns.deletedAt)).orderBy(desc(visualizerDesigns.updatedAt)),
    visibleLeadIds(viewer),
  ])
  const bookMaterial = new Map<string, (typeof mats)[number]>()
  for (const m of mats) if (m.priceBookItemId && !bookMaterial.has(m.priceBookItemId)) bookMaterial.set(m.priceBookItemId, m)
  const material: SourceItem[] = mats.map((m) => ({ key: m.id, name: m.name, line: m.category, src: materialImage(m), hex: m.imageUrl ? null : m.hex, bookPrice: null }))
  const price_book: SourceItem[] = book.filter((i) => itemPickable(viewer, i)).map((i) => {
    const m = bookMaterial.get(i.id)
    return { key: i.id, name: i.name, line: [i.category, i.vendor].filter(Boolean).join(' · ') || null, src: i.thumb ?? (m ? materialImage(m) : null), hex: !i.thumb && m && !m.imageUrl ? m.hex : null, bookPrice: `${moneySGD(i.costMinor + i.markupMinor)} per ${i.unit} in the Price book`, vendor: i.vendor }
  })
  const lead = designs.filter((d) => d.kind === 'lead' && d.leadId === p.leadId)
  const studio = designs.filter((d) => d.kind === 'personal' && (!d.sourceLeadId || !visible || visible.has(d.sourceLeadId)))
  const picked = [...lead, ...studio]
  const rooms = picked.length ? await db.select().from(projectRooms).where(and(inArray(projectRooms.designId, picked.map((d) => d.id)), isNull(projectRooms.deletedAt))).orderBy(asc(projectRooms.position)) : []
  const jobs = rooms.length ? await db.select({ id: renderJobs.id, roomId: renderJobs.roomId, kind: renderJobs.kind, createdAt: renderJobs.createdAt, createdBy: renderJobs.createdBy, variantsJson: renderJobs.variantsJson }).from(renderJobs).where(inArray(renderJobs.roomId, rooms.map((r) => r.id))) : []
  const render: SourceItem[] = []
  for (const d of picked) {
    const group = d.kind === 'lead' ? 'The client’s design' : d.name
    for (const r of rooms.filter((x) => x.designId === d.id)) {
      for (const v of versionsOf(jobs.filter((j) => j.roomId === r.id)).filter((x) => !x.deleted)) {
        render.push({ key: v.key, name: `${r.name} · V${v.n}`, line: v.descriptor, src: v.imageUrl, hex: null, bookPrice: null, group })
      }
    }
  }
  return { material, price_book, render }
}

/* ── the portal ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** (lib/portal/files.ts PORTAL_FILE_RULES) A file the client may open because it is the picture of an option on a choice shared with them. */
export async function isSharedChoicePicture(fileId: string): Promise<boolean> {
  const [hit] = await db.select({ id: projectSelectionOptions.id }).from(projectSelectionOptions)
    .innerJoin(projectSelections, eq(projectSelections.id, projectSelectionOptions.selectionId))
    .where(and(eq(projectSelectionOptions.fileId, fileId), isNull(projectSelectionOptions.deletedAt), isNull(projectSelections.deletedAt), inArray(projectSelections.status, ['shared', 'chosen', 'declined']))).limit(1)
  return !!hit
}

/** (lib/portal/home.ts `loadHomeFacts`) Each home's choices the client can see — shared or chosen, on its project — for What needs you and the
    Client access panel. Fills `facts.choices` in place. */
export async function attachHomeChoices(facts: Map<string, HomeFacts>): Promise<void> {
  const leadIds = [...facts.keys()]
  if (!leadIds.length) return
  const rows = await db.select({ s: projectSelections, leadId: projects.leadId }).from(projectSelections).innerJoin(projects, eq(projects.id, projectSelections.projectId))
    .where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt), isNull(projectSelections.deletedAt), inArray(projectSelections.status, ['shared', 'chosen', 'declined'])))
  const counts = new Map<string, number>()
  if (rows.length) {
    const opts = await db.select({ selectionId: projectSelectionOptions.selectionId }).from(projectSelectionOptions).where(and(inArray(projectSelectionOptions.selectionId, rows.map((r) => r.s.id)), isNull(projectSelectionOptions.deletedAt)))
    for (const o of opts) counts.set(o.selectionId, (counts.get(o.selectionId) ?? 0) + 1)
  }
  for (const [leadId, f] of facts) {
    f.choices = rows.filter((r) => r.leadId === leadId).map((r): HomeChoice => ({
      id: r.s.id, projectId: r.s.projectId, title: r.s.title, options: counts.get(r.s.id) ?? 0, neededBy: ms(r.s.neededBy), sharedAt: ms(r.s.sharedAt),
      status: r.s.status === 'chosen' ? 'chosen' : r.s.status === 'declined' ? 'declined' : 'shared', chosenAt: ms(r.s.chosenAt),
    }))
  }
}

export type PortalChoiceOption = { id: string; name: string; description: string | null; src: string | null; hex: string | null; priceMinor: number | null }
export type PortalChoice = {
  id: string; homeId: string; title: string; room: string | null; note: string | null; milestone: string | null
  neededBy: number | null; sharedAt: number | null; status: 'shared' | 'chosen' | 'declined'
  /** (gaps build D, item 2 — M-07) the client's no: their answer, reason, when — `mine` / `person` as a pick's */
  answer?: { kind: ChoiceAnswer; note: string | null; at: number; person: string | null; mine: boolean } | null
  /** (gaps build D, item 7) the selection receipt's portal address, once chosen */
  receiptHref?: string | null
  options: PortalChoiceOption[]
  /** `by` 'studio' = made with the client off the portal ("Chosen with Germaine on 3 Oct"); the studio's own note is never shown. */
  /** `person` · `mine` (fix-F, F-03): who picked it on the portal — the reader ("You chose…") or someone else from the household, by name. */
  chosen: { optionId: string; by: 'client' | 'studio'; member: string | null; at: number; note: string | null; person?: string | null; mine?: boolean } | null
  /** (REG-1068) The GST a pick adds on the contract (0 = none) — the options say what the contract moves by. */
  gstPct?: number
}
export type PortalChoicesHome = { homeId: string; leadId: string; projectId: string; choices: PortalChoice[] }

/** The portal's Choices: every choice shared with this visitor, on each of their homes that is a project — pictures through the portal's own
    file route (`/my/<address>/file/<id>`, session-checked), never the studio's address. */
export async function fetchPortalChoices(links: VisitorLink[], slug: string, readerId: string | null = null): Promise<PortalChoicesHome[]> {
  const leadIds = links.map((l) => l.leadId)
  if (!leadIds.length) return []
  const ps = await db.select({ id: projects.id, leadId: projects.leadId }).from(projects).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt)))
  if (!ps.length) return []
  const [sels, studio, gst] = await Promise.all([
    db.select().from(projectSelections).where(and(inArray(projectSelections.projectId, ps.map((p) => p.id)), isNull(projectSelections.deletedAt), inArray(projectSelections.status, ['shared', 'chosen', 'declined'])))
      .orderBy(asc(projectSelections.neededBy), desc(projectSelections.sharedAt)),
    db.select({ id: members.id, name: members.name }).from(members),
    pickGstPct(ps.map((p) => p.id)),   // (REG-1068)
  ])
  const people = await portalPeopleOf(leadIds)   // (fix-F, F-03) who picked it on the portal — "You", or the household person by name
  const names = new Map(studio.map((m) => [m.id, m.name]))
  const msRows = sels.some((s) => s.milestoneId) ? await db.select({ id: projectMilestones.id, title: projectMilestones.title }).from(projectMilestones).where(inArray(projectMilestones.id, sels.map((s) => s.milestoneId).filter((x): x is string => !!x))) : []
  const opts = sels.length ? await db.select().from(projectSelectionOptions).where(and(inArray(projectSelectionOptions.selectionId, sels.map((s) => s.id)), isNull(projectSelectionOptions.deletedAt))).orderBy(asc(projectSelectionOptions.position), asc(projectSelectionOptions.createdAt)) : []
  const liveFiles = new Set((opts.some((o) => o.fileId) ? await db.select({ id: leadFiles.id }).from(leadFiles).where(and(inArray(leadFiles.id, opts.map((o) => o.fileId).filter((x): x is string => !!x)), isNull(leadFiles.deletedAt))) : []).map((f) => f.id))
  const optionOf = (o: ProjectSelectionOption): PortalChoiceOption => ({ id: o.id, name: o.name, description: o.description, src: o.fileId && liveFiles.has(o.fileId) ? portalPath(slug, `file/${o.fileId}`) : null, hex: o.hex, priceMinor: normPrice(o.priceMinor) })
  return links.flatMap((l) => {
    const p = ps.find((x) => x.leadId === l.leadId)
    if (!p) return []
    const choices = sels.filter((s) => s.projectId === p.id).map((s): PortalChoice => {
      const first = (n: string | null) => (n ? n.split(/\s+/)[0] ?? n : null)
      const who = s.chosenBy === 'studio' ? { mine: false, name: null } : portalWho(people.get(l.leadId), s.chosenHomeownerId, readerId)
      const pick = s.status === 'chosen' && s.chosenOptionId && s.chosenAt ? { optionId: s.chosenOptionId, by: s.chosenBy === 'studio' ? 'studio' as const : 'client' as const, member: first(s.chosenMemberId ? names.get(s.chosenMemberId) ?? null : null), at: s.chosenAt.getTime(), note: s.chosenBy === 'studio' ? null : s.chosenNote, person: who.name, mine: who.mine } : null
      const no = s.status === 'declined' && isChoiceAnswer(s.clientAnswer) && s.clientAnswerAt ? (() => { const w = portalWho(people.get(l.leadId), s.clientAnswerBy, readerId); return { kind: s.clientAnswer as ChoiceAnswer, note: s.clientAnswerNote, at: s.clientAnswerAt!.getTime(), person: w.name, mine: w.mine } })() : null
      return {
        id: s.id, homeId: l.linkId, title: s.title, room: s.room, note: s.note, milestone: s.milestoneId ? msRows.find((m) => m.id === s.milestoneId)?.title ?? null : null,
        neededBy: ms(s.neededBy), sharedAt: ms(s.sharedAt), status: s.status === 'chosen' ? 'chosen' : s.status === 'declined' ? 'declined' : 'shared', options: opts.filter((o) => o.selectionId === s.id).map(optionOf), chosen: pick, gstPct: gst.get(p.id) ?? 0,
        answer: no, receiptHref: (s.status === 'chosen' || s.status === 'declined') && s.receiptHash ? portalPath(slug, `choices/receipt/${encodeURIComponent(s.id)}`) : null,   /* (parity map, TD-044) */   // (gaps build D, items 2 · 7)
      }
    })
    return [{ homeId: l.linkId, leadId: l.leadId, projectId: p.id, choices }]
  })
}

/* ── (fix-C, C-04) a pick ends the milestone's wait for it ───────────────────────────────────────────────────────────────────── */

/**
 * The schedule's wait and the choice are one subject: a milestone that waits on the client "for paint colours" stops waiting once the client
 * (or the studio with them) picks the paint colours. When a pick lands on a choice whose milestone waits on the client for it — the wait's note
 * names the choice (`waitNamesChoice`) — and no other choice on that milestone still waits on them, the wait ends in the same write. Answers
 * what an Undo needs (the studio's pick), or null when no wait ended.
 */
export async function endWaitForPick(s: { id: string; projectId: string; milestoneId: string | null; title: string }): Promise<(NonNullable<PickUndo['wait']> & { title: string }) | null> {
  if (!s.milestoneId) return null
  const [m] = await db.select().from(projectMilestones).where(and(eq(projectMilestones.id, s.milestoneId), eq(projectMilestones.projectId, s.projectId), isNull(projectMilestones.deletedAt))).limit(1)
  if (!m || m.waitingOn !== 'client' || m.status === 'done' || !waitNamesChoice(m.waitingNote, s.title)) return null
  const [other] = await db.select({ id: projectSelections.id }).from(projectSelections)
    .where(and(eq(projectSelections.milestoneId, m.id), eq(projectSelections.status, 'shared'), isNull(projectSelections.deletedAt), ne(projectSelections.id, s.id))).limit(1)
  if (other) return null
  await db.update(projectMilestones).set({ waitingOn: null, waitingMemberId: null, waitingName: null, waitingNote: null, waitingSince: null, waitingUntil: null, updatedAt: new Date() }).where(eq(projectMilestones.id, m.id))
  return { milestoneId: m.id, title: m.title, note: m.waitingNote, since: m.waitingSince?.getTime() ?? null, until: m.waitingUntil?.getTime() ?? null }
}
/** The studio's pick undone: the milestone waits on the client again, as it did (only while nobody set another wait meanwhile). */
export async function restoreWaitForPick(w: NonNullable<PickUndo['wait']>, projectId: string): Promise<void> {
  const [m] = await db.select().from(projectMilestones).where(and(eq(projectMilestones.id, w.milestoneId), eq(projectMilestones.projectId, projectId), isNull(projectMilestones.deletedAt))).limit(1)
  if (!m || m.waitingOn) return
  const at = (n: number | null) => (typeof n === 'number' && Number.isFinite(n) ? new Date(n) : null)
  await db.update(projectMilestones).set({ waitingOn: 'client', waitingNote: typeof w.note === 'string' ? w.note.slice(0, 80) : null, waitingSince: at(w.since) ?? new Date(), waitingUntil: at(w.until), updatedAt: new Date() }).where(eq(projectMilestones.id, m.id))
}

/* ── (simplify S-21, his "build everything" 2026-10-09) a share starts the milestone's wait — the pick (above) ends it ─────────────── */

/**
 * Sharing a choice that names a milestone starts that milestone's *Waiting on {client} for {choice}* — the same wait the client's pick ends
 * (`endWaitForPick`), so the Overview, the listing and the Schedule tell one story from the share on. Only a milestone that waits on nobody and
 * is not done: a wait the studio set by hand (on the client or anyone else) is left as it is. The wait starts with the share (`at`, its
 * moment — how `waitSetByShare` knows it later) and runs to the choice's needed-by day, when it has one. Answers the milestone, or null.
 */
export async function startWaitForShare(s: { projectId: string; milestoneId: string | null; title: string; neededBy: Date | null }, at: Date, o: { carryFrom?: Date | null } = {}): Promise<{ milestoneId: string; title: string; carried: boolean } | null> {
  if (!s.milestoneId) return null
  const [m] = await db.select().from(projectMilestones).where(and(eq(projectMilestones.id, s.milestoneId), eq(projectMilestones.projectId, s.projectId), isNull(projectMilestones.deletedAt))).limit(1)
  if (!m || m.status === 'done') return null
  if (m.waitingOn) {
    /* shared again after the client's no: the wait the first share started (kept through the no) runs on from this share */
    if (!o.carryFrom || !waitSetByShare({ waitingOn: m.waitingOn, waitingNote: m.waitingNote, waitingSince: m.waitingSince?.getTime() ?? null }, { title: s.title, sharedAt: o.carryFrom.getTime() })) return null
    await db.update(projectMilestones).set({ waitingSince: at, updatedAt: new Date() }).where(eq(projectMilestones.id, m.id))
    return { milestoneId: m.id, title: m.title, carried: true }
  }
  const r = await db.update(projectMilestones).set({ waitingOn: 'client', waitingMemberId: null, waitingName: null, waitingNote: s.title.slice(0, SHARE_WAIT_NOTE_MAX), waitingSince: at, waitingUntil: s.neededBy, updatedAt: new Date() })
    .where(and(eq(projectMilestones.id, m.id), isNull(projectMilestones.waitingOn)))
  return r.rowsAffected ? { milestoneId: m.id, title: m.title, carried: false } : null
}

/** A re-share's Undo for a wait it carried on (`carried`): the wait runs from the first share again, as it did through the client's no. */
export async function putBackShareWait(s: { projectId: string; milestoneId: string | null; title: string }, from: Date, back: Date): Promise<void> {
  if (!s.milestoneId) return
  const [m] = await db.select().from(projectMilestones).where(and(eq(projectMilestones.id, s.milestoneId), eq(projectMilestones.projectId, s.projectId), isNull(projectMilestones.deletedAt))).limit(1)
  if (!m || !waitSetByShare({ waitingOn: m.waitingOn, waitingNote: m.waitingNote, waitingSince: m.waitingSince?.getTime() ?? null }, { title: s.title, sharedAt: from.getTime() })) return
  await db.update(projectMilestones).set({ waitingSince: back, updatedAt: new Date() }).where(eq(projectMilestones.id, m.id))
}

/**
 * The wait a share started, ended again — the share's Undo, Take back, or a re-share's Undo: only while it is still that share's wait
 * (`waitSetByShare`) and no other shared choice on the milestone waits on the client. A wait the studio set by hand stays. Answers the
 * milestone's title, or null.
 */
export async function endWaitSetByShare(s: { id: string; projectId: string; milestoneId: string | null; title: string; sharedAt: Date | null }): Promise<string | null> {
  if (!s.milestoneId || !s.sharedAt) return null
  const [m] = await db.select().from(projectMilestones).where(and(eq(projectMilestones.id, s.milestoneId), eq(projectMilestones.projectId, s.projectId), isNull(projectMilestones.deletedAt))).limit(1)
  if (!m || !waitSetByShare({ waitingOn: m.waitingOn, waitingNote: m.waitingNote, waitingSince: m.waitingSince?.getTime() ?? null }, { title: s.title, sharedAt: s.sharedAt.getTime() })) return null
  const [other] = await db.select({ id: projectSelections.id }).from(projectSelections)
    .where(and(eq(projectSelections.milestoneId, m.id), eq(projectSelections.status, 'shared'), isNull(projectSelections.deletedAt), ne(projectSelections.id, s.id))).limit(1)
  if (other) return null
  await db.update(projectMilestones).set({ waitingOn: null, waitingMemberId: null, waitingName: null, waitingNote: null, waitingSince: null, waitingUntil: null, updatedAt: new Date() }).where(eq(projectMilestones.id, m.id))
  return m.title
}

/**
 * The milestones of a project whose wait a share started, by milestone id — the choice's name, for the milestone panel's "Set by sharing
 * Paint colours" (`shareWaitLine`). Read beside the schedule; a wait set by hand is not here.
 */
export async function shareWaitsOf(projectId: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  const ms = await db.select({ id: projectMilestones.id, waitingOn: projectMilestones.waitingOn, waitingNote: projectMilestones.waitingNote, waitingSince: projectMilestones.waitingSince })
    .from(projectMilestones).where(and(eq(projectMilestones.projectId, projectId), isNull(projectMilestones.deletedAt), eq(projectMilestones.waitingOn, 'client')))
  if (!ms.length) return out
  const sels = await db.select({ title: projectSelections.title, milestoneId: projectSelections.milestoneId, sharedAt: projectSelections.sharedAt }).from(projectSelections)
    .where(and(eq(projectSelections.projectId, projectId), eq(projectSelections.status, 'shared'), isNull(projectSelections.deletedAt), isNotNull(projectSelections.milestoneId)))
  for (const m of ms) {
    const c = sels.find((x) => x.milestoneId === m.id && waitSetByShare({ waitingOn: m.waitingOn, waitingNote: m.waitingNote, waitingSince: m.waitingSince?.getTime() ?? null }, { title: x.title, sharedAt: x.sharedAt?.getTime() ?? null }))
    if (c) out[m.id] = c.title
  }
  return out
}
