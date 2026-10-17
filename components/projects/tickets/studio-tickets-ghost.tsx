import { GhostSheet, Bone } from '@/components/shell/skeleton'
import { GhostHead2, Line, Slot } from '@/components/shell/ghost-kit'
import pageStyles from '@/app/leads/leads.module.css'
import chipRow from '@/components/om/chips.module.css'
import styles from './tickets.module.css'

/** (REG-708, gaps build H) Projects › Tickets' own ghost: the L2 header (Projects / Tickets), the scope chips and the search, the ticket cards
    with their project line. The route's `loading.tsx` and the page's PageReveal draw this same one. */
export function StudioTicketsGhost() {
  return (
    <GhostSheet label="Loading tickets">
      <GhostHead2 crumb={56} title={72} />
      <div className={pageStyles.content} aria-hidden>
        <div className={styles.tab}>
          <div className={styles.bar}>
            <span className={chipRow.chips}>{[84, 176, 64].map((w, i) => <Bone key={i} w={w} h={32} r="var(--om-radius-full)" />)}</span>
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
      </div>
    </GhostSheet>
  )
}
