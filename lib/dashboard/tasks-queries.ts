import 'server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadTasks, taskAssignees, type LeadTask } from '@/lib/db/schema'

/** The viewer's open tasks — the rail badge's rule (`countOverdueTasks`): assigned to them, not done, on a lead they see or the studio's own.
    (S42 audit A-16) The app shell's ghost seed reads it too. */
export async function myOpenTasks(viewerId: string, seen: Set<string> | null): Promise<LeadTask[]> {
  const rows = await db.select({ t: leadTasks }).from(leadTasks).innerJoin(taskAssignees, eq(taskAssignees.taskId, leadTasks.id))
    .where(and(eq(leadTasks.done, false), eq(taskAssignees.memberId, viewerId)))
  const out = rows.map((r) => r.t).filter((t) => !t.leadId || !seen || seen.has(t.leadId))
  /* soonest first, undated last */
  return out.sort((a, b) => (a.dueAt ? a.dueAt.getTime() : Infinity) - (b.dueAt ? b.dueAt.getTime() : Infinity) || a.createdAt.getTime() - b.createdAt.getTime())
}
