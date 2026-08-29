'use client'

import styles from './search-empty.module.css'

/** Table-view "No results found" (780:95559): bordered card, illustration, copy, Clear All.
 *  The mock's sub-copy is search-specific; with no search text the filter variant reuses the module's existing string. */
export function SearchEmpty({ onClearAll, searching = true }: { onClearAll: () => void; searching?: boolean }) {
  return (
    <div className={styles.card}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/figma-assets/empty-no-results.svg" alt="" className={styles.art} />
      <span className={styles.title}>No results found</span>
      <span className={styles.sub}>{searching ? 'Check your spelling and try again.' : 'No leads match this filter.'}</span>
      <button type="button" className={styles.clear} onClick={onClearAll}>Clear All</button>
    </div>
  )
}
