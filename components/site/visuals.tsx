'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { CompareSlider } from '@/components/om/compare-slider'
import { Icon } from '@/components/om/icon'
import type { ModuleSlug } from '@/lib/site/platform'
import { FLOOR_CYCLE_MS, LEADS_CYCLE_MS, SITE_EASE, siteMotion } from '@/lib/site/motion'
import { MarginChip } from './primitives'
import { WELCOME_AFTER } from '@/lib/visualizer/welcome-after'   // (S43B · F1-03) 2.0's own before/after
import { useReduced } from './use-reduced'
import v from './visuals.module.css'

/*
 * (pending modules S35 — 1.0's module-visuals.tsx · before-after-visualiser.tsx) Each module's picture: a warm interior photograph with the
 * module's own card floating over it, drawn in the snapshot style and animated once as it scrolls into view (the final frame at once with reduced
 * motion). 1.0's cards in 2.0's words — the lead card carries no AI score (2.0 dropped a lead's temperature, Q-10), the quote card no upsell
 * line, and the lead's stages are 2.0's. The AI Visualizer's before/after is the house compare slider over 2.0's own pair (S43B · F1-03).
 */

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } } }
const ITEM = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: siteMotion.swap } }

const PHOTOS: Partial<Record<ModuleSlug, string>> = {
  leads: '/site/marketing/modules/leads.jpg',
  projects: '/site/marketing/modules/projects.jpg',
  'upload-a-quote': '/site/marketing/modules/quote-digitizer.jpg',
  finance: '/site/marketing/modules/finance.jpg',
  'meeting-copilot': '/site/marketing/modules/co-pilot.jpg',
}
const LABELS: Record<ModuleSlug, string> = {
  leads: 'A lead card with its stage, budget and source, over a living-room interior',
  projects: 'A project Gantt timeline marked on track, over a kitchen interior',
  'upload-a-quote': 'A read quote with a 38% margin, over a bedroom interior',
  finance: 'A real-time studio margin of 21.4% with per-project profit, over a living-room interior',
  'meeting-copilot': 'A live meeting whisper card and a deal score of 74, over a dining interior',
  'maison-ai': 'A question answered with a chart of over-budget projects',
  visualizer: 'A room shown before and after a material swap, ready to render',
  'space-planner': 'An isometric 3D room plan becoming its render',
}

type P = { play: boolean; reduced: boolean; active: boolean }
const shown = (play: boolean, reduced: boolean) => (play || reduced ? 'show' : 'hidden')

/** A number that counts up as it enters view. */
function CountUp({ to, decimals = 0, suffix = '', play, reduced }: { to: number; decimals?: number; suffix?: string; play: boolean; reduced: boolean }) {
  const [n, setN] = useState(reduced ? to : 0)
  useEffect(() => {
    if (reduced || !play) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1100)
      setN(to * (1 - Math.pow(1 - k, 4)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [play, reduced, to])
  return <span>{(reduced ? to : n).toFixed(decimals)}{suffix}</span>
}

const LEADS = [
  { initial: 'I', name: 'Imran S.', meta: '5h ago · Tampines', stage: 'Quote Sent', amount: '$58,000', source: 'Qanvast', assigneeInitial: 'S', assignee: 'Sarah Ang' },
  { initial: 'M', name: 'Mei Lin T.', meta: '2h ago · Bishan', stage: 'New', amount: '$42,000', source: 'Website', assigneeInitial: 'P', assignee: 'Priya Nair' },
  { initial: 'D', name: 'Daniel Koh', meta: '1d ago · Punggol', stage: 'Met', amount: '$36,500', source: 'Walk-in', assigneeInitial: 'M', assignee: 'Marcus Wong' },
] as const
export function SourcePill({ source }: { source: string }) {
  return <span className={v.source} data-source={source}>{source === 'Website' ? <Icon name="link" size={12} /> : source === 'Walk-in' ? <Icon name="store" size={12} /> : <span className={v.q}>Q</span>}{source}</span>
}
export function Avatar({ initial, small = false }: { initial: string; small?: boolean }) {
  return <span className={small ? `${v.avatar} ${v.avatarS}` : v.avatar}>{initial}</span>
}

function LeadsVisual({ play, reduced, active }: P) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduced || !play || !active) return
    const id = window.setInterval(() => setI((x) => (x + 1) % LEADS.length), LEADS_CYCLE_MS)
    return () => window.clearInterval(id)
  }, [play, reduced, active])
  const lead = LEADS[i]!
  return (
    <div className={v.layer}>
      <AnimatePresence mode="wait">
        <motion.div key={i} className={`${v.float} ${v.topCard}`} initial={reduced ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: -24 }} transition={{ duration: 0.45, ease: SITE_EASE }}>
          <div className={v.row}>
            <div className={v.who}><Avatar initial={lead.initial} /><div><p className={v.name}>{lead.name}</p><p className={v.meta}>{lead.meta}</p></div></div>
            <span className={v.stageTag}>{lead.stage}</span>
          </div>
          <div className={`${v.row} ${v.gap16}`}><span className={v.amount}>{lead.amount}</span><SourcePill source={lead.source} /></div>
          <div className={v.assignee}><Avatar initial={lead.assigneeInitial} small /><span>{lead.assignee}</span></div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function ProjectsVisual({ play, reduced }: P) {
  const bars = [
    { label: 'Demolition', left: '0%', width: '26%', tone: 'done' },
    { label: 'Masonry', left: '22%', width: '34%', tone: 'active' },
    { label: 'Carpentry', left: '50%', width: '30%', tone: 'next' },
    { label: 'Handover', left: '78%', width: '18%', tone: 'next' },
  ] as const
  return (
    <div className={v.layer}>
      <div className={`${v.float} ${v.topCard} ${v.gantt}`}>
        {bars.map((b, i) => (
          <div key={b.label} className={v.ganttRow}>
            <span className={v.ganttLabel}>{b.label}</span>
            <div className={v.track}>
              <motion.div className={v.bar} data-tone={b.tone} style={{ left: b.left, width: b.width, transformOrigin: 'left center' }}
                          initial={{ scaleX: reduced ? 1 : 0 }} animate={{ scaleX: play || reduced ? 1 : 0 }} transition={{ duration: 0.7, ease: SITE_EASE, delay: 0.1 + i * 0.12 }} />
            </div>
          </div>
        ))}
        <span className={v.today} aria-hidden /><span className={v.todayLabel}>today</span>
      </div>
      <div className={`${v.chipFloat} ${v.bottomLeft}`}><span className={v.dotGood} />Masonry · on track</div>
    </div>
  )
}

function QuoteVisual({ play, reduced }: P) {
  const rows = [{ name: 'Carrara marble top', price: '$2,400' }, { name: 'Brass fixtures', price: '$880' }, { name: 'Cabinetry & install', price: '$1,200' }]
  return (
    <motion.div className={v.layer} variants={STAGGER} initial={reduced ? 'show' : 'hidden'} animate={shown(play, reduced)}>
      <div className={`${v.float} ${v.topCard} ${v.clip}`}>
        {!reduced ? <motion.div className={v.scan} initial={{ y: -40, opacity: 0 }} animate={play ? { y: [-40, 220], opacity: [0, 1, 0] } : { y: -40, opacity: 0 }} transition={{ duration: 1.2, ease: 'linear', delay: 0.1 }} /> : null}
        <motion.div variants={ITEM} className={v.row}><span className={v.name}>Quote <span className={v.soft}>· Marble vanity</span></span><MarginChip tone="good">Margin 38%</MarginChip></motion.div>
        <div className={v.lines}>{rows.map((r) => <motion.div key={r.name} variants={ITEM} className={v.line}><span>{r.name}</span><span className={v.price}>{r.price}</span></motion.div>)}</div>
        <motion.div variants={ITEM} className={v.total}><span>Total</span><span className={v.price}>$4,480</span></motion.div>
      </div>
      <motion.div className={`${v.chipFloat} ${v.bottomLeft} ${v.noteChip}`} initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }} animate={{ opacity: play || reduced ? 1 : 0, y: play || reduced ? 0 : 8 }} transition={{ duration: 0.5, ease: SITE_EASE, delay: 0.7 }}>
        <span className={v.dotAmber} /><span><strong>Read in 28s.</strong> Margins checked, ready for your review.</span>
      </motion.div>
    </motion.div>
  )
}

function FinanceVisual({ play, reduced }: P) {
  const rows = [{ name: 'Tan residence', val: '32%', tone: 'good' }, { name: 'Orchard condo', val: '21%', tone: 'good' }, { name: 'Bishan HDB', val: '9%', tone: 'pending' }] as const
  const bars = [12, 16, 14, 22, 19, 27, 24, 34]
  return (
    <motion.div className={v.layer} variants={STAGGER} initial={reduced ? 'show' : 'hidden'} animate={shown(play, reduced)}>
      <div className={`${v.float} ${v.topCard}`}>
        <div className={v.rowEnd}>
          <motion.div variants={ITEM}><span className={v.cap}>Studio margin · this month</span><p className={v.big}><CountUp to={21.4} decimals={1} suffix="%" play={play} reduced={reduced} /></p></motion.div>
          <svg viewBox="0 0 110 44" className={v.spark} aria-hidden>
            {bars.map((h, i) => <motion.rect key={i} x={i * 13 + 2} y={44 - h} width="8" height={h} rx="2" className={v.sparkBar} style={{ opacity: 0.4 + i * 0.07, transformOrigin: '50% 44px' }}
                                            initial={{ scaleY: reduced ? 1 : 0 }} animate={{ scaleY: play || reduced ? 1 : 0 }} transition={{ duration: 0.6, ease: SITE_EASE, delay: 0.2 + i * 0.05 }} />)}
          </svg>
        </div>
        <div className={v.split}>{rows.map((r) => <motion.div key={r.name} variants={ITEM} className={v.lineSm}><span className={v.dotted}><span className={v.dot} data-tone={r.tone} />{r.name}</span><span className={v.price}>{r.val}</span></motion.div>)}</div>
      </div>
    </motion.div>
  )
}

function CopilotVisual({ play, reduced }: P) {
  const whispers = ['Quality came up twice. Pitch premium.', <>She loves vintage. Try furniture from <em>Just Anthony</em>.</>, 'He could be the decision-maker. Close appropriately.']
  return (
    <motion.div className={v.layer} variants={STAGGER} initial={reduced ? 'show' : 'hidden'} animate={shown(play, reduced)}>
      <div className={v.whispers}>
        {whispers.map((t, i) => (
          <motion.div key={i} variants={ITEM} className={`${v.float} ${v.whisper}`}><span className={v.whisperHead}><Icon name="lightbulb" size={12} />Whisper</span><p className={v.whisperText}>{t}</p></motion.div>
        ))}
      </div>
      <div className={v.score}>
        <svg viewBox="0 0 36 36" className={v.ring} aria-hidden>
          <circle cx="18" cy="18" r="15" fill="none" className={v.ringTrack} strokeWidth="4" />
          <motion.circle cx="18" cy="18" r="15" fill="none" className={v.ringValue} strokeWidth="4" strokeLinecap="round" strokeDasharray={100.5} transform="rotate(-90 18 18)"
                         initial={{ strokeDashoffset: reduced ? 26 : 100.5 }} animate={{ strokeDashoffset: play || reduced ? 26 : 100.5 }} transition={{ duration: 1.1, ease: SITE_EASE, delay: 0.7 }} />
        </svg>
        <span className={v.scoreNum}><CountUp to={74} play={play} reduced={reduced} /></span>
        <span className={v.scoreCap}>deal<br />score</span>
      </div>
    </motion.div>
  )
}

function MaisonVisual({ play, reduced }: P) {
  const bars = [{ h: 40, t: 'muted' }, { h: 64, t: 'warn' }, { h: 32, t: 'muted' }, { h: 56, t: 'pending' }, { h: 24, t: 'muted' }]
  return (
    <motion.div className={`${v.layer} ${v.chat}`} variants={STAGGER} initial={reduced ? 'show' : 'hidden'} animate={shown(play, reduced)}>
      <motion.div variants={ITEM} className={v.ask}>Which projects are over budget this quarter?</motion.div>
      <motion.div variants={ITEM} className={`${v.float} ${v.answer}`}>
        <span className={v.cap}><Icon name="auto_awesome" size={12} className={v.accent} />2 projects flagged</span>
        <div className={v.chart}>{bars.map((b, i) => <motion.span key={i} className={v.chartBar} data-tone={b.t} style={{ height: b.h, transformOrigin: 'bottom' }} initial={{ scaleY: reduced ? 1 : 0 }} animate={{ scaleY: play || reduced ? 1 : 0 }} transition={{ duration: 0.5, ease: SITE_EASE, delay: 0.5 + i * 0.07 }} />)}</div>
      </motion.div>
    </motion.div>
  )
}

const FLOORS = [
  { name: 'Walnut', floor: '#c89b73', rug: '#b07a4e', sw: 'linear-gradient(135deg,#c98a5e,#a96a3f)' },
  { name: 'Ash', floor: '#cfcabf', rug: '#b3aea2', sw: 'linear-gradient(135deg,#cfcabf,#a7a195)' },
  { name: 'Sage', floor: '#b6bca6', rug: '#8a916f', sw: 'linear-gradient(135deg,#8a8f7a,#5d6b3f)' },
  { name: 'Oak', floor: '#e6decd', rug: '#d3cab6', sw: 'linear-gradient(135deg,#e8e4dc,#cbc6ba)' },
] as const
/** The Visualizer's own picture (1.0's vector room): pick a floor, the render follows. The colours are the drawing's, not the app's. */
function VisualizerVisual({ play, reduced, active }: P) {
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(reduced)
  useEffect(() => {
    if (reduced || !play || !active) return
    const t = window.setTimeout(() => setRevealed(true), 600)
    const id = window.setInterval(() => setI((x) => (x + 1) % FLOORS.length), FLOOR_CYCLE_MS)
    return () => { window.clearTimeout(t); window.clearInterval(id) }
  }, [play, reduced, active])
  const f = FLOORS[i]!
  return (
    <div className={v.vis}>
      <div className={v.visStage}>
        <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" className={v.fill} aria-hidden>
          <rect x="0" y="0" width="300" height="150" fill="#d7d3ca" /><rect x="0" y="150" width="300" height="50" fill="#c7c2b8" />
          <rect x="196" y="34" width="74" height="64" fill="#cfd3d6" stroke="#b6b2a8" strokeWidth="2" /><line x1="233" y1="34" x2="233" y2="98" stroke="#b6b2a8" strokeWidth="2" /><line x1="196" y1="66" x2="270" y2="66" stroke="#b6b2a8" strokeWidth="2" />
          <motion.g initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: revealed || reduced ? 1 : 0 }} transition={{ duration: 0.6, ease: SITE_EASE }}>
            <rect x="0" y="0" width="300" height="150" fill="#ece0cf" />
            <motion.rect x="0" y="150" width="300" height="50" initial={{ fill: FLOORS[0].floor }} animate={{ fill: f.floor }} transition={{ duration: 0.5, ease: SITE_EASE }} />
            <rect x="196" y="34" width="74" height="64" fill="#dcebf3" stroke="#c9b79a" strokeWidth="2" /><line x1="233" y1="34" x2="233" y2="98" stroke="#c9b79a" strokeWidth="2" /><line x1="196" y1="66" x2="270" y2="66" stroke="#c9b79a" strokeWidth="2" />
            <motion.ellipse cx="116" cy="172" rx="94" ry="16" opacity="0.6" initial={{ fill: FLOORS[0].rug }} animate={{ fill: f.rug }} transition={{ duration: 0.5, ease: SITE_EASE }} />
            <rect x="30" y="104" width="16" height="40" rx="6" fill="#b06b41" /><rect x="142" y="104" width="16" height="40" rx="6" fill="#b06b41" />
            <rect x="34" y="104" width="120" height="40" rx="9" fill="#c07a4e" /><rect x="34" y="96" width="120" height="20" rx="8" fill="#cf8a5c" />
            <rect x="52" y="106" width="40" height="22" rx="5" fill="#d99a6c" /><rect x="98" y="106" width="40" height="22" rx="5" fill="#d99a6c" />
            <rect x="256" y="118" width="20" height="26" rx="3" fill="#9c7a55" />
            <path d="M266 118 C 258 100, 252 100, 254 92 C 262 98, 266 100, 266 110 C 266 100, 272 96, 280 94 C 276 104, 274 112, 266 118 Z" fill="#5d6b3f" />
          </motion.g>
        </svg>
        <span className={`${v.pill} ${v.pillBefore}`}>before</span><span className={`${v.pill} ${v.pillAfter}`}>after</span>
        <span className={v.render}><Icon name="check" size={12} />Render</span>
      </div>
      <div className={v.floorBar}>
        <span className={v.cap}>Floor</span><span className={v.floorName}>{f.name}</span>
        <span className={v.swatches}>{FLOORS.map((fl, k) => <span key={fl.name} className={v.swatch} data-on={k === i || undefined} style={{ '--sw': fl.sw } as CSSProperties} />)}</span>
      </div>
    </div>
  )
}

/** The 3D Space Planner's picture: the plan's outline, three pieces dropping in, then the render beneath (1.0's). */
function SpacePlannerVisual({ reduced }: P) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-80px' })
  const go = inView && !reduced
  const drop = (delay: number) => ({ initial: reduced ? false : { opacity: 0, y: -70 }, animate: { opacity: go || reduced ? 1 : 0, y: go || reduced ? 0 : -70 }, transition: { duration: 0.5, ease: SITE_EASE, delay } })
  return (
    <div ref={ref} className={v.layer}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={v.photo} src="/site/marketing/modules/space-planner-iso-v2.jpg" alt="Isometric 3D render of a Scandinavian living room laid out in the planner: sofa, coffee table and TV console" loading="lazy" />
      <motion.div className={v.plan} initial={{ opacity: reduced ? 0 : 1 }} animate={{ opacity: reduced ? 0 : go ? 0 : 1 }} transition={{ duration: 0.8, delay: go ? 2 : 0, ease: 'easeInOut' }} aria-hidden>
        <svg viewBox="0 0 1080 788" preserveAspectRatio="xMidYMid slice" className={v.fill}>
          <g fill="none" className={v.planShell} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
            <path d="M553 105.5L248 245.5L248 535L529.5 689.5L829.5 535L829.5 245.5L553 105.5Z" /><path d="M553 92.5006L232.5 239L232.5 546.001L529.5 709.501L842.5 546.001L842.5 237.5L553 92.5006Z" />
            <path d="M249.5 533.5L553.5 394L829 532.5" /><path d="M554.5 105L554.5 394" /><line x1="529.5" y1="689" x2="529.5" y2="708" /><line x1="248.366" y1="247.359" x2="233.366" y2="240.359" /><path d="M843.6 239.24L830 245.94" />
          </g>
          <g className={v.planPieces} strokeWidth="5" strokeLinejoin="round" fillOpacity="0.16">
            <motion.g {...drop(0.35)}><path d="M400 502L587 598L502.5 642L311 543L400 502Z" /></motion.g>
            <motion.g {...drop(0.7)}><path d="M585.5 420L773.5 516L741 535L548.5 437L585.5 420Z" /></motion.g>
            <motion.g {...drop(1.05)}><path d="M575.5 491.5L635 522L575.5 551.5L517 519L575.5 491.5Z" /></motion.g>
          </g>
        </svg>
      </motion.div>
      <div className={`${v.chipFloat} ${v.bottomLeft}`}>24.5 m² · 3 items placed</div>
    </div>
  )
}

const VISUALS: Record<ModuleSlug, (p: P) => React.ReactElement> = {
  leads: LeadsVisual, projects: ProjectsVisual, 'upload-a-quote': QuoteVisual, finance: FinanceVisual, 'meeting-copilot': CopilotVisual,
  'maison-ai': MaisonVisual, visualizer: VisualizerVisual, 'space-planner': SpacePlannerVisual,
}

export function ModuleVisual({ slug }: { slug: ModuleSlug }) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, margin: '-60px' })
  const visible = useInView(ref, { margin: '-60px' })
  const reduced = useReduced()
  const Visual = VISUALS[slug]
  const photo = PHOTOS[slug]
  return (
    <div ref={ref} className={photo ? v.stage : `${v.stage} ${v.stagePlain}`} role="img" aria-label={LABELS[slug]} data-testid={`visual-${slug}`}>
      {photo ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={v.photo} src={photo} alt="" loading="lazy" />
        <span className={v.scrim} />
      </> : <span className={v.dots} />}
      <Visual play={seen && !reduced} reduced={reduced} active={visible && !reduced} />
    </div>
  )
}

/** The AI Visualizer's before and after (1.0's BeforeAfterVisualiser): the house compare slider and the palette. (S43B · F1-03 — his "fix all
    the pending things" 2026-10-15, as recommended) The pair is 2.0's own — the living-room sample painted by the engine, the Visualizer welcome's
    and the trial's (REG-819, `WELCOME_AFTER`) — where it was 1.0's model render of a kitchen 2.0 never made; the palette is that look's three picks. */
export function BeforeAfter() {
  return (
    <div className={v.ba} data-testid="before-after">
      <CompareSlider before={WELCOME_AFTER.before} after={WELCOME_AFTER.image} start={52} className={v.baSlider} testId="before-after-slider" />
      <div className={v.palette}>
        <span className={v.paletteChips} aria-hidden>{WELCOME_AFTER.swatches.map((x) => <span key={x.name} className={v.paletteChip} style={{ '--sw': x.hex } as CSSProperties} />)}</span>
        <span className={v.cap}>{WELCOME_AFTER.swatches.map((x) => x.name).join(' · ')}</span>
      </div>
    </div>
  )
}
