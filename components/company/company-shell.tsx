'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { fromLabel, withFrom } from '@/lib/nav'
import { Tabs } from '@/components/om/tabs'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { LibraryGalleryGhost } from '@/components/company/templates/library-gallery.skeleton'
import { TEMPLATE_KINDS, tabBones } from '@/lib/company/sections'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './company-shell.module.css'

/**
 * A Company section page (REG-484; owner 2026-09-18: "should the side nav panel be a tab on the page? So it is consistent
 * … like leads details?" — yes): the L1 page header (there is no Company page to go back to, so no L2 arrow — the Qanvast
 * Ops frame), then the section's own **tab strip** where it has peers (Templates: Quotes · Contracts · Tasks · T&Cs & Notes · Payments — every kind live, REG-538), then the panel at
 * full width. Profile has no peers and no strip. The rail's Company panel is the way between sections.
 */
export function CompanyShell({ title, tabs, actions, from, activeHref, crumb = 'Company', skeleton, form = false, onSoon, children }: {
  title: string
  /** The section's peers as routed tabs; omit for a section with none (Profile). A tab marked `soon` is inert (`onSoon`). */
  tabs?: { label: string; href: string; soon?: boolean }[]
  actions?: ReactNode
  /** (REG-538) Where the page was opened from — an editor's Manage Templates: the L2 header with Back, and the tabs keep it. */
  from?: string
  /** (REG-645) The selected tab when it is not the path alone — Settings' modules live in `?section=`. */
  activeHref?: string
  /** (REG-645) What the L2 crumb calls this frame — Company, or Settings on Settings' own pages. */
  crumb?: string
  skeleton?: ReactNode
  /** (sweep S4 #26) A page of form cards in one column (Profile, Members, Integrations, the Questionnaire, the brand kit): its ghost says so. */
  form?: boolean
  onSoon?: () => void
  children: ReactNode
}) {
  const pathname = usePathname()
  const items = from && tabs ? tabs.map((t) => (t.soon ? t : { ...t, href: withFrom(t.href, from) })) : tabs
  const active = activeHref ? (from ? withFrom(activeHref, from) : activeHref) : pathname
  const origin = from ? fromLabel(from) ?? 'Back' : null
  return (
    <PageReveal skeleton={skeleton ?? <CompanySkeleton tabs={!!tabs} tabWidths={tabs ? tabBones(tabs.map((t) => t.label)) : undefined} form={form} />}>   {/* (sweep S4 #26) the same ghost the route's loading.tsx drew */}
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        {from ? (
          <PageHeaderL2 backHref={from} crumbs={[{ label: origin!, href: from }, { label: crumb }]} title={title} actions={actions} scrollShadow={!tabs} />
        ) : (
          <PageHeader title={title} actions={actions} scrollShadow={!tabs} />
        )}
        {items ? <Tabs items={items} activeHref={active} aria-label={`${title} sections`} className={styles.stickyTabs} onSoon={onSoon} /> : null}
        <div className={pageStyles.content}>{children}</div>
      </div>
    </PageReveal>
  )
}

/** The Templates section's tabs — every kind, built or not (the unbuilt ones land on a page that says so). */
export const templateTabs = () => TEMPLATE_KINDS.map((k) => ({ label: k.label, href: k.href }))

/** The route's ghost (loading.tsx + PageReveal): header, the tab strip, a grid of card bones. */
export function CompanySkeleton({ tabs = true, form = false, gallery = false, tabWidths = tabBones(TEMPLATE_KINDS.map((k) => k.label)) }: { tabs?: boolean; form?: boolean; /** (audit 2026-09-26, round 3) a library tab: the gallery's own toolbar, Folders row and cards */ gallery?: boolean; /** (REG-653, Q-18) one bone per tab the section has */ tabWidths?: number[] }) {
  return (
    <GhostSheet label="Loading company" l1>
      <div className={styles.ghostHead}><Bone w={160} h={28} /></div>
      {tabs ? <div className={styles.ghostTabs} aria-hidden>{tabWidths.map((w, i) => <Bone key={i} w={w} h={14} />)}</div> : null}
      <div className={pageStyles.content} aria-hidden>
        {/* (sweep S4 #26) a form page is one column of cards, as the page draws it — never the gallery's grid */}
        {form ? <div className={styles.ghostForm}>{[0, 1].map((i) => <Bone key={i} w="100%" h={360} r={8} />)}</div>
          : gallery ? <LibraryGalleryGhost pill folders={1} cards={8} />
          : <div className={styles.ghostGrid}>{[0, 1, 2, 3].map((i) => <Bone key={i} w="100%" h={280} r={8} />)}</div>}
      </div>
    </GhostSheet>
  )
}
