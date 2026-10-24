'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { feedDays } from './activity-days'
import type { ActivityEvent } from '@/lib/leads/activity'
import Link from 'next/link'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'   // (parity P-15)
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { displayDateLong, displayTime } from '@/lib/format'
import type { ActivityGroup, LeadActivityData } from '@/lib/leads/activity'
import styles from './lead-activity.module.css'

/** (Leads on the move, L4 — C-12) A phone's or a tablet's first screenful of the feed; Show older adds as many again. */
const PAGE = 20
const timeOf = (e: ActivityEvent) => displayTime(new Date(e.at))

/** (L4 — P-12 · C-12) One row of the day-grouped feed: the time, the sentence at 16, and — where it leads somewhere — the whole row is the 44
 *  press with its chevron; the client's pick keeps its small card under the line. */
function DayRow({ event: e, time }: { event: ActivityEvent; time: string }) {
  const card = e.card ? (
    <span className={styles.card} data-testid="activity-card">
      <span className={styles.cardThumb} data-hex={!e.card.src && e.card.hex ? '' : undefined} style={!e.card.src && e.card.hex ? ({ '--swatch': e.card.hex } as CSSProperties) : undefined} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {e.card.src ? <img src={e.card.src} alt="" /> : null}
      </span>
      <span className={styles.cardText}>
        <span className={styles.cardTitle}>{e.card.title}</span>
        {e.card.lines.map((l, i) => <span key={i} className={styles.cardLine}>{l}</span>)}
      </span>
    </span>
  ) : null
  const body = (
    <>
      <span className={styles.dayTime}>{time}</span>
      <span className={styles.dayText}>{e.text}{card}</span>
    </>
  )
  return e.link ? (
    <Link href={e.link.href} className={styles.dayRow} data-testid="activity-link">{body}<Icon name="chevron_right" size={24} className={styles.dayChev} /></Link>
  ) : <div className={styles.dayRow} data-static="">{body}</div>
}

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
export function LeadActivity({ data, chips = SHOW, views }: { data: LeadActivityData; /** (fix-A, A-16) the chips above the timeline — a project passes its own (`PROJECT_ACTIVITY_CHIPS`) */ chips?: readonly { value: string; label: string }[]
  /** (simplify S-03 · Q-02) on a project: the Files & notes view switch in the title's place; the kinds' chips stay on the row below */ views?: ReactNode }) {
  const [query, setQuery] = useState('')
  const [show, setShow] = useState<Show>('all')

  const q = query.trim().toLowerCase()
  /* (simplify round 2 — each fact once) under All a twin line steps back: a task or an order made from a client's ask is said by the ask's own line;
     the twin keeps its own chip (Tasks · Money) */
  const kept = show === 'all' ? data.events.filter((e) => !e.twin) : data.events.filter((e) => e.group === show)
  const events = q ? kept.filter((e) => e.text.toLowerCase().includes(q)) : kept
  /* (Leads on the move, L4 — P-12 · C-12) On a phone or a tablet the feed reads by day — "Today", "Yesterday", "Fri 23 Oct" over the rows, the time
     on each — a run of the same thing is one line that opens on a tap ("James uploaded 10 files."), a row that leads somewhere is the whole 44
     press with its chevron, and the newest 20 come first with Show older after them. The desk keeps the one continuous timeline (REG-245). */
  const compact = useMediaQuery(TABLET_DOWN)
  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const feed = compact ? feedDays(events, data.now, limit) : null

  return (
    <div className={styles.tab} data-testid="activity-feed">
      <div className={styles.bar}>
        {views ?? <h2 className={styles.title}>All Activities</h2>}
        {/* (REG-729) The house toolbar search (the rail's search tile and "/" still reach it). (REG-275) The box matches the sentence
            each row prints, so what a reader actually types is a person, a task or a file name — the placeholder says so. */}
        <div className={styles.actions}>
          <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search people, tasks, files…" label="Search activities" />
        </div>
      </div>
      {/* (parity P-15 · Q-22) one row on every record and every width — the house ChipRail (page-checklist: a chip row that can overflow): the
          project's fourteen kinds scroll sideways with the rail's pagers instead of wrapping into four rows on a phone */}
      <div><ChipRail label="Show"><Chips label="Show" options={[...chips]} value={show} onChange={(v) => setShow(v as Show)} testId="activity-chips" /></ChipRail></div>

      {events.length === 0 ? (
        /* a search, or a chip, that keeps nothing — the tabs' shared No-results card ("No activities match this filter."), Clear All back to All */
        <TabSearchEmpty noun="activities" searching={!!q} onClearAll={() => { setQuery(''); setShow('all') }} />
      ) : feed ? (
        <div className={styles.days} data-testid="activity-days">
          {feed.days.map((d) => (
            <section key={d.key} className={styles.day} aria-label={d.label}>
              <h3 className={styles.dayHead}>{d.label}</h3>
              <ul className={styles.dayList} role="list">
                {d.items.map((it) => it.kind === 'one' ? (
                  <li key={it.event.id} className={styles.dayItem} data-testid="activity-row"><DayRow event={it.event} time={it.time} /></li>
                ) : (
                  <li key={it.key} className={styles.dayItem} data-testid="activity-run">
                    <button type="button" className={styles.dayRow} aria-expanded={open.has(it.key)} data-testid="activity-run-toggle"
                            onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(it.key)) n.delete(it.key); else n.add(it.key); return n })}>
                      <span className={styles.dayTime}>{it.time}</span>
                      <span className={styles.dayText}>{it.text}</span>
                      <Icon name={open.has(it.key) ? 'expand_less' : 'expand_more'} size={24} className={styles.dayChev} />
                    </button>
                    {open.has(it.key) ? (
                      <ul className={styles.runList} role="list">
                        {it.events.map((e) => <li key={e.id} className={styles.dayItem} data-testid="activity-row"><DayRow event={e} time={timeOf(e)} /></li>)}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {feed.shown < feed.total ? (
            <Button variant="secondary" appearance="outlined" className={styles.older} onPress={() => setLimit((n) => n + PAGE)} data-testid="activity-older">Show older</Button>
          ) : null}
        </div>
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
                {/* (Projects round 8) the client's pick files a small summary card under its line — the option, its price, the note */}
                {e.card ? (
                  <span className={styles.card} data-testid="activity-card">
                    <span className={styles.cardThumb} data-hex={!e.card.src && e.card.hex ? '' : undefined} style={!e.card.src && e.card.hex ? ({ '--swatch': e.card.hex } as CSSProperties) : undefined} aria-hidden>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {e.card.src ? <img src={e.card.src} alt="" /> : null}
                    </span>
                    <span className={styles.cardText}>
                      <span className={styles.cardTitle}>{e.card.title}</span>
                      {e.card.lines.map((l, i) => <span key={i} className={styles.cardLine}>{l}</span>)}
                    </span>
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
