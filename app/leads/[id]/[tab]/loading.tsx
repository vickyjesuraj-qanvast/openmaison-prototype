'use client'

import { usePathname } from 'next/navigation'
import { DetailSkeleton } from '@/components/shell/detail-skeleton'

/** Tabs that keep the Overview's info column — the frame `[tab]/page.tsx` falls through to (Meetings has no mock yet). */
const NARROW_TABS = ['meetings']

/**
 * Streams instantly while a tab loads; PageReveal takes over the same skeleton. The variant follows the route the
 * boundary is loading — a loading.tsx gets no params, so the slug comes from the path. Without this file the [id]
 * boundary above answered for every tab, so a cold load of a table tab (hard refresh, a new tab, the listing's tasks
 * popover) painted the Overview's info column and then handed over to a differently shaped ghost (REG-74).
 */
export default function Loading() {
  const tab = usePathname().split('/').pop() ?? ''
  return <DetailSkeleton wide={!NARROW_TABS.includes(tab)} />
}
