'use client'

import { useRef, type MouseEvent } from 'react'
import NextLink from 'next/link'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { PortalMenu } from '@/components/om/portal-menu'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { useLongPress } from '@/components/leads/quotes/use-long-press'
import { withFrom } from '@/lib/nav'
import { outsideOf } from '@/lib/leads/outside'
import type { TaskRow } from '@/lib/leads/tasks'
import { OutsideBadge } from './outside-person'
import { dueChip } from './task-card-words'
import type { TaskRowAction } from './tasks-table'
import styles from './task-card.module.css'

/**
 * (Leads on the move, L4 — P-10 · C-03 · C-05, canvas 2b's two lines) A task on a phone (≤767), module-wide — the lead's Tasks, the rail's
 * Tasks and a project's Tasks: the 44 ring that ticks it done · the name at 16, whole on two lines · the ⋮; under the name, the due day as a
 * chip at 14 (red when late, "Today" when it is today), who is on it (one avatar and "+n", or Assign), the comments' count when there are
 * some and — on the rail's page — whose task it is. A tap on the card opens the task; a hold selects it (the Quotes card's way, no checkbox
 * to aim at, C-03) and, once something is selected, a tap toggles. The desk's columns (Creator, Status, Tags) live in the task itself.
 */
export function TaskCard({ task, now, unseen, fresh, selected, selectMode, descriptionMatch, studio, milestone, menuOpen, onMenuToggle, onMenuClose,
  onToggleSelect, onOpen, onOpenComments, onToggleDone, onAssign, onRowMenu }: {
  task: TaskRow
  now: number
  unseen: boolean
  fresh: boolean
  selected: boolean
  /** Something is selected: a tap toggles this card instead of opening it. */
  selectMode: boolean
  descriptionMatch: boolean
  /** The rail's Tasks page: the card names whose task it is (a lead, a project or the studio). */
  studio: boolean
  /** A project's task: the milestone it sits in, on the meta line. */
  milestone: string | null
  menuOpen: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
  onToggleSelect: () => void
  onOpen: (task: TaskRow) => void
  onOpenComments: (task: TaskRow) => void
  onToggleDone: (task: TaskRow) => void
  onAssign: (task: TaskRow, anchor: HTMLElement) => void
  onRowMenu: (task: TaskRow, action: TaskRowAction) => void
}) {
  const chip = dueChip(task.dueAt, task.done, now)
  const outside = outsideOf(task)
  const hold = useLongPress(onToggleSelect)
  const kebab = useRef<HTMLSpanElement>(null)
  const pick = (action: TaskRowAction) => () => { onMenuClose(); onRowMenu(task, action) }
  /* The click a hold ends with belongs to the hold, wherever the finger was — on the ring, the name or a pill too: swallowed on its way down
     (capture), so it never completes the task, opens it or undoes the selection the hold just made. */
  const swallow = (e: MouseEvent<HTMLDivElement>) => { if (hold.swallowClick()) { e.stopPropagation(); e.preventDefault() } }
  const press = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a, input, [role="menu"], [role="dialog"]')) return
    if (selectMode) onToggleSelect(); else onOpen(task)
  }
  /* (held calls 2026-10-24) the first member, then the outside person's own badge — someone outside the studio is a fact the card shows, as the
     desk's row does (gaps build C, M-03) — then +n for the other members */
  const others = Math.max(0, task.assignees.length - 1)
  return (
    <div className={styles.card} role="listitem" data-kb-row data-kb-id={task.id} data-testid="task-card"
         data-unseen={unseen ? '' : undefined} data-selected={selected ? '' : undefined} data-fresh={fresh || undefined} data-done={task.done || undefined}
         onClickCapture={swallow} onClick={press} onContextMenu={(e) => e.preventDefault()} {...hold.handlers}>
      <button type="button" className={styles.ring} data-done={task.done || undefined} aria-pressed={task.done}
              aria-label={task.done ? `Reopen ${task.title}` : `Mark ${task.title} as completed`} onClick={() => onToggleDone(task)} data-testid="task-card-ring">
        <Icon name={task.done ? 'check_circle' : 'radio_button_unchecked'} size={24} weight={300} fill={task.done} />
      </button>
      <div className={styles.body}>
        <button type="button" className={styles.name} data-unseen={unseen ? '' : undefined} onClick={() => (selectMode ? onToggleSelect() : onOpen(task))} data-kb-open data-testid="task-card-name">
          {task.title}
        </button>
        {studio ? (
          <span className={styles.for} data-testid="task-card-for">
            {task.lead ? (
              <NextLink href={withFrom(task.lead.project ? `/projects/${task.lead.project.id}/tasks` : `/leads/${task.lead.id}/tasks`, '/tasks')} className={styles.forLink}>
                {task.lead.project ? `${task.lead.project.name} · ${task.lead.project.number}` : task.lead.name}
              </NextLink>
            ) : <span className={styles.studio}><Icon name="domain" size={16} weight={300} />Studio</span>}
          </span>
        ) : null}
        <span className={styles.meta}>
          {chip ? <span className={styles.due} data-tone={chip.tone} data-testid="task-card-due"><Icon name={chip.tone === 'late' ? 'schedule' : 'event'} size={16} weight={300} />{chip.text}</span> : null}
          {task.assignees.length || outside ? (
            <span className={styles.who} aria-label={[...task.assignees.map((m) => m.name), ...(outside ? [outside.name] : [])].join(', ')}>
              {task.assignees[0] ? <Avatar name={task.assignees[0].name} color={task.assignees[0].color} size={24} tooltip={false} /> : null}{outside ? <OutsideBadge o={outside} /> : null}
              {others > 0 ? <span className={styles.plus}>+{others}</span> : null}
            </span>
          ) : task.done ? null : (
            <button type="button" className={styles.assign} onClick={(e) => onAssign(task, e.currentTarget)} data-testid="task-card-assign">
              <Icon name="person_add" size={20} />Assign
            </button>
          )}
          {task.comments.length ? (
            <button type="button" className={styles.comments} onClick={() => onOpenComments(task)} aria-label={`Open ${task.comments.length} comments`} data-testid="task-card-comments">
              <span className={styles.commentsChip}><Icon name="comment" size={16} weight={300} />{task.comments.length}</span>
            </button>
          ) : null}
          {milestone ? <span className={styles.milestone}>{milestone}</span> : null}
          {descriptionMatch ? <span className={styles.match}><Icon name="description" size={16} weight={300} />In description</span> : null}
        </span>
      </div>
      <span className={styles.menu} ref={kebab}>
        <IconButton icon="more_vert" label={`More actions for ${task.title}`} variant="bare" aria-haspopup="menu" aria-expanded={menuOpen} onClick={onMenuToggle} data-testid="task-card-menu" />
        <PortalMenu open={menuOpen} anchor={kebab} onClose={onMenuClose} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle={task.title}>
          {task.done ? null : <DropdownItem onSelect={pick('complete')}>Mark as Completed</DropdownItem>}
          <DropdownItem onSelect={pick('rename')}>Rename</DropdownItem>
          {outside?.phone ? <DropdownItem onSelect={pick('send-outside')} help={`Opens WhatsApp with the task for ${outside.name}`}>Send on WhatsApp</DropdownItem> : null}
          <DropdownItem onSelect={pick('template')}>Save as Template</DropdownItem>
          <DropdownItem onSelect={pick('duplicate')}>Duplicate</DropdownItem>
          <DropdownItem tone="danger" onSelect={pick('delete')}>Delete</DropdownItem>
        </PortalMenu>
      </span>
    </div>
  )
}
