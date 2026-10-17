'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Button } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { TextField } from '@/components/om/text-field'
import { useSheetLayout } from '@/components/om/sheet'
import { useShortcutsHere } from '@/lib/keys/store'
import { FLOOR_PLAN_KEYS } from '@/lib/keys/registry'
import { lengthEcho, movedShape, parseLengthMm, TEXT_MAX, type HatchKey, type MarkShape, type MarkTool, type Pt, type Side } from '@/lib/projects/floor-plan-model'
import { HatchDefs, MarkShapeSvg, type DrawMark } from './mark-shapes'
import styles from './plan-canvas.module.css'

/**
 * (gaps build G, G-Q4) The floor plan's canvas — the plan's picture with its marks over it, in SVG on the picture's own pixels (no drawing library:
 * a handful of shapes). The AI Visualizer's stage is the pattern for the gestures (REG-673): ⌘ / Ctrl + wheel or a trackpad pinch zooms about the
 * pointer, two fingers pinch and pan, the zoom bar steps (100–800 %, 1.0's range), a double-click or a double-tap fits; a drag on an empty spot
 * pans once zoomed in. One finger (or the mouse) uses the tool: a stroke, a drag for a box / arrow / zone / cloud / callout / measurement, a
 * tap for a pin, a label, a stamp, a photo pin. Each mark goes to the host the moment the pointer lifts (no Save button, 1.0 F-209).
 * Select: tap a mark to open it, drag your own to move it (under 6px is a tap). Erase: tap your own. The keys it answers itself are listed
 * by the ? panel (`FLOOR_PLAN_KEYS`). Set the scale: two taps and the real length, in a panel over the plan (1.0 F-197).
 */
export type CanvasTool = MarkTool | 'select' | 'erase' | 'scale'
export type CanvasMark = DrawMark & { mine: boolean; status: 'open' | 'resolved' }
type Gesture =
  | { kind: 'pan'; x: number; y: number; px: number; py: number; moved: boolean; markId: string | null }
  | { kind: 'pen'; points: Pt[] }
  | { kind: 'drag'; a: Pt; b: Pt; sx: number; sy: number }
  | { kind: 'tap'; p: Pt; sx: number; sy: number; moved: boolean }
  | { kind: 'move'; id: string; from: Pt; dx: number; dy: number; sx: number; sy: number; moved: boolean }
  | { kind: 'erase'; id: string; sx: number; sy: number }

const ZMIN = 1, ZMAX = 8, STEP = 1.4
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const DRAG_TOOLS: readonly MarkTool[] = ['rect', 'arrow', 'hatch', 'cloud', 'callout', 'dimension']
const TAP_TOOLS: readonly MarkTool[] = ['text', 'pin', 'photo', 'symbol']

export function PlanCanvas({
  plan, marks, nums, side, tool, symbol, pattern, style, selected, readOnly = false,
  onSelect, onDraw, onMove, onErase, onUndo, onPhoto, onScale, onScaleCancel, testId = 'plan-canvas', maxHeight,
}: {
  plan: { id: string; width: number; height: number; picture: string; scale: number | null; name: string }
  marks: readonly CanvasMark[]
  nums: Map<string, string>
  side: Side
  tool: CanvasTool
  symbol: string | null
  pattern: HatchKey
  style: { color: string | null; weight: 1 | 2 | 3; dashed: boolean }
  selected: string | null
  /** look, zoom and open marks only — a completed project, a studio preview */
  readOnly?: boolean
  onSelect: (id: string | null) => void
  onDraw: (tool: MarkTool, shape: MarkShape) => void
  onMove: (id: string, shape: MarkShape) => void
  onErase: (id: string) => void
  onUndo?: () => void
  onPhoto?: (p: Pt) => void
  onScale?: (a: Pt, b: Pt, mm: number) => Promise<boolean>
  onScaleCancel?: () => void
  testId?: string
  /** (pending modules S28) a ceiling on the plan's height — the canvas inside Make a 3D picture's dialog */
  maxHeight?: number
}) {
  useShortcutsHere(FLOOR_PLAN_KEYS)
  const phone = useSheetLayout()
  const wrap = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, vh: 800 })
  useEffect(() => {
    const el = wrap.current; if (!el) return
    const measure = () => setBox((b) => (b.w === el.clientWidth && b.vh === window.innerHeight ? b : { w: el.clientWidth, vh: window.innerHeight }))
    measure()
    const ro = new ResizeObserver(measure); ro.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  const aspect = plan.width / Math.max(1, plan.height)
  const maxH = Math.min(maxHeight ?? Infinity, phone ? Math.round(box.vh * 0.62) : Math.max(360, box.vh - 280))
  const fw = Math.max(0, Math.min(box.w, maxH * aspect)), fh = fw / aspect

  /* zoom + pan in one state: pan in screen px, the translate before the scale, bounded so the plan's edge never passes the frame's */
  const [view, setView] = useState({ z: 1, x: 0, y: 0 })
  const [live, setLive] = useState(false)
  const limit = useCallback((p: { x: number; y: number }, z: number) => ({ x: clamp(p.x, fw - z * fw, 0), y: clamp(p.y, fh - z * fh, 0) }), [fw, fh])
  const zoom = view.z
  const shown = limit(view, zoom)
  /** Zoom to `z` keeping the screen point (sx, sy) — relative to the frame — where it is. */
  const zoomAt = useCallback((z: number, sx: number, sy: number) => {
    setView((v) => {
      const next = clamp(z, ZMIN, ZMAX)
      const p = limit(v, v.z)
      const qx = (sx - p.x) / v.z, qy = (sy - p.y) / v.z
      return { z: next, ...limit({ x: sx - next * qx, y: sy - next * qy }, next) }
    })
  }, [limit])
  const fit = () => setView({ z: 1, x: 0, y: 0 })
  const zoomRef = useRef(zoom)
  const zoomAtRef = useRef(zoomAt)
  useEffect(() => { zoomRef.current = zoom; zoomAtRef.current = zoomAt })
  /* ⌘ / Ctrl + wheel and a trackpad's pinch zoom about the pointer — a listener that may stop the page from scrolling (React's is passive) */
  useEffect(() => {
    const el = stage.current; if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAtRef.current(zoomRef.current * Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const ptOf = (e: { clientX: number; clientY: number }): Pt => {
    const r = stage.current?.getBoundingClientRect()
    if (!r || !fw) return { x: 0.5, y: 0.5 }
    return { x: clamp((e.clientX - r.left - shown.x) / zoom / fw, 0, 1), y: clamp((e.clientY - r.top - shown.y) / zoom / fh, 0, 1) }
  }
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ d0: number; z0: number; mx: number; my: number; px: number; py: number } | null>(null)
  const [g, setG] = useState<Gesture | null>(null)
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null)
  /* a pin's or a label's words, typed in a small card where it goes */
  const [typing, setTyping] = useState<{ tool: 'text' | 'pin'; p: Pt; value: string; tried: boolean } | null>(null)
  /* the scale's two ends, then its length */
  const [ends, setEnds] = useState<Pt[]>([])
  const [length, setLength] = useState('')
  const [lengthTried, setLengthTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const [seenTool, setSeenTool] = useState(tool)
  if (seenTool !== tool) { setSeenTool(tool); setG(null); setTyping(null); if (tool !== 'scale') { setEnds([]); setLength(''); setLengthTried(false) } }

  const markOf = (t: EventTarget | null) => (t instanceof Element ? t.closest('[data-mark]')?.getAttribute('data-mark') ?? null : null)
  const live2 = () => setLive(true)
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-overlay]')) return
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const r = stage.current!.getBoundingClientRect()
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }]
      pinch.current = { d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), z0: zoom, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, px: shown.x, py: shown.y }
      setG(null); live2(); return
    }
    if (pointers.current.size > 2) return
    const p = ptOf(e)
    const hit = markOf(e.target)
    const pan0 = { kind: 'pan' as const, x: e.clientX, y: e.clientY, px: shown.x, py: shown.y, moved: false, markId: hit }
    if (readOnly || tool === 'select') {
      const m = hit ? marks.find((x) => x.id === hit) : null
      if (m && m.mine && !readOnly) { setG({ kind: 'move', id: m.id, from: p, dx: 0, dy: 0, sx: e.clientX, sy: e.clientY, moved: false }); return }
      setG(pan0); live2(); return
    }
    if (tool === 'erase') { setG(hit ? { kind: 'erase', id: hit, sx: e.clientX, sy: e.clientY } : pan0); if (!hit) live2(); return }
    if (tool === 'scale' || TAP_TOOLS.includes(tool as MarkTool)) { setG({ kind: 'tap', p, sx: e.clientX, sy: e.clientY, moved: false }); return }
    if (tool === 'pen') { setG({ kind: 'pen', points: [p] }); return }
    if (DRAG_TOOLS.includes(tool)) { setG({ kind: 'drag', a: p, b: p, sx: e.clientX, sy: e.clientY }); return }
  }
  const onMoveEv = (e: RPointerEvent<HTMLDivElement>) => {
    const known = pointers.current.get(e.pointerId)
    if (!known) return
    known.x = e.clientX; known.y = e.clientY
    const pc = pinch.current
    if (pc && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }]
      const r = stage.current!.getBoundingClientRect()
      const z = clamp((pc.z0 * Math.hypot(a.x - b.x, a.y - b.y)) / pc.d0, ZMIN, ZMAX)
      const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top
      const qx = (pc.mx - pc.px) / pc.z0, qy = (pc.my - pc.py) / pc.z0
      setView({ z, ...limit({ x: mx - z * qx, y: my - z * qy }, z) })
      return
    }
    if (!g) return
    if (g.kind === 'pan') {
      const moved = g.moved || Math.hypot(e.clientX - g.x, e.clientY - g.y) > 6
      if (moved && zoom > 1) setView({ z: zoom, ...limit({ x: g.px + (e.clientX - g.x), y: g.py + (e.clientY - g.y) }, zoom) })
      if (moved !== g.moved) setG({ ...g, moved })
    } else if (g.kind === 'pen') {
      const p = ptOf(e), q = g.points[g.points.length - 1]!
      if (Math.hypot((p.x - q.x) * fw * zoom, (p.y - q.y) * fh * zoom) > 2) setG({ kind: 'pen', points: [...g.points, p] })
    } else if (g.kind === 'drag') setG({ ...g, b: ptOf(e) })
    else if (g.kind === 'tap') { if (!g.moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 8) setG({ ...g, moved: true }) }
    else if (g.kind === 'move') {
      const p = ptOf(e)
      const moved = g.moved || Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 6
      setG({ ...g, dx: p.x - g.from.x, dy: p.y - g.from.y, moved })
    }
  }
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    if (pinch.current) { if (pointers.current.size < 2) { pinch.current = null; setLive(false) } return }
    setLive(false)
    const cur = g
    setG(null)
    if (!cur) return
    if (cur.kind === 'pan') {
      if (!cur.moved) {
        /* a double-tap (touch browsers don't reliably send dblclick) fits */
        if (e.pointerType !== 'mouse') {
          const t = lastTap.current
          if (t && e.timeStamp - t.t < 300 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 24) { lastTap.current = null; fit(); return }
          lastTap.current = { t: e.timeStamp, x: e.clientX, y: e.clientY }
        }
        onSelect(cur.markId && cur.markId !== selected ? cur.markId : null)
      }
      return
    }
    if (cur.kind === 'move') {
      const m = marks.find((x) => x.id === cur.id)
      if (!m) return
      if (!cur.moved) { onSelect(cur.id === selected ? null : cur.id); return }
      onMove(cur.id, movedShape(m.shape, cur.dx, cur.dy))
      return
    }
    if (cur.kind === 'erase') { if (Math.hypot(e.clientX - cur.sx, e.clientY - cur.sy) < 8) onErase(cur.id); return }
    if (cur.kind === 'pen') { if (cur.points.length >= 2) onDraw('pen', { points: cur.points, ...styleOf() }); return }
    if (cur.kind === 'drag') {
      if (Math.hypot(e.clientX - cur.sx, e.clientY - cur.sy) < 8) return
      onDraw(tool as MarkTool, { points: [cur.a, cur.b], ...styleOf(), ...(tool === 'hatch' ? { pattern } : {}) })
      return
    }
    if (cur.kind === 'tap') {
      if (cur.moved) return
      if (tool === 'scale') { setEnds((x) => (x.length >= 2 ? [cur.p] : [...x, cur.p])); return }
      if (tool === 'text' || tool === 'pin') { setTyping({ tool, p: cur.p, value: '', tried: false }); return }
      if (tool === 'photo') { onPhoto?.(cur.p); return }
      if (tool === 'symbol' && symbol) onDraw('symbol', { points: [cur.p], symbol, ...styleOf() })
    }
  }
  const styleOf = () => ({ ...(style.color ? { color: style.color } : {}), weight: style.weight, ...(style.dashed ? { dashed: true } : {}) })
  const cancelAll = useCallback(() => { setG(null); pointers.current.clear(); pinch.current = null; setLive(false) }, [])

  /* the keys the canvas answers itself: Esc backs out one step, ⌘Z / Ctrl Z undoes your last mark (never while typing) */
  const escRef = useRef<() => boolean>(() => false)
  const undoRef = useRef(onUndo)
  useEffect(() => {
    undoRef.current = onUndo
    escRef.current = () => {
      if (typing) { setTyping(null); return true }
      if (g) { cancelAll(); return true }
      if (tool === 'scale') { onScaleCancel?.(); return true }
      if (selected) { onSelect(null); return true }
      return false
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typingNow = !!t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      if (e.key === 'Escape' && !typingNow) { if (escRef.current()) e.preventDefault(); return }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !typingNow && undoRef.current) { e.preventDefault(); undoRef.current() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const u = plan.width / Math.max(1, fw * zoom)
  const draft: DrawMark | null = !g ? null
    : g.kind === 'pen' ? { id: 'draft', tool: 'pen', shape: { points: g.points, ...styleOf() }, side }
      : g.kind === 'drag' ? { id: 'draft', tool: tool as MarkTool, shape: { points: [g.a, g.b], ...styleOf(), ...(tool === 'hatch' ? { pattern } : {}) }, side } : null
  const moving = g?.kind === 'move' && g.moved ? g : null
  const drawn = marks.map((m) => (moving && moving.id === m.id ? { ...m, shape: movedShape(m.shape, moving.dx, moving.dy) } : m))
  const hitOn = readOnly || tool === 'select' || tool === 'erase'
  const pct = Math.round(zoom * 100)
  const stageXY = (p: Pt) => ({ left: shown.x + p.x * fw * zoom, top: shown.y + p.y * fh * zoom })
  const mmTyped = parseLengthMm(length)
  const setScale = async () => {
    setLengthTried(true)
    if (ends.length < 2 || mmTyped === null || !onScale || saving) return
    setSaving(true)
    const ok = await onScale(ends[0]!, ends[1]!, mmTyped)
    setSaving(false)
    if (ok) { setEnds([]); setLength(''); setLengthTried(false) }
  }
  const addTyped = () => {
    if (!typing) return
    const words = typing.value.replace(/\s+/g, ' ').trim()
    if (!words) { setTyping({ ...typing, tried: true }); return }
    onDraw(typing.tool, { points: [typing.p], text: words.slice(0, TEXT_MAX), ...styleOf() })
    setTyping(null)
  }

  return (
    <div ref={wrap} className={styles.wrap} data-testid={testId}>
        {/* (the scale's steps sit over the plan's edge, never on it — both ends may be anywhere on the plan) */}
        {tool === 'scale' ? (
          <div className={styles.scale} data-overlay="" data-testid="plan-scale" role="group" aria-label="Set the plan’s scale">
            <p className={styles.scaleTitle}>{ends.length < 2 ? 'Set the plan’s scale — step 1 of 2' : 'Set the plan’s scale — step 2 of 2'}</p>
            {ends.length < 2 ? (
              <>
                <p className={styles.scaleText}>The plan is a picture, so it doesn’t know how big the home is. Show it one length you know and it can measure the rest.</p>
                <p className={styles.scaleText}>{ends.length === 0 ? `${phone ? 'Tap' : 'Click'} both ends of something whose real length you know — a bedroom door is usually 900 mm wide, or a length printed on the plan.` : `1 of 2 ends marked — now ${phone ? 'tap' : 'click'} the other end.`}</p>
              </>
            ) : (
              <>
                <p className={styles.scaleText}>Both ends marked. How long is it in real life?</p>
                <TextField label="Length" value={length} autoFocus placeholder="e.g. 900 or 0.9 m" onChange={(v) => setLength(v)} helper={lengthEcho(length) ?? 'Millimetres, unless you add m or cm'}
                           error={lengthTried && mmTyped === null ? 'Type the length, e.g. 900 or 0.9 m' : undefined}
                           onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void setScale() } }} />
              </>
            )}
            <div className={styles.typingFoot}>
              {ends.length ? <Button variant="secondary" appearance="text" onPress={() => { setEnds([]); setLength(''); setLengthTried(false) }}>Start over</Button> : null}
              <Button variant="secondary" appearance="text" onPress={() => onScaleCancel?.()}>Cancel</Button>
              {ends.length === 2 ? <Button variant="primary" onPress={() => void setScale()} isDisabled={saving}>Set</Button> : null}
            </div>
          </div>
        ) : null}

      <div ref={stage} className={styles.stage} style={{ width: fw || undefined, height: fh || undefined }} data-tool={readOnly ? 'look' : tool} data-live={live || undefined} data-zoomed={zoom > 1 || undefined}
           onPointerDown={onDown} onPointerMove={onMoveEv} onPointerUp={onUp} onPointerCancel={cancelAll}
           onDoubleClick={(e) => { if ((readOnly || tool === 'select') && !markOf(e.target) && !(e.target as HTMLElement).closest('[data-overlay]')) fit() }}
           role="img" aria-label={`${plan.name} — ${marks.length} ${marks.length === 1 ? 'mark' : 'marks'}`}>
        <div className={styles.viewport} style={{ width: fw, height: fh, transform: `translate(${shown.x}px, ${shown.y}px) scale(${zoom})` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.picture} src={plan.picture} alt="" draggable={false} data-testid="plan-picture" />
          <svg className={styles.marks} viewBox={`0 0 ${plan.width} ${plan.height}`} preserveAspectRatio="none" data-hit={hitOn || undefined} aria-hidden>
            <HatchDefs marks={draft ? [...drawn, draft] : drawn} u={u} />
            {drawn.map((m) => <MarkShapeSvg key={m.id} m={m} ctx={{ w: plan.width, h: plan.height, u, num: nums.get(m.id), scale: plan.scale, selected: m.id === selected, hit: hitOn }} />)}
            {draft ? <MarkShapeSvg m={draft} ctx={{ w: plan.width, h: plan.height, u, scale: plan.scale, draft: true }} /> : null}
            {tool === 'scale' ? ends.map((p, i) => <circle key={i} cx={p.x * plan.width} cy={p.y * plan.height} r={6 * u} fill="#5500FF" stroke="#fff" strokeWidth={2 * u} />) : null}
            {tool === 'scale' && ends.length === 2 ? <line x1={ends[0]!.x * plan.width} y1={ends[0]!.y * plan.height} x2={ends[1]!.x * plan.width} y2={ends[1]!.y * plan.height} stroke="#5500FF" strokeWidth={2 * u} strokeDasharray={`${6 * u} ${4 * u}`} /> : null}
          </svg>
        </div>

        {typing ? (
          <div className={styles.typing} style={{ left: clamp(stageXY(typing.p).left, 8, Math.max(8, fw - 288)), top: clamp(stageXY(typing.p).top + 16, 8, Math.max(8, fh - 156)) }} data-overlay="" data-testid="plan-typing">
            <TextField label={typing.tool === 'pin' ? 'What about here?' : 'Label'} value={typing.value} autoFocus maxLength={TEXT_MAX}
                       error={typing.tried && !typing.value.trim() ? (typing.tool === 'pin' ? 'Say what this pin is about' : 'Write the label first') : undefined}
                       onChange={(v) => setTyping({ ...typing, value: v })}
                       onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTyped() } else if (e.key === 'Escape') { e.preventDefault(); setTyping(null) } }} />
            <div className={styles.typingFoot}>
              <Button variant="secondary" appearance="text" onPress={() => setTyping(null)}>Cancel</Button>
              <Button variant="primary" onPress={addTyped}>{typing.tool === 'pin' ? 'Add pin' : 'Add'}</Button>
            </div>
          </div>
        ) : null}

        <div className={styles.zoom} data-overlay="" role="toolbar" aria-label="Zoom">
          <Tooltip label="Zoom out"><IconButton icon="remove" label="Zoom out" size={36} variant="bare" iconSize={20} disabled={zoom <= ZMIN} onClick={() => zoomAt(zoom / STEP, fw / 2, fh / 2)} /></Tooltip>
          <Tooltip label="Fit the plan"><button type="button" className={styles.zoomLabel} onClick={fit} aria-label={`Zoom ${pct}%, fit the plan`} data-testid="plan-zoom">{pct}%</button></Tooltip>
          <Tooltip label="Zoom in"><IconButton icon="add" label="Zoom in" size={36} variant="bare" iconSize={20} disabled={zoom >= ZMAX} onClick={() => zoomAt(zoom * STEP, fw / 2, fh / 2)} /></Tooltip>
        </div>
      </div>
    </div>
  )
}
