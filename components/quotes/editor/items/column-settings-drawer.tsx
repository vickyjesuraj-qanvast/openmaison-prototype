'use client'

import { useState } from 'react'
import { useLiveApply } from '@/components/om/use-live-apply'
import { Switch } from '@/components/ds'
import { ColumnSettingsDrawer as SharedDrawer, type ColumnItem } from '@/components/om/column-settings'
import { useComingSoon } from '@/components/om/snackbar'
import { COLUMN_LABEL, DEFAULT_COLUMNS, RENDERABLE_COLUMNS, type ColumnKey, type ColumnSettings } from '@/lib/quotes/items-model'
import styles from '@/components/om/column-settings.module.css'

/**
 * The Items table's Column settings (1271:41169; REG-454): the shared drawer with the mock's "Item details" switches
 * (description · images · autonumber) as its leading section, no Pinned group — selection · # · Item and Total are the
 * table's fixed frozen blocks (owner 2026-09-16: "keep its fixed selection") — "Add New Column" (coming soon) and Reset to
 * default, which also forgets dragged widths (the caller's `onReset`). Columns the table cannot draw yet stay listed and
 * answer coming soon. (REG-459: the details rows were briefly information-only; the owner reverted to the mock the same day.)
 */
export function ColumnSettingsDrawer({ open, value, onClose, onSave, onReset, clientColumns }: { open: boolean; value: ColumnSettings; onClose: () => void; onSave: (v: ColumnSettings) => void; onReset: () => void; /** (REG-497) the columns the template prints; the "Show only what the client sees" switch */ clientColumns?: Set<string> | null }) {
  const comingSoon = useComingSoon()
  const [details, setDetails] = useState(value.details)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setDetails(value.details) }
  /* (REG-464) A detail switch reaches the table at once, like the column switches the shared drawer applies live. */
  useLiveApply(open, details, value.details, true, (d) => onSave({ details: d, columns: value.columns }), (a, b) => a.description === b.description && a.images === b.images && a.autonumber === b.autonumber)
  const toItems = (cols: ColumnSettings['columns']): ColumnItem[] => cols.map((c) => ({ key: c.key, label: COLUMN_LABEL[c.key], visible: c.on, pinned: false }))
  /* (REG-497) On = every visible column prints for the client; switching it on hides the internal ones (cost, markup …) and remembers what was on. */
  const [before, setBefore] = useState<ColumnSettings['columns'] | null>(null)
  const clientOnly = !!clientColumns && value.columns.filter((c) => c.on).every((c) => clientColumns.has(c.key))
  const setClientOnly = (on: boolean) => {
    if (!clientColumns) return
    if (on) { setBefore(value.columns); onSave({ details: value.details, columns: value.columns.map((c) => ({ ...c, on: c.on && clientColumns.has(c.key) })) }) }
    else if (before) { onSave({ details: value.details, columns: before }); setBefore(null) }
    else onSave({ details: value.details, columns: value.columns.map((c) => ({ ...c, on: c.on || RENDERABLE_COLUMNS.includes(c.key) })) })
  }
  const extras = (
    <div className={styles.group}>
      {clientColumns ? (
        <>
          <div className={styles.eyebrow}>Client view</div>
          <ul className={styles.list}>
            <li className={styles.row}>
              <span className={styles.label}>Show only what the client sees</span>
              <Switch size="sm" isSelected={clientOnly} onChange={(v: boolean) => setClientOnly(v)} aria-label="Show only what the client sees" />
            </li>
          </ul>
          <div className={styles.divider} />
        </>
      ) : null}
      <div className={styles.eyebrow}>Item details</div>
      <ul className={styles.list}>
        {([['description', 'Show item description'], ['images', 'Show images'], ['autonumber', 'Show autonumber']] as const).map(([k, label]) => (
          <li key={k} className={styles.row}>
            <span className={styles.label}>{label}</span>
            <Switch size="sm" isSelected={details[k]} onChange={(v: boolean) => setDetails((d) => ({ ...d, [k]: v }))} aria-label={label} />
          </li>
        ))}
      </ul>
      <div className={styles.divider} />
    </div>
  )
  return (
    <SharedDrawer open={open} onClose={onClose} columns={toItems(value.columns)} extras={extras} anchorNote="Total stays at the right." addColumn={comingSoon}
                  guardToggle={(key, on) => { if (on && !RENDERABLE_COLUMNS.includes(key as ColumnKey)) { comingSoon(); return false } return true }}
                  onSave={(next) => onSave({ details, columns: next.map((c) => ({ key: c.key as ColumnKey, on: c.visible })) })}
                  onReset={() => { onReset(); setDetails(DEFAULT_COLUMNS.details); return toItems(DEFAULT_COLUMNS.columns) }} />
  )
}
