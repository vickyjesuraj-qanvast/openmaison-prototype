/**
 * (pending modules S03 — 1.0's quote_signature_requests: a token, `expires_at` seven days on, resend and cancel; contracts parity Q-28
 * revisited, "every newer client link has a token") The signing link's life, as the screens and the server read it. Pure, client-safe.
 *
 * - **The address** is `/sign/<token>`. A new contract gets a random token; one made before this step keeps its id as its token, so the
 *   links already in clients' chats keep opening; a port puts 1.0's request token there (1.0's `/sign/<token>` lands on its page).
 * - **The window**: each send, reminder or Renew opens the link for the studio's Signing links rule (Settings › Quotes & pricing ›
 *   Contracts, 7 days by default — 1.0's). Past it the client meets "This link has expired"; a signed link never expires (1.0's defect,
 *   contracts audit CP-16, is not ported).
 * - **Stop** (1.0's cancel) takes the contract back to Draft and gives it a new token — the old address stays dead; Undo puts the same
 *   link back. The Visualizer's share link speaks the same words (Open until · Expired · Renew · Stop sharing).
 */
import { displayDate } from '@/lib/format'

export const DAY_MS = 86_400_000
/** 1.0's fixed seven days — the studio's default. */
export const LINK_DAYS_DEFAULT = 7
/** What Settings offers. */
export const LINK_DAY_CHOICES = [7, 14, 30] as const

/** Settings › Quotes & pricing › Contracts (settings key `contract_rules`). */
export type ContractRules = { linkDays: number }
export const CONTRACT_RULES_KEY = 'contract_rules'
export const DEFAULT_CONTRACT_RULES: ContractRules = { linkDays: LINK_DAYS_DEFAULT }
export function parseContractRules(v: unknown): ContractRules {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  const days = Number(o.linkDays)
  return { linkDays: (LINK_DAY_CHOICES as readonly number[]).includes(days) ? days : LINK_DAYS_DEFAULT }
}

/** A token as an address may carry it — 2.0's own (22 characters), a contract id kept as one (36), or 1.0's (a UUID); nothing else is looked up. */
export const isSignToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(t)

/** When a link sent at `from` stops opening. */
export const linkEndsAt = (from: Date | number, days: number) => new Date((typeof from === 'number' ? from : from.getTime()) + days * DAY_MS)

/** Out for signature and past its window. */
export const linkExpired = (c: { status: string; signExpiresAt: Date | null }, now: number) => c.status === 'Sent to Client' && !!c.signExpiresAt && c.signExpiresAt.getTime() <= now

const shortDate = (d: Date) => displayDate(d)   // (the calm UI build 2026-10-27, 4-43) the house months — "Sep", never the locale's "Sept"
/** "closes in 5 h" — a link about to close says when (the share dialog's words, critic 18). */
export const closesIn = (ms: number) => { const h = Math.max(1, Math.round(ms / 3_600_000)); return h < 24 ? `closes in ${h} h` : `closes in ${Math.round(h / 24)} d` }

/**
 * Where a link out for signature stands: open until its day, closing within a day, or expired — the words the lists, the editor's banner and
 * the Send dialogs share. Null when it is not out for signature or has no window (a link sent before this step's repair gave it one).
 */
export type LinkLife = { state: 'open' | 'soon' | 'expired'; until: Date; text: string; short: string }
export function linkLife(c: { status: string; signExpiresAt: Date | null }, now: number): LinkLife | null {
  if (c.status !== 'Sent to Client' || !c.signExpiresAt) return null
  const until = c.signExpiresAt, left = until.getTime() - now
  if (left <= 0) return { state: 'expired', until, text: `The link expired on ${shortDate(until)}`, short: `Link expired ${shortDate(until)}` }
  if (left < DAY_MS) return { state: 'soon', until, text: `The link ${closesIn(left)}`, short: `Link ${closesIn(left)}` }
  return { state: 'open', until, text: `The link is open until ${shortDate(until)}`, short: `Open until ${shortDate(until)}` }
}

/** The line a send or a reminder says about the window it opens. */
export const windowLine = (days: number) => `The link opens for ${days} days from when you send it.`
