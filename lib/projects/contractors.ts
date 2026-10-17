import 'server-only'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leads, members, projectContractors, projectMilestones, projects, vendors } from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { fetchTrades } from '@/lib/settings/queries'
import { holdOf } from './hold'
import { mayChangeProject } from './policy'
import { dayOfStored } from './schedule-model'
import { checksCrew, isCrewStatus, jobOf, parseCrewTrades, seesContractors, staffedTrades, startWords, unstaffedOf, type Contractor, type CrewRow, type Site } from './contractors-model'

/**
 * (S45B · H-UHD-2) The contractors' records as every screen reads them — the studio's contractors (Finance › Vendors), every crew row on a
 * project that is not deleted, and the projects as sites. One read, the same for the project's Schedule, the Workload view and a vendor's
 * panel. Who sees a project is its lead's rule: a site the viewer doesn't see keeps its contractor busy but says neither its name nor its
 * client ("another project") — its milestones' names never leave the server.
 */
export type CrewBoardData = {
  contractors: Contractor[]
  crew: CrewRow[]
  sites: Site[]
  /** The studio's trades (Settings › Quotes & pricing › Trades) — the Assign dialog's list and the vendor's. */
  trades: string[]
  now: number
  viewer: { id: string; role: string; sees: boolean; checks: boolean }
}

export const contractorOf = (v: typeof vendors.$inferSelect): Contractor => ({
  id: v.id, name: v.name, trades: parseCrewTrades(v.tradesJson ?? (v.trade ? JSON.stringify([v.trade]) : null)), capacity: Math.max(1, v.crewCapacity ?? 1), code: v.code ?? null, phone: v.phone ?? null, isActive: !!v.isActive && !v.mergedInto,
})

export async function fetchCrewBoard(viewer?: Viewer): Promise<CrewBoardData> {
  const me = viewer ?? (await fetchViewer())
  const now = Date.now()
  const [vs, rows, ps, team, links, trades, seen] = await Promise.all([
    db.select().from(vendors).where(and(eq(vendors.isContractor, true), isNull(vendors.mergedInto))).orderBy(asc(vendors.name)),
    db.select({ r: projectContractors, vendorName: vendors.name }).from(projectContractors).innerJoin(vendors, eq(vendors.id, projectContractors.vendorId))
      .innerJoin(projects, eq(projects.id, projectContractors.projectId)).where(and(isNull(projectContractors.removedAt), isNull(projects.deletedAt))),
    db.select({ p: projects, client: leads.name }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNull(projects.deletedAt), isNull(leads.deletedAt))),
    db.select({ id: members.id, name: members.name }).from(members),
    db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees),
    fetchTrades(),
    visibleLeadIds(me),
  ])
  const ids = ps.map((x) => x.p.id)
  const ms = ids.length ? await db.select().from(projectMilestones).where(and(inArray(projectMilestones.projectId, ids), isNull(projectMilestones.deletedAt))).orderBy(asc(projectMilestones.position)) : []
  const nameOf = new Map(team.map((m) => [m.id, m.name]))
  const teamOf = new Map<string, string[]>()
  for (const l of links) teamOf.set(l.leadId, [...(teamOf.get(l.leadId) ?? []), l.memberId])
  const sites: Site[] = ps.map(({ p, client }) => {
    const visible = !seen || seen.has(p.leadId)
    return {
      id: p.id, name: visible ? p.name : 'Another project', number: visible ? p.number : '', client: visible ? client.split(/\s+/)[0] ?? client : 'another client', stage: p.stage,
      onHold: !!holdOf(p), visible, mayAssign: visible && p.stage !== 'completed' && mayChangeProject(me, teamOf.get(p.leadId) ?? []),
      milestones: ms.filter((m) => m.projectId === p.id).map((m) => ({ id: m.id, title: visible ? m.title : 'A milestone', start: dayOfStored(m.startDate), end: dayOfStored(m.endDate), status: m.status })),
    }
  })
  const crew: CrewRow[] = rows.map(({ r, vendorName }) => crewRowOf(r, vendorName, nameOf))
  return {
    contractors: vs.map(contractorOf), crew, sites, trades: trades.trades, now,
    viewer: { id: me.id, role: me.role, sees: seesContractors(me.role), checks: checksCrew(me.role) },
  }
}

export function crewRowOf(r: typeof projectContractors.$inferSelect, vendorName: string, nameOf: ReadonlyMap<string, string>): CrewRow {
  return {
    id: r.id, projectId: r.projectId, vendorId: r.vendorId, vendorName, trade: r.trade, milestoneId: r.milestoneId,
    ownStart: r.startDate ? dayOfStored(r.startDate) : null, ownEnd: r.endDate ? dayOfStored(r.endDate) : null,
    status: isCrewStatus(r.status) ? r.status : 'planned', note: r.note,
    checkedBy: r.checkedBy, checkedByName: r.checkedBy ? nameOf.get(r.checkedBy) ?? null : null, checkedAt: r.checkedAt ? r.checkedAt.getTime() : null,
  }
}

/** What the Projects listing hands its Workload view — nothing for a viewer who doesn't see contractors (Accounting, Marketing). */
export async function contractorsFor(viewer: Viewer): Promise<{ contractors?: CrewBoardData }> {
  if (!seesContractors(viewer.role)) return {}
  return { contractors: await fetchCrewBoard(viewer) }
}

/** (S45B) A project's gaps for its Needs you: work starting this week (or under way) of a trade the studio's contractors do, with nobody of it on
    it — the same rule the Schedule and the Workload view read. Empty when the studio keeps no contractor. */
export async function crewGapsOf(projectId: string, milestones: { id: string; title: string; start: number; end: number; status: string }[], today: number): Promise<{ milestoneId: string; title: string; trade: string; start: number; when: string }[]> {
  const vs = await db.select().from(vendors).where(and(eq(vendors.isContractor, true), eq(vendors.isActive, true), isNull(vendors.mergedInto)))
  if (!vs.length || !milestones.length) return []
  const [rows, trades] = await Promise.all([
    db.select({ r: projectContractors, vendorName: vendors.name }).from(projectContractors).innerJoin(vendors, eq(vendors.id, projectContractors.vendorId))
      .where(and(eq(projectContractors.projectId, projectId), isNull(projectContractors.removedAt))),
    fetchTrades(),
  ])
  const site: Site = { id: projectId, name: '', number: '', client: '', stage: 'in_progress', onHold: false, visible: true, mayAssign: true, milestones: milestones.map((m) => ({ id: m.id, title: m.title, start: m.start, end: m.end, status: m.status })) }
  const bySite = new Map([[projectId, site]])
  const jobs = rows.map(({ r, vendorName }) => jobOf(crewRowOf(r, vendorName, new Map()), bySite, today))
  return unstaffedOf([site], jobs, staffedTrades(vs.map(contractorOf), trades.trades), today)
    .map((g) => ({ milestoneId: g.milestone.id, title: g.milestone.title, trade: g.trade, start: g.milestone.start, when: `It ${startWords(g, today)}` }))
}
