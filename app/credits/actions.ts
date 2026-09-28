'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { billingCheckoutSessions, creditLedger, creditRequests, members, settings, studioCreditBalances, studioMemberCreditCaps, subscriptions } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { notify } from '@/lib/notifications/emit'
import { addMonths, addTopUp, BALANCE_ID, changePlan, currentSubscription, ensurePeriod, issueInvoice, refundCredits, spendCredits, usedSince } from '@/lib/credits/ledger'
import { fetchCreditSummary } from '@/lib/credits/queries'
import { ownerRole, trustedRole } from '@/lib/credits/policy'
import { allowanceFor, planBlock, planRow, priceFor, sgd2, TOPUP_CREDITS, TOPUP_PRICE, type BillingCycle } from '@/lib/credits/plans'
import { isActionKey, CREDIT_SCHEDULE } from '@/lib/credits/schedule'
import { fmtCredits, type CreditSummary, type Refusal } from '@/lib/credits/model'
import type { SpendOk } from '@/lib/credits/ledger'
import { isSgPhone, phoneDigits } from '@/lib/format'
import { MSG } from '@/lib/forms'

/**
 * (REG-700…) AI credits — the actions the screens call. 1.0's rules (integration A-18): anyone uses AI within their monthly amount;
 * only the Owner buys, sets monthly amounts and changes the plan — a refusal says so in the rule's own words (principle 3), as
 * `{ error }` (the house's refusal shape). The demo checkout stands in for Dodo's overlay and webhook (Q-14): it writes what they write.
 */

type Err = { error: string }
const DAY = 86_400_000
const REF = /^(render|quote):[0-9a-f-]{36}$/

async function me() {
  const id = await sessionMemberId()
  const [m] = await db.select({ id: members.id, name: members.name, role: members.role }).from(members).where(eq(members.id, id))
  return m ?? { id, name: 'Dane', role: 'Owner' }
}
async function ownerName(): Promise<string> {
  const [o] = await db.select({ name: members.name }).from(members).where(and(eq(members.role, 'Owner'), eq(members.isActive, true))).limit(1)
  return o?.name ?? 'the Owner'
}
async function ownerIds(): Promise<string[]> {
  return (await db.select({ id: members.id }).from(members).where(and(eq(members.role, 'Owner'), eq(members.isActive, true)))).map((m) => m.id)
}
/** 1.0: `settings.editStudio` — the Owner only (Admins are "the same as the owner except plan/billing"). */
async function ownerOnly(what: string): Promise<{ id: string; name: string; role: string } | Err> {
  const m = await me()
  if (!ownerRole(m.role)) return { error: `Only ${await ownerName()}, the studio’s Owner, can ${what}.` }
  return m
}
const done = () => revalidatePath('/', 'layout')

/* ── spending (the tools call these) ─────────────────────────────────────────────────────────────────────────────────────────────── */

/** Take the charge for AI work before it runs (1.0: charge before the work, refund on failure). `ref` is the work's own id —
    a render job's or the quote's — so a retry can't charge twice (integration B-12). */
export async function spendAI(input: { action: string; count?: number; ref: string }): Promise<SpendOk | Refusal | Err> {
  if (!isActionKey(input.action) || CREDIT_SCHEDULE[input.action].credits <= 0) return { error: 'That isn’t an AI action with a price.' }
  if (!REF.test(input.ref)) return { error: 'That work has no id to charge against.' }
  const m = await me()
  const out = await spendCredits({ memberId: m.id, action: input.action, count: Math.min(3, Math.max(1, Math.floor(input.count ?? 1))), ref: input.ref, trusted: trustedRole(m.role) })
  if ('ok' in out && out.charged > 0) {
    await amountReachedHeadsUp(m).catch(() => {})
    done()
  }
  return out
}
/** Give the charge back — the render didn't finish or was stopped before it was kept, the quote couldn't be read (Q-31). */
export async function refundAI(input: { ref: string }): Promise<{ credits: number } | Err> {
  if (!REF.test(input.ref)) return { error: 'That work has no id to refund.' }
  const credits = await refundCredits(input.ref)
  if (credits) done()
  return { credits }
}
/** (Q-38 · credit_amount_reached) The Owner hears once when a member's own spend reaches their monthly amount. */
async function amountReachedHeadsUp(m: { id: string; name: string }) {
  const [cap] = await db.select().from(studioMemberCreditCaps).where(eq(studioMemberCreditCaps.memberId, m.id))
  if (cap?.monthlyCap == null) return
  const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
  if (!bal) return
  const used = await usedSince(bal.periodStart.getTime(), m.id)
  if (used < cap.monthlyCap) return
  await notify('credit_amount_reached', await ownerIds(), { title: `${m.name} used their ${fmtCredits(cap.monthlyCap)} AI credits for the month`, body: 'The studio’s credits are untouched. Raise their monthly amount if they need more.', href: `/company/plan?member=${m.id}`, actorId: m.id })
}

/** The viewer's summary, fresh — after a spend in a rail-less editor, or when a dialog opens. */
export async function readCredits(): Promise<CreditSummary> {
  return fetchCreditSummary()
}

/* ── buying (the demo checkout stands in for Dodo's overlay + webhook, Q-14) ───────────────────────────────────────────────────────── */

export type Checkout = { sessionId: string; amount: number; forWhat: string; trial: boolean }

/** Start a checkout for a plan: the pending session 1.0's route writes first (`billing_checkout_sessions`). */
export async function startPlanCheckout(input: { planId: string; seats: number; cycle: string; trial: boolean }): Promise<Checkout | Err> {
  const o = await ownerOnly('change the plan'); if ('error' in o) return o
  const plan = planRow(input.planId)
  if (plan.id !== input.planId || plan.id === 'free') return { error: 'That plan isn’t one you can buy here.' }
  if (plan.isContactSales) return { error: 'Max is arranged with our team — press Talk to us.' }
  const active = (await db.select({ id: members.id }).from(members).where(eq(members.isActive, true))).length
  const block = planBlock(plan, active); if (block) return { error: block }
  const cycle: BillingCycle = input.cycle === 'yearly' ? 'yearly' : 'monthly'
  const seats = plan.id === 'pro_studio' ? Math.max(plan.minSeats, Math.min(200, Math.floor(input.seats) || plan.minSeats)) : 1
  const trial = input.trial && cycle === 'monthly' && plan.trialPeriodDays > 0 && !(await hadTrial())
  const id = randomUUID()
  await db.insert(billingCheckoutSessions).values({ id, memberId: o.id, kind: 'plan', planId: plan.id, seats, period: cycle, status: 'pending', createdAt: new Date() })
  return { sessionId: id, amount: trial ? 0 : priceFor(plan, seats, cycle), forWhat: `${plan.name}${plan.id === 'pro_studio' ? ` · ${seats} seats` : ''} · ${cycle === 'yearly' ? 'yearly' : 'monthly'}`, trial }
}
/** One trial per studio (the website's rule): any plan that ever carried a trial date. */
async function hadTrial(): Promise<boolean> {
  const rows = await db.select({ trialEndsAt: subscriptions.trialEndsAt }).from(subscriptions)
  return rows.some((r) => r.trialEndsAt != null)
}

/** Start a top-up: 1.0's one product, 1,000 AI credits for S$20 (integration B-05). */
export async function startTopUp(): Promise<Checkout | Err> {
  const o = await ownerOnly('buy AI credits'); if ('error' in o) return o
  const id = randomUUID()
  await db.insert(billingCheckoutSessions).values({ id, memberId: o.id, kind: 'topup', planId: null, seats: 1, period: 'monthly', status: 'pending', createdAt: new Date() })
  return { sessionId: id, amount: TOPUP_PRICE, forWhat: `${fmtCredits(TOPUP_CREDITS)} AI credits`, trial: false }
}

/** The demo payment completes — what Dodo's webhook does on `payment.succeeded` / `subscription.active` (integration A-13). */
export async function completeCheckout(sessionId: string, opts: { trial?: boolean } = {}): Promise<{ ok: true; summary: CreditSummary; granted: number } | Err> {
  const o = await ownerOnly('pay for the studio'); if ('error' in o) return o
  const [s] = await db.select().from(billingCheckoutSessions).where(eq(billingCheckoutSessions.id, sessionId))
  if (!s || s.memberId !== o.id) return { error: 'That checkout is gone — start it again.' }
  if (s.status !== 'pending') return { error: 'That checkout is already done.' }
  const claim = await db.update(billingCheckoutSessions).set({ status: 'completed', completedAt: new Date() }).where(and(eq(billingCheckoutSessions.id, sessionId), eq(billingCheckoutSessions.status, 'pending')))
  if (!claim.rowsAffected) return { error: 'That checkout is already done.' }
  const at = Date.now()
  let granted = 0, receipt = ''
  if (s.kind === 'topup') {
    await addTopUp({ by: o.id, at })
    granted = TOPUP_CREDITS; receipt = `${fmtCredits(TOPUP_CREDITS)} AI credits`
    await db.update(billingCheckoutSessions).set({ creditsGranted: granted }).where(eq(billingCheckoutSessions.id, sessionId))
    await notify('credit_receipt', [o.id, ...(await ownerIds())], { title: `Receipt · ${sgd2(TOPUP_PRICE)}`, body: `${receipt} · top-ups never expire`, href: '/company/plan/billing', actorId: null })
  } else {
    const plan = planRow(s.planId ?? 'free')
    /* the trial is chosen on the review step and checked again here: monthly Pro, once per studio (the website's rule) */
    const trial = !!opts.trial && s.period === 'monthly' && plan.trialPeriodDays > 0 && !(await hadTrial())
    const sub = await changePlan({ planId: plan.id, seats: s.seats, cycle: s.period === 'yearly' ? 'yearly' : 'monthly', trial, at, by: o.id, invoice: true })
    granted = allowanceFor(plan, sub.seats)
    await db.update(billingCheckoutSessions).set({ creditsGranted: granted }).where(eq(billingCheckoutSessions.id, sessionId))
    if (sub.status !== 'trialing') await notify('credit_receipt', [o.id, ...(await ownerIds())], { title: `Receipt · ${sgd2(priceFor(plan, sub.seats, sub.billingCycle as BillingCycle))}`, body: `${plan.name}${plan.id === 'pro_studio' ? ` · ${sub.seats} seats` : ''} · ${fmtCredits(granted)} AI credits a month`, href: '/company/plan/billing', actorId: null })
  }
  done()
  return { ok: true, summary: await fetchCreditSummary(), granted }
}

/* ── the plan, from the demo "Manage billing" (Dodo's customer portal, integration B-20) ──────────────────────────────────────────── */

export async function cancelAtPeriodEnd(): Promise<{ ok: true; until: number } | Err> {
  const o = await ownerOnly('cancel the plan'); if ('error' in o) return o
  const sub = await currentSubscription()
  if (!sub || sub.planId === 'free') return { error: 'The studio is on Free — there’s nothing to cancel.' }
  await db.update(subscriptions).set({ cancelAtPeriodEnd: true, updatedAt: new Date() }).where(eq(subscriptions.id, sub.id))
  done()
  return { ok: true, until: sub.currentPeriodEnd.getTime() }
}
export async function keepPlan(): Promise<{ ok: true } | Err> {
  const o = await ownerOnly('change the plan'); if ('error' in o) return o
  const sub = await currentSubscription()
  if (!sub) return { error: 'There’s no plan to keep.' }
  await db.update(subscriptions).set({ cancelAtPeriodEnd: false, updatedAt: new Date() }).where(eq(subscriptions.id, sub.id))
  done()
  return { ok: true }
}
/** A failed payment put right: the plan is active again and the period's invoice is paid (Dodo's `payment.succeeded` in grace, A-14). */
export async function updateCard(): Promise<{ ok: true } | Err> {
  const o = await ownerOnly('update the card'); if ('error' in o) return o
  const sub = await currentSubscription()
  if (!sub) return { error: 'There’s no plan to pay for.' }
  if (sub.status === 'past_due') {
    await db.update(subscriptions).set({ status: 'active', graceUntil: null, updatedAt: new Date() }).where(eq(subscriptions.id, sub.id))
    const plan = planRow(sub.planId)
    await issueInvoice({ subscriptionId: sub.id, forWhat: `${plan.name}${plan.id === 'pro_studio' ? ` · ${sub.seats} seats` : ''}`, amount: priceFor(plan, sub.seats, sub.billingCycle as BillingCycle), start: sub.currentPeriodStart.getTime(), end: sub.currentPeriodEnd.getTime(), at: Date.now() })
  }
  done()
  return { ok: true }
}

/** Max: a short request to OpenMaison's team, inside the app (Q-18). */
export async function talkToUs(input: { note: string; phone: string }): Promise<{ ok: true } | Err> {
  if (!isSgPhone(phoneDigits(input.phone))) return { error: MSG.phone }
  return { ok: true }   // Platform: 1.0 sends Max's leads to its sales team (A §6, "where Max leads go" is open)
}

/* ── monthly amounts (1.0's caps; the Owner only, integration B-02) ───────────────────────────────────────────────────────────────── */

export async function setMonthlyAmount(memberId: string, amount: number | null): Promise<{ ok: true; previous: number | null } | Err> {
  const o = await ownerOnly('set monthly amounts'); if ('error' in o) return o
  if (amount != null && (!Number.isInteger(amount) || amount < 0 || amount > 10_000_000)) return { error: 'Enter a whole number of AI credits, or leave it empty for no limit.' }
  const [m] = await db.select({ id: members.id, name: members.name }).from(members).where(eq(members.id, memberId))
  if (!m) return { error: 'That member is no longer in the studio.' }
  const [prev] = await db.select().from(studioMemberCreditCaps).where(eq(studioMemberCreditCaps.memberId, memberId))
  const now = new Date()
  await db.insert(studioMemberCreditCaps).values({ memberId, monthlyCap: amount, updatedBy: o.id, updatedAt: now })
    .onConflictDoUpdate({ target: studioMemberCreditCaps.memberId, set: { monthlyCap: amount, updatedBy: o.id, updatedAt: now } })
  /* an ask for more that this answers — raised past what they have used, or no limit — is granted, and they hear it (Q-34) */
  const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
  const used = bal ? await usedSince(bal.periodStart.getTime(), memberId) : 0
  if (amount == null || amount > used) {
    const open = await db.select({ id: creditRequests.id }).from(creditRequests).where(and(eq(creditRequests.memberId, memberId), eq(creditRequests.kind, 'monthly'), eq(creditRequests.status, 'open')))
    if (open.length) {
      await db.update(creditRequests).set({ status: 'granted', answeredBy: o.id, answeredAt: now }).where(inArray(creditRequests.id, open.map((r) => r.id)))
      await notify('credit_request_answered', [memberId], { title: amount == null ? `${o.name} took off your monthly limit` : `${o.name} raised your monthly AI credits to ${fmtCredits(amount)}`, body: 'Press Generate again when you’re ready.', href: null, actorId: o.id })
    }
  }
  done()
  return { ok: true, previous: prev?.monthlyCap ?? null }
}

/** A default for members added from now on (Q-25, integration B-16) — written as their row when Company › Members adds them. */
export async function setDefaultMonthlyAmount(amount: number | null): Promise<{ ok: true } | Err> {
  const o = await ownerOnly('set monthly amounts'); if ('error' in o) return o
  if (amount != null && (!Number.isInteger(amount) || amount < 0 || amount > 10_000_000)) return { error: 'Enter a whole number of AI credits, or leave it empty for no limit.' }
  const value = JSON.stringify({ monthlyAmount: amount })
  await db.insert(settings).values({ key: 'credit_defaults', value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  done()
  return { ok: true }
}

/* ── asking the Owner (integration B-19; 1.0's "Request more" did nothing) ───────────────────────────────────────────────────────── */

export async function askForCredits(input: { kind: 'pool' | 'monthly'; needed: number }): Promise<{ ok: true; owner: string } | Err> {
  const m = await me()
  const owner = await ownerName()
  if (ownerRole(m.role)) return { error: 'You can add AI credits yourself — from the card or Plans.' }
  const kind = input.kind === 'monthly' ? 'monthly' : 'pool'
  const [open] = await db.select({ id: creditRequests.id }).from(creditRequests).where(and(eq(creditRequests.memberId, m.id), eq(creditRequests.kind, kind), eq(creditRequests.status, 'open')))
  if (!open) {
    await db.insert(creditRequests).values({ id: randomUUID(), memberId: m.id, kind, needed: Math.max(0, Math.floor(input.needed) || 0), status: 'open', createdAt: new Date() })
    await notify('credit_request', await ownerIds(), {
      title: kind === 'monthly' ? `${m.name} asks for more AI credits — they have used their monthly amount` : `${m.name} asks for more AI credits — the studio is out`,
      body: input.needed ? `The next piece of work needs ${fmtCredits(input.needed)}.` : null, href: `/company/plan?member=${m.id}`, actorId: m.id,
    })
    done()
  }
  return { ok: true, owner }
}

/* ── the demo's plan switch (View as › Studio plan, demo only — Q-41) ─────────────────────────────────────────────────────────────── */

export type DemoPlan = 'free' | 'trial' | 'pro' | 'low' | 'past_due' | 'not_counting'
export async function setDemoPlan(state: DemoPlan): Promise<{ ok: true; label: string } | Err> {
  const at = Date.now()
  await ensurePeriod(at)
  const active = (await db.select({ id: members.id }).from(members).where(eq(members.isActive, true))).length
  const seats = Math.max(3, active)
  const counting = async (on: boolean) => db.update(studioCreditBalances).set({ enforcementEnabled: on, enforcementStartsAt: on ? null : new Date(addMonths(at, 1)), updatedAt: new Date(at) }).where(eq(studioCreditBalances.id, BALANCE_ID))
  const sub = await currentSubscription()
  if (state === 'free') { if (sub?.planId !== 'free') await changePlan({ planId: 'free', seats: 1, cycle: 'monthly', trial: false, at, by: null, invoice: false, quiet: true }); await counting(true) }
  if (state === 'trial') { await db.update(subscriptions).set({ trialEndsAt: null }).where(eq(subscriptions.status, 'cancelled')); await changePlan({ planId: 'pro_studio', seats, cycle: 'monthly', trial: true, at, by: null, invoice: false, quiet: true }); await counting(true) }
  if (state === 'pro') {
    /* the base: Pro — Studio, active, with a healthy month (after "Almost out" the month's credits come back through a plan change) */
    const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
    const healthy = !!bal && bal.planCredits >= allowanceFor(planRow('pro_studio'), seats) * 0.25
    if (sub?.planId !== 'pro_studio' || sub.status !== 'active' || !healthy) await changePlan({ planId: 'pro_studio', seats, cycle: 'monthly', trial: false, at, by: null, invoice: false, quiet: true })
    else await db.update(subscriptions).set({ cancelAtPeriodEnd: false, graceUntil: null, status: 'active' }).where(eq(subscriptions.id, sub.id))
    await counting(true)
  }
  if (state === 'past_due') {
    let s = await currentSubscription()
    if (!s || s.planId === 'free') s = await changePlan({ planId: 'pro_studio', seats, cycle: 'monthly', trial: false, at, by: null, invoice: false, quiet: true })
    await db.update(subscriptions).set({ status: 'past_due', graceUntil: new Date(at + 14 * DAY), updatedAt: new Date(at) }).where(eq(subscriptions.id, s.id))
    await counting(true)
    await notify('payment_failed', await ownerIds(), { title: 'The payment for the plan didn’t go through', body: `Pro stays on until ${new Date(at + 14 * DAY).getDate()} ${new Date(at + 14 * DAY).toLocaleString('en-SG', { month: 'short' })} — update the card before then.`, href: '/company/plan/billing', actorId: null })
  }
  if (state === 'not_counting') await counting(false)
  /* Almost out: Pro, counted, 15 AI credits left — the warning before the press, the moments and buy-and-carry-on, for a demo. Written as a
     ledger adjustment, so the balance still equals the ledger (R63's check). */
  if (state === 'low') {
    const s = await currentSubscription()
    if (!s || s.planId !== 'pro_studio' || s.status !== 'active') await changePlan({ planId: 'pro_studio', seats, cycle: 'monthly', trial: false, at, by: null, invoice: false, quiet: true })
    else await db.update(subscriptions).set({ cancelAtPeriodEnd: false, graceUntil: null }).where(eq(subscriptions.id, s.id))
    await counting(true)
    const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
    if (bal) {
      const LOW = 15, total = bal.planCredits + bal.topupCredits
      if (total !== LOW) {
        const plan = Math.min(LOW, bal.planCredits)
        await db.transaction(async (tx) => {
          await tx.insert(creditLedger).values({ id: randomUUID(), memberId: null, actionKey: 'adjust', credits: LOW - total, balanceAfter: LOW, reason: 'adjust', refId: 'demo', createdAt: new Date(at) })
          await tx.update(studioCreditBalances).set({ planCredits: plan, topupCredits: LOW - plan, updatedAt: new Date(at) }).where(eq(studioCreditBalances.id, BALANCE_ID))
        })
      }
    }
  }
  done()
  const label = { free: 'Free', trial: 'Pro — Studio · trial', pro: 'Pro — Studio', low: 'Pro — Studio · almost out', past_due: 'Pro — Studio · payment failed', not_counting: 'Not counting yet' }[state]
  return { ok: true, label }
}

/** Someone who may not change the plan asks the Owner to (Plans' review step, read-only for them — 1.0's `upgrade: ['owner']`). */
export async function askToUpgrade(planId: string): Promise<{ ok: true; owner: string } | Err> {
  const m = await me()
  if (ownerRole(m.role)) return { error: 'You can change the plan yourself.' }
  const plan = planRow(planId)
  await notify('credit_request', await ownerIds(), { title: `${m.name} asks to move the studio to ${plan.name}`, body: 'From Plans. Review it there, or talk it over.', href: '/company/plan/billing', actorId: m.id })
  return { ok: true, owner: await ownerName() }
}
