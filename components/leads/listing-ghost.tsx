'use client'

import { useSearchParams } from 'next/navigation'
import { LeadsSkeleton } from '@/components/shell/skeleton'
import { KanbanSkeleton } from '@/components/leads/kanban/skeleton'
import { parseView } from '@/lib/leads/view'
import { useStoredView } from '@/lib/leads/view-pref'
import styles from './listing-ghost.module.css'

/**
 * (REG-708) The listing's ghost, as the workspace picks its view: `?view=` in the address, else the remembered view, else the table — and
 * ≤767 the cards whatever the view (REG-299) — picked by CSS, not a width read in script: the streamed ghost has no script to read it with,
 * and a phone that streamed the board would change ghost on hydration. The route's `loading.tsx` draws it and the workspace hands the same
 * one to its PageReveal, so a kanban load no longer streams the table's ghost first (REG-197's gap) and the two never disagree.
 */
export function ListingGhost() {
  const url = parseView(useSearchParams().get('view') ?? undefined)
  const stored = useStoredView()
  const view = url ?? stored ?? 'table'
  if (view !== 'kanban') return <LeadsSkeleton />   /* the table and the cards ship together already (REG-309) */
  return (
    <div className={styles.byWidth}>
      <div className={styles.desk}><KanbanSkeleton /></div>
      <div className={styles.phone}><LeadsSkeleton /></div>
    </div>
  )
}
