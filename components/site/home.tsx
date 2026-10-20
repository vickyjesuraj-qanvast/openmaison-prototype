'use client'

import { Fragment, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { PILLARS, PILLAR_ORDER, modulesByPillar } from '@/lib/site/platform'
import { PRICING_PATH, site } from '@/lib/site/model'
import { HERO_CYCLE_MS, SITE_EASE, siteMotion } from '@/lib/site/motion'
import { BookDemoButton } from './book-demo'
import { ButtonLink, Container, Display, Eyebrow, Footnote, Lede, MarginChip, Section, Snapshot, Tile } from './primitives'
import { Reveal } from './reveal'
import { useReduced } from './use-reduced'
import { TrustBanner } from './trust-banner'
import { Avatar, BeforeAfter, ModuleVisual, SourcePill } from './visuals'
import s from './site.module.css'
import h from './home.module.css'

/*
 * (pending modules S35 — 1.0's src/app/(marketing)/page-client.tsx) The home page, section by section as 1.0 ran it: the statement (the pain,
 * named), the hero with its rotating word and card, the Qanvast lineage, the three pillars, "Beautiful is expected", one login instead of six,
 * the security band, the proof tiles and the closing call. 1.0's words; 2.0's names (the hero's quote card is Upload a quote's, the lead card
 * scores nothing, the Visualizer is spelt 2.0's way) and a fourth proof tile on markets beyond Singapore taken out (his hold, 2026-10-12).
 */

/** True only on a desktop (≥1025) — the decorative drifting runs there alone (1.0's useIsDesktop: battery-friendly elsewhere). */
function useDesktop() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)')
    const sync = () => setOn(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return on
}

/* ── The hero card's bodies — one per rotating word ── */
function Bars({ heights }: { heights: number[] }) {
  return <svg viewBox={`0 0 ${heights.length * 12} 36`} className={h.bars} aria-hidden>{heights.map((x, i) => <rect key={i} x={i * 12 + 2} width="7" rx="1.5" height={x} y={36 - x} className={h.barGood} style={{ opacity: 0.35 + i * 0.08 }} />)}</svg>
}
function CardHead({ title, meta }: { title: string; meta: string }) {
  return <div className={h.cardHead}><p className={h.cardTitle}>{title}</p><span className={s.label}>{meta}</span></div>
}
function FinancesBody() {
  return <>
    <CardHead title="This month" meta="Apr 2026" />
    <div className={h.well}>
      <div><p className={s.label}>Net profit</p><p className={h.figure}>$48,200</p><span className={h.up}>↑ 12% MoM</span></div>
      <Bars heights={[12, 16, 14, 20, 18, 24, 22, 30]} />
    </div>
    <div className={h.rows}>{[['Revenue', '$128,400'], ['Project costs', '$80,200'], ['Net margin', '37.5%']].map(([n, x]) => <div key={n} className={h.rowLine}><span>{n}</span><span className={h.num}>{x}</span></div>)}</div>
  </>
}
function LeadsBody() {
  const leads = [
    { initial: 'I', name: 'Imran S.', source: 'Qanvast', amount: '$58,000' },
    { initial: 'M', name: 'Mei Lin T.', source: 'Website', amount: '$42,000' },
    { initial: 'D', name: 'Daniel Koh', source: 'Walk-in', amount: '$36,500' },
  ]
  return <>
    <CardHead title="This week" meta="18 new" />
    <div className={h.stack}>{leads.map((l) => <div key={l.name} className={h.leadRow}><Avatar initial={l.initial} /><div className={h.leadWho}><p className={h.leadName}>{l.name}</p><SourcePill source={l.source} /></div><span className={h.num}>{l.amount}</span></div>)}</div>
  </>
}
function MarginsBody() {
  const rows = [['Tan residence', '32%', 'good'], ['Orchard condo', '21%', 'good'], ['Bishan HDB', '9%', 'pending'], ['Marina loft', '−4%', 'warn']] as const
  return <>
    <CardHead title="By project" meta="This quarter" />
    <div className={h.well}><div><p className={s.label}>Studio margin</p><p className={h.figure}>21.4%</p></div><Bars heights={[18, 14, 22, 16, 10, 9]} /></div>
    <div className={h.rows}>{rows.map(([n, x, t]) => <div key={n} className={h.rowLine}><span className={h.dotted}><span className={h.dot} data-tone={t} />{n}</span><span className={h.num}>{x}</span></div>)}</div>
  </>
}
function QuotesBody() {
  const rows = [['Kitchen cabinet carpentry', '$12,400', 'good', '+24%'], ['Quartz countertop', '$3,900', 'good', '+19%'], ['Electrical rework', '$2,100', 'warn', '−8%']] as const
  return <>
    <CardHead title="Kitchen renovation" meta="14 lines · 31s" />
    <div className={h.stack}>{rows.map(([n, p, t, f]) => <div key={n} className={h.quoteRow}><span className={h.truncate}>{n}</span><span className={h.quoteEnd}><span className={h.num}>{p}</span><MarginChip tone={t}>{f}</MarginChip></span></div>)}</div>
    <div className={h.margin}><div><p className={s.label}>Project margin</p><p className={h.figure}>21.4%</p></div><Bars heights={[10, 14, 12, 18, 16, 22, 20, 28]} /></div>
  </>
}
function ProjectsBody() {
  const bars = [['Demolition', '0%', '26%', 'done'], ['Masonry', '22%', '34%', 'active'], ['Carpentry', '50%', '30%', 'next'], ['Handover', '78%', '18%', 'next']] as const
  return <>
    <CardHead title="Tan residence" meta="Wk 4 of 11" />
    <div className={h.gantt}>
      {bars.map(([l, left, width, tone]) => <div key={l} className={h.ganttRow}><span className={h.ganttLabel}>{l}</span><div className={h.track}><span className={h.bar} data-tone={tone} style={{ left, width }} /></div></div>)}
      <span className={h.today} aria-hidden />
    </div>
    <div className={h.onTrack}><span className={h.dot} data-tone="good" />Masonry · on track</div>
  </>
}
function DesignsBody() {
  const swatches = [['Oak', '#c8a06f'], ['Marble', '#ece9e3'], ['Brass', '#d5a33a'], ['Forest', '#2e3d2a']] as const
  return <>
    <CardHead title="Living room concept" meta="Render · 2 of 3" />
    <div className={h.render}><span className={h.after}>After</span><span className={h.realistic}>Life-like · in seconds</span></div>
    <div className={h.margin}><div className={h.swatches}>{swatches.map(([n, c]) => <span key={n} title={n} className={h.swatch} style={{ '--sw': c } as CSSProperties} />)}</div><span className={s.label}>Swap materials</span></div>
  </>
}
const HERO_WORDS = ['finances', 'leads', 'margins', 'quotes', 'projects', 'designs'] as const
const HERO_CARDS = [
  { label: 'Studio P&L', Body: FinancesBody }, { label: 'Lead inbox', Body: LeadsBody }, { label: 'Project margins', Body: MarginsBody },
  { label: 'Upload a quote', Body: QuotesBody }, { label: 'Project timeline', Body: ProjectsBody }, { label: 'AI Visualizer', Body: DesignsBody },
] as const

function HeroCard({ index, reduced }: { index: number; reduced: boolean }) {
  const card = HERO_CARDS[index] ?? HERO_CARDS[0]
  const Active = card.Body
  return (
    <Snapshot label={card.label} className={h.heroCard}>
      {/* every body stacked in one cell, hidden, holds the frame at the tallest card's height so it never resizes between turns */}
      <div className={h.conveyor}>
        <div aria-hidden className={h.sizer}>{HERO_CARDS.map((c, i) => <div key={i} className={h.sizerCell}><c.Body /></div>)}</div>
        <div className={h.window}>
          <AnimatePresence initial={false}>
            <motion.div key={index} className={h.slide} initial={reduced ? false : { y: '100%' }} animate={{ y: '0%' }} exit={reduced ? { opacity: 0 } : { y: '-100%' }} transition={siteMotion.swap}><Active /></motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Snapshot>
  )
}

function RotatingWord({ index, reduced }: { index: number; reduced: boolean }) {
  return (
    <span className={h.word}>
      <AnimatePresence initial={false}>
        <motion.span key={index} className={h.wordCell} initial={reduced ? false : { y: '100%' }} animate={{ y: '0%' }} exit={reduced ? { opacity: 0 } : { y: '-100%' }} transition={siteMotion.swap}>
          <span className={s.gradientText}>{HERO_WORDS[index]}</span>,
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/** The underline that strokes in under a word (1.0's MarkerWord). */
function Marker({ children, delay = 0 }: { children: string; delay?: number }) {
  const reduced = useReduced()
  return (
    <span className={h.marker}>{children}
      <motion.span aria-hidden className={h.markerLine} initial={{ scaleX: reduced ? 1 : 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease: SITE_EASE, delay }} />
    </span>
  )
}

/* ── Section 0 · the statement ── */
const STATEMENT: { t: string; italic?: boolean; suffix?: string }[] = [
  { t: 'Your' }, { t: 'studio' }, { t: 'runs' }, { t: 'on' }, { t: 'WhatsApp', italic: true, suffix: ',' }, { t: 'Spreadsheets', italic: true, suffix: ',' }, { t: 'and' }, { t: 'Prayer', italic: true, suffix: '.' },
]
function StatementHero() {
  const reduced = useReduced()
  const desk = useDesktop()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '100px' })
  const bob = inView && desk && !reduced
  const toBetter = (e: MouseEvent<HTMLAnchorElement>) => {
    const t = document.getElementById('the-better-way')
    if (!t) return
    e.preventDefault()
    t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  }
  return (
    <section className={h.statement} aria-labelledby="site-statement">
      <div className={h.statementDots} aria-hidden />
      <div className={h.statementGlow} aria-hidden />
      <div ref={ref} className={h.chaos} aria-hidden>
        <Chaos className={h.chaosChat} bob={bob} dur={6.4} amp={-10}>
          <div className={`${h.scrap} ${h.scrapChat}`}><div className={h.scrapHead}><span>Client · WhatsApp</span><span className={h.badge}>23</span></div><p className={h.scrapText}>“Tom, any update on the quote? 🙏”</p><p className={h.scrapMeta}>11:47 PM · still unread</p></div>
        </Chaos>
        <Chaos className={h.chaosSheet} bob={bob} dur={7.6} amp={12} delay={0.12}>
          <div className={`${h.scrap} ${h.scrapSheet}`}><div className={h.sheetName}>quotes_FINAL_v7.xlsx</div><div className={h.sheetGrid}><span>Tiling</span><span>$4,200</span><span className={h.ref}>#REF!</span><span>Margin</span><span>??</span><span className={h.ref}>#REF!</span></div></div>
        </Chaos>
        <Chaos className={h.chaosNote} bob={bob} dur={8.2} amp={9} delay={0.2}>
          <div className={h.sticky}>chase the tiler AGAIN before Fri!!</div>
        </Chaos>
        <Chaos className={h.chaosCall} bob={bob} dur={7} amp={-8} delay={0.3}>
          <div className={h.call}>📞 Missed call · Supplier <strong>(3)</strong></div>
        </Chaos>
      </div>
      <Container className={h.statementInner}>
        <Reveal><Eyebrow center>Built for interior design</Eyebrow></Reveal>
        <motion.h1 id="site-statement" className={h.statementTitle} initial={reduced ? 'show' : 'hidden'} animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : 0.07, delayChildren: 0.15 } } }}>
          {STATEMENT.map((w, i) => (
            <Fragment key={i}>{i > 0 ? ' ' : ''}<motion.span className={h.wordIn} variants={{ hidden: { opacity: 0, y: '0.5em' }, show: { opacity: 1, y: 0, transition: siteMotion.swap } }}>
              <span className={w.italic ? h.crutch : h.soften}>{w.t}</span>{w.suffix ? <span className={h.soften}>{w.suffix}</span> : null}
            </motion.span></Fragment>
          ))}
        </motion.h1>
        <Reveal delay={620}><p className={h.aside}>It <Marker delay={1}>doesn’t</Marker> have to.</p></Reveal>
        <Reveal delay={760} className={h.statementCta}>
          <a href="#the-better-way" onClick={toBetter} className={`${s.button} ${s.primary}`} data-testid="site-better-way">Show me the better way<Icon name="arrow_downward" size={16} /></a>
        </Reveal>
      </Container>
    </section>
  )
}
function Chaos({ className, bob, dur, amp, delay = 0, children }: { className?: string; bob: boolean; dur: number; amp: number; delay?: number; children: React.ReactNode }) {
  return (
    <motion.div className={`${h.chaosCard} ${className}`} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 2.2 + delay, ease: SITE_EASE }}>
      <motion.div animate={bob ? { y: [0, amp, 0] } : undefined} transition={bob ? { duration: dur, repeat: Infinity, ease: 'easeInOut' } : undefined}>{children}</motion.div>
    </motion.div>
  )
}

/* ── Section 1 · the hero ── */
function Hero() {
  const reduced = useReduced()
  const desk = useDesktop()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '200px' })
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (reduced || paused || !inView) return
    const id = window.setInterval(() => setI((x) => (x + 1) % HERO_WORDS.length), HERO_CYCLE_MS)
    return () => window.clearInterval(id)
  }, [reduced, paused, inView])
  /* reading the word or the card holds the turn (WCAG 2.2.2) */
  const hold = { onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false), onFocus: () => setPaused(true), onBlur: () => setPaused(false) }
  const decor = inView && desk && !reduced
  return (
    <section id="the-better-way" className={h.hero} aria-label="The better way">
      <div className={h.backdrop} aria-hidden>
        <motion.div className={h.halo} animate={decor ? { rotate: 360 } : undefined} transition={decor ? { duration: 46, repeat: Infinity, ease: 'linear' } : undefined} />
        <motion.div className={h.blobA} animate={decor ? { x: [0, 34, 0], y: [0, -22, 0], scale: [1, 1.1, 1] } : undefined} transition={decor ? { duration: 18, repeat: Infinity, ease: 'easeInOut' } : undefined} />
        <motion.div className={h.blobB} animate={decor ? { x: [0, -26, 0], y: [0, -30, 0] } : undefined} transition={decor ? { duration: 24, repeat: Infinity, ease: 'easeInOut' } : undefined} />
      </div>
      <Container className={h.heroInner}>
        <div ref={ref} className={h.heroGrid}>
          <div className={h.heroCopy}>
            <Reveal><p className={h.setup}>The only platform your studio needs, powered by AI that understands renovation.</p></Reveal>
            <Reveal delay={80}>
              <h2 className={`${s.displayXl} ${h.heroTitle}`}>
                <span className={s.srOnly}>Your finances, leads, margins, quotes and projects. Handled.</span>
                <span aria-hidden {...hold}>Your <RotatingWord index={i} reduced={reduced} /><br />handled.</span>
              </h2>
            </Reveal>
            <Reveal delay={160} className={h.heroButtons}>
              <BookDemoButton className={h.half} testId="hero-book-demo" />
              <a href="#platform" className={`${s.button} ${s.ghost} ${h.half}`}>Explore platform</a>
            </Reveal>
          </div>
          <Reveal delay={120} className={h.heroArt}>
            <div className={h.heroGlow} aria-hidden />
            <div className={h.heroCardWrap} {...hold}><HeroCard index={i} reduced={reduced} /></div>
            {[{ hue: 'meeting-copilot', icon: 'mic', cls: h.floatA, dur: 5.5, amp: -12 }, { hue: 'visualizer', icon: 'visibility', cls: h.floatB, dur: 6.8, amp: 12 }, { hue: 'finance', icon: 'account_balance_wallet', cls: h.floatC, dur: 7.6, amp: -10 }].map((f, k) => (
              <motion.div key={f.hue} className={`${h.floater} ${f.cls}`} initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.5 + k * 0.12, ease: SITE_EASE }} aria-hidden>
                <motion.div animate={inView && !reduced ? { y: [0, f.amp, 0] } : undefined} transition={inView && !reduced ? { duration: f.dur, repeat: Infinity, ease: 'easeInOut' } : undefined}><Tile hue={f.hue} icon={f.icon} size={k === 0 ? 'xl' : 'l'} /></motion.div>
              </motion.div>
            ))}
          </Reveal>
        </div>
      </Container>
    </section>
  )
}

/* ── Section 3 · the three pillars ── */
function Pillars() {
  const reduced = useReduced()
  const payoff = ['OpenMaison', 'makes', 'your', 'studio']
  return (
    <Section spacing="major" id="platform" className={h.pillars} label="The platform">
      <Container>
        <motion.p className={h.oversized} initial={reduced ? 'show' : 'hidden'} whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : 0.07, delayChildren: 0.05 } } }}>
          {payoff.map((w, k) => <Fragment key={w}>{k > 0 ? ' ' : ''}<motion.span className={h.wordIn} variants={{ hidden: { opacity: 0, y: '0.5em' }, show: { opacity: 1, y: 0, transition: siteMotion.swap } }}>{w}</motion.span></Fragment>)}
          {' '}<Marker delay={0.33}>run well</Marker>.
        </motion.p>
      </Container>
      <Container className={h.pillarList}>
        {PILLAR_ORDER.map((pid, k) => {
          const p = PILLARS[pid]
          const lead = modulesByPillar(pid)[0]!
          return (
            <Reveal key={pid}>
              <div className={h.pillar} data-flip={k % 2 === 1 || undefined}>
                <div>
                  <span className={h.pillarIndex}>{p.index}</span>
                  <Eyebrow className={h.mt12}>{p.name}</Eyebrow>
                  <Display size="l" as="h3" className={h.mt20}>{p.promise}</Display>
                  <p className={`${s.lede} ${h.mt20}`}>{p.blurb}</p>
                </div>
                {lead.slug === 'visualizer' ? <BeforeAfter /> : <Link href={lead.href} aria-label={`Explore ${lead.name}`} className={h.pillarArt}><ModuleVisual slug={lead.slug} /></Link>}
              </div>
            </Reveal>
          )
        })}
      </Container>
      <Container className={h.centerCta}><Reveal><BookDemoButton testId="pillars-book-demo" /></Reveal></Container>
    </Section>
  )
}

/* ── Section 4 · unlike the others ── */
function UnlikeOthers() {
  const rows = [
    { dim: 'Margin and P&L', them: 'Out of scope', us: 'Live project margins.' },
    { dim: 'AI', them: 'Renders images', us: 'Covers leads, designs, quotes, projects, & finance.' },
    { dim: 'Coverage', them: 'Part of the workflow', us: 'Full studio workflow.' },
    { dim: 'Region', them: 'Generic or US/AU-centric', us: 'Built for local markets.' },
  ]
  return (
    <Section spacing="major" surface="sunk" label="What makes us different">
      <Container size="narrow">
        <Reveal>
          <Display size="l">Beautiful is expected. We help run the business.</Display>
          <Lede className={h.mt20}>Plenty of tools help you create a beautiful first-impression. OpenMaison helps you win work, protect profits, manage projects and deliver a better client experience.</Lede>
        </Reveal>
        <Reveal delay={100} className={h.mt48}>
          <div className={h.ledger} role="table" aria-label="OpenMaison and presentation-first tools">
            <div className={h.ledgerCard} aria-hidden />
            <div className={h.ledgerGrid}>
              <div className={h.usColumn} style={{ gridRow: `1 / ${rows.length + 2}` }} aria-hidden />
              <div role="row" className={h.ledgerRow}>
                <span role="columnheader" className={`${h.ledgerHead} ${s.label}`} style={{ gridColumn: 1, gridRow: 1 }}>Feature</span>
                <span role="columnheader" className={h.usHead} style={{ gridColumn: 2, gridRow: 1 }}><span className={h.recommended}>Recommended</span>OpenMaison</span>
                <span role="columnheader" className={h.themHead} style={{ gridColumn: 3, gridRow: 1 }}>Presentation-first tools</span>
              </div>
              {rows.map((r, k) => (
                <div key={r.dim} role="row" className={h.ledgerRow}>
                  <span role="rowheader" className={h.dim} style={{ gridColumn: 1, gridRow: k + 2 }}>{r.dim}</span>
                  <span role="cell" className={h.us} style={{ gridColumn: 2, gridRow: k + 2 }}><span className={h.check}><Icon name="check" size={16} /></span>{r.us}</span>
                  <span role="cell" className={h.them} style={{ gridColumn: 3, gridRow: k + 2 }}>{r.them}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={140} className={h.centerCta}><BookDemoButton testId="unlike-book-demo" /></Reveal>
      </Container>
    </Section>
  )
}

/* ── Section 5 · one platform ── */
const TOOLS = [['WhatsApp', 'whatsapp'], ['Excel', 'microsoftexcel'], ['Xero', 'xero'], ['Trello', 'trello'], ['Canva', 'canva'], ['HubSpot', 'hubspot']] as const
function ToolChip({ name, logo }: { name: string; logo: string }) {
  return (
    <span className={h.toolChip}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/site/brands/${logo}.svg`} alt="" width={15} height={15} className={h.toolLogo} />
      <span className={h.struck}>{name}<span aria-hidden className={h.strike} /></span>
    </span>
  )
}
function OnePlatform() {
  return (
    <Section spacing="major" label="One platform">
      <Container size="narrow" className={s.center}>
        <Reveal>
          <Display size="l" className={`${s.centerBlock} ${h.max24}`}>WhatsApp, Excel, Xero, Trello, Canva, HubSpot. Get one login instead.</Display>
          <Lede className={`${s.centerBlock} ${h.mt20}`}>Replace disconnected tools with one system. The same data flows across every part of your business, so nothing gets re-entered or missed.</Lede>
          <div className={h.tools}>{TOOLS.map(([n, l]) => <ToolChip key={n} name={n} logo={l} />)}</div>
          <div className={h.marquee} aria-hidden><div className={h.marqueeTrack}>{[0, 1].map((g) => <div key={g} className={h.marqueeGroup}>{TOOLS.map(([n, l]) => <ToolChip key={n} name={n} logo={l} />)}</div>)}</div></div>
          <div className={h.converge}>
            <Icon name="arrow_downward" size={20} className={h.mutedIcon} />
            <span className={h.lockup}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/figma-assets/logo.svg" alt="" className={h.lockMark} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/figma-assets/logo-wordmark.svg" alt="OpenMaison" className={h.lockWord} />
            </span>
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}

/* ── the security band ── */
const SECURITY = [
  { icon: 'lock', title: 'Always encrypted', desc: 'Your data is encrypted in transit and at rest using industry-standard security.' },
  { icon: 'key', title: 'Access based on roles', desc: 'Owners, designers, and accountants only see the information they need.' },
  { icon: 'download', title: 'Always yours', desc: 'If you ever leave, we export and safely delete all your data.' },
  { icon: 'verified_user', title: 'Never lose data', desc: 'Automatic backups ensure your business data is always safe.' },
]
function Security() {
  return (
    <Section spacing="major" surface="sunk" className={h.securityBand} label="Security">
      <div className={h.spotlight} aria-hidden />
      <Container>
        <Reveal className={s.center}>
          <Display size="l" className={s.centerBlock}>Your data stays yours. Period.</Display>
          <Lede className={`${s.centerBlock} ${h.mt16}`}>From client information to project finances, your data stays secure, private, and under your control.</Lede>
        </Reveal>
        <Reveal delay={80} className={h.mt56}>
          <div className={s.grid4}>
            {SECURITY.map((x, k) => (
              <div key={x.title} className={`${s.card} ${h.secCard}`}>
                <Tile hue={`security-${k + 1}`} icon={x.icon} size="m" />
                <p className={h.secTitle}>{x.title}</p>
                <p className={h.secBody}>{x.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}

/* ── Section 6 · proof ── */
/* (S42E, E-02 · call E·1 as recommended) Each figure is one 2.0 can back: a quote is read in seconds (a spreadsheet or a PDF), ten finance
   reports, and AI in every module — 1.0's "20+ AI capabilities" counted agents 2.0 doesn't have, so it names where the AI is instead. */
const STATS = [
  { value: '30s quote read', label: 'Upload your quote and see every line’s margin.' },
  { value: '10+ finance reports', label: 'Live P&L, GST, AR/AP aging & more.' },
  { value: 'AI in every module', label: 'Leads, quotes, designs, projects and money.' },
]
function Proof() {
  return (
    <Section spacing="major" surface="white" label="Results">
      <Container>
        <Reveal>
          <Display size="l" className={h.max28}>See results starting with your very first quote.</Display>
          <Lede className={h.mt20}>Beautiful presentations matter. So do healthy margins. OpenMaison helps you manage both.</Lede>
        </Reveal>
        <div className={h.stats}>
          {STATS.map((x, k) => (
            <Reveal key={x.value} delay={k * 80}>
              <div className={h.stat}><p className={h.statValue}>{x.value}</p><p className={h.statLabel}>{x.label}</p></div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}

/** 1.0's closing band, with 2.0's own door for a studio that would rather start on its own (S31's sign-up). (S46D — D4) `primary` — a page whose
    next step is a link (Pricing's Start for free) leads with it, and Book a demo steps back to the ghost beside it; `footnote` false drops the
    closing footnote where the button already says it. */
export function ClosingCta({ heading, description, secondary = { label: 'Talk to us', href: site('/contact') }, primary, footnote = true, testId = 'closing' }: { heading: string; description?: string; secondary?: { label: string; href: string }; primary?: { label: string; href: string; fine?: string }; footnote?: boolean; testId?: string }) {
  return (
    <Section spacing="major" className={h.closing} label="Get started">
      <div className={h.closingGlow} aria-hidden />
      <Container size="narrow" className={s.center}>
        <Reveal>
          <Display size="l" className={`${s.centerBlock} ${h.max20}`}>{heading}</Display>
          {description ? <Lede className={`${s.centerBlock} ${h.mt20}`}>{description}</Lede> : null}
          <div className={`${s.buttons} ${s.buttonsCenter} ${h.mt36}`}>
            {primary ? <><ButtonLink href={primary.href} testId={`${testId}-start`}>{primary.label}</ButtonLink><BookDemoButton variant="ghost" testId={`${testId}-book-demo`} /></> : <>
            <BookDemoButton testId={`${testId}-book-demo`} />
            <ButtonLink href={secondary.href} variant="ghost" testId={`${testId}-secondary`}>{secondary.label}</ButtonLink>
            </>}
          </div>
          {primary?.fine ? <p className={`${s.fine} ${s.footnote}`} data-testid={`${testId}-fine`}>{primary.fine}</p> : footnote ? <Footnote testId={testId} /> : null}
        </Reveal>
      </Container>
    </Section>
  )
}

export function HomeView() {
  return (
    <>
      <StatementHero />
      <Hero />
      <TrustBanner />
      <Pillars />
      <UnlikeOthers />
      <OnePlatform />
      <Security />
      <Proof />
      <ClosingCta heading="Grow your studio. Not the chaos." description="Whether you’re upgrading from spreadsheets or replacing multiple tools, OpenMaison brings your team, projects and finances together in one platform, so you can grow with confidence." secondary={{ label: 'See pricing', href: PRICING_PATH }} testId="home-closing" />   {/* (S46D — D4) plg's "See pricing" beside the band's Book a demo */}
    </>
  )
}
