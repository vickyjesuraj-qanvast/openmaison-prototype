'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { StatTile } from '@/components/om/stat-tile'
import type { TableColumn } from '@/components/om/table-columns'
import { moneyCard } from '@/lib/format'
import type { XrayBrand, XrayResult } from '@/lib/xray/compare'
import { XrayTable, type RowAction } from './xray-table'
import styles from './xray-result.module.css'

/* (the calm UI build 2026-10-27, 6-03 · W-289 · T-11) The summary says the difference once, in the card's money (whole dollars, "S$ 31,407"):
   one headline, three tiles, and How we counted one press away. Built from the reading's own numbers at display time, so every reading — an
   older one too — reads the same way; what is stored (`headline`, `footnote`) is left as it was. */
const m = (minor: number) => moneyCard(Math.abs(minor))
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
/** "Flo Design looks S$ 31,407 cheaper. Like-for-like, yours is S$ 20,963 more." — onPaper = theirs − yours, real = yours − theirs like-for-like. */
export function headlineOf(r: Pick<XrayResult, 'otherStudio' | 'onPaperMinor' | 'realDiffMinor'>): string {
  const O = r.otherStudio
  const paper = r.onPaperMinor < 0 ? `${O} looks ${m(r.onPaperMinor)} cheaper.` : r.onPaperMinor > 0 ? `${O} looks ${m(r.onPaperMinor)} more.` : 'On paper, the two quotes come to the same.'
  const like = r.realDiffMinor > 0 ? `Like-for-like, yours is ${m(r.realDiffMinor)} more.` : r.realDiffMinor < 0 ? `Like-for-like, yours is ${m(r.realDiffMinor)} less.` : 'Like-for-like, they come to the same.'
  return `${paper} ${like}`
}
/** How we counted — the reading's footnote, in the card's money. */
export function countedOf(r: Pick<XrayResult, 'engine' | 'onPaperMinor' | 'yoursOnlyMinor' | 'theirsOnlyMinor' | 'unpricedCount' | 'quoteTotalMinor' | 'yoursMinor' | 'yourLabel'>): string {
  const base = `On paper the difference is ${m(r.onPaperMinor)} — their quote leaves out ${m(r.yoursOnlyMinor)} of work yours includes${r.theirsOnlyMinor ? ` (and yours leaves out ${m(r.theirsOnlyMinor)} of theirs)` : ''}${r.unpricedCount ? `, plus ${r.unpricedCount} ${plural(r.unpricedCount, 'item', 'items')} with no price given` : ''}.`
  if (!(r.engine && r.engine >= 2)) return base
  const total = r.quoteTotalMinor != null && r.quoteTotalMinor !== r.yoursMinor ? ` — with them, ${r.yourLabel.split(' · ')[0]} comes to ${moneyCard(r.quoteTotalMinor)}` : ''
  return `${base} Both sides are compared on their line totals, before discounts and GST${total}.`
}
/** (W-214) The brands worth a word, the strongest first — high impact, then mild, then the rest — in place of the Impact chips. */
const IMPACT_RANK = { high: 0, mild: 1 } as const
const byImpact = (a: XrayBrand, b: XrayBrand) => (a.impact ? IMPACT_RANK[a.impact] : 2) - (b.impact ? IMPACT_RANK[b.impact] : 2)

/** (the calm UI build 2026-10-27, 6-23 · 6-03 — T-05) An explanation one press away: the house info button with its name as the tooltip, its
    words shown in place on a press — at every width, a finger included (a tooltip alone would never show on touch). The caller places the
    words; the button says whether they are open. */
function WhyButton({ label, open, onToggle, testId, className }: { label: string; open: boolean; onToggle: () => void; testId?: string; className?: string }) {
  return <Tooltip label={label} disabled={open}><IconButton icon="info" label={label} size={24} variant="bare" iconSize={18} iconWeight={300} className={className} aria-expanded={open} onClick={onToggle} data-testid={testId} /></Tooltip>
}

/** A point to tell the client: its number, the sentence (or its question), Why at the line's end — the evidence for the studio under it. */
function Point({ p, asked }: { p: XrayResult['points'][number]; asked: boolean }) {
  const [why, setWhy] = useState(false)
  return (
    <li className={styles.point}>
      <span className={styles.pointN}>{p.n}</span>
      <div className={styles.pointBody}>
        <span className={styles.sayRow}>
          <span className={styles.say}>“{asked && p.asQuestion ? p.asQuestion : p.say}”</span>
          <WhyButton label="Why" open={why} onToggle={() => setWhy((o) => !o)} testId="xray-why" />
        </span>
        {why ? <span className={styles.evidence}><b>{p.evidenceLabel}</b> · {p.evidence}</span> : null}
      </div>
    </li>
  )
}

/** A brand worth a word: its name, trade and side, Your advantage where it is, its note — and its sources one press away (Sources). */
function BrandCard({ b }: { b: XrayBrand }) {
  const [src, setSrc] = useState(false)
  return (
    <li className={styles.brand} data-tone={b.tone}>
      <div className={styles.brandHead}>
        <span className={styles.brandName}>{b.brand} <span className={styles.brandMeta}>{b.trade}{b.side === 'theirs' ? ' · in their quote' : b.side === 'yours' ? ' · in your quote' : ''}</span></span>
        <span className={styles.brandTools}>
          {b.tone === 'advantage' ? <MetaChip color="green">Your advantage</MetaChip> : null}   {/* (sweep S3) the house chip; (the calm UI build, W-214) no Impact chip — the strongest first */}
          {b.sources.length ? <WhyButton label="Sources" open={src} onToggle={() => setSrc((o) => !o)} testId="xray-sources" /> : null}
        </span>
      </div>
      <span className={styles.brandText}>{b.text}</span>
      {src ? <span className={styles.sources}>Sources · {b.sources.join(' · ')}</span> : null}
    </li>
  )
}

/**
 * A Quote X-Ray reading's four cards — the summary with its three figures, what to tell the client, the brands worth a word, the item-by-item
 * table — the record page's (REG-529, X-Ray parity REG-636…642) as they were, moved here unchanged so (pending modules S41b-3) the website's free
 * trial shows a visitor's reading in the very same cards: the record page brings its own presses (Send to client, the corrections, the
 * quote's link), the trial its own (Copy the message), each through these props.
 * (the calm UI build 2026-10-27 — 6-03 · 6-05 · 6-23) Each thing said once: no eyebrow (the crumb names the lead; the quote's number is the
 * Yours tile's help), one headline, the tiles in whole dollars, How we counted / Why / Sources behind an info button, one "Say it as a question"
 * for every point, no Impact chips (the strongest brand first), no legend (the Status chip says it).
 */
export function XrayReadingCards({ r, yourLabel, sayAction, asQuestion, onToggleQuestion, columns, onReorder, rowActions, onColumns, phone }: {
  r: XrayResult
  /** what the summary names as your quote — a link to it on the record page (the quote's number), in the Yours tile's help */
  yourLabel: ReactNode
  /** the What to tell the client card's own button */
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
  const cards = r.brands.filter((b) => b.tone === 'advantage' || b.tone === 'risk').slice().sort(byImpact)
  const checked = r.brands.filter((b) => b.tone === 'checked' || (b.tone === 'note' && b.side === 'theirs'))
  /* (6-23) one toggle for every point that has a question form: on when every one of them is said as its question */
  const askable = r.points.filter((p) => p.asQuestion)
  const allAsked = askable.length > 0 && askable.every((p) => asQuestion[p.n])
  const askAll = () => { for (const p of askable) if (!!asQuestion[p.n] === allAsked) onToggleQuestion(p.n) }
  const line = r.engine && r.engine >= 2 ? 'line totals, before GST' : null
  const [counted, setCounted] = useState(false)
  return (
    <>
      <section className={styles.card} aria-label="Summary" data-testid="xray-summary">
        <h2 className={styles.headline}>{headlineOf(r)}</h2>
        <div className={styles.tiles}>
          {/* (UX audit C11) what the two figures count — the quote's own total has discounts and GST in it (How we counted gives it) */}
          <StatTile label="Yours" value={moneyCard(r.yoursMinor)} testId="xray-tile-yours" help={<>{yourLabel}{line ? <> · {line}</> : null}</>} />
          <StatTile label={r.otherStudio} value={moneyCard(r.theirsMinor)} testId="xray-tile-theirs" help={line ?? undefined} />
          <StatTile label="Like-for-like difference" tone="primary" value={moneyCard(Math.abs(r.realDiffMinor))} testId="xray-tile-real"
                    help={r.realDiffMinor > 0 ? 'yours more' : r.realDiffMinor < 0 ? 'yours less' : 'the same'}
                    badge={<WhyButton label="How we counted" open={counted} onToggle={() => setCounted((o) => !o)} testId="xray-counted" className={styles.tileInfo} />} />
        </div>
        {counted ? <p className={styles.footnote} data-testid="xray-counted-words"><Icon name="info" size={18} weight={300} /> <span>{countedOf(r)}</span></p> : null}
      </section>

      <section className={styles.card} aria-label="What to tell the client" data-testid="xray-points">
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}><Icon name="chat" size={20} weight={300} /> What to tell the client</span>
          <span className={styles.headActions}>
            {askable.length ? <Button appearance="text" onPress={askAll}>{allAsked ? 'Say it as a point' : 'Say it as a question'}</Button> : null}
            {sayAction}
          </span>
        </div>
        {r.points.length === 0 ? <span className={styles.none}>The two quotes line up — nothing to flag.</span> : (
          <ol className={styles.points}>
            {r.points.map((p) => <Point key={p.n} p={p} asked={!!asQuestion[p.n]} />)}
          </ol>
        )}
      </section>

      <section className={styles.card} aria-label="Brands worth a word" data-testid="xray-brands">
        <div className={styles.cardHead}><span className={styles.cardTitle}><Icon name="verified" size={20} weight={300} /> Brands worth a word</span></div>
        {cards.length + checked.length === 0 ? <span className={styles.none}>Neither quote names a brand worth a word.</span> : (
          <ul className={styles.brands}>
            {cards.map((b, i) => <BrandCard key={`${b.brand}-${i}`} b={b} />)}
            {checked.length ? <li className={styles.also} data-testid="xray-checked">We also checked {checked.map((b) => b.brand).join(', ')} in their quote — nothing to flag.</li> : null}
          </ul>
        )}
      </section>

      <section className={styles.tableCard} aria-label="Item by item" data-testid="xray-items">
        <div className={styles.tableHead}>
          <span className={styles.cardTitle}>Item by item <span className={styles.count}>{r.compared} compared</span></span>
          {!phone ? <span className={styles.tableTools}><Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={onColumns} /></Tooltip></span> : null}
        </div>
        <XrayTable rows={r.rows} otherStudio={r.otherStudio} columns={columns} onReorder={onReorder} rowActions={rowActions} />
      </section>
    </>
  )
}
