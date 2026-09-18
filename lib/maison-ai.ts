'use client'

import { useEffect, useSyncExternalStore } from 'react'

/**
 * Maison AI's context store (REG-507). The FAB and its sheet live in the app shell (components/shell/maison-ai.tsx) so every
 * page in the shell opens the same sheet; a page with scripted suggestions — the listing, Lead Details, Qanvast Ops › Leads —
 * registers them here, and the listing also says when the FAB should ride above the review banner (`raised`).
 */
export type MaisonAiContext = { suggestions: string[]; raised: boolean }

const EMPTY: MaisonAiContext = { suggestions: [], raised: false }
let state: MaisonAiContext = EMPTY
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }
const set = (next: MaisonAiContext) => { state = next; listeners.forEach((l) => l()) }

/** What the shell's FAB and sheet show right now. */
export function useMaisonAiState(): MaisonAiContext {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY)
}

/** A page's scripted suggestions (and whether the FAB is raised) for as long as the page is mounted. */
export function useMaisonAi(suggestions: readonly string[], raised = false) {
  const key = JSON.stringify(suggestions)   // by value: the pages build the list in render
  useEffect(() => {
    set({ suggestions: JSON.parse(key) as string[], raised })
    return () => set(EMPTY)
  }, [key, raised])
}
