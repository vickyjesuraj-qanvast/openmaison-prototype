'use client'

// (REG-287) The counts are derived per request from the `questions` rows, not stored: this card takes
// `QuestionnaireSummary` (lib/leads/detail.ts), not `LeadQuestionnaire` — the @deprecated row type of the dead
// `lead_questionnaires` table it used to borrow. Type-only import, as every other client reader of that module.
import type { QuestionnaireSummary } from '@/lib/leads/detail'
import { displayDate } from '@/lib/format'
import { Card, CardEmpty } from './card'
import styles from './questionnaire-card.module.css'

/**
 * QUESTIONNAIRE card (858:25077 · empty 858:24219): answered / total progress with client · studio counts.
 * Spec: design-source/context/lead-overview/05-*.txt. The empty state's Add Question went with REG-246 —
 * questions are studio-level setup, not added from a lead.
 */
export function QuestionnaireCard({ q, onAsk, onOpenTab }: {
  q: QuestionnaireSummary | null
  onAsk: () => void
  onOpenTab: () => void
}) {
  const answered = q ? q.clientAnswered + q.studioAnswered : 0
  const pct = q && q.total > 0 ? Math.min(100, (answered / q.total) * 100) : 0

  return (
    <Card
      title="QUESTIONNAIRE"
      headGap={12}
      link={q ? { label: 'Ask Client', onClick: onAsk } : undefined}
      onOpen={onOpenTab}
      openLabel="Open questionnaire"
      testId="questionnaire"
    >
      {q ? (
        <div className={styles.body}>
          <div className={styles.group}>
            <div className={styles.row}>
              <span className={styles.label}>Total questions answered</span>
              <span className={styles.count}>{`${answered} / ${q.total}`}</span>
            </div>
            <div className={styles.track}>
              <div className={styles.bar} style={{ width: `${pct}%` }} />
            </div>
            <div className={styles.legend}>
              <span>{`Client answered: ${q.clientAnswered}`}</span>
              <span>{`Studio answered: ${q.studioAnswered}`}</span>
            </div>
            {/* (REG-609, parity Q-22) The ask is a record now — the portal link's stamp. */}
            {q.askedAt ? <span className={styles.asked} data-testid="asked-on">Client asked on {displayDate(q.askedAt)}</span> : null}
          </div>
        </div>
      ) : (
        <CardEmpty
          illustration="/figma-assets/empty-questionnaire.svg"
          width={140}
          height={120}
          title="No questions yet"
          body="Questions are set up by your studio’s admins and will appear here."
          gap={20}
        />
      )}
    </Card>
  )
}
