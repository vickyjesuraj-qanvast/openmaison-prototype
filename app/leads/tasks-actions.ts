'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadTasks, tags, taskAssignees, taskAttachments, taskComments, taskTags, taskTemplates, templateTasks } from '@/lib/db/schema'

/* Lead Details › Tasks (902-36216). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

const touch = (leadId: string) => { revalidatePath(`/leads/${leadId}`); revalidatePath(`/leads/${leadId}/tasks`); revalidatePath('/leads') }
const ME = 'dane'   // the signed-in member (members.is_you) — the prototype has one user

export async function createTask(leadId: string, title: string, opts?: { description?: string | null; kind?: string; dueAt?: Date | null; assignees?: string[]; tagIds?: string[] }): Promise<string> {
  const id = randomUUID(); const now = new Date()
  await db.insert(leadTasks).values({ id, leadId, title, kind: opts?.kind ?? 'General', dueAt: opts?.dueAt ?? null, done: false, createdAt: now, creatorId: ME, description: opts?.description ?? null, seenAt: now, updatedAt: now })
  if (opts?.assignees?.length) await db.insert(taskAssignees).values(opts.assignees.map((memberId) => ({ taskId: id, memberId })))
  if (opts?.tagIds?.length) await db.insert(taskTags).values(opts.tagIds.map((tagId) => ({ taskId: id, tagId })))
  touch(leadId); return id
}

export async function updateTask(taskId: string, patch: { title?: string; description?: string | null; dueAt?: Date | null; done?: boolean; kind?: string }): Promise<void> {
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, taskId))
  if (!t) return
  await db.update(leadTasks).set({ ...patch, updatedAt: new Date() }).where(eq(leadTasks.id, taskId))
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
  await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId))
  if (memberIds.length) await db.insert(taskAssignees).values(memberIds.map((memberId) => ({ taskId, memberId })))
  await db.update(leadTasks).set({ updatedAt: new Date() }).where(eq(leadTasks.id, taskId))
  touch(t.leadId)
}

export async function setTaskTags(taskId: string, tagIds: string[]): Promise<void> {
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, taskId))
  if (!t) return
  await db.delete(taskTags).where(eq(taskTags.taskId, taskId))
  if (tagIds.length) await db.insert(taskTags).values(tagIds.map((tagId) => ({ taskId, tagId })))
  touch(t.leadId)
}

/** Duplicate keeps title, description, kind, due date, assignees and tags — not comments or attachments (as the template rule says). */
export async function duplicateTasks(taskIds: string[]): Promise<void> {
  if (!taskIds.length) return
  const rows = await db.select().from(leadTasks).where(inArray(leadTasks.id, taskIds))
  const links = await db.select().from(taskAssignees).where(inArray(taskAssignees.taskId, taskIds))
  const tagLinks = await db.select().from(taskTags).where(inArray(taskTags.taskId, taskIds))
  const now = new Date()
  for (const r of rows) {
    const id = randomUUID()
    await db.insert(leadTasks).values({ id, leadId: r.leadId, title: r.title, kind: r.kind, dueAt: r.dueAt, done: false, createdAt: now, creatorId: ME, description: r.description, seenAt: now, updatedAt: now })
    const a = links.filter((l) => l.taskId === r.id); if (a.length) await db.insert(taskAssignees).values(a.map((l) => ({ taskId: id, memberId: l.memberId })))
    const g = tagLinks.filter((l) => l.taskId === r.id); if (g.length) await db.insert(taskTags).values(g.map((l) => ({ taskId: id, tagId: l.tagId })))
  }
  const leadId = rows[0]?.leadId; if (leadId) touch(leadId)
}

export async function deleteTasks(taskIds: string[]): Promise<void> {
  if (!taskIds.length) return
  const rows = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(inArray(leadTasks.id, taskIds))
  await db.delete(leadTasks).where(inArray(leadTasks.id, taskIds))
  const leadId = rows[0]?.leadId; if (leadId) touch(leadId)
}

/* ── tags (Manage Tags 902:27709) ── */
export async function createTag(name: string): Promise<string> {
  const id = randomUUID()
  await db.insert(tags).values({ id, name: name.trim(), createdAt: new Date() })
  revalidatePath('/leads'); return id
}
export async function renameTag(tagId: string, name: string): Promise<void> {
  await db.update(tags).set({ name: name.trim() }).where(eq(tags.id, tagId)); revalidatePath('/leads')
}
export async function deleteTag(tagId: string): Promise<void> {
  await db.delete(tags).where(eq(tags.id, tagId)); revalidatePath('/leads')
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
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, c.taskId)); if (t) touch(t.leadId)
}
export async function deleteComment(commentId: string): Promise<void> {
  const [c] = await db.select().from(taskComments).where(eq(taskComments.id, commentId))
  if (!c) return
  await db.delete(taskComments).where(eq(taskComments.id, commentId))
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, c.taskId)); if (t) touch(t.leadId)
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

/* ── templates (902:29198 · 902:29220) ── */
export async function saveTemplate(input: { taskIds: string[]; name?: string; templateId?: string; keepMembers: boolean; keepDescription: boolean }): Promise<string> {
  const rows = await db.select().from(leadTasks).where(inArray(leadTasks.id, input.taskIds))
  let id = input.templateId
  if (!id) {
    id = randomUUID()
    await db.insert(taskTemplates).values({ id, name: (input.name ?? 'Untitled template').trim(), keepMembers: input.keepMembers, keepDescription: input.keepDescription, createdAt: new Date() })
  } else {
    await db.update(taskTemplates).set({ keepMembers: input.keepMembers, keepDescription: input.keepDescription }).where(eq(taskTemplates.id, id))
  }
  const existing = await db.select().from(templateTasks).where(eq(templateTasks.templateId, id))
  await db.insert(templateTasks).values(rows.map((r, i) => ({ id: randomUUID(), templateId: id!, title: r.title, description: input.keepDescription ? r.description : null, kind: r.kind, sortOrder: existing.length + i })))
  revalidatePath('/leads'); return id
}
/** "Use Template": the template's tasks land on the lead as new open tasks (assignees only when the template kept them — the demo keeps none). */
export async function applyTemplate(leadId: string, templateId: string): Promise<number> {
  const rows = await db.select().from(templateTasks).where(eq(templateTasks.templateId, templateId)).orderBy(templateTasks.sortOrder)
  const now = new Date()
  for (const r of rows) {
    await db.insert(leadTasks).values({ id: randomUUID(), leadId, title: r.title, kind: r.kind, dueAt: null, done: false, createdAt: now, creatorId: ME, description: r.description, seenAt: now, updatedAt: now })
  }
  touch(leadId); return rows.length
}
