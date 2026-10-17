import 'server-only'
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadTasks, leads, members, projectCompliance, projects, settings } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { mayChangeProject } from '@/lib/projects/policy'
import { runsStudio } from '@/lib/leads/assign-policy'
import { complianceKindOf, itemsFor, KIND_LABEL, phaseOfStage, tallyOf, type ComplianceAnswer, type ComplianceItem, type ComplianceKind, type CompliancePhase, type ComplianceTask } from './model'
import { REGISTRATIONS_KEY, parseStudioStates, type StudioActionState } from './studio-actions'
import { REGISTRATION_NOTES_KEY, parseRegistrationNotes, type RegistrationNote } from './notes'   // (parity map, TD-110)

/* (gaps build I) What the Compliance tab, the Navigator and the tab's count read — Who sees leads first, on every read. */

export type ComplianceData = {
  projectId: string
  leadId: string
  propertyType: string
  kind: ComplianceKind | null
  kindLabel: string | null
  /** The phase the project is in — the tab opens on it. */
  phase: CompliancePhase
  items: ComplianceItem[]
  answers: Record<string, ComplianceAnswer>
  /** Each item's starter task, when it has one. */
  tasks: Record<string, ComplianceTask>
  mayChange: boolean
  /** The settings switch, so the empty tab can say whether starter tasks are made. */
  starterTasks: boolean
}

/** Settings › Projects › Compliance — make the starter tasks with a new project (on by default, as 1.0 always did). */
export const STARTER_TASKS_KEY = 'compliance_starter_tasks'
export async function fetchStarterTasksOn(): Promise<boolean> {
  const [r] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, STARTER_TASKS_KEY)).limit(1)
  if (!r) return true
  try { return JSON.parse(r.value) !== false } catch { return true }
}

export async function answersOf(projectIds: string[]): Promise<Map<string, Record<string, ComplianceAnswer>>> {
  const out = new Map<string, Record<string, ComplianceAnswer>>()
  if (!projectIds.length) return out
  const rows = await db.select().from(projectCompliance).where(inArray(projectCompliance.projectId, projectIds))
  const names = new Map((await db.select({ id: members.id, name: members.name }).from(members)).map((m) => [m.id, m.name]))
  for (const r of rows) {
    if (r.state !== 'done' && r.state !== 'not_needed') continue
    const m = out.get(r.projectId) ?? {}
    m[r.itemId] = { state: r.state, by: r.by ? names.get(r.by) ?? null : null, at: r.at.getTime() }
    out.set(r.projectId, m)
  }
  return out
}

export async function fetchProjectCompliance(projectId: string): Promise<ComplianceData | null> {
  const viewer = await fetchViewer()
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt), isNull(leads.deletedAt))).limit(1)
  if (!row) return null
  const { p, l } = row
  if (!(await canOpenLead(viewer, l.id))) return null
  const kind = complianceKindOf(l.propertyType)
  const [team, answers, taskRows, starterTasks] = await Promise.all([
    db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, l.id)),
    answersOf([p.id]),
    db.select({ id: leadTasks.id, done: leadTasks.done, item: leadTasks.complianceItem }).from(leadTasks).where(and(eq(leadTasks.leadId, l.id), isNotNull(leadTasks.complianceItem))),
    fetchStarterTasksOn(),
  ])
  const tasks: Record<string, ComplianceTask> = {}
  for (const t of taskRows) if (t.item && !tasks[t.item]) tasks[t.item] = { id: t.id, done: t.done }
  return {
    projectId: p.id, leadId: l.id, propertyType: l.propertyType, kind, kindLabel: kind ? KIND_LABEL[kind] : null, phase: phaseOfStage(p.stage),
    items: itemsFor(kind), answers: answers.get(p.id) ?? {}, tasks,
    mayChange: mayChangeProject(viewer, team.map((t) => t.memberId)), starterTasks,
  }
}

/** The tab's count for each project: the mandatory items still to do in the phase the project is in (0 with no list). */
export async function complianceCountsOf(list: { id: string; stage: string; propertyType: string }[]): Promise<Map<string, number>> {
  const answers = await answersOf(list.map((x) => x.id))
  return new Map(list.map((x) => {
    const phase = phaseOfStage(x.stage)
    const items = itemsFor(complianceKindOf(x.propertyType)).filter((i) => i.phase === phase)
    return [x.id, tallyOf(items, answers.get(x.id) ?? {}).mandatoryOpen]
  }))
}

/* ── The studio's registrations (I-Q12 → one-home N-07): one record, set on Company › Profile; the Navigator and the signing pages read it ── */

export const STUDIO_COMPLIANCE_KEY = REGISTRATIONS_KEY
export { parseStudioStates, type StudioActionState }
/** A registration as the pages show it: done or not, and who recorded it, when. */
export type RegistrationState = StudioActionState & { byName: string | null }
export type NavigatorData = {
  states: Record<string, RegistrationState>
  /** (parity map, TD-110) each registration's note — who wrote it last, when */
  notes: Record<string, RegistrationNote & { byName: string | null }>
  legalName: string
  uen: string
  mayChange: boolean
}
export async function fetchStudioStates(): Promise<Record<string, StudioActionState>> {
  const [r] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, STUDIO_COMPLIANCE_KEY)).limit(1)
  return parseStudioStates(r?.value)
}
/** (one-home N-07) The record with each recorder's name — Company › Profile's Registrations card and the Navigator read the same. */
export async function fetchRegistrations(): Promise<Record<string, RegistrationState>> {
  const [states, names] = await Promise.all([fetchStudioStates(), db.select({ id: members.id, name: members.name }).from(members)])
  const byId = new Map(names.map((m) => [m.id, m.name]))
  return Object.fromEntries(Object.entries(states).map(([k, s]) => [k, { ...s, byName: s.by ? byId.get(s.by) ?? null : null }]))
}
/** (parity map, TD-110) The registrations' notes, each with its writer's name. */
export async function fetchRegistrationNotes(): Promise<Record<string, RegistrationNote & { byName: string | null }>> {
  const [[r], names] = await Promise.all([db.select({ value: settings.value }).from(settings).where(eq(settings.key, REGISTRATION_NOTES_KEY)).limit(1), db.select({ id: members.id, name: members.name }).from(members)])
  const byId = new Map(names.map((m) => [m.id, m.name]))
  return Object.fromEntries(Object.entries(parseRegistrationNotes(r?.value)).map(([k, n]) => [k, { ...n, byName: n.by ? byId.get(n.by) ?? null : null }]))
}
export async function fetchNavigator(): Promise<NavigatorData> {
  const [viewer, states, notes, { fetchBrand }] = await Promise.all([fetchViewer(), fetchRegistrations(), fetchRegistrationNotes(), import('@/lib/templates/queries')])
  const brand = await fetchBrand()
  const first = brand.details.entities[0]
  return {
    states, notes,
    legalName: first?.name || brand.details.name || '', uen: brand.details.uen ?? '',
    mayChange: runsStudio(viewer.role),
  }
}
