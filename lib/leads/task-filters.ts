import type { TaskRow } from '@/lib/leads/tasks'
import { parseInputDate } from '@/lib/format'
import { outsideKey, outsideOf } from '@/lib/leads/outside'   // (gaps build, package C — M-03)

/** Lead Details › Tasks filters modal model (902:28963) — Sort · Assignees · Creators · Status · Tags · Date. */
export type TaskSort = 'due' | 'newest' | 'oldest'
export type TaskStatus = 'open' | 'completed'
/** The rail's Tasks page scope chip (REG-466): every task · the signed-in member's · nobody's · the studio's own (no lead). */
export type TaskScope = 'all' | 'mine' | 'unassigned' | 'studio'
export const TASK_SCOPE_LABEL: Record<TaskScope, string> = { all: 'All Tasks', mine: 'My Tasks', unassigned: 'Unassigned', studio: 'Studio Tasks' }
/** (gaps build, package C — 16) The rail's Tasks page: whose work the tasks are — every task, the leads' (in the pipeline), the projects'. */
export type TaskSource = 'all' | 'leads' | 'projects'
export const TASK_SOURCE_LABEL: Record<TaskSource, string> = { all: 'All', leads: 'Leads', projects: 'Projects' }
/** A task's source: its lead's project, its lead, or the studio (no lead — listed under All only). */
export const sourceOf = (t: Pick<TaskRow, 'lead'>): 'leads' | 'projects' | 'studio' => (t.lead?.project ? 'projects' : t.lead ? 'leads' : 'studio')
/** (gaps build, package C — M-03) Nobody on it: no member and no outside person. */
export const isUnassigned = (t: Pick<TaskRow, 'assignees' | 'externalName'>) => t.assignees.length === 0 && !(t.externalName ?? '').trim()
export type TaskFilters = {
  sort: TaskSort
  assignees: string[]      // member ids
  creators: string[]       // member ids
  status: TaskStatus[]
  tags: string[]           // tag ids
  from: string             // d/m/yyyy (DateField value — never typed, REG-119)
  to: string               // d/m/yyyy
  leads: string[]          // lead ids, 'studio' for the tasks with no lead (the rail's Tasks page, REG-466)
  stages: string[]         // the lead's stage (REG-466)
  /** (Projects round 2) a project's milestones — ids, 'none' for the tasks in no milestone; only a lead with a project offers it */
  milestones?: string[]
  /** (fix-A, A-20) the rail's Tasks page: the projects the tasks belong to — project ids */
  projects?: string[]
}

export const EMPTY_TASK_FILTERS: TaskFilters = {
  sort: 'due', assignees: [], creators: [], status: [], tags: [], from: '', to: '', leads: [], stages: [],
}

/** Which groups carry a selection — drives the rail dots and the toolbar badge (mirrors lib/leads/filters activeGroups). */
export function activeTaskGroups(f: TaskFilters): { sort: boolean; assignees: boolean; creators: boolean; status: boolean; tags: boolean; date: boolean; leads: boolean; stages: boolean; milestones: boolean; projects: boolean } {
  return {
    sort: f.sort !== 'due',
    assignees: f.assignees.length > 0,
    creators: f.creators.length > 0,
    status: f.status.length > 0,
    tags: f.tags.length > 0,
    date: !!(parseInputDate(f.from) || parseInputDate(f.to)),
    leads: f.leads.length > 0,
    stages: f.stages.length > 0,
    milestones: (f.milestones?.length ?? 0) > 0,   // (Projects round 2)
    projects: (f.projects?.length ?? 0) > 0,   // (fix-A, A-20)
  }
}
export const activeTaskFilterCount = (f: TaskFilters) => Object.values(activeTaskGroups(f)).filter(Boolean).length

/**
 * Filter + sort. `due` = soonest due first, tasks without a due date last; newest / oldest by createdAt.
 * The Date pane bounds the task's due date (the only date the table shows — build decision, the mock names the pane "Dates").
 * `_now` is reserved for parity with applyFilters (relative presets have no mock yet).
 */
export function applyTaskFilters(tasks: TaskRow[], f: TaskFilters, _now: number): TaskRow[] {
  let out = tasks
  /* (gaps build, package C — M-03) the Members pane lists the outside people too, kept by `outsideKey` */
  if (f.assignees.length) out = out.filter((t) => { const o = outsideOf(t); return t.assignees.some((m) => f.assignees.includes(m.id)) || (!!o && f.assignees.includes(outsideKey(o))) })
  if (f.creators.length) out = out.filter((t) => !!t.creatorId && f.creators.includes(t.creatorId))
  if (f.status.length && f.status.length < 2) {
    const wantDone = f.status.includes('completed')
    out = out.filter((t) => t.done === wantDone)
  }
  if (f.tags.length) out = out.filter((t) => t.tags.some((g) => f.tags.includes(g.id)))
  if (f.leads.length) out = out.filter((t) => f.leads.includes(t.lead?.id ?? 'studio'))
  if (f.stages.length) out = out.filter((t) => !!t.lead && f.stages.includes(t.lead.stage))
  if (f.milestones?.length) out = out.filter((t) => f.milestones!.includes(t.milestoneId ?? 'none'))   // (Projects round 2)
  if (f.projects?.length) out = out.filter((t) => !!t.lead?.project && f.projects!.includes(t.lead.project.id))   // (fix-A, A-20)
  const a = parseInputDate(f.from), b = parseInputDate(f.to)
  if (a || b) {
    const day = 86_400_000
    const from = a ? a.getTime() : null
    const to = b ? b.getTime() + day : null
    out = out.filter((t) => {
      if (!t.dueAt) return false
      const d = t.dueAt.getTime()
      return (from === null || d >= from) && (to === null || d < to)
    })
  }
  const sorted = [...out]
  if (f.sort === 'due') {
    sorted.sort((x, y) => {
      if (!x.dueAt && !y.dueAt) return y.createdAt.getTime() - x.createdAt.getTime()
      if (!x.dueAt) return 1
      if (!y.dueAt) return -1
      return x.dueAt.getTime() - y.dueAt.getTime()
    })
  } else if (f.sort === 'newest') {
    sorted.sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())
  } else {
    sorted.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())
  }
  const ordered = sorted
  // A task nobody has opened yet sits on top whatever the sort (902:26362 frame 191: the new task is the first row).
  return [...ordered.filter((t) => t.seenAt === null), ...ordered.filter((t) => t.seenAt !== null)]
}

/* ── (pending modules S05 — card held:leads, "Coming soon sort on the Tasks and Files table heads (1.0 sorted tasks) · revisit: the listing
   and galleries sort") A column's own order, the Contracts / Quotes heads' model (S03 · S04): Due date and Status (REG-468 kept their glyphs)
   cycle A→Z, Z→A, off, and ONE sort holds at a time — a head's sort puts Filters' Sort back to its default, an order picked in Filters takes
   the head's off. A task nobody has opened yet still sits on top (REG-173); undated tasks always last. ── */
export const TASK_SORT_KEYS = ['due', 'status'] as const
export type TaskSortKey = (typeof TASK_SORT_KEYS)[number]
export type TaskHeadSort = { key: TaskSortKey; dir: 'asc' | 'desc' } | null
export const isTaskSortKey = (k: string): k is TaskSortKey => (TASK_SORT_KEYS as readonly string[]).includes(k)
export const nextTaskHeadSort = (s: TaskHeadSort, key: TaskSortKey): TaskHeadSort => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null)
/** The head's order in words — the label a screen reader hears, the Filters line. */
export const taskHeadWords = (key: TaskSortKey, dir: 'asc' | 'desc') => (key === 'due' ? (dir === 'asc' ? 'soonest first' : 'latest first') : dir === 'asc' ? 'open first' : 'completed first')
export const TASK_HEAD_LABEL: Record<TaskSortKey, string> = { due: 'Due date', status: 'Status' }
/** Rows in the head's order (stable): Due date soonest or latest first, undated last; Status open or completed first. */
export function sortTasksByHead<T extends Pick<TaskRow, 'dueAt' | 'done' | 'seenAt'>>(rows: T[], sort: TaskHeadSort): T[] {
  if (!sort) return rows
  const sign = sort.dir === 'asc' ? 1 : -1
  const val = (t: T): number | null => (sort.key === 'due' ? t.dueAt?.getTime() ?? null : t.done ? 1 : 0)
  const out = rows.map((r, i) => ({ r, i, v: val(r) }))
    .sort((a, b) => (a.v === null && b.v === null ? a.i - b.i : a.v === null ? 1 : b.v === null ? -1 : (a.v - b.v) * sign || a.i - b.i))
    .map((x) => x.r)
  return [...out.filter((t) => t.seenAt === null), ...out.filter((t) => t.seenAt !== null)]
}
