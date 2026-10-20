'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull, like } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadEvents, projectContractors, projectMilestones, projects, vendors } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { revalidateLead } from '@/lib/leads/queries'
import { logProjectEvent } from '@/lib/projects/events'
import { mayChangeProject } from '@/lib/projects/policy'
import { completedBlock } from '@/lib/projects/handover-model'
import { dateOfDay, dayOfStored } from '@/lib/projects/schedule-model'
import {
  ASSIGN_RULE, CHECK_RULE, CREW_NOTE_MAX, CREW_STATUS_LABEL, ROLE_RULE, checksCrew, doesTrade, isCrewStatus, seesContractors, shortVendor, windowOf, windowWords,
  type CrewStatus,
} from '@/lib/projects/contractors-model'
import { contractorOf } from '@/lib/projects/contractors'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (S45B · H-UHD-2 — his "build everything and complete it" 2026-10-17; 1.0's `/api/projects/[id]/contractors` routes, migration 498) Putting
 * the studio's contractors on a project: on one of its milestones (the window is the milestone's dates — it follows the schedule) or on dates
 * of its own; Planned · On site · Done; Leader checked; off the project. Who may: the project's team, their Managers, Owners and Admins
 * (`mayChangeProject`, the schedule's own rule) — Leader checked only an Owner, an Admin or a Manager; Marketing never (S45C's `workspaceRefusal`,
 * every action's first line, the house gate's sentence) and Accounting never (`ROLE_RULE`, the next line). Every refusal is `{ error: <the rule> }`; every change answers one sentence and its Undo — the Undo reads what it puts
 * back from the change's own Activity line (fix-B B-02's way), never from the page, and takes that line away with it.
 */
type Refusal = { error: string }
type Project = typeof projects.$inferSelect
type Row = typeof projectContractors.$inferSelect
const NOT_FOUND = 'This project is not there any more'
const GONE = 'This contractor is not on the project any more'
const DAY_MIN = 10_000, DAY_MAX = 60_000   // 1997 … 2134: a real day, never a stray number
const day = (n: unknown): number | null => (typeof n === 'number' && Number.isInteger(n) && n > DAY_MIN && n < DAY_MAX ? n : null)
const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** The project after the viewer's checks: a role that works on projects, sees it (its lead's rule), may change it, and it is not handed over. */
async function forProject(projectId: string, viewer: Viewer): Promise<{ p: Project } | Refusal> {
  const [p] = await db.select().from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!p) return { error: NOT_FOUND }
  if (!(await canOpenLead(viewer, p.leadId))) return { error: NOT_FOUND }
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))).map((r) => r.memberId)
  if (!mayChangeProject(viewer, team)) return { error: ASSIGN_RULE }
  const shut = completedBlock(p.stage, 'schedule'); if (shut) return { error: shut }
  return { p }
}
async function forRow(id: string, viewer: Viewer): Promise<{ p: Project; row: Row; vendorName: string } | Refusal> {
  const [hit] = await db.select({ row: projectContractors, vendorName: vendors.name }).from(projectContractors).innerJoin(vendors, eq(vendors.id, projectContractors.vendorId)).where(eq(projectContractors.id, id)).limit(1)
  if (!hit) return { error: GONE }
  const g = await forProject(hit.row.projectId, viewer)
  if ('error' in g) return g
  return { p: g.p, row: hit.row, vendorName: hit.vendorName }
}
async function milestoneOf(projectId: string, id: string | null) {
  if (!id) return null
  const [m] = await db.select().from(projectMilestones).where(and(eq(projectMilestones.id, id), eq(projectMilestones.projectId, projectId), isNull(projectMilestones.deletedAt))).limit(1)
  return m ?? null
}
const msLite = (m: typeof projectMilestones.$inferSelect | null) => (m ? { start: dayOfStored(m.startDate), end: dayOfStored(m.endDate) } : null)
const windowText = (r: Pick<Row, 'milestoneId' | 'startDate' | 'endDate'>, m: typeof projectMilestones.$inferSelect | null) =>
  windowWords(windowOf({ milestoneId: r.milestoneId, ownStart: r.startDate ? dayOfStored(r.startDate) : null, ownEnd: r.endDate ? dayOfStored(r.endDate) : null }, msLite(m)))
function touch(p: Pick<Project, 'id' | 'leadId'>) {
  revalidatePath('/projects', 'layout')
  revalidatePath(`/projects/${p.id}/schedule`)
  revalidatePath('/company/finance/vendors')
  revalidateLead(p.leadId)
}
const ev = (p: Project) => ({ name: p.name, number: p.number })
/** What a row was, as its Undo puts it back (stored on the change's own line). */
const beforeOf = (r: Row) => ({ status: r.status, milestoneId: r.milestoneId, start: r.startDate ? dayOfStored(r.startDate) : null, end: r.endDate ? dayOfStored(r.endDate) : null, note: r.note, checkedBy: r.checkedBy, checkedAt: r.checkedAt ? r.checkedAt.getTime() : null })

export type AssignInput = { projectId: string; vendorId: string; trade: string; milestoneId?: string | null; startDay?: number | null; endDay?: number | null; status?: CrewStatus; note?: string | null }

/** Put a contractor on the project for a trade — on a milestone, or on dates of its own. */
export async function assignContractor(i: AssignInput): Promise<{ id: string; eventId: string; sentence: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!seesContractors(viewer.role)) return { error: ROLE_RULE }
  const g = await forProject(i.projectId, viewer); if ('error' in g) return g
  const [v] = await db.select().from(vendors).where(eq(vendors.id, i.vendorId)).limit(1)
  if (!v || v.mergedInto) return { error: 'This contractor is not in Finance › Vendors any more' }
  if (!v.isContractor) return { error: `${v.name} isn’t marked as a contractor — mark it in Finance › Vendors` }
  if (!v.isActive) return { error: `${v.name} is deactivated in Finance › Vendors` }
  const trade = clean(i.trade, 60)
  if (!trade) return { error: 'Pick the trade they are there for' }
  const c = contractorOf(v)
  if (!doesTrade(c, trade)) return { error: `${shortVendor(v.name)} doesn’t do ${trade} — add it to their trades in Finance › Vendors` }
  const milestoneId = typeof i.milestoneId === 'string' && i.milestoneId ? i.milestoneId : null
  const m = await milestoneOf(g.p.id, milestoneId)
  if (milestoneId && !m) return { error: 'That milestone is not on the schedule any more' }
  let start: number | null = null, end: number | null = null
  if (!m) {
    start = day(i.startDay); end = day(i.endDay)
    if (start === null || end === null) return { error: 'Choose both days — when they start and when they finish' }
    if (end < start) return { error: 'The last day can’t be before the first' }
  }
  const status: CrewStatus = isCrewStatus(i.status) ? i.status : 'planned'
  const note = clean(i.note, CREW_NOTE_MAX) || null
  const twins = await db.select().from(projectContractors).where(and(eq(projectContractors.projectId, g.p.id), eq(projectContractors.vendorId, v.id), isNull(projectContractors.removedAt)))
  if (twins.some((t) => t.trade.toLowerCase() === trade.toLowerCase() && (t.milestoneId ?? null) === milestoneId)) return { error: `${shortVendor(v.name)} is on ${m ? m.title : 'the project'} for ${trade} already` }
  const id = randomUUID(), now = new Date()
  await db.insert(projectContractors).values({
    id, projectId: g.p.id, vendorId: v.id, trade, milestoneId, startDate: start !== null ? dateOfDay(start) : null, endDate: end !== null ? dateOfDay(end) : null,
    status, note, createdBy: viewer.id, createdAt: now, updatedBy: viewer.id, updatedAt: now,
  })
  const row = { milestoneId, startDate: start !== null ? dateOfDay(start) : null, endDate: end !== null ? dateOfDay(end) : null }
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_contractor_assigned', { ...ev(g.p), id, vendor: shortVendor(v.name), trade, ...(m ? { title: m.title } : {}), to: windowText(row, m), status }, { actorId: viewer.id })
  touch(g.p)
  return { id, eventId, sentence: `${shortVendor(v.name)} is on ${m ? m.title : 'the project'} for ${trade}` }
}

export type CrewPatch = { status?: CrewStatus; milestoneId?: string | null; startDay?: number | null; endDay?: number | null; note?: string | null }

/** Change a row: its status, its milestone or own dates, its note. One sentence; its Undo puts back what it was. */
export async function updateCrew(id: string, patch: CrewPatch): Promise<{ ok: true; eventId: string | null; sentence: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!seesContractors(viewer.role)) return { error: ROLE_RULE }
  const g = await forRow(id, viewer); if ('error' in g) return g
  if (g.row.removedAt) return { error: GONE }
  const { p, row } = g
  const name = shortVendor(g.vendorName)
  const put: Partial<Row> = {}
  let kind: 'project_contractor_status' | 'project_contractor_moved' | null = null
  let words = ''
  const was = await milestoneOf(p.id, row.milestoneId)
  if (patch.status !== undefined) {
    if (!isCrewStatus(patch.status)) return { error: 'Pick Planned, On site or Done' }
    if (was?.status === 'done' && patch.status !== 'done') return { error: `${was.title} is done — reopen it on the schedule to change its crew` }
    if (patch.status !== row.status) { put.status = patch.status; kind = 'project_contractor_status'; words = `${name} is ${CREW_STATUS_LABEL[patch.status].toLowerCase()}${patch.status === 'done' ? ` with ${row.trade}` : ` for ${row.trade}`}` }
  }
  if (patch.milestoneId !== undefined || patch.startDay !== undefined || patch.endDay !== undefined) {
    const milestoneId = patch.milestoneId === undefined ? row.milestoneId : (typeof patch.milestoneId === 'string' && patch.milestoneId ? patch.milestoneId : null)
    const m = await milestoneOf(p.id, milestoneId)
    if (milestoneId && !m) return { error: 'That milestone is not on the schedule any more' }
    let start: number | null = null, end: number | null = null
    if (!m) {
      start = day(patch.startDay === undefined ? (row.startDate ? dayOfStored(row.startDate) : null) : patch.startDay)
      end = day(patch.endDay === undefined ? (row.endDate ? dayOfStored(row.endDate) : null) : patch.endDay)
      if (start === null || end === null) return { error: 'Choose both days — when they start and when they finish' }
      if (end < start) return { error: 'The last day can’t be before the first' }
    }
    const next = { milestoneId, startDate: start !== null ? dateOfDay(start) : null, endDate: end !== null ? dateOfDay(end) : null }
    const moved = next.milestoneId !== row.milestoneId || (next.startDate?.getTime() ?? null) !== (row.startDate?.getTime() ?? null) || (next.endDate?.getTime() ?? null) !== (row.endDate?.getTime() ?? null)
    if (moved) {
      const twins = await db.select().from(projectContractors).where(and(eq(projectContractors.projectId, p.id), eq(projectContractors.vendorId, row.vendorId), isNull(projectContractors.removedAt)))
      if (twins.some((t) => t.id !== row.id && t.trade.toLowerCase() === row.trade.toLowerCase() && (t.milestoneId ?? null) === milestoneId)) return { error: `${name} is on ${m ? m.title : 'the project'} for ${row.trade} already` }
      Object.assign(put, next)
      if (!kind) { kind = 'project_contractor_moved'; words = `${name} is on ${m ? m.title : windowText(next, null)} now` }
    }
  }
  if (patch.note !== undefined) { const n = clean(patch.note, CREW_NOTE_MAX) || null; if (n !== row.note) { put.note = n; if (!words) words = `The note on ${name} is saved` } }
  if (!Object.keys(put).length) return { ok: true, eventId: null, sentence: 'Nothing changed' }
  await db.update(projectContractors).set({ ...put, updatedBy: viewer.id, updatedAt: new Date() }).where(eq(projectContractors.id, row.id))
  let eventId: string | null = null
  if (kind) {
    const after = await milestoneOf(p.id, (put.milestoneId !== undefined ? put.milestoneId : row.milestoneId) ?? null)
    const nextRow = { milestoneId: put.milestoneId !== undefined ? put.milestoneId : row.milestoneId, startDate: put.startDate !== undefined ? put.startDate : row.startDate, endDate: put.endDate !== undefined ? put.endDate : row.endDate }
    eventId = await logProjectEvent(db, p.leadId, p.id, kind, {
      ...ev(p), id: row.id, vendor: name, trade: row.trade, ...(after ? { title: after.title } : {}), before: beforeOf(row),
      ...(kind === 'project_contractor_status' ? { from: CREW_STATUS_LABEL[isCrewStatus(row.status) ? row.status : 'planned'], to: CREW_STATUS_LABEL[put.status as CrewStatus] } : { from: windowText(row, was), to: windowText(nextRow, after) }),
    }, { actorId: viewer.id })
  }
  touch(p)
  return { ok: true, eventId, sentence: words }
}

/** Leader checked: stamp the row with who and when — or take the stamp off. */
export async function setCrewChecked(id: string, checked: boolean): Promise<{ ok: true; eventId: string; sentence: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!seesContractors(viewer.role)) return { error: ROLE_RULE }
  if (!checksCrew(viewer.role)) return { error: CHECK_RULE }
  const g = await forRow(id, viewer); if ('error' in g) return g
  if (g.row.removedAt) return { error: GONE }
  const name = shortVendor(g.vendorName)
  if (!!g.row.checkedAt === checked) return { error: checked ? `${name}’s ${g.row.trade} work is checked already` : `${name}’s ${g.row.trade} work isn’t checked` }
  await db.update(projectContractors).set({ checkedBy: checked ? viewer.id : null, checkedAt: checked ? new Date() : null, updatedBy: viewer.id, updatedAt: new Date() }).where(eq(projectContractors.id, id))
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, checked ? 'project_contractor_checked' : 'project_contractor_unchecked', { ...ev(g.p), id, vendor: name, trade: g.row.trade, before: beforeOf(g.row) }, { actorId: viewer.id })
  touch(g.p)
  return { ok: true, eventId, sentence: checked ? `${name}’s ${g.row.trade} work is Leader checked` : `The check on ${name}’s ${g.row.trade} work is taken off` }
}

/** Take a contractor off the project (kept, so Undo brings them back). */
export async function removeCrew(id: string): Promise<{ ok: true; eventId: string; sentence: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!seesContractors(viewer.role)) return { error: ROLE_RULE }
  const g = await forRow(id, viewer); if ('error' in g) return g
  if (g.row.removedAt) return { error: GONE }
  const m = await milestoneOf(g.p.id, g.row.milestoneId)
  await db.update(projectContractors).set({ removedAt: new Date(), removedBy: viewer.id, updatedBy: viewer.id, updatedAt: new Date() }).where(eq(projectContractors.id, id))
  const name = shortVendor(g.vendorName)
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_contractor_removed', { ...ev(g.p), id, vendor: name, trade: g.row.trade, ...(m ? { title: m.title } : {}) }, { actorId: viewer.id })
  touch(g.p)
  return { ok: true, eventId, sentence: `${name} is off ${m ? m.title : 'the project'}` }
}

/** The Undo of any of the above: what the change's own line says it was goes back, and the line goes with it. */
export async function undoCrew(eventId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!seesContractors(viewer.role)) return { error: ROLE_RULE }
  const [e] = await db.select().from(leadEvents).where(eq(leadEvents.id, eventId)).limit(1)
  if (!e || !e.kind.startsWith('project_contractor_')) return { error: 'This can’t be undone any more' }
  const d = (e.detail ?? {}) as { id?: string; before?: Record<string, string | number | null> }
  if (!d.id) return { error: 'This can’t be undone any more' }
  if ((e.kind === 'project_contractor_checked' || e.kind === 'project_contractor_unchecked') && !checksCrew(viewer.role)) return { error: CHECK_RULE }
  const g = await forRow(d.id, viewer); if ('error' in g) return g
  const b = d.before ?? {}
  const asDay = (x: unknown) => (typeof x === 'number' ? dateOfDay(x) : null)
  if (e.kind === 'project_contractor_assigned') {
    /* an add taken back leaves nothing: the row, and every line it had (a status changed in the seconds before the Undo) */
    const lines = await db.select({ id: leadEvents.id, detail: leadEvents.detail }).from(leadEvents).where(and(eq(leadEvents.leadId, g.p.leadId), like(leadEvents.kind, 'project_contractor_%')))
    for (const l of lines) if ((l.detail as { id?: string } | null)?.id === g.row.id && l.id !== eventId) await db.delete(leadEvents).where(eq(leadEvents.id, l.id))
    await db.delete(projectContractors).where(eq(projectContractors.id, g.row.id))
  } else if (e.kind === 'project_contractor_removed') {
    await db.update(projectContractors).set({ removedAt: null, removedBy: null, updatedBy: viewer.id, updatedAt: new Date() }).where(eq(projectContractors.id, g.row.id))
  } else if (e.kind === 'project_contractor_checked' || e.kind === 'project_contractor_unchecked') {
    await db.update(projectContractors).set({ checkedBy: typeof b.checkedBy === 'string' ? b.checkedBy : null, checkedAt: typeof b.checkedAt === 'number' ? new Date(b.checkedAt) : null, updatedBy: viewer.id, updatedAt: new Date() }).where(eq(projectContractors.id, g.row.id))
  } else {
    await db.update(projectContractors).set({
      status: isCrewStatus(b.status) ? b.status : g.row.status, milestoneId: typeof b.milestoneId === 'string' ? b.milestoneId : null, startDate: asDay(b.start), endDate: asDay(b.end),
      updatedBy: viewer.id, updatedAt: new Date(),
    }).where(eq(projectContractors.id, g.row.id))
  }
  await db.delete(leadEvents).where(eq(leadEvents.id, eventId))
  touch(g.p)
  return { ok: true }
}
