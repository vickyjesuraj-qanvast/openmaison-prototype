'use client'

import { useRef, type CSSProperties, type ReactNode } from 'react'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { gridTemplateFor, useColumnLayout, type TableColumn } from '@/components/om/table-columns'
import { useColumnDrag } from '@/components/om/column-drag'
import insights from '@/components/leads/insights/insights-view.module.css'

/** The table's classes — Leads › Insights' (insights-view.module.css, on the table core) or a sheet that composes them with its own extras. */
export type ReportTableClasses = { readonly [key: string]: string }

/**
 * (pending modules S23, moved here unchanged by S39) A Company › Reports table on the listing's model — Leads › Insights' (frozen first
 * column, resizable and draggable heads, Column settings), on its stylesheet; on a phone each row is a card whose lines name themselves with
 * their column's head (REG-727). The Meetings and Studio health tabs draw theirs with it; `css` is the caller's sheet (Leads › Insights' by
 * default), so a tab's own extras keep reaching its cells.
 */
export function ReportTable<R extends { id: string }>({ table, label, testId, rowTestId, rows, columns, onReorder, render, kbList, css = insights }: {
  table: string; label: string; testId: string; rowTestId: string; rows: readonly R[]
  columns: readonly TableColumn[]; onReorder: (keys: string[]) => void; render: (r: R, key: string) => ReactNode
  /** (REG-711…717) J / K walk the rows, Enter opens the row's link */
  kbList?: string
  /** needs card · head · hCell · hLabel · row · cell · pin */
  css?: ReportTableClasses
}) {
  const widths = useColumnWidths(table)
  const tracks = gridTemplateFor(columns, widths)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform — the whole column travels */
  const labelOf = (key: string) => { const c = columns.find((x) => x.key === key); return c && !c.locked ? c.label : undefined }
  return (
    <div className={css.card} role="table" data-drag-root="" aria-label={label} data-testid={testId} data-cols={table} data-kb-list={kbList} style={{ '--tracks': tracks } as CSSProperties}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      <div ref={headRow} className={css.head} role="row">
        {columns.map((c) => (
          <div key={c.key} className={`${css.hCell} ${c.pinned ? css.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}>
            <span className={css.hLabel}>{c.label}</span>
            <ColumnResizer table={table} column={c.key} label={c.label} min={c.locked ? 160 : 72} />
          </div>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.id} className={css.row} role="row" data-testid={rowTestId} data-kb-row={kbList ? '' : undefined} data-kb-id={kbList ? r.id : undefined}>
          {columns.map((c) => (
            <div key={c.key} className={`${css.cell} ${L.pinned(c.key) ? css.pin : ''}`} role="cell" data-col={c.key} data-label={labelOf(c.key)} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)}>
              {render(r, c.key)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
