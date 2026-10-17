import 'server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { billingCheckoutSessions, members, subscriptions } from '@/lib/db/schema'
import { notify } from '@/lib/notifications/emit'
import { addTopUp, changePlan } from './ledger'
import { allowanceFor, planRow, priceFor, sgd2, TOPUP_CREDITS, topupPrice, type BillingCycle } from './plans'
import { fmtCredits } from './model'

/*
 * (pending modules S34 — moved out of app/credits/actions.ts `completeCheckout`, unchanged) A paid checkout lands: what Dodo's webhook does on
 * `payment.succeeded` / `subscription.active` (integration A-13). The demo checkout calls it through `completeCheckout` (the Owner's press);
 * a real payment provider through its webhook (app/api/webhooks/payments) — the same records either way: the session claimed once
 * (compare-and-set, so a second webhook or a double press finishes nothing), the top-up or the plan, the tax invoice, the Owner's receipt.
 * Not a Server Action: nothing in a browser can call it.
 */

export type Finished = { ok: true; granted: number; by: string | null } | { error: string }

async function ownerIds(): Promise<string[]> {
  return (await db.select({ id: members.id }).from(members).where(and(eq(members.role, 'Owner'), eq(members.isActive, true)))).map((m) => m.id)
}
/** One trial per studio (the website's rule): any plan that ever carried a trial date. */
export async function hadTrial(): Promise<boolean> {
  const rows = await db.select({ trialEndsAt: subscriptions.trialEndsAt }).from(subscriptions)
  return rows.some((r) => r.trialEndsAt != null)
}

export async function finishCheckout(sessionId: string, o: { trial?: boolean } = {}): Promise<Finished> {
  const [s] = await db.select().from(billingCheckoutSessions).where(eq(billingCheckoutSessions.id, sessionId))
  if (!s) return { error: 'That checkout is gone — start it again.' }
  if (s.status !== 'pending') return { error: 'That checkout is already done.' }
  const claim = await db.update(billingCheckoutSessions).set({ status: 'completed', completedAt: new Date() }).where(and(eq(billingCheckoutSessions.id, sessionId), eq(billingCheckoutSessions.status, 'pending')))
  if (!claim.rowsAffected) return { error: 'That checkout is already done.' }
  const at = Date.now()
  const by = s.memberId
  const tell = by ? [by, ...(await ownerIds())] : await ownerIds()
  let granted = 0
  if (s.kind === 'topup') {
    const credits = s.creditsRequested ?? TOPUP_CREDITS   // a session from before per-amount top-ups bought 1.0's fixed 1,000
    await addTopUp({ by, at, credits })
    granted = credits
    await db.update(billingCheckoutSessions).set({ creditsGranted: granted }).where(eq(billingCheckoutSessions.id, sessionId))
    await notify('credit_receipt', tell, { title: `Receipt · ${sgd2(topupPrice(credits))}`, body: `${fmtCredits(credits)} AI credits · top-ups never expire`, href: '/company/plan/billing', actorId: null })
  } else {
    const plan = planRow(s.planId ?? 'free')
    /* the trial is chosen on the review step and checked again here: monthly Pro, once per studio (the website's rule) */
    const trial = !!(o.trial ?? s.trial) && s.period === 'monthly' && plan.trialPeriodDays > 0 && !(await hadTrial())
    const sub = await changePlan({ planId: plan.id, seats: s.seats, cycle: s.period === 'yearly' ? 'yearly' : 'monthly', trial, at, by, invoice: true })
    granted = allowanceFor(plan, sub.seats)
    await db.update(billingCheckoutSessions).set({ creditsGranted: granted }).where(eq(billingCheckoutSessions.id, sessionId))
    if (sub.status !== 'trialing') await notify('credit_receipt', tell, { title: `Receipt · ${sgd2(priceFor(plan, sub.seats, sub.billingCycle as BillingCycle))}`, body: `${plan.name}${plan.id === 'pro_studio' ? ` · ${sub.seats} seats` : ''} · ${fmtCredits(granted)} AI credits a month`, href: '/company/plan/billing', actorId: null })
  }
  return { ok: true, granted, by }
}

/** A provider's "payment failed" for a session still waiting — kept as failed; the Owner starts again. */
export async function failCheckout(sessionId: string): Promise<boolean> {
  const r = await db.update(billingCheckoutSessions).set({ status: 'failed' }).where(and(eq(billingCheckoutSessions.id, sessionId), eq(billingCheckoutSessions.status, 'pending')))
  return r.rowsAffected > 0
}
