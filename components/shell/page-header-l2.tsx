'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import styles from './page-header-l2.module.css'

/**
 * Page Header / Leads - L2 (858:24783) — 72px: back arrow → `backHref`, then "{crumb} / " over the title with
 * its meta chips, actions right-aligned. Sticky with the same rounded-top plates as the L1 `PageHeader`.
 * Spec: design-source/context/lead-overview/01-header-tabs-quicklinks.txt.
 */
export function PageHeaderL2({
  backHref,
  crumb,
  title,
  chips,
  actions,
}: {
  backHref: string
  /** Breadcrumb parent, rendered as "{crumb} / " (mock: "Leads / "). */
  crumb: string
  title: string
  /** `MetaChip`s, 8 apart, centred on the title line. */
  chips?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className={styles.header}>
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
