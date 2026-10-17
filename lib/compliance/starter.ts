import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadTasks, leads, taskAssignees } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { notify } from '@/lib/notifications/emit'
import { logProjectEvent } from '@/lib/projects/events'
import { complianceKindOf, KIND_LABEL, starterItems } from './model'
import { fetchStarterTasksOn } from './queries'

/**
 * (gaps build I, I-Q11 — 1.0's F-090 · F-290, its faults F-298…F-300 fixed) A new project's compliance tasks: when Settings › Projects ›
 * Compliance says so (on by default), up to ten tasks from the checklist items the list flags for a task, for the project's kind of home, in
 * the list's order — each titled with the item's own words, tied to its item, given to the project's team (who hear it through the usual *Task
 * assigned* bell). Once per project: a project that already has them gets none again. Returns how many were made.
 */
export async function addComplianceTasks(projectId: string, leadId: string, o: { at?: Date; notify?: boolean; force?: boolean; /** (S44R) who raised them when no member pressed */ by?: string } = {}): Promise<number> {
  if (!o.force && !(await fetchStarterTasksOn())) return 0
  const [lead] = await db.select({ name: leads.name, propertyType: leads.propertyType }).from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead) return 0
  const kind = complianceKindOf(lead.propertyType)
  const items = starterItems(kind)
  if (!kind || !items.length) return 0
  const have = await db.select({ id: leadTasks.id }).from(leadTasks).where(and(eq(leadTasks.leadId, leadId), isNotNull(leadTasks.complianceItem))).limit(1)
  if (have.length) return 0
  const team = (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))).map((r) => r.id)
  const at = o.at ?? new Date()
  const rows = items.map((it, i) => ({ id: randomUUID(), item: it, at: new Date(at.getTime() + (i + 1) * 1000) }))   // just after the project, a second apart (the column keeps seconds): the list’s order kept
  const by = o.by ?? await sessionMemberId()   // (pending modules S43A) who raised them — read before the transaction · (S44R) or the signature's member
  await db.transaction(async (tx) => {
    await tx.insert(leadTasks).values(rows.map((r) => ({
      id: r.id, leadId, title: r.item.title, kind: 'General', dueAt: null, done: false, createdAt: r.at, creatorId: by,
      description: r.item.about, seenAt: null, updatedAt: r.at, complianceItem: r.item.id,
    })))
    if (team.length) await tx.insert(taskAssignees).values(rows.flatMap((r) => team.map((memberId) => ({ taskId: r.id, memberId }))))
  })
  await logProjectEvent(db, leadId, projectId, 'project_compliance_tasks', { n: rows.length, name: ({ hdb: 'an HDB flat', condo: 'a condo', landed: 'a landed home' } as const)[kind] }, { actorId: null, at })
  if (o.notify !== false && team.length) await notify('task_assigned', team, { title: `${rows.length} compliance tasks for ${lead.name}`, body: `${KIND_LABEL[kind]} · ${rows[0]!.item.title} and more`, href: `/projects/${projectId}/compliance`, leadId })
  return rows.length
}
