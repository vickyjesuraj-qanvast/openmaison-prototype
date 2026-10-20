import 'server-only'
import { randomBytes } from 'node:crypto'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, studioSessions } from '@/lib/db/schema'
import { SESSION_MEMBER_ID, browserSession, standingMemberId } from '@/lib/db/session'
import type { Contact } from './model'
import {
  COOKIE_SECURE,
  PATH_HEADER, REMEMBER_DAYS, RENEW_MS, SEEN_COOKIE, SEEN_DAYS, SESSION_COOKIE, SESSION_HOURS, cookieState, parseSessionCookie, sessionCookieValue,
  signInHref,
} from './paths'

/*
 * (pending modules S30 — his "build all of them" 2026-10-11; card onboarding:studio-sign-in; 1.0's src/lib/session.ts `signSession` ·
 * `verifySession`, api/auth/{verify,me,logout}) The studio's session on the server: who is signed in on this browser, starting one, ending
 * one. The record is `studio_sessions`; the cookie carries its id. (pending modules S43A) The record's member IS this browser's member — every
 * read and every write stamp follows it (lib/db/session.ts `sessionMemberId()`), and only on this browser: signing in no longer moves
 * `members.is_you`, so the Owner's open window stays the Owner's while an invitee joins on another. A browser that never signed in or out is
 * the demo's standing session — the member `members.is_you` flags (View as's pick).
 *
 * The gates: proxy.ts sends a browser whose cookies say "signed out" to sign-in before any studio route runs; the shell (`AppShell`, the
 * editors' layout) asks `requireStudioSignIn()` for what only the record knows (a session ended elsewhere, run out, a member deactivated); the
 * studio's file and picture routes answer a signed-out request with 401 (`signedOutResponse`). PRODUCTION: Next's own advice stands — every
 * studio Server Function must ask the session itself (`requireStudioMember()` is the one call); the prototype's actions ask
 * `sessionMemberId()`, which reads this browser's session first (and sends a browser whose session ended to sign-in on a studio address).
 */

export type SignedOutReason = 'out' | 'ended' | 'deactivated' | 'none'
export type StudioSession =
  | { in: true; memberId: string; role: string; name: string;
      /** the demo's own session (a browser that never signed in or out — DEMO_STANDING_SESSION) */ standing: boolean; sessionId: string | null }
  | { in: false; reason: SignedOutReason }

const HOUR = 3_600_000
const DAY = 86_400_000
const cookieBase = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: COOKIE_SECURE }   // (pending modules S34) Secure on HTTPS

/** A member's name, role and whether they are active. */
async function memberOf(id: string) {
  const [m] = await db.select({ id: members.id, name: members.name, role: members.role, isActive: members.isActive }).from(members).where(eq(members.id, id)).limit(1)
  return m ?? null
}

/** Who is signed in on this browser — read once per request (a page, an action, a route; never a build's prerender: reading the cookies is
    what makes a studio page dynamic, so their error is never caught here). */
export const readStudioSession = cache(async (): Promise<StudioSession> => {
  const jar = await cookies()
  const state = cookieState(jar.get(SESSION_COOKIE)?.value, jar.get(SEEN_COOKIE)?.value)
  if (state.kind === 'out') return { in: false, reason: state.reason }
  if (state.kind === 'none') return { in: false, reason: 'none' }
  /* the demo's own session is whoever View as made it, exactly as before sign-in existed (View as never picks a deactivated member) */
  if (state.kind === 'standing') {
    const me = await memberOf(await standingMemberId())
    return { in: true, memberId: me?.id ?? SESSION_MEMBER_ID, role: me?.role ?? 'Owner', name: me?.name ?? 'Dane', standing: true, sessionId: null }
  }
  /* (pending modules S43A) a session of this browser's own: its record names the member — never the standing session's flag */
  const own = await browserSession()
  if (own.kind !== 'live') return { in: false, reason: own.kind === 'dead' ? own.reason : 'ended' }
  const me = await memberOf(own.memberId)
  if (!me) return { in: false, reason: 'deactivated' }
  const now = Date.now()
  if (own.remember && now - own.lastSeenAt.getTime() > RENEW_MS) {
    try { await db.update(studioSessions).set({ lastSeenAt: new Date(now), expiresAt: new Date(now + REMEMBER_DAYS * DAY) }).where(eq(studioSessions.id, own.sessionId)) }
    catch { /* a renewal is a courtesy — the next page tries again */ }
  }
  return { in: true, memberId: me.id, role: me.role, name: me.name, standing: false, sessionId: own.sessionId }
})

/** The shell's gate: a signed-out visit goes to sign-in, carrying the page it asked for and why. */
export async function requireStudioSignIn(): Promise<Extract<StudioSession, { in: true }>> {
  const s = await readStudioSession()
  if (s.in) return s
  const path = (await headers()).get(PATH_HEADER)
  redirect(signInHref({ next: path, reason: s.reason === 'ended' || s.reason === 'deactivated' ? s.reason : null }))
}

/** A studio route's gate (a file, a picture, a save): null when signed in, else the 401 to answer with. */
export async function signedOutResponse(): Promise<Response | null> {
  const s = await readStudioSession()
  return s.in ? null : new Response('Sign in again to carry on', { status: 401, headers: { 'Cache-Control': 'no-store' } })
}

/** PRODUCTION's one call inside a studio Server Function: the signed-in member's id, or a refusal. */
export async function requireStudioMember(): Promise<{ memberId: string } | { error: string }> {
  const s = await readStudioSession()
  return s.in ? { memberId: s.memberId } : { error: 'Sign in again to carry on' }
}

/** The member a mobile number or an email belongs to — 1.0 looked the number up on the member's profile. */
export async function memberByContact(c: Contact) {
  const cols = { id: members.id, name: members.name, role: members.role, phone: members.phone, email: members.email, isActive: members.isActive, welcomedAt: members.welcomedAt }
  const [m] = c.kind === 'phone'
    ? await db.select(cols).from(members).where(eq(members.phone, c.value)).limit(1)
    : await db.select(cols).from(members).where(sql`lower(${members.email}) = ${c.value}`).limit(1)
  return m ?? null
}

/**
 * Signed in (a code checked — an action only, it sets the cookies): this browser's earlier session ends ('replaced'), a new record starts —
 * 24 hours, or 30 days with Keep me signed in — and THIS browser is that member. (pending modules S43A) The standing session's flag
 * (`members.is_you`) stays where it is: every other open window keeps its own member.
 */
export async function startStudioSession(memberId: string, o: { remember: boolean; via: 'code' | 'join'; channel: Contact['kind'] }): Promise<void> {
  const jar = await cookies()
  const old = parseSessionCookie(jar.get(SESSION_COOKIE)?.value)
  const now = Date.now()
  const ttl = o.remember ? REMEMBER_DAYS * DAY : SESSION_HOURS * HOUR
  const ua = (await headers()).get('user-agent')?.slice(0, 200) ?? null
  if (old) await db.update(studioSessions).set({ endedAt: new Date(now), endedReason: 'replaced' }).where(and(eq(studioSessions.id, old.id), isNull(studioSessions.endedAt)))
  const id = randomBytes(16).toString('hex')
  await db.insert(studioSessions).values({ id, memberId, remember: o.remember, via: o.via, channel: o.channel, startedAt: new Date(now), lastSeenAt: new Date(now), expiresAt: new Date(now + ttl), endedAt: null, endedReason: null, userAgent: ua })
  jar.set(SESSION_COOKIE, sessionCookieValue({ id, remember: o.remember }), { ...cookieBase, maxAge: Math.round(ttl / 1000) })
  jar.set(SEEN_COOKIE, 'in', { ...cookieBase, maxAge: SEEN_DAYS * 86_400 })
}

/** Sign out (an action only): the record ends on the server, the cookie goes, and this browser now reads as signed out — never as the
    demo's own session again (1.0 cleared the cookie; the record's end is 1.0's `auth_sessions.ended_at`). (S43A) Only this browser: every
    other one — the standing session's windows, another member's browser — stays signed in as it was. */
export async function endStudioSession(): Promise<void> {
  const jar = await cookies()
  const s = parseSessionCookie(jar.get(SESSION_COOKIE)?.value)
  if (s) await db.update(studioSessions).set({ endedAt: new Date(), endedReason: 'signed-out' }).where(and(eq(studioSessions.id, s.id), isNull(studioSessions.endedAt)))
  jar.delete({ name: SESSION_COOKIE, path: '/' })
  jar.set(SEEN_COOKIE, 'out', { ...cookieBase, maxAge: SEEN_DAYS * 86_400 })
}

/** (pending modules S31) This browser leaves the studio that is open — to sign up a new one, to sign in to another of this prototype's
    studios, or to switch from the studio menu: its session there ends ('replaced', as a new sign-in on this browser ends it); the cookies are
    the next step's (a new session, or the demo's own). Call it before the other studio opens. */
export async function leaveThisStudio(): Promise<void> {
  const jar = await cookies()
  const s = parseSessionCookie(jar.get(SESSION_COOKIE)?.value)
  if (s) await db.update(studioSessions).set({ endedAt: new Date(), endedReason: 'replaced' }).where(and(eq(studioSessions.id, s.id), isNull(studioSessions.endedAt)))
}

/** "Reset prototype to base": this browser forgets it ever signed in or out — the demo's own session again (Dane). */
export async function clearStudioCookies(): Promise<void> {
  const jar = await cookies()
  jar.delete({ name: SESSION_COOKIE, path: '/' })
  jar.delete({ name: SEEN_COOKIE, path: '/' })
}

/** A member deactivated (Company › Members): signed out on every browser — 1.0's sign-in found no active membership for them. Their Undo
    brings the member back, not the sessions: they sign in again. */
export async function endSessionsOf(memberId: string): Promise<void> {
  await db.update(studioSessions).set({ endedAt: new Date(), endedReason: 'deactivated' }).where(and(eq(studioSessions.memberId, memberId), isNull(studioSessions.endedAt)))
}

/** View as on a browser with a session of its own: the record follows the member now being used, so it never names someone else.
    (S43A) This record IS that browser's member — View as moves it as it moves the standing session's flag (REG-667: the whole prototype, and
    the browser that pressed it). */
export async function followViewAs(memberId: string): Promise<void> {
  const jar = await cookies()
  const s = parseSessionCookie(jar.get(SESSION_COOKIE)?.value)
  if (s) await db.update(studioSessions).set({ memberId }).where(and(eq(studioSessions.id, s.id), isNull(studioSessions.endedAt)))
}
