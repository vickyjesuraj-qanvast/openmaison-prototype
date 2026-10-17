'use client'

import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent, type KeyboardEvent as RKeyboardEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { CompareSlider } from '@/components/om/compare-slider'
import { useSheetLayout } from '@/components/om/sheet'
import { duration, ease, overlayFade } from '@/lib/motion'
import { useMediaQuery } from '@/lib/breakpoint'
import { clampDot, titleCaseLabel } from '@/lib/visualizer/surfaces'
import type { Pin } from '@/lib/visualizer/queries'
import type { Pt } from '@/lib/visualizer/engine/pixels'
import styles from './stage.module.css'

export type StageMode =
  | { kind: 'view' }
  | { kind: 'place'; label: string; onPlace: (p: Pt) => void; onCancel: () => void }
  | { kind: 'draw'; label: string; onDone: (poly: Pt[]) => void; onCancel: () => void }
  | { kind: 'remove'; label: string; ids: string[]; onPick: (id: string) => void; onCancel: () => void }
  /** `onCancel` gives the banner its Cancel; `drafting` (a new pin's box is open) puts the banner away, as the client link does. */
  | { kind: 'pin'; onAdd: (p: Pt) => void; onCancel?: () => void; drafting?: boolean }
export type Marker = {
  id: string; kind: 'surface' | 'furniture'; label: string; x: number; y: number; selected: boolean; fill: string | null
  action: 'remove' | 'replace' | 'customize' | null
  /** The finish this version already carries (a surface's material, a piece's customised finish) — "· now Sage Green". */
  now?: string | null
  /** The finish picked for the next Generate, when there is one — read out after the label. */
  pending?: string | null
}
/** `saving`: the version is being kept — too late to cancel, so the card drops its Cancel (the editor ignores a cancel then). */
export type Running = { title: string; step: number; steps: string[]; saving?: boolean } | null

const ACTION_WORD = { remove: 'Remove', replace: 'Replace', customize: 'Customize' } as const
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const ZMIN = 1, ZMAX = 3
/* (verify round 1) Below this photo height the stage stops giving the version chip and the zoom bar their own rows and looks for a bigger
   picture (a phone on its side, a short phone with a tray open) — a readable picture first; see `Fit`. */
const MIN_PHOTO = { phone: 180, other: 200 }
/** How the photo shares a stage with the chip and the bar: `roomy` — each has its own row; `side` — a short, wide stage: the bar stands
    on end beside the photo at the right, the chip stays only where it clears the photo; `low` — a short, narrow stage: the chip steps
    aside, the bar keeps its row; `over` — shorter still: the bar lies over the photo's bottom edge. */
type Fit = 'roomy' | 'side' | 'low' | 'over'
/** (wave E · E3) A phone held sideways: the photo is the hero — it takes the stage to within a few pixels, the bar is compact and stands
    beside it (`side`) where that costs the photo nothing, else lies over its bottom edge (`over`); the chip steps aside. */
const SIDEWAYS = '(max-width: 1024px) and (orientation: landscape) and (max-height: 500px)'
/** Under this frame width the markers shrink to small dots, so nine of them never bury a thumbnail-sized photo. */
const SMALL_FRAME = 240
/** A traced outline smaller than this share of the photo is a slip, not a surface (F042). */
const MIN_TRACE_AREA = 0.002
/** The polygon's area on the photo's 0–1 coordinates (the shoelace formula). */
const traceArea = (poly: Pt[]) => {
  let a = 0
  for (let i = 0; i < poly.length; i++) { const p = poly[i]!, q = poly[(i + 1) % poly.length]!; a += p.x * q.y - q.x * p.y }
  return Math.abs(a) / 2
}

/**
 * The canvas (REG-673 · 674; 1.0's canvas, B-117…B-124, on 2.0's pieces): the version on screen fitted into the room the version chip
 * and the zoom bar leave; surface markers are squares and furniture circles (1.0's shapes) with a 36 px hit area and a visible focus
 * ring, a picked finish fills its square; a selected surface lights the region the render will change (cross-fading between picks);
 * the lighting previews live; Compare lays the parent (or any version) under a slider you drag; the place, draw, remove and pin modes
 * own the pointer with a banner that says what to do (markers step aside while pinning; pinning rests during Compare); a Generate dims
 * the whole stage under the progress card.
 * Zoom: the bar's buttons, Ctrl / ⌘ + wheel, two-finger pinch; a double-click or double-tap fits; drag (mouse or one finger) to pan
 * once zoomed in, bounded to the photo. Markers and pins keep their size at every zoom.
 */
export function Stage({ image, alt, compare, preview, highlight, wash = null, markers, onDot, mode, pins, activePin, onPin, running, onCancelRun, toolbar, chip, children, empty }: {
  image: string | null
  alt: string
  compare: { before: string; beforeLabel: string; afterLabel: string } | null
  preview: string | null
  highlight: string | null
  /** (UX audit V5) Every pick still waiting for Generate, washed in its own colour (engine `washOverlay`) — under the lit selection. */
  wash?: string | null
  markers: Marker[]
  onDot: (m: Marker) => void
  mode: StageMode
  pins: Pin[] | null
  activePin: string | null
  onPin: (id: string) => void
  running: Running
  onCancelRun: () => void
  toolbar: ReactNode
  chip: ReactNode
  /** The pin cards (a pin's thread, the new pin's box) — they anchor to their pin and float above the stage (pin-card.tsx). */
  children?: ReactNode
  empty?: ReactNode
}) {
  const phone = useSheetLayout()
  const touch = useMediaQuery('(hover: none)')
  const sideways = useMediaQuery(SIDEWAYS)
  const reduce = useReducedMotion()
  const area = useRef<HTMLDivElement>(null)
  /* The banner's own width (one line where it can), read as it lays out — whether it fits beside the version chip. */
  const [bannerW, setBannerW] = useState(0)
  const bannerRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const ro = new ResizeObserver(() => setBannerW(el.offsetWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const chipBox = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  /* The stage's size, the chip's reach into it (its bottom from the top, its right edge) and the zoom bar's own size, read by one observer —
     the bar's size, not its place, so moving it for a short stage never feeds back into the fit. */
  const [box, setBox] = useState({ w: 0, h: 0, chip: 0, chipR: 0, bar: 0, barW: 0, barFull: 0, barCol: 0 })
  const hasChip = !!chip, hasImage = !!image
  useEffect(() => {
    const el = area.current; if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
      const c = chipBox.current?.getBoundingClientRect(), t = bar.current?.getBoundingClientRect()
      /* the width inside the notch's insets (F156: `--viz-inset-l/r`, set by the editor on a landscape phone); the chip's right edge from
         that inner box's left */
      const inL = parseFloat(cs.paddingLeft) || 0
      const w = Math.round(el.clientWidth - inL - (parseFloat(cs.paddingRight) || 0))
      /* (phone-1) the whole bar's own width, read while it is whole — kept while it is compact, so compacting never feeds back */
      const whole = !el.hasAttribute('data-compact') && t && t.width >= t.height && bar.current ? bar.current.scrollWidth : null
      /* (E3) how long the bar is stood on end and compact — its tools that stay, 36px each and 4 apart, in 4px of padding and a 1px edge —
         counted from the tools, so it reads the same whichever way the bar lies */
      const tools = bar.current ? bar.current.querySelectorAll('button').length - bar.current.querySelectorAll('[data-zoom-step] button').length : 0
      const barCol = tools ? tools * 36 + (tools - 1) * 4 + 10 : 0
      setBox((b) => {
        const next = { w, h: el.clientHeight, chip: c && c.height ? Math.round(c.bottom - r.top) : 0, chipR: c && c.width ? Math.round(c.right - r.left - inL) : 0,
                       bar: t && t.height ? Math.round(t.height) : 0, barW: t && t.width ? Math.round(t.width) : 0, barFull: whole ?? b.barFull, barCol }
        return b.w === next.w && b.h === next.h && b.chip === next.chip && b.chipR === next.chipR && b.bar === next.bar && b.barW === next.barW && b.barFull === next.barFull && b.barCol === next.barCol ? b : next
      })
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (chipBox.current) ro.observe(chipBox.current)
    if (bar.current) ro.observe(bar.current)
    return () => ro.disconnect()
  }, [hasChip, hasImage])

  /* The photo's own shape, read from the element too, so a picture decoded before hydration still sets it; kept across switches. */
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const readNatural = useCallback((el: HTMLImageElement | null) => {
    if (!el?.complete || !el.naturalWidth) return
    const w = el.naturalWidth, h = el.naturalHeight
    setNatural((n) => (n && n.w === w && n.h === h ? n : { w, h }))
  }, [])
  const aspect = natural ? natural.w / natural.h : 1.5
  /* sideways, the photo comes to 4px of the stage's top and bottom and 2px of its sides — a column beside a 300px rail is its width */
  const EDGE = sideways ? 4 : 8
  const padX = sideways ? 2 : phone ? 16 : 32, pad = phone ? 16 : 32, gap = phone || sideways ? 8 : 12
  const fit = (top: number, bottom: number, width = box.w - padX * 2) => Math.max(0, Math.min(width, (box.h - top - bottom) * aspect))
  const reserveTop = Math.max(pad, box.chip ? box.chip + gap : 0)
  /* the bar rests 16px above the stage's bottom (12 on a phone — stage.module.css `.toolbar`) */
  const reserveBottom = Math.max(pad, box.bar ? (phone ? 12 : 16) + box.bar + gap : 0)
  /* (verify round 1) The chip and the bar keep their own rows while the photo stays readable. On a short stage the photo comes first: a
     wide one stands the bar on end beside it, a narrow one lets the chip step aside (the strip under the stage marks the version on
     screen) and, shorter still, lays the bar over the photo's bottom edge — never a thumbnail, or nothing at all, between the two. */
  const roomy = fit(reserveTop, reserveBottom)
  /* side (wave E · E3): the bar a compact column beside the photo (stage.module.css), the photo in what is left of the width — read by the
     bar's short side and the column's counted length, which standing it on end does not change, so the choice never feeds back */
  const thick = Math.min(box.bar, box.barW)
  const sideRoom = box.w - padX - EDGE - thick - gap
  const side = thick && box.barCol && box.barCol + 8 <= box.h ? fit(EDGE, EDGE, sideRoom) : 0, low = fit(EDGE, reserveBottom), over = fit(EDGE, EDGE)
  const short = box.h > 0 && (sideways || roomy / aspect < (phone ? MIN_PHOTO.phone : MIN_PHOTO.other))
  const layout: Fit = !short ? 'roomy'
    /* a sideways phone: beside the photo when that costs it (next to) nothing, else over its bottom edge — the biggest picture either way */
    : sideways ? (side > 0 && side >= over - 8 ? 'side' : over >= roomy ? 'over' : 'roomy')
    : side >= low && side > roomy + 24 ? 'side'
    : low / aspect < 100 && over > low + 24 ? 'over'
    : low > roomy + 24 ? 'low' : 'roomy'
  const fw = layout === 'side' ? side : layout === 'low' ? low : layout === 'over' ? over : roomy, fh = fw / aspect
  const padTop = layout === 'roomy' ? reserveTop : EDGE, padBottom = layout === 'roomy' || layout === 'low' ? reserveBottom : EDGE
  /* (audit 2026-09-26, round 3) Laid over the photo's bottom edge, the bar hid a pin under it (a pin can't rise above the bar: it lives in the
     zoomed picture) — the bar takes the top edge instead while a pin sits under it at the foot and none would at the top */
  const underBar = (px: number, py: number, top: boolean) => (top ? py : 1 - py) * fh < box.bar + 14 && Math.abs(px * fw - fw / 2) < box.barW / 2 + 14
  const barTop = layout === 'over' && !!box.bar && !!pins?.length && pins.some((p) => underBar(p.x, p.y, false)) && !pins.some((p) => underBar(p.x, p.y, true))
  /* (phone-1) The bar compacts — − / + and the rule step aside, Compare keeps only its icon — by the stage's own width, not the window's: a
     stage column narrower than the whole bar (a phone held sideways beside the rail, the narrowest phones); and always when it stands on
     end or the phone is sideways. `barFull` is read only while the bar lies whole and flat, so compacting never feeds back. */
  const compact = sideways || layout === 'side' || (box.barFull > 0 && box.w > 0 && box.w - 2 * EDGE < box.barFull)
  /* side: the photo and the bar's column centred together, the gap between them; the chip stays where it clears the photo */
  const groupLeft = Math.max(padX, Math.round((box.w - (fw + gap + thick)) / 2))
  const sideFrom = groupLeft, sideTo = groupLeft + fw
  const chipClear = layout === 'roomy' || (layout === 'side' && box.chipR + gap <= groupLeft)
  const sideMargin = layout === 'side' ? { marginLeft: groupLeft, marginRight: Math.max(0, box.w - sideTo) } : undefined
  const barRight = layout === 'side' ? Math.max(EDGE, box.w - sideTo - gap - thick) : null
  const small = fw > 0 && fw < SMALL_FRAME

  /* zoom + pan: pan is in screen px (the translate comes before the scale), bounded so the photo's edge never passes the frame's. */
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [live, setLive] = useState(false)
  const limit = (p: { x: number; y: number }, z: number) => { const mx = (fw * (z - 1)) / 2, my = (fh * (z - 1)) / 2; return { x: clamp(p.x, -mx, mx), y: clamp(p.y, -my, my) } }
  const shown = limit(pan, zoom)
  const zoomTo = (z: number) => {
    const next = clamp(Math.round(z * 4) / 4, ZMIN, ZMAX)
    setZoom(next)
    setPan((p) => (next === 1 ? { x: 0, y: 0 } : limit(p, next)))
  }
  const onWheel = (e: React.WheelEvent) => { if (!(e.ctrlKey || e.metaKey)) return; zoomTo(zoom * (e.deltaY < 0 ? 1.15 : 0.87)) }

  const frame = useRef<HTMLDivElement>(null)
  const ptOf = (e: { clientX: number; clientY: number }): Pt => { const r = frame.current?.getBoundingClientRect(); return r ? { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) } : { x: 0.5, y: 0.5 } }
  const [path, setPath] = useState<Pt[] | null>(null)
  /* A trace too small to be a surface keeps draw mode and swaps the banner's words for a moment (F042). */
  const [slip, setSlip] = useState(false)
  const slipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (slipTimer.current) clearTimeout(slipTimer.current) }, [])
  const flagSlip = () => {
    setSlip(true)
    if (slipTimer.current) clearTimeout(slipTimer.current)
    slipTimer.current = setTimeout(() => setSlip(false), 2400)
  }
  if (slip && mode.kind !== 'draw') setSlip(false)
  const pointers = useRef(new Map<number, { x: number; y: number; sx: number; sy: number }>())
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const pinch = useRef<{ d0: number; z0: number; ux: number; uy: number; cx: number; cy: number } | null>(null)
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null)

  /* Pinning rests while two pictures share the frame (the note would land on the one you are not looking at). */
  const kind: StageMode['kind'] = mode.kind === 'pin' && compare ? 'view' : mode.kind
  const pinOn = mode.kind === 'pin' && !compare

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()]
    const r = frame.current?.getBoundingClientRect()
    if (!a || !b || !r) return
    const cx = r.left + r.width / 2 - shown.x, cy = r.top + r.height / 2 - shown.y
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
    pinch.current = { d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), z0: zoom, ux: (mx - cx - shown.x) / zoom, uy: (my - cy - shown.y) / zoom, cx, cy }
    drag.current = null
    setLive(true)
  }
  const endGesture = () => { pointers.current.clear(); pinch.current = null; drag.current = null; setLive(false); setPath(null) }

  const onFrameDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (compare) return   // the slider owns every press on a comparison
    if ((e.target as HTMLElement).closest('button, [role="slider"], [data-card]')) return
    if (mode.kind === 'place') { e.preventDefault(); mode.onPlace(ptOf(e)); return }
    if (mode.kind === 'pin') { e.preventDefault(); mode.onAdd(ptOf(e)); return }
    if (mode.kind === 'draw') { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setPath([ptOf(e)]); return }
    if (mode.kind !== 'view') return
    const touch = e.pointerType !== 'mouse'
    if (!touch && zoom <= 1) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY })
    if (touch && pointers.current.size === 2) { startPinch(); return }
    if (pointers.current.size === 1 && zoom > 1) { drag.current = { x: e.clientX, y: e.clientY, px: shown.x, py: shown.y }; setLive(true) }
  }
  const onFrameMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (mode.kind === 'draw' && path) { const p = ptOf(e); const q = path[path.length - 1]!; if (Math.hypot(p.x - q.x, p.y - q.y) > 0.004) setPath([...path, p]); return }
    const known = pointers.current.get(e.pointerId)
    if (!known) return
    known.x = e.clientX; known.y = e.clientY
    const g = pinch.current
    if (g) {
      const [a, b] = [...pointers.current.values()]
      if (!a || !b) return
      const z = clamp((g.z0 * Math.hypot(a.x - b.x, a.y - b.y)) / g.d0, ZMIN, ZMAX)
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
      setZoom(z)
      setPan(limit({ x: mx - g.cx - z * g.ux, y: my - g.cy - z * g.uy }, z))
      return
    }
    const d = drag.current
    if (d) setPan(limit({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) }, zoom))
  }
  const onFrameUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (mode.kind === 'draw' && path) {
      const p = path; setPath(null)
      if (p.length >= 3 && traceArea(p) >= MIN_TRACE_AREA) { setSlip(false); mode.onDone(p) }
      else flagSlip()
      return
    }
    const known = pointers.current.get(e.pointerId)
    pointers.current.delete(e.pointerId)
    if (pinch.current) {
      if (pointers.current.size < 2) {
        pinch.current = null
        zoomTo(zoom)   // settle on the bar's 25 % steps
        const rest = [...pointers.current.values()][0]
        if (rest && zoom > 1) drag.current = { x: rest.x, y: rest.y, px: shown.x, py: shown.y }
        else setLive(false)
      }
      return
    }
    drag.current = null
    setLive(false)
    /* A double-tap fits (touch browsers do not reliably send dblclick once the photo owns its gestures). */
    if (known && e.pointerType !== 'mouse' && Math.hypot(e.clientX - known.sx, e.clientY - known.sy) < 10) {
      const t = lastTap.current
      if (t && e.timeStamp - t.t < 300 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 24) { lastTap.current = null; zoomTo(1) }
      else lastTap.current = { t: e.timeStamp, x: e.clientX, y: e.clientY }
    }
  }
  /* The keyboard's way to place a mark or a pin: focus the photo, Enter drops it at the middle of what is on screen — the part of the
     photo inside the stage, however it is zoomed, panned or placed. */
  const onFrameKey = (e: RKeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return
    const r = area.current?.getBoundingClientRect(), f = frame.current?.getBoundingClientRect()
    if (!r || !f) return
    const x0 = Math.max(r.left, f.left), x1 = Math.min(r.right, f.right), y0 = Math.max(r.top + padTop, f.top), y1 = Math.min(r.bottom - padBottom, f.bottom)
    const p = ptOf({ clientX: x1 > x0 ? (x0 + x1) / 2 : f.left + f.width / 2, clientY: y1 > y0 ? (y0 + y1) / 2 : f.top + f.height / 2 })
    if (mode.kind === 'place') { e.preventDefault(); mode.onPlace(p) }
    else if (pinOn && mode.kind === 'pin') { e.preventDefault(); mode.onAdd(p) }
  }
  const grabbing = zoom > 1 && kind === 'view'

  /* (tablet-6 · tablet-18) While a place or pin mode lasts, the photo is a keyboard stop; when the mode ends (Esc, Cancel, the tool
     pressed again) it stops being one, and focus on it would fall to the page. It goes back to what started the mode — the pin toggle, the
     rail's Add — else the pin toggle, else the canvas bar. `inFrame` remembers the photo held focus, even once the browser has let go. */
  const keyedNow = kind === 'place' || pinOn
  const modeFrom = useRef<Element | null>(null)
  const keyedWas = useRef(false)
  const inFrame = useRef(false)
  useEffect(() => {
    const was = keyedWas.current
    keyedWas.current = keyedNow
    if (keyedNow && !was) {
      const a = document.activeElement
      modeFrom.current = a && a !== document.body && !frame.current?.contains(a) ? a : null
      return
    }
    if (keyedNow || !was) return
    const a = document.activeElement
    const lost = !a || a === document.body || a === frame.current
    if (!lost || !inFrame.current) { inFrame.current = false; return }
    inFrame.current = false
    const from = modeFrom.current
    const usable = (el: Element | null): el is HTMLElement => el instanceof HTMLElement && el.isConnected && !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true'
    const target = [from, document.querySelector('[data-testid="viz-pin-toggle"]'), bar.current?.querySelector('button:not(:disabled)') ?? null].find(usable)
    target?.focus({ preventScroll: true })
  }, [keyedNow])

  /* A Generate takes the stage: its Cancel gets focus when nothing else holds it (the page, or the Generate button now disabled) (F162). */
  const runCard = useRef<HTMLDivElement>(null)
  const isRunning = !!running
  /* What had focus when the run began, and the picture then — where focus goes back once the card has gone (F162). */
  const runFrom = useRef<{ el: Element | null; image: string | null }>({ el: null, image: null })
  const imageNow = useRef(image)
  useEffect(() => { imageNow.current = image })
  useEffect(() => {
    if (!isRunning) return
    const a = document.activeElement
    runFrom.current = { el: a, image: imageNow.current }
    /* focus left on the last run's card (it was fading out) counts as idle too */
    const idle = !a || a === document.body || (a instanceof HTMLButtonElement && a.disabled) || a.getAttribute('aria-disabled') === 'true' || !!a.closest('[data-testid="viz-running"]')
    if (idle) runCard.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  }, [isRunning])
  /* (F162) A pin taken off (Remove) takes the focus it held with it — hand it to the pin tool rather than the page. Only when exactly that
     pin went and the rest stayed (a new version's pins arriving is not a removal). */
  const pinIds = pins ? pins.map((p) => p.id).join(',') : ''
  const lastPins = useRef<{ ids: string[]; image: string | null }>({ ids: [], image: null })
  useEffect(() => {
    const ids = pinIds ? pinIds.split(',') : []
    const prev = lastPins.current
    lastPins.current = { ids, image: imageNow.current }
    if (prev.image !== imageNow.current) return   // another version on screen: its own pins, nothing was removed
    const gone = prev.ids.filter((id) => !ids.includes(id))
    if (gone.length !== 1 || ids.length !== prev.ids.length - 1) return
    if (document.activeElement && document.activeElement !== document.body) return
    document.querySelector<HTMLElement>('[data-testid="viz-pin-toggle"]')?.focus({ preventScroll: true })
  }, [pinIds])
  /* (F162) Once the card has faded out: a run that landed puts focus on its new version's tile; a cancelled one gives it back to what held
     it (Generate), else the tile on screen — never the page. Focus the studio moved elsewhere meanwhile stays where it is. */
  const afterRun = () => {
    const a = document.activeElement
    if (a && a !== document.body && !a.closest('[data-testid="viz-running"]')) return
    const tile = document.querySelector<HTMLElement>('[data-testid="viz-version"][aria-pressed="true"]')
    const from = runFrom.current.el
    const landed = imageNow.current !== runFrom.current.image
    if (!landed && from instanceof HTMLElement && from.isConnected) { from.focus({ preventScroll: true }); if (document.activeElement === from) return }
    tile?.focus({ preventScroll: true })
  }
  /* Once the version is being kept the Cancel goes; focus that sat on it stays on the card rather than dropping to the page. */
  const isSaving = !!running?.saving
  useEffect(() => {
    if (!isSaving) return
    const a = document.activeElement
    if (!a || a === document.body) runCard.current?.focus({ preventScroll: true })
  }, [isSaving])

  /* (F164 · verify round 1) the banner says Click to a mouse and Tap to a finger, as the tip above the stage does; (surfaces-28) a phone held
     sideways reads the short line — its photo is too small to lose a two-line banner off the top — and the photo's name keeps the whole */
  const tap = touch ? 'Tap' : 'Click'
  const banner = mode.kind === 'place' ? { text: `${tap} the photo where ${mode.label} is`, brief: `${tap} where ${mode.label} is`, cancel: mode.onCancel, icon: 'add_circle' }
    : mode.kind === 'draw' ? { text: slip ? 'Keep pressing and trace all the way round' : `Draw around ${mode.label} — press and trace its outline`, brief: slip ? 'Trace all the way round' : `Draw around ${mode.label}`, cancel: mode.onCancel, icon: 'draw' }
    : mode.kind === 'remove' ? { text: `${tap} the ${mode.label} to take off the list`, brief: `${tap} the ${mode.label}`, cancel: mode.onCancel, icon: 'close' }
    : mode.kind === 'pin' && pinOn && !mode.drafting ? { text: `${tap} the photo where your note goes`, brief: `${tap} where your note goes`, cancel: mode.onCancel, icon: 'push_pin' } : null
  /* (verify round 1) Centred over the stage on one line where it fits beside the version chip; where the two would meet it moves right,
     clear of the chip, and where there is no room for that it drops under the chip instead of covering it. */
  const chipOn = !!box.chip && chipClear
  const centred = (box.w - bannerW) / 2, clear = box.chipR + gap
  const bannerShift = chipOn && bannerW > 0 && centred < clear
  const bannerLow = bannerShift && clear + bannerW > box.w - 16
  /* (surfaces-28) a sideways phone's photo fills its stage: the short banner sits small in the photo's top-left corner, 8px in — never across
     its top third; a short, wide stage elsewhere keeps it over the photo's top edge, clear of the bar's column */
  const photoLeft = layout === 'side' ? sideFrom : (box.w - fw) / 2
  const photoTop = (box.h - padTop - padBottom - fh) / 2 + padTop
  const bannerTop = sideways ? Math.max(EDGE, Math.round(photoTop) + 8) : layout === 'side' ? EDGE : bannerLow ? box.chip + gap : phone ? 12 : 16
  const bannerAt = sideways ? { left: `calc(${Math.max(EDGE, Math.round(photoLeft) + 8)}px + var(--viz-inset-l, 0px))`, right: 'auto', marginInline: 0, maxWidth: Math.max(160, Math.round(fw) - 16) }
    : layout === 'side' ? { left: `calc(${Math.round(sideFrom) + 8}px + var(--viz-inset-l, 0px))`, right: 'auto', marginInline: 0, maxWidth: Math.max(160, Math.round(fw) - 16) }
    : bannerShift && !bannerLow ? { left: `calc(${clear}px + var(--viz-inset-l, 0px))`, right: 'auto', marginInline: 0 } : null
  const keyed = keyedNow
  const pct = Math.round(zoom * 100)
  const showMarkers = !compare && !running && !pinOn && markers.length > 0
  /* (verify round 1) Once a finish is picked for the lit surfaces, the region wears it — a wash of the pick's colour over the region's own
     soft mask, two layers deep (about two thirds at its heart) — so the photo previews the choice, never the brand's purple. */
  const rimId = `viz-rim-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  /* (desktop-5) a piece lit on the photo reads the same way: its rim, a lighter wash (a neutral sofa takes any purple as its colour), and
     the pick's colour once Customize has one — the editor gives a piece's marker its pick's colour (`fill`) and words (`pending`) */
  const lit = markers.filter((m) => m.selected)
  const litPieces = lit.length > 0 && lit.every((m) => m.kind === 'furniture')
  const tint = lit.length && lit.every((m) => !!m.pending && !!m.fill && m.fill === lit[0]!.fill) ? lit[0]!.fill : null
  const groupLabel = markers.every((m) => m.kind === 'surface') ? 'Surfaces on the photo' : markers.every((m) => m.kind === 'furniture') ? 'Furniture on the photo' : 'Markers on the photo'
  /* (F172) motion from lib/motion; with Reduce motion every fade here is the house 80ms and nothing slides */
  const quick = reduce ? 0.08 : null
  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: quick ?? duration.toggle, ease: ease.standard } }
  const runFade = reduce ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.08 } }, exit: { opacity: 0, transition: { duration: 0.08 } } } : overlayFade

  return (
    <div ref={area} className={styles.area} data-mode={kind} data-pin-bounds="" data-fit={layout} data-compact={compact || undefined} data-sideways={sideways || undefined} onWheel={onWheel}
         style={{ paddingTop: padTop, paddingBottom: padBottom, ['--edge' as string]: `${EDGE}px` }}>
      {chip ? <div ref={chipBox} className={styles.chip} data-off={!chipClear || undefined} aria-hidden={!chipClear || undefined}>{chip}</div> : null}
      <AnimatePresence>
        {banner ? (
          <motion.div key={banner.icon} ref={bannerRef} className={styles.banner} role="status" style={{ top: bannerTop, ...bannerAt }} data-low={bannerLow || undefined}
                      initial={{ opacity: 0, y: reduce ? 0 : -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -8 }} transition={{ duration: quick ?? duration.toggle, ease: ease.standard }}>
            <Icon name={banner.icon} size={18} weight={300} />
            <span>{sideways ? banner.brief : banner.text}</span>
            {/* (critic 17 · D5) Esc already leaves every one of these modes — said where the Cancel is */}
            {banner.cancel ? <Tooltip label="Cancel (Esc)"><button type="button" className={styles.bannerCancel} onClick={banner.cancel} aria-keyshortcuts="Escape">Cancel</button></Tooltip> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
      {/* (verify round 1) The lit region, drawn from its own soft mask: a 2px rim in the brand colour just outside it and a light, even
          wash inside (10%) — still, never pulsing, and never a flood that reads as the colour being picked. */}
      <svg className={styles.defs} aria-hidden focusable="false">
        <filter id={rimId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feComponentTransfer in="SourceAlpha" result="solid"><feFuncA type="discrete" tableValues="0 1 1 1 1" /></feComponentTransfer>
          <feMorphology in="solid" operator="dilate" radius="2" result="grown" />
          <feComposite in="grown" in2="solid" operator="out" result="ring" />
          <feFlood className={styles.ink} result="ink" />
          <feComposite in="ink" in2="ring" operator="in" result="rim" />
          <feComposite in="ink" in2="solid" operator="in" result="fill" />
          <feComponentTransfer in="fill" result="wash"><feFuncA type="linear" slope={litPieces ? 0.04 : 0.1} /></feComponentTransfer>
          <feMerge><feMergeNode in="wash" /><feMergeNode in="rim" /></feMerge>
        </filter>
      </svg>
      {!image ? empty : (
        <div className={styles.viewport} style={{ transform: `translate(${shown.x}px, ${shown.y}px) scale(${zoom})`, ['--z' as string]: zoom, ...sideMargin }} data-grab={grabbing || undefined} data-live={live || undefined}>
          <div ref={frame} className={styles.frame} style={{ width: fw || undefined, height: fh || undefined }} data-small={small || undefined} data-testid="viz-frame"
               onFocus={() => { inFrame.current = true }} onBlur={(e) => { if (e.relatedTarget) inFrame.current = false }}
               tabIndex={keyed ? 0 : undefined} role={keyed ? 'region' : undefined} aria-label={keyed && banner ? `${banner.text} — or press Enter to use the middle of the view` : undefined} aria-keyshortcuts={keyed ? 'Enter' : undefined}
               onPointerDown={onFrameDown} onPointerMove={onFrameMove} onPointerUp={onFrameUp} onPointerCancel={endGesture} onKeyDown={keyed ? onFrameKey : undefined}
               onDoubleClick={() => { if (kind === 'view' && !compare) zoomTo(1) }}>
            {compare ? (
              <CompareSlider key={`${compare.before}|${image}`} className={styles.compare} before={compare.before} after={image} beforeLabel={compare.beforeLabel} afterLabel={compare.afterLabel} testId="viz-compare" />
            ) : (
              <AnimatePresence initial={false}>
                <motion.img key={image} ref={readNatural} className={styles.photo} src={image} alt={alt} draggable={false}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: quick ?? duration.sheet, ease: ease.standard }}
                            onLoad={(e) => readNatural(e.currentTarget)} />
              </AnimatePresence>
            )}
            <AnimatePresence initial={false}>
              {preview && !compare ? (
                <motion.div key="preview" className={styles.fill} {...fade}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.fill} src={preview} alt="" aria-hidden data-testid="viz-preview" />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {wash && !compare && !path ? (
                <motion.div key={wash} className={styles.fill} {...fade}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={`${styles.fill} ${styles.highlight}`} src={wash} alt="" aria-hidden data-testid="viz-wash" />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {highlight && !compare && !path ? (
                <motion.div key={highlight} className={styles.fill} {...fade}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={`${styles.fill} ${styles.highlight}`} src={highlight} alt="" aria-hidden data-testid="viz-highlight" style={{ filter: `url(#${rimId})` }} />
                  <AnimatePresence initial={false}>
                    {tint ? <motion.span key={tint} className={styles.tint} style={{ ['--tint' as string]: tint, ['--mask' as string]: `url("${highlight}")` }} aria-hidden data-testid="viz-tint" {...fade} /> : null}
                  </AnimatePresence>
                </motion.div>
              ) : null}
            </AnimatePresence>
            {showMarkers ? (
              <div role="group" aria-label={groupLabel} className={styles.markers}>
                {markers.map((m) => {
                  const target = mode.kind === 'remove' ? mode.ids.includes(m.id) : false
                  const name = titleCaseLabel(m.label)
                  const tip = `${name}${m.now ? ` · now ${m.now}` : ''}`
                  const said = m.kind === 'surface'
                    ? `${name}${m.now ? `, now ${m.now}` : ''}${m.pending ? `, changing to ${m.pending}` : ''}`
                    : `${name}${m.now ? `, now ${m.now}` : ''}${m.action ? `, ${ACTION_WORD[m.action]}` : ''}`
                  return (
                    <Tooltip key={m.id} label={target ? `Take ${name} off the list` : tip}>
                      <button type="button" className={styles.dot} data-kind={m.kind} data-selected={m.selected || undefined} data-action={m.action ?? undefined} data-target={target || undefined}
                              style={{ left: `${clampDot(m.x) * 100}%`, top: `${clampDot(m.y) * 100}%`, ['--fill' as string]: m.fill ?? undefined }}
                              aria-label={target ? `Take ${name} off the list` : said} aria-pressed={m.selected} data-testid="viz-marker"
                              onClick={(e) => { e.stopPropagation(); if (mode.kind === 'remove') { if (target) mode.onPick(m.id); return } onDot(m) }}>
                        {m.action === 'remove' ? <Icon name="close" size={12} weight={400} /> : m.action === 'customize' ? <Icon name="palette" size={12} weight={400} /> : m.action === 'replace' ? <Icon name="swap_horiz" size={12} weight={400} /> : null}
                      </button>
                    </Tooltip>
                  )
                })}
              </div>
            ) : null}
            {pins && !compare && !running ? pins.map((p, i) => (
              <button key={p.id} type="button" className={styles.pin} data-role={p.authorRole} data-resolved={p.status === 'resolved' || undefined} data-active={activePin === p.id || undefined}
                      style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} aria-label={`Pin ${i + 1}: ${p.body}`} data-testid="viz-pin" data-pin-id={p.id} onClick={(e) => { e.stopPropagation(); onPin(p.id) }}>{i + 1}</button>
            )) : null}
            {path ? (
              <svg className={styles.fill} viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden data-testid="viz-trace">
                <polygon points={path.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--om-color-surface-default)" strokeWidth={4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                <polygon points={path.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(85,0,255,0.12)" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
            ) : null}
            {!compare ? children : null}
          </div>
        </div>
      )}
      <AnimatePresence onExitComplete={afterRun}>
        {running ? (
          <motion.div className={styles.running} role="status" aria-live="polite" data-testid="viz-running" {...runFade}>
            <div ref={runCard} className={styles.runCard} tabIndex={-1}>
              <span className={styles.runGlyph}><Icon name="wand_shine" size={28} weight={300} /></span>
              <span className={styles.runTitle}>{running.title}</span>
              <span className={styles.bar}><span className={styles.barFill} style={{ width: `${Math.round(((running.step + 1) / running.steps.length) * 100)}%` }} /></span>
              <ol className={styles.steps}>
                {running.steps.map((s, i) => (
                  <li key={s} data-state={i < running.step ? 'done' : i === running.step ? 'now' : 'todo'}>
                    <span className={styles.stepGlyph}>{i < running.step ? <Icon name="check_circle" size={18} weight={300} /> : i === running.step ? <Icon name="progress_activity" size={18} weight={300} className={styles.spin} /> : <span className={styles.stepDot} />}</span>{s}
                  </li>
                ))}
              </ol>
              {running.saving ? null : <Button variant="secondary" appearance="outlined" onPress={onCancelRun}>Stop</Button>}   {/* (S42 D-16) one word for one press — the result says "Stopped" */}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {image ? (
        <div ref={bar} className={styles.toolbar} role="toolbar" aria-label="Canvas" data-viz-canvasbar="" data-top={barTop || undefined} aria-orientation={layout === 'side' ? 'vertical' : undefined}
             style={barRight !== null ? { right: `calc(${barRight}px + var(--viz-inset-r, 0px))` } : undefined}>
          {/* (F142) on the narrowest phones the − / + step aside (a pinch zooms, a double-tap fits) so every tool fits the bar */}
          <span className={styles.zoomStep} data-zoom-step=""><Tooltip label="Zoom out"><IconButton icon="remove" label="Zoom out" size={36} variant="bare" iconSize={20} disabled={zoom <= ZMIN} onClick={() => zoomTo(zoom - 0.25)} /></Tooltip></span>
          <Tooltip label="Fit to screen"><button type="button" className={styles.zoomLabel} onClick={() => zoomTo(1)} aria-label={`Zoom ${pct}%, fit to screen`}>{pct}%</button></Tooltip>
          <span className={styles.zoomStep} data-zoom-step=""><Tooltip label="Zoom in"><IconButton icon="add" label="Zoom in" size={36} variant="bare" iconSize={20} disabled={zoom >= ZMAX} onClick={() => zoomTo(zoom + 0.25)} /></Tooltip></span>
          <span className={styles.rule} />
          {toolbar}
        </div>
      ) : null}
    </div>
  )
}
