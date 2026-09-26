'use client'

import { useEffect, useState } from 'react'
import { countLeadRenderLinks } from '@/app/leads/actions'

/**
 * (wave E, E8) How many client render links (the AI Visualizer's `/renders` pages) the given leads have open right now — counted when
 * a dialog that would stop them opens (Delete, Return Lead), so both hosts (the listing and the lead's page) get the warning without
 * wiring a count of their own. `null` / an empty list asks nothing and answers 0; an answer for an earlier list is never shown for a
 * later one; a failed count answers 0 (the dialog then says nothing, as before).
 */
export function useLiveRenderLinks(leadIds: readonly string[] | null): number {
  const key = leadIds && leadIds.length ? [...new Set(leadIds)].sort().join(',') : ''
  const [got, setGot] = useState<{ key: string; n: number }>({ key: '', n: 0 })
  useEffect(() => {
    if (!key) return
    let live = true
    countLeadRenderLinks(key.split(',')).then(
      (n) => { if (live) setGot({ key, n }) },
      () => { if (live) setGot({ key, n: 0 }) },
    )
    return () => { live = false }
  }, [key])
  return key && got.key === key ? got.n : 0
}

/** "Its 2 client render links stop working." — one lead's, or (`many`) several leads' together. Invented copy (E8). */
export const renderLinksLine = (n: number, many = false) =>
  n <= 0 ? null
    : n === 1 ? (many ? 'A client render link stops working.' : 'Its client render link stops working.')
      : `${many ? 'Their' : 'Its'} ${n} client render links stop working.`
