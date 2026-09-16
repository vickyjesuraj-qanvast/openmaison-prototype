'use client'

import { Tag } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { highlightMatch, highlightPhone } from '@/components/leads/highlight'
import type { LeadRow } from '@/lib/leads/queries'
import { isOverdue, moneySGD, relativeTime, phoneLocal } from '@/lib/format'
import styles from './lead-cards.module.css'

export type LeadCardsProps = {
  rows: LeadRow[]
  now: number
  query: string
  /** The lead whose stage menu is open — its button turns the chevron up. */
  openStageId: string | null
  onOpen: (row: LeadRow) => void
  onStageClick: (row: LeadRow, anchor: HTMLElement) => void
  onTaskClick: (row: LeadRow, anchor: HTMLElement) => void
  onAssignClick: (row: LeadRow, anchor: HTMLElement) => void
}

/**
 * Lead Listing · mobile (1082:23305, REG-299): the table becomes a column of "Card / Desktop / Leads" (1082:25585)
 * at ≤767 — the workspace swaps this in for the table AND the kanban there. One card per lead, p16 / gap 12 /
 * r8 / level-1, four rows as mocked:
 *   head  — name heading/h4 (truncates) · age body/s · keyboard_arrow_right 20 Light — the whole row opens the lead
 *   info  — phone · S$budget · source, body/m secondary, wrapping on "·"
 *   task  — the first task in a bordered box with the Overdue tag and "+n" (the table's cell), or the "Add Task" link
 *   foot  — members left (avatars + the 24px person_add, or the "Assign" link) · the stage as an outlined button right
 * Every press hands the SAME anchors to the SAME popovers the table uses (stage menu, tasks, assign), so the stage
 * policy, Suggested tasks and the assign rules are one code path. Not mocked and therefore absent: the unseen band,
 * row selection / the bulk bar, and the row kebab (Edit / Delete / Return live on the lead's own page).
 */
export function LeadCards({ rows, now, query, openStageId, onOpen, onStageClick, onTaskClick, onAssignClick }: LeadCardsProps) {
  const nowDate = new Date(now)
  return (
    <div className={styles.list}>
      {rows.map((row) => {
        const first = row.tasks[0]
        const overdue = row.tasks.some((t) => isOverdue(t.dueAt, now))
        const extra = row.tasks.length - 1
        return (
          <article key={row.id} className={styles.card}>
            {/* (REG-344, 1082:25586 "CellDataGroup") The name row and the info line are ONE block 4px apart, not two
                children of the card's 12px rhythm — the mock's 48-tall group above the task row. */}
            <div className={styles.identity}>
            <button type="button" className={styles.head} onClick={() => onOpen(row)}>
              <span className={styles.name}>{highlightMatch(row.name, query)}</span>
              <span className={styles.meta}>
                {/* The mock's "1d ago": the lead's age, the listing's own relative clock (lib/format.ts). */}
                <span>{relativeTime(row.createdAt, nowDate)}</span>
                <Icon name="keyboard_arrow_right" size={20} weight={300} />
              </span>
            </button>
            <p className={styles.info}>
              <span>{highlightPhone(phoneLocal(row.phone), query)}</span>
              <span className={styles.dot} aria-hidden>·</span>
              <span>{moneySGD(row.budgetMinor)}</span>
              <span className={styles.dot} aria-hidden>·</span>
              <span>{highlightMatch(row.source, query)}</span>
            </p>
            </div>
            {first ? (
              <button type="button" className={styles.taskBox} onClick={(e) => onTaskClick(row, e.currentTarget)}>
                <span className={styles.taskText}>{highlightMatch(first.title, query)}</span>
                {overdue ? <Tag color="red" appearance="outlined">Overdue</Tag> : null}
                {extra > 0 ? <Tag appearance="outlined">{`+${extra}`}</Tag> : null}
              </button>
            ) : (
              <button type="button" className={styles.link} aria-label={`Add a task for ${row.name}`}
                      onClick={(e) => onTaskClick(row, e.currentTarget)}>
                <Icon name="add" size={20} />
                Add Task
              </button>
            )}
            <hr className={styles.rule} />
            <div className={styles.foot}>
              <div className={styles.members}>
                {row.assignees.length === 0 ? (
                  <button type="button" className={styles.link} onClick={(e) => onAssignClick(row, e.currentTarget)}>
                    <Icon name="person_add" size={20} />
                    Assign
                  </button>
                ) : (
                  <>
                    {row.assignees.slice(0, 2).map((m) => (
                      <Avatar key={m.id} name={m.name} color={m.color} size={24} />
                    ))}
                    {row.assignees.length > 2 ? <span className={styles.plusBox}>+{row.assignees.length - 2}</span> : null}
                    <IconButton icon="person_add" label={`Assign members to ${row.name}`} size={24} variant="primary"
                                onClick={(e) => onAssignClick(row, e.currentTarget)} />
                  </>
                )}
              </div>
              <button type="button" className={styles.stageBtn} data-open={row.id === openStageId || undefined}
                      aria-haspopup="menu" aria-expanded={row.id === openStageId}
                      onClick={(e) => onStageClick(row, e.currentTarget)}>
                {row.stage}
                <span className={styles.chev}><Icon name="keyboard_arrow_down" size={20} /></span>
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
