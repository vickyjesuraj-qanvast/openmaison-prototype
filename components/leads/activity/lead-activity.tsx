'use client'

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { feedDays } from './activity-days'
import type { ActivityEvent } from '@/lib/leads/activity'
import Link from 'next/link'
import { ScopePill } from '@/components/om/scope-pill'   // (the close-out round 2026-10-31, C-43 · the UI audit's 3-08) the kinds as one pill
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { TabSearchEmpty } from '@/components/leads/tasks/tab-search-empty'
import { displayTime } from '@/lib/format'
import type { ActivityGroup, LeadActivityData } from '@/lib/leads/activity'
import { activityGlyph } from '@/lib/leads/activity-glyph'
import { Timeline, TimelineGlyph, TimelineItem } from '@/components/om/timeline'
import styles from './lead-activity.module.css'

/** (Leads on the move, L4 — C-12) A phone's or a tablet's first screenful of the feed; Show older adds as many again. */
const PAGE = 20
const timeOf = (e: ActivityEvent) => displayTime(new Date(e.at))

/** (Projects round 8) The client's pick files a small summary card under its line — the option, its price, the note. */
function PickCard({ card }: { card: NonNullable<ActivityEvent['card']> }) {
  return (
    <span className={styles.card} data-testid="activity-card">
      <span className={styles.cardThumb} data-hex={!card.src && card.hex ? '' : undefined} style={!card.src && card.hex ? ({ '--swatch': card.hex } as CSSProperties) : undefined} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {card.src ? <img src={card.src} alt="" /> : null}
      </span>
      <span className={styles.cardText}>
        <span className={styles.cardTitle}>{card.title}</span>
        {card.lines.map((l, i) => <span key={i} className={styles.cardLine}>{l}</span>)}
      </span>
    </span>
  )
}

/** (L4 — P-12 · C-12) One row of the day-grouped feed: the time, the sentence at 16, and — where it leads somewhere — the whole row is the 44
 *  press with its chevron; the client's pick keeps its small card under the line. (activity by date 2026-10-24) The line's type glyph leads it
 *  (`activityGlyph`, the timeline's own). */
function DayRow({ event: e, time }: { event: ActivityEvent; time: string }) {
  const body = (
    <>
      <TimelineGlyph icon={activityGlyph(e)} className={styles.dayGlyph} />
      <span className={styles.dayTime}>{time}</span>
      <span className={styles.dayText}>{e.text}{e.card ? <PickCard card={e.card} /> : null}</span>
    </>
  )
  return e.link ? (
    <Link href={e.link.href} className={styles.dayRow} data-testid="activity-link">{body}<Icon name="chevron_right" size={24} className={styles.dayChev} /></Link>
  ) : <div className={styles.dayRow} data-static="">{body}</div>
}

/** (UX audit 2026-09-30, T10) The kinds a reader keeps, one at a time — (the close-out round 2026-10-31, C-43 · 3-08) the options of the
    toolbar's "Show: All ▾" pill (the house ScopePill over PortalMenu, as the galleries' "Status: All ▾"), each row with its count. */
type Show = 'all' | ActivityGroup
const SHOW: { value: Show; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'tasks', label: 'Tasks' }, { value: 'files', label: 'Files' }, { value: 'notes', label: 'Notes' },
  { value: 'quotes', label: 'Quotes' },   // (the calm UI build 2026-10-27 — 2-50) the quotes', contracts' and Quote X-Ray's lines had no chip of their own
  { value: 'stage', label: 'Stage' },
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
 * Stage — and a task's lines name whoever made each change (the lead's event log). (the close-out round 2026-10-31, C-43) The chips are one
 * "Show: All ▾" pill in the toolbar now, its menu the same kinds with their counts.
 * (activity by date 2026-10-24 — his "group the activities by date and add type icons for the ones we have (Tasks · Files · Notes · Stage)";
 * brings back REG-190's two pieces on REG-245's timeline) At every width the feed reads by day through one grouping (`feedDays`): at a desk the
 * house timeline (components/om/timeline.tsx) — each day opened by the mock's marker on the rail, each row its type glyph in the dot's place,
 * its time ("4:42 PM") and its sentence; every row stays (no folding at a desk: the room is there, and a name is what a reader scans for). On a
 * phone or a tablet L4's day cards keep their runs and Show older, each row led by the same glyph.
 */
export function LeadActivity({ data, chips = SHOW, views }: { data: LeadActivityData; /** (fix-A, A-16) the kinds a reader keeps — a project passes its own (`PROJECT_ACTIVITY_CHIPS`); (C-43) the Show pill's menu rows */ chips?: readonly { value: string; label: string }[]
  /** (simplify S-03 · Q-02) on a project: the Files & notes view switch in the title's place; (C-43) the Show pill sits after it */ views?: ReactNode }) {
  const [query, setQuery] = useState('')
  const [show, setShow] = useState<Show>('all')
  /* (the close-out round 2026-10-31, C-43 · the UI audit's 3-08) one "Show: All ▾" pill for the kinds — fourteen chips on a project were a wall.
     Its menu counts what each kind keeps (the same filter as the chips: All = every line but a twin, a kind = its own lines, twins included),
     counted before the search, as a gallery's pill counts. */
  const [showOpen, setShowOpen] = useState(false)
  const showRef = useRef<HTMLButtonElement | null>(null)
  const kindCounts = useMemo(() => {
    const m = new Map<string, number>([['all', data.events.filter((e) => !e.twin).length]])
    for (const e of data.events) if (e.group) m.set(e.group, (m.get(e.group) ?? 0) + 1)   // a line with no kind shows under All only, as the chips kept it
    return m
  }, [data.events])
  const showLabel = chips.find((c) => c.value === show)?.label ?? 'All'

  const q = query.trim().toLowerCase()
  /* (simplify round 2 — each fact once) under All a twin line steps back: a task or an order made from a client's ask is said by the ask's own line;
     the twin keeps its own chip (Tasks · Money) */
  const kept = show === 'all' ? data.events.filter((e) => !e.twin) : data.events.filter((e) => e.group === show)
  const events = q ? kept.filter((e) => e.text.toLowerCase().includes(q)) : kept
  /* (Leads on the move, L4 — P-12 · C-12) On a phone or a tablet the feed reads by day — "Today", "Yesterday", "Fri 23 Oct" over the rows, the time
     on each — a run of the same thing is one line that opens on a tap ("James uploaded 10 files."), a row that leads somewhere is the whole 44
     press with its chevron, and the newest 20 come first with Show older after them. The desk keeps the one continuous timeline (REG-245) —
     (activity by date 2026-10-24) by day too, its rows unfolded. */
  const compact = useMediaQuery(TABLET_DOWN)
  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  /* (activity by date 2026-10-24) one grouping for both: the desk's every row (no fold, no page), the phone's and tablet's runs and pages */
  const feed = compact ? feedDays(events, data.now, limit) : feedDays(events, data.now, Infinity, { fold: false })

  return (
    <div className={styles.tab} data-testid="activity-feed">
      <div className={styles.bar}>
        {views ?? <h2 className={styles.title}>All activities</h2>}   {/* (the calm UI build 2026-10-27 — T-13) */}
        {/* (the close-out round 2026-10-31, C-43 · 3-08) the kinds as one pill in the toolbar, before the search (a gallery's order: what narrows
            the list, then the search); on a phone it takes the row under the toolbar, where the chips were. Was: the house Chips on a ChipRail
            of their own row (parity P-15). The hook `activity-chips` stays on the pill's box. */}
        <span className={styles.show} data-testid="activity-chips">
          <ScopePill ref={showRef} label={`Show: ${showLabel}`} open={showOpen} scoped={show !== 'all'} onClick={() => setShowOpen((o) => !o)} />
        </span>
        {/* (REG-729) The house toolbar search (the rail's search tile and "/" still reach it). (REG-275) The box matches the sentence
            each row prints, so what a reader actually types is a person, a task or a file name — the placeholder says so. */}
        <div className={styles.actions}>
          <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search people, tasks, files…" label="Search activities" />
        </div>
      </div>
      {/* (REG-728) a kinds list: the width scale's 240; a bottom sheet on a phone */}
      <PortalMenu open={showOpen} anchor={showRef} onClose={() => setShowOpen(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Show">
        {chips.map((c) => (
          <DropdownItem key={c.value} role="menuitemradio" checked={show === c.value} onSelect={() => { setShowOpen(false); setShow(c.value as Show) }}>{`${c.label} · ${kindCounts.get(c.value) ?? 0}`}</DropdownItem>
        ))}
      </PortalMenu>

      {events.length === 0 ? (
        /* a search, or a chip, that keeps nothing — the tabs' shared No-results card ("No activities match this filter."), Clear All back to All */
        <TabSearchEmpty noun="activities" searching={!!q} onClearAll={() => { setQuery(''); setShow('all') }} />
      ) : compact ? (
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
                      <TimelineGlyph icon={activityGlyph(it.events[0]!)} className={styles.dayGlyph} />
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
        /* (activity by date 2026-10-24) the desk: the house timeline by day — the marker opens each day on the rail, each row is its type glyph,
           its time and its sentence (the sentence IS the link, REG-248), the client's pick its card under the line */
        <div className={styles.timeline} data-testid="activity-timeline">
          <Timeline label="Activity">
            {feed.days.flatMap((d) => d.items.flatMap((it, i) => it.kind === 'one' ? [
              <TimelineItem key={it.event.id} day={i === 0 ? d.label : null} icon={activityGlyph(it.event)} time={it.time} data-testid="activity-row">
                {it.event.link ? (
                  <Link href={it.event.link.href} className={styles.textLink}>{it.event.text}</Link>
                ) : (
                  <span className={styles.text}>{it.event.text}</span>
                )}
                {it.event.card ? <PickCard card={it.event.card} /> : null}
              </TimelineItem>,
            ] : []))}
          </Timeline>
        </div>
      )}
    </div>
  )
}
