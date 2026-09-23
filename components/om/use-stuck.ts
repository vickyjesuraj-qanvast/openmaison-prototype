'use client'

import { useEffect, useState, type RefObject } from 'react'

/**
 * True while a `position: sticky` element is being held away from its natural place (REG-570): its box no longer starts where
 * its anchor says it should — the bottom of a zero-height sentinel placed right before it, or the top of the container it
 * leads. Listens to every scroller on the page (capture), so a card scrolling inside the Items section's full-page Expand
 * answers like the window does. Callers draw the "stuck" chrome (the rule under a held head, its shadow) from the answer.
 */
export function useStuck(el: RefObject<HTMLElement | null>, anchor: RefObject<HTMLElement | null>, edge: 'top' | 'bottom' = 'bottom', on = true): boolean {
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    if (!on) return
    let raf = 0
    const check = () => {
      raf = 0
      const a = el.current, b = anchor.current
      if (!a || !b) return
      const line = edge === 'bottom' ? b.getBoundingClientRect().bottom : b.getBoundingClientRect().top
      setStuck((s) => { const next = a.getBoundingClientRect().top > line + 1.5; return s === next ? s : next })
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(check) }
    document.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => { document.removeEventListener('scroll', schedule, { capture: true }); window.removeEventListener('resize', schedule); if (raf) cancelAnimationFrame(raf) }
  }, [el, anchor, edge, on])
  return on && stuck
}

/** The nearest ancestor that scrolls vertically, or null for the window. */
export function scrollParentOf(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const cs = getComputedStyle(p)
    if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) return p
  }
  return null
}
