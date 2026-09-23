'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadTasks, tags, taskAssignees, taskAttachments, taskComments, taskTags, taskTemplates, templateTasks } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { TASK_KINDS } from '@/lib/leads/enums'
import { revalidateEveryLead, revalidateLead } from '@/lib/leads/queries'

/* Lead Details › Tasks (902-36216). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

/** (REG-286) One shared eviction for every detail tab — the hand-listed paths here never named Activity. */
/* (REG-466) A studio task has no lead; either way the rail's Tasks page and its badge are refreshed. */
const touch = (leadId: string | null) => { if (leadId) revalidateLead(leadId); revalidatePath('/tasks'); revalidatePath('/', 'layout') }
const ME = SESSION_MEMBER_ID   // (REG-286) the signed-in member, defined once in lib/db/session.ts

/** (REG-286) `kind` lands in a column the table, the drawer and the filters all read back — the guard REG-285 put on updateTask. */
const kindOf = (kind: string | undefined): string =>
  typeof kind === 'string' && (TASK_KINDS as readonly string[]).includes(kind) ? kind : 'General'

export async function createTask(leadId: string | null, title: string, opts?: { description?: string | null; kind?: string; dueAt?: Date | null; assignees?: string[]; tagIds?: string[] }): Promise<string> {
  const id = randomUUID(); const now = new Date()
  // A task lands UNSEEN (seenAt null): that is what makes it the first row whatever the sort, and what draws the
  // mock's RW-New treatment on it — the primary band + bold title of 902:26362 frame 191. It stops being new the
  // moment someone opens it. Stamping it seen on creation put a brand-new task at the BOTTOM of a due-date sort
  // (user 2026-08-30: "the new added task should be the first row always").
  // (REG-286) One transaction: a task without the assignees and tags it was created with is a different task.
  await db.transaction(async (tx) => {
    await tx.insert(leadTasks).values({ id, leadId, title, kind: kindOf(opts?.kind), dueAt: opts?.dueAt ?? null, done: false, createdAt: now, creatorId: ME, description: opts?.description ?? null, seenAt: null, updatedAt: now })
    if (opts?.assignees?.length) await tx.insert(taskAssignees).values(opts.assignees.map((memberId) => ({ taskId: id, memberId })))
    if (opts?.tagIds?.length) await tx.insert(taskTags).values(opts.tagIds.map((tagId) => ({ taskId: id, tagId })))
  })
  touch(leadId); return id
}

export async function updateTask(taskId: string, patch: { title?: string; description?: string | null; dueAt?: Date | null; done?: boolean; kind?: string }): Promise<void> {
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, taskId))
  if (!t) return
  /* The patch is built column by column, never spread (REG-285). A server action is a public endpoint and its
     TypeScript parameter type is not a runtime guarantee: Drizzle's update builder walks the TABLE's columns and
     writes any key that matches one, so a spread `{...patch}` also exposed leadId, creatorId, seenAt and
     createdAt — a request could move a task to another lead or rewrite its authorship. Each field is copied only
     when it has the right runtime type; anything else is ignored. */
  const set: Partial<typeof leadTasks.$inferInsert> = { updatedAt: new Date() }
  if (typeof patch.title === 'string') set.title = patch.title
  if (typeof patch.description === 'string' || patch.description === null) set.description = patch.description
  if (patch.dueAt instanceof Date || patch.dueAt === null) set.dueAt = patch.dueAt
  if (typeof patch.done === 'boolean') set.done = patch.done
  if (typeof patch.kind === 'string' && (TASK_KINDS as readonly string[]).includes(patch.kind)) set.kind = patch.kind
  await db.update(leadTasks).set(set).where(eq(leadTasks.id, taskId))
  touch(t.leadId)
}

export async function markTaskSeen(taskId: string): Promise<void> {
  const [t] = await db.select({ leadId: leadTasks.leadId, seenAt: leadTasks.seenAt }).from(leadTasks).where(eq(leadTasks.id, taskId))
  if (!t || t.seenAt) return
  await db.update(leadTasks).set({ seenAt: new Date() }).where(eq(leadTasks.id, taskId))
  touch(t.leadId)
}

export async function setTaskAssignees(taskId: string, memberIds: string[]): Promise<void> {
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, taskId))
  if (!t) return
  // (REG-286) Delete-then-reinsert is a replacement, not two edits: unwrapped, a failure between them leaves the
  // task with NO assignees — the rows the user meant to keep are already gone.
  await db.transaction(async (tx) => {
    await tx.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId))
    if (memberIds.length) await tx.insert(taskAssignees).values(memberIds.map((memberId) => ({ taskId, memberId })))
    await tx.update(leadTasks).set({ updatedAt: new Date() }).where(eq(leadTasks.id, taskId))
  })
  touch(t.leadId)
}

export async function setTaskTags(taskId: string, tagIds: string[]): Promise<void> {
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, taskId))
  if (!t) return
  await db.transaction(async (tx) => {   // (REG-286) same replacement shape as setTaskAssignees
    await tx.delete(taskTags).where(eq(taskTags.taskId, taskId))
    if (tagIds.length) await tx.insert(taskTags).values(tagIds.map((tagId) => ({ taskId, tagId })))
  })
  touch(t.leadId)
}

/** Duplicate keeps title, description, kind, due date, assignees and tags — not comments or attachments (as the template rule says). */
export async function duplicateTasks(taskIds: string[]): Promise<void> {
  if (!taskIds.length) return
  const rows = await db.select().from(leadTasks).where(inArray(leadTasks.id, taskIds))
  const links = await db.select().from(taskAssignees).where(inArray(taskAssignees.taskId, taskIds))
  const tagLinks = await db.select().from(taskTags).where(inArray(taskTags.taskId, taskIds))
  const now = new Date()
  // (REG-286) One transaction for the whole bulk copy: a partial run left some copies with their assignees and
  // tags and others bare, with no way to tell which the user got.
  await db.transaction(async (tx) => {
    for (const r of rows) {
      const id = randomUUID()
      await tx.insert(leadTasks).values({ id, leadId: r.leadId, title: r.title, kind: r.kind, dueAt: r.dueAt, done: false, createdAt: now, creatorId: ME, description: r.description, seenAt: null, updatedAt: now })
      const a = links.filter((l) => l.taskId === r.id); if (a.length) await tx.insert(taskAssignees).values(a.map((l) => ({ taskId: id, memberId: l.memberId })))
      const g = tagLinks.filter((l) => l.taskId === r.id); if (g.length) await tx.insert(taskTags).values(g.map((l) => ({ taskId: id, tagId: l.tagId })))
    }
  })
  touch(rows[0]?.leadId ?? null)   /* (REG-466) a studio task has no lead — the rail page still refreshes */
}

export async function deleteTasks(taskIds: string[]): Promise<void> {
  if (!taskIds.length) return
  const rows = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(inArray(leadTasks.id, taskIds))
  await db.delete(leadTasks).where(inArray(leadTasks.id, taskIds))
  touch(rows[0]?.leadId ?? null)   /* (REG-466) a studio task has no lead — the rail page still refreshes */
}

/* ── tags (Manage Tags 902:27709) — studio-level, so no single lead to name ── */
export async function createTag(name: string): Promise<string> {
  const id = randomUUID()
  await db.insert(tags).values({ id, name: name.trim(), createdAt: new Date() })
  revalidateEveryLead(); return id
}
export async function renameTag(tagId: string, name: string): Promise<void> {
  await db.update(tags).set({ name: name.trim() }).where(eq(tags.id, tagId)); revalidateEveryLead()
}
export async function deleteTag(tagId: string): Promise<void> {
  await db.delete(tags).where(eq(tags.id, tagId)); revalidateEveryLead()
}

/* ── comments (902:28517) ── */
export async function addComment(taskId: string, body: string): Promise<void> {
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, taskId))
  if (!t || !body.trim()) return
  const now = new Date()
  await db.insert(taskComments).values({ id: randomUUID(), taskId, authorId: ME, body: body.trim(), createdAt: now, updatedAt: now })
  touch(t.leadId)
}
export async function editComment(commentId: string, body: string): Promise<void> {
  const [c] = await db.select().from(taskComments).where(eq(taskComments.id, commentId))
  if (!c || !body.trim()) return
  await db.update(taskComments).set({ body: body.trim(), updatedAt: new Date() }).where(eq(taskComments.id, commentId))
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, c.taskId)); if (t) touch(t.leadId ?? null)
}
export async function deleteComment(commentId: string): Promise<void> {
  const [c] = await db.select().from(taskComments).where(eq(taskComments.id, commentId))
  if (!c) return
  await db.delete(taskComments).where(eq(taskComments.id, commentId))
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, c.taskId)); if (t) touch(t.leadId ?? null)
}

/* ── attachments (Attach files 902:28220) — files come from the lead's library (`lead_files`) ── */
export async function attachFiles(taskId: string, fileIds: string[]): Promise<void> {
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, taskId))
  if (!t || !fileIds.length) return
  const existing = await db.select().from(taskAttachments).where(eq(taskAttachments.taskId, taskId))
  const fresh = fileIds.filter((f) => !existing.some((e) => e.fileId === f))
  if (fresh.length) await db.insert(taskAttachments).values(fresh.map((fileId) => ({ taskId, fileId, createdAt: new Date() })))
  touch(t.leadId)
}
export async function detachFile(taskId: string, fileId: string): Promise<void> {
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, taskId))
  if (!t) return
  await db.delete(taskAttachments).where(and(eq(taskAttachments.taskId, taskId), eq(taskAttachments.fileId, fileId)))
  touch(t.leadId)
}

/* ── templates (902:29198 · 902:29220; REG-538: the library keeps members, tags and due offsets) ── */
const idsJson = (list: string[]) => JSON.stringify([...new Set(list)])
const parseIds = (json: string | null): string[] => { if (!json) return []; try { const v = JSON.parse(json) as unknown; return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } }
export async function saveTemplate(input: { taskIds: string[]; name?: string; templateId?: string; keepMembers: boolean; keepDescription: boolean }): Promise<string> {
  const rows = await db.select().from(leadTasks).where(inArray(leadTasks.id, input.taskIds))
  const [links, tagLinks] = rows.length ? await Promise.all([db.select().from(taskAssignees).where(inArray(taskAssignees.taskId, rows.map((r) => r.id))), db.select().from(taskTags).where(inArray(taskTags.taskId, rows.map((r) => r.id)))]) : [[], []]
  const id = input.templateId ?? randomUUID()
  const now = new Date()
  // (REG-286) The template header and the tasks under it are one record: a failure between them published an empty
  // template ("Untitled template", no rows) that "Use Template" then applied as nothing.
  await db.transaction(async (tx) => {
    if (!input.templateId) {
      await tx.insert(taskTemplates).values({ id, name: (input.name ?? 'Untitled template').trim(), keepMembers: input.keepMembers, keepDescription: input.keepDescription, createdAt: now, createdBy: ME, updatedAt: now })
    } else {
      await tx.update(taskTemplates).set({ keepMembers: input.keepMembers, keepDescription: input.keepDescription, updatedAt: now }).where(eq(taskTemplates.id, id))
    }
    const existing = await tx.select().from(templateTasks).where(eq(templateTasks.templateId, id))
    // (REG-538) A step keeps its members (when the switch says so), its tags, and its due date as days from now — "Team Members" is no longer a promise.
    if (rows.length) await tx.insert(templateTasks).values(rows.map((r, i) => ({
      id: randomUUID(), templateId: id, title: r.title, description: input.keepDescription ? r.description : null, kind: r.kind, sortOrder: existing.length + i,
      memberIds: idsJson(input.keepMembers ? links.filter((l) => l.taskId === r.id).map((l) => l.memberId) : []), tagIds: idsJson(tagLinks.filter((l) => l.taskId === r.id).map((l) => l.tagId)),
      dueDays: r.dueAt ? Math.max(0, Math.round((r.dueAt.getTime() - now.getTime()) / 86_400_000)) : null,
    })))
  })
  revalidateEveryLead(); revalidatePath('/company/templates/tasks'); return id
}
/** "Use Template": the template's steps land on the lead as new open tasks — with their members (when the template keeps them), tags and due dates (REG-538). */
export async function applyTemplate(leadId: string | null, templateId: string): Promise<number> {
  const [tpl] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, templateId))
  if (!tpl || tpl.deletedAt) throw new Error('template not found')
  const rows = await db.select().from(templateTasks).where(eq(templateTasks.templateId, templateId)).orderBy(templateTasks.sortOrder)
  const now = new Date()
  // (REG-286) All the template's tasks or none: a half-applied template is a checklist with steps missing, and the
  // count the snackbar reports ("n tasks added") is then a lie.
  await db.transaction(async (tx) => {
    for (const r of rows) {
      const taskId = randomUUID()
      await tx.insert(leadTasks).values({ id: taskId, leadId, title: r.title, kind: r.kind, dueAt: r.dueDays === null ? null : new Date(now.getTime() + r.dueDays * 86_400_000), done: false, createdAt: now, creatorId: ME, description: tpl.keepDescription ? r.description : null, seenAt: null, updatedAt: now, templateId })
      const memberIds = tpl.keepMembers ? parseIds(r.memberIds) : []
      if (memberIds.length) await tx.insert(taskAssignees).values(memberIds.map((memberId) => ({ taskId, memberId })))
      const tagIds = parseIds(r.tagIds)
      if (tagIds.length) await tx.insert(taskTags).values(tagIds.map((tagId) => ({ taskId, tagId })))
    }
  })
  touch(leadId); revalidatePath('/company/templates/tasks'); return rows.length
}
