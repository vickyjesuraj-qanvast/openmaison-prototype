'use client'

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import styles from './chips.module.css'

/**
 * A chip: its value and words; `disabled` refuses it alone (the group stays live — say why in a line under the group, never in a
 * native title); `swatch` puts a 12px colour dot before the words (any CSS background — a colour, a photo, a motif).
 */
export type ChipOption = string | { value: string; label: string; disabled?: boolean; swatch?: string | null }
const norm = (o: ChipOption) => (typeof o === 'string' ? { value: o, label: o } : o)

type Single = {
  multiple?: false
  /** The picked chip's value. `null` and `''` both read as no pick — so give an *All* chip a real value (e.g. `'all'`), never `''`
   *  (S25's Marketplace met it; S43D, F2-02 — the rule stays, every group reads it). */
  value: string | null; onChange: (value: string) => void
  /** (REG-719) An action that belongs to one chip, drawn inside it after its words — the AI Visualizer's rooms: each room's ⋯ in its own
   *  chip. The chip becomes a box holding its radio and this; `on` says whether the chip is the picked one. */
  trail?: (value: string, on: boolean) => ReactNode
}
type Multi = { multiple: true; value: readonly string[]; onChange: (values: string[]) => void }
type Common = {
  options: readonly ChipOption[]
  /** The group's accessible name. */
  label?: string
  disabled?: boolean
  className?: string
  testId?: string
}

const STEP: Record<string, 1 | -1 | 'first' | 'last'> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: 'first', End: 'last' }
/**
 * (audit 2026-09-26, F169) The house keyboard for a radio group or a tab list (the APG pattern): the arrows, Home and End move among
 * the group's own options — `selector`, e.g. `:scope > [role=radio]` so a field nested in the group keeps its keys — and pick the one
 * reached (selection follows focus, by pressing it, so each group's own press rule applies). Returns the option reached, or null when
 * the key isn't the group's. Pair it with a roving tabindex: 0 on the picked option (or the first), -1 on the rest.
 */
export function rovingKey(e: KeyboardEvent<HTMLElement>, selector: string, { select = true }: { select?: boolean } = {}): HTMLElement | null {
  const step = STEP[e.key]
  if (step === undefined || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return null
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(selector)).filter((el) => !(el as HTMLButtonElement).disabled && el.getAttribute('aria-disabled') !== 'true')
  const at = items.indexOf(document.activeElement as HTMLElement)
  if (at < 0) return null
  const next = items[step === 'first' ? 0 : step === 'last' ? items.length - 1 : (at + step + items.length) % items.length]!
  e.preventDefault()
  next.focus()
  if (select && next.getAttribute('aria-checked') !== 'true' && next.getAttribute('aria-selected') !== 'true') next.click()
  return next
}

/**
 * The house choice chips (REG-614): the Move stage window's ChoiceChips and the Filters modal's chips, as one piece for every
 * other surface — 32 tall, subheading-s, an on-surface-border stroke; a picked chip = primary-variant fill, primary stroke,
 * on-primary-variant text. Single = a radio group (arrow keys move and pick, one Tab stop); `multiple` = a toggle group (aria-pressed).
 */
export function Chips(props: Common & (Single | Multi)) {
  const { options, label, disabled = false, className, testId } = props
  const picked = new Set<string>(props.multiple ? props.value : props.value ? [props.value] : [])
  const list = options.map(norm)
  const press = (v: string) => {
    if (disabled) return
    if (props.multiple) props.onChange(picked.has(v) ? [...picked].filter((x) => x !== v) : [...picked, v])
    else props.onChange(v)
  }
  /* the one Tab stop of a radio group: the picked chip, else the first that can be picked */
  const stop = list.find((o) => picked.has(o.value) && !o.disabled)?.value ?? list.find((o) => !o.disabled)?.value
  const dot = (o: { swatch?: string | null }) => (o.swatch ? <span className={styles.swatch} style={{ ['--chip-sw' as string]: o.swatch } as CSSProperties} aria-hidden /> : null)
  return (
    <div className={className ? `${styles.chips} ${className}` : styles.chips} role={props.multiple ? 'group' : 'radiogroup'} aria-label={label} aria-disabled={disabled || undefined} data-testid={testId}
         onKeyDown={props.multiple ? undefined : (e) => { rovingKey(e, ':scope > [role=radio], :scope > [data-chip-box] > [role=radio]') }}>
      {list.map((o) => {
        const on = picked.has(o.value), off = disabled || !!o.disabled
        return props.multiple ? (
          <button key={o.value} type="button" className={styles.chip} data-selected={on || undefined} aria-pressed={on} disabled={off} onClick={() => press(o.value)}>{dot(o)}{o.label}</button>
        ) : (
          props.trail ? (
            <span key={o.value} className={styles.chipBox} data-chip-box="" data-selected={on || undefined} data-disabled={off || undefined}>
              <button type="button" role="radio" aria-checked={on} className={`${styles.chip} ${styles.chipIn}`} data-selected={on || undefined} disabled={off} tabIndex={o.value === stop ? 0 : -1} onClick={() => press(o.value)}>{dot(o)}{o.label}</button>
              {props.trail(o.value, on)}
            </span>
          ) : (
            <button key={o.value} type="button" role="radio" aria-checked={on} className={styles.chip} data-selected={on || undefined} disabled={off} tabIndex={o.value === stop ? 0 : -1} onClick={() => press(o.value)}>{dot(o)}{o.label}</button>
          )
        )
      })}
    </div>
  )
}
