'use client'

import { Tooltip } from '@/components/om/tooltip'
import { IconButton } from '@/components/om/icon-button'
import styles from './count-stepper.module.css'

/**
 * (S44I, B5 — the team's sections prototype) The house's one stepper: moved here from components/credits (which re-exports it) when the Items
 * table's ⋮ › Add Item › Several… took it to count lines, so the stylesheet stays one.
 * (pending modules S19) The credits' one stepper — Plans' Seats (REG-702, its look kept exactly), Plan & billing's Change seats and the
 * top-up's amount (1.0's −/+ steppers of 50, `TopUpAmountPicker`): a bordered box, − · the number · +, 36 tall. The number is a live
 * region; − and + say what they do and refuse at the ends (disabled, the reason is the min / max the dialog states). No free typing —
 * 1.0's own reason: a typed off-grid amount would need snapping the buyer didn't see.
 */
export function CountStepper({ value, min, max, step = 1, onChange, less, more, format = (n) => String(n), wide = false, disabled = false, testId }: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (n: number) => void
  /** − and + words, e.g. "Fewer seats" · "More seats", "50 fewer AI credits". */
  less: string
  more: string
  format?: (n: number) => string
  /** A four-figure number (the top-up's 5,000) — the number's box grows to hold it. */
  wide?: boolean
  disabled?: boolean
  testId?: string
}) {
  return (
    <span className={styles.stepper} data-wide={wide || undefined} data-testid={testId}>
      <Tooltip label={less}><IconButton icon="remove" label={less} variant="bare" disabled={disabled || value - step < min} onClick={() => onChange(Math.max(min, value - step))} /></Tooltip>
      <b aria-live="polite">{format(value)}</b>
      <Tooltip label={more}><IconButton icon="add" label={more} variant="bare" disabled={disabled || value + step > max} onClick={() => onChange(Math.min(max, value + step))} /></Tooltip>
    </span>
  )
}
