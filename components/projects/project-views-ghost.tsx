import { Slot } from '@/components/shell/ghost-kit'
import chipRow from '@/components/om/chips.module.css'
import rail from '@/components/om/chip-rail.module.css'
import { groupOf } from '@/lib/projects/tabs'
import styles from './project-views.module.css'

/** A chip's desk width from its words: subheading-s at ~7.4 a letter, 12 + 12 padding, the 1px edge. */
const chipW = (label: string) => Math.round(label.length * 7.4) + 26

/**
 * (REG-708 · simplify S-03) The view switch's ghost — the chips in the title's place, on the rail's own classes, one pill per view as wide as its
 * words read (a count is data the ghost can't know). Server-safe: the route's loaders and the page's PageReveal draw it through the body ghosts'
 * `title` slot (components/projects/project-ghost.tsx, components/leads/detail/tab-ghosts.tsx).
 */
export function ProjectViewsGhost({ slug }: { slug: string }) {
  const views = groupOf(slug).views
  return (
    <div className={styles.views} aria-hidden>
      <div className={`${rail.wrap} ${styles.rail}`}><div className={rail.rail}><div className={rail.track}>
        <div className={chipRow.chips}>{views.map((v) => <Slot key={v.slug} kind="pill" w={chipW(v.label)} />)}</div>
      </div></div></div>
    </div>
  )
}
