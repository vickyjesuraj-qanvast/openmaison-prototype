'use client'

import { displayDate } from '@/lib/format'
import styles from './summary-card.module.css'

/**
 * Lead Details › Questionnaire — summary card (931:47025, 480×136): head 48 "QUESTIONNAIRE SUMMARY" 12/Semi Bold #666666,
 * body = the overview QUESTIONNAIRE card's body (components/leads/detail/questionnaire-card.tsx): "Total questions
 * answered" · "n / total", the 8px track with the primary fill (answered / total), legend "Client answered: n" ·
 * "Studio answered: n". Spec: design-source/context/lead-questionnaire/01-listing-empty-dialog.txt "Summary card".
 */
export function SummaryCard({ total, clientAnswered, studioAnswered, askedAt = null, requiredOpen = 0 }: { total: number; clientAnswered: number; studioAnswered: number; /** (REG-609) the last Ask the client › Send */ askedAt?: Date | null; /** (REG-647) required questions still unanswered */ requiredOpen?: number }) {
  const answered = clientAnswered + studioAnswered
  const pct = total > 0 ? Math.min(100, (answered / total) * 100) : 0
  return (
    <div className={styles.card} data-testid="questionnaire-summary">
      <div className={styles.head}>
        <span className={styles.title}>QUESTIONNAIRE SUMMARY</span>
      </div>
      <div className={styles.body}>
        <div className={styles.group}>
          <div className={styles.row}>
            <span className={styles.label}>Total questions answered</span>
            <span className={styles.count}>{`${answered} / ${total}`}</span>
          </div>
          <div className={styles.track}>
            <div className={styles.bar} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.legend}>
            <span>{`Client answered: ${clientAnswered}`}</span>
            <span>{`Studio answered: ${studioAnswered}`}</span>
            {requiredOpen ? <span data-testid="required-open">{`Required still open: ${requiredOpen}`}</span> : null}
          </div>
          {askedAt ? <span className={styles.asked} data-testid="asked-on">Client asked on {displayDate(askedAt)}</span> : null}   {/* (REG-609) */}
        </div>
      </div>
    </div>
  )
}
