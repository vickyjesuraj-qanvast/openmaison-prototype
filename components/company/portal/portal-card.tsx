'use client'

import type { ReactNode } from 'react'
import styles from './portal-card.module.css'

/**
 * (the calm UI build 2026-10-27 — 5-23, T-06) Company › Client portal's cards wear the Company card head — a bold sentence-case title, its count
 * or link at the head's end — not the lead Overview's grey capital caption (components/leads/detail/card.tsx, which stays the lead's and the
 * project's Overview's own). The same frame and paddings as that card, so every body inside lands where it did; the same `data-card` and
 * accessible name.
 */
export function PortalCard({ title, metaRight, link, testId, children }: {
  title: string
  /** Right-aligned words at the head's end ("3 of 5 done"). */
  metaRight?: ReactNode
  /** A text link at the head's end ("All clients"). */
  link?: { label: string; onClick: () => void }
  testId?: string
  children: ReactNode
}) {
  return (
    <section className={styles.card} data-card={testId} aria-label={title}>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        {metaRight ? <span className={styles.metaRight}>{metaRight}</span> : null}
        {link ? <button type="button" className={styles.link} onClick={link.onClick}>{link.label}</button> : null}
      </div>
      {children}
    </section>
  )
}
