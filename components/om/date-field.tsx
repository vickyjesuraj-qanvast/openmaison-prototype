'use client'

import { useId, useRef, useState } from 'react'
import { TextField, type TextFieldProps } from './text-field'
import { DatePicker, focusDatePicker } from './date-picker'
import { formatInputDateTime, inputDate, parseInputDate, parseInputDateTime } from '@/lib/format'

type Common = Omit<TextFieldProps, 'mode' | 'options' | 'onChange' | 'open' | 'onOpen' | 'trailingIcon' | 'value'> & {
  /** Canonical string the form stores: `d/m/yyyy` (DateField) or `d/m/yyyy, h:mm AM` (DateTimeField). */
  value: string
  onChange: (v: string) => void
  /** Day-granular "today" from the host (never Date.now() in render). */
  today: Date
  /** The trailing glyph — `event` (REG-119) unless a mock draws another (`calendar_month`, General Info 1273:29309). */
  icon?: string
}

/**
 * Date field: a read-only DS Text Field that opens the Material date picker —
 * typing is not possible, so the value is always a real date (user 2026-08-29).
 */
export function DateField({ value, onChange, today, onKeyDown, icon = 'event', ...rest }: Common) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement | null>(null)
  const key = useId()
  return (
    <>
      <TextField {...rest} mode="trigger" value={value} trailingIcon={icon} boxRef={box} open={open}
                 onOpen={() => setOpen((o) => !o)}
                 onKeyDown={(e) => { if (e.key === 'ArrowDown' && open) { e.preventDefault(); focusDatePicker() } onKeyDown?.(e) }} />
      <DatePicker open={open} anchorRef={box} anchorKey={key} value={parseInputDate(value)} today={today} label={rest.label}
                  onSelect={(d) => { onChange(inputDate(d)); setOpen(false) }} onClose={() => setOpen(false)} />
    </>
  )
}

/** Date & Time field: the same trigger with the picker's time row. Picking a day keeps the picker open for the time.
    `defaultNow` (UX audit 2026-09-30, L9): a day picked with no time yet takes the time it is now — for logs of what happened. */
export function DateTimeField({ value, onChange, today, onKeyDown, icon = 'event', defaultNow = false, ...rest }: Common & { defaultNow?: boolean }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement | null>(null)
  const key = useId()
  return (
    <>
      <TextField {...rest} mode="trigger" value={value} trailingIcon={icon} boxRef={box} open={open}
                 onOpen={() => setOpen((o) => !o)}
                 onKeyDown={(e) => { if (e.key === 'ArrowDown' && open) { e.preventDefault(); focusDatePicker() } onKeyDown?.(e) }} />
      <DatePicker open={open} anchorRef={box} anchorKey={key} value={parseInputDateTime(value)} today={today} label={rest.label} withTime defaultNow={defaultNow}
                  onSelect={(d) => onChange(formatInputDateTime(d))} onClose={() => setOpen(false)} />
    </>
  )
}
