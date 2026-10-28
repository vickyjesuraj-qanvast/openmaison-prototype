'use client'

import { useRouter } from 'next/navigation'

import { useEffect, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { spring } from '@/lib/motion'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { useSnackbar } from '@/components/om/snackbar'
import { useRun } from '@/components/leads/tasks/use-run'
import type { LeadQuestionsData } from '@/lib/leads/questions'
import { answerWords, clientFirst, summarise } from '@/lib/leads/question-model'
import { Dialog } from '@/components/om/dialog'
import { displayDateTime } from '@/lib/format'
import { answerQuestion, askClientQuestions } from '@/app/leads/questions-actions'
import { QuestionCard } from './question-card'
import { SummaryCard } from './summary-card'
import { QuestionnaireEmpty } from './questionnaire-empty'
import { AskClientDialog, askedLine } from './ask-client-dialog'
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
export function LeadQuestionnaire({ data, noun = 'lead', views, setUpHref = null }: { data: LeadQuestionsData; /** (parity P-12) the host's record — a project passes "project" */ noun?: 'lead' | 'project'
  /** (simplify S-03) on a project: the Client group's view switch in the title's place */ views?: ReactNode
  /** (the calm UI build 2026-10-27 — 2-23) where the studio's questions are set up (Company › Questionnaire) — given for an Owner or an Admin,
      who may; the empty state then links there. Others read where it lives, unlinked. */
  setUpHref?: string | null }) {
  const { questions, leadName, now, askedAt, leadId, bankCount, askedOn, history = {} } = data
  const [historyOf, setHistoryOf] = useState<string | null>(null)   // (gaps build D, item 9) the question whose answer history is open
  const snackbar = useSnackbar()
  const router = useRouter()
  const { fail } = useRun()

  /* ── state ── */
  const [answering, setAnswering] = useState<string | null>(null)   // the one card in `answer` mode
  const [askOpen, setAskOpen] = useState(false)
  const [saving, setSaving] = useState(false)                       // an answer save in flight
  /* (Dane's UAT 5.17) An answered question moves below the open ones (REG-218) — it used to jump there, and read as gone. The card now
     travels to its new place (motion `layout`, the house settle spring; none under reduced motion), and once it has landed the page
     brings it into view and it pulses once (the house attention pulse). `landing` = the card on its way; `fresh` = the one pulsing. */
  const reduced = useReducedMotion()
  const [landing, setLanding] = useState<string | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)
  useEffect(() => {
    if (!landing) return
    const id = landing
    const t = setTimeout(() => {
      setLanding(null)
      const el = document.querySelector<HTMLElement>(`[data-question-id="${CSS.escape(id)}"]`)
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.top < 120 || r.bottom > window.innerHeight - 24) el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
      setFresh(id)
    }, reduced ? 60 : 560)   // the settle spring has landed by then
    return () => clearTimeout(t)
  }, [landing, reduced])
  useEffect(() => {
    if (!fresh) return
    const t = setTimeout(() => setFresh(null), 1600)
    return () => clearTimeout(t)
  }, [fresh])

  const summary = summarise(questions)
  /* (Leads on the move, L4 — P-12 · C-25) Read first on a phone or a tablet: "4 to answer · 7 answered" over the list, and two chips — To answer ·
     Answered — that keep one kind of card (the open ones first, as the desk orders them); the summary card stays last for who answered and
     when the client was asked. The desk keeps the mock's column + the 480 summary. */
  const compact = useMediaQuery(TABLET_DOWN)
  const openCount = questions.filter((q) => !q.answeredBy).length
  const answeredCount = questions.length - openCount
  const [show, setShow] = useState<'open' | 'answered'>(() => (questions.some((q) => !q.answeredBy) ? 'open' : 'answered'))
  if (show === 'open' && openCount === 0 && answeredCount > 0 && !landing) setShow('answered')   // the last one answered — its card is in Answered now
  const listed = compact ? questions.filter((q) => (show === 'open' ? !q.answeredBy || q.id === answering : !!q.answeredBy && q.id !== answering) || q.id === landing) : questions

  /* ── actions ── */
  const saveAnswer = async (id: string, value: string | string[]) => {
    setSaving(true)
    try { await answerQuestion(id, value); setAnswering(null); setLanding(id); snackbar({ message: 'Answer saved' }) }
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
        snackbar({ message: askedLine(leadName, r) })   /* (parity map, CP-110) where the questions are now */; router.refresh()
      } catch { fail('record the ask') }
    })()
  }

  const noQuestions = questions.length === 0
  const first = clientFirst(leadName)
  /* (REG-612, parity Q-21) The bank's enabled questions this lead lacks, added on a press. */
  const addBank = () => { void (async () => { try { const n = await addStudioQuestions(leadId); snackbar({ message: `${n} question${n === 1 ? '' : 's'} added` }); router.refresh() } catch { snackbar({ message: 'Couldn’t add the questions — please try again' }) } })() }
  /* (the calm UI build 2026-10-27 — 3-33 · 2-18 · W-008) "Ask {client}", named for the person; it shows once there is a question to ask — frame
     201's disabled button with no reason is gone (the empty state's own way in is Add them) — the house empty rule ③, nothing that can't act. */
  const askButton = noQuestions ? null : (
    <span className={styles.anchor}>
      <Button variant="primary" appearance="outlined" onPress={() => setAskOpen(true)} data-testid="ask-client">{first ? `Ask ${first}` : 'Ask the client'}</Button>
    </span>
  )

  return (
    <div className={styles.tab} data-testid="lead-questionnaire">
      <div className={styles.bar}>
        {views ?? <h2 className={styles.title}>All questions</h2>}
        {!noQuestions && bankCount > 0 ? <Button appearance="text" onPress={addBank}>{`Add the studio’s ${bankCount} new question${bankCount === 1 ? '' : 's'}`}</Button> : null}   {/* (REG-612) */}
        {askButton}
      </div>

      {noQuestions ? (
        <QuestionnaireEmpty bankCount={bankCount} onAddBank={addBank} noun={noun} setUpHref={setUpHref} />
      ) : (
        <div className={styles.layout}>
          {compact ? (
            <div className={styles.readFirst} data-testid="questionnaire-read-first">
              <p className={styles.counts}>{openCount ? `${openCount} to answer · ${answeredCount} answered` : `All ${answeredCount} answered`}</p>
              <Chips label="Show" value={show} onChange={(v) => setShow(v === 'answered' ? 'answered' : 'open')} testId="questionnaire-show"
                     options={[{ value: 'open', label: `To answer · ${openCount}`, disabled: openCount === 0 }, { value: 'answered', label: `Answered · ${answeredCount}`, disabled: answeredCount === 0 }]} />
            </div>
          ) : null}
          <div className={styles.questions}>
            {listed.map((q) => (
              <motion.div key={q.id} className={styles.item} data-question-id={q.id} data-fresh={fresh === q.id || undefined}
                          layout={reduced ? false : 'position'} transition={spring.settle}>
              <QuestionCard
                question={q}
                client={first}
                now={now}
                mode={answering === q.id ? 'answer' : 'view'}
                onAnswer={() => { setAnswering(q.id) }}
                onCancel={() => { setAnswering((cur) => (cur === q.id ? null : cur)) }}
                onSave={(value: string | string[]) => { void saveAnswer(q.id, value) }}
                saving={saving && answering === q.id}
                askedAt={askedOn[q.id] ?? null}   /* (T12) the card says it was asked, and when */
                changes={(history[q.id] ?? []).filter((h) => h.before !== null).length}   /* (gaps build D, item 9) overwrites only — a first answer is not a change */
                onHistory={() => setHistoryOf(q.id)}
              />
              </motion.div>
            ))}
          </div>
          {summary ? (
            <div className={styles.summary}>
              <SummaryCard total={summary.total} clientAnswered={summary.clientAnswered} studioAnswered={summary.studioAnswered} askedAt={askedAt} requiredOpen={questions.filter((q) => q.required && !q.answeredBy).length} client={first} />
            </div>
          ) : null}
        </div>
      )}

      <AskClientDialog open={askOpen} leadName={leadName} onClose={() => setAskOpen(false)} onSend={send} questions={unanswered} />
      {/* (gaps build D, item 9 — 1.0 M-170 · M-175) every version of an answer, newest first: who changed it, when, and from what to what */}
      <Dialog open={!!historyOf} onClose={() => setHistoryOf(null)} title="Answer history" size="form" width={600}
              subtitle={questions.find((q) => q.id === historyOf)?.text}
              footer={<Button variant="secondary" appearance="outlined" onPress={() => setHistoryOf(null)}>Close</Button>}>
        <ol className={styles.history} data-testid="question-history-list">
          {(historyOf ? history[historyOf] ?? [] : []).map((h, i) => (
            <li key={`${h.at}-${i}`} className={styles.historyRow}>
              <span className={styles.historyWho}>{`${h.byName ?? (h.byKind === 'client' ? leadName : 'The studio')} · ${h.byKind === 'client' ? 'on the portal' : 'for the client'} · ${displayDateTime(new Date(h.at))}`}</span>
              <span className={styles.historyChange}>{h.before === null ? <>First answer: <b>{answerWords(h.after)}</b></> : <><s>{answerWords(h.before)}</s>{' → '}<b>{answerWords(h.after)}</b></>}</span>
            </li>
          ))}
        </ol>
      </Dialog>
    </div>
  )
}
