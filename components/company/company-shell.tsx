'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { fromLabel, withFrom } from '@/lib/nav'
import { Tabs } from '@/components/om/tabs'
import { TEMPLATE_KINDS, companySectionOf } from '@/lib/company/sections'
import { SETTINGS_MODULES } from '@/lib/settings/modules'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './company-shell.module.css'

/**
 * A Company section page (REG-484; owner 2026-09-18: "should the side nav panel be a tab on the page? So it is consistent
 * … like leads details?" — yes): the L1 page header (there is no Company page to go back to, so no L2 arrow — the Qanvast
 * Ops frame), then the section's own **tab strip** where it has peers (Templates: Quotes · Contracts · Tasks · T&Cs & Notes · Payments — every kind live, REG-538), then the panel at
 * full width. Profile has no peers and no strip. The rail's Company panel is the way between sections.
 */
export function CompanyShell({ title, tabs, actions, from, activeHref, crumb = 'Company', origin: originName, backLabel, skeleton, onSoon, children }: {
  title: string
  /** The section's peers as routed tabs; omit for a section with none (Profile). A tab marked `soon` is inert (`onSoon`). */
  tabs?: { label: string; href: string; soon?: boolean; /** (simplify S-10) what waits on you there — Finance's To do — the house Tabs' count */ count?: number }[]
  actions?: ReactNode
  /** (REG-538) Where the page was opened from — an editor's Manage Templates: the L2 header with Back, and the tabs keep it. */
  from?: string
  /** (REG-645) The selected tab when it is not the path alone — Settings' modules live in `?section=`. */
  activeHref?: string
  /** (REG-645) What the L2 crumb calls this frame — Company, or Settings on Settings' own pages. (pending modules S01) '' for a page of no
      frame — Your profile: the crumb is then the place it was opened from alone ("Members / Your profile", as a lead's "Leads / Farah Ahmad"). */
  crumb?: string
  /** (REG-1361) What the L2 crumb calls the page it was opened from when its section's word is not enough — a lead's name. */
  origin?: string
  /** (REG-1361) What Back says. Default "Back to {origin}" — the place Back goes, never the two crumbs joined ("Back to Leads / Company"). */
  backLabel?: string
  /** (REG-708) The page's own ghost — the one its route's loading.tsx draws (components/company/company-ghosts.tsx), so the hand-over is invisible. */
  skeleton: ReactNode
  onSoon?: () => void
  children: ReactNode
}) {
  const pathname = usePathname()
  const items = from && tabs ? tabs.map((t) => (t.soon ? t : { ...t, href: withFrom(t.href, from) })) : tabs
  /* (REG-1361, bug fix) the tabs carry `from`, so the page's own tab is matched with it too — opened from somewhere, a tab was never marked */
  const active = from ? withFrom(activeHref ?? pathname, from) : activeHref ?? pathname
  const origin = from ? originName ?? originOf(from, crumb) : null
  return (
    <PageReveal skeleton={skeleton}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        {from ? (
          <PageHeaderL2 backHref={from} backLabel={backLabel ?? `Back to ${origin}`} crumbs={crumb ? [{ label: origin!, href: from }, { label: crumb }] : [{ label: origin!, href: from }]} title={title} actions={actions} scrollShadow={!tabs} />
        ) : (
          <PageHeader title={title} actions={actions} scrollShadow={!tabs} />
        )}
        {items ? <Tabs items={items} activeHref={active} aria-label={`${title} sections`} className={styles.stickyTabs} onSoon={onSoon} /> : null}
        <div className={pageStyles.content}>{children}</div>
      </div>
    </PageReveal>
  )
}

/** (REG-721, owner 2026-09-28: "why it's twice company / company?") The crumb's first word names where Back goes. Opened from
    another page of the same frame — Plan & billing's Edit in Profile — the section's word would repeat the frame's, so that page is
    named instead: "Plan & AI credits / Company", "Quotes & pricing / Settings". */
function originOf(from: string, frame: string): string {
  const section = fromLabel(from)
  if (section !== frame) return section ?? 'Back'
  if (frame === 'Company') return companySectionOf(from) ?? section
  const key = new URLSearchParams(from.split('?')[1] ?? '').get('section') ?? 'studio'
  return SETTINGS_MODULES.find((m) => m.key === key)?.label ?? section
}

/** The Templates section's tabs — every kind, built or not (the unbuilt ones land on a page that says so). */
export const templateTabs = () => TEMPLATE_KINDS.map((k) => ({ label: k.label, href: k.href }))
