'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Icon } from './icon'
import styles from './select-trigger.module.css'

/**
 * (REG-729) The compact select trigger — see select-trigger.module.css. It opens its list through the caller (a PortalMenu or a
 * Dropdown anchored to it); it only draws the button: the value (or the placeholder), the chevron, the open state.
 */
export const SelectTrigger = forwardRef<HTMLButtonElement, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> & {
  /** What is picked; empty shows the placeholder. */
  value: ReactNode
  placeholder?: string
  /** The list is open: the chevron turns and aria-expanded says so. */
  open?: boolean
  /** m = 36, in a toolbar or a form row · s = 28, inside a table cell. */
  size?: 'm' | 's'
  /** The field's name, for a screen reader (the value alone does not say what it picks). */
  label: string
  invalid?: boolean
}>(function SelectTrigger({ value, placeholder, open = false, size = 'm', label, invalid = false, className, ...rest }, ref) {
  const empty = value === null || value === undefined || value === ''
  return (
    <button ref={ref} type="button" aria-haspopup="listbox" {...rest} className={className ? `${styles.trigger} ${className}` : styles.trigger}
            data-size={size} data-open={open || undefined} data-invalid={invalid || undefined}
            aria-expanded={open} aria-label={empty ? label : `${label}: ${typeof value === 'string' ? value : ''}`.replace(/: $/, '')}>
      <span className={styles.value}>{empty ? <span className={styles.placeholder}>{placeholder ?? label}</span> : value}</span>
      <span className={styles.chev} aria-hidden><Icon name="keyboard_arrow_down" size={size === 's' ? 16 : 20} /></span>
    </button>
  )
})
