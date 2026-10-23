'use client'

import { useRef, type PointerEvent } from 'react'

/**
 * (Quotes on the move, K4 — P-06 · A-20) A long press on a phone card selects it: the checkbox left the card, so a hold (500 ms, the
 * finger still) is the way into a selection and the bulk bar. The press that follows a hold is swallowed, so the card does not open as
 * the finger lifts; a finger that moves (a scroll) cancels the hold. Pointer events only — one code path for touch, pen and mouse.
 */
export function useLongPress(onLongPress: () => void, { enabled = true, ms = 500, slop = 8 }: { enabled?: boolean; ms?: number; slop?: number } = {}) {
  const timer = useRef<number | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)
  const clear = () => { if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null } start.current = null }
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (!enabled || e.button !== 0) return
    fired.current = false
    start.current = { x: e.clientX, y: e.clientY }
    timer.current = window.setTimeout(() => { timer.current = null; fired.current = true; onLongPress() }, ms)
  }
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const s = start.current
    if (!s) return
    if (Math.abs(e.clientX - s.x) > slop || Math.abs(e.clientY - s.y) > slop) clear()
  }
  const onPointerUp = () => clear()
  const onPointerCancel = () => clear()
  /** True once — the click that lands after a hold is the hold's own, not a press. */
  const swallowClick = () => { const f = fired.current; fired.current = false; return f }
  return { handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }, swallowClick }
}
