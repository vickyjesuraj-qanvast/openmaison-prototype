import type { LiHTMLAttributes, ReactNode } from 'react'
import { Icon } from './icon'
import styles from './timeline.module.css'

/*
 * (activity by date 2026-10-24 — his "group the activities by date and add type icons for the ones we have (Tasks · Files · Notes · Stage) to
 * represent what type of activity it is") The house timeline — one piece for every dated feed that runs on a rail: the lead's and the project's
 * Activity at a desk, the quote's Activity. A feed is one list; the first line of each day opens with the day's marker (REG-190's rule and
 * centred chip, on REG-245's rail); each line is its type glyph on the rail, its time, its sentence. Server-safe: no hooks.
 * The glyph to pass for a lead's line is `activityGlyph(e)` (lib/leads/activity-glyph.ts).
 */

/** The type glyph: the icon (16) in a 24 circle — on the rail, or on its own at a row's start (a day card on a phone, the Overview's card). */
export function TimelineGlyph({ icon, className }: { icon: string; className?: string }) {
  return (
    <span className={className ? `${styles.glyph} ${className}` : styles.glyph} aria-hidden data-glyph={icon}>
      <Icon name={icon} size={16} />
    </span>
  )
}

/** A day's marker on the rail: the rule from the rail, the day ("Today" · "Yesterday" · "Fri, 2 Oct ’26") in its chip, centred. */
export function TimelineDay({ label, as: Tag = 'h3' }: { label: string; as?: 'h3' | 'h4' }) {
  return (
    <div className={styles.mark} data-testid="timeline-day">
      <span className={styles.rail} aria-hidden />
      <Tag className={styles.markRule}><span className={styles.chip}>{label}</span></Tag>
    </div>
  )
}

/** The feed: one list, newest first. `label` names it for a screen reader ("Activity", "Quote activity"). */
export function Timeline({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <ol className={className ? `${styles.list} ${className}` : styles.list} aria-label={label}>{children}</ol>
}

/** One line: `day` when it is the first of its day (the marker above it), its glyph, its time, its sentence (`children`). The time's and the
    sentence's own classes add to the house cells (a page's type tokens, a probe's hook). */
export function TimelineItem({ day, dayAs, icon, time, children, timeClassName, bodyClassName, ...li }: {
  day?: string | null
  dayAs?: 'h3' | 'h4'
  icon: string
  time: ReactNode
  children: ReactNode
  timeClassName?: string
  bodyClassName?: string
} & Omit<LiHTMLAttributes<HTMLLIElement>, 'children'>) {
  return (
    <li className={styles.item} {...li}>
      {day ? <TimelineDay label={day} as={dayAs} /> : null}
      <div className={styles.row}>
        <span className={styles.rail} aria-hidden><TimelineGlyph icon={icon} /></span>
        <span className={timeClassName ? `${styles.time} ${timeClassName}` : styles.time}>{time}</span>
        <span className={bodyClassName ? `${styles.body} ${bodyClassName}` : styles.body}>{children}</span>
      </div>
    </li>
  )
}
