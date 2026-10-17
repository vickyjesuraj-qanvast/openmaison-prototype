'use client'

import { useSyncExternalStore } from 'react'

/**
 * Listing view (table | kanban) persistence — user rule 2026-08-27: a refresh must
 * keep the chosen view. Source of truth on load: `?view=` in the URL (shareable,
 * server-rendered), then localStorage (links without the param), then table.
 */
import { parseView, type ListingView } from './view'
export type { ListingView } from './view'
const KEY = 'om.leads.view'

const subscribe = (cb: () => void) => { window.addEventListener('storage', cb); return () => window.removeEventListener('storage', cb) }
const read = (): ListingView | null => { try { return parseView(localStorage.getItem(KEY)) } catch { return null } }

/** Stored preference; null on the server and during hydration (no mismatch). */
export function useStoredView(): ListingView | null {
  return useSyncExternalStore(subscribe, read, () => null)
}

/** Remember the view in the URL (no navigation) and localStorage. */
export function rememberView(v: ListingView) {
  try { localStorage.setItem(KEY, v) } catch {}
  const url = new URL(window.location.href)
  if (v === 'table') url.searchParams.delete('view'); else url.searchParams.set('view', v)
  /* (parity P-18) `null`, not the entry's own state: handed Next's state, the router took the call for its own and never learnt the new
     address, so its next refresh wrote the old one back — `?view=` (and the listing's scope, search and Filters beside it) gone. */
  try { window.history.replaceState(null, '', url) } catch { /* a browser's replaceState budget */ }
}
