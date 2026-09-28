'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Button, SegmentedButton, SegmentedButtonItem, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { CreditToken, fillFromEmpty } from '@/components/om/credit-token'
import { useSnackbar } from '@/components/om/snackbar'
import { askToUpgrade, completeCheckout, startPlanCheckout, type Checkout } from '@/app/credits/actions'
import { aboutRenders, dayMonth, fmtCredits, type CreditSummary } from '@/lib/credits/model'
import { allowanceFor, perMonthOnYearly, planBlock, planRow, PLAN_TAGLINE, priceFor, sgd, sgd2, suggestedPlan, TOPUP_CREDITS, TOPUP_PRICE, yearlySaving, type BillingCycle } from '@/lib/credits/plans'
import { buysFor, COMPARE, copilotLabel, FAQ, type CompareCell } from '@/lib/credits/pricing-data'
import { CheckoutPanel, PayLine, type PayStatus } from './credit-dialogs'
import { holdRail, openManageBilling, openTopUp, seedCredits } from './credits-client'
import type { CreditsChrome } from '@/lib/credits/chrome'
import styles from './plans-dialog.module.css'

/**
 * (REG-702, AI credits §5.3 · Q-10…Q-19) Plans — the website's pricing, inside the app (the owner's brief: "within our platform without
 * redirecting … since the user is logged in"). The house xxl modal over the page you're on, so the unfinished render waits underneath;
 * four steps in the one frame — Choose · Review · Pay · Done. It knows the studio: *Your plan*, the plan that *fits your team of 7*, why
 * Freelance won't do, seats one per active member (Q-12 · Q-13), the trial and annual said in S$ (Q-16 · Q-17). The content is the
 * website's own (lib/credits/pricing-data.ts, integration B-25), in 2.0's words. Only the Owner changes the plan (1.0's rule); everyone
 * else reads it and can ask. Pay is the demo stand-in for Dodo's overlay (Q-14). Done counts the credits in; closing lets the rail's
 * gem make its last turn (§5.4).
 */
type Step = 'choose' | 'review' | 'pay' | 'done'
const STEPS: { key: Step; label: string }[] = [{ key: 'choose', label: 'Choose' }, { key: 'review', label: 'Review' }, { key: 'pay', label: 'Pay' }, { key: 'done', label: 'Done' }]

export function PlansDialog({ open, onClose, chrome, summary, onTalk }: { open: boolean; onClose: () => void; chrome: CreditsChrome; summary: CreditSummary; onTalk: () => void }) {
  const snackbar = useSnackbar()
  const s = summary
  const current = s.planId
  const team = s.activeMembers
  const [step, setStep] = useState<Step>('choose')
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [kind, setKind] = useState<'pro_studio' | 'pro_freelance'>(() => suggestedPlan(team) as 'pro_studio' | 'pro_freelance')
  const [seats, setSeats] = useState(() => Math.max(3, team))
  const [trial, setTrial] = useState(false)
  const [compare, setCompare] = useState(false)
  const [faq, setFaq] = useState<number | null>(0)
  const [checkout, setCheckout] = useState<Checkout | null>(null)
  const [pay, setPay] = useState<PayStatus>('idle')
  const [payError, setPayError] = useState<string | null>(null)
  const [done, setDone] = useState<{ granted: number; balance: number; planName: string; seats: number; periodEnd: number; trialEndsAt: number | null } | null>(null)
  const [pending, start] = useTransition()
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {   // every opening starts at Choose, on the studio's own numbers (render-phase adjust)
    setWasOpen(open)
    if (open) { setStep('choose'); setCycle(s.planId !== 'free' ? (s.billingCycle as BillingCycle) : 'monthly'); setKind(current === 'pro_freelance' ? 'pro_freelance' : suggestedPlan(team) as 'pro_studio' | 'pro_freelance'); setSeats(current === 'pro_studio' ? Math.max(3, s.seats) : Math.max(3, team)); setTrial(false); setCheckout(null); setPay('idle'); setPayError(null); setDone(null) }
  }
  /* the rail keeps Upgrade while Plans is open; closing lets the upgrade moment play */
  useEffect(() => { if (open) holdRail(true); return () => { if (open) holdRail(false) } }, [open])

  const plan = planRow(kind)
  const block = planBlock(plan, team)
  const isCurrent = current === kind && (kind !== 'pro_studio' || s.seats === seats) && s.status !== 'past_due'
  const trialOk = chrome.trialAvailable && current === 'free' && cycle === 'monthly' && plan.trialPeriodDays > 0
  const price = priceFor(plan, seats, cycle)
  const credits = allowanceFor(plan, seats)
  const may = s.viewer.canChangePlan

  const next = () => start(async () => {
    if (step === 'choose') { setStep('review'); return }
    if (step === 'review') {
      const r = await startPlanCheckout({ planId: kind, seats, cycle, trial: trialOk && trial })
      if ('error' in r) { snackbar({ message: r.error }); return }
      setCheckout(r); setPay('idle'); setPayError(null); setStep('pay')
    }
  })
  const payNow = () => start(async () => {
    if (!checkout) return
    setPay('wait'); setPayError(null)
    await new Promise((r) => setTimeout(r, 900))   // the demo's payment confirmation (1.0's overlay polls every 2 s)
    const r = await completeCheckout(checkout.sessionId, { trial: checkout.trial })
    if ('error' in r) { setPay('error'); setPayError(r.error); return }
    setPay('ok')
    seedCredits(r.summary)
    setDone({ granted: r.granted, balance: r.summary.balance ?? r.granted, planName: r.summary.planName, seats: r.summary.seats, periodEnd: r.summary.periodEnd, trialEndsAt: r.summary.trialEndsAt })
    setTimeout(() => setStep('done'), 450)
  })
  const ask = () => start(async () => {
    const r = await askToUpgrade(kind)
    if ('error' in r) { snackbar({ message: r.error }); return }
    onClose(); snackbar({ message: `Asked ${r.owner} to move the studio to ${plan.name}` })
  })

  const subtitle = (
    <span className={styles.steps} aria-label={`Step ${STEPS.findIndex((x) => x.key === step) + 1} of 4`}>
      {STEPS.map((x, i) => <span key={x.key} data-on={x.key === step || undefined}>{i ? <span className={styles.sep} aria-hidden> · </span> : null}{x.label}</span>)}
    </span>
  )
  let body: React.ReactNode = null, foot: React.ReactNode = null
  if (step === 'choose') {
    body = (
      <div className={styles.choose} data-testid="plans-choose">
        <p className={styles.context}>
          <CreditToken size={20} level={1} />
          <span>You’re on <b>{s.planName}</b>{s.status === 'trialing' && s.trialEndsAt ? ` · trial ends ${dayMonth(s.trialEndsAt)}` : ''}{s.viewer.trusted && s.balance != null ? ` · ${fmtCredits(s.balance)} AI credits left · ${current === 'free' ? `${fmtCredits(planRow('free').creditAllowance)} more` : 'refreshes'} on ${dayMonth(s.periodEnd)}` : ''}</span>
        </p>
        <div className={styles.toolbar}>
          <SegmentedButton aria-label="Billing" selectedKeys={[cycle]} onSelectionChange={(k) => { const v = [...k][0]; if (v === 'monthly' || v === 'yearly') setCycle(v) }}>
            <SegmentedButtonItem id="monthly">Monthly</SegmentedButtonItem>
            <SegmentedButtonItem id="yearly">Annual · 1 month free</SegmentedButtonItem>
          </SegmentedButton>
          <span className={styles.tax}>Prices in S$ · {chrome.gstLine}</span>
        </div>
        <div className={styles.cards}>
          {/* Free */}
          <article className={styles.card} data-testid="plan-free">
            <div className={styles.cardTop}><h3>Free</h3>{current === 'free' ? <span className={styles.tag}>Your plan</span> : null}</div>
            <p className={styles.tagline}>{PLAN_TAGLINE.free}</p>
            <div className={styles.price}><span className={styles.v}>S$0</span><span className={styles.per}>forever</span></div>
            <p className={styles.note}>1 seat</p>
            <p className={styles.allow}><CreditToken size={18} /><span>150 AI credits to start, then 30 a month <span className={styles.m}>· about 3 renders a month</span></span></p>
            <div className={styles.cta}>{current === 'free' ? <Button variant="secondary" appearance="outlined" isDisabled className={styles.full}>Your plan</Button> : <Button variant="secondary" appearance="outlined" className={styles.full} onPress={() => { onClose(); openManageBilling() }}>Move to Free in Manage billing</Button>}</div>
          </article>
          {/* Pro */}
          <article className={`${styles.card} ${styles.sel}`} data-testid="plan-pro">
            <div className={styles.cardTop}>
              <h3>Pro</h3>
              {current === kind ? <span className={styles.tag}>Your plan</span> : kind === suggestedPlan(team) ? <span className={styles.fit}><Icon name="check" size={16} />{team > 1 ? `Fits your team of ${team}` : 'Fits a studio of one'}</span> : null}
            </div>
            <p className={styles.tagline}>{PLAN_TAGLINE.pro}</p>
            <SegmentedButton aria-label="Studio size" selectedKeys={[kind]} onSelectionChange={(k) => { const v = [...k][0]; if (v === 'pro_studio' || v === 'pro_freelance') setKind(v) }}>
              <SegmentedButtonItem id="pro_freelance">Freelance</SegmentedButtonItem>
              <SegmentedButtonItem id="pro_studio">Studio</SegmentedButtonItem>
            </SegmentedButton>
            <div className={styles.price}><span className={styles.v} data-testid="plan-price">{sgd(price)}</span><span className={styles.per}>/{cycle === 'yearly' ? 'year' : 'month'}</span></div>
            <p className={styles.note}>{kind === 'pro_studio' ? `${seats} seats · S$100 covers 3, then S$35 each` : '1 seat'}{cycle === 'yearly' ? ` · ${sgd(perMonthOnYearly(plan, seats))} a month, saves ${sgd(yearlySaving(plan, seats))}` : ''}</p>
            <p className={styles.allow}><CreditToken size={18} /><span>{fmtCredits(credits)} AI credits a month{kind === 'pro_studio' ? ', shared' : ''} <span className={styles.m}>· about {fmtCredits(aboutRenders(credits))} renders</span></span></p>
            {block ? <p className={styles.why} data-testid="plan-why">{block} Studio shares its credits across every seat.</p> : trialOk ? <p className={styles.note}>14-day free trial · card up front · one per studio</p> : null}
            <div className={styles.cta}>{block ? <Button isDisabled className={styles.full}>{`Not for a team of ${team}`}</Button> : isCurrent ? <Button variant="secondary" appearance="outlined" isDisabled className={styles.full}>Your plan</Button> : <span className={styles.selected}><Icon name="check" size={20} />Selected</span>}</div>
          </article>
          {/* Max */}
          <article className={styles.card} data-testid="plan-max">
            <div className={styles.cardTop}><h3>Max</h3>{current === 'max' ? <span className={styles.tag}>Your plan</span> : null}</div>
            <p className={styles.tagline}>{PLAN_TAGLINE.max}</p>
            <div className={styles.price}><span className={`${styles.v} ${styles.talk}`}>Let’s talk</span></div>
            <p className={styles.note}>Priced per seat, against a signed agreement.</p>
            <p className={styles.allow}><CreditToken size={18} /><span>3,000 AI credits a month, per seat <span className={styles.m}>· about 300 renders</span></span></p>
            <div className={styles.cta}><Button variant="secondary" appearance="outlined" className={styles.full} onPress={onTalk}>Talk to us</Button></div>
          </article>
        </div>
        {s.viewer.canBuy ? (
          <p className={styles.few}>Just need a few more? <Button appearance="text" onPress={() => { onClose(); openTopUp() }}>{`${fmtCredits(TOPUP_CREDITS)} AI credits · ${sgd(TOPUP_PRICE)}`}</Button><span className={styles.m}>Top-ups never expire, on any plan.</span></p>
        ) : null}
        <section className={styles.section} aria-label="What your AI credits buy">
          <h4>What your AI credits buy</h4>
          <div className={styles.tableBox}>
            <table className={styles.table}>
              <thead><tr><th>A month of</th><th>Renders</th><th>Quotes read</th><th>Meeting Co-Pilot</th></tr></thead>
              <tbody>
                {[['Free', 30, current === 'free'], ['Pro Freelance', 1500, current === 'pro_freelance'], [`Pro Studio, ${seats} seats`, allowanceFor(planRow('pro_studio'), seats), current === 'pro_studio' || kind === 'pro_studio'], ['Max, per seat', 3000, current === 'max']].map(([label, c, on]) => {
                  const b = buysFor(c as number)
                  return <tr key={label as string} data-on={on || undefined}><td>{label as string} · {fmtCredits(c as number)}</td><td>{fmtCredits(b.renders)}</td><td>{fmtCredits(b.quotes)}</td><td>{copilotLabel(b.copilotHours)}</td></tr>
                })}
              </tbody>
            </table>
          </div>
          <p className={styles.m}>A Fast render is 10, High is 20, reading a quote is 5, and ten minutes of Meeting Co-Pilot is 25. This month’s credits are used first; top-ups never expire.</p>
        </section>
        <section className={styles.acc} data-open={compare || undefined}>
          <button type="button" className={styles.accHead} aria-expanded={compare} onClick={() => setCompare((c) => !c)}>Compare everything<Icon name="expand_more" size={20} /></button>
          {compare ? (
            <div className={styles.tableBox}>
              <table className={styles.table}>
                <thead><tr><th className={styles.wide}></th><th>Free</th><th data-pro>Pro</th><th>Max</th></tr></thead>
                <tbody>
                  {COMPARE.map((g) => [
                    <tr key={g.group}><td colSpan={4} className={styles.group}>{g.group}</td></tr>,
                    ...g.rows.map((r) => <tr key={`${g.group}-${r.label}`}><td>{r.label}</td><Cell v={r.free} /><Cell v={r.pro} pro /><Cell v={r.max} /></tr>),
                  ])}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
        <section className={styles.faq} aria-label="Questions">
          <h4>Questions</h4>
          {FAQ.map((f, i) => (
            <div key={f.q} className={styles.acc} data-open={faq === i || undefined}>
              <button type="button" className={styles.accHead} aria-expanded={faq === i} onClick={() => setFaq((x) => (x === i ? null : i))}>{f.q}<Icon name="expand_more" size={20} /></button>
              {faq === i ? <p className={styles.answer}>{f.a}</p> : null}
            </div>
          ))}
        </section>
      </div>
    )
    foot = (
      <>
        <span className={styles.sum}>{plan.name}{kind === 'pro_studio' ? ` · ${seats} seats` : ''} · {sgd(price)} a {cycle === 'yearly' ? 'year' : 'month'}<span className={styles.m}> · you review before paying</span></span>
        <Button onPress={next} isDisabled={!!block || isCurrent || pending} data-testid="plans-continue">Continue</Button>
      </>
    )
  } else if (step === 'review') {
    const today = trialOk && trial ? 0 : price
    body = (
      <div className={styles.review} data-testid="plans-review">
        <div className={styles.box}>
          <h3>{plan.name}</h3>
          <p className={styles.tagline}>{PLAN_TAGLINE.pro}</p>
          <div className={styles.field}>
            <div><b>Billing</b><span className={styles.m}>{cycle === 'yearly' ? `${sgd(perMonthOnYearly(plan, seats))} a month · one month free` : 'Month to month · cancel anytime'}</span></div>
            <SegmentedButton aria-label="Billing" selectedKeys={[cycle]} onSelectionChange={(k) => { const v = [...k][0]; if (v === 'monthly' || v === 'yearly') setCycle(v) }}>
              <SegmentedButtonItem id="monthly">Monthly</SegmentedButtonItem>
              <SegmentedButtonItem id="yearly">Annual</SegmentedButtonItem>
            </SegmentedButton>
          </div>
          {kind === 'pro_studio' ? (
            <div className={styles.field}>
              <div><b>Seats</b><span className={styles.m}>{team} {team === 1 ? 'member is' : 'members are'} active — one seat each is the usual</span></div>
              <span className={styles.stepper} data-testid="plans-seats">
                <Tooltip label="Fewer seats"><IconButton icon="remove" label="Fewer seats" variant="bare" disabled={seats <= plan.minSeats} onClick={() => setSeats((n) => Math.max(plan.minSeats, n - 1))} /></Tooltip>
                <b aria-live="polite">{seats}</b>
                <Tooltip label="More seats"><IconButton icon="add" label="More seats" variant="bare" onClick={() => setSeats((n) => Math.min(200, n + 1))} /></Tooltip>
              </span>
            </div>
          ) : null}
          <div className={styles.field}>
            <div><b>Start with 14 days free</b><span className={styles.m}>{!chrome.trialAvailable ? 'The studio has had its free trial' : cycle === 'yearly' ? 'The free trial is for monthly plans' : current !== 'free' ? 'The trial is for studios moving up from Free' : 'Card up front · nothing charged for 14 days'}</span></div>
            <span className={styles.switch}><Switch size="sm" isSelected={trialOk && trial} isDisabled={!trialOk} aria-label="Start with 14 days free" onChange={(on: boolean) => setTrial(on)} /></span>
          </div>
        </div>
        <div>
          <ul className={styles.changes}>
            <li><Icon name="diamond" size={20} weight={300} /><span><b>{fmtCredits(credits)} AI credits every month</b>{kind === 'pro_studio' ? `, shared by your ${seats} seats` : ''} — about {fmtCredits(aboutRenders(credits))} renders</span></li>
            <li><Icon name="event" size={20} weight={300} /><span>They refresh on the same day each month. Unused ones don’t carry over.</span></li>
            {s.viewer.trusted && (s.topupCredits ?? 0) > 0 ? <li><Icon name="check_circle" size={20} weight={300} /><span>Your {fmtCredits(s.topupCredits ?? 0)} top-up credits stay — they never expire.</span></li> : null}
            {kind === 'pro_studio' ? <li><Icon name="person_add" size={20} weight={300} /><span>More members later add seats for S$35 a month each.</span></li> : null}
          </ul>
          <div className={styles.money}>
            <div><span>Today</span><b data-testid="plans-today">{sgd2(today)}</b></div>
            <div><span>Then</span><span>{trialOk && trial ? `${sgd(price)} after the 14 days, unless you cancel` : `${sgd(price)} ${cycle === 'yearly' ? 'a year' : 'a month'}, on the same date`}</span></div>
            <p className={styles.m}>{chrome.billing.name}{chrome.billing.uen ? ` · UEN ${chrome.billing.uen}` : ''} · {chrome.gstLine}</p>
          </div>
          {!may ? <p className={styles.readOnly}><Icon name="lock" size={16} weight={300} />Only {s.owner.name} can change the plan.</p> : null}
        </div>
      </div>
    )
    foot = (
      <>
        <Button appearance="text" iconStart={<Icon name="arrow_back" size={20} />} onPress={() => setStep('choose')}>Back</Button>
        {may ? <Button onPress={next} isDisabled={pending} data-testid="plans-pay">{trialOk && trial ? 'Start the free trial' : `Pay ${sgd(price)}`}</Button>
          : <Button onPress={ask} isDisabled={pending}>{`Ask ${s.owner.name}`}</Button>}
      </>
    )
  } else if (step === 'pay' && checkout) {
    body = <div className={styles.payStep}><CheckoutPanel amount={checkout.amount} forWhat={checkout.forWhat} trial={checkout.trial} billing={chrome.billing} status={pay} error={payError} onPay={payNow} /></div>
    foot = <><Button appearance="text" iconStart={<Icon name="arrow_back" size={20} />} isDisabled={pay === 'wait' || pay === 'ok'} onPress={() => setStep('review')}>Back</Button><PayLine status={pay} /></>
  } else if (step === 'done' && done) {
    body = <DoneStep done={done} />
    foot = <><span className={styles.m}>The receipt and the tax invoice are in Company › Plan &amp; AI credits</span><Button onPress={onClose} data-testid="plans-back-to-work">Back to work</Button></>
  }
  return (
    <Dialog open={open} onClose={onClose} title="Plans" subtitle={subtitle} size="modal" fluid portal footer={<div className={styles.foot}>{foot}</div>}>
      {body}
    </Dialog>
  )
}

function Cell({ v, pro = false }: { v: CompareCell; pro?: boolean }) {
  return <td data-pro={pro || undefined}>{v === true ? <Icon name="check" size={18} /> : v === false ? <span className={styles.no} aria-label="Not included">—</span> : v}</td>
}

/** Done: the credits count in and the spark fills (the upgrade moment's first half; the rail's comes on close). */
function DoneStep({ done }: { done: { granted: number; balance: number; planName: string; seats: number; periodEnd: number; trialEndsAt: number | null } }) {
  const [n, setN] = useState(0)
  const fill = useRef<SVGCircleElement | null>(null)
  useEffect(() => {
    const to = done.balance, t0 = performance.now(), ms = 1100
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { const id = requestAnimationFrame(() => setN(to)); return () => cancelAnimationFrame(id) }
    let raf = 0
    const step = (t: number) => { const k = Math.min(1, (t - t0) / ms); setN(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    const unfill = fillFromEmpty(fill.current)   // (REG-710) the ring round the spark grows from empty as the number counts up
    return () => { cancelAnimationFrame(raf); unfill() }
  }, [done.balance])
  return (
    <div className={styles.done} data-testid="plans-done">
      <CreditToken size={88} level={1} fillRef={(el) => { fill.current = el }} />
      <h3>You’re on {done.planName.replace(' — Studio', '').replace(' — Freelance', '')}{done.trialEndsAt ? ' — free until ' + dayMonth(done.trialEndsAt) : ''}</h3>
      <div className={styles.count} data-testid="plans-count">{fmtCredits(n)}</div>
      <p className={styles.m}>AI credits</p>
      <ul>
        {done.seats > 1 ? <li>Your {done.seats} seats share them</li> : null}
        <li>They refresh on {dayMonth(done.periodEnd)}</li>
        <li>Top-ups never expire</li>
      </ul>
    </div>
  )
}
