'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadEvents, leadTasks, leads, projectCompliance, projects, settings } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { revalidateLead } from '@/lib/leads/queries'
import { logProjectEvent } from '@/lib/projects/events'
import { CHANGE_RULE, mayChangeProject } from '@/lib/projects/policy'
import { SETTINGS_RULE } from '@/lib/projects/handover-model'
import { complianceKindOf, isComplianceState, itemById, itemsFor, stateSentence, type ComplianceState } from '@/lib/compliance/model'
import { STARTER_TASKS_KEY, STUDIO_COMPLIANCE_KEY, fetchStudioStates, type StudioActionState } from '@/lib/compliance/queries'
import { STUDIO_ACTIONS } from '@/lib/compliance/studio-actions'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (gaps build I, I-Q10 · I-Q11 · I-Q12) Compliance's server actions. Who sees a project's checklist is its lead's rule (`canOpenLead`); who answers
 * an item is whoever may change the project (`mayChangeProject`). An item's answer and its starter task stay in step: Done or Not needed closes the
 * task, To do opens it again. Every change hands back its Undo. A refusal answers `{ error }`.
 */
type Refusal = { error: string }
const NOT_FOUND = 'This project is not there any more'
const NO_ITEM = 'That item is not on this project’s checklist'

async function forProject(projectId: string) {
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, typeof projectId === 'string' ? projectId : ''), isNull(projects.deletedAt), isNull(leads.deletedAt))).limit(1)
  if (!row) return { error: NOT_FOUND } as Refusal
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, row.l.id))) return { error: NOT_FOUND } as Refusal
  const team = (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, row.l.id))).map((r) => r.id)
  if (!mayChangeProject(viewer, team)) return { error: CHANGE_RULE } as Refusal
  return { p: row.p, l: row.l }
}
function touch(projectId: string, leadId: string) {
  revalidatePath(`/projects/${projectId}/compliance`)
  revalidatePath(`/projects/${projectId}/tasks`)
  revalidatePath(`/projects/${projectId}`)
  revalidateLead(leadId)
}

/** What an answer changed, for its Undo: the item's row as it was, its task's done as it was, and the line it wrote. */
export type ComplianceUndo = { projectId: string; itemId: string; before: { state: string; by: string | null; at: number } | null; task: { id: string; done: boolean } | null; eventId: string | null }

/** The item's starter task follows its answer — answered closes it, To do opens it again. */
async function syncTask(leadId: string, itemId: string, state: ComplianceState): Promise<{ id: string; done: boolean } | null> {
  const [t] = await db.select({ id: leadTasks.id, done: leadTasks.done }).from(leadTasks).where(and(eq(leadTasks.leadId, leadId), eq(leadTasks.complianceItem, itemId))).limit(1)
  if (!t) return null
  const want = state !== 'todo'
  if (t.done !== want) await db.update(leadTasks).set({ done: want, updatedAt: new Date() }).where(eq(leadTasks.id, t.id))
  return { id: t.id, done: t.done }
}

/** Answer one item: Done, Not needed, or back to To do. */
export async function setComplianceItem(projectId: string, itemId: string, state: ComplianceState): Promise<{ sentence: string; undo: ComplianceUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  if (!isComplianceState(state)) return { error: 'Pick Done, Not needed or To do' }
  const g = await forProject(projectId)
  if ('error' in g) return g
  const item = itemById(typeof itemId === 'string' ? itemId : '')
  if (!item || !itemsFor(complianceKindOf(g.l.propertyType)).some((i) => i.id === item.id)) return { error: NO_ITEM }
  const [was] = await db.select().from(projectCompliance).where(and(eq(projectCompliance.projectId, g.p.id), eq(projectCompliance.itemId, item.id))).limit(1)
  const before = was ? { state: was.state, by: was.by, at: was.at.getTime() } : null
  if ((was?.state ?? 'todo') === state) return { error: `It is ${state === 'todo' ? 'to do' : state === 'done' ? 'done' : 'not needed'} already` }
  const now = new Date()
  const me = await sessionMemberId()
  if (state === 'todo') await db.delete(projectCompliance).where(and(eq(projectCompliance.projectId, g.p.id), eq(projectCompliance.itemId, item.id)))
  else await db.insert(projectCompliance).values({ id: randomUUID(), projectId: g.p.id, itemId: item.id, state, by: me, at: now })
    .onConflictDoUpdate({ target: [projectCompliance.projectId, projectCompliance.itemId], set: { state, by: me, at: now } })
  const task = await syncTask(g.l.id, item.id, state)
  const eventId = await logProjectEvent(db, g.l.id, g.p.id, state === 'done' ? 'project_compliance_done' : state === 'not_needed' ? 'project_compliance_not_needed' : 'project_compliance_reopened', { item: item.id, title: item.title, name: g.p.name, number: g.p.number })
  touch(g.p.id, g.l.id)
  return { sentence: stateSentence(item.title, state), undo: { projectId: g.p.id, itemId: item.id, before, task, eventId } }
}

/** The answer's Undo: the item as it was, its task as it was, and the line gone from Activity. */
export async function undoComplianceItem(u: ComplianceUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forProject(u?.projectId)
  if ('error' in g) return g
  const item = itemById(typeof u.itemId === 'string' ? u.itemId : '')
  if (!item) return { error: NO_ITEM }
  const b = u.before
  if (!b || (b.state !== 'done' && b.state !== 'not_needed')) await db.delete(projectCompliance).where(and(eq(projectCompliance.projectId, g.p.id), eq(projectCompliance.itemId, item.id)))
  else {
    const at = new Date(typeof b.at === 'number' ? b.at : Date.now())
    const by = typeof b.by === 'string' ? b.by : null
    await db.insert(projectCompliance).values({ id: randomUUID(), projectId: g.p.id, itemId: item.id, state: b.state, by, at })
      .onConflictDoUpdate({ target: [projectCompliance.projectId, projectCompliance.itemId], set: { state: b.state, by, at } })
  }
  if (u.task && typeof u.task.id === 'string') await db.update(leadTasks).set({ done: !!u.task.done, updatedAt: new Date() }).where(and(eq(leadTasks.id, u.task.id), eq(leadTasks.leadId, g.l.id)))
  if (typeof u.eventId === 'string') await db.delete(leadEvents).where(and(eq(leadEvents.id, u.eventId), eq(leadEvents.projectId, g.p.id)))
  touch(g.p.id, g.l.id)
  return { ok: true }
}

/* ── Settings › Projects › Compliance (I-Q11) ── */

async function putSetting(key: string, value: unknown) {
  const v = JSON.stringify(value)
  await db.insert(settings).values({ key, value: v, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value: v, updatedAt: new Date() } })
}
export async function setStarterTasks(input: { on: boolean }): Promise<{ on: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: SETTINGS_RULE }
  const on = input?.on !== false
  await putSetting(STARTER_TASKS_KEY, on)
  revalidatePath('/settings')
  return { on }
}

/* ── The studio's registrations (I-Q12 → one-home N-07) ──
   One record (settings `compliance_studio`), recorded on Company › Profile › Registrations & accreditations; the Compliance Navigator and the
   signing pages (CaseTrust's disclosure) read it. Owners and Admins change it, with Undo. */
function touchRegistrations() {
  revalidatePath('/company/profile')
  revalidatePath('/compliance')
  revalidatePath('/sign', 'layout')   // CaseTrust: the signing pages' disclosure follows the record
}

export async function setStudioAction(actionId: string, done: boolean): Promise<{ before: StudioActionState | null; state: StudioActionState } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: 'Only Owners and Admins mark the studio’s own compliance' }
  const a = STUDIO_ACTIONS.find((x) => x.id === actionId)
  if (!a) return { error: 'That step is not on the list any more' }
  const all = await fetchStudioStates()
  const before = all[a.id] ?? null
  const state: StudioActionState = { done: !!done, by: viewer.id, at: Date.now() }
  await putSetting(STUDIO_COMPLIANCE_KEY, { ...all, [a.id]: state })
  touchRegistrations()
  return { before, state }
}
export async function undoStudioAction(actionId: string, before: StudioActionState | null): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: 'Only Owners and Admins mark the studio’s own compliance' }
  const a = STUDIO_ACTIONS.find((x) => x.id === actionId)
  if (!a) return { error: 'That step is not on the list any more' }
  const all = await fetchStudioStates()
  const next = { ...all }
  if (before && typeof before.done === 'boolean' && typeof before.at === 'number') next[a.id] = { done: before.done, by: typeof before.by === 'string' ? before.by : null, at: before.at }
  else delete next[a.id]
  await putSetting(STUDIO_COMPLIANCE_KEY, next)
  touchRegistrations()
  return { ok: true }
}
