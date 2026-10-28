'use client'

import { Button } from '@/components/ds'
import type { Quote } from '@/lib/db/schema'
import { displayDate, moneyCard } from '@/lib/format'
import { quoteStatuses, quoteStepIndex, quoteVisibilityLabel, sentToClientOf } from '@/lib/leads/quote-filters'
import { quoteStatusLabel } from '@/lib/quotes/status-words'   // (the calm UI build 2026-10-27 — B4's request) the one status map every quote screen reads
import type { QuoteApproval } from '@/lib/settings/types'
import { Card, CardEmpty } from './card'
import styles from './quote-card.module.css'

/**
 * QUOTES card (858:25057 · empty 858:24272): amount row, the quote's state in one sentence, over the quote's progress track.
 * Spec: design-source/context/lead-overview/05-*.txt.
 *
 * The track is the STUDIO'S OWN quote lifecycle, not a fixed three (user 2026-08-30): `quoteStatuses(approval)` — the same list the Quotes
 * tab's row menu and Filters modal read — one segment a step, the steps the quote has reached filled.
 *
 * (the calm UI build 2026-10-27 — audit 2-25 · T-04) The state is said ONCE, as a sentence about this client ("Approved — not sent to Vivien
 * yet"), where it used to be a CAPS tag beside six step names that said it again; the track keeps its segments, unlabelled. The visibility
 * reads as who can see the quote ("Only your studio can see it" — `quoteVisibilityLabel`), the status as its display word
 * (`quoteStatusLabel`, lib/quotes/status-words.ts — the one map every quote screen reads); the stored values are unchanged.
 */

/** The quote's state as a sentence about the client — every word from the quote's own record. */
export function quoteStateLine(q: Pick<Quote, 'status' | 'sentAt' | 'clientSentAt' | 'confirmedAt' | 'signedAt'>, clientFirst: string | null): string {
  const who = clientFirst || 'the client'
  const sent = sentToClientOf(q)
  switch (q.status) {
    case 'Approved': return sent ? `Approved — with ${who} since ${displayDate(sent)}` : `Approved — not sent to ${who} yet`
    case 'Sent to Client': return sent ? `With ${who} since ${displayDate(sent)}` : `With ${who}`
    case 'Confirmed': return q.confirmedAt ? `Confirmed by ${who} on ${displayDate(q.confirmedAt)}` : `Confirmed by ${who}`
    case 'Signed': return q.signedAt ? `Signed on ${displayDate(q.signedAt)}` : 'Signed'
    case 'Draft': return 'Draft — not sent yet'
    default: return quoteStatusLabel(q.status)
  }
}

export function QuoteCard({ quote, approval, client = null, onOpenTab, onCreate }: {
  quote: Quote | null
  /** Settings › Leads › Quote approval — decides which statuses the lifecycle has. */
  approval: QuoteApproval
  /** (the calm UI build) The client's first name — the state line and the visibility speak of them. */
  client?: string | null
  onOpenTab: () => void
  /** (the calm UI build 2026-10-27 — audit 2-04) The empty card's one outlined way in: the Create Quote window (Blank Quote · a template ·
   *  Upload a quote). */
  onCreate: () => void
}) {
  const steps = quoteStatuses(approval)
  const stepIdx = quote ? quoteStepIndex(quote.status, approval) : 0
  const line = quote ? quoteStateLine(quote, client) : ''

  return (
    <Card title="Quotes" headGap={12} onOpen={onOpenTab} openLabel="Open quotes" testId="quotes">
      {quote ? (
        <div className={styles.body}>
          <div className={styles.group}>
            <div className={styles.amountRow}>
              <div className={styles.amountText}>
                {/* "S$ 70,500" — the house money on a card (moneyCard) */}
                <span className={styles.amount}>{moneyCard(quote.amountMinor)}</span>
                {/* number · visibility wrap as ONE unit — as four siblings the row could break after the "·", ending a line on a lone separator. */}
                <span className={styles.meta}>
                  <span className={styles.sub}>{quote.number}</span>
                  <span className={styles.sub}>·</span>
                  <span className={styles.sub}>{quoteVisibilityLabel(quote.visibility, client)}</span>
                </span>
              </div>
            </div>
            <p className={styles.state} data-testid="quote-card-state" data-status={quote.status}>{line}</p>
            {/* One unbroken track the full width of the card: a segment a step of the studio's lifecycle, the reached ones filled. */}
            <div className={styles.track} role="img" aria-label={`${quoteStatusLabel(quote.status)} — step ${stepIdx + 1} of ${steps.length}`}>
              <div className={styles.bar} style={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }} />
              {steps.slice(1).map((s, i) => (
                <span key={s} className={styles.mark} style={{ left: `${((i + 1) / steps.length) * 100}%` }} aria-hidden />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <CardEmpty
          illustration="/figma-assets/empty-quotes.svg"
          width={140}
          height={137}
          title="No quote yet"
          body="Make one from a template or upload your own."
          gap={16}
          actions={<Button variant="secondary" appearance="outlined" onPress={onCreate}>Create a quote</Button>}
        />
      )}
    </Card>
  )
}
