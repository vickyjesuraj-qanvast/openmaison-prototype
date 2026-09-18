'use client'

import { useMemo, useState } from 'react'
import { Button, SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import type { QuoteItem } from '@/lib/db/schema'
import { money2, unitPriceMinor } from '@/lib/quotes/math'
import styles from './round-prices-dialog.module.css'

export const ROUND_STEPS = [1, 5, 10, 50, 100] as const
export type RoundMode = 'nearest' | 'up' | 'down'
export type RoundChange = { id: string; name: string; fromMinor: number; toMinor: number }

/**
 * The rounding plan (REG-479): every line with a chargeable unit price, rounded to the step (S$) by the mode. A line with no
 * chargeable price — S$0, or declined — is skipped and counted; a line that would round down to nothing keeps its price.
 */
export function planRounding(items: QuoteItem[], stepDollars: number, mode: RoundMode): { changes: RoundChange[]; skipped: number } {
  const step = Math.round(stepDollars * 100)
  const changes: RoundChange[] = []
  let skipped = 0
  for (const i of items) {
    if (i.kind !== 'item') continue
    const from = unitPriceMinor(i)
    if (from <= 0 || i.status === 'Declined') { skipped++; continue }
    const q = from / step
    let to = Math.round((mode === 'up' ? Math.ceil(q) : mode === 'down' ? Math.floor(q) : Math.round(q)) * step)
    if (to <= 0) to = from
    if (to !== from) changes.push({ id: i.id, name: i.name, fromMinor: from, toMinor: to })
  }
  return { changes, skipped }
}

/**
 * Round selling prices (REG-479, the owner's reference, 2026-09-17): NEAREST 1 · 5 · 10 · 50 · 100 and Nearest / Round up / Round
 * down as two DS Segmented Buttons, a caption that counts what would change and what is skipped, a preview of the lines
 * (name · old → new · ±delta), Cancel · Apply (disabled with nothing to round). The plan is live as the controls change; Apply
 * hands the changes to the section, which writes them into the markups under one snapshot. The form dialog shell at L 800.
 */
export function RoundPricesDialog({ open, items, onClose, onApply }: {
  open: boolean
  items: QuoteItem[]
  onClose: () => void
  onApply: (changes: RoundChange[]) => void
}) {
  const [step, setStep] = useState<number>(1)
  const [mode, setMode] = useState<RoundMode>('nearest')
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setStep(1); setMode('nearest') } }   // render-phase adjust: every opening starts at 1 · Nearest
  const plan = useMemo(() => planRounding(items, step, mode), [items, step, mode])
  const n = plan.changes.length
  const caption = (n === 0 ? 'No line prices would change at this step.' : `${n} line ${n === 1 ? 'price' : 'prices'} would change.`) + (plan.skipped ? ` ${plan.skipped} skipped (no chargeable price).` : '')

  return (
    <Dialog open={open} onClose={onClose} title="Round selling prices" width={800} size="form"
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button onPress={() => onApply(plan.changes)} isDisabled={n === 0}>Apply</Button>
            </>}>
      <div className={styles.controls}>
        <span className={styles.field}>
          <span className={styles.eyebrow}>Nearest</span>
          <SegmentedButton aria-label="Nearest" selectedKeys={[String(step)]} onSelectionChange={(keys) => { const k = [...keys][0]; if (k !== undefined) setStep(Number(k)) }}>
            {ROUND_STEPS.map((s) => <SegmentedButtonItem key={s} id={String(s)}>{s}</SegmentedButtonItem>)}
          </SegmentedButton>
        </span>
        <SegmentedButton aria-label="Rounding" selectedKeys={[mode]} onSelectionChange={(keys) => { const k = [...keys][0]; if (k === 'nearest' || k === 'up' || k === 'down') setMode(k) }}>
          <SegmentedButtonItem id="nearest">Nearest</SegmentedButtonItem>
          <SegmentedButtonItem id="up">Round up</SegmentedButtonItem>
          <SegmentedButtonItem id="down">Round down</SegmentedButtonItem>
        </SegmentedButton>
      </div>
      <p className={styles.caption}>{caption}</p>
      <div className={styles.preview} role="list" aria-label="Lines to round">
        {n === 0 ? <span className={styles.empty}>Nothing to round.</span> : plan.changes.map((c) => (
          <div key={c.id} className={styles.line} role="listitem">
            <span className={styles.name}>{c.name}</span>
            <span className={styles.from}>{money2(c.fromMinor)}</span>
            <span className={styles.arrow} aria-hidden>→</span>
            <span className={styles.to}>{money2(c.toMinor)}</span>
            <span className={styles.delta}>{c.toMinor > c.fromMinor ? '+' : '−'}{money2(Math.abs(c.toMinor - c.fromMinor))}</span>
          </div>
        ))}
      </div>
    </Dialog>
  )
}
