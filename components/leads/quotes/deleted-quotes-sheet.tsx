'use client'

import { useEffect, useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { useSnackbar } from '@/components/om/snackbar'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { DangerButton, Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import type { DeletedQuoteRow } from '@/app/leads/quotes-actions'
import styles from '@/components/contracts/deleted-contracts-sheet.module.css'

/**
 * (REG-625, quote editor parity Q-27 · Q-28) Deleted Quotes — Deleted Contracts' twin on its stylesheet (the Deleted sheets' shell, REG-511):
 * Quote · Lead (Tools › Quotes) · Status · Deleted · Actions, Restore and Delete Forever per row, Empty Trash. A quote someone else created
 * waits for its creator, an Owner or an Admin; a quote a live contract reads stays until the contract goes. Loads when opened.
 * (REG-727) The Deleted trio's shape (REG-513): Empty Trash in the head, no Close foot, height to content with a 480 floor; the table on
 * the table core (the listing's head, rows and cells).
 */
export function DeletedQuotesSheet({ open, onClose, load, crumb, showLead, onRestore, onDeleteForever, onEmptyTrash }: {
  open: boolean; onClose: () => void
  load: () => Promise<DeletedQuoteRow[]>
  crumb: string
  showLead?: boolean
  onRestore: (ids: string[]) => Promise<unknown>
  onDeleteForever: (ids: string[]) => Promise<unknown>
  onEmptyTrash: () => Promise<unknown>
}) {
  const snackbar = useSnackbar()
  const [rows, setRows] = useState<DeletedQuoteRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [tick, setTick] = useState(0)
  const [confirm, setConfirm] = useState<{ kind: 'forever'; ids: string[] } | { kind: 'empty' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setRows(null); setFailed(false); setConfirm(null); setSelected(new Set()) } }
  useEffect(() => {
    if (!open) return
    let live = true
    void load().then((r) => { if (live) { setRows(r); setFailed(false) } }, () => { if (live) { setRows([]); setFailed(true) } })
    return () => { live = false }
  }, [open, load, tick])
  /* (sweep S1) a failed restore or delete says so — it never passes in silence — and the list is read again either way */
  const run = async (what: string, fn: () => Promise<unknown>) => {
    if (busy) return
    setBusy(true)
    try { await fn() } catch { snackbar({ message: `Couldn’t ${what} — please try again` }) }
    finally { try { setRows(await load()) } catch { setFailed(true) } setBusy(false) }
  }
  const emptiable = (rows ?? []).filter((r) => r.mine && !r.heldBy).length
  /* (sweep S1 · U-08) the libraries' Deleted sheet: a selection column and the bulk bar — what may be restored, and what may go for good */
  const live = (rows ?? []).filter((r) => selected.has(r.id))
  const restorable = live.filter((r) => r.mine).map((r) => r.id)
  const purgeable = live.filter((r) => r.mine && !r.heldBy).map((r) => r.id)
  const pickable = (rows ?? []).filter((r) => r.mine)
  const allOn = pickable.length > 0 && pickable.every((r) => selected.has(r.id))
  const toggle = (id: string) => setSelected((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <>
      {/* (REG-727) The trio's head: the crumb as the eyebrow, Empty Trash the one action before the close; no foot. */}
      <Dialog open={open} onClose={onClose} title="Deleted Quotes" eyebrow={crumb} size="modal" width={1200} minHeight={480} phoneFull portal
              actions={<Button variant="secondary" appearance="outlined" onPress={() => setConfirm({ kind: 'empty' })} isDisabled={!emptiable || busy}>Empty Trash</Button>}>
        <span className={styles.note}>Deleted quotes stay here until they are deleted forever. Restore puts one back on its lead. Only its creator, an Owner or an Admin restores or deletes a quote.</span>
        <div className={styles.table} role="table" aria-label="Deleted quotes" data-testid="deleted-quotes" data-lead={showLead || undefined} data-select="">
          <div className={styles.head} role="row">
            <span role="columnheader" className={`${styles.hCell} ${styles.sel}`}><Checkbox isSelected={allOn} isIndeterminate={!allOn && live.length > 0} isDisabled={!pickable.length} onChange={() => setSelected(allOn ? new Set() : new Set(pickable.map((r) => r.id)))} aria-label="Select all deleted quotes" /></span>
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Quote</span></span>
            {showLead ? <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Lead</span></span> : null}
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Status</span></span>
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Deleted</span></span>
            <span role="columnheader" className={`${styles.hCell} ${styles.actions}`}><span className={styles.hLabel}>Actions</span></span>
          </div>
          {rows === null ? <div className={styles.empty}>Loading…</div>
            : failed ? <div className={styles.empty} role="status">Couldn’t load the deleted quotes — <button type="button" className={styles.retry} onClick={() => { setRows(null); setTick((t) => t + 1) }}>try again</button></div>
            : rows.length === 0 ? <div className={styles.empty} role="status">No deleted quotes.</div> : rows.map((q) => {
            const why = !q.mine ? 'Only its creator, an Owner or an Admin' : q.heldBy ? `The contract “${q.heldBy}” reads this quote` : null
            return (
              <div key={q.id} className={styles.row} role="row" data-testid="deleted-quote" data-selected={selected.has(q.id) || undefined}>
                <span role="cell" className={`${styles.cell} ${styles.sel}`}><Checkbox isSelected={selected.has(q.id)} isDisabled={!q.mine} onChange={() => toggle(q.id)} aria-label={`Select ${q.number}`} /></span>
                <span role="cell" className={`${styles.cell} ${styles.title}`}><Icon name="request_quote" size={20} weight={300} />{q.number} · {q.title}<span className={styles.amount}>{money2(q.amountMinor)}</span></span>
                {showLead ? <span role="cell" className={styles.cell}>{q.leadName}</span> : null}
                <span role="cell" className={styles.cell}>{q.status}</span>
                <span role="cell" className={styles.cell}>{displayDate(new Date(q.deletedAt))}</span>
                <span role="cell" className={`${styles.cell} ${styles.actions}`}>
                  <Tooltip label={q.mine ? `Put ${q.number} back on ${q.leadName}` : 'Only its creator, an Owner or an Admin'}>
                    <span><Button variant="secondary" appearance="outlined" isDisabled={busy || !q.mine} onPress={() => { void run('restore the quote', () => onRestore([q.id])) }}>Restore</Button></span>
                  </Tooltip>
                  <Tooltip label={why ?? 'Deletes the quote and its lines for good'}>
                    <span><DangerButton disabled={busy || !!why} onClick={() => setConfirm({ kind: 'forever', ids: [q.id] })}>Delete Forever</DangerButton></span>
                  </Tooltip>
                </span>
              </div>
            )
          })}
        </div>
        <DetailBulkBar inset count={live.length}
                       actions={[
                         { label: `Restore${restorable.length !== live.length ? ` ${restorable.length}` : ''}`, onClick: () => { const ids = restorable; setSelected(new Set()); if (ids.length) void run('restore the quotes', () => onRestore(ids)) } },
                         ...(purgeable.length ? [{ label: `Delete Forever${purgeable.length !== live.length ? ` ${purgeable.length}` : ''}`, tone: 'danger' as const, onClick: () => setConfirm({ kind: 'forever', ids: purgeable }) }] : []),
                       ]}
                       onClear={() => setSelected(new Set())} />
      </Dialog>
      <ConfirmDialog nested open={confirm?.kind === 'forever'} title="Delete forever?" message={confirm?.kind === 'forever' && confirm.ids.length > 1 ? `These ${confirm.ids.length} quotes, their lines, payment schedules and kept versions will be deleted permanently. This action cannot be undone.` : 'This quote, its lines, its payment schedule and its kept versions will be deleted permanently. This action cannot be undone.'} confirmLabel="Delete Forever"
                     onCancel={() => setConfirm(null)} onConfirm={() => { const c = confirm; setConfirm(null); if (c?.kind === 'forever') { setSelected(new Set()); void run(c.ids.length > 1 ? 'delete the quotes forever' : 'delete the quote forever', () => onDeleteForever(c.ids)) } }} />
      <ConfirmDialog nested open={confirm?.kind === 'empty'} title="Empty the trash?" message={`${emptiable} deleted ${emptiable === 1 ? 'quote' : 'quotes'} will be deleted permanently. Quotes someone else created, or that a contract reads, stay. This action cannot be undone.`} confirmLabel="Empty Trash"
                     onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); setSelected(new Set()); void run('empty the trash', onEmptyTrash) }} />
    </>
  )
}
