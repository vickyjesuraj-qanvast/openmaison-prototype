'use client'

import { openPlanLock, usePlanLock } from '@/components/credits/credits-client'
import { ProLocked } from '@/components/credits/pro-tag'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Chips } from '@/components/om/chips'
import { StatTile } from '@/components/om/stat-tile'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { CreditsTable } from '@/components/company/plan/credits-table'
import { ScopePill } from '@/components/om/scope-pill'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { ENTITY_PARAM, ENTITY_SCOPE_WORD, entityMenu, entityOf, entityOptions, entityPillLabel } from '@/lib/finance/entity-scope'
import { useSheetLayout } from '@/components/om/sheet'
import { FINANCE_REPORT_COOKIE, rememberReport } from '@/lib/finance/report-memory'
import { ExportDialog } from '@/components/leads/export-dialog'
import type { TableColumnDef } from '@/components/om/table-columns'
import { buildTable, downloadBlob, type ExportFormat } from '@/lib/leads/export'
import {
  ENTITY_REPORTS, PERIODS, PERIOD_REPORTS, PROFIT_REPORTS, QUARTER_PERIODS, REPORTS, buildReport, cellText, isPeriod, isReportKey, periodRange, reportSheet, scopeReportInput,
  type PeriodKey, type ReportKey, type ReportRow, type ReportTable,
} from '@/lib/finance/reports'
import type { BooksData } from '@/lib/finance/books'
import { marginCell } from '@/lib/finance/profit'
import { money2 } from '@/lib/quotes/math'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import b from './books.module.css'

/**
 * (gaps build F2 — F2-Q12, Q-35; 1.0 G-491) Finance › Reports, for Owners and Admins: a report and a period — Profit and loss · Owed to you · You
 * owe · Profitability · Cash flow · Vendor spend · Commissions · Client statement — each a few tiles and its tables, exported through the house
 * Export (CSV · XLS · XLSX · PDF). One set of numbers: every report is `buildReport` over the server's `moneyOf` · `costsOf` · `commissionsOf`.
 * The choice rides the address (`?report=` · `?period=` · `?project=`), so a report can be opened from anywhere.
 * (simplify S-13, her "build everything" 2026-10-09 — F1 §6.7) The Period is a select beside Export (15 controls above the first figure → 10);
 * on a phone the report is a select too, so the first number shows on the first screen. The last report is remembered for this browser (the
 * address wins). A row's tone colours its one meaning-carrying figure — never every money cell on a healthy row, never S$0.00.
 */
const TONE_CLASS: Record<NonNullable<ReportRow['tone']>, string> = { green: b.toneGreen!, yellow: b.toneYellow!, red: b.toneRed! }
/** (simplify S-13) A tone sits on the row's `toneKey` cell only, and never on a zero. */
const toned = (r: ReportRow, key: string) => !!r.tone && r.toneKey === key && r.cells[key] !== 0 && r.cells[key] !== null && r.cells[key] !== undefined

function ReportTableView({ t, reportKey }: { t: ReportTable; reportKey: string }) {
  const defs = useMemo<TableColumnDef[]>(() => t.columns.map((c, k) => ({ key: c.key, label: c.label, track: c.track ?? 'minmax(140px, 1fr)', locked: k === 0 })), [t.columns])
  const rows = useMemo(() => [...t.rows, ...(t.total ? [t.total] : [])], [t.rows, t.total])
  const cell = (r: ReportRow, key: string): ReactNode => {
    const col = t.columns.find((c) => c.key === key)
    const text = cellText(r.cells[key] ?? null, col?.kind)
    const cls = [col?.kind === 'money' || col?.kind === 'count' || col?.kind === 'pct' || col?.kind === 'date' ? b.num : '', r.strong ? b.strong : '', toned(r, key) ? TONE_CLASS[r.tone!] : ''].filter(Boolean).join(' ')
    if (key === t.columns[0]?.key && r.href) return <Link href={r.href} className={b.nameLink}>{text}</Link>
    return <span className={cls || undefined}>{text || '--'}</span>
  }
  return <CreditsTable table={`books-report-${reportKey}-${t.key}`} title={t.title} help={t.help} testId={`report-table-${t.key}`} defs={defs} rows={rows} rowKey={(r) => r.id} cell={cell} empty={t.empty} />
}

export function ReportsView({ books, report, period, project, entity }: { books: BooksData; report: string | null; period: string | null; project: string | null
  /** (parity map, FB-105) `?entity=` — the Issued by scope the address asks for */ entity?: string | null }) {
  const snackbar = useSnackbar()
  const phone = useSheetLayout()
  /* (pending modules S41b-1 — 1.0: "project-pl, studio-pl, margin-alerts, project-profitability → COST_HIDDEN") a role the Owner keeps from
     profit and margin reads every report but Profit and loss and Profitability — the server sent no profit to draw them from */
  const profits = books.profits !== false
  const reports = profits ? REPORTS : REPORTS.filter((x) => !PROFIT_REPORTS.includes(x.key))
  const open = (k: string | null): k is ReportKey => isReportKey(k) && reports.some((x) => x.key === k)
  const [key, setKey] = useState<ReportKey>(open(report) ? report : reports[0]!.key)
  const expLocked = usePlanLock('expense_management').locked   // (pending modules S19) the expense report is Pro
  /* (simplify S-13) the report on screen is the one this browser remembers next time */
  useEffect(() => { rememberReport(FINANCE_REPORT_COOKIE, key) }, [key])
  /* (parity map, FB-065) GST is read by the quarter: opened on GST with no period asked for, it reads This quarter */
  const [per, setPer] = useState<PeriodKey>(isPeriod(period) ? period : key === 'gst' ? 'this_quarter' : 'this_year')
  /* (parity map, FB-105 — 1.0's entity picker) one Issued by scope on every report but the statement — only with two or more entities */
  const options = useMemo(() => entityOptions(books.entities), [books.entities])
  const [entityKey, setEntityKey] = useState<string | null>(() => entityOf(options, entity ?? null)?.key ?? null)
  const scope = entityOf(options, entityKey)
  const [entityOpen, setEntityOpen] = useState(false)
  const entityAnchor = useRef<HTMLButtonElement | null>(null)
  const choices = books.projects.map((p) => ({ id: p.id, label: `${p.number} · ${p.name}` }))
  const [projectId, setProjectId] = useState<string | null>(project && choices.some((c) => c.id === project) ? project : choices[0]?.id ?? null)
  const [exporting, setExporting] = useState(false)
  const all = useMemo(() => ({ projects: books.projects, overhead: books.overhead, vendors: books.vendors, people: books.people, commission: books.commission, now: books.now, entities: options }), [books, options])
  const scoped = ENTITY_REPORTS.includes(key) && !!scope
  const input = useMemo(() => (scoped ? scopeReportInput(all, scope) : all), [all, scoped, scope])
  const r = useMemo(() => buildReport(key, input, per, { projectId }), [key, input, per, projectId])
  const usesPeriod = PERIOD_REPORTS.includes(key)
  const remember = (k: ReportKey, p: PeriodKey, pid: string | null, ek: string | null = entityKey) => {
    try {
      const u = new URL(window.location.href)
      u.searchParams.set('report', k); u.searchParams.set('period', p)
      if (k === 'statement' && pid) u.searchParams.set('project', pid); else u.searchParams.delete('project')
      if (ek) u.searchParams.set(ENTITY_PARAM, ek); else u.searchParams.delete(ENTITY_PARAM)
      window.history.replaceState(null, '', u.toString())
    } catch { /* the address is a convenience */ }
  }
  const pickReport = (v: string) => {
    if (!open(v)) return
    setKey(v)
    /* (parity map, FB-065) picking GST on a period that is not a quarter lands on This quarter — the period a return is read for */
    const p = v === 'gst' && !QUARTER_PERIODS.includes(per) ? 'this_quarter' : per
    if (p !== per) setPer(p)
    remember(v, p, projectId)
  }
  const pickPeriod = (v: string) => { if (!isPeriod(v)) return; setPer(v); remember(key, v, projectId) }
  const pickProject = (label: string) => { const c = choices.find((x) => x.label === label); if (!c) return; setProjectId(c.id); remember(key, per, c.id) }
  const pickEntity = (k: string) => { const next = k === 'all' ? null : k; setEntityKey(next); setEntityOpen(false); remember(key, per, projectId, next) }
  /* (parity P-33 · Q-02, C-08) Maison AI on Finance's reports — it registered none, the sheet held only Keyboard shortcuts and Reset. Two answers
     from the same `buildReport` the page draws (one set of numbers) and one that opens a report; nothing metered (Q-30). Invented copy. */
  const answers = useMemo(() => {
    const owed = buildReport('ar', input, per)
    const invoices = owed.tables.find((t) => t.key === 'invoices')?.rows ?? []
    const late = invoices.filter((r) => r.cells.late && r.cells.late !== 'Current').reduce((x, r) => x + (Number(r.cells.amount) || 0), 0)
    const thin = books.projects.filter((p) => p.money.contractMinor > 0 && p.profit.tier).sort((x, y) => x.profit.marginPct - y.profit.marginPct).slice(0, 5)
    return {
      owed: {
        title: invoices.length ? `${invoices.length} invoice${invoices.length === 1 ? '' : 's'} not paid in full` : 'Nothing is owed',
        /* (parity map, FB-004) the tiles are Owed to you · You owe · Net now — what is overdue is read from the invoices themselves */
        text: invoices.length ? `${owed.tiles[0]?.value ?? ''} owed · ${late ? `${money2(late)} of it overdue` : 'nothing overdue'}.` : undefined,
        rows: invoices.map((r) => ({ id: r.id, label: `${cellText(r.cells.project ?? null)} · ${cellText(r.cells.invoice ?? null)}`, meta: `${cellText(r.cells.amount ?? null, 'money')} still owed${r.cells.late && r.cells.late !== 'Current' ? ` · ${String(r.cells.late)} late` : ''}`, href: r.href })),
      },
      thin: {
        title: thin.length ? 'The thinnest margins' : 'No margin to compare yet',
        text: thin.length ? 'Contract value less committed costs, by project.' : 'A margin is read once a project has a contract value and its costs.',
        rows: thin.map((p) => ({ id: p.id, label: `${p.name} · ${p.number}`, meta: `${marginCell(p.profit).text} · ${money2(p.profit.profitMinor)} profit`, href: `/projects/${p.id}/money` })),
      },
    }
  }, [input, per, books.projects])
  const ai: MaisonSuggestion[] = [
    { label: 'Who owes the studio money?', answer: answers.owed },
    ...(profits ? [{ label: 'Which projects have the thinnest margin?', answer: answers.thin }] : []),   // (pending modules S41b-1)
    { label: 'Open the cash flow', run: () => pickReport('cashflow') },
  ]
  useMaisonAi(ai)
  const download = (format: ExportFormat) => {
    const sheet = reportSheet(r)
    const range = `${usesPeriod ? ` — ${periodRange(per, books.now).label}` : ''}${scoped && scope ? ` — ${ENTITY_SCOPE_WORD} ${scope.label}` : ''}`
    const name = `${r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${format.toLowerCase()}`
    return downloadBlob(buildTable(`${books.studio} — ${r.title}${range}`, sheet.head, sheet.body, format), name)
  }
  return (
    <>
      <div className={b.block}>
        {phone
          ? <span className={b.search} data-testid="report-chips"><TextField label="Report" mode="select" options={reports.map((x) => x.label)} value={reports.find((x) => x.key === key)?.label ?? ''} onChange={(label) => pickReport(reports.find((x) => x.label === label)?.key ?? key)} /></span>
          : <Chips label="Report" options={reports.map((x) => ({ value: x.key, label: x.label }))} value={key} onChange={pickReport} testId="report-chips" />}
        <div className={b.toolbar}>
          {usesPeriod ? <span className={b.search} data-testid="report-period"><TextField label="Period" mode="select" options={PERIODS.map((x) => x.label)} value={PERIODS.find((x) => x.value === per)?.label ?? ''} onChange={(label) => pickPeriod(PERIODS.find((x) => x.label === label)?.value ?? per)} /></span> : null}
          {key === 'statement' ? (
            <span className={b.search}><TextField label="Project" mode="select" options={choices.map((c) => c.label)} value={choices.find((c) => c.id === projectId)?.label ?? ''} onChange={pickProject} searchable /></span>
          ) : null}
          {options.length >= 2 && ENTITY_REPORTS.includes(key) ? (
            <span data-testid="report-entity">
              <ScopePill ref={entityAnchor} label={entityPillLabel(scope)} short={scope ? scope.label : 'All'} scoped={!!scope} open={entityOpen} onClick={() => setEntityOpen((o) => !o)} />
              <PortalMenu open={entityOpen} anchor={entityAnchor} onClose={() => setEntityOpen(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle={ENTITY_SCOPE_WORD}>
                {entityMenu(options).map((o) => (
                  <DropdownItem key={o.key} role="menuitemradio" checked={o.key === 'all' ? !scope : scope?.key === o.key} onSelect={() => pickEntity(o.key)} meta={o.meta}>{o.label}</DropdownItem>
                ))}
              </PortalMenu>
            </span>
          ) : null}
          <span className={b.toolEnd}><Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => { if (key === 'expenses' && expLocked) { openPlanLock('expense_management'); return } setExporting(true) }} data-testid="report-export">Export</Button></span>
        </div>
      </div>
      <div className={b.head} data-testid="report-head">
        <h2 className={b.headTitle}>{r.title}{usesPeriod ? ` · ${periodRange(per, books.now).label}` : ''}{scoped && scope ? ` · ${scope.label}` : ''}</h2>
        <p className={b.headHelp}>{r.help}.</p>
      </div>
      {/* (pending modules S19 — 1.0's plan gating: "the expense report" locked for Free; every other report keeps counting the expenses) */}
      {key === 'expenses' && expLocked ? <ProLocked feature="expense_management" kept="Your expenses are kept and still count in Profit and loss, Cash flow, GST and Vendor spend" testId="report-expenses-locked" /> : <>
      {r.tiles.length ? (
        <div className={r.tiles.length === 3 ? b.tiles3 : b.tiles} data-testid="report-tiles">
          {r.tiles.map((t) => <StatTile key={t.label} label={t.label} value={t.value} help={t.help} grade={t.grade} />)}
        </div>
      ) : null}
      {r.tables.map((t) => <ReportTableView key={`${key}-${t.key}`} t={t} reportKey={key} />)}
      </>}
      <ExportDialog open={exporting} title={`Export ${r.title}`} onClose={() => setExporting(false)} download={(format) => download(format)}
                    onDone={(name, format) => snackbar({ message: `Exported ${r.title} as ${format} · ${name}` })} />
    </>
  )
}
