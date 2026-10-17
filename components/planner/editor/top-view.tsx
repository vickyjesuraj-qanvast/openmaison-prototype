'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { PlanDrawing, viewOf } from '../plan-drawing'
import { clamp, fitOpening, lengthText, normRot, planBounds, sideLine, snap, snapMeasure, snapPiece, snapRoomEdge, wallRuns, type PlanDoc, type Room, type Side } from '@/lib/planner/model'
import { svgToPng } from '../svg-png'
import type { LibraryMaterial } from '@/lib/visualizer/materials'
import type { Change } from './use-plan-state'
import styles from './top-view.module.css'

/*
 * (gaps build J, J-Q6 · J-Q8) The Top view — where every edit happens. Drag empty floor to pan (two fingers on a phone), ⌘ / Ctrl + wheel
 * or pinch to zoom, the bar's − % + and Fit. A press picks what it lands on — a piece, a door or window, a room — and a drag moves it: a
 * piece on the 5 cm grid and flush to a wall within 15 cm (Alt moves it freely), a room with its pieces, its edges snapping to the other
 * rooms', an opening along its wall. A picked room grows by its four edge handles; a picked piece turns by its handle (15° steps) and
 * stretches by its corner. Draw a room drags a new rectangle. A piece dragged in from the catalogue lands where it is dropped.
 * (parity map, TD-081) With the Ruler on, a press sets one end and a second press (or a drag) the other — each end lands on a room's edge or
 * a piece's side within 10 px, else on the centimetre (Alt: free) — and the length reads on the line; the editor's Escape clears it.
 * Furniture and Dimensions off leave the pieces, and the sizes and overall dimensions, out of the drawing.
 */
export type Measure = { a: { x: number; z: number }; b: { x: number; z: number } | null }

export type Sel = { kind: 'room' | 'piece' | 'opening'; id: string; roomId?: string } | null
export type TopHandle = { fit: () => void; zoom: (k: number) => void; centre: () => { x: number; z: number }; png: () => Promise<string | null>; scale: () => number }
type Props = {
  plan: PlanDoc
  library: LibraryMaterial[]
  sel: Sel
  onSel: (s: Sel) => void
  change: Change
  endGesture: () => void
  warn: ReadonlySet<string>
  readOnly: boolean
  drawing: boolean
  onDrawn: (r: { x: number; z: number; w: number; d: number }) => void
  moveUnderlay: boolean
  onDropPiece: (key: string, x: number, z: number) => void
  onZoom?: (pct: number) => void
  /** (parity map, TD-081) the View menu's Ruler, and what it has measured */ ruler?: boolean
  measure?: Measure | null
  onMeasure?: (m: Measure | null) => void
  /** (TD-081) the View menu's Furniture and Dimensions */ showPieces?: boolean
  showDims?: boolean
}

type Drag =
  | { kind: 'pan'; sx: number; sy: number; ox: number; oz: number }
  | { kind: 'piece'; id: string; dx: number; dz: number; moved: boolean; runs: ReturnType<typeof wallRuns> }
  | { kind: 'room'; id: string; x0: number; z0: number; px: number; pz: number; moved: boolean; inside: string[] }
  | { kind: 'edge'; id: string; side: Side }
  | { kind: 'rot'; id: string }
  | { kind: 'size'; id: string }
  | { kind: 'opening'; roomId: string; id: string; moved: boolean }
  | { kind: 'underlay'; x0: number; z0: number; px: number; pz: number }
  | { kind: 'draw'; x0: number; z0: number; x1: number; z1: number }
  | { kind: 'measure'; sx: number; sy: number; moved: boolean; a: { x: number; z: number } }

export const TopView = forwardRef<TopHandle, Props>(function TopView(p, ref) {
  const { plan, library, sel, onSel, change, endGesture, warn, readOnly, drawing, onDrawn, moveUnderlay, onDropPiece, onZoom, ruler = false, measure = null, onMeasure, showPieces = true, showDims = true } = p
  const [live, setLive] = useState<{ x: number; z: number } | null>(null)   // the ruler's free end, following the pointer
  const box = useRef<HTMLDivElement>(null)
  const svgWrap = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })   // measured first — a fit to a guessed box opens a phone cut off
  /* the view: px per cm, and the plan point at the top-left */
  const [vp, setVp] = useState<{ s: number; ox: number; oz: number } | null>(null)
  const drag = useRef<Drag | null>(null)
  const [drawRect, setDrawRect] = useState<{ x: number; z: number; w: number; d: number } | null>(null)
  const touches = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ d: number; s: number; cx: number; cz: number } | null>(null)

  useEffect(() => {
    const el = box.current; if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth || 1, h: el.clientHeight || 1 }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const fitTo = (w: number, h: number) => {
    const v = viewOf(plan, 60, true)
    const s = clamp(Math.min(w / v.w, h / v.d), 0.05, 3)
    return { s, ox: v.x + v.w / 2 - w / s / 2, oz: v.z + v.d / 2 - h / s / 2 }
  }
  /* the first fit, once the box has its size (render-phase adjust, not an effect) */
  if (!vp && size.w > 1) setVp(fitTo(size.w, size.h))
  const view = vp ?? fitTo(Math.max(1, size.w), Math.max(1, size.h))
  const unit = 1 / view.s
  useEffect(() => { onZoom?.(Math.round(view.s * 100 / 0.4)) }, [view.s, onZoom])

  const toPlan = (cx: number, cy: number) => {
    const r = box.current!.getBoundingClientRect()
    return { x: view.ox + (cx - r.left) / view.s, z: view.oz + (cy - r.top) / view.s }
  }
  const zoomAt = (k: number, cx: number, cy: number) => setVp((v) => {
    const cur = v ?? view
    const s = clamp(cur.s * k, 0.05, 3)
    const r = box.current!.getBoundingClientRect()
    const px = cur.ox + (cx - r.left) / cur.s, pz = cur.oz + (cy - r.top) / cur.s
    return { s, ox: px - (cx - r.left) / s, oz: pz - (cy - r.top) / s }
  })

  useImperativeHandle(ref, () => ({
    fit: () => setVp(fitTo(size.w, size.h)),
    zoom: (k) => { const r = box.current!.getBoundingClientRect(); zoomAt(k, r.left + r.width / 2, r.top + r.height / 2) },
    centre: () => ({ x: view.ox + size.w / view.s / 2, z: view.oz + size.h / view.s / 2 }),
    scale: () => view.s,
    png: async () => svgToPng(svgWrap.current?.querySelector('svg') ?? null),
  }))

  /* wheel: ⌘ / Ctrl (and a trackpad's pinch) zooms at the pointer; a plain wheel pans */
  useEffect(() => {
    const el = box.current; if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY)
      else setVp((v) => { const cur = v ?? view; return { ...cur, ox: cur.ox + e.deltaX / cur.s, oz: cur.oz + e.deltaY / cur.s } })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  const roomById = (id: string) => plan.rooms.find((r) => r.id === id)
  const pieceById = (id: string) => plan.pieces.find((q) => q.id === id)

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    box.current?.focus({ preventScroll: true })
    if (touches.current.size === 2) {
      /* a second finger: the gesture becomes a pinch — whatever the first finger began is let go as it stands */
      if (drag.current && drag.current.kind !== 'pan') endGesture()
      drag.current = null; setDrawRect(null)
      const [a, b] = [...touches.current.values()] as [{ x: number; y: number }, { x: number; y: number }]
      const c = toPlan((a.x + b.x) / 2, (a.y + b.y) / 2)
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s, cx: c.x, cz: c.z }
      return
    }
    const pt = toPlan(e.clientX, e.clientY)
    const t = e.target as Element
    const handle = t.closest('[data-handle]')?.getAttribute('data-handle')
    /* (TD-081) the Ruler: the first press sets one end, the second the other — a drag sets both at once */
    if (ruler) {
      const at = snapMeasure(pt, plan, 10 / view.s, e.altKey)
      if (!measure || measure.b) { onMeasure?.({ a: at, b: null }); setLive(null); drag.current = { kind: 'measure', sx: e.clientX, sy: e.clientY, moved: false, a: at } }
      else { onMeasure?.({ a: measure.a, b: at }); setLive(null) }
      return
    }
    /* (pending modules S28) the first corner snaps to a room's edge as the second does — rooms traced side by side on a floor plan share their wall */
    if (drawing && !readOnly) { const x0 = snapRoomEdge(pt.x, 'x', plan.rooms, '', e.altKey), z0 = snapRoomEdge(pt.z, 'z', plan.rooms, '', e.altKey); drag.current = { kind: 'draw', x0, z0, x1: x0, z1: z0 }; return }
    if (handle && !readOnly && sel) {
      if (handle.startsWith('edge-') && sel.kind === 'room') { drag.current = { kind: 'edge', id: sel.id, side: handle.slice(5) as Side }; return }
      if (handle === 'rot' && sel.kind === 'piece') { drag.current = { kind: 'rot', id: sel.id }; return }
      if (handle === 'size' && sel.kind === 'piece') { drag.current = { kind: 'size', id: sel.id }; return }
    }
    const pieceId = t.closest('[data-piece-id]')?.getAttribute('data-piece-id')
    if (pieceId) {
      const q = pieceById(pieceId)
      onSel({ kind: 'piece', id: pieceId })
      if (q && !readOnly) drag.current = { kind: 'piece', id: pieceId, dx: q.x - pt.x, dz: q.z - pt.z, moved: false, runs: wallRuns(plan.rooms) }
      return
    }
    const opening = t.closest('[data-opening]')
    if (opening) {
      const id = opening.getAttribute('data-opening')!, roomId = opening.getAttribute('data-room-id')!
      onSel({ kind: 'opening', id, roomId })
      if (!readOnly) drag.current = { kind: 'opening', roomId, id, moved: false }
      return
    }
    if (moveUnderlay && plan.underlay && !readOnly) { drag.current = { kind: 'underlay', x0: plan.underlay.x, z0: plan.underlay.z, px: pt.x, pz: pt.z }; return }
    const roomId = t.closest('[data-room-id]')?.getAttribute('data-room-id')
    if (roomId) {
      const r = roomById(roomId)
      onSel({ kind: 'room', id: roomId })
      if (r && !readOnly) {
        const inside = plan.pieces.filter((q) => q.x >= r.x && q.x <= r.x + r.w && q.z >= r.z && q.z <= r.z + r.d).map((q) => q.id)
        drag.current = { kind: 'room', id: roomId, x0: r.x, z0: r.z, px: pt.x, pz: pt.z, moved: false, inside }
      }
      return
    }
    onSel(null)
    drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: view.ox, oz: view.oz }
  }

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (touches.current.has(e.pointerId)) touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ruler && !pinch.current) {
      const at = snapMeasure(toPlan(e.clientX, e.clientY), plan, 10 / view.s, e.altKey)
      const m = drag.current
      if (m?.kind === 'measure' && Math.hypot(e.clientX - m.sx, e.clientY - m.sy) > 4) m.moved = true
      if ((m?.kind === 'measure' && m.moved) || (measure && !measure.b)) setLive(at)
      return
    }
    if (pinch.current && touches.current.size === 2) {
      const [a, b] = [...touches.current.values()] as [{ x: number; y: number }, { x: number; y: number }]
      const s = clamp(pinch.current.s * (Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.current.d)), 0.05, 3)
      const r = box.current!.getBoundingClientRect(), mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top
      setVp({ s, ox: pinch.current.cx - mx / s, oz: pinch.current.cz - my / s })
      return
    }
    const d = drag.current; if (!d) return
    const pt = toPlan(e.clientX, e.clientY)
    const free = e.altKey
    if (d.kind === 'pan') { setVp({ s: view.s, ox: d.ox - (e.clientX - d.sx) / view.s, oz: d.oz - (e.clientY - d.sy) / view.s }); return }
    if (d.kind === 'draw') {
      d.x1 = snapRoomEdge(pt.x, 'x', plan.rooms, '', free); d.z1 = snapRoomEdge(pt.z, 'z', plan.rooms, '', free)
      setDrawRect({ x: Math.min(d.x0, d.x1), z: Math.min(d.z0, d.z1), w: Math.abs(d.x1 - d.x0), d: Math.abs(d.z1 - d.z0) })
      return
    }
    if (d.kind === 'piece') {
      d.moved = true
      change((pl) => ({ ...pl, pieces: pl.pieces.map((q) => (q.id === d.id ? { ...q, ...snapPiece({ ...q, x: pt.x + d.dx, z: pt.z + d.dz }, d.runs, free) } : q)) }), 'live')
      return
    }
    if (d.kind === 'room') {
      d.moved = true
      change((pl) => {
        const r = pl.rooms.find((x) => x.id === d.id); if (!r) return pl
        const nx = d.x0 + pt.x - d.px, nz = d.z0 + pt.z - d.pz
        const sl = snapRoomEdge(nx, 'x', pl.rooms, r.id, free), sr = snapRoomEdge(nx + r.w, 'x', pl.rooms, r.id, free) - r.w
        const st = snapRoomEdge(nz, 'z', pl.rooms, r.id, free), sb = snapRoomEdge(nz + r.d, 'z', pl.rooms, r.id, free) - r.d
        const x = Math.abs(sl - nx) <= Math.abs(sr - nx) ? sl : sr, z = Math.abs(st - nz) <= Math.abs(sb - nz) ? st : sb
        const dx = x - r.x, dz = z - r.z
        if (!dx && !dz) return pl
        return { ...pl, rooms: pl.rooms.map((q) => (q.id === r.id ? { ...q, x, z } : q)), pieces: pl.pieces.map((q) => (d.inside.includes(q.id) ? { ...q, x: q.x + dx, z: q.z + dz } : q)) }
      }, 'live')
      return
    }
    if (d.kind === 'edge') {
      change((pl) => ({ ...pl, rooms: pl.rooms.map((r) => (r.id === d.id ? resizeEdge(r, d.side, d.side === 'e' || d.side === 'w' ? pt.x : pt.z, pl.rooms, free) : r)) }), 'live')
      return
    }
    if (d.kind === 'rot') {
      change((pl) => ({ ...pl, pieces: pl.pieces.map((q) => {
        if (q.id !== d.id) return q
        const deg = (Math.atan2(pt.x - q.x, -(pt.z - q.z)) * 180) / Math.PI
        return { ...q, rot: normRot(free ? deg : Math.round(deg / 15) * 15) }
      }) }), 'live')
      return
    }
    if (d.kind === 'size') {
      change((pl) => ({ ...pl, pieces: pl.pieces.map((q) => {
        if (q.id !== d.id) return q
        const t = (q.rot * Math.PI) / 180, vx = pt.x - q.x, vz = pt.z - q.z
        const lx = vx * Math.cos(t) + vz * Math.sin(t), lz = -vx * Math.sin(t) + vz * Math.cos(t)
        const w = clamp(free ? Math.round(Math.abs(lx) * 2) : snap(Math.abs(lx) * 2), 10, 1200), dd = clamp(free ? Math.round(Math.abs(lz) * 2) : snap(Math.abs(lz) * 2), 10, 1200)
        return { ...q, w, d: dd }
      }) }), 'live')
      return
    }
    if (d.kind === 'opening') {
      d.moved = true
      change((pl) => ({ ...pl, rooms: pl.rooms.map((r) => {
        if (r.id !== d.roomId) return r
        return { ...r, openings: r.openings.map((o) => {
          if (o.id !== d.id) return o
          const l = sideLine(r, o.side), along = (l.axis === 'h' ? pt.x : pt.z) - l.a0 - o.width / 2
          return { ...o, ...fitOpening(r, { side: o.side, at: free ? along : snap(along), width: o.width }) }
        }) }
      }) }), 'live')
      return
    }
    if (d.kind === 'underlay') {
      change((pl) => (pl.underlay ? { ...pl, underlay: { ...pl.underlay, x: Math.round(d.x0 + pt.x - d.px), z: Math.round(d.z0 + pt.z - d.pz) } } : pl), 'live')
    }
  }

  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    touches.current.delete(e.pointerId)
    if (touches.current.size < 2) pinch.current = null
    const d = drag.current; drag.current = null
    if (!d) return
    if (d.kind === 'measure') {
      if (d.moved) { onMeasure?.({ a: d.a, b: snapMeasure(toPlan(e.clientX, e.clientY), plan, 10 / view.s, e.altKey) }); setLive(null) }
      return
    }
    if (d.kind === 'draw') {
      setDrawRect(null)
      const w = Math.abs(d.x1 - d.x0), dd = Math.abs(d.z1 - d.z0)
      if (w >= 50 && dd >= 50) onDrawn({ x: Math.min(d.x0, d.x1), z: Math.min(d.z0, d.z1), w, d: dd })
      return
    }
    if (d.kind !== 'pan') endGesture()
  }

  /* the handles of what is picked, at a constant size on screen */
  const handles = useMemo(() => {
    if (readOnly || !sel) return null
    const hs = 10 * unit, hit = 18 * unit
    if (sel.kind === 'room') {
      const r = plan.rooms.find((x) => x.id === sel.id); if (!r) return null
      const pts: [Side, number, number][] = [['n', r.x + r.w / 2, r.z], ['s', r.x + r.w / 2, r.z + r.d], ['w', r.x, r.z + r.d / 2], ['e', r.x + r.w, r.z + r.d / 2]]
      return pts.map(([s, x, z]) => (
        <g key={s} data-handle={`edge-${s}`} className={styles.handle} data-cursor={s === 'n' || s === 's' ? 'ns' : 'ew'}>
          <circle cx={x} cy={z} r={hit} className={styles.hit} />
          <rect x={x - hs / 2} y={z - hs / 2} width={hs} height={hs} rx={2 * unit} strokeWidth={1.5 * unit} />
        </g>
      ))
    }
    if (sel.kind === 'piece') {
      const q = plan.pieces.find((x) => x.id === sel.id); if (!q) return null
      const reach = 22 * unit
      return (
        <g transform={`translate(${q.x} ${q.z}) rotate(${q.rot})`}>
          <line x1={0} y1={-q.d / 2} x2={0} y2={-q.d / 2 - reach} className={styles.stem} strokeWidth={1.5 * unit} />
          <g data-handle="rot" className={styles.handle} data-cursor="rot">
            <circle cx={0} cy={-q.d / 2 - reach} r={hit} className={styles.hit} />
            <circle cx={0} cy={-q.d / 2 - reach} r={hs / 2 + unit} strokeWidth={1.5 * unit} />
          </g>
          <g data-handle="size" className={styles.handle} data-cursor="nwse">
            <circle cx={q.w / 2} cy={q.d / 2} r={hit} className={styles.hit} />
            <rect x={q.w / 2 - hs / 2} y={q.d / 2 - hs / 2} width={hs} height={hs} rx={2 * unit} strokeWidth={1.5 * unit} />
          </g>
        </g>
      )
    }
    return null
  }, [sel, plan, unit, readOnly])

  const bounds = planBounds(plan, true)
  const grid = 50
  const gx0 = Math.floor(Math.min(bounds.x0, view.ox) / grid) * grid - grid * 4, gz0 = Math.floor(Math.min(bounds.z0, view.oz) / grid) * grid - grid * 4
  const gw = Math.max(bounds.x1, view.ox + size.w / view.s) - gx0 + grid * 8, gd = Math.max(bounds.z1, view.oz + size.h / view.s) - gz0 + grid * 8
  const selOpening = sel?.kind === 'opening' ? plan.rooms.find((r) => r.id === sel.roomId)?.openings.find((o) => o.id === sel.id) ?? null : null
  const selOpeningRoom = sel?.kind === 'opening' ? plan.rooms.find((r) => r.id === sel.roomId) ?? null : null

  return (
    <div ref={box} className={styles.box} tabIndex={0} data-kb-own="" aria-label={ruler ? 'Top view of the layout — press two points to measure between them' : 'Top view of the layout — drag to move what you pick'} data-drawing={drawing || undefined} data-moving-underlay={moveUnderlay || undefined} data-ruler={ruler || undefined}
         onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
         onDragOver={(e) => { if (!readOnly && e.dataTransfer.types.includes('text/x-om-piece')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
         onDrop={(e) => { const key = e.dataTransfer.getData('text/x-om-piece'); if (!key || readOnly) return; e.preventDefault(); const pt = toPlan(e.clientX, e.clientY); onDropPiece(key, snap(pt.x), snap(pt.z)) }}
         data-testid="planner-top">
      <div ref={svgWrap} className={styles.svgWrap}>
        <PlanDrawing plan={plan} library={library} labels={showDims ? 'full' : 'names'} dims={showDims} showPieces={showPieces} unit={unit} underlay view={{ x: view.ox, z: view.oz, w: size.w / view.s, d: size.h / view.s }}
                     selectedRoom={sel?.kind === 'room' ? sel.id : null} selectedPiece={sel?.kind === 'piece' ? sel.id : null} warn={warn} title="Top view"
                     beneath={<>
                       <defs>
                         <pattern id="planner-grid" width={grid} height={grid} patternUnits="userSpaceOnUse" x={0} y={0}>
                           <path d={`M ${grid} 0 L 0 0 0 ${grid}`} className={styles.gridLine} strokeWidth={unit} fill="none" />
                         </pattern>
                       </defs>
                       <rect x={gx0} y={gz0} width={gw} height={gd} fill="url(#planner-grid)" className={styles.grid} pointerEvents="none" />
                     </>}>
          {selOpening && selOpeningRoom ? <OpeningRing room={selOpeningRoom} o={selOpening} unit={unit} /> : null}
          {handles}
          {drawRect ? <rect x={drawRect.x} y={drawRect.z} width={drawRect.w} height={drawRect.d} className={styles.draw} strokeWidth={2 * unit} strokeDasharray={`${6 * unit} ${4 * unit}`} /> : null}
          {ruler && measure ? <RulerLine a={measure.a} b={measure.b ?? live} unit={unit} done={!!measure.b} /> : null}
        </PlanDrawing>
      </div>
    </div>
  )
})

/** The picked door or window, ringed. */
function OpeningRing({ room, o, unit }: { room: Room; o: Room['openings'][number]; unit: number }) {
  const l = sideLine(room, o.side)
  const a = l.a0 + o.at
  const pad = 8 * unit
  return l.axis === 'h'
    ? <rect x={a - pad} y={l.c - 10 - pad} width={o.width + pad * 2} height={20 + pad * 2} className={styles.ring} strokeWidth={2 * unit} rx={4 * unit} pointerEvents="none" />
    : <rect x={l.c - 10 - pad} y={a - pad} width={20 + pad * 2} height={o.width + pad * 2} className={styles.ring} strokeWidth={2 * unit} rx={4 * unit} pointerEvents="none" />
}

/** A room's edge dragged: the grid, or another room's edge within 15 cm; never under 50 cm; its openings kept on their walls. */
function resizeEdge(r: Room, side: Side, v: number, rooms: Room[], free: boolean): Room {
  const e = snapRoomEdge(v, side === 'e' || side === 'w' ? 'x' : 'z', rooms, r.id, free)
  let { x, z, w, d } = r
  if (side === 'e') w = Math.max(50, e - r.x)
  if (side === 'w') { const right = r.x + r.w; x = Math.min(e, right - 50); w = right - x }
  if (side === 's') d = Math.max(50, e - r.z)
  if (side === 'n') { const bottom = r.z + r.d; z = Math.min(e, bottom - 50); d = bottom - z }
  const next = { ...r, x, z, w, d }
  return { ...next, openings: r.openings.map((o) => ({ ...o, ...fitOpening(next, o) })) }
}

/** (parity map, TD-081) The ruler's line: its two ends, and its length on a pill at the middle (the words at the screen's size). */
function RulerLine({ a, b, unit, done }: { a: { x: number; z: number }; b: { x: number; z: number } | null; unit: number; done: boolean }) {
  const dot = (p: { x: number; z: number }, k: string) => <circle key={k} cx={p.x} cy={p.z} r={4 * unit} className={styles.rulerEnd} strokeWidth={2 * unit} />
  if (!b) return <g pointerEvents="none" data-testid="planner-ruler">{dot(a, 'a')}</g>
  const len = Math.hypot(b.x - a.x, b.z - a.z)
  const words = lengthText(len)
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, w = words.length * 7.2 + 16
  return (
    <g pointerEvents="none" data-testid="planner-ruler" data-length={Math.round(len)} data-done={done || undefined}>
      <line x1={a.x} y1={a.z} x2={b.x} y2={b.z} className={styles.rulerLine} strokeWidth={2 * unit} strokeDasharray={done ? undefined : `${6 * unit} ${4 * unit}`} />
      {dot(a, 'a')}{dot(b, 'b')}
      <g transform={`translate(${mx} ${mz}) scale(${unit})`}>
        <rect x={-w / 2} y={-26} width={w} height={20} rx={4} className={styles.rulerPill} />
        <text y={-12} textAnchor="middle" className={styles.rulerText}>{words}</text>
      </g>
    </g>
  )
}
