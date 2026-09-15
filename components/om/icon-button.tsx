'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './icon'
import styles from './icon-button.module.css'

export function IconButton({
  icon,
  label,
  size = 36,
  variant = 'secondary',
  selected = false,
  iconSize,
  iconWeight,
  iconFamily,
  glyph,
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string
  /** Accessible name — required: these buttons are icon-only. */
  label: string
  size?: 36 | 24
  /** bare = the "Link icon" of interaction-states.md: no border, 8% wash on hover, radius 4 — every modal / drawer / row icon (close X, chevrons, deletes).
   *  filled = the primary Button as a square (1082:25135, the mobile listing header's Add Lead): primary plate, on-primary glyph (REG-299). */
  variant?: 'secondary' | 'primary' | 'bare' | 'filled'
  selected?: boolean
  iconSize?: number
  iconWeight?: 300 | 400
  iconFamily?: 'rounded' | 'outlined'
  /** Drawn in place of the Material glyph — the Maison AI mark on the folded Items toolbar (REG-417); `icon` still names it. */
  glyph?: ReactNode
}) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      data-size={size}
      data-variant={variant === 'secondary' ? undefined : variant}
      data-selected={selected || undefined}
      className={className ? `${styles.btn} ${className}` : styles.btn}
    >
      {glyph ?? <Icon name={icon} size={iconSize ?? 20} weight={iconWeight} family={iconFamily} />}
    </button>
  )
}
