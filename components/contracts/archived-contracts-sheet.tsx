'use client'

import { useEffect, useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { useSnackbar } from '@/components/om/snackbar'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { displayDate } from '@/lib/format'
import type { ArchivedContractRow } from '@/app/leads/contracts-actions'
import styles from '@/components/contracts/deleted-contracts-sheet.module.css'

/**
 * (sweep S2 · U-07) Archived Contracts — Archived Quotes' twin (components/leads/quotes/archived-quotes-sheet.tsx) on the Deleted sheets'
 * stylesheet: Contract · Lead (Tools › Contracts) · Status · Archived · Actions, Unarchive per row and for a selection. Loads when opened.
 * (REG-727) The Deleted trio's shape (REG-513): no Close foot, height to content with a 480 floor; the table on the table core (the
 * listing's head, rows and cells).
 */
export function ArchivedContractsSheet({ open, onClose, load, crumb, showLead, onUnarchive }: {
  open: boolean; onClose: () => void
  load: () => Promise<ArchivedContractRow[]>
  crumb: string
  showLead?: boolean
  onUnarchive: (ids: string[]) => Promise<unknown>
}) {
  const snackbar = useSnackbar()
  const [rows, setRows] = useState<ArchivedContractRow[] | null>(null)
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
    try { await onUnarchive(ids) } catch { snackbar({ message: `Couldn’t unarchive ${ids.length > 1 ? 'the contracts' : 'the contract'} — please try again` }) }
    finally { try { setRows(await load()) } catch { setFailed(true) } setBusy(false) }
  }
  const all = rows ?? []
  const live = all.filter((r) => selected.has(r.id))
  const allOn = all.length > 0 && all.every((r) => selected.has(r.id))
  const toggle = (id: string) => setSelected((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <Dialog open={open} onClose={onClose} title="Archived Contracts" eyebrow={crumb} size="modal" width={1200} minHeight={480} phoneFull portal>
      <span className={`${styles.note} ${styles.noteMove}`}>Archived contracts leave the contract lists and keep everything they hold — a signed one keeps its signed copy. Unarchive puts one back on its lead.</span>
      <div className={styles.table} role="table" aria-label="Archived contracts" data-testid="archived-contracts" data-lead={showLead || undefined} data-select="" data-kind="archived" data-card="">
        <div className={styles.head} role="row">
          <span role="columnheader" className={`${styles.hCell} ${styles.sel}`}><Checkbox isSelected={allOn} isIndeterminate={!allOn && live.length > 0} isDisabled={!all.length} onChange={() => setSelected(allOn ? new Set() : new Set(all.map((r) => r.id)))} aria-label="Select all archived contracts" /></span>
          <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Contract</span></span>
          {showLead ? <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Lead</span></span> : null}
          <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Status</span></span>
          <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Archived</span></span>
          <span role="columnheader" className={`${styles.hCell} ${styles.actions}`}><span className={styles.hLabel}>Actions</span></span>
        </div>
        {rows === null ? <div className={styles.empty}>Loading…</div>
          : failed ? <div className={styles.empty} role="status">Couldn’t load the archived contracts — <button type="button" className={styles.retry} onClick={() => { setRows(null); setTick((t) => t + 1) }}>try again</button></div>
          : rows.length === 0 ? <div className={styles.empty} role="status">No archived contracts.</div> : rows.map((q) => (
            <div key={q.id} className={styles.row} role="row" data-testid="archived-contract" data-selected={selected.has(q.id) || undefined}>
              <span role="cell" className={`${styles.cell} ${styles.sel}`}><Checkbox isSelected={selected.has(q.id)} onChange={() => toggle(q.id)} aria-label={`Select ${q.title}`} /></span>
              <span role="cell" className={`${styles.cell} ${styles.title}`}><Icon name="contract" size={20} weight={300} />{q.title}</span>
              {/* (Contracts on the move, C4 — A-14) on a phone the facts read as one labelled line under the title; the desk keeps its columns */}
              {showLead ? <span role="cell" className={styles.cell} data-fact="Lead">{q.leadName}</span> : null}
              <span role="cell" className={styles.cell} data-fact="Status">{q.status}</span>
              <span role="cell" className={styles.cell} data-fact="Archived">{displayDate(new Date(q.archivedAt))}</span>
              <span role="cell" className={`${styles.cell} ${styles.actions}`}>
                <Tooltip label={`Put it back on ${q.leadName}`}>
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
