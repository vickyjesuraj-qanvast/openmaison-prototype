'use client'

import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { GhostHead, Line, Para, Slot, Words } from '@/components/shell/ghost-kit'
import { useFirstRunShape, useSeedFlag } from '@/lib/ghost-shape'
import pageStyles from '@/app/leads/leads.module.css'
import chipRow from '@/components/om/chips.module.css'
import empty from '@/components/om/empty-state.module.css'
import styles from './tickets.module.css'

/** (pending modules S46B) The page's first-run key — remembered by the page, seeded by the app shell (lib/ghost-shapes.server.ts). */
export const STUDIO_TICKETS_SHAPE = 'studio-tickets'

/** (REG-708, gaps build H) Projects › Tickets' own ghost: the L2 header (Projects / Tickets), the scope chips and the search, the ticket cards
    with their project line. The route's `loading.tsx` and the page's PageReveal draw this same one.
    (pending modules S46B, M1) The header's New ticket for whoever may raise one (`raise` from the page, the seed's `tickets.new` for the loader);
    with no ticket yet, the first-run card — its New ticket under the help — as the page opens on it (REG-817). */
export function StudioTicketsGhost({ raise: told }: { raise?: boolean } = {}) {
  const seeded = useSeedFlag('tickets.new', false)
  const raise = told ?? seeded
  const first = useFirstRunShape(STUDIO_TICKETS_SHAPE)
  return (
    <GhostSheet label="Loading tickets">
      <GhostHead title={72} actions={raise && !first ? [{ fold: 124 }] : []} />   {/* (S46 — REG-2524) the L1 head, as the page's */}
      <div className={pageStyles.content} aria-hidden>
        {first ? (
          <section className={empty.empty} data-tone="first">
            <span className={empty.glyph} />
            <Words as="h3" className={empty.title}>No tickets yet</Words>
            <span className={empty.help}><Para lines={raise ? 3 : 2} lh={20} h={12} w={300} last={raise ? 200 : 240} /></span>
            {raise ? <div className={empty.actions}><Bone w={132} h={36} r="var(--om-radius-1)" /></div> : null}
          </section>
        ) : (
          <div className={styles.tab}>
            <div className={styles.bar}>
              <span className={styles.chips}><span className={`${chipRow.chips} ${styles.ghostChips}`}>{[64, 84, 176].map((w, i) => <Bone key={i} w={w} h={32} r="var(--om-radius-full)" />)}</span><span className={styles.ghostPill}><Slot kind="pill" /></span></span>
              <span className={styles.actions}><Slot kind="search" /><Slot kind="icon" /></span>   {/* (parity map, UC-047) Filters after the search */}
            </div>
            <div className={styles.list}>
              {[260, 220, 240, 200].map((w, i) => (
                <div key={i} className={styles.card}>
                  <span className={styles.head}><Line w={84} /><Line w={w} lh={20} h={14} /><Bone w={64} h={20} r="var(--om-radius-1)" /></span>
                  <Line w="62%" className={styles.sub} />
                  <Line w="70%" className={styles.last} />
                  <span className={styles.side}><Bone w={24} h={24} r="var(--om-radius-1)" /><Line w={88} lh={16} h={10} /></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GhostSheet>
  )
}
