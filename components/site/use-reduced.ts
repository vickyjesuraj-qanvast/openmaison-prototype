'use client'

import { useSyncExternalStore } from 'react'

/*
 * (pending modules S35) Reduced motion, read so the page hydrates as the server drew it: the server (and hydration) answer "motion allowed", the
 * browser's own setting arrives a frame later — motion's own hook reads it during hydration and the site's pictures (a scan line, a counted
 * number) then differed from the server's HTML.
 */
const QUERY = '(prefers-reduced-motion: reduce)'
const subscribe = (cb: () => void) => { const m = window.matchMedia(QUERY); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) }
export function useReduced(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false)
}
