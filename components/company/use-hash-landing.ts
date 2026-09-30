'use client'

import { useEffect } from 'react'

/**
 * (UX audit S3) A link to a card on another page (`/settings?section=leads#lead-visibility`, `/company/profile#entities`) lands on that
 * card: once the page is in, the element the address names is brought to the middle of the screen. The router's own hash scroll runs while
 * the route's ghost is up, before the card exists. `key` re-runs it when the page changes under the same component (a Settings module).
 */
export function useHashLanding(key?: unknown) {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let tries = 0, frame = 0
    const tick = () => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' })
      else if (++tries < 60) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [key])
}
