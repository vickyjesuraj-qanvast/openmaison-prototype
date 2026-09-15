'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { ToolsPopover } from './tools-popover'
import { IconButton } from '@/components/om/icon-button'
import { useComingSoon } from '@/components/om/snackbar'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { requestSearchFocus } from './search-focus'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { duration, ease } from '@/lib/motion'
import styles from './mobile-nav.module.css'

/** The dock's five (1082:24937). Only Leads is a destination; More opens the mocked sheet (REG-298 / REG-300). */
const DOCK = [
  { icon: 'dashboard', label: 'Dashboard' },
  { icon: 'people_alt', label: 'Leads', href: '/leads' },
  { icon: 'apps', label: 'Tools' },
  { icon: 'business_center', label: 'Projects' },
] as const
/** The More sheet's rows (1082:24995): the rail's remaining destinations, in the mock's order and groups. */
const MORE_TOP = [
  { icon: 'storefront', label: 'Marketplace' },
  { icon: 'domain', label: 'Company' },
  { icon: 'account_balance', label: 'Qanvast Ops', href: '/qanvast-ops' },
] as const
const MORE_BOTTOM = [{ icon: 'settings', label: 'Settings', href: '/settings' }] as const

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
export function MobileChrome() {
  const [open, setOpen] = useState(false)
  const layer = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const comingSoon = useComingSoon()
  const [toolsOpen, setToolsOpen] = useState(false)   // (REG-422) Tools › the tile sheet
  const pathname = usePathname()
  /* (REG-287) The sheet only exists ≤767 — leaving mobile closes it (render-phase adjust on the house hook). */
  const mobile = useMediaQuery(MOBILE)
  if (open && !mobile) setOpen(false)
  useScrollLock(open)
  useEscapeLayer(open, layer, close)
  useDialogFocus(open, layer)

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  /** One Line row (1082:25102): glyph 20 secondary · body/m label. Destinations navigate and close; the rest are coming soon. */
  const moreItem = (it: { icon: string; label: string; href?: string }) => {
    const inner = (
      <>
        <span className={styles.sheetIcon}><Icon name={it.icon} size={20} /></span>
        <span className={styles.sheetLabel}>{it.label}</span>
      </>
    )
    return it.href ? (
      <Link key={it.label} href={it.href} className={styles.sheetItem} aria-current={active(it.href) ? 'page' : undefined} onClick={close}>
        {inner}
      </Link>
    ) : (
      <button key={it.label} type="button" className={styles.sheetItem} onClick={() => { close(); comingSoon() }}>{inner}</button>
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
          <button type="button" className={styles.barIcon} aria-label="Search" onClick={requestSearchFocus}>
            <Icon name="search" size={24} weight={300} />
          </button>
          <button type="button" className={styles.barIcon} aria-label="Chat" onClick={comingSoon}>
            <Icon name="chat" size={24} weight={300} />
          </button>
          <button type="button" className={styles.barIcon} aria-label="Notifications" onClick={comingSoon}>
            <Icon name="notifications" size={24} weight={300} />
          </button>
          <button type="button" className={styles.avatarBtn} aria-label="Dane Bruce Lee" onClick={comingSoon}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/figma-assets/avatar-user.png" alt="" />
          </button>
        </div>
      </header>

      <nav className={styles.dock} aria-label="Primary">
        {DOCK.map((it) => {
          const on = 'href' in it && active(it.href)
          const inner = (
            <>
              <span className={styles.dockIcon}><Icon name={it.icon} size={24} weight={300} fill={on} /></span>
              <span className={styles.dockLabel}>{it.label}</span>
            </>
          )
          return 'href' in it ? (
            <Link key={it.label} href={it.href} className={styles.dockItem} data-active={on || undefined}
                  aria-current={on ? 'page' : undefined}>
              {inner}
            </Link>
          ) : it.label === 'Tools' ? (
            /* (REG-422) Tools opens its sheet (tools-popover.tsx) — the rail item's phone form. */
            <button key={it.label} type="button" className={styles.dockItem} data-active={toolsOpen || undefined} aria-haspopup="menu" aria-expanded={toolsOpen} onClick={() => setToolsOpen(true)}>{inner}</button>
          ) : (
            <button key={it.label} type="button" className={styles.dockItem} onClick={comingSoon}>{inner}</button>
          )
        })}
        <ToolsPopover open={toolsOpen} anchor={null} onClose={() => setToolsOpen(false)} />
        <button type="button" className={styles.dockItem} data-active={open || undefined}
                aria-label="More" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          <span className={styles.dockIcon}><Icon name="more_horiz" size={24} weight={300} /></span>
          <span className={styles.dockLabel}>More</span>
        </button>
      </nav>

      <AnimatePresence>
        {open ? (
          <div ref={layer} className={styles.layer} style={{ outline: 'none' }}
               role="dialog" aria-modal="true" aria-label="More" tabIndex={-1}>
            <motion.button
              type="button" className={styles.scrim} aria-label="Close More"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: duration.modal, ease: ease.standard } }}
              exit={{ opacity: 0, transition: { duration: duration.modalExit, ease: ease.standard } }}
              onClick={close}
            />
            <motion.div
              className={styles.sheet}
              initial={{ y: '100%' }}
              animate={{ y: 0, transition: { duration: duration.modal, ease: ease.decelerate } }}
              exit={{ y: '100%', transition: { duration: duration.modalExit, ease: ease.standard } }}
            >
              <div className={styles.sheetHead}>
                <h2 className={styles.sheetTitle}>More</h2>
                <IconButton icon="close" label="Close" variant="bare" size={24} iconSize={24} onClick={close} />
              </div>
              <div className={styles.sheetList}>
                <div className={styles.sheetGroup}>{MORE_TOP.map(moreItem)}</div>
                <hr className={styles.sheetRule} />
                <div className={styles.sheetGroup}>{MORE_BOTTOM.map(moreItem)}</div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
