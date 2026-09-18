'use client'

import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import { DropdownItem } from '@/components/leads/dropdown'
import { Tooltip } from '@/components/om/tooltip'
import { money2, pct, sharePct, type CategoryShare, type QuoteTotals } from '@/lib/quotes/math'
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
export function ItemsSummary({ totals, pricing, studio, owner, gstLabel = 'GST 9%', shares, onPickCategory, onPricing, onRound }: {
  totals: QuoteTotals
  /** (REG-532) By category — the subtotal split by the lines' categories; a row opens that bucket in View by: Category. */
  shares: CategoryShare[]
  onPickCategory: (name: string) => void
  gstLabel?: string
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
      {shares.length ? <ItemsBreakdown shares={shares} onPick={onPickCategory} /> : null}
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
          <span className={styles.tlabel}>{gstLabel} <Switch size="sm" isSelected={pricing.gstEnabled} onChange={(v: boolean) => onPricing({ gstEnabled: v })} aria-label="Apply GST" /></span>
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

/**
 * (REG-532) By category (1.0's block, placed in 2.0 under Issuing Entity beside the totals card — owner 2026-09-18): the caption
 * eyebrow the section uses, then one 24px row per category the quote prices — name · a 6px primary bar · its share of the subtotal
 * (one decimal under 10). Two columns, filled down the left first, so eleven categories stand about as tall as the totals card;
 * a category whose lines carry no price reads "n · no cost" with an empty bar. A row is a button: it switches View by to Category
 * and opens that bucket alone. Internal — it never prints in Preview or the client view.
 */
function ItemsBreakdown({ shares, onPick }: { shares: CategoryShare[]; onPick: (name: string) => void }) {
  const rows = Math.ceil(shares.length / 2)
  return (
    <section className={styles.bycat} aria-label="By category" data-testid="items-by-category">
      <div className={styles.bycatHead}>By category <span className={styles.bycatMeta}>· {shares.length} · share of the subtotal</span></div>
      <div className={styles.shares} style={{ '--rows': rows } as CSSProperties}>
        {shares.map((c) => (
          <Tooltip key={c.name} label={`Open ${c.name} in View by: Category`}>
            <button type="button" className={styles.share} data-testid="items-share" onClick={() => onPick(c.name)}>
              <span className={styles.shareName}>{c.name}</span>
              <span className={styles.track} aria-hidden><span className={styles.fill} style={{ width: `${Math.min(100, c.pct).toFixed(1)}%` }} /></span>
              {c.totalMinor > 0
                ? <span className={styles.shareVal}>{sharePct(c.pct)}</span>
                : <span className={styles.shareVal} data-none="">{c.count} <span className={styles.dot}>·</span> no cost</span>}
            </button>
          </Tooltip>
        ))}
      </div>
    </section>
  )
}
