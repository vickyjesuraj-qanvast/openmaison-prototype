'use client'

import { Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { CASETRUST_POINTS, CASETRUST_TERMS, CASETRUST_TICK, caseTrustDisclosure } from '@/lib/contracts/casetrust'
import styles from './signing-page.module.css'

/**
 * (gaps build D, item 6 — 1.0's *CaseTrust signing step*, I-356 · I-357) The deposit-protection disclosure a CaseTrust-accredited studio shows
 * before the client signs: what the scheme does, where its terms are, and a tick the client must give — the read-and-accept gate's own box
 * (`.accept`), so Send code (and Continue to sign) wait for it. The tick's time travels with the signature and is kept on the record.
 */
export function CaseTrustBox({ studio, at, onTick, disabled = false }: { studio: string; at: number | null; onTick: (at: number | null) => void; disabled?: boolean }) {
  return (
    <div className={styles.caseTrust} data-testid="gate-casetrust">
      <span className={styles.caseTrustHead}><Icon name="verified_user" size={20} />CaseTrust deposit protection</span>
      <p className={styles.caseTrustText}>{caseTrustDisclosure(studio)}</p>
      <ul className={styles.caseTrustList}>
        {CASETRUST_POINTS.map((p) => <li key={p}>{p}</li>)}
        <li>Full terms: <a href={CASETRUST_TERMS} target="_blank" rel="noopener noreferrer">case.org.sg/casetrust-renovation</a></li>
      </ul>
      <label className={styles.accept} data-disabled={disabled || undefined} data-testid="gate-casetrust-tick">
        <Checkbox isSelected={!!at} isDisabled={disabled} onChange={(on: boolean) => onTick(on ? Date.now() : null)} aria-label={CASETRUST_TICK} />
        <span>{CASETRUST_TICK}</span>
      </label>
    </div>
  )
}
