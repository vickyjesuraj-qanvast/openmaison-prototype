import { Fragment, type ReactNode } from 'react'
import { Slot, Words, cycle, deskOnly, phoneOnly } from '@/components/shell/ghost-kit'
import { Bone } from '@/components/shell/skeleton'
import { PROJECTS_SHOWN, PROJECTS_SHOWN_PHONE, SITE_SHOWN, TEAM_SHOWN, encodeDayActs, type DayAct } from '@/lib/dashboard/cards'
import styles from './cards.module.css'

/*
 * (the calm pass, 2026-10-26 — lane C3, for the page's ghost: lane C1's components/dashboard/dashboard-ghost.tsx) Each card's ghost drawn on the
 * card's own classes — the frame's white card and head, Your day's week and rows, Pipeline's stage rows, Projects' two lines and bar, Team
 * load's segments, On site's tiles — so the loader and the reveal land every word where its bone was (REG-708). Server-safe: no hooks, no
 * browser reads; the words are of the demo's lengths, their letters hidden by the kit. A row past a phone's count is a desk's only.
 */

/** Your day's rows before its "Show n more" (the card's own, your-day-card.tsx) — a phone shows four. */
export const DAY_SHOWN_GHOST = 6
export const DAY_SHOWN_PHONE_GHOST = 4
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_WHEN = ['5 days late', '10:00 AM', '11:00 AM', '2:00 PM', 'by 4:30 PM']
const DAY_TITLES = ['Order the kitchen cabinets', 'Site visit · Benjamin Han', 'Qanvast Hangout · Marina Bay', 'First consultation · Priya Nair', 'Call Cheryl back about her budget']
const DAY_CAPTIONS = ['HDB 5-Room — Benjamin Han', 'SkyOasis @ Dawson, Queenstown · with Germaine · 45 min', 'Marina Bay Sands Expo, Hall B · until 7:00 PM', 'Showroom · 1 h', 'Cheryl Lim']
const DAY_TICK = [true, false, false, false, true]
/** each sample row's one action: Directions (a link's width) or Call (the text button at a desk, a 36 glyph button on a phone) — (the calm pass —
    lane C1, the ghost's fit on a phone) a site visit has its Directions too. (the close-out round 2026-10-31, dash-d1) The demo morning's, as
    one remembered number (`encodeDayActs`): a browser that has seen the page draws what its rows held last instead — a meeting past its time
    has no Directions, and its row is a line shorter on a phone. */
const DAY_ACT_SAMPLE: DayAct[] = [null, 'link', 'link', null, 'call']
export const DAY_ACTS_SAMPLE = encodeDayActs(DAY_ACT_SAMPLE)
const STAGES = [['New', 100], ['Contacted', 86], ['Met', 43], ['Quote Sent', 43], ['Won', 43]] as const
const PROJECT_NAMES = ['HDB 5-Room — Benjamin Han', 'Executive Condo — Ryan D’Souza', 'Condo 3-bedder — Marcus Teo', 'HDB 5-Room — Aisha Rahman']
const PROJECT_STATES = ['Late', 'Late', 'Starts 4 Nov', 'On hold']
const PROJECT_LINES = ['43% · Bill AF-7781 from AquaFlow Plumbing Works — 14 days overdue', '29% · Carpentry fabrication 6 days late', 'Setting up · 4 things left to set up', 'Resumes 28 Nov']
const TEAM_NAMES = ['Michelle', 'Germaine', 'Dane', 'Alex', 'James']
const TEAM_CAPTIONS = ['2 active leads', '3 active leads', '10 active leads', '2 active leads', '3 active leads']
const TEAM_FIGURES = ['Full (2 of 2)', '2 of 3 projects', '1 of 4 projects', '0 of 4 projects', '0 of 4 projects']
const SEGMENTS = [2, 3, 4, 4, 4]

/** A card's frame and head as the page draws them: the title and its count, the one right slot, a finger's ⋮ (a touch screen's only). */
export function CardGhost({ card, title, count, legend, wide = false, hideable: _hideable = true, children }: { card: string; title: string; count?: string; legend?: ReactNode; wide?: boolean; /** Needs you can't be hidden: its desk tools are the ✦ alone */ hideable?: boolean; children: ReactNode }) {
  return (
    <div data-card={card} className={styles.frame}>
      <section className={styles.card} aria-hidden>
        <div className={styles.head} data-wide={wide || undefined}>
          <span className={styles.headTitle}><Words className={styles.headName}>{title}</Words>{count ? <Words className={styles.headCount}>{count}</Words> : null}</span>
          {legend ? <div className={styles.headRight}>{legend}</div> : null}
          {/* (the calm UI build 2026-10-27 — the audit's 1-19 · 1-28) the head's one ⋮ — invisible at rest at a desk, always on a touch tablet, none on
              a phone (a card hides from the page's ⋮ there) */}
          <span className={`${styles.tools} ${styles.ghostDesk}`}><Bone w={24} h={24} r={4} /></span>
          <span className={`${styles.tools} ${styles.ghostTouch} ${deskOnly}`} data-touch=""><Bone w={24} h={24} r={4} /></span>
        </div>
        <div className={styles.body} data-inset="">{children}</div>
      </section>
    </div>
  )
}

/** Your day: the week in the head, then `rows` of the agenda (none: the quiet day's words) — (dash-d1) each with the action the page's row
    drew last (`acts`), and the ⋮ column when its rows had one (`menus`). */
export function DayGhost({ rows, quietWeek = false, acts = DAY_ACT_SAMPLE, menus = true }: { rows: number; quietWeek?: boolean; acts?: readonly DayAct[]; menus?: boolean }) {
  const week = (
    <span className={styles.week}>
      <span className={styles.ghostTrack}>
        {WEEK.map((d, i) => (
          <span key={d} className={i === 0 ? `${styles.dayCell} ${styles.ghostToday}` : styles.dayCell}>
            <Words className={styles.dayName}>{d}</Words><Words className={styles.dayDate}>{String(26 + i)}</Words><span className={styles.dots} />
          </span>
        ))}
      </span>
    </span>
  )
  const shown = Math.min(rows, DAY_SHOWN_GHOST)
  return (
    <CardGhost card="day" title="Your day" count={rows ? String(Math.min(rows, 9)) : undefined} legend={week} wide>
      <div className={styles.agenda} data-menus={menus ? '' : undefined}>
        {/* (the calm pass — lane C1, the ghost's fit) a quiet week is its line and its "Add a task" verb, as the card draws it */}
        {!rows ? (quietWeek
          ? <div className={styles.quiet}><Words as="p" className={styles.quietLine}>Nothing planned this week</Words><Slot kind="btn" w={104} className={styles.verb} /></div>
          : <Words as="p" className={styles.quietLine}>Nothing planned today</Words>) : null}
        {Array.from({ length: shown }, (_, i) => (
          <span key={i} className={`${styles.agendaRow}${i >= DAY_SHOWN_PHONE_GHOST ? ` ${deskOnly}` : ''}`}>
            <Words className={styles.when}>{cycle(DAY_WHEN, i)}</Words>
            <span className={styles.mark}>{cycle(DAY_TICK, i) ? <Bone w={20} h={20} r="50%" /> : <span className={styles.dot} />}</span>
            {/* a narrow card leads the caption with the time, as the page does */}
            <span className={styles.words}><Words className={styles.title}>{cycle(DAY_TITLES, i)}</Words><span className={styles.caption}><Words className={styles.whenInline}>{`${cycle(DAY_WHEN, i)} · `}</Words><Words>{cycle(DAY_CAPTIONS, i)}</Words></span></span>
            <span className={styles.act}><ActBone act={acts[i] ?? null} /></span>
            <span className={styles.rowMore} />
          </span>
        ))}
        {rows > DAY_SHOWN_GHOST ? <Words className={styles.moreLink}>{`Show ${rows - DAY_SHOWN_GHOST} more`}</Words>
          /* (the calm pass — lane C1) a phone's own "Show n more": the kit's phone-only box holds it, so the link's own display on touch (44, flex)
             never shows it on a tablet */
          : rows > DAY_SHOWN_PHONE_GHOST ? <span className={phoneOnly}><Words className={styles.moreLink}>{`Show ${rows - DAY_SHOWN_PHONE_GHOST} more`}</Words></span> : null}
      </div>
    </CardGhost>
  )
}

/** A row's one action as a bone: Directions a link's width; Call the text button with its glyph at a desk (62 — the house Row's text button since 2026-10-27, was the outlined 84), the 36 glyph button on a phone (the card's own). */
function ActBone({ act }: { act: DayAct }) {
  if (act === 'link') return <Bone w={70} h={20} r={4} />
  if (act === 'call') return <><span className={`${deskOnly} ${styles.actSlot}`}><Bone w={62} h={36} r={4} /></span><span className={phoneOnly}><Bone w={36} h={36} r={4} /></span></>
  return null
}

/** Pipeline: its five stage rows and the line under them (`quietDoor` — an Owner's or an Admin's "going quiet" is a door, a finger's 44). */
export function PipelineGhost({ quietDoor = true }: { quietDoor?: boolean }) {
  return (
    <CardGhost card="pipeline" title="Pipeline" legend={<Words className={styles.headFact}>19 open</Words>}>
      <div className={styles.funnel}>
        {STAGES.map(([stage, w], i) => (
          <span key={stage} className={styles.stageRow} data-step={i}>
            <Words className={styles.stageName}>{stage}</Words>
            <span className={styles.stageTrack}><Bone w={`${w}%`} h={10} r="999px" /></span>
            <Words className={styles.stageCount}>7</Words>
          </span>
        ))}
      </div>
      <p className={styles.funnelFoot}>{quietDoor ? <Words className={styles.textLink}>12 going quiet</Words> : <Words>12 going quiet</Words>}</p>
    </CardGhost>
  )
}

/** Projects: `rows` two-line rows with their bar (a phone's four). */
export function ProjectsGhost({ rows }: { rows: number }) {
  const shown = Math.min(rows, PROJECTS_SHOWN)
  return (
    <CardGhost card="projects" title="Projects" legend={<Words className={styles.headLink}>4 running · 2 late</Words>}>
      <div className={styles.lines}>
        {Array.from({ length: shown }, (_, i) => (
          <span key={i} className={`${styles.projectRow}${i >= PROJECTS_SHOWN_PHONE ? ` ${deskOnly}` : ''}`}>
            <span className={styles.projectTop}><Words className={styles.projectName}>{cycle(PROJECT_NAMES, i)}</Words><Words className={styles.projectState}>{cycle(PROJECT_STATES, i)}</Words></span>
            <span className={styles.progress} />
            <Words className={styles.projectLine}>{cycle(PROJECT_LINES, i)}</Words>
          </span>
        ))}
      </div>
      {rows > PROJECTS_SHOWN ? <Words className={styles.moreLink}>{`Show ${rows - PROJECTS_SHOWN} more`}</Words>
        : rows > PROJECTS_SHOWN_PHONE ? <Words className={`${styles.moreLink} ${phoneOnly}`}>{`Show ${rows - PROJECTS_SHOWN_PHONE} more`}</Words> : null}
    </CardGhost>
  )
}

/** Team load: `rows` members (five, then Show n more) and, when the studio keeps contractors, the foot. */
export function TeamGhost({ rows, crew }: { rows: number; crew: boolean }) {
  const shown = Math.min(rows, TEAM_SHOWN)
  return (
    <CardGhost card="team" title="Team workload">
      <div className={styles.teamList}>
        {Array.from({ length: shown }, (_, i) => (
          <span key={i} className={styles.teamRow}>
            <span className={styles.teamWho}><Words className={styles.teamName}>{cycle(TEAM_NAMES, i)}</Words><Words className={styles.teamCaption}>{cycle(TEAM_CAPTIONS, i)}</Words></span>
            <span className={styles.load}>{Array.from({ length: cycle(SEGMENTS, i) }, (_, k) => <i key={k} />)}</span>
            <Words className={styles.loadFigure}>{cycle(TEAM_FIGURES, i)}</Words>
          </span>
        ))}
      </div>
      {rows > TEAM_SHOWN ? <Words className={styles.moreLink}>{`Show ${rows - TEAM_SHOWN} more`}</Words> : null}
      {crew ? <span className={styles.crewLine}><Words className={styles.crewWords}>Contractors: 4 free this week, 1 overbooked</Words><Words className={styles.textLink}>View</Words></span> : null}
    </CardGhost>
  )
}

/** On site: one row of tiles (`tiles` of them, at most a row) with a caption under them. */
export function SiteGhost({ tiles }: { tiles: number }) {
  const n = Math.max(1, Math.min(tiles, SITE_SHOWN))
  return (
    <CardGhost card="site" title="Site photos from the last 7 days">
      <div className={`${styles.photos} ${styles.ghostPhotos}`}>
        <span className={styles.photoGroup} style={{ ['--span' as string]: String(n) }}>
          <span className={styles.photoRow}>{Array.from({ length: n }, (_, i) => <Fragment key={i}><span className={i >= 2 ? `${styles.photo} ${deskOnly}` : styles.photo} /></Fragment>)}</span>
          <Words as="p" className={styles.photoCaption}>Kitchen cabinets are in · Benjamin Han · 21 Oct</Words>
        </span>
      </div>
    </CardGhost>
  )
}
