import { displayDateLong, displayTime } from '@/lib/format'
import type { QuoteEvent } from '@/lib/quotes/activity'
import styles from './activity-section.module.css'

/**
 * Activity (1254:3755, REG-421): the quote's trail, newest first — an 11px dot (primary on the newest row) on a 1px rail,
 * "Tue, 1 Sep ’26 · 8:59 PM" in the 200 column, the sentence beside it. Rows 44. Derived from the quote's records at load
 * (lib/quotes/activity.ts); the mock's "Sample action line" rows are placeholders.
 */
export function ActivityBody({ events }: { events: QuoteEvent[] }) {
  if (events.length === 0) return <p className={styles.empty}>Nothing has happened on this quote yet.</p>
  return (
    <ol className={styles.list} aria-label="Quote activity">
      {events.map((e, i) => (
        <li key={e.id} className={styles.row} data-first={i === 0 || undefined}>
          <span className={styles.rail} aria-hidden><span className={styles.dot} /></span>
          <span className={styles.when}>{displayDateLong(e.at)} · {displayTime(e.at)}</span>
          <span className={styles.text}>{e.text}</span>
        </li>
      ))}
    </ol>
  )
}
