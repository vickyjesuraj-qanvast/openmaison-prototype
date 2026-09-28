'use client'

import { useEffect, useRef, useState } from 'react'
import { useFlagPref } from '@/lib/prefs'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { useComingSoon } from '@/components/om/snackbar'
import { openGlobalSearch } from './global-search'
import { ToolsPopover } from './tools-popover'
import { CompanyPopover } from '@/components/company/company-popover'
import { openNotifications } from '@/components/shell/notifications-panel'
import { ViewAsPopover } from './view-as-popover'
import { Avatar } from '@/components/om/avatar'
import type { SessionMember } from '@/lib/db/session'
import type { CreditsChrome } from '@/lib/credits/chrome'
import { RailCredits } from './rail-credits'
import { usePlatform } from '@/components/om/keys'
import { keysPlain } from '@/lib/keys/spec'
import styles from './app-rail.module.css'

/**
 * Side navigation — collapsed rail (52, item tooltips; the logo tile becomes
 * the expand icon on hover — 795:22541) · expanded (216, in the layout —
 * 779:19690). Glyph↔label mapping from screen 01. Only Leads is a real
 * destination in phase 1.
 */
const TOP_ITEMS = [
  { icon: 'dashboard', label: 'Dashboard' },
  { icon: 'task_alt', label: 'Tasks', href: '/tasks' },   /* (REG-466) the studio's tasks, second after Dashboard as 1.0 had it; task_alt has no filled state in Material Symbols — the owner chose to leave it */
  { icon: 'business_center', label: 'Projects' },
  { icon: 'people_alt', label: 'Leads', href: '/leads' },
  { icon: 'storefront', label: 'Marketplace' },
  { icon: 'domain', label: 'Company', panel: '/company' },   /* (REG-484) opens the Company panel beside the rail; lit on every /company page */
  { icon: 'account_balance', label: 'Qanvast Ops', href: '/qanvast-ops' },
]
const BOTTOM_ITEMS = [
  { icon: 'apps', label: 'Tools' },
  { icon: 'chat', label: 'Chat' },
  { icon: 'notifications', label: 'Notifications' },
  { icon: 'settings', label: 'Settings', href: '/settings' },
]
/** `badges`: a count drawn on an item's glyph — today the Tasks item's overdue tasks (REG-466), keyed by href.
 *  `team`: the studio's members for Demo Studio › View as (REG-667).
 *  `credits`: the studio's plan and AI credits for the Upgrade slot (REG-701) — Upgrade on Free, the balance on a paid plan. */
/** (REG-715) The rail's places the G then … keys go to (`lib/keys/registry.ts` GO). */
const GO_BY_HREF: Record<string, string> = { '/tasks': 'go.tasks', '/leads': 'go.leads', '/settings': 'go.settings' }

export function AppRail({ badges, team = [], credits = null }: { badges?: Record<string, number>; team?: SessionMember[]; credits?: CreditsChrome | null } = {}) {
  const comingSoon = useComingSoon()
  const pathname = usePathname()
  const platform = usePlatform()
  /* Pinned open stays pinned open. AppShell is mounted by each route group's layout, so crossing from Leads to
     Settings or Qanvast Ops remounted the rail and dropped the choice (user 2026-08-31). `animate` keeps the width
     transition for the viewer's own toggle and suppresses it on load, so a remembered rail never plays an entrance. */
  const [pinned, setExpanded, animate] = useFlagPref('om.rail.expanded', false)
  /* (REG-330) Tablet-and-down the rail is collapsed whatever the preference remembers: it neither expands nor collapses
     there, and the saved choice simply resumes at ≥1025. */
  const tabletDown = useMediaQuery(TABLET_DOWN)
  const expanded = pinned && !tabletDown
  const [railHover, setRailHover] = useState(false)     // logo tile → expand icon (795:22541)
  const [toolsOpen, setToolsOpen] = useState(false)     // Tools › the tile grid beside the rail (REG-422)
  const toolsRef = useRef<HTMLButtonElement>(null)
  const [companyOpen, setCompanyOpen] = useState(false)   // Company › the sections panel beside the rail (REG-484)
  const companyRef = useRef<HTMLButtonElement>(null)
  const [viewAsOpen, setViewAsOpen] = useState(false)   // (REG-667) Demo Studio › View as, beside the rail
  const studioRef = useRef<HTMLButtonElement>(null)
  const viewer = team.find((m) => m.isYou) ?? null
  const viewingOther = !!viewer && viewer.id !== 'dane'   // Dane is who the studio is in the base state; anyone else is "Viewing as"
  const [scrolled, setScrolled] = useState(false)   // (REG-329) the rail body has scrolled under the logo → the head takes a shadow

  const onEnter = () => setRailHover(true)
  const onLeave = () => setRailHover(false)
  const togglePin = () => { if (tabletDown) return; setExpanded(!pinned); setRailHover(false) }   // collapse lands on the logo; the expand icon waits for a fresh hover
  // Fixed overlays (review banner strip, snackbar host) follow the rail width through this variable.
  useEffect(() => {
    document.documentElement.style.setProperty('--rail-w', expanded ? '216px' : '52px')
    return () => { document.documentElement.style.removeProperty('--rail-w') }
  }, [expanded])

  // Collapsed rail: every control gets the shared tooltip (789:83369) to its right.
  // Items with an href are real destinations (Leads, Settings) and light up for their route; the rest answer "coming soon".
  const navItem = (it: { icon: string; label: string; href?: string; panel?: string }, extra?: string) => {
    /* (REG-715) G then … — the key shows in the item's tooltip, collapsed or wide, and the ? panel lights it */
    const shortcut = it.href ? GO_BY_HREF[it.href] : it.label === 'Notifications' ? 'go.notifications' : undefined
    const active = (!!it.href && (pathname === it.href || pathname.startsWith(`${it.href}/`))) || (!!it.panel && pathname.startsWith(it.panel))
    const className = extra ? `${styles.item} ${extra}` : styles.item
    const inner = (
      <>
        {it.icon === 'diamond' ? (
          /* The turn lives on a wrapper: a transformed element loses its background-clip: text in WebKit, which showed the gradient box turning (user 2026-08-29: "only the icon should spin") */
          <span className={styles.gemTurn}><Icon name="diamond" size={24} weight={300} fill className={styles.upgradeGlyph} /></span>
        ) : (
          /* Filled marks the route you are ON; every other item stays outlined (user 2026-08-30). Leads used to
             carry `fill: true` outright, so it read as selected from the Qanvast Ops and Settings pages too. */
          <Icon name={it.icon} size={24} weight={300} fill={active} />
        )}
        {(it.href && badges?.[it.href]) || (it.panel && badges?.[it.panel]) ? <span className={styles.badge} aria-hidden>{badges?.[it.href ?? it.panel ?? '']}</span> : null}
        {it.label === 'Notifications' && badges?.notifications ? <span className={styles.badge} aria-hidden>{badges.notifications}</span> : null}   {/* (REG-604) */}
        <span className={styles.label}>{it.label}</span>
      </>
    )
    if (it.panel) {
      return (
        <Tooltip key={it.label} label={it.label} side="right" disabled={expanded || companyOpen}>
          <button ref={companyRef} type="button" className={className} aria-label={badges?.[it.panel] ? `${it.label} (${badges[it.panel]} awaiting approval)` : it.label} data-active={active || companyOpen || undefined}
                  aria-haspopup="menu" aria-expanded={companyOpen} aria-current={active ? 'page' : undefined} onClick={() => setCompanyOpen((o) => !o)}>
            {inner}
          </button>
        </Tooltip>
      )
    }
    if (it.label === 'Tools') {
      return (
        <Tooltip key={it.label} label={it.label} side="right" disabled={expanded || toolsOpen}>
          <button ref={toolsRef} type="button" className={className} aria-label={it.label} data-active={toolsOpen ? 'true' : undefined}
                  aria-haspopup="menu" aria-expanded={toolsOpen} onClick={() => setToolsOpen((o) => !o)}>
            {inner}
          </button>
        </Tooltip>
      )
    }
    return (
      <Tooltip key={it.label} label={it.label} side="right" disabled={expanded && !shortcut} shortcut={shortcut}>
        {it.href ? (
          <Link href={it.href} className={className} data-kb={shortcut} data-active={active || undefined} aria-label={badges?.[it.href] ? `${it.label} (${badges[it.href]} overdue)` : it.label}
                aria-current={active ? 'page' : undefined}>
            {inner}
          </Link>
        ) : (
          <button type="button" className={className} data-kb={shortcut} aria-label={it.label === 'Notifications' && badges?.notifications ? `Notifications (${badges.notifications} unread)` : it.label} onClick={it.label === 'Notifications' ? openNotifications : comingSoon}>   {/* (REG-604) the bell opens the feed */}
            {inner}
          </button>
        )}
      </Tooltip>
    )
  }

  return (
    <div className={styles.wrap} data-pinned={expanded || undefined} data-animate={animate || undefined}>
      <nav className={styles.panel} data-expanded={expanded || undefined} data-pinned={expanded || undefined}
           data-animate={animate || undefined}
           aria-label="Workspace" onMouseEnter={onEnter} onMouseLeave={onLeave}>
        {/* The logo row stays put; everything below it scrolls in .scroller when the viewport is short (REG-329). */}
        <div className={styles.head} data-scrolled={scrolled || undefined}>
          <div className={styles.logoRow} data-expanded={expanded || undefined}>
            {/* Both headers stay mounted and crossfade with the width change — no pop when collapsing / expanding. */}
            <div className={styles.headerExpanded} aria-hidden={!expanded} inert={!expanded}>
              <span className={styles.lockup}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.logo} src="/figma-assets/logo.svg" alt="" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.wordmark} src="/figma-assets/logo-wordmark.svg" alt="OpenMaison" />
              </span>
              <Tooltip label="Collapse navigation" side="bottom" disabled={!expanded}>
                <button type="button" className={styles.pinBtn} onClick={togglePin} aria-label="Collapse navigation" tabIndex={expanded ? 0 : -1}>
                  <Icon name="left_panel_close" size={20} weight={300} />
                </button>
              </Tooltip>
            </div>
            <div className={styles.headerCollapsed} aria-hidden={expanded} inert={expanded}>
              <Tooltip label="Expand navigation" side="right" disabled={expanded || tabletDown}>
                <button type="button" className={styles.logoTile} data-icon={(railHover && !expanded && !tabletDown) || undefined} onClick={togglePin}
                        aria-label="Expand navigation" tabIndex={expanded ? -1 : 0}>
                  {/* Both layers stay mounted so the swap is a crossfade, not a pop. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.logo} src="/figma-assets/logo.svg" alt="" />
                  <span className={styles.expandGlyph} aria-hidden>
                    <Icon name="left_panel_open" size={24} weight={300} />
                  </span>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className={styles.scroller} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}>
        <div className={styles.top}>
          <div className={styles.searchBlock}>
            <Tooltip label="Search" side="right" disabled={expanded} shortcut="search">
              <button type="button" className={styles.searchTile} aria-label="Search" aria-keyshortcuts="Meta+K Control+K" data-search-tile data-kb="search" onClick={openGlobalSearch}>   {/* (REG-709) the studio-wide search; "/" still finds on the page */}
                <Icon name="search" size={expanded ? 20 : 24} weight={300} family={expanded ? 'outlined' : undefined} />
                <span className={styles.searchLabel}>Search</span>
              </button>
            </Tooltip>
            <span className={styles.kbd} aria-hidden>{keysPlain('mod+k', platform)}</span>   {/* (REG-717) Ctrl+K on Windows */}
          </div>
          <div className={styles.items}>{TOP_ITEMS.map((it) => navItem(it))}</div>
        </div>
        <div className={styles.bottom}>
          {/* (REG-701) One slot, two states: Upgrade on Free (as drawn, 779:19690), the studio's AI credits once it pays. */}
          {credits ? (
            <RailCredits initial={credits.summary} gstLine={credits.gstLine} expanded={expanded} tabletDown={tabletDown}
                         itemClass={styles.item} upgradeClass={styles.upgrade} labelClass={styles.label} gemTurnClass={styles.gemTurn} gemClass={styles.upgradeGlyph} />
          ) : navItem({ icon: 'diamond', label: 'Upgrade' }, styles.upgrade)}
          {BOTTOM_ITEMS.map((it) => navItem(it))}
        </div>
        {/* (REG-667) The Demo Studio block opens View as — the member the prototype is being seen as. Anyone but Dane
            puts their avatar on the studio's corner and "Viewing as …" on the second line, so nobody forgets. */}
        <Tooltip label={viewingOther ? `Demo Studio · Viewing as ${viewer.name}` : 'Demo Studio'} side="right" disabled={expanded || viewAsOpen}>
          <button ref={studioRef} type="button" className={styles.avatarRow} aria-haspopup="menu" aria-expanded={viewAsOpen}
                  aria-label={viewingOther ? `Demo Studio, viewing as ${viewer.name}. View as` : 'Demo Studio. View as'} onClick={() => setViewAsOpen((o) => !o)}>
            <span className={styles.avatarWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.avatar} src="/figma-assets/avatar-studio.svg" alt="" />
              {viewingOther ? <span className={styles.viewerMark}><Avatar name={viewer.name} color={viewer.color} size={20} tooltip={false} /></span> : null}
            </span>
            <span className={styles.studio}>
              <span className={styles.studioName}>Demo Studio</span>
              <span className={styles.studioOwner} data-viewing={viewingOther || undefined}>{viewingOther ? `Viewing as ${viewer.name}` : 'Dane Bruce Lee'}</span>
            </span>
          </button>
        </Tooltip>
        </div>
      </nav>
      <ToolsPopover open={toolsOpen} anchor={toolsRef} onClose={() => setToolsOpen(false)} />
      <ViewAsPopover open={viewAsOpen} anchor={studioRef} onClose={() => setViewAsOpen(false)} team={team} />
      <CompanyPopover open={companyOpen} anchor={companyRef} onClose={() => setCompanyOpen(false)} awaiting={badges?.['company:templates'] ?? 0} proposed={badges?.['company:price-book'] ?? 0} asks={badges?.['company:plan'] ?? 0} />
    </div>
  )
}
