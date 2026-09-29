'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox } from '@/components/ds'
import { ColumnResizer, gridTracks, useColumnWidths } from '@/components/om/column-resize'
import { Icon } from '@/components/om/icon'
import { Avatar } from '@/components/om/avatar'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { DangerButton, Dialog, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { modalPanel, overlayFade } from '@/lib/motion'
import { displayDate, fileSize } from '@/lib/format'
import { fileTypeLabel, isFolder, type FileRow } from '@/lib/leads/file-model'
import styles from './deleted-files-sheet.module.css'

/**
 * Deleted Files (931:40211, frame 104) — ModalComponent 1200×928 (xl), r12. Spec: design-source/context/lead-files/
 * 04-dialogs-move-deleted.txt. Shell, crumb head, bulk bar, ref-guarded mutation runner and the confirm dialogs are
 * copied from the Deleted Leads sheet (components/leads/deleted-sheet.tsx); the leads sheet's 30-day banner, note and
 * sortable heads are not in this mock and are left out.
 *
 * Heading 80 (H g16 p20/24): [V] "Files / " 12 secondary · "Deleted Files" 20/Bold · "Empty Trash" secondary outlined ·
 * close 24 — since REG-725 the house head (SurfaceHead): the rule inside its bottom edge, the mock's drop shadow gone.
 * Body p24 → table (fill #fff, 1px #e5e5e5 inside, r8; head 56 / rows 60) as one CSS grid with subgrid rows (REG-180):
 * Selection 40 · Title 210 · Owner 152 · Updated 116 · File type 119 · File size 114 · File Location 149 · Actions 252
 * (= 1152). Selected rows fill #eee5ff. Bulk bar (inside the modal, bottom centre): count · Restore · Delete Forever.
 *
 * Invented (build plan): File Location reads "All Files" for a root item; the Delete Forever / Empty Trash confirmations
 * are the Deleted Leads sheet's dialogs with "file" / "folder" copy — destructive actions must confirm.
 */
export function DeletedFilesSheet({
  open, trashed, files, onClose, onRestore, onDeleteForever, onEmptyTrash,
}: {
  open: boolean
  /** Every trashed file / folder of the lead. */
  trashed: FileRow[]
  /** The untrashed tree — resolves each row's location (parent folder name). */
  files: FileRow[]
  onClose: () => void
  onRestore: (ids: string[]) => void | Promise<unknown>
  onDeleteForever: (ids: string[]) => void | Promise<unknown>
  onEmptyTrash: () => void | Promise<unknown>
}) {
  const deletedWidths = useColumnWidths('deleted-files')
  const deletedTracks = gridTracks([{ key: 'sel', track: '40px' }, { key: 'title', track: 'minmax(208px, 1fr)' }, { key: 'owner', track: '152px' }, { key: 'updated', track: '116px' }, { key: 'type', track: '119px' }, { key: 'size', track: '114px' }, { key: 'location', track: '149px' }, { key: 'actions', track: '252px' }], deletedWidths)   // REG-427
  useScrollLock(open)   // the page never scrolls behind this surface
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<{ kind: 'forever'; ids: string[] } | { kind: 'empty' } | null>(null)
  const [wasOpen, setWasOpen] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)   // render-safe mirror of busyRef
  const busyRef = useRef(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setSelected(new Set()); setConfirm(null); setPending(new Set()) }
  }
  useEffect(() => { if (open) busyRef.current = false }, [open])

  // Every mutation runs through one ref-guarded runner: no double-fire from a
  // double-click or from AnimatePresence's frozen exiting tree; rows show pending.
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

  /* (REG-287) `aria-modal` promises the page behind is inert, so the sheet owes the WAI-ARIA dialog contract:
     focus moves in on open, Tab cycles inside it, and focus returns to the opener on close. Esc rides the shared
     layer policy (components/om/surface.ts) — an open confirm Dialog renders after this panel, so it owns Esc —
     and the `!confirm` guard the hand-rolled window listener carried is kept as the same belt and braces. */
  const panel = useRef<HTMLDivElement>(null)
  const escape = useCallback(() => { if (!confirm) onClose() }, [confirm, onClose])
  useEscapeLayer(open, panel, escape)
  useDialogFocus(open, panel)

  // A trashed folder's children are trashed with it, so a parent may live in either list.
  const byId = useMemo(() => new Map([...files, ...trashed].map((f) => [f.id, f] as const)), [files, trashed])
  const locationOf = (f: FileRow) => (f.parentId ? byId.get(f.parentId)?.name ?? 'All Files' : 'All Files')

  // Selection can only reference rows that still exist (restore / purge drop them).
  const liveSelected = useMemo(() => new Set([...selected].filter((id) => trashed.some((f) => f.id === id))), [selected, trashed])
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setSelected(liveSelected.size === trashed.length ? new Set() : new Set(trashed.map((f) => f.id)))

  const confirmTarget = confirm?.kind === 'forever' && confirm.ids.length === 1 ? trashed.find((f) => f.id === confirm.ids[0]) : undefined
  const confirmNoun = confirmTarget && isFolder(confirmTarget) ? 'folder' : 'file'
  /* (REG-664) Several at once: "files" only when no folder is among them — a folder in the pick made the title say "files" regardless. */
  const manyNoun = confirm?.kind === 'forever' && confirm.ids.some((id) => { const f = trashed.find((x) => x.id === id); return !!f && isFolder(f) }) ? 'items' : 'files'

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            {/* (REG-287) tabIndex={-1} so the panel can hold focus; the house panel (surfaceClasses.panel) carries the
                `outline: none` every panel that takes focus on open wears. The ring belongs to the panel's own controls. */}
            <motion.div ref={panel} className={`${surfaceClasses.panel} ${styles.panel}`} variants={modalPanel}
                        role="dialog" aria-modal aria-label="Deleted Files" tabIndex={-1}>
              {/* (REG-725) the house head and foot: the crumb is the head's eyebrow, Empty Trash its one action before the close; no foot. */}
              <SurfaceHead title="Deleted Files" eyebrow="Files /" className={styles.heading} onClose={onClose}
                           actions={
                             <Button variant="secondary" appearance="outlined" onPress={() => setConfirm({ kind: 'empty' })}
                                     isDisabled={trashed.length === 0}>
                               Empty Trash
                             </Button>
                           } />

              <div className={styles.body} data-bulk={liveSelected.size > 0 || undefined}>
                {/* (REG-727) The table core: Selection + Title wear .pin, and Title — the last frozen column, data-pin-edge — draws
                    the 1px edge at rest and the shadow while the card is scrolled sideways. */}
                <div className={styles.card} role="table" aria-label="Deleted files" data-cols="deleted-files" style={deletedTracks ? ({ '--tracks': deletedTracks } as React.CSSProperties) : undefined}
                     onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
                  <div className={styles.head} role="row">
                    <div className={`${styles.hCell} ${styles.colSel} ${styles.pin}`} role="columnheader">
                      <Checkbox
                        isSelected={trashed.length > 0 && liveSelected.size === trashed.length}
                        isIndeterminate={liveSelected.size > 0 && liveSelected.size < trashed.length}
                        onChange={toggleAll}
                        aria-label="Select all deleted files"
                      />
                    </div>
                    <div className={`${styles.hCell} ${styles.colTitle} ${styles.pin}`} data-pin-edge="" role="columnheader"><span className={styles.hLabel}>Title</span><ColumnResizer table="deleted-files" column="title" label="Title" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colOwner}`} role="columnheader"><span className={styles.hLabel}>Owner</span><ColumnResizer table="deleted-files" column="owner" label="Owner" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colUpdated}`} role="columnheader"><span className={styles.hLabel}>Updated</span><ColumnResizer table="deleted-files" column="updated" label="Updated" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colType}`} role="columnheader"><span className={styles.hLabel}>File type</span><ColumnResizer table="deleted-files" column="type" label="File type" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colSize}`} role="columnheader"><span className={styles.hLabel}>File size</span><ColumnResizer table="deleted-files" column="size" label="File size" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colLocation}`} role="columnheader"><span className={styles.hLabel}>File Location</span><ColumnResizer table="deleted-files" column="location" label="File Location" min={72} /></div>
                    <div className={`${styles.hCell} ${styles.colActions}`} role="columnheader"><span className={styles.hLabel}>Actions</span></div>
                  </div>

                  {trashed.length === 0 ? (
                    <div className={styles.emptyRow}>No deleted files.</div>
                  ) : trashed.map((f) => (
                    /* (REG-286) ARIA grid roles: role="table"/role="row" were declared but the cells carried no role,
                       so a screen reader saw rows of generic children and dropped out of table mode — no column
                       announcements, no cell navigation. Additive only; nothing here is styled by role. */
                    <div key={f.id} className={styles.row} role="row" data-selected={liveSelected.has(f.id) || undefined}>
                      <div className={`${styles.cell} ${styles.colSel} ${styles.pin}`} role="cell">
                        <Checkbox isSelected={liveSelected.has(f.id)} onChange={() => toggle(f.id)} aria-label={`Select ${f.name}`} />
                      </div>
                      <div className={`${styles.cell} ${styles.colTitle} ${styles.pin}`} data-pin-edge="" role="cell">
                        <span className={styles.thumb}>
                          {f.thumb ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={f.thumb} alt="" className={styles.thumbImg} width={48} height={36} />
                          ) : (
                            <Icon name={isFolder(f) ? 'folder' : 'picture_as_pdf'} size={24} />
                          )}
                        </span>
                        <span className={styles.name}>{f.name}</span>
                      </div>
                      <div className={`${styles.cell} ${styles.colOwner}`} role="cell">
                        {f.owner ? (
                          <>
                            <Avatar name={f.owner.name} color={f.owner.color} size={24} tooltip={false} />
                            <span className={styles.plain}>{f.owner.name}</span>
                          </>
                        ) : <span className={styles.plain}>--</span>}
                      </div>
                      <div className={`${styles.cell} ${styles.colUpdated}`} role="cell"><span className={styles.plain}>{displayDate(f.updatedAt ?? f.createdAt)}</span></div>
                      <div className={`${styles.cell} ${styles.colType}`} role="cell"><span className={styles.plain}>{fileTypeLabel(f)}</span></div>
                      <div className={`${styles.cell} ${styles.colSize}`} role="cell"><span className={styles.plain}>{fileSize(f.sizeBytes)}</span></div>
                      <div className={`${styles.cell} ${styles.colLocation}`} role="cell">
                        <Icon name="folder" size={20} weight={300} className={styles.locIcon} />
                        <span className={styles.plain}>{locationOf(f)}</span>
                      </div>
                      <div className={`${styles.cell} ${styles.colActions}`} role="cell">
                        <button type="button" className={styles.link} disabled={pending.has(f.id)}
                                onClick={() => { prune([f.id]); void run([f.id], () => onRestore([f.id])) }}>Restore</button>
                        <button type="button" className={styles.link} data-danger disabled={pending.has(f.id)}
                                onClick={() => setConfirm({ kind: 'forever', ids: [f.id] })}>Delete Forever</button>
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
                  { label: 'Delete Forever', tone: 'danger', onClick: () => setConfirm({ kind: 'forever', ids: [...liveSelected] }) },
                ]}
                onClear={() => setSelected(new Set())}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Permanent-delete confirmations — the Deleted Leads sheet's dialogs with file copy (unmocked; destructive actions must confirm).
          `nested`: over the open sheet, the lighter scrim on the layer above it (REG-725). */}
      <Dialog nested open={confirm?.kind === 'forever'} onClose={() => setConfirm(null)} width={400}
              title={confirm?.kind === 'forever' && confirm.ids.length > 1 ? `Delete ${confirm.ids.length} ${manyNoun} forever?` : `Delete this ${confirmNoun} forever?`}
              subtitle={confirmTarget?.name}
              footer={<>
                <Button variant="secondary" appearance="outlined" onPress={() => setConfirm(null)}>Cancel</Button>
                <DangerButton disabled={busy} onClick={() => {
                  if (confirm?.kind === 'forever') { const ids = confirm.ids; prune(ids); void run(ids, () => onDeleteForever(ids)) }
                  setConfirm(null)
                }}>Delete Forever</DangerButton>
              </>}>
        <span className={styles.confirmText}>
          {confirm?.kind === 'forever' && confirm.ids.length > 1
            ? manyNoun === 'files' ? 'This can’t be undone. These files will be removed permanently.' : 'This can’t be undone. These items, and everything inside the folders, will be removed permanently.'
            : confirmNoun === 'folder'
              ? 'This can’t be undone. The folder and everything inside it will be removed permanently.'
              : 'This can’t be undone. The file and its comments will be removed permanently.'}
        </span>
      </Dialog>

      <Dialog nested open={confirm?.kind === 'empty'} onClose={() => setConfirm(null)} width={400}
              title="Empty trash?"
              footer={<>
                <Button variant="secondary" appearance="outlined" onPress={() => setConfirm(null)}>Cancel</Button>
                <DangerButton disabled={busy} onClick={() => {
                  const ids = trashed.map((f) => f.id); setSelected(new Set()); void run(ids, () => onEmptyTrash()); setConfirm(null)
                }}>Empty Trash</DangerButton>
              </>}>
        <span className={styles.confirmText}>
          All {trashed.length} deleted {trashed.length === 1 ? 'file' : 'files'} will be removed permanently. This can’t be undone.
        </span>
      </Dialog>
    </>
  )
}
