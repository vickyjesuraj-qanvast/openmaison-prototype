'use client'

import { GhostSheet } from './skeleton'
import { Bone } from './skeleton'
import { GhostHead, GhostTextButton, Words, type Action } from './ghost-kit'
import { ContractsTabGhost, FirstRunTabGhost, QuotesTabGhost, TasksTabGhost } from '@/components/leads/detail/tab-ghosts'
import { useFirstRunShape, useSeedFlag } from '@/lib/ghost-shape'
import { useCountPref } from '@/lib/prefs'
import { APPROVALS_COUNT_KEY, APPROVALS_DOOR, APPROVALS_SHAPE, approvalsWords } from '@/components/tasks/approvals-line'
import note from '@/components/company/read-only-note.module.css'
import approvalsLine from '@/components/tasks/approvals-line.module.css'
import { useSignedInRole } from './access-gate'
import { opensPath } from '@/lib/settings/roles'
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

/** (pending modules S46C · M3) The Tasks page's approvals line as a ghost — the strip, its glyph, the sentence in the page's own class and the door;
    (Dane's Tasks review, 2026-10-27 — change 19) on a phone the strip is one button with a ›, so the ghost draws the › in the door's place. */
function ApprovalsGhost({ count }: { count: number }) {
  return (
    <div className={`${note.note} ${approvalsLine.line} ${approvalsLine.ghostLine}`}>
      <Bone w={20} h={20} r={4} /><Words className={approvalsLine.text}>{approvalsWords(count)}</Words><GhostTextButton label={APPROVALS_DOOR} className={approvalsLine.door} />
      <span className={approvalsLine.ghostChev}><Bone w={20} h={20} r={4} /></span>
    </div>
  )
}

/** `approvals` — (pending modules S46C · M3) the page's own count when the reveal draws it; the loader draws what this browser saw last, else
    what the shell's seed knows now (lib/ghost-shapes.server.ts `tasks.approvals`). (the calm UI build 2026-10-27 took the line off, the audit's
    1-03; Vicky 2026-10-29: brought back, the ghost with it) */
export function TasksListGhost({ approvals }: { approvals?: number } = {}) {
  /* the rail's Tasks page is the lead tab's own frame (lead-tasks.module.css .tab[data-studio]: p24, p16 on a phone — Dane's Tasks review change 9) */
  const first = useFirstRunShape('tasks')   // (UX audit build) no task yet: the bare bar and the empty card (REG-737)
  const sources = opensPath(useSignedInRole(), '/projects')   // (S43E W6-02) Marketing's page has no Leads · Projects
  const seeded = useSeedFlag(APPROVALS_SHAPE, false)
  const remembered = useCountPref(APPROVALS_COUNT_KEY, seeded ? 2 : 0)
  const count = approvals ?? remembered
  const notice = count > 0 ? <ApprovalsGhost count={count} /> : null
  const body = first ? <FirstRunTabGhost tab="tasks" /> : <TasksTabGhost studio rows={12} sources={sources} />
  return <ListGhost title={58} actions={first ? ['icon'] : [{ fold: 119 }, 'icon']} label="Loading tasks" frame={<div className={tasksTab.tab} data-studio="" aria-hidden>{notice}{body}</div>}>{body}</ListGhost>
}

export function QuotesListGhost() {
  const first = useFirstRunShape('tools.quotes')
  /* (the calm UI build 2026-10-27, 4-03 · 1-11 — B4's request) the page header carries New quote at a desk and a tablet (none on a phone, none
     before the first quote) */
  return <ListGhost title={72} actions={first ? [] : [{ desk: 105 }]} label="Loading quotes">{first ? <FirstRunTabGhost tab="quotes" /> : <QuotesTabGhost studio rows={7} />}</ListGhost>
}

export function ContractsListGhost() {
  const first = useFirstRunShape('tools.contracts')
  return <ListGhost title={96} label="Loading contracts">{first ? <FirstRunTabGhost tab="contracts" /> : <ContractsTabGhost studio rows={4} />}</ListGhost>
}
