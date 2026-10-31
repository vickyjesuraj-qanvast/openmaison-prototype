'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { Slot, Words, cycle, deskOnly, phoneOnly } from '@/components/shell/ghost-kit'
import { Bone } from '@/components/shell/skeleton'
import { useFirstRunShape, useSeedFlag, useViewerShape } from '@/lib/ghost-shape'
import { useCountPref } from '@/lib/prefs'
import { CARD_LABEL, cardsFor, type DashCardKey } from '@/lib/dashboard/frame'
import { INBOX_SHOWN, INBOX_SHOWN_PHONE } from '@/lib/dashboard/inbox'
import { profitLabel, pulseKeysFor, pulseLabel, pulseShapeOf, type PulseKey } from '@/lib/dashboard/pulse'
/* (the calm pass) the five cards' ghosts are lane C3's own, on the cards' own classes; Needs you's is drawn below on lane C2's */
import { DAY_ACTS_SAMPLE, DAY_SHOWN_GHOST, DayGhost, PipelineGhost, ProjectsGhost, SiteGhost, TeamGhost } from './cards/card-ghosts'
import { decodeDayActs } from '@/lib/dashboard/cards'
import cc from './cards/cards.module.css'
import inbox from './inbox/inbox.module.css'
import overview from '@/components/projects/project-overview.module.css'
import chips from '@/components/om/chips.module.css'
import rail from '@/components/om/chip-rail.module.css'
import { MaisonDockGhost } from '@/components/maison-ai/dock/maison-dock'
import pageStyles from '@/app/leads/leads.module.css'
import tile from '@/components/om/stat-tile.module.css'
import styles from './dashboard.module.css'

/** What the page leaves for its next loader (per browser, written as the page leaves — app's `DashboardView`): the Needs you rows it drew, the
    news its greeting had (`om.shape.dashboard.since.first` = none). The loader and the reveal both read it, so they are one ghost (REG-708). */
export const NEEDS_COUNT_KEY = 'om.count.dashboard.needs'
export const SINCE_SHAPE = 'dashboard.since'
export const SINCE_COUNT_KEY = 'om.count.dashboard.since'
/** …and each card's rows (Your day's today, the project lines, the team lines, the contractors' line, the site photos). */
export const CARD_COUNT_KEYS = { day: 'om.count.dashboard.day', week: 'om.count.dashboard.week', projects: 'om.count.dashboard.projects', team: 'om.count.dashboard.team', crew: 'om.count.dashboard.crew', site: 'om.count.dashboard.site',
  /* (the close-out round 2026-10-31, dash-d1) Your day's rows' actions (`encodeDayActs`) and whether they kept a ⋮ column */
  dayActs: 'om.count.dashboard.day.acts', dayMenus: 'om.count.dashboard.day.menus',
  /* …and the greeting's line on a phone: one line, or two where the day's and the news's words wrapped it */
  helloLines: 'om.count.dashboard.hello.lines.phone' } as const
/** Each figure's words of the demo's lengths (never shown — the kit hides the letters), so a value and a caption wrap where the page's do. */
const PULSE_VALUE: Record<PulseKey, string> = { leads: '4', sales: 'S$ 121.1K', response: '26 hours', owed: 'S$ 34.8K', coming: 'S$ 648', profit: 'S$ 47.5K', owe: 'S$ 9.1K', gst: 'S$ 362', projects: '3', commission: 'S$ 1.2K' }
const PULSE_LINE: Record<PulseKey, string> = {
  leads: '4 from Hangout · 1 from Website', sales: '2 of 30 leads · 7%\u00a0win\u00a0rate', response: 'Usually 26 hours · aim for 8 hours', owed: '3 invoices · S$ 34.2K overdue',
  coming: '1 invoice due · 1 this week', profit: 'on S$ 50.8K billed · 2\u00a0projects still missing costs', owe: 'S$ 9K overdue · 5 balances to pay',
  gst: 'To pay', projects: '2 need your attention', commission: 'on 1 project',
}
/** Profit's label names its month by the studio's clock ("Profit · October") — the loader's server and the browser read the same clock. */
const monthLabel = () => profitLabel(Date.now())
const still = () => () => {}
/** The Whole studio · Just me track's width (measured on the page at 1440). */
const TRACK_W = 214

/**
 * (pending modules S22 · REG-708; the Dashboard redesigned, 2026-10-26 — lane D1; **the calm pass 2026-10-26 — lane C1**) The Dashboard's ghost —
 * drawn by `app/dashboard/(home)/loading.tsx` and handed to the page's `PageReveal`, the same one in both, on the page's own boxes (the frame's
 * slots, so it lays out as the page does at every width: two stacks at a desk and a tablet held sideways, one column in reading order upright
 * and on a phone, Pulse after Needs you there): the grey page; the greeting — its title, its one line, an Owner's or Admin's Studio / Mine track
 * and ⋮; the role's Pulse figures as white cards on the house tile's own classes (its label, value, caption and the one quiet visual each draws);
 * and the role's cards minus those the member hid (Needs you · Your day · On site on the left, Pipeline · Projects · Team load on the right),
 * as many rows as the page drew last time; and the docked pill (lane C4's `MaisonDockGhost`, in the page's flow as the dock is). Which cards, is the viewer's (the shell's seed, lib/ghost-shapes.server.ts: the
 * role, the cards they hid, whether Projects, Team load and On site have something to draw), never remembered per browser — View as changes it.
 */
export function DashboardGhost() {
  const runs = useSeedFlag('role.runs', false)
  const accounting = useViewerShape('role.accounting')
  const marketing = useViewerShape('role.marketing')
  const manager = useSeedFlag('dashboard.manager', false)
  const costs = useSeedFlag('role.costs', true)
  const team = useSeedFlag('dashboard.team', false)
  const site = useSeedFlag('dashboard.updates', false)
  const quiet = useSeedFlag('dashboard.quiet', false)
  const hid = { pulse: useSeedFlag('dashboard.hidden.pulse', false), day: useSeedFlag('dashboard.hidden.day', false), pipeline: useSeedFlag('dashboard.hidden.pipeline', false), projects: useSeedFlag('dashboard.hidden.projects', false), team: useSeedFlag('dashboard.hidden.team', false), site: useSeedFlag('dashboard.hidden.site', false) } as Record<string, boolean>
  const noSince = useFirstRunShape(SINCE_SHAPE)
  const needs = useCountPref(NEEDS_COUNT_KEY, quiet ? 0 : INBOX_SHOWN)
  const projectsShown = useSeedFlag('dashboard.projects', true)
  /* Your day: the rows the page drew last time; a browser that hasn't seen it yet reads the shell's seed (the week has something, or not) */
  const weekSeed = useSeedFlag('dashboard.week', true)
  const dayRows = useCountPref(CARD_COUNT_KEYS.day, weekSeed ? (accounting ? 2 : 3) : 0)
  const weekQuiet = useCountPref(CARD_COUNT_KEYS.week, weekSeed ? 1 : 0) === 0
  /* (the close-out round 2026-10-31, dash-d1) …and each row's one action as the page drew it — a meeting past its time has no Directions, so its
     words take the room and a phone's row is a line shorter; a browser that hasn't seen the page draws the demo morning's (`DAY_ACTS_SAMPLE`) */
  const dayActs = decodeDayActs(useCountPref(CARD_COUNT_KEYS.dayActs, DAY_ACTS_SAMPLE), DAY_SHOWN_GHOST)
  const dayMenus = useCountPref(CARD_COUNT_KEYS.dayMenus, 1) > 0
  const helloWrap = useCountPref(CARD_COUNT_KEYS.helloLines, 1) > 1
  const projectRows = useCountPref(CARD_COUNT_KEYS.projects, 4)
  const teamRows = useCountPref(CARD_COUNT_KEYS.team, 5)
  const crew = useCountPref(CARD_COUNT_KEYS.crew, 1) > 0
  const siteTiles = useCountPref(CARD_COUNT_KEYS.site, 2)
  const profitWords = useSyncExternalStore(still, monthLabel, monthLabel)
  const role = accounting ? 'Accounting' : marketing ? 'Marketing' : runs ? 'Owner' : manager ? 'Manager' : 'Designer'
  const cards = cardsFor(role).filter((k) => !hid[k] && (k !== 'team' || team) && (k !== 'site' || site))
  const pulse = cards.includes('pulse') ? pulseKeysFor(role, { profit: runs && costs }) : []
  const on = (k: DashCardKey) => cards.includes(k)
  const slot = (key: string, node: ReactNode) => <div className={styles.slot} data-slot={key}>{node}</div>
  return (
    <div className={`${pageStyles.body} ${styles.page}`} aria-hidden data-om-l1-header>
      <div className={styles.content}>
        {slot('greeting', (
          <div className={styles.hello}>
            <div className={styles.helloText}>
              {/* the title and its line in the greeting's own classes, words of the demo's length — so they wrap where the page's do */}
              <Words as="h2" className={styles.helloTitle}>Good evening, Dane</Words>
              {/* the day and the link each kept whole, as the page keeps them (no-break spaces) — (the calm UI build 2026-10-27) the count is the card's.
                  (the close-out round 2026-10-31, dash-d1) on a phone the news takes the next line where the page's did last time */}
              <p className={styles.helloLine}>
                <Words>{'Monday\u00a026\u00a0October'}</Words>
                {noSince ? null : <Words className={helloWrap ? styles.helloSinceWrap : undefined}>{'\u00a0· 4\u00a0new\u00a0since\u00a0Friday'}</Words>}
              </p>
            </div>
            <div className={styles.helloEnd}>
              {/* Studio / Mine: the track's own box (its height is the page's `--dash-track-h`: 40, 44 on touch) */}
              {/* (the calm UI build 2026-10-27) "Whole studio · Just me" — a desk's and a tablet's; a phone holds it in the page's ⋮ */}
              {runs ? <Bone w={TRACK_W} r={8} className={deskOnly} style={{ height: 'var(--dash-track-h)' }} /> : null}
              <Slot kind="icon" />
            </div>
          </div>
        ))}
        {pulse.length ? slot('pulse', (
          <div className={styles.pulse}>
            <div className={styles.pulseTiles} style={{ ['--pulse-n' as string]: pulse.length }}>
              {pulse.map((k) => (
                <div key={k} className={styles.figure}>
                  {/* the house tile's card look: its label, its value and its caption as words in the tile's own classes, its one visual's box */}
                  <div className={tile.tile} data-look="card">
                    <Words className={tile.label}>{k === 'profit' ? profitWords : pulseLabel(k, role)}</Words>
                    <Words className={tile.value}>{PULSE_VALUE[k]}</Words>
                    {pulseShapeOf(k, role) === 'aging' ? <span className={tile.agingWrap}><span className={tile.aging}><Bone w="100%" h={6} /></span></span> : null}
                    <span className={tile.foot}>
                      <Words className={tile.help}>{k === 'leads' && role === 'Designer' ? '1 added this week' : PULSE_LINE[k]}</Words>
                      {pulseShapeOf(k, role) === 'spark' ? <Bone w={88} h={28} r={4} /> : null}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )) : null}
        <div className={styles.grid}>
          <div className={styles.act}>
            {slot('needs', <NeedsGhost rows={needs} />)}
            {on('day') ? slot('day', <DayGhost rows={dayRows} quietWeek={weekQuiet} acts={dayActs} menus={dayMenus} />) : null}
            {on('site') ? slot('site', <SiteGhost tiles={siteTiles} />) : null}
          </div>
          <div className={styles.glance}>
            {on('pipeline') && !quiet ? slot('pipeline', <PipelineGhost quietDoor={runs} />) : null}
            {on('projects') && projectsShown ? slot('projects', <ProjectsGhost rows={projectRows} />) : null}
            {on('team') ? slot('team', <TeamGhost rows={teamRows} crew={crew} />) : null}
          </div>
        </div>
      </div>
      {/* the docked Maison AI at rest — lane C4's own ghost (the pill), the body's last child as the page's dock is */}
      <MaisonDockGhost />
    </div>
  )
}

/** Needs you's words of the demo's lengths (never shown — the kit hides the letters). */
const NEEDS_TITLES = ['“Feature wall panels have arrived”', 'PO-2026-008 to Stone & Tile Masonry Pte Ltd', 'Germaine’s claim — “Grab to site — tile selection with Benjamin”', 'Bright Spark Electrical’s bill EL-2207', 'More time on Carpentry fabrication']
const NEEDS_CAPTIONS = ['Benjamin Han · from Germaine · yesterday', 'Benjamin Han · from Germaine · 18 Oct', 'Benjamin Han · 17 Oct', 'Benjamin Han · from Priya · 1 day ago', 'Ryan D’Souza · Michelle asks for 1 week more']
/** …and their amounts (a row with none has none): beside the words on a wide card, leading the caption on a narrow one (C2's `capAmount`) */
const NEEDS_AMOUNTS: (string | null)[] = [null, 'S$ 5,530', 'S$ 39', 'S$ 6,104', null]
/** …and their verbs, the house Row's text buttons (2026-10-27): their words, at the slot's end */
/* (the calm UI build 2026-10-27) the page's words: one verb for a yes, the tabs Approvals · Clients waiting · Overdue */
const NEEDS_VERBS = ['Approve', 'Approve', 'Approve', 'Approve', 'Approve']
const NEEDS_TABS = ['All', 'Approvals 8', 'Clients waiting 8', 'Overdue 7']

/**
 * (the calm pass 2026-10-26 — lane C2's Needs you, drawn on its own classes) Needs you's ghost, the page's markup with bones in it: lane C3's card
 * frame and head (the title and its count, the tabs as the head's one right thing — on a phone the tabs take the body's first line — the ✦'s room
 * at a desk, a finger's ⋮), its body uninset (Needs you pads its own), then `rows` rows on the house Row's classes and C2's (INBOX_SHOWN at a desk,
 * INBOX_SHOWN_PHONE on a phone): the glyph's square, a title line and a caption line (the demo's own words, so they wrap where the page's do on
 * touch), the amount where the row has one (leading the caption on a narrow card), the verb's words (the house Row's text button) and the
 * ⋮'s room — no rules between them — and "Show all n" as the text link under them.
 */
function NeedsGhost({ rows }: { rows: number }) {
  const n = Math.min(rows, INBOX_SHOWN)
  const tabs = (
    <div className={`${rail.wrap} ${inbox.tabsRail}`}>
      <div className={rail.rail}>
        <div className={rail.track}>
          <span className={`${chips.chips} ${inbox.tabs}`}>
            {NEEDS_TABS.map((w, i) => <span key={w} role="radio" aria-checked={i === 0} className={chips.chip} data-selected={i === 0 ? '' : undefined}><Words>{w}</Words></span>)}
          </span>
        </div>
      </div>
    </div>
  )
  return (
    <div data-card="needs" className={inbox.host}>
      <div data-card="needs" className={cc.frame}>
        <section className={cc.card}>
          <div className={cc.head}>
            <span className={cc.headTitle}><Words className={cc.headName}>{CARD_LABEL.needs}</Words>{n ? <Words className={cc.headCount}>27</Words> : null}</span>
            {n ? <div className={`${cc.headRight} ${deskOnly}`}>{tabs}</div> : null}
            {/* (the calm UI build 2026-10-27) the head's one ⋮ — invisible at rest at a desk, always on a touch tablet, none on a phone */}
            <span className={`${cc.tools} ${cc.ghostDesk}`}><Bone w={24} h={24} r={4} /></span>
            <span className={`${cc.tools} ${cc.ghostTouch} ${deskOnly}`} data-touch=""><Bone w={24} h={24} r={4} /></span>
          </div>
          <div className={cc.body}>
            <div className={`${overview.body} ${inbox.body}`}>
              {n ? <div className={`${inbox.tabsLine} ${phoneOnly}`}>{tabs}</div> : null}
              {n ? (
                <div className={`${overview.group} ${inbox.list}`}>
                  {Array.from({ length: n }, (_, i) => (
                    <div key={i} className={i >= INBOX_SHOWN_PHONE ? `${inbox.item} ${deskOnly}` : inbox.item}>
                      <div className={`${overview.row} ${inbox.row}`} data-split="" data-two="">
                        {/* the words' own box is the row's link on the page (a phone gives it the row's width — C2's `> a`): an anchor with no address here */}
                        <a className={overview.rowMain}>
                          <Bone w={32} h={32} r={8} />
                          <span className={overview.label}>
                            <span className={overview.two}>
                              <span className={overview.name}><Words className={inbox.title}>{cycle(NEEDS_TITLES, i)}</Words></span>
                              <span className={overview.till}><span className={inbox.caption}>{cycle(NEEDS_AMOUNTS, i) ? <Words className={inbox.capAmount}>{`${cycle(NEEDS_AMOUNTS, i)} · `}</Words> : null}<Words>{cycle(NEEDS_CAPTIONS, i)}</Words></span></span>
                            </span>
                            {cycle(NEEDS_AMOUNTS, i) ? <span className={overview.meta}><Words className={inbox.amount}>{cycle(NEEDS_AMOUNTS, i)!}</Words></span> : null}
                          </span>
                        </a>
                        <span className={overview.rowActions} data-row-actions=""><span className={overview.rowAction}><span className={styles.needsVerb}><Words className={styles.needsVerbWords}>{cycle(NEEDS_VERBS, i)}</Words></span></span></span>
                        <span className={inbox.end}><span className={inbox.more}><Slot kind="icon" /></span></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={inbox.caught}><Bone w={32} h={32} r={8} /><span className={inbox.caughtWords}><Words className={inbox.caughtTitle}>You’re all caught up</Words><Words className={inbox.caughtNext}>Next: Site visit · Benjamin Han</Words></span></div>
              )}
              {rows > INBOX_SHOWN_PHONE ? <div className={rows > n ? inbox.foot : `${inbox.foot} ${phoneOnly}`}><Words className={inbox.link}>See all 27</Words></div> : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
