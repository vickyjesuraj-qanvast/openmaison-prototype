'use client'

import { usePathname } from 'next/navigation'
import { DetailSkeleton } from './detail-skeleton'

/** (REG-708) The lead tabs' `loading.tsx` ghost: one route serves every tab, so the tab is read from the address — `/leads/[id]/[tab]` —
    and the tab's own body is drawn, the one the lead's PageReveal then holds (REG-219 did this once, for the frame's variant). */
export function DetailTabSkeleton() {
  const tab = usePathname()?.split('/')[3]
  return <DetailSkeleton wide tab={tab} />
}
