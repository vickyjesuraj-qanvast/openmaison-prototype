'use client'

import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { Tooltip } from '@/components/om/tooltip'
import { Chips } from '@/components/om/chips'
import { money2, pct, sharePct, type CategoryShare, type NamedDiscount, type QuoteTotals } from '@/lib/quotes/math'
import type { Studio } from '@/lib/settings/types'
import { decimalTyped } from '@/lib/format'
import styles from './items-section.module.css'

export type Pricing = { additionalDiscountMode: 'pct' | 'amount'; additionalDiscountValue: number; gstEnabled: boolean; issuingEntity: string | null; /** (REG-559) the named discounts after the additional one */ discounts: NamedDiscount[] }

/** The most an additional discount can be in its mode: 100 % or the whole subtotal (REG-417 — the card shows the applied value). */
export const maxAdditional = (mode: Pricing['additionalDiscountMode'], subtotalMinor: number) => (mode === 'pct' ? 100 : Math.max(0, subtotalMinor) / 100)

/**
 * Below the table (1260:31541): the Issuing Entity field with its "GST-Registered" helper and the totals card (1271:36761):
 * Subtotal · n items, Discount, Additional Discount (% | S$ + amount), GST 9% switch, Total + Round Prices, and — for the
 * studio's owner only — the margin strip. Every figure is derived from the lines (lib/quotes/math.ts).
 */
export function ItemsSummary({ totals, pricing, studio, entities, owner, gstLabel = 'GST 9%', shares, onPickCategory, onPricing, onRound }: {
  totals: QuoteTotals
  /** (REG-562 · REG-593) The studio's issuing entities (Company › Profile) with their GST registration; the first is the studio itself. */
  entities: { name: string; gstRegistered: boolean; retired?: boolean }[]
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
  const entityOptions = [...new Set([studio.name, ...entities.filter((e) => !e.retired).map((e) => e.name), ...(pricing.issuingEntity ? [pricing.issuingEntity] : [])])]   // (REG-647) retired entities stay where named
  /* (REG-593) The picked entity's GST registration — the studio's own from Settings, the others' from Company › Profile. */
  const registered = pricing.issuingEntity ? (entities.find((e) => e.name === pricing.issuingEntity)?.gstRegistered ?? true) : studio.gstRegistered
  /* (REG-559) Named discounts: each row edits in place and writes the whole list; the applied amount prints on the right. */
  const discounts = pricing.discounts
  const setDiscounts = (next: NamedDiscount[]) => onPricing({ discounts: next })
  const patchDiscount = (id: string, patch: Partial<NamedDiscount>) => setDiscounts(discounts.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  return (
    <div className={styles.below}>
      <div className={styles.entity}>
        <TextField label="Issuing Entity" value={entity} mode="select" size="s" options={entityOptions}
                   onChange={(v) => { const e = entities.find((x) => x.name === v); const reg = v === studio.name ? studio.gstRegistered : (e?.gstRegistered ?? true); onPricing({ issuingEntity: v === studio.name ? null : v, gstEnabled: reg }) }} />   {/* (REG-593) the entity brings its GST with it */}
        <span className={styles.entityHelper}>{registered ? 'GST-Registered' : 'Not GST-registered — no GST on this quote'}</span>
      </div>
      {shares.length ? <ItemsBreakdown shares={shares} onPick={onPickCategory} owner={owner} /> : null}
      <div className={styles.totals} data-testid="quote-totals">
        <div className={styles.trow}>
          <span className={`${styles.tlabel} ${styles.tlabelTight}`}>Subtotal <span className={styles.dot}>·</span> <span className={styles.count}>{totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}</span></span>
          <span className={styles.tvalue}>{money2(totals.subtotalMinor)}</span>
        </div>
        <div className={styles.trow}>
          <span className={styles.tlabel}>Discount</span>
          <span className={styles.tvalue}>{money2(totals.discountMinor)}</span>
        </div>
        <div className={`${styles.trow} ${styles.trowStack}`}>   {/* (wave E, phone-4) on a phone the label takes its line, the % | S$ and the amount the next */}
          <span className={styles.tlabel}>Additional Discount</span>
          <span className={styles.tcontrols}>
            <button ref={modeRef} type="button" className={`${styles.mini} ${styles.miniSelect}`} aria-haspopup="menu" aria-expanded={modeOpen} aria-label="Additional discount unit" onClick={() => setModeOpen((o) => !o)}>
              {pricing.additionalDiscountMode === 'amount' ? 'S$' : '%'}<Icon name="expand_more" size={16} />
            </button>
            {/* (REG-728) the standard 200 */}
            <PortalMenu open={modeOpen} anchor={modeRef} onClose={() => setModeOpen(false)} role="menu" width={MENU_WIDTH.standard} sheetTitle="Additional discount">
              <DropdownItem role="menuitemradio" checked={pricing.additionalDiscountMode === 'pct'} onSelect={() => { setModeOpen(false); onPricing({ additionalDiscountMode: 'pct' }) }}>%</DropdownItem>
              <DropdownItem role="menuitemradio" checked={pricing.additionalDiscountMode === 'amount'} onSelect={() => { setModeOpen(false); onPricing({ additionalDiscountMode: 'amount' }) }}>S$</DropdownItem>
            </PortalMenu>
            <input className={`${styles.mini} ${styles.miniInput}`} inputMode="decimal" aria-label="Additional discount" value={draft ?? shown}
                   onFocus={() => setDraft(applied ? String(applied) : '')}
                   onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, ''))} onBlur={commit} onKeyDown={onKey} />
          </span>
        </div>
        {discounts.map((d) => <DiscountRow key={d.id} d={d} applied={totals.discountLines.find((x) => x.id === d.id)?.minor ?? 0} subtotalMinor={totals.subtotalMinor} onPatch={(p) => patchDiscount(d.id, p)} onRemove={() => setDiscounts(discounts.filter((x) => x.id !== d.id))} />)}
        {discounts.length < 10 ? (
          <button type="button" className={styles.addDisc} data-testid="add-discount" onClick={() => setDiscounts([...discounts, { id: `d-${Date.now().toString(36)}`, label: '', mode: 'pct', value: 0 }])}>
            <Icon name="add" size={16} />Add a discount
          </button>
        ) : null}
        <div className={styles.trow}>
          <span className={`${styles.tlabel} ${styles.switchLabel}`}>{gstLabel} <Switch size="sm" isSelected={pricing.gstEnabled} onChange={(v: boolean) => onPricing({ gstEnabled: v })} aria-label="Apply GST" /></span>
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
 * (REG-559) One named discount (the testers' "several additional discounts with their own words"): the word the client reads, its
 * % | S$ select, the value, and the applied amount on the right — rows of the totals card's own 24px boxes. Remove drops the row.
 */
function DiscountRow({ d, applied, subtotalMinor, onPatch, onRemove }: { d: NamedDiscount; applied: number; subtotalMinor: number; onPatch: (p: Partial<NamedDiscount>) => void; onRemove: () => void }) {
  const [modeOpen, setModeOpen] = useState(false)
  const modeRef = useRef<HTMLButtonElement>(null)
  const [label, setLabel] = useState<string | null>(null)
  const [value, setValue] = useState<string | null>(null)
  const max = maxAdditional(d.mode, subtotalMinor)
  const commitLabel = () => { if (label !== null && label.trim() !== d.label) onPatch({ label: label.trim() }); setLabel(null) }
  const commitValue = () => { if (value !== null) { const n = Math.min(max, Number(value)); if (Number.isFinite(n) && n >= 0 && n !== d.value) onPatch({ value: n }) } setValue(null) }
  const onKey = (commit: () => void) => (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } if (e.key === 'Escape') { e.preventDefault(); setLabel(null); setValue(null); e.currentTarget.blur(); commit() } }
  return (
    <div className={`${styles.trow} ${styles.discRow}`} data-testid="named-discount">
      <input className={`${styles.mini} ${styles.discLabel}`} aria-label="Discount name" placeholder="Discount name" value={label ?? d.label}
             onFocus={() => setLabel(d.label)} onChange={(e) => setLabel(e.target.value)} onBlur={commitLabel} onKeyDown={onKey(commitLabel)} />
      <button ref={modeRef} type="button" className={`${styles.mini} ${styles.miniSelect}`} aria-haspopup="menu" aria-expanded={modeOpen} aria-label="Discount unit" onClick={() => setModeOpen((o) => !o)}>
        {d.mode === 'amount' ? 'S$' : '%'}<Icon name="expand_more" size={16} />
      </button>
      {/* (REG-728) the standard 200 */}
      <PortalMenu open={modeOpen} anchor={modeRef} onClose={() => setModeOpen(false)} role="menu" width={MENU_WIDTH.standard} sheetTitle="Discount unit">
        <DropdownItem role="menuitemradio" checked={d.mode === 'pct'} onSelect={() => { setModeOpen(false); onPatch({ mode: 'pct', value: Math.min(100, d.value) }) }}>%</DropdownItem>
        <DropdownItem role="menuitemradio" checked={d.mode === 'amount'} onSelect={() => { setModeOpen(false); onPatch({ mode: 'amount' }) }}>S$</DropdownItem>
      </PortalMenu>
      <input className={`${styles.mini} ${styles.miniInput} ${styles.discValue}`} inputMode="decimal" aria-label="Discount value" value={value ?? (d.value ? String(d.value) : '0.00')}
             onFocus={() => setValue(d.value ? String(d.value) : '')} onChange={(e) => setValue(decimalTyped(e.target.value, 2))} onBlur={commitValue} onKeyDown={onKey(commitValue)} />
      <span className={styles.discAmount}>−{money2(applied)}</span>
      <Tooltip label="Remove this discount"><button type="button" className={styles.discRemove} aria-label="Remove this discount" onClick={onRemove}><Icon name="close" size={16} /></button></Tooltip>
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
function ItemsBreakdown({ shares, onPick, owner }: { shares: CategoryShare[]; onPick: (name: string) => void; owner: boolean }) {
  const rows = Math.ceil(shares.length / 2)
  /* (REG-623, parity Q-14) Owners read each category's margin as well — 1.0's margin panel "By Category": the category's lines against
     what they cost the studio, before the quote's own discounts; the bar shades by 1.0's bands (20 % and up green, 10–20 yellow, under
     10 red). The share stays the default for everyone. */
  const [mode, setMode] = useState<'share' | 'margin'>('share')
  const margin = owner && mode === 'margin'
  const band = (p: number) => (p >= 20 ? 'good' : p >= 10 ? 'fair' : 'low')
  return (
    <section className={styles.bycat} aria-label="By category" data-testid="items-by-category">
      <div className={styles.bycatHead}>
        <span>By category <span className={styles.bycatMeta}>· {shares.length} · {margin ? 'margin before the quote’s discounts' : 'share of the subtotal'}</span></span>
        {owner ? <Chips className={styles.bycatMode} label="Show" options={[{ value: 'share', label: 'Share' }, { value: 'margin', label: 'Margin' }]} value={mode} onChange={(v) => setMode(v === 'margin' ? 'margin' : 'share')} testId="bycat-mode" /> : null}
      </div>
      <div className={styles.shares} style={{ '--rows': rows } as CSSProperties}>
        {shares.map((c) => (
          <Tooltip key={c.name} label={margin && c.marginPct !== null ? `${money2(c.totalMinor - c.costMinor)} on ${money2(c.totalMinor)} · open ${c.name} in View by: Category` : `Open ${c.name} in View by: Category`}>
            <button type="button" className={styles.share} data-testid="items-share" onClick={() => onPick(c.name)}>
              <span className={styles.shareName}>{c.name}</span>
              {margin ? (
                <span className={styles.track} aria-hidden><span className={styles.fill} data-band={c.marginPct === null ? undefined : band(c.marginPct)} style={{ width: `${Math.max(0, Math.min(100, c.marginPct ?? 0)).toFixed(1)}%` }} /></span>
              ) : (
                <span className={styles.track} aria-hidden><span className={styles.fill} style={{ width: `${Math.min(100, c.pct).toFixed(1)}%` }} /></span>
              )}
              {margin
                ? (c.marginPct === null
                    ? <span className={styles.shareVal} data-none="">{c.count} <span className={styles.dot}>·</span> no price</span>
                    : <span className={styles.shareVal} data-neg={c.marginPct < 0 || undefined} data-testid="items-share-margin">{c.marginPct < 0 ? '−' : ''}{sharePct(Math.abs(c.marginPct))}</span>)
                : c.totalMinor > 0
                  ? <span className={styles.shareVal}>{sharePct(c.pct)}</span>
                  : <span className={styles.shareVal} data-none="">{c.count} <span className={styles.dot}>·</span> no cost</span>}
            </button>
          </Tooltip>
        ))}
      </div>
    </section>
  )
}
