'use client'

import type { ReactNode } from 'react'
import { Icon } from './icon'
import styles from './meta-chip.module.css'

/**
 * MetaChip — the DS "Tag Outlined" at 20px, as used in the L2 page header (858:24783):
 * optional 12px Regular leading icon, caption-xs text, default / green / yellow / red / blue colours (blue = the DS Tag's Blue, REG-1060:
 * a state that changed or went out — Sent, Moved, New — as the Money table's Tag draws it).
 * Static and non-interactive (no hover, no press).
 * (the calm UI build 2026-10-27 — the audit's T-06 · 1-44 · 4-11 · 6-08, additive) `kind`: **status** (the default — the DS Tag's capitals, for a
 * state: Draft, Sent, Overdue) or **fact** — sentence case, for what is not a status (a date, a type, a count, a name, a role: "HDB 4-room",
 * "Instagram", "Owner"). Capitals are kept for a status only.
 */
export function MetaChip({
  icon,
  color = 'default',
  children,
  className,
  kind = 'status',
}: {
  icon?: string
  color?: 'default' | 'green' | 'yellow' | 'red' | 'blue'
  children: ReactNode
  className?: string
  /** (the calm UI build 2026-10-27) a status keeps the DS Tag's capitals; a fact reads in sentence case */
  kind?: 'status' | 'fact'
}) {
  return (
    <span
      className={className ? `${styles.chip} ${className}` : styles.chip}
      data-color={color === 'default' ? undefined : color}
      data-icon={icon ? '' : undefined}
      data-kind={kind === 'fact' ? 'fact' : undefined}
    >
      {icon ? <span className={styles.icon}><Icon name={icon} size={12} weight={400} /></span> : null}
      <span className={styles.text}>{children}</span>
    </span>
  )
}
