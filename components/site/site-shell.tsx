'use client'

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { Sheet } from '@/components/om/sheet'
import { SnackbarProvider } from '@/components/om/snackbar'
import { PILLARS, PILLAR_ORDER, modulesByPillar } from '@/lib/site/platform'
import { PRICING_PATH, PRIMARY_LINKS, SIGN_IN, site } from '@/lib/site/model'
import { siteMotion } from '@/lib/site/motion'
import { BookDemoProvider, useBookDemo } from './book-demo'
import { Tile } from './primitives'
import { SiteFooter } from './site-footer'
import s from './site-shell.module.css'

/*
 * (pending modules S35 — 1.0's marketing layout, marketing-nav.tsx, intro-overlay.tsx) The website's frame: the top bar (the wordmark, Platform ▾
 * with its three-pillar panel, Story, Resources; Sign in and Book a demo), the phone's bottom bar (Home · Platform · the raised Demo · Resources ·
 * Story) and its Platform sheet, the footer, Back to top, and the first visit's welcome on the home page. The studio app's shell never appears
 * here — this is OpenMaison's own site; its one door into the app is Sign in (and the footnotes' Start your studio).
 */

export function SiteShell({ children, year }: { children: ReactNode; /** the footer's ©, read on the server */ year: number }) {
  return (
    <SnackbarProvider>
      <BookDemoProvider>
        <Suspense fallback={null}><OpenOnBook /></Suspense>
        <a href="#main-content" className={s.skip}>Skip to content</a>
        <IntroOverlay />
        <SiteNav />
        <main id="main-content" className={s.main}>{children}</main>
        <SiteFooter year={year} />
        <PhoneBar />
        <BackToTop />
      </BookDemoProvider>
    </SnackbarProvider>
  )
}

/** `?book` on any page opens Book a demo (1.0's QR codes). Its own boundary, so the page around it stays static. */
function OpenOnBook() {
  const params = useSearchParams()
  const open = useBookDemo()
  const want = params.has('book')
  useEffect(() => { if (want) open() }, [want, open])
  return null
}

/** The bar hides on a scroll down and comes back on a scroll up, near the top, at the page's end or when the scroll pauses (1.0's). */
function useScrollState() {
  const [state, setState] = useState({ scrolled: false, hidden: false, nearEnd: false })
  useEffect(() => {
    let last = window.scrollY
    let idle: number | undefined
    const read = () => {
      const y = window.scrollY
      const h = document.documentElement.scrollHeight
      const atEnd = y + window.innerHeight >= h - 80
      const delta = y - last
      setState((p) => {
        const hidden = y < 80 || atEnd ? false : Math.abs(delta) > 6 ? delta > 0 : p.hidden
        const nearEnd = y + window.innerHeight >= h - 240 && y > window.innerHeight * 1.5
        return p.scrolled === y > 24 && p.hidden === hidden && p.nearEnd === nearEnd ? p : { scrolled: y > 24, hidden, nearEnd }
      })
      last = y
      window.clearTimeout(idle)
      idle = window.setTimeout(() => setState((p) => (p.hidden ? { ...p, hidden: false } : p)), 800)
    }
    read()
    window.addEventListener('scroll', read, { passive: true })
    return () => { window.removeEventListener('scroll', read); window.clearTimeout(idle) }
  }, [])
  return state
}

function Logo({ className }: { className?: string }) {
  return (
    <Link href={site('/')} className={className ? `${s.logo} ${className}` : s.logo} aria-label="OpenMaison, home" data-site-logo="">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.mark} src="/figma-assets/logo.svg" alt="" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.wordmark} src="/figma-assets/logo-wordmark.svg" alt="OpenMaison" />
    </Link>
  )
}

function SiteNav() {
  const path = usePathname()
  const book = useBookDemo()
  const { scrolled, hidden } = useScrollState()
  const [mega, setMega] = useState(false)
  const closer = useRef<number | undefined>(undefined)
  const trigger = useRef<HTMLButtonElement>(null)
  /* a navigation closes the panel — the render-phase adjust, never an effect's setState */
  const [at, setAt] = useState(path)
  if (path !== at) { setAt(path); setMega(false) }
  /* hover opens it after 120 ms (the brief's), a press toggles it at once — so a press that follows the pointer in never closes what the hover
     just opened (1.0 opened on the hover's first frame, and the click that came with it shut it again) */
  const openMega = useCallback(() => { window.clearTimeout(closer.current); closer.current = window.setTimeout(() => setMega(true), 120) }, [])
  const keepMega = useCallback(() => { window.clearTimeout(closer.current) }, [])
  const later = useCallback(() => { window.clearTimeout(closer.current); closer.current = window.setTimeout(() => setMega(false), 200) }, [])
  useEffect(() => {
    if (!mega) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMega(false); trigger.current?.focus() } }
    const away = (e: PointerEvent) => { const t = e.target as Node; if (!(t instanceof Node) || document.querySelector('[data-site-mega]')?.contains(t) || trigger.current?.contains(t)) return; setMega(false) }
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', away)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', away) }
  }, [mega])
  const onPlatform = path.startsWith(site('/platform'))
  return (
    <header className={s.bar} data-scrolled={scrolled || mega || undefined} data-hidden={(hidden && !mega) || undefined} data-testid="site-bar">
      <div className={s.barInner}>
        <Logo />
        <nav className={s.links} aria-label="Primary">
          <div onMouseEnter={openMega} onMouseLeave={later}>
            <button ref={trigger} type="button" className={s.navLink} data-active={mega || onPlatform || undefined} aria-expanded={mega} aria-controls="site-mega"
                    onClick={() => { window.clearTimeout(closer.current); setMega((v) => !v) }} data-testid="site-platform">
              Platform<Icon name="keyboard_arrow_down" size={18} className={s.chev} />
            </button>
          </div>
          {PRIMARY_LINKS.map((l) => <Link key={l.href} href={l.href} className={s.navLink} data-active={path.startsWith(l.href) || undefined} aria-current={path.startsWith(l.href) ? 'page' : undefined}>{l.label}</Link>)}
        </nav>
        <div className={s.actions}>
          <Link href={SIGN_IN} className={s.signIn} data-testid="site-sign-in">Sign in</Link>
          <button type="button" className={s.cta} onClick={book} data-testid="site-book-demo"><Icon name="calendar_month" size={16} />Book a demo</button>
        </div>
      </div>
      <AnimatePresence>
        {mega ? (
          <motion.div id="site-mega" className={s.megaWrap} data-site-mega="" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0, transition: siteMotion.panel }} exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
                      onMouseEnter={keepMega} onMouseLeave={later}>
            <div className={s.mega} data-testid="site-mega">
              <div className={s.megaCols}>
                {PILLAR_ORDER.map((pid) => (
                  <div key={pid} className={s.megaCol}>
                    <p className={s.megaHead}>{PILLARS[pid].name}</p>
                    <ul className={s.megaList}>
                      {modulesByPillar(pid).map((m) => (
                        <li key={m.slug}>
                          <Link href={m.href} className={s.megaItem}>
                            <Tile hue={m.slug} icon={m.icon} size="m" />
                            <span><span className={s.megaName}>{m.name}</span><span className={s.megaBlurb}>{m.menuBlurb}</span></span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className={s.megaFoot}><Link href={site('/platform')} className={s.megaAll}>See the whole platform<Icon name="arrow_forward" size={16} /></Link></div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}

/**
 * (held calls 2026-10-24, W1-20 — his "fix all of it"; the call as decided) Has the page's hero — the first section of `main` — scrolled up past
 * the bottom bar's band (the bar and the raised Demo above it)? On a phone held sideways the bar waits until then (site-shell.module.css), so
 * at rest it never covers the hero's buttons ("See pricing", "Take a photo", the pricing switch). Read on scroll and resize, again on each
 * page; a page with no section has no hero to wait for.
 */
function useHeroPast(bar: RefObject<HTMLElement | null>, path: string) {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const read = () => {
      const hero = document.querySelector('#main-content > section')
      const band = (bar.current?.offsetHeight ?? 0) + 20   // the raised Demo stands 20 above the bar
      setPast(!hero || hero.getBoundingClientRect().bottom <= window.innerHeight - band)
    }
    read()
    const late = window.setTimeout(read, 400)   // the page's own content settling (fonts, the reveal)
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    return () => { window.clearTimeout(late); window.removeEventListener('scroll', read); window.removeEventListener('resize', read) }
  }, [bar, path])
  return past
}

/** ≤1024 (1.0's lg:hidden): the bottom bar — Home · Platform · the raised Demo · Resources · Story — and the Platform sheet. */
function PhoneBar() {
  const path = usePathname()
  const book = useBookDemo()
  const { hidden } = useScrollState()
  const barRef = useRef<HTMLElement>(null)
  const heroPast = useHeroPast(barRef, path)
  const [sheet, setSheet] = useState(false)
  const [at, setAt] = useState(path)
  if (path !== at) { setAt(path); setSheet(false) }
  const tab = (icon: string, label: string, href: string, on: boolean) => (
    <Link href={href} className={s.tab} data-active={on || undefined} aria-current={on ? 'page' : undefined}><Icon name={icon} size={22} fill={on} /><span>{label}</span></Link>
  )
  return (
    <>
      <nav ref={barRef} className={s.phoneBar} aria-label="Site" data-hidden={hidden || undefined} data-hero-past={heroPast || undefined} data-testid="site-phone-bar">
        <div className={s.phoneBarInner}>
          {tab('home', 'Home', site('/'), path === site('/'))}
          <button type="button" className={s.tab} data-active={sheet || path.startsWith(site('/platform')) || undefined} aria-expanded={sheet} onClick={() => setSheet(true)} data-testid="site-phone-platform">
            <Icon name="grid_view" size={22} fill={sheet || path.startsWith(site('/platform'))} /><span>Platform</span>
          </button>
          <div className={s.raisedSlot}>
            <button type="button" className={s.raised} onClick={book} aria-label="Book a demo" data-testid="site-phone-demo"><Icon name="calendar_month" size={22} /></button>
            <span className={s.raisedLabel}>Demo</span>
          </div>
          {tab('article', 'Resources', site('/blog'), path.startsWith(site('/blog')))}
          {tab('menu_book', 'Story', site('/story'), path.startsWith(site('/story')))}
        </div>
      </nav>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Platform">
        <div className={s.sheetBody} data-testid="site-platform-sheet">
          {PILLAR_ORDER.map((pid) => (
            <div key={pid} className={s.sheetGroup}>
              <p className={s.megaHead}>{PILLARS[pid].name}</p>
              <ul className={s.megaList}>
                {modulesByPillar(pid).map((m) => (
                  <li key={m.slug}><Link href={m.href} className={s.sheetItem}><Tile hue={m.slug} icon={m.icon} size="s" /><span><span className={s.megaName}>{m.name}</span><span className={s.megaBlurb}>{m.menuBlurb}</span></span></Link></li>
                ))}
              </ul>
            </div>
          ))}
          <Link href={site('/platform')} className={s.sheetAll}>See the whole platform<Icon name="arrow_forward" size={16} /></Link>
          {/* (S46D — D4) the bar's Pricing, for a phone: its bottom bar has no room, so the Platform sheet carries it */}
          <Link href={PRICING_PATH} className={s.sheetAll} data-testid="site-sheet-pricing">See pricing<Icon name="arrow_forward" size={16} /></Link>
        </div>
      </Sheet>
    </>
  )
}

/** Back to top — only once a long page has been read to its end (1.0's). */
function BackToTop() {
  const { nearEnd } = useScrollState()
  return (
    <AnimatePresence>
      {nearEnd ? (
        <motion.button type="button" className={s.top} aria-label="Back to top" data-testid="site-back-to-top"
                       initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1, transition: siteMotion.panel }} exit={{ opacity: 0, y: 10, scale: 0.9, transition: { duration: 0.15 } }}
                       onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>
          <Icon name="arrow_upward" size={18} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  )
}

/**
 * (1.0's IntroOverlay) The first visit's welcome on the home page: "Welcome to", the wordmark, then the wordmark travels into the bar and the
 * page is revealed. Plays only when the layout's gate flagged it (home, once a session, motion allowed); a press, the wheel or Esc skips it.
 */
type Phase = 'hidden' | 'shown' | 'dock'
function IntroOverlay() {
  const [phase, setPhase] = useState<Phase>('hidden')
  const [dock, setDock] = useState<string>()
  const logo = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const html = document.documentElement
    if (html.getAttribute('data-intro') !== 'play') return
    let done = false
    const timers: number[] = []
    const finish = () => {
      if (done) return
      done = true
      html.removeAttribute('data-intro')
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', finish)
      window.removeEventListener('pointerdown', finish)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish() }
    timers.push(window.setTimeout(() => setPhase('shown'), 60))
    timers.push(window.setTimeout(() => {
      const t = document.querySelector<HTMLElement>('[data-site-logo]')?.getBoundingClientRect()
      const o = logo.current?.getBoundingClientRect()
      if (t && o && o.height > 0 && t.height > 0) setDock(`translate(${t.left - o.left}px, ${t.top - o.top}px) scale(${t.height / o.height})`)
      setPhase('dock')
    }, 1700))
    timers.push(window.setTimeout(finish, 2650))
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', finish, { passive: true, once: true })
    window.addEventListener('pointerdown', finish, { once: true })
    return () => { timers.forEach((t) => window.clearTimeout(t)); finish() }
  }, [])
  return (
    <div className={s.intro} aria-hidden data-phase={phase}>
      <div className={s.introPaper} />
      <div className={s.introCenter}>
        <span className={s.introWelcome}>Welcome to</span>
        <div ref={logo} className={s.introLogo} style={dock && phase === 'dock' ? { transform: dock } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.introMark} src="/figma-assets/logo.svg" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.introWord} src="/figma-assets/logo-wordmark.svg" alt="" />
        </div>
      </div>
      <span className={s.introSkip}>Tap anywhere to skip</span>
    </div>
  )
}
