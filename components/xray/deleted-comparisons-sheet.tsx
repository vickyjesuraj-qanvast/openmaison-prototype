'use client'

import { useEffect, useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { DangerButton, Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { displayDate } from '@/lib/format'
import { COMPARISON_DELETE_RULE, COMPARISON_TRASH_RULE } from '@/lib/xray/policy'
import type { DeletedComparison } from '@/lib/xray/queries'
import styles from '@/components/contracts/deleted-contracts-sheet.module.css'

/**
 * (the close-out round 2026-10-31, C-08) Deleted comparisons — Deleted contracts' twin on its stylesheet (the Deleted sheets' shell, REG-511 ·
 * REG-727: the crumb as the head's eyebrow, Delete all forever its one action, no foot, height to content with a 480 floor; the table core):
 * Comparison · Your quote · Deleted · Made by · Actions with Restore / Delete forever per row, the selection column and the bulk bar, a failed
 * load says so with a retry, a failed restore or delete says so. Who may is the delete's own rule (lib/xray/policy.ts). Loads when opened.
 * On a phone the rows read as the contract sheets' card (`data-card`: the facts as one labelled line).
 */
export function DeletedComparisonsSheet({ open, onClose, load, crumb, onRestore, onDeleteForever, onEmptyTrash }: {
  open: boolean; onClose: () => void
  load: () => Promise<DeletedComparison[]>
  crumb: string
  onRestore: (ids: string[]) => Promise<unknown>
  onDeleteForever: (ids: string[]) => Promise<unknown>
  onEmptyTrash: () => Promise<unknown>
}) {
  const snackbar = useSnackbar()
  const [rows, setRows] = useState<DeletedComparison[] | null>(null)
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
  const emptiable = (rows ?? []).filter((r) => r.mine).length
  const live = (rows ?? []).filter((r) => selected.has(r.id))
  const mine = live.filter((r) => r.mine).map((r) => r.id)
  const pickable = (rows ?? []).filter((r) => r.mine)
  const allOn = pickable.length > 0 && pickable.every((r) => selected.has(r.id))
  const toggle = (id: string) => setSelected((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <>
      <Dialog open={open} onClose={onClose} title="Deleted comparisons" eyebrow={crumb} size="modal" width={1200} minHeight={480} phoneFull portal
              actions={<Button variant="secondary" appearance="outlined" onPress={() => setConfirm({ kind: 'empty' })} isDisabled={!emptiable || busy}>Delete all forever</Button>}>
        <span className={`${styles.note} ${styles.noteMove}`}>{`Deleted comparisons stay here until they are deleted forever. Restore puts one back in Recent comparisons. ${COMPARISON_TRASH_RULE}.`}</span>
        <div className={styles.table} role="table" aria-label="Deleted comparisons" data-testid="deleted-comparisons" data-by="" data-select="" data-card="">
          <div className={styles.head} role="row">
            <span role="columnheader" className={`${styles.hCell} ${styles.sel}`}><Checkbox isSelected={allOn} isIndeterminate={!allOn && live.length > 0} isDisabled={!pickable.length} onChange={() => setSelected(allOn ? new Set() : new Set(pickable.map((r) => r.id)))} aria-label="Select all deleted comparisons" /></span>
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Comparison</span></span>
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Your quote</span></span>
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Deleted</span></span>
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Made by</span></span>
            <span role="columnheader" className={`${styles.hCell} ${styles.actions}`}><span className={styles.hLabel}>Actions</span></span>
          </div>
          {rows === null ? <div className={styles.empty}>Loading…</div>
            : failed ? <div className={styles.empty} role="status">Couldn’t load the deleted comparisons — <button type="button" className={styles.retry} onClick={() => { setRows(null); setTick((t) => t + 1) }}>try again</button></div>
            : rows.length === 0 ? <div className={styles.empty} role="status">No deleted comparisons.</div> : rows.map((c) => (
            <div key={c.id} className={styles.row} role="row" data-testid="deleted-comparison" data-selected={selected.has(c.id) || undefined}>
              <span role="cell" className={`${styles.cell} ${styles.sel}`}><Checkbox isSelected={selected.has(c.id)} isDisabled={!c.mine} onChange={() => toggle(c.id)} aria-label={`Select ${c.title}`} /></span>
              <span role="cell" className={`${styles.cell} ${styles.title}`}><Icon name="scan" size={20} weight={300} />{c.title}</span>
              <span role="cell" className={styles.cell} data-fact="Your quote">{c.yours}</span>
              <span role="cell" className={styles.cell} data-fact="Deleted">{displayDate(new Date(c.deletedAt))}</span>
              <span role="cell" className={styles.cell} data-fact="Made by">{c.madeBy}</span>
              <span role="cell" className={`${styles.cell} ${styles.actions}`}>
                <Tooltip label={c.mine ? 'Put it back in Recent comparisons' : COMPARISON_DELETE_RULE}>
                  <span><Button variant="secondary" appearance="outlined" isDisabled={busy || !c.mine} onPress={() => { void run('restore the comparison', () => onRestore([c.id])) }}>Restore</Button></span>
                </Tooltip>
                <Tooltip label={c.mine ? 'Deletes the comparison for good' : COMPARISON_DELETE_RULE}>
                  <span><DangerButton disabled={busy || !c.mine} onClick={() => setConfirm({ kind: 'forever', ids: [c.id] })}>Delete forever</DangerButton></span>
                </Tooltip>
              </span>
            </div>
          ))}
        </div>
        <DetailBulkBar inset count={live.length}
                       actions={[
                         { label: `Restore${mine.length !== live.length ? ` ${mine.length}` : ''}`, onClick: () => { const ids = mine; setSelected(new Set()); if (ids.length) void run('restore the comparisons', () => onRestore(ids)) } },
                         ...(mine.length ? [{ label: `Delete forever${mine.length !== live.length ? ` ${mine.length}` : ''}`, tone: 'danger' as const, onClick: () => setConfirm({ kind: 'forever', ids: mine }) }] : []),
                       ]}
                       onClear={() => setSelected(new Set())} />
      </Dialog>
      <ConfirmDialog nested open={confirm?.kind === 'forever'} title="Delete forever?" message={confirm?.kind === 'forever' && confirm.ids.length > 1 ? `These ${confirm.ids.length} comparisons will be deleted permanently. This action cannot be undone.` : 'This comparison will be deleted permanently. This action cannot be undone.'} confirmLabel="Delete forever"
                     onCancel={() => setConfirm(null)} onConfirm={() => { const c = confirm; setConfirm(null); if (c?.kind === 'forever') { setSelected(new Set()); void run(c.ids.length > 1 ? 'delete the comparisons forever' : 'delete the comparison forever', () => onDeleteForever(c.ids)) } }} />
      <ConfirmDialog nested open={confirm?.kind === 'empty'} title="Delete all forever?" message={`${emptiable} deleted ${emptiable === 1 ? 'comparison' : 'comparisons'} will be deleted permanently.${(rows ?? []).length > emptiable ? ' Comparisons someone else made stay.' : ''} This action cannot be undone.`} confirmLabel="Delete all forever"
                     onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); setSelected(new Set()); void run('delete the comparisons forever', onEmptyTrash) }} />
    </>
  )
}
