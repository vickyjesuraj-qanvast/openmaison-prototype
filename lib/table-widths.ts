'use client'

import { useSyncExternalStore } from 'react'

/**
 * Column widths the user has dragged (REG-427 / REG-430: "resizable by the user like … the excel sheet across the tables";
 * "i don't want to remember the user set state … if they refresh then the table should reset to its original"). One record
 * per table, in memory only: it lives while a table with that key is on screen and is forgotten when the last one leaves —
 * so a refresh, and a route away and back, start from the mock's widths. Nothing is written to localStorage.
 */
export type ColumnWidths = Readonly<Record<string, number>>

const EMPTY: ColumnWidths = Object.freeze({})
const cache = new Map<string, ColumnWidths>()
const listeners = new Map<string, Set<() => void>>()

const read = (table: string): ColumnWidths => cache.get(table) ?? EMPTY
const emit = (table: string) => listeners.get(table)?.forEach((l) => l())
/* One subscribe function per table, kept: useSyncExternalStore resubscribes whenever the function's identity changes, and a
   resubscribe is an unsubscribe first — which, with a fresh closure per render, emptied the listener set and dropped the
   widths on every render. */
const subscribers = new Map<string, (cb: () => void) => () => void>()
function subscriberFor(table: string) {
  let fn = subscribers.get(table)
  if (!fn) {
    fn = (cb) => {
      let set = listeners.get(table)
      if (!set) { set = new Set(); listeners.set(table, set) }
      set.add(cb)
      return () => {
        set!.delete(cb)
        // The last table with this key left (not a resubscribe: React subscribes the new listener before it drops the old one):
        // its widths go with it.
        if (set!.size === 0) { listeners.delete(table); cache.delete(table) }
      }
    }
    subscribers.set(table, fn)
  }
  return fn
}
const readers = new Map<string, () => ColumnWidths>()
const readerFor = (table: string) => { let fn = readers.get(table); if (!fn) { fn = () => read(table); readers.set(table, fn) } return fn }
const serverSnapshot = () => EMPTY

/** The dragged widths of one table (px by column key); columns not in it keep their stylesheet width. */
export function useColumnWidths(table: string): ColumnWidths {
  return useSyncExternalStore(subscriberFor(table), readerFor(table), serverSnapshot)
}

/** Set (or, with null, forget) a column's width. The second flag is kept for the handle's drag / release calls; both only touch memory. */
export function setColumnWidth(table: string, key: string, px: number | null, _persist = true) {
  const next: Record<string, number> = { ...read(table) }
  if (px === null) delete next[key]; else next[key] = Math.round(px)
  cache.set(table, Object.freeze(next))
  emit(table)
}
