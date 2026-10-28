'use client'

import { Fragment, type ReactNode } from 'react'
import { useFlagPref } from '@/lib/prefs'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import type { LeadTask } from '@/lib/db/schema'
import { displayDue, displayTime, hasTime, isDueToday, isOverdue, overdueWords } from '@/lib/format'
import { Card, CardEmpty, CardRule } from './card'
import styles from './my-work-card.module.css'

/**
 * Open tasks card — was "MY TASKS" (858:24989 full · 858:24505 due-today only · 858:24171 empty).
 * Open tasks grouped Overdue → Due today → Upcoming, Upcoming collapsed. Each group lists every task it counts:
 * the label prints the real total, so the two rows per group in the mock are its data, not a cap (user 2026-08-30).
 * Spec: design-source/context/lead-overview/05-*.txt.
 */

type GroupKey = 'overdue' | 'today' | 'upcoming'
type Group = { key: GroupKey; label: string; tasks: LeadTask[] }

export function MyWorkCard({ tasks, now, onCreate, onComplete, onOpenTask, onOpenTab, whereOf, quietEmpty }: {
  tasks: LeadTask[]
  now: number
  /** (S42 audit A-06) The Dashboard's empty: one quiet row in place of the mock's first-run state (858:24171), which belongs to a lead or a
      project with no task yet — on the front door its filled button would outrank the page's next step, and "first" is not true there. */
  quietEmpty?: ReactNode
  /** (pending modules S22) The Dashboard's tasks come from every lead and project: each row names where it is, after its kind. */
  whereOf?: (task: LeadTask) => string | null
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

  /* (the Dashboard redesigned, 2026-10-26 — P-13, his Build mark: "Needs attention" means one thing — a project's health, REG-914) the head
     names what it counts, the overdue tasks: "1 task overdue" (the mock's "2 tasks need attention", 858:24989, reversed) */
  const late = overdue.length
  const metaRight = late > 0
    ? `${late} ${late === 1 ? 'task' : 'tasks'} overdue`
    : undefined

  /* (the calm UI build 2026-10-27, 2-28 · W-269) "Open tasks": the card lists every open task on the record, not the viewer's (it read "MY TASKS"
     over James's and nobody's). Today's date left the head — it was the day, not the tasks'. (The tasks carry no members here, so "1 is yours"
     waits for the loader to hand them.) (2-04 · 2-23 · W-384 · W-507) Empty: one plain line and ONE outlined "Add a task" — the page's filled
     button is its header's (T-03); the marketing line went. */
  return (
    <Card
      title="Open tasks"
      headGap={8}
      metaRight={metaRight}
      onOpen={onOpenTab}
      openLabel="Open the tasks"
      testId="my-work"
    >
      {open.length === 0 && quietEmpty ? quietEmpty : open.length === 0 ? (
        <CardEmpty
          illustration="/figma-assets/empty-tasks.svg"
          width={140}
          height={107}
          title="No tasks yet"
          body=""
          gap={20}
          actions={(
            <Button variant="primary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={(e) => onCreate(e.target as HTMLElement)}>
              Add a task
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
                  <TaskRow key={t.id} task={t} group={g.key} now={now} onComplete={onComplete} onOpenTask={onOpenTask} where={whereOf?.(t) ?? null} />
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
function TaskRow({ task, group, now, onComplete, onOpenTask, where }: {
  task: LeadTask
  group: GroupKey
  now: number
  onComplete: (task: LeadTask) => void
  onOpenTask: (task: LeadTask) => void
  /** (pending modules S22) where the task is, on a card that lists more than one record's */
  where?: string | null
}) {
  const due = task.dueAt

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
          {where ? <><span className={styles.dot}>·</span><span className={styles.where}>{where}</span></> : null}
          {/* (Dane UAT 5.13 · 5.05) a due wears its day, and its time when it has one: "Sat, 3 Oct ’26 · 10:00 AM" · "Due today · 10:00 AM" */}
          {group === 'overdue' && due ? (
            <>
              <span className={styles.dot}>·</span>
              <span data-tone="red">{displayDue(due)}</span>
              {/* (the Dashboard redesigned, 2026-10-26 — P-13: "5 days overdue", never "(5d)"; the mock's "(7d overdue)", 858:24989, reversed) */}
              <span className={styles.dot}>·</span>
              <span data-tone="red">{overdueWords(due, now)}</span>
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
