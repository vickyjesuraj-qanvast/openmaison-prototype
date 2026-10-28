'use client'

import type { ReactNode } from 'react'
import styles from './page-header.module.css'
import { useWindowScrolled } from './use-window-scrolled'

export function PageHeader({ title, actions, after, scrollShadow = true }: {
  title: string
  actions?: ReactNode
  /** (the calm UI build 2026-10-27, 6-22 · W-125 — additive) what belongs beside the title rather than at the header's far end: a status
   *  (Floorplan to 3D's Beta) or an info glyph about the page (the Marketplace's, Market Insights'). On a phone it takes the next line when it
   *  doesn't fit beside the title (the title keeps its one line, K-11). */
  after?: ReactNode
  /** (REG-369) This header owns its block's shadow. Off where a sticky tab strip follows it (Qanvast Ops): the mock
   *  draws ONE level-1 under the header + tabs block, carried by whichever piece is at its bottom edge. */
  scrollShadow?: boolean
}) {
  const scrolled = useWindowScrolled()   // (REG-331) the plate takes level-1 only while content scrolls under it
  return (
    /* (REG-362) `data-om-l1-header` is the marker MobileChrome reads: the ≤767 top bar belongs to the level-1
       pages only, and this component is what makes a page one (components/shell/mobile-nav.module.css). */
    <header className={styles.header} data-scrolled={(scrollShadow && scrolled) || undefined}
            data-owns-shadow={scrollShadow || undefined} data-om-l1-header>
      {after ? (
        <div className={styles.titleWith}><h1 className={styles.title}>{title}</h1><span className={styles.after}>{after}</span></div>
      ) : <h1 className={styles.title}>{title}</h1>}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}
