'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { AnswerBody } from '@/components/shell/maison-answer'
import type { MaisonAnswer, MaisonProposal, MaisonReceipt, MaisonRow } from '@/lib/maison-ai'
import type { DockContext } from '@/lib/dashboard/dock'
import styles from './maison-dock.module.css'

/** One exchange of the docked conversation: the question, where its answer is, and what a change it ran did. */
export type DockEntry = {
  id: number
  q: string
  about: DockContext | null
  /** asked by the member (kept in Recent) or by the page's own words (a suggestion, a card's question) */
  record: boolean
  projectId: string | null
  milestoneId: string | null
  state: 'reading' | 'done' | 'failed' | 'stopped'
  /** past half a second without an answer: the reading line shows (today's rule answers are instant — A-2, D §4 ·5) */
  slow: boolean
  answer: MaisonAnswer | null
  proposal: MaisonProposal | null
  /** a desk's long answer or proposal opened in the pane beside the page — the thread keeps a line for it */
  inPane: boolean
  /** the proposal was put aside (Not now) */
  dismissed: boolean
  receipt: (MaisonReceipt & { after: string | null; undoing: boolean }) | null
}

/** A server answer that says it couldn't read — offered again with Retry. */
export const failedAnswer = (a: MaisonAnswer | null) => !!a && a.title === 'Couldn’t look that up'

/**
 * (the Dashboard redesigned 2026-10-26 — his marks P-01 · P-10 · Q-01 · lane D4) An exchange as the conversation draws it — above the field at a
 * desk, in the sheet on a tablet held upright and a phone: the question as the member's bubble, then the answer as a card (its words, its cards,
 * its doors — `AnswerBody`), or the line that says it opened beside the page; a proposal with Not now and its one filled button (a decision
 * surface, his § 2 — only where the sheet holds it); Stopped / Couldn't look that up with Retry; and the receipt of a change with its Undo.
 */
export function DockEntryView({ e, inline, onRetry, onReopen, onRow, onAsk, onOpen, onNotNow, onConfirm, onUndo }: {
  e: DockEntry
  /** the sheet: every answer and proposal drawn in full here (no pane) */
  inline: boolean
  onRetry: (e: DockEntry) => void
  onReopen: (e: DockEntry) => void
  onRow: (r: MaisonRow) => void
  onAsk: (q: string) => void
  onOpen: (href: string) => void
  onNotNow: (e: DockEntry) => void
  onConfirm: (e: DockEntry) => Promise<void>
  onUndo: (e: DockEntry) => void
}) {
  const [busy, setBusy] = useState(false)
  const a = e.answer
  const failed = e.state === 'failed' || (e.state === 'done' && failedAnswer(a))
  return (
    <div className={styles.entry} data-testid="dock-entry" data-state={failed ? 'failed' : e.state}>
      <div className={styles.ask}>
        {e.about ? <span className={styles.askAbout}>About {e.about.label}</span> : null}
        <p className={styles.bubble} data-testid="dock-question">{e.q}</p>
      </div>
      {e.state === 'reading' ? (
        e.slow ? <p className={styles.reading} role="status" data-testid="dock-reading">Looking through your records…</p> : <span className={styles.readingHold} aria-hidden />
      ) : failed || e.state === 'stopped' ? (
        <div className={styles.lineNote} role="status" data-testid="dock-note">
          <span>{e.state === 'stopped' ? 'Stopped — nothing was looked up.' : 'Couldn’t look that up — please try again.'}</span>
          <Button variant="secondary" appearance="text" onPress={() => onRetry(e)} data-testid="dock-retry">Retry</Button>
        </div>
      ) : a && e.proposal && !e.receipt ? (
        e.dismissed ? (
          <p className={styles.lineNote} data-testid="dock-note"><span>Put aside — nothing was changed.</span></p>
        ) : e.inPane && !inline ? (
          <div className={styles.compact} data-testid="dock-compact">
            <span className={styles.compactTitle}>{e.proposal.title}</span>
            <span className={styles.compactMeta}>Waiting for you beside the page</span>
            <Button variant="secondary" appearance="text" onPress={() => onReopen(e)} data-testid="dock-reopen">Open</Button>
          </div>
        ) : (
          <section className={styles.card} aria-label={e.proposal.title} data-testid="dock-proposal">
            <h3 className={styles.cardTitle}>{e.proposal.title}</h3>
            <p className={styles.cardText}>{e.proposal.text}</p>
            {e.proposal.lines?.length ? <ul className={styles.lines}>{e.proposal.lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : null}
            <div className={styles.decide}>
              <Button variant="secondary" appearance="text" onPress={() => onNotNow(e)} isDisabled={busy}>Not now</Button>
              <Button onPress={() => { if (busy) return; setBusy(true); void onConfirm(e).finally(() => setBusy(false)) }} isDisabled={busy} data-testid="dock-confirm">{busy ? 'Working…' : e.proposal.confirm}</Button>
            </div>
          </section>
        )
      ) : a && !e.proposal ? (
        e.inPane && !inline ? (
          <div className={styles.compact} data-testid="dock-compact">
            <span className={styles.compactTitle}>{a.title}</span>
            <span className={styles.compactMeta}>Opened beside the page</span>
            <Button variant="secondary" appearance="text" onPress={() => onReopen(e)} data-testid="dock-reopen">Open</Button>
          </div>
        ) : (
          <section className={styles.card} aria-label={a.title} data-testid="dock-answer">
            <h3 className={styles.cardTitle}>{a.title}</h3>
            <div className={styles.cardBody}><AnswerBody answer={a} onRow={onRow} onAsk={onAsk} onLink={onOpen} /></div>
          </section>
        )
      ) : null}
      {e.receipt ? <ReceiptRow e={e} onUndo={onUndo} onOpen={onOpen} /> : null}
    </div>
  )
}

/** (D §4 ·4, 3.G "Get work done") The proposal turned receipt: what was done, its Undo where the house action has one, its door. */
function ReceiptRow({ e, onUndo, onOpen }: { e: DockEntry; onUndo: (e: DockEntry) => void; onOpen: (href: string) => void }) {
  const r = e.receipt!
  const undone = r.after !== null
  return (
    <div className={styles.receipt} role="status" data-testid="dock-receipt" data-undone={undone || undefined}>
      <Icon name={undone ? 'undo' : 'check_circle'} size={20} fill={!undone} className={styles.receiptIcon} />
      <span className={styles.receiptWords}>
        <span className={styles.receiptText}>{undone ? r.after : r.text}</span>
        {r.meta && !undone ? <span className={styles.receiptMeta}>{r.meta}</span> : null}
      </span>
      {r.undo && !undone ? <Button variant="secondary" appearance="text" onPress={() => onUndo(e)} isDisabled={r.undoing} data-testid="dock-undo">{r.undoing ? 'Undoing…' : r.undo.label ?? 'Undo'}</Button> : null}
      {r.open ? <Button variant="secondary" appearance="text" onPress={() => onOpen(r.open!.href)} data-testid="dock-receipt-open">{r.open.label}</Button> : null}
    </div>
  )
}
