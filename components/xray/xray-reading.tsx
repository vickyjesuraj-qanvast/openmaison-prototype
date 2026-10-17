'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { StatTile } from '@/components/om/stat-tile'
import type { TableColumn } from '@/components/om/table-columns'
import { money, moneyK, type XrayResult } from '@/lib/xray/compare'
import { XrayTable, type RowAction } from './xray-table'
import styles from './xray-result.module.css'

/**
 * A Quote X-Ray reading's four cards — the summary with its three figures, Say this, the key points you can use, the item-by-item table —
 * the record page's (REG-529, X-Ray parity REG-636…642) as they were, moved here unchanged so (pending modules S41b-3) the website's free
 * trial shows a visitor's reading in the very same cards: the record page brings its own presses (Send to client, the corrections, the
 * quote's link), the trial its own (Copy the message), each through these props.
 */
export function XrayReadingCards({ r, yourLabel, sayAction, asQuestion, onToggleQuestion, columns, onReorder, rowActions, onColumns, phone }: {
  r: XrayResult
  /** what the summary names as your quote — a link to it on the record page */
  yourLabel: ReactNode
  /** Say this card's own button */
  sayAction: ReactNode
  asQuestion: Record<number, boolean>
  onToggleQuestion: (n: number) => void
  columns: readonly TableColumn[]
  onReorder: (keys: string[]) => void
  rowActions?: (row: XrayResult['rows'][number]) => RowAction[]
  onColumns: () => void
  phone: boolean
}) {
  /* (REG-638, parity Q-09) Key points by 1.0's rules: advantages and risks as cards; a brand only their quote names with nothing to
     raise joins "We also checked"; one both quotes name is left out (an engine-1 reading's "note" on both sides included). */
  const cards = r.brands.filter((b) => b.tone === 'advantage' || b.tone === 'risk')
  const checked = r.brands.filter((b) => b.tone === 'checked' || (b.tone === 'note' && b.side === 'theirs'))
  return (
    <>
      <section className={styles.card} aria-label="Summary" data-testid="xray-summary">
        <span className={styles.eyebrow}>Comparing your quote ({r.yourStudio} · {yourLabel}) with the quote from <b>{r.otherStudio}</b></span>
        <h2 className={styles.headline}>{r.headline}</h2>
        <div className={styles.tiles}>
          {/* (UX audit C11) what the two figures count — the quote's own total has discounts and GST in it (the footnote gives it) */}
          <StatTile label={`Yours (${r.yourStudio})`} value={moneyK(r.yoursMinor)} testId="xray-tile-yours" help={r.engine && r.engine >= 2 ? 'line totals, before GST' : undefined} />
          <StatTile label={r.otherStudio} value={moneyK(r.theirsMinor)} testId="xray-tile-theirs" help={r.engine && r.engine >= 2 ? 'line totals, before GST' : undefined} />
          <StatTile label="Real difference" tone="primary" value={moneyK(r.realDiffMinor)} testId="xray-tile-real"
                    help={r.realDiffMinor > 0 ? 'ours more, like-for-like' : r.realDiffMinor < 0 ? 'ours less, like-for-like' : 'level, like-for-like'} />
        </div>
        <p className={styles.footnote}><Icon name="info" size={18} weight={300} /> <span>{r.footnote}{r.engine && r.engine >= 2 ? <> Both sides are compared on their line totals, before discounts and GST{r.quoteTotalMinor != null && r.quoteTotalMinor !== r.yoursMinor ? <> — with them, {r.yourLabel.split(' · ')[0]} comes to {money(r.quoteTotalMinor)}</> : null}.</> : null}</span></p>
      </section>

      <section className={styles.card} aria-label="Say this" data-testid="xray-points">
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}><Icon name="chat" size={20} weight={300} /> Say this</span>
          {sayAction}
        </div>
        {r.points.length === 0 ? <span className={styles.none}>The two quotes line up — nothing to flag.</span> : (
          <ol className={styles.points}>
            {r.points.map((p) => (
              <li key={p.n} className={styles.point}>
                <span className={styles.pointN}>{p.n}</span>
                <div className={styles.pointBody}>
                  <span className={styles.say}>“{asQuestion[p.n] && p.asQuestion ? p.asQuestion : p.say}”</span>
                  <span className={styles.evidence}><b>{p.evidenceLabel}</b> · {p.evidence}</span>
                  {p.asQuestion ? <Button appearance="text" onPress={() => onToggleQuestion(p.n)}>{asQuestion[p.n] ? 'Say it as a point' : 'Say it as a question'}</Button> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={styles.card} aria-label="Key points you can use" data-testid="xray-brands">
        <div className={styles.cardHead}><span className={styles.cardTitle}><Icon name="verified" size={20} weight={300} /> Key points you can use</span></div>
        {cards.length + checked.length === 0 ? <span className={styles.none}>Neither quote names a brand worth a word.</span> : (
          <ul className={styles.brands}>
            {cards.map((b, i) => (
              <li key={`${b.brand}-${i}`} className={styles.brand} data-tone={b.tone}>
                <div className={styles.brandHead}>
                  <span className={styles.brandName}>{b.brand} <span className={styles.brandMeta}>{b.trade}{b.side === 'theirs' ? ' · in their quote' : b.side === 'yours' ? ' · in your quote' : ''}</span></span>
                  {b.tone === 'advantage' ? <MetaChip color="green">Your advantage</MetaChip> : b.impact ? <MetaChip color={b.impact === 'high' ? 'red' : 'yellow'}>Impact: {b.impact}</MetaChip> : null}   {/* (sweep S3) the house chip, not a page-local pill */}
                </div>
                <span className={styles.brandText}>{b.text}</span>
                {b.sources.length ? <span className={styles.sources}>Sources · {b.sources.join(' · ')}</span> : null}
              </li>
            ))}
            {checked.length ? <li className={styles.also} data-testid="xray-checked">We also checked {checked.map((b) => b.brand).join(', ')} in their quote — nothing to flag.</li> : null}
          </ul>
        )}
      </section>

      <section className={styles.tableCard} aria-label="Item by item" data-testid="xray-items">
        <div className={styles.tableHead}>
          <span className={styles.cardTitle}>Item by item <span className={styles.count}>{r.compared} compared</span></span>
          <span className={styles.tableTools}>
            <span className={styles.legend}><span className={styles.swatch} data-status="yours-only" /> only in yours <span className={styles.swatch} data-status="theirs-only" /> only in theirs <span className={styles.swatch} data-status="unpriced" /> no price given</span>
            {!phone ? <Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={onColumns} /></Tooltip> : null}
          </span>
        </div>
        <XrayTable rows={r.rows} otherStudio={r.otherStudio} columns={columns} onReorder={onReorder} rowActions={rowActions} />
      </section>
    </>
  )
}
