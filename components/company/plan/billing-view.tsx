'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { CompanyShell } from '@/components/company/company-shell'
import { BillingGhost } from '@/components/company/company-ghosts'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { useSnackbar } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { Switch } from '@/components/ds'
import { openManageBilling, openPlans, openSeats, openTopUp, refreshCredits, useCredits } from '@/components/credits/credits-client'
import { askToUpgrade, setAutoTopUp } from '@/app/credits/actions'
import { autoLine, type AutoTopUp } from '@/lib/credits/auto-topup'
import { AutoTopUpDialog } from './auto-topup-dialog'
import { aboutRenders, dayMonth, fmtCredits, type CreditSummary } from '@/lib/credits/model'
import { allowanceFor, planRow, priceFor, sgd, sgd2, suggestedPlan, TOPUP_CREDITS, TOPUP_PRICE, type BillingCycle } from '@/lib/credits/plans'
import type { CreditsChrome } from '@/lib/credits/chrome'
import type { InvoiceRow } from '@/lib/credits/queries'
import { buildTable, downloadBlob } from '@/lib/leads/export'
import { displayDate } from '@/lib/format'
import { useMaisonAi } from '@/lib/maison-ai'
import { withFrom } from '@/lib/nav'
import { PLAN_TABS } from '@/lib/company/sections'
import { CreditsTable } from './credits-table'
import styles from './plan.module.css'

const INVOICE_DEFS = [
  { key: 'date', label: 'Date', track: 'minmax(140px, 140fr)', locked: true },
  { key: 'number', label: 'Invoice', track: 'minmax(180px, 180fr)' },
  { key: 'for', label: 'For', track: 'minmax(240px, 240fr)' },
  { key: 'period', label: 'Period', track: 'minmax(200px, 200fr)' },
  { key: 'amount', label: 'Amount', track: 'minmax(120px, 120fr)' },
  { key: 'status', label: 'Status', track: 'minmax(110px, 110fr)' },
  { key: 'pdf', label: 'PDF', track: 'minmax(80px, 80fr)' },
] as const
/* (pending modules S10 — card held:maison-ai) each is asked and answered from the plan and the credits record (lib/maison-ai/answers/money.ts) */
const AI_SUGGESTIONS = ['Which plan fits us?', 'What would annual save us?', 'When do our AI credits refresh?']

/**
 * (REG-704, AI credits §5.7 · Q-19 · Q-37) Company › Plan & AI credits › Plan & billing: the plan the studio is on and what it does
 * (seats, the month's AI credits, the next date and amount), the top-ups that never expire, the card, the billing details from Company ›
 * Profile, and the tax invoices. Changing, cancelling and the card are Dodo's customer portal in 1.0's platform (the stand-in here is
 * Manage billing, integration B-20); upgrading is Plans, inside the app. Only the Owner changes any of it (1.0's rule, Q-23) — everyone
 * else reads, with the reason on one line.
 */
export function BillingView({ chrome, invoices, auto, from }: { chrome: CreditsChrome; invoices: InvoiceRow[]; auto: { setting: AutoTopUp; thisMonth: { times: number; credits: number; cents: number } } | null; from?: string }) {
  const snackbar = useSnackbar()
  const router = useRouter()
  /* (pending modules S19) auto top-up: the switch puts the value back when the server refuses (REG-656); turning it on is its dialog */
  const [autoOn, setAutoOn] = useState(auto?.setting.on ?? false)
  const [autoSeed, setAutoSeed] = useState(auto?.setting)
  if (autoSeed !== auto?.setting) { setAutoSeed(auto?.setting); setAutoOn(auto?.setting.on ?? false) }
  const [autoEdit, setAutoEdit] = useState(false)
  const autoSaved = (next: AutoTopUp, previous: AutoTopUp) => {
    setAutoEdit(false); setAutoOn(next.on); router.refresh(); void refreshCredits()
    snackbar({ key: 'auto-topup', message: previous.on ? 'Auto top-up changed' : 'Auto top-up is on', actionLabel: 'Undo', onAction: () => { void setAutoTopUp(previous).then((r) => { if ('error' in r) snackbar({ message: r.error }); else { setAutoOn(previous.on); router.refresh(); void refreshCredits(); snackbar({ key: 'auto-topup', message: previous.on ? 'Auto top-up is as it was' : 'Auto top-up is off' }) } }) } })
  }
  const autoOff = () => {
    if (!auto) return
    const before = auto.setting
    setAutoOn(false)
    void setAutoTopUp({ ...before, on: false }).then((r) => {
      if ('error' in r) { setAutoOn(before.on); snackbar({ message: r.error }); return }
      router.refresh(); void refreshCredits()
      snackbar({ key: 'auto-topup', message: 'Auto top-up is off', actionLabel: 'Undo', onAction: () => { void setAutoTopUp(before).then((u) => { if ('error' in u) snackbar({ message: u.error }); else { setAutoOn(true); router.refresh(); void refreshCredits(); snackbar({ key: 'auto-topup', message: 'Auto top-up is on' }) } }) } })
    }, () => { setAutoOn(before.on); snackbar({ message: 'Couldn’t turn off auto top-up' }) })
  }
  const s: CreditSummary = useCredits(chrome.summary) ?? chrome.summary
  const may = s.viewer.canChangePlan
  const trusted = s.viewer.trusted
  const plan = planRow(s.planId)
  const price = priceFor(plan, s.seats, s.billingCycle as BillingCycle)
  const month = allowanceFor(plan, s.seats)
  const [pending, start] = useTransition()
  useMaisonAi(AI_SUGGESTIONS)
  const ask = () => start(async () => {
    const r = await askToUpgrade(suggestedPlan(s.activeMembers), 'billing')
    if ('error' in r) { snackbar({ message: r.error }); return }
    snackbar({ message: r.again ? `You asked ${r.owner} on ${dayMonth(r.askedAt)} — it’s in their bell` : `Asked ${r.owner} to upgrade the plan` })   // (S42 D-07) one ask while it waits
    void refreshCredits()
  })
  const status = s.status === 'past_due' ? <MetaChip color="red" icon="credit_card">Payment failed</MetaChip>
    : s.cancelAtPeriodEnd ? <MetaChip color="yellow">{`Ends ${dayMonth(s.periodEnd)}`}</MetaChip>
    : s.status === 'trialing' && s.trialEndsAt ? <MetaChip>{`Trial · ends ${dayMonth(s.trialEndsAt)}`}</MetaChip>
    : s.planId !== 'free' ? <MetaChip color="green">Active</MetaChip> : null
  const invoicePdf = (i: InvoiceRow) => {
    const b = chrome.billing
    const body = [
      ['Invoice', i.number], ['Date', displayDate(new Date(i.issuedAt))], ['Billed to', [b.name, b.uen ? `UEN ${b.uen}` : null].filter(Boolean).join(' · ')],
      ...(b.gstRegistered && b.gstReg ? [['GST number', b.gstReg]] : []), ['For', i.forWhat], ...(i.periodEnd > i.periodStart ? [['Period', `${displayDate(new Date(i.periodStart))} – ${displayDate(new Date(i.periodEnd))}`]] : []), ['Amount', sgd2(i.amount)], ['Status', i.status === 'paid' ? 'Paid' : i.status],
    ]
    downloadBlob(buildTable(`OpenMaison — Invoice ${i.number} (demo)`, ['Item', 'Detail'], body, 'PDF'), `${i.number}.pdf`)
    snackbar({ message: `Downloaded ${i.number}.pdf` })
  }
  const cell = (i: InvoiceRow, key: string) => {
    switch (key) {
      case 'date': return <span className={styles.num}>{displayDate(new Date(i.issuedAt))}</span>
      case 'number': return <span className={styles.num}>{i.number}</span>
      case 'for': return <span className={styles.oneLine}>{i.forWhat}</span>
      case 'period': return <span className={`${styles.oneLine} ${styles.m}`}>{i.periodEnd > i.periodStart ? `${dayMonth(i.periodStart)} – ${dayMonth(i.periodEnd)}` : '—'}</span>   // a top-up has no period
      case 'amount': return <span className={styles.num}>{sgd2(i.amount)}</span>
      case 'status': return <MetaChip color={i.status === 'paid' ? 'green' : 'yellow'}>{i.status === 'paid' ? 'Paid' : i.status === 'open' ? 'Due' : i.status}</MetaChip>
      case 'pdf': return <Tooltip label="Download the PDF"><IconButton icon="download" label={`Download ${i.number}`} variant="bare" size={36} iconSize={20} iconWeight={300} onClick={() => invoicePdf(i)} /></Tooltip>
      default: return null
    }
  }
  const b = chrome.billing
  return (
    <CompanyShell title="Plan & AI credits" tabs={[...PLAN_TABS]} from={from} skeleton={<BillingGhost />}>
      <div className={styles.page} data-testid="plan-billing">
        {s.status === 'past_due' && trusted ? (
          <p className={styles.warn} role="alert" data-testid="billing-past-due">
            <Icon name="credit_card" size={20} weight={300} />
            <span>The last payment for {s.planName} didn’t go through. It stays on until {s.graceUntil ? dayMonth(s.graceUntil) : 'the grace date'}; after that the studio moves to Free and keeps its top-ups.</span>
            {may ? <Button onPress={openManageBilling}>Update the card</Button> : null}
          </p>
        ) : null}
        {/* (REG-722) two stacks, as the lead Overview's cards: the plan and its card · the top-ups and the billing details */}
        <div className={styles.cards}>
          <div className={styles.cardCol}>
            <section className={styles.box} aria-label="Your plan" data-card="plan" data-testid="billing-plan">
              <div className={styles.boxHead}><h2 className={styles.boxTitle}>{s.planName}{status}</h2></div>
              {s.planId === 'free' ? (
                <>
                  <p className={styles.boxLine}>S$0 · 150 AI credits to start, then 30 a month</p>
                  <p className={styles.boxMeta}>Pro gives the studio {fmtCredits(allowanceFor(planRow('pro_studio'), Math.max(3, s.activeMembers)))} AI credits a month — about {fmtCredits(aboutRenders(allowanceFor(planRow('pro_studio'), Math.max(3, s.activeMembers))))} renders — shared by every seat.</p>
                </>
              ) : (
                <>
                  <p className={styles.boxLine}>{plan.id === 'pro_studio' || plan.id === 'max' ? `${s.seats} seats · ` : ''}{s.billingCycle === 'yearly' ? 'annual' : 'monthly'} · {sgd(price)} a {s.billingCycle === 'yearly' ? 'year' : 'month'}</p>
                  <p className={styles.boxMeta}>{s.cancelAtPeriodEnd ? `Ends ${dayMonth(s.periodEnd)} — then Free, and the top-ups stay` : s.status === 'trialing' && s.trialEndsAt ? `Free until ${dayMonth(s.trialEndsAt)}, then ${sgd(price)} a month` : `Renews ${dayMonth(s.periodEnd)}`} · {fmtCredits(month)} AI credits a month{plan.id === 'pro_studio' ? ', shared' : ''}</p>
                  {plan.id === 'pro_studio' ? <p className={styles.boxMeta} data-testid="billing-seats">{s.activeMembers} of {s.seats} seats in use — one for each member who uses the AI tools · more seats are S$35 a month each</p> : null}
                  {/* (pending modules S19 — 1.0's seat change) fewer seats waiting for the billing date */}
                  {plan.id === 'pro_studio' && s.scheduledSeats != null && s.scheduledSeats !== s.seats ? <p className={styles.boxMeta} data-testid="billing-seats-next">From {dayMonth(s.billingTo)}: {s.scheduledSeats} seats · {sgd(priceFor(plan, s.scheduledSeats, s.billingCycle as BillingCycle))} a {s.billingCycle === 'yearly' ? 'year' : 'month'}</p> : null}
                </>
              )}
              {may ? (
                <div className={styles.boxActions}>
                  <Button onPress={openPlans} data-testid="billing-change-plan">{s.planId === 'free' ? 'See plans' : 'Change plan'}</Button>
                  {plan.id === 'pro_studio' && s.status === 'active' ? <Button variant="secondary" appearance="outlined" onPress={() => openSeats()} data-testid="billing-change-seats">Change seats</Button> : null}
                  {s.planId !== 'free' ? <Button variant="secondary" appearance="outlined" onPress={openManageBilling}>Manage billing</Button> : null}
                </div>
              ) : (
                <>
                  <div className={styles.boxActions}>
                    <Button variant="secondary" appearance="outlined" onPress={openPlans}>See plans</Button>
                    {s.planId === 'free' && !s.upgradeAsk ? <Button isDisabled={pending} onPress={ask}>{`Ask ${s.owner.name} to upgrade`}</Button> : null}
                  </div>
                  <ReadOnlyNote text={s.planId === 'free' && s.upgradeAsk ? `You asked ${s.owner.name} to upgrade on ${dayMonth(s.upgradeAsk.at)} — only ${s.owner.name} changes the plan and billing.` : `Only ${s.owner.name} changes the plan and billing.`} />
                </>
              )}
            </section>

            {trusted && s.planId !== 'free' ? (
              <section className={styles.box} aria-label="Payment method" data-card="card" data-testid="billing-card">
                <div className={styles.boxHead}><h2 className={styles.boxTitle}>Payment method</h2></div>
                <p className={styles.boxLine}>Visa ending 4242 · expires 08/28 <span className={styles.m}>(demo)</span></p>
                <p className={styles.boxMeta}>Paid through Dodo Payments. In the live app, updating the card opens Dodo’s billing page in a new tab.</p>
                {may ? <div className={styles.boxActions}><Button variant="secondary" appearance="outlined" onPress={openManageBilling}>Update card</Button></div> : null}
              </section>
            ) : null}
          </div>
          <div className={styles.cardCol}>
            {trusted ? (
              <section className={styles.box} aria-label="Top-ups" data-card="topups" data-testid="billing-topups">
                <div className={styles.boxHead}><h2 className={styles.boxTitle}>Top-ups</h2></div>
                <p className={styles.boxLine}>{fmtCredits(s.topupCredits ?? 0)} AI credits that never expire</p>
                <p className={styles.boxMeta}>This month’s credits are used first; top-ups carry over on any plan, after a downgrade or after cancelling.</p>
                {s.viewer.canBuy ? (
                  <div className={styles.boxActions}><Button variant="secondary" appearance="outlined" onPress={() => openTopUp()}>{`Buy ${fmtCredits(TOPUP_CREDITS)} AI credits · ${sgd(TOPUP_PRICE)}`}</Button></div>
                ) : <ReadOnlyNote text={`Only ${s.owner.name} can buy AI credits.`} />}
                {/* (pending modules S19 — card held:ai-credits, Q-36 as recommended) the studio's auto top-up: off until the Owner turns it on */}
                {auto ? (
                  <div className={styles.autoRow} data-testid="billing-auto-topup">
                    <div className={styles.autoHead}>
                      <span className={styles.autoTitle}>Auto top-up</span>
                      {s.viewer.canBuy ? (
                        <label className={styles.switchLabel}>
                          <Switch size="sm" isSelected={autoOn} aria-label="Auto top-up" onChange={(on: boolean) => { if (on) setAutoEdit(true); else autoOff() }} />
                          <span>{autoOn ? 'On' : 'Off'}</span>
                        </label>
                      ) : <MetaChip color={auto.setting.on ? 'green' : 'default'}>{auto.setting.on ? 'On' : 'Off'}</MetaChip>}
                    </div>
                    <p className={styles.boxMeta} data-testid="billing-auto-line">
                      {autoOn ? `${autoLine(auto.setting)}.` : 'Off — when the studio runs low, nothing is bought until you buy it.'}
                      {autoOn && s.viewer.canBuy ? <> <Button appearance="text" onPress={() => setAutoEdit(true)} data-testid="billing-auto-change">Change</Button></> : null}
                    </p>
                    {autoOn && auto.thisMonth.times ? <p className={styles.boxMeta} data-testid="billing-auto-month">This month: {auto.thisMonth.times} {auto.thisMonth.times === 1 ? 'top-up' : 'top-ups'} · {fmtCredits(auto.thisMonth.credits)} AI credits · {sgd(auto.thisMonth.cents)}</p> : null}
                    {s.viewer.canBuy ? null : <ReadOnlyNote text={`Only ${s.owner.name} turns auto top-up on or off.`} />}
                  </div>
                ) : null}
              </section>
            ) : null}

            {trusted ? (
              <section className={styles.box} aria-label="Billing details" data-card="billing" data-testid="billing-details">
                <div className={styles.boxHead}>
                  <h2 className={styles.boxTitle}>Billing details</h2>
                  <Link className={styles.link} href={withFrom('/company/profile', '/company/plan/billing')}>Edit in Profile</Link>
                </div>
                <dl className={styles.facts}>
                  <dt>Billed to</dt><dd>{b.name}</dd>
                  {b.uen ? <><dt>UEN</dt><dd>{b.uen}</dd></> : null}
                  <dt>GST</dt><dd>{b.gstRegistered ? (b.gstReg ? `Registered · ${b.gstReg}` : 'Registered') : 'Not registered'}</dd>
                  {b.address ? <><dt>Address</dt><dd>{b.address}</dd></> : null}
                  {b.email ? <><dt>Receipts to</dt><dd>{b.email}</dd></> : null}
                </dl>
                <p className={styles.boxMeta}>{chrome.gstLine.charAt(0).toUpperCase() + chrome.gstLine.slice(1)}.</p>
              </section>
            ) : null}
          </div>
        </div>

        {trusted ? (
          <CreditsTable table="credits-invoices" title="Invoices" testId="billing-invoices" defs={INVOICE_DEFS} rows={invoices} rowKey={(i) => i.id} cell={cell}
                        help="Every payment — the plan and each top-up" empty="No invoices yet — they appear with the first payment." />
        ) : null}
      </div>
      {auto && s.viewer.canBuy ? <AutoTopUpDialog open={autoEdit} value={{ ...auto.setting, on: autoOn && auto.setting.on }} balance={s.balance ?? 0} onClose={() => setAutoEdit(false)} onSaved={autoSaved} /> : null}
    </CompanyShell>
  )
}
