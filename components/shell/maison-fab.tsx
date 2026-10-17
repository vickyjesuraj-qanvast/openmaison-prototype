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

/**
 * (wave E, E4 — the owner's call on the FAB, gallery-3) On a phone (≤767) the button slides away while the page scrolls down — the cards'
 * corner chips and the last lines it sat on come clear — and comes back the moment the page scrolls up, or when it stops at its end (where
 * the page's own bottom clearance keeps it off the content). Every page that has it: it is one component. The flag is a data attribute
 * written from the scroll listener (no render); the stylesheet slides it, and reduced motion swaps the slide for an instant change. A
 * button that holds keyboard focus never leaves (`:focus-within`).
 */
function useTuckOnScroll(wrap: RefObject<HTMLDivElement | null>, quietTop: boolean) {
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const mql = window.matchMedia(MOBILE)
    /** Below this movement a resting finger's jitter is not a scroll. */
    const DEADZONE = 6
    let last = window.scrollY
    let frame = 0
    const show = () => el.removeAttribute('data-tucked')
    const tuck = () => el.setAttribute('data-tucked', '')
    const apply = () => {
      frame = 0
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      /* stopped at the end (a rubber-band past it counts as there): back; at the top: back — but for a quiet-top page, which keeps it tucked */
      if (y >= max - 2 && y > 0) { last = y; show(); return }
      if (y <= 0) { last = y; if (quietTop) tuck(); else show(); return }
      const delta = y - last
      if (Math.abs(delta) < DEADZONE) return
      last = y
      if (delta > 0) el.setAttribute('data-tucked', '')
      else show()
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(apply) }
    const enable = () => { last = window.scrollY; if (quietTop && last <= 0) tuck(); window.addEventListener('scroll', onScroll, { passive: true }) }
    const disable = () => { window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); frame = 0; show() }
    /* ≤767 only, following a rotation across the breakpoint — a tablet that turns into phone width picks it up, one that turns out gets
       its button back */
    if (mql.matches) enable()
    const onChange = (e: MediaQueryListEvent) => (e.matches ? enable() : disable())
    mql.addEventListener('change', onChange)
    return () => { mql.removeEventListener('change', onChange); disable() }
  }, [wrap, quietTop])
}
