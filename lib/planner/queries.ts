import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, leadAssignees, leads, members, projectFloorPlans, projects, spaceLayoutShares, spaceLayoutVersions, spaceLayouts, studioMaterials, type SpaceLayout, type SpaceLayoutShare } from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { fetchBrand } from '@/lib/templates/queries'
import { fetchPortalSections } from '@/lib/portal/sections-queries'
import type { LibraryMaterial } from '@/lib/visualizer/materials'
import { isPieceKey } from './catalogue'
import { allPieces, allRooms, forClient, levelsOf, parsePlan, totalArea, versionSummary, type PlanDoc } from './model'
import { layoutChangeBlock } from './policy'

/*
 * (gaps build J) The 3D Space Planner's reads. Who sees a project's layout is its lead's rule (`visibleLeadIds`, Settings › Who sees
 * leads); a personal layout is every member's. A deleted project's layouts leave the lists with it. The client's two doors — the no-login
 * link and the portal — read the share's SNAPSHOT, never the live plan, and never the studio's underlay.
 */

export const readPlan = (json: string | null | undefined): PlanDoc => parsePlan(json, isPieceKey)

/** The studio's materials a plan names (`lib:<id>` on a floor, a wall or a piece) — what the client's viewer needs to colour them, no more. */
export async function libraryFor(plans: PlanDoc[]): Promise<LibraryMaterial[]> {
  /* (parity map, TD-075) every level's finishes */
  const ids = [...new Set(plans.flatMap((p) => [...allRooms(p).flatMap((r) => [r.floor, r.wall]), ...allPieces(p).map((q) => q.finish)]).filter((x): x is string => !!x && x.startsWith('lib:')).map((x) => x.slice(4)))]
  if (!ids.length) return []
  const rows = await db.select().from(studioMaterials).where(and(inArray(studioMaterials.id, ids), isNull(studioMaterials.deletedAt)))
  return rows.map((m) => ({ id: m.id, name: m.name, category: m.category, hex: m.hex, finish: m.finish, imageUrl: m.imageUrl }))
}

type ProjectFacts = { id: string; name: string; number: string; stage: string; leadId: string; leadName: string; teamIds: string[]; deleted: boolean }
async function projectFacts(ids: string[]): Promise<Map<string, ProjectFacts>> {
  if (!ids.length) return new Map()
  const rows = await db.select({ id: projects.id, name: projects.name, number: projects.number, stage: projects.stage, leadId: projects.leadId, deletedAt: projects.deletedAt, leadName: leads.name, leadDeleted: leads.deletedAt })
    .from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(inArray(projects.id, ids))
  const team = rows.length ? await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, rows.map((r) => r.leadId))) : []
  return new Map(rows.map((r) => [r.id, { id: r.id, name: r.name, number: r.number, stage: r.stage, leadId: r.leadId, leadName: r.leadName, teamIds: team.filter((t) => t.leadId === r.leadId).map((t) => t.memberId), deleted: !!r.deletedAt || !!r.leadDeleted }]))
}
/* (pending modules S07 — "a 3D layout started on a lead before Won is carried to its project", one-home N-10) A lead's layout: `lead_id` set and no
   project yet. Who sees it is its lead's rule; its maker, the lead's members, their Managers, Owners and Admins change it; when the lead is won,
   the project takes it (lib/projects/create.ts `writeProjectRow`) — one record, two chapters. */
type LeadFacts = { id: string; name: string; phone: string | null; teamIds: string[]; deleted: boolean; projectId: string | null }
async function leadFacts(ids: string[]): Promise<Map<string, LeadFacts>> {
  if (!ids.length) return new Map()
  const [rows, team, live] = await Promise.all([
    db.select({ id: leads.id, name: leads.name, phone: leads.phone, deletedAt: leads.deletedAt }).from(leads).where(inArray(leads.id, ids)),
    db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, ids)),
    db.select({ id: projects.id, leadId: projects.leadId }).from(projects).where(and(inArray(projects.leadId, ids), isNull(projects.deletedAt))),
  ])
  return new Map(rows.map((r) => [r.id, { id: r.id, name: r.name, phone: r.phone, teamIds: team.filter((t) => t.leadId === r.id).map((t) => t.memberId), deleted: !!r.deletedAt, projectId: live.find((x) => x.leadId === r.id)?.id ?? null }]))
}
/** A lead's layout — on a lead, with no project yet (never a template). */
export const isLeadLayout = (l: Pick<SpaceLayout, 'projectId' | 'leadId' | 'isTemplate'>) => !l.projectId && !!l.leadId && !l.isTemplate
const may = (viewer: Viewer, l: Pick<SpaceLayout, 'createdBy'>, maker: string | null, p: ProjectFacts | null, lead?: LeadFacts | null) =>
  layoutChangeBlock(viewer, { createdBy: l.createdBy, makerName: maker }, p ? { teamIds: p.teamIds, stage: p.stage } : lead ? { teamIds: lead.teamIds, stage: 'lead', lead: true } : null)

/* ── Tools › 3D Space Planner ─────────────────────────────────────────────────────────────────────────────────────────────────── */
export type LayoutCard = {
  id: string; name: string
  /** (parity map, TD-076) a template is the studio's own starting point — never a project's; (pending modules S07) a lead's, until it is won */ kind: 'project' | 'lead' | 'personal' | 'template'
  projectId: string | null; projectName: string | null; projectNumber: string | null; leadName: string | null
  /** (pending modules S07) a lead's layout: its lead */ leadId: string | null
  /** every level counted (parity map, TD-075) */ rooms: number; pieces: number; area: number; levels: number
  /** what the cover draws — level 1's rooms and pieces, no underlay */ cover: Pick<PlanDoc, 'rooms' | 'pieces'>
  shared: boolean
  createdAt: Date; updatedAt: Date; deletedAt: Date | null; createdBy: string | null
  author: string | null; authorColor: string | null; maker: string | null; makerColor: string | null
  /** why this viewer may not change it, or null */ mayChange: string | null
}
export type PlannerProject = { id: string; name: string; number: string; stage: string; leadName: string; layouts: number
  /** (J-Q18) its floor plans a layout can trace — scaled or not */ plans: { id: string; name: string; scaled: boolean; main: boolean }[] }
/** (parity map, TD-076) A template as the New layout dialog offers it — My templates, above the six flats. */
export type TemplatePick = { id: string; name: string; rooms: number; area: number; levels: number; cover: Pick<PlanDoc, 'rooms' | 'pieces'>; maker: string | null }
export type PlannerHome = { layouts: LayoutCard[]; deleted: LayoutCard[]; projects: PlannerProject[]; templates: TemplatePick[]; now: number }
export const templatePickOf = (l: Pick<SpaceLayout, 'id' | 'name' | 'plan'>, maker: string | null): TemplatePick => {
  const plan = readPlan(l.plan)
  return { id: l.id, name: l.name, rooms: allRooms(plan).length, area: totalArea(plan), levels: levelsOf(plan).length, cover: { rooms: plan.rooms, pieces: plan.pieces }, maker }
}
/** (TD-076) The studio's live templates, newest first — every member starts from them. */
export async function fetchLayoutTemplates(): Promise<TemplatePick[]> {
  const [rows, team] = await Promise.all([
    db.select({ id: spaceLayouts.id, name: spaceLayouts.name, plan: spaceLayouts.plan, createdBy: spaceLayouts.createdBy }).from(spaceLayouts).where(and(eq(spaceLayouts.isTemplate, true), isNull(spaceLayouts.deletedAt))).orderBy(desc(spaceLayouts.updatedAt)),
    db.select({ id: members.id, name: members.name }).from(members),
  ])
  return rows.map((l) => templatePickOf(l, team.find((m) => m.id === l.createdBy)?.name ?? null))
}

export async function fetchPlannerHome(): Promise<PlannerHome> {
  const viewer = await fetchViewer()
  const visible = await visibleLeadIds(viewer)
  const [rows, team, shares, projectRows] = await Promise.all([
    db.select().from(spaceLayouts).orderBy(desc(spaceLayouts.updatedAt)),
    db.select({ id: members.id, name: members.name, color: members.color }).from(members),
    db.select({ layoutId: spaceLayoutShares.layoutId }).from(spaceLayoutShares).where(isNull(spaceLayoutShares.revokedAt)),
    db.select({ id: projects.id }).from(projects).where(isNull(projects.deletedAt)),
  ])
  const facts = await projectFacts([...new Set([...rows.map((r) => r.projectId).filter((x): x is string => !!x), ...projectRows.map((p) => p.id)])])
  const onLeads = await leadFacts([...new Set(rows.filter(isLeadLayout).map((r) => r.leadId!))])   // (pending modules S07)
  const byMember = new Map(team.map((m) => [m.id, m]))
  const sharedIds = new Set(shares.map((s) => s.layoutId))
  const sees = (p: ProjectFacts | null) => !p || (!p.deleted && (!visible || visible.has(p.leadId)))
  const card = (l: SpaceLayout): LayoutCard => {
    const plan = readPlan(l.plan)
    const p = l.projectId ? facts.get(l.projectId) ?? null : null
    const lead = isLeadLayout(l) ? onLeads.get(l.leadId!) ?? null : null
    const author = byMember.get(l.updatedBy ?? l.createdBy ?? ''), maker = byMember.get(l.createdBy ?? '')
    return { id: l.id, name: l.name, kind: l.projectId ? 'project' : lead ? 'lead' : l.isTemplate ? 'template' : 'personal', projectId: l.projectId, projectName: p?.name ?? null, projectNumber: p?.number ?? null, leadName: p?.leadName ?? lead?.name ?? null, leadId: lead?.id ?? null,
      rooms: allRooms(plan).length, pieces: allPieces(plan).length, area: totalArea(plan), levels: levelsOf(plan).length, cover: { rooms: plan.rooms, pieces: plan.pieces }, shared: sharedIds.has(l.id),
      createdAt: l.createdAt, updatedAt: l.updatedAt, deletedAt: l.deletedAt, createdBy: l.createdBy, author: author?.name ?? null, authorColor: author?.color ?? null,
      maker: maker?.name ?? null, makerColor: maker?.color ?? null, mayChange: may(viewer, l, maker?.name ?? null, p, lead) }
  }
  /* (pending modules S07) a lead's layout follows its lead's rule, and leaves with a deleted lead */
  const seesLead = (id: string) => { const f = onLeads.get(id); return !!f && !f.deleted && (!visible || visible.has(id)) }
  const mine = rows.filter((l) => (l.projectId ? facts.has(l.projectId) && sees(facts.get(l.projectId)!) : isLeadLayout(l) ? seesLead(l.leadId!) : true))
  const plans = await db.select({ id: projectFloorPlans.id, projectId: projectFloorPlans.projectId, name: projectFloorPlans.name, scale: projectFloorPlans.scaleMmPerPx, main: projectFloorPlans.isMain })
    .from(projectFloorPlans).where(isNull(projectFloorPlans.putAwayAt))
  const live = mine.filter((l) => !l.deletedAt)
  const pickable = [...facts.values()].filter((p) => !p.deleted && (!visible || visible.has(p.leadId)) && p.stage !== 'completed').sort((a, b) => a.name.localeCompare(b.name))
  return {
    layouts: live.map(card), deleted: mine.filter((l) => !!l.deletedAt).map(card),
    templates: live.filter((l) => l.isTemplate).map((l) => templatePickOf(l, byMember.get(l.createdBy ?? '')?.name ?? null)),
    projects: pickable.map((p) => ({ id: p.id, name: p.name, number: p.number, stage: p.stage, leadName: p.leadName, layouts: live.filter((l) => l.projectId === p.id).length,
      plans: plans.filter((f) => f.projectId === p.id).map((f) => ({ id: f.id, name: f.name, scaled: !!f.scale && f.scale > 0, main: f.main })).sort((a, b) => Number(b.main) - Number(a.main)) })),
    now: Date.now(),
  }
}

/* ── one layout, for its editor ────────────────────────────────────────────────────────────────────────────────────────────────── */
export type LayoutShareFacts = { id: string; token: string; sharedAt: number; updatedAt: number; sharedRev: number; sharedBy: string | null; message: string | null; firstViewedAt: number | null; viewCount: number }
export type PlannerEditorData = {
  layout: { id: string; name: string; rev: number; templateKey: string | null; createdBy: string | null; maker: string | null; updatedAt: number; projectId: string | null
    /** (parity map, TD-076) the studio's own starting point */ isTemplate: boolean
    /** (TD-087) how many versions it keeps */ versions: number }
  plan: PlanDoc
  project: { id: string; name: string; number: string; stage: string; leadId: string; leadName: string; clientPhone: string | null; portal: boolean; designsOn: boolean } | null
  /** (pending modules S07) a lead's layout, before it is won: its lead — the client it can be shared with, the lead page it returns to */
  lead: { id: string; name: string; clientPhone: string | null; portal: boolean; designsOn: boolean } | null
  /** the project's floor plans a layout can trace (J-Q18) */ plans: { id: string; name: string; width: number; height: number; scale: number | null; main: boolean }[]
  share: LayoutShareFacts | null
  library: LibraryMaterial[]
  mayChange: string | null
  me: { id: string; name: string | null }
  studio: string
  now: number
}

/** Whether this viewer may see the layout at all — a project's follows its lead; a deleted project's is gone; (pending modules S07) a lead's
    follows its lead and leaves with it. */
export async function layoutVisible(viewer: Viewer, l: Pick<SpaceLayout, 'projectId' | 'leadId' | 'isTemplate'>): Promise<boolean> {
  if (!l.projectId && isLeadLayout(l)) {
    const f = (await leadFacts([l.leadId!])).get(l.leadId!)
    if (!f || f.deleted) return false
    const visible = await visibleLeadIds(viewer)
    return !visible || visible.has(f.id)
  }
  if (!l.projectId) return true
  const p = (await projectFacts([l.projectId])).get(l.projectId)
  if (!p || p.deleted) return false
  const visible = await visibleLeadIds(viewer)
  return !visible || visible.has(p.leadId)
}

export async function fetchPlannerEditor(id: string): Promise<PlannerEditorData | null> {
  const viewer = await fetchViewer()
  const [l] = await db.select().from(spaceLayouts).where(and(eq(spaceLayouts.id, id), isNull(spaceLayouts.deletedAt)))
  if (!l || !(await layoutVisible(viewer, l))) return null
  const p = l.projectId ? (await projectFacts([l.projectId])).get(l.projectId) ?? null : null
  const onLead = isLeadLayout(l) ? (await leadFacts([l.leadId!])).get(l.leadId!) ?? null : null   // (pending modules S07)
  const clientLead = p?.leadId ?? onLead?.id ?? null
  const [team, mats, share, plans, lead, links, sections, brand, versions] = await Promise.all([
    db.select({ id: members.id, name: members.name }).from(members),
    db.select().from(studioMaterials).where(and(isNull(studioMaterials.deletedAt), eq(studioMaterials.isActive, true))),
    db.select().from(spaceLayoutShares).where(and(eq(spaceLayoutShares.layoutId, l.id), isNull(spaceLayoutShares.revokedAt))).orderBy(desc(spaceLayoutShares.sharedAt)).then((r) => r[0] ?? null),
    p ? db.select().from(projectFloorPlans).where(and(eq(projectFloorPlans.projectId, p.id), isNull(projectFloorPlans.putAwayAt))) : Promise.resolve([]),
    p ? db.select({ phone: leads.phone }).from(leads).where(eq(leads.id, p.leadId)).then((r) => r[0] ?? null) : Promise.resolve(null),
    clientLead ? db.select({ id: homeownerLeadLinks.id, withdrawnAt: homeownerLeadLinks.withdrawnAt }).from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, clientLead)) : Promise.resolve([]),
    fetchPortalSections(),
    fetchBrand(),
    db.select({ id: spaceLayoutVersions.id }).from(spaceLayoutVersions).where(eq(spaceLayoutVersions.layoutId, l.id)),
  ])
  const maker = team.find((m) => m.id === l.createdBy)?.name ?? null
  const me = team.find((m) => m.id === viewer.id)
  return {
    layout: { id: l.id, name: l.name, rev: l.rev, templateKey: l.templateKey, createdBy: l.createdBy, maker, updatedAt: l.updatedAt.getTime(), projectId: l.projectId, isTemplate: l.isTemplate, versions: versions.length },
    plan: readPlan(l.plan),
    project: p ? { id: p.id, name: p.name, number: p.number, stage: p.stage, leadId: p.leadId, leadName: p.leadName, clientPhone: lead?.phone ?? null, portal: links.some((k) => !k.withdrawnAt), designsOn: sections.designs !== false } : null,
    lead: onLead ? { id: onLead.id, name: onLead.name, clientPhone: onLead.phone, portal: links.some((k) => !k.withdrawnAt), designsOn: sections.designs !== false } : null,
    plans: plans.map((f) => ({ id: f.id, name: f.name, width: f.width, height: f.height, scale: f.scaleMmPerPx, main: f.isMain })).sort((a, b) => Number(b.main) - Number(a.main)),
    share: share ? shareFacts(share) : null,
    library: mats.map((m) => ({ id: m.id, name: m.name, category: m.category, hex: m.hex, finish: m.finish, imageUrl: m.imageUrl })),
    mayChange: may(viewer, l, maker, p, onLead),
    me: { id: viewer.id, name: me?.name ?? null },
    studio: brand.details.name,
    now: Date.now(),
  }
}
const shareFacts = (s: SpaceLayoutShare): LayoutShareFacts => ({ id: s.id, token: s.token, sharedAt: s.sharedAt.getTime(), updatedAt: s.updatedAt.getTime(), sharedRev: s.sharedRev, sharedBy: s.sharedBy, message: s.message, firstViewedAt: s.firstViewedAt?.getTime() ?? null, viewCount: s.viewCount })

/** (J-Q3) A project's layouts, newest first — the project's *Plan the space in 3D* dialog. */
export type ProjectLayoutRow = { id: string; name: string; updatedAt: number; author: string | null; shared: boolean; rooms: number }
export async function fetchProjectLayouts(projectId: string): Promise<{ layouts: ProjectLayoutRow[]; plans: PlannerProject['plans']; templates: TemplatePick[] } | null> {
  const viewer = await fetchViewer()
  const p = (await projectFacts([projectId])).get(projectId)
  if (!p || p.deleted) return null
  const visible = await visibleLeadIds(viewer)
  if (visible && !visible.has(p.leadId)) return null
  const [rows, team, shares, plans, templates] = await Promise.all([
    db.select().from(spaceLayouts).where(and(eq(spaceLayouts.projectId, projectId), isNull(spaceLayouts.deletedAt))).orderBy(desc(spaceLayouts.updatedAt)),
    db.select({ id: members.id, name: members.name }).from(members),
    db.select({ layoutId: spaceLayoutShares.layoutId }).from(spaceLayoutShares).where(isNull(spaceLayoutShares.revokedAt)),
    db.select().from(projectFloorPlans).where(and(eq(projectFloorPlans.projectId, projectId), isNull(projectFloorPlans.putAwayAt))),
    fetchLayoutTemplates(),
  ])
  return {
    layouts: rows.map((l) => ({ id: l.id, name: l.name, updatedAt: l.updatedAt.getTime(), author: team.find((m) => m.id === (l.updatedBy ?? l.createdBy))?.name ?? null, shared: shares.some((s) => s.layoutId === l.id), rooms: allRooms(readPlan(l.plan)).length })),
    plans: plans.map((f) => ({ id: f.id, name: f.name, scaled: !!f.scaleMmPerPx && f.scaleMmPerPx > 0, main: f.isMain })).sort((a, b) => Number(b.main) - Number(a.main)),
    /* (parity map, TD-076) the studio's templates start a project's layout too */
    templates,
  }
}

/** (pending modules S07) A lead's layouts, newest first — the lead's *Plan the space in 3D* dialog before it is won (a won lead's are its project's). */
export async function fetchLeadLayouts(leadId: string): Promise<{ layouts: ProjectLayoutRow[]; templates: TemplatePick[]; projectId: string | null } | null> {
  const viewer = await fetchViewer()
  const f = (await leadFacts([leadId])).get(leadId)
  if (!f || f.deleted) return null
  const visible = await visibleLeadIds(viewer)
  if (visible && !visible.has(leadId)) return null
  const [rows, team, shares, templates] = await Promise.all([
    db.select().from(spaceLayouts).where(and(eq(spaceLayouts.leadId, leadId), isNull(spaceLayouts.projectId), eq(spaceLayouts.isTemplate, false), isNull(spaceLayouts.deletedAt))).orderBy(desc(spaceLayouts.updatedAt)),
    db.select({ id: members.id, name: members.name }).from(members),
    db.select({ layoutId: spaceLayoutShares.layoutId }).from(spaceLayoutShares).where(isNull(spaceLayoutShares.revokedAt)),
    fetchLayoutTemplates(),
  ])
  return {
    layouts: rows.map((l) => ({ id: l.id, name: l.name, updatedAt: l.updatedAt.getTime(), author: team.find((m) => m.id === (l.updatedBy ?? l.createdBy))?.name ?? null, shared: shares.some((s) => s.layoutId === l.id), rooms: allRooms(readPlan(l.plan)).length })),
    templates, projectId: f.projectId,
  }
}

/* ── the client's link (no sign-in) ────────────────────────────────────────────────────────────────────────────────────────────── */
export type PublicLayout = { state: 'open' | 'stopped'; token: string; name: string; message: string | null; sharedAt: number; sender: string | null
  plan: PlanDoc; library: LibraryMaterial[]; studio: { name: string; logo: string | null; accent: string; phone: string; email: string } }
/** The share a token names: open while it is not stopped and its layout (and its project) still exist; the snapshot, never the live plan. */
export async function readLayoutShare(token: string): Promise<{ s: SpaceLayoutShare; open: boolean } | null> {
  if (!/^[\w-]{8,80}$/.test(token)) return null
  const [s] = await db.select().from(spaceLayoutShares).where(eq(spaceLayoutShares.token, token))
  if (!s) return null
  const [l] = await db.select({ deletedAt: spaceLayouts.deletedAt, projectId: spaceLayouts.projectId, leadId: spaceLayouts.leadId, isTemplate: spaceLayouts.isTemplate }).from(spaceLayouts).where(eq(spaceLayouts.id, s.layoutId))
  const p = l?.projectId ? (await projectFacts([l.projectId])).get(l.projectId) ?? null : null
  const lead = l && isLeadLayout(l) ? (await leadFacts([l.leadId!])).get(l.leadId!) ?? null : null   // (pending modules S07) a lead's layout ends with its lead
  return { s, open: !s.revokedAt && !!l && !l.deletedAt && !(p?.deleted ?? false) && !(lead?.deleted ?? false) }
}
export async function fetchPublicLayout(token: string): Promise<PublicLayout | null> {
  const got = await readLayoutShare(token)
  if (!got) return null
  const { s, open } = got
  const [brand, sender] = await Promise.all([fetchBrand(), s.sharedBy ? db.select({ name: members.name }).from(members).where(eq(members.id, s.sharedBy)).then((r) => r[0]?.name ?? null) : Promise.resolve(null)])
  const plan: PlanDoc = open ? forClient(readPlan(s.snapshot)) : { v: 1, rooms: [], pieces: [], underlay: null, camera: null, wallsLow: false }
  return { state: open ? 'open' : 'stopped', token: s.token, name: s.name, message: s.message, sharedAt: s.sharedAt.getTime(), sender: sender ? sender.split(/\s+/)[0]! : null,
    plan, library: await libraryFor([plan]),
    studio: { name: brand.details.name, logo: brand.kit.logo, accent: brand.kit.colors.accent, phone: brand.details.phone, email: brand.details.email } }
}

/* ── the portal's Designs › 3D layouts (J-Q16) ─────────────────────────────────────────────────────────────────────────────────── */
export type PortalLayout = { id: string; layoutId: string; leadId: string; name: string; sharedAt: number; updatedAt: number; sender: string | null; message: string | null; plan: PlanDoc; seen: boolean; library: LibraryMaterial[] }
/** Every live share on these leads — for good while it is not stopped (M-06's rule); the snapshot, no underlay. */
export async function fetchPortalLayouts(leadIds: string[]): Promise<PortalLayout[]> {
  if (!leadIds.length) return []
  const rows = await db.select().from(spaceLayoutShares).where(and(inArray(spaceLayoutShares.leadId, leadIds), isNull(spaceLayoutShares.revokedAt))).orderBy(desc(spaceLayoutShares.updatedAt))
  const opens = await Promise.all(rows.map((s) => readLayoutShare(s.token)))
  const live = rows.filter((_, i) => opens[i]?.open)
  const by = [...new Set(live.map((s) => s.sharedBy).filter((x): x is string => !!x))]
  const names = by.length ? await db.select({ id: members.id, name: members.name }).from(members).where(inArray(members.id, by)) : []
  const plans = live.map((s) => forClient(readPlan(s.snapshot)))
  const library = await libraryFor(plans)
  return live.map((s, i) => ({ id: s.id, layoutId: s.layoutId, leadId: s.leadId ?? '', name: s.name, sharedAt: s.sharedAt.getTime(), updatedAt: s.updatedAt.getTime(), message: s.message,
    sender: names.find((m) => m.id === s.sharedBy)?.name.split(/\s+/)[0] ?? null, plan: plans[i]!, seen: !!s.firstViewedAt, library }))
}

/* ── a layout's versions (parity map, TD-087) ──────────────────────────────────────────────────────────────────────────────────── */
/** A kept version as the Versions drawer lists it: what it is (its note — a share's, a Bring back's, or the studio's own words), who kept it
    and when, what changed since the one before it (1.0's automatic summary), and its plan to draw and bring back. */
export type LayoutVersionRow = { id: string; rev: number; label: string; kind: 'hand' | 'shared' | 'changes' | 'before'; at: number; by: string | null; summary: string; plan: PlanDoc }
/** The notes the server writes itself (a hand-written note never starts with "@" — the action takes it off). */
export const VERSION_NOTES = { shared: '@shared', changes: '@changes', before: '@before:' } as const
export const VERSIONS_KEPT = 60
export async function fetchLayoutVersions(layoutId: string): Promise<LayoutVersionRow[]> {
  const [rows, team] = await Promise.all([
    db.select().from(spaceLayoutVersions).where(eq(spaceLayoutVersions.layoutId, layoutId)).orderBy(desc(spaceLayoutVersions.createdAt)).limit(VERSIONS_KEPT),
    db.select({ id: members.id, name: members.name }).from(members),
  ])
  const plans = rows.map((r) => readPlan(r.plan))
  return rows.map((r, i) => {
    const note = r.note ?? ''
    const kind: LayoutVersionRow['kind'] = note === VERSION_NOTES.shared ? 'shared' : note === VERSION_NOTES.changes ? 'changes' : note.startsWith(VERSION_NOTES.before) ? 'before' : 'hand'
    const label = kind === 'shared' ? 'Shared with the client' : kind === 'changes' ? 'Changes shared with the client' : kind === 'before' ? `Before bringing back ${note.slice(VERSION_NOTES.before.length) || 'a version'}` : note || 'Saved by hand'
    return { id: r.id, rev: r.rev, label, kind, at: r.createdAt.getTime(), by: team.find((m) => m.id === r.createdBy)?.name ?? null, summary: versionSummary(plans[i + 1] ?? null, plans[i]!), plan: plans[i]! }
  })
}
