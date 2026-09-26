'use client'

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import styles from './compare-slider.module.css'

/**
 * Before / after (REG-673; 1.0's `compare-slider.tsx`, C-62): two pictures of the same size, one over the other, a divider you drag
 * anywhere — mouse, pen or touch — or move with the arrow keys (1.0 had no keyboard). The captions name the two sides. The box takes
 * the pictures' own shape; the parent decides how big it is.
 * Touch never traps the page: the box lets the browser scroll vertically (`pan-y`); a finger on the handle drags at once, a finger
 * elsewhere takes the divider only once it moves more sideways than up or down, and a tap places it. A mouse jumps and drags as before.
 */
export function CompareSlider({ before, after, beforeLabel = 'Before', afterLabel = 'After', start = 50, className, testId }: {
  before: string; after: string; beforeLabel?: string; afterLabel?: string; start?: number; className?: string; testId?: string
}) {
  const [pos, setPos] = useState(start)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const wait = useRef<{ id: number; x: number; y: number } | null>(null)
  const at = useCallback((clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (!r || !r.width) return
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }, [])
  const grab = (e: PointerEvent<HTMLDivElement>) => { drag.current = true; wait.current = null; e.currentTarget.setPointerCapture(e.pointerId); at(e.clientX) }
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' || (e.target as HTMLElement).closest('[role="slider"]')) { if (e.pointerType === 'mouse' && e.button !== 0) return; grab(e); return }
    wait.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) { at(e.clientX); return }
    const w = wait.current
    if (!w || w.id !== e.pointerId) return
    const dx = Math.abs(e.clientX - w.x), dy = Math.abs(e.clientY - w.y)
    if (dx >= 6 && dx > dy) grab(e)
    else if (dy >= 6) wait.current = null   // a scroll: the page has it
  }
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const w = wait.current
    if (w && w.id === e.pointerId) at(e.clientX)   // a tap places the divider
    wait.current = null
    drag.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const cancel = (e: PointerEvent<HTMLDivElement>) => {
    wait.current = null
    drag.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowLeft') { e.preventDefault(); setPos((p) => Math.max(0, p - step)) }
    if (e.key === 'ArrowRight') { e.preventDefault(); setPos((p) => Math.min(100, p + step)) }
    if (e.key === 'Home') { e.preventDefault(); setPos(0) }
    if (e.key === 'End') { e.preventDefault(); setPos(100) }
  }
  return (
    <div ref={box} className={className ? `${styles.box} ${className}` : styles.box} data-testid={testId}
         onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.img} src={before} alt={beforeLabel} draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={`${styles.img} ${styles.after}`} src={after} alt={afterLabel} draggable={false} style={{ clipPath: `inset(0 0 0 ${pos}%)` }} />
      <span className={styles.cap} data-side="before">{beforeLabel}</span>
      <span className={styles.cap} data-side="after">{afterLabel}</span>
      <div className={styles.divider} style={{ left: `${pos}%` }} role="slider" tabIndex={0} aria-label={`Compare ${beforeLabel} and ${afterLabel}`}
           aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)} aria-valuetext={`${Math.round(pos)}% ${beforeLabel}`} onKeyDown={key}>
        <span className={styles.handle} aria-hidden><span className={styles.chev}>‹</span><span className={styles.chev}>›</span></span>
      </div>
    </div>
  )
}
