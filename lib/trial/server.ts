import 'server-only'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { COOKIE_SECURE } from '@/lib/auth/paths'
import { visitorAddress } from '@/lib/auth/visitor'
import { botCheck, takeLimited, trialSecret } from '@/lib/visualizer/trial/server'
import { trialStore, type WorkspaceRow } from './store'
import { NO_WORK, READS_PER_MINUTE, TRIAL_WORDS, WORKSPACE_COOKIE, WORKSPACE_MS, WORKSPACES_PER_DAY, toolsTrialEnabled, workOf, type TrialPayload, type TrialWork } from './policy'

/*
 * (pending modules S41b-3 — 1.0's src/lib/anon/cookie.ts · workspace.ts · quota.ts, src/app/api/anon/session/route.ts) THE VISITOR'S
 * WORKSPACE, ON THE SERVER. The browser holds only a signed name for it: `om_anon` — 1.0's `om_anon_v1`, `base64url({ id }).hmac-hex` under
 * the app's AUTH_SECRET (S36's key; 1.0 used SESSION_SECRET), httpOnly, the whole site (sign-up and sign-in read it to claim), as long as the
 * workspace lives. It is not a session: it names a workspace and opens nothing of any studio. A cookie that doesn't check out names nothing
 * (1.0's: never a 500 on a bad cookie). Nothing is made until the visitor's first save — a page view mints no workspace (1.0's GET never did:
 * "a GET that provisioned a workspace would grant a fresh allowance to every crawler").
 *
 * Before a new workspace: the bot check (S36's seam — Cloudflare Turnstile once plugged in; 1.0 checked it "before the first spend") and 1.0's
 * ceiling of 25 new workspaces a day from one address (the S36 limit store's seam; counted only where the proxy names the address — on this
 * prototype every tester is localhost and nothing counts, as S30's sign-in limits don't). Reads (a quote read, a comparison) take 1.0's five a
 * minute from one address.
 */

export type TrialRefusal = { error: string; reason: 'off' | 'check' | 'many' | 'fast' | 'limit' | 'gone' | 'invalid' | /** a lead the kept quote or comparison is on */ 'held' }
export const isTrialRefusal = (v: unknown): v is TrialRefusal => !!v && typeof v === 'object' && typeof (v as TrialRefusal).error === 'string' && typeof (v as TrialRefusal).reason === 'string'
const refuse = (reason: TrialRefusal['reason'], error: string): TrialRefusal => ({ error, reason })

/* ── the signed name ── */
export function signWorkspaceId(id: string, key: string): string {
  const body = Buffer.from(JSON.stringify({ id })).toString('base64url')
  return `${body}.${createHmac('sha256', key).update(body).digest('hex')}`
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** The workspace a cookie names — null for anything that is not the app's own signature on a workspace id (never throws). */
export function readWorkspaceId(raw: string | null | undefined, key: string): string | null {
  if (!raw) return null
  const dot = raw.lastIndexOf('.')
  if (dot <= 0) return null
  const body = raw.slice(0, dot)
  try {
    const want = createHmac('sha256', key).update(body).digest(), got = Buffer.from(raw.slice(dot + 1), 'hex')
    if (got.length !== want.length || !timingSafeEqual(got, want)) return null
    const id = (JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { id?: unknown } | null)?.id
    return typeof id === 'string' && UUID.test(id) ? id : null
  } catch { return null }
}

/** Whether the tools can be tried on this server: switched on, a key to sign with, and a store that keeps workspaces. */
export const toolsOpen = (): boolean => toolsTrialEnabled() && !!trialSecret() && trialStore().ready()

/** This browser's workspace id, if its cookie checks out. */
export async function workspaceIdNow(): Promise<string | null> {
  const key = trialSecret()
  return key ? readWorkspaceId((await cookies()).get(WORKSPACE_COOKIE)?.value, key) : null
}
/** This browser's live workspace, or null (none yet, gone, or expired — a row is dead the moment it expires, 1.0's rule). */
export async function workspaceNow(now = Date.now()): Promise<WorkspaceRow | null> {
  if (!trialStore().ready()) return null
  const id = await workspaceIdNow()
  return id ? trialStore().get(id, now).catch(() => null) : null
}
/** What this browser has made in the trial — every page's first paint. Never refuses: no workspace is simply nothing made yet. */
export async function workNow(): Promise<TrialWork> {
  const row = await workspaceNow()
  return row ? workOf(row.payload, row.expiresAt) : NO_WORK
}

/** The address the proxy names (no fallback — the daily ceiling counts only a real one). */
const realAddress = async () => visitorAddress(await headers())

/** The workspace to write in: this browser's, or — on its first save — a new one, after the bot check and the address's daily ceiling. */
export async function workspaceForWrite(botToken: string | null, now = Date.now()): Promise<WorkspaceRow | TrialRefusal> {
  if (!toolsOpen()) return refuse('off', TRIAL_WORDS.off)
  const live = await workspaceNow(now)
  if (live) return live
  const address = await realAddress()
  if (!(await botCheck().verify(botToken, address).catch(() => false))) return refuse('check', TRIAL_WORDS.check)
  if (address && !(await takeLimited(`trial-workspace:${address}`, WORKSPACES_PER_DAY, 86_400_000).catch(() => true))) return refuse('many', TRIAL_WORDS.tooMany)
  const id = randomUUID(), expiresAt = now + WORKSPACE_MS
  /* no cookie naming a row that does not exist (1.0: "it reads as an expired workspace forever") */
  if (!(await trialStore().create(id, now, expiresAt).catch(() => false))) return refuse('gone', TRIAL_WORDS.couldnt('save it'))
  ;(await cookies()).set(WORKSPACE_COOKIE, signWorkspaceId(id, trialSecret()!), { httpOnly: true, sameSite: 'lax', path: '/', secure: COOKIE_SECURE, maxAge: Math.round(WORKSPACE_MS / 1000) })
  const row = await trialStore().get(id, now)
  return row ?? refuse('gone', TRIAL_WORDS.couldnt('save it'))
}

/**
 * One change to the workspace's payload: `change` gets what is there and answers what it becomes (or a refusal) — written as a
 * compare-and-set, so a second tab's write that landed in between is read again and the change made on top of it (once more at most).
 */
export async function changeWork<T>(row: WorkspaceRow, change: (p: TrialPayload) => { payload: TrialPayload; value: T } | TrialRefusal, now = Date.now()): Promise<T | TrialRefusal> {
  let cur: WorkspaceRow | null = row
  for (let i = 0; i < 3 && cur; i++) {
    const next = change(structuredClone(cur.payload))
    if (isTrialRefusal(next)) return next
    if (await trialStore().write(cur.id, cur.raw, next.payload, now)) return next.value
    cur = await trialStore().get(cur.id, now)
  }
  return refuse('gone', TRIAL_WORDS.couldnt('save it'))
}

/** A quote read or a comparison from this address — 1.0's five a minute (one address for every tester here, as S36's count). */
export async function readTry(): Promise<boolean> {
  const address = (await realAddress()) ?? 'local'
  return takeLimited(`trial-read:${address}`, READS_PER_MINUTE, 60_000).catch(() => true)
}

/** The cookie goes (a fully claimed workspace, or Reset prototype to base). */
export async function forgetWorkspaceCookie(): Promise<void> {
  ;(await cookies()).delete({ name: WORKSPACE_COOKIE, path: '/' })
}
