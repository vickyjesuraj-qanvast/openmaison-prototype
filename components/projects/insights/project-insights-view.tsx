'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChipRail } from '@/components/om/chip-rail'
import { Chips } from '@/components/om/chips'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { useSnackbar } from '@/components/om/snackbar'
import { Button } from '@/components/ds'
import { ExportDialog } from '@/components/leads/export-dialog'
import { MetaChip } from '@/components/om/meta-chip'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { gridTemplateFor, useColumnLayout, useTableColumns, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { useColumnDrag } from '@/components/om/column-drag'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { withFrom } from '@/lib/nav'
import { setFlagPref } from '@/lib/prefs'
import { BLANK } from '@/lib/leads/row-text'
import { DEFAULT_RANGE, MEDIANS_NOTE, rangeLabel } from '@/lib/leads/tat'
import { buildTable, downloadBlob, type ExportFormat } from '@/lib/leads/export'
import { INSIGHT_RANGES, daysWords, projectsReport, projectsSheet, type InsightsRange, type MemberInsight } from '@/lib/projects/insights-model'
import { stateOf, stateWords } from '@/lib/projects/workload'
import type { ProjectInsightsData } from '@/lib/projects/insights'
import styles from './insights.module.css'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const TONE = { room: 'green', full: 'yellow', over: 'red' } as const
/** (REG-1361) Where this page lives — what a link from it carries as `from`. */
const HERE = '/company/reports/projects'

const COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'member', label: 'Member', track: 'minmax(220px, 220fr)', locked: true },
  { key: 'running', label: 'Running', track: 'minmax(176px, 176fr)' },
  { key: 'started', label: 'Started', track: 'minmax(104px, 104fr)' },
  { key: 'completed', label: 'Completed', track: 'minmax(120px, 120fr)' },
  { key: 'duration', label: 'Start → Completed', track: 'minmax(176px, 176fr)' },   /* (parity P-32 · C-03) the tile's name, the span — it was "Median duration" */
  { key: 'late', label: 'Late milestones', track: 'minmax(160px, 160fr)' },
]

/**
 * (gaps build I, I-Q6 · I-Q7 — no mock; Leads › Insights' page on a project's records) Projects › Insights — (REG-1361) Company › Reports › Projects, this body inside the Reports frame: the range chips, five tiles —
 * Projects started · Completed · Start → Completed · Late milestones · Collection days (Owners and Admins: money) — (parity P-32) the lead's
 * waiting chips, then By team member on the listing's table model with Column settings. Owners and Admins read the studio; a Manager their
 * team; a Designer meets the gate. Every number derives per range in the browser from the facts the loader hands over (lib/projects/insights-model.ts).
 */
export function ProjectInsightsView({ data, initialRange = DEFAULT_RANGE }: { data: ProjectInsightsData | null; /** (pending modules S39) the address's `?range=` */ initialRange?: InsightsRange }) {
  const router = useRouter()
  const [range, setRange] = useState<InsightsRange>(initialRange)   // (parity P-31 · Q-16) both reports open on 90 days — (pending modules S39) or on the address's range
  const report = useMemo(() => (data ? projectsReport(data.facts, data.team, data.now, range, data.withMoney, data.today) : null), [data, range])
  const mobile = useMediaQuery(MOBILE)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const snackbar = useSnackbar()
  const columnPrefs = useTableColumns('project-insights-members', COLUMN_DEFS, mobile)
  const roomy = useMemo(() => report?.members.filter((m) => m.running < m.capacity) ?? [], [report])
  /* (gaps build I, I-Q16) Maison AI answers from the studio's own numbers — nothing metered (Q-30) */
  const ai = useMemo<MaisonSuggestion[]>(() => (report ? [
    { label: 'Who has room for a new project?', answer: { title: roomy.length ? `${plural(roomy.length, 'person has', 'people have')} room` : 'Everyone is full',
      text: roomy.length ? 'By their capacity, against the projects they run now.' : 'Nobody has room by their capacity — Set capacity on the Workload view, or share a project.',
      rows: roomy.map((m) => ({ id: m.id, label: m.name, meta: `${stateWords(m.running, m.capacity)} · ${m.running} of ${m.capacity}`, href: withFrom('/projects?view=workload', HERE) })) } },
    { label: 'Open the Workload view', run: () => router.push(withFrom('/projects?view=workload', HERE)) },
    /* (parity P-34) one word for late: a milestone past its day now is "overdue" (it asked "Which projects run late?") */
    { label: 'Which projects have overdue milestones?', run: () => router.push(withFrom('/projects?scope=attention', HERE)) },
  ] : []), [report, roomy, router])
  useMaisonAi(ai)
  useEffect(() => { if (data) setFlagPref('om.shape.project-insights.money', data.withMoney) }, [data])   // the ghost's tiles, next time
  useEffect(() => { if (report) setFlagPref('om.shape.project-insights.waiting', report.late.now > 0) }, [report])   // (parity P-32) the ghost's chips row
  /* (parity Q-20) the house Export, as Finance's reports have it — the page's numbers as one sheet */
  const download = (format: ExportFormat) => {
    if (!report) return ''
    const sheet = projectsSheet(report, range)
    const name = `projects-report-${rangeLabel(range).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${format.toLowerCase()}`
    return downloadBlob(buildTable(`Projects report — ${rangeLabel(range)}`, sheet.head, sheet.body, format), name)
  }

  return (
    <>
          {!data || !report ? (
            /* The gate (I-Q6: Owners, Admins and Managers). Invented copy — (REG-1361) "Project reports", the tab's own word. */
            <div className={styles.gate} data-testid="project-insights-gate">
              <Icon name="lock" size={32} weight={300} />
              <span className={styles.gateTitle}>Project reports are for Owners, Admins and Managers</span>
              <span className={styles.gateBody}>Ask your studio’s owner for the projects’ numbers.</span>
            </div>
          ) : (
            <>
              <div className={styles.bar}>
                <ChipRail label="Range">
                  <Chips label="Range" testId="project-insights-range" options={INSIGHT_RANGES.map((r) => ({ value: r.key === null ? 'all' : String(r.key), label: r.label }))} value={range === null ? 'all' : String(range)} onChange={(v) => setRange(v === 'all' ? null : (Number(v) as InsightsRange))} />
                </ChipRail>
                <span className={styles.barEnd}>
                  {/* (parity P-31 · C-06) the lead's grammar — what the range filters on, then the count in range; a Manager's team scope stays a
                      prefix. Invented copy. (It read "Every project in the studio · 4 running now", a count no chip moved.) */}
                  <span className={styles.caption} data-testid="project-insights-scope">{`${data.scope === 'team' ? 'Your team’s projects · ' : ''}Filtering on start and completion dates · ${plural(report.inRange, 'project')} in range`}</span>
                  {/* (parity Q-20) the house Export — Finance's reports' button */}
                  <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => setExporting(true)} data-testid="project-insights-export">Export</Button>
                </span>
              </div>
              {/* (parity P-30) the house tile row: one row from 1025, 3 + 2 on a tablet, two per row on a phone */}
              <StatTiles className={styles.tiles} testId="project-insights-tiles">
                <StatTile testId="tile-started" label="Projects started" value={report.started} help={range === null ? 'Since the first project' : 'Started in this range'} />
                <StatTile testId="tile-completed" label="Completed" value={report.completed} help={range === null ? 'Every completed project' : 'Completed in this range'} />
                {/* (parity P-32 · C-03) named for its span, as Leads names its legs — it was "Average duration" over a median */}
                <StatTile testId="tile-duration" label="Start → Completed" value={daysWords(report.duration.median)}
                          help={report.duration.count ? `median · avg ${daysWords(report.duration.mean)} · ${plural(report.duration.count, 'project')}` : 'No project completed in this range'}>
                  <Delta d={report.duration.delta} />
                </StatTile>
                {/* (parity P-32 · P-34) milestones that FINISHED LATE in the range only, as Leads' tiles count completed legs — the overdue ones
                    are the chips row's. Invented copy. */}
                <StatTile testId="tile-late" label="Late milestones" value={report.late.ended} grade={report.late.ended > 0 ? 'bad' : undefined}
                          help={report.late.due ? `Finished late, of ${report.late.due} finished in this range` : 'No milestone finished in this range'} />
                {report.collection ? (
                  <StatTile testId="tile-collection" label="Collection days" value={daysWords(report.collection.median)}
                            help={report.collection.count ? `median, sent → paid in full · ${plural(report.collection.count, 'invoice')}` : 'No invoice paid in full in this range'}>
                    <Delta d={report.collection.delta} />
                  </StatTile>
                ) : null}
              </StatTiles>
              {/* (parity P-32 · C-07) the lead's waiting chips: work past its day now, in the Status card's own words, red as the lead colours
                  overdue (P-34) */}
              {report.late.now > 0 ? (
                <div className={styles.awaiting} data-testid="project-insights-waiting">
                  <MetaChip color="red" icon="schedule">{`${plural(report.late.now, 'milestone')} overdue`}</MetaChip>
                </div>
              ) : null}
              <section className={styles.section} aria-label="By team member">
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.sectionTitle}>By team member</span>
                    <span className={styles.sectionHelp}>A project counts for everyone on its team · Running is against each person’s capacity</span>
                  </div>
                  {mobile ? null : (
                    <Tooltip label="Column settings">
                      <IconButton icon="tune" label="Column settings" onClick={() => setColumnsOpen(true)} />
                    </Tooltip>
                  )}
                </div>
                {report.members.length === 0 ? <p className={styles.empty}>No one runs projects yet.</p> : <MembersTable rows={report.members} columns={columnPrefs.columns} onReorder={columnPrefs.reorder} />}
              </section>
              {/* (parity P-35 · C-13) the reports' one first sentence, then this page's own — (P-34) "finished late" and "overdue". Invented copy. */}
              <p className={styles.foot}>{MEDIANS_NOTE} A milestone finished late when it was done after its planned last day; one still open past it is overdue.</p>
            </>
          )}
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      <ExportDialog open={exporting} title="Export Projects report" onClose={() => setExporting(false)} download={(format) => download(format)}
                    onDone={(name, format) => snackbar({ message: `Exported Projects report as ${format} · ${name}` })} />
    </>
  )
}

/** A change against the window before — a decrease is the better way (Leads › Insights' rule); (parity P-35 · C-12) "improving", the lead's word. */
function Delta({ d }: { d: number | null }) {
  if (d === null) return null
  return <span className={styles.tileDelta}><MetaChip color={d < 0 ? 'green' : 'red'} icon={d < 0 ? 'arrow_downward' : 'arrow_upward'}>{`${Math.abs(d)}% vs prior · ${d < 0 ? 'improving' : 'slower'}`}</MetaChip></span>
}

/** By team member — Leads › Insights' table (frozen Member, resizable and draggable heads, Column settings), on its stylesheet. */
function MembersTable({ rows, columns, onReorder }: { rows: MemberInsight[]; columns: readonly TableColumn[]; onReorder: (keys: string[]) => void }) {
  const colWidths = useColumnWidths('project-insights-members')
  const tracks = gridTemplateFor(columns, colWidths)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }
  const labelOf = (key: string) => { const c = columns.find((x) => x.key === key); return c && !c.locked ? c.label : undefined }
  const cell = (key: string, node: ReactNode) => (
    <div key={key} className={`${styles.cell} ${L.pinned(key) ? styles.pin : ''}`} role="cell" data-col={key} data-label={labelOf(key)} data-pin-edge={L.edge(key) || undefined} style={L.style(key)}>{node}</div>
  )
  const render = (r: MemberInsight, key: string) => {
    switch (key) {
      case 'member': return cell(key, <span className={styles.memberCell}><Avatar name={r.name} color={r.color} size={36} tooltip={false} /><span className={styles.memberText}><span className={styles.memberName}>{r.name}</span><span className={styles.memberRole}>{r.role}</span></span></span>)
      case 'running': return cell(key, <span className={styles.stat}><span className={styles.statValue}>{`${r.running} of ${r.capacity}`}</span><span className={styles.statHelp}><MetaChip color={TONE[stateOf(r.running, r.capacity)]}>{stateWords(r.running, r.capacity)}</MetaChip></span></span>)
      case 'started': return cell(key, <span className={styles.num}>{r.started}</span>)
      case 'completed': return cell(key, <span className={styles.num}>{r.completed}</span>)
      /* (parity P-35 · C-11) the lead's cell: the figure, "median · avg" under it; an empty figure is the house "--" with no line under it */
      case 'duration': return cell(key, <span className={styles.stat}><span className={styles.statValue}>{daysWords(r.durationMedian)}</span>{r.durationMedian !== null ? <span className={styles.statHelp}>{`median · avg ${daysWords(r.durationMean)}`}</span> : null}</span>)
      case 'late': return cell(key, r.late ? <MetaChip color="red">{String(r.late)}</MetaChip> : <span className={styles.num}>{BLANK}</span>)
      default: return cell(key, null)
    }
  }
  return (
    <div className={styles.card} role="table" data-drag-root="" aria-label="By team member" data-testid="project-insights-members" data-cols="project-insights-members" style={{ '--tracks': tracks } as CSSProperties}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      <div ref={headRow} className={styles.head} role="row">
        {columns.map((c) => (
          <div key={c.key} className={`${styles.hCell} ${c.pinned ? styles.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}>
            <span className={styles.hLabel}>{c.label}</span>
            <ColumnResizer table="project-insights-members" column={c.key} label={c.label} min={c.key === 'member' ? 160 : 72} />
          </div>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.id} className={styles.row} role="row" data-testid="project-insights-member-row">
          {columns.map((c) => render(r, c.key))}
        </div>
      ))}
    </div>
  )
}
