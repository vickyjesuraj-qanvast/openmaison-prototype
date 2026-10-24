'use client'

import { MOBILE, PHONE_SIDEWAYS, TABLET_DOWN, TABLET_LANDSCAPE, useMediaQuery } from '@/lib/breakpoint'

/**
 * (Leads on the move, P-03 · P-04 · Q-01 — his marks 2026-10-23) A phone, or a tablet held upright: where the Move stage window is one step per
 * screen and the log rises as a bottom sheet — the Lead screen's own rule (app/leads/[id]/overview.tsx `layout === 'screen'`). A tablet held
 * sideways keeps the centred window (P-04: "1024 landscape keeps the centred modal"); the desk ≥1025 is the mock. Read by the render; the
 * server's answer is the desk's.
 * (held calls 2026-10-24, K-9 — his "fix all of it"; the call as decided) A phone held sideways is a phone: 844 × 390 is "a tablet held
 * sideways" only by its width, and the desk's centred window left it 294 tall — it takes the phone's step screen and sheets there.
 */
export function useOnTheMove(): boolean {
  const down = useMediaQuery(TABLET_DOWN)
  const sideways = useMediaQuery(TABLET_LANDSCAPE)
  const phoneSideways = useMediaQuery(PHONE_SIDEWAYS)
  return down && (!sideways || phoneSideways)
}

/**
 * (held calls 2026-10-24, K-9) A phone, held either way: where the lead form, Edit Lead and Return Lead rise as the phone's bottom sheet (REG-353)
 * — `useSheetLayout()` (≤767) and a phone held sideways (PHONE_SIDEWAYS, as PortalMenu already reads it). Their stylesheets carry the same pair
 * of queries. Server answer: the desk's.
 */
export function usePhoneLayout(): boolean {
  const phone = useMediaQuery(MOBILE)
  const phoneSideways = useMediaQuery(PHONE_SIDEWAYS)
  return phone || phoneSideways
}
