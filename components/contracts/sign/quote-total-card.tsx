'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { displayDate } from '@/lib/format'
import { docTotals } from '@/lib/templates/data'
import { money2 } from '@/lib/quotes/math'
import type { ClientQuote } from '@/lib/quotes/client-quote'
import { readingLineCount } from '@/components/quotes/confirm/quote-stage'
import shell from './signing-page.module.css'
import cp from '@/components/quotes/confirm/confirm-page.module.css'

/**
 * (Contracts on the move, C3 — A-16) The quote an agreement signs, on the phone model: the confirmation page's TOTAL card (K4, P-12) over
 * the reading cards — the number, Total, the amount, the lines and the validity, and "View as printed" opening the house paper viewer. Drawn
 * on the confirmation page's own classes so the two never drift; `display: none` outside the phone model (confirm-page.module.css).
 */
export function QuoteTotalCard({ data, onPrinted }: { data: ClientQuote; onPrinted: () => void }) {
  const totals = useMemo(() => docTotals(data.data), [data.data])
  const lines = useMemo(() => readingLineCount(data.design, data.data, data.view), [data])
  return (
    <section className={cp.totalCard} aria-label="This quote" data-testid="sign-quote-total">
      <span className={shell.eyebrow}>{data.quote.number}{data.quote.version > 1 ? ` · version ${data.quote.version}` : ''}</span>
      <span className={cp.bigLabel}>Total</span>
      <strong className={cp.bigAmount}>{money2(totals.totalMinor)}</strong>
      <span className={cp.totalLine}>
        {lines ? `${lines} ${lines === 1 ? 'line' : 'lines'}` : null}
        {lines && data.data.quote.validUntil ? ' · ' : null}
        {data.data.quote.validUntil ? `valid until ${displayDate(data.data.quote.validUntil)}` : null}
      </span>
      <span className={cp.totalAction}><Button variant="secondary" appearance="outlined" size="lg" iconStart={<Icon name="description" size={20} />} onPress={onPrinted} data-testid="view-as-printed">View as printed</Button></span>
    </section>
  )
}

/** The total as a line for a hero or a bar — "S$68,176.00". */
export const quoteTotalLine = (data: ClientQuote) => money2(docTotals(data.data).totalMinor)
