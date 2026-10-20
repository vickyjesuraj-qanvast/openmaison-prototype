'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { billingCheckoutSessions, creditLedger, creditRequests, members, settings, studioCreditBalances, studioMemberCreditCaps, subscriptions } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { notify } from '@/lib/notifications/emit'
import { addMonths, BALANCE_ID, changePlan, currentSubscription, ensurePeriod, issueInvoice, refundCredits, setSeats, spendCredits, usedSince } from '@/lib/credits/ledger'
import { fetchCreditSummary } from '@/lib/credits/queries'
import { ownerRole, trustedRole } from '@/lib/credits/policy'
import { isTopupAmount, planBlock, planRow, priceFor, sgd2, TOPUP_CREDITS, TOPUP_MAX, TOPUP_MIN, topupPrice, type BillingCycle } from '@/lib/credits/plans'
import { AUTO_TOPUP_KEY, autoTopUpError, parseAutoTopUp, type AutoTopUp } from '@/lib/credits/auto-topup'
import { opensWorkspace } from '@/lib/settings/roles'
import { isActionKey, CREDIT_SCHEDULE } from '@/lib/credits/schedule'
import { fmtCredits, type CreditSummary, type Refusal } from '@/lib/credits/model'
import { finishCheckout, hadTrial } from '@/lib/credits/checkout'   // (pending modules S34) the records a paid checkout writes, shared with a real provider's webhook
import { paymentProvider, paymentsAreStandIn } from '@/lib/credits/payments'
import { absoluteLink } from '@/lib/notifications/delivery'
import type { SpendOk } from '@/lib/credits/ledger'
import { isSgPhone, phoneDigits } from '@/lib/format'
import { welcomeEndsNow, withdrawStaleOffers } from '@/lib/credits/nudges'   // (pending modules S41b-4)
import { comesWithPro, isProFeature } from '@/lib/credits/features'
import { UPGRADE_ASK_HREF, upgradeAskOf } from '@/lib/credits/queries'   // (S42 D-07)
import { MSG } from '@/lib/forms'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/**
 * (REG-700…) AI credits — the actions the screens call. 1.0's rules (integration A-18): anyone uses AI within their monthly amount;
 * only the Owner buys, sets monthly amounts and changes the plan — a refusal says so in the rule's own words (principle 3), as
 * `{ error }` (the house's refusal shape). The demo checkout stands in for Dodo's overlay and webhook (Q-14): it writes what they write.
 */

type Err = { error: string }
const DAY = 86_400_000
/* (pending modules S19) `schedule:<project>:<read>` — a quote read into a project's schedule, which makes no record of its own to key by;
   (pending modules S20) `repair:<render job>:<version 1–3>` — the drift guard's repair of one version, its own charge (1.0's render_repair) */
const REF = /^(?:(?:render|quote):[0-9a-f-]{36}|schedule:[0-9a-f-]{36}:[0-9a-f-]{36}|repair:[0-9a-f-]{36}:[1-3])$/

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
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  if (!isActionKey(input.action) || CREDIT_SCHEDULE[input.action].credits <= 0) return { error: 'That isn’t an AI action with a price.' }
  if (!REF.test(input.ref)) return { error: 'That work has no id to charge against.' }
  const m = await me()
  const out = await spendCredits({ memberId: m.id, action: input.action, count: Math.min(3, Math.max(1, Math.floor(input.count ?? 1))), ref: input.ref, trusted: trustedRole(m.role) })
  if ('ok' in out && out.charged > 0) {
    await amountReachedHeadsUp(m).catch(() => {})
    done()
  }
  /* (pending modules S41b-4 — 1.0's R8) the Owner's welcome AI credits ran out on this very press: the out-of-credits sheet says it in T8's
     words, once (it records the moment when it opens — app/credits/nudge-actions.ts `noteUpgradeMoment`) */
  if ('error' in out && out.error === 'insufficient_credits' && out.balance === 0 && ownerRole(m.role) && (await welcomeEndsNow(m.id).catch(() => false))) return { ...out, welcome: true }
  return out
}
/** Give the charge back — the render didn't finish or was stopped before it was kept, the quote couldn't be read (Q-31). */
export async function refundAI(input: { ref: string }): Promise<{ credits: number } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
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

export type Checkout = { sessionId: string; amount: number; forWhat: string; trial: boolean
  /** (pending modules S34) a real payment provider's checkout page — the dialog sends the Owner there; absent on the demo checkout */
  payUrl?: string }

/** (pending modules S34) With a real payment provider plugged in, a pending session opens its checkout page; the demo answers as it was. */
async function withProvider(c: Checkout, kind: 'plan' | 'topup', owner: { id: string; name: string }): Promise<Checkout | Err> {
  if (paymentsAreStandIn()) return c
  const [m] = await db.select({ email: members.email }).from(members).where(eq(members.id, owner.id))
  const r = await paymentProvider().checkout({ sessionId: c.sessionId, kind, amountCents: c.amount, forWhat: c.forWhat, trial: c.trial, owner: { id: owner.id, name: owner.name, email: m?.email ?? null }, returnTo: absoluteLink(`/company/plan/billing?checkout=${c.sessionId}`) }).catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }))
  if ('error' in r) { await db.update(billingCheckoutSessions).set({ status: 'failed' }).where(eq(billingCheckoutSessions.id, c.sessionId)); return { error: `The payment page didn’t open — ${r.error}` } }
  return { ...c, payUrl: r.url }
}

/** Start a checkout for a plan: the pending session 1.0's route writes first (`billing_checkout_sessions`). */
export async function startPlanCheckout(input: { planId: string; seats: number; cycle: string; trial: boolean }): Promise<Checkout | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
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
  await db.insert(billingCheckoutSessions).values({ id, memberId: o.id, kind: 'plan', planId: plan.id, seats, period: cycle, status: 'pending', trial, createdAt: new Date() })
  return withProvider({ sessionId: id, amount: trial ? 0 : priceFor(plan, seats, cycle), forWhat: `${plan.name}${plan.id === 'pro_studio' ? ` · ${seats} seats` : ''} · ${cycle === 'yearly' ? 'yearly' : 'monthly'}`, trial }, 'plan', o)
}

/** Start a top-up — (pending modules S19) any amount on 1.0's grid, 100–5,000 AI credits in steps of 50 at S$2 per 100 (1.0 refuses an
    off-grid amount rather than snapping it); 1,000 when none is given. */
export async function startTopUp(input: { credits?: number } = {}): Promise<Checkout | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const o = await ownerOnly('buy AI credits'); if ('error' in o) return o
  const credits = input?.credits ?? TOPUP_CREDITS
  if (!isTopupAmount(credits)) return { error: `Pick between ${fmtCredits(TOPUP_MIN)} and ${fmtCredits(TOPUP_MAX)} AI credits, in fifties.` }
  const id = randomUUID()
  await db.insert(billingCheckoutSessions).values({ id, memberId: o.id, kind: 'topup', planId: null, seats: 1, period: 'monthly', status: 'pending', creditsRequested: credits, createdAt: new Date() })
  return withProvider({ sessionId: id, amount: topupPrice(credits), forWhat: `${fmtCredits(credits)} AI credits`, trial: false }, 'topup', o)
}

/** The demo payment completes — what Dodo's webhook does on `payment.succeeded` / `subscription.active` (integration A-13).
    (pending modules S34) The records are lib/credits/checkout.ts `finishCheckout`'s, shared with a real provider's webhook; once a real
    provider is plugged in, only it says a checkout was paid — the browser's press is refused. */
export async function completeCheckout(sessionId: string, opts: { trial?: boolean } = {}): Promise<{ ok: true; summary: CreditSummary; granted: number } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const o = await ownerOnly('pay for the studio'); if ('error' in o) return o
  if (!paymentsAreStandIn()) return { error: 'The payment is confirmed by the payment page — this updates once it is.' }
  const [s] = await db.select({ memberId: billingCheckoutSessions.memberId }).from(billingCheckoutSessions).where(eq(billingCheckoutSessions.id, String(sessionId ?? '')))
  if (!s || s.memberId !== o.id) return { error: 'That checkout is gone — start it again.' }
  const r = await finishCheckout(String(sessionId), { trial: !!opts?.trial })
  if ('error' in r) return r
  done()
  return { ok: true, summary: await fetchCreditSummary(), granted: r.granted }
}

/* ── the plan, from the demo "Manage billing" (Dodo's customer portal, integration B-20) ──────────────────────────────────────────── */

/** (pending modules S34) With a real payment provider the plan and the card are changed on its own billing page (Dodo's customer portal) —
    its events reach POST /api/webhooks/payments; the demo's stand-in dialog changes them here. */
async function providerPortal(): Promise<{ ok: true; url: string } | Err | null> {
  if (paymentsAreStandIn()) return null
  const url = await paymentProvider().billingPortal?.().catch(() => null)
  return url ? { ok: true, url } : { error: 'Change the plan and the card on the payment provider’s billing page.' }
}

export async function cancelAtPeriodEnd(): Promise<{ ok: true; until: number } | { ok: true; url: string } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const o = await ownerOnly('cancel the plan'); if ('error' in o) return o
  const portal = await providerPortal(); if (portal) return portal
  const sub = await currentSubscription()
  if (!sub || sub.planId === 'free') return { error: 'The studio is on Free — there’s nothing to cancel.' }
  await db.update(subscriptions).set({ cancelAtPeriodEnd: true, updatedAt: new Date() }).where(eq(subscriptions.id, sub.id))
  done()
  return { ok: true, until: sub.currentPeriodEnd.getTime() }
}
export async function keepPlan(): Promise<{ ok: true } | { ok: true; url: string } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const o = await ownerOnly('change the plan'); if ('error' in o) return o
  const portal = await providerPortal(); if (portal) return portal
  const sub = await currentSubscription()
  if (!sub) return { error: 'There’s no plan to keep.' }
  await db.update(subscriptions).set({ cancelAtPeriodEnd: false, updatedAt: new Date() }).where(eq(subscriptions.id, sub.id))
  done()
  return { ok: true }
}
/** A failed payment put right: the plan is active again and the period's invoice is paid (Dodo's `payment.succeeded` in grace, A-14). */
export async function updateCard(): Promise<{ ok: true } | { ok: true; url: string } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const o = await ownerOnly('update the card'); if ('error' in o) return o
  const portal = await providerPortal(); if (portal) return portal
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

/* ── (pending modules S19) the studio's auto top-up and its seats — the Owner's, as buying and the plan are (1.0's `settings.editStudio`) ── */

/** Turn auto top-up on, change it or turn it off (lib/credits/auto-topup.ts). Answers the setting it replaced, for Undo. */
export async function setAutoTopUp(input: AutoTopUp): Promise<{ ok: true; previous: AutoTopUp } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const o = await ownerOnly('change auto top-up'); if ('error' in o) return o
  const next: AutoTopUp = { on: input?.on === true, below: Number(input?.below), credits: Number(input?.credits), ceiling: Number(input?.ceiling) }
  const bad = autoTopUpError(next); if (bad) return { error: bad }
  const [row] = await db.select().from(settings).where(eq(settings.key, AUTO_TOPUP_KEY))
  const previous = parseAutoTopUp(row?.value ?? null)
  const value = JSON.stringify(next)
  await db.insert(settings).values({ key: AUTO_TOPUP_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  done()
  return { ok: true, previous }
}

/**
 * Change Pro — Studio's seats (1.0's POST /api/billing/seats): at least the members who use the AI tools (Accounting takes none, REG-1669)
 * and the plan's three, at most 200; more start today, billed for what is left of the period; fewer from the billing date. 1.0's refusals,
 * in its words: only an active Pro — Studio sells seats (a trial converts first, a failed payment is put right first, Max is arranged).
 */
export async function changeSeats(input: { seats: number }): Promise<{ ok: true; seats: number; effective: 'now' | 'renewal' | 'none'; charged: number; on: number; previous: number } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const o = await ownerOnly('change the plan’s seats'); if ('error' in o) return o
  const sub = await currentSubscription()
  if (!sub || sub.planId !== 'pro_studio') return { error: sub?.planId === 'max' ? 'Max’s seats are arranged with our team — press Talk to us in Plans.' : 'Seats are sold on Pro — Studio. Move to it in Plans.' }
  if (sub.status === 'trialing') return { error: 'Seat changes open once your trial turns into Pro. Need more seats now? Talk to us.' }
  if (sub.status !== 'active') return { error: 'Seat changes open once your payment is up to date — update the card in Manage billing.' }
  const seats = Math.floor(Number(input?.seats))
  const plan = planRow(sub.planId)
  if (!Number.isInteger(seats) || seats < plan.minSeats || seats > 200) return { error: `Choose between ${plan.minSeats} and 200 seats.` }
  const team = (await db.select({ role: members.role }).from(members).where(eq(members.isActive, true))).filter((m) => opensWorkspace(m.role)).length
  if (seats < team) return { error: `You have ${team} members who use the AI tools — you can’t go below that.` }
  const at = Date.now()
  /* (pending modules S34) more seats are charged to the card on file first — a refusal changes nothing (the demo charges nothing) */
  const charge = paymentsAreStandIn() ? undefined : async (amountCents: number) => {
    const p = await paymentProvider().charge({ ref: `seats:${sub.id}:${seats}:${at}`, amountCents, forWhat: `${seats - sub.seats} more seats · ${plan.name}` }).catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }))
    return 'error' in p ? p.error : null
  }
  const r = await setSeats({ sub, seats, by: o.id, at, charge })
  if (r.refused) return { error: `The card on file didn’t go through — ${r.refused}` }
  if (r.effective === 'now' && r.charged > 0) {
    await notify('credit_receipt', [o.id, ...(await ownerIds())], { title: `Receipt · ${sgd2(r.charged)}`, body: `${seats - sub.seats} more ${seats - sub.seats === 1 ? 'seat' : 'seats'} on ${plan.name} — ${seats} seats, for the rest of this period`, href: '/company/plan/billing', actorId: null })
  }
  done()
  return { ok: true, seats, effective: r.effective, charged: r.charged, on: r.on, previous: sub.scheduledSeats ?? sub.seats }
}

/** Max: a short request to OpenMaison's team, inside the app (Q-18). */
export async function talkToUs(input: { note: string; phone: string }): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  if (!isSgPhone(phoneDigits(input.phone))) return { error: MSG.phone }
  return { ok: true }   // Platform: 1.0 sends Max's leads to its sales team (A §6, "where Max leads go" is open)
}

/* ── monthly amounts (1.0's caps; the Owner only, integration B-02) ───────────────────────────────────────────────────────────────── */

export async function setMonthlyAmount(memberId: string, amount: number | null): Promise<{ ok: true; previous: number | null } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
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
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const o = await ownerOnly('set monthly amounts'); if ('error' in o) return o
  if (amount != null && (!Number.isInteger(amount) || amount < 0 || amount > 10_000_000)) return { error: 'Enter a whole number of AI credits, or leave it empty for no limit.' }
  const value = JSON.stringify({ monthlyAmount: amount })
  await db.insert(settings).values({ key: 'credit_defaults', value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  done()
  return { ok: true }
}

/* ── asking the Owner (integration B-19; 1.0's "Request more" did nothing) ───────────────────────────────────────────────────────── */

export async function askForCredits(input: { kind: 'pool' | 'monthly'; needed: number }): Promise<{ ok: true; owner: string } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
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

/** (S42 D-10 · D·4, as recommended — his "build all of them" 2026-10-11) What the switch keeps so that *Pro — Studio* puts the base back
    exactly — it is used live in pitches and its numbers are read aloud: the Pro — Studio it left for Free or the trial (its seats, its billing
    and credit months, the plan credits it had), and what *Almost out* took away from the plan's credits and from the top-ups (which never
    expire). Settings `demo_plan`; Reset to base forgets it with the rest of the settings. */
type DemoHeld = {
  base?: { seats: number; cycle: string; billingFrom: number; billingTo: number; periodStart: number; periodEnd: number; planCredits: number }
  taken?: { plan: number; topup: number }
}
const HELD_KEY = 'demo_plan'
async function readHeld(): Promise<DemoHeld> {
  const [r] = await db.select().from(settings).where(eq(settings.key, HELD_KEY))
  try { return r ? (JSON.parse(r.value) as DemoHeld) : {} } catch { return {} }
}
async function writeHeld(h: DemoHeld) {
  if (!h.base && !h.taken) { await db.delete(settings).where(eq(settings.key, HELD_KEY)); return }
  const value = JSON.stringify(h)
  await db.insert(settings).values({ key: HELD_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
}
/** A demo move of the two buckets, written to the ledger so the balance is still the ledger's sum (R63's check) — and, with `period`, the
    credit month it belongs to. */
async function demoMove(at: number, o: { plan: number; topup: number; actionKey: string; reason: string; ref: string; period?: { start: number; end: number } }) {
  const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
  if (!bal) return
  const plan = Math.max(0, bal.planCredits + o.plan), topup = Math.max(0, bal.topupCredits + o.topup)
  const delta = plan + topup - (bal.planCredits + bal.topupCredits)
  await db.transaction(async (tx) => {
    if (delta !== 0) await tx.insert(creditLedger).values({ id: randomUUID(), memberId: null, actionKey: o.actionKey, credits: delta, balanceAfter: plan + topup, reason: o.reason, refId: o.ref, createdAt: new Date(at) })
    await tx.update(studioCreditBalances).set({ planCredits: plan, topupCredits: topup, ...(o.period ? { periodStart: new Date(o.period.start), periodEnd: new Date(o.period.end) } : {}), updatedAt: new Date(at) }).where(eq(studioCreditBalances.id, BALANCE_ID))
  })
}

export async function setDemoPlan(state: DemoPlan): Promise<{ ok: true; label: string } | Err> {
  const at = Date.now()
  await ensurePeriod(at)
  /* (S42 D-10) a seat is a member who uses the AI tools — Accounting keeps the books and takes none (REG-1669, the summary's own count) */
  const seats = Math.max(3, (await db.select({ role: members.role }).from(members).where(eq(members.isActive, true))).filter((m) => opensWorkspace(m.role)).length)
  const counting = async (on: boolean) => db.update(studioCreditBalances).set({ enforcementEnabled: on, enforcementStartsAt: on ? null : new Date(addMonths(at, 1)), updatedAt: new Date(at) }).where(eq(studioCreditBalances.id, BALANCE_ID))
  const held = await readHeld()
  /* Almost out was a pretend: any other pick first gives back what it took — the top-ups too */
  if (state !== 'low' && held.taken) { await demoMove(at, { plan: held.taken.plan, topup: held.taken.topup, actionKey: 'adjust', reason: 'adjust', ref: 'demo' }); held.taken = undefined }
  const sub = await currentSubscription()
  /* leaving the base Pro — Studio for Free or the trial: kept, so Pro — Studio puts it back as it was */
  if ((state === 'free' || state === 'trial') && sub && sub.planId === 'pro_studio' && sub.status !== 'trialing') {
    const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
    if (bal) held.base = { seats: sub.seats, cycle: sub.billingCycle, billingFrom: sub.currentPeriodStart.getTime(), billingTo: sub.currentPeriodEnd.getTime(), periodStart: bal.periodStart.getTime(), periodEnd: bal.periodEnd.getTime(), planCredits: bal.planCredits }
  }
  /* on Pro — Studio: the subscription it is on; else the base it left, while its month lasts — the same seats, the same months, the plan
     credits it had (top-ups were never touched); else a new month, billed with its own invoice */
  const toPro = async () => {
    const s = await currentSubscription()
    if (s && s.planId === 'pro_studio' && s.status !== 'trialing') return s
    const base = held.base && held.base.billingTo > at && held.base.periodEnd > at ? held.base : null
    held.base = undefined
    if (!base) return changePlan({ planId: 'pro_studio', seats, cycle: 'monthly', trial: false, at, by: null, invoice: true, quiet: true })
    const id = randomUUID()
    await db.transaction(async (tx) => {
      await tx.update(subscriptions).set({ cancelledAt: new Date(at), status: 'cancelled', updatedAt: new Date(at) }).where(isNull(subscriptions.cancelledAt))
      await tx.insert(subscriptions).values({ id, planId: 'pro_studio', billingCycle: base.cycle, status: 'active', seats: base.seats, currentPeriodStart: new Date(base.billingFrom), currentPeriodEnd: new Date(base.billingTo), trialEndsAt: null, cancelAtPeriodEnd: false, cancelledAt: null, graceUntil: null, createdBy: null, createdAt: new Date(at), updatedAt: new Date(at) })
    })
    const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
    if (bal) await demoMove(at, { plan: base.planCredits - bal.planCredits, topup: 0, actionKey: 'plan_change', reason: 'refresh', ref: `plan:${id}`, period: { start: base.periodStart, end: base.periodEnd } })
    await withdrawStaleOffers(at).catch(() => 0)   // (pending modules S41b-4) off Free, every offer stops — as changePlan does
    return currentSubscription()
  }
  if (state === 'free') { if (sub?.planId !== 'free') await changePlan({ planId: 'free', seats: 1, cycle: 'monthly', trial: false, at, by: null, invoice: false, quiet: true }); await counting(true) }
  if (state === 'trial') { await db.update(subscriptions).set({ trialEndsAt: null }).where(eq(subscriptions.status, 'cancelled')); await changePlan({ planId: 'pro_studio', seats, cycle: 'monthly', trial: true, at, by: null, invoice: false, quiet: true }); await counting(true) }
  if (state === 'pro' || state === 'low') {
    const s = await toPro()
    if (s) await db.update(subscriptions).set({ cancelAtPeriodEnd: false, graceUntil: null, status: 'active', updatedAt: new Date(at) }).where(eq(subscriptions.id, s.id))
    await counting(true)
  }
  if (state === 'past_due') {
    const s = await toPro()
    if (s) await db.update(subscriptions).set({ status: 'past_due', graceUntil: new Date(at + 14 * DAY), updatedAt: new Date(at) }).where(eq(subscriptions.id, s.id))
    await counting(true)
    await notify('payment_failed', await ownerIds(), { title: 'The payment for the plan didn’t go through', body: `Pro stays on until ${new Date(at + 14 * DAY).getDate()} ${new Date(at + 14 * DAY).toLocaleString('en-SG', { month: 'short' })} — update the card before then.`, href: '/company/plan/billing', actorId: null })
  }
  if (state === 'not_counting') await counting(false)
  /* Almost out: Pro, counted, 15 AI credits left — the warning before the press, the moments and buy-and-carry-on, for a demo. Written as a
     ledger adjustment, so the balance still equals the ledger (R63's check); what it took is kept and given back by the next pick (S42 D-10). */
  if (state === 'low') {
    const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
    if (bal) {
      const LOW = 15, total = bal.planCredits + bal.topupCredits
      if (total !== LOW) {
        const plan = Math.min(LOW, bal.planCredits), topup = LOW - plan
        const take = { plan: bal.planCredits - plan, topup: bal.topupCredits - topup }
        await demoMove(at, { plan: -take.plan, topup: -take.topup, actionKey: 'adjust', reason: 'adjust', ref: 'demo' })
        held.taken = { plan: (held.taken?.plan ?? 0) + take.plan, topup: (held.taken?.topup ?? 0) + take.topup }
      }
    }
  }
  await writeHeld(held)
  done()
  const label = { free: 'Free', trial: 'Pro — Studio · trial', pro: 'Pro — Studio', low: 'Pro — Studio · almost out', past_due: 'Pro — Studio · payment failed', not_counting: 'Not counting yet' }[state]
  return { ok: true, label }
}

/** Someone who may not change the plan asks the Owner to (Plans' review step, read-only for them — 1.0's `upgrade: ['owner']`).
    (S42 D-07) One ask while it waits: a second press on the same plan answers with the first ask's day and writes nothing more to the
    Owner's bell (the bell row is the ask's record — `UPGRADE_ASK_HREF`, `upgradeAskOf`); the row says where it was asked from — a feature's
    lock, Plans, or Plan & billing. */
export async function askToUpgrade(planId: string, from?: string): Promise<{ ok: true; owner: string; askedAt: number; again: boolean } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const m = await me()
  if (ownerRole(m.role)) return { error: 'You can change the plan yourself.' }
  const plan = planRow(planId)
  const owner = await ownerName()
  const prev = await upgradeAskOf(m.id)
  if (prev) return { ok: true, owner, askedAt: prev, again: true }
  const body = isProFeature(from) ? `${comesWithPro(from)} — asked from its lock. Review it in Plan & billing, or talk it over.`
    : from === 'billing' ? 'From Plan & billing. Review it there, or talk it over.' : 'From Plans. Review it in Plan & billing, or talk it over.'
  await notify('credit_request', await ownerIds(), { title: `${m.name} asks to move the studio to ${plan.name}`, body, href: UPGRADE_ASK_HREF, actorId: m.id })
  done()
  return { ok: true, owner, askedAt: Date.now(), again: false }
}
