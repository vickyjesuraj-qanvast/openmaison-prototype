'use client'

import { Badge } from '@/components/ds'
import styles from './applied-dot.module.css'

/**
 * (REG-295) The "something is applied" mark for a control whose current value narrows what the page shows —
 * the scope pills ("All Leads", "All Notes & Logs") wear it whenever they stand off their default, so a narrowed view
 * never passes for the whole. DS Badge (dot), tinted primary so it speaks the same language as the Filters
 * button's count badge (REG-69), pinned to the host's top-right corner — the host must be `position: relative`.
 * The dot itself is decoration; the hidden text tells assistive tech what it means.
 */
export function AppliedDot({ label = 'filter applied' }: { label?: string }) {
  return (
    <>
      <Badge variant="dot" className={styles.dot} aria-hidden />
      <span className="visually-hidden">, {label}</span>
    </>
  )
}
