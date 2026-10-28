'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import styles from './search-empty.module.css'

/** Table-view "No results found" (780:95559): bordered card, illustration, copy, Clear All.
 *  The mock's sub-copy is search-specific; with no search text the filter variant reuses the module's existing string.
 *  (UX audit L11) A search for a Singapore number that finds nobody — a caller-ID number, typically — is not a spelling problem: the card
 *  says so and offers "Add lead with 9123 4599", the lead form opening with the number filled. Outlined: the page's one filled button is
 *  the header's Add Lead (REG-735's rule). */
export function SearchEmpty({ onClearAll, searching = true, phone = null, onAddPhone }: {
  onClearAll: () => void
  searching?: boolean
  /** The number as the listing prints it ("9123 4599") when the search is one. */
  phone?: string | null
  onAddPhone?: () => void
}) {
  const offerAdd = searching && !!phone && !!onAddPhone
  return (
    <div className={styles.card} data-testid="search-empty">
      <span className={styles.title}>No results found</span>
      <span className={styles.sub}>{offerAdd ? 'No lead has this number yet.' : searching ? 'Check your spelling and try again.' : 'No leads match this filter.'}</span>
      {offerAdd ? (
        <span className={styles.add}>
          <Button variant="primary" appearance="outlined" iconStart={<Icon name="person_add" size={20} />} onPress={onAddPhone} data-testid="search-add-phone">
            {`Add lead with ${phone}`}
          </Button>
        </span>
      ) : null}
      <button type="button" className={styles.clear} onClick={onClearAll}>Clear all</button>
    </div>
  )
}
