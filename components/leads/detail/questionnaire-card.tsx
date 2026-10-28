'use client'

// (REG-287) The counts are derived per request from the `questions` rows, not stored: this card takes
// `QuestionnaireSummary` (lib/leads/detail.ts), not `LeadQuestionnaire` — the @deprecated row type of the dead
// `lead_questionnaires` table it used to borrow. Type-only import, as every other client reader of that module.
import type { QuestionnaireSummary } from '@/lib/leads/detail'
import { displayDate } from '@/lib/format'
import { answeredLine, clientFirst } from '@/lib/leads/question-model'
import { HelpLink } from '@/components/company/help-link'
import { Card, CardEmpty } from './card'
import styles from './questionnaire-card.module.css'

/**
 * QUESTIONNAIRE card (858:25077 · empty 858:24219): answered / total progress with client · studio counts.
 * Spec: design-source/context/lead-overview/05-*.txt. The empty state's Add Question went with REG-246 —
 * questions are studio-level setup, not added from a lead.
 * (the calm UI build 2026-10-27 — 2-18 · W-065 · W-008 · W-330, a deliberate change of the mock's three lines) One line, the tab's summary's
 * own — "7 of 11 answered · none by Olivia yet" — under the track; the head's link asks the client by name ("Ask Olivia"); the title in the
 * house head's sentence case. `client` = the lead's name (its first word is used); `setUpHref` = Company › Questionnaire for whoever may set
 * the questions up — the empty card then links there.
 */
export function QuestionnaireCard({ q, onAsk, onOpenTab, client = '', setUpHref = null }: {
  q: QuestionnaireSummary | null
  onAsk: () => void
  onOpenTab: () => void
  /** the client's name — "Ask Olivia", "none by Olivia yet" */
  client?: string
  /** Company › Questionnaire, for an Owner or an Admin */
  setUpHref?: string | null
}) {
  const answered = q ? q.clientAnswered + q.studioAnswered : 0
  const pct = q && q.total > 0 ? Math.min(100, (answered / q.total) * 100) : 0
  const first = clientFirst(client)

  return (
    <Card
      title="Questionnaire"
      headGap={12}
      link={q ? { label: first ? `Ask ${first}` : 'Ask the client', onClick: onAsk } : undefined}
      onOpen={onOpenTab}
      openLabel="Open questionnaire"
      testId="questionnaire"
    >
      {q ? (
        <div className={styles.body}>
          <div className={styles.group}>
            <p className={styles.line} data-testid="questionnaire-line">{answeredLine(q, first)}</p>
            <div className={styles.track} aria-hidden>
              <div className={styles.bar} style={{ width: `${pct}%` }} />
            </div>
            {/* (REG-609, parity Q-22) The ask is a record now — the portal link's stamp. */}
            {q.askedAt ? <span className={styles.asked} data-testid="asked-on">{`${first || 'The client'} was asked on ${displayDate(q.askedAt)}`}</span> : null}
          </div>
        </div>
      ) : (
        <CardEmpty
          illustration="/figma-assets/empty-questionnaire.svg"
          width={140}
          height={120}
          title="No questions yet"
          body="Your studio sets them up in Company › Questionnaire."
          actions={setUpHref ? <HelpLink href={setUpHref} standalone testId="questionnaire-card-set-up">Set up questions</HelpLink> : undefined}
          gap={20}
        />
      )}
    </Card>
  )
}
