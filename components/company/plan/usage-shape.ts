'use client'

import { useCountPref, useFlagPref } from '@/lib/prefs'

/** (the calm UI build 2026-10-27 — 5-38, REG-708 · REG-817) What Plan › Usage's By member drew last on this month — its rows, the members folded
    under it, whether the Status column stood — so its ghost (components/company/company-ghosts.tsx `UsageGhost`) lands where the page does. */
export const USAGE_SHAPE = { members: 'om.count.usage.members', quiet: 'om.count.usage.quiet', status: 'om.shape.usage.status' } as const

/** The ghost's read of it — a first visit draws the demo studio's own (two members up front, seven folded, no Status column). */
export function useUsageShape() {
  const members = useCountPref(USAGE_SHAPE.members, 2)
  const quiet = useCountPref(USAGE_SHAPE.quiet, 7)
  const [status] = useFlagPref(USAGE_SHAPE.status, false)
  return { members, quiet, status }
}
