'use client'

import { Button } from '@/components/ds'
import type { LeadQuestionnaire } from '@/lib/db/schema'
import { Card, CardEmpty } from './card'
import styles from './questionnaire-card.module.css'

/**
 * QUESTIONNAIRE card (858:25077 · empty 858:24219): answered / total progress with client · studio counts.
 * Spec: design-source/context/lead-overview/05-*.txt.
 */
export function QuestionnaireCard({ q, onAsk, onAdd, onOpenTab }: {
  q: LeadQuestionnaire | null
  onAsk: () => void
  onAdd: () => void
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
          </div>
        </div>
      ) : (
        <CardEmpty
          illustration="/figma-assets/empty-questionnaire.svg"
          width={140}
          height={120}
          title="Create your first question"
          body="Create and share your questions to clarify the client’s scope."
          gap={20}
          actions={<Button onPress={onAdd}>Add Question</Button>}
        />
      )}
    </Card>
  )
}
