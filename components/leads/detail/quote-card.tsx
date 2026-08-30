'use client'

import { Button, Tag } from '@/components/ds'
import type { Quote } from '@/lib/db/schema'
import { money } from '@/lib/format'
import { Card, CardEmpty } from './card'
import styles from './quote-card.module.css'

/**
 * QUOTES card (858:25057 · empty 858:24272): amount row + status tag, Draft → Sent → Approved progress.
 * Spec: design-source/context/lead-overview/05-*.txt.
 */

const STEPS = ['Draft', 'Sent', 'Approved'] as const
/**
 * The mock's three step labels stay verbatim; the status itself is one of the five in lib/leads/quote-filters.ts
 * (QUOTE_STATUSES) — Draft → 0, Sent for Approval → 1, Approved / Sent to Client / Signed → 2. The Tag shows the status as is.
 */
const stepOf = (status: string) => (status === 'Draft' ? 0 : status === 'Sent for Approval' ? 1 : 2)

export function QuoteCard({ quote, onOpenTab, onFromScratch, onFromTemplate }: {
  quote: Quote | null
  onOpenTab: () => void
  onFromScratch: () => void
  onFromTemplate: () => void
}) {
  // Bar: 1/3 for Draft, 2/3 for Sent, full for Approved (858:25057 shows 122/390 ≈ 1/3 on a Draft quote).
  const stepIdx = quote ? stepOf(quote.status) : 0
  const pct = ((stepIdx + 1) / STEPS.length) * 100

  return (
    <Card title="QUOTES" headGap={12} onOpen={onOpenTab} openLabel="Open quotes" testId="quotes">
      {quote ? (
        <div className={styles.body}>
          <div className={styles.group}>
            <div className={styles.amountRow}>
              <div className={styles.amountText}>
                {/* "S$ 70,500" — the mock types a space after S$ */}
                <span className={styles.amount}>{`S$ ${money(quote.amountMinor)}`}</span>
                <span className={styles.sub}>{quote.number}</span>
                <span className={styles.sub}>·</span>
                <span className={styles.sub}>{quote.visibility}</span>
              </div>
              <Tag appearance="outlined" className={styles.tag}>{quote.status}</Tag>
            </div>
            <div className={styles.track}>
              <div className={styles.bar} style={{ width: `${pct}%` }} />
            </div>
            <div className={styles.labels}>
              {STEPS.map((s, i) => (
                <span key={s} data-current={i === stepIdx || undefined}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <CardEmpty
          illustration="/figma-assets/empty-quotes.svg"
          width={140}
          height={137}
          title="Create your first quote"
          body="Create quotes and share it with your clients"
          gap={16}
          actions={(
            <>
              <Button variant="secondary" appearance="outlined" onPress={onFromScratch}>From Scratch</Button>
              <Button onPress={onFromTemplate}>From Template</Button>
            </>
          )}
        />
      )}
    </Card>
  )
}
