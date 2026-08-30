'use client'

import { useCallback, useState } from 'react'
import { Button, Link } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { useRun } from '@/components/leads/tasks/use-run'
import { CREATE_EVENTS, useCreateIntent } from '@/components/leads/tasks/use-create-intent'
import type { LeadQuestionsData } from '@/lib/leads/questions'
import { summarise, type QuestionType } from '@/lib/leads/question-model'
import { answerQuestion, createQuestion } from '@/app/leads/questions-actions'
import { QuestionCard } from './question-card'
import { AddQuestionCard } from './add-question-card'
import { SummaryCard } from './summary-card'
import { QuestionnaireEmpty } from './questionnaire-empty'
import { AskClientDialog } from './ask-client-dialog'
import styles from './lead-questionnaire.module.css'

/**
 * Lead Details › Questionnaire (section 931-46769: 201 empty 931:46770 · 177 Ask the client 931:46853 · 202 listing 931:46954;
 * spec design-source/context/lead-questionnaire/01-listing-empty-dialog.txt, plan 00-build-plan.md): the tab's state —
 * toolbar ("All Questions" + Ask Client, disabled until a question exists), the empty state or the H g24 layout
 * (questions column 740 of cards + the summary card 480), one card answering at a time, the add card (invented, REG-188),
 * and the Ask the client dialog. Failures use the tabs' shared `useRun` message; the `?new=1` landing param and the
 * `om:questionnaire:add` event go through `useCreateIntent` (questions-actions revalidates this route — no client refresh).
 * Answers from this side are always "By Studio" (REG-189); Save → `answerQuestion` → "Answer saved";
 * Add → `createQuestion` → "Question added"; Send Notification → "Notification sent to <lead>" (REG-188).
 */
export function LeadQuestionnaire({ leadId, data }: { leadId: string; data: LeadQuestionsData }) {
  const { questions, leadName, now } = data
  const snackbar = useSnackbar()
  const { fail } = useRun()

  /* ── state ── */
  const [answering, setAnswering] = useState<string | null>(null)   // the one card in `answer` mode
  const [adding, setAdding] = useState(false)                       // the add card at the foot of the column
  const [askOpen, setAskOpen] = useState(false)
  const [saving, setSaving] = useState(false)                       // an answer save in flight
  const [savingQuestion, setSavingQuestion] = useState(false)       // a createQuestion in flight (double Save / Enter-then-click guard)

  const summary = summarise(questions)

  /** Overview › QUESTIONNAIRE › Add Question and the empty state's button both start the add card (one at a time). */
  const startAdding = useCallback(() => setAdding(true), [])

  // Overview › QUESTIONNAIRE "Add Question" lands here with ?new=1 (the add card opens once, then the param is dropped —
  // as lead-quotes.tsx / lead-contracts.tsx); on this tab the card raises `om:questionnaire:add`.
  useCreateIntent({ event: CREATE_EVENTS.questionnaire, landing: { href: `/leads/${leadId}/questionnaire` }, onIntent: startAdding })

  /* ── actions ── */
  const saveAnswer = async (id: string, value: string | string[]) => {
    setSaving(true)
    try { await answerQuestion(id, value); setAnswering(null); snackbar({ message: 'Answer saved' }) }
    catch { fail('save the answer') }
    finally { setSaving(false) }
  }
  const addQuestion = async (text: string, type: QuestionType, options: string[]) => {
    if (savingQuestion) return
    setSavingQuestion(true)
    try { await createQuestion(leadId, text, type, options); setAdding(false); snackbar({ message: 'Question added' }) }
    catch { fail('add the question') }
    finally { setSavingQuestion(false) }
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
        {noQuestions ? <Tooltip label="Add a question first">{askButton}</Tooltip> : askButton}
      </div>

      {noQuestions && !adding ? (
        <QuestionnaireEmpty onAdd={startAdding} />
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
            {adding ? (
              <AddQuestionCard saving={savingQuestion} onCancel={() => setAdding(false)} onSave={(text: string, type: QuestionType, options: string[]) => { void addQuestion(text, type, options) }} />
            ) : (
              /* Bottom bar — the Tasks table's "Add Task" link (902:26450, tasks-table.tsx .foot): Link text Primary, leading add (REG-188). */
              <div className={styles.foot}>
                <Link variant="primary" iconStart={<Icon name="add" size={20} />} onPress={startAdding}>
                  Add Question
                </Link>
              </div>
            )}
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
