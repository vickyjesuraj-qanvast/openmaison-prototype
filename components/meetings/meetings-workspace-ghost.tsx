'use client'

import { GhostSheet } from '@/components/shell/skeleton'
import { GhostHead } from '@/components/shell/ghost-kit'
import { MeetingsTabGhost } from '@/components/leads/detail/tab-ghosts'
import { useFirstRunShape, useSeedFlag } from '@/lib/ghost-shape'
import styles from './meetings.module.css'

/** (pending modules S23 · REG-708) Tools › Meeting Copilot's ghost — the L1 header with New Meeting ▾, then the tab's toolbar and table with the
    Lead column (the rail's Tasks page's shape); with no meeting yet, the bare bar and the first-run card. Its loading.tsx and PageReveal draw it.
    (pending modules S46B, M5) Insights after New Meeting ▾ for whoever reads Reports › Meetings (Owners and Admins — the seed's `role.runs`),
    once there is a meeting — as the page draws it. */
export function MeetingsListGhost() {
  const first = useFirstRunShape('meetings')
  const runs = useSeedFlag('role.runs', false)
  return (
    <GhostSheet label="Loading meetings" l1>
      <GhostHead title={96} actions={runs && !first ? [{ fold: 150 }, { fold: 126 }] : [{ fold: 150 }]} />
      <div className={styles.tab} data-studio="" aria-hidden><MeetingsTabGhost studio rows={6} first={first} /></div>
    </GhostSheet>
  )
}
