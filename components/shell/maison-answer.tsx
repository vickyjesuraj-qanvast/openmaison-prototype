'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Chips } from '@/components/om/chips'
import type { MaisonAnswer, MaisonProposal, MaisonRow } from '@/lib/maison-ai'
import styles from './maison-answer.module.css'

export type MaisonView = { kind: 'loading'; label: string } | { kind: 'answer'; answer: MaisonAnswer } | { kind: 'propose'; proposal: MaisonProposal }

/**
 * (gaps build I, I-Q16 · I-Q18) What a pressed suggestion shows in Maison AI's sheet: an **answer** — its line and its rows, each opening its
 * record — or a **proposal** — what it will do, and one button that does it through the page's own action (Not now goes back). Back returns to
 * the suggestions. Its words are the page's, built from the studio's own records.
 * (parity map, TD-107 · FB-118) An answer to the Ask box may carry questions to ask next (`chips` — a press asks it) and one button to its record or
 * report (`link`).
 * (pending modules S10) A row may ask a question when pressed (`ask` — "which lead?" answered by picking one), and a report's row carries its
 * share of the largest figure as a bar under it (`share` — the card's "charts drawn inside the answer"; the figure is in the words, the bar
 * only shows it). A proposal from the Ask box (an answer's `plan`) is shown here with its one button, like a page's own.
 */
export function MaisonAnswerPanel({ view, onBack, onRow, onDone, onAsk, onLink }: { view: MaisonView; onBack: () => void; onRow: (r: MaisonRow) => void; onDone: () => void
  /** (parity map, TD-107) a chip's question, asked */ onAsk?: (q: string) => void
  /** (parity map, FB-118) the answer's one button */ onLink?: (href: string) => void }) {
  const [busy, setBusy] = useState(false)
  const back = (
    <Tooltip label="Back to suggestions"><IconButton icon="arrow_back" label="Back to suggestions" onClick={onBack} data-testid="maison-back" /></Tooltip>
  )
  if (view.kind === 'loading') {
    return <div className={styles.panel} data-testid="maison-answer"><div className={styles.top}>{back}<span className={styles.title}>{view.label}</span></div><span className={styles.loading} role="status">Looking through your records…</span></div>
  }
  if (view.kind === 'answer') {
    const a = view.answer
    return (
      <div className={styles.panel} data-testid="maison-answer">
        <div className={styles.top}>{back}<span className={styles.title}>{a.title}</span></div>
        {a.text ? <p className={styles.text}>{a.text}</p> : null}
        {a.rows?.length ? (
          <div className={styles.rows} role="list">
            {a.rows.map((r) => (r.href || r.run || r.ask ? (
              <button key={r.id} type="button" role="listitem" className={styles.row} onClick={() => onRow(r)} data-testid="maison-row" data-ask={r.ask ? '' : undefined}>
                <span className={styles.rowLabel}>{r.label}</span>
                {r.meta ? <span className={styles.rowMeta}>{r.meta}</span> : null}
                {r.share != null ? <span className={styles.bar} aria-hidden><span style={{ width: `${Math.max(2, Math.round(r.share * 100))}%` }} /></span> : null}
              </button>
            ) : (
              /* (parity map, FB-118) a figure with nowhere to open — a report's tile — reads as a line, not a button */
              <div key={r.id} role="listitem" className={styles.row} data-static="" data-testid="maison-row">
                <span className={styles.rowLabel}>{r.label}</span>
                {r.meta ? <span className={styles.rowMeta}>{r.meta}</span> : null}
                {r.share != null ? <span className={styles.bar} aria-hidden><span style={{ width: `${Math.max(2, Math.round(r.share * 100))}%` }} /></span> : null}
              </div>
            )))}
          </div>
        ) : null}
        {a.chips?.length && onAsk ? <Chips label="Ask next" value={null} options={a.chips.map((c) => ({ value: c, label: c }))} onChange={(q) => onAsk(q)} testId="maison-chips" /> : null}
        {a.link && onLink ? (
          <div className={styles.actions}><Button variant="secondary" appearance="outlined" onPress={() => onLink(a.link!.href)} data-testid="maison-link">{a.link.label}</Button></div>
        ) : null}
      </div>
    )
  }
  const p = view.proposal
  const go = async () => {
    if (busy) return
    setBusy(true)
    const ok = await p.run().catch(() => false)
    setBusy(false)
    if (ok) onDone()
  }
  return (
    <div className={styles.panel} data-testid="maison-proposal">
      <div className={styles.top}>{back}<span className={styles.title}>{p.title}</span></div>
      <p className={styles.text}>{p.text}</p>
      {p.lines?.length ? <ul className={styles.lines}>{p.lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : null}
      <div className={styles.actions}>
        <Button variant="secondary" appearance="text" onPress={onBack} isDisabled={busy}>Not now</Button>
        <Button onPress={() => { void go() }} isDisabled={busy} data-testid="maison-confirm">{busy ? 'Working…' : p.confirm}</Button>
      </div>
    </div>
  )
}
