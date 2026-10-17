'use client'

import { useState } from 'react'
import { useLiveApply } from '@/components/om/use-live-apply'
import { Switch } from '@/components/ds'
import { ColumnSettingsDrawer as SharedDrawer, type ColumnItem } from '@/components/om/column-settings'
import { COLUMN_KEYS, COLUMN_LABEL, DEFAULT_COLUMNS, RENDERABLE_COLUMNS, type ColumnKey, type ColumnSettings } from '@/lib/quotes/items-model'
import styles from '@/components/om/column-settings.module.css'
import { HelpLink } from '@/components/company/help-link'

/**
 * The Items table's Column settings (1271:41169; REG-454): the shared drawer with the mock's "Item details" switches
 * (description · images · autonumber) as its leading section, no Pinned group — selection · # · Item and Total are the
 * table's fixed frozen blocks (owner 2026-09-16: "keep its fixed selection") — and Reset to default, which also forgets dragged widths
 * (the caller's `onReset`). (REG-459: the details rows were briefly information-only; the owner reverted to the mock the same day.)
 * (pending modules S04 — card held:quotes, "SKU and Add New Column; eight column switches refused — Coming soon · revisit: hide the switches
 * (1.0's SKU was real but always blank; its custom columns were unreachable)") The drawer lists only the columns the table draws: SKU, MSRP,
 * Color, Dimensions, Materials, Shipping, Shipping Markup and Taxable left the list (their stored state is kept, as Rebate's is for a
 * member who never sees it), and Add New Column went with them — no press answers "Coming soon" here any more.
 */
export function ColumnSettingsDrawer({ open, value, onClose, onSave, onReset, clientColumns, hidden, previewHref }: { open: boolean; value: ColumnSettings; onClose: () => void; onSave: (v: ColumnSettings) => void; onReset: () => void; /** (REG-497) the columns the template prints; the "Show only what the client sees" switch */ clientColumns?: Set<string> | null; /** (REG-596) columns this member never sees — the owner-only Rebate; they keep their stored state */ hidden?: ColumnKey[]
  /** (S44I — UAT row 352's third part, S44Q's hand-off) Preview with its What your client sees panel open — where the print's columns are set */
  previewHref?: string }) {
  const hide: ColumnKey[] = [...(hidden ?? []), ...COLUMN_KEYS.filter((k) => !RENDERABLE_COLUMNS.includes(k))]   // (S04) only what the table draws
  const [details, setDetails] = useState(value.details)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setDetails(value.details) }
  /* (REG-464) A detail switch reaches the table at once, like the column switches the shared drawer applies live. */
  useLiveApply(open, details, value.details, true, (d) => onSave({ details: d, columns: value.columns }), (a, b) => a.description === b.description && a.images === b.images && a.autonumber === b.autonumber)
  const toItems = (cols: ColumnSettings['columns']): ColumnItem[] => cols.filter((c) => !hide.includes(c.key)).map((c) => ({ key: c.key, label: COLUMN_LABEL[c.key], visible: c.on, pinned: false }))
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
      {/* (S44I — row 352) these are the studio's working columns; what the client's paper shows is set per quote in Preview */}
      {previewHref ? <p className={styles.note} data-testid="working-columns-note">Your working columns — the print follows <HelpLink href={previewHref}>What your client sees</HelpLink> in Preview.</p> : null}
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
    <SharedDrawer open={open} onClose={onClose} columns={toItems(value.columns)} extras={extras} anchorNote="Total stays at the right."
                  onSave={(next) => onSave({ details, columns: [...next.map((c) => ({ key: c.key as ColumnKey, on: c.visible })), ...value.columns.filter((c) => hide.includes(c.key))] })}
                  onReset={() => { onReset(); setDetails(DEFAULT_COLUMNS.details); return toItems(DEFAULT_COLUMNS.columns) }} />   /* hidden columns keep their stored state — onSave puts them back after the shown ones */
  )
}
