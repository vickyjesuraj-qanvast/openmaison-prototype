'use client'

import { useSearchParams } from 'next/navigation'
import { Bone } from '@/components/shell/skeleton'
import { GhostChip, GhostChips, GhostTable, GhostTextButton, HelpLines, Line, Slot, Words, type Cell, type Col } from '@/components/shell/ghost-kit'
import { StatTiles } from '@/components/om/stat-tile'
import { useSeedFlag } from '@/lib/ghost-shape'
import { useCountPref, useFlagPref } from '@/lib/prefs'
import { INSIGHTS_SHAPE, LEGS, rangeLabel, readRange } from '@/lib/leads/tat'
import { GhostPill, GhostHowCounted, GhostShowNumbers } from '@/components/company/reports/report-pill'
import { QUIET_VIEWS, SALES_FOLD } from '@/components/company/reports/sales-report'
import {
  FLOW_EMPTY, FUNNEL_EMPTY, GRANULARITY, LEAD_REPORTS, MEMBERS_EMPTY, PIPELINE_EMPTY, QUIET_EMPTY, SALES_COUNTS, SALES_SHAPE, SECTIONS, SOURCES_EMPTY, readLeadReport,
} from '@/lib/leads/sales'
import tile from '@/components/om/stat-tile.module.css'
import chart from '@/components/market-insights/chart.module.css'
import sales from '@/components/company/reports/sales-report.module.css'
import styles from './insights-view.module.css'

/** (parity P-35 · C-18) A By team member row's Member cell, drawn once for both reports' ghosts: the 36 avatar, the name and the role under it —
    the project report's ghost drew the avatar alone, so its crossfade landed two lines short. */
export const MEMBER_GHOST_CELL: Cell = { node: <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Slot kind="avatar" /><span style={{ display: 'flex', flexDirection: 'column' }}><Line w={40} lh={20} h={12} /><Line w={36} lh={16} h={10} /></span></span> }

/**
 * (REG-708) Leads › Insights' own ghost — it drew the Leads listing's: the L2 header (Leads / Insights), the range chips and the range line,
 * the three turnaround tiles in their own words, the awaiting chip, By team member and its table, the footnote. The route's `loading.tsx`
 * and the page's PageReveal draw this same one.
 * (REG-1361) Company › Reports › Leads: the body only — the Reports ghost (components/company/reports/reports-ghost.tsx) draws Company's frame round it.
 * (parity P-30 · P-31 · Q-20) the house tile row, the four ranges, the caption and Export at the bar's right.
 */
export function InsightsGhost() {
  /* (pending modules S45A) an Owner's and an Admin's tab carries the report chips (Response time · Sales); `?report=sales` draws Sales' body */
  const runs = useSeedFlag('role.runs', false)
  const params = useSearchParams()
  const report = readLeadReport(params.get('report'))
  /* (the calm UI build 2026-10-27 — 5-19 · 5-20) the page's one bar: the Report pill (an Owner's and an Admin's) and the Period pill in their
     own words — "Report: Response time ▾" · "Period: Last 90 days ▾" — then Export */
  const reportLabel = LEAD_REPORTS.find((r) => r.key === report)?.label ?? LEAD_REPORTS[0]!.label
  const range = rangeLabel(readRange(params.get('range')))
  return (
      <>
        <div className={styles.pickBar}>
          <span className={styles.picks}>
            {runs ? <GhostPill name="Report" value={reportLabel} /> : null}
            <GhostPill name="Period" value={range} />
          </span>
          <span className={styles.pickEnd}><Slot kind="btn" w={100} /></span>   {/* Export: the outlined button with its icon, 100 wide */}
        </div>
        {runs && report === 'sales' ? <SalesGhost /> : <ResponseGhost />}
      </>
  )
}

/** Response time's body (REG-611): the three turnaround tiles (each leg's change when the page drew one), the awaiting chips it drew, By team
    member with as many rows, the footnote — (S45A) read from what the page drew last on its opening range (`INSIGHTS_SHAPE`, REG-817). */
function ResponseGhost() {
  /* a first visit (nothing remembered yet) draws the demo studio's own shape on 90 days — Studio health's rule for its fallbacks */
  const [assign] = useFlagPref(INSIGHTS_SHAPE.assign, true)
  const [outreach] = useFlagPref(INSIGHTS_SHAPE.outreach, true)
  const [d0] = useFlagPref(INSIGHTS_SHAPE.delta('assignment'), false)
  const [d1] = useFlagPref(INSIGHTS_SHAPE.delta('outreach'), false)
  const [d2] = useFlagPref(INSIGHTS_SHAPE.delta('won'), true)
  const rows = useCountPref(INSIGHTS_SHAPE.members, 6)
  const delta = [d0, d1, d2]
  return (
      <>
        <StatTiles className={styles.tiles}>
          {LEGS.map((l, i) => (
            <div key={l.key} className={tile.tile}>
              <Words className={tile.label}>{l.label}</Words>
              <Line w={i === 0 ? 40 : 56} lh={24} h={20} />
              {/* (the calm UI build 2026-10-27 — 5-09) "Usually · 29 leads": one short line at every width, its average in the figure's tooltip */}
              <Line w={112} lh={16} h={10} />
              {delta[i] ? <span className={styles.tileDelta}><GhostChip label="17% vs prior · improving" /></span> : null}
            </div>
          ))}
        </StatTiles>
        {assign || outreach ? (
          <div className={styles.awaiting}>
            {assign ? <GhostChip label="1 lead waiting for a member" /> : null}
            {outreach ? <GhostChip label="6 not contacted yet" /> : null}
          </div>
        ) : null}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div><Words className={styles.sectionTitle}>By member</Words><Words className={styles.sectionHelp}>Counted for whoever logged the first contact</Words></div>
            <Slot kind="icon" desk />
          </div>
          {/* (REG-727) a phone gets the member cards the real table turns into, 222 tall: the member (36), then five lines — each turnaround two */}
          <GhostTable head={56} row={64} rows={Math.max(1, rows)} phone={{ card: 222, lines: 5 }} cols={[
            { basis: 220, grow: 220, head: 52, cell: MEMBER_GHOST_CELL },
            { basis: 96, grow: 96, head: 36, cell: 10 },
            { basis: 220, grow: 220, head: 140, cell: [40, 88] },
            { basis: 200, grow: 200, head: 124, cell: [40, 88] },
            { basis: 88, grow: 88, head: 28, cell: 10 },
            { basis: 180, grow: 180, head: 112, cell: { node: <Bone w={16} h={16} r={4} /> } },
          ]} />
        </section>
        <GhostHowCounted />
      </>
  )
}

/* ── (pending modules S45A — H-UHD-1) Sales' ghost, on the report's own classes (sales-report.module.css): the four tiles in their own words, then
   each section's title and help with its table (a phone's cards) — or its one line when the range it opens on held no leads (`SALES_SHAPE`,
   REG-817) — the flow's chart card, the footnote. ── */
const cols = (spec: [number, number, Cell][]): Col[] => spec.map(([basis, head, cell]) => ({ basis, grow: basis, head, cell }))
function GhostSection({ title, help, note, first = false, table, rows, phone, empty, tools, children, fold, tableFold }: { title: string; help: string; /** the page's note under the help — data, so a bar */ note?: number; first?: boolean; table: Col[]; rows: number; phone: { card: number; lines: number }; empty?: string; tools?: React.ReactNode; children?: React.ReactNode
  /** (the calm UI build 2026-10-27 — 5-21) the fold's text button under the table, in its words */ fold?: string
  /** (5-21) the table folded under the chart: its text button alone */ tableFold?: string }) {
  return (
    <section className={`${sales.section} ${first ? '' : sales.block}`}>
      <div className={sales.sectionHead}>
        <div><Words as="h2" className={sales.sectionTitle}>{title}</Words><Words className={sales.sectionHelp}>{help}</Words>{note && !empty ? <span className={sales.sectionNote}><Line w={note} lh={16} h={10} /></span> : null}</div>
        {empty ? null : <span className={sales.sectionTools}>{tools}{tableFold ? null : <Slot kind="icon" desk />}</span>}
      </div>
      {children}
      {empty ? <Words as="p" className={sales.empty}>{empty}</Words>
        : tableFold ? <span className={sales.foldGhost}><GhostTextButton label={tableFold} iconEnd /></span>
        : <GhostTable head={56} row={64} rows={Math.max(1, rows)} phone={phone} cols={table} />}
      {fold && !empty ? <span className={sales.foldGhost}><GhostTextButton label={fold} iconEnd /></span> : null}
    </section>
  )
}
function SalesGhost() {
  const [rows] = useFlagPref(SALES_SHAPE.rows, true)
  const [open] = useFlagPref(SALES_SHAPE.open, true)
  const [plot] = useFlagPref(SALES_SHAPE.chart, true)
  const [leak] = useFlagPref(SALES_SHAPE.leak, true)
  const [quietMembers] = useFlagPref(SALES_SHAPE.quietMembers, true)
  const members = useCountPref(SALES_COUNTS.members, 6), pipeline = useCountPref(SALES_COUNTS.pipeline, 5)
  const flow = useCountPref(SALES_COUNTS.flow, 4)
  /* (the calm UI build 2026-10-27 — 5-21) By source as the page folds it: the sources that won, the rest behind their text button */
  const sources = useCountPref(SALES_FOLD.sources, 3), rest = useCountPref(SALES_FOLD.rest, 9)
  const none = !rows
  return (
    <div>
      <StatTiles className={sales.tiles}>
        {['Leads', 'Quote sent', 'Won', 'Won value'].map((l, i) => (
          <div key={l} className={tile.tile}>
            <Words className={tile.label}>{l}</Words>
            <Line w={[24, 24, 16, 120][i]!} lh={24} h={20} />
            {/* Leads' and Quote sent's help keep one line on a phone; Won's and Won value's wrap to two there */}
            {i < 2 ? <Line w={[140, 96][i]!} lh={16} h={10} /> : <HelpLines w={[200, 180][i - 2]!} w2={[96, 88][i - 2]!} />}
          </div>
        ))}
      </StatTiles>
      <GhostSection first title={SECTIONS.members.title} help={SECTIONS.members.help} empty={none ? MEMBERS_EMPTY : undefined} rows={members} phone={{ card: 254, lines: 7 }}
        table={cols([[220, 52, MEMBER_GHOST_CELL], [96, 36, 10], [136, 72, 10], [88, 28, 10], [136, 72, 32], [168, 64, 88], [168, 80, 88], [144, 80, 48]])} />
      <GhostSection title={SECTIONS.funnel.title} help={SECTIONS.funnel.help} note={leak ? 520 : undefined} empty={none ? FUNNEL_EMPTY : undefined} rows={6} phone={{ card: 128, lines: 4 }}
        table={cols([[200, 32, 72], [96, 36, 10], [152, 80, 32], [216, 132, 32], [232, 112, 16]])} />
      <GhostSection title={SECTIONS.sources.title} help={SECTIONS.sources.help} empty={none ? SOURCES_EMPTY : undefined} rows={sources} phone={{ card: 148, lines: 5 }}
        fold={rest ? `Show ${rest} more ${rest === 1 ? 'source' : 'sources'} with no wins yet` : undefined}
        table={cols([[200, 44, 72], [96, 36, 10], [88, 28, 10], [136, 72, 32], [168, 64, 88], [168, 80, 88]])} />
      <GhostSection title={SECTIONS.pipeline.title} help={SECTIONS.pipeline.help} note={560} empty={none || !open ? PIPELINE_EMPTY : undefined} rows={pipeline + 1} phone={{ card: 148, lines: 4 }}
        table={cols([[260, 36, [72, 120]], [128, 72, 10], [168, 36, 88], [232, 120, 120], [168, 80, 88]])} />
      <GhostSection title={SECTIONS.flow.title} help={SECTIONS.flow.help} empty={none ? FLOW_EMPTY : undefined} rows={flow} phone={{ card: 148, lines: 5 }}
        tools={<GhostChips labels={GRANULARITY.map((g) => g.label)} />} tableFold={!none && plot ? 'Show the table' : undefined}
        table={cols([[160, 44, 64], [136, 80, 10], [160, 96, 10], [136, 72, 32], [200, 120, 10], [168, 64, 88]])}>
        {!none && plot ? (
          <div className={sales.chart}>
            <figure className={chart.chart} aria-hidden>
              <figcaption className={chart.head}><Words className={chart.title}>Leads added and won</Words><Line w={320} lh={16} h={10} /></figcaption>
              <ul className={chart.legend}>
                {['Leads added', 'Won from them'].map((l) => <li key={l} className={chart.key}><span className={chart.swatch} data-mark="line" /><Words>{l}</Words></li>)}
              </ul>
              <Bone w="100%" r={4} className={sales.plotGhost} />
              <div className={chart.foot}><span /><GhostShowNumbers /></div>
            </figure>
          </div>
        ) : null}
      </GhostSection>
      {/* (the calm UI build 2026-10-27 — 5-21) Going quiet, one section: it opens by days quiet, the By member switch beside Column settings */}
      <GhostSection title={SECTIONS.quiet.title} help={SECTIONS.quiet.help} note={440} empty={none || !open ? QUIET_EMPTY : undefined} rows={4} phone={{ card: 108, lines: 2 }}
        tools={quietMembers ? <GhostChips labels={QUIET_VIEWS.map((v) => v.label)} /> : null}
        table={cols([[240, 140, 88], [128, 72, 10], [168, 36, 88]])} />
      <GhostHowCounted />
    </div>
  )
}
