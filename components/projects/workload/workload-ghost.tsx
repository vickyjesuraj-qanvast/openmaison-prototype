import type { CSSProperties } from 'react'
import { Bone } from '@/components/shell/skeleton'
import { Line, Slot, cycle } from '@/components/shell/ghost-kit'
import styles from './workload.module.css'

/**
 * (REG-708, gaps build I) The Workload view's ghost — its own layout on its own classes: the caption with Set capacity and Insights, then the
 * card of people, each the avatar over the name and the role, the bar of slots and the state chip over the count. Drawn by the listing's
 * ghost (components/projects/projects-ghost.tsx) when the address says `?view=workload`.
 */
export function WorkloadGhost() {
  return (
    <div className={styles.view} aria-hidden>
      <div className={styles.caption}><Line w={360} lh={20} h={10} /><span className={styles.captionActions}><Slot kind="btn" w={132} /><Slot kind="btn" w={100} /></span></div>
      <div className={styles.card}>
        {[3, 2, 4, 1, 2].map((n, i) => (
          <div key={i} className={styles.row}>
            <span className={styles.who}><Bone w={36} h={36} r="50%" /><span className={styles.whoText}><Line w={cycle([96, 72, 88], i)} lh={20} h={12} /><Line w={112} lh={16} h={10} /></span></span>
            <span className={styles.bar} style={{ '--slots': 4 } as CSSProperties}>
              {Array.from({ length: 4 }, (_, k) => (k < n ? <Bone key={k} w="100%" h={36} r="var(--om-radius-1)" /> : <span key={k} className={styles.slot} />))}
            </span>
            <span className={styles.state}><Slot kind="chip" w={104} /><Line w={72} lh={16} h={10} /></span>
          </div>
        ))}
      </div>
    </div>
  )
}
