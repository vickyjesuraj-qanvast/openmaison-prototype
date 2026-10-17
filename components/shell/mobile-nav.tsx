'use client'

import { openNotifications } from '@/components/shell/notifications-panel'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { ToolsPopover, onToolsPage, recordHome } from './tools-popover'
import { readFrom } from '@/lib/nav'
import { SOON, railItemOpens } from './app-rail'
import { isAccounting, isMarketing } from '@/lib/settings/roles'
import { companyGroupsFor } from '@/lib/company/sections'
import { Tooltip } from '@/components/om/tooltip'
import { CompanyPopover } from '@/components/company/company-popover'
import { ViewAsPopover } from './view-as-popover'
import { DEMO_CHROME, type StudioChrome } from '@/lib/studios/model'   // (pending modules S31)
import { Avatar } from '@/components/om/avatar'
import type { SessionMember } from '@/lib/db/session'
import type { CreditsChrome } from '@/lib/credits/chrome'
import { CreditsSheet, MoreCredits } from './rail-credits'
import { IconButton } from '@/components/om/icon-button'
import { useComingSoon } from '@/components/om/snackbar'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { openGlobalSearch } from './global-search'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { duration, ease } from '@/lib/motion'
import { badgeCount } from '@/lib/format'   // (pending modules S16) 99+, as 1.0's dock
import styles from './mobile-nav.module.css'

/** The dock's five (1082:24937). Only Leads is a destination; More opens the mocked sheet (REG-298 / REG-300). */
const DOCK = [
  { icon: 'dashboard', label: 'Dashboard', href: '/dashboard' },   /* (pending modules S22) live — 1.0's dock › Home */
  { icon: 'people_alt', label: 'Leads', href: '/leads' },
  { icon: 'apps', label: 'Tools' },
  { icon: 'business_center', label: 'Projects', href: '/projects' },   /* (REG-919, Projects round 1) a destination now */
] as const
/** The More sheet's rows (1082:24995): the rail's remaining destinations, in the mock's order and groups. */
const MORE_TOP = [
  { icon: 'task_alt', label: 'Tasks', href: '/tasks' },   /* (REG-466) the dock keeps the mock's five; Tasks leads the sheet */
  { icon: 'storefront', label: 'Marketplace', href: '/marketplace' },   /* (pending modules S24) live — 1.0's More › Marketplace */
  { icon: 'domain', label: 'Company' },   /* (REG-1360) Finance is a Company section — More › Company › Finance */
  { icon: 'account_balance', label: 'Qanvast Ops', href: '/qanvast-ops' },
] as const
const MORE_BOTTOM = [{ icon: 'settings', label: 'Settings', href: '/settings' }] as const
type NavRow = { icon: string; label: string; href?: string }
/** (parity map, PR-022 · FR-040) Accounting's dock: their work — Finance (where they land), Finance's reports and their tasks — then More
    (Company, Settings, View as). The studio's own dock is the mock's five. *(invented: the dock's three for a bookkeeper)* */
const ACCOUNTING_DOCK: readonly NavRow[] = [
  { icon: 'dashboard', label: 'Dashboard', href: '/dashboard' },   /* (pending modules S22) theirs too — the books' Dashboard, first as the studio's dock has it */
  { icon: 'finance', label: 'Finance', href: '/company/finance' },
  { icon: 'analytics', label: 'Reports', href: '/company/reports/finance' },
  { icon: 'task_alt', label: 'Tasks', href: '/tasks' },
]
/** (S44O — call C6) Marketing's dock: their work — the Dashboard, the Leads (where it is), the lead report and their tasks — then More (Company ›
    Integrations, Settings, View as). *(invented: the dock's four for the lead desk)* */
const MARKETING_DOCK: readonly NavRow[] = [
  { icon: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { icon: 'people_alt', label: 'Leads', href: '/leads' },
  { icon: 'analytics', label: 'Reports', href: '/company/reports/leads' },
  { icon: 'task_alt', label: 'Tasks', href: '/tasks' },
]

/**
 * Mobile chrome — the mocked mobile shell (1082:23305 "Lead Listing", REG-298; earlier system REG-269). At ≤767:
 *   · a 60px top bar (1082:23389): the lockup left; search · chat · notifications (24 Light) and the 36px avatar right.
 *     Search hands focus to the page's search box as the rail tile does; chat, notifications and the avatar are
 *     "coming soon", as their rail tiles are.
 *   · a fixed 70px bottom dock (1082:24937): Dashboard · Leads · Tools · Projects · More — 64×50 columns, the 36px
 *     icon box tinted primary/variant with the filled glyph on the active route, subtitle/xs labels.
 *   · More opens the mocked bottom sheet (1082:24995, REG-300): a 56px "More" head with its close, then the rail's
 *     remaining destinations as One Line rows — Marketplace · Company · Qanvast Ops, a rule, Settings. It slides up on
 *     the modal timing; the scrim, Esc and the close dismiss it.
 * Nothing here renders ≥768 (CSS) so tablet and desktop are untouched. The sheet keeps the dialog contract
 * (REG-286: focus in, Tab cycles, focus back on close), the scroll lock (REG-287) and the Esc layer.
 */
export function MobileChrome({ team = [], credits = null, badges, studio = DEMO_CHROME }: { team?: SessionMember[]; credits?: CreditsChrome | null
  /** (UX audit V3) The rail's counts (`railBadges`): the bell's unread, the Tasks overdue, Company's waiting asks — a phone shows them too. */
  badges?: Record<string, number>
  /** (pending modules S31) the studio this prototype has open — who it is in its base state, and the Studios group of the You sheet */
  studio?: StudioChrome } = {}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const comingSoon = useComingSoon()
  const [toolsOpen, setToolsOpen] = useState(false)   // (REG-422) Tools › the tile sheet
  const [companyOpen, setCompanyOpen] = useState(false)   // (REG-646, settings parity Q-11) More › Company — the rail's panel as a bottom sheet
  const [viewAsOpen, setViewAsOpen] = useState(false)   // (REG-667) More › View as — Demo Studio's menu as a bottom sheet
  const [youOpen, setYouOpen] = useState(false)   // (pending modules S01) the top bar's avatar — you, Your profile, View as
  const [creditsOpen, setCreditsOpen] = useState(false)   // (REG-701, Q-39) More › the credits card as a sheet
  const viewer = team.find((m) => m.isYou) ?? null
  const role = viewer?.role ?? null
  const desk = isMarketing(role)   // (S44O — call C6) as Marketing's: the leads' work only
  const books = isAccounting(role) || desk   // (parity map, PR-022) Accounting's phone shows their work only
  const dock: readonly NavRow[] = desk ? MARKETING_DOCK : books ? ACCOUNTING_DOCK : DOCK
  const moreTop: readonly NavRow[] = (MORE_TOP as readonly NavRow[]).filter((it) => railItemOpens(role, it.label === 'Company' ? { ...it, panel: '/company' } : it) && !(books && dock.some((d) => d.href === it.href)))
  const pathname = usePathname()
  /* (REG-287) The sheet only exists ≤767 — leaving mobile closes it (render-phase adjust on the house hook). */
  const mobile = useMediaQuery(MOBILE)
  if (open && !mobile) setOpen(false)

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const home = recordHome(pathname, readFrom(useSearchParams().get('from')))   // (S42 audit C-24) a meeting opened from its lead lights Leads
  /* (UX audit V3) what each row inside More counts, and whether More wears its dot */
  const unread = badges?.notifications ?? 0
  const countOf = (label: string) => (label === 'Tasks' ? badges?.['/tasks'] ?? 0 : label === 'Company' ? badges?.['/company'] ?? 0 : 0)
  const counts = { Tasks: books ? 0 : countOf('Tasks'), Company: countOf('Company') }   // (parity map, PR-022) Accounting's Tasks count rides the dock
  const moreHas = counts.Tasks + counts.Company > 0
  const countWords = (label: string, n: number) => (label === 'Tasks' ? `${n} overdue` : `${n} waiting`)
  /** One Line row (1082:25102): glyph 20 secondary · body/m label. Destinations navigate and close; the rest are coming soon. */
  const moreItem = (it: { icon: string; label: string; href?: string }) => {
    const n = countOf(it.label)
    const inner = (
      <>
        <span className={styles.sheetIcon}><Icon name={it.icon} size={20} /></span>
        <span className={styles.sheetLabel}>{it.label}</span>
        {/* (UX audit V3) the rail's count, on the row */}
        {n > 0 ? <span className={styles.rowCount} aria-hidden>{badgeCount(n)}</span> : null}
        {/* (UX audit V6) a dead end wears the Company panel's "Soon" tag */}
        {!it.href && it.label !== 'Company' ? <span className={styles.soon} aria-hidden>Soon</span> : null}
      </>
    )
    const label = n > 0 ? `${it.label} (${countWords(it.label, n)})` : !it.href && it.label !== 'Company' ? `${it.label}${SOON}` : undefined
    return it.href ? (
      <Link key={it.label} href={it.href} className={styles.sheetItem} aria-current={active(it.href) ? 'page' : undefined} aria-label={label} onClick={close}>
        {inner}
      </Link>
    ) : it.label === 'Company' ? (
      <button key={it.label} type="button" className={styles.sheetItem} aria-haspopup="menu" aria-label={label} onClick={() => { close(); setCompanyOpen(true) }}>{inner}</button>
    ) : (
      <button key={it.label} type="button" className={styles.sheetItem} aria-label={label} onClick={() => { close(); comingSoon() }}>{inner}</button>
    )
  }

  return (
    <>
      <header className={styles.bar}>
        <span className={styles.lockup}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.logo} src="/figma-assets/logo.svg" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.wordmark} src="/figma-assets/logo-wordmark.svg" alt="OpenMaison" />
        </span>
        <div className={styles.barActions}>
          <button type="button" className={styles.barIcon} aria-label="Search" onClick={openGlobalSearch}>   {/* (REG-709) the studio-wide search, as a sheet */}
            <Icon name="search" size={24} weight={300} />
          </button>
          {/* (gaps build H, H-Q11) the studio's conversations with its clients — the rail's Messages, live (one-home N-08: one word, "Messages") ·
              (parity map, PR-022) never a bookkeeper's */}
          {books ? null : <Link href="/chat" className={styles.barIcon} aria-label={badges?.['/chat'] ? `Messages (${badges['/chat']} unread)` : 'Messages'}>
            <Icon name="chat" size={24} weight={300} />
            {badges?.['/chat'] ? <span className={styles.barBadge} aria-hidden>{badgeCount(badges['/chat'])}</span> : null}
          </Link>}
          <button type="button" className={styles.barIcon} aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'} onClick={openNotifications}>   {/* (REG-604) */}
            <Icon name="notifications" size={24} weight={300} />
            {unread ? <span className={styles.barBadge} aria-hidden>{badgeCount(unread)}</span> : null}   {/* (UX audit V3) the rail's bell count */}
          </button>
          {/* (pending modules S01 — the held "Coming soon" avatar; 1.0's profile menu) the member you are, as every avatar draws them (their own photo,
              else their tinted initial); it opens the studio block's menu as a sheet: Your profile, then View as */}
          <button type="button" className={styles.avatarBtn} aria-label={`You — ${viewer && viewer.id !== studio.baseId ? viewer.name : studio.owner}`} aria-haspopup="menu" aria-expanded={youOpen} onClick={() => setYouOpen(true)} data-testid="phone-avatar">
            {viewer ? <Avatar name={viewer.name} color={viewer.color} size={36} tooltip={false} /> : null}
          </button>
        </div>
      </header>

      <nav className={styles.dock} aria-label="Primary">
        {dock.map((it) => {
          /* (UX audit V7) Tools lights on its own pages, as it does on the rail */
          const on = home ? it.href === home : it.href ? active(it.href) : it.label === 'Tools' && onToolsPage(pathname)   // (S42 audit C-24)
          const n = it.href ? badges?.[it.href] ?? 0 : 0   /* (REG-919) the rail's count on the dock — Projects' projects that need attention */
          const inner = (
            <>
              <span className={styles.dockIcon}><Icon name={it.icon} size={24} weight={300} fill={on} />{n > 0 ? <span className={styles.dockBadge} aria-hidden>{badgeCount(n)}</span> : null}</span>
              <span className={styles.dockLabel}>{it.label}</span>
            </>
          )
          return it.href ? (
            <Link key={it.label} href={n > 0 && it.href === '/projects' ? '/projects?scope=attention' : it.href} className={styles.dockItem} data-active={on || undefined}
                  aria-current={on ? 'page' : undefined} aria-label={n > 0 ? `${it.label} (${n} ${n === 1 ? 'needs' : 'need'} attention)` : undefined}>
              {inner}
            </Link>
          ) : it.label === 'Tools' ? (
            /* (REG-422) Tools opens its sheet (tools-popover.tsx) — the rail item's phone form. */
            <button key={it.label} type="button" className={styles.dockItem} data-active={toolsOpen || on || undefined} aria-current={on ? 'page' : undefined} aria-haspopup="menu" aria-expanded={toolsOpen} onClick={() => setToolsOpen(true)}>{inner}</button>
          ) : (
            /* (UX audit V6) the dock's dead ends say so — the tooltip, the name — and still answer "Coming soon" */
            <Tooltip key={it.label} label={`${it.label}${SOON}`} side="top">
              <button type="button" className={styles.dockItem} aria-label={`${it.label}${SOON}`} data-soon="" onClick={comingSoon}>{inner}</button>
            </Tooltip>
          )
        })}
        <ToolsPopover open={toolsOpen} anchor={null} onClose={() => setToolsOpen(false)} />
        {/* (REG-899, Dane UAT 12.04) a sheet opened from More leads back to it */}
        <CompanyPopover open={companyOpen} anchor={null} onClose={() => setCompanyOpen(false)} onBack={() => { setCompanyOpen(false); setOpen(true) }} groups={companyGroupsFor(role)} awaiting={badges?.['company:templates'] ?? 0} proposed={badges?.['company:price-book'] ?? 0} asks={badges?.['company:plan'] ?? 0} money={badges?.['company:finance'] ?? 0} />
        <ViewAsPopover open={viewAsOpen} anchor={null} onClose={() => setViewAsOpen(false)} onBack={() => { setViewAsOpen(false); setOpen(true) }} team={team} studios={studio.studios} />
        <ViewAsPopover open={youOpen} anchor={null} onClose={() => setYouOpen(false)} team={team} profile studios={studio.studios} />
        {credits && !books ? <CreditsSheet initial={credits.summary} gstLine={credits.gstLine} open={creditsOpen} onClose={() => setCreditsOpen(false)} onBack={() => { setCreditsOpen(false); setOpen(true) }} /> : null}
        <button type="button" className={styles.dockItem} data-active={open || undefined}
                aria-label={moreHas ? `More (${[counts.Tasks ? `Tasks ${countWords('Tasks', counts.Tasks)}` : null, counts.Company ? `Company ${countWords('Company', counts.Company)}` : null].filter(Boolean).join(', ')})` : 'More'} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          <span className={styles.dockIcon}><Icon name="more_horiz" size={24} weight={300} />{moreHas ? <span className={styles.moreDot} aria-hidden /> : null}</span>   {/* (UX audit V3) something inside counts */}
          <span className={styles.dockLabel}>More</span>
        </button>
      </nav>

      <MoreSheet open={open} onClose={close}>
        {/* (REG-701, Q-39) The rail's Upgrade slot on a phone: Upgrade on Free, the studio's AI credits once it pays. */}
        {credits && !books ? (   /* (parity map, FB-114) Accounting has no AI tool — no AI credits */
          <div className={styles.sheetGroup}>
            <MoreCredits initial={credits.summary} onOpen={() => { close(); setCreditsOpen(true) }} onUpgrade={close}
                         rowClass={styles.sheetItem} iconClass={styles.sheetIcon} labelClass={styles.sheetLabel} metaClass={styles.sheetMeta} />
          </div>
        ) : null}
        <div className={styles.sheetGroup}>{moreTop.map(moreItem)}</div>
        <hr className={styles.sheetRule} />
        <div className={styles.sheetGroup}>{MORE_BOTTOM.map(moreItem)}</div>
        {/* (REG-667) Demo Studio › View as — the rail's block has no phone form, so its menu lives here. */}
        <hr className={styles.sheetRule} />
        <div className={styles.sheetGroup}>
          <button type="button" className={styles.sheetItem} aria-haspopup="menu" onClick={() => { close(); setViewAsOpen(true) }}>
            <span className={styles.sheetIcon}><Icon name="swap_horiz" size={20} /></span>
            <span className={styles.sheetLabel}>View as</span>
            {viewer ? <span className={styles.sheetMeta}>{viewer.name}</span> : null}
          </button>
        </div>
      </MoreSheet>
    </>
  )
}

/**
 * (REG-1050) The More sheet (1082:24995, REG-300) on its own, so the client portal's phone bar opens the very same one: the layer over the
 * dock, the scrim, the sheet rising on the modal timing, the 56 "More" head with its close, and the rows' list (`.sheetList`) — the dialog
 * contract (REG-286), the scroll lock (REG-287) and the Esc layer with it. The rows are the host's (`.sheetItem` · `.sheetIcon` · `.sheetLabel`).
 */
export function MoreSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const layer = useRef<HTMLDivElement>(null)
  useScrollLock(open)
  useEscapeLayer(open, layer, onClose)
  useDialogFocus(open, layer)
  return (
    <AnimatePresence>
      {open ? (
        <div ref={layer} className={styles.layer} style={{ outline: 'none' }}
             role="dialog" aria-modal="true" aria-label="More" tabIndex={-1}>
          <motion.button
            type="button" className={styles.scrim} aria-label="Close More"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: duration.modal, ease: ease.standard } }}
            exit={{ opacity: 0, transition: { duration: duration.modalExit, ease: ease.standard } }}
            onClick={onClose}
          />
          <motion.div
            className={styles.sheet}
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: { duration: duration.modal, ease: ease.decelerate } }}
            exit={{ y: '100%', transition: { duration: duration.modalExit, ease: ease.standard } }}
          >
            <div className={styles.sheetHead}>
              <h2 className={styles.sheetTitle}>More</h2>
              <IconButton icon="close" label="Close" variant="bare" size={24} iconSize={24} onClick={onClose} />
            </div>
            <div className={styles.sheetList}>{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
