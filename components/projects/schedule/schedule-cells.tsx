'use client'

import { Tooltip } from '@/components/om/tooltip'
import { dayLabel, dueWords, type ScheduleFacts } from '@/lib/projects/schedule-model'
import styles from './schedule.module.css'

/* (Projects round 2) The listing's two schedule columns (components/projects/project-columns.tsx `PROJECT_COLUMNS`): Next milestone with its
   day count, and Progress — done of all, the bar easing to its value once. A project with no schedule reads "--". */

export function NextMilestoneCell({ s }: { s: ScheduleFacts | null }) {
  const n = s?.next
  if (!n) return <span className={styles.cellNextDays}>{s?.milestones ? 'All done' : '--'}</span>
  return (
    <Tooltip label={`${n.title} · ends ${dayLabel(n.end)}`}>
      <span className={styles.cellNext}>
        <span className={styles.cellNextName}>{n.title}</span>
        <span className={styles.cellNextDays} data-late={n.late || undefined}>{dueWords(n.days, n.late)}</span>
      </span>
    </Tooltip>
  )
}

export function ProgressCell({ s }: { s: ScheduleFacts | null }) {
  if (!s?.milestones) return <span className={styles.cellNextDays}>--</span>
  return (
    <span className={styles.cellProgress}>
      <span className={styles.progress} role="progressbar" aria-label="Milestones done" aria-valuenow={s.progress.pct} aria-valuemin={0} aria-valuemax={100}><span className={styles.progressFill} style={{ width: `${s.progress.pct}%` }} /></span>
      <span className={styles.cellProgressText}>{s.progress.done} of {s.progress.total}</span>
    </span>
  )
}

/** The export's words for the two columns. */
export const nextMilestoneText = (s: ScheduleFacts | null) => (s?.next ? `${s.next.title} (${dueWords(s.next.days, s.next.late)})` : '')
export const progressText = (s: ScheduleFacts | null) => (s?.milestones ? `${s.progress.done} of ${s.progress.total}` : '')
