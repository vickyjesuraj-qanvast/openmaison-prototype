'use client'

import { useRouter } from 'next/navigation'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { useRun } from '@/components/leads/tasks/use-run'
import type { LeadQuestionsData } from '@/lib/leads/questions'
import { summarise } from '@/lib/leads/question-model'
import { answerQuestion, askClientQuestions } from '@/app/leads/questions-actions'
import { QuestionCard } from './question-card'
import { SummaryCard } from './summary-card'
import { QuestionnaireEmpty } from './questionnaire-empty'
import { AskClientDialog } from './ask-client-dialog'
import { addStudioQuestions } from '@/app/leads/questions-actions'
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
 * "Send via WhatsApp" (REG-288) → "Notification sent to <lead>" (REG-188).
 */
export function LeadQuestionnaire({ data }: { data: LeadQuestionsData }) {
  const { questions, leadName, now, askedAt, leadId, bankCount, askedOn } = data
  const snackbar = useSnackbar()
  const router = useRouter()
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
  /* (REG-609, parity Q-22) The ask is recorded on the portal link, then the notice — "Client asked on …" joins the summary.
     (UX audit 2026-09-30, T12) It names what it asked: the ticked questions go on the record (each card then wears "Asked · 30 Sep") and the
     snackbar says how many went to whom. */
  const unanswered = questions.filter((q) => !q.answeredBy).map((q) => ({ id: q.id, text: q.text }))
  const send = (ids?: string[]) => {
    setAskOpen(false)
    const list = ids ?? unanswered.map((q) => q.id)
    void (async () => {
      try {
        const r = await askClientQuestions(leadId, list)
        if (typeof r !== 'number') { fail('ask the client', r.error); return }
        snackbar({ message: `${r === 1 ? '1 question' : `${r} questions`} sent to ${leadName}` }); router.refresh()
      } catch { fail('record the ask') }
    })()
  }

  const noQuestions = questions.length === 0
  /* (REG-612, parity Q-21) The bank's enabled questions this lead lacks, added on a press. */
  const addBank = () => { void (async () => { try { const n = await addStudioQuestions(leadId); snackbar({ message: `${n} question${n === 1 ? '' : 's'} added` }); router.refresh() } catch { snackbar({ message: 'Couldn’t add the questions — please try again' }) } })() }
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
        {!noQuestions && bankCount > 0 ? <Button appearance="text" onPress={addBank}>{`Add the studio’s ${bankCount} new question${bankCount === 1 ? '' : 's'}`}</Button> : null}   {/* (REG-612) */}
        {noQuestions ? <Tooltip label="No questions yet">{askButton}</Tooltip> : askButton}
      </div>

      {noQuestions ? (
        <QuestionnaireEmpty bankCount={bankCount} onAddBank={addBank} />
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
                askedAt={askedOn[q.id] ?? null}   /* (T12) the card says it was asked, and when */
              />
            ))}
          </div>
          {summary ? (
            <div className={styles.summary}>
              <SummaryCard total={summary.total} clientAnswered={summary.clientAnswered} studioAnswered={summary.studioAnswered} askedAt={askedAt} requiredOpen={questions.filter((q) => q.required && !q.answeredBy).length} />
            </div>
          ) : null}
        </div>
      )}

      <AskClientDialog open={askOpen} leadName={leadName} onClose={() => setAskOpen(false)} onSend={send} questions={unanswered} />
    </div>
  )
}
