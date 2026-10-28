'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox } from '@/components/ds'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { BulkBar } from '@/components/leads/bulk-bar'
import { DangerButton, Dialog, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { modalPanel, overlayFade } from '@/lib/motion'
import { displayDate, titleCaseName, phoneLocal } from '@/lib/format'
import { budgetCell } from '@/lib/leads/row-text'
import type { Lead } from '@/lib/db/schema'
import type { DeletedLead } from '@/lib/leads/queries'
import styles from './deleted-sheet.module.css'
import { useMediaQuery } from '@/lib/breakpoint'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { useLongPress } from '@/components/leads/quotes/use-long-press'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'

type Key = 'name' | 'stage' | 'source' | 'budget' | 'propertyType' | 'created' | 'deleted'
const COLS: { key: Key; label: string; width: number }[] = [
  { key: 'name', label: 'Lead Name', width: 176 },
  { key: 'stage', label: 'Stage', width: 146 },
  { key: 'source', label: 'Source', width: 132 },
  { key: 'budget', label: 'Budget (S$)', width: 138 },
  { key: 'propertyType', label: 'Property Type', width: 158 },
  { key: 'created', label: 'Created', width: 137 },
  { key: 'deleted', label: 'Deleted', width: 137 },   // (parity Q-11) the delete date's head reads "Deleted" — REG-502: never an Archive (the mock said "Archived")
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
    case 'deleted': return l.deletedAt?.getTime() ?? 0
  }
}

/** (Leads on the move, L3 — P-05 · A-26) A deleted lead on a phone: the listing card's head — the name, the number — "Deleted 5 Oct ’26 · {stage}",
 *  Restore as its one button and Delete forever in its ⋮ (refused in the row while its project exists); a hold selects it for the bulk bar. */
function DeletedCard({ lead, selected, selecting, pending, heldWhy, onToggle, onRestore, onForever }: {
  lead: DeletedLead; selected: boolean; selecting: boolean; pending: boolean; heldWhy: string | null
  onToggle: () => void; onRestore: () => void; onForever: () => void
}) {
  const [menu, setMenu] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const hold = useLongPress(onToggle)
  return (
    <li className={styles.dCard} data-selected={selected || undefined} data-testid="deleted-lead-card" {...hold.handlers}
        onClick={(e) => { if (hold.swallowClick()) return; if (selecting && !(e.target as HTMLElement).closest('button')) onToggle() }}>
      <span className={styles.dMain}>
        <span className={styles.dName}>{titleCaseName(lead.name)}</span>
        <span className={styles.dMeta}>{[phoneLocal(lead.phone), lead.stage].filter(Boolean).join(' · ')}</span>
        <span className={styles.dMeta}>{lead.deletedAt ? `Deleted ${displayDate(lead.deletedAt)}` : 'Deleted'}</span>
      </span>
      <span className={styles.dActs}>
        <Button variant="primary" appearance="outlined" isDisabled={pending} onPress={onRestore} data-testid="deleted-lead-restore">Restore</Button>
        <span ref={anchor} className={styles.dMenu}>
          <IconButton icon="more_vert" label={`More actions for ${titleCaseName(lead.name)}`} variant="bare" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((o) => !o)} />   {/* a card's ⋮ is a bare glyph, as the Quotes card's */}
          <PortalMenu open={menu} anchor={anchor} onClose={() => setMenu(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={titleCaseName(lead.name)}>
            <DropdownItem onSelect={() => { setMenu(false); onToggle() }}>{selected ? 'Unselect' : 'Select'}</DropdownItem>
            <DropdownItem tone="danger" disabled={pending || !!heldWhy} title={heldWhy ? `Can’t delete forever — ${heldWhy}` : undefined} onSelect={() => { setMenu(false); onForever() }}>Delete forever</DropdownItem>
          </PortalMenu>
        </span>
      </span>
    </li>
  )
}

export function DeletedLeadsSheet({
  open, deleted, onClose, onRestore, onDeleteForever, onEmptyTrash,
}: {
  open: boolean
  /** (fix-E, E-01 · E-09) each with the project that keeps it from being deleted forever */
  deleted: DeletedLead[]
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
  const [confirm, setConfirm] = useState<{ kind: 'forever'; ids: string[] } | { kind: 'empty' } | null>(null)
  const [wasOpen, setWasOpen] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)   // render-safe mirror of busyRef
  const busyRef = useRef(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setSelected(new Set()); setSort(null); setConfirm(null); setPending(new Set()) }
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
  /* (Leads on the move, L3 — A-26) On a phone the trash is a list of cards — REG-378 gave Deleted Files the list; Deleted Leads was still the
     8-column table (1,316 wide in 356, Restore ~960px to the right). Empty Trash moves under the head's ⋮. */
  const phone = useMediaQuery('(max-width: 767px), (max-width: 1024px) and (orientation: portrait)')   // the phone model: a phone, or a tablet held upright (Q-01)
  const [headMenu, setHeadMenu] = useState(false)
  const headMenuRef = useRef<HTMLSpanElement>(null)

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
  /* (fix-E, E-01 · E-09) A lead whose project still exists is never purged (the project would go with it, unseen): the confirms count only
     what will go and name what stays. */
  const heldWhy = (l: DeletedLead) => (l.heldBy ? (l.heldBy.deleted ? `${l.heldBy.number} is in Deleted projects — delete it forever there first` : `its project ${l.heldBy.number} is live — delete the project first`) : null)
  const stayLine = (list: DeletedLead[]) => {
    const held = list.filter((l) => l.heldBy)
    if (!held.length) return null
    return held.length === 1 ? `${titleCaseName(held[0]!.name)} stays: ${heldWhy(held[0]!)}.` : `${held.length} leads stay — their projects still exist; delete those first.`
  }
  const foreverList = confirm?.kind === 'forever' ? deleted.filter((l) => confirm.ids.includes(l.id)) : []
  const foreverGo = foreverList.filter((l) => !l.heldBy).length
  const emptyGo = deleted.filter((l) => !l.heldBy).length

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            {/* (REG-287) Focus lands on the panel on open (surface.ts) and the ring belongs to its controls — the house panel
                (surfaceClasses.panel) carries the `outline: none`, with the look every dialog wears. */}
            <motion.div ref={panelRef} className={`${surfaceClasses.panel} ${styles.panel}`} variants={modalPanel} role="dialog" aria-modal aria-label="Deleted leads"
                        tabIndex={-1}>
              {/* (REG-725) the house head and foot: the crumb is the head's eyebrow, Empty Trash its one action before the close; no foot. */}
              <SurfaceHead title="Deleted leads" eyebrow="Leads /" className={styles.heading} onClose={onClose}
                           actions={phone ? (
                             /* (A-26) the destructive one, one press further: the head's ⋮ — never an outlined button beside ✕ */
                             <span ref={headMenuRef} className={styles.dMenu}>
                               <IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={headMenu} onClick={() => setHeadMenu((o) => !o)} data-testid="deleted-head-menu" />
                               <PortalMenu open={headMenu} anchor={headMenuRef} onClose={() => setHeadMenu(false)} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle="Deleted leads">
                                 <DropdownItem tone="danger" disabled={deleted.length === 0} onSelect={() => { setHeadMenu(false); setConfirm({ kind: 'empty' }) }}>Delete all forever</DropdownItem>
                               </PortalMenu>
                             </span>
                           ) : (
                             <Button variant="secondary" appearance="outlined" onPress={() => setConfirm({ kind: 'empty' })}
                                     isDisabled={deleted.length === 0}>
                               Delete all forever
                             </Button>
                           )} />

              <div className={styles.body} data-bulk={liveSelected.size > 0 || undefined}>
                {/* (the calm UI build 2026-10-27 — audit 2-31, W-510 · W-575) the rule said once, in one quiet line under the title — it was an orange
                    band (with its ✕) AND a foot note; Restore is every row's own button */}
                <p className={styles.lead} role="status" data-testid="deleted-rule">Deleted leads are removed for good after 30 days.</p>

                {phone ? (
                  rows.length === 0 ? <div className={styles.emptyRow}>No deleted leads.</div> : (
                    <ul className={styles.dList} aria-label="Deleted leads" data-testid="deleted-leads-cards">
                      {rows.map((l) => (
                        <DeletedCard key={l.id} lead={l} selected={liveSelected.has(l.id)} selecting={liveSelected.size > 0} pending={pending.has(l.id)} heldWhy={heldWhy(l)}
                                     onToggle={() => toggle(l.id)}
                                     onRestore={() => { prune([l.id]); void run([l.id], () => onRestore([l.id])) }}
                                     onForever={() => setConfirm({ kind: 'forever', ids: [l.id] })} />
                      ))}
                    </ul>
                  )
                ) : (
                /* One scroller for both axes: data-scrolled = sideways (frozen-column shadow, REG-144),
                    data-scrolled-y = down (sticky header's level-1 shadow, as the import wizard's tables). */
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
                        <div key={c.key} className={`${styles.hCell}${i === 0 ? ` ${styles.pin}` : ''}`} data-pin-edge={i === 0 || undefined} style={{ width: cw(c.key, c.width) }} role="columnheader">
                          {c.key === 'source' || c.key === 'propertyType' ? (
                            /* (REG-468) categories the filter serves — no sort glyph */
                            <span className={styles.hLabel}>{c.label}</span>
                          ) : (
                          <button type="button" className={styles.hSort} data-sorted={sort?.key === c.key || undefined} onClick={() => cycle(c.key)}>
                            <span className={styles.hLabel}>{c.label}</span>
                            <Icon name={sortIcon(c.key)} size={16} />
                          </button>
                          )}
                          <ColumnResizer table="deleted-leads" column={c.key} label={c.label} min={i === 0 ? 140 : 72} />
                        </div>
                      ))}
                      <div className={styles.hCell} style={{ width: ACTIONS_W }} role="columnheader">
                        <span className={styles.hLabel}>Actions</span>
                      </div>
                    </div>

                    {rows.length === 0 ? (
                      <div className={styles.emptyRow}>No deleted leads.</div>
                    ) : rows.map((l) => (
                      <div key={l.id} className={styles.row} role="row" data-selected={liveSelected.has(l.id) || undefined}>
                        <span className={`${styles.cell} ${styles.selCell}`} role="cell">
                          <Checkbox isSelected={liveSelected.has(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${titleCaseName(l.name)}`} />
                        </span>
                        <div className={`${styles.cell} ${styles.pin}`} data-pin-edge="" style={{ width: cw('name', 176) }} role="cell">
                          <span className={styles.twoLine}>
                            <span className={styles.name}>{titleCaseName(l.name)}</span>
                            <span className={styles.phone}>{phoneLocal(l.phone)}</span>
                          </span>
                        </div>
                        <div className={styles.cell} style={{ width: cw('stage', 146) }} role="cell"><span className={styles.plain}>{l.stage}</span></div>
                        <div className={styles.cell} style={{ width: cw('source', 132) }} role="cell"><span className={styles.plain}>{l.source}</span></div>
                        <div className={styles.cell} style={{ width: cw('budget', 138) }} role="cell"><span className={styles.plain}>{budgetCell(l.budgetMinor)}</span></div>
                        <div className={styles.cell} style={{ width: cw('propertyType', 158) }} role="cell"><span className={styles.plain}>{l.propertyType}</span></div>
                        <div className={styles.cell} style={{ width: cw('created', 137) }} role="cell"><span className={styles.plain}>{displayDate(l.createdAt)}</span></div>
                        <div className={styles.cell} style={{ width: cw('deleted', 137) }} role="cell"><span className={styles.plain}>{l.deletedAt ? displayDate(l.deletedAt) : '—'}</span></div>
                        <div className={`${styles.cell} ${styles.actions}`} style={{ width: ACTIONS_W }} role="cell">
                          <button type="button" className={styles.link} disabled={pending.has(l.id)}
                                  onClick={() => { prune([l.id]); void run([l.id], () => onRestore([l.id])) }}>Restore</button>
                          {/* (fix-E, E-09) a lead whose project still exists says why it can't go, in place of a press that would refuse */}
                          <Tooltip label={heldWhy(l) ? `Can’t delete forever — ${heldWhy(l)}` : ''} disabled={!l.heldBy}>
                            <button type="button" className={styles.link} data-danger disabled={pending.has(l.id) || !!l.heldBy} data-testid="deleted-lead-forever"
                                    onClick={() => setConfirm({ kind: 'forever', ids: [l.id] })}>Delete forever</button>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}

              </div>

              <BulkBar
                inset
                count={liveSelected.size}
                actions={[
                  { label: 'Restore', onClick: () => { const ids = [...liveSelected]; prune(ids); void run(ids, () => onRestore(ids)) } },
                  { label: 'Delete forever', tone: 'danger', onClick: () => setConfirm({ kind: 'forever', ids: [...liveSelected] }) },
                ]}
                onClear={() => setSelected(new Set())}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Permanent-delete confirmations — unmocked; destructive actions must confirm (REG). `nested`: over the open sheet, the lighter
          scrim on the layer above it (REG-725). */}
      <Dialog nested open={confirm?.kind === 'forever'} onClose={() => setConfirm(null)} width={400}
              title={foreverGo > 1 ? `Delete ${foreverGo} leads forever?` : foreverList.length && !foreverGo ? 'These leads can’t be deleted forever' : 'Delete this lead forever?'}
              subtitle={confirmName}
              footer={<>
                <Button variant="secondary" appearance="outlined" onPress={() => setConfirm(null)}>Cancel</Button>
                <DangerButton disabled={busy || foreverGo === 0} onClick={() => {
                  if (confirm?.kind === 'forever') { const ids = confirm.ids; prune(ids); void run(ids, () => onDeleteForever(ids)) }
                  setConfirm(null)
                }}>Delete forever</DangerButton>
              </>}>
        <span className={styles.confirmText}>{foreverGo ? `This can’t be undone. ${foreverGo > 1 ? 'The leads and their tasks' : 'The lead and its tasks'} will be removed permanently.` : null}{stayLine(foreverList) ? <>{foreverGo ? ' ' : ''}<span data-testid="forever-stays">{stayLine(foreverList)}</span></> : null}</span>
      </Dialog>

      <Dialog nested open={confirm?.kind === 'empty'} onClose={() => setConfirm(null)} width={400}
              title="Delete all forever?"
              footer={<>
                <Button variant="secondary" appearance="outlined" onPress={() => setConfirm(null)}>Cancel</Button>
                <DangerButton disabled={busy || emptyGo === 0} onClick={() => {
                  const ids = deleted.filter((l) => !l.heldBy).map((l) => l.id); setSelected(new Set()); void run(ids, () => onEmptyTrash()); setConfirm(null)
                }}>Delete all forever</DangerButton>
              </>}>
        {/* (fix-E, E-01) the count is the set it removes — never a direct project's client, never a lead whose project still exists */}
        <span className={styles.confirmText} data-testid="empty-trash-count">
          {emptyGo === deleted.length ? `All ${deleted.length} deleted ${deleted.length === 1 ? 'lead' : 'leads'} will be removed permanently. This can’t be undone.`
            : emptyGo ? `${emptyGo} of the ${deleted.length} deleted leads will be removed permanently. This can’t be undone.` : null}
          {stayLine(deleted) ? <>{emptyGo ? ' ' : ''}{stayLine(deleted)}</> : null}
        </span>
      </Dialog>
    </>
  )
}
