'use client'

import { useMemo, useState } from 'react'
import { Button, Checkbox, Radio, RadioGroup } from '@/components/ds'
import { TextField } from '@/components/om/text-field'
import { DateField } from '@/components/om/date-field'
import { Dialog } from '@/components/leads/move-stage/dialogs'
import { EXPORT_FORMATS, LEAD_STATEMENT, downloadLeads, downloadStatement, listingKeys, type ExportFormat, type StatementSpec } from '@/lib/leads/export'
import { parseDMY } from '@/lib/leads/filters'
import { startOfDay } from '@/lib/format'
import type { LeadRow } from '@/lib/leads/queries'
import styles from './export-dialog.module.css'

/**
 * "Export all as…" — the one-field s-modal from 784:113420 / 902:29293 (Export Tasks). Leads by default; a tab passes its own
 * `title` and `download` (Export Tasks). Field label "Choose file format" as the mock types it.
 *
 * (REG-610, parity L-32 · the owner's J-6 "like a bank statement") Given `all` + `shown`, the leads export grows the statement's
 * few fields: which leads (all · what the list shows), the created period (the Filters modal's presets, or a From / To), the
 * columns (everything · as the list shows) and the format — with the count it will write. 1.0 exported the filtered set with
 * 23 columns; the full set lives in lib/leads/export.ts.
 *
 * (parity P-25, B-15 · B-16) The statement is any listing's: `statement` names the rows' noun, the date the period reads ("Created" for
 * leads, "Start date" for projects), every column and how the listing's visible columns map onto them (lib/leads/export.ts
 * `StatementSpec`; leads by default). `selected` — a bulk bar's selection — adds "Selected leads (n)" / "Selected projects (n)" to the
 * sets and opens on it.
 */
type Period = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom'
const PERIODS: { key: Period; label: string }[] = [
  { key: 'all', label: 'All time' }, { key: 'today', label: 'Today' }, { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' }, { key: 'month', label: 'This month' }, { key: 'custom', label: 'Custom' },
]
const COLUMN_SETS = ['Everything', 'As the list shows'] as const

export function ExportDialog<R = LeadRow>({ open, rows = [], all, shown, selected, listingColumns, statement: statementSpec, now, onClose, onDone, title = 'Export Leads', download, scope: counts, option }: {
  open: boolean; rows?: LeadRow[]; onClose: () => void; onDone: (fileName: string, format: ExportFormat, count?: number) => void
  /** The statement's two sets — every row, and what the list shows — plus the listing's visible column keys, in order. */
  all?: R[]; shown?: R[]; listingColumns?: string[]
  /** (parity P-25) A third set, the bulk bar's selection — "Selected leads (n)"; the dialog opens on it. */
  selected?: R[]
  /** (parity P-25) The listing's statement (lib/leads/export.ts); the leads' when absent. */
  statement?: StatementSpec<R>
  /** The leads export's date stamp; a caller with its own `download` (Tasks, the quote editor's Items) needs none. */
  now?: number
  title?: string
  /** Custom downloader (returns the file name); defaults to the leads export. (REG-653) With `scope`, it is told which set. */
  download?: (format: ExportFormat, scope: 'all' | 'shown') => string
  /** (REG-653, price book parity Q-14) Another list's two sets — every entry and what the list shows — for a caller with its own `download`. */
  scope?: { all: number; shown: number; noun: string }
  /** (Dane UAT 3.11) One tick under the sets, the caller's to read in its `download` (My Items: "Include proposed items"). */
  option?: { label: string; checked: boolean; onChange: (on: boolean) => void }
}) {
  const spec = (statementSpec ?? LEAD_STATEMENT) as StatementSpec<R>   // a caller with no statement of its own lists leads
  const [format, setFormat] = useState<ExportFormat>('CSV')
  const [scope, setScope] = useState<'all' | 'shown' | 'selected'>('all')
  const [period, setPeriod] = useState<Period>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [columnSet, setColumnSet] = useState<string>(COLUMN_SETS[0])
  const [mountedAt] = useState(() => Date.now())
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {   // every opening starts from the statement's defaults
    setWasOpen(open)
    if (open) { setScope(selected ? 'selected' : 'all'); setPeriod('all'); setFrom(''); setTo(''); setColumnSet(COLUMN_SETS[0]) }
  }
  const statement = !!all && !!shown
  const clock = now ?? mountedAt
  const today = useMemo(() => new Date(clock), [clock])
  const fromDate = parseDMY(from), toDate = parseDMY(to)
  const rangeBad = period === 'custom' && !!fromDate && !!toDate && fromDate.getTime() > toDate.getTime()
  const picked = useMemo((): (R | LeadRow)[] => {
    if (!statement) return rows
    let out = scope === 'selected' && selected ? selected : scope === 'shown' ? shown! : all!
    if (period !== 'all') {
      const day = 86_400_000, t0 = startOfDay(new Date(clock))
      let lo: number | null = null, hi: number | null = null
      if (period === 'today') { lo = t0; hi = t0 + day }
      else if (period === '7d') { lo = t0 - 6 * day; hi = t0 + day }
      else if (period === '30d') { lo = t0 - 29 * day; hi = t0 + day }
      else if (period === 'month') { const d = new Date(clock); lo = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); hi = t0 + day }
      else { const a = parseDMY(from), b = parseDMY(to); lo = a ? a.getTime() : null; hi = b ? b.getTime() + day : null }
      /* (parity P-25) the statement's own date — a lead's Created, a project's Start date; a row without one is in no period */
      out = out.filter((r) => { const d = spec.dateOf(r); if (!d) return false; const t = d.getTime(); return (lo === null || t >= lo) && (hi === null || t < hi) })
    }
    return out
  }, [statement, rows, scope, all, shown, selected, period, from, to, clock, spec])
  const keys = columnSet === 'As the list shows' && listingColumns ? listingKeys(spec, listingColumns) : null
  const exportNow = () => {
    if (rangeBad || (statement && picked.length === 0) || (counts && (scope === 'all' ? counts.all : counts.shown) === 0)) return
    const name = download ? download(format, scope === 'selected' ? 'shown' : scope)
      : statement ? downloadStatement(spec, picked as R[], format, new Date(clock), keys) : downloadLeads(picked as LeadRow[], format, new Date(clock), keys)
    onDone(name, format, counts ? (scope === 'all' ? counts.all : counts.shown) : picked.length)
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title={title} width={400} size="form"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                     <Button onPress={exportNow} isDisabled={rangeBad || (statement && picked.length === 0) || (!!counts && (scope === 'all' ? counts.all : counts.shown) === 0)}>Export</Button></>}>
      {statement ? (
        <>
          <div className={styles.group} data-testid="export-scope">
            <span className={styles.label}>Which {spec.many}</span>
            <RadioGroup aria-label={`Which ${spec.many}`} value={scope} onChange={(v) => setScope(v as 'all' | 'shown' | 'selected')}>
              <div className={styles.row}><Radio value="all">All {spec.many} ({all!.length})</Radio></div>
              <div className={styles.row}><Radio value="shown">What the list shows ({shown!.length})</Radio></div>
              {selected ? <div className={styles.row}><Radio value="selected">Selected {spec.many} ({selected.length})</Radio></div> : null}
            </RadioGroup>
          </div>
          <TextField label={spec.dateLabel} mode="select" value={PERIODS.find((p) => p.key === period)!.label} options={PERIODS.map((p) => p.label)}
                     onChange={(v) => setPeriod(PERIODS.find((p) => p.label === v)?.key ?? 'all')} />
          {period === 'custom' ? (
            <div className={styles.dates}>
              <DateField label="From date" value={from} today={today} onChange={setFrom} error={rangeBad ? 'From date is after To date' : undefined} />
              <DateField label="To date" value={to} today={today} onChange={setTo} />
            </div>
          ) : null}
          <TextField label="Columns" mode="select" value={columnSet} options={COLUMN_SETS} onChange={setColumnSet} />
        </>
      ) : null}
      {counts ? (
        <div className={styles.group} data-testid="export-scope">
          <span className={styles.label}>Which {counts.noun}</span>
          <RadioGroup aria-label={`Which ${counts.noun}`} value={scope} onChange={(v) => setScope(v as 'all' | 'shown')}>
            <div className={styles.row}><Radio value="all">All {counts.noun} ({counts.all})</Radio></div>
            <div className={styles.row}><Radio value="shown" isDisabled={counts.shown === 0}>What the list shows ({counts.shown})</Radio></div>   {/* (sweep S5 #26) nothing shown, nothing to export — it made a header-only file */}
          </RadioGroup>
        </div>
      ) : null}
      {option ? <div className={styles.row} data-testid="export-option"><Checkbox isSelected={option.checked} onChange={(on: boolean) => option.onChange(on)}>{option.label}</Checkbox></div> : null}
      <TextField label="Choose file format" value={format} mode="select" options={EXPORT_FORMATS} onChange={(v) => setFormat(v as ExportFormat)} />
      {statement ? (
        <span className={styles.helper} data-testid="export-summary">
          {picked.length === 0 ? `No ${spec.many} in this range.` : `${picked.length} ${picked.length === 1 ? spec.one : spec.many} · ${keys ? `${keys.length} columns, as the list shows` : 'every column'} · ${format}`}
        </span>
      ) : null}
    </Dialog>
  )
}
