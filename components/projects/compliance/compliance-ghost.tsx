import type { ReactNode } from 'react'
import { Bone } from '@/components/shell/skeleton'
import { Line, Slot, Words, cycle } from '@/components/shell/ghost-kit'
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
      {/* (the calm UI build 2026-10-27, 3-08 · 3-29) the phase pill and the one progress line beside it */}
      <div className={styles.lead}>
        <div className={styles.phaseLine}><Slot kind="btn" w={156} /><Line w={260} lh={20} h={12} /></div>
      </div>
      <div className={styles.groups}>
        {[3, 2].map((n, g) => (
          <section key={g} className={styles.group}>
            <span className={styles.groupHead}><Words>{g === 0 ? 'Permits and approvals' : 'Professionals to engage'}</Words></span>
            {/* (the calm UI build 2026-10-27, 3-29) a plain headed list, as the page draws it — (6-13) its heads in the checklist's own sentence case */}
            <div className={styles.list}>
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
