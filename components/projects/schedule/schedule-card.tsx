'use client'

import { Icon } from '@/components/om/icon'
import { Card, CardRule } from '@/components/leads/detail/card'
import { dateOfDay, dayOf, dueWords, type ScheduleFacts } from '@/lib/projects/schedule-model'
import { dayWords, displayDate } from '@/lib/format'   // (fix-A, A-39) one date format on the Overview · (parity P-28) days in words
import overview from '../project-overview.module.css'
import styles from './schedule.module.css'

const ICON: Record<string, string> = { done: 'check_circle', in_progress: 'radio_button_checked', blocked: 'pending', not_started: 'radio_button_unchecked' }

/**
 * (Projects round 2) The Overview's Schedule card, under Status: how far the job is (done of all, the bar easing to its value once on arrival)
 * and the next two milestones with their day counts — the LEAD STAGES row inside the lead Overview's card (REG-614). The arrow opens the
 * Schedule tab.
 */
export function ScheduleCard({ s, now, onOpen }: { s: { facts: ScheduleFacts; next: { id: string; title: string; start: number; end: number; status: string }[] }; now: number; onOpen: () => void }) {
  const today = dayOf(new Date(now))
  const { facts } = s
  return (
    <Card title="Schedule" headGap={8} metaRight={`${facts.progress.done} of ${facts.progress.total} done`} onOpen={onOpen} openLabel="Open the schedule" testId="schedule">
      <div className={overview.body}>
        <div className={styles.progress} role="progressbar" aria-label="Milestones done" aria-valuenow={facts.progress.pct} aria-valuemin={0} aria-valuemax={100}>
          <span className={styles.progressFill} style={{ width: `${facts.progress.pct}%` }} />
        </div>
        {/* (parity P-05 · A-19) a rule separates two groups — a finished schedule has no next milestone, so no rule and no empty group */}
        {s.next.length ? <CardRule inset={0} /> : null}
        {s.next.length ? <div className={overview.group}>
          {s.next.map((m) => {
            const late = m.status !== 'done' && m.end < today
            const running = m.status === 'in_progress' || m.status === 'blocked'
            const days = Math.abs((running || late ? m.end : m.start) - today)
            return (
              <div key={m.id} className={overview.row} data-static="" data-alert={late || undefined} data-testid="schedule-next">
                <Icon name={late ? 'warning' : ICON[m.status] ?? 'radio_button_unchecked'} size={20} weight={300} className={overview.icon} />
                <span className={overview.label}>
                  <span className={overview.nameGroup}><span className={overview.name}>{m.title}</span><span className={overview.till}>{running || late ? `Ends ${displayDate(dateOfDay(m.end))}` : `Starts ${displayDate(dateOfDay(m.start))}`}</span></span>
                  <span className={overview.meta}>{running || late ? dueWords(days, late) : days === 0 ? 'starts today' : `starts in ${dayWords(days)}`}</span>
                </span>
              </div>
            )
          })}
        </div> : null}
      </div>
    </Card>
  )
}
