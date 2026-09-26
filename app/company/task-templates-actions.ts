'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { changeBlock, changeableIds, nothingChangeable } from '@/lib/company/template-guard'
import { TEMPLATE_GONE_LINE, refuse, type Refusal } from '@/lib/company/template-rules'
import { db } from '@/lib/db'
import { leadTasks, taskTemplates, templateTasks } from '@/lib/db/schema'
import { sessionMemberSql } from '@/lib/db/session'
import { revalidateEveryLead } from '@/lib/leads/queries'
import { applyTemplate } from '@/app/leads/tasks-actions'

/* Company › Templates › Tasks (REG-538): the checklist library — create · save (name, switches, steps) · rename · duplicate · soft delete · restore · forever · add to a lead. */

const touch = (id?: string) => { revalidatePath('/company/templates/tasks'); revalidatePath('/company', 'layout'); revalidateEveryLead(); if (id) revalidatePath(`/templates/tasks/${id}`) }
const clean = (s: string | null | undefined, max = 120) => (s ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max)
const row = async (id: string) => { const [r] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id)); if (!r) throw new Error('template not found'); return r }
/** (wave E, E7) Why the viewer may not rename or delete this one — its rule, or the template gone from under a stale page — else null. */
const refusalFor = async (id: string) => { const [r] = await db.select({ createdBy: taskTemplates.createdBy }).from(taskTemplates).where(eq(taskTemplates.id, id)); return r ? changeBlock(r.createdBy) : TEMPLATE_GONE_LINE }

export type TaskStepInput = { id?: string; title: string; description?: string | null; kind?: string; memberIds?: string[]; tagIds?: string[]; dueDays?: number | null }
const cleanStep = (s: TaskStepInput, i: number, templateId: string) => ({
  id: s.id && /^[0-9a-f-]{36}$/i.test(s.id) ? s.id : randomUUID(), templateId, title: clean(s.title, 200) || 'Untitled task', description: clean(s.description, 2000) || null, kind: clean(s.kind, 40) || 'General', sortOrder: i,
  memberIds: JSON.stringify((s.memberIds ?? []).filter((x) => typeof x === 'string').slice(0, 20)), tagIds: JSON.stringify((s.tagIds ?? []).filter((x) => typeof x === 'string').slice(0, 20)),
  dueDays: s.dueDays === null || s.dueDays === undefined || !Number.isFinite(s.dueDays) ? null : Math.max(0, Math.min(365, Math.round(s.dueDays))),
})

export type CreateTaskTemplateInput = { name?: string; source: { kind: 'blank' } | { kind: 'copy'; id: string } | { kind: 'lead'; leadId: string | null } }
/** Blank (one empty step), a copy, or the open tasks of a lead (the tab's "Save all as Template" from Company's side). Returns the id. */
export async function createTaskTemplate(input: CreateTaskTemplateInput): Promise<string> {
  const now = new Date()
  const id = randomUUID()
  let name = clean(input.name) || 'Untitled template', keepMembers = true, keepDescription = true
  let steps: TaskStepInput[] = [{ title: 'First step' }]
  if (input.source.kind === 'copy') {
    const src = await row(input.source.id)
    const rows = await db.select().from(templateTasks).where(eq(templateTasks.templateId, src.id)).orderBy(asc(templateTasks.sortOrder))
    keepMembers = src.keepMembers; keepDescription = src.keepDescription
    steps = rows.map((r) => ({ title: r.title, description: r.description, kind: r.kind, memberIds: JSON.parse(r.memberIds ?? '[]') as string[], tagIds: JSON.parse(r.tagIds ?? '[]') as string[], dueDays: r.dueDays }))
    if (!clean(input.name)) name = `${src.name} (copy)`
  } else if (input.source.kind === 'lead') {
    const where = input.source.leadId ? and(eq(leadTasks.leadId, input.source.leadId), eq(leadTasks.done, false)) : and(isNull(leadTasks.leadId), eq(leadTasks.done, false))
    const rows = await db.select().from(leadTasks).where(where).orderBy(asc(leadTasks.createdAt))
    if (!rows.length) throw new Error('no tasks')
    steps = rows.map((r) => ({ title: r.title, description: r.description, kind: r.kind, dueDays: r.dueAt ? Math.max(0, Math.round((r.dueAt.getTime() - now.getTime()) / 86_400_000)) : null }))
  }
  await db.transaction(async (tx) => {
    await tx.insert(taskTemplates).values({ id, name, keepMembers, keepDescription, createdAt: now, createdBy: sessionMemberSql, updatedAt: now })
    await tx.insert(templateTasks).values(steps.map((s, i) => cleanStep(s, i, id)))
  })
  touch(id)
  return id
}
/** The editor's autosave: the name, the two switches and the steps in order (replaces the list). */
export async function saveTaskTemplate(id: string, patch: { name?: string; keepMembers?: boolean; keepDescription?: boolean; steps?: TaskStepInput[] }): Promise<number> {
  await row(id)
  const now = new Date()
  await db.transaction(async (tx) => {
    const set: Partial<typeof taskTemplates.$inferInsert> = { updatedAt: now }
    if (patch.name !== undefined) set.name = clean(patch.name) || 'Untitled template'
    if (patch.keepMembers !== undefined) set.keepMembers = !!patch.keepMembers
    if (patch.keepDescription !== undefined) set.keepDescription = !!patch.keepDescription
    await tx.update(taskTemplates).set(set).where(eq(taskTemplates.id, id))
    if (patch.steps) {
      await tx.delete(templateTasks).where(eq(templateTasks.templateId, id))
      if (patch.steps.length) await tx.insert(templateTasks).values(patch.steps.slice(0, 60).map((s, i) => cleanStep(s, i, id)))
    }
  })
  touch(id)
  return now.getTime()
}
export async function renameTaskTemplate(id: string, name: string): Promise<void | Refusal> { const block = await refusalFor(id); if (block) return refuse(block); await saveTaskTemplate(id, { name }) }   // (REG-646) · (wave E, E7) the rule answered, never thrown
export async function duplicateTaskTemplate(id: string): Promise<string> { return createTaskTemplate({ source: { kind: 'copy', id } }) }
export async function deleteTaskTemplate(id: string): Promise<void | Refusal> { const block = await refusalFor(id); if (block) return refuse(block); await db.update(taskTemplates).set({ deletedAt: new Date() }).where(eq(taskTemplates.id, id)); touch(id) }
/** (wave E, E7) What came back and what stayed (someone else's) — or, when none may come back, the rule. */
export async function restoreTaskTemplates(ids: string[]): Promise<{ restored: number; kept: number } | Refusal> {
  if (!ids.length) return { restored: 0, kept: 0 }
  const rows = await db.select({ id: taskTemplates.id, createdBy: taskTemplates.createdBy }).from(taskTemplates).where(inArray(taskTemplates.id, ids))
  const none = await nothingChangeable(rows, 'restore'); if (none) return refuse(none)
  const mine = await changeableIds(rows)
  if (mine.length) await db.update(taskTemplates).set({ deletedAt: null }).where(inArray(taskTemplates.id, mine)); touch()
  return { restored: mine.length, kept: ids.length - mine.length }
}
/** Delete forever: the tasks it already added to leads keep their own rows (only their `template_id` link goes). */
export async function deleteTaskTemplatesForever(ids: string[]): Promise<{ removed: number; kept: number } | Refusal> {
  let removed = 0, kept = 0
  const rows = ids.length ? await db.select({ id: taskTemplates.id, createdBy: taskTemplates.createdBy }).from(taskTemplates).where(inArray(taskTemplates.id, ids)) : []
  const none = await nothingChangeable(rows, 'purge'); if (none) return refuse(none)   // (wave E, E7) none of them the viewer's: the rule, not "nothing was deleted"
  const mine = new Set(await changeableIds(rows))   // (REG-646)
  for (const id of ids) {
    const [r] = await db.select({ deletedAt: taskTemplates.deletedAt }).from(taskTemplates).where(eq(taskTemplates.id, id))
    if (!r?.deletedAt || !mine.has(id)) { kept++; continue }
    await db.update(leadTasks).set({ templateId: null }).where(eq(leadTasks.templateId, id))
    await db.delete(taskTemplates).where(eq(taskTemplates.id, id)); removed++
  }
  touch()
  return { removed, kept }
}
export async function emptyTaskTemplateTrash(): Promise<{ removed: number; kept: number } | Refusal> {
  const rows = await db.select({ id: taskTemplates.id }).from(taskTemplates).where(sql`${taskTemplates.deletedAt} is not null`)
  return deleteTaskTemplatesForever(rows.map((r) => r.id))
}
/** The gallery's "Add to a lead…": the template's steps land on the lead (or the studio's own tasks) as open tasks. */
export async function addTaskTemplateToLead(templateId: string, leadId: string | null): Promise<number> {
  const n = await applyTemplate(leadId, templateId)
  touch()
  return n
}
