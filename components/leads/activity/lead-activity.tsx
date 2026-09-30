'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Chips } from '@/components/om/chips'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { displayDateLong, displayTime } from '@/lib/format'
import type { ActivityGroup, LeadActivityData } from '@/lib/leads/activity'
import styles from './lead-activity.module.css'

/** (UX audit 2026-09-30, T10) The chips above the timeline — the house `Chips` (REG-614), one at a time. */
type Show = 'all' | ActivityGroup
const SHOW: { value: Show; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'tasks', label: 'Tasks' }, { value: 'files', label: 'Files' }, { value: 'notes', label: 'Notes' }, { value: 'stage', label: 'Stage' },
]

/**
 * Lead Details › Activity — a single continuous timeline (REG-245 + REG-248, user 2026-09-01): the mock's
 * boxed, day-grouped rows (931:47976) are replaced wholesale. The toolbar is the other tabs' — "All
 * Activities" heading-h4 + the house ToolbarSearch (REG-251; REG-729: the tab toolbar and its search, which folds to a glyph at ≤1024
 * like its siblings', REG-384); the search filters the sentences live, and no
 * match shows the tabs' shared No-results card. Each row is `dot | date & time | activity` — the sentence
 * ITSELF is the hyperlink (underlined on hover) where the event has a destination; no See-CTA, no "by who"
 * (every sentence opens with its actor). Newest first (REG-191); the feed derives from the lead's records
 * (lib/leads/activity.ts), so unfiltered it is never empty: the lead's creation is its last row.
 * (UX audit 2026-09-30, T10 — extends REG-191 · REG-245) Chips above the timeline keep one kind of line — All · Tasks · Files · Notes ·
 * Stage — and a task's lines name whoever made each change (the lead's event log).
 */
export function LeadActivity({ data }: { data: LeadActivityData }) {
  const [query, setQuery] = useState('')
  const [show, setShow] = useState<Show>('all')

  const q = query.trim().toLowerCase()
  const kept = show === 'all' ? data.events : data.events.filter((e) => e.group === show)
  const events = q ? kept.filter((e) => e.text.toLowerCase().includes(q)) : kept

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
      <Chips label="Show" options={SHOW} value={show} onChange={(v) => setShow(v as Show)} testId="activity-chips" />

      {events.length === 0 ? (
        /* a search, or a chip, that keeps nothing — the tabs' shared No-results card ("No activities match this filter."), Clear All back to All */
        <TabSearchEmpty noun="activities" searching={!!q} onClearAll={() => { setQuery(''); setShow('all') }} />
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
