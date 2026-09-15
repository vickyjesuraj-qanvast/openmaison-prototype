'use client'

import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { setColumnWidth, useColumnWidths, type ColumnWidths } from '@/lib/table-widths'
import styles from './column-resize.module.css'

/**
 * The drag handle on a column head's right edge (REG-427): an 8px strip that reads `col-resize`, a 2px primary guide while it
 * is hovered, focused or dragged (the spreadsheet's rule between two heads). Drag sets the width live, release stores it;
 * double-click — or Home on the keyboard — forgets it (the sheet's auto-fit); ArrowLeft / ArrowRight step 8 (Shift: 32).
 * Sits INSIDE the head cell, which must be `position: relative`; it measures that cell for the starting width.
 */
export function ColumnResizer({ table, column, label, min = 56, max = 1600 }: {
  table: string
  column: string
  label: string
  min?: number
  max?: number
}) {
  const drag = useRef<{ startX: number; startW: number; last: number; raf: number } | null>(null)
  const el = useRef<HTMLDivElement>(null)
  const clamp = (px: number) => Math.max(min, Math.min(max, px))
  const cellWidth = () => el.current?.parentElement?.getBoundingClientRect().width ?? min

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault(); e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startX: e.clientX, startW: cellWidth(), last: cellWidth(), raf: 0 }
    e.currentTarget.setAttribute('data-dragging', '')
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const px = clamp(d.startW + (e.clientX - d.startX))
    d.last = px
    if (!d.raf) d.raf = requestAnimationFrame(() => { d.raf = 0; setColumnWidth(table, column, d.last, false) })
  }
  const end = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    if (d.raf) cancelAnimationFrame(d.raf)
    e.currentTarget.removeAttribute('data-dragging')
    document.body.style.cursor = ''; document.body.style.userSelect = ''
    setColumnWidth(table, column, d.last, true)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 32 : 8
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setColumnWidth(table, column, clamp(cellWidth() + (e.key === 'ArrowRight' ? step : -step))) }
    else if (e.key === 'Home') { e.preventDefault(); setColumnWidth(table, column, null) }
  }
  return (
    <div ref={el} className={styles.handle} role="separator" aria-orientation="vertical" aria-label={`Resize ${label} column`} tabIndex={0}
         title="Drag to resize · double-click to fit"
         onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={end} onPointerCancel={end}
         onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); setColumnWidth(table, column, null) }}
         onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown} />
  )
}

/** For a flex table: `--cw-<key>: 0 0 <px>px` per dragged column — its stylesheet reads `flex: var(--cw-<key>, <default>)`. */
export function flexVars(widths: ColumnWidths, prefix = '--cw-'): Record<string, string> | undefined {
  const keys = Object.keys(widths)
  if (!keys.length) return undefined
  return Object.fromEntries(keys.map((k) => [`${prefix}${k}`, `0 0 ${widths[k]}px`]))
}

/** `grid-template-columns` for a table whose tracks are its stylesheet defaults unless the user dragged one. */
export function gridTracks(tracks: { key: string; track: string }[], widths: ColumnWidths): string | undefined {
  if (!tracks.some((t) => widths[t.key] !== undefined)) return undefined   // untouched: the stylesheet's own template
  return tracks.map((t) => (widths[t.key] !== undefined ? `${widths[t.key]}px` : t.track)).join(' ')
}

export { useColumnWidths }
