'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import styles from './page-header-l2.module.css'
import { useWindowScrolled } from './use-window-scrolled'

/**
 * Page Header / Leads - L2 (858:24783) — 72px: back arrow → `backHref`, then "{crumb} / " over the title with
 * its meta chips, actions right-aligned. Sticky with the same rounded-top plates as the L1 `PageHeader`.
 * Spec: design-source/context/lead-overview/01-header-tabs-quicklinks.txt.
 */
export function PageHeaderL2({
  scrollShadow = true,
  backHref,
  crumb,
  title,
  chips,
  actions,
  titleActions,
}: {
  /** (REG-331 · REG-369) This header owns its block's shadow. Off where a sticky tab strip follows it: the mock draws
   *  ONE level-1 under the header + tabs block (1186:2554), carried by whichever piece is at its bottom edge — the
   *  strip here. Desktop shows it only while the page is scrolled under the header; ≤767 it is always on. */
  scrollShadow?: boolean
  backHref: string
  /** Breadcrumb parent, rendered as "{crumb} / " (mock: "Leads / "). */
  crumb: string
  title: string
  /** `MetaChip`s, 8 apart, centred on the title line. */
  chips?: ReactNode
  actions?: ReactNode
  /** (REG-355) The header's own kebab. Last in the row on the desktop — where it has always sat, at the end of the
   *  action cluster — and ≤767 pinned to the title's line, so the lead's name keeps the width the canvas gives it (2a). */
  titleActions?: ReactNode
}) {
  const scrolled = useWindowScrolled()
  return (
    <header className={styles.header} data-scrolled={(scrollShadow && scrolled) || undefined}
            data-owns-shadow={scrollShadow || undefined}>
      <Tooltip label={`Back to ${crumb}`}>
        <Link href={backHref} className={styles.back} aria-label={`Back to ${crumb}`}>
          <Icon name="arrow_back" size={24} weight={300} />
        </Link>
      </Tooltip>
      <div className={styles.titleBlock} data-pinned={titleActions ? '' : undefined}>
        <span className={styles.crumb}>{crumb} / </span>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          {chips ? <div className={styles.chips}>{chips}</div> : null}
        </div>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
      {titleActions ? <div className={styles.titleActions}>{titleActions}</div> : null}
    </header>
  )
}
