'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { ScrollPagers } from '@/components/om/scroll-pagers'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { signOut } from '@/app/portal/actions'
import { MoreSheet } from '@/components/shell/mobile-nav'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { PORTAL_TABS, portalBar, portalTabHref, type NeedItem } from '@/lib/portal/model'
import { NEED_SECTION } from '@/lib/portal/sections'
import type { PortalLook } from '@/lib/portal/queries'
import { StudioMark, brandStyle } from './studio-mark'
import { PortalBell } from './bell'
import { PortalFoot } from './portal-foot'
import styles from './portal.module.css'

/**
 * (Projects round 4a, boards 1 · 7) The portal's frame: the studio's bar (its mark and name — never OpenMaison's, M bottom line), the
 * sections in the bar at a desk and as the bottom bar on a phone (one list, `PORTAL_TABS` — absent until built), who is signed in and Sign
 * out. In a studio's preview a dark strip on top says so and closes it; nothing in a preview is saved as the client's.
 * (r4b) The sections prefetch only their ghost (the default for a page that reads the database): a full prefetch kept a tab's data for five
 * minutes, so a stage just confirmed or an update just posted read stale on the next press — each press now reads the page fresh.
 */
export function PortalFrame({ look, slug, tab, visitor, paused = false, needs = [], children }: {
  look: PortalLook
  slug: string
  tab: string
  visitor: { name: string; preview: boolean; memberName: string | null; /** (fix-G, G-17) the set-up page's phone frame: no studio strip */ frame?: boolean }
  paused?: boolean
  /** (REG-1050) What needs the client (`fetchPortalData`'s), so More can say a section inside it waits on them. */
  needs?: readonly Pick<NeedItem, 'kind'>[]
  children: ReactNode
}) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [leaving, setLeaving] = useState(false)
  /* (Projects round 9, Q-45) a section the studio switched off has no tab — the Money tab round 6 adds included (its key is its section's) */
  const tabs = PORTAL_TABS.filter((t) => !(look.hidden as readonly string[]).includes(t.key))
  /* (REG-1050) the phone's bar: four tabs and More, as the studio's own dock; More's rows count what needs the client there, and More wears
     the dock's dot when one does (MobileChrome's moreDot / rowCount, composed) */
  const { bar, more } = portalBar(tabs)
  /* (fix-F, F-43) no bar when Home is the only place; (F-46) board 1's phone bar is the mark, the name and the bell — Sign out lives in More,
     so More is there whenever the bar is (and Sign out stays in the header only when there is no bar) */
  const dock = bar.length + more.length > 1
  const [moreOpen, setMoreOpen] = useState(false)
  const mobile = useMediaQuery(MOBILE)
  if (moreOpen && !mobile) setMoreOpen(false)   // the sheet only exists on a phone, as the studio's More (render-phase adjust)
  /* (the calm UI build 2026-10-27, 3-36 · T-16) at a desk the bar draws the phone's five — Home · Schedule · Updates · Payments and More ▾ — the
     rest (Choices · Designs · Floor plan · Messages · Issues · About · Files) one press away in the house menu, each with what waits on the
     client there, as the phone's More sheet; More reads as the place you are when one of them is */
  const [deskMore, setDeskMore] = useState(false)
  if (deskMore && mobile) setDeskMore(false)
  const deskMoreRef = useRef<HTMLButtonElement>(null)
  /* (responsive audit 2026-10-23, W3-12) at 768–1024 the sections scroll in their own row (fix-F, F-02) — the one the client is on is brought
     to its middle, instead of sitting past the edge ("Mess…" on a phone held sideways, About and Files out of sight upright); again when the
     row's width settles. A row with room (a desk) never moves. */
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const centre = () => {
      const here = nav.querySelector<HTMLElement>('[aria-current="page"]')
      if (!here || nav.scrollWidth <= nav.clientWidth + 1) return
      const c = here.getBoundingClientRect(), r = nav.getBoundingClientRect()
      nav.scrollTo({ left: nav.scrollLeft + (c.left + c.width / 2) - (r.left + r.width / 2), behavior: 'instant' })
    }
    centre()
    const ro = new ResizeObserver(centre); ro.observe(nav)
    return () => ro.disconnect()
  }, [tab])
  const waiting = (key: string) => needs.filter((n) => NEED_SECTION[n.kind] === key).length
  const moreWaiting = more.reduce((n, t) => n + waiting(t.key), 0)
  const inMore = more.some((t) => t.key === tab)
  const leave = async () => {
    setLeaving(true)
    try {
      const r = await signOut(slug)
      if (visitor.preview) { window.close(); router.replace(r.to); return }   // a preview opened in its own tab closes it; else the sign-in page
      router.replace(r.to)
    } catch {
      setLeaving(false)
      snackbar({ message: visitor.preview ? 'Couldn’t close the preview — please try again' : 'Couldn’t sign out — please try again' })
    }
  }
  return (
    <div className={styles.page} style={brandStyle(look)} data-testid="portal" data-preview={visitor.preview || undefined}>
      {visitor.preview && !visitor.frame ? (
        <div className={styles.previewBar} role="status" data-testid="portal-preview-bar">
          <Icon name="visibility" size={20} weight={300} />
          <span>{`You’re seeing ${visitor.name}’s page as they see it. Nothing here is saved or recorded as theirs.`}{look.closed ? ' OpenMaison has closed the portal for now — clients see a notice instead.' : paused ? ' The portal is paused — clients see a notice instead.' : ''}</span>   {/* (parity map, CP-148) */}
          <button type="button" className={styles.textButton} onClick={leave} disabled={leaving} data-testid="portal-close-preview">Close preview</button>
        </div>
      ) : null}
      <header className={styles.top} data-dock={dock || undefined}>
        <span className={styles.brand}>
          <StudioMark look={look} />
          {/* (Projects round 9, Q-44) the studio's welcome line under its name, on the home */}
          {tab === 'home' && look.welcome ? (
            <span className={styles.brandText}><span className={styles.studio}>{look.studio}</span><span className={styles.welcome} data-testid="portal-welcome">{look.welcome}</span></span>
          ) : <span className={styles.studio}>{look.studio}</span>}
        </span>
        {/* (held calls 2026-10-24, W3-14) the row says it scrolls: the house ChipRail's edge fades (ScrollPagers) at whichever end has more —
            a row with room (a desk) shows none */}
        <span className={styles.navWrap}>
          <nav ref={navRef} className={styles.nav} aria-label="Sections" data-testid="portal-nav">
            {bar.map((t) => (
              <Link key={t.key} href={portalTabHref(slug, t)} className={styles.navLink} data-key={t.key} aria-current={t.key === tab ? 'page' : undefined}>{t.label}</Link>
            ))}
            {more.length ? (
              <button ref={deskMoreRef} type="button" className={`${styles.navLink} ${styles.navMore}`} data-key="more" data-testid="portal-nav-more" data-active={inMore || undefined}
                      aria-haspopup="menu" aria-expanded={deskMore} aria-label={moreWaiting ? `More (${moreWaiting} waiting on you)` : 'More'} onClick={() => setDeskMore((o) => !o)}>
                {inMore ? more.find((t) => t.key === tab)?.label ?? 'More' : 'More'}<Icon name="expand_more" size={20} />
              </button>
            ) : null}
          </nav>
          <ScrollPagers scrollRef={navRef} />
        </span>
        <span className={styles.who}>
          <PortalBell slug={slug} preview={visitor.preview} studio={look.studio} brand={look.colour} />
          <span className={styles.whoName}>{visitor.name}</span>
          {visitor.preview ? null : <button type="button" className={`${styles.textButton} ${styles.signOutTop}`} onClick={leave} disabled={leaving} data-testid="portal-sign-out">Sign out</button>}
        </span>
      </header>
      <main className={styles.main} data-dock={dock || undefined}>
        {children}
        {/* (pending modules S13) the studio's Privacy · Terms · Contact — once it has linked them */}
        <PortalFoot links={look.links} studio={look.studio} />
      </main>
      {dock ? <nav className={styles.dock} aria-label="Sections" data-testid="portal-dock">
        {bar.map((t) => (
          <Link key={t.key} href={portalTabHref(slug, t)} className={styles.dockLink} data-key={t.key} data-active={t.key === tab || undefined} aria-current={t.key === tab ? 'page' : undefined}>
            <span className={styles.dockIcon}><Icon name={t.icon} size={24} weight={300} fill={t.key === tab} /></span>
            <span className={styles.dockLabel}>{t.label}</span>
          </Link>
        ))}
        {dock ? (
          <button type="button" className={styles.dockLink} data-key="more" data-testid="portal-more" data-active={moreOpen || inMore || undefined}
                  aria-label={moreWaiting ? `More (${moreWaiting} waiting on you)` : 'More'} aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}>
            <span className={styles.dockIcon}><Icon name="more_horiz" size={24} weight={300} />{moreWaiting ? <span className={styles.moreDot} aria-hidden data-testid="portal-more-dot" /> : null}</span>
            <span className={styles.dockLabel}>More</span>
          </button>
        ) : null}
      </nav> : null}
      <PortalMenu open={deskMore && !mobile} anchor={deskMoreRef} onClose={() => setDeskMore(false)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="More">
        <div className={styles.menuRow} data-testid="portal-nav-more-menu">
          {more.map((t) => {
            const n = waiting(t.key)
            return (
              <span key={t.key} className={styles.menuRow} data-key={t.key} data-testid="portal-nav-more-row">
                <DropdownItem onSelect={() => { setDeskMore(false); router.push(portalTabHref(slug, t)) }} meta={n || undefined}>{t.label}</DropdownItem>
              </span>
            )
          })}
        </div>
      </PortalMenu>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        <div className={styles.moreGroup} data-testid="portal-more-sheet">
          {more.map((t) => {
            const n = waiting(t.key)
            return (
              <Link key={t.key} href={portalTabHref(slug, t)} className={styles.moreItem} data-key={t.key} aria-current={t.key === tab ? 'page' : undefined}
                    aria-label={n ? `${t.label} (${n} waiting on you)` : undefined} onClick={() => setMoreOpen(false)}>
                <span className={styles.moreIcon}><Icon name={t.icon} size={20} /></span>
                <span className={styles.moreLabel}>{t.label}</span>
                {n ? <span className={styles.moreCount} aria-hidden>{n}</span> : null}
              </Link>
            )
          })}
          {/* (fix-F, F-46) Sign out, here on a phone (the bar is board 1's: the mark, the name, the bell) */}
          {visitor.preview ? null : (
            <>
              {more.length ? <hr className={styles.moreRule} /> : null}
              <button type="button" className={styles.moreItem} onClick={() => { setMoreOpen(false); void leave() }} disabled={leaving} data-testid="portal-more-sign-out">
                <span className={styles.moreIcon}><Icon name="account_circle" size={20} /></span>
                <span className={styles.moreLabel}>Sign out</span>
                <span className={styles.moreMeta}>{visitor.name}</span>
              </button>
            </>
          )}
        </div>
      </MoreSheet>
    </div>
  )
}
