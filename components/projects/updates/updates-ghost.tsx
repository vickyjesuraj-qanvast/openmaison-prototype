import type { ReactNode } from 'react'
import { Bone } from '@/components/shell/skeleton'
import { Line, Para, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import chipRow from '@/components/om/chips.module.css'
import rail from '@/components/om/chip-rail.module.css'
import empty from '@/components/om/empty-state.module.css'
import styles from './updates.module.css'

/** One post's ghost on the post's own classes: the head (avatar · name over time · state tag · ⋮), the title, two lines, the photos. */
function PostGhost({ i }: { i: number }) {
  return (
    <div className={styles.post}>
      <div className={styles.postBody}>
        <div className={styles.postHead}>
          <Bone w={36} h={36} r="50%" />
          <span className={styles.who}><Line w={cycle([72, 96, 64], i)} lh={20} h={12} /><Line w={112} lh={16} h={10} /></span>
          <span className={styles.tags}><Slot kind="chip" w={76} /></span>
          <Slot kind="icon" />
        </div>
        <Line w={cycle([280, 220, 320], i)} lh={24} h={16} />
        <span className={styles.html}><Para lines={2} lh={20} h={12} w="88%" last="54%" /></span>
        <div className={styles.media}>{Array.from({ length: cycle([3, 2, 4], i) }, (_, k) => <span key={k} className={styles.tile}><Bone w="100%" h={136} r={0} style={{ height: '100%' }} /></span>)}</div>
      </div>
    </div>
  )
}

/**
 * (REG-708 · REG-951) The Updates tab's ghost — the tab's own layout: the house toolbar ("All Updates" · the search, its glyph at ≤1024 ·
 * Post an update, its glyph on a phone), the state chips, then a day's head and two posts on the post's own card. `first` (REG-817): the bare
 * title and the first-run card, the shape an empty project's tab opens on. The route's loader and the page's PageReveal draw it through
 * components/projects/project-ghost.tsx.
 */
export function UpdatesGhost({ first = false, title }: { first?: boolean; /** (simplify S-03) the group's view switch's ghost, in the title's place on a project */ title?: ReactNode }) {
  if (first) {
    return (
      <div className={styles.tab} aria-hidden>
        <div className={styles.bar}>{title ?? <Words as="h2" className={styles.title}>All Updates</Words>}</div>
        <section className={empty.empty} data-tone="first">
          <span className={empty.glyph} />
          <Words as="h3" className={empty.title}>No updates yet</Words>
          <span className={empty.help} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Para lines={3} lh={20} h={12} w={300} last={240} /></span>
          <div className={empty.actions}><Bone w={152} h={36} r="var(--om-radius-1)" /></div>
        </section>
      </div>
    )
  }
  return (
    <div className={styles.tab} aria-hidden>
      <div className={styles.bar}>
        {title ?? <Words as="h2" className={styles.title}>All Updates</Words>}
        <span className={styles.actions}><Slot kind="search" /><Slot kind="btnFold" w={152} /></span>
      </div>
      <div><div className={rail.wrap}><div className={rail.rail}><div className={rail.track}><div className={chipRow.chips}>{[41, 88, 81, 85, 64].map((w, i) => <Slot key={i} kind="pill" w={w} />)}</div></div></div></div></div>
      <div className={styles.feed}>
        <section className={styles.day}>
          <Line w={168} lh={24} h={14} />
          <div className={styles.posts}><PostGhost i={0} /><PostGhost i={1} /></div>
        </section>
      </div>
    </div>
  )
}
