'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReadOnlyScope } from '@/components/om/read-only'
import { useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { AnswerInput } from '@/components/leads/questionnaire/question-card'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { answerQuestions } from '@/app/portal/actions'
import { parseMulti, validateAnswer } from '@/lib/leads/question-model'
import { portalPath } from '@/lib/portal/model'
import type { Question } from '@/lib/db/schema'
import type { PortalData, PortalQuestion } from '@/lib/portal/home'
import { PortalFrame } from './portal-frame'
import { usePortalSay } from './use-portal-say'
import { PortalQuestionsGhost } from './portal-ghosts'
import styles from './portal.module.css'

/** (fix-F, F-05) The field's label in the client's words — the question above it is what it asks; never the studio's type names. */
const CLIENT_LABEL: Record<string, string> = { text: 'Your answer', number: 'Your answer', date: 'Your answer', single: 'Pick one', multi: 'Pick any' }

/** The questionnaire's own card input reads a stored question; the portal's question is that record's client-safe part. */
const asQuestion = (q: PortalQuestion): Question => ({ id: q.id, leadId: '', text: q.text, type: q.type, options: JSON.stringify(q.options), answer: q.answer, answeredBy: q.answeredBy, answeredAt: null, sortOrder: 0, createdAt: new Date(0), required: q.required })

/**
 * (Projects round 4a, board 6 step 1) "Tell us about your home": the questions the studio asked this client — the lead's Questionnaire tab's
 * own inputs and rules — answered here and read back there as the client's. In a studio's preview the fields are read-only and Send is off.
 */
export function PortalQuestionsView({ data, homeId, questions, now }: { data: PortalData; homeId: string; questions: PortalQuestion[]; now: number }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const say = usePortalSay(data.slug)
  const preview = data.visitor.preview
  const [draft, setDraft] = useState<Record<string, string | string[]>>(() => Object.fromEntries(questions.map((q) => [q.id, q.type === 'multi' ? parseMulti(q.answer) : q.answer ?? ''])))
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const today = useMemo(() => new Date(now), [now])
  const filled = (v: string | string[] | undefined) => (Array.isArray(v) ? v.length > 0 : !!v?.trim())
  const errors = Object.fromEntries(questions.map((q) => {
    const v = draft[q.id]
    return [q.id, filled(v) ? validateAnswer(q.type, v!) : q.required ? validateAnswer(q.type, v ?? '') : undefined]
  }))
  const open = questions.filter((q) => !q.answeredBy).length
  const send = async () => {
    if (preview || saving) return
    if (Object.values(errors).some(Boolean)) { setTried(true); return }
    setSaving(true)
    try {
      const r = await answerQuestions(data.slug, { homeId, answers: questions.filter((q) => filled(draft[q.id])).map((q) => ({ id: q.id, value: draft[q.id]! })) })
      if ('error' in r) { say(couldnt('send your answers', refusalOf(r.error)), r.error); return }   // (fix-F, F-19) signed out → Sign in
      snackbar({ message: `Thank you — ${r.saved === 1 ? 'your answer is' : 'your answers are'} with ${data.look.studio}` })
      router.push(portalPath(data.slug))
    } catch {
      snackbar({ message: 'Couldn’t send your answers — please try again' })
    } finally {
      setSaving(false)
    }
  }
  return (
    <PageReveal skeleton={<PortalQuestionsGhost />}>
      <PortalFrame look={data.look} slug={data.slug} tab="home" visitor={data.visitor} paused={data.paused} needs={data.needs}>
        <div className={styles.hello}>
          <h1 className={styles.h1}>Tell us about your home</h1>
          <p className={styles.lede}>{open ? `${data.look.studio} asked ${questions.length === 1 ? 'one question' : `${questions.length} questions`}. Answer what you can — you can change an answer later.` : 'Your answers are with the studio. Change any of them here.'}</p>
        </div>
        <ReadOnlyScope readOnly={preview}>
          <div className={styles.questions} data-testid="portal-questions">
            {questions.map((q, i) => (
              <section key={q.id} className={`${styles.card} ${styles.question}`} aria-label={q.text} data-testid="portal-question">
                <span className={styles.questionMeta}>{`Question ${i + 1} of ${questions.length}${q.required ? ' · needed' : ''}`}</span>
                <p className={styles.questionText}>{q.text}</p>
                <AnswerInput question={asQuestion(q)} value={draft[q.id] ?? ''} onChange={(v) => setDraft((d) => ({ ...d, [q.id]: v }))} error={tried ? errors[q.id] : undefined} today={today} label={CLIENT_LABEL[q.type] ?? 'Your answer'} />
              </section>
            ))}
            <div className={styles.formFoot}>
              {/* (fix-F, F-44) the portal's primary — a full-width 48 block on a phone, as Open my project · Looks good · I have paid */}
              <button type="button" className={styles.go} onClick={() => { void send() }} disabled={preview || saving} data-testid="portal-send-answers">{saving ? 'Sending…' : 'Send my answers'}</button>
              {preview ? <span className={styles.line}>A preview — answers aren’t saved.</span> : null}
            </div>
          </div>
        </ReadOnlyScope>
      </PortalFrame>
    </PageReveal>
  )
}
