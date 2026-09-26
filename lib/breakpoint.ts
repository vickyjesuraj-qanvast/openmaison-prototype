'use client'

import { useSyncExternalStore } from 'react'

/**
 * The breakpoint as a value the RENDER can read (REG-269) — for the two places on the Lead Overview where the
 * responsive layout cannot be expressed in CSS alone, because JS decides how many children exist in the first place:
 *
 *   · the Create quick-links strip is collapsed-ONLY below 1025 (design-source/context/responsive.md: "the
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

/** The literals of the responsive system (REG-315: tablet ends at 1024, desktop starts at 1025); nothing here invents another. */
export const MOBILE = '(max-width: 767px)'
export const TABLET_DOWN = '(max-width: 1024px)'
/** (REG-307/310) A touch pointer at tablet width or below — where hover-revealed controls are always on. */
export const TOUCH_TABLET = '(hover: none) and (max-width: 1024px)'

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

/**
 * (REG-298) The viewport height a fixed, bottom-anchored thing may use: ≤767 the bottom dock owns the last
 * `--app-mobile-dock-height` pixels, so anchored popovers clamp to the space above it instead of sliding under
 * it. Measures the dock element itself (`nav[aria-label="Primary"]`, components/shell/mobile-nav.tsx), never a
 * literal, so the dock and the clamps cannot drift apart. (REG-308) It cannot read the token any more: the token
 * is now `calc(70px + env(safe-area-inset-bottom))`, and a custom property holding calc()+env() comes back from
 * getPropertyValue as that unresolved text (parseFloat → NaN → 0), whereas offsetHeight is the laid-out pixel
 * height, inset included. 0 when the dock is absent. Client only.
 */
export function usableViewportHeight(): number {
  if (!window.matchMedia(MOBILE).matches) return window.innerHeight
  const dock = document.querySelector<HTMLElement>('nav[aria-label="Primary"]')?.offsetHeight ?? 0
  return window.innerHeight - dock
}

/** (audit 2026-09-26, E3) A phone held sideways: short and wide — the AI Visualizer's landscape layout, and menus that open as a bottom sheet there. */
export const PHONE_SIDEWAYS = '(max-width: 1024px) and (orientation: landscape) and (max-height: 500px)'

export function useMediaQuery(query: string): boolean {
  const { subscribe, get } = api(query)
  return useSyncExternalStore(subscribe, get, desktop)
}
