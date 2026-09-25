'use client'

import { useEffect, useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { useSnackbar } from '@/components/om/snackbar'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import type { ArchivedQuoteRow } from '@/app/leads/quotes-actions'
import styles from '@/components/contracts/deleted-contracts-sheet.module.css'

/**
 * (sweep S1 · U-07) Archived Quotes — Deleted Quotes' twin on the Deleted sheets' stylesheet (REG-511): Quote · Lead (Tools › Quotes) ·
 * Status · Archived · Actions, Unarchive per row and for a selection. Archiving took a quote off every list with no way back once the
 * snackbar had gone; this is the way back. Loads when opened.
 */
export function ArchivedQuotesSheet({ open, onClose, load, crumb, showLead, onUnarchive }: {
  open: boolean; onClose: () => void
  load: () => Promise<ArchivedQuoteRow[]>
  crumb: string
  showLead?: boolean
  onUnarchive: (ids: string[]) => Promise<unknown>
}) {
  const snackbar = useSnackbar()
  const [rows, setRows] = useState<ArchivedQuoteRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [tick, setTick] = useState(0)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setRows(null); setFailed(false); setSelected(new Set()) } }
  useEffect(() => {
    if (!open) return
    let live = true
    void load().then((r) => { if (live) { setRows(r); setFailed(false) } }, () => { if (live) { setRows([]); setFailed(true) } })
    return () => { live = false }
  }, [open, load, tick])
  const unarchive = async (ids: string[]) => {
    if (busy || !ids.length) return
    setBusy(true); setSelected(new Set())
    try { await onUnarchive(ids) } catch { snackbar({ message: `Couldn’t unarchive ${ids.length > 1 ? 'the quotes' : 'the quote'} — please try again` }) }
    finally { try { setRows(await load()) } catch { setFailed(true) } setBusy(false) }
  }
  const all = rows ?? []
  const live = all.filter((r) => selected.has(r.id))
  const allOn = all.length > 0 && all.every((r) => selected.has(r.id))
  const toggle = (id: string) => setSelected((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <Dialog open={open} onClose={onClose} title="Archived Quotes" eyebrow={crumb} size="modal" width={1200} height={640} portal
            footer={<Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button>}>
      <div className={styles.head}>
        <span className={styles.note}>Archived quotes leave the quote lists and keep everything they hold. Unarchive puts one back on its lead.</span>
      </div>
      <div className={styles.table} role="table" aria-label="Archived quotes" data-testid="archived-quotes" data-lead={showLead || undefined} data-select="" data-kind="archived">
        <div className={styles.row} role="row" data-head="">
          <span role="columnheader" className={`${styles.cell} ${styles.sel}`}><Checkbox isSelected={allOn} isIndeterminate={!allOn && live.length > 0} isDisabled={!all.length} onChange={() => setSelected(allOn ? new Set() : new Set(all.map((r) => r.id)))} aria-label="Select all archived quotes" /></span>
          <span role="columnheader" className={styles.cell}>Quote</span>
          {showLead ? <span role="columnheader" className={styles.cell}>Lead</span> : null}
          <span role="columnheader" className={styles.cell}>Status</span>
          <span role="columnheader" className={styles.cell}>Archived</span>
          <span role="columnheader" className={`${styles.cell} ${styles.actions}`}>Actions</span>
        </div>
        {rows === null ? <div className={styles.empty}>Loading…</div>
          : failed ? <div className={styles.empty} role="status">Couldn’t load the archived quotes — <button type="button" className={styles.retry} onClick={() => { setRows(null); setTick((t) => t + 1) }}>try again</button></div>
          : rows.length === 0 ? <div className={styles.empty} role="status">No archived quotes.</div> : rows.map((q) => (
            <div key={q.id} className={styles.row} role="row" data-testid="archived-quote" data-selected={selected.has(q.id) || undefined}>
              <span role="cell" className={`${styles.cell} ${styles.sel}`}><Checkbox isSelected={selected.has(q.id)} onChange={() => toggle(q.id)} aria-label={`Select ${q.number}`} /></span>
              <span role="cell" className={`${styles.cell} ${styles.title}`}><Icon name="request_quote" size={20} weight={300} />{q.number} · {q.title}<span className={styles.amount}>{money2(q.amountMinor)}</span></span>
              {showLead ? <span role="cell" className={styles.cell}>{q.leadName}</span> : null}
              <span role="cell" className={styles.cell}>{q.status}</span>
              <span role="cell" className={styles.cell}>{displayDate(new Date(q.archivedAt))}</span>
              <span role="cell" className={`${styles.cell} ${styles.actions}`}>
                <Tooltip label={`Put ${q.number} back on ${q.leadName}`}>
                  <span><Button variant="secondary" appearance="outlined" isDisabled={busy} onPress={() => { void unarchive([q.id]) }}>Unarchive</Button></span>
                </Tooltip>
              </span>
            </div>
          ))}
      </div>
      <DetailBulkBar inset count={live.length} actions={[{ label: 'Unarchive', onClick: () => { void unarchive(live.map((r) => r.id)) } }]} onClear={() => setSelected(new Set())} />
    </Dialog>
  )
}
