'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Crumbs, type CrumbItem } from '@/components/om/crumbs'
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
  crumbs,
  title,
  chips,
  actions,
  titleActions,
  backLabel,
}: {
  /** (REG-331 · REG-369) This header owns its block's shadow. Off where a sticky tab strip follows it: the mock draws
   *  ONE level-1 under the header + tabs block (1186:2554), carried by whichever piece is at its bottom edge — the
   *  strip here. Desktop shows it only while the page is scrolled under the header; ≤767 it is always on. */
  scrollShadow?: boolean
  backHref: string
  /** Breadcrumb parent, rendered as "{crumb} / " (mock: "Leads / "). */
  crumb?: string
  /** (REG-536) The crumb as links — every segment with an href is clickable; `crumb` is the text fallback. */
  crumbs?: CrumbItem[]
  title: string
  /** `MetaChip`s, 8 apart, centred on the title line. */
  chips?: ReactNode
  actions?: ReactNode
  /** (REG-355) The header's own kebab. Last in the row on the desktop — where it has always sat, at the end of the
   *  action cluster — and ≤767 pinned to the title's line, so the lead's name keeps the width the canvas gives it (2a). */
  titleActions?: ReactNode
  /** (Dane's UAT 11.09) What Back says when it returns somewhere the crumb does not name — Insights opened from a lead goes back to the
   *  lead ("Back to Kevin Ng") while its crumb stays "Leads". Default: "Back to {crumb}". */
  backLabel?: string
}) {
  const scrolled = useWindowScrolled()
  const crumbText = crumb ?? (crumbs ?? []).map((c) => c.label).join(' / ')
  const backText = backLabel ?? `Back to ${crumbText}`
  return (
    <header className={styles.header} data-scrolled={(scrollShadow && scrolled) || undefined}
            data-owns-shadow={scrollShadow || undefined}>
      <Tooltip label={backText} shortcut="back">
        {/* (REG-713) Esc goes back here once nothing is open — the key layer presses this link */}
        <Link href={backHref} className={styles.back} aria-label={backText} data-kb="back">
          <Icon name="arrow_back" size={24} weight={300} />
        </Link>
      </Tooltip>
      <div className={styles.titleBlock} data-pinned={titleActions ? '' : undefined}>
        {crumbs ? <Crumbs items={crumbs} className={styles.crumb} trailingSlash /> : <span className={styles.crumb}>{crumb} / </span>}
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
