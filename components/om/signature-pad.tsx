'use client'

import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import styles from './signature-pad.module.css'

/**
 * A signature drawn by pointer or finger, stored as an SVG path on a 752×140 box — the member's Signature Settings pad (REG-421), shared
 * (REG-633) so the client's signing page draws the same way (contracts parity Q-18). `value` is the path ('' = nothing drawn yet).
 */
export function SignaturePad({ value, onChange, label = 'Draw your signature', hint, height = 140 }: { value: string; onChange: (path: string) => void; label?: string; /** Words in the empty box (the client's page). */ hint?: string; height?: number }) {
  const svg = useRef<SVGSVGElement>(null)
  const drawing = useRef(false)
  const point = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 752, y = ((e.clientY - r.top) / r.height) * 140
    return `${Math.max(0, Math.min(752, x)).toFixed(1)} ${Math.max(0, Math.min(140, y)).toFixed(1)}`
  }
  const down = (e: ReactPointerEvent<SVGSVGElement>) => { drawing.current = true; svg.current?.setPointerCapture(e.pointerId); onChange(`${value}${value ? ' ' : ''}M ${point(e)}`) }
  const move = (e: ReactPointerEvent<SVGSVGElement>) => { if (!drawing.current) return; onChange(`${value} L ${point(e)}`) }
  const up = () => { drawing.current = false }
  return (
    <div className={styles.pad} style={{ height }} data-testid="signature-pad">
      <svg ref={svg} className={styles.canvas} viewBox="0 0 752 140" preserveAspectRatio="none" role="img" aria-label={label}
           onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
        {value ? <path d={value} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> : null}
      </svg>
      {!value && hint ? <span className={styles.hint} aria-hidden>{hint}</span> : null}
      <button type="button" className={styles.clear} onClick={() => onChange('')} disabled={!value}>Clear</button>
    </div>
  )
}
