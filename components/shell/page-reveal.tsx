'use client'

import { useEffect, useState, type ReactNode } from 'react'
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

/**
 * True until the first PageReveal commit of this JS lifetime. The initial load's ghost is the
 * server-streamed suspense fallback, swapped out before any client GhostSheet mounts — so it never
 * stamps the clock, and only this flag identifies that load as cold.
 */
const boot = { pending: true }

export function PageReveal({ skeleton, children }: { skeleton: ReactNode; children: ReactNode }) {
  // Cold or instant is decided during RENDER (lazy initialiser), before any of this commit's effects:
  // reading the clock in an effect instead saw the stamp this instance's OWN skeleton had just written
  // in the same commit (GhostSheet stamps in a layout effect, and child effects run before the
  // parent's), so every warm tab hop — router cache hit, zero network — got the full cold beat: 650ms
  // of invented skeleton plus two crossfades over content that was already on screen (REG-238; the
  // jerk REG-217 meant to remove). A stamp read here can only come from a loading.tsx ghost painted in
  // an earlier commit; no stamp past boot means the content is already here — first paint is the real
  // page, no ghost, no fade.
  const [start] = useState(() => ({
    cold: typeof window === 'undefined' || boot.pending || ghostClock.shownAt !== null,
    at: typeof window === 'undefined' ? null : ghostClock.shownAt,
  }))
  const [ready, setReady] = useState(!start.cold)
  const [gone, setGone] = useState(!start.cold)

  useEffect(() => {
    boot.pending = false
    // Consume the stamp (the own ghost's layout effect has written one by now) so nothing leaks into
    // the next route — an unmount during the hold included: Back, a rail click.
    ghostClock.shownAt = null
    if (!start.cold) return
    // Hold the ghost for the remainder of the beat from when it first painted: the loading.tsx stamp
    // when there is one, else the initial load's own first paint.
    const fcp = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint')
    const at = start.at ?? fcp?.startTime ?? performance.now()
    const t = setTimeout(() => setReady(true), Math.max(0, GHOST_MIN_MS - (performance.now() - at)))
    return () => clearTimeout(t)
  }, [start])

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
