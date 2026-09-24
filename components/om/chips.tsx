'use client'

import styles from './chips.module.css'

export type ChipOption = string | { value: string; label: string }
const norm = (o: ChipOption) => (typeof o === 'string' ? { value: o, label: o } : o)

type Single = { multiple?: false; value: string | null; onChange: (value: string) => void }
type Multi = { multiple: true; value: readonly string[]; onChange: (values: string[]) => void }
type Common = {
  options: readonly ChipOption[]
  /** The group's accessible name. */
  label?: string
  disabled?: boolean
  className?: string
  testId?: string
}

/**
 * The house choice chips (REG-614): the Move stage window's ChoiceChips and the Filters modal's chips, as one piece for every
 * other surface — 32 tall, subheading-s, an on-surface-border stroke; a picked chip = primary-variant fill, primary stroke,
 * on-primary-variant text. Single = a radio group; `multiple` = a toggle group (aria-pressed).
 */
export function Chips(props: Common & (Single | Multi)) {
  const { options, label, disabled = false, className, testId } = props
  const picked = new Set<string>(props.multiple ? props.value : props.value ? [props.value] : [])
  const press = (v: string) => {
    if (disabled) return
    if (props.multiple) props.onChange(picked.has(v) ? [...picked].filter((x) => x !== v) : [...picked, v])
    else props.onChange(v)
  }
  return (
    <div className={className ? `${styles.chips} ${className}` : styles.chips} role={props.multiple ? 'group' : 'radiogroup'} aria-label={label} aria-disabled={disabled || undefined} data-testid={testId}>
      {options.map(norm).map((o) => {
        const on = picked.has(o.value)
        return props.multiple ? (
          <button key={o.value} type="button" className={styles.chip} data-selected={on || undefined} aria-pressed={on} disabled={disabled} onClick={() => press(o.value)}>{o.label}</button>
        ) : (
          <button key={o.value} type="button" role="radio" aria-checked={on} className={styles.chip} data-selected={on || undefined} disabled={disabled} onClick={() => press(o.value)}>{o.label}</button>
        )
      })}
    </div>
  )
}
