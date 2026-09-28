'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { CreditToken, fillFromEmpty } from '@/components/om/credit-token'
import { CreditsCard } from '@/components/credits/credits-card'
import { HOLD_EVENT, isRailHeld, openPlans, useCredits } from '@/components/credits/credits-client'
import { aboutRenders, dayMonth, fmtCredits, levelOf, railFigure, toneOf, type CreditSummary } from '@/lib/credits/model'
import styles from './rail-credits.module.css'

const cx = (...c: (string | undefined | false)[]) => c.filter(Boolean).join(' ')

/**
 * (REG-701, AI credits §5.1 · Q-04 · Q-05 · Q-06) The rail's Upgrade slot — one slot, two states. On Free it is the Upgrade row exactly as
 * drawn (779:19690, REG-164 · REG-206) with the balance quiet at its end; a press opens Plans inside the app. On a paid plan the same
 * 200 × 36 row carries the AI credit's token (its ring the month's level, REG-710), the number and "AI credits" — calm at rest (a tinted row would
 * read as "the page you're on"), the number and the ring taking the state's colour. Its press opens the credits card beside the rail.
 *
 * Motion (§5.4): a spend rolls the number and lifts a "−20"; the one upgrade moment turns the gem a last time, and it comes back as the
 * token whose ring fills while the number counts up. Reduced motion swaps each in place.
 */
export function RailCredits({ initial, expanded, tabletDown, itemClass, upgradeClass, labelClass, gemTurnClass, gemClass, gstLine }: {
  initial: CreditSummary | null
  expanded: boolean
  tabletDown: boolean
  /* the rail's own classes (app-rail.module.css), so the slot is the rail's item box */
  itemClass?: string
  upgradeClass?: string
  labelClass?: string
  gemTurnClass?: string
  gemClass?: string
  gstLine: string
}) {
  const live = useCredits(initial)
  const paid = !!live && live.planId !== 'free'
  /* What the slot shows lags a Free → paid change while Plans is still open (its Done step counts the credits in first); the moment plays
     when Plans lets go (HOLD_EVENT). Render-phase adjust — never a setState in an effect body. */
  const [shown, setShown] = useState<'upgrade' | 'credits'>(paid ? 'credits' : 'upgrade')
  const [celebrate, setCelebrate] = useState(false)
  if (!paid && shown === 'credits') setShown('upgrade')
  if (paid && shown === 'upgrade' && !celebrate && !isRailHeld()) setCelebrate(true)
  useEffect(() => {
    const onRelease = () => setCelebrate((c) => c || (!!live && live.planId !== 'free'))
    window.addEventListener(HOLD_EVENT, onRelease)
    return () => window.removeEventListener(HOLD_EVENT, onRelease)
  }, [live])

  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const gem = useRef<HTMLSpanElement>(null)
  const reduce = useRef(false)
  useEffect(() => { reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches }, [])

  /* the upgrade moment, part one: the gem turns to its edge, then the slot becomes the credits row */
  useEffect(() => {
    if (!celebrate || shown !== 'upgrade') return
    const el = gem.current
    if (!el || reduce.current || typeof el.animate !== 'function') { setTimeout(() => setShown('credits'), 0); return }
    const a = el.animate([{ transform: 'perspective(120px) rotateY(0deg)' }, { transform: 'perspective(120px) rotateY(90deg)' }], { duration: 260, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' })
    a.onfinish = () => setShown('credits')
    return () => a.cancel()
  }, [celebrate, shown])

  if (!live) return null
  if (shown === 'upgrade') {
    const count = live.provisioned && live.viewer.trusted && live.balance != null ? live.balance : null
    const tip = count != null ? `Upgrade · ${fmtCredits(count)} AI credits left` : 'Upgrade'
    return (
      <Tooltip label={tip} side="right" disabled={expanded}>
        <button type="button" className={cx(itemClass, upgradeClass)} aria-label={tip} onClick={openPlans} data-testid="rail-upgrade">
          <span ref={gem} className={gemTurnClass}><Icon name="diamond" size={24} weight={300} fill className={gemClass} /></span>
          <span className={labelClass}>Upgrade</span>
          {count != null ? <span className={cx(styles.quiet, labelClass)} aria-hidden>{fmtCredits(count)}</span> : null}
        </button>
      </Tooltip>
    )
  }
  return (
    <>
      <CreditsRow summary={live} expanded={expanded} tabletDown={tabletDown} open={open} btn={btn} itemClass={itemClass} upgradeClass={upgradeClass} labelClass={labelClass}
                  turnClass={gemTurnClass} fromZero={celebrate} onToggle={() => setOpen((o) => !o)} />
      <CreditsCard open={open} anchor={btn} placement="rail" onClose={() => setOpen(false)} summary={live} gstLine={gstLine} />
    </>
  )
}

function CreditsRow({ summary: s, expanded, open, btn, itemClass, upgradeClass, labelClass, turnClass, fromZero, onToggle }: {
  summary: CreditSummary; expanded: boolean; tabletDown: boolean; open: boolean; btn: React.RefObject<HTMLButtonElement | null>
  itemClass?: string; upgradeClass?: string; labelClass?: string
  /** (REG-706, owner) the Free gem's turn — once on its axis every 8s (app-rail.module.css `.gemTurn`) — for the spark too */
  turnClass?: string
  fromZero: boolean; onToggle: () => void
}) {
  const tone = toneOf(s), level = levelOf(s), fig = railFigure(s)
  const shown = useTicking(fig.value, fromZero)
  const fill = useRef<SVGCircleElement | null>(null)
  /* the upgrade moment, part two: the ring round the spark grows from empty (sheet timing) as the number counts up (REG-710) */
  useEffect(() => { if (fromZero) return fillFromEmpty(fill.current) }, [fromZero])
  return (
    <Tooltip label={fig.tip} side="right" disabled={expanded || open}>
      {/* (REG-706) the paid row keeps Free's warm tile — the spark on it, as the icon canvas drew it (direction E) */}
      <button ref={btn} type="button" className={cx(itemClass, upgradeClass, styles.row)} data-tone={tone} data-open={open || undefined} aria-haspopup="dialog" aria-expanded={open}
              aria-label={`${fig.tip}. Open AI credits`} onClick={onToggle} data-testid="rail-credits">
        <span className={styles.glyph}>
          {/* (REG-710) the turn rides on the spark alone — the ring round it holds still */}
          <CreditToken size={24} level={level} tone={tone} sparkClassName={turnClass} fillRef={(el) => { fill.current = el }} />
          {shown.delta ? <span key={shown.key} className={styles.float} data-up={shown.delta > 0 || undefined} aria-hidden>{shown.delta > 0 ? `+${fmtCredits(shown.delta)}` : `−${fmtCredits(-shown.delta)}`}</span> : null}
        </span>
        <span className={cx(labelClass, styles.label)}>
          <b className={styles.n} data-tone={tone}>{fmtCredits(shown.value)}</b>
          <span className={styles.unit}>{fig.unit}</span>
        </span>
      </button>
    </Tooltip>
  )
}

/** The number as it moves: a change rolls to the new value (280ms) and lifts its difference; the first value may count up from 0. */
function useTicking(value: number, fromZero: boolean): { value: number; delta: number; key: number } {
  const [state, setState] = useState(() => ({ value: fromZero ? 0 : value, target: value, delta: 0, key: 0 }))
  if (state.target !== value) setState((s) => ({ value: s.value, target: value, delta: value - s.target, key: s.key + 1 }))
  useEffect(() => {
    if (state.value === state.target) return
    const from = state.value, to = state.target, t0 = performance.now(), ms = fromZero && from === 0 ? 900 : 280
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { const id = requestAnimationFrame(() => setState((s) => ({ ...s, value: to }))); return () => cancelAnimationFrame(id) }
    let raf = 0
    const step = (t: number) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); setState((s) => ({ ...s, value: Math.round(from + (to - from) * e) })); if (k < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [state.target, state.value === state.target, fromZero])   // eslint-disable-line react-hooks/exhaustive-deps
  return { value: state.value, delta: state.delta, key: state.key }
}

/**
 * (REG-701, Q-39) The slot's phone form — the More sheet's first row (REG-300 left Upgrade without a phone home). On Free it reads
 * "Upgrade" with the gem and opens Plans (full screen on a phone); on a paid plan it is a small credits card whose press opens the credits
 * card as a sheet. The sheet lives outside More (`CreditsSheet`), so closing More doesn't take it down.
 */
export function MoreCredits({ initial, onOpen, onUpgrade, rowClass, iconClass, labelClass, metaClass }: {
  initial: CreditSummary | null; onOpen: () => void; onUpgrade: () => void
  rowClass?: string; iconClass?: string; labelClass?: string; metaClass?: string
}) {
  const s = useCredits(initial)
  if (!s) return null
  if (s.planId === 'free') {
    const count = s.provisioned && s.viewer.trusted && s.balance != null ? s.balance : null
    return (
      <button type="button" className={rowClass} onClick={() => { onUpgrade(); openPlans() }} data-testid="more-upgrade">
        <span className={iconClass}><Icon name="diamond" size={20} fill className={styles.gem} /></span>
        <span className={labelClass}>Upgrade</span>
        {count != null ? <span className={metaClass}>{fmtCredits(count)} AI credits</span> : null}
      </button>
    )
  }
  const tone = toneOf(s), fig = railFigure(s)
  const line = s.viewer.trusted && s.balance != null
    ? `Refreshes ${dayMonth(s.periodEnd)}${s.balance > 0 ? ` · about ${fmtCredits(aboutRenders(s.balance))} renders` : ''}`
    : `Refreshes ${dayMonth(s.periodEnd)}`
  return (
    <button type="button" className={styles.more} onClick={onOpen} aria-haspopup="dialog" aria-label={`${fig.tip}. Open AI credits`} data-testid="more-credits">
      <CreditToken size={36} level={levelOf(s)} tone={tone} />
      <span className={styles.moreText}>
        <b className={styles.moreN} data-tone={tone}>{fmtCredits(fig.value)} {fig.unit}</b>
        <span className={styles.moreLine}>{line}</span>
      </span>
      <Icon name="chevron_right" size={20} weight={300} className={styles.moreChevron} />
    </button>
  )
}
/** The credits card as the phone's sheet, opened from More's first row. */
export function CreditsSheet({ initial, gstLine, open, onClose }: { initial: CreditSummary | null; gstLine: string; open: boolean; onClose: () => void }) {
  const s = useCredits(initial)
  const none = useRef<HTMLElement | null>(null)
  if (!s) return null
  return <CreditsCard open={open} anchor={none} placement="rail" onClose={onClose} summary={s} gstLine={gstLine} />
}
