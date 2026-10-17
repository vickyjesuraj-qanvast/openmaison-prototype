'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import styles from './project.module.css'

export type ViewerPhoto = { id: string; src: string; name: string }
const MAX_ZOOM = 4
const STEP = 0.5
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * (Projects round 4b, board 3) An update's photos, one at a time — the house xxl window (48 on every side at a desk, the whole screen on a
 * phone: `fluid` + `phoneFull`), its head the update's title and "2 of 5". The picture sits on the page ground as the house file viewer
 * draws it, with its prev / next and its zoom bar (remove · fit · add). On a touch screen: swipe to walk, pinch to zoom, drag to look around
 * a zoomed picture, double-tap to zoom in and back; at a desk the arrow keys walk and a double-click zooms. Esc closes (the Dialog's).
 */
export function PhotoViewer({ open, title, photos, index, onIndex, onClose }: {
  open: boolean
  title: string
  photos: ViewerPhoto[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const n = photos.length
  const i = clamp(index, 0, Math.max(0, n - 1))
  const photo = photos[i] ?? null
  const [view, setView] = useState({ z: 1, x: 0, y: 0, animate: false })
  const [seen, setSeen] = useState({ open, i })
  if (seen.open !== open || seen.i !== i) { setSeen({ open, i }); setView({ z: 1, x: 0, y: 0, animate: false }) }   // a new photo starts fitted
  const go = (d: number) => { const to = i + d; if (to >= 0 && to < n) onIndex(to) }
  const zoomTo = (z: number) => setView((v) => { const nz = clamp(z, 1, MAX_ZOOM); return nz === 1 ? { z: 1, x: 0, y: 0, animate: true } : { ...v, z: nz, animate: true } })

  /* ← → walk at a desk (Esc is the Dialog's) */
  const walk = useRef(go)
  useEffect(() => { walk.current = go })
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); walk.current(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); walk.current(1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  /* ── touch and pointer: one finger swipes (or pans a zoomed photo), two pinch, a double tap zooms ── */
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ kind: 'swipe' | 'pan' | 'pinch'; x0: number; y0: number; vx: number; vy: number; d0: number; z0: number } | null>(null)
  const lastTap = useRef(0)
  const lastType = useRef('mouse')   // a touch screen's double tap is ours; its synthesised dblclick is ignored
  const dist = () => { const [a, b] = [...pts.current.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0 }
  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    lastType.current = e.pointerType
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* a synthetic event */ }
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size === 2) { gesture.current = { kind: 'pinch', x0: 0, y0: 0, vx: view.x, vy: view.y, d0: dist(), z0: view.z }; return }
    gesture.current = { kind: view.z > 1 ? 'pan' : 'swipe', x0: e.clientX, y0: e.clientY, vx: view.x, vy: view.y, d0: 0, z0: view.z }
  }
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pts.current.has(e.pointerId)) return
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return
    if (g.kind === 'pinch' && pts.current.size >= 2 && g.d0 > 0) { const z = clamp((g.z0 * dist()) / g.d0, 1, MAX_ZOOM); setView((v) => ({ ...v, z, x: z === 1 ? 0 : v.x, y: z === 1 ? 0 : v.y, animate: false })); return }
    if (g.kind === 'pan') setView((v) => ({ ...v, x: g.vx + e.clientX - g.x0, y: g.vy + e.clientY - g.y0, animate: false }))
    if (g.kind === 'swipe') setView((v) => ({ ...v, x: (e.clientX - g.x0) * 0.6, animate: false }))
  }
  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pts.current.has(e.pointerId)) return
    pts.current.delete(e.pointerId)
    const g = gesture.current
    if (g?.kind === 'pinch') { if (pts.current.size < 2) gesture.current = null; return }
    gesture.current = null
    if (!g) return
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0
    if (g.kind === 'swipe') {
      setView((v) => ({ ...v, x: 0, animate: true }))
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) { go(dx < 0 ? 1 : -1); return }
      /* a tap: a second one within 300ms zooms in where the picture is */
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && e.pointerType !== 'mouse') {
        const t = e.timeStamp
        if (t - lastTap.current < 300) { lastTap.current = 0; zoomTo(2.5) } else lastTap.current = t
      }
    } else if (g.kind === 'pan' && Math.abs(dx) < 8 && Math.abs(dy) < 8 && e.pointerType !== 'mouse') {
      const t = e.timeStamp
      if (t - lastTap.current < 300) { lastTap.current = 0; zoomTo(1) } else lastTap.current = t
    }
  }
  const cancel = (e: ReactPointerEvent<HTMLDivElement>) => { pts.current.delete(e.pointerId); gesture.current = null; setView((v) => ({ ...v, x: v.z > 1 ? v.x : 0, animate: true })) }

  return (
    <Dialog open={open} onClose={onClose} title={title || 'Photo'} fluid phoneFull flush
            actions={n > 1 ? <span className={styles.count} data-testid="viewer-count">{`${i + 1} of ${n}`}</span> : undefined}>
      <div className={styles.viewer} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}
           onDoubleClick={(e) => { if (lastType.current === 'mouse' && !(e.target as HTMLElement).closest('button')) zoomTo(view.z > 1 ? 1 : 2.5) }}
           data-testid="photo-viewer" data-index={i} data-zoom={view.z.toFixed(2)}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={photo.id} src={photo.src} alt={photo.name} className={styles.viewerImg} draggable={false} data-animate={view.animate || undefined}
               style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }} />
        ) : null}
        {n > 1 ? (
          <>
            <button type="button" className={styles.nav} data-side="prev" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous photo" data-testid="viewer-prev"><Icon name="chevron_left" size={24} /></button>
            <button type="button" className={styles.nav} data-side="next" onClick={() => go(1)} disabled={i === n - 1} aria-label="Next photo" data-testid="viewer-next"><Icon name="chevron_right" size={24} /></button>
          </>
        ) : null}
        <div className={styles.zoomBar} role="toolbar" aria-label="Zoom">
          <Tooltip label="Zoom out"><button type="button" className={styles.zoomBtn} aria-label="Zoom out" aria-disabled={view.z <= 1} onClick={() => zoomTo(view.z - STEP)}><Icon name="remove" size={24} /></button></Tooltip>
          <Tooltip label="Fit to screen"><button type="button" className={styles.zoomBtn} aria-label="Fit to screen" aria-disabled={view.z === 1} onClick={() => zoomTo(1)}><Icon name="arrows_output" size={24} /></button></Tooltip>
          <Tooltip label="Zoom in"><button type="button" className={styles.zoomBtn} aria-label="Zoom in" aria-disabled={view.z >= MAX_ZOOM} onClick={() => zoomTo(view.z + STEP)}><Icon name="add" size={24} /></button></Tooltip>
        </div>
      </div>
    </Dialog>
  )
}
