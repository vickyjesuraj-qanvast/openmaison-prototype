'use client'

import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { useLiveApply } from './use-live-apply'
import { Reorder, useDragControls } from 'motion/react'
import { Button, Switch } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import styles from './column-settings.module.css'

/**
 * Column settings — ONE drawer for every table (REG-454, owner 2026-09-16: "propose a perfect use case with utmost consistency
 * … do it as we did in the items list"). Opens from the toolbar's `tune` icon; the Items drawer's shape everywhere:
 * the helper line, a table's own switches first when it has them (`extras`), then — where a table pins — the Pinned group
 * (up to `pinning.max`, the identity column locked first, REG-84 / REG-103, one divider under it, REG-147), then Manage
 * columns: drag (or arrow keys on the handle) to reorder, a switch to show. Footer: Reset to default · Done (changes apply live, REG-464). A fixed right
 * anchor (Items' Total) is not a row — `anchorNote` says so in one line.
 */
export type ColumnItem = { key: string; label: string; visible: boolean; pinned: boolean; locked?: boolean }

const normalise = (cols: ColumnItem[], pinning: boolean): ColumnItem[] => {
  if (!pinning) return cols.map((c) => ({ ...c, pinned: false }))
  const locked = cols.filter((c) => c.locked).map((c) => ({ ...c, pinned: true, visible: true }))
  const pinned = cols.filter((c) => !c.locked && c.pinned).map((c) => ({ ...c, visible: true }))   // pinned ⇒ visible
  const rest = cols.filter((c) => !c.locked && !c.pinned)
  return [...locked, ...pinned, ...rest]
}

export function ColumnSettingsDrawer({ open, onClose, columns, onSave, onReset, pinning, guardToggle, extras, anchorNote, addColumn }: {
  open: boolean
  onClose: () => void
  /** The table's columns as shown now, in order. */
  columns: ColumnItem[]
  onSave: (next: ColumnItem[]) => void
  /** Puts the table back (order, visibility, pins AND dragged widths) and returns the default list for the draft. */
  onReset: () => ColumnItem[]
  /** Show the Pinned group with this cap; absent for a table whose frozen block is fixed (Items). */
  pinning?: { max: number }
  /** Refuse a switch (return false) — Items answers "coming soon" for a column it cannot draw yet. */
  guardToggle?: (key: string, on: boolean) => boolean
  /** A table's own leading section (Items' "Item details"). */
  extras?: ReactNode
  anchorNote?: string
  /** "Add New Column" at the end of Manage columns, only where a table can grow columns. */
  addColumn?: () => void
}) {
  const pins = !!pinning
  const [draft, setDraft] = useState<ColumnItem[]>(() => normalise(columns, pins))
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setDraft(normalise(columns, pins)) }   // every opening starts from what the table shows
  /* (REG-464) Every change reaches the table as it happens — a column hides, pins, moves while the drawer is open; Done only closes. */
  useLiveApply(open, draft, columns, true, onSave, (a, b) => a.length === b.length && a.every((c, i) => c.key === b[i]?.key && c.visible === b[i]?.visible && c.pinned === b[i]?.pinned))
  const max = pinning?.max ?? 0
  const pinnedRows = pins ? draft.filter((c) => c.pinned) : []
  const rest = pins ? draft.filter((c) => !c.pinned) : draft
  const setCol = (key: string, patch: Partial<ColumnItem>) => setDraft((d) => normalise(d.map((c) => (c.key === key ? { ...c, ...patch } : c)), pins))
  const toggle = (key: string, on: boolean) => { if (guardToggle && !guardToggle(key, on)) return; setCol(key, { visible: on }) }
  const reorderGroup = (pinnedGroup: boolean, keys: string[]) => setDraft((d) => {
    const group = keys.map((k) => d.find((c) => c.key === k)!).filter(Boolean)
    return normalise(pinnedGroup ? [...group, ...d.filter((c) => !c.pinned)] : [...d.filter((c) => c.pinned), ...group], pins)
  })
  /* Keyboard reorder (REG-417): ArrowUp / ArrowDown on a row's handle swaps it with its neighbour inside its own group. */
  const move = (key: string, dir: -1 | 1) => setDraft((d) => {
    const i = d.findIndex((c) => c.key === key); const j = i + dir
    if (i < 0 || j < 0 || j >= d.length) return d
    const a = d[i]!, b = d[j]!
    if (a.locked || b.locked || a.pinned !== b.pinned) return d
    const next = [...d]; next.splice(i, 1); next.splice(j, 0, a)
    return next
  })
  const row = (c: ColumnItem) => (
    <ColumnRow key={c.key} col={c} pinning={pins}
               pinState={!pins ? 'none' : c.locked ? 'locked' : c.pinned ? 'pinned' : pinnedRows.length < max ? 'free' : 'hidden'}
               onPin={() => setCol(c.key, c.pinned ? { pinned: false } : { pinned: true, visible: true })}
               onToggle={(on) => toggle(c.key, on)} onMove={(dir) => move(c.key, dir)} />
  )
  return (
    <Drawer open={open} title="Column settings" onClose={onClose} label="Column settings"
            footer={<><Button variant="secondary" appearance="outlined" onPress={() => setDraft(normalise(onReset(), pins))}>Reset to default</Button><Button onPress={onClose}>Done</Button></>}>
      <div className={styles.settings}>
        <p className={styles.help}>Toggle columns you want to see. Drag columns up or down to reorder them.</p>
        {extras}
        {pins ? (
          <div className={styles.group}>
            <div className={styles.eyebrow}><Icon name="push_pin" size={16} fill />Pinned ({max} columns max)</div>
            <Reorder.Group as="ul" axis="y" values={pinnedRows.map((c) => c.key)} className={styles.list} onReorder={(keys: string[]) => reorderGroup(true, keys)}>
              {pinnedRows.map(row)}
            </Reorder.Group>
            <div className={styles.divider} />
          </div>
        ) : null}
        <div className={styles.group}>
          <div className={styles.eyebrow}>Manage columns</div>
          <Reorder.Group as="ul" axis="y" values={rest.map((c) => c.key)} className={styles.list} onReorder={(keys: string[]) => reorderGroup(false, keys)}>
            {rest.map(row)}
          </Reorder.Group>
          {addColumn ? <button type="button" className={styles.link} onClick={addColumn}>Add New Column</button> : null}
        </div>
        {anchorNote ? <p className={styles.note}>{anchorNote}</p> : null}
      </div>
    </Drawer>
  )
}

function ColumnRow({ col, pinning, pinState, onPin, onToggle, onMove }: {
  col: ColumnItem; pinning: boolean; pinState: 'none' | 'locked' | 'pinned' | 'free' | 'hidden'
  onPin: () => void; onToggle: (on: boolean) => void; onMove: (dir: -1 | 1) => void
}) {
  const controls = useDragControls()
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); onMove(-1) }
    if (e.key === 'ArrowDown') { e.preventDefault(); onMove(1) }
  }
  const pinLabel = pinState === 'locked' ? `${col.label} is always pinned` : pinState === 'pinned' ? `Unpin ${col.label}` : `Pin ${col.label}`
  return (
    <Reorder.Item as="li" value={col.key} dragListener={false} dragControls={controls} className={styles.row} data-locked={col.locked || undefined}>
      <Tooltip label={col.locked ? `${col.label} stays first` : 'Drag to reorder'}>
        <button type="button" className={styles.handle} data-locked={col.locked || undefined} disabled={col.locked}
                aria-label={col.locked ? `${col.label} stays first` : `Drag to reorder ${col.label} (arrow keys move it)`}
                onPointerDown={(e) => { if (!col.locked) controls.start(e) }} onKeyDown={onKey}>
          <Icon name="drag_indicator" size={20} weight={300} />
        </button>
      </Tooltip>
      <span className={styles.label}>{col.label}</span>
      {/* (owner 2026-09-16) A pinned column is visible by definition, so its row carries no switch — unpin it to hide it.
          The pin is the row's LAST item, so with or without a switch every pin sits on the same right edge. */}
      {col.pinned ? null : <Switch size="sm" isSelected={col.visible} onChange={onToggle} aria-label={`Show ${col.label} column`} />}
      {pinning ? (pinState === 'hidden' ? <span className={styles.pinSlot} aria-hidden /> : (
        <Tooltip label={pinLabel}>
          <button type="button" className={styles.pin} data-pinned={col.pinned || undefined} disabled={pinState === 'locked'} aria-label={pinLabel} aria-pressed={col.pinned} onClick={onPin}>
            <Icon name="push_pin" size={16} fill={col.pinned} />
          </button>
        </Tooltip>
      )) : null}
    </Reorder.Item>
  )
}
