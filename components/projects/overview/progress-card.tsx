'use client'

import { Card, CardRule } from '@/components/leads/detail/card'
import { calendarDaysBetween, dayWords, displayDate } from '@/lib/format'
import { STAGE_LABEL, PROJECT_STAGES, type ProjectStage } from '@/lib/projects/model'
import type { ProjectDetail } from '@/lib/projects/queries'
import type { SetupAction } from '@/lib/projects/getting-started'
import { calendarDays } from '@/lib/projects/attention'
import { resumeDue, resumeLine } from '@/lib/projects/hold'   // (gaps build, package A — M-01)
import type { ProjectStep } from '../project-overview'
import { Row } from './row'
import styles from '../project-overview.module.css'

/* (parity P-28 · P-29) calendar days in words — the house helpers (lib/format.ts); (fix-B, B-21) calendar days, as the Schedule counts them */
const days = dayWords
const daysBetween = (a: number, b: number) => Math.max(0, calendarDaysBetween(a, b))

/**
 * (simplify S-01, P1 §6.3) PROGRESS — the Project stages card with the Schedule card folded in: its head the record's age ("62 days since Won",
 * parity Q-17), the three stage rows pressing into their steps (parity P-05 · A-07), the schedule's bar ("3 of 7 milestones"), Start · Target end
 * with the days left, and the hold's row when on hold (its Resume and Change are Needs you's first row now). ↗ the Schedule. Setting up shows
 * the stage rows only — the Start step asks for the date. Words invented (Q-12): *Progress*.
 */
export function ProgressCard({ d, onStep, onSetup, onOpenSchedule }: {
  d: ProjectDetail
  onStep?: (step: ProjectStep) => void
  onSetup: (run: SetupAction | 'invite', el?: HTMLElement) => void
  onOpenSchedule: () => void
}) {
  const { project: p, lead, now } = d
  const stageIdx = PROJECT_STAGES.indexOf(p.stage)
  const since = (s: ProjectStage): number | null => (s === 'setting_up' ? p.createdAt.getTime() : s === 'in_progress' ? p.startedAt?.getTime() ?? null : p.completedAt?.getTime() ?? null)
  const left = p.targetEndDate ? calendarDays(now, p.targetEndDate.getTime()) : null
  const done = p.stage === 'completed' && !!p.completedAt   // (fix-E, E-19)
  const hold = p.hold ?? null
  const head = p.stage === 'completed' ? (p.completedAt ? `Took ${days(daysBetween(d.wonAt.getTime(), p.completedAt.getTime()))}` : 'Completed')
    : `${days(daysBetween(d.wonAt.getTime(), now))} since ${lead.direct ? 'added' : 'Won'}`
  const stepOf = (s: ProjectStage, state: 'done' | 'current' | 'future'): ProjectStep | null => {
    if (!onStep) return null
    if (hold) return s === 'in_progress' && state === 'current' && d.mayChange ? 'resume' : null
    if (s === 'setting_up' && state === 'current') return d.mayChange ? 'start' : null
    if (s === 'in_progress' && state === 'future') return d.mayChange ? 'start' : null
    if (s === 'completed' && state === 'future' && p.stage === 'in_progress') return d.ending.mayHandover ? 'handover' : null
    if (s === 'completed' && state === 'done') return d.ending.runs ? 'reopen' : null
    return null
  }
  const prog = d.schedule?.facts.progress ?? null
  const settingUp = p.stage === 'setting_up'
  return (
    <div data-card="progress">
      <Card title="Progress" headGap={8} metaRight={head} testId="status" onOpen={onOpenSchedule} openLabel="Open the schedule">
        <div className={styles.body}>
          {/* (simplify round 3) on a phone the stage rows fold — the header's Stage ▾ names the stage and runs every step they ran; the rule
              under them goes with them (project-overview.module.css `.fold`). Setting up keeps them: they are the card then. */}
          <div className={styles.fold} data-phone-fold={settingUp ? undefined : ''}>
          <div className={styles.group}>
            {PROJECT_STAGES.map((s, i) => {
              if (done && s === 'completed') { const st = stepOf(s, 'done'); return <Row key={s} icon="check_circle" iconFill state="done" name={STAGE_LABEL[s]} meta={displayDate(p.completedAt!)} onPress={st ? () => onStep!(st) : undefined} testId={`stage-${s}`} /> }
              const state = i < stageIdx ? 'done' : i === stageIdx ? 'current' : 'future'
              const step = stepOf(s, state)
              const at = since(s)
              const next = PROJECT_STAGES[i + 1] ? since(PROJECT_STAGES[i + 1]!) : null
              const meta = state === 'current' ? <><span className={styles.current}>current</span><span>·</span><span>{at !== null ? days(daysBetween(at, now)) : '--'}</span></>
                : state === 'done' ? (at !== null && next !== null ? days(daysBetween(at, next)) : '--') : '--'
              return <Row key={s} icon={state === 'future' ? 'radio_button_unchecked' : state === 'done' ? 'check_circle' : 'radio_button_checked'} iconFill={state === 'done'} state={state} name={STAGE_LABEL[s]} meta={meta}
                          onPress={step ? () => onStep!(step) : undefined} testId={`stage-${s}`} />
            })}
          </div>
          </div>
          {hold ? (
            <>
              <CardRule inset={0} />
              <div className={styles.group} data-testid="status-hold">
                {/* (gaps build, package A — M-01) since when — (the calm UI build 2026-10-27, 3-31 · T-04) said once: the hold's day, its reason and
                    when it resumes are its Needs your attention row; Progress adds the number, how long it has been on hold, and who reads why */}
                <Row icon="pending" state={resumeDue(hold, now) ? 'alert' : undefined} name="On hold" meta={days(daysBetween(hold.since, now))} testId="status-hold-row" />
                <p className={styles.note} data-testid="status-hold-reason">{hold.reason ? `${lead.name.split(/\s+/)[0]} reads the reason on their schedule.` : `${resumeLine(hold, now)}.`}</p>
              </div>
            </>
          ) : null}
          {prog && prog.total && !settingUp ? (
            <>
              <CardRule inset={0} />
              <div className={styles.group} data-testid="progress-milestones">
                <Row icon="flag" name={`${prog.done} of ${prog.total} milestones`} meta={`${prog.pct}%`} onPress={onOpenSchedule} testId="progress-bar-row" />
                <div className={styles.bar} role="progressbar" aria-label="Milestones done" aria-valuenow={prog.pct} aria-valuemin={0} aria-valuemax={100}>
                  <span className={styles.barFill} style={{ width: `${prog.pct}%` }} />
                </div>
              </div>
            </>
          ) : null}
          {settingUp ? null : (
            <>
              <CardRule inset={0} />
              <div className={styles.group}>
                <Row icon="event" name="Start date" meta={p.startDate ? displayDate(p.startDate) : '--'} onPress={d.mayChange && p.stage !== 'completed' ? () => onSetup('dates:start') : undefined} testId="status-start" />
                <Row icon="flag" name="Target end" state={left !== null && left < 0 && p.stage !== 'completed' ? 'alert' : undefined}
                     caption={left !== null && p.stage !== 'completed' ? (left < 0 ? `${days(-left)} late` : left === 0 ? 'today' : `${days(left)} left`) : undefined}
                     meta={p.targetEndDate ? displayDate(p.targetEndDate) : '--'} onPress={d.mayChange && p.stage !== 'completed' ? () => onSetup('dates:end') : undefined} testId="status-end" />
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
