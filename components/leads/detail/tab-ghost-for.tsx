'use client'

import { usePathname } from 'next/navigation'
import { useFirstRunShape } from '@/lib/ghost-shape'
import { FIRST_RUN_TABS, tabGhost } from './tab-ghosts'

/** (UX audit build) The lead-tab page's key for its remembered shape (lib/ghost-shape.tsx) — per lead, per tab. */
export const leadTabShape = (leadId: string, tab: string) => `lead.${leadId}.${tab}`

/** A lead tab's ghost body in the shape the tab opens on — its first run (REG-737's bare bar and empty card) or its list — read from the
    address (`/leads/<id>/<tab>`) and the shape this browser saw last on that lead's tab. */
export function TabGhostFor({ tab }: { tab: string | undefined }) {
  const leadId = usePathname()?.split('/')[2] ?? ''
  const first = useFirstRunShape(tab && leadId && FIRST_RUN_TABS.includes(tab) ? leadTabShape(leadId, tab) : null)
  return tabGhost(tab, first)
}
