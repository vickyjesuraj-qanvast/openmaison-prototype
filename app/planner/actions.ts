'use server'

import { randomBytes, randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, desc, eq, inArray, isNotNull, isNull, notInArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { floorPlanPhotos, leadAssignees, leadEvents, leads, members, projectFloorPlans, projects, spaceLayoutShares, spaceLayoutVersions, spaceLayouts, type SpaceLayout } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { logProjectEvent, type ProjectEventKind } from '@/lib/projects/events'
import { notify } from '@/lib/notifications/emit'
import { isPieceKey } from '@/lib/planner/catalogue'
import { allRooms, cleanPlan, forClient, nextName, withoutUnderlays, type PlanDoc, type Underlay } from '@/lib/planner/model'
import { LAYOUTS_DELETE_RULE, layoutChangeBlock } from '@/lib/planner/policy'
import { planFromTemplate, templateByKey } from '@/lib/planner/templates'
import { exampleByKey, examplePlan } from '@/lib/planner/examples'
import { VERSIONS_KEPT, VERSION_NOTES, fetchLayoutTemplates, fetchLayoutVersions, fetchLeadLayouts, fetchProjectLayouts, isLeadLayout, layoutVisible, readLayoutShare, readPlan, type LayoutVersionRow, type ProjectLayoutRow, type TemplatePick } from '@/lib/planner/queries'
import { portalActor } from '@/lib/portal/session'
import { isStudioVisit } from '@/lib/auth/studio-visit'   // (S42F — B-02's sibling)
import { workspaceRefusal, offWorkspace } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (gaps build J) The 3D Space Planner's writes. Every rule on the server: Who sees leads for a project's layout, the change rule
 * (`layoutChangeBlock` — maker, the project's team, Owners and Admins; a completed project read-only), the plan's shape (`cleanPlan` — the
 * browser is never trusted), a stale save refused by its rev. A refusal answers `{ error: <the rule> }`. A plan travels inside one object
 * argument (a long string as a bare argument trips React's action decoder — REG-685's rule).
 */

type Err = { error: string }
const NAME_MAX = 80
/** (parity map, TD-076) A template is the studio's own starting point — never a project's, never shared. */
const TEMPLATE_STAYS = 'A template stays in the studio — start a layout from it to put one on a project or share it'
const clean = (raw: unknown): PlanDoc => cleanPlan(raw, isPieceKey)
const cleanName = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) : '')
const now = () => new Date()

type Ctx = { l: SpaceLayout; viewer: Viewer; project: { id: string; leadId: string; name: string; number: string; stage: string; teamIds: string[] } | null; makerName: string | null
  /** (pending modules S07) a lead's layout, before it is won: its lead and the lead's members */ lead: LeadCtx | null }
type LeadCtx = { id: string; name: string; teamIds: string[] }
/** (pending modules S07) A lead that is still here, with its members — and its live project, when it has one (a won lead's layouts are the project's). */
async function leadOf(leadId: string | null): Promise<(LeadCtx & { projectId: string | null }) | null> {
  if (!leadId) return null
  const [l] = await db.select({ id: leads.id, name: leads.name, deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, leadId))
  if (!l || l.deletedAt) return null
  const [team, [p]] = await Promise.all([
    db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, l.id)),
    db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, l.id), isNull(projects.deletedAt))),
  ])
  return { id: l.id, name: l.name, teamIds: team.map((t) => t.id), projectId: p?.id ?? null }
}
const LEAD_ADD_RULE = 'Only the lead’s members, their Managers, Owners and Admins can add a layout to this lead'   // (invented copy)
const LEAD_STAYS = 'A lead’s layout goes to its project when the lead is won — it can’t join another project'   // (invented copy)
async function projectOf(projectId: string | null) {
  if (!projectId) return null
  const [p] = await db.select({ id: projects.id, leadId: projects.leadId, name: projects.name, number: projects.number, stage: projects.stage, deletedAt: projects.deletedAt }).from(projects).where(eq(projects.id, projectId))
  if (!p || p.deletedAt) return null
  const team = await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))
  return { id: p.id, leadId: p.leadId, name: p.name, number: p.number, stage: p.stage, teamIds: team.map((t) => t.id) }
}
/** The layout, when this viewer may see it — and, with `change`, change it (else the rule). */
async function load(id: string, change: boolean, o: { deleted?: boolean } = {}): Promise<Ctx | Err> {
  const viewer = await fetchViewer()
  const [l] = await db.select().from(spaceLayouts).where(eq(spaceLayouts.id, String(id)))
  if (!l || (!o.deleted && l.deletedAt) || !(await layoutVisible(viewer, l))) return { error: 'That layout is no longer here' }
  const project = await projectOf(l.projectId)
  if (l.projectId && !project) return { error: 'That layout’s project is no longer here' }
  const lead = isLeadLayout(l) ? await leadOf(l.leadId) : null   // (pending modules S07)
  if (isLeadLayout(l) && !lead) return { error: 'That layout’s lead is no longer here' }
  const makerName = l.createdBy ? (await db.select({ name: members.name }).from(members).where(eq(members.id, l.createdBy)))[0]?.name ?? null : null
  if (change) { const block = layoutChangeBlock(viewer, { createdBy: l.createdBy, makerName }, project ?? (lead ? { teamIds: lead.teamIds, stage: 'lead', lead: true } : null)); if (block) return { error: block } }
  return { l, viewer, project, makerName, lead }
}
const event = async (c: Pick<Ctx, 'project'> & { lead?: LeadCtx | null; l: Pick<SpaceLayout, 'id' | 'name'> }, kind: ProjectEventKind, extra: Record<string, unknown> = {}, actorId?: string | null) => {
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  if (c.project) { await logProjectEvent(db, c.project.leadId, c.project.id, kind, { name: c.project.name, number: c.project.number, id: c.l.id, title: c.l.name, ...extra }, actorId === undefined ? {} : { actorId }); return }
  /* (pending modules S07) a lead's layout writes its line on the lead (no project yet) — the project's Activity carries it on once the lead is won */
  if (c.lead) await db.insert(leadEvents).values({ id: randomUUID(), leadId: c.lead.id, projectId: null, kind, actorId: actorId === undefined ? stampBy : actorId, at: now(), detail: { id: c.l.id, title: c.l.name, ...extra } })
}
function touch(c: { l: Pick<SpaceLayout, 'id'>; project: { id: string } | null; lead?: { id: string } | null }) {
  revalidatePath('/planner')
  revalidatePath(`/planner/${c.l.id}`)
  if (c.project) revalidatePath(`/projects/${c.project.id}`, 'layout')
  if (c.lead) revalidatePath(`/leads/${c.lead.id}`, 'layout')   // (pending modules S07)
}

/* ── create · save · rename ────────────────────────────────────────────────────────────────────────────────────────────────────── */
/**
 * (J-Q2 · J-Q3 · J-Q5 · J-Q18) A new layout: from a flat template (furnished when asked), blank, or tracing a project's floor plan. A
 * project's layout carries the project AND its lead from this moment (1.0's F-265 — it never did).
 */
export async function createLayout(o: { name?: string; templateKey?: string | null; furnished?: boolean; projectId?: string | null; tracePlanId?: string | null
  /** (parity map, TD-076) one of the studio's templates — My templates */ fromLayoutId?: string | null
  /** (parity map, TD-073) one of the planner's examples */ exampleKey?: string | null
  /** (pending modules S07) a lead's layout, started on the lead before it is won — the project takes it at Won */ leadId?: string | null
  /** (pending modules S28) traced on a floor-plan photo: the project's floor plan, or a lead's / personal photo (`floor_plan_photos`), at the
      size the studio gave it, with the rooms still to place on it (app/planner/photo-actions.ts `startFromFloorPlan`) */
  photo?: { planId: string; mmPerPx: number; toPlace: unknown } | null }): Promise<{ id: string } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  /* (pending modules S07) on a lead: its own layout while it has no project — a won lead's goes on its project */
  const onLead = !o.projectId && o.leadId ? await leadOf(String(o.leadId)) : null
  if (!o.projectId && o.leadId && !onLead) return { error: 'That lead is no longer here' }
  if (onLead) {
    const visible = await visibleLeadIds(viewer)
    if (visible && !visible.has(onLead.id)) return { error: 'That lead is no longer here' }
    if (!onLead.projectId && layoutChangeBlock(viewer, { createdBy: null }, { teamIds: onLead.teamIds, stage: 'lead', lead: true })) return { error: LEAD_ADD_RULE }
  }
  const lead = onLead && !onLead.projectId ? onLead : null
  const projectId = o.projectId ?? onLead?.projectId ?? null
  const project = projectId ? await projectOf(projectId) : null
  if (projectId && !project) return { error: 'That project is no longer here' }
  if (project) {
    const visible = await visibleLeadIds(viewer)
    if (visible && !visible.has(project.leadId)) return { error: 'That project is no longer here' }
    const block = layoutChangeBlock(viewer, { createdBy: null }, project)
    if (block) return { error: block.startsWith('The project is completed') ? 'The project is completed — a new layout can’t be added to it' : 'Only the project’s team, their Managers, Owners and Admins can add a layout to this project' }
  }
  /* (parity map, TD-076) from one of the studio's templates: its plan as it stands (no floor plan under it — it is the studio's, never a
     project's), named after it; (TD-073) from an example: the flat, furnished and finished in its style */
  const [from] = o.fromLayoutId ? await db.select().from(spaceLayouts).where(and(eq(spaceLayouts.id, String(o.fromLayoutId)), eq(spaceLayouts.isTemplate, true), isNull(spaceLayouts.deletedAt))) : []
  if (o.fromLayoutId && !from) return { error: 'That template is no longer here' }
  const ex = o.exampleKey ? exampleByKey(o.exampleKey) : null
  if (o.exampleKey && !ex) return { error: 'That example is no longer offered' }
  const t = from ? templateByKey(from.templateKey) : ex ? templateByKey(ex.template) : o.templateKey ? templateByKey(o.templateKey) : null
  if (o.templateKey && !t && !from && !ex) return { error: 'That template is no longer offered' }
  let plan = from ? withoutUnderlays({ ...readPlan(from.plan), camera: null }) : ex ? examplePlan(ex.key)! : planFromTemplate(t?.key ?? null, !!o.furnished)
  if (o.tracePlanId) {
    if (!project) return { error: 'Only a project’s layout can trace its floor plan' }
    const [f] = await db.select().from(projectFloorPlans).where(and(eq(projectFloorPlans.id, String(o.tracePlanId)), eq(projectFloorPlans.projectId, project.id), isNull(projectFloorPlans.putAwayAt)))
    if (!f) return { error: 'That floor plan is no longer on the project' }
    if (!f.scaleMmPerPx) return { error: `Set the scale of ${f.name} on the Floor plan tab first — the layout needs its true size` }
    plan = { ...plan, underlay: { planId: f.id, projectId: project.id, name: f.name, url: `/projects/${project.id}/plan-picture/${f.id}`, mmPerPx: f.scaleMmPerPx, pxW: f.width, pxH: f.height, x: 0, z: 0, opacity: 0.5, visible: true } }
  }
  /* (pending modules S28) a floor-plan photo under an empty plan, at the studio's size, and the rooms to place on it — a project's floor plan
     on a project, else the lead's photo (or a personal layout's own, its maker's) */
  if (o.photo) {
    const mm = Number(o.photo.mmPerPx)
    if (!(mm > 0.05 && mm < 1000)) return { error: 'Say how big the home is — its floor area, or one length on the plan' }
    let u: Underlay
    if (project) {
      const [f] = await db.select().from(projectFloorPlans).where(and(eq(projectFloorPlans.id, String(o.photo.planId)), eq(projectFloorPlans.projectId, project.id), isNull(projectFloorPlans.putAwayAt)))
      if (!f) return { error: 'That floor plan is no longer on the project' }
      u = { planId: f.id, projectId: project.id, name: f.name, url: `/projects/${project.id}/plan-picture/${f.id}`, mmPerPx: mm, pxW: f.width, pxH: f.height, x: 0, z: 0, opacity: 0.5, visible: true }
    } else {
      const [f] = await db.select({ id: floorPlanPhotos.id, leadId: floorPlanPhotos.leadId, name: floorPlanPhotos.name, width: floorPlanPhotos.width, height: floorPlanPhotos.height, createdBy: floorPlanPhotos.createdBy }).from(floorPlanPhotos).where(eq(floorPlanPhotos.id, String(o.photo.planId)))
      if (!f || (lead ? f.leadId !== lead.id : f.leadId !== null || f.createdBy !== viewer.id)) return { error: 'That floor plan is no longer here' }
      u = { planId: f.id, projectId: '', name: f.name, url: `/planner/plan-picture/${f.id}`, mmPerPx: mm, pxW: f.width, pxH: f.height, x: 0, z: 0, opacity: 0.5, visible: true }
    }
    plan = { v: 1, rooms: [], pieces: [], underlay: u, camera: null, wallsLow: false, toPlace: Array.isArray(o.photo.toPlace) ? o.photo.toPlace : [] } as PlanDoc
  }
  const taken = (await db.select({ name: spaceLayouts.name }).from(spaceLayouts).where(project ? and(eq(spaceLayouts.projectId, project.id), isNull(spaceLayouts.deletedAt))
    : lead ? and(eq(spaceLayouts.leadId, lead.id), isNull(spaceLayouts.projectId), isNull(spaceLayouts.deletedAt)) : and(isNull(spaceLayouts.projectId), eq(spaceLayouts.isTemplate, false)))).map((r) => r.name)
  /* (pending modules S28) a photo's plan named "Floor plan — Waterway Sunrise" makes "Traced — Waterway Sunrise", not "Traced — Floor plan — …" */
  /* (S42 D-15) …and "Floor plan photo waterway sunrise" (a device's slug, read as words) makes "Traced — Waterway sunrise": a leading "floor
     plan" goes whatever follows it — a dash, a space, "photo" — and the rest starts with a capital */
  const stripped = (plan.underlay?.name ?? '').replace(/^floor[\s_-]*plans?(?:[\s_-]+photos?)?(?:\s*[—–:-]\s*|[\s_]+)/i, '').trim()
  const traced = (stripped.length >= 3 ? stripped.charAt(0).toUpperCase() + stripped.slice(1) : '') || plan.underlay?.name || 'floor plan'
  const base = cleanName(o.name) || (from ? from.name : ex ? ex.name : o.tracePlanId || o.photo ? `Traced — ${traced}` : t ? `${t.name}${o.furnished ? ' — furnished' : ''}` : 'Blank layout')
  /* (pending modules S28) Activity names the photo it was traced on */
  const how = from ? { kind: from.name } : ex ? { kind: ex.name } : t ? { kind: t.name } : o.photo ? { photo: plan.underlay?.name ?? 'the floor plan' } : {}
  const id = randomUUID(), at = now()
  const name = nextName(base, taken)
  await db.transaction(async (tx) => {
    await tx.insert(spaceLayouts).values({ id, name, templateKey: t?.key ?? null, projectId: project?.id ?? null, leadId: project?.leadId ?? lead?.id ?? null, plan: JSON.stringify(clean(plan)), rev: 1, createdBy: viewer.id, updatedBy: viewer.id, createdAt: at, updatedAt: at })
    if (project) await logProjectEvent(tx, project.leadId, project.id, 'project_layout_created', { name: project.name, number: project.number, id, title: name, ...how }, { actorId: viewer.id })   // (pending modules S43A) who, read before the transaction
  })
  if (lead) await event({ project: null, lead, l: { id, name } }, 'project_layout_created', how)   // (pending modules S07) the lead's line
  touch({ l: { id }, project, lead })
  return { id }
}

/** (J-Q11) The editor's autosave. `rev` is the one the editor last saw; a newer one on the server (another tab, another member) is refused, never merged blind. */
export async function saveLayout(id: string, o: { rev: number; plan: unknown }): Promise<{ rev: number; updatedAt: number } | Err & { stale?: boolean }> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await load(id, true)
  if ('error' in c) return c
  if (typeof o.rev !== 'number' || o.rev !== c.l.rev) return { error: 'This layout was changed somewhere else — reload to see the newest', stale: true }
  const plan = clean(o.plan)
  const at = now()
  const rev = c.l.rev + 1
  const r = await db.update(spaceLayouts).set({ plan: JSON.stringify(plan), rev, updatedBy: c.viewer.id, updatedAt: at }).where(and(eq(spaceLayouts.id, c.l.id), eq(spaceLayouts.rev, c.l.rev)))
  if (!r.rowsAffected) return { error: 'This layout was changed somewhere else — reload to see the newest', stale: true }
  revalidatePath('/planner')
  return { rev, updatedAt: at.getTime() }
}

export async function renameLayout(id: string, name: string): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await load(id, true)
  if ('error' in c) return c
  const next = cleanName(name)
  if (!next) return { error: 'A layout needs a name' }
  await db.update(spaceLayouts).set({ name: next, updatedBy: c.viewer.id, updatedAt: now() }).where(eq(spaceLayouts.id, c.l.id))
  touch(c)
  return { ok: true }
}

/** (J-Q12) A personal copy — the way to work on a completed project's layout, or reuse one. */
export async function duplicateLayout(id: string): Promise<{ id: string; name: string } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await load(id, false)
  if ('error' in c) return c
  const taken = (await db.select({ name: spaceLayouts.name }).from(spaceLayouts).where(isNull(spaceLayouts.projectId))).map((r) => r.name)
  const name = nextName(`${c.l.name} (copy)`.slice(0, NAME_MAX), taken)
  const plan = readPlan(c.l.plan)
  const nid = randomUUID(), at = now()
  /* a personal copy keeps no project, so it keeps no floor plan under it either (the picture is the project's) */
  await db.insert(spaceLayouts).values({ id: nid, name, templateKey: c.l.templateKey, projectId: null, leadId: null, plan: JSON.stringify(clean(withoutUnderlays(plan))), rev: 1, createdBy: c.viewer.id, updatedBy: c.viewer.id, createdAt: at, updatedAt: at })
  revalidatePath('/planner')
  return { id: nid, name }
}

/* ── link to a project (J-Q3) ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export type LinkUndo = { id: string }
export async function linkLayoutToProject(id: string, projectId: string): Promise<{ projectName: string; undo: LinkUndo } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await load(id, true)
  if ('error' in c) return c
  if (c.l.projectId) return { error: 'This layout is already a project’s' }
  if (c.l.isTemplate) return { error: TEMPLATE_STAYS }
  if (c.lead) return { error: LEAD_STAYS }   // (pending modules S07)
  const p = await projectOf(projectId)
  if (!p) return { error: 'That project is no longer here' }
  const visible = await visibleLeadIds(c.viewer)
  if (visible && !visible.has(p.leadId)) return { error: 'That project is no longer here' }
  const block = layoutChangeBlock(c.viewer, { createdBy: null }, p)
  if (block) return { error: block.startsWith('The project is completed') ? 'The project is completed — a layout can’t join it' : 'Only the project’s team, their Managers, Owners and Admins can add a layout to this project' }
  await db.transaction(async (tx) => {
    await tx.update(spaceLayouts).set({ projectId: p.id, leadId: p.leadId, updatedBy: c.viewer.id, updatedAt: now() }).where(eq(spaceLayouts.id, c.l.id))
    await logProjectEvent(tx, p.leadId, p.id, 'project_layout_linked', { name: p.name, number: p.number, id: c.l.id, title: c.l.name }, { actorId: c.viewer.id })
  })
  touch({ l: c.l, project: p })
  return { projectName: p.name, undo: { id: c.l.id } }
}
/** Undo of a link: the layout goes back to being personal (its event stays — the trail is the trail). */
export async function unlinkLayout(u: LinkUndo): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await load(u.id, true)
  if ('error' in c) return c
  const live = await db.select({ id: spaceLayoutShares.id }).from(spaceLayoutShares).where(and(eq(spaceLayoutShares.layoutId, c.l.id), isNull(spaceLayoutShares.revokedAt)))
  if (live.length) return { error: 'This layout is shared with the client — stop sharing it first' }
  await db.update(spaceLayouts).set({ projectId: null, leadId: null, updatedAt: now() }).where(eq(spaceLayouts.id, c.l.id))
  touch(c)
  return { ok: true }
}

/* ── delete · restore · for good ───────────────────────────────────────────────────────────────────────────────────────────────── */
export async function deleteLayouts(ids: string[]): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const list = await Promise.all(ids.slice(0, 200).map((id) => load(id, true)))
  const refused = list.find((c) => 'error' in c) as Err | undefined
  if (refused) return list.length > 1 ? { error: LAYOUTS_DELETE_RULE } : refused
  const at = now()
  for (const c of list as Ctx[]) {
    await db.update(spaceLayouts).set({ deletedAt: at, deletedBy: c.viewer.id }).where(eq(spaceLayouts.id, c.l.id))
    /* its client link stops with it — and comes back with a restore (the share row is kept) */
    await event(c, 'project_layout_deleted')
    touch(c)
  }
  return { ok: true }
}
export async function restoreLayouts(ids: string[]): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const list = await Promise.all(ids.slice(0, 200).map((id) => load(id, true, { deleted: true })))
  const refused = list.find((c) => 'error' in c) as Err | undefined
  if (refused) return refused
  for (const c of list as Ctx[]) {
    await db.update(spaceLayouts).set({ deletedAt: null, deletedBy: null }).where(eq(spaceLayouts.id, c.l.id))
    await event(c, 'project_layout_restored')
    touch(c)
  }
  return { ok: true }
}
export async function deleteLayoutsForever(ids: string[]): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const list = await Promise.all(ids.slice(0, 200).map((id) => load(id, true, { deleted: true })))
  const refused = list.find((c) => 'error' in c) as Err | undefined
  if (refused) return list.length > 1 ? { error: LAYOUTS_DELETE_RULE } : refused
  const gone = (list as Ctx[]).filter((c) => !!c.l.deletedAt).map((c) => c.l.id)
  if (gone.length) await db.delete(spaceLayouts).where(inArray(spaceLayouts.id, gone))
  revalidatePath('/planner')
  return { ok: true }
}
export async function emptyLayoutTrash(): Promise<{ ok: true; kept: number } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const rows = await db.select({ id: spaceLayouts.id }).from(spaceLayouts).where(isNotNull(spaceLayouts.deletedAt))
  const all = await Promise.all(rows.map((r) => load(r.id, true, { deleted: true })))
  const mine = all.filter((c): c is Ctx => !('error' in c) && !!c.l.deletedAt).map((c) => c.l.id)
  const kept = all.filter((c) => 'error' in c).length
  if (mine.length) await db.delete(spaceLayouts).where(inArray(spaceLayouts.id, mine))
  revalidatePath('/planner')
  return { ok: true, kept }
}

/* ── sharing with the client (J-Q14) ───────────────────────────────────────────────────────────────────────────────────────────── */
export type ShareResult = { shareId: string; token: string; sharedAt: number; rev: number }
const token = () => randomBytes(16).toString('base64url')
/** Share the layout as it is now: a new link (or, when one is live, its snapshot refreshed — *Share changes*). */
export async function shareLayout(id: string, o: { message?: string | null; plan?: unknown; rev?: number } = {}): Promise<ShareResult | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await load(id, true)
  if ('error' in c) return c
  /* the editor hands what is on screen, so a share never waits on the autosave; it is the plan the next save writes */
  if (c.l.isTemplate) return { error: TEMPLATE_STAYS }
  const plan = o.plan ? clean(o.plan) : readPlan(c.l.plan)
  if (!allRooms(plan).length) return { error: 'Add a room first — there is nothing to show the client yet' }
  const message = typeof o.message === 'string' ? o.message.trim().slice(0, 500) || null : null
  const at = now()
  const [live] = await db.select().from(spaceLayoutShares).where(and(eq(spaceLayoutShares.layoutId, c.l.id), isNull(spaceLayoutShares.revokedAt)))
  const rev = typeof o.rev === 'number' ? o.rev : c.l.rev
  const snapshot = JSON.stringify(forClient(plan))
  if (live) {
    await db.update(spaceLayoutShares).set({ snapshot, name: c.l.name, sharedRev: rev, updatedAt: at, ...(o.message !== undefined ? { message } : {}) }).where(eq(spaceLayoutShares.id, live.id))
    await keepVersion(c.l, rev, plan, VERSION_NOTES.changes, c.viewer.id)   // (parity map, TD-087) each share keeps a version
    await event(c, 'project_layout_share_updated')
    touch(c)
    return { shareId: live.id, token: live.token, sharedAt: live.sharedAt.getTime(), rev }
  }
  const sid = randomUUID(), t = token()
  await db.insert(spaceLayoutShares).values({ id: sid, layoutId: c.l.id, leadId: c.project?.leadId ?? c.lead?.id ?? null, token: t, snapshot, name: c.l.name, message, sharedRev: rev, sharedBy: c.viewer.id, sharedAt: at, updatedAt: at })   // (pending modules S07) a lead's share sits on its lead — the portal finds it there
  await keepVersion(c.l, rev, plan, VERSION_NOTES.shared, c.viewer.id)   // (parity map, TD-087) each share keeps a version
  await event(c, 'project_layout_shared')
  touch(c)
  return { shareId: sid, token: t, sharedAt: at.getTime(), rev }
}
/** How the link went out — Copy link or WhatsApp (the share's own note). */
export async function recordLayoutSent(shareId: string, via: 'copy' | 'whatsapp'): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [s] = await db.select().from(spaceLayoutShares).where(eq(spaceLayoutShares.id, String(shareId)))
  if (!s) return { error: 'That link is no longer here' }
  const c = await load(s.layoutId, true)
  if ('error' in c) return c
  await db.update(spaceLayoutShares).set({ sentVia: via === 'whatsapp' ? 'whatsapp' : 'copy' }).where(eq(spaceLayoutShares.id, s.id))
  return { ok: true }
}
export type StopUndo = { shareId: string }
/** Stop sharing: the link ends and the layout leaves the client's portal. Undo opens the same link again. */
export async function stopSharingLayout(id: string): Promise<{ undo: StopUndo } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await load(id, true)
  if ('error' in c) return c
  const [live] = await db.select().from(spaceLayoutShares).where(and(eq(spaceLayoutShares.layoutId, c.l.id), isNull(spaceLayoutShares.revokedAt)))
  if (!live) return { error: 'This layout isn’t shared' }
  await db.update(spaceLayoutShares).set({ revokedAt: now(), revokedBy: c.viewer.id }).where(eq(spaceLayoutShares.id, live.id))
  await event(c, 'project_layout_unshared')
  touch(c)
  return { undo: { shareId: live.id } }
}
export async function undoStopSharing(u: StopUndo): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [s] = await db.select().from(spaceLayoutShares).where(eq(spaceLayoutShares.id, String(u.shareId)))
  if (!s) return { error: 'That link is no longer here' }
  const c = await load(s.layoutId, true)
  if ('error' in c) return c
  const [other] = await db.select({ id: spaceLayoutShares.id }).from(spaceLayoutShares).where(and(eq(spaceLayoutShares.layoutId, c.l.id), isNull(spaceLayoutShares.revokedAt)))
  if (other) return { error: 'This layout has a newer link already' }
  await db.update(spaceLayoutShares).set({ revokedAt: null, revokedBy: null }).where(eq(spaceLayoutShares.id, s.id))
  await event(c, 'project_layout_shared', { again: true })
  touch(c)
  return { ok: true }
}

/** (J-Q3) The projects a personal layout may join — the ones this viewer sees, not completed, not deleted. */
export async function readLinkableProjects(): Promise<{ id: string; label: string; sub: string; blocked?: string }[]> {
  if (await offWorkspace()) return []   // (S45C) the workspace's role rule: Marketing reads nothing here
  const viewer = await fetchViewer()
  const visible = await visibleLeadIds(viewer)
  const rows = await db.select({ id: projects.id, name: projects.name, number: projects.number, stage: projects.stage, leadId: projects.leadId }).from(projects).where(isNull(projects.deletedAt))
  const team = rows.length ? await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, rows.map((r) => r.leadId))) : []
  return rows.filter((p) => !visible || visible.has(p.leadId)).sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
    const block = layoutChangeBlock(viewer, { createdBy: null }, { teamIds: team.filter((t) => t.leadId === p.leadId).map((t) => t.memberId), stage: p.stage })
    return { id: p.id, label: p.name, sub: p.number, ...(block ? { blocked: p.stage === 'completed' ? 'Completed' : 'Not your project' } : {}) }
  })
}

/* ── the project's dialog (J-Q3) ───────────────────────────────────────────────────────────────────────────────────────────────── */
export async function readProjectLayouts(projectId: string): Promise<{ layouts: ProjectLayoutRow[]; plans: { id: string; name: string; scaled: boolean; main: boolean }[]; templates: TemplatePick[] } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const r = await fetchProjectLayouts(String(projectId))
  return r ?? { error: 'That project is no longer here' }
}
/** (pending modules S07) A lead's layouts before it is won — the lead page's *Plan the space in 3D*. */
export async function readLeadLayouts(leadId: string): Promise<{ layouts: ProjectLayoutRow[]; plans: { id: string; name: string; scaled: boolean; main: boolean }[]; templates: TemplatePick[]; projectId: string | null } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const r = await fetchLeadLayouts(String(leadId))
  return r ? { ...r, plans: [] } : { error: 'That lead is no longer here' }
}

/* ── the client opens it (J-Q17) ───────────────────────────────────────────────────────────────────────────────────────────────── */
async function stampView(shareId: string, by: string | null): Promise<void> {
  const [s] = await db.select().from(spaceLayoutShares).where(eq(spaceLayoutShares.id, shareId))
  if (!s || s.revokedAt) return
  const at = now()
  const first = !s.firstViewedAt
  await db.update(spaceLayoutShares).set({ viewCount: s.viewCount + 1, lastViewedAt: at, ...(first ? { firstViewedAt: at } : {}) }).where(eq(spaceLayoutShares.id, s.id))
  if (!first) return
  const [l] = await db.select().from(spaceLayouts).where(eq(spaceLayouts.id, s.layoutId))
  const project = l ? await projectOf(l.projectId) : null
  const lead = l && !project && isLeadLayout(l) ? await leadOf(l.leadId) : null   // (pending modules S07) a lead's layout, opened before the lead is won
  if (!l || (!project && !lead)) return
  if (project) await logProjectEvent(db, project.leadId, project.id, 'project_layout_viewed', { name: project.name, number: project.number, id: l.id, title: s.name, by: 'client', ...(by ? { person: by } : {}) }, { actorId: null })
  else await event({ project: null, lead, l: { id: l.id, name: s.name } }, 'project_layout_viewed', { by: 'client', ...(by ? { person: by } : {}) }, null)
  const leadId = project?.leadId ?? lead!.id
  const to = [...new Set([...(s.sharedBy ? [s.sharedBy] : []), ...(project?.teamIds ?? lead?.teamIds ?? [])])]
  await notify('layout_viewed', to, { title: `${by ?? 'The client'} opened the 3D layout`, body: s.name, href: `/planner/${l.id}`, leadId, actorId: null, fields: { '{layout}': s.name } })
}
/** The no-login link stamps its view from the client's browser, once per visit (never while the page renders — the Visualizer's F094). (S42F,
    B-02's sibling) The studio opening its own link in its own browser is never the client's view (`isStudioVisit`). */
export async function stampLayoutLinkView(t: string): Promise<{ ok: true }> {
  if (await isStudioVisit()) return { ok: true }
  const got = await readLayoutShare(String(t))
  if (got?.open) await stampView(got.s.id, null)
  return { ok: true }
}
/** The portal's viewer stamps it for the signed-in client (a studio's preview never counts). */
export async function stampPortalLayoutView(slug: string, shareId: string): Promise<{ ok: true } | Err> {
  const a = await portalActor(String(slug), { write: false, section: 'designs' })
  if ('error' in a) return a
  if (a.visitor.preview) return { ok: true }
  const [s] = await db.select({ id: spaceLayoutShares.id, leadId: spaceLayoutShares.leadId }).from(spaceLayoutShares).where(eq(spaceLayoutShares.id, String(shareId)))
  if (!s || !a.visitor.links.some((k) => k.leadId === s.leadId)) return { error: 'That layout is no longer shared' }
  await stampView(s.id, a.visitor.name)
  return { ok: true }
}

/* ── versions (parity map, TD-087 — 1.0's version history) ─────────────────────────────────────────────────────────────────────── */
/** Keep a version of the layout (a share keeps one, Save a version keeps one by hand); the oldest past the kept number go. */
async function keepVersion(l: Pick<SpaceLayout, 'id' | 'name'>, rev: number, plan: PlanDoc, note: string | null, by: string | null): Promise<string> {
  const id = randomUUID()
  await db.insert(spaceLayoutVersions).values({ id, layoutId: l.id, rev, name: l.name, plan: JSON.stringify(clean(plan)), note, createdBy: by, createdAt: now() })
  const keep = await db.select({ id: spaceLayoutVersions.id }).from(spaceLayoutVersions).where(eq(spaceLayoutVersions.layoutId, l.id)).orderBy(desc(spaceLayoutVersions.createdAt)).limit(VERSIONS_KEPT)
  if (keep.length >= VERSIONS_KEPT) await db.delete(spaceLayoutVersions).where(and(eq(spaceLayoutVersions.layoutId, l.id), notInArray(spaceLayoutVersions.id, keep.map((k) => k.id))))
  return id
}
const cleanNote = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().replace(/^@+/, '').slice(0, 80) : '')
/** Save a version by hand — of the plan on screen (the editor hands it, so it never waits on the autosave), with the studio's own words. */
export async function saveLayoutVersion(id: string, o: { note?: string | null; plan?: unknown; rev?: number; before?: string | null } = {}): Promise<{ versionId: string } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await load(id, true)
  if ('error' in c) return c
  const plan = o.plan ? clean(o.plan) : readPlan(c.l.plan)
  /* `before` — the version a Bring back is about to replace: the plan as it was is kept first, so a Bring back never loses work */
  const note = typeof o.before === 'string' ? `${VERSION_NOTES.before}${cleanNote(o.before)}` : cleanNote(o.note) || null
  const versionId = await keepVersion(c.l, typeof o.rev === 'number' ? o.rev : c.l.rev, plan, note, c.viewer.id)
  return { versionId }
}
/** The Versions drawer's list, newest first. Anyone who may see the layout reads them. */
export async function readLayoutVersions(id: string): Promise<{ versions: LayoutVersionRow[] } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await load(id, false)
  if ('error' in c) return c
  return { versions: await fetchLayoutVersions(c.l.id) }
}

/* ── templates (parity map, TD-076 — 1.0's Save as Template, kept for the studio, not the browser) ─────────────────────────────── */
/** Save as a template: a copy of the layout as it is on screen, the studio's own starting point under New ▾ › My templates — every member
    starts from it; its maker, an Owner or an Admin changes it. A project's floor plan never goes with it. */
export async function saveLayoutAsTemplate(id: string, o: { name?: string; plan?: unknown } = {}): Promise<{ id: string; name: string } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await load(id, false)
  if ('error' in c) return c
  const plan = withoutUnderlays({ ...(o.plan ? clean(o.plan) : readPlan(c.l.plan)), camera: null })
  if (!allRooms(plan).length) return { error: 'Add a room first — a template starts from its rooms' }
  const taken = (await db.select({ name: spaceLayouts.name }).from(spaceLayouts).where(and(eq(spaceLayouts.isTemplate, true), isNull(spaceLayouts.deletedAt)))).map((r) => r.name)
  const name = nextName(cleanName(o.name) || c.l.name, taken)
  const nid = randomUUID(), at = now()
  await db.insert(spaceLayouts).values({ id: nid, name, templateKey: c.l.templateKey, projectId: null, leadId: null, plan: JSON.stringify(clean(plan)), rev: 1, createdBy: c.viewer.id, updatedBy: c.viewer.id, createdAt: at, updatedAt: at, isTemplate: true })
  revalidatePath('/planner')
  return { id: nid, name }
}
/** Undo of a Save as a template: the copy goes for good (a layout started from it since keeps its own plan — nothing points back at it). */
export async function undoSaveAsTemplate(u: { id: string }): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await load(u.id, true)
  if ('error' in c) return c
  if (!c.l.isTemplate) return { error: 'That isn’t a template' }
  await db.delete(spaceLayouts).where(eq(spaceLayouts.id, c.l.id))
  revalidatePath('/planner')
  return { ok: true }
}
/** The studio's templates, for a dialog that offers them (the project's *Start a new layout*). */
export async function readLayoutTemplates(): Promise<TemplatePick[]> {
  if (await offWorkspace()) return []   // (S45C) the workspace's role rule: Marketing reads nothing here
  return fetchLayoutTemplates()
}
