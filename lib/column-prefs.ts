'use client'

import { useMemo, useSyncExternalStore } from 'react'

/**
 * Column preferences per table — order, visibility and pins — kept per user in the browser under `om.columns.<table>`
 * (so "Reset prototype to base" clears them with every other `om.*` key). One store for every table that offers Column
 * settings (REG-454); the Items table keeps its own per-quote copy in the database. Widths are not here: they live only
 * while the table is on screen (lib/table-widths.ts, REG-430).
 */
export type ColumnPrefRow = { key: string; visible: boolean; pinned: boolean }
const KEY = (table: string) => `om.columns.${table}`
const cache = new Map<string, ColumnPrefRow[] | null>()
const listeners = new Map<string, Set<() => void>>()
const emit = (table: string) => listeners.get(table)?.forEach((l) => l())

function read(table: string): ColumnPrefRow[] | null {
  if (cache.has(table)) return cache.get(table)!
  let rows: ColumnPrefRow[] | null = null
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY(table))
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed)) rows = parsed.filter((r): r is ColumnPrefRow => !!r && typeof r.key === 'string').map((r) => ({ key: r.key, visible: !!r.visible, pinned: !!r.pinned }))
  } catch { rows = null }
  cache.set(table, rows)
  return rows
}
/* Stable subscribe / read functions per table: useSyncExternalStore resubscribes whenever their identity changes (the REG-430 lesson). */
const subscribers = new Map<string, (cb: () => void) => () => void>()
const subscriberFor = (table: string) => {
  let fn = subscribers.get(table)
  if (!fn) {
    fn = (cb) => { let set = listeners.get(table); if (!set) { set = new Set(); listeners.set(table, set) } set.add(cb); return () => { set!.delete(cb) } }
    subscribers.set(table, fn)
  }
  return fn
}
const readers = new Map<string, () => ColumnPrefRow[] | null>()
const readerFor = (table: string) => { let fn = readers.get(table); if (!fn) { fn = () => read(table); readers.set(table, fn) } return fn }
const serverSnapshot = () => null

export function saveColumnPrefs(table: string, rows: readonly ColumnPrefRow[]) {
  const slim = rows.map(({ key, visible, pinned }) => ({ key, visible, pinned }))
  cache.set(table, slim)
  try { localStorage.setItem(KEY(table), JSON.stringify(slim)) } catch {}
  emit(table)
}
export function resetColumnPrefs(table: string) {
  cache.set(table, null)
  try { localStorage.removeItem(KEY(table)) } catch {}
  emit(table)
}
/** The table's defaults in the stored order with the stored visibility / pins; unknown keys are dropped, new defaults appended. */
export function mergeColumnPrefs<T extends ColumnPrefRow>(defaults: readonly T[], stored: ColumnPrefRow[] | null): T[] {
  if (!stored) return [...defaults]
  const byKey = new Map(defaults.map((d) => [d.key, d]))
  const out: T[] = []
  for (const s of stored) { const d = byKey.get(s.key); if (d && !out.some((o) => o.key === s.key)) out.push({ ...d, visible: s.visible, pinned: s.pinned }) }
  for (const d of defaults) if (!out.some((o) => o.key === d.key)) out.push(d)
  return out
}
/** The table's columns as the user left them (defaults on the server and before anything was saved). */
export function useColumnPrefs<T extends ColumnPrefRow>(table: string, defaults: readonly T[]): T[] {
  const stored = useSyncExternalStore(subscriberFor(table), readerFor(table), serverSnapshot)
  return useMemo(() => mergeColumnPrefs(defaults, stored), [defaults, stored])
}
