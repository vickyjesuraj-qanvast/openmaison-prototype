'use client'

import { useEffect } from 'react'

/** Where the page's own sticky header ends once the page has scrolled (the shell's title, then its tab strip stuck under it; a phone's bar)
    — a sticky piece counts where it sticks (its `top`), not where it rests at the page's top. 0 when none. */
function stickyTop(): number {
  let bottom = 0
  for (const n of document.body.querySelectorAll<HTMLElement>('*')) {
    const cs = getComputedStyle(n)
    if (cs.position !== 'sticky' && cs.position !== 'fixed') continue
    const r = n.getBoundingClientRect()
    if (r.width < window.innerWidth * 0.5 || r.height >= window.innerHeight * 0.4) continue
    const at = cs.position === 'sticky' ? parseFloat(cs.top) : r.top
    if (!Number.isFinite(at) || at > window.innerHeight * 0.3) continue
    bottom = Math.max(bottom, at + r.height)
  }
  return bottom
}
/** The element that scrolls `el` (its nearest scrolling ancestor, else the page). */
function scrollerOf(el: HTMLElement): HTMLElement {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY
    if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) return n
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

/** (pending modules S11) Bring a card a link names into view: a card that fits is centred; a card taller than the screen lands with its title
    just under the page's sticky header (centred, its title sat behind the tab strip). The one landing every card link uses — this hook and
    the studio-wide search's `landOn`. */
export function bringCardIntoView(el: HTMLElement, smooth: boolean) {
  const r = el.getBoundingClientRect()
  if (r.height <= window.innerHeight * 0.6) { el.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' }); return }
  const scroller = scrollerOf(el)
  const page = scroller === document.scrollingElement || scroller === document.documentElement
  const target = scroller.scrollTop + r.top - Math.max(page ? 0 : scroller.getBoundingClientRect().top, stickyTop()) - 16
  scroller.scrollTo({ top: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' })
}

/**
 * (UX audit S3) A link to a card on another page (`/settings?section=leads#lead-visibility`, `/company/profile#entities`) lands on that
 * card: once the page is in, the element the address names is brought to the middle of the screen. The router's own hash scroll runs while
 * the route's ghost is up, before the card exists. `key` re-runs it when the page changes under the same component (a Settings module).
 * (pending modules S11) Through `bringCardIntoView`: a card taller than the screen (Settings › Finance › Invoice paper, where the Brand kit's
 * door lands) shows its title.
 */
export function useHashLanding(key?: unknown) {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let tries = 0, frame = 0
    const tick = () => {
      const el = document.getElementById(id)
      if (!el) { if (++tries < 60) frame = requestAnimationFrame(tick); return }
      bringCardIntoView(el, smooth)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [key])
}
