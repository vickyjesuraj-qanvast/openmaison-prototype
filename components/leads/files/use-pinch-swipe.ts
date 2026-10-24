'use client'

import { useEffect, useRef, type RefObject } from 'react'

/** Never below fit; up to four times it by pinch (the house paper viewer's bounds, components/quotes/confirm/paper-viewer.tsx). */
export const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.5
const DOUBLE_TAP_MS = 320, DOUBLE_TAP_PX = 28, TAP_PX = 10, TAP_MS = 400
/** A swipe that turns the page: this far sideways, and clearly more sideways than down. */
const SWIPE_PX = 64

export type View = { s: number; x: number; y: number }
export const FIT: View = { s: 1, x: 0, y: 0 }
export const transformOf = (v: View) => (v.x || v.y ? `translate(${v.x}px, ${v.y}px) scale(${v.s})` : `scale(${v.s})`)

/**
 * (Leads on the move, L4 — P-11 · C-23) The file viewer's gestures on a finger, the house paper viewer's (pinch, double-tap, pan) with a swipe
 * for the next file: two fingers zoom the picture between fit and four times it, around the point between them — the page and its bar never
 * scale; one finger pans a zoomed picture inside its canvas; a double-tap goes to 2.5× there and a second one back to fit; at fit a sideways
 * swipe moves to the folder's previous or next file, the picture following the finger until it lets go. The gesture draws on the element's
 * own transform (no render per frame); `onCommit` hands the view back to the host when the fingers lift. Native listeners: React's touch
 * listeners are passive, and the browser's own pan has to be refused.
 */
export function usePinchSwipe({ canvas, target, enabled, view, onCommit, onSwipe }: {
  canvas: RefObject<HTMLElement | null>
  target: RefObject<HTMLElement | null>
  enabled: boolean
  view: View
  onCommit: (v: View) => void
  /** −1 = the previous file, 1 = the next; false when there is none that way (the picture springs back). */
  onSwipe: (dir: -1 | 1) => boolean
}) {
  const live = useRef<View>(view)
  useEffect(() => { live.current = view }, [view])
  const commitRef = useRef(onCommit)
  const swipeRef = useRef(onSwipe)
  useEffect(() => { commitRef.current = onCommit; swipeRef.current = onSwipe })

  useEffect(() => {
    const el = canvas.current
    if (!enabled || !el) return
    const img = () => target.current
    const box = () => el.getBoundingClientRect()
    /** How far a picture drawn at `s` may move before an edge comes into the canvas. */
    const clamp = (v: View): View => {
      const t = img()
      if (!t || v.s <= 1) return { s: Math.max(1, v.s), x: 0, y: 0 }
      const w = t.offsetWidth, h = t.offsetHeight, r = box()
      const mx = Math.max(0, (w * v.s - r.width) / 2), my = Math.max(0, (h * v.s - r.height) / 2)
      return { s: v.s, x: Math.max(-mx, Math.min(mx, v.x)), y: Math.max(-my, Math.min(my, v.y)) }
    }
    const draw = (v: View, animate = false) => {
      const t = img()
      if (!t) return
      t.style.transition = animate ? '' : 'none'
      t.style.transform = transformOf(v)
    }
    /** after a gesture the picture animates again for the bar's presses (the gesture drew without a transition) */
    const rest = () => { const t = img(); if (t) t.style.transition = '' }
    let pinch: { d0: number; s0: number; cx: number; cy: number; v0: View } | null = null
    let drag: { x0: number; y0: number; v0: View; t0: number; swiping: boolean } | null = null
    let lastTap: { t: number; x: number; y: number } | null = null
    const dist = (t: TouchList) => Math.hypot(t[0]!.clientX - t[1]!.clientX, t[0]!.clientY - t[1]!.clientY)
    /* the picture's own centre as laid out (its transform's origin) — the canvas pads its foot for the zoom bar, so not the canvas's */
    const centre = () => { const r = box(); const t = img(); return t ? { x: r.left + t.offsetLeft + t.offsetWidth / 2, y: r.top + t.offsetTop + t.offsetHeight / 2 } : { x: r.left + r.width / 2, y: r.top + r.height / 2 } }

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const c = centre()
        pinch = { d0: Math.max(1, dist(e.touches)), s0: live.current.s, cx: (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2 - c.x, cy: (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2 - c.y, v0: live.current }
        drag = null
      } else if (e.touches.length === 1) {
        drag = { x0: e.touches[0]!.clientX, y0: e.touches[0]!.clientY, v0: live.current, t0: Date.now(), swiping: false }
      }
    }
    const onMove = (e: TouchEvent) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault()
        const s = Math.max(1, Math.min(MAX_SCALE, (pinch.s0 * dist(e.touches)) / pinch.d0))
        const k = s / pinch.v0.s
        /* the point between the fingers stays where it is: the offset scales about it */
        const next = clamp({ s, x: pinch.cx - (pinch.cx - pinch.v0.x) * k, y: pinch.cy - (pinch.cy - pinch.v0.y) * k })
        live.current = next
        draw(next)
        return
      }
      if (!drag || e.touches.length !== 1) return
      const dx = e.touches[0]!.clientX - drag.x0, dy = e.touches[0]!.clientY - drag.y0
      if (drag.v0.s > 1) {
        e.preventDefault()
        const next = clamp({ s: drag.v0.s, x: drag.v0.x + dx, y: drag.v0.y + dy })
        live.current = next
        draw(next)
      } else if (drag.swiping || (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5)) {
        e.preventDefault()
        drag.swiping = true
        draw({ s: 1, x: dx, y: 0 })   // the picture follows the finger
      }
    }
    const onEnd = (e: TouchEvent) => {
      if (pinch) {
        if (e.touches.length >= 2) return
        pinch = null
        commitRef.current(live.current)
        rest()
        return
      }
      if (!drag || e.changedTouches.length !== 1) return
      const t = e.changedTouches[0]!
      const dx = t.clientX - drag.x0, dy = t.clientY - drag.y0
      const d = drag
      drag = null
      if (d.v0.s > 1) { if (Math.hypot(dx, dy) > TAP_PX) { commitRef.current(live.current); rest(); return } }
      else if (d.swiping) {
        const dir: -1 | 1 = dx < 0 ? 1 : -1
        if (Math.abs(dx) >= SWIPE_PX && swipeRef.current(dir)) return   // the next file opens; the picture stays where the finger left it
        draw(FIT, true)   // nothing that way, or not far enough: back to fit
        return
      }
      /* a tap: the second of two zooms in at that point, or back to fit */
      const tap = Math.hypot(dx, dy) < TAP_PX && Date.now() - d.t0 < TAP_MS
      if (!tap) { lastTap = null; return }
      const now = Date.now()
      if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < DOUBLE_TAP_PX) {
        lastTap = null
        if (live.current.s > 1) { live.current = FIT; draw(FIT, true); commitRef.current(FIT); return }
        const c = centre()
        const px = t.clientX - c.x, py = t.clientY - c.y
        const next = clamp({ s: DOUBLE_TAP_SCALE, x: px - px * DOUBLE_TAP_SCALE, y: py - py * DOUBLE_TAP_SCALE })
        live.current = next
        draw(next, true)
        commitRef.current(next)
      } else lastTap = { t: now, x: t.clientX, y: t.clientY }
    }
    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart); el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd); el.removeEventListener('touchcancel', onEnd)
    }
  }, [canvas, target, enabled])
}
