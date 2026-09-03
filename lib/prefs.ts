'use client'

import { useSyncExternalStore } from 'react'

/**
 * Remembered UI preferences — the mechanism behind lib/leads/view-pref.ts (table vs kanban) and
 * components/leads/detail/quick-links.tsx, generalised so every remembered choice works the same way
 * (user 2026-08-31: "when i collapse a section remember the user preference … not just in this, across the
 * prototype … we had made for the leads list vs kanban view too, so similarly we have to remember this").
 *
 * Per browser, not per lead: a section a user closed stays closed on the next lead too, which is the point —
 * they closed it because they do not want to read it.
 *
 * The server snapshot is always the caller's default, so the markup React hydrates against is the mock's own
 * state and there is no hydration mismatch; the stored value takes over on the first client render after that.
 */

const cache = new Map<string, boolean>()
/** Keys the viewer has actually toggled in this session — NOT keys merely read back from storage. */
const written = new Set<string>()
const listeners = new Set<() => void>()

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  window.addEventListener('storage', cb)   // another tab changed it
  return () => { listeners.delete(cb); window.removeEventListener('storage', cb) }
}

/**
 * A remembered open/closed flag. Returns the current value, a setter that persists it, and `touched` — true once the
 * viewer has toggled it in this session. `touched` exists to gate ENTRANCE ANIMATION: a stored value arrives on the
 * first client render, so animating it would play a transition on every page load. Animate only what the viewer did.
 */
export function useFlagPref(key: string, fallback: boolean): [boolean, (value: boolean) => void, boolean] {
  const read = (): boolean => {
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    try {
      const raw = localStorage.getItem(key)
      const value = raw === null ? fallback : raw === '1'
      cache.set(key, value)
      return value
    } catch { return fallback }
  }
  const value = useSyncExternalStore(subscribe, read, () => fallback)
  const touched = useSyncExternalStore(subscribe, () => written.has(key), () => false)
  const set = (next: boolean) => setFlagPref(key, next)
  return [value, set, touched]
}

/** Writes a flag from outside its hook — the info column's collapsed strip opens a section it is not rendering (REG-304). */
export function setFlagPref(key: string, next: boolean) {
  cache.set(key, next)
  written.add(key)
  try { localStorage.setItem(key, next ? '1' : '0') } catch {}
  listeners.forEach((l) => l())
}

/** Clears every remembered flag — used by Maison AI › "Reset prototype to base", which clears all `om.*` keys. */
export function clearFlagPrefs() { cache.clear(); written.clear() }
