'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { setFlagPref, useFlagPref } from '@/lib/prefs'

/**
 * (UX audit build, 2026-09-30 — the owner: "make sure all the alerts and ghost loaders are intact to its contextual things") A page that opens
 * in two shapes — its full list, or its FIRST RUN (REG-735…737: an empty list's bare toolbar and start card, the AI Visualizer's welcome) —
 * draws the matching ghost in both places a ghost shows:
 * - the page's own reveal (PageReveal's skeleton) knows the data, so it wraps its ghost in `<GhostShape first={…}>`;
 * - the route's `loading.tsx` streams before the page's data, so it asks what this browser saw last (`useRememberShape` writes it) and, for
 *   a page this browser hasn't seen, what the server knows now — the app shell's seed (`GhostSeed`, `lib/ghost-shapes.server.ts`).
 * Ghosts read the shape with `useFirstRunShape(page)`. Keys: `om.shape.<page>.first`.
 */
export const shapeKey = (page: string) => `om.shape.${page}.first`

const Shape = createContext<boolean | null>(null)
/** (REG-817) What the server knows now, for every first-run page (the app shell's `fetchFirstRunShapes`) — the ghost's answer where this
    browser has no memory of the page yet, so even a first visit's loader lands in the right shape. */
const Seed = createContext<Record<string, boolean>>({})

/** The app shell's seed of the studio's first-run pages. */
export function GhostSeed({ shapes, children }: { shapes: Record<string, boolean>; children: ReactNode }) {
  return <Seed.Provider value={shapes}>{children}</Seed.Provider>
}

/** The reveal's ghost, told the shape the page is about to show. */
export function GhostShape({ first, children }: { first: boolean; children: ReactNode }) {
  return <Shape.Provider value={first}>{children}</Shape.Provider>
}

/** The page, once it has shown a shape: remembered for its loader's next time (per browser). */
export function useRememberShape(page: string | null, first: boolean) {
  useEffect(() => { if (page) setFlagPref(shapeKey(page), first) }, [page, first])
}

/** A ghost's question: does this page open on its first run? The reveal's knowledge, else what this browser saw last, else what the server
    knows now (the seed is the stored flag's fallback, so a cold load's server frame and the browser agree). */
export function useFirstRunShape(page: string | null): boolean {
  const told = useContext(Shape)
  const seed = useContext(Seed)
  const [remembered] = useFlagPref(page ? shapeKey(page) : 'om.shape._none.first', page ? seed[page] ?? false : false)
  return told ?? (page ? remembered : false)
}
