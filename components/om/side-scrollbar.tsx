'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from './icon'
import { Tooltip } from './tooltip'
import styles from './side-scrollbar.module.css'

/**
 * (REG-570) The sideways scrollbar that stays in reach: a bar stuck to the bottom of the viewport (or the Expand's scroller) while
 * the table runs on below it — a pager at each end, a track whose thumb is the visible share. Drag the thumb, press the track
 * (pages toward the press), or press a pager; the body's own scroll moves the thumb. Not drawn while the table fits.
 */
export function SideScrollbar({ scroller }: { scroller: React.RefObject<HTMLDivElement | null> }) {
  const [st, setSt] = useState({ on: false, left: 0, width: 0, pct: 0 })
  const track = useRef<HTMLDivElement>(null)
  const [held, setHeld] = useState(false)
  useEffect(() => {
    const el = scroller.current, tr = track.current
    if (!el || !tr) return
    const measure = () => {
      const on = el.scrollWidth > el.clientWidth + 1
      const tw = tr.clientWidth || 1
      const width = on ? Math.max(32, (el.clientWidth / el.scrollWidth) * tw) : 0
      const room = Math.max(1, el.scrollWidth - el.clientWidth)
      const left = on ? (el.scrollLeft / room) * (tw - width) : 0
      const pct = on ? Math.round((el.scrollLeft / room) * 100) : 0
      setSt((s) => (s.on === on && Math.abs(s.left - left) < 0.5 && Math.abs(s.width - width) < 0.5 && s.pct === pct ? s : { on, left, width, pct }))
    }
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el); ro.observe(tr)
    for (const c of Array.from(el.children)) ro.observe(c)
    return () => { el.removeEventListener('scroll', measure); ro.disconnect() }
  }, [scroller])
  const page = (dir: -1 | 1) => { const el = scroller.current; if (el) el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.7), behavior: 'smooth' }) }
  const onTrack = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scroller.current, tr = track.current
    if (!el || !tr || e.button !== 0) return
    const x = e.clientX - tr.getBoundingClientRect().left
    if (x >= st.left && x <= st.left + st.width) {
      // the thumb: drag it
      e.preventDefault()
      const x0 = e.clientX, s0 = el.scrollLeft, ratio = (el.scrollWidth - el.clientWidth) / Math.max(1, tr.clientWidth - st.width)
      setHeld(true)
      const move = (ev: PointerEvent) => { el.scrollLeft = s0 + (ev.clientX - x0) * ratio }
      const up = () => { setHeld(false); document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up) }
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up)
    } else page(x < st.left ? -1 : 1)
  }
  return (
    <div className={styles.hbar} data-on={st.on || undefined} data-side-scroll="" aria-hidden={st.on ? undefined : true}>
      <Tooltip label="Scroll left"><button type="button" className={styles.pager} aria-label="Scroll the columns left" onClick={() => page(-1)} tabIndex={st.on ? 0 : -1}><Icon name="chevron_left" size={20} /></button></Tooltip>
      <div ref={track} className={styles.track} role="scrollbar" aria-orientation="horizontal" aria-valuenow={st.pct} aria-label="Scroll the columns" onPointerDown={onTrack}>
        <span className={styles.barThumb} data-dragging={held || undefined} style={{ left: st.left, width: st.width }} />
      </div>
      <Tooltip label="Scroll right"><button type="button" className={styles.pager} aria-label="Scroll the columns right" onClick={() => page(1)} tabIndex={st.on ? 0 : -1}><Icon name="chevron_right" size={20} /></button></Tooltip>
    </div>
  )
}
