import 'server-only'
import { asc, desc, isNotNull, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadTasks, leads, members, tags, taskTemplates, templateTasks, type Member, type Tag, type TaskTemplate } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'

/* Company › Templates › Tasks (REG-538): the checklists the team adds to a lead in one go, as a library with an editor. */

export type TaskTemplateStep = { id: string; title: string; description: string | null; kind: string; memberIds: string[]; tagIds: string[]; dueDays: number | null; sortOrder: number }
export type TaskTemplateRow = TaskTemplate & { tasks: TaskTemplateStep[]; usedBy: number; author: string | null; authorColor: string | null }
export type TaskTemplatesData = { templates: TaskTemplateRow[]; deleted: TaskTemplateRow[]; team: Member[]; tags: Tag[]; leads: { id: string; name: string }[]; now: number; /** (REG-646) who is looking — the menus' rename / delete rule */ viewer: { id: string; role: string } }

const ids = (json: string | null): string[] => { if (!json) return []; try { const v = JSON.parse(json) as unknown; return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } }

export async function fetchTaskTemplatesData(): Promise<TaskTemplatesData> {
  const [all, steps, uses, team, allTags, clients] = await Promise.all([
    db.select().from(taskTemplates).orderBy(desc(taskTemplates.updatedAt), asc(taskTemplates.createdAt)),
    db.select().from(templateTasks).orderBy(asc(templateTasks.sortOrder)),
    db.select({ templateId: leadTasks.templateId, n: sql<number>`count(distinct coalesce(${leadTasks.leadId}, 'studio'))` }).from(leadTasks).where(isNotNull(leadTasks.templateId)).groupBy(leadTasks.templateId),
    db.select().from(members),
    db.select().from(tags).orderBy(asc(tags.createdAt)),
    db.select({ id: leads.id, name: leads.name }).from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.name)),
  ])
  const n = new Map(uses.map((u) => [u.templateId ?? '', u.n]))
  const by = new Map(team.map((m) => [m.id, m]))
  const rows: TaskTemplateRow[] = all.map((t) => {
    const m = t.createdBy ? by.get(t.createdBy) : undefined
    return {
      ...t, usedBy: n.get(t.id) ?? 0, author: m?.name ?? null, authorColor: m?.color ?? null,
      tasks: steps.filter((s) => s.templateId === t.id).map((s) => ({ id: s.id, title: s.title, description: s.description, kind: s.kind, memberIds: ids(s.memberIds), tagIds: ids(s.tagIds), dueDays: s.dueDays, sortOrder: s.sortOrder })),
    }
  })
  const v = await fetchViewer()
  return { templates: rows.filter((t) => !t.deletedAt), deleted: rows.filter((t) => !!t.deletedAt), team, tags: allTags, leads: clients, now: Date.now(), viewer: { id: v.id, role: v.role } }
}
export type TaskTemplateEditorData = { template: TaskTemplateRow; team: Member[]; tags: Tag[]; leads: { id: string; name: string }[]; now: number }
export async function fetchTaskTemplateEditor(id: string): Promise<TaskTemplateEditorData | null> {
  const data = await fetchTaskTemplatesData()
  const t = data.templates.find((x) => x.id === id)
  return t ? { template: t, team: data.team, tags: data.tags, leads: data.leads, now: data.now } : null
}
