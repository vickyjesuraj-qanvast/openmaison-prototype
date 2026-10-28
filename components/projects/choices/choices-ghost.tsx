import type { ReactNode } from 'react'
import { Bone } from '@/components/shell/skeleton'
import { Line, Para, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import empty from '@/components/om/empty-state.module.css'
import styles from './choices.module.css'

/** One choice's ghost on the card's own classes: the band, the title over its chips, ⋮, a line, the options' squares. */
function ChoiceGhost({ i }: { i: number }) {
  return (
    <div className={styles.choice}>
      <div className={styles.band}><Bone w={20} h={20} r="50%" /><span className={styles.bandText}><Line w={cycle([300, 260, 340], i)} lh={20} h={12} /></span><Slot kind="btn" w={cycle([160, 152, 120], i)} /></div>
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.headText}><Line w={cycle([180, 220, 160], i)} lh={24} h={16} /><span className={styles.meta}><Line w={cycle([220, 180, 200], i)} lh={20} h={10} /></span></span>
          <Slot kind="icon" />
        </div>
        <span className={styles.note}><Para lines={1} lh={20} h={12} w="62%" last="62%" /></span>
        <div className={styles.options}>
          {Array.from({ length: cycle([3, 2, 3], i) }, (_, k) => (
            <span key={k} className={styles.option}><span className={styles.optionThumb}><Bone w="100%" h={136} r={0} style={{ height: '100%' }} /></span><Line w={96} lh={20} h={12} /><Line w={56} lh={16} h={10} /></span>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * (REG-708 · Projects round 8) The Choices tab's ghost — the tab's own layout: the house toolbar ("All Choices" · the search, its glyph at
 * ≤1024 · Add a choice, its glyph on a phone), By room · By milestone, then a group's head and two choices on the card's own classes.
 * `first` (REG-817): the bare title and the first-run card, the shape an empty project's tab opens on. The route's loader and the page's
 * PageReveal draw it through components/projects/project-ghost.tsx.
 */
export function ChoicesGhost({ first = false, title }: { first?: boolean; /** (simplify S-03) the group's view switch's ghost, in the title's place on a project */ title?: ReactNode }) {
  if (first) {
    return (
      <div className={styles.tab} aria-hidden>
        <div className={styles.bar}>{title ?? <Words as="h2" className={styles.title}>All Choices</Words>}</div>
        <section className={empty.empty} data-tone="first">
          <span className={empty.glyph} />
          <Words as="h3" className={empty.title}>No choices yet</Words>
          <span className={empty.help} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Para lines={3} lh={20} h={12} w={300} last={240} /></span>
          <div className={empty.actions}><Bone w={140} h={36} r="var(--om-radius-1)" /></div>
        </section>
      </div>
    )
  }
  return (
    <div className={styles.tab} aria-hidden>
      <div className={styles.bar}>
        {title ?? <Words as="h2" className={styles.title}>All Choices</Words>}
        <span className={styles.actions}><Slot kind="search" /><Slot kind="btnFold" w={140} /></span>
      </div>
      {/* (the calm UI build 2026-10-27, 3-08) the one Group pill */}
      <div><Slot kind="btn" w={164} /></div>
      <div className={styles.groups}>
        <section className={styles.group}>
          <Line w={168} lh={24} h={14} />
          <div className={styles.cards}><ChoiceGhost i={0} /><ChoiceGhost i={1} /></div>
        </section>
      </div>
    </div>
  )
}
