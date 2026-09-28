'use client'

import { useEffect, useSyncExternalStore } from 'react'

/**
 * (REG-711 · REG-715) The keyboard's small state, per browser — as the columns' layouts are (`om.columns.*`), never on the server:
 * whether the ? panel is out, the single-key switch (WCAG 2.1.4) and the tips switch, the keys you have used (the panel ticks them), how
 * often the mouse did what a key does (the third time earns one tip), and the handlers pages register for keys no single control
 * answers. Maison AI › "Reset prototype to base" clears every `om.*` key, and with it all of this.
 */
export const SINGLE_KEYS = 'om.keys.single'
export const TIPS = 'om.keys.tips'
const USED = 'om.keys.used'
const MOUSE = 'om.keys.mouse'
const TIPPED = 'om.keys.tipped'
const TIP_DAY = 'om.keys.tipday'

const readJson = <T,>(key: string, fallback: T): T => { try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback } }
const writeJson = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* a private window simply forgets */ } }
/** A per-browser switch, on unless it was switched off (`lib/prefs` writes '1' / '0'). Read at the moment a key is pressed. */
export const flagOn = (key: string): boolean => { try { return localStorage.getItem(key) !== '0' } catch { return true } }

/* ---- one version for everything the panel reads, so it re-lists when any of it changes ---- */
let version = 0
const listeners = new Set<() => void>()
const emit = () => { version += 1; listeners.forEach((l) => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
/** Re-renders the caller when the panel, the used keys or the registered handlers change. */
export const useKeysVersion = () => useSyncExternalStore(subscribe, () => version, () => 0)

/* ---- the ? panel ---- */
let panelOpen = false
export const shortcutsOpen = () => panelOpen
export function openShortcuts() { if (!panelOpen) { panelOpen = true; emit() } }
export function closeShortcuts() { if (panelOpen) { panelOpen = false; emit() } }
export function toggleShortcuts() { panelOpen = !panelOpen; emit() }
export const useShortcutsOpen = () => useSyncExternalStore(subscribe, () => panelOpen, () => false)

/* ---- the keys you have used ---- */
export const usedKeys = (): Set<string> => new Set(readJson<string[]>(USED, []))
/** A key was answered: the ? panel flashes its row (every time) and ticks it (the first time). */
export const FIRED = 'om:kb-fired'
export function markUsed(id: string) {
  try { window.dispatchEvent(new CustomEvent(FIRED, { detail: id })) } catch { /* no window */ }
  const s = usedKeys()
  if (s.has(id)) return
  s.add(id); writeJson(USED, [...s]); emit()
}

/* ---- tips: the mouse did what a key does ---- */
const today = () => new Date().toISOString().slice(0, 10)
/** Counts one mouse use of `id`; true on the third, when a tip is due — once per key, at most one a day, and only with tips on. */
export function mouseUse(id: string): boolean {
  if (!flagOn(TIPS) || !flagOn(SINGLE_KEYS)) return false
  const counts = readJson<Record<string, number>>(MOUSE, {})
  const n = (counts[id] ?? 0) + 1
  counts[id] = n; writeJson(MOUSE, counts)
  if (n < 3 || usedKeys().has(id)) return false
  if (readJson<string[]>(TIPPED, []).includes(id)) return false
  try { if (localStorage.getItem(TIP_DAY) === today()) return false } catch { return false }
  return true
}
export function tipShown(id: string) {
  writeJson(TIPPED, [...new Set([...readJson<string[]>(TIPPED, []), id])])
  try { localStorage.setItem(TIP_DAY, today()) } catch { /* nothing */ }
}

/* ---- handlers: keys a page answers with code, where no single control fits ---- */
type Run = () => void
const handlers = new Map<string, Run[]>()
const labels = new Map<string, string>()
export const handlerLabel = (id: string) => labels.get(id)
/** The newest registration answers (a page over a page). */
export function runHandler(id: string): boolean {
  const list = handlers.get(id)
  const run = list?.[list.length - 1]
  if (!run) return false
  run(); return true
}
export const hasHandler = (id: string) => (handlers.get(id)?.length ?? 0) > 0
/** A page answers `id` with `run` while it is mounted (and `enabled`). */
export function useShortcut(id: string, run: Run, enabled = true, label?: string) {
  useEffect(() => {
    if (!enabled) return
    const list = handlers.get(id) ?? []
    list.push(run); handlers.set(id, list)
    if (label) labels.set(id, label)
    emit()
    return () => { const l = handlers.get(id) ?? []; const i = l.lastIndexOf(run); if (i >= 0) l.splice(i, 1); if (!l.length) labels.delete(id); emit() }
  }, [id, run, enabled, label])
}

/* ---- keys an editor answers itself (the Items table's, the canvas'), listed while the editor is on screen ---- */
const here = new Map<string, number>()
export const hereIds = (): string[] => [...here.entries()].filter(([, n]) => n > 0).map(([id]) => id)
export function useShortcutsHere(ids: readonly string[]) {
  const key = ids.join(',')
  useEffect(() => {
    const list = key.split(',').filter(Boolean)
    list.forEach((id) => here.set(id, (here.get(id) ?? 0) + 1)); emit()
    return () => { list.forEach((id) => here.set(id, Math.max(0, (here.get(id) ?? 1) - 1))); emit() }
  }, [key])
}
