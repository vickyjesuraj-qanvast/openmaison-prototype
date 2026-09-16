import type { TaskRow } from '@/lib/leads/tasks'
import { parseInputDate } from '@/lib/format'

/** Lead Details › Tasks filters modal model (902:28963) — Sort · Assignees · Creators · Status · Tags · Date. */
export type TaskSort = 'due' | 'newest' | 'oldest'
export type TaskStatus = 'open' | 'completed'
/** The rail's Tasks page scope chip (REG-466): every task · the signed-in member's · nobody's · the studio's own (no lead). */
export type TaskScope = 'all' | 'mine' | 'unassigned' | 'studio'
export const TASK_SCOPE_LABEL: Record<TaskScope, string> = { all: 'All Tasks', mine: 'My Tasks', unassigned: 'Unassigned', studio: 'Studio Tasks' }
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
}

export const EMPTY_TASK_FILTERS: TaskFilters = {
  sort: 'due', assignees: [], creators: [], status: [], tags: [], from: '', to: '', leads: [], stages: [],
}

/** Which groups carry a selection — drives the rail dots and the toolbar badge (mirrors lib/leads/filters activeGroups). */
export function activeTaskGroups(f: TaskFilters): { sort: boolean; assignees: boolean; creators: boolean; status: boolean; tags: boolean; date: boolean; leads: boolean; stages: boolean } {
  return {
    sort: f.sort !== 'due',
    assignees: f.assignees.length > 0,
    creators: f.creators.length > 0,
    status: f.status.length > 0,
    tags: f.tags.length > 0,
    date: !!(parseInputDate(f.from) || parseInputDate(f.to)),
    leads: f.leads.length > 0,
    stages: f.stages.length > 0,
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
  if (f.assignees.length) out = out.filter((t) => t.assignees.some((m) => f.assignees.includes(m.id)))
  if (f.creators.length) out = out.filter((t) => !!t.creatorId && f.creators.includes(t.creatorId))
  if (f.status.length && f.status.length < 2) {
    const wantDone = f.status.includes('completed')
    out = out.filter((t) => t.done === wantDone)
  }
  if (f.tags.length) out = out.filter((t) => t.tags.some((g) => f.tags.includes(g.id)))
  if (f.leads.length) out = out.filter((t) => f.leads.includes(t.lead?.id ?? 'studio'))
  if (f.stages.length) out = out.filter((t) => !!t.lead && f.stages.includes(t.lead.stage))
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
