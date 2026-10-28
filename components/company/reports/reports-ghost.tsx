'use client'

import { Fragment } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { CompanyGhostFrame } from '@/components/company/company-ghost-frame'
import { REPORTS_TABS, type ReportsTab } from '@/lib/company/sections'
import { useSignedInRole } from '@/components/shell/access-gate'   // (S44O — C6)
import { opensPath } from '@/lib/settings/roles'
import { InsightsGhost, MEMBER_GHOST_CELL } from '@/components/leads/insights/insights-ghost'
import { ProjectInsightsGhost } from '@/components/projects/insights/project-insights-ghost'
import { Bone } from '@/components/shell/skeleton'
import { GhostChips, GhostTable, GhostTextButton, HelpLines, Line, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import { StatTiles } from '@/components/om/stat-tile'
import { useFlagPref } from '@/lib/prefs'
import { useSeedFlag } from '@/lib/ghost-shape'
import { PERIODS, PERIOD_REPORTS, PROFIT_REPORTS, REPORTS } from '@/lib/finance/reports'
import plan from '@/components/company/plan/plan.module.css'
import ins from '@/components/leads/insights/insights-view.module.css'
import {
  COACHING_EMPTY, COACHING_TITLE, MEMBERS_EMPTY, MEMBERS_HELP, OBJECTIONS_EMPTY, OBJECTIONS_HELP, OBJECTIONS_TITLE,
  OBJECTION_TILE_LABELS, RANGES, SHAPE, TILE_LABELS, checkWaitLine,
} from '@/lib/meetings/report-model'
import { CHECK_HEAD } from './meetings-report'
import { GhostHowCounted, GhostPill, GhostShowNumbers } from './report-pill'
import { GROUPS as HEALTH_GROUPS, MEMBERS_HELP as HEALTH_MEMBERS_HELP, RANGES as HEALTH_RANGES, SHAPE as HEALTH_SHAPE, TREND_EMPTY, helpShown, rangeParam, readRange, trendSubtitle } from '@/lib/studio-health/model'
import { HEADLINE_TILES } from './studio-health-report'
import books from '@/components/finance/books/books.module.css'
import tile from '@/components/om/stat-tile.module.css'
import card from '@/components/leads/detail/card.module.css'
import ov from '@/components/projects/project-overview.module.css'
import m from './meetings-report.module.css'
import h from './studio-health-report.module.css'
import chart from '@/components/market-insights/chart.module.css'

/**
 * (REG-1361, REG-708's rule) Company › Reports' ghost, one per tab: Company's frame (the L1 header, or the L2 one when opened from somewhere,
 * and the Leads · Projects · Meetings · Finance strip), then the tab's own body — the ghosts Leads › Insights, Projects › Insights and Finance ›
 * Reports drew before the move, (pending modules S23) the Meetings report's and (S39) Studio health's. `tab` from the page; the loader reads it
 * from the address.
 */
export function ReportsGhost({ tab: given, money }: { tab?: ReportsTab['key']; money?: boolean }) {
  const pathname = usePathname()
  const tab = given ?? REPORTS_TABS.find((t) => pathname.startsWith(t.href))?.key ?? REPORTS_TABS[0]!.key
  const role = useSignedInRole()   // (S44O — C6) the page's own strip: Marketing's one tab
  const shown = REPORTS_TABS.filter((t) => opensPath(role, t.href))
  return (
    <CompanyGhostFrame title={78} tabs={shown.map((t) => t.label)} active={shown.findIndex((t) => t.key === tab)} label="Loading reports">
      {tab === 'leads' ? <InsightsGhost />
        : tab === 'projects' ? <ProjectInsightsGhost money={money} />
        : tab === 'meetings' ? <MeetingsReportGhost />
        : tab === 'health' ? <StudioHealthGhost />
        : <FinanceReportsGhost />}
    </CompanyGhostFrame>
  )
}

/* ── (the calm UI build 2026-10-27 — 5-19 · 5-20) Company › Reports › Finance's ghost, the tab's own now: the Report pill and the Period pill in
   their words, Export; the report's head; its tiles; two tables — on the page's classes (books.module.css · plan.module.css). It was the books
   ghost's Reports branch (components/finance/books/books-ghost.tsx), drawn with the ten chips the page no longer has. ── */
function FinanceReportsGhost() {
  const profits = useSeedFlag('role.costs', true)   // (pending modules S41b-1) a role kept from profit and margin opens on To collect
  const params = useSearchParams()
  const reports = profits ? REPORTS : REPORTS.filter((r) => !PROFIT_REPORTS.includes(r.key))
  const r = reports.find((x) => x.key === params.get('report')) ?? reports[0]!
  const period = PERIOD_REPORTS.includes(r.key) ? (PERIODS.find((p) => p.value === params.get('period'))?.label ?? (r.key === 'gst' ? 'This quarter' : 'This year')) : null
  const four = r.key === 'pl' || r.key === 'profitability' || r.key === 'statement'
  /* (REG-708) each report's own shape (lib/finance/reports.ts): To collect and To pay open on By how late — five buckets and its Total, no help
     line — then their list, no help line; the others two tables with a help line. Their tiles' lines as the page wraps them: To collect's Net
     one line, To pay's two short lines and a tile with none. */
  const aging = r.key === 'ar' || r.key === 'ap'
  const tables = aging ? [{ rows: 6, help: false }, { rows: 4, help: false }] : [{ rows: 3, help: true }, { rows: 4, help: true }]
  const tileLines = (i: number): 2 | 1 | 0 => (r.key === 'ar' ? (i === 2 ? 1 : 2) : r.key === 'ap' ? (i === 2 ? 0 : 1) : 2)
  return (
    <div className={books.page}>
      <div className={books.block}>
        <div className={`${ins.pickBar} ${ins.flush}`}>
          <span className={ins.picks}>
            <GhostPill name="Report" value={r.label} />
            {period ? <GhostPill name="Period" value={period} /> : null}
          </span>
          <span className={ins.pickEnd}><Slot kind="btn" w={100} /></span>
        </div>
      </div>
      <div className={books.head}><Words as="h2" className={books.headTitle}>{period ? `${r.label} · ${period}` : r.label}</Words><Words as="p" className={books.headHelp}>{`${r.help}.`}</Words></div>
      <div className={four ? books.tiles : books.tiles3}>
        {Array.from({ length: four ? 4 : 3 }, (_, i) => (
          <div key={i} className={tile.tile}>
            <Line w={cycle([96, 72, 104, 84], i)} lh={16} h={10} />
            <Line w={cycle([140, 120, 150, 110], i)} lh={24} h={20} />
            {tileLines(i) === 2 ? <HelpLines w={cycle(['70%', '58%', '76%', '62%'], i)} w2={cycle(['44%', '52%', '36%', '48%'], i)} />
              : tileLines(i) === 1 ? <Line w={cycle(['70%', '58%', '76%', '62%'], i)} lh={16} h={10} /> : null}
          </div>
        ))}
      </div>
      {tables.map((tb, t) => (
        <section key={t} className={plan.section}>
          <div className={plan.sectionHead}>
            <div className={plan.sectionTitles}><Line w={cycle([120, 200], t)} lh={24} h={16} />{tb.help ? <Line w={cycle([360, 420], t)} lh={16} h={10} /> : null}</div>
            {/* the page's Column settings — a desk's tool, gone on a phone */}
            <div className={plan.sectionTools}><Slot kind="icon" desk /></div>
          </div>
          <GhostTable rows={tb.rows} head={56} row={64} phone={{ card: 150, lines: 3 }} cols={[
            { basis: 240, grow: 240, head: 36, cell: (row: number) => [cycle(['72%', '60%', '80%'], row), cycle([64, 80, 72], row)], stick: true },
            { basis: 130, grow: 130, head: 56, cell: (row: number) => cycle([84, 96, 72], row) },
            { basis: 130, grow: 130, head: 72, cell: (row: number) => cycle([84, 96, 72], row) },
          ]} />
        </section>
      ))}
    </div>
  )
}

/** (the calm UI build 2026-10-27 — 5-19) The Period pill's words for the range in the address (`?range=30|90|365|all`, the house reports' 90 when
    none or another) — what the page opens on. */
const rangeOf = (v: string | null, ranges: readonly { key: number | null; label: string }[]) =>
  (ranges.find((r) => (r.key === null ? 'all' : String(r.key)) === v) ?? ranges.find((r) => r.key === 90) ?? ranges[0])?.label ?? 'Last 90 days'

/* ── (pending modules S23) Company › Reports › Meetings' ghost ── */

/** One Overview card's two-line rows (the LEAD STAGES grammar, components/projects/overview/row.tsx `two`), in groups under a rule. */
function RowsCardGhost({ title, groups, line }: { title: string; groups: number[]; /** the card's one line instead of rows */ line?: string }) {
  let n = 0
  const row = () => {
    const i = n++
    return (
      <div key={i} className={ov.row} data-static="" data-two="" data-wrap="">
        <Bone w={20} h={20} r="50%" />
        <span className={ov.label}>
          <span className={ov.two}><Line w={[112, 96, 128, 88][i % 4]!} lh={20} h={12} /><Line w={[212, 176, 196, 160][i % 4]!} lh={16} h={10} /></span>
          <Line w={[96, 64, 72, 80][i % 4]!} lh={16} h={10} />
        </span>
      </div>
    )
  }
  /* (the calm UI build 2026-10-27 — 5-23) the page's section head over the card's frame, as RowsCard (meetings-report.tsx) draws it */
  return (
    <section className={m.rowsCard}>
      <div className={m.sectionHead}><div><Words className={m.sectionTitle}>{title}</Words></div></div>
      <div className={m.panel}>
        <div className={ov.body}>
          {line ? <Words as="p" className={ov.line}>{line}</Words> : groups.map((g, gi) => (
            <Fragment key={gi}>
              {gi > 0 ? <div className={card.rule} /> : null}
              <div className={ov.group}>{Array.from({ length: g }, row)}</div>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * (pending modules S23, REG-708) The Meetings report's own ghost, on the page's own classes (meetings-report.module.css, which composes Leads ›
 * Insights'): the range chips, the caption and Export; the five tiles in their own words; By team member and its table; Coaching and the Deal
 * score check side by side; Objections — its tiles, the kind chips and the outcome pill, its table; the footnote. Each block draws as the page
 * drew it last on its opening range (a table, or its one line — `SHAPE`, REG-817), so the crossfade lands in place. The route's loader and
 * the page's PageReveal (the Reports frame's `skeleton`) draw this same one.
 */
export function MeetingsReportGhost() {
  const period = rangeOf(useSearchParams().get('range'), RANGES)
  const [members] = useFlagPref(SHAPE.members, true)
  const [coaching] = useFlagPref(SHAPE.coaching, true)
  const [check] = useFlagPref(SHAPE.check, true)
  const [objections] = useFlagPref(SHAPE.objections, true)
  return (
    <div>
      {/* (the calm UI build 2026-10-27 — 5-19) the Period pill in its words, then Export */}
      <div className={m.pickBar}>
        <span className={m.picks}><GhostPill name="Period" value={period} /></span>
        <span className={m.pickEnd}><Slot kind="btn" w={100} /></span>   {/* Export, 100 wide */}
      </div>
      <StatTiles className={m.tiles}>
        {TILE_LABELS.map((l, i) => (
          <div key={l} className={tile.tile}>
            <Words className={tile.label}>{l}</Words>
            <Line w={[20, 40, 24, 40, 40][i]!} lh={24} h={20} />
            <HelpLines w={[150, 128, 160, 190, 120][i]!} w2={[72, 64, 80, 96, 60][i]!} />
          </div>
        ))}
      </StatTiles>
      <section className={m.section}>
        <div className={m.sectionHead}>
          <div><Words className={m.sectionTitle}>By member</Words><Words className={m.sectionHelp}>{MEMBERS_HELP}</Words></div>
          <Slot kind="icon" desk />
        </div>
        {/* a phone gets the member cards the real table turns into, 238 tall: the member (36), then five lines — three of them two (REG-727) */}
        {members ? (
          <GhostTable head={56} row={64} rows={3} phone={{ card: 222, lines: 5 }} cols={[   /* (pending modules S39) 222: the card as it stands since the row rule left the cards */
            { basis: 220, grow: 220, head: 52, cell: MEMBER_GHOST_CELL },
            { basis: 112, grow: 112, head: 62, cell: 10 },
            { basis: 136, grow: 136, head: 76, cell: [32, 40] },
            { basis: 152, grow: 152, head: 98, cell: [20, 72] },
            { basis: 176, grow: 176, head: 124, cell: 28 },
            { basis: 152, grow: 152, head: 92, cell: [32, 64] },
          ]} />
        ) : <Words as="p" className={m.empty}>{MEMBERS_EMPTY}</Words>}
      </section>
      <div className={`${m.cards} ${m.block}`}>
        <div className={m.stack}>
          {coaching ? <RowsCardGhost title={COACHING_TITLE} groups={[2]} /> : <RowsCardGhost title={COACHING_TITLE} groups={[]} line={COACHING_EMPTY} />}
        </div>
        <div className={m.stack}>
          {check ? <RowsCardGhost title={CHECK_HEAD} groups={[1, 3]} /> : <RowsCardGhost title={CHECK_HEAD} groups={[]} line={checkWaitLine(0)} />}
        </div>
      </div>
      <section className={`${m.section} ${m.block}`}>
        <div className={m.sectionHead}>
          <div><Words className={m.sectionTitle}>{OBJECTIONS_TITLE}</Words><Words className={m.sectionHelp}>{OBJECTIONS_HELP}</Words></div>
          {objections ? <Slot kind="icon" desk /> : null}
        </div>
        {objections ? (
          <>
            <StatTiles>
              {OBJECTION_TILE_LABELS.map((l, i) => (
                <div key={l} className={tile.tile}>
                  <Words className={tile.label}>{l}</Words>
                  <Line w={[24, 56, 40][i]!} lh={24} h={20} />
                  <HelpLines w={[96, 56, 56][i]!} w2={[48, 40, 40][i]!} />
                </div>
              ))}
            </StatTiles>
            <div className={m.filters}>
              <GhostChips widths={[72, 80, 120, 112]} rail />
              <span className={m.pillWrap}><Slot kind="btn" w={136} /></span>
            </div>
            {/* the phone's cards: the lead, then seven lines — what they said and your answer wrap in full there */}
            <GhostTable head={56} row={64} rows={4} phone={{ card: 486, lines: 7 }} cols={[   /* (pending modules S39) 486: the demo's objection cards as they stand (their two long answers wrap in full) */
              { basis: 200, grow: 200, head: 32, cell: 104 },
              { basis: 120, grow: 120, head: 32, cell: 64 },
              { basis: 180, grow: 180, head: 52, cell: { node: <span className={m.who}><Bone w={24} h={24} r="50%" /><Line w={88} lh={20} h={12} /></span> } },
              { basis: 184, grow: 184, head: 32, cell: 72 },
              { basis: 280, grow: 280, head: 104, cell: 200 },
              { basis: 152, grow: 152, head: 76, cell: 16 },
              { basis: 280, grow: 280, head: 84, cell: 200 },
              { basis: 168, grow: 168, head: 56, cell: { node: <Bone w={80} h={20} r={4} /> } },
            ]} />
          </>
        ) : <Words as="p" className={m.empty}>{OBJECTIONS_EMPTY}</Words>}
      </section>
      <GhostHowCounted />
    </div>
  )
}

/* ── (pending modules S39) Company › Reports › Studio health's ghost ── */

/**
 * (pending modules S39, REG-708) Studio health's own ghost, on the page's own classes (studio-health-report.module.css, which composes Leads ›
 * Insights'): the range chips, the caption and Export; each group's title and help in its own words with its tiles (their labels as words);
 * Over time — the house chart's card, its title, legend, plot and Show the numbers; By team member and its table; the foot note. The groups and
 * tiles that apply to this studio (projects · Hangouts · the client portal) and whether the range held anything to chart are remembered from
 * the page's last visit on its opening range (`SHAPE`, REG-817), so the crossfade lands in place. The route's loader and the page's
 * PageReveal (the Reports frame's `skeleton`) draw this same one.
 */
export function StudioHealthGhost() {
  const range = readRange(useSearchParams().get('range'))   // the page opens on the address's range — its words follow it
  const [trend] = useFlagPref(HEALTH_SHAPE.trend, true)
  const [clients] = useFlagPref(HEALTH_SHAPE.clients, true)
  const groups = HEALTH_GROUPS.filter((g) => g.key !== 'clients' || clients)
  /* (the calm UI build 2026-10-27 — 5-22) the four headline tiles the page opens on, then "Show all figures" (the groups stay folded) */
  const headline = HEADLINE_TILES.map((k) => groups.flatMap((g) => g.tiles).find((t) => t.key === k)).filter((t): t is NonNullable<typeof t> => !!t)
  return (
    <div>
      <div className={h.pickBar}>
        <span className={h.picks}><GhostPill name="Period" value={rangeOf(rangeParam(range), HEALTH_RANGES)} /></span>
        <span className={h.pickEnd}><Slot kind="btn" w={100} /></span>   {/* Export: the outlined button with its icon, 100 wide */}
      </div>
      <StatTiles>
        {headline.map((t, j) => (
          <div key={t.key} className={tile.tile}>
            <Words className={tile.label}>{t.label}</Words>
            <Line w={t.key === 'active' ? 56 : [24, 32, 20, 28][j % 4]!} lh={24} h={20} />
            {/* every help is one short line (lib/studio-health/model.ts), the comparing ones gone on all time */}
            {helpShown(t.key, range) ? <Line w={[104, 88, 112, 96][j % 4]!} lh={16} h={10} /> : null}
          </div>
        ))}
      </StatTiles>
      <div className={h.more} style={{ display: 'flex' }}><GhostTextButton label="Show all figures" iconEnd /></div>
      {trend ? (
        <div className={`${h.chart} ${h.block}`}>
          <figure className={chart.chart} aria-hidden>
            <figcaption className={chart.head}><Words className={chart.title}>Over time</Words><Words className={chart.subtitle}>{trendSubtitle(range)}</Words></figcaption>
            <ul className={chart.legend}>
              {['Active members', 'AI runs'].map((l) => <li key={l} className={chart.key}><span className={chart.swatch} data-mark="line" /><Words>{l}</Words></li>)}
            </ul>
            <Bone w="100%" r={4} className={h.plotGhost} />
            <div className={chart.foot}><span /><GhostShowNumbers /></div>
          </figure>
        </div>
      ) : (
        <section className={`${h.section} ${h.block}`}>
          <div className={h.sectionHead}><div><Words as="h2" className={h.sectionTitle}>Over time</Words></div></div>
          <Words as="p" className={h.empty}>{TREND_EMPTY}</Words>
        </section>
      )}
      <section className={`${h.section} ${h.block}`}>
        <div className={h.sectionHead}>
          <div><Words as="h2" className={h.sectionTitle}>By member</Words><Words className={h.sectionHelp}>{HEALTH_MEMBERS_HELP}</Words></div>
          <Slot kind="icon" desk />
        </div>
        {/* a phone gets the member cards the real table turns into: the member (36), then six one-line figures (REG-727) */}
        <GhostTable head={56} row={64} rows={6} phone={{ card: 214, lines: 6 }} cols={[
          { basis: 220, grow: 220, head: 52, cell: MEMBER_GHOST_CELL },
          { basis: 144, grow: 144, head: 76, cell: 72 },
          { basis: 136, grow: 136, head: 76, cell: 16 },
          { basis: 104, grow: 104, head: 48, cell: 12 },
          { basis: 136, grow: 136, head: 76, cell: 12 },
          { basis: 128, grow: 128, head: 70, cell: 12 },
          { basis: 144, grow: 144, head: 84, cell: 12 },
        ]} />
      </section>
      <GhostHowCounted />
    </div>
  )
}
