'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import { DropdownItem } from '@/components/leads/dropdown'
import { money2, pct, type QuoteTotals } from '@/lib/quotes/math'
import type { Studio } from '@/lib/settings/types'
import styles from './items-section.module.css'

export type Pricing = { additionalDiscountMode: 'pct' | 'amount'; additionalDiscountValue: number; gstEnabled: boolean; issuingEntity: string | null }

/** The most an additional discount can be in its mode: 100 % or the whole subtotal (REG-417 — the card shows the applied value). */
export const maxAdditional = (mode: Pricing['additionalDiscountMode'], subtotalMinor: number) => (mode === 'pct' ? 100 : Math.max(0, subtotalMinor) / 100)

/**
 * Below the table (1260:31541): the Issuing Entity field with its "GST-Registered" helper and the totals card (1271:36761):
 * Subtotal · n items, Discount, Additional Discount (% | S$ + amount), GST 9% switch, Total + Round Prices, and — for the
 * studio's owner only — the margin strip. Every figure is derived from the lines (lib/quotes/math.ts).
 */
export function ItemsSummary({ totals, pricing, studio, owner, onPricing, onRound }: {
  totals: QuoteTotals
  pricing: Pricing
  studio: Studio
  owner: boolean
  onPricing: (patch: Partial<Pricing>) => void
  onRound: () => void
}) {
  const [modeOpen, setModeOpen] = useState(false)
  const modeRef = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const cancelled = useRef(false)
  const max = maxAdditional(pricing.additionalDiscountMode, totals.subtotalMinor)
  const applied = Math.min(pricing.additionalDiscountValue, max)
  const shown = applied ? String(applied) : '0.00'
  const commit = () => {
    const c = cancelled.current; cancelled.current = false
    if (!c && draft !== null) { const n = Math.min(max, Number(draft)); if (Number.isFinite(n) && n >= 0 && n !== pricing.additionalDiscountValue) onPricing({ additionalDiscountValue: n }) }
    setDraft(null)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
    if (e.key === 'Escape') { e.preventDefault(); cancelled.current = true; e.currentTarget.blur() }
  }
  const entity = pricing.issuingEntity ?? studio.name
  return (
    <div className={styles.below}>
      <div className={styles.entity}>
        <TextField label="Issuing Entity" value={entity} mode="select" size="s" options={[studio.name]} onChange={(v) => onPricing({ issuingEntity: v === studio.name ? null : v })} />
        {studio.gstRegistered ? <span className={styles.entityHelper}>GST-Registered</span> : null}
      </div>
      <div className={styles.totals} data-testid="quote-totals">
        <div className={styles.trow}>
          <span className={`${styles.tlabel} ${styles.tlabelTight}`}>Subtotal <span className={styles.dot}>·</span> <span className={styles.count}>{totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}</span></span>
          <span className={styles.tvalue}>{money2(totals.subtotalMinor)}</span>
        </div>
        <div className={styles.trow}>
          <span className={styles.tlabel}>Discount</span>
          <span className={styles.tvalue}>{money2(totals.discountMinor)}</span>
        </div>
        <div className={styles.trow}>
          <span className={styles.tlabel}>Additional Discount</span>
          <span className={styles.tcontrols}>
            <button ref={modeRef} type="button" className={`${styles.mini} ${styles.miniSelect}`} aria-haspopup="menu" aria-expanded={modeOpen} aria-label="Additional discount unit" onClick={() => setModeOpen((o) => !o)}>
              {pricing.additionalDiscountMode === 'amount' ? 'S$' : '%'}<Icon name="expand_more" size={16} />
            </button>
            <PortalMenu open={modeOpen} anchor={modeRef} onClose={() => setModeOpen(false)} role="menu" width={120} sheetTitle="Additional discount">
              <DropdownItem role="menuitemradio" checked={pricing.additionalDiscountMode === 'pct'} onSelect={() => { setModeOpen(false); onPricing({ additionalDiscountMode: 'pct' }) }}>%</DropdownItem>
              <DropdownItem role="menuitemradio" checked={pricing.additionalDiscountMode === 'amount'} onSelect={() => { setModeOpen(false); onPricing({ additionalDiscountMode: 'amount' }) }}>S$</DropdownItem>
            </PortalMenu>
            <input className={`${styles.mini} ${styles.miniInput}`} inputMode="decimal" aria-label="Additional discount" value={draft ?? shown}
                   onFocus={() => setDraft(applied ? String(applied) : '')}
                   onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, ''))} onBlur={commit} onKeyDown={onKey} />
          </span>
        </div>
        <div className={styles.trow}>
          <span className={styles.tlabel}>GST 9% <Switch size="sm" isSelected={pricing.gstEnabled} onChange={(v: boolean) => onPricing({ gstEnabled: v })} aria-label="Apply GST" /></span>
          <span className={styles.tvalue}>{money2(totals.gstMinor)}</span>
        </div>
        <div className={styles.rule} />
        <div className={styles.trow}>
          <span className={`${styles.tlabel} ${styles.totalLabel}`}><span className={styles.total}>Total</span><button type="button" className={styles.roundLink} onClick={onRound}>Round Prices</button></span>
          <span className={`${styles.tvalue} ${styles.total}`}>{money2(totals.totalMinor)}</span>
        </div>
        {owner ? (
          <div className={styles.margin}>
            <span className={styles.marginLabel}><Icon name="visibility_off" size={16} />Margin · owners only</span>
            {/* The strip prints whole dollars ("S$7,220", 1271:36761): the cents are the card's, not the owner's glance. */}
            <span className={styles.marginValue}>{pct(Number(totals.marginPct.toFixed(1)))}<span className={styles.dot}>·</span>{money2(Math.round(totals.marginMinor / 100) * 100).replace(/\.00$/, '')}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
