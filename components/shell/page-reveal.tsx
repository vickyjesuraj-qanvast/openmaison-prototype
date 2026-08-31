'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ghostClock } from './skeleton'
import styles from './page-reveal.module.css'

/**
 * Holds the route's ghost skeleton on screen for a minimum beat after the
 * page arrives, then crossfades to the real content. `loading.tsx` already
 * shows the same skeleton while the server fetches; this makes the swap
 * deliberate and smooth instead of a flash. In-place refreshes
 * (`router.refresh()`, server-action revalidation) keep this instance, so
 * the ghost only ever plays on a real load / navigation.
 */
export const GHOST_MIN_MS = 650
const FADE_FALLBACK_MS = 600

export function PageReveal({ skeleton, children }: { skeleton: ReactNode; children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [gone, setGone] = useState(false)
  const startRef = useRef<{ at: number | null } | null>(null)

  useEffect(() => {
    // Read-and-clear the clock now (not in the timer) so an unmount during the
    // hold — Back, a rail click — can't leak a stale stamp into the next route.
    // The ref makes the StrictMode double-run reuse the first value.
    if (startRef.current === null) {
      startRef.current = { at: ghostClock.shownAt }
      ghostClock.shownAt = null
    }
    // `shownAt` is set only when loading.tsx actually painted its ghost. When the server answered before that — every
    // tab click on a warm route — there is no ghost to hand over from, so the hold has nothing to smooth and would
    // just be 650ms of invented skeleton over content that is already here (user 2026-08-30: "every time i click a
    // tab it loads"). Cold loads, where the ghost did paint, keep the full beat.
    const at = startRef.current.at
    const wait = at === null ? 0 : Math.max(0, GHOST_MIN_MS - (performance.now() - at))
    const t = setTimeout(() => setReady(true), wait)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!ready || gone) return
    const t = setTimeout(() => setGone(true), FADE_FALLBACK_MS)   // transitionend backstop (reduced motion etc.)
    return () => clearTimeout(t)
  }, [ready, gone])

  return (
    <div className={styles.reveal}>
      <div className={styles.content} data-ready={ready} inert={!ready}>
        {children}
      </div>
      {gone ? null : (
        <div className={styles.ghost} data-leaving={ready || undefined}
             onTransitionEnd={(e) => { if (e.target === e.currentTarget && ready) setGone(true) }}>
          {skeleton}
        </div>
      )}
    </div>
  )
}
