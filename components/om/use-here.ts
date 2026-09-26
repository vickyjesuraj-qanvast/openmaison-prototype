'use client'

import { useSearchParams } from 'next/navigation'

/**
 * (audit 2026-09-26, round 3) Where a library page is, as the Back link a record opened from it carries (REG-465): its path with the open
 * folder, the search and its own `?from=` — never a one-off mark such as `?deleted=`. Opening a template from inside a folder and closing it
 * lands back in that folder, as the AI Visualizer landing already did.
 */
export function useHere(path: string, drop: readonly string[] = ['deleted']): string {
  const params = useSearchParams()
  const p = new URLSearchParams(params.toString())
  for (const k of drop) p.delete(k)
  const q = p.toString()
  return q ? `${path}?${q}` : path
}
