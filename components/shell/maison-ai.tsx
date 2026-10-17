'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { AiSheet } from '@/components/leads/ai-sheet'
import { useSnackbar } from '@/components/om/snackbar'
import { TextField } from '@/components/om/text-field'
import { IconButton } from '@/components/om/icon-button'
import { isProposal, suggestionLabel, useMaisonAiState, useMaisonAsk, useMaisonList, type MaisonAnswer, type MaisonAsk, type MaisonRow, type MaisonSuggestion } from '@/lib/maison-ai'
import { answerQuestion } from '@/lib/maison-ai/answer'   // (parity map, TD-107 · SC-060 · FB-118 · PR-059)
import { clearAskHistory, fetchAskHistory, rememberAsk, restoreAskHistory } from '@/lib/maison-ai/history'   // (pending modules S10)
import { MAX_QUESTION, matchSuggestion } from '@/lib/maison-ai/intents'
import { displayDayMonth, displayTime, startOfDay } from '@/lib/format'
import { MaisonAnswerPanel, type MaisonView } from './maison-answer'   // (gaps build I, I-Q16)
import answerStyles from './maison-answer.module.css'
import { MaisonFab } from './maison-fab'
import { usePlanRunner } from './maison-plans'
import { openShortcuts } from '@/lib/keys/store'
import { useMediaQuery } from '@/lib/breakpoint'
import { leaveThen } from '@/components/company/leave-guard'   // (pending modules S16) unsaved Company / Settings edits ask before the move (REG-791)

/** (REG-715, Q-03) The door to the ? panel every page's Maison AI offers — where there is a keyboard to use it. */
const KEYS_SUGGESTION = 'Keyboard shortcuts for this page'
type Asked = Awaited<ReturnType<typeof fetchAskHistory>>[number]
const NO_SUGGESTIONS: readonly MaisonSuggestion[] = []

/** "Today · 10:42 AM" · "Yesterday" · "Mon 12 Oct" — when a Recent question was asked. */
function askedWhen(at: number, now: number): string {
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(new Date(at))) / 86_400_000)
  if (days <= 0) return `Today · ${displayTime(new Date(at))}`
  if (days === 1) return 'Yesterday'
  return displayDayMonth(new Date(at))
}

/**
 * Maison AI's sheet (REG-507, owner 2026-09-18: "the maison ai fab button works only in the leads pages and rest of the sidebar is not
 * working"). (pending modules S10 — cards studio:maison-assistant · api:maison-bot-assistant · held:maison-ai) **One sheet, everywhere**: the
 * shell's FAB opens it on every page (`MaisonAi`), and every editor outside the shell opens the same one beside its own FAB (`MaisonAiSheet`
 * with the editor's suggestions) — the quote, contract and template editors, the AI Visualizer, the Space Planner. It holds:
 *   · the **Ask** box (parity map, TD-107): a question is read by rule (lib/maison-ai/intents.ts — first against the page's own suggestions,
 *     `matchSuggestion`, so the box understands the page it is on) and answered from the studio's records (lib/maison-ai/answer.ts); nothing
 *     matched → it says it can't answer that yet and lists what it can, as chips. No model and no credits — "Answers from your records";
 *   · the page's **suggestions**, each acting (`{ run | answer | propose | ask }`, lib/maison-ai.ts) — a plain string left on a page is asked;
 *   · **a change shown before it happens**: an answer carrying a `plan` becomes a proposal — what will happen, Not now, and one button that runs
 *     the house action (components/shell/maison-plans.ts), with its Undo where the house has one;
 *   · **Recent**: the member's own last questions, a record (lib/maison-ai/history.ts), so they are there tomorrow; a press asks again and reads
 *     the records as they are now; Clear with Undo.
 * Leaving the page closes it. A question asked elsewhere on the page (`askMaisonAi` — the milestone panel's "Ask Maison AI about this") opens
 * the shell's sheet with it asked, about that milestone.
 */
export function MaisonAiSheet({ open, onClose, anchorRef, suggestions, labels: labelsIn, resolve: resolveIn, incoming }: {
  open: boolean
  onClose: () => void
  /** The FAB that opens it — a press there toggles instead of close-then-reopen (REG-153). */
  anchorRef?: RefObject<HTMLElement | null>
  /** An editor's own suggestions (the shell passes `labels` + `resolve` from its store instead). */
  suggestions?: readonly MaisonSuggestion[]
  labels?: string[]
  resolve?: (label: string) => MaisonSuggestion | undefined
  /** A question asked from the page, opened with it asked (the shell's sheet) — each `n` once. */
  incoming?: MaisonAsk | null
}) {
  const own = useMaisonList(suggestions ?? NO_SUGGESTIONS)
  const labels = labelsIn ?? own.labels
  const resolve = resolveIn ?? own.resolve
  const snackbar = useSnackbar()
  const router = useRouter()
  const planned = usePlanRunner()
  /* (gaps build I, I-Q16) a suggestion that acts: it opens, answers in the sheet, or proposes and runs the page's own action */
  const [view, setView] = useState<MaisonView | null>(null)
  /* (parity map, TD-107) the Ask box: its words, what it is about (a milestone asked from its panel), and the question being answered */
  const [question, setQuestion] = useState('')
  const [about, setAbout] = useState<{ milestoneId: string | null; projectId: string | null } | null>(null)
  const [asking, setAsking] = useState<(MaisonAsk & { record: boolean }) | null>(null)
  const [history, setHistory] = useState<Asked[] | null>(null)
  const [clock, setClock] = useState(0)
  const reset = () => { setView(null); setQuestion(''); setAbout(null); setAsking(null) }
  const close = () => { reset(); onClose() }
  /* an answer comes back as an answer — or, when it proposes a change, as that proposal with its one button */
  const show = (a: MaisonAnswer) => setView(a.plan ? { kind: 'propose', proposal: planned(a.plan) } : { kind: 'answer', answer: a })
  const remember = (q: string) => setHistory((h) => [{ id: `local:${q}`, question: q, title: null, askedAt: Date.now() }, ...(h ?? []).filter((x) => x.question.toLowerCase() !== q.toLowerCase())].slice(0, 5))
  const askNow = (text: string, o: { record?: boolean } = {}) => {
    const q = text.replace(/\s+/g, ' ').trim()
    if (!q) return
    const record = o.record !== false
    setQuestion(q)
    /* (S10) the page's own suggestions first — "which lines are below cost" on the quote editor is its "1 line sells below cost" */
    const local = matchSuggestion(q, labels.filter((l) => l !== KEYS_SUGGESTION))
    const s = local ? resolve(local) : undefined
    if (local && s && typeof s !== 'string' && !s.ask) {
      if (record) { remember(q); void rememberAsk({ question: q, title: local }).catch(() => {}) }
      setAsking(null); pick(local)
      return
    }
    if (record) remember(q)
    /* a page's suggestion that asks in its own words: the server is asked those, and Recent keeps what the member typed */
    const pageAsk = s && typeof s !== 'string' && s.ask ? s.ask : null
    if (pageAsk && record) void rememberAsk({ question: q, title: local }).catch(() => {})
    setAsking({ text: pageAsk ?? q, milestoneId: about?.milestoneId ?? null, projectId: about?.projectId ?? null, n: (asking?.n ?? 0) + 1, record: record && !pageAsk })
    setView({ kind: 'loading', label: q })
  }
  /* a question asked from the page (the milestone panel) opens the sheet with it asked — each one once */
  const [seenAsk, setSeenAsk] = useState(0)
  if (incoming && incoming.n !== seenAsk) {
    setSeenAsk(incoming.n); setQuestion(incoming.text)
    setAbout({ milestoneId: incoming.milestoneId ?? null, projectId: incoming.projectId ?? null })
    setAsking({ ...incoming, n: (asking?.n ?? 0) + 1, record: true }); setView({ kind: 'loading', label: incoming.text })
  }
  useEffect(() => {
    if (!asking) return
    let live = true
    const path = `${window.location.pathname}${window.location.search}`
    answerQuestion({ question: asking.text, path, projectId: asking.projectId ?? null, milestoneId: asking.milestoneId ?? null, record: asking.record })
      .then((answer) => { if (live) show(answer) }, () => { if (live) setView({ kind: 'answer', answer: { title: asking.text, text: 'Couldn’t look that up — please try again' } }) })
    return () => { live = false }
  }, [asking])   // eslint-disable-line react-hooks/exhaustive-deps -- `show` reads the planner, stable per page
  /* (S10) Recent: read each time the sheet opens — the record, so a question asked on another page or yesterday is there */
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (!open) reset() }
  useEffect(() => {
    if (!open) return
    let live = true
    fetchAskHistory().then((h) => { if (live) { setHistory(h); setClock(Date.now()) } }, () => {})
    return () => { live = false }
  }, [open])
  const pick = (label: string) => {
    setAsking(null)   // (parity map, TD-107) a suggestion pressed while a question was out — the suggestion's answer is the one shown
    if (label === KEYS_SUGGESTION) { close(); openShortcuts(); return }
    const s = resolve(label)
    /* (S10) a page's words alone are asked, as if typed — never "Coming soon" */
    if (!s || typeof s === 'string') { setAsking({ text: label, milestoneId: null, projectId: null, n: (asking?.n ?? 0) + 1, record: false }); setView({ kind: 'loading', label }); return }
    if (s.run) { close(); s.run(); return }
    if (s.ask) { setAsking({ text: s.ask, milestoneId: null, projectId: null, n: (asking?.n ?? 0) + 1, record: false }); setView({ kind: 'loading', label }); return }
    if (s.propose) {
      const pr = s.propose
      if (typeof pr !== 'function') { setView({ kind: 'propose', proposal: pr }); return }
      setView({ kind: 'loading', label })
      void pr().then((x) => setView((v) => (v?.kind === 'loading' && v.label === label ? (isProposal(x) ? { kind: 'propose', proposal: x } : { kind: 'answer', answer: x }) : v)), () => setView({ kind: 'answer', answer: { title: label, text: 'Couldn’t look that up — please try again' } }))
      return
    }
    if (s.answer) {
      const a = s.answer
      if (typeof a !== 'function') { setView({ kind: 'answer', answer: a }); return }
      setView({ kind: 'loading', label })
      void a().then((answer) => setView((v) => (v?.kind === 'loading' && v.label === label ? { kind: 'answer', answer } : v)), () => setView({ kind: 'answer', answer: { title: label, text: 'Couldn’t look that up — please try again' } }))
      return
    }
    setAsking({ text: label, milestoneId: null, projectId: null, n: (asking?.n ?? 0) + 1, record: false }); setView({ kind: 'loading', label: suggestionLabel(s) })
  }
  const row = (r: MaisonRow) => {
    if (r.ask) { askNow(r.ask); return }
    if (!r.run && !r.href) return
    close(); if (r.run) r.run(); else if (r.href) { const href = r.href; leaveThen(() => router.push(href)) }
  }
  const touch = useMediaQuery('(hover: none)')
  const offered = touch ? labels : [...labels, KEYS_SUGGESTION]
  const clear = async () => {
    const before = history ?? []
    setHistory([])
    try {
      const { ids } = await clearAskHistory()
      snackbar({ key: 'maison-recent', message: 'Recent questions cleared', actionLabel: 'Undo', onAction: () => { void restoreAskHistory({ ids }).then(() => fetchAskHistory()).then(setHistory, () => setHistory(before)) } })
    } catch { setHistory(before); snackbar({ message: 'Couldn’t clear the questions — please try again' }) }
  }
  const askBox = (
    <form className={answerStyles.ask} onSubmit={(e) => { e.preventDefault(); askNow(question) }} noValidate data-testid="maison-ask">
      <TextField label="Ask Maison AI" value={question} onChange={setQuestion} maxLength={MAX_QUESTION} autoComplete="off" helper="Answers from your records"
                 trailing={<IconButton icon="send" label="Ask" variant="bare" onClick={() => askNow(question)} disabled={!question.trim()} data-testid="maison-ask-send" />} />
    </form>
  )
  const recentRows = (history ?? []).slice(0, 3)
  const recent = recentRows.length ? (
    <div className={answerStyles.recent} data-testid="maison-recent">
      <div className={answerStyles.recentHead}>
        <span className={answerStyles.recentTitle} id="maison-recent-title">Recent</span>
        <Button variant="secondary" appearance="text" onPress={() => { void clear() }} data-testid="maison-recent-clear">Clear</Button>
      </div>
      <div className={answerStyles.recentRows} role="list" aria-labelledby="maison-recent-title">
        {recentRows.map((h) => (
          <button key={h.id} type="button" role="listitem" className={answerStyles.row} onClick={() => askNow(h.question)} data-testid="maison-recent-row">
            <span className={answerStyles.rowLabel}>{h.question}</span>
            <span className={answerStyles.rowMeta}>{askedWhen(h.askedAt, clock || h.askedAt)}</span>
          </button>
        ))}
      </div>
    </div>
  ) : null
  return (
    <AiSheet open={open} suggestions={offered} onSelect={pick} onClose={close} anchorRef={anchorRef} ask={askBox} recent={recent}
             panel={view ? <MaisonAnswerPanel view={view} onBack={() => { setView(null); setAsking(null) }} onRow={row} onDone={close} onAsk={(q) => askNow(q)} onLink={(href) => { close(); leaveThen(() => router.push(href)) }} /> : undefined} />
  )
}

/** The shell's Maison AI (REG-507): its FAB and the one sheet, with the page's suggestions from the store (`useMaisonAi`). */
export function MaisonAi() {
  const { suggestions, raised, resolve } = useMaisonAiState()
  const [open, setOpen] = useState(false)
  /* a question asked from the page (the milestone panel) opens the sheet with it asked — each one once */
  const fromPage = useMaisonAsk()
  const [handled, setHandled] = useState(fromPage?.n ?? 0)
  const [incoming, setIncoming] = useState<MaisonAsk | null>(null)
  if (fromPage && fromPage.n !== handled) { setHandled(fromPage.n); setIncoming(fromPage); setOpen(true) }
  const fabRef = useRef<HTMLDivElement>(null)   // the sheet exempts the FAB from outside presses so the FAB toggles (REG-153)
  const pathname = usePathname()
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) { setLastPath(pathname); setOpen(false) }
  return (
    <>
      <MaisonAiSheet open={open} onClose={() => setOpen(false)} anchorRef={fabRef} labels={suggestions} resolve={resolve}
                     incoming={incoming} />
      <div ref={fabRef} style={{ display: 'contents' }}>
        <MaisonFab onPress={() => setOpen((o) => !o)} raised={raised} quietTop={pathname === '/dashboard'} />   {/* (S42 audit A-12) the Dashboard's first screen has its own Ask box */}
      </div>
    </>
  )
}
