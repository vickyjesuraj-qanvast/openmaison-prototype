'use client'

import { useMemo, useState } from 'react'
import { Button, Radio, RadioGroup } from '@/components/ds'
import { TextField } from '@/components/om/text-field'
import { DateField } from '@/components/om/date-field'
import { Dialog } from '@/components/leads/move-stage/dialogs'
import { EXPORT_FORMATS, LISTING_EXPORT, downloadLeads, type ExportFormat } from '@/lib/leads/export'
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
 */
type Period = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom'
const PERIODS: { key: Period; label: string }[] = [
  { key: 'all', label: 'All time' }, { key: 'today', label: 'Today' }, { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' }, { key: 'month', label: 'This month' }, { key: 'custom', label: 'Custom' },
]
const COLUMN_SETS = ['Everything', 'As the list shows'] as const

export function ExportDialog({ open, rows = [], all, shown, listingColumns, now, onClose, onDone, title = 'Export Leads', download }: {
  open: boolean; rows?: LeadRow[]; onClose: () => void; onDone: (fileName: string, format: ExportFormat, count?: number) => void
  /** The statement's two sets — every lead, and what the list shows — plus the listing's visible column keys, in order. */
  all?: LeadRow[]; shown?: LeadRow[]; listingColumns?: string[]
  /** The leads export's date stamp; a caller with its own `download` (Tasks, the quote editor's Items) needs none. */
  now?: number
  title?: string
  /** Custom downloader (returns the file name); defaults to the leads export. */
  download?: (format: ExportFormat) => string
}) {
  const [format, setFormat] = useState<ExportFormat>('CSV')
  const [scope, setScope] = useState<'all' | 'shown'>('all')
  const [period, setPeriod] = useState<Period>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [columnSet, setColumnSet] = useState<string>(COLUMN_SETS[0])
  const [mountedAt] = useState(() => Date.now())
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {   // every opening starts from the statement's defaults
    setWasOpen(open)
    if (open) { setScope('all'); setPeriod('all'); setFrom(''); setTo(''); setColumnSet(COLUMN_SETS[0]) }
  }
  const statement = !!all && !!shown
  const clock = now ?? mountedAt
  const today = useMemo(() => new Date(clock), [clock])
  const fromDate = parseDMY(from), toDate = parseDMY(to)
  const rangeBad = period === 'custom' && !!fromDate && !!toDate && fromDate.getTime() > toDate.getTime()
  const picked = useMemo(() => {
    if (!statement) return rows
    let out = scope === 'all' ? all! : shown!
    if (period !== 'all') {
      const day = 86_400_000, t0 = startOfDay(new Date(clock))
      let lo: number | null = null, hi: number | null = null
      if (period === 'today') { lo = t0; hi = t0 + day }
      else if (period === '7d') { lo = t0 - 6 * day; hi = t0 + day }
      else if (period === '30d') { lo = t0 - 29 * day; hi = t0 + day }
      else if (period === 'month') { const d = new Date(clock); lo = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); hi = t0 + day }
      else { const a = parseDMY(from), b = parseDMY(to); lo = a ? a.getTime() : null; hi = b ? b.getTime() + day : null }
      out = out.filter((r) => { const t = r.createdAt.getTime(); return (lo === null || t >= lo) && (hi === null || t < hi) })
    }
    return out
  }, [statement, rows, scope, all, shown, period, from, to, clock])
  const keys = columnSet === 'As the list shows' && listingColumns ? listingColumns.flatMap((k) => LISTING_EXPORT[k] ?? []) : null
  const exportNow = () => {
    if (rangeBad || (statement && picked.length === 0)) return
    const name = download ? download(format) : downloadLeads(picked, format, new Date(clock), keys)
    onDone(name, format, picked.length)
    onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title={title} width={400} size="form"
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                     <Button onPress={exportNow} isDisabled={rangeBad || (statement && picked.length === 0)}>Export</Button></>}>
      {statement ? (
        <>
          <div className={styles.group} data-testid="export-scope">
            <span className={styles.label}>Which leads</span>
            <RadioGroup aria-label="Which leads" value={scope} onChange={(v) => setScope(v as 'all' | 'shown')}>
              <div className={styles.row}><Radio value="all">All leads ({all!.length})</Radio></div>
              <div className={styles.row}><Radio value="shown">What the list shows ({shown!.length})</Radio></div>
            </RadioGroup>
          </div>
          <TextField label="Created" mode="select" value={PERIODS.find((p) => p.key === period)!.label} options={PERIODS.map((p) => p.label)}
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
      <TextField label="Choose file format" value={format} mode="select" options={EXPORT_FORMATS} onChange={(v) => setFormat(v as ExportFormat)} />
      {statement ? (
        <span className={styles.helper} data-testid="export-summary">
          {picked.length === 0 ? 'No leads in this range.' : `${picked.length} lead${picked.length === 1 ? '' : 's'} · ${keys ? `${keys.length} columns, as the list shows` : 'every column'} · ${format}`}
        </span>
      ) : null}
    </Dialog>
  )
}
