'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { shapeKey } from '@/lib/ghost-shape'
import { useFlagPref } from '@/lib/prefs'
import { Bone } from '@/components/shell/skeleton'
import { Line, Para, Slot, Words, cycle } from '@/components/shell/ghost-kit'
import card from '@/components/leads/detail/card.module.css'
import empty from '@/components/om/empty-state.module.css'
import styles from './designs.module.css'

/**
 * (REG-708 · simplify S-03) Design › Designs' ghost — the view's own layout on its own classes: the toolbar (the view switch, `title`, then AI
 * Visualizer · 3D Space Planner, their glyphs on a phone), a Renders card (its line, three tiles) and a 3D layouts card (two rows). `first`
 * (REG-817): the bare toolbar and the first-run card, the shape a project with nothing shared opens on. Drawn by the route's loader and the
 * page's PageReveal through components/projects/project-ghost.tsx.
 * (simplify round 2) …and the line that says the client can't see these when the view last had one (its remembered shape
 * `lead.{id}.designs.reach`), as the banners' ghosts draw a band: one bone of its height.
 */
export function DesignsGhost({ first = false, title }: { first?: boolean; title?: ReactNode }) {
  const projectId = usePathname()?.split('/')[2] ?? ''
  const [reach] = useFlagPref(shapeKey(`lead.${projectId}.designs.reach`), false)
  const line = reach ? <Bone w="100%" h={44} r={8} /> : null
  if (first) {
    return (
      <div className={styles.tab} aria-hidden>
        <div className={styles.bar}>{title}</div>
        {line}
        <section className={empty.empty} data-tone="first">
          <span className={empty.glyph} />
          <Words as="h3" className={empty.title}>No designs yet</Words>
          <span className={empty.help}><Para lines={3} lh={20} h={12} w={300} last={240} /></span>
          <div className={empty.actions}><Bone w={196} h={36} r="var(--om-radius-1)" /><Bone w={176} h={36} r="var(--om-radius-1)" /></div>
        </section>
      </div>
    )
  }
  return (
    <div className={styles.tab} aria-hidden>
      <div className={styles.bar}>{title}<span className={styles.actions}><Slot kind="btnFold" w={140} /><Slot kind="btnFold" w={186} /></span></div>
      {line}
      <section className={card.card}>
        <div className={card.head}><div className={card.headText}><Words className={card.title}>Renders</Words><Line w={160} lh={16} h={10} /></div></div>
        <div className={styles.share}>
          <div className={styles.shareText}><Line w={180} lh={24} h={14} /><Line w="62%" lh={20} h={10} /></div>
          <div className={styles.tiles}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={styles.tile}>
                <span className={styles.tileImg}><Bone w="100%" h={136} r={0} style={{ height: '100%' }} /></span>
                <Line w={cycle([84, 72, 96], i)} lh={20} h={12} /><Line w={56} lh={16} h={10} />
              </span>
            ))}
          </div>
        </div>
      </section>
      <section className={card.card}>
        <div className={card.head}><div className={card.headText}><Words className={card.title}>3D layouts</Words><Line w={112} lh={16} h={10} /></div></div>
        <div className={styles.list}>
          {[0, 1].map((i) => (
            <span key={i} className={styles.row}>
              <span className={styles.glyph} />
              <span className={styles.text}><Line w={cycle([160, 132], i)} lh={20} h={12} /><Line w={cycle([240, 200], i)} lh={16} h={10} /></span>
              <Slot kind="chip" w={64} />
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
