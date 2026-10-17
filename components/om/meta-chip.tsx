'use client'

import type { ReactNode } from 'react'
import { Icon } from './icon'
import styles from './meta-chip.module.css'

/**
 * MetaChip — the DS "Tag Outlined" at 20px, as used in the L2 page header (858:24783):
 * optional 12px Regular leading icon, caption-xs text, default / green / yellow / red / blue colours (blue = the DS Tag's Blue, REG-1060:
 * a state that changed or went out — Sent, Moved, New — as the Money table's Tag draws it).
 * Static and non-interactive (no hover, no press).
 */
export function MetaChip({
  icon,
  color = 'default',
  children,
  className,
}: {
  icon?: string
  color?: 'default' | 'green' | 'yellow' | 'red' | 'blue'
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={className ? `${styles.chip} ${className}` : styles.chip}
      data-color={color === 'default' ? undefined : color}
      data-icon={icon ? '' : undefined}
    >
      {icon ? <span className={styles.icon}><Icon name={icon} size={12} weight={400} /></span> : null}
      <span className={styles.text}>{children}</span>
    </span>
  )
}
