/**
 * (pending modules S19 — card held:ai-credits "Auto top-up with a monthly ceiling … held by the build although his mark said build (Q-36)";
 * built as the audit recommended, enhancement E-12) The studio's auto top-up, pure and client-safe — the rule the server runs after every
 * charge (lib/credits/ledger.ts `autoTopUp`) and the words Plan & billing says it in.
 *
 *  · off until the Owner turns it on — never on by default (OpenAI's and v0's unexpected recharges, E-12);
 *  · when the studio's AI credits fall under `below`, one top-up of `credits` is bought — through the same checkout record a top-up the Owner
 *    buys by hand leaves (its tax invoice, a receipt in the bell); the prototype's checkout is the demo stand-in, so no card is charged;
 *  · at most `ceiling` (S$, in cents) in one credit month — by default the price of one top-up, so it runs once a month at most;
 *  · one crossing raises one top-up, never two (the server claims it by the month and its count, lib/credits/ledger.ts);
 *  · a studio whose last payment failed is not charged again (the card that failed is the card it would use).
 * 1.0 has no auto top-up (integration B-29: a saved card, off-session charging and a threshold job are the developers' to build on Dodo).
 */
import { fmtCredits } from './model'
import { isTopupAmount, sgd, TOPUP_CREDITS, topupPrice } from './plans'

export type AutoTopUp = {
  on: boolean
  /** Top up when the studio's AI credits fall under this. */
  below: number
  /** How many AI credits each top-up buys (the top-up's own grid, 100–5,000 in fifties). */
  credits: number
  /** The most it may spend in one credit month, in cents. */
  ceiling: number
}

export const AUTO_TOPUP_KEY = 'auto_topup'
/** When to top up — the picks Plan & billing offers. */
export const AUTO_BELOW = [100, 300, 500, 1000] as const
/** How many a month at most — the ceiling as a count of top-ups (the price follows the amount). */
export const AUTO_TIMES = [1, 2, 5] as const
export const AUTO_DEFAULT: AutoTopUp = { on: false, below: 500, credits: TOPUP_CREDITS, ceiling: topupPrice(TOPUP_CREDITS) }

/** Read the setting (settings `auto_topup`, JSON) — anything it can't use falls back to the default, off. */
export function parseAutoTopUp(raw: unknown): AutoTopUp {
  let v: unknown = raw
  if (typeof raw === 'string') { try { v = JSON.parse(raw) } catch { return { ...AUTO_DEFAULT } } }
  if (!v || typeof v !== 'object') return { ...AUTO_DEFAULT }
  const o = v as Record<string, unknown>
  const credits = isTopupAmount(o.credits) ? o.credits : AUTO_DEFAULT.credits
  const below = typeof o.below === 'number' && Number.isInteger(o.below) && o.below > 0 && o.below <= 100_000 ? o.below : AUTO_DEFAULT.below
  const ceiling = typeof o.ceiling === 'number' && Number.isInteger(o.ceiling) && o.ceiling >= topupPrice(credits) && o.ceiling <= 10 * topupPrice(5000) ? o.ceiling : topupPrice(credits)
  return { on: o.on === true, below, credits, ceiling }
}

/** A setting the Owner sends — the same checks, refusing instead of falling back. */
export function autoTopUpError(a: AutoTopUp): string | null {
  if (!isTopupAmount(a.credits)) return 'Pick how many AI credits each top-up adds — 100 to 5,000, in fifties.'
  if (!(AUTO_BELOW as readonly number[]).includes(a.below)) return 'Pick when to top up.'
  const times = a.ceiling / topupPrice(a.credits)
  if (!(AUTO_TIMES as readonly number[]).includes(times)) return 'Pick how many top-ups a month at most.'
  return null
}

/** How many top-ups the ceiling allows in a month. */
export const autoTimes = (a: AutoTopUp): number => Math.max(1, Math.floor(a.ceiling / Math.max(1, topupPrice(a.credits))))

/** "When AI credits fall under 500, add 1,000 (S$20) · at most once a month" — Plan & billing's line. */
export function autoLine(a: AutoTopUp): string {
  const times = autoTimes(a)
  const most = times === 1 ? 'at most once a month' : `at most ${times} times a month · ${sgd(a.ceiling)}`
  return `When AI credits fall under ${fmtCredits(a.below)}, add ${fmtCredits(a.credits)} (${sgd(topupPrice(a.credits))}) · ${most}`
}

/** Whether a top-up is due now: on, under the line, and room left under this month's ceiling. */
export function autoDue(a: AutoTopUp, o: { balance: number; spentThisMonth: number }): 'due' | 'not-needed' | 'ceiling' | 'off' {
  if (!a.on) return 'off'
  if (o.balance >= a.below) return 'not-needed'
  if (o.spentThisMonth + topupPrice(a.credits) > a.ceiling) return 'ceiling'
  return 'due'
}

/** The checkout record's id for a month's n-th auto top-up — a second claim of the same one fails on the key (never twice). */
export const autoSessionId = (periodStartSec: number, n: number): string => `auto-${periodStartSec}-${n}`
