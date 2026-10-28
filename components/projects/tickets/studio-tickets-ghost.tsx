'use client'

import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { GhostHead, Line, Para, Slot, Words } from '@/components/shell/ghost-kit'
import { useFirstRunShape, useSeedFlag } from '@/lib/ghost-shape'
import { useCountPref } from '@/lib/prefs'
import pageStyles from '@/app/leads/leads.module.css'
import chipRow from '@/components/om/chips.module.css'
import empty from '@/components/om/empty-state.module.css'
import styles from './tickets.module.css'

/** (pending modules S46B) The page's first-run key — remembered by the page, seeded by the app shell (lib/ghost-shapes.server.ts). */
export const STUDIO_TICKETS_SHAPE = 'studio-tickets'
/** (the calm UI build 2026-10-27, 1-45) how many issue cards the page opened on last (its Open list) — the ghost draws as many (REG-817). */
export const STUDIO_TICKETS_COUNT_KEY = 'om.shape.studio-tickets.rows'
const ROW_WIDTHS = [260, 220, 240, 200]

/** (REG-708, gaps build H) Projects › Tickets' own ghost: the L2 header (Projects / Tickets), the scope chips and the search, the ticket cards
    with their project line. The route's `loading.tsx` and the page's PageReveal draw this same one.
    (pending modules S46B, M1) The header's New ticket for whoever may raise one (`raise` from the page, the seed's `tickets.new` for the loader);
    with no ticket yet, the first-run card — its New ticket under the help — as the page opens on it (REG-817). */
export function StudioTicketsGhost({ raise: told }: { raise?: boolean } = {}) {
  const seeded = useSeedFlag('tickets.new', false)
  const raise = told ?? seeded
  const first = useFirstRunShape(STUDIO_TICKETS_SHAPE)
  const rows = Math.min(Math.max(useCountPref(STUDIO_TICKETS_COUNT_KEY, 3), 1), 8)   // (the calm UI build 2026-10-27, 1-45) the page's own count (a fresh browser: the demo's three)
  return (
    <GhostSheet label="Loading tickets">
      <GhostHead title={60} actions={raise && !first ? [{ fold: 120 }] : []} />   {/* (S46 — REG-2524) the L1 head, as the page's · (the calm UI build 2026-10-27, 3-37) "Issues" · "New issue" */}
      <div className={pageStyles.content} aria-hidden>
        {first ? (
          <section className={empty.empty} data-tone="first">
            <span className={empty.glyph} />
            <Words as="h3" className={empty.title}>No issues yet</Words>
            <span className={empty.help}><Para lines={raise ? 3 : 2} lh={20} h={12} w={300} last={raise ? 200 : 240} /></span>
            {raise ? <div className={empty.actions}><Bone w={132} h={36} r="var(--om-radius-1)" /></div> : null}
          </section>
        ) : (
          <div className={styles.tab}>
            <div className={styles.bar}>
              <span className={chipRow.chips}>{[84, 100, 72].map((w, i) => <Bone key={i} w={w} h={32} r="var(--om-radius-1)" />)}</span>   {/* (the calm UI build 2026-10-27, 1-25) Open · n · Closed · n · All · n — (1-45) the house chip's own radius */}
              <span className={styles.actions}><Slot kind="search" /><Slot kind="icon" /></span>   {/* (parity map, UC-047) Filters after the search */}
            </div>
            <div className={styles.list}>
              {Array.from({ length: rows }, (_, i) => ROW_WIDTHS[i % ROW_WIDTHS.length] ?? 240).map((w, i) => (
                <div key={i} className={styles.card}>
                  <span className={styles.head}><Line w={w} lh={20} h={14} /><Bone w={64} h={20} r="var(--om-radius-1)" /></span>   {/* (the calm UI build 2026-10-27, 1-22) the subject leads — the number is on the line under it */}
                  <Line w="62%" className={styles.sub} />
                  <Line w="70%" className={styles.last} />
                  <span className={styles.side}><Line w={88} lh={16} h={10} /><Bone w={24} h={24} r="var(--om-radius-1)" /></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GhostSheet>
  )
}
