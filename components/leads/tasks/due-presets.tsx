'use client'

import { useRef, useState } from 'react'
import { Chips } from '@/components/om/chips'
import { DatePicker } from '@/components/om/date-picker'
import { DUE_PRESETS, PICK_A_DAY, pickedLabel, presetDate, presetOf, type DuePreset } from './task-card-words'
import styles from './due-presets.module.css'

const PICK = 'pick'

/**
 * (Leads on the move, L4 — P-10 · C-06 · C-20 · A-09) The due presets as the house chips (a radio group, 44 on a finger): Tomorrow 10:00 ·
 * In 3 days · Next week · Pick a day. A preset sets the day and the hour in one tap; Pick a day opens the house calendar with its time row
 * (REG-119) and the chip then says the day picked. A second tap on the lit chip takes the date off again (no due date is a valid task).
 * One piece for the quick add, the task panel's When and — for the listing card's Tasks sheet (L3) — any other "add a task" on the move.
 * `scroll` keeps the chips on one line, for a host row that scrolls sideways (the quick add); without it the chips wrap.
 */
export function DuePresetChips({ value, onChange, now, label = 'When', scroll = false, testId }: {
  value: Date | null
  onChange: (due: Date | null) => void
  /** The host's clock (never Date.now() in render). */
  now: number
  label?: string
  scroll?: boolean
  testId?: string
}) {
  const [picking, setPicking] = useState(false)
  const anchor = useRef<HTMLDivElement>(null)
  const lit = value ? presetOf(value, now) ?? PICK : null
  const options = [...DUE_PRESETS.map((p) => ({ value: p.key as string, label: p.label })), { value: PICK, label: pickedLabel(value, now) }]
  const press = (v: string) => {
    if (v === PICK) { setPicking(true); return }
    if (v === lit) { onChange(null); return }
    onChange(presetDate(v as DuePreset, now))
  }
  return (
    <div ref={anchor} className={scroll ? styles.inline : styles.wrap} data-testid={testId}>
      <Chips label={label} options={options} value={lit} onChange={press} className={scroll ? styles.row : undefined} />
      <DatePicker open={picking} anchorRef={anchor} value={value} today={new Date(now)} label={PICK_A_DAY} withTime
                  onSelect={(d) => onChange(d)} onClose={() => setPicking(false)} />
    </div>
  )
}
