'use client'

import { Button } from '@/components/ds'
import styles from './quotes-empty.module.css'

/**
 * Lead Details › Quotes — empty state (frame 108, 910:36242 / card 910:36266; spec design-source/context/lead-quotes/
 * 01-listing-table.txt "Empty state"): 1244×784 card, centred illustration 180×176 (910:36268), texts 910:36279,
 * buttons 910:36282. Same copy and buttons as the Overview QUOTES card's empty state (components/leads/detail/quote-card.tsx).
 */
export function QuotesEmpty({ onFromScratch, onFromTemplate }: { onFromScratch: () => void; onFromTemplate: () => void }) {
  return (
    <div className={styles.card} data-testid="quotes-empty">
      <div className={styles.inner}>
        {/* undraw_no-data_ig65 — the svg's viewBox is 140×137 (≈ the mock's 180×176 aspect), scaled up to the mock's size. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/figma-assets/empty-quotes.svg" width={180} height={176} alt="" className={styles.art} />
        <div className={styles.texts}>
          <p className={styles.title}>Create your first quote</p>
          <p className={styles.body}>Create quotes and share it with your clients</p>
        </div>
        <div className={styles.buttons}>
          <Button variant="secondary" appearance="outlined" onPress={onFromScratch}>From Scratch</Button>
          <Button onPress={onFromTemplate}>From Template</Button>
        </div>
      </div>
    </div>
  )
}
