'use client'

import { useState, useTransition, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { anchoredSurface } from '@/lib/motion'
import { Icon } from '@/components/om/icon'
import { CreditToken } from '@/components/om/credit-token'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import { useSnackbar } from '@/components/om/snackbar'
import { askForCredits, keepPlan } from '@/app/credits/actions'
import { aboutRenders, dayMonth, fmtCredits, levelOf, refreshLine, runOutAt, toneOf, type CreditSummary } from '@/lib/credits/model'
import { sgd, TOPUP_CREDITS, TOPUP_MAX, TOPUP_PRICE, topupPrice } from '@/lib/credits/plans'
import { openManageBilling, openPlans, openTopUp, planHref, refreshCredits } from './credits-client'
import menuStyles from '@/components/leads/menus.module.css'
import panel from '@/components/company/company-popover.module.css'
import styles from './credits-card.module.css'
import { useRailPopover } from '@/components/shell/rail-popover'
import { leaveThen } from '@/components/company/leave-guard'   // (pending modules S16) unsaved Company / Settings edits ask before the move (REG-791)

/**
 * (REG-701, AI credits §5.2 · Q-07 · Q-20) The credits card: the whole story behind the balance, opened by a press on the rail's row or
 * the editor's chip (never hover alone — 1.0's hover popover couldn't be reached on touch, MM-16), beside its anchor like Tools, Company
 * and View as (the Company panel's chrome, 304 wide), a bottom sheet on a phone (REG-353).
 *
 * The Owner and Admins see the studio: what is left and what it comes to in renders, this month against top-ups, the date it refreshes,
 * and — only when it matters — when it runs out at this pace. Only the Owner buys (1.0's rule): one 1,000 pack for now (integration
 * B-05). Everyone else sees their own figures and, when the studio or their monthly amount is out, one action: ask the Owner (B-19).
 */
export function CreditsCard({ open, anchor, placement, onClose, onBack, summary, gstLine }: {
  open: boolean
  anchor: RefObject<HTMLElement | null>
  placement: 'rail' | 'chip'
  onClose: () => void
  /** (REG-899) The phone sheet opened from More leads with a back to More. */
  onBack?: () => void
  summary: CreditSummary
  /** The studio's GST line for a purchase (Q-15), from its own GST status. */
  gstLine: string
}) {
  const sheet = useSheetLayout()
  const { place } = useRailPopover({ open, anchor, onClose, sheet, align: placement === 'rail' ? 'bottom' : 'below' })   // (REG-728) the rail's popovers open one way

  const body = <CardBody summary={summary} gstLine={gstLine} onClose={onClose} />
  if (typeof document === 'undefined') return null
  if (sheet) return <Sheet open={open} onClose={onClose} onBack={onBack} title="AI credits" label="AI credits">{<div className={styles.sheetBody}>{body}</div>}</Sheet>
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div ref={place} className={`${menuStyles.menu} ${panel.popover} ${styles.card}`} role="dialog" aria-label="AI credits" data-om-menu data-testid="credits-card"
                    variants={anchoredSurface} initial="initial" animate="animate" exit="exit" style={{ position: 'fixed', zIndex: 130 }}>
          {body}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

function CardBody({ summary: s, gstLine, onClose }: { summary: CreditSummary; gstLine: string; onClose: () => void }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [pending, start] = useTransition()
  const [asked, setAsked] = useState(false)
  const tone = toneOf(s), level = levelOf(s)
  const trusted = s.viewer.trusted && s.balance != null
  const go = (href: string) => { onClose(); leaveThen(() => router.push(href)) }
  const ask = (kind: 'pool' | 'monthly') => start(async () => {
    const r = await askForCredits({ kind, needed: 0 })
    if ('error' in r) { snackbar({ message: r.error }); return }
    setAsked(true); void refreshCredits()
    snackbar({ message: `Asked ${r.owner} for more AI credits` })
  })
  const keep = () => start(async () => {
    const r = await keepPlan()
    if ('error' in r) { snackbar({ message: r.error }); return }
    void refreshCredits(); snackbar({ message: `${s.planName} stays on` })
  })

  /* ── the Owner's and Admins' card ── */
  if (trusted) {
    const balance = s.balance ?? 0, allowance = s.allowance ?? 0, top = s.topupCredits ?? 0, plan = s.planCredits ?? 0
    const used = Math.max(0, allowance - plan)
    const whole = Math.max(1, allowance + top)
    const runOut = s.counting ? runOutAt({ used: s.usedThisPeriod ?? 0, balance, periodStart: s.periodStart, periodEnd: s.periodEnd, now: s.now }) : null
    return (
      <div className={styles.inner}>
        <div className={styles.head}>
          <CreditToken size={40} level={level} tone={tone} />
          <div className={styles.headText}>
            <span className={styles.big} data-tone={tone} data-testid="credits-card-balance">{fmtCredits(balance)}</span>
            <span className={styles.sub}>AI credits left</span>
          </div>
        </div>
        <p className={styles.line}>{s.planId === 'free' ? 'Free · ' : ''}Refreshes {refreshLine(s.periodEnd, s.now)}{balance > 0 ? ` · about ${fmtCredits(aboutRenders(balance))} renders` : ''}</p>
        <div className={styles.bar} role="img" aria-label={`This month’s ${fmtCredits(plan)}, top-up ${fmtCredits(top)}, used ${fmtCredits(used)}`}>
          <i className={styles.plan} style={{ width: `${(plan / whole) * 100}%` }} />
          <i className={styles.top} style={{ width: `${(top / whole) * 100}%` }} />
        </div>
        <div className={styles.legend}>
          <span><i className={styles.dotPlan} />This month’s {fmtCredits(plan)}</span>
          {top > 0 ? <span><i className={styles.dotTop} />Top-up {fmtCredits(top)} · never expire</span> : null}
          <span><i className={styles.dotUsed} />Used {fmtCredits(used)}</span>
        </div>
        {!s.counting ? (
          <p className={styles.note} data-tone="info"><Icon name="info" size={18} weight={300} /><span>AI credits start counting{s.countingFrom ? ` on ${dayMonth(s.countingFrom)}` : ' soon'}. Nothing is charged until then — the numbers show what the studio would use.</span></p>
        ) : tone === 'empty' ? (
          <p className={styles.note} data-tone="bad"><Icon name="error" size={18} weight={300} /><span>AI tools are paused until you top up or the month refreshes. Nothing else stops.</span></p>
        ) : runOut != null && tone === 'low' ? (
          <p className={styles.note} data-tone="warn" data-testid="credits-forecast"><Icon name="schedule" size={18} weight={300} /><span>At this pace they run out around {dayMonth(runOut)}, before the refresh.</span></p>
        ) : null}
        {s.status === 'past_due' ? (
          <p className={styles.note} data-tone="bad"><Icon name="credit_card" size={18} weight={300} /><span>The last payment didn’t go through. {s.planName} stays on until {s.graceUntil ? dayMonth(s.graceUntil) : 'the grace date'}.{s.viewer.canChangePlan ? ' ' : ''}{s.viewer.canChangePlan ? <button type="button" className={styles.inlineLink} onClick={() => { onClose(); openManageBilling() }}>Update the card</button> : null}</span></p>
        ) : s.cancelAtPeriodEnd ? (
          <p className={styles.note} data-tone="warn"><Icon name="event" size={18} weight={300} /><span>{s.planName} ends on {dayMonth(s.periodEnd)}; top-ups stay.{s.viewer.canChangePlan ? ' ' : ''}{s.viewer.canChangePlan ? <button type="button" className={styles.inlineLink} disabled={pending} onClick={keep}>Keep {s.planName.replace(' — ', ' ')}</button> : null}</span></p>
        ) : s.trialEndsAt ? (
          <p className={styles.note} data-tone="info"><Icon name="event" size={18} weight={300} /><span>Pro trial · ends {dayMonth(s.trialEndsAt)}. It carries on as Pro unless you cancel.</span></p>
        ) : null}
        {s.viewer.canBuy && s.asks > 0 ? (
          <button type="button" className={styles.asks} onClick={() => go(planHref())}><Icon name="person" size={18} weight={300} /><span>{s.asks} {s.asks === 1 ? 'member is' : 'members are'} waiting for AI credits</span><Icon name="chevron_right" size={18} weight={300} /></button>
        ) : null}
        <div className={styles.rule} />
        {s.viewer.canBuy ? (
          <>
            <Button onPress={() => { onClose(); openTopUp() }} className={styles.full}>{`Buy ${fmtCredits(TOPUP_CREDITS)} AI credits · ${sgd(TOPUP_PRICE)}`}</Button>
            <p className={styles.tax}>{sgd(topupPrice(100))} per 100 · any amount to {fmtCredits(TOPUP_MAX)} · top-ups never expire · {gstLine}</p>
            {/* (pending modules S19) the studio's auto top-up, said where the balance is — never a surprise */}
            {s.autoTopUp ? <p className={styles.tax} data-testid="credits-card-auto">Auto top-up is on — under {fmtCredits(s.autoTopUp.below)} it adds {fmtCredits(s.autoTopUp.credits)}</p> : null}
          </>
        ) : (
          <>
            <p className={styles.line}>Only {s.owner.name} can buy AI credits.</p>
            {s.openAsk || asked ? <p className={styles.asked}><Icon name="check_circle" size={18} fill weight={300} />Asked {s.owner.name}</p> : <Button variant="secondary" appearance="outlined" className={styles.full} isDisabled={pending} onPress={() => ask('pool')}>{`Ask ${s.owner.name} for more`}</Button>}
          </>
        )}
        <div className={styles.links}>
          <Button appearance="text" onPress={() => go(planHref())}>See usage</Button>
          <Button appearance="text" onPress={() => { onClose(); openPlans() }}>{s.viewer.canChangePlan ? 'Change plan' : 'See plans'}</Button>
        </div>
      </div>
    )
  }

  /* ── everyone else: their own figures (1.0's redaction, integration B-03) ── */
  const capped = s.memberCap != null
  const left = Math.max(0, s.memberCapRemaining ?? 0)
  const out = capped ? left <= 0 : s.poolState === 'out'
  const waiting = !!s.openAsk || asked
  return (
    <div className={styles.inner}>
      <div className={styles.head}>
        <CreditToken size={40} level={level} tone={tone} />
        <div className={styles.headText}>
          <span className={styles.big} data-tone={tone} data-testid="credits-card-balance">{fmtCredits(capped ? left : s.memberUsed)}</span>
          <span className={styles.sub}>{capped ? 'AI credits you can use this month' : 'AI credits you’ve used this month'}</span>
        </div>
      </div>
      {capped ? <p className={styles.line}>Your monthly limit is {fmtCredits(s.memberCap ?? 0)} · set by {s.owner.name}</p> : null}
      <p className={styles.line}>{capped && left > 0 ? `About ${fmtCredits(aboutRenders(left))} renders · ` : ''}Refreshes {refreshLine(s.periodEnd, s.now)}</p>
      {!capped ? (
        <p className={styles.note} data-tone={s.poolState === 'out' ? 'bad' : s.poolState === 'low' ? 'warn' : 'info'}>
          <Icon name={s.poolState === 'ok' ? 'check_circle' : s.poolState === 'low' ? 'schedule' : 'error'} size={18} weight={300} />
          <span>{s.poolState === 'ok' ? 'The studio has AI credits for your work.' : s.poolState === 'low' ? `The studio is running low — ${s.owner.name} has been told.` : 'The studio is out of AI credits.'}</span>
        </p>
      ) : null}
      {s.status === 'past_due' ? <p className={styles.note} data-tone="warn"><Icon name="info" size={18} weight={300} /><span>The studio’s last payment didn’t go through — {s.owner.name} is on it.</span></p> : null}
      <div className={styles.rule} />
      {out ? (
        waiting ? <p className={styles.asked}><Icon name="check_circle" size={18} fill weight={300} />Asked {s.owner.name} · we’ll tell you when it’s answered</p>
          : <Button className={styles.full} isDisabled={pending} onPress={() => ask(capped ? 'monthly' : 'pool')}>{`Ask ${s.owner.name} for more`}</Button>
      ) : (
        <p className={styles.line}>{s.owner.name} can add AI credits or change your monthly limit.</p>
      )}
      <div className={styles.links}>
        <Button appearance="text" onPress={() => go(planHref())}>See my usage</Button>
        <Button appearance="text" onPress={() => { onClose(); openPlans() }}>See plans</Button>
      </div>
    </div>
  )
}
