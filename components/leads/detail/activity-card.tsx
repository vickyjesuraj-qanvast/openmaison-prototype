'use client'

import type { ReactNode } from 'react'
import type { ActivityItem } from '@/lib/leads/detail'
import { displayDateLong, startOfDay } from '@/lib/format'
import { TimelineGlyph } from '@/components/om/timeline'
import { Card } from './card'
import styles from './activity-card.module.css'

/** Rows the card shows (858:24970 has four). */
const MAX_ROWS = 4

/**
 * RECENT ACTIVITY card (858:24970): up to four 36px rows — date (120 fixed, "Today" for same-day items) · event text.
 * No empty copy exists in the mocks, so an empty list renders only the body's 12px bottom padding.
 * Spec: design-source/context/lead-overview/04-cards-stages-files-activity.txt.
 * (activity by date 2026-10-24 — his "add type icons … to represent what type of activity it is") A row handed its glyph (`ActivityItem.icon`,
 * the Activity tab's own for that line) leads with it — the house timeline's 24 circle, held inside the 36 row — then the date and the event.
 * No day grouping on a four-row card: each row keeps its date. A row with no glyph draws as before (the project's Overview passes none yet).
 */
export function ActivityCard({ items, now, onOpenTab, headExtra }: {
  items: ActivityItem[]
  /** Server time, so "Today" never reads Date.now() in render. */
  now: number
  onOpenTab: () => void
  /** (simplify round 3) A control in the head before the arrow — the project Overview's phone fold (Show / Hide); the lead's card has none. */
  headExtra?: ReactNode
}) {
  const today = startOfDay(new Date(now))
  return (
    <Card title="Recent activity" headGap={8} metaRight={headExtra} onOpen={onOpenTab} openLabel="Open recent activity" testId="recent-activity">
      <div className={styles.body}>
        {items.slice(0, MAX_ROWS).map((item, i) => (
          item.icon ? (
            <div key={`${item.at.getTime()}-${i}`} className={styles.row}>
              <TimelineGlyph icon={item.icon} className={styles.glyph} />
              <span className={styles.main}>
                <span className={styles.date}>{startOfDay(item.at) === today ? 'Today' : displayDateLong(item.at)}</span>
                <span className={styles.text}>{item.text}</span>
              </span>
            </div>
          ) : (
            <div key={`${item.at.getTime()}-${i}`} className={styles.row}>
              <span className={styles.date}>{startOfDay(item.at) === today ? 'Today' : displayDateLong(item.at)}</span>
              <span className={styles.text}>{item.text}</span>
            </div>
          )
        ))}
      </div>
    </Card>
  )
}
