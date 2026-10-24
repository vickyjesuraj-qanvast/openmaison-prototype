import { displayTime, startOfDay } from '@/lib/format'
import type { QuoteEvent } from '@/lib/quotes/activity'
import { Timeline, TimelineItem } from '@/components/om/timeline'
import { dayLabel } from '@/components/leads/activity/activity-days'
import styles from './activity-section.module.css'

/**
 * Activity (1254:3755, REG-421): the quote's trail, newest first, derived from the quote's records at load (lib/quotes/activity.ts); the mock's
 * "Sample action line" rows are placeholders.
 * (activity by date 2026-10-24 — his "group the activities by date and add type icons … to represent what type of activity it is", across the
 * Activity tabs) The trail is the same kind of dated feed as the lead's Activity, so it reads the same way: the house timeline
 * (components/om/timeline.tsx) — each day opened by its marker on the rail ("Today", "Yesterday", "Tue, 18 Aug ’26" — `dayLabel`, the lead
 * feed's), each line its glyph in the dot's place (`QuoteEvent.icon`), its time and its sentence. Before: the mock's 11px dots (the newest
 * primary) with "Tue, 1 Sep ’26 · 8:59 PM" in a 200 column. `now` is the server's time (no clock read in render).
 */
export function ActivityBody({ events, now }: { events: QuoteEvent[]; now: number }) {
  if (events.length === 0) return <p className={styles.empty}>Nothing has happened on this quote yet.</p>
  return (
    <div className={styles.feed}>
      <Timeline label="Quote activity">
        {events.map((e, i) => {
          const prev = events[i - 1]
          const day = !prev || startOfDay(prev.at) !== startOfDay(e.at) ? dayLabel(e.at, now) : null
          return (
            <TimelineItem key={e.id} day={day} icon={e.icon} time={displayTime(e.at)} timeClassName={styles.when} bodyClassName={styles.text}>{e.text}</TimelineItem>
          )
        })}
      </Timeline>
    </div>
  )
}
