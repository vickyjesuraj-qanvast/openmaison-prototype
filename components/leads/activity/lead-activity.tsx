'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { SearchBar } from '@/components/ds'
import { useSearchTarget } from '@/components/shell/search-focus'
import { SlashSlot } from '@/components/om/slash-slot'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { displayDateLong, displayTime } from '@/lib/format'
import type { LeadActivityData } from '@/lib/leads/activity'
import styles from './lead-activity.module.css'

/**
 * Lead Details › Activity — a single continuous timeline (REG-245 + REG-248, user 2026-09-01): the mock's
 * boxed, day-grouped rows (931:47976) are replaced wholesale. The toolbar is the other tabs' — "All
 * Activities" heading-h4 + the DS SearchBar 280 (REG-251); the search filters the sentences live, and no
 * match shows the tabs' shared No-results card. Each row is `dot | date & time | activity` — the sentence
 * ITSELF is the hyperlink (underlined on hover) where the event has a destination; no See-CTA, no "by who"
 * (every sentence opens with its actor). Newest first (REG-191); the feed derives from the lead's records
 * (lib/leads/activity.ts), so unfiltered it is never empty: the lead's creation is its last row.
 */
export function LeadActivity({ data }: { data: LeadActivityData }) {
  const [query, setQuery] = useState('')
  // The rail search tile and the "/" key focus the page's search input (page checklist). The DS SearchBar
  // owns its <input>, so the target is resolved from the wrapper once it mounts (tasks-toolbar.tsx).
  const searchInput = useRef<HTMLInputElement | null>(null)
  useSearchTarget(searchInput)

  const q = query.trim().toLowerCase()
  const events = q ? data.events.filter((e) => e.text.toLowerCase().includes(q)) : data.events

  return (
    <div className={styles.tab} data-testid="activity-feed">
      <div className={styles.bar}>
        <h2 className={styles.title}>All Activities</h2>
        {/* Wrapper class instead of the old inline display:inline-flex so mobile can widen it (REG-269). */}
        <span ref={(el) => { searchInput.current = el?.querySelector('input') ?? null }} className={styles.searchWrap}>
          {/* (REG-275) The box matches the sentence each row prints, so what a reader actually types is a
              person, a task or a file name — the placeholder says so. The aria-label stays the plain name. */}
          <SlashSlot empty={query === ''}><SearchBar
            appearance="outlined" size="md"
            placeholder="Search people, tasks, files…" aria-label="Search activities"
            value={query} onChange={setQuery}
            className={styles.search}
          /></SlashSlot>
        </span>
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
