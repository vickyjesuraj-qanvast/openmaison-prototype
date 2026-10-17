import type { ReactNode } from 'react'
import { Bone } from '@/components/shell/skeleton'
import { Line, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import chipRow from '@/components/om/chips.module.css'
import rail from '@/components/om/chip-rail.module.css'
import styles from './compliance.module.css'

/**
 * (REG-708, gaps build I) The Compliance tab's ghost — the tab's own layout on its own classes: the toolbar (the title · Compliance Navigator),
 * the phase chips and the progress line, then two categories, each its head and its card table — the table's own head (simplify round 2), then
 * its items (the mark, the title over its chips, Mark done, ⋮). Drawn by the route's loader and the page's PageReveal through components/projects/project-ghost.tsx.
 */
export function ComplianceGhost({ title }: { /** (simplify S-03) the group's view switch's ghost, in the title's place on a project */ title?: ReactNode } = {}) {
  return (
    <div className={styles.tab} aria-hidden>
      <div className={styles.bar}>
        {title ?? <Line w={220} lh={36} h={16} />}
        <span className={styles.actions}><Slot kind="btn" w={176} /></span>
      </div>
      <div className={styles.lead}>
        <div className={rail.wrap}><div className={rail.rail}><div className={rail.track}><div className={chipRow.chips}>{[128, 144, 136].map((w, i) => <Slot key={i} kind="pill" w={w} />)}</div></div></div></div>
        <Line w="70%" lh={20} h={12} />
      </div>
      <div className={styles.groups}>
        {[3, 2].map((n, g) => (
          <section key={g} className={styles.group}>
            <span className={styles.groupHead}><Words>{g === 0 ? 'Permits & Approvals' : 'Professional Engagement'}</Words></span>
            <div className={styles.table}>
              {/* (simplify round 2) the card table's head, as the page draws it (gone on a phone) */}
              <div className={styles.head}><Words>Item</Words></div>
              {Array.from({ length: n }, (_, i) => (
                <div key={i} className={styles.row}>
                  <div className={styles.item}>
                    <Bone w={20} h={20} r="50%" />
                    <span className={styles.itemText}><Line w={cycle([240, 200, 280], i + g)} lh={20} h={12} /><Line w={180} lh={20} h={10} /></span>
                  </div>
                  <span className={styles.press}><Slot kind="btn" w={116} /></span>
                  <span className={styles.menuWrap}><Slot kind="icon" /></span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
