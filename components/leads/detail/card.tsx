'use client'

import type { ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import styles from './card.module.css'

/**
 * Overview card — the DS "Filter content" container (858:24890 …): white, 1px surface-variant, radius 8, height to content.
 * Head (48px, 20/20/12/20): caption title · optional meta · optional link · arrow_outward to the card's tab.
 * Spec: design-source/context/lead-overview/03-brief-grid.txt.
 */
export function Card({
  title, meta, metaRight, link, onOpen, openLabel, headGap = 8, children, className, testId,
}: {
  title: string
  /** Text right after the title, in the head's flow ("· 13", "· Wed, 26 Aug"). */
  meta?: ReactNode
  /** Right-aligned text before the arrow ("2 days in pipeline", "2 tasks need attention"). */
  metaRight?: ReactNode
  /** Link text before the arrow ("Ask Client"). */
  link?: { label: string; onClick: () => void }
  /** The arrow_outward target; omit to hide the arrow. */
  onOpen?: () => void
  openLabel?: string
  /** Head gap: 8 (Lead stages, My work, Activity) or 12 (Files, Quotes, Questionnaire, Lead returned). */
  headGap?: 8 | 12
  children: ReactNode
  className?: string
  testId?: string
}) {
  return (
    <section className={className ? `${styles.card} ${className}` : styles.card} data-card={testId} aria-label={title}>
      <div className={styles.head} style={{ gap: headGap }}>
        <div className={styles.headText}>
          <span className={styles.title}>{title}</span>
          {meta ? <span className={styles.meta}>{meta}</span> : null}
          {metaRight ? <span className={styles.metaRight}>{metaRight}</span> : null}
        </div>
        {link ? <button type="button" className={styles.link} onClick={link.onClick}>{link.label}</button> : null}
        {onOpen ? (
          <Tooltip label={openLabel ?? `Open ${title.toLowerCase()}`}>
            <button type="button" className={styles.open} aria-label={openLabel ?? `Open ${title.toLowerCase()}`} onClick={onOpen}>
              <Icon name="arrow_outward" size={16} />
            </button>
          </Tooltip>
        ) : null}
      </div>
      {children}
    </section>
  )
}

/**
 * Empty state inside a card (858:24171 / 858:24272 / 858:24219 / 858:24296): 32 padding, illustration, 20/600 title,
 * 14/400 body (centred, 366 wide), one or two 36px buttons 12 apart. `gap` is the body's outer gap (20 for tasks /
 * questionnaire, 16 for quotes / files — the mock differs per card).
 */
export function CardEmpty({ illustration, width, height, title, body, actions, gap = 20 }: {
  illustration: string; width: number; height: number
  /** Optional since REG-246 — the QUESTIONNAIRE card's empty state has no action any more. */
  title: string; body: string; actions?: ReactNode; gap?: 16 | 20
}) {
  return (
    <div className={styles.empty} style={{ gap }}>
      <div className={styles.emptyInner}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={illustration} width={width} height={height} alt="" className={styles.emptyArt} />
        <div className={styles.emptyText}>
          <p className={styles.emptyTitle}>{title}</p>
          <p className={styles.emptyBody}>{body}</p>
        </div>
        {actions ? <div className={styles.emptyActions}>{actions}</div> : null}
      </div>
    </div>
  )
}

/** Card-internal 1px rule (Horizontal 10%), inset by the card's 20px body padding. */
export function CardRule({ inset = 20 }: { inset?: number }) {
  return <div className={styles.rule} style={{ marginLeft: inset, marginRight: inset }} />
}
