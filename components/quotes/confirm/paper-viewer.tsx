'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { SurfaceHead } from '@/components/om/dialog'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import styles from './paper-viewer.module.css'

/** The gutter on screen at fit: a page sits 16 in from each edge; between two pages the gutters meet (32). */
const GUTTER = 16
/** Never below fit to width (Q-06); up to four times it by pinch; a double-tap goes to two and a half, a second one back to fit. */
const MAX_SCALE = 4, DOUBLE_TAP_SCALE = 2.5
/** Dots up to six pages (six 44px targets fit a 320 phone); beyond that the row counts "n / N". */
const DOTS_MAX = 6
const DOUBLE_TAP_MS = 320, DOUBLE_TAP_PX = 28, TAP_PX = 10, TAP_MS = 400

/**
 * (Quotes on the move, K4 — P-12 · A-17, Q-06) "As printed" on a phone is a VIEWER, not a page: the A4 fitted to the screen's width under one
 * bar (← · As printed · n pages · Download), the quote itself stays the reading cards; this opens over them and closes back to them. Printing
 * (Download a copy) prints the document this viewer holds.
 * (K3 — P-05, the studio's Preview shares it) The pages lie side by side, one per swipe (the body snaps page by page), with dots that say
 * where you are and jump to a page; a pinch or a double-tap zooms in — the page then pans both ways inside the body and the bar never scales
 * (C-16) — and *Fit to width* brings it back. `onFit` = the width the document should be drawn at: the body's inner width at fit, times the
 * zoom the fingers asked for; the host draws its pages at `fit / the paper's width` and may clamp it.
 * (held calls 2026-10-24, W3-15) A project's floor-plan papers open in it too: `backLabel` names where ← goes (the quote's words by default) and
 * `startPage` lands on the page that was pressed.
 */
export function PaperViewer({ open, onClose, title, subtitle, onDownload, children, onFit, backLabel = 'Back to the quote', startPage = 0 }: {
  open: boolean
  onClose: () => void
  title: string
  /** (K3) one line under the title — the number and the page count */
  subtitle?: ReactNode
  onDownload: () => void
  children: ReactNode
  /** The width the document should be drawn at — the body's inner width (less the gutters), times the zoom, measured as it opens and whenever either changes. */
  onFit: (width: number) => void
  /** (W3-15) ←'s words — its tooltip and its name */
  backLabel?: string
  /** (W3-15) the page it opens on, from 0 */
  startPage?: number
}) {
  const panel = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  useScrollLock(open)
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const [w, setW] = useState(0)
  const [scale, setScale] = useState(1)   // 1 = fit to width
  const scaleRef = useRef(1)
  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => {
    const el = body.current
    if (!open || !el) return
    const ro = new ResizeObserver((es) => { for (const e of es) setW(e.contentRect.width) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])
  useEffect(() => { if (open && w) onFit(Math.max(0, w - 2 * GUTTER) * scale) }, [open, w, scale, onFit])
  /* what the body holds: the page count for the dots, and the zoom the host drew at (a page's screen width over its own px) — read after the
     host has drawn, so the gap between pages can be set in the document's own px: 32 on screen at fit, whatever the zoom */
  const [pages, setPages] = useState(0)
  const [at, setAt] = useState(0)
  useEffect(() => {
    const b = box.current
    if (!open || !b) return
    const read = () => {
      const list = b.querySelectorAll<HTMLElement>('[data-page]')
      const first = list[0]
      if (first && first.offsetWidth) b.style.setProperty('--gap-z', `${(2 * GUTTER) / (first.getBoundingClientRect().width / first.offsetWidth)}px`)
      setPages((n) => (n === list.length ? n : list.length))
    }
    const ro = new ResizeObserver(read)   // fires as it starts, then whenever the host draws, re-draws at a new zoom or adds a page — the box changes size each time
    ro.observe(b)
    return () => ro.disconnect()
  }, [open])
  const vars = { '--edge': `${GUTTER * scale}px` } as CSSProperties

  /* The page in view, from the scroll — read in a frame, never in render. */
  const raf = useRef(0)
  const onScroll = () => {
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const el = body.current
      if (!el) return
      const slot = el.clientWidth * scaleRef.current
      const i = slot > 0 ? Math.max(0, Math.min(Math.max(0, pages - 1), Math.round(el.scrollLeft / slot))) : 0
      setAt((a) => (a === i ? a : i))
    })
  }
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])
  const goTo = (i: number) => { const el = body.current; if (el) el.scrollTo({ left: i * el.clientWidth * scaleRef.current, behavior: 'smooth' }) }
  /* (W3-15) opened on a later page: once that page is drawn, the body starts there (the scroll then says which page is in view) */
  const started = useRef(false)
  useLayoutEffect(() => {
    if (!open) { started.current = false; return }
    const el = body.current
    if (started.current || !el || !w || startPage <= 0 || pages <= startPage) return
    started.current = true
    el.scrollLeft = startPage * el.clientWidth
  })

  /* A zoom lands with the point under the fingers kept in place: once the host has drawn at the new width, the scroll is set in the same frame. */
  const pending = useRef<{ s0: number; fx: number; fy: number; ox: number; oy: number; page: number } | null>(null)
  const commit = useCallback((s1: number, s0: number, fx: number, fy: number) => {
    const el = body.current, b = box.current
    if (!el || !b) return
    const next = Math.max(1, Math.min(MAX_SCALE, s1))
    if (Math.abs(next - s0) < 0.01) return
    pending.current = { s0, fx, fy, ox: b.offsetLeft, oy: b.offsetTop, page: Math.floor((el.scrollLeft + fx) / Math.max(1, el.clientWidth * s0)) }
    setScale(next)
  }, [])
  useLayoutEffect(() => {
    const p = pending.current, el = body.current, b = box.current
    if (!p || !el || !b) return
    const first = b.querySelector<HTMLElement>('[data-page]')
    if (!first || Math.abs(first.getBoundingClientRect().width - Math.max(0, w - 2 * GUTTER) * scale) > 2) return   // the host has not drawn at the new width yet
    pending.current = null
    if (scale === 1) { el.scrollLeft = Math.max(0, Math.min(Math.max(0, pages - 1), p.page)) * el.clientWidth; el.scrollTop = 0; return }
    const k = scale / p.s0
    el.scrollLeft = Math.max(0, (el.scrollLeft + p.fx - p.ox) * k - p.fx + b.offsetLeft)
    el.scrollTop = Math.max(0, (el.scrollTop + p.fy - p.oy) * k - p.fy + b.offsetTop)   // the content is centred while shorter than the body, at the top once taller
  })

  /* Pinch and double-tap. Native listeners: React's touch listeners are passive, and the browser's own pan has to be refused on two fingers. */
  useEffect(() => {
    const el = body.current, b = box.current
    if (!open || !el || !b) return
    let pinch: { d0: number; s0: number; fx: number; fy: number; live: number } | null = null
    let lastTap: { t: number; x: number; y: number } | null = null
    let start: { x: number; y: number; t: number } | null = null
    const dist = (t: TouchList) => Math.hypot(t[0]!.clientX - t[1]!.clientX, t[0]!.clientY - t[1]!.clientY)
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()   // two fingers belong to the viewer: no page pan, no browser zoom
        const r = el.getBoundingClientRect()
        const fx = (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2 - r.left, fy = (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2 - r.top
        pinch = { d0: Math.max(1, dist(e.touches)), s0: scaleRef.current, fx, fy, live: scaleRef.current }
        b.style.transformOrigin = `${el.scrollLeft + fx - b.offsetLeft}px ${el.scrollTop + fy - b.offsetTop}px`
        b.style.willChange = 'transform'
        start = null
      } else if (e.touches.length === 1) {
        start = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY, t: Date.now() }
      }
    }
    const onMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return
      e.preventDefault()
      const k = Math.max(1, Math.min(MAX_SCALE, (pinch.s0 * dist(e.touches)) / pinch.d0)) / pinch.s0
      pinch.live = pinch.s0 * k
      b.style.transform = `scale(${k})`   // the gesture draws on the compositor; the real zoom lands when the fingers lift
    }
    const onEnd = (e: TouchEvent) => {
      if (pinch) {
        if (e.touches.length >= 2) return
        const { s0, live, fx, fy } = pinch
        pinch = null
        b.style.transform = ''; b.style.willChange = ''; b.style.transformOrigin = ''
        commit(live, s0, fx, fy)
        return
      }
      if (!start || e.changedTouches.length !== 1) return
      const t = e.changedTouches[0]!
      const tap = Math.hypot(t.clientX - start.x, t.clientY - start.y) < TAP_PX && Date.now() - start.t < TAP_MS
      start = null
      if (!tap) { lastTap = null; return }
      const now = Date.now()
      if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < DOUBLE_TAP_PX) {
        lastTap = null
        const r = el.getBoundingClientRect()
        const s0 = scaleRef.current
        commit(s0 > 1 ? 1 : DOUBLE_TAP_SCALE, s0, t.clientX - r.left, t.clientY - r.top)
      } else lastTap = { t: now, x: t.clientX, y: t.clientY }
    }
    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchmove', onMove); el.removeEventListener('touchend', onEnd); el.removeEventListener('touchcancel', onEnd) }
  }, [open, commit])

  if (!open || typeof document === 'undefined') return null   // opens on a press, after hydration — the Sheet's own guard
  const zoomed = scale > 1
  return createPortal(
    <div ref={panel} className={styles.viewer} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} data-testid="paper-viewer" data-scale={scale.toFixed(2)} data-page-at={at + 1}>
      {/* (REG-725) the house head: the back arrow leading, the title, Download as its one action — no close, the arrow is the way back */}
      <SurfaceHead className={styles.bar} title={title} subtitle={subtitle}
                   leading={<Tooltip label={backLabel}><IconButton icon="arrow_back" label={backLabel} size={24} variant="bare" iconSize={24} iconWeight={300} className={styles.barBtn} onClick={onClose} data-testid="paper-viewer-back" /></Tooltip>}
                   actions={<Tooltip label="Download a copy"><IconButton icon="download" label="Download a copy" size={24} variant="bare" iconSize={24} iconWeight={300} className={styles.barBtn} onClick={onDownload} data-testid="paper-viewer-download" /></Tooltip>} />
      <div ref={body} className={styles.body} data-zoomed={zoomed || undefined} onScroll={onScroll} style={vars}>
        <div ref={box} className={styles.box}>{children}</div>
      </div>
      <div className={styles.foot}>
        {pages > 1 ? (pages <= DOTS_MAX ? (
          <div className={styles.dots} role="group" aria-label="Pages" data-testid="page-dots">
            {Array.from({ length: pages }, (_, i) => <button key={i} type="button" className={styles.dot} aria-label={`Page ${i + 1} of ${pages}`} aria-current={i === at ? 'true' : undefined} onClick={() => goTo(i)} />)}
          </div>
        ) : <span className={styles.count} aria-live="polite" data-testid="page-count">{at + 1} / {pages}</span>) : null}
        {zoomed
          ? <Button appearance="text" onPress={() => { const el = body.current; commit(1, scale, el ? el.clientWidth / 2 : 0, 0) }} data-testid="fit-width">Fit to width</Button>
          : <p className={styles.hint} aria-hidden>{pages > 1 ? 'Swipe for the next page · pinch to zoom' : 'Pinch or double-tap to zoom'}</p>}
      </div>
    </div>,
    document.body,
  )
}
