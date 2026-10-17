import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { billingCheckoutSessions, creditLedger, creditRequests, invoices, members, settings, studioCreditBalances, studioMemberCreditCaps, subscriptions, type Subscription } from '@/lib/db/schema'
import { notify } from '@/lib/notifications/emit'
import { allowanceFor, planRow, priceFor, proratedByDays, sgd, sgd2, TOPUP_CREDITS, topupPrice, type BillingCycle, type PlanId } from './plans'
import { costOf, type ActionKey } from './schedule'
import { dayMonth, fmtCredits, type Refusal } from './model'
import { AUTO_TOPUP_KEY, autoDue, autoSessionId, parseAutoTopUp } from './auto-topup'
import { paymentProvider, paymentsAreStandIn } from './payments'   // (pending modules S34)
import { withdrawStaleOffers } from './nudges'   // (pending modules S41b-4) an upgrade or a top-up takes the upgrade offers it answers out of the bell

/**
 * (REG-699…) The AI credits ledger — 1.0's rules as they are, with the five fixes where 1.0 breaks its own promise (integration §B):
 *
 *  · two buckets: this month's `plan_credits` are spent first, `topup_credits` never expire (A-03); a refund lands in the top-up bucket (A-05);
 *  · a charge is taken before the work and given back on failure or cancel (A-05, Q-31); a charge is keyed by its work (`render:<job id>`,
 *    `quote:<quote id>`), so a retry or a double press never charges twice (B-12 — 1.0's random refs did);
 *  · the check order is 1.0's: the member's monthly amount, then the studio's credits (A-07);
 *  · each month refreshes to the plan's allowance and the unused rest ends — written as two ledger rows, so the balance always equals the
 *    ledger (1.0 wrote none, C-04); annual plans refresh monthly too (B-07); Free's welcome credits live with the top-ups (B-08); one date
 *    anchors both the credits and the bill (B-09).
 *
 * The monthly refresh, a trial's end, a lapse after its grace and a cancel at the period's end are 1.0's cron and Dodo's webhook; the
 * prototype applies them lazily, whenever credits are read or spent (`ensurePeriod`), with a compare-and-set so two requests can't both.
 */

export const BALANCE_ID = 'studio'
const DAY = 86_400_000

/** Months added in local time, keeping the anchor's day (a 31st lands on the month's last day) — 1.0's `addMonthsUtc`. */
export function addMonths(ms: number, n: number): number {
  const d = new Date(ms)
  const day = d.getDate()
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes(), d.getSeconds())
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
  t.setDate(Math.min(day, last))
  return t.getTime()
}
const sec = (ms: number) => new Date(Math.floor(ms / 1000) * 1000)

/** The studio's current plan: the newest subscription that hasn't been replaced. */
export async function currentSubscription(): Promise<Subscription | null> {
  const [s] = await db.select().from(subscriptions).where(isNull(subscriptions.cancelledAt)).orderBy(desc(subscriptions.createdAt)).limit(1)
  return s ?? null
}

/** Credits used since `since` — spends net of their refunds; a member's own, or the studio's. */
export async function usedSince(since: number, memberId?: string | null): Promise<number> {
  const where = memberId ? and(gte(creditLedger.createdAt, sec(since)), inArray(creditLedger.reason, ['spend', 'refund']), eq(creditLedger.memberId, memberId)) : and(gte(creditLedger.createdAt, sec(since)), inArray(creditLedger.reason, ['spend', 'refund']))
  const [r] = await db.select({ total: sql<number>`coalesce(sum(${creditLedger.credits}), 0)` }).from(creditLedger).where(where)
  return Math.max(0, -Number(r?.total ?? 0))
}

type Row = { memberId: string | null; actionKey: string; credits: number; reason: string; refId: string | null; at: number }
async function writeRows(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], startBalance: number, rows: Row[]): Promise<number> {
  let bal = startBalance
  for (const r of rows) {
    bal += r.reason === 'shadow_spend' ? 0 : r.credits
    await tx.insert(creditLedger).values({ id: randomUUID(), memberId: r.memberId, actionKey: r.actionKey, credits: r.credits, balanceAfter: bal, reason: r.reason, refId: r.refId, createdAt: sec(r.at) })
  }
  return bal
}

/** "INV-202609-0002": the month issued and the studio's running number. */
async function nextInvoiceNumber(at: number, bump: number): Promise<string> {
  const d = new Date(at)
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(invoices)
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${String(Number(r?.n ?? 0) + 1 + bump).padStart(4, '0')}`
}
/** The tax invoice a paid period or a top-up leaves (1.0's `invoices`, 009). */
export async function issueInvoice(o: { subscriptionId: string | null; forWhat: string; amount: number; start: number; end: number; at: number }) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.insert(invoices).values({ id: randomUUID(), subscriptionId: o.subscriptionId, invoiceNumber: await nextInvoiceNumber(o.at, attempt), planName: o.forWhat, amount: o.amount, currency: 'SGD', billingPeriodStart: sec(o.start), billingPeriodEnd: sec(o.end), status: 'paid', issuedAt: sec(o.at), paidAt: sec(o.at) })
      return
    } catch { /* a number taken by a concurrent issue — take the next one */ }
  }
}
const planLabel = (s: Pick<Subscription, 'planId' | 'seats'>) => {
  const p = planRow(s.planId)
  return p.id === 'pro_studio' || p.id === 'max' ? `${p.name} · ${s.seats} seats` : p.name
}

/**
 * Bring the credits up to now: each passed month refreshes (the unused rest ends, the month's allowance arrives), a trial that ended
 * becomes the paid plan (its first invoice), a lapse past its grace and a cancel at the period's end become Free. Safe to call on every
 * read: each step claims its boundary with a compare-and-set on the balance row.
 */
export async function ensurePeriod(now = Date.now()): Promise<void> {
  for (let step = 0; step < 48; step++) {
    const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
    const sub = await currentSubscription()
    if (!bal || !sub) return
    const periodEnd = bal.periodEnd.getTime()
    /* a lapse past its grace, or a cancel whose period ended → Free from that moment (1.0: grace.expired → plan free, A-14) */
    const lapseAt = sub.status === 'past_due' && sub.graceUntil ? sub.graceUntil.getTime() : sub.cancelAtPeriodEnd ? sub.currentPeriodEnd.getTime() : null
    if (lapseAt != null && lapseAt <= now && lapseAt <= periodEnd) {
      await changePlan({ planId: 'free', seats: 1, cycle: 'monthly', trial: false, at: lapseAt, by: null, invoice: false, quiet: true })
      continue
    }
    /* a trial that ended → the paid month starts: its invoice, and the credits re-anchored on the day billing starts (one date, B-09) */
    if (sub.status === 'trialing' && sub.trialEndsAt && sub.trialEndsAt.getTime() <= now && sub.trialEndsAt.getTime() <= periodEnd) {
      const at = sub.trialEndsAt.getTime()
      const claim = await db.update(subscriptions).set({ status: 'active', currentPeriodStart: sec(at), currentPeriodEnd: sec(addMonths(at, sub.billingCycle === 'yearly' ? 12 : 1)), updatedAt: sec(at) })
        .where(and(eq(subscriptions.id, sub.id), eq(subscriptions.status, 'trialing')))
      if (!claim.rowsAffected) continue
      await issueInvoice({ subscriptionId: sub.id, forWhat: planLabel(sub), amount: priceFor(planRow(sub.planId), sub.seats, sub.billingCycle as BillingCycle), start: at, end: addMonths(at, sub.billingCycle === 'yearly' ? 12 : 1), at })
      await refreshTo({ at, planId: sub.planId as PlanId, seats: sub.seats, expectEnd: periodEnd })
      continue
    }
    if (periodEnd > now) return
    /* (pending modules S19 — 1.0's POST /api/billing/seats) fewer seats take effect on the billing date: the renewal that is due now carries
       them — its bill and, from this month on, its AI credits (claimed once, like every other step) */
    let seats = sub.seats
    if (sub.scheduledSeats != null && sub.status === 'active' && sub.currentPeriodEnd.getTime() <= periodEnd) {
      const claim = await db.update(subscriptions).set({ seats: sub.scheduledSeats, scheduledSeats: null, updatedAt: sec(sub.currentPeriodEnd.getTime()) })
        .where(and(eq(subscriptions.id, sub.id), eq(subscriptions.scheduledSeats, sub.scheduledSeats)))
      if (!claim.rowsAffected) continue
      seats = sub.scheduledSeats
    }
    /* the month ended → refresh; a monthly bill ends with it (a yearly one every twelve) */
    /* no payment, no new month: a studio past due keeps its top-ups while its grace runs (1.0: renewal credits come with the payment) */
    const moved = await refreshTo({ at: periodEnd, planId: sub.planId as PlanId, seats, expectEnd: periodEnd, grant: sub.status !== 'past_due' })
    if (!moved) continue
    if (sub.status === 'active' && sub.planId !== 'free' && sub.currentPeriodEnd.getTime() <= periodEnd) {
      const start = sub.currentPeriodEnd.getTime(), months = sub.billingCycle === 'yearly' ? 12 : 1
      const claim = await db.update(subscriptions).set({ currentPeriodStart: sec(start), currentPeriodEnd: sec(addMonths(start, months)), updatedAt: sec(start) })
        .where(and(eq(subscriptions.id, sub.id), eq(subscriptions.currentPeriodEnd, sub.currentPeriodEnd)))
      if (claim.rowsAffected) await issueInvoice({ subscriptionId: sub.id, forWhat: planLabel({ planId: sub.planId, seats }), amount: priceFor(planRow(sub.planId), seats, sub.billingCycle as BillingCycle), start, end: addMonths(start, months), at: start })
    }
    if (sub.status === 'active' || sub.status === 'trialing') await notifyRenewed(sub).catch(() => {})
  }
}

/** One month's refresh at `at`: claim the boundary, end the unused plan credits, bring the allowance. false = someone else did it. */
async function refreshTo(o: { at: number; planId: PlanId; seats: number; expectEnd: number; action?: string; grant?: boolean }): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [bal] = await tx.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
    if (!bal || bal.periodEnd.getTime() !== o.expectEnd) return false
    const allowance = o.grant === false ? 0 : allowanceFor(planRow(o.planId), o.seats)
    const start = o.at, end = addMonths(o.at, 1)
    const claim = await tx.update(studioCreditBalances).set({ planCredits: allowance, periodStart: sec(start), periodEnd: sec(end), updatedAt: sec(o.at) })
      .where(and(eq(studioCreditBalances.id, BALANCE_ID), eq(studioCreditBalances.periodEnd, bal.periodEnd)))
    if (!claim.rowsAffected) return false
    const rows: Row[] = []
    if (bal.planCredits > 0) rows.push({ memberId: null, actionKey: 'plan_expired', credits: -bal.planCredits, reason: 'refresh', refId: `period:${Math.floor(o.expectEnd / 1000)}`, at: o.at })
    if (allowance > 0) rows.push({ memberId: null, actionKey: o.action ?? 'plan_allowance', credits: allowance, reason: 'refresh', refId: `period:${Math.floor(start / 1000)}`, at: o.at })
    await writeRows(tx, bal.planCredits + bal.topupCredits, rows)
    return true
  })
}

async function notifyRenewed(sub: Subscription) {
  const runners = await db.select({ id: members.id }).from(members).where(and(inArray(members.role, ['Owner', 'Admin']), eq(members.isActive, true)))
  const allowance = allowanceFor(planRow(sub.planId), sub.seats)
  await notify('credits_renewed', runners.map((r) => r.id), { title: `This month’s ${fmtCredits(allowance)} AI credits are in`, body: sub.planId === 'free' ? 'Free · 30 a month' : `${planLabel(sub)} · shared by the studio`, href: '/company/plan', actorId: null })
}

/**
 * Move the studio to a plan at `at` (an upgrade, a trial, a lapse, a cancel reaching its date, the demo's plan switch): the old
 * subscription ends, the new one starts, this month's plan credits end and the new plan's month arrives — top-ups stay (1.0's rule).
 */
export async function changePlan(o: { planId: PlanId; seats: number; cycle: BillingCycle; trial: boolean; at: number; by: string | null; invoice: boolean; status?: 'active' | 'past_due'; /** a lapse or the demo switch: nobody waiting is told credits arrived */ quiet?: boolean }): Promise<Subscription> {
  const plan = planRow(o.planId)
  const seats = o.planId === 'pro_studio' || o.planId === 'max' ? Math.max(plan.minSeats, o.seats) : 1
  const trialEnds = o.trial && plan.trialPeriodDays > 0 ? o.at + plan.trialPeriodDays * DAY : null
  const months = o.cycle === 'yearly' ? 12 : 1
  const id = randomUUID()
  const row = await db.transaction(async (tx) => {
    await tx.update(subscriptions).set({ cancelledAt: sec(o.at), status: 'cancelled', updatedAt: sec(o.at) }).where(isNull(subscriptions.cancelledAt))
    const values = { id, planId: plan.id, billingCycle: o.cycle, status: trialEnds ? 'trialing' : (o.status ?? 'active'), seats, currentPeriodStart: sec(o.at), currentPeriodEnd: sec(trialEnds ?? addMonths(o.at, months)), trialEndsAt: trialEnds ? sec(trialEnds) : null, cancelAtPeriodEnd: false, cancelledAt: null, graceUntil: null, createdBy: o.by, createdAt: sec(o.at), updatedAt: sec(o.at) }
    await tx.insert(subscriptions).values(values)
    const [bal] = await tx.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
    const allowance = allowanceFor(plan, seats)
    const start = o.at, end = addMonths(o.at, 1)
    if (!bal) {
      await tx.insert(studioCreditBalances).values({ id: BALANCE_ID, planCredits: allowance, topupCredits: 0, periodStart: sec(start), periodEnd: sec(end), enforcementEnabled: true, enforcementStartsAt: null, updatedAt: sec(o.at) })
      await writeRows(tx, 0, [{ memberId: o.by, actionKey: 'plan_change', credits: allowance, reason: 'refresh', refId: `plan:${id}`, at: o.at }])
    } else {
      await tx.update(studioCreditBalances).set({ planCredits: allowance, periodStart: sec(start), periodEnd: sec(end), updatedAt: sec(o.at) }).where(eq(studioCreditBalances.id, BALANCE_ID))
      const rows: Row[] = []
      if (bal.planCredits > 0) rows.push({ memberId: o.by, actionKey: 'plan_expired', credits: -bal.planCredits, reason: 'refresh', refId: `plan:${id}`, at: o.at })
      rows.push({ memberId: o.by, actionKey: 'plan_change', credits: allowance, reason: 'refresh', refId: `plan:${id}`, at: o.at })
      await writeRows(tx, bal.planCredits + bal.topupCredits, rows)
    }
    return values
  })
  if (o.invoice && !trialEnds && plan.id !== 'free') await issueInvoice({ subscriptionId: id, forWhat: planLabel({ planId: plan.id, seats }), amount: priceFor(plan, seats, o.cycle), start: o.at, end: addMonths(o.at, months), at: o.at })
  if (!o.quiet && plan.id !== 'free') await answerPoolAsks(o.by, 'a new plan')
  if (plan.id !== 'free') await withdrawStaleOffers().catch(() => 0)   // (pending modules S41b-4 — 1.0's R1) off Free, every offer stops
  return row as Subscription
}

/** A top-up lands (1.0's webhook: the amount bought into the top-up bucket, A-13) — bought by hand (`by`, any amount on the grid since
    1.0's per-amount top-ups) or by the studio's auto top-up (`auto`, nobody's press — pending modules S19). */
export async function addTopUp(o: { by: string | null; at: number; credits?: number; auto?: boolean }): Promise<number> {
  const credits = Math.max(1, Math.round(o.credits ?? TOPUP_CREDITS))
  const key = o.auto ? 'auto_topup' : 'topup'
  const bal = await db.transaction(async (tx) => {
    const [b] = await tx.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
    if (!b) return null
    await tx.update(studioCreditBalances).set({ topupCredits: b.topupCredits + credits, updatedAt: sec(o.at) }).where(eq(studioCreditBalances.id, BALANCE_ID))
    return writeRows(tx, b.planCredits + b.topupCredits, [{ memberId: o.by, actionKey: key, credits, reason: 'topup', refId: `topup:${randomUUID()}`, at: o.at }])
  })
  if (bal == null) return 0
  await issueInvoice({ subscriptionId: null, forWhat: `${fmtCredits(credits)} AI credits${o.auto ? ' · auto top-up' : ''}`, amount: topupPrice(credits), start: o.at, end: o.at, at: o.at })
  await answerPoolAsks(o.by, o.auto ? 'an auto top-up' : 'a top-up')
  await withdrawStaleOffers().catch(() => 0)   // (pending modules S41b-4) "Only n left" ends with the top-up; welcome credits give way to bought ones
  return bal
}

/**
 * (pending modules S19 — card held:ai-credits, Q-36 as recommended) The studio's auto top-up (lib/credits/auto-topup.ts): when its AI credits
 * fall under the Owner's line, one top-up of the chosen amount is bought — the checkout record a top-up leaves (kind `auto_topup`, with its
 * tax invoice and a receipt in the Owner's bell) — at most the month's ceiling, and a crossing raises one, never two: each is claimed by the
 * month and its count (`auto-<month>-<n>`, the record's own key). Nothing is charged: the prototype's checkout is the demo stand-in for
 * Dodo charging the saved card (integration B-29). Answers the AI credits it added (0 for none).
 */
export async function autoTopUp(at = Date.now()): Promise<number> {
  const [row] = await db.select().from(settings).where(eq(settings.key, AUTO_TOPUP_KEY))
  const auto = parseAutoTopUp(row?.value ?? null)
  if (!auto.on) return 0
  const sub = await currentSubscription()
  if (sub?.status === 'past_due') return 0   // the card that failed is the one it would charge
  const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
  if (!bal || !bal.enforcementEnabled) return 0
  const month = await db.select({ id: billingCheckoutSessions.id, status: billingCheckoutSessions.status, credits: billingCheckoutSessions.creditsGranted })
    .from(billingCheckoutSessions).where(and(eq(billingCheckoutSessions.kind, 'auto_topup'), gte(billingCheckoutSessions.createdAt, bal.periodStart)))
  const spent = month.filter((m) => m.status === 'completed').reduce((n, m) => n + topupPrice(m.credits ?? 0), 0)
  const due = autoDue(auto, { balance: bal.planCredits + bal.topupCredits, spentThisMonth: spent })
  if (due === 'ceiling') { await autoCeilingNotice(bal.periodStart.getTime(), bal.periodEnd.getTime(), auto.ceiling).catch(() => {}); return 0 }
  if (due !== 'due') return 0
  const id = autoSessionId(Math.floor(bal.periodStart.getTime() / 1000), month.length + 1)
  const claim = await db.insert(billingCheckoutSessions).values({ id, memberId: null, kind: 'auto_topup', planId: null, seats: 1, period: 'monthly', status: 'pending', creditsRequested: auto.credits, createdAt: sec(at) }).onConflictDoNothing()
  if (!claim.rowsAffected) return 0   // another charge claimed this one
  /* (pending modules S34) a real payment provider charges the card on file first; a refusal leaves the session failed and adds nothing (the
     next crossing tries again under its own count) — the demo charges nothing */
  if (!paymentsAreStandIn()) {
    const paid = await paymentProvider().charge({ ref: id, amountCents: topupPrice(auto.credits), forWhat: `${fmtCredits(auto.credits)} AI credits · auto top-up` }).catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }))
    if ('error' in paid) { await db.update(billingCheckoutSessions).set({ status: 'failed' }).where(eq(billingCheckoutSessions.id, id)); console.error('[credits] the auto top-up’s charge was refused:', paid.error); return 0 }
  }
  const added = await addTopUp({ by: null, at, credits: auto.credits, auto: true })
  if (!added) return 0
  await db.update(billingCheckoutSessions).set({ status: 'completed', completedAt: sec(at), creditsGranted: auto.credits }).where(eq(billingCheckoutSessions.id, id))
  const owners = await db.select({ id: members.id }).from(members).where(and(eq(members.role, 'Owner'), eq(members.isActive, true)))
  await notify('credit_receipt', owners.map((m) => m.id), { title: `Auto top-up · ${sgd2(topupPrice(auto.credits))}`, body: `${fmtCredits(auto.credits)} AI credits added — the studio fell under ${fmtCredits(auto.below)}. Top-ups never expire.`, href: '/company/plan/billing', actorId: null }).catch(() => {})
  return auto.credits
}

/** Once a month: the auto top-up has spent what it may, so the Owner hears it stops until the refresh (kept in `credit_alerts`). */
async function autoCeilingNotice(periodStart: number, periodEnd: number, ceiling: number) {
  const period = String(Math.floor(periodStart / 1000))
  const [row] = await db.select().from(settings).where(eq(settings.key, 'credit_alerts'))
  const prev = row ? (JSON.parse(row.value) as { period?: string; sent?: string[] }) : {}
  const sent = prev.period === period ? new Set(prev.sent ?? []) : new Set<string>()
  if (sent.has('auto-cap')) return
  sent.add('auto-cap')
  const value = JSON.stringify({ period, sent: [...sent] })
  await db.insert(settings).values({ key: 'credit_alerts', value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  const owners = await db.select({ id: members.id }).from(members).where(and(eq(members.role, 'Owner'), eq(members.isActive, true)))
  await notify('credits_low', owners.map((m) => m.id), { title: `Auto top-up has spent this month’s ${sgd(ceiling)}`, body: `It starts again on ${dayMonth(periodEnd)}. Buy more by hand, or let it spend more in Plan & billing.`, href: '/company/plan/billing', actorId: null })
}

/**
 * (pending modules S19 — 1.0's POST /api/billing/seats, 2026-10-01) Change Pro — Studio's seats: more seats start today, billed for what
 * is left of the period (1.0: `prorated_immediately`), a tax invoice and a receipt; fewer seats wait for the billing date (1.0:
 * `next_billing_date`, nothing billed now), kept on the plan as `scheduled_seats` and carried by the renewal (`ensurePeriod`). The month's
 * AI credits stay as they are — a month's credits are granted once, at its start (1.0 mints no second allowance mid-cycle); the next month's
 * follow the seats. The caller checks who may and how few (app/credits/actions.ts `changeSeats`).
 */
export async function setSeats(o: { sub: Subscription; seats: number; by: string; at: number; /** (pending modules S34) a real provider's charge on the card on file — its refusal's words, or null when it went */ charge?: (amountCents: number) => Promise<string | null> }): Promise<{ effective: 'now' | 'renewal' | 'none'; charged: number; on: number; refused?: string }> {
  const { sub, seats, at } = o
  const plan = planRow(sub.planId)
  const end = sub.currentPeriodEnd.getTime()
  if (seats === sub.seats) {
    if (sub.scheduledSeats != null) await db.update(subscriptions).set({ scheduledSeats: null, updatedAt: sec(at) }).where(eq(subscriptions.id, sub.id))   // a change waiting is called off
    return { effective: 'none', charged: 0, on: at }
  }
  if (seats < sub.seats) {
    await db.update(subscriptions).set({ scheduledSeats: seats, updatedAt: sec(at) }).where(eq(subscriptions.id, sub.id))
    return { effective: 'renewal', charged: 0, on: end }
  }
  const cycle = sub.billingCycle as BillingCycle
  const charged = proratedByDays(priceFor(plan, seats, cycle) - priceFor(plan, sub.seats, cycle), sub.currentPeriodStart.getTime(), end, at)
  if (charged > 0 && o.charge) { const refused = await o.charge(charged); if (refused) return { effective: 'none', charged: 0, on: at, refused } }
  await db.update(subscriptions).set({ seats, scheduledSeats: null, updatedAt: sec(at) }).where(eq(subscriptions.id, sub.id))
  const more = seats - sub.seats
  if (charged > 0) await issueInvoice({ subscriptionId: sub.id, forWhat: `${more} more ${more === 1 ? 'seat' : 'seats'} · ${plan.name} · ${seats} seats`, amount: charged, start: at, end, at })
  return { effective: 'now', charged, on: at }
}

/** (integration B-19) Everyone waiting because the studio was out hears that credits are in — they press Generate again (B-14). */
async function answerPoolAsks(by: string | null, how: string) {
  const open = await db.select().from(creditRequests).where(and(eq(creditRequests.status, 'open'), eq(creditRequests.kind, 'pool')))
  if (!open.length) return
  const at = new Date()
  await db.update(creditRequests).set({ status: 'granted', answeredBy: by, answeredAt: at }).where(inArray(creditRequests.id, open.map((r) => r.id)))
  const [who] = by ? await db.select({ name: members.name }).from(members).where(eq(members.id, by)) : []
  await notify('credit_request_answered', open.map((r) => r.memberId), { title: `${who?.name ?? 'The studio'} added AI credits`, body: `Through ${how}. Press Generate again when you’re ready.`, href: null, actorId: by })
}

export type SpendOk = { ok: true; charged: number; counting: boolean; already?: boolean }
/**
 * Take a charge for AI work, keyed by the work (`ref`). 1.0's order (A-07): the member's monthly amount, then the studio's credits; a
 * studio that isn't counting yet is metered but never refused (1.0's shadow path, A-15). Idempotent on (action, ref).
 */
export async function spendCredits(o: { memberId: string; action: ActionKey; count: number; ref: string; trusted: boolean; at?: number }): Promise<SpendOk | Refusal> {
  const at = o.at ?? Date.now()
  await ensurePeriod(at)
  const cost = costOf(o.action, o.count)
  if (cost <= 0) return { ok: true, charged: 0, counting: true }
  let out = await chargeOnce(o, cost, at)
  /* (pending modules S19) the studio's auto top-up comes first when a charge would be refused for the studio's credits — the work carries on */
  if ('error' in out && out.error === 'insufficient_credits' && (await autoTopUp(at).catch(() => 0)) > 0) out = await chargeOnce(o, cost, at)
  if ('ok' in out && out.charged > 0) {
    await autoTopUp(at).catch(() => 0)   // under the line after this charge: topped up before anyone is told they're low
    await raiseAlerts(at).catch(() => {})
  }
  return out
}

async function chargeOnce(o: { memberId: string; action: ActionKey; ref: string; trusted: boolean }, cost: number, at: number): Promise<SpendOk | Refusal> {
  return db.transaction(async (tx): Promise<SpendOk | Refusal> => {
    const [bal] = await tx.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
    if (!bal) return { ok: true, charged: 0, counting: false }
    const [dup] = await tx.select({ id: creditLedger.id }).from(creditLedger).where(and(eq(creditLedger.actionKey, o.action), eq(creditLedger.refId, o.ref), inArray(creditLedger.reason, ['spend', 'shadow_spend'])))
    if (dup) return { ok: true, charged: 0, counting: bal.enforcementEnabled, already: true }
    const total = bal.planCredits + bal.topupCredits
    if (!bal.enforcementEnabled) {
      await writeRows(tx, total, [{ memberId: o.memberId, actionKey: o.action, credits: -cost, reason: 'shadow_spend', refId: o.ref, at }])
      return { ok: true, charged: 0, counting: false }
    }
    const [cap] = await tx.select().from(studioMemberCreditCaps).where(eq(studioMemberCreditCaps.memberId, o.memberId))
    if (cap?.monthlyCap != null) {
      const [u] = await tx.select({ total: sql<number>`coalesce(sum(${creditLedger.credits}), 0)` }).from(creditLedger)
        .where(and(gte(creditLedger.createdAt, bal.periodStart), inArray(creditLedger.reason, ['spend', 'refund']), eq(creditLedger.memberId, o.memberId)))
      const used = Math.max(0, -Number(u?.total ?? 0))
      if (used + cost > cap.monthlyCap) return { error: 'member_cap_reached', needed: cost, remaining: Math.max(0, cap.monthlyCap - used), cap: cap.monthlyCap }
    }
    if (total < cost) return { error: 'insufficient_credits', needed: cost, balance: o.trusted ? total : null }
    const fromPlan = Math.min(bal.planCredits, cost)
    await tx.update(studioCreditBalances).set({ planCredits: bal.planCredits - fromPlan, topupCredits: bal.topupCredits - (cost - fromPlan), updatedAt: sec(at) }).where(eq(studioCreditBalances.id, BALANCE_ID))
    await writeRows(tx, total, [{ memberId: o.memberId, actionKey: o.action, credits: -cost, reason: 'spend', refId: o.ref, at }])
    return { ok: true, charged: cost, counting: true }
  })
}

/** Give a charge back (a render that failed, or was stopped before it was kept; a quote that couldn't be read) — into the top-up
    bucket, where it never expires (1.0's rule, A-05). Idempotent; nothing to give back is fine. */
export async function refundCredits(ref: string, at = Date.now()): Promise<number> {
  return db.transaction(async (tx) => {
    const [spend] = await tx.select().from(creditLedger).where(and(eq(creditLedger.refId, ref), eq(creditLedger.reason, 'spend')))
    if (!spend) return 0
    const [done] = await tx.select({ id: creditLedger.id }).from(creditLedger).where(and(eq(creditLedger.refId, `${ref}:refund`), eq(creditLedger.reason, 'refund')))
    if (done) return 0
    const [bal] = await tx.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
    if (!bal) return 0
    const back = -spend.credits
    await tx.update(studioCreditBalances).set({ topupCredits: bal.topupCredits + back, updatedAt: sec(at) }).where(eq(studioCreditBalances.id, BALANCE_ID))
    await writeRows(tx, bal.planCredits + bal.topupCredits, [{ memberId: spend.memberId, actionKey: spend.actionKey, credits: back, reason: 'refund', refId: `${ref}:refund`, at }])
    return back
  })
}

/**
 * (E-06, Q-35) The heads-up to the people who pay: at 75% and 90% of the month's credits used, and when the studio is out — once each
 * per month. Kept in settings `credit_alerts` { period, sent[] }.
 */
async function raiseAlerts(at: number) {
  const [bal] = await db.select().from(studioCreditBalances).where(eq(studioCreditBalances.id, BALANCE_ID))
  const sub = await currentSubscription()
  if (!bal || !sub) return
  const allowance = allowanceFor(planRow(sub.planId), sub.seats)
  /* (S42 D-10) used = the month's spends net of their refunds (the ledger's own count) — never the allowance less what is left, which read a
     demo's Almost out, a plan change mid-month or credits carried as use */
  const used = await usedSince(bal.periodStart.getTime())
  const total = bal.planCredits + bal.topupCredits
  const period = String(Math.floor(bal.periodStart.getTime() / 1000))
  const [row] = await db.select().from(settings).where(eq(settings.key, 'credit_alerts'))
  const prev = row ? (JSON.parse(row.value) as { period?: string; sent?: string[] }) : {}
  const sent = prev.period === period ? new Set(prev.sent ?? []) : new Set<string>()
  const due: { key: string; kind: 'credits_low' | 'credits_out'; title: string; body: string }[] = []
  const days = Math.max(1, (at - bal.periodStart.getTime()) / DAY), rate = Math.max(0, used) / days
  const runOut = rate > 0 && total > 0 ? new Date(at + (total / rate) * DAY) : null
  const when = runOut && runOut.getTime() < bal.periodEnd.getTime() ? ` — at this pace they run out around ${runOut.getDate()} ${runOut.toLocaleString('en-SG', { month: 'short' })}` : ''
  if (total <= 0 && !sent.has('out')) due.push({ key: 'out', kind: 'credits_out', title: 'The studio is out of AI credits', body: 'AI tools are paused; nothing else is. Top up or change the plan.' })
  else if (allowance > 0 && used >= allowance * 0.9 && !sent.has('90')) due.push({ key: '90', kind: 'credits_low', title: `90% of this month’s AI credits are used`, body: `${fmtCredits(total)} left${when}.` })
  else if (allowance > 0 && used >= allowance * 0.75 && !sent.has('75')) due.push({ key: '75', kind: 'credits_low', title: `75% of this month’s AI credits are used`, body: `${fmtCredits(total)} left${when}.` })
  if (!due.length) return
  for (const d of due) sent.add(d.key)
  if (d75(due)) sent.add('75')
  const value = JSON.stringify({ period, sent: [...sent] })
  await db.insert(settings).values({ key: 'credit_alerts', value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  const runners = await db.select({ id: members.id }).from(members).where(and(inArray(members.role, ['Owner', 'Admin']), eq(members.isActive, true)))
  for (const d of due) await notify(d.kind, runners.map((r) => r.id), { title: d.title, body: d.body, href: '/company/plan', actorId: null })
}
const d75 = (due: { key: string }[]) => due.some((d) => d.key === '90' || d.key === 'out')
