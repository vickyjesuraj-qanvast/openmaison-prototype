import { Slot } from '@/components/shell/ghost-kit'
import rail from '@/components/om/chip-rail.module.css'
import { groupOf } from '@/lib/projects/tabs'
import styles from './project-views.module.css'

/** A segment's desk width from its words: the label at ~7.4 a letter, 16 + 16 padding. */
const segW = (label: string) => Math.round(label.length * 7.4) + 32

/**
 * (REG-708 · simplify S-03) The view switch's ghost — the switch in the title's place, on the rail's own classes, (the calm UI build 2026-10-27,
 * 3-08) one 36 box as wide as the segments' words read (a count is data the ghost can't know). Server-safe: the route's loaders and the page's PageReveal draw it through the body ghosts'
 * `title` slot (components/projects/project-ghost.tsx, components/leads/detail/tab-ghosts.tsx).
 */
export function ProjectViewsGhost({ slug }: { slug: string }) {
  const views = groupOf(slug).views
  return (
    <div className={styles.views} aria-hidden>
      <div className={`${rail.wrap} ${styles.rail}`}><div className={rail.rail}><div className={rail.track}>
        <Slot kind="btn" w={views.reduce((n, v) => n + segW(v.label), 0)} />
      </div></div></div>
    </div>
  )
}
