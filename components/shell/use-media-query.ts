'use client'

import { useSyncExternalStore } from 'react'

/**
 * SSR-safe media query. `getServerSnapshot` returns false so the server and the
 * first client render always agree (no hydration mismatch); the real value
 * arrives on subscribe.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Keep in sync with the breakpoints in app-shell.module.css. */
export const BREAKPOINT = {
  tablet: '(min-width: 768px)',
  desktop: '(min-width: 1120px)',
} as const
