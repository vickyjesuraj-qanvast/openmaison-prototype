'use client'

import { useSyncExternalStore } from 'react'

/**
 * Column widths the user has dragged (REG-427: "resizable by the user like … the excel sheet across the tables in the
 * prototype"). One record per table under `om.cols.<table>` in localStorage — a preference of the person, not the record,
 * so it follows the browser like the listing's view (lib/leads/view-pref.ts) and clears with Maison AI › Reset prototype.
 * `{}` on the server and during hydration: a table renders its mocked widths until the stored ones arrive (no mismatch).
 */
export type ColumnWidths = Readonly<Record<string, number>>

const PREFIX = 'om.cols.'
const EMPTY: ColumnWidths = Object.freeze({})
const cache = new Map<string, ColumnWidths>()
const listeners = new Map<string, Set<() => void>>()

function read(table: string): ColumnWidths {
  const hit = cache.get(table)
  if (hit) return hit
  let v: ColumnWidths = EMPTY
  try {
    const raw = localStorage.getItem(PREFIX + table)
    if (raw) {
      const o: unknown = JSON.parse(raw)
      if (o && typeof o === 'object') v = Object.freeze(Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([, n]) => typeof n === 'number' && n > 0)) as Record<string, number>)
    }
  } catch {}
  cache.set(table, v)
  return v
}
const emit = (table: string) => listeners.get(table)?.forEach((l) => l())
function subscribe(table: string, cb: () => void) {
  let set = listeners.get(table)
  if (!set) { set = new Set(); listeners.set(table, set) }
  set.add(cb)
  const onStorage = (e: StorageEvent) => { if (e.key === PREFIX + table) { cache.delete(table); cb() } }   // another tab
  window.addEventListener('storage', onStorage)
  return () => { set!.delete(cb); window.removeEventListener('storage', onStorage) }
}

/** The stored widths of one table (px by column key); columns not in it keep their stylesheet width. */
export function useColumnWidths(table: string): ColumnWidths {
  return useSyncExternalStore((cb) => subscribe(table, cb), () => read(table), () => EMPTY)
}

/** Set (or, with null, forget) a column's width. `persist: false` during a drag — the store updates and the table
 *  re-renders, localStorage is written once on release. */
export function setColumnWidth(table: string, key: string, px: number | null, persist = true) {
  const next: Record<string, number> = { ...read(table) }
  if (px === null) delete next[key]; else next[key] = Math.round(px)
  cache.set(table, Object.freeze(next))
  if (persist) {
    try { if (Object.keys(next).length) localStorage.setItem(PREFIX + table, JSON.stringify(next)); else localStorage.removeItem(PREFIX + table) } catch {}
  }
  emit(table)
}
