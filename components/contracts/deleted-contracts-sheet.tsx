'use client'

import { useEffect, useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { DangerButton, Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { CONTRACT_DELETE_RULE } from '@/lib/contracts/policy'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { displayDate } from '@/lib/format'
import type { DeletedContractRow } from '@/lib/contracts/queries'
import styles from './deleted-contracts-sheet.module.css'

/**
 * Deleted Contracts (REG-534) — the Deleted sheets' shell (REG-511: the xl 1200 panel, crumb head with Empty Trash, the table,
 * "No deleted contracts."): Title · Lead · Status · Deleted · Deleted by · Actions with Restore / Delete forever per row. Loads when
 * opened. (REG-634, parity Q-21 · E-124) Deleted Quotes' rule: only its creator, an Owner or an Admin restores or deletes it forever.
 * (sweep S2 #18 · U-08) Deleted Quotes' twin in full: a failed load says so with a retry (it read "No deleted contracts."), a failed restore
 * or delete says so, and the selection column with the bulk bar.
 * (REG-727) The Deleted trio's shape (REG-513): Empty Trash in the head, no Close foot, height to content with a 480 floor; the table on
 * the table core (the listing's head, rows and cells).
 */
export function DeletedContractsSheet({ open, onClose, load, crumb, showLead, onRestore, onDeleteForever, onEmptyTrash }: {
  open: boolean; onClose: () => void
  load: () => Promise<DeletedContractRow[]>
  crumb: string
  showLead?: boolean
  onRestore: (ids: string[]) => Promise<unknown>
  onDeleteForever: (ids: string[]) => Promise<unknown>
  onEmptyTrash: () => Promise<unknown>
}) {
  const snackbar = useSnackbar()
  const [rows, setRows] = useState<DeletedContractRow[] | null>(null)
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
  const run = async (what: string, fn: () => Promise<unknown>) => {
    if (busy) return
    setBusy(true)
    try { await fn() } catch { snackbar({ message: `Couldn’t ${what} — please try again` }) }
    finally { try { setRows(await load()) } catch { setFailed(true) } setBusy(false) }
  }
  const emptiable = (rows ?? []).filter((r) => r.mine).length
  const live = (rows ?? []).filter((r) => selected.has(r.id))
  const mine = live.filter((r) => r.mine).map((r) => r.id)
  const pickable = (rows ?? []).filter((r) => r.mine)
  const allOn = pickable.length > 0 && pickable.every((r) => selected.has(r.id))
  const toggle = (id: string) => setSelected((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <>
      {/* (REG-727) The trio's head: the crumb as the eyebrow, Empty Trash the one action before the close; no foot. */}
      <Dialog open={open} onClose={onClose} title="Deleted Contracts" eyebrow={crumb} size="modal" width={1200} minHeight={480} phoneFull portal
              actions={<Button variant="secondary" appearance="outlined" onPress={() => setConfirm({ kind: 'empty' })} isDisabled={!emptiable || busy}>Empty Trash</Button>}>
        <span className={`${styles.note} ${styles.noteMove}`}>Deleted contracts stay here until they are deleted forever. Restore puts one back on its lead. Only its creator, an Owner or an Admin restores or deletes a contract.</span>
        <div className={styles.table} role="table" aria-label="Deleted contracts" data-testid="deleted-contracts" data-lead={showLead || undefined} data-by="" data-select="" data-card="">
          <div className={styles.head} role="row">
            <span role="columnheader" className={`${styles.hCell} ${styles.sel}`}><Checkbox isSelected={allOn} isIndeterminate={!allOn && live.length > 0} isDisabled={!pickable.length} onChange={() => setSelected(allOn ? new Set() : new Set(pickable.map((r) => r.id)))} aria-label="Select all deleted contracts" /></span>
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Title</span></span>
            {showLead ? <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Lead</span></span> : null}
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Status</span></span>
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Deleted</span></span>
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Deleted by</span></span>
            <span role="columnheader" className={`${styles.hCell} ${styles.actions}`}><span className={styles.hLabel}>Actions</span></span>
          </div>
          {rows === null ? <div className={styles.empty}>Loading…</div>
            : failed ? <div className={styles.empty} role="status">Couldn’t load the deleted contracts — <button type="button" className={styles.retry} onClick={() => { setRows(null); setTick((t) => t + 1) }}>try again</button></div>
            : rows.length === 0 ? <div className={styles.empty} role="status">No deleted contracts.</div> : rows.map((c) => (
            <div key={c.id} className={styles.row} role="row" data-testid="deleted-contract" data-selected={selected.has(c.id) || undefined}>
              <span role="cell" className={`${styles.cell} ${styles.sel}`}><Checkbox isSelected={selected.has(c.id)} isDisabled={!c.mine} onChange={() => toggle(c.id)} aria-label={`Select ${c.title}`} /></span>
              <span role="cell" className={`${styles.cell} ${styles.title}`}><Icon name="contract" size={20} weight={300} />{c.title}</span>
              {/* (Contracts on the move, C4 — A-14) on a phone the facts read as one labelled line under the title; the desk keeps its columns */}
              {showLead ? <span role="cell" className={styles.cell} data-fact="Lead">{c.leadName}</span> : null}
              <span role="cell" className={styles.cell} data-fact="Status">{c.status}</span>
              <span role="cell" className={styles.cell} data-fact="Deleted">{c.deletedAt ? displayDate(c.deletedAt) : '--'}</span>
              <span role="cell" className={styles.cell} data-fact="Deleted by">{c.deletedByName ?? '--'}</span>
              <span role="cell" className={`${styles.cell} ${styles.actions}`}>
                <Tooltip label={c.mine ? `Put it back on ${c.leadName}` : CONTRACT_DELETE_RULE}>
                  <span><Button variant="secondary" appearance="outlined" isDisabled={busy || !c.mine} onPress={() => { void run('restore the contract', () => onRestore([c.id])) }}>Restore</Button></span>
                </Tooltip>
                <Tooltip label={c.mine ? 'Deletes the contract for good' : CONTRACT_DELETE_RULE}>
                  <span><DangerButton disabled={busy || !c.mine} onClick={() => setConfirm({ kind: 'forever', ids: [c.id] })}>Delete Forever</DangerButton></span>
                </Tooltip>
              </span>
            </div>
          ))}
        </div>
        <DetailBulkBar inset count={live.length}
                       actions={[
                         { label: `Restore${mine.length !== live.length ? ` ${mine.length}` : ''}`, onClick: () => { const ids = mine; setSelected(new Set()); if (ids.length) void run('restore the contracts', () => onRestore(ids)) } },
                         ...(mine.length ? [{ label: `Delete Forever${mine.length !== live.length ? ` ${mine.length}` : ''}`, tone: 'danger' as const, onClick: () => setConfirm({ kind: 'forever', ids: mine }) }] : []),
                       ]}
                       onClear={() => setSelected(new Set())} />
      </Dialog>
      <ConfirmDialog nested open={confirm?.kind === 'forever'} title="Delete forever?" message={confirm?.kind === 'forever' && confirm.ids.length > 1 ? `These ${confirm.ids.length} contracts will be deleted permanently. This action cannot be undone.` : 'This contract will be deleted permanently. This action cannot be undone.'} confirmLabel="Delete Forever"
                     onCancel={() => setConfirm(null)} onConfirm={() => { const c = confirm; setConfirm(null); if (c?.kind === 'forever') { setSelected(new Set()); void run(c.ids.length > 1 ? 'delete the contracts forever' : 'delete the contract forever', () => onDeleteForever(c.ids)) } }} />
      <ConfirmDialog nested open={confirm?.kind === 'empty'} title="Empty the trash?" message={`${emptiable} deleted ${emptiable === 1 ? 'contract' : 'contracts'} will be deleted permanently. Contracts someone else created stay. This action cannot be undone.`} confirmLabel="Empty Trash"
                     onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); setSelected(new Set()); void run('empty the trash', onEmptyTrash) }} />
    </>
  )
}
