import 'server-only'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadTasks, projectCompliance, projects } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { logProjectEvent } from '@/lib/projects/events'
import { itemById } from './model'

/**
 * (gaps build I, I-Q11 — 1.0's F-300: the task and the item never met) A starter task ticked or reopened anywhere — the Tasks tab, a milestone's
 * panel, the bulk bar, the listing's popover — answers its compliance item: ticked → Done (unless the team said Not needed), reopened → To do
 * again (only when it was Done). It reads each task as it now stands, so it only ever brings the two into step; the task's own action ran its
 * rule first. Server-only — called by the tasks' actions after they write, never by a page.
 */
export async function syncComplianceFromTasks(taskIds: readonly string[]): Promise<void> {
  const ids = taskIds.filter((x): x is string => typeof x === 'string')
  if (!ids.length) return
  const rows = await db.select({ leadId: leadTasks.leadId, item: leadTasks.complianceItem, done: leadTasks.done }).from(leadTasks).where(and(inArray(leadTasks.id, ids), isNotNull(leadTasks.complianceItem)))
  if (!rows.length) return
  const me = await sessionMemberId()
  for (const r of rows) {
    if (!r.leadId || !r.item) continue
    const [p] = await db.select({ id: projects.id, name: projects.name, number: projects.number }).from(projects).where(and(eq(projects.leadId, r.leadId), isNull(projects.deletedAt))).limit(1)
    const item = itemById(r.item)
    if (!p || !item) continue
    const [was] = await db.select({ state: projectCompliance.state }).from(projectCompliance).where(and(eq(projectCompliance.projectId, p.id), eq(projectCompliance.itemId, item.id))).limit(1)
    if (r.done && !was) {
      await db.insert(projectCompliance).values({ id: randomUUID(), projectId: p.id, itemId: item.id, state: 'done', by: me, at: new Date() }).onConflictDoNothing()
      await logProjectEvent(db, r.leadId, p.id, 'project_compliance_done', { item: item.id, title: item.title, name: p.name, number: p.number })
    } else if (!r.done && was?.state === 'done') {
      await db.delete(projectCompliance).where(and(eq(projectCompliance.projectId, p.id), eq(projectCompliance.itemId, item.id)))
      await logProjectEvent(db, r.leadId, p.id, 'project_compliance_reopened', { item: item.id, title: item.title, name: p.name, number: p.number })
    } else continue
    revalidatePath(`/projects/${p.id}/compliance`)
  }
}
