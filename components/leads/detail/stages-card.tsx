'use client'

import type { ParkedStep, StageStep } from '@/lib/leads/detail'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { displayDate } from '@/lib/format'
import { Card, CardRule } from './card'
import styles from './stages-card.module.css'

/** "2 days" / "1 day" — the mock only shows plurals; the singular is a grammar fix, not new copy. */
const daysLabel = (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`

/**
 * LEAD STAGES card (858:24890 New-current · 858:24646 Lost · 858:24709 On Hold).
 * Five 36px stage rows (done · current · future), then — when the lead is parked — a 1px rule and the On Hold / Lost row.
 * Every row is a button that opens the Move stage window at that stage; the arrow opens the Stages tab.
 * Spec: design-source/context/lead-overview/04-cards-stages-files-activity.txt.
 */
export function LeadStagesCard({ timeline, parked, daysInPipeline, blocked, onOpenStage, onOpenTab }: {
  timeline: StageStep[]
  parked: ParkedStep | null
  daysInPipeline: number
  /** The shared stage gate (lib/leads/stage-policy blockedReason) — a row it refuses is shown refused, with the reason. */
  blocked?: (stage: string) => string | null
  onOpenStage: (stage: string) => void
  onOpenTab: () => void
}) {
  const rows = timeline.map((step) => {
    // A Lost lead's un-reached stages are not somewhere to go — the way back is the stage it stopped at (REG-225).
    const why = step.state === 'future' ? blocked?.(step.stage) ?? null : null
    const row = (
    <button
      key={step.stage}
      type="button"
      className={styles.row}
      data-state={step.state}
      data-blocked={why ? '' : undefined}
      aria-disabled={why ? true : undefined}
      onClick={why ? undefined : () => onOpenStage(step.stage)}
      aria-current={step.state === 'current' ? 'step' : undefined}
    >
      {/* Completed stages take the FILLED green check, as the Move stage rail and the task tick already do. */}
      {step.state === 'current' ? <Icon name="radio_button_checked" size={20} className={styles.icon} />
        : step.state === 'done' ? <Icon name="check_circle" size={20} weight={300} fill className={styles.icon} />
        : <Icon name="radio_button_unchecked" size={20} weight={300} className={styles.icon} />}
      <span className={styles.label}>
        <span className={styles.nameGroup}><span className={styles.name}>{step.stage}</span></span>
        <span className={styles.meta}>
          {step.state === 'current' ? (
            <>
              <span className={styles.current}>current</span>
              <span className={styles.dot}>·</span>
              <span>{step.days === null ? '--' : daysLabel(step.days)}</span>
            </>
          ) : step.state === 'done' ? (
            <span>{step.days === null ? '--' : daysLabel(step.days)}</span>
          ) : (
            <span>--</span>
          )}
        </span>
      </span>
      <Icon name="keyboard_arrow_right" size={20} className={styles.chevron} />
    </button>
    )
    return why ? <Tooltip key={step.stage} label={why}>{row}</Tooltip> : row
  })

  return (
    <Card
      title="Lead stages"
      headGap={8}
      metaRight={`${daysLabel(daysInPipeline)} in pipeline`}
      onOpen={onOpenTab}
      openLabel="Open lead stages"
      testId="lead-stages"
    >
      {parked ? (
        <div className={styles.body} data-parked="">
          <div className={styles.group}>{rows}</div>
          <CardRule inset={0} />
          <button
            type="button"
            className={styles.row}
            data-state={parked.stage === 'Lost' ? 'lost' : 'hold'}
            onClick={() => onOpenStage(parked.stage)}
          >
            {/* Lost takes the FILLED cancel, as every other status glyph on this card is now filled (REG-222). */}
            {parked.stage === 'Lost'
              ? <Icon name="cancel" size={20} weight={300} fill className={styles.icon} />
              : <Icon name="timelapse" size={20} className={styles.icon} />}
            <span className={styles.label}>
              <span className={styles.nameGroup}>
                <span className={styles.name}>{parked.stage}</span>
                {parked.stage === 'On Hold' && parked.till ? (
                  <span className={styles.till}>till {displayDate(new Date(parked.till))}</span>
                ) : null}
              </span>
              <span className={styles.meta}><span>{daysLabel(parked.days)}</span></span>
            </span>
            <Icon name="keyboard_arrow_right" size={20} className={styles.chevron} />
          </button>
        </div>
      ) : (
        <div className={styles.body}>{rows}</div>
      )}
    </Card>
  )
}
