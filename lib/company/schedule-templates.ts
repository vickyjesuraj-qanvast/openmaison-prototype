import 'server-only'
import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadEvents, members, projects, scheduleTemplateItems, scheduleTemplates, type ScheduleTemplate } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { draftsFromTemplate, type TemplateItem } from '@/lib/projects/schedule-phases'
import { templateItemOf } from '@/lib/projects/schedule'

/* (Projects round 2, Q-12) Company › Templates › Schedules: the milestones a project's schedule can start from, as a library — the payment
   splits' shape (lib/company/payment-templates.ts): rows with their author and how often they were used, deleted ones apart. */

export type ScheduleTemplateRow = ScheduleTemplate & {
  items: (TemplateItem & { id: string })[]
  /** How many live projects' schedules started from it — the `project_schedule_created` line's `templateId` (REG-1071; a line written
      before it was recorded names the template in its words). */
  usedBy: number
  author: string | null
  authorColor: string | null
  /** Its total length, works start to handover, in days. */
  span: number
}
export type ScheduleTemplatesData = { templates: ScheduleTemplateRow[]; deleted: ScheduleTemplateRow[]; now: number; viewer: { id: string; role: string } }

/** Works start to the last day of the last item, as the items lay out (lib/projects/schedule-phases.ts `draftsFromTemplate`) — (parity map,
    SC-016) an item that waits on an earlier one than the one before lays out from it, so the span is read from the layout itself. */
export function spanOf(items: TemplateItem[]): number {
  const d = draftsFromTemplate(items, 0)
  return d.length ? Math.max(...d.map((x) => x.end)) + 1 : 0
}

export async function fetchScheduleTemplatesData(): Promise<ScheduleTemplatesData> {
  await (await import('@/lib/projects/schedule')).ensureReadyMadeSchedules()   // (gaps build, package C — 3) every studio's library starts with them
  const [all, items, team, used, v] = await Promise.all([
    db.select().from(scheduleTemplates).orderBy(asc(scheduleTemplates.createdAt)),
    db.select().from(scheduleTemplateItems).orderBy(asc(scheduleTemplateItems.position)),
    db.select({ id: members.id, name: members.name, color: members.color }).from(members),
    db.select({ detail: leadEvents.detail, projectId: leadEvents.projectId }).from(leadEvents).innerJoin(projects, eq(projects.id, leadEvents.projectId))
      .where(and(eq(leadEvents.kind, 'project_schedule_created'), isNotNull(leadEvents.projectId), isNull(projects.deletedAt))),
    fetchViewer(),
  ])
  const by = new Map(team.map((m) => [m.id, m]))
  const rows: ScheduleTemplateRow[] = all.map((t) => {
    const its = items.filter((i) => i.templateId === t.id).map((i) => ({ id: i.id, ...templateItemOf(i) }))   // (parity map, SC-016) words, colour and links too
    const m = t.createdBy ? by.get(t.createdBy) : undefined
    /* each live project once (a schedule started again after its milestones were all deleted writes a second line) */
    const n = new Set(used.filter((u) => { const d = (u.detail ?? {}) as { source?: unknown; templateId?: unknown }; return typeof d.templateId === 'string' ? d.templateId === t.id : d.source === `from the template “${t.name}”` }).map((u) => u.projectId)).size
    return { ...t, items: its, usedBy: n, author: m?.name ?? null, authorColor: m?.color ?? null, span: spanOf(its) }
  })
  return { templates: rows.filter((t) => !t.deletedAt), deleted: rows.filter((t) => !!t.deletedAt), now: Date.now(), viewer: { id: v.id, role: v.role } }
}

export type ScheduleTemplateEditorData = { template: ScheduleTemplateRow; now: number; viewer: { id: string; role: string } }
export async function fetchScheduleTemplateEditor(id: string): Promise<ScheduleTemplateEditorData | null> {
  const data = await fetchScheduleTemplatesData()
  const t = data.templates.find((x) => x.id === id)
  return t ? { template: t, now: data.now, viewer: data.viewer } : null
}

/** The live templates' count — the Start card says whether a template can be picked. */
export async function countScheduleTemplates(): Promise<number> {
  return (await db.select({ id: scheduleTemplates.id }).from(scheduleTemplates).where(isNull(scheduleTemplates.deletedAt))).length
}
