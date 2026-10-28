'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { moneySGD } from '@/lib/format'
import styles from './contracts-empty.module.css'

/**
 * Lead Details › Contracts — empty state (frame 111, 931:38610 / card 931:38634; spec design-source/context/lead-contracts/
 * 01-listing-empty.txt "Empty state"): 1244×784 card, centred illustration 180×176 (931:38636 — the same undraw_no-data
 * asset as Quotes), texts 931:38647, buttons 931:38650 (From Scratch 931:38651 · From Template 931:38652).
 * Copied from components/leads/quotes/quotes-empty.tsx with the contracts' copy.
 */
export function ContractsEmpty({ onFromScratch, onFromTemplate, onImport, names }: {
  onFromScratch: () => void; onFromTemplate: () => void; onImport?: () => void
  /** (UX audit C6) The lead's tab: the quote a new contract will name — "Names OM-10006 · S$67,393" — so the studio knows before it starts. */
  names?: { number: string; amountMinor: number } | null
}) {
  return (
    <div className={styles.card} data-testid="contracts-empty">
      <div className={styles.inner}>
        {/* undraw_no-data_ig65 — the svg's viewBox is 140×137 (≈ the mock's 180×176 aspect), scaled up to the mock's size. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/figma-assets/empty-quotes.svg" width={180} height={176} alt="" className={styles.art} />
        <div className={styles.texts}>
          {/* (the calm UI build 2026-10-27, 2-23 · W-506) one plain line — "share it" read as a typo; the buttons below say how */}
          <p className={styles.title}>No contract yet</p>
          {names ? <p className={styles.names} data-testid="contracts-empty-quote"><Icon name="request_quote" size={18} weight={300} />Names {names.number} · {moneySGD(names.amountMinor)}</p> : null}
        </div>
        <div className={styles.buttons}>
          <Button variant="secondary" appearance="outlined" onPress={onFromScratch}>From the studio agreement</Button>   {/* (sweep S2 #20) the mock's "From Scratch" made the full agreement — one name for one action, the picker's */}
          <Button onPress={onFromTemplate} data-kb="create" data-kb-label="New contract">From a template</Button>   {/* (REG-735) C, while the toolbar's New Contract steps back */}
          {/* (REG-735) New Contract ▾'s third live way in, kept on the card while the toolbar steps back */}
          {onImport ? <Button appearance="text" onPress={onImport}>Import a file</Button> : null}
        </div>
      </div>
    </div>
  )
}
