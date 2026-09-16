'use client'

import { ColumnSettingsDrawer as SharedDrawer, type ColumnItem } from '@/components/om/column-settings'
import { useComingSoon } from '@/components/om/snackbar'
import styles from '@/components/om/column-settings.module.css'
import { COLUMN_LABEL, DEFAULT_COLUMNS, RENDERABLE_COLUMNS, type ColumnKey, type ColumnSettings } from '@/lib/quotes/items-model'

/**
 * The Items table's Column settings (1271:41169; REG-454): the shared drawer, no Pinned group — selection · # · Item and Total
 * are the table's fixed frozen blocks (owner 2026-09-16: "keep its fixed selection") — "Add New Column" (coming soon) and
 * Reset to default, which also forgets dragged widths (the caller's `onReset`). Columns the table cannot draw yet stay listed
 * and answer coming soon. The mock's "Item details" rows (description · images · autonumber) stay as information but carry no
 * switch (REG-459, owner 2026-09-16: they belong to the frozen Item block, which always shows all three — "remove only the
 * switch and retain the info"); the stored `details` ride along untouched.
 */
export function ColumnSettingsDrawer({ open, value, onClose, onSave, onReset }: { open: boolean; value: ColumnSettings; onClose: () => void; onSave: (v: ColumnSettings) => void; onReset: () => void }) {
  const comingSoon = useComingSoon()
  const toItems = (cols: ColumnSettings['columns']): ColumnItem[] => cols.map((c) => ({ key: c.key, label: COLUMN_LABEL[c.key], visible: c.on, pinned: false }))
  const extras = (
    <div className={styles.group}>
      <div className={styles.eyebrow}>Item details</div>
      <ul className={styles.list} aria-label="Item details, always shown">
        {/* (owner 2026-09-16) The frozen block's two columns, named as the table heads them: "# Autonumber" · "Item". */}
        {['# Autonumber', 'Item'].map((label) => (
          <li key={label} className={styles.row}><span className={styles.label}>{label}</span></li>
        ))}
      </ul>
      <div className={styles.divider} />
    </div>
  )
  return (
    <SharedDrawer open={open} onClose={onClose} columns={toItems(value.columns)} extras={extras} anchorNote="Total stays at the right." addColumn={comingSoon}
                  guardToggle={(key, on) => { if (on && !RENDERABLE_COLUMNS.includes(key as ColumnKey)) { comingSoon(); return false } return true }}
                  onSave={(next) => onSave({ details: value.details, columns: next.map((c) => ({ key: c.key as ColumnKey, on: c.visible })) })}
                  onReset={() => { onReset(); return toItems(DEFAULT_COLUMNS.columns) }} />
  )
}
