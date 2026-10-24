'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Button, Tag } from '@/components/ds'
import type { Quote } from '@/lib/db/schema'
import { money } from '@/lib/format'
import { quoteStatuses, quoteStepIndex } from '@/lib/leads/quote-filters'
import type { QuoteApproval } from '@/lib/settings/types'
import { Card, CardEmpty } from './card'
import styles from './quote-card.module.css'

/**
 * QUOTES card (858:25057 · empty 858:24272): amount row + status tag over the quote's progress track.
 * Spec: design-source/context/lead-overview/05-*.txt.
 *
 * The track is the STUDIO'S OWN quote lifecycle, not a fixed three (user 2026-08-30). The mock was drawn for a studio
 * that reviews quotes internally and abbreviated its five statuses to "Draft · Sent · Approved"; a studio that does not
 * require approval never reaches two of them. So the steps are `quoteStatuses(approval)` — the same list the Quotes
 * tab's row menu and Filters modal read — and each step is labelled with the real status, so what the widget shows and
 * what the menu can set are one vocabulary:
 *   approval required      Draft → Sent for Approval → Approved → Sent to Client → Signed
 *   approval not required  Draft → Sent to Client → Signed
 */

export function QuoteCard({ quote, approval, onOpenTab, onFromScratch, onFromTemplate }: {
  quote: Quote | null
  /** Settings › Leads › Quote approval — decides which statuses the lifecycle has. */
  approval: QuoteApproval
  onOpenTab: () => void
  onFromScratch: () => void
  onFromTemplate: () => void
}) {
  const steps = quoteStatuses(approval)
  const stepIdx = quote ? quoteStepIndex(quote.status, approval) : 0
  const hasQuote = !!quote

  /*
   * The track is ONE unbroken bar the full width of the card; the stage marks and the fill line up with where the
   * labels actually sit, which only the browser knows — the labels are their own text's width and spread across the
   * row. So the label row is measured and the fractions handed to the bar (user 2026-08-30). Before the first
   * measurement the fill falls back to even steps, which is what the mock's three-step track drew anyway.
   */
  const labelRow = useRef<HTMLDivElement>(null)
  const [marks, setMarks] = useState<number[]>([])
  /* (held calls 2026-10-24, B-06 — his "fix all of it"; the call as decided) ≤1024 a word never breaks: on a card too narrow for the six names
     whole on one line ("Dra/ft", "Approv/ed" at 390 and 768) they give way to the current step's name alone, whole, under its own mark — the
     bar and every mark stay, and the marks keep measuring the same left edges (the other names keep their slots, drawn 0 tall). A name that
     would run past the card's right edge steps left by what it needs (`shift`). Never at ≥1025, whose markup stays the mock's. */
  const [compact, setCompact] = useState<{ shift: number } | null>(null)
  useEffect(() => {
    const el = labelRow.current
    if (!el || typeof ResizeObserver === 'undefined') return
    // Measured in the observer callback, never in render; it fires once on observe and again on every resize.
    const ro = new ResizeObserver(() => {
      const box = el.getBoundingClientRect()
      if (!box.width) return
      const labels = [...el.children] as HTMLElement[]
      setMarks(labels.map((c) => (c.getBoundingClientRect().left - box.left) / box.width))
      if (!window.matchMedia('(max-width: 1024px)').matches) { setCompact(null); return }
      /* each name's own width on one line, read off a hidden twin in the row's type (the names themselves may be wrapped or drawn 0 tall) */
      const twin = document.createElement('span')
      twin.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:0;top:0;pointer-events:none'
      el.appendChild(twin)
      const natural = labels.map((c) => { twin.textContent = c.textContent; return twin.getBoundingClientRect().width })
      twin.remove()
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0
      const whole = natural.reduce((s, w) => s + w, 0) + gap * Math.max(0, labels.length - 1)
      if (whole <= box.width + 0.5) { setCompact(null); return }
      const at = labels[stepIdx]
      const left = at ? at.getBoundingClientRect().left - box.left : 0
      const shift = Math.max(0, Math.ceil(left + (natural[stepIdx] ?? 0) - box.width))
      setCompact((c) => (c && c.shift === shift ? c : { shift }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [steps.length, stepIdx, hasQuote])   // (B-06) a quote made while the card is open mounts the row: measured then too

  // The fill reaches the next stage's mark — i.e. it covers the stage the quote is in — and fills the bar at the last.
  const fill = marks.length === steps.length
    ? (stepIdx + 1 >= steps.length ? 1 : (marks[stepIdx + 1] ?? 1))
    : (stepIdx + 1) / steps.length

  return (
    <Card title="QUOTES" headGap={12} onOpen={onOpenTab} openLabel="Open quotes" testId="quotes">
      {quote ? (
        <div className={styles.body}>
          <div className={styles.group}>
            <div className={styles.amountRow}>
              <div className={styles.amountText}>
                {/* "S$ 70,500" — the mock types a space after S$ */}
                <span className={styles.amount}>{`S$ ${money(quote.amountMinor)}`}</span>
                {/* number · visibility wrap as ONE unit — as four siblings the row could break after the "·", ending a line on a lone separator. */}
                <span className={styles.meta}>
                  <span className={styles.sub}>{quote.number}</span>
                  <span className={styles.sub}>·</span>
                  <span className={styles.sub}>{quote.visibility}</span>
                </span>
              </div>
              <Tag appearance="outlined" className={styles.tag}>{quote.status}</Tag>
            </div>
            {/* One unbroken track the full width of the card; the marks sit where the stage names start below. */}
            <div className={styles.track}>
              <div className={styles.bar} style={{ width: `${fill * 100}%` }} />
              {marks.slice(1).map((m, i) => (
                <span key={steps[i + 1]} className={styles.mark} style={{ left: `${m * 100}%` }} aria-hidden />
              ))}
            </div>
            <div className={styles.labels} ref={labelRow} data-compact={compact ? '' : undefined}
                 style={compact ? ({ '--shift': `${compact.shift}px` } as CSSProperties) : undefined}>
              {steps.map((s, i) => (
                <span key={s} className={styles.stepLabel} data-current={i === stepIdx || undefined}>{s}</span>
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
