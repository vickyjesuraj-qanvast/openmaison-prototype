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
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    // Read-and-clear the clock now (not in the timer) so an unmount during the
    // hold — Back, a rail click — can't leak a stale stamp into the next route.
    // The ref makes the StrictMode double-run reuse the first value.
    startRef.current ??= ghostClock.shownAt ?? performance.now()
    ghostClock.shownAt = null
    const wait = Math.max(0, GHOST_MIN_MS - (performance.now() - startRef.current))
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
