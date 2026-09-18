'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { Tabs } from '@/components/om/tabs'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { TEMPLATE_KINDS } from '@/lib/company/sections'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './company-shell.module.css'

/**
 * A Company section page (REG-484; owner 2026-09-18: "should the side nav panel be a tab on the page? So it is consistent
 * … like leads details?" — yes): the L1 page header (there is no Company page to go back to, so no L2 arrow — the Qanvast
 * Ops frame), then the section's own **tab strip** where it has peers (Templates: All templates · Quotes · Tasks · T&Cs ·
 * Notes · Payments · Contracts — the unbuilt kinds are tabs too, their pages say when they are coming), then the panel at
 * full width. Profile has no peers and no strip. The rail's Company panel is the way between sections.
 */
export function CompanyShell({ title, tabs, actions, children }: {
  title: string
  /** The section's peers as routed tabs; omit for a section with none (Profile). */
  tabs?: { label: string; href: string }[]
  actions?: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  return (
    <PageReveal skeleton={<CompanySkeleton tabs={!!tabs} />}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        <PageHeader title={title} actions={actions} scrollShadow={!tabs} />
        {tabs ? <Tabs items={tabs} activeHref={pathname} aria-label={`${title} sections`} className={styles.stickyTabs} /> : null}
        <div className={pageStyles.content}>{children}</div>
      </div>
    </PageReveal>
  )
}

/** The Templates section's tabs — every kind, built or not (the unbuilt ones land on a page that says so). */
export const templateTabs = () => TEMPLATE_KINDS.map((k) => ({ label: k.label, href: k.href }))

/** The route's ghost (loading.tsx + PageReveal): header, the tab strip, a grid of card bones. */
export function CompanySkeleton({ tabs = true }: { tabs?: boolean }) {
  return (
    <GhostSheet label="Loading company">
      <div className={styles.ghostHead}><Bone w={160} h={28} /></div>
      {tabs ? <div className={styles.ghostTabs} aria-hidden>{[96, 56, 48, 48, 52, 76, 80].map((w, i) => <Bone key={i} w={w} h={14} />)}</div> : null}
      <div className={pageStyles.content} aria-hidden>
        <div className={styles.ghostGrid}>{[0, 1, 2, 3].map((i) => <Bone key={i} w="100%" h={280} r={8} />)}</div>
      </div>
    </GhostSheet>
  )
}
