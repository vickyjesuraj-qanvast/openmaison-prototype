'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { Tooltip } from '@/components/om/tooltip'
import { MOBILE } from '@/lib/breakpoint'
import styles from './maison-fab.module.css'

/**
 * Maison AI floating button — 48px, bottom-right 24px, glow per mock asset.
 * A4 (approved): opens the scripted suggestion sheet; the sheet itself ships
 * with M1 (its content depends on the listing context). Until then the press
 * animates but takes no action — replaced within this same milestone train.
 */
export function MaisonFab({ onPress, raised = false, className, quietTop = false }: { onPress?: () => void; raised?: boolean; /** An app frame that fills the bottom-right corner (the AI Visualizer's rail) moves the FAB to its own clear spot. */ className?: string
  /** (S42 audit A-12) A page whose first screen holds its own Ask box and row buttons where the FAB floats (the Dashboard): on a phone the
      button starts tucked and stays tucked at the top — it comes back as the page scrolls up mid-way or stops at its end. */
  quietTop?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  useTuckOnScroll(wrap, quietTop)
  return (
    <div ref={wrap} className={`${styles.wrap} ${className ?? ''}`} data-raised={raised || undefined}>
      <Tooltip label="Maison AI" side="left">
        <button type="button" className={styles.button} aria-label="Maison AI" onClick={onPress}>
          <span className={styles.glyph}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/figma-assets/maison-ai-fab.svg" alt="" />
          </span>
        </button>
      </Tooltip>
    </div>
  )
}

/** (Leads on the move — the landing's FAB rule, 2026-10-23) A touch tablet: 768–1024 with a finger (REG-307's query, above the phone's own). */
const TOUCH_TABLET_ONLY = '(hover: none) and (min-width: 768px) and (max-width: 1024px)'
/** Every width the rules below can apply at — the desk (≥1025) keeps the mock's button. */
const NARROW = '(max-width: 1024px)'

/**
 * Where the button rests, one rule (written as `data-tucked`; the stylesheet slides it away, reduced motion swaps the slide for an instant change;
 * a button that holds keyboard focus never leaves, `:focus-within`):
 *  · (wave E, E4 — the owner's call on the FAB, gallery-3) On a phone (≤767) it slides away while the page scrolls down — the cards' corner chips
 *    and the last lines it sat on come clear — and comes back the moment the page scrolls up, or when it stops at its end (where the page's own
 *    bottom clearance keeps it off the content). `quietTop` (S42 A-12): it starts tucked at the top.
 *  · (Leads on the move — the landing's FAB rule, 2026-10-23) **At its end only** on a touch tablet (768–1024): it rests out of sight while there
 *    is page below and shows once the page sits at its end, or does not scroll at all. A tablet's table rows carry a frozen ⋮ exactly under the
 *    button's corner (the Leads, Quotes and Contracts tablet tables). The page's height is watched, so a list that grows or shrinks under it
 *    moves it with the page.
 *  · A mouse at 768–1024 keeps the desk's button.
 */
function useTuckOnScroll(wrap: RefObject<HTMLDivElement | null>, quietTop: boolean) {
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const phone = window.matchMedia(MOBILE), tablet = window.matchMedia(TOUCH_TABLET_ONLY), narrow = window.matchMedia(NARROW)
    const atEndOnly = () => tablet.matches
    /** Below this movement a resting finger's jitter is not a scroll. */
    const DEADZONE = 6
    let last = window.scrollY
    let frame = 0
    let on = false
    const show = () => el.removeAttribute('data-tucked')
    const tuck = () => el.setAttribute('data-tucked', '')
    const apply = () => {
      frame = 0
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (atEndOnly()) { last = y; if (y >= max - 2) show(); else tuck(); return }
      if (!phone.matches) { last = y; show(); return }
      /* stopped at the end (a rubber-band past it counts as there): back; at the top: back — but for a quiet-top page, which keeps it tucked */
      if (y >= max - 2 && y > 0) { last = y; show(); return }
      if (y <= 0) { last = y; if (quietTop) tuck(); else show(); return }
      const delta = y - last
      if (Math.abs(delta) < DEADZONE) return
      last = y
      if (delta > 0) tuck()
      else show()
    }
    const later = () => { if (!frame) frame = requestAnimationFrame(apply) }
    const ro = new ResizeObserver(later)
    const enable = () => {
      if (on) return
      on = true; last = window.scrollY
      if (quietTop && last <= 0 && phone.matches) tuck()
      apply()
      window.addEventListener('scroll', later, { passive: true }); window.addEventListener('resize', later)
      ro.observe(document.body)
    }
    const disable = () => {
      if (!on) return
      on = false
      window.removeEventListener('scroll', later); window.removeEventListener('resize', later); ro.disconnect()
      if (frame) cancelAnimationFrame(frame); frame = 0; show()
    }
    /* ≤1024 only, following a rotation across the breakpoints — a tablet that turns into phone width picks the phone's rule up, the desk gets
       its button back */
    const sync = () => (narrow.matches ? (enable(), later()) : disable())
    sync()
    narrow.addEventListener('change', sync); phone.addEventListener('change', later); tablet.addEventListener('change', later)
    return () => { narrow.removeEventListener('change', sync); phone.removeEventListener('change', later); tablet.removeEventListener('change', later); disable() }
  }, [wrap, quietTop])
}
