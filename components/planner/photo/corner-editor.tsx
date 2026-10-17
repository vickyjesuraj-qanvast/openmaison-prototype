'use client'

import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { CORNER_NAMES, type Quad } from '@/lib/planner/corners'
import styles from './corner-editor.module.css'

/**
 * (S42 D·1 — S41's proposal, built as recommended: her "build all of them" 2026-10-11, listed in s42/calls-for-vicky.md) The four corners of a
 * sheet of paper on a photo, placed by hand — 1.0's floor-plan bench's corner editor ("Adjust paper corners"), first built on the developers'
 * bench (S41's Plan corners) and now one piece for both: Make a 3D picture's *Square it by its corners* and the bench. Each corner is a named
 * 44px button: drag it (a finger too — `touch-action: none` on the frame), or Tab to it and move it with the arrow keys (Shift for bigger
 * steps). The frame keeps the photo's shape and never runs taller than `maxHeight`; the quad between the corners is tinted.
 */
export function CornerEditor({ src, width, height, quad, onQuad, alt, maxHeight, className, testId, handleTestId }: {
  /** the photo, as a URL the browser can show */ src: string
  /** the photo's own pixels — the corners are in them */ width: number; height: number
  quad: Quad
  onQuad: (q: Quad) => void
  alt: string
  /** a CSS length the frame never runs taller than (the photo's shape kept) — none, the full width */ maxHeight?: string
  className?: string
  testId?: string
  /** each handle's test id is this and its index (0 top-left … 3 bottom-left) */ handleTestId?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<number | null>(null)
  const ratio = width / Math.max(1, height)
  const toPx = (clientX: number, clientY: number) => {
    const rect = box.current?.getBoundingClientRect()
    if (!rect || !rect.width || !rect.height) return null
    return { x: Math.max(0, Math.min(width, ((clientX - rect.left) / rect.width) * width)), y: Math.max(0, Math.min(height, ((clientY - rect.top) / rect.height) * height)) }
  }
  const move = (i: number, p: { x: number; y: number }) => onQuad(quad.map((c, k) => (k === i ? p : c)) as Quad)
  const onDown = (i: number) => (e: PointerEvent<HTMLButtonElement>) => { drag.current = i; e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault() }
  const onMove = (e: PointerEvent<HTMLButtonElement>) => { if (drag.current === null) return; const p = toPx(e.clientX, e.clientY); if (p) move(drag.current, p) }
  const onUp = (e: PointerEvent<HTMLButtonElement>) => { drag.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) }
  const onKey = (i: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = (e.shiftKey ? 0.02 : 0.004) * Math.max(width, height)
    const d = e.key === 'ArrowLeft' ? [-step, 0] : e.key === 'ArrowRight' ? [step, 0] : e.key === 'ArrowUp' ? [0, -step] : e.key === 'ArrowDown' ? [0, step] : null
    if (!d) return
    e.preventDefault()
    const c = quad[i]!
    move(i, { x: Math.max(0, Math.min(width, c.x + d[0]!)), y: Math.max(0, Math.min(height, c.y + d[1]!)) })
  }
  const style = { '--ratio': String(ratio), ...(maxHeight ? { width: `min(100%, calc(${maxHeight} * ${ratio}))` } : {}) } as CSSProperties
  return (
    <div ref={box} className={className ? `${styles.frame} ${className}` : styles.frame} style={style} data-testid={testId}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a picture read in the browser (a data URL) */}
      <img src={src} alt={alt} />
      <svg className={styles.quad} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden><polygon points={quad.map((c) => `${c.x},${c.y}`).join(' ')} /></svg>
      {quad.map((c, i) => (
        <button key={i} type="button" className={styles.handle} style={{ left: `${(c.x / width) * 100}%`, top: `${(c.y / height) * 100}%` }} aria-label={`${CORNER_NAMES[i]} — arrow keys move it`}
                onPointerDown={onDown(i)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey(i)}
                data-testid={handleTestId ? `${handleTestId}-${i}` : undefined} data-x={Math.round(c.x)} data-y={Math.round(c.y)} />
      ))}
    </div>
  )
}
