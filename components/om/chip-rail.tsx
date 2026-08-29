'use client'

import { useRef, type ReactNode } from 'react'
import { ScrollPagers } from './scroll-pagers'
import styles from './chip-rail.module.css'

/**
 * Horizontal chip rail (user rule 2026-08-28): a row with hidden scrollbar; chevron pagers at
 * whichever edge has more content (ScrollPagers), and any chip clicked while partly hidden
 * scrolls fully into view. Use for every horizontal list of chips / tabs / pills that can overflow.
 */
export function ChipRail({ children, className, label = 'Filters' }: { children: ReactNode; className?: string; label?: string }) {
  const rail = useRef<HTMLDivElement | null>(null)
  return (
    <div className={className ? `${styles.wrap} ${className}` : styles.wrap}>
      <div ref={rail} className={styles.rail} role="group" aria-label={label}
           onClickCapture={(e) => { (e.target as HTMLElement).closest('button, [role="tab"], a')?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' }) }}>
        <div className={styles.track}>{children}</div>
      </div>
      <ScrollPagers scrollRef={rail} />
    </div>
  )
}
