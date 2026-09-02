'use client'

import { useSyncExternalStore } from 'react'

/**
 * The breakpoint as a value the RENDER can read (REG-269) — for the two places on the Lead Overview where the
 * responsive layout cannot be expressed in CSS alone, because JS decides how many children exist in the first place:
 *
 *   · the Create quick-links strip is collapsed-ONLY below 1200 (design-source/context/responsive.md: "the
 *     quick-links strip collapsed-only" at tablet) — and "expanded" is different markup, not a different width,
 *     so a CSS width override would only clip the 92px tiles it renders.
 *   · the FILES card picks its tile count in JS from the measured row; at mobile that count is the mock's own
 *     four, laid 2-up by the card's stylesheet.
 *
 * Everything else on this surface is plain CSS in the two sanctioned media queries. Mirrors the house
 * `useSyncExternalStore` pattern (lib/prefs.ts, lib/leads/view-pref.ts): the server snapshot is always the
 * DESKTOP answer, so the markup React hydrates against is the mock's own and the real width takes over on the
 * first client render — never a `useState` + effect, which would flash the desktop layout on every phone load.
 */

/** The two literals of the responsive system; nothing here invents a third. */
export const MOBILE = '(max-width: 767px)'
export const TABLET_DOWN = '(max-width: 1199px)'

/** One subscribe/getSnapshot pair per query, so `useSyncExternalStore` never re-subscribes on a re-render. */
const cache = new Map<string, { subscribe: (cb: () => void) => () => void; get: () => boolean }>()

function api(query: string) {
  const hit = cache.get(query)
  if (hit) return hit
  // `window` is only touched inside the two closures — they run on the client, never during the server render.
  let mql: MediaQueryList | null = null
  const list = () => (mql ??= window.matchMedia(query))
  const made = {
    subscribe: (cb: () => void) => {
      const m = list()
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    get: () => list().matches,
  }
  cache.set(query, made)
  return made
}

const desktop = () => false

export function useMediaQuery(query: string): boolean {
  const { subscribe, get } = api(query)
  return useSyncExternalStore(subscribe, get, desktop)
}
