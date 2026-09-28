/**
 * (REG-699…) AI credits — the rules a screen needs, pure and client-safe (the audit's §5, the integration review's stance: 1.0's
 * definitions unless 1.0 breaks its own promise). The server builds one `CreditSummary` per viewer (lib/credits/queries.ts); the rail,
 * the credits card, Plans, the moments and the Company page all read it, so they never disagree.
 *
 * What a viewer may see follows 1.0 (integration A-18, B-03): the studio's balance, its split, the plan's money and the forecast are
 * the Owner's and Admins' (1.0's "trusted" viewers) — everyone else gets their own figures and a coarse state of the studio (ok · low ·
 * out, never a number). Only the Owner buys, sets monthly amounts and changes the plan (1.0: `settings.editStudio`).
 */
import { displayDayShortMonth } from '@/lib/format'
import { actionLabel, aboutRenders, CREDIT_SCHEDULE, isActionKey } from './schedule'
import type { BillingCycle, PlanId } from './plans'

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled'
export type PoolState = 'ok' | 'low' | 'out'
export type Tone = 'healthy' | 'low' | 'empty' | 'capped'

export type CreditViewer = { id: string; name: string; role: string; trusted: boolean; canBuy: boolean; canSetAmounts: boolean; canChangePlan: boolean }

export type CreditSummary = {
  /** The server's clock (ms) — screens never read the clock while rendering. */
  now: number
  /** A balance row exists. None = a studio 1.0 never provisioned: not counting (1.0's shadow path). */
  provisioned: boolean
  /** 1.0's `enforcement_enabled`: false = metered, never refused (the notice before counting, Q-46). */
  counting: boolean
  countingFrom: number | null
  planId: PlanId
  planName: string
  status: SubscriptionStatus
  billingCycle: BillingCycle
  seats: number
  periodStart: number
  periodEnd: number
  trialEndsAt: number | null
  cancelAtPeriodEnd: boolean
  viewer: CreditViewer
  /** Who a member asks (the studio's Owner). */
  owner: { id: string; name: string }
  activeMembers: number
  /* ── the Owner's and Admins' only (null for everyone else — 1.0's redaction) ── */
  balance: number | null
  planCredits: number | null
  topupCredits: number | null
  allowance: number | null
  usedThisPeriod: number | null
  graceUntil: number | null
  /** Asks waiting for the Owner. */
  asks: number
  /* ── everyone ── */
  poolState: PoolState
  memberUsed: number
  memberCap: number | null
  memberCapRemaining: number | null
  /** The viewer's own open ask, if any. */
  openAsk: { id: string; kind: 'pool' | 'monthly'; at: number } | null
}

const DAY = 86_400_000

/** When the studio runs out at this period's pace, or null when it lasts past the refresh (Cursor's and Notion's forecast, E-06). */
export function runOutAt(o: { used: number; balance: number; periodStart: number; periodEnd: number; now: number }): number | null {
  if (o.balance <= 0) return o.now
  const elapsed = Math.max(DAY, o.now - o.periodStart)
  const rate = o.used / elapsed
  if (rate <= 0) return null
  const at = o.now + o.balance / rate
  return at < o.periodEnd ? at : null
}

/** The studio's coarse state — what everyone may know (integration B-03's `poolState`, no numbers). */
export function poolStateOf(o: { balance: number; allowance: number; used: number; periodStart: number; periodEnd: number; now: number }): PoolState {
  if (o.balance <= 0) return 'out'
  if (o.allowance > 0 && o.balance < o.allowance * 0.1) return 'low'
  const at = runOutAt(o)
  if (at != null && o.used >= o.allowance * 0.25) return 'low'
  return 'ok'
}

/** The viewer's tone: the ring's colour and the number's (the row itself stays calm, §5.1). */
export function toneOf(s: CreditSummary): Tone {
  if (!s.provisioned || !s.counting) return 'healthy'
  if (!s.viewer.trusted && s.memberCap != null) {
    if ((s.memberCapRemaining ?? 0) <= 0) return 'capped'
    if (s.poolState === 'out') return 'empty'
    if ((s.memberCapRemaining ?? 0) < s.memberCap * 0.1 || s.poolState === 'low') return 'low'
    return 'healthy'
  }
  if (s.poolState === 'out') return 'empty'
  if (s.poolState === 'low') return 'low'
  return 'healthy'
}

/** How full the ring is, 0…1: the studio's month (top-ups fill it past full), a member's monthly amount, or the coarse state. */
export function levelOf(s: CreditSummary): number {
  if (s.viewer.trusted && s.balance != null) return s.allowance ? Math.max(0, Math.min(1, s.balance / s.allowance)) : s.balance > 0 ? 1 : 0
  if (s.memberCap != null && s.memberCap > 0) return Math.max(0, Math.min(1, (s.memberCapRemaining ?? 0) / s.memberCap))
  return s.poolState === 'out' ? 0 : 1
}

/** The rail's number and its words (§5.1): the studio's balance · "115 of your 600" · "420 used this month". */
export function railFigure(s: CreditSummary): { value: number; unit: string; tip: string } {
  if (s.viewer.trusted && s.balance != null) return { value: s.balance, unit: 'AI credits', tip: `${s.balance.toLocaleString('en-SG')} AI credits` }
  if (s.memberCap != null) {
    const left = Math.max(0, s.memberCapRemaining ?? 0)
    return { value: left, unit: `of your ${s.memberCap.toLocaleString('en-SG')}`, tip: left > 0 ? `${left.toLocaleString('en-SG')} of your ${s.memberCap.toLocaleString('en-SG')} AI credits left this month` : `You have used your ${s.memberCap.toLocaleString('en-SG')} AI credits for this month` }
  }
  return { value: s.memberUsed, unit: 'used this month', tip: `${s.memberUsed.toLocaleString('en-SG')} AI credits used this month` }
}

/** What the viewer can spend right now, when it can be known — the Owner / Admin's balance, or a capped member's amount left
    (a smaller one of the two when both hold). null for an uncapped member (the pool is not theirs to see). */
export function spendable(s: CreditSummary): number | null {
  if (!s.counting || !s.provisioned) return null
  const pool = s.viewer.trusted ? s.balance : null
  const mine = s.memberCap != null ? Math.max(0, s.memberCapRemaining ?? 0) : null
  if (pool != null && mine != null) return Math.min(pool, mine)
  return pool ?? mine
}

/** "28 Oct · in 30 days" (principle 4: a date next to "in N days"). */
export function refreshLine(periodEnd: number, now: number): string {
  const days = Math.max(0, Math.ceil((periodEnd - now) / DAY))
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
  return `${displayDayShortMonth(new Date(periodEnd))} · ${when}`
}
export const dayMonth = (ms: number) => displayDayShortMonth(new Date(ms))
export const fmtCredits = (n: number) => n.toLocaleString('en-SG')
export { aboutRenders }

/* ── refusals (1.0's 402 / 403 family, integration A-06) ── */
export type Refusal =
  | { error: 'insufficient_credits'; needed: number; balance: number | null }
  | { error: 'member_cap_reached'; needed: number; remaining: number; cap: number }
  | { error: 'forbidden'; rule: string }
export const isRefusal = (r: unknown): r is Refusal => !!r && typeof r === 'object' && 'error' in r && ['insufficient_credits', 'member_cap_reached', 'forbidden'].includes(String((r as { error: unknown }).error))

/* ── the history's words (the Company page's Activity) ── */
export type LedgerReason = 'spend' | 'refund' | 'topup' | 'refresh' | 'grant' | 'adjust' | 'shadow_spend'
/** One row's words: "Pro render · High · 2 versions", "Render didn’t finish — credits back", "October’s AI credits are in". */
export function ledgerWords(row: { reason: string; actionKey: string; credits: number; createdAt: number }): string {
  const month = new Date(row.createdAt).toLocaleString('en-SG', { month: 'long' })
  switch (row.reason) {
    case 'spend': case 'shadow_spend': {
      const unit = isActionKey(row.actionKey) ? CREDIT_SCHEDULE[row.actionKey].credits : 0
      const n = unit > 0 ? Math.round(Math.abs(row.credits) / unit) : 1
      const versions = row.actionKey.startsWith('render_') && row.actionKey !== 'render_defurnish' ? ` · ${n} ${n === 1 ? 'version' : 'versions'}` : ''
      return `${actionLabel(row.actionKey)}${versions}`
    }
    case 'refund': return `${actionLabel(row.actionKey)} didn’t finish — credits back`
    case 'topup': return 'Top-up bought'
    case 'refresh': return row.credits < 0 ? 'Unused monthly credits ended' : row.actionKey === 'plan_change' ? 'The new plan’s credits' : `${month}’s AI credits are in`
    case 'grant': return row.actionKey === 'welcome' ? 'Welcome AI credits' : 'AI credits added'
    case 'adjust': return 'Balance adjusted'
    default: return row.reason
  }
}
