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
  compact = false,
  backHref,
  crumb,
  title,
  chips,
  actions,
}: {
  /** (REG-345) ≤767 a tab other than Overview drops the chips: the identity block belongs to the tab that shows the lead,
   *  and four rows of chrome left barely a screen for the tab's own content. Desktop always shows them. */
  compact?: boolean
  /** (REG-331) Level-1 while the page is scrolled under the header. Off where a sticky tab strip follows it — the strip carries the mock's own level-1 (858:24784). */
  scrollShadow?: boolean
  backHref: string
  /** Breadcrumb parent, rendered as "{crumb} / " (mock: "Leads / "). */
  crumb: string
  title: string
  /** `MetaChip`s, 8 apart, centred on the title line. */
  chips?: ReactNode
  actions?: ReactNode
}) {
  const scrolled = useWindowScrolled()
  return (
    <header className={styles.header} data-scrolled={(scrollShadow && scrolled) || undefined} data-compact={compact || undefined}>
      <Tooltip label={`Back to ${crumb}`}>
        <Link href={backHref} className={styles.back} aria-label={`Back to ${crumb}`}>
          <Icon name="arrow_back" size={24} weight={300} />
        </Link>
      </Tooltip>
      <div className={styles.titleBlock}>
        <span className={styles.crumb}>{crumb} / </span>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          {chips ? <div className={styles.chips}>{chips}</div> : null}
        </div>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}
