'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Chips } from '@/components/om/chips'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { Avatar } from '@/components/om/avatar'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns, type TableColumnDef } from '@/components/om/table-columns'
import { ArticleChart } from '@/components/market-insights/article-chart'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { setCountPref, setFlagPref } from '@/lib/prefs'
import { dayWords, durationWords } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { DEFAULT_RANGE, type Range } from '@/lib/leads/tat'
import {
  FLOW_EMPTY, FUNNEL_EMPTY, GRANULARITY, MEMBERS_EMPTY, PIPELINE_EMPTY, QUIET_DAYS, QUIET_EMPTY, SALES_COUNTS, SALES_FOOT, SALES_SHAPE, SECTIONS, SOURCES_EMPTY,
  chanceWords, defaultGranularity, funnelNote, pctWords, pipelineNote, quietNote, valuedWords,
  type FlowRow, type FunnelStep, type Granularity, type MemberSales, type PipelineRow, type QuietBand, type QuietMember, type SalesReport, type SourceSales,
} from '@/lib/leads/sales'
import { ReportTable } from './report-table'
import { FoldButton, HowCounted } from './report-pill'
import styles from './sales-report.module.css'

/** (the calm UI build 2026-10-27 — 5-21, REG-817) What the folds drew last on the report's opening range, for its ghost: By source's shown rows
    and the ones folded under them. */
export const SALES_FOLD = { sources: 'om.count.sales.sources.shown', rest: 'om.count.sales.sources.rest' } as const
/** (5-21) Going quiet's two views, one section: by how long the lead has been quiet, or by member (was its own second table) */
export const QUIET_VIEWS = [{ value: 'bands', label: 'By days quiet' }, { value: 'members', label: 'By member' }] as const
/** (5-21) By source: the sources that won a lead lead the table; the rest fold under it — all of them when none has won yet */
export const sourceFold = (sources: readonly SourceSales[]) => {
  const won = sources.filter((s) => s.won > 0)
  return won.length && won.length < sources.length ? { shown: won, rest: sources.filter((s) => s.won === 0) } : { shown: [...sources], rest: [] as SourceSales[] }
}

/*
 * (pending modules S45A — H-UHD-1; 1.0's six sales reports, urbanhomedemo 479480a5e · 4da810229; his "build everything and complete it"
 * 2026-10-17, a feature every studio gets) Company › Reports › Leads › **Sales** — the second report beside Response time, built the way the
 * other Reports tabs are (Studio health's ./studio-health-report.tsx): the house tile row, then 1.0's reports as sections, each a table on the
 * listing's model (frozen first column, resizable and draggable heads, Column settings; cards on a phone): By team member (1.0's Rep
 * scorecard) · Where leads stop (Sales funnel) · By source · Open pipeline · Over time (Lead flow, on the house chart) · Going quiet (Aging &
 * stalled). The range, its caption and Export are the Leads tab's own bar (components/leads/insights/insights-view.tsx); every figure is worked
 * out from the facts by lib/leads/sales.ts. Owners and Admins. *(invented copy: every title, help line, caption and column head — lib/leads/sales.ts)*
 */
const MEMBER_COLS: readonly TableColumnDef[] = [
  { key: 'member', label: 'Member', track: 'minmax(220px, 220fr)', locked: true },
  { key: 'leads', label: 'Leads', track: 'minmax(96px, 96fr)' },
  { key: 'quoted', label: 'Quote sent', track: 'minmax(136px, 136fr)' },   /* (REG-723) each floor holds its label with the listing's 16 + 24 of padding */
  { key: 'won', label: 'Won', track: 'minmax(88px, 88fr)' },
  { key: 'conversion', label: 'Conversion', track: 'minmax(136px, 136fr)' },
  { key: 'value', label: 'Won value', track: 'minmax(168px, 168fr)' },
  { key: 'average', label: 'Average won', track: 'minmax(168px, 168fr)' },
  { key: 'days', label: 'Days to Won', track: 'minmax(144px, 144fr)' },
]
const FUNNEL_COLS: readonly TableColumnDef[] = [
  { key: 'step', label: 'Step', track: 'minmax(200px, 200fr)', locked: true },
  { key: 'leads', label: 'Leads', track: 'minmax(96px, 96fr)' },
  { key: 'ofAll', label: 'Of all leads', track: 'minmax(152px, 152fr)' },
  { key: 'ofPrevious', label: 'From the step before', track: 'minmax(216px, 216fr)' },
  { key: 'dropped', label: 'Stopped before it', track: 'minmax(232px, 232fr)' },
]
const SOURCE_COLS: readonly TableColumnDef[] = [
  { key: 'source', label: 'Source', track: 'minmax(200px, 200fr)', locked: true },
  { key: 'leads', label: 'Leads', track: 'minmax(96px, 96fr)' },
  { key: 'won', label: 'Won', track: 'minmax(88px, 88fr)' },
  { key: 'conversion', label: 'Conversion', track: 'minmax(136px, 136fr)' },
  { key: 'value', label: 'Won value', track: 'minmax(168px, 168fr)' },
  { key: 'average', label: 'Average won', track: 'minmax(168px, 168fr)' },
]
const PIPELINE_COLS: readonly TableColumnDef[] = [
  { key: 'stage', label: 'Stage', track: 'minmax(260px, 260fr)', locked: true },
  { key: 'leads', label: 'Open leads', track: 'minmax(128px, 128fr)' },
  { key: 'value', label: 'Value', track: 'minmax(168px, 168fr)' },
  { key: 'chance', label: 'Chance of winning', track: 'minmax(232px, 232fr)' },
  { key: 'likely', label: 'Likely value', track: 'minmax(168px, 168fr)' },
]
const FLOW_COLS: readonly TableColumnDef[] = [
  { key: 'period', label: 'Period', track: 'minmax(160px, 160fr)', locked: true },
  { key: 'added', label: 'Leads added', track: 'minmax(136px, 136fr)' },
  { key: 'cohort', label: 'Won from them', track: 'minmax(160px, 160fr)' },
  { key: 'conversion', label: 'Conversion', track: 'minmax(136px, 136fr)' },
  { key: 'wonIn', label: 'Won in the period', track: 'minmax(200px, 200fr)' },
  { key: 'value', label: 'Won value', track: 'minmax(168px, 168fr)' },
]
const BAND_COLS: readonly TableColumnDef[] = [
  { key: 'band', label: 'Since the last contact', track: 'minmax(240px, 240fr)', locked: true },
  { key: 'leads', label: 'Open leads', track: 'minmax(128px, 128fr)' },
  { key: 'value', label: 'Value', track: 'minmax(168px, 168fr)' },
]
const QUIET_MEMBER_COLS: readonly TableColumnDef[] = [
  { key: 'member', label: 'Member', track: 'minmax(220px, 220fr)', locked: true },
  { key: 'open', label: 'Open leads', track: 'minmax(128px, 128fr)' },
  { key: 'quiet', label: `Quiet over ${QUIET_DAYS} days`, track: 'minmax(200px, 200fr)' },
  { key: 'longest', label: 'Longest quiet', track: 'minmax(220px, 220fr)' },
]

const n = (v: number) => <span className={styles.num}>{v}</span>
const m = (v: number | null) => <span className={styles.num}>{v === null ? '--' : money2(v)}</span>
const p = (v: number | null) => <span className={styles.num}>{pctWords(v)}</span>
const member = (r: { name: string; role: string; color: string }) => (
  <span className={styles.memberCell}><Avatar name={r.name} color={r.color} size={36} tooltip={false} /><span className={styles.memberText}><span className={styles.memberName}>{r.name}</span><span className={styles.memberRole}>{r.role}</span></span></span>
)
const two = (a: ReactNode, b: ReactNode) => <span className={styles.two}><span className={styles.memberName}>{a}</span>{b ? <span className={styles.memberRole}>{b}</span> : null}</span>

/** One of the report's sections: its title and help, the section's tools and Column settings, its table on the listing's model or its one line. */
function Section<R extends { id: string }>({ id, title, help, note, table, defs, rows, render, empty, tools, first = false, children, fold, tableFold }: {
  id: string; title: string; help: string; /** what the figures say, under the help — its own line */ note?: string | null; table: string; defs: readonly TableColumnDef[]; rows: readonly R[]; render: (r: R, key: string) => ReactNode; empty: string
  tools?: ReactNode; first?: boolean; children?: ReactNode
  /** (the calm UI build 2026-10-27 — 5-21, T-14) rows folded under the table, one text button away */
  fold?: { rows: readonly R[]; more: string; less: string; testId: string }
  /** (5-21) the whole table folded under the section's chart — its figures one text button away */
  tableFold?: { more: string; less: string; testId: string }
}) {
  const mobile = useMediaQuery(MOBILE)
  const cols = useTableColumns(table, defs, mobile)
  const [open, setOpen] = useState(false)
  const [unfolded, setUnfolded] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)
  const shown = fold && unfolded ? [...rows, ...fold.rows] : rows
  const tableShown = !tableFold || tableOpen
  return (
    <section className={`${styles.section} ${first ? '' : styles.block}`} aria-labelledby={`sales-${id}`} data-testid={`sales-${id}`}>
      <div className={styles.sectionHead}>
        <div>
          <h2 id={`sales-${id}`} className={styles.sectionTitle}>{title}</h2>
          <span className={styles.sectionHelp}>{help}</span>
          {note ? <span className={styles.sectionNote} data-testid={`sales-${id}-note`}>{note}</span> : null}
        </div>
        {tools || (!mobile && rows.length && tableShown) ? (
          <span className={styles.sectionTools}>
            {tools}
            {!mobile && rows.length && tableShown ? <Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={() => setOpen(true)} /></Tooltip> : null}
          </span>
        ) : null}
      </div>
      {children}
      {tableFold && rows.length ? <FoldButton open={tableOpen} more={tableFold.more} less={tableFold.less} onToggle={() => setTableOpen((o) => !o)} testId={tableFold.testId} /> : null}
      {!tableShown ? null : shown.length ? (
        <ReportTable css={styles} table={table} label={title} testId={`sales-${id}-table`} rowTestId={`sales-${id}-row`} rows={shown}
                     columns={cols.columns} onReorder={cols.reorder} render={render} />
      ) : <p className={styles.empty} data-testid={`sales-${id}-empty`}>{empty}</p>}
      {fold && fold.rows.length ? <FoldButton open={unfolded} more={fold.more} less={fold.less} onToggle={() => setUnfolded((o) => !o)} testId={fold.testId} /> : null}
      <ColumnSettingsDrawer open={open} onClose={() => setOpen(false)} pinning={{ max: 3 }} columns={cols.all} onSave={cols.save} onReset={cols.reset} />
    </section>
  )
}

/** (S45A) The Sales report's body — the Leads tab hands it the report on its range and the flow's granularity. */
export function SalesReportBody({ report, range, onGranularity }: { report: SalesReport; range: Range; onGranularity: (g: Granularity) => void }) {
  const sources = sourceFold(report.sources)
  /* (the calm UI build 2026-10-27 — 5-21) Going quiet's two tables are one section with a switch; a range with no quiet member reads by days */
  const [quietPick, setQuietView] = useState<'bands' | 'members'>('bands')
  const quietView = quietPick === 'members' && report.quietMembers.length ? 'members' : 'bands'
  const quietTools = report.quietMembers.length && report.quietBands.length
    ? <Chips label="Going quiet" testId="sales-quiet-view" options={QUIET_VIEWS.map((v) => ({ value: v.value, label: v.label }))} value={quietView} onChange={(v) => setQuietView(v as 'bands' | 'members')} />
    : null
  /* (REG-708 · REG-817) the ghost's blocks next time: what the report drew on the range it opens on */
  useEffect(() => {
    if (range !== DEFAULT_RANGE) return
    setFlagPref(SALES_SHAPE.rows, report.inRange > 0); setFlagPref(SALES_SHAPE.open, report.pipeline.length > 0); setFlagPref(SALES_SHAPE.chart, report.chart !== null)
    setFlagPref(SALES_SHAPE.leak, report.leak !== null); setFlagPref(SALES_SHAPE.quietMembers, report.quietMembers.length > 0)
    const fold = sourceFold(report.sources)
    setCountPref(SALES_COUNTS.members, report.members.length); setCountPref(SALES_COUNTS.sources, report.sources.length); setCountPref(SALES_COUNTS.pipeline, report.pipeline.length)
    setCountPref(SALES_FOLD.sources, fold.shown.length); setCountPref(SALES_FOLD.rest, fold.rest.length)   // (5-21) the fold's shape
    if (report.granularity === defaultGranularity(range)) setCountPref(SALES_COUNTS.flow, report.flow.length)   // the page opens on the range's own granularity
    setCountPref(SALES_COUNTS.quietMembers, report.quietMembers.length)
  }, [report, range])
  return (
    <div data-testid="sales-report">
      <StatTiles className={styles.tiles} testId="sales-tiles">
        {report.tiles.map((t) => <StatTile key={t.key} testId={`sales-tile-${t.key}`} label={t.label} value={t.value} help={t.help} />)}
      </StatTiles>

      <Section<MemberSales> first id="members" title={SECTIONS.members.title} help={SECTIONS.members.help} table="sales-members" defs={MEMBER_COLS} rows={report.members} empty={MEMBERS_EMPTY}
        render={(r, key) => {
          switch (key) {
            case 'member': return member(r)
            case 'leads': return n(r.leads)
            case 'quoted': return n(r.quoted)
            case 'won': return n(r.won)
            case 'conversion': return p(r.conversion)
            case 'value': return m(r.valueMinor)
            case 'average': return m(r.averageMinor)
            case 'days': return <span className={styles.num}>{durationWords(r.daysToWon)}</span>
            default: return null
          }
        }} />

      <Section<FunnelStep> id="funnel" title={SECTIONS.funnel.title} help={SECTIONS.funnel.help} note={funnelNote(report)} table="sales-funnel" defs={FUNNEL_COLS} rows={report.funnel} empty={FUNNEL_EMPTY}
        render={(r, key) => {
          switch (key) {
            case 'step': return <span className={styles.memberName}>{r.label}</span>
            case 'leads': return n(r.leads)
            case 'ofAll': return p(r.ofAll)
            case 'ofPrevious': return p(r.ofPrevious)
            /* the biggest drop says so beside its figure — a fact to look at, not a fault (no red: red is for late and ours) */
            case 'dropped': return r.dropped ? <span className={styles.cellWithChip}><span className={styles.num}>{r.dropped}</span>{r.biggest ? <MetaChip color="yellow">Biggest drop</MetaChip> : null}</span> : <span className={styles.num}>--</span>
            default: return null
          }
        }} />

      {/* (the calm UI build 2026-10-27 — 5-21, T-14) the sources that won a lead first; the rest one text button away */}
      <Section<SourceSales> id="sources" title={SECTIONS.sources.title} help={SECTIONS.sources.help} table="sales-sources" defs={SOURCE_COLS} rows={sources.shown} empty={SOURCES_EMPTY}
        fold={sources.rest.length ? { rows: sources.rest, testId: 'sales-sources-more', more: `Show ${sources.rest.length} more ${sources.rest.length === 1 ? 'source' : 'sources'} with no wins yet`, less: `Hide the ${sources.rest.length} with no wins yet` } : undefined}
        render={(r, key) => {
          switch (key) {
            case 'source': return <span className={styles.memberName}>{r.source}</span>
            case 'leads': return n(r.leads)
            case 'won': return n(r.won)
            case 'conversion': return p(r.conversion)
            case 'value': return m(r.valueMinor)
            case 'average': return m(r.averageMinor)
            default: return null
          }
        }} />

      <Section<PipelineRow> id="pipeline" title={SECTIONS.pipeline.title} help={SECTIONS.pipeline.help} note={pipelineNote(report)} table="sales-pipeline" defs={PIPELINE_COLS}
        rows={report.pipelineTotal ? [...report.pipeline, report.pipelineTotal] : report.pipeline} empty={PIPELINE_EMPTY}
        render={(r, key) => {
          const strong = (node: ReactNode) => (r.total ? <span className={styles.strong}>{node}</span> : node)
          switch (key) {
            case 'stage': return two(r.stage, valuedWords(r))
            case 'leads': return strong(n(r.leads))
            case 'value': return strong(m(r.valueMinor))
            case 'chance': return r.total ? <span className={styles.num}>--</span> : r.rate === null ? <span className={styles.memberRole}>{chanceWords(r)}</span> : <span className={styles.num}>{chanceWords(r)}</span>
            case 'likely': return strong(m(r.likelyMinor))
            default: return null
          }
        }} />

      {/* (the calm UI build 2026-10-27 — 5-21) Over time reads as its chart (the chart's own Show the numbers); the table of every period's
          figures — conversion and won value too — folds under it */}
      <Section<FlowRow> id="flow" title={SECTIONS.flow.title} help={SECTIONS.flow.help} table="sales-flow" defs={FLOW_COLS} rows={[...report.flow].reverse()} empty={FLOW_EMPTY}
        tableFold={report.chart ? { testId: 'sales-flow-more', more: 'Show the table', less: 'Hide the table' } : undefined}
        tools={report.flow.length ? <Chips label="Period" testId="sales-granularity" options={GRANULARITY} value={report.granularity} onChange={(v) => onGranularity(v as Granularity)} /> : null}
        render={(r, key) => {
          switch (key) {
            case 'period': return <span className={styles.memberName}>{r.label}</span>
            case 'added': return n(r.added)
            case 'cohort': return n(r.wonFromThem)
            case 'conversion': return p(r.conversion)
            case 'wonIn': return n(r.wonInPeriod)
            case 'value': return m(r.valueMinor)
            default: return null
          }
        }}>
        {/* the house chart (Market Insights' ArticleChart — one axis, two series of the same count, the crosshair, Show the numbers) */}
        {report.chart ? <div className={styles.chart} data-testid="sales-flow-chart"><ArticleChart spec={report.chart} /></div> : null}
      </Section>

      {/* (the calm UI build 2026-10-27 — 5-21) Going quiet is one section: by days quiet, or by member (its second table before) — a switch */}
      {quietView === 'bands' ? (
      <Section<QuietBand> id="quiet" title={SECTIONS.quiet.title} help={SECTIONS.quiet.help} note={quietNote(report)} table="sales-quiet" defs={BAND_COLS} rows={report.quietBands} empty={QUIET_EMPTY} tools={quietTools}
        render={(r, key) => {
          switch (key) {
            case 'band': return <span className={styles.memberName}>{r.label}</span>
            case 'leads': return n(r.leads)
            case 'value': return m(r.valueMinor)
            default: return null
          }
        }} />
      ) : (
        <Section<QuietMember> id="quiet-members" title={SECTIONS.quiet.title} help={SECTIONS.quietMembers.help} note={quietNote(report)} table="sales-quiet-members" defs={QUIET_MEMBER_COLS} rows={report.quietMembers} empty={QUIET_EMPTY} tools={quietTools}
          render={(r, key) => {
            switch (key) {
              case 'member': return member(r)
              case 'open': return n(r.open)
              case 'quiet': return n(r.quiet)
              case 'longest': return r.longest === null ? <span className={styles.num}>--</span> : two(dayWords(r.longest), r.longestLead)
              default: return null
            }
          }} />
      )}

      {/* (the calm UI build 2026-10-27 — 5-21, T-05) the method, one press away */}
      <HowCounted testId="sales-foot">{SALES_FOOT}</HowCounted>
    </div>
  )
}
