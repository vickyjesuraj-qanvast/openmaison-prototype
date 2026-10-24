import type { ReactNode } from 'react'
import { Bone } from '@/components/shell/skeleton'
import { Line, Para, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import chipRow from '@/components/om/chips.module.css'
import rail from '@/components/om/chip-rail.module.css'
import empty from '@/components/om/empty-state.module.css'
import card from '@/components/leads/detail/card.module.css'
import styles from './floor-plan.module.css'

/**
 * (REG-708, gaps build G) The Floor plan tab's ghost — the tab's own layout on its own classes: the toolbar (the plan's name · the main-plan chip ·
 * Add a plan · Download PDF · ⋮), the banner, then the plan with its tools on the left and the rail (the filter, two marks) on the right; one
 * column ≤1024, as the tab folds. `first` (REG-817): the bare title and the first-run card. Drawn by the route's loader and the page's
 * PageReveal through components/projects/project-ghost.tsx.
 */
export function FloorPlanGhost({ first = false, title }: { first?: boolean; /** (simplify S-03) the group's view switch's ghost, in the title's place on a project */ title?: ReactNode }) {
  if (first) {
    return (
      <div className={styles.tab} aria-hidden>
        <div className={styles.bar} data-views={title ? '' : undefined}>{title ?? <Words as="h2" className={styles.title}>Floor plan</Words>}</div>
        <section className={empty.empty} data-tone="first">
          <span className={empty.glyph} />
          <Words as="h3" className={empty.title}>No floor plan yet</Words>
          <span className={empty.help} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Para lines={3} lh={20} h={12} w={300} last={240} /></span>
          <div className={empty.actions}><Bone w={140} h={36} r="var(--om-radius-1)" /></div>
        </section>
      </div>
    )
  }
  return (
    <div className={styles.tab} aria-hidden>
      <div className={styles.bar} data-views={title ? '' : undefined}>
        {title ?? <Line w={220} lh={36} h={16} />}
        <span className={styles.actions}><Slot kind="chip" w={96} /><Slot kind="btnFold" w={132} /><Slot kind="icon" /><Slot kind="icon" /></span>
      </div>
      {/* (simplify S-03) on a project the plan's name rides in the plans' chips, drawn for one plan too */}
      {title ? <div><div className={rail.wrap}><div className={rail.rail}><div className={rail.track}><div className={chipRow.chips}><Slot kind="pill" w={168} /></div></div></div></div></div> : null}
      <Bone w="100%" h={48} r="var(--om-radius-2)" />
      <div className={styles.layout}>
        <div className={styles.canvasCol}>
          <div className={styles.tools}><div className={rail.wrap}><div className={rail.rail}><div className={rail.track}><div className={chipRow.chips}>{[60, 48, 48, 56, 48, 40, 56, 52, 52, 60, 56, 64, 52].map((w, i) => <Slot key={i} kind="pill" w={w} />)}</div></div></div></div></div>
          <Bone w="100%" h={480} r="var(--om-radius-1)" />
          <Line w="60%" lh={16} h={10} />
        </div>
        <div className={styles.rail}>
          <div className={chipRow.chips}>{[52, 64, 64].map((w, i) => <Slot key={i} kind="pill" w={w} />)}</div>
          <Line w={160} lh={36} h={12} />
          {[0, 1, 2].map((i) => (
            <div key={i} className={card.card}>
              <div className={styles.markHead}><Bone w={32} h={32} r="50%" /><span className={styles.markText}><Line w={cycle([96, 120, 80], i)} lh={24} h={14} /><Line w={140} lh={16} h={10} /></span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
