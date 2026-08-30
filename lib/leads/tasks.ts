import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  leadFiles, leadTasks, members, tags, taskAssignees, taskAttachments, taskComments, taskTags, taskTemplates, templateTasks,
  type LeadFile, type LeadTask, type Member, type Tag, type TaskComment, type TaskTemplate,
} from '@/lib/db/schema'

/* Lead Details › Tasks (902-36216) — one loader for the tab; joins resolved in memory (a lead has a handful of tasks). */

export type TaskRow = LeadTask & {
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

export async function fetchLeadTasks(leadId: string): Promise<LeadTasksData> {
  const [rows, team, allTags, files, tpls] = await Promise.all([
    db.select().from(leadTasks).where(eq(leadTasks.leadId, leadId)).orderBy(asc(leadTasks.createdAt)),
    db.select().from(members),
    db.select().from(tags).orderBy(asc(tags.createdAt)),
    db.select().from(leadFiles).where(and(eq(leadFiles.leadId, leadId), isNull(leadFiles.deletedAt))).orderBy(asc(leadFiles.createdAt)),   // trashed files leave the library (Files tab)
    db.select().from(taskTemplates).orderBy(asc(taskTemplates.createdAt)),
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
  const tasks: TaskRow[] = rows.map((t) => ({
    ...t,
    assignees: links.filter((l) => l.taskId === t.id).map((l) => byMember.get(l.memberId)).filter((m): m is Member => !!m),
    tags: tagLinks.filter((l) => l.taskId === t.id).map((l) => byTag.get(l.tagId)).filter((g): g is Tag => !!g),
    creator: t.creatorId ? byMember.get(t.creatorId) ?? null : null,
    comments: comments.filter((c) => c.taskId === t.id).map((c) => ({ ...c, author: byMember.get(c.authorId) ?? null })),
    attachments: attachments.filter((a) => a.taskId === t.id).map((a) => byFile.get(a.fileId)).filter((f): f is LeadFile => !!f),
  }))
  // Newest first, as the listing mock reads (the new task sits on top).
  tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const templates: TemplateRow[] = tpls.map((tp) => ({ ...tp, tasks: tplTasks.filter((x) => x.templateId === tp.id).map((x) => ({ id: x.id, title: x.title, description: x.description, kind: x.kind })) }))
  return { tasks, tags: allTags, files, templates, team, now: Date.now() }
}
