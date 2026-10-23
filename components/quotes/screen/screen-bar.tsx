'use client'

import type { ReactNode } from 'react'
import styles from './screen-bar.module.css'

/**
 * (Quotes on the move, P-01 · P-02 · P-09) The one 56px bar of every on-the-move screen of a quote — the Quote screen (← · the client's
 * name over the number and title · ⋮), the section list (✕ · Edit quote over the number and Saved · Done) and each section screen (← · the
 * section's title · its actions). A leading control, the title with one secondary line, the trailing controls; when the trailing controls
 * are wider than the room beside the title they take a row of their own under it, so a title is never cut to make room for a toolbar.
 * Sticky at the top with the safe-area inset; the title is 16, the line under it 14 (P-08's scale — nothing read on site under 14).
 */
export function ScreenBar({ leading, title, subtitle, trailing, titleId, as: Tag = 'h1', className, testId }: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  titleId?: string
  as?: 'h1' | 'h2'
  className?: string
  testId?: string
}) {
  return (
    <div className={className ? `${styles.bar} ${className}` : styles.bar} data-screen-bar="" data-testid={testId}>
      {leading ? <span className={styles.ctl}>{leading}</span> : null}
      <div className={styles.text}>
        <Tag className={styles.title} id={titleId}>{title}</Tag>
        {subtitle ? <span className={styles.sub}>{subtitle}</span> : null}
      </div>
      {trailing ? <div className={styles.trailing}>{trailing}</div> : null}
    </div>
  )
}

/** A bar's icon control: the 36 house icon button with a 44 touch box (REG-312). */
export const barControl = styles.ctl
