'use client'

import { useRef, useState, type ReactNode } from 'react'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { gridTemplateFor, useColumnLayout, useTableColumns, type TableColumnDef } from '@/components/om/table-columns'
import { useColumnDrag } from '@/components/om/column-drag'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import styles from './plan.module.css'

/**
 * (REG-704) One of Plan & AI credits' tables, on the listing's model like every table (REG-430 · 454 · 614): the first column frozen with
 * its 1px edge (the shadow only while scrolled sideways), heads resizable and draggable with the whole column travelling, the house
 * Column settings drawer from the section's tune button. A section head carries the title, one help line and the section's own tools.
 */
export function CreditsTable<T>({ table, title, help, defs, rows, rowKey, cell, actions, empty, testId, rowAttrs }: {
  table: string
  title: string
  help?: ReactNode
  defs: readonly TableColumnDef[]
  rows: readonly T[]
  rowKey: (r: T) => string
  cell: (r: T, key: string) => ReactNode
  actions?: ReactNode
  empty: ReactNode
  testId: string
  /** A row's own marks — the member an ask came from (`data-focus`). */
  rowAttrs?: (r: T) => Record<string, string | undefined>
}) {
  const mobile = useMediaQuery(MOBILE)
  const prefs = useTableColumns(table, defs, mobile)
  const [settings, setSettings] = useState(false)
  const widths = useColumnWidths(table)
  const tracks = gridTemplateFor(prefs.columns, widths)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(prefs.columns, headRow)
  const D = useColumnDrag(prefs.columns, prefs.reorder)
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) the whole column travels with its head */
  const pin = (key: string) => (L.pinned(key) ? ` ${styles.pin}` : '')
  return (
    <section className={styles.section} aria-label={title} data-testid={testId}>
      <div className={styles.sectionHead}>
        <div className={styles.sectionTitles}>
          <h2 className={styles.sectionTitle}>{title}</h2>
          {help ? <span className={styles.sectionHelp}>{help}</span> : null}
        </div>
        <div className={styles.sectionTools}>
          {actions}
          {mobile ? null : <Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={() => setSettings(true)} /></Tooltip>}
        </div>
      </div>
      {rows.length === 0 ? <p className={styles.empty}>{empty}</p> : (
        <div className={styles.card} role="table" aria-label={title} data-drag-root="" data-cols={table} style={{ '--tracks': tracks } as React.CSSProperties}
             onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
          <div ref={headRow} className={styles.head} role="row">
            {prefs.columns.map((c) => (
              <div key={c.key} className={`${styles.hCell}${pin(c.key)}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}>
                <span className={styles.hLabel}>{c.label}</span>
                <ColumnResizer table={table} column={c.key} label={c.label} min={c.locked ? 160 : 72} />
              </div>
            ))}
          </div>
          {rows.map((r) => (
            <div key={rowKey(r)} className={styles.row} role="row" {...(rowAttrs?.(r) ?? {})}>
              {prefs.columns.map((c) => (
                <div key={c.key} className={`${styles.cell}${pin(c.key)}`} role="cell" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)}>{cell(r, c.key)}</div>
              ))}
            </div>
          ))}
        </div>
      )}
      <ColumnSettingsDrawer open={settings} onClose={() => setSettings(false)} pinning={{ max: 3 }} columns={prefs.all} onSave={prefs.save} onReset={prefs.reset} />
    </section>
  )
}
