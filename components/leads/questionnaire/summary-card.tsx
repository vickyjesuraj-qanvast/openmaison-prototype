'use client'

import { displayDate } from '@/lib/format'
import { answeredLine } from '@/lib/leads/question-model'
import styles from './summary-card.module.css'

/**
 * Lead Details › Questionnaire — summary card (931:47025, 480×136): the head, then the 8px track with the primary fill (answered / total).
 * Spec: design-source/context/lead-questionnaire/01-listing-empty-dialog.txt "Summary card".
 * (the calm UI build 2026-10-27 — 2-18 · W-065, a deliberate change of the mock's three lines) The card says it in ONE line, the Overview card's
 * own: "7 of 11 answered · none by Olivia yet" — "Total questions answered 7 / 11 · Client answered: 0 · Studio answered: 7" said it three
 * times. The head is the house card head, bold sentence case ("Summary"), no capitals.
 */
export function SummaryCard({ total, clientAnswered, studioAnswered, askedAt = null, requiredOpen = 0, client = '' }: { total: number; clientAnswered: number; studioAnswered: number; /** (REG-609) the last Ask the client › Send */ askedAt?: Date | null; /** (REG-647) required questions still unanswered */ requiredOpen?: number
  /** the client's first name ("none by Olivia yet") */ client?: string }) {
  const answered = clientAnswered + studioAnswered
  const pct = total > 0 ? Math.min(100, (answered / total) * 100) : 0
  const who = client.trim() || 'the client'
  return (
    <div className={styles.card} data-testid="questionnaire-summary">
      <div className={styles.head}>
        <span className={styles.title}>Summary</span>
      </div>
      <div className={styles.body}>
        <div className={styles.group}>
          <p className={styles.line} data-testid="questionnaire-line">{answeredLine({ total, clientAnswered, studioAnswered }, client)}</p>
          <div className={styles.track} aria-hidden>
            <div className={styles.bar} style={{ width: `${pct}%` }} />
          </div>
          {requiredOpen ? <span className={styles.asked} data-testid="required-open">{`Required still open · ${requiredOpen}`}</span> : null}
          {askedAt ? <span className={styles.asked} data-testid="asked-on">{`${who === 'the client' ? 'The client was' : `${who} was`} asked on ${displayDate(askedAt)}`}</span> : null}   {/* (REG-609) */}
        </div>
      </div>
    </div>
  )
}
