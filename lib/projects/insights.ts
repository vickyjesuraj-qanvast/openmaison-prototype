import 'server-only'
import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leads, members, projectInvoices, projectPayments, projects } from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { dayOf } from './schedule-model'
import { milestonesOf } from './schedule'
import { seesStudioMoney } from './policy'
import { capacityOf, seesWorkload } from './workload'
import { fetchDefaultCapacity } from './workload-queries'
import type { ProjectFacts, Team } from './insights-model'

/**
 * (gaps build I, I-Q6 · I-Q7) Projects › Insights' facts — per project the viewer may see (Who sees leads, the lead's rule); a Manager's are
 * their team's projects (themselves and the Designers who report to them). Money (the invoices' collection) only for Owners and Admins.
 * Null for a Designer: the page shows the gate. The report itself is pure (lib/projects/insights-model.ts).
 */
export type ProjectInsightsData = { facts: ProjectFacts[]; team: Team[]; now: number; today: number; withMoney: boolean; scope: 'studio' | 'team' }

export async function fetchProjectInsights(): Promise<ProjectInsightsData | null> {
  const viewer = await fetchViewer()
  if (!seesWorkload(viewer.role)) return null
  const [rows, visible, people, studioDefault] = await Promise.all([
    db.select({ id: projects.id, name: projects.name, number: projects.number, stage: projects.stage, leadId: projects.leadId, startedAt: projects.startedAt, completedAt: projects.completedAt })
      .from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNull(projects.deletedAt), isNull(leads.deletedAt))).orderBy(asc(projects.createdAt)),
    visibleLeadIds(viewer),
    db.select().from(members),
    fetchDefaultCapacity(),
  ])
  const seen = rows.filter((r) => !visible || visible.has(r.leadId))
  const links = seen.length ? await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, seen.map((r) => r.leadId))) : []
  const mine = new Set([viewer.id, ...viewer.teamIds])
  const team = (r: { leadId: string }) => links.filter((l) => l.leadId === r.leadId).map((l) => l.memberId)
  const scoped = viewer.role === 'Manager' ? seen.filter((r) => team(r).some((id) => mine.has(id))) : seen
  const ids = scoped.map((r) => r.id)
  const withMoney = seesStudioMoney(viewer)
  const [ms, invs] = await Promise.all([
    milestonesOf(ids),
    withMoney && ids.length ? db.select({ id: projectInvoices.id, projectId: projectInvoices.projectId, amountMinor: projectInvoices.amountMinor, sentAt: projectInvoices.sentAt })
      .from(projectInvoices).where(and(inArray(projectInvoices.projectId, ids), eq(projectInvoices.status, 'sent'), isNotNull(projectInvoices.sentAt))) : Promise.resolve([]),
  ])
  const pays = invs.length ? await db.select({ invoiceId: projectPayments.invoiceId, amountMinor: projectPayments.amountMinor, paidOn: projectPayments.paidOn })
    .from(projectPayments).where(and(inArray(projectPayments.invoiceId, invs.map((i) => i.id)), eq(projectPayments.status, 'confirmed'))).orderBy(asc(projectPayments.paidOn)) : []
  /** The day an invoice's confirmed payments first covered it — paid in full; null while anything is owed. */
  const paidAt = (i: (typeof invs)[number]) => {
    let sum = 0
    for (const p of pays) if (p.invoiceId === i.id) { sum += p.amountMinor; if (i.amountMinor > 0 && sum >= i.amountMinor) return p.paidOn.getTime() }
    return null
  }
  const facts: ProjectFacts[] = scoped.map((r) => ({
    id: r.id, name: r.name, number: r.number, stage: r.stage, teamIds: team(r),
    startedAt: r.startedAt?.getTime() ?? null, completedAt: r.stage === 'completed' ? r.completedAt?.getTime() ?? null : null,
    milestones: (ms.get(r.id) ?? []).map((m) => ({ end: m.end, doneAt: m.status === 'done' ? m.doneAt ?? m.end : null })),
    invoices: invs.filter((i) => i.projectId === r.id).map((i) => ({ sentAt: i.sentAt!.getTime(), paidAt: paidAt(i) })),
  }))
  const shown = people.filter((p) => p.isActive !== false && (viewer.role !== 'Manager' || mine.has(p.id)))
  const now = Date.now()
  return {
    facts, now, today: dayOf(new Date(now)), withMoney, scope: viewer.role === 'Manager' ? 'team' : 'studio',
    team: shown.map((p) => ({ id: p.id, name: p.name, role: p.role, color: p.color, capacity: capacityOf(p, studioDefault) })),
  }
}
