'use client'

import { TABLET_DOWN, TABLET_LANDSCAPE, useMediaQuery } from '@/lib/breakpoint'

/**
 * (Leads on the move, P-03 · P-04 · Q-01 — his marks 2026-10-23) A phone, or a tablet held upright: where the Move stage window is one step per
 * screen and the log rises as a bottom sheet — the Lead screen's own rule (app/leads/[id]/overview.tsx `layout === 'screen'`). A tablet held
 * sideways keeps the centred window (P-04: "1024 landscape keeps the centred modal"); the desk ≥1025 is the mock. Read by the render; the
 * server's answer is the desk's.
 */
export function useOnTheMove(): boolean {
  const down = useMediaQuery(TABLET_DOWN)
  const sideways = useMediaQuery(TABLET_LANDSCAPE)
  return down && !sideways
}
