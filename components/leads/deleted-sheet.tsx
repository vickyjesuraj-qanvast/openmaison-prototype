'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox } from '@/components/ds'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { BulkBar } from '@/components/leads/bulk-bar'
import { DangerButton, Dialog } from '@/components/leads/move-stage/dialogs'
import { modalPanel, overlayFade } from '@/lib/motion'
import { displayDate, money, titleCaseName } from '@/lib/format'
import type { Lead } from '@/lib/db/schema'
import styles from './deleted-sheet.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'

type Key = 'name' | 'stage' | 'source' | 'budget' | 'propertyType' | 'created' | 'archived'
const COLS: { key: Key; label: string; width: number }[] = [
  { key: 'name', label: 'Lead Name', width: 176 },
  { key: 'stage', label: 'Stage', width: 146 },
  { key: 'source', label: 'Source', width: 132 },
  { key: 'budget', label: 'Budget (S$)', width: 138 },
  { key: 'propertyType', label: 'Property Type', width: 158 },
  { key: 'created', label: 'Created', width: 137 },
  { key: 'archived', label: 'Archived', width: 137 },
]
const ACTIONS_W = 252

type Sort = { key: Key; dir: 'asc' | 'desc' } | null
function sortValue(l: Lead, key: Key): string | number {
  switch (key) {
    case 'name': return l.name.toLowerCase()
    case 'stage': return l.stage
    case 'source': return l.source
    case 'budget': return l.budgetMinor
    case 'propertyType': return l.propertyType
    case 'created': return l.createdAt.getTime()
    case 'archived': return l.deletedAt?.getTime() ?? 0
  }
}

export function DeletedLeadsSheet({
  open, deleted, onClose, onRestore, onDeleteForever, onEmptyTrash,
}: {
  open: boolean
  deleted: Lead[]
  onClose: () => void
  onRestore: (ids: string[]) => void | Promise<void>
  onDeleteForever: (ids: string[]) => void | Promise<void>
  onEmptyTrash: () => void | Promise<void>
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const deletedWidths = useColumnWidths('deleted-leads')   // REG-427
  const cw = (key: string, mock: number) => deletedWidths[key] ?? mock
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<Sort>(null)
  const [bannerOpen, setBannerOpen] = useState(true)
  const [confirm, setConfirm] = useState<{ kind: 'forever'; ids: string[] } | { kind: 'empty' } | null>(null)
  const [wasOpen, setWasOpen] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)   // render-safe mirror of busyRef
  const busyRef = useRef(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setSelected(new Set()); setSort(null); setBannerOpen(true); setConfirm(null); setPending(new Set()) }
  }
  useEffect(() => { if (open) busyRef.current = false }, [open])

  // Every mutation runs through one ref-guarded runner: no double-fire from a
  // double-click or from AnimatePresence's frozen exiting tree; rows show pending.
  const run = async (ids: string[], fn: () => void | Promise<void>) => {
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

  /* (REG-287) aria-modal told assistive tech the page behind was inert while nothing held focus in: Tab walked
     straight out of the sheet. Same policy as Dialog / the Move stage window (components/om/surface.ts) — Esc
     closes this surface only while it is the topmost one (the Delete Forever / Empty trash alerts render after
     the sheet, so they own Esc while open — what the old `!confirm` gate hand-rolled), focus moves into the
     panel on open, Tab cycles inside it, and the opener gets focus back on close. */
  const panelRef = useRef<HTMLDivElement>(null)
  useEscapeLayer(open, panelRef, onClose)
  useDialogFocus(open, panelRef)

  const rows = useMemo(() => {
    if (!sort) return deleted
    const s = sort
    return [...deleted].sort((a, b) => {
      const av = sortValue(a, s.key); const bv = sortValue(b, s.key)
      const c = av < bv ? -1 : av > bv ? 1 : 0
      return s.dir === 'asc' ? c : -c
    })
  }, [deleted, sort])

  // Selection can only reference leads that still exist (restore/purge drop them).
  const liveSelected = useMemo(() => new Set([...selected].filter((id) => deleted.some((l) => l.id === id))), [selected, deleted])

  const cycle = (key: Key) =>
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null))
  const sortIcon = (key: Key) => sort?.key === key ? (sort.dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setSelected(liveSelected.size === deleted.length ? new Set() : new Set(deleted.map((l) => l.id)))

  // (REG-339) The sheet renders the Lead row itself, bypassing buildLeadRows — so it applies REG-329's read-time
  // title case here, wherever the name is printed, and a lead saved as "test" reads "Test" as it does in the listing.
  const confirmLead = confirm?.kind === 'forever' && confirm.ids.length === 1 ? deleted.find((l) => l.id === confirm.ids[0]) : undefined
  const confirmName = confirmLead ? titleCaseName(confirmLead.name) : undefined

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            {/* (REG-287) `outline: none`: focus lands on the panel on open (surface.ts) and the ring belongs to its
                controls — the same rule Dialog and the Move stage window carry in their stylesheets. */}
            <motion.div ref={panelRef} className={styles.panel} variants={modalPanel} role="dialog" aria-modal aria-label="Deleted Leads"
                        tabIndex={-1} style={{ outline: 'none' }}>
              <div className={styles.heading}>
                <div className={styles.titleBlock}>
                  <span className={styles.crumb}>Leads / </span>
                  <span className={styles.title}>Deleted Leads</span>
                </div>
                <Button variant="secondary" appearance="outlined" onPress={() => setConfirm({ kind: 'empty' })}
                        isDisabled={deleted.length === 0}>
                  Empty Trash
                </Button>
                <Tooltip label="Close">
                  <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
                    <Icon name="close" size={24} family="outlined" />
                  </button>
                </Tooltip>
              </div>

              <div className={styles.body} data-bulk={liveSelected.size > 0 || undefined}>
                {bannerOpen ? (
                  <div className={styles.banner} role="status">
                    <span>Deleted leads are permanently removed after 30 days.</span>
                    <Tooltip label="Dismiss">
                      <button type="button" className={styles.bannerClose} aria-label="Dismiss" onClick={() => setBannerOpen(false)}>
                        <Icon name="close" size={20} />
                      </button>
                    </Tooltip>
                  </div>
                ) : null}

                {/* One scroller for both axes: data-scrolled = sideways (frozen-column shadow, REG-144),
                    data-scrolled-y = down (sticky header's level-1 shadow, as the import wizard's tables). */}
                <div className={styles.tableWrap}
                     onScroll={(e) => {
                       e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)
                       e.currentTarget.toggleAttribute('data-scrolled-y', e.currentTarget.scrollTop > 0)
                     }}>
                  <div className={styles.table} role="table" aria-label="Deleted leads">
                    {/* (REG-286) ARIA grid roles: role="table"/role="row" were declared but the cells carried no
                        role, so a screen reader saw rows of generic children and dropped out of table mode —
                        no column announcements, no cell navigation. Additive only; nothing here is styled by role. */}
                    <div className={styles.headRow} role="row">
                      <span className={styles.selCell} role="columnheader">
                        <Checkbox
                          isSelected={deleted.length > 0 && liveSelected.size === deleted.length}
                          isIndeterminate={liveSelected.size > 0 && liveSelected.size < deleted.length}
                          onChange={toggleAll}
                          aria-label="Select all deleted leads"
                        />
                      </span>
                      {COLS.map((c, i) => (
                        <div key={c.key} className={`${styles.hCell}${i === 0 ? ` ${styles.pin}` : ''}`} style={{ width: cw(c.key, c.width) }} role="columnheader">
                          <button type="button" className={styles.hSort} data-sorted={sort?.key === c.key || undefined} onClick={() => cycle(c.key)}>
                            <span className={styles.hLabel}>{c.label}</span>
                            <Icon name={sortIcon(c.key)} size={16} />
                          </button>
                          <ColumnResizer table="deleted-leads" column={c.key} label={c.label} min={i === 0 ? 140 : 72} />
                        </div>
                      ))}
                      <div className={styles.hCell} style={{ width: ACTIONS_W }} role="columnheader">
                        <span className={styles.hLabel} style={{ color: 'var(--om-color-on-surface-secondary)' }}>Actions</span>
                      </div>
                    </div>

                    {rows.length === 0 ? (
                      <div className={styles.emptyRow}>No deleted leads.</div>
                    ) : rows.map((l) => (
                      <div key={l.id} className={styles.row} role="row" data-selected={liveSelected.has(l.id) || undefined}>
                        <span className={styles.selCell} role="cell">
                          <Checkbox isSelected={liveSelected.has(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${titleCaseName(l.name)}`} />
                        </span>
                        <div className={`${styles.cell} ${styles.pin}`} style={{ width: cw('name', 176) }} role="cell">
                          <span className={styles.twoLine}>
                            <span className={styles.name}>{titleCaseName(l.name)}</span>
                            <span className={styles.phone}>{l.phone}</span>
                          </span>
                        </div>
                        <div className={styles.cell} style={{ width: cw('stage', 146) }} role="cell"><span className={styles.plain}>{l.stage}</span></div>
                        <div className={styles.cell} style={{ width: cw('source', 132) }} role="cell"><span className={styles.plain}>{l.source}</span></div>
                        <div className={styles.cell} style={{ width: cw('budget', 138) }} role="cell"><span className={styles.plain}>{money(l.budgetMinor)}</span></div>
                        <div className={styles.cell} style={{ width: cw('propertyType', 158) }} role="cell"><span className={styles.plain}>{l.propertyType}</span></div>
                        <div className={styles.cell} style={{ width: cw('created', 137) }} role="cell"><span className={styles.plain}>{displayDate(l.createdAt)}</span></div>
                        <div className={styles.cell} style={{ width: cw('archived', 137) }} role="cell"><span className={styles.plain}>{l.deletedAt ? displayDate(l.deletedAt) : '—'}</span></div>
                        <div className={`${styles.cell} ${styles.actions}`} style={{ width: ACTIONS_W }} role="cell">
                          <button type="button" className={styles.link} disabled={pending.has(l.id)}
                                  onClick={() => { prune([l.id]); void run([l.id], () => onRestore([l.id])) }}>Restore</button>
                          <button type="button" className={styles.link} data-danger disabled={pending.has(l.id)}
                                  onClick={() => setConfirm({ kind: 'forever', ids: [l.id] })}>Delete Forever</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <span className={styles.note}>
                  Note: Deleted leads are hidden from the board and reports. Use the Restore button to restore a lead to its original status.
                </span>
              </div>

              <BulkBar
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

      {/* Permanent-delete confirmations — unmocked; destructive actions must confirm (REG). */}
      <Dialog open={confirm?.kind === 'forever'} onClose={() => setConfirm(null)} width={400}
              title={confirm?.kind === 'forever' && confirm.ids.length > 1 ? `Delete ${confirm.ids.length} leads forever?` : 'Delete this lead forever?'}
              subtitle={confirmName}
              footer={<>
                <Button variant="secondary" appearance="outlined" onPress={() => setConfirm(null)}>Cancel</Button>
                <DangerButton disabled={busy} onClick={() => {
                  if (confirm?.kind === 'forever') { const ids = confirm.ids; prune(ids); void run(ids, () => onDeleteForever(ids)) }
                  setConfirm(null)
                }}>Delete Forever</DangerButton>
              </>}>
        <span className={styles.confirmText}>This can’t be undone. The lead and its tasks will be removed permanently.</span>
      </Dialog>

      <Dialog open={confirm?.kind === 'empty'} onClose={() => setConfirm(null)} width={400}
              title="Empty trash?"
              footer={<>
                <Button variant="secondary" appearance="outlined" onPress={() => setConfirm(null)}>Cancel</Button>
                <DangerButton disabled={busy} onClick={() => {
                  const ids = deleted.map((l) => l.id); setSelected(new Set()); void run(ids, () => onEmptyTrash()); setConfirm(null)
                }}>Empty Trash</DangerButton>
              </>}>
        <span className={styles.confirmText}>
          All {deleted.length} deleted {deleted.length === 1 ? 'lead' : 'leads'} will be removed permanently. This can’t be undone.
        </span>
      </Dialog>
    </>
  )
}
