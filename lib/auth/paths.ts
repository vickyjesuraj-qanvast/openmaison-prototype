/*
 * (pending modules S30 — her "build all of them" 2026-10-11; card onboarding:studio-sign-in; 1.0's src/proxy.ts · src/lib/session.ts) Signing in
 * to the studio's app: the cookies, the addresses anyone may open without signing in, and where sign-in sends you back to. Pure and free of
 * imports — proxy.ts (which runs before every route, apart from the app's modules) and the server both read it.
 *
 * THE STAND-IN, said plainly: the prototype has no real sign-in provider. Sign-in asks for a mobile number or an email, then a 6-digit code
 * that is never sent — any six digits pass (the page says so). What it does keep is real: a session record per browser (`studio_sessions`),
 * its own httpOnly cookie, 24 hours or — "Keep me signed in" — 30 days renewed on each visit (1.0's), Sign out, and every studio address
 * sending a signed-out browser to sign-in. (pending modules S43A) A browser signed in by a code IS its session's member — every read and every
 * write stamp of that browser follows it, and no other browser moves (lib/db/session.ts). PRODUCTION: the developers swap the provider
 * (lib/auth/provider.ts `setSignInProvider`) and the session (lib/auth/session.ts, lib/db/session.ts) — nothing else reads its cookie.
 *
 * The demo keeps working as it did: a browser that has never signed in or out is the demo's own session — signed in as the member View as
 * picked (Dane in the base state) — until it signs out (`DEMO_STANDING_SESSION`). A production build sets it false: no session, no studio.
 */

/** The prototype's one allowance: a browser that never signed in or out opens as the demo's member. The developers set this false. */
export const DEMO_STANDING_SESSION = true

/** The session's cookie: `<id>.r` (Keep me signed in — 30 days, renewed on each visit) or `<id>.d` (24 hours). httpOnly, the whole site. */
export const SESSION_COOKIE = 'om_session'
/** Whether this browser has signed in (`in`) or out (`out`) before — so a session that lapsed reads as ended, never as the demo's again. */
export const SEEN_COOKIE = 'om_seen'
/** (S42 B-02) This browser has opened a studio page — proxy.ts sets it on any studio page; a client link opened here is the studio checking it,
    never the client's "Viewed" (the demo's own session can't tell the two apart otherwise). httpOnly, the whole site, a browser's longest. */
export const STUDIO_VISIT_COOKIE = 'om_studio'
/** The address a page was asked for, passed by proxy.ts to the server so the shell can send a signed-out visit back to it after sign-in. */
export const PATH_HEADER = 'x-om-path'

/** (pending modules S34 — the steps' note after S30: "Secure cookies") A session cookie travels only over HTTPS once the app's address is one
    (NEXT_PUBLIC_APP_URL = https://…, every real deployment); the prototype on http://localhost keeps working. Every sign-in cookie — the
    studio's and the client portal's — takes it. */
export const COOKIE_SECURE = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().toLowerCase().startsWith('https://')

export const SESSION_HOURS = 24
export const REMEMBER_DAYS = 30
export const SEEN_DAYS = 400   // a browser's longest cookie
/** A remembered session's record renews at most once an hour (its cookie on every page). */
export const RENEW_MS = 60 * 60_000

export const SIGN_IN_PATH = '/sign-in'
/** (pending modules S31) A new studio signs itself up here — the sign-in page's door; 1.0's `/onboarding` redirects. */
export const SIGN_UP_PATH = '/sign-up'

export type SessionCookie = { id: string; remember: boolean }
export const sessionCookieValue = (s: SessionCookie): string => `${s.id}.${s.remember ? 'r' : 'd'}`
export function parseSessionCookie(v: string | undefined | null): SessionCookie | null {
  const m = typeof v === 'string' ? /^([a-f0-9]{32})\.([rd])$/.exec(v) : null
  return m ? { id: m[1]!, remember: m[2] === 'r' } : null
}

/** What the two cookies say about this browser, before any record is read. */
export type CookieState =
  | { kind: 'session'; id: string; remember: boolean }
  | { kind: 'out'; reason: 'out' | 'ended' }
  /** never signed in or out here: the demo's own session (DEMO_STANDING_SESSION) */
  | { kind: 'standing' }
  /** never signed in, and the build has no demo session */
  | { kind: 'none' }
export function cookieState(session: string | undefined | null, seen: string | undefined | null): CookieState {
  const s = parseSessionCookie(session)
  if (s) return { kind: 'session', ...s }
  if (seen === 'in') return { kind: 'out', reason: 'ended' }   // it had a session, and its cookie has lapsed
  if (seen === 'out') return { kind: 'out', reason: 'out' }
  return DEMO_STANDING_SESSION ? { kind: 'standing' } : { kind: 'none' }
}

/**
 * The addresses anyone may open without signing in — each one checks its own permission (a token, the portal's own sign-in), as 1.0's proxy
 * listed them. Everything else is the studio's and asks for a signed-in member. A segment match: `/quote` is the client's link, `/quotes` the
 * studio's list.
 */
export const PUBLIC_PATHS: readonly string[] = [
  SIGN_IN_PATH, '/login',            // signing in (1.0's old address redirects)
  SIGN_UP_PATH, '/onboarding',       // (S31) a new studio signs up (1.0's old address redirects)
  '/join',                           // an invitation to the team — its token is the permission (S09)
  '/card',                           // the link preview cards a chat app fetches (S02)
  '/my',                             // the client portal — its own sign-in
  '/sign', '/confirm', '/quote', '/quote-preview', '/invoice', '/receipt', '/po', '/pay', '/renders', '/space', '/meeting', '/f',   // client links
  '/floor-plan', '/copilot',         // 1.0's old client links, redirected (S02 · S23)
  '/hangout', '/hangouts',           // (S27, joined at the lanes' merge) a Hangout's public booking page, the homeowner's page and its pictures; 1.0's old link
  '/files/font',                     // the studio's own fonts — every client document prints through them (S11)
  '/files/email-logo',               // (S44O — rows 314 · 337) the studio's logo as its emails draw it — a mail app fetches it signed out
  '/api/health',
  '/papers',                         // (pending modules S34) a paper page as a PDF — drawn with the visitor's own cookies, the page keeps its own permission
  '/api/cron', '/api/webhooks', '/api/services',   // (pending modules S34) the scheduler's, the providers' and the deployment's report — each checks its own secret (CRON_SECRET, WHATSAPP_WEBHOOK_SECRET, a payment provider's signature, a lead webhook's token)
  '/site',                           // (pending modules S35) OpenMaison's own website — anyone's to read; its forms check their own input
  '/try', '/try-visualizer',         // (pending modules S36) 1.0's addresses of the AI Visualizer trial (now /site/try, itself under /site) — they redirect there
]
const under = (prefix: string, path: string) => path === prefix || path.startsWith(`${prefix}/`)
/** Whether `pathname` opens without signing in. `linkToken`: the AI Visualizer's picture of a client's render link (`?t=`) is the client's. */
export function isPublicPath(pathname: string, linkToken = false): boolean {
  if (PUBLIC_PATHS.some((p) => under(p, pathname))) return true
  return linkToken && under('/visualizer/img', pathname)
}

/** Where to come back to after signing in — a path inside the app only (never another site, never sign-in itself). */
export function safeStudioNext(next: string | null | undefined): string | null {
  if (typeof next !== 'string' || !next || next.length > 400) return null
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\') || [...next].some((c) => c.charCodeAt(0) < 32)) return null
  const path = next.split(/[?#]/)[0]!
  if (under(SIGN_IN_PATH, path) || under('/login', path) || under(SIGN_UP_PATH, path) || under('/onboarding', path)) return null
  return next
}

/** Why sign-in is showing — the page's one notice. `out` = they signed out (said once, right after) · `ended` = the session ran out ·
    `deactivated` = their account was switched off · `qanvast` = the Qanvast connection timed out (1.0's Qanvast line; the developers' seam). */
export type SignInReason = 'out' | 'ended' | 'deactivated' | 'qanvast'
export const isSignInReason = (v: unknown): v is SignInReason => v === 'out' || v === 'ended' || v === 'deactivated' || v === 'qanvast'

/** The sign-in address, with the page to come back to and why. */
export function signInHref(o: { next?: string | null; reason?: SignInReason | null } = {}): string {
  const q = new URLSearchParams()
  const next = safeStudioNext(o.next)
  if (next && next !== '/') q.set('next', next)
  if (o.reason) q.set('reason', o.reason)
  const s = q.toString()
  return s ? `${SIGN_IN_PATH}?${s}` : SIGN_IN_PATH
}
