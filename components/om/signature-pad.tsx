'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import styles from './signature-pad.module.css'

/** The frame every drawn signature is stored on (lib/contracts/policy.ts DRAWN_PATH; the paper's 200×40 box draws it `meet`). */
const FRAME_W = 752, FRAME_H = 140

/**
 * The region of the frame a pad of `w`×`h` px maps to: the pad's own box scaled UNIFORMLY to fit inside the frame and centred — so a
 * stroke keeps its shape whatever the pad's width (a 100×100 square stays square), and the whole pad is drawable (no dead band).
 */
function regionOf(w: number, h: number) {
  const s = Math.min(FRAME_W / w, FRAME_H / h)   // frame units per px
  const rw = w * s, rh = h * s
  return { s, x: (FRAME_W - rw) / 2, y: (FRAME_H - rh) / 2, w: rw, h: rh }
}
/** Whether every point of a stored path lies inside the region (a path drawn on another pad's box may not). */
function fitsRegion(path: string, r: { x: number; y: number; w: number; h: number }): boolean {
  const nums = path.match(/-?\d+(?:\.\d+)?/g)
  if (!nums) return true
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]), y = Number(nums[i + 1])
    if (x < r.x - 1 || x > r.x + r.w + 1 || y < r.y - 1 || y > r.y + r.h + 1) return false
  }
  return true
}

/**
 * A signature drawn by pointer or finger, stored as an SVG path on a 752×140 box — the member's Signature Settings pad (REG-421), shared
 * (REG-633) so the client's signing page draws the same way (contracts parity Q-18). `value` is the path ('' = nothing drawn yet).
 *
 * (Contracts on the move, C3 — A-19 · P-06) The pad maps its box into the frame UNIFORMLY: the stroke is stored in the shape it was drawn —
 * it was stretched to the pad's width before (`preserveAspectRatio="none"`: a square drawn on a 390 phone printed twice as wide, one drawn
 * on a 1024 tablet squeezed). The svg shows exactly the region the pad maps to (`xMidYMid meet`, the same ratio as the box), so the ink lands
 * under the finger; a path stored by another pad that reaches outside this region shows whole, the frame letterboxed. The paper, the signed
 * copy and the record keep reading the frame as before. Shared with Signature Settings (the quote editor's Signature section), where the
 * change is the same fix. `ratio` = width / height for a pad that keeps a shape (the phone's 2:1) instead of a fixed height; `hideClear` for a
 * host that draws its own Clear (the phone's 44 text button under the pad).
 */
export function SignaturePad({ value, onChange, label = 'Draw your signature', hint, height = 140, ratio, hideClear = false }: {
  value: string; onChange: (path: string) => void; label?: string
  /** Words in the empty box (the client's page). */ hint?: string
  height?: number
  /** (C3) width / height — the pad keeps this shape at any width; `height` is then ignored. */ ratio?: number
  /** (C3) no corner Clear — the host draws its own. */ hideClear?: boolean
}) {
  const svg = useRef<SVGSVGElement>(null)
  const drawing = useRef(false)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const read = () => { const r = el.getBoundingClientRect(); setBox((b) => (Math.abs(b.w - r.width) < 0.5 && Math.abs(b.h - r.height) < 0.5 ? b : { w: r.width, h: r.height })) }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const region = useMemo(() => (box.w > 0 && box.h > 0 ? regionOf(box.w, box.h) : null), [box])
  const whole = useMemo(() => !region || (!!value && !fitsRegion(value, region)), [value, region])
  const viewBox = whole || !region ? `0 0 ${FRAME_W} ${FRAME_H}` : `${region.x.toFixed(2)} ${region.y.toFixed(2)} ${region.w.toFixed(2)} ${region.h.toFixed(2)}`
  const point = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect()
    let x: number, y: number
    if (whole || !region) {
      /* the frame letterboxed in the box: the same mapping the svg draws with */
      const k = Math.min(r.width / FRAME_W, r.height / FRAME_H) || 1
      x = (e.clientX - r.left - (r.width - FRAME_W * k) / 2) / k; y = (e.clientY - r.top - (r.height - FRAME_H * k) / 2) / k
    } else {
      x = region.x + (e.clientX - r.left) * region.s; y = region.y + (e.clientY - r.top) * region.s
    }
    return `${Math.max(0, Math.min(FRAME_W, x)).toFixed(1)} ${Math.max(0, Math.min(FRAME_H, y)).toFixed(1)}`
  }
  const down = (e: ReactPointerEvent<SVGSVGElement>) => { drawing.current = true; svg.current?.setPointerCapture(e.pointerId); onChange(`${value}${value ? ' ' : ''}M ${point(e)}`) }
  const move = (e: ReactPointerEvent<SVGSVGElement>) => { if (!drawing.current) return; onChange(`${value} L ${point(e)}`) }
  const up = () => { drawing.current = false }
  return (
    <div className={styles.pad} style={ratio ? { aspectRatio: String(ratio) } : { height }} data-testid="signature-pad">
      <svg ref={svg} className={styles.canvas} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}
           onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
        {value ? <path d={value} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> : null}
      </svg>
      {!value && hint ? <span className={styles.hint} aria-hidden>{hint}</span> : null}
      {hideClear ? null : <button type="button" className={styles.clear} onClick={() => onChange('')} disabled={!value}>Clear</button>}
    </div>
  )
}
