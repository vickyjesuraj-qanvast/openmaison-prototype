import 'server-only'
import { countPendingTemplates } from '@/lib/templates/queries'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { isOverdue } from '@/lib/format'
import { leadFiles, leadTasks, members, tags, taskAssignees, taskAttachments, taskComments, taskTags, taskTemplates, templateTasks, type LeadFile, type LeadTask, type Member, type Tag, type TaskComment, type TaskTemplate, leads } from '@/lib/db/schema'

/* Lead Details › Tasks (902-36216) — one loader for the tab; joins resolved in memory (a lead has a handful of tasks). */

/** A task's lead as the rail's Tasks page names it (REG-466); null = a studio task. */
export type TaskLead = { id: string; name: string; stage: string }
export type TaskRow = LeadTask & {
  lead: TaskLead | null
  assignees: Member[]
  tags: Tag[]
  creator: Member | null
  comments: (TaskComment & { author: Member | null })[]
  attachments: LeadFile[]
}
export type TemplateRow = TaskTemplate & { tasks: { id: string; title: string; description: string | null; kind: string }[] }
export type LeadTasksData = {
  tasks: TaskRow[]
  tags: Tag[]
  files: LeadFile[]
  templates: TemplateRow[]
  team: Member[]
  now: number
}
export type StudioTasksData = LeadTasksData & { leads: TaskLead[] }

/**
 * One loader for both surfaces (REG-466): a lead's Tasks tab (`{ leadId }`) and the rail's Tasks page (`'studio'` — every
 * lead's tasks plus the studio's own, the ones with no lead). Each row carries its lead (id · name · stage) for the page's
 * Lead column; the file library is the lead's, or every lead's for the studio page (attachments resolve through it).
 */
async function loadTasks(scope: { leadId: string } | 'studio'): Promise<LeadTasksData & { leads: TaskLead[] }> {
  const leadId = scope === 'studio' ? null : scope.leadId
  const [rows, team, allTags, files, tpls, leadRows] = await Promise.all([
    (leadId ? db.select().from(leadTasks).where(eq(leadTasks.leadId, leadId)) : db.select().from(leadTasks)).orderBy(asc(leadTasks.createdAt)),
    db.select().from(members),
    db.select().from(tags).orderBy(asc(tags.createdAt)),
    db.select().from(leadFiles).where(leadId ? and(eq(leadFiles.leadId, leadId), isNull(leadFiles.deletedAt)) : isNull(leadFiles.deletedAt)).orderBy(asc(leadFiles.createdAt)),   // trashed files leave the library (Files tab)
    db.select().from(taskTemplates).where(isNull(taskTemplates.deletedAt)).orderBy(asc(taskTemplates.createdAt)),   // (REG-538) deleted templates leave the chooser
    db.select({ id: leads.id, name: leads.name, stage: leads.stage }).from(leads).where(leadId ? eq(leads.id, leadId) : isNull(leads.deletedAt)).orderBy(asc(leads.name)),
  ])
  const ids = rows.map((t) => t.id)
  const [links, tagLinks, comments, attachments, tplTasks] = ids.length
    ? await Promise.all([
        db.select().from(taskAssignees).where(inArray(taskAssignees.taskId, ids)),
        db.select().from(taskTags).where(inArray(taskTags.taskId, ids)),
        db.select().from(taskComments).where(inArray(taskComments.taskId, ids)).orderBy(asc(taskComments.createdAt)),
        db.select().from(taskAttachments).where(inArray(taskAttachments.taskId, ids)).orderBy(asc(taskAttachments.createdAt)),
        db.select().from(templateTasks).orderBy(asc(templateTasks.sortOrder)),
      ])
    : [[], [], [], [], await db.select().from(templateTasks).orderBy(asc(templateTasks.sortOrder))]
  const byMember = new Map(team.map((m) => [m.id, m]))
  const byTag = new Map(allTags.map((t) => [t.id, t]))
  const byFile = new Map(files.map((f) => [f.id, f]))
  const byLead = new Map(leadRows.map((l) => [l.id, l]))
  const tasks: TaskRow[] = rows.map((t) => ({
    ...t,
    lead: t.leadId ? byLead.get(t.leadId) ?? null : null,
    assignees: links.filter((l) => l.taskId === t.id).map((l) => byMember.get(l.memberId)).filter((m): m is Member => !!m),
    tags: tagLinks.filter((l) => l.taskId === t.id).map((l) => byTag.get(l.tagId)).filter((g): g is Tag => !!g),
    creator: t.creatorId ? byMember.get(t.creatorId) ?? null : null,
    comments: comments.filter((c) => c.taskId === t.id).map((c) => ({ ...c, author: byMember.get(c.authorId) ?? null })),
    attachments: attachments.filter((a) => a.taskId === t.id).map((a) => byFile.get(a.fileId)).filter((f): f is LeadFile => !!f),
  }))
  // Newest first, as the listing mock reads (the new task sits on top).
  tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const templates: TemplateRow[] = tpls.map((tp) => ({ ...tp, tasks: tplTasks.filter((x) => x.templateId === tp.id).map((x) => ({ id: x.id, title: x.title, description: x.description, kind: x.kind })) }))
  return { tasks, tags: allTags, files, templates, team, now: Date.now(), leads: leadRows }
}

export async function fetchLeadTasks(leadId: string): Promise<LeadTasksData> {
  return loadTasks({ leadId })
}

/** The rail's Tasks page (REG-466): every lead's tasks and the studio's own, with the live leads for the Lead picker and filter. */
export async function fetchStudioTasks(): Promise<StudioTasksData> {
  return loadTasks('studio')
}

/** The rail badge (REG-466): open tasks whose due date has passed, studio-wide. */
export async function countOverdueTasks(): Promise<number> {
  const rows = await db.select({ dueAt: leadTasks.dueAt }).from(leadTasks).where(and(eq(leadTasks.done, false), isNotNull(leadTasks.dueAt)))
  const now = Date.now()
  return rows.filter((r) => isOverdue(r.dueAt, now)).length
}

/** What the rail draws on its items (REG-466): the Tasks item's overdue count, keyed by href; nothing when there is nothing to say. */
export async function railBadges(): Promise<Record<string, number>> {
  const [overdue, pending] = await Promise.all([countOverdueTasks(), countPendingTemplates()])   // (REG-501) Company: templates awaiting approval
  return { ...(overdue > 0 ? { '/tasks': overdue } : {}), ...(pending > 0 ? { '/company': pending } : {}) }
}
