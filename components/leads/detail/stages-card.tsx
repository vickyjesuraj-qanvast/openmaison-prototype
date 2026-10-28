'use client'

import type { ParkedStep, StageStep } from '@/lib/leads/detail'
import type { LastContact } from '@/lib/leads/queries'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { dayWords, displayDate, displayDateLong, displayDue } from '@/lib/format'
import { channelLabel } from '@/lib/leads/enums'
import { Card, CardRule } from './card'
import styles from './stages-card.module.css'

/** "2 days" / "1 day" — the mock only shows plurals; the singular is a grammar fix, not new copy. (parity P-28 · Q-13) The house duration
    words, `dayWords` (lib/format.ts) — one formatter for every record, listing and report. */
const daysLabel = dayWords

/**
 * LEAD STAGES card (858:24890 New-current · 858:24646 Lost · 858:24709 On Hold).
 * Five 36px stage rows (done · current · future), then — when the lead is parked — a 1px rule and the On Hold / Lost row.
 * Every row is a button that opens the Move stage window at that stage; the head arrow opens the same window
 * at the lead's current position (REG-259, user 2026-09-01 — it navigated to the Activity tab before).
 * Spec: design-source/context/lead-overview/04-cards-stages-files-activity.txt.
 */
export function LeadStagesCard({ timeline, parked, daysInPipeline, blocked, onOpenStage, onOpen, lastContact = null, onOpenContact, nextFollowUp = null, onOpenFollowUp, onSetFollowUp, responseTime = null, onOpenInsights, now, leadName = null }: {
  /** (the calm UI build 2026-10-27 — audit 2-39) the page's clock: a Won lead's row says the day it was won */
  now?: number
  /** (the calm UI build — 2-05) the lead's first name, for the one refusal line a touch screen reads under the stages */
  leadName?: string | null
  /** (REG-608, parity Q-03) The earliest open task with a date; none → the line offers to set one. */
  nextFollowUp?: { id: string; title: string; dueAt: Date; overdue: boolean } | null
  onOpenFollowUp?: () => void
  onSetFollowUp?: () => void
  /** (REG-611, parity R-03) 1.0's Response time card as one line — "Assigned in 30m · First contact in 1.2h · Won in 12 days"; a press opens Insights (Owners and Admins). */
  responseTime?: string | null
  onOpenInsights?: () => void
  timeline: StageStep[]
  parked: ParkedStep | null
  daysInPipeline: number
  /** (REG-600) The latest contact log — the card's foot line; a press opens the Notes tab. */
  lastContact?: LastContact | null
  onOpenContact?: () => void
  /** The shared stage gate (lib/leads/stage-policy blockedReason) — a row it refuses is shown refused, with the reason. */
  blocked?: (stage: string) => string | null
  onOpenStage: (stage: string) => void
  /** The head arrow — the Move stage window at the current position. */
  onOpen: () => void
}) {
  /* (the calm UI build 2026-10-27 — audit 2-05, W-483) A touch screen printed the same refusal under every locked row ("Assign a member first"
     four times): when the locked stages share one reason it is said once, under the stages — "Assign a member to move Olivia on" — and the
     rows keep their lock and their tooltip. */
  const reasons = timeline.filter((st) => st.state === 'future').map((st) => blocked?.(st.stage) ?? null).filter((w): w is string => !!w)
  const shared = reasons.length > 1 && reasons.every((w) => w === reasons[0]) ? reasons[0]! : null
  const sharedLine = shared === 'Assign a member first' ? `Assign a member to move ${leadName || 'this lead'} on` : shared
  const won = timeline.find((st) => st.stage === 'Won' && st.state === 'current')
  /* (2-39) The day a Won lead was won — the stage's calendar days counted back from today (the timeline's own count, lib/leads/detail.ts). */
  const wonOn = won && won.days !== null && now !== undefined ? (() => { const d = new Date(now); d.setDate(d.getDate() - won.days!); return d })() : null
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
      data-logged={step.logged || undefined}
    >
      {/* Completed stages take the FILLED green check, as the Move stage rail and the task tick already do.
          (REG-548) So does a current stage whose log is saved: the fill and "current" still say where the lead is, the
          tick says nothing is owed here — the mock's radio (858:24890) stays for a current stage with nothing logged. */}
      {step.state === 'current' && !step.logged ? <Icon name="radio_button_checked" size={20} className={styles.icon} />
        : step.state === 'done' || step.state === 'current' ? <Icon name="check_circle" size={20} weight={300} fill className={styles.icon} />
        : <Icon name="radio_button_unchecked" size={20} weight={300} className={styles.icon} />}
      <span className={styles.label}>
        <span className={styles.nameGroup}>
          <span className={styles.name}>{step.stage}</span>
          {/* (REG-273) The refusal reason, visible at mobile only — the Tooltip below carries it for a mouse,
              and a tooltip never fires for a touch pointer, so the row had nothing to say on a phone. */}
          {why && why !== shared ? <span className={styles.why}>{why}</span> : null}
        </span>
        <span className={styles.meta}>
          {/* (the calm UI build 2026-10-27 — audit 2-03 · 2-39 · T-08) a future stage says nothing (its empty circle says "not yet"); a Won lead's row
              says the day it was won, not a clock still running on a closed sale; the current stage reads "current" — its days are the head's */}
          {step.state === 'current' && step.stage === 'Won' ? (
            wonOn ? <span>{displayDate(wonOn)}</span> : null
          ) : step.state === 'current' ? (
            <span className={styles.current}>current</span>
          ) : step.state === 'done' && step.days !== null ? (
            <span>{daysLabel(step.days)}</span>
          ) : null}
        </span>
      </span>
      <Icon name="keyboard_arrow_right" size={20} className={styles.chevron} />
    </button>
    )
    return why ? <Tooltip key={step.stage} label={why}>{row}</Tooltip> : row
  })

  const contactDetail = lastContact ? [channelLabel(lastContact.channel), lastContact.outcome].filter(Boolean).join(' · ') : 'None logged yet'
  /* (the calm UI build 2026-10-27 — audit 2-39 · W-467) The head says how long the lead has been where it is — "In New for 50 days" — where it
     said "50 days in pipeline" beside "current · 50 days"; a Won lead reads how long it took ("Took 13 days to win"); a parked lead's own row
     carries its days. */
  const current = timeline.find((st) => st.state === 'current')
  const headMeta = won ? (won.days !== null ? `Took ${daysLabel(Math.max(0, daysInPipeline - won.days))} to win` : undefined)
    : parked ? undefined
    : current && current.days !== null ? `In ${current.stage} for ${daysLabel(current.days)}` : undefined

  return (
    <Card
      title="Lead stages"
      headGap={8}
      metaRight={headMeta}
      onOpen={onOpen}
      openLabel="Open lead stages"
      testId="lead-stages"
    >
      <div className={styles.body} data-parked={parked ? '' : undefined}>
        <div className={styles.group}>{rows}</div>
        {sharedLine ? <p className={styles.whyAll} data-testid="stages-shared-why">{sharedLine}</p> : null}
        {parked ? (
          <>
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
                  {/* (REG-607) The reason the lead was parked, and its detail — 1.0's close wizard records both; the row reads them back. */}
                  {/* (Dane UAT 5.13) On Hold's till is a date to plan by: it wears its day, as the listing's On hold till does. */}
                  {parked.stage === 'On Hold' && parked.till ? (
                    <span className={styles.till}>till {displayDateLong(new Date(parked.till))}{parked.reason ? ` · ${parked.reason}` : ''}</span>
                  ) : parked.reason ? (
                    <span className={styles.till} title={`${parked.reason}${parked.detail ? ` · ${parked.detail}` : ''}`}>{parked.reason}{parked.detail ? ` · ${parked.detail}` : ''}</span>
                  ) : null}
                </span>
                <span className={styles.meta}><span>{daysLabel(parked.days)}</span></span>
              </span>
              <Icon name="keyboard_arrow_right" size={20} className={styles.chevron} />
            </button>
          </>
        ) : null}
        {/* (REG-600 · REG-608 · REG-611, restyled REG-614) The lead's follow-up lines — last contact, next follow-up, response time —
            after the stages, on the stage rows' own grammar (a 36px row: icon 20 · name · caption · meta · chevron), past a rule as
            the parked row is. They were grey boxes with uppercase labels above the stages (the owner, 2026-09-24: "visually off"). */}
        <CardRule inset={0} />
        <div className={styles.group} data-testid="follow-up-lines">
          <button type="button" className={styles.row} data-testid="last-contact" data-line="" data-empty={lastContact ? undefined : ''} onClick={onOpenContact}>
            <Icon name="chat" size={20} weight={300} className={styles.icon} />
            <span className={styles.label}>
              <span className={styles.nameGroup}>
                <span className={styles.name}>Last contact</span>
                {contactDetail ? <span className={styles.till}>{contactDetail}</span> : null}
              </span>
              {lastContact ? <span className={styles.meta}><span>{displayDate(lastContact.at)}</span></span> : null}   {/* the date alone — the time is the Notes tab's; (T-08) none, nothing */}
            </span>
            <Icon name="keyboard_arrow_right" size={20} className={styles.chevron} />
          </button>
          <button type="button" className={styles.row} data-testid="next-follow-up" data-line="" data-empty={nextFollowUp ? undefined : ''} data-wrap="" onClick={nextFollowUp ? onOpenFollowUp : onSetFollowUp}>
            <Icon name="event" size={20} weight={300} className={styles.icon} />
            <span className={styles.label}>
              <span className={styles.nameGroup}>
                <span className={styles.name}>Next follow-up</span>
                <span className={styles.till}>{nextFollowUp ? nextFollowUp.title : 'None — add one'}</span>   {/* (the calm UI build — W-570) the row's press sets one */}
              </span>
              <span className={styles.meta}>
                {nextFollowUp?.overdue ? <><span className={styles.overdue} data-overdue="">overdue</span><span className={styles.dot}>·</span></> : null}
                {nextFollowUp ? <span>{displayDue(nextFollowUp.dueAt)}</span> : null}   {/* (Dane UAT 5.05 · 5.13) date · time, as REG-608 has it: "Sat, 3 Oct ’26 · 10:00 AM" */}
              </span>
            </span>
            <Icon name="keyboard_arrow_right" size={20} className={styles.chevron} />
          </button>
          {responseTime ? (
            onOpenInsights ? (
              <button type="button" className={styles.row} data-testid="response-time" data-line="" onClick={onOpenInsights}>
                <Icon name="hourglass_top" size={20} weight={300} className={styles.icon} />
                <span className={styles.label}>
                  <span className={styles.nameGroup}>
                    <span className={styles.name}>Response time</span>
                    <span className={styles.till}>{responseTime}</span>
                  </span>
                </span>
                <Icon name="keyboard_arrow_right" size={20} className={styles.chevron} />
              </button>
            ) : (
              <div className={styles.row} data-testid="response-time" data-line="" data-static="">
                <Icon name="hourglass_top" size={20} weight={300} className={styles.icon} />
                <span className={styles.label}>
                  <span className={styles.nameGroup}>
                    <span className={styles.name}>Response time</span>
                    <span className={styles.till}>{responseTime}</span>
                  </span>
                </span>
              </div>
            )
          ) : null}
        </div>
      </div>
    </Card>
  )
}
