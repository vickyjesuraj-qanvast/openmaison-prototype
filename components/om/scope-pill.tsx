'use client'

import { forwardRef } from 'react'
import { AppliedDot } from '@/components/om/applied-dot'
import { Icon } from '@/components/om/icon'
import styles from './scope-pill.module.css'

/**
 * (REG-666) The listing's scope pill ("All Leads ▾", components/leads/toolbar.tsx — h36, border ccc, r4, 14/Semi Bold, chevron up while
 * open, the applied dot off its default, REG-295) as a piece: a library's status filter ("Status: All ▾"). `tone="attention"` is its
 * to-do twin — "1 awaiting approval" — shown only while something waits: a press narrows the list to it, a second press lets go.
 */
export const ScopePill = forwardRef<HTMLButtonElement, {
  label: string
  onClick: () => void
  open?: boolean
  /** Off its default — the pill wears the applied dot. */
  scoped?: boolean
  tone?: 'default' | 'attention'
  /** The attention pill while its narrowing is on. */
  selected?: boolean
  icon?: string
  menu?: boolean
  /** What the pill says where the bar is narrow (≤1024): "All" for "Status: All", "1" for "1 awaiting approval". */
  short?: string
}>(function ScopePill({ label, onClick, open = false, scoped = false, tone = 'default', selected = false, icon, menu = true, short }, ref) {
  return (
    <button ref={ref} type="button" className={styles.pill} onClick={onClick} data-tone={tone === 'attention' ? 'attention' : undefined}
            data-open={open || undefined} data-selected={selected || undefined} data-short={short !== undefined || undefined} aria-label={short !== undefined ? label : undefined}
            aria-haspopup={menu ? 'menu' : undefined} aria-expanded={menu ? open : undefined} aria-pressed={menu ? undefined : selected}>
      {icon ? <Icon name={icon} size={18} weight={300} /> : null}
      <span className={styles.label}>{label}</span>
      {short !== undefined ? <span className={styles.short} aria-hidden>{short}</span> : null}
      {menu ? <span className={styles.chev}><Icon name="keyboard_arrow_down" size={20} /></span> : selected ? <Icon name="close" size={16} /> : null}
      {scoped ? <AppliedDot /> : null}
    </button>
  )
})
