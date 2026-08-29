'use client'

import type { ButtonHTMLAttributes } from 'react'
import { Icon } from './icon'
import styles from './icon-button.module.css'

export function IconButton({
  icon,
  label,
  size = 36,
  variant = 'secondary',
  selected = false,
  iconSize,
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string
  /** Accessible name — required: these buttons are icon-only. */
  label: string
  size?: 36 | 24
  variant?: 'secondary' | 'primary'
  selected?: boolean
  iconSize?: number
}) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      data-size={size}
      data-variant={variant === 'primary' ? 'primary' : undefined}
      data-selected={selected || undefined}
      className={className ? `${styles.btn} ${className}` : styles.btn}
    >
      <Icon name={icon} size={iconSize ?? 20} />
    </button>
  )
}
