'use client'

import type { ReactNode } from 'react'
import styles from './page-header.module.css'
import { useWindowScrolled } from './use-window-scrolled'

export function PageHeader({ title, actions, scrollShadow = true }: {
  title: string
  actions?: ReactNode
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
      <h1 className={styles.title}>{title}</h1>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}
