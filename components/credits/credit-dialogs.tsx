'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { CreditToken } from '@/components/om/credit-token'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { askForCredits, cancelAtPeriodEnd, completeCheckout, keepPlan, startTopUp, talkToUs, updateCard } from '@/app/credits/actions'
import { dayMonth, fmtCredits, refreshLine, type CreditSummary, type Refusal } from '@/lib/credits/model'
import { digitsOnly, isSgPhone, phoneTyped } from '@/lib/format'
import { MSG } from '@/lib/forms'
import { planRow, priceFor, sgd, sgd2, TOPUP_CREDITS, TOPUP_MAX, TOPUP_MIN, TOPUP_PICKS, TOPUP_STEP, topupFor, topupPrice, type BillingCycle } from '@/lib/credits/plans'
import { aboutRenders } from '@/lib/credits/schedule'
import { Chips } from '@/components/om/chips'
import { CountStepper } from './count-stepper'
import { openPlans, planHref, refreshCredits, seedCredits, type CreditWork } from './credits-client'
import type { CreditsChrome } from '@/lib/credits/chrome'
import styles from './credit-dialogs.module.css'
import { leaveThen } from '@/components/company/leave-guard'   // (pending modules S16) unsaved Company / Settings edits ask before the move (REG-791)
import { noteUpgradeMoment } from '@/app/credits/nudge-actions'   // (pending modules S41b-4) the Owner's blocking moment restarts the offers' gap
import { WELCOME_ENDED_TITLE, welcomeEndedLine } from '@/lib/credits/nudge-model'

/**
 * (REG-702 · 703) The credits dialogs — all on the house Dialog (a bottom sheet on a phone, REG-353):
 *  · CheckoutPanel — the demo stand-in for Dodo's overlay (Q-14): the amount, what it's for, the studio's billing details filled in
 *    (E-19), and one clearly labelled demo press — no card fields, ever;
 *  · TopUpDialog — 1.0's one product, 1,000 AI credits for S$20 (integration B-05);
 *  · CreditBlockDialog — the moments when credits run short (§5.6): the way on is inside the dialog, the work waits underneath;
 *  · ManageBillingDialog — the stand-in for Dodo's customer portal (integration B-20): the plan, the card, cancel at the period's end;
 *  · TalkToUsDialog — Max is arranged with the team (Q-18).
 */

export type PayStatus = 'idle' | 'wait' | 'ok' | 'error'
export function CheckoutPanel({ amount, forWhat, trial, billing, status, error, onPay }: { amount: number; forWhat: string; trial: boolean; billing: CreditsChrome['billing']; status: PayStatus; error?: string | null; onPay: () => void }) {
  return (
    <section className={styles.checkout} aria-label="Secure checkout" data-testid="demo-checkout">
      <div className={styles.checkoutHead}><span><Icon name="lock" size={18} weight={300} />Secure checkout</span><span className={styles.muted}>Dodo Payments</span></div>
      <div className={styles.checkoutBody}>
        <div>
          <div className={styles.amount}>{sgd2(amount)}</div>
          <div className={styles.muted}>{forWhat}{trial ? ' · 14 days free, then monthly' : ''}</div>
        </div>
        <dl className={styles.billTo}>
          <dt>Billed to</dt><dd>{billing.name}{billing.uen ? ` · UEN ${billing.uen}` : ''}</dd>
          {billing.gstRegistered && billing.gstReg ? <><dt>GST number</dt><dd>{billing.gstReg}</dd></> : null}
          {billing.email ? <><dt>Receipt to</dt><dd>{billing.email}</dd></> : null}
        </dl>
        <p className={styles.demo}><Icon name="info" size={18} weight={300} /><span>This is the prototype, so no card is taken. In the live app, Dodo’s own payment window opens here, inside the app.</span></p>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <Button onPress={onPay} isDisabled={status === 'wait' || status === 'ok'} className={styles.full}>{status === 'wait' ? 'Paying…' : trial ? 'Start the demo trial' : 'Complete demo payment'}</Button>
      </div>
    </section>
  )
}

export function PayLine({ status }: { status: PayStatus }) {
  if (status === 'wait') return <span className={styles.status} role="status"><span className={styles.spin} aria-hidden />Waiting for payment confirmation…</span>
  if (status === 'ok') return <span className={styles.status} role="status" data-tone="ok"><Icon name="check_circle" size={18} fill weight={300} />Payment received</span>
  return <span className={styles.status} role="status">Nothing is charged until you pay</span>
}

/**
 * The top-up — (pending modules S19) 1.0's own buy since 2026-09-28: any amount from 100 to 5,000 AI credits in fifties, at S$2 per 100,
 * starting on 1,000 (or on what the blocked work needs). The quick amounts and the −/+ steppers set it (1.0's picker: no free typing, so
 * nothing is snapped behind the buyer's back); the price follows before the press. `then` runs the blocked work once the credits are in
 * (Q-33 — "Buy and render").
 */
export function TopUpDialog({ open, onClose, chrome, then, nested = false, credits: start = TOPUP_CREDITS }: { open: boolean; onClose: () => void; chrome: CreditsChrome; then?: (() => void) | null; nested?: boolean; credits?: number }) {
  const snackbar = useSnackbar()
  const [status, setStatus] = useState<PayStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [credits, setCredits] = useState(start)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setStatus('idle'); setError(null); setCredits(start) } }
  const busy = status === 'wait' || status === 'ok'
  const pay = async () => {
    setStatus('wait'); setError(null)
    const s = await startTopUp({ credits })
    if ('error' in s) { setStatus('error'); setError(s.error); return }
    if (s.payUrl) { window.location.assign(s.payUrl); return }   // (pending modules S34) a real payment provider's own checkout page
    await new Promise((r) => setTimeout(r, 900))   // the demo's payment confirmation (1.0 polls every 2 s)
    const done = await completeCheckout(s.sessionId)
    if ('error' in done) { setStatus('error'); setError(done.error); return }
    seedCredits(done.summary); setStatus('ok')
    setTimeout(() => {
      onClose()
      snackbar({ key: 'credits-added', message: then ? `${fmtCredits(credits)} AI credits added — carrying on` : `${fmtCredits(credits)} AI credits added` })
      then?.()
    }, 500)
  }
  const pick = (v: string) => { const n = Number(v); if (Number.isFinite(n)) setCredits(n) }
  return (
    <Dialog open={open} onClose={onClose} title="Buy AI credits" size="modal" width={440} nested={nested} portal={nested}
            footer={<PayLine status={status} />}>
      <div className={styles.topup} data-testid="topup">
        <section className={styles.amountPick} aria-label="How many AI credits">
          <Chips options={TOPUP_PICKS.map((n) => ({ value: String(n), label: fmtCredits(n) }))} value={(TOPUP_PICKS as readonly number[]).includes(credits) ? String(credits) : null} onChange={pick}
                 label="AI credits to buy" disabled={busy} testId="topup-picks" />
          <div className={styles.amountRow}>
            <CountStepper value={credits} min={TOPUP_MIN} max={TOPUP_MAX} step={TOPUP_STEP} onChange={setCredits} less={`${TOPUP_STEP} fewer AI credits`} more={`${TOPUP_STEP} more AI credits`}
                          format={fmtCredits} wide disabled={busy} testId="topup-amount" />
            <span className={styles.muted}>AI credits · about {fmtCredits(aboutRenders(credits))} renders</span>
          </div>
          <p className={styles.meta}>{sgd(topupPrice(100))} per 100 AI credits · {fmtCredits(TOPUP_MIN)} to {fmtCredits(TOPUP_MAX)} · top-ups never expire</p>
        </section>
        <CheckoutPanel amount={topupPrice(credits)} forWhat={`${fmtCredits(credits)} AI credits · about ${fmtCredits(aboutRenders(credits))} renders · never expire`} trial={false} billing={chrome.billing} status={status} error={error} onPay={() => { void pay() }} />
      </div>
    </Dialog>
  )
}

/** The moments when credits run short (§5.6). */
export function CreditBlockDialog({ open, onClose, summary, refusal, what, needed, smaller, onBuy }: {
  open: boolean; onClose: () => void; summary: CreditSummary; refusal: Refusal | null; what: CreditWork; needed: number
  smaller: { label: string; run: () => void } | null
  /** The Owner's "Buy 1,000 and carry on" — opens the top-up over this dialog. */
  onBuy: () => void
}) {
  const snackbar = useSnackbar()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [asked, setAsked] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setAsked(false) }
  /* (pending modules S41b-4 — 1.0's D4) the Owner on Free met a refusal: no upgrade offer follows it for ten minutes; the welcome credits
     running out (T8) are said here, once, and never again in the bell */
  const moment = open && refusal?.error === 'insufficient_credits' && summary.viewer.canBuy && summary.planId === 'free' ? (refusal.welcome ? 'T8' : refusal.balance === 0 ? 'T13' : 'T14') : null
  useEffect(() => { if (moment) void noteUpgradeMoment({ trigger: moment }).catch(() => {}) }, [moment, refusal])
  if (!refusal) return null
  const s = summary, owner = s.owner.name
  const noun = what === 'render' ? 'render' : what === 'meeting' ? 'next 10 minutes of the co-pilot' : 'quote read'   // (pending modules S23)
  const ask = (kind: 'pool' | 'monthly') => start(async () => {
    const r = await askForCredits({ kind, needed })
    if ('error' in r) { snackbar({ message: r.error }); return }
    setAsked(true); void refreshCredits()
  })
  const month = new Date(s.now).toLocaleString('en-SG', { month: 'long' })
  let title = 'Out of AI credits', body: React.ReactNode = null, foot: React.ReactNode = null
  if (refusal.error === 'member_cap_reached') {
    /* §5.6: all of it used → "You’ve used your 600 for September"; some left but not enough → "Needs 20 — you can use 15" */
    title = refusal.remaining > 0 ? `Needs ${fmtCredits(refusal.needed)} — you can use ${fmtCredits(refusal.remaining)}` : `You’ve used your ${fmtCredits(refusal.cap)} for ${month}`
    body = <>
      <p className={styles.p}>This {noun} needs <b>{fmtCredits(refusal.needed)}</b>{refusal.remaining > 0 ? <> and you have <b>{fmtCredits(refusal.remaining)}</b> of your {fmtCredits(refusal.cap)} left this month</> : null}. The studio’s credits are untouched — {owner} sets each person’s monthly amount.</p>
      <Meter used={refusal.cap - refusal.remaining} of={refusal.cap} tone="warn" line={`${fmtCredits(refusal.cap - refusal.remaining)} of ${fmtCredits(refusal.cap)} used · yours refreshes ${refreshLine(s.periodEnd, s.now)}`} />
      {asked || s.openAsk ? <p className={styles.asked}><Icon name="check_circle" size={18} fill weight={300} />Asked {owner} · we’ll tell you when it’s answered. Your changes are kept.</p> : null}
    </>
    foot = s.viewer.canSetAmounts ? <><Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button><Button onPress={() => { onClose(); leaveThen(() => router.push(planHref(`?member=${s.viewer.id}`))) }}>Change my monthly amount</Button></>
      : <><Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button>{smaller ? <Button variant="secondary" appearance="outlined" onPress={() => { onClose(); smaller.run() }}>{smaller.label}</Button> : null}{asked || s.openAsk ? null : <Button isDisabled={pending} onPress={() => ask('monthly')}>{`Ask ${owner} for more`}</Button>}</>
  } else if (refusal.error === 'insufficient_credits') {
    const bal = refusal.balance
    if (refusal.welcome) title = WELCOME_ENDED_TITLE   // (pending modules S41b-4) T8 in place of T13, once
    body = <>
      <p className={styles.p}>This {noun} needs <b>{fmtCredits(refusal.needed)}</b>.{bal != null ? <> {s.viewer.trusted ? 'The studio has' : 'There are'} <b>{fmtCredits(bal)}</b> left.</> : null} {s.viewer.canBuy ? '' : `${owner} can add AI credits.`}</p>
      {refusal.welcome ? <p className={styles.p} data-testid="credit-block-welcome">{welcomeEndedLine()}</p> : null}
      {bal != null && s.allowance ? <Meter used={Math.max(0, s.allowance - bal)} of={s.allowance} tone="bad" line={`${fmtCredits(bal)} left · refreshes ${refreshLine(s.periodEnd, s.now)}`} /> : <p className={styles.meta}>The month refreshes {refreshLine(s.periodEnd, s.now)}.</p>}
      {s.viewer.canBuy ? <p className={styles.meta}>{what === 'meeting' ? 'The co-pilot carries on' : `Your ${noun} starts`} as soon as the credits are in · top-ups never expire.</p> : <p className={styles.meta}>{what === 'meeting' ? 'Your notes are kept — the co-pilot carries on when credits are in.' : 'Your changes are kept — we’ll tell you when credits are in.'}</p>}
      {asked || s.openAsk ? <p className={styles.asked}><Icon name="check_circle" size={18} fill weight={300} />Asked {owner}</p> : null}
    </>
    foot = s.viewer.canBuy
      ? <><Button appearance="text" onPress={() => { onClose(); openPlans() }}>See plans</Button>{smaller ? <Button variant="secondary" appearance="outlined" onPress={() => { onClose(); smaller.run() }}>{smaller.label}</Button> : null}<Button onPress={onBuy}>{`Buy ${fmtCredits(topupFor(refusal.needed))} and ${what === 'render' ? 'render' : what === 'meeting' ? 'carry on' : 'read'} · ${sgd(topupPrice(topupFor(refusal.needed)))}`}</Button></>
      : <><Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button>{smaller ? <Button variant="secondary" appearance="outlined" onPress={() => { onClose(); smaller.run() }}>{smaller.label}</Button> : null}{asked || s.openAsk ? null : <Button isDisabled={pending} onPress={() => ask('pool')}>{`Ask ${owner}`}</Button>}</>
  }
  return (
    <Dialog open={open} onClose={onClose} title={title} size="modal" width={400} footer={<div className={styles.foot}>{foot}</div>}>
      <div className={styles.block} data-testid="credit-block">{body}</div>
    </Dialog>
  )
}
function Meter({ used, of, tone, line }: { used: number; of: number; tone: 'warn' | 'bad'; line: string }) {
  const left = Math.max(0, of - used)
  return (
    <div>
      <div className={styles.meter}><i data-tone={tone} style={{ width: `${Math.max(2, Math.min(100, (tone === 'bad' ? left / Math.max(1, of) : used / Math.max(1, of)) * 100))}%` }} /></div>
      <p className={styles.meta}>{line}</p>
    </div>
  )
}

/** The stand-in for Dodo's customer portal (integration B-20): the plan, the card, cancel at the period's end, keep it. Owner only. */
export function ManageBillingDialog({ open, onClose, summary }: { open: boolean; onClose: () => void; summary: CreditSummary }) {
  const snackbar = useSnackbar()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirm, setConfirm] = useState(false)
  const s = summary, plan = planRow(s.planId)
  const price = priceFor(plan, s.seats, s.billingCycle as BillingCycle)
  const run = (fn: () => Promise<{ ok: true } | { ok: true; until: number } | { ok: true; url: string } | { error: string }>, done: string) => start(async () => {
    const r = await fn()
    if ('error' in r) { snackbar({ message: r.error }); return }
    if ('url' in r) { window.open(r.url, '_blank', 'noopener'); return }   // (pending modules S34) a real provider's own billing page
    void refreshCredits(); router.refresh(); snackbar({ message: done })
  })
  return (
    <>
      <Dialog open={open} onClose={onClose} title="Manage billing" subtitle="Dodo Payments’ billing page — in the live app it opens in a new tab" size="modal" width={560}
              footer={<Button variant="secondary" appearance="outlined" onPress={onClose}>Done</Button>}>
        <div className={styles.portal} data-testid="manage-billing">
          <section className={styles.portalRow}>
            <div><b>{s.planName}{plan.id === 'pro_studio' ? ` · ${s.seats} seats` : ''}</b><span className={styles.muted}>{s.planId === 'free' ? 'Free · no card on file' : `${sgd(price)} a ${s.billingCycle === 'yearly' ? 'year' : 'month'} · ${s.cancelAtPeriodEnd ? `ends ${dayMonth(s.periodEnd)}` : s.trialEndsAt ? `trial ends ${dayMonth(s.trialEndsAt)}` : `renews ${dayMonth(s.periodEnd)}`}`}</span></div>
            {s.planId === 'free' ? <Button onPress={() => { onClose(); openPlans() }}>See plans</Button>
              : s.cancelAtPeriodEnd ? <Button isDisabled={pending || !s.viewer.canChangePlan} onPress={() => run(keepPlan, `${s.planName} stays on`)}>{`Keep ${s.planName}`}</Button>
              : <Button variant="secondary" appearance="outlined" isDisabled={pending || !s.viewer.canChangePlan} onPress={() => setConfirm(true)}>Cancel at the period’s end</Button>}
          </section>
          {s.planId !== 'free' ? (
            <section className={styles.portalRow}>
              <div><b>Payment method</b><span className={styles.muted}>Visa ending 4242 · expires 08/28 (demo)</span></div>
              <Button variant={s.status === 'past_due' ? 'primary' : 'secondary'} appearance={s.status === 'past_due' ? 'filled' : 'outlined'} isDisabled={pending || !s.viewer.canChangePlan}
                      onPress={() => run(updateCard, s.status === 'past_due' ? 'Card updated — the payment went through' : 'Card updated')}>{s.status === 'past_due' ? `Update the card and pay ${sgd(price)}` : 'Update card'}</Button>
            </section>
          ) : null}
          {s.status === 'past_due' ? <p className={styles.warn}><Icon name="credit_card" size={18} weight={300} />The last payment didn’t go through. {s.planName} stays on until {s.graceUntil ? dayMonth(s.graceUntil) : 'the grace date'}; after that the studio moves to Free and keeps its top-ups.</p> : null}
          <p className={styles.muted}>Tax invoices are in Company › Plan &amp; AI credits › Plan &amp; billing. Changing seats or moving between Pro plans is arranged through Plans.</p>
          {!s.viewer.canChangePlan ? <p className={styles.muted}><Icon name="lock" size={16} weight={300} /> Only {s.owner.name} can change the plan or the card.</p> : null}
        </div>
      </Dialog>
      <ConfirmDialog nested open={confirm} title={`Cancel ${s.planName}?`} message={`${s.planName} stays on until ${dayMonth(s.periodEnd)}; then the studio moves to Free. Top-ups stay — they never expire.`}
                     confirmLabel="Cancel the plan" cancelLabel={`Keep ${s.planName}`} tone="danger"   /* (REG-720) the message names the date; the answer fits the 400 alert */
                     onConfirm={() => { setConfirm(false); run(cancelAtPeriodEnd, `${s.planName} ends on ${dayMonth(s.periodEnd)}`) }} onCancel={() => setConfirm(false)} />
    </>
  )
}

/** Max is arranged with OpenMaison's team (the website's "Talk to us", kept inside the app — Q-18). */
export function TalkToUsDialog({ open, onClose, summary, nested = false }: { open: boolean; onClose: () => void; summary: CreditSummary; nested?: boolean }) {
  const snackbar = useSnackbar()
  const [name, setName] = useState(summary.viewer.name)
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const [pending, start] = useTransition()
  const phoneError = isSgPhone(phone) ? undefined : MSG.phone   // (REG-547) the one phone rule
  const send = () => { setTried(true); if (phoneError) return; start(async () => { const r = await talkToUs({ note, phone }); if ('error' in r) { snackbar({ message: r.error }); return } onClose(); snackbar({ message: 'Sent — our team will call you within a working day' }) }) }
  return (
    <Dialog open={open} onClose={onClose} title="Talk to us about Max" size="modal" width={440} nested={nested} portal={nested}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={pending} onPress={send}>Send</Button></>}>
      <div className={styles.form}>
        <p className={styles.p}>Max is priced per seat, against a signed agreement. Tell us about the studio and we’ll set it up with you.</p>
        <TextField label="Your name" value={name} maxLength={60} onChange={setName} />
        <TextField label="Phone number" required value={phoneTyped(phone)} onChange={(v) => setPhone(digitsOnly(v).slice(0, 8))} type="tel" inputMode="tel" numeric="digits" trailingIcon={null}
                   error={tried ? phoneError : undefined} />   {/* (REG-456) shown "9123 4567", held as digits */}
        <TextField label="What the studio needs" value={note} maxLength={400} onChange={setNote} helper="Optional — seats, integrations, custom work" />
      </div>
    </Dialog>
  )
}

/** The Done step's token (Plans): the ring round the spark shows the level (REG-710). */
export function DoneToken({ level }: { level: number }) {
  return <CreditToken size={88} level={level} tone="healthy" className={styles.doneToken} />
}
