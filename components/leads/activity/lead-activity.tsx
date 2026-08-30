'use client'

import Link from 'next/link'
import { Icon } from '@/components/om/icon'
import { displayDateLong, displayTime, startOfDay } from '@/lib/format'
import type { LeadActivityData } from '@/lib/leads/activity'
import styles from './lead-activity.module.css'

/**
 * Lead Details › Activity (931:47976, spec design-source/context/lead-activity/01-feed.txt): day groups (rule with a centred
 * "Wed, 12 Aug ’26" chip) of 54px rows — glyph 20/Light · sentence · "See Task" · actor · "08:59 PM". Newest day first,
 * newest event first inside a day (REG-191). The feed derives from the lead's records (lib/leads/activity.ts), so it is
 * never empty: the lead's creation is its first row.
 */
export function LeadActivity({ data }: { data: LeadActivityData }) {
  const groups = new Map<number, typeof data.events>()
  for (const e of data.events) { const d = startOfDay(e.at); const list = groups.get(d); if (list) list.push(e); else groups.set(d, [e]) }
  return (
    <div className={styles.tab} data-testid="activity-feed">
      {[...groups.entries()].map(([day, events]) => (
        <section key={day} className={styles.group} aria-label={displayDateLong(new Date(day))}>
          <div className={styles.ruleRow}><span className={styles.dateChip}>{displayDateLong(new Date(day))}</span></div>
          <div className={styles.rows}>
            {events.map((e) => (
              <div key={e.id} className={styles.row} data-testid="activity-row">
                <div className={styles.textGroup}>
                  <span className={styles.icon}><Icon name={e.icon} size={20} weight={300} /></span>
                  <span className={styles.text} title={e.text}>{e.text}</span>
                </div>
                <div className={styles.meta}>
                  {e.link ? <><Link href={e.link.href} className={styles.link}>{e.link.label}</Link><span aria-hidden>·</span></> : null}
                  <span>{e.actor}</span>
                  <span aria-hidden>·</span>
                  <span>{displayTime(e.at)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
