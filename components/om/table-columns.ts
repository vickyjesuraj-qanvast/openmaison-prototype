'use client'

import { useLayoutEffect, useMemo, useState, type CSSProperties, type RefObject } from 'react'
import { resetColumnPrefs, saveColumnPrefs, useColumnPrefs } from '@/lib/column-prefs'
import { clearColumnWidths, type ColumnWidths } from '@/lib/table-widths'
import type { ColumnItem } from './column-settings'
import { reorderColumns } from './column-drag'

/**
 * One column model for every table that offers Column settings (REG-454): a table declares its columns once (`TableColumnDef`,
 * the identity column `locked`), the user's order / visibility / pins come from lib/column-prefs, and `useColumnLayout` turns
 * the result into what each cell needs — its grid position (or flex `order`), `display: none` when hidden, and the sticky
 * `left` of a pinned column measured from the head row (the fluid title has no width in CSS). Dragged widths (REG-430) still
 * live in lib/table-widths and are read here only to build the grid template.
 */
/** (Quotes on the move, K4 — P-11) `tabletHidden`: off by default on a touch tablet, where the first screen must carry the amount and the
    actions — the table's tablet default set is every column without it (Column settings keeps the rest, remembered per breakpoint). */
export type TableColumnDef = { key: string; label: string; track: string; locked?: boolean; hidden?: boolean; tabletHidden?: boolean }
export type TableColumn = TableColumnDef & { visible: boolean; pinned: boolean }

export function defaultColumns(defs: readonly TableColumnDef[]): TableColumn[] {
  return defs.map((d) => ({ ...d, visible: !d.hidden, pinned: !!d.locked }))
}
/** (P-11) The tablet default set: the desktop defaults less the columns marked `tabletHidden`. */
export function tabletDefaultColumns(defs: readonly TableColumnDef[]): TableColumn[] {
  return defs.map((d) => ({ ...d, visible: !d.hidden && !d.tabletHidden, pinned: !!d.locked }))
}

/** The table's columns as the user left them (the defaults on a phone, where the cards place every cell themselves).
    (P-11) `tablet` — a touch tablet: its own defaults (`tabletHidden` off) and its own remembered set, `om.columns.<table>.tablet`, so a
    column shown on the desk stays shown there and the tablet's first screen keeps the amount and the actions. */
export function useTableColumns(table: string, defs: readonly TableColumnDef[], phone = false, tablet = false) {
  const key = tablet ? `${table}.tablet` : table
  const defaults = useMemo(() => (tablet ? tabletDefaultColumns(defs) : defaultColumns(defs)), [defs, tablet])
  const prefs = useColumnPrefs<TableColumn>(key, defaults)
  const source = phone ? defaults : prefs
  const columns = useMemo(() => source.filter((c) => c.visible), [source])
  const all = useMemo<ColumnItem[]>(() => prefs.map((c) => ({ key: c.key, label: c.label, visible: c.visible, pinned: c.pinned, locked: c.locked })), [prefs])
  const save = (next: ColumnItem[]) => saveColumnPrefs(key, next)
  const reset = (): ColumnItem[] => { clearColumnWidths(table); resetColumnPrefs(key); return defaults.map((c) => ({ key: c.key, label: c.label, visible: c.visible, pinned: c.pinned, locked: c.locked })) }
  /** A head dragged on the table (REG-462): the visible order it lands in, the hidden columns kept after. */
  const reorder = (keys: string[]) => saveColumnPrefs(key, reorderColumns(prefs, keys).map((c) => ({ key: c.key, label: c.label, visible: c.visible, pinned: c.pinned, locked: c.locked })))
  return { columns, all, save, reset, reorder }
}

/** The grid template of the visible columns — a dragged width replaces the mocked track — after an optional leading track (the selection column). */
/**
 * (REG-733, owner 2026-09-29: "the buttons are hovering over the cell data … i like the way you have done in the quote editor >
 * items table total") `trail` = an empty last track as wide as the row's parked actions need, so at rest and scrolled to the end
 * they float over it, never over the last column's value (the Items table's Total, REG-446). `ACTIONS_TRAIL` has the two sizes.
 */
/** (REG-733) 24 inset + the controls + 12 clear − the last cell's own 24 padding: a button + kebab pair, or the kebab alone. */
export const ACTIONS_TRAIL = { pair: 128, kebab: 48 } as const

export function gridTemplateFor(columns: readonly TableColumn[], widths: ColumnWidths, leading?: string, trail?: number): string {
  return [leading, ...columns.map((c) => (widths[c.key] ? `${widths[c.key]}px` : c.track)), trail ? `${trail}px` : undefined].filter(Boolean).join(' ')
}

/**
 * Per-cell layout for one table: `style(key)` is the inline style every cell of that column wears (head and rows alike),
 * `pinned(key)` whether it carries the sticky class, `edge(key)` whether it is the last pinned column (the 1px edge and the
 * scroll shadow). Offsets are measured on the head row's `[data-col]` cells and follow every resize.
 */
export function useColumnLayout(columns: readonly TableColumn[], headRef: RefObject<HTMLElement | null>, { leading = 0, flex = false }: { leading?: number; flex?: boolean } = {}) {
  const pinnedKeys = useMemo(() => columns.filter((c) => c.pinned).map((c) => c.key), [columns])
  const [offsets, setOffsets] = useState<Record<string, number>>({})
  useLayoutEffect(() => {
    const head = headRef.current
    if (!head || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const next: Record<string, number> = {}
      let acc = 0
      for (const key of ['sel', ...pinnedKeys]) {
        const cell = head.querySelector<HTMLElement>(`[data-col="${key}"]`)
        if (!cell) continue
        next[key] = acc
        acc += cell.getBoundingClientRect().width
      }
      setOffsets((cur) => (Object.keys(next).every((k) => cur[k] === next[k]) && Object.keys(cur).length === Object.keys(next).length ? cur : next))
    }
    const ro = new ResizeObserver(measure)
    for (const key of ['sel', ...pinnedKeys]) { const cell = head.querySelector<HTMLElement>(`[data-col="${key}"]`); if (cell) ro.observe(cell) }
    return () => ro.disconnect()
  }, [headRef, pinnedKeys, columns])
  const index = useMemo(() => new Map(columns.map((c, i) => [c.key, i])), [columns])
  const edgeKey = pinnedKeys[pinnedKeys.length - 1] ?? (leading ? 'sel' : undefined)
  const style = (key: string): CSSProperties | undefined => {
    if (key === 'sel') return { left: 0 }
    const i = index.get(key)
    if (i === undefined) return { display: 'none' }
    /* A flex table reads the order from a variable (`.cell { order: var(--col-order) }`), so a phone stylesheet can place the cells its own way. */
    const pos: CSSProperties = flex ? ({ '--col-order': i + 1 } as CSSProperties) : { gridColumn: i + 1 + (leading ? 1 : 0), gridRow: 1 }
    return pinnedKeys.includes(key) ? { ...pos, left: offsets[key] ?? (leading || 0) } : pos
  }
  return { style, pinned: (key: string) => key === 'sel' ? leading > 0 : pinnedKeys.includes(key), edge: (key: string) => key === edgeKey, hidden: (key: string) => !index.has(key) }
}
