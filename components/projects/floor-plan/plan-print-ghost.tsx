'use client'

import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line, Slot } from '@/components/shell/ghost-kit'
import frame from '@/components/quotes/preview/quote-preview.module.css'
import styles from './plan-print.module.css'

/** (REG-708, gaps build G) The marked plan's page ghost — its own layout on its own classes: the preview's bar (the crumb, the plan's name and its
    chips, Include Studio only · Back to the plan · Download PDF) over the first paper (its head and the plan). Loader and PageReveal draw this one. */
export function PlanPrintGhost() {
  return (
    <GhostSheet label="Loading the marked plan">
      <div className={frame.page} aria-hidden>
        <div className={frame.bar}>
          <div className={frame.titleBlock}>
            <Line w={220} lh={16} h={10} />
            <div className={frame.titleRow}><Line w={200} lh={32} h={20} /><span className={frame.chips}><Slot kind="chip" w={96} /><Slot kind="chip" w={120} /></span></div>
          </div>
          <div className={frame.actions}><Slot kind="btn" w={164} /><Slot kind="btn" w={150} /><Slot kind="icon" /></div>
        </div>
        <div className={frame.body}>
          <div className={frame.column}>
            <div className={frame.stage}>
              <div className={styles.papers}>
                <div className={styles.paper}>
                  <div className={styles.head}><span className={styles.headMain}><Line w={260} lh={24} h={16} /><Line w={200} lh={16} h={10} /></span><span className={styles.headSide}><Line w={160} lh={20} h={14} /><Line w={220} lh={16} h={10} /></span></div>
                  <div className={styles.planBox}><Bone w="80%" h={560} r={4} /></div>
                  <Line w={360} lh={16} h={10} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
