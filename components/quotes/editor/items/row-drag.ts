'use client'

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { scrollParentOf } from '@/components/om/use-stuck'

/**
 * Drag a line (or a section with everything under it) to a new place with the pointer (REG-571, owner 2026-09-23: the drag
 * "is not visually smooth like it is in the payments"). The Payment Schedule's rows lift and slide (motion Reorder); this is
 * the same feel on the Items grid's nested, variable-height rows: the lifted block follows the pointer (a CSS variable, no
 * re-render per move), the rows it passes slide out of its way (160 ms), the slot follows the row under the pointer — the
 * upper half means before it, the lower half after it, and under an open section's title means inside it — and on release
 * the block settles into the gap before the order is written. The lifted block never leaves the table's own height (its
 * ghost stops at the first and last row), so the sideways scroller never grows a vertical bar. The window (or the card's
 * own scroller in Expand) scrolls while the pointer rides its edge. A finger drags too (the handle is touch-action: none).
 *
 * A slot is refused — and the last good one kept — when it would put a block inside itself, a section inside a sub-section
 * (or a section that holds sub-sections anywhere but the top), or a line into another View-by bucket.
 *
 * (Dane UAT, Figma 1549:34 pts 3 · 4) View by › Category takes its bucket rows into the drag (`kind: 'bucket'`, id `bucket:<name>`): a line
 * may land in another category — on its title row (first place) or beside its lines — and the drop says which (`bucket`); a section keeps
 * its own. A bucket row is dragged by its handle with all its lines and lands before another bucket or after one's lines; the bucket the
 * view keeps last (`fixed`, Uncategorized) stays last.
 */
export type DragRow = {
  id: string
  parentId: string | null
  kind: 'item' | 'group' | 'bucket'
  /** The View-by bucket the row is shown under (null in View by: None); a line stays in its own unless `crossBucket`. */
  bucket: string | null
  /** A section whose lines are shown (not folded): the slot under its title is its first place. */
  open: boolean
  /** A section that holds sub-sections stays at the top (REG-558). */
  hasSubs: boolean
  /** A bucket row that never moves and that nothing follows (Uncategorized, always the view's last). */
  fixed?: boolean
}
/** `bucket`: the View-by bucket a line was dropped into when it is not the one it came from (View by › Category only). */
export type DropSlot = { parentId: string | null; anchorId: string | null; where: 'before' | 'after' | 'inside'; bucket?: string | null }
type Live = { id: string; block: Set<string>; shift: Map<string, number>; depth: number }
type Rect = { top: number; bottom: number }
type Session = {
  id: string; idx: number; n: number; block: Set<string>
  rows: DragRow[]; rects: Rect[]; blockH: number
  sc: HTMLElement | null; root: HTMLElement; handle: HTMLElement; pointerId: number
  startY: number; lastClientY: number; active: boolean; slot: DropSlot | null; t: number; raf: number
}

const EDGE = 56      // px from the scroller's edge where auto-scroll starts
const MAX_V = 18     // px per frame at the very edge
const SETTLE = 170   // ms — the block's slide into its gap (the column drag's 160 + a frame)

export function useRowDrag({ root, rowsRef, onDrop, crossBucket = false }: {
  /** The table's wrap — the rows are found under it, `--row-dy` is set on it, and `data-row-drag` / `data-row-settle` mark the phases. */
  root: RefObject<HTMLElement | null>
  /** The rows as displayed, in order, with what the slot rules need. */
  rowsRef: RefObject<DragRow[]>
  onDrop: (id: string, slot: DropSlot) => void
  /** (Dane UAT) View by › Category: a line may be dropped into another bucket (its category follows). */
  crossBucket?: boolean
}) {
  const [live, setLive] = useState<Live | null>(null)
  const session = useRef<Session | null>(null)
  const latest = useRef(onDrop); useEffect(() => { latest.current = onDrop })

  const toDoc = (s: Session, clientY: number) => (s.sc ? clientY - s.sc.getBoundingClientRect().top + s.sc.scrollTop : clientY + window.scrollY)
  const others = (s: Session) => s.rows.map((r, i) => ({ r, i })).filter(({ i }) => i < s.idx || i >= s.idx + s.n)
  const depthOf = (s: Session, parentId: string | null) => { let d = 0; let p = parentId; const byId = new Map(s.rows.map((r) => [r.id, r])); while (p) { d++; p = byId.get(p)?.parentId ?? null } return d }

  const cross = useRef(crossBucket); useEffect(() => { cross.current = crossBucket })
  const valid = (s: Session, slot: DropSlot): boolean => {
    const dragged = s.rows[s.idx]!
    if (slot.parentId && s.block.has(slot.parentId)) return false
    const anchor = slot.anchorId ? s.rows.find((r) => r.id === slot.anchorId) : null
    if (dragged.kind === 'bucket') return !!anchor && anchor.kind === 'bucket' && !(anchor.fixed && slot.where === 'after')   // a bucket goes between buckets, never past the fixed last
    if (anchor && anchor.bucket !== dragged.bucket && !(cross.current && dragged.kind === 'item')) return false
    if (dragged.kind === 'group') {
      if (slot.parentId === null) return true
      const p = s.rows.find((r) => r.id === slot.parentId)
      return !!p && p.parentId === null && !dragged.hasSubs
    }
    return true
  }
  /** Where the block would be inserted among the OTHER displayed rows (0 … others.length). */
  const targetIndex = (s: Session, slot: DropSlot): number => {
    const o = others(s)
    const k = o.findIndex(({ r }) => r.id === slot.anchorId)
    if (k < 0) return o.length
    if (slot.where === 'before') return k
    if (slot.where === 'inside') return k + 1
    if (o[k]!.r.kind === 'bucket') { let end = k + 1; while (end < o.length && o[end]!.r.kind !== 'bucket') end++; return end }   // after a bucket = past all its lines
    // after: past the anchor and every displayed row under it
    const under = new Set<string>([slot.anchorId!])
    let end = k + 1
    while (end < o.length && o[end]!.r.parentId && under.has(o[end]!.r.parentId!)) { under.add(o[end]!.r.id); end++ }
    return end
  }
  const shifts = (s: Session, t: number): Map<string, number> => {
    const m = new Map<string, number>()
    if (t <= s.idx) for (let i = t; i < s.idx; i++) m.set(s.rows[i]!.id, s.blockH)
    else for (let i = s.idx + s.n; i < t + s.n && i < s.rows.length; i++) m.set(s.rows[i]!.id, -s.blockH)
    return m
  }
  const gapTop = (s: Session, t: number): number => {
    if (t <= s.idx) return s.rects[t]!.top
    const i = t + s.n
    return i < s.rows.length ? s.rects[i]!.top - s.blockH : s.rects[s.rows.length - 1]!.bottom - s.blockH
  }
  const samePlace = (s: Session, slot: DropSlot, t: number) => t === s.idx && slot.parentId === s.rows[s.idx]!.parentId && (slot.bucket === undefined || slot.bucket === s.rows[s.idx]!.bucket)

  const update = (s: Session, clientY: number) => {
    s.lastClientY = clientY
    const y = toDoc(s, clientY)
    const dyRaw = y - s.startY
    if (!s.active) {
      if (Math.abs(dyRaw) < 4) return
      s.active = true
      s.root.dataset.rowDrag = ''
      document.documentElement.classList.add('om-row-dragging')   // the page-wide grab cursor + no text selection (globals.css)
      setLive({ id: s.id, block: s.block, shift: new Map(), depth: depthOf(s, s.rows[s.idx]!.parentId) })
    }
    const blockTop = s.rects[s.idx]!.top, blockBottom = s.rects[s.idx + s.n - 1]!.bottom
    const dy = Math.max(s.rects[0]!.top - blockTop, Math.min(s.rects[s.rects.length - 1]!.bottom - blockBottom, dyRaw))
    s.root.style.setProperty('--row-dy', `${Math.round(dy)}px`)
    const o = others(s)
    if (!o.length) return
    let slot: DropSlot | null = null
    const first = o[0]!, last = o[o.length - 1]!
    if (s.rows[s.idx]!.kind === 'bucket') slot = bucketSlot(s, o, y)
    else if (y < s.rects[first.i]!.top) slot = first.r.kind === 'bucket' ? { parentId: null, anchorId: first.r.id, where: 'inside', bucket: first.r.bucket } : { parentId: first.r.parentId, anchorId: first.r.id, where: 'before', bucket: first.r.bucket }
    else if (y >= s.rects[last.i]!.bottom) {
      const top = [...o].reverse().find(({ r }) => r.parentId === null)
      slot = top ? (top.r.kind === 'bucket' ? { parentId: null, anchorId: top.r.id, where: 'inside', bucket: top.r.bucket } : { parentId: null, anchorId: top.r.id, where: 'after', bucket: top.r.bucket }) : null
    } else {
      for (const { r, i } of o) {
        const rc = s.rects[i]!
        if (y < rc.top || y >= rc.bottom) continue
        const upper = y < (rc.top + rc.bottom) / 2
        slot = r.kind === 'bucket' ? { parentId: null, anchorId: r.id, where: 'inside', bucket: r.bucket }   // a bucket's title: its first place
          : upper ? { parentId: r.parentId, anchorId: r.id, where: 'before', bucket: r.bucket }
          : r.kind === 'group' && r.open ? { parentId: r.id, anchorId: r.id, where: 'inside', bucket: r.bucket }
          : { parentId: r.parentId, anchorId: r.id, where: 'after', bucket: r.bucket }
        break
      }
    }
    if (!slot || !valid(s, slot)) return   // keep the last good slot
    const t = targetIndex(s, slot)
    const same = s.slot && s.slot.anchorId === slot.anchorId && s.slot.where === slot.where && s.slot.parentId === slot.parentId
    if (same) return
    s.slot = slot; s.t = t
    setLive({ id: s.id, block: s.block, shift: shifts(s, t), depth: depthOf(s, slot.parentId) })
  }

  /** A bucket on the move: before the bucket whose block the pointer is in (its upper half), else after that block. */
  const bucketSlot = (s: Session, o: { r: DragRow; i: number }[], y: number): DropSlot | null => {
    const heads = o.filter(({ r }) => r.kind === 'bucket')
    if (!heads.length) return null
    for (let h = 0; h < heads.length; h++) {
      const top = s.rects[heads[h]!.i]!.top
      const next = heads[h + 1]
      const bottom = next ? s.rects[next.i]!.top : s.rects[o[o.length - 1]!.i]!.bottom
      if (h === 0 && y < top) return { parentId: null, anchorId: heads[0]!.r.id, where: 'before' }
      if (y >= top && (y < bottom || !next)) return { parentId: null, anchorId: heads[h]!.r.id, where: y < (top + bottom) / 2 ? 'before' : 'after' }
    }
    return null
  }

  const tick = (s: Session) => {
    const y = s.lastClientY
    const top = s.sc ? s.sc.getBoundingClientRect().top : 0, bottom = s.sc ? s.sc.getBoundingClientRect().bottom : window.innerHeight
    let v = 0
    if (y < top + EDGE) v = -Math.ceil((1 - Math.max(0, y - top) / EDGE) * MAX_V)
    else if (y > bottom - EDGE) v = Math.ceil((1 - Math.max(0, bottom - y) / EDGE) * MAX_V)
    if (v && s.active) { if (s.sc) s.sc.scrollTop += v; else window.scrollBy(0, v); update(s, y) }
    s.raf = requestAnimationFrame(() => tick(s))
  }

  const cleanup = (s: Session) => {
    cancelAnimationFrame(s.raf)
    document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); document.removeEventListener('pointercancel', onCancel); document.removeEventListener('keydown', onKey)
    try { s.handle.releasePointerCapture(s.pointerId) } catch { /* already released */ }
    delete s.root.dataset.rowDrag; delete s.root.dataset.rowSettle
    s.root.style.removeProperty('--row-dy')
    document.documentElement.classList.remove('om-row-dragging')
    session.current = null
    setLive(null)
  }
  const end = (commit: boolean) => {
    const s = session.current
    if (!s) return
    cancelAnimationFrame(s.raf)
    if (!s.active) { cleanup(s); return }
    const slot = commit ? s.slot : null
    const moved = !!slot && !samePlace(s, slot, s.t)
    const blockTop = s.rects[s.idx]!.top
    s.root.dataset.rowSettle = ''
    s.root.style.setProperty('--row-dy', `${Math.round(moved ? gapTop(s, s.t) - blockTop : 0)}px`)
    session.current = null
    /* the drop names the bucket only when it is not the one the line came from */
    const from = s.rows[s.idx]!.bucket
    const out = slot ? { parentId: slot.parentId, anchorId: slot.anchorId, where: slot.where, ...(slot.bucket !== undefined && slot.bucket !== from && s.rows[s.idx]!.kind !== 'bucket' ? { bucket: slot.bucket } : {}) } : null
    window.setTimeout(() => {
      // The order lands and the transforms clear in one render, so the settled block never jumps back first.
      if (moved && out) latest.current(s.id, out)
      cleanup(s)
    }, SETTLE)
  }
  const onMove = (e: PointerEvent) => { const s = session.current; if (s && e.pointerId === s.pointerId) { if (s.active) e.preventDefault(); update(s, e.clientY) } }
  const onUp = (e: PointerEvent) => { const s = session.current; if (s && e.pointerId === s.pointerId) end(true) }
  const onCancel = () => end(false)
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); end(false) } }

  const start = (id: string, e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || session.current) return
    const rootEl = root.current
    if (!rootEl) return
    const rows = rowsRef.current ?? []
    const idx = rows.findIndex((r) => r.id === id)
    if (idx < 0) return
    const parentOf = new Map(rows.map((r) => [r.id, r.parentId]))
    const inBlock = (rid: string) => { let p = parentOf.get(rid) ?? null; while (p) { if (p === id) return true; p = parentOf.get(p) ?? null } return false }
    /* a bucket carries every row under it, up to the next bucket */
    const tail = rows[idx]!.kind === 'bucket' ? rows.slice(idx + 1, (() => { const k = rows.findIndex((r, j) => j > idx && r.kind === 'bucket'); return k < 0 ? rows.length : k })()).map((r) => r.id) : []
    const block = new Set<string>([id, ...tail, ...rows.filter((r) => inBlock(r.id)).map((r) => r.id)])
    let n = 1
    while (idx + n < rows.length && block.has(rows[idx + n]!.id)) n++
    const sc = scrollParentOf(rootEl)
    const s: Session = { id, idx, n, block, rows, rects: [], blockH: 0, sc, root: rootEl, handle: e.currentTarget, pointerId: e.pointerId, startY: 0, lastClientY: e.clientY, active: false, slot: null, t: idx, raf: 0 }
    const rectOf = (rid: string): Rect => { const el = rootEl.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(rid)}"], [data-drag-id="${CSS.escape(rid)}"]`); const r = el?.getBoundingClientRect(); return r ? { top: toDoc(s, r.top), bottom: toDoc(s, r.bottom) } : { top: 0, bottom: 0 } }
    s.rects = rows.map((r) => rectOf(r.id))
    s.blockH = s.rects[idx + n - 1]!.bottom - s.rects[idx]!.top
    s.startY = toDoc(s, e.clientY)
    session.current = s
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* a synthetic pointer (tests) has no capture; the document listeners still hear it */ }
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); document.addEventListener('pointercancel', onCancel); document.addEventListener('keydown', onKey)
    s.raf = requestAnimationFrame(() => tick(s))
  }

  useEffect(() => () => { const s = session.current; if (s) cleanup(s) }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  /** What a row wears while a drag runs: lifted (in the block), slid aside (px), and the lifted row's indent cue for the slot's depth. */
  const rowProps = (id: string): { dragging: boolean; shift: number; dropDepth: number | null; dragStyle?: CSSProperties } => {
    if (!live) return { dragging: false, shift: 0, dropDepth: null }
    if (live.block.has(id)) return { dragging: true, shift: 0, dropDepth: id === live.id ? live.depth : null }
    const px = live.shift.get(id) ?? 0
    return { dragging: false, shift: px, dropDepth: null, dragStyle: px ? { transform: `translateY(${px}px)` } : undefined }
  }
  return { start, rowProps, dragging: live?.id ?? null }
}
