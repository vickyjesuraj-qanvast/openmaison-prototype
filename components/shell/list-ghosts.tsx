import { GhostSheet } from './skeleton'
import { GhostHead, type Action } from './ghost-kit'
import { ContractsTabGhost, QuotesTabGhost, TasksTabGhost } from '@/components/leads/detail/tab-ghosts'
import pageStyles from '@/app/leads/leads.module.css'
import tasksTab from '@/components/leads/tasks/lead-tasks.module.css'

/**
 * (REG-708) The studio-wide lists' ghosts — the rail's Tasks, Tools › Quotes, Tools › Contracts — each its own page: the L1 header with the
 * page's actions, then the lead tab's toolbar and table it is built from, with the columns only the studio list has (Lead · Client ·
 * Approval). They were drawing the Leads listing's ghost (its Add Lead · Insights header, its stage and member columns). The route's
 * `loading.tsx` and the page's PageReveal draw the same one.
 */
function ListGhost({ title, actions, label, frame, children }: { title: number; actions?: Action[]; label: string; /** the page's own content frame, where it is not the listing's */ frame?: React.ReactNode; children: React.ReactNode }) {
  return (
    <GhostSheet label={label} l1>
      <GhostHead title={title} actions={actions} />
      {frame ?? <div className={pageStyles.content} aria-hidden>{children}</div>}
    </GhostSheet>
  )
}

export function TasksListGhost() {
  /* the rail's Tasks page is the lead tab's own frame (lead-tasks.module.css .tab[data-studio]: p24 at every width) */
  const body = <TasksTabGhost studio rows={12} />
  return <ListGhost title={58} actions={[{ fold: 119 }, 'icon']} label="Loading tasks" frame={<div className={tasksTab.tab} data-studio="" aria-hidden>{body}</div>}>{body}</ListGhost>
}

export function QuotesListGhost() {
  return <ListGhost title={72} label="Loading quotes"><QuotesTabGhost studio rows={7} /></ListGhost>
}

export function ContractsListGhost() {
  return <ListGhost title={96} label="Loading contracts"><ContractsTabGhost studio rows={4} /></ListGhost>
}
