'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, desc, eq, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { floorPlanPhotos, leadAssignees, leadFiles, leads, projectFloorPlans, projects, spaceLayouts } from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { isAccounting } from '@/lib/settings/roles'
import { PICTURE_URL, dataUrlSize } from '@/lib/leads/file-store'
import { FILE_UPLOAD_MAX } from '@/lib/leads/file-model'
import { floorPlansFolderOf } from '@/lib/projects/floor-plan'
import { NAME_MAX, PICTURE_MAX, planNameOf, scaleFrom, type Pt } from '@/lib/projects/floor-plan-model'
import { layoutChangeBlock } from '@/lib/planner/policy'
import { pictureFileName, scaleOk, type Look } from '@/lib/planner/photo'
import { freeFileName } from '@/lib/visualizer/outputs'
import { addFloorPlan, setFloorPlanScale } from '@/app/projects/floor-plan-actions'
import { uploadFileRecord } from '@/app/leads/files-actions'
import { createLayout } from './actions'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (pending modules S28 — card studio:floorplan-isometric-ai: "Upload a floor-plan photo and get a furnished 3D picture" · "The room list read
 * from the plan, editable before drawing" · "Two looks, Dollhouse and Top-down, and a download") Make a 3D picture's writes. The photo is ONE
 * record wherever it was picked: on a project it IS a floor plan of the project's Floor plan tab (G's `addFloorPlan` — its original in Files ›
 * Floor plans; the client hears of it as of any plan the studio adds); on a lead its original goes to the lead's Files › Floor plans and its
 * straightened picture to `floor_plan_photos`, which becomes the project's floor plan when the lead is won; a personal layout keeps its own.
 * Then the layout is made by the planner's one writer (`createLayout` with `photo`), the picture under it at its size and the rooms to place
 * listed. Who: the planner's rule for a lead's or a project's layout (its members, their Managers, Owners and Admins); Accounting never (a
 * floor plan is the design). A picture travels inside one object (F205). A refusal answers `{ error }`.
 */

type Err = { error: string }
export type PhotoTarget = { kind: 'lead'; id: string } | { kind: 'project'; id: string } | { kind: 'personal' }
/** What the dialog needs of the place a photo is for — its name, its flat (the room list's and the floor area's rule), and why not, when not. */
export type PhotoTargetFacts = {
  target: PhotoTarget
  name: string
  propertyType: string | null
  areaSqft: number | null
  /** why this member may not make a layout there, or null */ block: string | null
  /** the project's floor plan this file already is — a file on the Floor plan tab is traced as it is there */ plan: { id: string; name: string; width: number; height: number; scale: number | null; url: string } | null
}
export type PhotoOption = PhotoTargetFacts & { label: string; sub: string }

const ACCOUNTING = 'A floor plan is the design — Accounting keeps the books'   // (invented copy) the planner's Accounting line
const GONE_LEAD = 'That lead is no longer here'
const GONE_PROJECT = 'That project is no longer here'
const LEAD_ADD = 'Only the lead’s members, their Managers, Owners and Admins can add a layout to this lead'
const PROJECT_ADD = 'Only the project’s team, their Managers, Owners and Admins can add a layout to this project'
const DONE = 'The project is completed — a new layout can’t be added to it'

type Resolved =
  | { kind: 'lead'; leadId: string; name: string; propertyType: string | null; areaSqft: number | null; block: string | null }
  | { kind: 'project'; projectId: string; leadId: string; name: string; number: string; propertyType: string | null; areaSqft: number | null; block: string | null }
  | { kind: 'personal'; name: string; block: string | null }

/** The place a photo is for, as this member sees it — a won lead's photo is its project's. Null when it is not there (or not theirs to see). */
async function resolve(viewer: Viewer, t: PhotoTarget): Promise<Resolved | null> {
  if (t.kind === 'personal') return { kind: 'personal', name: 'Personal', block: isAccounting(viewer.role) ? ACCOUNTING : null }
  const visible = await visibleLeadIds(viewer)
  const teamOf = async (leadId: string) => (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))).map((r) => r.id)
  if (t.kind === 'lead') {
    const [l] = await db.select({ id: leads.id, name: leads.name, propertyType: leads.propertyType, areaSqft: leads.areaSqft, deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, String(t.id)))
    if (!l || l.deletedAt || (visible && !visible.has(l.id))) return null
    const [p] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, l.id), isNull(projects.deletedAt)))
    if (p) return resolve(viewer, { kind: 'project', id: p.id })   // a won lead's layouts are its project's (S07)
    const block = isAccounting(viewer.role) ? ACCOUNTING : layoutChangeBlock(viewer, { createdBy: null }, { teamIds: await teamOf(l.id), stage: 'lead', lead: true }) ? LEAD_ADD : null
    return { kind: 'lead', leadId: l.id, name: l.name, propertyType: l.propertyType, areaSqft: l.areaSqft, block }
  }
  const [p] = await db.select({ id: projects.id, name: projects.name, number: projects.number, stage: projects.stage, leadId: projects.leadId, deletedAt: projects.deletedAt, propertyType: leads.propertyType, areaSqft: leads.areaSqft, leadDeleted: leads.deletedAt })
    .from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(eq(projects.id, String(t.id)))
  if (!p || p.deletedAt || p.leadDeleted || (visible && !visible.has(p.leadId))) return null
  const block = isAccounting(viewer.role) ? ACCOUNTING : p.stage === 'completed' ? DONE : layoutChangeBlock(viewer, { createdBy: null }, { teamIds: await teamOf(p.leadId), stage: p.stage }) ? PROJECT_ADD : null
  return { kind: 'project', projectId: p.id, leadId: p.leadId, name: p.name, number: p.number, propertyType: p.propertyType, areaSqft: p.areaSqft, block }
}
const targetOf = (r: Resolved): PhotoTarget => (r.kind === 'personal' ? { kind: 'personal' } : r.kind === 'lead' ? { kind: 'lead', id: r.leadId } : { kind: 'project', id: r.projectId })
const gplanOf = (projectId: string, p: { id: string; name: string; width: number; height: number; scaleMmPerPx: number | null }) => ({ id: p.id, name: p.name, width: p.width, height: p.height, scale: p.scaleMmPerPx, url: `/projects/${projectId}/plan-picture/${p.id}` })

/**
 * One place's facts (the dialog opened from a door that knows its lead or project). `fileId` — a file of its Files: when it is already a
 * floor plan of the project, that plan comes back (traced as the Floor plan tab has it, never a second copy). `planId` — a floor plan of
 * the project's Floor plan tab.
 */
export async function readPhotoTarget(t: PhotoTarget, o: { fileId?: string | null; planId?: string | null } = {}): Promise<PhotoTargetFacts | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  const r = await resolve(viewer, t)
  if (!r) return { error: t.kind === 'project' ? GONE_PROJECT : GONE_LEAD }
  let plan: PhotoTargetFacts['plan'] = null
  if (r.kind === 'project' && (o.fileId || o.planId)) {
    const [p] = await db.select({ id: projectFloorPlans.id, name: projectFloorPlans.name, width: projectFloorPlans.width, height: projectFloorPlans.height, scaleMmPerPx: projectFloorPlans.scaleMmPerPx }).from(projectFloorPlans)
      .where(and(eq(projectFloorPlans.projectId, r.projectId), isNull(projectFloorPlans.putAwayAt), o.planId ? eq(projectFloorPlans.id, String(o.planId)) : eq(projectFloorPlans.fileId, String(o.fileId)))).orderBy(desc(projectFloorPlans.isMain)).limit(1)
    if (p) plan = gplanOf(r.projectId, p)
    else if (o.planId) return { error: 'That floor plan is no longer on the project' }
  }
  return { target: targetOf(r), name: r.name, propertyType: r.kind === 'personal' ? null : r.propertyType, areaSqft: r.kind === 'personal' ? null : r.areaSqft, block: r.block, plan }
}

/** Every place this member can make a photo's layout for — Personal first, then the leads not won yet, then the running projects. */
export async function readPhotoTargets(): Promise<{ options: PhotoOption[] } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (isAccounting(viewer.role)) return { error: ACCOUNTING }
  const visible = await visibleLeadIds(viewer)
  const [leadRows, projectRows, team] = await Promise.all([
    db.select({ id: leads.id, name: leads.name, propertyType: leads.propertyType, areaSqft: leads.areaSqft, stage: leads.stage, direct: leads.direct }).from(leads).where(isNull(leads.deletedAt)).orderBy(desc(leads.createdAt)),
    db.select({ id: projects.id, name: projects.name, number: projects.number, stage: projects.stage, leadId: projects.leadId, propertyType: leads.propertyType, areaSqft: leads.areaSqft })
      .from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNull(projects.deletedAt), isNull(leads.deletedAt), ne(projects.stage, 'completed'))).orderBy(desc(projects.number)),
    db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees),
  ])
  const teamOf = (leadId: string) => team.filter((x) => x.leadId === leadId).map((x) => x.memberId)
  const won = new Set(projectRows.map((p) => p.leadId))
  const options: PhotoOption[] = [{ target: { kind: 'personal' }, name: 'Personal', label: 'Personal — not for a client', sub: 'The picture stays with the layout', propertyType: null, areaSqft: null, block: null, plan: null }]
  for (const l of leadRows) {
    if (won.has(l.id) || l.direct || (visible && !visible.has(l.id))) continue
    if (layoutChangeBlock(viewer, { createdBy: null }, { teamIds: teamOf(l.id), stage: 'lead', lead: true })) continue
    options.push({ target: { kind: 'lead', id: l.id }, name: l.name, label: `${l.name} · Lead`, sub: [l.propertyType, l.stage].filter(Boolean).join(' · '), propertyType: l.propertyType, areaSqft: l.areaSqft, block: null, plan: null })
  }
  for (const p of projectRows) {
    if (visible && !visible.has(p.leadId)) continue
    if (layoutChangeBlock(viewer, { createdBy: null }, { teamIds: teamOf(p.leadId), stage: p.stage })) continue
    options.push({ target: { kind: 'project', id: p.id }, name: p.name, label: `${p.name} · ${p.number}`, sub: p.propertyType ?? '', propertyType: p.propertyType, areaSqft: p.areaSqft, block: null, plan: null })
  }
  return { options }
}

/** The lead's Files › Floor plans (found, or made by the starter folder's name) — where a photo's original is kept with its bytes. */
export async function floorPlanPhotoFolder(t: PhotoTarget): Promise<{ leadId: string; folderId: string } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  const r = await resolve(viewer, t)
  if (!r || r.kind === 'personal') return { error: r ? 'A personal layout has no client’s Files' : t.kind === 'project' ? GONE_PROJECT : GONE_LEAD }
  if (r.block) return { error: r.block }
  const have = await floorPlansFolderOf(r.leadId)
  if (have) return { leadId: r.leadId, folderId: have }
  const id = randomUUID(), now = new Date()
  await db.insert(leadFiles).values({ id, leadId: r.leadId, kind: 'folder', name: 'Floor plans', thumb: null, createdAt: now, parentId: null, ownerId: viewer.id, sizeBytes: null, mime: null, updatedAt: now })
  revalidatePath(`/leads/${r.leadId}/files`)
  return { leadId: r.leadId, folderId: id }
}

type Measured = { a: Pt; b: Pt; mm: number }
const isPt = (p: unknown): p is Pt => !!p && typeof p === 'object' && Number.isFinite((p as Pt).x) && Number.isFinite((p as Pt).y) && (p as Pt).x >= 0 && (p as Pt).x <= 1 && (p as Pt).y >= 0 && (p as Pt).y <= 1
const measuredOf = (m: unknown): Measured | null => {
  const o = (m && typeof m === 'object' ? m : null) as Partial<Measured> | null
  return o && isPt(o.a) && isPt(o.b) && Number(o.mm) > 0 && Number(o.mm) <= 100_000 ? { a: o.a, b: o.b, mm: Number(o.mm) } : null
}

/**
 * Make a 3D picture's start: keep the photo (a project's floor plan, a lead's photo, a personal layout's own), then make the layout over it —
 * at the size measured on it (one length the studio knew; on a project's plan it becomes the plan's scale too, one record) or worked out
 * from the floor area (`mmPerPx`, the browser's rule — kept on the layout alone) — with the rooms still to place.
 * `source`: `photo` — the picture the browser straightened, and the original already in the client's Files (`fileId`, none for a personal
 * one); `plan` — a floor plan of the project's Floor plan tab, as it is there.
 */
export async function startFromFloorPlan(o: {
  target: PhotoTarget
  source: { kind: 'photo'; fileId: string | null; picture: string; width: number; height: number; name: string } | { kind: 'plan'; planId: string }
  scale: { mmPerPx: number | null; measured: Measured | null }
  rooms: { name: string; kind: string }[]
}): Promise<{ id: string; planId: string; planOnProject: boolean } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  const r = await resolve(viewer, o?.target ?? { kind: 'personal' })
  if (!r) return { error: o?.target?.kind === 'project' ? GONE_PROJECT : GONE_LEAD }
  if (r.block) return { error: r.block }
  const src = o?.source
  const measured = measuredOf(o?.scale?.measured)
  let planId: string, width: number, height: number, name: string, planScale: number | null = null
  if (src?.kind === 'plan') {
    if (r.kind !== 'project') return { error: 'Only a project has floor plans on its Floor plan tab' }
    const [p] = await db.select().from(projectFloorPlans).where(and(eq(projectFloorPlans.id, String(src.planId)), eq(projectFloorPlans.projectId, r.projectId), isNull(projectFloorPlans.putAwayAt)))
    if (!p) return { error: 'That floor plan is no longer on the project' }
    planId = p.id; width = p.width; height = p.height; name = p.name; planScale = p.scaleMmPerPx
  } else if (src?.kind === 'photo') {
    if (typeof src.picture !== 'string' || !PICTURE_URL.test(src.picture)) return { error: 'The plan didn’t read — pick it again' }
    if (src.picture.length > PICTURE_MAX) return { error: 'The plan is too large — a smaller picture fits' }
    width = Math.round(Number(src.width)); height = Math.round(Number(src.height))
    if (!(width >= 50 && width <= 10000 && height >= 50 && height <= 10000)) return { error: 'The plan didn’t read — pick it again' }
    name = (typeof src.name === 'string' ? src.name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) : '') || 'Floor plan'
    if (r.kind !== 'personal') {
      /* the original must be the client's own file, kept in their Files */
      const [f] = src.fileId ? await db.select({ id: leadFiles.id, kind: leadFiles.kind, name: leadFiles.name }).from(leadFiles).where(and(eq(leadFiles.id, String(src.fileId)), eq(leadFiles.leadId, r.leadId), isNull(leadFiles.deletedAt))) : []
      if (!f || (f.kind !== 'image' && f.kind !== 'pdf')) return { error: 'The photo didn’t land in Files — pick it again' }
      name = (typeof src.name === 'string' && src.name.trim() ? name : planNameOf(f.name))
      if (r.kind === 'project') {
        /* (G) the project's floor plan — the Floor plan tab's own add, never the main plan a client opens on unless it is the first */
        const added = await addFloorPlan(r.projectId, { fileId: f.id, picture: src.picture, width, height, name, main: false })
        if ('error' in added) return added
        planId = added.id
      } else {
        planId = randomUUID()
        await db.insert(floorPlanPhotos).values({ id: planId, leadId: r.leadId, fileId: f.id, name, width, height, scaleMmPerPx: null, picture: src.picture, createdBy: viewer.id, createdAt: new Date() })
      }
    } else {
      planId = randomUUID()
      await db.insert(floorPlanPhotos).values({ id: planId, leadId: null, fileId: null, name, width, height, scaleMmPerPx: null, picture: src.picture, createdBy: viewer.id, createdAt: new Date() })
    }
  } else return { error: 'Pick the floor plan first' }

  /* the size: one measured length wins (and is the record's own scale); else the plan's own scale; else the floor area's */
  let mmPerPx: number | null = null
  if (measured) {
    mmPerPx = scaleFrom(measured.a, measured.b, measured.mm, width, height)
    if (!mmPerPx) return { error: 'The two ends are too close — mark something longer' }
    if (r.kind === 'project') { const s = await setFloorPlanScale(planId, measured); if ('error' in s) return s }
    else await db.update(floorPlanPhotos).set({ scaleMmPerPx: mmPerPx }).where(eq(floorPlanPhotos.id, planId))
  } else if (planScale && planScale > 0 && !o?.scale?.mmPerPx) mmPerPx = planScale
  else mmPerPx = Number(o?.scale?.mmPerPx)
  if (!scaleOk(mmPerPx)) return { error: 'Say how big the home is — its floor area, or one length on the plan' }

  const made = await createLayout({ projectId: r.kind === 'project' ? r.projectId : null, leadId: r.kind === 'lead' ? r.leadId : null, photo: { planId, mmPerPx, toPlace: Array.isArray(o?.rooms) ? o.rooms : [] } })
  if ('error' in made) return made
  return { id: made.id, planId, planOnProject: r.kind === 'project' && src.kind === 'photo' }
}

/**
 * The 3D picture kept in the client's Files › Renders (the house's one place for pictures, Q-13) — through Files' own upload, so Files' rules
 * hold (Who sees leads; Accounting reads only). A JPEG; its name the layout's and the look's ("… — Dollhouse.jpg", "(2)" when taken).
 */
export async function savePlannerPicture(layoutId: string, o: { data: string; look: Look }): Promise<{ fileId: string; leadId: string; projectId: string | null; name: string } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (isAccounting(viewer.role)) return { error: ACCOUNTING }
  const [l] = await db.select({ id: spaceLayouts.id, name: spaceLayouts.name, leadId: spaceLayouts.leadId, projectId: spaceLayouts.projectId, isTemplate: spaceLayouts.isTemplate, deletedAt: spaceLayouts.deletedAt }).from(spaceLayouts).where(eq(spaceLayouts.id, String(layoutId)))
  if (!l || l.deletedAt) return { error: 'That layout is no longer here' }
  if (!l.leadId || l.isTemplate) return { error: 'A personal layout has no client’s Files — download the picture instead' }
  const data = typeof o?.data === 'string' ? o.data : ''
  if (!/^data:image\/(jpeg|png);base64,/.test(data)) return { error: 'Couldn’t draw the picture — please try again' }
  if (dataUrlSize(data) > FILE_UPLOAD_MAX) return { error: 'The picture is too large to keep — download it instead' }
  const t = await resolve(viewer, l.projectId ? { kind: 'project', id: l.projectId } : { kind: 'lead', id: l.leadId })
  if (!t || t.kind === 'personal') return { error: 'That layout’s client is no longer here' }
  /* Files › Renders, found or made at the root */
  const [had] = await db.select({ id: leadFiles.id }).from(leadFiles).where(and(eq(leadFiles.leadId, t.leadId), eq(leadFiles.kind, 'folder'), eq(leadFiles.name, 'Renders'), isNull(leadFiles.parentId), isNull(leadFiles.deletedAt)))
  let folderId = had?.id ?? null
  if (!folderId) {
    folderId = randomUUID(); const now = new Date()
    await db.insert(leadFiles).values({ id: folderId, leadId: t.leadId, kind: 'folder', name: 'Renders', thumb: null, createdAt: now, parentId: null, ownerId: viewer.id, sizeBytes: null, mime: null, updatedAt: now })
  }
  const taken = (await db.select({ name: leadFiles.name }).from(leadFiles).where(and(eq(leadFiles.leadId, t.leadId), eq(leadFiles.parentId, folderId), isNull(leadFiles.deletedAt)))).map((f) => f.name)
  const ext = data.startsWith('data:image/jpeg') ? '.jpg' : '.png'
  const fileName = freeFileName(pictureFileName(l.name, o?.look === 'top' ? 'top' : 'dollhouse').replace(/\.png$/, ext), taken)
  const row = await uploadFileRecord(t.leadId, { parentId: folderId, name: fileName, data })
  if ('error' in row) return row
  revalidatePath(`/leads/${t.leadId}/files`)
  if (l.projectId) revalidatePath(`/projects/${l.projectId}/files`)
  return { fileId: row.id, leadId: t.leadId, projectId: l.projectId, name: row.name }
}
