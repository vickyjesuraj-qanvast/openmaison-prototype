'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Tag } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Bone } from '@/components/shell/skeleton'
import { GhostField, Line, Slot, Words } from '@/components/shell/ghost-kit'
import { MaisonAnswerPanel, type MaisonView } from '@/components/shell/maison-answer'
import { duration, ease } from '@/lib/motion'
import { isProposal, type MaisonRow, type MaisonSuggestion } from '@/lib/maison-ai'
import { briefsFor, type Brief, type BriefLead } from '@/lib/leads/briefs'
import styles from './ai-brief.module.css'

/**
 * Maison AI brief (858:24867) — the gradient card at the top of the Lead Overview's centre column:
 * head (sparkle · "MAISON AI BRIEF" · filled yellow tag) + body (2-line brief with bold runs · two outlined
 * primary buttons). The mock's pager row (dots + ‹ ›) is replaced by a Show more expander (REG-237,
 * user 2026-09-01): the remaining briefs from `briefsFor(stage, lead)` stack below the first card instead of
 * hiding behind a carousel, in the lead form's "Additional info" expander voice.
 * Spec: design-source/context/lead-overview/03-brief-grid.txt.
 *
 * (parity P-33 · Q-02, the owner's pick 2026-10-08) The two buttons act — Maison AI's contract (`{ run | answer | propose }`, lib/maison-ai.ts):
 * `actions` resolves a button's words to what it does (components/leads/detail/use-lead-maison.ts on a lead). A run runs; an answer or a proposal
 * takes the card's body — the FAB sheet's own panel (components/shell/maison-answer.tsx: Back, the answer's rows, Not now · the one button) —
 * and Back, Not now or a done proposal return to the brief. Words with nothing behind them still reach `onAction` (the house "Coming soon").
 * `briefs` hands the card a record's own briefs (a project's, P-02) in place of the lead's `briefsFor(stage, lead)`.
 */
function BriefCard({ brief, onAction, view, onBack, onRow, onDone, ask }: {
  brief: Brief; onAction: (label: string) => void
  /** The pressed action's answer or proposal, in the body's place. */
  view: MaisonView | null; onBack: () => void; onRow: (r: MaisonRow) => void; onDone: () => void
  /** (pending modules S22) the Dashboard's Ask box, between the brief and its two buttons */
  ask?: ReactNode
}) {
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.eyebrow}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figma-assets/brief-sparkle.svg" width={17} height={17} alt="" className={styles.sparkle} />
          <span className={styles.eyebrowText}>MAISON AI BRIEF</span>
        </div>
        <Tag appearance="filled" color="yellow" className={styles.tag}>{brief.tag}</Tag>
      </div>
      {view ? (
        <div className={styles.answer} data-testid="brief-answer">
          <MaisonAnswerPanel view={view} onBack={onBack} onRow={onRow} onDone={onDone} />
        </div>
      ) : (
        <div className={styles.body}>
          <p className={styles.text}>
            {brief.text.map((run, i) => (run.bold ? <strong key={i} className={styles.bold}>{run.t}</strong> : <span key={i}>{run.t}</span>))}
          </p>
          {ask ? <div className={styles.ask}>{ask}</div> : null}
          <div className={styles.actions}>
            {brief.actions.map((label) => (
              <Button key={label} variant="primary" appearance="outlined" onPress={() => onAction(label)}>{label}</Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AiBrief({
  stage,
  lead,
  onAction,
  actions,
  briefs: given,
  ask,
}: {
  stage: string
  /** The lead whose stage's briefs the card shows — (pending modules S22) not needed when `briefs` are given (the Dashboard's). */
  lead?: BriefLead
  /** A button whose words resolve to nothing that acts — the page's fallback (the house "Coming soon"). */
  onAction: (label: string) => void
  /** (parity P-33) What each button does — `{ run | answer | propose }`; a plain string (or nothing) falls back to `onAction`. */
  actions?: (label: string) => MaisonSuggestion | undefined
  /** (parity P-02) A record's own briefs, in place of the lead's for `stage`. */
  briefs?: Brief[]
  /** (pending modules S22 — 1.0's chat-first home) The Dashboard's Ask box, on the first card between the brief and its buttons; a page
      without it is as it was. */
  ask?: ReactNode
}) {
  const router = useRouter()
  const briefs = given ?? (lead ? briefsFor(stage, lead) : [])
  // Render-phase adjust: a stage change re-collapses the stack to the new stage's primary brief.
  const [state, setState] = useState({ stage, open: false })
  if (state.stage !== stage) setState({ stage, open: false })
  const open = state.stage === stage && state.open
  /* (parity P-33) The card a button was pressed in shows its answer — keyed by the brief's tag; a stage change drops it with the stack. */
  const [answering, setAnswering] = useState<{ stage: string; tag: string; view: MaisonView } | null>(null)
  if (answering && answering.stage !== stage) setAnswering(null)
  const viewOf = (tag: string) => (answering?.tag === tag ? answering.view : null)
  const back = () => setAnswering(null)
  const row = (r: MaisonRow) => { setAnswering(null); if (r.run) r.run(); else if (r.href) router.push(r.href) }
  /** A press: the run runs; an answer or a proposal (given, or read when pressed) takes the card's body, as it takes the FAB sheet's. */
  const press = (tag: string, label: string) => {
    const s = actions?.(label)
    if (!s || typeof s === 'string') { onAction(label); return }
    if (s.run) { s.run(); return }
    const show = (view: MaisonView) => setAnswering({ stage, tag, view })
    const landed = (view: MaisonView) => setAnswering((a) => (a?.tag === tag && a.view.kind === 'loading' && a.view.label === label ? { stage, tag, view } : a))
    const failed = () => landed({ kind: 'answer', answer: { title: label, text: 'Couldn’t look that up — please try again' } })
    if (s.propose) {
      const pr = s.propose
      if (typeof pr !== 'function') { show({ kind: 'propose', proposal: pr }); return }
      show({ kind: 'loading', label })
      void pr().then((x) => landed(isProposal(x) ? { kind: 'propose', proposal: x } : { kind: 'answer', answer: x }), failed)
      return
    }
    if (s.answer) {
      const a = s.answer
      if (typeof a !== 'function') { show({ kind: 'answer', answer: a }); return }
      show({ kind: 'loading', label })
      void a().then((answer) => landed({ kind: 'answer', answer }), failed)
      return
    }
    onAction(label)
  }
  const first = briefs[0]
  const rest = briefs.slice(1)
  if (!first) return null
  const card = (b: Brief) => <BriefCard key={b.tag} brief={b} onAction={(label) => press(b.tag, label)} view={viewOf(b.tag)} onBack={back} onRow={row} onDone={back} ask={b === first ? ask : undefined} />

  return (
    <section className={styles.block} aria-label="Maison AI brief" data-expanded={open || undefined}>
      {card(first)}
      <AnimatePresence initial={false}>
        {open && rest.length > 0 ? (
          <motion.div
            key="rest"
            className={styles.rest}
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: duration.step, ease: ease.standard }}
          >
            <div className={styles.restInner}>
              {rest.map(card)}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {rest.length > 0 ? (
        <div className={styles.toggleRow}>
          <button type="button" className={styles.toggle} aria-expanded={open}
                  onClick={() => setState({ stage, open: !open })}>
            {open ? 'Show less' : 'Show more'}
            <span data-chev><Icon name={open ? 'keyboard_arrow_up' : 'expand_more'} size={20} /></span>
          </button>
        </div>
      ) : null}
    </section>
  )
}

/**
 * (parity P-07 · REG-708) The brief's ghost on its own classes — the card, its head with "MAISON AI BRIEF" in the eyebrow's words and the tag's
 * box, two lines of the brief, the two buttons — then the Show more row. The lead Overview's ghost draws it; a record with the brief (a project's
 * Overview, P-02) draws the same one.
 */
export function AiBriefGhost({ more = true, ask = false }: { more?: boolean; /** (pending modules S22) the Dashboard's Ask box under the brief */ ask?: boolean }) {
  return (
    <div className={styles.block} aria-hidden>
      <div className={styles.card}>
        <div className={styles.head}>
          <div className={styles.eyebrow}>
            <Bone w={17} h={17} r="50%" />
            <Words className={styles.eyebrowText}>MAISON AI BRIEF</Words>
          </div>
          <Slot kind="chip" w={156} className={styles.tag} />
        </div>
        <div className={styles.body}>
          <div className={styles.ghostText}><Line w="94%" lh={20} h={12} /><Line w="62%" lh={20} h={12} /></div>
          {ask ? <div className={styles.ask}><GhostField say="Answers from your records" /></div> : null}
          <div className={styles.actions}><Slot kind="btn" w={168} /><Slot kind="btn" w={196} /></div>
        </div>
      </div>
      {more ? <div className={styles.toggleRow}><Line w={92} lh={20} h={12} /></div> : null}
    </div>
  )
}
