import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { takeTry } from '@/lib/auth/limit'
import { COOKIE_SECURE } from '@/lib/auth/paths'
import { visitorAddress } from '@/lib/auth/visitor'
import { serviceSlot } from '@/lib/services/slots'
import { leftOf, REFUSAL_WORDS, TRIAL_COOKIE, TRIAL_COOKIE_SECONDS, TRIAL_LIMIT, TRIAL_PATH, TRIAL_PER_MINUTE, trialEnabled, usedOf, type TrialAnswer, type TrialRefusal } from './policy'

/*
 * (pending modules S36 — 1.0's src/lib/render/trial-quota.ts · trial-gate.ts · src/lib/rate-limit.ts · src/lib/hmac-verify.ts) The trial's count,
 * kept where 1.0 kept it: in the visitor's own browser, as a cookie the server signs (HMAC-SHA256 under the app's AUTH_SECRET — 1.0 used
 * SESSION_SECRET), so it can't be raised by hand; a cookie that doesn't check out reads as none used (1.0's). Nothing else is kept: no table,
 * no picture — the photo and the renders never leave the visitor's browser (the curated engine draws them there); 1.0's server saw the photo
 * only for the length of its model call and kept nothing either.
 *
 * TWO SEAMS FOR THE DEVELOPERS (lib/services/registry.ts `trial-bot-check` · `trial-limit-store`), both 1.0's own unfinished production step
 * ("flip on once Turnstile + a durable rate-limit store exist"):
 *   · `setBotCheck({ name, siteKey, verify })` — Cloudflare Turnstile: the page mounts the widget with `siteKey` (the stand-in has none, so no
 *     widget) and sends its token with the first render's ask; `verify(token, address)` answers whether it passed.
 *   · `setLimitStore({ name, take })` — a lasting count per address (Vercel KV · Upstash); until then one server's memory counts (1.0's
 *     in-memory limiter: a restart, or a second server, starts again).
 */

/* ── the signed count ── */
/** 1.0's development fallback secret — never in production: without AUTH_SECRET a production server keeps the trial closed (fails closed). */
const DEV_SECRET = 'dev-insecure-secret'
export function trialSecret(env: Record<string, string | undefined> = process.env): string | null {
  const s = env.AUTH_SECRET?.trim()
  if (s) return s
  return env.NODE_ENV === 'production' ? null : DEV_SECRET
}
/** `base64url({ n }).hmac-hex` — 1.0's shape (`{ generations }` there). */
export function signUsed(n: number, key: string): string {
  const body = Buffer.from(JSON.stringify({ n })).toString('base64url')
  return `${body}.${createHmac('sha256', key).update(body).digest('hex')}`
}
/** The renders a cookie says were used — 0 for anything that isn't the app's own signature (1.0's hmac-verify: the hex is decoded before the
    compare, so a malformed value fails the length check and never throws). */
export function readUsed(raw: string | null | undefined, key: string): number {
  if (!raw) return 0
  const dot = raw.lastIndexOf('.')
  if (dot <= 0) return 0
  const body = raw.slice(0, dot)
  try {
    const want = createHmac('sha256', key).update(body).digest(), got = Buffer.from(raw.slice(dot + 1), 'hex')
    if (got.length !== want.length || !timingSafeEqual(got, want)) return 0
    return usedOf((JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { n?: unknown } | null)?.n)
  } catch { return 0 }
}

/* ── the two seams ── */
export type BotCheck = { name: string; /** the widget's public key — null: no widget (the stand-in) */ siteKey: string | null; verify(token: string | null, address: string | null): Promise<boolean> }
const botSlot = serviceSlot<BotCheck>('bot-check', { name: 'stand-in', siteKey: null, async verify() { return true } })
export const botCheck = (): BotCheck => botSlot.use()
/** The developers' call at start-up (lib/services/install.ts): Cloudflare Turnstile in front of the trial. */
export function setBotCheck(c: BotCheck): void { botSlot.set(c) }

export type LimitStore = { name: string; /** counts one try for `key`; false when it is one too many in the window */ take(key: string, max: number, windowMs: number): Promise<boolean> }
const limitSlot = serviceSlot<LimitStore>('limit-store', { name: 'stand-in', async take(key, max, windowMs) { return takeTry(key, Date.now(), max, windowMs) } })   // (pending modules S41b-3) the window as asked
/** The developers' call at start-up: a lasting per-address count (S30's sign-in and S35's forms count in lib/auth/limit.ts — they can move
    onto the same store). */
export function setLimitStore(s: LimitStore): void { limitSlot.set(s) }
/** (pending modules S41b-3) One try counted in the trial's lasting store (the developers' or this server's memory) — the no-account tools' own
    counts (lib/trial/server.ts) ride the same store as the Visualizer's. */
export const takeLimited = (key: string, max: number, windowMs: number): Promise<boolean> => limitSlot.use().take(key, max, windowMs)
/** One try of the trial from this address — 1.0's ten a minute. */
const takeTrialTry = (step: 'ask' | 'keep', address: string) => limitSlot.use().take(`trial:${step}:${address}`, TRIAL_PER_MINUTE, 60_000)

/* ── what the page and the actions read ── */
const refuse = (reason: TrialRefusal, left: number): TrialAnswer => ({ error: REFUSAL_WORDS[reason], reason, left })

/** The renders left in this browser, for the page's first paint. */
export async function trialLeft(): Promise<number> {
  const key = trialSecret()
  if (!key) return 0
  return leftOf(readUsed((await cookies()).get(TRIAL_COOKIE)?.value, key))
}

/** Before a render: open, a render left, the browser checked (a real bot check only), and not too fast from this address. Nothing counts yet. */
export async function askRender(botToken: string | null): Promise<TrialAnswer> {
  const key = trialSecret()
  if (!trialEnabled() || !key) return refuse('off', 0)
  const left = leftOf(readUsed((await cookies()).get(TRIAL_COOKIE)?.value, key))
  if (left <= 0) return refuse('used', 0)
  const address = visitorAddress(await headers()) ?? 'local'
  if (!(await botCheck().verify(botToken, address).catch(() => false))) return refuse('check', left)
  if (!(await takeTrialTry('ask', address).catch(() => true))) return refuse('fast', left)
  return { ok: true, left }
}

/** A render made: it counts (1.0 counted only a render that came back), re-signed with a fresh day — or it is refused, and nothing counts. */
export async function keepRender(): Promise<TrialAnswer> {
  const key = trialSecret()
  if (!trialEnabled() || !key) return refuse('off', 0)
  const jar = await cookies()
  const used = readUsed(jar.get(TRIAL_COOKIE)?.value, key)
  if (used >= TRIAL_LIMIT) return refuse('used', 0)
  const address = visitorAddress(await headers()) ?? 'local'
  if (!(await takeTrialTry('keep', address).catch(() => true))) return refuse('fast', leftOf(used))
  const next = used + 1
  /* scoped to the trial's own addresses: the studio's app never receives it */
  jar.set(TRIAL_COOKIE, signUsed(next, key), { httpOnly: true, sameSite: 'lax', maxAge: TRIAL_COOKIE_SECONDS, path: TRIAL_PATH, secure: COOKIE_SECURE })
  return { ok: true, left: leftOf(next) }
}
