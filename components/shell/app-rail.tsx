'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { useComingSoon } from '@/components/om/snackbar'
import { requestSearchFocus } from './search-focus'
import styles from './app-rail.module.css'

/**
 * Side navigation — collapsed rail (52, item tooltips; the logo tile becomes
 * the expand icon on hover — 795:22541) · expanded (216, in the layout —
 * 779:19690). Glyph↔label mapping from screen 01. Only Leads is a real
 * destination in phase 1.
 */
const TOP_ITEMS = [
  { icon: 'dashboard', label: 'Dashboard' },
  { icon: 'business_center', label: 'Projects' },
  { icon: 'people_alt', label: 'Leads', href: '/leads', fill: true },
  { icon: 'storefront', label: 'Marketplace' },
  { icon: 'domain', label: 'Company' },
  { icon: 'account_balance', label: 'Qanvast Ops' },
]
const BOTTOM_ITEMS = [
  { icon: 'apps', label: 'Tools' },
  { icon: 'chat', label: 'Chat' },
  { icon: 'notifications', label: 'Notifications' },
  { icon: 'settings', label: 'Settings', href: '/settings' },
]
export function AppRail() {
  const comingSoon = useComingSoon()
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [railHover, setRailHover] = useState(false)     // logo tile → expand icon (795:22541)

  const onEnter = () => setRailHover(true)
  const onLeave = () => setRailHover(false)
  const togglePin = () => { setExpanded((e) => !e); setRailHover(false) }   // collapse lands on the logo; the expand icon waits for a fresh hover
  // Fixed overlays (review banner strip, snackbar host) follow the rail width through this variable.
  useEffect(() => {
    document.documentElement.style.setProperty('--rail-w', expanded ? '216px' : '52px')
    return () => { document.documentElement.style.removeProperty('--rail-w') }
  }, [expanded])

  // Collapsed rail: every control gets the shared tooltip (789:83369) to its right.
  // Items with an href are real destinations (Leads, Settings) and light up for their route; the rest answer "coming soon".
  const navItem = (it: { icon: string; label: string; href?: string; fill?: boolean }, extra?: string) => {
    const active = !!it.href && (pathname === it.href || pathname.startsWith(`${it.href}/`))
    const className = extra ? `${styles.item} ${extra}` : styles.item
    const inner = (
      <>
        {it.icon === 'diamond' ? (
          /* The turn lives on a wrapper: a transformed element loses its background-clip: text in WebKit, which showed the gradient box turning (user 2026-08-29: "only the icon should spin") */
          <span className={styles.gemTurn}><Icon name="diamond" size={24} weight={300} fill className={styles.upgradeGlyph} /></span>
        ) : (
          <Icon name={it.icon} size={24} weight={300} fill={!!it.fill} />
        )}
        <span className={styles.label}>{it.label}</span>
      </>
    )
    return (
      <Tooltip key={it.label} label={it.label} side="right" disabled={expanded}>
        {it.href ? (
          <Link href={it.href} className={className} data-active={active || undefined} aria-label={it.label}
                aria-current={active ? 'page' : undefined}>
            {inner}
          </Link>
        ) : (
          <button type="button" className={className} aria-label={it.label} onClick={comingSoon}>
            {inner}
          </button>
        )}
      </Tooltip>
    )
  }

  return (
    <div className={styles.wrap} data-pinned={expanded || undefined}>
      <nav className={styles.panel} data-expanded={expanded || undefined} data-pinned={expanded || undefined}
           aria-label="Workspace" onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <div className={styles.top}>
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
              <Tooltip label="Expand navigation" side="right" disabled={expanded}>
                <button type="button" className={styles.logoTile} data-icon={(railHover && !expanded) || undefined} onClick={togglePin}
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
          <div className={styles.searchBlock}>
            <Tooltip label="Search" side="right" disabled={expanded}>
              <button type="button" className={styles.searchTile} aria-label="Search" onClick={requestSearchFocus}>
                <Icon name="search" size={expanded ? 20 : 24} weight={300} family={expanded ? 'outlined' : undefined} />
                <span className={styles.searchLabel}>Search</span>
              </button>
            </Tooltip>
            <span className={styles.kbd} aria-hidden>/</span>
          </div>
          <div className={styles.items}>{TOP_ITEMS.map((it) => navItem(it))}</div>
        </div>
        <div className={styles.bottom}>
          {navItem({ icon: 'diamond', label: 'Upgrade', fill: true }, styles.upgrade)}
          {BOTTOM_ITEMS.map((it) => navItem(it))}
        </div>
        <div className={styles.avatarRow}>
          <Tooltip label="Demo Studio" side="right" disabled={expanded}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.avatar} src="/figma-assets/avatar-studio.svg" alt="Demo Studio" />
          </Tooltip>
          <span className={styles.studio}>
            <span className={styles.studioName}>Demo Studio</span>
            <span className={styles.studioOwner}>Dane Wong</span>
          </span>
        </div>
      </nav>
    </div>
  )
}
