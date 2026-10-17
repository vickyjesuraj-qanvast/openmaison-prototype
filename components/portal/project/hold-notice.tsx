import { Icon } from '@/components/om/icon'
import { holdLine } from '@/lib/portal/schedule-model'
import styles from './project.module.css'

/**
 * (gaps build D, item 4 — M-01; 1.0 I-254 "Paused — {reason} · Resuming around {date}") A project on hold, told honestly on the client's Home
 * and Schedule: one line in the portal's card, the reason the studio wrote for the client and the day it should resume. `place` names the
 * home when the client has more than one.
 */
export function HoldNotice({ hold, now, place }: { hold: { reason: string; until: number | null }; now: number; place?: string | null }) {
  return (
    <section className={styles.hold} role="status" aria-label="Work is paused" data-testid="portal-hold">
      <span className={styles.holdGlyph}><Icon name="timelapse" size={20} weight={300} /></span>
      <span className={styles.holdText}>
        {place ? <span className={styles.eyebrow}>{place}</span> : null}
        <span className={styles.holdLine}>{holdLine(hold, now)}</span>
      </span>
    </section>
  )
}
