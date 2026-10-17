'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, desc, eq, inArray, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { floorPlanComments, floorPlanMarks, floorPlanPictures, homeownerLeadLinks, leadAssignees, leadEvents, leadFiles, leadTasks, members, projectFloorPlans, projects, quotes, type FloorPlanMark, type ProjectFloorPlan } from '@/lib/db/schema'
import { cancelHeldMessages, holdClientMail } from '@/lib/notifications/delivery'   // (parity map, TD-049 · TD-067)
import { UNDO_SNACKBAR_MS, heldIds } from '@/lib/notifications/held'
import { tellClient } from '@/lib/portal/client-messages-send'
import { fetchPortalSections } from '@/lib/portal/sections-queries'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { PICTURE_URL } from '@/lib/leads/file-store'
import { logProjectEvent, type ProjectEventDetail, type ProjectEventKind } from '@/lib/projects/events'
import { CHANGE_RULE, mayChangeProject } from '@/lib/projects/policy'
import { floorPlansFolderOf } from '@/lib/projects/floor-plan'
import { createTask } from '@/app/leads/tasks-actions'
import { createVariationOrder } from '@/app/projects/money-actions'
import {
  COMMENT_MAX, NAME_MAX, PHOTOS_MAX, PICTURE_MAX, cleanShape, formatMm, isLayer, markName, numberMarks, planNameOf, scaleFrom, taskTitleOf, type MarkShape, type MarkTool, type Pt,
} from '@/lib/projects/floor-plan-model'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (gaps build G — calls G-Q1…G-Q18, design-source/context/parity/projects-gaps-build/g-read.md) The studio's floor-plan actions. Who: the
 * project's lead's rule first (`canOpenLead`), then the team, their Managers, Owners and Admins change it (`mayChangeProject`); a completed
 * project's floor plan stays as it was. Only whoever drew a mark moves or deletes it (1.0 F-230); either side resolves or reopens. Every
 * refusal answers `{ error: <the rule> }`; every remove keeps the record so its Undo can put it back. A picture travels inside one object (F205).
 */
type Refusal = { error: string }
const isRefusal = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'error' in x
const NOT_FOUND = 'This project is not there any more'
const PLAN_GONE = 'This plan is not there any more'
const MARK_GONE = 'This mark is not there any more'
const DONE = 'This project is completed — its floor plan stays as it was'
const OWN_RULE = 'Only whoever drew a mark moves or deletes it'

type Ctx = { p: typeof projects.$inferSelect; viewer: Viewer; me: { id: string; name: string } }
async function forProject(projectId: string): Promise<Ctx | Refusal> {
  const [p] = await db.select().from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!p) return { error: NOT_FOUND }
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, p.leadId))) return { error: NOT_FOUND }
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))).map((r) => r.memberId)
  if (!mayChangeProject(viewer, team)) return { error: CHANGE_RULE }
  if (p.stage === 'completed') return { error: DONE }
  const [m] = await db.select({ name: members.name }).from(members).where(eq(members.id, viewer.id)).limit(1)
  return { p, viewer, me: { id: viewer.id, name: m?.name ?? 'Someone' } }
}
async function forPlan(planId: string, o: { putAway?: boolean } = {}): Promise<(Ctx & { plan: ProjectFloorPlan }) | Refusal> {
  const [plan] = await db.select().from(projectFloorPlans).where(eq(projectFloorPlans.id, planId)).limit(1)
  if (!plan || (!o.putAway && plan.putAwayAt)) return { error: PLAN_GONE }
  const c = await forProject(plan.projectId)
  return isRefusal(c) ? c : { ...c, plan }
}
async function forMark(markId: string, o: { deleted?: boolean } = {}): Promise<(Ctx & { plan: ProjectFloorPlan; mark: FloorPlanMark }) | Refusal> {
  const [mark] = await db.select().from(floorPlanMarks).where(eq(floorPlanMarks.id, markId)).limit(1)
  if (!mark || (!o.deleted && mark.deletedAt)) return { error: MARK_GONE }
  const c = await forPlan(mark.planId)
  return isRefusal(c) ? c : { ...c, mark }
}
const own = (c: Ctx & { mark: FloorPlanMark }) => c.mark.authorKind === 'studio' && c.mark.authorId === c.me.id
function touch(projectId: string) { revalidatePath(`/projects/${projectId}/floor-plan`) }
const log = (c: Ctx, kind: ProjectEventKind, detail: ProjectEventDetail) => logProjectEvent(db, c.p.leadId, c.p.id, kind, { name: c.p.name, number: c.p.number, ...detail })
/** The live files of this lead among `ids` — a photo or a plan's original must be the project's own. */
async function ownFiles(leadId: string, ids: string[]): Promise<string[]> {
  if (!ids.length) return []
  return (await db.select({ id: leadFiles.id }).from(leadFiles).where(and(inArray(leadFiles.id, ids), eq(leadFiles.leadId, leadId), isNull(leadFiles.deletedAt), ne(leadFiles.kind, 'folder')))).map((f) => f.id)
}
/** The mark's name as its card says it ("Pin 3", "Callout C1", "13A socket (single)"). */
async function nameOfMark(mark: FloorPlanMark): Promise<string> {
  const all = await db.select({ id: floorPlanMarks.id, tool: floorPlanMarks.tool, layer: floorPlanMarks.layer, createdAt: floorPlanMarks.createdAt }).from(floorPlanMarks).where(and(eq(floorPlanMarks.planId, mark.planId), isNull(floorPlanMarks.deletedAt)))
  const nums = numberMarks(all.map((m) => ({ id: m.id, tool: m.tool as MarkTool, layer: m.layer, at: m.createdAt.getTime() })))
  return markName({ tool: mark.tool as MarkTool, shape: mark.shape as MarkShape }, nums.get(mark.id))
}

/* ── Plans ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Files › Floor plans for this project — found, or made (the starter folder's name) — where a plan's original and the photos on it are kept. */
export async function floorPlanFolder(projectId: string): Promise<{ leadId: string; folderId: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId); if (isRefusal(c)) return c
  const have = await floorPlansFolderOf(c.p.leadId)
  if (have) return { leadId: c.p.leadId, folderId: have }
  const id = randomUUID(); const now = new Date()
  await db.insert(leadFiles).values({ id, leadId: c.p.leadId, kind: 'folder', name: 'Floor plans', thumb: null, createdAt: now, parentId: null, ownerId: c.me.id, sizeBytes: null, mime: null, updatedAt: now })
  return { leadId: c.p.leadId, folderId: id }
}

export type PlanUndo = { planId: string; mainWas: string | null
  /** (parity map, TD-067) the client's email about the plan, held for the add's Undo — the outbox rows the Undo takes back */
  held?: string[] }

/* (parity map 2026-10-10, TD-067 · UC-113 — 1.0 emailed the homeowner a link to every plan the studio uploaded, floor_plan.shared) The client hears of
   a plan the studio adds: `client_floor_plan` (email by default, Settings › Notifications › Messages to clients), once per plan — the outbox's key
   is the plan's — while the portal's Floor plan section is on, and held for the add's Undo, which takes it back (the hold names the events it
   holds, lib/notifications/held.ts `HELD_EVENTS`). Never fails the add. */
async function tellPlan(leadId: string, planId: string, name: string): Promise<string[]> {
  try {
    if (!(await fetchPortalSections())['floor-plan']) return []
    const { held } = await holdClientMail(UNDO_SNACKBAR_MS, () => tellClient({ event: 'client_floor_plan', leadId, ref: planId, path: `floor-plan?plan=${encodeURIComponent(planId)}`,
      fields: { '{plan}': name }, plain: { title: 'A floor plan from your designer', line: `“${name}” is on your page` } }))
    return held.ids
  } catch { return [] }
}
/**
 * Add a plan: a picture or PDF already in the project's Files (just uploaded to Files › Floor plans, or picked from Files) and the picture to
 * mark up, drawn in the browser (a PDF's first page, a big photo at a 2400px long edge). The first plan is the main one; another becomes it only
 * when asked (G-Q3 — 1.0 changed it silently, F-244).
 */
export async function addFloorPlan(projectId: string, o: { fileId: string; picture: string; width: number; height: number; name?: string; main?: boolean }): Promise<{ id: string; main: boolean; undo: PlanUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId); if (isRefusal(c)) return c
  const [f] = await db.select().from(leadFiles).where(and(eq(leadFiles.id, String(o?.fileId ?? '')), eq(leadFiles.leadId, c.p.leadId), isNull(leadFiles.deletedAt))).limit(1)
  if (!f || (f.kind !== 'image' && f.kind !== 'pdf')) return { error: 'A plan is a picture or a PDF in the project’s Files' }
  if (typeof o.picture !== 'string' || !PICTURE_URL.test(o.picture)) return { error: 'The plan didn’t read — pick it again' }
  if (o.picture.length > PICTURE_MAX) return { error: 'The plan is too large to mark up — a smaller picture fits' }
  const w = Math.round(Number(o.width)), h = Math.round(Number(o.height))
  if (!(w >= 50 && w <= 10000 && h >= 50 && h <= 10000)) return { error: 'The plan didn’t read — pick it again' }
  const name = (typeof o.name === 'string' ? o.name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) : '') || planNameOf(f.name)
  const live = await db.select({ id: projectFloorPlans.id, isMain: projectFloorPlans.isMain }).from(projectFloorPlans).where(and(eq(projectFloorPlans.projectId, projectId), isNull(projectFloorPlans.putAwayAt)))
  const mainWas = live.find((p) => p.isMain)?.id ?? null
  const main = !live.length || !mainWas || o.main !== false
  const id = randomUUID(); const now = new Date()
  await db.transaction(async (tx) => {
    if (main) await tx.update(projectFloorPlans).set({ isMain: false }).where(eq(projectFloorPlans.projectId, projectId))
    await tx.insert(projectFloorPlans).values({ id, projectId, leadId: c.p.leadId, name, fileId: f.id, width: w, height: h, isMain: main, addedByKind: 'studio', addedBy: c.me.id, addedByName: c.me.name, createdAt: now, updatedAt: now })
    await tx.insert(floorPlanPictures).values({ planId: id, data: o.picture })
    await logProjectEvent(tx, c.p.leadId, c.p.id, 'project_floor_plan_added', { name: c.p.name, number: c.p.number, id, title: name, by: 'studio', ...(main && live.length ? { again: true } : {}) }, { actorId: c.me.id })   // (pending modules S43A) who, read before the transaction
  })
  const held = await tellPlan(c.p.leadId, id, name)   // (parity map, TD-067)
  touch(projectId)
  return { id, main, undo: { planId: id, mainWas, ...(held.length ? { held } : {}) } }
}
/** Undo of an add: the plan leaves (put away when someone drew on it meanwhile), and the main plan is the one it was. */
export async function undoAddFloorPlan(u: PlanUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPlan(String(u?.planId ?? ''), { putAway: true }); if (isRefusal(c)) return c
  const [marked] = await db.select({ id: floorPlanMarks.id }).from(floorPlanMarks).where(eq(floorPlanMarks.planId, c.plan.id)).limit(1)
  await db.transaction(async (tx) => {
    if (marked) await tx.update(projectFloorPlans).set({ putAwayAt: new Date(), putAwayBy: c.me.id, isMain: false }).where(eq(projectFloorPlans.id, c.plan.id))
    else await tx.delete(projectFloorPlans).where(eq(projectFloorPlans.id, c.plan.id))
    if (u.mainWas) await tx.update(projectFloorPlans).set({ isMain: true }).where(and(eq(projectFloorPlans.id, u.mainWas), eq(projectFloorPlans.projectId, c.p.id)))
  })
  if (heldIds(u.held).length) await cancelHeldMessages(u.held, c.p.leadId)   // (parity map, TD-067) the client's email goes back with it, while held
  touch(c.p.id)
  return { ok: true }
}

/* ── (parity map 2026-10-10, TD-049 · UC-094 · UC-113 — 1.0's first run: "Don't have it? Ask your homeowner to send it", always emailed) ──
   The Floor plan's first run, for a client on the portal, asks them for their plan: the ask is stamped on the project (`floor_plan_asked_at` ·
   `_by`), the client's page shows "Send your floor plan" in What needs you until a plan is on the project (lib/portal/needs.ts), and
   `client_floor_plan_ask` tells them (email by default), held for the snackbar's Undo. Who: the project's change rule (`forProject`). A client
   not on the portal is invited first (the first run's other link); a project with a plan has nothing to ask for. Asking again sends again —
   the key is the ask's own moment. Activity files it (`parity_h_floor_plan_asked`, region P-H). */
export type FloorPlanAskUndo = { projectId: string; before: { at: number | null; by: string | null }; held: string[]; eventId: string | null }
const ASKED_KIND: ProjectEventKind = 'parity_h_floor_plan_asked'   // P-H's own kind (lib/leads/activity.ts region P-H)
export async function askClientForFloorPlan(projectId: string): Promise<{ undo: FloorPlanAskUndo; told: number; at: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(String(projectId ?? '')); if (isRefusal(c)) return c
  const [link] = await db.select({ invitedAt: homeownerLeadLinks.invitedAt, withdrawnAt: homeownerLeadLinks.withdrawnAt }).from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, c.p.leadId)).limit(1)
  if (!link?.invitedAt || link.withdrawnAt) return { error: 'Invite the client to the portal first — the ask waits on their page' }
  const [plan] = await db.select({ id: projectFloorPlans.id }).from(projectFloorPlans).where(and(eq(projectFloorPlans.projectId, c.p.id), isNull(projectFloorPlans.putAwayAt))).limit(1)
  if (plan) return { error: 'This project has a floor plan already' }
  if (!(await fetchPortalSections())['floor-plan']) return { error: 'The Floor plan is off on the client portal — Company › Client portal turns it on' }
  const before = { at: c.p.floorPlanAskedAt?.getTime() ?? null, by: c.p.floorPlanAskedBy ?? null }
  const now = new Date()
  await db.update(projects).set({ floorPlanAskedAt: now, floorPlanAskedBy: c.me.id }).where(eq(projects.id, c.p.id))
  const eventId = await log(c, ASKED_KIND, { again: before.at ? true : undefined })
  let told = 0
  const { held } = await holdClientMail(UNDO_SNACKBAR_MS, async () => {
    told = await tellClient({ event: 'client_floor_plan_ask', leadId: c.p.leadId, ref: `${c.p.id}:${now.getTime()}`, path: 'floor-plan',
      fields: {}, plain: { title: 'Could you send us your floor plan?', line: 'A photo or a PDF is fine — send it from your page' } })
  }).catch(() => ({ held: { ids: [] as string[], to: [] as string[] } }))
  touch(c.p.id)
  revalidatePath(`/projects/${c.p.id}`)
  return { undo: { projectId: c.p.id, before, held: held.ids, eventId }, told, at: now.getTime() }
}
/** Undo of an ask: the stamp as it was, the client's email taken back while it is held, the Activity line gone. */
export async function undoFloorPlanAsk(u: FloorPlanAskUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(String(u?.projectId ?? '')); if (isRefusal(c)) return c
  const at = typeof u.before?.at === 'number' ? new Date(u.before.at) : null
  await db.update(projects).set({ floorPlanAskedAt: at, floorPlanAskedBy: at && typeof u.before.by === 'string' ? u.before.by.slice(0, 64) : null }).where(eq(projects.id, c.p.id))
  if (heldIds(u.held).length) await cancelHeldMessages(u.held, c.p.leadId)
  /* only the ask's own line on this lead — an Undo's payload is the browser's, never trusted for more */
  if (typeof u.eventId === 'string') await db.delete(leadEvents).where(and(eq(leadEvents.id, u.eventId), eq(leadEvents.leadId, c.p.leadId), eq(leadEvents.kind, ASKED_KIND)))
  touch(c.p.id)
  revalidatePath(`/projects/${c.p.id}`)
  return { ok: true }
}

export async function renameFloorPlan(planId: string, name: string): Promise<{ before: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPlan(planId); if (isRefusal(c)) return c
  const next = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
  if (!next) return { error: 'A name is required' }
  if (next === c.plan.name) return { before: c.plan.name }
  await db.update(projectFloorPlans).set({ name: next, updatedAt: new Date() }).where(eq(projectFloorPlans.id, planId))
  await log(c, 'project_floor_plan_renamed', { id: planId, title: next, from: c.plan.name, to: next })
  touch(c.p.id)
  return { before: c.plan.name }
}

/** The main plan — what the client opens on (1.0's Primary; only the studio chooses it). */
export async function setMainFloorPlan(planId: string): Promise<{ mainWas: string | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPlan(planId); if (isRefusal(c)) return c
  const [was] = await db.select({ id: projectFloorPlans.id }).from(projectFloorPlans).where(and(eq(projectFloorPlans.projectId, c.p.id), eq(projectFloorPlans.isMain, true))).limit(1)
  if (was?.id === planId) return { mainWas: planId }
  await db.transaction(async (tx) => {
    await tx.update(projectFloorPlans).set({ isMain: false }).where(eq(projectFloorPlans.projectId, c.p.id))
    await tx.update(projectFloorPlans).set({ isMain: true }).where(eq(projectFloorPlans.id, planId))
    await logProjectEvent(tx, c.p.leadId, c.p.id, 'project_floor_plan_main', { name: c.p.name, number: c.p.number, id: planId, title: c.plan.name }, { actorId: c.me.id })
  })
  touch(c.p.id)
  return { mainWas: was?.id ?? null }
}

/** Put a plan away (1.0's Archive): hidden from both sides, its marks and conversations kept; the main one passes to the newest left. */
export async function putAwayFloorPlan(planId: string): Promise<{ undo: PlanUndo; newMain: string | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPlan(planId); if (isRefusal(c)) return c
  const live = await db.select().from(projectFloorPlans).where(and(eq(projectFloorPlans.projectId, c.p.id), isNull(projectFloorPlans.putAwayAt))).orderBy(desc(projectFloorPlans.createdAt))
  if (live.length <= 1) return { error: 'The only plan can’t be put away — add another first' }
  const next = c.plan.isMain ? live.find((p) => p.id !== planId) ?? null : null
  await db.transaction(async (tx) => {
    await tx.update(projectFloorPlans).set({ putAwayAt: new Date(), putAwayBy: c.me.id, isMain: false }).where(eq(projectFloorPlans.id, planId))
    if (next) await tx.update(projectFloorPlans).set({ isMain: true }).where(eq(projectFloorPlans.id, next.id))
    await logProjectEvent(tx, c.p.leadId, c.p.id, 'project_floor_plan_put_away', { name: c.p.name, number: c.p.number, id: planId, title: c.plan.name }, { actorId: c.me.id })
  })
  touch(c.p.id)
  return { undo: { planId, mainWas: c.plan.isMain ? planId : null }, newMain: next?.id ?? null }
}
/** Undo, or Put back from the put-away list: the plan comes back — the main one again when it was. */
export async function restoreFloorPlan(u: PlanUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPlan(String(u?.planId ?? ''), { putAway: true }); if (isRefusal(c)) return c
  await db.transaction(async (tx) => {
    if (u.mainWas === c.plan.id) await tx.update(projectFloorPlans).set({ isMain: false }).where(eq(projectFloorPlans.projectId, c.p.id))
    await tx.update(projectFloorPlans).set({ putAwayAt: null, putAwayBy: null, ...(u.mainWas === c.plan.id ? { isMain: true } : {}) }).where(eq(projectFloorPlans.id, c.plan.id))
    await logProjectEvent(tx, c.p.leadId, c.p.id, 'project_floor_plan_restored', { name: c.p.name, number: c.p.number, id: c.plan.id, title: c.plan.name }, { actorId: c.me.id })
  })
  touch(c.p.id)
  return { ok: true }
}

/** (G-Q7) Teach the plan its size from one known length — two points and the real length in millimetres. Answers the scale it had, for Undo. */
export async function setFloorPlanScale(planId: string, o: { a: Pt; b: Pt; mm: number }): Promise<{ before: number | null; scale: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPlan(planId); if (isRefusal(c)) return c
  const ok = (p: unknown): p is Pt => !!p && typeof p === 'object' && Number.isFinite((p as Pt).x) && Number.isFinite((p as Pt).y)
  if (!ok(o?.a) || !ok(o?.b)) return { error: 'Mark both ends first' }
  const mm = Number(o.mm)
  if (!(mm > 0 && mm <= 100_000)) return { error: 'Say how long it is — up to 100 m' }
  const scale = scaleFrom(o.a, o.b, mm, c.plan.width, c.plan.height)
  if (!scale) return { error: 'The two ends are too close — mark something longer' }
  await db.update(projectFloorPlans).set({ scaleMmPerPx: scale, scaleSetBy: c.me.id, scaleSetAt: new Date(), updatedAt: new Date() }).where(eq(projectFloorPlans.id, planId))
  await log(c, 'project_floor_plan_scale', { id: planId, title: c.plan.name, scale: formatMm(mm) })
  touch(c.p.id)
  return { before: c.plan.scaleMmPerPx ?? null, scale }
}
export async function undoFloorPlanScale(planId: string, before: number | null): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPlan(planId); if (isRefusal(c)) return c
  const v = typeof before === 'number' && Number.isFinite(before) && before > 0 ? before : null
  await db.update(projectFloorPlans).set({ scaleMmPerPx: v, updatedAt: new Date() }).where(eq(projectFloorPlans.id, planId))
  touch(c.p.id)
  return { ok: true }
}

/* ── Marks ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A mark drawn by the studio — any tool, any layer (General when none is named); photos must be the project's own files. */
export async function addFloorPlanMark(planId: string, o: { tool: string; shape: unknown; layer?: string }): Promise<{ id: string; at: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forPlan(planId); if (isRefusal(c)) return c
  const r = cleanShape(o?.tool, o?.shape); if ('error' in r) return r
  if (r.shape.photos) {
    const kept = await ownFiles(c.p.leadId, r.shape.photos)
    if (kept.length !== r.shape.photos.length) return { error: 'A photo didn’t land — add it again' }
  }
  const layer = isLayer(o?.layer) ? o.layer : 'general'
  const id = randomUUID(); const now = new Date()
  await db.insert(floorPlanMarks).values({ id, planId, projectId: c.p.id, tool: String(o.tool), shape: r.shape, layer, authorKind: 'studio', authorId: c.me.id, authorName: c.me.name, status: 'open', createdAt: now, updatedAt: now })
  touch(c.p.id)
  return { id, at: now.getTime() }
}

/** Move your own mark: the same mark, every point carried the same way. Answers the shape it had, for Undo. */
export async function moveFloorPlanMark(markId: string, o: { shape: unknown }): Promise<{ before: MarkShape } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMark(markId); if (isRefusal(c)) return c
  if (!own(c)) return { error: OWN_RULE }
  const before = c.mark.shape as MarkShape
  const r = cleanShape(c.mark.tool, { ...before, points: (o?.shape as MarkShape | undefined)?.points })
  if ('error' in r) return r
  if (r.shape.points.length !== before.points.length) return { error: 'Couldn’t move that mark — draw it again' }
  const dx = r.shape.points[0]!.x - before.points[0]!.x, dy = r.shape.points[0]!.y - before.points[0]!.y
  if (r.shape.points.some((p, i) => Math.abs(p.x - before.points[i]!.x - dx) > 0.002 || Math.abs(p.y - before.points[i]!.y - dy) > 0.002)) return { error: 'Couldn’t move that mark — draw it again' }
  await db.update(floorPlanMarks).set({ shape: { ...before, points: r.shape.points }, updatedAt: new Date() }).where(eq(floorPlanMarks.id, markId))
  touch(c.p.id)
  return { before }
}

/** Delete your own mark — kept, so Undo puts it back with its conversation (1.0 deleted it for good, F-243). */
export async function deleteFloorPlanMark(markId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMark(markId); if (isRefusal(c)) return c
  if (!own(c)) return { error: OWN_RULE }
  await db.update(floorPlanMarks).set({ deletedAt: new Date(), deletedBy: c.me.id, updatedAt: new Date() }).where(eq(floorPlanMarks.id, markId))
  touch(c.p.id)
  return { ok: true }
}
export async function restoreFloorPlanMark(markId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMark(markId, { deleted: true }); if (isRefusal(c)) return c
  if (!own(c)) return { error: OWN_RULE }
  await db.update(floorPlanMarks).set({ deletedAt: null, deletedBy: null, updatedAt: new Date() }).where(eq(floorPlanMarks.id, markId))
  touch(c.p.id)
  return { ok: true }
}

/** Resolve or reopen — either side, any mark (1.0 F-230). */
export async function setFloorPlanMarkStatus(markId: string, status: 'open' | 'resolved'): Promise<{ before: 'open' | 'resolved' } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMark(markId); if (isRefusal(c)) return c
  const next = status === 'resolved' ? 'resolved' : 'open'
  const before = c.mark.status === 'resolved' ? 'resolved' : 'open'
  if (before === next) return { before }
  const now = new Date()
  await db.update(floorPlanMarks).set({ status: next, resolvedAt: next === 'resolved' ? now : null, resolvedBy: next === 'resolved' ? c.me.name : null, updatedAt: now }).where(eq(floorPlanMarks.id, markId))
  await log(c, next === 'resolved' ? 'project_floor_plan_resolved' : 'project_floor_plan_reopened', { id: c.plan.id, title: c.plan.name, mark: await nameOfMark(c.mark) })
  touch(c.p.id)
  return { before }
}

/** Move a mark to another trade layer — Studio only takes it off the client's plan (on the server). */
export async function setFloorPlanMarkLayer(markId: string, layer: string): Promise<{ before: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMark(markId); if (isRefusal(c)) return c
  if (!isLayer(layer)) return { error: 'That layer isn’t one the floor plan knows' }
  if (c.mark.authorKind === 'client' && layer === 'studio_only') return { error: 'A client’s mark stays where they can see it' }
  await db.update(floorPlanMarks).set({ layer, updatedAt: new Date() }).where(eq(floorPlanMarks.id, markId))
  touch(c.p.id)
  return { before: c.mark.layer }
}

/** A comment on a mark's thread — words, photos (already in Files › Floor plans), or both. */
export async function commentOnFloorPlanMark(markId: string, o: { body?: string; photos?: string[] }): Promise<{ id: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMark(markId); if (isRefusal(c)) return c
  const body = typeof o?.body === 'string' ? o.body.trim().slice(0, COMMENT_MAX) : ''
  const asked = Array.isArray(o?.photos) ? [...new Set(o.photos.filter((x): x is string => typeof x === 'string'))].slice(0, PHOTOS_MAX) : []
  const photos = await ownFiles(c.p.leadId, asked)
  if (photos.length !== asked.length) return { error: 'A photo didn’t land — add it again' }
  if (!body && !photos.length) return { error: 'Write a comment or add a photo' }
  const id = randomUUID(); const now = new Date()
  await db.transaction(async (tx) => {
    await tx.insert(floorPlanComments).values({ id, markId, body, photos: photos.length ? photos : null, authorKind: 'studio', authorId: c.me.id, authorName: c.me.name, createdAt: now })
    await tx.update(floorPlanMarks).set({ updatedAt: now }).where(eq(floorPlanMarks.id, markId))
  })
  touch(c.p.id)
  return { id }
}

/** (G-Q9) A mark becomes the house task on the project — titled from its words, assigned to whoever pressed it; a second press opens the same one. */
export async function floorPlanMarkToTask(markId: string): Promise<{ taskId: string; title: string; made: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMark(markId); if (isRefusal(c)) return c
  if (c.mark.taskId) {
    const [t] = await db.select({ id: leadTasks.id, title: leadTasks.title }).from(leadTasks).where(eq(leadTasks.id, c.mark.taskId)).limit(1)
    if (t) return { taskId: t.id, title: t.title, made: false }
  }
  const comments = await db.select({ body: floorPlanComments.body }).from(floorPlanComments).where(and(eq(floorPlanComments.markId, markId), isNull(floorPlanComments.deletedAt))).limit(1)
  const name = await nameOfMark(c.mark)
  const title = taskTitleOf({ tool: c.mark.tool as MarkTool, shape: c.mark.shape as MarkShape, comments: comments.map((x) => ({ body: x.body })) as never }, name)
  const taskId = await createTask(c.p.leadId, title, { description: `From the floor plan “${c.plan.name}” — ${name}.`, assignees: [c.me.id] })
  await db.update(floorPlanMarks).set({ taskId, updatedAt: new Date() }).where(eq(floorPlanMarks.id, markId))
  await log(c, 'project_floor_plan_task', { id: c.plan.id, title: c.plan.name, mark: name, task: title })
  touch(c.p.id)
  return { taskId, title, made: true }
}

/** (G-Q10) A mark raises a variation order on the project (B's own `createVariationOrder` — its money rule and numbering), titled from the
    mark and linked to it; the editor opens on it. One per mark: a second press opens the same order. */
export async function floorPlanMarkToVariation(markId: string): Promise<{ id: string; number: string; made: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forMark(markId); if (isRefusal(c)) return c
  if (c.mark.variationId) {
    const [q] = await db.select({ id: quotes.id, number: quotes.number }).from(quotes).where(and(eq(quotes.id, c.mark.variationId), isNull(quotes.deletedAt))).limit(1)
    if (q) return { id: q.id, number: q.number, made: false }
  }
  const r = await createVariationOrder(c.p.id)
  if (isRefusal(r)) return r
  const name = await nameOfMark(c.mark)
  const words = ((c.mark.shape as MarkShape).text ?? '').trim()
  if (words) await db.update(quotes).set({ title: words.slice(0, 80) }).where(eq(quotes.id, r.id))
  await db.update(floorPlanMarks).set({ variationId: r.id, updatedAt: new Date() }).where(eq(floorPlanMarks.id, markId))
  await log(c, 'project_floor_plan_vo', { id: c.plan.id, title: c.plan.name, mark: name, vo: r.number })
  touch(c.p.id)
  return { id: r.id, number: r.number, made: true }
}
