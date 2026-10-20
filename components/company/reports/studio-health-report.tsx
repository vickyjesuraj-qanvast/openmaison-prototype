'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChipRail } from '@/components/om/chip-rail'
import { Chips } from '@/components/om/chips'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns, type TableColumnDef } from '@/components/om/table-columns'
import { Button } from '@/components/ds'
import { ExportDialog } from '@/components/leads/export-dialog'
import { ArticleChart } from '@/components/market-insights/article-chart'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { withFrom } from '@/lib/nav'
import { setFlagPref } from '@/lib/prefs'
import { buildTable, downloadBlob, type ExportFormat } from '@/lib/leads/export'
import { moneyInHref } from '@/lib/finance/sections'
import {
  CAPTION, DEFAULT_RANGE, FOOT_NOTE, MEMBERS_HELP, RANGES, SHAPE, TREND_EMPTY, healthReport, healthSheet, lastActiveWords, rangeLabel, rangeParam,
  type HealthFacts, type HealthRange, type MemberHealth, type Tile, type TileKey,
} from '@/lib/studio-health/model'
import { ReportTable } from './report-table'
import styles from './studio-health-report.module.css'

/*
 * (pending modules S39 — card studio:studio-health: 1.0's Accounts › Studio › Studio Health, "how your team is using OpenMaison"; his "build all
 * of them" 2026-10-11, in its right form) Company › Reports › Studio health — built the way the other Reports tabs are (Leads ›
 * components/leads/insights/insights-view.tsx, Meetings › ./meetings-report.tsx): the house ranges, the house tile rows in four groups (1.0's
 * Engagement · Business outcomes · Team productivity · Homeowner engagement, in plain words), Over time on the house chart (Market Insights'
 * ArticleChart — the crosshair and Show the numbers), By team member on the listing's table model with Column settings, Export. Every figure
 * derives per range in the browser from the studio's own records (lib/studio-health/model.ts) and is the count its own page shows; a tile
 * opens that page with the same range where it has one. Owners and Admins; anyone else meets the gate. No page view is tracked.
 * *(invented copy: every title, help line and caption — the tiles' labels keep 1.0's where 2.0 has the thing)*
 */
const BASE = '/company/reports/health'
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const MEMBER_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'member', label: 'Member', track: 'minmax(220px, 220fr)', locked: true },
  { key: 'last', label: 'Last active', track: 'minmax(144px, 144fr)' },
  { key: 'days', label: 'Days active', track: 'minmax(136px, 136fr)' },   /* (REG-723) each floor holds its label with the listing's 16 + 24 of padding */
  { key: 'signIns', label: 'Sign-ins', track: 'minmax(112px, 112fr)', hidden: true },   /* 1.0's Sessions — off until switched on: Days active says it better */
  { key: 'ai', label: 'AI runs', track: 'minmax(104px, 104fr)' },
  { key: 'quotes', label: 'Quotes sent', track: 'minmax(136px, 136fr)' },
  { key: 'tasks', label: 'Tasks done', track: 'minmax(128px, 128fr)' },
  { key: 'updates', label: 'Site updates', track: 'minmax(144px, 144fr)' },
]
const MEMBERS_TABLE = 'studio-health-members'

/** Where a tile's figure lives — its own page, on the same range where that page has ranges. Tiles with no list of their own stay plain. */
function doorOf(key: TileKey, range: HealthRange): { href: string; where: string } | null {
  const r = `range=${rangeParam(range)}`
  switch (key) {
    case 'active': return { href: '/company/members', where: 'Company › Members' }
    case 'ai': return { href: '/company/plan', where: 'Plan › Usage' }
    case 'leads': return { href: `/company/reports/leads?${r}`, where: 'Reports › Leads' }
    case 'projects': return { href: `/company/reports/projects?${r}`, where: 'Reports › Projects' }
    case 'quotes': return { href: '/quotes', where: 'Tools › Quotes' }
    case 'invoices': return { href: moneyInHref('invoices'), where: 'Finance › Money in' }
    case 'tasks': return { href: '/tasks', where: 'Tasks' }
    case 'chats': return { href: '/qanvast-ops/hangouts', where: 'Qanvast Ops › Hangouts' }
    case 'portalSignIns': return { href: '/company/portal/clients', where: 'Client portal › Clients' }
    default: return null
  }
}

/** (REG-1361) Company › Reports › Studio health — this body inside the Reports frame (./reports-workspace.tsx). */
export function StudioHealthReport({ data, initialRange = DEFAULT_RANGE }: { data: HealthFacts | null; initialRange?: HealthRange }) {
  const [range, setRange] = useState<HealthRange>(initialRange)
  const report = useMemo(() => (data ? healthReport(data, range) : null), [data, range])
  const mobile = useMediaQuery(MOBILE)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const snackbar = useSnackbar()
  const columns = useTableColumns(MEMBERS_TABLE, MEMBER_COLUMN_DEFS, mobile)
  /* the range rides in the address (the Leads listing's view does, P-18): a tile's door carries it as `from`, so Back lands on the same range */
  const here = `${BASE}?range=${rangeParam(range)}`
  const pick = (r: HealthRange) => {
    setRange(r)
    try { const u = new URL(window.location.href); u.searchParams.set('range', rangeParam(r)); window.history.replaceState(window.history.state, '', u.toString()) } catch { /* the address is a convenience */ }
  }

  /* Maison AI answers from the report on screen — the other reports' contract (lib/maison-ai.ts); nothing metered. (invented copy) */
  const ai = useMemo<MaisonSuggestion[]>(() => {
    if (!report || !data) return []
    const span = rangeLabel(range).toLowerCase()
    return [
      { label: 'Who hasn’t used OpenMaison lately?', answer: {
        title: report.idle.length ? `${plural(report.idle.length, 'member')} did nothing ${span}` : `Everyone did something ${span}`,
        text: report.idle.length ? 'When each last did something in OpenMaison.' : undefined,
        rows: (report.idle.length ? report.idle : report.members).map((m) => ({ id: m.id, label: `${m.name} — ${m.role}`, meta: m.lastActive === null ? 'Nothing on record yet' : `Last active ${lastActiveWords(m.lastActive, data.now).toLowerCase()}` })) } },
      { label: 'Summarise the studio’s health', answer: {
        title: `Studio health · ${span}`,
        text: `${report.active} of ${plural(report.total, 'member')} did something in OpenMaison.`,
        rows: report.groups.filter((g) => g.key !== 'clients').flatMap((g) => g.tiles).map((t) => ({ id: t.key, label: t.label, meta: [t.value, t.help].filter(Boolean).join(' · ') })) } },
      ...(report.groups.some((g) => g.key === 'clients') ? [{ label: 'How are clients using the portal?', answer: {
        title: `Clients on the portal · ${span}`,
        rows: report.groups.find((g) => g.key === 'clients')!.tiles.map((t) => ({ id: t.key, label: t.label, meta: [t.value, t.help].filter(Boolean).join(' · ') })) } }] : []),
    ]
  }, [report, data, range])
  useMaisonAi(ai)
  /* (REG-708 · REG-817) the ghost's blocks, next time: what the page drew on the range it opens on */
  useEffect(() => {
    if (!report || !data || range !== DEFAULT_RANGE) return
    setFlagPref(SHAPE.trend, report.trend !== null); setFlagPref(SHAPE.clients, data.has.portal)
    setFlagPref(SHAPE.projects, data.has.projects); setFlagPref(SHAPE.hangouts, data.has.hangouts)
  }, [report, data, range])

  const download = (format: ExportFormat) => {
    if (!report || !data) return ''
    const sheet = healthSheet(report, data.now)
    const name = `studio-health-${rangeLabel(range).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${format.toLowerCase()}`
    return downloadBlob(buildTable(`Studio health — ${rangeLabel(range)}`, sheet.head, sheet.body, format), name)
  }

  if (!data || !report) {
    return (
      /* The gate — 1.0's Studio Health was the Owner's; 2.0's reports are the Owners' and Admins'. (invented copy) the tab's own word */
      <div className={styles.gate} data-testid="health-gate">
        <Icon name="lock" size={32} weight={300} />
        <span className={styles.gateTitle}>Studio health is for Owners and Admins</span>
        <span className={styles.gateBody}>Ask your studio’s owner for it.</span>
      </div>
    )
  }
  const tile = (t: Tile) => {
    const door = doorOf(t.key, range)
    return (
      <StatTile key={t.key} testId={`health-tile-${t.key}`} label={t.label} value={t.value} help={t.help ?? undefined}
                /* (S42 audit C-21, call C·3 as recommended) another Reports tab is the same page's strip, one press back — it opens on the same
                   range as a tab, with no L2 header and no "Reports / Company / Reports" crumb; a door out of Reports keeps its way back */
                press={door ? { href: door.href.startsWith('/company/reports/') ? door.href : withFrom(door.href, here), label: `${t.value} ${t.label.toLowerCase()} — open ${door.where}` } : undefined} />
    )
  }
  return (
    <div data-testid="studio-health" data-range={rangeParam(range)}>
      <div className={styles.bar}>
        <ChipRail label="Range">
          <Chips label="Range" testId="health-range" options={RANGES.map((r) => ({ value: rangeParam(r.key), label: r.label }))} value={rangeParam(range)}
                 onChange={(v) => pick(v === 'all' ? null : (Number(v) as HealthRange))} />
        </ChipRail>
        <span className={styles.barEnd}>
          <span className={styles.caption} data-testid="health-caption">{CAPTION}</span>
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => setExporting(true)} data-testid="health-export">Export</Button>
        </span>
      </div>

      {report.groups.map((g, i) => (
        <section key={g.key} className={`${styles.section} ${i ? styles.block : ''}`} aria-labelledby={`health-${g.key}`} data-testid={`health-group-${g.key}`}>
          <div className={styles.sectionHead}>
            <div>
              <h2 id={`health-${g.key}`} className={styles.sectionTitle}>{g.title}</h2>
              <span className={styles.sectionHelp}>{g.help}</span>
            </div>
          </div>
          <StatTiles testId={`health-tiles-${g.key}`}>{g.tiles.map(tile)}</StatTiles>
        </section>
      ))}

      {/* Over time — the house chart's own card (Market Insights' ArticleChart: its title, the legend, the crosshair, Show the numbers) */}
      {report.trend ? (
        <div className={`${styles.chart} ${styles.block}`} data-testid="health-trend">
          <ArticleChart spec={report.trend} />
        </div>
      ) : (
        <section className={`${styles.section} ${styles.block}`} aria-labelledby="health-trend" data-testid="health-trend">
          <div className={styles.sectionHead}><div><h2 id="health-trend" className={styles.sectionTitle}>Over time</h2></div></div>
          <p className={styles.empty} data-testid="health-trend-empty">{TREND_EMPTY}</p>
        </section>
      )}

      <section className={`${styles.section} ${styles.block}`} aria-labelledby="health-members">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="health-members" className={styles.sectionTitle}>By team member</h2>
            <span className={styles.sectionHelp}>{MEMBERS_HELP}</span>
          </div>
          {mobile ? null : (
            <Tooltip label="Column settings">
              <IconButton icon="tune" label="Column settings" onClick={() => setColumnsOpen(true)} />
            </Tooltip>
          )}
        </div>
        <ReportTable css={styles} table={MEMBERS_TABLE} label="By team member" testId="health-members" rowTestId="health-member-row" rows={report.members}
                     columns={columns.columns} onReorder={columns.reorder} render={(m, key) => memberCell(m, key, data.now)} />
      </section>

      <p className={styles.foot} data-testid="health-foot">{FOOT_NOTE}</p>

      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columns.all} onSave={columns.save} onReset={columns.reset} />
      <ExportDialog open={exporting} title="Export Studio health" onClose={() => setExporting(false)} download={(format) => download(format)}
                    onDone={(name, format) => snackbar({ message: `Exported Studio health as ${format} · ${name}` })} />
    </div>
  )
}

/** A By team member cell — the member, then their figures in the range (Last active is their last act, at any time). */
function memberCell(m: MemberHealth, key: string, now: number): ReactNode {
  switch (key) {
    case 'member': return <span className={styles.memberCell}><Avatar name={m.name} color={m.color} size={36} tooltip={false} /><span className={styles.memberText}><span className={styles.memberName}>{m.name}</span><span className={styles.memberRole}>{m.active ? m.role : `${m.role} · deactivated`}</span></span></span>
    case 'last': return <span className={styles.num}>{lastActiveWords(m.lastActive, now)}</span>
    case 'days': return <span className={styles.num}>{m.days}</span>
    case 'signIns': return <span className={styles.num}>{m.signIns}</span>
    case 'ai': return <span className={styles.num}>{m.aiRuns}</span>
    case 'quotes': return <span className={styles.num}>{m.quotesSent}</span>
    case 'tasks': return <span className={styles.num}>{m.tasksDone}</span>
    case 'updates': return <span className={styles.num}>{m.updates}</span>
    default: return null
  }
}
