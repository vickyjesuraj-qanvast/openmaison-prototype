'use client'

import type { ActivityItem } from '@/lib/leads/detail'
import { displayDateLong, startOfDay } from '@/lib/format'
import { Card } from './card'
import styles from './activity-card.module.css'

/** Rows the card shows (858:24970 has four). */
const MAX_ROWS = 4

/**
 * RECENT ACTIVITY card (858:24970): up to four 36px rows — date (120 fixed, "Today" for same-day items) · event text.
 * No empty copy exists in the mocks, so an empty list renders only the body's 12px bottom padding.
 * Spec: design-source/context/lead-overview/04-cards-stages-files-activity.txt.
 */
export function ActivityCard({ items, now, onOpenTab }: {
  items: ActivityItem[]
  /** Server time, so "Today" never reads Date.now() in render. */
  now: number
  onOpenTab: () => void
}) {
  const today = startOfDay(new Date(now))
  return (
    <Card title="Recent activity" headGap={8} onOpen={onOpenTab} openLabel="Open recent activity" testId="recent-activity">
      <div className={styles.body}>
        {items.slice(0, MAX_ROWS).map((item, i) => (
          <div key={`${item.at.getTime()}-${i}`} className={styles.row}>
            <span className={styles.date}>{startOfDay(item.at) === today ? 'Today' : displayDateLong(item.at)}</span>
            <span className={styles.text}>{item.text}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
