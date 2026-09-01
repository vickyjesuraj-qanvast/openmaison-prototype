'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { useRun } from '@/components/leads/tasks/use-run'
import type { LeadQuestionsData } from '@/lib/leads/questions'
import { summarise } from '@/lib/leads/question-model'
import { answerQuestion } from '@/app/leads/questions-actions'
import { QuestionCard } from './question-card'
import { SummaryCard } from './summary-card'
import { QuestionnaireEmpty } from './questionnaire-empty'
import { AskClientDialog } from './ask-client-dialog'
import styles from './lead-questionnaire.module.css'

/**
 * Lead Details › Questionnaire (section 931-46769: 201 empty 931:46770 · 177 Ask the client 931:46853 · 202 listing 931:46954;
 * spec design-source/context/lead-questionnaire/01-listing-empty-dialog.txt, plan 00-build-plan.md): the tab's state —
 * toolbar ("All Questions" + Ask Client, disabled until a question exists), the empty state or the H g24 layout
 * (questions column 740 of cards + the summary card 480), one card answering at a time, and the Ask the client dialog.
 * Questions are NOT added here (REG-246, user 2026-09-01): admins/owners add them at studio level, under a Company tab
 * later — the REG-188 add card, the foot link and the Overview card's Add Question are all removed; `createQuestion`
 * stays in questions-actions for that flow. Failures use the tabs' shared `useRun` message.
 * Answers from this side are always "By Studio" (REG-189); Save → `answerQuestion` → "Answer saved";
 * Send Notification → "Notification sent to <lead>" (REG-188).
 */
export function LeadQuestionnaire({ data }: { data: LeadQuestionsData }) {
  const { questions, leadName, now } = data
  const snackbar = useSnackbar()
  const { fail } = useRun()

  /* ── state ── */
  const [answering, setAnswering] = useState<string | null>(null)   // the one card in `answer` mode
  const [askOpen, setAskOpen] = useState(false)
  const [saving, setSaving] = useState(false)                       // an answer save in flight

  const summary = summarise(questions)

  /* ── actions ── */
  const saveAnswer = async (id: string, value: string | string[]) => {
    setSaving(true)
    try { await answerQuestion(id, value); setAnswering(null); snackbar({ message: 'Answer saved' }) }
    catch { fail('save the answer') }
    finally { setSaving(false) }
  }
  const send = () => { setAskOpen(false); snackbar({ message: `Notification sent to ${leadName}` }) }

  const noQuestions = questions.length === 0
  const askButton = (
    <span className={styles.anchor}>
      {/* Frame 201: State=Disabled while there are no questions; the tooltip explains the lock (REG-75). */}
      <Button variant="primary" appearance="outlined" isDisabled={noQuestions} onPress={() => setAskOpen(true)}>Ask Client</Button>
    </span>
  )

  return (
    <div className={styles.tab} data-testid="lead-questionnaire">
      <div className={styles.bar}>
        <h2 className={styles.title}>All Questions</h2>
        {noQuestions ? <Tooltip label="No questions yet">{askButton}</Tooltip> : askButton}
      </div>

      {noQuestions ? (
        <QuestionnaireEmpty />
      ) : (
        <div className={styles.layout}>
          <div className={styles.questions}>
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                now={now}
                mode={answering === q.id ? 'answer' : 'view'}
                onAnswer={() => { setAnswering(q.id) }}
                onCancel={() => { setAnswering((cur) => (cur === q.id ? null : cur)) }}
                onSave={(value: string | string[]) => { void saveAnswer(q.id, value) }}
                saving={saving && answering === q.id}
              />
            ))}
          </div>
          {summary ? (
            <div className={styles.summary}>
              <SummaryCard total={summary.total} clientAnswered={summary.clientAnswered} studioAnswered={summary.studioAnswered} />
            </div>
          ) : null}
        </div>
      )}

      <AskClientDialog open={askOpen} leadName={leadName} onClose={() => setAskOpen(false)} onSend={send} />
    </div>
  )
}
