'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { displayDateLong, displayTime } from '@/lib/format'
import type { LeadActivityData } from '@/lib/leads/activity'
import styles from './lead-activity.module.css'

/**
 * Lead Details › Activity — a single continuous timeline (REG-245 + REG-248, user 2026-09-01): the mock's
 * boxed, day-grouped rows (931:47976) are replaced wholesale. The toolbar is the other tabs' — "All
 * Activities" heading-h4 + the house ToolbarSearch (REG-251; REG-729: the tab toolbar and its search, which folds to a glyph at ≤1024
 * like its siblings', REG-384); the search filters the sentences live, and no
 * match shows the tabs' shared No-results card. Each row is `dot | date & time | activity` — the sentence
 * ITSELF is the hyperlink (underlined on hover) where the event has a destination; no See-CTA, no "by who"
 * (every sentence opens with its actor). Newest first (REG-191); the feed derives from the lead's records
 * (lib/leads/activity.ts), so unfiltered it is never empty: the lead's creation is its last row.
 */
export function LeadActivity({ data }: { data: LeadActivityData }) {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const events = q ? data.events.filter((e) => e.text.toLowerCase().includes(q)) : data.events

  return (
    <div className={styles.tab} data-testid="activity-feed">
      <div className={styles.bar}>
        <h2 className={styles.title}>All Activities</h2>
        {/* (REG-729) The house toolbar search (the rail's search tile and "/" still reach it). (REG-275) The box matches the sentence
            each row prints, so what a reader actually types is a person, a task or a file name — the placeholder says so. */}
        <div className={styles.actions}>
          <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search people, tasks, files…" label="Search activities" />
        </div>
      </div>

      {events.length === 0 ? (
        <TabSearchEmpty noun="activities" searching onClearAll={() => setQuery('')} />
      ) : (
        <div className={styles.list} role="list" aria-label="Activity">
          {events.map((e) => (
            <div key={e.id} className={styles.row} role="listitem" data-testid="activity-row">
              <span className={styles.rail} aria-hidden>
                <span className={styles.dot} />
              </span>
              <span className={styles.when}>
                {displayDateLong(new Date(e.at))} · {displayTime(e.at)}
              </span>
              <span className={styles.body}>
                {e.link ? (
                  <Link href={e.link.href} className={styles.textLink}>{e.text}</Link>
                ) : (
                  <span className={styles.text}>{e.text}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
