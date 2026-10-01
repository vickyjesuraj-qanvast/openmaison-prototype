'use client'

import { Fragment } from 'react'
import { useFlagPref } from '@/lib/prefs'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import type { LeadTask } from '@/lib/db/schema'
import { displayDayMonth, displayDue, displayTime, hasTime, isDueToday, isOverdue, startOfDay } from '@/lib/format'
import { Card, CardEmpty, CardRule } from './card'
import styles from './my-work-card.module.css'

/**
 * MY TASKS card (858:24989 full · 858:24505 due-today only · 858:24171 empty).
 * Open tasks grouped Overdue → Due today → Upcoming, Upcoming collapsed. Each group lists every task it counts:
 * the label prints the real total, so the two rows per group in the mock are its data, not a cap (user 2026-08-30).
 * Spec: design-source/context/lead-overview/05-*.txt.
 */

const DAY_MS = 86_400_000

type GroupKey = 'overdue' | 'today' | 'upcoming'
type Group = { key: GroupKey; label: string; tasks: LeadTask[] }

export function MyWorkCard({ tasks, now, onCreate, onComplete, onOpenTask, onOpenTab }: {
  tasks: LeadTask[]
  now: number
  /** "Create New Task" (empty state) — receives the button so the tasks add flow can anchor to it. */
  onCreate: (anchor: HTMLElement) => void
  onComplete: (task: LeadTask) => void
  onOpenTask: (task: LeadTask) => void
  onOpenTab: () => void
}) {
  // Upcoming is collapsed by default (858:24989 shows only its 52px label row) — and once the user opens or closes
  // it, that choice is remembered per browser like every other remembered state (lib/prefs.ts).
  const [upcomingOpen, setUpcomingOpen] = useFlagPref('om.detail.myWork.upcoming', false)

  // Grouping keeps the loader's order inside each group — the spec does not sort rows.
  const open = tasks.filter((t) => !t.done)
  const overdue = open.filter((t) => isOverdue(t.dueAt, now))
  const today = open.filter((t) => isDueToday(t.dueAt, now))
  const upcoming = open.filter((t) => !isOverdue(t.dueAt, now) && !isDueToday(t.dueAt, now))
  const groups = ([
    { key: 'overdue', label: 'Overdue', tasks: overdue },
    { key: 'today', label: 'Due today', tasks: today },
    { key: 'upcoming', label: 'Upcoming', tasks: upcoming },
  ] satisfies Group[]).filter((g) => g.tasks.length > 0)

  const attention = overdue.length
  const metaRight = attention > 0
    ? `${attention} ${attention === 1 ? 'task needs' : 'tasks need'} attention`
    : undefined

  return (
    <Card
      title="MY TASKS"
      headGap={8}
      meta={(
        <span className={styles.headMeta}>
          <span>·</span>
          <span>{displayDayMonth(new Date(now))}</span>
        </span>
      )}
      metaRight={metaRight}
      onOpen={onOpenTab}
      openLabel="Open my tasks"
      testId="my-work"
    >
      {open.length === 0 ? (
        <CardEmpty
          illustration="/figma-assets/empty-tasks.svg"
          width={140}
          height={107}
          title="Add your first task"
          body="Stay organised — track, prioritise, and complete everything from one place."
          gap={20}
          actions={(
            <Button iconStart={<Icon name="add" size={20} />} onPress={(e) => onCreate(e.target as HTMLElement)}>
              Create New Task
            </Button>
          )}
        />
      ) : (
        groups.map((g, i) => {
          const first = i === 0
          const last = i === groups.length - 1
          const tone = g.key === 'overdue' ? 'red' : g.key === 'today' ? 'yellow' : undefined
          const labelText = (
            <span className={styles.groupText}>
              <span>{g.label}</span>
              <span>·</span>
              <span>{g.tasks.length}</span>
            </span>
          )

          if (g.key === 'upcoming' && !upcomingOpen) {
            // Collapsed group (858:24989): a single 52px row, 12/20/20/20, chevron down.
            return (
              <button key={g.key} type="button" className={`${styles.groupLabel} ${styles.collapsed}`}
                      aria-expanded={false} onClick={() => setUpcomingOpen(true)}>
                {labelText}
                <span className={styles.toggleIcon}><Icon name="keyboard_arrow_down" size={20} /></span>
              </button>
            )
          }

          return (
            <Fragment key={g.key}>
              {g.key === 'upcoming' ? (
                <button type="button" className={styles.groupLabel} data-first={first || undefined}
                        aria-expanded onClick={() => setUpcomingOpen(false)}>
                  {labelText}
                  <span className={styles.toggleIcon}><Icon name="keyboard_arrow_up" size={20} /></span>
                </button>
              ) : (
                <div className={styles.groupLabel} data-first={first || undefined} data-tone={tone}>
                  {labelText}
                </div>
              )}
              <div className={styles.list} data-ruled={!last || undefined}>
                {g.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} group={g.key} now={now} onComplete={onComplete} onOpenTask={onOpenTask} />
                ))}
              </div>
              {!last ? <CardRule /> : null}
            </Fragment>
          )
        })
      )}
    </Card>
  )
}

/** Task row (858:24989): 56 tall, 8 padding, 8 gap, r4 — radio · title / meta · chevron. */
function TaskRow({ task, group, now, onComplete, onOpenTask }: {
  task: LeadTask
  group: GroupKey
  now: number
  onComplete: (task: LeadTask) => void
  onOpenTask: (task: LeadTask) => void
}) {
  const due = task.dueAt
  const overdueDays = due && group === 'overdue'
    ? Math.round((startOfDay(new Date(now)) - startOfDay(due)) / DAY_MS)
    : 0

  return (
    <div className={styles.row}>
      <Tooltip label="Mark done">
        <button type="button" className={styles.radio} aria-label={`Mark "${task.title}" done`} onClick={() => onComplete(task)}>
          <Icon name="radio_button_unchecked" size={20} weight={300} />
        </button>
      </Tooltip>
      <div className={styles.text}>
        <span className={styles.title}>{task.title}</span>
        <span className={styles.meta}>
          <span>{task.kind}</span>
          {/* (Dane UAT 5.13 · 5.05) a due wears its day, and its time when it has one: "Sat, 3 Oct ’26 · 10:00 AM" · "Due today · 10:00 AM" */}
          {group === 'overdue' && due ? (
            <>
              <span className={styles.dot}>·</span>
              <span data-tone="red">{displayDue(due)}</span>
              <span data-tone="red">({overdueDays}d overdue)</span>
            </>
          ) : group === 'today' ? (
            <>
              <span className={styles.dot}>·</span>
              <span data-tone="yellow">{due && hasTime(due) ? `Due today · ${displayTime(due)}` : 'Due today'}</span>
            </>
          ) : due ? (
            <>
              <span className={styles.dot}>·</span>
              <span>{displayDue(due)}</span>
            </>
          ) : null}
        </span>
      </div>
      <Tooltip label="Task details">
        <button type="button" className={styles.chev} aria-label={`Open "${task.title}"`} onClick={() => onOpenTask(task)}>
          <Icon name="keyboard_arrow_right" size={20} />
        </button>
      </Tooltip>
    </div>
  )
}
