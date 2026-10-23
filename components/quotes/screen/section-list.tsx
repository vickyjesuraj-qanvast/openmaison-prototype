'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import type { SectionKey } from '@/lib/quotes/sections'
import { ScreenBar } from './screen-bar'
import styles from './section-list.module.css'

/** (Contracts on the move, P-02) The row's key is the host's — the quote's `SectionKey` by default; the contract passes its own. */
export type SectionRow<K extends string = SectionKey> = { key: K; label: string; count?: number | null; summary: string }

/**
 * (Quotes on the move, P-02 · P-09 · Q-02 — his "please go ahead" 2026-10-22) **Edit quote** on a phone and a touch tablet: a list of the
 * sections, each a row that says what is inside (General info · Items (n) · Payment schedule · Files (n) · Terms and conditions · Additional
 * notes · Signature), so most are never opened; a row opens that section as its own screen. The bar is the editor's header on a phone
 * (P-09): ✕ · "Edit quote" over the number and Saved · Done — both ✕ and Done return to the Quote screen (every change has saved itself).
 * Edit lands here every time (Q-02). On a landscape tablet the list is the left pane and the open section the right; `current` marks it.
 */
export function SectionList<K extends string = SectionKey>({ rows, number, savedLabel, current, onOpen, onDone, pane = false, inert = false, title = 'Edit quote', subtitle }: {
  rows: SectionRow<K>[]
  number: string
  savedLabel: string
  current: K | null
  onOpen: (key: K) => void
  onDone: () => void
  /** (Contracts on the move, P-02) The bar's words for another record — "Edit contract" over its title and Saved; the quote's by default. */
  title?: string
  subtitle?: string
  /** The landscape tablet's left pane (360): the open section sits beside it. */
  pane?: boolean
  /** A section screen covers it (a phone): nothing of it is read or reached until ← brings it back. */
  inert?: boolean
}) {
  return (
    <div className={styles.layer} data-pane={pane || undefined} role="region" aria-label={title} data-om-surface="" data-testid="section-list" inert={inert}>
      <ScreenBar title={title} subtitle={subtitle ?? `${number} · ${savedLabel}`}
                 leading={<Tooltip label="Back to the quote"><IconButton icon="close" label="Close" size={24} variant="bare" iconSize={24} iconFamily="outlined" onClick={onDone} data-testid="edit-close" /></Tooltip>}
                 trailing={<span className={styles.done}><Button appearance="text" onPress={onDone} data-testid="edit-done">Done</Button></span>} />
      <ul className={styles.rows} data-kb-list="sections">
        {rows.map((r) => (
          <li key={r.key} className={styles.item}>
            <button type="button" className={styles.row} aria-current={current === r.key ? 'true' : undefined} onClick={() => onOpen(r.key)} data-kb-row="" data-kb-id={r.key} data-kb-open="" data-testid={`section-row-${r.key}`}>
              <span className={styles.text}>
                <span className={styles.title}>{r.label}{r.count != null ? <span className={styles.count}> {r.count}</span> : null}</span>
                <span className={styles.summary}>{r.summary}</span>
              </span>
              <span className={styles.chev} aria-hidden><Icon name="chevron_right" size={24} /></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
