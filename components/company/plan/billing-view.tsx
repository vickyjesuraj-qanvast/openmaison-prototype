'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ds'
import { CompanyShell } from '@/components/company/company-shell'
import { BillingGhost } from '@/components/company/company-ghosts'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { useSnackbar } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { openManageBilling, openPlans, openTopUp, useCredits } from '@/components/credits/credits-client'
import { askToUpgrade } from '@/app/credits/actions'
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
const AI_SUGGESTIONS = ['Which plan fits us?', 'What would annual save us?', 'When do our credits refresh?']

/**
 * (REG-704, AI credits §5.7 · Q-19 · Q-37) Company › Plan & AI credits › Plan & billing: the plan the studio is on and what it does
 * (seats, the month's AI credits, the next date and amount), the top-ups that never expire, the card, the billing details from Company ›
 * Profile, and the tax invoices. Changing, cancelling and the card are Dodo's customer portal in 1.0's platform (the stand-in here is
 * Manage billing, integration B-20); upgrading is Plans, inside the app. Only the Owner changes any of it (1.0's rule, Q-23) — everyone
 * else reads, with the reason on one line.
 */
export function BillingView({ chrome, invoices, from }: { chrome: CreditsChrome; invoices: InvoiceRow[]; from?: string }) {
  const snackbar = useSnackbar()
  const s: CreditSummary = useCredits(chrome.summary) ?? chrome.summary
  const may = s.viewer.canChangePlan
  const trusted = s.viewer.trusted
  const plan = planRow(s.planId)
  const price = priceFor(plan, s.seats, s.billingCycle as BillingCycle)
  const month = allowanceFor(plan, s.seats)
  const [pending, start] = useTransition()
  useMaisonAi(AI_SUGGESTIONS)
  const ask = () => start(async () => {
    const r = await askToUpgrade(suggestedPlan(s.activeMembers))
    if ('error' in r) { snackbar({ message: r.error }); return }
    snackbar({ message: `Asked ${r.owner} to upgrade the plan` })
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
                  {plan.id === 'pro_studio' ? <p className={styles.boxMeta}>{s.activeMembers} active {s.activeMembers === 1 ? 'member' : 'members'} · more seats are S$35 a month each</p> : null}
                </>
              )}
              {may ? (
                <div className={styles.boxActions}>
                  <Button onPress={openPlans} data-testid="billing-change-plan">{s.planId === 'free' ? 'See plans' : 'Change plan'}</Button>
                  {s.planId !== 'free' ? <Button variant="secondary" appearance="outlined" onPress={openManageBilling}>Manage billing</Button> : null}
                </div>
              ) : (
                <>
                  <div className={styles.boxActions}>
                    <Button variant="secondary" appearance="outlined" onPress={openPlans}>See plans</Button>
                    {s.planId === 'free' ? <Button isDisabled={pending} onPress={ask}>{`Ask ${s.owner.name} to upgrade`}</Button> : null}
                  </div>
                  <ReadOnlyNote text={`Only ${s.owner.name} changes the plan and billing.`} />
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
                  <div className={styles.boxActions}><Button variant="secondary" appearance="outlined" onPress={openTopUp}>{`Buy ${fmtCredits(TOPUP_CREDITS)} AI credits · ${sgd(TOPUP_PRICE)}`}</Button></div>
                ) : <ReadOnlyNote text={`Only ${s.owner.name} can buy AI credits.`} />}
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
    </CompanyShell>
  )
}
