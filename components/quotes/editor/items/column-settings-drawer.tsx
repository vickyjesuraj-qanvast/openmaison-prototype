'use client'

import { useState, type KeyboardEvent } from 'react'
import { Reorder, useDragControls } from 'motion/react'
import { Button, Switch } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { useComingSoon } from '@/components/om/snackbar'
import { COLUMN_LABEL, RENDERABLE_COLUMNS, type ColumnKey, type ColumnSettings } from '@/lib/quotes/items-model'
import styles from './items-section.module.css'

/**
 * Column settings (1271:41169): "Toggle columns you want to see. Drag columns up or down to reorder them." — ITEM DETAILS
 * (description · images · autonumber) then MANAGE COLUMNS, each row a handle, the label and a Switch; footer Add New Column
 * (coming soon) · Save. Columns the table cannot draw yet stay in the list and answer coming soon when switched on.
 */
export function ColumnSettingsDrawer({ open, value, onClose, onSave }: { open: boolean; value: ColumnSettings; onClose: () => void; onSave: (v: ColumnSettings) => void }) {
  const comingSoon = useComingSoon()
  const [draft, setDraft] = useState<ColumnSettings>(value)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setDraft(value) }   // every opening starts from what the table shows
  const setDetail = (k: keyof ColumnSettings['details'], on: boolean) => setDraft((d) => ({ ...d, details: { ...d.details, [k]: on } }))
  const setCol = (key: ColumnKey, on: boolean) => {
    if (on && !RENDERABLE_COLUMNS.includes(key)) { comingSoon(); return }
    setDraft((d) => ({ ...d, columns: d.columns.map((c) => (c.key === key ? { ...c, on } : c)) }))
  }
  /* Keyboard reorder (REG-417): ArrowUp / ArrowDown on a row's handle swaps it with its neighbour — the pointer drag's second channel. */
  const move = (key: ColumnKey, dir: -1 | 1) => setDraft((d) => {
    const i = d.columns.findIndex((c) => c.key === key); const j = i + dir
    if (i < 0 || j < 0 || j >= d.columns.length) return d
    const columns = [...d.columns]; const [row] = columns.splice(i, 1); columns.splice(j, 0, row!)
    return { ...d, columns }
  })
  return (
    <Drawer open={open} title="Settings" onClose={onClose} label="Column settings"
            footer={<><Button variant="secondary" appearance="outlined" onPress={comingSoon}>Add New Column</Button><Button onPress={() => { onSave(draft); onClose() }}>Save</Button></>}>
      <div className={styles.settings}>
        <p className={styles.settingsHelp}>Toggle columns you want to see. Drag columns up or down to reorder them.</p>
        <div className={styles.setGroup}>
          <div className={styles.eyebrow}>Item details</div>
          <div className={styles.setList}>
            {([['description', 'Show item description'], ['images', 'Show images'], ['autonumber', 'Show autonumber']] as const).map(([k, label]) => (
              <div key={k} className={styles.setRow}>
                <span className={styles.setLabel}>{label}</span>
                <Switch isSelected={draft.details[k]} onChange={(v: boolean) => setDetail(k, v)} aria-label={label} />
              </div>
            ))}
          </div>
        </div>
        <div className={styles.setDivider} />
        <div className={styles.setGroup}>
          <div className={styles.eyebrow}>Manage columns</div>
          <Reorder.Group as="ul" axis="y" values={draft.columns.map((c) => c.key)} className={styles.setList}
                         onReorder={(keys: ColumnKey[]) => setDraft((d) => ({ ...d, columns: keys.map((k) => d.columns.find((c) => c.key === k)!) }))}>
            {draft.columns.map((c) => <ColumnRow key={c.key} col={c} onToggle={(on) => setCol(c.key, on)} onMove={(dir) => move(c.key, dir)} />)}
          </Reorder.Group>
        </div>
      </div>
    </Drawer>
  )
}

function ColumnRow({ col, onToggle, onMove }: { col: { key: ColumnKey; on: boolean }; onToggle: (on: boolean) => void; onMove: (dir: -1 | 1) => void }) {
  const controls = useDragControls()
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); onMove(-1) }
    if (e.key === 'ArrowDown') { e.preventDefault(); onMove(1) }
  }
  return (
    <Reorder.Item as="li" value={col.key} dragListener={false} dragControls={controls} className={styles.setRow}>
      <Tooltip label="Drag to reorder">
        <button type="button" className={styles.setHandle} aria-label={`Drag to reorder ${COLUMN_LABEL[col.key]} (arrow keys move it)`} onPointerDown={(e) => controls.start(e)} onKeyDown={onKey}>
          <Icon name="drag_indicator" size={20} weight={300} />
        </button>
      </Tooltip>
      <span className={styles.setLabel}>{COLUMN_LABEL[col.key]}</span>
      <Switch isSelected={col.on} onChange={onToggle} aria-label={COLUMN_LABEL[col.key]} />
    </Reorder.Item>
  )
}
