'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChipRail } from '@/components/om/chip-rail'
import { MetaChip } from '@/components/om/meta-chip'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { gridTemplateFor, useColumnLayout, useTableColumns, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { useColumnDrag } from '@/components/om/column-drag'
import { Chips } from '@/components/om/chips'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { useSnackbar } from '@/components/om/snackbar'
import { Button } from '@/components/ds'
import { ExportDialog } from '@/components/leads/export-dialog'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { withFrom } from '@/lib/nav'
import { dayWords, durationWords, spanWords } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { BLANK } from '@/lib/leads/row-text'
import { buildTable, downloadBlob, type ExportFormat } from '@/lib/leads/export'
import { DEFAULT_RANGE, INSIGHTS_SHAPE, LEGS, MEDIANS_NOTE, RANGES, insightsReport, insightsSheet, rangeLabel, rangeParam, tatGrade, type MemberRow, type Range } from '@/lib/leads/tat'
import { setCountPref, setFlagPref } from '@/lib/prefs'
import type { InsightsData } from '@/lib/leads/insights'
import { LEAD_REPORTS, QUIET_DAYS, defaultGranularity, pctWords, readLeadReport, salesReport, salesSheet, type Granularity, type LeadReportKey, type SalesData } from '@/lib/leads/sales'
import { SalesReportBody } from '@/components/company/reports/sales-report'
import styles from './insights-view.module.css'

/*
 * (REG-611, parity Q-24 · R-01) Leads › Insights — 1.0's Performance view, no mock: built on 2.0's own pieces as the owner asked
 * (the L2 header, the Filters modal's chips, the X-Ray's tiles, the DS MetaChip, the listing's table model with Column settings).
 * Every number is derived per range in the browser from the facts the loader hands over (lib/leads/tat.ts). Owners and Admins;
 * anyone else meets the gate.
 */
const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`
/** (REG-1361) Where this page lives — what a link from it carries as `from`. */
const HERE = '/company/reports/leads'

const MEMBER_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'member', label: 'Member', track: 'minmax(220px, 220fr)', locked: true },
  { key: 'leads', label: 'Leads', track: 'minmax(96px, 96fr)' },
  { key: 'outreach', label: 'Assign → First outreach', track: 'minmax(220px, 220fr)' },
  { key: 'won', label: 'First outreach → Won', track: 'minmax(200px, 200fr)' },
  { key: 'wonCount', label: 'Won', track: 'minmax(88px, 88fr)' },
  { key: 'awaiting', label: 'Awaiting outreach', track: 'minmax(180px, 180fr)' },   /* (REG-723) each floor holds its label with the listing's 16 + 24 of padding */
]

/** (REG-1361) Company › Reports › Leads — this body inside the Reports frame (components/company/reports/reports-workspace.tsx), which draws the
    header, the tab strip and the page's ghost. */
export function InsightsView({ data, sales = null, initialRange = DEFAULT_RANGE, initialReport = null }: { data: InsightsData | null; /** (pending modules S39) the address's `?range=` */ initialRange?: Range
  /** (pending modules S45A — H-UHD-1) the Sales report's facts — an Owner's or an Admin's; null for anyone else (they read Response time alone, no chips) */ sales?: SalesData | null
  /** (S45A) the address's `?report=` */ initialReport?: string | null }) {
  const [range, setRange] = useState<Range>(initialRange)   // (parity P-31 · Q-16) both reports open on 90 days — (pending modules S39) or on the address's range
  /* (S45A) the tab's two reports — Response time (REG-611) and Sales (1.0's six) — as Reports › Finance picks its reports: chips, the address keeping the pick */
  const [kind, setKind] = useState<LeadReportKey>(sales ? readLeadReport(initialReport) : 'response')
  const [granularity, setGranularity] = useState<Granularity | null>(null)   // the flow's own pick, else the range's default
  const report = useMemo(() => (data ? insightsReport(data.facts, data.team, data.now, range) : null), [data, range])
  const sold = useMemo(() => (sales && kind === 'sales' ? salesReport(sales, range, granularity ?? defaultGranularity(range)) : null), [sales, kind, range, granularity])
  /* (S45A) the report and the range ride in the address (Studio health's rule), so a reload and Back land on the same view */
  const remember = (k: LeadReportKey, r: Range) => {
    try {
      const u = new URL(window.location.href)
      if (k === 'sales') u.searchParams.set('report', 'sales'); else u.searchParams.delete('report')
      u.searchParams.set('range', rangeParam(r))
      window.history.replaceState(window.history.state, '', u.toString())
    } catch { /* the address is a convenience */ }
  }
  const pickRange = (r: Range) => { setRange(r); remember(kind, r) }
  /* (S45A · REG-708 · REG-817) the ghost's blocks next time: what Response time drew on the range it opens on */
  useEffect(() => {
    if (!report || range !== DEFAULT_RANGE) return
    for (const { key } of LEGS) setFlagPref(INSIGHTS_SHAPE.delta(key), report.legs[key].delta !== null)
    setFlagPref(INSIGHTS_SHAPE.assign, report.awaitingAssignment > 0); setFlagPref(INSIGHTS_SHAPE.outreach, report.awaitingOutreach > 0)
    setCountPref(INSIGHTS_SHAPE.members, report.members.length)
  }, [report, range])
  const pickReport = (k: LeadReportKey) => { setKind(k); remember(k, range) }
  const mobile = useMediaQuery(MOBILE)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const snackbar = useSnackbar()
  const columnPrefs = useTableColumns('insights-members', MEMBER_COLUMN_DEFS, mobile)
  /* (parity P-33 · Q-02, C-08) Maison AI answers from the report on screen — the Projects report's contract (lib/maison-ai.ts); they said
     "Coming soon" though the page held every number. Nothing metered (Q-30). Invented copy. */
  const ai = useMemo<MaisonSuggestion[]>(() => {
    if (!report || !data) return []
    const span = rangeLabel(range).toLowerCase()
    const slow = report.members.filter((m) => m.outreachMedian !== null).sort((a, b) => b.outreachMedian! - a.outreachMedian!)
    return [
      { label: 'Who is slowest to make first contact?', answer: {
        title: slow.length ? `${slow[0]!.name} is slowest to first contact` : 'No first contact logged in this range',
        text: slow.length ? `Assignment → first outreach, the median per person, ${span}.` : 'Change the range to look further back.',
        rows: slow.map((m) => ({ id: m.id, label: m.name, meta: `median ${durationWords(m.outreachMedian)} · ${plural(m.outreachCount, 'lead')}` })) } },
      { label: 'Which leads are still unassigned?', answer: {
        title: report.unassigned.length ? `${plural(report.unassigned.length, 'lead')} awaiting assignment` : 'Every lead in this range has a member',
        text: report.unassigned.length ? 'Open one to assign a member.' : undefined,
        rows: report.unassigned.map((l) => ({ id: l.id, label: l.name, meta: `${l.stage} · added ${spanWords(l.createdAt, data.now)} ago`, href: withFrom(`/leads/${l.id}`, HERE) })) } },
      { label: 'Summarise the turnaround', answer: {
        title: `Turnaround · ${span}`,
        text: `${plural(report.inRange, 'lead')} created in this range.`,
        rows: LEGS.map(({ key, label }) => { const s = report.legs[key]; return { id: key, label, meta: s.count ? `median ${durationWords(s.median)} · avg ${durationWords(s.mean)} · ${plural(s.count, 'lead')}` : 'No completed legs yet' } }) } },
    ]
  }, [report, data, range])
  /* (S45A) Sales answers from its own report — who is quiet, where leads stop, which sources pay; each lead row opens the lead (invented copy) */
  const salesAi = useMemo<MaisonSuggestion[]>(() => {
    if (!sold) return []
    const span = rangeLabel(range).toLowerCase()
    const quiet = sold.quietest.filter((l) => l.days > QUIET_DAYS)
    return [
      { label: 'Which leads are going quiet?', answer: {
        title: quiet.length ? `${plural(quiet.length, 'lead')} with no contact for over ${QUIET_DAYS} days` : `No open lead has gone ${QUIET_DAYS} days without a contact`,
        text: quiet.length ? 'Open one to log a contact or move it on.' : sold.quietest.length ? 'The open leads, longest without a contact first.' : undefined,
        rows: (quiet.length ? quiet : sold.quietest).slice(0, 12).map((l) => ({ id: l.id, label: l.name, meta: `${l.stage} · ${l.contacted ? `last contact ${dayWords(l.days)} ago` : `never contacted · added ${dayWords(l.days)} ago`}${l.members.length ? ` · ${l.members.join(', ')}` : ''}`, href: withFrom(`/leads/${l.id}`, `${HERE}?report=sales&range=${rangeParam(range)}`) })) } },
      { label: 'Where do leads stop?', answer: {
        title: sold.leak ? `Most leads stop before ${sold.leak.label}` : 'No drop between the steps yet',
        text: `Each step counts the leads added ${span} that reached at least that far.`,
        rows: sold.funnel.map((f) => ({ id: f.key, label: f.label, meta: `${f.leads} · ${pctWords(f.ofAll)} of leads`, share: sold.funnel[0]?.leads ? f.leads / sold.funnel[0].leads : 0 })) } },
      { label: 'Which sources win the most?', answer: {
        title: sold.sources[0]?.won ? `${sold.sources[0].source} wins the most` : 'No source has won a lead in this range',
        text: `Won value before GST, leads added ${span}.`,
        rows: sold.sources.map((x) => ({ id: x.id, label: x.source, meta: `${x.won} of ${plural(x.leads, 'lead')} won${x.valueMinor ? ` · ${money2(x.valueMinor)}` : ''}` })) } },
    ]
  }, [sold, range])
  useMaisonAi(kind === 'sales' ? salesAi : ai)
  /* (parity Q-20) the house Export, as Finance's reports have it — the page's numbers as one sheet; (S45A) the report on screen */
  const download = (format: ExportFormat) => {
    if (sold) {
      const sheet = salesSheet(sold)
      return downloadBlob(buildTable(`Sales report — ${rangeLabel(range)}`, sheet.head, sheet.body, format), `sales-report-${rangeLabel(range).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${format.toLowerCase()}`)
    }
    if (!report) return ''
    const sheet = insightsSheet(report)
    const name = `leads-report-${rangeLabel(range).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${format.toLowerCase()}`
    return downloadBlob(buildTable(`Leads report — ${rangeLabel(range)}`, sheet.head, sheet.body, format), name)
  }
  const exportTitle = sold ? 'Sales report' : 'Leads report'

  return (
    <>
          {!data || !report ? (
            /* The gate (Q-41: Insights are Owners' and Admins'). Invented copy — (REG-1361) "Lead reports", the tab's own word. */
            <div className={styles.gate} data-testid="insights-gate">
              <Icon name="lock" size={32} weight={300} />
              <span className={styles.gateTitle}>Lead reports are for Owners and Admins</span>
              <span className={styles.gateBody}>Ask your studio’s owner for the turnaround numbers.</span>
            </div>
          ) : (
            <>
              {/* (pending modules S45A — H-UHD-1) the tab's reports, picked as Reports › Finance picks its own — an Owner's and an Admin's (Marketing reads
                  Response time alone: no chips) */}
              {sales ? (
                <div className={styles.reports}>
                  <Chips label="Report" testId="leads-report-chips" options={LEAD_REPORTS.map((r) => ({ value: r.key, label: r.label }))} value={kind} onChange={(v) => pickReport(v as LeadReportKey)} />
                </div>
              ) : null}
              <div className={styles.bar}>
                <ChipRail label="Range">
                  {/* (REG-614) The house chips (components/om/chips) — a radio group, as the Move stage window's ChoiceChips. */}
                  <Chips label="Range" testId="insights-range-chips" options={RANGES.map((r) => ({ value: r.key === null ? 'all' : String(r.key), label: r.label }))} value={range === null ? 'all' : String(range)} onChange={(v) => pickRange(v === 'all' ? null : (Number(v) as Range))} />
                </ChipRail>
                <span className={styles.barEnd}>
                  <span className={styles.caption} data-testid="insights-range">Filtering on lead created date · {plural(report.inRange, 'lead')} in range</span>
                  {/* (parity Q-20) the house Export — Finance's reports' button */}
                  <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => setExporting(true)} data-testid="insights-export">Export</Button>
                </span>
              </div>

              {sold ? <SalesReportBody report={sold} range={range} onGranularity={setGranularity} /> : <>
              {/* The three legs: the median as the headline (robust to one long job), avg · count under it, the change vs the prior window —
                  (parity P-30) on the house tile row. */}
              <StatTiles className={styles.tiles} testId="insights-tiles">
                {LEGS.map(({ key, label }) => {
                  const s = report.legs[key]
                  const grade = key === 'outreach' ? tatGrade(s.median) : null
                  return (
                    <StatTile key={key} testId={`tile-${key}`} label={label} value={durationWords(s.median)} grade={grade ?? undefined} help={s.count ? `median · avg ${durationWords(s.mean)} · ${plural(s.count, 'lead')}` : 'No completed legs in this range'}>
                      {s.delta !== null ? (
                        <span className={styles.tileDelta}>
                          {/* A DECREASE is improving (1.0). */}
                          <MetaChip color={s.delta < 0 ? 'green' : 'red'} icon={s.delta < 0 ? 'arrow_downward' : 'arrow_upward'}>{`${Math.abs(s.delta)}% vs prior · ${s.delta < 0 ? 'improving' : 'slower'}`}</MetaChip>
                        </span>
                      ) : null}
                    </StatTile>
                  )
                })}
              </StatTiles>

              {report.awaitingAssignment > 0 || report.awaitingOutreach > 0 ? (
                <div className={styles.awaiting} data-testid="insights-awaiting">
                  {report.awaitingAssignment > 0 ? <MetaChip color="yellow" icon="person_add">{`${plural(report.awaitingAssignment, 'lead')} awaiting assignment`}</MetaChip> : null}
                  {report.awaitingOutreach > 0 ? <MetaChip color="yellow" icon="schedule">{`${report.awaitingOutreach} assigned, no outreach logged yet`}</MetaChip> : null}
                </div>
              ) : null}

              <section className={styles.section} aria-label="By team member">
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.sectionTitle}>By team member</span>
                    <span className={styles.sectionHelp}>Outreach & conversion attributed to whoever logged the first outreach</span>
                  </div>
                  {mobile ? null : (
                    <Tooltip label="Column settings">
                      <IconButton icon="tune" label="Column settings" onClick={() => setColumnsOpen(true)} />
                    </Tooltip>
                  )}
                </div>
                {report.members.length === 0 ? (
                  <p className={styles.empty}>No leads in this range.</p>
                ) : (
                  <MembersTable rows={report.members} columns={columnPrefs.columns} onReorder={columnPrefs.reorder} />
                )}
              </section>
              {/* (parity P-35 · C-13) the reports' one first sentence, then this page's own */}
              <p className={styles.foot}>{MEDIANS_NOTE} Leads with no outreach yet are excluded from elapsed-time math and counted in “Awaiting outreach”.</p>
              </>}
            </>
          )}
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      <ExportDialog open={exporting} title={`Export ${exportTitle}`} onClose={() => setExporting(false)} download={(format) => download(format)}
                    onDone={(name, format) => snackbar({ message: `Exported ${exportTitle} as ${format} · ${name}` })} />
    </>
  )
}

/** The By team member table — the Qanvast Ops table's structure (frozen Member, resizable and draggable heads, Column settings). */
function MembersTable({ rows, columns, onReorder }: { rows: MemberRow[]; columns: readonly TableColumn[]; onReorder: (keys: string[]) => void }) {
  const colWidths = useColumnWidths('insights-members')
  const tracks = gridTemplateFor(columns, colWidths)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform, so the whole column travels — the Items grid's rule (REG-572) */
  /* (REG-727) On a phone each row is a card and every line after the member names itself with its column's head ("Won · 3"). */
  const labelOf = (key: string) => { const c = columns.find((x) => x.key === key); return c && !c.locked ? c.label : undefined }
  const cell = (key: string, node: React.ReactNode) => (
    <div key={key} className={`${styles.cell} ${L.pinned(key) ? styles.pin : ''}`} role="cell" data-col={key} data-label={labelOf(key)} data-pin-edge={L.edge(key) || undefined} style={L.style(key)}>{node}</div>
  )
  const render = (r: MemberRow, key: string) => {
    switch (key) {
      case 'member': return cell(key, <span className={styles.memberCell}><Avatar name={r.name} color={r.color} size={36} tooltip={false} /><span className={styles.memberText}><span className={styles.memberName}>{r.name}</span><span className={styles.memberRole}>{r.role}</span></span></span>)
      case 'leads': return cell(key, <span className={styles.num}>{r.leads}</span>)
      /* (parity P-35 · C-11) a figure's second line spells "median" as the tiles do, and an empty figure is the house "--" with no line under
         it (it read "— / med") */
      case 'outreach': return cell(key, <span className={styles.stat}><span className={styles.statValue} data-grade={tatGrade(r.outreachMedian) ?? undefined}>{durationWords(r.outreachMedian)}</span>{r.outreachMedian !== null ? <span className={styles.statHelp}>{`median · avg ${durationWords(r.outreachMean)}`}</span> : null}</span>)
      case 'won': return cell(key, <span className={styles.stat}><span className={styles.statValue}>{durationWords(r.wonMedian)}</span>{r.wonMedian !== null ? <span className={styles.statHelp}>{`median · avg ${durationWords(r.wonMean)}`}</span> : null}</span>)
      case 'wonCount': return cell(key, <span className={styles.num}>{r.won}</span>)
      case 'awaiting': return cell(key, r.awaitingOutreach > 0 ? <MetaChip color="yellow">{String(r.awaitingOutreach)}</MetaChip> : <span className={styles.num}>{BLANK}</span>)
      default: return cell(key, null)
    }
  }
  return (
    <div className={styles.card} role="table" data-drag-root="" aria-label="By team member" data-testid="insights-members" data-cols="insights-members" style={{ '--tracks': tracks } as React.CSSProperties}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      <div ref={headRow} className={styles.head} role="row">
        {columns.map((c) => (
          <div key={c.key} className={`${styles.hCell} ${c.pinned ? styles.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}>
            <span className={styles.hLabel}>{c.label}</span>
            <ColumnResizer table="insights-members" column={c.key} label={c.label} min={c.key === 'member' ? 160 : 72} />
          </div>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.id} className={styles.row} role="row" data-testid="insights-member-row">
          {columns.map((c) => render(r, c.key))}
        </div>
      ))}
    </div>
  )
}
