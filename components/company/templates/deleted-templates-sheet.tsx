'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { TemplateThumb } from '@/components/templates/render/document'
import type { BrandKit, TemplateSummary } from '@/lib/templates/model'
import type { DocData } from '@/lib/templates/data'
import styles from './deleted-templates-sheet.module.css'

/**
 * Deleted Templates (REG-502 → REG-511) — the Deleted Files sheet's twin (components/leads/files/deleted-files-sheet.tsx,
 * itself the Deleted Leads sheet 779:26316): the xl 1200 panel, crumb head with Empty Trash and the bare close, the table
 * (Selection · Template · Version · Deleted · Deleted by · On quotes · Actions) with Restore / Delete Forever per row, the
 * bulk bar, "No deleted templates." in the table, and the same confirm dialogs. A template a live quote still prints
 * through can be restored but never deleted forever (REG-502): its Delete Forever is off, and Empty Trash leaves it.
 */
export function DeletedTemplatesSheet({ open, deleted, brand, sample, onClose, onRestore, onDeleteForever, onEmptyTrash }: {
  open: boolean; deleted: TemplateSummary[]; brand: BrandKit; sample: DocData
  onClose: () => void
  onRestore: (ids: string[]) => void | Promise<unknown>
  onDeleteForever: (ids: string[]) => void | Promise<unknown>
  onEmptyTrash: () => void | Promise<unknown>
}) {
  const widths = useColumnWidths('deleted-templates')
  const tracks = gridTracks([{ key: 'sel', track: '40px' }, { key: 'title', track: 'minmax(208px, 1fr)' }, { key: 'version', track: '96px' }, { key: 'deleted', track: '132px' }, { key: 'by', track: '152px' }, { key: 'quotes', track: '120px' }, { key: 'actions', track: '252px' }], widths)   // REG-427
  useScrollLock(open)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<{ kind: 'forever'; ids: string[] } | { kind: 'empty' } | null>(null)
  const [wasOpen, setWasOpen] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setSelected(new Set()); setConfirm(null); setPending(new Set()) }
  }
  useEffect(() => { if (open) busyRef.current = false }, [open])

  const run = async (ids: string[], fn: () => void | Promise<unknown>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setPending((p) => { const n = new Set(p); ids.forEach((id) => n.add(id)); return n })
    try { await fn() } finally {
      busyRef.current = false
      setBusy(false)
      setPending((p) => { const n = new Set(p); ids.forEach((id) => n.delete(id)); return n })
    }
  }
  const prune = (ids: string[]) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n })

  const panel = useRef<HTMLDivElement>(null)
  const escape = useCallback(() => { if (!confirm) onClose() }, [confirm, onClose])
  useEscapeLayer(open, panel, escape)
  useDialogFocus(open, panel)

  const liveSelected = useMemo(() => new Set([...selected].filter((id) => deleted.some((t) => t.id === id))), [selected, deleted])
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setSelected(liveSelected.size === deleted.length ? new Set() : new Set(deleted.map((t) => t.id)))
  const inUse = (t: TemplateSummary) => t.usedBy > 0
  const deletable = deleted.filter((t) => !inUse(t))
  const kept = deleted.length - deletable.length
  /** The rows a bulk Delete Forever can actually remove (the in-use ones stay). */
  const purgeable = (ids: string[]) => ids.filter((id) => { const t = deleted.find((x) => x.id === id); return t && !inUse(t) })
  const confirmTarget = confirm?.kind === 'forever' && confirm.ids.length === 1 ? deleted.find((t) => t.id === confirm.ids[0]) : undefined
  const quotesOn = (t: TemplateSummary) => (t.usedBy === 0 ? '--' : `${t.usedBy} quote${t.usedBy === 1 ? '' : 's'}`)

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <motion.div ref={panel} className={styles.panel} style={{ outline: 'none' }} variants={modalPanel}
                        role="dialog" aria-modal aria-label="Deleted Templates" tabIndex={-1}>
              <div className={styles.heading}>
                <div className={styles.titleBlock}>
                  <span className={styles.crumb}>Templates / </span>
                  <span className={styles.title}>Deleted Templates</span>
                </div>
                <Button variant="secondary" appearance="outlined" onPress={() => setConfirm({ kind: 'empty' })} isDisabled={deletable.length === 0}>
                  Empty Trash
                </Button>
                <Tooltip label="Close">
                  <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
                    <Icon name="close" size={24} family="outlined" />
                  </button>
                </Tooltip>
              </div>

              <div className={styles.body} data-bulk={liveSelected.size > 0 || undefined}>
                <div className={styles.card} role="table" aria-label="Deleted templates" data-cols="deleted-templates" style={tracks ? ({ '--tracks': tracks } as React.CSSProperties) : undefined}
                     onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
                  <div className={styles.head} role="row">
                    <div className={`${styles.hCell} ${styles.colSel}`} role="columnheader">
                      <Checkbox isSelected={deleted.length > 0 && liveSelected.size === deleted.length} isIndeterminate={liveSelected.size > 0 && liveSelected.size < deleted.length}
                                onChange={toggleAll} aria-label="Select all deleted templates" />
                    </div>
                    <div className={`${styles.hCell} ${styles.colTitle}`} role="columnheader"><span className={styles.hLabel}>Template</span><ColumnResizer table="deleted-templates" column="title" label="Template" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colVersion}`} role="columnheader"><span className={styles.hLabel}>Version</span><ColumnResizer table="deleted-templates" column="version" label="Version" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colDeleted}`} role="columnheader"><span className={styles.hLabel}>Deleted</span><ColumnResizer table="deleted-templates" column="deleted" label="Deleted" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colBy}`} role="columnheader"><span className={styles.hLabel}>Deleted by</span><ColumnResizer table="deleted-templates" column="by" label="Deleted by" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colQuotes}`} role="columnheader"><span className={styles.hLabel}>On quotes</span><ColumnResizer table="deleted-templates" column="quotes" label="On quotes" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colActions}`} role="columnheader"><span className={styles.hLabel}>Actions</span></div>
                  </div>

                  {deleted.length === 0 ? (
                    <div className={styles.emptyRow}>No deleted templates.</div>
                  ) : deleted.map((t) => (
                    <div key={t.id} className={styles.row} role="row" data-selected={liveSelected.has(t.id) || undefined} data-testid="deleted-template">
                      <div className={`${styles.cell} ${styles.colSel}`} role="cell">
                        <Checkbox isSelected={liveSelected.has(t.id)} onChange={() => toggle(t.id)} aria-label={`Select ${t.name}`} />
                      </div>
                      <div className={`${styles.cell} ${styles.colTitle}`} role="cell">
                        <span className={styles.thumb} aria-hidden><TemplateThumb design={t.design} brand={brand} data={sample} width={26} /></span>
                        <span className={styles.name}>{t.name}</span>
                      </div>
                      <div className={`${styles.cell} ${styles.colVersion}`} role="cell"><span className={styles.plain}>{t.status === 'draft' ? 'Draft' : `v${t.version}`}</span></div>
                      <div className={`${styles.cell} ${styles.colDeleted}`} role="cell"><span className={styles.plain}>{t.deletedAt ? displayDate(new Date(t.deletedAt)) : '--'}</span></div>
                      <div className={`${styles.cell} ${styles.colBy}`} role="cell">
                        {t.updatedBy ? (
                          <>
                            <Avatar name={t.updatedBy.name} color={t.updatedBy.color} size={24} tooltip={false} />
                            <span className={styles.plain}>{t.updatedBy.name}</span>
                          </>
                        ) : <span className={styles.plain}>--</span>}
                      </div>
                      <div className={`${styles.cell} ${styles.colQuotes}`} role="cell"><span className={styles.plain}>{quotesOn(t)}</span></div>
                      <div className={`${styles.cell} ${styles.colActions}`} role="cell">
                        <button type="button" className={styles.link} disabled={pending.has(t.id)}
                                onClick={() => { prune([t.id]); void run([t.id], () => onRestore([t.id])) }}>Restore</button>
                        {inUse(t) ? (
                          <Tooltip label={`${t.usedBy} quote${t.usedBy === 1 ? ' prints' : 's print'} through it — restore it instead`}>
                            <button type="button" className={styles.link} data-danger disabled aria-disabled="true">Delete Forever</button>
                          </Tooltip>
                        ) : (
                          <button type="button" className={styles.link} data-danger disabled={pending.has(t.id)}
                                  onClick={() => setConfirm({ kind: 'forever', ids: [t.id] })}>Delete Forever</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DetailBulkBar
                inset
                count={liveSelected.size}
                actions={[
                  { label: 'Restore', onClick: () => { const ids = [...liveSelected]; prune(ids); void run(ids, () => onRestore(ids)) } },
                  { label: 'Delete Forever', tone: 'danger', onClick: () => setConfirm({ kind: 'forever', ids: purgeable([...liveSelected]) }) },
                ]}
                onClear={() => setSelected(new Set())}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Dialog open={confirm?.kind === 'forever'} onClose={() => setConfirm(null)} width={400}
              title={confirm?.kind === 'forever' && confirm.ids.length !== 1 ? `Delete ${confirm.ids.length} templates forever?` : 'Delete this template forever?'}
              subtitle={confirmTarget?.name}
              footer={<>
                <Button variant="secondary" appearance="outlined" onPress={() => setConfirm(null)}>Cancel</Button>
                <DangerButton disabled={busy || (confirm?.kind === 'forever' && confirm.ids.length === 0)} onClick={() => {
                  if (confirm?.kind === 'forever' && confirm.ids.length) { const ids = confirm.ids; prune(ids); void run(ids, () => onDeleteForever(ids)) }
                  setConfirm(null)
                }}>Delete Forever</DangerButton>
              </>}>
        <span className={styles.confirmText}>
          {confirm?.kind === 'forever' && confirm.ids.length === 0
            ? 'Every selected template still prints through a quote, so none can be deleted forever. Restore them instead.'
            : confirm?.kind === 'forever' && confirm.ids.length > 1
              ? `This can’t be undone. These templates and their versions will be removed permanently.${liveSelected.size > confirm.ids.length ? ` ${liveSelected.size - confirm.ids.length} that quotes still print through stay.` : ''}`
              : 'This can’t be undone. The template and its versions will be removed permanently.'}
        </span>
      </Dialog>

      <Dialog open={confirm?.kind === 'empty'} onClose={() => setConfirm(null)} width={400}
              title="Empty trash?"
              footer={<>
                <Button variant="secondary" appearance="outlined" onPress={() => setConfirm(null)}>Cancel</Button>
                <DangerButton disabled={busy} onClick={() => {
                  const ids = deletable.map((t) => t.id); setSelected(new Set()); void run(ids, () => onEmptyTrash()); setConfirm(null)
                }}>Empty Trash</DangerButton>
              </>}>
        <span className={styles.confirmText}>
          {deletable.length === deleted.length
            ? `All ${deleted.length} deleted ${deleted.length === 1 ? 'template' : 'templates'} will be removed permanently. This can’t be undone.`
            : `${deletable.length} deleted ${deletable.length === 1 ? 'template' : 'templates'} will be removed permanently. ${kept} that ${kept === 1 ? 'a quote still prints' : 'quotes still print'} through ${kept === 1 ? 'stays' : 'stay'}. This can’t be undone.`}
        </span>
      </Dialog>
    </>
  )
}
