'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Dialog } from '@/components/om/dialog'
import { money2, type CategoryShare } from '@/lib/quotes/math'
import { EntityField, ItemsBreakdown, TotalsCard, type SummaryProps } from './items-summary'
import { useVariation } from './variation-context'
import styles from './items-touch-foot.module.css'

/**
 * (Quotes on the move — P-03, C-08 · C-09; his "please go ahead" 2026-10-22) The Items section's pinned foot on a phone and a touch tablet
 * (≤1024, items-layout.ts): the one number anyone on site wants — Subtotal · GST on a line, the Total under it, bold — with **Adjust**
 * (the issuing entity, the discounts, GST and Round prices: the desktop's totals card, in a form) and **Breakdown** (By category, REG-532,
 * folded away — a desk analysis), then the two adds at 48: Add section · + Add item. `position: sticky; bottom: 0` inside the section's
 * own body, so it holds in the editor's page and in a screen that scrolls itself alike; never rendered at a desktop width (the totals
 * block stays where 1271:36761 draws it, 1,300px further down a phone no longer scrolls).
 */
export function ItemsTouchFoot({ totals, gstLabel = 'GST 9%', shares, onPickCategory, onAddItem, onAddSection, ...summary }: SummaryProps & {
  shares: CategoryShare[]
  onPickCategory: (name: string) => void
  onAddItem: () => void
  onAddSection: () => void
}) {
  const variation = useVariation()
  const [open, setOpen] = useState<'adjust' | 'breakdown' | null>(null)
  const discount = totals.discountMinor
  return (
    <div className={styles.foot} data-testid="items-touch-foot">
      <div className={styles.strip}>
        <span className={styles.line} data-testid="touch-sums">
          Subtotal {money2(totals.subtotalMinor)}{discount ? ` · Discount −${money2(discount)}` : ''}{summary.pricing.gstEnabled ? ` · ${gstLabel} ${money2(totals.gstMinor)}` : ' · No GST'}
        </span>
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>{variation ? 'Change to the contract' : 'Total'}</span>
          <span className={styles.totalValue} data-testid="touch-total">{money2(totals.totalMinor)}</span>
          <div className={styles.stripActions}>
            <Button variant="secondary" appearance="text" onPress={() => setOpen('adjust')} data-testid="touch-adjust">Adjust</Button>
            {shares.length ? <Button variant="secondary" appearance="text" onPress={() => setOpen('breakdown')} data-testid="touch-breakdown">Breakdown</Button> : null}
          </div>
        </div>
      </div>
      <div className={styles.adds}>
        <Button variant="secondary" appearance="outlined" size="lg" onPress={onAddSection} data-testid="touch-add-section">Add section</Button>
        <Button variant="primary" size="lg" iconStart={<Icon name="add" size={20} />} onPress={onAddItem} data-testid="touch-add-item">Add item</Button>
      </div>
      {/* the desktop's totals card and By category, each in a form (a bottom sheet on the phone, REG-353); Done closes — every change is live */}
      <Dialog open={open === 'adjust'} onClose={() => setOpen(null)} title="Totals" subtitle="Issued by, discounts, GST and rounding — every change lands at once" size="form" portal
              footer={<Button onPress={() => setOpen(null)}>Done</Button>}>
        <div className={styles.adjustBody} data-testid="touch-adjust-body">
          <EntityField pricing={summary.pricing} studio={summary.studio} entities={summary.entities} billsProject={summary.billsProject ?? null} onPricing={summary.onPricing} />
          <TotalsCard totals={totals} pricing={summary.pricing} owner={summary.owner} gstLabel={gstLabel} onPricing={summary.onPricing} onRound={summary.onRound} touch />
        </div>
      </Dialog>
      <Dialog open={open === 'breakdown'} onClose={() => setOpen(null)} title="By trade" subtitle="How the subtotal splits by trade — for you, never printed" size="form" portal
              footer={<Button onPress={() => setOpen(null)}>Done</Button>}>
        <div className={styles.breakdownBody} data-testid="touch-breakdown-body">
          <ItemsBreakdown shares={shares} owner={summary.owner} onPick={(name) => { setOpen(null); onPickCategory(name) }} />
        </div>
      </Dialog>
    </div>
  )
}
