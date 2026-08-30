'use client'

import { Button } from '@/components/ds'
import styles from './contracts-empty.module.css'

/**
 * Lead Details › Contracts — empty state (frame 111, 931:38610 / card 931:38634; spec design-source/context/lead-contracts/
 * 01-listing-empty.txt "Empty state"): 1244×784 card, centred illustration 180×176 (931:38636 — the same undraw_no-data
 * asset as Quotes), texts 931:38647, buttons 931:38650 (From Scratch 931:38651 · From Template 931:38652).
 * Copied from components/leads/quotes/quotes-empty.tsx with the contracts' copy.
 */
export function ContractsEmpty({ onFromScratch, onFromTemplate }: { onFromScratch: () => void; onFromTemplate: () => void }) {
  return (
    <div className={styles.card} data-testid="contracts-empty">
      <div className={styles.inner}>
        {/* undraw_no-data_ig65 — the svg's viewBox is 140×137 (≈ the mock's 180×176 aspect), scaled up to the mock's size. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/figma-assets/empty-quotes.svg" width={180} height={176} alt="" className={styles.art} />
        <div className={styles.texts}>
          <p className={styles.title}>Create your first contract</p>
          <p className={styles.body}>Create contracts and share it with your clients</p>
        </div>
        <div className={styles.buttons}>
          <Button variant="secondary" appearance="outlined" onPress={onFromScratch}>From Scratch</Button>
          <Button onPress={onFromTemplate}>From Template</Button>
        </div>
      </div>
    </div>
  )
}
