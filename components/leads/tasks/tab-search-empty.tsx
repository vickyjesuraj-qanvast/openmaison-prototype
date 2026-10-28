'use client'

import styles from '@/components/leads/search-empty.module.css'

/**
 * "No results found" for a Lead Details tab whose search / filters match nothing (audit 2026-08-30, T6): the listing's
 * SearchEmpty card (780:95559, components/leads/search-empty.tsx — same stylesheet) with the noun the tab lists, so the
 * filter variant never reads "No leads match this filter." on the Tasks / Quotes / Contracts tab.
 */
export function TabSearchEmpty({ noun, searching, onClearAll, widen }: { noun: string; searching: boolean; onClearAll: () => void
  /** (REG-666) A search inside a folder found nothing: look in the whole library instead ("Search all of Quotes"). */
  widen?: { label: string; onPress: () => void } }) {
  return (
    <div className={styles.card} data-testid="search-empty">
      <span className={styles.title}>No results found</span>
      <span className={styles.sub}>{searching ? 'Check your spelling and try again.' : `No ${noun} match this filter.`}</span>
      {widen ? <button type="button" className={styles.clear} onClick={widen.onPress}>{widen.label}</button> : null}
      <button type="button" className={styles.clear} onClick={onClearAll}>Clear all</button>
    </div>
  )
}
