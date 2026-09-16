'use client'

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

/**
 * Drag a column head to reorder it on the table itself (REG-462, owner 2026-09-16) — the same order Column settings edits.
 * Pointer-driven like the Payment Schedule rows (motion's Reorder): the head follows the pointer, the heads it passes slide
 * out of its way (a 160ms transform), and the order commits on release — the body's columns swap once then. A head is
 * draggable unless it is the selection column or the locked identity column; it moves only within its own block (pinned
 * among pinned, free among free); the resize handle, sort buttons and checkboxes keep their own pointer. Mouse / pen only —
 * a touch on a head still scrolls the table. `head(key)` spreads the handlers, `style(key)` the live transform.
 */
export type DragColumn = { key: string; pinned?: boolean; locked?: boolean }
type Rect = { key: string; mid: number; width: number }
type Session = { key: string; startX: number; pointerId: number; rects: Rect[]; active: boolean; to: number }
type Live = { key: string; dx: number; from: number; to: number; width: number }

/** `key` moved to the position that leaves `before` same-block heads ahead of it; other blocks keep their places. */
function moveWithinBlock(order: readonly string[], key: string, blockKeys: readonly string[], before: number): string[] {
  const others = blockKeys.filter((k) => k !== key)
  const block = [...others]; block.splice(Math.max(0, Math.min(before, others.length)), 0, key)
  let i = 0
  return order.map((k) => (blockKeys.includes(k) ? block[i++]! : k))
}

export function useColumnDrag(columns: readonly DragColumn[], onReorder: (keys: string[]) => void) {
  const [live, setLive] = useState<Live | null>(null)
  const session = useRef<Session | null>(null)
  const order = columns.map((c) => c.key)
  const find = (key: string) => columns.find((c) => c.key === key)
  const movable = (key: string) => { const c = find(key); return !!c && !c.locked && key !== 'sel' }
  const sameBlock = (a: string, b: string) => { const A = find(a), B = find(b); return !!A && !!B && !B.locked && !!A.pinned === !!B.pinned }
  const blockOf = (key: string) => order.filter((k) => k === key || sameBlock(key, k))

  const finish = (e: ReactPointerEvent<HTMLElement>, key: string, commit: boolean) => {
    const s = session.current
    if (!s || s.key !== key) return
    session.current = null
    try { e.currentTarget.releasePointerCapture(s.pointerId) } catch { /* already released */ }
    if (commit && s.active && s.to !== order.indexOf(key)) {
      const block = blockOf(key)
      const without = order.filter((k) => k !== key)
      const before = block.filter((k) => k !== key && without.indexOf(k) < s.to).length   // same-block heads ahead of the slot it was dropped in
      onReorder(moveWithinBlock(order, key, block, before))
    }
    setLive(null)
  }

  const head = (key: string) => ({
    'data-draggable': movable(key) || undefined,
    'data-dragging': live?.key === key || undefined,
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0 || e.pointerType === 'touch' || !movable(key)) return
      if ((e.target as HTMLElement).closest('[role="separator"], button, a, input, label')) return
      const row = e.currentTarget.parentElement
      if (!row) return
      const rects = order.map((k) => { const c = row.querySelector<HTMLElement>(`[data-col="${k}"]`); if (!c) return null; const r = c.getBoundingClientRect(); return { key: k, mid: (r.left + r.right) / 2, width: r.width } }).filter((r): r is Rect => !!r)
      session.current = { key, startX: e.clientX, pointerId: e.pointerId, rects, active: false, to: order.indexOf(key) }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const s = session.current
      if (!s || s.key !== key) return
      const dx = e.clientX - s.startX
      if (!s.active) { if (Math.abs(dx) < 4) return; s.active = true }
      e.preventDefault()
      const me = s.rects.find((r) => r.key === key)
      if (!me) return
      const centre = me.mid + dx
      const block = blockOf(key)
      const before = block.filter((k) => k !== key && (s.rects.find((r) => r.key === k)?.mid ?? Infinity) < centre).length
      const next = moveWithinBlock(order, key, block, before)
      const to = next.indexOf(key)
      s.to = to
      const from = order.indexOf(key)
      setLive((l) => (l && l.dx === dx && l.to === to ? l : { key, dx, from, to, width: me.width }))
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => finish(e, key, true),
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => finish(e, key, false),
  })

  /** The live transform: the dragged head under the pointer, the heads it has passed slid aside by its width. */
  const style = (key: string): CSSProperties | undefined => {
    if (!live) return undefined
    if (key === live.key) return { transform: `translateX(${live.dx}px)`, transition: 'none', zIndex: 6, cursor: 'grabbing' }
    const i = order.indexOf(key)
    if (i < 0) return undefined
    if (live.to > live.from && i > live.from && i <= live.to) return { transform: `translateX(${-live.width}px)`, transition: 'transform 160ms ease' }
    if (live.to < live.from && i >= live.to && i < live.from) return { transform: `translateX(${live.width}px)`, transition: 'transform 160ms ease' }
    return { transition: 'transform 160ms ease' }
  }
  return { head, style, dragging: live?.key ?? null }
}

/** The visible columns in their new order, the hidden ones kept after them — what a drag on the table saves back to the prefs. */
export function reorderColumns<T extends { key: string; visible: boolean }>(all: readonly T[], keys: readonly string[]): T[] {
  const byKey = new Map(all.map((c) => [c.key, c]))
  const ordered = keys.map((k) => byKey.get(k)).filter((c): c is T => !!c)
  return [...ordered, ...all.filter((c) => !c.visible && !keys.includes(c.key))]
}
