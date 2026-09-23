'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox } from '@/components/ds'
import { ColumnResizer, gridTracks, useColumnWidths } from '@/components/om/column-resize'
import { Icon } from '@/components/om/icon'
import { Avatar } from '@/components/om/avatar'
import { Tooltip } from '@/components/om/tooltip'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { DangerButton, Dialog } from '@/components/om/dialog'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { modalPanel, overlayFade } from '@/lib/motion'
import { displayDate } from '@/lib/format'
import type { LibraryItem } from './library-gallery'
import styles from './deleted-templates-sheet.module.css'

/**
 * (REG-538) The Deleted sheet the simple libraries share — the Deleted Templates sheet's twin (REG-511) on its stylesheet:
 * the xl 1200 panel, crumb head with Empty Trash and the bare close, the table (Selection · Template · {the kind's fact} ·
 * Deleted · By · Used by · Actions) with Restore / Delete Forever per row, the bulk bar, the same confirm dialogs. A row the
 * kind says must stay (`keepReason`) can be restored but never removed for good.
 */
export function LibraryDeletedSheet<T extends LibraryItem>({ open, rows, crumb, ariaLabel, glyph, meta, usage, keepReason, onClose, onRestore, onDeleteForever, onEmptyTrash }: {
  open: boolean; rows: T[]; crumb: string; ariaLabel: string
  glyph: (t: T) => ReactNode
  meta: { label: string; value: (t: T) => string }
  usage: (t: T) => string
  keepReason?: (t: T) => string | null
  onClose: () => void
  onRestore: (ids: string[]) => void | Promise<unknown>
  onDeleteForever: (ids: string[]) => void | Promise<unknown>
  onEmptyTrash: () => void | Promise<unknown>
}) {
  const widths = useColumnWidths('library-deleted')
  const tracks = gridTracks([{ key: 'sel', track: '40px' }, { key: 'title', track: 'minmax(208px, 1fr)' }, { key: 'version', track: '160px' }, { key: 'deleted', track: '132px' }, { key: 'by', track: '152px' }, { key: 'quotes', track: '150px' }, { key: 'actions', track: '252px' }], widths)
  useScrollLock(open)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<{ kind: 'forever'; ids: string[] } | { kind: 'empty' } | null>(null)
  const [wasOpen, setWasOpen] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setSelected(new Set()); setConfirm(null); setPending(new Set()) } }
  useEffect(() => { if (open) busyRef.current = false }, [open])
  const run = async (ids: string[], fn: () => void | Promise<unknown>) => {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true)
    setPending((p) => { const n = new Set(p); ids.forEach((id) => n.add(id)); return n })
    try { await fn() } finally { busyRef.current = false; setBusy(false); setPending((p) => { const n = new Set(p); ids.forEach((id) => n.delete(id)); return n }) }
  }
  const prune = (ids: string[]) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n })
  const panel = useRef<HTMLDivElement>(null)
  const escape = useCallback(() => { if (!confirm) onClose() }, [confirm, onClose])
  useEscapeLayer(open, panel, escape)
  useDialogFocus(open, panel)
  const liveSelected = useMemo(() => new Set([...selected].filter((id) => rows.some((t) => t.id === id))), [selected, rows])
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setSelected(liveSelected.size === rows.length ? new Set() : new Set(rows.map((t) => t.id)))
  const kept = (t: T) => keepReason?.(t) ?? null
  const deletable = rows.filter((t) => !kept(t))
  const purgeable = (ids: string[]) => ids.filter((id) => { const t = rows.find((x) => x.id === id); return t && !kept(t) })
  const confirmTarget = confirm?.kind === 'forever' && confirm.ids.length === 1 ? rows.find((t) => t.id === confirm.ids[0]) : undefined

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <motion.div ref={panel} className={styles.panel} style={{ outline: 'none' }} variants={modalPanel} role="dialog" aria-modal aria-label="Deleted Templates" tabIndex={-1}>
              <div className={styles.heading}>
                <div className={styles.titleBlock}>
                  <span className={styles.crumb}>{crumb} / </span>
                  <span className={styles.title}>Deleted Templates</span>
                </div>
                {rows.length > 0 && deletable.length === 0 ? (
                  <Tooltip label="Every deleted template is still in use — restore them instead"><span><Button variant="secondary" appearance="outlined" isDisabled>Empty Trash</Button></span></Tooltip>
                ) : (
                  <Button variant="secondary" appearance="outlined" onPress={() => setConfirm({ kind: 'empty' })} isDisabled={deletable.length === 0}>Empty Trash</Button>
                )}
                <Tooltip label="Close"><button type="button" className={styles.close} aria-label="Close" onClick={onClose}><Icon name="close" size={24} family="outlined" /></button></Tooltip>
              </div>
              <div className={styles.body} data-bulk={liveSelected.size > 0 || undefined}>
                <div className={styles.card} role="table" aria-label={ariaLabel} data-cols="library-deleted" style={tracks ? ({ '--tracks': tracks } as React.CSSProperties) : undefined}
                     onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
                  <div className={styles.head} role="row">
                    <div className={`${styles.hCell} ${styles.colSel}`} role="columnheader">
                      <Checkbox isSelected={rows.length > 0 && liveSelected.size === rows.length} isIndeterminate={liveSelected.size > 0 && liveSelected.size < rows.length} onChange={toggleAll} aria-label="Select all deleted templates" />
                    </div>
                    <div className={`${styles.hCell} ${styles.colTitle}`} role="columnheader"><span className={styles.hLabel}>Template</span><ColumnResizer table="library-deleted" column="title" label="Template" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colVersion}`} role="columnheader"><span className={styles.hLabel}>{meta.label}</span><ColumnResizer table="library-deleted" column="version" label={meta.label} min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colDeleted}`} role="columnheader"><span className={styles.hLabel}>Deleted</span><ColumnResizer table="library-deleted" column="deleted" label="Deleted" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colBy}`} role="columnheader"><span className={styles.hLabel}>Made by</span><ColumnResizer table="library-deleted" column="by" label="Made by" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colQuotes}`} role="columnheader"><span className={styles.hLabel}>Used by</span><ColumnResizer table="library-deleted" column="quotes" label="Used by" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colActions}`} role="columnheader"><span className={styles.hLabel}>Actions</span></div>
                  </div>
                  {rows.length === 0 ? <div className={styles.emptyRow}>No deleted templates.</div> : rows.map((t) => {
                    const reason = kept(t)
                    return (
                      <div key={t.id} className={styles.row} role="row" data-selected={liveSelected.has(t.id) || undefined} data-testid="deleted-library-row">
                        <div className={`${styles.cell} ${styles.colSel}`} role="cell"><Checkbox isSelected={liveSelected.has(t.id)} onChange={() => toggle(t.id)} aria-label={`Select ${t.title}`} /></div>
                        <div className={`${styles.cell} ${styles.colTitle}`} role="cell"><span className={styles.thumb} aria-hidden>{glyph(t)}</span><span className={styles.name}>{t.title}</span></div>
                        <div className={`${styles.cell} ${styles.colVersion}`} role="cell"><span className={styles.plain}>{meta.value(t)}</span></div>
                        <div className={`${styles.cell} ${styles.colDeleted}`} role="cell"><span className={styles.plain}>{t.deletedAt ? displayDate(t.deletedAt) : '--'}</span></div>
                        <div className={`${styles.cell} ${styles.colBy}`} role="cell">{t.author ? <><Avatar name={t.author} color={t.authorColor ?? '#666666'} size={24} tooltip={false} /><span className={styles.plain}>{t.author}</span></> : <span className={styles.plain}>--</span>}</div>
                        <div className={`${styles.cell} ${styles.colQuotes}`} role="cell"><span className={styles.plain}>{usage(t)}</span></div>
                        <div className={`${styles.cell} ${styles.colActions}`} role="cell">
                          <button type="button" className={styles.link} disabled={pending.has(t.id)} onClick={() => { prune([t.id]); void run([t.id], () => onRestore([t.id])) }}>Restore</button>
                          {reason ? (
                            <Tooltip label={reason}><button type="button" className={styles.link} data-danger aria-disabled="true" onClick={(e) => e.preventDefault()}>Delete Forever</button></Tooltip>
                          ) : (
                            <button type="button" className={styles.link} data-danger disabled={pending.has(t.id)} onClick={() => setConfirm({ kind: 'forever', ids: [t.id] })}>Delete Forever</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <DetailBulkBar inset count={liveSelected.size}
                             actions={[{ label: 'Restore', onClick: () => { const ids = [...liveSelected]; prune(ids); void run(ids, () => onRestore(ids)) } }, { label: 'Delete Forever', tone: 'danger', onClick: () => setConfirm({ kind: 'forever', ids: purgeable([...liveSelected]) }) }]}
                             onClear={() => setSelected(new Set())} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <Dialog open={confirm?.kind === 'forever'} onClose={() => setConfirm(null)} width={400}
              title={confirm?.kind === 'forever' && confirm.ids.length !== 1 ? `Delete ${confirm.ids.length} templates forever?` : 'Delete this template forever?'} subtitle={confirmTarget?.title}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setConfirm(null)}>Cancel</Button>
                <DangerButton disabled={busy || (confirm?.kind === 'forever' && confirm.ids.length === 0)} onClick={() => { if (confirm?.kind === 'forever' && confirm.ids.length) { const ids = confirm.ids; prune(ids); void run(ids, () => onDeleteForever(ids)) } setConfirm(null) }}>Delete Forever</DangerButton></>}>
        <span className={styles.confirmText}>
          {confirm?.kind === 'forever' && confirm.ids.length === 0 ? 'Every selected template is still in use, so none can be deleted forever. Restore them instead.'
            : confirm?.kind === 'forever' && confirm.ids.length > 1 ? `This can’t be undone. These templates will be removed permanently.${liveSelected.size > confirm.ids.length ? ` ${liveSelected.size - confirm.ids.length} still in use stay.` : ''}`
            : 'This can’t be undone. The template will be removed permanently.'}
        </span>
      </Dialog>
      <Dialog open={confirm?.kind === 'empty'} onClose={() => setConfirm(null)} width={400} title="Empty trash?"
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setConfirm(null)}>Cancel</Button>
                <DangerButton disabled={busy} onClick={() => { const ids = deletable.map((t) => t.id); setSelected(new Set()); void run(ids, () => onEmptyTrash()); setConfirm(null) }}>Empty Trash</DangerButton></>}>
        <span className={styles.confirmText}>{`This can’t be undone. ${deletable.length} deleted ${deletable.length === 1 ? 'template' : 'templates'} will be removed permanently${rows.length > deletable.length ? `; ${rows.length - deletable.length} still in use stay` : ''}.`}</span>
      </Dialog>
    </>
  )
}
