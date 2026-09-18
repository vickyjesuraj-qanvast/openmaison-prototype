'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ds'
import { DangerButton, Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { displayDate } from '@/lib/format'
import type { DeletedContractRow } from '@/lib/contracts/queries'
import styles from './deleted-contracts-sheet.module.css'

/**
 * Deleted Contracts (REG-534) — the Deleted sheets' shell (REG-511: the xl 1200 panel, crumb head with Empty Trash, the table,
 * "No deleted contracts."): Title · Lead · Status · Deleted · Actions with Restore / Delete forever per row. Loads when opened.
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
  const [rows, setRows] = useState<DeletedContractRow[] | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'forever'; id: string } | { kind: 'empty' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setRows(null); setConfirm(null) } }
  useEffect(() => {
    if (!open) return
    let live = true
    void load().then((r) => { if (live) setRows(r) }, () => { if (live) setRows([]) })
    return () => { live = false }
  }, [open, load])
  const run = async (fn: () => Promise<unknown>) => { if (busy) return; setBusy(true); try { await fn(); setRows(await load()) } finally { setBusy(false) } }
  return (
    <>
      <Dialog open={open} onClose={onClose} title="Deleted Contracts" eyebrow={crumb} size="modal" width={1200} height={640} portal
              footer={<Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button>}>
        <div className={styles.head}>
          <span className={styles.note}>Deleted contracts stay here until you delete them forever. Restore puts one back on its lead.</span>
          <DangerButton onClick={() => setConfirm({ kind: 'empty' })} disabled={!rows?.length || busy}>Empty Trash</DangerButton>
        </div>
        <div className={styles.table} role="table" aria-label="Deleted contracts" data-testid="deleted-contracts" data-lead={showLead || undefined}>
          <div className={styles.row} role="row" data-head="">
            <span role="columnheader" className={styles.cell}>Title</span>
            {showLead ? <span role="columnheader" className={styles.cell}>Lead</span> : null}
            <span role="columnheader" className={styles.cell}>Status</span>
            <span role="columnheader" className={styles.cell}>Deleted</span>
            <span role="columnheader" className={`${styles.cell} ${styles.actions}`}>Actions</span>
          </div>
          {rows === null ? <div className={styles.empty}>Loading…</div> : rows.length === 0 ? <div className={styles.empty} role="status">No deleted contracts.</div> : rows.map((c) => (
            <div key={c.id} className={styles.row} role="row" data-testid="deleted-contract">
              <span role="cell" className={`${styles.cell} ${styles.title}`}><Icon name="contract" size={20} weight={300} />{c.title}</span>
              {showLead ? <span role="cell" className={styles.cell}>{c.leadName}</span> : null}
              <span role="cell" className={styles.cell}>{c.status}</span>
              <span role="cell" className={styles.cell}>{c.deletedAt ? displayDate(c.deletedAt) : '-'}</span>
              <span role="cell" className={`${styles.cell} ${styles.actions}`}>
                <Button variant="secondary" appearance="outlined" isDisabled={busy} onPress={() => { void run(() => onRestore([c.id])) }}>Restore</Button>
                <DangerButton disabled={busy} onClick={() => setConfirm({ kind: 'forever', id: c.id })}>Delete Forever</DangerButton>
              </span>
            </div>
          ))}
        </div>
      </Dialog>
      <ConfirmDialog open={confirm?.kind === 'forever'} title="Delete forever?" message="This contract will be deleted permanently. This action cannot be undone." confirmLabel="Delete Forever"
                     onCancel={() => setConfirm(null)} onConfirm={() => { const c = confirm; setConfirm(null); if (c?.kind === 'forever') void run(() => onDeleteForever([c.id])) }} />
      <ConfirmDialog open={confirm?.kind === 'empty'} title="Empty the trash?" message="Every deleted contract here will be deleted permanently. This action cannot be undone." confirmLabel="Empty Trash"
                     onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); void run(onEmptyTrash) }} />
    </>
  )
}
