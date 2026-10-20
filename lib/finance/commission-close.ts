import 'server-only'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { commissionRules, leadAssignees, leadTasks, members, projects, taskAssignees } from '@/lib/db/schema'
import { notify } from '@/lib/notifications/emit'
import { ruleRecord } from './books'
import { inForce, ruleFor } from './commission'

/**
 * (parity map, FB-055 — 1.0 D-301, `projects/records/[id]/closure/route.ts`) When a project is completed and nothing decides its commission,
 * every Owner gets ONE task "Set commission for {project}" — on the project (the lead's Tasks, which the project's Tasks shows), assigned to each
 * Owner, due today, with a bell row that opens the project's Commission dialog (`/projects/{id}?commission=1`, ProjectCommissionDialog).
 *
 * "Nothing decides it" (his ask: think better than 1.0, which nudged even when the studio's rule already paid): the studio's rule pays no
 * commission (none set, or *No commission*), the project has no rule of its own (a project's rate, its *No commission* — an explicit choice —,
 * or a member's rate on it), and nobody on its team has a rate of their own that applies today. A studio that pays commission by default never
 * gets the task: its rule applies, as it always did. Idempotent — an open task with the same title on the project is left as it is; a re-opened
 * and re-completed project raises none twice. Best effort: the caller's completion never fails because of it (errors are swallowed here).
 *
 * Called by P-E's handover (`app/projects/ending-actions.ts`) once a handover completes. Not a server action — nothing outside the server reaches it.
 */
export async function afterProjectCompleted(projectId: string, actorId: string | null): Promise<{ taskId: string } | null> {
  try {
    const [p] = await db.select({ id: projects.id, name: projects.name, number: projects.number, leadId: projects.leadId })
      .from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
    if (!p) return null
    const now = new Date()
    const rules = (await db.select().from(commissionRules).where(isNull(commissionRules.endedAt))).map(ruleRecord)
    /* the studio's rule pays — it applies, nothing to decide */
    const studio = rules.filter((r) => !r.memberId && !r.projectId && inForce(r, now.getTime())).sort((a, b) => b.fromDay - a.fromDay || b.createdAt - a.createdAt)[0]
    if (studio && studio.basis !== 'none') return null
    /* the project already has a rule naming it (a rate, an explicit No commission, a member's rate on it) — decided */
    if (rules.some((r) => r.projectId === p.id)) return null
    /* someone on the team earns by their own rate — commission flows */
    const team = (await db.select({ m: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))).map((t) => t.m)
    if (team.some((m) => { const r = ruleFor(rules, m, p.id, now.getTime()); return !!r && r.basis !== 'none' })) return null
    const title = `Set commission for ${p.name}`
    const [open] = await db.select({ id: leadTasks.id }).from(leadTasks).where(and(eq(leadTasks.leadId, p.leadId), eq(leadTasks.title, title), eq(leadTasks.done, false))).limit(1)
    if (open) return null
    const owners = (await db.select({ id: members.id }).from(members).where(and(eq(members.role, 'Owner'), eq(members.isActive, true)))).map((m) => m.id)
    if (!owners.length) return null
    const id = randomUUID()
    const due = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0)
    /* (invented copy) the task says why it is there and where the choice is made */
    const description = `${p.name} (${p.number}) is completed and nobody earns commission on it — the studio’s rule is No commission and the project has no rate. Set a rate for this project, or keep No commission, from the project’s ⋮ › Commission.`
    await db.transaction(async (tx) => {
      await tx.insert(leadTasks).values({ id, leadId: p.leadId, title, kind: 'General', dueAt: due, done: false, createdAt: now, creatorId: actorId, description, seenAt: null, updatedAt: now })
      await tx.insert(taskAssignees).values(owners.map((memberId) => ({ taskId: id, memberId })))
    })
    await notify('task_assigned', owners, { title: `New task: ${title}`, body: `On ${p.name}`, href: `/projects/${p.id}?commission=1`, leadId: p.leadId, actorId: actorId ?? null })
    revalidatePath('/tasks')
    revalidatePath(`/projects/${p.id}`, 'layout')
    return { taskId: id }
  } catch {
    return null   // best effort: a completion never fails because its commission reminder could not be written
  }
}
